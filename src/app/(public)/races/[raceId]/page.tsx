import Link from "next/link";
import { RaceCompare } from "@/components/features/RaceCompare";
import { TrackBriefView } from "@/components/features/TrackBriefView";
import { getRaceBrief } from "@/lib/briefs";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";

export const revalidate = 3600;

/* Prerender every published race at build time; new publications render on
   demand and stick via ISR (TASK-046). */
export async function generateStaticParams() {
  try {
    const supabase = await createAnonServerClient();
    const { data } = await supabase
      .from("race")
      .select("race_id")
      .eq("election", ACTIVE_ELECTION_KIND);
    return (data ?? []).map((r) => ({ raceId: r.race_id }));
  } catch {
    return [];
  }
}

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const brief = await getRaceBrief(raceId);
  return {
    title: brief
      ? `${brief.race.office} — Know Your Vote`
      : "Race in review — Know Your Vote",
  };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const brief = await getRaceBrief(raceId);

  if (!brief) {
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">This race is still in review</h1>
        <p className="text-body text-on-surface-muted">
          A race is published only when every candidate has equal space and
          comparable scrutiny — our Balance Audit hasn&apos;t cleared this one
          yet. Check back soon.
        </p>
        <Link
          href="/races"
          className="text-label text-primary underline underline-offset-2"
        >
          Back to your races
        </Link>
      </main>
    );
  }

  const general = formatDate(brief.race.key_dates?.general_date);
  const registration = formatDate(brief.race.key_dates?.registration_deadline);

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{brief.race.office}</h1>
        <p className="text-body-sm text-on-surface-muted">
          {brief.race.district ?? "Statewide"}
          {general ? ` · General election ${general}` : ""}
          {registration ? ` · Register by ${registration}` : ""}
        </p>
        <p className="text-body-sm text-on-surface-muted">
          Here&apos;s your race — every candidate, same space, same scrutiny.
        </p>
      </header>

      <TrackBriefView />
      <RaceCompare brief={brief} />

      <footer className="flex flex-wrap gap-4 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2">
          How we stay fair
        </Link>
        <span>
          Candidate order follows the ballot order rule, applied identically to
          every race.
        </span>
      </footer>
    </main>
  );
}
