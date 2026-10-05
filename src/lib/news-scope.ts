/* Relative, with the extension: scripts/verify-news-scope.ts loads this
   file in plain Node, which doesn't know the @/ alias. */
import { coveredCounty } from "./counties.ts";

/* The PostgREST `or` clauses that scope /api/news to a voter: statewide
   items always; items for their metro, their county and their races when
   those are known.

   A county also brings in its metro. Every county-specific row live today
   was written with `metro` set and `county_fips` NULL (the nine county
   Supervisor of Elections rows, 2026-10-05), so a county pick on /news
   matched none of them and showed the statewide feed under a heading that
   said "Showing Miami-Dade County plus statewide items". Each covered county
   is the whole of its metro (src/lib/counties.ts), so its metro's rows are
   its rows.

   The statewide clause excludes county- and race-scoped rows, or a Broward
   story with no race and no metro would reach every voter in the state. */
export function newsScopes({
  metro,
  county,
  raceIds = [],
}: {
  metro?: string | null;
  county?: string | null;
  raceIds?: readonly string[];
}): string[] {
  const scopes = ["and(race_id.is.null,metro.is.null,county_fips.is.null)"];
  const metros = new Set<string>();
  if (metro) metros.add(metro);
  const countyMetro = county ? coveredCounty(county)?.metro : undefined;
  if (countyMetro) metros.add(countyMetro);
  for (const m of metros) scopes.push(`metro.eq.${m}`);
  if (county) scopes.push(`county_fips.eq.${county}`);
  if (raceIds.length > 0) scopes.push(`race_id.in.(${raceIds.join(",")})`);
  return scopes;
}
