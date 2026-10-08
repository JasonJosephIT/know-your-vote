/* The news intake run, shared by the scripts (scripts/news-sweep.ts,
   scripts/news-enqueue.ts) and the twice-weekly cron
   (src/app/api/cron/news-sweep/route.ts; founder 2026-10-06).

   Two halves, the same two the scripts always had:
     runSweep      fetch every usable outlet's feed or sitemap days and turn
                   them into articles (the network half; writes nothing)
     enqueueIntake match the articles to the roster and queue what matched,
                   plus the election stories that named no one, as PENDING
                   review items. Nothing here publishes: a row reaches a voter
                   only once an operator approves it in the console.

   The decidable rules stay in the pure modules they were always in
   (news-sweep.ts, news-match.ts, news-enqueue.ts) and their guardrails. This
   module is the I/O around them, moved out of the scripts so the cron and a
   hand run can't drift apart. Relative imports with the extension, so the
   scripts can still import it under plain Node. */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  OUTLETS,
  outletForUrl,
  sitemapUrlFor,
  urlBelongsTo,
  usableOutlets,
  type Outlet,
} from "./news-sources.ts";
import { parseNewsSitemap, sweep, type SweptArticle } from "./news-sweep.ts";
import { matchArticle, type RosterCandidate } from "./news-match.ts";
import { countyForRaceDistrict } from "./counties.ts";
import { ACTIVE_ELECTION_KIND } from "./election.ts";
import {
  dedupeKey,
  domainFromSourceId,
  electionPayloadFor,
  outletSourceRow,
  planAttachments,
  reviewPayloadFor,
} from "./news-enqueue.ts";

export const USER_AGENT =
  "KnowYourVote/1.0 (+https://github.com/JasonJosephIT/know-your-vote)";

type Log = (line: string) => void;

/** One GET, or null with the failure logged. Never throws: a failed outlet
    is named and skipped, never a silent empty result. */
