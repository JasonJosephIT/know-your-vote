/* The judges note shows each voter their own county's appeals court
   (JudicialRetentionNote, founder decision 10; facts in
   src/lib/judicial-retention.ts).

   "Your races" used to render <BallotQuestions /> with no county, so a voter
   who had just told us they live in Orange read that Miami-Dade, Broward and
   Hillsborough ballots carry appeals judges, and had to work out which line
   was theirs. The note already took a county; nothing passed it. This checks
   the whole path, from what each county's lines say to who passes the name:

   1. Coverage. Every covered county (COVERED_COUNTIES) has exactly one
      appeals court row, in the same order, and there is no row for a county
      we do not cover. A county added to coverage without a row fails here
      rather than silently getting the full four-county note.
   2. Each county's output, pinned: the court, the count and the line a voter
      reads. These are the 2026-10-04 facts (Justice Muñiz statewide; five 3rd
      District judges for Miami-Dade, five 4th for Broward, four 2nd for
      Hillsborough, none for Orange's 6th). If a judge leaves the bench,
      change the fact and the expectation here together.
   3. The fallback. No county, an unknown county, a differently spelled one or
      a FIPS code passed by mistake all get every covered county's line, which
      is true for everyone; never an empty list.
   4. Links stay on official hosts: the courts' and the Division of
      Elections' own pages, never a bar poll or a voter guide.
   5. The wiring, by source: YourRaces passes result.county (the NAME the
      note is keyed by, not its own `county` prop, which is a FIPS code);
      BallotQuestions hands it on; the note selects through appealsForCounty
      and prints the Supreme Court line outside that choice; every resolve
      branch that reaches the note sets a covered county's name, except the
      statewide-only result, which sets none; and the home page passes
      nothing, so it keeps the full note: its caption tells a voter with a
      saved district that the rest of the page is the same for every Florida
      voter, and a narrowed judges note would make that false.

   The ZIP path's name comes from zip_district.county_name, which this cannot
   read offline. A read-only SELECT on 2026-10-05 found exactly the four
   COVERED_COUNTIES names there and no ZIP split across counties; a spelling
   change would degrade to the full note (check 3), not to a wrong court.

   Run: node scripts/verify-judicial-retention.ts */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { COVERED_COUNTIES } from "../src/lib/counties.ts";
import {
  APPEALS_BY_COUNTY,
  DOE_JUDICIAL_LIST,
  SUPREME_COURT,
  appealsForCounty,
  appealsLineLabel,
} from "../src/lib/judicial-retention.ts";

const ROOT = resolve(import.meta.dirname, "..");
const source = (file: string) => readFileSync(join(ROOT, file), "utf8");
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
const flat = (src: string) => stripComments(src).replace(/\s+/g, " ");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* What the note prints for one county, as the component composes it:
   "<County> ballots: <label>". */
const lineFor = (county: string | null | undefined) =>
  appealsForCounty(county).map((a) => `${a.county} ballots: ${appealsLineLabel(a)}`);

/* 1. Coverage. */
const coveredNames = COVERED_COUNTIES.map((c) => c.name);
check(
  "one appeals court row per covered county, in COVERED_COUNTIES order",
  APPEALS_BY_COUNTY.map((a) => a.county).join(",") === coveredNames.join(","),
  `rows: ${APPEALS_BY_COUNTY.map((a) => a.county).join(", ")}`
);

/* 2. Each covered county's output. */
const EXPECTED: Record<
  string,
  { court: string; judges: number; url: string; line: string }
> = {
  "Miami-Dade": {
    court: "3rd District Court of Appeal",
    judges: 5,
    url: "https://3dca.flcourts.gov/Judges",
    line: "Miami-Dade ballots: 5 judges of the 3rd District Court of Appeal",
  },
  Broward: {
    court: "4th District Court of Appeal",
    judges: 5,
    url: "https://4dca.flcourts.gov/Judges",
    line: "Broward ballots: 5 judges of the 4th District Court of Appeal",
  },
  Hillsborough: {
    court: "2nd District Court of Appeal",
    judges: 4,
    url: "https://2dca.flcourts.gov/Judges",
    line: "Hillsborough ballots: 4 judges of the 2nd District Court of Appeal",
  },
  Orange: {
    court: "6th District Court of Appeal",
    judges: 0,
    url: "https://6dca.flcourts.gov/Judges",
    line: "Orange ballots: no appeals court judges this year",
  },
};

for (const { name, fips } of COVERED_COUNTIES) {
  const want = EXPECTED[name];
  const rows = appealsForCounty(name);
  const row = rows[0];
  check(
    `${name}: exactly its own court and no other county's`,
    rows.length === 1 && row?.county === name,
    rows.map((r) => r.county).join(", ")
  );
  check(
    `${name}: ${want?.court ?? "(no expectation)"}, ${want?.judges} judges up`,
    Boolean(want) &&
      row?.court === want.court &&
      row?.judges === want.judges &&
      row?.url === want.url
  );
  const printed = lineFor(name);
  check(
    `${name}: reads "${want?.line}"`,
    printed.length === 1 && printed[0] === want?.line,
    printed.join(" | ")
  );
  /* The FIPS code is not a key. Passed by mistake it must fall back to the
     full note, never resolve to some county's court. */
  check(
    `${name}: its FIPS (${fips}) is not mistaken for the name`,
    appealsForCounty(fips).length === APPEALS_BY_COUNTY.length
  );
}

