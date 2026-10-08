/* Guardrail for the agents' budgets, the watchdog's stuck rule and the
   news-sweep cron's run row (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.1, §3.2, §6).
   Pure and offline.

   Run: node scripts/verify-agent-budget.ts */

import {
  BUDGETS,
  MAX_TASK_RUNS,
  ROUTINE_AGENTS,
  STALE_SUMMARY,
  TASK_AGENTS,
  WATCHDOG_INSTALLED,
  budgetLine,
  cronRunRow,
  deadlineFor,
  finishRow,
  formatDuration,
  isFinishStatus,
  isRoutineAgent,
  isStuck,
  parseTaskRuns,
  staleCutoff,
  watchLines,
  type TaskRun,
} from "../src/lib/agent-budget.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const T0 = new Date("2026-10-08T13:00:00.000Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const MIN = 60_000;

/* ---- budgets: spec §3.1, "Wall-clock budgets" -------------------------- */

const want = { R2: [60, 8], R3: [40, 30], R4: [20, 0], R5: [45, 25], watch: [5, 0] } as const;
for (const [agent, [wall, web]] of Object.entries(want)) {
  const b = BUDGETS[agent as keyof typeof BUDGETS];
  check(`${agent} budget is ${wall} min and ${web} web calls`, b.wallClockMin === wall && b.webCalls === web, JSON.stringify(b));
}
check("routine agents are R2 to R5", ROUTINE_AGENTS.join(",") === "R2,R3,R4,R5", ROUTINE_AGENTS.join(","));
check("isRoutineAgent takes R5 and refuses watch, R1 and dispatcher",
  isRoutineAgent("R5") && !isRoutineAgent("watch") && !isRoutineAgent("R1") && !isRoutineAgent("dispatcher"));
check("finish statuses are ok, ok_empty and failed",
  isFinishStatus("ok") && isFinishStatus("ok_empty") && isFinishStatus("failed") && !isFinishStatus("running") && !isFinishStatus("dry_run"));
check("the four routines map to R2 to R5",
  JSON.stringify(TASK_AGENTS) ===
    JSON.stringify({ "cap-r2-contact-refresher": "R2", "cap-r3-election-news": "R3", "cap-r4-ops-digest": "R4", "cap-r5-candidate-leads": "R5" }));

check("R5's deadline is 45 min after start", deadlineFor("R5", T0).toISOString() === "2026-10-08T13:45:00.000Z", deadlineFor("R5", T0).toISOString());
check("R3's stale cutoff is 40 min before now", staleCutoff("R3", T0).toISOString() === "2026-10-08T12:20:00.000Z", staleCutoff("R3", T0).toISOString());
check("budgetLine names minutes, deadline and web cap",
  budgetLine("R5", deadlineFor("R5", T0)) === "budget: 45 min, until 2026-10-08T13:45:00.000Z; web calls: 25 WebFetch",
  budgetLine("R5", deadlineFor("R5", T0)));
check("formatDuration", formatDuration(125 * MIN) === "2h 5m" && formatDuration(45 * MIN + 59_000) === "45m" && formatDuration(-5) === "0m");

/* ---- the stuck rule: fires at twice each wall clock, not before -------- */

const taskOf = (agent: string) => Object.keys(TASK_AGENTS).find((k) => TASK_AGENTS[k] === agent)!;
const run = (agent: string, over: Partial<TaskRun> = {}): TaskRun => ({
  task_id: taskOf(agent),
  session_id: `s-${agent}`,
  status: "running",
  started_at: T0.toISOString(),
  last_activity_at: null,
  ...over,
});

for (const agent of ROUTINE_AGENTS) {
  const twice = 2 * BUDGETS[agent].wallClockMin * MIN;
  check(`${agent} is not stuck one second before twice its budget`, !isStuck(run(agent), at(twice - 1000)));
  check(`${agent} is stuck at twice its budget`, isStuck(run(agent), at(twice)));
  check(`${agent} is not stuck when its run is no longer running`, !isStuck(run(agent, { status: "succeeded" }), at(10 * twice)));
}
check("a task with no budget is never stuck",
  !isStuck({ ...run("R5"), task_id: "cap-r1-candidate-news" }, at(24 * 60 * MIN)));

/* ---- watch lines: one push per stuck run, never twice ------------------ */

const stuckR3 = run("R3", { session_id: "local_aaa" });
const freshR5 = run("R5", { session_id: "local_bbb", started_at: at(70 * MIN).toISOString() });
const now = at(81 * MIN); // R3 twice 40 = 80 min; R5 started 11 min ago

const first = watchLines([], null, now);
check("the first-ever run prints only the install line", first.lines.length === 1 && first.lines[0] === WATCHDOG_INSTALLED && first.newIds.length === 0,
  JSON.stringify(first));

const firstWithStuck = watchLines([stuckR3, freshR5], null, now);
check("the first run prints the install line and the stuck run",
  firstWithStuck.lines[0] === WATCHDOG_INSTALLED && firstWithStuck.lines.length === 2 && firstWithStuck.newIds.join() === "local_aaa",
  JSON.stringify(firstWithStuck));

