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

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENTRY = `${ROOT}/src/app/(public)/page.tsx`;

/* The imports that must stay server-rendered: the ballot itself, and
   everything it pulls in. LocationEntry is deliberately not here — it is a
   client component by design, and its no-JavaScript path is the noscript
   district links, asserted separately below. */
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

/* 3b. The county-races section must stay server-rendered too. It is not on
       the landing page — YourRaces renders it, and YourRaces reaches client
       components (LocationEntry) by design — so it cannot ride on check 3.
       But it is the same kind of thing as SharedBallot: a list of what is on
       the ballot, which has to be in the first HTML response. */
{
  const countyEntry = resolveImport("@/components/features/CountyRaces", ENTRY);
  if (!countyEntry) {
    assert(
      "@/components/features/CountyRaces resolves",
      false,
      "module not found"
    );
  } else {
    const graph = reachableFrom(countyEntry);
    const clients = [...graph.keys()].filter(isClient);
    assert(
      `CountyRaces reaches no client components (${graph.size} modules)`,
      clients.length === 0,
      clients.map(rel).join(", ")
    );
  }
}

/* 4. The House-race step must still lead somewhere without JavaScript, and
      no address may ever ride in a URL.

      Until 2026-10-12 the no-JS path was a GET form that sent a ZIP to
      /candidates?view=races&zip=…. The field now takes a street address
      only (founder), and a GET would put the address in the URL: the access
      log, the history, the next page's Referer. So the form has no action,
      no method and no named field, its submit is disabled until hydration
      (a disabled default button blocks Enter too), and without JavaScript
      it is hidden while noscript links to every district stand in. */
const locationSource = readFileSync(
  `${ROOT}/src/components/features/LocationEntry.tsx`,
  "utf8"
);
const locationCode = locationSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");
assert(
  "the location form has no native GET (no action, no method, no hidden view)",
  !/action="\/candidates"/.test(locationCode) &&
    !/method="get"/i.test(locationCode) &&
    !/name="view"/.test(locationCode)
);
{
  const at = locationCode.indexOf('id="location"');
  const input = at >= 0 ? locationCode.slice(at, locationCode.indexOf("/>", at)) : "";
  assert(
    "the address input has no name, so nothing can serialise it into a URL",
    input.length > 0 && !/\bname=/.test(input) && !/name="zip"/.test(locationCode),
    input.slice(0, 200)
  );
}
assert(
  "the address form's submit waits for hydration",
  /disabled=\{!hydrated \|\| stage\.kind === "loading"\}/.test(locationCode)
);
assert(
  "without JavaScript, noscript links lead to every district's races",
  /<noscript>[\s\S]*<DistrictLinks[\s\S]*<\/noscript>/.test(locationCode) &&
    /href: `\/candidates\?view=races&district=\$\{d\.district\}&county=\$\{d\.countyFips\}`/.test(
      locationCode
    )
);
/* The picker's block (#district-picker-route) holds its divider, toggle and
   form, so hiding the block hides all three: an open picker (Mobbin AD7) is
   in the server render, and its label and divider would otherwise show
   over nothing. */
