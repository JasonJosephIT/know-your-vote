/* Guardrail for migration 0005_refresh_agents.sql against the LIVE Supabase
   project (contrast with verify-migrations.mjs, which runs the same-shaped
   probes against an embedded Postgres). Checks required by
   CAP_Refresh_Agents_Plan §7:

     1. Migration applied: candidate_contact exists; news_item.candidate_id
        exists; race.info_last_verified_at and candidate.site_last_verified_at
        exist.
     2. The unique index rejects a duplicate (url, candidate_id) news_item
        insert.
     3. The item_type CHECK rejects an unknown item_type.
     4. RLS: anon can SELECT but cannot INSERT on news_item AND
        candidate_contact.

   Check 1 runs first and gates the rest: if migration 0005 has not been
   applied yet, checks 2-4 would be probing tables/columns that partially
   don't exist, so this script fails closed immediately with a clear message
   instead of attempting them (mirrors verify-migrations.mjs's own
   fail-fast-on-migration-failure behavior).

   Uses NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY for the
   anon-role probes and SUPABASE_SERVICE_ROLE_KEY for the two failing-by-
   design write probes (2 and 3) — the role R1/R2/R3 actually write through
   in production. Checks 2 and 3 use an obviously-synthetic id/url and
   delete it in a finally block so no test data is left behind on success
   OR failure.

   Run: node scripts/verify-refresh-schema.mjs */

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

