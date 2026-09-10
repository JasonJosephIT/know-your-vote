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
     5. The rows 0021 adds on top of 0008 (ballot_return_deadline, and the
        `rule` on every deadline) are present and internally consistent.
        These are checked against the DATABASE, not by re-parsing SQL: 0008
        is frozen (applied live, never regenerated) so the static checks
        above deliberately still describe exactly its ten rows.

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
/* 10 from 0008 + 2 ballot_return_deadline rows from 0021. */
const EXPECTED_ROWS = rows.length + 2;
check(
  `verified gate: ${EXPECTED_ROWS} rows sendable once verified`,
  after === EXPECTED_ROWS,
  `saw ${after}`
);

/* (5): 0021's additions, read back from the applied schema. */
const returns = (
  await db.query(
    `SELECT e.election, e.rule, e.details_url,
            e.event_date::text AS event_date,
            d.event_date::text AS election_day
       FROM election_event e
       JOIN election_event d
         ON d.election = e.election AND d.event_type = 'election_day'
      WHERE e.event_type = 'ballot_return_deadline'
      ORDER BY e.election;`
  )
).rows;
check(
  "ballot_return_deadline seeded for both elections",
  returns.length === 2,
  `saw ${returns.length}`
);
for (const r of returns) {
  check(
    `${r.election}: return deadline is election day itself`,
    r.event_date === r.election_day,
    `${r.event_date} vs ${r.election_day}`
  );
  check(`${r.election}: return rule is received_by`, r.rule === "received_by", String(r.rule));
  check(
    `${r.election}: return cites the page that states the rule`,
    r.details_url.includes("vote-by-mail"),
    r.details_url
  );
}

const ruleAudit = (
  await db.query(
    `SELECT event_type, rule, count(*)::int AS n
       FROM election_event GROUP BY event_type, rule ORDER BY event_type;`
  )
).rows;
const EXPECTED_RULE = {
  registration_deadline: "postmarked_by",
  vbm_request_deadline: "received_by",
  ballot_return_deadline: "received_by",
  early_voting_start: null,
  early_voting_end: null,
  election_day: null,
};
for (const r of ruleAudit) {
  check(
    `rule for ${r.event_type} is ${String(EXPECTED_RULE[r.event_type])}`,
    r.rule === EXPECTED_RULE[r.event_type],
    `saw ${String(r.rule)} on ${r.n} row(s)`
  );
}
check(
  "every event_type is covered by the rule audit",
  new Set(ruleAudit.map((r) => r.event_type)).size === Object.keys(EXPECTED_RULE).length,
  ruleAudit.map((r) => r.event_type).join(", ")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nElection seed checks passed.");
