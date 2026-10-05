import Link from "next/link";
import { CandidateBrief } from "@/components/features/CandidateBrief";
import { CandidateContact } from "@/components/features/CandidateContact";
import { CandidateListing } from "@/components/features/CandidateListing";
import { CandidateNews } from "@/components/features/CandidateNews";
import { TrackView } from "@/components/features/TrackView";
import { getCandidateDetail, getRaceBrief } from "@/lib/briefs";
import { getCandidateListing, getRaceListing } from "@/lib/listing";
import { officeTitle } from "@/lib/office-title";

export const revalidate = 3600;

/* The race as the race page names it: "U.S. Representative, District 27"
   for a House race (officeTitle), which the candidate rows do not carry, so
   the race's own row is read. Both reads are the race page's cached ones.
   Falls back to the bare office if neither returns the race. */
async function runningFor(raceId: string, office: string): Promise<string> {
  const race =
    (await getRaceBrief(raceId))?.race ??
    (await getRaceListing(raceId))?.race;
  return race ? officeTitle(race) : office;
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
     read as if they held the seat. */
  const office = await runningFor(shown.raceId, shown.office);
  return {
    title: `${shown.candidate.legal_name}, running for ${office} — Know Your Vote`,
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
      const office = await runningFor(listing.raceId, listing.office);
      return (
        <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
          <CandidateListing listing={{ ...listing, office }} />
          <CandidateNews candidateId={candidateId} />
          <CandidateContact candidateId={candidateId} />
        </main>
      );
    }
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">This candidate isn&apos;t published yet</h1>
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

  const office = await runningFor(detail.raceId, detail.office);
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
      <p className="text-body-sm text-on-surface-muted">
        Running for{" "}
        <Link
          href={`/races/${detail.raceId}`}
          className="underline underline-offset-2 hover:text-on-surface"
        >
          {office}
        </Link>
      </p>
      <TrackView event="brief_viewed" />
      <CandidateBrief
        data={detail.brief}
        headingLevel="h2"
        linkToDetail={false}
      />
      {/* No `slots` prop on purpose: news-fairness.md §5 says N is picked from
          real per-candidate counts once N5 reports them, and N5 has no data
          yet. Until then the fairness ordering applies with no cap. */}
      <CandidateNews candidateId={candidateId} />
      <CandidateContact candidateId={candidateId} />
    </main>
  );
}
