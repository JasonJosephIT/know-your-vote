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
import { buildBallotRoster, type BallotRosterCandidate } from "../src/lib/news-intake.ts";
import {
  DOE_STATUS,
  MAX_DATE_OBSERVATIONS,
  VOTERFOCUS_STATUS,
  buildCheck,
  classifySite,
  dateSourceAllowed,
  doeOfficeGroup,
  doeRaceId,
  electionEventKey,
  gatedDiffKey,
  looksParked,
  matchVoterFocus,
  parseDoeExtract,
  parseObservations,
  parseVoterFocus,
  planR2Queue,
  reviewItemKey,
  robotsText,
  runningMateOnPage,
  type CheckInput,
  type ElectionEventRow,
  type Observations,
  type R2Diff,
} from "../src/lib/logistics-check.ts";
import { ReviewItemContentSchema } from "../src/types/admin.ts";

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
/* ---- sites ----------------------------------------------------------------- */

const site = "https://www.example-campaign.com/";
check("a 200 on the same site is live", classifySite(site, { status: 200, finalUrl: "https://example-campaign.com/", body: "<html><title>Vote</title></html>" }).outcome === "live");
check("a Cloudflare interstitial is a challenge, even on 403",
  classifySite(site, { status: 403, finalUrl: site, body: "<html><head><title>Just a moment...</title></head></html>" }).outcome === "challenge");
check("SiteGround's robot challenge is a challenge",
  classifySite(site, { status: 202, finalUrl: site, body: '<meta http-equiv="refresh" content="0;/.well-known/sgcaptcha/?r=%2F">' }).outcome === "challenge");
check("a for-sale page is parked, even on another host",
  classifySite(site, { status: 200, finalUrl: "https://www.hugedomains.com/domain_profile.cfm?d=example-campaign.com", body: "<title>example-campaign.com is for sale</title>" }).outcome === "parked");
check("GoDaddy's lander is parked", looksParked("<p>This domain is registered, but may still be available.</p>"));
check("a campaign page that says 'sale' in passing is not parked", !looksParked("<title>Smith for Mayor</title><p>Yard signs are for sale at the office</p>"));
check("a redirect to another site is moved",
  classifySite(site, { status: 200, finalUrl: "https://unrelated-casino.example/", body: "<title>Win big</title>" }).outcome === "moved");
check("a 404 or no response is dead",
  classifySite(site, { status: 404, finalUrl: site, body: "Not found" }).outcome === "dead" && classifySite(site, null).outcome === "dead");
check("robots.txt: a 404 is no rules and no note", JSON.stringify(robotsText({ status: 404, finalUrl: "", body: "" })) === JSON.stringify({ text: "", note: null }));
check("robots.txt: a 500 or an HTML page is no rules, noted",
  robotsText({ status: 500, finalUrl: "", body: "" }).note !== null && robotsText({ status: 200, finalUrl: "", body: "<html></html>" }).note !== null);
check("robots.txt: a text file is read", robotsText({ status: 200, finalUrl: "", body: "User-agent: *\nDisallow: /x" }).text.includes("Disallow"));

/* ---- running mates: the DoE page reader ------------------------------------ */

const canDetail = '<br>\n                    Running Mate: Bryan&nbsp;\n\t\t    Avila                     </td>';
check("the DoE page's running mate reads as the roster worksheet reads it", runningMateOnPage(canDetail) === "Bryan Avila", String(runningMateOnPage(canDetail)));
check("no Running Mate field is null; markup in it is unreadable",
  runningMateOnPage("<td>Status: Qualified</td>") === null && runningMateOnPage("Running Mate: <b>X</b></td>") === undefined);
const NOW = new Date("2026-10-12T12:00:00.000Z");

/* ---- the database as it was on 2026-10-08 (Orange and Miami-Dade) ------- */

