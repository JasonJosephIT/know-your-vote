import Link from "next/link";
import {
  pickHref,
  pickSummary,
  togglePickHref,
  type SpineOption,
} from "@/lib/issue-pick";
import { CheckGlyph } from "@/components/ui/Glyphs";

/* Chips for the race's spine issues. Each one is a plain link that adds or
   removes that issue in the URL, so there is no client state, nothing is
   stored, and a filtered view can be shared.

   "All issues" is the first chip and is always there (Mobbin catalog RC2,
   2026-10-12), so the default state has a visibly selected option; it
   replaced a "Show everything" link that appeared only after a pick, at
   the end of the row. The line under the chips says in words what the page
   shows. No role="status" on it: every change is a full page load. The
   chip fill changes colour at motion.fast and not at all under reduced
   motion; nothing else moves. */
const chip = (on: boolean) =>
  `inline-flex items-center gap-1 rounded-full px-4 py-2 text-caption transition-colors motion-reduce:transition-none ${
    on
      ? "bg-primary-muted text-primary-hover"
      : "bg-surface-muted text-on-surface-muted hover:text-on-surface"
  }`;

export function IssueFilter({
  raceId,
  options,
  selected,
}: {
  raceId: string;
  options: SpineOption[];
  selected: string[];
}) {
  if (options.length === 0) return null;
  const available = options.map((o) => o.id);
  const all = selected.length === 0;
  return (
    <nav aria-label="Compare on issues" className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">
        Compare what each candidate says on:
      </p>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={pickHref(raceId, [])}
            aria-current={all ? "true" : undefined}
            className={chip(all)}
          >
            {all && (
              <>
                <CheckGlyph />
                <span className="sr-only">(selected) </span>
              </>
            )}
            All issues
          </Link>
        </li>
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <li key={o.id}>
              <Link
                href={togglePickHref(raceId, selected, o.id, available)}
                aria-current={on ? "true" : undefined}
                className={chip(on)}
              >
                {on && (
                  <>
                    <CheckGlyph />
                    <span className="sr-only">(selected, select to remove) </span>
                  </>
                )}
                {o.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-body-sm text-on-surface-muted">
        {pickSummary(options, selected)}
      </p>
    </nav>
  );
}
