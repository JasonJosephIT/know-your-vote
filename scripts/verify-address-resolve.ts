/* Checks the address -> district path with no network and no API key: every
   external response is a fixture, so this runs on a laptop with nothing
   configured.

   The privacy assertions matter as much as the parsing ones. An address must not
   survive anywhere: not in a response body, not in a log line.

   Run: node scripts/verify-address-resolve.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseBlockResponse,
  districtFromBlockRows,
  parseSuggestions,
  parsePlaceLocation,
  parseAddressMatches,
} from "../src/lib/address-lookup.ts";
import {
  addressQuery,
  looksLikeStreetAddress,
} from "../src/lib/address-text.ts";

const ROOT = resolve(import.meta.dirname, "..");
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(join(ROOT, "scripts", "fixtures", "address", name), "utf8")
  );

const stripCommentsEarly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* ---- Census: coordinate -> block ---- */
const block = parseBlockResponse(fixture("census-block.json"));
assert("the block GEOID is read", block?.geoid === "120860036061055");
assert("the state is read", block?.state === "12");
assert(
  "the county is the GEOID's first five characters",
  block?.geoid.slice(0, 5) === "12086"
);
assert(
  "an empty geographies list yields null",
  parseBlockResponse({ result: { geographies: { "Census Blocks": [] } } }) ===
    null
);
assert(
  "a malformed payload yields null",
  parseBlockResponse({ nope: true }) === null
);
assert(
  "a short GEOID is rejected rather than trusted",
  parseBlockResponse({
    result: {
      geographies: { "Census Blocks": [{ GEOID: "1208600", STATE: "12" }] },
    },
  }) === null
);

/* ---- block -> district, the range lookup's own logic ---- */
const rows = [
  {
    block_start: "120860036061000",
    block_end: "120860036061999",
    county_fips: "12086",
    congressional_district: "FL-27",
  },
];
assert(
  "a GEOID inside the range resolves",
  districtFromBlockRows(rows, "120860036061055")?.district === "FL-27"
);
assert(
  "the county comes back with it",
  districtFromBlockRows(rows, "120860036061055")?.countyFips === "12086"
);
assert(
  "a GEOID outside every range resolves to nothing",
  districtFromBlockRows(rows, "120990036061055") === null
);
assert(
  "no rows resolves to nothing",
  districtFromBlockRows([], "120860036061055") === null
);
assert(
  "the range boundaries are inclusive",
  districtFromBlockRows(rows, "120860036061000")?.district === "FL-27" &&
    districtFromBlockRows(rows, "120860036061999")?.district === "FL-27"
);

/* ---- Google Places: suggestions, then the picked one's point ---- */
const suggestions = parseSuggestions(fixture("places-autocomplete.json"));
assert(
  "a prediction with no place id or text is dropped",
  suggestions.length === 2,
  `got ${suggestions.length}`
);
assert("the place id is carried", suggestions[0].id === "ChIJ-444-sw-2nd-ave");
assert("the main text is the display name", suggestions[0].text === "444 SW 2nd Ave");
assert(
  "the secondary text is carried",
  suggestions[0].secondary === "Miami, FL, USA",
  suggestions[0].secondary ?? "null"
);
assert(
  "a malformed payload yields no suggestions",
  parseSuggestions({ nope: 1 }).length === 0
);
const location = parsePlaceLocation(fixture("places-details.json"));
/* The point must reach Census exactly. Rounding one can move it across a
   block boundary, and a block boundary is a district boundary. */
assert(
  "Details' location is read, unrounded",
  location?.lat === 25.769463071522 && location?.lon === -80.197602442738,
  JSON.stringify(location)
);
assert("Details with no location yields null", parsePlaceLocation({}) === null);

/* ---- Google Geocoding: typed address -> point ---- */
const typed = fixture("google-geocode.json");
const kind = (json: unknown, text: string) => parseAddressMatches(json, text)?.kind;

/* One Google geocoding result, built from a Census-style description of
   the street (each case below was first seen from the Census geocoder,
   2026-10-12; the rules that answer it are geocoder-neutral). Built rather
   than recorded so that no fixture holds an address that might be
   someone's home. The point is derived from `geoid` so that two results in
   "the same block" share a point and two in different blocks don't. */
