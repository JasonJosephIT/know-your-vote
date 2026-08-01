import { formatRelativeTime } from "@/lib/admin/datetime";

/* The Vercel/Sentry panels are cached ~60s (design.md § 5), so their data is
   stale by design. This caption states that honestly — the operator sees how
   old the snapshot is instead of assuming it is live. */
export function AsOf({ iso }: { iso: string }) {
  return (
    <time
      dateTime={iso}
      title={`Cached ~60s — fetched ${iso}`}
      className="shrink-0 text-caption text-on-surface-muted"
    >
      as of {formatRelativeTime(iso)}
    </time>
  );
}
