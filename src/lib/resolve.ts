import { createAnonServerClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { COVERED_COUNTIES, coveredCounty } from "@/lib/counties";
import { districtFromBlockRows } from "@/lib/address-lookup";
import { getStatewideRaces, raceStatusOf } from "@/lib/races";
import { decidedSeatOf, type DecidedSeat } from "@/lib/unopposed";
import { uncoveredPartOf } from "@/lib/uncovered-zip-parts";
import type { ResolveRaceSummary, ResolveResult } from "@/types/app";
import type { Candidate } from "@/types/schema";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";

export const ZIP_RE = /^\d{5}$/;

/* Re-exported: several server surfaces import it from here, and the list itself
   now lives in a module the browser can import too (CountyPicker used to carry
   a second copy for exactly that reason). */
export { COVERED_COUNTIES };

const districtNumber = (d: string) => Number(d.replace(/\D/g, "")) || 0;

/* A county-level race, listed per county rather than per voter.

   `decided` is the D-B state (src/lib/unopposed.ts) for the seats that will
   not be printed in November: 'unopposed' (nobody filed against the
   candidate) or 'elected_in_primary' (someone cleared 50% in August). Those
   are opposite facts about an election and the copy must never merge them.
   `holder` is set only for a decided seat — it is the one person who takes
   the office — and never for a contested one, where naming a single
   candidate would read as a pick. */
export type CountyRaceSummary = ResolveRaceSummary & {
  generalDate: string | null;
  decided: DecidedSeat["decided"] | null;
  holder?: DecidedSeat["holder"];
};

/* A race in the voter's district list (`races`), with the same D-B state a
   county seat carries.

   FL-10 is why. Maxwell Alejandro Frost is its only candidate, marked
   `unopposed`, so the contest will not be printed. The race page said so,
   but the races view and the home page listed it as the voter's race.

   Optional here, unlike on CountyRaceSummary, because the county-only and
   statewide-only paths list getStatewideRaces, which does not compute it.
   Absent means "not checked" and renders as a printed race, which is how
   every race rendered before this field existed. */
export type DistrictRaceSummary = ResolveRaceSummary & {
  decided?: DecidedSeat["decided"] | null;
  holder?: DecidedSeat["holder"];
};

/* ResolveResult plus the voter's county races.

   A separate field, never merged into `races`: those are DISTRICT-matched —
   every race in that list is this voter's, printed or (marked `decided`)
   settled before November — while a county race is only COUNTY-matched.
   Nothing resolves a voter to a county commission or school-board district
   yet (no crosswalk; boundaries sit unbuilt in
   docs/general-election/boundaries/), so putting ORA-CC-2 in `races` would
   tell every Orange voter it is on their ballot, which is false for seven in
   eight of them.

   Declared here rather than on ResolveResult in src/types/app.ts because
   that file belongs to the schema/type contract; it is a structural
   superset (`races` only narrows to a subtype), so everything typed
   ResolveResult still accepts it, and /api/resolve serializes it as-is
   (NextResponse.json does no filtering). */
export type ResolveResultWithCounty = Omit<ResolveResult, "races"> & {
  races: DistrictRaceSummary[];
  countyRaces?: CountyRaceSummary[];
};

type BallotCandidate = Pick<
  Candidate,
  "candidate_id" | "legal_name" | "qualifying_status"
>;

/* The decided state of each race in `rows`, from one candidate read bounded
   by the ids already in scope rather than one read per race.

   `hasWriteIn` is passed as false, deliberately:
     - write-in filers are kept out of race.candidate_ids (data-architecture
       D1), and at `listed` anon cannot read the `profile` rows that are their
       only link to a race — so there is nothing here to look at;
     - for 'unopposed', the carried DoE/county `UNO` code already implies no
       qualified write-in (the same reasoning briefs.ts records for when its
       own write-in conjunct is inert);
     - for 'elected_in_primary', the contest ended in August; a November
       write-in line cannot reopen a seat the primary filled.

   Decided seats are marked with the two D-B predicates (decidedSeatOf)
   rather than re-derived from `candidate_ids.length === 1`, which cannot
   tell FL-10's shape from a race whose opponents withdrew after qualifying
   (unopposed.ts). Moved here unchanged from fetchCountyRaces so the county
   list and the district list mark seats one way. */
async function decidedSeatsFor(
  supabase: Awaited<ReturnType<typeof createAnonServerClient>>,
  rows: ReadonlyArray<{ race_id: string; candidate_ids: unknown }>,
  what: string
): Promise<Map<string, DecidedSeat>> {
  const idsOf = (r: { candidate_ids: unknown }) =>
    (r.candidate_ids ?? []) as string[];
  const allIds = [...new Set(rows.flatMap(idsOf))];
  const seats = new Map<string, DecidedSeat>();
  if (allIds.length === 0) return seats;

  const { data, error } = await supabase
    .from("candidate")
    .select("candidate_id, legal_name, qualifying_status")
    .in("candidate_id", allIds)
    /* Printed ballot lines only (D1) — the same tier the predicates are
       defined over. */
    .eq("ballot_status", "ballot");
  if (error) {
    throw new Error(`${what} candidate lookup failed: ${error.message}`);
  }
  const byId = new Map(
    ((data ?? []) as BallotCandidate[]).map((c) => [c.candidate_id, c])
  );

  for (const r of rows) {
    const ballot = idsOf(r)
      .map((id) => byId.get(id))
      .filter((c): c is BallotCandidate => Boolean(c));
    const seat = decidedSeatOf(ballot, false);
    if (seat) seats.set(r.race_id, seat);
  }
  return seats;
}

/* One district-list row. `seats` null means the decided read failed, and
   then the row says nothing about it (no `decided` key) rather than claiming
   the race is contested. */
function toDistrictRace(
  r: {
    race_id: string;
    office: string;
    level: string;
    district: string | null;
    race_publication: unknown;
  },
  seats: Map<string, DecidedSeat> | null
): DistrictRaceSummary {
  const status = raceStatusOf(r.race_publication);
  const seat = seats?.get(r.race_id);
  return {
    raceId: r.race_id,
    office: r.office,
    level: r.level,
    district: r.district,
    published: status === "published",
    status,
    ...(seats ? { decided: seat?.decided ?? null } : {}),
    ...(seat ? { holder: seat.holder } : {}),
  };
}

/* Races visible to anon are listed or published (RLS filters the rest, 0033),
   so "your district has no race yet" and "not on our list yet" are the same
   honest answer here. Which of the two tiers each race is at comes from the
   race_publication embed — see raceStatusOf.

   The district's own House race carries its decided state (FL-10 is
   unopposed and not printed), read through the cached districtRace the home
   page uses, so a resolve costs a cache hit rather than a candidate query.
   Statewide rows carry no decided key, as in the county and statewide-only
   views. If districtRace fails it returns null and the row says nothing
   about it, as before the state existed. */
async function racesForDistrict(
  district: string
): Promise<DistrictRaceSummary[]> {
  const supabase = await createAnonServerClient();
  const [{ data, error }, own] = await Promise.all([
    supabase
      .from("race")
      .select("race_id, office, level, district, race_publication(status)")
      .eq("election", ACTIVE_ELECTION_KIND)
      .or(`district.is.null,district.eq.${district}`)
      .order("level", { ascending: false })
      .order("race_id"),
    districtRace(district),
  ]);
  if (error) throw new Error(`race lookup failed: ${error.message}`);
  return (data ?? []).map((r) => {
    const row = toDistrictRace(r, null);
    return own && r.race_id === own.raceId
      ? {
          ...row,
          decided: own.decided ?? null,
          ...(own.holder ? { holder: own.holder } : {}),
        }
      : row;
  });
}

/* The saved district's own race, for the landing page.

   The home page reads the district cookie and has to know whether that
   district's House race is on the voter's ballot at all (FL-10's is not).
   This is the one race it needs, cached like the county list so `/` pays a
   cache hit rather than two queries per visit. The district comes from
   parseDistrictCookie, which admits only FL-<n>, so the key space is the
   congressional districts and nothing a visitor can grow.

   Degrades to null, with the catch outside the cache as in racesForCounty.
   null renders the page's ordinary House-race copy, which names no race and
   claims nothing about one. */
async function fetchDistrictRace(
  district: string
): Promise<DistrictRaceSummary | null> {
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("race")
    .select(
      "race_id, office, level, district, candidate_ids, race_publication(status)"
    )
    .eq("election", ACTIVE_ELECTION_KIND)
    .eq("district", district)
    .order("race_id")
    .limit(1);
  if (error) throw new Error(`district race lookup failed: ${error.message}`);
  const row = data?.[0];
  if (!row) return null;
  return toDistrictRace(
    row,
    await decidedSeatsFor(supabase, [row], "district")
  );
}

export async function districtRace(
  district: string
): Promise<DistrictRaceSummary | null> {
  try {
    return await unstable_cache(
      () => fetchDistrictRace(district),
      ["district-race", "v1", ACTIVE_ELECTION_KIND, district],
      { revalidate: 3600, tags: ["races"] }
    )();
  } catch {
    return null;
  }
}

/* Every visible county-level race in one covered county, contested and
   decided alike.

   Matched on the district prefix ('ORA-%'), the only county key a race row
   carries (0031 / 0032 — see raceDistrictPrefix in counties.ts). `level =
   'county'` is filtered too so a future non-county code that happens to share
   a prefix cannot slip in.

   Decided seats are marked by decidedSeatsFor (above), which the district
   list shares. Unlike racesForDistrict, a failed candidate read throws here,
   as it always has: racesForCounty catches it outside its cache. */
async function fetchCountyRaces(
  countyFips: string
): Promise<CountyRaceSummary[]> {
  const county = coveredCounty(countyFips);
  if (!county) return [];
  const supabase = await createAnonServerClient();
  const { data, error } = await supabase
    .from("race")
    .select(
      "race_id, office, level, district, key_dates, candidate_ids, race_publication(status)"
    )
    .eq("election", ACTIVE_ELECTION_KIND)
    .eq("level", "county")
    .like("district", `${county.raceDistrictPrefix}-%`);
  if (error) throw new Error(`county race lookup failed: ${error.message}`);
  const rows = data ?? [];
  const seats = await decidedSeatsFor(supabase, rows, "county");

  return rows
    .map((r): CountyRaceSummary => {
      const status = raceStatusOf(r.race_publication);
      const seat = seats.get(r.race_id);
      return {
        raceId: r.race_id,
        office: r.office,
        level: r.level,
        district: r.district,
        published: status === "published",
        status,
        generalDate:
          (r.key_dates as Record<string, string> | null)?.general_date ?? null,
        decided: seat?.decided ?? null,
        ...(seat ? { holder: seat.holder } : {}),
      };
    })
    .sort(
      /* Neutral and stable: by office (numeric-aware, so District 2 sorts
         before District 10), then by the seat number in the district code. */
      (a, b) =>
        a.office.localeCompare(b.office, "en", { numeric: true }) ||
        districtNumber(a.district ?? "") - districtNumber(b.district ?? "")
    );
}

/* The county races for a covered county, cached like the other race reads
   (the set changes when publication changes, and the "races" tag is what
   those changes revalidate).

   Degrades to [] rather than throwing, unlike racesForDistrict: this is a
   supplement to the ballot the voter asked for, and a failed county read
   must not cost them their district races (resolveZip would otherwise turn
   it into a 500). The catch sits OUTSIDE the cache so a transient failure is
   not cached as "no county races" for an hour. */
export async function racesForCounty(
  countyFips: string
): Promise<CountyRaceSummary[]> {
  try {
    return await unstable_cache(
      () => fetchCountyRaces(countyFips),
      ["county-races", ACTIVE_ELECTION_KIND, countyFips],
      { revalidate: 3600, tags: ["races"] }
    )();
  } catch {
    return [];
  }
}

/* Resolve a ZIP; when it spans districts, never auto-pick — return the
   candidate districts and ask for confirmation (FR-001). A confirmed
   district (from the picker) completes resolution.

   A ZIP that crosses into a county we don't cover (uncovered-zip-parts.ts)
   asks too, even with one covered district left: the voter may live on the
   other side, in another House district. */
export async function resolveZip(
  zip: string,
  confirmedDistrict?: string
): Promise<ResolveResultWithCounty> {
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
  /* A part across the county line whose district no covered ballot here
     carries (FL-7 in Orange) is never a district of this county, even
     while 0045's rows are not yet applied. */
  const uncoveredPart = uncoveredPartOf(zip);
  const districts = [...new Set(rows.map((r) => r.congressional_district))]
    .filter(
      (d) =>
        !uncoveredPart ||
        uncoveredPart.onCoveredBallot ||
        d !== uncoveredPart.district
    )
    .sort((a, b) => districtNumber(a) - districtNumber(b));

  if (districts.length > 1 || uncoveredPart) {
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
        ...(uncoveredPart ? { uncoveredPart } : {}),
        races: [],
      };
    }
    const [races, countyRaces] = await Promise.all([
      racesForDistrict(confirmed),
      racesForCounty(countyFips),
    ]);
    return {
      zip,
      inCoverage: true,
      county,
      countyFips,
      metro,
      district: confirmed,
      isSplit: true,
      races,
      countyRaces,
    };
  }

  const [races, countyRaces] = await Promise.all([
    racesForDistrict(districts[0]),
    racesForCounty(countyFips),
  ]);
  return {
    zip,
    inCoverage: true,
    county,
    countyFips,
    metro,
    district: districts[0],
    isSplit: false,
    races,
    countyRaces,
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
): Promise<ResolveResultWithCounty | null> {
  const county = COVERED_COUNTIES.find((c) => c.fips === countyFips);
  if (!county) return null;
  const [races, countyRaces] = await Promise.all([
    getStatewideRaces(),
    racesForCounty(county.fips),
  ]);
  return {
    zip: "",
    inCoverage: true,
    county: county.name,
    countyFips: county.fips,
    metro: county.metro,
    races: races.map(
      ({ raceId, office, level, district, published, status }) => ({
        raceId,
        office,
        level,
        district,
        published,
        status,
      })
    ),
    countyRaces,
  };
}

