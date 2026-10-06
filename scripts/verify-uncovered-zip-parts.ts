/* ZIPs 32703 and 32751 keep asking which side of the county line the voter
   is on, and a stale FL-7 · Orange pairing is never treated as a district.

   0045 drops the (Orange, FL-7) rows: no Orange ballot carries FL-7. But
   about a quarter of each ZIP lives across the line in Seminole County and
   votes in FL-7 (src/lib/uncovered-zip-parts.ts has the census counts).
   The review of 0045 alone (2026-10-05) found 32751 would then resolve to
   FL-10 for everyone, and 32703's Seminole side would be offered only
   Orange districts. This pins the fix:

     1. uncoveredPartOf names Seminole / FL-7 for exactly those two ZIPs.
     2. resolveZip asks (needsCountyConfirm) when a ZIP has an uncovered
        part, even with one covered district left, and returns the part.
     3. DistrictConfirm shows that part's House race as a link to its race
        page and the statewide ballot, never as a district button (a button
        would save the voter under the covered county).
     4. LocationEntry carries the part from /api/resolve to DistrictConfirm.
     5. A (county, district) pair coverage no longer holds is no district:
        resolveDistrict falls back to the county, and the home page treats
        the cookie as unset; an empty coverage list (a failed read) changes
        nothing.
     6. racesForDistrict reads the district's decided state from the cached
        districtRace, not a candidate query on every resolve.

   Run: node scripts/verify-uncovered-zip-parts.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uncoveredPartOf } from "../src/lib/uncovered-zip-parts.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const code = (rel: string) => readFileSync(path.join(root, rel), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("1. The six ZIPs (a fifth to a half of their people across the line)");
for (const zip of ["32703", "32751"]) {
  const part = uncoveredPartOf(zip);
  check(
    `${zip}: Seminole County, FL-7, race FL-7-general, not an Orange district`,
    part?.county === "Seminole" &&
      part.district === "FL-7" &&
      part.raceId === "FL-7-general" &&
      part.onCoveredBallot === false,
    JSON.stringify(part)
  );
}
for (const zip of ["33549", "33556", "33558", "33559"]) {
  const part = uncoveredPartOf(zip);
  check(
    `${zip}: Pasco County, FL-12, race FL-12-general, also on Hillsborough's ballot`,
    part?.county === "Pasco" &&
      part.district === "FL-12" &&
      part.raceId === "FL-12-general" &&
      part.onCoveredBallot === true,
    JSON.stringify(part)
  );
}
/* Slivers stay unasked: 33548 (2.2%), 34787 (1.8%), 33598 (1.1%). */
for (const zip of ["32801", "33598", "33548", "34787", "33101", "32816", ""]) {
  check(`${zip || "(empty)"}: no uncovered part`, uncoveredPartOf(zip) === null);
}

console.log("\n2. resolveZip");
const resolve = code("src/lib/resolve.ts");
check(
  "drops a part's district from the covered choices only when no covered ballot carries it (FL-7, not FL-12)",
  /\.filter\(\s*\(d\) =>\s*!uncoveredPart \|\|\s*uncoveredPart\.onCoveredBallot \|\|\s*d !== uncoveredPart\.district\s*\)/.test(resolve)
);
check(
  "asks when the ZIP spans districts OR has an uncovered part",
  /const uncoveredPart = uncoveredPartOf\(zip\);/.test(resolve) &&
    /if \(districts\.length > 1 \|\| uncoveredPart\) \{/.test(resolve)
);
check(
  "returns the part with the question",
  /needsCountyConfirm: true,\s*\.\.\.\(uncoveredPart \? \{ uncoveredPart \} : \{\}\),/.test(resolve)
);

console.log("\n3. DistrictConfirm");
const picker = code("src/components/features/CountyPicker.tsx");
check(
  "links the part's race page and the statewide ballot",
  /href=\{`\/races\/\$\{uncoveredPart\.raceId\}`\}/.test(picker) &&
    /href=\{STATEWIDE_BALLOT_HREF\}/.test(picker)
);
check(
  "the part is never a district button (onPick is only for covered districts)",
  /\{districts\.map\(\(d\) => \(/.test(picker) &&
    !/onPick\(uncoveredPart/.test(picker)
);

console.log("\n4. LocationEntry");
const entry = code("src/components/features/LocationEntry.tsx");
check(
  "carries uncoveredPart from the resolve answer to DistrictConfirm",
  /uncoveredPart: data\.uncoveredPart,/.test(entry) &&
    /uncoveredPart=\{stage\.uncoveredPart\}/.test(entry)
);

console.log("\n5. A pair coverage no longer holds");
check(
  "resolveDistrict falls back to the county for an uncovered pair",
  /const covered = await getCoveredDistricts\(\);\s*if \(\s*covered\.length > 0 &&\s*!covered\.some\(\(d\) => d\.countyFips === county\.fips && d\.district === district\)\s*\) \{\s*return resolveCounty\(county\.fips\);/.test(resolve)
);
const home = code("src/app/(public)/page.tsx");
check(
  "the home page drops a cookie whose pair coverage no longer holds",
  /const saved =\s*cookieDistrict &&\s*\(districts\.length === 0 \|\|\s*districts\.some\(/.test(home) &&
    !/const saved = parseDistrictCookie/.test(home)
);

const chip = code("src/components/features/DistrictChip.tsx");
check(
  "the header chip treats a retired pair (FL-7|12095) as no district",
  /RETIRED_DISTRICT_PAIRS\.has\(`\$\{choice\.district\}\|\$\{choice\.countyFips\}`\)/.test(chip) &&
    /if \(!choice \|\| !county \|\| retired\)/.test(chip)
);
const yourRaces = code("src/components/features/YourRaces.tsx");
check(
  "the server-rendered prompt names the other county and links its House race",
  /const part = result\.uncoveredPart;/.test(yourRaces) &&
    /href=\{`\/races\/\$\{part\.raceId\}`\}/.test(yourRaces) &&
    /href=\{`\/candidates\?view=races&zip=\$\{zip\}&district=\$\{d\}`\}/.test(yourRaces)
);

console.log("\n6. racesForDistrict");
const fn = resolve.match(/async function racesForDistrict\([\s\S]*?\n\}/)?.[0] ?? "";
check(
  "reads districtRace (cached), no per-request candidate query",
  /districtRace\(district\)/.test(fn) && !/decidedSeatsFor/.test(fn),
  fn ? "" : "racesForDistrict not found"
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nUncovered ZIP part checks passed.");
