import Link from "next/link";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { COVERED_COUNTIES } from "@/lib/counties";
import { locationFieldCopy } from "@/lib/scope-copy";
import { LedgeArt } from "@/components/brand/Ledge";
import { SectionDivider } from "@/components/brand/SectionDivider";

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
   <CoverageSummary /> from src/app/(public)/page.tsx.

   Art (design.md "Site illustration layer"): a wave divider replaces the
   old border-t (gap-3 + mb-3 keeps the old pt-6), and at lg+ a figure peeks
   over the card's top edge at its right end (peek-card-edge, ledge 0.93).
   At 120px tall it is about 148px wide and rises about 112px above the card,
   so the h2 gets lg:mt-12 to keep the figure below the divider. The figure
   is fixed px but the heading and the lg breakpoint scale with rem, so at
   enlarged text sizes (WCAG 1.4.4; e.g. a 32px root makes the heading about
   560px in a 604px column) the heading would run under it. lg:pr-44 (11rem,
   never less than the figure's 164px from the column's right edge, right-4
   plus about 148px) makes a long or enlarged heading wrap before it reaches
   the figure, as page.tsx does for its House-race h2. Its fingers dip about 8px into the card, inside the first row's 12px
   top padding, clear of the row text. band-horizon behind the heading was
   left out: a band under heading text risks the 4.5:1 contrast floor.

   Below lg a cat peeks over the same edge instead (pet-cat-peek, ledge
   0.882; design.md's closed list of phone art, founder decision 3,
   2026-10-11). The cat, not a smaller copy of the figure: on a phone his
   face would be the largest on the home page and a second lone person at a
   different size from the seated reader on the zigzag, and design.md asks
   for equal size and attention. At 64px it is 88px wide at right-[12px],
   and its head rises about 56px above the card, past the 12px gap and
   beside the heading, so the h2 carries pr-[108px] on a phone (88 + 12 +
   8px of air; px, like the figure). Below about 402px the heading wraps to
   two lines and the cat's head stays at least 8px under the wave either
   way at the default 16px root (decoration against decoration; the text
   guard is the px padding). Its paws dip about 8px into the first row's 12px top padding. */
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
        (briefs === races.length
          ? ""
          : ` (${briefs} with a full brief so far)`),
    measures.length > 0 &&
      `${measures.length} ${measures.length === 1 ? "amendment" : "amendments"}`,
  ].filter(Boolean) as string[];

  return (
    <section aria-labelledby="coverage" className="flex flex-col gap-3">
      <SectionDivider variant="wave" className="mb-3" />
      <h2 id="coverage" className="text-h2 pr-[108px] lg:mt-12 lg:pr-44">
        What this guide covers
      </h2>
      <div className="relative">
        <LedgeArt
          name="peek-card-edge"
          height={120}
          edge="top"
          className="right-4 hidden lg:block"
        />
        <LedgeArt
          name="pet-cat-peek"
          height={64}
          edge="top"
          className="right-[12px] lg:hidden"
        />
        <dl className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          <Row term="Every Florida voter">
            {statewide.length > 0
              ? `${statewide.join(" and ")}, the same for everyone, whatever your ZIP or party.`
              : "The statewide races and amendments, once they're published."}
          </Row>
          <Row
            term={`${countyList} ${counties.length === 1 ? "County" : "counties"}`}
          >
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
            Your county Supervisor of Elections has your official sample ballot.{" "}
            <Link
              href="/methodology#not-covered"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              What we don&rsquo;t cover
            </Link>
          </Row>
        </dl>
      </div>
      <p className="text-caption text-on-surface-muted">
        Every candidate in a race we cover gets the same questions and the same
        rules.{" "}
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
      <dt className="text-label leading-[1.4]">{term}</dt>
      <dd className="text-body-sm text-on-surface-muted">{children}</dd>
    </div>
  );
}