function censusMatch(m: {
  matchedAddress: string;
  preDirection?: string;
  streetName: string;
  suffixType?: string;
  suffixDirection?: string;
  routeLong?: string;
  city: string;
  zip: string;
  state?: string;
  geoid: string;
}) {
  const route = [m.preDirection, m.streetName, m.suffixType, m.suffixDirection]
    .filter(Boolean)
    .join(" ");
  const number = m.matchedAddress.split(" ")[0];
  const c = (v: string, ...types: string[]) => ({ long_name: v, short_name: v, types });
  return {
    address_components: [
      c(number, "street_number"),
      { long_name: m.routeLong ?? route, short_name: route, types: ["route"] },
      c(m.city, "locality", "political"),
      c(m.state ?? "FL", "administrative_area_level_1", "political"),
      c(m.zip, "postal_code"),
    ],
    geometry: {
      location: { lat: 25 + Number(m.geoid.slice(-7)) / 1e8, lng: -80 },
    },
  };
}
const census = (...ms: ReturnType<typeof censusMatch>[]) => ({
  status: ms.length ? "OK" : "ZERO_RESULTS",
  results: ms,
});
const POINT = { lat: 25.769463071522, lon: -80.197602442738 };

assert(
  "a typed address naming its city resolves to its block",
  JSON.stringify(parseAddressMatches(typed, "444 SW 2nd Ave, Miami, FL")) ===
    JSON.stringify({ kind: "match", point: POINT }),
  JSON.stringify(parseAddressMatches(typed, "444 SW 2nd Ave, Miami, FL"))
);
for (const text of [
  "444 sw 2nd ave 33130",
  "444 SW 2nd Ave, Miami FL 33130-1910",
  "444 sw 2nd ave., MIAMI fl",
  "444 Southwest 2nd Avenue, Miami",
  "444 SW 2 Ave, Miami",
  "444 SW 2nd Ave Miami",
  "444 SW 2nd Ave Apt 4B, Miami",
  "444 SW 2nd Ave #4B, Miami",
  "444 SW 2nd Ave, Unit 12, Miami, FL",
]) {
  assert(`"${text}" matches`, kind(typed, text) === "match", String(kind(typed, text)));
}

/* The place must be the voter's: named, and named whole. */
for (const text of [
  "444 SW 2nd Ave",
  "444 SW 2nd Ave, FL",
  "444 SW 2nd Ave, Tampa",
  "444 SW 2nd Ave, North Miami",
  "444 SW 2nd Ave North Miami",
  "444 SW 2nd Ave, Miami Gardens",
  "444 SW 2nd Ave, Apt 4",
]) {
  assert(`"${text}" asks for the ZIP`, kind(typed, text) === "needsPlace", String(kind(typed, text)));
}
{
  const beach = census(
    censusMatch({
      matchedAddress: "1700 CONVENTION CENTER DR, MIAMI BEACH, FL, 33139",
      streetName: "CONVENTION CENTER",
      suffixType: "DR",
      city: "MIAMI BEACH",
      zip: "33139",
      geoid: "120860042061010",
    })
  );
  assert(
    "North Miami Beach does not name MIAMI BEACH",
    kind(beach, "1700 Convention Center Dr, North Miami Beach") === "needsPlace"
  );
  assert(
    "Miami Beach names MIAMI BEACH",
    kind(beach, "1700 Convention Center Dr, Miami Beach, FL") === "match"
  );
  const ftl = census(
    censusMatch({
      matchedAddress: "115 S ANDREWS AVE, FORT LAUDERDALE, FL, 33301",
      preDirection: "S",
      streetName: "ANDREWS",
      suffixType: "AVE",
      city: "FORT LAUDERDALE",
      zip: "33301",
      geoid: "120110425022004",
    })
  );
  assert(
    "'Ft. Lauderdale' names FORT LAUDERDALE",
    kind(ftl, "115 S Andrews Ave, Ft. Lauderdale") === "match"
  );
  assert(
    "a ZIP names the place whatever the city is called",
    kind(ftl, "115 S Andrews Ave, Ft Laud 33301") === "match"
  );
}

