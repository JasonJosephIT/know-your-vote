/* Guardrails for the quiz replacement's issue filter (spec
   docs/superpowers/specs/2026-09-25-quiz-replacement-design.md).

   1. parseIssuePick / togglePickHref: the URL is the only state, so its
      parsing must be total and canonical (spine order, no unknowns, no dupes).
   2. issueRowsFor: the filtered view carries each candidate's own `say`
      claims and nothing the site wrote. A sentinel planted in stanceSummary,
      done and factCheck must never reach its output.
   3. Source scans (added by later tasks): the view's components cannot
      render what the data layer already withholds, and the hub's outbound
      card loads nothing from the third party.

   Run: node scripts/verify-issue-pick.ts */

import { readFileSync } from "node:fs";

import {
  issueRowsFor,
  parseIssuePick,
  pickHref,
  spineOptions,
  subIssueIdOf,
  togglePickHref,
} from "../src/lib/issue-pick.ts";
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

/* ---- 1. parseIssuePick / pickHref / togglePickHref ---------------------- */
const AVAILABLE = ["economy", "housing", "insurance"];

check("unknown id dropped", eq(parseIssuePick("housing,bogus", AVAILABLE), ["housing"]));
check("duplicates removed", eq(parseIssuePick("housing,housing", AVAILABLE), ["housing"]));
check(
  "output follows spine order, not URL order",
  eq(parseIssuePick("insurance,economy", AVAILABLE), ["economy", "insurance"])
);
check("undefined gives []", eq(parseIssuePick(undefined, AVAILABLE), []));
check("empty string gives []", eq(parseIssuePick("", AVAILABLE), []));
check("lone comma gives []", eq(parseIssuePick(",", AVAILABLE), []));
check(
  "array value is joined",
  eq(parseIssuePick(["insurance", "economy,housing"], AVAILABLE), AVAILABLE)
);
check("whitespace trimmed", eq(parseIssuePick(" housing , economy ", AVAILABLE), ["economy", "housing"]));
check("ids are case-sensitive", eq(parseIssuePick("Housing", AVAILABLE), []));

check("pickHref with ids", pickHref("FL-GOV-general", ["economy", "housing"]) === "/races/FL-GOV-general/issues?pick=economy,housing");
check("pickHref with none returns the race page", pickHref("FL-GOV-general", []) === "/races/FL-GOV-general");
check(
  "toggle adds, in spine order",
  togglePickHref("FL-GOV-general", ["insurance"], "economy", AVAILABLE) ===
    "/races/FL-GOV-general/issues?pick=economy,insurance"
);
check(
  "toggle removes",
  togglePickHref("FL-GOV-general", ["economy", "insurance"], "economy", AVAILABLE) ===
    "/races/FL-GOV-general/issues?pick=insurance"
);
check(
  "toggle removing the last returns the race page",
  togglePickHref("FL-GOV-general", ["economy"], "economy", AVAILABLE) === "/races/FL-GOV-general"
);

/* ---- 2. spineOptions / issueRowsFor ------------------------------------- */
const RACE = "FL-GOV-general";
const SENTINEL = "SENTINEL-SITE-AUTHORED";
const issue = (sub: string, title: string, tier: "spine" | "candidate" = "spine", order = 0) => ({
  issue_id: `${RACE}--issue-${sub}`,
  race_id: RACE,
  tier,
  candidate_id: null,
  title,
  description: null,
  source_id: null,
  display_order: order,
});
const claim = (id: string, text: string) => ({
  claim: { claim_id: id, text, verdict: null },
  sources: [{ source_id: `src-${id}`, url: `https://example.org/${id}`, publisher: "Example" }],
});
const block = (
  iss: ReturnType<typeof issue>,
  coverage: "stated" | "no_stated_position_found",
  sayText: string | null
) => ({
  issue: iss,
  coverage,
  stanceSummary: SENTINEL,
  say: sayText ? [claim(`${iss.issue_id}-say`, sayText)] : [],
  done: [claim(`${iss.issue_id}-done`, SENTINEL)],
  factCheck: [claim(`${iss.issue_id}-fc`, SENTINEL)],
  policyAreas: [],
});

const ECON = issue("economy", "Economy & Affordability", "spine", 1);
const HOUS = issue("housing", "Housing", "spine", 2);
const INS = issue("insurance", "Insurance & Property Costs", "spine", 3);
const EXTRA = issue("KYV9", "A candidate-added issue", "candidate", 4);
/* Only used to exercise coverage/say combinations that the other spine
   issues don't: a "stated" block whose say is empty, and a
   "no_stated_position_found" block that nevertheless carries claims. */
const SAFETY = issue("safety", "Public Safety", "spine", 5);

const fixture = {
  race: { race_id: RACE, office: "Governor" },
  spineIssues: [ECON, HOUS, INS, SAFETY],
  candidates: [
    {
      candidate: { candidate_id: "cand-a", legal_name: "Alex Able" },
      socials: [],
      audit: {},
      issues: [
        /* stated, but say is empty: the row must still show coverage
           "stated" with say: [], never a "no stated position" claim. */
        block(ECON, "stated", null),
        block(HOUS, "no_stated_position_found", null),
        block(INS, "stated", "A on insurance"),
        block(EXTRA, "stated", "A extra"),
        /* no_stated_position_found, but say has claims: those claims must
           carry through, not be dropped because of the coverage value. */
        block(SAFETY, "no_stated_position_found", "A safety claim"),
      ],
    },
    {
      candidate: { candidate_id: "cand-b", legal_name: "Blair Baker" },
      socials: [],
      audit: {},
      /* No block for INS: a data gap, which must not be rendered as a
         recorded "no stated position" claim. */
      issues: [block(ECON, "stated", "B on economy"), block(HOUS, "stated", "B on housing")],
    },
  ],
} as unknown as RaceBrief;

