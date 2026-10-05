/* Manual correction send (design doc §7 playbook; plan C3). No server, no
   env, no database: src/lib/notifications/correction.ts, the pure half of
   POST /api/cron/send-correction, is driven with the general_2026
   election_event rows as the live database held them on 2026-10-05 (six
   statewide rows, all verified), plus 0043's county early-voting rows,
   stamped or not.

     1. LABEL -> EVENT TYPE. Every event_label in the template's enum maps
        to its own election_event type, all six types, one each.
     2. REQUEST. parseCorrectionRequest(), the POST body: exactly one mode;
        the real send only through "confirm_recipients", a positive whole
        number, together with "confirm_key"; the template's own rules on
        every param; unknown keys and
        uncovered counties refused; every refusal ends "Nothing was sent."
     3. VERIFIED-DATE GUARD. correctionTarget() accepts the matching
        verified row, statewide or the county's own, and refuses a wrong
        date, an unverified row, a mismatched details_url, a county row for
        the wrong county, a county correction where the county has no row
        of its own, and a statewide correction carrying a county's date.
     4. SCOPE. correctionReaches(): the statewide and county corrections
        for one event type split the subscribers between them with no
        overlap and no gap, exactly as the reminders' scopes do; before
        0043 is stamped, the statewide correction reaches everyone.
     5. KEY AND COPY. The claim key is correction:<election>:<event_type>:
        <date>[:<county>], distinct per row and never a reminder's key; the
        email is rendered from the verified row and fits BUDGETS for every
        label, every row and the longest date of the year.
     6. ROUTE SOURCE. POST only; nothing read from the URL; authorized by
        its own CORRECTION_SECRET (never CRON_SECRET), and off without it;
        the guard before any mode; the real send only when confirm_key is
        this correction's dedupe_key and confirm_recipients equals the
        recipient count, and only after both; the "correction:" claim with ON CONFLICT DO NOTHING
        and its release on failure; the fuse, pacing and per-address
        dedupe; not gated on NOTIFICATIONS_PAUSED; and the cohort helpers
        shared with send-reminders, not copied.

   What it cannot cover: the database reads, the claim, Resend and the
   deployed route. That is the founder's one rehearsal, in
   docs/general-election/reminders-e2e-runbook.md, "Sending a correction".

   Run: node scripts/verify-correction.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORRECTION_EVENT_TYPE,
  correctionDedupeKey,
  correctionReaches,
  correctionTarget,
  parseCorrectionRequest,
  renderCorrection,
  type ElectionEventRow,
} from "../src/lib/notifications/correction.ts";
import type { ElectionEvent } from "../src/lib/notifications/election-events.ts";
import {
  countiesWithOwnDates,
  dueReminders,
  isoDaysBefore,
} from "../src/lib/notifications/schedule.ts";
import {
  BUDGETS,
  CORRECTION_EVENT_LABELS,
  renderTemplate,
  TEMPLATES,
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
const STAMP = "founder@example.com";

/* SELECT ... FROM election_event WHERE election = 'general_2026';
   live, 2026-10-05: six statewide rows, all verified, no county rows. */
const STATEWIDE: ElectionEventRow[] = [
  { id: "reg", event_type: "registration_deadline", election: "general_2026", event_date: "2026-10-05", rule: "postmarked_by", details_url: DATES, verified_by: STAMP },
  { id: "vbm", event_type: "vbm_request_deadline", election: "general_2026", event_date: "2026-10-22", rule: "received_by", details_url: DATES, verified_by: STAMP },
  { id: "evs", event_type: "early_voting_start", election: "general_2026", event_date: "2026-10-24", rule: null, details_url: DATES, verified_by: STAMP },
  { id: "eve", event_type: "early_voting_end", election: "general_2026", event_date: "2026-10-31", rule: null, details_url: DATES, verified_by: STAMP },
  { id: "ret", event_type: "ballot_return_deadline", election: "general_2026", event_date: "2026-11-03", rule: "received_by", details_url: VBM, verified_by: STAMP },
  { id: "eday", event_type: "election_day", election: "general_2026", event_date: "2026-11-03", rule: null, details_url: DATES, verified_by: STAMP },
];

