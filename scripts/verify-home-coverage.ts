/* Guardrail for three things the home page and the races view got wrong
   about a voter's ballot (2026-10-05).

   1. FL-10. Maxwell Alejandro Frost (FL-DOE-89909) is the race's only
      candidate, `unopposed`, so Florida will not print the contest. The race
      page said so (briefs.ts, isUnopposedContest), but the races view listed
      "United States Representative FL-10" as one of the voter's races with
      no note, and the home page told a voter set to FL-10 "That's the one
      part of your ballot that depends on where you live". Pinned: the pure
      decided-seat helper on FL-10's shape and its neighbours; the district
      list (racesForDistrict) and the county list mark seats through the one
      helper; the races view renders a decided race as "Not on your ballot",
      with the holder's name and the reason, still linked, and never as a
      card in the list; and the home page reads the saved district's race
      and says there is no House race on the ballot.

   2. Coverage. The site covers the statewide races, the amendments, U.S.
      House, and selected county races in four counties. The home page said
      "See everyone you can vote for", called the House race "the one part of
      your ballot that depends on where you live", linked "your full ballot",
      and the races view said every voter "gets the same ballot". Pinned: none
      of those survive in rendered copy; the not-covered sentence names
      Florida House and Senate, judges, city and special-district races and
      points to the sample ballot; the races view prints it and links
      /methodology#not-covered, an anchor that exists; and CoverageSummary's
      "Not covered" row lists city races and special districts.

   3. The field's words follow what it takes. When address completion was
      off in production (2026-10-04 to 10-12), the home page still asked for
      an "address or ZIP" and the field's placeholder and label said "Your
      address or ZIP code" whatever the flag. Since 2026-10-12 (founder) the
      field takes a street address and never a ZIP, and ADDRESS_LOOKUP_OFF
      means no field at all, just the district picker. Pinned: the field
      copy asks for an address (with its city or ZIP) and never for a ZIP
      alone, the off copy names no ZIP, the home page has a picker-only
      branch, and no surface hard-codes the address wording.

   Source checks read the files with comments stripped, so a comment quoting
   the old copy (several do, to say why it went) cannot pass or fail them.

   Pure and offline: no DB, no network. The helpers are pure modules
   (unopposed.ts, scope-copy.ts); resolve.ts and the components pull in
   next/cache and Supabase, so they are checked by source, as
   verify-coverage.ts and verify-judicial-retention.ts do.

   Run: node scripts/verify-home-coverage.ts */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { decidedSeatOf } from "../src/lib/unopposed.ts";
import {
  DECIDED_TAG,
  NOT_COVERED_SENTENCE,
  houseRaceNotOnBallot,
  locationFieldCopy,
} from "../src/lib/scope-copy.ts";
import type { Candidate } from "../src/types/schema.ts";

const ROOT = resolve(import.meta.dirname, "..");
const source = (file: string) => readFileSync(join(ROOT, file), "utf8");
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
/* Comment-free, one line, and JSX's &apos; / &rsquo; read as the apostrophe
   a voter sees, so copy split across lines or escaped still matches. */
const rendered = (file: string) =>
  stripComments(source(file))
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/\{" "\}/g, " ")
    .replace(/\s+/g, " ");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* ---- 1. A House race nobody contests is decided, and shown as decided --- */

type Row = Pick<
  Candidate,
  "candidate_id" | "legal_name" | "qualifying_status"
>;
const frost: Row = {
  candidate_id: "FL-DOE-89909",
  legal_name: "Maxwell Alejandro Frost",
  qualifying_status: "unopposed",
};
const row = (
  qualifying_status: Candidate["qualifying_status"],
  id = "X"
): Row => ({ candidate_id: id, legal_name: `Candidate ${id}`, qualifying_status });

const fl10 = decidedSeatOf([frost], false);
check(
  "FL-10's shape (one unopposed ballot candidate) is decided: unopposed",
  fl10?.decided === "unopposed",
  JSON.stringify(fl10)
);
check(
  "the decided seat names the one person who takes it",
  fl10?.holder.candidateId === "FL-DOE-89909" &&
    fl10?.holder.legalName === "Maxwell Alejandro Frost"
);
check(
  "a lone QUALIFIED survivor is a printed race, not decided",
  decidedSeatOf([row("qualified")], false) === null
);
check(
  "a seat won in the August primary is decided: elected_in_primary",
  decidedSeatOf([row("elected_in_primary")], false)?.decided ===
    "elected_in_primary"
);
check(
  "a contested race is not decided, and names no one",
  decidedSeatOf([row("qualified", "A"), row("qualified", "B")], false) ===
    null
);
check(
  "an unopposed candidate facing a write-in is a printed race",
  decidedSeatOf([frost], true) === null
);
check(
  "an empty race is not decided",
  decidedSeatOf([], false) === null
);