const second = watchLines([stuckR3, freshR5], "", now);
check("a stuck run not yet notified prints one line naming agent, budget and session",
  second.lines.length === 1 &&
    second.lines[0] === "R3 (cap-r3-election-news) has been running for 1h 21m, over twice its 40 min budget; session local_aaa." &&
    second.newIds.join() === "local_aaa",
  JSON.stringify(second));

const third = watchLines([stuckR3, freshR5], "local_aaa\n", now);
check("a session id already in notified.txt is not printed again", third.lines.length === 0 && third.newIds.length === 0, JSON.stringify(third));

const dup = watchLines([stuckR3, stuckR3], "", now);
check("the same session twice in runs.json is one line", dup.lines.length === 1 && dup.newIds.length === 1, JSON.stringify(dup));

/* ---- runs.json is agent-written: refuse the whole file at the first bad row */

check("parseTaskRuns accepts the prompt's shape, null last activity included",
  parseTaskRuns([stuckR3, { ...freshR5, last_activity_at: at(80 * MIN).toISOString() }]).ok);
check("parseTaskRuns accepts an empty array", parseTaskRuns([]).ok);
for (const [name, bad] of [
  ["not an array", { runs: [] }],
  ["over the cap", Array.from({ length: MAX_TASK_RUNS + 1 }, () => stuckR3)],
  ["a row that is not an object", ["x"]],
  ["a missing task_id", [{ ...stuckR3, task_id: undefined }]],
  ["a blank status", [{ ...stuckR3, status: " " }]],
  ["a session id with a newline", [{ ...stuckR3, session_id: "a\nb" }]],
  ["an empty session id", [{ ...stuckR3, session_id: "" }]],
  ["a started_at that is not a date", [{ ...stuckR3, started_at: "yesterday-ish" }]],
  ["a last_activity_at that is not a date", [{ ...stuckR3, last_activity_at: "soon" }]],
] as const) {
  const r = parseTaskRuns(bad);
  check(`parseTaskRuns refuses ${name}`, !r.ok && r.error.length > 0, JSON.stringify(r));
}

/* ---- finish ------------------------------------------------------------ */

const fin = finishRow("ok", 3, "/r/2026-10-08-R5.md", at(30 * MIN), deadlineFor("R5", T0));
check("finishRow records status, items, report and time",
  fin.status === "ok" && fin.items_written === 3 && fin.report_path === "/r/2026-10-08-R5.md" &&
    fin.finished_at === "2026-10-08T13:30:00.000Z" && fin.summary === "finished ok, 3 item(s). See the run report.",
  JSON.stringify(fin));
const late = finishRow("failed", null, "/r/x.md", at(50 * MIN), deadlineFor("R5", T0));
check("finishRow says when the finish came after the budget",
  late.items_written === null && late.summary === "finished failed, after its budget. See the run report.", JSON.stringify(late));
check("the stale summary is the spec's words", STALE_SUMMARY === "no finish recorded within budget");

/* ---- the cron's run row (spec §3.1, "The cron as R1") ------------------ */

const base = { startedAt: T0, finishedAt: at(2 * MIN) };
const sweepThrew = cronRunRow({ ...base, sweepLine: null, queueLine: null, queued: 0, error: "every feed failed" });
check("the sweep throwing is a failed R1 row with the error",
  sweepThrew.agent === "R1" && sweepThrew.status === "failed" && sweepThrew.items_written === null &&
    sweepThrew.summary === "error: every feed failed" &&
    sweepThrew.started_at === "2026-10-08T13:00:00.000Z" && sweepThrew.finished_at === "2026-10-08T13:02:00.000Z",
  JSON.stringify(sweepThrew));
const queueThrew = cronRunRow({ ...base, sweepLine: "24 feeds, 300 articles", queueLine: null, queued: 0, error: "insert refused" });
check("queueing throwing is a failed R1 row with the sweep line and the error",
  queueThrew.status === "failed" && queueThrew.summary === "24 feeds, 300 articles\nerror: insert refused", JSON.stringify(queueThrew));
const empty = cronRunRow({ ...base, sweepLine: "24 feeds", queueLine: "nothing to queue", queued: 0, error: null });
check("nothing queued is ok_empty", empty.status === "ok_empty" && empty.items_written === 0 && empty.summary === "24 feeds\nnothing to queue",
  JSON.stringify(empty));
const ok = cronRunRow({ ...base, sweepLine: "24 feeds", queueLine: "queued 7 as pending", queued: 7, error: null });
check("something queued is ok with the count", ok.status === "ok" && ok.items_written === 7, JSON.stringify(ok));
check("the summary is capped", cronRunRow({ ...base, sweepLine: "x".repeat(5000), queueLine: null, queued: 1, error: null }).summary.length === 2000);

if (failures > 0) {
  console.error(`\nverify-agent-budget: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-agent-budget: OK — the agents' budgets, run rules, cron row and console list hold");