/* 0043_county_early_voting_2026.sql: each covered county's own window. */
const COUNTY_URL: Record<string, string> = {
  "12086": "https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf",
  "12011": "https://browardvotes.gov/voters/early-voting-ballot-return",
  "12057": "https://www.votehillsborough.gov/EarlyVoting",
  "12095": "https://voteorangefl.gov/vote-early/",
};
const COUNTIES = Object.keys(COUNTY_URL);
const countyRows = (verified: boolean): ElectionEventRow[] =>
  COUNTIES.flatMap((fips) => [
    { id: `evs-${fips}`, county_fips: fips, event_type: "early_voting_start" as const, election: "general_2026", event_date: "2026-10-19", rule: null, details_url: COUNTY_URL[fips], verified_by: verified ? STAMP : null },
    { id: `eve-${fips}`, county_fips: fips, event_type: "early_voting_end" as const, election: "general_2026", event_date: "2026-11-01", rule: null, details_url: COUNTY_URL[fips], verified_by: verified ? STAMP : null },
  ]);
const STAMPED = [...STATEWIDE, ...countyRows(true)];
const UNSTAMPED = [...STATEWIDE, ...countyRows(false)];
/* What verifiedElectionEvents() returns for each state of the table. */
const verifiedOf = (rows: ElectionEventRow[]): ElectionEvent[] =>
  rows.filter((r) => r.verified_by);

const LABEL_OF = Object.fromEntries(
  Object.entries(CORRECTION_EVENT_TYPE).map(([label, type]) => [type, label])
) as Record<ElectionEvent["event_type"], (typeof CORRECTION_EVENT_LABELS)[number]>;

/* The templates' own date format (templates.ts longDate). */
function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ---- 1. label -> event type -------------------------------------------- */

console.log("1. event_label -> election_event type");

const EXPECTED_TYPE: Record<string, ElectionEvent["event_type"]> = {
  "voter registration deadline": "registration_deadline",
  "vote-by-mail request deadline": "vbm_request_deadline",
  "vote-by-mail ballot return deadline": "ballot_return_deadline",
  "early voting start date": "early_voting_start",
  "early voting end date": "early_voting_end",
  "election day": "election_day",
};
for (const label of CORRECTION_EVENT_LABELS) {
  check(
    `"${label}" -> ${EXPECTED_TYPE[label]}`,
    CORRECTION_EVENT_TYPE[label] === EXPECTED_TYPE[label],
    `got ${CORRECTION_EVENT_TYPE[label]}`
  );
}
const templateLabels = TEMPLATES.correction.schema.shape.event_label.options;
check(
  "the mapping covers exactly the template's event_label enum",
  JSON.stringify([...templateLabels].sort()) ===
    JSON.stringify(Object.keys(CORRECTION_EVENT_TYPE).sort()) &&
    templateLabels.length === Object.keys(EXPECTED_TYPE).length,
  `template: ${templateLabels.join(", ")}`
);
const mappedTypes = Object.values(CORRECTION_EVENT_TYPE);
check(
  "each label names a different event type, and every type the table holds has a label",
  new Set(mappedTypes).size === mappedTypes.length &&
    STATEWIDE.every((r) => mappedTypes.includes(r.event_type)),
  mappedTypes.join(", ")
);

/* ---- 2. request ---------------------------------------------------------- */

console.log("\n2. Request body (parseCorrectionRequest)");

const FIELDS = {
  event_label: "vote-by-mail request deadline",
  election: "general_2026",
  date: "2026-10-22",
  details_url: DATES,
};
const body = (extra: Record<string, unknown>) => JSON.stringify({ ...FIELDS, ...extra });
const parse = (raw: string) => parseCorrectionRequest(raw);
const modeOf = (raw: string) => {
  const r = parse(raw);
  return "request" in r ? r.request.mode : null;
};