check("subIssueIdOf strips the race prefix", subIssueIdOf(HOUS) === "housing");
check(
  "spineOptions keeps spine only, in order",
  eq(spineOptions([ECON, HOUS, INS, EXTRA] as never), [
    { id: "economy", title: "Economy & Affordability" },
    { id: "housing", title: "Housing" },
    { id: "insurance", title: "Insurance & Property Costs" },
  ])
);

const rows = issueRowsFor(fixture, ["insurance", "housing"]);
check("one row per selected issue, spine order", eq(rows.map((r) => r.subIssueId), ["housing", "insurance"]));
check("row title is the issue's own title", rows[0]?.title === "Housing");
check("cells follow candidate order", eq(rows[0]?.cells.map((c) => c.candidateId), ["cand-a", "cand-b"]));
check("cell carries the candidate's name", rows[0]?.cells[0]?.name === "Alex Able");
check(
  "recorded no-stated-position carries through, with no claims",
  rows[0]?.cells[0]?.coverage === "no_stated_position_found" && rows[0]?.cells[0]?.say.length === 0
);
check("stated cell carries its say claims", rows[0]?.cells[1]?.say[0]?.claim.text === "B on housing");
check(
  "a missing block is null coverage, not a recorded silence",
  rows[1]?.cells[1]?.coverage === null && rows[1]?.cells[1]?.say.length === 0
);
check("candidate-tier issues cannot be selected", issueRowsFor(fixture, ["KYV9"]).length === 0);
check("no selection gives no rows", issueRowsFor(fixture, []).length === 0);
check(
  "nothing site-authored (stanceSummary, done, factCheck) reaches the rows",
  !JSON.stringify(issueRowsFor(fixture, ["economy", "housing", "insurance"])).includes(SENTINEL)
);
check(
  "a stated block with empty say yields say: [] and coverage stated",
  issueRowsFor(fixture, ["economy"])[0]?.cells[0]?.coverage === "stated" &&
    issueRowsFor(fixture, ["economy"])[0]?.cells[0]?.say.length === 0
);
check(
  "a no_stated_position_found block with claims carries those claims through",
  issueRowsFor(fixture, ["safety"])[0]?.cells[0]?.coverage === "no_stated_position_found" &&
    issueRowsFor(fixture, ["safety"])[0]?.cells[0]?.say[0]?.claim.text === "A safety claim"
);

/* ---- 3. source scans ---------------------------------------------------- */
const read = (p: string) => {
  try {
    return readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
};
/* Comments may name the forbidden fields to explain the rule; code may not. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const issueRows = code("src/components/features/IssueRows.tsx");
check("IssueRows.tsx exists", issueRows.length > 0);
check(
  "IssueRows renders no site-authored field",
  !/stanceSummary|factCheck|\bdone\b/.test(issueRows)
);
const issuesPage = code("src/app/(public)/races/[raceId]/issues/page.tsx");
check("issues/page.tsx exists", issuesPage.length > 0);
check(
  "issues/page.tsx renders no site-authored field",
  !/stanceSummary|factCheck|\bdone\b/.test(issuesPage)
);
check(
  "issues/page.tsx opts every metadata branch out of indexing",
  read("src/app/(public)/races/[raceId]/issues/page.tsx").includes("index: false")
);
for (const f of [
  "src/components/features/IssueRows.tsx",
  "src/components/features/IssueFilter.tsx",
  "src/app/(public)/races/[raceId]/issues/page.tsx",
]) {
  check(`${f} adds no client JavaScript`, read(f).length > 0 && !read(f).includes('"use client"'));
}
const racePage = code("src/app/(public)/races/[raceId]/page.tsx");
check(
  "race page stays static: no searchParams, no dynamic export",
  racePage.length > 0 && !/searchParams|export const dynamic/.test(racePage)
);
check("race page renders the IssueFilter", /<IssueFilter\b/.test(racePage));

const outside = read("src/components/features/OutsideResources.tsx");
check("OutsideResources.tsx exists", outside.length > 0);
check("outbound card loads nothing third-party", !/<img|<iframe|<script/i.test(outside));
check(
  "outbound card links to Ballotpedia's sample ballot lookup in a new tab, no referrer",
  outside.includes('href="https://ballotpedia.org/Sample_Ballot_Lookup"') &&
    outside.includes('target="_blank"') &&
    outside.includes('rel="noreferrer"')
);
check("outbound card adds no client JavaScript", outside.length > 0 && !outside.includes('"use client"'));
check(
  "candidates hub renders the outbound card",
  /<OutsideResources\s*\/>/.test(code("src/app/(public)/candidates/page.tsx"))
);
check(
  "sitemap lists no /issues URLs",
  !read("src/app/sitemap.ts").includes("/issues")
);

/* ---- summary ------------------------------------------------------------ */
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-issue-pick: all checks passed.");
