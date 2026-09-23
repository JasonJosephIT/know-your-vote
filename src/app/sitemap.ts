import type { MetadataRoute } from "next";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://know-your-vote-chazak.vercel.app";

/* Visible races and their candidates only — RLS guarantees the query can't
   see anything else (TASK-048). Visible is `listed` or `published` since
   0033, and both render a real page: the full brief, or the roster listing.

   Candidates come from `race.candidate_ids`, not `profile`: profiles are
   brief content and exist only for published races, so reading them would
   leave every listed candidate's page out of the sitemap. candidate_ids is
   the ballot order itself (ballot-tier only, data-architecture D1), and the
   candidate page is reachable exactly for those ids. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/candidates`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/where-i-stand`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/news`, changeFrequency: "daily", priority: 0.6 },
    /* The outlet index is static (it reads the OUTLETS list, not the
       database), so it belongs with the static pages. */
    { url: `${BASE}/news/outlet`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const supabase = await createAnonServerClient();
    const races = await supabase
      .from("race")
      .select("race_id, candidate_ids")
      .eq("election", ACTIVE_ELECTION_KIND);
    const candidateIds = [
      ...new Set(
        (races.data ?? []).flatMap((r) => (r.candidate_ids ?? []) as string[])
      ),
    ];
    return [
      ...staticPages,
      ...(races.data ?? []).map((r) => ({
        url: `${BASE}/races/${r.race_id}`,
        changeFrequency: "daily" as const,
        priority: 0.9,
      })),
      ...candidateIds.map((candidateId) => ({
        url: `${BASE}/candidates/${candidateId}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticPages;
  }
}
