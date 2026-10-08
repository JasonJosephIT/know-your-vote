/* Guardrail for the agents' wrapper and run log (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.1, §3.2, §6).

   Runs the real scripts/agent-run.sh against a temporary agent worktree and
   runs folder (KYV_AGENT_WORKTREE, KYV_AGENT_RUNS), with the node running
   this file (KYV_AGENT_NODE: CI is Linux, where the Logi path does not
   exist). The temporary worktree holds the real agent-run-log.ts, env-local.ts
   and agent-budget.ts, and stubs for agent-worktree.sh and candidate-leads.ts.
   The database variables are set empty, so every run-log write fails: that is
   the "a failed log write never stops a run" case, and nothing here can reach
   a database. Offline; needs sh, perl, awk and date.

   Run: node scripts/verify-agent-run.mjs */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTINE_AGENTS } from "../src/lib/agent-budget.ts";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRAPPER = path.join(ROOT, "scripts", "agent-run.sh");
const SOURCE = readFileSync(WRAPPER, "utf8");

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- the wrapper's source ---------------------------------------------- */

const rows = SOURCE.match(/^ROWS='([^']*)'$/m)?.[1].split("\n").map((l) => l.split("|")) ?? [];
check("the table parses into rows of seven fields", rows.length > 0 && rows.every((r) => r.length === 7), JSON.stringify(rows));
const routine = SOURCE.match(/^ROUTINE="([^"]*)"$/m)?.[1].split(" ") ?? [];
check("the wrapper's routine agents are ROUTINE_AGENTS", routine.join(",") === ROUTINE_AGENTS.join(","), routine.join(","));
for (const [agent, step, script, , , , secs] of rows) {
  check(`row ${agent} ${step} names a script in the repo`, existsSync(path.join(ROOT, script)), script);
  check(`row ${agent} ${step} has a positive timeout`, /^[1-9]\d*$/.test(secs), secs);
  check(`row ${agent} ${step} belongs to a routine agent or watch`, agent === "watch" || routine.includes(agent), agent);
  check(`row ${agent} ${step} does not shadow start, budget or finish`, !["start", "budget", "finish"].includes(step), step);
}
const want = [
  "R5|prep|scripts/candidate-leads.ts|prep --days 14|-|stories.json|720",
  "R5|check|scripts/candidate-leads.ts|check --stories {dir}/stories.json|mentions.json|leads.json|300",
  "R5|queue-dry|scripts/candidate-leads.ts|queue --dry-run|verified.json|queue-dry.txt|300",
  "R5|queue|scripts/candidate-leads.ts|queue|verified.json|queue.txt|300",
  "watch|stale|scripts/agent-run-log.ts|stale|-|-|120",
  "watch|check|scripts/agent-run-log.ts|watch --runs {dir}/runs.json --notified {dir}/notified.txt|-|-|120",
];
check("the table is PR A's rows exactly (spec §3.1)", rows.map((r) => r.join("|")).join("\n") === want.join("\n"),
  rows.map((r) => r.join("|")).join("\n"));
const lastLine = SOURCE.trimEnd().split("\n").at(-1);
check('the last line is `main "$@"; exit $?`, so a refresh cannot feed the shell new lines', lastLine === 'main "$@"; exit $?', lastLine);
check("the literal defaults are the agent worktree, the runs folder and the arm64 node",
  SOURCE.includes('WT="${KYV_AGENT_WORKTREE:-/Users/jsloth/Projects/kyv-agent-worktree}"') &&
    SOURCE.includes('RUNS="${KYV_AGENT_RUNS:-/Users/jsloth/Projects/kyv-agent-runs}"') &&
    SOURCE.includes('NODE="${KYV_AGENT_NODE:-/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node}"'));

/* ---- the prompts run only the wrapper, with steps it has --------------- */

