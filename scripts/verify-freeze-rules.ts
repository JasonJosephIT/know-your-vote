/* Tests for the content freeze's code tripwire (scripts/freeze-manifest.ts
   and scripts/verify-freeze.ts; ballot-content-completion §3.6.3 and §6).

   1. The rules, on fixtures: matching hashes pass; inside the window a
      changed or missing file, or a frozen list that no longer matches the
      manifest, fails; outside it they print and pass; an entry whose hash
      was updated and that names an existing correction file passes; a named
      correction file that is missing, or is not one file directly in
      docs/general-election/corrections/ (no "..", no subfolder, not the
      README), fails at any time; the window
      includes its start and excludes its end; a malformed manifest is
      refused with a reason.
   2. The constants: the window is 0050's content_freeze window to the
      minute, 0050's refusal message points to the corrections README and
      that file exists, and every frozen file exists, once.
   3. The command, in a scratch tree: with no manifest it prints its note and
      exits 0; --write then check passes; a changed file fails inside the
      window and passes after it; --write is refused inside the window and
      leaves the manifest alone.

   Run: node scripts/verify-freeze-rules.ts */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  CORRECTIONS_DIR,
  FREEZE_WINDOW,
  FROZEN_FILES,
  MANIFEST_PATH,
  buildManifest,
  checkManifest,
  inWindow,
  parseManifest,
  type FreezeManifest,
} from "./freeze-manifest.ts";

const ROOT = resolve(import.meta.dirname, "..");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ---- 1. the rules ------------------------------------------------------ */

const BEFORE = new Date("2026-10-17T22:00:00Z");
const INSIDE = new Date("2026-10-25T12:00:00Z");
const AFTER = new Date("2026-11-04T05:00:00Z");
const FILES = ["src/lib/a.ts", "src/lib/b.ts"];
const CORRECTION = `${CORRECTIONS_DIR}2026-10-25-fix-a.md`;

function fixture(hashes: Record<string, string | null>, existing: string[] = []) {
  return {
    hashOf: (p: string) => (p in hashes ? hashes[p] : null),
    exists: (p: string) => existing.includes(p),
    frozenFiles: FILES,
  };
}
const base: FreezeManifest = buildManifest((p) => `hash-${p}`, FILES);
const withEntry = (path: string, patch: object): FreezeManifest => ({
  ...base,
  files: base.files.map((f) => (f.path === path ? { ...f, ...patch } : f)),
});
const fails = (lines: string[]) => lines.filter((l) => l.startsWith("FAIL"));

{
  const r = checkManifest(base, { now: INSIDE, ...fixture({ "src/lib/a.ts": "hash-src/lib/a.ts", "src/lib/b.ts": "hash-src/lib/b.ts" }) });
  check("matching hashes pass inside the window", r.ok && fails(r.lines).length === 0, r.lines.join(" | "));
}
const changedA = { "src/lib/a.ts": "hash-CHANGED", "src/lib/b.ts": "hash-src/lib/b.ts" };
{
  const r = checkManifest(base, { now: INSIDE, ...fixture(changedA) });
  check(
    "a changed file without a manifest update fails inside the window, by name",
    !r.ok && fails(r.lines).some((l) => l.includes("src/lib/a.ts") && l.includes("hash-CHANGED")),
    r.lines.join(" | ")
  );
}
for (const [label, now] of [["before", BEFORE], ["after", AFTER]] as const) {
  const r = checkManifest(base, { now, ...fixture(changedA) });
  check(
    `a changed file passes ${label} the window and is printed`,
    r.ok && fails(r.lines).length === 0 && r.lines.some((l) => l.startsWith("  note  ") && l.includes("src/lib/a.ts")),
    r.lines.join(" | ")
  );
}
{
  const r = checkManifest(withEntry("src/lib/a.ts", { sha256: "hash-CHANGED", correction: CORRECTION }), {
    now: INSIDE,
    ...fixture(changedA, [CORRECTION]),
  });
  check("an updated entry naming an existing correction file passes inside the window", r.ok, r.lines.join(" | "));
}
for (const [label, now] of [["inside", INSIDE], ["after", AFTER]] as const) {
  const r = checkManifest(withEntry("src/lib/a.ts", { sha256: "hash-CHANGED", correction: CORRECTION }), {
    now,
    ...fixture(changedA, []),
  });
  check(
    `a named correction file that does not exist fails ${label} the window`,
    !r.ok && fails(r.lines).some((l) => l.includes(CORRECTION)),
    r.lines.join(" | ")
  );
}
{
  const r = checkManifest(withEntry("src/lib/a.ts", { sha256: "hash-CHANGED", correction: "notes/fix.md" }), {
    now: INSIDE,
    ...fixture(changedA, ["notes/fix.md"]),
  });
  check("a correction outside docs/general-election/corrections/ fails", !r.ok, r.lines.join(" | "));
}
/* The named path must be one file directly in the corrections folder, so
   a ".." or a subfolder cannot point the check at some other existing file,
   and the README is not a correction. */
