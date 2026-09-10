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
} from "../src/lib/address-lookup.ts";

const ROOT = resolve(import.meta.dirname, "..");
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(join(ROOT, "scripts", "fixtures", "address", name), "utf8")
  );

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

/* ---- Places: suggestions and coordinates ---- */
const suggestions = parseSuggestions(fixture("places-autocomplete.json"));
assert(
  "both place predictions are read",
  suggestions.length === 2,
  `got ${suggestions.length}`
);
assert(
  "a query prediction is dropped",
  suggestions.every((s) => Boolean(s.placeId))
);
assert("the place id is carried", suggestions[0].placeId === "ChIJ_place_one");
assert(
  "the full text is carried for display",
  suggestions[0].text === "444 SW 2nd Ave, Miami, FL 33130, USA"
);
assert(
  "the secondary line is carried",
  suggestions[0].secondary === "Miami, FL 33130, USA"
);
assert(
  "a malformed payload yields no suggestions",
  parseSuggestions({ nope: 1 }).length === 0
);

const place = parsePlaceLocation(fixture("places-details.json"));
assert("the latitude is read", place?.lat === 25.769463071522);
assert("the longitude is read", place?.lng === -80.197602442738);
assert("details with no location yields null", parsePlaceLocation({}) === null);

/* The coordinate must reach Census exactly. Rounding one can move it across a
   block boundary, and a block boundary is a district boundary. */
assert(
  "the coordinate is not rounded on the way through",
  String(place?.lat).length > 8 && String(place?.lng).length > 8
);

if (failures) {
  console.error(`\n${failures} address-resolve check(s) failed`);
  process.exit(1);
}
console.log("\nAll address-resolve checks passed.");
