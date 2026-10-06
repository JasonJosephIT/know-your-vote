/* 0045_orange_fl7_zip_district.sql: no Orange County ZIP offers FL-7.

   0022 gave Orange ZIPs 32703 and 32751 the district FL-7, whose land in
   those ZIPs lies in Seminole County. Orange's official composite sample
   ballot for the 2026-11-03 general prints Representative in Congress for
   districts 8, 9 and 11 only (FL-10's lone candidate is unopposed and not
   printed, F.S. 101.151(7)); FL-7 is contested, so its absence means no
   Orange voter is in it. Applied to an embedded Postgres
   (@electric-sql/pglite, through ./zip-district-state.mjs, so verify-all
   runs this in its one-at-a-time lane), with 0022 loaded first:

     1. Before 0045 the bug is there: both ZIPs carry an Orange FL-7 row.
     2. After it, no Orange row names FL-7; 32751 is FL-10 alone and no
        longer split; 32703 is FL-10 and FL-11, still split.
     3. Nothing else moved: exactly those two rows left, and the only
        is_split change is 32751's.
     4. Running 0045 again changes nothing (idempotent).
     5. Each covered county's district set is what its ballot prints (plus
        FL-10, unprinted, in Orange): Orange {8, 9, 10, 11}; Miami-Dade
        {24, 25, 26, 27, 28} and Broward {20, 22, 24, 25, 26}, both checked
        against their official ballots earlier and unchanged here.
     6. The seed source agrees: zip_districts_2026.csv has no Orange FL-7
        row, and its pairs equal the applied table's.

   Run: node scripts/verify-zip-orange-fl7.mjs */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMigration,
  freshZipDistrictDb,
  readZipDistrict,
} from "./zip-district-state.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIX = "0045_orange_fl7_zip_district.sql";

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const key = (r) => `${r.zip5} ${r.countyFips} ${r.district} split=${r.isSplit}`;
const forZip = (rows, zip) =>
  rows
    .filter((r) => r.zip5 === zip)
    .map((r) => `${r.district}:${r.isSplit}`)
    .join(",");
const orangeFl7 = (rows) =>
  rows.filter((r) => r.countyFips === "12095" && r.district === "FL-7");

const db = await freshZipDistrictDb();
await applyMigration(db, "0022_zip_seed_2026.sql");
const before = await readZipDistrict(db);

console.log("1. Before 0045");
check(
  "0022 files FL-7 under Orange for 32703 and 32751 (the bug)",
  orangeFl7(before).map((r) => r.zip5).join(",") === "32703,32751",
  orangeFl7(before).map(key).join(", ")
);

let applyError = null;
try {
  await applyMigration(db, FIX);
} catch (err) {
  applyError = err;
}
console.log(`\n2. After ${FIX}`);
check(`${FIX} applies, its own assertions included`, applyError === null, applyError?.message);
const after = await readZipDistrict(db);
check("no Orange ZIP maps to FL-7", orangeFl7(after).length === 0, orangeFl7(after).map(key).join(", "));
check("32751 is FL-10 alone, not split", forZip(after, "32751") === "FL-10:false", forZip(after, "32751"));
check(
  "32703 is FL-10 and FL-11, still split",
  forZip(after, "32703") === "FL-10:true,FL-11:true",
  forZip(after, "32703")
);

console.log("\n3. Nothing else moved");
const afterKeys = new Set(after.map((r) => `${r.zip5} ${r.district}`));
const removed = before.filter((r) => !afterKeys.has(`${r.zip5} ${r.district}`));
check(
  "exactly the two Orange FL-7 rows were removed",
  removed.map((r) => `${r.zip5} ${r.countyFips} ${r.district}`).join(", ") ===
    "32703 12095 FL-7, 32751 12095 FL-7",
  removed.map(key).join(", ")
);
const beforeByPair = new Map(before.map((r) => [`${r.zip5} ${r.district}`, r]));
const changed = after.filter((r) => {
  const was = beforeByPair.get(`${r.zip5} ${r.district}`);
  return !was || JSON.stringify(was) !== JSON.stringify(r);
});
check(
  "the only other change is 32751 FL-10 becoming unsplit",
  changed.map(key).join(", ") === "32751 12095 FL-10 split=false",
  changed.map(key).join(", ")
);

console.log("\n4. Idempotent");
await applyMigration(db, FIX);
const again = await readZipDistrict(db);
check("a second run leaves the table as the first left it", JSON.stringify(again) === JSON.stringify(after));
await db.close();

console.log("\n5. District sets per county");
const EXPECTED = {
  /* Orange composite sample ballot, 2026 general: districts 8, 9 and 11
     printed; FL-10 unopposed and unprinted. */
  "12095": "FL-8,FL-9,FL-10,FL-11",
  "12086": "FL-24,FL-25,FL-26,FL-27,FL-28",
  "12011": "FL-20,FL-22,FL-24,FL-25,FL-26",
};
const num = (d) => Number(d.slice(3));
for (const [fips, expected] of Object.entries(EXPECTED)) {
  const got = [...new Set(after.filter((r) => r.countyFips === fips).map((r) => r.district))]
    .sort((a, b) => num(a) - num(b))
    .join(",");
  check(`${fips} offers ${expected}`, got === expected, got);
}

console.log("\n6. The seed source");
const csv = readFileSync(
  path.join(root, "docs", "general-election", "ballots", "zip_districts_2026.csv"),
  "utf8"
)
  .split(/\r?\n/)
  .filter(Boolean);
const header = csv[0].split(",");
const [ZIP, FIPS, CD] = ["zip5", "county_fips", "cd_2026_map"].map((h) => header.indexOf(h));
const csvRows = csv.slice(1).map((l) => l.split(","));
check(
  "zip_districts_2026.csv has no Orange FL-7 row",
  !csvRows.some((c) => c[FIPS] === "12095" && c[CD] === "FL-7")
);
const csvPairs = csvRows.map((c) => `${c[ZIP]} ${c[CD]}`).sort().join("\n");
const tablePairs = after.map((r) => `${r.zip5} ${r.district}`).sort().join("\n");
check("its pairs equal the table's after 0045", csvPairs === tablePairs);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nOrange FL-7 checks passed.");
