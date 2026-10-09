/* Guardrail for candidate order: every race lists its candidates in
   Florida's ballot order for the November general (src/lib/ballot-order.ts).

   The race page says "in ballot order" and the methodology page names the
   rule. Until 2026-10-05 the code sorted by position in race.candidate_ids,
   which the intake had filled sorted by candidate-ID string: 17 of the 25
   contested partisan races were out of ballot order and 11 listed the
   Democrat ahead of the Republican. On a site whose case is neutrality, that
   is the easiest thing to attack, so this pins:

     1. The statute. s. 101.151(3)(a): REP then DEM for 2026 (their parties
        came first and second in the 2022 governor's race); (3)(b): minor
        parties, then NPA, each in qualifying order, which comes from
        candidate_ids; s. 105.041(2): nonpartisan races alphabetical, by
        surname, with nicknames and Jr./III set aside.
     2. The 2026-10-05 production snapshot below, run through the code with
        migration 0044's arrays: the migration and the code agree on every
        race, 0044 touches exactly the races that were out of order, and
        never adds or drops a candidate.
     3. The Orange County composite sample ballot (Nov 3 2026, created
        2026-10-01): every race it shares with us comes out in its printed
        order.
     4. The wiring: every orderCandidates call in src/ goes through
        ballot-order.ts and is handed rows that carry `party`, the caches
        that hold candidate order were re-keyed, and the methodology copy
        states the rule rather than "ballot order, otherwise alphabetical".
        `party` is required by orderCandidates' type, so `npm run typecheck`
        is what fails a caller that drops it; check 4 catches a select that
        stops fetching it, which the type cannot see.

   Pure: no database, no build.
   Run: node scripts/verify-ballot-order.ts */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  isPartisanRace,
  officeRank,
  orderRaces,
  orderCandidates,
  partyRank,
  surnameOf,
  type BallotOrderCandidate,
} from "../src/lib/ballot-order.ts";

const ROOT = resolve(import.meta.dirname, "..");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

type Row = [candidate_id: string, party: string, legal_name: string];
const cand = ([
  candidate_id,
  party,
  legal_name,
]: Row): BallotOrderCandidate => ({
  candidate_id,
  party,
  legal_name,
});
const ids = (cs: ReadonlyArray<{ candidate_id: string }>) =>
  cs.map((c) => c.candidate_id);
const names = (cs: ReadonlyArray<{ legal_name: string }>) =>
  cs.map((c) => c.legal_name).join(" | ");
const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);
const reversed = <T>(xs: readonly T[]) => [...xs].reverse();

/* ---- 1. the statute ------------------------------------------------------ */

console.log("statute");

check("REP ranks 0, DEM 1", partyRank("REP") === 0 && partyRank("DEM") === 1);
check(
  "every other party code is a minor party (2)",
  ["LPF", "IND", "CPF", "GRE", "ECO", "other"].every((p) => partyRank(p) === 2)
);
check(
  "NPA, and no code at all in a partisan race, rank last (3)",
  ["NPA", "npa", "", null, undefined, "NOP"].every((p) => partyRank(p) === 3)
);
check(
  "a race is partisan when anyone carries a party code, NPA included",
  isPartisanRace([{ party: "NPA" }, { party: "DEM" }]) &&
    isPartisanRace([{ party: "NPA" }]) &&
    !isPartisanRace([{ party: "" }, { party: "NOP" }, { party: null }])
);

/* FL-GOV, scrambled: the input order means nothing, candidate_ids carries the
   official qualifying order for the five NPA candidates. */
