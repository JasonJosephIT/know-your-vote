import Link from "next/link";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { COVERED_COUNTIES } from "@/lib/counties";
import { locationFieldCopy } from "@/lib/scope-copy";

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

   The county and "not covered" rows say what the methodology's "What we
   don't cover" section says (src/app/(public)/methodology/page.tsx,
   #not-covered), and link to it; change them together.

   hasDistrict: the home page shows the location field above only when no
   district is saved, so the county row points to it only then.
   addressEnabled: whether that field takes an address at all
   (geocoderConfigured(), read by the page). Without a geocoder it takes a
   ZIP only, so the row asks for a ZIP (locationFieldCopy).

   The "Not covered" row is the long form of NOT_COVERED_SENTENCE
   (src/lib/scope-copy.ts), which the House-race step and the races view
   print; change them together.

   Recommended (pending founder confirmation). TO FLIP: remove
   <CoverageSummary /> from src/app/(public)/page.tsx. */
export async function CoverageSummary({
  hasDistrict,
  addressEnabled,
}: {
  hasDistrict: boolean;
  addressEnabled: boolean;
}) {
  const [races, measures] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
  ]);
  const briefs = races.filter((r) => r.published).length;
  const counties = COVERED_COUNTIES.map((c) => c.name);
  const countyList =
    counties.length === 1
      ? counties[0]
      : `${counties.slice(0, -1).join(", ")} and ${counties[counties.length - 1]}`;

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
        <Row term={`${countyList} ${counties.length === 1 ? "County" : "counties"}`}>
          The U.S. House races, and the county commission, school board,
          Orange County mayor and Orange County clerk races.{" "}
          {hasDistrict
            ? "Your district's races are linked above."
            : `Add your ${locationFieldCopy(addressEnabled).noun} above for your House race.`}{" "}
          Your county&rsquo;s sample ballot says which commission and school
          board seats are yours.
        </Row>
        <Row term="Not covered">
          Florida House and Florida Senate seats, judges (retention questions
          and other judicial races), county and city ballot questions, city
          races, special districts such as soil and water conservation and
          community development districts, and local races in other counties.
          Your county Supervisor of Elections has your official sample
          ballot.{" "}
          <Link
            href="/methodology#not-covered"
            className="underline underline-offset-2 hover:text-on-surface"
          >
            What we don&rsquo;t cover
          </Link>
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
