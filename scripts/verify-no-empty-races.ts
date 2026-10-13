/* No covered voter lands on an empty race state (founder rule 2026-10-12:
   "none of the races should be empty. There should be no 'No race yet'").
   Write-up: docs/general-election/empty-races-2026-10-12.md.

   Two halves.

   OFFLINE, always:
     1. No races surface says a race is still coming: "Check back soon",
        "aren't published yet", "isn't published yet", "no race(s) yet",
        "We don't have the U.S. House race". Comments are stripped first, so
        a comment may still quote the old copy to explain why it went.
     2. The empty branches render the fault copy from coverage.ts:
        YourRaces's no-statewide-race branch RACES_NOT_LOADED (nothing
        loaded) or STATEWIDE_NOT_LOADED (county races did), its House-race
        notice houseRaceNotLoaded, SharedBallot's BALLOT_NOT_LOADED (nothing)
        or STATEWIDE_NOT_LOADED (questions only). Each sentence names no
        wait, never says "try again" (a failed statewide read is cached for
        up to an hour), and ends on "from", where the page links the voter's
        Supervisor of Elections.
     3. nothingLoaded, the predicate for YourRaces's empty branch, on
        fixtures: county races alone keep the page from being empty.

   LIVE, with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   (process env or .env.local; read only, anon key only), the data half: the
   empty branches can't render for a covered location because every one of
   them has races, as a voter's browser reads them (RLS: listed or
   published, 0033). For every covered county and every county+district
   pair a voter can be placed in, it replays the reads resolve.ts makes:
     - statewide: election = general, district IS NULL (getStatewideRaces);
     - the district's own House race (racesForDistrict / districtRace);
     - the county's races: level = county, district LIKE '<prefix>-%'
       (fetchCountyRaces);
   and fails on any location with no statewide race, a covered district with
   no House race, a covered county with no county race, or a race anon can
   read that names no candidate anon can read. A pair block_district places
   voters in but zip_district does not offer is the address path's fallback
   to the county view (resolveDistrict), so it must be a retired pair
   (RETIRED_DISTRICT_PAIRS, uncovered-zip-parts.ts) and nothing else.
   It prints the location x race-type table the write-up carries.

   Without the env it says "skipping live probes" and passes on the offline
   half; verify-all lists it as "offline checks only".

   Run: node scripts/verify-no-empty-races.ts */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BALLOT_NOT_LOADED,
  houseRaceNotLoaded,
  nothingLoaded,
  RACES_NOT_LOADED,
  STATEWIDE_NOT_LOADED,
} from "../src/lib/coverage.ts";
import { COVERED_COUNTIES } from "../src/lib/counties.ts";
import { ACTIVE_ELECTION_KIND } from "../src/lib/election.ts";
import { RETIRED_DISTRICT_PAIRS } from "../src/lib/uncovered-zip-parts.ts";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ok  ${name}`);
    return;
  }
  failures++;
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- offline ----------------------------------------------------------- */

console.log("offline: the copy");

/* Block and line comments out, JSX comments included ({/* ... *\/} leaves
   an empty {} behind, which no pattern below matches). A line comment is
   only one that starts its line, so "https://" in a string survives. */
const code = (file: string) =>
  readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SURFACES = [
  "src/components/features/YourRaces.tsx",
  "src/components/features/SharedBallot.tsx",
  "src/components/features/CountyRaces.tsx",
  "src/components/features/CandidateBrowser.tsx",
  "src/components/features/BallotAtAGlance.tsx",
  "src/lib/coverage.ts",
];
const NOT_YET: Array<[string, RegExp]> = [
  ["Check back soon", /check back soon/i],
  ["aren't published yet", /aren(?:&rsquo;|['’])t published yet/i],
  ["isn't published yet", /isn(?:&rsquo;|['’])t published yet/i],
  ["no race(s) yet", /\bno races? yet\b/i],
  [
    "We don't have the U.S. House race",
    /don(?:&rsquo;|['’])t have the U\.S\. House race/i,
  ],
];
for (const file of SURFACES) {
  /* Whitespace collapsed: JSX wraps a sentence across lines. */
  const src = code(file).replace(/\s+/g, " ");
  for (const [label, re] of NOT_YET) {
    check(`${file} never says "${label}"`, !re.test(src));
  }
}

const sentences = [
  ["RACES_NOT_LOADED", RACES_NOT_LOADED],
  ["houseRaceNotLoaded", houseRaceNotLoaded("FL-27")],
  ["BALLOT_NOT_LOADED", BALLOT_NOT_LOADED],
  ["STATEWIDE_NOT_LOADED", STATEWIDE_NOT_LOADED],
] as const;
for (const [name, s] of sentences) {
  check(`${name} promises no wait (no "yet", no "check back")`, !/\byet\b|check back/i.test(s), s);
  check(
    `${name} never says "try again" (getStatewideRaces caches a failed read for up to an hour)`,
    !/try again|reload|refresh/i.test(s),
    s
  );
  check(`${name} says the fault is ours`, /fault on our side/.test(s), s);
  check(`${name} ends on "from", where the Supervisor link goes`, / from$/.test(s), s);
}
check(
  "houseRaceNotLoaded names the district",
  houseRaceNotLoaded("FL-27").includes("FL-27")
);

console.log("offline: the branches");
const yourRaces = code("src/components/features/YourRaces.tsx").replace(/\s+/g, " ");
check(
  "YourRaces's no-statewide-race branch renders RACES_NOT_LOADED or STATEWIDE_NOT_LOADED, by nothingLoaded, and a Supervisor link",
  /\{result\.races\.length === 0 \? \( <p[^>]*> \{nothingLoaded\(result\.races, result\.countyRaces\) \? RACES_NOT_LOADED : STATEWIDE_NOT_LOADED\}\{" "\} <a href=\{supervisor\.url\}/.test(
    yourRaces
  )
);
check(
  "YourRaces's House-race notice renders houseRaceNotLoaded and a Supervisor link",
  /\{houseRaceNotLoaded\(result\.district \?\? ""\)\}\{" "\} <a href=\{supervisor\.url\}/.test(
    yourRaces
  )
);
check(
  "YourRaces takes the link from supervisorLink(result.countyFips)",
  /const supervisor = supervisorLink\(result\.countyFips\);/.test(yourRaces)
);
const shared = code("src/components/features/SharedBallot.tsx").replace(/\s+/g, " ");
check(
  "SharedBallot links the state's list of Supervisors",
  /const supervisor = supervisorLink\(\);/.test(shared)
);
check(
  "SharedBallot's empty branch renders BALLOT_NOT_LOADED and a Supervisor link",
  /races\.length === 0 && measures\.length === 0\) \{ return \( <p[^>]*> \{BALLOT_NOT_LOADED\}\{" "\} <a href=\{supervisor\.url\}/.test(
    shared
  )
);
check(
  "SharedBallot says the statewide races are missing when only the questions loaded",
  /\{races\.length === 0 && \( <p[^>]*> \{STATEWIDE_NOT_LOADED\}\{" "\} <a href=\{supervisor\.url\}/.test(
    shared
  )
);

const race = { district: null };
const countyRace = { district: "DAD-CC-4" };
check("nothing at all is nothingLoaded", nothingLoaded([], []) === true);
check("no county races field is nothingLoaded", nothingLoaded([], undefined) === true);
check("statewide races are not nothingLoaded", nothingLoaded([race], []) === false);
check(
  "county races alone are not nothingLoaded (the county path whose statewide read failed)",
  nothingLoaded([], [countyRace]) === false
);

/* ---- live -------------------------------------------------------------- */

const envLocal = path.join(ROOT, ".env.local");
if (existsSync(envLocal)) process.loadEnvFile(envLocal);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.log(
    "\n(skipping live probes — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set; offline checks only)"
  );
  finish();
}

type RaceRow = {
  race_id: string;
  office: string;
  level: string;
  district: string | null;
  candidate_ids: string[] | null;
};

/* Read only, anon only: what a voter's browser can see. */
const anon = createClient(url!, anonKey!);

async function races(
  filter: (q: ReturnType<typeof base>) => ReturnType<typeof base>
): Promise<RaceRow[]> {
  const { data, error } = await filter(base());
  if (error) throw new Error(`race read failed: ${error.message}`);
  return (data ?? []) as RaceRow[];
}
function base() {
  return anon
    .from("race")
    .select("race_id, office, level, district, candidate_ids")
    .eq("election", ACTIVE_ELECTION_KIND);
}

/* Every block range, in pages, as resolve.ts reads them: PostgREST caps a
   response at 1,000 rows and the table held 982 on 2026-10-12. */
async function blockPairRows() {
  const rows: { county_fips: string; congressional_district: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await anon
      .from("block_district")
      .select("county_fips, congressional_district")
      .order("block_start")
      .range(from, from + 999);
    if (error) throw new Error(`block_district read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

