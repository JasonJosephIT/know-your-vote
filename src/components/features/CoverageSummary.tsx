import Link from "next/link";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { COVERED_COUNTIES } from "@/lib/counties";

/* "What this guide covers": the home page's one statement of scope
   (inspiration pass 2026-10-05, draft; GOV.UK summary list). Before it, what
   we cover was said in pieces: the statewide section's caption, the judges
   note, and "Full statewide coverage isn't available yet" under the ZIP
   field. A voter couldn't see in one place what they'd get and what they'd
   need to look up elsewhere. Those pieces stay where they are, because each
   explains the thing beside it; this gathers them.

   Three rows, as a <dl>: who gets what, then what we don't cover. The
   statewide counts come from the same cached reads SharedBallot makes in this
   render, so they can't disagree with the list above. Server component, no
   client JavaScript.

   Recommended (pending founder confirmation). TO FLIP: remove
   <CoverageSummary /> from src/app/(public)/page.tsx. */
export async function CoverageSummary() {
  const [races, measures] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
  ]);
  const briefs = races.filter((r) => r.published).length;
  const counties = COVERED_COUNTIES.map((c) => c.name);
  const countyList = `${counties.slice(0, -1).join(", ")} and ${counties[counties.length - 1]}`;

  const statewide = [
    races.length > 0 &&
      `${races.length} statewide ${races.length === 1 ? "race" : "races"}` +
        (briefs === races.length ? "" : ` (${briefs} with a full brief so far)`),
    measures.length > 0 &&
      `${measures.length} ${measures.length === 1 ? "amendment" : "amendments"}`,
  ].filter(Boolean) as string[];

  return (
    <section
      aria-labelledby="coverage"
      className="flex flex-col gap-3 border-t border-border pt-6"
    >
      <h2 id="coverage" className="text-h3">
        What this guide covers
      </h2>
      <dl className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        <Row term="Every Florida voter">
          {statewide.length > 0
            ? `${statewide.join(" and ")}, the same for everyone, whatever your ZIP or party.`
            : "The statewide races and amendments, once they're published."}
        </Row>
        <Row term={`${countyList} counties`}>
          Your U.S. House race, and the county commission and school board
          seats we&apos;ve covered so far. Add your address or ZIP above to see
          yours. Other counties are next.
        </Row>
        <Row term="Not covered">
          Judges up for retention, circuit judge races, and city or
          special-district contests. Your county elections office has your
          full sample ballot.
        </Row>
      </dl>
      <p className="text-caption text-on-surface-muted">
        Every candidate in a race we cover gets the same questions and the
        same rules.{" "}
        <Link
          href="/methodology"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          How we stay fair
        </Link>
      </p>
    </section>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-label">{term}</dt>
      <dd className="text-body-sm text-on-surface-muted">{children}</dd>
    </div>
  );
}
