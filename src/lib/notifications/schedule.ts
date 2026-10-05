import type { ElectionEvent } from "./election-events";
import type { TemplateId } from "./templates";

/* Reminder schedule + pure due-today matching for the daily cron (plan
   A7c/A8) — kept out of the route, with type-only imports, so
   scripts/verify-notifications-schema.mjs can dry-run it under Node's
   native type stripping. */

/* REMINDER_OFFSETS replaces the design doc's reminder_rule table (ponytail
   2026-07-06): adding a reminder is a deploy either way, so the rules live
   in code. offset_days counts days before event_date; 0 = day-of. Phase A:
   email only. The correction template is manual-only and deliberately
   absent. scripts/verify-notification-templates.ts asserts every entry
   references a registered template of the same channel. */
export const REMINDER_OFFSETS: ReadonlyArray<{
  event_type: ElectionEvent["event_type"];
  offset_days: number;
  template_id: TemplateId;
  channel: "email";
}> = [
  { event_type: "registration_deadline", offset_days: 7, template_id: "reg_deadline_t7", channel: "email" },
  { event_type: "registration_deadline", offset_days: 1, template_id: "reg_deadline_t1", channel: "email" },
  { event_type: "vbm_request_deadline", offset_days: 1, template_id: "vbm_deadline_t1", channel: "email" },
  { event_type: "early_voting_start", offset_days: 0, template_id: "early_voting_start", channel: "email" },
  /* Chronological: for general_2026 these land Oct 27 and Nov 2, after early
     voting opens and before election day. T-0 is deliberately absent — the
     return deadline shares its date with election_day, and two emails on the
     same morning is how a reminder stream gets muted. */
  { event_type: "ballot_return_deadline", offset_days: 7, template_id: "ballot_return_t7", channel: "email" },
  { event_type: "ballot_return_deadline", offset_days: 1, template_id: "ballot_return_t1", channel: "email" },
  { event_type: "election_day", offset_days: 0, template_id: "election_day", channel: "email" },
];

export type DueReminder = {
  event: ElectionEvent;
  template_id: TemplateId;
  channel: "email";
  offset_days: number;
  dedupe_key: string;
};

export function isoDaysBefore(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/* The voter's calendar day, as an ISO date (launch handoff 2026-10-04, §2).

   Every deadline in election_event is a Florida date, and all four covered
   counties keep Eastern time, so "today" means today in America/New_York —
   never UTC. The cron used to take the UTC date. At its scheduled 14:00 UTC
   the two always agree (9 or 10 a.m. Eastern), which is why nothing looked
   wrong, but from 8 p.m. Eastern (7 p.m. after Nov 1) UTC is already
   tomorrow. A manual re-run in that window — the design doc's recovery path
   after a failed send — would skip the day's released reminder and send
   tomorrow's a day early ("Early voting begins today" the night before). The
   landing-page banner had the same edge: it would drop a deadline at 8 p.m.
   on the deadline day itself, while online registration is still open.
   scripts/verify-reminder-schedule.ts pins the boundary both ways. */
const EASTERN_DAY = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function easternToday(now: Date = new Date()): string {
  const parts = EASTERN_DAY.formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/* today is an ISO date — easternToday(), see above. A reminder is due when
   event_date minus its offset lands exactly on today — a missed cron day
   misses that reminder loudly (Vercel cron alerting) rather than
   double-sending the next day. */
export function dueReminders(
  events: ElectionEvent[],
  today: string
): DueReminder[] {
  const due: DueReminder[] = [];
  for (const event of events) {
    for (const rule of REMINDER_OFFSETS) {
      if (
        rule.event_type === event.event_type &&
        isoDaysBefore(event.event_date, rule.offset_days) === today
      ) {
        due.push({
          event,
          template_id: rule.template_id,
          channel: rule.channel,
          offset_days: rule.offset_days,
          dedupe_key: `${event.election}:${event.event_type}:T-${rule.offset_days}:${rule.channel}`,
        });
      }
    }
  }
  return due;
}

/* The next reminder the schedule will send, on or after today: the first
   day, walking forward, on which dueReminders finds anything (the first of
   that day's reminders if there are several). 120 days is longer than any
   gap between two reminders in a cycle. Used only by the cron's REHEARSAL
   mode; it lives here, pure, so scripts/verify-reminder-schedule.ts checks
   it against the same send calendar it walks. */
export function nextReminder(
  events: ElectionEvent[],
  today: string
): { day: string; reminder: DueReminder } | null {
  for (let i = 0; i <= 120; i++) {
    const day = isoDaysBefore(today, -i);
    const [reminder] = dueReminders(events, day);
    if (reminder) return { day, reminder };
  }
  return null;
}

/* The landing-page banner's rollover (DeadlineBanner; launch handoff
   2026-10-04, §2 item 5). The banner used to state the registration
   deadline and Election Day forever, so from Oct 6 it would have told every
   visitor to "register by October 5". It now states the NEXT date a voter
   can still act on, then Election Day, and disappears once Election Day has
   passed.

   "Still act on" is inclusive of the day itself — Oct 5 is a registration
   day — except for the start of early voting: on the day it opens, the
   useful fact is when it closes, so the start rolls to the end. Ties on a
   date fall back to the order below. Pure and type-only like the rest of
   this file, so scripts/verify-reminder-schedule.ts walks it day by day. */
const BANNER_ORDER: ReadonlyArray<ElectionEvent["event_type"]> = [
  "registration_deadline",
  "vbm_request_deadline",
  "early_voting_start",
  "early_voting_end",
  "ballot_return_deadline",
];

export type BannerDates = {
  next: ElectionEvent | null;
  electionDay: ElectionEvent | null;
};

export function bannerDates(
  events: ElectionEvent[],
  today: string
): BannerDates | null {
  const electionDay =
    events.find((e) => e.event_type === "election_day") ?? null;
  if (electionDay && electionDay.event_date < today) return null;

  const next =
    events
      .filter((e) => BANNER_ORDER.includes(e.event_type))
      .filter((e) =>
        e.event_type === "early_voting_start"
          ? e.event_date > today
          : e.event_date >= today
      )
      .sort(
        (a, b) =>
          a.event_date.localeCompare(b.event_date) ||
          BANNER_ORDER.indexOf(a.event_type) - BANNER_ORDER.indexOf(b.event_type)
      )[0] ?? null;

  if (!next && !electionDay) return null;
  return { next, electionDay };
}
