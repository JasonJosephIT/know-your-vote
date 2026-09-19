/* Guardrail for the policy Noul core — src/lib/policy-noul.ts.

   What would fail quietly here:

     - Identity in the state. The moment a candidate's name, party or host is
       something WE supply, the neutrality claim this pipeline makes is false,
       and nothing in the output would show it.
     - An asymmetric question. One issue asked more persuasively than another
       tilts every candidate's result toward that issue, invisibly.
     - The gate colliding with a taxonomy id, which would turn "is this a
       policy at all" into an issue tag on every passage.
     - A malformed answer coerced instead of dropped: a string "0.9" read as
       0.9 is a number we were never given.
     - Citations ordered by anything but score, which would rank a candidate's
       issues by how often their web copy repeats itself.

   Pure and offline: no network, no key. Run: node scripts/verify-policy-noul.ts */

import {
  COMMITMENT_ID,
  DEFAULT_POLICY_THRESHOLD,
  buildPassageState,
  buildPolicyQuestions,
  groupByArea,
  noulValue,
  readVerdict,
  slugOf,
  unmatched,
  type PolicyCitation,
} from "../src/lib/policy-noul.ts";
import { ASKABLE, ASKABLE_IDS, CATEGORY_IDS, SUB_ISSUES } from "../src/lib/news-issues.ts";
import { findBannedTermMatch } from "../src/lib/neutrality.ts";
import type { Passage } from "../src/lib/candidate-site.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const passage = (over: Partial<Passage> = {}): Passage => ({
  id: "abcd1234",
  url: "https://jane-for-florida.example.com/issues/housing?utm=1",
  heading: "Housing",
  text: "I will cap property insurance rate increases at five percent a year.",
  ...over,
});

/* ---- the state: three fields, and no identity we supplied ------------- */
const state = buildPassageState(passage());
check("the state has exactly heading, text and slug",
  JSON.stringify(Object.keys(state).sort()) === '["heading","slug","text"]',
  Object.keys(state).join(","));
check("the state carries the path and never the host",
  state.slug === "/issues/housing",
  String(state.slug));
const serialized = JSON.stringify(state);
check("no host reaches the model",
  !serialized.includes("jane-for-florida") && !serialized.includes(".com"),
  serialized);
check("the text is verbatim", state.text === passage().text);
check("an empty heading becomes null, not an empty string",
  buildPassageState(passage({ heading: "   " })).heading === null);
check("slugOf never throws on a bad url", slugOf("not a url") === null);
check("a root url has no slug", slugOf("https://e.com/") === null);

/* ---- questions -------------------------------------------------------- */
const questions = buildPolicyQuestions(ASKABLE);
check("the gate is asked", questions[COMMITMENT_ID] !== undefined);
check("the gate id cannot be a taxonomy id",
  !ASKABLE_IDS.includes(COMMITMENT_ID) && !CATEGORY_IDS.includes(COMMITMENT_ID));
check("every issue is asked exactly once",
  ASKABLE_IDS.every((id) => questions[id] !== undefined) &&
    Object.keys(questions).length === ASKABLE.length + 1);
check("every question is a noul, so no free text can come back",
  Object.values(questions).every((q) => q.type === "noul"));
for (const [name, q] of Object.entries(questions)) {
  const text = `${q.instructions} ${q.criteria.true} ${q.criteria.false}`;
  const hit = findBannedTermMatch(text);
  check(`question wording is neutral: ${name}`, hit === null, hit?.term);
}

/* Symmetry: strip each issue's own words and every issue question must be
   character-identical. An issue asked in different words is an issue asked
   with a different prior. */
const skeletons = new Set<string>();
for (const issue of ASKABLE) {
  const q = questions[issue.id];
  /* The alias LIST is replaced as one unit, not alias by alias: issues have
     different numbers of aliases, and stripping them individually would leave
     a different run of separators behind and fail on a difference that is not
     a difference in wording. */
  skeletons.add(
    `${q.instructions}|${q.criteria.true}|${q.criteria.false}`
      .replaceAll(issue.aliases.join(", "), "<A>")
      .replaceAll(issue.label, "<L>"),
  );
}
check("every issue is asked in identical words", skeletons.size === 1,
  `${skeletons.size} distinct shapes`);

