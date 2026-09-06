import "server-only";

import { unstable_cache } from "next/cache";
import { verifiedStatewideEvents } from "@/lib/notifications/election-events";
import { createServiceClient } from "@/lib/supabase/service";
import { ACTIVE_ELECTION } from "@/lib/election";

/* Verified statewide dates for the active election, for public surfaces
   (TASK-064).

   election_event is deliberately not anon-readable (0007) — the app reads it
   through the service role so unverified rows can never leak to a page. Only
   rows a human has checked against the Division of Elections are returned;
   verifiedStatewideEvents enforces that, and until TASK-058 flips them this
   returns nothing.

   Degrades to null rather than throwing: with SUPABASE_SERVICE_ROLE_KEY
   unset, or the read failing, callers render no dates instead of an error
   (§0.7 graceful no-op). */

export type PublicElectionDates = {
  registrationDeadline?: string;
  electionDay?: string;
  calendarUrl: string;
};

async function fetchPublicElectionDates(): Promise<PublicElectionDates | null> {
  let service;
  try {
    service = createServiceClient();
  } catch {
    return null;
  }

  const events = await verifiedStatewideEvents(service, ACTIVE_ELECTION);
  if (events.length === 0) return null;

  const byType = new Map(events.map((e) => [e.event_type, e.event_date]));
  const registrationDeadline = byType.get("registration_deadline");
  const electionDay = byType.get("election_day");
  if (!registrationDeadline && !electionDay) return null;

  return {
    registrationDeadline,
    electionDay,
    calendarUrl: `/api/calendar/${ACTIVE_ELECTION}.ics`,
  };
}

/* Cached: once verified, these dates change ~never, and the landing page
   should not hit the database per visit. Tagged so a correction can
   revalidate it. */
export function getPublicElectionDates() {
  return unstable_cache(
    fetchPublicElectionDates,
    ["public-election-dates", ACTIVE_ELECTION],
    { revalidate: 3600, tags: ["election-dates"] }
  )();
}
