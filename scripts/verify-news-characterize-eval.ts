/* Guardrail for the gold-set scorer —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §6,
   plan task C14.

   An evaluation script is the last place a bug gets noticed, because its
   output is a number nobody can check by eye. The properties below are the
   ones that would make the model look better than it is:

     - A zero denominator is n/a, never 0% and never 100%. An issue the model
       never predicted has no precision to report.
     - True negatives are never counted. With 26 questions and ~2 tags per
       article, accuracy would read ~96% for a scorer that predicted nothing.
     - A gold label outside the taxonomy is an error, not a false positive
       charged to the model for a tag the labeller meant to award it.
     - A missing `issues` key is not an empty label set: "unlabelled" and
       "labelled as having no issues" are different claims.
     - A duplicated gold id is an error, because it would weight one article's
       labels above every other article's.
     - parentOnlyCatches counts only the case its comment claims: the category
       was right AND no sub-issue of it fired.

   THE TAXONOMY HERE IS A FIXTURE, like verify-news-characterize.ts's — the
   scorer takes ids as parameters and must not care which list wins.

   Pure and offline. Run: node scripts/verify-news-characterize-eval.ts */

import {
  costPerArticle,
  parentOnlyCatches,
  parseGoldSet,
  score,
  tally,
  wordingSuspects,
  type GoldRow,
} from "../src/lib/news-characterize-eval.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* Fixture taxonomy: two parents, three children, one parent childless — so
   the parent-only measure is exercised against a category that cannot
   possibly have a sub-issue fire. */
const CATEGORIES = [
  { id: "housing", label: "Housing", aliases: ["rent"] },
  { id: "water", label: "Water", aliases: ["springs"] },
  { id: "lonely", label: "Lonely", aliases: ["nothing"] },
];
const SUB_ISSUES = [
  { id: "H1", categoryId: "housing", label: "Rent", aliases: ["rent"] },
  { id: "H2", categoryId: "housing", label: "Supply", aliases: ["supply"] },
  { id: "W1", categoryId: "water", label: "Springs", aliases: ["springs"] },
];
const IDS = {
  askable: [...CATEGORIES.map((c) => c.id), ...SUB_ISSUES.map((s) => s.id)],
  categories: CATEGORIES.map((c) => c.id),
  subIssues: SUB_ISSUES.map((s) => s.id),
};

/* ---- score() ------------------------------------------------------------ */

const s1 = score({ tp: 3, fp: 1, fn: 1 });
check("precision is tp/(tp+fp)", s1.precision === 0.75, String(s1.precision));
check("recall is tp/(tp+fn)", s1.recall === 0.75, String(s1.recall));
check("f1 is the harmonic mean", s1.f1 === 0.75, String(s1.f1));

/* The load-bearing one. */
check("no predictions means precision is null, not zero",
  score({ tp: 0, fp: 0, fn: 4 }).precision === null);
check("no gold labels means recall is null, not zero",
  score({ tp: 0, fp: 4, fn: 0 }).recall === null);
check("nothing at all is null throughout",
  score({ tp: 0, fp: 0, fn: 0 }).f1 === null);
/* ...but a real zero must survive as a zero. */
check("predicting only wrongly is 0% precision, not null",
  score({ tp: 0, fp: 5, fn: 1 }).precision === 0);
check("missing everything is 0% recall, not null",
  score({ tp: 0, fp: 1, fn: 5 }).recall === 0);

/* ---- parseGoldSet() ----------------------------------------------------- */

const good = [
  JSON.stringify({ id: "a", title: "T", summary: "d", url: "u", issues: ["housing", "H1"], sitemapOnly: false }),
  JSON.stringify({ id: "b", title: "T", summary: null, url: "u", issues: [], sitemapOnly: true }),
  "",
  "   ",
].join("\n");
const parsedGood = parseGoldSet(good, IDS.askable);
check("a clean gold set parses", parsedGood.errors.length === 0, parsedGood.errors.join("; "));
check("blank lines are skipped, not errors", parsedGood.rows.length === 2);
check("an explicit empty label set survives", parsedGood.rows[1].issues.length === 0);
check("a null dek reads as null", parsedGood.rows[1].summary === null);

const bad = (obj: unknown) => parseGoldSet(JSON.stringify(obj), IDS.askable);
check("an id outside the taxonomy is an error",
  bad({ id: "a", title: "T", url: "u", issues: ["not-an-issue"], sitemapOnly: false })
    .errors.some((e) => e.includes("outside the taxonomy")));
