import Link from "next/link";
import { pickHref, togglePickHref, type SpineOption } from "@/lib/issue-pick";

/* Chips for the race's spine issues. Each one is a plain link that adds or
   removes that issue in the URL, so there is no client state, nothing is
   stored, and a filtered view can be shared. */
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
  return (
    <nav aria-label="Compare on issues" className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">
        Compare what each candidate says on:
      </p>
      <ul className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <li key={o.id}>
              <Link
                href={togglePickHref(raceId, selected, o.id, available)}
                aria-current={on ? "true" : undefined}
                className={`inline-block rounded-full px-4 py-2 text-caption transition-colors ${
                  on
                    ? "bg-primary-muted text-primary-hover"
                    : "bg-surface-muted text-on-surface-muted hover:text-on-surface"
                }`}
              >
                {o.title}
              </Link>
            </li>
          );
        })}
        {selected.length > 0 && (
          <li>
            <Link
              href={pickHref(raceId, [])}
              className="inline-block px-2 py-2 text-caption text-primary underline underline-offset-2"
            >
              Show everything
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
