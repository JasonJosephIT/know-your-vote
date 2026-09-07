import "server-only";

/* Compact relative-time for console captions ("3h ago", "just now", "in 2d").
   The console shows "when did this run / when was this verified" everywhere; a
   shared formatter keeps that phrasing identical across panels, cards, and the
   log. Lives in the admin lib (not the shared src/lib/format.ts) so the two
   planes' formatting stays independently owned. `now` is injectable for tests. */
export function relativeTime(
  iso: string | null | undefined,
  now: number = Date.now()
): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const diffMs = now - then;
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  if (abs < 45 * 1000) return "just now";

  let value: number;
  let unit: string;
  if (abs < HOUR) {
    value = Math.round(abs / MIN);
    unit = "m";
  } else if (abs < DAY) {
    value = Math.round(abs / HOUR);
    unit = "h";
  } else {
    value = Math.round(abs / DAY);
    unit = "d";
  }

  return future ? `in ${value}${unit}` : `${value}${unit} ago`;
}

/* Age of a heartbeat in whole hours, or null when there is no heartbeat yet.
   Used by the health strip / pipeline panel to decide the "cron Nh ago" copy
   and whether it has crossed the staleness threshold. */
export function ageHours(
  iso: string | null | undefined,
  now: number = Date.now()
): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, (now - then) / 3_600_000);
}
