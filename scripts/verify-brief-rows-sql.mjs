/* Applies the brief writer's OUTPUT to embedded Postgres and asserts what the
   writer promises — src/lib/brief-rows.ts + scripts/brief-rows-sql.ts.

   scripts/verify-brief-rows.ts proves the row shapes in memory. This proves
   the part that file cannot: that the SQL actually applies against the real
   schema, with every FK, CHECK and UNIQUE in force, and that a second run
   over the same race replaces its rows instead of doubling them.

   The check that matters most is the LAST one. A race whose brief was just
   rewritten must be UNPUBLISHABLE until the Balance Audit runs again, because
   the audit that passed described the old content. briefs.ts enforces that by
   refusing a race whose profiles lack balance_check_passed = true, and the
   writer earns it by replacing `audit` rather than merging into it — so a
   stale PASS cannot survive a rewrite. Fail closed, in the one place where
   failing open means publishing unaudited claims about real people.

   Run: node scripts/verify-brief-rows-sql.mjs */

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new PGlite({ extensions: { pgcrypto } });
let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${name}\n      ${err.message}`);
  }
}

const one = async (sql) => (await db.query(sql)).rows[0];

await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
`);

const dir = path.join(root, "supabase", "migrations");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(path.join(dir, f), "utf8"));
}

/* The race the fixture plan is written against. Invented, on example.com —
   the fixture exists to exercise constraints, never to model a real contest. */
await db.exec(`
  INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES
    ('FIXTURE-race-general', 'Fixture Office', 'state', 'general',
     ARRAY['fixture-cand-rivers','fixture-cand-sunder']);
  INSERT INTO candidate
    (candidate_id, legal_name, party, office_sought, qualifying_status, ballot_status, official_site) VALUES
    ('fixture-cand-rivers', 'Ada Rivers',   'NPA', 'Fixture Office', 'qualified', 'ballot', 'https://ada-rivers.example.com'),
    ('fixture-cand-sunder', 'Blake Sunder', 'NPA', 'Fixture Office', 'qualified', 'ballot', 'https://blake-sunder.example.com');
`);

const work = mkdtempSync(path.join(tmpdir(), "brief-rows-"));
const sqlPath = path.join(work, "rows.sql");
execFileSync(
  process.execPath,
  [
    path.join(root, "scripts", "brief-rows-sql.ts"),
    "--plan",
    path.join(root, "scripts", "fixtures", "brief-rows", "plan.json"),
    "--out",
    sqlPath,
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
const sql = readFileSync(sqlPath, "utf8");

await check("the emitted SQL applies against the real schema", async () => {
  await db.exec(sql);
});

await check("every claim carries at least one source", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM claim c
    WHERE NOT EXISTS (SELECT 1 FROM claim_source cs WHERE cs.claim_id = c.claim_id);
  `);
  if (r.n !== 0) throw new Error(`${r.n} unsourced claim(s) — briefs.ts would drop them`);
});

await check("no claim is emitted as a checked fact", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM claim
    WHERE bucket <> 'stated_position' OR verification <> 'single_source' OR verdict IS NOT NULL;
  `);
  if (r.n !== 0) throw new Error(`${r.n} claim(s) claim adjudication that never happened`);
});

await check("every ballot candidate has a position on every spine issue", async () => {
  const r = await one(`
    SELECT count(*)::int AS n
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
    CROSS JOIN issue i
    WHERE r.race_id = 'FIXTURE-race-general' AND c.ballot_status = 'ballot'
      AND i.tier = 'spine' AND i.race_id = r.race_id
      AND NOT EXISTS (
        SELECT 1 FROM position p
        WHERE p.candidate_id = c.candidate_id AND p.issue_id = i.issue_id);
  `);
  if (r.n !== 0) throw new Error(`${r.n} silent gap(s) where a position row should say so`);
});

