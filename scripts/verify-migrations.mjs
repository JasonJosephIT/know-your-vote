/* Applies every migration in supabase/migrations/ to an embedded Postgres
   (PGlite) and asserts the RLS invariants the product depends on:

     1. All migrations apply cleanly, in order.
     2. anon cannot read voting_info_subscription at all.
     3. anon sees only listed and published races (draft/in_review are
        invisible).
     4. anon sees claims/profiles/issues/positions only for published races
        (a listed race exposes none of them).
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
    14c. 0043_county_early_voting_2026: both early-voting bounds for the
        four covered counties (Oct 19, Nov 1), no rule, verified_by NULL;
        the scope index rejects a second row for the same county.
    14b. 0021_ballot_return_deadline: event_type admits
        ballot_return_deadline; the rule CHECK rejects unknown tokens; a
        deadline cannot be stored without a rule and a non-deadline cannot
        carry one; the seeded return deadlines land on election day with
        rule 'received_by'.
    15. 0009_action_log_roles invariants (CAP_Runtime_PRD_v1 S1-01):
        action_log exists with its guard partial index; cap_tool_wrapper
        is INSERT-only on the log (no SELECT/UPDATE/DELETE) and can
        write content tables but not DELETE, not touch PII, and not
        write the freshness plane; cap_readonly sees the log and ALL
        claims (published or not — traceability needs both) but writes
        nothing; anon has zero log access; the log is append-only even
        for service_role; the agent_id/status/bucket CHECKs hold.
    18. 0020_publication_door_only: anon/authenticated hold no EXECUTE on
        set_race_publication even with Supabase's default privileges in
        force (0018 granted it to them on the live project and this file
        said otherwise); service_role holds no direct UPDATE on
        race_publication, not even on `note`; and the SECURITY DEFINER
        function still flips without it.
    17. 0018_publication_audit: set_race_publication flips race_publication
        and writes its admin_action row in one statement; published_at is
        stamped entering publication and survives leaving it; actor, reason
        and a known status are required; a missing race is refused; the
        subject is exactly one of subject_id / subject_ref; and only
        service_role may execute it (not anon, not cap_tool_wrapper —
        publication never moves through a tool call, 0009).
    16. 0014_news_fairness invariants (news-fairness.md N1): a candidate_news
        or election_news row with source_id NULL is rejected; an
        official_link row with source_id NULL still inserts; a candidate_news
        row with a valid source_id inserts.
    17b. 0028_source_lean_unrated: source.lean_tag admits 'unrated', still
        admits 'N/A' beside it, still rejects an unknown value, stays NOT NULL,
        and carries exactly one lean_tag CHECK (the half-application 0028's
        RAISE guard exists to prevent).
    17c. 0029_news_item_image: news_item.image_url exists and stays NULLABLE
        (a story with no photo must still be storable), stores a feed URL back
        verbatim, and carries NO CHECK — https validation lives in the parser,
        which drops a bad image and keeps the article.
    17. 0023_candidate_unopposed (decision D-B): candidate.qualifying_status
        admits 'unopposed' and still rejects an unknown value, and exactly one
        CHECK on that column survives — the widening cannot half-apply.
    17. 0024/0025 block_district invariants (address lookup): the table and its
        range index exist; the CHECK rejects an inverted range; a GEOID inside a
        seeded range resolves; anon can SELECT it (it is a public district map)
        but cannot INSERT.
    19. 0033_listed_publication (the roster tier): anon reads a listed race,
        its race_publication status, and the ballot-tier candidates named in
        its candidate_ids -- even with NO profile row -- plus their verified
        handles; a filer outside candidate_ids (write-in, D1) stays hidden; a
        listed race's profile, issue, position, claim and claim_source rows
        stay invisible (the safety argument: those policies never mention
        'listed'); set_race_publication accepts 'listed', logs 'list' /
        'unlist' ('unpublish' for published -> listed), never stamps
        published_at on a listing, and stays service_role-only; each
        publication table keeps exactly one status CHECK; a listed measure
        with zero arguments is accepted and anon sees its ballot_measure and
        measure_publication rows but none of its arguments; the 32 county
        races 0033 seeds at draft stay invisible.
    20. 0048_agent_run_r5: after every file has applied in filename order,
        agent_run accepts R5 and every agent the console lists
        (src/lib/admin/monitor.ts AGENTS), still refuses an unknown one, and
        carries exactly one CHECK on agent. On fresh databases holding only
        an agent_run table, the file's guard rebuilds the exact pre-state, is
        a no-op on its own post-state, and raises on any other agent list
        rather than drop a value.
    21. 0049_roster_completeness (roster-completeness spec §3.2, §6): the five
        candidate columns; all 49 seeded county ballot candidates sourced; the
        five CHECKs; the trigger refuses B4's exact UPDATE on a sourced row as
        cap_tool_wrapper (which holds no EXECUTE) and lets through an unchanged
        value, a change with a new source and date, and the running-mate
        takedown; anon reads the new columns only on a listed race; the file
        re-applies with its DoE-absent notice; it sorts before any
        *_content_freeze.sql; its whole-ballot assertions pass on a
        replica of the 2026-10-08 ballot; and its site UPDATE writes a
        listed-race find but never a published-race one (D11).
    22. 0050_content_freeze: one content_freeze row; the guard is SECURITY
        DEFINER, owned by postgres, with an empty search_path, and nobody but
        the owner and service_role may EXECUTE it; its 21 triggers exist.
        Inside the window a frozen write is refused with the freeze message
        (for cap_tool_wrapper too, not a permission error) and goes through
        under kyv.freeze_correction with a NOTICE; a takedown to listed,
        the freshness stamps, key_dates, an UPDATE that changes nothing and
        a new or uncited source row go through without it; a DELETE or
        INSERT of a publication row, candidate, race or cited source, and a
        whitespace-only setting, are refused. starts_at is inclusive and
        ends_at exclusive. Outside the window everything goes through. A
        re-run of 0050 keeps a moved window and revokes EXECUTE by name
        again.


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
/* 0050's content freeze refuses writes to ballot tables from 2026-10-18 04:00
   UTC to 2026-11-04 05:00 UTC unless this setting is non-empty. Set for the
   whole session, before the replay, so this check keeps passing inside the
   window; the 0050 section at the end turns it off per transaction to test
   the refusals (docs/general-election/corrections/README.md). */
await db.exec("SET kyv.freeze_correction = 'pglite replay';");
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
  /* Supabase's default privileges, modelled deliberately. Without these the
     harness is more permissive than production is: every migration's explicit
     REVOKE looks redundant, and an object that forgets one still passes here
     while shipping open. That is exactly how 0018 shipped set_race_publication
     with EXECUTE granted to anon — a SECURITY DEFINER function owned by
     postgres — and this file said it was denied. 0020 has the post-mortem. */
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
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
/* --- 0028. 'unrated' is the recorded absence of a rating, and it is NOT the
   same fact as 'N/A' ("a lean does not apply"). Most of a local-news corpus has
   no published rating because AllSides / Ad Fontes / MBFC do not rate local
   outlets, and forcing those into 'N/A' would tell a voter a lean does not
   apply to a television newsroom. Same shape as 0023: a value added to a CHECK
   that 0000 created unnamed. */
await check("0028 lean_tag admits unrated", async () => {
  await db.query(
    `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
     VALUES ('s-unrated','https://wsvn.com/x','wsvn.com/x','WSVN 7News','factual_reporting','unrated');`
  );
  const r = await db.query("SELECT lean_tag FROM source WHERE source_id = 's-unrated';");
  if (r.rows[0]?.lean_tag !== "unrated") {
    throw new Error(`stored ${r.rows[0]?.lean_tag}, expected unrated`);
  }
  await db.query("DELETE FROM source WHERE source_id = 's-unrated';");
});
await check("0028 kept 'N/A' working alongside it", async () => {
  await db.query(
    `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
     VALUES ('s-na-still','https://example.gov/z','example.gov/z','Example Gov','primary_doc','N/A');`
  );
  await db.query("DELETE FROM source WHERE source_id = 's-na-still';");
});
await check("0028 widened the CHECK without opening it", async () => {
  let rejected = false;
  try {
    await db.query(
      `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
       VALUES ('s-bogus-lean','https://example.com/q','example.com/q','Bogus','factual_reporting','centrist');`
    );
  } catch (err) {
    if (!/source_lean_tag_check/.test(String(err))) throw err;
    rejected = true;
  }
  if (!rejected) throw new Error("an eighth lean_tag value was accepted");
});
/* lean_tag is NOT NULL (0000) and 0028 must not have relaxed that — null is
   what `usableOutlets()` reads as "no human has decided", and a null in the DB
   would be an unlabelled card. */
await check("0028 left lean_tag NOT NULL", async () => {
  const r = await db.query(
    `SELECT is_nullable FROM information_schema.columns
      WHERE table_name='source' AND column_name='lean_tag';`
  );
  if (r.rows[0]?.is_nullable !== "NO") throw new Error("lean_tag must stay NOT NULL");
});
/* The half-application 0028's own RAISE guards against, asserted from outside:
   0000 created this CHECK unnamed, so dropping the wrong name would leave the
   old six-value constraint standing beside the new one. Both would be enforced,
   every 'unrated' row would still be rejected, and the migration would have
   reported success. */
await check("0028 leaves exactly one lean_tag CHECK", async () => {
  const r = await db.query(
    `SELECT conname FROM pg_constraint
      WHERE conrelid='source'::regclass AND contype='c'
        AND pg_get_constraintdef(oid) ILIKE '%lean_tag%';`
  );
  const names = r.rows.map((x) => x.conname);
  if (names.length !== 1) {
    throw new Error(`expected 1 lean_tag CHECK, found ${names.length}: ${names.join(", ")}`);
  }
});
/* --- 0029. news_item.image_url — the story card's hero image
   (news-fairness.md §1 as amended 2026-09-19). Additive and nullable, and both
   halves of that are load-bearing in a way nothing else asserts. */
await check("0029 news_item.image_url exists and is nullable", async () => {
  const r = await db.query(
    `SELECT is_nullable FROM information_schema.columns
      WHERE table_name='news_item' AND column_name='image_url';`
  );
  if (r.rows.length !== 1) throw new Error("news_item.image_url missing");
  /* NULL is a REAL STATE, not a backlog: many feeds carry no image at all and
     both Tribune dailies reach us by sitemap, which carries none. The card has
     a deliberate text-only variant for it, so a NOT NULL here would mean a
     story without a photo could not be stored — losing the story over its
     illustration. */
  if (r.rows[0].is_nullable !== "YES") throw new Error("image_url must stay nullable");
});
await check("0029 stores a feed image and accepts a row with none", async () => {
  await db.query(
    `INSERT INTO news_item (item_type, title, url, relation, source_id, image_url)
     VALUES ('candidate_news','with image','https://example.org/img-a','named','src-early-test','https://cdn.example.org/photo.jpg'),
            ('candidate_news','without image','https://example.org/img-b','named','src-early-test',NULL);`
  );
  const r = await db.query(
    "SELECT url, image_url FROM news_item WHERE url LIKE 'https://example.org/img-%' ORDER BY url;"
  );
  if (r.rows[0]?.image_url !== "https://cdn.example.org/photo.jpg") {
    throw new Error(`stored ${r.rows[0]?.image_url}, expected the feed URL back verbatim`);
  }
  if (r.rows[1]?.image_url !== null) throw new Error("a story with no image must store NULL");
  await db.query("DELETE FROM news_item WHERE url LIKE 'https://example.org/img-%';");
});
/* NO CHECK ON image_url, on purpose — asserted so nobody adds one thinking it
   is a missing safeguard. https-only is enforced in the parser
   (src/lib/news-sweep.ts `feedImage`, and again in the card via safeHttpUrl),
   which DROPS a bad image URL and keeps the article. A CHECK would instead
   reject the whole row at write time, losing a real story over a cosmetic
   defect in someone else's feed. */
