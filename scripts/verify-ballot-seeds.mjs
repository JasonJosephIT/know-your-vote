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
import { COVERED_COUNTIES } from "../src/lib/counties.ts";

/* Resolve from this file, not cwd, so the script runs from anywhere. */
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationsDir = path.join(root, "supabase", "migrations");

const db = new PGlite({ extensions: { pgcrypto } });
/* 0050's content freeze refuses writes to ballot tables from 2026-10-18 to
   2026-11-04 unless this is set; set before the replay so this check keeps
   passing inside that window (docs/general-election/corrections/README.md). */
await db.exec("SET kyv.freeze_correction = 'pglite replay';");
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
   measure_publication row no longer implies a published measure. 0038
   (Session A), 0040 and 0060 are the three migrations that DO publish a
   measure -- Amendment 3 (founder call F7), Amendment 2 (spec
   docs/superpowers/specs/2026-09-26-amendment-context-design.md §1) and
   Amendment 1 (founder, 2026-10-14) -- so "no measure is published" is no
   longer true after every migration; what stays true is that those three
   are the only ones. */
await check(
  "exactly three measures are published (FL-AM3-general by 0038, FL-AM2-general by 0040, FL-AM1-general by 0060)",
  "SELECT count(*)::int n FROM measure_publication WHERE status = 'published'",
  3
);
await check(
  "the three published measures are FL-AM3-general, FL-AM2-general and FL-AM1-general, not some other measure",
  "SELECT count(*)::int n FROM measure_publication WHERE status = 'published' AND measure_id IN ('FL-AM3-general', 'FL-AM2-general', 'FL-AM1-general')",
  3
);

console.log("0031 + 0032 + 0057 — Tier A local races");
/* 0057 adds the eight decided Miami-Dade seats 0032 missed (its VoterFocus
   read kept only "Active-" rows; docs/general-election/empty-races-2026-10-12.md):
   six commission seats, two school board seats, one candidate each. */
await check(
  "forty county races (17 contested + 15 decided in 0032 + 8 decided in 0057)",
  "SELECT count(*)::int n FROM race WHERE level='county'",
  40
);
/* 0038_county_roster_fixes swaps three wrongly seeded candidates for the
   right ones: the three out stay as rows, marked withdrawn/excluded and
   listed in no race, so the ballot tier is still 49, and 57 with 0057. */
