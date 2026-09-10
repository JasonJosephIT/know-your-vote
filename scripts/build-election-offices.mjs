/* Generates src/lib/election-offices.ts — the county election office for all
   67 Florida counties — from two official sources.

   PRIMARY: Florida Division of Elections, "Supervisor of Elections Contact
   Information" (supervisor name, phone, fax, general-public email, mailing
   and physical address, website).

     https://dos.fl.gov/elections/contacts/supervisor-of-elections/
     https://dos.fl.gov/media/711276/qrycountyinfo_excel.xls

   It ships as legacy .xls, so convert it once before running this script:

     soffice --headless --convert-to csv --outdir scripts/data soe.xls

   SECONDARY: the Federal Voting Assistance Program's Florida feed, which
   exists to serve military and overseas voters.

     https://www.fvap.gov/xml-api/Florida/election-offices.xml

   The two disagree on 16 of 67 email addresses, and not by accident: FVAP
   lists the vote-by-mail/UOCAVA desk (votebymail@, mailballot@,
   duvaluocava@) because that is who FVAP serves. Sending an ordinary voter
   with an ordinary question to the overseas-ballot desk is a worse answer
   than the state's general inbox, so the state file wins for the public
   contact and FVAP is kept only where it differs — as the overseas/military
   line, labeled as such. Both sources are cited on the page.

   Run: node scripts/build-election-offices.mjs \
          scripts/data/fl-soe-contacts.csv \
          scripts/data/fvap-fl-election-offices.xml */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [csvFile, xmlFile] = process.argv.slice(2);
if (!csvFile || !xmlFile) {
  console.error(
    "usage: node scripts/build-election-offices.mjs <soe.csv> <fvap.xml>"
  );
  process.exit(1);
}

/* Source provenance, surfaced on the page. Election contact information that
   does not say when it was captured is worse than none — a voter cannot tell
   a current number from a three-year-old one. */
const DOS_URL = "https://dos.fl.gov/elections/contacts/supervisor-of-elections/";
const DOS_REVISION = "2026-07-30"; // "(rev. 07/30/2026)" on the DoS page
const FVAP_URL = "https://www.fvap.gov/xml-api/Florida/election-offices.xml";
const CAPTURED = new Date().toISOString().slice(0, 10);

/* Florida's county FIPS are almost alphabetical +2 from 12001, but not quite:
   Dade (12025) was retired and Miami-Dade re-coded to 12086, which breaks the
   arithmetic between Martin and Monroe. Deriving them would be a clever bug,
   so they are written out and asserted against the four codes the app already
   hardcodes in COVERED_COUNTIES. */
const FIPS = {
  Alachua: "12001", Baker: "12003", Bay: "12005", Bradford: "12007",
  Brevard: "12009", Broward: "12011", Calhoun: "12013", Charlotte: "12015",
  Citrus: "12017", Clay: "12019", Collier: "12021", Columbia: "12023",
  DeSoto: "12027", Dixie: "12029", Duval: "12031", Escambia: "12033",
  Flagler: "12035", Franklin: "12037", Gadsden: "12039", Gilchrist: "12041",
  Glades: "12043", Gulf: "12045", Hamilton: "12047", Hardee: "12049",
  Hendry: "12051", Hernando: "12053", Highlands: "12055", Hillsborough: "12057",
  Holmes: "12059", "Indian River": "12061", Jackson: "12063", Jefferson: "12065",
  Lafayette: "12067", Lake: "12069", Lee: "12071", Leon: "12073",
  Levy: "12075", Liberty: "12077", Madison: "12079", Manatee: "12081",
  Marion: "12083", Martin: "12085", "Miami-Dade": "12086", Monroe: "12087",
  Nassau: "12089", Okaloosa: "12091", Okeechobee: "12093", Orange: "12095",
  Osceola: "12097", "Palm Beach": "12099", Pasco: "12101", Pinellas: "12103",
  Polk: "12105", Putnam: "12107", "St. Johns": "12109", "St. Lucie": "12111",
  "Santa Rosa": "12113", Sarasota: "12115", Seminole: "12117", Sumter: "12119",
  Suwannee: "12121", Taylor: "12123", Union: "12125", Volusia: "12127",
  Wakulla: "12129", Walton: "12131", Washington: "12133",
};

