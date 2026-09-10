# Address → District Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a voter find their congressional district from their home address, and let the browser remember the resulting district — never the address or ZIP.

**Architecture:** One smart field accepts an address (completed by Google Places through a server-side proxy) or a 5-digit ZIP. A picked address becomes a coordinate, the Census `coordinates` endpoint turns that into a 2020 census block, and a new run-length-encoded `block_district` table maps the block to `FL-nn` using the same enacted-plan file the ZIP crosswalk is built from — so the two paths cannot disagree. The resolved district plus county is written to one cookie, surfaced as a chip in the top-right chrome, and forgettable in one click.

**Tech Stack:** Next.js 16.3.4 (App Router), React 19.2.4, TypeScript 5, Supabase Postgres with RLS, zod 4, Node 22 (runs `.ts` scripts directly via type stripping), PGlite for migration tests, Google Places API (New), US Census Geocoder.

**Spec:** `docs/superpowers/specs/2026-09-09-address-district-lookup-design.md` — read it before Task 1.

## Global Constraints

- **This is not the Next.js you know.** Read the relevant guide in `node_modules/next/dist/docs/` before using any Next API (`AGENTS.md`). Notably: `cookies()` is **async**, using it in a page or layout **opts that route into dynamic rendering**, and cookies **cannot be set during render** — only in a Server Function or Route Handler, or client-side.
- **No test runner exists.** Checks are `scripts/verify-*.{ts,mjs}` run directly: `node scripts/verify-foo.ts`. Follow the `assert(name, cond, extra)` / `failures` / `process.exit(1)` idiom of `scripts/verify-no-stored-location.ts`, or the `check`/`expectDenied` idiom of `scripts/verify-migrations.mjs`.
- **Server-only env vars must never gain a `NEXT_PUBLIC_` prefix** (`.env.example` header). The Places key is `GOOGLE_PLACES_API_KEY`, server-only.
- **District strings are `FL-<n>`**, no zero padding (`FL-7`, not `FL-07`). County FIPS are exactly 5 characters. Both formats already exist in `zip_district`.
- **Cookie contract:** name `kyv.district`, value `FL-27|12086`, `path=/`, `max-age=15552000`, `samesite=lax`, `secure`, **not** `HttpOnly`. Written only on an explicit user action; never from a shared link.
- **Places field masks:** autocomplete `suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat`; details `location` **only** (keeps the street address out of our server and stays in the Essentials SKU).
- **Census parameters:** `benchmark=Public_AR_Current`, `vintage=Census2020_Current`, `layers=Census Blocks`.
- **Florida rectangle** for `locationRestriction`: low `24.3963 / -87.6349`, high `31.0011 / -79.9743`.
- **Every external call:** `AbortSignal.timeout(2500)`, zod-parsed response, and **never logged**. No `console.*` in either address route.
- **Nothing persists but the district.** No DB write, no `localStorage` key, no analytics property carrying a ZIP or address value.
- **Anything a `verify-*` script imports must be import-clean.** `server-only` **throws** under plain `node`, and `@/`-aliased **value** imports do not resolve (Node has no tsconfig paths). This is why the pure logic lives in `src/lib/address-lookup.ts` and the fetching wrappers live elsewhere — the same split `src/lib/news-match.ts` and `src/lib/quiz-guardrails.ts` already use. `import type` lines are erased before Node sees them, so a type-only import may use `@/` or a relative `.ts` path (`import type { X } from "../types/app.ts"`, as `quiz-guardrails.ts` does). Value imports of npm packages such as `zod` are fine.
- Run `npx prettier --write <files>` on every file you touch before committing (prettier 3.9.4, config in `.prettierrc.json`).

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/counties.ts` | The four covered counties, with no dependencies, so client and server can both import them |
| `src/lib/address-lookup.ts` | **Pure**: parses both geocoder responses and resolves a block against `block_district` rows. No network, no DB, no framework — this is what the verify script drives |
| `src/lib/census-block.ts` | Coordinate → 2020 census block GEOID (Census Geocoder fetch) |
| `src/lib/geocode.ts` | Google Places (New) client: suggestions, and place → coordinate |
| `src/lib/district-cookie.ts` | The whole cookie contract: name, format, parse, serialize |
| `src/app/api/address/suggest/route.ts` | POST proxy for autocomplete |
| `src/app/api/address/resolve/route.ts` | POST: place → coordinate → block → district → races |
| `src/components/features/LocationEntry.tsx` | The one smart field (address or ZIP) plus the district picker |
| `src/components/features/DistrictChip.tsx` | Top-right chip: current district, change, forget |
| `scripts/build-block-seed.mjs` | Generates the block → district seed from the enacted plan |
| `scripts/verify-block-seed.mjs` | Fixture unit checks, plus the cross-check against `0018` |
| `scripts/verify-address-resolve.ts` | Fixture-driven checks of the resolve pipeline |
| `scripts/verify-counties.ts` | Pins the single county list |
| `scripts/fixtures/block-seed/block_assignment.txt` | Small block-assignment fixture |
| `scripts/fixtures/address/*.json` | Captured Places and Census responses |
| `supabase/migrations/0020_block_district.sql` | Table and index |
| `supabase/migrations/0021_block_district_rls.sql` | Grants and policy |
| `supabase/migrations/0022_block_seed_2026.sql` | Generated seed (large, do not hand-edit) |

**Modified**

| File | Change |
|---|---|
| `src/lib/resolve.ts` | Re-export counties; add `resolveBlock`, `resolveDistrict`, `getCoveredDistricts` |
| `src/components/features/CountyPicker.tsx` | Drop its duplicate county list |
| `src/components/features/YourRaces.tsx` | Accept district+county without a ZIP; use `LocationEntry` |
| `src/app/(public)/page.tsx` | Cookie-aware ballot; `LocationEntry`; fix the storage claim on line 63 |
| `src/app/(public)/candidates/page.tsx` | Cookie fallback when no location params |
| `src/components/nav/SectionNav.tsx` | Chip slot |
| `src/lib/analytics.ts` | Add `district_set` |
| `src/lib/sentry-scrub.ts` | Drop request bodies for `/api/address/*` |
| `src/app/(public)/privacy/page.tsx` | Rewrite the storage claims |
| `scripts/verify-no-stored-location.ts` | Rewrite around the new invariant |
| `scripts/verify-migrations.mjs` | Invariant 17 for `block_district` |
| `.env.example` | `GOOGLE_PLACES_API_KEY` |
| `docs/product-roadmap.md` | Record the partial reversal of TASK-070 |

**Deleted:** `src/components/features/ZipEntry.tsx` (absorbed by `LocationEntry`).

---

### Task 0: Branch setup

**Files:** none — git only.

**Interfaces:**
- Consumes: nothing.
- Produces: `claude/address-district-lookup`, containing migrations `0018`/`0019` and PR #36's `resolve.ts` fix, with no shared branch rewritten.

- [ ] **Step 1: Branch from the map branch, without rewriting it**

The enacted-map migrations live only on `claude/general-election-2026-map` (PR #35). That branch is a published PR head and other sessions may share it, so **do not rebase it** — branch from it instead:

```bash
git fetch origin
git checkout -b claude/address-district-lookup origin/claude/general-election-2026-map
```

- [ ] **Step 2: Bring in main's resolve.ts fix by merging, not rebasing**

The map branch predates `19a2324` (PR #36's "a resolved ZIP has no House race" copy fix), and both it and this work touch `resolve.ts`. Merge `main` in now, so that fix is present before Task 7 edits the same file:

```bash
git merge origin/main
```

Expected: a merge commit. If `resolve.ts` conflicts, keep **both** sides — main's no-House-race copy fix and the map branch's changes. Verify the fix arrived:

```bash
git log --oneline --all --grep="no House race" -1
grep -n "House race" src/lib/resolve.ts src/components/features/YourRaces.tsx | head -5
```

- [ ] **Step 3: Confirm the baseline is green before adding to it**

```bash
ls supabase/migrations/ | tail -3
node scripts/verify-migrations.mjs
npx tsc --noEmit
```

Expected: `0018_zip_seed_2026.sql` and `0019_candidate_unopposed.sql` are present, and both checks pass. If they fail here, fix that first — you must not inherit a red baseline and then wonder which task broke it.



---

### Task 1: One county list

**Files:**
- Create: `src/lib/counties.ts`
- Create: `scripts/verify-counties.ts`
- Modify: `src/lib/resolve.ts:8-13` (replace the const with a re-export)
- Modify: `src/components/features/CountyPicker.tsx:6-11` (delete `COUNTIES`)

**Interfaces:**
- Consumes: `Metro` from `@/types/app`.
- Produces: `COVERED_COUNTIES: readonly CoveredCounty[]`, `coveredCounty(fips: string): CoveredCounty | undefined`, and the type `CoveredCounty = { fips: string; name: string; metro: Metro; metroLabel: string }`. Tasks 7, 9 and 11 import these.

**Why:** `CountyPicker` is a client component, so it keeps a second copy of the four counties rather than importing `@/lib/resolve` (which pulls the Supabase client into the browser bundle). Task 9's cookie parser needs to validate a county in the browser too — a third copy. One dependency-free module retires all of it.

- [ ] **Step 1: Write the failing test**

Create `scripts/verify-counties.ts`:

```ts
/* One county list, importable from anywhere.

   COVERED_COUNTIES lived in @/lib/resolve, which imports the Supabase server
   client, so CountyPicker (a client component) kept a duplicate. The district
   cookie needs the same list in the browser, which would have made three. This
   pins the single source and fails if a copy comes back.

   Run: node scripts/verify-counties.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { COVERED_COUNTIES, coveredCounty } from "../src/lib/counties.ts";

const ROOT = resolve(import.meta.dirname, "..");
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

assert("four covered counties", COVERED_COUNTIES.length === 4);
assert(
  "the expected FIPS, in ballot order",
  COVERED_COUNTIES.map((c) => c.fips).join(",") === "12086,12011,12057,12095"
);
assert(
  "every county carries a metro and a display label",
  COVERED_COUNTIES.every((c) => Boolean(c.metro) && Boolean(c.metroLabel))
);
assert("coveredCounty finds Broward", coveredCounty("12011")?.name === "Broward");
assert("coveredCounty rejects an uncovered county", coveredCounty("12087") === undefined);

/* No surface may redeclare the list. Both files must reach it by import. */
for (const rel of ["src/components/features/CountyPicker.tsx", "src/lib/resolve.ts"]) {
  const code = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  assert(`${rel} declares no county list of its own`, !/12086.*12011/s.test(code), rel);
  assert(`${rel} imports from @/lib/counties`, /@\/lib\/counties/.test(code), rel);
}

if (failures) {
  console.error(`\n${failures} county check(s) failed`);
  process.exit(1);
}
console.log("\nAll county checks passed.");
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
node scripts/verify-counties.ts
```

Expected: FAIL — cannot resolve `../src/lib/counties.ts`.

- [ ] **Step 3: Create the module**

Create `src/lib/counties.ts`:

```ts
/* The covered counties, in one place with no dependencies.

   This list used to live in @/lib/resolve, which imports the Supabase server
   client — so CountyPicker, a client component, carried its own copy, and the
   district cookie's parser would have made a third. Everything that needs the
   list can import this: it pulls in nothing but a type.

   metro is the machine value used by news scoping and zip_district; metroLabel
   is what a voter reads under the county name. */

import type { Metro } from "@/types/app";

export interface CoveredCounty {
  fips: string;
  name: string;
  metro: Metro;
  metroLabel: string;
}

export const COVERED_COUNTIES: readonly CoveredCounty[] = [
  { fips: "12086", name: "Miami-Dade", metro: "miami", metroLabel: "Miami" },
  { fips: "12011", name: "Broward", metro: "fort_lauderdale", metroLabel: "Fort Lauderdale" },
  { fips: "12057", name: "Hillsborough", metro: "tampa", metroLabel: "Tampa" },
  { fips: "12095", name: "Orange", metro: "orlando", metroLabel: "Orlando" },
] as const;

export function coveredCounty(fips: string): CoveredCounty | undefined {
  return COVERED_COUNTIES.find((c) => c.fips === fips);
}
```

- [ ] **Step 4: Point the two existing readers at it**

In `src/lib/resolve.ts`, delete the `COVERED_COUNTIES` const (lines 8-13) and re-export instead, keeping every existing consumer's import path working (`news/page.tsx`, `api/news/route.ts`, `CandidateBrowser.tsx`, `directory.ts` all import it from `@/lib/resolve`):

```ts
import { COVERED_COUNTIES } from "@/lib/counties";

/* Re-exported: four server surfaces already import it from here, and the list
   itself now lives in a module the browser can import too. */
export { COVERED_COUNTIES };
```

In `src/components/features/CountyPicker.tsx`, delete the local `COUNTIES` const and import the shared list. The rendered county name stays `c.name`; the line under it becomes `c.metroLabel`:

```tsx
"use client";

