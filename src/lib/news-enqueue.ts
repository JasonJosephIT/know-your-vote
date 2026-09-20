/* Turning swept articles into review-queue payloads — candidate-news-PRD.md §6
   (task C8), founder decision 2026-09-19.

   PURE, and split out of scripts/news-enqueue.ts for the reason every other
   decidable rule in this project is: the script does stdin, the roster query and
   the writes, and everything that can be got WRONG lives here where
   scripts/verify-news-enqueue.ts can drive it with no DB and no network.

   The rule worth protecting is the relation tier. src/lib/news-match.ts decides
   it; this module's only job is to carry it intact into a payload that the
   approval boundary will accept. Until 2026-09-19 that boundary silently dropped
   it, and a dropped tier is not a missing label — CandidateNews renders
   `relation !== "related"` under "In the news", so a null presented an ambiguous
   surname match as a story that named the candidate. The guardrail validates
   the payloads this module produces against the real zod schema, so "it carries
   the tier" is checked against the thing that has to accept it rather than
   against a copy of my assumptions.

   Type-only imports of the outlet list, same as news-outlets.ts: the guardrail
   runs under bare `node`, so the caller passes what it needs. */

import type { NewsRelation, RosterCandidate, Match } from "./news-match";
import type { SweptArticle } from "./news-sweep";
import type { Outlet } from "./news-sources";

/** One article attached to one candidate. The sweep's article can produce
    several of these — a `related` surname match attaches to every candidate the
    ambiguity admits, which is §6's rule and not a defect. */
export interface Attachment {
  article: SweptArticle;
  candidateId: string;
  relation: NewsRelation;
  raceId: string;
  /** `source.source_id` for the outlet that published it. */
  sourceId: string;
}

export interface PlanCounts {
  /** Articles that matched nobody on the roster. Dropped, and counted — a
      silent drop here looks like "the press ignored these people". */
  unmatched: number;
  /** Articles whose host matched no listed outlet. Dropped: attributing a story
      to an outlet we do not read would put an unverifiable publisher on a card. */
  offList: number;
}

export interface EnqueuePlan {
  attachments: Attachment[];
  counts: PlanCounts;
}

/** `source_id` for an outlet. One source row per OUTLET, not per article — the
    source IS the outlet, which is how migration 0014's own seed attributes
    rows. */
export function sourceIdFor(domain: string): string {
  return `outlet:${domain}`;
}

export function domainFromSourceId(sourceId: string): string {
  return sourceId.startsWith("outlet:") ? sourceId.slice("outlet:".length) : sourceId;
}

/** Match every article against the roster and pair each hit with its outlet.

    `matchFn` and `outletFor` are injected rather than imported so this stays
    offline-testable — the same shape `sweep()` uses for `belongsTo`.

    NO raceId is passed to the matcher, deliberately. A swept article carries
    none (the sweep does not identify races), so only the surname-ambiguity path
    can produce `related`. Supplying a guessed race would manufacture
    race-scoped attachments out of nothing, which is the opposite of what §6's
    ambiguity rule is for. */
export function planAttachments(
  articles: readonly SweptArticle[],
  roster: readonly RosterCandidate[],
  matchFn: (article: { title: string; summary: string | null }, roster: readonly RosterCandidate[]) => Match[],
  outletFor: (url: string) => Outlet | null,
): EnqueuePlan {
  const attachments: Attachment[] = [];
  let unmatched = 0;
  let offList = 0;

  for (const article of articles) {
    const outlet = outletFor(article.url);
    if (!outlet) {
      offList++;
      continue;
    }
    const matches = matchFn({ title: article.title, summary: article.summary }, roster);
    if (matches.length === 0) {
      unmatched++;
      continue;
    }
    for (const m of matches) {
      const raceId = roster.find((r) => r.candidateId === m.candidateId)?.raceId;
      /* A match with no race is unusable: the payload needs a scope, and
         inventing one would put the story in the wrong race. */
      if (!raceId) continue;
      attachments.push({
        article,
        candidateId: m.candidateId,
        relation: m.relation,
        raceId,
        sourceId: sourceIdFor(outlet.domain),
      });
    }
  }

  return { attachments, counts: { unmatched, offList } };
}

/** The `manual_news` payload for one attachment.

    `manual_news` is the right KIND even for a swept article: the kind describes
    the payload shape, which is identical, and `review_item.source` records who
    proposed it ('agent:R1' here, 'operator' for a hand-add). So no CHECK
    widening is needed on review_item.kind.

    `relation` is always set, never defaulted. The schema refuses a
    candidate-scoped payload without one precisely so this cannot regress. */
export function reviewPayloadFor(a: Attachment) {
  return {
    item_type: "candidate_news" as const,
    title: a.article.title,
    summary: a.article.summary,
    url: a.article.url,
    metro: null,
    race_id: a.raceId,
    candidate_id: a.candidateId,
    published_at: a.article.publishedAt,
    relation: a.relation,
    image_url: a.article.imageUrl,
    source_id: a.sourceId,
  };
}

/** A key for "have we already queued or published this pairing". 0005's
    uq_news_item_url_candidate is on (url, COALESCE(candidate_id,'')), so the
    key matches that shape — otherwise a duplicate would only surface when an
    operator approved it and watched the insert fail. */
export function dedupeKey(url: string, candidateId: string | null): string {
  return `${url}|${candidateId ?? ""}`;
}
