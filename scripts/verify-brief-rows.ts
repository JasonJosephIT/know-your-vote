/* Guardrail for the brief writer — src/lib/brief-rows.ts.

   This is the file that stands between a scored passage and a voter reading
   it as a candidate's position, so what it checks is what would be unsafe to
   get wrong, not what is easy to assert:

     - A CLAIM PROMOTED. `verifiable_fact`, a `verdict`, or `verified` leaving
       here means the brief tells a reader something was checked when nothing
       checked it. A Noul scores relevance; it cannot adjudicate.
     - A SILENT GAP. A spine issue with no position row reads as an oversight;
       `no_stated_position_found` reads as "we looked". Only the second is
       true, and the difference is invisible once the page renders.
     - A CLAIM WITHOUT A SOURCE. briefs.ts inner-joins claim_source, so such a
       claim vanishes at read time — the row would exist, the audit counts
       would include it, and the page would not show it.
     - ONE CANDIDATE'S SITE UNDER ANOTHER'S NAME. Nothing upstream stops a run
       file being paired with the wrong candidate id.
     - AN AUDIT THAT DISAGREES WITH ITS OWN ARRAYS. balance_audit_core derives
       the two neutrality numbers from len(facts)/len(positions); a mismatched
       audit is published as fairness evidence and audited as something else.
       The demo seed shipped exactly this.
     - A SPINE INVENTED FROM MODEL OUTPUT, which would let the candidate with
       the most web copy choose the questions the race is judged on.

   Pure and offline: no network, no key, no DB. Run: node scripts/verify-brief-rows.ts */

import {
  BRIEF_ROWS_SCHEMA,
  buildBriefRows,
  urlNorm,
  wordCount,
  type BriefRowsInput,
  type SpineIssue,
} from "../src/lib/brief-rows.ts";
import { passageId } from "../src/lib/candidate-site.ts";
import { POLICY_RUN_SCHEMA, type PolicyRun, type RunPassage } from "../src/lib/policy-run.ts";
import { SUB_ISSUES } from "../src/lib/news-issues.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* Two real taxonomy ids, so the fixture exercises the same vocabulary the
   pipeline emits rather than a private one that could drift from it. */
const [ISSUE_A, ISSUE_B, ISSUE_C] = SUB_ISSUES.slice(0, 3).map((s) => s.id);

const SPINE: SpineIssue[] = [
  { id: ISSUE_A, title: "Spine question A" },
  { id: ISSUE_B, title: "Spine question B" },
];

const SITE_A = "https://ada-for-florida.example.com";
const SITE_B = "https://blake-for-florida.example.com";

function runPassage(
  url: string,
  text: string,
  issues: string[],
  over: Partial<RunPassage> = {},
): RunPassage {
  return {
    id: passageId(url, text),
    url,
    heading: null,
    text,
    verdict: {
      commitment: 0.95,
      states_policy: issues.length > 0,
      issues,
      scores: Object.fromEntries(issues.map((i) => [i, 0.9])),
    },
    ...over,
  };
}

function policyRun(passages: RunPassage[], over: Partial<PolicyRun> = {}): PolicyRun {
  return {
    schema: POLICY_RUN_SCHEMA,
    status: "complete",
    site: null,
    created_at: "2026-09-21T00:00:00Z",
    model: "test-model",
    taxonomy_version: "test",
    threshold: 0.85,
    provenance: "jev:test-model/tax-test/q-test",
    question_ids: [],
    counts: { passages: passages.length, asked: passages.length, states_policy: 0, with_issue: 0, failed: 0 },
    passages,
    areas: [],
    usage: null,
    ...over,
  };
}

const ADA_QUOTE_A = "Ada will cap the annual increase on homestead insurance premiums at five percent.";
const ADA_QUOTE_BOTH = "Ada will fund the county water plant and cut the utility connection fee.";
const BLAKE_QUOTE = "Blake will expand the small business fee reduction to every county in the district.";