/* The app's own coverage list (src/lib/resolve.ts). If a FIPS above ever
   drifts from it, the two halves of the app disagree about what "Orange"
   means and deep links silently miss. */
const KNOWN_FIPS = {
  "Miami-Dade": "12086",
  Broward: "12011",
  Hillsborough: "12057",
  Orange: "12095",
};

const fail = (msg) => {
  console.error(`build-election-offices: ${msg}`);
  process.exit(1);
};

/* --- Florida Division of Elections CSV ---------------------------------- */

/* Minimal RFC 4180 reader: the address column contains commas inside quotes
   ("515 N. Main St., Suite 300"), so splitting on commas corrupts every row
   after it. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const csvRows = parseCsv(readFileSync(csvFile, "utf8").replace(/^﻿/, ""));
const header = csvRows[0].map((h) => h.trim());
const REQUIRED = [
  "CountyName", "SupFirstName", "SupMiddleIn", "SupLastName", "Telephone",
  "FAX", "EmailAddress", "MailAddress1", "MailAddress2", "MailCity",
  "MailZip", "UPSzip", "WebSite",
];
for (const col of REQUIRED) {
  if (!header.includes(col)) fail(`CSV is missing the ${col} column`);
}

const dos = new Map();
for (const cells of csvRows.slice(1)) {
  const r = Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
  if (!r.CountyName) continue;
  dos.set(r.CountyName, r);
}

/* --- FVAP XML ----------------------------------------------------------- */

/* One flat, fixed-shape document of 67 records — a dependency-free reader is
   a few lines, and this runs offline against a file already on disk. */
function parseFvap(xml) {
  const offices = new Map();
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
    return m ? m[1].trim() : "";
  };
  for (const m of xml.matchAll(/<ElectionOffice\b[\s\S]*?<\/ElectionOffice>/g)) {
    const block = m[0];
    const county = tag(block, "Jurisdiction");
    if (!county) continue;
    /* Voice line only — every record also carries a fax under the same tag,
       separated only by isFax. */
    const voice = [...block.matchAll(/<PhoneNumber isFax="false">([\s\S]*?)<\/PhoneNumber>/g)]
      .map((p) => tag(p[0], "Number"))
      .filter(Boolean);
    offices.set(county, { email: tag(block, "EmailAddress"), phone: voice[0] ?? "" });
  }
  return offices;
}

const fvap = parseFvap(readFileSync(xmlFile, "utf8"));

/* --- Join and validate -------------------------------------------------- */

if (dos.size !== 67) fail(`expected 67 counties in the DoS file, found ${dos.size}`);
if (fvap.size !== 67) fail(`expected 67 counties in the FVAP feed, found ${fvap.size}`);

const unmapped = [...dos.keys()].filter((c) => !FIPS[c]);
if (unmapped.length) fail(`no FIPS for: ${unmapped.join(", ")}`);
const unmatched = [...dos.keys()].filter((c) => !fvap.has(c));
if (unmatched.length) fail(`county names do not join to FVAP: ${unmatched.join(", ")}`);
for (const [county, fips] of Object.entries(KNOWN_FIPS)) {
  if (FIPS[county] !== fips) fail(`${county} FIPS ${FIPS[county]} != COVERED_COUNTIES ${fips}`);
}

const slug = (county) =>
  county.toLowerCase().replace(/\./g, "").replace(/\s+/g, "-");

