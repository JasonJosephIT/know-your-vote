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
import {
  parseDistrictCookie,
  formatDistrictCookie,
  DISTRICT_COOKIE,
} from "../src/lib/district-cookie.ts";
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

const files = walk(SRC).map((f) => ({
  path: f.slice(ROOT.length + 1),
  code: stripComments(readFileSync(f, "utf8")),
}));

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

/* 3. Device storage holds a district and two preferences -- nothing else.

      kyv.location is gone and stays gone: it held a ZIP, which is a location.
      kyv.district holds FL-27|12086, which is a public electoral unit the voter
      chose. That distinction is the whole argument in the spec §8, so it is
      asserted here rather than trusted. */
const ALLOWED_LOCAL = new Set(["kyv.saved", "kyv.install-dismissed"]);
const keyed: Array<{ path: string; key: string }> = [];
for (const f of files) {
  for (const m of f.code.matchAll(
    /localStorage\.(?:setItem|getItem|removeItem)\(\s*([A-Za-z_$][\w$]*|"[^"]*"|'[^']*')/g
  )) {
    let key = m[1];
    if (!/^["']/.test(key)) {
      const decl = f.code.match(
        new RegExp(`(?:const|let)\\s+${key}\\s*=\\s*["']([^"']+)["']`)
      );
      key = decl ? decl[1] : `<${key}: unresolved>`;
    } else {
      key = key.slice(1, -1);
    }
    if (!ALLOWED_LOCAL.has(key)) keyed.push({ path: f.path, key });
  }
}
assert(
  "no unexpected localStorage keys",
  keyed.length === 0,
  keyed.map((k) => `${k.path}: ${k.key}`).join(", ")
);

/* Cookies: kyv.district is the only one this app writes. A second cookie name in
   a document.cookie assignment is a new store nobody reviewed. */
const cookieWrites: Array<{ path: string; key: string }> = [];
for (const f of files) {
  for (const m of f.code.matchAll(
    /document\.cookie\s*=\s*`?\$?\{?([A-Za-z_$][\w$.]*|[\w.-]+)=/g
  )) {
    const token = m[1];
    if (token !== "DISTRICT_COOKIE" && token !== "kyv.district") {
      cookieWrites.push({ path: f.path, key: token });
    }
  }
}
assert(
  "kyv.district is the only cookie the app writes",
  cookieWrites.length === 0,
  cookieWrites.map((c) => `${c.path}: ${c.key}`).join(", ")
);

/* The value shape is what keeps a ZIP or an address out of that cookie. */
const cookieSrc = stripComments(
  readFileSync(join(SRC, "lib", "district-cookie.ts"), "utf8")
);
assert(
  "the cookie value is constrained to a district and a county",
  /\/\^FL-\\d\{1,2\}\\\|\\d\{5\}\$\//.test(cookieSrc),
  "expected the FL-nn|ccccc regex to guard both parse and format"
);

/* 4. The privacy page must describe exactly this, including both third parties
      on the address path. A page whose whole value is being checkable cannot
      carry a claim that fails the check.

      These reads sit here because section 4 now asserts against all of them. */
const privacyText = stripComments(
  readFileSync(join(SRC, "app", "(public)", "privacy", "page.tsx"), "utf8")
);
const analytics = stripComments(
  readFileSync(join(SRC, "lib", "analytics.ts"), "utf8")
);
const landing = stripComments(
  readFileSync(join(SRC, "app", "(public)", "page.tsx"), "utf8")
);

assert(
  "privacy page no longer claims quiz answers are stored",
  !/quiz answers are\s+stored/i.test(privacyText.replace(/\s+/g, " "))
);
assert(
  "privacy page says the address and ZIP are not stored",
  /address and your ZIP aren&apos;t stored/i.test(privacyText)
);
assert("privacy page names the cookie", /kyv\.district/.test(privacyText));
assert("privacy page shows the stored value", /FL-27\|12086/.test(privacyText));
assert("privacy page names Google Places", /Google Places/.test(privacyText));
assert(
  "privacy page names the Census Bureau",
  /Census Bureau/.test(privacyText)
);
assert(
  "privacy page says only coordinates go to Census",
  /coordinates/i.test(privacyText) &&
    /never receives your address/i.test(privacyText)
);
assert(
  "privacy page names the way out of both third parties",
  /pick your district/i.test(privacyText)
);
assert(
  "privacy page names the keep-in-mind list",
  /keep in\s+mind/i.test(privacyText.replace(/\s+/g, " "))
);
assert(
  "privacy page names the install-prompt flag",
  /get the app/i.test(privacyText)
);

/* The landing page's storage claim had to move with the cookie: it used to say
   nothing was saved on the device, which stopped being true. */
assert(
  "the landing page no longer claims nothing is saved on the device",
  !/nothing is saved on your device/i.test(landing)
);
assert(
  "the landing page says what is kept instead",
  /keep only the district|remember the district/i.test(landing)
);

/* 5. ballot_viewed exists and precedes zip_resolved: the funnel's entry event is
      the ballot, not the ZIP. district_set carries a method label and never a
      value -- LocationEntry passes the shorthand { via }, so the check accepts a
      bare identifier as well as a literal, and rejects anything else. */
assert(
  "ballot_viewed is a declared analytics event",
  /"ballot_viewed"/.test(analytics)
);
assert(
  "ballot_viewed precedes zip_resolved in the funnel",
  analytics.indexOf('"ballot_viewed"') < analytics.indexOf('"zip_resolved"')
);
assert(
  "district_set is a declared analytics event",
  /"district_set"/.test(analytics)
);
const districtSetCalls = files.flatMap((f) => [
  ...f.code.matchAll(/track\(\s*"district_set"\s*,\s*\{([^}]*)\}/g),
]);
assert("district_set is tracked somewhere", districtSetCalls.length > 0);
assert(
  "district_set only ever carries via: address | zip | picker",
  districtSetCalls.every((m) =>
    /^\s*via\s*(:\s*(via|"address"|"zip"|"picker"))?\s*,?\s*$/.test(m[1])
  ),
  districtSetCalls.map((m) => m[1]).join(" | ")
);
assert(
  "landing page fires ballot_viewed only when a ballot rendered",
  /ballotRendered && <TrackView event="ballot_viewed" \/>/.test(landing)
);

/* 6. The district cookie is the one thing that outlives a visit, and its value
      shape is the guarantee that it holds a district rather than a location. */
assert("the cookie is named kyv.district", DISTRICT_COOKIE === "kyv.district");
assert(
  "a well-formed value parses",
  parseDistrictCookie("FL-27|12086")?.district === "FL-27" &&
    parseDistrictCookie("FL-27|12086")?.countyFips === "12086"
);
assert(
  "a single-digit district parses",
  parseDistrictCookie("FL-7|12011")?.district === "FL-7"
);
for (const bad of [
  "",
  "FL-27",
  "12086",
  "FL-27|1208",
  "33130|12086",
  "FL-27|12086; evil=1",
  "444 SW 2nd Ave|12086",
  "FL-abc|12086",
  "FL-27|12086|extra",
]) {
  assert(
    `a malformed value is treated as absent: ${JSON.stringify(bad)}`,
    parseDistrictCookie(bad) === null
  );
}
/* A well-shaped value for a county we do not cover parses here and is refused
   downstream: resolveDistrict returns null, so it produces no ballot. Shape is
   this module's job; coverage is the ballot's. */
assert(
  "an uncovered county still parses, and is refused where it matters",
  parseDistrictCookie("FL-1|12087")?.countyFips === "12087"
);
assert(
  "formatting round-trips",
  formatDistrictCookie({ district: "FL-27", countyFips: "12086" }) ===
    "FL-27|12086"
);
let refusedMalformed = false;
try {
  formatDistrictCookie({ district: "33130", countyFips: "12086" });
} catch {
  refusedMalformed = true;
}
assert("formatting refuses a value that is not a district", refusedMalformed);

if (failures) {
  console.error(`\n${failures} stored-location check(s) failed`);
  process.exit(1);
}
console.log("\nAll stored-location checks passed.");