const baseInput = (): BriefRowsInput => ({
  raceId: "FL-GOV-general",
  spine: SPINE,
  candidates: [
    {
      candidateId: "cand-ada",
      officialSite: SITE_A,
      run: policyRun([
        runPassage(`${SITE_A}/issues/insurance`, ADA_QUOTE_A, [ISSUE_A]),
        /* One quote, two spine issues — the duplication rule. */
        runPassage(`${SITE_A}/issues/water`, ADA_QUOTE_BOTH, [ISSUE_A, ISSUE_B]),
        /* Read and asked, states no policy: must be reported, never a row. */
        runPassage(`${SITE_A}/about`, "Ada grew up in Pinellas County.", []),
      ]),
    },
    {
      candidateId: "cand-blake",
      officialSite: SITE_B,
      /* Only an OFF-spine issue: exercises candidate-tier issues. */
      run: policyRun([runPassage(`${SITE_B}/plan`, BLAKE_QUOTE, [ISSUE_C])]),
    },
  ],
  retrievedAt: "2026-09-21T00:00:00Z",
});

const out = buildBriefRows(baseInput());
const { rows } = out;

console.log("brief-rows guardrail");
check("schema is stamped", out.schema === BRIEF_ROWS_SCHEMA, out.schema);

/* ---- rule 2: it cannot manufacture a fact ----------------------------- */
check(
  "every claim is a stated_position",
  rows.claims.every((c) => c.bucket === "stated_position"),
  [...new Set(rows.claims.map((c) => c.bucket))].join(","),
);
check(
  "no claim carries a verdict",
  rows.claims.every((c) => c.verdict === null),
);
check(
  "every claim is single_source",
  rows.claims.every((c) => c.verification === "single_source"),
  [...new Set(rows.claims.map((c) => c.verification))].join(","),
);
check(
  "no claim is derived from another",
  rows.claims.every((c) => c.derived_from === null),
);

/* ---- rule 1: no source, no claim -------------------------------------- */
const sourcedClaims = new Set(rows.claimSources.map((cs) => cs.claim_id));
check(
  "every claim has a claim_source",
  rows.claims.every((c) => sourcedClaims.has(c.claim_id)),
);
const sourceIds = new Set(rows.sources.map((s) => s.source_id));
check(
  "every claim_source points at an emitted source",
  rows.claimSources.every((cs) => sourceIds.has(cs.source_id)),
);
check(
  "no orphan source is emitted",
  rows.sources.every((s) => rows.claimSources.some((cs) => cs.source_id === s.source_id)),
);
/* Ada's two quotes come off two pages; one page cited twice is one source. */
check(
  "one source per distinct page",
  rows.sources.length === 3,
  `${rows.sources.length}`,
);

/* ---- rule 3: silence is rendered as silence --------------------------- */
for (const cand of ["cand-ada", "cand-blake"]) {
  const spinePositions = SPINE.map((s) =>
    rows.positions.find(
      (p) => p.candidate_id === cand && p.issue_id === `FL-GOV-general--issue-${s.id}`,
    ),
  );
  check(
    `${cand} has a position on every spine issue`,
    spinePositions.every(Boolean),
    `${spinePositions.filter(Boolean).length}/${SPINE.length}`,
  );
}
const blakeSpine = rows.positions.filter(
  (p) => p.candidate_id === "cand-blake" && p.issue_id.startsWith("FL-GOV-general--issue-") && !p.issue_id.endsWith("cand-blake"),
);
check(
  "a candidate silent on the spine gets no_stated_position_found, not nothing",
  blakeSpine.length === SPINE.length &&
    blakeSpine.every((p) => p.coverage === "no_stated_position_found" && p.claim_ids.length === 0),
);
check(
  "an empty position is never marked attributed",
  rows.positions.every((p) => p.coverage === "stated" || p.attributed === false),
);
check(
  "a stated position always carries claims",
  rows.positions.every((p) => p.coverage === "no_stated_position_found" || p.claim_ids.length > 0),
);
check(
  "stance_summary is never synthesized",
  rows.positions.every((p) => p.stance_summary === ""),
);

