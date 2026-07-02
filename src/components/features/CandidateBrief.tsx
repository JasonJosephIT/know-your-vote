import Link from "next/link";
import { PartyChip } from "@/components/ui/PartyChip";
import { Chip } from "@/components/ui/Chip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { IssueSection } from "@/components/features/IssueSection";
import type { CandidateBriefData } from "@/lib/briefs";

/* One candidate's full brief. Structure is identical for every candidate in
   a race — equal space and equal scrutiny are layout invariants, not
   editorial choices. */
export function CandidateBrief({
  data,
  headingLevel = "h2",
  linkToDetail = true,
}: {
  data: CandidateBriefData;
  headingLevel?: "h2" | "h3";
  linkToDetail?: boolean;
}) {
  const { candidate, socials, issues } = data;
  const Heading = headingLevel;

  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5">
      <header className="flex flex-col gap-2">
        <Heading className="text-h2">
          {linkToDetail ? (
            <Link
              href={`/candidates/${candidate.candidate_id}`}
              className="hover:underline"
            >
              {candidate.legal_name}
            </Link>
          ) : (
            candidate.legal_name
          )}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <PartyChip party={candidate.party} />
          {candidate.is_incumbent && <Chip>Incumbent</Chip>}
          <SaveToggle candidateId={candidate.candidate_id} />
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
          {candidate.official_site && (
            <a
              href={candidate.official_site}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              Official site
            </a>
          )}
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              {s.handle} ({s.platform})
            </a>
          ))}
        </p>
      </header>

      {issues.map((block) => (
        <IssueSection key={block.issue.issue_id} block={block} />
      ))}

      <footer className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2 hover:text-on-surface">
          How we stay fair
        </Link>
        <a
          href={`mailto:flag@knowyourvote.example?subject=Flag%20brief%3A%20${candidate.candidate_id}`}
          className="underline underline-offset-2 hover:text-on-surface"
        >
          Flag this brief as biased
        </a>
      </footer>
    </article>
  );
}