assert(
  "without JavaScript, the address form and the picker's whole block (toggle and form) are hidden",
  /<style>\{NO_SCRIPT_CSS\}<\/style>\s*<\/noscript>/.test(locationCode) &&
    /NO_SCRIPT_CSS = "#location-form,#district-picker-route\{display:none\}"/.test(
      locationCode
    ) &&
    /id="location-form"/.test(locationCode) &&
    /id="district-picker-route"[\s\S]*id="district-picker-toggle"[\s\S]*id="district-picker-form"/.test(
      locationCode
    )
);
assert(
  "with no districts to list (the read failed), the county links show for everyone, field on or off, and noscript still hides the field",
  /const linksOnly = districts\.length === 0;/.test(locationCode) &&
    /\{\(addressEnabled \|\| !linksOnly\) && \(\s*<noscript>/.test(locationCode) &&
    /\{linksOnly && stage\.kind !== "outOfCoverage" && \(\s*<DistrictLinks/.test(locationCode)
);
assert(
  "the address goes to the resolve route in a POST body",
  /fetch\("\/api\/address\/resolve", \{\s*method: "POST"/.test(locationCode) &&
    /body: JSON\.stringify\(/.test(locationCode)
);
assert(
  "a bare ZIP gets the field error and is sent nowhere",
  /const zipAlone = \/\^\\d\{5\}\(\?:\[\\s-\]\?\\d\{4\}\)\?\$\/\.test\(trimmed\);/.test(locationCode) &&
    /if \(zipAlone\) \{\s*fail\(ZIP_ALONE\);\s*return;\s*\}/.test(locationCode) &&
    /const ZIP_ALONE =\s*"A ZIP code alone can't tell us your district\. Add your house number and street\.";/.test(
      locationCode
    ) &&
    locationCode.indexOf("if (zipAlone)") < locationCode.indexOf("void resolveAddress({ address: trimmed })")
);

/* 4b. Nothing on the site builds a ?zip= URL any more. Old shared links
       still resolve (/candidates, /races, /api/resolve and /api/news read
       one), but no page, component or route writes one: a ZIP template or
       concatenation in an href, a URLSearchParams set or append, or a
       params object with a zip key anywhere in it.
       Comments are stripped, so a comment naming an old URL is fine.

       One carry-forward is allowed, and only in /candidates: its "Your
       races" tab copies the ZIP the URL already has (`const zip = sp.zip`,
       pinned in 4c) with its district, so clicking the tab on an old link
       keeps the ballot on screen. It makes no ZIP link of its own. */
{
  const stripCode = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
  const BUILDS_ZIP_URL =
    /[?&]zip=(?:\$\{|["'`]\s*\+)|\.(?:set|append)\(\s*["']zip["']|new URLSearchParams\(\{[^}]*\bzip\b/;
  const buildsZipUrl = (src: string) => BUILDS_ZIP_URL.test(stripCode(src));

  /* The shapes, one each, so an edit that narrows the pattern fails here
     before it lets one through. */
  const mustMatch = [
    "href={`/candidates?view=races&zip=${zip}`}",
    "const u = '/candidates?view=races&zip=' + zip;",
    'const u = "/candidates?view=races&zip=" + zip;',
    "const u = `/candidates?zip=` + zip;",
    'params.set("zip", zip);',
    "params.append('zip', zip);",
    "new URLSearchParams({ zip })",
    'new URLSearchParams({ view: "races", zip })',
    'new URLSearchParams({ view: "races", zip: z })',
  ];
  const mustNotMatch = [
    "// href={`/candidates?view=races&zip=${zip}`}",
    '/* params.set("zip", zip); */',
    'url.searchParams.delete("zip");',
    'const zip = sp.get("zip");',
    'new URLSearchParams({ view: "races", district })',
  ];
  const missed = mustMatch.filter((s) => !buildsZipUrl(s));
  const wrong = mustNotMatch.filter((s) => buildsZipUrl(s));
  assert(
    "the ?zip= builder pattern catches every shape and no comment or reader",
    missed.length === 0 && wrong.length === 0,
    [...missed.map((s) => `missed ${s}`), ...wrong.map((s) => `matched ${s}`)].join(" | ")
  );

  const CARRY_FORWARD_FILE = `${ROOT}/src/app/(public)/candidates/page.tsx`;
  const CARRY_FORWARD = 'if (zip) params.set("zip", zip);';
  const files: string[] = [];
  (function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const p = `${dir}/${name}`;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|mjs|js)$/.test(name)) files.push(p);
    }
  })(`${ROOT}/src`);
  const builders = files.filter((f) => {
    let code = stripCode(readFileSync(f, "utf8"));
    if (f === CARRY_FORWARD_FILE) code = code.replace(CARRY_FORWARD, "");
    return BUILDS_ZIP_URL.test(code);
  });
  assert(
    "no source file builds a ?zip= URL",
    builders.length === 0,
    builders.map(rel).join(", ")
  );
  const candidatesCode = stripCode(readFileSync(CARRY_FORWARD_FILE, "utf8"));
  assert(
    "the /candidates races tab carries an incoming ZIP forward, once, with its district",
    candidatesCode.split(CARRY_FORWARD).length === 2 &&
      /if \(zip\) params\.set\("zip", zip\);\s*if \(district\) params\.set\("district", district\);/.test(
        candidatesCode
      )
  );
}

/* 4c. ...but the links already out in the world keep working: /candidates
       reads ?zip= and hands it to YourRaces, which resolves it as before
       (split ZIPs included); /races?zip= redirects there with its query;
       /api/resolve still answers a GET. */
{
  const candidates = readFileSync(
    `${ROOT}/src/app/(public)/candidates/page.tsx`,
    "utf8"
  );
  const yourRaces = readFileSync(
    `${ROOT}/src/components/features/YourRaces.tsx`,
    "utf8"
  );
  const nextConfig = readFileSync(`${ROOT}/next.config.ts`, "utf8");
  const apiResolve = `${ROOT}/src/app/api/resolve/route.ts`;
  assert(
    "old ?zip= links: /candidates reads the ZIP and passes it to YourRaces",
    /const zip = sp\.zip;/.test(candidates) &&
      /zip \|\| county \|\| scope \? "races"/.test(candidates) &&
      /<YourRaces\s+zip=\{zip\}/.test(candidates)
  );
  assert(
    "old ?zip= links: YourRaces still resolves a ZIP, and asks on a split one",
    /if \(zip && ZIP_RE\.test\(zip\)\) \{\s*result = await resolveZip\(zip, district\);/.test(yourRaces) &&
      /if \(result\.needsCountyConfirm\) \{/.test(yourRaces)
  );
  assert(
    "old /races?zip= links still redirect to the races view",
    /source: "\/races", destination: "\/candidates\?view=races"/.test(nextConfig)
  );
  assert(
    "/api/resolve still answers a GET for old callers",
    existsSync(apiResolve) &&
      /export async function GET\(/.test(readFileSync(apiResolve, "utf8"))
  );
}

/* 5. The landing page must not gate the ballot behind a location read.

      Since address lookup, the page DOES read one stored value: kyv.district,
      to show the voter's House race instead of the field. That is a district,
      not a location, and it gates nothing — SharedBallot renders above it
      either way, which assertion 1 pins. What must stay gone is the old
      kyv.location, which held a ZIP.

      Comments are stripped first, so a comment explaining why the page does NOT
      read stored location cannot read as the thing it warns about. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
assert(
  "landing page reads no stored ZIP or location",
  !/readLocation|kyv\.location/.test(stripComments(pageSource))
);
assert(
  "the ballot renders before any district is known",
  pageSource.indexOf("<SharedBallot") < pageSource.indexOf("saved ?"),
  "SharedBallot must come above the district-dependent section"
);

if (failures) {
  console.error(`\n${failures} shared-ballot check(s) failed`);
  process.exit(1);
}
console.log("\nAll shared-ballot checks passed.");
