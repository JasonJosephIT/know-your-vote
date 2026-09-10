/* Checks the block -> district seed generator (scripts/build-block-seed.mjs).

   Part A is fixture unit checks. Part B is the cross-check against
   0018_zip_seed_2026.sql, and runs only when the real inputs are passed:

     node scripts/verify-block-seed.mjs <block_assignment.txt> <zcta_tabblock.txt>

   Run: node scripts/verify-block-seed.mjs */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  coveredBlocks,
  blockRanges,
  rangeMismatches,
  seedSql,
} from "./build-block-seed.mjs";

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

assert(
  "uncovered counties are dropped",
  !blocks.some((b) => b.geoid.startsWith("12087"))
);
assert(
  "malformed lines are dropped",
  !blocks.some((b) => b.geoid.includes("X"))
);
assert(
  "ten covered blocks survive",
  blocks.length === 10,
  `got ${blocks.length}`
);
assert(
  "blocks come out sorted by GEOID",
  blocks.every((b, i) => i === 0 || blocks[i - 1].geoid <= b.geoid)
);
assert(
  "districts are formatted FL-n",
  blocks.every((b) => /^FL-\d{1,2}$/.test(b.district))
);

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
assert(
  "no range spans two counties",
  ranges.every((r) => r.blockStart.slice(0, 5) === r.blockEnd.slice(0, 5))
);
assert(
  "generated ranges answer every source block",
  rangeMismatches(blocks, ranges).length === 0
);

/* Tampering must be caught -- that is the whole guarantee the encoding rests on. */
const tampered = ranges.map((r, i) =>
  i === 0 ? { ...r, district: "FL-99" } : r
);
assert(
  "a wrong range is detected",
  rangeMismatches(blocks, tampered).length > 0
);

const sql = seedSql(ranges);
assert(
  "seed replaces rather than appends",
  /DELETE FROM block_district;/.test(sql)
);
assert(
  "seed inserts every range",
  (sql.match(/^\('1\d{14}','1\d{14}','\d{5}','FL-\d{1,2}'\)/gm) ?? [])
    .length === ranges.length,
  `${(sql.match(/^\('1\d{14}','1\d{14}','\d{5}','FL-\d{1,2}'\)/gm) ?? []).length} vs ${ranges.length}`
);
assert(
  "seed names the four columns",
  /\(block_start, block_end, county_fips, congressional_district\)/.test(sql)
);

/* ---- Part B: cross-check against 0018 (only with the real inputs) ---- */
const [blockFile, relFile] = process.argv.slice(2);
if (blockFile && relFile) {
  const realBlocks = coveredBlocks(readFileSync(blockFile, "utf8"));
  const realRanges = blockRanges(realBlocks);
  assert(
    "the real plan replays exactly",
    rangeMismatches(realBlocks, realRanges).length === 0
  );

  /* The cross-check, and it has to respect how 0018 was built.

     build-zip-seed.mjs marks a ZIP is_split only when two districts each cover
     >= 5% of its land (SPLIT_SHARE). So a non-split ZIP is NOT "every block in
     one district" -- it is "one district over at least 95% of the land", and
     the sliver below that threshold genuinely belongs to another district.

     The invariant that actually ties the two derivations together is therefore:
     for every non-split ZIP, the district 0018 recorded must be the dominant one
     by land, and every other district present must sit under the 5% threshold
     that made the ZIP non-split. A wrong plan file fails this loudly -- it would
     move whole ZIPs, not slivers -- while the real one passes.

     Those slivers are not a rounding error to the voter in one: they are exactly
     who the ZIP path answers wrongly and address lookup answers exactly. */
  const SPLIT_SHARE = 0.05;
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
  assert(
    "parsed some non-split ZIPs from 0018",
    districtByZip.size > 0,
    `${districtByZip.size}`
  );

  const districtByBlock = new Map(realBlocks.map((b) => [b.geoid, b.district]));
  const lines = readFileSync(relFile, "utf8")
    .replace(/^\ufeff/, "")
    .split("\n");
  const header = lines[0].split("|").map((h) => h.trim());
  const ZCTA = header.indexOf("GEOID_ZCTA5_20");
  const BLOCK = header.indexOf("GEOID_TABBLOCK_20");
  const LAND = header.indexOf("AREALAND_PART");
  assert(
    "relationship file has the expected columns",
    ZCTA >= 0 && BLOCK >= 0 && LAND >= 0
  );

  /* Land per district, per non-split ZIP. */
  const perZip = new Map();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split("|");
    const zip = cols[ZCTA]?.trim();
    const block = cols[BLOCK]?.trim();
    const district = districtByBlock.get(block);
    if (!district) continue;
    if (!districtByZip.has(zip) || splitZips.has(zip)) continue;
    if (!perZip.has(zip)) perZip.set(zip, new Map());
    const byDistrict = perZip.get(zip);
    byDistrict.set(
      district,
      (byDistrict.get(district) ?? 0) + (Number(cols[LAND]) || 0)
    );
  }
  assert(
    "the cross-check actually compared ZIPs",
    perZip.size > 0,
    `${perZip.size}`
  );

  const notDominant = [];
  const overThreshold = [];
  for (const [zip, byDistrict] of perZip) {
    const recorded = districtByZip.get(zip);
    const total = [...byDistrict.values()].reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    let best = null;
    let bestLand = -1;
    for (const [d, land] of byDistrict) {
      if (land > bestLand) {
        best = d;
        bestLand = land;
      }
      if (d !== recorded && land / total >= SPLIT_SHARE) {
        overThreshold.push(
          `${zip}: ${d} holds ${((land / total) * 100).toFixed(1)}% but 0018 calls the ZIP ${recorded} and not split`
        );
      }
    }
    if (best !== recorded)
      notDominant.push(`${zip}: blocks say ${best}, 0018 says ${recorded}`);
  }
  assert(
    "0018's district is the dominant one in every non-split ZIP",
    notDominant.length === 0,
    `${notDominant.length}, e.g. ${notDominant.slice(0, 3).join("; ")}`
  );
  assert(
    "every other district in a non-split ZIP is under the 5% split threshold",
    overThreshold.length === 0,
    `${overThreshold.length}, e.g. ${overThreshold.slice(0, 3).join("; ")}`
  );
}

if (failures) {
  console.error(`\n${failures} block-seed check(s) failed`);
  process.exit(1);
}
console.log("\nAll block-seed checks passed.");