const vf = (raceId: string, district: string, county: string, id: string, name: string, status: string): BallotRosterCandidate => ({
  candidateId: id, legalName: name, raceId, office: "office", level: "county", district, countyFips: county,
  publication: "published", qualifyingStatus: status, officialSite: null,
});
const ORA = "12095";
const DAD = "12086";
const COUNTY_ROSTER: BallotRosterCandidate[] = [
  vf("FL-DAD-CC2-general", "DAD-CC-2", DAD, "FL-VF-DAD-2964", "Marleine Bastien", "elected_in_primary"),
  vf("FL-DAD-CC5-general", "DAD-CC-5", DAD, "FL-VF-DAD-2949", "Vicki L. Lopez", "qualified"),
  vf("FL-DAD-CC5-general", "DAD-CC-5", DAD, "FL-VF-DAD-2998", "Rob Piper", "qualified"),
  vf("FL-DAD-SB1-general", "DAD-SB-1", DAD, "FL-VF-DAD-3070", "Katrina Wilson", "qualified"),
  vf("FL-DAD-SB1-general", "DAD-SB-1", DAD, "FL-VF-DAD-3076", "Linda Cothiere", "qualified"),
  vf("FL-DAD-SB2-general", "DAD-SB-2", DAD, "FL-VF-DAD-2926", "Dorothy Bendross-Mindingall", "unopposed"),
  vf("FL-DAD-SB8-general", "DAD-SB-8", DAD, "FL-VF-DAD-2953", "Monica Colucci", "elected_in_primary"),
  vf("FL-ORA-CC2-general", "ORA-CC-2", ORA, "FL-VF-ORA-1290", "Kamia Brown", "qualified"),
  vf("FL-ORA-CC2-general", "ORA-CC-2", ORA, "FL-VF-ORA-1384", "Mike Crabb", "qualified"),
  vf("FL-ORA-CC4-general", "ORA-CC-4", ORA, "FL-VF-ORA-1260", "Brian Jones", "qualified"),
  vf("FL-ORA-CC4-general", "ORA-CC-4", ORA, "FL-VF-ORA-1279", "Johanna Lopez", "qualified"),
  vf("FL-ORA-CC6-general", "ORA-CC-6", ORA, "FL-VF-ORA-1265", 'Michael "Mike" Scott', "qualified"),
  vf("FL-ORA-CC6-general", "ORA-CC-6", ORA, "FL-VF-ORA-1295", "Lawanna Gelzer", "qualified"),
  vf("FL-ORA-CC7-general", "ORA-CC-7", ORA, "FL-VF-ORA-1271", "Vicki Vargo", "qualified"),
  vf("FL-ORA-CC7-general", "ORA-CC-7", ORA, "FL-VF-ORA-1283", "Patricia Rumph", "qualified"),
  vf("FL-ORA-CC8-general", "ORA-CC-8", ORA, "FL-VF-ORA-1272", "Victor M. Torres Jr.", "qualified"),
  vf("FL-ORA-CC8-general", "ORA-CC-8", ORA, "FL-VF-ORA-1275", "Jeannette Quinones Hernandez", "qualified"),
  vf("FL-ORA-CLERK-general", "ORA-CLERK", ORA, "FL-VF-ORA-1364", "Terrell Thomas", "qualified"),
  vf("FL-ORA-CLERK-general", "ORA-CLERK", ORA, "FL-VF-ORA-1401", "Roberta Walton Johnson", "qualified"),
  vf("FL-ORA-MAYOR-general", "ORA-MAYOR", ORA, "FL-VF-ORA-1236", "Tiffany Moore Russell", "qualified"),
  vf("FL-ORA-MAYOR-general", "ORA-MAYOR", ORA, "FL-VF-ORA-1239", "Chris Messina", "qualified"),
  vf("FL-ORA-SB1-general", "ORA-SB-1", ORA, "FL-VF-ORA-1270", "Melissa Lopez Marantes", "elected_in_primary"),
  vf("FL-ORA-SB2-general", "ORA-SB-2", ORA, "FL-VF-ORA-1318", "Gloria Reina O'Neal", "elected_in_primary"),
  vf("FL-ORA-SB3-general", "ORA-SB-3", ORA, "FL-VF-ORA-1242", "Susanne Peña", "qualified"),
  vf("FL-ORA-SB3-general", "ORA-SB-3", ORA, "FL-VF-ORA-1314", "Diana Moore", "qualified"),
  vf("FL-ORA-SBCHAIR-general", "ORA-SBCHAIR", ORA, "FL-VF-ORA-1245", "Angie Gallo", "elected_in_primary"),
];
const doeCand = (raceId: string, level: string, id: string, name: string, status: string): BallotRosterCandidate => ({
  candidateId: id, legalName: name, raceId, office: "office", level, district: null, countyFips: null,
  publication: "published", qualifyingStatus: status, officialSite: null,
});
const DOE_ROSTER: BallotRosterCandidate[] = [
  doeCand("FL-GOV-general", "state", "FL-DOE-89042", "Byron Donalds", "qualified"),
  doeCand("FL-10-general", "federal", "FL-DOE-70001", "Maxwell Frost", "unopposed"),
];

