/* Self-test for the fixed effects map in src/lib/admin/effects.ts (roadmap
   TASK-A11). This is the security boundary — a payload must never be able to
   name an arbitrary table/field — so it gets real, in-memory evidence: the
   whitelist accepts exactly the four gated columns and refuses everything else.
   Pure, no network. effects.ts has only a type-only import, so it runs under
   Node's type-stripping.

   Run: node scripts/verify-admin-effects.ts */

import { GATED_FIELDS, planEffect } from "../src/lib/admin/effects.ts";

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* ---- manual_news → insert_news ------------------------------------------ */
const news = planEffect({
  kind: "manual_news",
  payload: {
    item_type: "candidate_news",
    title: "Board certifies results",
    summary: "Details.",
    url: "https://example.gov/x",
    metro: null,
    race_id: "race-1",
    candidate_id: "cand-1",
    published_at: "2026-07-01",
    relation: "related",
    image_url: "https://cdn.example.com/p.jpg",
    source_id: "src-1",
  },
});
assert("manual_news → insert_news", news.type === "insert_news");
assert(
  "manual_news row carries item_type + url + scope, no verified_by column",
  news.type === "insert_news" &&
    news.row.item_type === "candidate_news" &&
    news.row.url === "https://example.gov/x" &&
    news.row.candidate_id === "cand-1" &&
    !("verified_by" in news.row),
  JSON.stringify(news)
);

/* ---- the relation tier survives the boundary (migration 0017, PRD §6) ----
   This plan used to drop `relation`, which was a correctness bug rather than an
   omission: CandidateNews renders `relation !== "related"` under "In the news",
   so an approved row arriving with null presented an ambiguous surname match as
   a story that named the candidate. These pin that it now passes through
   untouched, in both directions and with no default. */
assert(
  "insert_news carries relation 'related' through unchanged",
  news.type === "insert_news" && news.row.relation === "related",
  JSON.stringify(news),
);
const namedPlan = planEffect({
  kind: "manual_news",
  payload: {
    item_type: "candidate_news",
    title: "Smith wins",
    summary: null,
    url: "https://example.gov/y",
    metro: null,
    race_id: "race-1",
    candidate_id: "cand-1",
    published_at: "2026-07-01",
    relation: "named",
  },
});
assert(
  "insert_news carries relation 'named' through unchanged",
  namedPlan.type === "insert_news" && namedPlan.row.relation === "named",
  JSON.stringify(namedPlan),
);
/* A metro-scoped election_news row is not a candidate match, so null is right
   there — and it must stay null rather than being defaulted to a tier. A
   default of "named" would be the original bug; "related" would demote a real
   name match. */
const metroPlan = planEffect({
  kind: "manual_news",
  payload: {
    item_type: "election_news",
    title: "Early voting sites announced",
    summary: null,
    url: "https://example.gov/early",
    metro: "miami",
    race_id: null,
    candidate_id: null,
    published_at: "2026-07-01",
  },
});
assert(
  "insert_news leaves relation null when there is no candidate match",
  metroPlan.type === "insert_news" && metroPlan.row.relation === null,
  JSON.stringify(metroPlan),
);
assert(
  "insert_news never defaults a missing relation to a tier",
  metroPlan.type === "insert_news"
    && metroPlan.row.relation !== "named"
    && metroPlan.row.relation !== "related",
);

/* The two card fields, and 0014's required source. */
assert(
  "insert_news carries image_url and source_id",
  news.type === "insert_news"
    && news.row.image_url === "https://cdn.example.com/p.jpg"
    && news.row.source_id === "src-1",
  JSON.stringify(news),
);
assert(
  "insert_news leaves image_url and source_id null when absent",
  metroPlan.type === "insert_news"
    && metroPlan.row.image_url === null
    && metroPlan.row.source_id === null,
  JSON.stringify(metroPlan),
);

/* ---- gated_diff whitelist ----------------------------------------------- */
function gatedDiff(table: string, field: string, newValue: unknown) {
  return planEffect({
    kind: "gated_diff",
    payload: {
      table,
      pk: "race-1",
      field,
      old: "old",
      new: newValue,
      source_url: "https://example.gov/x",
      seen_at: "2026-07-01T00:00:00Z",
    },
  });
}

