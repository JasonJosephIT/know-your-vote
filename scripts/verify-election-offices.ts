/* Guardrail for the county election office table.

   This is contact information a voter is told to act on — call this number,
   drive to this address, email this office. Wrong data here does not render
   badly, it renders convincingly and sends someone to the wrong place. The
   checks below are the ones that would fail silently:

     1. All 67 counties, none missing, none duplicated. A missing county is a
        voter with no answer; the generator refuses to emit a partial table,
        so a short list means someone hand-edited a generated file.
     2. FIPS agree with COVERED_COUNTIES. Florida's codes are almost
        alphabetical +2, but retired Dade (12025) and Miami-Dade (12086)
        break the pattern — a plausible-looking wrong code would silently
        mis-link the resolver's handoff.
     3. Every county name joins to zip_district's spelling, since that is how
        the ZIP resolver hands a county to this table ("St. Johns", not
        "Saint Johns"; "DeSoto", not "Desoto").
     4. Contact fields are present and well-formed — a blank phone or a
        website that isn't a URL becomes a dead link on a civic page.
     5. The street ZIP is used for the street address. 22 counties take mail
        at a PO Box in a different ZIP than their office, and pairing the
        street with the mailing ZIP is a wrong address that looks right.
     6. overseasEmail, where present, actually differs from the public email
        — otherwise the page invites a voter to a "separate" desk that isn't.

   Pure and offline. Run: node scripts/verify-election-offices.ts */

import { readFileSync } from "node:fs";
import { ELECTION_OFFICES } from "../src/lib/election-offices.ts";
import {
  hasSeparateMailingAddress,
  listElectionOffices,
  mailingAddress,
  officeByCounty,
  officeByFips,
  officeBySlug,
  streetAddress,
} from "../src/lib/election-office.ts";

/* COVERED_COUNTIES is read out of resolve.ts as text rather than imported:
   that module pulls in the Supabase server client, which cannot load outside
   a request. Reading the source keeps this check offline and still catches
   the drift that matters — someone editing one list and not the other. */
function coveredCounties(): Array<{ fips: string; name: string }> {
  const src = readFileSync(
    new URL("../src/lib/resolve.ts", import.meta.url),
    "utf8"
  );
  const block = src.match(/COVERED_COUNTIES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!block) throw new Error("could not find COVERED_COUNTIES in resolve.ts");
  return [...block[1].matchAll(/fips:\s*"(\d{5})",\s*name:\s*"([^"]+)"/g)].map(
    (m) => ({ fips: m[1], name: m[2] })
  );
}
const COVERED_COUNTIES = coveredCounties();

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* 1 — completeness. */
check("67 counties", ELECTION_OFFICES.length === 67, String(ELECTION_OFFICES.length));
const slugs = new Set(ELECTION_OFFICES.map((o) => o.slug));
const names = new Set(ELECTION_OFFICES.map((o) => o.county));
const fipsSet = new Set(ELECTION_OFFICES.map((o) => o.countyFips));
check("slugs unique", slugs.size === 67, String(slugs.size));
check("county names unique", names.size === 67, String(names.size));
check("FIPS unique", fipsSet.size === 67, String(fipsSet.size));
check(
  "alphabetical by county",
  ELECTION_OFFICES.every(
    (o, i) => i === 0 || ELECTION_OFFICES[i - 1].county.localeCompare(o.county) <= 0
  )
);

/* 2 — FIPS agree with the app's own coverage list. */
for (const covered of COVERED_COUNTIES) {
  const office = officeByCounty(covered.name);
  check(`${covered.name} is in the table`, office !== null);
  check(
    `${covered.name} FIPS matches COVERED_COUNTIES`,
    office?.countyFips === covered.fips,
    `${office?.countyFips} != ${covered.fips}`
  );
}
/* Every FIPS is a Florida code in the plausible range. */
for (const o of ELECTION_OFFICES) {
  check(
    `${o.county} FIPS is a FL code`,
    /^12\d{3}$/.test(o.countyFips) && Number(o.countyFips.slice(2)) <= 133,
    o.countyFips
  );
}

