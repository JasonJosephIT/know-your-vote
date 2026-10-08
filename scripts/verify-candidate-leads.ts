/* Guardrail for the candidate-leads rules (spec
   docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md §4).
   Pure and offline. Fixtures are the people found by the 2026-10-06
   research pass over 525 swept stories.

   Run: node scripts/verify-candidate-leads.ts */

import { FL_COUNTIES, countyFipsFor, countyName } from "../src/lib/fl-counties.ts";
import {
  COVERED_FIPS,
  buildLeads,
  classifyMention,
  RUNNING_MATE_PATTERN,
  isRunningMateOffice,
  keepForReading,
  leadDedupeKey,
  mentionsRunningMate,
  normalizeName,
  planQueue,
  type Mention,
  type StoryRef,
} from "../src/lib/candidate-leads.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- counties --------------------------------------------------------- */

check("67 Florida counties", FL_COUNTIES.length === 67, String(FL_COUNTIES.length));
check("every FIPS is 12 + three digits, unique",
  FL_COUNTIES.every((c) => /^12\d{3}$/.test(c.fips)) && new Set(FL_COUNTIES.map((c) => c.fips)).size === 67);
for (const [name, want] of [
  ["Palm Beach", "12099"],
  ["Palm Beach County", "12099"],
  ["palm beach county", "12099"],
  ["Miami-Dade", "12086"],
  ["Dade", "12086"],
  ["St. Johns", "12109"],
  ["Saint Johns County", "12109"],
  ["St. Lucie", "12111"],
  ["DeSoto", "12027"],
  ["De Soto", "12027"],
  ["Hendry", "12051"],
  ["statewide", null],
  ["Nowhere", null],
  ["", null],
] as const) {
  check(`countyFipsFor(${JSON.stringify(name)})`, countyFipsFor(name) === want, String(countyFipsFor(name)));
}
check("countyName round-trips", countyName("12099") === "Palm Beach" && countyName("12999") === null);
for (const c of FL_COUNTIES) {
  check(`countyFipsFor(${JSON.stringify(c.name)}) is its own fips`, countyFipsFor(c.name) === c.fips, String(countyFipsFor(c.name)));
}

/* ---- names -------------------------------------------------------------- */

for (const [raw, want] of [
  ["Bryan Ávila", "bryan avila"],
  ["Bryan Avila", "bryan avila"],
  ["Oliver G. Gilbert III", "oliver gilbert"],
  ['Patricia "Patti" Rendon', "patricia rendon"],
  ["Patricia \u201CPatti\u201D Rendon", "patricia rendon"],
  ["Moliere \u201CMoe\u201D Dimanche", "moliere dimanche"],
  ["José Javier Rodríguez", "jose javier rodriguez"],
  ["Victor M. Torres Jr.", "victor torres"],
  ["Gloria Reina O'Neal", "gloria reina o'neal"],
  ["Gloria Reina O\u2019Neal", "gloria reina o'neal"],
  ["Gloria Reina O\u2018Neal", "gloria reina o'neal"],
  ["  Mario   Diaz-Balart ", "mario diaz-balart"],
] as const) {
  check(`normalizeName(${JSON.stringify(raw)})`, normalizeName(raw) === want, normalizeName(raw));
}

/* ---- classification ------------------------------------------------------ */

const m = (over: Partial<Mention>): Mention => ({
  name: "Elizabeth Holmes",
  office: "Florida House, District 94",
  jurisdiction: "District 94",
  county: "Palm Beach",
  evidence: "State House Candidate Elizabeth Holmes",
  stories: [1],
  florida_2026: true,
  ...over,
});

check("lieutenant governor reads as a running mate",
  isRunningMateOffice("Lieutenant Governor") && isRunningMateOffice("Lt. Gov.") && isRunningMateOffice("aspirante a vicegobernador"));
check("governor alone is not a running mate", !isRunningMateOffice("Governor"));
for (const office of [
  "Running mate",
  "running mate to Byron Donalds",
  "Lieutenant Gov.",
  "lieutenant-governor",
  "Lieutenant  Governor",
  "compañera de fórmula",
  "compan\u0303ero de formula",
]) {
  check(`office ${JSON.stringify(office)} reads as a running mate`, isRunningMateOffice(office));
}
for (const office of ["Governor", "Florida House, District 94", "Mayor of Clewiston", "Lieutenant Colonel"]) {
  check(`office ${JSON.stringify(office)} is not a running mate`, !isRunningMateOffice(office));
}

/* prep keeps a story that matched a roster candidate when it mentions a
   running mate: such a story names the governor candidate, who is on the roster. */
