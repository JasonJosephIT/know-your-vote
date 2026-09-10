import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BallotQuestions } from "@/components/features/BallotQuestions";
import { VotingInfo } from "@/components/features/VotingInfo";
import { LocationEntry } from "@/components/features/LocationEntry";
import { createAnonServerClient } from "@/lib/supabase/server";
import { districtRaceMissing } from "@/lib/coverage";
import {
  getCoveredDistricts,
  resolveCounty,
  resolveDistrict,
  resolveZip,
  ZIP_RE,
} from "@/lib/resolve";
import { geocoderConfigured } from "@/lib/geocode";
import type { ResolveResult } from "@/types/app";

const DISTRICT_RE = /^FL-\d{1,2}$/;

/* The "Your races" view inside the Candidates hub: ZIP/county in, the
   voter's ballot out. Formerly the standalone /races page. */

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
}: {
  zip?: string;
  district?: string;
  county?: string;
}) {
  const districts = await getCoveredDistricts();

  let result: ResolveResult | null = null;
  if (zip && ZIP_RE.test(zip)) {
    result = await resolveZip(zip, district);
  } else if (district && DISTRICT_RE.test(district) && county) {
    /* An address result, a confirmed ZIP, or the saved district — the district
       is already known, so there is nothing to look up but the races. */
    result = await resolveDistrict(county, district);
  } else if (county) {
    result = await resolveCounty(county);
  }

  if (!result) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-on-surface-muted">
          Add your ZIP and we&apos;ll show every race on your ballot.
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
          We don&apos;t cover that area yet — right now it&apos;s the Miami,
          Fort Lauderdale, Tampa, and Orlando metros. Try another ZIP or pick a
          county:
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

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap items-center gap-2 text-body-sm text-on-surface-muted">
        {result.county}
        {result.district ? ` · ${result.district}` : ""}
        <Link
          href="/candidates?view=races"
          className="text-caption text-primary underline underline-offset-2"
        >
          Change location
        </Link>
      </p>

      {result.races.length === 0 ? (
        <p className="text-body text-on-surface-muted">
          Your races aren&apos;t published yet — our Balance Audit publishes a
          race only when every candidate has equal space and equal scrutiny.
          Check back soon.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {result.races.map((race) => {
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
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
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
            What&apos;s above is the statewide ballot every Florida voter shares
            — your district&apos;s race will appear here once it&apos;s
            published.
          </p>
        )}

      {/* Statewide, so they belong below the location-specific races rather
          than inside that list — a voter scanning for candidates should not
          mistake a ballot question for one. */}
      <BallotQuestions />

      <p className="text-caption text-on-surface-muted">
        Every registered Florida voter gets the same ballot in the general
        election, whatever party you&apos;re registered with — including no
        party at all. If you couldn&apos;t vote in August&apos;s closed primary,
        you can vote on all of this.
      </p>

      {!result.district && result.races.length > 0 && (
        <p className="text-caption text-on-surface-muted">
          Showing statewide races. Enter your ZIP above to add your
          congressional district&apos;s races.
        </p>
      )}

      <VotingInfo zip={zip && ZIP_RE.test(zip) ? zip : ""} />
    </div>
  );
}
