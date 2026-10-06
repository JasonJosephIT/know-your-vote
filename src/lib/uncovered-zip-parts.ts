/* Covered ZIPs with a lived-in part in a county this guide does not cover.

   A ZIP's rows are filed under one county, the one with most of its land,
   but whoever types the ZIP may live across the line. For most covered ZIPs
   that other side is a sliver, the rounding the seed has always accepted.
   For six it is a fifth to a half of the people (2020 census block
   populations, TIGER tabblock20 POP20, joined to the enacted plan EOGPCRP2026
   and the Census ZCTA file; computed 2026-10-05, recomputed by a reviewer
   2026-10-06):
     33559  Hillsborough  8,575  Pasco  8,100 (49%)  Pasco side in FL-12
     33556  Hillsborough 16,712  Pasco 13,835 (45%)  FL-12
     32751  Orange       16,817  Seminole 6,413 (28%)  Seminole side in FL-7
     33549  Hillsborough 13,615  Pasco  4,201 (24%)  FL-12
     33558  Hillsborough 21,011  Pasco  6,313 (23%)  FL-12
     32703  Orange       43,385  Seminole 11,420 (21%)  FL-7
   The next is 33548 at 2.2%, then 34787 at 1.8% and 33598 at 1.1% (270
   people), slivers like the rest.

   These six ask which side the voter is on. On the covered side they pick
   from the covered county's districts as usual. On the other side they are
   shown their House race and the statewide ballot, and are not filed under
   the covered county: that would show them its county races, its
   early-voting dates and its Supervisor of Elections.

   `onCoveredBallot`: whether the other side's district is also one of the
   covered county's own. FL-12 is on Hillsborough's ballot too, so it stays a
   choice there. FL-7 is on no Orange ballot (Orange's composite general
   ballot has no FL-7 contest; 0045 drops the Orange rows), so it is never
   offered as an Orange district, whether or not 0045 has been applied.

   No imports, so a verify script and client components can load it. */

export type UncoveredPart = {
  /* The uncovered county, by name, as a voter would say it. */
  county: string;
  /* The congressional district that part of the ZIP votes in, and its
     race page. */
  district: string;
  raceId: string;
  onCoveredBallot: boolean;
};

const SEMINOLE_FL7: UncoveredPart = {
  county: "Seminole",
  district: "FL-7",
  raceId: "FL-7-general",
  onCoveredBallot: false,
};
const PASCO_FL12: UncoveredPart = {
  county: "Pasco",
  district: "FL-12",
  raceId: "FL-12-general",
  onCoveredBallot: true,
};

const UNCOVERED_ZIP_PARTS: Record<string, UncoveredPart> = {
  "32703": SEMINOLE_FL7,
  "32751": SEMINOLE_FL7,
  "33549": PASCO_FL12,
  "33556": PASCO_FL12,
  "33558": PASCO_FL12,
  "33559": PASCO_FL12,
};

export function uncoveredPartOf(zip: string): UncoveredPart | null {
  return UNCOVERED_ZIP_PARTS[zip] ?? null;
}

/* A saved "district|county" pair no covered ballot carries: FL-7 in Orange
   (0045). A cookie saved before 0045 can still hold it; the header chip
   treats it as no district, as the ballot pages do through coverage. */
export const RETIRED_DISTRICT_PAIRS: ReadonlySet<string> = new Set([
  "FL-7|12095",
]);
