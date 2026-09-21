/* Guardrail for the run file and its comparison — src/lib/policy-run.ts.

   What would fail quietly here:

     - Two runs reported as agreeing when they asked different questions. That
       is the one thing a comparison must never do: it turns "we changed the
       wording" into "the model is stable".
     - A failed request written as "no policy". A passage nobody got an answer
       for and a passage answered "states nothing" are opposite facts, and one
       null in the wrong place merges them.
     - A corpus edit reported as a model change. A campaign rewriting its
       housing paragraph and Jev changing its mind about the same paragraph
       produce the same shaped diff and mean opposite things.
     - Unstable serialization: two identical runs diffing as different because
       score keys came back in a different order.

   Pure and offline. Run: node scripts/verify-policy-run.ts */

import {
  POLICY_RUN_SCHEMA,
  SCORE_TOLERANCE,
  buildRun,
  compareRuns,
  scoresComparable,
  type PolicyRun,
} from "../src/lib/policy-run.ts";
import type { Passage } from "../src/lib/candidate-site.ts";
import type { PolicyCitation } from "../src/lib/policy-noul.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const p = (id: string, text: string, url = "https://e.com/issues", heading: string | null = "Housing"): Passage =>
  ({ id, url, heading, text });

const cite = (
  passage: Passage,
  statesPolicy: boolean,
  issues: string[],
  scores: Record<string, number>,
): PolicyCitation => ({
  passage,
  verdict: { statesPolicy, commitment: statesPolicy ? 0.95 : 0.1, issueIds: issues, scores },
});

const base = {
  createdAt: "2026-09-19T00:00:00.000Z",
  model: "jev-1.13.0",
  taxonomyVersion: "2",
  threshold: 0.85,
  provenance: "jev:jev-1.13.0/tax-2/q-abcd1234",
  questionIds: ["q_states_policy", "A1", "A2"],
};

const p1 = p("aaa", "Cap insurance rate increases at five percent.");
const p2 = p("bbb", "Build more homes near transit.");
const p3 = p("ccc", "I was born in Tampa.");

const run = buildRun({
  ...base,
  passages: [p1, p2, p3],
  answered: [
    cite(p1, true, ["A1"], { A2: 0.2, A1: 0.97 }),
    cite(p3, false, [], { A1: 0.3 }),
  ],
  status: "partial",
  failed: 1,
});

/* ---- the file says what happened, including what did not --------------- */
check("the schema is stamped", run.schema === POLICY_RUN_SCHEMA);
check("every passage READ is in the file", run.passages.length === 3);
check("a passage nobody answered has a null verdict, not a false one",
  run.passages.find((r) => r.id === "bbb")?.verdict === null);
check("a passage answered 'no policy' is NOT null",
  run.passages.find((r) => r.id === "ccc")?.verdict?.states_policy === false);
check("counts report asked, gated and issue-bearing separately",
  run.counts.passages === 3 &&
    run.counts.asked === 2 &&
    run.counts.states_policy === 1 &&
    run.counts.with_issue === 1 &&
    run.counts.failed === 1,
  JSON.stringify(run.counts));
check("the site is recorded from the corpus", run.site === "https://e.com");
check("findings are grouped in the file",
  run.areas.length === 1 && run.areas[0].area.id === "insurance");
check("a manifest carries the corpus and no verdicts",
  (() => {
    const m = buildRun({ ...base, passages: [p1, p2], answered: [], status: "not_run" });
    return (
      m.status === "not_run" &&
      m.passages.length === 2 &&
      m.passages.every((r) => r.verdict === null) &&
      m.areas.length === 0 &&
      m.counts.asked === 0
    );
  })());

/* ---- serialization is stable ------------------------------------------ */
check("score keys are written sorted, so two identical runs diff as identical",
  JSON.stringify(run.passages[0].verdict?.scores) === '{"A1":0.97,"A2":0.2}',
  JSON.stringify(run.passages[0].verdict?.scores));
const twice = [
  buildRun({ ...base, passages: [p1], answered: [cite(p1, true, ["A1"], { A1: 0.9 })], status: "complete" }),
  buildRun({ ...base, passages: [p1], answered: [cite(p1, true, ["A1"], { A1: 0.9 })], status: "complete" }),
];
check("the same inputs serialize identically",
  JSON.stringify(twice[0]) === JSON.stringify(twice[1]));

/* ---- comparability is answered before any number is shown -------------- */
const runA = buildRun({
  ...base,
  passages: [p1, p2],
  answered: [cite(p1, true, ["A1"], { A1: 0.97 }), cite(p2, true, ["A2"], { A2: 0.9 })],
  status: "complete",
});

const sameProvenance = compareRuns(runA, runA);
check("a run compared to itself is comparable", scoresComparable(sameProvenance.comparability));
check("a run compared to itself shows no change",
  sameProvenance.verdicts !== null &&
    sameProvenance.verdicts.gateFlips.length === 0 &&
    sameProvenance.verdicts.issuesAdded.length === 0 &&
    sameProvenance.verdicts.scoreMoves.length === 0);

const otherTaxonomy = compareRuns(
  runA,
  buildRun({ ...base, provenance: "jev:jev-1.13.0/tax-3/q-abcd1234", taxonomyVersion: "3", passages: [p1, p2], answered: [], status: "not_run" }),
);
check("a different taxonomy version is not comparable on scores",
  !scoresComparable(otherTaxonomy.comparability) &&
    !otherTaxonomy.comparability.taxonomy_version);

