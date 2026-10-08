/* Guardrail for R3's queue (src/lib/election-news.ts, scripts/election-news.ts;
   spec docs/superpowers/specs/2026-10-08-news-source-integrity-design.md §3.2.3).

   What it pins:
     1. Every malformed batch is refused whole, naming the item's index.
     2. A URL off the official list, or on an outlet, refuses the batch.
     3. A page row recorded primary_doc / N/A backs its page; one recorded as
        anything else drops the item; any other item carries official:<domain>.
     4. A URL already stored, already queued in any status, or repeated in the
        batch is skipped, under any spelling urlNorm treats as one page.
     5. Every queued row parses with ManualNewsPayloadSchema, carries a
        source_id, and is a pending manual_news item from agent:R3.
     6. --dry-run inserts nothing; the reads are filtered by the batch's URLs,
        in chunks; a read or insert error writes nothing and exits 1.
     7. The CLI writes nothing but review_item rows.
     8. Every row the queue plans passes the approve path's source checks
        against the same source rows, so R3 never queues an item an operator
        cannot approve. A page row's id backs only its exact url_norm; a row
        under the other `www.` spelling drops an advocacy page but never lends
        its id.
     9. The ballot roster (loadBallotRoster) is the ballot-tier candidates of
        the general election's published and listed races, with their county,
        and its reads only read.

   Pure and offline: an in-memory stand-in for the Supabase client, no
   network. Run: node scripts/verify-election-news.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_ELECTION_BATCH,
  batchProblem,
  planElectionQueue,
  QUEUE_READ_CHUNK,
  readQueueContext,
  runElectionQueue,
  type ElectionNewsItem,
  type PageRow,
  type QueueContext,
} from "../src/lib/election-news.ts";
import { ManualNewsPayloadSchema, ReviewItemContentSchema } from "../src/types/admin.ts";
import { urlNorm } from "../src/lib/brief-rows.ts";
import { planEffect } from "../src/lib/admin/effects.ts";
import {
  givenPageRowProblem,
  listedRowProblem,
  planSourceAttribution,
  storyPageProblem,
  type AttributionDeps,
} from "../src/lib/news-enqueue.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
import { officialForUrl } from "../src/lib/official-sources.ts";
import { loadBallotRoster, type BallotRosterCandidate } from "../src/lib/news-intake.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- 8. the approve path, as the route runs it --------------------------- */
/* resolveSource in src/app/api/admin/review/[id]/decision/route.ts, with its
   `source` reads served from `sources` instead of the database. The checks are
   the route's own pure functions, with the route's deps;
   scripts/verify-news-enqueue.ts pins that the route calls them in this order.
   The reason the approve path would refuse the payload, or null. */
const APPROVE_DEPS: AttributionDeps = {
  outletFor: (u) => outletForUrl(u, OUTLETS),
  officialFor: (u) => officialForUrl(u),
  norm: urlNorm,
};
function approveProblem(payload: unknown, sources: readonly PageRow[]): string | null {
  const content = ReviewItemContentSchema.safeParse({ kind: "manual_news", payload });
  if (!content.success) return "the stored payload no longer matches its schema";
  const effect = planEffect(content.data);
  if (effect.type !== "insert_news") return `planEffect gave ${effect.type}, not insert_news`;
  const where = (column: "source_id" | "url_norm", value: string) =>
    sources.find((s) => s[column] === value) ?? null;
  const plan = planSourceAttribution(effect.row, APPROVE_DEPS);
  if (plan.kind === "refused") return plan.reason;
  if (plan.kind !== "given") return `a queued item resolves as ${plan.kind}, not by the source it carries`;
  if (plan.listedRow) {
    if (plan.storyPageNorm) {
      const problem = storyPageProblem(where("url_norm", plan.storyPageNorm), plan.storyPageNorm);
      if (problem) return problem;
    }
    /* Insert-if-absent, then read back by url_norm: with no row there, the
       listed row itself is what the route reads back. */
    const readBack = where("url_norm", plan.listedRow.url_norm);
    return readBack ? listedRowProblem(plan.listedRow, readBack) : null;
  }
  const found = where("source_id", plan.sourceId);
  if (!found) return `no source row has id ${plan.sourceId}`;
  return givenPageRowProblem(plan, found.url_norm);
}

/* Every row the queue plans goes through the approve path with the source
   rows the queue saw. */
