/* Covered ZIPs with a lived-in part in a county this guide does not cover.

   0045 took FL-7 off ZIPs 32703 (Apopka) and 32751 (Maitland): their rows
   are filed under Orange County, and no Orange precinct votes in FL-7
   (Orange's composite general ballot has no FL-7 contest). But both ZIPs
   cross into Seminole County, and the people on that side do vote in FL-7.
   2020 census block populations (TIGER tabblock20 POP20 joined to the
   enacted plan EOGPCRP2026 and the ZCTA file, 2026-10-05):
     32703  Orange 43,385 (FL-10, FL-11)   Seminole 11,420 (FL-7)
     32751  Orange 16,817 (FL-10)          Seminole  6,413 (FL-7)
   Dropping FL-7 alone would have told roughly a quarter of each ZIP that a
   district they do not live in was theirs (32751 would have resolved to
   FL-10 with no question asked). So these ZIPs keep asking: the voter picks
   an Orange district, or says they live on the Seminole side and is shown
   their House race without being filed under Orange County.

   Only these two: every other covered ZIP's part outside its county is a
   sliver (33598's Manatee side is 270 people, about 1%), the same rounding
   the seed has always accepted. No imports, so a verify script can load it
   in plain Node. */

export type UncoveredPart = {
  /* The uncovered county, by name, as a voter would say it. */
  county: string;
  /* The congressional district that part of the ZIP votes in, and its
     race page. */
  district: string;
  raceId: string;
};

const UNCOVERED_ZIP_PARTS: Record<string, UncoveredPart> = {
  "32703": { county: "Seminole", district: "FL-7", raceId: "FL-7-general" },
  "32751": { county: "Seminole", district: "FL-7", raceId: "FL-7-general" },
};

export function uncoveredPartOf(zip: string): UncoveredPart | null {
  return UNCOVERED_ZIP_PARTS[zip] ?? null;
}
