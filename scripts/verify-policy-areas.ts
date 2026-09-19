/* Guardrail for the candidate policy-area categorization —
   src/lib/policy-areas.ts, docs/general-election/policy-area-categorization.md.

   Like the news taxonomy, this is EDITORIAL CONTENT wearing code's clothes,
   and each property below is one that would fail quietly rather than loudly:

     - A bare topic word claimed by two areas would put the same issue under
       both, and the chips would read as a judgment nobody made.
     - An alias that resolves somewhere other than its own area is a mapping
       that looks reviewed and is not: the reader of TITLE_ALIASES would draw
       the wrong conclusion about what it does.
     - A title that quietly acquires an area it has no business in
       ("Economic Development" under Housing) mislabels a candidate's platform
       on a voter-facing page.
     - A title that quietly LOSES its area leaves the browse filter hiding
       candidates who do have a stated position.
     - Drift between POLICY_AREAS and the taxonomy breaks the one thing the
       shared ids buy: the area a voter picks in the quiz, the area on a brief,
       and the area on a news card must be the same area.

   Pure and offline: no DB, no network, no model. Run:
     node scripts/verify-policy-areas.ts */

import {
  POLICY_AREAS,
  POLICY_AREA_TAXONOMY_VERSION,
  TITLE_ALIASES,
  categorizeIssue,
  isPolicyAreaId,
  policyAreaIdsFor,
  policyAreaLabel,
  policyAreasFor,
} from "../src/lib/policy-areas.ts";
import { CATEGORIES, SUB_ISSUES, TAXONOMY_VERSION } from "../src/lib/news-issues.ts";
import { findBannedTermMatch } from "../src/lib/neutrality.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const ids = (title: string, description?: string) =>
  policyAreaIdsFor({ title, description }).join(",");

/* ---- the areas ARE the taxonomy's categories ------------------------- */
check(
  "POLICY_AREAS mirrors the taxonomy categories, in order",
  POLICY_AREAS.length === CATEGORIES.length &&
    POLICY_AREAS.every(
      (a, i) => a.id === CATEGORIES[i].id && a.label === CATEGORIES[i].label
    )
);
check(
  "area ids are unique",
  new Set(POLICY_AREAS.map((a) => a.id)).size === POLICY_AREAS.length
);
check(
  "the taxonomy version is carried, not re-invented",
  POLICY_AREA_TAXONOMY_VERSION === TAXONOMY_VERSION &&
    POLICY_AREA_TAXONOMY_VERSION.trim().length > 0
);

/* ---- labels are voter-facing, so they take the neutrality lint ------- */
for (const area of POLICY_AREAS) {
  const hit = findBannedTermMatch(area.label);
  check(`area label is neutral: ${area.label}`, hit === null, hit?.term);
}

/* ---- TITLE_ALIASES: the hand-written part --------------------------- */
const areaIds = POLICY_AREAS.map((a) => a.id);
for (const [id, aliases] of Object.entries(TITLE_ALIASES)) {
  check(`TITLE_ALIASES key is an area: ${id}`, areaIds.includes(id));
  check(`TITLE_ALIASES has entries for ${id}`, aliases.length > 0);
  for (const alias of aliases) {
    check(
      `alias is non-empty: ${id}/${alias}`,
      alias.trim().length > 1
    );
    const hit = findBannedTermMatch(alias);
    check(`alias is neutral: ${id}/${alias}`, hit === null, hit?.term);
    /* The property that makes the list readable: an alias standing alone as a
       title lands in its own area, and ONLY in its own area. If a new alias
       also drags in a second area, the list no longer says what it appears to
       say. */
    check(`alias resolves to its own area alone: ${id}/${alias}`,
      ids(alias) === id, `got "${ids(alias)}"`);
  }
}
/* Every area needs at least one bare topic word, or it is unreachable from a
   one-word title. Adding an area to the taxonomy should fail here until
   someone decides what a title for it looks like. */
for (const area of POLICY_AREAS) {
  check(
    `every area has a bare topic word: ${area.id}`,
    (TITLE_ALIASES[area.id] ?? []).length > 0
  );
}
const seen = new Map<string, string>();
for (const [id, aliases] of Object.entries(TITLE_ALIASES)) {
  for (const alias of aliases) {
    const norm = alias.trim().toLowerCase();
    const owner = seen.get(norm);
    check(
      `no bare topic word is claimed twice: "${norm}"`,
      owner === undefined,
      owner ? `${owner} and ${id}` : ""
    );
    seen.set(norm, id);
  }
}

/* ---- identity: a label categorizes as itself ------------------------ */
for (const c of CATEGORIES) {
  const m = categorizeIssue({ title: c.label });
  check(`category label is itself: ${c.label}`,
    m.basis === "label" && m.areas.length === 1 && m.areas[0].id === c.id,
    `got ${m.basis}/${m.areas.map((a) => a.id).join(",")}`);
}
for (const s of SUB_ISSUES) {
  const m = categorizeIssue({ title: s.label });
  check(`sub-issue label rolls up: ${s.label}`,
    m.basis === "label" &&
      m.areas.length === 1 &&
      m.areas[0].id === s.categoryId &&
      m.subIssues.some((x) => x.id === s.id),
    `got ${m.basis}/${m.areas.map((a) => a.id).join(",")}`);
}

/* ---- real issue titles ----------------------------------------------
   Every title below is one the app actually renders: the spine and
   candidate-tier issues in scripts/demo-seed.sql, which are the shape the
   pipeline writes. Expected values are what a reader of the taxonomy would
   predict, which is the whole claim this file makes. */
