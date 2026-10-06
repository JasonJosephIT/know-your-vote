import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BallotQuestions } from "@/components/features/BallotQuestions";
import { CountyRaces } from "@/components/features/CountyRaces";
import { VotingInfo } from "@/components/features/VotingInfo";
import { LocationEntry } from "@/components/features/LocationEntry";
import { createAnonServerClient } from "@/lib/supabase/server";
import { districtRaceMissing, STATEWIDE_BALLOT_HREF } from "@/lib/coverage";
import { coveredCountyNames } from "@/lib/counties";
import {
  getCoveredDistricts,
  resolveCounty,
  resolveDistrict,
  resolveStatewideOnly,
  resolveZip,
  ZIP_RE,
} from "@/lib/resolve";
import { raceStatusLabel } from "@/lib/races";
import { geocoderConfigured } from "@/lib/geocode";
import {
  emailDeliveryConfigured,
  officialSources,
  remindersPaused,
} from "@/lib/notifications/config";
import { DECIDED_TAG, NOT_COVERED_SENTENCE } from "@/lib/scope-copy";
import type {
  DistrictRaceSummary,
  ResolveResultWithCounty,
} from "@/lib/resolve";
import type { DecidedSeat } from "@/lib/unopposed";

const DISTRICT_RE = /^FL-\d{1,2}$/;

/* A district-list race that will not be printed, with the person who takes
   the seat. Both fields are set together by resolve.ts (decidedSeatOf), so
   requiring both here only narrows the type. */
type DecidedDistrictRace = DistrictRaceSummary & DecidedSeat;
const isDecided = (r: DistrictRaceSummary): r is DecidedDistrictRace =>
  Boolean(r.decided && r.holder);

/* The "Your races" view inside the Candidates hub: ZIP/county in, the races
   this guide covers on the voter's ballot out. Formerly the standalone
   /races page. Not the whole ballot: the not-covered line under the location
   says what else the voter's sample ballot has. */

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function raceDates(raceIds: string[]) {
  const supabase = await createAnonServerClient();
  const { data } = await supabase
    .from("race")
    .select("race_id, key_dates, election")
    .in("race_id", raceIds);
  return new Map(
    (data ?? []).map((r) => [
      r.race_id,
      r as { key_dates: Record<string, string>; election: string },
    ])
  );
}

