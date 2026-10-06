/* An office as a page names it: "U.S. Representative, District 27" for a
   U.S. House race, the office unchanged for everything else.

   All sixteen House races share the office "United States Representative"
   and differ only in race.district ('FL-7' ... 'FL-28'), so every House race
   page was titled and headed "United States Representative", and a
   candidate page said "Running for United States Representative" without
   ever saying which district. The district is in the words now, from the
   row's own district value.

   Only a U.S. House office with an 'FL-<n>' district changes. County
   offices already name their district ("Broward County Commission,
   District 2") and their `district` is an internal code ('BRO-CC-2');
   statewide offices have none. One function for the race page and the
   candidate page, so the two always name a race the same way. No imports,
   so scripts/verify-office-title.ts can load it in plain Node. */

const US_HOUSE = "United States Representative";
const FL_DISTRICT = /^FL-(\d{1,2})$/;

export function officeTitle(race: {
  office: string;
  district?: string | null;
}): string {
  const n = race.district?.match(FL_DISTRICT)?.[1];
  return race.office === US_HOUSE && n
    ? `U.S. Representative, District ${Number(n)}`
    : race.office;
}