/* The 14 general_2026 rows as they were on 2026-10-08. */
const EVENTS: ElectionEventRow[] = [
  ["ballot_return_deadline", null, "2026-11-03", "https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/"],
  ["early_voting_end", null, "2026-10-31", "https://dos.fl.gov/elections/for-voters/election-dates/"],
  ["early_voting_start", null, "2026-10-24", "https://dos.fl.gov/elections/for-voters/election-dates/"],
  ["election_day", null, "2026-11-03", "https://dos.fl.gov/elections/for-voters/election-dates/"],
  ["registration_deadline", null, "2026-10-05", "https://dos.fl.gov/elections/for-voters/election-dates/"],
  ["vbm_request_deadline", null, "2026-10-22", "https://dos.fl.gov/elections/for-voters/election-dates/"],
  ["early_voting_end", "12011", "2026-11-01", "https://browardvotes.gov/voters/early-voting-ballot-return"],
  ["early_voting_start", "12011", "2026-10-19", "https://browardvotes.gov/voters/early-voting-ballot-return"],
  ["early_voting_end", "12057", "2026-11-01", "https://www.votehillsborough.gov/EarlyVoting"],
  ["early_voting_start", "12057", "2026-10-19", "https://www.votehillsborough.gov/EarlyVoting"],
  ["early_voting_end", "12086", "2026-11-01", "https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf"],
  ["early_voting_start", "12086", "2026-10-19", "https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf"],
  ["early_voting_end", "12095", "2026-11-01", "https://voteorangefl.gov/vote-early/"],
  ["early_voting_start", "12095", "2026-10-19", "https://voteorangefl.gov/vote-early/"],
].map(([event_type, county_fips, event_date, details_url]) => ({
  election: "general_2026", event_type: event_type as string, county_fips, event_date: event_date as string, details_url: details_url as string,
}));
const observeAll = (): Observations => ({
  dates: EVENTS.map((e) => ({ election: e.election, event_type: e.event_type, county_fips: e.county_fips, official_date: e.event_date, source_url: e.details_url })),
  unreadable: [],
});

const base = (over: Partial<CheckInput> = {}): CheckInput => ({
  roster: [...COUNTY_ROSTER, ...DOE_ROSTER],
  events: EVENTS,
  observations: observeAll(),
  doe: { CAB: doeRows, FED: doeRows },
  voterFocus: { [DAD]: dade, [ORA]: orange },
  runningMates: { column: false, stored: {}, pages: {} },
  now: NOW,
  ...over,
});
const ok = (input: CheckInput) => {
  const r = buildCheck(input);
  if (!r.ok) throw new Error(`buildCheck refused: ${r.error}`);
  return r;
};

/* ---- statuses ------------------------------------------------------------ */

const clean = ok(base());
check("the saved pages against the stored statuses yield zero diffs",
  clean.diffs.length === 0, JSON.stringify(clean.diffs.slice(0, 3)));
check("every roster candidate's status was read (26 VoterFocus, 2 DoE)",
  clean.statuses.read === 28 && clean.statuses.voterFocus === 26 && clean.statuses.doe === 2, JSON.stringify(clean.statuses));
check("every race is confirmed when every candidate was read and agrees",
  clean.confirmedRaces.length === new Set([...COUNTY_ROSTER, ...DOE_ROSTER].map((c) => c.raceId)).size, clean.confirmedRaces.join(","));
