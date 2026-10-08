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
   runs under bare `node`, so the caller passes what it needs. The one value
   import is the official list's id prefix and row builder, a pure module
   imported with its extension so plain Node can load it. */

import type { NewsRelation, RosterCandidate, Match } from "./news-match";
import type { SweptArticle } from "./news-sweep";
import type { Outlet } from "./news-sources";
import {
  OFFICIAL_ID_PREFIX,
  officialSourceRow,
  type OfficialSource,
  type OfficialSourceRow,
} from "./official-sources.ts";

/* ---- FOUNDER CALL: a story that names no candidate ----------------------
   DECIDED (founder, 2026-10-06): "election_keywords". An article that matches
   no candidate is still queued for review when its title or summary is about
   the election (isElectionRelated below), as an election_news row: statewide
   when its outlet is statewide, county-scoped when the outlet is a county's.
   Everything else that matches no one is dropped, as before. It is queued,
   never published: an operator approves each one in the console.

   Why keywords and not the Jev-tagged inlet the 2026-09-23 handoff (§5,
   option 2) described: TYPESAFE_API_KEY is unset and the model has never
   run against production rows, while a keyword gate is deterministic, testable
   offline and only decides what an operator sees, not what voters see. On the
   2026-10-06 sweep it admitted 43 of 488 unmatched articles, nearly all of
   them election stories; "vote" and "campaign" were left out because on
   their own they admitted ad campaigns and charity drives.

   History: until 2026-10-06 this was "drop" (recommended 2026-10-04,
   pending), so a statewide story naming nobody on the ballot never reached
   /news unless an operator typed it in. "policy_inlet" is still not built. */
export type UnmatchedArticlePolicy = "drop" | "election_keywords" | "policy_inlet";
export const UNMATCHED_ARTICLE_POLICY: UnmatchedArticlePolicy = "election_keywords";

/* Whole words only, case-insensitive. Each term is about elections in
   itself; see the policy note above for what was left out and why. */
const ELECTION_TERMS =
  /\b(elections?|electoral|ballots?|amendments?|voters?|voting|vote-by-mail|candidates?|referendums?|polling places?|supervisors? of elections|early vote|midterms?)\b/i;

/** Whether a story that names no candidate is about the election, from its
    title and summary. */
export function isElectionRelated(article: { title: string; summary: string | null }): boolean {
  return ELECTION_TERMS.test(`${article.title} ${article.summary ?? ""}`);
}

/** The `manual_news` payload for an election story that names no candidate:
    election_news, scoped to the outlet's county when it has one, otherwise
    explicitly statewide. No race, candidate or metro is guessed, and no
    relation tier is set (it isn't a candidate match). */
export function electionPayloadFor(article: SweptArticle, sourceId: string) {
  const county = article.countyFips ?? null;
  return {
    item_type: "election_news" as const,
    title: article.title,
    summary: article.summary,
    url: article.url,
    metro: null,
    race_id: null,
    candidate_id: null,
    published_at: article.publishedAt,
    relation: null,
    image_url: article.imageUrl,
    source_id: sourceId,
    county_fips: county,
    statewide: county === null ? true : null,
  };
}

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
  /** Articles that matched nobody on the roster. Counted — a silent drop here
      looks like "the press ignored these people". The election-related ones
      are queued as election_news (`elections` on the plan); the rest dropped. */
  unmatched: number;
  /** Articles whose host matched no listed outlet. Dropped: attributing a story
      to an outlet we do not read would put an unverifiable publisher on a card. */
  offList: number;
}

/** An article that named no candidate but is about the election, with the
    outlet it came from. Queued as election_news under the 2026-10-06 policy. */
export interface ElectionItem {
  article: SweptArticle;
  sourceId: string;
}

export interface EnqueuePlan {
  attachments: Attachment[];
  elections: ElectionItem[];
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

    Resolution order, each step deterministic (news-source-integrity spec
    §3.2.2, decision D7):
      1. `given`: the payload already names a source, and the id is CHECKED
         against the story's URL first, so a payload cannot attribute one
         publisher's story to another:
           - `outlet:<domain>` only when the URL belongs to that outlet. A
             swept article always carries its own outlet's id, so it passes;
           - `official:<domain>` only on an election_news item with no
             candidate, no race and no metro, only when the URL is on that entry of
             the official list, and, for a county body, only when the item is
             scoped to that county. The route also refuses it when the
             story's own page already has a source row with another type or
             lean (storyPageProblem). Only R3's queue writes these ids;
           - any other id (a `src_*` page row) only when that row's url_norm
             is this URL's. The route reads the row; givenPageRowProblem
             decides.
         A failed check is `refused`, with the reason.
      2. `outlet`: the URL is on a listed outlet with a signed-off lean. Same
         attribution a swept article gets: one source per outlet.
      3. `page`: anything else is looked up as a source row for this exact page,
         by `url_norm`. That is how migration 0014 attributed the government
         notices, and it is the operator's remedy for a page off the outlet
         list: add the page's source row, then approve again. An official
         row's url_norm is its entry's bare domain, so a story at a body's
         home page finds that row here; the route then refuses it unless the
         item passes every check a given official id must (pageRowProblem).
    An outlet on the list whose lean is not signed off stops at `unsigned`.
    It is never resolved to a page row, because that would put a lean on the
    card that nobody signed off for that outlet.