const COMMAND = /^\s*sh \/Users\/jsloth\/Projects\/kyv-agent-worktree\/scripts\/agent-run\.sh (\S+) (\S+)(.*)$/;
const PROMPTS = {
  "agents/r5-candidate-leads.prompt.md": "R5",
};
for (const [file, agent] of Object.entries(PROMPTS)) {
  if (!existsSync(path.join(ROOT, file))) {
    check(`${file} exists`, false);
    continue;
  }
  const text = readFileSync(path.join(ROOT, file), "utf8");
  const commands = text.split("\n").filter((l) => l.includes("agent-run.sh"));
  check(`${file} runs the wrapper`, commands.length > 0);
  for (const line of commands) {
    const m = line.match(COMMAND);
    check(`${file}: the wrapper's literal command, alone on its line: ${line.trim()}`, Boolean(m));
    if (!m) continue;
    const [, a, step, rest] = m;
    const known = rows.some(([ra, rs]) => ra === a && rs === step) || (routine.includes(a) && ["start", "budget", "finish"].includes(step));
    check(`${file}: ${a} ${step} is this agent's step in the wrapper`, a === agent && known, line);
    const restOk = step === "finish" ? /^ --status STATUS --items N$/.test(rest) : rest.trim() === "";
    check(`${file}: ${a} ${step} carries no other argument, redirection or pipe`, restOk, rest);
  }
  check(`${file} names no dated run folder, date call, cd or node path`,
    !/kyv-agent-runs\/<|date \+%F|cd \/Users|LogiPluginService/.test(text));
}

/* ---- a temporary worktree and runs folder ------------------------------ */

const TMP = mkdtempSync(path.join(tmpdir(), "kyv-agent-run-"));
const WT = path.join(TMP, "worktree");
const RUNS = path.join(TMP, "runs");
const MARK = path.join(TMP, "refreshed.txt");
mkdirSync(path.join(WT, "scripts"), { recursive: true });
mkdirSync(path.join(WT, "src", "lib"), { recursive: true });
for (const f of ["scripts/agent-run-log.ts", "scripts/env-local.ts", "src/lib/agent-budget.ts"]) {
  copyFileSync(path.join(ROOT, f), path.join(WT, f));
}
writeFileSync(
  path.join(WT, "scripts", "agent-worktree.sh"),
  `#!/bin/sh
echo refresh >> "$KYV_TEST_MARK"
if [ "\${KYV_TEST_REFRESH_FAIL:-}" = 1 ]; then echo "agent-worktree: stub failure" >&2; exit 1; fi
echo "agent worktree ready at $KYV_AGENT_WORKTREE (stub000)"
`,
);
writeFileSync(
  path.join(WT, "scripts", "candidate-leads.ts"),
  `import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const input = readFileSync(0, "utf8");
const sleep = Number(process.env.KYV_STUB_SLEEP || 0);
if (process.env.KYV_STUB_CHILD) {
  const { spawn } = await import("node:child_process");
  spawn(process.execPath, ["-e", "setTimeout(() => require('node:fs').writeFileSync(process.env.KYV_STUB_CHILD, 'x'), 2000)"], { stdio: "ignore" });
}
if (sleep) await new Promise((r) => setTimeout(r, sleep * 1000));
if (process.env.KYV_STUB_FAIL) {
  console.error("stub: failing as asked");
  process.exit(1);
}
console.log(JSON.stringify({ args, input }));
console.error("stub " + args[0] + ": summary line");
`,
);

/* No inherited environment: the run log must find no database. */
const ENV = {
  PATH: process.env.PATH ?? "/usr/bin:/bin",
  HOME: TMP,
  KYV_AGENT_WORKTREE: WT,
  KYV_AGENT_RUNS: RUNS,
  KYV_AGENT_NODE: process.execPath,
  KYV_TEST_MARK: MARK,
  NEXT_PUBLIC_SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
};

