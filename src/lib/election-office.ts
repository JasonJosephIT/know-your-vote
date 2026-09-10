import { ELECTION_OFFICES, type ElectionOffice } from "./election-offices.ts";

/* Lookups over the generated county-office table.

   This is the one voter-facing dataset that needs no database, no ZIP, and
   no coverage check: a Florida voter in any of the 67 counties can be handed
   the office that actually serves them. Race coverage is four counties and
   growing; the office data is complete today, so it is deliberately not
   gated behind COVERED_COUNTIES.

   Kept apart from election-offices.ts because that file is generated and
   carries a do-not-edit banner. */

export type { ElectionOffice } from "./election-offices.ts";
export { ELECTION_OFFICE_SOURCES } from "./election-offices.ts";

const bySlug = new Map(ELECTION_OFFICES.map((o) => [o.slug, o]));
const byFips = new Map(ELECTION_OFFICES.map((o) => [o.countyFips, o]));
const byCounty = new Map(
  ELECTION_OFFICES.map((o) => [o.county.toLowerCase(), o])
);

/** Every county, alphabetical. */
export function listElectionOffices(): readonly ElectionOffice[] {
  return ELECTION_OFFICES;
}

/** By URL segment, e.g. "miami-dade". */
export function officeBySlug(slug: string | undefined): ElectionOffice | null {
  return (slug && bySlug.get(slug.toLowerCase())) || null;
}

/** By `zip_district.county_fips` — how the ZIP resolver identifies a county. */
export function officeByFips(fips: string | undefined): ElectionOffice | null {
  return (fips && byFips.get(fips)) || null;
}

/** By `zip_district.county_name` / `ResolveResult.county`, e.g. "Miami-Dade". */
export function officeByCounty(
  county: string | undefined
): ElectionOffice | null {
  return (county && byCounty.get(county.trim().toLowerCase())) || null;
}

/* Two addresses, and the difference matters: 30 counties take mail at a PO
   Box, and in 22 of those the street sits in a different ZIP. Printing the
   street with the PO Box ZIP would be a wrong address on a page whose whole
   job is getting a voter to the right place. */

/** Where to send mail — the PO Box when the county publishes one. */
export function mailingAddress(office: ElectionOffice): string {
  const { poBox, street, city, zip } = office.address;
  return `${poBox ?? street}, ${city}, FL ${zip}`;
}

/** Where to show up in person. */
export function streetAddress(office: ElectionOffice): string {
  const { street, city, streetZip } = office.address;
  return `${street}, ${city}, FL ${streetZip}`;
}

/** True when mail and visits go to genuinely different places. */
export function hasSeparateMailingAddress(office: ElectionOffice): boolean {
  return office.address.poBox !== null;
}
