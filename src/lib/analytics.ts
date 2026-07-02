/* Plausible custom events — aggregate funnel only, never identifiers
   (PRD § 12: no ZIP values, no emails, no user ids in properties). */

export type AnalyticsEvent =
  | "zip_resolved"
  | "brief_viewed"
  | "quiz_completed"
  | "candidate_saved"
  | "voting_info_requested";

type PlausibleFn = ((
  event: string,
  opts?: { props?: Record<string, string | number | boolean> }
) => void) & { q?: unknown[] };

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;
  /* Official queue shim: events fired before the script loads are queued. */
  if (!window.plausible) {
    const queued: PlausibleFn = (...args) => {
      (queued.q = queued.q || []).push(args);
    };
    window.plausible = queued;
  }
  window.plausible(event, props ? { props } : undefined);
}
