/* Evaluation against the hand-labelled gold set —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §6.

   The measure is a labelled gold set, NOT agreement between two models: two
   models agreeing does not make either right.

   ONE model call per article, reused across every threshold — the answers do
   not depend on the threshold, so sweeping it must not re-bill the run.

   Reports per-issue precision and recall, the empty case separately (an
   article that should get NO tags is the most common case in a real feed, and
   the one that quietly ruins a product if it fails), and no-dek rows
   separately because that is the input floor from spec §4.2.

   Run: node scripts/news-characterize-eval.ts <goldset.jsonl> [--json out.json] */

import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvLocal } from "./env-local.ts";
import { applyThreshold, buildQuestions, buildState, provenance } from "../src/lib/news-characterize.ts";
import { jevEngine } from "../src/lib/news-characterize-engines.ts";
import { ASKABLE, ASKABLE_IDS, SUB_ISSUE_IDS, TAXONOMY_VERSION } from "../src/lib/news-issues.ts";

loadEnvLocal(import.meta.url);

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith("--"));
if (!path) {
  console.error("usage: node scripts/news-characterize-eval.ts <goldset.jsonl> [--json out.json]");
  process.exit(2);
}
const jsonOut = args.indexOf("--json") !== -1 ? args[args.indexOf("--json") + 1] : null;

interface GoldRow {
  title: string; summary: string | null; url: string;
  outlet?: string; issues: string[]; sitemapOnly: boolean;
}

const gold: GoldRow[] = readFileSync(path, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
for (const r of gold) {
  const unknown = r.issues.filter((i) => !SUB_ISSUE_IDS.includes(i));
  if (unknown.length) { console.error(`gold row has ids outside the taxonomy: ${unknown.join(",")}`); process.exit(2); }
}

let engine;
try { engine = jevEngine(); } catch (e) { console.error((e as Error).message); process.exit(2); }
const questions = buildQuestions(ASKABLE);
console.error(`${gold.length} rows · ${ASKABLE.length} questions each · ${provenance(engine.modelId, questions, TAXONOMY_VERSION)}`);

const answersFor: Record<string, unknown>[] = [];
let tokens = 0, errors = 0;
for (const [i, row] of gold.entries()) {
  try {
    const { answers, usage } = await engine.characterize(buildState(row), questions);
    answersFor.push(answers);
    if (usage?.input_tokens) tokens += usage.input_tokens;
  } catch (e) {
    errors++; answersFor.push({});
    console.error(`  ERROR row ${i}: ${(e as Error).message.slice(0, 60)}`);
  }
  if ((i + 1) % 25 === 0) console.error(`  ${i + 1}/${gold.length}`);
}

const pct = (n: number, d: number) => (d === 0 ? "  n/a" : `${((n / d) * 100).toFixed(0).padStart(3)}%`);
const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95];
const report: Record<string, unknown> = { rows: gold.length, tokens, errors, thresholds: {} };

console.log(`\n${"thresh".padEnd(7)}${"precision".padStart(10)}${"recall".padStart(8)}${"F1".padStart(7)}` +
  `${"exact".padStart(8)}${"empty-ok".padStart(10)}${"no-dek rec".padStart(12)}`);
console.log("-".repeat(62));

for (const t of THRESHOLDS) {
  let tp = 0, fp = 0, fn = 0, exact = 0, emptyOk = 0, emptyTotal = 0, dekTp = 0, dekFn = 0;
  for (const [i, row] of gold.entries()) {
    const pred = new Set(applyThreshold(answersFor[i], t, ASKABLE_IDS));
    const want = new Set(row.issues);
    for (const id of SUB_ISSUE_IDS) {
      const p = pred.has(id), w = want.has(id);
      if (p && w) { tp++; if (row.sitemapOnly) dekTp++; }
      else if (p && !w) fp++;
      else if (!p && w) { fn++; if (row.sitemapOnly) dekFn++; }
    }
    if (pred.size === want.size && [...want].every((x) => pred.has(x))) exact++;
    if (want.size === 0) { emptyTotal++; if (pred.size === 0) emptyOk++; }
  }
  const p = tp / (tp + fp || 1), r = tp / (tp + fn || 1);
  const f1 = p + r === 0 ? 0 : (2 * p * r) / (p + r);
  console.log(
    `${t.toFixed(2).padEnd(7)}${pct(tp, tp + fp)}${pct(tp, tp + fn).padStart(8)}` +
    `${(f1 * 100).toFixed(0).padStart(6)}%${pct(exact, gold.length).padStart(8)}` +
    `${pct(emptyOk, emptyTotal).padStart(10)}${pct(dekTp, dekTp + dekFn).padStart(12)}`,
  );
  (report.thresholds as Record<string, unknown>)[String(t)] = { tp, fp, fn, exact, emptyOk, emptyTotal };
}

/* Per-issue at the configured default, so a taxonomy problem is visible as a
   taxonomy problem rather than averaged away. */
const T = 0.85;
console.log(`\nper-issue at ${T}  (gold=0 means the 14-day window carried no such story)`);
console.log(`${"issue".padEnd(6)}${"gold".padStart(6)}${"pred".padStart(6)}${"tp".padStart(5)}${"fp".padStart(5)}${"fn".padStart(5)}${"precision".padStart(11)}${"recall".padStart(8)}`);
console.log("-".repeat(52));
const perIssue: Record<string, unknown> = {};
for (const id of SUB_ISSUE_IDS) {
  let tp = 0, fp = 0, fn = 0, goldN = 0, predN = 0;
  for (const [i, row] of gold.entries()) {
    const p = applyThreshold(answersFor[i], T, ASKABLE_IDS).includes(id);
    const w = row.issues.includes(id);
    if (w) goldN++; if (p) predN++;
    if (p && w) tp++; else if (p) fp++; else if (w) fn++;
  }
  perIssue[id] = { goldN, predN, tp, fp, fn };
  console.log(`${id.padEnd(6)}${String(goldN).padStart(6)}${String(predN).padStart(6)}${String(tp).padStart(5)}${String(fp).padStart(5)}${String(fn).padStart(5)}${pct(tp, tp + fp).padStart(11)}${pct(tp, tp + fn).padStart(8)}`);
}
report.perIssue = perIssue;

console.error(`\n${tokens} input tokens · $${((tokens / 1_000_000) * 0.042).toFixed(4)} · ${errors} errors`);
if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(report, null, 2)); console.error(`wrote ${jsonOut}`); }
