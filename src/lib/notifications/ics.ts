/* Relative, with the extension: scripts/verify-calendar.ts loads this file
   in plain Node, which doesn't know the @/ alias. */
import { coveredCounty } from "../counties.ts";
import type { ElectionEvent } from "./election-events";

/* Builds the VCALENDAR for an election's verified events (plan A6): the
   statewide rows, or one county's dates (eventsForCounty) when the route
   is asked for a county. Pure so scripts/verify-calendar.mjs can check it
   without a server. All-day VEVENTs: DTEND is exclusive, so it's start +
   1 day.
   Summaries and URLs come from fixed labels and founder-verified rows —
   no user input reaches the file, so no ICS escaping is needed. */

export const ELECTION_LABEL: Record<string, string> = {
  primary_2026: "Florida primary 2026",
  general_2026: "Florida general election 2026",
};

/* The hour a deadline falls at, where Florida law fixes one hour for every
   county: a vote-by-mail request must be received by 5 p.m. local time
   (s. 101.62(3)(c), Fla. Stat., the citation the banner and the reminder
   emails carry), and a voted mail ballot by 7 p.m., when the polls close
   (s. 101.67(2)). The hour is in the words, not the schema: event_date is a
   bare DATE, and a timed VEVENT would need a VTIMEZONE block for "local
   time" to mean anything (0021 header). So each event stays all-day, and
   both its title and its note say the hour. */
const DEADLINE_HOUR: Partial<Record<ElectionEvent["event_type"], string>> = {
  vbm_request_deadline: "5 p.m.",
  ballot_return_deadline: "7 p.m.",
};

const SUMMARY: Record<ElectionEvent["event_type"], string> = {
  registration_deadline: "Voter registration deadline",
  vbm_request_deadline: `Vote-by-mail request must be received by ${DEADLINE_HOUR.vbm_request_deadline}`,
  ballot_return_deadline: `Vote-by-mail ballot must be received by ${DEADLINE_HOUR.ballot_return_deadline}`,
  early_voting_start: "Early voting begins (statewide window)",
  early_voting_end: "Early voting ends (statewide window)",
  /* The same hours in every Florida county: s. 100.011(1). */
  election_day: "Election Day: polls open 7 a.m. to 7 p.m.",
};

/* A county's own row (0043) says whose window it is instead. */
function summary(event: ElectionEvent): string {
  const county = event.county_fips ? coveredCounty(event.county_fips)?.name : undefined;
  if (county && event.event_type === "early_voting_start") {
    return `Early voting begins in ${county} County`;
  }
  if (county && event.event_type === "early_voting_end") {
    return `Early voting ends in ${county} County`;
  }
  return SUMMARY[event.event_type];
}

/* The `rule` column (0021) rendered into the sentence a voter actually
   reads. This is what the column is FOR — a date with the wrong rule beside
   it still misinforms, and "a postmark counts" is the specific wrong belief
   that costs people their vote on a returned ballot. A received-by deadline
   names its hour, so the note cannot be read as "any time that day". */
function ruleNote(event: ElectionEvent): string | null {
  if (event.rule === "postmarked_by") {
    return "A mailed application counts if it is postmarked by this date. Registering online or in person must be completed by this date.";
  }
  if (event.rule !== "received_by") return null;
  const hour = DEADLINE_HOUR[event.event_type];
  const by = hour ? `by ${hour} local time on this date` : "by this date";
  const what =
    event.event_type === "vbm_request_deadline"
      ? "your request must reach your Supervisor of Elections"
      : event.event_type === "ballot_return_deadline"
        ? "your voted ballot must be in your Supervisor of Elections' hands"
        : "it must be in your Supervisor of Elections' hands";
  return `This is a RECEIVED-BY deadline: ${what} ${by}. A postmark does not count.`;
}

/* The hours, where a date has them. No commas or semicolons in any of these
   sentences: RFC 5545 makes both special in a TEXT value, and this builder
   does no escaping (header). Election Day's hours are statewide. Early
   voting's are each county's own, and s. 101.657(1)(d) lets a county add
   days on either side of the statewide window, so the statewide row says so
   rather than implying one schedule for everyone. */
function hoursNote(event: ElectionEvent): string | null {
  switch (event.event_type) {
    case "election_day":
      return "Polls are open 7 a.m. to 7 p.m. local time. Anyone in line at 7 p.m. can still vote.";
    case "early_voting_start":
    case "early_voting_end":
      return event.county_fips
        ? "Early voting sites and hours are at the official source below."
        : "Early voting sites and hours vary by county. A county may also add days on either side of this window.";
    default:
      return null;
  }
}

/* SEQUENCE tells a calendar app that already imported this file to take a
   re-import as an update to the same event (the UID does not change)
   rather than a copy it ignores. It has to rise on both kinds of change:
     - the words: WORDING_SEQUENCE, raised by hand. 1: the vote-by-mail
       request deadline and Election Day gained their hours, 2026-10-05.
     - the date: a corrected row is re-stamped, so its verified_at moves
       forward. Minutes since 2026-01-01 at that stamp keep the number small
       (well inside a 32-bit integer) and rising.
   A row with no verified_at (fixtures) counts from the epoch base: 0. */
const WORDING_SEQUENCE = 1;
const SEQUENCE_BASE_MS = Date.UTC(2026, 0, 1);

function verifiedMs(event: ElectionEvent): number | null {
  const ms = event.verified_at ? Date.parse(event.verified_at) : NaN;
  return Number.isNaN(ms) ? null : ms;
}

function sequence(event: ElectionEvent): number {
  const ms = verifiedMs(event);
  const minutes =
    ms === null ? 0 : Math.max(0, Math.floor((ms - SEQUENCE_BASE_MS) / 60_000));
  return WORDING_SEQUENCE + minutes;
}

/* DTSTAMP is required by RFC 5545. From the row's last stamp, so it moves
   when a date is corrected; from the event date for a row without one.
   Deterministic either way, so the file stays cache-friendly. */
function dtstamp(event: ElectionEvent): string {
  const ms = verifiedMs(event);
  return ms === null
    ? `${icsDate(event.event_date)}T000000Z`
    : `${new Date(ms).toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

/* ICS structure is line-oriented: a stray CR/LF in any interpolated value
   would inject properties. Rows are service-role-only writes, but sanitize
   at the boundary anyway. */
function icsText(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function icsDate(iso: string): string {
  return iso.replaceAll("-", "");
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildElectionCalendar(
  election: string,
  events: ElectionEvent[]
): string {
  const label = ELECTION_LABEL[election] ?? election;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Know Your Vote//Election dates//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${label} — key dates`,
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@knowyourvote`,
      `DTSTAMP:${dtstamp(event)}`,
      `DTSTART;VALUE=DATE:${icsDate(event.event_date)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDay(event.event_date))}`,
      `SEQUENCE:${sequence(event)}`,
      `SUMMARY:${summary(event)} — ${icsText(label)}`,
      `URL:${icsText(event.details_url)}`,
      `DESCRIPTION:${[ruleNote(event), hoursNote(event)]
        .filter((note) => note !== null)
        .map((note) => `${note} `)
        .join("")}Official source: ${icsText(event.details_url)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
