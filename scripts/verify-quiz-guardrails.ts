/* Guardrail checks (TASK-034): whatever the model returns — rankings,
   omissions, fabricated issues, endorsement language — the normalized output
   covers the full field, in the given order, with neutral wording.
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
    alignmentNote: "Your top match — you should vote for this candidate!",
    alignedIssues: ["Economy & Affordability", "Fabricated Issue"],
  },
  {
    candidateRef: 2,
    alignmentNote: "Stated positions on economy relate to your answer about everyday costs.",
    alignedIssues: ["Economy & Affordability"],
  },
];

const out = normalizeQuizResults(candidates, hostile, ["Economy & Affordability"]);

assert("full field returned (3 of 3)", out.length === 3);
assert(
  "order preserved (ballot order, not alignment order)",
  out.map((o) => o.candidateId).join(",") === "demo-cand-a,demo-cand-b,demo-cand-c"
);
assert(
  "endorsement language stripped",
  !/vote for|top match/i.test(out[0].alignmentNote),
  out[0].alignmentNote
);
assert("clean note passes through", out[1].alignmentNote.includes("everyday costs"));
assert(
  "omitted candidate gets an honest fallback note",
  out[2].alignmentNote.length > 0 && /brief/i.test(out[2].alignmentNote)
);
assert(
  "fabricated issues filtered",
  !out[0].alignedIssues.includes("Fabricated Issue"),
  JSON.stringify(out[0].alignedIssues)
);

if (failures) {
  console.error(`\n${failures} guardrail check(s) failed`);
  process.exit(1);
}
console.log("\nAll quiz guardrail checks passed.");
