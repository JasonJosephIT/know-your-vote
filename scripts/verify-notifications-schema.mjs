/* Guardrail for the notification backbone (plan A8) — two sections:

   DRY RUN (always, no env needed): the pure due-today matcher the cron
   route uses (src/lib/notifications/schedule.ts) against fixture events —
   T-7 / T-1 / day-of matching, nothing due on other days, dedupe_key
   format. This is the "route logic against a fake sender" check: the only
   code between dueReminders() and Resend is claim + render, both covered
   elsewhere (claim: idempotency probes; render: verify-notification-
   templates.ts).

   LIVE (when Supabase env is present; fail-closed if migration 0007 is
   missing — mirrors verify-refresh-schema.mjs):
     1. election_event and notification_send_log exist.
     2. RLS: anon can neither SELECT nor INSERT either table.
     3. send-log claim idempotency: the same dedupe_key upserts once;
        the second ignoreDuplicates upsert returns no row (the cron's
        skip-duplicate signal). Synthetic key, deleted in finally.
     4. Informational: seeded event count and verified count (0 verified
        means F4 hasn't run — nothing can send, by design).

   Run: node scripts/verify-notifications-schema.mjs */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dueReminders } from "../src/lib/notifications/schedule.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envLocal = path.join(root, ".env.local");
if (existsSync(envLocal)) {
  process.loadEnvFile(envLocal);
}

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* ---- dry run ---------------------------------------------------------- */

const EVENTS = [
  {
    id: "e1",
    event_type: "registration_deadline",
    election: "general_2026",
    event_date: "2026-10-05",
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
  {
    id: "e2",
    event_type: "election_day",
    election: "general_2026",
    event_date: "2026-11-03",
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
];

const t7 = dueReminders(EVENTS, "2026-09-28");
check(
  "T-7: registration reminder due 7 days out",
  t7.length === 1 && t7[0].template_id === "reg_deadline_t7",
  JSON.stringify(t7)
);
const t1 = dueReminders(EVENTS, "2026-10-04");
check(
  "T-1: registration reminder due the day before",
  t1.length === 1 && t1[0].template_id === "reg_deadline_t1",
  JSON.stringify(t1)
);
const dayOf = dueReminders(EVENTS, "2026-11-03");
check(
  "day-of: election-day reminder due on the day",
  dayOf.length === 1 && dayOf[0].template_id === "election_day",
  JSON.stringify(dayOf)
);
check("quiet day: nothing due", dueReminders(EVENTS, "2026-09-01").length === 0);
check(
  "dedupe_key format",
  t7[0]?.dedupe_key === "general_2026:registration_deadline:T-7:email",
  t7[0]?.dedupe_key
);

/* ---- live probes ------------------------------------------------------ */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.log(
    "\n(skipping live probes — Supabase env not set; dry-run checks only)"
  );
  if (failures > 0) process.exit(1);
  console.log("\nNotification schema checks passed (dry run).");
  process.exit(0);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const service = createClient(url, serviceKey, { auth: { persistSession: false } });

/* Gate: migration applied? */
const gate = await service.from("notification_send_log").select("dedupe_key", { head: true, count: "exact" });
if (gate.error) {
  console.error(
    `\nFAIL  migration 0007_notifications not applied to the live project\n      ${gate.error.message}\n      Apply supabase/migrations/0007_notifications.sql (and 0008) first.`
  );
  process.exit(1);
}
console.log("  ok  migration 0007 applied (notification_send_log reachable)");

for (const table of ["election_event", "notification_send_log"]) {
  const read = await anon.from(table).select("*").limit(1);
  check(
    `anon cannot read ${table}`,
    !!read.error || (read.data ?? []).length === 0,
    read.error?.message ?? `saw ${read.data?.length} rows`
  );
}
const anonInsert = await anon
  .from("notification_send_log")
  .insert({ dedupe_key: "verify-notifications-schema:anon-probe" });
check("anon cannot insert notification_send_log", !!anonInsert.error);

const PROBE_KEY = "verify-notifications-schema:probe";
try {
  const first = await service
    .from("notification_send_log")
    .upsert({ dedupe_key: PROBE_KEY }, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("dedupe_key");
  check(
    "service claim inserts once",
    !first.error && first.data?.length === 1,
    first.error?.message
  );
  const second = await service
    .from("notification_send_log")
    .upsert({ dedupe_key: PROBE_KEY }, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("dedupe_key");
  check(
    "duplicate claim returns no row (cron skips)",
    !second.error && second.data?.length === 0,
    second.error?.message ?? `saw ${second.data?.length} rows`
  );
} finally {
  await service.from("notification_send_log").delete().eq("dedupe_key", PROBE_KEY);
}

const seeded = await service
  .from("election_event")
  .select("id", { head: true, count: "exact" });
const verified = await service
  .from("election_event")
  .select("id", { head: true, count: "exact" })
  .not("verified_by", "is", null);
console.log(
  `  info seeded election_event rows: ${seeded.count ?? "?"}; verified (sendable): ${verified.count ?? "?"}${(verified.count ?? 0) === 0 ? " — F4 pending, nothing can send" : ""}`
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nNotification schema checks passed.");