await check("0029 puts no CHECK on image_url — the parser drops, the row survives", async () => {
  const r = await db.query(
    `SELECT conname FROM pg_constraint
      WHERE conrelid='news_item'::regclass AND contype='c'
        AND pg_get_constraintdef(oid) ILIKE '%image_url%';`
  );
  if (r.rows.length !== 0) {
    throw new Error(
      `image_url carries ${r.rows.length} CHECK(s) (${r.rows.map((x) => x.conname).join(", ")}) — `
        + "https validation belongs in the parser, which drops the image and keeps the story"
    );
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
   profile, claim (sourced), and a social handle. Plus one LISTED race (0033):
   c-listed is named in its candidate_ids with no profile at all (the roster
   case, which is every live race today), and c-listed-2 is named too but also
   carries a profile, issue, position, claim and claim_source -- the brief rows
   the listed tier must NOT expose. c-listed-wri filed for the same office but
   is not in candidate_ids (a write-in, D1), so nothing may surface it. */
await db.exec(`
  INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES
    ('r-pub',    'Governor',   'state',   'general', '{}'),
    ('r-draft',  'US Senate',  'federal', 'general', '{}'),
    ('r-listed', 'Attorney General', 'state', 'general', ARRAY['c-listed','c-listed-2']);
  INSERT INTO race_publication (race_id, status, published_at) VALUES
    ('r-pub', 'published', NOW()),
    ('r-draft', 'draft', NULL),
    ('r-listed', 'listed', NULL);
  INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status) VALUES
    ('c-pub',   'Pub Candidate',   'NPA', 'Governor',  'qualified'),
    ('c-draft', 'Draft Candidate', 'NPA', 'US Senate', 'qualified'),
    ('c-listed',     'Listed Candidate',     'DEM', 'Attorney General', 'qualified'),
    ('c-listed-2',   'Listed Candidate Two', 'REP', 'Attorney General', 'qualified'),
    ('c-listed-wri', 'Listed Write-In',      'WRI', 'Attorney General', 'qualified');
  INSERT INTO profile (candidate_id, race_id, audit) VALUES
    ('c-pub', 'r-pub', '{"balance_check_passed": true}'),
    ('c-draft', 'r-draft', '{"balance_check_passed": true}'),
    ('c-listed-2', 'r-listed', '{"balance_check_passed": true}');
  INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
    ('s1', 'https://example.gov/a', 'example.gov/a', 'Example Gov', 'primary_doc', 'N/A');
  INSERT INTO issue (issue_id, race_id, tier, title, display_order) VALUES
    ('i-pub', 'r-pub', 'spine', 'Economy', 1),
    ('i-draft', 'r-draft', 'spine', 'Economy', 1),
    ('i-listed', 'r-listed', 'spine', 'Economy', 1);
  INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, verdict, verification) VALUES
    ('cl-pub', 'c-pub', 'r-pub', 'i-pub', 'Voted for X on date Y.', 'verifiable_fact', false, 'accurate', 'verified'),
    ('cl-draft', 'c-draft', 'r-draft', 'i-draft', 'Voted for Z on date W.', 'verifiable_fact', false, 'accurate', 'verified'),
    ('cl-listed-2', 'c-listed-2', 'r-listed', 'i-listed', 'Voted for Q on date R.', 'verifiable_fact', false, 'accurate', 'verified');
  INSERT INTO claim_source VALUES ('cl-pub', 's1'), ('cl-draft', 's1'), ('cl-listed-2', 's1');
  INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, coverage) VALUES
    ('p-listed-2', 'c-listed-2', 'r-listed', 'i-listed', 'Supports Q.', ARRAY['cl-listed-2'], 'stated');
  INSERT INTO candidate_social_account (candidate_id, platform, handle, handle_norm, provenance, status) VALUES
    ('c-pub', 'twitter', '@pub_v', 'pub_v', 'linked_from_official_site', 'verified'),
    ('c-pub', 'facebook', 'pub_u', 'pub_u2', 'doe_filing', 'unverified'),
    ('c-listed', 'twitter', '@listed_v', 'listed_v', 'linked_from_official_site', 'verified'),
    ('c-listed', 'facebook', 'listed_u', 'listed_u', 'doe_filing', 'unverified'),
    ('c-listed-wri', 'twitter', '@wri_v', 'wri_v', 'linked_from_official_site', 'verified');
  INSERT INTO voting_info_subscription (email, zip5) VALUES ('voter@example.com', '33101');
  INSERT INTO candidate_contact (candidate_id, campaign_email, source_url) VALUES
    ('c-pub', 'press@pub-candidate.example', 'https://pub-candidate.example/contact');
  INSERT INTO news_item (candidate_id, race_id, item_type, title, url, source_id) VALUES
    ('c-pub', 'r-pub', 'candidate_news', 'Filing shows X.', 'https://example.gov/story-1', 's1');
  -- county-scoped fixture row: statewide rows come from 0008_election_seed,
  -- the covered counties' rows from 0043, so this uses a county 0043 leaves
  -- alone (Palm Beach)
  INSERT INTO election_event (county_fips, event_type, election, event_date, details_url) VALUES
    ('12099', 'early_voting_start', 'general_2026', '2026-10-19', 'https://www.votepalmbeach.gov/');
  INSERT INTO notification_send_log (dedupe_key, recipient_count) VALUES
    ('general_2026:registration_deadline:T-7:email', 1);
`);

/* Everything below runs as anon. */
await db.exec("SET ROLE anon;");

/* 0033 seeded a 'draft' race_publication row for every general race the
   migrations load (the 32 county races), so "only listed and published" here
   also proves those drafts stayed invisible. */
await check("anon sees the published and the listed race, never a draft", async () => {
  const r = await db.query("SELECT race_id FROM race ORDER BY race_id;");
  const ids = r.rows.map((x) => x.race_id).join(",");
  if (ids !== "r-listed,r-pub") throw new Error(`saw [${ids}], expected [r-listed,r-pub]`);
});

await check("anon sees only published-race claims", async () => {
  const r = await db.query("SELECT claim_id FROM claim;");
  const ids = r.rows.map((x) => x.claim_id).join(",");
  if (ids !== "cl-pub") throw new Error(`saw [${ids}], expected [cl-pub]`);
});

/* c-listed has no profile row: it is visible only through r-listed's
   candidate_ids, which is the path that makes the roster readable before any
   brief exists. c-draft (draft race) and c-listed-wri (same office, not in
   candidate_ids -- a write-in under D1) must both stay hidden. */
await check("anon sees published-race and listed-race (candidate_ids) candidates only", async () => {
  const r = await db.query("SELECT candidate_id FROM candidate ORDER BY candidate_id;");
  const ids = r.rows.map((x) => x.candidate_id).join(",");
  if (ids !== "c-listed,c-listed-2,c-pub") {
    throw new Error(`saw [${ids}], expected [c-listed,c-listed-2,c-pub]`);
  }
});

await check("anon sees only verified social handles, for visible candidates only", async () => {
  const r = await db.query(
    "SELECT candidate_id, handle, status FROM candidate_social_account ORDER BY handle;"
  );
  const got = r.rows.map((x) => `${x.candidate_id}:${x.handle}:${x.status}`).join(",");
  if (got !== "c-listed:@listed_v:verified,c-pub:@pub_v:verified") throw new Error(`saw [${got}]`);
});

await check("anon sees listed and published race_publication rows with their status, never draft", async () => {
  const r = await db.query("SELECT race_id, status FROM race_publication ORDER BY race_id;");
  const got = r.rows.map((x) => `${x.race_id}:${x.status}`).join(",");
  if (got !== "r-listed:listed,r-pub:published") throw new Error(`saw [${got}]`);
});

/* 0033's safety argument, asserted from the outside: r-listed carries a
   complete brief for c-listed-2 (profile, issue, position, claim,
   claim_source), and none of it may be readable, because those six policies
   still say status = 'published' and never mention 'listed'. */
await check("anon reads no brief rows for a listed race (profile/issue/position/claim/claim_source)", async () => {
  const r = await db.query(`
    SELECT (SELECT count(*)::int FROM profile      WHERE race_id = 'r-listed')    AS profiles,
           (SELECT count(*)::int FROM issue        WHERE race_id = 'r-listed')    AS issues,
           (SELECT count(*)::int FROM position     WHERE race_id = 'r-listed')    AS positions,
           (SELECT count(*)::int FROM claim        WHERE race_id = 'r-listed')    AS claims,
           (SELECT count(*)::int FROM claim_source WHERE claim_id = 'cl-listed-2') AS claim_sources;`);
  const g = r.rows[0];
  const leaked = Object.entries(g).filter(([, v]) => v !== 0);
  if (leaked.length) throw new Error(`listed race leaked ${JSON.stringify(g)}`);
});
await check("anon still reads the published race's brief rows", async () => {
  const r = await db.query(`
    SELECT (SELECT count(*)::int FROM profile WHERE race_id = 'r-pub') AS profiles,
           (SELECT count(*)::int FROM issue   WHERE race_id = 'r-pub') AS issues;`);
  if (r.rows[0].profiles !== 1 || r.rows[0].issues !== 1) {
    throw new Error(`saw ${JSON.stringify(r.rows[0])}, expected 1 profile and 1 issue`);
  }
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

/* 0018: the publication door is service-role only. anon holds no EXECUTE, so
   the flip is unreachable even though the function is SECURITY DEFINER — the
   definer's rights apply only once the call is allowed to happen at all. */
await expectDenied(
  "anon cannot EXECUTE set_race_publication",
  "SELECT set_race_publication('r-draft','published','x@x.com','because');"
);

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
await check("0047 review_item.kind accepts candidate_lead", async () => {
  await db.exec("INSERT INTO review_item (kind, source, payload) VALUES ('candidate_lead','agent:R5','{}');");
  await db.exec("DELETE FROM review_item WHERE kind = 'candidate_lead';");
});
/* The unique index backstops two R5 runs queuing the same lead at once: the
   dedupe-key read in `candidate-leads.ts queue` cannot see a row another run
   inserts a moment later, so the database refuses the second one. */
await db.exec(
  `INSERT INTO review_item (kind, source, payload)
   VALUES ('candidate_lead','agent:R5','{"dedupe_key":"probe lead|other_county|12099"}');`
);
await expectConstraintViolation(
  "0047 unique index rejects a second candidate_lead with the same dedupe_key",
  `INSERT INTO review_item (kind, source, payload, status)
   VALUES ('candidate_lead','agent:R5','{"dedupe_key":"probe lead|other_county|12099"}','rejected');`,
  /duplicate key value violates unique constraint "uq_review_item_candidate_lead_key"/
);
await check("0047 unique index allows a different dedupe_key and other kinds sharing one", async () => {
  await db.exec(
    `INSERT INTO review_item (kind, source, payload)
     VALUES ('candidate_lead','agent:R5','{"dedupe_key":"another lead|other_county|12099"}'),
            ('manual_news','operator','{"dedupe_key":"probe lead|other_county|12099"}');`
  );
});
await db.exec("DELETE FROM review_item WHERE payload->>'dedupe_key' IN ('probe lead|other_county|12099','another lead|other_county|12099');");
/* 0048: the wrapper records R5's runs (scripts/agent-run-log.ts), and the
   console lists every agent in monitor.ts's AGENTS. Each must be insertable
   once every file has applied, so a later file that rebuilds the CHECK and
   drops a value fails here. */
const consoleAgents = [
  ...((await readFile(path.join(root, "src", "lib", "admin", "monitor.ts"), "utf8"))
    .match(/export const AGENTS: readonly AgentName\[\] = \[([\s\S]*?)\];/)?.[1]
    .matchAll(/"([^"]+)"/g) ?? []),
].map((m) => m[1]);
await check("0048 agent_run accepts R5 and every agent the console lists", async () => {
  if (consoleAgents.length < 5) throw new Error(`could not read AGENTS from monitor.ts (got ${consoleAgents.join(", ")})`);
  for (const agent of new Set([...consoleAgents, "R5"])) {
    await db.exec(`INSERT INTO agent_run (agent, summary) VALUES ('${agent}', 'probe-0048');`);
  }
  await db.exec("DELETE FROM agent_run WHERE summary = 'probe-0048';");
});
await check("0048 leaves exactly one CHECK on agent_run.agent", async () => {
  const r = await db.query(
    "SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid = 'agent_run'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ~ '\\magent\\M';"
  );
  if (r.rows[0].n !== 1) throw new Error(`${r.rows[0].n} CHECK constraints mention agent`);
});
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
  /* Carries a rule deliberately: without one, 0021's rule-required CHECK
     fires during the tuple insert and this probe would pass for the wrong
     reason, never reaching the unique index it exists to test. */
  "unique index rejects a duplicate statewide election_event",
  `INSERT INTO election_event (event_type, election, event_date, rule, details_url)
   VALUES ('registration_deadline', 'general_2026', '2026-10-06', 'postmarked_by', 'https://x.example');`,
  /duplicate key value violates unique constraint "uq_election_event_scope"/
);

/* 0021_ballot_return_deadline constraint probes. */
await check("ballot_return_deadline is an accepted event_type", async () => {
  await db.exec(
    `INSERT INTO election_event (event_type, election, event_date, rule, details_url)
     VALUES ('ballot_return_deadline', 'probe_2027', '2027-01-05', 'received_by', 'https://x.example');`
  );
  const r = await db.query(
    "SELECT count(*)::int AS n FROM election_event WHERE election='probe_2027';"
  );
  if (r.rows[0].n !== 1) throw new Error("ballot_return_deadline row not inserted");
  await db.exec("DELETE FROM election_event WHERE election='probe_2027';");
});
await expectConstraintViolation(
  "rule CHECK rejects a rule token that is not postmarked_by/received_by",
  `INSERT INTO election_event (event_type, election, event_date, rule, details_url)
   VALUES ('ballot_return_deadline', 'probe_2027', '2027-01-05', 'whenever', 'https://x.example');`,
  /election_event_rule_check/
);
await expectConstraintViolation(
  "a deadline may not be stored without a rule",
  `INSERT INTO election_event (event_type, election, event_date, details_url)
   VALUES ('ballot_return_deadline', 'probe_2027', '2027-01-05', 'https://x.example');`,
  /election_event_rule_required_check/
);
await expectConstraintViolation(
  "a non-deadline may not carry a rule",
  `INSERT INTO election_event (event_type, election, event_date, rule, details_url)
   VALUES ('election_day', 'probe_2027', '2027-01-05', 'received_by', 'https://x.example');`,
  /election_event_rule_required_check/
);
await check("0021 seeded a ballot_return_deadline on election day for both elections", async () => {
  const r = await db.query(
    `SELECT e.election, e.rule, e.event_date = d.event_date AS same_day
       FROM election_event e
       JOIN election_event d
         ON d.election = e.election AND d.event_type = 'election_day'
      WHERE e.event_type = 'ballot_return_deadline' ORDER BY e.election;`
  );
  if (r.rows.length !== 2) throw new Error(`expected 2 rows, saw ${r.rows.length}`);
  for (const row of r.rows) {
    if (!row.same_day) throw new Error(`${row.election}: return deadline is not election day`);
    if (row.rule !== "received_by") throw new Error(`${row.election}: rule is ${row.rule}`);
  }
});
await check("every seeded deadline carries a rule and nothing else does", async () => {
  const r = await db.query(
    `SELECT count(*) FILTER (
       WHERE event_type IN ('registration_deadline','vbm_request_deadline','ballot_return_deadline')
         AND rule IS NULL)::int AS missing,
            count(*) FILTER (
       WHERE event_type IN ('early_voting_start','early_voting_end','election_day')
         AND rule IS NOT NULL)::int AS spurious
       FROM election_event;`
  );
  const { missing, spurious } = r.rows[0];
  if (missing !== 0) throw new Error(`${missing} deadline row(s) with no rule`);
  if (spurious !== 0) throw new Error(`${spurious} non-deadline row(s) carrying a rule`);
});
/* 0043_county_early_voting_2026. */
await check("0043 seeded both early-voting bounds for the four covered counties, unverified", async () => {
  const r = await db.query(
    `SELECT county_fips, event_type, event_date::text AS event_date, rule, verified_by, details_url
       FROM election_event
      WHERE county_fips IN ('12086','12011','12057','12095')
      ORDER BY county_fips, event_type;`
  );
  if (r.rows.length !== 8) throw new Error(`expected 8 rows, saw ${r.rows.length}`);
  for (const row of r.rows) {
    const want = row.event_type === "early_voting_start" ? "2026-10-19" : "2026-11-01";
    if (!["early_voting_start", "early_voting_end"].includes(row.event_type)) {
      throw new Error(`${row.county_fips}: unexpected ${row.event_type}`);
    }
    if (row.event_date !== want) throw new Error(`${row.county_fips} ${row.event_type}: ${row.event_date}, want ${want}`);
    if (row.rule !== null) throw new Error(`${row.county_fips} ${row.event_type}: carries rule ${row.rule}`);
    if (row.verified_by !== null) throw new Error(`${row.county_fips} ${row.event_type}: verified_by set by the migration`);
    if (!row.details_url.startsWith("https://")) throw new Error(`${row.county_fips}: details_url ${row.details_url}`);
  }
});
await expectConstraintViolation(
  "unique index rejects a second row for the same county, event and election",
  `INSERT INTO election_event (county_fips, event_type, election, event_date, details_url)
   VALUES ('12086', 'early_voting_start', 'general_2026', '2026-10-20', 'https://x.example');`,
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

/* 0018_publication_audit (invariant 17). The flip and its audit row are one
   statement, so the pair either both happened or neither did. These pin the
   properties that make the log trustworthy rather than merely present. */
await check("set_race_publication flips the status and logs it as one action", async () => {
  await db.exec(
    "SELECT set_race_publication('r-draft','published','op@example.com','audit test');"
  );
  const r = await db.query(`
    SELECT rp.status, rp.published_at IS NOT NULL AS stamped,
           a.actor, a.action, a.subject_kind, a.subject_ref,
           a.subject_id IS NULL AS uuid_subject_null,
           a.detail->>'prior_status' AS prior, a.detail->>'reason' AS reason
      FROM race_publication rp
      JOIN admin_action a ON a.subject_ref = rp.race_id
     WHERE rp.race_id = 'r-draft';`);
  if (r.rows.length !== 1) throw new Error(`expected exactly 1 audit row, saw ${r.rows.length}`);
  const g = r.rows[0];
  if (g.status !== "published") throw new Error(`status=${g.status}`);
  if (!g.stamped) throw new Error("published_at was not stamped on the transition");
  if (g.action !== "publish") throw new Error(`action=${g.action}`);
  if (g.subject_kind !== "race_publication") throw new Error(`subject_kind=${g.subject_kind}`);
  if (!g.uuid_subject_null) throw new Error("subject_id should be NULL for a text subject");
  if (g.prior !== "draft") throw new Error(`prior_status=${g.prior}`);
  if (g.reason !== "audit test") throw new Error(`reason=${g.reason}`);
});

await check("unpublishing logs an unpublish and keeps the last-published time", async () => {
  const before = await db.query(
    "SELECT published_at FROM race_publication WHERE race_id='r-draft';"
  );
  await db.exec(
    "SELECT set_race_publication('r-draft','in_review','op@example.com','pulled back');"
  );
  /* Pick this call's row by its reason, not by created_at: the publish and
     unpublish rows can share a timestamp, and on a tie 'publish' sorts first. */
  const r = await db.query(`
    SELECT rp.status, rp.published_at,
           (SELECT action FROM admin_action WHERE subject_ref='r-draft'
             AND detail->>'reason'='pulled back') AS logged_action,
           (SELECT count(*)::int FROM admin_action WHERE subject_ref='r-draft') AS n
      FROM race_publication rp WHERE rp.race_id='r-draft';`);
  const g = r.rows[0];
  if (g.status !== "in_review") throw new Error(`status=${g.status}`);
  if (String(g.published_at) !== String(before.rows[0].published_at))
    throw new Error("published_at must survive an unpublish");
  if (g.logged_action !== "unpublish") throw new Error(`logged_action=${g.logged_action}`);
  if (g.n !== 2) throw new Error(`expected 2 audit rows, saw ${g.n}`);
});

/* A row that says who but not why is the record we already had in
   race_publication.note, and it is not enough after the fact. */
await expectConstraintViolation(
  "set_race_publication requires an actor",
  "SELECT set_race_publication('r-pub','published','','because');",
  /actor is required/
);
await expectConstraintViolation(
  "set_race_publication requires a reason",
  "SELECT set_race_publication('r-pub','published','op@example.com','   ');",
  /reason is required/
);
await expectConstraintViolation(
  "set_race_publication rejects an unknown status",
  "SELECT set_race_publication('r-pub','live','op@example.com','because');",
  /invalid status/
);
await expectConstraintViolation(
  "set_race_publication refuses a race with no publication row",
  "SELECT set_race_publication('r-nope','published','op@example.com','because');",
  /no race_publication row/
);

/* 0020: the door is the only way in. service_role holds no direct UPDATE, and
   the flip above still worked — SECURITY DEFINER runs the function as postgres,
   which does. Asserting both is the point: the revoke is only safe because the
   second half holds, so a change that broke it must fail here. */
await expectDenied(
  "service_role cannot UPDATE race_publication directly (0020)",
  "UPDATE race_publication SET status='draft' WHERE race_id='r-pub';"
);
await expectDenied(
  "service_role cannot even touch race_publication.note directly (0020)",
  "UPDATE race_publication SET note='x' WHERE race_id='r-pub';"
);
await check("the door still flips without the privilege it just lost", async () => {
  await db.exec(
    "SELECT set_race_publication('r-pub','in_review','op@example.com','door survives the revoke');"
  );
  const r = await db.query("SELECT status FROM race_publication WHERE race_id='r-pub';");
  if (r.rows[0].status !== "in_review") throw new Error(`status=${r.rows[0].status}`);
  await db.exec(
    "SELECT set_race_publication('r-pub','published','op@example.com','restore fixture');"
  );
});

/* The subject is exactly one of the two identifier columns — never both,
   never neither, so a reader always knows which key to join on. */
await expectConstraintViolation(
  "admin_action rejects a row with neither subject identifier",
  "INSERT INTO admin_action (actor, action, subject_kind) VALUES ('x','publish','race_publication');",
  /admin_action_subject_one_of/
);
await expectConstraintViolation(
  "admin_action rejects a row with both subject identifiers",
  `INSERT INTO admin_action (actor, action, subject_kind, subject_id, subject_ref)
   VALUES ('x','publish','race_publication', gen_random_uuid(), 'r-pub');`,
  /admin_action_subject_one_of/
);

/* 0033: the door admits 'listed' and logs it under its own verbs. r-draft is
   at in_review here (the unpublish test above left it there) with a
   published_at stamped by the earlier publish -- which is exactly what lets
   us assert that listing does NOT re-stamp it. */
await check("set_race_publication lists a race, logs 'list', and never stamps published_at", async () => {
  const before = await db.query(
    "SELECT published_at FROM race_publication WHERE race_id='r-draft';"
  );
  await db.exec(
    "SELECT set_race_publication('r-draft','listed','op@example.com','roster is public record');"
  );
  /* By reason, not created_at, for the same reason as the unpublish check. */
  const r = await db.query(`
    SELECT rp.status, rp.published_at,
           (SELECT action FROM admin_action WHERE subject_ref='r-draft'
             AND detail->>'reason'='roster is public record') AS logged_action,
           (SELECT detail->>'new_status' FROM admin_action WHERE subject_ref='r-draft'
             AND action='list') AS logged_status,
           (SELECT detail->>'prior_status' FROM admin_action WHERE subject_ref='r-draft'
             AND action='list') AS logged_prior
      FROM race_publication rp WHERE rp.race_id='r-draft';`);
  const g = r.rows[0];
  if (g.status !== "listed") throw new Error(`status=${g.status}`);
  if (String(g.published_at) !== String(before.rows[0].published_at))
    throw new Error("listing must leave published_at alone");
  if (g.logged_action !== "list") throw new Error(`logged_action=${g.logged_action}`);
  if (g.logged_status !== "listed" || g.logged_prior !== "in_review")
    throw new Error(`logged ${g.logged_prior} -> ${g.logged_status}`);
});
/* Listing r-draft exposes the race row, but not c-draft: r-draft's
   candidate_ids is empty, and c-draft's profile path still needs 'published'.
   Nor cl-draft: the claim policy never heard of 'listed'. */
await check("a race listed through the door is anon-visible; its profile-only candidate and claims are not", async () => {
  await db.exec("SET ROLE anon;");
  const races = await db.query("SELECT race_id FROM race WHERE race_id='r-draft';");
  const cands = await db.query("SELECT candidate_id FROM candidate WHERE candidate_id='c-draft';");
  const claims = await db.query("SELECT claim_id FROM claim WHERE race_id='r-draft';");
  await db.exec("RESET ROLE; SET ROLE service_role;");
  if (races.rows.length !== 1) throw new Error("listed r-draft is not visible to anon");
  if (cands.rows.length !== 0) throw new Error("c-draft surfaced without being in candidate_ids");
  if (claims.rows.length !== 0) throw new Error("a listed race's claim is visible to anon");
});
await check("leaving listed logs 'unlist'; published -> listed logs 'unpublish'", async () => {
  await db.exec(
    "SELECT set_race_publication('r-draft','draft','op@example.com','back to draft');"
  );
  await db.exec(
    "SELECT set_race_publication('r-pub','listed','op@example.com','brief pulled, roster stays');"
  );
  const r = await db.query(`
    SELECT subject_ref, action FROM admin_action
     WHERE subject_ref IN ('r-draft','r-pub')
       AND detail->>'reason' IN ('back to draft','brief pulled, roster stays')
     ORDER BY subject_ref;`);
  const got = r.rows.map((x) => `${x.subject_ref}:${x.action}`).join(",");
  if (got !== "r-draft:unlist,r-pub:unpublish") throw new Error(`logged [${got}]`);
  await db.exec(
    "SELECT set_race_publication('r-pub','published','op@example.com','restore fixture');"
  );
});
/* The ACL survives CREATE OR REPLACE -- and 0033 re-states it anyway. Checked
   from the catalog so a future replace that forgets is caught even if no
   probe above happens to run as the wrong role. */
await check("0033 leaves set_race_publication executable by service_role only", async () => {
  const r = await db.query(`
    SELECT has_function_privilege('anon', 'set_race_publication(text,text,text,text)', 'EXECUTE') AS anon,
           has_function_privilege('authenticated', 'set_race_publication(text,text,text,text)', 'EXECUTE') AS authn,
           has_function_privilege('cap_tool_wrapper', 'set_race_publication(text,text,text,text)', 'EXECUTE') AS capw,
           has_function_privilege('service_role', 'set_race_publication(text,text,text,text)', 'EXECUTE') AS svc;`);
  const g = r.rows[0];
  if (g.anon || g.authn || g.capw) throw new Error(`EXECUTE leaked: ${JSON.stringify(g)}`);
  if (!g.svc) throw new Error("service_role lost EXECUTE");
});
await check("0033 leaves exactly one status CHECK on each publication table", async () => {
  const r = await db.query(`
    SELECT conrelid::regclass::text AS t, count(*)::int AS n FROM pg_constraint
     WHERE conrelid IN ('race_publication'::regclass, 'measure_publication'::regclass)
       AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%status%'
     GROUP BY 1 ORDER BY 1;`);
  const got = r.rows.map((x) => `${x.t}:${x.n}`).join(",");
  if (got !== "measure_publication:1,race_publication:1") throw new Error(`found [${got}]`);
});
await expectConstraintViolation(
  "race_publication status CHECK still rejects an unknown status",
  "INSERT INTO race_publication (race_id, status) VALUES ('r-nope','live');",
  /race_publication_status_check/
);

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
  if (r.rows[0].n !== 3) throw new Error(`saw ${r.rows[0].n} claims, expected 3`);
});
await expectDenied(
  "cap_tool_wrapper cannot DELETE claims",
  "DELETE FROM claim WHERE claim_id='cl-draft';"
);
await expectDenied(
  "cap_tool_wrapper cannot UPDATE race_publication",
  "UPDATE race_publication SET status='published' WHERE race_id='r-draft';"
);
/* 0018: and it cannot reach the same flip through the new door either —
   0009's rule is that publication never moves through a tool call. */
await expectDenied(
  "cap_tool_wrapper cannot EXECUTE set_race_publication",
  "SELECT set_race_publication('r-draft','published','x@x.com','because');"
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
  if (r.rows[0].n !== 3) throw new Error(`saw ${r.rows[0].n} claims, expected 3`);
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
 * 16. 0010/0011/0034 ballot measures.
 *
 * Same posture as races: anon sees a measure only through a published
 * measure_publication row, and can write nothing. Plus the symmetry rule,
 * which is the part specific to measures — an amendment has no campaign
 * obliged to balance it, so the database refuses to publish a lopsided one
 * rather than trusting a reviewer to notice. Since 0034 the unit is an
 * outside RESOURCE (a link), not an argument we wrote, and the rule is
 * "both sides present, larger <= 2x smaller".
 * ---------------------------------------------------------------- */

await check("0034 dropped measure_argument", async () => {
  const res = await db.query("SELECT to_regclass('public.measure_argument') AS t;");
  if (res.rows[0].t !== null) throw new Error("measure_argument still exists");
});

await db.exec(`
  INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
    ('s-gov', 'https://example.gov/m',   'example.gov/m',   'Example Gov',   'primary_doc',       'N/A'),
    ('s-n1',  'https://example.news/1',  'example.news/1',  'Example News',  'factual_reporting', 'unrated'),
    ('s-o1',  'https://example.org/1',   'example.org/1',   'Example Org',   'opinion',           'unrated'),
    ('s-o2',  'https://example.org/2',   'example.org/2',   'Example Org',   'opinion',           'unrated'),
    ('s-o3',  'https://example.org/3',   'example.org/3',   'Example Org',   'opinion',           'unrated'),
    ('s-o4',  'https://example.org/4',   'example.org/4',   'Example Org',   'opinion',           'unrated'),
    ('s-o5',  'https://example.org/5',   'example.org/5',   'Example Org',   'opinion',           'unrated'),
    ('s-o6',  'https://example.org/6',   'example.org/6',   'Example Org',   'opinion',           'unrated'),
    ('s-yt',  'https://video.example/1', 'video.example/1', 'Some Channel',  'opinion',           'unrated');

  INSERT INTO ballot_measure
    (measure_id, election, number, official_title, ballot_summary, full_text_url,
     placed_by, threshold_pct, jurisdiction, display_order) VALUES
    ('m-pub',    'general_2026', '1', 'Published Measure',  'Summary.', 'https://example.gov/1', 'legislature', 60, 'FL', 1),
    ('m-draft',  'general_2026', '2', 'Draft Measure',      'Summary.', 'https://example.gov/2', 'legislature', 60, 'FL', 2),
    ('m-skew',   'general_2026', '3', 'Lopsided Measure',   'Summary.', 'https://example.gov/3', 'legislature', 60, 'FL', 3),
    ('m-review', 'general_2026', '5', 'In-review Measure',  'Summary.', 'https://example.gov/5', 'legislature', 60, 'FL', 5);

  INSERT INTO measure_resource
    (resource_id, measure_id, source_id, stance, kind, format, title, published_at) VALUES
    ('r1', 'm-pub',   's-gov', 'neutral', 'official',  'document', 'Staff analysis', '2026-01-01'),
    ('r2', 'm-pub',   's-o1',  'support', 'argument',  'article',  'For.',           '2026-02-01'),
    ('r3', 'm-pub',   's-o2',  'oppose',  'argument',  'article',  'Against.',       '2026-02-01'),
    ('r4', 'm-draft', 's-o3',  'support', 'argument',  'article',  'For.',           NULL),
    ('r5', 'm-draft', 's-o4',  'oppose',  'argument',  'article',  'Against.',       NULL),
    -- 0041: a neutral row on a draft measure must stay unreadable, same as a
    -- sided one -- draft/in_review is a wall, not a door for any stance.
    ('r5n', 'm-draft', 's-n1', 'neutral', 'official',  'document', 'Draft-stage staff note', NULL),
    -- m-skew: three for, none against.
    ('r6', 'm-skew',  's-o5',  'support', 'argument',  'article',  'For A.',         NULL),
    ('r7', 'm-skew',  's-o6',  'support', 'argument',  'article',  'For B.',         NULL),
    ('r8', 'm-skew',  's-yt',  'support', 'commentary','video',    'For C.',         NULL),
    -- 0041: same wall for in_review as for draft.
    ('r-rev1', 'm-review', 's-n1', 'neutral', 'official', 'document', 'In-review staff note', NULL);

  INSERT INTO measure_publication (measure_id, status) VALUES
    ('m-pub', 'published'),
    ('m-draft', 'draft'),
    ('m-review', 'in_review');
`);

/* 0033: a listed measure is its ballot text alone. Inserted as service_role
   with ZERO resources -- the balance trigger checks only status =
   'published', so this must be accepted. A resource added afterwards stays
   editable (the resource-side trigger guards published measures only) and
   must stay invisible to anon. */
await check("a listed measure with zero resources is accepted", async () => {
  await db.exec("SET ROLE service_role;");
  try {
    await db.exec(`
      INSERT INTO ballot_measure
        (measure_id, election, number, official_title, ballot_summary, full_text_url,
         placed_by, threshold_pct, jurisdiction, display_order) VALUES
        ('m-listed', 'general_2026', '4', 'Listed Measure', 'Summary.', 'https://example.gov/4', 'legislature', 60, 'FL', 4);
      INSERT INTO measure_publication (measure_id, status) VALUES ('m-listed', 'listed');
      INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title) VALUES
        ('r-l1', 'm-listed', 's-o1', 'support', 'argument', 'article', 'For, unpublished.'),
        -- 0041: the neutral row on a *listed* measure is the one case that
        -- opens early -- neutral material takes no side, so showing it
        -- before publication cannot make the page one-sided.
        ('r-l2', 'm-listed', 's-gov', 'neutral', 'official', 'document', 'Listed-stage staff note');`);
  } finally {
    await db.exec("RESET ROLE;");
  }
});

/* Scoped to this fixture's own 'm-%' ids: 0038 seeds a genuinely published
   real-world measure (FL-AM3-general), and an unscoped SELECT here would
   pick that up too and make this fixture's assertion depend on unrelated
   seed data. */
await check("anon sees published and listed measures, never draft", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query(
    "SELECT measure_id FROM ballot_measure WHERE measure_id LIKE 'm-%' ORDER BY measure_id;"
  );
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.measure_id).join(",");
  if (ids !== "m-listed,m-pub") throw new Error(`expected m-listed,m-pub, got [${ids}]`);
});

await check("anon sees listed and published measure_publication rows with their status", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query(
    "SELECT measure_id, status FROM measure_publication WHERE measure_id LIKE 'm-%' ORDER BY measure_id;"
  );
  await db.exec("RESET ROLE;");
  const got = res.rows.map((r) => `${r.measure_id}:${r.status}`).join(",");
  if (got !== "m-listed:listed,m-pub:published") throw new Error(`saw [${got}]`);
});

/* 0041: r-l1 (support) stays behind the door on the listed m-listed --
   listing exposes the ballot text and neutral material only, never a side.
   r-l2 (neutral, m-listed) is the new admission: a listed measure's neutral
   rows are readable. r1/r2/r3 (m-pub, published) are unchanged -- a
   published measure still shows every row, sided or not. */
await check("anon sees a listed measure's neutral resources plus every published one, never a listed measure's sided rows", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query(
    "SELECT resource_id FROM measure_resource WHERE measure_id LIKE 'm-%' ORDER BY resource_id;"
  );
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.resource_id).join(",");
  if (ids !== "r-l2,r1,r2,r3") throw new Error(`expected r-l2,r1,r2,r3 only, got [${ids}]`);
});