/* Census corrects the street and still answers once, confidently. Each of
   these came back from the live geocoder on 2026-10-12 as a single match
   on another street, in another district for the first. */
{
  const swapped = census(
    censusMatch({
      matchedAddress: "6000 NW 7TH AVE, MIAMI, FL, 33127",
      streetName: "NW 7TH",
      suffixType: "AVE",
      city: "MIAMI",
      zip: "33127",
      geoid: "120860019013006",
    })
  );
  assert(
    "SW typed, NW matched (Miami-Dade puts the quadrant in streetName): check the street",
    kind(swapped, "6000 SW 7th Ave, Miami") === "checkStreet"
  );
  assert(
    "NW typed, NW matched: a match",
    kind(swapped, "6000 NW 7th Ave, Miami") === "match"
  );
  assert(
    "St typed, Ave matched: check the street",
    kind(swapped, "6000 NW 7th St, Miami") === "checkStreet"
  );
  assert(
    "no direction typed for a street that has one: check the street",
    kind(swapped, "6000 7th Ave, Miami") === "checkStreet"
  );
  assert(
    "another house number: check the street",
    kind(swapped, "6002 NW 7th Ave, Miami") === "checkStreet"
  );
  const north = census(
    censusMatch({
      matchedAddress: "1000 N FLORIDA AVE, TAMPA, FL, 33602",
      preDirection: "N",
      streetName: "FLORIDA",
      suffixType: "AVE",
      city: "TAMPA",
      zip: "33602",
      geoid: "120570051011000",
    })
  );
  assert(
    "E typed, N matched: check the street",
    kind(north, "1000 E Florida Ave, Tampa") === "checkStreet"
  );
  const after = census(
    censusMatch({
      matchedAddress: "100 TAMPA ST N, TAMPA, FL, 33602",
      streetName: "TAMPA",
      suffixType: "ST",
      suffixDirection: "N",
      city: "TAMPA",
      zip: "33602",
      geoid: "120570051012098",
    })
  );
  assert(
    "N before the name matches Census's N after the type",
    kind(after, "100 N Tampa St, Tampa, FL") === "match"
  );
  const orange = census(
    censusMatch({
      matchedAddress: "400 S ORANGE AVE, ORLANDO, FL, 32801",
      preDirection: "S",
      streetName: "ORANGE",
      suffixType: "AVE",
      city: "ORLANDO",
      zip: "32801",
      geoid: "120950189021048",
    }),
    censusMatch({
      matchedAddress: "400 N ORANGE AVE, ORLANDO, FL, 32801",
      preDirection: "N",
      streetName: "ORANGE",
      suffixType: "AVE",
      city: "ORLANDO",
      zip: "32801",
      geoid: "120950189021009",
    })
  );
  assert(
    "N and S both found, no direction typed: check the street (a ZIP can't tell them apart)",
    kind(orange, "400 Orange Ave, Orlando 32801") === "checkStreet"
  );
  assert(
    "the direction typed picks one",
    JSON.stringify(parseAddressMatches(orange, "400 S Orange Ave, Orlando")) ===
      JSON.stringify({
        kind: "match",
        point: { lat: 25 + 9021048 / 1e8, lon: -80 },
      })
  );
}
{
  const two = structuredClone(typed);
  const other = structuredClone(two.results[0]);
  other.geometry.location.lat += 0.001;
  two.results.push(other);
  const both = parseAddressMatches(two, "444 SW 2nd Ave, Miami");
  assert(
    "the same street at two points is ambiguous, with both points for the route",
    both?.kind === "ambiguous" && both.points.length === 2,
    JSON.stringify(both)
  );
  const same = structuredClone(typed);
  same.results.push(structuredClone(same.results[0]));
  assert(
    "two results at the same point are one answer",
    kind(same, "444 SW 2nd Ave, Miami") === "match"
  );
  const street = structuredClone(typed);
  street.results[0].address_components = street.results[0].address_components.filter(
    (c: { types: string[] }) => !c.types.includes("street_number")
  );
  assert(
    "a street-level result (no house number) is not the voter's house",
    kind(street, "444 SW 2nd Ave, Miami") === "checkStreet"
  );
  const kendall = structuredClone(typed);
  kendall.results[0].address_components.push({
    long_name: "Little Havana",
    short_name: "Little Havana",
    types: ["neighborhood", "political"],
  });
  assert(
    "the neighbourhood Google names counts as the place too",
    kind(kendall, "444 SW 2nd Ave, Little Havana") === "match" &&
      kind(kendall, "444 SW 2nd Ave, Miami") === "match"
  );
}