const homeLine = fl10 ? houseRaceNotOnBallot("FL-10", fl10) : "";
check(
  "home copy for FL-10 says there is no U.S. House race on the ballot",
  /no U\.S\. House race on your ballot/.test(homeLine),
  homeLine
);
check(
  "home copy for FL-10 names Frost and says why (unopposed, not printed)",
  homeLine.includes("Maxwell Alejandro Frost") &&
    homeLine.includes("elected without opposition") &&
    homeLine.includes("FL-10") &&
    !/primary/i.test(homeLine),
  homeLine
);
const primaryLine = houseRaceNotOnBallot("FL-99", {
  decided: "elected_in_primary",
  holder: { candidateId: "X", legalName: "Candidate X" },
});
check(
  "a primary-decided seat is never described as unopposed",
  /August primary/.test(primaryLine) &&
    !/without opposition|no one else/i.test(primaryLine),
  primaryLine
);
check(
  "the race-list tags keep the two decided states apart",
  DECIDED_TAG.unopposed === "elected without opposition" &&
    DECIDED_TAG.elected_in_primary === "decided in the August primary"
);

/* The wiring, by source. */
const resolveSrc = stripComments(source("src/lib/resolve.ts"));
const fnBody = (name: string) => {
  const start = resolveSrc.search(
    new RegExp(`(?:export )?async function ${name}\\(`)
  );
  if (start === -1) return "";
  const next = resolveSrc.slice(start + 1).search(/\n(?:export )?(?:async )?function /);
  return resolveSrc.slice(start, next === -1 ? undefined : start + 1 + next);
};
const districtBody = fnBody("racesForDistrict");
check(
  "racesForDistrict marks the district's decided seat from the cached districtRace",
  /districtRace\(district\)/.test(districtBody) &&
    /decided: own\.decided \?\? null/.test(districtBody),
  "the district list must carry the decided state, as the county list does"
);
check(
  "districtRace's fetch decides through decidedSeatsFor",
  /decidedSeatsFor\(/.test(fnBody("fetchDistrictRace"))
);
check(
  "the county list marks seats through the same helper",
  /decidedSeatsFor\(/.test(fnBody("fetchCountyRaces"))
);
check(
  "decidedSeatsFor decides with decidedSeatOf over ballot-tier candidates",
  /decidedSeatOf\(/.test(fnBody("decidedSeatsFor")) &&
    /\.eq\("ballot_status", "ballot"\)/.test(fnBody("decidedSeatsFor"))
);
check(
  "districtRace (the home page's read) is cached and versioned",
  /unstable_cache\(/.test(fnBody("districtRace")) &&
    /\["district-race", "v\d+"/.test(fnBody("districtRace"))
);
check(
  "districtRace degrades to null outside the cache",
  /catch\s*\{\s*return null;/.test(fnBody("districtRace"))
);

const yourRacesSrc = stripComments(
  source("src/components/features/YourRaces.tsx")
).replace(/\s+/g, " ");
check(
  "the races view's card list holds printed races only",
  /printed\.map\(\(race\) => \{[^]*?<(?:Card|LinkRow)\b/.test(yourRacesSrc) &&
    !/result\.races\.map\(\(race\)/.test(yourRacesSrc),
  "a decided race rendered as a card reads as one the voter can vote in"
);
check(
  "a decided race is rendered with its holder and reason",
  /decided\.map\(/.test(yourRacesSrc) &&
    /race\.holder\.legalName/.test(yourRacesSrc) &&
    /DECIDED_TAG\[race\.decided\]/.test(yourRacesSrc)
);
check(
  "a decided race still links to its race page",
  /decided\.map\([\s\S]*?href=\{`\/races\/\$\{race\.raceId\}`\}/.test(
    yourRacesSrc
  )
);
check(
  "the races view says plainly the race is not on the ballot",
  /Not on your ballot/.test(rendered("src/components/features/YourRaces.tsx"))
);

const homeSrc = stripComments(source("src/app/(public)/page.tsx")).replace(
  /\s+/g,
  " "
);
check(
  "the home page reads the saved district's race",
  /districtRace\(cookieDistrict\.district\)/.test(homeSrc)
);
check(
  "the home page says a decided House race is not on the ballot",
  /houseRaceNotOnBallot\(saved\.district, savedSeat\)/.test(homeSrc)
);

/* ---- 2. No copy claims the whole ballot -------------------------------- */

const home = rendered("src/app/(public)/page.tsx");
for (const [label, re] of [
  ["See everyone you can vote for", /See everyone you can vote for/i],
  ["the one part of your ballot", /the one part of (?:your|the) ballot/i],
  ["full ballot", /full ballot/i],
  ["rest of this page is the same", /rest of this page is the same/i],
] as const) {
  check(`home page no longer says "${label}"`, !re.test(home));
}
check(
  "home hero says it covers the races we cover",
  /See the races we cover/.test(home)
);
check(
  "home House-race step prints the not-covered sentence",
  /\{NOT_COVERED_SENTENCE\}/.test(home)
);
check(
  "home link says your races, not your ballot",
  /See your races for \{saved\.district\}/.test(home)
);

const races = rendered("src/components/features/YourRaces.tsx");
for (const [label, re] of [
  ["every race on your ballot", /every race on your ballot/i],
  ["gets the same ballot", /gets the same ballot/i],
  ["full ballot", /full ballot/i],
  ["whole ballot", /whole ballot/i],
] as const) {
  check(`races view no longer says "${label}"`, !re.test(races));
}
check(
  "races view prints the not-covered sentence and links the section",
  /\{NOT_COVERED_SENTENCE\}/.test(races) &&
    /href="\/methodology#not-covered"/.test(races)
);
check(
  "the methodology anchor it links to exists",
  /id="not-covered"/.test(source("src/app/(public)/methodology/page.tsx"))
);
check(
  "the races view's party note is about party, not the same ballot",
  /party doesn't limit what you can vote on/i.test(races)
);
check(
  "the field's default button no longer says 'See my ballot'",
  !/submitLabel = "See my ballot"/.test(
    source("src/components/features/LocationEntry.tsx")
  )
);

for (const needle of [
  "Florida House",
  "Senate",
  "judges",
  "city",
  "special-district",
  "sample ballot",
]) {
  check(
    `the not-covered sentence names ${needle}`,
    NOT_COVERED_SENTENCE.includes(needle),
    NOT_COVERED_SENTENCE
  );
}

const summary = rendered("src/components/features/CoverageSummary.tsx");
const notCoveredRow =
  summary.match(/<Row term="Not covered">([\s\S]*?)<\/Row>/)?.[1] ?? "";
for (const needle of [
  "Florida House",
  "Florida Senate",
  "judges",
  "city races",
  "soil and water",
  "community development",
]) {
  check(
    `CoverageSummary's "Not covered" row lists ${needle}`,
    notCoveredRow.includes(needle),
    notCoveredRow
  );
}

/* ---- 3. The field asks for an address, never a ZIP alone --------------- */

const off = locationFieldCopy(false);
const withAddress = locationFieldCopy(true);
check(
  "with the switch off there is no field: the words are about the district and name no ZIP",
  off.noun === "district" &&
    !/zip|address/i.test(JSON.stringify(off)) &&
    off.autoComplete === undefined,
  JSON.stringify(off)
);
check(
  "with address lookup on, the field asks for an address and says what it needs",
  withAddress.noun === "address" &&
    withAddress.label === "Your address" &&
    /city or ZIP code/.test(withAddress.hint ?? "") &&
    /* street-address: postal-code would autofill a bare ZIP, the one
       answer the field refuses. */
    withAddress.autoComplete === "street-address",
  JSON.stringify(withAddress)
);
/* "city or ZIP code" in the hint is part of the address; "or ZIP" in the
   noun, label or example offered a ZIP instead of one. */
check(
  "nothing in the field's words offers a ZIP alone",
  ![withAddress.noun, withAddress.label, withAddress.example ?? ""].some((s) =>
    /\bor ZIP\b/i.test(s)
  ) && !/A ZIP works|just your|ZIP only|5-digit/i.test(JSON.stringify(withAddress)),
  JSON.stringify(withAddress)
);

check(
  "home page asks for the field's noun, not a hard-coded address",
  /Give us your \{field\.noun\}/.test(home) &&
    !/Give us your address/i.test(home) &&
    !/placeholder="Your address or ZIP code"/.test(home)
);
check(
  "home page never asks for a ZIP",
  !/Give us your ZIP|enter your ZIP|your 5-digit ZIP/i.test(home)
);
check(
  "home page's House step has a picker-only branch for the kill switch",
  /\{addressEnabled \? \( <p [^>]*> Your U\.S\. House race isn't in the list above[^<]*Give us your \{field\.noun\}[\s\S]*?\) : \( <p [^>]*> Your U\.S\. House race isn't in the list above, because it depends on where you live\. Choose your district below/.test(
    home
  )
);
check(
  "home page derives the field copy from addressEntryEnabled()",
  /addressEnabled = addressEntryEnabled\(\)/.test(home) &&
    /locationFieldCopy\(addressEnabled\)/.test(home)
);
check(
  "CoverageSummary asks for the field's noun, not a hard-coded address",
  !/Add your address or ZIP/i.test(summary) &&
    /locationFieldCopy\(addressEnabled\)\.noun/.test(summary)
);
check(
  "the home page passes the flag to CoverageSummary",
  /<CoverageSummary hasDistrict=\{Boolean\(saved\)\} addressEnabled=\{addressEnabled\} \/>/.test(
    home
  )
);
const entry = rendered("src/components/features/LocationEntry.tsx");
check(
  "LocationEntry's label and placeholder example follow the flag, the same words before and after hydration",
  /const field = locationFieldCopy\(addressEnabled\);/.test(entry) &&
    !/takesAddress/.test(entry) &&
    /\{field\.label\}/.test(entry) &&
    /placeholder=\{placeholder \?\? field\.example\}/.test(entry) &&
    /autoComplete=\{field\.autoComplete\}/.test(entry) &&
    !/Your address or ZIP code/.test(entry)
);
check(
  "LocationEntry takes no ZIP: no ZIP name, keypad, pattern or /api/resolve call",
  !/name="zip"/.test(entry) &&
    !/inputMode=/.test(entry) &&
    !/pattern=/.test(entry) &&
    !/\/api\/resolve[?"`]/.test(entry) &&
    !/resolveZipCode|zip_resolved|DistrictConfirm/.test(entry)
);
check(
  "with the switch off there is no field, and the picker shows open with no toggle",
  /\{addressEnabled && \( <form id="location-form"/.test(entry) &&
    /useState\(!addressEnabled\)/.test(entry) &&
    /\{addressEnabled && \( <button id="district-picker-toggle"/.test(entry)
);
check(
  "LocationEntry's copy never offers a ZIP in place of an address",
  !/enter just your|your 5-digit ZIP|Try your ZIP|or enter your ZIP|use your ZIP/i.test(entry)
);

/* Site-wide: no page, component or route asks for a ZIP to find a
   location. "city or ZIP code" (part of an address) and the old-link and
   storage sentences ("We can't place that ZIP", "never your address or
   ZIP") don't ask for one. The reminder signup's ZIP field is out of scope
   by founder decision (2026-10-12): it picks the county's dates for the
   email, not a district, and the founder decides its future. */
{
  const REMINDER_SIGNUP = new Set([
    "src/components/features/VotingInfo.tsx",
    "src/components/features/ReminderSignupCta.tsx",
    "src/app/api/voting-info/route.ts",
  ]);
  /* "Add your ZIP code to that address" asks for a ZIP inside the
     address, so "add" is not one of the verbs. */
  const ASKS_FOR_ZIP =
    /\b(?:enter|type|give us|use|try)\s+(?:just\s+)?your\s+(?:5-digit\s+)?ZIP\b|Your address or ZIP code|"address or ZIP"|\bby ZIP\b|"Your ZIP code"|placeholder="(?:Enter\s+)?(?:your\s+)?ZIP|name="zip"|ZIP only/i;
  const files: string[] = [];
  (function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(name)) files.push(p);
    }
  })(join(ROOT, "src"));
  const asking = files
    .map((f) => f.slice(ROOT.length + 1))
    .filter((f) => !REMINDER_SIGNUP.has(f) && ASKS_FOR_ZIP.test(rendered(f)));
  check(
    "no surface asks for a ZIP to find a location (reminder signup excepted)",
    asking.length === 0,
    asking.join(", ")
  );
}

if (failures) {
  console.error(`\n${failures} home-coverage check(s) failed`);
  process.exit(1);
}
console.log("\nAll home-coverage checks passed.");