let approvedRows = 0;
function approvable(rows: readonly { payload: { url: string; source_id?: string | null } }[], sources: readonly PageRow[]) {
  for (const r of rows) {
    const problem = approveProblem(r.payload, sources);
    check(`queued ${r.payload.url} (${r.payload.source_id}) passes the approve path's source checks`, problem === null,
      String(problem));
    approvedRows++;
  }
}

const item = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  title: "Early voting sites and hours for the general election",
  summary: "The Supervisor of Elections lists 33 early voting sites, open Oct. 19 to Nov. 1.",
  url: "https://www.browardvotes.gov/voting-methods/early-voting",
  published_at: "2026-10-05",
  scope: { county_fips: "12011" },
  ...over,
});

/* The ballot roster as the database holds it, and as loadBallotRoster must
   return it: one candidate in a published statewide race, one in a listed
   county race. A write-in, a draft race and a primary race are left out.
   Synthetic names, so no real candidate is named in a test. */
const ROSTER_TABLES: Record<string, Record<string, unknown>[]> = {
  race: [
    { race_id: "FL-GOV-general", election: "general", district: null, candidate_ids: ["FL-DOE-T1", "FL-DOE-T9"] },
    { race_id: "FL-DAD-CC2-general", election: "general", district: "DAD-CC-2", candidate_ids: ["FL-VF-T2"] },
    { race_id: "FL-HIL-SB1-general", election: "general", district: "HIL-SB-1", candidate_ids: ["FL-VF-T3"] },
    { race_id: "FL-GOV-primary", election: "primary", district: null, candidate_ids: ["FL-DOE-T4"] },
  ],
  race_publication: [
    { race_id: "FL-GOV-general", status: "published" },
    { race_id: "FL-DAD-CC2-general", status: "listed" },
    { race_id: "FL-HIL-SB1-general", status: "draft" },
    { race_id: "FL-GOV-primary", status: "published" },
  ],
  candidate: [
    { candidate_id: "FL-DOE-T1", legal_name: "Maria Elena Vasquez", ballot_status: "ballot" },
    { candidate_id: "FL-DOE-T9", legal_name: "Pat Writein", ballot_status: "write_in" },
    { candidate_id: "FL-VF-T2", legal_name: "John Okafor", ballot_status: "ballot" },
    { candidate_id: "FL-VF-T3", legal_name: "Dana Draftrace", ballot_status: "ballot" },
    { candidate_id: "FL-DOE-T4", legal_name: "Lee Primaryonly", ballot_status: "ballot" },
  ],
};
const ROSTER: readonly BallotRosterCandidate[] = [
  { candidateId: "FL-DOE-T1", legalName: "Maria Elena Vasquez", raceId: "FL-GOV-general", countyFips: null },
  { candidateId: "FL-VF-T2", legalName: "John Okafor", raceId: "FL-DAD-CC2-general", countyFips: "12086" },
];