export async function fetchText(url: string, log: Log): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/atom+xml, text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      log(`  HTTP ${res.status} ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    log(`  ${(err as Error).name}: ${url}`);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SweepResult {
  articles: SweptArticle[];
  usable: number;
  feedsOk: number;
  feedOutlets: number;
  sitemapDays: number;
  sitemapDaysOk: number;
  summary: string;
}

/** Sweep every usable outlet for the last `days` days. Throws when no outlet
    is usable, because an empty sweep must never read as "no news". */
export async function runSweep({
  days = 14,
  log = () => {},
  now = new Date(),
}: { days?: number; log?: Log; now?: Date } = {}): Promise<SweepResult> {
  const usable = usableOutlets();
  if (usable.length === 0) {
    throw new Error(
      `No usable outlets: ${OUTLETS.length} listed, 0 with both a signed-off leanTag and a retrieval path.`
    );
  }

  const feeds: { outlet: Outlet; xml: string; format?: "feed" | "news-sitemap" }[] = [];
  let feedsOk = 0;
  let sitemapDays = 0;
  let sitemapDaysOk = 0;

  for (const outlet of usable) {
    if (outlet.feed !== null) {
      const xml = await fetchText(outlet.feed, log);
      if (xml) {
        feeds.push({ outlet, xml });
        feedsOk++;
      }
      continue;
    }
    /* Retrieval mode 2: one request per UTC day in the window, oldest first,
       with a polite gap. A failed day is logged and skipped, never retried. */
    if (outlet.sitemap) {
      for (let back = days; back >= 0; back--) {
        const url = sitemapUrlFor(outlet.sitemap.daily, new Date(now.getTime() - back * 86_400_000));
        sitemapDays++;
        const xml = await fetchText(url, log);
        if (xml) {
          if (parseNewsSitemap(xml).length === 0) log(`  0 entries: ${url}`);
          feeds.push({ outlet, xml, format: "news-sitemap" });
          sitemapDaysOk++;
        }
        await sleep(1000);
      }
    }
  }

  const articles = sweep({ feeds, now, windowDays: days, belongsTo: urlBelongsTo });
  const sitemapOutlets = usable.filter((o) => o.feed === null && o.sitemap).length;
  const feedOutlets = usable.length - sitemapOutlets;
  const summary =
    `swept ${feedsOk}/${feedOutlets} feeds + ${sitemapDaysOk}/${sitemapDays} sitemap days ` +
    `(${sitemapOutlets} outlet${sitemapOutlets === 1 ? "" : "s"}) -> ${articles.length} articles in the last ${days} days`;
  return { articles, usable: usable.length, feedsOk, feedOutlets, sitemapDays, sitemapDaysOk, summary };
}

export interface EnqueueResult {
  articles: number;
  attachments: number;
  named: number;
  related: number;
  elections: number;
  unmatched: number;
  offList: number;
  roster: number;
  queued: number;
  skipped: number;
  dryRun: boolean;
  /** The exact payloads a dry run would have queued. Empty on a real run. */
  payloads: unknown[];
  summary: string;
}

/** Load the ballot-tier roster: `profile` links a candidate to a race. */
export async function loadRoster(db: SupabaseClient): Promise<RosterCandidate[]> {
  const { data, error } = await db
    .from("profile")
    .select("candidate_id, race_id, candidate!inner(legal_name, ballot_status)");
  if (error) throw new Error(`could not read the roster: ${error.message}`);
  type ProfileRow = {
    candidate_id: string;
    race_id: string;
    candidate:
      | { legal_name: string; ballot_status: string }
      | { legal_name: string; ballot_status: string }[]
      | null;
  };
  return ((data ?? []) as unknown as ProfileRow[])
    .map((p) => {
      const c = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
      return c && c.ballot_status === "ballot"
        ? { candidateId: p.candidate_id, legalName: c.legal_name, raceId: p.race_id }
        : null;
    })
    .filter((r): r is RosterCandidate => r !== null);
}

/** A ballot-tier candidate a voter can see, with the covered county of a
    county-level race. */
export interface BallotRosterCandidate extends RosterCandidate {
  /** `countyForRaceDistrict(race.district)`: the covered county of a county
      race ('DAD-CC-2' is 12086); null for statewide, congressional and
      legislative races. */
  countyFips: string | null;
}

/* The statuses a voter can see a race at (0033): `listed`, the roster, and
   `published`, the brief. */
const VISIBLE_RACE_STATUSES = ["published", "listed"] as const;

/** Every ballot-tier candidate on the site: the races of the active election
    whose `race_publication.status` is published or listed, their
    `race.candidate_ids`, and the candidate rows with `ballot_status =
    'ballot'` (agent-retrofit spec §3.5). 106 on 2026-10-08, against
    loadRoster's 82: `profile` rows exist only for published races, so
    loadRoster has no listed-race candidate. R3's candidate rule matches
    against this; loadRoster stays as it is for the sweep and R5.

    Three keyed reads rather than embeds, as listing.ts does. The service
    client bypasses RLS, so the status filter is explicit here. Throws on a
    read error; an empty roster is returned, and the caller decides. A
    candidate listed in two races appears once per race. */
export async function loadBallotRoster(db: SupabaseClient): Promise<BallotRosterCandidate[]> {
  const races = await db
    .from("race")
    .select("race_id, district, candidate_ids")
    .eq("election", ACTIVE_ELECTION_KIND);
  if (races.error) throw new Error(`could not read races: ${races.error.message}`);
  const pubs = await db
    .from("race_publication")
    .select("race_id")
    .in("status", [...VISIBLE_RACE_STATUSES]);
  if (pubs.error) throw new Error(`could not read race_publication: ${pubs.error.message}`);

  type RaceRow = { race_id: string; district: string | null; candidate_ids: string[] | null };
  const visible = new Set(((pubs.data ?? []) as { race_id: string }[]).map((p) => p.race_id));
  const seats = ((races.data ?? []) as RaceRow[])
    .filter((r) => visible.has(r.race_id))
    .flatMap((r) => (r.candidate_ids ?? []).map((candidateId) => ({ candidateId, race: r })));
  const ids = [...new Set(seats.map((s) => s.candidateId))];
  if (ids.length === 0) return [];

  const candidates = await db
    .from("candidate")
    .select("candidate_id, legal_name")
    .in("candidate_id", ids)
    .eq("ballot_status", "ballot");
  if (candidates.error) throw new Error(`could not read candidates: ${candidates.error.message}`);
  const names = new Map(
    ((candidates.data ?? []) as { candidate_id: string; legal_name: string }[]).map((c) => [c.candidate_id, c.legal_name]),
  );
  return seats.flatMap(({ candidateId, race }) => {
    const legalName = names.get(candidateId);
    return legalName === undefined
      ? []
      : [{ candidateId, legalName, raceId: race.race_id, countyFips: countyForRaceDistrict(race.district)?.fips ?? null }];
  });
}

/** Match, then queue the candidate matches and the unmatched election stories
    as pending review items, skipping anything already queued or published.
    Throws on an empty roster or a failed write: a silent empty success would
    look exactly like "the press wrote nothing". */
export async function enqueueIntake(
  db: SupabaseClient,
  articles: readonly SweptArticle[],
  { dryRun = false, limit = Infinity }: { dryRun?: boolean; limit?: number } = {}
): Promise<EnqueueResult> {
  const roster = await loadRoster(db);
  if (roster.length === 0) {
    throw new Error(
      "the roster is empty — no ballot-tier candidate has a profile row. Matching against nobody would report 'no coverage' for every candidate."
    );
  }

  const { attachments, elections, counts } = planAttachments(
    articles,
    roster,
    matchArticle,
    (u) => outletForUrl(u, OUTLETS)
  );
  const capped = Number.isFinite(limit) ? attachments.slice(0, limit) : attachments;
  const electionsCapped = Number.isFinite(limit) ? elections.slice(0, limit) : elections;

  const candidateRows = capped.map((a) => ({
    key: dedupeKey(a.article.url, a.candidateId),
    url: a.article.url,
    sourceId: a.sourceId,
    election: false,
    payload: reviewPayloadFor(a) as Record<string, unknown>,
  }));
  const electionRows = electionsCapped.map((e) => ({
    key: dedupeKey(e.article.url, null),
    url: e.article.url,
    sourceId: e.sourceId,
    election: true,
    payload: electionPayloadFor(e.article, e.sourceId) as Record<string, unknown>,
  }));
  const all = [...candidateRows, ...electionRows];

  const base = {
    articles: articles.length,
    attachments: capped.length,
    named: capped.filter((a) => a.relation === "named").length,
    related: capped.filter((a) => a.relation === "related").length,
    elections: electionsCapped.length,
    unmatched: counts.unmatched,
    offList: counts.offList,
    roster: roster.length,
    dryRun,
  };
  const head =
    `${articles.length} article(s) in -> ${base.attachments} candidate attachment(s) ` +
    `(${base.named} named, ${base.related} related), ${base.elections} election stor${base.elections === 1 ? "y" : "ies"} naming no candidate, ` +
    `${counts.unmatched - base.elections} other unmatched dropped, ${counts.offList} from no listed outlet, roster ${roster.length}`;

  if (dryRun) {
    return { ...base, queued: 0, skipped: 0, payloads: all.map((r) => r.payload), summary: `${head}; dry run, wrote nothing` };
  }
  if (all.length === 0) {
    return { ...base, queued: 0, skipped: 0, payloads: [], summary: `${head}; nothing to queue` };
  }

  /* One `source` row per outlet, shared with the admin approve path
     (outletSourceRow), so an outlet's row has one shape whichever writes it. */
  for (const sourceId of [...new Set(all.map((r) => r.sourceId))]) {
    const domain = domainFromSourceId(sourceId);
    const outlet = OUTLETS.find((o) => o.domain === domain);
    if (!outlet) throw new Error(`internal: no outlet for ${sourceId}`);
    const row = outletSourceRow(outlet);
    if (row === null) {
      throw new Error(`${domain} has no signed-off leanTag, so its source row cannot be written.`);
    }
    const { error } = await db.from("source").upsert(row, { onConflict: "url_norm" });
    if (error) throw new Error(`could not upsert source ${sourceId}: ${error.message}`);
  }

  /* Skip anything already queued or published for this (url, candidate), the
     shape of 0005's uq_news_item_url_candidate, so a duplicate never surfaces
     as a failed approval. Election stories key on (url, "").

     An election story is also skipped when its URL is already queued,
     decided or published under ANY candidate. Matching reads the title and
     the dek only (news-sweep.ts DEK_MAX), so an article first matched on a
     name deep in an uncapped description, or one whose feed text changed,
     could otherwise come back as a second, county or statewide copy of a story
     an operator already handled. That includes a REJECTED pairing: the
     operator has seen the article, and most rejections (digests, opinion,
     duplicates) would be just as wrong as election news. Candidate rows are
     never skipped on the URL alone; a new (url, candidate) pair is queued. */
  const urls = [...new Set(all.map((r) => r.url))];
  const seen = new Set<string>();
  const seenUrls = new Set<string>();
  for (let i = 0; i < urls.length; i += 200) {
    const { data } = await db
      .from("news_item")
      .select("url, candidate_id")
      .in("url", urls.slice(i, i + 200));
    for (const r of (data ?? []) as { url: string; candidate_id: string | null }[]) {
      seen.add(dedupeKey(r.url, r.candidate_id));
      seenUrls.add(r.url);
    }
  }
  const { data: queued } = await db
    .from("review_item")
    .select("payload, status")
    .eq("kind", "manual_news")
    .in("status", ["pending", "approved", "rejected"]);
  for (const r of (queued ?? []) as { payload: { url?: string; candidate_id?: string | null } }[]) {
    if (!r.payload?.url) continue;
    seen.add(dedupeKey(r.payload.url, r.payload.candidate_id ?? null));
    seenUrls.add(r.payload.url);
  }

  const rows = all
    .filter((r) => !seen.has(r.key) && !(r.election && seenUrls.has(r.url)))
    .map((r) => ({
      kind: "manual_news",
      /* WHO proposed it; the payload shape is the operator form's. */
      source: "agent:R1",
      status: "pending",
      payload: r.payload,
    }));
  const skipped = all.length - rows.length;
  if (rows.length > 0) {
    const { error } = await db.from("review_item").insert(rows);
    if (error) throw new Error(`could not enqueue: ${error.message}`);
  }
  return {
    ...base,
    queued: rows.length,
    skipped,
    payloads: [],
    summary:
      `${head}; queued ${rows.length} as pending` +
      (skipped > 0 ? `, skipped ${skipped} already queued, decided or published` : "") +
      ". Nothing is voter-facing until approved in the console.",
  };
}
