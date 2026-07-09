/* Verifies the generated election seed (plan A5):

     1. Every seeded row parses: ISO date, https details_url, known
        event_type, known election.
     2. (election, event_type) pairs are unique (statewide scope).
     3. Dates are internally ordered per election:
        registration < vbm_request < early_voting_start < early_voting_end
        < election_day.
     4. Against pglite with all migrations applied: the verified-statewide
        query (county_fips IS NULL AND verified_by IS NOT NULL) — the gate
        every send/render path uses — returns 0 rows as seeded and all rows
        once verified_by is set. Nothing sends before founder task F4.

   Run: node scripts/verify-election-seed.mjs */

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const seedFile = path.join(root, "supabase", "migrations", "0008_election_seed.sql");

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* (1)-(3): static checks on the generated SQL. */
const sql = await readFile(seedFile, "utf8");
const rowRe = /\('([a-z_]+)', '([a-z_0-9]+)', '(\d{4}-\d{2}-\d{2})', '([^']+)'\)/g;
const rows = [...sql.matchAll(rowRe)].map(([, event_type, election, date, url]) => ({
  event_type,
  election,
  date,
  url,
}));
check("seed rows found", rows.length === 10, `parsed ${rows.length}, expected 10`);

const EVENT_TYPES = [
  "registration_deadline",
  "vbm_request_deadline",
  "early_voting_start",
  "early_voting_end",
  "election_day",
];
for (const r of rows) {
  const label = `${r.election}/${r.event_type}`;
  check(`${label}: valid event_type`, EVENT_TYPES.includes(r.event_type));
  check(
    `${label}: date parses`,
    !Number.isNaN(new Date(`${r.date}T00:00:00Z`).getTime())
  );
  check(`${label}: https details_url`, r.url.startsWith("https://"));
}

const keys = rows.map((r) => `${r.election}:${r.event_type}`);
check("no duplicate (election, event_type)", new Set(keys).size === keys.length);

for (const election of ["primary_2026", "general_2026"]) {
  const byType = Object.fromEntries(
    rows.filter((r) => r.election === election).map((r) => [r.event_type, r.date])
  );
  const ordered = EVENT_TYPES.map((t) => byType[t]);
  check(
    `${election}: all five event types present`,
    ordered.every(Boolean)
  );
  check(
    `${election}: dates strictly ordered`,
    ordered.every((d, i) => i === 0 || d > ordered[i - 1]),
    ordered.join(" -> ")
  );
}

/* (4): the verified gate, against real migrations. */
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;");
const migrationsDir = path.join(root, "supabase", "migrations");
for (const f of (await readdir(migrationsDir)).filter((x) => x.endsWith(".sql")).sort()) {
  await db.exec(await readFile(path.join(migrationsDir, f), "utf8"));
}

const GATE =
  "SELECT count(*)::int AS n FROM election_event WHERE county_fips IS NULL AND verified_by IS NOT NULL";
const before = (await db.query(GATE)).rows[0].n;
check("verified gate: 0 rows sendable as seeded", before === 0, `saw ${before}`);
await db.exec("UPDATE election_event SET verified_by='probe@example.com', verified_at=NOW();");
const after = (await db.query(GATE)).rows[0].n;
check("verified gate: 10 rows sendable once verified", after === 10, `saw ${after}`);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nElection seed checks passed.");
