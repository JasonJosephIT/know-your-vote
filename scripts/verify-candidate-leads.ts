/* Guardrail for the candidate-leads rules (spec
   docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md §4).
   Pure and offline. Fixtures are the people found by the 2026-10-06
   research pass over 525 swept stories.

   Run: node scripts/verify-candidate-leads.ts */

import { FL_COUNTIES, countyFipsFor, countyName } from "../src/lib/fl-counties.ts";
import {
  buildLeads,
  classifyMention,
  isRunningMateOffice,
  leadDedupeKey,
  normalizeName,
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

/* ---- names -------------------------------------------------------------- */

for (const [raw, want] of [
  ["Bryan Ávila", "bryan avila"],
  ["Bryan Avila", "bryan avila"],
  ["Oliver G. Gilbert III", "oliver gilbert"],
  ['Patricia "Patti" Rendon', "patricia rendon"],
  ['Moliere "Moe" Dimanche', "moliere dimanche"],
  ["José Javier Rodríguez", "jose javier rodriguez"],
  ["Victor M. Torres Jr.", "victor torres"],
  ["Gloria Reina O'Neal", "gloria reina o'neal"],
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

const again = buildLeads(mentions, stories, roster, new Set(["bryan avila|running_mate|statewide"]));
check("a key already queued or decided is skipped as already_queued",
  !again.leads.some((l) => l.kind === "running_mate") && again.dropped.some((d) => d.reason === "already_queued"));

if (failures > 0) {
  console.error(`\nverify-candidate-leads: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-candidate-leads: OK — counties, names, kinds, merge, roster and dedupe hold");
