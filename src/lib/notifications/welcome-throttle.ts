import type { SupabaseClient } from "@supabase/supabase-js";
import { functionMissing } from "./rpc-fallback.ts";

/* One welcome email per address and ZIP per 24 hours, and at most
   WELCOME_DAILY_CAP per address.

   POST /api/voting-info saves the subscription and used to send the
   welcome email every time. Anyone could make the site mail any address
   five times a minute per IP, and more than that across serverless
   instances, since the rate limit (src/lib/rate-limit.ts) is kept in each
   instance's memory. Every one of those emails spends Resend's quota (100
   a day on the free plan), and each lands with someone who may never have
   asked, which is how a sending domain collects spam complaints.

   So the route asks this first. While the same address and ZIP had a
   welcome stamped in the last 24 hours, or the address already had
   WELCOME_DAILY_CAP of them, the subscription is still saved (or switched
   back on), nothing is sent, and the answer has the same status and body
   ({ ok: true }) a send gets. A different ZIP still gets its own email:
   a voter who fixes a mistyped ZIP needs the right county's offices and
   dates, not the email for the wrong one (review, 2026-10-06). The cap
   keeps that from reopening the flood by cycling ZIPs.

   What counts as an email here is voting_info_subscription.last_sent_at,
   and only the welcome email sets it (markWelcomeSent, below), once Resend
   accepts it. Neither cron writes the column (send-reminders and
   send-correction never touch it), so a reminder does not count. It does
   not need to: only this endpoint can be made to send by a stranger.

   Both the read and the stamp go through SQL functions from migration
   0058 (subscription_welcomed_zips, subscription_mark_welcomed), so the
   address and the unsubscribe token travel in a request body, not in a
   Supabase request URL, which the API gateway logs. Until 0058 is applied
   each falls back to the query it replaced (./rpc-fallback.ts).

   Known limits, accepted for now. The read and the send are not one step,
   so requests that arrive together, before the first send is stamped, can
   each send: a burst once a day, held down by the rate limit, rather than
   a stream. The match is the exact (lower-cased) address, so plus and dot
   variants of one Gmail inbox count separately. And a skipped send
   answers sooner than a real one (it skips the date read and the Resend
   call), and a check that fails answers the 502 a failed send does, so
   response time, or a 502 while Resend is refusing sends, can still show
   that an address was mailed a welcome in the last day.

   No server-only and no @/ imports, so scripts/verify-welcome-throttle.ts
   can run it in plain Node. */

export const WELCOME_WINDOW_MS = 24 * 60 * 60 * 1000;

/* Welcomes one address can be sent in a day, across ZIPs. Rows are unique
   on (email, zip5), so this also bounds what cycling ZIPs can send. */
export const WELCOME_DAILY_CAP = 3;

/* Whether to skip the welcome: this address and ZIP already had one in the
   24 hours before `now`, or the address had WELCOME_DAILY_CAP across its
   ZIPs. Exact match on the address, as the unsubscribe route does: the
   signup stores it trimmed and lower-cased, and ilike would read "_" as a
   wildcard. A NULL last_sent_at (never mailed, or the send failed) never
   matches. Throws on a read error. */
export async function welcomeSentWithinWindow(
  service: SupabaseClient,
  email: string,
  zip5: string,
  now: Date = new Date()
): Promise<boolean> {
  const since = new Date(now.getTime() - WELCOME_WINDOW_MS).toISOString();
  const rows = await welcomedZips(service, email, since);
  return rows.length >= WELCOME_DAILY_CAP || rows.some((r) => r.zip5 === zip5);
}

/* The address's rows stamped since `since`, up to the cap. */
async function welcomedZips(
  service: SupabaseClient,
  email: string,
  since: string
): Promise<{ zip5: string }[]> {
  const viaFunction = await service.rpc("subscription_welcomed_zips", {
    p_email: email,
    p_since: since,
    p_limit: WELCOME_DAILY_CAP,
  });
  if (!functionMissing("subscription_welcomed_zips", viaFunction.error)) {
    if (viaFunction.error) throw new Error(viaFunction.error.message);
    return (viaFunction.data ?? []) as { zip5: string }[];
  }
  /* Before 0058: the same read, with the address in the URL. */
  const { data, error } = await service
    .from("voting_info_subscription")
    .select("zip5")
    .eq("email", email)
    .gte("last_sent_at", since)
    .limit(WELCOME_DAILY_CAP);
  if (error) throw new Error(error.message);
  return (data ?? []) as { zip5: string }[];
}

/* The stamp welcomeSentWithinWindow reads, on the subscription the welcome
   was sent for, once Resend accepted it. Best-effort, as it always was:
   if it fails, the next signup for this address sends again. It never
   throws, because the email has already gone and the voter must not be
   told it failed. */
export async function markWelcomeSent(
  service: SupabaseClient,
  unsubscribeToken: string,
  sentAt: Date = new Date()
): Promise<void> {
  const stamp = sentAt.toISOString();
  try {
    const viaFunction = await service.rpc("subscription_mark_welcomed", {
      p_token: unsubscribeToken,
      p_sent_at: stamp,
    });
    if (!functionMissing("subscription_mark_welcomed", viaFunction.error)) {
      return;
    }
    /* Before 0058: the same update, with the token in the URL. */
    await service
      .from("voting_info_subscription")
      .update({ last_sent_at: stamp })
      .eq("unsubscribe_token", unsubscribeToken);
  } catch {
    /* Best-effort (above). */
  }
}
