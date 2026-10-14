import { CheckGlyph } from "@/components/ui/Glyphs";
import {
  stopText,
  type KeyDateStop,
  type StopState,
} from "@/lib/notifications/key-dates";

/* The key-dates rail (layout pass 2026-10-11, item 2): the election's dates
   as one line of stops, with the reader's place on it. Stops come from
   keyDateStops (src/lib/notifications/key-dates.ts); this only draws them.

   A row of stops at sm and up, a column below that, where "October 24 to
   October 31" would not fit five across. An ordered list, so a screen
   reader hears the dates in order.

   Each state reads three ways, so none rests on colour (WCAG 1.4.1;
   catalog HM1, 2026-10-12): a visible word after the date ("Passed",
   "Today", "Next"; stopText), the dot's shape (a check in a passed date, a
   halo round today, a hollow ring ahead) and its colour. Terracotta marks
   today and sage the next date, never red or green, and the check stays
   grey: nothing here is a verdict. Nothing moves, fills or pulses, and
   every date is stated, never counted. */

const DOT: Record<StopState, string> = {
  past: "border-on-surface-muted bg-on-surface-muted text-[10px] text-surface",
  today: "border-accent bg-accent ring-4 ring-accent-muted",
  open: "border-accent bg-accent ring-4 ring-accent-muted",
  next: "border-primary bg-surface",
  later: "border-border-strong bg-surface",
};

const LABEL: Record<StopState, string> = {
  past: "text-on-surface-muted",
  today: "text-accent-strong",
  open: "text-accent-strong",
  next: "text-primary",
  later: "text-on-surface",
};

export function KeyDatesRail({ stops }: { stops: KeyDateStop[] }) {
  return (
    <ol className="grid gap-3 sm:auto-cols-fr sm:grid-flow-col sm:gap-2">
      {stops.map((s, i) => {
        const { label, word } = stopText(s);
        const following = stops[i + 1];
        return (
          <li
            key={s.key}
            className={[
              "relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center",
              /* The line to the next stop, one segment per gap, from this
                 dot's centre to the next dot's centre so the stops read as
                 one line (catalog HM8). In the column it starts 10px down
                 (the dot's 2px margin and half its 16px) and ends 22px
                 below this stop: the list's 12px gap, then the next dot's
                 own 10px. Both ends sit under a dot, so a stop's height,
                 one line or two, never breaks it. In the row it runs right
                 to the next dot. Dark up to the reader's place, light
                 after it. */
              following
                ? [
                    "after:absolute after:content-['']",
                    "after:top-[10px] after:bottom-[-22px] after:left-[7px] after:w-0.5",
                    "sm:after:top-[7px] sm:after:right-[-50%] sm:after:bottom-auto sm:after:left-1/2 sm:after:h-0.5 sm:after:w-auto",
                    following.state === "past" ||
                    following.state === "today" ||
                    following.state === "open"
                      ? "after:bg-on-surface-muted"
                      : "after:bg-border-strong",
                  ].join(" ")
                : "",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={`relative z-[1] mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 sm:mt-0 ${DOT[s.state]}`}
            >
              {s.state === "past" && <CheckGlyph />}
            </span>
            <span className="flex flex-col">
              <span className={`text-caption font-semibold ${LABEL[s.state]}`}>
                {label}
              </span>
              {/* The state word, 14px (body-sm): a voter reads it to know
                  which date to act on, and Next is semibold too. It follows
                  the date on its line in the column ("October 22 · Next")
                  and takes a line of its own under the date in the row.
                  The space stays outside the hidden dot, so a screen reader
                  hears "October 22 Next", not "October 22Next". */}
              <span>
                <span className="text-caption text-on-surface-muted">
                  {s.when}
                </span>
                {word && (
                  <span
                    className={`text-body-sm sm:block ${LABEL[s.state]}${s.state === "next" ? " font-semibold" : ""}`}
                  >
                    {" "}
                    <span
                      aria-hidden="true"
                      className="text-on-surface-muted sm:hidden"
                    >
                      ·&nbsp;
                    </span>
                    {word}
                  </span>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
