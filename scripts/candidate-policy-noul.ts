/* Ask Jev what a candidate's own site states they will do.

   Reads the passages produced by scripts/candidate-site-ingest.ts, asks one
   Noul per sub-issue plus a commitment gate over each passage, and prints the
   policies with the passage that states each one.

   Everything decidable lives in src/lib/policy-noul.ts and is verified offline
   by scripts/verify-policy-noul.ts. Run that first; if it fails, this
   script's output is not worth reading.

   THE CITATION IS NOT MODEL OUTPUT. A Noul returns a number, so every quote
   printed here is the passage that was sent, and every link is where it was
   fetched. The model decides relevance. It cannot decide what the candidate
   said, because it has no field to say it in.

   Modes:

     node scripts/candidate-policy-noul.ts --in passages.jsonl --dry-run
       [--json manifest.json]
       Print the exact request that WOULD be sent for each passage: the state,
       the questions, the model, the provenance. No network, no key needed.
       This is how the wording is reviewed before it is billed. With --json it
       also writes a run MANIFEST: the corpus and the questions with every
       verdict null, which is what a later real run is compared against.

     node scripts/candidate-policy-noul.ts --in passages.jsonl [--limit N]
       [--threshold 0.85] [--json report.json]
       Ask, and print the report. One request per passage.

   Fail-closed: a missing key, an unreadable input, or zero passages exits
   non-zero. A silent empty report looks exactly like a candidate who has
   stated no positions, and those are opposite facts. */

import { readFileSync, writeFileSync } from "node:fs";
import { loadEnvLocal } from "./env-local.ts";
import { provenance } from "../src/lib/news-characterize.ts";
import { jevEngine, JEV_MODEL_ID } from "../src/lib/news-characterize-engines.ts";
import { ASKABLE, ASKABLE_IDS, TAXONOMY_VERSION } from "../src/lib/news-issues.ts";
import type { Passage } from "../src/lib/candidate-site.ts";
import {
  DEFAULT_POLICY_THRESHOLD,
  buildPassageState,
  buildPolicyQuestions,
  groupByArea,
  readVerdict,
  unmatched,
  type PolicyCitation,
} from "../src/lib/policy-noul.ts";
import { buildRun } from "../src/lib/policy-run.ts";

