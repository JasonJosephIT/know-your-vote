"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/* Fires the brief_viewed funnel event once per brief render — aggregate
   only, no identifiers (PRD § 12). */
export function TrackBriefView() {
  useEffect(() => {
    track("brief_viewed");
  }, []);
  return null;
}
