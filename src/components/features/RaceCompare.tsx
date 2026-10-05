import { CandidateBrief } from "@/components/features/CandidateBrief";
import type { RaceBrief } from "@/lib/briefs";

/* The signature layout: every candidate in equal-width columns on desktop,
   an equal-treatment stack on mobile (full briefs, ballot order — nobody is
   hidden behind a tab). Reading order matches visual order for screen
   readers.

   Recommended (pending founder confirmation) — a11y-perf-2026-10-04.md fix 11
   (keyboard efficiency; it supports WCAG 2.4.1 Bypass Blocks but is not a
   failure on its own). FL-GOV has 356 links, and a keyboard user tabs about
   45 times through one candidate's quote sources before reaching the next.
   So above the grid, a "Candidates in this race" list of in-page links to
   each CandidateBrief's id (candidate-<candidate_id>). It lists every
   candidate, in the same order as the grid below and in the same plain link
   style, so it gives no one more prominence than the grid already does; it
   is left out when there is only one candidate to jump to. Plain <a href="#…">
   rather than next/link: the browser's own fragment navigation also moves the
   keyboard's starting point, so the next Tab lands inside that candidate's
   brief. The html scroll-padding from fix 1 keeps the target clear of the
   fixed bars.

   TO FLIP (no jump links): delete the <nav> below and return the grid alone.
   Nothing else depends on it; the ids on CandidateBrief are harmless left in
   place. */
export function RaceCompare({ brief }: { brief: RaceBrief }) {
  const count = brief.candidates.length;
  return (
    <>
      {count > 1 && (
        <nav aria-label="Candidates in this race" className="flex flex-col gap-2">
          <p className="text-body-sm text-on-surface-muted">
            Jump to a candidate:
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {brief.candidates.map(({ candidate }) => (
              <li key={candidate.candidate_id}>
                <a
                  href={`#candidate-${candidate.candidate_id}`}
                  className="inline-flex min-h-[24px] items-center text-body-sm text-primary underline underline-offset-2"
                >
                  {candidate.legal_name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div
        className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        style={{ "--cols": Math.min(count, 3) } as React.CSSProperties}
      >
        {brief.candidates.map((c) => (
          <CandidateBrief key={c.candidate.candidate_id} data={c} />
        ))}
      </div>
    </>
  );
}