console.log("\nlive: every covered location, as anon");

const [statewide, house, county, zipRows, blockRows, people] = await Promise.all([
  races((q) => q.is("district", null)),
  races((q) => q.eq("level", "federal").not("district", "is", null)),
  races((q) => q.eq("level", "county")),
  anon
    .from("zip_district")
    .select("county_fips, congressional_district")
    .eq("in_coverage", true),
  blockPairRows(),
  anon.from("candidate").select("candidate_id, qualifying_status, ballot_status"),
]);
if (zipRows.error) throw new Error(`zip_district read failed: ${zipRows.error.message}`);
if (people.error) throw new Error(`candidate read failed: ${people.error.message}`);

const visible = new Map(
  (people.data ?? []).map((c) => [c.candidate_id as string, c])
);
const named = (r: RaceRow) =>
  (r.candidate_ids ?? []).filter((id) => visible.get(id)?.ballot_status === "ballot");
const decided = (r: RaceRow) => {
  const ids = named(r);
  return (
    ids.length === 1 &&
    ["unopposed", "elected_in_primary"].includes(
      String(visible.get(ids[0])?.qualifying_status)
    )
  );
};

for (const r of [...statewide, ...house, ...county]) {
  check(`${r.race_id} names a candidate anon can read`, named(r).length > 0);
}
check("statewide: at least one race on every Florida ballot", statewide.length > 0);

