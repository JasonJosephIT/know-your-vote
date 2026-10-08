/* Self-test for the ops-plane zod contracts in src/types/admin.ts (roadmap
   TASK-A08 "self-test asserts per repo pattern"). Pure, in-memory, no network —
   real evidence the schemas accept what they should and reject what they must,
   so the API handlers can trust `.parse()` at the edge.

   Run: node scripts/verify-admin-types.ts
   (Node >= 23 strips types natively; the relative import carries an explicit
   .ts extension, same as verify-news-neutrality.ts.) */

import {
  CandidateLeadPayloadSchema,
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
  /* Required on a candidate-scoped payload since 2026-09-19. Without a tier,
     CandidateNews renders `relation !== "related"` under "In the news", so an
     ambiguous surname match would read as a story that named the candidate —
     PRD §6's tier exists to prevent exactly that. */
  relation: "named",
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
    relation: undefined,
    metro: "miami",
  }).success
);

/* ---- the relation tier (migration 0017, PRD §6) ------------------------- */
assert(
  "manual_news: a candidate-scoped payload with no relation is REJECTED",
  !ManualNewsPayloadSchema.safeParse({ ...validNews, relation: undefined }).success
);
assert(
  "manual_news: relation 'related' is accepted",
  ManualNewsPayloadSchema.safeParse({ ...validNews, relation: "related" }).success
);
assert(
  "manual_news: an invented relation tier is rejected",
  !ManualNewsPayloadSchema.safeParse({ ...validNews, relation: "probably" }).success
);
/* A metro-scoped election_news row is not a candidate match, so null is the
   correct value there and must stay allowed — null is not a third tier. */
assert(
  "manual_news: a metro-scoped row may omit relation",
  ManualNewsPayloadSchema.safeParse({
    item_type: "election_news",
    title: "Early voting sites announced",
    url: "https://example.gov/early",
    metro: "miami",
    published_at: "2026-07-01",
  }).success
);
/* The card fields carried through the approval boundary. */
assert(
  "manual_news: image_url and source_id are accepted",
  ManualNewsPayloadSchema.safeParse({
    ...validNews,
    image_url: "https://cdn.example.com/photo.jpg",
    source_id: "src-wlrn",
  }).success
);
assert(
  "manual_news: a non-http image_url is rejected",
  !ManualNewsPayloadSchema.safeParse({
    ...validNews,
    image_url: "javascript:alert(1)",
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

/* ---- candidate_lead (R5, spec 2026-10-07) ------------------------------ */
const lead = {
  name: "Elizabeth Holmes",
  office: "Florida House, District 94",
  jurisdiction: "District 94",
  kind: "other_county",
  county_fips: "12099",
  evidence: "State House Candidate Elizabeth Holmes",
  stories: [{ url: "https://floridianpress.com/x", title: "Holmes canvass", outlet: "The Floridian", published_at: "2026-10-04T00:00:00Z" }],
  verification: { status: "found", url: "https://dos.elections.myflorida.com/candidates/", note: null },
  dedupe_key: "elizabeth holmes|other_county|12099",
};
assert("candidate_lead: a valid lead parses", CandidateLeadPayloadSchema.safeParse(lead).success);
assert("candidate_lead: the union accepts the kind",
  ReviewItemContentSchema.safeParse({ kind: "candidate_lead", payload: lead }).success);
assert("candidate_lead: other_county needs a county",
  !CandidateLeadPayloadSchema.safeParse({ ...lead, county_fips: null }).success);
assert("candidate_lead: a running mate carries no county",
  !CandidateLeadPayloadSchema.safeParse({ ...lead, kind: "running_mate" }).success);
assert("candidate_lead: found or not_found needs the URL that was read",
  !CandidateLeadPayloadSchema.safeParse({ ...lead, verification: { status: "found", url: null, note: null } }).success);
assert("candidate_lead: unchecked may have no URL",
  CandidateLeadPayloadSchema.safeParse({ ...lead, verification: { status: "unchecked", url: null, note: "official list unreachable" } }).success);
assert("candidate_lead: a lead needs at least one story",
  !CandidateLeadPayloadSchema.safeParse({ ...lead, stories: [] }).success);
assert("candidate_lead: a non-Florida county code is refused",
  !CandidateLeadPayloadSchema.safeParse({ ...lead, county_fips: "13121" }).success);

if (failures) {
  console.error(`\n${failures} admin-types self-test check(s) failed`);
  process.exit(1);
}
console.log("\nAll admin-types self-test checks passed.");
process.exit(0);
