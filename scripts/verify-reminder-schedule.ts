/* Reminder schedule dry-run for the 2026 general (launch handoff 2026-10-04,
   §2 items 2, 3 and 5). No server, no env, no database: the real schedule
   and template code in src/lib/notifications is driven with the six
   general_2026 election_event rows as the live database held them on
   2026-10-04 (all verified), standing in for verifiedStatewideEvents().

     1. DAILY CRON WALK. One run per day at the scheduled 14:00 UTC
        (vercel.json) from 2026-10-04 through 2026-11-04, against an
        in-memory send log that behaves like notification_send_log's
        claim (a key sends once). Asserts the exact send calendar — the one
        docs/general-election/reminders-e2e-runbook.md prints — and:
          - the vote-by-mail request reminder fires before Oct 22;
          - the early-voting reminder fires on or before Oct 24;
          - the Election Day reminder fires on or before Nov 3;
          - nothing fires for a deadline that has passed;
          - no duplicates: each key once, at most one email a day, and a
            same-day manual re-run sends nothing new;
          - every REMINDER_OFFSETS rule due in the window actually fires;
          - each rendered email names its event's date, and its "today" /
            "tomorrow" / "one week" matches the day it is sent.
     2. REHEARSAL TARGET. nextReminder() — what the cron's rehearsal mode
        sends — for every day and evening: it is always the next send on
        the calendar from section 1 (Oct 5–20 -> the Oct 21 vote-by-mail
        reminder, Oct 22–23 -> early voting on Oct 24, Nov 4 -> nothing),
        plus source checks that the route takes the address from the POST
        body, never the URL, and mails each address once.
     3. WELCOME EMAIL. welcomeEmail(), the signup route's email, rendered
        for every day: it never lists a passed date, drops each line the
        day after its deadline, keeps its paragraph breaks, and promises
        reminders only while they are not paused.
     4. AMERICA/NEW_YORK DAY BOUNDARY. easternToday() around midnight in
        EDT and in EST (DST ends Nov 1), and the bug it fixed: the route
        used the UTC date, so a manual re-run after 8 p.m. Eastern — the
        recovery path after a failed send — skipped the day's reminder and
        sent tomorrow's early. Also a source check that both routes use it.
     5. DEADLINE BANNER ROLLOVER. bannerDates() for every day, at midday
        and late evening Eastern: it states the next date a voter can still
        act on, keeps a deadline through the end of its own Florida day,
        never states a passed date, and disappears after Election Day.
     7. COUNTY DATES (0043). The four covered counties run early voting
        Oct 19 to Nov 1, wider than the statewide Oct 24 to Oct 31. With
        their rows verified: each county's subscribers get "Early voting
        starts today" on Oct 19 under a county key, naming the county, and
        never the statewide one on Oct 24; the reminders every scope shares
        keep their statewide keys; the rehearsal, the welcome email and the
        banner give a county voter the county's window; and before 0043 is
        stamped, the cron's per-scope schedule is exactly the statewide one.
     6. DELIVERY GATE. emailDeliveryConfigured() is true only with a Resend
        key, EMAIL_FROM and a service-role key, each key under either name
        (src/lib/server-keys.ts: RESEND_API_KEY or RESEND,
        SUPABASE_SERVICE_ROLE_KEY or SUPABASE), and the pages that offer a
        signup are gated on it. A source check holds every read of either
        key in src/ to server-keys.ts. config.ts is server-only, so it is
        loaded in a child Node with the react-server condition rather than
        imported here.

   What it cannot cover: anything that needs the database, Resend or a
   deployed route (the claim, the batch send, the unsubscribe link). That
   is Step 4 of docs/general-election/reminders-e2e-runbook.md.

   Run: node scripts/verify-reminder-schedule.ts */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ElectionEvent } from "../src/lib/notifications/election-events.ts";
import { bannerLine, electionDayLine } from "../src/lib/notifications/banner.ts";
import {
  bannerDates,
  dueReminders,
  dueRemindersByScope,
  easternToday,
  eventsForCounty,
  isoDaysBefore,
  nextReminder,
  REMINDER_OFFSETS,
} from "../src/lib/notifications/schedule.ts";
import {
  reminderParams,
  renderTemplate,
  welcomeEmail,
  type WelcomeEmailParams,
} from "../src/lib/notifications/templates.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = (rel: string) => readFileSync(path.join(root, rel), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const DATES = "https://dos.fl.gov/elections/for-voters/election-dates/";
const VBM = "https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/";

/* SELECT event_type, event_date, rule, details_url FROM election_event
   WHERE election = 'general_2026' AND county_fips IS NULL
     AND verified_by IS NOT NULL;   -- live, 2026-10-04 20:16 UTC */
const EVENTS: ElectionEvent[] = [
  { id: "reg", event_type: "registration_deadline", election: "general_2026", event_date: "2026-10-05", rule: "postmarked_by", details_url: DATES },
  { id: "vbm", event_type: "vbm_request_deadline", election: "general_2026", event_date: "2026-10-22", rule: "received_by", details_url: DATES },
  { id: "evs", event_type: "early_voting_start", election: "general_2026", event_date: "2026-10-24", rule: null, details_url: DATES },
  { id: "eve", event_type: "early_voting_end", election: "general_2026", event_date: "2026-10-31", rule: null, details_url: DATES },
  { id: "ret", event_type: "ballot_return_deadline", election: "general_2026", event_date: "2026-11-03", rule: "received_by", details_url: VBM },
  { id: "eday", event_type: "election_day", election: "general_2026", event_date: "2026-11-03", rule: null, details_url: DATES },
];

/* 0043_county_early_voting_2026.sql, as the founder stamps it: each covered
   county's own early-voting window, from its Supervisor of Elections. */
