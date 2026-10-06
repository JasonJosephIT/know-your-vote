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
    | "ballot_return_deadline"
    | "early_voting_start"
    | "early_voting_end"
    | "election_day";
  election: string;
  /* NULL (or absent, in fixtures) for a statewide row. A county row
     (0043) replaces the statewide row of the same event_type for voters in
     that county — eventsForCounty in ./schedule.ts is the one place that
     applies the override. */
  county_fips?: string | null;
  event_date: string; // ISO date
  /* How the deadline is satisfied (0021). A machine token, never rendered
     raw — ics.ts turns it into the sentence a voter reads. NULL for the
     rows that are not deadlines: early voting bounds and election day. */
  rule: "postmarked_by" | "received_by" | null;
  details_url: string;
  /* When the row was last verified (stamped). A corrected date is
     re-stamped, so ics.ts derives SEQUENCE and DTSTAMP from it: a calendar
     that imported the old date takes the new file as an update. Absent in
     fixtures. */
  verified_at?: string | null;
};

/* Every verified row for the election, statewide and county (0043).
   Callers never use the list raw: eventsForCounty (./schedule.ts) picks the
   dates that apply to one county, or to a voter whose county is unknown.

   This read used to be statewide-only (county_fips IS NULL), which was
   right while every row was statewide. The four covered counties open
   early voting on Oct 19 and close it on Nov 1 — five days before and one
   day after the statewide minimum — so their rows now matter. No new
   column is selected, so this reader works before and after 0043 is
   applied (0021's lesson: a reader selecting a column the live table
   lacks returns no dates at all). */
export async function verifiedElectionEvents(
  service: SupabaseClient,
  election?: string
): Promise<ElectionEvent[]> {
  let query = service
    .from("election_event")
    .select(
      "id, county_fips, event_type, election, event_date, rule, details_url, verified_at"
    )
    .not("verified_by", "is", null)
    .order("event_date");
  if (election) query = query.eq("election", election);
  const { data, error } = await query;
  /* Read failure degrades to "no dates" — callers already render without
     them (§0.7 graceful no-op). */
  if (error) return [];
  return (data ?? []) as ElectionEvent[];
}
