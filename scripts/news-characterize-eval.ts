/* Gold-set evaluation —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §6,
   plan task C14.

   The measure is a HAND-LABELLED gold set, not agreement between two models:
   two models agreeing does not make either right. Everything decidable lives
   in src/lib/news-characterize-eval.ts and is verified offline by
   scripts/verify-news-characterize-eval.ts; this script is the part that talks
   to Jev and the filesystem.

   What it reports, per spec §6:
     1. Per-issue precision and recall at each threshold.
     2. The shape of the curve, so the threshold is read off data (item 2).
     4. Tag rate and empty rate, with no-dek rows kept separate (item 4).
     5. MEASURED cost per article, from the vendor's reported usage (item 5).
     7. Issues whose numbers point at a taxonomy or wording problem (item 7).
   Plus the question news-issues.ts asks of itself: do the eleven parent
   questions ever catch an article no sub-issue catches?

   §6 item 3 — issue-tag distribution per candidate over `named` rows — is
   NOT here. It is a query over stored rows (candidate_id + relation), not a
   property of a gold set, and it is unmeasurable until the sweep runs and the
   matcher writes those columns. The report says so rather than this script
   printing a zero that reads like a finding.

   One model call per article, reused across every threshold: the answers do
   not depend on the threshold, so sweeping it must never re-bill a run. With
   --save-answers the raw answers are written out, and --answers replays them,
   so re-reading the report or re-cutting the curve costs nothing. That is the
   same principle as the runner's `issues IS NULL` filter.

   Run: node scripts/news-characterize-eval.ts <goldset.jsonl>
        node scripts/news-characterize-eval.ts <goldset.jsonl> --save-answers a.json
        node scripts/news-characterize-eval.ts <goldset.jsonl> --answers a.json  (no spend) */

import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvLocal } from "./env-local.ts";
import { applyThreshold, buildQuestions, buildState, provenance } from "../src/lib/news-characterize.ts";
import { jevEngine } from "../src/lib/news-characterize-engines.ts";
import {
  ASKABLE,
  ASKABLE_IDS,
  CATEGORIES,
  CATEGORY_IDS,
  SUB_ISSUES,
  SUB_ISSUE_IDS,
  TAXONOMY_VERSION,
} from "../src/lib/news-issues.ts";
import {
  costPerArticle,
  parentOnlyCatches,
  parseGoldSet,
  score,
  tally,
  wordingSuspects,
  type Counts,
  type Scores,
} from "../src/lib/news-characterize-eval.ts";

loadEnvLocal(import.meta.url);

/** Jev input pricing, spec §4.5 / §6 line "$0.042/MTok input; output free".
    A constant and not a computed figure, so a pricing change is a visible
    one-line diff; --price overrides it without editing the file. */
const USD_PER_MILLION_INPUT = 0.042;

const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9];

const args = process.argv.slice(2);
const goldPath = args.find((a) => !a.startsWith("--"));
if (!goldPath) {
  console.error("usage: node scripts/news-characterize-eval.ts <goldset.jsonl> [--answers f] [--save-answers f] [--price N]");
  process.exit(2);
}
function flagValue(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) {
    console.error(`${name} needs a value`);
    process.exit(2);
  }
  return v;
}
const answersIn = flagValue("--answers");
const answersOut = flagValue("--save-answers");
const priceRaw = flagValue("--price");
const price = priceRaw === undefined ? USD_PER_MILLION_INPUT : Number(priceRaw);
if (!Number.isFinite(price) || price < 0) {
  console.error("--price must be a non-negative number (USD per million input tokens)");
  process.exit(2);
}

/* ---- the gold set ------------------------------------------------------- */

let goldText: string;
try {
  goldText = readFileSync(goldPath, "utf8");
} catch (e) {
  console.error(`cannot read ${goldPath}: ${(e as Error).message}`);
  process.exit(2);
}

