"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { formatNewsDate, safeHttpUrl } from "@/lib/format";
import { readLocation } from "@/lib/location";
import type { StoredLocation } from "@/lib/location";

interface FeedItem {
  id: string;
  itemType:
    "pipeline_event" | "official_link" | "candidate_news" | "election_news";
  title: string;
  summary: string | null;
  url: string | null;
  raceId: string | null;
  candidateId: string | null;
  publishedAt: string;
}

/* Feed label per item_type. Lookup falls back to "update" so an item_type
   added in the database ahead of this union (exactly how candidate_news/
   election_news arrived) degrades to the generic label instead of breaking. */
const TYPE_LABELS: Partial<Record<string, string>> = {
  pipeline_event: "update",
  official_link: "official resource",
  candidate_news: "candidate news",
  election_news: "election news",
};

/* candidate_news/election_news cite allowlisted outlets (AP, Ballotpedia…),
   which are sources but not official ones — label those links honestly. */
function sourceLinkText(itemType: FeedItem["itemType"]) {
  return itemType === "candidate_news" || itemType === "election_news"
    ? "Read the source"
    : "Open official source";
}

type Stage =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; items: FeedItem[] };

/* Location is written on other pages before navigating here, so there is no
   change event to subscribe to — the empty subscription still lets
   useSyncExternalStore swap the server snapshot for the device value right
   after hydration. */
const subscribeToNothing = () => () => {};

export function NewsFeed() {
  /* undefined = server/hydration render (device storage not readable yet, so
     keep the loading skeleton); null = hydrated with no stored location. */
  const location = useSyncExternalStore<StoredLocation | null | undefined>(
    subscribeToNothing,
    readLocation,
    () => undefined,
  );
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  useEffect(() => {
    const params = new URLSearchParams();
    if (location?.zip) {
      params.set("zip", location.zip);
      if (location.district) params.set("district", location.district);
    } else if (location?.metro) {
      params.set("metro", location.metro);
    } else {
      return;
    }

    const controller = new AbortController();
    fetch(`/api/news?${params}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setStage({ kind: "ready", items: data.items ?? [] }))
      .catch(() => {
        if (!controller.signal.aborted) setStage({ kind: "error" });
      });
    return () => controller.abort();
  }, [location]);

  if (location !== undefined && !location?.zip && !location?.metro) {
    return (
      <p className="text-body text-on-surface-muted">
        Add your ZIP or county and we&apos;ll show updates for your races.{" "}
        <Link href="/" className="text-primary underline underline-offset-2">
          Enter your ZIP
        </Link>
      </p>
    );
  }

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
        No updates yet for your area — quiet is honest. Check back after the
        next daily refresh.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {stage.items.map((item) => {
        const url = safeHttpUrl(item.url);
        return (
          <li key={item.id}>
            <Card className="flex flex-col gap-1">
              <p className="font-mono text-mono text-on-surface-muted">
                {formatNewsDate(item.publishedAt)}
                {` · ${TYPE_LABELS[item.itemType] ?? "update"}`}
              </p>
              <h2 className="text-h3">{item.title}</h2>
              {item.summary && (
                <p className="text-body-sm text-on-surface-muted">
                  {item.summary}
                </p>
              )}
              <p className="flex flex-wrap gap-3 text-caption">
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    {sourceLinkText(item.itemType)}
                  </a>
                )}
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
              </p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
