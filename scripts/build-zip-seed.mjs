/* Generates supabase/migrations/0022_zip_seed_2026.sql — the ZIP -> county /
   congressional district crosswalk for the four covered metros — from the
   enacted 2026 Florida congressional plan and the Census 2020 block geography:

     EOGPCRP2026_block_assignment.txt — the enacted plan, one line per 2020
       census block: <15-digit block GEOID>,<district number>.
     zcta_tabblock_fl.txt — the Census 2020 ZCTA520 <-> tabblock relationship
       file, filtered to Florida blocks:
       https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_tabblock20_natl.txt

   This replaces the CD119-based build that produced 0003_zip_seed.sql. CD119
   is the 2024 map; Florida enacted a new congressional plan in HB 1-D (signed
   2026-05-04, published as EOGPCRP2026), and the November 2026 general is run
   on it. 0003 stays in the tree — it is applied and immutable — and 0022
   supersedes it by running later.

   The enacted plan is published per block rather than per ZCTA, so the ZIP ->
   district overlap is aggregated here from block land area, and the county
   comes from the block GEOID (state(2) + county(3) + tract(6) + block(4))
   rather than from a third Census file.

   A ZIP is included when its dominant county (largest land overlap) is one
   of the four covered metros. A ZIP is is_split=true when two or more
   districts each cover >= 5% of its land area — those ZIPs get one row per
   qualifying district and the resolver must ask the voter to confirm rather
   than auto-picking (FR-001).

   Run: node scripts/build-zip-seed.mjs <block_assignment.txt> <zcta_tabblock.txt> */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const METROS = {
  "12086": { name: "Miami-Dade", metro: "miami" },
  "12011": { name: "Broward", metro: "fort_lauderdale" },
  "12057": { name: "Hillsborough", metro: "tampa" },
  "12095": { name: "Orange", metro: "orlando" },
};
const SPLIT_SHARE = 0.05;

/* Largest land overlap wins. Ties break on the key so a rerun on the same
   inputs produces the same migration. */
function dominantKey(landByKey) {
  let best = null;
  let bestLand = -1;
  for (const [key, land] of landByKey) {
    if (land > bestLand || (land === bestLand && key < best)) {
      best = key;
      bestLand = land;
    }
  }
  return best;
}

