/* /news says what its feed delivers.

   Two promises on /news were not kept. "Pick a county to see its news too":
   the county rows live on 2026-10-05 (the nine county Supervisor of
   Elections items) carry a metro and no county_fips, and the county filter
   matched county_fips only, so a pick showed the statewide feed under a
   "Showing Miami-Dade County" heading. And the intro promised "candidate
   news, pipeline updates", which are race-scoped and never reach a feed that
   asks for no race.

     1. newsScopes() (src/lib/news-scope.ts): statewide first; a county also
        brings in its metro; nothing else changes.
     2. Over the live rows' shapes, each county pick now reaches its own
        Supervisor's rows and no other county's, the statewide rows still
        reach everyone, and race-scoped rows reach nobody without a race.
     3. /api/news builds its filter with newsScopes(); the /news intro no
        longer promises candidate news or pipeline updates; NewsFeed no
        longer promises a "daily refresh" the cron does not do.

   Run: node scripts/verify-news-scope.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COVERED_COUNTIES } from "../src/lib/counties.ts";
import { newsScopes } from "../src/lib/news-scope.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const code = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const STATEWIDE = "and(race_id.is.null,metro.is.null,county_fips.is.null)";

console.log("1. newsScopes()");
check("no location: statewide only", JSON.stringify(newsScopes({})) === JSON.stringify([STATEWIDE]));
for (const c of COVERED_COUNTIES) {
  const scopes = newsScopes({ county: c.fips });
  check(
    `${c.name}: statewide, its metro (${c.metro}) and its county`,
    JSON.stringify(scopes) ===
      JSON.stringify([STATEWIDE, `metro.eq.${c.metro}`, `county_fips.eq.${c.fips}`]),
    JSON.stringify(scopes)
  );
}
check(
  "a ZIP's metro and county together name the metro once; races are added",
  JSON.stringify(newsScopes({ metro: "tampa", county: "12057", raceIds: ["FL-14-general"] })) ===
    JSON.stringify([STATEWIDE, "metro.eq.tampa", "county_fips.eq.12057", "race_id.in.(FL-14-general)"])
);
check(
  "an uncovered county adds no metro",
  JSON.stringify(newsScopes({ county: "12099" })) ===
    JSON.stringify([STATEWIDE, "county_fips.eq.12099"])
);

console.log("\n2. Over the live rows");
type Row = { race_id: string | null; metro: string | null; county_fips: string | null };
/* The PostgREST clauses newsScopes() emits, evaluated in JS. */
function inScope(row: Row, scopes: string[]): boolean {
  return scopes.some((s) => {
    if (s === STATEWIDE) return !row.race_id && !row.metro && !row.county_fips;
    const m = s.match(/^(metro|county_fips)\.eq\.(.+)$/);
    if (m) return row[m[1] as "metro" | "county_fips"] === m[2];
    const r = s.match(/^race_id\.in\.\((.*)\)$/);
    if (r) return row.race_id !== null && r[1].split(",").includes(row.race_id);
    throw new Error(`unknown clause ${s}`);
  });
}
/* Shapes of news_item on 2026-10-05: per metro, the Supervisor rows; the
   statewide rows; a race-scoped pipeline_event. */
const ROWS: (Row & { label: string })[] = [
  ...["miami", "miami", "miami", "fort_lauderdale", "fort_lauderdale", "tampa", "tampa", "tampa", "orlando"].map(
    (metro, i) => ({ label: `${metro} Supervisor row ${i}`, race_id: null, metro, county_fips: null })
  ),
  { label: "statewide dates", race_id: null, metro: null, county_fips: null },
  { label: "Race published: Governor", race_id: "FL-GOV-general", metro: null, county_fips: null },
];
for (const c of COVERED_COUNTIES) {
  const scopes = newsScopes({ county: c.fips });
  const seen = ROWS.filter((r) => inScope(r, scopes));
  check(
    `${c.name} sees its own Supervisor rows and the statewide rows, nothing else`,
    seen.every((r) => r.metro === c.metro || r.label === "statewide dates") &&
      seen.some((r) => r.metro === c.metro) &&
      seen.some((r) => r.label === "statewide dates"),
    seen.map((r) => r.label).join(", ")
  );
}
check(
  "a race-scoped row reaches no feed that asks for no race",
  [{}, ...COVERED_COUNTIES.map((c) => ({ county: c.fips }))].every(
    (q) => !inScope(ROWS[ROWS.length - 1], newsScopes(q))
  )
);

console.log("\n3. Source");
const route = code("src/app/api/news/route.ts");
check(
  "/api/news filters with newsScopes({ metro, county, raceIds })",
  /const scopes = newsScopes\(\{ metro, county, raceIds \}\);/.test(route) &&
    /\.or\(scopes\.join\(","\)\)/.test(route) &&
    !/scopes\.push\(/.test(route)
);
const page = code("src/app/(public)/news/page.tsx");
check(
  "the /news intro promises neither candidate news nor pipeline updates",
  !/candidate\s+news/i.test(page) && !/pipeline/i.test(page),
  page.match(/A calm digest[^<]*/)?.[0] ?? ""
);
check(
  "the county line says a pick adds the county's items",
  /pick a county to add its items/.test(page) &&
    /Showing \$\{selected\.name\} County plus statewide items\./.test(page)
);
check(
  "NewsFeed promises no daily refresh",
  !/daily refresh/i.test(code("src/components/features/NewsFeed.tsx"))
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nNews scope checks passed.");
