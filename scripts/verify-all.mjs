/* Run every scripts/verify-*.ts and scripts/verify-*.mjs, and say plainly
   what passed, what failed and what could not run.

   Launch handoff §7, the CI item (founder decision 13; see
   docs/general-election/launch-handoff-2026-10-04.md). Before this, only
   Vercel ran on a pull request, so none of these scripts gated a merge. This
   runner is what `npm run verify` and .github/workflows/ci.yml call; docs/ci.md
   describes both.

   Each script ends in one of three states:

   - PASS: it exited 0.
   - FAIL: any other exit, a crash or a timeout. One FAIL makes the runner
     exit 1.
   - SKIPPED (needs env): the script stopped because a live-database variable
     is missing. The live scripts (verify-admin-ops, verify-news-neutrality,
     verify-refresh-schema) share one fail-closed guard,
     requireEnvOrFailClosed, which prints
       FAIL  environment: NAME is not set (...)
     and exits 1. That line is the signal, and it counts only when it is the
     ONLY FAIL line the script printed: a script that failed a real check
     before it reached the guard is a failure, not a skip. Skips are listed in
     their own block, raised as warnings in GitHub Actions and counted in the
     summary. They do not fail the run, because a pull request from a fork,
     or a laptop with no .env.local, cannot reach the database; that is
     different from the code being wrong.

   One script degrades on its own: verify-notifications-schema.mjs runs its
   dry-run checks and prints "(skipping live probes ...)" when the env is
   missing. It passes, and is listed as "offline checks only" so that it is
   still visible.

   Write probes are opt-in. Three live scripts write, or try to write, probe
   rows once they hold SUPABASE_SERVICE_ROLE_KEY, and each loads .env.local
   itself, where .env.example tells a developer to put that key. The only
   Supabase project is production. So the runner hands every child an empty
   SUPABASE_SERVICE_ROLE_KEY unless --allow-write-probes is passed, and
   refuses that flag for the production project. "Write probes" below says
   how and why.

   Discovery is by file name, so a new verify script is picked up with no
   edit here. VARIANTS lists extra invocations: verify-news-neutrality.ts has
   an offline --self-test mode, and that runs on every pull request even when
   the live lint is skipped.

   Scripts that boot embedded Postgres (@electric-sql/pglite) take about half
   a gigabyte each, so they share one lane and run one after another while
   the light scripts share the rest. Four at once was enough for the
   out-of-memory killer on a busy 16 GB machine.

   Usage:
     node scripts/verify-all.mjs             every verify script
     node scripts/verify-all.mjs news        only scripts whose name has "news"
     node scripts/verify-all.mjs --live      only scripts that read the live DB
     node scripts/verify-all.mjs --python    the Python unit tests instead
     node scripts/verify-all.mjs --jobs 1    one at a time (default: up to 4)
     node scripts/verify-all.mjs --allow-write-probes
                                             pass SUPABASE_SERVICE_ROLE_KEY on;
                                             refused for the production project

   The Python tests live under "Civic Awareness (Know Your Vote)/", in folders
   with spaces and colons in their names, and none of those folders is a
   package. A single `unittest discover` from the top would only find the
   top-level file (Python 3.11 no longer descends into folders that are not
   packages), so --python runs discovery once per folder that holds a
   test_*.py, from inside that folder, which is also how each test expects to
   import the module beside it. They need only the standard library. */

import { spawn } from "node:child_process";
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCRIPTS = path.join(ROOT, "scripts");
const PYTHON_ROOT = path.join(ROOT, "Civic Awareness (Know Your Vote)");
const TIMEOUT_MS = 5 * 60 * 1000;
const IN_ACTIONS = process.env.GITHUB_ACTIONS === "true";

const VARIANTS = {
  "verify-news-neutrality.ts": [["--self-test"]],
};

const SELF = path.basename(fileURLToPath(import.meta.url));
const ENV_GUARD = /^FAIL\s+environment: (\S+) is not set/m;
const ANY_FAIL = /^FAIL\b/gm;
const LIVE_SKIPPED = /\bskipping live probes\b/i;

/* ---- arguments --------------------------------------------------------- */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const jobsAt = argv.indexOf("--jobs");
const jobs =
  jobsAt === -1
    ? Math.min(4, availableParallelism())
    : Math.max(1, Number(argv[jobsAt + 1]) || 1);
