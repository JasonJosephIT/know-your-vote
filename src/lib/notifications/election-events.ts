import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/* Reads for the election_event table (0007). Only VERIFIED rows ever reach
   a page, an email, or a calendar file: verified_by NULL means the founder
   has not yet checked the date against details_url (plan F4) — by design
   those rows do not exist as far as any send path is concerned. */

export type ElectionEvent = {
  id: string;
  event_type:
    | "registration_deadline"
    | "vbm_request_deadline"
    | "early_voting_start"
    | "early_voting_end"
    | "election_day";
  election: string;
  event_date: string; // ISO date
  details_url: string;
};

export async function verifiedStatewideEvents(
  service: SupabaseClient,
  election?: string
): Promise<ElectionEvent[]> {
  let query = service
    .from("election_event")
    .select("id, event_type, election, event_date, details_url")
    .is("county_fips", null)
    .not("verified_by", "is", null)
    .order("event_date");
  if (election) query = query.eq("election", election);
  const { data, error } = await query;
  /* Read failure degrades to "no dates" — callers already render without
     them (§0.7 graceful no-op). */
  if (error) return [];
  return (data ?? []) as ElectionEvent[];
}