const office = gatedDiff("race", "office", "Sheriff");
assert(
  "gated_diff race.office → update_field to the new value",
  office.type === "update_field" &&
    office.table === "race" &&
    office.pkColumn === "race_id" &&
    office.field === "office" &&
    office.value === "Sheriff",
  JSON.stringify(office)
);
assert(
  "gated_diff race.key_dates → update_field",
  gatedDiff("race", "key_dates", { primary: "2026-08-20" }).type === "update_field"
);
assert(
  "gated_diff race.district → update_field",
  gatedDiff("race", "district", "12").type === "update_field"
);
assert(
  "gated_diff candidate.qualifying_status → update_field (candidate_id pk)",
  (() => {
    const p = planEffect({
      kind: "gated_diff",
      payload: {
        table: "candidate",
        pk: "cand-1",
        field: "qualifying_status",
        new: "withdrawn",
        source_url: "https://example.gov/x",
        seen_at: "2026-07-01T00:00:00Z",
      },
    });
    return (
      p.type === "update_field" &&
      p.table === "candidate" &&
      p.pkColumn === "candidate_id"
    );
  })()
);
assert(
  "gated_diff race.candidate_ids (NOT whitelisted) → refuse",
  gatedDiff("race", "candidate_ids", ["x"]).type === "refuse"
);
assert(
  "gated_diff race.incumbent_id (NOT whitelisted) → refuse",
  gatedDiff("race", "incumbent_id", "x").type === "refuse"
);
assert(
  "gated_diff candidate.legal_name (NOT whitelisted) → refuse",
  planEffect({
    kind: "gated_diff",
    payload: {
      table: "candidate",
      pk: "cand-1",
      field: "legal_name",
      new: "Someone Else",
      source_url: "https://example.gov/x",
      seen_at: "2026-07-01T00:00:00Z",
    },
  }).type === "refuse"
);
assert(
  "gated_diff on a non-gated table (news_item) → refuse",
  gatedDiff("news_item", "title", "x").type === "refuse"
);
assert(
  "gated_diff on voting_info_subscription (personal data) → refuse",
  gatedDiff("voting_info_subscription", "email", "x").type === "refuse"
);

/* ---- date_mismatch ------------------------------------------------------ */
function dateMismatch(field: string) {
  return planEffect({
    kind: "date_mismatch",
    payload: {
      race_id: "race-1",
      field,
      db_value: "2026-08-18",
      official_value: "2026-08-20",
      source_url: "https://example.gov/x",
    },
  });
}
assert(
  "date_mismatch key_dates → update_field with the official value",
  (() => {
    const p = dateMismatch("key_dates");
    return (
      p.type === "update_field" &&
      p.table === "race" &&
      p.field === "key_dates" &&
      p.value === "2026-08-20"
    );
  })()
);
assert(
  "date_mismatch on a non-whitelisted field → refuse",
  dateMismatch("qualifying_status").type === "refuse"
);

/* ---- disposition kinds (no content write) ------------------------------- */
for (const kind of ["fact_flag", "unclear_statement", "unverified_fact"]) {
  assert(
    `${kind} → record_disposition (no content write)`,
    planEffect({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kind: kind as any,
      payload: { text: "something", context: null, candidate_id: null, race_id: null, source_url: null },
    }).type === "record_disposition"
  );
}

/* ---- whitelist shape ---------------------------------------------------- */
assert(
  "whitelist: race has exactly key_dates/office/district",
  GATED_FIELDS.race.fields.size === 3 &&
    GATED_FIELDS.race.fields.has("key_dates") &&
    GATED_FIELDS.race.fields.has("office") &&
    GATED_FIELDS.race.fields.has("district")
);
assert(
  "whitelist: candidate has exactly qualifying_status",
  GATED_FIELDS.candidate.fields.size === 1 &&
    GATED_FIELDS.candidate.fields.has("qualifying_status")
);

if (failures) {
  console.error(`\n${failures} admin-effects self-test check(s) failed`);
  process.exit(1);
}
console.log("\nAll admin-effects self-test checks passed.");
process.exit(0);
