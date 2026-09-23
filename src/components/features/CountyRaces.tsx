import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { raceStatusLabel } from "@/lib/races";
import type { CountyRaceSummary } from "@/lib/resolve";

/* The voter's county races: commission, school board, and the county
   offices, listed for the whole county rather than placed on this voter's
   ballot.

   Why per county: nothing resolves a voter to a county commission or
   school-board district yet — there is no crosswalk, and the boundary files
   in docs/general-election/boundaries/ are unbuilt. So this cannot say which
   of these seats a given voter gets, and it says that in the caption rather
   than guessing. Countywide seats (Orange Mayor, say) ARE on every ballot in
   the county, but a race row alone cannot tell a countywide seat from a
   district one, so no card claims it; the caption's "where in the county you
   live" covers both honestly.

   Two groups, because they are two different facts:
     - "On the November ballot": contested seats, one identical card each.
     - "Already decided": seats settled before the general (unopposed.ts D-B)
       — one line each naming the person who takes the office and why the
       seat is not printed. Without this group a voter who knows their seat
       is up would find it missing and read that as a gap in our list.

   Server component with no client JavaScript, like SharedBallot; no party
   anywhere (county seats are mostly nonpartisan, and parties are never
   color-coded here regardless). */

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const DECIDED_COPY: Record<
  NonNullable<CountyRaceSummary["decided"]>,
  string
> = {
  unopposed: "elected without opposition",
  elected_in_primary: "decided in the August primary",
};

/* Deliberately "most": some commission and school board seats are elected
   countywide or at large (Hillsborough 5 and 7, Broward At Large 8), and the
   row cannot say which. */
const PLACEMENT =
  "most commission and school board seats are elected by district, and we can't place you in one from a ZIP or address yet. Your county's sample ballot will say.";

export function CountyRaces({
  county,
  races,
}: {
  county: string;
  races: CountyRaceSummary[];
}) {
  if (races.length === 0) return null;
  const contested = races.filter((r) => r.decided === null);
  const decided = races.filter(
    (
      r
    ): r is CountyRaceSummary & {
      decided: NonNullable<CountyRaceSummary["decided"]>;
      holder: NonNullable<CountyRaceSummary["holder"]>;
    } => r.decided !== null && Boolean(r.holder)
  );

  /* The caption is about the contested seats — decided ones are on no one's
     ballot — so it follows their count: one seat reads as "this race", and a
     county with none says so plainly instead of pointing at an empty list. */
  const caption =
    contested.length === 0
      ? `None of ${county} County's seats this year are contested in November — each one below was settled before the general election.`
      : contested.length === 1
        ? `Whether this race is on your ballot can depend on where in the county you live — ${PLACEMENT}`
        : `Which of these races are on your ballot depends on where in the county you live — ${PLACEMENT}`;

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="county-races-heading"
    >
      <div className="flex flex-col gap-1">
        <h2 id="county-races-heading" className="text-h3">
          {county} County races
        </h2>
        <p className="text-caption text-on-surface-muted">{caption}</p>
      </div>

      {contested.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-label">On the November ballot</h3>
          <ul className="flex flex-col gap-4">
            {contested.map((race) => {
              const general = formatDate(race.generalDate);
              return (
                <li key={race.raceId}>
                  <Link href={`/races/${race.raceId}`} className="block">
                    <Card className="transition-shadow hover:shadow-elevation-1">
                      <h4 className="text-h3">{race.office}</h4>
                      {general && (
                        <p className="text-body-sm text-on-surface-muted">
                          General election {general}
                        </p>
                      )}
                      <p className="text-caption text-on-surface-muted">
                        {raceStatusLabel(race.status)}
                      </p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {decided.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-label">Already decided</h3>
          <p className="text-caption text-on-surface-muted">
            {decided.length === 1
              ? "This seat won't be printed on the November ballot. It was settled before the general election."
              : "These seats won't be printed on the November ballot. Each was settled before the general election."}
          </p>
          <ul className="flex flex-col gap-2">
            {decided.map((race) => (
              <li key={race.raceId} className="text-body-sm text-on-surface">
                <Link
                  href={`/races/${race.raceId}`}
                  className="text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  {race.office}
                </Link>
                {" · "}
                {race.holder.legalName}
                <span className="text-on-surface-muted">
                  {" · "}
                  {DECIDED_COPY[race.decided]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
