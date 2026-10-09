/* The archive backfill run: the network half of src/lib/news-backfill.ts.

   It prints articles as JSON, the same shape scripts/news-sweep.ts prints,
   and writes nothing. Queueing is news-enqueue.ts's job, with
   --candidates-only:

     node scripts/news-backfill.ts --from 2026-09-09 > backfill.json
     node scripts/news-enqueue.ts --candidates-only --dry-run < backfill.json
     node scripts/news-enqueue.ts --candidates-only < backfill.json

   Everything queued is PENDING and reaches a voter only once an operator
   approves it in /admin. Anything already queued, decided or published at a
   URL is skipped there, so overlap with the daily sweep is harmless.

   Reads: each usable outlet's robots.txt, its feed (and older feed pages when
   it pages), its archive sitemaps, and the head of each article page whose
   slug names a roster surname. One request at a time per outlet, a second
   apart. It also reads the roster (read-only) for the surnames, so it needs
   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY like news-enqueue.

   The per-outlet report goes to stderr, and to --report <file> as JSON. It is
   the record of where coverage is uneven by outlet and why. Options:
     --from YYYY-MM-DD   window start, UTC (default 2026-09-09)
     --to   YYYY-MM-DD   window end, inclusive (default: now)
     --only a.com,b.org  just these outlets (list domains) */

import { gunzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import { usableOutlets, urlBelongsTo, type Outlet } from "../src/lib/news-sources.ts";
import { parseFeed, sweep, normalizeUrl, type SweptArticle } from "../src/lib/news-sweep.ts";
import { USER_AGENT, loadRoster } from "../src/lib/news-intake.ts";
import {
  ARCHIVES,
  claudeDisallowed,
  entryMayBeInWindow,
  mergeArticles,
  pageArticle,
  pagedFeedUrl,
  parseSitemapEntries,
  readPageMeta,
  slugMayName,
  starAllows,
  surnameOf,
  type ArchiveEntry,
} from "../src/lib/news-backfill.ts";

loadEnvLocal(import.meta.url);

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const from = new Date(`${opt("--from") ?? "2026-09-09"}T00:00:00Z`);
const to = opt("--to") ? new Date(`${opt("--to")}T23:59:59Z`) : new Date();
const only = opt("--only")?.split(",");
const reportPath = opt("--report");
if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
  console.error("news-backfill: --from and --to must be YYYY-MM-DD with from before to");
  process.exit(1);
}
const windowDays = (to.getTime() - from.getTime()) / 86_400_000;
const MAX_FEED_PAGES = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One GET as text (gunzipped when the body is gzip), or null with the reason.
    A 429 is retried twice, after Retry-After (capped at 60s) or 20s. */
async function get(url: string, accept = "*/*", attempt = 0): Promise<{ text: string } | { error: string }> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 429 && attempt < 2) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 20, 60);
      await sleep(wait * 1000);
      return get(url, accept, attempt + 1);
    }
    if (!res.ok) return { error: `HTTP ${res.status}` };
    let buf = Buffer.from(await res.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
    return { text: buf.toString("utf8") };
  } catch (err) {
    return { error: (err as Error).name };
  }
}

interface OutletReport {
  domain: string;
  archive: string;
  skipped?: string;
  feedPages: number;
  feedArticles: number;
  archiveUrlsInWindow: number;
  slugMatched: number;
  pagesFetched: number;
  pageArticles: number;
  articles: number;
  oldest: string | null;
  failures: string[];
}