/** Rows for zip_district, ordered by ZIP then by descending district overlap. */
export function zipDistrictRows(blockAssignmentText, zctaBlockText) {
  const districtByBlock = new Map();
  const blockLines = blockAssignmentText.split("\n");
  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i];
    if (!line) continue;
    const fields = line.split(",");
    const district = Number(fields[1]);
    /* A missing/extra field or a non-numeric district silently produced
       district = NaN and poisoned one ZIP's output. Fail closed instead:
       name the line so the bad extract is easy to find and re-pull. */
    if (fields.length !== 2 || !Number.isFinite(district)) {
      throw new Error(
        `block assignment line ${i + 1} is malformed, expected ` +
          `"<15-digit block GEOID>,<district number>": ${JSON.stringify(line)} ` +
          `— re-extract EOGPCRP2026_block_assignment.txt and re-run`
      );
    }
    districtByBlock.set(fields[0], district);
  }

  const lines = zctaBlockText.replace(/^﻿/, "").split("\n");
  const header = lines[0].split("|").map((h) => h.trim());
  /* By name, not by position: GEOID_TABBLOCK_20 is the 10th column and sits
     next to OID_TABBLOCK_20, which is a different identifier entirely. */
  const ZCTA = header.indexOf("GEOID_ZCTA5_20");
  const BLOCK = header.indexOf("GEOID_TABBLOCK_20");
  const LAND = header.indexOf("AREALAND_PART");
  if (ZCTA < 0 || BLOCK < 0 || LAND < 0) {
    throw new Error(
      `relationship file is missing a needed column: ${header.join("|")}`
    );
  }

  const byZcta = new Map();
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const parts = line.split("|");
    const zcta = parts[ZCTA];
    /* Blocks that fall in no ZCTA carry empty ZCTA fields — no ZIP to seed. */
    if (!zcta) continue;
    const land = Number(parts[LAND]) || 0;
    let agg = byZcta.get(zcta);
    if (!agg) byZcta.set(zcta, (agg = { counties: new Map(), districts: new Map() }));
    /* County comes from the block GEOID alone and is summed for every block
       that has a ZCTA, whether or not the block is in the enacted plan. A
       block absent from the block-assignment file is still real land
       belonging to a county (most likely water, or a vintage gap between
       the 2020 block file and EOGPCRP2026) — gating the county total on
       plan coverage would let that gap silently shrink a county's land and
       could flip a border ZIP's dominant-county call. Verified output-
       neutral against the real 2026 inputs; see 33102 in
       scripts/fixtures/zip-seed/ for the case where it isn't. */
    const county = parts[BLOCK].slice(0, 5);
    agg.counties.set(county, (agg.counties.get(county) ?? 0) + land);
    const district = districtByBlock.get(parts[BLOCK]);
    if (district !== undefined) {
      agg.districts.set(district, (agg.districts.get(district) ?? 0) + land);
    }
  }

  const rows = [];
  for (const zcta of [...byZcta.keys()].sort()) {
    const { counties, districts } = byZcta.get(zcta);
    const countyFips = dominantKey(counties);
    const covered = METROS[countyFips];
    if (!covered) continue;
    /* Shares are taken over the land we can attribute to a district, not over
       AREALAND_ZCTA5_20: the relationship file is the national one filtered to
       Florida, so that column can count land outside the enacted plan. */
    const total = [...districts.values()].reduce((a, b) => a + b, 0) || 1;
    const dominant = dominantKey(districts);
    const qualifying = [...districts]
      .filter(([d, land]) => d === dominant || land / total >= SPLIT_SHARE)
      .sort(([da, la], [db, lb]) => lb - la || da - db);
    const isSplit = qualifying.length > 1;
    for (const [district] of qualifying) {
      rows.push({
        zip5: zcta,
        countyFips,
        countyName: covered.name,
        district: `FL-${district}`,
        metro: covered.metro,
        isSplit,
      });
    }
  }
  return rows;
}

/** The migration body: a full replacement of zip_district. */
export function seedSql(rows) {
  const values = rows.map(
    (r) =>
      `('${r.zip5}','${r.countyFips}','${r.countyName.replace(/'/g, "''")}','${r.district}','${r.metro}',${r.isSplit},true)`
  );
  return `-- ZIP -> county/district seed for the four covered metros, on the
-- congressional map enacted by HB 1-D (signed 2026-05-04, published as
-- EOGPCRP2026) — the map the November 2026 general is run on.
-- Generated by scripts/build-zip-seed.mjs from the enacted plan's block
-- assignment and the Census 2020 ZCTA520/tabblock relationship file.
-- Supersedes the CD119 (2024 map) rows seeded by 0003_zip_seed.sql, which
-- stays applied and untouched. Split ZIPs (>=2 districts each covering >=5%
-- of land area) carry one row per district with is_split=true.

DELETE FROM zip_district;
INSERT INTO zip_district
  (zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage)
VALUES
${values.join(",\n")};
`;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const [blockFile, relFile] = process.argv.slice(2);
  if (!blockFile || !relFile) {
    console.error(
      "usage: node scripts/build-zip-seed.mjs <block_assignment.txt> <zcta_tabblock.txt>"
    );
    process.exit(1);
  }
  const rows = zipDistrictRows(
    readFileSync(blockFile, "utf8"),
    readFileSync(relFile, "utf8")
  );
  /* An empty result means the inputs did not join — most likely the two
     arguments are the wrong way round. Never write an empty migration. */
  if (rows.length === 0) {
    console.error(
      `no ZIPs resolved from ${blockFile} + ${relFile}; check the argument order`
    );
    process.exit(1);
  }
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const out = path.join(root, "supabase", "migrations", "0022_zip_seed_2026.sql");
  writeFileSync(out, seedSql(rows));
  const zips = new Set(rows.map((r) => r.zip5));
  const split = new Set(rows.filter((r) => r.isSplit).map((r) => r.zip5));
  console.log(
    `wrote ${out}: ${rows.length} rows, ${zips.size} ZIPs, ${split.size} split`
  );
}