const filters = argv.filter(
  (a, i) => !a.startsWith("--") && !(jobsAt !== -1 && i === jobsAt + 1)
);

/* Never run inside itself. Discovery excludes this file by name, and this
   marker, set on every child, stops a renamed copy too: an early draft that
   matched its own name spawned itself recursively until memory ran out. */
if (process.env.KYV_VERIFY_ALL) {
  console.error("verify-all: refusing to run inside another verify-all run.");
  process.exit(1);
}

/* .ts scripts run on Node's built-in type stripping, which is on by default
   from 22.18. An older Node fails every one of them with a syntax error,
   which reads like 34 broken checks rather than one old runtime. */
const [major, minor] = process.versions.node.split(".").map(Number);
if (!flag("--python") && (major < 22 || (major === 22 && minor < 18))) {
  console.error(
    `verify-all needs Node 22.18 or later to run the .ts scripts; this is ${process.version}.`
  );
  process.exit(1);
}

/* ---- write probes -------------------------------------------------------

   With SUPABASE_SERVICE_ROLE_KEY, verify-admin-ops.mjs runs anon insert
   probes against the ops tables, verify-refresh-schema.mjs inserts and
   deletes news_item rows and tries anon inserts on news_item and
   candidate_contact, and verify-notifications-schema.mjs upserts and deletes
   a notification_send_log row. Each script loads .env.local itself, and
   .env.example lists the key beside the production URL. Run by name, that
   is a deliberate act; folded into `npm run verify`, it would be one command
   that writes to production on any laptop set up the documented way.

   So every child gets SUPABASE_SERVICE_ROLE_KEY="" by default.
   process.loadEnvFile leaves a variable that is already present alone, even
   an empty one, so the key in .env.local never reaches the script, and its
   own `if (!value)` guard reports the skip. Because that rests on a detail
   of loadEnvFile, the runner tests it first and refuses to run if it does
   not hold. CI never has the key; this makes a laptop match CI.

   --allow-write-probes passes the key on, for a development project. It is
   refused when the URL the scripts would use names the production project,
   whether that URL comes from the environment or from .env.local. The test
   is the project ref only; production has no other address today. */
const WRITE_KEY = "SUPABASE_SERVICE_ROLE_KEY";
const PRODUCTION_REF = "pqracitpmzpiqfnzlngw";
const ENV_LOCAL = path.join(ROOT, ".env.local");
const allowWrites = flag("--allow-write-probes");

/* What a child would see for `name` once it loads .env.local: the inherited
   value when the variable is present (even empty), else the file's. Values
   are only tested here, never printed. */
let fileEnv = null;
function effectiveEnv(name) {
  if (name in process.env) return process.env[name] ?? "";
  if (fileEnv === null) {
    try {
      fileEnv = parseEnv(readFileSync(ENV_LOCAL, "utf8"));
    } catch {
      fileEnv = {};
    }
  }
  return fileEnv[name] ?? "";
}

/* The detail everything above rests on, checked on this Node. */
function loadEnvFileKeepsEmptyVars() {
  const probe = `KYV_VERIFY_ALL_PROBE_${process.pid}`;
  let dir = null;
  try {
    dir = mkdtempSync(path.join(tmpdir(), "kyv-verify-all-"));
    const file = path.join(dir, "probe.env");
    writeFileSync(file, `${probe}=from-file\n`);
    process.env[probe] = "";
    process.loadEnvFile(file);
    return process.env[probe] === "";
  } catch {
    return false;
  } finally {
    delete process.env[probe];
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

const writeKeyFound = Boolean(effectiveEnv(WRITE_KEY));
const CHILD_ENV = allowWrites
  ? { ...process.env }
  : { ...process.env, [WRITE_KEY]: "" };

function guardWriteProbes() {
  if (allowWrites) {
    if (
      effectiveEnv("NEXT_PUBLIC_SUPABASE_URL")
        .toLowerCase()
        .includes(PRODUCTION_REF)
    ) {
      console.error(
        `verify-all: --allow-write-probes refused. NEXT_PUBLIC_SUPABASE_URL (from the\n` +
          `environment or ${path.relative(ROOT, ENV_LOCAL)}) is the production project, ${PRODUCTION_REF}.\n` +
          "The write probes insert and delete rows; point them at a development\n" +
          "project, or run without the flag. See docs/ci.md."
      );
      process.exit(1);
    }
    console.log(
      `verify-all: --allow-write-probes: ${WRITE_KEY} is passed on${writeKeyFound ? "" : " (none is set)"}; the project is not production.\n`
    );
    return;
  }
  if (!loadEnvFileKeepsEmptyVars()) {
    console.error(
      "verify-all: on this Node, process.loadEnvFile overwrites an empty variable,\n" +
        `so the runner cannot keep ${WRITE_KEY} in .env.local away from the\n` +
        "scripts that write probe rows. Refusing to run. See docs/ci.md."
    );
    process.exit(1);
  }
}

/* ---- running one command ----------------------------------------------- */

/* Children still running when the runner is interrupted are stopped with
   it, rather than left behind holding memory. */
const children = new Set();
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    for (const child of children) child.kill("SIGTERM");
    process.exit(sig === "SIGINT" ? 130 : 143);
  });
}

