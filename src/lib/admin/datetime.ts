/* Compact "time ago" for the operator console — deploy/issue ages and the
   "as of" freshness caption on the ~60s-cached Site panels. Small clock skew
   (a fetchedAt a second into the future) clamps to "just now" rather than
   printing a negative age; anything older than a week falls back to a date.
   Lives in the admin tree (not the voter-app src/lib/format) so Phase A5 owns
   it cleanly — the panels still consume safeHttpUrl from the shared helper. */
export function formatRelativeTime(value: string | number | Date): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "unknown";

  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day <= 7) return `${day}d ago`;

  return new Date(then).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
