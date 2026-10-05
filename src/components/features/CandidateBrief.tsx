import Link from "next/link";
import { PartyChip } from "@/components/ui/PartyChip";
import { Chip } from "@/components/ui/Chip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { IssueSection } from "@/components/features/IssueSection";
import type { CandidateBriefData } from "@/lib/briefs";
import { CONTACT_EMAIL } from "@/lib/contact";
import { showIncumbentChip } from "@/lib/incumbency";

/* One candidate's full brief. Structure is identical for every candidate in
   a race — equal space and equal scrutiny are layout invariants, not
   editorial choices.

   That is why the Incumbent chip goes through showIncumbentChip and is off
   for everyone for now: is_incumbent is filled for one ballot candidate in
   106, so the chip marked one incumbent and left the rest looking like
   challengers (src/lib/incumbency.ts, recommended pending founder
   confirmation, says what must be true before it comes back).

   Accessibility (a11y-perf-2026-10-04.md):
   - The article's id, candidate-<candidate_id>, is the target of RaceCompare's
     "Candidates in this race" jump links (fix 11). Ids are fragment-safe
     (FL-DOE-…, FL-VF-…). The fixed bars are cleared by the html
     scroll-padding from fix 1, not by a scroll-margin here, so the two do not
     add up to a double offset.
   - "Keep in mind", "Official site" and "Flag this brief as biased" repeat
     once per candidate, so each carries the candidate's name as a visually
     hidden suffix after its visible label (fix 6; WCAG 2.4.4 and 2.4.6, with
     the label still first for 2.5.3 Label in Name).
   - The official-site and social links are 18 px of caption text in a row
     with a 4 px gap, so each gets a 24 px minimum height (fix 9; WCAG 2.5.8
     Target Size). min-h-[24px], not min-h-6: this theme's spacing-6 is 32 px. */
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
    <article
      id={`candidate-${candidate.candidate_id}`}
      className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5"
    >
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
          {showIncumbentChip(candidate) && <Chip>Incumbent</Chip>}
          <SaveToggle
            candidateId={candidate.candidate_id}
            name={candidate.legal_name}
          />
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
          {candidate.official_site && (
            <a
              href={candidate.official_site}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
            >
              Official site
              <span className="sr-only">: {candidate.legal_name}</span>
            </a>
          )}
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
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
        {/* The mailbox is the shared CONTACT_EMAIL (fix 13, recommended
            pending founder confirmation; how to flip is in src/lib/contact.ts).
            The subject keeps the candidate id so a report names its brief. */}
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Flag%20brief%3A%20${candidate.candidate_id}`}
          className="underline underline-offset-2 hover:text-on-surface"
        >
          Flag this brief as biased
          <span className="sr-only">: {candidate.legal_name}</span>
        </a>
      </footer>
    </article>
  );
}
