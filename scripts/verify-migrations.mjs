/* Applies every migration in supabase/migrations/ to an embedded Postgres
   (PGlite) and asserts the RLS invariants the product depends on:

     1. All migrations apply cleanly, in order.
     2. anon cannot read voting_info_subscription at all.
     3. anon sees only published races (draft/in_review are invisible).
     4. anon sees claims/profiles only for published races.
     5. anon cannot write anything.
     6. Only status='verified' social handles are visible to anon.
     7. 0005_refresh_agents objects exist: candidate_contact,
        news_item.candidate_id, race.info_last_verified_at,
        candidate.site_last_verified_at (plan §7 "migration applied").
     8. The news_item (url, candidate_id) unique index rejects a duplicate
        insert, and the item_type CHECK rejects an unknown item_type.
     9. anon can SELECT candidate_contact but cannot INSERT it.
    10. 0006_admin_ops objects exist: agent_run, agent_run_request,
        review_item, admin_action, and the uq_run_request_live partial index.
    11. The ops plane is server-side only: anon AND authenticated are denied
        both SELECT and INSERT on all four ops tables (design.md § 3).
    12. Ops CHECK/unique invariants hold: uq_run_request_live rejects a second
        live request per agent; the status/agent/kind CHECKs reject unknowns.
    13. admin_action is append-only even for service_role: INSERT/SELECT are
        granted, UPDATE/DELETE are denied (PRD § 5).
    14. 0007_notifications objects exist (election_event,
        notification_send_log); anon can neither read nor write them;
        the event_type CHECK and the statewide-scope unique index reject
        bad rows; send_log ON CONFLICT DO NOTHING dedupes.
    15. 0009_action_log_roles invariants (CAP_Runtime_PRD_v1 S1-01):
        action_log exists with its guard partial index; cap_tool_wrapper
        is INSERT-only on the log (no SELECT/UPDATE/DELETE) and can
        write content tables but not DELETE, not touch PII, and not
        write the freshness plane; cap_readonly sees the log and ALL
        claims (published or not — traceability needs both) but writes
        nothing; anon has zero log access; the log is append-only even
        for service_role; the agent_id/status/bucket CHECKs hold.
    16. 0014_news_fairness invariants (news-fairness.md N1): a candidate_news
        or election_news row with source_id NULL is rejected; an
        official_link row with source_id NULL still inserts; a candidate_news
        row with a valid source_id inserts.
    17. 0023_candidate_unopposed (decision D-B): candidate.qualifying_status
        admits 'unopposed' and still rejects an unknown value, and exactly one
        CHECK on that column survives — the widening cannot half-apply.

   Supabase provides the anon/authenticated/service_role roles out of the box;
   the harness creates them first so the same SQL runs in both environments.

   Run: node scripts/verify-migrations.mjs */

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationsDir = path.join(root, "supabase", "migrations");

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

async function expectDenied(name, sql) {
  await check(name, async () => {
    try {
      await db.exec(sql);
    } catch (err) {
      if (/permission denied|violates row-level security/i.test(err.message)) {
        return;
      }
      throw new Error(`unexpected error: ${err.message}`);
    }
    throw new Error("statement succeeded but should have been denied");
  });
}

/* Constraint probes (unique index / CHECK) are a different failure mode
   than RLS: they must reject the statement regardless of role, so these run
   as service_role — the role R1/R2/R3 actually write through in production. */
async function expectConstraintViolation(name, sql, pattern) {
  await check(name, async () => {
    try {
      await db.exec(sql);
    } catch (err) {
      if (pattern.test(err.message)) return;
      throw new Error(`unexpected error: ${err.message}`);
    }
    throw new Error("statement succeeded but should have violated a constraint");
  });
}

/* Roles that Supabase creates in every project. */
await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
`);

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  await check(`migration applies: ${file}`, () => db.exec(sql));
}

if (failures > 0) {
  console.error(`\n${failures} migration(s) failed — skipping behavior checks`);
  process.exit(1);
}

/* A source row usable by the constraint probes below, which run before the
   main fixture block (line ~330) exists — 0014's news_item_agent_source_check
   now requires every candidate_news/election_news test row to carry one. */
await db.exec(`
  INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
  VALUES ('src-early-test', 'https://example.gov/early', 'example.gov/early', 'Example Gov', 'primary_doc', 'N/A');
