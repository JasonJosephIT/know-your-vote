/* Guardrail checks (TASK-034, extended by TASK-065): whatever the model
   returns — rankings, omissions, fabricated issues, endorsement language,
   or match-shaped language — the normalized output covers the full field, in
   the given order, with neutral wording.

   The TASK-065 addition is the comparative filter. Endorsement language
   names a winner; comparative language measures a candidate against the
   voter. Neither is acceptable, and in a two-way general the second is the
   more likely failure — "aligns with your answers" ranks two candidates
   without ever using a superlative.

   Run: node scripts/verify-quiz-guardrails.ts */

import { normalizeQuizResults } from "../src/lib/quiz-guardrails.ts";

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const candidates = [
  {
    candidateId: "demo-cand-a",
    legalName: "Alpha One",
    party: "REP",
    raceId: "r1",
    office: "Governor",
    positions: [{ issue: "Economy & Affordability", stance: "stated", says: [] }],
  },
  {
    candidateId: "demo-cand-b",
    legalName: "Beta Two",
    party: "DEM",
    raceId: "r1",
    office: "Governor",
    positions: [{ issue: "Economy & Affordability", stance: "stated", says: [] }],
  },
  {
    candidateId: "demo-cand-c",
    legalName: "Gamma Three",
    party: "NPA",
    raceId: "r1",
    office: "Governor",
    positions: [{ issue: "Education", stance: "stated", says: [] }],
  },
];

/* A deliberately hostile model output: ranks, endorses, omits candidate 3,
   and invents an issue. */
const hostile = [
  {
    candidateRef: 1,
    stanceSummary: "Your top match — you should vote for this candidate!",
    issuesCovered: ["Economy & Affordability", "Fabricated Issue"],
  },
  {
    candidateRef: 2,
    stanceSummary: "Has stated that everyday costs should fall for working families.",
    issuesCovered: ["Economy & Affordability"],
  },
];

const out = normalizeQuizResults(candidates, hostile, ["Economy & Affordability"]);

assert("full field returned (3 of 3)", out.length === 3);
assert(
  "order preserved (ballot order, never a ranking)",
  out.map((o) => o.candidateId).join(",") === "demo-cand-a,demo-cand-b,demo-cand-c"
);
assert(
  "endorsement language stripped",
  !/vote for|top match/i.test(out[0].stanceSummary),
  out[0].stanceSummary
);
assert("clean note passes through", out[1].stanceSummary.includes("everyday costs"));
assert(
  "omitted candidate gets an honest fallback note",
  out[2].stanceSummary.length > 0 && /brief/i.test(out[2].stanceSummary)
);
assert(
  "fabricated issues filtered",
  !out[0].issuesCovered.includes("Fabricated Issue"),
  JSON.stringify(out[0].issuesCovered)
);

/* TASK-065: match-shaped language. None of these endorse, rank, or use a
   superlative — each would have passed the endorsement filter alone, and
   each still tells the voter who fits them better. */
const comparative = [
  "Aligns with your answers on the economy.",
  "Their stated positions line up with your view on housing.",
  "Agrees with you on education funding.",
  "Closest to your stated priorities on transit.",
  "Differs from your answer on the economy.",
  "Shares your emphasis on affordability.",
];
for (const note of comparative) {
  const res = normalizeQuizResults(
    [candidates[0]],
    [{ candidateRef: 1, stanceSummary: note, issuesCovered: [] }],
    ["Economy & Affordability"]
  );
  assert(
    `comparative note replaced: "${note.slice(0, 34)}…"`,
    res[0].stanceSummary !== note && /brief/i.test(res[0].stanceSummary),
    res[0].stanceSummary
  );
}

/* The filter must not eat legitimate descriptions of a stated position. */
const legitimate = [
  "Has stated that property taxes should be capped for homesteads.",
  "Says the state should expand vocational training; no stated position on transit.",
  "Has not stated a position on any of the issues you picked.",
  "Supports a higher rainy-day fund cap, citing hurricane recovery costs.",
];
for (const note of legitimate) {
  const res = normalizeQuizResults(
    [candidates[0]],
    [{ candidateRef: 1, stanceSummary: note, issuesCovered: [] }],
    ["Economy & Affordability"]
  );
  assert(
    `neutral stated-position note survives: "${note.slice(0, 34)}…"`,
    res[0].stanceSummary === note,
    res[0].stanceSummary
  );
}

if (failures) {
  console.error(`\n${failures} guardrail check(s) failed`);
  process.exit(1);
}
console.log("\nAll quiz guardrail checks passed.");
