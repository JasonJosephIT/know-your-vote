import { LinkRow, LinkRowList } from "@/components/ui/LinkRows";
import { JudicialRetentionNote } from "@/components/features/JudicialRetentionNote";
import { getActiveMeasures } from "@/lib/measures";

/* The ballot questions every Florida voter shares (TASK-063).

   Deliberately NOT part of ResolveResult. Measures are statewide and
   identical for everyone, so threading them through ZIP resolution would
   couple location-free data to a location lookup — and it is exactly what
   Phase 7's TASK-067 needs to render with no ZIP at all. Fetching them here
   keeps resolve.ts about location and makes that task a re-use rather than a
   rewrite. (The Phase 6 plan listed resolve.ts and app.ts for this task; it
   was written before the measure tables existed.)

   Renders nothing when no measure is visible, so it is safe on the page
   before TASK-066 content lands. Since 0033 a measure is visible at `listed`
   (verbatim ballot text, plus its neutral resources since 0041) as well as
   `published`; a listed card says its
   resources are being collected so a voter does not open it expecting a
   two-sided list. `status !== "published"` rather than `=== "listed"`: a status
   missing from a stale cached shape must mean the weaker claim.

   The judicial retention questions are on the same ballot but not modelled,
   so JudicialRetentionNote follows the list and says so (founder decision 10,
   recommended, pending founder confirmation; how to remove it is in that
   file). It rides on this section: with no measure visible nothing renders,
   because a "Ballot questions" heading over judges alone would read as if the
   amendments had been dropped. `county` is optional and only narrows the
   note's appeals court lines. It is a county name (result.county), not a
   FIPS code: YourRaces passes the resolved county, and SharedBallot passes
   nothing, on purpose, so the home page shows the full note to every
   visitor (verify-judicial-retention pins both). Nothing means the full
   note.

   Each row's heading is "Amendment N", the number a voter looks for on the
   ballot, and the official title is quoted under it word for word, in the
   capitals the ballot prints (home readability spec 2026-10-12, PR B). As
   the heading, a title of up to three all-caps lines read slower than the
   number and made the row's link name a paragraph; only its size and place
   change, never its words. */
export async function BallotQuestions({
  county,
}: {
  county?: string | null;
} = {}) {
  const measures = await getActiveMeasures();
  if (measures.length === 0) return null;

  return (
    <section id="ballot-questions" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Ballot questions</h2>
        <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
          Each needs a supermajority to pass, not a simple majority.
        </p>
      </div>
      {/* Same row shell as the race lists (LinkRows), so the races and
          the questions read as one ballot. Content unchanged. */}
      <LinkRowList>
        {measures.map((m) => (
          <LinkRow
            key={m.measure_id}
            href={`/measures/${m.measure_id}`}
            title={`Amendment ${m.number}`}
          >
            <p className="text-[0.9375rem] leading-[1.5] text-on-surface">
              {m.official_title}
            </p>
            <p className="text-body-sm text-on-surface-muted">
              {m.jurisdiction === "FL" ? "Statewide" : m.jurisdiction} ·
              Needs{" "}
              {Number.isInteger(m.threshold_pct)
                ? m.threshold_pct
                : m.threshold_pct.toFixed(1)}
              % to pass
              {m.status !== "published" ? " · resources being collected" : ""}
            </p>
          </LinkRow>
        ))}
      </LinkRowList>
      <JudicialRetentionNote county={county} />
    </section>
  );
}