/* Second review (2026-10-12), against the shapes Census returned for these
   public buildings. */
{
  /* A typed ZIP that disagrees with Census's never lets the city alone
     place the match: Broward's beach cities restart the street grid. */
  const ftlCopy = census(
    censusMatch({
      matchedAddress: "600 NE 13TH AVE, FORT LAUDERDALE, FL, 33304",
      preDirection: "NE",
      streetName: "13TH",
      suffixType: "AVE",
      city: "FORT LAUDERDALE",
      zip: "33304",
      geoid: "120110418012010",
    })
  );
  assert(
    "a city that matches with a ZIP that doesn't: check both (Pompano's 33060 typed as Fort Lauderdale)",
    kind(ftlCopy, "600 NE 13th Ave, Fort Lauderdale, FL 33060") === "placeConflict"
  );
  assert(
    "the same without commas",
    kind(ftlCopy, "600 NE 13th Ave Fort Lauderdale 33060") === "placeConflict"
  );
  assert(
    "the city and its own ZIP still match",
    kind(ftlCopy, "600 NE 13th Ave, Fort Lauderdale, FL 33304") === "match"
  );
  assert(
    "the city alone still matches",
    kind(ftlCopy, "600 NE 13th Ave, Fort Lauderdale") === "match"
  );
  const jackson = census(
    censusMatch({
      matchedAddress: "1611 SW 12TH AVE, MIAMI, FL, 33129",
      preDirection: "SW",
      streetName: "12TH",
      suffixType: "AVE",
      city: "MIAMI",
      zip: "33129",
      geoid: "120860066011000",
    })
  );
  assert(
    "a direction typo with the right ZIP is asked about, not answered on the other street",
    kind(jackson, "1611 SW 12th Ave, Miami, FL 33136") === "placeConflict"
  );
  assert(
    "no match with a typed ZIP is a conflict, not 'add your ZIP'",
    kind(typed, "444 SW 2nd Ave, Tampa 33602") === "placeConflict"
  );

  /* Dotted and spaced quadrants, and "U.S.". */
  const clark = census(
    censusMatch({
      matchedAddress: "111 NW 1ST ST, MIAMI, FL, 33128",
      preDirection: "NW",
      streetName: "1ST",
      suffixType: "ST",
      city: "MIAMI",
      zip: "33128",
      geoid: "120860036061023",
    })
  );
  for (const text of [
    "111 N.W. 1st Street, Miami, FL 33128",
    "111 N W 1st St, Miami",
    "111 North West 1st Street, Miami",
    "111 N. W. 1st St, Miami",
    "111 NW First St, Miami",
    "111 nw 1st st miami fl 33128",
  ]) {
    assert(`"${text}" matches NW 1ST ST`, kind(clark, text) === "match", String(kind(clark, text)));
  }
  for (const text of [
    "111 S.W. 1st St, Miami",
    "111 S W 1st St, Miami",
    "111 1st St, Miami",
    "111 NW Twenty-First St, Miami",
  ]) {
    assert(`"${text}" is not NW 1ST ST`, kind(clark, text) === "checkStreet", String(kind(clark, text)));
  }
  const usOne = census(
    censusMatch({
      matchedAddress: "501 US HWY 1, NORTH PALM BEACH, FL, 33408",
      streetName: "1",
      city: "NORTH PALM BEACH",
      zip: "33408",
      geoid: "120990007022007",
    })
  );
  assert(
    "'U.S. Highway 1' is not 'u' and south",
    kind(usOne, "501 U.S. Highway 1, North Palm Beach, FL 33408") === "match"
  );

  /* A name Census splits ("Westshore" is WEST SHORE). */
  const westshore = census(
    censusMatch({
      matchedAddress: "250 N WEST SHORE BLVD, TAMPA, FL, 33609",
      preDirection: "N",
      streetName: "WEST SHORE",
      suffixType: "BLVD",
      city: "TAMPA",
      zip: "33609",
      geoid: "120570047001003",
    })
  );
  assert(
    "'N Westshore Blvd' is N WEST SHORE BLVD",
    kind(westshore, "250 N Westshore Blvd, Tampa, FL 33609") === "match"
  );
  assert(
    "'Westshore' without its N is still asked about",
    kind(westshore, "250 Westshore Blvd, Tampa") === "checkStreet"
  );
  assert(
    "'SW Shore Blvd' is not S WEST SHORE",
    kind(westshore, "250 SW Shore Blvd, Tampa") === "checkStreet"
  );

  /* What follows the ZIP. */
  for (const text of [
    "444 SW 2nd Ave, Miami, FL 33130, USA",
    "444 SW 2nd Ave, Miami, FL 33130, United States",
    "444 SW 2nd Ave, Miami FL33130",
    "444 SW 2nd Ave, Miami, FL 33130, Suite 2",
  ]) {
    assert(`"${text}" matches`, kind(typed, text) === "match", String(kind(typed, text)));
  }
  assert("'444 SW 2nd Ave, USA' still asks for the ZIP", kind(typed, "444 SW 2nd Ave, USA") === "needsPlace");

  /* Spelled ordinals. */
  const naples = census(
    censusMatch({
      matchedAddress: "735 8TH ST S, NAPLES, FL, 34102",
      streetName: "8TH",
      suffixType: "ST",
      suffixDirection: "S",
      city: "NAPLES",
      zip: "34102",
      geoid: "120210001011030",
    })
  );
  assert(
    "'Eighth Street South' is 8TH ST S",
    kind(naples, "735 Eighth Street South, Naples, FL 34102") === "match"
  );
  assert(
    "'Eighth Street North' is not",
    kind(naples, "735 Eighth Street North, Naples") === "checkStreet"
  );

  /* Street types: USPS alternates, and Census's own type. */
  const america = census(
    censusMatch({
      matchedAddress: "1015 N AMERICA WAY, MIAMI, FL, 33132",
      preDirection: "N",
      streetName: "AMERICA",
      suffixType: "WAY",
      city: "MIAMI",
      zip: "33132",
      geoid: "120869810001014",
    })
  );
  assert("'Wy' is WAY", kind(america, "1015 N America Wy, Miami, FL 33132") === "match");
  const blossom = census(
    censusMatch({
      matchedAddress: "8001 S ORANGE BLOSSOM TRL, ORLANDO, FL, 32809",
      preDirection: "S",
      streetName: "ORANGE BLOSSOM",
      suffixType: "TRL",
      city: "ORLANDO",
      zip: "32809",
      geoid: "120950145052000",
    })
  );
  assert("'Tr' is TRL when Census says TRL", kind(blossom, "8001 S Orange Blossom Tr, Orlando") === "match");
  assert("'St' is still not TRL", kind(blossom, "8001 S Orange Blossom St, Orlando") === "checkStreet");
  const estates = census(
    censusMatch({
      matchedAddress: "120 PALM ESTS, TAMPA, FL, 33602",
      streetName: "PALM",
      suffixType: "ESTS",
      routeLong: "PALM ESTATES",
      city: "TAMPA",
      zip: "33602",
      geoid: "120570051012000",
    })
  );
  assert("Google's own type counts though it isn't listed", kind(estates, "120 Palm Ests, Tampa") === "match");
  assert("…and another type before it doesn't", kind(estates, "120 Palm Ests Ave, Tampa") === "checkStreet");
}

