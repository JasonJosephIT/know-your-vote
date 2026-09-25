import Link from "next/link";
import { redirect } from "next/navigation";
import { getRaceBrief } from "@/lib/briefs";
import { RaceHeader } from "@/components/features/RaceHeader";
import { IssueFilter } from "@/components/features/IssueFilter";
import { IssueRows } from "@/components/features/IssueRows";
import {
  issueRowsFor,
  parseIssuePick,
  pickHref,
  spineOptions,
} from "@/lib/issue-pick";

/* The race page narrowed to the issues a voter picked (spec
   docs/superpowers/specs/2026-09-25-quiz-replacement-design.md). Its own
   route because reading searchParams makes a page dynamic, and the race
   page itself must stay prerendered. The data is the same cached
   getRaceBrief call, so this page does not go back to the database. */

type Props = {
  params: Promise<{ raceId: string }>;
  searchParams: Promise<{ pick?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { raceId } = await params;
  const { pick } = await searchParams;
  const brief = await getRaceBrief(raceId);
  if (!brief) return { title: "Race in review — Know Your Vote" };
  const options = spineOptions(brief.spineIssues);
  const selected = parseIssuePick(pick, options.map((o) => o.id));
  const titles = options
    .filter((o) => selected.includes(o.id))
    .map((o) => o.title)
    .join(", ");
  return {
    title: titles
      ? `${brief.race.office}: ${titles} — Know Your Vote`
      : `${brief.race.office} — Know Your Vote`,
  };
}

export default async function RaceIssuesPage({ params, searchParams }: Props) {
  const { raceId } = await params;
  const { pick } = await searchParams;
  const brief = await getRaceBrief(raceId);
  /* Not published, or the audit re-check refused it: the race page already
     explains the listed or in-review state. */
  if (!brief) redirect(pickHref(raceId, []));

  const options = spineOptions(brief.spineIssues);
  const selected = parseIssuePick(pick, options.map((o) => o.id));
  if (selected.length === 0) redirect(pickHref(raceId, []));

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <RaceHeader race={brief.race} />
      <IssueFilter raceId={raceId} options={options} selected={selected} />
      <IssueRows rows={issueRowsFor(brief, selected)} />
      <footer className="flex flex-wrap gap-4 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2">
          How we stay fair
        </Link>
        <span>
          Candidate order follows the ballot order rule, applied identically to
          every race.
        </span>
      </footer>
    </main>
  );
}
