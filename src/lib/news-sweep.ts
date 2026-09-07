/* The corpus sweep — candidate-news-PRD.md §5 (task C7).

   Everything here is PURE: it takes feed text that someone else fetched and
   returns rows. That split is deliberate — the whole point of §5 is that
   coverage becomes verifiable, and a function that reaches the network is not
   verifiable offline. scripts/verify-news-sweep.ts drives this file against
   fixtures; scripts/news-sweep.ts does the fetching.

   What the sweep does NOT do:
   - It does not decide lean. That is per-outlet, in news-sources.ts.
   - It does not match candidates. That is §6 (task C8).
   - It does not store article text. Title, dek, link, date, outlet — no more.
     The cards only ever show a headline and a line; storing the body would
     create a copyright obligation with no product behind it. */

import type { LeanTag, SourceType } from "./news-labels";
import type { Outlet } from "./news-sources";

export interface FeedEntry {
  title: string;
  link: string;
  /** Feed-supplied description/summary, plain text, may be empty. */
  summary: string;
  /** Raw date string as published; unparseable dates are dropped upstream. */
  published: string;
}

export interface SweptArticle {
  title: string;
  /** Normalised, deduped URL. */
  url: string;
  summary: string | null;
  publishedAt: string; // ISO 8601
  publisher: string;
  type: SourceType;
  leanTag: LeanTag;
  countyFips: string | null;
}

/* ---------- feed parsing ---------------------------------------------- */

const TAG = (name: string) =>
  new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");

/** Decode the five XML entities plus numeric refs, and unwrap CDATA. Feeds
    are well-formed XML, so this is enough — we read four fields, not a DOM. */
function text(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block: string, ...names: string[]): string {
  for (const n of names) {
    const m = block.match(TAG(n));
    if (m) return text(m[1]);
  }
  return "";
}

/** Atom puts the URL in an attribute, not a body. Prefer rel="alternate". */
function atomLink(block: string): string {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  const href = (attrs: string) => attrs.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
  const alt = links.find((a) => /rel\s*=\s*["']alternate["']/i.test(a));
  if (alt) return text(href(alt));
  const plain = links.find((a) => !/rel\s*=\s*["']/i.test(a));
  return plain ? text(href(plain)) : "";
}

/** RSS 2.0 `<item>` and Atom `<entry>`, in one pass. Unknown shapes yield
    nothing rather than guesses. */
export function parseFeed(xml: string): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (const m of xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)) {
    const isAtom = m[1].toLowerCase() === "entry";
    const block = m[2];
    const link = isAtom ? atomLink(block) : pick(block, "link", "guid");
    out.push({
      title: pick(block, "title"),
      link,
      summary: pick(block, "description", "summary", "subtitle"),
      published: pick(block, "pubDate", "published", "updated", "dc:date"),
    });
  }
  return out;
}

/* ---------- normalisation + windowing ---------------------------------- */

/** Strip the things that make one article look like several: fragments,
    tracking params, a trailing slash, host case. */
export function normalizeUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  u.hash = "";
  u.hostname = u.hostname.replace(/\.$/, "").toLowerCase();
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|s?ource$)/i.test(key)) {
      u.searchParams.delete(key);
    }
  }
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
  return u.toString();
}

export interface SweepInput {
  /** One fetched feed body per outlet. The caller has already decided which
      outlets are usable (`usableOutlets()`), so an outlet arriving here is
      one the sweep is allowed to read. */
  feeds: readonly { outlet: Outlet; xml: string }[];
  /** Sweep time. Passed in, never read from the clock, so a sweep is
      reproducible from its inputs. */
  now: Date;
  windowDays?: number;
  /** `news-sources.urlBelongsTo`, injected — see the note on that function. */
  belongsTo: (url: string, outlet: Outlet) => boolean;
}

/** Parse, window, attribute and dedupe. Deterministic: same inputs, same
    output, in the same order — which is what makes "equal effort per
    candidate" checkable rather than promised. */
export function sweep(input: SweepInput): SweptArticle[] {
  const windowDays = input.windowDays ?? 14;
  const cutoff = input.now.getTime() - windowDays * 86_400_000;
  const seen = new Map<string, SweptArticle>();

  for (const { outlet, xml } of input.feeds) {
    /* Fail closed: an outlet with no signed-off lean cannot produce a card
       (news-fairness.md §1 — no source, no card), so it produces no row. */
    const leanTag = outlet.leanTag;
    if (leanTag === null) continue;

    for (const entry of parseFeed(xml)) {
      const url = normalizeUrl(entry.link);
      if (!url || !entry.title) continue;

      /* The link must belong to the outlet whose feed we are reading. A feed
         that syndicates someone else's story must not smuggle an off-list
         domain in, and a wire item carried by several papers is attributed to
         the one whose feed produced it — never to a domain we never read. */
      if (!input.belongsTo(url, outlet)) continue;

      const at = new Date(entry.published);
      if (Number.isNaN(at.getTime()) || at.getTime() < cutoff || at.getTime() > input.now.getTime()) {
        continue;
      }

      seen.set(url, {
        title: entry.title,
        url,
        summary: entry.summary || null,
        publishedAt: at.toISOString(),
        publisher: outlet.publisher,
        type: outlet.type,
        leanTag,
        countyFips: outlet.countyFips,
      });
    }
  }

  return [...seen.values()].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url),
  );
}
