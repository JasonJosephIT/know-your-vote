import "server-only";

import { unstable_cache } from "next/cache";
import { ACTIVE_ELECTION } from "@/lib/election";
import {
  verifiedElectionEvents,
  type ElectionEvent,
} from "@/lib/notifications/election-events";
import { createServiceClient } from "@/lib/supabase/service";

/* Every verified date for the active election, statewide and county
   (0043). This used to come from getPublicElectionDates (src/lib/
   election-dates.ts, removed 2026-10-04 once nothing else read it), which
   kept only the registration deadline and Election Day — not enough to
   roll forward to the vote-by-mail and early-voting dates. Same hour-long
   cache, same "election-dates" tag, so a correction still revalidates it.
   The key changed with the county rows, so no entry cached before them
   (statewide rows only) is served after.

   createServiceClient throws without the service-role key (src/lib/
   server-keys.ts), inside the cache, so a missing key is never cached as
   "no dates": the banner appears on the first request after the key is
   readable rather than up to an hour later.

   Moved here from DeadlineBanner (layout pass 2026-10-11) so the home
   masthead reads the same cached entry; the key is unchanged. */
const cachedEvents = unstable_cache(
  async (): Promise<ElectionEvent[]> =>
    verifiedElectionEvents(createServiceClient(), ACTIVE_ELECTION),
  ["deadline-banner-events-by-county", ACTIVE_ELECTION],
  { revalidate: 3600, tags: ["election-dates"] }
);

/* [] on any failure: no verified dates means no banner and no masthead
   date line, never a guessed date. */
export async function homeElectionEvents(): Promise<ElectionEvent[]> {
  try {
    return await cachedEvents();
  } catch {
    return [];
  }
}