const FIXTURES: Array<{ title: string; areas: string; basis: string }> = [
  { title: "Economy & Affordability", areas: "economy", basis: "label" },
  { title: "Education", areas: "education", basis: "label" },
  { title: "Environment & Water", areas: "environment", basis: "label" },
  { title: "Insurance & Property Costs", areas: "insurance", basis: "label" },
  { title: "Public Safety & Crime", areas: "safety", basis: "label" },
  { title: "Housing", areas: "housing", basis: "label" },
  { title: "Property taxes", areas: "insurance", basis: "label" },
  /* Titles the taxonomy reaches by phrase rather than identity. */
  { title: "Water & Land Use", areas: "environment", basis: "alias" },
  { title: "Farming & Rural Economy", areas: "economy", basis: "alias" },
  { title: "Teacher Pay & Classroom Funding", areas: "education", basis: "alias" },
  { title: "Hurricane Coverage and Premiums", areas: "insurance", basis: "alias" },
  /* Race-specific issues with no home in the shared taxonomy. Filing these
     under the nearest plausible parent is the mistake this project does not
     make quietly, so "none" is the assertion, not a gap. */
  { title: "Consumer Protection", areas: "", basis: "none" },
  { title: "Government Transparency", areas: "", basis: "none" },
  { title: "Government Accountability", areas: "", basis: "none" },
  { title: "Financial Transparency", areas: "", basis: "none" },
  { title: "State Budget & Spending", areas: "", basis: "none" },
];
for (const f of FIXTURES) {
  const m = categorizeIssue({ title: f.title });
  check(`title maps as documented: ${f.title}`,
    m.areas.map((a) => a.id).join(",") === f.areas && m.basis === f.basis,
    `got ${m.basis}/"${m.areas.map((a) => a.id).join(",")}"`);
}

/* ---- the two failure modes that would look fine ---------------------- */
check("a bare word does not match inside a longer word",
  ids("Watershed Management") === "", `got "${ids("Watershed Management")}"`);
check("Economic Development is not a housing issue",
  ids("Economic Development") === "", `got "${ids("Economic Development")}"`);
check("an issue can span two areas when it genuinely does",
  ids("Housing and Property Insurance") === "housing,insurance",
  `got "${ids("Housing and Property Insurance")}"`);

/* ---- the headline-only aliases, and their evidence -------------------
   Each line is the title that earned an alias its place on that list. The
   right-hand side is what the title means to a voter, not what the word means
   inside a news headline. */
check("Hurricane coverage is insurance, not healthcare",
  ids("Hurricane Coverage and Premiums") === "insurance",
  `got "${ids("Hurricane Coverage and Premiums")}"`);
check("Juvenile detention is not an immigration issue",
  ids("Juvenile Detention") === "", `got "${ids("Juvenile Detention")}"`);
check("Teacher certification is education, not election integrity",
  ids("Teacher Certification") === "education",
  `got "${ids("Teacher Certification")}"`);
check("Historic restoration is not Everglades restoration",
  ids("Historic Preservation and Restoration") === "",
  `got "${ids("Historic Preservation and Restoration")}"`);
/* Narrowed, not removed: each of those sub-issues is still reachable. */
check("B2 is still reachable without \"coverage\"",
  ids("Healthcare access and costs") === "healthcare");
check("A5 is still reachable without \"restoration\"",
  ids("Everglades Cleanup") === "environment");
check("B3 is still reachable without \"detention\"",
  ids("Immigration and border enforcement") === "immigration");
check("B6 is still reachable without \"certification\"",
  ids("Election integrity") === "elections");

/* ---- title-only rule for bare topic words ---------------------------- */
check("a bare topic word in the description does not categorize",
  ids("Consumer Protection", "Water rates and utility oversight") === "",
  `got "${ids("Consumer Protection", "Water rates and utility oversight")}"`);
check("a phrase alias in the description does categorize",
  ids("Consumer Protection", "Property insurance premiums and rate filings") ===
    "insurance");

/* ---- nothing in, nothing out ----------------------------------------- */
for (const empty of ["", "   ", "—", "…"]) {
  const m = categorizeIssue({ title: empty });
  check(`empty title yields no area: "${empty}"`,
    m.basis === "none" && m.areas.length === 0 && m.subIssues.length === 0);
}

/* ---- pure: same input, same output ----------------------------------- */
const twice = [
  categorizeIssue({ title: "Water & Land Use" }),
  categorizeIssue({ title: "Water & Land Use" }),
];
check("categorization is deterministic",
  JSON.stringify(twice[0]) === JSON.stringify(twice[1]));
check("casing and punctuation do not change the answer",
  ids("ECONOMY  &&  AFFORDABILITY!") === ids("Economy & Affordability"));

/* ---- helpers --------------------------------------------------------- */
check("policyAreasFor returns taxonomy order",
  policyAreasFor(["safety", "economy"]).map((a) => a.id).join(",") ===
    "economy,safety");
check("policyAreasFor ignores unknown ids",
  policyAreasFor(["nope", "housing"]).map((a) => a.id).join(",") === "housing");
check("policyAreaLabel resolves and refuses", 
  policyAreaLabel("housing") === "Housing" && policyAreaLabel("nope") === null);
check("isPolicyAreaId guards query-string input",
  isPolicyAreaId("housing") &&
    !isPolicyAreaId("housing ") &&
    !isPolicyAreaId("") &&
    !isPolicyAreaId(undefined));

if (failures > 0) {
  console.error(`\nverify-policy-areas: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-policy-areas: OK (${POLICY_AREAS.length} areas, ` +
    `${Object.values(TITLE_ALIASES).flat().length} bare topic words, ` +
    `${FIXTURES.length} title fixtures, taxonomy v${POLICY_AREA_TAXONOMY_VERSION})`
);
