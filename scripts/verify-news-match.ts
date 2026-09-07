/* Guardrail for candidate-news-PRD.md §6 (task C8) — the association matcher.

   Every check here is a neutrality property, not a correctness nicety. The
   matcher decides which candidates a story reaches; each rule below, if it
   broke, would produce a page that still renders and is quietly unfair:

     CN-R9  — `related` attaches to EVERY candidate the ambiguity admits.
              Picking the likeliest one is the editorial discretion §6 removes
              from the pipeline, reintroduced one row at a time.
     CN-R10 — coverage variance counts `named` rows only, because `related`
              counts are equal across a race by construction and would flatter
              the number we publish about our own fairness.

   Pure and offline. Run: node scripts/verify-news-match.ts */

import {
  matchArticle,
  namedCountsByCandidate,
  type Match,
  type RosterCandidate,
} from "../src/lib/news-match.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const c = (candidateId: string, legalName: string, raceId = "race-1"): RosterCandidate =>
  ({ candidateId, legalName, raceId });

/* Two Smiths in one race is the whole point of the `related` tier, and a
   third candidate in another race guards the race-scoping. */
const ROSTER: RosterCandidate[] = [
  c("cand-1", "Maria Elena Vasquez"),
  c("cand-2", "John Smith"),
  c("cand-3", "Alice Smith"),
  c("cand-4", "Robert Chen", "race-2"),
];

const sorted = (m: Match[]) =>
  [...m].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
const shape = (m: Match[]) =>
  sorted(m).map((x) => `${x.candidateId}:${x.relation}`).join(",");

/* ---- named: the deterministic tier ----------------------------------- */

check(
  "full name in the title is named, and only that candidate",
  shape(matchArticle({ title: "Maria Elena Vasquez files for re-election" }, ROSTER)) ===
    "cand-1:named",
  shape(matchArticle({ title: "Maria Elena Vasquez files for re-election" }, ROSTER)),
);

check(
  "full name in the dek counts too",
  shape(matchArticle({ title: "Council roundup", summary: "John Smith spoke." }, ROSTER)) ===
    "cand-2:named",
  shape(matchArticle({ title: "Council roundup", summary: "John Smith spoke." }, ROSTER)),
);

/* A roster middle name the article omits must not break the match, and an
   article middle name the roster omits must not either. */
check(
  "middle name in the roster, not in the article",
  shape(matchArticle({ title: "Maria Vasquez wins" }, ROSTER)) === "cand-1:named",
  shape(matchArticle({ title: "Maria Vasquez wins" }, ROSTER)),
);
check(
  "middle initial in the article",
  shape(matchArticle({ title: "Maria E. Vasquez wins" }, ROSTER)) === "cand-1:named",
  shape(matchArticle({ title: "Maria E. Vasquez wins" }, ROSTER)),
);

/* The failure this guards: filler between the names must NOT be a match. */
const filler = matchArticle({ title: "Maria met John Smith at the fair" }, ROSTER);
check(
  "first name + unrelated filler + surname is not a full-name match",
  !filler.some((m) => m.candidateId === "cand-1" && m.relation === "named"),
  shape(filler),
);

check("honorifics are not name tokens", shape(matchArticle({ title: "Rep. John Smith Jr. resigns" }, ROSTER)).includes("cand-2:named"));
check("accents fold", shape(matchArticle({ title: "María Elena Vásquez wins" }, ROSTER)) === "cand-1:named",
  shape(matchArticle({ title: "María Elena Vásquez wins" }, ROSTER)));
check("case is ignored", shape(matchArticle({ title: "JOHN SMITH RESIGNS" }, ROSTER)).includes("cand-2:named"));

/* ---- related (b): the surname collision ------------------------------ */

const smith = matchArticle({ title: "Commissioner Smith faces questions" }, ROSTER);
check(
  "a bare surname attaches to BOTH Smiths, as related",
  shape(smith) === "cand-2:related,cand-3:related",
  shape(smith),
);
check("a bare surname never produces a named row", !smith.some((m) => m.relation === "named"));

/* One candidate could match, and it is STILL related — the match was not
   deterministic, and the tier records how it was made, not how confident we
   feel about it. */
const vasquezOnly = matchArticle({ title: "Vasquez to hold a town hall" }, ROSTER);
check(
  "a unique surname is related, not named",
  shape(vasquezOnly) === "cand-1:related",
  shape(vasquezOnly),
);

/* The subtlety worth pinning: a full name contains a surname, but that
   surname is already resolved. It must not spray related rows across every
   candidate who shares it. */
