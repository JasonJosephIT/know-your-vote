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
assert(
  "coveredCounty finds Broward",
  coveredCounty("12011")?.name === "Broward"
);
assert(
  "coveredCounty rejects an uncovered county",
  coveredCounty("12087") === undefined
);

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
