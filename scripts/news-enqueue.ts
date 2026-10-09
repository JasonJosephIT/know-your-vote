/* Matches swept articles to the candidate roster and enqueues them for review
   — candidate-news-PRD.md §6 (task C8), founder decision 2026-09-19.

   THIS IS THE MISSING LINK. src/lib/news-match.ts has done the categorising
   since C8 landed, and scripts/verify-news-match.ts has tested it thoroughly,
   but until now `matchArticle` had no caller outside its own guardrail:
   scripts/news-sweep.ts prints articles to stdout and writes nothing, and
   scripts/news-characterize.ts says in its header that it "never writes
   candidate_id or relation". So `news_item.relation` was only ever set by an
   operator typing into the console, and the candidate page's "In the news" /
   "Also about this race" sections had no automated way to fill.

   IT ENQUEUES, IT DOES NOT PUBLISH. Rows land in `review_item` with status
   `pending` and reach a voter only once approved in the console. That is the
   boundary the rest of the product already enforces (src/lib/admin/effects.ts:
   "This is the security boundary"), and automated name-matching is exactly the
   thing that should not skip it: a `related` match attaches to EVERY candidate
   an ambiguous surname admits, so one bad row is several candidates' pages.

   IT MAKES NO REQUESTS TO ANY PUBLISHER. Articles arrive as JSON on stdin,
   which is what news-sweep.ts already prints:

     node scripts/news-sweep.ts | node scripts/news-enqueue.ts --dry-run
     node scripts/news-sweep.ts | node scripts/news-enqueue.ts

   That split is deliberate and not just tidiness — it means this script is
   reviewable and runnable against a saved sweep without touching a single
   outlet, and the open AI-crawler policy question
   (docs/general-election/news-corpus-verification-2026-09-17.md §3 item 4)
   belongs entirely to the sweep on the left of the pipe.

   WHAT `related` CAN AND CANNOT MEAN HERE. matchArticle produces `related` two
   ways: (a) the article is about a known race, and (b) it names a surname
   several candidates share. A swept article carries no race id — the sweep does
   not identify races — so only (b) fires from this runner. Race-scoped
   `related` rows need a race identifier the sweep does not yet produce, and
   pretending otherwise would attach race stories to candidates on no evidence.

   SCOPE: candidate matches only. An article that matches nobody is counted in
   the summary and dropped, not enqueued as county news — `NewsInsertRow` has no
   `county_fips`, so a county-scoped election_news row cannot survive the
   approval boundary yet. Widening that is a separate change; inventing a metro
   value to squeeze it through would put a story in the wrong county's feed.

   SINCE 2026-10-06 the matching and writing live in src/lib/news-intake.ts
   (enqueueIntake), shared with the daily cron, and an article that
   names no candidate is still queued when it is about the election
   (UNMATCHED_ARTICLE_POLICY = "election_keywords", src/lib/news-enqueue.ts).
   This script keeps stdin, the env and the exit codes.

   Fail-closed throughout: no stdin, no roster, or a failed write all exit
   non-zero. A silent empty success is the one outcome this must never produce,
   because it looks exactly like "the press wrote nothing about these people". */

import { loadEnvLocal } from "./env-local.ts";
import { createClient } from "@supabase/supabase-js";
import { UNMATCHED_ARTICLE_POLICY } from "../src/lib/news-enqueue.ts";
import { enqueueIntake } from "../src/lib/news-intake.ts";
import type { SweptArticle } from "../src/lib/news-sweep.ts";

loadEnvLocal(import.meta.url);

/* "policy_inlet" (a model-gated inlet) is not built. A switch that silently
   did nothing would read as "no policy news this week", so refuse instead. */
if ((UNMATCHED_ARTICLE_POLICY as string) === "policy_inlet") {
  console.error(
    'news-enqueue: UNMATCHED_ARTICLE_POLICY is "policy_inlet", which is not built. '
      + "A policy inlet is its own spec change (news-ingest-order-handoff-2026-09-23.md §5 and §7).",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
/* The archive backfill (scripts/news-backfill.ts) pipes in with this: queue
   candidate matches only, no election stories (news-intake.ts enqueueIntake). */
const candidatesOnly = args.includes("--candidates-only");
const limitArg = args.indexOf("--limit");
const limit = limitArg === -1 ? Infinity : Number(args[limitArg + 1]);

function die(message: string): never {
  console.error(`news-enqueue: ${message}`);
  process.exit(1);
}

/* ---- 1. the articles, from stdin ---------------------------------------- */

const stdin = await new Promise<string>((resolve, reject) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (buf += c));
  process.stdin.on("end", () => resolve(buf));
  process.stdin.on("error", reject);
});
if (!stdin.trim()) {
  die(
    "no articles on stdin. Pipe the sweep in:\n"
      + "  node scripts/news-sweep.ts | node scripts/news-enqueue.ts --dry-run",
  );
}
let articles: SweptArticle[];
try {
  const parsed: unknown = JSON.parse(stdin);
  if (!Array.isArray(parsed)) die("stdin parsed but is not an array of articles");
  articles = parsed as SweptArticle[];
} catch (err) {
  die(`stdin is not valid JSON: ${String(err)}`);
}
if (articles.length === 0) die("stdin held an empty array — nothing to match");

/* ---- 2. match and queue (src/lib/news-intake.ts) ------------------------ */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) die("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

try {
  const result = await enqueueIntake(createClient(url, key), articles, { dryRun, limit, elections: !candidatesOnly });
  if (dryRun) {
    /* The EXACT payloads the real path would queue. */
    for (const p of result.payloads) console.log(JSON.stringify(p));
  }
  console.error(`news-enqueue: ${result.summary}`);
  if (!dryRun && result.attachments + result.elections === 0 && !candidatesOnly) {
    die(
      "nothing to enqueue. That is a real outcome, not an error to ignore: the sweep found no "
        + "story naming anyone on the ballot and no election story. Check the counts above.",
    );
  }
} catch (err) {
  die((err as Error).message);
}
