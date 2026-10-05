import { orderCandidates } from "@/lib/briefs";
import {
  isPolicyAreaId,
  policyAreaIdsFor,
  policyAreasFor,
  POLICY_AREAS,
  type PolicyAreaRef,
} from "@/lib/policy-areas";
import { COVERED_COUNTIES, countyForRaceDistrict } from "@/lib/counties";
import { createAnonServerClient } from "@/lib/supabase/server";
import { isDecidedInPrimary, isUnopposedContest } from "@/lib/unopposed";
import type { Candidate, Race } from "@/types/schema";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";

/* Browsable candidate directory across the four covered counties. RLS keeps
   this to races at `listed` or `published` (0033) — the roster is visible
   before any brief is; within each race the fixed ballot-order rule applies,
   and races sort by a neutral office ordering (statewide first, then
   districts by number, then each county's own races) — never by anything
   editorial.

   Candidate -> race comes from `race.candidate_ids`, not from `profile`:
   profiles exist only for published races (they are brief content, gated on
   `published`), so mapping through them would hide every listed candidate.
   Profiles still decide two things: which candidates have a brief to link
   to, and — through their races' issues and positions — the policy areas. */

/* A directory candidate, plus the policy areas they have a STATED position
   in. Stated is the whole point of the filter: a voter who picks "Housing"
   wants the candidates who have said something about housing, and a
   `no_stated_position_found` row is a recorded silence, not a position. */
export interface DirectoryCandidate extends Pick<
  Candidate,
  "candidate_id" | "legal_name" | "party" | "official_site"
> {
  policyAreas: PolicyAreaRef[];
  /** A profile row is readable, i.e. the race is published and this
      candidate has an audited brief. False for a listed-only candidate,
      whose page is the roster listing. */
  hasBrief: boolean;
  /** Set when this candidate's seat was settled before November (the D-B
      predicates in unopposed.ts) — they take the office and are not printed
      on the ballot. null for everyone in a contested race. */
  decided: DecidedSeat | null;
}

export type DecidedSeat = "unopposed" | "elected_in_primary";

export interface DirectoryRace {
  race: Pick<Race, "race_id" | "office" | "district" | "level">;
  candidates: DirectoryCandidate[];
  /** The race-level form of DirectoryCandidate.decided, so the count line can
      say how many of the races shown are seats already decided. */
  decided: DecidedSeat | null;
}

/** One line of the policy-area filter: the area, and how many candidates in
    the current search have a stated position in it. Counted BEFORE the area
    filter is applied, so the options do not collapse to the one already
    chosen. */
export interface PolicyAreaOption extends PolicyAreaRef {
  count: number;
}

const districtNumber = (d: string | null) =>
  d ? Number(d.replace(/\D/g, "")) || 0 : 0;

