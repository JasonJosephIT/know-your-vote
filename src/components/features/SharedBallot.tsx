import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BallotQuestions } from "@/components/features/BallotQuestions";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces, raceStatusLabel } from "@/lib/races";

/* The ballot every Florida voter shares, rendered with no input at all
   (TASK-067).

   This is the magic moment after the ZIP wall came down: five statewide races
   and three amendments are identical for every voter in the state, so gating
   them behind a ZIP asked a question whose answer changed nothing. Everything
   here is a server component with no client JavaScript — the ballot is in the
   first HTML response, which is what makes it survive a slow connection, a
   blocked script, or a voter who has JavaScript off.

   With nothing visible — or with the database unreachable, which both reads
   degrade to rather than throwing — it says so in plain words instead of
   rendering an empty div. A blank landing page is the one failure that could
   ship unnoticed, so it is worth making visible.

   Since the listed tier (0033) a race is visible as soon as its roster is,
   before any brief exists, so each card says which it is (raceStatusLabel).
   The "isn't published yet" copy below is now only the truly-empty case:
   zero races AND zero measures, i.e. nothing at all is even listed.

   `county` is optional and touches one thing: the judges note under the
   ballot questions (JudicialRetentionNote), whose appeals court lines are
   per county. The home page passes the saved district's county name when
   there is one, so a voter who told us their county sees their own court
   there as they do in "Your races"; with no saved district it is absent and
   the note lists every covered county. Every race and amendment above it is
   the same either way, and nothing waits on it. */

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function SharedBallot({
  county,
}: {
  county?: string | null;
} = {}) {
  /* Both are cached and independent, so they overlap rather than queue. */
  const [races, measures] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
  ]);

  if (races.length === 0 && measures.length === 0) {
    return (
      <p className="text-body text-on-surface-muted">
        The ballot isn&apos;t published yet — we publish a race only after every
        candidate in it has been through the same checks. Check back soon.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {races.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-h3">Statewide races</h2>
            <p className="text-caption text-on-surface-muted">
              Every Florida voter gets these, whatever your ZIP and whatever
              party you&apos;re registered with — including no party at all.
            </p>
          </div>
          <ul className="flex flex-col gap-4">
            {races.map((race) => {
              const general = formatDate(race.generalDate);
              return (
                <li key={race.raceId}>
                  <Link href={`/races/${race.raceId}`} className="block">
                    <Card className="transition-shadow hover:shadow-elevation-1">
                      <h3 className="text-h3">{race.office}</h3>
                      <p className="text-body-sm text-on-surface-muted">
                        Statewide
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
        </section>
      )}

      {/* Statewide too, but a distinct kind of thing — a voter scanning for
          candidates should not mistake a ballot question for one. */}
      <BallotQuestions county={county} />
    </div>
  );
}
