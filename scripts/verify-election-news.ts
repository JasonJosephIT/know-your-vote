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
    10. Scope comes from the publisher (agent-retrofit D2), and the content
        rules drop an item, with a rule and a reason: the date window, a
        candidate on the ballot roster, a case for or against an amendment,
        the neutrality lint (agent-retrofit spec §3.5).
    11. R3's own four items of 2026-09-09: the Hillsborough and Division
        pages queue with their scopes; the Miami-Dade County release and the
        Ballotpedia story refuse their batch as not official.
    12. `context` lists every official entry with the scope its items carry,
        the hosts R3 may fetch, the official pages already stored or queued
        in the window (read in pages, filtered by kind and date), and the
        election's dates without the verifier's name; it writes nothing.

   Pure and offline: an in-memory stand-in for the Supabase client, no
   network. Run: node scripts/verify-election-news.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONTEXT_PAGE,
  ELECTION_WINDOW_DAYS,
  FUTURE_DAYS,
  MAX_ELECTION_BATCH,
  SIDE_TAKING_WORDS,
  batchProblem,
  buildElectionContext,
  contentDrop,
  electionWindow,
  planElectionQueue,
  QUEUE_READ_CHUNK,
  readContextRows,
  readQueueContext,
  runElectionContext,
  runElectionQueue,
  scopeFor,
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
import { OFFICIAL_SOURCES, officialForUrl } from "../src/lib/official-sources.ts";
import { supervisorSite } from "../src/lib/supervisors.ts";
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
{
  /* D2: scope comes from the publisher, so a statewide body's notice is
     statewide. News PR A accepted a county here. */
  const got = batchProblem([item({ url: "https://dos.fl.gov/elections/x", scope: { county_fips: "12086" } })]);
  check("a county scope on a statewide body's page refuses the batch",
    got !== null && got.includes('item 0: dos.fl.gov/elections is a statewide body\'s page: its scope is { "statewide": true }, not county 12086'),
    String(got));
}
check("an empty batch has no problem", batchProblem([]) === null);
check("a full ISO timestamp is a date",
  batchProblem([item({ published_at: "2026-10-05T09:30:00-04:00" })]) === null, String(batchProblem([item({ published_at: "2026-10-05T09:30:00-04:00" })])));
for (const date of ["2028-02-29", "2026-12-31", "2026-10-05T09:30:00Z", "2026-10-05T13:30:00.000Z", "2026-10-05T09:30+05:30"]) {
  check(`${date} is a date`, batchProblem([item({ published_at: date })]) === null, String(batchProblem([item({ published_at: date })])));
}

/* ---- 3, 4 and 5. the plan ----------------------------------------------- */
/* The clock for the queue tests: the item() fixture is dated 2026-10-05. */
const NOW = new Date("2026-10-08T12:00:00Z");
const EMPTY: QueueContext = { pageRows: new Map(), storedUrls: new Set(), queuedUrls: new Set(), roster: ROSTER };
const ctx = (over: Partial<QueueContext> = {}): QueueContext => ({ ...EMPTY, ...over });
const pageRow = (url_norm: string, type: string, lean_tag: string, source_id = `src_${type}`): PageRow =>
  ({ source_id, url_norm, type, lean_tag });
