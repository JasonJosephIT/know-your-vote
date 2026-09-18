# News corpus — feed verification, 2026-09-17

Companion to [news-corpus-2026-09-17.md](news-corpus-2026-09-17.md) (the
research) and `src/lib/news-sources.ts` (the list). This is the evidence for
every `feed` value in the list, produced by fetching each URL the corpus
proposed — plus the CMS-family patterns it named — with the sweep's own user
agent (`KnowYourVote/1.0`) and parsing the body with `src/lib/news-sweep.ts`.
The corpus's promotion threshold was applied: **XML parses and the newest item
is dated within the last 7 days.** One exception is flagged below.

What this closes: **gate C7-b (`feed`)** for 31 of 37 listed outlets (29 on
the plain-fetch pass, two more on the Firecrawl pass in §5).
What it does not close: **gate C7-a (`leanTag`)**. Every lean is still null.
`usableOutlets()` still returns 0, by design, until the founder signs off.

## 1. Feeds by outlet

"Depth" is the age of the oldest item in the feed at fetch time — how far back
one fetch reaches. Compare it with the 14-day window before reading §3.
Feed URLs are shown without scheme and `www.`; the value in
`src/lib/news-sources.ts` is authoritative (for Florida's Voice the `www.`
host 403s, so the difference is real).

### Miami-Dade (12086)

| Outlet | Feed | Items | Newest | Depth | Notes |
|---|---|---|---|---|---|
| WLRN | `wlrn.org/tags/news.rss` | 10 | 0.3 d | 1.3 d | `/politics.rss` is stale (2.7 y). Corpus's podcast RSS is live but is episodes, not articles. |
| WPLG Local 10 | `local10.com/arc/outboundfeeds/rss/?outputType=xml` | 100 | 0 d | 1.6 d | Arc XP. |
| WSVN 7News | `wsvn.com/news/feed/` | 50 | 0 d | 1.3 d | Site root `/feed/` holds only 10; the news-section feed is a strict superset. `?paged=2` works. |
| NBC6 | `nbcmiami.com/?rss=y` | 52 | 0 d | 2.5 d | robots.txt explicitly allows `/?rss=y&most_recent=y`. |
| Miami New Times | `miaminewtimes.com/feed/` | 10 | 0.3 d | 0.6 d | `/miami/Rss.xml` redirects here. |
| CBS News Miami | `cbsnews.com/miami/latest/rss/main` | 30 | 0 d | — | Includes one evergreen item (281 d); the rest is current. **Moved to Miami-Dade** (§2). |
| Diario Las Américas | `diariolasamericas.com/rss/pages/florida.xml` | 20 | 0.1 d | 2.2 d | Spanish. `/rss/home.xml` last updated 2019; the Florida section feed is live. |
| Le Floridien | `lefloridien.com/feed/` | 10 | 0.5 d | 7.3 d | Biweekly; first item is the e-edition post. |
| América TeVé | `americateve.com/rss/pages/miami.xml` | 20 | 0.2 d | 22.2 d | Spanish. Feed index at `/contenidos/rss.html` found by Firecrawl site map (§5); verified with the sweep UA. `/rss/pages/opinion.xml` exists but is 23 d stale. |
| The Miami Times | `miamitimesonline.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc` | 25 | 0 d | 0.7 d | BLOX. 200 via Firecrawl and via `curl` with the sweep UA; the next request 429'd (§3). **Flagged `syndicated`** — excluded from `usableOutlets()` until the runner re-attributes; see §3 item 6. |
| Miami Herald | **null** | | | | Arc RSS path is a real 404 page (confirmed through Firecrawl, §5); times out for the sweep UA. No RSS. |
| el Nuevo Herald | **null** | | | | Same CMS, same 404. Writing staff eliminated 2026-09-10; kept for auditability. |

### Broward (12011)

| Outlet | Feed | Items | Newest | Depth | Notes |
|---|---|---|---|---|---|
| Florida Bulldog | `floridabulldog.org/feed/` | 5 | 0.8 d | 18.8 d | Investigative cadence. robots: `Crawl-Delay: 10`. |
| The Westside Gazette | `thewestsidegazette.com/feed/` | 10 | **7.6 d** | 8.6 d | **Over the 7-day threshold by half a day.** A weekly's normal cadence; included, founder may veto. |
| South Florida Times | `sfltimes.com/feed` | 10 | 0.4 d | 1.3 d | |
| Sun Sentinel | **sitemap (mode 2)** `sun-sentinel.com/sitemap.xml?yyyy=&mm=&dd=` | | | | `/feed/` and `/opinion/feed/` (both advertised on the homepage) return **HTTP 403 to the sweep UA, a browser UA, and Firecrawl's stealth proxy**. A WAF, not a wrong path. Built 2026-09-18; smoke run: 1126 dated articles over 15 days, 0 obituaries. Today's UTC day may 404 until the paper publishes; the runner skips it. |
| OutSFL | **null** | | | | Every feed path 302s to the HTML homepage. |

