import { z } from "zod";
/* Relative, with the extension: scripts/verify-reminder-schedule.ts loads
   this file in plain Node, which doesn't know the @/ alias. */
import { COVERED_COUNTIES, coveredCounty } from "../counties.ts";
import type { ElectionEvent } from "./election-events";

/* Template registry (plan A7b) — the ONLY place notification copy exists
   (§0.3). Sends carry a template_id plus zod-validated params; there is no
   free-text path, so a bad row or compromised caller can misfire a true
   template but cannot compose a message. Copy rules (§0.4): dates,
   deadlines, and official links only — never candidate names, race
   outcomes, or news summaries. Every body ends with the details_url.
   The reminder schedule referencing these ids lives in ./schedule.ts. */

const ELECTION_LABEL: Record<string, string> = {
  primary_2026: "2026 Florida primary",
  general_2026: "2026 Florida general election",
};

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const dateParams = z.object({
  election: z.enum(["primary_2026", "general_2026"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  details_url: z.string().url().startsWith("https://"),
});

/* A county's own early-voting date (0043) names the county, so a voter
   reading "begins today" knows whose calendar it is. Only a covered
   county's name passes: still no free text. */
const earlyVotingParams = dateParams.extend({
  county: z
    .string()
    .refine((name) => COVERED_COUNTIES.some((c) => c.name === name))
    .optional(),
});

/* Correction is the one pre-approved manual-broadcast template (design doc
   §7 playbook). Still no free text: the wrong-date correction is composed
   entirely from typed fields. The labels are exported so ./correction.ts
   can map each one to the election_event type it corrects: a Record over
   this tuple, so a label added here without a mapping fails tsc. The only
   sender is src/app/api/cron/send-correction/route.ts. */
export const CORRECTION_EVENT_LABELS = [
  "voter registration deadline",
  "vote-by-mail request deadline",
  /* Every date we can publish must be correctable — the ballot return
     deadline reaches voters through the .ics calendar (0021). */
  "vote-by-mail ballot return deadline",
  "early voting start date",
  "early voting end date",
  "election day",
] as const;

export type CorrectionEventLabel = (typeof CORRECTION_EVENT_LABELS)[number];

const correctionParams = dateParams.extend({
  event_label: z.enum(CORRECTION_EVENT_LABELS),
});

export type CorrectionParams = z.infer<typeof correctionParams>;

export type Rendered = {
  subject?: string;
  title: string;
  body: string;
  url: string;
};

type Template<S extends z.ZodType> = {
  channel: "email";
  schema: S;
  render: (params: z.infer<S>) => Rendered;
};

function template<S extends z.ZodType>(t: Template<S>): Template<S> {
  return t;
}

export const TEMPLATES = {
  reg_deadline_t7: template({
    channel: "email",
    schema: dateParams,
    render: (p) => ({
      subject: "One week left to register to vote",
      title: "Registration deadline in one week",
      body: `The voter registration deadline for the ${ELECTION_LABEL[p.election]} is ${longDate(p.date)} — one week away. Register or update your registration by then to vote in this election. Official info: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  reg_deadline_t1: template({
    channel: "email",
    schema: dateParams,
    render: (p) => ({
      subject: "Voter registration closes tomorrow",
      title: "Registration deadline is tomorrow",
      body: `Tomorrow, ${longDate(p.date)}, is the last day to register to vote in the ${ELECTION_LABEL[p.election]}. Official info: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  vbm_deadline_t1: template({
    channel: "email",
    schema: dateParams,
    render: (p) => ({
      subject: "Vote-by-mail request deadline is tomorrow",
      title: "Vote-by-mail deadline is tomorrow",
      /* 5 p.m. local time: s. 101.62(3)(c), Fla. Stat., and the Division of
         Elections vote-by-mail page, both checked 2026-10-04. */
      body: `Tomorrow, ${longDate(p.date)}, is the last day to request a vote-by-mail ballot for the ${ELECTION_LABEL[p.election]}. Your request must be received by 5 p.m. local time. Official info: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  /* The return deadline (0021). Two sends, mirroring the registration
     deadline's T-7/T-1 shape because this is the other deadline with no
     second chance — but the two bodies give DIFFERENT advice, which is the
     reason there are two. At T-7 mail still works and the Postal Service
     asks for a week; at T-1 it may not, so the useful instruction changes
     to returning it in person. Both say a postmark does not count, because
     that is the specific wrong belief this deadline punishes. Neither
     names a drop-off mechanism — those vary by county and by whether early
     voting has ended, so both defer to the Supervisor of Elections, the
     same way early_voting_start defers on days and sites. */
  ballot_return_t7: template({
    channel: "email",
    schema: dateParams,
    render: (p) => ({
      subject: "Mail your ballot back this week",
      title: "One week to return your ballot",
      body: `Your voted ballot for the ${ELECTION_LABEL[p.election]} must be RECEIVED by your county Supervisor of Elections by 7 p.m. on ${longDate(p.date)} — one week away. A postmark does not count, and the Postal Service recommends mailing it back at least a week ahead. Official info: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  ballot_return_t1: template({
    channel: "email",
    schema: dateParams,
    render: (p) => ({
      subject: "Your ballot must be back by 7 p.m. tomorrow",
      title: "Ballot due back tomorrow",
      body: `Your voted ballot for the ${ELECTION_LABEL[p.election]} must be RECEIVED by 7 p.m. tomorrow, ${longDate(p.date)} — a postmark does not count. Mail may no longer arrive in time, so returning it in person is the surest way; your county Supervisor of Elections lists locations and hours. Official info: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  early_voting_start: template({
    channel: "email",
    schema: earlyVotingParams,
    render: (p) => ({
      subject: "Early voting starts today",
      title: "Early voting starts today",
      body: p.county
        ? `Early voting for the ${ELECTION_LABEL[p.election]} begins today, ${longDate(p.date)}, in ${p.county} County. The Supervisor of Elections lists the early voting sites and hours: ${p.details_url}`
        : `Early voting for the ${ELECTION_LABEL[p.election]} begins today, ${longDate(p.date)} (statewide window — days and sites vary by county). Official info: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  election_day: template({
    channel: "email",
    schema: dateParams,
    render: (p) => ({
      subject: "Today is Election Day",
      title: "Today is Election Day",
      body: `Today, ${longDate(p.date)}, is Election Day for the ${ELECTION_LABEL[p.election]}. Find your polling place and hours at the official source: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  correction: template({
    channel: "email",
    schema: correctionParams,
    render: (p) => ({
      subject: "Correction: an election date we sent was wrong",
      title: "Correction to an earlier reminder",
      body: `Correction: the ${p.event_label} for the ${ELECTION_LABEL[p.election]} is ${longDate(p.date)}. Please disregard the date in our earlier message — we're sorry for the error. Official source: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
} as const;

export type TemplateId = keyof typeof TEMPLATES;

/* §6-D payload budgets, enforced by scripts/verify-notification-templates.ts
   against every template with sample params. Email bodies get a generous
   but real ceiling so copy edits can't balloon unnoticed. */
export const BUDGETS = {
  email: { subject: 78, title: 50, body: 600 },
  webpush: { title: 50, body: 120 },
} as const;

/* The typed params a scheduled reminder renders with, from its event row.
   One function for the cron's send and its rehearsal, so the two can never
   word a reminder differently. A county row (0043) adds the county's name;
   the templates that don't take it strip it. */
export function reminderParams(event: ElectionEvent): {
  election: string;
  date: string;
  details_url: string;
  county?: string;
} {
  const county = event.county_fips ? coveredCounty(event.county_fips)?.name : undefined;
  return {
    election: event.election,
    date: event.event_date,
    details_url: event.details_url,
    ...(county ? { county } : {}),
  };
}

export function renderTemplate(id: string, params: unknown): Rendered {
  const t = (TEMPLATES as Record<string, Template<z.ZodType>>)[id];
  if (!t) throw new Error(`unknown template_id: ${id}`);
  return t.render(t.schema.parse(params));
}

/* The welcome email the voting-info signup sends (FR-010). It stays outside
   the TEMPLATES registry, as it always was: it carries the voter's own ZIP
   and county, which the registry's typed date params have no slot for, and
   the route passes only values it has already validated or resolved. The
   copy moved here from src/app/api/voting-info/route.ts so that
   scripts/verify-reminder-schedule.ts can render it for every day from
   Oct 4 to Nov 4 (review of the launch-handoff PR, 2026-10-04): a route
   file can't be imported under Node, and a passed date or a promise the
   reminders won't keep is exactly what a day-by-day walk catches. */
export type WelcomeEmailParams = {
  zip: string;
  county: string;
  district: string | null;
  /* The county Supervisor of Elections (officialSources), or null. */
  office: { name: string; url: string } | null;
  /* The Division of Elections, when there is no county office to name. */
  stateUrl: string;
  /* siteOrigin() and unsubscribeUrl() from src/lib/site-url.ts: the site's
     fixed address, never the address the signup request came in on. */
  origin: string;
  unsubscribeUrl: string;
  /* The verified rows that apply to the voter's county: eventsForCounty
     over verifiedElectionEvents (src/lib/notifications/schedule.ts). */
  events: ElectionEvent[];
  /* easternToday(): a date before it has passed in Florida. */
  today: string;
  /* The general-election line only when the ZIP resolved to races. */
  hasRaces: boolean;
  /* !remindersPaused(): promise reminders only while the cron sends them. */
  remindersOn: boolean;
};

export function welcomeEmail(p: WelcomeEmailParams): {
  subject: string;
  text: string;
} {
  /* An unverified or missing row drops its line (plan A5), and so does a
     date that has already passed in Florida: a voter who signs up on Oct 6
     must not be handed the Oct 5 registration deadline as if it were still
     ahead. Early voting is a window, so its start stays while the window is
     open. The lines after registration are the deadlines the reminders
     cover, so the welcome email and the reminders describe one calendar. */
  const byType = new Map(p.events.map((e) => [e.event_type, e]));
  const upcoming = (type: ElectionEvent["event_type"]) => {
    const iso = byType.get(type)?.event_date;
    return iso && iso >= p.today ? longDate(iso) : undefined;
  };
  const earlyStartRow = byType.get("early_voting_start");
  const earlyStartIso = earlyStartRow?.event_date;
  const registration = upcoming("registration_deadline");
  const vbmRequest = upcoming("vbm_request_deadline");
  const earlyStart = earlyStartIso ? longDate(earlyStartIso) : undefined;
  const earlyEnd = upcoming("early_voting_end");
  const ballotReturn = upcoming("ballot_return_deadline");
  const general = p.hasRaces ? upcoming("election_day") : undefined;
  /* p.events are already this voter's county's dates (eventsForCounty), so
     a county row here is the voter's own county. */
  const earlyCounty = earlyStartRow?.county_fips
    ? coveredCounty(earlyStartRow.county_fips)?.name
    : undefined;
  const countyFips = p.events.find((e) => e.county_fips)?.county_fips;
  const calendarUrl = `${p.origin}/api/calendar/general_2026.ics${countyFips ? `?county=${countyFips}` : ""}`;

  const dateLines = [
    registration && `Registration deadline: ${registration}`,
    vbmRequest &&
      `Vote-by-mail request deadline: ${vbmRequest}${byType.get("vbm_request_deadline")?.rule === "received_by" ? " (your request must be received by 5 p.m. local time that day)" : ""}`,
    earlyStart &&
      earlyEnd &&
      (earlyCounty
        ? `Early voting in ${earlyCounty} County: ${earlyStart} to ${earlyEnd}. Sites and hours: ${earlyStartRow?.details_url}`
        : `Early voting: ${earlyStart} to ${earlyEnd} (the statewide window; days and sites vary by county)`),
    ballotReturn &&
      `Vote-by-mail ballots must be received by 7 p.m. on ${ballotReturn}. A postmark does not count.`,
    general && `General election: ${general}`,
  ].filter((line): line is string => Boolean(line));

  /* Missing dates already dropped out of dateLines, so every "" here is a
     deliberate blank line. The old route filtered "" to drop missing dates,
     which also deleted every paragraph break. */
  const lines = [
    `Here's your voting info for ZIP ${p.zip} (${p.county} County${p.district ? `, ${p.district}` : ""}).`,
    ``,
    `Your polling place and sample ballot:`,
    `${p.office?.name ?? "Your county Supervisor of Elections"} — ${p.office?.url ?? p.stateUrl}`,
    `(Precinct lookup on that site shows your exact polling place.)`,
    ``,
    ...(dateLines.length > 0
      ? [
          `Key dates:`,
          ...dateLines,
          `Add them to your calendar: ${calendarUrl}`,
          ``,
        ]
      : []),
    `Every registered Florida voter gets the same ballot in the general election, whatever party you're registered with — including no party at all.`,
    ``,
    `Your ballot, laid out fairly: ${p.origin}`,
    ``,
    /* Said plainly because it is what the signup does: the reminder cron
       mails every active subscription. The old line called this a
       "one-time" email, which the first reminder would have contradicted.
       While NOTIFICATIONS_PAUSED is set the cron sends nothing, so the
       email promises nothing either. */
    p.remindersOn
      ? `You asked for voting info, so you'll also get a short reminder as each remaining deadline comes up, through Election Day. Unsubscribe anytime: ${p.unsubscribeUrl}`
      : `You asked for this email. Unsubscribe anytime: ${p.unsubscribeUrl}`,
  ];

  return {
    subject: `Where to vote in ${p.county} County`,
    text: lines.join("\n"),
  };
}