await check("anon reads m-listed's neutral row and none of its sided rows", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query(
    "SELECT resource_id, stance FROM measure_resource WHERE measure_id = 'm-listed' ORDER BY resource_id;"
  );
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.resource_id).join(",");
  if (ids !== "r-l2") throw new Error(`expected r-l2 only, got [${ids}]`);
});

await check("anon reads every one of m-pub's rows, sided and neutral, unchanged by 0041", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT count(*)::int n FROM measure_resource WHERE measure_id = 'm-pub';");
  await db.exec("RESET ROLE;");
  const cnt = res.rows[0].n;
  if (cnt !== 3) throw new Error(`expected 3, got ${cnt}`);
});

await check("a draft or in_review measure's neutral rows stay unreadable to anon", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query(
    "SELECT count(*)::int n FROM measure_resource WHERE measure_id IN ('m-draft','m-review') AND stance = 'neutral';"
  );
  await db.exec("RESET ROLE;");
  const cnt = res.rows[0].n;
  if (cnt !== 0) throw new Error(`expected 0, got ${cnt}`);
});

/* 0038 and 0040 publish the real FL-AM3-general and FL-AM2-general measures:
   anon must see all 15 of AM3's resources (0038's 14 plus the
   FL-AM3-general:booklet row 0035 already seeded) and all 18 of AM2's
   (0040's 17 plus the FL-AM2-general:booklet row 0035 already seeded), and
   0 for AM1 here even though 0041 seeded AM1's neutral rows too -- AM1 has
   no measure_publication row at all at the migration level (it only becomes
   'listed' via the hand-run scripts/list-ballot-2026.sql), and 0041's policy
   only opens a neutral row once its measure has a 'listed' or 'published'
   row to point at. */
