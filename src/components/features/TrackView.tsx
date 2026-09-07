"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/* Fires one funnel event once per render — aggregate only, no identifiers
   (PRD § 12).

   Generalized from TrackBriefView in TASK-071, which needed a second one for
   ballot_viewed. Two twelve-line copies of the same effect would have invited
   a third; the event name is the only thing that ever differed. */
export function TrackView({ event }: { event: AnalyticsEvent }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
