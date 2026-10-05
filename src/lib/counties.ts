/* The covered counties, in one place with no dependencies.

   This list used to live in @/lib/resolve, which imports the Supabase server
   client — so CountyPicker, a client component, carried its own copy, and the
   district cookie's reader would have made a third. Everything that needs the
   list can import this: it pulls in nothing but a type.

   metro is the machine value zip_district and news scoping key on; metroLabel
   is what a voter reads under the county name. */

import type { Metro } from "../types/app.ts";

export interface CoveredCounty {
  fips: string;
  name: string;
  metro: Metro;
  metroLabel: string;
  /* The county's code in `race.district` for county-level races
     (0031_local_tier_a_2026, 0032_county_seats_decided): 'ORA-CC-2',
     'BRO-SB-6', 'ORA-MAYOR'. Three letters, then a hyphen, then the seat.
     These are the county Supervisors' own abbreviations as the VoterFocus
     candidate lists print them, not FIPS, which is why they need a mapping
     here rather than being derivable from the row. */
  raceDistrictPrefix: string;
}

export const COVERED_COUNTIES: readonly CoveredCounty[] = [
  {
    fips: "12086",
    name: "Miami-Dade",
    metro: "miami",
    metroLabel: "Miami",
    raceDistrictPrefix: "DAD",
  },
  {
    fips: "12011",
    name: "Broward",
    metro: "fort_lauderdale",
    metroLabel: "Fort Lauderdale",
    raceDistrictPrefix: "BRO",
  },
  {
    fips: "12057",
    name: "Hillsborough",
    metro: "tampa",
    metroLabel: "Tampa",
    raceDistrictPrefix: "HIL",
  },
  {
    fips: "12095",
    name: "Orange",
    metro: "orlando",
    metroLabel: "Orlando",
    raceDistrictPrefix: "ORA",
  },
] as const;

export function coveredCounty(fips: string): CoveredCounty | undefined {
  return COVERED_COUNTIES.find((c) => c.fips === fips);
}

/* Which covered county a county-level race belongs to, from its district
   value alone — 'ORA-CC-2' is Orange, 'BRO-SBAL-8' is Broward.

   Matches on the prefix AND the hyphen, so a congressional district
   ('FL-10') or a future code that merely starts with the same letters
   ('ORANGE') never reads as a county race. undefined for anything else, including
   the statewide NULL district: the caller decides what a non-county race
   means, this only answers "which county's seat is this". */
export function countyForRaceDistrict(
  district: string | null | undefined
): CoveredCounty | undefined {
  if (!district) return undefined;
  const dash = district.indexOf("-");
  if (dash <= 0) return undefined;
  const prefix = district.slice(0, dash);
  return COVERED_COUNTIES.find((c) => c.raceDistrictPrefix === prefix);
}

/* The covered counties as a voter reads them: "Miami-Dade, Broward,
   Hillsborough and Orange". Derived from the list, so the coverage copy can
   never name a county the resolver does not cover, or miss one it does. */
export function coveredCountyNames(): string {
  const names = COVERED_COUNTIES.map((c) => c.name);
  return names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
