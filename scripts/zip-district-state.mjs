/* zip_district as production holds it: 0022_zip_seed_2026.sql, then every
   later migration that corrects it (a file named *_zip_district.sql, such
   as 0045_orange_fl7_zip_district.sql), applied in filename order to an
   embedded Postgres. 0022 is applied and immutable, so a correction lands as
   a new file, and a check that read 0022 alone would test rows the site no
   longer serves.

   Shared by scripts/verify-zip-seed-2026.mjs and
   scripts/verify-zip-orange-fl7.mjs. Not a verify script itself, so
   scripts/verify-all.mjs does not run it on its own. */

import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrations = path.join(root, "supabase", "migrations");
const SEED = "0022_zip_seed_2026.sql";

/* The files that follow the seed, in the order Supabase applies them. */
export function zipCorrections() {
  return readdirSync(migrations)
    .filter((f) => /_zip_district\.sql$/.test(f) && f > SEED)
    .sort();
}

/* The table, created from 0001's own DDL so the primary key the
   corrections rely on is the real one. */
export async function freshZipDistrictDb() {
  const ddl = readFileSync(path.join(migrations, "0001_app_tables.sql"), "utf8").match(
    /CREATE TABLE zip_district \([\s\S]*?\n\);/
  )?.[0];
  if (!ddl) throw new Error("0001_app_tables.sql no longer creates zip_district");
  const db = new PGlite();
  await db.exec(ddl);
  return db;
}

export async function readZipDistrict(db) {
  const { rows } = await db.query(
    `SELECT zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage
       FROM zip_district ORDER BY zip5, congressional_district`
  );
  return rows.map((r) => ({
    zip5: r.zip5,
    countyFips: r.county_fips,
    countyName: r.county_name,
    district: r.congressional_district,
    metro: r.metro,
    isSplit: r.is_split,
    inCoverage: r.in_coverage,
  }));
}

export async function applyMigration(db, file) {
  await db.exec(readFileSync(path.join(migrations, file), "utf8"));
}

/* 0022 plus every correction: the rows the live site reads. */
export async function zipDistrictAsApplied() {
  const db = await freshZipDistrictDb();
  await applyMigration(db, SEED);
  for (const file of zipCorrections()) await applyMigration(db, file);
  const rows = await readZipDistrict(db);
  await db.close();
  return rows;
}
