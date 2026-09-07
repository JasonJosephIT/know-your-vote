"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { formatNewsDate, safeHttpUrl } from "@/lib/format";
import { readLocation } from "@/lib/location";
import type { StoredLocation } from "@/lib/location";

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

/* Location is written on other pages before navigating here, so there is no
   change event to subscribe to — the empty subscription still lets
   useSyncExternalStore swap the server snapshot for the device value right
   after hydration. */
const subscribeToNothing = () => () => {};

/* Un-gated since TASK-069.

   The feed used to refuse to fetch at all without a stored location, and
   rendered "Add your ZIP" instead — a dead end for anyone arriving at /news
   first, and the last of Phase 7's ZIP gates.

   The route already did the right thing: every parameter is optional, and
   with none it returns the statewide items (race_id and metro both null) —
   voter registration, the Division of Elections, statewide election news.
   Nothing there needed changing; the gate was entirely on this side.

   Location stays additive rather than restrictive. The route ORs statewide,
   metro, and race scopes, so a ZIP *adds* local items instead of hiding the
   statewide ones — a voter with a ZIP should not lose the registration link.
   The plan called this "a narrowing filter"; additive is the better reading
   of the same intent, and it is what the route already does.

   Still reads kyv.location rather than the URL: /news is a static route and
   useSearchParams here would force a Suspense bailout for no gain today.
   TASK-070 owns moving off stored location, and lists this file. */

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
    /* undefined is the pre-hydration render only — device storage is not
       readable yet, so wait one tick rather than firing a second request. */
    if (location === undefined) return;

    const params = new URLSearchParams();
    if (location?.zip) {
      params.set("zip", location.zip);
      if (location.district) params.set("district", location.district);
    } else if (location?.metro) {
      params.set("metro", location.metro);
    }
    const query = params.toString();

    const controller = new AbortController();
    fetch(`/api/news${query ? `?${query}` : ""}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items?: FeedItem[] }>) : Promise.reject()))
      .then((data) => setStage({ kind: "ready", items: data.items ?? [] }))
      .catch(() => {
        if (!controller.signal.aborted) setStage({ kind: "error" });
      });
    return () => controller.abort();
  }, [location]);

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

  const scoped = Boolean(location?.zip || location?.metro);

  /* Offered, never required — the feed above has already rendered. */
  const addLocation = scoped ? null : (
    <p className="text-caption text-on-surface-muted">
      These are the statewide updates every Florida voter gets.{" "}
      <Link href="/" className="text-primary underline underline-offset-2">
        Add your ZIP
      </Link>{" "}
      to see your metro and your races here too.
    </p>
  );

  if (stage.items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body text-on-surface-muted">
          No updates yet — quiet is honest. Check back after the next daily
          refresh.
        </p>
        {addLocation}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {addLocation}
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
    </div>
  );
}
