import { ACTIVE_ELECTION } from "@/lib/election";
import { homeElectionEvents } from "@/lib/notifications/home-events";
import { bannerLine, electionDayLine } from "@/lib/notifications/banner";
import { keyDateStops } from "@/lib/notifications/key-dates";
import {
  bannerDates,
  countiesWithOwnDates,
  easternToday,
  eventsForCounty,
} from "@/lib/notifications/schedule";
import { KeyDatesRail } from "@/components/features/KeyDatesRail";

/* The one piece of urgency on the landing page (TASK-064).

   Renders nothing until a human has verified the dates (TASK-058) — that
   gate is the whole point of election_event.verified_by, so an unverified
   date must never reach a voter.

   It states the NEXT date a voter can still act on, then Election Day, and
   rolls forward on Florida's calendar day (bannerDates and easternToday in
   src/lib/notifications/schedule.ts; launch handoff 2026-10-04, §2). It used
   to state the registration deadline and Election Day forever. "Today" is
   read per request, and a date that falls today is worded as today ("Today,
   October 5, is the last day to register to vote"): the home page is dynamic (it reads the district
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
  const allEvents = await homeElectionEvents();
  const scope =
    countyFips && countiesWithOwnDates(allEvents).includes(countyFips)
      ? countyFips
      : null;
  const events = eventsForCounty(allEvents, scope);
  const today = easternToday();
  const dates = bannerDates(events, today);
  if (!dates) return null;

  const parts = [
    dates.next && bannerLine(dates.next, events, allEvents, today),
    dates.electionDay && electionDayLine(dates.electionDay.event_date, today),
  ].filter(Boolean) as string[];

  /* The rail under the line (layout pass 2026-10-11, item 2): every date
     at once, with where the reader stands. Same events, same today, so it
     rolls forward with the line above it and vanishes with it. */
  const stops = keyDateStops(events, today);

  /* 24 px tall at least (WCAG 2.5.8 Target Size, AA): as plain caption
     text the two links were 18 px and wrapped 4 px apart on a phone, and
     axe and Lighthouse both failed them (production re-run, 2026-10-05).
     min-h-[24px], not min-h-6: this theme's spacing makes min-h-6 32 px. */
  const link =
    "inline-flex min-h-[24px] w-fit items-center text-caption underline underline-offset-2";
  return (
    <aside
      aria-label="Key dates"
      /* Calm, not alarmed — the design brief's reference librarian, not a
         campaign banner. No red, no siren, no exclamation. */
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-4 text-body-sm"
    >
      <p className="font-semibold text-primary-hover">{parts.join(" · ")}</p>
      {stops && <KeyDatesRail stops={stops} />}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-primary">
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