for (const named of [
  `${CORRECTIONS_DIR}../../../README.md`,
  `${CORRECTIONS_DIR}../corrections/2026-10-25-fix-a.md`,
  `${CORRECTIONS_DIR}sub/2026-10-25-fix-a.md`,
  `${CORRECTIONS_DIR}..\\..\\README.md`,
  `${CORRECTIONS_DIR}README.md`,
  `${CORRECTIONS_DIR}.md`,
]) {
  const r = checkManifest(withEntry("src/lib/a.ts", { sha256: "hash-CHANGED", correction: named }), {
    now: INSIDE,
    ...fixture(changedA, [named]),
  });
  check(`a correction named "${named}" fails, even when the path exists`, !r.ok && fails(r.lines).some((l) => l.includes(named)), r.lines.join(" | "));
}
{
  const r = checkManifest(base, {
    now: INSIDE,
    ...fixture({ "src/lib/a.ts": null, "src/lib/b.ts": "hash-src/lib/b.ts" }),
  });
  check("a deleted frozen file fails inside the window", !r.ok && fails(r.lines).some((l) => l.includes("src/lib/a.ts is missing")), r.lines.join(" | "));
}
{
  const hashes = { "src/lib/a.ts": "hash-src/lib/a.ts", "src/lib/b.ts": "hash-src/lib/b.ts" };
  const inside = checkManifest(base, { now: INSIDE, ...fixture(hashes), frozenFiles: [...FILES, "src/lib/c.ts"] });
  const after = checkManifest(base, { now: AFTER, ...fixture(hashes), frozenFiles: [...FILES, "src/lib/c.ts"] });
  check(
    "a frozen file missing from the manifest fails inside the window and is printed outside it",
    !inside.ok && inside.lines.some((l) => l.includes("src/lib/c.ts is frozen but not in the manifest")) &&
      after.ok && after.lines.some((l) => l.startsWith("  note  ") && l.includes("src/lib/c.ts")),
    [...inside.lines, ...after.lines].join(" | ")
  );
}
check(
  "the window includes its start and excludes its end",
  inWindow(FREEZE_WINDOW, new Date(FREEZE_WINDOW.starts_at)) &&
    !inWindow(FREEZE_WINDOW, new Date(FREEZE_WINDOW.ends_at)) &&
    !inWindow(FREEZE_WINDOW, new Date(Date.parse(FREEZE_WINDOW.starts_at) - 1))
);
const refuses = (text: string) => {
  try {
    parseManifest(text);
    return false;
  } catch {
    return true;
  }
};
check(
  "a malformed manifest is refused",
  refuses("[]") &&
    refuses(JSON.stringify({ window: { starts_at: "2026-11-04T05:00:00Z", ends_at: "2026-10-18T04:00:00Z" }, files: [] })) &&
    refuses(JSON.stringify({ window: FREEZE_WINDOW, files: [{ path: "a" }] })) &&
    refuses(JSON.stringify({ window: FREEZE_WINDOW, files: [{ path: "a", sha256: "x", correction: 1 }] })) &&
    !refuses(JSON.stringify(base))
);

