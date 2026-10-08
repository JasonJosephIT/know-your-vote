/* R3's queue: election notices from official sources become pending review
   items (spec docs/superpowers/specs/2026-10-08-news-source-integrity-design.md
   §3.2.3). The rules live in src/lib/election-news.ts.

     queue [--dry-run]   items on stdin, a JSON array of at most 25
                         { title, summary, url, published_at, scope }, where
                         scope is { "county_fips": "<5 digits>" } or
                         { "statewide": true }. Inserts one pending manual_news
                         review item (source 'agent:R3') per new item.
                         --dry-run writes nothing.

   stdout: one JSON object, { rows, skipped, dropped }. stderr: the run's
   one line, "queued N, skipped S, dropped D" ("would queue ..." under
   --dry-run), always LAST. Spec §3.2.3 says stderr is one line; two kinds of
   line can come before it, and neither is the run's: Node's own warnings
   (the plain-Node type-stripping run prints one), and, from a
   .claude/worktrees checkout with no .env.local, env-local.ts's note naming
   the credentials file it read. That note stays: env-local prints it so a
   script never reads credentials from a directory nobody named. A caller
   reads the last stderr line.
   Exit 0: a complete run, 0 queued included. 1: the batch was refused, or a
   read or the insert failed; nothing was written. 2: a configuration error.

   Nothing here publishes: every item waits for a person in /admin. */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import { runElectionQueue } from "../src/lib/election-news.ts";

loadEnvLocal(import.meta.url);

const USAGE = "usage: election-news.ts queue [--dry-run] < items.json";

function fail(code: 1 | 2, message: string): never {
  console.error(`election-news: ${message}`);
  process.exit(code);
}

const [command, ...args] = process.argv.slice(2);
if (command !== "queue") fail(2, USAGE);
/* A typo such as --dryrun must stop the run, never fall through to writing. */
const unknown = args.filter((a) => a !== "--dry-run");
if (unknown.length > 0) fail(2, `queue: unknown argument(s) ${unknown.join(" ")}; ${USAGE}`);
const dryRun = args.includes("--dry-run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) fail(2, "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const text = await new Promise<string>((resolve, reject) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (buf += c));
  process.stdin.on("end", () => resolve(buf));
  process.stdin.on("error", reject);
});
if (!text.trim()) fail(1, "batch refused, nothing written: nothing on stdin");
let raw: unknown;
try {
  raw = JSON.parse(text);
} catch (err) {
  fail(1, `batch refused, nothing written: stdin is not valid JSON: ${String(err)}`);
}

const outcome = await runElectionQueue(createClient(supabaseUrl, serviceKey), raw, { dryRun });
if (outcome.output) console.log(JSON.stringify(outcome.output, null, 1));
console.error(outcome.line);
/* No process.exit after a large stdout write: it can cut a piped stream
   short. Set the code and let the process end on its own. */
process.exitCode = outcome.exitCode;