for (const text of [
  "Donalds picks Bryan Avila as running mate",
  "compañera de fórmula",
  "compan\u0303era de formula",
  "Jolly names his Lt. Gov. pick",
  "The lieutenant governor slot is still open",
  "Candidato a vicegobernador anunciado",
]) {
  check(`a story reading ${JSON.stringify(text)} mentions a running mate`, mentionsRunningMate(text));
}
for (const text of ["Governor race heats up", "", "Lieutenant Colonel retires", "Mate in two: chess club meets"]) {
  check(`a story reading ${JSON.stringify(text)} does not mention a running mate`, !mentionsRunningMate(text));
}
check("prep keeps an unmatched story",
  keepForReading(false, "Mayor race in Clewiston", "Two qualify"));
check("prep drops a story that matched a roster candidate",
  !keepForReading(true, "Donalds leads in new poll", "The governor race tightens"));
check("prep keeps a matched story whose title names a running mate",
  keepForReading(true, "Donalds picks Bryan Avila as running mate", "A Miami senator joins the ticket"));
check("prep keeps a matched story whose summary names a running mate",
  keepForReading(true, "Donalds names his ticket", "Compañera de fórmula anunciada"));
check("prep reads a missing summary as empty",
  !keepForReading(true, "Donalds leads in new poll", null) && keepForReading(true, "Lt. Gov. pick due", null));
check("the running-mate pattern keeps no match state between calls (no g or y flag)",
  !RUNNING_MATE_PATTERN.global && !RUNNING_MATE_PATTERN.sticky
    && mentionsRunningMate("running mate") && mentionsRunningMate("running mate"));

check("Palm Beach race is an other-county lead",
  JSON.stringify(classifyMention(m({}))) === JSON.stringify({ kind: "other_county", county_fips: "12099" }));
check("a running mate is a lead whatever the county field says",
  JSON.stringify(classifyMention(m({ name: "Bryan Avila", office: "Lieutenant Governor", county: "statewide" })))
    === JSON.stringify({ kind: "running_mate", county_fips: null }));
check("a covered-county race is dropped",
  JSON.stringify(classifyMention(m({ name: "George E. Morgan", office: "Mayor of North Miami", county: "Miami-Dade" })))
    === JSON.stringify({ drop: "covered_county" }));
check("a non-Florida or non-2026 race is dropped",
  JSON.stringify(classifyMention(m({ name: "Wyman Duggan", office: "Mayor of Jacksonville", county: "Duval", florida_2026: false })))
    === JSON.stringify({ drop: "not_florida_2026" }));
check("an unknown or statewide county (not a running mate) is dropped",
  JSON.stringify(classifyMention(m({ name: "James Byrd", office: "U.S. Senate", county: "statewide" })))
    === JSON.stringify({ drop: "unknown_county" }));

check("the covered counties are exactly four", COVERED_FIPS.size === 4, String(COVERED_FIPS.size));
for (const fips of COVERED_FIPS) {
  check(`covered fips ${fips} is a Florida county`, FL_COUNTIES.some((c) => c.fips === fips), fips);
}
for (const county of ["Broward", "Hillsborough", "Miami-Dade", "Orange"]) {
  check(`a ${county} race classifies as covered_county`,
    JSON.stringify(classifyMention(m({ county }))) === JSON.stringify({ drop: "covered_county" }),
    JSON.stringify(classifyMention(m({ county }))));
}

check("dedupe key: normalized name, kind, county",
  leadDedupeKey("Bryan Ávila", "running_mate", null) === "bryan avila|running_mate|statewide"
    && leadDedupeKey("Elizabeth Holmes", "other_county", "12099") === "elizabeth holmes|other_county|12099");

/* ---- building leads -------------------------------------------------------- */

const story = (i: number): StoryRef => ({
  url: `https://flvoicenews.com/story-${i}`,
  title: `Story ${i}`,
  outlet: "Florida's Voice",
  published_at: "2026-10-05T12:00:00.000Z",
});
const stories = new Map([1, 2, 3, 4].map((i) => [i, story(i)]));
const roster = ["Oliver G. Gilbert III", "Byron Donalds"];

const mentions: Mention[] = [
  m({ name: "Bryan Avila", office: "Lieutenant Governor", county: "statewide", stories: [1] }),
  m({ name: "Bryan Ávila", office: "vicegobernador", county: "", stories: [2] }),
  m({ stories: [3] }),
  m({ name: "Oliver Gilbert", office: "U.S. House, District 24", county: "Miami-Dade", stories: [4] }),
  m({ name: "Byron Donalds", office: "Lieutenant Governor", county: "statewide", stories: [1] }),
  m({ name: "Derrick Scott Hughes", office: "Clewiston City Commission", county: "Hendry", stories: [99] }),
];
const built = buildLeads(mentions, stories, roster, new Set());
const avila = built.leads.find((l) => l.kind === "running_mate");
check("two mentions of one person merge into one lead with both stories",
  built.leads.filter((l) => l.kind === "running_mate").length === 1 && avila?.stories.length === 2,
  JSON.stringify(avila));
