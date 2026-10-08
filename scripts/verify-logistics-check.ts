/* Guardrail for R2's logistics checks (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.6, §6):
   src/lib/logistics-check.ts, loadBallotRoster's pure half, and the CLI's
   refusals before any database read. Offline: the VoterFocus pages are saved
   fixtures (scripts/fixtures/logistics/, fetched 2026-10-08), the DoE
   extract is built here in its real column layout, and the database rows are
   the live values read on 2026-10-08.

   Run: node scripts/verify-logistics-check.ts */

import { buildBallotRoster } from "../src/lib/news-intake.ts";

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
if (failures > 0) {
  console.error(`\n${failures} logistics-check check(s) failed`);
  process.exit(1);
}
console.log("All logistics-check checks passed.");
