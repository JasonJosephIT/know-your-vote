import { LinkRow, LinkRowList } from "@/components/ui/LinkRows";
import { CaretGlyph } from "@/components/ui/Glyphs";
import { BallotQuestions } from "@/components/features/BallotQuestions";
import { getActiveMeasures } from "@/lib/measures";
import { getStatewideRaces, raceStatusLabel } from "@/lib/races";
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
   (the names are read as the row's text).

   Readability pass (home readability spec 2026-10-12, PR B, founder
   decision 2a). The names were one grey 14px run-on line per race. Now
   each candidate is a line of dark body text, stacked on phones and
   flowing inline from sm, with the party code after it in muted 14px: the
   same size, colour and spacing for every name, in ballot order, none cut.
   "8 candidates:" went, because a list already says how many. The
   election date is said once, in the intro, when every race shares it (a
   race with its own date keeps its own line), and the party legend sits
   behind "What the party codes mean", a native <details> that works
   without JavaScript. Its caret turns without a transition (nothing moves
   on phones, founder D2 a). */

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

  /* The general election's date, when every race shares it, so the intro
     says it once instead of every row. A race with no date or its own one
     makes this null, and each row then says its own. */
  const dates = new Set(races.map((r) => r.generalDate));
  const sharedDate = dates.size === 1 ? formatDate(races[0].generalDate) : null;

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
            <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
              On every Florida ballot{sharedDate ? ` on ${sharedDate}` : ""},
              whatever your ZIP or party, including no party.
            </p>
            {legend && (
              <details className="group/legend">
                <summary className="inline-flex min-h-[24px] w-fit cursor-pointer list-none items-center gap-1 text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover [&::-webkit-details-marker]:hidden">
                  What the party codes mean
                  <span className="group-open/legend:rotate-180">
                    <CaretGlyph />
                  </span>
                </summary>
                <p className="mt-1 text-body-sm text-on-surface-muted lg:max-w-[65ch]">
                  {legend}
                </p>
              </details>
            )}
          </div>
          <LinkRowList>
            {races.map((race) => {
              const general = sharedDate ? null : formatDate(race.generalDate);
              return (
                <LinkRow
                  key={race.raceId}
                  href={`/races/${race.raceId}`}
                  title={race.office}
                  aside={raceStatusLabel(race.status)}
                >
                  {race.candidates.length > 0 && (
                    <ul className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
                      {race.candidates.map((c) => {
                        const party = partyLabel(c.party);
                        return (
                          <li
                            key={c.candidateId}
                            className="text-body leading-snug text-on-surface sm:whitespace-nowrap"
                          >
                            {c.name}
                            {party && (
                              <span className="text-body-sm text-on-surface-muted">
                                {" "}
                                ({party})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {general && (
                    <p className="text-body-sm text-on-surface-muted">
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