/* A Florida voter we cannot place in a district yet: the address path's answer
   for a block outside the seeded counties (addressCoverage "statewide").

   Not an out-of-coverage result, deliberately. Every race returned here is on
   this voter's ballot -- statewide races are on every Florida ballot -- so
   `inCoverage` stays true and `coverage: "statewide"` tells the UI which half
   is missing. No county or district is claimed: nothing on this path knows
   either well enough to show county races or a House race. */
export async function resolveStatewideOnly(): Promise<ResolveResultWithCounty> {
  const races = await getStatewideRaces();
  return {
    zip: "",
    inCoverage: true,
    coverage: "statewide",
    races: races.map(
      ({ raceId, office, level, district, published, status }) => ({
        raceId,
        office,
        level,
        district,
        published,
        status,
      })
    ),
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
): Promise<ResolveResultWithCounty | null> {
  const county = coveredCounty(countyFips);
  if (!county) return null;
  /* A pair coverage no longer holds -- FL-7 in Orange, which 0045 dropped --
     arrives from a cookie saved before, or a shared link. Show the county
     instead of filing the voter under a House race no one in that county
     votes in. An empty list means the read failed: unknown, not invalid. */
  const covered = await getCoveredDistricts();
  if (
    covered.length > 0 &&
    !covered.some((d) => d.countyFips === county.fips && d.district === district)
  ) {
    return resolveCounty(county.fips);
  }
  const [races, countyRaces] = await Promise.all([
    racesForDistrict(district),
    racesForCounty(county.fips),
  ]);
  return {
    zip: "",
    inCoverage: true,
    county: county.name,
    countyFips: county.fips,
    metro: county.metro,
    district,
    races,
    countyRaces,
  };
}

export interface CoveredDistrict {
  countyFips: string;
  countyName: string;
  district: string;
}

/* The picker's options: every county+district pair coverage actually contains.

   Read from zip_district rather than block_district for size -- hundreds of rows
   against thousands -- and it is the same answer either way: 0022_zip_seed_2026
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