await check("anon sees all 15 FL-AM3-general and 18 FL-AM2-general resources, 0 for AM1", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query(
    `SELECT measure_id, count(*)::int n FROM measure_resource
      WHERE measure_id IN ('FL-AM1-general', 'FL-AM2-general', 'FL-AM3-general')
      GROUP BY measure_id ORDER BY measure_id;`
  );
  await db.exec("RESET ROLE;");
  const got = res.rows.map((r) => `${r.measure_id}:${r.n}`).join(",");
  if (got !== "FL-AM2-general:18,FL-AM3-general:15")
    throw new Error(`expected FL-AM2-general:18,FL-AM3-general:15 only, got [${got}]`);
});

await db.exec("SET ROLE anon;");
await expectDenied(
  "anon cannot INSERT a ballot_measure",
  `INSERT INTO ballot_measure (measure_id, election, number, official_title, ballot_summary, full_text_url, placed_by, threshold_pct)
   VALUES ('m-x','general_2026','9','X','S','https://e.gov/x','legislature',60);`
);
await expectDenied(
  "anon cannot INSERT a measure_resource",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-x','m-pub','s-o1','support','argument','article','X');`
);
await expectDenied(
  "anon cannot publish a measure",
  "UPDATE measure_publication SET status='published';"
);
await db.exec("RESET ROLE;");

