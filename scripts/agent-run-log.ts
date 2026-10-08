/* The scheduled agents' run log and the watchdog's check, run only through
   scripts/agent-run.sh (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.1, §3.2).

     start  --agent A --run-dir DIR           write DIR/deadline and print the
                                              budget line (always, before any
                                              database call); then mark A's own
                                              stale `running` rows failed and
                                              insert this run (DIR/run-id)
     finish --agent A --run-dir DIR --status S --report PATH [--items N]
                                              update this run's row
     stale                                    mark every routine agent's stale
                                              `running` rows failed
     watch  --runs FILE --notified FILE       print one "NOTIFY: " line per
                                              stuck run not yet notified, then
                                              append those session ids

   THE LOG NEVER STOPS A RUN. A failed database write prints a warning and
   exits 0: the queue and the report are the run's real output. Until
   0048_agent_run_r5.sql is applied, R5's insert fails that way. The client
   is imported lazily, so even a missing package is a warning here.

   Arguments the wrapper or the agent passed that are malformed exit 2; a bad
   runs.json exits 1. */

import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import {
  ROUTINE_AGENTS,
  STALE_SUMMARY,
  budgetLine,
  deadlineFor,
  finishRow,
  isFinishStatus,
  isRoutineAgent,
  parseTaskRuns,
  staleCutoff,
  watchLines,
  type RoutineAgent,
} from "../src/lib/agent-budget.ts";

loadEnvLocal(import.meta.url);

/* The watchdog writes runs.json just before `watch check`. An older file
   means this run's list_task_runs answers never reached it. */
const RUNS_FILE_MAX_AGE_MS = 15 * 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const [command, ...args] = process.argv.slice(2);

function die(code: number, message: string): never {
  console.error(`agent-run-log: ${message}`);
  process.exit(code);
}

function warn(message: string): void {
  console.error(`warning: run log not written: ${message}. The run goes on.`);
}

/** Parse this command's flags against an allow-list; anything else exits 2. */
function options(allowed: string[]): Map<string, string> {
  const found = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!allowed.includes(flag)) die(2, `${command}: unknown argument ${flag}`);
    if (value === undefined || value.startsWith("--")) die(2, `${command}: ${flag} needs a value`);
    if (found.has(flag)) die(2, `${command}: ${flag} given twice`);
    found.set(flag, value);
  }
  return found;
}

function required(opts: Map<string, string>, flag: string): string {
  const value = opts.get(flag);
  if (value === undefined) die(2, `${command}: ${flag} is required`);
  return value;
}

function routineAgent(opts: Map<string, string>): RoutineAgent {
  const agent = required(opts, "--agent");
  if (!isRoutineAgent(agent)) die(2, `${command}: unknown agent ${agent} (routine agents: ${ROUTINE_AGENTS.join(", ")})`);
  return agent;
}

function runDir(opts: Map<string, string>): string {
  const dir = required(opts, "--run-dir");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) die(2, `${command}: no run directory at ${dir}`);
  return dir;
}

async function database(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    warn("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set");
    return null;
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch (err) {
    warn(`could not load the database client (${String(err)})`);
    return null;
  }
}

/** Mark `agent`'s `running` rows older than its wall clock failed; returns how many, or null on error. */
async function markStale(db: SupabaseClient, agent: RoutineAgent, now: Date): Promise<number | null> {
  const { data, error } = await db
    .from("agent_run")
    .update({ status: "failed", summary: STALE_SUMMARY })
    .eq("agent", agent)
    .eq("status", "running")
    .lt("started_at", staleCutoff(agent, now).toISOString())
    .select("id");
  if (error) {
    warn(`could not mark stale ${agent} runs (${error.message})`);
    return null;
  }
  return (data ?? []).length;
}

