import Link from "next/link";
import { CandidateBrief } from "@/components/features/CandidateBrief";
import { CandidateContact } from "@/components/features/CandidateContact";
import { CandidateListing } from "@/components/features/CandidateListing";
import { CandidateNews } from "@/components/features/CandidateNews";
import { TrackView } from "@/components/features/TrackView";
import { getCandidateDetail } from "@/lib/briefs";
import { getCandidateListing } from "@/lib/listing";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const detail = await getCandidateDetail(candidateId);
  const name = detail?.brief
    ? detail.candidate.legal_name
    : (await getCandidateListing(candidateId))?.candidate.legal_name;
  return {
    title: name ? `${name} — Know Your Vote` : "Candidate — Know Your Vote",
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
      return (
        <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
          <CandidateListing listing={listing} />
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
          published — equal space and equal scrutiny come first.
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

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
      <p className="text-body-sm text-on-surface-muted">
        Running for{" "}
        <Link
          href={`/races/${detail.raceId}`}
          className="underline underline-offset-2 hover:text-on-surface"
        >
          {detail.office}
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