/* ---- 1 and 2. refused batches ------------------------------------------- */
const withoutSummary = item();
delete withoutSummary.summary;
for (const [label, raw, want] of [
  ["not an array", { items: [] }, "the batch is not an array of items"],
  [`${MAX_ELECTION_BATCH + 1} items`, Array.from({ length: MAX_ELECTION_BATCH + 1 }, () => item()), "over the 25-item cap"],
  ["an item that is not an object", [item(), "x"], "item 1 is not an object"],
  ["an unknown field", [item({ metro: "miami" })], "item 0: unknown field metro"],
  ["a missing field", [withoutSummary], "item 0: missing field summary"],
  ["a non-string", [item({ title: 7 })], "item 0: title must be a string"],
  ["a null summary", [item({ summary: null })], "item 0: summary must be a string"],
  ["an unparseable date", [item({ published_at: "next Tuesday" })], "item 0: published_at"],
  /* Date.parse reads "1" as 2001; a date must be written YYYY-MM-DD. */
  ["a bare number for a date", [item({ published_at: "1" })], "item 0: published_at"],
  ["a date not written YYYY-MM-DD", [item({ published_at: "October 5, 2026" })], "item 0: published_at"],
  ["an impossible ISO date", [item({ published_at: "2026-13-45" })], "item 0: published_at"],
  /* Date.parse rolls an impossible day over ("2026-02-30" is 2 March), so the
     day is checked against the calendar. */
  ["February 30", [item({ published_at: "2026-02-30" })], "item 0: published_at"],
  ["February 31", [item({ published_at: "2026-02-31T09:30:00Z" })], "item 0: published_at"],
  ["29 February in a common year", [item({ published_at: "2026-02-29" })], "item 0: published_at"],
  ["31 September", [item({ published_at: "2026-09-31" })], "item 0: published_at"],
  /* A date-time with no Z or offset is read in the machine's own zone. */
  ["a date-time with no offset", [item({ published_at: "2026-10-05T09:30" })], "item 0: published_at"],
  ["a date-time with seconds and no offset", [item({ published_at: "2026-10-05T09:30:00" })], "item 0: published_at"],
  ["a date-time with an hour of 25", [item({ published_at: "2026-10-05T25:00:00Z" })], "item 0: published_at"],
  ["a URL that is not http(s)", [item({ url: "ftp://www.browardvotes.gov/x" })], "item 0: url must be an http(s) URL"],
  ["a URL on an outlet", [item({ url: "https://www.wlrn.org/2026/10/05/early-voting" })], "item 0: https://www.wlrn.org/2026/10/05/early-voting is on the outlet list"],
  ["a URL off the official list", [item({ url: "https://www.courtlistener.com/opinion/1/x/" })], "is not on the official-source list"],
  ["a metro scope", [item({ scope: { metro: "fort_lauderdale" } })], "there is no metro scope"],
  ["a scope with two forms", [item({ scope: { county_fips: "12011", statewide: true } })], "scope must be"],
  ["statewide: false", [item({ scope: { statewide: false } })], "scope.statewide must be true"],
  ["a county outside the four", [item({ scope: { county_fips: "12099" } })], "12099 is not a covered county"],
  ["a county scope on another county's entry", [item({ scope: { county_fips: "12057" } })], "differs from the publisher's county 12011"],
  /* A county Supervisor's notice is about that county; it never reaches the
     statewide feed. */
  ["a statewide scope on a county body's page", [item({ scope: { statewide: true } })], "item 0: a county body's page is scoped to its county 12011, not statewide"],
  ["a bad item after a good one", [item(), item({ url: "https://www.wlrn.org/x" })], "item 1:"],
] as const) {
  const got = batchProblem(raw);
  check(`${label} refuses the batch, naming the problem`, got !== null && got.includes(want), String(got));
}
check("a well-formed batch has no problem", batchProblem([item(), item({ url: "https://dos.fl.gov/elections/x", scope: { statewide: true } })]) === null,
  String(batchProblem([item()])));
check("a county scope on a statewide body is accepted (PR B tightens it)",
  batchProblem([item({ url: "https://dos.fl.gov/elections/x", scope: { county_fips: "12086" } })]) === null);
check("an empty batch has no problem", batchProblem([]) === null);
check("a full ISO timestamp is a date",
  batchProblem([item({ published_at: "2026-10-05T09:30:00-04:00" })]) === null, String(batchProblem([item({ published_at: "2026-10-05T09:30:00-04:00" })])));
for (const date of ["2028-02-29", "2026-12-31", "2026-10-05T09:30:00Z", "2026-10-05T13:30:00.000Z", "2026-10-05T09:30+05:30"]) {
  check(`${date} is a date`, batchProblem([item({ published_at: date })]) === null, String(batchProblem([item({ published_at: date })])));
}

/* ---- 3, 4 and 5. the plan ----------------------------------------------- */
const EMPTY: QueueContext = { pageRows: new Map(), storedUrls: new Set(), queuedUrls: new Set() };
const ctx = (over: Partial<QueueContext> = {}): QueueContext => ({ ...EMPTY, ...over });
const pageRow = (url_norm: string, type: string, lean_tag: string, source_id = `src_${type}`): PageRow =>
  ({ source_id, url_norm, type, lean_tag });
const plan = (items: Record<string, unknown>[], c: QueueContext = EMPTY) => {
  const p = planElectionQueue(items as unknown as ElectionNewsItem[], c);
  if (p.ok) approvable(p.rows, [...c.pageRows.values()]);
  return p;
};