/* Fail closed if a credential is genuinely unavailable — never silently
   skip a check for lack of a key (brief Requirement 5). This is checked
   lazily per key rather than all up front: check 1 only needs the anon key,
   so a missing service-role key must not mask the (expected, today)
   "migration not applied" failure behind an unrelated env error. */
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
const ANON_KEY = requireEnvOrFailClosed("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const anon = createClient(SUPABASE_URL, ANON_KEY);

/* ---- Check 1: migration applied -----------------------------------------
   PostgREST surfaces an undefined column as Postgres error code 42703 and
   an undefined table as its own schema-cache-miss code PGRST205 — both
   observed directly against this project's live schema before migration
   0005 exists. Any other error is unexpected and should not be swallowed. */
const MIGRATION_NOT_APPLIED = /^(42703|42P01|PGRST20[45])$/;

async function objectMissing(query) {
  const { error } = await query;
  if (!error) return false;
  if (MIGRATION_NOT_APPLIED.test(error.code)) return true;
  throw new Error(`unexpected error (code ${error.code}): ${error.message}`);
}

const missingObjects = [];
if (await objectMissing(anon.from("candidate_contact").select("candidate_id").limit(1))) {
  missingObjects.push("candidate_contact");
}
if (await objectMissing(anon.from("news_item").select("candidate_id").limit(1))) {
  missingObjects.push("news_item.candidate_id");
}
if (await objectMissing(anon.from("race").select("info_last_verified_at").limit(1))) {
  missingObjects.push("race.info_last_verified_at");
}
if (await objectMissing(anon.from("candidate").select("site_last_verified_at").limit(1))) {
  missingObjects.push("candidate.site_last_verified_at");
}

if (missingObjects.length > 0) {
  console.error(
    `FAIL  migration 0005 not applied: ${missingObjects.join(", ")} missing\n` +
      `      Apply supabase/migrations/0005_refresh_agents.sql to this project, then re-run.`
  );
  process.exit(1);
}
console.log("  ok  migration 0005 applied: candidate_contact, news_item.candidate_id, " +
  "race.info_last_verified_at, candidate.site_last_verified_at all present");

/* Checks 2 and 3 need to write (as the role R1/R2/R3 write through in
   production), so the service-role key is only required from here on —
   requiring it up front would mask check 1's "not applied yet" result
   behind an unrelated missing-env-var error whenever the schema also
   isn't ready yet (as it genuinely isn't in this environment today). */
const SERVICE_KEY = requireEnvOrFailClosed("SUPABASE_SERVICE_ROLE_KEY");
const service = createClient(SUPABASE_URL, SERVICE_KEY);

/* ---- Checks 2 & 3: failing-by-design writes, cleaned up in finally ------ */

const SYNTH_URL = "https://zzz-verify-refresh-schema.example/synthetic-probe";
let synthNewsItemId = null;

await check("unique index rejects duplicate (url, candidate_id) news_item", async () => {
  try {
    const seed = await service
      .from("news_item")
      .insert({
        item_type: "candidate_news",
        title: "zzz-synthetic verify-refresh-schema probe (safe to delete)",
        url: SYNTH_URL,
        candidate_id: null,
      })
      .select("id")
      .single();
    if (seed.error) {
      throw new Error(`could not seed probe row: ${seed.error.message}`);
    }
    synthNewsItemId = seed.data.id;

    const dup = await service.from("news_item").insert({
      item_type: "candidate_news",
      title: "zzz-synthetic verify-refresh-schema duplicate probe",
      url: SYNTH_URL,
      candidate_id: null,
    });
    if (!dup.error) {
      throw new Error("duplicate (url, candidate_id) insert succeeded but should have been rejected");
    }
    if (dup.error.code !== "23505") {
      throw new Error(`unexpected error (code ${dup.error.code}): ${dup.error.message}`);
    }
  } finally {
    if (synthNewsItemId) {
      await service.from("news_item").delete().eq("id", synthNewsItemId);
    }
  }
});

await check("item_type CHECK rejects an unknown item_type", async () => {
  const bad = await service.from("news_item").insert({
    item_type: "zzz-synthetic-not-a-real-type",
    title: "zzz-synthetic verify-refresh-schema check-constraint probe",
    url: "https://zzz-verify-refresh-schema.example/check-probe",
  });
  // Nothing to delete: a rejected insert never persists a row.
  if (!bad.error) {
    // Defensive cleanup in the unexpected case the insert actually succeeded.
    await service
      .from("news_item")
      .delete()
      .eq("url", "https://zzz-verify-refresh-schema.example/check-probe");
    throw new Error("unknown item_type insert succeeded but should have been rejected");
  }
  if (bad.error.code !== "23514") {
    throw new Error(`unexpected error (code ${bad.error.code}): ${bad.error.message}`);
  }
});

/* ---- Check 4: RLS — anon SELECT yes, INSERT no, on both tables --------- */

await check("anon can SELECT news_item", async () => {
  const r = await anon.from("news_item").select("id").limit(1);
  if (r.error) throw new Error(`anon SELECT news_item failed: ${r.error.message}`);
});

await check("anon cannot INSERT news_item", async () => {
  const r = await anon.from("news_item").insert({
    item_type: "official_link",
    title: "zzz-synthetic anon RLS probe (should be rejected)",
  });
  if (!r.error) {
    await anon
      .from("news_item")
      .delete()
      .eq("title", "zzz-synthetic anon RLS probe (should be rejected)");
    throw new Error("anon insert into news_item succeeded but should have been denied by RLS");
  }
  if (!/permission denied|row-level security/i.test(r.error.message)) {
    throw new Error(`unexpected error: ${r.error.message}`);
  }
});

await check("anon can SELECT candidate_contact", async () => {
  const r = await anon.from("candidate_contact").select("candidate_id").limit(1);
  if (r.error) throw new Error(`anon SELECT candidate_contact failed: ${r.error.message}`);
});

await check("anon cannot INSERT candidate_contact", async () => {
  const r = await anon.from("candidate_contact").insert({
    candidate_id: "zzz-synthetic-anon-probe-should-be-rejected",
    source_url: "https://zzz-verify-refresh-schema.example/rls-probe",
  });
  if (!r.error) {
    await service
      .from("candidate_contact")
      .delete()
      .eq("candidate_id", "zzz-synthetic-anon-probe-should-be-rejected");
    throw new Error("anon insert into candidate_contact succeeded but should have been denied by RLS");
  }
  if (!/permission denied|row-level security/i.test(r.error.message)) {
    throw new Error(`unexpected error: ${r.error.message}`);
  }
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll refresh-schema checks passed.");
