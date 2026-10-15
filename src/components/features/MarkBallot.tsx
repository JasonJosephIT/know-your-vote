import Link from "next/link";
import {
  BallotPicker,
  type BallotContest,
  type BallotGroup,
} from "@/components/features/BallotPicker";
import { JudicialRetentionNote } from "@/components/features/JudicialRetentionNote";
import { LocationEntry } from "@/components/features/LocationEntry";
import { RACES_NOT_LOADED } from "@/lib/coverage";
import { ACTIVE_ELECTION_LABEL } from "@/lib/election";
import { addressEntryEnabled, geocoderConfigured } from "@/lib/geocode";
import { racePhotosFor, type RacePhotos } from "@/lib/headshots";
import { getActiveMeasures } from "@/lib/measures";
import { partyLabel } from "@/lib/party-label";
import { getRacesById, type StatewideRace } from "@/lib/races";
import {
  getCoveredDistricts,
  resolveLocation,
  resolveStatewideOnly,
} from "@/lib/resolve";
import { NOT_COVERED_CONTESTS } from "@/lib/scope-copy";
import { supervisorLink } from "@/lib/supervisors";

/* "Mark your ballot" (founder 2026-10-14): Ballotpedia's sample-ballot
   lookup, reworked as our own. Their tool lets a voter star a candidate and
   say yes or no to a question; this is that, on the races Your races places
   for this voter (resolveLocation, the same read), in ballot order, with a
   print button so the choices go to the polls on paper. Built here, not
   embedded: their iframe loads its own trackers, and the privacy page
   promises no third-party request before a click. MarkBallotCard is the
   way in.
   Rendered by /ballot, in the Ballot section.

   What is on it: the voter's races that will be printed (decided seats are
   not), the county's contested races under a note that not all of them may
   be this voter's (CountyRaces says why), and the ballot questions. A
   voter with no location yet gets the statewide ballot, which is on every
   Florida ballot, with the address field right here; placing them reloads
   this page with their races (LocationEntry to="ballot"). The not-covered
   sentence prints with the choices, so the sheet is never taken for the
   whole ballot.

   Headshots follow the race pages' rule (headshots.ts): a race shows every
   candidate's photo or none, so no name sits beside a blank. */

const raceContest = (
  race: StatewideRace,
  photos: RacePhotos | null,
  detail?: string
): BallotContest => ({
  id: race.raceId,
  title: race.office,
  detail,
  href: `/races/${race.raceId}`,
  linkLabel: "About this race",
  choices: race.candidates.map((c) => ({
    value: c.candidateId,
    label: c.name,
    party: partyLabel(c.party),
    photo: photos?.get(c.candidateId)?.src ?? null,
  })),
});

const photosOf = (race: StatewideRace) =>
  racePhotosFor(race.candidates.map((c) => ({ candidate_id: c.candidateId })));

export async function MarkBallot(location: {
  district?: string;
  county?: string;
  scope?: string;
}) {
  const placed = await resolveLocation(location);
  /* No location, or one that no longer places anyone (a stale cookie):
     the statewide ballot, and the address field. */
  const located = Boolean(placed?.inCoverage && !placed.needsCountyConfirm);
  const result =
    placed && located ? placed : await resolveStatewideOnly();

  const onBallot = result.races.filter((r) => !(r.decided && r.holder));
  const contested = (result.countyRaces ?? []).filter(
    (r) => r.decided === null
  );
  const [races, countyRaces, measures] = await Promise.all([
    getRacesById(onBallot.map((r) => r.raceId)),
    getRacesById(contested.map((r) => r.raceId)),
    getActiveMeasures(),
  ]);
  /* A race whose names didn't load has nothing to mark, so it is left out
     rather than shown as an empty choice. */
  const markable = (rs: StatewideRace[]) =>
    rs.filter((r) => r.candidates.length > 0);
  const [racePhotos, countyPhotos] = await Promise.all([
    Promise.all(markable(races).map(photosOf)),
    Promise.all(markable(countyRaces).map(photosOf)),
  ]);

  const groups: BallotGroup[] = [
    {
      id: "your-races",
      heading: result.district ? "Your races" : "Statewide races",
      contests: markable(races).map((r, i) =>
        raceContest(r, racePhotos[i], r.district ?? "Statewide")
      ),
    },
    {
      id: "county-races",
      heading: `${result.county} County races`,
      note: "Which of these are on your ballot can depend on where in the county you live. Your county's sample ballot will say. Leave any that aren't yours blank.",
      contests: markable(countyRaces).map((r, i) =>
        raceContest(r, countyPhotos[i])
      ),
    },
    {
      id: "ballot-questions",
      heading: "Ballot questions",
      contests: measures.map((m) => ({
        id: m.measure_id,
        title: `Amendment ${m.number}`,
        detail: m.official_title,
        href: `/measures/${m.measure_id}`,
        linkLabel: "About this amendment",
        choices: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      })),
    },
  ].filter((g) => g.contests.length > 0);

  const supervisor = supervisorLink(result.countyFips);

  return (
    <div className="flex flex-col gap-5">
      <div className="hidden print:block">
        <p className="text-h2">My choices · {ACTIVE_ELECTION_LABEL}</p>
        <p className="text-body-sm">
          Marked on Know Your Vote. Not an official ballot.
        </p>
      </div>

      {located ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-muted print:hidden">
          {result.coverage === "statewide" ? "Florida" : `${result.county} County`}
          {result.district ? ` · ${result.district}` : ""}
          <Link
            href="/ballot?change=1"
            className="text-caption text-primary underline underline-offset-2"
          >
            Change location
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-2 print:hidden">
          <p className="text-body-sm text-on-surface">
            Add your address to see your U.S. House and county races here too.
          </p>
          <LocationEntry
            to="ballot"
            submitLabel="Show my ballot"
            addressEnabled={addressEntryEnabled()}
            suggestEnabled={geocoderConfigured()}
            districts={await getCoveredDistricts()}
            coverageNote={false}
            pickerCollapsed
          />
        </div>
      )}

      {/* Printed too: the sheet must not read as the whole ballot. */}
      <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
        {NOT_COVERED_CONTESTS}
      </p>

      {groups.length === 0 ? (
        <p
          role="status"
          className="rounded-md bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
        >
          {RACES_NOT_LOADED}{" "}
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
      ) : (
        <BallotPicker groups={groups} />
      )}

      <div className="print:hidden">
        <JudicialRetentionNote county={result.county} />
      </div>
    </div>
  );
}
