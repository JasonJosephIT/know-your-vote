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
import { ManualNewsPayloadSchema } from "../src/types/admin.ts";
import { urlNorm } from "../src/lib/brief-rows.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const item = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  title: "Early voting sites and hours for the general election",
  summary: "The Supervisor of Elections lists 33 early voting sites, open Oct. 19 to Nov. 1.",
  url: "https://www.browardvotes.gov/voting-methods/early-voting",
  published_at: "2026-10-05",
  scope: { county_fips: "12011" },
  ...over,
});

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

/* ---- 3, 4 and 5. the plan ----------------------------------------------- */
const EMPTY: QueueContext = { pageRows: new Map(), storedUrls: new Set(), queuedUrls: new Set() };
const ctx = (over: Partial<QueueContext> = {}): QueueContext => ({ ...EMPTY, ...over });
const pageRow = (url_norm: string, type: string, lean_tag: string, source_id = `src_${type}`): PageRow =>
  ({ source_id, url_norm, type, lean_tag });
const plan = (items: Record<string, unknown>[], c: QueueContext = EMPTY) =>
  planElectionQueue(items as unknown as ElectionNewsItem[], c);

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
  return { db: { from } as unknown as SupabaseClient, reads, inserted };
}

const good = [item(), item({ url: "https://dos.fl.gov/elections/for-voters/election-dates/", scope: { statewide: true } })];
{
  const f = fakeDb({});
  const r = await runElectionQueue(f.db, good, { dryRun: true });
  check("--dry-run inserts nothing", f.inserted.length === 0, JSON.stringify(f.inserted));
  check("--dry-run still reports what it would queue",
    r.exitCode === 0 && r.output?.rows.length === 2 && r.line === "would queue 2, skipped 0, dropped 0", JSON.stringify(r));
}
{
  const f = fakeDb({});
  const r = await runElectionQueue(f.db, good, { dryRun: false });
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
  const r = await runElectionQueue(f.db, [item()], { dryRun: true });
  check("a URL stored under another spelling is skipped",
    r.exitCode === 0 && r.output?.rows.length === 0 && r.output?.skipped.length === 1, JSON.stringify(r));
}
{
  const f = fakeDb({
    news_item: [{ url: good[0].url }],
    review_item: [{ kind: "manual_news", status: "rejected", payload: { url: good[1].url } }],
  });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check("a run where everything is already handled exits 0 and queues nothing",
    r.exitCode === 0 && f.inserted.length === 0 && r.line === "queued 0, skipped 2, dropped 0", JSON.stringify(r));
}
{
  const f = fakeDb({ review_item: [{ kind: "candidate_lead", status: "pending", payload: { url: good[0].url } }] });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check("only manual_news items count as already queued", r.exitCode === 0 && f.inserted.length === 2, JSON.stringify(r));
}
for (const table of ["source", "news_item", "review_item"]) {
  const f = fakeDb({}, { read: table });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check(`a ${table} read error exits 1 and writes nothing`,
    r.exitCode === 1 && r.output === null && f.inserted.length === 0 && r.line.includes(`${table} unavailable`), JSON.stringify(r));
}
{
  const f = fakeDb({}, { insert: true });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check("an insert error exits 1", r.exitCode === 1 && r.output === null && r.line.includes("insert refused"), JSON.stringify(r));
}
{
  const f = fakeDb({});
  const r = await runElectionQueue(f.db, [item({ scope: { metro: "miami" } })], { dryRun: false });
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

if (failures > 0) {
  console.error(`\nverify-election-news: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-election-news: OK — malformed batches are refused whole, every queued row is a pending agent:R3 manual_news item with a checked source, skips and drops are reported, and --dry-run writes nothing",
);
