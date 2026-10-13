import { LinkRow, LinkRowList } from "@/components/ui/LinkRows";
import { BallotQuestions } from "@/components/features/BallotQuestions";
import { getActiveMeasures } from "@/lib/measures";
import {
  getStatewideRaces,
  raceStatusLabel,
  type StatewideRaceCandidate,
} from "@/lib/races";
import { partyLabel, partyLegend } from "@/lib/party-label";
import { BALLOT_NOT_LOADED, STATEWIDE_NOT_LOADED } from "@/lib/coverage";
import { supervisorLink } from "@/lib/supervisors";

/* The ballot every Florida voter shares, rendered with no input at all
   (TASK-067).

   This is the magic moment after the ZIP wall came down: five statewide races
   and three amendments are identical for every voter in the state, so gating
   them behind a ZIP asked a question whose answer changed nothing. Everything
   here is a server component with no client JavaScript — the ballot is in the
   first HTML response, which is what makes it survive a slow connection, a
   blocked script, or a voter who has JavaScript off.

   With nothing visible — the database unreachable, which both reads
   degrade to rather than throwing — it says so in plain words instead of
   rendering an empty div. A blank landing page is the one failure that could
   ship unnoticed, so it is worth making visible.

   Since the listed tier (0033) a race is visible as soon as its roster is,
   before any brief exists, so each card says which it is (raceStatusLabel).
   The whole 2026 roster is listed, so zero races AND zero measures is a
   failed read, never an unpublished ballot, and the copy says that rather
   than "isn't published yet ... check back soon" (founder rule 2026-10-12,
   BALLOT_NOT_LOADED in coverage.ts).

   Race rows (inspiration pass 2026-10-05). Each race used to be a tall card
   saying only its office, "Statewide" and its status, so five races filled
   a screen and none said who was running. Now they share one bordered
   list, one row each: the office (the row's only link), its status, and
   every candidate on the ballot with their party, in ballot order. Every
   name is printed, never "and 5 more": a cut-off list would give the first
   names on the ballot a place the rest don't get. Party is plain text
   through partyLabel, never a colour. The whole row is clickable through
   the link's ::after, so the link's accessible name stays the office alone
   (the names are read as the row's text). */

function candidateList(candidates: StatewideRaceCandidate[]) {
  return candidates
    .map((c) => {
      const party = partyLabel(c.party);
      return party ? `${c.name} (${party})` : c.name;
    })
    .join(", ");
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function SharedBallot() {
  /* Both are cached and independent, so they overlap rather than queue. */
  const [races, measures] = await Promise.all([
    getStatewideRaces(),
    getActiveMeasures(),
  ]);

  /* No county here: the state's list of all 67 Supervisors. */
  const supervisor = supervisorLink();
  if (races.length === 0 && measures.length === 0) {
    return (
      <p
        role="status"
        className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
      >
        {BALLOT_NOT_LOADED}{" "}
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
    );
  }

  /* One line saying what the party codes in the rows stand for, built from
     the codes actually present, in ballot order (party-label.ts). */
  const legend = partyLegend(
    races.flatMap((r) => r.candidates.map((c) => c.party))
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The questions loaded and the races did not: say which half is
          missing rather than present the questions as the whole ballot. */}
      {races.length === 0 && (
        <p
          role="status"
          className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
        >
          {STATEWIDE_NOT_LOADED}{" "}
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
      )}
      {races.length > 0 && (
        <section id="statewide-races" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2">Statewide races</h2>
            <p className="text-body-sm text-on-surface-muted">
              Every Florida voter gets these, whatever your ZIP and whatever
              party you&rsquo;re registered with — including no party at all.
            </p>
            {legend && (
              <p className="text-body-sm text-on-surface-muted">{legend}</p>
            )}
          </div>
          <LinkRowList>
            {races.map((race) => {
              const general = formatDate(race.generalDate);
              const n = race.candidates.length;
              return (
                <LinkRow
                  key={race.raceId}
                  href={`/races/${race.raceId}`}
                  title={race.office}
                  aside={raceStatusLabel(race.status)}
                >
                  {n > 0 && (
                    <p className="text-body-sm text-on-surface-muted">
                      {n === 1 ? "1 candidate" : `${n} candidates`}:{" "}
                      {candidateList(race.candidates)}
                    </p>
                  )}
                  {general && (
                    <p className="text-caption text-on-surface-muted">
                      General election {general}
                    </p>
                  )}
                </LinkRow>
              );
            })}
          </LinkRowList>
        </section>
      )}

      {/* Statewide too, but a distinct kind of thing — a voter scanning for
          candidates should not mistake a ballot question for one. */}
      <BallotQuestions />
    </div>
  );
}
