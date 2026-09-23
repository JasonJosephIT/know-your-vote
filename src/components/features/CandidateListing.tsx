import Link from "next/link";
import { ListedCandidateCard } from "@/components/features/RaceListing";
import { raceStatusLine, statusBranch } from "@/lib/listing-copy";
import type { CandidateListing as CandidateListingData } from "@/lib/listing";

/* The candidate page for a race that is listed but not yet briefed. Same card
   as the race page's roster (one component, so the candidate page and the
   race page cannot describe the same person differently), with the name as
   the page heading.

   The race-level fact is repeated here only when it changes what the voter
   will see in November: a seat decided in the primary or won without
   opposition has no line on the ballot, and someone landing on this page from
   a search deserves to learn that without clicking through to the race. The
   ordinary-race line is left off — it describes the race page's grid, which
   is not on this page. */
export function CandidateListing({
  listing,
}: {
  listing: CandidateListingData;
}) {
  const facts = {
    decidedInPrimary: listing.decidedInPrimary,
    notPrintedOnBallot: listing.notPrintedOnBallot,
    count: 1,
  };
  const branch = statusBranch(facts);
  const absent = branch === "decided_in_primary" || branch === "not_printed";

  return (
    <>
      <p className="text-body-sm text-on-surface-muted">
        Running for{" "}
        <Link
          href={`/races/${listing.raceId}`}
          className="underline underline-offset-2 hover:text-on-surface"
        >
          {listing.office}
        </Link>
      </p>
      {absent && (
        <p className="text-body-sm text-on-surface-muted">
          {raceStatusLine(facts, "listing")}
        </p>
      )}
      <ListedCandidateCard
        data={{ candidate: listing.candidate, socials: listing.socials }}
        headingLevel="h1"
        linkToDetail={false}
      />
    </>
  );
}
