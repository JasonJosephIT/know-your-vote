/* Guardrail for migration 0006_admin_ops.sql against the LIVE Supabase project
   (contrast with verify-migrations.mjs, which proves the same schema against an
   embedded Postgres). This is the ops-plane sibling of verify-refresh-schema.mjs.

   Checks:
     1. Migration applied: agent_run, agent_run_request, review_item,
        admin_action all exist. Detected with the SERVICE role, because the ops
        plane grants anon nothing — anon literally cannot see these tables.
     2. Lockdown: the anon role is denied both SELECT and INSERT on all four
        tables (REVOKE ALL + RLS with no policy). This is the invariant that
        keeps the ops plane off the voter surface.

   Check 1 runs first and gates check 2: until the founder applies 0006, the
   tables don't exist, so this script fails closed immediately with a clear
   "0006 not applied" message (mirrors verify-refresh-schema.mjs). That failure
   is the EXPECTED state today — do not treat it as a regression.

   Deliberately READ-ONLY. verify-refresh-schema.mjs can safely seed-and-delete
   synthetic news_item rows to provoke its unique-index/CHECK violations because
   nothing consumes news_item automatically. The ops plane is different: a
   pending agent_run_request is picked up and EXECUTED by the cap-r0-dispatcher
   (design.md § 5). So this live guardrail never writes ops rows — the
   duplicate-live-request index, the status/kind CHECKs, and the
   authenticated-role denial are all proven exhaustively in the disposable
   embedded harness (verify-migrations.mjs invariants 10-13) instead.

   Uses SUPABASE_SERVICE_ROLE_KEY for check 1 (existence) and
   NEXT_PUBLIC_SUPABASE_ANON_KEY for check 2 (the anon-denial probes).

   Run: node scripts/verify-admin-ops.mjs */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envLocal = path.join(root, ".env.local");
if (existsSync(envLocal)) {
  process.loadEnvFile(envLocal);
}

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

/* Fail closed if a credential is genuinely unavailable — never silently skip a
   check for lack of a key. Checked lazily per key: check 1 needs only the URL
   and service key, so a missing anon key must not mask the (expected, today)
   "migration not applied" result behind an unrelated env error. */
function requireEnvOrFailClosed(name) {
  const value = process.env[name];
  if (!value) {
    console.error(
      `FAIL  environment: ${name} is not set (checked process env and ${envLocal}). ` +
        `Cannot run this script's live checks without it.`
    );
    process.exit(1);
  }
  return value;
}

const SUPABASE_URL = requireEnvOrFailClosed("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = requireEnvOrFailClosed("SUPABASE_SERVICE_ROLE_KEY");
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const OPS_TABLES = ["agent_run", "agent_run_request", "review_item", "admin_action"];

/* ---- Check 1: migration applied -----------------------------------------
   PostgREST surfaces an undefined table as its schema-cache-miss code
   PGRST205 (and Postgres 42P01 for direct undefined-table errors). Any other
   error is unexpected and must not be swallowed. */
const TABLE_MISSING = /^(42P01|PGRST20[45])$/;

async function tableMissing(table) {
  const { error } = await service.from(table).select("id").limit(1);
  if (!error) return false;
  if (TABLE_MISSING.test(error.code)) return true;
  throw new Error(`unexpected error probing ${table} (code ${error.code}): ${error.message}`);
}

const missing = [];
for (const table of OPS_TABLES) {
  if (await tableMissing(table)) missing.push(table);
}

if (missing.length > 0) {
  console.error(
    `FAIL  migration 0006 not applied: ${missing.join(", ")} missing\n` +
      `      Apply supabase/migrations/0006_admin_ops.sql to this project, then re-run.`
  );
  process.exit(1);
}
console.log(`  ok  migration 0006 applied: ${OPS_TABLES.join(", ")} all present`);

/* ---- Check 2: lockdown — anon denied SELECT and INSERT on every ops table -
   Only needed once 0006 is applied, so the anon key is required from here on
   (requiring it up front would mask check 1's "not applied yet" result behind
   an unrelated missing-env error). */
const ANON_KEY = requireEnvOrFailClosed("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* A denied request surfaces as either a Postgres permission error (42501) or,
   because anon has zero privileges, PostgREST omitting the table from anon's
   schema cache (PGRST205/PGRST106). Crucially, because SELECT is REVOKEd (not
   merely RLS-filtered), a denied SELECT returns an ERROR rather than an empty
   success — so "no error" here means the lockdown has a hole. */
const DENIED = /^(42501|PGRST20[456]|PGRST301)$/;

function assertDenied(verb, table, error, data) {
  if (!error) {
    throw new Error(
      `anon ${verb} ${table} was NOT denied (returned ${JSON.stringify(data) ?? "no error"}) — ops plane is exposed`
    );
  }
  if (!DENIED.test(error.code) && !/permission denied|not.*find.*table|row-level security/i.test(error.message)) {
    throw new Error(`unexpected error (code ${error.code}): ${error.message}`);
  }
}

/* Minimal INSERT bodies — a denied insert never persists a row, so nothing to
   clean up, and the column set only needs to satisfy the client. */
const ANON_INSERT = {
  agent_run: { agent: "R1" },
  agent_run_request: { agent: "R1" },
  review_item: { kind: "manual_news", source: "operator", payload: {} },
  admin_action: {
    actor: "zzz-synthetic-anon-probe",
    action: "trigger",
    subject_kind: "review_item",
    subject_id: "00000000-0000-0000-0000-000000000000",
  },
};

for (const table of OPS_TABLES) {
  await check(`anon cannot SELECT ${table}`, async () => {
    const { data, error } = await anon.from(table).select("id").limit(1);
    assertDenied("SELECT", table, error, data);
  });
  await check(`anon cannot INSERT ${table}`, async () => {
    const { data, error } = await anon.from(table).insert(ANON_INSERT[table]);
    assertDenied("INSERT", table, error, data);
  });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll admin-ops guardrail checks passed.");