check("a missing issues key is an error, not an empty set",
  bad({ id: "a", title: "T", url: "u", sitemapOnly: false })
    .errors.some((e) => e.includes("no issues array")));
check("a repeated tag is an error",
  bad({ id: "a", title: "T", url: "u", issues: ["H1", "H1"], sitemapOnly: false })
    .errors.some((e) => e.includes("repeats")));
check("a missing sitemapOnly is an error",
  bad({ id: "a", title: "T", url: "u", issues: [] })
    .errors.some((e) => e.includes("sitemapOnly")));
check("a missing title is an error",
  bad({ id: "a", url: "u", issues: [], sitemapOnly: false })
    .errors.some((e) => e.includes("no title")));
check("malformed JSON is an error, not a crash",
  parseGoldSet("{not json", IDS.askable).errors.length === 1);
const dup = parseGoldSet(
  [JSON.stringify({ id: "a", title: "T", url: "u", issues: [], sitemapOnly: false }),
   JSON.stringify({ id: "a", title: "T", url: "u", issues: [], sitemapOnly: false })].join("\n"),
  IDS.askable,
);
check("a duplicate id is an error", dup.errors.some((e) => e.includes("duplicate")));
check("a duplicate id is not also counted as a row", dup.rows.length === 1);
/* Every bad line is named in one pass rather than one per run. */
const manyBad = parseGoldSet(
  [JSON.stringify({ id: "a", title: "T", url: "u", issues: ["nope"], sitemapOnly: false }),
   JSON.stringify({ id: "b", title: "T", url: "u", issues: ["also-nope"], sitemapOnly: false })].join("\n"),
  IDS.askable,
);
check("every bad line is reported at once", manyBad.errors.length === 2);

/* ---- tally() ------------------------------------------------------------ */

const ROWS: GoldRow[] = [
  /* withDek, parent + child both correct */
  { id: "r1", title: "T", summary: "d", url: "u", issues: ["housing", "H1"], sitemapOnly: false },
  /* noDek, parent correct and NO child in gold or prediction → parent-only */
  { id: "r2", title: "T", summary: null, url: "u", issues: ["water"], sitemapOnly: true },
  /* withDek, gold says nothing; model predicts one → pure false positive */
  { id: "r3", title: "T", summary: "d", url: "u", issues: [], sitemapOnly: false },
  /* withDek, gold has one; model predicts nothing → pure false negative */
  { id: "r4", title: "T", summary: "d", url: "u", issues: ["H2"], sitemapOnly: false },
];
const PRED = new Map<string, readonly string[]>([
  ["r1", ["housing", "H1"]],
  ["r2", ["water"]],
  ["r3", ["H1"]],
  ["r4", []],
]);

const t = tally(ROWS, PRED, IDS);
check("tp counts only agreed ids", t.overall.tp === 3, JSON.stringify(t.overall));
check("fp counts predictions the gold set rejects", t.overall.fp === 1, JSON.stringify(t.overall));
check("fn counts gold labels the model missed", t.overall.fn === 1, JSON.stringify(t.overall));
/* The rule that keeps the numbers honest: 4 rows x 6 ids = 24 cells, and only
   5 of them are counted. A scorer that counted true negatives would report 19
   more. */
check("true negatives are not counted",
  t.overall.tp + t.overall.fp + t.overall.fn === 5,
  `counted ${t.overall.tp + t.overall.fp + t.overall.fn} of 24 cells`);

check("the no-dek slice holds only no-dek rows", t.noDek.tp === 1 && t.noDek.fp === 0 && t.noDek.fn === 0,
  JSON.stringify(t.noDek));
check("the dek slice holds the rest", t.withDek.tp === 2 && t.withDek.fp === 1 && t.withDek.fn === 1,
  JSON.stringify(t.withDek));
check("the two dek slices partition the whole",
  t.noDek.tp + t.withDek.tp === t.overall.tp &&
  t.noDek.fp + t.withDek.fp === t.overall.fp &&
  t.noDek.fn + t.withDek.fn === t.overall.fn);
check("category and sub-issue slices partition the whole",
  t.categories.tp + t.subIssues.tp === t.overall.tp &&
  t.categories.fp + t.subIssues.fp === t.overall.fp &&
  t.categories.fn + t.subIssues.fn === t.overall.fn);