Broward's daily is reachable again through retrieval mode 2 (below); it still has no television outlet with a working feed.
CBS Miami moved to Miami-Dade.
The three weeklies remain. This is the corpus's "acute gap", worse.

### Hillsborough (12057)

| Outlet | Feed | Items | Newest | Depth | Notes |
|---|---|---|---|---|---|
| Tampa Bay Times | `tampabay.com/arc/outboundfeeds/rss/category/news/?outputType=xml` | 100 | 0.1 d | 24.6 d | **Corpus said no native RSS; Arc RSS exists.** The news-section feed is the only one deep enough to cover 14 days; the site root feed holds ~2.4 d. `/category/opinion/` has one item, 56 d old. |
| WUSF | `wusf.org/news.rss` | 10 | 0 d | 0.7 d | `/politics-issues.rss` also live (10, 2.3 d). Corpus's `/tags/local-news.rss` is stale (161 d). |
| WFLA | `wfla.com/news/florida/feed/` | 50 | 0.2 d | 6.2 d | Corpus-verified path, re-verified. `?paged=2` 404s. |
| 10 Tampa Bay | `wtsp.com/feeds/syndication/rss/news` | 40 | 0 d | 0.4 d | TEGNA. |
| Creative Loafing | `cltampa.com/feed/?partner-feed=all` | 25 | 0.4 d | 2.3 d | Plain `/feed/` holds 10. |

### Orange (12095)

| Outlet | Feed | Items | Newest | Depth | Notes |
|---|---|---|---|---|---|
| Central Florida Public Media | `cfpublic.org/politics.rss` | 12 | 2 d | 9.5 d | Corpus-verified `podcast/engage/rss.xml` is 200 podcast episodes, not articles. `/news.rss` holds 2 items. `/tags/*.rss` are all years stale. |
| WFTV | `wftv.com/arc/outboundfeeds/rss/?outputType=xml` | 15 | 0 d | 0.5 d | Corpus verified only the sitemap; the Arc RSS is live. |
| WESH | `wesh.com/topstories-rss` | 20 | 0 d | 0.2 d | Hearst. robots: `Crawl-Delay: 10`. |
| Orlando Weekly | `orlandoweekly.com/feed/?partner-feed=all` | 25 | 0.2 d | 2.5 d | |
| **WKMG News 6** (new) | `clickorlando.com/arc/outboundfeeds/rss/?outputType=xml` | 20 | 0 d | 1.0 d | Corpus: "add after verification". Verified. |
| **FOX 35 Orlando** (new) | `fox35orlando.com/rss/category/news` | 25 | 0 d | 1.6 d | Corpus: same. Studios in Lake Mary (Seminole) — see §2. |
| Orlando Sentinel | **sitemap (mode 2)** `orlandosentinel.com/sitemap.xml?yyyy=&mm=&dd=` | | | | Same Tribune/Alden WAF as the Sun Sentinel: 403 to every UA; Firecrawl declines the site outright. Built 2026-09-18; smoke run: 1366 dated articles over 15 days, 0 obituaries. Today's UTC day may 404 until the paper publishes; the runner skips it. |

### Statewide

| Outlet | Feed | Items | Newest | Depth | Notes |
|---|---|---|---|---|---|
| Florida Phoenix | `floridaphoenix.com/feed/` | 100 | 0.3 d | 16.3 d | Carries commentary in the same feed; `/category/commentary/feed/` 403s. **Flagged `mixedFeed`** — excluded from `usableOutlets()` until the runner splits on `<category>`; see §2. |
| News Service of Florida | `newsserviceflorida.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc` | 25 | 0.4 d | 7.2 d | BLOX. Verified once; every later fetch was HTTP 429 (§3). |
| WFSU | `news.wfsu.org/state-news.rss` | 10 | 0.6 d | 6.2 d | Corpus's podcast path last updated 2022. |
| Florida Politics | `floridapolitics.com/feed/` | 10 | 0.1 d | **0.2 d** | Ten items cover ~5 hours. `?paged=2` and `?paged=5` work (§3). Opinion feed paths 404. **Flagged `mixedFeed`**: 3 of 10 items carried the "Emails & Opinions" category and two had "Guest Author" bylines; see §2. |
| **Florida Daily** (new) | `floridadaily.com/feed/` | 12 | 1.2 d | 3.6 d | |
| **Florida's Voice** (new) | `flvoicenews.com/feed/` | 15 | 0.3 d | 1.3 d | Apex host only; `www.` returns 403. robots.txt itself 403s. |
| **The Floridian** (new) | `floridianpress.com/feed/` | 18 | 0.2 d | 1.4 d | robots: `Crawl-delay: 600`. |
| Associated Press | **null** | | | | No public RSS; robots.txt disallows `/*.rss`; hub pages 403. Ratings exist per the corpus (none fetched); its basis says so rather than "none found". |

