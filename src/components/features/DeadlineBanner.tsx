import { unstable_cache } from "next/cache";
import { ACTIVE_ELECTION } from "@/lib/election";
import {
  verifiedStatewideEvents,
  type ElectionEvent,
} from "@/lib/notifications/election-events";
import { bannerDates, easternToday } from "@/lib/notifications/schedule";
import { createServiceClient } from "@/lib/supabase/service";

/* Dates are stated, never counted down. A countdown ("28 days left") would
   go stale the moment this page is served from a cache, and a wrong number
   on a civic deadline is worse than no number. */
function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/* Every verified statewide date for the active election. This used to come
   from getPublicElectionDates (src/lib/election-dates.ts, removed 2026-10-04
   once nothing else read it), which kept only the registration deadline and
   Election Day — not enough to roll forward to the vote-by-mail and
   early-voting dates. Same read, same hour-long
   cache, same "election-dates" tag, so a correction still revalidates it.

   createServiceClient throws without the service-role key (src/lib/
   server-keys.ts), inside the cache, so a missing key is never cached as
   "no dates": the banner appears on the first request after the key is
   readable rather than up to an hour later. */
const cachedEvents = unstable_cache(
  async (): Promise<ElectionEvent[]> =>
    verifiedStatewideEvents(createServiceClient(), ACTIVE_ELECTION),
  ["deadline-banner-events", ACTIVE_ELECTION],
  { revalidate: 3600, tags: ["election-dates"] }
);

async function bannerEvents(): Promise<ElectionEvent[]> {
  try {
    return await cachedEvents();
  } catch {
    return [];
  }
}

/* What each date asks of a voter, in the banner's few words. The early
   voting pair reads as one window when both rows exist, because the window
   is the fact; counties may add days on either side, and the official
   pages behind the calendar link say which. */
function nextLine(next: ElectionEvent, events: ElectionEvent[]): string {
  const start = events.find((e) => e.event_type === "early_voting_start");
  const end = events.find((e) => e.event_type === "early_voting_end");
  switch (next.event_type) {
    case "registration_deadline":
      return `Register to vote by ${longDate(next.event_date)}`;
    case "vbm_request_deadline":
      /* 5 p.m. local time: s. 101.62(3)(c), Fla. Stat. (checked 2026-10-04). */
      return `Request a vote-by-mail ballot by 5 p.m. on ${longDate(next.event_date)}`;
    case "early_voting_start":
    case "early_voting_end":
      return start && end
        ? `Early voting runs ${longDate(start.event_date)} to ${longDate(end.event_date)} statewide`
        : next.event_type === "early_voting_start"
          ? `Early voting starts ${longDate(next.event_date)}`
          : `Early voting ends ${longDate(next.event_date)}`;
    case "ballot_return_deadline":
      return `Mail ballots must be received by 7 p.m. on ${longDate(next.event_date)}`;
    case "election_day":
      return `Election Day is ${longDate(next.event_date)}`;
  }
}

/* The one piece of urgency on the landing page (TASK-064).

   Renders nothing until a human has verified the dates (TASK-058) — that
   gate is the whole point of election_event.verified_by, so an unverified
   date must never reach a voter.

   It states the NEXT date a voter can still act on, then Election Day, and
   rolls forward on Florida's calendar day (bannerDates and easternToday in
   src/lib/notifications/schedule.ts; launch handoff 2026-10-04, §2). It used
   to state the registration deadline and Election Day forever. "Today" is
   read per request: the home page is dynamic (it reads the district
   cookie), so the rollover is never older than the request.

   remindersHref links to the reminder signup when the home page shows it
   (founder decision 3, src/lib/notifications/config.ts). */
export async function DeadlineBanner({
  remindersHref,
}: {
  remindersHref?: string;
}) {
  const events = await bannerEvents();
  const dates = bannerDates(events, easternToday());
  if (!dates) return null;

  const parts = [
    dates.next && nextLine(dates.next, events),
    dates.electionDay && `Election Day is ${longDate(dates.electionDay.event_date)}`,
  ].filter(Boolean) as string[];

  const link = "w-fit text-caption underline underline-offset-2";
  return (
    <aside
      /* Calm, not alarmed — the design brief's reference librarian, not a
         campaign banner. No red, no siren, no exclamation. */
      className="flex flex-col gap-1 rounded-md bg-primary-muted px-4 py-3 text-body-sm text-primary-hover"
    >
      <p className="font-semibold">{parts.join(" · ")}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <a href={`/api/calendar/${ACTIVE_ELECTION}.ics`} className={link}>
          Add these dates to your calendar
        </a>
        {remindersHref && (
          <a href={remindersHref} className={link}>
            Get deadline reminders by email
          </a>
        )}
      </p>
    </aside>
  );
}