/* 3. The fallback. */
const FULL = lineFor(undefined).join(" | ");
check(
  "no county: every covered county's line, in order",
  FULL === COVERED_COUNTIES.map((c) => EXPECTED[c.name]?.line).join(" | "),
  FULL
);
for (const county of [
  null,
  "",
  "Pinellas",
  "Miami-Dade County",
  "MIAMI-DADE",
  "orange",
]) {
  check(
    `county ${JSON.stringify(county)}: falls back to the full note`,
    lineFor(county).join(" | ") === FULL
  );
}
check(
  "the label says 1 judge, not 1 judges",
  appealsLineLabel({
    county: "X",
    court: "1st District Court of Appeal",
    judges: 1,
    url: "https://1dca.flcourts.gov/Judges",
  }) === "1 judge of the 1st District Court of Appeal"
);

/* 4. Official hosts only, and the one statewide fact. */
check(
  "the Supreme Court line names Justice Muñiz",
  SUPREME_COURT.justice === "Justice Carlos G. Muñiz"
);
const hostOf = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.hostname : "";
  } catch {
    return "";
  }
};
const links = [
  SUPREME_COURT.url,
  DOE_JUDICIAL_LIST,
  ...APPEALS_BY_COUNTY.map((a) => a.url),
];
check(
  "every link is https on flcourts.gov or the Division of Elections",
  links.every((url) => {
    const host = hostOf(url);
    return (
      host.endsWith(".flcourts.gov") || host === "dos.elections.myflorida.com"
    );
  }),
  links.join(", ")
);
check(
  "the state's list is the 2026 general election's judicial offices",
  /elecid=20261103-GEN/.test(DOE_JUDICIAL_LIST) &&
    /OfficeGroup=JUD/.test(DOE_JUDICIAL_LIST)
);

/* 5. The wiring. */
const yourRaces = flat(source("src/components/features/YourRaces.tsx"));
check(
  "YourRaces passes the resolved county name to BallotQuestions",
  /<BallotQuestions county=\{result\.county\} \/>/.test(yourRaces)
);
check(
  "YourRaces renders BallotQuestions once (every branch shares it)",
  (yourRaces.match(/<BallotQuestions\b/g) ?? []).length === 1
);
check(
  "YourRaces never passes its FIPS `county` prop to the note",
  !/<BallotQuestions county=\{county\}/.test(yourRaces)
);

const ballotQuestions = flat(
  source("src/components/features/BallotQuestions.tsx")
);
check(
  "BallotQuestions hands the county to the note",
  /<JudicialRetentionNote county=\{county\} \/>/.test(ballotQuestions)
);

const note = flat(source("src/components/features/JudicialRetentionNote.tsx"));
check(
  "the note selects its lines through appealsForCounty",
  /const appeals = appealsForCounty\(county\);/.test(note)
);
check(
  "the note keeps no copy of the facts",
  !/APPEALS_BY_COUNTY/.test(note) && !/flcourts\.gov/.test(note),
  "they live in src/lib/judicial-retention.ts, where this script checks them"
);
check(
  "the note prints \"<County> ballots:\" before each label",
  /\{a\.county\} ballots:\{" "\}/.test(note) &&
    (note.match(/\{appealsLineLabel\(a\)\}/g) ?? []).length === 2
);
const supremeAt = note.indexOf("{SUPREME_COURT.justice}");
const mapAt = note.indexOf("appeals.map(");
check(
  "the Supreme Court line is printed for every county, outside the appeals list",
  supremeAt > -1 && mapAt > -1 && supremeAt < mapAt
);

/* Which county each resolve branch hands YourRaces. */
const resolveSrc = stripComments(source("src/lib/resolve.ts"));
const fnBody = (name: string) => {
  const start = resolveSrc.indexOf(`export async function ${name}(`);
  if (start === -1) return "";
  const next = resolveSrc.indexOf("export ", start + 1);
  return resolveSrc.slice(start, next === -1 ? undefined : next);
};
check(
  "ZIP branch: the county is zip_district's county_name",
  /const county = rows\[0\]\.county_name;/.test(fnBody("resolveZip"))
);
check(
  "county-only branch: the county is the covered county's name",
  /county: county\.name,/.test(fnBody("resolveCounty"))
);
check(
  "district + county branch: the county is the covered county's name",
  /county: county\.name,/.test(fnBody("resolveDistrict"))
);
check(
  "statewide-only branch: no county, so the full note",
  fnBody("resolveStatewideOnly") !== "" &&
    !/\bcounty\s*:/.test(fnBody("resolveStatewideOnly"))
);

/* The home page keeps the full note: it is the same for every visitor, as
   its saved-district caption says the rest of the page is. */
const home = flat(source("src/app/(public)/page.tsx"));
const shared = flat(source("src/components/features/SharedBallot.tsx"));
check(
  "home page renders SharedBallot with no county, and SharedBallot passes none on",
  /<SharedBallot \/>/.test(home) && /<BallotQuestions \/>/.test(shared)
);

if (failures) {
  console.error(`\n${failures} judicial-retention check(s) failed`);
  process.exit(1);
}
console.log("\nAll judicial-retention checks passed.");
