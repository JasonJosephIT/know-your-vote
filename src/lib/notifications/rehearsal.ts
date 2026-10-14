import type { SupabaseClient } from "@supabase/supabase-js";
import { functionMissing } from "./rpc-fallback.ts";

/* The one subscription a rehearsal mails: send-reminders' and
   send-correction's REHEARSAL mode send the real email to one address,
   and only to one that already holds an active subscription
   (src/app/api/cron/send-reminders/route.ts has the why). Both routes
   used to look that address up with .in("email", ...), which put it in a
   Supabase request URL, and the API gateway logs those. The lookup now
   goes through subscription_for_rehearsal (migration 0058), whose
   arguments travel in the request body; until 0058 is applied it falls
   back to the query it replaced (./rpc-fallback.ts).

   Signups are stored lower-cased; the exact spelling is tried too, for any
   row saved before that. When an address holds two active rows (two
   ZIPs), the first in token order is returned, in both paths: the order
   the scheduled send reads the cohort in (cohort.ts), where an address's
   first row is the one mailed. The lookup used to take whichever row
   PostgREST returned first.

   No server-only and no @/ imports, so scripts/verify-request-urls.ts can
   run it in plain Node. */

export type RehearsalSubscription = {
  email: string;
  unsubscribe_token: string;
  zip5: string;
};

/* null when no active subscription holds the address. Throws on a
   database error. */
export async function rehearsalSubscription(
  service: SupabaseClient,
  to: string
): Promise<RehearsalSubscription | null> {
  const spellings = [...new Set([to, to.toLowerCase()])];
  const viaFunction = await service.rpc("subscription_for_rehearsal", {
    p_emails: spellings,
  });
  if (!functionMissing("subscription_for_rehearsal", viaFunction.error)) {
    if (viaFunction.error) throw new Error(viaFunction.error.message);
    return ((viaFunction.data ?? []) as RehearsalSubscription[])[0] ?? null;
  }
  /* Before 0058: the same read, with the address in the URL. */
  const { data, error } = await service
    .from("voting_info_subscription")
    .select("email, unsubscribe_token, zip5")
    .in("email", spellings)
    .eq("active", true)
    .order("unsubscribe_token")
    .limit(1);
  if (error) throw new Error(error.message);
  return ((data ?? []) as RehearsalSubscription[])[0] ?? null;
}