## 2. Decisions taken (reversible by PR)

- **CBS News Miami → Miami-Dade.** WFOR's studios are on NW 18th Terrace in
  Doral, which is Miami-Dade, and the corpus flagged the row for exactly this
  check. The first draft had it in Broward.
- **No `opinion` rows.** The sweep dedupes by URL with last-writer-wins, so an
  opinion row sharing its reporting row's feed would silently relabel
  articles. No daily exposes a distinct, working opinion feed today (Tampa Bay
  Times: 1 stale item; Phoenix: 403; Florida Politics: 404; both Sentinels:
  403). The guardrail now pins "no two outlets share a feed URL".
  **Consequence the corpus did not accept:** the corpus asked for a separate
  opinion row per daily and alt-weekly ("separate row per CAP rule"). Without
  one, an outlet whose single feed mixes commentary with reporting would, once
  signed off, render commentary as "Reporting" — the exact failure
  news-fairness.md §1 exists to prevent. The Florida Phoenix feed is
  documented as mixed by the corpus, and the Florida Politics feed was
  observed mixed (an "Emails & Opinions" category and "Guest Author" bylines
  in the main feed), so both rows carry `mixedFeed: true` and
  `usableOutlets()` excludes them until the runner can split items on the
  feed's `<category>`. This reverses the corpus on a point it made
  explicitly, so it is a founder decision, not a settled one.
- **Two row-level flags gate sign-off.** `mixedFeed` (above, two rows) and
  `syndicated` (The Miami Times, §3 item 6). Both are fail-closed: a flagged
  row cannot produce cards even with a lean filled in. The verify script
  pins that. Lifting either flag is a runner change plus a PR, not an edit.
- **The Haitian Times is parked**, not listed, with a comment in the
  Miami-Dade block of the list so the founder sees it at edit time. Its feed verifies (10 items,
  0.3 d), but it is a Brooklyn newsroom whose feed is mostly non-Florida, and
  `countyFips` decides which county feed an unmatched article lands in (§7).
  Placing it in Miami-Dade would fill that county's feed with New York
  stories; placing it statewide would be false. Founder call.
- **FOX 35 added under Orange** although its studios are in Lake Mary
  (Seminole). The list already places 10 Tampa Bay and the Tampa Bay Times
  (both St. Petersburg, Pinellas) under Hillsborough, so "base county" is in
  practice "market". The corpus rejected Bay News 9 on base county; that rule
  is not being applied consistently and the founder should pick one reading.
- **Westside Gazette included at 7.6 days.** Stated above; veto if the 7-day
  line is meant literally.
- **Corpus feed paths corrected** where the corpus's "VERIFIED" path was the
  wrong kind of feed: WFSU (podcast → state news), CF Public Media (podcast →
  politics section), WFTV (sitemap → Arc RSS).

## 3. Findings the PRD should absorb

1. **Feed depth, not the 14-day window, bounds recall.** Nineteen of the
   thirty-one verified feeds reach back less than three days; Florida
   Politics, the highest-volume political outlet in the state, reaches back
   five hours. A weekly sweep over these feeds would see only a fraction of
   what they published. The cadence table in PRD §5 (weekly now, daily from 2026-10-05)
   is too slow for these outlets even in October. Two remedies, in order:
   - Sweep **daily now**, and Florida Politics several times a day.
   - Teach the runner WordPress paging: `/feed/?paged=N` works on
     floridapolitics.com and wsvn.com (verified: pages 2 and 5 return the next
     ten items), though not on wfla.com (404). A page loop with a stop-at-window
     rule is a small change to `scripts/news-sweep.ts`, not to the library.