const dry = parse(body({ dry_run: true }));
check(
  'dry_run: true -> a dry run, statewide, with the params as given',
  "request" in dry &&
    dry.request.mode.kind === "dry_run" &&
    dry.request.countyFips === null &&
    Object.keys(dry.request.params).length === Object.keys(FIELDS).length &&
    Object.entries(FIELDS).every(
      ([k, v]) => (dry.request.params as Record<string, unknown>)[k] === v
    ),
  JSON.stringify(dry)
);
const reh = modeOf(body({ rehearse: "  you+kyv@example.com " }));
check(
  'rehearse: "<address>" -> a rehearsal to the trimmed address',
  reh?.kind === "rehearse" && reh.to === "you+kyv@example.com",
  JSON.stringify(reh)
);
const send = modeOf(
  body({ confirm_recipients: 12, confirm_key: " correction:general_2026:election_day:2026-11-03 " })
);
check(
  "confirm_recipients: 12 with confirm_key -> the real send, confirming 12 and that (trimmed) key",
  send?.kind === "send" &&
    send.confirmRecipients === 12 &&
    send.confirmKey === "correction:general_2026:election_day:2026-11-03",
  JSON.stringify(send)
);
const county = parse(body({ county_fips: "12086", dry_run: true }));
check(
  "county_fips of a covered county is carried through",
  "request" in county && county.request.countyFips === "12086"
);

const INVALID: [string, string][] = [
  ["an empty body", ""],
  ["a body that is not JSON", "event_label=election day"],
  ["a JSON array", "[]"],
  ["JSON null", "null"],
  ["no mode at all", body({})],
  ["two modes (dry_run and confirm_recipients)", body({ dry_run: true, confirm_recipients: 3, confirm_key: "k" })],
  ["confirm_recipients without confirm_key (a bare count unlocks nothing)", body({ confirm_recipients: 3 })],
  ["confirm_key without confirm_recipients", body({ confirm_key: "k" })],
  ["confirm_key on a dry run", body({ dry_run: true, confirm_key: "k" })],
  ['confirm_key: ""', body({ confirm_recipients: 3, confirm_key: "" })],
  ["two modes (rehearse and confirm_recipients)", body({ rehearse: "a@example.com", confirm_recipients: 3, confirm_key: "k" })],
  ["dry_run: false", body({ dry_run: false })],
  ['dry_run: "true"', body({ dry_run: "true" })],
  ['confirm_recipients as a string ("12")', body({ confirm_recipients: "12", confirm_key: "k" })],
  ["confirm_recipients: 0", body({ confirm_recipients: 0, confirm_key: "k" })],
  ["confirm_recipients: -1", body({ confirm_recipients: -1, confirm_key: "k" })],
  ["confirm_recipients: 1.5", body({ confirm_recipients: 1.5, confirm_key: "k" })],
  ['confirm: true (a real send must give the count)', body({ confirm: true })],
  ['rehearse: ""', body({ rehearse: "" })],
  ['rehearse: "   "', body({ rehearse: "   " })],
  ["an unknown key (county_fip, misspelt)", body({ county_fip: "12086", dry_run: true })],
  ["a county outside the four (12031, Duval)", body({ county_fips: "12031", dry_run: true })],
  ["a county name instead of FIPS", body({ county_fips: "Miami-Dade", dry_run: true })],
  ["an event_label outside the enum", body({ event_label: "polls close", dry_run: true })],
  ["an election outside the enum", body({ election: "general_2028", dry_run: true })],
  ["a date not in YYYY-MM-DD", body({ date: "10/22/2026", dry_run: true })],
  ["an http details_url", body({ details_url: "http://dos.fl.gov/elections/", dry_run: true })],
  ["a missing field (no details_url)", JSON.stringify({ event_label: FIELDS.event_label, election: FIELDS.election, date: FIELDS.date, dry_run: true })],
];
for (const [label, raw] of INVALID) {
  const r = parse(raw);
  check(
    `refused: ${label}`,
    "invalid" in r && r.invalid.endsWith("Nothing was sent."),
    JSON.stringify(r)
  );
}
const realSendBodies = [
  body({ dry_run: true }),
  body({ rehearse: "a@example.com" }),
  body({ confirm_recipients: 1, confirm_key: "k" }),
];
check(
  'the only body that reaches a real send is one carrying "confirm_recipients" and "confirm_key"',
  realSendBodies.map((raw) => modeOf(raw)?.kind).join(",") === "dry_run,rehearse,send"
);

/* ---- 3. verified-date guard -------------------------------------------- */

console.log("\n3. Verified-date guard (correctionTarget)");

