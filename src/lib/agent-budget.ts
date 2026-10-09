/* Wall-clock budgets and web-call caps for the scheduled agents, the
   watchdog's stuck rule, and the news-sweep cron's run row (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.1, §3.2).

   One home for these numbers: scripts/agent-run-log.ts (the wrapper's run
   log and the watchdog), the cron route and, later, R4's digest all read
   them from here. Pure, with no imports, so the Next route and plain-Node
   scripts load the same file. */

export type RoutineAgent = "R2" | "R3" | "R4" | "R5";
export type BudgetAgent = RoutineAgent | "watch";

/** The agents that run `start`, `budget` and `finish` through scripts/agent-run.sh. */
export const ROUTINE_AGENTS: readonly RoutineAgent[] = ["R2", "R3", "R4", "R5"];

export interface Budget {
  /** Minutes from `start` to the deadline the wrapper enforces. */
  wallClockMin: number;
  /** Web calls the prompt may make; the agent counts them, the wrapper cannot. */
  webCalls: number;
  /** Which tools the web cap counts, as the prompt names them. */
  webTools: string;
}

/* Spec §3.1, "Wall-clock budgets". */
export const BUDGETS: Readonly<Record<BudgetAgent, Budget>> = {
  R2: { wallClockMin: 60, webCalls: 8, webTools: "WebFetch" },
  R3: { wallClockMin: 40, webCalls: 30, webTools: "WebSearch + WebFetch" },
  R4: { wallClockMin: 20, webCalls: 0, webTools: "none (plus 5 list_task_runs calls)" },
  R5: { wallClockMin: 45, webCalls: 25, webTools: "WebFetch" },
  watch: { wallClockMin: 5, webCalls: 0, webTools: "none (plus 4 list_task_runs calls)" },
};

/** The scheduled-task ids the watchdog reads with list_task_runs (spec §3.2 step 1). */
export const TASK_AGENTS: Readonly<Record<string, RoutineAgent>> = {
  "cap-r2-contact-refresher": "R2",
  "cap-r3-election-news": "R3",
  "cap-r4-ops-digest": "R4",
  "cap-r5-candidate-leads": "R5",
};

export const STALE_SUMMARY = "no finish recorded within budget";
export const WATCHDOG_INSTALLED = "watchdog installed: notifications work";

export const FINISH_STATUSES = ["ok", "ok_empty", "failed"] as const;
export type FinishStatus = (typeof FINISH_STATUSES)[number];

const MINUTE = 60_000;

export function isRoutineAgent(value: string): value is RoutineAgent {
  return (ROUTINE_AGENTS as readonly string[]).includes(value);
}

export function isFinishStatus(value: string): value is FinishStatus {
  return (FINISH_STATUSES as readonly string[]).includes(value);
}

export function wallClockMs(agent: BudgetAgent): number {
  return BUDGETS[agent].wallClockMin * MINUTE;
}

/** When a run that started at `startedAt` must stop starting steps. */
export function deadlineFor(agent: BudgetAgent, startedAt: Date): Date {
  return new Date(startedAt.getTime() + wallClockMs(agent));
}

/** A `running` agent_run row that started before this has outlived its budget. */
export function staleCutoff(agent: BudgetAgent, now: Date): Date {
  return new Date(now.getTime() - wallClockMs(agent));
}

/** "2h 5m", "45m", "0m". */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / MINUTE));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The line `start` prints, so the prompt never computes a budget itself. */
export function budgetLine(agent: BudgetAgent, deadline: Date): string {
  const b = BUDGETS[agent];
  return `budget: ${b.wallClockMin} min, until ${deadline.toISOString()}; web calls: ${b.webCalls} ${b.webTools}`;
}

/* ---- the watchdog ------------------------------------------------------ */

/** One row of what the watchdog copies out of list_task_runs (spec §3.2 step 1). */
export interface TaskRun {
  task_id: string;
  session_id: string;
  status: string;
  started_at: string;
  last_activity_at: string | null;
}

/** Four tasks at limit 2 is 8 rows; anything far past that is not what the prompt asked for. */
export const MAX_TASK_RUNS = 20;

/* A session id is appended to notified.txt one per line, so it may never
   carry a newline or anything else that could split or forge a line. */
const SESSION_ID = /^[A-Za-z0-9_.:-]{1,200}$/;

/** The agent wrote runs.json, so it is untrusted input. A file that is not
    an array, or is over the cap, is refused whole. A row that fails a check is
    skipped and named by its index only (never its text), so one odd row that
    list_task_runs keeps returning cannot switch off every other task's
    notifications. A skipped row is never notified and never reaches
    notified.txt. */
export function parseTaskRuns(
  raw: unknown,
): { ok: true; runs: TaskRun[]; skipped: string[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "runs.json must be a JSON array" };
  if (raw.length > MAX_TASK_RUNS) {
    return { ok: false, error: `runs.json holds ${raw.length} runs, over the ${MAX_TASK_RUNS}-run cap` };
  }
  const runs: TaskRun[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const problem = taskRunProblem(raw[i]);
    if (problem !== null) {
      skipped.push(`run ${i}: ${problem}`);
      continue;
    }
    const r = raw[i] as Record<string, unknown>;
    runs.push({
      task_id: r.task_id as string,
      session_id: r.session_id as string,
      status: r.status as string,
      started_at: r.started_at as string,
      last_activity_at: (r.last_activity_at ?? null) as string | null,
    });
  }
  return { ok: true, runs, skipped };
}

