import { createAnonServerClient } from "@/lib/supabase/server";
import type { ResolveRaceSummary, ResolveResult } from "@/types/app";

export const ZIP_RE = /^\d{5}$/;

export const COVERED_COUNTIES = [
  { fips: "12086", name: "Miami-Dade", metro: "miami" },
  { fips: "12011", name: "Broward", metro: "fort_lauderdale" },
  { fips: "12057", name: "Hillsborough", metro: "tampa" },
  { fips: "12095", name: "Orange", metro: "orlando" },
] as const;

const districtNumber = (d: string) => Number(d.replace(/\D/g, "")) || 0;

/* Races visible to anon are published by construction (RLS filters the
   rest), so "your district has no race yet" and "not published yet" are the
   same honest answer here. */
async function racesForDistrict(district: string): Promise<ResolveRaceSummary[]> {
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("race")
    .select("race_id, office, level, district")
    .or(`district.is.null,district.eq.${district}`)
    .order("level", { ascending: false })
    .order("race_id");
  if (error) throw new Error(`race lookup failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    raceId: r.race_id,
    office: r.office,
    level: r.level,
    district: r.district,
    published: true,
  }));
}

/* Resolve a ZIP; when it spans districts, never auto-pick — return the
   candidate districts and ask for confirmation (FR-001). A confirmed
   district (from the picker) completes resolution. */
export async function resolveZip(
  zip: string,
  confirmedDistrict?: string
): Promise<ResolveResult> {
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("zip_district")
    .select("zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage")
    .eq("zip5", zip);
  if (error) throw new Error(`zip lookup failed: ${error.message}`);

  const rows = (data ?? []).filter((r) => r.in_coverage);
  if (rows.length === 0) {
    return {
      zip,
      inCoverage: false,
      races: [],
      message: "We don't cover this area yet.",
    };
  }

  const county = rows[0].county_name;
  const metro = rows[0].metro;
  const districts = [...new Set(rows.map((r) => r.congressional_district))].sort(
    (a, b) => districtNumber(a) - districtNumber(b)
  );

  if (districts.length > 1) {
    const confirmed =
      confirmedDistrict && districts.includes(confirmedDistrict)
        ? confirmedDistrict
        : null;
    if (!confirmed) {
      return {
        zip,
        inCoverage: true,
        county,
        metro,
        isSplit: true,
        candidateDistricts: districts,
        needsCountyConfirm: true,
        races: [],
      };
    }
    return {
      zip,
      inCoverage: true,
      county,
      metro,
      district: confirmed,
      isSplit: true,
      races: await racesForDistrict(confirmed),
    };
  }

  return {
    zip,
    inCoverage: true,
    county,
    metro,
    district: districts[0],
    isSplit: false,
    races: await racesForDistrict(districts[0]),
  };
}

/* County-picker path: statewide races always apply; district races need a
   ZIP (a county spans several districts), so callers route back through
   ZIP entry for district-level results. */
export async function resolveCounty(countyFips: string): Promise<ResolveResult | null> {
  const county = COVERED_COUNTIES.find((c) => c.fips === countyFips);
  if (!county) return null;
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("race")
    .select("race_id, office, level, district")
    .is("district", null)
    .order("race_id");
  if (error) throw new Error(`race lookup failed: ${error.message}`);
  return {
    zip: "",
    inCoverage: true,
    county: county.name,
    metro: county.metro,
    races: (data ?? []).map((r) => ({
      raceId: r.race_id,
      office: r.office,
      level: r.level,
      district: r.district,
      published: true,
    })),
  };
}