const { rows, errors } = parseGoldSet(goldText, ASKABLE_IDS);
if (errors.length > 0) {
  /* Every problem at once — a labeller fixing a hand-built file should not
     have to run this once per bad line. */
  console.error(`${goldPath} is not a usable gold set:`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(2);
}
if (rows.length === 0) {
  /* An empty gold set would print a full report of n/a and look like a
     finished evaluation. */
  console.error(`${goldPath} has no rows — refusing to report on nothing`);
  process.exit(2);
}

const questions = buildQuestions(ASKABLE);

/* The engine is built ONCE, and only when we are actually going to call it: a
   replay needs no TYPESAFE_API_KEY, and demanding one would make re-reading a
   report depend on a credential it does not use. When we are calling Jev,
   building it here keeps the key check ahead of the first byte of I/O, as in
   scripts/news-characterize.ts. */
const engine = answersIn ? null : jevEngine();

/* Provenance must describe the run that produced the numbers, not the run that
   is printing them — so on a replay it comes from the saved file. */
const modelId = engine
  ? engine.modelId
  : ((JSON.parse(readFileSync(answersIn!, "utf8")) as { modelId?: string }).modelId ?? "unknown");
const by = provenance(modelId, questions, TAXONOMY_VERSION);

/* ---- answers: one call per article, or a replay -------------------------- */

interface SavedAnswers {
  modelId: string;
  provenance: string;
  answers: Record<string, Record<string, unknown>>;
  usage: Record<string, { input_tokens?: number; output_tokens?: number }>;
}

const answersById = new Map<string, Record<string, unknown>>();
const usages: { input_tokens?: number; output_tokens?: number }[] = [];
let failed = 0;

if (answersIn) {
  const saved = JSON.parse(readFileSync(answersIn, "utf8")) as SavedAnswers;
  if (saved.provenance !== by) {
    /* Replaying answers produced by a different taxonomy or model against
       today's ids would silently mis-score every row. */
    console.error(
      `saved answers were produced as ${saved.provenance}, but this taxonomy and model are ${by}.\n` +
        `Re-run without --answers to re-characterize.`,
    );
    process.exit(2);
  }
  for (const row of rows) {
    const a = saved.answers[row.id];
    if (!a) {
      console.error(`saved answers have nothing for gold row ${row.id}`);
      process.exit(2);
    }
    answersById.set(row.id, a);
    if (saved.usage[row.id]) usages.push(saved.usage[row.id]);
  }
  console.error(`replaying ${rows.length} saved answer set(s) from ${answersIn} — no spend`);
} else {
  console.error(`characterizing ${rows.length} gold row(s) as ${by}`);
  const usageById: Record<string, { input_tokens?: number; output_tokens?: number }> = {};
  for (const row of rows) {
    const state = buildState({ title: row.title, summary: row.summary ?? null, url: row.url });
    try {
      const { answers, usage } = await engine!.characterize(state, questions);
      answersById.set(row.id, answers);
      if (usage) {
        usages.push(usage);
        usageById[row.id] = usage;
      }
    } catch (e) {
      /* A failed article is NOT dropped from the denominator: its gold labels
         still count as misses, so a run that failed half the set cannot read
         as a good one. It is counted and named. */
      failed++;
      console.error(`  ERROR ${row.id}: ${(e as Error).message}`);
    }
  }
  if (answersOut) {
    const payload: SavedAnswers = {
      modelId: engine!.modelId,
      provenance: by,
      answers: Object.fromEntries(answersById),
      usage: usageById,
    };
    writeFileSync(answersOut, JSON.stringify(payload, null, 2));
    console.error(`saved raw answers to ${answersOut}`);
  }
}

if (failed > 0) console.error(`WARNING: ${failed} of ${rows.length} articles failed and count as misses`);

/* ---- the report --------------------------------------------------------- */

const pct = (v: number | null) => (v === null ? "  n/a" : `${(v * 100).toFixed(0).padStart(3)}%`);
const line = (name: string, c: Counts) => {
  const s: Scores = score(c);
  return `${name.padEnd(34)} P ${pct(s.precision)}  R ${pct(s.recall)}  F1 ${pct(s.f1)}   (tp=${c.tp} fp=${c.fp} fn=${c.fn})`;
};

const noDekRows = rows.filter((r) => r.sitemapOnly).length;
console.log(`gold set:      ${goldPath}`);
console.log(`rows:          ${rows.length}  (${noDekRows} with no dek, ${rows.length - noDekRows} with a dek)`);
console.log(`provenance:    ${by}`);
console.log(`questions:     ${ASKABLE.length}  (${CATEGORY_IDS.length} categories + ${SUB_ISSUE_IDS.length} sub-issues)`);

const cost = costPerArticle(usages, price);
if (cost === null) {
  console.log(`cost:          not measured — the vendor reported no usage on any article`);
} else {
  console.log(
    `cost:          $${(cost.usd / cost.articles).toFixed(6)}/article, $${cost.usd.toFixed(5)} for ${cost.articles} article(s) ` +
      `(${Math.round(cost.inputTokens / cost.articles)} input tokens each at $${price}/MTok)`,
  );
}

const IDS = { askable: ASKABLE_IDS, categories: CATEGORY_IDS, subIssues: SUB_ISSUE_IDS };
const predictionsFor = (threshold: number) =>
  new Map(rows.map((r) => [r.id, applyThreshold(answersById.get(r.id) ?? {}, threshold, ASKABLE_IDS)]));

for (const threshold of THRESHOLDS) {
  const predicted = predictionsFor(threshold);
  const t = tally(rows, predicted, IDS);

  console.log(`\n=== threshold ${threshold} ===`);
  console.log(line("overall", t.overall));
  console.log(line("  rows with a dek", t.withDek));
  console.log(line("  rows with NO dek (input floor)", t.noDek));
  console.log(line("  category questions only", t.categories));
  console.log(line("  sub-issue questions only", t.subIssues));
  console.log(
    `tag rate: ${(((t.rows - t.emptyPredictions) / t.rows) * 100).toFixed(0)}% tagged, ` +
      `${((t.emptyPredictions / t.rows) * 100).toFixed(0)}% empty ` +
      `(labeller called ${t.emptyGold} of ${t.rows} row(s) issue-free)`,
  );

  console.log("per issue:");
  for (const issue of ASKABLE) {
    const c = t.perIssue[issue.id];
    if (c.tp + c.fp + c.fn === 0) continue; // nothing measured; listing it would pad the report
    console.log(`  ${line(`${issue.id} ${issue.label}`.slice(0, 32), c)}`);
  }

  const suspects = wordingSuspects(t.perIssue, ASKABLE);
  if (suspects.length > 0) {
    console.log("wording/taxonomy suspects (spec §6 item 7 — not a threshold fix):");
    for (const s of suspects) {
      console.log(`  ${s.id} ${s.label}: P ${pct(s.scores.precision)} R ${pct(s.scores.recall)}`);
    }
  }
}

/* Do the eleven parent questions earn their place? news-issues.ts says to drop
   them if no article is ever caught by a parent alone. Reported at the default
   threshold band, since that is the one the tags would ship at. */
console.log(`\n=== do the parent questions earn their place? ===`);
console.log(`(gold rows where the category was right and none of its sub-issues fired)`);
for (const threshold of THRESHOLDS) {
  const catches = parentOnlyCatches(rows, predictionsFor(threshold), CATEGORIES, SUB_ISSUES);
  const earning = Object.entries(catches).filter(([, n]) => n > 0);
  console.log(
    `  threshold ${threshold}: ${earning.reduce((n, [, v]) => n + v, 0)} parent-only catch(es)` +
      (earning.length > 0 ? ` — ${earning.map(([id, n]) => `${id}×${n}`).join(", ")}` : " — none"),
  );
}

console.log(
  `\n§6 item 3 (issue-tag distribution per candidate over \`named\` rows) is not computable here: ` +
    `it needs stored rows carrying candidate_id and relation, which the sweep and matcher write. ` +
    `Run it after C7-a opens the sweep.`,
);

if (failed > 0) process.exit(1);
