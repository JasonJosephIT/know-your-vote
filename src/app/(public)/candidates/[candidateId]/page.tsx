import Link from "next/link";
import { CandidateBrief } from "@/components/features/CandidateBrief";
import { CandidateContact } from "@/components/features/CandidateContact";
import { CandidateListing } from "@/components/features/CandidateListing";
import { CandidateNews } from "@/components/features/CandidateNews";
import { TrackView } from "@/components/features/TrackView";
import { getCandidateDetail, getRaceBrief } from "@/lib/briefs";
import { getCandidateListing, getRaceListing } from "@/lib/listing";
import { incumbencyFor, type Incumbency } from "@/lib/incumbency";
import { NEWS_SLOTS_PER_CANDIDATE } from "@/lib/news-slots";
import { officeTitle } from "@/lib/office-title";
import { runningMatesFor, type RunningMates } from "@/lib/running-mate";

export const revalidate = 3600;

/* The race as the race page names it: "U.S. Representative, District 27"
   for a House race (officeTitle), which the candidate rows do not carry, so
   the race's own row is read. Both reads are the race page's cached ones.
   Falls back to the bare office if neither returns the race.

   `settled` says how a seat already decided was decided (FL-10's one
   candidate was unopposed; ten seats were won in the August primary), so
   the page never says such a candidate is "running for" a seat that is not
   on the November ballot.

   The race-level card lines (roster-completeness spec §3.5, §3.6) come from
   every candidate in the race, from the same cached reads the race page
   uses, so a candidate's own page shows a line exactly when their race page
   does. Computed at render, outside the data cache (§3.9). */
async function runningFor(
  raceId: string,
  office: string
): Promise<{
  office: string;
  settled: string | null;
  incumbency: Incumbency | null;
  runningMates: RunningMates | null;
}> {
  const brief = await getRaceBrief(raceId);
  const listing = brief ? null : await getRaceListing(raceId);
  const race = brief?.race ?? listing?.race;
  const settled =
    brief?.notPrintedOnBallot || listing?.notPrintedOnBallot
      ? "elected without opposition"
      : brief?.decidedInPrimary || listing?.decidedInPrimary
        ? "decided in the August primary"
        : null;
  const raceCandidates = brief
    ? brief.candidates.map((c) => c.candidate)
    : (listing?.candidates ?? []).map((c) => c.candidate);
  return {
    office: race ? officeTitle(race) : office,
    settled,
    incumbency: race ? incumbencyFor(race, raceCandidates) : null,
    runningMates: runningMatesFor(raceCandidates),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const detail = await getCandidateDetail(candidateId);
  const shown = detail?.brief ? detail : await getCandidateListing(candidateId);
  if (!shown) return { title: "Candidate — Know Your Vote" };
  /* "running for", never the office alone: a challenger's title must not
     read as if they held the seat. A seat already decided says how. */
  const { office, settled } = await runningFor(shown.raceId, shown.office);
  return {
    title: settled
      ? `${shown.candidate.legal_name}, ${office}: ${settled} — Know Your Vote`
      : `${shown.candidate.legal_name}, running for ${office} — Know Your Vote`,
  };
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const detail = await getCandidateDetail(candidateId);

  if (!detail || !detail.brief) {
    /* Listed tier (design brief 2026-09-23): the race is visible but no brief
       has cleared the audit, so show the roster facts for this candidate and
       the same news and contact blocks the brief path shows. News is
       already neutral, cited and fairness-ordered on its own terms
       (news-fairness.md), and contact is the campaign's own details behind
       its own flag — neither depends on the brief. */
    const listing = await getCandidateListing(candidateId);
    if (listing) {
      /* CandidateListing prints "Running for {office}"; it gets the
         district-named office (runningFor). */
      const { office, incumbency, runningMates } = await runningFor(listing.raceId, listing.office);
      return (
        <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
          <CandidateListing
            listing={{ ...listing, office }}
            incumbency={incumbency}
            runningMates={runningMates}
          />
          <CandidateNews
            candidateId={candidateId}
            raceId={listing.raceId}
            slots={NEWS_SLOTS_PER_CANDIDATE}
          />
          <CandidateContact candidateId={candidateId} />
        </main>
      );
    }
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">This candidate isn&rsquo;t published yet</h1>
        <p className="text-body text-on-surface-muted">
          Candidates appear here once their race passes the Balance Audit and is
          published — the same checks for every candidate come first.
        </p>
        <Link
          href="/candidates?view=races"
          className="text-label text-primary underline underline-offset-2"
        >
          Back to your races
        </Link>
      </main>
    );
  }

  const { office, settled, incumbency, runningMates } = await runningFor(detail.raceId, detail.office);
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
      <p className="text-body-sm text-on-surface-muted">
        {settled ? "" : "Running for "}
        <Link
          href={`/races/${detail.raceId}`}
          className="underline underline-offset-2 hover:text-on-surface"
        >
          {office}
        </Link>
        {settled ? ` · ${settled}, so not on the November ballot` : ""}
      </p>
      <TrackView event="brief_viewed" />
      <CandidateBrief
        data={detail.brief}
        headingLevel="h2"
        linkToDetail={false}
        incumbency={incumbency}
        runningMates={runningMates}
      />
      {/* N equal slots per candidate (news-fairness.md §2), founder-confirmed
          2026-10-09. The hard gate in the N4 note: N is passed before
          candidate_news rows go live. */}
      <CandidateNews
        candidateId={candidateId}
        raceId={detail.raceId}
        slots={NEWS_SLOTS_PER_CANDIDATE}
      />
      <CandidateContact candidateId={candidateId} />
    </main>
  );
}