export async function YourRaces({
  zip,
  district,
  county,
  scope,
}: {
  zip?: string;
  district?: string;
  county?: string;
  /* "statewide": a Florida voter we cannot place in a district yet (the
     address path's answer outside the covered counties). */
  scope?: string;
}) {
  const districts = await getCoveredDistricts();

  let result: ResolveResultWithCounty | null = null;
  if (zip && ZIP_RE.test(zip)) {
    result = await resolveZip(zip, district);
  } else if (district && DISTRICT_RE.test(district) && county) {
    /* An address result, a confirmed ZIP, or the saved district — the district
       is already known, so there is nothing to look up but the races. */
    result = await resolveDistrict(county, district);
  } else if (county) {
    result = await resolveCounty(county);
  } else if (scope === "statewide") {
    result = await resolveStatewideOnly();
  }

  if (!result) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-on-surface-muted">
          Add your ZIP and we&apos;ll show the races we cover on your ballot.
        </p>
        <LocationEntry
          addressEnabled={geocoderConfigured()}
          districts={districts}
        />
      </div>
    );
  }

  if (!result.inCoverage) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-on-surface-muted">
          We can&apos;t place that ZIP on a ballot yet. Full statewide coverage
          isn&apos;t available: U.S. House and county races are only for{" "}
          {coveredCountyNames()} counties so far. If you live in Florida,{" "}
          {/* The address field only exists when a geocoder is configured
              (PELIAS_BASE_URL, unset in production on 2026-10-04), so the
              hint follows it rather than pointing at a field that isn't there. */}
          {geocoderConfigured() ? "try your street address, or " : ""}
          <Link
            href={STATEWIDE_BALLOT_HREF}
            className="text-primary underline underline-offset-2"
          >
            see the statewide ballot every Florida voter shares
          </Link>
          .
        </p>
        <LocationEntry
          addressEnabled={geocoderConfigured()}
          districts={districts}
        />
      </div>
    );
  }

  if (result.needsCountyConfirm) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-on-surface-muted">
          That ZIP spans more than one congressional district (
          {result.candidateDistricts?.join(", ")}). Re-enter it below and
          we&apos;ll ask which district is yours:
        </p>
        <LocationEntry
          addressEnabled={geocoderConfigured()}
          districts={districts}
        />
      </div>
    );
  }

  const dates = await raceDates(result.races.map((r) => r.raceId));
  /* Printed races get a card; decided ones (FL-10: one candidate,
     unopposed) get the "Not on your ballot" line below the list instead, so
     the list never presents a race the voter can't vote in as theirs. */
  const printed = result.races.filter((r) => !isDecided(r));
  const decided = result.races.filter(isDecided);

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap items-center gap-2 text-body-sm text-on-surface-muted">
        {result.coverage === "statewide"
          ? "Florida · statewide ballot"
          : result.county}
        {result.district ? ` · ${result.district}` : ""}
        <Link
          href="/candidates?view=races&change=1"
          className="text-caption text-primary underline underline-offset-2"
        >
          Change location
        </Link>
      </p>

      {/* Said first, before any race: the list below is complete for the
          statewide half and silent about the rest, and a voter must not read
          it as their whole ballot. */}
      {result.coverage === "statewide" && (
        <p
          role="status"
          className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
        >
          Full statewide coverage isn&apos;t available yet. Your address is in
          Florida, but outside the counties where we can place U.S. House and
          county races ({coveredCountyNames()}). Below is the statewide ballot
          every Florida voter shares. Your House race and any county or local
          races aren&apos;t here yet.
        </p>
      )}

      {/* Also before any race, on every result: what this guide doesn't
          cover. Without it the list reads as the voter's whole ballot, and
          Florida House and Senate seats, judges and city races are on real
          ballots and not here. Kept in step with CoverageSummary's "Not
          covered" row through NOT_COVERED_SENTENCE (scope-copy.ts). */}
      <p className="text-caption text-on-surface-muted">
        {NOT_COVERED_SENTENCE}{" "}
        <Link
          href="/methodology#not-covered"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          What we don&apos;t cover
        </Link>
      </p>

      {/* The truly-empty case only. Since the listed tier (0033) the roster is
          visible before any brief is, so an empty list now means nothing at
          all is visible for this location — and if county races did come
          back, saying "your races aren't published" above them would
          contradict the page. */}
      {result.races.length === 0 ? (
        (result.countyRaces?.length ?? 0) === 0 && (
          <p className="text-body text-on-surface-muted">
            Your races aren&apos;t published yet — we publish a race only after
            every candidate in it has been through the same checks. Check back
            soon.
          </p>
        )
      ) : (
        printed.length > 0 && (
          <ul className="flex flex-col gap-4">
            {printed.map((race) => {
              const extra = dates.get(race.raceId);
              const general = formatDate(extra?.key_dates?.general_date);
              return (
                <li key={race.raceId}>
                  <Link href={`/races/${race.raceId}`} className="block">
                    <Card className="transition-shadow hover:shadow-elevation-1">
                      <h3 className="text-h3">{race.office}</h3>
                      <p className="text-body-sm text-on-surface-muted">
                        {race.district ?? "Statewide"}
                        {general ? ` · General election ${general}` : ""}
                      </p>
                      <p className="text-caption text-on-surface-muted">
                        {raceStatusLabel(race.status)}
                      </p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      )}

      {/* Races in the voter's own list that will not be printed: FL-10, whose
          only candidate is unopposed, is the case today. Rendered the way
          CountyRaces renders a decided county seat — one line naming the
          person who takes the office and why — under a plainer heading,
          because these are district-matched: certainly this voter's race,
          and certainly not on their ballot. Still linked: the race page says
          the same and has what we have on the candidate. */}
      {decided.length > 0 && (
        <section
          aria-labelledby="not-on-ballot-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="not-on-ballot-heading" className="text-h3">
            Not on your ballot
          </h2>
          <p className="text-caption text-on-surface-muted">
            {decided.length === 1
              ? "This race won't be printed on your November ballot. It was settled before the general election."
              : "These races won't be printed on your November ballot. Each was settled before the general election."}
          </p>
          <ul className="flex flex-col gap-2">
            {decided.map((race) => (
              <li key={race.raceId} className="text-body-sm text-on-surface">
                <Link
                  href={`/races/${race.raceId}`}
                  className="text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  {race.office}
                  {race.district ? ` ${race.district}` : ""}
                </Link>
                {" · "}
                {race.holder.legalName}
                <span className="text-on-surface-muted">
                  {" · "}
                  {DECIDED_TAG[race.decided]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The ZIP resolved and the district race is not here. Without this the
          list reads as a finished ballot: the voter asked for their House race,
          got five statewide races, and nothing said which part is missing.
          Sits directly under the list because it is a statement about the
          list — the county path's counterpart is the caption further down. */}
      {districtRaceMissing(result.district, result.races) &&
        result.races.length > 0 && (
          <p
            role="status"
            className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
          >
            We don&apos;t have the U.S. House race for {result.district} yet.
            The races above are the statewide ones every Florida voter shares
            — your district&apos;s race will appear here once it&apos;s
            published.
          </p>
        )}

      {/* County-matched, not district-matched, so its own section rather than
          part of the list above: every race up there is this voter's (printed,
          or marked not on the ballot), and these may not be (CountyRaces says
          why). Below the district list because that list is the certain
          part. */}
      {result.county && result.countyRaces && result.countyRaces.length > 0 && (
        <CountyRaces county={result.county} races={result.countyRaces} />
      )}

      {/* Statewide, so they belong below the location-specific races rather
          than inside that list — a voter scanning for candidates should not
          mistake a ballot question for one.

          The judges note under them is not statewide: each county votes on
          its own district court of appeal. result.county is the county NAME
          the note is keyed by (the `county` prop above is a FIPS code), so it
          shows this voter's court only. Every branch that reaches here sets
          it from a covered county (resolveZip from zip_district.county_name,
          resolveDistrict and resolveCounty from COVERED_COUNTIES) except the
          statewide-only result, which has no county and so gets the full
          note, as the home page without a saved district does. */}
      <BallotQuestions county={result.county} />

      {/* About party, not geography. It used to open "Every registered
          Florida voter gets the same ballot", which is false — ballots differ
          by where you live, as this page shows — when what it meant is that
          party doesn't limit the general election. */}
      <p className="text-caption text-on-surface-muted">
        Your party doesn&apos;t limit what you can vote on in November.
        Whatever party you&apos;re registered with — including no party at
        all — you can vote in every race on your general election ballot, even
        if you couldn&apos;t vote in August&apos;s closed primary.
      </p>

      {!result.district &&
        result.coverage !== "statewide" &&
        result.races.length > 0 && (
        <p className="text-caption text-on-surface-muted">
          Showing statewide races. To add your U.S. House race, use Change
          location above and enter your ZIP.
        </p>
      )}

      {/* The flags are read here, on the server, because VotingInfo is a
          client component and the env they depend on is secret.
          Unconfigured, it shows this county's official sources instead of a
          form that could only fail; while NOTIFICATIONS_PAUSED is set, its
          copy stops promising reminders (launch handoff 2026-10-04, §2). */}
      <VotingInfo
        zip={zip && ZIP_RE.test(zip) ? zip : ""}
        emailEnabled={emailDeliveryConfigured()}
        remindersOn={!remindersPaused()}
        sources={officialSources(result.county)}
        countyFips={result.countyFips}
      />
    </div>
  );
}
