import { CandidateBrief } from "@/components/features/CandidateBrief";
import type { RaceBrief } from "@/lib/briefs";

/* The signature layout: every candidate in equal-width columns on desktop,
   an equal-treatment stack on mobile (full briefs, ballot order — nobody is
   hidden behind a tab). Reading order matches visual order for screen
   readers. */
export function RaceCompare({ brief }: { brief: RaceBrief }) {
  const count = brief.candidates.length;
  return (
    <div
      className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
      style={{ "--cols": Math.min(count, 3) } as React.CSSProperties}
    >
      {brief.candidates.map((c) => (
        <CandidateBrief key={c.candidate.candidate_id} data={c} />
      ))}
    </div>
  );
}
