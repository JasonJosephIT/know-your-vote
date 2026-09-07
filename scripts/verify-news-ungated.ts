/* TASK-069 verify: /news renders statewide items with no stored location.

   The acceptance is "/news with empty storage renders statewide items, not an
   empty state" — a live check needing a database. What this guards is the
   structure behind it, and the specific regression that would be invisible in
   review: an early `return` in the effect, or a location check that renders a
   prompt instead of the feed, puts the gate straight back.

   The route needed no change for this task — every parameter is already
   optional and a request with none returns the statewide scope. Check 5
   pins that, since making one required again would re-gate the feed from the
   server side without touching this component at all.

   Updated by TASK-070, which removed kyv.location and with it the last
   location source this component had. The checks that pinned the pre-hydration
   guard and the conditional query string described a shape that no longer
   exists; what they were really protecting — that the request is always
   issued — is asserted directly now.

   Run: node scripts/verify-news-ungated.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(`${ROOT}/${rel}`, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const feed = stripComments(read("src/components/features/NewsFeed.tsx"));
const route = stripComments(read("src/app/api/news/route.ts"));
const page = stripComments(read("src/app/(public)/news/page.tsx"));

/* 1. The effect must fetch unconditionally. TASK-070 removed the stored
      location entirely, so there is no longer any condition to gate on — the
      only statement before the fetch should be the abort controller. Any
      early return reintroduced here is a gate by definition. */
const effect = feed.slice(feed.indexOf("useEffect("), feed.indexOf("}, []);"));
assert(
  "fetch effect has no early return",
  !/\breturn\b(?!\s*\(\)\s*=>)/.test(effect.slice(0, effect.indexOf("fetch("))),
  "something returns before the fetch is issued"
);

/* 2. The request carries no location parameters, and is issued every time.
      A query string here would mean a location source came back. */
assert(
  "fetch requests the statewide scope with no parameters",
  /fetch\("\/api\/news", \{ signal: controller\.signal \}\)/.test(feed)
);

/* 3. The effect does not depend on a location value. */
assert(
  "effect has no location dependency",
  /\}, \[\]\);/.test(feed)
);

/* 4. No render-time dead end that replaces the feed with a location prompt. */
assert(
  "no location prompt short-circuits the feed",
  !/location !== undefined && !location\?\.zip/.test(feed),
  "the pre-TASK-069 dead end is back"
);

/* 5. Every route parameter stays optional — a required one re-gates the feed
      from the server without touching the component. */
for (const field of ["zip", "metro", "district"]) {
  assert(
    `route parameter ${field} stays optional`,
    new RegExp(`${field}:[\\s\\S]{0,120}?\\.optional\\(\\)`).test(route)
  );
}

/* 6. Copy honesty (TASK-067's rule): with no location this page is statewide,
      so it must not call itself local. */
assert(
  "page does not call a statewide feed local",
  !/Local electoral news/.test(page)
);

if (failures) {
  console.error(`\n${failures} news-ungating check(s) failed`);
  process.exit(1);
}
console.log("\nAll news-ungating checks passed.");