`);

/* 0005_refresh_agents: confirm the objects R1-R4 will write to actually
   exist, independent of the fixture data below (plan §7 "migration
   applied"). information_schema queries never throw for a missing column —
   they just return zero rows — so each check asserts count === 1. */
await check("candidate_contact table exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='candidate_contact';"
  );
  if (r.rows[0].n !== 1) throw new Error("candidate_contact table missing");
});
await check("news_item.candidate_id column exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='news_item' AND column_name='candidate_id';"
  );
  if (r.rows[0].n !== 1) throw new Error("news_item.candidate_id missing");
});
await check("0016 news_item.county_fips exists, is CHAR(5) and is nullable", async () => {
  const r = await db.query(
    `SELECT data_type, character_maximum_length AS len, is_nullable
       FROM information_schema.columns
      WHERE table_name='news_item' AND column_name='county_fips';`
  );
  if (r.rows.length !== 1) throw new Error("news_item.county_fips missing");
  const { data_type, len, is_nullable } = r.rows[0];
  /* CHAR(5) matches zip_district.county_fips exactly; nullable is load-bearing
     because NULL is how the feed says "statewide" (candidate-news-PRD.md §7). */
  if (data_type !== "character" || Number(len) !== 5) {
    throw new Error(`county_fips is ${data_type}(${len}), expected character(5)`);
  }
  if (is_nullable !== "YES") throw new Error("county_fips must stay nullable — NULL means statewide");
});
await check("0016 county index exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename='news_item' AND indexname='idx_news_item_county';"
  );
  if (r.rows[0].n !== 1) throw new Error("idx_news_item_county missing");
});
/* The scope clause the feed reads with. A county-scoped row that carried no
   race and no metro used to fall into the statewide bucket, which would show
   one county's news to the whole state — the one regression this column can
   cause, and it is invisible in the UI. */
await check("a county-scoped item is not statewide", async () => {
  await db.query(
    `INSERT INTO news_item (item_type, title, url, county_fips, source_id)
     VALUES ('election_news','Broward only','https://example.org/scope-test','12011','src-early-test');`
  );
  const statewide = await db.query(
    `SELECT count(*)::int AS n FROM news_item
      WHERE race_id IS NULL AND metro IS NULL AND county_fips IS NULL
        AND url = 'https://example.org/scope-test';`
  );
  if (statewide.rows[0].n !== 0) throw new Error("county-scoped row leaked into the statewide scope");
  const scoped = await db.query(
    `SELECT count(*)::int AS n FROM news_item
      WHERE county_fips = '12011' AND url = 'https://example.org/scope-test';`
  );
  if (scoped.rows[0].n !== 1) throw new Error("county-scoped row not returned for its own county");
  await db.query("DELETE FROM news_item WHERE url = 'https://example.org/scope-test';");
});
/* --- 0013 (A2). Written after 0014-0017 but numbered before them, so it
   applies first on a fresh database. These four invariants are the whole of
   D1/D2 as the schema can express them. */
await check("0013 candidate.ballot_status defaults to ballot", async () => {
  const r = await db.query(
    `SELECT column_default, is_nullable FROM information_schema.columns
      WHERE table_name='candidate' AND column_name='ballot_status';`
  );
  if (r.rows.length !== 1) throw new Error("candidate.ballot_status missing");
  /* The default is what makes this migration a no-op for existing rows; drop
     it and every demo candidate becomes NOT NULL with no value. */
  if (!/'ballot'/.test(r.rows[0].column_default ?? "")) {
    throw new Error(`default is ${r.rows[0].column_default}, expected 'ballot'`);
  }
  if (r.rows[0].is_nullable !== "NO") throw new Error("ballot_status must be NOT NULL");
});
await check("0013 ballot_status rejects a bogus tier", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status, ballot_status)
       VALUES ('c-tier','Tier Test','NPA','Governor','qualified','maybe');`
    );
  } catch (err) {
    if (!/candidate_ballot_status_check/.test(String(err))) throw err;
    rejected = true;
  }
  if (!rejected) throw new Error("a fourth ballot_status value was accepted");
});
/* D2: the whole point is that a real minor party stops being flattened to
   'other'. LPF and CPF are on the target ballots; MGT ships from the DoE with
   an EMPTY description, so the column must take a code nothing can label. */
await check("0013 party CHECK is gone and real DoE codes store verbatim", async () => {
  await db.query(
    `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status) VALUES
       ('c-lpf','LPF Filer','LPF','Governor','qualified'),
       ('c-mgt','MGT Filer','MGT','Governor','qualified');`
  );
  const r = await db.query(
    "SELECT party FROM candidate WHERE candidate_id IN ('c-lpf','c-mgt') ORDER BY candidate_id;"
  );
  const got = r.rows.map((x) => x.party).join(",");
  if (got !== "LPF,MGT") throw new Error(`stored ${got}, expected LPF,MGT`);
  await db.query("DELETE FROM candidate WHERE candidate_id IN ('c-lpf','c-mgt');");
});
await check("0013 ballot_status index exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename='candidate' AND indexname='idx_candidate_ballot_status';"
  );
  if (r.rows[0].n !== 1) throw new Error("idx_candidate_ballot_status missing");
});
/* --- 0023 (D-B). The DoE's UNO code has to survive ingest: nobody filed
   against the candidate, so F.S. 101.151(7) keeps the contest off the printed
   ballot. intake.py now writes 'unopposed', which the original three-value
   CHECK from 0000 refuses. */
