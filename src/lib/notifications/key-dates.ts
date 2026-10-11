import type { ElectionEvent } from "./election-events";
import { bannerLongDate } from "./banner.ts";

/* The home page's key-dates rail and masthead (layout pass 2026-10-11,
   docs/design/layout-2026-10-11/homepage-sample.html, items 1 and 2).

   Pure, type-only imports and relative paths with the extension, like
   schedule.ts and banner.ts, so scripts/verify-home-dates.ts walks it day by
   day in plain Node.

   `events` are already the visitor's own dates (eventsForCounty), and
   `today` is easternToday(). Everything here is a date, never a count:
   banner.ts explains why a countdown is the one thing these lines must not
   say. */

export type StopState = "past" | "today" | "open" | "next" | "later";

export interface KeyDateStop {
  key: string;
  /** What the date asks of a voter, in two or three words. */
  label: string;
  /** "October 22", or "October 24 to October 31" for the early voting window. */
  when: string;
  state: StopState;
}

function stop(
  key: string,
  label: string,
  start: string,
  end: string,
  today: string
): KeyDateStop & { start: string } {
  const when =
    start === end
      ? bannerLongDate(start)
      : `${bannerLongDate(start)} to ${bannerLongDate(end)}`;
  const state: StopState =
    end < today
      ? "past"
      : start > today
        ? "later"
        : start === end
          ? "today"
          : "open";
  return { key, label, when, state, start };
}

/* The stops, in date order, with exactly one marked `next`: the first date
   still ahead. A day with no date of its own gets a "Today" stop between the
   past and the future, so the rail always shows where the reader stands.

   The mail-ballot return deadline shares Election Day's date in Florida (7
   p.m., received by), so it folds into that stop's label rather than
   sitting on top of it; on any other date it is a stop of its own.

   Null once Election Day has passed, or with no Election Day row at all —
   the same rule as bannerDates, so the rail and the banner line above it
   disappear together. */
export function keyDateStops(
  events: ElectionEvent[],
  today: string
): KeyDateStop[] | null {
  const find = (t: ElectionEvent["event_type"]) =>
    events.find((e) => e.event_type === t);
  const electionDay = find("election_day");
  if (!electionDay || electionDay.event_date < today) return null;

  const stops: (KeyDateStop & { start: string })[] = [];
  const reg = find("registration_deadline");
  if (reg)
    stops.push(
      stop(
        "registration",
        "Registration deadline",
        reg.event_date,
        reg.event_date,
        today
      )
    );
  const vbm = find("vbm_request_deadline");
  if (vbm)
    stops.push(
      stop(
        "vbm",
        "Mail-ballot request deadline",
        vbm.event_date,
        vbm.event_date,
        today
      )
    );
  const evStart = find("early_voting_start");
  const evEnd = find("early_voting_end");
  if (evStart && evEnd) {
    stops.push(
      stop("early", "Early voting", evStart.event_date, evEnd.event_date, today)
    );
  } else if (evStart) {
    stops.push(
      stop(
        "early",
        "Early voting starts",
        evStart.event_date,
        evStart.event_date,
        today
      )
    );
  }
  const ret = find("ballot_return_deadline");
  const foldReturn = ret && ret.event_date === electionDay.event_date;
  if (ret && !foldReturn) {
    stops.push(
      stop("return", "Mail ballots due", ret.event_date, ret.event_date, today)
    );
  }
  stops.push(
    stop(
      "election-day",
      foldReturn ? "Election Day; mail ballots due" : "Election Day",
      electionDay.event_date,
      electionDay.event_date,
      today
    )
  );
  stops.sort((a, b) => a.start.localeCompare(b.start));

  if (!stops.some((s) => s.state === "today" || s.state === "open")) {
    const at = stops.findIndex((s) => s.start > today);
    stops.splice(at === -1 ? stops.length : at, 0, {
      key: "today",
      label: "Today",
      when: bannerLongDate(today),
      state: "today",
      start: today,
    });
  }
  const next = stops.find((s) => s.state === "later");
  if (next) next.state = "next";

  return stops.map(({ key, label, when, state }) => ({
    key,
    label,
    when,
    state,
  }));
}

/* The masthead's dateline: "Sunday, October 11, 2026". Built at noon UTC so
   no zone can move it to the day before or after; `today` is already the
   Florida calendar day. */
export function mastheadDate(today: string): string {
  return new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* "Tuesday, November 3". */
export function mastheadElectionDay(eventDate: string, today: string): string {
  if (eventDate === today) return "Election Day is today";
  const d = new Date(`${eventDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return `Election Day: ${d}`;
}
