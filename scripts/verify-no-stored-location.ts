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

   Extended by TASK-071 to cover the claims *about* that storage. The privacy
   page said quiz answers were stored in the browser; they never were, and a
   page whose whole value is being checkable cannot carry a claim that fails
   the check. The funnel assertions live here too, because "ballot_viewed
   before zip_resolved" is the same fact from the analytics side: the ballot,
   not the ZIP, is where a visit now begins.

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

/* 4. TASK-071: the privacy page must not describe storage that does not
      exist, and must name the storage that does. This is prose, so the check
      is deliberately narrow — it pins the two claims that were actually
      wrong, and the two keys that are actually written, rather than pretending
      to validate English. */
const privacy = readFileSync(join(SRC, "app", "(public)", "privacy", "page.tsx"), "utf8");
const privacyText = stripComments(privacy);

assert(
  "privacy page no longer claims quiz answers are stored",
  !/quiz answers are\s+stored/i.test(privacyText.replace(/\s+/g, " ")),
  "quiz answers live in React state and are never persisted"
);
assert(
  "privacy page says the ZIP is not retained",
  /ZIP isn&apos;t stored/i.test(privacyText)
);
assert(
  "privacy page names the keep-in-mind list",
  /keep in\s+mind/i.test(privacyText.replace(/\s+/g, " "))
);
assert(
  "privacy page names the install-prompt flag",
  /get the app/i.test(privacyText)
);

/* 5. ballot_viewed exists and precedes zip_resolved: the funnel's entry event
      is the ballot now, not the ZIP. */
const analytics = stripComments(readFileSync(join(SRC, "lib", "analytics.ts"), "utf8"));
assert(
  "ballot_viewed is a declared analytics event",
  /"ballot_viewed"/.test(analytics)
);
assert(
  "ballot_viewed precedes zip_resolved in the funnel",
  analytics.indexOf('"ballot_viewed"') < analytics.indexOf('"zip_resolved"')
);

const landing = stripComments(readFileSync(join(SRC, "app", "(public)", "page.tsx"), "utf8"));
assert(
  "landing page fires ballot_viewed only when a ballot rendered",
  /ballotRendered && <TrackView event="ballot_viewed" \/>/.test(landing)
);

if (failures) {
  console.error(`\n${failures} stored-location check(s) failed`);
  process.exit(1);
}
console.log("\nAll stored-location checks passed.");
