/* Guardrail for the roster-completeness worksheet and the SQL written from it
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3-3.4,
   §3.6 D6). Offline: no network, no database.

   1. The read helpers (scripts/roster-reads-lib.ts): D6's normalizeDoeText on
      the two raw DoE strings the spec quotes (§2.6), the canDetail parser on
      the page as served and as headless Chromium serializes it, the House and
      Senate XML, the FEC count rule, page text, the 15-word evidence snippet.
   2. The worksheet rules and the SQL generator (scripts/roster-worksheet.ts)
      on a small made-up worksheet: names and facts below are fixtures, not
      research. Each rule is mutation-checked: a broken row must be caught.
   3. The real worksheet passes every rule, and the generated blocks of
      supabase/migrations/0049_roster_completeness.sql are exactly what the
      worksheet produces, so the SQL cannot drift from what was reviewed.

   Run: node scripts/verify-roster-worksheet.ts */

import {
  namesOnPage,
  normalizeDoeText,
  pageText,
  parseFecCandidates,
  parseHouseFlorida,
  parseRunningMate,
  parseSenateFlorida,
  snippet,
  surname,
} from "./roster-reads-lib.ts";
import {
  applyBlocks,
  checkWorksheet,
  fillTimes,
  generatedBlocks,
  labelFor,
  loadRoster,
  officialHost,
  ruleOf,
  timesFromRounds,
  type RosterRow,
} from "./roster-worksheet.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const throws = (fn: () => unknown) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

/* ---- 1. read helpers ------------------------------------------------------ */

/* §2.6, as served: CR LF, two tabs, four spaces. */
const RAW_89042 = " Bryan&nbsp;\r\n\t\t    Avila                     ";
const RAW_90630 = " Ruben&nbsp;\r\n\t\t    A.&nbsp;\r\n\t\t    Coto                     ";

check('D6: canDetail 89042 reads "Bryan Avila"', normalizeDoeText(RAW_89042) === "Bryan Avila");
check('D6: canDetail 90630 reads "Ruben A. Coto"', normalizeDoeText(RAW_90630) === "Ruben A. Coto");
check(
  "D6 keeps case, accents and punctuation",
  normalizeDoeText(" José&nbsp;\n  O'Brien-Núñez, Jr. ") === "José O'Brien-Núñez, Jr.",
);
check("D6 fails closed on an entity it cannot decode", throws(() => normalizeDoeText("Pe&ntilde;a")));

const PAGE_89042 = [
  '<td valign="top" align="center" colspan="4">',
  "  <font size=+1 ><b>2026 General Election</b></font><b> <br />",
  "  Governor                                          </b>",
  "  <br />",
  '  <font size=+1 color="#CCOOOO"><b>Byron Donalds</b></font>',
  "  <br />",
  "  <b>",
  "    Republican",
  "  </b>",
  "  <br>",
  `  Running Mate:${RAW_89042}</td>`,
].join("\r\n");
const DOM_90630 = [
  '<font size="+1"><b>2026 General Election</b></font><b> <br>',
  "                      Governor                                          </b>",
  '<font size="+1" color="#CCOOOO"><b>Charles Burkett</b></font>',
  "<br>",
  `Running Mate:${RAW_90630.replace(/\r\n/g, "\n")}</td>`,
].join("\n");

const rm1 = parseRunningMate(PAGE_89042);
check(
  "canDetail as served: election, office, candidate, raw and stored",
  rm1?.election === "2026 General Election" &&
    rm1.office === "Governor" &&
    rm1.candidate === "Byron Donalds" &&
    rm1.raw === RAW_89042 &&
    rm1.stored === "Bryan Avila",
  JSON.stringify(rm1),
);
const rm2 = parseRunningMate(DOM_90630);
check(
  "canDetail as headless Chromium serializes it",
  rm2?.office === "Governor" && rm2.candidate === "Charles Burkett" && rm2.stored === "Ruben A. Coto",
  JSON.stringify(rm2),
);
check("a page with no Running Mate field reads as null", parseRunningMate("<td>Status: Active</td>") === null);
check(
  "markup inside the field is refused, not stripped",
  throws(() => parseRunningMate("Running Mate: <b>Someone</b></td>")),
);