const paramsFor = (row: ElectionEvent, overrides: Partial<typeof FIELDS> = {}) => ({
  event_label: LABEL_OF[row.event_type],
  election: row.election,
  date: row.event_date,
  details_url: row.details_url,
  ...overrides,
}) as Parameters<typeof correctionTarget>[1];
const targetOf = (r: ReturnType<typeof correctionTarget>) => ("target" in r ? r.target : null);
const refusal = (r: ReturnType<typeof correctionTarget>) => ("refused" in r ? r.refused : "");

for (const row of STATEWIDE) {
  const r = correctionTarget(STAMPED, paramsFor(row), null);
  check(
    `accepts the verified statewide ${row.event_type} (${row.event_date})`,
    targetOf(r)?.id === row.id,
    refusal(r)
  );
}
for (const row of countyRows(true)) {
  const r = correctionTarget(STAMPED, paramsFor(row), row.county_fips!);
  check(
    `accepts ${row.county_fips}'s own verified ${row.event_type} (${row.event_date})`,
    targetOf(r)?.id === row.id,
    refusal(r)
  );
}

const reg = STATEWIDE[0];
const dadeStart = STAMPED.find((r) => r.id === "evs-12086")!;
const statewideStart = STATEWIDE.find((r) => r.event_type === "early_voting_start")!;
const REFUSED: [string, ReturnType<typeof correctionTarget>, RegExp][] = [
  [
    "a wrong date (registration Oct 6, verified Oct 5)",
    correctionTarget(STAMPED, paramsFor(reg, { date: "2026-10-06" }), null),
    /is 2026-10-05, not 2026-10-06/,
  ],
  [
    "a wrong date on a county row (Miami-Dade early voting Oct 20)",
    correctionTarget(STAMPED, paramsFor(dadeStart, { date: "2026-10-20" }), "12086"),
    /is 2026-10-19, not 2026-10-20/,
  ],
  [
    "an unverified county row (0043 applied, not stamped), date and URL matching",
    correctionTarget(UNSTAMPED, paramsFor(dadeStart), "12086"),
    /not verified/,
  ],
  [
    "an unverified statewide row, date and URL matching",
    correctionTarget(
      STAMPED.map((r) => (r.id === "vbm" ? { ...r, verified_by: null } : r)),
      paramsFor(STATEWIDE[1]),
      null
    ),
    /not verified/,
  ],
  [
    "a mismatched details_url (the vote-by-mail page for the registration row)",
    correctionTarget(STAMPED, paramsFor(reg, { details_url: VBM }), null),
    /details_url must be the verified row's own/,
  ],
  [
    "a details_url differing only by its trailing slash",
    correctionTarget(STAMPED, paramsFor(reg, { details_url: DATES.slice(0, -1) }), null),
    /details_url must be the verified row's own/,
  ],
  [
    "a county row for the wrong county (Miami-Dade's URL, county_fips Broward)",
    correctionTarget(STAMPED, paramsFor(dadeStart), "12011"),
    /details_url must be the verified row's own/,
  ],
  [
    "a county row for a county with no row of its own (Miami-Dade's row only, county_fips Orange)",
    correctionTarget(
      [...STATEWIDE, dadeStart],
      paramsFor(dadeStart),
      "12095"
    ),
    /no Orange County's own early_voting_start row/,
  ],
  [
    "a county correction where the county has no row of that type (Miami-Dade registration)",
    correctionTarget(STAMPED, paramsFor(reg), "12086"),
    /leave county_fips out/,
  ],
  [
    "a statewide correction carrying a county's date and page (Oct 19, Miami-Dade)",
    correctionTarget(STAMPED, paramsFor(dadeStart), null),
    /is 2026-10-24, not 2026-10-19/,
  ],
  [
    "a label naming a different type than the date's row (election day with the registration date)",
    correctionTarget(STAMPED, paramsFor(reg, { event_label: "election day" }), null),
    /election_day .* is 2026-11-03, not 2026-10-05/,
  ],
  [
    "another election's correction (primary_2026) against general_2026 rows",
    correctionTarget(STAMPED, paramsFor(reg, { election: "primary_2026" }), null),
    /no statewide registration_deadline row for primary_2026/,
  ],
  [
    "no rows at all (a failed or empty read)",
    correctionTarget([], paramsFor(reg), null),
    /no statewide/,
  ],
];
for (const [label, r, why] of REFUSED) {
  check(`refuses ${label}`, "refused" in r && why.test(r.refused), JSON.stringify(r));
}