const COUNTY_URL: Record<string, string> = {
  "12086": "https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf",
  "12011": "https://browardvotes.gov/voters/early-voting-ballot-return",
  "12057": "https://www.votehillsborough.gov/EarlyVoting",
  "12095": "https://voteorangefl.gov/vote-early/",
};
const COUNTY_NAME: Record<string, string> = {
  "12086": "Miami-Dade",
  "12011": "Broward",
  "12057": "Hillsborough",
  "12095": "Orange",
};
const COUNTIES = Object.keys(COUNTY_URL);
const COUNTY_ROWS: ElectionEvent[] = COUNTIES.flatMap((fips) => [
  { id: `evs-${fips}`, county_fips: fips, event_type: "early_voting_start" as const, election: "general_2026", event_date: "2026-10-19", rule: null, details_url: COUNTY_URL[fips] },
  { id: `eve-${fips}`, county_fips: fips, event_type: "early_voting_end" as const, election: "general_2026", event_date: "2026-11-01", rule: null, details_url: COUNTY_URL[fips] },
]);
const ALL: ElectionEvent[] = [...EVENTS, ...COUNTY_ROWS];

const FIRST_RUN = "2026-10-04";
const LAST_RUN = "2026-11-04";
const RUN_DAYS: string[] = [];
for (let d = FIRST_RUN; d <= LAST_RUN; d = isoDaysBefore(d, -1)) RUN_DAYS.push(d);

/* The templates' own date format (templates.ts longDate). */
function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ---- 1. daily cron walk ------------------------------------------------ */

console.log("1. Daily 14:00 UTC cron, 2026-10-04 through 2026-11-04");

type Sent = {
  day: string;
  template_id: string;
  event_type: ElectionEvent["event_type"];
  event_date: string;
  offset_days: number;
  dedupe_key: string;
  body: string;
};
const ledger = new Set<string>();
const sent: Sent[] = [];
const dayMismatches: string[] = [];
const duplicateClaims: string[] = [];
const rerunSends: string[] = [];

for (const day of RUN_DAYS) {
  const today = easternToday(new Date(`${day}T14:00:00Z`));
  if (today !== day) dayMismatches.push(`${day} 14:00Z -> ${today}`);

  for (const r of dueReminders(EVENTS, today)) {
    if (ledger.has(r.dedupe_key)) {
      duplicateClaims.push(`${day} ${r.dedupe_key}`);
      continue;
    }
    ledger.add(r.dedupe_key);
    const rendered = renderTemplate(r.template_id, reminderParams(r.event));
    sent.push({
      day,
      template_id: r.template_id,
      event_type: r.event.event_type,
      event_date: r.event.event_date,
      offset_days: r.offset_days,
      dedupe_key: r.dedupe_key,
      body: rendered.body,
    });
  }

  /* A manual re-run the same evening (20:00 UTC = 4 p.m. Eastern): every
     key it finds is already claimed, so nothing new goes out. */
  for (const r of dueReminders(EVENTS, easternToday(new Date(`${day}T20:00:00Z`)))) {
    if (!ledger.has(r.dedupe_key)) rerunSends.push(`${day} ${r.dedupe_key}`);
  }
}

console.log("");
console.log("     send day     template              for");
for (const s of sent) {
  console.log(
    `     ${s.day}   ${s.template_id.padEnd(20)}  ${s.event_type} ${s.event_date} (T-${s.offset_days})`
  );
}
console.log("");

check(
  "14:00 UTC is the same calendar day in Florida on every run (EDT and EST)",
  dayMismatches.length === 0,
  dayMismatches.join("; ")
);

const EXPECTED = [
  "2026-10-04 reg_deadline_t1",
  "2026-10-21 vbm_deadline_t1",
  "2026-10-24 early_voting_start",
  "2026-10-27 ballot_return_t7",
  "2026-11-02 ballot_return_t1",
  "2026-11-03 election_day",
];
const actual = sent.map((s) => `${s.day} ${s.template_id}`);
check(
  "send calendar is exactly the six expected sends",
  JSON.stringify(actual) === JSON.stringify(EXPECTED),
  `got: ${actual.join(", ")}`
);

const sendsOf = (template: string) => sent.filter((s) => s.template_id === template);

const vbm = sendsOf("vbm_deadline_t1");
check(
  "vote-by-mail request reminder fires once, before Oct 22",
  vbm.length === 1 && vbm[0].day < "2026-10-22",
  vbm.map((s) => s.day).join(", ") || "never fired"
);

const ev = sendsOf("early_voting_start");
check(
  "early-voting reminder fires once, on or before Oct 24",
  ev.length === 1 && ev[0].day <= "2026-10-24",
  ev.map((s) => s.day).join(", ") || "never fired"
);

const eday = sendsOf("election_day");
check(
  "Election Day reminder fires once, on or before Nov 3",
  eday.length === 1 && eday[0].day <= "2026-11-03",
  eday.map((s) => s.day).join(", ") || "never fired"
);

const late = sent.filter((s) => s.day > s.event_date);
check(
  "nothing fires for a deadline that has passed",
  late.length === 0,
  late.map((s) => `${s.day} ${s.dedupe_key}`).join("; ")
);
check(
  "the registration T-7 (Sep 28, already past) is not sent late",
  sendsOf("reg_deadline_t7").length === 0
);
check(
  "nothing at all fires after Election Day (Nov 4)",
  sent.every((s) => s.day <= "2026-11-03")
);

check(
  "no duplicate claims: every dedupe_key is due on exactly one day",
  duplicateClaims.length === 0 && new Set(sent.map((s) => s.dedupe_key)).size === sent.length,
  duplicateClaims.join("; ")
);
const perDay = new Map<string, number>();
for (const s of sent) perDay.set(s.day, (perDay.get(s.day) ?? 0) + 1);
const crowded = [...perDay].filter(([, n]) => n > 1);
check(
  "at most one reminder per subscriber per day (Nov 3: Election Day only, no return-deadline T-0)",
  crowded.length === 0,
  crowded.map(([d, n]) => `${d}: ${n}`).join("; ")
);
check(
  "a same-day manual re-run sends nothing new",
  rerunSends.length === 0,
  rerunSends.join("; ")
);

