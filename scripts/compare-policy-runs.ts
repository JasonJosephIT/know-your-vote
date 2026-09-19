/* Compare two policy runs.

   Reads two run files written by scripts/candidate-policy-noul.ts --json and
   reports what moved. Everything decidable lives in src/lib/policy-run.ts and
   is verified offline by scripts/verify-policy-run.ts.

     node scripts/compare-policy-runs.ts <a.json> <b.json> \
       [--tolerance 0.05] [--all] [--json out.json]

   It answers the comparability question FIRST. Two runs are comparable on
   their numbers only when the schema, the provenance (model + taxonomy
   version + question wording) and the threshold all match; otherwise the
   corpus diff still stands and the scores do not, and the report says so at
   the top rather than printing numbers that mean different things.

   Corpus changes and verdict changes are reported separately and never
   merged: a campaign editing its issues page and a model changing its mind
   produce the same shaped diff and are opposite findings.

   Pure except for reading two files and printing. No network, no key. */

import { readFileSync, writeFileSync } from "node:fs";
import {
  POLICY_RUN_SCHEMA,
  SCORE_TOLERANCE,
  compareRuns,
  scoresComparable,
  type PolicyRun,
} from "../src/lib/policy-run.ts";

const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith("--") && !isFlagValue(a));

function isFlagValue(arg: string): boolean {
  const i = args.indexOf(arg);
  return i > 0 && args[i - 1].startsWith("--");
}
function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

if (files.length !== 2) {
  console.error(
    "usage: node scripts/compare-policy-runs.ts <a.json> <b.json> [--tolerance 0.05] [--json out.json]",
  );
  process.exit(2);
}

const toleranceRaw = flag("tolerance");
const tolerance = toleranceRaw === undefined ? SCORE_TOLERANCE : Number(toleranceRaw);
if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1) {
  console.error("--tolerance must be a number between 0 and 1");
  process.exit(2);
}

function load(path: string): PolicyRun {
  try {
    const run = JSON.parse(readFileSync(path, "utf8")) as PolicyRun;
    if (!Array.isArray(run.passages)) {
      throw new Error("no passages array — is this a run file?");
    }
    if (run.schema !== POLICY_RUN_SCHEMA) {
      /* Not fatal: the comparison reports the schema mismatch rather than
         pretending the files are the same shape. */
      console.error(`  note: ${path} is schema ${run.schema ?? "(none)"}, this tool writes ${POLICY_RUN_SCHEMA}`);
    }
    return run;
  } catch (e) {
    console.error(`could not read ${path}: ${(e as Error).message}`);
    process.exit(2);
  }
}

const [a, b] = [load(files[0]), load(files[1])];
const result = compareRuns(a, b, tolerance);
const { comparability: c, corpus, verdicts } = result;

const label = (run: PolicyRun, path: string) =>
  `${path}  [${run.status}, ${run.counts.passages} passage(s), ${run.provenance}, threshold ${run.threshold}]`;

console.log(`A  ${label(a, files[0])}`);
console.log(`B  ${label(b, files[1])}\n`);

/* ---- comparability, first and loudly ---------------------------------- */
if (scoresComparable(c)) {
  console.log("Comparable: same schema, same provenance, same threshold.\n");
} else {
  console.log("NOT COMPARABLE ON SCORES:");
  if (!c.schema) console.log(`  schema differs: ${a.schema} vs ${b.schema}`);
  if (!c.model) console.log(`  model differs: ${a.model} vs ${b.model}`);
  if (!c.taxonomy_version)
    console.log(`  taxonomy differs: v${a.taxonomy_version} vs v${b.taxonomy_version}`);
  if (!c.questions) console.log("  question wording differs (provenance hash)");
  if (!c.threshold)
    console.log(`  threshold differs: ${a.threshold} vs ${b.threshold} — the same scores would tag differently`);
  console.log("  The corpus diff below still stands. The verdict diff does not.\n");
}

