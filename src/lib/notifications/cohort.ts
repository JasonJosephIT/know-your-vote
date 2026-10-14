import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { zipDistrictRows } from "@/lib/resolve";
import { unsubscribeUrl } from "../site-url.ts";
import type { Rendered } from "./templates";

/* Who gets an email, and what every email carries at its foot: the cohort
   helpers the two sending routes share. They moved here verbatim from
   src/app/api/cron/send-reminders/route.ts on 2026-10-05, when the manual
   correction send (src/app/api/cron/send-correction/route.ts) arrived and
   needed the same cohort, the same county scoping and the same unsubscribe
   footer. One copy, so a correction can never reach a different list, or
   carry a different footer, than the reminder it corrects.

   Server-only: everything here reads voting_info_subscription through the
   service role, or zip_district through the cached copy in
   src/lib/resolve.ts. The pure date logic stays in ./schedule.ts and
   ./correction.ts, which Node can load. */

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
  const countyOf = await zipCounties();
  return rows.map((r) => {
    const county = countyOf.get(r.zip5) ?? null;
    return {
      email: r.email,
      unsubscribe_token: r.unsubscribe_token,
      scope: county && countyScopes.includes(county) ? county : null,
    };
  });
}

/* ZIP -> county FIPS for every ZIP in zip_district. Every ZIP in the table
   sits in exactly one county (checked live 2026-10-05: 235 ZIPs, none in
   two). A ZIP missing from the map reads as no county: statewide dates.
   Throws on a read error.

   Built from zipDistrictRows (src/lib/resolve.ts), the whole table read
   and cached once an hour through the anon client, rather than asked for
   by ZIP. It used to ask .in("zip5", <every subscriber's ZIP>), which put
   the subscribers' ZIPs in a Supabase request URL, and the API gateway
   logs those. zip_district is a public table (anon reads it under 0002's
   policy), so the service role adds nothing here, and the cached copy is
   the one the signup route resolves a ZIP against (resolveZip), so a
   reminder's county comes from the same rows as the county the welcome
   email named. The cost is up to an hour's lag after a zip_district
   migration, the lag the site itself has. */
export async function zipCounties(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const row of await zipDistrictRows()) map.set(row.zip5, row.county_fips);
  return map;
}

/* The text every reminder carries. One function for the real send and the
   rehearsal, so a rehearsal can never show copy the cohort will not get.
   The unsubscribe link is on the site's fixed address (src/lib/site-url.ts),
   never the address the request came in on, which for Vercel Cron can be
   the deployment's own *.vercel.app URL. */
export function reminderText(
  rendered: Rendered,
  unsubscribeToken: string
): string {
  return `${rendered.body}\n\nYou get these reminders because you asked for voting info. Unsubscribe: ${unsubscribeUrl(unsubscribeToken)}`;
}
