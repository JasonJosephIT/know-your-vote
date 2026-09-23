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
  -- county-scoped fixture row: statewide rows come from 0008_election_seed
  INSERT INTO election_event (county_fips, event_type, election, event_date, details_url) VALUES
    ('12086', 'early_voting_start', 'general_2026', '2026-10-19', 'https://www.miamidade.gov/elections/');
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
  const r = await db.query(`
    SELECT rp.status, rp.published_at,
           (SELECT action FROM admin_action WHERE subject_ref='r-draft'
             ORDER BY created_at DESC, action LIMIT 1) AS latest_action,
           (SELECT count(*)::int FROM admin_action WHERE subject_ref='r-draft') AS n
      FROM race_publication rp WHERE rp.race_id='r-draft';`);
  const g = r.rows[0];
  if (g.status !== "in_review") throw new Error(`status=${g.status}`);
  if (String(g.published_at) !== String(before.rows[0].published_at))
    throw new Error("published_at must survive an unpublish");
  if (g.latest_action !== "unpublish") throw new Error(`latest_action=${g.latest_action}`);
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
  const r = await db.query(`
    SELECT rp.status, rp.published_at,
           (SELECT action FROM admin_action WHERE subject_ref='r-draft'
             ORDER BY created_at DESC, action LIMIT 1) AS latest_action,
           (SELECT detail->>'new_status' FROM admin_action WHERE subject_ref='r-draft'
             AND action='list') AS logged_status,
           (SELECT detail->>'prior_status' FROM admin_action WHERE subject_ref='r-draft'
             AND action='list') AS logged_prior
      FROM race_publication rp WHERE rp.race_id='r-draft';`);
  const g = r.rows[0];
  if (g.status !== "listed") throw new Error(`status=${g.status}`);
  if (String(g.published_at) !== String(before.rows[0].published_at))
    throw new Error("listing must leave published_at alone");
  if (g.latest_action !== "list") throw new Error(`latest_action=${g.latest_action}`);
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

/* 0033: a listed measure is its ballot text alone. Inserted as service_role
   with ZERO arguments -- the balance trigger (0010/0012) checks only
   status = 'published', so this must be accepted. An argument added
   afterwards is still editable (the argument-side trigger guards published
   measures only) and must stay invisible to anon. */
await check("a listed measure with zero arguments is accepted", async () => {
  await db.exec("SET ROLE service_role;");
  try {
    await db.exec(`
      INSERT INTO ballot_measure
        (measure_id, election, number, official_title, ballot_summary, full_text_url,
         placed_by, threshold_pct, jurisdiction, display_order) VALUES
        ('m-listed', 'general_2026', '4', 'Listed Measure', 'Summary.', 'https://example.gov/4', 'legislature', 60, 'FL', 4);
      INSERT INTO measure_publication (measure_id, status) VALUES ('m-listed', 'listed');
      INSERT INTO measure_argument (argument_id, measure_id, side, text, source_id)
        VALUES ('a-l1', 'm-listed', 'support', 'For, unpublished.', 's-m');`);
  } finally {
    await db.exec("RESET ROLE;");
  }
});

await check("anon sees published and listed measures, never draft", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT measure_id FROM ballot_measure ORDER BY measure_id;");
  await db.exec("RESET ROLE;");
  const ids = res.rows.map((r) => r.measure_id).join(",");
  if (ids !== "m-listed,m-pub") {
    throw new Error(`expected m-listed,m-pub, got [${ids}]`);
  }
});

await check("anon sees listed and published measure_publication rows with their status", async () => {
  await db.exec("SET ROLE anon;");
  const res = await db.query("SELECT measure_id, status FROM measure_publication ORDER BY measure_id;");
  await db.exec("RESET ROLE;");
  const got = res.rows.map((r) => `${r.measure_id}:${r.status}`).join(",");
  if (got !== "m-listed:listed,m-pub:published") throw new Error(`saw [${got}]`);
});

/* a-l1 belongs to the listed m-listed: listing exposes the ballot text, never
   the arguments (anon_read_measure_argument is untouched by 0033). */
await check("anon sees arguments only for published measures (not listed, not draft)", async () => {
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

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll migration + RLS checks passed.");
