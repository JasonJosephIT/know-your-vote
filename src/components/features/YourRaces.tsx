import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VotingInfo } from "@/components/features/VotingInfo";
import { ZipEntry } from "@/components/features/ZipEntry";
import { createAnonServerClient } from "@/lib/supabase/server";
import { resolveCounty, resolveZip, ZIP_RE } from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

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
  let result: ResolveResult | null = null;
  if (zip && ZIP_RE.test(zip)) {
    result = await resolveZip(zip, district);
  } else if (county) {
    result = await resolveCounty(county);
  }

  if (!result) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-on-surface-muted">
          Add your ZIP and we&apos;ll show every race on your ballot.
        </p>
        <ZipEntry />
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
        <ZipEntry />
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
        <ZipEntry />
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

      <p className="text-caption text-on-surface-muted">
        Florida is a closed-primary state — you vote in a party&apos;s primary
        only if you&apos;re registered with that party. The general election is
        open to every registered voter.
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
