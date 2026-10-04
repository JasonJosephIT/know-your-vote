import "server-only";

/* Email delivery: is it switched on, and where do we point voters when it
   is not (launch handoff 2026-10-04, §2 items 2–3).

   Production ran for weeks with the signup form live and email delivery
   impossible: the keys were saved in Vercel under the wrong names (SUPABASE,
   RESEND), so RESEND_API_KEY, EMAIL_FROM and SUPABASE_SERVICE_ROLE_KEY all
   read as unset and every signup ended in a 503 the voter could do nothing
   about. These helpers are the one place that says which variables delivery
   needs, so the routes that send and the pages that offer a signup can never
   disagree about it. Server-only: they read secrets' presence, never values,
   and the answer travels to the browser as a plain boolean prop.

   The env runbook is docs/general-election/reminders-e2e-runbook.md. */

/* Resend can send: an API key and a From address. The two routes check this
   first and keep their existing 503 wording for it. */
export function emailSenderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/* The whole signup works end to end: Resend can send AND the service role
   can store the subscription (createServiceClient). The routes reach the
   second half through createServiceClient's own try/catch, which keeps their
   status codes and messages exactly as they were; pages use this to decide
   whether to offer a form at all. */
export function emailDeliveryConfigured(): boolean {
  return (
    emailSenderConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/* The reminder kill switch the cron already honoured (design doc §7
   playbook: a wrong date is caught, sends stop while a correction is
   prepared). Any non-empty value pauses. While paused we also stop
   promoting the signup, since the promotion's whole promise is reminders. */
export function remindersPaused(): boolean {
  return Boolean(process.env.NOTIFICATIONS_PAUSED);
}

/* ------------------------------------------------------------------------
   FOUNDER DECISION 3: promote the reminder signup on the home page.
   Recommended (pending founder confirmation): yes, once email works.

   With this true, the home page shows the signup card (ReminderSignupCta)
   and a link to it in the deadline banner, but ONLY while
   emailDeliveryConfigured() is true and reminders are not paused — so it
   switches itself on with the redeploy after the env fix, and never offers
   a form that can only fail. To turn the promotion off, set this to false;
   the signup on the "Your races" view is unaffected.
   ------------------------------------------------------------------------ */
export const PROMOTE_REMINDER_SIGNUP = true;

export function reminderPromotionLive(): boolean {
  return (
    PROMOTE_REMINDER_SIGNUP && emailDeliveryConfigured() && !remindersPaused()
  );
}

/* Where a voter's polling place and dates officially live. Moved here from
   the voting-info route so the email and the no-email fallback in
   VotingInfo name the same offices with the same links. */
export type OfficialSource = { name: string; url: string };

export type OfficialSources = {
  /* The county Supervisor of Elections — null outside the covered counties,
     where callers say so in their own words. */
  office: OfficialSource | null;
  /* The Division of Elections, statewide. */
  state: OfficialSource;
  /* The verified dates' own details_url in election_event. */
  dates: OfficialSource;
};

const SUPERVISORS: Record<string, OfficialSource> = {
  "Miami-Dade": {
    name: "Miami-Dade Supervisor of Elections",
    url: "https://www.miamidade.gov/global/elections/home.page",
  },
  Broward: {
    name: "Broward Supervisor of Elections",
    url: "https://www.browardvotes.gov",
  },
  Hillsborough: {
    name: "Hillsborough Supervisor of Elections",
    url: "https://www.votehillsborough.gov",
  },
  Orange: {
    name: "Orange County Supervisor of Elections",
    url: "https://www.ocfelections.gov",
  },
};

export function officialSources(county?: string | null): OfficialSources {
  return {
    office: (county && SUPERVISORS[county]) || null,
    state: {
      name: "Florida Division of Elections",
      url: "https://dos.fl.gov/elections/",
    },
    dates: {
      name: "Florida Division of Elections' dates page",
      url: "https://dos.fl.gov/elections/for-voters/election-dates/",
    },
  };
}
