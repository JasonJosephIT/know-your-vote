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

/* ---- FOUNDER CALL: a policy story that names no candidate -------------
   RECOMMENDED (PENDING FOUNDER CONFIRMATION), 2026-10-04: "drop". There is
   no automatic inlet for it before Election Day, and operator submission
   through the admin form stays the path. Launch handoff §5; the options are
   news-ingest-order-handoff-2026-09-23.md §5, and the pending decision is
   recorded in docs/general-election/stream-surface-handoff.md §7.

   WHY. The option that matches the founder's first description of the
   workflow is a Jev-tagged policy inlet (option 2). It would make the model a
   gate, reversing the order the pipeline was built on, and that handoff's §7
   asks for it to be "its own spec change with its own PR", chosen
   deliberately. Four weeks out, it would gate on a model that has never run
   against production rows: TYPESAFE_API_KEY is unset, the 0.85 threshold
   comes from ten fixtures, and the gold set is the sweep pool, not the feed.
   The pool is also large. With the recommended surname rule, 507 of the 545
   articles in the 2026-10-04 30-day sweep matched no candidate, and one
   operator would review whatever share of them the model admitted. The
   approval boundary cannot carry a county-scoped row yet either, because
   NewsInsertRow (src/lib/admin/effects.ts) has no county_fips. Option 3,
   race-scoping at match time, needs a race identifier the sweep does not
   produce.

   WHAT IT COSTS. A statewide policy story that names nobody on the ballot
   does not reach /news on its own. An operator can still post it, which is
   how all eight live election_news rows arrived.

   TO FLIP: "policy_inlet" is NOT BUILT. Setting it makes
   scripts/news-enqueue.ts refuse to run and say so, because a switch that
   silently did nothing would read as "no policy news this week". Building it
   is the spec change described above. */
export type UnmatchedArticlePolicy = "drop" | "policy_inlet";
export const UNMATCHED_ARTICLE_POLICY: UnmatchedArticlePolicy = "drop";

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

/** The `source` row for one listed outlet, or null when the outlet's lean has
    not been signed off. `source.lean_tag` is NOT NULL, so an outlet with no
    signed-off `leanTag` has no legal row at all, and nothing may invent one
    (news-sources.ts header: an agent never edits `leanTag`).

    One builder for both writers, scripts/news-enqueue.ts and the admin approve
    path, so an outlet's row cannot depend on which of them wrote it first. */
export function outletSourceRow(outlet: Outlet) {
  if (outlet.leanTag === null) return null;
  return {
    source_id: sourceIdFor(outlet.domain),
    url: `https://${outlet.domain}`,
    url_norm: outlet.domain,
    publisher: outlet.publisher,
    type: outlet.type,
    lean_tag: outlet.leanTag,
  };
}

export type OutletSourceRow = NonNullable<ReturnType<typeof outletSourceRow>>;

/** How the approve path finds the `source` a news row is attributed to.
    Migration 0014 (task N1, "no source, no card") makes `source_id` required on
    every candidate_news / election_news row. The approve path resolves it
    BEFORE the insert, so that CHECK can never be what rejects an approval: a
    story with no resolvable source is refused with its own reason and stays
    pending, where an operator can fix it and approve again.

    Resolution order, each step deterministic:
      1. `given`: the payload already names a source. A swept article always
         does (`outlet:<domain>`); the route checks the row exists, and writes
         it from the outlet list when the id is an outlet's and the row is missing.
      2. `outlet`: the URL is on a listed outlet with a signed-off lean. Same
         attribution a swept article gets: one source per outlet.
      3. `page`: anything else is looked up as a source row for this exact page,
         by `url_norm`. That is how migration 0014 attributed the government
         notices, and it is the operator's remedy for a page off the outlet
         list: add the page's source row, then approve again.
    An outlet on the list whose lean is not signed off stops at `unsigned`.
    It is never resolved to a page row, because that would put a lean on the
    card that nobody signed off for that outlet.

    `outletFor` and `norm` are injected for the same reason `planAttachments`
    takes its matcher: this stays pure and offline-testable. The route passes
    `outletForUrl` and brief-rows.ts `urlNorm`, the canonical normalisation
    (`source.url_norm` is UNIQUE; two spellings would split one page in two). */
export type SourceAttribution =
  | { kind: "given"; sourceId: string; outletRow: OutletSourceRow | null }
  | { kind: "outlet"; sourceId: string; outletRow: OutletSourceRow }
  | { kind: "unsigned"; domain: string }
  | { kind: "page"; urlNorm: string }
  | { kind: "none" };

export function planSourceAttribution(
  url: string,
  givenSourceId: string | null | undefined,
  outletFor: (url: string) => Outlet | null,
  norm: (url: string) => string | null,
  outlets: readonly Outlet[] = [],
): SourceAttribution {
  const given = givenSourceId?.trim();
  if (given) {
    const domain = given.startsWith("outlet:") ? domainFromSourceId(given) : null;
    const outlet = domain ? outlets.find((o) => o.domain === domain) ?? null : null;
    return { kind: "given", sourceId: given, outletRow: outlet ? outletSourceRow(outlet) : null };
  }
  const outlet = outletFor(url);
  if (outlet) {
    const row = outletSourceRow(outlet);
    return row
      ? { kind: "outlet", sourceId: row.source_id, outletRow: row }
      : { kind: "unsigned", domain: outlet.domain };
  }
  const urlNorm = norm(url);
  return urlNorm ? { kind: "page", urlNorm } : { kind: "none" };
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
