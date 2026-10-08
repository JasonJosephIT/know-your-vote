/* Guardrail for R2's logistics checks (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.6, §6):
   src/lib/logistics-check.ts, loadBallotRoster's pure half, and the CLI's
   refusals before any database read. Offline: the VoterFocus pages are saved
   fixtures (scripts/fixtures/logistics/, fetched 2026-10-08), the DoE
   extract is built here in its real column layout, and the database rows are
   the live values read on 2026-10-08.

   Run: node scripts/verify-logistics-check.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBallotRoster } from "../src/lib/news-intake.ts";
import {
  DOE_STATUS,
  VOTERFOCUS_STATUS,
  doeOfficeGroup,
  doeRaceId,
  matchVoterFocus,
  parseDoeExtract,
  parseVoterFocus,
} from "../src/lib/logistics-check.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}
/* ---- loadBallotRoster's pure half ---------------------------------------- */

const built = buildBallotRoster(
  [
    { race_id: "FL-ORA-CC2-general", status: "published" },
    { race_id: "FL-BRO-CC2-general", status: "listed" },
    { race_id: "FL-HIL-CC9-general", status: "draft" },
    { race_id: "FL-10-general", status: "published" },
  ],
  [
    { race_id: "FL-ORA-CC2-general", office: "Orange County Commission, District 2", level: "county", district: "ORA-CC-2", candidate_ids: ["FL-VF-ORA-1290", "FL-VF-ORA-1384", "FL-VF-ORA-0000"] },
    { race_id: "FL-BRO-CC2-general", office: "Broward County Commission, District 2", level: "county", district: "BRO-CC-2", candidate_ids: ["FL-VF-BRO-1179"] },
    { race_id: "FL-HIL-CC9-general", office: "Draft race", level: "county", district: "HIL-CC-9", candidate_ids: ["FL-VF-HIL-1"] },
    { race_id: "FL-10-general", office: "U.S. House, District 10", level: "federal", district: "FL-10", candidate_ids: ["FL-DOE-70001"] },
  ],
  [
    { candidate_id: "FL-VF-ORA-1290", legal_name: "Kamia Brown", qualifying_status: "qualified", official_site: "https://a.example", ballot_status: "ballot" },
    { candidate_id: "FL-VF-ORA-1384", legal_name: "Mike Crabb", qualifying_status: "qualified", official_site: null, ballot_status: "ballot" },
    { candidate_id: "FL-VF-ORA-0000", legal_name: "Write In", qualifying_status: "qualified", official_site: null, ballot_status: "write_in" },
    { candidate_id: "FL-VF-BRO-1179", legal_name: "Mark D. Bogen", qualifying_status: "unopposed", official_site: null, ballot_status: "ballot" },
    { candidate_id: "FL-VF-HIL-1", legal_name: "Draft Person", qualifying_status: "qualified", official_site: null, ballot_status: "ballot" },
    { candidate_id: "FL-DOE-70001", legal_name: "Maxwell Frost", qualifying_status: "unopposed", official_site: null, ballot_status: "ballot" },
  ],
);
check("published and listed races, ballot-tier candidates only, in stored order",
  built.map((c) => c.candidateId).join(",") === "FL-DOE-70001,FL-VF-BRO-1179,FL-VF-ORA-1290,FL-VF-ORA-1384", built.map((c) => c.candidateId).join(","));
check("a listed race's candidate is in, marked listed", built.find((c) => c.candidateId === "FL-VF-BRO-1179")?.publication === "listed");
check("county races carry their county; a federal race has none",
  built.find((c) => c.candidateId === "FL-VF-ORA-1290")?.countyFips === "12095" && built.find((c) => c.candidateId === "FL-DOE-70001")?.countyFips === null);
check("the roster carries no party", built.every((c) => !("party" in c)));
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIX = path.join(ROOT, "scripts", "fixtures", "logistics");

/* ---- the DoE status map equals intake.py's _STATUS --------------------- */

const intakePy = readFileSync(
  path.join(ROOT, "Civic Awareness (Know Your Vote)", "toollayer", "cap_toollayer", "intake.py"),
  "utf8",
);
const pyBlock = intakePy.match(/^_STATUS = \{([\s\S]*?)\}/m)?.[1] ?? "";
const pyStatus = Object.fromEntries([...pyBlock.matchAll(/"([A-Z]{3})":\s*"([a-z_]+)"/g)].map((m) => [m[1], m[2]]));
check("intake.py's _STATUS was found and read", Object.keys(pyStatus).length >= 8, pyBlock);
check("DOE_STATUS equals intake.py's _STATUS", JSON.stringify(Object.entries(DOE_STATUS).sort()) === JSON.stringify(Object.entries(pyStatus).sort()),
  `${JSON.stringify(DOE_STATUS)} vs ${JSON.stringify(pyStatus)}`);

/* ---- the DoE extract: statuses, and nothing personal ------------------- */

const DOE_HEADER =
  "AcctNum\tVoterID\tElectionID\tOfficeCode\tOfficeDesc\tJuris1num\tJuris2num\tStatusCode\tStatusDesc\tPartyCode\tPartyDesc\t" +
  "NameLast\tNameFirst\tNameMiddle\tSuppressAddress\tAddr1\tAddr2\tCity\tState\tZip\tCounty\tPhone\tTrsNameLast\tTrsNameFirst\tTrsNameMiddle\tEmail";