/* The route's read has no ORDER BY, so the guard must pick the row by its
   scope, never by its position: the same cases with the county rows first. */
const countyFirst = [...countyRows(true), ...STATEWIDE];
check(
  "with county rows read first, a statewide early-voting correction still targets the statewide row",
  targetOf(correctionTarget(countyFirst, paramsFor(statewideStart), null))?.id === "evs"
);
check(
  "and a statewide correction carrying Miami-Dade's date and page is still refused",
  "refused" in correctionTarget(countyFirst, paramsFor(dadeStart), null)
);
check(
  "and Broward's correction still targets Broward's row, not the first county row",
  targetOf(
    correctionTarget(countyFirst, paramsFor(countyFirst.find((r) => r.id === "evs-12011")!), "12011")
  )?.id === "evs-12011"
);

/* ---- 4. scope ---------------------------------------------------------- */

console.log("\n4. Scope (correctionReaches)");

const SCOPES: (string | null)[] = [null, ...COUNTIES];
const reachedBy = (events: ElectionEvent[], target: ElectionEvent) =>
  SCOPES.filter((s) => correctionReaches(events, target, s));

const stamped = verifiedOf(STAMPED);
check(
  "a statewide registration correction reaches every scope (no county has its own registration row)",
  JSON.stringify(reachedBy(stamped, reg)) === JSON.stringify(SCOPES),
  JSON.stringify(reachedBy(stamped, reg))
);
check(
  "with 0043 stamped, the statewide early-voting correction (Oct 24) reaches the statewide scope only",
  JSON.stringify(reachedBy(stamped, statewideStart)) === JSON.stringify([null]),
  JSON.stringify(reachedBy(stamped, statewideStart))
);
check(
  "Miami-Dade's own early-voting correction reaches Miami-Dade only",
  JSON.stringify(reachedBy(stamped, dadeStart)) === JSON.stringify(["12086"]),
  JSON.stringify(reachedBy(stamped, dadeStart))
);
/* Before 0043 is stamped no county has rows of its own, so activeSubscribers
   gives every subscriber the null scope. */
const unstamped = verifiedOf(UNSTAMPED);
check(
  "before 0043 is stamped: no county scopes exist, and the statewide early-voting correction reaches everyone",
  countiesWithOwnDates(unstamped).length === 0 &&
    JSON.stringify(reachedBy(unstamped, statewideStart)) === JSON.stringify(SCOPES)
);
/* The property that makes the keys safe: for each event type, every scope
   is reached by exactly one of that type's verified rows. */
const partition: string[] = [];
for (const type of Object.values(CORRECTION_EVENT_TYPE)) {
  const rowsOfType = stamped.filter((r) => r.event_type === type);
  for (const scope of SCOPES) {
    const n = rowsOfType.filter((r) => correctionReaches(stamped, r, scope)).length;
    if (n !== 1) partition.push(`${type} / ${scope ?? "statewide"}: reached by ${n}`);
  }
}
check(
  "for every event type, each scope is reached by exactly one correction: no overlap, no gap",
  partition.length === 0,
  partition.join("; ")
);
/* And it is the same row that scope's reminders were rendered from. */
const sameAsReminders: string[] = [];
for (const day of ["2026-10-04", "2026-10-19", "2026-10-21", "2026-10-24", "2026-10-27", "2026-11-02", "2026-11-03"]) {
  for (const reminder of dueReminders(stamped, day)) {
    const reached = SCOPES.filter((s) => correctionReaches(stamped, reminder.event, s));
    if (reached.length === 0) sameAsReminders.push(`${day} ${reminder.dedupe_key} reaches no scope`);
  }
}
check(
  "every reminder's row is correctable for at least one scope",
  sameAsReminders.length === 0,
  sameAsReminders.join("; ")
);

/* ---- 5. key and copy ---------------------------------------------------- */

console.log("\n5. Claim key and rendered copy");

