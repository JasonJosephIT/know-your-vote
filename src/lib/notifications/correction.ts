import { z } from "zod";
/* Relative, with the extension: scripts/verify-correction.ts loads this
   file in plain Node, which doesn't know the @/ alias. */
import { coveredCounty } from "../counties.ts";
import type { ElectionEvent } from "./election-events";
import { eventsForCounty } from "./schedule.ts";
import {
  renderTemplate,
  TEMPLATES,
  type CorrectionEventLabel,
  type CorrectionParams,
  type Rendered,
} from "./templates.ts";

/* The manual correction send, as pure logic (design doc §7 playbook; plan
   C3). The route is src/app/api/cron/send-correction/route.ts; this file
   holds every decision it makes that does not need the database, so
   scripts/verify-correction.ts can drive each one under Node.

   The playbook: a reminder went out with a wrong date. The founder pauses
   the reminders (NOTIFICATIONS_PAUSED), corrects the election_event row,
   re-verifies it against its details_url, and then sends the `correction`
   template to the people who got the wrong date. Until 2026-10-05 the
   template existed and nothing could send it.

   The guard is the point of this file. A correction is the one email the
   founder triggers by hand, on a bad day, in a hurry, and its whole message
   is a date. So it may only state a date the founder has ALREADY verified:
   the date and details_url in the request must equal those of a verified
   election_event row of the type the label names. A typo in the request is
   refused, not mailed; to state a different date, the row is corrected and
   re-verified first, which is the same check every reminder already passes
   (plan F4). The email is then rendered from the row itself, not from the
   request, so the two cannot drift.

   Scope follows the reminders exactly. A correction to a statewide row
   reaches the subscribers for whom that row is the date that applies
   (eventsForCounty): everyone, except subscribers in a county with a row
   of its own for that event type, who never got the statewide date. A
   correction to a county's row (county_fips in the request) reaches that
   county's subscribers only, and requires the county's own row: a county
   with no row of its own for the type reads the statewide one, and its
   subscribers are corrected by the statewide correction. So the cohorts of
   the statewide and county corrections for one event type never overlap,
   and no address can get the same correction twice under two keys. */

/* event_label (the template's enum) -> the election_event type whose date
   it states. A Record over the label tuple, so a label added to the
   template without a mapping here fails tsc. */
export const CORRECTION_EVENT_TYPE: Record<
  CorrectionEventLabel,
  ElectionEvent["event_type"]
> = {
  "voter registration deadline": "registration_deadline",
  "vote-by-mail request deadline": "vbm_request_deadline",
  "vote-by-mail ballot return deadline": "ballot_return_deadline",
  "early voting start date": "early_voting_start",
  "early voting end date": "early_voting_end",
  "election day": "election_day",
};

/* ---- the request ------------------------------------------------------- */

export type CorrectionMode =
  /* Render and count; send nothing, write nothing. */
  | { kind: "dry_run" }
  /* Send to one address that holds an active subscription, "[Rehearsal]"
     in the subject, under a synthetic key. */
  | { kind: "rehearse"; to: string }
  /* The real send. confirmRecipients must equal the count a dry run
     reports, checked by the route against the cohort it is about to mail:
     the founder cannot reach a mass send without first seeing its size. */
  | { kind: "send"; confirmRecipients: number };

export type CorrectionRequest = {
  params: CorrectionParams;
  countyFips: string | null;
  mode: CorrectionMode;
};

const MODES = ["dry_run", "rehearse", "confirm_recipients"] as const;

/* The template's own params schema, so a request can never carry a value
   the template would refuse, plus the scope and the mode. Strict: an
   unknown key is refused rather than ignored, because a misspelt
   "county_fips" silently dropped would turn a county correction into a
   statewide one. */
const correctionRequestSchema = TEMPLATES.correction.schema
  .extend({
    county_fips: z
      .string()
      .refine((fips) => coveredCounty(fips) !== undefined, {
        message: "must be the FIPS code of a covered county (12086, 12011, 12057 or 12095)",
      })
      .optional(),
    dry_run: z.literal(true).optional(),
    rehearse: z.string().trim().min(1).optional(),
    confirm_recipients: z.number().int().positive().optional(),
  })
  .strict();

const BODY_SHAPE =
  '{"event_label":…,"election":…,"date":…,"details_url":…, optionally "county_fips":…, and one of "dry_run":true, "rehearse":"<address>" or "confirm_recipients":<count>}';

/* The POST body, as raw text: the route reads nothing from the URL. Every
   failure is a sentence the founder can act on, ending "Nothing was sent." */