check("per-issue counts sum to the whole",
  Object.values(t.perIssue).reduce((n, c) => n + c.tp, 0) === t.overall.tp &&
  Object.values(t.perIssue).reduce((n, c) => n + c.fp, 0) === t.overall.fp &&
  Object.values(t.perIssue).reduce((n, c) => n + c.fn, 0) === t.overall.fn);
check("every askable id gets a bucket even at zero",
  IDS.askable.every((id) => t.perIssue[id] !== undefined));
check("a row the model tagged with nothing is counted", t.emptyPredictions === 1);
check("a row the labeller tagged with nothing is counted", t.emptyGold === 1);
check("row count is reported", t.rows === 4);
/* A row absent from the prediction map is "predicted nothing", never skipped —
   otherwise a failed article would quietly leave the denominator. */
const missing = tally(ROWS, new Map(), IDS);
check("a row with no prediction still counts its gold labels as misses",
  missing.overall.fn === 4 && missing.overall.tp === 0,
  JSON.stringify(missing.overall));

/* ---- parentOnlyCatches() ------------------------------------------------ */

const parents = parentOnlyCatches(ROWS, PRED, CATEGORIES, SUB_ISSUES);
check("a parent that fired alone and was right is counted", parents.water === 1);
check("a parent that fired alongside its child is not counted", parents.housing === 0);
check("a childless parent that never fired is zero, not undefined", parents.lonely === 0);
/* Right for the wrong reason must not count: the parent fired alone but the
   gold set says it does not apply. */
const wrongParent = parentOnlyCatches(
  [{ id: "x", title: "T", url: "u", issues: [], sitemapOnly: false }],
  new Map([["x", ["water"]]]),
  CATEGORIES,
  SUB_ISSUES,
);
check("a parent that fired alone and was wrong is not counted", wrongParent.water === 0);

/* ---- costPerArticle() -------------------------------------------------- */

const cost = costPerArticle([{ input_tokens: 1000 }, { input_tokens: 3000 }], 42);
check("cost sums the input tokens the vendor reported", cost?.inputTokens === 4000);
/* 4,000 input tokens at $42 per million input tokens = $0.168. */
check("cost is priced off measured tokens", cost !== null && Math.abs(cost.usd - 0.168) < 1e-9,
  String(cost?.usd));
check("cost reports how many articles it measured", cost?.articles === 2);
/* Spec §6 item 5 wants cost MEASURED. A run where the vendor reported nothing
   must say so rather than return a confident zero. */
check("no reported usage means null, not zero", costPerArticle([{}, {}], 42) === null);
check("partial usage measures only what was reported",
  costPerArticle([{ input_tokens: 500 }, {}], 42)?.articles === 1);

/* ---- wordingSuspects() ------------------------------------------------- */

const LABELS = [...CATEGORIES, ...SUB_ISSUES];
const suspects = wordingSuspects(
  {
    housing: { tp: 1, fp: 9, fn: 0 },   // precision 10% over 10 obs — suspect
    water: { tp: 9, fp: 0, fn: 1 },     // 90%/90% — fine
    lonely: { tp: 0, fp: 0, fn: 0 },    // nothing measured — silent
    H1: { tp: 1, fp: 0, fn: 9 },        // recall 10% over 10 obs — suspect
    H2: { tp: 0, fp: 2, fn: 0 },        // 0% precision on 2 obs — below the floor
    W1: { tp: 0, fp: 0, fn: 0 },
  },
  LABELS,
);
const ids = suspects.map((s) => s.id).sort();
check("poor precision is flagged", ids.includes("housing"));
check("poor recall is flagged", ids.includes("H1"));
check("good numbers are not flagged", !ids.includes("water"));
/* The important silence: an issue with no gold labels and no predictions is
   unmeasured, not failing. Flagging it would send a labeller to rewrite a
   question on no evidence. */
check("an unmeasured issue is not flagged", !ids.includes("lonely"), ids.join(","));
/* And the same for barely-measured: 0% precision on two observations is noise,
   not a mis-worded question. Rewriting a taxonomy entry on a sample of two is
   the mistake this floor exists to prevent. */
check("a thinly-measured issue is not flagged", !ids.includes("H2"), ids.join(","));
check("the evidence floor is adjustable",
  wordingSuspects({ H2: { tp: 0, fp: 2, fn: 0 } }, LABELS, 0.5, 2).some((s) => s.id === "H2"));

if (failures > 0) {
  console.error(`\nverify-news-characterize-eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-news-characterize-eval: OK — n/a not zero, no true negatives, " +
    "gold errors surface, parent-only credit is earned",
);