const ROSTER_FIX_OUT = "('FL-VF-HIL-2639', 'FL-VF-HIL-2691', 'FL-VF-DAD-3080')";
await check(
  "fifty-seven ballot-tier local candidates (34 contested + 15 decided + 0057's 8)",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND ballot_status = 'ballot'",
  57
);
await check(
  "seventeen contested county races, each with exactly two candidates",
  `SELECT count(*)::int n FROM race r
    WHERE r.level='county' AND cardinality(r.candidate_ids) = 2`,
  17
);
await check(
  "twenty-three decided county seats (15 + 0057's 8), each with exactly one",
  `SELECT count(*)::int n FROM race r
    WHERE r.level='county' AND cardinality(r.candidate_ids) = 1`,
  23
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
  "no ballot-tier local candidate is orphaned from its race",
  `SELECT count(*)::int n FROM candidate c
    WHERE c.candidate_id LIKE 'FL-VF-%' AND c.ballot_status = 'ballot'
      AND NOT EXISTS (SELECT 1 FROM race r WHERE c.candidate_id = ANY(r.candidate_ids))`,
  0
);
await check(
  "the only non-ballot local candidates are 0038's three roster-fix removals",
  `SELECT count(*)::int n FROM candidate
    WHERE candidate_id LIKE 'FL-VF-%' AND ballot_status <> 'ballot'
      AND candidate_id NOT IN ${ROSTER_FIX_OUT}`,
  0
);
await check(
  "0038's three removals are withdrawn/excluded",
  `SELECT count(*)::int n FROM candidate
    WHERE candidate_id IN ${ROSTER_FIX_OUT}
      AND ballot_status = 'excluded' AND qualifying_status = 'withdrawn'`,
  3
);
await check(
  "no race lists one of 0038's removals",
  `SELECT count(*)::int n FROM race r, unnest(r.candidate_ids) cid
    WHERE cid IN ${ROSTER_FIX_OUT}`,
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
  "twelve unopposed county officials (5 + 0057's 7)",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND qualifying_status = 'unopposed'",
  12
);
await check(
  "eleven elected-in-primary county officials (10 + 0057's Cohen Higgins)",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND qualifying_status = 'elected_in_primary'",
  11
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
   nothing visible, so a replay of every migration leaves nothing listed
   anywhere, and the three exceptions to "nothing published" are 0038's,
   0040's and 0060's deliberate publishes of FL-AM3-general, FL-AM2-general
   and FL-AM1-general (checked below). */
await check(
  "no race is listed or published by any migration",
  "SELECT count(*)::int n FROM race_publication WHERE status IN ('listed','published')",
  0
);
await check(
  "no measure is listed by any migration",
  "SELECT count(*)::int n FROM measure_publication WHERE status = 'listed'",
  0
);
await check(
  "no measure OTHER than FL-AM3-general, FL-AM2-general and FL-AM1-general is published by any migration",
  "SELECT count(*)::int n FROM measure_publication WHERE status = 'published' AND measure_id NOT IN ('FL-AM3-general', 'FL-AM2-general', 'FL-AM1-general')",
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
/* 0033 itself still writes no measure_publication row -- the three rows
   that exist after every migration (FL-AM3-general, FL-AM2-general and
   FL-AM1-general, all published) are 0038's, 0040's and 0060's, not
   0033's. */
await check(
  "the only measure_publication rows after every migration are 0038's FL-AM3-general, 0040's FL-AM2-general and 0060's FL-AM1-general publishes",
  "SELECT count(*)::int n FROM measure_publication",
  3
);
/* 0038's publish flip writes its own admin_action row in the same statement
   (finding #3, fix round 1) -- exactly one, not zero (forgotten) and not
   more than one (duplicated by a naive re-run). */
await check(
  "0038's publish logged exactly one admin_action row",
  `SELECT count(*)::int n FROM admin_action
    WHERE action='publish' AND subject_kind='measure_publication'
      AND subject_ref='FL-AM3-general'`,
  1
);
/* 0040 mirrors 0038's self-auditing publish block for FL-AM2-general. */
await check(
  "0040's publish logged exactly one admin_action row",
  `SELECT count(*)::int n FROM admin_action
    WHERE action='publish' AND subject_kind='measure_publication'
      AND subject_ref='FL-AM2-general'`,
  1
);
/* 0060 is the same block for FL-AM1-general, with the founder's reason. */
await check(
  "0060's publish logged exactly one admin_action row, as the founder",
  `SELECT count(*)::int n FROM admin_action
    WHERE action='publish' AND subject_kind='measure_publication'
      AND subject_ref='FL-AM1-general' AND actor='founder'
      AND detail->>'new_status'='published'
      AND detail->>'reason' LIKE 'Founder decision 2026-10-14:%'`,
  1
);

/* Re-apply 0038 itself (idempotency, same proof style as 0033 below): the
   admin_action guard (`prior.status IS DISTINCT FROM upserted.status`) must
   see no change the second time -- still exactly one audit row, and AM3's
   resource count must still be 15 (ON CONFLICT DO UPDATE re-writing the
   same 14 rows, not appending duplicates). This check runs unrestricted
   (no SET ROLE), so it counts total rows in the table, not what anon can
   see -- the anon-scoped read-back is checked separately below. */
await db.exec(
  await readFile(
    path.join(migrationsDir, "0038_measure_resources_am3.sql"),
    "utf8"
  )
);
await check(
  "re-applying 0038 still logs exactly one admin_action row (no duplicate)",
  `SELECT count(*)::int n FROM admin_action
    WHERE action='publish' AND subject_kind='measure_publication'
      AND subject_ref='FL-AM3-general'`,
  1
);
await check(
  "re-applying 0038 still leaves FL-AM3-general with 15 resources (no duplicates)",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM3-general'",
  15
);

/* Same idempotency proof for 0040 / FL-AM2-general. */
await db.exec(
  await readFile(
    path.join(migrationsDir, "0040_measure_resources_am2.sql"),
    "utf8"
  )
);
await check(
  "re-applying 0040 still logs exactly one admin_action row (no duplicate)",
  `SELECT count(*)::int n FROM admin_action
    WHERE action='publish' AND subject_kind='measure_publication'
      AND subject_ref='FL-AM2-general'`,
  1
);
await check(
  "re-applying 0040 still leaves FL-AM2-general with 18 resources (no duplicates)",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM2-general'",
  18
);

/* 0059 stores Amendment 1's 8 verified sided rows beside 0035's booklet and
   0041's 9 neutral rows and publishes nothing. 0060 adds one oppose row
   (Your Observer) and two neutral ones (Florida Politics, WPTV), then
   publishes AM1 (the count of 3 above). The production path below takes AM1
   from `listed` to `published`, and proves the sided rows stayed hidden
   while it was listed. */
console.log("0059/0060 — Amendment 1's rows, then AM1 published");
const am1Stance = (stance) =>
  `SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM1-general' AND stance = '${stance}'`;
await check("FL-AM1-general stores 4 support rows (0059)", am1Stance("support"), 4);
await check("FL-AM1-general stores 5 oppose rows (0059's 4, 0060's Your Observer)", am1Stance("oppose"), 5);
await check(
  "FL-AM1-general stores 12 neutral rows (0035's booklet, 0041's 9, 0060's Florida Politics and WPTV)",
  am1Stance("neutral"),
  12
);
await check(
  "AM1's 2x gate holds (5 oppose <= 2 x 4 support)",
  "SELECT public.measure_sides_balanced('FL-AM1-general')::int n",
  1
);
await check(
  "AM1 is published by 0060",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id = 'FL-AM1-general' AND status = 'published' AND published_at IS NOT NULL",
  1
);
/* Founder decision 4 (FEA's toolkit on AM3) is NOT in 0060: a fifth oppose
   row would make AM3 2 vs 5 and fail the gate. AM3 keeps 0038's counts. */
const am3Stance = (stance) =>
  `SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM3-general' AND stance = '${stance}'`;
await check("FL-AM3-general stores 2 support rows (0038)", am3Stance("support"), 2);
await check("FL-AM3-general stores 4 oppose rows (0038; no FEA row)", am3Stance("oppose"), 4);
await check("FL-AM3-general stores 9 neutral rows (0035's booklet, 0038's 8)", am3Stance("neutral"), 9);
await check(
  "AM3's 2x gate still holds (4 oppose <= 2 x 2 support)",
  "SELECT public.measure_sides_balanced('FL-AM3-general')::int n",
  1
);
await db.exec(
  await readFile(
    path.join(migrationsDir, "0059_am1_verified_resources.sql"),
    "utf8"
  )
);
await check(
  "re-applying 0059 still leaves FL-AM1-general with 21 resources (no duplicates)",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM1-general'",
  21
);
await check(
  "re-applying 0059 leaves AM1 published (0059 never writes measure_publication)",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id = 'FL-AM1-general' AND status = 'published'",
  1
);
await db.exec(
  await readFile(
    path.join(migrationsDir, "0060_am1_publish.sql"),
    "utf8"
  )
);
await check(
  "re-applying 0060 still leaves FL-AM1-general with 21 resources (no duplicates)",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM1-general'",
  21
);
await check(
  "re-applying 0060 still logs exactly one admin_action row (no duplicate)",
  `SELECT count(*)::int n FROM admin_action
    WHERE action='publish' AND subject_kind='measure_publication'
      AND subject_ref='FL-AM1-general'`,
  1
);
await check(
  "re-applying 0060 adds no FL-AM3-general row",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM3-general'",
  15
);

/* scripts/list-ballot-2026.sql, the go-live flip, applied to this throwaway
   database after every migration. Proves it runs, flips through the door
   (one admin_action row per race), lists every measure that has no
   publication row yet, publishes nothing new, and is a no-op the second
   time. FL-AM3-general, FL-AM2-general and FL-AM1-general already have a
   row each (0038's, 0040's and 0060's 'published') by this point, so
   list-ballot-2026.sql's own NOT EXISTS guard skips all three -- `measures
   - 3`, which is 0, get listed here. */
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
const measuresPublishedBefore = await n(
  "SELECT count(*)::int n FROM measure_publication WHERE status='published'"
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
  "every measure without a prior row is now listed (none: AM1, AM2 and AM3 are published)",
  `SELECT count(*)::int n FROM ballot_measure bm JOIN measure_publication mp USING (measure_id)
    WHERE bm.election='general_2026' AND mp.status='listed'`,
  measures - 3
);
await check(
  "the listing published nothing new (published count unchanged by the listing)",
  "SELECT count(*)::int n FROM measure_publication WHERE status='published'",
  measuresPublishedBefore
);
await check(
  "every race flip went through the door and logged 'list'",
  `SELECT count(*)::int n FROM admin_action
    WHERE subject_kind='race_publication' AND action='list'
      AND detail->>'prior_status'='draft' AND detail->>'new_status'='listed'`,
  generalRaces
);
await check(
  "every newly-listed measure (none: AM1, AM2 and AM3 are published) logged an audit row",
  `SELECT count(*)::int n FROM admin_action
    WHERE subject_kind='measure_publication' AND action='list'`,
  measures - 3
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

/* I-3: the path that actually happened in production (per the verified doc's
   "Live state checked before this work") is list-ballot-2026.sql listing
   ALL THREE amendments first, and 0038/0040/0060 publishing AM3/AM2/AM1 out
   of `listed` only later -- not out of "no row" (prior_status NULL), which
   is all the harness has exercised so far since it applies every migration,
   0038, 0040 and 0060 included, before list-ballot-2026.sql ever runs.
   Reset all three to `listed` to match and re-apply 0038, 0040 and 0060 in
   turn to prove the production transition for each. */
console.log("0038/0040/0060 vs the production path — AM1/AM2/AM3 already 'listed' before they run");
await db.exec(
  "UPDATE measure_publication SET status='listed' WHERE measure_id IN ('FL-AM3-general', 'FL-AM2-general', 'FL-AM1-general');"
);
/* While AM1 is listed (production before 0060), 0041's policy shows anon
   its neutral rows only: 0059's sided rows and 0060's Observer row stay
   hidden. */
await db.exec("SET ROLE anon;");
await check(
  "anon reads FL-AM1-general's 12 neutral resources while listed",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM1-general'",
  12
);
await check(
  "anon reads 0 of FL-AM1-general's 9 support/oppose resources while listed",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM1-general' AND stance IN ('support','oppose')",
  0
);
await db.exec("RESET ROLE;");
await db.exec(
  await readFile(
    path.join(migrationsDir, "0038_measure_resources_am3.sql"),
    "utf8"
  )
);
await check(
  "0038 on the production path logs exactly one admin_action row transitioning listed -> published",
  `SELECT count(*)::int n FROM admin_action
    WHERE subject_kind='measure_publication' AND subject_ref='FL-AM3-general'
      AND action='publish'
      AND detail->>'prior_status'='listed' AND detail->>'new_status'='published'`,
  1
);
await check(
  "FL-AM3-general is published on the production path",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id='FL-AM3-general' AND status='published'",
  1
);
await check(
  "FL-AM2-general is still listed after 0038 re-applies, before 0040 runs",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id='FL-AM2-general' AND status='listed'",
  1
);
await db.exec(
  await readFile(
    path.join(migrationsDir, "0040_measure_resources_am2.sql"),
    "utf8"
  )
);
await check(
  "0040 on the production path logs exactly one admin_action row transitioning listed -> published",
  `SELECT count(*)::int n FROM admin_action
    WHERE subject_kind='measure_publication' AND subject_ref='FL-AM2-general'
      AND action='publish'
      AND detail->>'prior_status'='listed' AND detail->>'new_status'='published'`,
  1
);
await check(
  "FL-AM2-general is published on the production path",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id='FL-AM2-general' AND status='published'",
  1
);
await check(
  "AM1 stays listed, untouched by 0038/0040 on the production path",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id = 'FL-AM1-general' AND status='listed'",
  1
);
await db.exec(
  await readFile(
    path.join(migrationsDir, "0060_am1_publish.sql"),
    "utf8"
  )
);
await check(
  "0060 on the production path logs exactly one admin_action row transitioning listed -> published",
  `SELECT count(*)::int n FROM admin_action
    WHERE subject_kind='measure_publication' AND subject_ref='FL-AM1-general'
      AND action='publish' AND actor='founder'
      AND detail->>'prior_status'='listed' AND detail->>'new_status'='published'`,
  1
);
await check(
  "FL-AM1-general is published on the production path",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id='FL-AM1-general' AND status='published'",
  1
);
await check(
  "AM2 and AM3 are still published after 0060 runs",
  "SELECT count(*)::int n FROM measure_publication WHERE measure_id IN ('FL-AM2-general','FL-AM3-general') AND status='published'",
  2
);

/* What a voter's browser can now read: the whole roster, and no brief. */
await db.exec("SET ROLE anon;");
await check(
  "anon reads every listed race",
  "SELECT count(*)::int n FROM race",
  generalRaces
);
await check(
  "anon reads every candidate a listed race names (57 local)",
  "SELECT count(*)::int n FROM candidate WHERE candidate_id LIKE 'FL-VF-%'",
  57
);
/* No covered county's races view is empty (founder rule 2026-10-12;
   docs/general-election/empty-races-2026-10-12.md). The read is
   fetchCountyRaces's (src/lib/resolve.ts): level 'county', district on the
   county's prefix, as anon. Every race it returns must name a candidate anon
   can read, or the races view would print a seat with no one in it.
   Statewide and U.S. House races come from the DoE roster, which is not
   seeded offline; verify-no-empty-races.ts checks those against the live
   database. */
for (const county of COVERED_COUNTIES) {
  const like = `${county.raceDistrictPrefix}-%`;
  const races = await n(
    `SELECT count(*)::int n FROM race
      WHERE election='general' AND level='county' AND district LIKE '${like}'`
  );
  if (races === 0) {
    failures++;
    console.error(`  FAIL ${county.name} County has no county race anon can read`);
  }
  await check(
    `every ${county.name} County race anon reads names a candidate anon reads`,
    `SELECT count(*)::int n FROM race r
      WHERE r.election='general' AND r.level='county' AND r.district LIKE '${like}'
        AND NOT EXISTS (SELECT 1 FROM candidate c WHERE c.candidate_id = ANY (r.candidate_ids))`,
    0
  );
}
/* 0057's eight with 0032's three and 0031's two: every Miami-Dade
   commission and school board office on the county's 2026 VoterFocus list. */
await check(
  "anon reads Miami-Dade's thirteen county races (8 commission, 5 school board)",
  "SELECT count(*)::int n FROM race WHERE level='county' AND district LIKE 'DAD-%'",
  13
);
await check(
  "anon reads every listed measure's ballot text",
  "SELECT count(*)::int n FROM ballot_measure",
  measures
);
await check(
  "anon reads no brief rows (profile/issue/position/claim)",
  `SELECT ((SELECT count(*) FROM profile) + (SELECT count(*) FROM issue)
         + (SELECT count(*) FROM position) + (SELECT count(*) FROM claim))::int n`,
  0
);
/* All three measures are published (0038, 0040 and 0060, each round-
   tripped through 'listed' just above): anon sees AM3's resources --
   0038's 14 rows plus the FL-AM3-general:booklet row 0035 already seeded,
   15 total -- AM2's -- 0040's 17 rows plus its booklet row, 18 total -- and
   AM1's -- the booklet row, 0041's 9 neutral rows, 0059's 8 sided rows and
   0060's 3, 21 total, of which 4 support and 5 oppose. */
await check(
  "anon reads FL-AM3-general's 15 published resources",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM3-general'",
  15
);
await check(
  "anon reads FL-AM2-general's 18 published resources",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM2-general'",
  18
);
await check(
  "anon reads FL-AM1-general's 21 published resources",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM1-general'",
  21
);
await check(
  "anon reads FL-AM1-general's 9 support/oppose resources (4 support, 5 oppose) once published",
  "SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'FL-AM1-general' AND stance IN ('support','oppose')",
  9
);
await db.exec("RESET ROLE;");

if (failures > 0) {
  console.error(`\nverify-ballot-seeds: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "\nverify-ballot-seeds: OK — measures and Tier A local races seeded as intended; no race is listed or published by a migration, and FL-AM3-general/FL-AM2-general/FL-AM1-general are the three measures 0038/0040/0060 publish; list-ballot-2026.sql lists every race and every measure without a prior row (none now) and publishes nothing new; anon reads only AM1's 12 neutral rows while it is listed, and AM3's 15 resources, AM2's 18 and AM1's 21 once published."
);
