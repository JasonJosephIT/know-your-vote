/* Every link we email points at the site, whoever triggered the send.

   The reminder cron, the manual correction send and the signup's welcome
   email built their links from request.nextUrl.origin. Vercel Cron calls
   the deployment's own *.vercel.app address, so the first scheduled
   reminder (Oct 21) would have carried an unsubscribe link to that address
   rather than knowyour.vote. Links now come from src/lib/site-url.ts:

     1. siteOrigin() is NEXT_PUBLIC_SITE_URL, else https://knowyour.vote, the
        same fallback as layout.tsx, robots.ts and sitemap.ts; an empty value
        counts as unset and a trailing slash is dropped.
     2. unsubscribeUrl() is that origin plus the unsubscribe route.
     3. The welcome email, rendered as the signup route renders it, links
        only to the site's address and official sources, never *.vercel.app,
        even with a request that came in on one.
     4. No code that builds an email reads the request's address
        (nextUrl.origin, request.url, a Host header): the three sending
        routes, cohort.ts (the reminder footer) and templates.ts.

   Run: node scripts/verify-email-origin.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { siteOrigin, unsubscribeUrl } from "../src/lib/site-url.ts";
import type { ElectionEvent } from "../src/lib/notifications/election-events.ts";
import { welcomeEmail } from "../src/lib/notifications/templates.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const code = (rel: string) =>
  source(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function withSiteUrl<T>(value: string | undefined, fn: () => T): T {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = value;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = saved;
  }
}

console.log("1. siteOrigin()");
const FALLBACK = "https://knowyour.vote";
check("unset -> https://knowyour.vote", withSiteUrl(undefined, siteOrigin) === FALLBACK);
check("empty -> https://knowyour.vote", withSiteUrl("", siteOrigin) === FALLBACK);
check("blank -> https://knowyour.vote", withSiteUrl("   ", siteOrigin) === FALLBACK);
check(
  "a trailing slash is dropped",
  withSiteUrl("https://knowyour.vote/", siteOrigin) === FALLBACK
);
check(
  "a configured address wins (a preview deployment links to itself)",
  withSiteUrl("https://preview.example", siteOrigin) === "https://preview.example"
);
for (const rel of ["src/app/layout.tsx", "src/app/robots.ts", "src/app/sitemap.ts"]) {
  const fallback = code(rel).match(/NEXT_PUBLIC_SITE_URL \?\?\s*"([^"]+)"/)?.[1];
  check(`${rel} falls back to the same address`, fallback === FALLBACK, String(fallback));
}

console.log("\n2. unsubscribeUrl()");
const TOKEN = "0123456789abcdef0123456789abcdef";
check(
  "the site's unsubscribe route with the token",
  withSiteUrl(undefined, () => unsubscribeUrl(TOKEN)) ===
    `${FALLBACK}/api/voting-info/unsubscribe?token=${TOKEN}`
);

console.log("\n3. The welcome email");
const EVENTS: ElectionEvent[] = [
  {
    id: "1",
    county_fips: null,
    event_type: "vbm_request_deadline",
    election: "general_2026",
    event_date: "2026-10-22",
    rule: "received_by",
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
  {
    id: "2",
    county_fips: null,
    event_type: "election_day",
    election: "general_2026",
    event_date: "2026-11-03",
    rule: null,
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
];
const welcome = withSiteUrl(undefined, () =>
  welcomeEmail({
    zip: "32801",
    county: "Orange",
    district: "FL-10",
    office: { name: "Orange County Supervisor of Elections", url: "https://voteorangefl.gov/" },
    stateUrl: "https://dos.fl.gov/elections/",
    /* Exactly what src/app/api/voting-info/route.ts passes. */
    origin: siteOrigin(),
    unsubscribeUrl: unsubscribeUrl(TOKEN),
    events: EVENTS,
    today: "2026-10-06",
    hasRaces: true,
    remindersOn: true,
  })
);
const links = welcome.text.match(/https?:\/\/[^\s)]+/g) ?? [];
const OFFICIAL = /^https:\/\/(dos\.fl\.gov|voteorangefl\.gov)\//;
check(
  "every link is the site's own address or an official source",
  links.length > 0 &&
    links.every((l) => l === FALLBACK || l.startsWith(`${FALLBACK}/`) || OFFICIAL.test(l)),
  links.join("\n      ")
);
check(
  "the calendar and unsubscribe links are on https://knowyour.vote",
  links.includes(`${FALLBACK}/api/calendar/general_2026.ics`) &&
    links.includes(`${FALLBACK}/api/voting-info/unsubscribe?token=${TOKEN}`),
  links.join("\n      ")
);
check("no link to vercel.app", !/vercel\.app/.test(welcome.text));

console.log("\n4. No email reads the request's address");
const SENDERS = [
  "src/app/api/cron/send-reminders/route.ts",
  "src/app/api/cron/send-correction/route.ts",
  "src/app/api/voting-info/route.ts",
  "src/lib/notifications/cohort.ts",
  "src/lib/notifications/templates.ts",
];
const REQUEST_ADDRESS = /nextUrl\.origin|nextUrl\.host|request\.url\b|headers\.get\(\s*["'](host|x-forwarded-host|origin)["']|vercel\.app/i;
for (const rel of SENDERS) {
  const hit = code(rel).match(REQUEST_ADDRESS)?.[0];
  check(`${rel} never takes a link from the request (${hit ?? "clean"})`, !hit);
}
const cohort = code("src/lib/notifications/cohort.ts");
check(
  "the reminder footer (reminderText) links unsubscribeUrl(), and takes no origin",
  /export function reminderText\(\s*rendered: Rendered,\s*unsubscribeToken: string\s*\)/.test(cohort) &&
    /Unsubscribe: \$\{unsubscribeUrl\(unsubscribeToken\)\}/.test(cohort),
  cohort.slice(cohort.indexOf("export function reminderText"))
);
const signup = code("src/app/api/voting-info/route.ts");
check(
  "the signup route passes siteOrigin() and unsubscribeUrl() to welcomeEmail",
  /origin: siteOrigin\(\),/.test(signup) &&
    /unsubscribeUrl: unsubscribeUrl\(subscription\.unsubscribe_token\),/.test(signup)
);
check(
  "site-url.ts has no imports, so plain Node and every bundle can load it",
  !/^\s*import\s/m.test(code("src/lib/site-url.ts"))
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nEmail origin checks passed.");