{
  const p = plan([item()]);
  check("an item with no page row carries official:<domain>",
    p.ok && p.rows.length === 1 && p.rows[0].payload.source_id === "official:browardvotes.gov", JSON.stringify(p));
  const doc = plan([item()], ctx({
    pageRows: new Map([["www.browardvotes.gov/voting-methods/early-voting",
      pageRow("www.browardvotes.gov/voting-methods/early-voting", "primary_doc", "N/A", "src_gov_broward_ev")]]),
  }));
  check("a primary_doc / N/A page row backs its own page",
    doc.ok && doc.rows[0]?.payload.source_id === "src_gov_broward_ev", JSON.stringify(doc));
  const advocacy = plan([item()], ctx({
    pageRows: new Map([["www.browardvotes.gov/voting-methods/early-voting",
      pageRow("www.browardvotes.gov/voting-methods/early-voting", "opinion", "N/A")]]),
  }));
  check("a page row recorded as opinion drops the item, with the reason",
    advocacy.ok && advocacy.rows.length === 0 && advocacy.dropped.length === 1 &&
      advocacy.dropped[0].index === 0 && advocacy.dropped[0].reason.includes("opinion / N/A"), JSON.stringify(advocacy));
  /* The lean is checked too: a primary_doc row with any lean but N/A is not
     an official notice either. */
  const leaned = plan([item()], ctx({
    pageRows: new Map([["www.browardvotes.gov/voting-methods/early-voting",
      pageRow("www.browardvotes.gov/voting-methods/early-voting", "primary_doc", "unrated")]]),
  }));
  check("a page row recorded as primary_doc with a lean other than N/A drops the item",
    leaned.ok && leaned.rows.length === 0 && leaned.dropped.length === 1 &&
      leaned.dropped[0].reason.includes("primary_doc / unrated"), JSON.stringify(leaned));
}

{
  const url = (item().url as string);
  for (const [label, c] of [
    ["already in news_item", ctx({ storedUrls: new Set([url]) })],
    ["already in a manual_news review item", ctx({ queuedUrls: new Set([url]) })],
  ] as const) {
    const p = plan([item()], c);
    check(`a URL ${label} is skipped, not refused`,
      p.ok && p.rows.length === 0 && p.skipped.length === 1 && p.skipped[0].reason === label, JSON.stringify(p));
  }
  const twice = plan([item(), item({ title: "Same page, second time" })]);
  check("a URL earlier in the batch is skipped",
    twice.ok && twice.rows.length === 1 && twice.skipped.length === 1 && twice.skipped[0].index === 1, JSON.stringify(twice));
  /* Two spellings of one page (scheme, trailing slash) are one page: the
     dedupe compares urlNorm, the key source.url_norm uses. */
  const spelled = `http://www.browardvotes.gov/voting-methods/early-voting/`;
  const respelled = plan([item(), item({ url: spelled })]);
  check("another spelling of a URL earlier in the batch is skipped",
    respelled.ok && respelled.rows.length === 1 && respelled.skipped[0]?.index === 1, JSON.stringify(respelled));
  for (const [label, c] of [
    ["already in news_item", ctx({ storedUrls: new Set([spelled]) })],
    ["already in a manual_news review item", ctx({ queuedUrls: new Set([spelled]) })],
  ] as const) {
    const p = plan([item()], c);
    check(`a URL ${label} under another spelling is skipped`,
      p.ok && p.rows.length === 0 && p.skipped[0]?.reason === label, JSON.stringify(p));
  }
  /* With or without www. is one page on these hosts, so it is one item. */
  const bare = "https://browardvotes.gov/voting-methods/early-voting";
  const wwwTwice = plan([item(), item({ url: bare })]);
  check("the same page without www. earlier in the batch is skipped",
    wwwTwice.ok && wwwTwice.rows.length === 1 && wwwTwice.skipped[0]?.index === 1, JSON.stringify(wwwTwice));
  for (const [label, c] of [
    ["already in news_item", ctx({ storedUrls: new Set([bare]) })],
    ["already in a manual_news review item", ctx({ queuedUrls: new Set([bare]) })],
  ] as const) {
    const p = plan([item()], c);
    check(`a URL ${label} without www. is skipped`,
      p.ok && p.rows.length === 0 && p.skipped[0]?.reason === label, JSON.stringify(p));
  }
  /* A page row recorded without www. is still this page's row: an advocacy
     page keeps its type whichever spelling R3 found. */
  const bareAdvocacy = plan([item()], ctx({
    pageRows: new Map([["browardvotes.gov/voting-methods/early-voting",
      pageRow("browardvotes.gov/voting-methods/early-voting", "opinion", "N/A")]]),
  }));
  check("a page row recorded without www. drops the www. item",
    bareAdvocacy.ok && bareAdvocacy.rows.length === 0 && bareAdvocacy.dropped.length === 1, JSON.stringify(bareAdvocacy));
}