function run(command, args, cwd, env = CHILD_ENV) {
  return new Promise((resolve) => {
    const started = Date.now();
    const chunks = [];
    const child = spawn(command, args, {
      cwd,
      env: { ...env, KYV_VERIFY_ALL: "1" },
      timeout: TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(child);
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => chunks.push(c));
    child.on("error", (err) => chunks.push(Buffer.from(`${err.message}\n`)));
    child.on("close", (code, signal) => {
      children.delete(child);
      resolve({
        code: code ?? 1,
        signal,
        output: Buffer.concat(chunks).toString("utf8"),
        seconds: (Date.now() - started) / 1000,
      });
    });
  });
}

async function pool(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await work(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

/* Heavy tasks in one lane of their own, light tasks in the remaining lanes,
   both at once. With --jobs 1 everything runs in a single lane. */
async function lanes(tasks, limit, work) {
  if (limit <= 1) return pool(tasks, 1, work);
  const heavy = tasks.filter((t) => t.heavy);
  const light = tasks.filter((t) => !t.heavy);
  const [h, l] = await Promise.all([
    pool(heavy, 1, work),
    pool(light, Math.max(1, limit - (heavy.length ? 1 : 0)), work),
  ]);
  return [...h, ...l].sort((a, b) => a.label.localeCompare(b.label));
}

/* ---- reporting ---------------------------------------------------------- */

/* GitHub Actions workflow commands: errors and warnings become annotations
   on the pull request, so a skip is visible without opening the log. */
const escapeData = (s) =>
  s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
/* Property values (file=, title=) also escape the separators ":" and ",",
   which the Python folder names contain. */
const escapeProperty = (s) =>
  escapeData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
function annotate(level, title, message, file) {
  if (!IN_ACTIONS) return;
  const where = file ? `file=${escapeProperty(file)},` : "";
  console.log(
    `::${level} ${where}title=${escapeProperty(title)}::${escapeData(message)}`
  );
}

function stepSummary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try {
    appendFileSync(file, `${markdown}\n`);
  } catch {
    /* a summary is a convenience; never fail the run over it */
  }
}

const pad = (s, n) => (s.length >= n ? s : s + " ".repeat(n - s.length));
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function printFailures(failed) {
  for (const r of failed) {
    console.log(
      `\n${"-".repeat(72)}\nFAIL  ${r.label}${r.why ? `: ${r.why}` : ""}\n${"-".repeat(72)}`
    );
    console.log(r.output.trimEnd() || "(no output)");
  }
}

/* ---- the verify scripts ------------------------------------------------- */

function verifyScripts() {
  const names = readdirSync(SCRIPTS)
    .filter((f) => /^verify-.+\.(?:ts|mjs)$/.test(f) && f !== SELF)
    .sort();
  const tasks = [];
  for (const name of names) {
    if (filters.length && !filters.some((f) => name.includes(f))) continue;
    const source = readFileSync(path.join(SCRIPTS, name), "utf8");
    if (flag("--live") && !source.includes("NEXT_PUBLIC_SUPABASE_URL"))
      continue;
    const heavy = source.includes("@electric-sql/pglite");
    tasks.push({ name, args: [], heavy });
    if (flag("--live")) continue;
    for (const args of VARIANTS[name] ?? []) tasks.push({ name, args, heavy });
  }
  return tasks;
}

function classify(task, result) {
  const label = [task.name, ...task.args].join(" ");
  const base = { label, file: `scripts/${task.name}`, ...result };
  if (result.signal) {
    const timedOut = result.seconds * 1000 >= TIMEOUT_MS - 1000;
    return {
      ...base,
      status: "FAIL",
      why: timedOut
        ? `timed out after ${TIMEOUT_MS / 60000} min`
        : `killed by ${result.signal}${result.signal === "SIGKILL" ? " (usually out of memory; try --jobs 1)" : ""}`,
    };
  }
  if (result.code === 0) {
    return LIVE_SKIPPED.test(result.output)
      ? {
          ...base,
          status: "PASS",
          partial: allowWrites
            ? "offline checks only; live probes need env"
            : `offline checks only; its live probes write and need ${WRITE_KEY}, which verify-all withholds`,
        }
      : { ...base, status: "PASS" };
  }
  const guard = result.output.match(ENV_GUARD);
  const fails = result.output.match(ANY_FAIL)?.length ?? 0;
  if (guard && fails === 1) {
    const oks = result.output.match(/^\s+ok\s/gm)?.length ?? 0;
    const withheld = guard[1] === WRITE_KEY && !allowWrites;
    return {
      ...base,
      status: "SKIPPED",
      needs: guard[1],
      withheld,
      why:
        `needs ${guard[1]}${withheld ? " (withheld: write probes are opt-in)" : ""}` +
        (oks
          ? ` (stopped at the env guard after ${plural(oks, "passing check")})`
          : ""),
    };
  }
  return {
    ...base,
    status: "FAIL",
    why: guard
      ? `real failures before the env guard (also needs ${guard[1]})`
      : `exit ${result.code}`,
  };
}

async function runVerifyScripts() {
  guardWriteProbes();
  const tasks = verifyScripts();
  if (!tasks.length) {
    console.error("verify-all: no verify scripts matched.");
    process.exit(1);
  }
  console.log(
    `verify-all: ${plural(tasks.length, "run")}${flag("--live") ? " (live only)" : ""}, ${jobs} at a time\n`
  );

  /* MODULE_TYPELESS_PACKAGE_JSON fires for every .ts script because
     package.json declares no "type". Adding "type": "module" would change how
     every .js file in the repo loads, so the warning is silenced here instead
     of fixed there; it would otherwise bury the real output of a failure. */
  const results = await lanes(tasks, jobs, async (task) => {
    const r = classify(
      task,
      await run(
        process.execPath,
        [
          "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
          path.join("scripts", task.name),
          ...task.args,
        ],
        ROOT
      )
    );
    const note = r.why ?? r.partial;
    console.log(
      `  ${pad(r.status, 8)} ${r.label} (${r.seconds.toFixed(1)}s)${note ? `: ${note}` : ""}`
    );
    return r;
  });

  const failed = results.filter((r) => r.status === "FAIL");
  const skipped = results.filter((r) => r.status === "SKIPPED");
  const partial = results.filter((r) => r.partial);
  const passed = results.filter((r) => r.status === "PASS");

  printFailures(failed);
  for (const r of failed)
    annotate("error", `${r.label} failed`, r.why ?? "", r.file);

  if (skipped.length || partial.length) {
    const bar = "=".repeat(72);
    console.log(
      `\n${bar}\nNOT RUN: these checks need the live database and did not run in full\n${bar}`
    );
    for (const r of skipped)
      console.log(`  SKIPPED  ${pad(r.label, 34)} ${r.why}`);
    for (const r of partial)
      console.log(`  PARTIAL  ${pad(r.label, 34)} ${r.partial}`);
    const needs = [
      ...new Set(skipped.filter((r) => !r.withheld).map((r) => r.needs)),
    ].join(", ");
    console.log(
      (needs ? `\nMissing here: ${needs}.` : "") +
        "\nThe read-only live checks need NEXT_PUBLIC_SUPABASE_URL and\n" +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY: set them in .env.local, or run the\n" +
        "live-db job in GitHub Actions once its two secrets exist.\n" +
        `The checks that need ${WRITE_KEY} write, or try to write,\n` +
        (allowWrites
          ? "probe rows. --allow-write-probes was given, so the key was passed on.\n"
          : `probe rows, so verify-all withholds that key from every script${writeKeyFound ? "\n(one is set here, in the environment or .env.local, and was not passed on)" : ""}.\n` +
            "--allow-write-probes passes it on, for a development project only;\n" +
            "the runner refuses it for production. CI never gets the key.\n") +
        "See docs/ci.md."
    );
    for (const r of skipped)
      annotate("warning", `${r.label} skipped`, r.why, r.file);
    for (const r of partial)
      annotate(
        "warning",
        `${r.label} ran offline checks only`,
        r.partial,
        r.file
      );
  }

  const summary =
    `verify-all: ${passed.length} passed` +
    (partial.length ? ` (${partial.length} offline only)` : "") +
    `, ${failed.length} failed, ${skipped.length} skipped (needs env), ${results.length} total`;
  console.log(`\n${summary}`);
  stepSummary(
    [
      `### ${flag("--live") ? "Live-DB checks" : "Verify scripts"}`,
      "",
      summary.replace(/^verify-all: /, ""),
      "",
      ...failed.map((r) => `- **FAIL** \`${r.label}\`: ${r.why}`),
      ...skipped.map((r) => `- **SKIPPED** \`${r.label}\`: ${r.why}`),
      ...partial.map((r) => `- **PARTIAL** \`${r.label}\`: ${r.partial}`),
    ].join("\n")
  );
  process.exit(failed.length ? 1 : 0);
}

/* ---- the Python tests --------------------------------------------------- */

function testFolders(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const here = entries.some((e) => e.isFile() && /^test_.*\.py$/.test(e.name))
    ? [dir]
    : [];
  return here.concat(
    entries
      .filter(
        (e) =>
          e.isDirectory() &&
          !e.name.startsWith(".") &&
          !["__pycache__", "node_modules", "venv"].includes(e.name)
      )
      .flatMap((e) => testFolders(path.join(dir, e.name)))
  );
}

async function runPython() {
  const python =
    process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
  const folders = testFolders(PYTHON_ROOT).sort();
  /* Zero folders means the tree moved, not that everything passed. */
  if (!folders.length) {
    console.error(
      `verify-all --python: no test_*.py found under ${PYTHON_ROOT}`
    );
    process.exit(1);
  }
  console.log(
    `verify-all --python: ${plural(folders.length, "folder")} with ${python}\n`
  );
  const env = { ...CHILD_ENV, PYTHONDONTWRITEBYTECODE: "1" };
  const results = [];
  for (const dir of folders) {
    const label = path.relative(PYTHON_ROOT, dir) || ".";
    const result = await run(
      python,
      ["-m", "unittest", "discover", "-s", ".", "-p", "test_*.py"],
      dir,
      env
    );
    const ran = Number(result.output.match(/^Ran (\d+) tests?/m)?.[1] ?? 0);
    const skips = Number(result.output.match(/skipped=(\d+)/)?.[1] ?? 0);
    /* unittest exits 0 with "Ran 0 tests" on older Pythons; a folder that
       holds test files and runs none is broken, not green. */
    const ok = result.code === 0 && !result.signal && ran > 0;
    const r = {
      label,
      file: path.relative(ROOT, dir),
      ran,
      skips,
      ...result,
      status: ok ? "PASS" : "FAIL",
    };
    if (!ok) r.why = ran === 0 ? "no tests ran" : `exit ${result.code}`;
    console.log(
      `  ${pad(r.status, 5)} ${pad(label, 38)} ${plural(ran, "test")}${skips ? `, ${skips} skipped` : ""} (${result.seconds.toFixed(1)}s)`
    );
    results.push(r);
  }
  const failed = results.filter((r) => r.status === "FAIL");
  printFailures(failed);
  for (const r of failed)
    annotate("error", `Python tests failed in ${r.label}`, r.why);
  const total = results.reduce((n, r) => n + r.ran, 0);
  const skipped = results.reduce((n, r) => n + r.skips, 0);
  const summary = `verify-all --python: ${total} tests in ${plural(results.length, "folder")}, ${skipped} skipped, ${failed.length} folder(s) failed`;
  console.log(`\n${summary}`);
  stepSummary(
    `### Python tests\n\n${summary.replace(/^verify-all --python: /, "")}\n${failed.map((r) => `- **FAIL** \`${r.label}\`: ${r.why}`).join("\n")}`
  );
  process.exit(failed.length ? 1 : 0);
}

if (flag("--python")) await runPython();
else await runVerifyScripts();
