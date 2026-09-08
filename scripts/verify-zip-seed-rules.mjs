/* Pins the crosswalk rules scripts/build-zip-seed.mjs applies, against a
   synthetic fixture small enough to reason about by hand
   (scripts/fixtures/zip-seed/). The real inputs are a 50 MB Census file and
   the enacted-plan block assignment; neither is in the repo, so these are the
   only checks that can run without them.

   The fixture pins, in order: coverage by dominant county, county derived
   from the block GEOID, the 5% split threshold at the boundary, the dominant
   district's inclusion below that threshold, is_split, and the skip of
   blocks that fall in no ZCTA.

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

/* 33101: FL-24 61%, FL-25 30%, FL-26 exactly 5%, FL-27 4% (a Monroe block). */
check(
  "33101: the three districts at or above 5% qualify",
  forZip("33101").map((r) => r.district).sort().join(",") === "FL-24,FL-25,FL-26",
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
check(
  "no other ZIP appears",
  rows.length === 5 && new Set(rows.map((r) => r.zip5)).size === 3,
  `${rows.length} rows: ${show(rows)}`
);
check(
  "rows are ordered by ZIP",
  rows.map((r) => r.zip5).join(",") === [...rows.map((r) => r.zip5)].sort().join(","),
  rows.map((r) => r.zip5).join(",")
);

/* Output shape: 0018 must be loadable over an applied 0003. */
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

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nZIP seed rule checks passed.");
