import { orderCandidates } from "@/lib/briefs";
import {
  isPolicyAreaId,
  policyAreaIdsFor,
  policyAreasFor,
  POLICY_AREAS,
  type PolicyAreaRef,
} from "@/lib/policy-areas";
import { COVERED_COUNTIES } from "@/lib/resolve";
import { createAnonServerClient } from "@/lib/supabase/server";
import type { Candidate, Race } from "@/types/schema";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";

/* Browsable candidate directory across the four covered counties. RLS keeps
   this to published races only; within each race the fixed ballot-order rule
   applies, and races sort by a neutral office ordering (statewide first,
   then districts by number) — never by anything editorial. */

/* A directory candidate, plus the policy areas they have a STATED position
   in. Stated is the whole point of the filter: a voter who picks "Housing"
   wants the candidates who have said something about housing, and a
   `no_stated_position_found` row is a recorded silence, not a position. */
export interface DirectoryCandidate
  extends Pick<
    Candidate,
    "candidate_id" | "legal_name" | "party" | "official_site"
  > {
  policyAreas: PolicyAreaRef[];
}

export interface DirectoryRace {
  race: Pick<Race, "race_id" | "office" | "district" | "level">;
  candidates: DirectoryCandidate[];
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
  return q.replace(/[^\w\s&.'-]/g, "").trim().slice(0, 80);
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
    supabase.from("profile").select("candidate_id, race_id"),
  ]);
  let races = (racesRes.data ?? []) as Array<
    Pick<Race, "race_id" | "office" | "district" | "level" | "candidate_ids">
  >;

  /* County filter: statewide races always apply; district races only where
     the district overlaps that county (per the Census crosswalk). */
  if (county) {
    const { data: zipRows } = await supabase
      .from("zip_district")
      .select("congressional_district")
      .eq("county_fips", county.fips);
    const districts = new Set((zipRows ?? []).map((r) => r.congressional_district));
    races = races.filter((r) => r.district === null || districts.has(r.district));
  }

  const raceIds = new Set(races.map((r) => r.race_id));
  const candidateIds = (profilesRes.data ?? [])
    .filter((p) => raceIds.has(p.race_id))
    .map((p) => p.candidate_id);

  let candidateQuery = supabase
    .from("candidate")
    .select("candidate_id, legal_name, party, official_site, office_sought")
    .in("candidate_id", candidateIds)
    /* Printed ballot lines only (D1). The directory is a browse surface, so an
       excluded filer here would be a name a voter can never vote for. */
    .eq("ballot_status", "ballot");
  if (q) {
    candidateQuery = candidateQuery.or(
      `legal_name.ilike.%${q}%,office_sought.ilike.%${q}%,party.ilike.%${q}%`
    );
  }
  const { data: candidates } = await candidateQuery;

  const byRace = new Map(
    (profilesRes.data ?? []).map((p) => [p.candidate_id, p.race_id])
  );

  /* Policy areas per candidate.

     Two reads, both bounded by what is already in scope: the issues of the
     races on this page, and the positions of the candidates on it. The areas
     themselves are derived from the issue TITLE in src/lib/policy-areas.ts
     rather than stored, so there is nothing to filter on in SQL and the join
     happens here. That is affordable because RLS has already cut this to
     published races.

     Only `stated` positions count — see DirectoryCandidate. */
  const matchedIds = (candidates ?? []).map((c) => c.candidate_id);
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
    ((issuesRes.data ?? []) as Array<{
      issue_id: string;
      title: string;
      description: string | null;
    }>).map((i) => [
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
    c: Pick<Candidate, "candidate_id" | "legal_name" | "party" | "official_site">
  ): DirectoryCandidate => ({
    ...c,
    policyAreas: policyAreasFor(areaIdsByCandidate.get(c.candidate_id) ?? []),
  });

  const grouped: DirectoryRace[] = races
    .sort((a, b) => {
      if ((a.district === null) !== (b.district === null)) {
        return a.district === null ? -1 : 1;
      }
      if (a.district !== b.district) {
        return districtNumber(a.district) - districtNumber(b.district);
      }
      return a.office.localeCompare(b.office);
    })
    .map((race) => ({
      race,
      candidates: orderCandidates(
        (candidates ?? [])
          .filter((c) => byRace.get(c.candidate_id) === race.race_id)
          .filter((c) => inArea(c.candidate_id))
          .map(withAreas),
        race.candidate_ids ?? []
      ),
    }))
    .filter((g) => g.candidates.length > 0);

  return {
    races: grouped,
    total: grouped.reduce((n, g) => n + g.candidates.length, 0),
    q,
    area,
    areaOptions,
  };
}