/* Outside Florida. */
assert(
  "an other-state answer to a Florida street is no match",
  kind(
    census(
      censusMatch({
        matchedAddress: "1 MAIN ST, SPRINGFIELD, IL, 62701",
        streetName: "MAIN",
        suffixType: "ST",
        city: "SPRINGFIELD",
        zip: "62701",
        state: "IL",
        geoid: "171670001001000",
      })
    ),
    "1 Main St, Springfield, FL"
  ) === "none"
);
assert(
  "an address the voter put in another state is out of state, not 'not found'",
  kind(
    census(
      censusMatch({
        matchedAddress: "1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500",
        streetName: "PENNSYLVANIA",
        suffixType: "AVE",
        suffixDirection: "NW",
        city: "WASHINGTON",
        zip: "20500",
        state: "DC",
        geoid: "110019800001034",
      })
    ),
    "1600 Pennsylvania Ave NW, Washington, DC 20500"
  ) === "outOfState"
);
assert(
  "no matches at all is no match",
  kind({ status: "ZERO_RESULTS", results: [] }, "1 Nowhere Rd, Miami") === "none"
);
assert(
  "a malformed payload is null (a failure, not an answer)",
  parseAddressMatches({ nope: true }, "x") === null
);
assert(
  "a refused key is null (ours to report), not 'no match'",
  parseAddressMatches({ status: "REQUEST_DENIED", results: [] }, "x") === null
);