await check("a candidate silent on a spine issue says so in a row", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM position
    WHERE coverage = 'no_stated_position_found' AND candidate_id = 'fixture-cand-sunder';
  `);
  if (r.n !== 2) throw new Error(`expected 2 sourced absences, saw ${r.n}`);
});

await check("every position's claim_ids resolve to that candidate's claims", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM position p, unnest(p.claim_ids) cid
    WHERE NOT EXISTS (
      SELECT 1 FROM claim c WHERE c.claim_id = cid AND c.candidate_id = p.candidate_id);
  `);
  if (r.n !== 0) throw new Error(`${r.n} dangling claim id(s)`);
});

await check("profile.positions matches audit.stated_position_count", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM profile
    WHERE cardinality(positions) <> (audit->>'stated_position_count')::int
       OR cardinality(facts) <> (audit->>'verifiable_fact_count')::int;
  `);
  if (r.n !== 0) {
    throw new Error(
      `${r.n} profile(s) whose audit disagrees with its own arrays — ` +
        "balance_audit_core reads the arrays, the site renders the counts",
    );
  }
});

await check("profile.positions holds the candidate's own claim ids", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM profile p, unnest(p.positions) cid
    WHERE NOT EXISTS (
      SELECT 1 FROM claim c
      WHERE c.claim_id = cid AND c.candidate_id = p.candidate_id
        AND c.bucket = 'stated_position');
  `);
  if (r.n !== 0) throw new Error(`${r.n} profile claim id(s) are not this candidate's stated positions`);
});

await check("the audit carries the fields balance_audit_core indexes", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM profile
    WHERE audit->>'word_count' IS NULL OR audit->>'fact_checks_performed' IS NULL
       OR audit->>'spine_issues_covered' IS NULL;
  `);
  if (r.n !== 0) throw new Error(`${r.n} profile(s) would raise KeyError in the Balance Audit`);
});

await check("a second run replaces the race's rows instead of doubling them", async () => {
  const before = await one(`
    SELECT (SELECT count(*) FROM claim)::int c, (SELECT count(*) FROM position)::int p,
           (SELECT count(*) FROM issue)::int i, (SELECT count(*) FROM profile)::int pr,
           (SELECT count(*) FROM claim_source)::int cs;
  `);
  await db.exec(sql);
  const after = await one(`
    SELECT (SELECT count(*) FROM claim)::int c, (SELECT count(*) FROM position)::int p,
           (SELECT count(*) FROM issue)::int i, (SELECT count(*) FROM profile)::int pr,
           (SELECT count(*) FROM claim_source)::int cs;
  `);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`${JSON.stringify(before)} became ${JSON.stringify(after)}`);
  }
});

await check("one page cited twice is one source row", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM source WHERE url_norm = 'ada-rivers.example.com/issues/water';
  `);
  if (r.n !== 1) throw new Error(`saw ${r.n} source rows for one page`);
});

/* The one that keeps unaudited content dark. */
await check("a freshly written brief is NOT publishable until re-audited", async () => {
  const r = await one(`
    SELECT count(*)::int AS n FROM profile
    WHERE race_id = 'FIXTURE-race-general'
      AND (audit->>'balance_check_passed')::boolean IS DISTINCT FROM true;
  `);
  if (r.n !== 2) {
    throw new Error(
      "the writer set balance_check_passed itself — the publication gate is " +
        "supposed to be earned from the Balance Audit, not written by the writer",
    );
  }
});

await check("and a stale PASS does not survive a rewrite", async () => {
  await db.exec(`
    UPDATE profile SET audit = audit || '{"balance_check_passed": true}'::jsonb
    WHERE race_id = 'FIXTURE-race-general';
  `);
  await db.exec(sql);
  const r = await one(`
    SELECT count(*)::int AS n FROM profile
    WHERE race_id = 'FIXTURE-race-general' AND (audit ? 'balance_check_passed');
  `);
  if (r.n !== 0) throw new Error(`${r.n} profile(s) kept a verdict for content that changed`);
});

await db.exec("SET ROLE anon;");
await check("anon still cannot see an unpublished race's claims", async () => {
  const r = await one("SELECT count(*)::int AS n FROM claim;");
  if (r.n !== 0) throw new Error(`${r.n} claim(s) leaked before publication`);
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("  all checks passed");