await check("0023 qualifying_status admits unopposed", async () => {
  await db.query(
    `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status)
     VALUES ('c-uno','Uno Filer','DEM','United States Representative','unopposed');`
  );
  const r = await db.query(
    "SELECT qualifying_status FROM candidate WHERE candidate_id = 'c-uno';"
  );
  if (r.rows[0]?.qualifying_status !== "unopposed") {
    throw new Error(`stored ${r.rows[0]?.qualifying_status}, expected unopposed`);
  }
  await db.query("DELETE FROM candidate WHERE candidate_id = 'c-uno';");
});
await check("0023 widened the CHECK without opening it", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status)
       VALUES ('c-bogus-status','Bogus','DEM','Governor','maybe');`
    );
  } catch (err) {
    if (!/candidate_qualifying_status_check/.test(String(err))) throw err;
    rejected = true;
  }
  if (!rejected) throw new Error("a fifth qualifying_status value was accepted");
});
/* The half-application 0023's own RAISE guards against, asserted from the
   outside: the CHECK it replaces was created unnamed by 0000, so dropping the
   wrong name would leave the old three-value constraint standing beside the
   new one. Both would be enforced, every UNO row would still be rejected, and
   the check above would be the only thing to notice. */
await check("0023 leaves exactly one qualifying_status CHECK", async () => {
  const r = await db.query(
    `SELECT conname FROM pg_constraint
      WHERE conrelid='candidate'::regclass AND contype='c'
        AND pg_get_constraintdef(oid) ILIKE '%qualifying_status%';`
  );
  const names = r.rows.map((x) => x.conname);
  if (names.length !== 1) {
    throw new Error(`expected 1 qualifying_status CHECK, found ${names.length}: ${names.join(", ")}`);
  }
});
await check("0017 news_item.relation exists and is nullable", async () => {
  const r = await db.query(
    `SELECT is_nullable FROM information_schema.columns
      WHERE table_name='news_item' AND column_name='relation';`
  );
  if (r.rows.length !== 1) throw new Error("news_item.relation missing");
  /* Nullable is load-bearing and is NOT a third tier: NULL means the row is
     not a candidate match at all (official_link, pipeline_event, unattached
     election_news). The 10 live rows predate the matcher. */
  if (r.rows[0].is_nullable !== "YES") throw new Error("relation must stay nullable");
});
await check("0017 relation admits only named/related (plus NULL)", async () => {
  await db.query(
    `INSERT INTO news_item (item_type, title, url, relation, source_id)
     VALUES ('candidate_news','named row','https://example.org/rel-a','named','src-early-test'),
            ('candidate_news','related row','https://example.org/rel-b','related','src-early-test'),
            ('official_link','no relation','https://example.org/rel-c',NULL,NULL);`
  );
  let rejected = false;
  try {
    /* Carries a valid source_id too, so a rejection here can only be the
       relation CHECK — not 0014's news_item_agent_source_check. */
    await db.query(
      `INSERT INTO news_item (item_type, title, url, relation, source_id)
       VALUES ('candidate_news','third tier','https://example.org/rel-d','maybe','src-early-test');`
    );
  } catch (err) {
    if (!/news_item_relation_check/.test(String(err))) throw err;
    rejected = true;
  }
  if (!rejected) throw new Error("a third relation value was accepted");
  await db.query("DELETE FROM news_item WHERE url LIKE 'https://example.org/rel-%';");
});
/* 0015 UPDATEs a row seeded by 0004, which is already applied live. A wrong
   URL in that WHERE clause would match zero rows and still "pass" every other
   check, so assert the row actually changed rather than that the file ran. */
await check("0015 rewrote the registration link's primary-era copy", async () => {
  const r = await db.query(
    "SELECT summary FROM news_item WHERE url = 'https://registertovoteflorida.gov';"
  );
  if (r.rows.length !== 1) {
    throw new Error(`expected exactly 1 registration link row, got ${r.rows.length}`);
  }
  const summary = r.rows[0].summary ?? "";
  if (/closed-primary|primary ballot/i.test(summary)) {
    throw new Error("registration link still carries primary-era copy — the UPDATE did not match");
  }
  if (!summary.includes("same ballot in the general election")) {
    throw new Error("registration link is missing the general-election wording");
  }
});
/* 0014_news_fairness (N1): "no source, no card" — candidate_news and
   election_news rows must carry a source_id; official_link and
   pipeline_event stay unconstrained (news-fairness.md §1). */
await expectConstraintViolation(
  "0014 rejects a candidate_news row with source_id NULL",
  `INSERT INTO news_item (item_type, title, url)
   VALUES ('candidate_news', 'no source', 'https://example.org/n1-a');`,
  /violates check constraint "news_item_agent_source_check"/
);
await expectConstraintViolation(
  "0014 rejects an election_news row with source_id NULL",
  `INSERT INTO news_item (item_type, title, url)
   VALUES ('election_news', 'no source', 'https://example.org/n1-b');`,
  /violates check constraint "news_item_agent_source_check"/
);
await check("0014 an official_link row with source_id NULL still inserts", async () => {
  await db.query(
    `INSERT INTO news_item (item_type, title, url)
     VALUES ('official_link', 'still fine', 'https://example.org/n1-c');`
  );
  const r = await db.query(
    "SELECT count(*)::int AS n FROM news_item WHERE url = 'https://example.org/n1-c';"
  );
  if (r.rows[0].n !== 1) throw new Error("official_link row with NULL source_id was not inserted");
});
await check("0014 a candidate_news row with a valid source_id inserts", async () => {
  await db.query(
    `INSERT INTO news_item (item_type, title, url, source_id)
     VALUES ('candidate_news', 'has a source', 'https://example.org/n1-d', 'src-early-test');`
  );
  const r = await db.query(
    "SELECT count(*)::int AS n FROM news_item WHERE url = 'https://example.org/n1-d' AND source_id = 'src-early-test';"
  );
  if (r.rows[0].n !== 1) throw new Error("candidate_news row with a valid source_id was not inserted");
});
await check("0014 data fix: the four government-source rows landed", async () => {
  /* The live rows these sources are matched to by id do not exist in this
     fresh-database harness — the migration's UPDATE is a no-op here, by
     design (WHERE source_id IS NULL). This checks the half that DOES run on
     a fresh database: the INSERT ... ON CONFLICT (url_norm) DO NOTHING rows
     the live UPDATE (by id, applied separately on the live database) needs
     already in place. */
  const r = await db.query(
    `SELECT source_id, url_norm FROM source WHERE source_id IN (
       'src_gov_miamidade_early_voting_2026','src_gov_broward_early_voting_2026',
       'src_gov_hillsborough_early_voting_2026','src_gov_flsenate_hb991_2026'
     ) ORDER BY source_id;`
  );
  if (r.rows.length !== 4) {
    throw new Error(`expected 4 data-fix source rows, found ${r.rows.length}`);
  }
});
await check("race.info_last_verified_at column exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='race' AND column_name='info_last_verified_at';"
  );
  if (r.rows[0].n !== 1) throw new Error("race.info_last_verified_at missing");
});
await check("candidate.site_last_verified_at column exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='candidate' AND column_name='site_last_verified_at';"
  );
  if (r.rows[0].n !== 1) throw new Error("candidate.site_last_verified_at missing");
});

/* 0006_admin_ops: the four ops-plane tables exist (invariant 10). Same
   count-based shape as the 0005 probes above — a missing table returns zero
   rows rather than throwing. */
for (const table of ["agent_run", "agent_run_request", "review_item", "admin_action"]) {
  await check(`${table} table exists`, async () => {
    const r = await db.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}';`
    );
    if (r.rows[0].n !== 1) throw new Error(`${table} table missing`);
  });
}
await check("uq_run_request_live partial index exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='public' AND indexname='uq_run_request_live';"
  );
  if (r.rows[0].n !== 1) throw new Error("uq_run_request_live index missing");
});

