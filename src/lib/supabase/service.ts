import "server-only";

import { createClient } from "@supabase/supabase-js";

/* Service-role client — bypasses RLS. Import only from server code
   (route handlers, server actions, cron). The "server-only" import makes
   any client-bundle inclusion a build error. Used exclusively for the two
   app-owned write paths: voting_info_subscription upserts and news_item
   rows from the daily cron. Never writes pipeline-owned tables. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — server-side writes are unavailable."
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
