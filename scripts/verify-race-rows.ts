/* Guardrails for the race page's issue-first layout (RaceCompare,
   src/lib/race-rows.ts; inspiration pass 2026-10-05).

   1. raceRows: one row per spine issue, in spine order, with a cell for
      every candidate in ballot order, whether or not they have a block.
      Candidate-tier issues never become rows.
   2. candidateExtras: every candidate gets an entry, in ballot order, with
      only their non-spine issues.
   3. Source scans: the collapse rule is one constant for everyone, the race
      page stays static, and RaceCompare adds no client JavaScript.
   4. "Jump to" and "Why a position can be missed" (Mobbin catalog RC1 and
      RC5, 2026-10-12): the jump list names the page's own headings in page
      order and nothing per candidate; it scrolls smoothly only at lg and up
      under no-preference (founder decision D2 (a)); and the methodology
      link sits on every issue row, whatever its cells hold.

   Run: node scripts/verify-race-rows.ts */

import { readFileSync } from "node:fs";

import { candidateExtras, raceJumpLinks, raceRows } from "../src/lib/race-rows.ts";
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

/* ---- 4. Jump to, and why a position can be missed ----------------------- */
check(
  "jump links: the roster, every row in page order, then the other issues",
  eq(raceJumpLinks(rows, "Who's running", "Other issues they raise"), [
    { href: "#whos-running", label: "Who's running" },
    { href: "#issue-economy", label: "Economy" },
    { href: "#issue-housing", label: "Housing" },
    { href: "#other-issues", label: "Other issues they raise" },
  ])
);
check(
  "no other-issues link when no candidate has one",
  !raceJumpLinks(rows, "Who's running", null).some((j) => j.href === "#other-issues")
);
check(
  "the roster link carries the roster's own heading",
  raceJumpLinks(rows, "The winners", null)[0]?.label === "The winners"
);

/* Comments may explain the rule; code is what renders. */
const compareCode = compare
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");
{
  const navAt = compareCode.indexOf('id="issue-jump-nav"');
  const rosterAt = compareCode.indexOf('aria-labelledby="whos-running"');
  check("the jump list comes before the roster", navAt > 0 && rosterAt > navAt);
  const nav = compareCode.slice(navAt, rosterAt);
  check(
    "it is a labelled nav, shown only when there is somewhere past the roster",
    /\{jumps\.length > 1 && \(\s*<nav\s+id="issue-jump-nav"\s+aria-label="Issues on this page"/.test(compareCode) &&
      nav.includes("Jump to:")
  );
  check(
    "it renders raceJumpLinks with the page's own headings",
    /const jumps = raceJumpLinks\(rows, rosterHeading, anyExtras \? otherIssuesHeading : null\);/.test(compareCode) &&
      /<h2 id="whos-running" className="text-h2">\s*\{rosterHeading\}/.test(compareCode) &&
      /<h2 id="other-issues" className="text-h2">\s*\{otherIssuesHeading\}/.test(compareCode)
  );
  check(
    "jump links are plain underlined text links at 14px with a 24px target, not chips",
    /<a\s+href=\{href\}\s+className="inline-flex min-h-\[24px\] items-center gap-1 text-body-sm text-primary underline underline-offset-2/.test(
      nav
    ) && !/rounded-full|<Link/.test(nav)
  );
  check("jump targets need no scroll-mt (root scroll-padding clears the bars)", !/scroll-mt-/.test(compareCode));
}
{
  const css = read("src/app/globals.css")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const smooth = css.match(/scroll-behavior:\s*smooth/g) ?? [];
  check(
    "smooth scrolling is the jump list's alone, at lg and up, motion-safe only",
    smooth.length === 1 &&
      /html:has\(#issue-jump-nav\) \{\s*@variant lg \{\s*@variant motion-safe \{\s*scroll-behavior: smooth;/.test(css)
  );
  check(
    "route changes still scroll to the top at once (Next's data-scroll-behavior)",
    /<html[^>]*data-scroll-behavior="smooth"/.test(read("src/app/layout.tsx"))
  );
}
{
  /* From the start of the row loop to its cells: the heading line. */
  const rowAt = compareCode.indexOf("{rows.map((row) => (");
  const head = compareCode.slice(rowAt, compareCode.indexOf("row.cells.map", rowAt));
  const link = /<Link\s+href="\/methodology#limits"\s+className="ms-auto inline-flex min-h-\[24px\] items-center text-body-sm text-on-surface-muted underline underline-offset-2[^"]*"\s*>\s*Why a position can be missed\s*<\/Link>/;
  check('every issue row\'s heading line links "Why a position can be missed" at 14px', rowAt > 0 && link.test(head));
  check(
    "the link doesn't depend on what the row's cells hold",
    !/block|coverage|no_stated_position_found|cells/.test(head) &&
      !/(&&|\?)\s*\(?\s*<Link\s+href="\/methodology#limits"/.test(head)
  );
  check(
    "the one-time note above the rows stays",
    /\{rows\.length > 0 && <NoStatedPositionNote \/>\}/.test(compareCode)
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-race-rows: all checks passed.");