/* 0007_notifications: the two notification-backbone tables. */
for (const table of ["election_event", "notification_send_log"]) {
  await check(`${table} table exists`, async () => {
    const r = await db.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}';`
    );
    if (r.rows[0].n !== 1) throw new Error(`${table} table missing`);
  });
}

/* Fixture: one published race, one draft race, each with a candidate,
   profile, claim (sourced), and a social handle. */
await db.exec(`
  INSERT INTO race (race_id, office, level, election) VALUES
    ('r-pub',   'Governor',   'state', 'general'),
    ('r-draft', 'US Senate',  'federal', 'general');
  INSERT INTO race_publication (race_id, status, published_at) VALUES
    ('r-pub', 'published', NOW()),
    ('r-draft', 'draft', NULL);
  INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status) VALUES
    ('c-pub',   'Pub Candidate',   'NPA', 'Governor',  'qualified'),
    ('c-draft', 'Draft Candidate', 'NPA', 'US Senate', 'qualified');
  INSERT INTO profile (candidate_id, race_id, audit) VALUES
    ('c-pub', 'r-pub', '{"balance_check_passed": true}'),
    ('c-draft', 'r-draft', '{"balance_check_passed": true}');
  INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
    ('s1', 'https://example.gov/a', 'example.gov/a', 'Example Gov', 'primary_doc', 'N/A');
  INSERT INTO issue (issue_id, race_id, tier, title, display_order) VALUES
    ('i-pub', 'r-pub', 'spine', 'Economy', 1),
    ('i-draft', 'r-draft', 'spine', 'Economy', 1);
  INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, verdict, verification) VALUES
    ('cl-pub', 'c-pub', 'r-pub', 'i-pub', 'Voted for X on date Y.', 'verifiable_fact', false, 'accurate', 'verified'),
    ('cl-draft', 'c-draft', 'r-draft', 'i-draft', 'Voted for Z on date W.', 'verifiable_fact', false, 'accurate', 'verified');
  INSERT INTO claim_source VALUES ('cl-pub', 's1'), ('cl-draft', 's1');
  INSERT INTO candidate_social_account (candidate_id, platform, handle, handle_norm, provenance, status) VALUES
    ('c-pub', 'twitter', '@pub_v', 'pub_v', 'linked_from_official_site', 'verified'),
    ('c-pub', 'facebook', 'pub_u', 'pub_u2', 'doe_filing', 'unverified');
  INSERT INTO voting_info_subscription (email, zip5) VALUES ('voter@example.com', '33101');
  INSERT INTO candidate_contact (candidate_id, campaign_email, source_url) VALUES
    ('c-pub', 'press@pub-candidate.example', 'https://pub-candidate.example/contact');
  INSERT INTO news_item (candidate_id, race_id, item_type, title, url, source_id) VALUES
    ('c-pub', 'r-pub', 'candidate_news', 'Filing shows X.', 'https://example.gov/story-1', 's1');
  -- county-scoped fixture row: statewide rows come from 0008_election_seed
  INSERT INTO election_event (county_fips, event_type, election, event_date, details_url) VALUES
    ('12086', 'early_voting_start', 'general_2026', '2026-10-19', 'https://www.miamidade.gov/elections/');
  INSERT INTO notification_send_log (dedupe_key, recipient_count) VALUES
    ('general_2026:registration_deadline:T-7:email', 1);
`);

/* Everything below runs as anon. */
await db.exec("SET ROLE anon;");

await check("anon sees only the published race", async () => {
  const r = await db.query("SELECT race_id FROM race ORDER BY race_id;");
  const ids = r.rows.map((x) => x.race_id).join(",");
  if (ids !== "r-pub") throw new Error(`saw [${ids}], expected [r-pub]`);
});

await check("anon sees only published-race claims", async () => {
  const r = await db.query("SELECT claim_id FROM claim;");
  const ids = r.rows.map((x) => x.claim_id).join(",");
  if (ids !== "cl-pub") throw new Error(`saw [${ids}], expected [cl-pub]`);
});

await check("anon sees only published-race candidates", async () => {
  const r = await db.query("SELECT candidate_id FROM candidate;");
  const ids = r.rows.map((x) => x.candidate_id).join(",");
  if (ids !== "c-pub") throw new Error(`saw [${ids}], expected [c-pub]`);
});

await check("anon sees only verified social handles", async () => {
  const r = await db.query("SELECT handle, status FROM candidate_social_account;");
  if (r.rows.length !== 1 || r.rows[0].status !== "verified")
    throw new Error(`saw ${JSON.stringify(r.rows)}`);
});

await check("anon sees draft race_publication as absent", async () => {
  const r = await db.query("SELECT race_id FROM race_publication;");
  const ids = r.rows.map((x) => x.race_id).join(",");
  if (ids !== "r-pub") throw new Error(`saw [${ids}]`);
});

