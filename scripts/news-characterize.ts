/* Runs the issue characterizer —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.

   This is the ONE part of Unit 1 that touches the network and the database,
   which is why it is a script and not a library: everything decidable lives in
   src/lib/news-characterize.ts and is verified offline by
   scripts/verify-news-characterize.ts. Run that first — if it fails, this
   script's output is not worth reading.

   It characterizes STORED ROWS, not the raw sweep pool (§4.2). The Sentinel
   sitemaps alone return ~120 URLs per paper per day including obituaries and
   wire sports; characterizing those would be waste, and it would measure the
   tag distribution over a different population than the coverage numbers use.

   It never writes candidate_id or relation. src/lib/news-match.ts owns those,
   and the founder closed that question on 2026-09-18 ("A now, drop C").

   Modes:

     node scripts/news-characterize.ts --dry-run [--limit 20] [--threshold 0.7]
       Characterize and PRINT one JSON object per row. Writes nothing. This is
       how a change is reviewed before it touches a row, and its output is the
       raw material for the gold set (Task 6).

     node scripts/news-characterize.ts [--limit N] [--threshold 0.7]
       Characterize and write issues/characterized_by/characterized_at for rows
       where issues IS NULL.

   There is deliberately no --engine flag: one engine exists, and a flag that
   accepts a single value is cruft. When the gold-set evaluation asks for the
   Anthropic arm (spec §6 item 6), add the flag with the second engine.

   Fail-closed throughout: a missing key, a missing taxonomy, no candidate rows
   or a failed write all exit non-zero. A silent empty success is the one
   outcome this script must never produce, because it looks exactly like
   "the press wrote nothing about these people this week". */

import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_THRESHOLD,
  applyThreshold,
  buildQuestions,
  buildState,
  provenance,
} from "../src/lib/news-characterize.ts";
import { jevEngine } from "../src/lib/news-characterize-engines.ts";
/* The taxonomy is injected here and nowhere else: the core takes it as a
   parameter so it never depends on which list wins gate G3. This import is the
   composition root, and it is why this script cannot run until Task 1 lands. */
import { ISSUES, ISSUE_IDS, TAXONOMY_VERSION } from "../src/lib/news-issues.ts";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function numericFlag(name: string, fallback: number): number {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const raw = args[i + 1];
  const value = Number(raw);
  if (raw === undefined || raw.startsWith("--") || !Number.isFinite(value)) {
    console.error(`${name} needs a number (got ${raw ?? "nothing"})`);
    process.exit(2);
  }
  return value;
}

const limit = numericFlag("--limit", 50);
const threshold = numericFlag("--threshold", DEFAULT_THRESHOLD);

if (threshold <= 0 || threshold >= 1) {
  console.error("--threshold must be strictly between 0 and 1");
  process.exit(2);
}
if (!Number.isInteger(limit) || limit < 1) {
  console.error("--limit must be a positive integer");
  process.exit(2);
}
if (ISSUES.length === 0) {
  console.error("the taxonomy is empty — refusing to run, every row would be tagged {}");
  process.exit(2);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required " +
      "(this worktree needs its own .env.local — worktrees do not share one)",
  );
  process.exit(2);
}
/* Build the engine BEFORE touching the database. jevEngine() is where the
   TYPESAFE_API_KEY check lives, and a missing key should cost nothing — not a
   query whose results are then thrown away. Every fail-closed check in this
   script runs before the first byte of I/O. */
let engine;
try {
  engine = jevEngine();
} catch (e) {
  /* A missing key is a configuration failure like any other, so it reports
     like one: one clean line and exit 2, not a stack trace. */
  console.error((e as Error).message);
  process.exit(2);
}
const questions = buildQuestions(ISSUES);
const by = provenance(engine.modelId, questions, TAXONOMY_VERSION);

const db = createClient(url, key);

/* Only rows we have never characterized. `issues IS NULL` is the "never
   looked" state; a row holding '{}' HAS been looked at and had nothing clear
   the threshold, and a re-run must not silently re-bill it (§4.6). */
const { data: rows, error } = await db
  .from("news_item")
  .select("id, title, summary, url")
  .is("issues", null)
  .not("url", "is", null)
  .order("published_at", { ascending: false })
  .limit(limit);

if (error) {
  console.error(`query failed: ${error.message}`);
  process.exit(1);
}
if (!rows || rows.length === 0) {
  console.error("no uncharacterized rows with a url — nothing to do");
  process.exit(1);
}

console.error(
  `characterizing ${rows.length} row(s) at threshold ${threshold} as ${by}` +
    (dryRun ? " (DRY RUN — nothing will be written)" : ""),
);

let tagged = 0;
let empty = 0;
let failed = 0;

for (const row of rows) {
  const state = buildState({ title: row.title, summary: row.summary, url: row.url });
  let answers: Record<string, unknown>;
  try {
    answers = await engine.characterize(state, questions);
  } catch (e) {
    /* One article's failure is not the run's failure — but it is never a
       silent zero either. The row keeps `issues IS NULL`, so the next run
       retries it, and the count is reported at the end and sets the exit code. */
    failed++;
    console.error(`  ERROR ${row.id}: ${(e as Error).message}`);
    continue;
  }

  const issues = applyThreshold(answers, threshold, ISSUE_IDS);
  if (issues.length > 0) tagged++;
  else empty++;

  if (dryRun) {
    /* Every field the gold set and the eval script need (Task 6), so a gold
       set is built by hand-correcting this output rather than re-querying. */
    console.log(
      JSON.stringify({
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        issues,
        sitemapOnly: state.dek === null,
      }),
    );
    continue;
  }

  const { error: writeError } = await db
    .from("news_item")
    .update({
      issues,
      characterized_by: by,
      characterized_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (writeError) {
    failed++;
    console.error(`  ERROR writing ${row.id}: ${writeError.message}`);
  }
}

console.error(
  `done: ${tagged} tagged, ${empty} characterized with no issue over threshold, ${failed} failed`,
);
if (failed > 0) process.exit(1);