const missed: string[] = [];
for (const rule of REMINDER_OFFSETS) {
  for (const event of EVENTS.filter((e) => e.event_type === rule.event_type)) {
    const day = isoDaysBefore(event.event_date, rule.offset_days);
    if (day < FIRST_RUN || day > LAST_RUN) continue;
    if (!sent.some((s) => s.day === day && s.template_id === rule.template_id)) {
      missed.push(`${rule.template_id} on ${day}`);
    }
  }
}
check(
  "every REMINDER_OFFSETS rule due in the window fires on its day",
  missed.length === 0,
  missed.join("; ")
);

const RELATIVE: Record<number, RegExp> = {
  0: /\btoday\b/i,
  1: /\btomorrow\b/i,
  7: /\bone week\b/i,
};
for (const s of sent) {
  const relative = RELATIVE[s.offset_days];
  check(
    `${s.template_id} on ${s.day}: names ${longDate(s.event_date)} and says "${relative?.source.replaceAll("\\b", "")}"`,
    s.body.includes(longDate(s.event_date)) && !!relative && relative.test(s.body),
    s.body
  );
}

/* ---- 2. rehearsal target ------------------------------------------------ */

console.log("\n2. Rehearsal target: nextReminder(), every day and evening");

/* The rehearsal must send what the cohort will get next — the first send
   in section 1's calendar on or after the Florida day. */
const rehearsalWrong: string[] = [];
for (const day of RUN_DAYS) {
  for (const instant of [`${day}T14:00:00Z`, `${isoDaysBefore(day, -1)}T03:30:00Z`]) {
    const today = easternToday(new Date(instant));
    const want = sent.find((s) => s.day >= today) ?? null;
    const got = nextReminder(EVENTS, today);
    const ok =
      want === null
        ? got === null
        : got !== null && got.day === want.day && got.reminder.template_id === want.template_id;
    if (!ok) {
      rehearsalWrong.push(
        `${instant} (Florida ${today}): want ${want ? `${want.template_id} ${want.day}` : "nothing"}, got ${got ? `${got.reminder.template_id} ${got.day}` : "nothing"}`
      );
    }
  }
}
check(
  "on every day and evening, the rehearsal is the next real send on the calendar",
  rehearsalWrong.length === 0,
  rehearsalWrong.join("\n      ")
);
const nextOn = (day: string) => {
  const n = nextReminder(EVENTS, day);
  return n ? `${n.reminder.template_id} ${n.day}` : "nothing";
};
const quiet = RUN_DAYS.filter((d) => d >= "2026-10-05" && d <= "2026-10-20");
check(
  "Oct 5 to Oct 20 (no reminder due) rehearse the Oct 21 vote-by-mail reminder",
  quiet.length === 16 && quiet.every((d) => nextOn(d) === "vbm_deadline_t1 2026-10-21"),
  quiet.map((d) => `${d}: ${nextOn(d)}`).join("; ")
);
check(
  "Oct 22 and Oct 23 rehearse early voting on Oct 24",
  ["2026-10-22", "2026-10-23"].every((d) => nextOn(d) === "early_voting_start 2026-10-24")
);
check("Nov 4: nothing left to rehearse", nextReminder(EVENTS, "2026-11-04") === null);

const cronSource = source("src/app/api/cron/send-reminders/route.ts");
check(
  "the route rehearses with schedule.ts's nextReminder, not a copy of its own",
  /nextReminder,?\s[\s\S]*from "@\/lib\/notifications\/schedule"/.test(cronSource) &&
    !/function nextReminder/.test(cronSource)
);
check(
  "the rehearsal address comes from the POST body, never the query string",
  /request\.text\(\)/.test(cronSource) &&
    !/searchParams\.get\("rehearse"\)/.test(cronSource) &&
    /searchParams\.has\("rehearse"\)[\s\S]{0,200}invalid/.test(cronSource)
);
check(
  "the rehearsal claim is a synthetic key, never a real dedupe_key",
  /`rehearsal:\$\{/.test(cronSource)
);
check(
  "the cron mails each address once per reminder, across subscriptions and pages",
  /const mailed = new Set<string>\(\);[\s\S]*mailed\.has\(address\)[\s\S]*recipients\.slice\(/.test(cronSource) &&
    /sub\.email\.toLowerCase\(\)/.test(cronSource)
);

/* ---- 3. welcome email -------------------------------------------------- */

console.log("\n3. Welcome email (welcomeEmail), every day");

const WELCOME_BASE: WelcomeEmailParams = {
  zip: "33130",
  county: "Miami-Dade",
  district: "FL-27",
  office: {
    name: "Miami-Dade Supervisor of Elections",
    url: "https://www.miamidade.gov/global/elections/home.page",
  },
  stateUrl: "https://dos.fl.gov/elections/",
  origin: "https://knowyour.vote",
  unsubscribeUrl: `https://knowyour.vote/api/voting-info/unsubscribe?token=${"0".repeat(32)}`,
  events: EVENTS,
  today: FIRST_RUN,
  hasRaces: true,
  remindersOn: true,
};

const EARLY_END = "2026-10-31";
/* Which date lines a voter signing up that Florida day should get. */
const WELCOME_LINES: [string, RegExp, string][] = [
  ["registration", /^Registration deadline: /m, "2026-10-05"],
  ["vote-by-mail request", /^Vote-by-mail request deadline: /m, "2026-10-22"],
  ["early voting window", /^Early voting: Saturday, October 24, 2026 to Saturday, October 31, 2026/m, EARLY_END],
  ["ballot return", /^Vote-by-mail ballots must be received by 7 p\.m\. on Tuesday, November 3, 2026/m, "2026-11-03"],
  ["general election", /^General election: Tuesday, November 3, 2026$/m, "2026-11-03"],
];