await check("anon can SELECT candidate_contact", async () => {
  const r = await db.query("SELECT candidate_id FROM candidate_contact;");
  const ids = r.rows.map((x) => x.candidate_id).join(",");
  if (ids !== "c-pub") throw new Error(`saw [${ids}], expected [c-pub]`);
});

await expectDenied(
  "anon cannot read voting_info_subscription",
  "SELECT * FROM voting_info_subscription;"
);
await expectDenied(
  "anon cannot insert into voting_info_subscription",
  "INSERT INTO voting_info_subscription (email, zip5) VALUES ('x@x.com','00000');"
);
await expectDenied(
  "anon cannot insert news_item",
  "INSERT INTO news_item (item_type, title) VALUES ('official_link','x');"
);
await expectDenied(
  "anon cannot insert candidate_contact",
  "INSERT INTO candidate_contact (candidate_id, source_url) VALUES ('c-pub','https://x.example');"
);
await expectDenied(
  "anon cannot update race_publication",
  "UPDATE race_publication SET status='published' WHERE race_id='r-draft';"
);
await expectDenied("anon cannot update claims", "UPDATE claim SET text='x';");
await expectDenied(
  "anon cannot read election_event",
  "SELECT * FROM election_event;"
);
await expectDenied(
  "anon cannot insert election_event",
  "INSERT INTO election_event (event_type, election, event_date, details_url) VALUES ('election_day','general_2026','2026-11-03','https://x.example');"
);
await expectDenied(
  "anon cannot read notification_send_log",
  "SELECT * FROM notification_send_log;"
);
await expectDenied(
  "anon cannot insert notification_send_log",
  "INSERT INTO notification_send_log (dedupe_key) VALUES ('x');"
);

/* 0006_admin_ops: the ops plane is server-side only. Minimal INSERTs per table
   (a permission error fires before any NOT NULL/CHECK is evaluated, so the
   column list only needs to name the table). */
const opsTables = ["agent_run", "agent_run_request", "review_item", "admin_action"];
const opsInsert = {
  agent_run: "INSERT INTO agent_run (agent) VALUES ('R1');",
  agent_run_request: "INSERT INTO agent_run_request (agent) VALUES ('R1');",
  review_item:
    "INSERT INTO review_item (kind, source, payload) VALUES ('manual_news','operator','{}');",
  admin_action:
    "INSERT INTO admin_action (actor, action, subject_kind, subject_id) VALUES ('x','trigger','review_item', gen_random_uuid());",
};

/* anon: zero access to every ops table — SELECT and INSERT both denied. */
for (const t of opsTables) {
  await expectDenied(`anon cannot SELECT ${t}`, `SELECT * FROM ${t};`);
  await expectDenied(`anon cannot INSERT ${t}`, opsInsert[t]);
}

await db.exec("RESET ROLE;");

/* authenticated: this app has no accounts, and the ops plane is doubly off
   limits to it — SELECT and INSERT denied on all four tables (invariant 11).
   0002 revoked writes from authenticated and never granted it SELECT; the ops
   tables add no grant either, so every verb is denied. */
await db.exec("SET ROLE authenticated;");
for (const t of opsTables) {
  await expectDenied(`authenticated cannot SELECT ${t}`, `SELECT * FROM ${t};`);
  await expectDenied(`authenticated cannot INSERT ${t}`, opsInsert[t]);
}
await db.exec("RESET ROLE;");

/* Service role bypasses RLS for its two legitimate write paths. */
await db.exec("SET ROLE service_role;");
await check("service_role reads voting_info_subscription", async () => {
  const r = await db.query("SELECT count(*)::int AS n FROM voting_info_subscription;");
  if (r.rows[0].n !== 1) throw new Error(`count ${r.rows[0].n}`);
});

/* CN-R10's denominator, at the storage layer: the query the audit runs must
   be able to separate the tiers. A story attached to every candidate in a
   race (all 'related') and one that named a single candidate must not count
   the same, or the published variance flatters our own coverage. */
await check("named and related rows are separable for the audit", async () => {
  await db.query(
    `INSERT INTO news_item (candidate_id, item_type, title, url, relation, source_id) VALUES
       ('c-pub','candidate_news','named','https://example.org/aud-a','named','s1'),
       ('c-pub','candidate_news','race','https://example.org/aud-b','related','s1'),
       ('c-draft','candidate_news','race','https://example.org/aud-b','related','s1');`
  );
  const named = await db.query(
    `SELECT count(*)::int AS n FROM news_item
      WHERE relation='named' AND url LIKE 'https://example.org/aud-%';`
  );
  const all = await db.query(
    `SELECT count(*)::int AS n FROM news_item
      WHERE relation IS NOT NULL AND url LIKE 'https://example.org/aud-%';`
  );
  if (named.rows[0].n !== 1 || all.rows[0].n !== 3) {
    throw new Error(`expected 1 named of 3 matched, got ${named.rows[0].n} of ${all.rows[0].n}`);
  }
  await db.query("DELETE FROM news_item WHERE url LIKE 'https://example.org/aud-%';");
});
/* The same article reaching several candidates is the §6 shape, and 0005's
   index has to keep permitting it — one row per (url, candidate_id). */
await check("one article may attach to several candidates", async () => {
  await db.query(
    `INSERT INTO news_item (candidate_id, item_type, title, url, relation, source_id) VALUES
       ('c-pub','candidate_news','shared','https://example.org/multi','related','s1'),
       ('c-draft','candidate_news','shared','https://example.org/multi','related','s1');`
  );
  const r = await db.query(
    "SELECT count(*)::int AS n FROM news_item WHERE url='https://example.org/multi';"
  );
  if (r.rows[0].n !== 2) throw new Error(`expected 2 rows for one url, got ${r.rows[0].n}`);
  await db.query("DELETE FROM news_item WHERE url='https://example.org/multi';");
});
/* 0005_refresh_agents constraint probes, run as service_role (the role
   R1/R2/R3 write through). The fixture already has a news_item row with
   candidate_id='c-pub' and url='https://example.gov/story-1'; re-inserting
   the same (url, candidate_id) pair must hit uq_news_item_url_candidate. */