check("the other-county lead carries its county", built.leads.some((l) => l.kind === "other_county" && l.county_fips === "12099"));
check("a roster name is dropped as on_roster", built.dropped.some((d) => d.name === "Byron Donalds" && d.reason === "on_roster"));
check("a covered-county roster person drops as covered_county first",
  built.dropped.some((d) => d.name === "Oliver Gilbert" && d.reason === "covered_county"));
check("a mention whose stories are unknown is dropped as no_story",
  built.dropped.some((d) => d.name === "Derrick Scott Hughes" && d.reason === "no_story"));
check("exactly two leads", built.leads.length === 2, JSON.stringify(built.leads.map((l) => l.dedupe_key)));
check("leads come out sorted by key (deterministic)",
  JSON.stringify(built.leads.map((l) => l.dedupe_key)) === JSON.stringify([...built.leads.map((l) => l.dedupe_key)].sort()));

/* Order is by code unit, not locale: "ann leeds|..." sorts before "ann lee|..."
   because "d" (0x64) is below "|" (0x7C); localeCompare ranks them the other way. */
const sorted = buildLeads(
  [m({ name: "Ann Lee", stories: [1] }), m({ name: "Ann Leeds", stories: [2] })],
  stories, [], new Set());
check("leads sort by code unit, not by locale",
  JSON.stringify(sorted.leads.map((l) => l.dedupe_key))
    === JSON.stringify(["ann leeds|other_county|12099", "ann lee|other_county|12099"]),
  JSON.stringify(sorted.leads.map((l) => l.dedupe_key)));

const twice = buildLeads([m({ name: "Dee Dup", stories: [1, 1] })], stories, [], new Set());
check("a story listed twice on a first mention appears once",
  twice.leads.length === 1 && twice.leads[0].stories.length === 1,
  JSON.stringify(twice.leads[0]?.stories.map((s) => s.url)));

const blank = buildLeads(
  [
    m({ name: "", stories: [1] }),
    m({ name: "   ", stories: [1] }),
    m({ name: "Jr.", stories: [1] }),
    m({ name: " ", florida_2026: false, stories: [1] }),
  ],
  stories, [], new Set());
check("a blank or whitespace-only name never becomes a lead", blank.leads.length === 0, JSON.stringify(blank.leads));
check("each blank name is dropped as no_name, even when it would also fail classification",
  blank.dropped.length === 4 && blank.dropped.every((d) => d.reason === "no_name"),
  JSON.stringify(blank.dropped));

const again = buildLeads(mentions, stories, roster, new Set(["bryan avila|running_mate|statewide"]));
check("a key already queued or decided is skipped as already_queued",
  !again.leads.some((l) => l.kind === "running_mate") && again.dropped.some((d) => d.reason === "already_queued"));

/* ---- the queue batch ---------------------------------------------------- */

const verified = built.leads.map((l) => ({
  ...l,
  verification: { status: "unchecked" as const, url: null, note: "fixture" },
}));
const q = planQueue(verified, new Set());
check("a valid batch plans one pending candidate_lead row per lead",
  q.ok && q.rows.length === 2 && q.rows.every((r) => r.kind === "candidate_lead" && r.source === "agent:R5" && r.status === "pending"),
  JSON.stringify(q));

const tampered = planQueue([{ ...verified[0], dedupe_key: "someone else|other_county|12099" }], new Set());
check("a dedupe_key that does not match the lead is refused", !tampered.ok);

const oneBad = planQueue([verified[0], { ...verified[1], stories: [] }], new Set());
check("one invalid lead refuses the whole batch (no partial queue)", !oneBad.ok);

const queuedAlready = planQueue(verified, new Set([verified[0].dedupe_key]));
check("a lead queued since check ran is skipped, not re-queued",
  queuedAlready.ok && queuedAlready.rows.length === 1 && queuedAlready.skipped.length === 1);

const dupInBatch = planQueue([verified[0], verified[0]], new Set());
check("the same lead twice in one batch is queued once",
  dupInBatch.ok && dupInBatch.rows.length === 1 && dupInBatch.skipped.length === 1);

check("a batch that is not an array is refused", !planQueue({ leads: verified }, new Set()).ok);

/* The schema takes any 12xxx code; the plan also requires a real Florida county. */
const otherCounty = verified.find((l) => l.kind === "other_county")!;
const notACounty = planQueue(
  [{ ...otherCounty, county_fips: "12002", dedupe_key: leadDedupeKey(otherCounty.name, "other_county", "12002") }],
  new Set());
check("a county_fips that is not a Florida county is refused, even with a matching dedupe_key",
  !notACounty.ok && notACounty.errors.some((e) => e.includes("12002") && e.includes("not a Florida county")),
  JSON.stringify(notACounty));

if (failures > 0) {
  console.error(`\nverify-candidate-leads: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-candidate-leads: OK — counties, names, kinds, merge, roster, dedupe and the queue batch hold");