/* The symmetry rule, as service_role: the trigger must hold for the role
   that actually writes. */
await db.exec("SET ROLE service_role;");
await expectConstraintViolation(
  "a measure with no opposing resource cannot be published",
  "INSERT INTO measure_publication (measure_id, status) VALUES ('m-skew','published');",
  /both sides must be present and the larger at most twice the smaller/
);
await db.exec("INSERT INTO measure_publication (measure_id, status) VALUES ('m-skew','draft');");
await expectConstraintViolation(
  "a skewed measure cannot be published by UPDATE either",
  "UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';",
  /both sides must be present and the larger at most twice the smaller/
);
/* m-skew is unpublished, so this insert is free (the resource-side trigger
   guards published measures only). It makes m-skew 3 vs 1. */
await db.exec(
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r9','m-skew','s-gov','oppose','analysis','document','Against A.');`
);
await expectConstraintViolation(
  "3 vs 1 is still lopsided under the 2x rule",
  "UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';",
  /both sides must be present and the larger at most twice the smaller/
);
await check("3 vs 2 publishes (within 2x)", async () => {
  await db.exec(
    `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
     VALUES ('r10','m-skew','s-n1','oppose','argument','article','Against B.');`
  );
  await db.exec("UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';");
  const res = await db.query("SELECT status FROM measure_publication WHERE measure_id='m-skew';");
  if (res.rows[0].status !== "published") throw new Error("expected m-skew to publish at 3 vs 2");
});

/* The hole the publication-side trigger alone leaves: a measure published
   while balanced, then skewed by removing the other side. */
await expectConstraintViolation(
  "a published measure cannot be skewed by deleting a resource",
  "DELETE FROM measure_resource WHERE resource_id='r3';",
  /is published: both sides must be present/
);
await expectConstraintViolation(
  "a published measure cannot be skewed by flipping a resource's stance",
  "UPDATE measure_resource SET stance='support' WHERE resource_id='r3';",
  /is published: both sides must be present/
);
await check("neutral resources do not count toward either side", async () => {
  /* m-pub is 1 vs 1 with one neutral; adding two more neutrals must not
     trip the 2x rule, and removing one must not either. */
  await db.exec(
    `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
     VALUES ('r11','m-pub','s-n1','neutral','reporting','article','Explainer'),
            ('r12','m-pub','s-o3','neutral','analysis','document','Study');
     DELETE FROM measure_resource WHERE resource_id='r12';`
  );
});
await check("an unpublished measure's resources can still be edited freely", async () => {
  await db.exec("DELETE FROM measure_resource WHERE resource_id='r5';");
});

/* The cross-column CHECKs. */
await expectConstraintViolation(
  "an official document cannot take a side",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad1','m-draft','s-gov','support','official','document','X');`,
  /measure_resource_neutral_kinds/
);
await expectConstraintViolation(
  "reporting cannot take a side",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad2','m-draft','s-n1','oppose','reporting','article','X');`,
  /measure_resource_neutral_kinds/
);
await expectConstraintViolation(
  "an argument cannot be neutral",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad3','m-draft','s-o1','neutral','argument','article','X');`,
  /measure_resource_sided_kinds/
);
await expectConstraintViolation(
  "commentary cannot be neutral",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad4','m-draft','s-yt','neutral','commentary','video','X');`,
  /measure_resource_sided_kinds/
);
await expectConstraintViolation(
  "duration belongs to video and audio only",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title, duration_seconds)
   VALUES ('r-bad5','m-draft','s-o1','support','argument','article','X', 600);`,
  /measure_resource_duration_format/
);
await expectConstraintViolation(
  "a note is attribution, at most 140 characters",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title, note)
   VALUES ('r-bad6','m-draft','s-o1','support','argument','article','X', repeat('x', 141));`,
  /measure_resource_note_length/
);
await expectConstraintViolation(
  "one URL is one resource per measure",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-dup','m-pub','s-o1','support','argument','article','Again');`,
  /measure_resource_measure_id_source_id_key/
);
await expectConstraintViolation(
  "threshold_pct must be a real percentage",
  `INSERT INTO ballot_measure (measure_id, election, number, official_title, ballot_summary, full_text_url, placed_by, threshold_pct)
   VALUES ('m-bad','general_2026','9','X','S','https://e.gov/x','legislature',0);`,
  /threshold_pct/
);
await expectConstraintViolation(
  "stance must be support, oppose or neutral",
  `INSERT INTO measure_resource (resource_id, measure_id, source_id, stance, kind, format, title)
   VALUES ('r-bad7','m-pub','s-o1','maybe','argument','article','X');`,
  /stance/
);
/* 17. block_district — public reference data for address lookup. */
await db.exec("SET ROLE service_role;");
await check("a seeded range resolves a GEOID inside it", async () => {
  const res = await db.query(
    "SELECT congressional_district FROM block_district WHERE block_start <= '120860036061055' AND block_end >= '120860036061055';"
  );
  if (res.rows[0]?.congressional_district !== "FL-27") {
    throw new Error(
      `expected the seeded ranges to put block 120860036061055 in FL-27, got ${res.rows[0]?.congressional_district ?? "no row"}`
    );
  }
});
await check("the seed covers the four counties and 16 districts", async () => {
  const res = await db.query(
    "SELECT count(DISTINCT county_fips)::int AS counties, count(DISTINCT congressional_district)::int AS districts, count(*)::int AS ranges FROM block_district;"
  );
  const { counties, districts, ranges } = res.rows[0];
  if (counties !== 4 || districts !== 16) {
    throw new Error(`expected 4 counties and 16 districts, got ${counties} and ${districts}`);
  }
  if (ranges < 100) throw new Error(`only ${ranges} ranges — the seed looks truncated`);
});
await expectConstraintViolation(
  "a range cannot end before it starts",
  `INSERT INTO block_district (block_start, block_end, county_fips, congressional_district)
   VALUES ('129990036061999','129990036061000','12999','FL-27');`,
  /block_district_range_ordered|check/i
);
await db.exec("SET ROLE anon;");
await check("anon can read the district map", async () => {
  const res = await db.query("SELECT count(*)::int AS n FROM block_district;");
  if (res.rows[0].n < 1) throw new Error("anon saw no block_district rows");
});
await expectDenied(
  "anon cannot write block_district",
  `INSERT INTO block_district (block_start, block_end, county_fips, congressional_district)
   VALUES ('129990201001000','129990201001999','12999','FL-23');`
);

await db.exec("RESET ROLE;");

/* 0048's guard, on fresh databases holding only an agent_run table in a
   given shape: it rebuilds the exact pre-state, is a no-op on its own
   post-state, and raises on anything else rather than drop a value. */
const sql0048 = await readFile(path.join(migrationsDir, "0048_agent_run_r5.sql"), "utf8");
const agentRunWith = (values) =>
  `CREATE TABLE agent_run (id SERIAL PRIMARY KEY, agent TEXT NOT NULL CHECK (agent IN (${values.map((v) => `'${v}'`).join(", ")})));`;
