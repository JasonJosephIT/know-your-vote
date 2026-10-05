import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import { orderCandidates } from "@/lib/briefs";
import { isUnopposedContest, isDecidedInPrimary } from "@/lib/unopposed";
import type { PublicationStatus } from "@/types/app";
import type { Candidate, CandidateSocialAccount, Race } from "@/types/schema";

/* Roster read layer for the `listed` publication tier (migration 0033,
   design brief 2026-09-23). Sibling of briefs.ts, which stays published-only
   and is not touched by any of this.

   What a listing is: who is on the ballot for a race — legal name, party,
   incumbency, official site, verified socials, and the DoE's qualifying
   status. All of it is public record from the Florida Division of Elections
   and the county Supervisors of Elections, not editorial content, which is
   why it can be shown before the Balance Audit has cleared a brief.

   What a listing is NOT: any profile, issue, position, claim or source. This
   module never selects from those tables, and it does not have to be trusted
   on that — 0033 grants anon `listed` visibility on race, candidate,
   race_publication and verified candidate_social_account only, and the claim
   tables' policies still say `status = 'published'` and nothing else. A
   listed race cannot leak an unaudited claim through this file or any other.

   Works for published races too (RLS shows them as well): the race page only
   calls this when getRaceBrief came back null, so a published race whose
   brief fails briefs.ts's audit re-check degrades to its roster rather than
   to a blank "in review" page. The status field says which tier it is. */

export interface ListedCandidate {
  candidate: Candidate;
  socials: CandidateSocialAccount[];
}

export interface RaceListing {
  race: Race;
  status: "listed" | "published";
  candidates: ListedCandidate[];
  /* Same two facts RaceBrief carries, from the same predicates. Required here
     (not optional as on RaceBrief) because this shape is new: no cache entry
     written before these fields existed can come back through it. */
  notPrintedOnBallot: boolean;
  decidedInPrimary: boolean;
}

type VisibleStatus = RaceListing["status"];

function isVisible(
  status: PublicationStatus | undefined
): status is VisibleStatus {
  return status === "listed" || status === "published";
}

async function fetchRaceListing(raceId: string): Promise<RaceListing | null> {
  let supabase;
  try {
    supabase = await createAnonServerClient();
  } catch {
    /* Unconfigured environment — same guard as measures.ts. The race page is
       prerendered from generateStaticParams, and a missing Supabase URL
       should render "still in review", not fail the build. */
    return null;
  }

  /* Two reads rather than a `race_publication(status)` embed: the embed
     depends on PostgREST inferring the FK relationship, and a to-one embed
     can arrive as an object or a one-element array. A separate keyed read has
     neither problem. They run in parallel; both are gated by RLS. */
  const [raceRes, pubRes] = await Promise.all([
    supabase
      .from("race")
      .select("*")
      .eq("race_id", raceId)
      .eq("election", ACTIVE_ELECTION_KIND)
      .maybeSingle<Race>(),
    supabase
      .from("race_publication")
      .select("status")
      .eq("race_id", raceId)
      .maybeSingle<{ status: PublicationStatus }>(),
  ]);
  const race = raceRes.data;
  if (!race) return null;
  /* RLS already hides a race that is neither listed nor published, so a
     visible race without a visible publication row should not happen. If it
     does, fail closed: no status we can name means no page we can title. */
  const status = pubRes.data?.status;
  if (!isVisible(status)) return null;

  const ballotOrder = race.candidate_ids ?? [];
  if (ballotOrder.length === 0) return null;

  /* Ballot tier only (data-architecture.md D1). candidate_ids already
     excludes write-in and excluded filers upstream (B2); the filter is the
     read-side copy of the same rule, as in briefs.ts. */
  const [candidatesRes, socialsRes] = await Promise.all([
    supabase
      .from("candidate")
      .select("*")
      .in("candidate_id", ballotOrder)
      .eq("ballot_status", "ballot"),
    supabase
      .from("candidate_social_account")
      .select("*")
      .in("candidate_id", ballotOrder)
      .eq("status", "verified"),
  ]);

  const candidates = orderCandidates(
    (candidatesRes.data ?? []) as Candidate[],
    ballotOrder
  );
  /* An empty grid under "who is on the ballot" would read as "nobody is
     running", which no race in the roster is. No readable candidates means
     the page falls back to "still in review" instead. */
  if (candidates.length === 0) return null;
  const socials = (socialsRes.data ?? []) as CandidateSocialAccount[];

  /* The belt without the brace. briefs.ts passes a real `hasWriteIn` to both
     predicates, read from a write-in filer's profile row. A listed race has
     no profile rows at all (anon cannot read them, and none are written), and
     write-in filers are never in race.candidate_ids (D1), so there is nothing
     here to look at — the conjunct is `false`. The claim then rests on the
     carried DoE code alone (`UNO` / 0032's `elected_in_primary`), which is
     acceptable for the reason briefs.ts gives: a DoE `UNO` already implies no
     qualified write-in, and a primary winner's contest is over regardless.
     The brief path keeps the stronger check. */
  const noWriteInVisible = false;

  return {
    race,
    status,
    candidates: candidates.map((candidate) => ({
      candidate,
      socials: socials.filter((s) => s.candidate_id === candidate.candidate_id),
    })),
    notPrintedOnBallot: isUnopposedContest(candidates, noWriteInVisible),
    decidedInPrimary: isDecidedInPrimary(candidates, noWriteInVisible),
  };
}

/* Same cache shape and tags as getRaceBrief, so a set_race_publication
   revalidation of `race:<id>` refreshes the listing and the brief together. */
export function getRaceListing(raceId: string) {
  return unstable_cache(
    () => fetchRaceListing(raceId),
    ["race-listing", raceId],
    { revalidate: 3600, tags: ["races", `race:${raceId}`] }
  )();
}

export interface CandidateListing {
  candidate: Candidate;
  socials: CandidateSocialAccount[];
  raceId: string;
  office: string;
  status: VisibleStatus;
  notPrintedOnBallot: boolean;
  decidedInPrimary: boolean;
}

async function fetchCandidateListing(
  candidateId: string
): Promise<CandidateListing | null> {
  let supabase;
  try {
    supabase = await createAnonServerClient();
  } catch {
    return null;
  }

  /* The race that prints this candidate. `profile` is the brief path's link
     and there are no profile rows for a listed race, so this goes through
     race.candidate_ids (PostgREST `cs`), filtered to the active cycle so a
     2028 row naming the same person can never answer for 2026. */
  const { data: race } = await supabase
    .from("race")
    .select("race_id")
    .contains("candidate_ids", [candidateId])
    .eq("election", ACTIVE_ELECTION_KIND)
    .limit(1)
    .maybeSingle<{ race_id: string }>();
  if (!race) return null;

  /* Reuse the race read rather than re-deriving any of it: the candidate
     comes back only if it is ballot tier and visible, with the same verified
     socials and the same decided/unopposed facts the race page shows. One
     rule, one place. */
  const listing = await fetchRaceListing(race.race_id);
  if (!listing) return null;
  const own = listing.candidates.find(
    (c) => c.candidate.candidate_id === candidateId
  );
  if (!own) return null;

  return {
    candidate: own.candidate,
    socials: own.socials,
    raceId: listing.race.race_id,
    office: listing.race.office,
    status: listing.status,
    notPrintedOnBallot: listing.notPrintedOnBallot,
    decidedInPrimary: listing.decidedInPrimary,
  };
}

export function getCandidateListing(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateListing(candidateId),
    ["candidate-listing", candidateId],
    { revalidate: 3600, tags: ["races", `candidate:${candidateId}`] }
  )();
}
