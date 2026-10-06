import type { SupabaseClient } from "@supabase/supabase-js";

/* One welcome email per address per 24 hours.

   POST /api/voting-info saves the subscription and used to send the
   welcome email every time. Anyone could make the site mail any address
   five times a minute per IP, and more than that across serverless
   instances, since the rate limit (src/lib/rate-limit.ts) is kept in each
   instance's memory. Every one of those emails spends Resend's quota (100
   a day on the free plan), and each lands with someone who may never have
   asked, which is how a sending domain collects spam complaints.

   So the route asks this first. While any row for the address had an
   email stamped in the last 24 hours, the subscription is still saved (or
   switched back on), nothing is sent, and the answer is the same
   { ok: true } a send gets: the endpoint never says whether an address is
   already subscribed.

   What counts as an email here is voting_info_subscription.last_sent_at,
   and only the welcome email sets it, once Resend accepts it. Neither cron
   writes the column (send-reminders and send-correction never touch it),
   so a reminder does not count. It does not need to: only this endpoint
   can be made to send by a stranger.

   Known limits, accepted for now. The read and the send are not one step,
   so requests that arrive together, before the first send is stamped, can
   each send: a burst once a day, held down by the rate limit, rather than
   a stream. The match is the exact (lower-cased) address, so plus and dot
   variants of one Gmail inbox count separately. And a skipped send
   answers sooner than a real one, which careful timing could notice.

   No server-only and no @/ imports, so scripts/verify-welcome-throttle.ts
   can run it in plain Node. */

export const WELCOME_WINDOW_MS = 24 * 60 * 60 * 1000;

/* Whether any row for the address has last_sent_at in the 24 hours before
   `now`. Any row: a voter who signed up from two ZIPs holds two, and
   switching ZIPs must not reset the clock. Exact match, as the unsubscribe
   route does: the signup stores the address trimmed and lower-cased, and
   ilike would read "_" as a wildcard. A NULL last_sent_at (never mailed,
   or the send failed) never matches. Throws on a read error. */
export async function welcomeSentWithinWindow(
  service: SupabaseClient,
  email: string,
  now: Date = new Date()
): Promise<boolean> {
  const since = new Date(now.getTime() - WELCOME_WINDOW_MS).toISOString();
  const { data, error } = await service
    .from("voting_info_subscription")
    .select("id")
    .eq("email", email)
    .gte("last_sent_at", since)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
