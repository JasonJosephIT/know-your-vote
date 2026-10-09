import Link from "next/link";
import type { Metadata, ResolvingMetadata } from "next";
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
import { officeTitle } from "@/lib/office-title";
import { spineOptions } from "@/lib/issue-pick";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import { runningMatesFor } from "@/lib/running-mate";

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

/* The title names the district for a House race (officeTitle), and the
   share card says the same: without an openGraph here the card inherited
   the site's own title, so all sixteen House races shared as one. Setting
   openGraph replaces the layout's whole object (metadata merges shallowly),
   so its description and image are carried over from the parent. */
export async function generateMetadata(
  {
    params,
  }: {
    params: Promise<{ raceId: string }>;
  },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { raceId } = await params;
  const brief = await getRaceBrief(raceId);
  const race = brief?.race ?? (await getRaceListing(raceId))?.race;
  if (!race) return { title: "Race not published — Know Your Vote" };
  const title = `${officeTitle(race)} — Know Your Vote`;
  const og = (await parent).openGraph;
  return {
    title,
    openGraph: {
      title,
      type: "website",
      ...(og?.siteName ? { siteName: og.siteName } : {}),
      ...(og?.description ? { description: og.description } : {}),
      ...(og?.images ? { images: og.images } : {}),
    },
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
        {/* Anonymous reads can't tell a race in review from one that doesn't
            exist (RLS hides both), so this can't promise it's coming: a
            mistyped, retired or stale shared link lands here too, and "check
            back soon" would never work for those (interface review
            2026-10-05). The way out goes to the races we do cover, which
            every visitor has, rather than "your races", which a visitor with
            no saved district doesn't. */}
        <h1 className="text-h1">This race isn&rsquo;t published</h1>
        <p className="text-body text-on-surface-muted">
          It may still be in review, or the link may be out of date. A race is
          published only after every candidate in it has been through the same
          checks, including our Balance Audit.
        </p>
        <Link
          href="/"
          className="text-label text-primary underline underline-offset-2"
        >
          See the races we cover
        </Link>
      </main>
    );
  }

  /* The race-level card lines (roster-completeness spec §3.5, §3.6) are
     computed here, at render, on the rows the cached loader returned, so a
     code change to them takes effect on its deploy (§3.9). */
  const raceCandidates = brief.candidates.map((c) => c.candidate);

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      {/* The heading names the district for a House race (officeTitle);
          only the header's copy of the row changes. */}
      <RaceHeader race={{ ...brief.race, office: officeTitle(brief.race) }}>
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
      <RaceCompare brief={brief} runningMates={runningMatesFor(raceCandidates)} />

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
  const raceCandidates = listing.candidates.map((c) => c.candidate);

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <RaceHeader race={{ ...listing.race, office: officeTitle(listing.race) }}>
        <p className="text-body-sm text-on-surface-muted">{copy.status}</p>
      </RaceHeader>

      <section className="flex max-w-[680px] flex-col gap-2 text-body-sm text-on-surface-muted">
        <p>{copy.intro}</p>
        {copy.countyNote && <p>{copy.countyNote}</p>}
      </section>

      <RaceListing listing={listing} runningMates={runningMatesFor(raceCandidates)} />

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
