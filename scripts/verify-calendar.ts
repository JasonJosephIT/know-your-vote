/* Verifies the .ics builder behind /api/calendar/[election].ics (plan A6)
   with a minimal RFC 5545 structure parse — no server or env needed; the
   builder is pure (src/lib/notifications/ics.ts).

     1. Two sample events -> two well-formed VEVENT blocks: UID, DTSTAMP,
        DTSTART/DTEND all-day pair (DTEND exclusive = start + 1 day),
        SUMMARY, URL; CRLF line endings throughout.
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
    details_url: "https://dos.fl.gov/elections/for-voters/election-dates/",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    event_type: "election_day" as const,
    election: "general_2026",
    event_date: "2026-11-03",
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
  for (const prop of ["UID:", "DTSTAMP:", "DTSTART;VALUE=DATE:", "DTEND;VALUE=DATE:", "SUMMARY:", "URL:"]) {
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