const GOV_OFFICIAL: Row[] = [
  ["FL-DOE-89042", "REP", "Byron Donalds"],
  ["FL-DOE-89243", "DEM", "David Jolly"],
  ["FL-DOE-84076", "LPF", "Scott Eckhard Jewett"],
  ["FL-DOE-90630", "NPA", "Charles Burkett"],
  ["FL-DOE-89571", "NPA", "Frank J. Russo"],
  ["FL-DOE-88529", "NPA", 'Moliere "Moe" Dimanche'],
  ["FL-DOE-90433", "NPA", "Dean Ocean Abrams"],
  ["FL-DOE-89630", "NPA", 'Jeffrey Peter "Dr. Jeff" Datto'],
];
const govIds = GOV_OFFICIAL.map((r) => r[0]);
const govScrambled = [5, 2, 7, 0, 3, 6, 1, 4].map((i) => cand(GOV_OFFICIAL[i]));
const govOut = orderCandidates(govScrambled, govIds);
check(
  "FL-GOV: scrambled input comes out in the official order",
  same(ids(govOut), govIds),
  names(govOut)
);
check(
  "FL-GOV: the same with the input reversed",
  same(ids(orderCandidates(reversed(govScrambled), govIds)), govIds)
);
/* The party rule decides before candidate_ids: the old stored array (sorted
   by candidate ID) still yields REP, DEM, LPF first. */
const govOld = [...govIds].sort();
const govFromOld = ids(orderCandidates(govScrambled, govOld));
check(
  "FL-GOV: the old ID-sorted array still puts REP, DEM, LPF first",
  same(govFromOld.slice(0, 3), govIds.slice(0, 3)),
  govFromOld.join(", ")
);

/* One candidate per rank, stored minor-party first (FL-11 before 0044). */
const fl11: Row[] = [
  ["FL-DOE-88517", "LPF", "Ralph Groves"],
  ["FL-DOE-91715", "DEM", "James Pericola"],
  ["FL-DOE-91717", "REP", "Joe Strada"],
  ["FL-DOE-80000", "NPA", "Nora Noparty"],
];
check(
  "REP, DEM, LPF, NPA whatever the stored order",
  same(ids(orderCandidates(fl11.map(cand), ids(fl11.map(cand)))), [
    "FL-DOE-91717",
    "FL-DOE-91715",
    "FL-DOE-88517",
    "FL-DOE-80000",
  ])
);

/* A stored DEM-first array (FL-9 before 0044). */
const fl9: Row[] = [
  ["FL-DOE-89339", "DEM", "Darren Soto"],
  ["FL-DOE-91337", "REP", "Dan Green"],
];
check(
  "a DEM-first stored order comes out REP first",
  same(ids(orderCandidates(fl9.map(cand), ["FL-DOE-89339", "FL-DOE-91337"])), [
    "FL-DOE-91337",
    "FL-DOE-89339",
  ])
);
check(
  "an empty candidate_ids still orders by party",
  ids(orderCandidates(fl9.map(cand), []))[0] === "FL-DOE-91337"
);
/* No REP in the race (Orange Clerk): DEM first, NPA after. */
check(
  "no Republican running: the Democrat first, NPA after",
  same(
    ids(
      orderCandidates(
        [
          cand(["FL-VF-ORA-1364", "NPA", "Terrell Thomas"]),
          cand(["FL-VF-ORA-1401", "DEM", "Roberta Walton Johnson"]),
        ],
        ["FL-VF-ORA-1364", "FL-VF-ORA-1401"]
      )
    ),
    ["FL-VF-ORA-1401", "FL-VF-ORA-1364"]
  )
);
/* Two minor parties: qualifying order (candidate_ids), not the code's
   alphabet. */
const twoMinor: Row[] = [
  ["m1", "LPF", "Lee Libertarian"],
  ["m2", "GRE", "Gil Green"],
];
check(
  "two minor parties keep candidate_ids (qualifying) order",
  same(ids(orderCandidates(twoMinor.map(cand), ["m1", "m2"])), ["m1", "m2"]) &&
    same(ids(orderCandidates(twoMinor.map(cand), ["m2", "m1"])), ["m2", "m1"])
);
check(
  "a candidate missing from candidate_ids goes after those present in the rank",
  same(
    ids(orderCandidates(govScrambled, govIds.slice(0, 4))).slice(0, 4),
    govIds.slice(0, 4)
  )
);

