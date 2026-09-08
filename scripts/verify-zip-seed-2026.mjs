/* Checks supabase/migrations/0018_zip_seed_2026.sql — the ZIP -> district
   crosswalk rebuilt for the enacted 2026 congressional map — against
   docs/general-election/ballots/zip_districts_2026.csv, an answer to the same
   question derived independently from the same two Census/plan inputs.

   The (zip5, congressional_district) pairs must match exactly: same count, no
   extras, no omissions. The CSV's cd_share and legislative columns have no
   home in zip_district and are not compared. A disagreement is a finding
   about one of the two derivations, so this prints the ZIPs that differ.

   Run: node scripts/verify-zip-seed-2026.mjs */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedFile = path.join(root, "supabase", "migrations", "0018_zip_seed_2026.sql");
const ORACLE = "docs/general-election/ballots/zip_districts_2026.csv";
const ORACLE_REF = "claude/ballots-handoff-docs-835025";
const METRO_FIPS = ["12086", "12011", "12057", "12095"];

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* The generated migration. */
const sql = readFileSync(seedFile, "utf8");
const body = sql.split("VALUES\n")[1] ?? "";
const rowRe =
  /^\('(\d{5})','(\d{5})','([^']*)','(FL-\d+)','([a-z_]+)',(true|false),true\)/gm;
const rows = [...body.matchAll(rowRe)].map(
  ([, zip5, countyFips, countyName, district, metro, isSplit]) => ({
    zip5,
    countyFips,
    countyName,
    district,
    metro,
    isSplit: isSplit === "true",
  })
);
check(
  "every VALUES row parses",
  rows.length === (body.match(/^\(/gm) ?? []).length && rows.length > 0,
  `parsed ${rows.length} of ${(body.match(/^\(/gm) ?? []).length} tuples`
);

const seedByZip = new Map();
for (const r of rows) seedByZip.set(r.zip5, [...(seedByZip.get(r.zip5) ?? []), r.district]);
check("235 distinct ZIPs", seedByZip.size === 235, `saw ${seedByZip.size}`);

const offMetro = rows.filter((r) => !METRO_FIPS.includes(r.countyFips));
check(
  "every county_fips is one of the four covered metros",
  offMetro.length === 0,
  offMetro.map((r) => `${r.zip5} -> ${r.countyFips} ${r.countyName}`).join(", ")
);

/* is_split is what stops the resolver auto-picking a district (FR-001), and
   the oracle has no column for it, so it is checked here against row counts. */
const badSplit = rows.filter((r) => r.isSplit !== (seedByZip.get(r.zip5).length > 1));
check(
  "is_split is set on exactly the multi-district ZIPs",
  badSplit.length === 0,
  [...new Set(badSplit.map((r) => r.zip5))]
    .map((z) => `${z}: is_split=${seedByZip.get(z).length > 1 ? "false" : "true"} on ${seedByZip.get(z).length} row(s)`)
    .join(", ")
);

/* The oracle. It lives on the ballots-handoff branch until that merges. */
const csv = existsSync(path.join(root, ORACLE))
  ? readFileSync(path.join(root, ORACLE), "utf8")
  : execFileSync("git", ["show", `${ORACLE_REF}:${ORACLE}`], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1 << 24,
    });
const csvLines = csv.split("\n").filter(Boolean);
const csvHeader = csvLines[0].split(",");
const ZIP = csvHeader.indexOf("zip5");
const CD = csvHeader.indexOf("cd_2026_map");
const oracleByZip = new Map();
for (const line of csvLines.slice(1)) {
  const cells = line.split(",");
  const zip = cells[ZIP];
  oracleByZip.set(zip, [...(oracleByZip.get(zip) ?? []), cells[CD]]);
}
const oraclePairs = new Set(
  [...oracleByZip].flatMap(([z, ds]) => ds.map((d) => `${z} ${d}`))
);
const seedPairs = new Set(
  [...seedByZip].flatMap(([z, ds]) => ds.map((d) => `${z} ${d}`))
);

const sorted = (m, z) => [...(m.get(z) ?? [])].sort().join("|") || "-";
const diff = (pairs) =>
  [...new Set([...pairs].map((p) => p.split(" ")[0]))]
    .sort()
    .map((z) => `${z}: seed ${sorted(seedByZip, z)} / oracle ${sorted(oracleByZip, z)}`)
    .join("\n      ");

const extra = [...seedPairs].filter((p) => !oraclePairs.has(p));
const missing = [...oraclePairs].filter((p) => !seedPairs.has(p));
check(
  "pair count matches the oracle",
  seedPairs.size === oraclePairs.size,
  `seed ${seedPairs.size}, oracle ${oraclePairs.size}`
);
check("no pair the oracle does not have", extra.length === 0, diff(extra));
check("no pair the oracle has that the seed lacks", missing.length === 0, diff(missing));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log(
  `\n2026 ZIP seed matches the oracle: ${seedPairs.size} pairs over ${seedByZip.size} ZIPs.`
);
