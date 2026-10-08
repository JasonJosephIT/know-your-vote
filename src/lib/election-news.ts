/* R3's queue: election notices from official sources become PENDING review
   items, and nothing else (spec
   docs/superpowers/specs/2026-10-08-news-source-integrity-design.md §3.2.3,
   decisions D5, D6, D7).

   R3, a scheduled Claude agent, reads the government bodies' own pages
   (src/lib/official-sources.ts) and hands scripts/election-news.ts what it
   found. Everything after that reading is decided here: what a well-formed
   batch is, which source each item carries, what is already stored or queued,
   and what the payload is. The I/O is three filtered reads and one insert
   through an injected client, so scripts/verify-election-news.ts proves the
   whole contract offline.

   Nothing here publishes. A queued item reaches a voter only once a person
   approves it in /admin, and the approve path checks its source against its
   URL again (planSourceAttribution in news-enqueue.ts).

   Not here (the agent-retrofit spec's PR B extends this file): the `context`
   step, scope from the publisher, the candidate-name drop, the
   case-for-or-against drop, the date window and the lint drop.

   Relative imports with the extension: plain-Node scripts import this. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { urlNorm } from "./brief-rows.ts";
import { COVERED_FIPS } from "./candidate-leads.ts";
import { OUTLETS, outletForUrl } from "./news-sources.ts";
import { officialForUrl, officialSourceIdFor } from "./official-sources.ts";
import { ManualNewsPayloadSchema, type ManualNewsPayload } from "../types/admin.ts";

/** The most items one `queue` batch may carry. A weekly read of four
    Supervisors and the statewide bodies finds a handful; far past that is a
    runaway or an injected list. */
export const MAX_ELECTION_BATCH = 25;

const FIELDS = ["title", "summary", "url", "published_at", "scope"] as const;
const TEXT_FIELDS = ["title", "summary", "url", "published_at"] as const;

/** County or statewide. There is no metro form: the five legacy metro rows
    stay as they are, and new items name a county. */
export type ElectionScope = { county_fips: string } | { statewide: true };

/** One item as R3 hands it over. */
export interface ElectionNewsItem {
  title: string;
  summary: string;
  url: string;
  published_at: string;
  scope: ElectionScope;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:$|T)/;

const SCOPE_FORMS = 'scope must be { "county_fips": "<5 digits>" } or { "statewide": true }';

function scopeProblem(scope: unknown, entryCounty: string | null): string | null {
  if (!isRecord(scope)) return SCOPE_FORMS;
  const keys = Object.keys(scope);
  if (keys.length === 1 && keys[0] === "statewide") {
    if (scope.statewide !== true) return "scope.statewide must be true";
    /* A county Supervisor's notice is about that county. Statewide would put
       it on every county's feed. (A county scope on a statewide body's page is
       still accepted; the retrofit's PR B sets scope from the publisher.) */
    if (entryCounty !== null) return `a county body's page is scoped to its county ${entryCounty}, not statewide`;
    return null;
  }
  if (keys.length === 1 && keys[0] === "county_fips") {
    const fips = scope.county_fips;
    if (typeof fips !== "string" || !/^\d{5}$/.test(fips)) return "scope.county_fips must be 5 digits";
    if (!COVERED_FIPS.has(fips)) return `scope.county_fips ${fips} is not a covered county`;
    if (entryCounty !== null && entryCounty !== fips) {
      return `scope.county_fips ${fips} differs from the publisher's county ${entryCounty}`;
    }
    return null;
  }
  return `${SCOPE_FORMS}; there is no metro scope`;
}

/** R3's items are untrusted input. The first problem, naming the item's index
    (0-based, as candidate-leads.ts `mentionProblem` does), or null when the
    whole batch is well formed. The caller refuses the whole batch on a
    problem, so a run never leaves a partial queue. */