await expectConstraintViolation(
  "unique index rejects duplicate (url, candidate_id) news_item",
  /* Carries a valid source_id so the expected failure is the unique index,
     not 0014's news_item_agent_source_check. */
  `INSERT INTO news_item (candidate_id, race_id, item_type, title, url, source_id)
   VALUES ('c-pub', 'r-pub', 'candidate_news', 'Filing shows X (dup).', 'https://example.gov/story-1', 's1');`,
  /duplicate key value violates unique constraint "uq_news_item_url_candidate"/
);
await expectConstraintViolation(
  "item_type CHECK rejects an unknown item_type",
  `INSERT INTO news_item (item_type, title, url)
   VALUES ('candidate_endorsement', 'x', 'https://example.gov/story-2');`,
  /violates check constraint "news_item_item_type_check"/
);

/* 0006_admin_ops constraint probes (service_role — the role the console and
   dispatcher write through). uq_run_request_live enforces one live (pending or
   claimed) request per agent (invariant 12). */
await db.exec("INSERT INTO agent_run_request (agent, status) VALUES ('R1','pending');");
await expectConstraintViolation(
  "uq_run_request_live rejects a 2nd live request for the same agent",
  "INSERT INTO agent_run_request (agent, status) VALUES ('R1','claimed');",
  /duplicate key value violates unique constraint "uq_run_request_live"/
);
await check("uq_run_request_live allows a different agent to be live", async () => {
  await db.exec("INSERT INTO agent_run_request (agent, status) VALUES ('R2','pending');");
});
await check("uq_run_request_live allows a new request once the prior resolves", async () => {
  await db.exec(
    "UPDATE agent_run_request SET status='fulfilled', resolved_at=NOW() WHERE agent='R1' AND status='pending';"
  );
  await db.exec("INSERT INTO agent_run_request (agent, status) VALUES ('R1','pending');");
});

await expectConstraintViolation(
  "agent_run.status CHECK rejects an unknown status",
  "INSERT INTO agent_run (agent, status) VALUES ('R1','bogus');",
  /violates check constraint "agent_run_status_check"/
);
await expectConstraintViolation(
  "agent_run.agent CHECK rejects an unknown agent",
  "INSERT INTO agent_run (agent) VALUES ('R9');",
  /violates check constraint "agent_run_agent_check"/
);
await expectConstraintViolation(
  "agent_run_request.status CHECK rejects an unknown status",
  "INSERT INTO agent_run_request (agent, status) VALUES ('R3','bogus');",
  /violates check constraint "agent_run_request_status_check"/
);
await expectConstraintViolation(
  "review_item.kind CHECK rejects an unknown kind",
  "INSERT INTO review_item (kind, source, payload) VALUES ('bogus','operator','{}');",
  /violates check constraint "review_item_kind_check"/
);
await expectConstraintViolation(
  "review_item.status CHECK rejects an unknown status",
  "INSERT INTO review_item (kind, source, payload, status) VALUES ('manual_news','operator','{}','bogus');",
  /violates check constraint "review_item_status_check"/
);

/* admin_action is append-only even for service_role (invariant 13): INSERT and
   SELECT are granted, UPDATE/DELETE are not — so a tamper attempt is denied at
   the privilege layer (BYPASSRLS does not bypass table grants). */
await db.exec(
  "INSERT INTO admin_action (actor, action, subject_kind, subject_id) VALUES ('op@example.com','approve','review_item', gen_random_uuid());"
);
await expectDenied(
  "service_role cannot UPDATE admin_action (append-only)",
  "UPDATE admin_action SET action='tampered';"
);
await expectDenied(
  "service_role cannot DELETE admin_action (append-only)",
  "DELETE FROM admin_action;"
);

/* 0007_notifications constraint probes. */
await expectConstraintViolation(
  "event_type CHECK rejects an unknown event_type",
  `INSERT INTO election_event (event_type, election, event_date, details_url)
   VALUES ('runoff_deadline', 'general_2026', '2026-12-01', 'https://x.example');`,
  /violates check constraint/
);
await expectConstraintViolation(
  "unique index rejects a duplicate statewide election_event",
  `INSERT INTO election_event (event_type, election, event_date, details_url)
   VALUES ('registration_deadline', 'general_2026', '2026-10-06', 'https://x.example');`,
  /duplicate key value violates unique constraint "uq_election_event_scope"/
);
await check("send_log ON CONFLICT DO NOTHING dedupes", async () => {
  await db.exec(
    `INSERT INTO notification_send_log (dedupe_key, recipient_count)
     VALUES ('general_2026:registration_deadline:T-7:email', 999)
     ON CONFLICT (dedupe_key) DO NOTHING;`
  );
  const r = await db.query(
    "SELECT count(*)::int AS n, min(recipient_count)::int AS c FROM notification_send_log WHERE dedupe_key = 'general_2026:registration_deadline:T-7:email';"
  );
  if (r.rows[0].n !== 1 || r.rows[0].c !== 1)
    throw new Error(`expected 1 untouched row, saw n=${r.rows[0].n} c=${r.rows[0].c}`);
});

await db.exec("RESET ROLE;");

/* 0009_action_log_roles (invariant 15). Object existence first. */
await check("action_log table exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='action_log';"
  );
  if (r.rows[0].n !== 1) throw new Error("action_log table missing");
});
await check("idx_log_guard partial index exists", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname='public' AND indexname='idx_log_guard';"
  );
  if (r.rows[0].n !== 1) throw new Error("idx_log_guard index missing");
});