async function backfillOutlet(outlet: Outlet, surnames: ReadonlySet<string>): Promise<{ report: OutletReport; articles: SweptArticle[] }> {
  const archive = ARCHIVES[outlet.domain] ?? { kind: "none" as const, reason: "no ARCHIVES entry" };
  const report: OutletReport = {
    domain: outlet.domain,
    archive: archive.kind === "none" ? `none: ${archive.reason}` : archive.kind,
    feedPages: 0,
    feedArticles: 0,
    archiveUrlsInWindow: 0,
    slugMatched: 0,
    pagesFetched: 0,
    pageArticles: 0,
    articles: 0,
    oldest: null,
    failures: [],
  };
  const host = (outlet.feed ? new URL(outlet.feed).host : `www.${outlet.domain.split("/")[0]}`);

  /* robots.txt first: a site that shuts Claude agents out is not read. */
  const robots = await get(`https://${host}/robots.txt`, "text/plain");
  const robotsTxt = "text" in robots ? robots.text : "";
  const shut = claudeDisallowed(robotsTxt);
  if (shut.length > 0) {
    report.skipped = `robots.txt disallows ${shut.join(", ")}`;
    return { report, articles: [] };
  }

  /* The feed, and its older pages when it pages. Stops at the first page
     reaching before `from`, an empty or repeated page, or MAX_FEED_PAGES. */
  const feedArticles: SweptArticle[] = [];
  if (outlet.feed) {
    const seen = new Set<string>();
    const pages = archive.kind === "paged-feed" ? MAX_FEED_PAGES : 1;
    for (let n = 1; n <= pages; n++) {
      const url = pagedFeedUrl(outlet.feed, n);
      const r = await get(url, "application/rss+xml, application/atom+xml");
      if ("error" in r) {
        if (n === 1 || r.error !== "HTTP 404") report.failures.push(`${r.error} ${url}`);
        break;
      }
      const entries = parseFeed(r.text);
      const fresh = entries.filter((e) => !seen.has(e.link));
      if (fresh.length === 0) break;
      for (const e of entries) seen.add(e.link);
      report.feedPages++;
      feedArticles.push(...sweep({ feeds: [{ outlet, xml: r.text }], now: to, windowDays, belongsTo: urlBelongsTo }));
      const oldest = Math.min(...entries.map((e) => new Date(e.published).getTime()).filter((t) => !Number.isNaN(t)));
      if (oldest < from.getTime()) break;
      if (n < pages) await sleep(1000);
    }
  }
  report.feedArticles = feedArticles.length;

  /* URL-only archives: list, filter, pre-filter on surnames, read the pages. */
  const pageArticles: SweptArticle[] = [];
  if (archive.kind === "url-archive") {
    const entries: ArchiveEntry[] = [];
    for (const sm of archive.sitemaps(from, to)) {
      const r = await get(sm, "application/xml, text/xml");
      await sleep(1000);
      if ("error" in r) {
        /* A month's second or third part not existing is normal (CBS). */
        if (!/-[23]\.xml$/.test(sm)) report.failures.push(`${r.error} ${sm}`);
        continue;
      }
      if (archive.children) {
        const kids = parseSitemapEntries(r.text, "sitemap").filter(
          (k) => archive.children!.test(k.url) && entryMayBeInWindow({ url: k.url, lastmod: k.lastmod }, from, to),
        );
        for (const kid of kids) {
          const c = await get(kid.url, "application/xml, text/xml");
          await sleep(1000);
          if ("error" in c) report.failures.push(`${c.error} ${kid.url}`);
          else entries.push(...parseSitemapEntries(c.text));
        }
      } else {
        entries.push(...parseSitemapEntries(r.text));
      }
    }
    const inFeed = new Set(feedArticles.map((a) => a.url));
    const inWindow = [
      ...new Map(
        entries
          .filter((e) => {
            const norm = normalizeUrl(e.url);
            if (!norm || !urlBelongsTo(norm, outlet)) return false;
            const path = new URL(norm).pathname;
            return archive.include.test(path) && entryMayBeInWindow(e, from, to) && starAllows(robotsTxt, path);
          })
          .map((e) => [normalizeUrl(e.url)!, e]),
      ).values(),
    ];
    report.archiveUrlsInWindow = inWindow.length;
    const toRead = inWindow.filter((e) => slugMayName(e.url, surnames));
    report.slugMatched = toRead.length;
    for (const e of toRead) {
      if (inFeed.has(normalizeUrl(e.url)!)) continue;
      const r = await get(e.url, "text/html");
      report.pagesFetched++;
      await sleep(1000);
      if ("error" in r) {
        report.failures.push(`${r.error} ${e.url}`);
        continue;
      }
      const a = pageArticle(e.url, readPageMeta(r.text), outlet, from, to);
      if (a) pageArticles.push(a);
    }
  }
  report.pageArticles = pageArticles.length;

  const articles = mergeArticles(pageArticles, feedArticles);
  report.articles = articles.length;
  report.oldest = articles.length ? articles[articles.length - 1].publishedAt.slice(0, 10) : null;
  return { report, articles };
}

/* ---- run ------------------------------------------------------------------ */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("news-backfill: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (the roster read)");
  process.exit(1);
}
const roster = await loadRoster(createClient(url, key));
if (roster.length === 0) {
  console.error("news-backfill: the roster is empty, so there are no surnames to look for");
  process.exit(1);
}
const surnames = new Set(roster.map((r) => surnameOf(r.legalName)).filter((s): s is string => s !== null));

const outlets = usableOutlets().filter((o) => !only || only.includes(o.domain));
console.error(
  `news-backfill: ${outlets.length} outlet(s), ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}, ` +
    `${roster.length} roster candidates, ${surnames.size} surnames`,
);

/* Outlets run side by side, a few at a time; each outlet's own requests stay
   one at a time. */
const results: { report: OutletReport; articles: SweptArticle[] }[] = [];
const queue = [...outlets];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let o = queue.shift(); o; o = queue.shift()) {
      const r = await backfillOutlet(o, surnames);
      const p = r.report;
      console.error(
        `  ${p.domain.padEnd(24)} ${p.skipped ? `SKIPPED (${p.skipped})` : `${p.articles} articles, oldest ${p.oldest ?? "-"}; ` +
          `feed ${p.feedArticles} over ${p.feedPages} page(s); archive ${p.archiveUrlsInWindow} URLs in window, ` +
          `${p.slugMatched} name a surname, ${p.pagesFetched} read -> ${p.pageArticles}` +
          `${p.failures.length ? `; ${p.failures.length} failure(s)` : ""} [${p.archive}]`}`,
      );
      results.push(r);
    }
  }),
);

const reports = results.map((r) => r.report).sort((a, b) => a.domain.localeCompare(b.domain));
const articles = mergeArticles(...results.map((r) => r.articles));
console.error(`news-backfill: ${articles.length} articles in the window from ${reports.filter((r) => !r.skipped).length} outlets`);
if (reportPath) {
  writeFileSync(reportPath, JSON.stringify({ from: from.toISOString(), to: to.toISOString(), outlets: reports }, null, 2));
}
console.log(JSON.stringify(articles, null, 2));