const PII = ["secret@example.com", "5615551212", "123 Private Way", "Treasurer-Lastname"];
const doeRow = (acct: string, office: string, juris: string, status: string, last: string, first: string) =>
  [acct, "0", "20261103-GEN", office, "desc", juris, "", status, "status", "REP", "Republican", last, first, "",
    "N", PII[2], "", "Tallahassee", "FL", "32301", "Leon", PII[1], PII[3], "Pat", "", PII[0]].join("\t");
const doeText = [
  DOE_HEADER,
  doeRow("89042", "GOV", "", "QUA", "Donalds", "Byron"),
  doeRow("70001", "USR", "010", "UNO", "Frost", "Maxwell"),
  doeRow("70002", "USR", "012", "WIT", "Someone", "Else"),
  doeRow("70003", "ATG", "", "ZZZ", "Code", "Unknown"),
  doeRow("70004", "SOS", "", "QUA", "Other", "Office"),
].join("\r\n") + "\r\n";
const doeRows = parseDoeExtract(doeText);
check("the extract parses, CRLF and all", doeRows !== null && doeRows.length === 5, JSON.stringify(doeRows));
check("each parsed row has exactly AcctNum, office, district and status",
  (doeRows ?? []).every((r) => Object.keys(r).sort().join(",") === "acctNum,juris,officeCode,statusCode"));
check("no address, phone, email or treasurer survives the parse",
  PII.every((p) => !JSON.stringify(doeRows).includes(p)), JSON.stringify(doeRows));
check("an HTML page is not the extract", parseDoeExtract("<html><title>Just a moment...</title></html>") === null);
check("doeRaceId: GOV, USR 010, SOS",
  doeRaceId("GOV", "") === "FL-GOV-general" && doeRaceId("USR", "010") === "FL-10-general" && doeRaceId("SOS", "") === null);
check("doeOfficeGroup: federal FED, state CAB, county none",
  doeOfficeGroup("federal") === "FED" && doeOfficeGroup("state") === "CAB" && doeOfficeGroup("county") === null);

/* ---- VoterFocus: the saved pages parse ---------------------------------- */

const orangeHtml = readFileSync(path.join(FIX, "voterfocus-orange-2026-10-08.html"), "utf8");
const dadeHtml = readFileSync(path.join(FIX, "voterfocus-miamidade-2026-10-08.html"), "utf8");
const orange = parseVoterFocus(orangeHtml);
const dade = parseVoterFocus(dadeHtml);
const rowsIn = (html: string) => (html.match(/<div class="col-xs-12 detailrow candidate/g) ?? []).length;
check("every Orange row parses (112 on 2026-10-08)", orange.length === rowsIn(orangeHtml) && orange.length === 112, String(orange.length));
check("every Miami-Dade row parses (133 on 2026-10-08)", dade.length === rowsIn(dadeHtml) && dade.length === 133, String(dade.length));
check("every row has a ca= id, a name, an office and a label",
  [...orange, ...dade].every((r) => r.ca && r.name && r.office && r.label));
const tiffany = orange.find((r) => r.ca === "1236");
check("Orange's ca=1236 is Tiffany Moore Russell, County Mayor, Runoff",
  tiffany?.name === "Tiffany Moore Russell" && tiffany.office === "County Mayor" && tiffany.label === "Runoff", JSON.stringify(tiffany));
check('an "(Inactive-…)" row reads its last label (Miami-Dade: 97 Unopposed, 30 of them Inactive)',
  dade.filter((r) => r.label === "Unopposed").length === 97);
const orangeLabels = new Set(orange.map((r) => r.label));
check("Orange shows every mapped label and Qualified Write-In",
  [...Object.keys(VOTERFOCUS_STATUS), "Qualified Write-In"].every((l) => orangeLabels.has(l)), [...orangeLabels].join(", "));
check("the label map is the spec's table", JSON.stringify(VOTERFOCUS_STATUS) === JSON.stringify({
  Qualified: "qualified", Runoff: "qualified", Unopposed: "unopposed", Elected: "elected_in_primary",
  Withdrawn: "withdrawn", Defeated: "withdrawn", "Did not qualify": "withdrawn",
}));
check("a page with no list parses to no rows", parseVoterFocus("<html><body>Maintenance</body></html>").length === 0);

/* Name matching: party suffixes, nicknames and spacing fold; ca= breaks a tie. */
check("'Marleine Bastien (NOP)' matches the roster's 'Marleine Bastien'",
  matchVoterFocus({ candidateId: "FL-VF-DAD-2964", legalName: "Marleine Bastien" }, dade).kind === "match");
const twins = [
  { ca: "1", name: "Pat Lee", office: "A", label: "Qualified" },
  { ca: "2", name: "Pat Lee (DEM)", office: "B", label: "Withdrawn" },
];
const twin = matchVoterFocus({ candidateId: "FL-VF-ORA-2", legalName: "Pat Lee" }, twins);
check("two rows with one name: the ca= id picks the row", twin.kind === "match" && twin.row.ca === "2", JSON.stringify(twin));
check("two rows with one name and no ca= match: ambiguous",
  matchVoterFocus({ candidateId: "FL-VF-ORA-9", legalName: "Pat Lee" }, twins).kind === "ambiguous");
if (failures > 0) {
  console.error(`\n${failures} logistics-check check(s) failed`);
  process.exit(1);
}
console.log("All logistics-check checks passed.");
