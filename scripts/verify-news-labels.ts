/* Guardrail for news-fairness.md §1 (article labelling). Pins the three rules a
   future edit could silently break, because breaking any of them is a
   neutrality regression the UI would not visibly complain about:

     1. Lean is disclosed, never judged, and 'N/A' is not a lean.
     2. An item with no source gets NO labels — an unattributed item must never
        render as though it were attributed.
     3. A CARD never carries a lean, and the OUTLET page always can. §1 as
        amended 2026-09-19 moved lean off the card because 31 of 37 outlets are
        unrated, so a per-card chip would have read as an absence on most cards
        and a finding on a few. Opinion stays marked on the card, because that
        failure runs the other way.
     4. 'unrated' and 'N/A' do not collapse into each other. 'N/A' prints
        nothing; 'unrated' prints, because a missing rating is a disclosable
        fact and a blank invites the reader to assume one. Collapsing them
        either way is the regression this rule exists to catch.

   Pure and offline: no DB, no network, no browser. Same idiom as
   verify-quiz-guardrails.ts (Node >= 22 strips types natively).

   Run: node scripts/verify-news-labels.ts */

import {
  newsCardLabels,
  newsLabels,
  type LeanTag,
  type SourceType,
} from "../src/lib/news-labels.ts";

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

/* ── Rule 3 — the card contract ──────────────────────────────────────────
   The strongest guarantee here is structural: `NewsCardLabels` has no `lean`
   field, so a card component cannot print one and TypeScript refuses the
   attempt at build time. This asserts the runtime half — that nothing
   lean-shaped leaks through another key, whatever the outlet's rating. */
const everyLean: LeanTag[] = [
  "left", "center-left", "center", "center-right", "right", "N/A", "unrated",
];
const LEAN_WORDS = ["Left", "Right", "Center", "No independent rating", "unrated"];
for (const lean of everyLean) {
  const card = newsCardLabels(src("factual_reporting", lean));
  check(`card for lean ${lean} exposes no lean key`,
    !Object.keys(card).includes("lean"), Object.keys(card).join(","));
  /* Reporting is unmarked: the flag is null, so there is no string on an
     ordinary card that could carry a lean word in the first place. */
  check(`card for lean ${lean} leaves reporting unflagged`, card.flag === null,
    String(card.flag));
  const printed = JSON.stringify(card);
  for (const w of LEAN_WORDS) {
    check(`card for lean ${lean} does not print "${w}"`, !printed.includes(w), printed);
  }
  /* And the outlet surface still discloses it — moving lean must not have
     silently dropped it from the product. */
  const outlet = newsLabels(src("factual_reporting", lean));
  if (lean !== "N/A") {
    check(`outlet page still discloses lean ${lean}`,
      typeof outlet.lean === "string" && outlet.lean.length > 0, String(outlet.lean));
  }
}

/* Opinion is still marked on the card, and still drives the distinct
   container — §1's "a voter reading a columnist's argument as established
   fact because both arrived in the same grey rectangle". */
const opinionCard = newsCardLabels(src("opinion", "unrated"));
check("card marks opinion in words", opinionCard.flag === "Opinion", String(opinionCard.flag));
check("card flags opinion for the container", opinionCard.isOpinion === true);

/* Provenance that is not journalism is still named, for the same reason. */
check("card names a primary document",
  newsCardLabels(src("primary_doc", "N/A")).flag === "Official document");
check("card names candidate-supplied material",
  newsCardLabels(src("candidate_self", "N/A")).flag === "From the candidate");
check("candidate-supplied material is not an opinion container",
  newsCardLabels(src("candidate_self", "N/A")).isOpinion === false);

/* Rule 2 holds on the card surface too: no source, no labels. */
for (const missing of [null, undefined]) {
  const card = newsCardLabels(missing);
  check("card with no source yields no labels",
    card.publisher === null && card.flag === null && !card.isOpinion,
    JSON.stringify(card));
}

if (failures > 0) {
  console.error(`\nverify-news-labels: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-news-labels: OK — card carries no lean, outlet page discloses it, opinion stays marked, unattributed items stay unlabelled",
);
