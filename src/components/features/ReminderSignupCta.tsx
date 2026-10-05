import { VotingInfo } from "@/components/features/VotingInfo";
import { coveredCountyNames } from "@/lib/counties";

/* The home page's reminder signup (launch handoff 2026-10-04, §2 item 3).

   FOUNDER DECISION 3 — Recommended (pending founder confirmation): promote
   the signup, once email works. With 0 subscribers the reminders reach no
   one unless voters are pointed at them, and the only signup lived at the
   bottom of the "Your races" view.

   The home page renders this only while reminderPromotionLive() is true
   (src/lib/notifications/config.ts): delivery configured, reminders not
   paused, and PROMOTE_REMINDER_SIGNUP on. Flip that constant to false to
   take it off the home page; nothing else changes.

   It is the same VotingInfo form as the races view — same consent line,
   same route, same one subscription — with a heading that leads with the
   reminders, because that is what a voter on the home page has not been
   offered anywhere else. remindersOn is always true here: the card renders
   only while reminders are not paused. The welcome email links to the
   county's precinct lookup rather than naming a polling place, so the
   intro says exactly that. The ZIP limit is said up front so a voter
   outside the four counties is not left to discover it from an error.

   countyFips is the saved district's county, when there is one, so the
   card's calendar link gives that county's dates, the same file the
   deadline banner above it links (0043: early voting Oct 19 to Nov 1). */
export const REMINDER_SIGNUP_ID = "reminders";

export function ReminderSignupCta({ countyFips }: { countyFips?: string }) {
  return (
    <section
      id={REMINDER_SIGNUP_ID}
      aria-label="Deadline reminders by email"
      className="flex flex-col gap-2 border-t border-border pt-6"
    >
      <VotingInfo
        emailEnabled
        remindersOn
        countyFips={countyFips}
        heading="Get deadline reminders by email"
        intro="A short email as each remaining deadline comes up, through Election Day: dates and official links only, never candidates or news. First, right away: the official link to look up your polling place."
      />
      <p className="text-caption text-on-surface-muted">
        For ZIP codes in {coveredCountyNames()} counties for now.
      </p>
    </section>
  );
}
