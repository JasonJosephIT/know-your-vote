"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { readLocation } from "@/lib/location";

interface FeedItem {
  id: string;
  itemType: "pipeline_event" | "official_link";
  title: string;
  summary: string | null;
  url: string | null;
  raceId: string | null;
  publishedAt: string;
}

type Stage =
  | { kind: "loading" }
  | { kind: "noLocation" }
  | { kind: "error" }
  | { kind: "ready"; items: FeedItem[] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NewsFeed() {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  useEffect(() => {
    const location = readLocation();
    const params = new URLSearchParams();
    if (location?.zip) {
      params.set("zip", location.zip);
      if (location.district) params.set("district", location.district);
    } else if (location?.metro) {
      params.set("metro", location.metro);
    } else {
      setStage({ kind: "noLocation" });
      return;
    }

    fetch(`/api/news?${params}`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ items?: FeedItem[] }>)
          : Promise.reject()
      )
      .then((data) => setStage({ kind: "ready", items: data.items ?? [] }))
      .catch(() => setStage({ kind: "error" }));
  }, []);

  if (stage.kind === "loading") {
    return (
      <div className="flex flex-col gap-3" role="status" aria-label="Loading news">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (stage.kind === "noLocation") {
    return (
      <p className="text-body text-on-surface-muted">
        Add your ZIP or county and we&apos;ll show updates for your races.{" "}
        <Link href="/" className="text-primary underline underline-offset-2">
          Enter your ZIP
        </Link>
      </p>
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
      {stage.items.map((item) => (
        <li key={item.id}>
          <Card className="flex flex-col gap-1">
            <p className="font-mono text-mono text-on-surface-muted">
              {formatDate(item.publishedAt)}
              {item.itemType === "official_link" ? " · official resource" : " · update"}
            </p>
            <h2 className="text-h3">{item.title}</h2>
            {item.summary && (
              <p className="text-body-sm text-on-surface-muted">{item.summary}</p>
            )}
            <p className="flex flex-wrap gap-3 text-caption">
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Open official source
                </a>
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
      ))}
    </ul>
  );
}
