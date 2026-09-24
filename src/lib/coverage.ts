/* What a resolved ZIP actually bought the voter, kept in its own
   dependency-free module so scripts/verify-coverage.ts can run it under
   Node's native type stripping — the same reason measure-ladder.ts is
   separate from measures.ts. Importing it from resolve.ts would drag in
   next/cache and the Supabase client.

   THE PROBLEM THIS NAMES (session-handoff-2026-09-08-map-coverage.md §1):

   `zip_district` seeds 16 congressional districts; three of them have a
   House race a voter can see. So a ZIP resolves, `inCoverage` is true, the
   five statewide races render — and the one race the ZIP was asked for is
   silently absent. Measured on the live database 2026-09-08: 161 of the 235
   seeded ZIPs are in that state, including all 45 in Orange County, a metro
   the out-of-coverage copy names as covered.

   Nothing in the resolver was wrong. The gap is that "resolved" and "we have
   your district's race" were never distinguished, so the UI had no way to
   say which one it got. */

/* True when a district resolved but no district-scoped race came back with
   it.

   `racesForDistrict` asks for `district IS NULL OR district = X`, and RLS
   drops unpublished rows, so three different facts — no race row exists, the
   race exists but is unpublished, and the race is published but out of this
   election — all arrive identically, as absence. That is deliberate: they are
   the same answer to a voter ("we don't have it yet"), and a UI that
   distinguished them would be claiming knowledge this query cannot supply.

   Empty string counts as no district, matching the ingest lint's treatment of
   empty-string fields as absent rather than as data.

   Callers compose this with a non-empty race list: when nothing at all came
   back, the "not published yet" copy already owns the message and this notice
   would only repeat it. */
export function districtRaceMissing(
  district: string | null | undefined,
  races: readonly { district: string | null }[]
): boolean {
  return Boolean(district) && !races.some((r) => Boolean(r.district));
}

/* How much of a ballot an ADDRESS can place, decided by where the address is
   rather than by which ZIPs happen to be seeded.

   A census block is authoritative for state and county in a way a ZIP never
   is: every Florida block answers "12", and block_district answers the
   district only where it is seeded (the four covered counties). So a Florida
   address outside them is not "out of coverage" -- the statewide ballot is on
   every Florida voter's ballot, and saying "we don't cover this area" hid
   eleven races and three amendments the voter really does have. What it lacks
   is the district and county half, and the UI says exactly that.

     out_of_state -- not a Florida address; this is a Florida voter guide.
     statewide    -- Florida, but no district we can place it in yet.
     district     -- Florida, placed in exactly one congressional district.

   `state` is the block's two-digit state FIPS; `placed` is block_district's
   answer (null when the block is not seeded). */
export type AddressCoverage = "out_of_state" | "statewide" | "district";

export function addressCoverage(
  state: string,
  placed: { district: string; countyFips: string } | null
): AddressCoverage {
  if (state !== "12") return "out_of_state";
  return placed ? "district" : "statewide";
}

/* The ballot every Florida voter shares, with the "statewide only" notice.
   Carries no location at all, so it is safe to share and safe to cache. Here
   rather than in LocationEntry because a value exported from a client module
   reaches a server component as a client reference, not as the string. */
export const STATEWIDE_BALLOT_HREF = "/candidates?view=races&scope=statewide";
