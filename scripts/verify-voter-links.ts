/* The home page's "Sample ballot and how to vote" block (VotingResources;
   docs/design/home-readability-2026-10-12/ §2 and §8).

   It sends voters to their county's sample ballot, polling place, early
   voting and mail-ballot pages, so what it must never get wrong is where a
   link goes and what date a tile states:

     1. Every covered county has all seven link fields, and no other county
        has any, so an uncovered county (or none) gets the state's links.
     2. Each county's links stay on that county's Supervisor's own domain,
        over https, and the host the copy names is that domain.
     3. The state's links stay on the Division of Elections' hosts.
     4. No vendor tool or third-party guide is linked from the block.
     5. Day by day across the general election, over verified-row
        fixtures: the mail tile asks for a ballot through October 22 and
        then for its return, says "today" only on the date itself, and the
        block goes the day after Election Day. A county's early-voting
        window shows only while all four counties have theirs. With no rows
        the links still show, undated.
     6. Dates are stated, never counted down.
     7. The block is a server component that stores nothing, and every
        link says it opens a new tab.
     8. The home page wires it in under the key dates, the "On this page"
        list jumps to real sections, and the welcome email's office link
        comes from the same map of Supervisor sites.

   What it cannot cover: that the pages stay up and stay the right pages.
   A person re-checks them (spec §9 item 2), and Hillsborough's refuse
   scripts.

   Pure and offline: no DB, no network. config.ts is server-only, so it
   loads in a child under the react-server condition, as
   verify-reminder-schedule does.

   Run: node scripts/verify-voter-links.ts */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COVERED_COUNTIES } from "../src/lib/counties.ts";