const HOUSE_XML = `<MemberData><members>
<member><statedistrict>AK00</statedistrict><member-info><official-name>Nicholas J. Begich III</official-name></member-info></member>
<member><statedistrict>FL25</statedistrict><member-info><official-name>Debbie Wasserman Schultz</official-name><district>25th</district></member-info></member>
<member><statedistrict>FL20</statedistrict><member-info><official-name/><district>20th</district><footnote-ref>0</footnote-ref><footnote>Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026.</footnote></member-info></member>
</members></MemberData>`;
const seats = parseHouseFlorida(HOUSE_XML);
check(
  "House XML: Florida seats only, in district order, a vacancy keeps the Clerk's footnote",
  seats.length === 2 &&
    seats[0].district === 20 &&
    seats[0].name === null &&
    seats[0].vacancy === "Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026." &&
    seats[1].district === 25 &&
    seats[1].name === "Debbie Wasserman Schultz" &&
    seats[1].vacancy === null,
  JSON.stringify(seats),
);

const SENATE_XML = `<contact_information>
<member><member_full>Moody (R-FL)</member_full><last_name>Moody</last_name>
  <first_name>Ashley</first_name><state>FL</state><website>https://www.moody.senate.gov</website><class>Class III</class></member>
<member><last_name>Alsobrooks</last_name> <first_name>Angela D.</first_name> <state>MD</state></member>
</contact_information>`;
const senators = parseSenateFlorida(SENATE_XML);
check(
  "Senate XML: Florida's senators with site and class",
  senators.length === 1 &&
    senators[0].name === "Ashley Moody" &&
    senators[0].website === "https://www.moody.senate.gov" &&
    senators[0].senateClass === "Class III",
  JSON.stringify(senators),
);

const fecRow = { candidate_id: "H0FL00000", name: "EXAMPLE, ONE", incumbent_challenge: "I", election_districts: ["25", "20"] };
check(
  "FEC: a page whose pagination.count differs from its rows is refused",
  parseFecCandidates({ pagination: { count: 2 }, results: [fecRow] }).ok === false,
);
const fecOk = parseFecCandidates({ pagination: { count: 1 }, results: [fecRow] });
check(
  "FEC: a complete page gives id, incumbent_challenge and election_districts",
  fecOk.ok && fecOk.rows[0].candidate_id === "H0FL00000" && fecOk.rows[0].election_districts.join(",") === "25,20",
);
check("FEC: something that is not a candidates page is refused", parseFecCandidates({ results: [] }).ok === false);

check(
  "page text drops scripts and tags and decodes entities",
  pageText("<p>Hello&nbsp;<b>World</b></p><script>var x = 1;</script>") === "Hello World",
);
const long = "one two three four five six seven eight nine ten Gwen Myers District 3 eleven twelve thirteen fourteen fifteen sixteen seventeen";
const snip = snippet(long, "gwen myers") ?? "";
check(
  "evidence snippet: at most 15 words, containing the name",
  snip.split(" ").length === 15 && snip.includes("Gwen Myers"),
  snip,
);
check("evidence snippet: null when the name is not on the page", snippet(long, "Jackie Toledo") === null);
check(
  "surname skips nicknames and suffixes",
  surname('Phil "Felipe" Ehr') === "Ehr" &&
    surname("Victor M. Torres Jr.") === "Torres" &&
    surname("Oliver G. Gilbert III") === "Gilbert" &&
    surname('Patricia "Patti" Rendon') === "Rendon",
);
check(
  "names on a page: surname match, case- and accent-insensitive, hyphens kept",
  namesOnPage("Harry Cohen District 1, GWEN MYERS District 3, Mario Díaz-Balart", [
    "Harry Cohen",
    "Jackie Toledo",
    "Gwen Myers",
    "Mario Diaz-Balart",
  ]).join("|") === "Harry Cohen|Gwen Myers|Mario Diaz-Balart",
);

/* ---- 2. worksheet rules and the generator, on made-up rows ------------------ */