import { COVERED_COUNTIES } from "@/lib/counties";
```

Then replace `COUNTIES.map((c) => (` with `COVERED_COUNTIES.map((c) => (`, and the metro line's `{c.metro}` with `{c.metroLabel}`.

- [ ] **Step 5: Run the test and the type check**

```bash
node scripts/verify-counties.ts
npx tsc --noEmit
node scripts/verify-migrations.mjs
```

Expected: all pass. `tsc` is the one that catches a missed `COVERED_COUNTIES` consumer.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/lib/counties.ts src/lib/resolve.ts src/components/features/CountyPicker.tsx scripts/verify-counties.ts
git add src/lib/counties.ts src/lib/resolve.ts src/components/features/CountyPicker.tsx scripts/verify-counties.ts
git commit -m "refactor(counties): one covered-county list, importable from the browser

CountyPicker carried a duplicate because @/lib/resolve pulls the Supabase
client, and the district cookie's parser would have made a third copy.
verify-counties.ts fails if a copy comes back.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The block-seed generator

**Files:**
- Create: `scripts/build-block-seed.mjs`
- Create: `scripts/verify-block-seed.mjs`
- Create: `scripts/fixtures/block-seed/block_assignment.txt`

**Interfaces:**
- Consumes: nothing.
- Produces: `coveredBlocks(text) → { geoid, district }[]` (sorted), `blockRanges(blocks) → { blockStart, blockEnd, countyFips, district }[]`, `rangeMismatches(blocks, ranges) → { geoid, expected, found }[]`, `seedSql(ranges) → string`. Task 4 runs the CLI.

- [ ] **Step 1: Create the fixture**

Create `scripts/fixtures/block-seed/block_assignment.txt`. Deliberately includes an uncovered county (Monroe, `12087`), a malformed line, and a district change inside one county so the range collapsing is actually exercised:

```
120860101001000,24
120860101001001,24
120860101001002,24
120860101001003,25
120860101001004,25
120870101001000,27
120110201001000,23
120110201001001,23
12011020100100X,23
120570301001000,15
120950401001000,10
120950401001001,10
```

- [ ] **Step 2: Write the failing test**

Create `scripts/verify-block-seed.mjs`:

```js
/* Checks the block -> district seed generator (scripts/build-block-seed.mjs).

   Part A is fixture unit checks. Part B is the cross-check against
   0018_zip_seed_2026.sql, and runs only when the real inputs are passed:

     node scripts/verify-block-seed.mjs <block_assignment.txt> <zcta_tabblock.txt>

   Run: node scripts/verify-block-seed.mjs */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coveredBlocks, blockRanges, rangeMismatches, seedSql } from "./build-block-seed.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let failures = 0;
function assert(name, cond, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* ---- Part A: fixtures ---- */
const fixture = readFileSync(
  path.join(root, "scripts", "fixtures", "block-seed", "block_assignment.txt"),
  "utf8"
);
const blocks = coveredBlocks(fixture);

assert("uncovered counties are dropped", !blocks.some((b) => b.geoid.startsWith("12087")));
assert("malformed lines are dropped", !blocks.some((b) => b.geoid.includes("X")));
assert("nine covered blocks survive", blocks.length === 9, `got ${blocks.length}`);
assert(
  "blocks come out sorted by GEOID",
  blocks.every((b, i) => i === 0 || blocks[i - 1].geoid <= b.geoid)
);
assert("districts are formatted FL-n", blocks.every((b) => /^FL-\d{1,2}$/.test(b.district)));

const ranges = blockRanges(blocks);
assert("runs collapse", ranges.length === 5, `got ${ranges.length}`);
assert(
  "the three-block FL-24 run is one range",
  ranges.some(
    (r) =>
      r.district === "FL-24" &&
      r.blockStart === "120860101001000" &&
      r.blockEnd === "120860101001002"
  )
);
assert(
  "every range carries the county from its GEOID prefix",
  ranges.every((r) => r.countyFips === r.blockStart.slice(0, 5))
);
assert("no range spans two counties", ranges.every((r) => r.blockStart.slice(0, 5) === r.blockEnd.slice(0, 5)));

assert("generated ranges answer every source block", rangeMismatches(blocks, ranges).length === 0);

/* Tampering must be caught — that is the whole guarantee the encoding rests on. */
const tampered = ranges.map((r, i) => (i === 0 ? { ...r, district: "FL-99" } : r));
assert("a wrong range is detected", rangeMismatches(blocks, tampered).length > 0);

const sql = seedSql(ranges);
assert("seed replaces rather than appends", /DELETE FROM block_district;/.test(sql));
assert("seed inserts every range", (sql.match(/\(\'1208/g) ?? []).length + (sql.match(/\(\'1201/g) ?? []).length + (sql.match(/\(\'1205/g) ?? []).length + (sql.match(/\(\'1209/g) ?? []).length === ranges.length);
assert("seed names the four columns", /\(block_start, block_end, county_fips, congressional_district\)/.test(sql));

/* ---- Part B: cross-check against 0018 (only with the real inputs) ---- */
const [blockFile, relFile] = process.argv.slice(2);
if (blockFile && relFile) {
  const realBlocks = coveredBlocks(readFileSync(blockFile, "utf8"));
  const realRanges = blockRanges(realBlocks);
  assert("the real plan replays exactly", rangeMismatches(realBlocks, realRanges).length === 0);

  /* zip_district rows from the applied migration: every non-split ZIP asserts
     one district for its whole ZCTA, so every covered block in that ZCTA must
     agree. This is the independent check — a different derivation of the same
     truth. */
  const zipSql = readFileSync(
    path.join(root, "supabase", "migrations", "0018_zip_seed_2026.sql"),
    "utf8"
  );
  const districtByZip = new Map();
  const splitZips = new Set();
  for (const m of zipSql.matchAll(
    /\('(\d{5})','(\d{5})','[^']*','(FL-\d{1,2})','[^']*',(true|false),true\)/g
  )) {
    const [, zip, , district, isSplit] = m;
    if (isSplit === "true") splitZips.add(zip);
    else districtByZip.set(zip, district);
  }
  assert("parsed some non-split ZIPs from 0018", districtByZip.size > 0, `${districtByZip.size}`);

  const districtByBlock = new Map(realBlocks.map((b) => [b.geoid, b.district]));
  const lines = readFileSync(relFile, "utf8").replace(/^﻿/, "").split("\n");
  const header = lines[0].split("|").map((h) => h.trim());
  const ZCTA = header.indexOf("GEOID_ZCTA5_20");
  const BLOCK = header.indexOf("GEOID_TABBLOCK_20");
  assert("relationship file has the expected columns", ZCTA >= 0 && BLOCK >= 0);

  const disagreements = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split("|");
    const zip = cols[ZCTA]?.trim();
    const block = cols[BLOCK]?.trim();
    const expected = districtByZip.get(zip);
    if (!expected || splitZips.has(zip)) continue;
    const actual = districtByBlock.get(block);
    if (actual && actual !== expected) disagreements.push(`${zip}/${block}: ${actual} != ${expected}`);
  }
  assert(
    "every block in a non-split ZIP matches that ZIP's district",
    disagreements.length === 0,
    disagreements.slice(0, 5).join("; ")
  );
}

if (failures) {
  console.error(`\n${failures} block-seed check(s) failed`);
  process.exit(1);
}
console.log("\nAll block-seed checks passed.");
```

- [ ] **Step 3: Run it to make sure it fails**

```bash
node scripts/verify-block-seed.mjs
```

Expected: FAIL — cannot find module `./build-block-seed.mjs`.

- [ ] **Step 4: Write the generator**

Create `scripts/build-block-seed.mjs`:

```js
/* Generates supabase/migrations/0022_block_seed_2026.sql — census block ->
   congressional district for the four covered counties — from the enacted 2026
   Florida congressional plan:

     EOGPCRP2026_block_assignment.txt — one line per 2020 census block:
       <15-digit block GEOID>,<district number>

   This is the same input scripts/build-zip-seed.mjs takes, deliberately: an
   address resolves through the block assignment and a ZIP resolves through a
   crosswalk aggregated from it, so the two can never answer differently.

   Blocks are emitted as run-length ranges over sorted GEOIDs rather than one
   row per block. Districts cluster by tract, so this turns ~10^5 rows into
   ~10^3 and keeps the migration readable. GEOIDs are fixed width, so a
   lexicographic BETWEEN over CHAR(15) is numerically correct.

   Ranges are only safe if they answer every source block the way the source
   file does, so nothing is written until rangeMismatches() comes back empty.

   Run: node scripts/build-block-seed.mjs <block_assignment.txt> */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COVERED_FIPS = new Set(["12086", "12011", "12057", "12095"]);

/** Covered-county blocks as { geoid, district }, sorted by GEOID. */
export function coveredBlocks(blockAssignmentText) {
  const blocks = [];
  for (const line of blockAssignmentText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [geoid, district] = trimmed.split(",");
    if (!/^\d{15}$/.test(geoid ?? "")) continue;
    if (!COVERED_FIPS.has(geoid.slice(0, 5))) continue;
    const n = Number(district);
    if (!Number.isInteger(n) || n < 1) continue;
    blocks.push({ geoid, district: `FL-${n}` });
  }
  blocks.sort((a, b) => (a.geoid < b.geoid ? -1 : a.geoid > b.geoid ? 1 : 0));
  return blocks;
}

/** Collapse sorted blocks into contiguous same-district, same-county ranges. */
export function blockRanges(blocks) {
  const ranges = [];
  for (const block of blocks) {
    const countyFips = block.geoid.slice(0, 5);
    const last = ranges[ranges.length - 1];
    if (last && last.district === block.district && last.countyFips === countyFips) {
      last.blockEnd = block.geoid;
      continue;
    }
    ranges.push({ blockStart: block.geoid, blockEnd: block.geoid, countyFips, district: block.district });
  }
  return ranges;
}

/* Replay: every source block, looked up through the ranges the way Postgres
   will look it up. Both inputs are sorted, so one forward sweep does it. */
export function rangeMismatches(blocks, ranges) {
  const mismatches = [];
  let i = 0;
  for (const block of blocks) {
    while (i < ranges.length && ranges[i].blockEnd < block.geoid) i++;
    const r = ranges[i];
    const found =
      r && r.blockStart <= block.geoid && block.geoid <= r.blockEnd ? r.district : null;
    if (found !== block.district) {
      mismatches.push({ geoid: block.geoid, expected: block.district, found });
    }
  }
  return mismatches;
}

/** The migration body: a full replacement of block_district. */
export function seedSql(ranges) {
  const values = ranges.map(
    (r) => `('${r.blockStart}','${r.blockEnd}','${r.countyFips}','${r.district}')`
  );
  return `-- Census block -> congressional district for the four covered counties, on
-- the map enacted by HB 1-D (signed 2026-05-04, published as EOGPCRP2026) --
-- the map the November 2026 general is run on.
-- Generated by scripts/build-block-seed.mjs from the enacted plan's block
-- assignment: the same input 0018_zip_seed_2026.sql is built from, so an
-- address and a ZIP cannot resolve to different districts.
-- Rows are run-length ranges over sorted 15-digit block GEOIDs. The generator
-- replays every source block through them and refuses to write on a mismatch.

DELETE FROM block_district;
INSERT INTO block_district (block_start, block_end, county_fips, congressional_district)
VALUES
${values.join(",\n")};
`;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const [blockFile] = process.argv.slice(2);
  if (!blockFile) {
    console.error("usage: node scripts/build-block-seed.mjs <block_assignment.txt>");
    process.exit(1);
  }
  const blocks = coveredBlocks(readFileSync(blockFile, "utf8"));
  /* Empty means the file is not what we think it is — wrong plan, wrong
     column order, wrong state. Never write an empty migration. */
  if (blocks.length === 0) {
    console.error(`no covered blocks found in ${blockFile}; check the file format`);
    process.exit(1);
  }
  const ranges = blockRanges(blocks);
  const mismatches = rangeMismatches(blocks, ranges);
  if (mismatches.length > 0) {
    console.error(
      `range encoding is wrong for ${mismatches.length} block(s), e.g. ${JSON.stringify(mismatches[0])}`
    );
    process.exit(1);
  }
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const out = path.join(root, "supabase", "migrations", "0022_block_seed_2026.sql");
  writeFileSync(out, seedSql(ranges));
  const districts = new Set(ranges.map((r) => r.district));
  console.log(
    `wrote ${out}: ${ranges.length} ranges over ${blocks.length} blocks, ${districts.size} districts`
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
node scripts/verify-block-seed.mjs
```

Expected: PASS — every Part A check ok, Part B skipped (no arguments).

- [ ] **Step 6: Commit**

```bash
npx prettier --write scripts/build-block-seed.mjs scripts/verify-block-seed.mjs
git add scripts/build-block-seed.mjs scripts/verify-block-seed.mjs scripts/fixtures/block-seed/block_assignment.txt
git commit -m "feat(block-seed): generate block -> district ranges from the enacted plan

Run-length ranges over sorted 15-digit GEOIDs, from the same EOGPCRP2026 block
assignment 0018's ZIP crosswalk is built from -- so an address and a ZIP cannot
resolve to different districts. The generator replays every source block
through the generated ranges and refuses to write on a mismatch, which is what
makes the encoding safe rather than clever.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: The table and its RLS

**Files:**
- Create: `supabase/migrations/0020_block_district.sql`
- Create: `supabase/migrations/0021_block_district_rls.sql`
- Modify: `scripts/verify-migrations.mjs` (doc comment list, and a new invariant block before the final `RESET ROLE`)

**Interfaces:**
- Consumes: nothing.
- Produces: table `block_district(block_start CHAR(15) PK, block_end CHAR(15), county_fips CHAR(5), congressional_district TEXT)`, readable by `anon`. Task 7 queries it.

- [ ] **Step 1: Write the failing test**

In `scripts/verify-migrations.mjs`, add to the numbered list in the header comment:

```
    17. 0020/0021 block_district invariants (address lookup): the table and its
        range index exist; the CHECK rejects block_end < block_start; anon can
        SELECT it (it is a public district map) but cannot INSERT.
```

Then insert this block immediately **before** the trailing `await db.exec("RESET ROLE;");`:

```js
/* 17. block_district — public reference data for address lookup. */
await db.exec("SET ROLE service_role;");
await check("block_district accepts a range row", async () => {
  await db.exec(
    `INSERT INTO block_district (block_start, block_end, county_fips, congressional_district)
     VALUES ('120860036061000','120860036061999','12086','FL-27');`
  );
  const res = await db.query(
    "SELECT congressional_district FROM block_district WHERE block_start <= '120860036061055' AND block_end >= '120860036061055';"
  );
  if (res.rows[0]?.congressional_district !== "FL-27") {
    throw new Error("expected a range lookup to find FL-27");
  }
});
await expectConstraintViolation(
  "a range cannot end before it starts",
  `INSERT INTO block_district (block_start, block_end, county_fips, congressional_district)
   VALUES ('120860036061999','120860036061000','12086','FL-27');`,
  /block_end|check/i
);
await db.exec("SET ROLE anon;");
await check("anon can read the district map", async () => {
  const res = await db.query("SELECT count(*)::int AS n FROM block_district;");
  if (res.rows[0].n < 1) throw new Error("anon saw no block_district rows");
});
await expectDenied(
  "anon cannot write block_district",
  `INSERT INTO block_district (block_start, block_end, county_fips, congressional_district)
   VALUES ('120110201001000','120110201001999','12011','FL-23');`
);
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
node scripts/verify-migrations.mjs
```

Expected: FAIL — `relation "block_district" does not exist`.

- [ ] **Step 3: Write the migrations**

Create `supabase/migrations/0020_block_district.sql`:

```sql
-- Census block -> congressional district, for address lookup (spec
-- docs/superpowers/specs/2026-09-09-address-district-lookup-design.md).
--
-- Ranges, not one row per block: districts cluster by tract, so run-length
-- encoding the sorted 15-digit GEOIDs turns ~10^5 rows into ~10^3. GEOIDs are
-- fixed width, so a lexicographic BETWEEN is numerically correct.
-- Seeded by 0022_block_seed_2026.sql, generated by scripts/build-block-seed.mjs
-- from the same enacted-plan file 0018's ZIP crosswalk is built from.
CREATE TABLE block_district (
  block_start            CHAR(15) PRIMARY KEY,
  block_end              CHAR(15) NOT NULL,
  county_fips            CHAR(5)  NOT NULL,
  congressional_district TEXT     NOT NULL,
  CONSTRAINT block_district_range_ordered CHECK (block_end >= block_start)
);

-- The lookup is always "which range contains this GEOID".
CREATE INDEX idx_block_district_range ON block_district (block_start, block_end);
```

Create `supabase/migrations/0021_block_district_rls.sql`:

```sql
-- RLS for block_district, following 0002 and 0011 exactly. It is a district
-- map: public reference data with nothing voter-specific in it, so anon reads
-- all of it and writes none of it.

ALTER TABLE block_district ENABLE ROW LEVEL SECURITY;

-- 0002 revoked writes across the schema before this table existed, so the
-- grants are repeated here rather than assumed.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON block_district FROM anon, authenticated;
GRANT ALL    ON block_district TO service_role;
GRANT SELECT ON block_district TO anon;

CREATE POLICY anon_read_block_district ON block_district
  FOR SELECT TO anon
  USING (true);
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node scripts/verify-migrations.mjs
```

Expected: PASS, including `migration applies: 0020_block_district.sql`, `0021_block_district_rls.sql`, and the four new invariant-17 lines.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0020_block_district.sql supabase/migrations/0021_block_district_rls.sql scripts/verify-migrations.mjs
git commit -m "feat(db): block_district table and RLS for address lookup

Run-length ranges over census block GEOIDs, anon-readable like zip_district --
it is a district map, not voter data. verify-migrations gains invariant 17: the
range lookup works, the CHECK rejects an inverted range, anon reads but cannot
write.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Generate the real seed

**Files:**
- Create: `supabase/migrations/0022_block_seed_2026.sql` (generated — never hand-edit)

**Interfaces:**
- Consumes: `build-block-seed.mjs` from Task 2, `0018_zip_seed_2026.sql` from the map branch.
- Produces: a populated `block_district`. Task 7's queries return rows because of this.

- [ ] **Step 1: Download the enacted plan's block assignment**

The Florida Senate publishes it, and PR #33's handoff records the URL. It is 7.6 MB and **must not be committed** — keep it outside the repo:

```bash
mkdir -p /tmp/kyv-plan
curl -s -o /tmp/kyv-plan/EOGPCRP2026_block_assignment.txt \
  https://www.flsenate.gov/PublishedContent/Session/Congressional/EOGPCRP2026.txt
```

Do **not** substitute a Census congressional shapefile. Census publishes the 2024 map — its geocoder still answers "116th Congressional District 27" for a Miami address — and using it would silently seed the wrong districts for every voter.

- [ ] **Step 2: Verify the file before trusting it**

```bash
wc -l /tmp/kyv-plan/EOGPCRP2026_block_assignment.txt
head -3 /tmp/kyv-plan/EOGPCRP2026_block_assignment.txt
grep -cE '^[0-9]{15},[0-9]+$' /tmp/kyv-plan/EOGPCRP2026_block_assignment.txt
awk -F, '{print $2}' /tmp/kyv-plan/EOGPCRP2026_block_assignment.txt | sort -un | tr '\n' ' '
```

Expected, measured from the real file on 2026-09-09 — exact, not approximate:

- **390,066 lines**, and **390,066** of them well-formed
- first line `120010002011000,3`
- districts exactly **`1` … `28`**, Florida's full congressional delegation

**Any deviation means the wrong file.** Districts running past 28 or stopping short is the loudest signal; a different line count is the next. Stop and re-check rather than generating a seed from it.


- [ ] **Step 3: Download the ZCTA/tabblock relationship file for the cross-check**

```bash
curl -s -o /tmp/kyv-plan/zcta_tabblock_natl.txt \
  https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_tabblock20_natl.txt
head -1 /tmp/kyv-plan/zcta_tabblock_natl.txt
```

Expected: a pipe-delimited header containing `GEOID_ZCTA5_20` and `GEOID_TABBLOCK_20`. This is the same file `build-zip-seed.mjs` uses; `www2.census.gov` answered 200 on 2026-09-09. It is national and large — filter to Florida blocks if it is unwieldy:

```bash
grep -E '(^|\|)12[0-9]{13}(\||$)' /tmp/kyv-plan/zcta_tabblock_natl.txt > /tmp/kyv-plan/zcta_tabblock_fl.txt
```

Keep the header line when filtering — the verifier reads column positions by name from it:

```bash
head -1 /tmp/kyv-plan/zcta_tabblock_natl.txt > /tmp/kyv-plan/zcta_fl.txt
cat /tmp/kyv-plan/zcta_tabblock_fl.txt >> /tmp/kyv-plan/zcta_fl.txt
```

- [ ] **Step 4: Generate the seed**

```bash
node scripts/build-block-seed.mjs /tmp/kyv-plan/EOGPCRP2026_block_assignment.txt
```

Expected, from running this exact logic against the real file on 2026-09-09:

```
wrote .../0022_block_seed_2026.sql: 982 ranges over 89816 blocks, 16 districts
```

Those three numbers are exact. Blocks split by county as Miami-Dade 31,622 · Broward 20,939 · Hillsborough 19,461 · Orange 17,794, and the 16 districts are FL-7, 8, 9, 10, 11, 12, 14, 15, 16, 20, 22, 24, 25, 26, 27, 28 — **the same 16 that `0019`'s coverage widening assumes**, which is independent confirmation the file is the right one.

The encoding compresses 91.5×, so the migration lands around 50 KB. If the generator refuses to write, its mismatch report means the range encoding is wrong: fix `blockRanges`, never bypass the check.

- [ ] **Step 5: Run the cross-check against 0018**

```bash
node scripts/verify-block-seed.mjs /tmp/kyv-plan/EOGPCRP2026_block_assignment.txt /tmp/kyv-plan/zcta_fl.txt
```

Expected: PASS, including `the real plan replays exactly` and `every block in a non-split ZIP matches that ZIP's district`. A disagreement here means the address path and the ZIP path would answer differently — **do not proceed**. The likely causes, in order: the wrong plan file, a `zip_district` regex that missed rows (check `parsed some non-split ZIPs from 0018` reported a plausible count), or a relationship file from a different vintage.

- [ ] **Step 6: Apply and confirm the seed loads**

```bash
node scripts/verify-migrations.mjs
```

Expected: PASS. This applies `0022` in PGlite, so it also proves the generated SQL parses and satisfies the CHECK on every row.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0022_block_seed_2026.sql
git commit -m "feat(db): seed block_district from the enacted 2026 plan

Generated by scripts/build-block-seed.mjs from EOGPCRP2026's block assignment.
Cross-checked against 0018: every covered block in a non-split ZIP resolves to
that ZIP's district, so the address path and the ZIP path agree by
construction.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
### Task 5: The pure address→district logic

**Files:**
- Create: `src/lib/address-lookup.ts`
- Create: `src/lib/census-block.ts`
- Create: `scripts/fixtures/address/census-block.json`
- Create: `scripts/verify-address-resolve.ts`

**Interfaces:**
- Consumes: `zod`; `AddressSuggestion` as a **type only** (Task 10 adds it to `src/types/app.ts`; until then declare it locally and Task 10 moves it).
- Produces, from `address-lookup.ts`: `parseBlockResponse(json: unknown): CensusBlock | null`, `parseSuggestions(json: unknown): AddressSuggestion[]`, `parsePlaceLocation(json: unknown): PlaceLocation | null`, `districtFromBlockRows(rows, geoid): { district, countyFips } | null`, and the types `CensusBlock = { geoid: string; state: string }` and `PlaceLocation = { lat: number; lng: number }`. From `census-block.ts`: `blockForCoordinates(lat, lng): Promise<CensusBlock | null>`. Tasks 6, 7 and 8 use these.

**Why the split:** `verify-*` scripts run under plain `node`, where `server-only` throws and `@/` value imports do not resolve. So everything with logic worth testing goes in one import-clean module and the fetching wrappers stay thin — exactly how `src/lib/news-match.ts` is arranged.

- [ ] **Step 1: Create the fixture from a real response**

Create `scripts/fixtures/address/census-block.json`. This is a real capture for `444 SW 2nd Ave, Miami, FL 33130` (trimmed, with a few original extra fields kept so the parser is proven tolerant of them):

```json
{
  "result": {
    "geographies": {
      "Census Blocks": [
        {
          "GEOID": "120860036061055",
          "STATE": "12",
          "COUNTY": "086",
          "TRACT": "003606",
          "BLOCK": "1055",
          "NAME": "Block 1055",
          "AREALAND": 15423,
          "POP100": 0
        }
      ]
    },
    "input": {
      "location": { "x": -80.197602442738, "y": 25.769463071522 }
    }
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `scripts/verify-address-resolve.ts`. Tasks 6 and 8 append to this file:

```ts
/* Checks the address -> district path with no network and no API key: every
   external response is a fixture, so this runs on a laptop with nothing
   configured.

   The privacy assertions matter as much as the parsing ones. An address must
   not survive anywhere: not in a response body, not in a log line.

   Run: node scripts/verify-address-resolve.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseBlockResponse,
  districtFromBlockRows,
} from "../src/lib/address-lookup.ts";

const ROOT = resolve(import.meta.dirname, "..");
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(ROOT, "scripts", "fixtures", "address", name), "utf8"));

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* ---- Census: coordinate -> block ---- */
const block = parseBlockResponse(fixture("census-block.json"));
assert("the block GEOID is read", block?.geoid === "120860036061055");
assert("the state is read", block?.state === "12");
assert("the county is the GEOID's first five characters", block?.geoid.slice(0, 5) === "12086");
assert(
  "an empty geographies list yields null",
  parseBlockResponse({ result: { geographies: { "Census Blocks": [] } } }) === null
);
assert("a malformed payload yields null", parseBlockResponse({ nope: true }) === null);
assert(
  "a short GEOID is rejected rather than trusted",
  parseBlockResponse({
    result: { geographies: { "Census Blocks": [{ GEOID: "1208600", STATE: "12" }] } },
  }) === null
);

/* ---- block -> district, the range lookup's own logic ---- */
const rows = [
  {
    block_start: "120860036061000",
    block_end: "120860036061999",
    county_fips: "12086",
    congressional_district: "FL-27",
  },
];
assert("a GEOID inside the range resolves", districtFromBlockRows(rows, "120860036061055")?.district === "FL-27");
assert("the county comes back with it", districtFromBlockRows(rows, "120860036061055")?.countyFips === "12086");
assert("a GEOID outside every range resolves to nothing", districtFromBlockRows(rows, "120990036061055") === null);
assert("no rows resolves to nothing", districtFromBlockRows([], "120860036061055") === null);
assert(
  "the range boundaries are inclusive",
  districtFromBlockRows(rows, "120860036061000")?.district === "FL-27" &&
    districtFromBlockRows(rows, "120860036061999")?.district === "FL-27"
);

if (failures) {
  console.error(`\n${failures} address-resolve check(s) failed`);
  process.exit(1);
}
console.log("\nAll address-resolve checks passed.");
```

- [ ] **Step 3: Run it to make sure it fails**

```bash
node scripts/verify-address-resolve.ts
```

Expected: FAIL — cannot resolve `../src/lib/address-lookup.ts`.

- [ ] **Step 4: Write the pure module**

Create `src/lib/address-lookup.ts`:

```ts
import { z } from "zod";

/* The address -> district path, minus the I/O.

   Pure on purpose: no network, no database, no framework, no `server-only`.
   scripts/verify-address-resolve.ts drives it directly under plain node, which
   it cannot do for a module that imports `server-only` or an @/-aliased value.
   src/lib/news-match.ts is arranged the same way and for the same reason.

   Three response shapes and one lookup live here. The fetching lives in
   census-block.ts and geocode.ts, which are thin by design. */

export interface CensusBlock {
  geoid: string;
  state: string;
}

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface AddressSuggestion {
  placeId: string;
  text: string;
  secondary: string | null;
}

const blockSchema = z.object({
  result: z.object({
    geographies: z.object({
      "Census Blocks": z.array(z.object({ GEOID: z.string(), STATE: z.string() })).default([]),
    }),
  }),
});

export function parseBlockResponse(json: unknown): CensusBlock | null {
  const parsed = blockSchema.safeParse(json);
  if (!parsed.success) return null;
  const block = parsed.data.result.geographies["Census Blocks"][0];
  /* A GEOID that is not 15 digits is not a 2020 census block, and guessing from
     a partial one would silently answer the wrong district. */
  if (!block || !/^\d{15}$/.test(block.GEOID)) return null;
  return { geoid: block.GEOID, state: block.STATE };
}

const autocompleteSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            text: z.object({ text: z.string() }),
            structuredFormat: z
              .object({ secondaryText: z.object({ text: z.string() }).optional() })
              .optional(),
          })
          .optional(),
      })
    )
    .default([]),
});

export function parseSuggestions(json: unknown): AddressSuggestion[] {
  const parsed = autocompleteSchema.safeParse(json);
  if (!parsed.success) return [];
  return parsed.data.suggestions.flatMap((s) => {
    /* Query predictions carry no placePrediction. They are search strings, not
       addresses, and cannot be resolved to a block. */
    if (!s.placePrediction) return [];
    return [
      {
        placeId: s.placePrediction.placeId,
        text: s.placePrediction.text.text,
        secondary: s.placePrediction.structuredFormat?.secondaryText?.text ?? null,
      },
    ];
  });
}

const detailsSchema = z.object({
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
});

export function parsePlaceLocation(json: unknown): PlaceLocation | null {
  const parsed = detailsSchema.safeParse(json);
  if (!parsed.success || !parsed.data.location) return null;
  return { lat: parsed.data.location.latitude, lng: parsed.data.location.longitude };
}

/* The range lookup's own logic, so it can be tested without a database.
   Boundaries are inclusive, matching the SQL the query builder emits. */
export function districtFromBlockRows(
  rows: Array<{
    block_start: string;
    block_end: string;
    county_fips: string;
    congressional_district: string;
  }>,
  blockGeoid: string
): { district: string; countyFips: string } | null {
  const row = rows.find((r) => r.block_start <= blockGeoid && blockGeoid <= r.block_end);
  if (!row) return null;
  return { district: row.congressional_district, countyFips: row.county_fips };
}
```

- [ ] **Step 5: Write the Census fetch wrapper**

Create `src/lib/census-block.ts`:

```ts
import "server-only";
import { parseBlockResponse, type CensusBlock } from "@/lib/address-lookup";

/* Coordinate -> 2020 census block, from the US Census Geocoder.

   Only a coordinate goes out: no street address, no ZIP, no identifier. That is
   the whole reason the resolve route asks Google for `location` and nothing else
   (spec §8).

   The geocoder's own congressional layer is deliberately NOT used. It answers
   with the map Census has loaded -- a Miami address still comes back "116th
   Congressional District 27" -- while the November 2026 general runs on the plan
   enacted by HB 1-D. District comes from block_district instead.

   layers=Census Blocks keeps the response to a single geography, about 850 bytes
   instead of a dozen unrelated layers. */

const ENDPOINT = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

export async function blockForCoordinates(lat: number, lng: number): Promise<CensusBlock | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Census2020_Current");
  url.searchParams.set("layers", "Census Blocks");
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return parseBlockResponse(await res.json());
  } catch {
    /* Timeout or transport failure. The caller degrades to the district picker;
       nothing is logged, because a thrown message can carry the URL and the URL
       carries a coordinate. */
    return null;
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
node scripts/verify-address-resolve.ts
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src/lib/address-lookup.ts src/lib/census-block.ts scripts/verify-address-resolve.ts
git add src/lib/address-lookup.ts src/lib/census-block.ts scripts/verify-address-resolve.ts scripts/fixtures/address/census-block.json
git commit -m "feat(address-lookup): pure parsing and block lookup, plus the Census wrapper

Pure module so the verify script can drive it under plain node -- server-only
throws there and @/ value imports do not resolve. Only a coordinate ever leaves
for Census. The geocoder's own congressional layer is unused on purpose: it
answers with the 2024 map, and the 2026 general runs on the enacted HB 1-D plan.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: The Places client

**Files:**
- Create: `src/lib/geocode.ts`
- Create: `scripts/fixtures/address/places-autocomplete.json`
- Create: `scripts/fixtures/address/places-details.json`
- Modify: `scripts/verify-address-resolve.ts` (append a section)
- Modify: `.env.example`

**Interfaces:**
- Consumes: `parseSuggestions`, `parsePlaceLocation`, `AddressSuggestion`, `PlaceLocation` (Task 5).
- Produces: `suggestAddresses(input: string, sessionToken: string): Promise<AddressSuggestion[]>`, `placeLocation(placeId: string, sessionToken: string): Promise<PlaceLocation | null>`, `placesConfigured(): boolean`. Tasks 8, 10 and 12 use these.

**Caveat to carry:** both Places fixtures are written from the documented response shape (verified against the Places API (New) reference on 2026-09-09), not from a live call — there is no key yet. Task 14 re-captures them. Treat a mismatch found then as a fixture bug, not a code bug.

- [ ] **Step 1: Create the fixtures**

Create `scripts/fixtures/address/places-autocomplete.json`:

```json
{
  "suggestions": [
    {
      "placePrediction": {
        "place": "places/ChIJ_place_one",
        "placeId": "ChIJ_place_one",
        "text": { "text": "444 SW 2nd Ave, Miami, FL 33130, USA" },
        "structuredFormat": {
          "mainText": { "text": "444 SW 2nd Ave" },
          "secondaryText": { "text": "Miami, FL 33130, USA" }
        },
        "types": ["street_address"]
      }
    },
    {
      "placePrediction": {
        "place": "places/ChIJ_place_two",
        "placeId": "ChIJ_place_two",
        "text": { "text": "444 SW 2nd St, Fort Lauderdale, FL 33312, USA" },
        "structuredFormat": {
          "mainText": { "text": "444 SW 2nd St" },
          "secondaryText": { "text": "Fort Lauderdale, FL 33312, USA" }
        },
        "types": ["street_address"]
      }
    },
    { "queryPrediction": { "text": { "text": "444 SW 2nd" } } }
  ]
}
```

Create `scripts/fixtures/address/places-details.json`:

```json
{
  "location": { "latitude": 25.769463071522, "longitude": -80.197602442738 }
}
```

- [ ] **Step 2: Append the failing tests**

In `scripts/verify-address-resolve.ts`, extend the existing import from `address-lookup.ts` to include `parseSuggestions` and `parsePlaceLocation`, then insert this section **before** the final `if (failures)` block:

```ts
/* ---- Places: suggestions and coordinates ---- */
const suggestions = parseSuggestions(fixture("places-autocomplete.json"));
assert("both place predictions are read", suggestions.length === 2, `got ${suggestions.length}`);
assert("a query prediction is dropped", suggestions.every((s) => Boolean(s.placeId)));
assert("the place id is carried", suggestions[0].placeId === "ChIJ_place_one");
assert(
  "the full text is carried for display",
  suggestions[0].text === "444 SW 2nd Ave, Miami, FL 33130, USA"
);
assert("the secondary line is carried", suggestions[0].secondary === "Miami, FL 33130, USA");
assert("a malformed payload yields no suggestions", parseSuggestions({ nope: 1 }).length === 0);

const place = parsePlaceLocation(fixture("places-details.json"));
assert("the latitude is read", place?.lat === 25.769463071522);
assert("the longitude is read", place?.lng === -80.197602442738);
assert("details with no location yields null", parsePlaceLocation({}) === null);

/* The coordinate must reach Census exactly. Rounding one can move it across a
   block boundary, and a block boundary is a district boundary. */
assert(
  "the coordinate is not rounded on the way through",
  String(place?.lat).length > 8 && String(place?.lng).length > 8
);
```

- [ ] **Step 3: Run it to make sure it fails**

```bash
node scripts/verify-address-resolve.ts
```

Expected: FAIL — `parseSuggestions` is not exported from `address-lookup.ts`… unless you wrote it in Task 5, in which case this step fails on the **fixtures** being absent. Either way, do not proceed until you have seen it fail.

- [ ] **Step 4: Write the client**

Create `src/lib/geocode.ts`:

```ts
import "server-only";
import {
  parseSuggestions,
  parsePlaceLocation,
  type AddressSuggestion,
  type PlaceLocation,
} from "@/lib/address-lookup";

/* Google Places (New), reached only from the server.

   The key never goes to the browser: a referrer-restricted browser key is
   readable from any page's source, and proxying also keeps the voter's IP out of
   Google's logs. The trade-off, stated plainly in the spec §8, is that the typed
   fragment transits our server -- it lives in memory for one request, is passed
   straight back, and is never logged or stored.

   Details asks for `location` and nothing else. Not formattedAddress, not
   addressComponents: we do not need the address, so we do not receive it. That
   also keeps the call in the Place Details Essentials SKU. */

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places";

const AUTOCOMPLETE_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat";

/* Florida's bounding box. Restriction, not bias: a Florida voter guide has no
   use for a Georgia address, and a suggestion we never ask for is one we never
   pay for. */
const FLORIDA = {
  rectangle: {
    low: { latitude: 24.3963, longitude: -87.6349 },
    high: { latitude: 31.0011, longitude: -79.9743 },
  },
};

export function placesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export async function suggestAddresses(
  input: string,
  sessionToken: string
): Promise<AddressSuggestion[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": AUTOCOMPLETE_MASK,
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        includedRegionCodes: ["us"],
        locationRestriction: FLORIDA,
        languageCode: "en",
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return [];
    return parseSuggestions(await res.json());
  } catch {
    /* Never logged: the request body is a partial home address. */
    return [];
  }
}

export async function placeLocation(
  placeId: string,
  sessionToken: string
): Promise<PlaceLocation | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const url = new URL(`${DETAILS_URL}/${encodeURIComponent(placeId)}`);
  url.searchParams.set("sessionToken", sessionToken);
  try {
    const res = await fetch(url, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return parsePlaceLocation(await res.json());
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Add the env var**

In `.env.example`, under `# --- Web app: features ---`, after the `ANTHROPIC_API_KEY` line:

```
# Server-only. Enables address completion in the location field; without it the
# field takes a ZIP and the district picker still works. Restrict the key to
# Places API (New) and set a daily request cap in the Google Cloud console --
# that quota is the cost guard, not application code.
GOOGLE_PLACES_API_KEY=
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
node scripts/verify-address-resolve.ts
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src/lib/geocode.ts scripts/verify-address-resolve.ts
git add src/lib/geocode.ts scripts/verify-address-resolve.ts scripts/fixtures/address/ .env.example
git commit -m "feat(geocode): server-side Places client for address completion

The key stays server-side and Details asks for location only -- we do not need
the street address, so we do not receive it, and the call stays in the Essentials
SKU. Fixtures are built from the documented response shape; Task 14 re-captures
them from the live API.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Resolution by block and by district

**Files:**
- Modify: `src/lib/resolve.ts` (add three functions; `resolveZip` untouched)

**Interfaces:**
- Consumes: `districtFromBlockRows` (Task 5), `coveredCounty` / `COVERED_COUNTIES` (Task 1), `racesForDistrict` (private, already in `resolve.ts`).
- Produces: `resolveBlock(blockGeoid: string): Promise<{ district: string; countyFips: string } | null>`, `resolveDistrict(countyFips: string, district: string): Promise<ResolveResult | null>`, `getCoveredDistricts(): Promise<CoveredDistrict[]>` with `CoveredDistrict = { countyFips: string; countyName: string; district: string }`. Tasks 8, 10 and 12 use these.

**No new test file:** the logic worth unit-testing is `districtFromBlockRows`, already covered in Task 5. What is added here is database wiring, which `verify-migrations.mjs` (invariant 17) and Task 14's live gate cover between them. Do not fake a test that only asserts the Supabase query builder was called.

- [ ] **Step 1: Write the implementation**

In `src/lib/resolve.ts`, extend the imports:

```ts
import { unstable_cache } from "next/cache";
import { COVERED_COUNTIES, coveredCounty } from "@/lib/counties";
import { districtFromBlockRows } from "@/lib/address-lookup";
```

Then append:

```ts
/* Address path. A census block sits in exactly one district, so unlike a ZIP
   there is nothing to confirm -- which is the whole reason this path exists.
   null means the block is outside the four covered counties, which is also the
   honest answer for a Florida address we do not cover yet. */
export async function resolveBlock(
  blockGeoid: string
): Promise<{ district: string; countyFips: string } | null> {
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("block_district")
    .select("block_start, block_end, county_fips, congressional_district")
    .lte("block_start", blockGeoid)
    .gte("block_end", blockGeoid)
    .limit(1);
  if (error) throw new Error(`block lookup failed: ${error.message}`);
  return districtFromBlockRows(data ?? [], blockGeoid);
}

/* A district the voter has already established -- from an address, a confirmed
   ZIP, or the picker -- plus the county it sits in.

   Also serves /candidates?view=races&district=FL-27&county=12086, which is how
   an address result stays shareable and refreshable with no address anywhere in
   the URL. Returning null for an uncovered county is what makes a stale or
   hand-edited district cookie harmless: no ballot is produced from it. */
export async function resolveDistrict(
  countyFips: string,
  district: string
): Promise<ResolveResult | null> {
  const county = coveredCounty(countyFips);
  if (!county) return null;
  return {
    zip: "",
    inCoverage: true,
    county: county.name,
    countyFips: county.fips,
    metro: county.metro,
    district,
    races: await racesForDistrict(district),
  };
}

export interface CoveredDistrict {
  countyFips: string;
  countyName: string;
  district: string;
}

/* The picker's options: every county+district pair coverage actually contains.

   Read from zip_district rather than block_district for size -- hundreds of rows
   against thousands -- and it is the same answer either way: 0018 is aggregated
   from the same enacted-plan block file 0022 is built from, and
   scripts/verify-block-seed.mjs asserts the two agree. block_district stays the
   authority for resolving a voter; this is only the list of choices. */
async function fetchCoveredDistricts(): Promise<CoveredDistrict[]> {
  let supabase;
  try {
    supabase = await createAnonServerClient();
  } catch {
    /* Unconfigured environment. This read is on the landing page, which is
       prerendered -- the same guard fetchActiveMeasures uses. */
    return [];
  }
  const { data } = await supabase
    .from("zip_district")
    .select("county_fips, county_name, congressional_district")
    .eq("in_coverage", true);

  const seen = new Map<string, CoveredDistrict>();
  for (const row of data ?? []) {
    const key = `${row.county_fips}:${row.congressional_district}`;
    if (!seen.has(key)) {
      seen.set(key, {
        countyFips: row.county_fips,
        countyName: row.county_name,
        district: row.congressional_district,
      });
    }
  }
  /* County in COVERED_COUNTIES order, then district ascending, so the list reads
     the way the county picker does. */
  const countyOrder = new Map(COVERED_COUNTIES.map((c, i) => [c.fips, i]));
  return [...seen.values()].sort(
    (a, b) =>
      (countyOrder.get(a.countyFips) ?? 99) - (countyOrder.get(b.countyFips) ?? 99) ||
      districtNumber(a.district) - districtNumber(b.district)
  );
}

export function getCoveredDistricts() {
  return unstable_cache(fetchCoveredDistricts, ["covered-districts"], {
    revalidate: 3600,
    tags: ["districts"],
  })();
}
```

`districtNumber` already exists at the top of `resolve.ts` — reuse it rather than declaring a second one.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
node scripts/verify-address-resolve.ts
node scripts/verify-migrations.mjs
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/lib/resolve.ts
git add src/lib/resolve.ts
git commit -m "feat(resolve): resolve a block to a district, and a district to a ballot

A block sits in exactly one district, so the address path has nothing to confirm
-- that is the point of it. resolveDistrict also backs ?district=&county=, so an
address result is shareable with no address in the URL, and returns null for an
uncovered county so a stale cookie produces no ballot.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The two routes

**Files:**
- Create: `src/app/api/address/suggest/route.ts`
- Create: `src/app/api/address/resolve/route.ts`
- Modify: `scripts/verify-address-resolve.ts` (append a structural section)

**Interfaces:**
- Consumes: `suggestAddresses`, `placeLocation`, `placesConfigured` (Task 6); `blockForCoordinates` (Task 5); `resolveBlock`, `resolveDistrict` (Task 7); `rateLimit`, `clientKey` (existing).
- Produces: `POST /api/address/suggest` → `{ suggestions: AddressSuggestion[], unavailable?: true }`; `POST /api/address/resolve` → `ResolveResult`. Task 10 calls both.

- [ ] **Step 1: Append the failing structural tests**

These assert the privacy contract, which is a property of the files themselves — there is no HTTP harness in this repo. Add to `scripts/verify-address-resolve.ts` before the final `if (failures)` block:

```ts
/* ---- The routes' privacy contract, asserted structurally ---- */
const routeFiles = [
  "src/app/api/address/suggest/route.ts",
  "src/app/api/address/resolve/route.ts",
];
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

for (const rel of routeFiles) {
  const code = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  assert(`${rel} is POST`, /export async function POST\(/.test(code), rel);
  assert(
    `${rel} exposes no GET`,
    !/export async function GET\(/.test(code),
    "a GET would put the address in the URL, the access log and the referrer"
  );
  assert(`${rel} logs nothing`, !/console\./.test(code), rel);
  assert(`${rel} rate-limits`, /rateLimit\(/.test(code), rel);
  assert(`${rel} writes nothing to the database`, !/\.insert\(|\.upsert\(|service/.test(code), rel);
}
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
node scripts/verify-address-resolve.ts
```

Expected: FAIL — `ENOENT` on `src/app/api/address/suggest/route.ts`.

- [ ] **Step 3: Write the suggest route**

Create `src/app/api/address/suggest/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { placesConfigured, suggestAddresses } from "@/lib/geocode";

/* POST, not GET, and that is not a style choice: the body carries a partial
   home address. A GET would put it in the URL, which means the access log, the
   Referer header and the browser's own history. Nothing here is logged or
   stored (spec §8).

   The 5-character floor and the client's debounce are also the cost control --
   every request is billed. */
const body = z.object({
  q: z.string().min(5).max(120),
  sessionToken: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`addr-suggest:${clientKey(request)}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — give it a minute and try again." },
      { status: 429 }
    );
  }

  /* Address completion is optional. With no key the field still takes a ZIP
     and the district picker still works, so this is a degraded feature rather
     than a broken page. */
  if (!placesConfigured()) {
    return NextResponse.json({ suggestions: [], unavailable: true }, { status: 503 });
  }

  let parsed;
  try {
    parsed = body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  /* suggestAddresses swallows its own failures and returns []; an empty
     dropdown is the right answer for "we could not complete that", and the
     voter still has ZIP and the picker. */
  const suggestions = await suggestAddresses(parsed.data.q, parsed.data.sessionToken);
  return NextResponse.json({ suggestions });
}
```

- [ ] **Step 4: Write the resolve route**

Create `src/app/api/address/resolve/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { placeLocation, placesConfigured } from "@/lib/geocode";
import { blockForCoordinates } from "@/lib/census-block";
import { resolveBlock, resolveDistrict } from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* Place -> coordinate -> census block -> district -> ballot.

   The address is never part of this: the request carries a place id, Google
   answers with a coordinate, and Census sees only that coordinate. Nothing on
   this path is logged or stored. */
const body = z.object({
  placeId: z.string().min(1).max(300),
  sessionToken: z.string().uuid(),
});

const OUT_OF_COVERAGE: ResolveResult = {
  zip: "",
  inCoverage: false,
  races: [],
  message: "We don't cover this area yet.",
};

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`addr-resolve:${clientKey(request)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — give it a minute and try again." },
      { status: 429 }
    );
  }
  if (!placesConfigured()) {
    return NextResponse.json({ error: "Address lookup is unavailable." }, { status: 503 });
  }

  let parsed;
  try {
    parsed = body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const place = await placeLocation(parsed.data.placeId, parsed.data.sessionToken);
    if (!place) {
      return NextResponse.json(
        { error: "We couldn't pin that address — try your ZIP or pick your district." },
        { status: 502 }
      );
    }

    const block = await blockForCoordinates(place.lat, place.lng);
    if (!block) {
      return NextResponse.json(
        { error: "We couldn't match that address to a district — try your ZIP or pick your district." },
        { status: 502 }
      );
    }

    /* Florida is 12. A non-Florida address is out of coverage rather than an
       error: this is a Florida voter guide, and the copy should say so. */
    if (block.state !== "12") return NextResponse.json(OUT_OF_COVERAGE);

    const resolved = await resolveBlock(block.geoid);
    if (!resolved) return NextResponse.json(OUT_OF_COVERAGE);

    const result = await resolveDistrict(resolved.countyFips, resolved.district);
    if (!result) return NextResponse.json(OUT_OF_COVERAGE);
    return NextResponse.json(result);
  } catch {
    /* No logging, deliberately: an error message on this path can carry the
       coordinate, and a coordinate is the voter's home. */
    return NextResponse.json(
      { error: "Something went wrong looking that up — try again." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
node scripts/verify-address-resolve.ts
npx tsc --noEmit
npx eslint src/app/api/address
```

Expected: all three pass.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/app/api/address/suggest/route.ts src/app/api/address/resolve/route.ts scripts/verify-address-resolve.ts
git add src/app/api/address scripts/verify-address-resolve.ts
git commit -m "feat(api): POST address suggest and resolve

Both POST so a home address never reaches a URL, an access log or a Referer
header. Neither logs anything, neither writes to the database, and both degrade
to ZIP and the district picker when the key is absent or Google is down.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
### Task 9: The cookie contract

**Files:**
- Create: `src/lib/district-cookie.ts`
- Modify: `scripts/verify-no-stored-location.ts` (append a cookie section; Task 13 rewrites the rest)

**Interfaces:**
- Consumes: nothing — this module is import-clean so the verify script can drive it under plain `node`.
- Produces: `DISTRICT_COOKIE`, `DISTRICT_COOKIE_MAX_AGE`, `DistrictChoice = { district: string; countyFips: string }`, `parseDistrictCookie(raw): DistrictChoice | null`, `formatDistrictCookie(choice): string`, `readDistrictCookie(): DistrictChoice | null`, `writeDistrictCookie(choice)`, `clearDistrictCookie()`. Tasks 10, 11 and 12 use these.

**No `server-only`, and no imports at all, deliberately:** the chip parses the cookie in the browser, the ballot pages parse it on the server, and `verify-no-stored-location.ts` parses it under plain `node`. Three readers, one definition, so it must import nothing that any of them cannot resolve.

**Where coverage is checked:** not here. This module validates the *shape* (`FL-nn|ccccc`) — which is what keeps a ZIP or an address out of the cookie — while whether that county is actually covered is enforced where a ballot is produced: `resolveDistrict` returns `null` for an uncovered county, so a stale or hand-edited cookie yields no ballot rather than a wrong one. The chip guards its own display with `coveredCounty`.

- [ ] **Step 1: Append the failing tests**

At the top of `scripts/verify-no-stored-location.ts`, add:

```ts
import { parseDistrictCookie, formatDistrictCookie, DISTRICT_COOKIE } from "../src/lib/district-cookie.ts";
```

and insert this section immediately before the final `if (failures)` block:

```ts
/* 6. The district cookie is the one thing that outlives a visit, and its value
      shape is the guarantee that it holds a district rather than a location. */
assert("the cookie is named kyv.district", DISTRICT_COOKIE === "kyv.district");
assert(
  "a well-formed value parses",
  parseDistrictCookie("FL-27|12086")?.district === "FL-27" &&
    parseDistrictCookie("FL-27|12086")?.countyFips === "12086"
);
assert("a single-digit district parses", parseDistrictCookie("FL-7|12011")?.district === "FL-7");
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
  assert(`a malformed value is treated as absent: ${JSON.stringify(bad)}`, parseDistrictCookie(bad) === null);
}
/* A well-shaped value for a county we do not cover parses here and is refused
   downstream: resolveDistrict returns null, so it produces no ballot. Shape is
   this module's job; coverage is the ballot's. */
assert("an uncovered county still parses, and is refused where it matters", parseDistrictCookie("FL-1|12087")?.countyFips === "12087");
assert(
  "formatting round-trips",
  formatDistrictCookie({ district: "FL-27", countyFips: "12086" }) === "FL-27|12086"
);
let refused = false;
try {
  formatDistrictCookie({ district: "33130", countyFips: "12086" });
} catch {
  refused = true;
}
assert("formatting refuses a value that is not a district", refused);
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
node scripts/verify-no-stored-location.ts
```

Expected: FAIL — cannot resolve `../src/lib/district-cookie.ts`.

- [ ] **Step 3: Write the module**

Create `src/lib/district-cookie.ts`:

```ts
/* The whole cookie contract in one file: name, value shape, parse, write, clear.

   What is stored is a district and the county it sits in -- FL-27|12086 -- and
   nothing else. Not the address, not the ZIP, not a coordinate. A congressional
   district holds roughly 750,000 people: it is a public electoral unit that
   identifies nobody, and it is exactly what the app needs to show a ballot.

   The county travels with it because a district cannot yield one -- districts
   span counties and counties span districts -- and county is what news scoping
   and the county elections-office links key on.

   This reverses part of TASK-070 knowingly. What makes it defensible is that
   the value is written only when the voter asks, is visible in the chrome at all
   times, and is forgettable in one click. See the spec §8. */

export const DISTRICT_COOKIE = "kyv.district";
export const DISTRICT_COOKIE_MAX_AGE = 15_552_000; // 180 days

/* The shape is the guarantee. Anything that is not a district and a county FIPS
   cannot be stored here, so a ZIP or an address cannot arrive by accident. */
const VALUE_RE = /^FL-\d{1,2}\|\d{5}$/;

export interface DistrictChoice {
  district: string;
  countyFips: string;
}

export function parseDistrictCookie(raw: string | undefined | null): DistrictChoice | null {
  if (!raw || !VALUE_RE.test(raw)) return null;
  const [district, countyFips] = raw.split("|");
  /* Shape only. Whether that county is covered is enforced by resolveDistrict,
     which returns null and therefore produces no ballot -- so a stale or
     hand-edited cookie is harmless without this module importing anything. */
  return { district, countyFips };
}

export function formatDistrictCookie(choice: DistrictChoice): string {
  const value = `${choice.district}|${choice.countyFips}`;
  if (!VALUE_RE.test(value)) {
    throw new Error("refusing to store a value that is not a district and county");
  }
  return value;
}

/* Written client-side. Cookies cannot be set during render, and this needs no
   server round trip: the value is not a secret, and the chip has to be able to
   change or clear it instantly. */
export function writeDistrictCookie(choice: DistrictChoice): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${DISTRICT_COOKIE}=${formatDistrictCookie(choice)}; path=/; max-age=${DISTRICT_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

export function readDistrictCookie(): DistrictChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )kyv\.district=([^;]*)/);
  return parseDistrictCookie(match ? decodeURIComponent(match[1]) : null);
}

export function clearDistrictCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DISTRICT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node scripts/verify-no-stored-location.ts
npx tsc --noEmit
```

Expected: both pass. (The existing assertions in that script still pass — nothing has been stored yet.)

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/lib/district-cookie.ts scripts/verify-no-stored-location.ts
git add src/lib/district-cookie.ts scripts/verify-no-stored-location.ts
git commit -m "feat(district-cookie): store a district, never a location

FL-27|12086 and nothing else. The value regex is the guarantee: a ZIP or an
address cannot arrive here by accident, and a hand-edited or stale cookie is
treated as absent rather than half-honoured.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: The one smart field

**Files:**
- Create: `src/components/features/LocationEntry.tsx`
- Modify: `src/lib/analytics.ts` (add `district_set`)
- Delete: `src/components/features/ZipEntry.tsx`
- Modify: `src/app/(public)/page.tsx:6,66` and `src/components/features/YourRaces.tsx:5,58,71,84` (swap the component)

**Interfaces:**
- Consumes: `AddressSuggestion` (types), `writeDistrictCookie` (Task 9), `getCoveredDistricts`'s output type `CoveredDistrict` (Task 7), the two routes (Task 8), `/api/resolve` (existing), `CountyPicker`/`DistrictConfirm` (existing).
- Produces: `<LocationEntry submitLabel? placeholder? addressEnabled districts />`. Tasks 11 and 12 render it.

**Where the type comes from:** `AddressSuggestion` lives in `src/lib/address-lookup.ts`, which has no `server-only`, so a client component can import it. Use `import type` regardless — the runtime value is never needed in the browser.

- [ ] **Step 1: Add the analytics event**

In `src/lib/analytics.ts`, extend the union — after `"zip_resolved"`, so the funnel order in `verify-no-stored-location.ts` still holds:

```ts
export type AnalyticsEvent =
  | "ballot_viewed"
  | "zip_resolved"
  | "district_set"
  | "brief_viewed"
  | "quiz_completed"
  | "candidate_saved"
  | "voting_info_requested";
```

Add above the type:

```ts
/* district_set fires whenever the voter establishes a district — by address, by
   ZIP, or from the picker. Its only prop is which of those three it was: a
   method label, never a location. PRD § 12 forbids ZIP values in properties and
   an address would be far worse. */
```

- [ ] **Step 2: Write the component**

Create `src/components/features/LocationEntry.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CountyPicker, DistrictConfirm } from "@/components/features/CountyPicker";
import { track } from "@/lib/analytics";
import { writeDistrictCookie } from "@/lib/district-cookie";
import type { AddressSuggestion } from "@/lib/address-lookup";
import type { CoveredDistrict } from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* One field, two kinds of answer.

   Digits are a ZIP and never leave for Google -- five of them go to the
   existing /api/resolve, split-district confirmation included. Anything with a
   letter is an address: it completes as you type through our own proxy, and the
   one you pick resolves to a census block and therefore to exactly one
   district, with nothing to confirm.

   Underneath is the district picker, which needs no third party at all.

   Whatever route the voter takes, the outcome is the same: a district and a
   county in a cookie, and a URL carrying those two values -- never the address,
   never the ZIP. */

type Stage =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "split"; zip: string; districts: string[] }
  | { kind: "outOfCoverage" };

const MIN_ADDRESS_CHARS = 5;
const DEBOUNCE_MS = 250;

export function LocationEntry({
  submitLabel = "See my ballot",
  placeholder = "Your address or ZIP code",
  addressEnabled = false,
  districts = [],
}: {
  submitLabel?: string;
  placeholder?: string;
  addressEnabled?: boolean;
  districts?: CoveredDistrict[];
} = {}) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showPicker, setShowPicker] = useState(false);

  /* One session token per autocomplete session, spent on the resolve call and
     then replaced. This is what makes the paired calls bill as one session. */
  const sessionToken = useRef<string>("");
  const abort = useRef<AbortController | null>(null);

  const trimmed = value.trim();
  const looksLikeZip = /^\d+$/.test(trimmed);
  const addressMode = addressEnabled && trimmed.length >= MIN_ADDRESS_CHARS && !looksLikeZip;

  /* Suggestions, debounced. A keystroke is a billed request, so this waits for
     a pause, needs five characters, and cancels whatever is still in flight. */
  useEffect(() => {
    if (!addressMode) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      if (!sessionToken.current) sessionToken.current = crypto.randomUUID();
      try {
        const res = await fetch("/api/address/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed, sessionToken: sessionToken.current }),
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data: { suggestions?: AddressSuggestion[] } = await res.json();
        setSuggestions(data.suggestions ?? []);
        setActiveIndex(-1);
      } catch {
        /* Aborted or offline. An empty dropdown is the honest state; ZIP and
           the picker are both still there. */
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [addressMode, trimmed]);

  /* The one place a district is committed, whatever produced it. */
  function commit(choice: { district: string; countyFips: string }, via: "address" | "zip" | "picker") {
    writeDistrictCookie(choice);
    track("district_set", { via });
    const q = new URLSearchParams({
      view: "races",
      district: choice.district,
      county: choice.countyFips,
    });
    router.push(`/candidates?${q}`);
  }

  async function resolveAddress(placeId: string) {
    setStage({ kind: "loading" });
    setSuggestions([]);
    try {
      const res = await fetch("/api/address/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, sessionToken: sessionToken.current || crypto.randomUUID() }),
      });
      /* The session ends with this call whether it succeeded or not. */
      sessionToken.current = "";
      if (!res.ok) {
        setStage({
          kind: "error",
          message:
            "We couldn't match that address to a district. Try your ZIP, or pick your district below.",
        });
        return;
      }
      const data: ResolveResult = await res.json();
      if (!data.inCoverage) {
        setStage({ kind: "outOfCoverage" });
        return;
      }
      if (!data.district || !data.countyFips) {
        setStage({ kind: "error", message: "We couldn't pin that address — pick your district below." });
        return;
      }
      commit({ district: data.district, countyFips: data.countyFips }, "address");
    } catch {
      setStage({ kind: "error", message: "Something went wrong — give it another try." });
    }
  }

  async function resolveZipCode(zip: string, district?: string) {
    setStage({ kind: "loading" });
    try {
      const params = new URLSearchParams({ zip });
      if (district) params.set("district", district);
      const res = await fetch(`/api/resolve?${params}`);
      if (!res.ok) {
        setStage({
          kind: "error",
          message: "We couldn't match that ZIP. Double-check it, or pick your district below.",
        });
        return;
      }
      const data: ResolveResult = await res.json();
      if (!data.inCoverage) {
        setStage({ kind: "outOfCoverage" });
        return;
      }
      if (data.needsCountyConfirm && data.candidateDistricts) {
        setStage({ kind: "split", zip, districts: data.candidateDistricts });
        return;
      }
      track("zip_resolved");
      if (data.district && data.countyFips) {
        commit({ district: data.district, countyFips: data.countyFips }, "zip");
        return;
      }
      /* In coverage but no district — county-only. Keep the existing answer. */
      router.push(`/candidates?view=races&county=${data.countyFips ?? ""}`);
    } catch {
      setStage({ kind: "error", message: "Something went wrong — give it another try." });
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (looksLikeZip) {
      if (!/^\d{5}$/.test(trimmed)) {
        setStage({ kind: "error", message: "ZIP codes are 5 digits — double-check yours." });
        return;
      }
      void resolveZipCode(trimmed);
      return;
    }
    /* An address with the dropdown open: Enter takes the highlighted one, or
       the first if none is highlighted. */
    const picked = suggestions[activeIndex] ?? suggestions[0];
    if (picked) {
      void resolveAddress(picked.placeId);
      return;
    }
    setStage({
      kind: "error",
      message: addressEnabled
        ? "Pick your address from the list, or enter your 5-digit ZIP."
        : "Enter your 5-digit ZIP, or pick your district below.",
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* action/method is the no-JavaScript path, and it is ZIP-only: the
          browser does a plain GET to /candidates?view=races&zip=… and YourRaces
          resolves it server side. Address completion needs JavaScript; the
          district picker below does not. */}
      <form
        onSubmit={submit}
        action="/candidates"
        method="get"
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <input type="hidden" name="view" value="races" />
        <label htmlFor="location" className="sr-only">
          Your address or ZIP code
        </label>
        <div className="relative flex w-full flex-col sm:max-w-[320px]">
          <Input
            id="location"
            name="zip"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            autoComplete="street-address"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (stage.kind === "error") setStage({ kind: "idle" });
            }}
            onKeyDown={onKeyDown}
          />
          {suggestions.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Address matches"
              className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-md border border-border-strong bg-surface shadow-elevation-2"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.placeId}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`cursor-pointer px-4 py-3 text-left text-body-sm ${
                    i === activeIndex ? "bg-primary-muted text-primary-hover" : "text-on-surface"
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    /* mousedown, not click: blur would close the list first. */
                    e.preventDefault();
                    void resolveAddress(s.placeId);
                  }}
                >
                  {s.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={stage.kind === "loading"}>
          {stage.kind === "loading" ? "Looking up…" : submitLabel}
        </Button>
      </form>

      {stage.kind === "error" && (
        <p role="alert" className="text-body-sm text-error">
          {stage.message}
        </p>
      )}

      {stage.kind === "outOfCoverage" && (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-body-sm text-on-surface-muted">
            We don&apos;t cover that area yet — right now we cover the Miami,
            Fort Lauderdale, Tampa, and Orlando metros. You can still browse a
            covered county:
          </p>
          <CountyPicker
            onPick={(county) => router.push(`/candidates?view=races&county=${county.fips}`)}
          />
        </div>
      )}

      {stage.kind === "split" && (
        <DistrictConfirm
          districts={stage.districts}
          onPick={(district) => void resolveZipCode(stage.zip, district)}
        />
      )}

      {stage.kind !== "outOfCoverage" && districts.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="w-fit text-body-sm text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
          >
            or choose your district
          </button>
          {showPicker && (
            <>
              <label htmlFor="district-picker" className="sr-only">
                Your congressional district
              </label>
              <select
                id="district-picker"
                defaultValue=""
                className="w-fit rounded-md border border-border-strong bg-surface px-3 py-2 text-body-sm text-on-surface"
                onChange={(e) => {
                  const chosen = districts.find(
                    (d) => `${d.district}|${d.countyFips}` === e.target.value
                  );
                  if (chosen) {
                    commit({ district: chosen.district, countyFips: chosen.countyFips }, "picker");
                  }
                }}
              >
                <option value="" disabled>
                  Pick your district…
                </option>
                {districts.map((d) => (
                  <option key={`${d.district}|${d.countyFips}`} value={`${d.district}|${d.countyFips}`}>
                    {d.district} · {d.countyName}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Swap the call sites and delete ZipEntry**

In `src/app/(public)/page.tsx`, replace the import and the usage. The landing page must pass the two new props, which means it needs the district list and the key check:

```tsx
import { LocationEntry } from "@/components/features/LocationEntry";
import { getCoveredDistricts } from "@/lib/resolve";
import { placesConfigured } from "@/lib/geocode";
```

In the component body, extend the existing `Promise.all`:

```tsx
const [races, measures, districts] = await Promise.all([
  getStatewideRaces(),
  getActiveMeasures(),
  getCoveredDistricts(),
]);
```

and replace the `<ZipEntry …>` line with:

```tsx
<LocationEntry
  submitLabel="Add my House race"
  placeholder="Your address or ZIP code"
  addressEnabled={placesConfigured()}
  districts={districts}
/>
```

In `src/components/features/YourRaces.tsx`, do the same at all three usages (lines 58, 71, 84). `YourRaces` is already an async server component, so add near the top of the function:

```tsx
const districts = await getCoveredDistricts();
```

and render `<LocationEntry addressEnabled={placesConfigured()} districts={districts} />` in place of each `<ZipEntry />`.

Then delete the old component:

```bash
git rm src/components/features/ZipEntry.tsx
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npx eslint src/components/features/LocationEntry.tsx
node scripts/verify-no-stored-location.ts
grep -rn "ZipEntry" src || echo "no ZipEntry references remain"
```

Expected: type check and lint pass, the storage checks pass, and no `ZipEntry` references remain.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/components/features/LocationEntry.tsx src/lib/analytics.ts "src/app/(public)/page.tsx" src/components/features/YourRaces.tsx
git add -A
git commit -m "feat(location): one field for an address or a ZIP

Digits never leave for Google; anything with a letter completes through our own
proxy and resolves to exactly one district, with nothing to confirm. Underneath
is a district picker that needs no third party at all. Every route ends the
same way: a district and county in the cookie and in the URL, never the address
and never the ZIP.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: The district chip

**Files:**
- Create: `src/components/features/DistrictChip.tsx`
- Modify: `src/components/nav/SectionNav.tsx`
- Modify: `src/app/layout.tsx` (mobile top padding for the new bar)

**Interfaces:**
- Consumes: `readDistrictCookie`, `clearDistrictCookie` (Task 9), `coveredCounty` (Task 1).
- Produces: `<DistrictChip />`. Rendered only by `SectionNav`.

**Why client-side:** reading `cookies()` in a layout would opt **every route** into dynamic rendering and cost the `revalidate = 3600` pages their caching. The chip reads `document.cookie` after mount instead, which keeps the shell static. Task 12 accepts dynamic rendering on exactly the two pages that need the district server-side.

- [ ] **Step 1: Write the component**

Create `src/components/features/DistrictChip.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { coveredCounty } from "@/lib/counties";
import { clearDistrictCookie, readDistrictCookie, type DistrictChoice } from "@/lib/district-cookie";

/* The saved district, always visible.

   Storage the voter can see beats storage buried in a settings page, which is
   most of what makes the cookie defensible at all (spec §8). So this is not an
   ornament: it is the disclosure, and Forget is the delete button.

   Read after mount rather than during render: reading cookies server-side in the
   nav would make every route dynamic, and the nav is in the root layout. The
   cost is one frame with no chip, which is why the empty state is a real
   affordance rather than a spinner. */

export function DistrictChip({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState<DistrictChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setChoice(readDistrictCookie());
    setMounted(true);
  }, []);

  /* Nothing at all until mounted: rendering "Set your district" during
     hydration and then swapping it for a district is a visible flip. */
  if (!mounted) return <span className={className} aria-hidden />;

  /* The cookie's parser checks shape, not coverage, so the coverage check lands
     here -- and an uncovered county reads as no district at all rather than as a
     chip that cannot produce a ballot. The ballot pages reach the same answer by
     a different route: resolveDistrict returns null for that county. */
  const county = choice ? coveredCounty(choice.countyFips) : undefined;

  if (!choice || !county) {
    return (
      <Link
        href="/candidates?view=races&change=1"
        className={`flex items-center gap-1 rounded-full border border-border-strong px-3 py-1 text-caption text-on-surface-muted hover:border-primary hover:text-primary ${className}`}
      >
        Set your district
      </Link>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Your district: ${choice.district}, ${county.name} County. Change or forget it.`}
        className="flex items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1 text-caption text-on-surface hover:border-primary hover:text-primary"
      >
        <span className="font-medium">{choice.district}</span>
        <span className="text-on-surface-muted">· {county.name}</span>
        <span aria-hidden>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border border-border-strong bg-surface shadow-elevation-2"
        >
          <Link
            role="menuitem"
            href="/candidates?view=races&change=1"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-left text-body-sm text-on-surface hover:bg-primary-muted hover:text-primary-hover"
          >
            Change district
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              clearDistrictCookie();
              setChoice(null);
              setOpen(false);
              /* The ballot pages read this server-side, so the page has to be
                 re-fetched for the change to show. */
              router.refresh();
            }}
            className="block w-full px-4 py-2 text-left text-body-sm text-on-surface hover:bg-primary-muted hover:text-primary-hover"
          >
            Forget my district
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Give it a home in the nav**

In `src/components/nav/SectionNav.tsx`, import it:

```tsx
import { DistrictChip } from "@/components/features/DistrictChip";
```

The nav is fixed to the bottom on mobile and the top on `md:`, so the chip needs two homes to sit top-right on both. Wrap the return in a fragment and add a slim mobile bar:

```tsx
  return (
    <>
      {/* Mobile: the section nav is at the bottom, so the chip gets its own
          slim bar at the top — the corner voters look in for a location
          selector. Hidden at md:, where it sits in the nav itself. */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex justify-end border-b border-border bg-surface px-3 py-2 md:hidden"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
      >
        <DistrictChip />
      </div>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-elevation-2 md:top-0 md:bottom-auto md:border-t-0 md:border-b"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-2 md:px-5">
          {/* …existing wordmark Link and items map, unchanged… */}
          <div className="flex w-full items-stretch justify-around gap-1 p-2 md:w-auto md:justify-end md:gap-2">
            {/* …existing items.map(…)… */}
            <DistrictChip className="hidden self-center md:flex" />
          </div>
        </div>
      </nav>
    </>
  );
```

Keep the existing `/admin` early return above this — the console has its own chrome and must not get either bar.

- [ ] **Step 3: Make room for the mobile bar**

In `src/app/layout.tsx`, the body currently reserves only the safe-area inset at the top on mobile. The new bar is about 40px, so replace the top padding:

```tsx
<body className="flex min-h-full flex-col pt-[calc(40px+env(safe-area-inset-top))] pb-[calc(88px+env(safe-area-inset-bottom))] md:pt-[72px] md:pb-0">
```

- [ ] **Step 4: Verify in the browser**

```bash
npx tsc --noEmit
npx eslint src/components/features/DistrictChip.tsx src/components/nav/SectionNav.tsx
```

Then start the preview (use the Browser pane's `preview_start`, never a bare `npm run dev`) and check, at both `mobile` and `desktop` widths:

1. With no cookie, the chip reads **Set your district** and links to `/candidates?view=races&change=1`. Hand-edit the cookie to `FL-1|12087` (Monroe, uncovered) and confirm it reads **Set your district** too, rather than a district it cannot produce a ballot for.
2. After resolving a district, it reads e.g. **FL-27 · Miami-Dade**.
3. **Forget my district** clears it and the chip returns to the empty state.
4. On mobile, the bar does not cover the page heading.
5. `/admin` shows neither bar.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/components/features/DistrictChip.tsx src/components/nav/SectionNav.tsx src/app/layout.tsx
git add src/components/features/DistrictChip.tsx src/components/nav/SectionNav.tsx src/app/layout.tsx
git commit -m "feat(chip): the saved district, always visible and one click to forget

The chip is the disclosure, not an ornament: visible storage is most of what
makes the cookie defensible. Read client-side on purpose -- reading cookies in
the nav would make every route dynamic and cost the ISR pages their caching.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: The ballot pages read the cookie

**Files:**
- Modify: `src/components/features/YourRaces.tsx` (accept district+county without a ZIP)
- Modify: `src/app/(public)/candidates/page.tsx` (cookie fallback, `change=1` escape hatch)
- Modify: `src/app/(public)/page.tsx` (show the saved district)

**Interfaces:**
- Consumes: `parseDistrictCookie`, `DISTRICT_COOKIE` (Task 9); `resolveDistrict` (Task 7).
- Produces: nothing new — this is wiring.

- [ ] **Step 1: Teach YourRaces the district path**

In `src/components/features/YourRaces.tsx`, import `resolveDistrict` alongside the existing imports, and replace the resolution block (currently lines 45-50):

```tsx
  const DISTRICT_RE = /^FL-\d{1,2}$/;

  let result: ResolveResult | null = null;
  if (zip && ZIP_RE.test(zip)) {
    result = await resolveZip(zip, district);
  } else if (district && DISTRICT_RE.test(district) && county) {
    /* An address result, a confirmed ZIP, or the saved district — the district
       is already known, so there is nothing to look up but the races. */
    result = await resolveDistrict(county, district);
  } else if (county) {
    result = await resolveCounty(county);
  }
```

Declare `DISTRICT_RE` at module scope rather than inside the function.

- [ ] **Step 2: Read the cookie on /candidates**

In `src/app/(public)/candidates/page.tsx`, import and read it:

```tsx
import { cookies } from "next/headers";
import { DISTRICT_COOKIE, parseDistrictCookie } from "@/lib/district-cookie";
```

Add `change?: string` to the `searchParams` type, then after `const sp = await searchParams;`:

```tsx
  /* The saved district, unless the URL already carries a location or the voter
     came here to change it. Reading cookies makes this route dynamic — which is
     why only this page and the landing page do it, and why the chip reads them
     client-side instead. */
  const saved = sp.change ? null : parseDistrictCookie((await cookies()).get(DISTRICT_COOKIE)?.value);
  const hasUrlLocation = Boolean(sp.zip || sp.county || sp.district);
  const zip = sp.zip;
  const district = sp.district ?? (hasUrlLocation ? undefined : saved?.district);
  const county = sp.county ?? (hasUrlLocation ? undefined : saved?.countyFips);
```

Change the view default so a saved district lands on the ballot:

```tsx
  const view: View = requested ?? (zip || county ? "races" : "browse");
```

Pass the resolved values to `YourRaces` instead of the raw params:

```tsx
<YourRaces zip={zip} district={district} county={county} />
```

and use the same values in `tabHref`, so a saved district survives a tab switch the way a URL location already does:

```tsx
  const tabHref = (tab: View) => {
    if (tab === "races") {
      const params = new URLSearchParams({ view: "races" });
      if (zip) params.set("zip", zip);
      if (district) params.set("district", district);
      if (!zip && county) params.set("county", county);
      return `/candidates?${params}`;
    }
    return tab === "browse" ? "/candidates" : `/candidates?view=${tab}`;
  };
```

- [ ] **Step 3: Show the saved district on the landing page**

In `src/app/(public)/page.tsx`, add the same two imports, then read it in the body:

```tsx
  const saved = parseDistrictCookie((await cookies()).get(DISTRICT_COOKIE)?.value);
```

Replace the "Add your U.S. House race" section's heading and copy so it tells the truth in both states. With a saved district, offer the ballot rather than the field:

```tsx
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        {saved ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Your U.S. House race</h2>
              <p className="text-caption text-on-surface-muted">
                You&apos;re set to {saved.district}. That&apos;s the one part of
                your ballot that depends on where you live — the rest of this
                page is the same for every Florida voter. We remember the
                district, not your address or ZIP; the chip at the top changes
                or forgets it.
              </p>
            </div>
            <Link
              href={`/candidates?view=races&district=${saved.district}&county=${saved.countyFips}`}
              className="w-fit text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              See your full ballot for {saved.district}
            </Link>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Add your U.S. House race</h2>
              <p className="text-caption text-on-surface-muted">
                Your congressional district race is the one part of your ballot
                that isn&apos;t on this list, because it depends on where you
                live. Give us your address or ZIP and we&apos;ll add it — or skip
                it and read the rest. We use it to find your district and keep
                only the district itself, never the address or the ZIP.
              </p>
            </div>
            <LocationEntry
              submitLabel="Add my House race"
              placeholder="Your address or ZIP code"
              addressEnabled={placesConfigured()}
              districts={districts}
            />
          </>
        )}
      </section>
```

The old line 63 claim — *"nothing is saved on your device"* — is gone with this edit. That is the point: it is no longer true, and Task 13 makes the privacy page match.

**Scope call:** the landing page links to the ballot rather than rendering the House race inline. Rendering it here would duplicate `YourRaces`, and the ballot with that race is one click away. Noted as a follow-up in the spec's §12, not built now.

- [ ] **Step 4: Verify the caching consequence is contained**

```bash
npx tsc --noEmit
npm run build
```

In the build output's route table, confirm: `/` and `/candidates` are dynamic (`ƒ`), while `/races/[raceId]`, `/candidates/[candidateId]`, `/measures/[measureId]` and `/methodology` are **still** static or ISR. If a detail page turned dynamic, something imported `cookies()` transitively — find it and move the read.

- [ ] **Step 5: Verify the behaviour**

With the preview running: resolve a district, confirm `/candidates` opens on **Your races** with that district on a fresh visit and no query string; confirm `?change=1` shows the field again; confirm **Forget** returns both pages to their no-district state; and confirm a shared `/candidates?view=races&district=FL-25&county=12086` link renders FL-25 **without** changing the chip.

- [ ] **Step 6: Commit**

```bash
npx prettier --write "src/app/(public)/candidates/page.tsx" "src/app/(public)/page.tsx" src/components/features/YourRaces.tsx
git add "src/app/(public)/candidates/page.tsx" "src/app/(public)/page.tsx" src/components/features/YourRaces.tsx
git commit -m "feat(ballot): render the saved district, and never write it from a link

Only these two pages read the cookie, so the ISR detail pages keep their
caching. URL params win over the cookie and never set it -- sharing a ballot
must not move someone else's district. ?change=1 is the way back to the field.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Make the claims true

**Files:**
- Modify: `src/app/(public)/privacy/page.tsx`
- Modify: `scripts/verify-no-stored-location.ts` (rewrite the invariants)
- Modify: `src/lib/sentry-scrub.ts`
- Modify: `docs/product-roadmap.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the enforced invariant that `kyv.district` is the only stored location-ish value.

**This task is not documentation.** The privacy page is the product's credibility surface, and a verify script is what keeps it honest. Do not skip it because the feature already works.

- [ ] **Step 1: Rewrite the privacy page's storage sections**

In `src/app/(public)/privacy/page.tsx`:

Replace the "What stays on your device" paragraph list so it names three things, and delete the "return visit asks again" claim:

```tsx
        <h2 className="text-h2">What stays on your device</h2>
        <p className="text-body">
          Three things, and you can check all three in your browser&apos;s
          devtools: the district you chose, the candidates you &quot;keep in
          mind&quot;, and whether you dismissed the &quot;get the app&quot;
          prompt. That is the whole list. They never reach our servers, and
          clearing your browser data removes them completely.
        </p>
        <p className="text-body">
          The district is one cookie, <code>kyv.district</code>, holding exactly
          this: <code>FL-27|12086</code> — a district and the county it sits in.
          Not your address. Not your ZIP. Not a coordinate. It is written only
          when you ask for it, the chip at the top of every page shows it, and
          &quot;Forget my district&quot; deletes it immediately.
        </p>
        <p className="text-body">
          Your quiz answers aren&apos;t stored anywhere — not on your device,
          not with us. They exist while you are answering and are gone when you
          close the tab.
        </p>
        <p className="text-body">
          Your address and your ZIP aren&apos;t stored either — not on your
          device, not with us. We use them to work out which district you are
          in, keep the district, and forget the rest. The single exception is
          below, and only if you ask for it: an email reminder needs a ZIP to
          know which polling place to send you.
        </p>
```

Add a section naming the third parties, because the address path has two:

```tsx
      <section className="flex flex-col gap-2">
        <h2 className="text-h2">When you type an address</h2>
        <p className="text-body">
          Address completion is Google Places. What you type goes to Google so it
          can finish the address — that is the whole of what Google is for here,
          and it is the only company that ever sees it. We don&apos;t log it and
          we don&apos;t store it.
        </p>
        <p className="text-body">
          Turning that address into a district takes one more step, and it is
          deliberately blind: we ask Google only for the map coordinates of the
          address you picked, and send just those coordinates to the U.S. Census
          Bureau to find which census block they fall in. The Census Bureau never
          receives your address. The block tells us your district, using
          Florida&apos;s enacted 2026 map, and the district is the only thing
          that is kept.
        </p>
        <p className="text-body">
          Prefer neither? Enter your ZIP, or pick your district from the list —
          both work with no third party at all.
        </p>
      </section>
```

- [ ] **Step 2: Rewrite the storage invariants**

In `scripts/verify-no-stored-location.ts`, rewrite the header comment and the assertions. The invariant is no longer "nothing is stored" — it is "**only a district is stored**". Keep sections 1, 2 and 5 (the `kyv.location` module and helpers must still be absent; the funnel order still holds), keep the Task 9 cookie-parsing section, and replace section 3 and the privacy-copy section 4:

```ts
/* 3. Device storage holds a district and two preferences — nothing else.

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
      const decl = f.code.match(new RegExp(`(?:const|let)\\s+${key}\\s*=\\s*["']([^"']+)["']`));
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

/* Cookies: kyv.district is the only one this app writes. A second cookie name
   appearing in a document.cookie assignment is a new store nobody reviewed. */
const cookieWrites: Array<{ path: string; key: string }> = [];
for (const f of files) {
  for (const m of f.code.matchAll(/document\.cookie\s*=\s*`?\$?\{?([A-Za-z_$][\w$.]*|[\w.-]+)=/g)) {
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
const cookieSrc = stripComments(readFileSync(join(SRC, "lib", "district-cookie.ts"), "utf8"));
assert(
  "the cookie value is constrained to a district and a county",
  /\/\^FL-\\d\{1,2\}\\\|\\d\{5\}\$\//.test(cookieSrc),
  "expected the FL-nn|ccccc regex to guard both parse and format"
);

/* 4. The privacy page must describe exactly this, including both third
      parties on the address path. A page whose value is being checkable
      cannot carry a claim that fails the check.

      These three reads come from the original script. `landing` was defined
      further down in section 5; move it up here, because section 4 now asserts
      against it and a `const` used before its declaration is a runtime error,
      not a lint warning. */
const privacy = readFileSync(join(SRC, "app", "(public)", "privacy", "page.tsx"), "utf8");
const privacyText = stripComments(privacy);
const landing = stripComments(readFileSync(join(SRC, "app", "(public)", "page.tsx"), "utf8"));
const analytics = stripComments(readFileSync(join(SRC, "lib", "analytics.ts"), "utf8"));

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
assert("privacy page names the Census Bureau", /Census Bureau/.test(privacyText));
assert(
  "privacy page says only coordinates go to Census",
  /coordinates/i.test(privacyText) && /never receives your address/i.test(privacyText)
);
assert("privacy page names the keep-in-mind list", /keep in\s+mind/i.test(privacyText.replace(/\s+/g, " ")));
assert("privacy page names the install-prompt flag", /get the app/i.test(privacyText));
assert(
  "privacy page names the way out of both third parties",
  /pick your district/i.test(privacyText)
);

/* The landing page's storage claim had to move with the cookie: it used to say
   nothing was saved on the device, which is no longer true. */
assert(
  "the landing page no longer claims nothing is saved on the device",
  !/nothing is saved on your device/i.test(landing)
);
assert(
  "the landing page says what is kept instead",
  /keep only the district|remember the district/i.test(landing)
);

/* district_set carries a method label and never a value. LocationEntry passes
   it as the shorthand `{ via }`, so the check has to accept a bare identifier
   as well as a literal -- and reject anything else, which is the point. */
assert('district_set is a declared analytics event', /"district_set"/.test(analytics));
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
```

Then delete the now-duplicated `const privacy` / `const privacyText` / `const landing` / `const analytics` lines further down in the original sections 4 and 5 — the assertions there keep working against the definitions you just moved up.

- [ ] **Step 3: Run it to see the failures, then fix them**

```bash
node scripts/verify-no-stored-location.ts
```

Expected: FAIL on any privacy-page phrasing you have not written yet. Fix the **page**, not the assertion, unless the assertion is genuinely wrong about the design.

- [ ] **Step 4: Scrub the address routes from Sentry**

In `src/lib/sentry-scrub.ts`, the existing regexes redact ZIPs, emails and IPs from strings. Request bodies on the address routes need dropping wholesale — a street address matches none of those patterns. Add to the event scrubber, and extend the file's header comment to say so:

```ts
/* Address-route request bodies are dropped entirely rather than pattern-matched.
   A street address looks like ordinary prose: no regex catches "444 SW 2nd Ave"
   without catching half the app's copy. */
const ADDRESS_ROUTE_RE = /\/api\/address\//;

function dropAddressBody(request: unknown): unknown {
  if (!request || typeof request !== "object") return request;
  const req = request as Record<string, unknown>;
  if (typeof req.url === "string" && ADDRESS_ROUTE_RE.test(req.url)) {
    const { data: _data, ...rest } = req;
    return { ...rest, data: "[dropped]" };
  }
  return request;
}
```

Call it on `event.request` inside the existing event scrubber, before the generic string scrubbing.

- [ ] **Step 5: Record the reversal in the roadmap**

In `docs/product-roadmap.md`, under the Phase 7 completion note that says "no device-stored location", add:

```markdown
   **Amended 2026-09-09 (address lookup).** TASK-070's "no device-stored
   location" is now "no device-stored *location*, and one device-stored
   *district*". `kyv.district` holds `FL-27|12086` — the district the voter
   chose and the county it sits in — because address lookup made cross-visit
   memory worth having and a district is a public electoral unit rather than a
   place. The address and the ZIP are still never stored anywhere. The claim in
   `docs/ballot-first-zip-optional.md` ("we remember nothing about you between
   visits except the candidates you choose to save") is superseded by "we
   remember the district you chose and the candidates you save". Enforced by
   `scripts/verify-no-stored-location.ts`; reasoned through in
   `docs/superpowers/specs/2026-09-09-address-district-lookup-design.md` § 8.
```

- [ ] **Step 6: Run everything**

```bash
node scripts/verify-no-stored-location.ts
node scripts/verify-address-resolve.ts
node scripts/verify-counties.ts
node scripts/verify-block-seed.mjs
node scripts/verify-migrations.mjs
node scripts/verify-sentry-scrub.ts
node scripts/verify-shared-ballot.ts
npx tsc --noEmit
npx eslint
npm run build
```

Expected: all pass. `verify-shared-ballot.ts` and `verify-sentry-scrub.ts` are in this list because Tasks 11-13 touched the landing page and the scrubber — a green suite you did not run is not a green suite.

- [ ] **Step 7: Commit**

```bash
npx prettier --write "src/app/(public)/privacy/page.tsx" src/lib/sentry-scrub.ts scripts/verify-no-stored-location.ts
git add -A
git commit -m "feat(privacy): say what is stored, and enforce that it is only a district

The claim changes from 'we remember nothing except the candidates you save' to
'we remember the district you chose and the candidates you save', and the page
names both third parties on the address path -- Google sees the address, Census
sees only coordinates. verify-no-stored-location now enforces the new line:
kyv.district is the only cookie written, its value must be FL-nn|ccccc, and the
page must still describe exactly what the code does.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: The live gate

**Files:** none — verification only, plus possibly re-captured fixtures.

**Interfaces:**
- Consumes: a real `GOOGLE_PLACES_API_KEY`.
- Produces: confidence that the fixtures match reality.

**This task needs the founder.** It cannot be completed without a billing-enabled Google Cloud project.

- [ ] **Step 1: Configure the key**

Founder: create the key restricted to **Places API (New)**, set a **daily request cap** in the console (the real cost guard), then add `GOOGLE_PLACES_API_KEY` to `.env.local` and to Vercel's environment variables. Confirm it has no `NEXT_PUBLIC_` prefix.

- [ ] **Step 2: Re-capture the Places fixtures**

The two Places fixtures were written from the documented shape, not a live call. Capture real ones and replace them, keeping only the masked fields:

```bash
curl -s -X POST https://places.googleapis.com/v1/places:autocomplete \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
  -H "X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat" \
  -d '{"input":"444 SW 2nd","includedPrimaryTypes":["street_address","premise","subpremise"],"includedRegionCodes":["us"],"languageCode":"en"}' \
  -o scripts/fixtures/address/places-autocomplete.json
```

Then run `node scripts/verify-address-resolve.ts`. If it fails, the parser needs to match reality — fix `parseSuggestions`, not the test.

- [ ] **Step 3: The split-ZIP proof**

This is the check that proves the feature does what the whole design is for. From `0018_zip_seed_2026.sql`, pick a ZIP with `is_split = true` and note its districts:

```bash
grep "true,true)" supabase/migrations/0018_zip_seed_2026.sql | head -5
```

Take three real street addresses inside that ZIP that the enacted plan places in different districts. In the running app:

1. Each address must resolve to the district the plan assigns it.
2. The **same ZIP** typed as five digits must still show the district-confirm prompt — the ZIP path is unchanged and still cannot answer exactly.
3. The chip must show the address-resolved district, and survive a reload.

- [ ] **Step 4: Confirm the privacy claims by inspection**

With devtools open:

1. Application → Cookies: `kyv.district` exists with a value like `FL-27|12086`, and **no** cookie holds an address or ZIP.
2. Network: `/api/address/suggest` and `/api/address/resolve` are **POST**, with the address in the body — never in a URL.
3. Application → Local Storage: only `kyv.saved` and the install-dismiss flag.
4. Vercel logs for the two routes contain no address text.

- [ ] **Step 5: Commit any fixture updates**

```bash
git add scripts/fixtures/address/
git commit -m "test(fixtures): re-capture Places responses from the live API

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Notes for the reviewer

**Two deliberate divergences from the spec**, both refinements found while writing the plan:

1. **Three migrations, not two.** `0020` is the table, `0021` the RLS, `0022` the generated seed. The spec's §4 has been amended to match. A generated file should not carry schema, and `0003`/`0018` already split it that way.
2. **`getCoveredDistricts` reads `zip_district`, not `block_district`.** The picker needs a list of county+district pairs, and `zip_district` is hundreds of rows against thousands. `block_district` remains the authority for resolving a voter; Task 4's cross-check is what makes reading the smaller table safe. Documented in the function's comment.

3. **A pure `src/lib/address-lookup.ts`, rather than parsers inside the two clients.** Found while checking that the tests could actually run: `server-only` **throws** under plain `node`, and `@/`-aliased value imports do not resolve there, so any module a `verify-*` script imports must be import-clean. The repo already works this way (`news-match.ts` is pure and driven by `verify-news-match.ts`); the plan now follows it instead of inventing a second convention.
4. **`district-cookie.ts` validates shape, not coverage.** Same constraint: it is parsed in the browser, on the server, and under `node`, so it imports nothing. An uncovered county parses and is then refused by `resolveDistrict`, which returns `null` — a stale cookie yields no ballot rather than a wrong one. The spec's §6 wording has been amended to match.

**One caveat carried into Task 14:** the Places fixtures are written from the documented response shape, verified against the Places API (New) reference on 2026-09-09, but not from a live call — there is no key yet. Task 14 re-captures them.

**The highest-risk task is 4**, not any of the code. Everything else has a test that runs offline; Task 4 depends on obtaining the right external file, and the failure mode of the *wrong* file is silent and severe — a voter shown the wrong district. Its district-number check (1-28), the exact expected counts, and the cross-check against `0018` are what stand between that file and production. Do not weaken any of them.

That risk is smaller than when this plan was drafted: the file was downloaded and its encoding run for real on 2026-09-09, which is where Task 4's exact numbers come from. What is **not** yet proven is the cross-check against `0018` (it needs the Census relationship file alongside it) and everything behind the Google key.