/** Why one runs.json row cannot be read, or null when it can. */
function taskRunProblem(row: unknown): string | null {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return "not an object";
  const r = row as Record<string, unknown>;
  for (const key of ["task_id", "status", "started_at"] as const) {
    if (typeof r[key] !== "string" || (r[key] as string).trim() === "") return `${key} must be a non-empty string`;
  }
  if (typeof r.session_id !== "string" || !SESSION_ID.test(r.session_id)) {
    return "session_id must be 1-200 letters, digits, _ . : or -";
  }
  if (Number.isNaN(Date.parse(r.started_at as string))) return "started_at is not a date";
  const last = r.last_activity_at ?? null;
  if (last !== null && (typeof last !== "string" || Number.isNaN(Date.parse(last)))) {
    return "last_activity_at must be a date or null";
  }
  return null;
}

/** Running, and started at least twice its agent's wall clock ago. A task with no budget is never stuck. */
export function isStuck(run: TaskRun, now: Date): boolean {
  const agent = TASK_AGENTS[run.task_id];
  if (!agent || run.status !== "running") return false;
  return now.getTime() >= heldUntil(agent, new Date(Date.parse(run.started_at))).getTime();
}

/** The lines to push, and the session ids to append to notified.txt.
    `notifiedText` is notified.txt's content, or null when the file does not
    exist yet: that first run also prints the one test line. */
export function watchLines(
  runs: readonly TaskRun[],
  notifiedText: string | null,
  now: Date,
): { lines: string[]; newIds: string[] } {
  const seen = new Set((notifiedText ?? "").split("\n").map((s) => s.trim()).filter(Boolean));
  const lines = notifiedText === null ? [WATCHDOG_INSTALLED] : [];
  const newIds: string[] = [];
  for (const run of runs) {
    if (!isStuck(run, now) || seen.has(run.session_id)) continue;
    seen.add(run.session_id);
    newIds.push(run.session_id);
    const agent = TASK_AGENTS[run.task_id];
    lines.push(
      `${agent} (${run.task_id}) has been running for ${formatDuration(now.getTime() - Date.parse(run.started_at))}, ` +
        `over twice its ${BUDGETS[agent].wallClockMin} min budget; session ${run.session_id}.`,
    );
  }
  return { lines, newIds };
}

/** Until when `start` refuses a new run while this agent's previous run,
    started at `startedAt`, has not called finish: twice its wall clock, the
    moment the watchdog calls it stuck. Past its deadline that run can still
    be writing its report before its `finish`, and a new run would take its
    pointer, so that late `finish` would end the new run instead. */
export function heldUntil(agent: BudgetAgent, startedAt: Date): Date {
  return new Date(startedAt.getTime() + 2 * wallClockMs(agent));
}

/* ---- run rows ---------------------------------------------------------- */

/** The update `finish` writes to this run's agent_run row. */
export function finishRow(
  status: FinishStatus,
  items: number | null,
  reportPath: string,
  now: Date,
  deadline: Date | null,
): { finished_at: string; status: FinishStatus; items_written: number | null; report_path: string; summary: string } {
  const late = deadline !== null && now.getTime() > deadline.getTime();
  return {
    finished_at: now.toISOString(),
    status,
    items_written: items,
    report_path: reportPath,
    summary:
      `finished ${status}` +
      (items === null ? "" : `, ${items} item(s)`) +
      (late ? ", after its budget" : "") +
      ". See the run report.",
  };
}

/** What one news-sweep cron run did (src/app/api/cron/news-sweep/route.ts). */
export interface CronOutcome {
  startedAt: Date;
  finishedAt: Date;
  /** The sweep's summary line, or null when the sweep threw. */
  sweepLine: string | null;
  /** The sweep's feed-depth line (news-sweep.ts depthLine; news-source-integrity
      §3.5), or null/absent when the sweep threw. */
  depthLine?: string | null;
  /** The queue's summary line, or null when the sweep or the queue threw. */
  queueLine: string | null;
  /** Items queued; 0 when the run failed. */
  queued: number;
  /** The error that ended the run, or null. */
  error: string | null;
}

export interface CronRunRow {
  agent: "R1";
  started_at: string;
  finished_at: string;
  status: FinishStatus;
  items_written: number | null;
  summary: string;
}

/* agent_run.summary is free text; keep one row readable in the console. */
const SUMMARY_MAX = 2000;

/** The agent_run row the cron writes at the end of each run: the cron is R1 now (spec §3.1). */
export function cronRunRow(o: CronOutcome): CronRunRow {
  const failed = o.error !== null;
  const lines = [o.sweepLine, o.depthLine ?? null, o.queueLine, failed ? `error: ${o.error}` : null].filter(
    (l): l is string => typeof l === "string" && l.length > 0,
  );
  return {
    agent: "R1",
    started_at: o.startedAt.toISOString(),
    finished_at: o.finishedAt.toISOString(),
    status: failed ? "failed" : o.queued === 0 ? "ok_empty" : "ok",
    items_written: failed ? null : o.queued,
    summary: lines.join("\n").slice(0, SUMMARY_MAX),
  };
}
