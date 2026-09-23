/* Seed guardrail for 0030 (ballot measures), 0031/0032 (Tier A local races)
   and 0033 (listed tier), plus a throwaway run of scripts/list-ballot-2026.sql.

   verify-migrations.mjs proves every migration APPLIES and that RLS holds
   afterwards. It does not prove a seed put the right rows in — a data
   migration can run cleanly and still load nothing, or load something subtly
   wrong. Same split as verify-zip-seed / verify-block-seed: schema there,
   contents here.

   Three of these checks exist because the failure they catch is silent and
   voter-visible:

     1. Amendment 3's ballot summary must still contain its dollar figures.
        The Division of Elections booklet mixes literal and CID-encoded text;
        a hand-rolled PDF parse dropped exactly that line and left a
        grammatical sentence with the numbers missing. Nothing but a content
        assertion catches that.
     2. No county race may have a NULL district. coverage.ts matches
        `district IS NULL OR district = X`, so NULL reads as statewide — an
        Orange County commission race would render for a Broward voter.
     3. No county district may be a bare number, which would collide with the
        congressional district a ZIP actually resolves to and attach a county
        race to the wrong voters.

   Embedded Postgres, no network, no live database.
   Run: node scripts/verify-ballot-seeds.mjs */

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/* Resolve from this file, not cwd, so the script runs from anywhere. */
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationsDir = path.join(root, "supabase", "migrations");

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE cap_readonly NOLOGIN;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, cap_readonly;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
`);

for (const file of (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  await db.exec(await readFile(path.join(migrationsDir, file), "utf8"));
}

let failures = 0;
const n = async (sql) => (await db.query(sql)).rows[0].n;
async function check(label, sql, want) {
  const got = await n(sql);
  if (got === want) return;
  failures++;
  console.error(`  FAIL ${label} — got ${got}, want ${want}`);
}

console.log("0030 — statewide ballot measures");
await check(
  "three measures seeded",
  "SELECT count(*)::int n FROM ballot_measure",
  3
);
await check(
  "all scoped to general_2026",
  "SELECT count(*)::int n FROM ballot_measure WHERE election='general_2026'",
  3
);
await check(
  "all carry Florida's 60% threshold",
  "SELECT count(*)::int n FROM ballot_measure WHERE threshold_pct=60",
  3
);
await check(
  "all placed by the legislature",
  "SELECT count(*)::int n FROM ballot_measure WHERE placed_by='legislature'",
  3
);
/* A paraphrase would be far shorter than the printed summary; this is the
   cheap tripwire for a gist sneaking in where ballot text belongs. */
await check(
  "no summary is short enough to be a paraphrase",
  "SELECT count(*)::int n FROM ballot_measure WHERE length(ballot_summary) < 200",
  0
);
await check(
  "every measure cites an official full-text URL",
  "SELECT count(*)::int n FROM ballot_measure WHERE full_text_url LIKE 'https://%floridados.gov/%'",
  3
);
await check(
  "Amendment 3 still carries its dollar figures",
  `SELECT count(*)::int n FROM ballot_measure
    WHERE number='3'
      AND ballot_summary LIKE '%$150,000 in 2027 and $250,000 in 2028%'`,
  1
);
/* status = 'published', not "no row": the listed tier (0033) means a
   measure_publication row no longer implies a published measure. */
await check(
  "no measure is published (arguments do not exist yet)",
  "SELECT count(*)::int n FROM measure_publication WHERE status = 'published'",
  0
);

console.log("0031 + 0032 — Tier A local races");
await check(
  "thirty-two county races (17 contested + 15 decided)",
  "SELECT count(*)::int n FROM race WHERE level='county'",
  32
);
await check(
  "forty-nine local candidates (34 contested + 15 decided)",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%'",
  49
);
await check(
  "seventeen contested county races, each with exactly two candidates",
  `SELECT count(*)::int n FROM race r
    WHERE r.level='county' AND cardinality(r.candidate_ids) = 2`,
  17
);
await check(
  "fifteen decided county seats, each with exactly one",
  `SELECT count(*)::int n FROM race r
    WHERE r.level='county' AND cardinality(r.candidate_ids) = 1`,
  15
);
await check(
  "no county race has some other candidate count",
  `SELECT count(*)::int n FROM race
    WHERE level='county' AND cardinality(candidate_ids) NOT IN (1,2)`,
  0
);
await check(
  "no county race has a NULL district (NULL reads as statewide)",
  "SELECT count(*)::int n FROM race WHERE level='county' AND district IS NULL",
  0
);
await check(
  "no county district is a bare number (would collide with congressional)",
  "SELECT count(*)::int n FROM race WHERE level='county' AND district ~ '^[0-9]+$'",
  0
);
await check(
  "every candidate a county race names actually exists",
  `SELECT count(*)::int n FROM race r, unnest(r.candidate_ids) cid
    WHERE r.level='county'
      AND NOT EXISTS (SELECT 1 FROM candidate c WHERE c.candidate_id = cid)`,
  0
);
await check(
  "no local candidate is orphaned from its race",
  `SELECT count(*)::int n FROM candidate c
    WHERE c.candidate_id LIKE 'FL-VF-%'
      AND NOT EXISTS (SELECT 1 FROM race r WHERE c.candidate_id = ANY(r.candidate_ids))`,
  0
);
await check(
  "all local candidates are ballot tier",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND ballot_status <> 'ballot'",
  0
);
await check(
  "thirty-four contested local candidates are 'qualified'",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND qualifying_status = 'qualified'",
  34
);
/* The distinction 0032 exists to protect. Both states are absent from the
   November ballot for OPPOSITE reasons, and the page says different things
   about each -- "no one filed against this candidate" is false about someone
   who won a contested August primary. A drift that collapsed one into the
   other would publish that falsehood with nothing else noticing. */
await check(
  "five unopposed county officials",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND qualifying_status = 'unopposed'",
  5
);
await check(
  "ten elected-in-primary county officials",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND qualifying_status = 'elected_in_primary'",
  10
);
await check(
  "every decided seat holds exactly one settled candidate",
  `SELECT count(*)::int n FROM race r
    WHERE r.level='county' AND cardinality(r.candidate_ids) = 1
      AND NOT EXISTS (
        SELECT 1 FROM candidate c
         WHERE c.candidate_id = r.candidate_ids[1]
           AND c.qualifying_status IN ('unopposed','elected_in_primary'))`,
  0
);
await check(
  "no contested county race carries a settled candidate",
  `SELECT count(*)::int n FROM race r, unnest(r.candidate_ids) cid
     JOIN candidate c ON c.candidate_id = cid
    WHERE r.level='county' AND cardinality(r.candidate_ids) = 2
      AND c.qualifying_status IN ('unopposed','elected_in_primary')`,
  0
);
await check(
  "settled county officials are still ballot tier (0023: briefed, audited, shown)",
  `SELECT count(*)::int n FROM candidate
    WHERE qualifying_status IN ('unopposed','elected_in_primary')
      AND candidate_id LIKE 'FL-VF-%' AND ballot_status <> 'ballot'`,
  0
);
/* 0033 seeds a 'draft' row for every general race, so "no row" stopped
   meaning "unpublished"; count the status that actually shows a brief. */
await check(
  "no county race is published",
  `SELECT count(*)::int n FROM race_publication rp
     JOIN race r USING (race_id) WHERE r.level='county' AND rp.status = 'published'`,
  0
);
/* D1's tiering is per-candidate, but a county race that somehow carried a
   write-in would print a line we never brief. */
await check(
  "no local candidate is a write-in",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND party = 'WRI'",
  0
);

/* County judges were dropped on the founder's call: a county judge is a state
   trial judge elected countywide, a county BALLOT office but not a county
   GOVERNMENT one, so it is outside the surface 0032 fills. Pinned so a
   re-import from the same VoterFocus read is a deliberate act. */
await check(
  "no county judge seats on the county surface",
  `SELECT count(*)::int n FROM race
    WHERE level='county' AND office ILIKE '%county judge%'`,
  0
);

console.log("0033 — listed tier, as the migrations leave it");
/* Going live is a hand-run script, never a migration: applying 0033 must make
   nothing visible, so a replay of every migration leaves nothing listed or
   published anywhere. */
await check(
  "no race is listed or published by any migration",
  "SELECT count(*)::int n FROM race_publication WHERE status IN ('listed','published')",
  0
);
await check(
  "no measure is listed or published by any migration",
  "SELECT count(*)::int n FROM measure_publication WHERE status IN ('listed','published')",
  0
);
await check(
  "0033 gave every general race a draft publication row (the door needs one)",
  `SELECT count(*)::int n FROM race r
    WHERE r.election='general'
      AND NOT EXISTS (SELECT 1 FROM race_publication rp
                       WHERE rp.race_id = r.race_id AND rp.status = 'draft')`,
  0
);
await check(
  "0033 inserted no measure_publication rows",
  "SELECT count(*)::int n FROM measure_publication",
  0
);

/* scripts/list-ballot-2026.sql, the go-live flip, applied to this throwaway
   database after every migration. Proves it runs, flips through the door
   (one admin_action row per race), lists every measure, publishes nothing,
   and is a no-op the second time. */
console.log("list-ballot-2026.sql — go-live flip (throwaway)");
const listSql = await readFile(
  path.join(root, "scripts", "list-ballot-2026.sql"),
  "utf8"
);
const generalRaces = await n(
  "SELECT count(*)::int n FROM race WHERE election='general'"
);
const measures = await n(
  "SELECT count(*)::int n FROM ballot_measure WHERE election='general_2026'"
);
await db.exec(listSql);
await check(
  "every general race is listed",
  `SELECT count(*)::int n FROM race r JOIN race_publication rp USING (race_id)
    WHERE r.election='general' AND rp.status='listed'`,
  generalRaces
);
await check(
  "no race is published by the listing",
  "SELECT count(*)::int n FROM race_publication WHERE status='published'",
  0
);
await check(
  "every general_2026 measure is listed",
  `SELECT count(*)::int n FROM ballot_measure bm JOIN measure_publication mp USING (measure_id)
    WHERE bm.election='general_2026' AND mp.status='listed'`,
  measures
);
await check(
  "no measure is published by the listing",
  "SELECT count(*)::int n FROM measure_publication WHERE status='published'",
  0
);
await check(
  "every race flip went through the door and logged 'list'",
  `SELECT count(*)::int n FROM admin_action
    WHERE subject_kind='race_publication' AND action='list'
      AND detail->>'prior_status'='draft' AND detail->>'new_status'='listed'`,
  generalRaces
);
await check(
  "every measure listing logged an audit row",
  `SELECT count(*)::int n FROM admin_action
    WHERE subject_kind='measure_publication' AND action='list'`,
  measures
);
await check(
  "listing stamped no published_at",
  "SELECT count(*)::int n FROM race_publication WHERE published_at IS NOT NULL",
  0
);
const auditRows = await n("SELECT count(*)::int n FROM admin_action");
await db.exec(listSql);
await check(
  "a second run flips and logs nothing (idempotent)",
  "SELECT count(*)::int n FROM admin_action",
  auditRows
);
/* 0033 says "safe to re-run"; its closing assertion compares before/after,
   so re-applying it once everything is listed must pass and change nothing. */
await db.exec(
  await readFile(
    path.join(migrationsDir, "0033_listed_publication.sql"),
    "utf8"
  )
);
await check(
  "re-applying 0033 after go-live leaves every race listed",
  "SELECT count(*)::int n FROM race_publication WHERE status='listed'",
  generalRaces
);
/* What a voter's browser can now read: the whole roster, and no brief. */
await db.exec("SET ROLE anon;");
await check(
  "anon reads every listed race",
  "SELECT count(*)::int n FROM race",
  generalRaces
);
await check(
  "anon reads every candidate a listed race names (49 local)",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%'",
  49
);
await check(
  "anon reads every listed measure's ballot text",
  "SELECT count(*)::int n FROM ballot_measure",
  measures
);
await check(
  "anon reads no brief rows (profile/issue/position/claim/resource)",
  `SELECT ((SELECT count(*) FROM profile) + (SELECT count(*) FROM issue)
         + (SELECT count(*) FROM position) + (SELECT count(*) FROM claim)
         + (SELECT count(*) FROM measure_resource))::int n`,
  0
);
await db.exec("RESET ROLE;");

if (failures > 0) {
  console.error(`\nverify-ballot-seeds: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "\nverify-ballot-seeds: OK — measures and Tier A local races seeded as intended, none listed or published by a migration; list-ballot-2026.sql lists them all and publishes nothing."
);