/* ---- corpus ----------------------------------------------------------- */
const quote = (t: string) => (t.length <= 100 ? t : `${t.slice(0, 97)}…`);

/* Print at most CAP lines per section and count the rest. The full list is
   always in --json; this is about a report a person can read: a threshold
   change moves dozens of passages the same way, and thirty identical lines
   hide the one that is different. */
const CAP = args.includes("--all") ? Number.POSITIVE_INFINITY : 15;
function printCapped<T>(rows: readonly T[], line: (row: T) => string): void {
  for (const row of rows.slice(0, CAP)) console.log(line(row));
  if (rows.length > CAP) {
    console.log(`      …  and ${rows.length - CAP} more (--all to print, --json for the full list)`);
  }
}

console.log(
  `Corpus: ${corpus.shared.length} shared, ${corpus.edited.length} edited, ` +
    `${corpus.onlyA.length} only in A, ${corpus.onlyB.length} only in B`,
);
printCapped(
  corpus.edited,
  (e) =>
    `  EDITED  ${e.url}${e.heading ? `  — ${e.heading}` : ""}\n` +
    `      A: "${quote(e.a.text)}"\n` +
    `      B: "${quote(e.b.text)}"`,
);
printCapped(corpus.onlyA, (p) => `  GONE    ${p.url}  "${quote(p.text)}"`);
printCapped(corpus.onlyB, (p) => `  NEW     ${p.url}  "${quote(p.text)}"`);

/* ---- verdicts ---------------------------------------------------------- */
console.log("");
if (verdicts === null) {
  console.log(
    "Verdicts: nothing to compare — at least one side has no answers for the shared passages.\n" +
      "  A manifest (status not_run) records what WOULD be asked; it carries no verdicts by design.",
  );
} else {
  console.log(
    `Verdicts: ${verdicts.compared} passage(s) answered on both sides ` +
      `(${verdicts.unanswered.a} unanswered in A, ${verdicts.unanswered.b} in B)`,
  );
  if (!scoresComparable(c)) console.log("  (reported for reference only — see above)");
  if (verdicts.gateFlips.length > 0) console.log(`  gate flips: ${verdicts.gateFlips.length}`);
  printCapped(
    verdicts.gateFlips,
    (f) => `  GATE    ${f.from ? "policy -> not a policy" : "not a policy -> policy"}  ${f.url}`,
  );
  if (verdicts.issuesAdded.length > 0) console.log(`  issues gained: ${verdicts.issuesAdded.length}`);
  printCapped(verdicts.issuesAdded, (i) => `  +ISSUE  ${i.issues.join(",")}  ${i.url}`);
  if (verdicts.issuesRemoved.length > 0) console.log(`  issues lost: ${verdicts.issuesRemoved.length}`);
  printCapped(verdicts.issuesRemoved, (i) => `  -ISSUE  ${i.issues.join(",")}  ${i.url}`);
  if (verdicts.scoreMoves.length > 0) console.log(`  score moves past ${tolerance}: ${verdicts.scoreMoves.length}`);
  printCapped(
    verdicts.scoreMoves,
    (m) =>
      `  SCORE   ${m.issue}  ${m.from.toFixed(2)} -> ${m.to.toFixed(2)}  (${
        m.to > m.from ? "+" : ""
      }${(m.to - m.from).toFixed(2)})  ${m.id}`,
  );
  const still =
    verdicts.gateFlips.length +
    verdicts.issuesAdded.length +
    verdicts.issuesRemoved.length +
    verdicts.scoreMoves.length;
  if (still === 0) console.log(`  No change at tolerance ${tolerance}.`);
}

const jsonOut = flag("json");
if (jsonOut) {
  writeFileSync(jsonOut, `${JSON.stringify({ a: files[0], b: files[1], tolerance, ...result }, null, 2)}\n`);
  console.error(`comparison -> ${jsonOut}`);
}