    THERE IS NO OFFICIAL FALL-THROUGH (D7). A government URL with no given id
    resolves to `page`, never to an official row: by host alone, an
    incumbent's release on a .gov host would print "Official document", which
    a challenger's cannot get, and an agency's advocacy page on an amendment
    would print as an official document. TO FLIP: check `officialFor` after
    `page` for every item.

    `outletFor`, `officialFor` and `norm` are injected for the same reason
    `planAttachments` takes its matcher: this stays pure and offline-testable.
    The route passes `outletForUrl`, `officialForUrl` and brief-rows.ts
    `urlNorm`, the canonical normalisation (`source.url_norm` is UNIQUE; two
    spellings would split one page in two). */
export type ListedSourceRow = OutletSourceRow | OfficialSourceRow;

export type SourceAttribution =
  | {
      kind: "given";
      sourceId: string;
      /** The row to write if missing, built from a list in code: an outlet's
          (null when its lean is not signed off) or an official body's. */
      listedRow: ListedSourceRow | null;
      /** For a page-row id: this URL's url_norm, which the row must have. */
      pageUrlNorm: string | null;
      /** For an official id: this URL's url_norm. A source row there, if
          any, must be primary_doc / N/A (storyPageProblem). */
      storyPageNorm: string | null;
    }
  | { kind: "refused"; reason: string }
  | { kind: "outlet"; sourceId: string; listedRow: OutletSourceRow }
  | { kind: "unsigned"; domain: string }
  | { kind: "page"; urlNorm: string }
  | { kind: "none" };

/** The fields of a news row the attribution reads. NewsInsertRow has them. */
export interface AttributionRow {
  url: string;
  source_id?: string | null;
  item_type: string;
  candidate_id?: string | null;
  race_id?: string | null;
  /** Null for statewide (and for a metro- or race-scoped row). */
  county_fips?: string | null;
  /** A legacy metro scope. An official source never backs one. */
  metro?: string | null;
}

export interface AttributionDeps {
  outletFor: (url: string) => Outlet | null;
  officialFor: (url: string) => OfficialSource | null;
  norm: (url: string) => string | null;
}

export function planSourceAttribution(row: AttributionRow, deps: AttributionDeps): SourceAttribution {
  const given = row.source_id?.trim();
  if (given) return planGiven(row, given, deps);
  const outlet = deps.outletFor(row.url);
  if (outlet) {
    const listed = outletSourceRow(outlet);
    return listed
      ? { kind: "outlet", sourceId: listed.source_id, listedRow: listed }
      : { kind: "unsigned", domain: outlet.domain };
  }
  const urlNorm = deps.norm(row.url);
  return urlNorm ? { kind: "page", urlNorm } : { kind: "none" };
}

function planGiven(row: AttributionRow, given: string, deps: AttributionDeps): SourceAttribution {
  if (given.startsWith("outlet:")) {
    const domain = domainFromSourceId(given);
    const outlet = deps.outletFor(row.url);
    if (!outlet || outlet.domain !== domain) {
      return {
        kind: "refused",
        reason: `This story names outlet ${domain}, but its URL belongs to ${outlet ? outlet.domain : "no listed outlet"}. Fix the story's source or reject it.`,
      };
    }
    return { kind: "given", sourceId: given, listedRow: outletSourceRow(outlet), pageUrlNorm: null, storyPageNorm: null };
  }
  if (given.startsWith(OFFICIAL_ID_PREFIX)) {
    const domain = given.slice(OFFICIAL_ID_PREFIX.length);
    const checked = officialCheck(row, domain, deps);
    if ("why" in checked) {
      return { kind: "refused", reason: `This story names official source ${domain}, but ${checked.why}. ${OFFICIAL_RULE}` };
    }
    return {
      kind: "given",
      sourceId: given,
      listedRow: officialSourceRow(checked.entry),
      pageUrlNorm: null,
      storyPageNorm: deps.norm(row.url),
    };
  }
  const pageUrlNorm = deps.norm(row.url);
  if (!pageUrlNorm) {
    return {
      kind: "refused",
      reason: `This story names source "${given}", and its URL could not be normalised to check that the source is this page's.`,
    };
  }
  return { kind: "given", sourceId: given, listedRow: null, pageUrlNorm, storyPageNorm: null };
}

const OFFICIAL_RULE =
  "An official source backs only an election notice that names no candidate, no race and no metro, on that body's own site, scoped to that body's county when it serves one.";

/** The checks an `official:<domain>` id must pass on this row: the entry, or
    why not (the first check that fails). */
function officialCheck(
  row: AttributionRow,
  domain: string,
  deps: AttributionDeps,
): { entry: OfficialSource } | { why: string } {
  if (row.item_type !== "election_news") return { why: `it is ${row.item_type}, not election_news` };
  if (row.candidate_id || row.race_id) return { why: "it names a candidate or a race" };
  /* No metro form: R3's queue writes county or statewide, and a metro row's
     null county_fips would otherwise pass a statewide body's check. */
  if (row.metro) return { why: `it is scoped to metro ${row.metro}, and an official item is county or statewide` };
  const entry = deps.officialFor(row.url);
  if (!entry || entry.domain !== domain) {
    return { why: `its URL belongs to ${entry ? entry.domain : "no listed official source"}` };
  }
  const county = row.county_fips ?? null;
  if (entry.countyFips !== null && county !== entry.countyFips) {
    return {
      why: `it is scoped to ${county ? `county ${county}` : "no county"}, not the body's county ${entry.countyFips}`,
    };
  }
  return { entry };
}

/** A source row the `page` step found by url_norm, checked before it backs
    the story. A page row backs its own page whatever the item. An official
    row (`official:<domain>`, whose url_norm is the entry's bare domain, so a
    story at a body's home page finds it) backs the story only when the item
    passes every check a given official id must; otherwise a candidate story
    at a .gov home page would print "Official document" (D7). Null when it
    may back the story. */
export function pageRowProblem(row: AttributionRow, foundSourceId: string, deps: AttributionDeps): string | null {
  if (!foundSourceId.startsWith(OFFICIAL_ID_PREFIX)) return null;
  const checked = officialCheck(row, foundSourceId.slice(OFFICIAL_ID_PREFIX.length), deps);
  if (!("why" in checked)) return null;
  return `This story's page is the home page of official source ${foundSourceId}, but ${checked.why}. ${OFFICIAL_RULE} Reject the story.`;
}

/** For a given official id: the source row already recorded for the story's
    own page, if any, must be `primary_doc` / `N/A`. An agency's advocacy
    page keeps its true type (D7), as R3's queue drops it at queue time. Null
    when there is no such row or it is an official notice's. */
export function storyPageProblem(
  pageRow: { source_id: string; type: string; lean_tag: string } | null,
  storyPageNorm: string,
): string | null {
  if (!pageRow || (pageRow.type === "primary_doc" && pageRow.lean_tag === "N/A")) return null;
  return `This story's page, ${storyPageNorm}, is recorded as source ${pageRow.source_id} (${pageRow.type} / ${pageRow.lean_tag}), not an official notice, so an official source cannot back it. Reject the story, or fix that page's source row.`;
}

/** A given page-row id must be this story's own page: the row the route read
    back must have the story URL's url_norm. Null when it does, or when the id
    is not a page row's (`pageUrlNorm` null). */
export function givenPageRowProblem(
  plan: { sourceId: string; pageUrlNorm: string | null },
  rowUrlNorm: string,
): string | null {
  if (plan.pageUrlNorm === null || rowUrlNorm === plan.pageUrlNorm) return null;
  return `This story names source "${plan.sourceId}", which is the page ${rowUrlNorm}, but the story's URL is ${plan.pageUrlNorm}. A page's source row backs only that page. Fix the story's source or reject it.`;
}

/** An official row read back by url_norm must be `primary_doc` / `N/A`. A row
    already there under that url_norm with another type or lean is refused
    rather than printed as "Official document". Outlet rows are not checked
    here: their url_norm row is the outlet's own. */
export function listedRowProblem(
  listed: ListedSourceRow,
  readBack: { type: string; lean_tag: string },
): string | null {
  if (!listed.source_id.startsWith(OFFICIAL_ID_PREFIX)) return null;
  if (readBack.type === "primary_doc" && readBack.lean_tag === "N/A") return null;
  return `A source row for ${listed.url_norm} exists with another type or lean (${readBack.type} / ${readBack.lean_tag}); fix the row or the list.`;
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
  const elections: ElectionItem[] = [];
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
      if (UNMATCHED_ARTICLE_POLICY === "election_keywords" && isElectionRelated(article)) {
        elections.push({ article, sourceId: sourceIdFor(outlet.domain) });
      }
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

  return { attachments, elections, counts: { unmatched, offList } };
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
