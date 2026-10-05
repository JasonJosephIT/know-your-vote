/* Guardrail for session-handoff-2026-09-08-map-coverage.md §1 — the promise
   `zip_district` makes that the race table cannot always keep.

   The rule: a ZIP that resolves to a district is not a ZIP whose district
   race we have. When the second is false the voter must be told, because the
   first alone renders as a complete ballot.

   Pins the cases a future edit could break without the UI visibly
   complaining:

     1. District resolved, no district race in the set ⇒ missing.
     2. District resolved, district race present ⇒ not missing.
     3. No district at all (the county path) ⇒ never missing, whatever the
        race set holds. resolveCounty returns statewide races by design and
        must not accuse itself of a gap.
     4. Empty string is not a district, and is not a district race.
     5. An empty race set reports missing on its own; the caller composes it
        with `races.length > 0` so the "not published yet" copy keeps that
        case. This pins the composition too, since dropping it is the silent
        way to show two messages for one absence.
     6. County races (0031/0032, listed per county since 0033) stay out of
        `races`: their district is non-null, so one inside the list would
        silence the notice. They travel as ResolveResult `countyRaces`.

   Mutation-checked: replacing the predicate body with `false` fails case 1;
   with `Boolean(district)` fails case 2; dropping the empty-string handling
   fails case 4; and removing `&& races.length > 0` at the call site fails
   case 5.

   Pure and offline: no DB, no network, no browser. Same idiom as
   verify-news-slots.ts (Node >= 22 strips types natively).

   Run: node scripts/verify-coverage.ts */

import { readFileSync } from "node:fs";
import {
  addressCoverage,
  districtRaceMissing,
  STATEWIDE_BALLOT_HREF,
} from "../src/lib/coverage.ts";
import { COVERED_COUNTIES, coveredCountyNames } from "../src/lib/counties.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

type Race = { district: string | null };
const statewide: Race = { district: null };
const house = (d: string): Race => ({ district: d });

// (1) The Orlando case: FL-9 resolved, only statewide races came back.
check(
  "district resolved with no district race is missing",
  districtRaceMissing("FL-9", [statewide, statewide, statewide]) === true
);
check(
  "one statewide race is still missing",
  districtRaceMissing("FL-11", [statewide]) === true
);

// (2) The working case: FL-28 has a published House race.
check(
  "district resolved with its district race is not missing",
  districtRaceMissing("FL-28", [statewide, house("FL-28")]) === false
);
check(
  "a district race alone is not missing",
  districtRaceMissing("FL-15", [house("FL-15")]) === false
);

// (3) The county path never has a district, so it never reports a gap.
check(
  "undefined district is never missing",
  districtRaceMissing(undefined, [statewide, statewide]) === false
);
check(
  "null district is never missing",
  districtRaceMissing(null, [statewide]) === false
);
check(
  "undefined district with an empty race set is not missing",
  districtRaceMissing(undefined, []) === false
);

// (4) Empty string is absence on both sides, not data.
check(
  "empty-string district is not a district",
  districtRaceMissing("", [statewide]) === false
);
check(
  "empty-string race district does not satisfy the district race",
  districtRaceMissing("FL-9", [{ district: "" }]) === true
);

// (5) An empty race set reports missing; the call site must compose it with a
//     non-empty list so the "not published yet" copy is not doubled up.
check(
  "empty race set with a district reports missing on its own",
  districtRaceMissing("FL-9", []) === true
);

const yourRaces = readFileSync(
  new URL("../src/components/features/YourRaces.tsx", import.meta.url),
  "utf8"
);
check(
  "YourRaces composes the predicate with a non-empty race list",
  /districtRaceMissing\(result\.district,\s*result\.races\)\s*&&\s*result\.races\.length\s*>\s*0/.test(
    yourRaces.replace(/\s+/g, " ")
  ),
  "the notice must not fire when nothing came back at all"
);
check(
  "YourRaces names the district it is missing",
  yourRaces.includes("{result.district}"),
  "a gap notice that does not say which district is not actionable"
);

// (6) County races must stay out of `races`. They carry a non-null district
//     ('ORA-CC-2'), so one inside the list would satisfy the predicate and
//     silence the House-race notice for a voter whose House race is missing —
//     and it would place a county seat on a ballot we cannot place it on.
check(
  "a county race in the list would mask the missing House race",
  districtRaceMissing("FL-9", [statewide, { district: "ORA-CC-2" }]) === false,
  "documents why the next two checks exist"
);
const resolveSrc = readFileSync(
  new URL("../src/lib/resolve.ts", import.meta.url),
  "utf8"
);
check(
  "racesForDistrict matches only statewide or the exact district",
  /\.or\(`district\.is\.null,district\.eq\.\$\{district\}`\)/.test(resolveSrc),
  "a wider match would pull county races into `races`"
);
check(
  "YourRaces feeds the predicate result.races, never countyRaces",
  !/districtRaceMissing\([^)]*countyRaces/.test(yourRaces.replace(/\s+/g, " ")),
  "county races are county-matched and must not answer for the district"
);

// The predicate takes no side and reads nothing global.
check(
  "deterministic across calls",
  districtRaceMissing("FL-9", [statewide]) ===
    districtRaceMissing("FL-9", [statewide])
);
const input: Race[] = [statewide, house("FL-28")];
districtRaceMissing("FL-28", input);
check(
  "input array is not mutated",
  input.length === 2 &&
    input[0].district === null &&
    input[1].district === "FL-28"
);

// (7) Coverage comes from the ADDRESS, not the ZIP table. A Florida block we
//     cannot place is the statewide ballot, never "we don't cover this area".
const placed = { district: "FL-27", countyFips: "12086" };
check(
  "a placed Florida block is district coverage",
  addressCoverage("12", placed) === "district"
);
check(
  "an unplaced Florida block is statewide, not out of coverage",
  addressCoverage("12", null) === "statewide"
);
check(
  "a non-Florida block is out of state even if a row came back",
  addressCoverage("13", placed) === "out_of_state" &&
    addressCoverage("13", null) === "out_of_state"
);
const routeSrc = readFileSync(
  new URL("../src/app/api/address/resolve/route.ts", import.meta.url),
  "utf8"
);
check(
  "the address route falls back to the statewide ballot",
  /resolveStatewideOnly\(\)/.test(routeSrc) &&
    !/if \(!resolved\) return NextResponse\.json\(OUT_OF_COVERAGE\)/.test(
      routeSrc
    ),
  "an unplaced Florida address must not get OUT_OF_COVERAGE"
);
check(
  "the statewide link carries no location",
  !/zip=|district=|county=/.test(STATEWIDE_BALLOT_HREF) &&
    STATEWIDE_BALLOT_HREF.includes("scope=statewide")
);

// (8) The coverage copy names exactly the counties the resolver covers.
const names = coveredCountyNames();
check(
  "every covered county is named in the coverage copy",
  COVERED_COUNTIES.every((c) => names.includes(c.name)),
  names
);
check(
  "the list reads as prose",
  names === "Miami-Dade, Broward, Hillsborough and Orange",
  names
);
check(
  "YourRaces says full statewide coverage is not available",
  yourRaces.includes("Full statewide coverage isn&apos;t available") &&
    /result\.coverage === "statewide"/.test(yourRaces)
);

if (failures > 0) {
  console.error(`\nverify-coverage: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-coverage: OK — a resolved district without its race is reported, the county path is not, and the notice needs a non-empty list"
);
