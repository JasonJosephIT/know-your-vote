/* Guardrail for the pure characterizer core —
   docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.3–§4.7.

   The properties here are neutrality properties, not correctness niceties:

     §4.3 — the state we build carries NO identity we supplied. Most of all it
            carries no outlet host: a model that can see "floridapolitics.com"
            can tag by outlet, and the whole point of this unit is that the
            request has no identity in it except what the headline itself says.
     §4.4 — the response is a closed set of numbers keyed by taxonomy id. An
            unknown id, a non-number or an out-of-range value is dropped, never
            coerced. There is no field a lean could arrive in.
     §4.6 — NULL (not characterized) and [] (characterized, nothing over
            threshold) are different facts. applyThreshold returns [], and the
            caller must never write that as NULL.
     §4.7 — buildQuestions is deterministic. Provenance hashes it, so a
            non-deterministic builder would make every run incomparable.

   THE TAXONOMY BELOW IS A FIXTURE, DELIBERATELY NOT THE REAL LIST. Gate G3 is
   open (docs/general-election/news-issue-taxonomy-options-2026-09-18.md), and
   this file proves the core does not care which list wins: the taxonomy is a
   parameter, so nothing here has to change when G3 is answered.

   Pure and offline. Run: node scripts/verify-news-characterize.ts */

import {
  DEFAULT_THRESHOLD,
  applyThreshold,
  buildQuestions,
  buildState,
  provenance,
  slugPath,
  type NewsIssue,
} from "../src/lib/news-characterize.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* A fixture taxonomy. Three issues, in an order that is NOT alphabetical, so
   the "taxonomy order, not response order" check below actually proves
   something rather than coinciding with a sort. */
const TAXONOMY: readonly NewsIssue[] = [
  { id: "housing", label: "Housing", aliases: ["rent", "zoning"] },
  { id: "economy", label: "Economy", aliases: ["jobs", "inflation"] },
  { id: "safety", label: "Public Safety", aliases: ["police"] },
];
const IDS = TAXONOMY.map((i) => i.id);
const VERSION = "fixture-1";

/* ---- slugPath: the host must never survive ---------------------------- */
check("slugPath drops the host",
  slugPath("https://www.floridapolitics.com/archives/12345/insurance-rates") ===
    "/archives/12345/insurance-rates");
check("slugPath drops the query and hash",
  slugPath("https://example.com/a/b?utm_source=x#frag") === "/a/b");
check("slugPath returns null for a bare origin", slugPath("https://example.com/") === null);
check("slugPath returns null for junk", slugPath("not a url") === null);

/* ---- buildState: no identity we supplied ------------------------------ */
const state = buildState({
  title: "Broward property insurance rates rise again",
  summary: "County homeowners face a fourth straight increase.",
  url: "https://www.sun-sentinel.com/2026/09/18/broward-insurance/",
});
check("state has exactly three keys",
  JSON.stringify(Object.keys(state).sort()) === '["dek","headline","slug"]',
  Object.keys(state).join(","));
const serialized = JSON.stringify(state);
check("the outlet host is absent from the state",
  !serialized.includes("sun-sentinel"), serialized);
check("the headline survives", state.headline.includes("Broward"));
check("the dek survives", (state.dek ?? "").includes("fourth straight"));

/* A sitemap row: title and URL, no dek. This is the input floor (§4.2) and it
   must produce a valid state rather than an error. */
const sitemapState = buildState({
  title: "Orange County schools budget vote set",
  summary: null,
  url: "https://www.orlandosentinel.com/2026/09/18/schools-budget/",
});
check("a missing dek yields null, not an empty string", sitemapState.dek === null);
check("a whitespace-only dek is also null",
  buildState({ title: "t", summary: "   ", url: "https://e.com/a" }).dek === null);
check("a sitemap row still gets a slug", sitemapState.slug === "/2026/09/18/schools-budget");

/* ---- buildQuestions: deterministic, closed, one per issue ------------- */
const q1 = buildQuestions(TAXONOMY);
const q2 = buildQuestions(TAXONOMY);
check("buildQuestions is deterministic", JSON.stringify(q1) === JSON.stringify(q2));
check("one question per issue", Object.keys(q1).length === TAXONOMY.length);
check("question names are the issue ids",
  JSON.stringify(Object.keys(q1)) === JSON.stringify(IDS));