const welcomeWrong: string[] = [];
const welcomePast: string[] = [];
const welcomeShape: string[] = [];
for (const day of RUN_DAYS) {
  const { subject, text } = welcomeEmail({ ...WELCOME_BASE, today: day });
  for (const [label, re, lastDay] of WELCOME_LINES) {
    if (re.test(text) !== day <= lastDay) {
      welcomeWrong.push(`${day}: ${label} line ${re.test(text) ? "present" : "missing"}`);
    }
  }
  for (const e of EVENTS) {
    const stillOpen = e.event_type === "early_voting_start" && day <= EARLY_END;
    if (e.event_date < day && !stillOpen && text.includes(longDate(e.event_date))) {
      welcomePast.push(`${day}: ${e.event_type} ${e.event_date}`);
    }
  }
  const hasDates = day <= "2026-11-03";
  if (
    subject !== "Where to vote in Miami-Dade County" ||
    /Key dates:/.test(text) !== hasDates ||
    /\/api\/calendar\/general_2026\.ics/.test(text) !== hasDates ||
    !text.includes("\n\n") ||
    /one-time/i.test(text) ||
    !text.endsWith(WELCOME_BASE.unsubscribeUrl)
  ) {
    welcomeShape.push(day);
  }
}
check(
  "each date line appears through its own Florida day and is gone the day after",
  welcomeWrong.length === 0,
  welcomeWrong.join("; ")
);
check(
  "never lists a date that has passed (early voting's start only while the window is open)",
  welcomePast.length === 0,
  welcomePast.join("; ")
);
check(
  "keeps its paragraph breaks, never says \"one-time\", ends with the unsubscribe link, and drops the key-dates block and calendar link after Election Day",
  welcomeShape.length === 0,
  `days: ${welcomeShape.join(", ")}`
);

