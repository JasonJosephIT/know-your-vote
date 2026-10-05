/* Guardrails for the race page's issue-first layout (RaceCompare,
   src/lib/race-rows.ts; inspiration pass 2026-10-05).

   1. raceRows: one row per spine issue, in spine order, with a cell for
      every candidate in ballot order, whether or not they have a block.
      Candidate-tier issues never become rows.
   2. candidateExtras: every candidate gets an entry, in ballot order, with
      only their non-spine issues.
   3. Source scans: the collapse rule is one constant for everyone, the race
      page stays static, and RaceCompare adds no client JavaScript.

   Run: node scripts/verify-race-rows.ts */

import { readFileSync } from "node:fs";

import { candidateExtras, raceRows } from "../src/lib/race-rows.ts";
import type { RaceBrief } from "../src/lib/briefs.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const RACE = "FL-GOV-general";
const issue = (sub: string, title: string, tier: "spine" | "candidate" = "spine") => ({
  issue_id: `${RACE}--issue-${sub}`,
  race_id: RACE,
  tier,
  candidate_id: null,
  title,
  description: null,
  source_id: null,
  display_order: 0,
});
const block = (iss: ReturnType<typeof issue>, areas: { id: string; label: string }[] = []) => ({
  issue: iss,
  coverage: "stated" as const,
  stanceSummary: "",
  say: [],
  done: [],
  factCheck: [],
  policyAreas: areas,
});

const ECON = issue("economy", "Economy");
const HOUS = issue("housing", "Housing");
const A_EXTRA = issue("KYV1", "Ferries", "candidate");
const C_EXTRA = issue("KYV2", "Bridges", "candidate");
const AREA = [{ id: "housing", label: "Housing" }];

const fixture = {
  race: { race_id: RACE, office: "Governor" },
  spineIssues: [ECON, HOUS],
  candidates: [
    {
      candidate: { candidate_id: "a", legal_name: "Alex Able" },
      socials: [],
      audit: {},
      issues: [block(ECON), block(HOUS, AREA), block(A_EXTRA)],
    },
    /* No blocks at all: still a cell in every row, still an extras entry. */
    { candidate: { candidate_id: "b", legal_name: "Blair Baker" }, socials: [], audit: {}, issues: [] },
    {
      candidate: { candidate_id: "c", legal_name: "Casey Cole" },
      socials: [],
      audit: {},
      issues: [block(C_EXTRA), block(ECON)],
    },
  ],
} as unknown as RaceBrief;

/* ---- 1. raceRows -------------------------------------------------------- */
const rows = raceRows(fixture);
check("one row per spine issue, in spine order", eq(rows.map((r) => r.subIssueId), ["economy", "housing"]));
check(
  "every row has a cell for every candidate, in ballot order",
  rows.every((r) => eq(r.cells.map((c) => c.candidate.candidate_id), ["a", "b", "c"]))
);
check(
  "a candidate with no block gets a null cell, not a dropped one",
  rows.every((r) => r.cells[1].block === null)
);
check(
  "blocks land in the right cell",
  rows[0].cells[2].block?.issue.issue_id === ECON.issue_id && rows[1].cells[2].block === null
);
check("policy areas are carried once per row", eq(rows[1].policyAreas, AREA) && eq(rows[0].policyAreas, []));
check("candidate-tier issues never become rows", !rows.some((r) => /KYV/.test(r.subIssueId)));

/* ---- 2. candidateExtras ------------------------------------------------- */
const extras = candidateExtras(fixture);
check("an extras entry for every candidate, in ballot order", eq(extras.map((e) => e.candidate.candidate_id), ["a", "b", "c"]));
check(
  "extras hold only non-spine issues, each under its own candidate",
  eq(
    extras.map((e) => e.blocks.map((b) => b.issue.title)),
    [["Ferries"], [], ["Bridges"]]
  )
);

/* ---- 3. source scans ---------------------------------------------------- */
const read = (p: string) => {
  try {
    return readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
};
const compare = read("src/components/features/RaceCompare.tsx");
check("RaceCompare adds no client JavaScript", compare.length > 0 && !compare.includes('"use client"'));
check(
  "RaceCompare renders every cell compact through IssueBuckets, one rule for everyone",
  (compare.match(/<IssueBuckets block=\{block\} compact name=\{candidate\.legal_name\} \/>/g) ?? []).length === 2 &&
    !/collapseAfter/.test(compare)
);
const section = read("src/components/features/IssueSection.tsx");
check(
  "the collapse threshold is a single constant",
  /collapseAfter=\{compact \? 2 : undefined\}/.test(section)
);
const claimList = read("src/components/features/ClaimList.tsx");
check(
  "collapsed claims use native <details> and state the count",
  claimList.includes("<details") && /Show \{rest\.length\} more/.test(claimList) && !claimList.includes('"use client"')
);
check(
  "roster cards keep the candidate-<id> anchors the old jump links used",
  compare.includes("id={`candidate-${candidate.candidate_id}`}")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-race-rows: all checks passed.");