export function batchProblem(raw: unknown): string | null {
  if (!Array.isArray(raw)) return "the batch is not an array of items";
  if (raw.length > MAX_ELECTION_BATCH) {
    return `batch of ${raw.length} items is over the ${MAX_ELECTION_BATCH}-item cap`;
  }
  for (const [i, item] of raw.entries()) {
    if (!isRecord(item)) return `item ${i} is not an object`;
    const unknown = Object.keys(item).filter((k) => !(FIELDS as readonly string[]).includes(k));
    if (unknown.length > 0) return `item ${i}: unknown field ${unknown.join(", ")}`;
    for (const f of FIELDS) if (!(f in item)) return `item ${i}: missing field ${f}`;
    for (const f of TEXT_FIELDS) if (typeof item[f] !== "string") return `item ${i}: ${f} must be a string`;
    const url = item.url as string;
    const published = item.published_at as string;
    /* Written YYYY-MM-DD, optionally with a time: Date.parse alone reads "1"
       as 2001. The date window is the retrofit's PR B. */
    if (!ISO_DATE.test(published) || Number.isNaN(Date.parse(published))) {
      return `item ${i}: published_at "${published}" is not a date written YYYY-MM-DD`;
    }
    if (!isHttpUrl(url)) return `item ${i}: url must be an http(s) URL`;
    const outlet = outletForUrl(url, OUTLETS);
    if (outlet) return `item ${i}: ${url} is on the outlet list (${outlet.domain}); R3 queues official sources only`;
    const official = officialForUrl(url);
    if (!official) return `item ${i}: ${url} is not on the official-source list (src/lib/official-sources.ts)`;
    const scope = scopeProblem(item.scope, official.countyFips);
    if (scope) return `item ${i}: ${scope}`;
  }
  return null;
}

/** A `source` row already recorded for one of the batch's pages. */
export interface PageRow {
  source_id: string;
  url_norm: string;
  type: string;
  lean_tag: string;
}

/** What the database already holds for this batch's URLs. */
export interface QueueContext {
  /** `source` rows keyed by url_norm. */
  pageRows: ReadonlyMap<string, PageRow>;
  /** URLs in news_item, under any candidate or none. */
  storedUrls: ReadonlySet<string>;
  /** URLs in a manual_news review item of any status. */
  queuedUrls: ReadonlySet<string>;
}

export interface ElectionQueueRow {
  kind: "manual_news";
  source: "agent:R3";
  status: "pending";
  payload: ManualNewsPayload;
}

/** A skipped or dropped item: its index in the batch and why. */
export interface QueueNotice {
  index: number;
  url: string;
  reason: string;
}

export type ElectionQueuePlan =
  | { ok: true; rows: ElectionQueueRow[]; skipped: QueueNotice[]; dropped: QueueNotice[] }
  | { ok: false; error: string };

/** The rows `election-news.ts queue` would insert, from a batch that passed
    batchProblem. Per item, in order:
      1. Source. A page row already recorded for this URL backs it when it is
         `primary_doc` / `N/A`; one recorded as anything else is DROPPED (an
         agency's advocacy page keeps its true type, D7). With no page row,
         the item carries `official:<domain>`.
      2. Skip (not an error): a URL already in news_item, in a manual_news
         item of any status, or earlier in this batch.
      3. Build the payload and parse it with the console's own schema. One
         failure refuses the batch. */
