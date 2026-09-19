/* Ingesting a candidate's own site — the decidable half.

   WHAT THIS IS FOR. A candidate's site is the primary source for what they
   say they will do: CAP_Change_Spec_Stances_and_RelatedNews_v1.md §5 puts
   "the candidate's own words, official site or issue page" at the top of the
   sourcing hierarchy, source type `candidate_self`. This file turns one of
   those sites into PASSAGES: short runs of the candidate's own text, each
   carrying the page it came from.

   THE PASSAGE IS THE CITATION. Nothing downstream may paraphrase. A Jev Noul
   returns a number and cannot emit text (src/lib/policy-noul.ts explains why
   that matters), so the quote shown next to a policy is this verbatim text and
   the link is this url. A citation can therefore be wrong about RELEVANCE, and
   can never be fabricated.

   Pure and offline: no fetch, no clock, no DB. The network lives in
   scripts/candidate-site-ingest.ts, which is a thin caller over these rules.
   scripts/verify-candidate-site.ts drives this file. */

import { policyAreaIdsFor } from "./policy-areas.ts";

/** One run of text from one page, with everything needed to cite it. */
export interface Passage {
  /** Stable across runs: same url and text give the same id. */
  id: string;
  url: string;
  /** Nearest preceding heading on the page, or null when the text stands
      alone. Sent to the model as context and shown to a human as the section
      a quote came from. */
  heading: string | null;
  /** Verbatim, whitespace-collapsed. Never edited, never summarized. */
  text: string;
}

/* Paths and link texts that mark a policy page. A campaign site puts its
   platform behind one of a small number of words, and this list is the whole
   of the guess — everything else on the site is ignored rather than crawled.

   Deliberately NOT a general crawler: a site's news posts, endorsements and
   event listings are not what the candidate says they will do, and fetching
   them would spend requests to produce passages that fail the commitment gate
   downstream anyway. */
export const POLICY_PATH_HINTS: readonly string[] = [
  "issue",
  "issues",
  "platform",
  "priorities",
  "agenda",
  "policy",
  "policies",
  "plan",
  "plans",
  "where-i-stand",
  "where-we-stand",
  "vision",
  "on-the-issues",
];

/* Anything under these never holds a stated position, and each one costs a
   request. Checked as a path segment, so "/about-david" is skipped while
   "/issues/about-our-water-plan" is not. */
const SKIP_PATH_HINTS: readonly string[] = [
  "donate",
  "contribute",
  "store",
  "shop",
  "events",
  "volunteer",
  "privacy",
  "terms",
  "contact",
  "media",
  "press",
  "news",
  "feed",
  "wp-admin",
  "wp-content",
  "wp-json",
  "cdn-cgi",
];

const SKIP_EXTENSIONS =
  /\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|mp4|mp3|zip|css|js|xml|rss)$/i;

/** Normalized for comparison: no fragment, no query, no trailing slash, and
    lowercase host. Query strings on a campaign site are trackers, and two
    urls that differ only by one are the same page fetched twice. */
export function canonicalizeUrl(raw: string, base?: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  url.hash = "";
  url.search = "";
  url.hostname = url.hostname.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.length > 0 ? path : "/";
  return url.toString();
}

/** Same site, ignoring a leading `www.`. A campaign that redirects between
    apex and www is one site, and treating them as two doubles every fetch. */
export function isSameSite(a: string, b: string): boolean {
  try {
    const strip = (h: string) => h.replace(/^www\./i, "").toLowerCase();
    return strip(new URL(a).hostname) === strip(new URL(b).hostname);
  } catch {
    return false;
  }
}

const segments = (url: string): string[] => {
  try {
    return new URL(url).pathname.toLowerCase().split("/").filter(Boolean);
  } catch {
    return [];
  }
};

/** True when any path segment starts with a policy hint. Prefix, not equality,
    so "/issues", "/the-issues" and "/issues-2026" all count. */
export function looksLikePolicyPath(url: string): boolean {
  return segments(url).some((seg) =>
    POLICY_PATH_HINTS.some((hint) => seg === hint || seg.startsWith(`${hint}-`) || seg.startsWith(`the-${hint}`))
  );
}

function isSkippablePath(url: string): boolean {
  if (SKIP_EXTENSIONS.test(url)) return true;
  return segments(url).some((seg) => SKIP_PATH_HINTS.includes(seg));
}