/* ---- rule 4: the spine is an input ------------------------------------ */
const spineRows = rows.issues.filter((i) => i.tier === "spine");
check(
  "exactly the spine handed in becomes spine issues",
  spineRows.length === SPINE.length &&
    SPINE.every((s) => spineRows.some((r) => r.issue_id === `FL-GOV-general--issue-${s.id}`)),
  `${spineRows.length}`,
);
check(
  "an off-spine finding becomes a candidate-tier issue, never a spine one",
  rows.issues.some((i) => i.tier === "candidate" && i.candidate_id === "cand-blake") &&
    !spineRows.some((i) => i.issue_id.includes(ISSUE_C)),
);
check(
  "spine issues carry no candidate_id and candidate issues always do",
  rows.issues.every((i) =>
    i.tier === "spine" ? i.candidate_id === null : i.candidate_id !== null,
  ),
);
check(
  "spine display_order is the order handed in",
  spineRows.map((i) => i.display_order).join(",") === "1,2",
);
check(
  "candidate-tier issues sort after every spine issue",
  rows.issues
    .filter((i) => i.tier === "candidate")
    .every((i) => i.display_order > spineRows.length),
);

/* ---- the identity check ----------------------------------------------- */
const crossed = baseInput();
/* Ada's run handed to Blake's id: every passage is off-site. */
const swapped = buildBriefRows({
  ...crossed,
  candidates: [{ ...crossed.candidates[0], candidateId: "cand-blake", officialSite: SITE_B }],
});
check(
  "a run from another candidate's site produces no claims",
  swapped.rows.claims.length === 0,
  `${swapped.rows.claims.length}`,
);
check(
  "and every rejected passage says why",
  swapped.rejected.filter((r) => r.reason === "not_official_site").length === 2,
  swapped.rejected.map((r) => r.reason).join(","),
);
check(
  "and the candidate still gets a full set of absence positions",
  swapped.rows.positions.filter((p) => p.coverage === "no_stated_position_found").length ===
    SPINE.length,
);
check(
  "and still gets a profile row",
  swapped.rows.profiles.length === 1,
);

/* ---- the audit --------------------------------------------------------- */
for (const profile of rows.profiles) {
  check(
    `${profile.candidate_id} audit.verifiable_fact_count equals facts.length`,
    profile.audit.verifiable_fact_count === profile.facts.length,
  );
  check(
    `${profile.candidate_id} audit.stated_position_count equals positions.length`,
    profile.audit.stated_position_count === profile.positions.length,
  );
  check(
    `${profile.candidate_id} profile.positions holds real claim ids`,
    profile.positions.every((id) => rows.claims.some((c) => c.claim_id === id)),
  );
  check(
    `${profile.candidate_id} spine_issue_count is the whole spine`,
    profile.audit.spine_issue_count === SPINE.length,
  );
}
check(
  "balance_check_passed is never written here — T10 owns it",
  rows.profiles.every(
    (p) => !("balance_check_passed" in p.audit) && !("flag_reason" in p.audit),
  ),
);
check(
  "fact_checks_performed is 0, not omitted (balance_audit_core indexes it)",
  rows.profiles.every((p) => p.audit.fact_checks_performed === 0),
);
const ada = rows.profiles.find((p) => p.candidate_id === "cand-ada")!;
const blake = rows.profiles.find((p) => p.candidate_id === "cand-blake")!;
check(
  "spine coverage counts spine issues only",
  ada.audit.spine_issues_covered === 2 && blake.audit.spine_issues_covered === 0,
  `ada=${ada.audit.spine_issues_covered} blake=${blake.audit.spine_issues_covered}`,
);
/* Ada's second quote is cited under both spine issues, so it is rendered
   twice and counted twice. A quieter number here would flatter the gate. */
check(
  "word_count counts what the page renders, including a re-cited quote",
  ada.audit.word_count ===
    wordCount(ADA_QUOTE_A) + wordCount(ADA_QUOTE_BOTH) * 2,
  `${ada.audit.word_count}`,
);