check("the labels met are listed with counts", clean.labelsSeen["Qualified Write-In"] === 1 && clean.labelsSeen.Unopposed === 124,
  JSON.stringify(clean.labelsSeen));
check("the DoE codes met are listed", clean.doeCodesSeen.ZZZ === 2, JSON.stringify(clean.doeCodesSeen));
check("no address, phone, email or treasurer reaches the check output", PII.every((p) => !JSON.stringify(clean).includes(p)));
check("no party label reaches the check output", !/\((DEM|REP|NOP|NPA)\)/.test(JSON.stringify(clean)));

/** The page with one row's label replaced, the row found by its ca= id. */
function relabel(html: string, ca: string, label: string): string {
  const at = html.indexOf(`&ca=${ca}&`);
  if (at < 0) throw new Error(`no row ca=${ca}`);
  const end = html.indexOf('<div class="col-xs-12 detailrow candidate', at);
  const row = html.slice(at, end < 0 ? undefined : end);
  return html.slice(0, at) + row.replace(/(<span class='statustext[^']*'>)[^<]*(<\/span>\))/, `$1${label}$2`) + (end < 0 ? "" : html.slice(end));
}

/* One changed label: the page says Withdrawn where the database says qualified. */
const changedHtml = relabel(orangeHtml, "1236", "Withdrawn");
check("the fixture edit changed exactly one row", parseVoterFocus(changedHtml).filter((r) => r.label === "Withdrawn").length === 24);
const changed = ok(base({ voterFocus: { [DAD]: dade, [ORA]: parseVoterFocus(changedHtml) } }));
const tDiff = changed.diffs.find((d) => d.kind === "gated_diff");
check("one changed label yields one gated_diff",
  changed.diffs.length === 1 && tDiff?.kind === "gated_diff" && tDiff.payload.pk === "FL-VF-ORA-1236" &&
    tDiff.payload.table === "candidate" && tDiff.payload.field === "qualifying_status" && tDiff.payload.new === "withdrawn" &&
    tDiff.payload.old === "qualified" && tDiff.payload.source_url === "https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=orange",
  JSON.stringify(changed.diffs));
check("a race with a changed status is not confirmed", !changed.confirmedRaces.includes("FL-ORA-MAYOR-general"));
/* `old` is the database's value, whatever it is. */
const oldFromDb = ok(base({
  roster: [...COUNTY_ROSTER.map((c) => (c.candidateId === "FL-VF-ORA-1239" ? { ...c, qualifyingStatus: "unopposed" } : c)), ...DOE_ROSTER],
}));
const messina = oldFromDb.diffs[0];
check("old comes from the database fixture",
  oldFromDb.diffs.length === 1 && messina.kind === "gated_diff" && messina.payload.old === "unopposed" && messina.payload.new === "qualified",
  JSON.stringify(oldFromDb.diffs));

/* Qualified Write-In, and an unknown label: report lines, no diff. */
const writeIn = ok(base({ roster: [vf("FL-ORA-CC4-general", "ORA-CC-4", ORA, "FL-VF-ORA-1378", "Isabella Arthur", "qualified")] }));
check('"Qualified Write-In" yields a report line and no diff',
  writeIn.diffs.length === 0 && writeIn.report.some((l) => l.includes("Isabella Arthur") && l.includes("Qualified Write-In")), writeIn.report.join(" | "));
const unknownLabelHtml = relabel(orangeHtml, "1239", "Pending Review");
const unknownLabel = ok(base({ voterFocus: { [DAD]: dade, [ORA]: parseVoterFocus(unknownLabelHtml) } }));
check("an unknown label yields a report line and no diff",
  unknownLabel.diffs.length === 0 && unknownLabel.report.some((l) => l.includes("Chris Messina") && l.includes("Pending Review")),
  unknownLabel.report.join(" | "));
check("a candidate whose status was not read leaves the race unconfirmed", !unknownLabel.confirmedRaces.includes("FL-ORA-MAYOR-general"));
const missing = ok(base({ roster: [vf("FL-ORA-CC2-general", "ORA-CC-2", ORA, "FL-VF-ORA-9999", "Nobody Here", "qualified")] }));
check("a roster candidate missing from the list is a report line", missing.diffs.length === 0 &&
  missing.report.some((l) => l.includes("Nobody Here") && l.includes("not on Orange's VoterFocus list")));
const vfDown = ok(base({ voterFocus: { [DAD]: dade, [ORA]: null } }));
check("an unreadable VoterFocus list is a report line, and Miami-Dade is still compared",
  vfDown.report.some((l) => l.includes("Orange's VoterFocus list could not be read")) && vfDown.statuses.voterFocus === 7, JSON.stringify(vfDown.statuses));
const emptyPage = ok(base({ voterFocus: { [DAD]: dade, [ORA]: [] } }));
check("a page that parses to no rows is a report line", emptyPage.report.some((l) => l.includes("parsed to no rows")));

/* DoE: statuses and the cross-checks. */
const doeOdd = ok(base({ roster: [
  doeCand("FL-12-general", "federal", "FL-DOE-70002", "Someone Else", "qualified"),
  doeCand("FL-ATG-general", "state", "FL-DOE-70003", "Unknown Code", "qualified"),
  doeCand("FL-GOV-general", "state", "FL-DOE-70004", "Other Office", "qualified"),
  doeCand("FL-CFO-general", "state", "FL-DOE-99999", "Not Filed", "qualified"),
] }));
check("a DoE withdrawal yields a gated_diff citing the candidate's own DoE page",
  doeOdd.diffs.length === 1 && doeOdd.diffs[0].kind === "gated_diff" && doeOdd.diffs[0].payload.new === "withdrawn" &&
    doeOdd.diffs[0].payload.source_url === "https://dos.elections.myflorida.com/candidates/canDetail.asp?account=70002",
  JSON.stringify(doeOdd.diffs));
check("an unmapped DoE code, another office and a missing account are report lines, never diffs",
  doeOdd.report.some((l) => l.includes("Unknown Code") && l.includes("ZZZ")) &&
    doeOdd.report.some((l) => l.includes("Other Office") && l.includes("filed under")) &&
    doeOdd.report.some((l) => l.includes("Not Filed") && l.includes("not in the DoE CAB extract")),
  doeOdd.report.join(" | "));
const doeDown = ok(base({ doe: { CAB: null, FED: doeRows } }));
check("an unreadable DoE extract is a report line; the other group is still compared",
  doeDown.report.some((l) => l.includes("DoE CAB extract could not be read")) && doeDown.statuses.doe === 1);

/* ---- dates --------------------------------------------------------------- */

check("every date as stored: no diff, no date report line",
  clean.dates.observed === 14 && clean.dates.changed === 0 && !clean.report.some((l) => l.startsWith("date")), clean.report.join(" | "));
const moved = observeAll();
moved.dates[2] = { ...moved.dates[2], official_date: "2026-10-23" };
const movedR = ok(base({ observations: moved }));
const dm = movedR.diffs[0];
check("a moved date yields one election_event date_mismatch with the DB value from the row",
  movedR.diffs.length === 1 && dm.kind === "date_mismatch" && dm.payload.target === "election_event" &&
    dm.payload.event_type === "early_voting_start" && dm.payload.county_fips === null &&
    dm.payload.db_value === "2026-10-24" && dm.payload.official_value === "2026-10-23",
  JSON.stringify(movedR.diffs));
const refused = (obs: Observations) => buildCheck(base({ observations: obs }));
const withDate = (patch: Record<string, unknown>, i = 0): Observations => {
  const o = observeAll();
  o.dates[i] = { ...o.dates[i], ...patch } as Observations["dates"][number];
  return o;
};
const r1 = refused(withDate({ source_url: "https://example.com/dates" }, 7));
check("a date from a host that is neither the row's details_url nor its Supervisor host refuses the run",
  !r1.ok && r1.error.includes("dates[7]"), JSON.stringify(r1));
const r2 = refused(withDate({ source_url: "https://www.browardvotes.gov/voters/early-voting" }, 7));
check("Broward's Supervisor host (with www.) is allowed for a Broward row", r2.ok, JSON.stringify(r2));
const r3 = refused(withDate({ source_url: "https://www.miamidade.gov/global/release.page" }, 11));
check("another miamidade.gov page is not Miami-Dade's Supervisor host", !r3.ok);
const r4 = refused(withDate({ source_url: "https://dos.elections.myflorida.com/calendar" }, 1));
check("a statewide row may cite only dos.fl.gov", !r4.ok);
check("a statewide row may cite another dos.fl.gov page", refused(withDate({ source_url: "https://dos.fl.gov/elections/for-voters/" }, 1)).ok);
const r5 = refused(withDate({ event_type: "canvass_deadline" }));
check("an unknown (election, event_type, county) refuses the run", !r5.ok && r5.error.includes("no election_event row"), JSON.stringify(r5));
const r6 = refused(withDate({ election: "primary_2026" }));
check("a primary_2026 row is unknown to R2", !r6.ok);
const twice = observeAll();
twice.dates.push(twice.dates[0]);
check("one row observed twice refuses the run", !refused(twice).ok);
check("dateSourceAllowed takes the row's own details_url",
  dateSourceAllowed(EVENTS[10].details_url, EVENTS[10]) && !dateSourceAllowed("https://voteorangefl.gov/x", EVENTS[10]));

/* Shape refusals, before any database read. */
const shape = (raw: unknown) => parseObservations(raw);
check("observations must be { dates, unreadable }", !shape([]).ok && !shape({ dates: [] }).ok && !shape({ dates: [], unreadable: [], extra: 1 }).ok);
check("a date not in YYYY-MM-DD refuses", !shape({ dates: [{ ...observeAll().dates[0], official_date: "Oct 24, 2026" }], unreadable: [] }).ok);
check("an impossible calendar date refuses", !shape({ dates: [{ ...observeAll().dates[0], official_date: "2026-02-30" }], unreadable: [] }).ok);
check("a non-http source refuses", !shape({ dates: [{ ...observeAll().dates[0], source_url: "javascript:alert(1)" }], unreadable: [] }).ok);
check("an unknown key in a date refuses", !shape({ dates: [{ ...observeAll().dates[0], note: "x" }], unreadable: [] }).ok);
check(`more than ${MAX_DATE_OBSERVATIONS} observations refuse`,
  !shape({ dates: Array.from({ length: MAX_DATE_OBSERVATIONS + 1 }, () => observeAll().dates[0]), unreadable: [] }).ok);
check("the full set of 14 parses", shape(observeAll()).ok);

/* An unreadable page: report lines, no diff; the county's other rows are still compared. */
const hillsUnread: Observations = {
  dates: observeAll().dates.filter((d) => d.county_fips !== "12057"),
  unreadable: [{ url: "https://www.votehillsborough.gov/EarlyVoting", reason: "Cloudflare check" }],
};
const unread = ok(base({ observations: hillsUnread }));
check("an unreadable page yields a report line and no diff",
  unread.diffs.length === 0 && unread.report.some((l) => l.includes("unreadable") && l.includes("votehillsborough")) &&
    !unread.report.some((l) => l.startsWith("date not observed")), unread.report.join(" | "));
const orangeHalf = withDate({ official_date: "2026-10-20" }, 13);
orangeHalf.dates.splice(12, 1);
orangeHalf.unreadable.push({ url: "https://voteorangefl.gov/vote-early/", reason: "only the start date was legible" });
const half = ok(base({ observations: orangeHalf }));
check("with its page marked unreadable, a county's other row is still compared",
  half.diffs.length === 1 && half.diffs[0].kind === "date_mismatch" && half.diffs[0].payload.county_fips === "12095", JSON.stringify(half.diffs));
const skipped = observeAll();
skipped.dates = skipped.dates.filter((d) => d.county_fips !== "12011");
const notRead = ok(base({ observations: skipped }));
check("a page neither read nor marked unreadable is named", notRead.report.some((l) => l === "date page not read: https://browardvotes.gov/voters/early-voting-ballot-return"),
  notRead.report.join(" | "));

/* ---- never proposed: key_dates, office, district -------------------------- */

const everything = ok(base({ observations: moved, voterFocus: { [DAD]: dade, [ORA]: parseVoterFocus(changedHtml) } }));
check("R2 proposes only candidate.qualifying_status and election_event dates",
  everything.diffs.every((d) => (d.kind === "gated_diff" ? d.payload.table === "candidate" && d.payload.field === "qualifying_status" : d.payload.target === "election_event")));
for (const field of ["key_dates", "office", "district"]) {
  const plan = planR2Queue([{ kind: "gated_diff", payload: { table: "race", pk: "FL-10-general", field, old: "a", new: "b", source_url: "https://dos.fl.gov/x", seen_at: NOW.toISOString() } }], new Set());
  check(`a race.${field} diff refuses the batch`, !plan.ok, JSON.stringify(plan));
}

/* ---- queue: schemas and dedupe -------------------------------------------- */

const queued = planR2Queue(everything.diffs, new Set());
check("the batch queues both diffs as pending agent:R2 rows",
  queued.ok && queued.rows.length === 2 && queued.rows.every((r) => r.source === "agent:R2" && r.status === "pending"), JSON.stringify(queued));
check("every queued row parses with its review-item schema",
  queued.ok && queued.rows.every((r) => ReviewItemContentSchema.safeParse({ kind: r.kind, payload: r.payload }).success));
const gd = everything.diffs.find((d) => d.kind === "gated_diff") as Extract<R2Diff, { kind: "gated_diff" }>;
const dmd = everything.diffs.find((d) => d.kind === "date_mismatch") as Extract<R2Diff, { kind: "date_mismatch" }>;
check("the gated_diff key is candidate|pk|qualifying_status|db|new",
  gatedDiffKey(gd.payload) === "candidate|FL-VF-ORA-1236|qualifying_status|qualified|withdrawn", gatedDiffKey(gd.payload));
check("the date key is election_event|election|type|scope|db|official",
  electionEventKey(dmd.payload) === "election_event|general_2026|early_voting_start|statewide|2026-10-24|2026-10-23", electionEventKey(dmd.payload));
const stored = new Set([reviewItemKey("gated_diff", gd.payload), reviewItemKey("date_mismatch", dmd.payload)].filter((k): k is string => k !== null));
const again = planR2Queue(everything.diffs, stored);
check("a key already present in any status is skipped", again.ok && again.rows.length === 0 && again.skipped.length === 2, JSON.stringify(again));
const later = planR2Queue([{ kind: "gated_diff", payload: { ...gd.payload, old: "unopposed" } }], stored);
check("the same change with a different database value is queued", later.ok && later.rows.length === 1, JSON.stringify(later));
check("a duplicate inside one batch is queued once", (() => {
  const p = planR2Queue([gd, gd], new Set());
  return p.ok && p.rows.length === 1 && p.skipped.length === 1;
})());
check("a race-form date_mismatch has no R2 key", reviewItemKey("date_mismatch", { race_id: "r", field: "key_dates", official_value: "x", source_url: "https://x.gov" }) === null);

/* ---- running mates: report lines only -------------------------------------- */

check("without the running_mate column, one report line says so", clean.report.filter((l) => l.startsWith("running mates: not compared")).length === 1);
const mates = ok(base({ runningMates: { column: true, stored: { "FL-DOE-89042": "Bryan Avila" }, pages: { "FL-DOE-89042": "Jay Collins" } } }));
check("a differing running mate is a report line, never a diff",
  mates.diffs.length === 0 && mates.report.some((l) => l.includes("Byron Donalds") && l.includes("Jay Collins")), mates.report.join(" | "));
const matesSame = ok(base({ runningMates: { column: true, stored: { "FL-DOE-89042": "Bryan Avila" }, pages: { "FL-DOE-89042": "Bryan Avila" } } }));
check("a matching running mate adds no line", !matesSame.report.some((l) => l.startsWith("running mate")));
if (failures > 0) {
  console.error(`\n${failures} logistics-check check(s) failed`);
  process.exit(1);
}
console.log("All logistics-check checks passed.");
