import Link from "next/link";
import { unstable_cache } from "next/cache";
import { NewsStoryCard } from "@/components/features/NewsStoryCard";
import { createAnonServerClient } from "@/lib/supabase/server";
import { dedupeByUrl } from "@/lib/news-feed";
import { formatNewsDate } from "@/lib/format";
import { outletForUrl } from "@/lib/news-sources";
import type { NewsSource } from "@/lib/news-labels";
import type { NewsItemType } from "@/types/app";

/* The home page's news block (inspiration pass 2026-10-05, draft): the
   newest few STATEWIDE items, so a first-time visitor sees the feed exists
   without leaving the ballot.

   Statewide only, the same scope /api/news gives with no county (race,
   metro and county all null). That keeps it clear of news-fairness.md §2:
   no candidate-scoped row can appear here, so there is no per-candidate slot
   count for this block to get wrong.

   No lean on these cards, for the same reason as everywhere else
   (news-fairness.md §1, amended 2026-09-19): NewsStoryCard has no lean field,
   and lean is disclosed on each outlet's page, linked below as "Where the
   news comes from". Server component, cached for 15 minutes, and silent on
   failure: the ballot is the page, this is a pointer. */

const SHOW = 3;

type Row = {
  id: string;
  item_type: NewsItemType;
  title: string;
  url: string | null;
  published_at: string;
  image_url: string | null;
  source: NewsSource | NewsSource[] | null;
};

const latestStatewide = unstable_cache(
  async (): Promise<Row[]> => {
    const supabase = await createAnonServerClient();
    const { data, error } = await supabase
      .from("news_item")
      .select("id, item_type, title, url, published_at, image_url, source(publisher, type, lean_tag)")
      .is("race_id", null)
      .is("metro", null)
      .is("county_fips", null)
      .order("published_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return (data ?? []) as unknown as Row[];
  },
  ["home-news-statewide"],
  { revalidate: 900, tags: ["news"] }
);

export async function HomeNews() {
  let rows: Row[];
  try {
    rows = await latestStatewide();
  } catch {
    return null;
  }
  const items = dedupeByUrl(
    rows.map((r) => ({ ...r, candidateId: null, publishedAt: r.published_at }))
  ).slice(0, SHOW);
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="home-news"
      className="flex flex-col gap-3 border-t border-border pt-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="home-news" className="text-h3">
          Latest election news
        </h2>
        <p className="text-caption text-on-surface-muted">
          Statewide stories and official notices, newest first. No hot takes.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((i) => {
          const source = Array.isArray(i.source) ? (i.source[0] ?? null) : i.source;
          return (
            <li key={i.id}>
              <NewsStoryCard
                title={i.title}
                url={i.url}
                imageUrl={i.image_url}
                source={source}
                outletDomain={i.url ? (outletForUrl(i.url)?.domain ?? null) : null}
                dateLabel={formatNewsDate(i.published_at)}
                kindFallback={
                  i.item_type === "official_link"
                    ? "Official resource"
                    : i.item_type === "pipeline_event"
                      ? "Update"
                      : null
                }
              />
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
        <Link
          href="/news"
          className="inline-flex min-h-[24px] items-center text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          All election news
        </Link>
        <Link
          href="/news/outlet"
          className="inline-flex min-h-[24px] items-center text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
        >
          Where the news comes from
        </Link>
      </p>
    </section>
  );
}
