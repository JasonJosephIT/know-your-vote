/* The facts behind JudicialRetentionNote: who is up for retention on each
   covered county's 2026 general-election ballot, and where the state lists
   them. Moved out of the component so scripts/verify-judicial-retention.ts
   can check each county's lines under plain node; the component keeps the
   markup and founder decision 10 (whether the note shows at all).

   No imports, so it runs anywhere: the county keys are the names
   COVERED_COUNTIES gives (src/lib/counties.ts) and the verify script checks
   the two lists still match, rather than this file importing that one.

   Every name, count and link below was checked on 2026-10-04 against
   official pages only (the record is in docs/general-election/
   ballots-handoff.md §7):
   - The Division of Elections' 2026 general-election candidate list,
     judicial offices: Justice Muñiz is the only justice up for retention;
     district 2 has four judges up, districts 3 and 4 five each, district 6
     none.
   - Florida Statutes 26.021 and 35.02–35.044 (2026): Miami-Dade is the 11th
     Circuit and so the 3rd District; Broward the 17th, 4th District;
     Hillsborough the 13th, 2nd District; Orange the 9th, which moved to the
     new 6th District in 2023.
   - Miami-Dade's own 2026-11-03 master ballot prints the Muñiz question and
     five 3rd District questions, matching the state list.
   Bar polls, voter guides and advocacy pages are deliberately not linked.

   Re-check the list if a judge leaves the bench before Election Day, and
   change the expected lines in verify-judicial-retention.ts with it. After
   the election this content is stale and should go with the 2026 cycle. */

/* The state's list of every judge on the 2026 general-election ballot. It is
   the only official page that names exactly who is up, grouped by court
   ("District Court of Appeal", "District 3" and so on), so each county's
   count links here. The courts' judges pages list every sitting judge (the
   3rd District's has 10 for 5 questions, checked 2026-10-04), so they are
   kept only as a second link for background (adversarial review,
   2026-10-04). */
export const DOE_JUDICIAL_LIST =
  "https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeGroup=JUD";

/* On every Florida ballot, whatever the county. */
export const SUPREME_COURT = {
  justice: "Justice Carlos G. Muñiz",
  url: "https://supremecourt.flcourts.gov/the-court/about-the-court/justices/justice-carlos-g.-muniz",
} as const;

export interface AppealsCourtLine {
  county: string;
  court: string;
  judges: number;
  url: string;
}

/* One row per covered county, in COVERED_COUNTIES order. `judges: 0` is a
   real answer (Orange's 6th District has no one up this year), not missing
   data. Keyed by county name, the same value resolve returns as
   result.county. `url` is the court's own judges page, the secondary "about
   this court's judges" link. */
export const APPEALS_BY_COUNTY: readonly AppealsCourtLine[] = [
  {
    county: "Miami-Dade",
    court: "3rd District Court of Appeal",
    judges: 5,
    url: "https://3dca.flcourts.gov/Judges",
  },
  {
    county: "Broward",
    court: "4th District Court of Appeal",
    judges: 5,
    url: "https://4dca.flcourts.gov/Judges",
  },
  {
    county: "Hillsborough",
    court: "2nd District Court of Appeal",
    judges: 4,
    url: "https://2dca.flcourts.gov/Judges",
  },
  {
    county: "Orange",
    court: "6th District Court of Appeal",
    judges: 0,
    url: "https://6dca.flcourts.gov/Judges",
  },
];

/* The appeals court lines for a voter's county: just that county's when it
   is one of the rows above, every row otherwise. "Otherwise" covers no
   county at all (the home page with no saved district, a shared ballot, the
   statewide-only result for an address outside the covered counties) and a
   name this list does not know, and showing every covered county is still
   true for everyone because each line names its county. An exact match, so a
   differently spelled county ("Miami-Dade County", "MIAMI-DADE") falls back
   to the full list rather than to nothing. */
export function appealsForCounty(
  county?: string | null
): readonly AppealsCourtLine[] {
  const own = APPEALS_BY_COUNTY.filter((a) => a.county === county);
  return own.length > 0 ? own : APPEALS_BY_COUNTY;
}

/* What a county's line says after "<County> ballots:". With judges up it is
   the link text to the state's list; with none it is the whole answer. */
export function appealsLineLabel(line: AppealsCourtLine): string {
  if (line.judges === 0) return "no appeals court judges this year";
  return `${line.judges} ${line.judges === 1 ? "judge" : "judges"} of the ${line.court}`;
}