import { FL_COUNTIES } from "../src/lib/fl-counties.ts";
import {
  REGISTRATION_STATUS_URL,
  STATE_VOTER_LINKS,
  SUPERVISOR_DIRECTORY_URL,
  SUPERVISOR_LIST_URL,
  supervisorSite,
  voterLinks,
  type VoterLinks,
} from "../src/lib/supervisors.ts";
import {
  mailBallotRow,
  resourceTiles,
  type ResourceTile,
} from "../src/lib/voter-resources.ts";
import { isoDaysBefore } from "../src/lib/notifications/schedule.ts";
import type { ElectionEvent } from "../src/lib/notifications/election-events";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f: string) => readFileSync(path.join(root, f), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* ---- 1. Covered counties have every link; nobody else has any -------- */

console.log("\n1. Who has links");

const KEYS: (keyof VoterLinks)[] = [
  "site",
  "sampleBallot",
  "sampleBallotAsks",
  "pollingPlace",
  "earlyVoting",
  "mailRequest",
  "mailReturn",
];
for (const c of COVERED_COUNTIES) {
  const l = voterLinks(c.fips);
  const missing = KEYS.filter((k) => !l || !l[k]?.trim());
  check(`${c.name} has all seven fields`, missing.length === 0, missing.join(", "));
}
{
  const covered = new Set(COVERED_COUNTIES.map((c) => c.fips));
  const extra = FL_COUNTIES.filter(
    (c) => !covered.has(c.fips) && voterLinks(c.fips) !== null
  ).map((c) => c.name);
  check("no uncovered Florida county has links", extra.length === 0, extra.join(", "));
}
check(
  "Palm Beach, no county and an empty value all get null",
  voterLinks("12099") === null &&
    voterLinks(undefined) === null &&
    voterLinks(null) === null &&
    voterLinks("") === null
);
check(
  "an object key is not a county",
  voterLinks("constructor") === null && voterLinks("__proto__") === null
);

/* ---- 2. Each county's links stay on its own Supervisor's domain ------- */

console.log("\n2. County hosts");

const OWN_DOMAIN: Record<string, RegExp> = {
  "12086": /(^|\.)votemiamidade\.gov$/,
  "12011": /(^|\.)browardvotes\.gov$/,
  "12057": /(^|\.)votehillsborough\.gov$/,
  "12095": /(^|\.)voteorangefl\.gov$/,
};
const URL_KEYS = KEYS.filter((k) => k !== "site" && k !== "sampleBallotAsks");
for (const c of COVERED_COUNTIES) {
  const l = voterLinks(c.fips);
  if (!l) continue;
  const domain = OWN_DOMAIN[c.fips];
  const off = URL_KEYS.filter((k) => {
    const u = new URL(l[k]);
    return u.protocol !== "https:" || !domain?.test(u.hostname);
  });
  check(
    `${c.name}'s six links are https on its own Supervisor's domain`,
    Boolean(domain) && off.length === 0,
    off.map((k) => `${k}: ${l[k]}`).join("; ")
  );
  const home = supervisorSite(c.fips);
  const host = home ? new URL(home).hostname : "";
  check(
    `${c.name}'s site (${l.site}) is its Supervisor's host, without www.`,
    !l.site.startsWith("www.") &&
      (host === l.site || host.endsWith(`.${l.site}`)) &&
      Boolean(domain?.test(l.site)),
    `supervisorSite: ${home}`
  );
}

/* ---- 3. The state's links stay on the Division of Elections' hosts ---- */

console.log("\n3. State hosts");

const STATE_HOSTS = new Set([
  "dos.fl.gov",
  "dos.elections.myflorida.com",
  "registration.dos.fl.gov",
]);
{
  const urls = [
    ...Object.values(STATE_VOTER_LINKS),
    SUPERVISOR_DIRECTORY_URL,
    REGISTRATION_STATUS_URL,
  ];
  const off = urls.filter((u) => {
    const url = new URL(u);
    return url.protocol !== "https:" || !STATE_HOSTS.has(url.hostname);
  });
  check("every state link is https on a Division of Elections host", off.length === 0, off.join(", "));
}

/* ---- 4. No vendor tool or third-party guide ---------------------------- */

console.log("\n4. Official sources only");

const BLOCK_FILES = [
  "src/lib/supervisors.ts",
  "src/lib/voter-resources.ts",
  "src/components/features/VotingResources.tsx",
];
for (const f of BLOCK_FILES) {
  const hits = /voterfocus\.com|electionsfl\.org|omniballot\.us|vote411|ballotpedia/i.exec(
    stripComments(read(f))
  );
  check(`${f} links no vendor tool, Vote411 or Ballotpedia`, !hits, hits?.[0] ?? "");
}
check(
  "the contact hub the district picker uses is unchanged",
  SUPERVISOR_LIST_URL ===
    "https://dos.fl.gov/elections/contacts/supervisor-of-elections/"
);

/* ---- 5. Day by day ------------------------------------------------------ */

console.log("\n5. Day by day, October 12 to November 4");

/* general_2026 as verified live (verify-home-layout's EVENTS), with each
   covered county's own early-voting window (0043). */
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
const STATEWIDE: ElectionEvent[] = [
  ev("registration_deadline", "2026-10-05"),
  ev("vbm_request_deadline", "2026-10-22"),
  ev("early_voting_start", "2026-10-24"),
  ev("early_voting_end", "2026-10-31"),
  ev("ballot_return_deadline", "2026-11-03"),
  ev("election_day", "2026-11-03"),
];
const countyWindow = (fips: string) => [
  ev("early_voting_start", "2026-10-19", fips),
  ev("early_voting_end", "2026-11-01", fips),
];
const EVENTS = [
  ...STATEWIDE,
  ...COVERED_COUNTIES.flatMap((c) => countyWindow(c.fips)),
];
/* Three counties' windows verified, not the fourth's. */
const THREE = [
  ...STATEWIDE,
  ...COVERED_COUNTIES.slice(0, 3).flatMap((c) => countyWindow(c.fips)),
];

const DADE = "12086";
const days: string[] = [];
for (let i = 23; i >= -1; i--) days.push(isoDaysBefore("2026-11-03", i));
check("the walk runs October 11 to November 4", days[0] === "2026-10-11" && days.at(-1) === "2026-11-04");

const tile = (tiles: ResourceTile[] | null, key: ResourceTile["key"]) =>
  tiles?.find((t) => t.key === key);
const outputs: string[] = [];
const wrong: string[] = [];
for (const day of days.slice(1)) {
  const all = [null, ...COVERED_COUNTIES.map((c) => c.fips)].map((f) =>
    resourceTiles(f, EVENTS, day)
  );
  for (const tiles of all) for (const t of tiles ?? []) outputs.push(t.label, t.note ?? "");
  const dade = all[1];
  const state = all[0];

  if (day === "2026-11-04") {
    if (all.some((t) => t !== null)) wrong.push(`${day}: the block still renders`);
    continue;
  }
  const mail = tile(dade, "mail");
  const stateMail = tile(state, "mail");
  const dl = voterLinks(DADE)!;
  const expectMail =
    day < "2026-10-22"
      ? ["Request a mail ballot", "By 5 p.m. on October 22", dl.mailRequest]
      : day === "2026-10-22"
        ? ["Request a mail ballot", "By 5 p.m. today, October 22", dl.mailRequest]
        : day < "2026-11-03"
          ? [
              "Return your mail ballot",
              "It must be received by 7 p.m. on November 3, and can’t be handed in at an Election Day polling place.",
              dl.mailReturn,
            ]
          : [
              "Return your mail ballot",
              "It must be received by 7 p.m. today, November 3, and can’t be handed in at an Election Day polling place.",
              dl.mailReturn,
            ];
  if (mail?.label !== expectMail[0] || mail?.note !== expectMail[1] || mail?.href !== expectMail[2])
    wrong.push(`${day} Miami-Dade mail: ${JSON.stringify(mail)}`);
  if (
    stateMail?.label !== expectMail[0] ||
    stateMail?.note !== expectMail[1] ||
    stateMail?.href !== STATE_VOTER_LINKS.mail
  )
    wrong.push(`${day} state mail: ${JSON.stringify(stateMail)}`);

  const early = tile(dade, "early-voting");
  if (day <= "2026-11-01" ? early?.note !== "October 19 to November 1" : early !== undefined)
    wrong.push(`${day} Miami-Dade early voting: ${JSON.stringify(early)}`);
  const stateEarly = tile(state, "early-voting");
  if (
    !stateEarly ||
    stateEarly.note !==
      (day <= "2026-10-31" ? "Every county: at least October 24 to October 31" : null)
  )
    wrong.push(`${day} state early voting: ${JSON.stringify(stateEarly)}`);

  const polling = tile(dade, "polling-place");
  if (
    polling?.note !==
    (day === "2026-11-03" ? "Today, November 3, 7 a.m. to 7 p.m." : "November 3, 7 a.m. to 7 p.m.")
  )
    wrong.push(`${day} Miami-Dade polling place: ${JSON.stringify(polling)}`);

  /* Same tiles, same order, same words for every county. */
  const shape = (t: ResourceTile[] | null) =>
    (t ?? []).map((x) => `${x.key}|${x.label}|${x.key === "sample-ballot" ? "" : (x.note ?? "")}`).join(";");
  if (new Set(all.slice(1).map(shape)).size !== 1)
    wrong.push(`${day}: the four counties' tiles differ`);
}
check(
  "every day: the mail tile, early voting, polling hours and the end of the block are right, the same for every county",
  wrong.length === 0,
  wrong.slice(0, 6).join("\n      ")
);

{
  const before = resourceTiles(DADE, EVENTS, "2026-10-11");
  check(
    "Miami-Dade: sample ballot, polling place, early voting, mail, in that order",
    before?.map((t) => t.key).join(",") ===
      "sample-ballot,polling-place,early-voting,mail" &&
      tile(before, "sample-ballot")?.note === "Asks for your name and date of birth" &&
      tile(before, "sample-ballot")?.href === voterLinks(DADE)?.sampleBallot
  );
  const nov3 = resourceTiles(DADE, EVENTS, "2026-11-03");
  check(
    "Election Day: the early-voting tile has gone, three remain",
    nov3?.map((t) => t.key).join(",") === "sample-ballot,polling-place,mail"
  );
}
{
  const three = [null, ...COVERED_COUNTIES.map((c) => c.fips)].map((f) =>
    resourceTiles(f, THREE, "2026-10-20")
  );
  check(
    "with only three counties' windows verified, no county states one",
    three.slice(1).every((t) => tile(t, "early-voting")?.note === null)
  );
  const nov3 = resourceTiles(DADE, THREE, "2026-11-03");
  check(
    "and every county keeps the tile, undated, through Election Day",
    tile(nov3, "early-voting")?.note === null
  );
}
{
  const none = [null, DADE].map((f) => resourceTiles(f, [], "2026-10-20"));
  check(
    "no verified rows: the links still show, as \"Vote by mail\", with no dates",
    none.every(
      (t) =>
        t?.length === 4 &&
        tile(t, "mail")?.label === "Vote by mail" &&
        tile(t, "mail")?.note === null
    ) &&
      tile(none[1], "polling-place")?.note === null &&
      tile(none[1], "early-voting")?.note === null &&
      tile(none[1], "mail")?.href === voterLinks(DADE)?.mailRequest &&
      tile(none[0], "early-voting")?.note === null
  );
  check(
    "mailBallotRow alone, no rows: info",
    mailBallotRow([], "2026-10-20").kind === "info"
  );
}
{
  const state = resourceTiles(null, EVENTS, "2026-10-13");
  const uncovered = resourceTiles("12099", EVENTS, "2026-10-13");
  check(
    "\"Another Florida county\" and an uncovered county get the state's four links",
    JSON.stringify(state) === JSON.stringify(uncovered) &&
      state?.map((t) => t.href).join(" ") ===
        [
          SUPERVISOR_DIRECTORY_URL,
          STATE_VOTER_LINKS.pollingPlace,
          STATE_VOTER_LINKS.earlyVoting,
          STATE_VOTER_LINKS.mail,
        ].join(" ") &&
      tile(state, "sample-ballot")?.label === "Find your county’s Supervisor of Elections"
  );
}

/* ---- 6. Dates stated, never counted --------------------------------- */

console.log("\n6. No countdowns");

const COUNTDOWN = /\bdays? (?:to|until|left)\b/i;
check("no tile says how many days are left", !outputs.some((s) => COUNTDOWN.test(s)));
for (const f of [...BLOCK_FILES, "src/components/features/BallotAtAGlance.tsx"]) {
  check(`${f} has no countdown copy`, !COUNTDOWN.test(stripComments(read(f))));
}

/* ---- 7. A server component that stores nothing ----------------------- */

console.log("\n7. The block itself");

const block = stripComments(read("src/components/features/VotingResources.tsx"));
check(
  "VotingResources is a server component that reads no cookie, storage or URL",
  !/["']use client["']/.test(block) &&
    !/localStorage|sessionStorage|document\.cookie|cookies\(|searchParams/.test(block)
);
{
  const anchors = [...block.matchAll(/<a\b[\s\S]*?<\/a>/g)].map((m) => m[0]);
  const bad = anchors.filter(
    (a) =>
      !/target="_blank"/.test(a) ||
      !/rel="noreferrer"/.test(a) ||
      !/\(opens in a new tab\)/.test(a)
  );
  check(
    "every link opens a new tab, with noreferrer, and says so",
    anchors.length > 0 && bad.length === 0,
    bad.join("\n")
  );
}
check(
  "the county rows are one accordion, by name",
  /<details name="sample-ballot-county"/.test(block)
);
for (const f of [
  "src/components/features/VotingResources.tsx",
  "src/components/features/BallotAtAGlance.tsx",
  "src/components/features/SharedBallot.tsx",
  "src/components/features/JudicialRetentionNote.tsx",
]) {
  check(`${f} draws arrows as SVG, not ↗ ↓ ›`, !/[↗↓›]/.test(read(f)));
}

/* ---- 8. The wiring --------------------------------------------------- */

console.log("\n8. The wiring");

{
  const page = stripComments(read("src/app/(public)/page.tsx"));
  const at = page.indexOf("<VotingResources countyFips={saved?.countyFips} />");
  check(
    "the home page renders the block once, with the saved county, after the key dates and before the ballot",
    at > 0 &&
      page.indexOf("<VotingResources", at + 1) === -1 &&
      page.indexOf("<DeadlineBanner") < at &&
      at < page.indexOf("<SharedBallot />")
  );
  check("the House step is a jump target", /<section id="house-race"/.test(page));
  check(
    "the House step's field doesn't repeat the coverage note its paragraph gives",
    /coverageNote=\{false\}/.test(page) && /\{coveredCountyNames\(\)\} counties so far/.test(page)
  );
  const glance = stripComments(read("src/components/features/BallotAtAGlance.tsx"));
  check(
    "the jump list is a nav to the four sections",
    /<nav aria-labelledby="on-this-page"/.test(glance) &&
      ["#statewide-races", "#ballot-questions", "#house-race", "#home-news"].every((h) =>
        glance.includes(`"${h}"`)
      )
  );
  check(
    "each jump lands on a real section",
    /id="statewide-races"/.test(read("src/components/features/SharedBallot.tsx")) &&
      /id="ballot-questions"/.test(read("src/components/features/BallotQuestions.tsx")) &&
      /id="home-news"/.test(read("src/components/features/NewsRail.tsx"))
  );
  check(
    "the coverage card's \"official sample ballot\" jumps to the block",
    /href="#sample-ballot"/.test(read("src/components/features/CoverageSummary.tsx")) &&
      /id="sample-ballot"/.test(block)
  );
  const config = read("src/lib/notifications/config.ts");
  check(
    "officialSources takes the office's address from supervisorSite, not its own old ones",
    /supervisorSite\(/.test(config) &&
      !/ocfelections\.gov/.test(config) &&
      !/miamidade\.gov\/global\/elections/.test(config)
  );
}

/* officialSources itself, in a child: config.ts imports server-only. */
const PROBE = `
const m = await import(${JSON.stringify(path.join(root, "src/lib/notifications/config.ts"))});
const out = {};
for (const name of ["Miami-Dade", "Broward", "Hillsborough", "Orange", "Palm Beach", null]) {
  out[String(name)] = m.officialSources(name).office;
}
console.log(JSON.stringify(out));
`;
const probe = spawnSync(
  process.execPath,
  ["--no-warnings", "--conditions=react-server", "--input-type=module", "-e", PROBE],
  { encoding: "utf8", env: { PATH: process.env.PATH ?? "" } }
);
let offices: Record<string, { name: string; url: string } | null> | null = null;
try {
  offices = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "");
} catch {
  offices = null;
}
check("config.ts loads under the react-server condition", offices !== null, probe.stderr.trim());
if (offices) {
  const off = COVERED_COUNTIES.filter(
    (c) =>
      offices[c.name]?.url !== supervisorSite(c.fips) ||
      !offices[c.name]?.name.includes(c.name)
  ).map((c) => `${c.name}: ${JSON.stringify(offices[c.name])}`);
  check(
    "each covered county's office links its Supervisor's own site (supervisorSite)",
    off.length === 0,
    off.join("; ")
  );
  check(
    "an uncovered county and no county have no office",
    offices["Palm Beach"] === null && offices["null"] === null
  );
}

if (failures > 0) {
  console.error(`\n${failures} voter-link check(s) failed`);
  process.exit(1);
}
console.log("\nverify-voter-links: all checks passed.");
