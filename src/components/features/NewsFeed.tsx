"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { readLocation } from "@/lib/location";

import type { NewsItemType } from "@/types/app";

interface FeedItem {
  id: string;
  itemType: NewsItemType;
  title: string;
  summary: string | null;
  url: string | null;
  raceId: string | null;
  candidateId: string | null;
  publishedAt: string;
  /* Source labelling (news-fairness.md §1). Null when the item has no source
     row — official_link / pipeline_event rows legitimately have none. */
  publisher: string | null;
  kind: string | null;
  lean: string | null;
  isOpinion: boolean;
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
      .then((r) => (r.ok ? r.json() : Promise.reject()))
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
          {/* Opinion pieces get a visually distinct container, not just a word
              in the byline (news-fairness.md §1) — so a column is never read as
              a report. Deliberately neutral styling: a muted ground and a rule,
              never a colour that would imply a verdict about the piece. */}
          <Card
            className={`flex flex-col gap-1${
              item.isOpinion ? " border-l-2 border-l-border-strong bg-surface-muted" : ""
            }`}
          >
            <p className="flex flex-wrap items-center gap-x-2 font-mono text-mono text-on-surface-muted">
              <span>{formatDate(item.publishedAt)}</span>
              {item.publisher && <span>· {item.publisher}</span>}
              {item.kind && (
                <span className={item.isOpinion ? "text-on-surface" : undefined}>
                  · {item.kind}
                </span>
              )}
              {/* Lean is disclosed, never judged — same muted style as
                  everything else, never colour-coded (README neutrality rule). */}
              {item.lean && <span>· {item.lean}</span>}
              {!item.kind &&
                (item.itemType === "official_link" ? <span>· official resource</span> : <span>· update</span>)}
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
                  {item.publisher ? `Read at ${item.publisher}` : "Open official source"}
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