/** An `<a>` from a page: where it points and what it says. */
export interface SiteLink {
  url: string;
  text: string;
}

const TAG = /<[^>]+>/g;

/** Decode the entities a campaign CMS actually emits. Not a full entity
    table: an unknown entity is left alone rather than guessed at, because a
    wrong guess would corrupt a verbatim quote. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;|&#38;/gi, "&")
    .replace(/&lt;|&#60;/gi, "<")
    .replace(/&gt;|&#62;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, "’")
    .replace(/&lsquo;|&#8216;/gi, "‘")
    .replace(/&ldquo;|&#8220;/gi, "“")
    .replace(/&rdquo;|&#8221;/gi, "”")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&hellip;|&#8230;/gi, "…");
}

const clean = (html: string): string =>
  decodeEntities(html.replace(TAG, " ")).replace(/\s+/g, " ").trim();

/** Everything a page links to, with its anchor text. */
export function extractLinks(html: string, pageUrl: string): SiteLink[] {
  const out: SiteLink[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const url = canonicalizeUrl(href, pageUrl);
    if (!url) continue;
    out.push({ url, text: clean(m[2]) });
  }
  return out;
}

/** The last path segment as words: "/homeowners-insurance/" -> "homeowners
    insurance". What a campaign names a page is usually what the page is. */
export function pathWords(url: string): string {
  const last = segments(url).at(-1) ?? "";
  return last.replace(/[-_]+/g, " ").trim();
}

/** True when a link NAMES a policy area, by its path or its anchor text.

    This reuses src/lib/policy-areas.ts rather than growing a second list of
    topic words: "/environment" and "/homeowners-insurance" are policy pages
    that the word "issues" never appears in, and the taxonomy already knows
    what a policy area is called. A link that names no area is not followed on
    this ground. */
export function namesPolicyArea(link: SiteLink): boolean {
  return (
    policyAreaIdsFor({ title: pathWords(link.url) }).length > 0 ||
    policyAreaIdsFor({ title: link.text }).length > 0
  );
}

/** The pages worth fetching, in the order to fetch them.

    Ranked, not filtered by rank, because the cap is what protects someone
    else's server and the cap should spend itself on the best pages first:

      1. the path names a policy SECTION ("/issues", "/platform"),
      2. the link names a policy AREA ("/environment", "Homeowners insurance"),
      3. the anchor text says "issues" and the path does not.

    Same-site only, skippable sections dropped, deduped, capped. */
export function selectPolicyPages(
  links: readonly SiteLink[],
  siteUrl: string,
  limit = 8
): string[] {
  const seen = new Set<string>();
  const byPath: string[] = [];
  const byArea: string[] = [];
  const byText: string[] = [];
  for (const link of links) {
    if (!isSameSite(link.url, siteUrl)) continue;
    if (isSkippablePath(link.url)) continue;
    if (seen.has(link.url)) continue;
    const lowerText = link.text.toLowerCase();
    const textHit = POLICY_PATH_HINTS.some((h) => lowerText.includes(h));
    if (looksLikePolicyPath(link.url)) {
      seen.add(link.url);
      byPath.push(link.url);
    } else if (namesPolicyArea(link)) {
      seen.add(link.url);
      byArea.push(link.url);
    } else if (textHit) {
      seen.add(link.url);
      byText.push(link.url);
    }
  }
  return [...byPath, ...byArea, ...byText].slice(0, limit);
}

/* Boilerplate that appears on every page of a campaign site. Dropped by
   PREFIX or exact match on the collapsed text, never by substring: a sentence
   that happens to contain "donate" is a sentence, and cutting it would edit
   the candidate's words. */
const BOILERPLATE = [
  /^paid for by\b/i,
  /^copyright\b/i,
  /^©/,
  /^all rights reserved\b/i,
  /^privacy policy\b/i,
  /^terms (of|and)\b/i,
  /^sign up\b/i,
  /^subscribe\b/i,
  /^donate\b/i,
  /^chip in\b/i,
  /^follow (us|along)\b/i,
  /^share (this|on)\b/i,
  /^skip to\b/i,
  /^javascript is (required|disabled)/i,
  /^by (providing|submitting|signing)/i,
  /^msg (&|and) data rates/i,
];

