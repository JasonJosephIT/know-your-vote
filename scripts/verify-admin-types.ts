/* Self-test for the ops-plane zod contracts in src/types/admin.ts (roadmap
   TASK-A08 "self-test asserts per repo pattern"). Pure, in-memory, no network —
   real evidence the schemas accept what they should and reject what they must,
   so the API handlers can trust `.parse()` at the edge.

   Run: node scripts/verify-admin-types.ts
   (Node >= 23 strips types natively; the relative import carries an explicit
   .ts extension, same as verify-news-neutrality.ts.) */

import {
  DecisionBodySchema,
  IngestBodySchema,
  ManualNewsPayloadSchema,
  ReviewItemContentSchema,
} from "../src/types/admin.ts";

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const validNews = {
  item_type: "candidate_news",
  title: "County certifies primary results",
  summary: "The canvassing board certified the tally.",
  url: "https://example.gov/certified",
  candidate_id: "cand-123",
  published_at: "2026-07-01",
};

/* ---- manual_news payload ------------------------------------------------ */
assert(
  "manual_news: a complete valid payload parses",
  ManualNewsPayloadSchema.safeParse(validNews).success
);
assert(
  "manual_news: missing url is rejected (source URL mandatory, AFR-020)",
  !ManualNewsPayloadSchema.safeParse({ ...validNews, url: undefined }).success
);
assert(
  "manual_news: a non-http(s) url scheme is rejected",
  !ManualNewsPayloadSchema.safeParse({ ...validNews, url: "javascript:alert(1)" }).success
);
assert(
  "manual_news: a data: url is rejected",
  !ManualNewsPayloadSchema.safeParse({ ...validNews, url: "data:text/html,x" }).success
);
assert(
  "manual_news: no scope (no race/candidate/metro) is rejected",
  !ManualNewsPayloadSchema.safeParse({
    ...validNews,
    candidate_id: undefined,
  }).success
);
assert(
  "manual_news: metro-only scope is accepted",
  ManualNewsPayloadSchema.safeParse({
    ...validNews,
    candidate_id: undefined,
    metro: "miami",
  }).success
);
assert(
  "manual_news: an empty title is rejected",
  !ManualNewsPayloadSchema.safeParse({ ...validNews, title: "   " }).success
);
assert(
  "manual_news: an unknown item_type is rejected",
  !ManualNewsPayloadSchema.safeParse({ ...validNews, item_type: "official_link" }).success
);

/* ---- ingest body (discriminated union, operator kinds only) ------------- */
assert(
  "ingest: {kind:'manual_news', payload} parses",
  IngestBodySchema.safeParse({ kind: "manual_news", payload: validNews }).success
);
assert(
  "ingest: {kind:'unclear_statement', payload} parses",
  IngestBodySchema.safeParse({
    kind: "unclear_statement",
    payload: { text: "This position statement is ambiguous." },
  }).success
);
assert(
  "ingest: an agent-only kind (gated_diff) is NOT operator-submittable",
  !IngestBodySchema.safeParse({
    kind: "gated_diff",
    payload: {
      table: "race",
      pk: "r1",
      field: "office",
      new: "Mayor",
      source_url: "https://example.gov/x",
      seen_at: "2026-07-01",
    },
  }).success
);
assert(
  "ingest: an unknown kind is rejected",
  !IngestBodySchema.safeParse({ kind: "nonsense", payload: {} }).success
);
assert(
  "ingest: unclear_statement with empty text is rejected",
  !IngestBodySchema.safeParse({
    kind: "unclear_statement",
    payload: { text: "" },
  }).success
);

/* ---- decision body ------------------------------------------------------ */
assert(
  "decision: {action:'approve'} parses",
  DecisionBodySchema.safeParse({ action: "approve" }).success
);
assert(
  "decision: {action:'reject', note} parses",
  DecisionBodySchema.safeParse({ action: "reject", note: "duplicate" }).success
);
assert(
  "decision: an unknown action is rejected",
  !DecisionBodySchema.safeParse({ action: "delete" }).success
);

/* ---- full review-item content union (all six kinds) --------------------- */
assert(
  "review content: a gated_diff row parses",
  ReviewItemContentSchema.safeParse({
    kind: "gated_diff",
    payload: {
      table: "race",
      pk: "race-1",
      field: "key_dates",
      old: { primary: "2026-08-18" },
      new: { primary: "2026-08-20" },
      source_url: "https://example.gov/calendar",
      seen_at: "2026-07-02T12:00:00Z",
    },
  }).success
);
assert(
  "review content: a date_mismatch row parses",
  ReviewItemContentSchema.safeParse({
    kind: "date_mismatch",
    payload: {
      race_id: "race-1",
      field: "key_dates",
      db_value: "2026-08-18",
      official_value: "2026-08-20",
      source_url: "https://example.gov/calendar",
    },
  }).success
);
assert(
  "review content: an unknown kind is rejected by the union",
  !ReviewItemContentSchema.safeParse({ kind: "made_up", payload: {} }).success
);

if (failures) {
  console.error(`\n${failures} admin-types self-test check(s) failed`);
  process.exit(1);
}
console.log("\nAll admin-types self-test checks passed.");
process.exit(0);