/* ---- passages that produced nothing are reported, not dropped --------- */
check(
  "a passage that states no policy is reported",
  out.rejected.some((r) => r.candidate_id === "cand-ada" && r.reason === "states_no_policy"),
);
const noVerdict = buildBriefRows({
  ...baseInput(),
  candidates: [
    {
      candidateId: "cand-ada",
      officialSite: SITE_A,
      run: policyRun([runPassage(`${SITE_A}/x`, "text", [ISSUE_A], { verdict: null })]),
    },
  ],
});
check(
  "a passage whose request failed is reported, not read as silence",
  noVerdict.rejected.some((r) => r.reason === "no_verdict"),
);
const wrongSchema = buildBriefRows({
  ...baseInput(),
  candidates: [
    {
      candidateId: "cand-ada",
      officialSite: SITE_A,
      run: policyRun([runPassage(`${SITE_A}/x`, "text", [ISSUE_A])], { schema: "kyv.policy-run/0" }),
    },
  ],
});
check(
  "a run built under another schema is refused, not mixed in",
  wrongSchema.rows.claims.length === 0 &&
    wrongSchema.rejected.some((r) => r.reason === "schema_mismatch"),
);

/* ---- url_norm must match allowlist_b_core.url_norm -------------------- */
check("urlNorm drops the scheme", urlNorm("https://a.example.com/x") === "a.example.com/x");
check("urlNorm strips a trailing slash", urlNorm("https://a.example.com/x/") === "a.example.com/x");
check("urlNorm lowercases the host", urlNorm("https://A.Example.COM/x") === "a.example.com/x");
check("urlNorm keeps the query", urlNorm("https://a.example.com/x?p=1") === "a.example.com/x?p=1");
check("urlNorm drops the fragment", urlNorm("https://a.example.com/x#y") === "a.example.com/x");
check("urlNorm refuses a non-http scheme", urlNorm("ftp://a.example.com/x") === null);
check("urlNorm refuses junk", urlNorm("not a url") === null);
check(
  "emitted url_norm carries no scheme",
  rows.sources.every((s) => !s.url_norm.includes("://")),
);

/* ---- determinism ------------------------------------------------------- */
const again = buildBriefRows(baseInput());
check(
  "the same run twice produces byte-identical rows",
  JSON.stringify(again.rows) === JSON.stringify(rows),
);

/* ---- schema constraints the database would enforce -------------------- */
check(
  "position is unique per (candidate, issue)",
  new Set(rows.positions.map((p) => `${p.candidate_id}\u0000${p.issue_id}`)).size ===
    rows.positions.length,
);
check(
  "position_id is unique",
  new Set(rows.positions.map((p) => p.position_id)).size === rows.positions.length,
);
check(
  "claim_id is unique",
  new Set(rows.claims.map((c) => c.claim_id)).size === rows.claims.length,
);
check(
  "issue_id is unique",
  new Set(rows.issues.map((i) => i.issue_id)).size === rows.issues.length,
);
check(
  "source url_norm is unique",
  new Set(rows.sources.map((s) => s.url_norm)).size === rows.sources.length,
);
check(
  "profile is unique per (candidate, race)",
  new Set(rows.profiles.map((p) => `${p.candidate_id}\u0000${p.race_id}`)).size ===
    rows.profiles.length,
);
const issueIds = new Set(rows.issues.map((i) => i.issue_id));
check(
  "every claim points at an emitted issue",
  rows.claims.every((c) => issueIds.has(c.issue_id)),
);
check(
  "every position points at an emitted issue",
  rows.positions.every((p) => issueIds.has(p.issue_id)),
);
check(
  "every position's claim_ids are emitted claims of the same candidate",
  rows.positions.every((p) =>
    p.claim_ids.every((id) =>
      rows.claims.some((c) => c.claim_id === id && c.candidate_id === p.candidate_id),
    ),
  ),
);
check(
  "every row carries the race it was built for",
  [...rows.issues, ...rows.claims, ...rows.positions, ...rows.profiles].every(
    (r) => r.race_id === "FL-GOV-general",
  ),
);

/* ---- an empty spine is refused by arithmetic, not by silence ---------- */
const noSpine = buildBriefRows({ ...baseInput(), spine: [] });
check(
  "with no spine, no spine issue and no spine position is invented",
  noSpine.rows.issues.every((i) => i.tier === "candidate") &&
    noSpine.rows.profiles.every((p) => p.audit.spine_issue_count === 0),
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("  all checks passed");