/* ---- 2. the constants -------------------------------------------------- */

const migration = readFileSync(join(ROOT, "supabase/migrations/0050_content_freeze.sql"), "utf8");
const seeded = migration.match(
  /INSERT INTO public\.content_freeze[\s\S]*?'(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\+00',\s*'(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\+00'/
);
check(
  "FREEZE_WINDOW is 0050's content_freeze window, to the minute",
  seeded !== null &&
    Date.parse(`${seeded[1]}T${seeded[2]}:00Z`) === Date.parse(FREEZE_WINDOW.starts_at) &&
    Date.parse(`${seeded[3]}T${seeded[4]}:00Z`) === Date.parse(FREEZE_WINDOW.ends_at),
  seeded ? seeded.slice(1).join(" ") : "no INSERT INTO public.content_freeze found"
);
const pointedTo = migration.match(/Corrections only: (\S+\.md)'/)?.[1];
check(
  "0050's refusal message points to a corrections README that exists",
  pointedTo === `${CORRECTIONS_DIR}README.md` && existsSync(join(ROOT, pointedTo)),
  String(pointedTo)
);
check(
  "the window is Sun 2026-10-18 04:00 UTC to Wed 2026-11-04 05:00 UTC",
  FREEZE_WINDOW.starts_at === "2026-10-18T04:00:00.000Z" &&
    FREEZE_WINDOW.ends_at === "2026-11-04T05:00:00.000Z"
);
const missing = FROZEN_FILES.filter((f) => !existsSync(join(ROOT, f)));
check("every frozen file exists", missing.length === 0, missing.join(", "));
check("no frozen file is listed twice", new Set(FROZEN_FILES).size === FROZEN_FILES.length);
check("45 frozen files (§3.6.3)", FROZEN_FILES.length === 45, String(FROZEN_FILES.length));

/* ---- 3. the command ---------------------------------------------------- */

const SCRIPT = join(ROOT, "scripts/verify-freeze.ts");
function run(...args: string[]) {
  const r = spawnSync(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", SCRIPT, ...args],
    { encoding: "utf8" }
  );
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const scratch = mkdtempSync(join(tmpdir(), "kyv-verify-freeze-"));
try {
  const none = run("--root", scratch);
  check(
    "no manifest: prints its note and exits 0",
    none.code === 0 &&
      none.out.trim() ===
        `ok  no freeze manifest yet (${MANIFEST_PATH}); nothing to compare`,
    JSON.stringify(none)
  );

  for (const f of FROZEN_FILES) {
    mkdirSync(dirname(join(scratch, f)), { recursive: true });
    writeFileSync(join(scratch, f), `// ${f}\n`);
  }
  const wrote = run("--root", scratch, "--write", "--now", BEFORE.toISOString());
  check("--write before the window writes the manifest", wrote.code === 0 && existsSync(join(scratch, MANIFEST_PATH)), JSON.stringify(wrote));

  const same = run("--root", scratch, "--now", INSIDE.toISOString());
  check("an unchanged tree passes inside the window", same.code === 0, JSON.stringify(same));

  const target = FROZEN_FILES[0];
  writeFileSync(join(scratch, target), "// changed\n");
  const changedInside = run("--root", scratch, "--now", INSIDE.toISOString());
  check(
    "a changed frozen file fails inside the window, by name",
    changedInside.code === 1 && changedInside.out.includes(`FAIL  ${target} differs`),
    JSON.stringify(changedInside)
  );
  const changedAfter = run("--root", scratch, "--now", AFTER.toISOString());
  check("the same change passes after the window", changedAfter.code === 0 && changedAfter.out.includes(target), JSON.stringify(changedAfter));

  const before = readFileSync(join(scratch, MANIFEST_PATH), "utf8");
  const refused = run("--root", scratch, "--write", "--now", INSIDE.toISOString());
  check(
    "--write is refused inside the window and leaves the manifest alone",
    refused.code === 1 && readFileSync(join(scratch, MANIFEST_PATH), "utf8") === before,
    JSON.stringify(refused)
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-freeze-rules: all checks passed.");
