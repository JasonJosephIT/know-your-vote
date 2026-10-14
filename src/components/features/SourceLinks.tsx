import type { Source } from "@/types/schema";
import { sourceLine } from "@/lib/source-line";

/* Every rendered claim carries its receipts (FR-004).

   One line per source (catalog CP3): the publisher, then what kind of source
   it is and when we read it, "Source: janedoe.com · Campaign website ·
   retrieved Sep 29, 2026". The words and the rules (nothing the row doesn't
   hold, the same weight for every type, no lean, http(s) urls only) live in
   src/lib/source-line.ts. Each part is its own flex item, so a narrow
   race-page cell wraps between parts and the dot stays with what follows
   it. The link is at least 24px tall (WCAG 2.5.8). */
export function SourceLinks({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <span className="flex flex-col font-mono text-mono text-on-surface-muted">
      {sources.map((s, i) => {
        const line = sourceLine(s);
        return (
          <span
            key={s.source_id}
            className="flex flex-wrap items-center gap-x-2"
          >
            {i === 0 && <span>{sources.length > 1 ? "Sources:" : "Source:"}</span>}
            {line.href ? (
              <a
                href={line.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
              >
                {line.publisher}
                <span className="sr-only">
                  {line.host ? `, ${line.host}` : ""} (opens in a new tab)
                </span>
              </a>
            ) : (
              <span>{line.publisher}</span>
            )}
            {line.typeLabel && <span>· {line.typeLabel}</span>}
            {line.retrieved && (
              <span>
                · retrieved{" "}
                <time dateTime={line.retrieved.iso}>{line.retrieved.label}</time>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