check(
  "statewide key: correction:general_2026:registration_deadline:2026-10-05",
  correctionDedupeKey(reg) === "correction:general_2026:registration_deadline:2026-10-05",
  correctionDedupeKey(reg)
);
check(
  "county key: correction:general_2026:early_voting_start:2026-10-19:12086",
  correctionDedupeKey(dadeStart) === "correction:general_2026:early_voting_start:2026-10-19:12086",
  correctionDedupeKey(dadeStart)
);
const keys = stamped.map(correctionDedupeKey);
check(
  "every row gets its own key, each starting correction:",
  new Set(keys).size === keys.length && keys.every((k) => k.startsWith("correction:"))
);
const reminderKeys = new Set<string>();
for (let d = "2026-09-01"; d <= "2026-11-04"; d = isoDaysBefore(d, -1)) {
  for (const r of dueReminders(stamped, d)) reminderKeys.add(r.dedupe_key);
}
check(
  "no correction key can equal a reminder key or a rehearsal key",
  reminderKeys.size > 0 &&
    keys.every((k) => !reminderKeys.has(k) && !k.startsWith("rehearsal:"))
);
const moved = correctionDedupeKey({ ...reg, event_date: "2026-10-06" });
check(
  "a correction to a re-verified, different date gets a new key",
  moved !== correctionDedupeKey(reg) && moved.endsWith(":2026-10-06")
);

const PROHIBITED = /\b(candidates?|wins?|loses?|leads?|momentum|controvers\w*)\b/i;
const copy: string[] = [];
for (const row of stamped) {
  const label = LABEL_OF[row.event_type];
  const rendered = renderCorrection(row, label);
  const fromRequest = renderTemplate("correction", paramsFor(row));
  const b = BUDGETS.email;
  if (JSON.stringify(rendered) !== JSON.stringify(fromRequest)) copy.push(`${row.id}: row and request render differently`);
  if ((rendered.subject ?? "").length > b.subject) copy.push(`${row.id}: subject ${rendered.subject?.length}`);
  if (`[Rehearsal] ${rendered.subject}`.length > b.subject) copy.push(`${row.id}: rehearsal subject too long`);
  if (rendered.title.length > b.title) copy.push(`${row.id}: title ${rendered.title.length}`);
  if (rendered.body.length > b.body) copy.push(`${row.id}: body ${rendered.body.length}`);
  if (!rendered.body.endsWith(row.details_url)) copy.push(`${row.id}: body does not end with its details_url`);
  if (!rendered.body.includes(longDate(row.event_date))) copy.push(`${row.id}: body does not name ${longDate(row.event_date)}`);
  if (!rendered.body.includes(`the ${label} for the 2026 Florida general election`)) copy.push(`${row.id}: body does not name the event`);
  if (PROHIBITED.test(rendered.body)) copy.push(`${row.id}: prohibited word`);
}
check(
  "every verified row renders from the row itself, within BUDGETS (rehearsal subject too), naming its event and date and ending with its details_url",
  copy.length === 0,
  copy.join("; ")
);
/* The worst case the template can be asked for: the longest label, the
   longest details_url above and the longest date of the year. */
const longestLabel = [...CORRECTION_EVENT_LABELS].sort((a, b) => b.length - a.length)[0];
const longestUrl = Object.values(COUNTY_URL).sort((a, b) => b.length - a.length)[0];
let longestBody = 0;
let worst = "";
for (const election of ["primary_2026", "general_2026"]) {
  for (let d = "2026-01-01"; d <= "2026-12-31"; d = isoDaysBefore(d, -1)) {
    const { body: text } = renderTemplate("correction", {
      event_label: longestLabel,
      election,
      date: d,
      details_url: longestUrl,
    });
    if (text.length > longestBody) [longestBody, worst] = [text.length, d];
  }
}
check(
  `the longest correction of 2026 (${longestLabel}, ${worst}, Miami-Dade's PDF) fits the ${BUDGETS.email.body}-character body budget`,
  longestBody <= BUDGETS.email.body,
  `${longestBody} chars`
);

/* ---- 6. route source ---------------------------------------------------- */

console.log("\n6. Route source (src/app/api/cron/send-correction/route.ts)");

const ROUTE = "src/app/api/cron/send-correction/route.ts";
const REMINDERS = "src/app/api/cron/send-reminders/route.ts";
const COHORT = "src/lib/notifications/cohort.ts";
const route = source(ROUTE);
const reminders = source(REMINDERS);
const cohort = source(COHORT);
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const routeCode = stripComments(route);
const at = (re: RegExp) => routeCode.search(re);

