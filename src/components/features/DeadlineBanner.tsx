import { getPublicElectionDates } from "@/lib/election-dates";

/* Dates are stated, never counted down. A countdown ("28 days left") would
   go stale the moment this page is served from the ISR cache, and a wrong
   number on a civic deadline is worse than no number. */
function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/* The one piece of urgency on the landing page (TASK-064).

   Renders nothing until a human has verified the dates (TASK-058) — that
   gate is the whole point of election_event.verified_by, so an unverified
   date must never reach a voter. Safe to ship before that lands. */
export async function DeadlineBanner() {
  const dates = await getPublicElectionDates();
  if (!dates) return null;

  const parts = [
    dates.registrationDeadline &&
      `Register to vote by ${longDate(dates.registrationDeadline)}`,
    dates.electionDay && `Election Day is ${longDate(dates.electionDay)}`,
  ].filter(Boolean) as string[];

  return (
    <aside
      /* Calm, not alarmed — the design brief's reference librarian, not a
         campaign banner. No red, no siren, no exclamation. */
      className="flex flex-col gap-1 rounded-md bg-primary-muted px-4 py-3 text-body-sm text-primary-hover"
    >
      <p className="font-semibold">{parts.join(" · ")}</p>
      <a
        href={dates.calendarUrl}
        className="w-fit text-caption underline underline-offset-2"
      >
        Add these dates to your calendar
      </a>
    </aside>
  );
}