function run(args, extra = {}) {
  const started = Date.now();
  const r = spawnSync("sh", [WRAPPER, ...args], { env: { ...ENV, ...extra }, encoding: "utf8", timeout: 120_000 });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}`, stdout: r.stdout ?? "", ms: Date.now() - started };
}
const refreshes = () => (existsSync(MARK) ? readFileSync(MARK, "utf8").trim().split("\n").filter(Boolean).length : 0);

/* Every file under the worktree, with size and mtime: nothing may change. */
function snapshot(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const s = statSync(p);
        out.push(`${path.relative(dir, p)} ${s.size} ${s.mtimeMs}`);
      }
    }
  };
  walk(dir);
  return out.sort().join("\n");
}
const before = snapshot(WT);

try {
  /* ---- refusals: exit 2 ------------------------------------------------ */
  for (const [name, args] of [
    ["no step", ["R5"]],
    ["an unknown agent", ["R9", "start"]],
    ["an agent name with shell characters", ["R5;rm", "start"]],
    ["an unknown step", ["R5", "bogus"]],
    ["a step from another agent's rows", ["R5", "stale"]],
    ["start for watch", ["watch", "start"]],
    ["start for R1 (the cron)", ["R1", "start"]],
    ["--status on a step that is not finish", ["R5", "prep", "--status", "ok"]],
    ["an unknown flag", ["R5", "finish", "--status", "ok", "--force"]],
    ["finish without --status", ["R5", "finish"]],
    ["finish with an unknown status", ["R5", "finish", "--status", "great"]],
    ["finish with items that are not a number", ["R5", "finish", "--status", "ok", "--items", "3x"]],
  ]) {
    const r = run(args);
    check(`${name} exits 2`, r.code === 2, `${r.code}: ${r.out}`);
  }

  /* ---- before start: exit 5 -------------------------------------------- */
  for (const args of [["R5", "prep"], ["R5", "budget"], ["R5", "finish", "--status", "ok"]]) {
    const r = run(args);
    check(`${args.join(" ")} before start exits 5`, r.code === 5 && r.out.includes("no active run: call start"), `${r.code}: ${r.out}`);
  }

  /* ---- start ----------------------------------------------------------- */
  const t0 = Math.floor(Date.now() / 1000);
  const s1 = run(["R5", "start"]);
  check("start exits 0 even though the run log cannot be written", s1.code === 0, `${s1.code}: ${s1.out}`);
  check("start prints the date", /^date: \d{4}-\d{2}-\d{2}$/m.test(s1.out), s1.out);
  const day = s1.out.match(/^date: (\S+)$/m)?.[1];
  check("start prints today's report path in RunReports",
    s1.out.includes(`report: /Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/Civic Awareness (Know Your Vote)/Agents/RunReports/${day}-R5.md`), s1.out);
  check("start prints the worktree line", /^worktree: agent worktree ready at /m.test(s1.out), s1.out);
  check("start prints R5's budget", /^budget: 45 min, until \S+; web calls: 25 WebFetch$/m.test(s1.out), s1.out);
  check("start warns that the run log was not written", s1.out.includes("warning: run log not written"), s1.out);
  const dir1 = path.join(RUNS, day ?? "?", "R5");
  check("start prints the run dir", s1.out.includes(`run dir: ${dir1}\n`), s1.out);
  check("start refreshed the worktree once", refreshes() === 1, String(refreshes()));
  check("start points current-R5 at the run dir", existsSync(path.join(RUNS, "current-R5")) &&
    readFileSync(path.join(RUNS, "current-R5"), "utf8").trim() === dir1);
  const deadline = Number(readFileSync(path.join(dir1, "deadline"), "utf8").trim());
  check("the deadline is 45 minutes out", deadline >= t0 + 45 * 60 - 1 && deadline <= t0 + 45 * 60 + 60, String(deadline - t0));
  check("start writes no run-id when the log could not be written", !existsSync(path.join(dir1, "run-id")));

  const again = run(["R5", "start"]);
  check("a second R5 start inside the budget exits 6 before refreshing", again.code === 6 && refreshes() === 1, `${again.code}: ${again.out}`);

  /* ---- the R5 steps ---------------------------------------------------- */
  const prep = run(["R5", "prep"]);
  const stories = existsSync(path.join(dir1, "stories.json")) ? JSON.parse(readFileSync(path.join(dir1, "stories.json"), "utf8")) : null;
  check("prep runs candidate-leads.ts prep --days 14 into stories.json",
    prep.code === 0 && JSON.stringify(stories?.args) === JSON.stringify(["prep", "--days", "14"]) && stories?.input === "", `${prep.code}: ${prep.out}`);
  check("prep prints the script's summary and the output path",
    prep.out.includes("stub prep: summary line") && prep.out.includes(`output: ${dir1}/stories.json`), prep.out);

  const noInput = run(["R5", "check"]);
  check("check without mentions.json exits 1 naming the file", noInput.code === 1 && noInput.out.includes(`missing input ${dir1}/mentions.json`),
    `${noInput.code}: ${noInput.out}`);
  writeFileSync(path.join(dir1, "mentions.json"), '[{"name":"x"}]\n');
  const chk = run(["R5", "check"]);
  const leads = existsSync(path.join(dir1, "leads.json")) ? JSON.parse(readFileSync(path.join(dir1, "leads.json"), "utf8")) : null;
  check("check feeds mentions.json on stdin and names stories.json in the run dir",
    chk.code === 0 && JSON.stringify(leads?.args) === JSON.stringify(["check", "--stories", `${dir1}/stories.json`]) &&
      leads?.input === '[{"name":"x"}]\n', `${chk.code}: ${chk.out}`);

  writeFileSync(path.join(dir1, "verified.json"), "[]\n");
  const dry = run(["R5", "queue-dry"]);
  const dryOut = existsSync(path.join(dir1, "queue-dry.txt")) ? JSON.parse(readFileSync(path.join(dir1, "queue-dry.txt"), "utf8")) : null;
  check("queue-dry runs queue --dry-run on verified.json", dry.code === 0 && JSON.stringify(dryOut?.args) === '["queue","--dry-run"]' &&
    dryOut?.input === "[]\n", `${dry.code}: ${dry.out}`);
  const q = run(["R5", "queue"]);
  const qOut = existsSync(path.join(dir1, "queue.txt")) ? JSON.parse(readFileSync(path.join(dir1, "queue.txt"), "utf8")) : null;
  check("queue runs queue on verified.json", q.code === 0 && JSON.stringify(qOut?.args) === '["queue"]', `${q.code}: ${q.out}`);

  const failing = run(["R5", "prep"], { KYV_STUB_FAIL: "1" });
  check("a failing script exits 1 and its message is shown", failing.code === 1 && failing.out.includes("stub: failing as asked"),
    `${failing.code}: ${failing.out}`);

  const orphan = path.join(TMP, "orphan.txt");
  const slow = run(["R5", "prep"], { KYV_AGENT_STEP_TIMEOUT: "1", KYV_STUB_SLEEP: "20", KYV_STUB_CHILD: orphan });
  check("a step that outlives its timeout exits 4, promptly", slow.code === 4 && slow.ms < 10_000 && slow.out.includes("timed out"),
    `${slow.code} after ${slow.ms} ms: ${slow.out}`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
  check("the timeout also stops the processes the step started", !existsSync(orphan));

  const budget = run(["R5", "budget"]);
  check("budget prints the minutes left", budget.code === 0 && /^budget: 4[45] min left$/m.test(budget.out), budget.out);

  /* ---- the deadline ---------------------------------------------------- */
  writeFileSync(path.join(dir1, "deadline"), `${Math.floor(Date.now() / 1000) - 10}\n`);
  const late = run(["R5", "prep"]);
  check("a step after the deadline exits 3", late.code === 3 && late.out.includes("budget exhausted: write the run report and stop"),
    `${late.code}: ${late.out}`);
  const lateBudget = run(["R5", "budget"]);
  check("budget after the deadline prints 0 min left", lateBudget.code === 0 && lateBudget.out.includes("budget: 0 min left"), lateBudget.out);
  const fin = run(["R5", "finish", "--status", "failed", "--items", "0"]);
  check("finish after the deadline still records and exits 0", fin.code === 0 && fin.out.includes("finished: R5 failed, 0 item(s)"),
    `${fin.code}: ${fin.out}`);
  check("finish warns that there is no run record", fin.out.includes("no run record to finish"), fin.out);
  check("finish removes the pointer", !existsSync(path.join(RUNS, "current-R5")));
  check("a step after finish exits 5", run(["R5", "prep"]).code === 5);

  /* ---- a second run that day, and the shared worktree ------------------ */
  const s2 = run(["R5", "start"]);
  check("a second start the same day gets R5-2", s2.code === 0 && s2.out.includes(`run dir: ${dir1}-2\n`), s2.out);
  check("and refreshes again", refreshes() === 2, String(refreshes()));
  const r3 = run(["R3", "start"]);
  check("another agent's start skips the refresh while R5 is inside its budget",
    r3.code === 0 && r3.out.includes("worktree: refresh skipped while R5 is running inside its budget") && refreshes() === 2,
    `${r3.code}: ${r3.out}`);
  check("R3's start prints R3's budget", /^budget: 40 min, until \S+; web calls: 30 WebSearch \+ WebFetch$/m.test(r3.out), r3.out);
  check("R3 has no rows yet in PR A", run(["R3", "context"]).code === 2);
  check("finish R3", run(["R3", "finish", "--status", "ok_empty"]).code === 0);
  check("finish R5", run(["R5", "finish", "--status", "ok", "--items", "2"]).code === 0);

  writeFileSync(path.join(RUNS, "current-R2"), `${path.join(RUNS, "old", "R2")}\n`);
  mkdirSync(path.join(RUNS, "old", "R2"), { recursive: true });
  writeFileSync(path.join(RUNS, "old", "R2", "deadline"), `${Math.floor(Date.now() / 1000) - 60}\n`);
  const r2 = run(["R2", "start"]);
  check("a pointer past its deadline neither blocks a new start nor the refresh",
    r2.code === 0 && refreshes() === 3 && r2.out.includes("worktree: agent worktree ready at"), `${r2.code}: ${r2.out}`);
  check("finish R2", run(["R2", "finish", "--status", "ok_empty"]).code === 0);

  const broken = run(["R4", "start"], { KYV_TEST_REFRESH_FAIL: "1" });
  check("a failed refresh exits 1 and leaves no pointer",
    broken.code === 1 && broken.out.includes("agent worktree refresh failed") && !existsSync(path.join(RUNS, "current-R4")),
    `${broken.code}: ${broken.out}`);

  /* ---- watch: no pointer, never a refresh ------------------------------ */
  const marks = refreshes();
  const stale = run(["watch", "stale"]);
  check("watch stale runs with no pointer and only warns without a database", stale.code === 0 && stale.out.includes("warning: run log not written"),
    `${stale.code}: ${stale.out}`);
  const noRuns = run(["watch", "check"]);
  check("watch check without runs.json exits 1", noRuns.code === 1 && noRuns.out.includes("runs.json"), `${noRuns.code}: ${noRuns.out}`);

  const runsFile = path.join(RUNS, "watch", "runs.json");
  writeFileSync(runsFile, "[]\n");
  const firstWatch = run(["watch", "check"]);
  check("the first watch check prints the install line", firstWatch.code === 0 &&
    firstWatch.stdout.includes("NOTIFY: watchdog installed: notifications work"), `${firstWatch.code}: ${firstWatch.out}`);
  check("and creates notified.txt", existsSync(path.join(RUNS, "watch", "notified.txt")));
  const quiet = run(["watch", "check"]);
  check("a second check with nothing stuck prints no NOTIFY line", quiet.code === 0 && !quiet.stdout.includes("NOTIFY"), quiet.out);

  const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  writeFileSync(runsFile, JSON.stringify([
    { task_id: "cap-r3-election-news", session_id: "local_stuck1", status: "running", started_at: hoursAgo(3), last_activity_at: hoursAgo(2.9) },
    { task_id: "cap-r5-candidate-leads", session_id: "local_fresh1", status: "running", started_at: hoursAgo(0.2), last_activity_at: null },
    { task_id: "cap-r2-contact-refresher", session_id: "local_done1", status: "succeeded", started_at: hoursAgo(9), last_activity_at: hoursAgo(8.9) },
  ]));
  const stuck = run(["watch", "check"]);
  const notifyLines = stuck.stdout.split("\n").filter((l) => l.startsWith("NOTIFY: "));
  check("a stuck R3 run prints exactly one NOTIFY line naming it",
    stuck.code === 0 && notifyLines.length === 1 && notifyLines[0].includes("R3 (cap-r3-election-news)") && notifyLines[0].includes("local_stuck1"),
    stuck.out);
  check("its session is recorded in notified.txt", readFileSync(path.join(RUNS, "watch", "notified.txt"), "utf8").includes("local_stuck1\n"));
  const repeat = run(["watch", "check"]);
  check("the same stuck run is not pushed twice", repeat.code === 0 && !repeat.stdout.includes("NOTIFY"), repeat.out);

  writeFileSync(runsFile, '[{"task_id":"cap-r3-election-news","session_id":"a\\nb","status":"running","started_at":"2026-10-08T00:00:00Z"}]');
  const forged = run(["watch", "check"]);
  check("a session id that would forge a line refuses the file", forged.code === 1 && forged.out.includes("session_id"), forged.out);

  writeFileSync(runsFile, "[]\n");
  const old = new Date(Date.now() - 20 * 60_000);
  utimesSync(runsFile, old, old);
  const staleFile = run(["watch", "check"]);
  check("a runs.json older than 15 minutes exits 1", staleFile.code === 1 && staleFile.out.includes("min old"), staleFile.out);
  check("watch steps never refresh the worktree", refreshes() === marks, `${marks} -> ${refreshes()}`);

  /* ---- the worktree is never written ----------------------------------- */
  check("nothing was written inside the worktree", snapshot(WT) === before, snapshot(WT));
} finally {
  rmSync(TMP, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\nverify-agent-run: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-agent-run: OK — the table, refusals, start, steps, deadline, timeout, finish, watch and the clean worktree hold");
