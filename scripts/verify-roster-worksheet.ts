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

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nroster worksheet: all checks passed");
