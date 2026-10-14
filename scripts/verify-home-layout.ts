/* The home page layout pass (2026-10-11, docs/design/layout-2026-10-11/):
   the key-dates rail, the masthead's dates and the news column's regions.

   The rail's stops are walked day by day across the general election's
   real verified dates, statewide and for a covered county, because a rail
   that marks the wrong stop "next" on one day is a wrong civic deadline on
   that day. The rest are source checks on what keeps the column neutral,
   on what keeps the rail readable without its colours (section 4;
   Mobbin catalog HM1 and HM8, 2026-10-12), and on the home readability
   pass (section 5; 2026-10-12, PR A,
   docs/design/home-readability-2026-10-12/): the news column in the
   page's flow and before the coverage card on a phone, and the tighter
   top of the page. The sample-ballot block's own checks are in
   verify-voter-links.

   Run: node scripts/verify-home-layout.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  keyDateStops,
  mastheadDate,
  mastheadElectionDay,
  stopText,
  type StopState,
} from "../src/lib/notifications/key-dates.ts";
import {
  eventsForCounty,
  isoDaysBefore,
} from "../src/lib/notifications/schedule.ts";
import { newsRegion, regionOrder, STATEWIDE } from "../src/lib/news-region.ts";
import type { ElectionEvent } from "../src/lib/notifications/election-events";

const ROOT = resolve(import.meta.dirname, "..");
const source = (f: string) => readFileSync(`${ROOT}/${f}`, "utf8");

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

/* general_2026 as verified live (election_event, 2026-10-11). */
const ev = (
  event_type: ElectionEvent["event_type"],
  event_date: string,
  county_fips: string | null = null
): ElectionEvent => ({
  id: `${event_type}-${county_fips ?? "fl"}`,
  event_type,
  election: "general_2026",
  county_fips,
  event_date,
  rule: null,
  details_url: "https://dos.fl.gov/elections/",
});
const EVENTS: ElectionEvent[] = [
  ev("registration_deadline", "2026-10-05"),
  ev("vbm_request_deadline", "2026-10-22"),
  ev("early_voting_start", "2026-10-24"),
  ev("early_voting_end", "2026-10-31"),
  ev("ballot_return_deadline", "2026-11-03"),
  ev("election_day", "2026-11-03"),
  ev("early_voting_start", "2026-10-19", "12086"),
  ev("early_voting_end", "2026-11-01", "12086"),
];
const STATE = eventsForCounty(EVENTS, null);
const DADE = eventsForCounty(EVENTS, "12086");

const summary = (events: ElectionEvent[], day: string) =>
  keyDateStops(events, day)
    ?.map((s) => `${s.key}:${s.state}`)
    .join(" ") ?? "null";

/* ---- 1. The rail, on the days that matter ------------------------------ */

check(
  "Oct 11: registration passed, a Today stop, the mail-ballot deadline next",
  summary(STATE, "2026-10-11") ===
    "registration:past today:today vbm:next early:later election-day:later",
  summary(STATE, "2026-10-11")
);
check(
  "Oct 5: the registration deadline is itself today, no extra Today stop",
  summary(STATE, "2026-10-05") ===
    "registration:today vbm:next early:later election-day:later",
  summary(STATE, "2026-10-05")
);
check(
  "Oct 24 statewide: early voting is open, Election Day next",
  summary(STATE, "2026-10-24") ===
    "registration:past vbm:past early:open election-day:next",
  summary(STATE, "2026-10-24")
);
check(
  "Oct 20 in Miami-Dade: the county's own window is already open",
  summary(DADE, "2026-10-20") ===
    "registration:past early:open vbm:next election-day:later",
  summary(DADE, "2026-10-20")
);
check(
  "Oct 20 statewide: early voting is still ahead",
  /early:later/.test(summary(STATE, "2026-10-20"))
);
check(
  "Election Day: its stop is today and folds in the mail-ballot deadline",
  summary(STATE, "2026-11-03").endsWith("election-day:today") &&
    keyDateStops(STATE, "2026-11-03")!.at(-1)!.label ===
      "Election Day; mail ballots due"
);
check(
  "the day after Election Day: no rail",
  keyDateStops(STATE, "2026-11-04") === null
);
check("no rows: no rail", keyDateStops([], "2026-10-11") === null);

/* Every day of the cycle: the reader's place is marked (a date that falls
   today, an open window, or the Today stop, which appears only when nothing
   else marks the day), and at most one date is "next". Two marks on one day
   are real: on Oct 22 in Miami-Dade the mail-ballot deadline falls inside
   the county's open early-voting window. */
{
  const bad: string[] = [];
  for (const events of [STATE, DADE]) {
    for (let i = 0; i <= 60; i++) {
      const day = isoDaysBefore("2026-11-03", i);
      const stops = keyDateStops(events, day);
      if (!stops) continue;
      const here = stops.filter(
        (s) => s.state === "today" || s.state === "open"
      );
      const next = stops.filter((s) => s.state === "next");
      const extraToday = here.length > 1 && here.some((s) => s.key === "today");
      if (here.length === 0 || extraToday || next.length > 1) bad.push(day);
    }
  }
  check(
    "every day marks the reader's place once and has at most one next date",
    bad.length === 0,
    bad.join(", ")
  );
}
check(
  "Oct 22 in Miami-Dade: the deadline is today while early voting is open",
  summary(DADE, "2026-10-22") ===
    "registration:past early:open vbm:today election-day:next",
  summary(DADE, "2026-10-22")
);

