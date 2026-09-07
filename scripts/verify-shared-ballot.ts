/* TASK-067 verify: the shared ballot renders with JavaScript disabled.

   The task's acceptance is "a first visit with JavaScript disabled and no
   stored state shows all eight shared ballot items" — five statewide races
   and three amendments. Whether all eight are *published* is a data question
   this script cannot answer without a database. What it can answer, and what
   would silently regress, is the structural half: every module the landing
   page reaches to render those items must be a server component, because a
   client component renders nothing in the first HTML response.

   Turning SharedBallot or BallotQuestions into a client component (a
   useState for a filter, say) would still look correct in a browser and
   would still pass a build. It would put the whole magic moment behind
   JavaScript, which is exactly the wall this task took down.

   Run: node scripts/verify-shared-ballot.ts */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENTRY = `${ROOT}/src/app/(public)/page.tsx`;

/* The imports that must stay server-rendered: the ballot itself, and
   everything it pulls in. ZipEntry is deliberately not here — it is a client
   component by design, and its no-JavaScript path is the plain GET form,
   asserted separately below. */
const BALLOT_ROOTS = ["@/components/features/SharedBallot"];

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

function resolveImport(spec: string, fromFile: string): string | null {
  const base = spec.startsWith("@/")
    ? `${ROOT}/src/${spec.slice(2)}`
    : spec.startsWith(".")
      ? resolve(dirname(fromFile), spec)
      : null;
  if (!base) return null; // node_modules — not ours to check
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      try {
        if (readFileSync(candidate, "utf8")) return candidate;
      } catch {
        /* a directory — keep looking */
      }
    }
  }
  return null;
}

const IMPORT_RE = /^\s*import\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/gm;

/* Walk the import graph and collect every file reached, so a client
   component three levels down is caught as surely as a direct import. */
function reachableFrom(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const walk = (file: string, path: string[]) => {
    if (seen.has(file)) return;
    const src = readFileSync(file, "utf8");
    seen.set(file, path);
    for (const m of src.matchAll(IMPORT_RE)) {
      const next = resolveImport(m[1], file);
      if (next) walk(next, [...path, file]);
    }
  };
  walk(entry, []);
  return seen;
}

const rel = (f: string) => f.slice(ROOT.length + 1);
const isClient = (f: string) =>
  /^\s*["']use client["']/.test(readFileSync(f, "utf8"));

const pageSource = readFileSync(ENTRY, "utf8");

/* 1. The landing page itself must stay a server component. */
assert("landing page is a server component", !isClient(ENTRY));

/* 2. The ballot must be on the landing page at all. */
assert(
  "landing page renders SharedBallot",
  /<SharedBallot\s*\/>/.test(pageSource)
);

/* 3. Nothing the ballot reaches may be a client component. */
for (const spec of BALLOT_ROOTS) {
  const entry = resolveImport(spec, ENTRY);
  if (!entry) {
    assert(`${spec} resolves`, false, "module not found");
    continue;
  }
  const graph = reachableFrom(entry);
  const clients = [...graph.keys()].filter(isClient);
  assert(
    `${spec} reaches no client components (${graph.size} modules)`,
    clients.length === 0,
    clients.map(rel).join(", ")
  );
}

/* 4. The ZIP upgrade must work without JavaScript: a plain GET form that
      lands on the races view. Without action/method the field is inert for a
      voter with scripts off — the field would be there and do nothing. */
const zipSource = readFileSync(
  `${ROOT}/src/components/features/ZipEntry.tsx`,
  "utf8"
);
assert(
  "ZIP form submits without JavaScript (action + method=get)",
  /action="\/candidates"/.test(zipSource) && /method="get"/.test(zipSource)
);
assert(
  "ZIP form carries the races view in the no-JavaScript GET",
  /name="view"\s+value="races"/.test(zipSource)
);
assert(
  "ZIP input is named so the no-JavaScript GET carries it",
  /name="zip"/.test(zipSource)
);

/* 5. The landing page must not gate the ballot behind a location read.
      Comments are stripped first, so a comment explaining why the page does
      NOT read stored location does not read as the thing it warns about. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
assert(
  "landing page reads no stored location",
  !/readLocation|kyv\.location/.test(stripComments(pageSource))
);

if (failures) {
  console.error(`\n${failures} shared-ballot check(s) failed`);
  process.exit(1);
}
console.log("\nAll shared-ballot checks passed.");