const fullRoster = loadRoster();
const raceIds = [...new Set(fullRoster.map((r) => r.race_id))];
check(
  "the roster fixture is the 2026-10-08 ballot: 106 candidates, 53 races, 9 without a site",
  fullRoster.length === 106 && raceIds.length === 53 && fullRoster.filter((r) => !r.has_site).length === 9,
);
check("every one of the 53 races has a label (§3.5)", raceIds.every((id) => labelFor(id) !== null));
check(
  "labels by race (§3.5), and none for an unknown id",
  labelFor("FL-20-general") === "Member of the U.S. House now" &&
    labelFor("FL-SEN-general") === "Member of the U.S. Senate now" &&
    labelFor("FL-GOV-general") === "Holds this office now" &&
    labelFor("FL-ORA-CLERK-general") === "Holds this office now" &&
    labelFor("FL-ORA-MAYOR-general") === "Holds this office now" &&
    labelFor("FL-DAD-CC5-general") === "Member of the Miami-Dade County Commission now" &&
    labelFor("FL-BRO-SBAL8-general") === "Member of the Broward County School Board now" &&
    labelFor("FL-ORA-SBCHAIR-general") === "Member of the Orange County School Board now" &&
    labelFor("FL-XYZ-general") === null,
);
check(
  "official hosts: the body's own site and house.gov count; Ballotpedia, the FEC and http do not",
  officialHost("https://clerk.house.gov/xml/lists/MemberData.xml") &&
    officialHost("https://soto.house.gov/") &&
    officialHost("https://www.ocps.net/school-board") &&
    !officialHost("https://ballotpedia.org/Florida") &&
    !officialHost("https://api.open.fec.gov/v1/candidates/") &&
    !officialHost("http://www.ocps.net/school-board"),
);

const MINI: RosterRow[] = [
  { candidate_id: "FL-DOE-1", legal_name: "Ann Member", race_id: "FL-20-general", level: "federal", race_status: "published", has_site: true },
  { candidate_id: "FL-DOE-2", legal_name: "Bo O'Neal", race_id: "FL-20-general", level: "federal", race_status: "published", has_site: true },
  { candidate_id: "FL-DOE-3", legal_name: "Cy Governor", race_id: "FL-GOV-general", level: "state", race_status: "published", has_site: false },
  { candidate_id: "FL-VF-ORA-4", legal_name: "Di Board", race_id: "FL-ORA-SBCHAIR-general", level: "county", race_status: "listed", has_site: false },
  { candidate_id: "FL-VF-HIL-5", legal_name: "Ed One", race_id: "FL-HIL-SB6-general", level: "county", race_status: "listed", has_site: true },
  { candidate_id: "FL-VF-HIL-6", legal_name: "Flo Two", race_id: "FL-HIL-SB6-general", level: "county", race_status: "listed", has_site: true },
];
const T1 = "2026-10-09T13:00Z";
const T2 = "2026-10-09T14:30Z";
const CLERK = "https://clerk.house.gov/xml/lists/MemberData.xml";
const HIL = "https://www.hillsboroughschools.org/page/school-board";
const MINI_MD = `# test worksheet

<!-- table:candidates -->
| candidate_id | legal_name | race_id | label | incumbent | holds_this_seat | source_url | read_1 | read_2 | second_page | evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| FL-DOE-1 | Ann Member | FL-20-general | Member of the U.S. House now | Yes | No | ${CLERK} | ${T1} | ${T2} | https://member.house.gov/ | "FL25 Ann Member" |
| FL-DOE-2 | Bo O'Neal | FL-20-general | Member of the U.S. House now | No | No | ${CLERK} | ${T1} | ${T2} | — | "FL20 Vacancy due to the resignation" |
| FL-DOE-3 | Cy Governor | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | ${T1} | ${T2} | — | "Governor Example Holder" |
| FL-VF-ORA-4 | Di Board | FL-ORA-SBCHAIR-general | Member of the Orange County School Board now | Yes | No | https://www.ocps.net/school-board | ${T1} | ${T2} | https://www.ocps.net/district-1 | "Di Board District 1" |
| FL-VF-HIL-5 | Ed One | FL-HIL-SB6-general | Member of the Hillsborough County School Board now | Yes | Yes | ${HIL} | ${T1} | ${T2} | https://www.hillsboroughschools.org/page/district-6 | "Ed One District 6" |
| FL-VF-HIL-6 | Flo Two | FL-HIL-SB6-general | Member of the Hillsborough County School Board now | Yes | No | ${HIL} | ${T1} | ${T2} | https://www.hillsboroughschools.org/page/district-2 | "Flo Two District 2" |

<!-- table:races -->
| race_id | incumbent_id | is_open_seat | own_seat_holder_today | note |
|---|---|---|---|---|
| FL-20-general | FL-DOE-1 | false | vacant |  |
| FL-GOV-general | NULL | true | Governor Example Holder |  |
| FL-ORA-SBCHAIR-general | FL-VF-ORA-4 | false | Chair Example |  |
| FL-HIL-SB6-general | FL-VF-HIL-5 | false | Ed One | two members run; Ed One holds District 6 |

<!-- table:fec -->
| candidate_id | race_id | fec_candidate_id | incumbent_challenge | election_districts | read_1 | read_2 |
|---|---|---|---|---|---|---|
| FL-DOE-1 | FL-20-general | H0FL00000 | I | 25, 25, 20 | ${T1} | ${T2} |
| FL-DOE-2 | FL-20-general | no match | — | — | ${T1} | ${T2} |

<!-- table:tickets -->
| candidate_id | governor | can_detail_url | raw_json | stored | read_1 | read_2 | reread_2026-10-17 | reread_2026-10-26 | reread_2026-11-02 |
|---|---|---|---|---|---|---|---|---|---|
| FL-DOE-3 | Cy Governor | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=3 | \`${JSON.stringify(RAW_90630)}\` | Ruben A. Coto | ${T1} | ${T2} | — | — | — |

<!-- table:sites -->
| candidate_id | race_id | race_status | result | read_1 | read_2 | action | evidence |
|---|---|---|---|---|---|---|---|
| FL-DOE-3 | FL-GOV-general | published | none found | ${T1} | ${T2} | none | "domain parked" |
| FL-VF-ORA-4 | FL-ORA-SBCHAIR-general | listed | https://diboard.example/ | ${T1} | ${T2} | write now | "Di Board for School Board Chair" |
`;