/* Nonpartisan: surname, nicknames and suffixes set aside. */
check(
  "surnameOf sets aside suffixes and quoted nicknames",
  surnameOf("Victor M. Torres Jr.") === "Torres" &&
    surnameOf("Roberto Fernandez III") === "Fernandez" &&
    surnameOf("Oliver G. Gilbert III") === "Gilbert" &&
    surnameOf("John Smith, Sr.") === "Smith" &&
    surnameOf('Kenneth "Ken" Gay') === "Gay" &&
    surnameOf('Jeffrey Peter "Dr. Jeff" Datto') === "Datto" &&
    surnameOf("Michael \u201CMike\u201D Scott") === "Scott" &&
    surnameOf("Dorothy Bendross-Mindingall") === "Bendross-Mindingall" &&
    surnameOf("Gloria Reina O'Neal") === "O'Neal" &&
    surnameOf("Cher") === "Cher"
);
const nonpartisan: Row[] = [
  ["n1", "", "Victor M. Torres Jr."],
  ["n2", "", 'Kenneth "Ken" Gay'],
  ["n3", "NOP", "Roberto Fernandez III"],
  ["n4", "", "Susanne Peña"],
  ["n5", "", "Zack Green"],
  ["n6", "", "Adam Perez"],
  ["n7", "", "Jimm Middleton"],
  ["n8", "", "Diana Moore"],
];
const npOut = orderCandidates(nonpartisan.map(cand), [
  "n1",
  "n2",
  "n3",
  "n4",
  "n5",
  "n6",
  "n7",
  "n8",
]);
check(
  "nonpartisan: A to Z by surname, accents ignored, candidate_ids ignored",
  names(npOut) ===
    [
      "Roberto Fernandez III",
      'Kenneth "Ken" Gay',
      "Zack Green",
      "Jimm Middleton",
      "Diana Moore",
      "Susanne Peña",
      "Adam Perez",
      "Victor M. Torres Jr.",
    ].join(" | "),
  names(npOut)
);
check(
  "nonpartisan: by surname, not first name (Zack Green before Jimm Middleton)",
  ids(
    orderCandidates(
      [cand(["a", "", "Jimm Middleton"]), cand(["b", "", "Zack Green"])],
      ["a", "b"]
    )
  )[0] === "b"
);
check(
  "nonpartisan: same surname falls back to the full name",
  ids(
    orderCandidates(
      [cand(["a", "", "Quinnie Perez"]), cand(["b", "", "Ana Perez"])],
      []
    )
  )[0] === "b"
);

/* A subset (the directory's name search) keeps the race's relative order,
   and the output never depends on input order. */
const subset = govScrambled.filter(
  (c) => c.party === "NPA" || c.party === "DEM"
);
check(
  "a subset of a race keeps the race's relative order",
  same(
    ids(orderCandidates(subset, govIds)),
    govIds.filter((id) => ids(subset).includes(id))
  )
);
check(
  "the input is not mutated",
  same(
    ids(govScrambled),
    [5, 2, 7, 0, 3, 6, 1, 4].map((i) => GOV_OFFICIAL[i][0])
  )
);

/* ---- 2. production snapshot x migration 0044 ---------------------------- */

console.log("snapshot + 0044");

/* SELECT r.race_id, candidate_ids joined to candidate(party, legal_name),
   in stored order, every '%-general' race, production, 2026-10-05 ~22:00 UTC.
   Public record (DoE / county Supervisor candidate lists); no PII. */
