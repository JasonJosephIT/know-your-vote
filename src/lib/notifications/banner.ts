import { COVERED_COUNTIES, coveredCounty } from "../counties.ts";
import type { ElectionEvent } from "./election-events";
import { countiesWithOwnDates, eventsForCounty } from "./schedule.ts";

/* The deadline banner's words (DeadlineBanner), pure and apart from the
   component so scripts/verify-reminder-schedule.ts can check every sentence
   it states, day by day, statewide and per county. Relative imports with
   the extension, for the same reason: that script runs in plain Node. */

/* Dates are stated, never counted down. A countdown ("28 days left") would
   go stale the moment this page is served from a cache, and a wrong number
   on a civic deadline is worse than no number. */
export function bannerLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/* What each date asks of a voter, in the banner's few words. The early
   voting pair reads as one window when both rows exist, because the window
   is the fact. `events` are the visitor's own dates (eventsForCounty):
   their county's window when the saved district names a county with its
   own rows, otherwise the statewide one, which then also says where the
   window is longer, since every covered county opens early voting before
   the statewide minimum (0043).

   today (easternToday()) changes only the words for a date that falls on
   it: "Register to vote by October 5" read on October 5 doesn't say this is
   the last day (inspiration pass 2026-10-05). Still a date, never a count. */
export function bannerLine(
  next: ElectionEvent,
  events: ElectionEvent[],
  allEvents: ElectionEvent[],
  today?: string
): string {
  const start = events.find((e) => e.event_type === "early_voting_start");
  const end = events.find((e) => e.event_type === "early_voting_end");
  const date = bannerLongDate(next.event_date);
  const isToday = next.event_date === today;
  switch (next.event_type) {
    case "registration_deadline":
      return isToday
        ? `Today, ${date}, is the last day to register to vote`
        : `Register to vote by ${date}`;
    case "vbm_request_deadline":
      /* 5 p.m. local time: s. 101.62(3)(c), Fla. Stat. (checked 2026-10-04). */
      return isToday
        ? `Request a vote-by-mail ballot by 5 p.m. today, ${date}`
        : `Request a vote-by-mail ballot by 5 p.m. on ${date}`;
    case "early_voting_start":
    case "early_voting_end": {
      if (!start || !end) {
        if (next.event_type === "early_voting_start") return `Early voting starts ${date}`;
        return isToday ? `Early voting ends today, ${date}` : `Early voting ends ${date}`;
      }
      const own = start.county_fips ? coveredCounty(start.county_fips)?.name : undefined;
      /* bannerDates never offers early_voting_start on its own day, so
         "today" here is always the last day of the window. */
      if (isToday) {
        return own
          ? `Today, ${date}, is the last day of early voting in ${own} County`
          : `Today, ${date}, is the last day of early voting statewide${longerWindows(start, end, allEvents)}`;
      }
      const window = `${bannerLongDate(start.event_date)} to ${bannerLongDate(end.event_date)}`;
      if (own) return `Early voting runs ${window} in ${own} County`;
      return `Early voting runs ${window} statewide${longerWindows(start, end, allEvents)}`;
    }
    case "ballot_return_deadline":
      return isToday
        ? `Mail ballots must be received by 7 p.m. today, ${date}`
        : `Mail ballots must be received by 7 p.m. on ${date}`;
    case "election_day":
      return electionDayLine(next.event_date, today);
  }
}

/* The banner's second half, and the election_day case above. */
export function electionDayLine(eventDate: string, today?: string): string {
  return eventDate === today
    ? `Today, ${bannerLongDate(eventDate)}, is Election Day`
    : `Election Day is ${bannerLongDate(eventDate)}`;
}

/* "; October 19 to November 1 in Miami-Dade, Broward, Hillsborough and
   Orange counties" — every county whose own window differs from the
   statewide one, grouped by window, in the order the site always lists the
   counties. Empty when no county has its own. */
function longerWindows(
  start: ElectionEvent,
  end: ElectionEvent,
  allEvents: ElectionEvent[]
): string {
  const groups = new Map<string, string[]>();
  const withOwn = countiesWithOwnDates(allEvents);
  for (const { fips, name } of COVERED_COUNTIES.filter((c) => withOwn.includes(c.fips))) {
    const own = eventsForCounty(allEvents, fips);
    const ownStart = own.find((e) => e.event_type === "early_voting_start");
    const ownEnd = own.find((e) => e.event_type === "early_voting_end");
    if (!ownStart || !ownEnd) continue;
    if (ownStart.event_date === start.event_date && ownEnd.event_date === end.event_date) continue;
    const key = `${bannerLongDate(ownStart.event_date)} to ${bannerLongDate(ownEnd.event_date)}`;
    groups.set(key, [...(groups.get(key) ?? []), name]);
  }
  return [...groups]
    .map(([window, names]) => {
      const list =
        names.length === 1
          ? names[0]
          : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
      return `; ${window} in ${list} ${names.length === 1 ? "County" : "counties"}`;
    })
    .join("");
}