async function probe0048(name, ddl, expect) {
  await check(name, async () => {
    const probe = new PGlite();
    try {
      await probe.exec(ddl);
      let raised = null;
      try {
        await probe.exec(sql0048);
      } catch (err) {
        raised = err;
      }
      if (expect === "raise") {
        if (!raised) throw new Error("0048 applied over an agent list its guard should refuse");
        if (!/0048:/.test(raised.message)) throw new Error(`raised, but not by the guard: ${raised.message}`);
        return;
      }
      if (raised) throw new Error(`0048 refused: ${raised.message}`);
      for (const agent of ["R1", "R2", "R3", "R4", "R5", "dispatcher"]) {
        await probe.exec(`INSERT INTO agent_run (agent) VALUES ('${agent}');`);
      }
      let refused = false;
      try {
        await probe.exec("INSERT INTO agent_run (agent) VALUES ('R9');");
      } catch {
        refused = true;
      }
      if (!refused) throw new Error("the rebuilt CHECK admits R9");
    } finally {
      await probe.close();
    }
  });
}
await probe0048("0048 rebuilds the exact pre-state with R5", agentRunWith(["R1", "R2", "R3", "R4", "dispatcher"]), "apply");
await probe0048("0048 is a no-op on its own post-state", agentRunWith(["R1", "R2", "R3", "R4", "R5", "dispatcher"]), "apply");
await probe0048("0048 raises when the CHECK holds an extra agent", agentRunWith(["R1", "R2", "R3", "R4", "R6", "dispatcher"]), "raise");
await probe0048("0048 raises when the CHECK lacks an agent", agentRunWith(["R1", "R2", "R3", "R4"]), "raise");
await probe0048(
  "0048 raises when the agent CHECK has another name",
  "CREATE TABLE agent_run (id SERIAL PRIMARY KEY, agent TEXT NOT NULL CONSTRAINT agent_ok CHECK (agent IN ('R1','R2','R3','R4','dispatcher')));",
  "raise"
);
await probe0048(
  "0048 raises when a second CHECK on agent exists",
  `${agentRunWith(["R1", "R2", "R3", "R4", "dispatcher"])} ALTER TABLE agent_run ADD CONSTRAINT agent_short CHECK (length(agent) < 20);`,
  "raise"
);
/* 21. 0049_roster_completeness (docs/superpowers/specs/2026-10-08-roster-
   completeness-design.md §3.2, §6). Builds its own fixtures, so the earlier
   blocks' changes to r-pub and r-draft cannot move it; 22 (0050) follows. */
const rosterFile = files.find((f) => f.endsWith("_roster_completeness.sql"));
await check("0049 roster_completeness exists and sorts after 0047", async () => {
  if (!rosterFile) throw new Error("no *_roster_completeness.sql in supabase/migrations");
  if (!(rosterFile > "0047_candidate_lead_kind.sql")) throw new Error(`${rosterFile} sorts before 0047`);
});
/* §3.2: a replay inside the freeze window must apply these UPDATEs before the
   content-freeze guard exists, or every CI run in the freeze fails. */
await check("0049 sorts before any *_content_freeze.sql", async () => {
  const freeze = files.find((f) => f.endsWith("_content_freeze.sql"));
  if (freeze && rosterFile && !(rosterFile < freeze)) {
    throw new Error(`${rosterFile} sorts after ${freeze}`);
  }
});
await check("0049 adds the five candidate columns with their types", async () => {
  const r = await db.query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'candidate'
        AND column_name IN ('incumbency_source','incumbency_verified_at','running_mate',
                            'running_mate_source','running_mate_verified_at')
      ORDER BY column_name;`
  );
  const got = r.rows.map((x) => `${x.column_name}:${x.data_type}`).join(",");
  const want =
    "incumbency_source:text,incumbency_verified_at:timestamp with time zone," +
    "running_mate:text,running_mate_source:text,running_mate_verified_at:timestamp with time zone";
  if (got !== want) throw new Error(`saw ${got}`);
});
await check("0049 gives all 49 seeded county ballot candidates an incumbency source and date", async () => {
  const r = await db.query(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE c.incumbency_source IS NOT NULL
                               AND c.incumbency_verified_at IS NOT NULL)::int AS sourced
       FROM race r, unnest(r.candidate_ids) cid
       JOIN candidate c ON c.candidate_id = cid
      WHERE r.level = 'county' AND c.ballot_status = 'ballot';`
  );
  const { n, sourced } = r.rows[0];
  if (n !== 49 || sourced !== 49) throw new Error(`${sourced} of ${n} county ballot candidates sourced, expected 49 of 49`);
});
await check("0049 county races: is_open_seat = (incumbent_id IS NULL), and FL-HIL-SB4-general names Rendon", async () => {
  const r = await db.query(
    `SELECT count(*) FILTER (WHERE is_open_seat <> (incumbent_id IS NULL))::int AS bad,
            max(incumbent_id) FILTER (WHERE race_id = 'FL-HIL-SB4-general') AS sb4
       FROM race WHERE level = 'county';`
  );
  if (r.rows[0].bad !== 0) throw new Error(`${r.rows[0].bad} county race(s) disagree`);
  if (r.rows[0].sb4 !== "FL-VF-HIL-2672") throw new Error(`FL-HIL-SB4-general names ${r.rows[0].sb4}`);
});
/* The DoE roster (state and federal rows) is not seeded offline, so the DO
   block must stop at its notice rather than fail. Re-applying the whole file
   also proves it idempotent: the trigger lets an unchanged value through. */
await check("0049 re-applies cleanly and notes that the DoE roster is absent offline", async () => {
  const notices = [];
  const sql = await readFile(path.join(migrationsDir, rosterFile), "utf8");
  await db.exec(sql, { onNotice: (n) => notices.push(n.message) });
  if (!notices.some((m) => /DoE roster absent/.test(m))) {
    throw new Error(`no DoE-absent notice; saw ${JSON.stringify(notices)}`);
  }
});

/* Own fixtures: a listed Governor race and a draft race, one candidate each. */
await db.exec(`
  INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES
    ('r-roster-listed', 'Governor',  'state',   'general', ARRAY['c-roster-gov']),
    ('r-roster-draft',  'US Senate', 'federal', 'general', ARRAY['c-roster-draft']);
  INSERT INTO race_publication (race_id, status, published_at) VALUES
    ('r-roster-listed', 'listed', NULL),
    ('r-roster-draft',  'draft',  NULL);
  INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status) VALUES
    ('c-roster-gov',   'Roster Governor', 'NPA', 'Governor',  'qualified'),
    ('c-roster-draft', 'Roster Draft',    'NPA', 'US Senate', 'qualified');
`);

await expectConstraintViolation(
  "0049 CHECK rejects an incumbency source without a date",
  "UPDATE candidate SET incumbency_source = 'https://example.gov/members' WHERE candidate_id = 'c-roster-gov';",
  /candidate_incumbency_sourced/
);
await expectConstraintViolation(
  "0049 CHECK rejects a true is_incumbent with no source",
  "UPDATE candidate SET is_incumbent = true WHERE candidate_id = 'c-roster-gov';",
  /candidate_incumbent_needs_source/
);
await expectConstraintViolation(
  "0049 CHECK rejects a running mate on a non-Governor row",
  `UPDATE candidate SET running_mate = 'Test Mate', running_mate_source = 'https://example.gov/c',
          running_mate_verified_at = '2026-10-09T00:00:00Z' WHERE candidate_id = 'c-roster-draft';`,
  /candidate_running_mate_governor/
);
await expectConstraintViolation(
  "0049 CHECK rejects two of the three running-mate columns",
  "UPDATE candidate SET running_mate = 'Test Mate', running_mate_source = 'https://example.gov/c' WHERE candidate_id = 'c-roster-gov';",
  /candidate_running_mate_sourced/
);
await expectConstraintViolation(
  "0049 CHECK rejects a running mate with a doubled space",
  `UPDATE candidate SET running_mate = 'Test  Mate', running_mate_source = 'https://example.gov/c',
          running_mate_verified_at = '2026-10-09T00:00:00Z' WHERE candidate_id = 'c-roster-gov';`,
  /candidate_running_mate_clean/
);

await check("0049: no API role holds EXECUTE on candidate_sourced_fact_guard", async () => {
  const r = await db.query(
    `SELECT has_function_privilege('cap_tool_wrapper', 'public.candidate_sourced_fact_guard()', 'EXECUTE') AS capw,
            has_function_privilege('cap_readonly',     'public.candidate_sourced_fact_guard()', 'EXECUTE') AS capr,
            has_function_privilege('anon',             'public.candidate_sourced_fact_guard()', 'EXECUTE') AS anon,
            has_function_privilege('authenticated',    'public.candidate_sourced_fact_guard()', 'EXECUTE') AS auth;`
  );
  const g = r.rows[0];
  if (g.capw || g.capr || g.anon || g.auth) throw new Error(`EXECUTE held: ${JSON.stringify(g)}`);
});

/* B4's write, word for word (Civic Awareness (Know Your Vote)/toollayer/
   cap_toollayer/store.py:245-247, %s as $n), as the role B4 connects as. The
   subject is any county row 0049 sourced, so the check does not depend on
   whom the worksheet found to be an incumbent. */
const B4_UPDATE = "UPDATE candidate SET is_incumbent = $1, fec_id = COALESCE($2, fec_id) WHERE candidate_id = $3";
const subject = await db
  .query(
    `SELECT candidate_id, is_incumbent, incumbency_source, incumbency_verified_at
       FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND incumbency_verified_at IS NOT NULL
      ORDER BY candidate_id LIMIT 1;`
  )
  .then((r) => r.rows[0], () => undefined);
await db.exec("SET ROLE cap_tool_wrapper;");
await check("0049 trigger: B4's UPDATE cannot flip a sourced is_incumbent, though cap_tool_wrapper has no EXECUTE", async () => {
  if (!subject) throw new Error("no county candidate carries a 0049 source");
  try {
    await db.query(B4_UPDATE, [!subject.is_incumbent, null, subject.candidate_id]);
  } catch (err) {
    if (/is_incumbent changed without a new incumbency_source/.test(err.message)) return;
    throw new Error(`unexpected error: ${err.message}`);
  }
  throw new Error(`B4's UPDATE flipped ${subject.candidate_id}`);
});
await check("0049 trigger: B4's UPDATE with the unchanged value passes", async () => {
  if (!subject) throw new Error("no county candidate carries a 0049 source");
  await db.query(B4_UPDATE, [subject.is_incumbent, null, subject.candidate_id]);
});
await check("0049 trigger: a changed is_incumbent with a new source and date passes (a tripwire, not a lock)", async () => {
  if (!subject) throw new Error("no county candidate carries a 0049 source");
  await db.query(
    `UPDATE candidate SET is_incumbent = NOT is_incumbent,
            incumbency_source = 'https://example.gov/correction',
            incumbency_verified_at = '2026-10-20T00:00:00Z'
      WHERE candidate_id = $1`,
    [subject.candidate_id]
  );
  await db.query(
    `UPDATE candidate SET is_incumbent = $2, incumbency_source = $3, incumbency_verified_at = $4
      WHERE candidate_id = $1`,
    [subject.candidate_id, subject.is_incumbent, subject.incumbency_source, subject.incumbency_verified_at]
  );
});
await db.exec("RESET ROLE;");

await check("0049: a Governor row takes a sourced running mate", async () => {
  await db.exec(`
    UPDATE candidate SET running_mate = 'First Mate', running_mate_source = 'https://example.gov/can?account=1',
           running_mate_verified_at = '2026-10-09T00:00:00Z'
     WHERE candidate_id = 'c-roster-gov';
  `);
});
await check("0049 trigger: a changed running_mate without a new source or date is refused", async () => {
  try {
    await db.exec("UPDATE candidate SET running_mate = 'Second Mate' WHERE candidate_id = 'c-roster-gov';");
  } catch (err) {
    if (/running_mate changed without a new running_mate_source/.test(err.message)) return;
    throw new Error(`unexpected error: ${err.message}`);
  }
  throw new Error("running_mate changed with no new source");
});
await check("0049 trigger: clearing all three running-mate columns passes (the takedown, spec §3.10)", async () => {
  await db.exec(
    `UPDATE candidate SET running_mate = NULL, running_mate_source = NULL, running_mate_verified_at = NULL
      WHERE candidate_id = 'c-roster-gov';`
  );
});

await check("0049: both fixture candidates take an incumbency source and date", async () => {
  await db.exec(`
    UPDATE candidate SET incumbency_source = 'https://example.gov/members',
           incumbency_verified_at = '2026-10-09T00:00:00Z'
     WHERE candidate_id IN ('c-roster-gov', 'c-roster-draft');
  `);
});
await db.exec("SET ROLE anon;");
await check("0049: anon reads the new columns on a listed race's candidate, not on a draft race's", async () => {
  const r = await db.query(
    `SELECT candidate_id, incumbency_source, incumbency_verified_at, running_mate
       FROM candidate WHERE candidate_id IN ('c-roster-gov', 'c-roster-draft') ORDER BY candidate_id;`
  );
  const got = r.rows.map((x) => `${x.candidate_id}:${x.incumbency_source}`).join(",");
  if (got !== "c-roster-gov:https://example.gov/members") throw new Error(`saw [${got}]`);
});
await db.exec("RESET ROLE;");

