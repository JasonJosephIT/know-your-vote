/* One county list, importable from anywhere.

   COVERED_COUNTIES lived in @/lib/resolve, which imports the Supabase server
   client, so CountyPicker (a client component) kept a duplicate. The district
   cookie needs the same list in the browser, which would have made three. This
   pins the single source and fails if a copy comes back.

   Run: node scripts/verify-counties.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  COVERED_COUNTIES,
  countyForRaceDistrict,
  coveredCounty,
} from "../src/lib/counties.ts";

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
assert(
  "coveredCounty finds Broward",
  coveredCounty("12011")?.name === "Broward"
);
assert(
  "coveredCounty rejects an uncovered county",
  coveredCounty("12087") === undefined
);

/* County-race prefixes (0031 / 0032 district codes). These are how a county
   race finds its county at all — resolve.ts racesForCounty filters on
   `<prefix>-%` and the directory's county filter on countyForRaceDistrict —
   so a wrong or duplicated prefix silently moves a seat to another county's
   list, or drops it from every list. */
assert(
  "the expected race-district prefixes, per FIPS",
  COVERED_COUNTIES.map((c) => `${c.fips}=${c.raceDistrictPrefix}`).join(",") ===
    "12086=DAD,12011=BRO,12057=HIL,12095=ORA"
);
assert(
  "race-district prefixes are unique",
  new Set(COVERED_COUNTIES.map((c) => c.raceDistrictPrefix)).size ===
    COVERED_COUNTIES.length
);
for (const [district, fips] of [
  ["ORA-CC-2", "12095"],
  ["ORA-MAYOR", "12095"],
  ["ORA-SBCHAIR", "12095"],
  ["BRO-SB-6", "12011"],
  ["BRO-SBAL-8", "12011"],
  ["DAD-SB-1", "12086"],
  ["HIL-CC-5", "12057"],
] as const) {
  assert(
    `countyForRaceDistrict(${district}) is ${fips}`,
    countyForRaceDistrict(district)?.fips === fips
  );
}
for (const district of [
  null,
  undefined,
  "",
  "FL-10",
  "FL-27",
  "ORA",
  "ORANGE-CC-2",
  "-CC-2",
  "PBC-CC-1",
  "ora-cc-2",
]) {
  assert(
    `countyForRaceDistrict(${JSON.stringify(district)}) is no county`,
    countyForRaceDistrict(district) === undefined
  );
}

/* No surface may redeclare the list. Both files must reach it by import. */
for (const rel of [
  "src/components/features/CountyPicker.tsx",
  "src/lib/resolve.ts",
]) {
  const code = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  assert(
    `${rel} declares no county list of its own`,
    !/12086[\s\S]{0,200}12011/.test(code),
    rel
  );
  assert(
    `${rel} imports from the counties module`,
    /lib\/counties/.test(code),
    rel
  );
}

if (failures) {
  console.error(`\n${failures} county check(s) failed`);
  process.exit(1);
}
console.log("\nAll county checks passed.");