const miniProblems = checkWorksheet(MINI_MD, MINI);
check("a complete made-up worksheet passes every rule", miniProblems.length === 0, miniProblems.join("; "));

/** Replace one exact line fragment and expect a problem mentioning `want`. */
function mutation(name: string, from: string, to: string, want: string) {
  if (!MINI_MD.includes(from)) {
    check(`mutation fixture: ${name}`, false, `fragment not found: ${from}`);
    return;
  }
  const problems = checkWorksheet(MINI_MD.replace(from, to), MINI);
  check(`caught: ${name}`, problems.some((p) => p.includes(want)), problems.join("; ") || "no problem raised");
}
mutation("a Yes with no second page", "| https://member.house.gov/ |", "| — |", "a Yes needs a second, different official page");
mutation(
  "a source that is not official (Ballotpedia)",
  `| FL-DOE-2 | Bo O'Neal | FL-20-general | Member of the U.S. House now | No | No | ${CLERK} |`,
  `| FL-DOE-2 | Bo O'Neal | FL-20-general | Member of the U.S. House now | No | No | https://ballotpedia.org/x |`,
  "is not an official https page",
);
mutation(
  "two reads less than an hour apart",
  `| ${CLERK} | ${T1} | ${T2} | https://member.house.gov/ |`,
  `| ${CLERK} | ${T1} | 2026-10-09T13:30Z | https://member.house.gov/ |`,
  "at least an hour apart",
);
mutation(
  "evidence longer than 15 words",
  '"FL25 Ann Member"',
  '"one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen"',
  "evidence must be",
);
mutation("is_open_seat that disagrees with incumbent_id", "| FL-20-general | FL-DOE-1 | false |", "| FL-20-general | FL-DOE-1 | true |", "is_open_seat must be true exactly");
mutation(
  "two members in one race: incumbent_id must be the one holding this seat",
  "| FL-HIL-SB6-general | FL-VF-HIL-5 | false |",
  "| FL-HIL-SB6-general | FL-VF-HIL-6 | false |",
  "incumbent_id must be FL-VF-HIL-5",
);
mutation(
  "holds this seat without being an incumbent",
  `| Member of the Hillsborough County School Board now | Yes | Yes |`,
  `| Member of the Hillsborough County School Board now | No | Yes |`,
  "holds this seat but is not an incumbent",
);
mutation(
  "a site found in a published race is not written now (D11)",
  "| published | none found | " + T1 + " | " + T2 + " | none |",
  "| published | https://cygov.example/ | " + T1 + " | " + T2 + " | write now |",
  "held until after Nov 3",
);
mutation(
  "a site result that is neither a find, 'none found' nor 'withheld'",
  "| published | none found |",
  "| published | maybe later |",
  "result must be 'none found', 'withheld'",
);
mutation("a stored running mate that is not D6 of the raw string", "| Ruben A. Coto |", "| Ruben  A. Coto |", "stored must be normalizeDoeText");
mutation("a missing candidate row", "| FL-VF-HIL-6 | Flo Two |", "| FL-VF-HIL-7 | Flo Two |", "candidates: missing FL-VF-HIL-6");
mutation("the Governor race is not open (spec §3.4)", "| FL-GOV-general | NULL | true |", "| FL-GOV-general | FL-DOE-3 | false |", "FL-GOV-general");
{
  /* The same contradiction with the candidate row agreeing, so only the
     spec-assertion rule can catch it. */
  const govRow = `| Holds this office now | No | No | https://www.flgov.com/eog/ | ${T1} | ${T2} | — |`;
  const md = MINI_MD.replace(
    govRow,
    `| Holds this office now | Yes | Yes | https://www.flgov.com/eog/ | ${T1} | ${T2} | https://www.flgov.com/governor/ |`,
  ).replace("| FL-GOV-general | NULL | true |", "| FL-GOV-general | FL-DOE-3 | false |");
  const problems = checkWorksheet(md, MINI);
  check(
    "caught: reads that contradict the spec's assertions (§3.4) go to the founder",
    MINI_MD.includes(govRow) && problems.length === 1 && problems[0].includes("the spec's assertion"),
    problems.join("; "),
  );
}