/* The whole-ballot half of 0049's DO block runs only where the DoE roster
   exists, which offline is nowhere. Rehearse it on a replica of the
   2026-10-08 ballot built from the roster fixture: the 57 state and federal
   candidates and their 21 races, every race's publication status as it was
   that day, the harness's own r-* races moved out of the general election.
   All inside a transaction that is rolled back, so nothing after this sees it.
   This is the check that the live apply's assertions agree with the
   worksheet's totals before the founder runs it. */
await check("0049 whole-ballot assertions pass on a replica of the 2026-10-08 ballot", async () => {
  const roster = JSON.parse(
    await readFile(path.join(root, "scripts/fixtures/roster/ballot-roster-2026-10-08.json"), "utf8")
  );
  const notices = [];
  await db.exec("BEGIN;");
  try {
    await db.exec("UPDATE race SET election = 'primary' WHERE race_id NOT LIKE 'FL-%';");
    const doe = roster.filter((r) => r.level !== "county");
    for (const r of doe) {
      await db.query(
        `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status, official_site)
         VALUES ($1, $2, 'NPA', $3, 'qualified', $4);`,
        [r.candidate_id, r.legal_name, r.race_id === "FL-GOV-general" ? "Governor" : "Replica office",
         r.has_site ? "https://example.org/" : null]
      );
    }
    for (const raceId of [...new Set(doe.map((r) => r.race_id))]) {
      const inRace = doe.filter((r) => r.race_id === raceId);
      await db.query(
        `INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES ($1, 'Replica', $2, 'general', $3);`,
        [raceId, inRace[0].level, inRace.map((r) => r.candidate_id)]
      );
    }
    for (const raceId of [...new Set(roster.map((r) => r.race_id))]) {
      const status = roster.find((r) => r.race_id === raceId).race_status;
      await db.query(
        `INSERT INTO race_publication (race_id, status, published_at)
         VALUES ($1, $2, CASE WHEN $2 = 'published' THEN now() END)
         ON CONFLICT (race_id) DO UPDATE SET status = EXCLUDED.status, published_at = EXCLUDED.published_at;`,
        [raceId, status]
      );
    }
    const sql = await readFile(path.join(migrationsDir, rosterFile), "utf8");
    await db.exec(sql, { onNotice: (n) => notices.push(n.message) });
  } finally {
    await db.exec("ROLLBACK;");
  }
  if (!notices.some((m) => /^0049: 106 ballot candidates sourced/.test(m))) {
    throw new Error(`the whole-ballot branch did not finish; notices: ${JSON.stringify(notices)}`);
  }
});

/* D11 in the SQL itself: the site UPDATE writes a find only for a candidate
   in a LISTED race. The worksheet already refuses a published-race find; this
   proves the migration refuses one too, should a row ever reach the block.
   Two rows are spliced into the generated sites block of a copy of the file
   (one per status), the copy runs inside a rolled-back transaction, and only
   the listed-race row may land. */
await check("0049 site UPDATE writes a listed-race find and refuses a published-race one (D11)", async () => {
  const sql = await readFile(path.join(migrationsDir, rosterFile), "utf8");
  const marker = "    -- END generated: sites";
  if (!sql.includes(marker)) throw new Error("no generated sites block");
  const spliced = sql.replace(
    marker,
    "    ,('FL-VF-BRO-1179', 'Mark D. Bogen', 'https://listed.example/', '2026-10-09T00:00:00Z')\n" +
      "    ,('FL-VF-HIL-2880', 'Jackie Toledo', 'https://published.example/', '2026-10-09T00:00:00Z')\n" +
      marker
  );
  let got;
  await db.exec("BEGIN;");
  try {
    await db.exec(`
      INSERT INTO race_publication (race_id, status, published_at) VALUES
        ('FL-BRO-CC2-general', 'listed', NULL),
        ('FL-HIL-CC1-general', 'published', now())
      ON CONFLICT (race_id) DO UPDATE SET status = EXCLUDED.status, published_at = EXCLUDED.published_at;
    `);
    await db.exec(spliced);
    got = (
      await db.query(
        `SELECT candidate_id, official_site FROM candidate
          WHERE candidate_id IN ('FL-VF-BRO-1179', 'FL-VF-HIL-2880') ORDER BY candidate_id;`
      )
    ).rows;
  } finally {
    await db.exec("ROLLBACK;");
  }
  const bogen = got.find((r) => r.candidate_id === "FL-VF-BRO-1179");
  const toledo = got.find((r) => r.candidate_id === "FL-VF-HIL-2880");
  if (bogen?.official_site !== "https://listed.example/") {
    throw new Error(`listed-race find not written: ${JSON.stringify(bogen)}`);
  }
  if (toledo?.official_site === "https://published.example/") {
    throw new Error("a published-race find was written");
  }
});

/* ---------------------------------------------------------------- *
 * 22. 0050_content_freeze (ballot-content-completion §3.6.2, BC9).
 *
 * Everything above ran with kyv.freeze_correction = 'pglite replay' (set at
 * the top of this file). Each case below opens a transaction, turns that
 * bypass off for the transaction only (set_config(..., true)), runs one
 * statement and rolls back, so the fixtures stay as they were. The window
 * is moved around now(), into the future or into the past explicitly, so no
 * case depends on today's date.
 * ---------------------------------------------------------------- */

const FROZEN =
  /^Ballot content is frozen until Election Day \(content_freeze\)\. Corrections only: docs\/general-election\/corrections\/README\.md$/;
const CORRECTION = "docs/general-election/corrections/2026-10-20-pglite-probe.md";
const CLAIM_INSERT = `INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, verdict, verification)
  VALUES ('cl-freeze', 'c-pub', 'r-pub', 'i-pub', 'Voted for F on date G.', 'verifiable_fact', false, 'accurate', 'verified');`;
const PROFILE_HOLD = `UPDATE profile SET audit = audit || '{"balance_check_passed": false}' WHERE race_id='r-pub';`;
const STATEMENT_GUARDED = [
  "claim", "claim_source", "position", "issue", "profile", "ballot_measure",
  "measure_resource", "candidate_contact", "candidate_social_account",
  "zip_district", "block_district",
];
const ROW_GUARDED = ["race_publication", "measure_publication", "candidate", "race", "source"];

const FREEZE_WINDOWS = {
  open: "now() - interval '1 hour', now() + interval '1 hour'",
  future: "now() + interval '1 hour', now() + interval '2 hours'",
  past: "now() - interval '2 hours', now() - interval '1 hour'",
};
async function setFreezeWindow(which) {
  await db.exec(
    `UPDATE content_freeze SET (starts_at, ends_at) = (${FREEZE_WINDOWS[which]}) WHERE id = 1;`
  );
}

/* Runs `sql` in a transaction, as `role` when given, after `setup` (which
   still runs with the bypass on) and with kyv.freeze_correction set to
   `correction` (default: off), then rolls back. Resolves to the error, or
   null when the SQL went through. */
async function inFreezeTx(sql, { role = null, correction = "", setup = null, onNotice } = {}) {
  await db.exec("BEGIN;");
  try {
    if (role) await db.exec(`SET LOCAL ROLE ${role};`);
    if (setup) await db.exec(setup);
    await db.query("SELECT set_config('kyv.freeze_correction', $1, true);", [correction]);
    await db.exec(sql, onNotice ? { onNotice } : undefined);
    return null;
  } catch (err) {
    return err;
  } finally {
    await db.exec("ROLLBACK;");
  }
}
async function expectFrozen(name, sql, opts) {
  await check(name, async () => {
    const err = await inFreezeTx(sql, opts);
    if (!err) throw new Error("statement went through; the freeze should have refused it");
    if (err.code !== "P0001" || !FROZEN.test(err.message))
      throw new Error(`unexpected error: ${err.code} ${err.message}`);
  });
}
async function expectThrough(name, sql, opts) {
  await check(name, async () => {
    const err = await inFreezeTx(sql, opts);
    if (err) throw new Error(`refused: ${err.message}`);
  });
}

/* The objects, before any window is moved. The exact window is pinned by
   scripts/verify-freeze-rules.ts against the code tripwire's constants, so
   a scratch copy of 0050 with a moved window still passes here. */