/* Before anything reads process.env. */
loadEnvLocal(import.meta.url);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
function numericFlag(name: string, fallback: number): number {
  const raw = flag(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (raw.startsWith("--") || !Number.isFinite(value)) {
    console.error(`--${name} needs a number (got ${raw})`);
    process.exit(2);
  }
  return value;
}

const inPath = flag("in");
const jsonPath = flag("json");
const limit = numericFlag("limit", 200);
const threshold = numericFlag("threshold", DEFAULT_POLICY_THRESHOLD);

if (!inPath) {
  console.error(
    "Usage: node scripts/candidate-policy-noul.ts --in passages.jsonl [--dry-run] [--limit N] [--threshold 0.85] [--json report.json]",
  );
  process.exit(2);
}
if (threshold <= 0 || threshold >= 1) {
  console.error("--threshold must be strictly between 0 and 1");
  process.exit(2);
}
if (ASKABLE.length === 0) {
  console.error("the taxonomy is empty — refusing to run, every passage would come back with nothing");
  process.exit(2);
}

let passages: Passage[];
try {
  passages = readFileSync(inPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Passage)
    .slice(0, limit);
} catch (e) {
  console.error(`could not read ${inPath}: ${(e as Error).message}`);
  process.exit(2);
}
if (passages.length === 0) {
  console.error(`${inPath} holds no passages — nothing to ask about`);
  process.exit(1);
}

const questions = buildPolicyQuestions(ASKABLE);
const by = provenance(JEV_MODEL_ID, questions, TAXONOMY_VERSION);

if (dryRun) {
  /* The whole request, not a summary of it: what is reviewed here is exactly
     what would be billed, and a paraphrase could not be compared to it. */
  console.log(
    JSON.stringify(
      {
        model: JEV_MODEL_ID,
        threshold,
        provenance: by,
        passages: passages.length,
        questions,
        states: passages.map(buildPassageState),
      },
      null,
      2,
    ),
  );
  if (jsonPath) {
    /* The MANIFEST: the corpus and the questions, every verdict null. Worth
       writing even though nothing was asked — "did the other run see the same
       passages and ask the same questions?" is answerable from this alone,
       and it is the first thing to check when two runs disagree. */
    writeFileSync(
      jsonPath,
      `${JSON.stringify(
        buildRun({
          passages,
          answered: [],
          status: "not_run",
          createdAt: new Date().toISOString(),
          model: JEV_MODEL_ID,
          taxonomyVersion: TAXONOMY_VERSION,
          threshold,
          provenance: by,
          questionIds: Object.keys(questions),
        }),
        null,
        2,
      )}\n`,
    );
    console.error(`manifest -> ${jsonPath}`);
  }
  console.error(
    `DRY RUN — ${passages.length} passage(s), ${Object.keys(questions).length} question(s) each. Nothing was sent.`,
  );
  process.exit(0);
}

let engine;
try {
  engine = jevEngine();
} catch (e) {
  /* A missing key is a configuration failure, so it reports like one: one
     clean line and exit 2, not a stack trace. */
  console.error((e as Error).message);
  process.exit(2);
}

console.error(
  `asking ${passages.length} passage(s) at threshold ${threshold} as ${by}`,
);

const citations: PolicyCitation[] = [];
let failed = 0;
let inputTokens = 0;
let outputTokens = 0;

for (const [i, passage] of passages.entries()) {
  const state = buildPassageState(passage);
  try {
    const { answers, usage } = await engine.characterize(state, questions);
    inputTokens += usage?.input_tokens ?? 0;
    outputTokens += usage?.output_tokens ?? 0;
    citations.push({ passage, verdict: readVerdict(answers, threshold, ASKABLE_IDS) });
  } catch (e) {
    /* One passage's failure is not the run's failure, and never a silent
       zero: it is counted, named, and sets the exit code. */
    failed++;
    console.error(`  ERROR ${passage.id}: ${(e as Error).message}`);
  }
  if ((i + 1) % 20 === 0) console.error(`  ${i + 1}/${passages.length}`);
}

const areas = groupByArea(citations);
const rest = unmatched(citations);

/* ---- the report ------------------------------------------------------ */
const quote = (text: string) =>
  text.length <= 240 ? text : `${text.slice(0, 237)}…`;

console.log(`\nWhat this site states, by policy area\n`);
if (areas.length === 0) {
  console.log(
    "  No passage cleared both the commitment gate and an issue question.\n" +
      "  That is a result, not an error: at this threshold, on these pages,\n" +
      "  nothing was found. Lower --threshold or ingest more pages to widen it.",
  );
}
for (const { area, subIssues } of areas) {
  console.log(`${area.label}`);
  for (const sub of subIssues) {
    console.log(`  ${sub.id}  ${sub.label}  (${sub.citations.length} citation(s))`);
    for (const c of sub.citations) {
      console.log(`      ${c.score.toFixed(2)}  "${quote(c.passage.text)}"`);
      console.log(
        `            ${c.passage.url}${c.passage.heading ? `  — section: ${c.passage.heading}` : ""}`,
      );
    }
  }
  console.log("");
}

console.error(
  `\ndone: ${citations.length} asked, ` +
    `${citations.filter((c) => c.verdict.statesPolicy).length} state a policy, ` +
    `${rest.noIssue.length} state a policy the taxonomy has no question for, ` +
    `${rest.noPolicy.length} state no policy, ${failed} failed`,
);
console.error(`tokens: ${inputTokens} in, ${outputTokens} out`);

if (jsonPath) {
  /* The run file, not an ad-hoc summary: every passage with its verdict, the
     provenance that says whether another run is comparable, and a status that
     tells a failed request apart from a question never asked. Compare two of
     these with scripts/compare-policy-runs.ts. */
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      buildRun({
        passages,
        answered: citations,
        status: failed > 0 ? "partial" : "complete",
        createdAt: new Date().toISOString(),
        model: JEV_MODEL_ID,
        taxonomyVersion: TAXONOMY_VERSION,
        threshold,
        provenance: by,
        questionIds: Object.keys(questions),
        failed,
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      }),
      null,
      2,
    )}\n`,
  );
  console.error(`run -> ${jsonPath}`);
}

if (failed > 0) process.exit(1);
