/* "Show races for": the control on the home page and in Candidates → Your
   races that narrows either page to the statewide races, one county's races
   or one U.S. House district's race (founder, 2026-10-13: "Both pages").

   What must hold:

     1. parseRaceScope (src/lib/race-scope.ts) reads ?show= into one of four
        shapes, and anything it can't confirm is covered -- a county we don't
        cover, a district not in the covered list, junk, an empty list from a
        failed read -- is "all", the page as it was before the control.
     2. raceScopeValue writes each scope back as the value parseRaceScope
        reads, and districtOptions lists each covered district once, by
        number, with every covered county it reaches.
     3. RaceScopePicker is a plain GET form a voter can use with JavaScript
        off: a visible label, a native select named "show", a submit button,
        no onChange (WCAG 3.2.2: applied on submit, never on change), the
        options built from COVERED_COUNTIES and the covered districts, and no
        "use client".
     4. The home page passes ?show= to the parser, puts the picker after the
        tiles with action "/", and keeps today's rendering for "all": the
        shared ballot, the House-race step and the coverage summary, with the
        news column outside the switch so it stays in every view.
     5. Candidates → Your races puts the same picker on the races view with
        action "/candidates" and view=races, carries the URL's district and
        county but never a ZIP, and renders YourRaces, unchanged, for "all".
     6. Every narrowed view has a plain "See all races" link back.

   Run: node scripts/verify-race-scope.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COVERED_COUNTIES } from "../src/lib/counties.ts";
import {
  districtOptions,
  parseRaceScope,
  raceScopeValue,
  type RaceScope,
} from "../src/lib/race-scope.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
/* Source with comments removed and whitespace collapsed, so a check reads
   the code and not a comment describing it. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s+/g, " ");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}
const same = (a: RaceScope, b: RaceScope) =>
  JSON.stringify(a) === JSON.stringify(b);

console.log("1. parseRaceScope");
const COVERED = ["FL-20", "FL-25", "FL-27", "FL-10"];
const ALL: RaceScope = { kind: "all" };
const cases: Array<[string, string | string[] | undefined, readonly string[], RaceScope]> = [
  ["missing", undefined, COVERED, ALL],
  ["empty", "", COVERED, ALL],
  ["all", "all", COVERED, ALL],
  ["statewide", "statewide", COVERED, { kind: "statewide" }],
  ["covered county (Miami-Dade)", "county-12086", COVERED, { kind: "county", fips: "12086" }],
  ["covered county (Orange)", "county-12095", COVERED, { kind: "county", fips: "12095" }],
  ["uncovered county (Duval)", "county-12031", COVERED, ALL],
  ["county with no FIPS", "county-", COVERED, ALL],
  ["covered district", "district-FL-27", COVERED, { kind: "district", district: "FL-27" }],
  ["unknown district", "district-FL-99", COVERED, ALL],
  ["district outside the covered list", "district-FL-1", COVERED, ALL],
  ["district with the read failed (empty list)", "district-FL-27", [], ALL],
  ["junk", "<script>", COVERED, ALL],
  ["a bare FIPS", "12086", COVERED, ALL],
  ["a bare district", "FL-27", COVERED, ALL],
  ["case matters", "Statewide", COVERED, ALL],
  ["surrounding spaces", " statewide ", COVERED, { kind: "statewide" }],
  ["a repeated param: the first wins", ["county-12011", "statewide"], COVERED, { kind: "county", fips: "12011" }],
];
for (const [name, show, list, want] of cases) {
  const got = parseRaceScope(show, list);
  check(name, same(got, want), JSON.stringify(got));
}

console.log("\n2. raceScopeValue and districtOptions");
for (const scope of [
  ALL,
  { kind: "statewide" } as RaceScope,
  ...COVERED_COUNTIES.map((c): RaceScope => ({ kind: "county", fips: c.fips })),
  ...COVERED.map((d): RaceScope => ({ kind: "district", district: d })),
]) {
  check(
    `${raceScopeValue(scope)} reads back as itself`,
    same(parseRaceScope(raceScopeValue(scope), COVERED), scope)
  );
}
const options = districtOptions([
  { district: "FL-27", countyName: "Miami-Dade" },
  { district: "FL-20", countyName: "Miami-Dade" },
  { district: "FL-20", countyName: "Broward" },
  { district: "FL-9", countyName: "Orange" },
  { district: "FL-10", countyName: "Orange" },
]);
check(
  "each district once, sorted by number (9 before 10 before 20)",
  options.map((o) => o.district).join(",") === "FL-9,FL-10,FL-20,FL-27",
  options.map((o) => o.district).join(",")
);
check(
  "a district across a county line names both covered counties, in COVERED_COUNTIES order",
  options.find((o) => o.district === "FL-20")?.counties === "Miami-Dade and Broward",
  options.find((o) => o.district === "FL-20")?.counties
);
check("no pairs, no options", districtOptions([]).length === 0);

console.log("\n3. RaceScopePicker");
const pickerRaw = read("src/components/features/RaceScopePicker.tsx");
const picker = code("src/components/features/RaceScopePicker.tsx");
check("is a server component (no \"use client\")", !/["']use client["']/.test(pickerRaw));
check("is a GET form with the action it is given", /<form action=\{action\} method="get"/.test(picker));
check(
  "has a visible label \"Show races for\" tied to the select",
  /<label htmlFor="race-scope" className="(?![^"]*sr-only)[^"]*">\s*Show races for\s*<\/label>/.test(picker) &&
    /<select key=\{raceScopeValue\(scope\)\} id="race-scope" name=\{RACE_SCOPE_PARAM\}/.test(picker)
);
check("the select's name is show", /RACE_SCOPE_PARAM = "show"/.test(read("src/lib/race-scope.ts")));
check("no onChange anywhere: applied on submit, never on change", !/onChange|onInput|\.submit\(/.test(picker));
check("has a submit button labelled Show", /<Button type="submit" variant="secondary"> Show <\/Button>/.test(picker));
check(
  "uses the site's select recipe (16px text-body, border-border-input)",
  /className="[^"]*\bborder-border-input\b[^"]*\btext-body\b[^"]*"/.test(picker)
);
check("preselects the current choice", /defaultValue=\{raceScopeValue\(scope\)\}/.test(picker));
check(
  "options: All races, Statewide races, then the two groups",
  /<option value="all">All races<\/option> <option value="statewide">Statewide races<\/option> <optgroup label="County races">/.test(picker) &&
    /<optgroup label="U.S. House district">/.test(picker)
);
check(
  "county options come from COVERED_COUNTIES as county-<fips>",
  /COVERED_COUNTIES\.map\(\(c\) => \( <option key=\{c\.fips\} value=\{`county-\$\{c\.fips\}`\}>/.test(picker)
);
check(
  "district options come from the covered districts as district-<district>",
  /districts\.map\(\(d\) => \( <option key=\{d\.district\} value=\{`district-\$\{d\.district\}`\}>/.test(picker)
);
check("hidden inputs are only what the page passes in", /type="hidden" name=\{name\} value=\{value\}/.test(picker));
check("fits a 320px screen: full width below sm, min-w-0", /w-full min-w-0[^"]*sm:w-auto/.test(picker));

console.log("\n4. Home page");
const home = code("src/app/(public)/page.tsx");
check("reads ?show= and passes it to the parser with the covered districts", /parseRaceScope\( \(await searchParams\)\.show, districts\.map\(\(d\) => d\.district\) \)/.test(home));
check(
  "the picker sits right after the tiles, with action \"/\"",
  /<BallotAtAGlance \/> <RaceScopePicker action="\/" scope=\{scope\} districts=\{districtOptions\(districts\)\} \/>/.test(home)
);
check("a narrowed view says what it shows and links back to /", /<ScopeNote scope=\{scope\} allHref="\/" \/>/.test(home));
check(
  "county and district render ScopedRaces; all and statewide the shared ballot, tracked as before",
  /scope\.kind === "county" \|\| scope\.kind === "district" \? \( <ScopedRaces scope=\{scope\} \/> \) : \( <> \{ballotRendered && <TrackView event="ballot_viewed" \/>\} <SharedBallot \/> <\/> \)/.test(home)
);
{
  const gate = home.indexOf("{showAll && (");
  const end = home.indexOf("</aside>");
  const block = gate >= 0 ? home.slice(gate, home.indexOf("<aside", gate)) : "";
  check("showAll is exactly the \"all\" scope", /const showAll = scope\.kind === "all";/.test(home));
  check(
    "the zigzag, the House-race step and the coverage summary show only for \"all\"",
    gate >= 0 &&
      /<SectionDivider variant="zigzag" \/>/.test(block) &&
      /<LocationEntry/.test(block) &&
      /See your races for \{saved\.district\}/.test(block) &&
      /<CoverageSummary/.test(block)
  );
  check(
    "the masthead, banner, tiles and news column are outside the switch",
    home.indexOf("<HomeMasthead />") < gate &&
      home.indexOf("<DeadlineBanner") < gate &&
      home.indexOf("<BallotAtAGlance />") < gate &&
      home.indexOf("<HomeNews") > gate &&
      home.indexOf("<HomeNews") < end
  );
}

console.log("\n5. Candidates → Your races");
const cand = code("src/app/(public)/candidates/page.tsx");
check("reads ?show= and passes it to the parser", /parseRaceScope\( sp\.show, districts\.map\(\(d\) => d\.district\) \)/.test(cand));
check(
  "the picker is on the races view, action \"/candidates\", with the hidden fields",
  /\{view === "races" && \( <RaceScopePicker action="\/candidates" scope=\{raceScope\} districts=\{districtOptions\(districts\)\} hidden=\{pickerHidden\} \/> \)\}/.test(cand)
);
check("its hidden fields start with view=races", /const pickerHidden: Record<string, string> = \{ view: "races" \};/.test(cand));
check(
  "carries the URL's district and county, never a ZIP or an address",
  /if \(sp\.district\) pickerHidden\.district = sp\.district;/.test(cand) &&
    /if \(sp\.county\) pickerHidden\.county = sp\.county;/.test(cand) &&
    !/pickerHidden\.(zip|address)|pickerHidden\[/.test(cand)
);
check(
  "\"all\" is today's YourRaces, unchanged",
  /\{view === "races" && raceScope\.kind === "all" && \( <YourRaces zip=\{zip\} district=\{district\} county=\{county\} scope=\{scope\} \/> \)\}/.test(cand)
);
check(
  "statewide, county and district need no location",
  /raceScope\.kind === "statewide" && <SharedBallot \/>/.test(cand) &&
    /\(raceScope\.kind === "county" \|\| raceScope\.kind === "district"\) && \( <ScopedRaces scope=\{raceScope\} \/> \)/.test(cand)
);
check("a narrowed view links back to the races view", /<ScopeNote scope=\{raceScope\} allHref=\{allRacesHref\} \/>/.test(cand));

console.log("\n6. ScopedRaces");
const scoped = code("src/components/features/ScopedRaces.tsx");
check("is a server component", !/["']use client["']/.test(read("src/components/features/ScopedRaces.tsx")));
check("a county shows its races through racesForCounty and CountyRaces", /await racesForCounty\(fips\)/.test(scoped) && /<CountyRaces county=\{county\.name\} races=\{races\} \/>/.test(scoped));
check("a district shows its House race through districtRace", /await districtRace\(district\)/.test(scoped));
check(
  "a decided district race is said as not on the ballot, with the holder and DECIDED_TAG",
  /won&rsquo;t be printed on the November ballot/.test(scoped) && /DECIDED_TAG\[decided\.decided\]/.test(scoped)
);
check("a failed district read says so (houseRaceNotLoaded)", /houseRaceNotLoaded\(district\)/.test(scoped));
check("the way back is a plain \"See all races\" link", /<Link href=\{allHref\}[^>]*> See all races <\/Link>/.test(scoped));
check("headings are h2, under each page's h1", /<h2 id="district-race-heading"/.test(scoped) && /<h2 id="county-races-heading"/.test(scoped));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-race-scope: all checks passed.");