/* ---- reading answers: fail closed ------------------------------------- */
const answers = {
  [COMMITMENT_ID]: { type: "noul", noul: 0.97 },
  A1: { type: "noul", noul: 0.95 },
  A2: { type: "noul", noul: 0.4 },
  A3: { type: "noul", noul: "0.99" },
  A4: { type: "noul", noul: Number.NaN },
  A5: { type: "noul", noul: 1.4 },
  A6: null,
  B1: { type: "noul" },
  not_an_issue: { type: "noul", noul: 1 },
};
check("a well-formed number is read", noulValue(answers, "A1") === 0.95);
check("a numeric STRING is not a number", noulValue(answers, "A3") === null);
check("NaN is refused", noulValue(answers, "A4") === null);
check("a value outside [0,1] is refused", noulValue(answers, "A5") === null);
check("a null answer is refused", noulValue(answers, "A6") === null);
check("a missing noul field is refused", noulValue(answers, "B1") === null);
check("a missing key is refused", noulValue(answers, "nope") === null);

const verdict = readVerdict(answers, 0.85, ASKABLE_IDS);
check("the gate decides statesPolicy", verdict.statesPolicy && verdict.commitment === 0.97);
check("only issues over the threshold are tagged",
  verdict.issueIds.join(",") === "A1", verdict.issueIds.join(","));
check("an answer we never asked for has nowhere to go",
  !verdict.issueIds.includes("not_an_issue") &&
    verdict.scores.not_an_issue === undefined);
check("malformed scores are absent, not zero",
  verdict.scores.A3 === undefined && verdict.scores.A4 === undefined);

const gated = readVerdict(
  { ...answers, [COMMITMENT_ID]: { type: "noul", noul: 0.5 } },
  0.85,
  ASKABLE_IDS,
);
check("below the gate, the passage states no policy", !gated.statesPolicy);
check("a missing gate answer means no policy, never a default yes",
  !readVerdict({ A1: { type: "noul", noul: 0.99 } }, 0.85, ASKABLE_IDS).statesPolicy);

/* ---- rolling up ------------------------------------------------------- */
const p1 = passage({ id: "1", text: "First: cap insurance rate increases." });
const p2 = passage({ id: "2", text: "Second: build more homes." });
const p3 = passage({ id: "3", text: "I was born in Tampa." });
const cites: PolicyCitation[] = [
  { passage: p1, verdict: { statesPolicy: true, commitment: 0.9, issueIds: ["A1"], scores: { A1: 0.9 } } },
  { passage: p2, verdict: { statesPolicy: true, commitment: 0.9, issueIds: ["A1", "A2"], scores: { A1: 0.99, A2: 0.95 } } },
  { passage: p3, verdict: { statesPolicy: false, commitment: 0.1, issueIds: ["A1"], scores: { A1: 0.9 } } },
  { passage: p2, verdict: { statesPolicy: true, commitment: 0.9, issueIds: [], scores: {} } },
];
const areas = groupByArea(cites);
check("areas come back in taxonomy order",
  areas.map((a) => a.area.id).join(",") === "housing,insurance",
  areas.map((a) => a.area.id).join(","));
const insurance = areas.find((a) => a.area.id === "insurance");
check("a passage that failed the gate is never cited",
  !insurance?.subIssues[0].citations.some((c) => c.passage.id === "3"));
check("citations are ordered by score, strongest first",
  insurance?.subIssues[0].citations.map((c) => c.score).join(",") === "0.99,0.9",
  insurance?.subIssues[0].citations.map((c) => c.score).join(","));
check("an issue with no citation is absent, not empty",
  areas.every((a) => a.subIssues.every((s) => s.citations.length > 0)));

const rest = unmatched(cites);
check("a passage that states no policy is reported, not dropped",
  rest.noPolicy.length === 1 && rest.noPolicy[0].passage.id === "3");
check("a policy with no issue question is reported",
  rest.noIssue.length === 1);

check("no citation text was altered anywhere in the roll-up",
  insurance?.subIssues[0].citations.every(
    (c) => c.passage.text === (c.passage.id === "1" ? p1.text : p2.text),
  ) === true);

/* ---- the threshold is a knob, and says so ----------------------------- */
check("the default threshold is in range",
  DEFAULT_POLICY_THRESHOLD > 0 && DEFAULT_POLICY_THRESHOLD < 1);
check("the taxonomy has issues to ask about", SUB_ISSUES.length > 0);

if (failures > 0) {
  console.error(`\nverify-policy-noul: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-policy-noul: OK — no identity in the state, ${ASKABLE.length} issues asked identically, ` +
    "answers fail closed, citations verbatim",
);