const SNAPSHOT_2026_10_05: Record<string, Row[]> = {
  "FL-10-general": [["FL-DOE-89909", "DEM", "Maxwell Alejandro Frost"]],
  "FL-11-general": [
    ["FL-DOE-88517", "LPF", "Ralph Groves"],
    ["FL-DOE-91715", "DEM", "James Pericola"],
    ["FL-DOE-91717", "REP", "Joe Strada"],
  ],
  "FL-12-general": [
    ["FL-DOE-88868", "REP", "Gus Michael Bilirakis"],
    ["FL-DOE-89453", "DEM", "Kimberly Overman"],
    ["FL-DOE-89778", "NPA", "Branden Scrivener"],
  ],
  "FL-14-general": [
    ["FL-DOE-88870", "DEM", "Kathy Castor"],
    ["FL-DOE-91313", "REP", "Mike Beltran"],
    ["FL-DOE-92395", "LPF", "Brian Lambert"],
  ],
  "FL-15-general": [
    ["FL-DOE-89116", "DEM", "Robert People"],
    ["FL-DOE-89121", "REP", "Laurel Lee"],
  ],
  "FL-16-general": [
    ["FL-DOE-89623", "NPA", "Mark Davis"],
    ["FL-DOE-90251", "REP", "Sydney Gruters"],
    ["FL-DOE-90779", "DEM", "Kelly Kirschner"],
  ],
  "FL-20-general": [
    ["FL-DOE-90814", "IND", "Kedner Maxime"],
    ["FL-DOE-91278", "REP", "Brent Andersen"],
    ["FL-DOE-91577", "DEM", "Debbie Wasserman Schultz"],
  ],
  "FL-22-general": [
    ["FL-DOE-89301", "DEM", "Pia Dandiya"],
    ["FL-DOE-92109", "REP", "Casey Askar"],
  ],
  "FL-24-general": [
    ["FL-DOE-90703", "REP", "Te Mayonna Brown"],
    ["FL-DOE-91544", "DEM", "Oliver G. Gilbert III"],
  ],
  "FL-25-general": [
    ["FL-DOE-88911", "DEM", "Jared Moskowitz"],
    ["FL-DOE-89801", "REP", "Scott Singer"],
    ["FL-DOE-92357", "LPF", "Peter Jassenoff"],
  ],
  "FL-26-general": [
    ["FL-DOE-89980", "DEM", "Nicole Locklin"],
    ["FL-DOE-90330", "REP", "Mario Diaz-Balart"],
    ["FL-DOE-92137", "NPA", "Deborah Ann Meidinger Hosey"],
  ],
  "FL-27-general": [
    ["FL-DOE-89933", "DEM", "Eliott Rodriguez"],
    ["FL-DOE-90721", "REP", "Maria Elvira Salazar"],
  ],
  "FL-28-general": [
    ["FL-DOE-90340", "NPA", "Eddy Rojas"],
    ["FL-DOE-91226", "REP", "Carlos A. Gimenez"],
    ["FL-DOE-91699", "DEM", 'Phil "Felipe" Ehr'],
  ],
  "FL-7-general": [
    ["FL-DOE-90631", "DEM", "Bale Dalton"],
    ["FL-DOE-90696", "REP", "Ryan Elijah"],
    ["FL-DOE-92377", "LPF", "Christopher Dennison"],
  ],
  "FL-8-general": [
    ["FL-DOE-89522", "REP", "Mike Haridopolos"],
    ["FL-DOE-90831", "DEM", "Jennifer Jenkins"],
  ],
  "FL-9-general": [
    ["FL-DOE-89339", "DEM", "Darren Soto"],
    ["FL-DOE-91337", "REP", "Dan Green"],
  ],
  "FL-AGR-general": [
    ["FL-DOE-90560", "REP", "Wilton Simpson"],
    ["FL-DOE-92013", "DEM", "Joey Mendoza Atkins"],
  ],
  "FL-ATG-general": [
    ["FL-DOE-89041", "REP", "James Uthmeier"],
    ["FL-DOE-89231", "DEM", "Jose Javier Rodriguez"],
  ],
  "FL-BRO-CC2-general": [["FL-VF-BRO-1179", "DEM", "Mark D. Bogen"]],
  "FL-BRO-CC4-general": [["FL-VF-BRO-1178", "DEM", "Lamar Fisher"]],
  "FL-BRO-CC6-general": [["FL-VF-BRO-1041", "DEM", "Caryl Sandler Shuham"]],
  "FL-BRO-CC8-general": [["FL-VF-BRO-1182", "DEM", "Robert McKinzie"]],
  "FL-BRO-SB1-general": [["FL-VF-BRO-1194", "", "Maura McCarthy Bulman"]],
  "FL-BRO-SB4-general": [["FL-VF-BRO-1191", "", "Nicole Morst"]],
  "FL-BRO-SB6-general": [
    ["FL-VF-BRO-1184", "", "Adam Cervera"],
    ["FL-VF-BRO-1172", "", "Roberto Fernandez III"],
  ],
  "FL-BRO-SB7-general": [["FL-VF-BRO-1254", "", "Cynthia Alceus Dominique"]],
  "FL-BRO-SBAL8-general": [["FL-VF-BRO-1195", "", "Allen Zeman"]],
  "FL-CFO-general": [
    ["FL-DOE-89394", "REP", "Blaise Ingoglia"],
    ["FL-DOE-91310", "DEM", "Annette Taddeo"],
  ],
  "FL-DAD-CC2-general": [["FL-VF-DAD-2964", "NOP", "Marleine Bastien"]],
  "FL-DAD-CC5-general": [
    ["FL-VF-DAD-2949", "NOP", "Vicki L. Lopez"],
    ["FL-VF-DAD-2998", "NOP", "Rob Piper"],
  ],
  "FL-DAD-SB1-general": [
    ["FL-VF-DAD-3076", "NOP", "Linda Cothiere"],
    ["FL-VF-DAD-3070", "NOP", "Katrina Wilson"],
  ],
  "FL-DAD-SB2-general": [
    ["FL-VF-DAD-2926", "NOP", "Dorothy Bendross-Mindingall"],
  ],
  "FL-DAD-SB8-general": [["FL-VF-DAD-2953", "NOP", "Monica Colucci"]],
  "FL-GOV-general": [
    ["FL-DOE-84076", "LPF", "Scott Eckhard Jewett"],
    ["FL-DOE-88529", "NPA", 'Moliere "Moe" Dimanche'],
    ["FL-DOE-89042", "REP", "Byron Donalds"],
    ["FL-DOE-89243", "DEM", "David Jolly"],
    ["FL-DOE-89571", "NPA", "Frank J. Russo"],
    ["FL-DOE-89630", "NPA", 'Jeffrey Peter "Dr. Jeff" Datto'],
    ["FL-DOE-90433", "NPA", "Dean Ocean Abrams"],
    ["FL-DOE-90630", "NPA", "Charles Burkett"],
  ],
  "FL-HIL-CC1-general": [
    ["FL-VF-HIL-2640", "DEM", "Harry Cohen"],
    ["FL-VF-HIL-2880", "REP", "Jackie Toledo"],
  ],
  "FL-HIL-CC3-general": [
    ["FL-VF-HIL-2646", "REP", "Luiz F. F. Garcia"],
    ["FL-VF-HIL-2621", "DEM", "Gwen Myers"],
  ],
  "FL-HIL-CC5-general": [
    ["FL-VF-HIL-2661", "REP", "Stacy Hahn"],
    ["FL-VF-HIL-2636", "DEM", "Neil Manimala"],
  ],
  "FL-HIL-CC7-general": [
    ["FL-VF-HIL-2660", "DEM", "Aileen Rodriguez"],
    ["FL-VF-HIL-2620", "REP", "Joshua Wostal"],
  ],
  "FL-HIL-SB2-general": [
    ["FL-VF-HIL-2677", "", "Brittany Lyssy"],
    ["FL-VF-HIL-2675", "", "Daniela Simic"],
  ],
  "FL-HIL-SB4-general": [["FL-VF-HIL-2672", "", 'Patricia "Patti" Rendon']],
  "FL-HIL-SB6-general": [
    ["FL-VF-HIL-2610", "", 'Kenneth "Ken" Gay'],
    ["FL-VF-HIL-2645", "", "Karen Perez"],
  ],
  "FL-ORA-CC2-general": [
    ["FL-VF-ORA-1290", "", "Kamia Brown"],
    ["FL-VF-ORA-1384", "", "Mike Crabb"],
  ],
  "FL-ORA-CC4-general": [
    ["FL-VF-ORA-1260", "", "Brian Jones"],
    ["FL-VF-ORA-1279", "", "Johanna Lopez"],
  ],
  "FL-ORA-CC6-general": [
    ["FL-VF-ORA-1295", "", "Lawanna Gelzer"],
    ["FL-VF-ORA-1265", "", 'Michael "Mike" Scott'],
  ],
  "FL-ORA-CC7-general": [
    ["FL-VF-ORA-1283", "", "Patricia Rumph"],
    ["FL-VF-ORA-1271", "", "Vicki Vargo"],
  ],
  "FL-ORA-CC8-general": [
    ["FL-VF-ORA-1275", "", "Jeannette Quinones Hernandez"],
    ["FL-VF-ORA-1272", "", "Victor M. Torres Jr."],
  ],
  "FL-ORA-CLERK-general": [
    ["FL-VF-ORA-1364", "NPA", "Terrell Thomas"],
    ["FL-VF-ORA-1401", "DEM", "Roberta Walton Johnson"],
  ],
  "FL-ORA-MAYOR-general": [
    ["FL-VF-ORA-1239", "", "Chris Messina"],
    ["FL-VF-ORA-1236", "", "Tiffany Moore Russell"],
  ],
  "FL-ORA-SB1-general": [["FL-VF-ORA-1270", "", "Melissa Lopez Marantes"]],
  "FL-ORA-SB2-general": [["FL-VF-ORA-1318", "", "Gloria Reina O'Neal"]],
  "FL-ORA-SB3-general": [
    ["FL-VF-ORA-1314", "", "Diana Moore"],
    ["FL-VF-ORA-1242", "", "Susanne Peña"],
  ],
  "FL-ORA-SBCHAIR-general": [["FL-VF-ORA-1245", "", "Angie Gallo"]],
  "FL-SEN-general": [
    ["FL-DOE-89119", "REP", "Ashley Moody"],
    ["FL-DOE-89955", "NPA", "Neil J. Gillespie"],
    ["FL-DOE-90009", "DEM", "Angie Nixon"],
  ],
};

