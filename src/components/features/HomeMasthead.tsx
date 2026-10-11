import { LedgeArt } from "@/components/brand/Ledge";
import { ACTIVE_ELECTION_LABEL } from "@/lib/election";
import { homeElectionEvents } from "@/lib/notifications/home-events";
import {
  mastheadDate,
  mastheadElectionDay,
} from "@/lib/notifications/key-dates";
import { easternToday } from "@/lib/notifications/schedule";

/* The home page's dateline (layout pass 2026-10-11, item 1): today's date
   and Election Day's, in a dark strip under the site nav, the way a paper
   prints its date above the fold.

   Two dates, no count. The design sample said "23 days to Election Day";
   banner.ts records why a countdown is the one thing these lines don't say
   (a cached page would serve a wrong number on a civic deadline), and the
   next deadline is stated in full in the key-dates card just below.

   Today is Florida's calendar day (easternToday), read per request: the
   home page is dynamic because it reads the district cookie. Election Day
   comes from the verified rows only, so with none (or after it has passed)
   the strip states the date alone.

   The illustration layer (design.md "Site illustration layer") adds three
   decorative pieces, none of them near the text:
   - the ink texture, tiled behind the line. It averages the on-surface
     colour it sits on (bg-on-surface stays underneath as the fallback), so
     the white text keeps its contrast;
   - a 12px halftone band under the strip, dots fading downward into the
     page. Tiny and textless, so it shows at every width;
   - a figure hanging by its hands from the strip's bottom edge, in the right
     gutter only from 1400px: left of it starts 24px past the 1120px
     container's right edge (50% + 560px), and at 1400px the 65px-wide
     figure ends ~50px short of the viewport, so it never covers page
     content or causes a sideways scroll. It hangs downward, away from the
     fixed nav (z-40), which paints over it when the page scrolls. */
export async function HomeMasthead() {
  const today = easternToday();
  const events = await homeElectionEvents();
  const electionDay = events.find(
    (e) => e.event_type === "election_day" && !e.county_fips
  );
  const showElection = electionDay && electionDay.event_date >= today;

  return (
    <>
      <div className="relative bg-on-surface bg-[url(/brand/site/textures/tex-masthead-ink.webp)] bg-repeat text-surface">
        {/* Two lines on a phone, one from sm up. The election's name and the
          dividers only appear where the line has room for them. */}
        <p className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-x-3 gap-y-0.5 px-5 py-2 text-caption">
          <span className="font-semibold">{mastheadDate(today)}</span>
          <Divider />
          <span className="hidden sm:inline">{ACTIVE_ELECTION_LABEL}</span>
          {showElection && (
            <>
              <Divider />
              <span>{mastheadElectionDay(electionDay.event_date, today)}</span>
            </>
          )}
        </p>
        <LedgeArt
          name="hang-masthead"
          height={200}
          edge="bottom"
          className="left-[calc(50%+584px)] hidden min-[1400px]:block"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none h-3 select-none bg-[url(/brand/site/textures/edge-halftone.svg)] bg-[length:auto_12px] bg-repeat-x"
      />
    </>
  );
}

function Divider() {
  return (
    <span aria-hidden="true" className="hidden opacity-50 sm:inline">
      |
    </span>
  );
}
