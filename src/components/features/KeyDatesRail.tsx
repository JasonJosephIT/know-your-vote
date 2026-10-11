import type { KeyDateStop, StopState } from "@/lib/notifications/key-dates";

/* The key-dates rail (layout pass 2026-10-11, item 2): the election's dates
   as one line of stops, with the reader's place on it. Stops come from
   keyDateStops (src/lib/notifications/key-dates.ts); this only draws them.

   A row of stops at sm and up, a column below that, where "October 24 to
   October 31" would not fit five across. An ordered list, so a screen
   reader hears the dates in order, and each state is said in words, not
   only in the dot's colour (WCAG 1.4.1). Terracotta marks today and sage
   the next date, never red or green: nothing here is a verdict. */

const STATE_WORDS: Record<StopState, string | null> = {
  past: "passed",
  today: "today",
  open: "open now",
  next: "next",
  later: null,
};

const DOT: Record<StopState, string> = {
  past: "border-on-surface-muted bg-on-surface-muted",
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
        const words = STATE_WORDS[s.state];
        return (
          <li
            key={s.key}
            className={[
              "relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center",
              /* The line between stops: a short vertical segment above each
                 stop in the column, a horizontal one to its left in the row.
                 Dark up to the reader's place, light after it. */
              i === 0
                ? ""
                : [
                    "before:absolute before:content-['']",
                    "before:top-[-12px] before:left-[7px] before:h-3 before:w-0.5",
                    "sm:before:top-[7px] sm:before:right-1/2 sm:before:left-[-50%] sm:before:h-0.5 sm:before:w-auto",
                    s.state === "past" ||
                    s.state === "today" ||
                    s.state === "open"
                      ? "before:bg-on-surface-muted"
                      : "before:bg-border-strong",
                  ].join(" "),
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={`relative z-[1] mt-0.5 size-4 shrink-0 rounded-full border-2 sm:mt-0 ${DOT[s.state]}`}
            />
            <span className="flex flex-col">
              <span className={`text-caption font-semibold ${LABEL[s.state]}`}>
                {s.state === "open" ? `${s.label}: open now` : s.label}
              </span>
              <span className="text-caption text-on-surface-muted">
                {s.when}
                {words && s.state !== "open" && s.key !== "today" && (
                  <span className="sr-only"> ({words})</span>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
