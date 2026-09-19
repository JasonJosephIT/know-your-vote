/* Guardrail for news-fairness.md §1 (article labelling). Pins the three rules a
   future edit could silently break, because breaking any of them is a
   neutrality regression the UI would not visibly complain about:

     1. Lean is disclosed, never judged, and 'N/A' is not a lean.
     2. An item with no source gets NO labels — an unattributed item must never
        render as though it were attributed.
     3. 'unrated' and 'N/A' do not collapse into each other. 'N/A' prints
        nothing; 'unrated' prints, because a missing rating is a disclosable
        fact and a blank invites the reader to assume one. Collapsing them
        either way is the regression this rule exists to catch.

   Pure and offline: no DB, no network, no browser. Same idiom as
   verify-quiz-guardrails.ts (Node >= 22 strips types natively).

   Run: node scripts/verify-news-labels.ts */

import { newsLabels, type LeanTag, type SourceType } from "../src/lib/news-labels.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const src = (type: SourceType, lean: LeanTag) => ({ publisher: "Example Press", type, lean_tag: lean });

// Rule 2 — no source, no labels.
for (const missing of [null, undefined]) {
  const l = newsLabels(missing);
  check("no source yields no labels", l.kind === null && l.lean === null && !l.isOpinion,
    JSON.stringify(l));
}

// Rule 1 — 'N/A' prints nothing rather than the literal string.
const primary = newsLabels(src("primary_doc", "N/A"));
check("N/A lean is not printed", primary.lean === null, `got ${primary.lean}`);
check("primary_doc still labelled", primary.kind === "Official document");

/* Rule 3 — 'unrated' is the recorded absence of a rating, and it prints.
   Asserted against the literal string, not just "non-empty": the wording is
   voter-facing and the word "independent" is what stops it reading as CAP
   having declined to rate the outlet. */
const unrated = newsLabels(src("factual_reporting", "unrated"));
check("unrated lean IS printed", unrated.lean === "No independent rating",
  `got ${JSON.stringify(unrated.lean)}`);
check("unrated is not the raw code", unrated.lean !== "unrated");
check("unrated does not print like N/A", unrated.lean !== primary.lean);
check("unrated is still labelled Reporting", unrated.kind === "Reporting");
check("unrated does not flip the opinion container", unrated.isOpinion === false);

/* And it must not read as a position on the spectrum. A label containing
   "Left"/"Right"/"Center" would put a lean on a card that has none. */
for (const word of ["Left", "Right", "Center"]) {
  check(`unrated label avoids "${word}"`, !unrated.lean!.includes(word),
    `got ${unrated.lean}`);
}

// Every real lean produces a non-empty label, and none leaks the raw code.
const leans: LeanTag[] = ["left", "center-left", "center", "center-right", "right"];
for (const lean of leans) {
  const l = newsLabels(src("factual_reporting", lean));
  check(`lean ${lean} labelled`, typeof l.lean === "string" && l.lean.length > 0);
  check(`lean ${lean} is not the raw code`, l.lean !== lean, `got ${l.lean}`);
}

// Opinion drives the distinct container; nothing else does.
const types: SourceType[] = ["factual_reporting", "opinion", "primary_doc", "candidate_self"];
for (const type of types) {
  const l = newsLabels(src(type, "center"));
  check(`${type} isOpinion`, l.isOpinion === (type === "opinion"), `got ${l.isOpinion}`);
  check(`${type} has a kind label`, typeof l.kind === "string" && l.kind.length > 0);
}

// An opinion piece is labelled "Opinion" in words, not only by styling — a
// reader who cannot perceive the container still needs to be told.
check("opinion says Opinion", newsLabels(src("opinion", "right")).kind === "Opinion");

if (failures > 0) {
  console.error(`\nverify-news-labels: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-news-labels: OK — lean disclosure + unattributed-item rules hold");
