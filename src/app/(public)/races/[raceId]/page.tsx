import Link from "next/link";
import { RaceCompare } from "@/components/features/RaceCompare";
import { TrackView } from "@/components/features/TrackView";
import { RaceListing } from "@/components/features/RaceListing";
import { RaceHeader } from "@/components/features/RaceHeader";
import { IssueFilter } from "@/components/features/IssueFilter";
import { getRaceBrief } from "@/lib/briefs";
import {
  getRaceListing,
  type RaceListing as RaceListingData,
} from "@/lib/listing";
import { listingCopy, raceStatusLine } from "@/lib/listing-copy";
import { spineOptions } from "@/lib/issue-pick";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const brief = await getRaceBrief(raceId);
  const office =
    brief?.race.office ?? (await getRaceListing(raceId))?.race.office;
  return {
    title: office
      ? `${office} — Know Your Vote`
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
    const listing = await getRaceListing(raceId);
    if (listing) return <ListedRace listing={listing} />;
    return (
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
        <h1 className="text-h1">This race is still in review</h1>
        <p className="text-body text-on-surface-muted">
          A race is published only when every candidate has equal space and
          comparable scrutiny — our Balance Audit hasn&apos;t cleared this one
          yet. Check back soon.
        </p>
        <Link
          href="/candidates?view=races"
          className="text-label text-primary underline underline-offset-2"
        >
          Back to your races
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <RaceHeader race={brief.race}>
        {/* "Equal scrutiny" is a claim about a comparison, and with one
            candidate there is no comparison to make — the Balance Audit's
            variance over a single profile is 0.0 and passes trivially
            (data-architecture.md §3, recorded as `unopposed` by A3). B1 found
            FL-10 in exactly this shape: the file's only UNO row. Say it
            plainly rather than let the standard line imply a fairness check
            that had nothing to weigh.

            D-B (founder 2026-09-07) splits that into two states, because "one
            candidate" turned out to be two different facts. The line above
            stays exactly right for a race whose other candidates withdrew
            after qualifying: the survivor is `qualified`, their ballot is
            already printed, and the voter will see this contest. The stronger
            line below is for the case that is not on the ballot at all —
            nobody filed, so F.S. 101.151(7) leaves the contest off it and the
            candidate takes the office. That is a fact about the ballot in the
            voter's hand, not about our comparison, so it is said first and
            said plainly; a voter looking for this race and not finding it
            deserves to know why. Which state a race is in comes from the DoE's
            own `UNO` code (src/lib/unopposed.ts) — the two are
            indistinguishable by candidate count, which is why deriving it was
            rejected. */}
        {/* 0032 adds the third absent-from-November state, and it is the one
            the two lines below would have got wrong. Florida's nonpartisan
            county races end in August when someone clears 50%, so the seat
            never reaches this ballot — but that candidate BEAT people. The
            unopposed line ("no one filed against this candidate") would be a
            flat untruth about an election that happened, and the
            one-candidate line would imply nobody else ran. Said before both,
            because it is the more specific fact. */}
        {/* The four sentences and their precedence live in
            src/lib/listing-copy.ts so the listing below picks its branch by
            the same rule; the brief's wording is unchanged and pinned by
            scripts/verify-listing.ts. */}
        <p className="text-body-sm text-on-surface-muted">
          {raceStatusLine(
            {
              decidedInPrimary: brief.decidedInPrimary,
              notPrintedOnBallot: brief.notPrintedOnBallot,
              count: brief.candidates.length,
            },
            "brief"
          )}
        </p>
      </RaceHeader>

      <TrackView event="brief_viewed" />
      <IssueFilter
        raceId={raceId}
        options={spineOptions(brief.spineIssues)}
        selected={[]}
      />
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

/* The roster for a race that is visible (listed, or published with a brief
   the audit re-check refused) but has no brief to show — design brief,
   `listed` tier. Same heading, same status rule, then who is on the ballot
   and nothing else. Every sentence here is about the ballot or about our
   process, never about a candidate: an empty comparison would read as "these
   candidates have no positions", and the honest statement is that nobody's
   brief is written yet. No TrackView: this is not a brief view, and counting
   it as one would inflate the funnel metric the brief exists to move. */
function ListedRace({ listing }: { listing: RaceListingData }) {
  const copy = listingCopy({
    decidedInPrimary: listing.decidedInPrimary,
    notPrintedOnBallot: listing.notPrintedOnBallot,
    count: listing.candidates.length,
    level: listing.race.level,
  });

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <RaceHeader race={listing.race}>
        <p className="text-body-sm text-on-surface-muted">{copy.status}</p>
      </RaceHeader>

      <section className="flex max-w-[680px] flex-col gap-2 text-body-sm text-on-surface-muted">
        <p>{copy.intro}</p>
        {copy.countyNote && <p>{copy.countyNote}</p>}
      </section>

      <RaceListing listing={listing} />

      <footer className="flex flex-wrap gap-4 text-caption text-on-surface-muted">
        <Link href="/methodology" className="underline underline-offset-2">
          How we stay fair
        </Link>
        <span>
          Candidate order follows the ballot order rule, applied identically to
          every race.
        </span>
        {copy.writeInNote && <span>{copy.writeInNote}</span>}
      </footer>
    </main>
  );
}
