import type { MetadataRoute } from "next";
import { createAnonServerClient } from "@/lib/supabase/server";
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import { listElectionOffices } from "@/lib/election-office";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://know-your-vote-chazak.vercel.app";

/* Published races and their candidates only — RLS guarantees the query can't
   see anything else (TASK-048). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/candidates`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/where-i-stand`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/news`, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    /* Statewide, unlike everything above it — the county office pages cover
       all 67 counties, not just the four with race coverage, and each is the
       page a "<county> County election office" search should find. Static
       data, so they belong in the list that survives a database outage. */
    { url: `${BASE}/election-office`, changeFrequency: "monthly", priority: 0.7 },
    ...listElectionOffices().map((o) => ({
      url: `${BASE}/election-office/${o.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  try {
    const supabase = await createAnonServerClient();
    const [races, profiles] = await Promise.all([
      supabase.from("race").select("race_id").eq("election", ACTIVE_ELECTION_KIND),
      supabase.from("profile").select("candidate_id"),
    ]);
    return [
      ...staticPages,
      ...(races.data ?? []).map((r) => ({
        url: `${BASE}/races/${r.race_id}`,
        changeFrequency: "daily" as const,
        priority: 0.9,
      })),
      ...(profiles.data ?? []).map((p) => ({
        url: `${BASE}/candidates/${p.candidate_id}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticPages;
  }
}