export function planElectionQueue(items: readonly ElectionNewsItem[], ctx: QueueContext): ElectionQueuePlan {
  const rows: ElectionQueueRow[] = [];
  const skipped: QueueNotice[] = [];
  const dropped: QueueNotice[] = [];
  const inBatch = new Set<string>();
  /* One page, however it is spelled: urlNorm is the key source.url_norm uses
     (scheme and trailing slash do not matter; www. and the query do). */
  const key = (url: string) => urlNorm(url) ?? url;
  const stored = new Set([...ctx.storedUrls].map(key));
  const queued = new Set([...ctx.queuedUrls].map(key));

  for (const [index, item] of items.entries()) {
    const official = officialForUrl(item.url);
    if (!official) return { ok: false, error: `item ${index}: ${item.url} is not on the official-source list` };

    const norm = urlNorm(item.url);
    const page = norm === null ? undefined : ctx.pageRows.get(norm);
    if (page && (page.type !== "primary_doc" || page.lean_tag !== "N/A")) {
      dropped.push({
        index,
        url: item.url,
        reason: `this page is recorded as ${page.type} / ${page.lean_tag}, not an official notice`,
      });
      continue;
    }
    const sourceId = page ? page.source_id : officialSourceIdFor(official.domain);

    const k = key(item.url);
    const skip = stored.has(k)
      ? "already in news_item"
      : queued.has(k)
        ? "already in a manual_news review item"
        : inBatch.has(k)
          ? "repeats an earlier item in this batch"
          : null;
    inBatch.add(k);
    if (skip) {
      skipped.push({ index, url: item.url, reason: skip });
      continue;
    }

    const parsed = ManualNewsPayloadSchema.safeParse({
      item_type: "election_news",
      title: item.title,
      summary: item.summary.trim() === "" ? null : item.summary,
      url: item.url,
      published_at: new Date(item.published_at).toISOString(),
      ...("statewide" in item.scope ? { statewide: true } : { county_fips: item.scope.county_fips }),
      source_id: sourceId,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: `item ${index}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
      };
    }
    rows.push({ kind: "manual_news", source: "agent:R3", status: "pending", payload: parsed.data });
  }
  return { ok: true, rows, skipped, dropped };
}

/** How many values one filtered read asks for (news-source-integrity §3.7). */
export const QUEUE_READ_CHUNK = 200;

function chunks<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** The URL and its common other spellings of the same page: http or https,
    with or without a trailing slash on the path. The stored URL is matched
    exactly by the read, so asking for these finds a page stored under another
    spelling; planElectionQueue then compares by urlNorm. */
function spellings(url: string): string[] {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return [url];
  }
  const path = u.pathname.replace(/\/+$/, "");
  const out = new Set([url]);
  for (const scheme of ["https:", "http:"]) {
    for (const p of [path, `${path}/`]) out.add(`${scheme}//${u.host}${p}${u.search}`);
  }
  return [...out];
}

/** The three reads, each filtered to this batch's URLs in chunks of 200, so a
    response is bounded by the batch and never by the size of the table
    (news-source-integrity §3.7). Throws on a read error: a partial read would
    queue a story an operator already decided. `chunkSize` is a parameter
    only so the guardrail can drive the chunking with a small batch. */
export async function readQueueContext(
  db: SupabaseClient,
  items: readonly ElectionNewsItem[],
  chunkSize: number = QUEUE_READ_CHUNK,
): Promise<QueueContext> {
  const urls = [...new Set(items.flatMap((i) => spellings(i.url)))];
  const norms = [...new Set(items.map((i) => urlNorm(i.url)).filter((n): n is string => n !== null))];

  const pageRows = new Map<string, PageRow>();
  for (const chunk of chunks(norms, chunkSize)) {
    const { data, error } = await db
      .from("source")
      .select("source_id, url_norm, type, lean_tag")
      .in("url_norm", chunk);
    if (error) throw new Error(`could not read source rows: ${error.message}`);
    for (const r of (data ?? []) as PageRow[]) pageRows.set(r.url_norm, r);
  }

  const storedUrls = new Set<string>();
  for (const chunk of chunks(urls, chunkSize)) {
    const { data, error } = await db.from("news_item").select("url").in("url", chunk);
    if (error) throw new Error(`could not read news_item: ${error.message}`);
    for (const r of (data ?? []) as { url: string }[]) storedUrls.add(r.url);
  }

  const queuedUrls = new Set<string>();
  for (const chunk of chunks(urls, chunkSize)) {
    const { data, error } = await db
      .from("review_item")
      .select("payload")
      .eq("kind", "manual_news")
      .in("payload->>url", chunk);
    if (error) throw new Error(`could not read review_item: ${error.message}`);
    for (const r of (data ?? []) as { payload: { url?: string } | null }[]) {
      if (r.payload?.url) queuedUrls.add(r.payload.url);
    }
  }
  return { pageRows, storedUrls, queuedUrls };
}

export interface QueueOutcome {
  /** 0 for a complete run, 0 queued included; 1 when nothing was written. */
  exitCode: 0 | 1;
  /** The stdout object, or null when the batch was refused or a read or the
      insert failed. */
  output: { rows: ElectionQueueRow[]; skipped: QueueNotice[]; dropped: QueueNotice[] } | null;
  /** The one stderr line. */
  line: string;
}

/** The whole `queue` run against an injected client. With `dryRun` it still
    reads (to report skips) and writes nothing; otherwise the only write is one
    insert of pending manual_news review items, source 'agent:R3'. */
export async function runElectionQueue(
  db: SupabaseClient,
  raw: unknown,
  opts: { dryRun: boolean },
): Promise<QueueOutcome> {
  const refused = (why: string): QueueOutcome => ({
    exitCode: 1,
    output: null,
    line: `election-news: batch refused, nothing written: ${why}`,
  });
  const problem = batchProblem(raw);
  if (problem) return refused(problem);
  const items = raw as ElectionNewsItem[];

  let ctx: QueueContext;
  try {
    ctx = await readQueueContext(db, items);
  } catch (err) {
    return { exitCode: 1, output: null, line: `election-news: ${(err as Error).message}; nothing written` };
  }
  const plan = planElectionQueue(items, ctx);
  if (!plan.ok) return refused(plan.error);

  const output = { rows: plan.rows, skipped: plan.skipped, dropped: plan.dropped };
  const counts = `${plan.rows.length}, skipped ${plan.skipped.length}, dropped ${plan.dropped.length}`;
  if (opts.dryRun) return { exitCode: 0, output, line: `would queue ${counts}` };
  if (plan.rows.length > 0) {
    const { error } = await db.from("review_item").insert(plan.rows);
    if (error) return { exitCode: 1, output: null, line: `election-news: could not queue: ${error.message}; nothing written` };
  }
  return { exitCode: 0, output, line: `queued ${counts}` };
}
