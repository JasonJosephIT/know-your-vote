import { unstable_cache } from "next/cache";
import { ACTIVE_ELECTION } from "@/lib/election";
import {
  verifiedElectionEvents,
  type ElectionEvent,
} from "@/lib/notifications/election-events";
import { bannerLine, bannerLongDate } from "@/lib/notifications/banner";
import {
  bannerDates,
  countiesWithOwnDates,
  easternToday,
  eventsForCounty,
} from "@/lib/notifications/schedule";
import { createServiceClient } from "@/lib/supabase/service";

/* Every verified date for the active election, statewide and county
   (0043). This used to come from getPublicElectionDates (src/lib/
   election-dates.ts, removed 2026-10-04 once nothing else read it), which
   kept only the registration deadline and Election Day — not enough to
   roll forward to the vote-by-mail and early-voting dates. Same hour-long
   cache, same "election-dates" tag, so a correction still revalidates it.
   The key changed with the county rows, so no entry cached before them
   (statewide rows only) is served after.

   createServiceClient throws without the service-role key (src/lib/
   server-keys.ts), inside the cache, so a missing key is never cached as
   "no dates": the banner appears on the first request after the key is
   readable rather than up to an hour later. */
const cachedEvents = unstable_cache(
  async (): Promise<ElectionEvent[]> =>
    verifiedElectionEvents(createServiceClient(), ACTIVE_ELECTION),
  ["deadline-banner-events-by-county", ACTIVE_ELECTION],
  { revalidate: 3600, tags: ["election-dates"] }
);

async function bannerEvents(): Promise<ElectionEvent[]> {
  try {
    return await cachedEvents();
  } catch {
    return [];
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
   (founder decision 3, src/lib/notifications/config.ts).

   countyFips is the saved district's county (the kyv.district cookie),
   when there is one. With it the banner states that county's dates and
   links its calendar; without it, the statewide dates. */
export async function DeadlineBanner({
  remindersHref,
  countyFips,
}: {
  remindersHref?: string;
  countyFips?: string;
}) {
  const allEvents = await bannerEvents();
  const scope =
    countyFips && countiesWithOwnDates(allEvents).includes(countyFips)
      ? countyFips
      : null;
  const events = eventsForCounty(allEvents, scope);
  const dates = bannerDates(events, easternToday());
  if (!dates) return null;

  const parts = [
    dates.next && bannerLine(dates.next, events, allEvents),
    dates.electionDay &&
      `Election Day is ${bannerLongDate(dates.electionDay.event_date)}`,
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
        <a
          href={`/api/calendar/${ACTIVE_ELECTION}.ics${scope ? `?county=${scope}` : ""}`}
          className={link}
        >
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
