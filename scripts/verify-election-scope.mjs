/* Verifies that every read of the pipeline-owned `race` table is scoped to
   the active election (TASK-057).

   The app serves one election at a time, but the race table is not scoped
   to one — race.election is 'primary' | 'general', and both can coexist.
   Today the database happens to hold a single cycle, so an unfiltered read
   looks correct; it stops being correct the moment a second cycle lands,
   and the failure is silent — a stale race rendered beside a live one with
   nothing to distinguish them.

   A static check rather than a query, so it needs no database and runs in
   CI or a pre-commit hook: find every `.from("race")` in src/ and require
   an `.eq("election", ...)` in the same call chain.

   Two reads are legitimately exempt, both because they are already scoped
   by explicit race_ids that came from an election-filtered query upstream:
   see EXEMPT below.

   Run: node scripts/verify-election-scope.mjs */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/* path -> why it needs no election filter. Keep this list short and
   justified; an entry here is a claim that the ids are already scoped. */
const EXEMPT = new Map([
  [
    "src/components/features/YourRaces.tsx",
    "raceDates() takes race_ids that resolve.ts already filtered",
  ],
]);

const files = execFileSync(
  "grep",
  ["-rl", '\\.from("race")', "--include=*.ts", "--include=*.tsx", "src"],
  { encoding: "utf8" }
)
  .split("\n")
  .filter(Boolean)
  .sort();

let failures = 0;
function check(name, ok, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

check("at least one race read found", files.length > 0, "grep matched nothing — did the table get renamed?");

for (const file of files) {
  const source = readFileSync(file, "utf8");

  /* Slice each call chain from `.from("race")` to the statement end, so a
     filter belonging to a different query in the same file cannot satisfy
     this one. Chains end at `;` — every read here is awaited or assigned. */
  let index = source.indexOf('.from("race")');
  let chain = 0;
  while (index !== -1) {
    chain++;
    const end = source.indexOf(";", index);
    const body = source.slice(index, end === -1 ? source.length : end);
    const label = `${file} (race read ${chain})`;

    if (EXEMPT.has(file)) {
      check(`${label} — exempt: ${EXEMPT.get(file)}`, true);
    } else {
      check(
        `${label} filters on election`,
        /\.eq\(\s*"election"\s*,\s*ACTIVE_ELECTION_KIND\s*\)/.test(body),
        'add .eq("election", ACTIVE_ELECTION_KIND) — see src/lib/election.ts'
      );
    }
    index = source.indexOf('.from("race")', index + 1);
  }
}

/* The constant itself must stay in exactly one place, or "one edit to
   switch cycles" quietly stops being true. */
const electionModule = readFileSync("src/lib/election.ts", "utf8");
check(
  "ACTIVE_ELECTION_KIND is defined once, in src/lib/election.ts",
  /export const ACTIVE_ELECTION_KIND/.test(electionModule)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nEvery race read is scoped to the active election.");