const otherQuestions = compareRuns(
  runA,
  buildRun({ ...base, provenance: "jev:jev-1.13.0/tax-2/q-99999999", passages: [p1], answered: [], status: "not_run" }),
);
check("different question wording is caught by the provenance hash",
  !otherQuestions.comparability.questions);

const otherThreshold = compareRuns(
  runA,
  buildRun({ ...base, threshold: 0.7, passages: [p1], answered: [], status: "not_run" }),
);
check("a different threshold is not comparable, even at the same provenance",
  otherThreshold.comparability.provenance && !scoresComparable(otherThreshold.comparability));

/* ---- corpus change vs model change ------------------------------------ */
const edited = p("ddd", "Cap insurance rate increases at THREE percent.");
const corpusDiff = compareRuns(
  runA,
  buildRun({
    ...base,
    passages: [edited, p2],
    answered: [cite(edited, true, ["A1"], { A1: 0.97 }), cite(p2, true, ["A2"], { A2: 0.9 })],
    status: "complete",
  }),
);
check("edited text is reported as an edit, not as a removal plus an addition",
  corpusDiff.corpus.edited.length === 1 &&
    corpusDiff.corpus.onlyA.length === 0 &&
    corpusDiff.corpus.onlyB.length === 0,
  JSON.stringify({
    edited: corpusDiff.corpus.edited.length,
    onlyA: corpusDiff.corpus.onlyA.length,
    onlyB: corpusDiff.corpus.onlyB.length,
  }));
check("an edited passage is never compared as a verdict change",
  corpusDiff.verdicts !== null && corpusDiff.verdicts.compared === 1,
  String(corpusDiff.verdicts?.compared));

const removedPage = compareRuns(
  runA,
  buildRun({ ...base, passages: [p1], answered: [cite(p1, true, ["A1"], { A1: 0.97 })], status: "complete" }),
);
check("a passage the site dropped is reported as gone",
  removedPage.corpus.onlyA.length === 1 && removedPage.corpus.onlyA[0].id === "bbb");

/* Two blocks under one heading must not pair as an edit of each other. */
const twoNew = compareRuns(
  buildRun({ ...base, passages: [p1], answered: [], status: "not_run" }),
  buildRun({
    ...base,
    passages: [p("e1", "First new block under the same heading."), p("e2", "Second new block under the same heading.")],
    answered: [],
    status: "not_run",
  }),
);
check("one edit pairing per slot, never one-to-many",
  twoNew.corpus.edited.length === 1 && twoNew.corpus.onlyB.length === 1,
  JSON.stringify({ edited: twoNew.corpus.edited.length, onlyB: twoNew.corpus.onlyB.length }));

/* ---- verdict changes --------------------------------------------------- */
const moved = compareRuns(
  runA,
  buildRun({
    ...base,
    passages: [p1, p2],
    answered: [
      cite(p1, false, [], { A1: 0.5 }),
      cite(p2, true, ["A1", "A2"], { A2: 0.91, A1: 0.88 }),
    ],
    status: "complete",
  }),
);
check("a gate flip is reported with its direction",
  moved.verdicts?.gateFlips.length === 1 &&
    moved.verdicts.gateFlips[0].from === true &&
    moved.verdicts.gateFlips[0].to === false);
check("an issue gained is reported",
  moved.verdicts?.issuesAdded.length === 1 &&
    moved.verdicts.issuesAdded[0].issues.join(",") === "A1");
check("an issue lost is reported",
  moved.verdicts?.issuesRemoved.length === 1 &&
    moved.verdicts.issuesRemoved[0].issues.join(",") === "A1");
check("a score move past the tolerance is reported",
  moved.verdicts?.scoreMoves.some((m) => m.issue === "A1" && m.from === 0.97 && m.to === 0.5) === true);
check("a score move inside the tolerance is not noise in the report",
  compareRuns(
    runA,
    buildRun({
      ...base,
      passages: [p1, p2],
      answered: [cite(p1, true, ["A1"], { A1: 0.95 }), cite(p2, true, ["A2"], { A2: 0.9 })],
      status: "complete",
    }),
  ).verdicts?.scoreMoves.length === 0);
check("the tolerance is a parameter, and the default is sane",
  SCORE_TOLERANCE > 0 && SCORE_TOLERANCE < 0.5);

/* ---- a manifest on either side means there is nothing to compare ------- */
const vsManifest = compareRuns(
  runA,
  buildRun({ ...base, passages: [p1, p2], answered: [], status: "not_run" }),
);
check("a manifest yields no verdict comparison, rather than 'no differences'",
  vsManifest.verdicts === null);
check("a manifest still yields a corpus comparison",
  vsManifest.corpus.shared.length === 2);

/* ---- a garbled file is reported, never guessed at ---------------------- */
const empty = compareRuns(
  { schema: "", status: "not_run", site: null, created_at: "", model: "", taxonomy_version: "", threshold: 0, provenance: "", question_ids: [], counts: { passages: 0, asked: 0, states_policy: 0, with_issue: 0, failed: 0 }, passages: [], areas: [], usage: null } as PolicyRun,
  runA,
);
check("an empty run compares without throwing, and is not comparable",
  !scoresComparable(empty.comparability) && empty.verdicts === null);

if (failures > 0) {
  console.error(`\nverify-policy-run: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-policy-run: OK — comparability answered first, corpus and verdict changes kept apart, " +
    "unanswered is not 'no policy'",
);
