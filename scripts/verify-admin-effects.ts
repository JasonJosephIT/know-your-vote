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
