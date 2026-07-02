import { orderCandidates } from "@/lib/briefs";
import { COVERED_COUNTIES } from "@/lib/resolve";
import { createAnonServerClient } from "@/lib/supabase/server";
import type { Candidate, Race } from "@/types/schema";

/* Browsable candidate directory across the four covered counties. RLS keeps
   this to published races only; within each race the fixed ballot-order rule
   applies, and races sort by a neutral office ordering (statewide first,
   then districts by number) — never by anything editorial. */

export interface DirectoryRace {
  race: Pick<Race, "race_id" | "office" | "district" | "level">;
  candidates: Array<
    Pick<Candidate, "candidate_id" | "legal_name" | "party" | "official_site">
  >;
}

const districtNumber = (d: string | null) =>
  d ? Number(d.replace(/\D/g, "")) || 0 : 0;

function sanitizeQuery(q: string): string {
  return q.replace(/[^\w\s&.'-]/g, "").trim().slice(0, 80);
}

export async function browseCandidates(options: {
  q?: string;
  countyFips?: string;
}): Promise<{ races: DirectoryRace[]; total: number; q: string }> {
  const q = sanitizeQuery(options.q ?? "");
  const county = COVERED_COUNTIES.find((c) => c.fips === options.countyFips);
  const supabase = await createAnonServerClient();

  const [racesRes, profilesRes] = await Promise.all([
    supabase.from("race").select("race_id, office, district, level, candidate_ids"),
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
    .in("candidate_id", candidateIds);
  if (q) {
    candidateQuery = candidateQuery.or(
      `legal_name.ilike.%${q}%,office_sought.ilike.%${q}%,party.ilike.%${q}%`
    );
  }
  const { data: candidates } = await candidateQuery;

  const byRace = new Map(
    (profilesRes.data ?? []).map((p) => [p.candidate_id, p.race_id])
  );

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
        (candidates ?? []).filter((c) => byRace.get(c.candidate_id) === race.race_id),
        race.candidate_ids ?? []
      ),
    }))
    .filter((g) => g.candidates.length > 0);

  return {
    races: grouped,
    total: grouped.reduce((n, g) => n + g.candidates.length, 0),
    q,
  };
}
