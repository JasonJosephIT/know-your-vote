/* TASK-070 verify: nothing stores the voter's location on their device.

   The task's criterion is `grep -r "kyv.location" src` returning nothing.
   This is that grep, with two refinements that make it a durable invariant
   rather than a one-off check:

   1. Comments are stripped first. The code is gone; several files explain
      why, and a comment saying "kyv.location is gone" must not read as
      kyv.location being present.
   2. It also fails on a *new* device-stored location under any other key —
      re-adding the same behaviour as `kyv.loc` or `kyv.zip` would pass a
      literal grep while undoing the task.

   kyv.saved is explicitly permitted. It is a different thing: an opt-in list
   the voter builds by pressing a button, not location the app accumulates on
   its own. The proposal keeps it deliberately.

   Run: node scripts/verify-no-stored-location.ts */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

const files = walk(SRC).map((f) => ({ path: f.slice(ROOT.length + 1), code: stripComments(readFileSync(f, "utf8")) }));

/* 1. The module itself is gone. */
assert(
  "src/lib/location.ts no longer exists",
  !existsSync(join(SRC, "lib", "location.ts"))
);

/* 2. No code references the key or its helpers. */
for (const [label, re] of [
  ["the kyv.location key", /kyv\.location/],
  ["readLocation", /\breadLocation\b/],
  ["writeLocation", /\bwriteLocation\b/],
  ["clearLocation", /\bclearLocation\b/],
  ["the @/lib/location module", /@\/lib\/location/],
] as const) {
  const hits = files.filter((f) => re.test(f.code)).map((f) => f.path);
  assert(`no code references ${label}`, hits.length === 0, hits.join(", "));
}

/* 3. No location is written to device storage under any other name. The
      allowed keys are kyv.saved and the InstallCard dismiss flag. */
const ALLOWED = new Set(["kyv.saved", "kyv.install-dismissed"]);
const keyed: Array<{ path: string; key: string }> = [];
for (const f of files) {
  for (const m of f.code.matchAll(/localStorage\.(?:setItem|getItem|removeItem)\(\s*([A-Za-z_$][\w$]*|"[^"]*"|'[^']*')/g)) {
    let key = m[1];
    if (!/^["']/.test(key)) {
      /* a constant — resolve it within the same file */
      const decl = f.code.match(new RegExp(`(?:const|let)\\s+${key}\\s*=\\s*["']([^"']+)["']`));
      key = decl ? decl[1] : `<${key}: unresolved>`;
    } else {
      key = key.slice(1, -1);
    }
    if (!ALLOWED.has(key)) keyed.push({ path: f.path, key });
  }
}
assert(
  "no unexpected localStorage keys",
  keyed.length === 0,
  keyed.map((k) => `${k.path}: ${k.key}`).join(", ")
);

if (failures) {
  console.error(`\n${failures} stored-location check(s) failed`);
  process.exit(1);
}
console.log("\nAll stored-location checks passed.");