/* The arrays 0044 writes, read from the file itself so the check cannot
   drift from what the orchestrator applies. Only the live statements: the
   reversal block is commented out and is skipped with the comments. */
const MIGRATION = "supabase/migrations/0044_general_ballot_order.sql";
const migrationSql = readFileSync(join(ROOT, MIGRATION), "utf8")
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
const migrated = new Map<string, string[]>();
const UPDATE =
  /UPDATE race SET candidate_ids = ARRAY\[([^\]]*)\]\s+WHERE race_id = '([^']+)'/g;
for (const m of migrationSql.matchAll(UPDATE)) {
  migrated.set(
    m[2],
    [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
  );
}
check(`${MIGRATION} has UPDATE statements to read`, migrated.size > 0);

const before = (raceId: string) => SNAPSHOT_2026_10_05[raceId].map((r) => r[0]);
let contested = 0;
let outOfOrder = 0;
let demAheadOfRep = 0;
for (const [raceId, rows] of Object.entries(SNAPSHOT_2026_10_05)) {
  const stored = before(raceId);
  const after = migrated.get(raceId) ?? stored;
  const shown = ids(orderCandidates(rows.map(cand), after));
  check(
    `${raceId}: code and data agree after 0044`,
    same(shown, after),
    `code ${shown.join(", ")} / data ${after.join(", ")}`
  );
  if (migrated.has(raceId)) {
    check(
      `${raceId}: 0044 reorders, never adds or drops`,
      same([...after].sort(), [...stored].sort()) && !same(after, stored)
    );
  }
  /* The old code showed the stored order; count what that got wrong. */
  if (isPartisanRace(rows.map(cand)) && rows.length > 1) {
    contested++;
    if (!same(stored, shown)) outOfOrder++;
    const parties = rows.map((r) => r[1]);
    if (
      parties.includes("REP") &&
      parties.indexOf("DEM") < parties.indexOf("REP")
    ) {
      demAheadOfRep++;
    }
  }
}
check(
  "0044 touches only races in the snapshot",
  [...migrated.keys()].every((id) => id in SNAPSHOT_2026_10_05)
);
check(
  "the snapshot's damage, as recorded in 0044 and ballot-order.ts: 17 of 25 out of order, 11 DEM ahead of REP",
  contested === 25 &&
    outOfOrder === 17 &&
    demAheadOfRep === 11 &&
    migrated.size === 17,
  `contested ${contested}, out of order ${outOfOrder}, DEM ahead ${demAheadOfRep}, 0044 updates ${migrated.size}`
);

/* ---- 3. the official sample ballot -------------------------------------- */

console.log("Orange County composite sample ballot");

/* As printed, top to bottom (voteorangefl.gov, 26GEN113-CB-EN, 2026-10-01). */
const ORANGE_PRINTED: Record<string, string[]> = {
  "FL-SEN-general": ["Ashley Moody", "Angie Nixon", "Neil J. Gillespie"],
  "FL-8-general": ["Mike Haridopolos", "Jennifer Jenkins"],
  "FL-9-general": ["Dan Green", "Darren Soto"],
  "FL-11-general": ["Joe Strada", "James Pericola", "Ralph Groves"],
  "FL-GOV-general": [
    "Byron Donalds",
    "David Jolly",
    "Scott Eckhard Jewett",
    "Charles Burkett",
    "Frank J. Russo",
    'Moliere "Moe" Dimanche',
    "Dean Ocean Abrams",
    'Jeffrey Peter "Dr. Jeff" Datto',
  ],
  "FL-ATG-general": ["James Uthmeier", "Jose Javier Rodriguez"],
  "FL-CFO-general": ["Blaise Ingoglia", "Annette Taddeo"],
  "FL-AGR-general": ["Wilton Simpson", "Joey Mendoza Atkins"],
  "FL-ORA-CLERK-general": ["Roberta Walton Johnson", "Terrell Thomas"],
  "FL-ORA-MAYOR-general": ["Chris Messina", "Tiffany Moore Russell"],
  "FL-ORA-CC2-general": ["Kamia Brown", "Mike Crabb"],
  "FL-ORA-CC4-general": ["Brian Jones", "Johanna Lopez"],
  "FL-ORA-CC6-general": ["Lawanna Gelzer", 'Michael "Mike" Scott'],
  "FL-ORA-CC7-general": ["Patricia Rumph", "Vicki Vargo"],
  "FL-ORA-CC8-general": [
    "Jeannette Quinones Hernandez",
    "Victor M. Torres Jr.",
  ],
  "FL-ORA-SB3-general": ["Diana Moore", "Susanne Peña"],
};
for (const [raceId, printed] of Object.entries(ORANGE_PRINTED)) {
  const rows = SNAPSHOT_2026_10_05[raceId].map(cand);
  const shown = orderCandidates(rows, migrated.get(raceId) ?? before(raceId));
  check(
    `${raceId}: matches the printed ballot`,
    names(shown) === printed.join(" | "),
    names(shown)
  );
}

/* ---- 4. wiring ---------------------------------------------------------- */

console.log("wiring");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const src = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const callers = walk(join(ROOT, "src"))
  .filter((f) => /\borderCandidates\(/.test(readFileSync(f, "utf8")))
  .map((f) => relative(ROOT, f).split("\\").join("/"))
  .filter((f) => f !== "src/lib/ballot-order.ts")
  .sort();
const EXPECTED_CALLERS = [
  "src/app/(public)/methodology/page.tsx",
  "src/lib/briefs.ts",
  "src/lib/directory.ts",
  "src/lib/listing.ts",
  /* The landing page's race rows (getStatewideRaces), so the names on the
     home page read in the same order as the race page they link to. */
  "src/lib/races.ts",
];
check(
  "orderCandidates is called from the five known places",
  same(callers, EXPECTED_CALLERS),
  callers.join(", ")
);
for (const file of callers) {
  const code = src(file);
  check(
    `${file}: takes orderCandidates from ballot-order.ts`,
    /import \{[^}]*\borderCandidates\b[^}]*\} from "@\/lib\/ballot-order"/.test(
      code
    )
  );
  check(
    `${file}: no cast on what it hands orderCandidates`,
    !/orderCandidates\([^;]*\bas (any|never|unknown)\b/s.test(code)
  );
}
check(
  "BallotOrderCandidate requires party",
  /interface BallotOrderCandidate \{[^}]*\bparty: string \| null;/.test(
    src("src/lib/ballot-order.ts")
  )
);
/* The rows each caller sorts must be fetched with party: "*" or by name. */
check(
  'briefs.ts and listing.ts read candidate with select("*")',
  /from\("candidate"\)\s*\.select\("\*"\)/.test(src("src/lib/briefs.ts")) &&
    /from\("candidate"\)\s*\.select\("\*"\)/.test(src("src/lib/listing.ts"))
);
check(
  "races.ts selects party for the home rows it orders",
  /\.select\("candidate_id, legal_name, party"\)/.test(src("src/lib/races.ts"))
);
check(
  "directory.ts selects party for the cards it orders",
  /"candidate_id, legal_name, party, official_site/.test(
    src("src/lib/directory.ts")
  )
);
check(
  "methodology's scrutiny table embeds candidate(legal_name, party)",
  src("src/app/(public)/methodology/page.tsx").includes(
    "candidate(legal_name, party)"
  )
);

