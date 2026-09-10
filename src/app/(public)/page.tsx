import Link from "next/link";
import { cookies } from "next/headers";
import { DISTRICT_COOKIE, parseDistrictCookie } from "@/lib/district-cookie";
import { DeadlineBanner } from "@/components/features/DeadlineBanner";
import { InstallCard } from "@/components/features/InstallCard";
import { SharedBallot } from "@/components/features/SharedBallot";
import { TrackView } from "@/components/features/TrackView";
import { LocationEntry } from "@/components/features/LocationEntry";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces } from "@/lib/races";
import { getCoveredDistricts } from "@/lib/resolve";
import { placesConfigured } from "@/lib/geocode";

/* Ballot first, ZIP optional (TASK-067).

   The page used to be a ZIP wall: a headline and a text field, with the
   ballot behind them. In the general election that gate asked a question
   whose answer changes one race out of nine, so the ballot moved in front of
   it and the ZIP field became an upgrade.

   The headline changed with it. "Your ballot" was a promise this page cannot
   keep without a ZIP — what it shows is everything on *every* Florida ballot,
   which is most of yours but not all of it. The ZIP prompt below says what it
   adds rather than the headline overclaiming what is already there. */

export default async function Home() {
  /* ballot_viewed is the funnel's new entry event (TASK-071), so it must mean
     "a ballot was on screen" — not "the landing page loaded". Both reads are
     the same unstable_cache calls SharedBallot makes in this render, so this
     costs a cache hit rather than a second query.

     Deliberately mounted here rather than inside SharedBallot: the tracker is
     a client component, and SharedBallot's whole point is that nothing it
     reaches needs JavaScript. verify-shared-ballot enforces exactly that. */
  const [races, measures, districts] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
    getCoveredDistricts(),
  ]);

  /* The saved district. Reading cookies opts this route into dynamic rendering,
     which is why only this page and /candidates do it — the data behind the
     ballot still comes through unstable_cache, so what changes is the shell, not
     the queries. */
  const saved = parseDistrictCookie(
    (await cookies()).get(DISTRICT_COOKIE)?.value
  );
  const ballotRendered = races.length > 0 || measures.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 py-8">
      <h1 className="text-display">Everything on every Florida ballot.</h1>
      <p className="text-body-lg text-on-surface-muted">
        See everyone you can vote for — what they say, what they&apos;ve done,
        and what&apos;s been verified. Equal space, equal scrutiny, every claim
        linked to a source. No ZIP, no account, no agenda.
      </p>
      <DeadlineBanner />

      {ballotRendered && <TrackView event="ballot_viewed" />}
      <SharedBallot />

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        {saved ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Your U.S. House race</h2>
              <p className="text-caption text-on-surface-muted">
                You&apos;re set to {saved.district}. That&apos;s the one part of
                your ballot that depends on where you live — the rest of this
                page is the same for every Florida voter. We remember the
                district, never your address or ZIP; the chip at the top of the
                page changes it or forgets it.
              </p>
            </div>
            <Link
              href={`/candidates?view=races&district=${saved.district}&county=${saved.countyFips}`}
              className="w-fit text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              See your full ballot for {saved.district}
            </Link>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Add your U.S. House race</h2>
              {/* The storage claim, rewritten for the district cookie. TASK-070
                  removed kyv.location and this line said nothing was saved on
                  the device; that stopped being true when the district became
                  something we remember. What is still true, and is the sharper
                  claim, is that the address and the ZIP are never kept. */}
              <p className="text-caption text-on-surface-muted">
                Your congressional district race is the one part of your ballot
                that isn&apos;t on this list, because it depends on where you
                live. Give us your address or ZIP and we&apos;ll add it — or
                skip it and read the rest. We use it to find your district and
                keep only the district itself, never the address or the ZIP.
              </p>
            </div>
            <LocationEntry
              submitLabel="Add my House race"
              placeholder="Your address or ZIP code"
              addressEnabled={placesConfigured()}
              districts={districts}
            />
          </>
        )}
      </section>

      <InstallCard />

      <p className="text-caption text-on-surface-muted">
        We describe what each candidate says, has done, and what&apos;s
        verified. You decide.{" "}
        <Link
          href="/methodology"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          How we stay fair
        </Link>{" "}
        ·{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          Privacy
        </Link>
      </p>
    </main>
  );
}