const plan = (items: Record<string, unknown>[], c: QueueContext = EMPTY, now: Date = NOW) => {
  const p = planElectionQueue(items as unknown as ElectionNewsItem[], c, now);
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
  check("a page row recorded as opinion drops the item, with the reason and the rule page_type",
    advocacy.ok && advocacy.rows.length === 0 && advocacy.dropped.length === 1 &&
      advocacy.dropped[0].index === 0 && advocacy.dropped[0].reason.includes("opinion / N/A") &&
      advocacy.dropped[0].rule === "page_type", JSON.stringify(advocacy));
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
interface Read {
  table: string;
  columns: string;
  filters: [op: string, col: string, value: unknown][];
  order?: string;
  range?: [number, number];
}
function get(row: Row, col: string): unknown {
  const [head, key] = col.split("->>");
  const v = row[head];
  return key === undefined ? v : (v as Row | null)?.[key];
}
function fakeDb(given: Record<string, Row[]>, fail: { read?: string; insert?: boolean } = {}) {
  /* Every run reads the ballot roster; a test overrides a roster table by
     naming it. */
  const tables: Record<string, Row[]> = { ...ROSTER_TABLES, ...given };
  const reads: Read[] = [];
  const inserted: Row[] = [];
  const from = (table: string) => {
    const read: Read = { table, columns: "", filters: [] };
    const q = {
      select: (columns: string) => { read.columns = columns; reads.push(read); return q; },
      eq: (col: string, v: unknown) => { read.filters.push(["eq", col, v]); return q; },
      in: (col: string, vs: unknown[]) => { read.filters.push(["in", col, vs]); return q; },
      gte: (col: string, v: unknown) => { read.filters.push(["gte", col, v]); return q; },
      order: (col: string) => { read.order = col; return q; },
      range: (from: number, to: number) => { read.range = [from, to]; return q; },
      insert: async (rows: Row[]) => {
        if (fail.insert) return { error: { message: "insert refused" } };
        inserted.push(...rows);
        return { error: null };
      },
      then: (done: (v: { data: Row[] | null; error: { message: string } | null }) => unknown) => {
        if (fail.read === table) return done({ data: null, error: { message: `${table} unavailable` } });
        const keep = (r: Row) => read.filters.every(([op, col, v]) =>
          op === "eq" ? get(r, col) === v
            : op === "gte" ? String(get(r, col)) >= String(v)
              : (v as unknown[]).includes(get(r, col)));
        let rows = (tables[table] ?? []).filter(keep);
        if (read.order) {
          const col = read.order;
          rows = [...rows].sort((a, b) => String(get(a, col)).localeCompare(String(get(b, col))));
        }
        if (read.range) rows = rows.slice(read.range[0], read.range[1] + 1);
        return done({ data: rows, error: null });
      },
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, reads, inserted, sources: (tables.source ?? []) as unknown as PageRow[] };
}
/* A run whose queued rows then go through the approve path against the same
   `source` table. */
async function run(f: ReturnType<typeof fakeDb>, raw: unknown, opts: { dryRun: boolean; now?: Date }) {
  const r = await runElectionQueue(f.db, raw, { now: NOW, ...opts });
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
  const batchReads = f.reads.filter((x) => ["source", "news_item", "review_item"].includes(x.table));
  check("every read of the batch's URLs is filtered, in chunks of at most 200",
    batchReads.length >= 3 && batchReads.every((x) => x.filters.some(([op, , v]) => op === "in" && (v as unknown[]).length <= 200)),
    JSON.stringify(batchReads));
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
for (const table of ["race", "race_publication", "candidate"]) {
  const f = fakeDb({}, { read: table });
  const r = await run(f, good, { dryRun: false });
  check(`a ${table} read error (the ballot roster) exits 1 and writes nothing`,
    r.exitCode === 1 && r.output === null && f.inserted.length === 0 && r.line.includes(`${table} unavailable`), JSON.stringify(r));
}
{
  const f = fakeDb({ race: [] });
  const r = await run(f, good, { dryRun: false });
  check("an empty ballot roster exits 1 and writes nothing",
    r.exitCode === 1 && r.output === null && f.inserted.length === 0 && r.line.includes("the ballot roster is empty"), JSON.stringify(r));
}
{
  /* The listed-race candidate reaches the rule through the real roster read. */
  const f = fakeDb({});
  const r = await run(f, [item({ title: "John Okafor to hold a voter registration drive" })], { dryRun: false });
  check("a real run drops an item naming a listed-race candidate and inserts nothing",
    r.exitCode === 0 && r.output?.dropped[0]?.rule === "candidate" && f.inserted.length === 0 && r.line === "queued 0, skipped 0, dropped 1",
    JSON.stringify(r));
}
{
  const f = fakeDb({});
  const r = await run(f, [item({ scope: { metro: "miami" } })], { dryRun: false });
  check("a refused batch exits 1 before any read",
    r.exitCode === 1 && f.reads.length === 0 && f.inserted.length === 0 && r.line.startsWith("election-news: batch refused"),
    JSON.stringify(r));
}

/* ---- 10. scope from the publisher, and the content drops ---------------- */
{
  for (const [label, url, scope] of [
    ["a votemiamidade.gov page", "https://www.votemiamidade.gov/news/ev", { county_fips: "12086" }],
    ["a miamidade.gov/elections page", "https://www.miamidade.gov/elections/library/early-voting/x.pdf", { county_fips: "12086" }],
    ["an ocfelections.gov page", "https://www.ocfelections.gov/x", { county_fips: "12095" }],
    ["a flcourts.gov page", "https://www.flcourts.gov/x", { statewide: true }],
  ] as const) {
    const entry = officialForUrl(url);
    check(`${label} takes its publisher's scope`, entry !== null && JSON.stringify(scopeFor(entry)) === JSON.stringify(scope),
      JSON.stringify(entry));
    const got = batchProblem([item({ url, scope })]);
    check(`${label} with its publisher's scope is a well-formed batch`, got === null, String(got));
  }
  const vmd = plan([item({ url: "https://www.votemiamidade.gov/news/ev", scope: { county_fips: "12086" } })]);
  check("a votemiamidade.gov item queues scoped to 12086",
    vmd.ok && vmd.rows.length === 1 && vmd.rows[0].payload.county_fips === "12086", JSON.stringify(vmd));
  check("a votemiamidade.gov item scoped statewide refuses the batch",
    (batchProblem([item({ url: "https://www.votemiamidade.gov/news/ev", scope: { statewide: true } })]) ?? "")
      .includes("scoped to its county 12086, not statewide"));
  check("a votemiamidade.gov item scoped to Broward refuses the batch",
    (batchProblem([item({ url: "https://www.votemiamidade.gov/news/ev", scope: { county_fips: "12011" } })]) ?? "")
      .includes("differs from the publisher's county 12086"));
}
{
  check("the item() fixture breaks no content rule", contentDrop(item() as unknown as ElectionNewsItem, ROSTER, NOW) === null);
  /* The one drop a one-item batch gives, or null. */
  const drop = (over: Record<string, unknown>, now: Date = NOW) => {
    const p = plan([item(over)], EMPTY, now);
    return p.ok && p.rows.length === 0 && p.dropped.length === 1 ? p.dropped[0] : null;
  };

  /* Never a candidate story: matchArticle over the whole ballot roster. */
  const named = drop({ summary: "Maria Vasquez will open the first early voting site on Oct. 19." });
  check("an item naming a published-race candidate drops, naming the candidate id",
    named?.rule === "candidate" && named.reason.includes("FL-DOE-T1"), JSON.stringify(named));
  const listed = drop({ title: "Commissioner Okafor opens an early voting site" });
  check("an item naming a listed-race candidate by title and surname drops",
    listed?.rule === "candidate" && listed.reason.includes("FL-VF-T2"), JSON.stringify(listed));
  const street = plan([item({ summary: "Early voting runs at the Vasquez Street library from Oct. 19." })]);
  check("a bare surname with no title is not a mention (matchArticle's own rule)",
    street.ok && street.rows.length === 1, JSON.stringify(street));

  /* Never a case for or against a measure. */
  const amendment = { url: "https://dos.fl.gov/elections/amendments", scope: { statewide: true }, title: "Amendment 3 on the November ballot" };
  const yes = drop({ ...amendment, summary: "Supporters urge voters to vote yes on Amendment 3." });
  check('an amendment item saying "vote yes" drops', yes?.rule === "measure_case", JSON.stringify(yes));
  for (const word of SIDE_TAKING_WORDS) {
    const d = drop({ ...amendment, summary: `The notice says voters ${word} the change.` });
    check(`an amendment item using "${word}" drops`, d?.rule === "measure_case", JSON.stringify(d));
  }
  for (const phrase of ["opposition to", "is harmful to", "benefits for", 'vote "no" on']) {
    const d = drop({ ...amendment, summary: `A group cites ${phrase} the change.` });
    check(`an amendment item using "${phrase}" drops`, d?.rule === "measure_case", JSON.stringify(d));
  }
  const plain = plan([item({ ...amendment, summary: "Three constitutional amendments are on the November 3 ballot." })]);
  check("an amendment item that takes no side queues", plain.ok && plain.rows.length === 1, JSON.stringify(plain));
  const noMeasure = plan([item({ summary: "The office will support voters with disabilities at every early voting site." })]);
  check("a side-taking word with no amendment named queues", noMeasure.ok && noMeasure.rows.length === 1, JSON.stringify(noMeasure));
  /* Whole words only: a word that merely contains one is not taking a side. */
  const partWords = plan([item({ ...amendment, summary: "Amendment 3 is on the ballot. Park on the shoulder; the site was unharmed by the storm and runs in harmony with county rules." })]);
  check('an amendment item with "shoulder", "unharmed" and "harmony" queues (whole words only)',
    partWords.ok && partWords.rows.length === 1, JSON.stringify(partWords));

  /* The lint drops instead of advising. */
  const lint = drop({ summary: "The Supervisor touts 33 early voting sites, open Oct. 19 to Nov. 1." });
  check("a banned term drops, with the rule lint", lint?.rule === "lint" && lint.reason.includes("touts"), JSON.stringify(lint));
  const both = drop({ summary: "Maria Vasquez touts the early voting sites." });
  check("a candidate item with a banned term is a candidate drop, which R3 may not reword",
    both?.rule === "candidate", JSON.stringify(both));

  /* A dropped item is not "earlier in the batch": R3's reworded copy of the
     same page queues. */
  const reworded = plan([
    item({ summary: "The Supervisor touts 33 early voting sites." }),
    item({ summary: "The Supervisor lists 33 early voting sites." }),
  ]);
  check("a page dropped by the lint and repeated with new wording queues once",
    reworded.ok && reworded.rows.length === 1 && reworded.dropped.length === 1 && reworded.skipped.length === 0,
    JSON.stringify(reworded));
}

/* The date window, against R3's 2026-09-10 clock (spec §6). */
const SEPT10 = new Date("2026-09-10T00:00:00Z");
check("the window runs from 60 days before the run's day to 1 day after it, in UTC days",
  JSON.stringify(electionWindow(SEPT10)) === '{"from":"2026-07-12","to":"2026-09-11"}' &&
    ELECTION_WINDOW_DAYS === 60 && FUTURE_DAYS === 1,
  JSON.stringify(electionWindow(SEPT10)));
for (const [date, want] of [
  ["2026-07-11", "date_window"],
  ["2026-07-12", null],
  ["2026-09-11", null],
  ["2026-09-12", "date_window"],
  ["2026-09-11T23:30:00-04:00", "date_window"],
] as const) {
  const p = plan([item({ published_at: date })], EMPTY, SEPT10);
  const got = p.ok ? (p.dropped[0]?.rule ?? null) : "refused";
  check(`an item dated ${date} against the 2026-09-10 clock is ${want ? "dropped" : "kept"}`, got === want, JSON.stringify(p));
}

/* ---- 11. R3's own items of 2026-09-09 --------------------------------- */
/* news_item 1ae20884, 4c787ba7, ce038b86 and 8d12a9b1 (2026-09-09-R3.md), as
   R3 wrote them, each given the scope its publisher would give. */
const R3_0909 = {
  miamiDadeRelease: {
    title: "Miami-Dade sets voting options and deadlines for November 3 General Election",
    summary: "The Miami-Dade Supervisor of Elections announced on September 1, 2026 that early voting for the General Election will run October 19 through November 1, 7 a.m. to 7 p.m. daily, at 28 locations. The office lists October 5, 2026 as the voter registration deadline and 5 p.m. on October 22 as the deadline to request a vote-by-mail ballot; Election Day polls are open 7 a.m. to 7 p.m. on November 3.",
    url: "https://www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232",
    published_at: "2026-09-01",
    scope: { county_fips: "12086" },
  },
  hillsborough: {
    title: "Hillsborough plans 27 early-voting sites for November 3 General Election",
    summary: "The Hillsborough County Supervisor of Elections says it plans to open 27 early voting sites for the 2026 General Election, running October 19 through November 1 from 7 a.m. to 7 p.m. Vote-by-mail ballots are mailed to military and overseas voters beginning September 18 and to other requesting voters beginning October 1; because 2024 requests have expired, voters must submit a new request by 5 p.m. on October 22.",
    url: "https://www.votehillsborough.gov/291/2026-General-Election",
    published_at: "2026-09-09",
    scope: { county_fips: "12057" },
  },
  ballotpedia: {
    title: "Three constitutional amendments certified for Florida's November 3 ballot",
    summary: "Ballotpedia reports that Florida voters will decide three legislatively referred constitutional amendments on November 3, 2026: one on homestead tax exemptions, property assessments and local spending restrictions; one exempting tangible personal property used for agriculture or agritourism from property taxes; and one changing the state Budget Stabilization Fund. Each requires 60% voter approval to pass, and no citizen-initiated measures qualified for the 2026 ballot.",
    url: "https://news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-tax-exemption-amendment-in-november/",
    published_at: "2026-06-03",
    scope: { statewide: true },
  },
  doeDates: {
    title: "Florida's statewide deadlines for the November 3 General Election",
    summary: "The Florida Division of Elections lists October 5, 2026 as the voter registration deadline for the General Election and 5 p.m. on October 22 as the deadline to request a vote-by-mail ballot, with domestic vote-by-mail ballots mailed between September 24 and October 1. The state's mandatory early voting period runs October 24 through October 31; individual counties may offer additional early voting days.",
    url: "https://dos.fl.gov/elections/for-voters/election-dates/",
    published_at: "2026-09-09",
    scope: { statewide: true },
  },
};
{
  const p = plan([R3_0909.hillsborough, R3_0909.doeDates], EMPTY, SEPT10);
  check("R3's Hillsborough page queues scoped to 12057, under official:votehillsborough.gov",
    p.ok && p.rows[0]?.payload.county_fips === "12057" && p.rows[0].payload.source_id === "official:votehillsborough.gov",
    JSON.stringify(p));
  check("R3's Division dates page queues statewide, under official:dos.fl.gov/elections",
    p.ok && p.rows[1]?.payload.statewide === true && p.rows[1].payload.source_id === "official:dos.fl.gov/elections",
    JSON.stringify(p));
  for (const [n, r] of (p.ok ? p.rows : []).entries()) {
    check(`R3's 2026-09-09 row ${n} parses with ManualNewsPayloadSchema`, ManualNewsPayloadSchema.safeParse(r.payload).success);
  }
  const release = batchProblem([R3_0909.hillsborough, R3_0909.miamiDadeRelease]);
  check("the Miami-Dade County release refuses its batch as not official, naming its index",
    release !== null && release.startsWith("item 1: https://www.miamidade.gov/global/release.page") &&
      release.includes("is not on the official-source list"),
    String(release));
  const ballotpedia = batchProblem([R3_0909.ballotpedia]);
  check("the Ballotpedia story refuses its batch as not official, naming its index",
    ballotpedia !== null && ballotpedia.startsWith("item 0: https://news.ballotpedia.org/") &&
      ballotpedia.includes("is not on the official-source list"),
    String(ballotpedia));
  const f = fakeDb({});
  const r = await run(f, [R3_0909.hillsborough, R3_0909.doeDates], { dryRun: true, now: SEPT10 });
  check("a dry run of R3's two official 2026-09-09 items would queue both",
    r.exitCode === 0 && r.line === "would queue 2, skipped 0, dropped 0", JSON.stringify(r));
}

/* ---- 12. context -------------------------------------------------------- */
{
  const rows = {
    news: [
      { url: "https://www.browardvotes.gov/notices/ev-sites", published_at: "2026-10-01T00:00:00+00:00" },
      { url: "https://www.wlrn.org/2026/10/01/early-voting", published_at: "2026-10-01T12:00:00+00:00" },
    ],
    reviews: [
      { payload: { url: "https://dos.fl.gov/elections/notice-1", published_at: "2026-10-03T00:00:00.000Z" }, status: "rejected", created_at: "2026-10-04T10:00:00Z" },
      { payload: { url: "https://browardvotes.gov/notices/ev-sites/" }, status: "approved", created_at: "2026-10-02T10:00:00Z" },
      { payload: { url: "https://www.local10.com/x" }, status: "pending", created_at: "2026-10-05T10:00:00Z" },
      { payload: null, status: "pending", created_at: "2026-10-05T10:00:00Z" },
    ],
    events: [
      { event_type: "early_voting_start", county_fips: "12011", event_date: "2026-10-19", details_url: "https://browardvotes.gov/voters/early-voting-ballot-return", verified_by: "verifier@example.org" },
      { event_type: "election_day", county_fips: null, event_date: "2026-11-03", details_url: "https://dos.fl.gov/elections/for-voters/election-dates/", verified_by: null },
    ],
  };
  const c = buildElectionContext(rows, NOW);
  check("context's window is the queue's window", JSON.stringify(c.window) === JSON.stringify(electionWindow(NOW)), JSON.stringify(c.window));
  check("context lists the four covered counties in order, each with its Supervisor's site",
    c.counties.map((x) => x.county).join(",") === "Miami-Dade,Broward,Hillsborough,Orange" &&
      c.counties.every((x) => x.supervisor_site === supervisorSite(x.county_fips)),
    JSON.stringify(c.counties.map((x) => [x.county, x.supervisor_site])));
  check("every official entry appears once, with the scope its items carry",
    c.counties.flatMap((x) => x.entries).length + c.statewide.length === OFFICIAL_SOURCES.length &&
      c.counties.every((x) => x.entries.every((e) => JSON.stringify(e.scope) === JSON.stringify({ county_fips: x.county_fips }))) &&
      c.statewide.every((e) => JSON.stringify(e.scope) === '{"statewide":true}'),
    JSON.stringify({ counties: c.counties, statewide: c.statewide }));
  check("Miami-Dade's entries are votemiamidade.gov and miamidade.gov/elections",
    c.counties[0].entries.map((e) => e.domain).join(",") === "votemiamidade.gov,miamidade.gov/elections",
    JSON.stringify(c.counties[0].entries));
  check("fetch_hosts is every entry's host with and without www., and holds each Supervisor's site",
    c.fetch_hosts.length === 34 && c.fetch_hosts.includes("dos.fl.gov") && c.fetch_hosts.includes("www.flsenate.gov") &&
      !c.fetch_hosts.includes("www.courtlistener.com") &&
      c.counties.every((x) => c.fetch_hosts.includes(new URL(x.supervisor_site).hostname)),
    JSON.stringify(c.fetch_hosts));
  check("known_urls holds the official pages only, one per page, newest first, with review status",
    JSON.stringify(c.known_urls) === JSON.stringify([
      { url: "https://dos.fl.gov/elections/notice-1", in: "review_item", status: "rejected", date: "2026-10-03" },
      { url: "https://www.browardvotes.gov/notices/ev-sites", in: "news_item", status: null, date: "2026-10-01" },
    ]),
    JSON.stringify(c.known_urls));
  check("election_events says whether a date is verified and never copies who verified it",
    c.election_events.length === 2 && c.election_events[0].county_fips === null && c.election_events[0].verified === false &&
      c.election_events[1].verified === true && !JSON.stringify(c).includes("verifier@example.org"),
    JSON.stringify(c.election_events));
}
{
  /* The reads, against the in-memory client, with pages of 2. */
  const news = ["a", "b", "c", "d", "e"].map((x, i) => ({
    id: `n${i}`, url: `https://www.votehillsborough.gov/news/${x}`, published_at: "2026-10-01T00:00:00+00:00",
  }));
  const f = fakeDb({
    news_item: [...news, { id: "n9", url: "https://www.votehillsborough.gov/news/old", published_at: "2026-01-01T00:00:00+00:00" }],
    review_item: [
      { id: "r1", kind: "manual_news", status: "pending", created_at: "2026-10-02T00:00:00Z", payload: { url: "https://voteorangefl.gov/x" } },
      { id: "r2", kind: "candidate_lead", status: "pending", created_at: "2026-10-02T00:00:00Z", payload: { url: "https://voteorangefl.gov/y" } },
    ],
    election_event: [
      { election: "general_2026", event_type: "election_day", county_fips: null, event_date: "2026-11-03", details_url: null, verified_by: "x" },
      { election: "primary_2026", event_type: "election_day", county_fips: null, event_date: "2026-08-18", details_url: null, verified_by: "x" },
    ],
  });
  const r = await readContextRows(f.db, NOW, 2);
  const since = `${electionWindow(NOW).from}T00:00:00Z`;
  const newsReads = f.reads.filter((x) => x.table === "news_item");
  check("news_item is read in pages ordered by id, from the window's first day, until a short page",
    newsReads.length === 3 && newsReads.every((x) => x.order === "id" && x.filters.some(([op, col, v]) => op === "gte" && col === "published_at" && v === since)),
    JSON.stringify(newsReads));
  check("a row on the last page is still read, and a row before the window is not",
    r.news.length === 5 && r.news.some((n) => n.url?.endsWith("/news/e")) && !r.news.some((n) => n.url?.endsWith("/old")),
    JSON.stringify(r.news));
  const reviewRead = f.reads.find((x) => x.table === "review_item");
  check("review_item is read for manual_news items created in the window",
    reviewRead !== undefined && reviewRead.filters.some(([op, col, v]) => op === "eq" && col === "kind" && v === "manual_news") &&
      reviewRead.filters.some(([op, col, v]) => op === "gte" && col === "created_at" && v === since) && r.reviews.length === 1,
    JSON.stringify(reviewRead));
  check("election_event is read for the active election only",
    r.events.length === 1 && f.reads.some((x) => x.table === "election_event" &&
      x.filters.some(([op, col, v]) => op === "eq" && col === "election" && v === "general_2026")),
    JSON.stringify(r.events));
  check("context writes nothing", f.inserted.length === 0);
  check("a context page is 1000 rows, PostgREST's default cap", CONTEXT_PAGE === 1000, String(CONTEXT_PAGE));
  let tooMany = "";
  try {
    await readContextRows(f.db, NOW, 2, 4);
  } catch (err) {
    tooMany = (err as Error).message;
  }
  check("more rows than the cap throws instead of returning a partial list", tooMany.includes("more than 4 news_item rows"), tooMany);
}
for (const table of ["news_item", "review_item", "election_event"]) {
  const f = fakeDb({}, { read: table });
  const out = await runElectionContext(f.db, NOW);
  check(`a ${table} read error fails the context step and prints nothing`,
    out.exitCode === 1 && out.output === null && out.line.includes(`${table} unavailable`), JSON.stringify(out));
}
{
  const f = fakeDb({});
  const out = await runElectionContext(f.db, NOW);
  check("a context run with an empty database still lists the counties, the hosts and the window",
    out.exitCode === 0 && out.output?.counties.length === 4 && out.line.startsWith(`context: window ${electionWindow(NOW).from} to `),
    JSON.stringify(out));
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
check("the CLI's context step goes through runElectionContext and refuses any argument",
  /runElectionContext\(createClient\(supabaseUrl, serviceKey\)\)/.test(cli) &&
    /if \(command === "context" && args\.length > 0\) fail\(2, /.test(cli));

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
  `verify-election-news: OK — malformed batches are refused whole, scope comes from the publisher, the date window, candidate, measure and lint rules drop items with their reasons, every queued row is a pending agent:R3 manual_news item with a checked source, all ${approvedRows} queued rows pass the approve path's source checks, context only reads, and --dry-run writes nothing`,
);
