import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VotingInfo } from "@/components/features/VotingInfo";
import { resolveCounty, resolveZip, ZIP_RE } from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

export const metadata = { title: "Your races — Know Your Vote" };

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function raceDates(raceIds: string[]) {
  /* key_dates ride along on the resolve payload's races only as ids; the
     races list shows election dates, so fetch them here. */
  const { createAnonServerClient } = await import("@/lib/supabase/server");
  const supabase = await createAnonServerClient();
  const { data } = await supabase
    .from("race")
    .select("race_id, key_dates, election")
    .in("race_id", raceIds);
  return new Map(
    (data ?? []).map((r) => [r.race_id, r as { key_dates: Record<string, string>; election: string }])
  );
}

export default async function RacesPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; district?: string; county?: string }>;
}) {
  const { zip, district, county } = await searchParams;

  let result: ResolveResult | null = null;
  if (zip && ZIP_RE.test(zip)) {
    result = await resolveZip(zip, district);
  } else if (county) {
    result = await resolveCounty(county);
  }

  if (!result) {
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">Your races</h1>
        <p className="text-body text-on-surface-muted">
          Add your ZIP or county and we&apos;ll show your races.
        </p>
        <Link href="/" className="text-label text-primary underline underline-offset-2">
          Enter your ZIP
        </Link>
      </main>
    );
  }

  if (!result.inCoverage) {
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">Your races</h1>
        <p className="text-body text-on-surface-muted">
          We don&apos;t cover that area yet — right now it&apos;s the Miami,
          Fort Lauderdale, Tampa, and Orlando metros.
        </p>
        <Link href="/" className="text-label text-primary underline underline-offset-2">
          Try a different ZIP or pick a county
        </Link>
      </main>
    );
  }

  if (result.needsCountyConfirm) {
    /* Split ZIP arriving by URL: send them back through confirmation. */
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">One more step</h1>
        <p className="text-body text-on-surface-muted">
          That ZIP spans more than one congressional district (
          {result.candidateDistricts?.join(", ")}). Head back and confirm yours
          so we show the right races.
        </p>
        <Link href="/" className="text-label text-primary underline underline-offset-2">
          Confirm my district
        </Link>
      </main>
    );
  }

  const dates = await raceDates(result.races.map((r) => r.raceId));

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Your races</h1>
        <p className="flex flex-wrap items-center gap-2 text-body-sm text-on-surface-muted">
          {result.county}
          {result.district ? ` · ${result.district}` : ""}
          <Link
            href="/"
            className="text-caption text-primary underline underline-offset-2"
          >
            Change location
          </Link>
        </p>
      </header>

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
                    <h2 className="text-h3">{race.office}</h2>
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
          Showing statewide races. <Link href="/" className="underline">Enter your ZIP</Link>{" "}
          to add your congressional district&apos;s races.
        </p>
      )}

      <VotingInfo zip={zip && ZIP_RE.test(zip) ? zip : ""} />
    </main>
  );
}
