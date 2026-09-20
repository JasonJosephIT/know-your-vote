"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NewsStoryCard } from "@/components/features/NewsStoryCard";
import { formatNewsDate } from "@/lib/format";

import type { NewsItemType } from "@/types/app";
import type { LeanTag, SourceType } from "@/lib/news-labels";

interface FeedItem {
  id: string;
  itemType: NewsItemType;
  title: string;
  summary: string | null;
  url: string | null;
  raceId: string | null;
  candidateId: string | null;
  publishedAt: string;
  /** Hero image from the outlet's feed (migration 0029); null is common. */
  imageUrl: string | null;
  /* The card's source labels come from `newsCardLabels` inside NewsStoryCard,
     so the raw source row travels instead of pre-rendered strings. Null when
     the item has no source row — official_link / pipeline_event rows
     legitimately have none.

     There is deliberately NO `lean` here. The API stopped sending one
     (news-fairness.md §1, amended 2026-09-19): lean belongs to the outlet page,
     and a field the client never receives is a field no card can leak. */
  source: { publisher: string; type: SourceType; lean_tag: LeanTag } | null;
  /** Outlet domain for the outlet-page link, or null for non-article rows. */
  outletDomain: string | null;
}


type Stage =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; items: FeedItem[] };

/* Un-gated in TASK-069, then un-scoped in TASK-070.

   The feed used to refuse to fetch without a stored location. TASK-069
   removed that gate; TASK-070 removed the store it read. What is left is the
   simplest thing that is true: /news requests the statewide scope and shows
   what comes back.

   That costs the metro filter. The route still supports ?metro= and ?zip=,
   and 7 of the 10 news_item rows carry a metro — but nothing links to /news
   with parameters (the section nav is the only link, and it has no location
   to pass), so metro scoping was reachable only through kyv.location. It is
   unreachable now rather than removed: a link from the races view carrying
   the location already in that URL would restore it in one line, and that is
   a deliberate follow-up rather than something to build speculatively here.

   Dropping the store also removes the useSyncExternalStore dance that existed
   only to read device storage after hydration. */

export function NewsFeed({ county }: { county?: string }) {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    /* The county comes from the URL, not from device storage — TASK-070
       removed the store, and §7's "switching county is a view, not a move"
       rule is satisfied by construction: there is nothing to overwrite, and
       the choice is shareable and survives a reload. */
    const qs = county ? `?county=${encodeURIComponent(county)}` : "";
    fetch(`/api/news${qs}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items?: FeedItem[] }>) : Promise.reject()))
      .then((data) => setStage({ kind: "ready", items: data.items ?? [] }))
      .catch(() => {
        if (!controller.signal.aborted) setStage({ kind: "error" });
      });
    return () => controller.abort();
  }, [county]);

  if (stage.kind === "loading") {
    return (
      <div
        className="flex flex-col gap-3"
        role="status"
        aria-label="Loading news"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-surface-muted"
          />
        ))}
      </div>
    );
  }

  if (stage.kind === "error") {
    return (
      <p className="text-body text-on-surface-muted" role="alert">
        Couldn&apos;t load the feed — refresh to try again.
      </p>
    );
  }

  if (stage.items.length === 0) {
    return (
      <p className="text-body text-on-surface-muted">
        {county
          ? "No county news yet — quiet is honest. Statewide items still appear here once there are any."
          : "No updates yet — quiet is honest. Check back after the next daily refresh."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {stage.items.map((item) => (
        <li key={item.id}>
          {/* One card component for the whole product (NewsStoryCard). The
              image / outlet / headline shape and the opinion treatment live
              there, so this list cannot drift from the candidate page's. */}
          <NewsStoryCard
            title={item.title}
            url={item.url}
            imageUrl={item.imageUrl}
            source={item.source}
            outletDomain={item.outletDomain}
            summary={item.summary}
            dateLabel={formatNewsDate(item.publishedAt)}
            /* Only reaches the card for rows with no source of their own — an
                official resource or a pipeline update is not journalism and
                should not sit there unlabelled. */
            kindFallback={
              item.itemType === "official_link"
                ? "Official resource"
                : item.itemType === "pipeline_event"
                  ? "Update"
                  : null
            }
            footer={
              <>
                {item.candidateId && (
                  <Link
                    href={`/candidates/${item.candidateId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    View the candidate
                  </Link>
                )}
                {item.raceId && (
                  <Link
                    href={`/races/${item.raceId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    View the race
                  </Link>
                )}
              </>
            }
          />
        </li>
      ))}
    </ul>
  );
}
