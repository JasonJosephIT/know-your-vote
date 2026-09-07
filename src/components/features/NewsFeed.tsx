"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatNewsDate, safeHttpUrl } from "@/lib/format";

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

/* candidate_news/election_news cite allowlisted outlets (AP, Ballotpedia…),
   which are sources but not official ones — label those links honestly when
   the row carries no source row to name the publisher. */
function sourceLinkText(itemType: NewsItemType) {
  return itemType === "candidate_news" || itemType === "election_news"
    ? "Read the source"
    : "Open official source";
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

export function NewsFeed() {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/news", { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items?: FeedItem[] }>) : Promise.reject()))
      .then((data) => setStage({ kind: "ready", items: data.items ?? [] }))
      .catch(() => {
        if (!controller.signal.aborted) setStage({ kind: "error" });
      });
    return () => controller.abort();
  }, []);

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
        No updates yet — quiet is honest. Check back after the next daily
        refresh.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {stage.items.map((item) => {
        const url = safeHttpUrl(item.url);
        return (
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
                <span>{formatNewsDate(item.publishedAt)}</span>
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
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    {item.publisher ? `Read at ${item.publisher}` : sourceLinkText(item.itemType)}
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
