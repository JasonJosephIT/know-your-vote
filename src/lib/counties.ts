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
}

export const COVERED_COUNTIES: readonly CoveredCounty[] = [
  { fips: "12086", name: "Miami-Dade", metro: "miami", metroLabel: "Miami" },
  {
    fips: "12011",
    name: "Broward",
    metro: "fort_lauderdale",
    metroLabel: "Fort Lauderdale",
  },
  { fips: "12057", name: "Hillsborough", metro: "tampa", metroLabel: "Tampa" },
  { fips: "12095", name: "Orange", metro: "orlando", metroLabel: "Orlando" },
] as const;

export function coveredCounty(fips: string): CoveredCounty | undefined {
  return COVERED_COUNTIES.find((c) => c.fips === fips);
}