check(
  "exports POST and no other method (a GET, which Vercel Cron sends, answers 405)",
  /export async function POST\(/.test(routeCode) &&
    !/export\s+(async\s+)?(function|const)\s+(GET|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/.test(routeCode)
);
check(
  "is not scheduled in vercel.json",
  !/send-correction/.test(source("vercel.json"))
);
const authOf = (code: string) => code.match(/function authorized\([\s\S]*?\n\}/)?.[0] ?? "";
check(
  "authorized() checks CORRECTION_SECRET in x-correction-secret with secretEquals, and never CRON_SECRET",
  authOf(route) !== "" &&
    /process\.env\.CORRECTION_SECRET/.test(authOf(route)) &&
    /secretEquals\(request\.headers\.get\("x-correction-secret"\), secret\)/.test(authOf(route)) &&
    !/CRON_SECRET|authorization|Bearer/.test(authOf(route).replace(/CORRECTION_SECRET/g, "")) &&
    !/process\.env\.CRON_SECRET/.test(routeCode)
);
check(
  "without CORRECTION_SECRET every call answers 503 before anything else",
  /if \(!process\.env\.CORRECTION_SECRET\) \{[\s\S]{0,300}status: 503/.test(routeCode) &&
    at(/if \(!process\.env\.CORRECTION_SECRET\)/) < at(/!authorized\(request\)/)
);
check(
  "reads the body with request.text(); a URL with any query parameter answers 400; nothing else touches the URL's parameters",
  /request\.text\(\)/.test(routeCode) &&
    /searchParams\.keys\(\)\)\.length > 0\)[\s\S]{0,200}status: 400/.test(routeCode) &&
    (routeCode.match(/searchParams/g) ?? []).length === 1 &&
    at(/searchParams\.keys/) < at(/request\.text\(\)/)
);
check(
  "every mode runs after authorization and the verified-date guard",
  at(/!authorized\(request\)/) < at(/correctionTarget\(/) &&
    at(/correctionTarget\(/) < at(/mode\.kind === "rehearse"/) &&
    at(/correctionTarget\(/) < at(/mode\.kind === "dry_run"\)/) &&
    /"refused" in guard[\s\S]{0,200}status: 422/.test(routeCode)
);
check(
  "the guard reads verified_by, and scope comes from verifiedElectionEvents()",
  /\.select\("[^"]*verified_by[^"]*"\)/.test(routeCode) &&
    /await verifiedElectionEvents\(service, params\.election\)/.test(routeCode)
);
check(
  "the dry run returns before any write (no upsert, insert, update or delete above it)",
  (() => {
    /* rehearse() is defined below POST, so nothing above the dry run's
       return in POST writes at all. */
    const dryAt = at(/if \(mode\.kind === "dry_run"\)/);
    const write = /\.(upsert|insert|update|delete)\(/;
    return (
      dryAt > 0 &&
      at(/if \(recipients\.length === 0\)/) > dryAt &&
      !write.test(routeCode.slice(0, at(/if \(recipients\.length === 0\)/)))
    );
  })()
);
check(
  "a real send needs confirm_key equal to this correction's dedupe_key, checked before the claim and before any send",
  /if \(mode\.confirmKey !== dedupeKey\) \{[\s\S]{0,400}status: 409/.test(routeCode) &&
    at(/mode\.confirmKey !== dedupeKey/) < at(/\.upsert\(/) &&
    at(/mode\.confirmKey !== dedupeKey/) < at(/resend\.batch\.send\(\s*chunk/)
);
check(
  "a real send needs confirm_recipients equal to the recipient count, checked before the claim",
  /mode\.confirmRecipients !== recipients\.length\)[\s\S]{0,400}status: 409/.test(routeCode) &&
    at(/mode\.confirmRecipients !== recipients\.length/) < at(/\.upsert\(/) &&
    at(/mode\.confirmRecipients !== recipients\.length/) < at(/resend\.batch\.send\(\s*chunk/)
);
check(
  'claims correctionDedupeKey() ("correction:…") with INSERT … ON CONFLICT DO NOTHING; an existing claim answers "already sent"',
  /const dedupeKey = correctionDedupeKey\(target\)/.test(routeCode) &&
    /\.upsert\(\s*\{ dedupe_key: dedupeKey \},\s*\{ onConflict: "dedupe_key", ignoreDuplicates: true \}/.test(routeCode) &&
    /already_sent: true/.test(routeCode)
);
check(
  "releases the claim on any send failure (retry-forward)",
  /catch \(err\) \{[\s\S]{0,700}\.delete\(\)\.eq\("dedupe_key", dedupeKey\)/.test(routeCode)
);
check(
  "is NOT gated on NOTIFICATIONS_PAUSED: the code never reads remindersPaused() or the variable",
  !/remindersPaused|NOTIFICATIONS_PAUSED/.test(routeCode) &&
    /NOTIFICATIONS_PAUSED is deliberately NOT consulted/.test(route)
);
check(
  "honours the cohort fuse before reading the cohort",
  /if \(count > COHORT_FUSE\) \{[\s\S]{0,300}status: 500/.test(routeCode) &&
    at(/if \(count > COHORT_FUSE\)/) < at(/await activeSubscribers\(/)
);
check(
  "batches of BATCH_SIZE, paced by BATCH_PACING_MS between every call",
  /recipients\.slice\(i, i \+ BATCH_SIZE\)/.test(routeCode) &&
    /if \(batchCalls\+\+ > 0\)[\s\S]{0,120}BATCH_PACING_MS/.test(routeCode)
);
check(
  "mails each address once, lower-cased, and only in the correction's scope",
  /const mailed = new Set<string>\(\);[\s\S]*correctionReaches\(events, target, sub\.scope\)[\s\S]*mailed\.has\(address\)/.test(routeCode) &&
    /sub\.email\.toLowerCase\(\)/.test(routeCode)
);
check(
  "every email carries reminderText's unsubscribe footer; renders only through renderCorrection",
  (routeCode.match(/reminderText\(rendered, origin, sub\.unsubscribe_token\)/g) ?? []).length === 2 &&
    /renderCorrection\(target, params\.event_label\)/.test(routeCode) &&
    !/renderTemplate\(/.test(routeCode)
);
check(
  'the rehearsal: an active subscription only, "[Rehearsal]" subject, synthetic rehearsal: key, released on failure',
  /\.eq\("active", true\)[\s\S]{0,40}\.limit\(1\)/.test(routeCode) &&
    /`\[Rehearsal\] \$\{/.test(routeCode) &&
    /`rehearsal:\$\{dedupeKey\}:/.test(routeCode) &&
    /\.delete\(\)\.eq\("dedupe_key", rehearsalKey\)/.test(routeCode)
);
check(
  "a digest goes to EMAIL_FROM after a real send, best-effort",
  /recipient_count: delivered[\s\S]*try \{\s*await resend\.emails\.send\(\{[\s\S]*to: process\.env\.EMAIL_FROM!/.test(routeCode)
);
const SHARED = ["activeSubscribers", "zipCounties", "reminderText"];
check(
  "activeSubscribers, zipCounties and reminderText live in cohort.ts (server-only) and neither route defines its own",
  /^import "server-only";/.test(cohort) &&
    SHARED.every((fn) => new RegExp(`export (async )?function ${fn}\\(`).test(cohort)) &&
    SHARED.every((fn) => !new RegExp(`function ${fn}\\(`).test(route) && !new RegExp(`function ${fn}\\(`).test(reminders))
);
const importsFromCohort = (code: string) =>
  code.match(/import \{([^}]*)\} from "@\/lib\/notifications\/cohort";/)?.[1] ?? "";
check(
  "both routes import the shared helpers and constants from @/lib/notifications/cohort",
  [route, reminders].every((code) =>
    ["activeSubscribers", "reminderText", "zipCounties", "BATCH_SIZE", "BATCH_PACING_MS", "COHORT_FUSE"].every((name) =>
      new RegExp(`\\b${name}\\b`).test(importsFromCohort(code))
    )
  ) && !/const (BATCH_SIZE|BATCH_PACING_MS|COHORT_FUSE|PAGE_SIZE) =/.test(reminders + route)
);
const pure = source("src/lib/notifications/correction.ts");
check(
  "correction.ts is pure: no server-only, no @/ alias, no database, mail or Next.js import",
  !/server-only|from "@\/|supabase|from "resend"|from "next\//.test(stripComments(pure))
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nCorrection send checks passed.");