check("every question is a noul", Object.values(q1).every((q) => q.type === "noul"));
check("every question has both criteria",
  Object.values(q1).every((q) => q.criteria.true.length > 0 && q.criteria.false.length > 0));
check("a question names its own issue and no other",
  q1.housing.instructions.includes("Housing") && !q1.housing.instructions.includes("Economy"));
/* Identical scaffolding across issues: no issue gets a more persuasive
   question than another. Strip each issue's own words and the rest must match. */
const skeleton = (id: string) => {
  const issue = TAXONOMY.find((i) => i.id === id)!;
  return q1[id].instructions
    .replaceAll(issue.label, "<L>")
    .replaceAll(issue.aliases.join(", "), "<A>");
};
check("every issue gets the same question scaffolding",
  new Set(IDS.map(skeleton)).size === 1, JSON.stringify([...new Set(IDS.map(skeleton))]));

/* ---- applyThreshold: closed set, fail-closed -------------------------- */
const n = (noul: number | string | null) => ({ type: "noul", noul });
const over = applyThreshold({ housing: n(0.91), economy: n(0.12) }, 0.7, IDS);
check("a value over threshold tags", JSON.stringify(over) === '["housing"]', JSON.stringify(over));
check("a value exactly at the threshold tags",
  JSON.stringify(applyThreshold({ housing: n(0.7) }, 0.7, IDS)) === '["housing"]');

const none = applyThreshold({ housing: n(0.2) }, 0.7, IDS);
check("nothing over threshold yields an empty array, not null",
  Array.isArray(none) && none.length === 0);

check("an id outside the taxonomy is dropped",
  applyThreshold({ trade_policy: n(0.99) }, 0.7, IDS).length === 0);

check("a non-number is dropped", applyThreshold({ housing: n("0.9") }, 0.7, IDS).length === 0);
check("an out-of-range value is dropped", applyThreshold({ economy: n(1.4) }, 0.7, IDS).length === 0);
check("a negative value is dropped", applyThreshold({ economy: n(-0.1) }, 0.7, IDS).length === 0);
check("NaN is dropped", applyThreshold({ economy: n(Number.NaN) }, 0.7, IDS).length === 0);
check("a null answer is dropped", applyThreshold({ safety: null }, 0.7, IDS).length === 0);
check("a missing answer is dropped", applyThreshold({}, 0.7, IDS).length === 0);

check("a `lean` key cannot become a tag",
  JSON.stringify(applyThreshold({ housing: n(0.9), lean: n(0.99) }, 0.7, IDS)) === '["housing"]');
check("a free-text field cannot become a tag",
  applyThreshold({ summary: { type: "text", text: "leans right" } } as never, 0.7, IDS).length === 0);

check("tags come back in taxonomy order, not response order",
  JSON.stringify(applyThreshold({ safety: n(0.9), economy: n(0.9) }, 0.7, IDS)) ===
    '["economy","safety"]');

check("DEFAULT_THRESHOLD is in range", DEFAULT_THRESHOLD > 0 && DEFAULT_THRESHOLD < 1);

/* ---- provenance: reproducible and comparable -------------------------- */
const p1 = provenance("jev-1.13.0", q1, VERSION);
check("provenance is stable for the same inputs",
  p1 === provenance("jev-1.13.0", q2, VERSION));
check("provenance names the model", p1.includes("jev-1.13.0"));
check("provenance names the taxonomy version", p1.includes(VERSION));
const mutated = { ...q1, housing: { ...q1.housing, instructions: q1.housing.instructions + " " } };
check("provenance changes when a question changes",
  provenance("jev-1.13.0", mutated, VERSION) !== p1);
check("provenance changes when the model changes",
  provenance("jev-9.9.9", q1, VERSION) !== p1);
check("provenance changes when the taxonomy version changes",
  provenance("jev-1.13.0", q1, "fixture-2") !== p1);
/* The whole point: a different taxonomy must not silently reuse a hash. */
check("provenance changes when the taxonomy itself changes",
  provenance("jev-1.13.0", buildQuestions(TAXONOMY.slice(0, 2)), VERSION) !== p1);

if (failures > 0) {
  console.error(`\nverify-news-characterize: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-news-characterize: OK — no identity in the state, closed response set, reproducible provenance");
