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

import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTINE_AGENTS, STALE_SUMMARY } from "../src/lib/agent-budget.ts";

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
  "R5|prep|scripts/candidate-leads.ts|prep --days 14|-|stories.json|540",
  "R5|check|scripts/candidate-leads.ts|check --stories {dir}/stories.json|mentions.json|leads.json|300",
  "R5|queue-dry|scripts/candidate-leads.ts|queue --dry-run|verified.json|queue-dry.txt|300",
  "R5|queue|scripts/candidate-leads.ts|queue|verified.json|queue.txt|300",
  "watch|stale|scripts/agent-run-log.ts|stale|-|-|120",
  "watch|check|scripts/agent-run-log.ts|watch --runs {dir}/runs.json --notified {dir}/notified.txt|-|-|120",
  /* PR D (R2): `sites` and `context` read the database themselves, so no
     agent-written file chooses what they fetch or stamp; `sites` is 9 min,
     not the spec's 20, to fit the Bash ceiling. */
  "R2|context|scripts/logistics-check.ts|context|-|context.json|300",
  "R2|sites|scripts/logistics-check.ts|sites|-|sites.json|540",
  "R2|check|scripts/logistics-check.ts|check|observations.json|check.json|300",
  "R2|queue-dry|scripts/logistics-check.ts|queue --dry-run|observations.json|queue-dry.json|300",
  "R2|queue|scripts/logistics-check.ts|queue|observations.json|queue.json|300",
];
check("the table is PR A's and PR D's rows exactly (spec §3.1)", rows.map((r) => r.join("|")).join("\n") === want.join("\n"),
  rows.map((r) => r.join("|")).join("\n"));
/* Claude Code's Bash tool stops a command at 120 s by default and 600 s at
   most; the prompts ask for 600 s. Every wrapper call must end, with its own
   exit code, a minute inside that, or the harness kills it first and the
   agent never sees exit 4. */
const BASH_CEILING_S = 600;
const WRAPPER_MAX_S = BASH_CEILING_S - 60;
for (const [agent, step, , , , , secs] of rows) {
  check(`row ${agent} ${step}'s timeout leaves a minute under the Bash tool's ${BASH_CEILING_S} s`, Number(secs) <= WRAPPER_MAX_S, secs);
}
const refreshSecs = Number(SOURCE.match(/run_timed (\d+) sh "\$WT\/scripts\/agent-worktree\.sh"/)?.[1] ?? NaN);
const logStartSecs = Number(SOURCE.match(/node_script (\d+) "\$WT\/scripts\/agent-run-log\.ts" start /)?.[1] ?? NaN);
const logFinishSecs = Number(SOURCE.match(/node_script (\d+) "\$WT\/scripts\/agent-run-log\.ts" "\$@"/)?.[1] ?? NaN);
check(`start's refresh and run-log timeouts together leave a minute under ${BASH_CEILING_S} s`,
  refreshSecs + logStartSecs <= WRAPPER_MAX_S, `${refreshSecs} + ${logStartSecs}`);
check(`finish's run-log timeout leaves a minute under ${BASH_CEILING_S} s`, logFinishSecs <= WRAPPER_MAX_S, String(logFinishSecs));

const lastLine = SOURCE.trimEnd().split("\n").at(-1);
check('the last line is `main "$@"; exit $?`, so a refresh cannot feed the shell new lines', lastLine === 'main "$@"; exit $?', lastLine);
check("the literal defaults are the agent worktree, the runs folder and the arm64 node",
  SOURCE.includes('WT="${KYV_AGENT_WORKTREE:-/Users/jsloth/Projects/kyv-agent-worktree}"') &&
    SOURCE.includes('RUNS="${KYV_AGENT_RUNS:-/Users/jsloth/Projects/kyv-agent-runs}"') &&
    SOURCE.includes('NODE="${KYV_AGENT_NODE:-/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node}"'));

/* ---- the prompts run only the wrapper, with steps it has --------------- */

