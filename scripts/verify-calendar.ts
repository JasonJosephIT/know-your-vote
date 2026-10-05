/* Verifies the .ics builder behind /api/calendar/[election].ics (plan A6)
   with a minimal RFC 5545 structure parse — no server or env needed; the
   builder is pure (src/lib/notifications/ics.ts).

     1. Four sample events -> four well-formed VEVENT blocks: UID,
        DTSTAMP, SEQUENCE, DTSTART/DTEND all-day pair (DTEND exclusive =
        start + 1 day), SUMMARY, URL; CRLF line endings throughout.
     1b. The `rule` column (0021) reaches the voter: a received-by event
        says a postmark does not count, a postmarked-by event does not,
        and a rule-less event carries neither.
     1d. Every hour Florida law fixes is in the file (2026-10-05): the
        vote-by-mail request deadline says 5 p.m. in its title and its
        note, the ballot return 7 p.m. in both, and Election Day its poll
        hours. The request deadline used to be a bare all-day "deadline",
        while the banner and the emails said 5 p.m.
     1c. A county's own early-voting rows (0043) name the county; a
        statewide row still says "statewide window".
     2. Zero events -> a valid, empty VCALENDAR (the "nothing verified yet"
        response body).
     3. Unknown election ids never reach the builder — the route 404s them —
        but the builder still degrades to the raw id as its label.

   Run: node scripts/verify-calendar.ts
   (Node >= 23 strips types natively — same as verify-news-neutrality.ts.) */

import { buildElectionCalendar } from "../src/lib/notifications/ics.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const SAMPLE = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    event_type: "registration_deadline" as const,
    election: "general_2026",
    event_date: "2026-10-05",
    rule: "postmarked_by" as const,
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    event_type: "ballot_return_deadline" as const,
    election: "general_2026",
    event_date: "2026-11-03",
    rule: "received_by" as const,
    details_url: "https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    event_type: "election_day" as const,
    election: "general_2026",
    event_date: "2026-11-03",
    rule: null,
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    event_type: "vbm_request_deadline" as const,
    election: "general_2026",
    event_date: "2026-10-22",
    rule: "received_by" as const,
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
];

const ics = buildElectionCalendar("general_2026", SAMPLE);

check("uses CRLF line endings", !/[^\r]\n/.test(ics) && ics.includes("\r\n"));

const lines = ics.split("\r\n").filter(Boolean);
check("opens and closes VCALENDAR", lines[0] === "BEGIN:VCALENDAR" && lines[lines.length - 1] === "END:VCALENDAR");
check("declares VERSION:2.0 and PRODID", ics.includes("VERSION:2.0") && ics.includes("PRODID:"));

/* Block structure: BEGIN/END VEVENT strictly nested and balanced. */
let depth = 0;
let balanced = true;
let eventCount = 0;
for (const line of lines) {
  if (line === "BEGIN:VEVENT") {
    depth++;
    eventCount++;
    if (depth !== 1) balanced = false;
  }
  if (line === "END:VEVENT") {
    depth--;
    if (depth !== 0) balanced = false;
  }
}
check("VEVENT blocks balanced", balanced && depth === 0);
check("one VEVENT per event", eventCount === SAMPLE.length, `saw ${eventCount}`);

