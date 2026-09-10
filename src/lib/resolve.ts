import { createAnonServerClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { COVERED_COUNTIES, coveredCounty } from "@/lib/counties";
import { districtFromBlockRows } from "@/lib/address-lookup";
import { getStatewideRaces } from "@/lib/races";
import type { ResolveRaceSummary, ResolveResult } from "@/types/app";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";

export const ZIP_RE = /^\d{5}$/;

/* Re-exported: several server surfaces import it from here, and the list itself
   now lives in a module the browser can import too (CountyPicker used to carry
   a second copy for exactly that reason). */
export { COVERED_COUNTIES };

const districtNumber = (d: string) => Number(d.replace(/\D/g, "")) || 0;

/* Races visible to anon are published by construction (RLS filters the
   rest), so "your district has no race yet" and "not published yet" are the
   same honest answer here. */
async function racesForDistrict(
  district: string
): Promise<ResolveRaceSummary[]> {
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("race")
    .select("race_id, office, level, district")
    .eq("election", ACTIVE_ELECTION_KIND)
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
    .select(
      "zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage"
    )
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
  /* Already selected; returning it saves every caller a second lookup by
     name — the news feed scopes on FIPS, not on the display name. */
  const countyFips = rows[0].county_fips;
  const metro = rows[0].metro;
  const districts = [
    ...new Set(rows.map((r) => r.congressional_district)),
  ].sort((a, b) => districtNumber(a) - districtNumber(b));

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
        countyFips,
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
      countyFips,
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
    countyFips,
    metro,
    district: districts[0],
    isSplit: false,
    races: await racesForDistrict(districts[0]),
  };
}

/* County-picker path: statewide races always apply; district races need a
   ZIP (a county spans several districts), so callers route back through
   ZIP entry for district-level results.

   The race half of this is exactly what the landing page renders with no
   input at all, so it reads through getStatewideRaces (TASK-067) rather than
   repeating the query — one definition of "statewide", one cache, one
   ordering. Only the county and metro are location-specific here. */
export async function resolveCounty(
  countyFips: string
): Promise<ResolveResult | null> {
  const county = COVERED_COUNTIES.find((c) => c.fips === countyFips);
  if (!county) return null;
  const races = await getStatewideRaces();
  return {
    zip: "",
    inCoverage: true,
    county: county.name,
    countyFips: county.fips,
    metro: county.metro,
    races: races.map(({ raceId, office, level, district, published }) => ({
      raceId,
      office,
      level,
      district,
      published,
    })),
  };
}

/* Address path. A census block sits in exactly one district, so unlike a ZIP
   there is nothing to confirm -- which is the whole reason this path exists.
   null means the block is outside the four covered counties, which is also the
   honest answer for a Florida address we do not cover yet. */
export async function resolveBlock(
  blockGeoid: string
): Promise<{ district: string; countyFips: string } | null> {
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("block_district")
    .select("block_start, block_end, county_fips, congressional_district")
    .lte("block_start", blockGeoid)
    .gte("block_end", blockGeoid)
    .limit(1);
  if (error) throw new Error(`block lookup failed: ${error.message}`);
  return districtFromBlockRows(data ?? [], blockGeoid);
}

/* A district the voter has already established -- from an address, a confirmed
   ZIP, or the picker -- plus the county it sits in.

   Also serves /candidates?view=races&district=FL-27&county=12086, which is how
   an address result stays shareable and refreshable with no address anywhere in
   the URL. Returning null for an uncovered county is what makes a stale or
   hand-edited district cookie harmless: no ballot is produced from it. */
export async function resolveDistrict(
  countyFips: string,
  district: string
): Promise<ResolveResult | null> {
  const county = coveredCounty(countyFips);
  if (!county) return null;
  return {
    zip: "",
    inCoverage: true,
    county: county.name,
    countyFips: county.fips,
    metro: county.metro,
    district,
    races: await racesForDistrict(district),
  };
}

export interface CoveredDistrict {
  countyFips: string;
  countyName: string;
  district: string;
}

/* The picker's options: every county+district pair coverage actually contains.

   Read from zip_district rather than block_district for size -- hundreds of rows
   against thousands -- and it is the same answer either way: 0018_zip_seed_2026
   is aggregated from the same enacted-plan block file 0026 is built from, and
   scripts/verify-block-seed.mjs asserts the two agree. block_district stays the
   authority for resolving a voter; this is only the list of choices. */
async function fetchCoveredDistricts(): Promise<CoveredDistrict[]> {
  let supabase;
  try {
    supabase = await createAnonServerClient();
  } catch {
    /* Unconfigured environment. This read is on the landing page, which is
       prerendered -- the same guard fetchActiveMeasures uses. */
    return [];
  }
  const { data } = await supabase
    .from("zip_district")
    .select("county_fips, county_name, congressional_district")
    .eq("in_coverage", true);

  const seen = new Map<string, CoveredDistrict>();
  for (const row of data ?? []) {
    const key = `${row.county_fips}:${row.congressional_district}`;
    if (!seen.has(key)) {
      seen.set(key, {
        countyFips: row.county_fips,
        countyName: row.county_name,
        district: row.congressional_district,
      });
    }
  }
  /* County in COVERED_COUNTIES order, then district ascending, so the list reads
     the way the county picker does. */
  const countyOrder = new Map(COVERED_COUNTIES.map((c, i) => [c.fips, i]));
  return [...seen.values()].sort(
    (a, b) =>
      (countyOrder.get(a.countyFips) ?? 99) -
        (countyOrder.get(b.countyFips) ?? 99) ||
      districtNumber(a.district) - districtNumber(b.district)
  );
}

export function getCoveredDistricts() {
  return unstable_cache(fetchCoveredDistricts, ["covered-districts"], {
    revalidate: 3600,
    tags: ["districts"],
  })();
}
