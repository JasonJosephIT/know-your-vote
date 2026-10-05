/* Pins the crosswalk rules scripts/build-zip-seed.mjs applies, against a
   synthetic fixture small enough to reason about by hand
   (scripts/fixtures/zip-seed/). The real inputs are a 50 MB Census file and
   the enacted-plan block assignment; neither is in the repo, so these are the
   only checks that can run without them.

   The fixture pins, in order: coverage by dominant county, county derived
   from the block GEOID, the 5% split threshold at the boundary, the dominant
   district's inclusion below that threshold, is_split, the skip of blocks
   that fall in no ZCTA, county aggregation staying independent of
   whether a block is in the enacted plan, and (0045) districts counted
   over the covered county's own blocks only: a district whose land in the
   ZIP lies across the county line belongs to no row, and does not count
   toward the 5% denominator either. Before 0045 the build summed every
   block in the ZIP, which put FL-7 on two Orange ZIPs whose FL-7 land is
   in Seminole County; on that code 33101 came out FL-24, FL-25, FL-27 and
   33102 came out split between FL-9 and FL-10.

   Run: node scripts/verify-zip-seed-rules.mjs */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedSql, zipDistrictRows } from "./build-zip-seed.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtures = path.join(root, "scripts", "fixtures", "zip-seed");

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const rows = zipDistrictRows(
  readFileSync(path.join(fixtures, "block_assignment.txt"), "utf8"),
  readFileSync(path.join(fixtures, "zcta_tabblock.txt"), "utf8")
);
const show = (rs) =>
  rs.map((r) => `${r.zip5} ${r.district} ${r.countyFips} split=${r.isSplit}`).join(", ");
const forZip = (zip) => rows.filter((r) => r.zip5 === zip);

/* 33101: Miami-Dade's 10000 land units are FL-24 65%, FL-25 30% and FL-26
   exactly 5%. A Monroe block adds FL-27 (1000 units): over the whole ZIP
   that would be 9.1%, and would push FL-26 down to 4.5%. */
check(
  "33101: the three districts at or above 5% of Miami-Dade's land qualify",
  forZip("33101").map((r) => r.district).sort().join(",") === "FL-24,FL-25,FL-26",
  show(forZip("33101"))
);
check(
  "33101: FL-27, whose land in the ZIP is all in Monroe, gets no Miami-Dade row",
  !forZip("33101").some((r) => r.district === "FL-27"),
  show(forZip("33101"))
);
check(
  "33101: is_split on every row",
  forZip("33101").length > 0 && forZip("33101").every((r) => r.isSplit === true),
  show(forZip("33101"))
);
check(
  "33101: county comes from the block GEOID, by largest land overlap",
  forZip("33101").every(
    (r) =>
      r.countyFips === "12086" && r.countyName === "Miami-Dade" && r.metro === "miami"
  ),
  show(forZip("33101"))
);

/* 33301: one district, so not split. */
check(
  "33301: single district, is_split false",
  forZip("33301").length === 1 &&
    forZip("33301")[0].district === "FL-23" &&
    forZip("33301")[0].isSplit === false &&
    forZip("33301")[0].metro === "fort_lauderdale",
  show(forZip("33301"))
);

/* 32801: 21 districts, the largest holding 4.8%. The dominant district is
   emitted regardless of the threshold — a ZIP always resolves somewhere. */
check(
  "32801: dominant district emitted though below 5%, alone and unsplit",
  forZip("32801").length === 1 &&
    forZip("32801")[0].district === "FL-1" &&
    forZip("32801")[0].isSplit === false,
  show(forZip("32801"))
);

/* 33040 is mostly Monroe, so it is out of coverage even though it holds a
   Miami-Dade block. Two fixture blocks fall in no ZCTA and must vanish. */
check(
  "ZIPs whose dominant county is not covered are dropped",
  forZip("33040").length === 0,
  show(forZip("33040"))
);
check(
  "blocks with an empty ZCTA are skipped",
  rows.every((r) => /^\d{5}$/.test(r.zip5)),
  show(rows.filter((r) => !/^\d{5}$/.test(r.zip5)))
);
/* 33102: the land-majority block (Orange, 5000) has no entry in the
   block-assignment file — a plan gap, not a missing ZIP — while the
   Hillsborough block (1000, FL-9) does, and so does a small Orange block
   (500, FL-10). County totals are summed from every block with a ZCTA
   regardless of plan coverage, so Orange must still win the county call
   (5500 to 1000; without the gap block it would lose, 500 to 1000); only
   the district total (which has no meaning off the plan) skips the gap
   block. Orange's districts then come from Orange's blocks alone: FL-10,
   and not Hillsborough's FL-9. This is the shape of 32703 and 32751, the
   Orange ZIPs whose FL-7 land lies in Seminole County (0045). */
check(
  "33102: the land-majority county wins even though its block sits outside the enacted plan",
  forZip("33102").length === 1 &&
    forZip("33102")[0].countyFips === "12095" &&
    forZip("33102")[0].countyName === "Orange" &&
    forZip("33102")[0].metro === "orlando",
  show(forZip("33102"))
);
check(
  "33102: Orange gets only its own district (FL-10), unsplit; Hillsborough's FL-9 is not filed under Orange",
  forZip("33102").map((r) => `${r.district} split=${r.isSplit}`).join(",") ===
    "FL-10 split=false",
  show(forZip("33102"))
);

check(
  "no other ZIP appears",
  rows.length === 6 && new Set(rows.map((r) => r.zip5)).size === 4,
  `${rows.length} rows: ${show(rows)}`
);
check(
  "rows are ordered by ZIP",
  rows.map((r) => r.zip5).join(",") === [...rows.map((r) => r.zip5)].sort().join(","),
  rows.map((r) => r.zip5).join(",")
);

/* Output shape: 0022 must be loadable over an applied 0003. */
const sql = seedSql(rows);
check("SQL clears the table first", sql.includes("DELETE FROM zip_district;"));
check(
  "SQL inserts the documented columns",
  sql.includes(
    "INSERT INTO zip_district\n  (zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage)\nVALUES\n"
  )
);
check(
  "SQL renders a row as the table expects, in_coverage true",
  sql.includes("('33101','12086','Miami-Dade','FL-26','miami',true,true)"),
  sql.split("VALUES\n")[1]
);
check("SQL statement is terminated", sql.trimEnd().endsWith(";"));

/* A malformed block-assignment line must fail loudly, not poison a ZIP with
   district = NaN. Exercised against inline text, not the committed fixture
   files, since the point is the parse guard in isolation. */
function throws(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e;
  }
}
const extraFieldErr = throws(() =>
  zipDistrictRows("120860101001000,24,extra\n", "")
);
check(
  "an extra-field block-assignment line throws, citing the line number and content",
  extraFieldErr instanceof Error &&
    /line 1/.test(extraFieldErr.message) &&
    extraFieldErr.message.includes("120860101001000,24,extra"),
  extraFieldErr ? extraFieldErr.message : "did not throw"
);
const nonNumericErr = throws(() =>
  zipDistrictRows("120860101001001,24\n120860101001002,notanumber\n", "")
);
check(
  "a non-numeric district throws, citing the line number and content",
  nonNumericErr instanceof Error &&
    /line 2/.test(nonNumericErr.message) &&
    nonNumericErr.message.includes("120860101001002,notanumber"),
  nonNumericErr ? nonNumericErr.message : "did not throw"
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nZIP seed rule checks passed.");
