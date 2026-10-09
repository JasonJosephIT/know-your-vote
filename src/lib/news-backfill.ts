/* The archive backfill: the decidable half (docs/general-election/
   moody-pipeline-gap-2026-10-09.md, "Can 09-09..10-05 be backfilled?").

   R1 first ran on 2026-10-06, and a feed only holds its last N items, so
   nothing published before about 09-29 was ever reachable, for any candidate.
   This reaches back through each outlet's own archive and hands the result to
   the same matcher and the same review queue as the daily sweep. Nothing here
   publishes; a row reaches a voter only once an operator approves it.

   EQUAL EFFORT. Every usable outlet gets an ARCHIVES entry, checked by
   scripts/verify-news-backfill.ts, and the run reports per outlet what it
   could and could not reach. Coverage is uneven BY OUTLET, never by candidate:
   which outlets keep an archive is the publishers' choice, and the report says
   so instead of hiding it.

   Three ways in, best first:
     paged-feed   WordPress feeds take `paged=N`: the same titled, dek-carrying
                  items as the daily feed, older pages. Matched exactly like the
                  daily sweep.
     url-archive  dated sitemaps that list URLs with no title. Each URL whose
                  slug names a roster surname (slugMayName, one rule for every
                  outlet and every candidate) is fetched once for its title,
                  description and publication date (readPageMeta), then matched
                  like any other article. A story whose slug leaves the name
                  out is missed; the report counts what was skipped.
     none         no archive found; only the current feed is read.

   On top of its archive, every outlet's current feed is read too, and the
   feed's entry wins a shared URL (mergeArticles), as in the daily sweep.

   AI-CRAWLER POLICY. An outlet whose robots.txt names a Claude or Anthropic
   agent in a group that disallows `/` is skipped whole and reported
   (claudeDisallowed). That is the rule AI_POLICY_HOLD records
   (news-sources.ts, founder 2026-09-21), applied to what the robots files say
   today rather than to the 09-17 snapshot: on 2026-10-09 nbcmiami.com,
   clickorlando.com and newsserviceflorida.com said it and are not on the
   hold. Whether the daily sweep should stop reading them is the founder's
   call; the backfill, which reads article pages and not just a feed, does not
   go further into a site that has asked Claude agents not to read it.

   Pure: no network, no clock. scripts/news-backfill.ts does the I/O. */

import { storedText, normalizeUrl, type SweptArticle } from "./news-sweep.ts";
import type { Outlet } from "./news-sources.ts";

export type Archive =
  | { kind: "paged-feed" }
  | {
      kind: "url-archive";
      /** The archive sitemaps covering [from, to]. */
      sitemaps: (from: Date, to: Date) => string[];
      /** Tested against each URL's path: what counts as an article here. */
      include: RegExp;
      /** The listed sitemaps are an index: read only its children whose URL
          matches this and whose lastmod is on or after `from` (Yoast's
          post-sitemapN files, whose lastmod is their newest edit). */
      children?: RegExp;
    }
  | { kind: "none"; reason: string };