function sanitizeQuery(q: string): string {
  return q
    .replace(/[^\w\s&.'-]/g, "")
    .trim()
    .slice(0, 80);
}

export async function browseCandidates(options: {
  q?: string;
  countyFips?: string;
  area?: string;
}): Promise<{
  races: DirectoryRace[];
  total: number;
  q: string;
  /** The area actually filtered on: the requested one when the taxonomy knows
      it, otherwise null. An unknown id from the query string filters nothing
      rather than emptying the page. */
  area: string | null;
  areaOptions: PolicyAreaOption[];
  /** How many of `races` are seats already decided, so the count line can
      keep "on the ballot" to where it is true. */
  decidedRaces: number;
}> {
  const q = sanitizeQuery(options.q ?? "");
  const area = isPolicyAreaId(options.area) ? options.area : null;
  const county = COVERED_COUNTIES.find((c) => c.fips === options.countyFips);
  const supabase = await createAnonServerClient();

  const [racesRes, profilesRes] = await Promise.all([
    supabase
      .from("race")
      .select("race_id, office, district, level, candidate_ids")
      .eq("election", ACTIVE_ELECTION_KIND),
    supabase.from("profile").select("candidate_id"),
  ]);
  let races = (racesRes.data ?? []) as Array<
    Pick<Race, "race_id" | "office" | "district" | "level" | "candidate_ids">
  >;

  /* County filter: statewide races always apply; district races only where
     the district overlaps that county (per the Census crosswalk); county
     races only for their own county, matched on the district prefix
     (countyForRaceDistrict). With no county chosen every race stays, county
     races of all four included. */
  if (county) {
    const { data: zipRows } = await supabase
      .from("zip_district")
      .select("congressional_district")
      .eq("county_fips", county.fips);
    const districts = new Set(
      (zipRows ?? []).map((r) => r.congressional_district)
    );
    races = races.filter((r) =>
      r.level === "county"
        ? countyForRaceDistrict(r.district)?.fips === county.fips
        : r.district === null || districts.has(r.district)
    );
  }

  /* candidate_id -> race_id, from the ballot order itself. First race wins
     if an id ever appeared twice, which the pipeline does not produce. */
  const byRace = new Map<string, string>();
  for (const r of races) {
    for (const id of r.candidate_ids ?? []) {
      if (!byRace.has(id)) byRace.set(id, r.race_id);
    }
  }
  const candidateIds = [...byRace.keys()];
  const withBrief = new Set(
    (profilesRes.data ?? []).map((p) => p.candidate_id as string)
  );

  let candidateQuery = supabase
    .from("candidate")
    .select(
      "candidate_id, legal_name, party, official_site, office_sought, qualifying_status"
    )
    .in("candidate_id", candidateIds)
    /* Printed ballot lines only (D1). The directory is a browse surface, so an
       excluded filer here would be a name a voter can never vote for. */
    .eq("ballot_status", "ballot");
  if (q) {
    candidateQuery = candidateQuery.or(
      `legal_name.ilike.%${q}%,office_sought.ilike.%${q}%,party.ilike.%${q}%`
    );
  }
  const { data: candidateRows } = await candidateQuery;

  /* Seats already decided (unopposed.ts D-B: nobody filed, or settled in the
     August primary) stay IN the directory, marked. The founder's 2026-09-21
     call (0032 header) is that a voter must be able to look up the person
     who took a seat unopposed, and a name search here is where they will
     look. The card says the seat is not printed, so the listing never
     implies a vote that does not exist.

     Marked by the two predicates, never by a count. They are handed the
     race's whole ballot: `candidate_ids` is the ballot order, so when it
     holds one id the one matched row IS the whole ballot — the same input
     the race page gives them. A race with more ids is never decided (both
     predicates require exactly one ballot candidate), and passing a
     name-search subset instead would let a filtered-down contested race
     look like one. hasWriteIn is false for the reason racesForCounty records
     in resolve.ts (write-ins are out of candidate_ids and their profile rows
     are not readable at `listed`). */
  const raceById = new Map(races.map((r) => [r.race_id, r]));
  const decidedOf = (
    c: Pick<Candidate, "candidate_id" | "qualifying_status">
  ): DecidedSeat | null => {
    const race = raceById.get(byRace.get(c.candidate_id) ?? "");
    if (!race || (race.candidate_ids ?? []).length !== 1) return null;
    if (isUnopposedContest([c], false)) return "unopposed";
    if (isDecidedInPrimary([c], false)) return "elected_in_primary";
    return null;
  };
  const candidates = (candidateRows ?? []) as Array<
    Pick<
      Candidate,
      | "candidate_id"
      | "legal_name"
      | "party"
      | "official_site"
      | "qualifying_status"
    >
  >;
  const raceIds = new Set(races.map((r) => r.race_id));

  /* Policy areas per candidate.

     Two reads, both bounded by what is already in scope: the issues of the
     races on this page, and the positions of the candidates on it. The areas
     themselves are derived from the issue TITLE in src/lib/policy-areas.ts
     rather than stored, so there is nothing to filter on in SQL and the join
     happens here. That is affordable because RLS cuts issues and positions
     to published races — a listed race contributes no rows here, which is
     also why the area filter naturally shows only candidates with a brief.

     Only `stated` positions count — see DirectoryCandidate. */
  const matchedIds = candidates.map((c) => c.candidate_id);
  const [issuesRes, positionsRes] = await Promise.all([
    supabase
      .from("issue")
      .select("issue_id, title, description")
      .in("race_id", [...raceIds]),
    matchedIds.length > 0
      ? supabase
          .from("position")
          .select("candidate_id, issue_id, coverage")
          .in("candidate_id", matchedIds)
          .eq("coverage", "stated")
      : Promise.resolve({ data: [] }),
  ]);

  /* One categorization per issue, not one per position: a spine issue is
     shared by every candidate in the race, and categorizing it once is also
     what guarantees they all get the same answer. */
  const areasByIssue = new Map<string, string[]>(
    (
      (issuesRes.data ?? []) as Array<{
        issue_id: string;
        title: string;
        description: string | null;
      }>
    ).map((i) => [
      i.issue_id,
      policyAreaIdsFor({ title: i.title, description: i.description }),
    ])
  );

  const areaIdsByCandidate = new Map<string, Set<string>>();
  for (const row of (positionsRes.data ?? []) as Array<{
    candidate_id: string;
    issue_id: string;
  }>) {
    const ids = areasByIssue.get(row.issue_id);
    if (!ids || ids.length === 0) continue;
    const set = areaIdsByCandidate.get(row.candidate_id) ?? new Set<string>();
    for (const id of ids) set.add(id);
    areaIdsByCandidate.set(row.candidate_id, set);
  }

  /* Counted over everything the name/county search matched, before the area
     filter narrows it, so every option stays reachable in one click. An area
     with no candidates is dropped, EXCEPT the one currently filtered on: a
     search that empties it must still show it as chosen, or the control would
     read "Any policy area" while an area filter is plainly in force. */
  const areaOptions: PolicyAreaOption[] = POLICY_AREAS.map((a) => ({
    ...a,
    count: matchedIds.filter((id) => areaIdsByCandidate.get(id)?.has(a.id))
      .length,
  })).filter((o) => o.count > 0 || o.id === area);

  const inArea = (candidateId: string) =>
    area === null || (areaIdsByCandidate.get(candidateId)?.has(area) ?? false);

  const withAreas = (
    c: Pick<
      Candidate,
      | "candidate_id"
      | "legal_name"
      | "party"
      | "official_site"
      | "qualifying_status"
    >
  ): DirectoryCandidate => ({
    candidate_id: c.candidate_id,
    legal_name: c.legal_name,
    party: c.party,
    official_site: c.official_site,
    policyAreas: policyAreasFor(areaIdsByCandidate.get(c.candidate_id) ?? []),
    hasBrief: withBrief.has(c.candidate_id),
    decided: decidedOf(c),
  });

  /* Statewide, then district races by number, then county races — grouped
     by county in COVERED_COUNTIES order, then by office. County district
     codes carry seat numbers too ('ORA-CC-2'), so without the tier split
     they would interleave with FL-2. */
  const countyOrder = new Map(COVERED_COUNTIES.map((c, i) => [c.fips, i]));
  const tier = (r: { district: string | null; level: string }) =>
    r.district === null ? 0 : r.level === "county" ? 2 : 1;
  const grouped: DirectoryRace[] = races
    .sort((a, b) => {
      if (tier(a) !== tier(b)) return tier(a) - tier(b);
      if (tier(a) === 2) {
        const ca =
          countyOrder.get(countyForRaceDistrict(a.district)?.fips ?? "") ?? 99;
        const cb =
          countyOrder.get(countyForRaceDistrict(b.district)?.fips ?? "") ?? 99;
        if (ca !== cb) return ca - cb;
        return a.office.localeCompare(b.office, "en", { numeric: true });
      }
      if (a.district !== b.district) {
        return districtNumber(a.district) - districtNumber(b.district);
      }
      return a.office.localeCompare(b.office);
    })
    .map((race) => {
      const shown = orderCandidates(
        candidates
          .filter((c) => byRace.get(c.candidate_id) === race.race_id)
          .filter((c) => inArea(c.candidate_id))
          .map(withAreas),
        race.candidate_ids ?? []
      );
      return {
        race,
        candidates: shown,
        /* A decided race has one candidate, so its one card carries the
           race's state. */
        decided: shown.length === 1 ? shown[0].decided : null,
      };
    })
    .filter((g) => g.candidates.length > 0);

  return {
    races: grouped,
    total: grouped.reduce((n, g) => n + g.candidates.length, 0),
    decidedRaces: grouped.filter((g) => g.decided !== null).length,
    q,
    area,
    areaOptions,
  };
}