const promised = /short reminder as each remaining deadline comes up/;
const pausedDays = RUN_DAYS.filter(
  (day) => /reminder/i.test(welcomeEmail({ ...WELCOME_BASE, today: day, remindersOn: false }).text)
);
check(
  "promises reminders while they run, and mentions none while NOTIFICATIONS_PAUSED is set",
  promised.test(welcomeEmail(WELCOME_BASE).text) && pausedDays.length === 0,
  pausedDays.join(", ")
);
check(
  "no General election line for a ZIP without races; no Key dates block without verified rows",
  !/General election:/.test(welcomeEmail({ ...WELCOME_BASE, hasRaces: false }).text) &&
    !/Key dates:|general_2026\.ics/.test(welcomeEmail({ ...WELCOME_BASE, events: [] }).text)
);
check(
  "outside the four counties it points to the Division of Elections",
  welcomeEmail({ ...WELCOME_BASE, office: null }).text.includes(
    "Your county Supervisor of Elections — https://dos.fl.gov/elections/"
  )
);
const votingInfoRoute = source("src/app/api/voting-info/route.ts");
check(
  "the signup route sends welcomeEmail(), lower-cases the address, and passes !remindersPaused()",
  /welcomeEmail\(\{/.test(votingInfoRoute) &&
    /remindersOn: !remindersPaused\(\)/.test(votingInfoRoute) &&
    /parsed\.data\.email\.trim\(\)\.toLowerCase\(\)/.test(votingInfoRoute)
);

/* ---- 4. America/New_York day boundary ---------------------------------- */

console.log("\n4. America/New_York day boundary");

const BOUNDARY: [string, string, string][] = [
  ["2026-10-05T03:59:00Z", "2026-10-04", "11:59 p.m. EDT Oct 4"],
  ["2026-10-05T04:00:00Z", "2026-10-05", "midnight EDT Oct 5"],
  ["2026-10-06T03:30:00Z", "2026-10-05", "11:30 p.m. EDT on registration day"],
  ["2026-11-01T05:30:00Z", "2026-11-01", "1:30 a.m. EDT Nov 1, before DST ends"],
  ["2026-11-02T04:30:00Z", "2026-11-01", "11:30 p.m. EST Nov 1, after DST ends"],
  ["2026-11-02T05:00:00Z", "2026-11-02", "midnight EST Nov 2"],
  ["2026-11-04T04:59:00Z", "2026-11-03", "11:59 p.m. EST on Election Day"],
];
for (const [instant, expected, label] of BOUNDARY) {
  const got = easternToday(new Date(instant));
  check(`easternToday(${instant}) = ${expected} (${label})`, got === expected, `got ${got}`);
}

/* The recovery path from the design doc §7: the Oct 21 14:00 UTC send
   fails, its claim is released, and the founder re-runs it by hand that
   evening at 9:30 p.m. Eastern — 01:30 UTC on Oct 22. */
const evening = new Date("2026-10-22T01:30:00Z");
const retried = dueReminders(EVENTS, easternToday(evening)).map((r) => r.template_id);
check(
  "a 9:30 p.m. Eastern re-run on Oct 21 retries that day's vote-by-mail reminder",
  retried.length === 1 && retried[0] === "vbm_deadline_t1",
  `got: ${retried.join(", ") || "nothing"}`
);
const utcDay = evening.toISOString().slice(0, 10);
console.log(
  `      (the old UTC day, ${utcDay}, would have found: ${dueReminders(EVENTS, utcDay).map((r) => r.template_id).join(", ") || "nothing"})`
);
const nightBefore = dueReminders(EVENTS, easternToday(new Date("2026-10-24T02:00:00Z")));
check(
  "a 10 p.m. Eastern run on Oct 23 does not send \"Early voting starts today\" a night early",
  nightBefore.length === 0,
  `got: ${nightBefore.map((r) => r.template_id).join(", ")}`
);

const cronRoute = source("src/app/api/cron/send-reminders/route.ts");
check(
  "send-reminders route takes today from easternToday(), not the UTC date",
  /easternToday\(\)/.test(cronRoute) && !/toISOString\(\)\.slice\(0, ?10\)/.test(cronRoute)
);
check(
  "voting-info route filters past dates with easternToday()",
  /easternToday\(\)/.test(source("src/app/api/voting-info/route.ts"))
);

/* ---- 5. deadline banner rollover --------------------------------------- */

console.log("\n5. Deadline banner rollover");

function expectedNext(day: string): ElectionEvent["event_type"] | null {
  if (day <= "2026-10-05") return "registration_deadline";
  if (day <= "2026-10-22") return "vbm_request_deadline";
  if (day <= "2026-10-23") return "early_voting_start";
  if (day <= "2026-10-31") return "early_voting_end";
  if (day <= "2026-11-03") return "ballot_return_deadline";
  return null;
}

const bannerWrong: string[] = [];
const bannerPast: string[] = [];
for (const day of RUN_DAYS) {
  /* Midday Eastern, and 10:30 or 11:30 p.m. Eastern the same day. */
  for (const instant of [`${day}T16:00:00Z`, `${isoDaysBefore(day, -1)}T03:30:00Z`]) {
    const today = easternToday(new Date(instant));
    const dates = bannerDates(EVENTS, today);
    const want = expectedNext(day);
    const got = dates?.next?.event_type ?? null;
    const shown = want === null ? dates === null : got === want && dates?.electionDay?.event_date === "2026-11-03";
    if (today !== day || !shown) bannerWrong.push(`${instant} (Florida ${today}): want ${want ?? "no banner"}, got ${dates ? got : "no banner"}`);
    if (dates?.next && dates.next.event_date < today) bannerPast.push(`${instant}: ${dates.next.event_type}`);
  }
}
check(
  "banner states the next actionable date, then Election Day, on every day and evening",
  bannerWrong.length === 0,
  bannerWrong.join("\n      ")
);
check("banner never states a date that has passed", bannerPast.length === 0, bannerPast.join("; "));
check(
  "registration deadline still shown at 11:30 p.m. EDT on Oct 5",
  bannerDates(EVENTS, easternToday(new Date("2026-10-06T03:30:00Z")))?.next?.event_type === "registration_deadline"
);
check(
  "and rolled to the vote-by-mail request deadline at midnight",
  bannerDates(EVENTS, easternToday(new Date("2026-10-06T04:00:00Z")))?.next?.event_type === "vbm_request_deadline"
);
check(
  "banner is gone the day after Election Day",
  bannerDates(EVENTS, "2026-11-04") === null
);
check(
  "no rows (unverified, or no service key) -> no banner",
  bannerDates([], "2026-10-04") === null
);
const deadlineBanner = source("src/components/features/DeadlineBanner.tsx");
check(
  "DeadlineBanner reads the day from easternToday() and words a date that falls on it as today",
  /const today = easternToday\(\);/.test(deadlineBanner) &&
    /bannerDates\(events, today\)/.test(deadlineBanner) &&
    /bannerLine\(dates\.next, events, allEvents, today\)/.test(deadlineBanner) &&
    /electionDayLine\(dates\.electionDay\.event_date, today\)/.test(deadlineBanner)
);
{
  const lineOn = (day: string) => {
    const d = bannerDates(EVENTS, day);
    return d?.next ? bannerLine(d.next, EVENTS, EVENTS, day) : null;
  };
  check(
    "banner on the registration deadline says it's the last day",
    lineOn("2026-10-05") === "Today, October 5, is the last day to register to vote",
    String(lineOn("2026-10-05"))
  );
  check(
    "banner the day before still states the date",
    lineOn("2026-10-04") === "Register to vote by October 5",
    String(lineOn("2026-10-04"))
  );
  check(
    "banner on the last day of early voting, statewide rows only",
    lineOn("2026-10-31") === "Today, October 31, is the last day of the statewide early voting period",
    String(lineOn("2026-10-31"))
  );
  check(
    "banner on Election Day: mail ballots by 7 p.m. today, and today is Election Day",
    lineOn("2026-11-03") === "Mail ballots must be received by 7 p.m. today, November 3" &&
      electionDayLine("2026-11-03", "2026-11-03") === "Today, November 3, is Election Day" &&
      electionDayLine("2026-11-03", "2026-11-02") === "Election Day is November 3",
    String(lineOn("2026-11-03"))
  );
}

/* ---- 6. delivery gate --------------------------------------------------- */

console.log("\n6. Email delivery gate");

const GATE_PROBE = `
const m = await import(${JSON.stringify(path.join(root, "src/lib/notifications/config.ts"))});
const vars = ["RESEND_API_KEY", "EMAIL_FROM", "SUPABASE_SERVICE_ROLE_KEY"];
const rows = [];
for (let mask = 0; mask < 8; mask++) {
  vars.forEach((v, i) => { if (mask & (1 << i)) process.env[v] = "set"; else delete process.env[v]; });
  delete process.env.NOTIFICATIONS_PAUSED;
  const row = { mask, sender: m.emailSenderConfigured(), delivery: m.emailDeliveryConfigured(), promo: m.reminderPromotionLive() };
  process.env.NOTIFICATIONS_PAUSED = "1";
  row.promoPaused = m.reminderPromotionLive();
  rows.push(row);
}
/* Production's names (src/lib/server-keys.ts): SUPABASE and RESEND stand in
   for the canonical names when those are unset or empty. */
const fallback = [];
for (const canonical of [undefined, ""]) {
  delete process.env.NOTIFICATIONS_PAUSED;
  for (const v of ["RESEND_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (canonical === undefined) delete process.env[v]; else process.env[v] = canonical;
  }
  process.env.EMAIL_FROM = "set";
  process.env.RESEND = "set";
  process.env.SUPABASE = "set";
  fallback.push({ canonical: canonical ?? "unset", sender: m.emailSenderConfigured(), delivery: m.emailDeliveryConfigured() });
}
console.log(JSON.stringify({ rows, fallback, promote: m.PROMOTE_REMINDER_SIGNUP }));
`;
const probe = spawnSync(
  process.execPath,
  ["--no-warnings", "--conditions=react-server", "--input-type=module", "-e", GATE_PROBE],
  { encoding: "utf8", env: { PATH: process.env.PATH ?? "" } }
);
let gate: {
  rows: { mask: number; sender: boolean; delivery: boolean; promo: boolean; promoPaused: boolean }[];
  fallback: { canonical: string; sender: boolean; delivery: boolean }[];
  promote: boolean;
} | null = null;
try {
  gate = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "");
} catch {
  gate = null;
}
check("config.ts loads under the react-server condition", gate !== null, probe.stderr.trim());
if (gate) {
  const wrong = gate.rows.filter(
    (r) =>
      r.delivery !== (r.mask === 7) ||
      r.sender !== ((r.mask & 3) === 3) ||
      r.promo !== (gate!.promote && r.mask === 7) ||
      r.promoPaused !== false
  );
  check(
    "emailDeliveryConfigured() only with RESEND_API_KEY + EMAIL_FROM + SUPABASE_SERVICE_ROLE_KEY (production names unset); promotion follows it and stops while NOTIFICATIONS_PAUSED",
    wrong.length === 0,
    JSON.stringify(wrong)
  );
  check(
    "production's names (RESEND, SUPABASE) count when the canonical names are unset or empty",
    gate.fallback.length === 2 && gate.fallback.every((r) => r.sender && r.delivery),
    JSON.stringify(gate.fallback)
  );
  console.log(`      (PROMOTE_REMINDER_SIGNUP = ${gate.promote}: founder decision 3, recommended, pending confirmation)`);
}

/* Every read of either key in the deployed app goes through server-keys.ts
   (README, Environment variables). A direct read sees one name only: in
   production, where the keys are set only as RESEND and SUPABASE, a read
   of the canonical name finds nothing after the gate above has said yes.
   A bare new Resend() is such a read, since the SDK falls back to
   process.env.RESEND_API_KEY. Neither pattern matches NEXT_PUBLIC_SUPABASE_*. */
function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(rel);
    return /\.tsx?$/.test(entry.name) ? [rel] : [];
  });
}
const KEY_READ =
  /process\.env(?:\??\.|\??\.?\[\s*["'`])(?:RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND|SUPABASE)\b/;
const KEY_DESTRUCTURE =
  /\b(?:RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND|SUPABASE)\b[^}]*\}\s*=\s*process\.env\b/;
const SERVER_KEYS = "src/lib/server-keys.ts";
const keyReaders: string[] = [];
const resendCalls: string[] = [];
let resendCount = 0;
for (const rel of sourceFiles("src")) {
  const code = source(rel);
  if (rel !== SERVER_KEYS && (KEY_READ.test(code) || KEY_DESTRUCTURE.test(code))) keyReaders.push(rel);
  for (const [call] of code.matchAll(/new\s+Resend\b[^;\n]*/g)) {
    resendCount++;
    if (!call.startsWith("new Resend(resendApiKey())")) resendCalls.push(`${rel}: ${call}`);
  }
}
check(
  "every read of either key in the deployed app (src/) goes through src/lib/server-keys.ts",
  KEY_READ.test(source(SERVER_KEYS)) && keyReaders.length === 0,
  keyReaders.join(", ") || `no key read found in ${SERVER_KEYS}`
);
check(
  "every new Resend( in src/ is new Resend(resendApiKey())",
  resendCount > 0 && resendCalls.length === 0,
  resendCalls.join("; ") || "no new Resend( found"
);
check(
  "src/lib/supabase/service.ts takes its key from serviceRoleKey()",
  /= serviceRoleKey\(\)/.test(source("src/lib/supabase/service.ts"))
);

const yourRaces = source("src/components/features/YourRaces.tsx");
check(
  "races view passes the server-side flags to VotingInfo (delivery, and reminders not paused)",
  /emailEnabled=\{emailDeliveryConfigured\(\)\}/.test(yourRaces) &&
    /remindersOn=\{!remindersPaused\(\)\}/.test(yourRaces)
);
const home = source("src/app/(public)/page.tsx");
check(
  "home page renders the signup card only behind reminderPromotionLive()",
  /reminderPromotionLive\(\)/.test(home) &&
    /\{promoteReminders && <ReminderSignupCta countyFips=\{saved\?\.countyFips\} \/>\}/.test(home)
);
const votingInfo = source("src/components/features/VotingInfo.tsx");
check(
  "VotingInfo offers no form when delivery is off",
  /if \(!emailEnabled\)/.test(votingInfo)
);
/* Every sentence in the form that promises reminders sits in the
   remindersOn branch of a ternary: strip those branches and none remain. */
const withoutReminderBranches = votingInfo.replace(/remindersOn\s*\?\s*"[^"]*"/g, "");
check(
  "VotingInfo promises reminders only under remindersOn",
  !/each remaining deadline/.test(withoutReminderBranches.replace(/\/\*[\s\S]*?\*\//g, "")),
  "a reminder promise outside a remindersOn ? \"...\" branch"
);
const cta = source("src/components/features/ReminderSignupCta.tsx");
check(
  "the home card does not claim the email contains the polling place",
  !/polling place comes first/i.test(cta) && /official link to look up your polling place/.test(cta)
);

/* ---- 7. county dates (0043) --------------------------------------------- */

console.log("\n7. County early-voting dates (0043)");

/* Before the founder stamps 0043 the live rows are statewide only, and the
   cron's per-scope schedule must be exactly the statewide one it replaced:
   same reminders, same keys, all to the statewide scope. */
const scopeDrift: string[] = [];
for (const day of RUN_DAYS) {
  const plain = dueReminders(EVENTS, day).map((r) => r.dedupe_key);
  const scoped = dueRemindersByScope(EVENTS, day);
  const keys = scoped.map((g) => g.reminder.dedupe_key);
  if (
    JSON.stringify(plain) !== JSON.stringify(keys) ||
    scoped.some((g) => g.scopes.length !== 1 || g.scopes[0] !== null)
  ) {
    scopeDrift.push(`${day}: ${plain.join(",")} vs ${keys.join(",")}`);
  }
}
check(
  "statewide rows only: the per-scope schedule is the statewide schedule, unchanged",
  scopeDrift.length === 0,
  scopeDrift.join("; ")
);

/* The daily walk again, with 0043's rows verified, through the function
   the cron calls. Each scope's calendar is what its subscribers receive. */
type ScopedSend = { day: string; template_id: string; dedupe_key: string; scopes: (string | null)[]; body: string; event_date: string };
const countyLedger = new Set<string>();
const countySends: ScopedSend[] = [];
const countyRerun: string[] = [];
for (const day of RUN_DAYS) {
  for (const { reminder, scopes } of dueRemindersByScope(ALL, day)) {
    if (countyLedger.has(reminder.dedupe_key)) continue;
    countyLedger.add(reminder.dedupe_key);
    countySends.push({
      day,
      template_id: reminder.template_id,
      dedupe_key: reminder.dedupe_key,
      scopes,
      event_date: reminder.event.event_date,
      body: renderTemplate(reminder.template_id, reminderParams(reminder.event)).body,
    });
  }
  for (const { reminder } of dueRemindersByScope(ALL, easternToday(new Date(`${day}T20:00:00Z`)))) {
    if (!countyLedger.has(reminder.dedupe_key)) countyRerun.push(`${day} ${reminder.dedupe_key}`);
  }
}
const calendarOf = (scope: string | null) =>
  countySends.filter((x) => x.scopes.includes(scope)).map((x) => `${x.day} ${x.template_id}`);

check(
  "statewide scope (a voter in no county with its own dates): the six statewide sends, early voting Oct 24",
  JSON.stringify(calendarOf(null)) === JSON.stringify(EXPECTED),
  calendarOf(null).join(", ")
);
const EXPECTED_COUNTY = [
  "2026-10-04 reg_deadline_t1",
  "2026-10-19 early_voting_start",
  "2026-10-21 vbm_deadline_t1",
  "2026-10-27 ballot_return_t7",
  "2026-11-02 ballot_return_t1",
  "2026-11-03 election_day",
];
for (const fips of COUNTIES) {
  check(
    `${COUNTY_NAME[fips]}: early voting on Oct 19, never the statewide Oct 24 reminder`,
    JSON.stringify(calendarOf(fips)) === JSON.stringify(EXPECTED_COUNTY),
    calendarOf(fips).join(", ")
  );
}
const statewideEarly = countySends.find(
  (x) => x.template_id === "early_voting_start" && x.event_date === "2026-10-24"
);
check(
  "the statewide Oct 24 reminder goes to the statewide scope alone",
  !!statewideEarly && JSON.stringify(statewideEarly.scopes) === JSON.stringify([null]),
  JSON.stringify(statewideEarly?.scopes)
);
const countyEarly = countySends.filter(
  (x) => x.template_id === "early_voting_start" && x.event_date === "2026-10-19"
);
check(
  "each county's Oct 19 reminder is its own send, keyed by county, to that county only",
  countyEarly.length === COUNTIES.length &&
    COUNTIES.every((fips) =>
      countyEarly.some(
        (x) =>
          x.dedupe_key === `general_2026:early_voting_start:T-0:email:${fips}` &&
          JSON.stringify(x.scopes) === JSON.stringify([fips])
      )
    ),
  countyEarly.map((x) => `${x.dedupe_key} -> ${JSON.stringify(x.scopes)}`).join("; ")
);
const shared = countySends.filter((x) => x.template_id !== "early_voting_start");
check(
  "every other reminder keeps its statewide key and reaches every scope",
  shared.length === 5 &&
    shared.every(
      (x) => !/:\d{5}$/.test(x.dedupe_key) && x.scopes.length === COUNTIES.length + 1
    ),
  shared.map((x) => `${x.dedupe_key} -> ${x.scopes.length} scopes`).join("; ")
);
check("a same-day manual re-run sends nothing new (county keys included)", countyRerun.length === 0, countyRerun.join("; "));
for (const x of countyEarly) {
  const fips = x.scopes[0] as string;
  check(
    `${COUNTY_NAME[fips]}'s Oct 19 email says today, names the county, its date and its own early-voting page`,
    /\btoday\b/.test(x.body) &&
      x.body.includes(longDate("2026-10-19")) &&
      x.body.includes(`in ${COUNTY_NAME[fips]} County`) &&
      x.body.includes(COUNTY_URL[fips]) &&
      !/statewide/.test(x.body),
    x.body
  );
}
check(
  "the statewide email keeps its statewide wording",
  !!statewideEarly && /statewide window/.test(statewideEarly.body) && !/ County\./.test(statewideEarly.body),
  statewideEarly?.body
);
let rejectsUncovered = false;
try {
  renderTemplate("early_voting_start", { ...reminderParams(COUNTY_ROWS[0]), county: "Duval" });
} catch {
  rejectsUncovered = true;
}
check("the template refuses a county name that is not a covered county", rejectsUncovered);

/* Rehearsal: the route rehearses the subscriber's own scope. */
const dade = eventsForCounty(ALL, "12086");
const dadeNext = (day: string) => {
  const n = nextReminder(dade, day);
  return n ? `${n.reminder.template_id} ${n.day}` : "nothing";
};
const beforeOpen = RUN_DAYS.filter((d) => d >= "2026-10-05" && d <= "2026-10-19");
check(
  "a Miami-Dade subscriber's rehearsal, Oct 5 to Oct 19, is early voting on Oct 19",
  beforeOpen.every((d) => dadeNext(d) === "early_voting_start 2026-10-19"),
  beforeOpen.map((d) => `${d}: ${dadeNext(d)}`).join("; ")
);
check(
  "and Oct 20 to Oct 21, the Oct 21 vote-by-mail reminder",
  ["2026-10-20", "2026-10-21"].every((d) => dadeNext(d) === "vbm_deadline_t1 2026-10-21")
);
check(
  "the route works out the subscriber's scope and rehearses eventsForCounty, with reminderParams",
  /nextReminder\(eventsForCounty\(events, scope\), today\)/.test(cronSource) &&
    /dueRemindersByScope\(events, today\)/.test(cronSource) &&
    (cronSource.match(/renderTemplate\([^;]*reminderParams\(/g) ?? []).length === 2
);

/* Welcome email for a Miami-Dade ZIP, every day. */
const dadeWelcome: string[] = [];
for (const day of RUN_DAYS) {
  const { text } = welcomeEmail({ ...WELCOME_BASE, events: dade, today: day });
  const line = `Early voting in Miami-Dade County: ${longDate("2026-10-19")} to ${longDate("2026-11-01")}. Sites and hours: ${COUNTY_URL["12086"]}`;
  if (text.includes(line) !== day <= "2026-11-01") dadeWelcome.push(`${day}: county line ${text.includes(line) ? "present" : "missing"}`);
  if (/October 24, 2026|October 31, 2026|statewide window/.test(text)) dadeWelcome.push(`${day}: statewide window shown`);
  if (day <= "2026-11-03" && !text.includes("/api/calendar/general_2026.ics?county=12086")) dadeWelcome.push(`${day}: calendar link not the county's`);
}
check(
  "welcome email (Miami-Dade ZIP): the county's window through Nov 1, never the statewide one, and the county calendar",
  dadeWelcome.length === 0,
  dadeWelcome.join("; ")
);
check(
  "welcome email with statewide rows only keeps the statewide line and calendar",
  /Early voting: Saturday, October 24, 2026 to Saturday, October 31, 2026 \(the statewide window/.test(
    welcomeEmail(WELCOME_BASE).text
  ) && /general_2026\.ics\n/.test(welcomeEmail(WELCOME_BASE).text)
);
check(
  "the signup route gives welcomeEmail the voter's county's dates",
  /eventsForCounty\(\s*await verifiedElectionEvents\(service, "general_2026"\),\s*resolved\.countyFips \?\? null\s*\)/.test(votingInfoRoute)
);

/* Banner, for a visitor whose saved district is in Miami-Dade. */
function expectedNextCounty(day: string): ElectionEvent["event_type"] | null {
  if (day <= "2026-10-05") return "registration_deadline";
  if (day <= "2026-10-18") return "early_voting_start";
  if (day <= "2026-10-22") return "vbm_request_deadline";
  if (day <= "2026-11-01") return "early_voting_end";
  if (day <= "2026-11-03") return "ballot_return_deadline";
  return null;
}
const dadeBanner: string[] = [];
for (const day of RUN_DAYS) {
  const dates = bannerDates(dade, day);
  const want = expectedNextCounty(day);
  const got = dates?.next?.event_type ?? null;
  if (want === null ? dates !== null : got !== want) dadeBanner.push(`${day}: want ${want}, got ${got}`);
  if (dates?.next && dates.next.event_date < day) dadeBanner.push(`${day}: passed ${dates.next.event_type}`);
  if (dates?.next && /early_voting/.test(dates.next.event_type)) {
    const line = bannerLine(dates.next, dade, ALL);
    if (line !== "Early voting runs October 19 to November 1 in Miami-Dade County") dadeBanner.push(`${day}: "${line}"`);
  }
}
check(
  "banner (Miami-Dade): the county's window from Oct 6 to Oct 18 and Oct 23 to Nov 1, never a passed date",
  dadeBanner.length === 0,
  dadeBanner.join("\n      ")
);
const statewideNext = bannerDates(EVENTS, "2026-10-23")?.next;
check(
  "banner (no saved county): the statewide window, then where it runs longer",
  !!statewideNext &&
    bannerLine(statewideNext, EVENTS, ALL) ===
      "Early voting runs October 24 to October 31 statewide; October 19 to November 1 in Miami-Dade, Broward, Hillsborough and Orange counties",
  statewideNext ? bannerLine(statewideNext, EVENTS, ALL) : "no next date"
);
check(
  "banner with statewide rows only: the statewide window alone",
  !!statewideNext && bannerLine(statewideNext, EVENTS, EVENTS) === "Early voting runs October 24 to October 31 statewide"
);
{
  /* The last statewide day, with the covered counties' rows present: say how
     much longer they run, not "the last day statewide" and then a window that
     contradicts it. */
  const oct31 = bannerDates(EVENTS, "2026-10-31")?.next;
  const line = oct31 ? bannerLine(oct31, EVENTS, ALL, "2026-10-31") : "no next date";
  check(
    "banner on the last statewide early voting day names the counties that run later",
    line ===
      "Today, October 31, is the last day of the statewide early voting period; it runs through November 1 in Miami-Dade, Broward, Hillsborough and Orange counties",
    line
  );
  const nov1 = bannerDates(dade, "2026-11-01")?.next;
  const dadeLine = nov1 ? bannerLine(nov1, dade, ALL, "2026-11-01") : "no next date";
  check(
    "banner (Miami-Dade) on its own last day of early voting",
    dadeLine === "Today, November 1, is the last day of early voting in Miami-Dade County",
    dadeLine
  );
}
check(
  "the home reminder card's calendar link carries the saved county, like the banner's",
  /<ReminderSignupCta countyFips=\{saved\?\.countyFips\} \/>/.test(home) &&
    /countyFips=\{countyFips\}/.test(source("src/components/features/ReminderSignupCta.tsx")) &&
    /general_2026\.ics\$\{countyFips \? `\?county=\$\{countyFips\}` : ""\}/.test(votingInfo)
);
check(
  "a reminder due to no one is reported in the digest, and pacing spans the whole run",
  /if \(sent\.length > 0 \|\| noRecipients\.length > 0\)/.test(cronSource) &&
    /if \(batchCalls\+\+ > 0\)/.test(cronSource)
);
const bannerSource = source("src/components/features/DeadlineBanner.tsx");
check(
  "DeadlineBanner reads the saved county's dates and links its calendar; the home page passes the cookie's county",
  /eventsForCounty\(allEvents, scope\)/.test(bannerSource) &&
    /\?county=\$\{scope\}/.test(bannerSource) &&
    /countyFips=\{saved\?\.countyFips\}/.test(home)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nReminder schedule dry-run passed.");