const offices = [...dos.keys()].sort().map((county) => {
  const r = dos.get(county);
  const f = fvap.get(county);

  for (const [field, value] of Object.entries({
    Telephone: r.Telephone, EmailAddress: r.EmailAddress,
    MailAddress2: r.MailAddress2, MailCity: r.MailCity,
    MailZip: r.MailZip, WebSite: r.WebSite,
  })) {
    if (!value) fail(`${county} has a blank ${field}`);
  }
  if (!/^https?:\/\//i.test(r.WebSite)) fail(`${county} website is not a URL: ${r.WebSite}`);

  const supervisor = [r.SupFirstName, r.SupMiddleIn, r.SupLastName]
    .filter(Boolean)
    .join(" ");

  /* MailAddress2 is always the street; MailAddress1 is the PO Box where one
     exists. UPSzip is the street's ZIP for the 22 counties whose PO Box sits
     in a different one — printing the street with the PO Box ZIP would be a
     wrong address on a civic page. */
  const sameEmail =
    f.email.toLowerCase() === r.EmailAddress.toLowerCase();

  return {
    county,
    countyFips: FIPS[county],
    slug: slug(county),
    supervisor,
    phone: r.Telephone,
    fax: r.FAX || null,
    email: r.EmailAddress,
    overseasEmail: sameEmail ? null : f.email || null,
    website: r.WebSite,
    address: {
      poBox: r.MailAddress1 || null,
      street: r.MailAddress2,
      city: r.MailCity,
      zip: r.MailZip,
      streetZip: r.UPSzip || r.MailZip,
    },
  };
});

const slugs = new Set(offices.map((o) => o.slug));
if (slugs.size !== 67) fail("slugs are not unique");

/* --- Emit --------------------------------------------------------------- */

const lit = (v) => (v === null ? "null" : JSON.stringify(v));
const body = offices
  .map(
    (o) => `  {
    county: ${lit(o.county)},
    countyFips: ${lit(o.countyFips)},
    slug: ${lit(o.slug)},
    supervisor: ${lit(o.supervisor)},
    phone: ${lit(o.phone)},
    fax: ${lit(o.fax)},
    email: ${lit(o.email)},
    overseasEmail: ${lit(o.overseasEmail)},
    website: ${lit(o.website)},
    address: {
      poBox: ${lit(o.address.poBox)},
      street: ${lit(o.address.street)},
      city: ${lit(o.address.city)},
      zip: ${lit(o.address.zip)},
      streetZip: ${lit(o.address.streetZip)},
    },
  },`
  )
  .join("\n");

const overseasCount = offices.filter((o) => o.overseasEmail).length;

const out = `/* GENERATED FILE — DO NOT EDIT BY HAND.

   Regenerate with:
     node scripts/build-election-offices.mjs \\
       scripts/data/fl-soe-contacts.csv \\
       scripts/data/fvap-fl-election-offices.xml

   Contact information for all 67 Florida county election offices.

   Primary source: Florida Division of Elections, Supervisor of Elections
   contact information (rev. ${DOS_REVISION}).
     ${DOS_URL}

   Secondary: Federal Voting Assistance Program, Florida election offices.
     ${FVAP_URL}

   \`overseasEmail\` is set only where FVAP's address differs from the state's
   (${overseasCount} of 67). FVAP serves military and overseas voters, so those
   are vote-by-mail/UOCAVA desks — the right contact for an overseas voter and
   the wrong one for everybody else.

   Captured ${CAPTURED}. */

export interface ElectionOfficeAddress {
  /** PO Box, where the county publishes one. Mail goes here. */
  poBox: string | null;
  /** Physical street address. Visitors go here. */
  street: string;
  city: string;
  /** ZIP for the mailing address (the PO Box, when there is one). */
  zip: string;
  /** ZIP for the street address — differs from \`zip\` in 22 counties. */
  streetZip: string;
}

export interface ElectionOffice {
  /** Matches zip_district.county_name. */
  county: string;
  /** Matches zip_district.county_fips. */
  countyFips: string;
  /** URL segment, e.g. "miami-dade". */
  slug: string;
  supervisor: string;
  phone: string;
  fax: string | null;
  /** General-public inbox, from the state. */
  email: string;
  /** Military/overseas (UOCAVA) desk, only where it differs from \`email\`. */
  overseasEmail: string | null;
  website: string;
  address: ElectionOfficeAddress;
}

/** Source provenance, shown to voters so they can check anything themselves. */
export const ELECTION_OFFICE_SOURCES = {
  stateUrl: ${lit(DOS_URL)},
  stateRevision: ${lit(DOS_REVISION)},
  fvapUrl: ${lit(FVAP_URL)},
  capturedOn: ${lit(CAPTURED)},
} as const;

/** All 67 Florida county election offices, alphabetical by county. */
export const ELECTION_OFFICES: readonly ElectionOffice[] = [
${body}
];
`;

const target = path.join(root, "src/lib/election-offices.ts");
writeFileSync(target, out);
console.log(
  `wrote ${path.relative(root, target)} — ${offices.length} counties, ` +
    `${overseasCount} with a separate overseas desk`
);
