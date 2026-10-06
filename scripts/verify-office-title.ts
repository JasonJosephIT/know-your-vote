/* A U.S. House race is named by its district, on its own page and on its
   candidates' pages.

   All sixteen House race pages were titled and headed "United States
   Representative", with the district only in an "FL-27" chip, and a
   candidate page said "Running for United States Representative" without
   saying which district. officeTitle() (src/lib/office-title.ts) renders
   "U.S. Representative, District 27":

     1. Every House district on the 2026 ballot (FL-7 to FL-28) gets its
        number; nothing else changes: statewide offices, the Senate, county
        offices whose district is an internal code, and a House office with
        no usable district.
     2. The race page uses it for <title>, the share card's title and the
        h1 (through RaceHeader), in both the brief and the listed state.
     3. The candidate page uses it for "Running for" in both states and for
        its <title>, which says "running for" so a challenger's title never
        reads as if they held the seat.

   Run: node scripts/verify-office-title.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { officeTitle } from "../src/lib/office-title.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const code = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

console.log("1. officeTitle()");
const HOUSE = "United States Representative";
/* The House races in the live race table, 2026-10-05. */
const DISTRICTS = [7, 8, 9, 10, 11, 12, 14, 15, 16, 20, 22, 24, 25, 26, 27, 28];
for (const n of DISTRICTS) {
  const got = officeTitle({ office: HOUSE, district: `FL-${n}` });
  check(`FL-${n} -> "U.S. Representative, District ${n}"`, got === `U.S. Representative, District ${n}`, got);
}
const UNCHANGED: { office: string; district: string | null }[] = [
  { office: "Governor", district: null },
  { office: "United States Senator", district: null },
  { office: "Broward County Commission, District 2", district: "BRO-CC-2" },
  { office: "Orange County Mayor", district: "ORA-MAYOR" },
  { office: HOUSE, district: null },
  { office: HOUSE, district: "FL-AT" },
  { office: "State Representative", district: "FL-27" },
];
for (const race of UNCHANGED) {
  check(
    `${race.office} (${race.district ?? "no district"}) is unchanged`,
    officeTitle(race) === race.office,
    officeTitle(race)
  );
}

console.log("\n2. The race page");
const racePage = code("src/app/(public)/races/[raceId]/page.tsx");
check(
  "<title> and the share card's title come from officeTitle(race)",
  /const title = `\$\{officeTitle\(race\)\} — Know Your Vote`;/.test(racePage) &&
    /openGraph: \{\s*title,/.test(racePage) &&
    !/\$\{office\} — Know Your Vote/.test(racePage)
);
check(
  "the share card keeps the site's description and image",
  /og\?\.images/.test(racePage) && /og\?\.description/.test(racePage)
);
check(
  "the h1 (RaceHeader) gets officeTitle in the brief and the listed state",
  /<RaceHeader race=\{\{ \.\.\.brief\.race, office: officeTitle\(brief\.race\) \}\}>/.test(racePage) &&
    /<RaceHeader race=\{\{ \.\.\.listing\.race, office: officeTitle\(listing\.race\) \}\}>/.test(racePage) &&
    !/<RaceHeader race=\{(brief|listing)\.race\}/.test(racePage)
);

console.log("\n3. The candidate page");
const candidatePage = code("src/app/(public)/candidates/[candidateId]/page.tsx");
check(
  "runningFor() reads the race and names it with officeTitle",
  /async function runningFor\([\s\S]*?officeTitle\(race\)/.test(candidatePage)
);
check(
  '<title> says "<name>, running for <office>", or how a decided seat was decided',
  /`\$\{shown\.candidate\.legal_name\}, running for \$\{office\} — Know Your Vote`/.test(candidatePage) &&
    /`\$\{shown\.candidate\.legal_name\}, \$\{office\}: \$\{settled\} — Know Your Vote`/.test(candidatePage) &&
    /const \{ office, settled \} = await runningFor\(shown\.raceId, shown\.office\);/.test(candidatePage)
);
check(
  'a decided seat is never "running for": FL-10 (unopposed) and the primary-decided seats',
  /"elected without opposition"/.test(candidatePage) &&
    /"decided in the August primary"/.test(candidatePage) &&
    /\{settled \? "" : "Running for "\}/.test(candidatePage)
);
check(
  '"Running for" uses it in the brief and the listed state',
  /const \{ office, settled \} = await runningFor\(detail\.raceId, detail\.office\);/.test(candidatePage) &&
    /const \{ office \} = await runningFor\(listing\.raceId, listing\.office\);/.test(candidatePage) &&
    /<CandidateListing listing=\{\{ \.\.\.listing, office \}\} \/>/.test(candidatePage) &&
    !/\{detail\.office\}/.test(candidatePage)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nOffice title checks passed.");