2. **Two Tribune dailies are blocked at the edge.** The Sun Sentinel and
   Orlando Sentinel return 403 to any user agent on their advertised feed
   paths. Options: request feed access from Tribune, or fall back to a news
   sitemap — which is retrieval mode 2 in PRD §5 and is not yet implemented.
3. **BLOX/TownNews rate-limits across hosts.** News Service of Florida and The
   Miami Times share the platform; after a handful of requests every fetch to
   either returned 429 for the rest of the session. The runner must fetch each
   BLOX feed once per sweep and never retry inside a run.
4. **Publishers' AI-crawler stance.** On every host whose robots.txt could be
   read, the `User-agent: *` block permits the feed path the list uses
   (Florida's Voice's robots.txt itself returns 403, so it is unknown there),
   and the sweep's UA is its own. But
   five promoted hosts disallow a broad set of AI crawlers by name
   (`anthropic-ai`, `ClaudeBot`, `GPTBot`, `CCBot` …): Tampa Bay Times, WFLA,
   Florida Phoenix, WESH and Miami New Times. Both Sentinels do too, and Local
   10, WKMG, FOX 35 and CBS block GPTBot only. The sweep reads headline + dek from syndication
   feeds and links back, which is what RSS is for; it does not fetch article
   bodies. Whether a Claude-run pipeline doing that is within those publishers'
   intent is a policy question for the founder, not a robots.txt question.
   So that the founder sees it at the row they are editing, each affected
   outlet now carries a `robots` field in the list naming the AI user agents
   it disallows and any crawl delay (Florida Bulldog 10 s, WESH 10 s, The
   Floridian 600 s). The runner does not yet honour crawl delays; it makes
   one request per host per run, which satisfies them by accident until
   feed paging is added.
5. **Both Tribune dailies are reachable through their sitemaps.**
   `https://www.sun-sentinel.com/sitemap.xml?yyyy=2026&mm=09&dd=17` (and the
   Orlando Sentinel equivalent) answer the sweep UA with a Google News sitemap:
   per URL a `<news:title>`, `<news:publication_date>` and `<lastmod>`, about
   115–130 URLs per day including obituaries and wire sports. That is title,
   URL and date — everything the sweep stores except a dek. **Built 2026-09-18** (spec `docs/superpowers/specs/2026-09-18-news-sitemap-retrieval-design.md`): both papers now have a retrieval path; the dated-path filter drops obituaries only.