const COMMAND = /^\s*sh \/Users\/jsloth\/Projects\/kyv-agent-worktree\/scripts\/agent-run\.sh (\S+) (\S+)(.*)$/;
const PROMPTS = {
  "agents/r2-logistics.prompt.md": "R2",
  "agents/r5-candidate-leads.prompt.md": "R5",
  "agents/rw-watchdog.prompt.md": "watch",
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
  check(`${file} says to run every wrapper command with the Bash tool's timeout at 600000 ms`,
    /Bash tool's timeout set to 600000/.test(text.replace(/\s+/g, " ")));
  check(`${file} names no dated run folder, date call, cd or node path`,
    !/kyv-agent-runs\/<|date \+%F|cd \/Users|LogiPluginService/.test(text));
}

/* R5's exit-code list says what the wrapper's own messages say. */
{
  const r5 = readFileSync(path.join(ROOT, "agents/r5-candidate-leads.prompt.md"), "utf8").replace(/\s+/g, " ");
  const exitLine = (n) => r5.match(new RegExp(`- ${n}: (.*?)(?= - \\d: | BUDGET:)`))?.[1] ?? "";
  for (const n of [3, 4]) {
    check(`R5's prompt says exit ${n} means finish with --status failed, as the wrapper prints`,
      exitLine(n).includes("finish with --status failed"), exitLine(n));
  }
  check("R5's prompt names the queue-dry retry and the failed start beside exit 1's fail closed",
    exitLine(1).includes("queue-dry") && exitLine(1).includes("start"), exitLine(1));
  check("R5's prompt keeps 5 minutes back for queue-dry and queue while verifying",
    r5.includes("5 min or less left") && r5.includes('"time budget reached"'));
  check("R5's prompt says exit 6 also covers a previous run past its budget that has not finished",
    exitLine(6).includes("has not called finish"), exitLine(6));
}

/* R2's prompt: the same exit-code contract, its eight-fetch cap, its hosts
   (spec §3.3), and no contact collection (spec §3.6: after Nov 3, PR E). */
{
  const r2 = readFileSync(path.join(ROOT, "agents/r2-logistics.prompt.md"), "utf8").replace(/\s+/g, " ");
  const exitLine = (n) => r2.match(new RegExp(`- ${n}: (.*?)(?= - \\d: | BUDGET:)`))?.[1] ?? "";
  for (const n of [3, 4]) {
    check(`R2's prompt says exit ${n} means finish with --status failed, as the wrapper prints`,
      exitLine(n).includes("finish with --status failed"), exitLine(n));
  }
  check("R2's prompt names the check retry and the failed start beside exit 1's fail closed",
    exitLine(1).includes("check") && exitLine(1).includes("start"), exitLine(1));
  check("R2's prompt says exit 6 also covers a previous run past its budget that has not finished",
    exitLine(6).includes("has not called finish"), exitLine(6));
  check("R2's prompt caps WebFetch at 8", r2.includes("8 WebFetch calls"));
  for (const host of ["dos.fl.gov", "browardvotes.gov", "www.votehillsborough.gov", "www.miamidade.gov", "voteorangefl.gov", "www.votemiamidade.gov", "www.browardvotes.gov"]) {
    check(`R2's prompt lists ${host} among the hosts it may fetch`, r2.includes(host));
  }
  check("R2's prompt forbids contact collection and never asks for a phone, email or address",
    r2.includes("Never collect contact details") && !/phone|e-?mail|mailto|tel:|mailing address/i.test(r2));
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
if [ "\${KYV_TEST_REFRESH_SILENT:-}" = 1 ]; then echo "agent-worktree: stub said nothing"; exit 0; fi
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
if (process.env.KYV_STUB_DONE) (await import("node:fs")).writeFileSync(process.env.KYV_STUB_DONE, "done");
if (process.env.KYV_STUB_FAIL) {
  console.error("stub: failing as asked");
  process.exit(1);
}
console.log(JSON.stringify({ args, input }));
console.error("stub " + args[0] + ": summary line");
`,
);

/* A second worktree whose run log writes no deadline: start must refuse. */
const WT_NODEADLINE = path.join(TMP, "worktree-nodeadline");
mkdirSync(path.join(WT_NODEADLINE, "scripts"), { recursive: true });
copyFileSync(path.join(WT, "scripts", "agent-worktree.sh"), path.join(WT_NODEADLINE, "scripts", "agent-worktree.sh"));
writeFileSync(path.join(WT_NODEADLINE, "scripts", "agent-run-log.ts"), 'console.log("budget: stub, no deadline written");\n');

/* The run log's database code runs against a fake PostgREST server (a child
   process, since spawnSync blocks this one), so its filters are checked
   without a database. The worktree links the repo's node_modules for the
   client; with the database variables empty it is never imported. */
symlinkSync(path.join(ROOT, "node_modules"), path.join(WT, "node_modules"));
const FAKE_ID = "11111111-2222-4333-8444-555555555555";
const FAKE_DB = path.join(TMP, "fake-db.mjs");
const FAKE_LOG = path.join(TMP, "fake-db.log");
const FAKE_PORT = path.join(TMP, "fake-db.port");
writeFileSync(
  FAKE_DB,
  `import { createServer } from "node:http";
import { appendFileSync, writeFileSync } from "node:fs";
const [log, portFile] = process.argv.slice(2);
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    appendFileSync(log, JSON.stringify({ method: req.method, url: req.url, body }) + "\\n");
    res.setHeader("content-type", "application/json");
    if (req.method === "POST") {
      res.statusCode = 201;
      const one = String(req.headers.accept ?? "").includes("vnd.pgrst.object");
      res.end(JSON.stringify(one ? { id: "${FAKE_ID}" } : [{ id: "${FAKE_ID}" }]));
    } else {
      res.statusCode = 200;
      res.end("[]");
    }
  });
});
server.listen(0, "127.0.0.1", () => writeFileSync(portFile, String(server.address().port)));
`,
);
const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function fakeRequests() {
  if (!existsSync(FAKE_LOG)) return [];
  const reqs = readFileSync(FAKE_LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  rmSync(FAKE_LOG);
  return reqs.map((r) => {
    const u = new URL(r.url, "http://x");
    return { method: r.method, path: u.pathname, params: Object.fromEntries(u.searchParams), body: r.body ? JSON.parse(r.body) : null };
  });
}

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
        const s = lstatSync(p);
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
    ["an agent name with a space that spans two routine agents", ["R2 R3", "start"]],
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
    check(`${name} never refreshes the worktree`, refreshes() === 0, String(refreshes()));
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
  const held = existsSync(path.join(dir1, "held-until")) ? Number(readFileSync(path.join(dir1, "held-until"), "utf8").trim()) : NaN;
  check("start holds the run until twice its budget, when the watchdog calls it stuck", held === deadline + 45 * 60, String(held - deadline));

  const again = run(["R5", "start"]);
  check("a second R5 start inside the budget exits 6 before refreshing, saying the run is inside its budget",
    again.code === 6 && again.out.includes("still inside its budget") && refreshes() === 1, `${again.code}: ${again.out}`);

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
  check("a step that outlives its timeout exits 4, promptly, and says to finish failed",
    slow.code === 4 && slow.ms < 10_000 && slow.out.includes("timed out after 1 s: write the run report and finish with --status failed"),
    `${slow.code} after ${slow.ms} ms: ${slow.out}`);
  sleepMs(3000);
  check("the timeout also stops the processes the step started", !existsSync(orphan));

  /* The harness may kill the wrapper's process group when its Bash call
     times out. The step it was running must die with it, or a queue the
     agent was told failed could still write rows after its report. */
  const done = path.join(TMP, "killed-step-done.txt");
  const killed = spawn("sh", [WRAPPER, "R5", "prep"], {
    env: { ...ENV, KYV_STUB_SLEEP: "3", KYV_STUB_DONE: done },
    detached: true,
    stdio: "ignore",
  });
  sleepMs(1500);
  try {
    process.kill(-killed.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
  sleepMs(4500);
  check("a step whose wrapper is killed by process group does not run on", !existsSync(done));

  const budget = run(["R5", "budget"]);
  check("budget prints the minutes left", budget.code === 0 && /^budget: 4[45] min left$/m.test(budget.out), budget.out);

  /* ---- the deadline ---------------------------------------------------- */
  writeFileSync(path.join(dir1, "deadline"), `${Math.floor(Date.now() / 1000) - 10}\n`);
  const late = run(["R5", "prep"]);
  check("a step after the deadline exits 3 and says to finish failed, as the prompt does",
    late.code === 3 && late.out.includes("budget exhausted: write the run report and finish with --status failed"), `${late.code}: ${late.out}`);
  const lateBudget = run(["R5", "budget"]);
  check("budget after the deadline prints 0 min left and says to finish failed", lateBudget.code === 0 &&
    lateBudget.out.includes("budget: 0 min left: budget exhausted: write the run report and finish with --status failed"), lateBudget.out);
  /* The old session may still be writing its report before its finish; a new
     run taking the pointer now would be ended by that late finish. */
  const lateStart = run(["R5", "start"]);
  check("a start while the previous run is past its deadline but unfinished exits 6, before refreshing",
    lateStart.code === 6 && lateStart.out.includes("has not called finish") && refreshes() === 1, `${lateStart.code}: ${lateStart.out}`);
  check("and leaves the previous run's pointer alone",
    readFileSync(path.join(RUNS, "current-R5"), "utf8").trim() === dir1);
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
    r3.code === 0 && r3.out.includes("worktree: refresh skipped while an R5 run may still be running") && refreshes() === 2,
    `${r3.code}: ${r3.out}`);
  check("R3's start prints R3's budget", /^budget: 40 min, until \S+; web calls: 30 WebSearch \+ WebFetch$/m.test(r3.out), r3.out);
  check("R3 has no rows yet in PR A", run(["R3", "context"]).code === 2);
  check("finish R3", run(["R3", "finish", "--status", "ok_empty"]).code === 0);
  check("finish R5", run(["R5", "finish", "--status", "ok", "--items", "2"]).code === 0);

  writeFileSync(path.join(RUNS, "current-R2"), `${path.join(RUNS, "old", "R2")}\n`);
  mkdirSync(path.join(RUNS, "old", "R2"), { recursive: true });
  writeFileSync(path.join(RUNS, "old", "R2", "deadline"), `${Math.floor(Date.now() / 1000) - 120}\n`);
  writeFileSync(path.join(RUNS, "old", "R2", "held-until"), `${Math.floor(Date.now() / 1000) - 60}\n`);
  const r2 = run(["R2", "start"]);
  check("a pointer past its hold neither blocks a new start nor the refresh",
    r2.code === 0 && refreshes() === 3 && r2.out.includes("worktree: agent worktree ready at"), `${r2.code}: ${r2.out}`);
  check("finish R2", run(["R2", "finish", "--status", "ok_empty"]).code === 0);

  writeFileSync(path.join(RUNS, "current-R2"), `${path.join(RUNS, "older", "R2")}\n`);
  mkdirSync(path.join(RUNS, "older", "R2"), { recursive: true });
  writeFileSync(path.join(RUNS, "older", "R2", "deadline"), `${Math.floor(Date.now() / 1000) - 60}\n`);
  const noHold = run(["R2", "start"]);
  check("a run folder with no held-until is held only to its deadline", noHold.code === 0, `${noHold.code}: ${noHold.out}`);
  check("finish R2 again", run(["R2", "finish", "--status", "ok_empty"]).code === 0);

  /* Past its deadline a step that started just before it can still run, so
     the refresh waits for the other agent's hold, not its deadline. */
  writeFileSync(path.join(RUNS, "current-R2"), `${path.join(RUNS, "late", "R2")}\n`);
  mkdirSync(path.join(RUNS, "late", "R2"), { recursive: true });
  writeFileSync(path.join(RUNS, "late", "R2", "deadline"), `${Math.floor(Date.now() / 1000) - 60}\n`);
  writeFileSync(path.join(RUNS, "late", "R2", "held-until"), `${Math.floor(Date.now() / 1000) + 3600}\n`);
  const marksBeforeLate = refreshes();
  const r4late = run(["R4", "start"]);
  check("another agent's start skips the refresh while an R2 run is past its deadline but inside its hold",
    r4late.code === 0 && r4late.out.includes("refresh skipped while an R2 run may still be running") && refreshes() === marksBeforeLate,
    `${r4late.code}: ${r4late.out}`);
  check("finish R4", run(["R4", "finish", "--status", "ok_empty"]).code === 0);
  rmSync(path.join(RUNS, "current-R2"));

  const silent = run(["R4", "start"], { KYV_TEST_REFRESH_SILENT: "1" });
  check("a refresh that exits 0 without its ready line exits 1 and leaves no pointer",
    silent.code === 1 && silent.out.includes("agent worktree refresh failed") && !existsSync(path.join(RUNS, "current-R4")),
    `${silent.code}: ${silent.out}`);

  const noDeadline = run(["R4", "start"], { KYV_AGENT_WORKTREE: WT_NODEADLINE });
  check("a start whose run log wrote no deadline exits 1 and leaves no pointer",
    noDeadline.code === 1 && noDeadline.out.includes("could not set this run's deadline") && !existsSync(path.join(RUNS, "current-R4")),
    `${noDeadline.code}: ${noDeadline.out}`);

  mkdirSync(path.join(RUNS, "bare", "R5"), { recursive: true });
  writeFileSync(path.join(RUNS, "current-R5"), `${path.join(RUNS, "bare", "R5")}\n`);
  const bare = run(["R5", "prep"]);
  check("a step in a run folder with no deadline exits 3 and runs nothing",
    bare.code === 3 && !existsSync(path.join(RUNS, "bare", "R5", "stories.json")), `${bare.code}: ${bare.out}`);
  rmSync(path.join(RUNS, "current-R5"));

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
  /* Claude Code's Write tool will not overwrite a file the session has not
     Read, and the watchdog may not Read. So check moves runs.json aside and
     every hourly Write creates a new file. */
  const lastRuns = path.join(RUNS, "watch", "runs.last.json");
  check("check moves runs.json aside, so the next run's Write creates a new file",
    !existsSync(runsFile) && existsSync(lastRuns) && readFileSync(lastRuns, "utf8") === "[]\n");
  writeFileSync(runsFile, "[]\n");
  const quiet = run(["watch", "check"]);
  check("a second check with nothing stuck prints no NOTIFY line", quiet.code === 0 && !quiet.stdout.includes("NOTIFY"), quiet.out);

  const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();
  writeFileSync(runsFile, JSON.stringify([
    { task_id: "cap-r3-election-news", session_id: "local_stuck1", status: "running", started_at: hoursAgo(3), last_activity_at: hoursAgo(2.9) },
    { task_id: "cap-r5-candidate-leads", session_id: "local_fresh1", status: "running", started_at: hoursAgo(0.2), last_activity_at: null },
    { task_id: "cap-r2-contact-refresher", session_id: "local_done1", status: "succeeded", started_at: hoursAgo(9), last_activity_at: hoursAgo(8.9) },
  ]));
  const stuckRuns = readFileSync(runsFile, "utf8");
  const stuck = run(["watch", "check"]);
  const notifyLines = stuck.stdout.split("\n").filter((l) => l.startsWith("NOTIFY: "));
  check("a stuck R3 run prints exactly one NOTIFY line naming it",
    stuck.code === 0 && notifyLines.length === 1 && notifyLines[0].includes("R3 (cap-r3-election-news)") && notifyLines[0].includes("local_stuck1"),
    stuck.out);
  check("its session is recorded in notified.txt", readFileSync(path.join(RUNS, "watch", "notified.txt"), "utf8").includes("local_stuck1\n"));
  writeFileSync(runsFile, stuckRuns);
  const repeat = run(["watch", "check"]);
  check("the same stuck run is not pushed twice", repeat.code === 0 && !repeat.stdout.includes("NOTIFY"), repeat.out);

  writeFileSync(runsFile, JSON.stringify([
    { task_id: "cap-r3-election-news", session_id: "a\nb", status: "running", started_at: hoursAgo(3) },
    { task_id: "cap-r2-contact-refresher", status: "running", started_at: hoursAgo(5) },
    { task_id: "cap-r5-candidate-leads", session_id: "local_stuck2", status: "running", started_at: hoursAgo(4), last_activity_at: null },
  ]));
  const forged = run(["watch", "check"]);
  const forgedLines = forged.stdout.split("\n").filter((l) => l.startsWith("NOTIFY: "));
  check("bad rows are skipped and named, and the good stuck row is still pushed",
    forged.code === 0 && forgedLines.length === 1 && forgedLines[0].includes("local_stuck2") &&
      forged.out.includes("skipped run 0: session_id") && forged.out.includes("skipped run 1: session_id") && forged.out.includes("2 skipped"),
    forged.out);
  check("a skipped row's session id never reaches notified.txt",
    !readFileSync(path.join(RUNS, "watch", "notified.txt"), "utf8").includes("a\nb"));

  writeFileSync(runsFile, "[]\n");
  const old = new Date(Date.now() - 20 * 60_000);
  utimesSync(runsFile, old, old);
  const staleFile = run(["watch", "check"]);
  check("a runs.json older than 15 minutes exits 1", staleFile.code === 1 && staleFile.out.includes("min old"), staleFile.out);
  check("and is moved aside too, so the next hour's Write is not refused", !existsSync(runsFile));
  writeFileSync(runsFile, "not json");
  const badJson = run(["watch", "check"]);
  check("a runs.json that is not JSON exits 1 and is moved aside",
    badJson.code === 1 && badJson.out.includes("not valid JSON") && !existsSync(runsFile), badJson.out);
  writeFileSync(runsFile, "[]\n");
  const leftover = run(["watch", "stale"]);
  check("watch stale moves aside a runs.json an earlier run wrote but never checked",
    leftover.code === 0 && !existsSync(runsFile) && readFileSync(lastRuns, "utf8") === "[]\n", leftover.out);
  check("watch steps never refresh the worktree", refreshes() === marks, `${marks} -> ${refreshes()}`);

  /* ---- the run log's database writes, against a fake server ------------ */
  const fake = spawn(process.execPath, [FAKE_DB, FAKE_LOG, FAKE_PORT], { stdio: "ignore" });
  try {
    for (let i = 0; i < 50 && !existsSync(FAKE_PORT); i++) sleepMs(100);
    const port = existsSync(FAKE_PORT) ? readFileSync(FAKE_PORT, "utf8").trim() : "";
    check("the fake database server started", port !== "");
    const DB = { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${port}`, SUPABASE_SERVICE_ROLE_KEY: "test-key-not-real" };

    const before4 = Date.now();
    const dbStart = run(["R4", "start"], DB);
    const reqs = fakeRequests();
    check("start with a database exits 0 without a warning", dbStart.code === 0 && !dbStart.out.includes("warning"), `${dbStart.code}: ${dbStart.out}`);
    const stale4 = reqs.find((r) => r.method === "PATCH");
    const cutoff = Date.parse(String(stale4?.params.started_at ?? "").replace(/^lt\./, ""));
    check("start marks only R4's running rows older than R4's 20 min failed",
      stale4?.path === "/rest/v1/agent_run" && stale4.params.agent === "eq.R4" && stale4.params.status === "eq.running" &&
        Math.abs(cutoff - (before4 - 20 * 60_000)) < 60_000 &&
        JSON.stringify(stale4.body) === JSON.stringify({ status: "failed", summary: STALE_SUMMARY }),
      JSON.stringify(stale4));
    const insert = reqs.find((r) => r.method === "POST");
    check("start inserts one running R4 row",
      insert?.path === "/rest/v1/agent_run" && insert.body?.agent === "R4" && insert.body?.status === "running" &&
        Math.abs(Date.parse(insert.body?.started_at) - before4) < 60_000,
      JSON.stringify(insert));
    check("start makes exactly those two requests", reqs.length === 2, JSON.stringify(reqs));
    const dir4 = readFileSync(path.join(RUNS, "current-R4"), "utf8").trim();
    check("start keeps the inserted row's id in run-id", readFileSync(path.join(dir4, "run-id"), "utf8").trim() === FAKE_ID);

    const dbFinish = run(["R4", "finish", "--status", "ok", "--items", "3"], DB);
    const fin4 = fakeRequests();
    check("finish with a database exits 0 without a warning", dbFinish.code === 0 && !dbFinish.out.includes("warning"), `${dbFinish.code}: ${dbFinish.out}`);
    check("finish updates this run's row only, by its id",
      fin4.length === 1 && fin4[0].method === "PATCH" && fin4[0].path === "/rest/v1/agent_run" &&
        JSON.stringify(Object.keys(fin4[0].params)) === '["id"]' && fin4[0].params.id === `eq.${FAKE_ID}`,
      JSON.stringify(fin4));
    check("finish writes the status, the items and the report path",
      fin4[0]?.body?.status === "ok" && fin4[0]?.body?.items_written === 3 && String(fin4[0]?.body?.report_path).endsWith("-R4.md") &&
        typeof fin4[0]?.body?.finished_at === "string",
      JSON.stringify(fin4[0]?.body));

    const dbStale = run(["watch", "stale"], DB);
    const staleReqs = fakeRequests();
    check("watch stale marks each routine agent's own running rows, one request each",
      dbStale.code === 0 && staleReqs.length === ROUTINE_AGENTS.length &&
        ROUTINE_AGENTS.every((a) => staleReqs.some((r) => r.method === "PATCH" && r.params.agent === `eq.${a}` && r.params.status === "eq.running" &&
          String(r.params.started_at).startsWith("lt."))),
      JSON.stringify(staleReqs));
  } finally {
    fake.kill("SIGKILL");
  }

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
