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
   the database on every request.

   Visible is no longer the same as published (0033). RLS now returns a race
   at either `listed` (the roster: who is on the ballot) or `published` (the
   audited brief), and the card has to say which — a listed race presented as
   a brief would promise a comparison that does not exist yet. So the status
   is read, not assumed: see raceStatusOf. */

/* The status a visible race row carries, from its `race_publication(status)`
   embed. Shared with resolve.ts so every race list derives it one way.

   PostgREST returns this to-one embed as an object, but some relationship
   shapes return a one-element array (same caveat as briefs.ts
   fetchCandidateNews); both are normalized. Anything that is not exactly
   'published' — a missing embed, a null, a cached row from before 0033 —
   is `listed`, the weaker claim: the worst this can do is undersell an
   audited brief, never oversell an unaudited one. */
export function raceStatusOf(
  embed: unknown
): NonNullable<ResolveRaceSummary["status"]> {
  const row = (Array.isArray(embed) ? embed[0] : embed) as
    { status?: unknown } | null | undefined;
  return row?.status === "published" ? "published" : "listed";
}

/* The one line every race card carries to say what is behind the link: an
   audited brief, or (at `listed`) the roster alone. Kept here so the landing
   page, Your races and the county list word it identically. Never
   "published" for a listed race (listed-tier brief). */
export function raceStatusLabel(status: ResolveRaceSummary["status"]): string {
  return status === "published"
    ? "Full brief"
    : "Names on the ballot · brief in review";
}

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
    .select(
      "race_id, office, level, district, key_dates, race_publication(status)"
    )
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
  return (data ?? []).map((r) => {
    const status = raceStatusOf(r.race_publication);
    return {
      raceId: r.race_id,
      office: r.office,
      level: r.level,
      district: r.district,
      /* Kept for callers that predate `status`; derived from it so the two
         can never disagree. */
      published: status === "published",
      status,
      generalDate:
        (r.key_dates as Record<string, string> | null)?.general_date ?? null,
    };
  });
}

export function getStatewideRaces() {
  return unstable_cache(
    fetchStatewideRaces,
    /* v2: the shape gained `status` (0033). A new key rather than trusting
       old entries to age out, although an old entry would still be read
       safely — a missing status is `listed`. */
    ["statewide-races", "v2", ACTIVE_ELECTION_KIND],
    { revalidate: 3600, tags: ["races"] }
  )();
}
