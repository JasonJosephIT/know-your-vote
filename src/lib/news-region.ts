/* Relative, with the extension: scripts/verify-home-news.ts loads this file
   in plain Node, which doesn't know the @/ alias. */
import { COVERED_COUNTIES } from "./counties.ts";
import { countyName } from "./fl-counties.ts";

/* Where a news row belongs, for the home page's region filter (layout pass
   2026-10-11, item 6).

   Rows reach a county two ways: older Supervisor of Elections rows carry
   only `metro`, newer outlet rows only `county_fips` (news-scope.ts has the
   history). Each covered county is the whole of its metro
   (src/lib/counties.ts), so both map to the same county, and the filter
   shows one "Miami-Dade" rather than a "Miami" beside it.

   A county outside the four we cover still gets its own name, never folded
   into a neighbour; a metro we don't know is left unlabelled rather than
   guessed. Statewide is a row with neither. */
export interface NewsRegion {
  /** "statewide", or the county's FIPS code. */
  key: string;
  label: string;
}

export const STATEWIDE: NewsRegion = { key: "statewide", label: "Statewide" };

export function newsRegion(row: {
  metro: string | null;
  county_fips: string | null;
}): NewsRegion | null {
  if (row.county_fips) {
    const name =
      COVERED_COUNTIES.find((c) => c.fips === row.county_fips)?.name ??
      countyName(row.county_fips);
    return name ? { key: row.county_fips, label: name } : null;
  }
  if (row.metro) {
    const c = COVERED_COUNTIES.find((x) => x.metro === row.metro);
    return c ? { key: c.fips, label: c.name } : null;
  }
  return STATEWIDE;
}

/* The filter's buttons: statewide first, then the covered counties in their
   usual order, then any other county alphabetically. Only regions that have
   a story, so no button opens onto nothing. */
export function regionOrder(regions: readonly NewsRegion[]): NewsRegion[] {
  const seen = new Map(regions.map((r) => [r.key, r]));
  const out: NewsRegion[] = [];
  if (seen.has(STATEWIDE.key)) out.push(STATEWIDE);
  for (const c of COVERED_COUNTIES) {
    const r = seen.get(c.fips);
    if (r) out.push(r);
  }
  const rest = [...seen.values()]
    .filter((r) => !out.some((o) => o.key === r.key))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...out, ...rest];
}
