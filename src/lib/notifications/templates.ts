import { z } from "zod";

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

/* Correction is the one pre-approved manual-broadcast template (design doc
   §7 playbook). Still no free text: the wrong-date correction is composed
   entirely from typed fields. */
const correctionParams = dateParams.extend({
  event_label: z.enum([
    "voter registration deadline",
    "vote-by-mail request deadline",
    "early voting start date",
    "early voting end date",
    "election day",
  ]),
});

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
      body: `Tomorrow, ${longDate(p.date)}, is the last day to request a vote-by-mail ballot for the ${ELECTION_LABEL[p.election]}. Official info: ${p.details_url}`,
      url: p.details_url,
    }),
  }),
  early_voting_start: template({
    channel: "email",
    schema: dateParams,
    render: (p) => ({
      subject: "Early voting starts today",
      title: "Early voting starts today",
      body: `Early voting for the ${ELECTION_LABEL[p.election]} begins today, ${longDate(p.date)} (statewide window — days and sites vary by county). Official info: ${p.details_url}`,
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

export function renderTemplate(id: string, params: unknown): Rendered {
  const t = (TEMPLATES as Record<string, Template<z.ZodType>>)[id];
  if (!t) throw new Error(`unknown template_id: ${id}`);
  return t.render(t.schema.parse(params));
}
