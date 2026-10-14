import { COVERED_COUNTIES, coveredCounty } from "@/lib/counties";
import { homeElectionEvents } from "@/lib/notifications/home-events";
import { easternToday } from "@/lib/notifications/schedule";
import {
  REGISTRATION_STATUS_URL,
  SUPERVISOR_DIRECTORY_URL,
  voterLinks,
} from "@/lib/supervisors";
import { resourceTiles, type ResourceTile } from "@/lib/voter-resources";
import { CaretGlyph, ExternalGlyph } from "@/components/ui/Glyphs";

/* "Sample ballot and how to vote" (home readability, 2026-10-12, §2;
   founder decision 1a, 2026-10-13): the official tools a voter came for,
   12 px under the key dates. It takes the slot of the three count tiles,
   which became the "On this page" list below it (BallotAtAGlance).

   It links out and nothing else: the four covered counties' Supervisors of
   Elections and the Florida Division of Elections (src/lib/supervisors.ts
   has the links and how they were checked). It never embeds a county's
   tool, which would load the county's reCAPTCHA and Google Translate on
   this page, and /privacy rules both out. The county's own form asks for
   what it asks for, on the county's own site, and the copy says we never
   see it. Keep "there" in that sentence: the House step's field below
   does send what is typed, to our server and on to the Census Bureau.

   countyFips is the saved district's county (the kyv.district cookie),
   the value DeadlineBanner and HomeNews get. A covered county shows its
   four tiles; anything else, including a well-formed county the page let
   through when the district list couldn't be read, shows five closed rows
   in COVERED_COUNTIES order, so it branches on voterLinks, not on whether
   countyFips is set. Nothing is pre-opened and nothing about which row
   was opened is kept: no cookie, no storage, no URL parameter. A server
   component, so it all works with JavaScript off.

   The rows share name="sample-ballot-county", so opening one closes the
   others where the browser supports it (Chrome 120, Safari 17.2, Firefox
   130); elsewhere several can be open at once, which is harmless.

   Renders nothing once Election Day has passed, with the banner. */
export async function VotingResources({
  countyFips,
}: {
  countyFips?: string;
}) {
  const all = await homeElectionEvents();
  const today = easternToday();
  const stateTiles = resourceTiles(null, all, today);
  if (!stateTiles) return null;

  const links = voterLinks(countyFips);
  const county = links && countyFips ? coveredCounty(countyFips) : undefined;

  return (
    <section
      id="sample-ballot"
      aria-labelledby="sample-ballot-h"
      className="flex flex-col gap-2"
    >
      <h2 id="sample-ballot-h" className="text-h2">
        Sample ballot and how to vote
      </h2>
      {links && county ? (
        <>
          <p className="text-body-sm text-on-surface lg:max-w-[65ch]">
            From the {county.name} County Supervisor of Elections, who runs
            your election. These links open {links.site} in a new tab; we
            never see what you enter there.
          </p>
          <TaskTiles
            tiles={resourceTiles(county.fips, all, today) ?? []}
            who={`${county.name} County`}
          />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
            <FooterLink href={REGISTRATION_STATUS_URL}>
              Check your voter registration
            </FooterLink>
            <FooterLink href={SUPERVISOR_DIRECTORY_URL}>
              Another county&rsquo;s Supervisor of Elections
            </FooterLink>
          </p>
        </>
      ) : (
        <>
          <p className="text-body-sm text-on-surface lg:max-w-[65ch]">
            Your county&rsquo;s Supervisor of Elections has your official
            sample ballot. Choose your county:
          </p>
          {/* overflow-hidden keeps a row's hover fill inside the rounded
              corners; the summaries' focus ring is drawn inset to match. */}
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {COVERED_COUNTIES.map((c) => (
              <CountyRow
                key={c.fips}
                summary={`${c.name} County`}
                tiles={resourceTiles(c.fips, all, today) ?? []}
                who={`${c.name} County`}
                note={`Links open ${voterLinks(c.fips)?.site}, the Supervisor’s own site. We never see what you enter there.`}
              />
            ))}
            <CountyRow
              summary="Another Florida county"
              tiles={stateTiles}
              who="Florida Division of Elections"
              note="From the Florida Division of Elections. We never see what you enter there."
            />
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
            <FooterLink href={REGISTRATION_STATUS_URL}>
              Check your voter registration
            </FooterLink>
          </p>
        </>
      )}
    </section>
  );
}

/* One closed row per county. A native disclosure: Enter and Space open
   it, a screen reader hears expanded or collapsed, and it works with
   JavaScript off. The caret turns without a transition (nothing moves on
   a phone but colour, founder D2a). */
function CountyRow({
  summary,
  tiles,
  who,
  note,
}: {
  summary: string;
  tiles: ResourceTile[];
  who: string;
  note: string;
}) {
  return (
    <details name="sample-ballot-county" className="group/county">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-label text-on-surface hover:bg-background focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
        {summary}
        <span className="text-on-surface-muted group-open/county:rotate-180">
          <CaretGlyph />
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <TaskTiles tiles={tiles} who={who} />
        <p className="text-body-sm text-on-surface-muted">{note}</p>
      </div>
    </details>
  );
}

/* The four tiles: stacked on a phone, two by two from sm. The sage fill
   is the retired count tiles' style, so the page gains no new look and the
   block doesn't read as one more white card. The visible label comes
   first in each link's name (WCAG 2.5.3); the sr-only end names whose
   site it opens, so a links list never shows four bare "See your sample
   ballot"s. */
function TaskTiles({ tiles, who }: { tiles: ResourceTile[]; who: string }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {tiles.map((t) => (
        <li key={t.key}>
          <a
            href={t.href}
            target="_blank"
            rel="noreferrer"
            className="flex h-full min-h-[48px] items-start justify-between gap-3 rounded-lg bg-primary-muted px-4 py-3 text-primary-hover ring-primary transition-shadow hover:ring-1"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-label">{t.label}</span>
              {t.note && (
                <span className="text-body-sm text-on-surface">{t.note}</span>
              )}
            </span>
            <ExternalGlyph />
            <span className="sr-only">, {who} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/* 24 px tall at least (WCAG 2.5.8), like the banner's links above. */
function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-[24px] items-center gap-1 text-primary underline underline-offset-2 hover:text-primary-hover"
    >
      {children}
      <ExternalGlyph />
      <span className="sr-only">
        , Florida Division of Elections (opens in a new tab)
      </span>
    </a>
  );
}
