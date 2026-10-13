/* Which races a page shows: the "Show races for" choice on the home page and
   in Candidates → Your races (founder, 2026-10-13: "Both pages").

   The choice travels in the URL as ?show=, from a plain GET form, so it
   works with JavaScript off, survives a reload and can be shared. That makes
   the value something anyone can type, so it is parsed here into one of four
   shapes and anything else is "all": a county we don't cover, a district
   with no race we list, a typo or a hand-edited link shows the whole page,
   as it did before the control existed, rather than an empty or invented
   one. The same rule as resolveDistrict, which turns a stale district into
   no district rather than a ballot nobody votes on.

   The covered districts come from the database (getCoveredDistricts), so the
   caller passes them in; the covered counties are a constant. Pure, with
   only a relative import of counties.ts (itself dependency-free), so
   scripts/verify-race-scope.ts runs it under plain node. */

import { COVERED_COUNTIES } from "./counties.ts";

export type RaceScope =
  | { kind: "all" }
  | { kind: "statewide" }
  | { kind: "county"; fips: string }
  | { kind: "district"; district: string };

/* The query parameter's name. Not `scope`: /candidates already reads
   ?scope=statewide as an answer about where the voter is (an address in
   Florida we can't place in a district), which is a different fact from
   which races they asked to see. */
export const RACE_SCOPE_PARAM = "show";

const ALL: RaceScope = { kind: "all" };

/* A search param can arrive as a list (?show=a&show=b). The first wins, the
   way URLSearchParams.get reads it. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRaceScope(
  show: string | string[] | undefined,
  coveredDistricts: readonly string[]
): RaceScope {
  const value = first(show)?.trim();
  if (!value || value === "all") return ALL;
  if (value === "statewide") return { kind: "statewide" };
  if (value.startsWith("county-")) {
    const fips = value.slice("county-".length);
    return COVERED_COUNTIES.some((c) => c.fips === fips)
      ? { kind: "county", fips }
      : ALL;
  }
  if (value.startsWith("district-")) {
    const district = value.slice("district-".length);
    /* Only a district the picker would list. An empty list means the read
       failed: unknown, so the whole page rather than a race we can't
       confirm is covered. */
    return coveredDistricts.includes(district)
      ? { kind: "district", district }
      : ALL;
  }
  return ALL;
}

/* The value a scope is written back as: the select's option values, and the
   inverse of parseRaceScope for every scope it returns. */
export function raceScopeValue(scope: RaceScope): string {
  switch (scope.kind) {
    case "all":
      return "all";
    case "statewide":
      return "statewide";
    case "county":
      return `county-${scope.fips}`;
    case "district":
      return `district-${scope.district}`;
  }
}

export interface DistrictOption {
  district: string;
  /* The covered counties it reaches, in COVERED_COUNTIES order, as a voter
     reads them: "Broward and Miami-Dade". */
  counties: string;
}

const districtNumber = (d: string) => Number(d.replace(/\D/g, "")) || 0;

/* Each covered district once, by number. getCoveredDistricts lists
   county+district pairs, so a district that crosses a county line (FL-20,
   FL-25) arrives twice; the picker asks about the House race, which is one
   race whichever county the voter is in, so it is one option, naming every
   covered county it reaches. */
export function districtOptions(
  pairs: ReadonlyArray<{ district: string; countyName: string }>
): DistrictOption[] {
  const byDistrict = new Map<string, Set<string>>();
  for (const p of pairs) {
    const names = byDistrict.get(p.district) ?? new Set<string>();
    names.add(p.countyName);
    byDistrict.set(p.district, names);
  }
  const countyOrder = (name: string) => {
    const i = COVERED_COUNTIES.findIndex((c) => c.name === name);
    return i === -1 ? COVERED_COUNTIES.length : i;
  };
  return [...byDistrict.entries()]
    .sort(([a], [b]) => districtNumber(a) - districtNumber(b))
    .map(([district, names]) => {
      const list = [...names].sort(
        (a, b) => countyOrder(a) - countyOrder(b) || a.localeCompare(b)
      );
      return {
        district,
        counties:
          list.length <= 1
            ? list.join("")
            : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`,
      };
    });
}
