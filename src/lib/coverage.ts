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
   back, RACES_NOT_LOADED already owns the message and this notice would only
   repeat it. */
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

/* THE EMPTY STATES, and why none of them may say "not yet" (founder rule
   2026-10-12: "none of the races should be empty. There should be no 'No
   race yet'"; docs/general-election/empty-races-2026-10-12.md).

   Every covered location has races: the statewide ones are on every Florida
   ballot, every covered congressional district has its House race (printed,
   or decided and shown under "Not on your ballot"), and every covered county
   has county seats (contested, or under "Already decided").
   scripts/verify-no-empty-races.ts checks exactly that against the live
   roster, for every county and district a voter can be placed in. So an
   empty answer for a covered location is never a fact about the voter's
   ballot. It is a read that failed (resolveCounty and getStatewideRaces
   degrade to [] rather than throw) or a row that went missing, and the copy
   says so: a fault on our side, and where the full ballot is. The old
   copy ("aren't published yet ... Check back soon", "We don't have the U.S.
   House race ... yet") told the voter their races were coming, which was
   never the reason.

   Each one ends on "from", where the page puts its link to the voter's
   Supervisor of Elections (supervisorLink, src/lib/supervisors.ts), whose
   sample ballot lists every contest, then a full stop. None says "try
   again in a minute": getStatewideRaces caches a failed read as [] for up
   to an hour (races.ts), so a reload would not bring the races back. */

/** Nothing came back for a covered location: no race and no county race. */
export const RACES_NOT_LOADED =
  "We couldn't load your races just now. That's a fault on our side, not an empty ballot: every Florida voter has statewide races on theirs. Get your sample ballot from";

/** Races came back, but not the House race of the district the voter is in.
    Not "we don't have it yet": every covered district's race is on file. */
export function houseRaceNotLoaded(district: string): string {
  return `The U.S. House race for ${district} is missing from this list. That's a fault on our side, not your ballot. Get your full sample ballot from`;
}

/** The landing page's shared ballot came back with no race and no
    question at all. */
export const BALLOT_NOT_LOADED =
  "We couldn't load the statewide ballot just now. That's a fault on our side: every Florida ballot has statewide races and constitutional amendments. Get your sample ballot from";

/** The statewide races came back empty while something else loaded: a
    county path's county races, or the landing page's ballot questions. */
export const STATEWIDE_NOT_LOADED =
  "We couldn't load the statewide races just now. That's a fault on our side, not your ballot: every Florida voter has statewide races on theirs. Get your full sample ballot from";

/** True when a covered location's answer has nothing at all in it: the
    case RACES_NOT_LOADED speaks for. County races count, since a county
    path whose statewide read failed still has them to show. */
export function nothingLoaded(
  races: readonly unknown[],
  countyRaces: readonly unknown[] | undefined
): boolean {
  return races.length === 0 && (countyRaces?.length ?? 0) === 0;
}