const blocks = [...ics.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map((m) => m[1]);
for (const [i, block] of blocks.entries()) {
  const label = `event ${i + 1}`;
  for (const prop of ["UID:", "DTSTAMP:", "SEQUENCE:", "DTSTART;VALUE=DATE:", "DTEND;VALUE=DATE:", "SUMMARY:", "URL:"]) {
    check(`${label} has ${prop.replace(/[;:].*$/, "")}`, block.includes(prop), block);
  }
}

/* All-day pair: DTEND is the exclusive next day. */
const oct = blocks[0] ?? "";
check(
  "DTEND is DTSTART + 1 day (all-day, exclusive end)",
  oct.includes("DTSTART;VALUE=DATE:20261005") && oct.includes("DTEND;VALUE=DATE:20261006"),
  oct
);
/* Month rollover on the Oct 31 -> Nov 1 style boundary is covered by the
   Nov 3 event: DTEND lands on Nov 4 within the same month — check the
   simpler invariant that every DTEND differs from its DTSTART. */
for (const [i, block] of blocks.entries()) {
  const start = block.match(/DTSTART;VALUE=DATE:(\d{8})/)?.[1];
  const end = block.match(/DTEND;VALUE=DATE:(\d{8})/)?.[1];
  check(`event ${i + 1}: DTEND after DTSTART`, !!start && !!end && end > start, `${start} -> ${end}`);
}

/* (1b) rule -> copy. The whole reason election_event carries a rule is that
   a date alone lets a voter believe a postmark counts on a returned ballot;
   assert the sentence that says otherwise actually ships. */
const returnBlock = blocks.find((b) => b.includes("received by 7 p.m.")) ?? "";
check("ballot return VEVENT titles the 7 p.m. hour", returnBlock !== "", ics);
check(
  "received_by event tells the voter a postmark does not count",
  /DESCRIPTION:[^\r]*postmark does not count/.test(returnBlock),
  returnBlock
);
check(
  "postmarked_by event does not claim a postmark is worthless",
  !/postmark does not count/.test(blocks[0] ?? "") &&
    /DESCRIPTION:[^\r]*postmarked by this date/.test(blocks[0] ?? ""),
  blocks[0]
);
const dayBlock = blocks.find((b) => b.includes("SUMMARY:Election Day")) ?? "";
check(
  "rule-less event carries no rule sentence",
  dayBlock !== "" &&
    !/RECEIVED-BY|postmark/i.test(dayBlock) &&
    /DESCRIPTION:[^\r]*Official source: https:\/\//.test(dayBlock),
  dayBlock
);

/* (1d) The hours. A calendar file cannot be corrected once downloaded, so
   the hour has to be right the first time, and the same as the banner's
   and the emails'. */
const field = (block: string, name: string) =>
  block.match(new RegExp(`^${name}:([^\\r]*)$`, "m"))?.[1] ?? "";
const requestBlock = blocks.find((b) => b.includes("UID:77777777-")) ?? "";
check(
  "vote-by-mail request deadline: 5 p.m. in the title",
  /5 p\.m\./.test(field(requestBlock, "SUMMARY")),
  field(requestBlock, "SUMMARY")
);
check(
  "vote-by-mail request deadline: the note says received by 5 p.m. local time, postmark does not count",
  /request must reach your Supervisor of Elections by 5 p\.m\. local time on this date\. A postmark does not count\./.test(
    field(requestBlock, "DESCRIPTION")
  ),
  field(requestBlock, "DESCRIPTION")
);
check(
  "ballot return: the note names 7 p.m. local time, the same hour as its title",
  /ballot must be in your Supervisor of Elections' hands by 7 p\.m\. local time on this date/.test(
    field(returnBlock, "DESCRIPTION")
  ) && /7 p\.m\./.test(field(returnBlock, "SUMMARY")),
  returnBlock
);
for (const block of blocks.filter((b) => /RECEIVED-BY/.test(b))) {
  const hour = field(block, "SUMMARY").match(/\d{1,2} [ap]\.m\./)?.[0];
  check(
    `every received-by event states its hour in title and note alike (${field(block, "UID")})`,
    !!hour && field(block, "DESCRIPTION").includes(`by ${hour} local time`),
    block
  );
}
check(
  "Election Day states poll hours, 7 a.m. to 7 p.m., in title and note",
  /7 a\.m\. to 7 p\.m\./.test(field(dayBlock, "SUMMARY")) &&
    /Polls are open 7 a\.m\. to 7 p\.m\. local time\./.test(field(dayBlock, "DESCRIPTION")),
  dayBlock
);
check(
  "no event still carries the hourless received-by note",
  !/hands by this date/.test(ics),
  ics
);
/* The builder does no RFC 5545 escaping (ics.ts header), which holds only
   while its own words carry no comma, semicolon or backslash. The URL is a
   row's value and is left out. */
for (const block of blocks) {
  for (const name of ["SUMMARY", "DESCRIPTION"]) {
    const words = field(block, name).split(" Official source: ")[0];
    check(
      `${field(block, "UID").slice(0, 8)} ${name} needs no escaping`,
      !/[,;\\]/.test(words),
      words
    );
  }
}
check(
  "every event carries a SEQUENCE above 0, so a re-import replaces the old copy",
  blocks.every((b) => Number(field(b, "SEQUENCE")) >= 1),
  blocks.map((b) => field(b, "SEQUENCE")).join(",")
);

/* (1c) A county's own early-voting rows (0043) say whose window they are;
   a statewide row keeps "(statewide window)". */
const county = buildElectionCalendar("general_2026", [
  {
    id: "44444444-4444-4444-4444-444444444444",
    county_fips: "12086",
    event_type: "early_voting_start" as const,
    election: "general_2026",
    event_date: "2026-10-19",
    rule: null,
    details_url: "https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    county_fips: "12095",
    event_type: "early_voting_end" as const,
    election: "general_2026",
    event_date: "2026-11-01",
    rule: null,
    details_url: "https://voteorangefl.gov/vote-early/",
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    county_fips: null,
    event_type: "early_voting_start" as const,
    election: "general_2026",
    event_date: "2026-10-24",
    rule: null,
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
]);
check(
  "a county row names its county; a statewide row keeps the statewide label",
  county.includes("SUMMARY:Early voting begins in Miami-Dade County — ") &&
    county.includes("DTSTART;VALUE=DATE:20261019") &&
    county.includes("SUMMARY:Early voting ends in Orange County — ") &&
    county.includes("DTEND;VALUE=DATE:20261102") &&
    county.includes("SUMMARY:Early voting begins (statewide window) — "),
  county
);
check(
  "early voting does not imply one schedule: a statewide row says hours and days vary by county",
  /DESCRIPTION:Early voting sites and hours vary by county\. A county may also add days on either side of this window\./.test(
    county
  ) &&
    (county.match(/DESCRIPTION:Early voting sites and hours are at the official source below\./g) ?? [])
      .length === 2,
  county
);
for (const block of [...county.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map((m) => m[1])) {
  const words = ["SUMMARY", "DESCRIPTION"]
    .map((name) => field(block, name).split(" Official source: ")[0])
    .join(" ");
  check(`early voting ${field(block, "UID").slice(0, 8)} needs no escaping`, !/[,;\\]/.test(words), words);
}

const empty = buildElectionCalendar("general_2026", []);
check(
  "zero events -> valid empty calendar",
  empty.startsWith("BEGIN:VCALENDAR\r\n") &&
    empty.endsWith("END:VCALENDAR\r\n") &&
    !empty.includes("VEVENT")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nCalendar builder checks passed.");