{
  /* Queue, then approve. The approve path backs a story with a page row's id
     only when that row's url_norm is the story's exactly (givenPageRowProblem),
     so a row under the other `www.` spelling never lends the item its id: the
     item carries official:<domain>, which the approve path accepts. Live
     `source` has www. page rows on flsenate.gov and flhouse.gov. */
  const statewide = { scope: { statewide: true } };
  for (const [label, rowNorm, url] of [
    ["recorded with www., found without", "www.flhouse.gov/sections/bills/x", "https://flhouse.gov/sections/bills/x"],
    ["recorded without www., found with", "flhouse.gov/sections/bills/x", "https://www.flhouse.gov/sections/bills/x"],
  ] as const) {
    const row = pageRow(rowNorm, "primary_doc", "N/A", "src_house_x");
    const p = plan([item({ url, ...statewide })], ctx({ pageRows: new Map([[row.url_norm, row]]) }));
    check(`a primary_doc page row ${label} does not lend its id; the item carries official:flhouse.gov`,
      p.ok && p.rows.length === 1 && p.rows[0].payload.source_id === "official:flhouse.gov", JSON.stringify(p));
    /* The harness bites: the id the queue used to give is refused. */
    const misattributed = approveProblem({
      item_type: "election_news", title: "Bill x", summary: null, url,
      published_at: "2026-10-05T00:00:00.000Z", statewide: true, source_id: "src_house_x",
    }, [row]);
    check(`the approve path refuses src_house_x on the page ${label}`,
      misattributed !== null && misattributed.includes(rowNorm), String(misattributed));
  }
  /* Both spellings recorded: the exact row backs the item only when no
     spelling of the page is recorded as anything but an official notice. */
  const exact = pageRow("flhouse.gov/sections/bills/x", "primary_doc", "N/A", "src_house_x");
  const other = pageRow("www.flhouse.gov/sections/bills/x", "opinion", "N/A", "src_house_x_www");
  const both = plan([item({ url: "https://flhouse.gov/sections/bills/x", ...statewide })],
    ctx({ pageRows: new Map([[exact.url_norm, exact], [other.url_norm, other]]) }));
  check("an advocacy row under the other www. spelling drops the item even beside an exact primary_doc row",
    both.ok && both.rows.length === 0 && both.dropped.length === 1 && both.dropped[0].reason.includes("opinion / N/A"),
    JSON.stringify(both));
  const exactOnly = plan([item({ url: "https://flhouse.gov/sections/bills/x", ...statewide })],
    ctx({ pageRows: new Map([[exact.url_norm, exact], [other.url_norm, { ...other, type: "primary_doc" }]]) }));
  check("with both spellings recorded as official notices, the exact row backs the item",
    exactOnly.ok && exactOnly.rows[0]?.payload.source_id === "src_house_x", JSON.stringify(exactOnly));
}

{
  const p = plan([
    item(),
    item({ url: "https://dos.fl.gov/elections/for-voters/election-dates/", scope: { statewide: true }, summary: "  " }),
    item({ url: "https://www.votemiamidade.gov/news/ev", scope: { county_fips: "12086" } }),
  ]);
  check("three good items give three rows", p.ok && p.rows.length === 3, JSON.stringify(p));
  if (p.ok) {
    for (const [n, r] of p.rows.entries()) {
      check(`row ${n} parses with ManualNewsPayloadSchema`, ManualNewsPayloadSchema.safeParse(r.payload).success);
      check(`row ${n} is a pending manual_news item from agent:R3`,
        r.kind === "manual_news" && r.source === "agent:R3" && r.status === "pending");
      check(`row ${n} carries a source_id`, typeof r.payload.source_id === "string" && r.payload.source_id.length > 0);
      check(`row ${n} is election_news with no candidate, race or metro`,
        r.payload.item_type === "election_news" && !r.payload.candidate_id && !r.payload.race_id && !r.payload.metro,
        JSON.stringify(r.payload));
    }
    check("a county item carries county_fips, not statewide",
      p.rows[0].payload.county_fips === "12011" && !p.rows[0].payload.statewide);
    check("a statewide item carries statewide, not a county",
      p.rows[1].payload.statewide === true && !p.rows[1].payload.county_fips);
    check("a blank summary is stored as null", p.rows[1].payload.summary === null, String(p.rows[1].payload.summary));
    check("published_at is stored as an ISO timestamp",
      p.rows[0].payload.published_at === "2026-10-05T00:00:00.000Z", p.rows[0].payload.published_at);
    check("the path-scoped Division entry gives official:dos.fl.gov/elections",
      p.rows[1].payload.source_id === "official:dos.fl.gov/elections", String(p.rows[1].payload.source_id));
  }
  const blank = plan([item({ title: "   " })]);
  check("an item the schema refuses refuses the batch", !blank.ok && blank.error.startsWith("item 0:"), JSON.stringify(blank));
}

