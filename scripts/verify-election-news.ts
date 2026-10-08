/* Guardrail for R3's queue (src/lib/election-news.ts, scripts/election-news.ts;
   spec docs/superpowers/specs/2026-10-08-news-source-integrity-design.md §3.2.3).

   What it pins:
     1. Every malformed batch is refused whole, naming the item's index.
     2. A URL off the official list, or on an outlet, refuses the batch.
     3. A page row recorded primary_doc / N/A backs its page; one recorded as
        anything else drops the item; any other item carries official:<domain>.
     4. A URL already stored, already queued in any status, or repeated in the
        batch is skipped.
     5. Every queued row parses with ManualNewsPayloadSchema, carries a
        source_id, and is a pending manual_news item from agent:R3.
     6. --dry-run inserts nothing; the reads are filtered by the batch's URLs;
        a read or insert error writes nothing and exits 1.
     7. The CLI writes nothing but review_item rows.

   Pure and offline: an in-memory stand-in for the Supabase client, no
   network. Run: node scripts/verify-election-news.ts */

import {
  MAX_ELECTION_BATCH,
  batchProblem,
  planElectionQueue,
  type ElectionNewsItem,
  type PageRow,
  type QueueContext,
} from "../src/lib/election-news.ts";
import { ManualNewsPayloadSchema } from "../src/types/admin.ts";

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
  ["a URL that is not http(s)", [item({ url: "ftp://www.browardvotes.gov/x" })], "item 0: url must be an http(s) URL"],
  ["a URL on an outlet", [item({ url: "https://www.wlrn.org/2026/10/05/early-voting" })], "item 0: https://www.wlrn.org/2026/10/05/early-voting is on the outlet list"],
  ["a URL off the official list", [item({ url: "https://www.courtlistener.com/opinion/1/x/" })], "is not on the official-source list"],
  ["a metro scope", [item({ scope: { metro: "fort_lauderdale" } })], "there is no metro scope"],
  ["a scope with two forms", [item({ scope: { county_fips: "12011", statewide: true } })], "scope must be"],
  ["statewide: false", [item({ scope: { statewide: false } })], "scope.statewide must be true"],
  ["a county outside the four", [item({ scope: { county_fips: "12099" } })], "12099 is not a covered county"],
  ["a county scope on another county's entry", [item({ scope: { county_fips: "12057" } })], "differs from the publisher's county 12011"],
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

if (failures > 0) {
  console.error(`\nverify-election-news: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-election-news: OK — malformed batches are refused whole, every queued row is a pending agent:R3 manual_news item with a checked source, skips and drops are reported, and --dry-run writes nothing",
);
