import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import type { ResolveRaceSummary } from "@/types/app";

/* Location-free read of the races every Florida voter shares (TASK-067).

   This is deliberately NOT in resolve.ts, for the same reason BallotQuestions
   is not in ResolveResult (TASK-063): resolve.ts answers "what does this ZIP
   get", and a statewide race is the answer to a question nobody asked with a
   ZIP. Threading it through a location lookup would couple location-free data
   to a location query — and the landing page has no location to give.

   Statewide is `district IS NULL`. In the 2026 general that is Governor,
   U.S. Senate, Attorney General, CFO, and Commissioner of Agriculture: five
   of the ballot's six candidate races. Only the U.S. House race needs a ZIP.

   Cached like measures.ts: the race set changes when the pipeline publishes,
   not per visit, so the landing page stays prerendered rather than hitting
   the database on every request. RLS still filters unpublished races, so
   `published: true` is a fact about what came back, not an assumption. */

export type StatewideRace = ResolveRaceSummary & {
  /* From race.key_dates, so the card can name the election day without a
     second query per race (which is what YourRaces still does for the
     district path). */
  generalDate: string | null;
};

async function fetchStatewideRaces(): Promise<StatewideRace[]> {
  let supabase;
  try {
    supabase = await createAnonServerClient();
  } catch {
    /* createAnonServerClient throws outright when NEXT_PUBLIC_SUPABASE_URL or
       the anon key is missing. That is a build-time concern now that this
       read feeds a prerendered page: without this catch, a checkout with no
       .env cannot `next build` at all, and a misconfigured deploy fails the
       build rather than the request. Same shape as election-dates.ts around
       createServiceClient, and as sitemap.ts around this same client. */
    return [];
  }
  const { data, error } = await supabase
    .from("race")
    .select("race_id, office, level, district, key_dates")
    .eq("election", ACTIVE_ELECTION_KIND)
    .is("district", null)
    /* Same ordering as the district path in resolve.ts, so the landing page
       and /candidates?view=races never disagree about what comes first. */
    .order("level", { ascending: false })
    .order("race_id");
  /* Degrades rather than throws (§0.7). This read sits on the landing page,
     which is the one surface that must never show an error: an unreachable
     database costs a voter the shared ballot, and throwing would cost them
     the page. The empty result renders the "not published yet" copy, which is
     indistinguishable from an outage here — an honest limit of degrading, and
     the better of the two failures. */
  if (error) return [];
  return (data ?? []).map((r) => ({
    raceId: r.race_id,
    office: r.office,
    level: r.level,
    district: r.district,
    published: true,
    generalDate:
      (r.key_dates as Record<string, string> | null)?.general_date ?? null,
  }));
}

export function getStatewideRaces() {
  return unstable_cache(
    fetchStatewideRaces,
    ["statewide-races", ACTIVE_ELECTION_KIND],
    { revalidate: 3600, tags: ["races"] }
  )();
}
