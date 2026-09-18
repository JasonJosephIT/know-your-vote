# News sweep retrieval mode 2: Google News sitemaps — design

_2026-09-18. Approved by the founder in session. Implements the "sitemap"
step of the retrieval order in candidate-news-PRD.md §5 ("RSS/Atom →
sitemap.xml / news sitemap → HTML listing → search API. Take the first that
works per outlet and record which")._

## Why now

The Sun Sentinel and the Orlando Sentinel return HTTP 403 on every RSS path to
every user agent, including Firecrawl's stealth proxy, but both serve per-day
Google News sitemaps openly to the sweep's own user agent
(`news-corpus-verification-2026-09-17.md` §3 item 5). They are the only
rated dailies in Broward and Orange. With RSS-only retrieval those two
counties have zero rated outlets with a working feed.

## Scope

- Two outlets: `sun-sentinel.com`, `orlandosentinel.com`.
- Format: Google News sitemap (`urlset` of `url` entries each carrying
  `loc`, `lastmod`, `news:news/news:title`, `news:publication_date`). Both
  papers' sitemaps carry exactly those fields and no keywords, genres or
  section metadata (checked 2026-09-18).
- Not in scope: Miami Herald / AP sitemaps (different shapes, unverified);
  any change to lean handling; the founder's later idea of sending article
  text to a model to characterise candidate or issue (recorded as a PRD
  follow-up; it changes §6's deterministic matching and touches the
  no-full-text rule, so it gets its own design).

## Filter decision

Founder chose the **dated-path filter**: keep only URLs whose path matches
`^/\d{4}/\d{2}/\d{2}/`. This removes obituaries (1–4 per day) and nothing
else; wire sports lives under dated paths and stays in, handled downstream
like wire copy on any TV feed. A metadata filter was the founder's first
preference and is impossible today because the sitemaps carry no metadata;
if a publisher adds `news:keywords`, that filter can be added beside this
one.

## Data model (`src/lib/news-sources.ts`)

```ts
export interface OutletSitemap {
  /** Per-day Google News sitemap URL template. Placeholders {yyyy} {mm} {dd}
      are filled in UTC. */
  daily: string;
  /** Applied to the URL path of every entry. Entries that do not match are
      dropped before they enter the pool. */
  include: RegExp;
}
Outlet.sitemap?: OutletSitemap;
```

- `feed` stays as is (null on both rows, with the existing comments).
- `usableOutlets()`: lean signed off AND (`feed` OR `sitemap`) AND no
  fail-closed flag.
- Invariant: no row has both `feed` and `sitemap`, so retrieval order never
  needs a tie-break rule.

Rows:

```
sun-sentinel.com     sitemap.daily = https://www.sun-sentinel.com/sitemap.xml?yyyy={yyyy}&mm={mm}&dd={dd}
orlandosentinel.com  sitemap.daily = https://www.orlandosentinel.com/sitemap.xml?yyyy={yyyy}&mm={mm}&dd={dd}
both                 sitemap.include = /^\/\d{4}\/\d{2}\/\d{2}\//
```

## Library (`src/lib/news-sweep.ts`, pure)

- `parseNewsSitemap(xml): FeedEntry[]` — one entry per `<url>`:
  `title ← news:title`, `link ← loc`, `published ← news:publication_date`
  (fallback `lastmod`), `summary ← ""`. Unknown shapes yield nothing.
- `SweepInput.feeds[i].format?: "feed" | "news-sitemap"` (default `"feed"`).
  `sweep()` dispatches to `parseFeed` or `parseNewsSitemap`.
- For `news-sitemap` entries, `sweep()` applies `outlet.sitemap.include` to
  `new URL(url).pathname` after normalisation and before the boundary check.
  Missing `sitemap` on the outlet for a `news-sitemap` entry → the entry
  yields nothing (fail closed).
- `SweptArticle.retrieval: "rss" | "news-sitemap"` — the PRD's "record which".
- Everything else (window, boundary, attribution from the list, dedupe,
  ordering) is unchanged and applies identically to both formats.

## Runner (`scripts/news-sweep.ts`)

- For each usable outlet with `feed`: unchanged.
- For each usable outlet with `sitemap`: for each UTC day from
  `now - windowDays` to `now` inclusive, fill the template, fetch, and push
  `{ outlet, xml, format: "news-sitemap" }`. One-second gap between requests.
  A non-200 day is logged with its status and skipped; a day that parses to
  zero entries is logged too. Never retried inside a run.
- The summary line reports feeds and sitemap-days fetched separately.
- `--probe` is unchanged (it discovers RSS only).

Cost: 2 outlets × 15 days = 30 requests per sweep. Both hosts' robots.txt
allow the path under `User-agent: *` with no crawl delay.

## Guardrail (`scripts/verify-news-sweep.ts`)

- `parseNewsSitemap` on a fixture: titles, links, dates come from the right
  elements; summary empty; garbage parses to nothing.
- `sweep()` over a fixture day sitemap for a signed-off Sentinel fixture:
  the obituary is dropped, dated articles kept, `retrieval === "news-sitemap"`,
  an off-list `loc` is dropped, an out-of-window date is dropped, two runs are
  identical, and an RSS fixture in the same run yields `retrieval === "rss"`.
- A `news-sitemap` entry for an outlet without `sitemap` yields nothing.
- List invariants: sitemap template host belongs to the outlet
  (`urlBelongsTo` on the template with placeholders filled); template contains
  all three placeholders; no row has both `feed` and `sitemap`;
  `usableOutlets()` is still 0 (leans null).

## Docs

- PRD C7 note: retrieval mode 2 built; both Sentinels now have a retrieval
  path; the model-characterisation idea recorded as a follow-up under §6.
- Verification doc: Tribune rows say "sitemap (mode 2)" instead of null; §4
  county table becomes Broward 1 / Orange 1 rated outlets with a working
  retrieval path.
