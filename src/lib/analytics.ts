/* Plausible custom events — aggregate funnel only, never identifiers
   (PRD § 12: no ZIP values, no emails, no user ids in properties). */

/* Funnel order, and it changed in Phase 7 (TASK-071).

   zip_resolved used to be the entry event, because entering a ZIP was the
   only way into the product. Then the ballot moved in front of the ZIP, and
   ballot_viewed became the entry event. zip_resolved went with the ZIP
   option itself (2026-10-12): the field takes only an address now, so
   district_set below is the one district event.

   Comparisons across either ship date are misleading. The events count
   different things before and after, and no renaming fixes that; the
   honest reading is a funnel starting at ballot_viewed. */
/* district_set fires whenever the voter establishes a district -- by address
   or from the picker. Its only prop is which of those two it was: a method
   label, never a location. PRD § 12 forbids ZIP values in properties and an
   address would be far worse. */
export type AnalyticsEvent =
  | "ballot_viewed"
  | "district_set"
  | "brief_viewed"
  | "candidate_saved"
  | "voting_info_requested"
  /* /civics: every quiz question marked, and the stay-informed signup
     accepted. Neither carries props: never the score, the email or the
     county. */
  | "civics_done"
  | "updates_signed_up";

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