/* 3 — the join key the ZIP resolver will use. */
for (const spelling of ["St. Johns", "DeSoto", "Miami-Dade", "Indian River", "Palm Beach"]) {
  check(`"${spelling}" resolves`, officeByCounty(spelling) !== null);
}
check("county lookup is case-insensitive", officeByCounty("miami-dade") !== null);
check("county lookup tolerates padding", officeByCounty("  Orange  ") !== null);
check("unknown county returns null", officeByCounty("Nowhere") === null);
check("unknown slug returns null", officeBySlug("nowhere") === null);
check("undefined lookups return null", officeBySlug(undefined) === null);
check("FIPS lookup works", officeByFips("12086")?.county === "Miami-Dade");
check("listElectionOffices returns all", listElectionOffices().length === 67);

/* 4 — every field a voter is asked to act on. */
for (const o of ELECTION_OFFICES) {
  check(`${o.county} slug round-trips`, officeBySlug(o.slug)?.county === o.county);
  check(`${o.county} has a supervisor`, o.supervisor.trim().length > 0);
  check(`${o.county} phone looks like a number`, /^\d{3}-\d{3}-\d{4}$/.test(o.phone), o.phone);
  check(`${o.county} fax looks like a number`, o.fax === null || /^\d{3}-\d{3}-\d{4}$/.test(o.fax), String(o.fax));
  check(`${o.county} email is well-formed`, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(o.email), o.email);
  check(`${o.county} website is https`, /^https:\/\/[^\s]+$/i.test(o.website), o.website);
  check(`${o.county} has a street`, o.address.street.trim().length > 0);
  check(`${o.county} has a city`, o.address.city.trim().length > 0);
  check(`${o.county} ZIPs are 5 digits`,
    /^\d{5}$/.test(o.address.zip) && /^\d{5}$/.test(o.address.streetZip),
    `${o.address.zip}/${o.address.streetZip}`);
}

/* 5 — the street address never borrows the PO Box's ZIP. */
const splitZip = ELECTION_OFFICES.filter((o) => o.address.zip !== o.address.streetZip);
check("some counties have a distinct street ZIP", splitZip.length > 0, String(splitZip.length));
for (const o of splitZip) {
  check(
    `${o.county} street address uses the street ZIP`,
    streetAddress(o).endsWith(o.address.streetZip),
    streetAddress(o)
  );
  check(
    `${o.county} mailing address uses the mailing ZIP`,
    mailingAddress(o).endsWith(o.address.zip),
    mailingAddress(o)
  );
  check(
    `${o.county} has a PO Box if its ZIPs differ`,
    o.address.poBox !== null,
    "street ZIP differs but no PO Box"
  );
}
/* A county with no PO Box shows one address; the card relies on this to
   decide between an "Address" row and an "Office"/"Mail" pair. */
for (const o of ELECTION_OFFICES) {
  if (!hasSeparateMailingAddress(o)) {
    check(
      `${o.county} single address is self-consistent`,
      mailingAddress(o) === streetAddress(o),
      `${mailingAddress(o)} vs ${streetAddress(o)}`
    );
  } else {
    check(`${o.county} mailing address names the PO Box`,
      mailingAddress(o).startsWith(o.address.poBox!), mailingAddress(o));
  }
}

/* 6 — the overseas desk is a real alternative, not a duplicate. */
const overseas = ELECTION_OFFICES.filter((o) => o.overseasEmail);
check("some counties have an overseas desk", overseas.length > 0, String(overseas.length));
for (const o of overseas) {
  check(
    `${o.county} overseas email differs from public`,
    o.overseasEmail!.toLowerCase() !== o.email.toLowerCase(),
    o.email
  );
  check(
    `${o.county} overseas email is well-formed`,
    /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(o.overseasEmail!),
    o.overseasEmail!
  );
}

if (failures) {
  console.error(`\nverify-election-offices: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-election-offices: OK — 67 counties, ${overseas.length} overseas desks, ` +
    `${splitZip.length} with a distinct street ZIP`
);
