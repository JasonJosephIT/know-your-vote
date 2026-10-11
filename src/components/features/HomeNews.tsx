import { unstable_cache } from "next/cache";
import { NewsRail, type RailItem } from "@/components/features/NewsRail";
import { createAnonServerClient } from "@/lib/supabase/server";
import { dedupeByUrl } from "@/lib/news-feed";
import { outletForUrl } from "@/lib/news-sources";
import { newsRegion, regionOrder } from "@/lib/news-region";
import { coveredCounty } from "@/lib/counties";
import type { NewsSource } from "@/lib/news-labels";
import type { NewsItemType } from "@/types/app";

/* The home page's news column (layout pass 2026-10-11, item 6; it began as
   a three-story block in the inspiration pass of 2026-10-05).

   Statewide AND county stories now (founder, 2026-10-11), newest first,
   with a filter by region. Still no candidate and no race: /admin can
   write a candidate_news row with only a candidate set, and one
   candidate's story on the home page would skip news-fairness.md §2's
   equal slots; a race-scoped row is about that race's candidates for the
   same reason. The query enforces both, rather than this comment assuming
   them.

   Order is time and nothing else. No story is picked as "top"; when one
   county has more coverage than another, the column shows that, as the
   world made it (AGENTS.md, Neutrality).

   Only the last 45 days: the oldest county rows are notices about the
   August primary, and a column that leads a region with a primary notice
   in October is wrong in a way a shorter list is not.

   Dates are formatted in Florida's time zone. This renders on the server
   (UTC on Vercel), and a story from 9 p.m. Eastern would otherwise show
   tomorrow's date here and today's on /news, which formats in the reader's
   own zone.

   No lean on these rows, for the same reason as everywhere else
   (news-fairness.md §1, amended 2026-09-19): NewsStoryCard has no lean
   field, and lean is disclosed on each outlet's page, linked below as
   "Where the news comes from". Server-rendered and cached for 15 minutes;
   silent on failure: the ballot is the page, this is a pointer. */

const FETCH = 60;
const MAX_AGE_DAYS = 45;

/* formatNewsDate's format, pinned to Florida's zone (see above). */
function floridaDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

type Row = {
  id: string;
  item_type: NewsItemType;
  title: string;
  url: string | null;
  published_at: string;
  image_url: string | null;
  metro: string | null;
  county_fips: string | null;
  source: NewsSource | NewsSource[] | null;
};

const latestRegional = unstable_cache(
  async (): Promise<Row[]> => {
    const supabase = await createAnonServerClient();
    const since = new Date(
      Date.now() - MAX_AGE_DAYS * 86_400_000
    ).toISOString();
    const { data, error } = await supabase
      .from("news_item")
      .select(
        "id, item_type, title, url, published_at, image_url, metro, county_fips, source(publisher, type, lean_tag)"
      )
      .is("race_id", null)
      .is("candidate_id", null)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(FETCH);
    if (error) throw error;
    return (data ?? []) as unknown as Row[];
  },
  ["home-news-regional"],
  { revalidate: 900, tags: ["news"] }
);

export async function HomeNews({
  countyFips,
}: {
  /** The saved district's county: the filter opens on it when it has stories. */
  countyFips?: string | null;
}) {
  let rows: Row[];
  try {
    rows = await latestRegional();
  } catch {
    return null;
  }

  const items: RailItem[] = [];
  for (const r of dedupeByUrl(
    rows.map((r) => ({ ...r, candidateId: null, publishedAt: r.published_at }))
  )) {
    const region = newsRegion(r);
    if (!region) continue;
    const source = Array.isArray(r.source) ? (r.source[0] ?? null) : r.source;
    items.push({
      id: r.id,
      region,
      title: r.title,
      url: r.url,
      imageUrl: r.image_url,
      source,
      outletDomain: r.url ? (outletForUrl(r.url)?.domain ?? null) : null,
      dateLabel: floridaDate(r.published_at),
      kindFallback:
        r.item_type === "official_link"
          ? "Official resource"
          : r.item_type === "pipeline_event"
            ? "Update"
            : null,
    });
  }
  if (items.length === 0) return null;

  const regions = regionOrder(items.map((i) => i.region));
  /* Open on the reader's own county only when it is one we cover and it
     has a story; otherwise all of Florida. */
  const initial =
    countyFips &&
    coveredCounty(countyFips) &&
    regions.some((r) => r.key === countyFips)
      ? countyFips
      : "all";

  return <NewsRail items={items} regions={regions} initial={initial} />;
}
