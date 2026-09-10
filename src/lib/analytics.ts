/* Plausible custom events — aggregate funnel only, never identifiers
   (PRD § 12: no ZIP values, no emails, no user ids in properties). */

/* Funnel order, and it changed in Phase 7 (TASK-071).

   zip_resolved used to be the entry event, because entering a ZIP was the
   only way into the product. It no longer is: the ballot renders first and a
   ZIP is optional, so zip_resolved now measures how many voters want their
   district race — a much smaller number by design. Without ballot_viewed
   above it, the day this ships the funnel reads as a cliff-edge collapse
   rather than a gate coming down.

   Comparisons across the ship date are misleading either way. The two events
   count different things before and after, and no renaming fixes that; the
   honest reading is a new funnel starting at ballot_viewed. */
/* district_set fires whenever the voter establishes a district -- by address, by
   ZIP, or from the picker. Its only prop is which of those three it was: a
   method label, never a location. PRD § 12 forbids ZIP values in properties and
   an address would be far worse. */
export type AnalyticsEvent =
  | "ballot_viewed"
  | "zip_resolved"
  | "district_set"
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
