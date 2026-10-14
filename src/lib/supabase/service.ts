import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serviceRoleKey } from "@/lib/server-keys";

/* Service-role client — bypasses RLS. Import only from server code
   (route handlers, server actions, cron). The "server-only" import makes
   any client-bundle inclusion a build error.

   Every caller sits behind a gate of its own, because RLS is not one here:
   - the admin console (src/app/admin, src/app/api/admin, src/lib/admin,
     /api/health), behind requireAdmin / adminApiGuard: the ops-plane tables
     anon cannot touch, plus the race/candidate/news_item/source writes an
     approved review item applies;
   - crons behind CRON_SECRET (refresh-news, news-sweep, send-reminders) or
     CORRECTION_SECRET (send-correction): news_item and agent_run inserts,
     the send log, and the subscriber list;
   - the reminder signup and unsubscribe routes, whose
     voting_info_subscription rows anon can never read or write (the
     unsubscribe token is the credential).
   A public read never belongs here: read with createAnonServerClient
   (./server.ts) under an RLS policy, as the home banner and calendar file
   read election_event (0062). */
export function createServiceClient() {
  const key = serviceRoleKey();
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE) is not set — server-side writes are unavailable."
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