const blocks = generatedBlocks(MINI_MD, MINI, "membership");
check(
  "generated candidates: every row, names escaped, the first read's date, fec_id only where matched",
  blocks.candidates.length === 6 &&
    blocks.candidates[0] === "    ('FL-DOE-1', 'Ann Member', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-09T00:00:00Z', 'H0FL00000')," &&
    blocks.candidates[1] === "    ('FL-DOE-2', 'Bo O''Neal', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-09T00:00:00Z', NULL)," &&
    blocks.candidates[5].endsWith("NULL)"),
  blocks.candidates.join("\n"),
);
check(
  "generated race overrides: only a race with two or more incumbents, naming the seat holder",
  blocks.race_overrides.join("\n") === "    ,('FL-HIL-SB6-general', 'FL-VF-HIL-5')",
  blocks.race_overrides.join("\n"),
);
check(
  "generated tickets and listed-race sites",
  blocks.tickets.join("\n") ===
    "    ('FL-DOE-3', 'Cy Governor', 'Ruben A. Coto', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=3', '2026-10-09T00:00:00Z')" &&
    blocks.sites.join("\n") === "    ,('FL-VF-ORA-4', 'Di Board', 'https://diboard.example/', '2026-10-09T00:00:00Z')",
);
check(
  "generated totals: incumbents counted, sited = 97 + listed-race finds, the D1 rule named",
  blocks.totals.join("\n").includes("D1 rule: membership (Recommended)") &&
    blocks.totals.includes("  n_incumbents_expected CONSTANT int := 4;") &&
    blocks.totals.includes("  n_sited_expected      CONSTANT int := 98;"),
  blocks.totals.join("\n"),
);
const seatBlocks = generatedBlocks(MINI_MD, MINI, "seat");
check(
  "D1 TO FLIP (--d1 seat): only seat holders are incumbents, so no race needs an override",
  seatBlocks.candidates.filter((l) => l.includes(", true, ")).length === 1 &&
    seatBlocks.race_overrides.length === 0 &&
    seatBlocks.totals.includes("  n_incumbents_expected CONSTANT int := 1;"),
);