await check("0050 content_freeze holds one row, id 1, an ordered window and a note", async () => {
  const r = await db.query(
    `SELECT count(*)::int AS n, bool_and(id = 1) AS id1,
            bool_and(ends_at > starts_at) AS ordered, bool_and(btrim(note) <> '') AS noted
       FROM content_freeze;`
  );
  const g = r.rows[0];
  if (g.n !== 1 || !g.id1 || !g.ordered || !g.noted) throw new Error(JSON.stringify(g));
});
await expectConstraintViolation(
  "0050 content_freeze takes no second row",
  "INSERT INTO content_freeze (id, starts_at, ends_at, note) VALUES (2, now(), now() + interval '1 day', 'x');",
  /content_freeze_id_check/
);
await check("0050 the guard is SECURITY DEFINER, owned by postgres, with an empty search_path", async () => {
  const r = await db.query(
    `SELECT prosecdef, proconfig, pg_get_userbyid(proowner) AS owner
       FROM pg_proc WHERE proname = 'refuse_during_content_freeze';`
  );
  if (r.rows.length !== 1) throw new Error(`expected one function, found ${r.rows.length}`);
  const g = r.rows[0];
  if (g.prosecdef !== true) throw new Error("not SECURITY DEFINER");
  if (JSON.stringify(g.proconfig) !== JSON.stringify(['search_path=""']))
    throw new Error(`proconfig=${JSON.stringify(g.proconfig)}`);
  if (g.owner !== "postgres") throw new Error(`owner=${g.owner}`);
});
await check("0050 triggers: statement-level on 11 tables, row-level and TRUNCATE on 5", async () => {
  const r = await db.query(
    `SELECT c.relname || ':' || t.tgname AS k
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE p.proname = 'refuse_during_content_freeze' AND NOT t.tgisinternal
      ORDER BY 1;`
  );
  const want = [
    ...STATEMENT_GUARDED.map((t) => `${t}:trg_content_freeze`),
    ...ROW_GUARDED.flatMap((t) => [`${t}:trg_content_freeze_row`, `${t}:trg_content_freeze_truncate`]),
  ].sort();
  const got = r.rows.map((x) => x.k);
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got [${got.join(", ")}]`);
});
await check("0050 PUBLIC, anon, authenticated, cap_tool_wrapper and cap_readonly cannot EXECUTE the guard (0020)", async () => {
  const r = await db.query(
    `SELECT has_function_privilege('anon', 'public.refuse_during_content_freeze()', 'EXECUTE') AS anon,
            has_function_privilege('authenticated', 'public.refuse_during_content_freeze()', 'EXECUTE') AS authn,
            has_function_privilege('cap_tool_wrapper', 'public.refuse_during_content_freeze()', 'EXECUTE') AS capw,
            has_function_privilege('cap_readonly', 'public.refuse_during_content_freeze()', 'EXECUTE') AS capr,
            (SELECT count(*)::int FROM pg_proc p, aclexplode(p.proacl) a
              WHERE p.proname = 'refuse_during_content_freeze' AND a.grantee = 0) AS public_grants;`
  );
  const g = r.rows[0];
  if (g.anon || g.authn || g.capw || g.capr || g.public_grants !== 0)
    throw new Error(`EXECUTE leaked: ${JSON.stringify(g)}`);
});
await check("0050 anon and authenticated hold no privilege on content_freeze", async () => {
  const r = await db.query(
    `SELECT bool_or(has_table_privilege(r, 'public.content_freeze', p)) AS any
       FROM unnest(ARRAY['anon','authenticated']) r,
            unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) p;`
  );
  if (r.rows[0].any) throw new Error("anon or authenticated holds a privilege on content_freeze");
});
await db.exec("SET ROLE anon;");
await expectDenied("0050 anon cannot read content_freeze", "SELECT * FROM content_freeze;");
await db.exec("RESET ROLE;");

/* Inside the window. */
await setFreezeWindow("open");
await expectFrozen("0050 in the window, an INSERT into claim is refused", CLAIM_INSERT);
await expectThrough(
  "0050 ... and goes through as a correction (SET LOCAL kyv.freeze_correction)",
  `SET LOCAL kyv.freeze_correction = '${CORRECTION}'; ${CLAIM_INSERT}`
);
await check("0050 a correction write raises a NOTICE naming the correction file", async () => {
  const notices = [];
  const err = await inFreezeTx(CLAIM_INSERT, {
    correction: CORRECTION,
    onNotice: (n) => notices.push(n.message),
  });
  if (err) throw new Error(`refused: ${err.message}`);
  if (!notices.some((m) => m.includes(CORRECTION)))
    throw new Error(`notices: ${JSON.stringify(notices)}`);
});
await expectFrozen(
  "0050 a kyv.freeze_correction of only whitespace is not a correction",
  CLAIM_INSERT,
  { correction: "   " }
);
await expectFrozen(
  "0050 as cap_tool_wrapper, an INSERT into claim is refused by the freeze, not by a permission error",
  CLAIM_INSERT,
  { role: "cap_tool_wrapper" }
);
await expectThrough(
  "0050 set_race_publication(..., 'listed', ...) goes through without the setting",
  "SELECT set_race_publication('r-pub','listed','op@example.com','freeze takedown probe');",
  { role: "service_role" }
);
await expectFrozen(
  "0050 set_race_publication(..., 'published', ...) is refused",
  "SELECT set_race_publication('r-listed','published','op@example.com','freeze publish probe');",
  { role: "service_role" }
);
await expectThrough(
  "0050 a measure taken to listed goes through without the setting",
  "UPDATE measure_publication SET status='listed' WHERE measure_id='m-skew';",
  { role: "service_role" }
);
await expectFrozen(
  "0050 a balanced measure's publish is refused",
  "UPDATE measure_publication SET status='published' WHERE measure_id='m-skew';",
  { role: "service_role", setup: "UPDATE measure_publication SET status='listed' WHERE measure_id='m-skew';" }
);
await expectFrozen("0050 a profile audit update is refused without the setting", PROFILE_HOLD);
await expectThrough("0050 ... and goes through with it (the BC16 hold)", PROFILE_HOLD, { correction: CORRECTION });
await expectThrough(
  "0050 a candidate UPDATE of only site_last_verified_at goes through",
  "UPDATE candidate SET site_last_verified_at = now() WHERE candidate_id='c-pub';"
);
await expectFrozen(
  "0050 ... one that also touches official_site is refused",
  "UPDATE candidate SET site_last_verified_at = now(), official_site = 'https://pub-candidate.example/' WHERE candidate_id='c-pub';"
);
await expectFrozen(
  "0050 a candidate qualifying_status change is refused (it is applied as a correction, BC18)",
  "UPDATE candidate SET qualifying_status = 'withdrawn' WHERE candidate_id='c-pub';"
);
await expectThrough(
  "0050 a race UPDATE of only key_dates and info_last_verified_at goes through",
  `UPDATE race SET key_dates = key_dates || '{"general": "2026-11-03"}', info_last_verified_at = now() WHERE race_id='r-pub';`
);
await expectFrozen(
  "0050 a race UPDATE of office is refused",
  "UPDATE race SET office = 'Governor (changed)' WHERE race_id='r-pub';"
);
await expectThrough(
  "0050 a race UPDATE that sets office to its current value goes through",
  "UPDATE race SET office = office WHERE race_id='r-pub';"
);
/* A published race_publication row is one no exception covers (only an
   UPDATE to 'listed' does), so this case passes only through the guard's
   "changes nothing" branch. */
await expectThrough(
  "0050 an UPDATE that changes nothing goes through where no exception would (published race_publication, status = status)",
  "UPDATE race_publication SET status = status WHERE race_id='r-pub';",
  { setup: "DO $$ BEGIN IF (SELECT status FROM race_publication WHERE race_id='r-pub') <> 'published' THEN RAISE EXCEPTION 'fixture: r-pub is not published'; END IF; END $$;" }
);
await expectFrozen(
  "0050 a new race row is refused",
  "INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES ('r-freeze','X','state','general','{}');"
);
await expectThrough(
  "0050 a source INSERT goes through (news intake's outlet rows)",
  `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
   VALUES ('s-freeze-new', 'https://example.news/freeze', 'example.news/freeze', 'Example News', 'factual_reporting', 'unrated');`
);
await expectThrough(
  "0050 an upsert that changes nothing goes through, even on a cited source",
  `INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag)
   VALUES ('s1', 'https://example.gov/a', 'example.gov/a', 'Example Gov', 'primary_doc', 'N/A')
   ON CONFLICT (url_norm) DO UPDATE SET publisher = EXCLUDED.publisher;`
);
await expectFrozen(
  "0050 an UPDATE of a source cited by claim_source is refused",
  "UPDATE source SET publisher = 'Changed' WHERE source_id = 's1';"
);
await expectFrozen(
  "0050 an UPDATE of a source cited by measure_resource is refused",
  "UPDATE source SET publisher = 'Changed' WHERE source_id = 's-gov';"
);
await expectThrough(
  "0050 an UPDATE of a source nothing cites goes through",
  "UPDATE source SET publisher = 'Changed' WHERE source_id = 'src-early-test';"
);
/* DELETE and INSERT on the row-guarded tables. Each target row is one
   nothing references (made in setup where needed), so the freeze is the only
   thing that can refuse it. */
const FREEZE_RACE = "INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES ('r-freeze-row','X','state','general','{}');";
await expectFrozen(
  "0050 a DELETE of a race_publication row is refused",
  "DELETE FROM race_publication WHERE race_id = 'r-pub';"
);
await expectFrozen(
  "0050 a DELETE of a measure_publication row is refused",
  "DELETE FROM measure_publication WHERE measure_id = 'm-skew';"
);
await expectFrozen(
  "0050 an INSERT of a race_publication row with status 'listed' is refused",
  "INSERT INTO race_publication (race_id, status) VALUES ('r-freeze-row', 'listed');",
  { setup: FREEZE_RACE }
);
await expectFrozen(
  "0050 a DELETE of a candidate is refused",
  "DELETE FROM candidate WHERE candidate_id = 'c-freeze-row';",
  {
    setup: `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status)
            VALUES ('c-freeze-row','Freeze Probe','NPA','Governor','qualified');`,
  }
);
await expectFrozen(
  "0050 an INSERT of a candidate is refused",
  `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status)
   VALUES ('c-freeze-row','Freeze Probe','NPA','Governor','qualified');`
);
await expectFrozen(
  "0050 a DELETE of a race is refused",
  "DELETE FROM race WHERE race_id = 'r-freeze-row';",
  { setup: FREEZE_RACE }
);
await expectFrozen(
  "0050 a DELETE of a source cited by claim_source is refused",
  "DELETE FROM source WHERE source_id = 's1';"
);
await expectFrozen(
  "0050 a DELETE of a source cited by measure_resource is refused",
  "DELETE FROM source WHERE source_id = 's-gov';"
);
await expectFrozen("0050 TRUNCATE zip_district is refused", "TRUNCATE zip_district;");
await expectFrozen("0050 TRUNCATE race_publication is refused", "TRUNCATE race_publication;");
for (const t of STATEMENT_GUARDED) {
  await expectFrozen(`0050 even a zero-row DELETE on ${t} is refused`, `DELETE FROM ${t} WHERE false;`);
}
await expectThrough(
  "0050 election_event is not guarded (a date correction is never slowed)",
  "UPDATE election_event SET verified_by = 'probe@example.com' WHERE county_fips = '12099';"
);

/* The bounds, each inside one transaction, where now() is fixed: starts_at
   is inclusive and ends_at exclusive, as inWindow() in
   scripts/freeze-manifest.ts. */
await expectFrozen("0050 a window that starts exactly at now() is open", CLAIM_INSERT, {
  setup: "UPDATE content_freeze SET (starts_at, ends_at) = (now(), now() + interval '1 hour') WHERE id = 1;",
});
await expectThrough("0050 a window that ends exactly at now() is closed", CLAIM_INSERT, {
  setup: "UPDATE content_freeze SET (starts_at, ends_at) = (now() - interval '1 hour', now()) WHERE id = 1;",
});

/* Outside the window. */
await setFreezeWindow("future");
await expectThrough(
  "0050 before the window, cap_tool_wrapper's INSERT into claim goes through (no permission error on content_freeze)",
  CLAIM_INSERT,
  { role: "cap_tool_wrapper" }
);
await setFreezeWindow("past");
for (const [what, sql] of [
  ["an INSERT into claim", CLAIM_INSERT],
  ["a profile audit update", PROFILE_HOLD],
  ["a race office change", "UPDATE race SET office = 'Governor (changed)' WHERE race_id='r-pub';"],
  ["a publish", "SELECT set_race_publication('r-listed','published','op@example.com','after the freeze');"],
  ["an UPDATE of a cited source", "UPDATE source SET publisher = 'Changed' WHERE source_id = 's1';"],
  ["TRUNCATE zip_district", "TRUNCATE zip_district;"],
]) {
  await expectThrough(`0050 after the window, ${what} goes through`, sql);
}

/* Re-running 0050 (it is idempotent) keeps a window that was moved and
   takes back an EXECUTE granted by name since. A fresh replay cannot show
   the second: this harness grants functions by default only to anon,
   authenticated and service_role, so cap_tool_wrapper and cap_readonly have
   nothing to lose there. Rolled back. */
await check("0050 a re-run keeps an existing content_freeze row and revokes EXECUTE by name again", async () => {
  const sql = await readFile(path.join(migrationsDir, "0050_content_freeze.sql"), "utf8");
  await db.exec("BEGIN;");
  try {
    await db.exec(`
      UPDATE content_freeze
         SET (starts_at, ends_at, note) = ('2030-01-01 00:00+00', '2030-01-02 00:00+00', 'moved by the re-run probe')
       WHERE id = 1;
      GRANT EXECUTE ON FUNCTION public.refuse_during_content_freeze()
        TO PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;`);
    await db.exec(sql);
    const r = await db.query(
      `SELECT (SELECT count(*)::int FROM content_freeze) AS n,
              (SELECT starts_at = '2030-01-01 00:00+00' AND ends_at = '2030-01-02 00:00+00'
                      AND note = 'moved by the re-run probe'
                 FROM content_freeze WHERE id = 1) AS kept,
              (SELECT coalesce(array_agg(CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END), '{}')
                 FROM pg_proc p, aclexplode(p.proacl) a
                WHERE p.proname = 'refuse_during_content_freeze'
                  AND a.privilege_type = 'EXECUTE'
                  AND (a.grantee = 0 OR pg_get_userbyid(a.grantee) IN
                       ('anon', 'authenticated', 'cap_tool_wrapper', 'cap_readonly'))) AS leaked;`
    );
    const g = r.rows[0];
    if (g.n !== 1 || g.kept !== true) throw new Error(`window not kept: ${JSON.stringify(g)}`);
    if (g.leaked.length !== 0) throw new Error(`EXECUTE still granted to ${g.leaked.join(", ")}`);
  } finally {
    await db.exec("ROLLBACK;");
  }
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll migration + RLS checks passed.");