assert(
  "', FL' is added when no state or ZIP is given",
  addressQuery(" 601 E  Kennedy Blvd, Tampa ") ===
    "601 E Kennedy Blvd, Tampa, FL"
);
assert(
  "a named state is left alone",
  addressQuery("601 E Kennedy Blvd, Tampa, Florida") ===
    "601 E Kennedy Blvd, Tampa, Florida" &&
    addressQuery("601 E Kennedy Blvd Tampa fl") ===
      "601 E Kennedy Blvd Tampa fl"
);
assert(
  "a trailing ZIP is left alone",
  addressQuery("115 S Andrews Ave, 33301") === "115 S Andrews Ave, 33301" &&
    addressQuery("444 SW 2nd Ave 33130-1910") === "444 SW 2nd Ave 33130-1910"
);
assert(
  "a five-digit house number is not a ZIP",
  addressQuery("12345 SW 88th St, Miami") === "12345 SW 88th St, Miami, FL"
);
assert(
  "an address needs a house number and a street",
  looksLikeStreetAddress("444 SW 2nd Ave") &&
    !looksLikeStreetAddress("Kennedy Blvd, Tampa") &&
    !looksLikeStreetAddress("33130") &&
    !looksLikeStreetAddress("33130-1234") &&
    !looksLikeStreetAddress("1 a")
);

/* The block never leaves the server: resolveBlock searches a cached copy of
   the whole table. A filter on the block would put it in a request URL, and
   Supabase's gateway logs keep URLs (review 2026-10-12). */
{
  const resolveSrc = stripCommentsEarly(
    readFileSync(join(ROOT, "src/lib/resolve.ts"), "utf8")
  );
  const body = resolveSrc.slice(
    resolveSrc.indexOf("export async function resolveBlock("),
    resolveSrc.indexOf("export async function resolveDistrict(")
  );
  assert(
    "resolveBlock sends no block to the database",
    /districtFromBlockRows\(await blockRanges\(\), blockGeoid\)/.test(body) &&
      !/\.(?:lte|gte|eq|filter|match|rpc)\(/.test(body),
    body.slice(0, 400)
  );
}
/* And zod stays out of the browser: LocationEntry takes only types from
   address-lookup.ts (zod) and its text rule from address-text.ts. */
{
  const entrySrc = readFileSync(
    join(ROOT, "src/components/features/LocationEntry.tsx"),
    "utf8"
  );
  const text = readFileSync(join(ROOT, "src/lib/address-text.ts"), "utf8");
  assert(
    "LocationEntry imports address-lookup.ts for types only",
    /import type \{[^}]*\} from "@\/lib\/address-lookup";/.test(entrySrc) &&
      !/^import \{[^}]*\} from "@\/lib\/address-lookup";/m.test(entrySrc)
  );
  assert("address-text.ts imports nothing", !/^import /m.test(text));
}

/* ---- The routes' privacy contract, asserted structurally ---- */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

for (const rel of [
  "src/app/api/address/suggest/route.ts",
  "src/app/api/address/resolve/route.ts",
]) {
  const code = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  assert(`${rel} is POST`, /export async function POST\(/.test(code), rel);
  assert(
    `${rel} exposes no GET`,
    !/export async function GET\(/.test(code),
    "a GET would put the address in the URL, the access log and the referrer"
  );
  assert(`${rel} logs nothing`, !/console\./.test(code), rel);
  assert(`${rel} rate-limits`, /rateLimit\(/.test(code), rel);
  assert(
    `${rel} writes nothing to the database`,
    !/\.insert\(|\.upsert\(|serviceClient/.test(code),
    rel
  );
}

if (failures) {
  console.error(`\n${failures} address-resolve check(s) failed`);
  process.exit(1);
}
console.log("\nAll address-resolve checks passed.");