export function parseCorrectionRequest(
  raw: string
): { request: CorrectionRequest } | { invalid: string } {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { invalid: `The body must be JSON: ${BODY_SHAPE}. Nothing was sent.` };
  }
  const parsed = correctionRequestSchema.safeParse(body);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`
    );
    return { invalid: `${problems.join("; ")}. Nothing was sent.` };
  }
  const { county_fips, dry_run, rehearse, confirm_recipients, ...params } = parsed.data;
  const modes = MODES.filter((m) => parsed.data[m] !== undefined);
  if (modes.length !== 1) {
    return {
      invalid: `Give exactly one of "dry_run": true, "rehearse": "<address>" or "confirm_recipients": <the count from the dry run>${modes.length > 1 ? ` (got ${modes.join(", ")})` : ""}. Nothing was sent.`,
    };
  }
  const mode: CorrectionMode = dry_run
    ? { kind: "dry_run" }
    : rehearse !== undefined
      ? { kind: "rehearse", to: rehearse }
      : { kind: "send", confirmRecipients: confirm_recipients as number };
  return { request: { params, countyFips: county_fips ?? null, mode } };
}

/* ---- the verified-date guard ------------------------------------------- */

/* An election_event row as the route reads it for the guard: the columns
   the reminders read, plus verified_by, so an unverified row is refused by
   name instead of reading as missing. */
export type ElectionEventRow = ElectionEvent & { verified_by: string | null };

/* The row this correction states, or why it may not be sent. countyFips
   null means the statewide row; a county's FIPS means that county's own
   row, and only that row (see the header for why a county correction never
   falls back to the statewide date). */
export function correctionTarget(
  rows: ElectionEventRow[],
  params: CorrectionParams,
  countyFips: string | null
): { target: ElectionEvent } | { refused: string } {
  const eventType = CORRECTION_EVENT_TYPE[params.event_label];
  const scope = countyFips
    ? `${coveredCounty(countyFips)?.name ?? countyFips} County's own`
    : "the statewide";
  const row = rows.find(
    (r) =>
      r.election === params.election &&
      r.event_type === eventType &&
      (r.county_fips ?? null) === countyFips
  );
  if (!row) {
    return {
      refused: countyFips
        ? `There is no ${scope} ${eventType} row for ${params.election}. A county correction needs the county's own row; to correct the statewide date, leave county_fips out.`
        : `There is no statewide ${eventType} row for ${params.election}.`,
    };
  }
  if (!row.verified_by) {
    return {
      refused: `${scope[0].toUpperCase()}${scope.slice(1)} ${eventType} row for ${params.election} is not verified (verified_by is NULL). Check it against its details_url and stamp it before sending a correction that states it.`,
    };
  }
  if (row.event_date !== params.date) {
    return {
      refused: `The verified ${eventType} (${scope} row) for ${params.election} is ${row.event_date}, not ${params.date}. A correction can only state a verified date: correct the row and re-verify it first.`,
    };
  }
  if (row.details_url !== params.details_url) {
    return {
      refused: `details_url must be the verified row's own, ${row.details_url}, not ${params.details_url}.`,
    };
  }
  return { target: row };
}

/* ---- key, scope and copy ----------------------------------------------- */

/* The claim in notification_send_log for the real send. One correction per
   verified date and scope: sending the same correction again is refused
   ("already sent"), and a later correction to a different date gets its own
   key. Never collides with a reminder's key, which starts with the
   election, or a rehearsal's, which starts with "rehearsal:". */
export function correctionDedupeKey(target: ElectionEvent): string {
  return `correction:${target.election}:${target.event_type}:${target.event_date}${target.county_fips ? `:${target.county_fips}` : ""}`;
}

/* Whether the subscribers in one date scope (a county with rows of its
   own, or null for statewide; activeSubscribers' `scope`) get this
   correction: exactly when the target is the row that applies to them.
   events are the verified rows for the target's election. */
export function correctionReaches(
  events: ElectionEvent[],
  target: ElectionEvent,
  scope: string | null
): boolean {
  return eventsForCounty(events, scope).some((e) => e.id === target.id);
}

/* The correction email, rendered from the verified row and the label only.
   The template names no county; a county correction's details_url is the
   county's own page. */
export function renderCorrection(
  target: ElectionEvent,
  eventLabel: CorrectionEventLabel
): Rendered {
  return renderTemplate("correction", {
    event_label: eventLabel,
    election: target.election,
    date: target.event_date,
    details_url: target.details_url,
  });
}