/* ---- 6. the run, against an in-memory client ---------------------------- */
type Row = Record<string, unknown>;
interface Read { table: string; columns: string; filters: [op: string, col: string, value: unknown][] }
function get(row: Row, col: string): unknown {
  const [head, key] = col.split("->>");
  const v = row[head];
  return key === undefined ? v : (v as Row | null)?.[key];
}
function fakeDb(tables: Record<string, Row[]>, fail: { read?: string; insert?: boolean } = {}) {
  const reads: Read[] = [];
  const inserted: Row[] = [];
  const from = (table: string) => {
    const read: Read = { table, columns: "", filters: [] };
    const q = {
      select: (columns: string) => { read.columns = columns; reads.push(read); return q; },
      eq: (col: string, v: unknown) => { read.filters.push(["eq", col, v]); return q; },
      in: (col: string, vs: unknown[]) => { read.filters.push(["in", col, vs]); return q; },
      insert: async (rows: Row[]) => {
        if (fail.insert) return { error: { message: "insert refused" } };
        inserted.push(...rows);
        return { error: null };
      },
      then: (done: (v: { data: Row[] | null; error: { message: string } | null }) => unknown) => {
        if (fail.read === table) return done({ data: null, error: { message: `${table} unavailable` } });
        const keep = (r: Row) => read.filters.every(([op, col, v]) =>
          op === "eq" ? get(r, col) === v : (v as unknown[]).includes(get(r, col)));
        return done({ data: (tables[table] ?? []).filter(keep), error: null });
      },
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, reads, inserted, sources: (tables.source ?? []) as unknown as PageRow[] };
}
/* A run whose queued rows then go through the approve path against the same
   `source` table. */
async function run(f: ReturnType<typeof fakeDb>, raw: unknown, opts: { dryRun: boolean }) {
  const r = await runElectionQueue(f.db, raw, opts);
  approvable(r.output?.rows ?? [], f.sources);
  return r;
}

const good = [item(), item({ url: "https://dos.fl.gov/elections/for-voters/election-dates/", scope: { statewide: true } })];
{
  const f = fakeDb({});
  const r = await run(f, good, { dryRun: true });
  check("--dry-run inserts nothing", f.inserted.length === 0, JSON.stringify(f.inserted));
  check("--dry-run still reports what it would queue",
    r.exitCode === 0 && r.output?.rows.length === 2 && r.line === "would queue 2, skipped 0, dropped 0", JSON.stringify(r));
}
{
  const f = fakeDb({});
  const r = await run(f, good, { dryRun: false });
  check("a real run inserts exactly the planned rows into review_item",
    r.exitCode === 0 && f.inserted.length === 2 && r.line === "queued 2, skipped 0, dropped 0", JSON.stringify(r));
  const reviewRead = f.reads.find((x) => x.table === "review_item");
  check("the review_item read is filtered to manual_news and the batch's URLs",
    reviewRead !== undefined &&
      reviewRead.filters.some(([op, col, v]) => op === "eq" && col === "kind" && v === "manual_news") &&
      reviewRead.filters.some(([op, col]) => op === "in" && col === "payload->>url"),
    JSON.stringify(reviewRead));
  const newsRead = f.reads.find((x) => x.table === "news_item");
  check("the news_item read is filtered by URL", newsRead?.filters.some(([op, col]) => op === "in" && col === "url") === true,
    JSON.stringify(newsRead));
  const sourceRead = f.reads.find((x) => x.table === "source");
  check("the source read is filtered by url_norm",
    sourceRead?.filters.some(([op, col]) => op === "in" && col === "url_norm") === true, JSON.stringify(sourceRead));
  check("every read is filtered, in chunks of at most 200",
    f.reads.every((x) => x.filters.some(([op, , v]) => op === "in" && (v as unknown[]).length <= 200)), JSON.stringify(f.reads));
  check("the read chunk is 200", QUEUE_READ_CHUNK === 200, String(QUEUE_READ_CHUNK));
}
{
  /* A batch of 25 never fills one chunk of 200, so the chunking is driven
     here with a chunk of 2: every read is split, and a row whose URL falls in
     the last chunk is still found. */
  const urls = ["a", "b", "c", "d", "e"].map((x) => `https://www.browardvotes.gov/notices/${x}`);
  const items = urls.map((url) => item({ url })) as unknown as ElectionNewsItem[];
  const last = urls[urls.length - 1];
  const f = fakeDb({
    source: [{ source_id: "src_last", url_norm: urlNorm(last), type: "primary_doc", lean_tag: "N/A" }],
    news_item: [{ url: last }],
    review_item: [{ kind: "manual_news", status: "approved", payload: { url: last } }],
  });
  const c = await readQueueContext(f.db, items, 2);
  for (const table of ["source", "news_item", "review_item"]) {
    const reads = f.reads.filter((x) => x.table === table);
    check(`the ${table} read is split into chunks of the given size`,
      reads.length > 1 && reads.every((x) => x.filters.some(([op, , v]) => op === "in" && (v as unknown[]).length <= 2)),
      JSON.stringify(reads));
  }
  check("a row in the last chunk is still found",
    c.pageRows.get(urlNorm(last)!)?.source_id === "src_last" && c.storedUrls.has(last) && c.queuedUrls.has(last),
    JSON.stringify({ pages: [...c.pageRows.keys()], stored: [...c.storedUrls], queued: [...c.queuedUrls] }));
}
{
  /* The news_item and review_item reads ask for the batch's URLs under their
     common other spellings (scheme, trailing slash), so a stored variant is
     found and skipped. */
  const stored = "http://www.browardvotes.gov/voting-methods/early-voting/";
  const f = fakeDb({
    news_item: [{ url: stored }],
    review_item: [{ kind: "manual_news", status: "pending", payload: { url: stored } }],
  });
  const r = await run(f, [item()], { dryRun: true });
  check("a URL stored under another spelling is skipped",
    r.exitCode === 0 && r.output?.rows.length === 0 && r.output?.skipped.length === 1, JSON.stringify(r));
}
{
  /* The reads also ask for the URL with and without www., so a page stored
     or recorded under the other host spelling is found. */
  const bare = "https://browardvotes.gov/voting-methods/early-voting";
  const f = fakeDb({
    news_item: [{ url: bare }],
    review_item: [{ kind: "manual_news", status: "pending", payload: { url: `${bare}/` } }],
  });
  const r = await run(f, [item()], { dryRun: true });
  check("a URL stored without www. is skipped",
    r.exitCode === 0 && r.output?.rows.length === 0 && r.output?.skipped.length === 1, JSON.stringify(r));
  const g = fakeDb({ source: [{ source_id: "src_adv", url_norm: urlNorm(bare), type: "opinion", lean_tag: "N/A" }] });
  const d = await run(g, [item()], { dryRun: true });
  check("a page row recorded without www. is read and drops the item",
    d.exitCode === 0 && d.output?.rows.length === 0 && d.output?.dropped.length === 1, JSON.stringify(d));
  /* A www. page row read for a bare URL queues an item the approve path
     accepts (run() sends every queued row through it). */
  const h = fakeDb({ source: [{ source_id: "src_senate_x", url_norm: "www.flsenate.gov/session/bill/2026/1", type: "primary_doc", lean_tag: "N/A" }] });
  const s = await run(h, [item({ url: "https://flsenate.gov/session/bill/2026/1", scope: { statewide: true } })], { dryRun: true });
  check("a www. page row read for a bare URL lends no id; the run queues official:flsenate.gov",
    s.exitCode === 0 && s.output?.rows.length === 1 && s.output.rows[0].payload.source_id === "official:flsenate.gov",
    JSON.stringify(s));
}
{
  const f = fakeDb({
    news_item: [{ url: good[0].url }],
    review_item: [{ kind: "manual_news", status: "rejected", payload: { url: good[1].url } }],
  });
  const r = await run(f, good, { dryRun: false });
  check("a run where everything is already handled exits 0 and queues nothing",
    r.exitCode === 0 && f.inserted.length === 0 && r.line === "queued 0, skipped 2, dropped 0", JSON.stringify(r));
}
{
  const f = fakeDb({ review_item: [{ kind: "candidate_lead", status: "pending", payload: { url: good[0].url } }] });
  const r = await run(f, good, { dryRun: false });
  check("only manual_news items count as already queued", r.exitCode === 0 && f.inserted.length === 2, JSON.stringify(r));
}
for (const table of ["source", "news_item", "review_item"]) {
  const f = fakeDb({}, { read: table });
  const r = await run(f, good, { dryRun: false });
  check(`a ${table} read error exits 1 and writes nothing`,
    r.exitCode === 1 && r.output === null && f.inserted.length === 0 && r.line.includes(`${table} unavailable`), JSON.stringify(r));
}
{
  const f = fakeDb({}, { insert: true });
  const r = await run(f, good, { dryRun: false });
  check("an insert error exits 1", r.exitCode === 1 && r.output === null && r.line.includes("insert refused"), JSON.stringify(r));
}
{
  const f = fakeDb({});
  const r = await run(f, [item({ scope: { metro: "miami" } })], { dryRun: false });
  check("a refused batch exits 1 before any read",
    r.exitCode === 1 && f.reads.length === 0 && f.inserted.length === 0 && r.line.startsWith("election-news: batch refused"),
    JSON.stringify(r));
}

/* ---- 7. the CLI writes nothing but review_item -------------------------- */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const lib = strip(readFileSync(resolve(import.meta.dirname, "..", "src/lib/election-news.ts"), "utf8"));
const cli = strip(readFileSync(resolve(import.meta.dirname, "election-news.ts"), "utf8"));
check("the library's one write is an insert into review_item",
  (lib.match(/\.insert\(/g) ?? []).length === 1 && /from\("review_item"\)\.insert\(plan\.rows\)/.test(lib));
check("the library never updates, upserts or deletes",
  !/\.(update|upsert|delete)\(/.test(lib));
check("the CLI writes nothing itself and goes through runElectionQueue",
  !/\.(insert|update|upsert|delete)\(/.test(cli) && /runElectionQueue\(/.test(cli));
check("the CLI refuses an unknown argument instead of writing",
  /if \(unknown\.length > 0\) fail\(2, `queue: unknown argument/.test(cli));
check("the CLI passes --dry-run through to runElectionQueue",
  /const dryRun = args\.includes\("--dry-run"\);/.test(cli) && /runElectionQueue\(createClient\(supabaseUrl, serviceKey\), raw, \{ dryRun \}\)/.test(cli));

/* ---- 9. the ballot roster R3's candidate rule matches against ---------- */
{
  const f = fakeDb(ROSTER_TABLES);
  const roster = await loadBallotRoster(f.db);
  check("the ballot roster is the ballot-tier candidates of the general election's published and listed races, with their county",
    JSON.stringify(roster) === JSON.stringify(ROSTER), JSON.stringify(roster));
  check("a listed-race candidate is on the ballot roster", roster.some((c) => c.candidateId === "FL-VF-T2"));
  check("a write-in, a draft race's candidate and a primary race's candidate are not",
    !roster.some((c) => ["FL-DOE-T9", "FL-VF-T3", "FL-DOE-T4"].includes(c.candidateId)), JSON.stringify(roster));
  const raceRead = f.reads.find((x) => x.table === "race");
  check("the race read is scoped to the general election",
    raceRead?.filters.some(([op, col, v]) => op === "eq" && col === "election" && v === "general") === true, JSON.stringify(raceRead));
  const pubRead = f.reads.find((x) => x.table === "race_publication");
  check("the publication read keeps published and listed races only",
    pubRead?.filters.some(([op, col, v]) => op === "in" && col === "status" && JSON.stringify(v) === '["published","listed"]') === true,
    JSON.stringify(pubRead));
  const candidateRead = f.reads.find((x) => x.table === "candidate");
  check("the candidate read is ballot-tier only, by id",
    candidateRead?.filters.some(([op, col, v]) => op === "eq" && col === "ballot_status" && v === "ballot") === true &&
      candidateRead.filters.some(([op, col]) => op === "in" && col === "candidate_id"),
    JSON.stringify(candidateRead));
  check("the roster reads write nothing", f.inserted.length === 0);
}
for (const table of ["race", "race_publication", "candidate"]) {
  let message = "";
  try {
    await loadBallotRoster(fakeDb(ROSTER_TABLES, { read: table }).db);
  } catch (err) {
    message = (err as Error).message;
  }
  check(`a ${table} read error throws, naming it`, message.includes(`${table} unavailable`), message);
}
{
  const intake = strip(readFileSync(resolve(import.meta.dirname, "..", "src/lib/news-intake.ts"), "utf8"));
  const start = intake.indexOf("export async function loadBallotRoster");
  const body = intake.slice(start, intake.indexOf("export async function enqueueIntake"));
  check("loadBallotRoster only reads", start >= 0 && !/\.(insert|update|upsert|delete)\(/.test(body));
}

/* The round trip ran over the fixtures, not over nothing. */
check("the queued fixture rows went through the approve path", approvedRows >= 15, `${approvedRows} rows`);

if (failures > 0) {
  console.error(`\nverify-election-news: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-election-news: OK — malformed batches are refused whole, every queued row is a pending agent:R3 manual_news item with a checked source, all ${approvedRows} queued rows pass the approve path's source checks, skips and drops are reported, and --dry-run writes nothing`,
);
