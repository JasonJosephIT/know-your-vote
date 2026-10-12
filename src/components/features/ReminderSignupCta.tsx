import { Art } from "@/components/brand/Art";
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
      className="relative flex flex-col gap-2 border-t border-border pt-6 lg:pt-10"
    >
      {/* The site illustration layer (design.md "Site illustration layer").
         The envelope sticker also shows on phones (it is on design.md's
         closed list of phone art). It sits across the top border, in the strip between the
         previous block and this heading, and never reaches the heading:
         tilted 6deg, a 40px sticker spans about -23px to +23px from the
         border (the grid's gap-6 above, pt-6 below); at lg the 56px one
         spans about -24px to +40px, so the padding grows to pt-10 there.
         Two sizes are two Art pieces, since Art takes a fixed px height;
         the hidden one is display:none, so its lazy image never loads. */}
      <Art
        name="sticker-envelope"
        height={40}
        className="absolute -top-5 left-0 -rotate-6 lg:hidden"
      />
      <Art
        name="sticker-envelope"
        height={56}
        className="absolute -top-5 left-0 hidden -rotate-6 lg:block"
      />
      {/* A faint corner sunburst in the opposite corner, lg+ only. The SVG
         radiates from its own top-left, so it is mirrored to start from the
         top-right. Its box is the pt-10 strip above the heading and no
         taller, so it never sits under the heading, the intro or the form,
         whose fields run the full width from sm up. Decorative: aria-hidden,
         no pointer events, a CSS background rather than an image. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 hidden h-10 w-60 -scale-x-100 select-none opacity-70 lg:block"
        style={{
          backgroundImage: "url(/brand/site/textures/corner-sunburst.svg)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left top",
          backgroundSize: "240px 240px",
        }}
      />
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