/* Caches that hold candidate order were re-keyed, so production stops
   serving an older deploy's order the moment this one ships. v2 was the
   ballot-order bump. v3 for the race loaders, and v2 for the two candidate
   loaders, is roster-completeness spec §3.9: an entry cached before 0049 was
   applied lacks its five columns, so a page built by the new deploy would
   show no running-mate line for up to an hour. */
check(
  "getRaceBrief cache key is v3",
  src("src/lib/briefs.ts").includes('["race-brief", "v3", raceId]')
);
check(
  "getRaceListing cache key is v3",
  src("src/lib/listing.ts").includes('["race-listing", "v3", raceId]')
);
check(
  "getCandidateDetail cache key is v2",
  src("src/lib/briefs.ts").includes('["candidate-detail", "v2", candidateId]')
);
check(
  "getCandidateListing cache key is v2",
  src("src/lib/listing.ts").includes('["candidate-listing", "v2", candidateId]')
);
check(
  "methodology scrutiny cache key is v4",
  src("src/app/(public)/methodology/page.tsx").includes(
    '["scrutiny-counts-v4"]'
  )
);

const methodology = src("src/app/(public)/methodology/page.tsx");
check(
  "methodology states the statutory rule, not 'otherwise alphabetical'",
  methodology.includes("F.S. 101.151(3)") &&
    methodology.includes("F.S. 105.041") &&
    methodology.includes("2022") &&
    !/ballot\s+order,\s+otherwise\s+alphabetical\)/.test(
      methodology.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    )
);
check(
  "methodology still has the #not-covered anchor other pages link to",
  methodology.includes('id="not-covered"')
);