const TEMPLATE = [
  "x",
  "    -- BEGIN generated: candidates",
  "    stale",
  "    -- END generated: candidates",
  "    ('__none__', NULL::text)",
  "    -- BEGIN generated: race_overrides",
  "    -- END generated: race_overrides",
  "    -- BEGIN generated: tickets",
  "    -- END generated: tickets",
  "    -- BEGIN generated: sites",
  "    -- END generated: sites",
  "  -- BEGIN generated: totals",
  "  -- END generated: totals",
  "",
].join("\n");
const once = applyBlocks(TEMPLATE, blocks);
check(
  "applyBlocks replaces each block between its markers and is idempotent",
  !once.includes("stale") && once.includes("'Bo O''Neal'") && applyBlocks(once, blocks) === once,
);
check("ruleOf reads the D1 rule back from the SQL", ruleOf(once) === "membership" && ruleOf(applyBlocks(TEMPLATE, seatBlocks)) === "seat");
check("applyBlocks refuses SQL without the markers", throws(() => applyBlocks("SELECT 1;", blocks)));

const roundA = {
  "house-clerk": { key: "house-clerk", url: CLERK, readAt: "2026-10-09T13:00:41.123Z", ok: true },
  "fec-h-08": { key: "fec-h-08", url: "https://api.open.fec.gov/v1/candidates/?district=08", readAt: "2026-10-09T13:02:05.000Z", ok: true },
  "fec-s": { key: "fec-s", url: "https://api.open.fec.gov/v1/candidates/?office=S", readAt: "2026-10-09T13:03:00.000Z", ok: true },
  "atg-home": { key: "atg-home", url: "https://www.myfloridalegal.com/", readAt: "2026-10-09T13:04:00.000Z", ok: false },
};
const roundB = {
  "house-clerk": { key: "house-clerk", url: CLERK, readAt: "2026-10-09T14:31:09.000Z", ok: true },
  "fec-h-08": { key: "fec-h-08", url: "https://api.open.fec.gov/v1/candidates/?district=08", readAt: "2026-10-09T14:32:00.000Z", ok: true },
  "fec-s": { key: "fec-s", url: "https://api.open.fec.gov/v1/candidates/?office=S", readAt: "2026-10-09T14:33:00.000Z", ok: true },
  "atg-home": { key: "atg-home", url: "https://www.myfloridalegal.com/", readAt: "2026-10-09T14:34:00.000Z", ok: true },
};
const tm = timesFromRounds(roundA, roundB);
check(
  "read times: by URL, FEC keys by race, minutes in UTC, a key missed in either round left out",
  tm.get(CLERK)?.join(" ") === "2026-10-09T13:00Z 2026-10-09T14:31Z" &&
    tm.get("fec:FL-8-general")?.join(" ") === "2026-10-09T13:02Z 2026-10-09T14:32Z" &&
    tm.get("fec:FL-SEN-general")?.join(" ") === "2026-10-09T13:03Z 2026-10-09T14:33Z" &&
    !tm.has("https://www.myfloridalegal.com/"),
  JSON.stringify([...tm]),
);
const blankTimes = MINI_MD.split(T1).join("").split(T2).join("");
const filled = fillTimes(
  blankTimes,
  new Map<string, readonly [string, string]>([
    [CLERK, [T1, T2]],
    ["https://www.flgov.com/eog/", [T1, T2]],
    ["https://www.ocps.net/school-board", [T1, T2]],
    [HIL, [T1, T2]],
    ["https://dos.elections.myflorida.com/candidates/canDetail.asp?account=3", [T1, T2]],
    ["https://diboard.example/", [T1, T2]],
    ["fec:FL-20-general", [T1, T2]],
  ]),
);
const afterFill = checkWorksheet(filled, MINI);
check(
  "fillTimes fills every row whose page was read in both rounds, and leaves a row with no URL alone",
  afterFill.length === 1 && afterFill[0].startsWith("sites FL-DOE-3: read_1/read_2"),
  afterFill.join("; "),
);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nroster worksheet: all checks passed");
