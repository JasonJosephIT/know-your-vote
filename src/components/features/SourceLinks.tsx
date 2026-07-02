import type { Source } from "@/types/schema";

/* Every rendered claim carries its receipts (FR-004). */
export function SourceLinks({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <span className="font-mono text-mono text-on-surface-muted">
      {sources.map((s, i) => (
        <span key={s.source_id}>
          {i === 0 ? "Source: " : " · "}
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-on-surface"
          >
            {s.publisher}
          </a>
        </span>
      ))}
    </span>
  );
}
