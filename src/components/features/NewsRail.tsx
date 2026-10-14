"use client";

import Link from "next/link";
import { useState } from "react";
import { NewsStoryCard } from "@/components/features/NewsStoryCard";
import type { NewsSource } from "@/lib/news-labels";
import type { NewsRegion } from "@/lib/news-region";

/* The home page's news column, drawn (layout pass 2026-10-11, item 6).
   HomeNews reads and shapes the rows on the server; this only filters them.

   The filter is a row of toggle buttons rather than tabs: every button
   shows the same list, narrowed, so there is one region of content, not a
   tab panel per button. Without JavaScript the buttons do nothing and the
   list stays on whatever the server rendered, which is a working column.

   SHOW caps every view, "All Florida" included, so a busy county can't
   push the column longer than the ballot beside it. The cap is the same
   for every region and the order is time, so it trims by date, never by
   which region or outlet a story is from.

   Below lg the column sits in the page's one column, and PHONE_SHOW
   stories, the newest, show there (home readability, 2026-10-12, A8;
   founder decision 3a): the rest are in the list, hidden by CSS, so the
   cap is the same for every filter and "All election news" has them all.
   If the newest few look lopsided, run news-fairness.md §2 before
   touching anything here: a real skew is shown, never evened out. */

const SHOW = 8;
const PHONE_SHOW = 4;

export interface RailItem {
  id: string;
  region: NewsRegion;
  title: string;
  url: string | null;
  imageUrl: string | null;
  source: NewsSource | null;
  outletDomain: string | null;
  dateLabel: string;
  kindFallback: string | null;
}

export function NewsRail({
  items,
  regions,
  initial,
}: {
  items: RailItem[];
  regions: NewsRegion[];
  initial: string;
}) {
  const [region, setRegion] = useState(initial);
  const shown = items
    .filter((i) => region === "all" || i.region.key === region)
    .slice(0, SHOW);
  const buttons = [{ key: "all", label: "All Florida" }, ...regions];

  return (
    <section aria-labelledby="home-news" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 border-b-2 border-on-surface pb-2">
        <h2 id="home-news" className="text-h2">
          Florida election news
        </h2>
        <p className="text-caption text-on-surface-muted">
          Statewide and county stories and official notices, newest first.
        </p>
      </div>

      {regions.length > 1 && (
        <div
          role="group"
          aria-label="Show news from"
          className="flex flex-wrap gap-1.5 py-1"
        >
          {buttons.map((b) => (
            <button
              key={b.key}
              type="button"
              aria-pressed={region === b.key}
              onClick={() => setRegion(b.key)}
              className={[
                "inline-flex min-h-[32px] items-center rounded-full border px-3 text-caption font-semibold transition-colors",
                region === b.key
                  ? "border-on-surface bg-on-surface text-surface"
                  : "border-border-input bg-surface text-on-surface hover:bg-surface-muted",
              ].join(" ")}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {/* aria-live so a screen-reader user hears that the list changed when
          a filter is pressed; polite, because it is never urgent. */}
      <ul aria-live="polite" className="flex flex-col">
        {shown.map((i, n) => (
          <li
            key={i.id}
            className={n >= PHONE_SHOW ? "max-lg:hidden" : undefined}
          >
            <NewsStoryCard
              variant="row"
              regionLabel={i.region.label}
              title={i.title}
              url={i.url}
              imageUrl={i.imageUrl}
              source={i.source}
              outletDomain={i.outletDomain}
              dateLabel={i.dateLabel}
              kindFallback={i.kindFallback}
            />
          </li>
        ))}
      </ul>

      <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-body-sm">
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