/* ---- 2. The masthead states dates, never a count ------------------------ */

check(
  "masthead date",
  mastheadDate("2026-10-11") === "Sunday, October 11, 2026",
  mastheadDate("2026-10-11")
);
check(
  "masthead Election Day",
  mastheadElectionDay("2026-11-03", "2026-10-11") ===
    "Election Day: Tuesday, November 3"
);
check(
  "masthead on Election Day",
  mastheadElectionDay("2026-11-03", "2026-11-03") === "Election Day is today"
);
{
  const files = [
    "src/lib/notifications/key-dates.ts",
    "src/components/features/HomeMasthead.tsx",
    "src/components/features/KeyDatesRail.tsx",
    "src/components/features/VotingResources.tsx",
    "src/lib/voter-resources.ts",
  ]
    .map(source)
    .join("\n");
  check(
    "no countdown copy",
    !/days? (?:to|until|left)/i.test(files.replace(/\/\*[\s\S]*?\*\//g, ""))
  );
}

/* ---- 3. The news column ------------------------------------------------- */

check(
  "a row with no county is statewide",
  newsRegion({ metro: null, county_fips: null }) === STATEWIDE
);
check(
  "a metro row and a county row land in the same county",
  newsRegion({ metro: "miami", county_fips: null })?.key === "12086" &&
    newsRegion({ metro: null, county_fips: "12086" })?.key === "12086" &&
    newsRegion({ metro: "miami", county_fips: null })?.label === "Miami-Dade"
);
check(
  "an uncovered county keeps its own name",
  newsRegion({ metro: null, county_fips: "12099" })?.label === "Palm Beach"
);
check(
  "an unknown metro is left out, not guessed",
  newsRegion({ metro: "jacksonville", county_fips: null }) === null
);
check(
  "filters: statewide, then covered counties in order, then the rest",
  regionOrder([
    { key: "12099", label: "Palm Beach" },
    { key: "12095", label: "Orange" },
    STATEWIDE,
    { key: "12086", label: "Miami-Dade" },
  ])
    .map((r) => r.label)
    .join(",") === "Statewide,Miami-Dade,Orange,Palm Beach"
);

{
  const home = source("src/components/features/HomeNews.tsx");
  check(
    "the column never reads a candidate's or a race's story",
    /\.is\("race_id", null\)/.test(home) &&
      /\.is\("candidate_id", null\)/.test(home)
  );
  check(
    "the column is ordered by time alone",
    /\.order\("published_at", \{ ascending: false \}\)/.test(home) &&
      !/\.order\([^)]*(?:image|source|metro|county)/.test(home)
  );
  const rail = source("src/components/features/NewsRail.tsx");
  check(
    "the column passes no lean to a card",
    !/lean/i.test(rail.replace(/\/\*[\s\S]*?\*\//g, ""))
  );
  /* Home readability A8 (founder decision 3a): the four newest on a
     phone, eight from lg, the same cap for every filter. The cap hides
     by position in the time-ordered list, never by region or outlet. */
  check(
    "phones show the four newest stories and lg the eight, by position alone",
    /const SHOW = 8;/.test(rail) &&
      /const PHONE_SHOW = 4;/.test(rail) &&
      /\.slice\(0, SHOW\)/.test(rail) &&
      /n >= PHONE_SHOW \? "max-lg:hidden"/.test(rail)
  );
}

{
  const page = source("src/app/(public)/page.tsx");
  check(
    "home renders the masthead, the jump list and the news column with the saved county",
    /<HomeMasthead \/>/.test(page) &&
      /<BallotAtAGlance \/>/.test(page) &&
      /<HomeNews countyFips=\{saved\?\.countyFips\} \/>/.test(page)
  );
  check(
    "the ballot comes before the news in the DOM, so phones and screen readers get it first",
    page.indexOf("<SharedBallot />") < page.indexOf("<HomeNews")
  );
}

/* ---- 4. The rail reads without colour (catalog HM1 and HM8) ------------ */

/* What a sighted reader sees of each stop, its label and then its state
   word, the way KeyDatesRail draws them from stopText. */
const onScreen = (events: ElectionEvent[], day: string) =>
  keyDateStops(events, day)
    ?.map((s) => {
      const t = stopText(s);
      return t.word ? `${t.label} (${t.word})` : t.label;
    })
    .join(" | ") ?? "null";

check(
  "Oct 11: passed, today and next are words on screen, a later date has none",
  onScreen(STATE, "2026-10-11") ===
    "Registration deadline (Passed) | Today | Mail-ballot request deadline (Next) | Early voting | Election Day; mail ballots due",
  onScreen(STATE, "2026-10-11")
);
check(
  "Oct 5: a deadline that falls today says Today after its date",
  onScreen(STATE, "2026-10-05") ===
    "Registration deadline (Today) | Mail-ballot request deadline (Next) | Early voting | Election Day; mail ballots due",
  onScreen(STATE, "2026-10-05")
);
check(
  "Oct 24: an open window says so in its label, with no second word",
  onScreen(STATE, "2026-10-24") ===
    "Registration deadline (Passed) | Mail-ballot request deadline (Passed) | Early voting: open now | Election Day; mail ballots due (Next)",
  onScreen(STATE, "2026-10-24")
);

/* Every day of the cycle, statewide and in Miami-Dade: each state is
   named in visible words, and a later date is the only stop with none, so
   no two states differ by colour alone (WCAG 1.4.1). */
{
  const says: Record<
    StopState,
    (t: { label: string; word: string | null }) => boolean
  > = {
    past: (t) => t.word === "Passed",
    today: (t) =>
      t.word === "Today" || (t.label === "Today" && t.word === null),
    open: (t) => t.label.endsWith(": open now") && t.word === null,
    next: (t) => t.word === "Next",
    later: (t) =>
      t.word === null && !/passed|today|open now|next/i.test(t.label),
  };
  const bad: string[] = [];
  for (const events of [STATE, DADE]) {
    for (let i = 0; i <= 60; i++) {
      const day = isoDaysBefore("2026-11-03", i);
      for (const s of keyDateStops(events, day) ?? []) {
        if (!says[s.state](stopText(s))) bad.push(`${day} ${s.key}:${s.state}`);
      }
    }
  }
  check(
    "every day, every stop's state is in words on screen, not only in colour",
    bad.length === 0,
    bad.join(", ")
  );
}

{
  const rail = source("src/components/features/KeyDatesRail.tsx");
  const code = rail.replace(/\/\*[\s\S]*?\*\//g, "");
  check(
    "the rail draws each stop's label and word from stopText",
    /stopText\(s\)/.test(code)
  );
  check("no state is left in sr-only text", !/sr-only/.test(code));
  check(
    "a passed dot carries a check, surface on grey",
    /s\.state === "past" && <CheckGlyph \/>/.test(code) &&
      /past: "border-on-surface-muted bg-on-surface-muted [^"]*text-surface"/.test(
        code
      )
  );
  check(
    "never verdict green, and nothing moves: no fill, pulse or transition",
    !/success|green|animate-|transition|duration-|keyframes/.test(code)
  );
  /* Phones: the segment to the next stop starts at this dot's centre (a
     5px top margin and half a 12px dot, level with the middle of a 21px
     line of 14px text) and ends at the next dot's centre, the list's 12px
     gap further down. A stop's own height never enters it, so the line
     stays whole when a label wraps. */
  const top = Number(/after:top-\[(\d+)px\]/.exec(code)?.[1]);
  const below = Number(/after:bottom-\[-(\d+)px\]/.exec(code)?.[1]);
  check(
    "phones: one line from dot centre to dot centre",
    /<ol className="grid gap-3 /.test(code) &&
      /mt-\[5px\] flex size-3 /.test(code) &&
      top === 5 + 12 / 2 &&
      below === 12 + top,
    `top ${top}px, bottom -${below}px`
  );
}

/* ---- 5. Home readability (2026-10-12, PR A) ---------------------------- */

{
  const page = source("src/app/(public)/page.tsx");
  const aside = page.match(/<aside\s+aria-label="Florida election news"\s+className="([^"]*)"/)?.[1] ?? "";
  check(
    "the news column scrolls with the page: not sticky, no scrollbar of its own",
    aside !== "" &&
      !/sticky/.test(aside) &&
      !/overflow-y-auto/.test(aside) &&
      !/max-h-/.test(aside),
    aside
  );
  check(
    "on a phone the news comes before what this guide covers",
    page.indexOf("<HomeNews") < page.indexOf("<CoverageSummary")
  );
  check(
    "the key dates and the sample-ballot block are one group, 12 px apart",
    /<div className="flex flex-col gap-3[^"]*">\s*<DeadlineBanner[\s\S]*?<VotingResources countyFips=\{saved\?\.countyFips\} \/>\s*<\/div>\s*<BallotAtAGlance \/>/.test(
      page
    )
  );
  check(
    "the top of the phone page is tighter: 24 px main padding, a 32 px h1 grouped with the lede",
    /<main className="[^"]*\bpy-5\b[^"]*\blg:py-8\b/.test(page) &&
      /<h1 className="text-h1 sm:text-display">/.test(page) &&
      /<div className="flex flex-col gap-3 lg:gap-6">\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)?<h1/.test(page)
  );
  check(
    "the lede is the body colour, 16 px on a phone, and still says what we cover",
    /<p className="text-body text-on-surface sm:text-body-lg">\s*See the races we cover/.test(page)
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-home-layout: all checks passed.");