const pairKey = (fips: string, d: string) => `${d}|${fips}`;
const zipPairs = new Set(
  (zipRows.data ?? []).map((r) => pairKey(r.county_fips, r.congressional_district))
);
const blockPairs = new Set(
  blockRows.map((r) => pairKey(r.county_fips, r.congressional_district))
);
check("zip_district offers covered districts", zipPairs.size > 0);
check("block_district places voters", blockPairs.size > 0);
for (const pair of blockPairs) {
  if (zipPairs.has(pair)) continue;
  check(
    `${pair}: an address placed here falls back to the county view, so it must be a retired pair`,
    RETIRED_DISTRICT_PAIRS.has(pair)
  );
}

type Row = {
  location: string;
  statewide: number;
  house: string;
  commission: string;
  schoolBoard: string;
  mayor: string;
  clerk: string;
  candidates: number;
};
const table: Row[] = [];
const kindOf = (r: RaceRow) => {
  const d = r.district ?? "";
  if (/-CC-/.test(d)) return "commission";
  if (/-SB/.test(d)) return "schoolBoard";
  if (/-MAYOR$/.test(d)) return "mayor";
  if (/-CLERK$/.test(d)) return "clerk";
  return "other";
};
/* "n (c contested / d decided)", the shape the write-up's table uses. */
const cell = (list: RaceRow[]) => {
  if (list.length === 0) return "0";
  const settled = list.filter(decided).length;
  return `${list.length} (${list.length - settled} contested, ${settled} decided)`;
};
const candidatesIn = (list: RaceRow[]) => list.reduce((n, r) => n + named(r).length, 0);

for (const c of COVERED_COUNTIES) {
  const mine = county.filter((r) => (r.district ?? "").startsWith(`${c.raceDistrictPrefix}-`));
  check(`${c.name} County has county races`, mine.length > 0);
  check(
    `${c.name} County races are all commission, school board, mayor or clerk`,
    mine.every((r) => kindOf(r) !== "other"),
    mine.filter((r) => kindOf(r) === "other").map((r) => r.race_id).join(", ")
  );
  const by = (k: string) => mine.filter((r) => kindOf(r) === k);
  const districts = [...zipPairs]
    .filter((p) => p.endsWith(`|${c.fips}`))
    .map((p) => p.split("|")[0])
    .sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)));
  const countyRow = (location: string, own: RaceRow[]) => {
    const all = [...statewide, ...own, ...mine];
    table.push({
      location,
      statewide: statewide.length,
      house: own.length === 0 ? "—" : cell(own),
      commission: cell(by("commission")),
      schoolBoard: cell(by("schoolBoard")),
      mayor: cell(by("mayor")),
      clerk: cell(by("clerk")),
      candidates: candidatesIn(all),
    });
    /* What YourRaces's nothingLoaded tests. */
    check(`${location}: the races view is not empty`, !nothingLoaded([...statewide, ...own], mine));
  };
  countyRow(`${c.name} (county only)`, []);
  for (const d of districts) {
    const own = house.filter((r) => r.district === d);
    check(`${c.name} ${d}: its U.S. House race is readable`, own.length === 1, `${own.length} found`);
    countyRow(`${c.name} ${d}`, own);
  }
}
check(
  "statewide-only (a Florida address outside the four counties): the races view is not empty",
  !nothingLoaded(statewide, undefined)
);

console.log("\n| Location | Statewide | U.S. House | County commission | School board | County mayor | Clerk of courts | Candidates shown |");
console.log("|---|---|---|---|---|---|---|---|");
for (const r of table) {
  console.log(
    `| ${r.location} | ${r.statewide} | ${r.house} | ${r.commission} | ${r.schoolBoard} | ${r.mayor} | ${r.clerk} | ${r.candidates} |`
  );
}

finish();

function finish(): never {
  if (failures > 0) {
    console.error(`\n${failures} empty-race check(s) failed`);
    process.exit(1);
  }
  console.log("\nNo covered location can land on an empty race state.");
  process.exit(0);
}