/** Shortest text that can carry a policy commitment. A campaign bullet can be
    one clause ("Cap property insurance rate increases"), so this is low; the
    commitment gate in policy-noul.ts is what rejects the short strings that
    are not commitments, and it can only do that if they reach it. */
export const MIN_PASSAGE_CHARS = 40;

/** Longest text kept whole. Past this a "passage" is a whole page, which no
    longer quotes as a citation. Nothing is truncated: an over-long block is
    split on sentence boundaries so every piece stays verbatim. */
export const MAX_PASSAGE_CHARS = 700;

function splitLong(text: string): string[] {
  if (text.length <= MAX_PASSAGE_CHARS) return [text];
  const out: string[] = [];
  let current = "";
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (current.length > 0 && current.length + sentence.length > MAX_PASSAGE_CHARS) {
      out.push(current.trim());
      current = "";
    }
    current += `${sentence} `;
  }
  if (current.trim().length > 0) out.push(current.trim());
  return out;
}

/* FNV-1a. A short, stable, dependency-free id — this is a de-duplication key,
   not a security boundary. */
export function passageId(url: string, text: string): string {
  let hash = 0x811c9dc5;
  for (const ch of `${url}\u0000${text}`) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Strip what is not prose, then read block elements in document order.

    Regex over HTML is the right tool here and not a compromise: the job is to
    keep runs of text and the heading above them, no tree is needed for that,
    and a parser dependency would be a new package in the bundle for one
    script. Malformed markup degrades to fewer passages, never to a wrong
    quote — the text between two tags is still the text between two tags. */
export function extractPassages(html: string, url: string): Passage[] {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|head|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer)\b[\s\S]*?<\/\1>/gi, " ");

  const passages: Passage[] = [];
  const seen = new Set<string>();
  let heading: string | null = null;

  for (const m of body.matchAll(
    /<(h1|h2|h3|h4|h5|h6|p|li|blockquote|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi
  )) {
    const tag = m[1].toLowerCase();
    const text = clean(m[2]);
    if (text.length === 0) continue;

    if (/^h[1-6]$/.test(tag)) {
      /* A heading is context for what follows, not a passage of its own: on
         its own it states no position, and as a citation it would quote a
         label rather than a commitment. */
      heading = text;
      continue;
    }
    if (text.length < MIN_PASSAGE_CHARS) continue;
    if (BOILERPLATE.some((re) => re.test(text))) continue;

    for (const part of splitLong(text)) {
      if (part.length < MIN_PASSAGE_CHARS) continue;
      const key = part.toLowerCase();
      /* Same text twice on one page is a layout artifact (a mobile and a
         desktop copy of one block). Across pages it is caught by the caller,
         which sees every page. */
      if (seen.has(key)) continue;
      seen.add(key);
      passages.push({ id: passageId(url, part), url, heading, text: part });
    }
  }
  return passages;
}

/** Drop passages repeated across pages: a site-wide callout is not a position
    on the page that happens to carry it. First occurrence wins, so the
    citation points at the page where the text first appeared in fetch order. */
export function dedupeAcrossPages(passages: readonly Passage[]): Passage[] {
  const seen = new Set<string>();
  const out: Passage[] = [];
  for (const p of passages) {
    const key = p.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Minimal robots.txt: the Disallow rules that apply to us.

    Only `User-agent: *` groups are read, and `Allow` is honored when it is a
    longer match than the Disallow, which is the documented precedence. An
    unparseable or missing file means no rules, which is the correct reading of
    "no robots.txt" and the only safe one for a site that never had any. */
export function disallowedPaths(robotsTxt: string): string[] {
  const rules: string[] = [];
  let inStar = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (line.length === 0) continue;
    const [field, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const name = field.trim().toLowerCase();
    if (name === "user-agent") {
      inStar = value === "*";
      continue;
    }
    if (inStar && name === "disallow" && value.length > 0) rules.push(value);
  }
  return rules;
}

export function isAllowedByRobots(robotsTxt: string, url: string): boolean {
  let path: string;
  try {
    path = new URL(url).pathname || "/";
  } catch {
    return false;
  }
  return !disallowedPaths(robotsTxt).some((rule) => path.startsWith(rule));
}
