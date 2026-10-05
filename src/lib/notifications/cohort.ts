import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rendered } from "./templates";

/* Who gets an email, and what every email carries at its foot: the cohort
   helpers the two sending routes share. They moved here verbatim from
   src/app/api/cron/send-reminders/route.ts on 2026-10-05, when the manual
   correction send (src/app/api/cron/send-correction/route.ts) arrived and
   needed the same cohort, the same county scoping and the same unsubscribe
   footer. One copy, so a correction can never reach a different list, or
   carry a different footer, than the reminder it corrects.

   Server-only: everything here reads voting_info_subscription or
   zip_district through the service role. The pure date logic stays in
   ./schedule.ts and ./correction.ts, which Node can load. */

export const BATCH_SIZE = 100;
/* Resend's default API limit is 2 requests per second (per team, when last
   checked). Back-to-back batch calls past 200 recipients could draw a 429,
   which each route's batch loop treats as a failed send: claim released,
   and the manual re-run re-mails everyone already reached. Pacing the calls costs
   about half a second per 100 recipients; at maxDuration 60 that still
   covers several thousand, far above the 2026 cohort. */
export const BATCH_PACING_MS = 600;
const PAGE_SIZE = 1000;
/* The "never mass-send by accident" fuse. The 2026 list is a four-metro
   opt-in cohort; if it ever reads > 50k something upstream is corrupt. */
export const COHORT_FUSE = 50_000;

export type Subscriber = {
  email: string;
  unsubscribe_token: string;
  /* The county whose dates this subscriber gets: their ZIP's county when it
     has rows of its own, otherwise null, the statewide scope. */
  scope: string | null;
};

/* Every active subscription, in token order, with its date scope. Paged
   because PostgREST caps a read at 1000 rows. Throws on any read error:
   the caller has claimed nothing yet, so it can simply stop. */
export async function activeSubscribers(
  service: SupabaseClient,
  count: number,
  countyScopes: string[]
): Promise<Subscriber[]> {
  const rows: { email: string; unsubscribe_token: string; zip5: string }[] = [];
  for (let from = 0; from < count; from += PAGE_SIZE) {
    const { data: page, error } = await service
      .from("voting_info_subscription")
      .select("email, unsubscribe_token, zip5")
      .eq("active", true)
      .order("unsubscribe_token")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(page ?? []));
  }
  const countyOf = await zipCounties(service, rows.map((r) => r.zip5));
  return rows.map((r) => {
    const county = countyOf.get(r.zip5) ?? null;
    return {
      email: r.email,
      unsubscribe_token: r.unsubscribe_token,
      scope: county && countyScopes.includes(county) ? county : null,
    };
  });
}

/* ZIP -> county FIPS from zip_district, for the ZIPs given. Every ZIP in
   the table sits in exactly one county (checked live 2026-10-05: 235 ZIPs,
   none in two). A ZIP missing from the map reads as no county: statewide
   dates. Throws on a read error. */
export async function zipCounties(
  service: SupabaseClient,
  zips: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(zips)];
  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await service
      .from("zip_district")
      .select("zip5, county_fips")
      .in("zip5", unique.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const row of data ?? []) map.set(row.zip5, row.county_fips);
  }
  return map;
}

/* The text every reminder carries. One function for the real send and the
   rehearsal, so a rehearsal can never show copy the cohort will not get. */
export function reminderText(
  rendered: Rendered,
  origin: string,
  unsubscribeToken: string
): string {
  return `${rendered.body}\n\nYou get these reminders because you asked for voting info. Unsubscribe: ${origin}/api/voting-info/unsubscribe?token=${unsubscribeToken}`;
}