const johnNamed = matchArticle({ title: "John Smith wins the primary" }, ROSTER);
check(
  "a full name does not hand a related row to the other Smith",
  shape(johnNamed) === "cand-2:named",
  shape(johnNamed),
);

/* But a full name PLUS a separate bare surname elsewhere still yields both. */
const both = matchArticle(
  { title: "John Smith wins", summary: "Smith will face the incumbent." },
  ROSTER,
);
check(
  "a leftover surname still relates after a full-name match",
  shape(both) === "cand-2:named,cand-3:related",
  shape(both),
);

/* ---- related (a): the race-level story -------------------------------- */

const raceStory = matchArticle(
  { title: "Turnout expected to be low in the district", raceId: "race-1" },
  ROSTER,
);
check(
  "a nameless race story attaches to EVERY candidate in that race",
  shape(raceStory) === "cand-1:related,cand-2:related,cand-3:related",
  shape(raceStory),
);
check("and to nobody in another race", !raceStory.some((m) => m.candidateId === "cand-4"));
check("all of them are related", raceStory.every((m) => m.relation === "related"));

/* Case (a) is for stories that name NOBODY. Once anyone is matched, the
   article is about them, and blanket-attaching it to the field would inflate
   every candidate's page with stories about their opponent. */
const namedInRace = matchArticle(
  { title: "Maria Elena Vasquez leads fundraising", raceId: "race-1" },
  ROSTER,
);
check(
  "a race story that names someone does not also attach to the field",
  shape(namedInRace) === "cand-1:named",
  shape(namedInRace),
);

check("no race id and no name matches nothing", matchArticle({ title: "Weather is nice" }, ROSTER).length === 0);
check("empty title matches nothing", matchArticle({ title: "" }, ROSTER).length === 0);
check("empty roster matches nothing", matchArticle({ title: "John Smith wins" }, []).length === 0);

/* Determinism: the same inputs give the same output, every time. */
const a1 = shape(matchArticle({ title: "Commissioner Smith faces questions" }, ROSTER));
const a2 = shape(matchArticle({ title: "Commissioner Smith faces questions" }, ROSTER));
check("matching is deterministic", a1 === a2);

/* ---- CN-R10: named rows only ----------------------------------------- */

const rows = [
  { candidateId: "cand-1", relation: "named" as const },
  { candidateId: "cand-1", relation: "named" as const },
  { candidateId: "cand-1", relation: "named" as const },
  { candidateId: "cand-2", relation: "named" as const },
  /* Race-level story: every candidate got one. */
  { candidateId: "cand-1", relation: "related" as const },
  { candidateId: "cand-2", relation: "related" as const },
  { candidateId: "cand-3", relation: "related" as const },
];
const race1 = ROSTER.filter((x) => x.raceId === "race-1");
const counts = namedCountsByCandidate(rows, race1);

check("related rows are excluded", counts["cand-1"] === 3 && counts["cand-2"] === 1, JSON.stringify(counts));
check(
  "a candidate the press ignored is counted at zero, not dropped",
  counts["cand-3"] === 0 && "cand-3" in counts,
  JSON.stringify(counts),
);

/* The number this protects. Including `related` would move (max-min)/max from
   1.00 (3 vs 0 — one candidate has no coverage at all) to 0.75 (4 vs 1), a
   materially fairer-looking figure produced by the tier that exists to fill
   pages. */
const withRelated: Record<string, number> = {};
for (const cand of race1) withRelated[cand.candidateId] = 0;
for (const r of rows) if (r.candidateId in withRelated) withRelated[r.candidateId] += 1;
const variance = (v: Record<string, number>) => {
  const n = Object.values(v);
  const max = Math.max(...n);
  return max === 0 ? 0 : (max - Math.min(...n)) / max;
};
check(
  "including related would understate the gap",
  variance(counts) > variance(withRelated),
  `named-only ${variance(counts)} vs all ${variance(withRelated)}`,
);
check("the named-only figure is the honest one", variance(counts) === 1);

check("no rows, no counts above zero", Object.values(namedCountsByCandidate([], race1)).every((n) => n === 0));
check(
  "a row for a candidate outside the race is ignored",
  namedCountsByCandidate([{ candidateId: "cand-4", relation: "named" }], race1)["cand-4"] === undefined,
);

if (failures > 0) {
  console.error(`\nverify-news-match: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-news-match: OK — ambiguity resolves toward symmetry, and only named rows reach the audit");
