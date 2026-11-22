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

/* today is an ISO date (UTC). A reminder is due when event_date minus its
   offset lands exactly on today — a missed cron day misses that reminder
   loudly (Vercel cron alerting) rather than double-sending the next day. */
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