/* cap_tool_wrapper: the S1 service's role. INSERT-only on the log; scoped
   content-plane writes; no DELETE; no PII; no freshness plane. */
await db.exec("SET ROLE cap_tool_wrapper;");
await check("cap_tool_wrapper can INSERT action_log", async () => {
  await db.exec(
    `INSERT INTO action_log (agent_id, tool_called, race_id, candidate_id, status)
     VALUES ('profiler', 'db_read', 'r-pub', 'c-pub', 'success');`
  );
});
await expectDenied(
  "cap_tool_wrapper cannot SELECT action_log (write-only)",
  "SELECT * FROM action_log;"
);
await expectDenied(
  "cap_tool_wrapper cannot UPDATE action_log (append-only)",
  "UPDATE action_log SET status='fail';"
);
await expectDenied(
  "cap_tool_wrapper cannot DELETE action_log (append-only)",
  "DELETE FROM action_log;"
);
await expectConstraintViolation(
  "action_log agent_id CHECK rejects an unknown agent",
  "INSERT INTO action_log (agent_id, tool_called, status) VALUES ('R1','db_read','success');",
  /violates check constraint "action_log_agent_id_check"/
);
await expectConstraintViolation(
  "action_log status CHECK rejects an unknown status",
  "INSERT INTO action_log (agent_id, tool_called, status) VALUES ('profiler','db_read','partial');",
  /violates check constraint "action_log_status_check"/
);
await expectConstraintViolation(
  "action_log bucket CHECK rejects an unknown bucket",
  "INSERT INTO action_log (agent_id, tool_called, status, bucket_written) VALUES ('profiler','claim_write','success','opinion');",
  /violates check constraint "action_log_bucket_written_check"/
);
await check("cap_tool_wrapper can INSERT a source row", async () => {
  await db.exec(
    `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
     VALUES ('s-capw', 'https://example.gov/b', 'example.gov/b', 'Example Gov', 'primary_doc', 'N/A');`
  );
});
await check("cap_tool_wrapper can UPDATE candidate freshness", async () => {
  await db.exec(
    "UPDATE candidate SET site_last_verified_at = NOW() WHERE candidate_id='c-pub';"
  );
});
await check("cap_tool_wrapper sees unpublished claims too (T8 db_read)", async () => {
  const r = await db.query("SELECT count(*)::int AS n FROM claim;");
  if (r.rows[0].n !== 2) throw new Error(`saw ${r.rows[0].n} claims, expected 2`);
});
await expectDenied(
  "cap_tool_wrapper cannot DELETE claims",
  "DELETE FROM claim WHERE claim_id='cl-draft';"
);
await expectDenied(
  "cap_tool_wrapper cannot UPDATE race_publication",
  "UPDATE race_publication SET status='published' WHERE race_id='r-draft';"
);
await expectDenied(
  "cap_tool_wrapper cannot read voting_info_subscription (PII)",
  "SELECT * FROM voting_info_subscription;"
);
await expectDenied(
  "cap_tool_wrapper cannot INSERT news_item (freshness plane)",
  "INSERT INTO news_item (item_type, title) VALUES ('official_link','x');"
);
await db.exec("RESET ROLE;");

/* cap_readonly: report/CI queries — reads everything non-PII, writes nothing. */
await db.exec("SET ROLE cap_readonly;");
await check("cap_readonly can SELECT action_log", async () => {
  const r = await db.query("SELECT count(*)::int AS n FROM action_log;");
  if (r.rows[0].n !== 1) throw new Error(`saw ${r.rows[0].n} log rows, expected 1`);
});
await check("cap_readonly sees ALL claims (traceability needs unpublished)", async () => {
  const r = await db.query("SELECT count(*)::int AS n FROM claim;");
  if (r.rows[0].n !== 2) throw new Error(`saw ${r.rows[0].n} claims, expected 2`);
});
await expectDenied(
  "cap_readonly cannot INSERT action_log",
  "INSERT INTO action_log (agent_id, tool_called, status) VALUES ('profiler','db_read','success');"
);
await expectDenied(
  "cap_readonly cannot UPDATE claims",
  "UPDATE claim SET text='x';"
);
await expectDenied(
  "cap_readonly cannot read voting_info_subscription (PII)",
  "SELECT * FROM voting_info_subscription;"
);
await db.exec("RESET ROLE;");

/* anon: zero access to the log. */
await db.exec("SET ROLE anon;");
await expectDenied("anon cannot SELECT action_log", "SELECT * FROM action_log;");
await expectDenied(
  "anon cannot INSERT action_log",
  "INSERT INTO action_log (agent_id, tool_called, status) VALUES ('profiler','db_read','success');"
);
await db.exec("RESET ROLE;");

/* the log is append-only even for service_role (same posture as admin_action). */
await db.exec("SET ROLE service_role;");
await expectDenied(
  "service_role cannot UPDATE action_log (append-only)",
  "UPDATE action_log SET status='fail';"
);
await expectDenied(
  "service_role cannot DELETE action_log (append-only)",
  "DELETE FROM action_log;"
);
await db.exec("RESET ROLE;");

/* ---------------------------------------------------------------- *
 * 16. 0010/0011 ballot measures (TASK-061).
 *
 * Same posture as races: anon sees a measure only through a published
 * measure_publication row, and can write nothing. Plus the symmetry rule,
 * which is the part that is specific to measures — an amendment has no
 * campaign obliged to balance it, so the database refuses to publish a
 * lopsided one rather than trusting a reviewer to notice.
 * ---------------------------------------------------------------- */