6. **Republisher attribution.** The Miami Times feed is mostly syndicated:
   Florida Politics, Florida Phoenix (Creative Commons), AP, and press-release
   wires, with the origin named in `<dc:creator>` ("A.G. Gancarski, Florida
   Politics"). The sweep attributes by feed owner, so a Florida Politics story
   republished there becomes a Miami Times row with the Miami Times' lean.
   That is a provenance error before it is a counting error: the lean label
   exists so "the reader judges the outlet themselves" (news-fairness.md §1),
   and here they would judge the wrong outlet — and Florida Politics'
   reporting would acquire a lean by republication that the corpus says must
   never be assigned in the product's voice. The Miami Times row therefore
   carries `syndicated: true` and is excluded from `usableOutlets()` until the
   runner reads `<dc:creator>` / a byline and either drops republished items
   or re-attributes them to an on-list origin. Wire copy on the TV feeds has
   a milder form of the same shape (the same AP UN story appeared on Local 10
   and WKMG in the same hour, each under its own lean once signed off); those
   rows are not flagged because the feeds are mostly original, but the
   duplicate-counting effect on per-candidate variance is real and belongs to
   PRD §6. Promoting the Miami Times feed was correct for gate C7-b evidence;
   leaving the row un-gated would not have been.
7. **Three national-tier outlets in the corpus (Table 3) were not added.** The
   list is four counties plus statewide; a national row would carry
   `countyFips: null` and be indistinguishable from a Florida statewide outlet
   in the county feed. Adding a tier needs a schema decision first.

## 4. What the founder signs off next (gate C7-a)

One word per row in `src/lib/news-sources.ts`. The corpus's proposals, with
the basis now recorded in each row's `leanBasis`:

| Outlet | Corpus proposal | Basis | Rater agreement |
|---|---|---|---|
| Miami Herald | center-left | MBFC Left-Center (-3.4) · AllSides Lean Left (low confidence) · Ad Fontes Middle | **disagree** |
| Sun Sentinel | center | AllSides Center · MBFC Least Biased · Ad Fontes Lean Left (via Ground News) | mild disagreement |
| Orlando Sentinel | center-left | MBFC Left-Center (-2.8) · Ad Fontes Skews Left · AllSides Center | **disagree** |
| Tampa Bay Times | center | AllSides Center (low confidence) | single rater |
| Florida Phoenix | center-left | none cited; States Newsroom network | uncited (and row is `mixedFeed`-gated) |
| Associated Press | center | ratings exist at all three raters per the corpus; none fetched | unfetched |
| All 31 others | — | no independent rating cited in the corpus | — |

The corpus's own rule: do not set a tag until two raters agree or the founder
explicitly signs off a single-rater or "no rating" designation. Until at least
one row is signed off, the sweep produces nothing.

**Two facts the founder needs before writing any word:**

1. **Rated outlets with a working feed, by county.** The corpus's per-county
   lean-coverage warning was about *rated* outlets; the feed gates cut across
   it. Crossing the two:

   | County | Rated outlets in list | …with a working feed |
   |---|---|---|
   | Miami-Dade | Miami Herald | **0** (no RSS) |
   | Broward | Sun Sentinel | **1** (sitemap, mode 2) |
   | Hillsborough | Tampa Bay Times | **1** |
   | Orange | Orlando Sentinel | **1** (sitemap, mode 2) |
   | Statewide | Florida Phoenix (uncited), AP (unfetched) | 0 usable (Phoenix gated; AP no RSS) |

   Signing off every corpus proposal today yields three rated in-county outlets that can produce cards (Tampa Bay Times by RSS; both Sentinels by sitemap). Miami-Dade still has none. Everything else that renders
   would be an unrated outlet, which brings in fact 2.

2. **"No rating" is not a value the schema can hold.** `LeanTag` admits
   `left … right` and `N/A`; `N/A` is defined as "lean does not apply" (a
   government document) and prints nothing. Signing off an unrated outlet
   therefore means either leaving `leanTag` null (the outlet never produces a
   card) or writing `N/A`, which the slot rotation treats as one bucket and
   which would collapse the spectrum rotation for the unrated majority —
   exactly the corpus's cross-cutting warning. Adding an `unrated` value is a
   schema change (migration 0000's CHECK) and a display decision. That
   question needs an answer before the 31 unrated rows can be signed off at
   all; it is not a one-word edit.

## 5. Firecrawl pass (second fetcher, same day)

Everything that failed the plain-fetch pass was retried through Firecrawl,
which fetches from its own proxies with a browser profile. A Firecrawl 200 is
evidence the feed exists; it is not evidence the sweep can read it, so every
promotion below was re-fetched with the sweep UA before entering the list.

| Target | Firecrawl | Sweep UA afterwards | Outcome |
|---|---|---|---|
| Sun Sentinel `/feed/`, `/opinion/feed/` | 403 (stealth proxy) | 403 | Edge block confirmed. |
| Orlando Sentinel `/feed/` | "we do not support this site" | 403 | Blocked. |
| Miami Herald, el Nuevo Herald Arc RSS | 200, but the body is the site's 404 page | timeout | No RSS exists at that path. |
| News Service of Florida BLOX RSS | 200, 25 items, newest same day | 200 then 429 | Already listed; rate-limit caveat stands. |
| The Miami Times BLOX RSS | 200, 25 items, newest same day | 200 (curl) then 429 (node) | **Promoted.** |
| AP `/hub/florida` | 200 HTML listing, no feed | 403 | Stays null; HTML listing is retrieval mode 3, unbuilt. |
| América TeVé site map | found `/contenidos/rss.html` → eight `/rss/pages/*.xml` feeds | `miami.xml` 200, 20 items, 0.2 d | **Promoted.** |
| OutSFL site map | one URL, no feed | — | Stays null. |
| Tribune `/sitemap.xml` | — | 200 sitemap index + open per-day news sitemaps | §3 item 5. |

Firecrawl changed the answer for two outlets (América TeVé, Miami Times) and
confirmed the answer for the rest. BLOX's 429 is a per-IP burst limit, not a
UA gate: the same URL answered `curl` with the sweep UA twice, then refused
the third request seconds later.

## 6. Method

Three passes, all with `User-Agent: KnowYourVote/1.0`, 20–45 s timeouts,
redirects followed. Pass 1: 158 URL/robots fetches across 40 hosts. Pass 2:
retries with spacing, homepage `<link rel="alternate">` discovery for hosts
where every guess failed, feed depth, a browser-UA diagnostic on the 403/timeout
hosts, and the WFOR address. Pass 3: every URL that appears in the list,
fetched verbatim. Raw output is not committed; rerun is
`node scripts/news-sweep.ts --probe` for discovery, and the sweep itself once
a lean is signed off.