if (command === "start") {
  const opts = options(["--agent", "--run-dir"]);
  const agent = routineAgent(opts);
  const dir = runDir(opts);
  const now = new Date();
  const deadline = deadlineFor(agent, now);
  // The deadline first: everything after this line may fail without stopping the run.
  writeFileSync(path.join(dir, "deadline"), `${Math.floor(deadline.getTime() / 1000)}\n`);
  console.log(budgetLine(agent, deadline));
  const db = await database();
  if (db) {
    try {
      const marked = await markStale(db, agent, now);
      if (marked) console.error(`marked ${marked} earlier ${agent} run(s) failed: ${STALE_SUMMARY}`);
      const { data, error } = await db
        .from("agent_run")
        .insert({ agent, status: "running", started_at: now.toISOString() })
        .select("id")
        .single();
      if (error) {
        warn(
          error.code === "23514"
            ? `agent_run does not admit ${agent} yet (migration 0048_agent_run_r5 is not applied)`
            : error.message,
        );
      } else {
        writeFileSync(path.join(dir, "run-id"), `${(data as { id: string }).id}\n`);
      }
    } catch (err) {
      warn(String(err));
    }
  }
} else if (command === "finish") {
  const opts = options(["--agent", "--run-dir", "--status", "--report", "--items"]);
  routineAgent(opts);
  const dir = runDir(opts);
  const status = required(opts, "--status");
  if (!isFinishStatus(status)) die(2, `finish: unknown status ${status} (ok, ok_empty or failed)`);
  const rawItems = opts.get("--items");
  if (rawItems !== undefined && !/^\d{1,6}$/.test(rawItems)) die(2, "finish: --items must be a whole number");
  const items = rawItems === undefined ? null : Number(rawItems);
  const report = required(opts, "--report");
  const idFile = path.join(dir, "run-id");
  if (!existsSync(idFile)) {
    warn("this run has no run record to finish (its start was not logged)");
    process.exit(0);
  }
  const id = readFileSync(idFile, "utf8").trim();
  if (!UUID.test(id)) {
    warn(`${idFile} does not hold a run id`);
    process.exit(0);
  }
  const deadlineText = existsSync(path.join(dir, "deadline")) ? readFileSync(path.join(dir, "deadline"), "utf8").trim() : "";
  const deadline = /^\d+$/.test(deadlineText) ? new Date(Number(deadlineText) * 1000) : null;
  const db = await database();
  if (db) {
    try {
      const { error } = await db.from("agent_run").update(finishRow(status, items, report, new Date(), deadline)).eq("id", id);
      if (error) warn(error.message);
    } catch (err) {
      warn(String(err));
    }
  }
} else if (command === "stale") {
  options([]);
  const now = new Date();
  const db = await database();
  if (db) {
    const counts: string[] = [];
    for (const agent of ROUTINE_AGENTS) {
      try {
        const n = await markStale(db, agent, now);
        counts.push(`${agent} ${n ?? "?"}`);
      } catch (err) {
        warn(String(err));
        counts.push(`${agent} ?`);
      }
    }
    console.log(`stale runs marked failed: ${counts.join(", ")}`);
  }
} else if (command === "watch") {
  const opts = options(["--runs", "--notified"]);
  const runsFile = required(opts, "--runs");
  const notifiedFile = required(opts, "--notified");
  if (!existsSync(runsFile)) die(1, `watch: no ${runsFile}: write it from list_task_runs first`);
  const ageMs = Date.now() - statSync(runsFile).mtimeMs;
  if (ageMs > RUNS_FILE_MAX_AGE_MS) {
    die(1, `watch: ${runsFile} is ${Math.round(ageMs / 60_000)} min old: write it again from this run's list_task_runs calls`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(runsFile, "utf8"));
  } catch (err) {
    die(1, `watch: ${runsFile} is not valid JSON (${String(err)})`);
  }
  const parsed = parseTaskRuns(raw);
  if (!parsed.ok) die(1, `watch: ${parsed.error}`);
  const notifiedText = existsSync(notifiedFile) ? readFileSync(notifiedFile, "utf8") : null;
  const { lines, newIds } = watchLines(parsed.runs, notifiedText, new Date());
  for (const line of lines) console.log(`NOTIFY: ${line}`);
  const append = newIds.map((id) => `${id}\n`).join("");
  if (notifiedText === null) writeFileSync(notifiedFile, append);
  else if (append) appendFileSync(notifiedFile, append);
  console.error(`watch: ${parsed.runs.length} run(s) read, ${newIds.length} newly stuck`);
} else {
  die(
    2,
    "usage: agent-run-log.ts start --agent A --run-dir DIR | finish --agent A --run-dir DIR --status S --report PATH [--items N] | stale | watch --runs FILE --notified FILE",
  );
}
