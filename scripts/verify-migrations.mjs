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
  INSERT INTO news_item (candidate_id, race_id, item_type, title, url) VALUES
    ('c-pub', 'r-pub', 'candidate_news', 'Filing shows X.', 'https://example.gov/story-1');
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

await db.exec("RESET ROLE;");

/* Service role bypasses RLS for its two legitimate write paths. */
await db.exec("SET ROLE service_role;");
await check("service_role reads voting_info_subscription", async () => {
  const r = await db.query("SELECT count(*)::int AS n FROM voting_info_subscription;");
  if (r.rows[0].n !== 1) throw new Error(`count ${r.rows[0].n}`);
});

/* 0005_refresh_agents constraint probes, run as service_role (the role
   R1/R2/R3 write through). The fixture already has a news_item row with
   candidate_id='c-pub' and url='https://example.gov/story-1'; re-inserting
   the same (url, candidate_id) pair must hit uq_news_item_url_candidate. */
await expectConstraintViolation(
  "unique index rejects duplicate (url, candidate_id) news_item",
  `INSERT INTO news_item (candidate_id, race_id, item_type, title, url)
   VALUES ('c-pub', 'r-pub', 'candidate_news', 'Filing shows X (dup).', 'https://example.gov/story-1');`,
  /duplicate key value violates unique constraint "uq_news_item_url_candidate"/
);
await expectConstraintViolation(
  "item_type CHECK rejects an unknown item_type",
  `INSERT INTO news_item (item_type, title, url)
   VALUES ('candidate_endorsement', 'x', 'https://example.gov/story-2');`,
  /violates check constraint "news_item_item_type_check"/
);
await db.exec("RESET ROLE;");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll migration + RLS checks passed.");