/* ---- office order (s. 101.151(2)(a); interface review 2026-10-05) ------- */
{
  const rows = [
    { raceId: "FL-AGR-general", office: "Commissioner of Agriculture" },
    { raceId: "FL-ATG-general", office: "Attorney General" },
    { raceId: "FL-CFO-general", office: "Chief Financial Officer" },
    { raceId: "FL-GOV-general", office: "Governor" },
    { raceId: "FL-SEN-general", office: "United States Senator" },
    { raceId: "FL-23-general", office: "United States Representative" },
    { raceId: "FL-ORA-MAYOR-general", office: "Orange County Mayor" },
  ];
  check(
    "races list in statutory office order, unknown offices last",
    same(
      orderRaces(rows).map((r) => r.raceId),
      ["FL-SEN-general", "FL-23-general", "FL-GOV-general", "FL-ATG-general", "FL-CFO-general", "FL-AGR-general", "FL-ORA-MAYOR-general"]
    ),
    orderRaces(rows).map((r) => r.raceId).join(", ")
  );
  check("officeRank tolerates surrounding spaces", officeRank(" Governor ") === officeRank("Governor"));
  for (const file of ["src/lib/races.ts", "src/lib/resolve.ts"]) {
    const s = src(file);
    check(`${file}: orders its race list with orderRaces, not by level`, /orderRaces\(/.test(s) && !/\.order\("level"/.test(s));
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-ballot-order: all checks passed.");