/** Each UTC month from `from` to `to`, as [yyyy, mm]. */
export function months(from: Date, to: Date): [string, string][] {
  const out: [string, string][] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (d.getTime() <= to.getTime()) {
    out.push([String(d.getUTCFullYear()), String(d.getUTCMonth() + 1).padStart(2, "0")]);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/** Each UTC day from `from` to `to`, as yyyy-mm-dd. */
export function days(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (d.getTime() <= to.getTime()) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/* Brightspot (the public-media sites): a monthly URL sitemap, and a story
   path of one section then the date: /government-politics/2026-09-01/slug.
   Podcasts and shows have two segments before the date and are left out. */
const brightspot = (host: string): Archive => ({
  kind: "url-archive",
  sitemaps: (from, to) => months(from, to).map(([y, m]) => `https://${host}/sitemap-${y}${m}.xml`),
  include: /^\/[a-z0-9-]+\/\d{4}-\d{2}-\d{2}\/[^/]+$/,
});

const yoast = (host: string): Archive => ({
  kind: "url-archive",
  sitemaps: () => [`https://${host}/sitemap_index.xml`],
  /* /<section>/<slug>/; "uncategorized" holds pre-2022 migration stubs. */
  include: /^\/(?!uncategorized\/)[a-z0-9-]+\/[^/]+\/?$/,
  children: /\/post-sitemap\d*\.xml$/,
});

/** How each usable outlet's archive is reached, as found on 2026-10-09. */
export const ARCHIVES: Readonly<Record<string, Archive>> = Object.freeze({
  // WordPress feeds that page.
  "wsvn.com": { kind: "paged-feed" },
  "lefloridien.com": { kind: "paged-feed" },
  "floridabulldog.org": { kind: "paged-feed" },
  "thewestsidegazette.com": { kind: "paged-feed" },
  "sfltimes.com": { kind: "paged-feed" },
  "floridadaily.com": { kind: "paged-feed" },
  "flvoicenews.com": { kind: "paged-feed" },
  "floridianpress.com": { kind: "paged-feed" },

  // Monthly URL sitemaps.
  "wlrn.org": brightspot("www.wlrn.org"),
  "wusf.org": brightspot("www.wusf.org"),
  "cfpublic.org": brightspot("www.cfpublic.org"),
  "wfsu.org": brightspot("news.wfsu.org"),
  /* One national sitemap per month, split into parts; only /miami/ is ours. */
  "cbsnews.com/miami": {
    kind: "url-archive",
    sitemaps: (from, to) =>
      months(from, to).flatMap(([y, m]) =>
        ["", "-2", "-3"].map((part) => `https://www.cbsnews.com/xml-sitemap/article-${y}-${m}${part}.xml`),
      ),
    include: /^\/miami\/news\/[^/]+\/?$/,
  },
  /* Gzipped monthly sitemaps. Story URLs end in -n<digits>. */
  "diariolasamericas.com": {
    kind: "url-archive",
    sitemaps: (from, to) =>
      months(from, to).map(([y, m]) => `https://www.diariolasamericas.com/sitemap/news-full/sitemap-${y}${m}.xml.gz`),
    include: /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+-n\d+$/,
  },
  /* Arc: one sitemap per day. */
  "local10.com": {
    kind: "url-archive",
    sitemaps: (from, to) =>
      days(from, to).map((d) => `https://www.local10.com/arc/outboundfeeds/sitemap/${d}/?outputType=xml`),
    include: /^\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)?\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/,
  },
  /* One rolling sitemap of the newest ~5,000 articles (back to 2025-08 on
     2026-10-09). */
  "fox35orlando.com": {
    kind: "url-archive",
    sitemaps: () => ["https://www.fox35orlando.com/sitemap.xml?type=articles"],
    include: /^\/news\/[^/]+$/,
  },
  "cltampa.com": yoast("www.cltampa.com"),
  "orlandoweekly.com": yoast("www.orlandoweekly.com"),

  // No archive found.
  "americateve.com": { kind: "none", reason: "sitemap.xml lists only the newest ~95 stories; the feed is read as it stands" },
  "wtsp.com": { kind: "none", reason: "sitemap.xml lists section pages only; the Google News sitemap is ~2 days" },
  "wftv.com": { kind: "none", reason: "the Arc sitemap holds the newest ~400 URLs (~2 days); its per-day path is empty" },

  /* Robots name a Claude agent with Disallow: / (2026-10-09). Skipped at run
     time by claudeDisallowed whatever this says; listed so every usable
     outlet has an entry. */
  "nbcmiami.com": { kind: "none", reason: "robots.txt disallows Claude agents" },
  "clickorlando.com": { kind: "none", reason: "robots.txt disallows Claude agents" },
  "newsserviceflorida.com": { kind: "none", reason: "robots.txt disallows Claude agents" },
});

/* ---- robots.txt ------------------------------------------------------- */

const CLAUDE_AGENTS = /^(anthropic-ai|claudebot|claude-web|claude-user|claude-searchbot)$/i;

interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

function robotsGroups(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value);
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "disallow" && value) current.disallow.push(value);
    if (field === "allow" && value) current.allow.push(value);
  }
  return groups;
}

/** The Claude/Anthropic agents a robots.txt shuts out of the whole site
    (a group naming them with `Disallow: /`). Empty when none. */
export function claudeDisallowed(robotsTxt: string): string[] {
  const out: string[] = [];
  for (const g of robotsGroups(robotsTxt)) {
    if (!g.disallow.includes("/")) continue;
    for (const a of g.agents) if (CLAUDE_AGENTS.test(a)) out.push(a);
  }
  return out;
}

/** Does `User-agent: *` allow this path? Longest matching rule wins, Allow on
    a tie; `*` and a trailing `$` are understood. Our UA falls under `*`. */
export function starAllows(robotsTxt: string, path: string): boolean {
  const rules: { allow: boolean; pattern: string }[] = [];
  for (const g of robotsGroups(robotsTxt)) {
    if (!g.agents.includes("*")) continue;
    for (const p of g.disallow) rules.push({ allow: false, pattern: p });
    for (const p of g.allow) rules.push({ allow: true, pattern: p });
  }
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    const anchored = r.pattern.endsWith("$");
    const body = anchored ? r.pattern.slice(0, -1) : r.pattern;
    const re = new RegExp(
      "^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""),
    );
    if (!re.test(path)) continue;
    const len = r.pattern.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
  }
  return best ? best.allow : true;
}

/* ---- archive sitemaps ------------------------------------------------- */

export interface ArchiveEntry {
  url: string;
  /** lastmod, or "" when the entry has none. */
  lastmod: string;
}

/** The `<url>` entries of a URL sitemap, or the `<sitemap>` entries of an
    index. Unknown shapes yield nothing. */
export function parseSitemapEntries(xml: string, tag: "url" | "sitemap" = "url"): ArchiveEntry[] {
  const out: ArchiveEntry[] = [];
  for (const m of xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi"))) {
    const loc = m[1].match(/<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/i)?.[1]?.replace(/&amp;/g, "&").trim();
    if (!loc) continue;
    const lastmod = m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1] ?? "";
    out.push({ url: loc, lastmod });
  }
  return out;
}

