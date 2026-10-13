import Link from "next/link";
import { LinkRow, LinkRowList } from "@/components/ui/LinkRows";
import { CountyRaces } from "@/components/features/CountyRaces";
import { coveredCounty } from "@/lib/counties";
import { houseRaceNotLoaded } from "@/lib/coverage";
import { officeTitle } from "@/lib/office-title";
import { raceStatusLabel } from "@/lib/races";
import { districtRace, racesForCounty } from "@/lib/resolve";
import { DECIDED_TAG } from "@/lib/scope-copy";
import { supervisorLink } from "@/lib/supervisors";
import type { RaceScope } from "@/lib/race-scope";

/* What a page shows when "Show races for" narrows it (RaceScopePicker).

   Shared by the home page and Candidates → Your races, so a county or a
   district reads the same in both places. Neither needs the voter's
   location: a county's races are listed for the whole county (CountyRaces
   says why), and a district's House race is the same race for everyone in
   it. The statewide choice is not here: both pages render SharedBallot for
   it, the list the home page already shows.

   Server components with no client JavaScript, like SharedBallot. Every
   read is the cached one the rest of the site uses (racesForCounty,
   districtRace), and each degrades to empty or null rather than throwing,
   so an empty answer here is a failed read, never a fact about the ballot,
   and the copy says so with the Supervisor's link (founder rule
   2026-10-12; coverage.ts). */

/* The line under the picker on a narrowed page: what is showing, and the
   plain way back to everything. The picker's "All races" does the same,
   but a link is one tap and needs no form. */
export function ScopeNote({
  scope,
  allHref,
}: {
  scope: Exclude<RaceScope, { kind: "all" }>;
  allHref: string;
}) {
  const what =
    scope.kind === "statewide"
      ? "the statewide races and ballot questions"
      : scope.kind === "county"
        ? `${coveredCounty(scope.fips)?.name ?? ""} County’s races`
        : `the ${scope.district} U.S. House race`;
  return (
    <p className="text-body-sm text-on-surface-muted">
      Showing only {what}.{" "}
      <Link
        href={allHref}
        className="text-primary underline underline-offset-2 hover:text-primary-hover"
      >
        See all races
      </Link>
    </p>
  );
}

export async function ScopedRaces({
  scope,
}: {
  scope: Extract<RaceScope, { kind: "county" } | { kind: "district" }>;
}) {
  return scope.kind === "county" ? (
    <ScopedCounty fips={scope.fips} />
  ) : (
    <ScopedDistrict district={scope.district} />
  );
}

async function ScopedCounty({ fips }: { fips: string }) {
  const county = coveredCounty(fips);
  if (!county) return null;
  const races = await racesForCounty(fips);
  if (races.length > 0) {
    return <CountyRaces county={county.name} races={races} />;
  }
  /* Every covered county has county seats this year, contested or decided
     (verify-no-empty-races checks the live roster), so nothing here means
     the read failed. */
  const supervisor = supervisorLink(fips);
  return (
    <section aria-labelledby="county-races-heading" className="flex flex-col gap-3">
      <h2 id="county-races-heading" className="text-h2">
        {county.name} County races
      </h2>
      <p
        role="status"
        className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
      >
        We couldn&rsquo;t load {county.name} County&rsquo;s races just now.
        That&rsquo;s a fault on our side, not an empty list: every county we
        cover has seats on this year&rsquo;s ballot. Get your sample ballot
        from{" "}
        <a
          href={supervisor.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          {supervisor.label}
        </a>
        .
      </p>
    </section>
  );
}

async function ScopedDistrict({ district }: { district: string }) {
  const race = await districtRace(district);
  const decided = race?.decided && race.holder ? race : null;

  return (
    <section
      aria-labelledby="district-race-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 id="district-race-heading" className="text-h2">
          {district} U.S. House race
        </h2>
        {race && !decided && (
          <p className="text-body-sm text-on-surface-muted">
            Every voter who lives in {district} gets this race, whatever their
            county.
          </p>
        )}
      </div>

      {/* Printed: one row, the way every race list on the site shows one. */}
      {race && !decided && (
        <LinkRowList>
          <LinkRow
            href={`/races/${race.raceId}`}
            title={officeTitle(race)}
            aside={raceStatusLabel(race.status)}
          />
        </LinkRowList>
      )}

      {/* Decided (FL-10: one candidate, unopposed): said as no race at all,
          in the words and shape YourRaces uses under "Not on your ballot",
          never shown as a race to vote in. Not "your ballot" here: a voter
          browsing a district may not live in it. */}
      {decided?.decided && decided.holder && (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm text-on-surface-muted">
            This race won&rsquo;t be printed on the November ballot. It was
            settled before the general election.
          </p>
          <p className="text-body-sm text-on-surface">
            <Link
              href={`/races/${decided.raceId}`}
              className="text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              {officeTitle(decided)}
            </Link>
            {" · "}
            {decided.holder.legalName}
            <span className="text-on-surface-muted">
              {" · "}
              {DECIDED_TAG[decided.decided]}
            </span>
          </p>
        </div>
      )}

      {/* Every covered district's race is on file (verify-no-empty-races),
          so null is a failed read, worded as one. No county here, so the
          link is the state's list of all 67 Supervisors. */}
      {!race && (
        <p
          role="status"
          className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
        >
          {houseRaceNotLoaded(district)}{" "}
          <a
            href={supervisorLink().url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            {supervisorLink().label}
          </a>
          .
        </p>
      )}
    </section>
  );
}
