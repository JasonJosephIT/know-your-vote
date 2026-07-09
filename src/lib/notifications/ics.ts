import type { ElectionEvent } from "@/lib/notifications/election-events";

/* Builds the VCALENDAR for an election's verified statewide events
   (plan A6). Pure so scripts/verify-calendar.mjs can check it without a
   server. All-day VEVENTs: DTEND is exclusive, so it's start + 1 day.
   Summaries and URLs come from fixed labels and founder-verified rows —
   no user input reaches the file, so no ICS escaping is needed. */

export const ELECTION_LABEL: Record<string, string> = {
  primary_2026: "Florida primary 2026",
  general_2026: "Florida general election 2026",
};

const SUMMARY: Record<ElectionEvent["event_type"], string> = {
  registration_deadline: "Voter registration deadline",
  vbm_request_deadline: "Vote-by-mail request deadline",
  early_voting_start: "Early voting begins (statewide window)",
  early_voting_end: "Early voting ends (statewide window)",
  election_day: "Election Day",
};

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
      /* DTSTAMP is required by RFC 5545; derived from the event date so the
         file is deterministic and cache-friendly. */
      `DTSTAMP:${icsDate(event.event_date)}T000000Z`,
      `DTSTART;VALUE=DATE:${icsDate(event.event_date)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDay(event.event_date))}`,
      `SUMMARY:${SUMMARY[event.event_type]} — ${icsText(label)}`,
      `URL:${icsText(event.details_url)}`,
      `DESCRIPTION:Official source: ${icsText(event.details_url)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
