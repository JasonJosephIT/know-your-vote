import type { MetadataRoute } from "next";
import { createAnonServerClient } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://know-your-vote-chazak.vercel.app";

/* Published races and their candidates only — RLS guarantees the query can't
   see anything else (TASK-048). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/races`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/find-my-candidates`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/news`, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const supabase = await createAnonServerClient();
    const [races, profiles] = await Promise.all([
      supabase.from("race").select("race_id"),
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
