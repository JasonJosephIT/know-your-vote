import Link from "next/link";
import { CandidateBrief } from "@/components/features/CandidateBrief";
import { CandidateContact } from "@/components/features/CandidateContact";
import { CandidateNews } from "@/components/features/CandidateNews";
import { TrackBriefView } from "@/components/features/TrackBriefView";
import { getCandidateDetail } from "@/lib/briefs";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const detail = await getCandidateDetail(candidateId);
  return {
    title: detail
      ? `${detail.candidate.legal_name} — Know Your Vote`
      : "Candidate — Know Your Vote",
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
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">This candidate isn&apos;t published yet</h1>
        <p className="text-body text-on-surface-muted">
          Candidates appear here once their race passes the Balance Audit and is
          published — equal space and equal scrutiny come first.
        </p>
        <Link
          href="/races"
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
      <TrackBriefView />
      <CandidateBrief
        data={detail.brief}
        headingLevel="h2"
        linkToDetail={false}
      />
      <CandidateNews candidateId={candidateId} />
      <CandidateContact candidateId={candidateId} />
    </main>
  );
}
