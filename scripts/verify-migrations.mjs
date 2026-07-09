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
  INSERT INTO news_item (candidate_id, race_id, item_type, title, url) VALUES
    ('c-pub', 'r-pub', 'candidate_news', 'Filing shows X.', 'https://example.gov/story-1');
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

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll migration + RLS checks passed.");