/** The date in a story path (`/2026-09-01/` or `/2026/09/01/`), or null. */
export function pathDate(path: string): Date | null {
  const m = path.match(/\/(\d{4})[-/](\d{2})[-/](\d{2})\//);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Could this archive entry fall in [from, to]? A date in the path decides
    (with a day's slack each side for time zones); otherwise a lastmod before
    `from` rules it out, because an article is never modified before it is
    published. The page's own date settles it after the fetch. */
export function entryMayBeInWindow(entry: ArchiveEntry, from: Date, to: Date): boolean {
  let path: string;
  try {
    path = new URL(entry.url).pathname;
  } catch {
    return false;
  }
  const day = 86_400_000;
  const inPath = pathDate(path);
  if (inPath) return inPath.getTime() >= from.getTime() - day && inPath.getTime() <= to.getTime() + day;
  const mod = new Date(entry.lastmod);
  if (Number.isNaN(mod.getTime())) return true;
  return mod.getTime() >= from.getTime() - day;
}

/* ---- the slug pre-filter ---------------------------------------------- */

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Does this URL's slug contain any of these surnames as a whole word? The
    one pre-filter for every URL-only archive: it decides which pages are
    fetched, not what matches. matchArticle decides that on the page's title
    and description, exactly as for a feed item. */
export function slugMayName(url: string, surnames: ReadonlySet<string>): boolean {
  let path: string;
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    return false;
  }
  return fold(path).split(" ").some((w) => surnames.has(w));
}

/** The surname of a legal name, folded the way slugMayName folds a slug:
    the last token after honorifics, suffixes and quoted nicknames go. Agrees
    with news-match.ts nameParts on every name in the roster (the verify
    script checks). */
export function surnameOf(legalName: string): string | null {
  const dropped = new Set(["mr", "mrs", "ms", "dr", "rep", "sen", "gov", "hon", "the", "jr", "sr", "ii", "iii", "iv"]);
  const tokens = fold(legalName).split(" ").filter((t) => t && !dropped.has(t));
  return tokens.length > 0 ? tokens[tokens.length - 1] : null;
}

/* ---- article pages ---------------------------------------------------- */

export interface PageMeta {
  title: string;
  description: string;
  published: string;
  image: string;
}

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function meta(html: string, key: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content) return decode(content);
  }
  return "";
}

/** Title, description, publication date and image from an article page's
    head: Open Graph first, then the plain tags, then JSON-LD's datePublished. */
export function readPageMeta(html: string): PageMeta {
  const head = html.slice(0, html.search(/<\/head>/i) === -1 ? 400_000 : html.search(/<\/head>/i) + 7);
  const title =
    meta(head, "og:title") || meta(head, "twitter:title") || decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = meta(head, "og:description") || meta(head, "description") || meta(head, "twitter:description");
  const published =
    meta(head, "article:published_time") ||
    meta(head, "datepublished") ||
    meta(head, "parsely-pub-date") ||
    meta(head, "pubdate") ||
    (html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ?? "");
  return { title, description, published, image: meta(head, "og:image") };
}

/** A fetched page as an article, or null when it lacks a title or a date
    inside [from, to]. The archive's path date stands in when the page gives
    none. */
export function pageArticle(
  url: string,
  page: PageMeta,
  outlet: Outlet,
  from: Date,
  to: Date,
): SweptArticle | null {
  const norm = normalizeUrl(url);
  if (!norm || outlet.leanTag === null) return null;
  let at = new Date(page.published);
  if (Number.isNaN(at.getTime())) at = pathDate(new URL(norm).pathname) ?? new Date(NaN);
  if (Number.isNaN(at.getTime()) || at < from || at > to) return null;
  const { title, summary } = storedText({ title: page.title, summary: page.description });
  if (!title) return null;
  return {
    title,
    url: norm,
    summary,
    publishedAt: at.toISOString(),
    publisher: outlet.publisher,
    type: outlet.type,
    leanTag: outlet.leanTag,
    countyFips: outlet.countyFips,
    retrieval: "archive-page",
    imageUrl: page.image || null,
  };
}

/** One article per URL; a feed's entry beats an archive page's (it carries
    the outlet's own dek). Newest first, as sweep() orders. */
export function mergeArticles(...lists: readonly SweptArticle[][]): SweptArticle[] {
  const seen = new Map<string, SweptArticle>();
  for (const list of lists) {
    for (const a of list) {
      const prior = seen.get(a.url);
      if (prior && prior.retrieval !== "archive-page" && a.retrieval === "archive-page") continue;
      seen.set(a.url, a);
    }
  }
  return [...seen.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
}

/** The URL of page `n` of a WordPress feed. */
export function pagedFeedUrl(feed: string, n: number): string {
  return n <= 1 ? feed : `${feed}${feed.includes("?") ? "&" : "?"}paged=${n}`;
}