await db.exec(`
  INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
    ('s-m', 'https://example.gov/m', 'example.gov/m', 'Example Gov', 'primary_doc', 'N/A');

  INSERT INTO ballot_measure
    (measure_id, election, number, official_title, ballot_summary, full_text_url,
     placed_by, threshold_pct, jurisdiction, display_order) VALUES
    ('m-pub',   'general_2026', '1', 'Published Measure', 'Summary.', 'https://example.gov/1', 'legislature', 60, 'FL', 1),
    ('m-draft', 'general_2026', '2', 'Draft Measure',     'Summary.', 'https://example.gov/2', 'legislature', 60, 'FL', 2),
    ('m-skew',  'general_2026', '3', 'Lopsided Measure',  'Summary.', 'https://example.gov/3', 'legislature', 60, 'FL', 3);

  INSERT INTO measure_argument (argument_id, measure_id, side, text, source_id) VALUES
    ('a1', 'm-pub',   'support', 'For.',     's-m'),
    ('a2', 'm-pub',   'oppose',  'Against.', 's-m'),
    ('a3', 'm-draft', 'support', 'For.',     's-m'),
    ('a4', 'm-draft', 'oppose',  'Against.', 's-m'),
    -- m-skew: three for, none against.
    ('a5', 'm-skew',  'support', 'For A.',   's-m'),
    ('a6', 'm-skew',  'support', 'For B.',   's-m'),
    ('a7', 'm-skew',  'support', 'For C.',   's-m');

  INSERT INTO measure_publication (measure_id, status) VALUES
    ('m-pub', 'published'),
    ('m-draft', 'draft');
`);

await check("anon sees only published measures", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT measure_id FROM ballot_measure ORDER BY measure_id;");
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.measure_id);
  if (ids.length !== 1 || ids[0] !== "m-pub") {
    throw new Error(`expected only m-pub, got [${ids.join(", ")}]`);
  }
});

await check("anon sees arguments only for published measures", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT argument_id FROM measure_argument ORDER BY argument_id;");
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.argument_id);
  if (ids.length !== 2 || ids[0] !== "a1" || ids[1] !== "a2") {
    throw new Error(`expected a1,a2 only, got [${ids.join(", ")}]`);
  }
});

await db.exec("SET ROLE anon;");
await expectDenied(
  "anon cannot INSERT a ballot_measure",
  `INSERT INTO ballot_measure (measure_id, election, number, official_title, ballot_summary, full_text_url, placed_by, threshold_pct)
   VALUES ('m-x','general_2026','9','X','S','https://e.gov/x','legislature',60);`
);
await expectDenied(
  "anon cannot INSERT a measure_argument",
  `INSERT INTO measure_argument (argument_id, measure_id, side, text, source_id)
   VALUES ('a-x','m-pub','support','X','s-m');`
);
await expectDenied(
  "anon cannot publish a measure",
  "UPDATE measure_publication SET status='published';"
);
await db.exec("RESET ROLE;");

/* The symmetry rule. These run as service_role: the trigger must hold for
   the role that actually writes, not only for anon. */
await db.exec("SET ROLE service_role;");
await expectConstraintViolation(
  "a measure with no opposing argument cannot be published",
  "INSERT INTO measure_publication (measure_id, status) VALUES ('m-skew','published');",
  /must both exist and differ by at most one/
);
/* The INSERT above was rejected, so m-skew has no publication row yet; give
   it a draft one so the UPDATE path is actually exercised rather than
   matching zero rows. */
await db.exec("INSERT INTO measure_publication (measure_id, status) VALUES ('m-skew','draft');");
await expectConstraintViolation(
  "a skewed measure cannot be published by UPDATE either",
  "UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';",
  /must both exist and differ by at most one/
);
await check("a balanced measure still publishes", async () => {
  await db.exec(
    `INSERT INTO measure_argument (argument_id, measure_id, side, text, source_id)
     VALUES ('a8','m-skew','oppose','Against A.','s-m'), ('a9','m-skew','oppose','Against B.','s-m');`
  );
  await db.exec("UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';");
  const res = await db.query("SELECT status FROM measure_publication WHERE measure_id='m-skew';");
  if (res.rows[0].status !== "published") throw new Error("expected m-skew to publish once balanced");
});

/* The hole the publication-side trigger alone leaves: a measure published
   while balanced, then skewed by removing the other side. */
await expectConstraintViolation(
  "a published measure cannot be skewed by deleting an argument",
  "DELETE FROM measure_argument WHERE argument_id='a2';",
  /is published: support and oppose arguments/
);
await expectConstraintViolation(
  "a published measure cannot be skewed by flipping an argument's side",
  "UPDATE measure_argument SET side='support' WHERE argument_id='a2';",
  /is published: support and oppose arguments/
);
await check("an unpublished measure's arguments can still be edited freely", async () => {
  /* m-draft is not published, so the rule does not apply to it. */
  await db.exec("DELETE FROM measure_argument WHERE argument_id='a4';");
});
await expectConstraintViolation(
  "threshold_pct must be a real percentage",
  `INSERT INTO ballot_measure (measure_id, election, number, official_title, ballot_summary, full_text_url, placed_by, threshold_pct)
   VALUES ('m-bad','general_2026','9','X','S','https://e.gov/x','legislature',0);`,
  /threshold_pct/
);
await expectConstraintViolation(
  "side must be support or oppose",
  `INSERT INTO measure_argument (argument_id, measure_id, side, text, source_id)
   VALUES ('a-bad','m-pub','maybe','X','s-m');`,
  /side/
);
await db.exec("RESET ROLE;");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll migration + RLS checks passed.");
