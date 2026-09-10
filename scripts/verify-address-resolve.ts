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

/* ---- Pelias: suggestions carry their own coordinates ---- */
const suggestions = parseSuggestions(fixture("pelias-autocomplete.json"));
assert(
  "only the address features survive",
  suggestions.length === 2,
  `got ${suggestions.length}`
);
/* The fixture holds a `locality` feature on purpose. A locality (or street)
   result is a centroid, and a centroid can sit in a different district than the
   house does -- which is the exact ambiguity address lookup exists to remove.
   Answering confidently from one would be worse than not answering. */
assert(
  "a locality centroid is refused",
  suggestions.every((s) => !s.id.includes("whosonfirst"))
);
/* And an address feature with no geometry: Pelias would have nothing to resolve
   and the old Google path had a second call to fall back on. This one does not,
   so a coordinate-less suggestion must never reach the dropdown. */
assert(
  "an address with no geometry is refused",
  suggestions.every((s) => !s.id.endsWith("nogeom"))
);
assert(
  "the stable id is carried",
  suggestions[0].id === "openaddresses:address:us/fl/miami:4a1b2c3d"
);
assert("the display name is carried", suggestions[0].text === "444 SW 2nd Ave");
assert(
  "the secondary line is composed from the address parts",
  suggestions[0].secondary === "Miami, FL, 33130",
  suggestions[0].secondary ?? "null"
);
/* GeoJSON is [longitude, latitude]. Reversed, this Miami address lands off the
   coast of Somalia -- and both numbers stay plausible, so nothing else in the
   pipeline would notice. */
assert("the latitude is read from position 1", suggestions[0].lat === 25.769463071522);
assert("the longitude is read from position 0", suggestions[0].lon === -80.197602442738);
assert(
  "a malformed payload yields no suggestions",
  parseSuggestions({ nope: 1 }).length === 0
);

/* The coordinate must reach Census exactly. Rounding one can move it across a
   block boundary, and a block boundary is a district boundary. */
assert(
  "the coordinate is not rounded on the way through",
  String(suggestions[0].lat).length > 8 && String(suggestions[0].lon).length > 8
);

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
