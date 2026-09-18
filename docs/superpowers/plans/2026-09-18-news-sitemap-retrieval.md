# News Sweep Retrieval Mode 2 (Google News Sitemaps) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the corpus sweep read the Sun Sentinel and Orlando Sentinel through their per-day Google News sitemaps, since their RSS is WAF-blocked, without changing how any other outlet is read.

**Architecture:** A pure parser `parseNewsSitemap()` beside `parseFeed()` in `src/lib/news-sweep.ts`; `sweep()` accepts a per-entry `format` and records `retrieval` on every article; the outlet list gains an optional `sitemap` field (URL template + include pattern) on the two Tribune rows; the runner walks each day in the window for sitemap outlets. Everything decidable stays offline-testable in `scripts/verify-news-sweep.ts`.

**Tech Stack:** TypeScript run directly by Node ≥ 22 (type stripping, no build step), regex-based XML picking as the existing parser does, no new dependencies.

Spec: `docs/superpowers/specs/2026-09-18-news-sitemap-retrieval-design.md`.

## Global Constraints

- No new dependencies. `src/lib/news-sweep.ts` and `src/lib/news-sources.ts` stay pure (no network, no clock, no value imports between them beyond types).
- Every `leanTag` stays `null`. `usableOutlets()` must still return 0 after this plan.
- Never store or fetch article bodies: title, URL, date, outlet only (summary is empty for sitemap entries).
- Include filter is exactly `/^\/\d{4}\/\d{2}\/\d{2}\//` on the URL path, per founder decision.
- Sitemap URL template placeholders are `{yyyy}`, `{mm}`, `{dd}`, filled in **UTC**.
- Runner: one request per sitemap day, 1000 ms gap, never retry inside a run.
- Run checks from the worktree root: `node --no-warnings scripts/verify-news-sweep.ts` and `npx tsc --noEmit -p .`. Both must pass before every commit.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/news-sweep.ts` (modify) | Parsers and the pure `sweep()`. Gains `parseNewsSitemap`, `Retrieval`, per-entry `format`, include filtering, `retrieval` on output. |
| `src/lib/news-sources.ts` (modify) | The outlet list. Gains `OutletSitemap`, `Outlet.sitemap`, `sitemapUrlFor()`, Tribune rows configured, `usableOutlets()` accepts sitemap. |
| `scripts/verify-news-sweep.ts` (modify) | Offline guardrail. Gains sitemap parser cases, sweep-over-sitemap cases, list invariants for `sitemap`. |
| `scripts/news-sweep.ts` (modify) | Network runner. Gains the per-day sitemap walk and a split summary line. |
| `docs/general-election/candidate-news-PRD.md`, `docs/general-election/news-corpus-verification-2026-09-17.md` (modify) | Status and evidence. |

---

### Task 1: Sitemap parser and `retrieval` in the pure sweep

**Files:**
- Modify: `src/lib/news-sweep.ts` (interfaces near top; `parseFeed` region; `SweepInput`/`sweep()` at the bottom)
- Test: `scripts/verify-news-sweep.ts`

**Interfaces:**
- Consumes: `Outlet` from `./news-sources` (type only). Task 2 adds `Outlet.sitemap?: { daily: string; include: RegExp }`; this task references `outlet.sitemap?.include` and needs Task 2's type to compile, so **do Task 2 Step 3 (the interface only) first if running tasks in isolation** — or run Tasks 1 and 2 as one commit.
- Produces: `export type Retrieval = "rss" | "news-sitemap"`, `export function parseNewsSitemap(xml: string): FeedEntry[]`, `SweepInput.feeds[i].format?: "feed" | "news-sitemap"`, `SweptArticle.retrieval: Retrieval`.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/verify-news-sweep.ts`, just above the final `if (failures > 0)` block:

```ts
/* ---- retrieval mode 2: Google News sitemaps ------------------------- */

const sentinel: Outlet = {
  domain: "sun-sentinel.com",
  publisher: "South Florida Sun Sentinel",
  type: "factual_reporting",
  countyFips: "12011",
  leanTag: "center",
  leanBasis: "fixture",
  feed: null,
  sitemap: {
    daily: "https://www.sun-sentinel.com/sitemap.xml?yyyy={yyyy}&mm={mm}&dd={dd}",
    include: /^\/\d{4}\/\d{2}\/\d{2}\//,
  },
};
const dayIso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();
const smUrl = (loc: string, title: string, daysAgo: number) =>
  `<url><loc>${loc}</loc><changefreq>monthly</changefreq><lastmod>${dayIso(daysAgo)}</lastmod>` +
  `<news:news><news:publication><news:name>Sun Sentinel</news:name><news:language>en-US</news:language></news:publication>` +
  `<news:publication_date>${dayIso(daysAgo)}</news:publication_date><news:title>${title}</news:title></news:news></url>`;
const daySitemap = (urls: string) =>
  `<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`;

const smFixture = daySitemap(
  smUrl("https://www.sun-sentinel.com/2026/09/17/council-vote/", "Council &amp; mayor vote", 1) +
    smUrl("https://www.sun-sentinel.com/obituaries/jane-doe/", "Jane Doe", 1) +
    smUrl("https://www.sun-sentinel.com/2026/09/16/second-story/", "Second story", 2) +
    smUrl("https://example.com/2026/09/17/off-list/", "Off list", 1) +
    smUrl("https://www.sun-sentinel.com/2026/08/01/too-old/", "Too old", 40),
);

const smParsed = parseNewsSitemap(smFixture);
check("sitemap: five url entries parsed", smParsed.length === 5, `got ${smParsed.length}`);
check("sitemap: title from news:title, entities decoded", smParsed[0]?.title === "Council & mayor vote", smParsed[0]?.title);
check("sitemap: link from loc", smParsed[0]?.link === "https://www.sun-sentinel.com/2026/09/17/council-vote/");
check("sitemap: date from news:publication_date", smParsed[0]?.published === dayIso(1), smParsed[0]?.published);
check("sitemap: summary is empty", smParsed[0]?.summary === "");
check("sitemap: garbage parses to nothing", parseNewsSitemap("<html>no</html>").length === 0);
check("sitemap: an RSS body parses to nothing as a sitemap", parseNewsSitemap(feed).length === 0);

const smA = sweep({ feeds: [{ outlet: sentinel, xml: smFixture, format: "news-sitemap" }], now: NOW, belongsTo: urlBelongsTo });
const smB = sweep({ feeds: [{ outlet: sentinel, xml: smFixture, format: "news-sitemap" }], now: NOW, belongsTo: urlBelongsTo });
check("sitemap sweep: reproducible", JSON.stringify(smA) === JSON.stringify(smB));
check("sitemap sweep: dated articles kept, obituary/off-list/stale dropped", smA.length === 2, smA.map((x) => x.title).join(","));
check("sitemap sweep: obituary is not present", !smA.some((x) => x.url.includes("/obituaries/")));
check("sitemap sweep: off-list domain is not present", !smA.some((x) => x.url.includes("example.com")));
check("sitemap sweep: retrieval recorded", smA.every((x) => x.retrieval === "news-sitemap"));
check("sitemap sweep: attribution from the list", smA.every((x) => x.publisher === sentinel.publisher && x.leanTag === "center" && x.countyFips === "12011"));
check("sitemap sweep: summary null", smA.every((x) => x.summary === null));

const mixed = sweep({
  feeds: [
    { outlet: sentinel, xml: smFixture, format: "news-sitemap" },
    { outlet: times, xml: feed },
  ],
  now: NOW,
  belongsTo: urlBelongsTo,
});
check("rss entries record retrieval rss", mixed.filter((x) => x.publisher === times.publisher).every((x) => x.retrieval === "rss"));
check("both formats coexist in one sweep", mixed.length === 5, `got ${mixed.length}`);

check(
  "a news-sitemap entry for an outlet without a sitemap yields nothing",
  sweep({ feeds: [{ outlet: times, xml: smFixture, format: "news-sitemap" }], now: NOW, belongsTo: urlBelongsTo }).length === 0,
);
check(
  "a sitemap body passed as a feed yields nothing",
  sweep({ feeds: [{ outlet: sentinel, xml: smFixture }], now: NOW, belongsTo: urlBelongsTo }).length === 0,
);
```

Also change the import line at the top of the verify script to:

```ts
import { normalizeUrl, parseFeed, parseNewsSitemap, sweep } from "../src/lib/news-sweep.ts";
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --no-warnings scripts/verify-news-sweep.ts`
Expected: a SyntaxError that `parseNewsSitemap` is not exported (or, if Task 2's interface is not yet in place, a type error is NOT expected — Node strips types; the failure is the missing export).

- [ ] **Step 3: Implement the parser, `format`, include filter and `retrieval`**

In `src/lib/news-sweep.ts`:

Add after the `FeedEntry` interface:

```ts
/** How an article reached the pool — PRD §5 "record which". */
export type Retrieval = "rss" | "news-sitemap";
```

Add `retrieval` to `SweptArticle` (after `countyFips`):

```ts
  retrieval: Retrieval;
```

Add after `parseFeed()`:

```ts
/** Google News sitemap (`urlset` of `url` entries carrying `news:news`).
    This is retrieval mode 2 in PRD §5: for outlets whose RSS is blocked but
    whose sitemap is open (both Tribune dailies). Same output shape as
    `parseFeed` so the sweep treats both alike; summary is empty because a
    sitemap carries no dek. Unknown shapes yield nothing. */
export function parseNewsSitemap(xml: string): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (const m of xml.matchAll(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/gi)) {
    const block = m[1];
    const news = block.match(/<news:news(?:\s[^>]*)?>([\s\S]*?)<\/news:news>/i)?.[1] ?? "";
    out.push({
      title: pick(news, "news:title"),
      link: pick(block, "loc"),
      summary: "",
      published: pick(news, "news:publication_date") || pick(block, "lastmod"),
    });
  }
  return out;
}
```

Change `SweepInput.feeds`:

```ts
  /** One fetched body per outlet (or per sitemap day). The caller has already
      decided which outlets are usable (`usableOutlets()`), so an outlet
      arriving here is one the sweep is allowed to read. `format` defaults to
      an RSS/Atom feed; `"news-sitemap"` bodies are parsed with
      `parseNewsSitemap` and filtered by the outlet's `sitemap.include`. */
  feeds: readonly { outlet: Outlet; xml: string; format?: "feed" | "news-sitemap" }[];
```

Replace the loop head and the per-entry filtering in `sweep()`:

```ts
  for (const { outlet, xml, format = "feed" } of input.feeds) {
    /* Fail closed: an outlet with no signed-off lean cannot produce a card
       (news-fairness.md §1 — no source, no card), so it produces no row. */
    const leanTag = outlet.leanTag;
    if (leanTag === null) continue;

    /* A sitemap body is only readable for an outlet the list says has a
       sitemap; the include pattern lives there and is the editorial boundary
       for what counts as an article on that site. */
    const isSitemap = format === "news-sitemap";
    if (isSitemap && !outlet.sitemap) continue;
    const retrieval: Retrieval = isSitemap ? "news-sitemap" : "rss";
    const entries = isSitemap ? parseNewsSitemap(xml) : parseFeed(xml);

    for (const entry of entries) {
      const url = normalizeUrl(entry.link);
      if (!url || !entry.title) continue;

      if (isSitemap && !outlet.sitemap!.include.test(new URL(url).pathname)) continue;

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
        retrieval,
      });
    }
  }
```

Update the file header's "What the sweep does NOT do" list with one line: `- It does not decide what a sitemap "article" is. That is the outlet's \`sitemap.include\`, in news-sources.ts.`

- [ ] **Step 4: Run tests and type check**

Run: `node --no-warnings scripts/verify-news-sweep.ts && npx tsc --noEmit -p .`
Expected: `verify-news-sweep: OK — … (37 outlets listed, 0 usable)` and tsc silent. (tsc needs Task 2 Step 3's interface; if it complains about `sitemap` on `Outlet`, do that step now.)

- [ ] **Step 5: Commit** (combine with Task 2 if done together)

```bash
git add src/lib/news-sweep.ts scripts/verify-news-sweep.ts
git commit -m "feat(news): parseNewsSitemap + retrieval mode in the pure sweep

Google News sitemap bodies parse to the same FeedEntry shape as RSS; sweep()
takes a per-entry format, applies the outlet's sitemap.include path filter,
and records retrieval on every article (PRD §5 'record which').

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `sitemap` on the outlet list and its invariants

**Files:**
- Modify: `src/lib/news-sources.ts` (interfaces; `RowOptions`; `o()`; the two Tribune rows; `usableOutlets()`)
- Test: `scripts/verify-news-sweep.ts`

**Interfaces:**
- Produces: `export interface OutletSitemap { daily: string; include: RegExp }`, `Outlet.sitemap?: OutletSitemap`, `export function sitemapUrlFor(template: string, day: Date): string` (fills `{yyyy}` `{mm}` `{dd}` in UTC), `usableOutlets()` accepting `feed` **or** `sitemap`.
- Consumed by: Task 1 (`outlet.sitemap.include`), Task 3 (`sitemapUrlFor`, `outlet.sitemap.daily`).

- [ ] **Step 1: Write the failing tests**

Append to `scripts/verify-news-sweep.ts` after the Task 1 block:

```ts
/* ---- list invariants for sitemap outlets ---------------------------- */

check(
  "sitemapUrlFor fills placeholders in UTC",
  sitemapUrlFor("https://x.com/sitemap.xml?yyyy={yyyy}&mm={mm}&dd={dd}", new Date("2026-09-07T23:30:00-04:00")) ===
    "https://x.com/sitemap.xml?yyyy=2026&mm=09&dd=08",
);

const withSitemap = OUTLETS.filter((o) => o.sitemap !== undefined);
check("both Tribune dailies carry a sitemap", withSitemap.map((o) => o.domain).sort().join(",") === "orlandosentinel.com,sun-sentinel.com");
for (const o of withSitemap) {
  const t = o.sitemap!.daily;
  check(`sitemap template for ${o.domain} has all placeholders`, t.includes("{yyyy}") && t.includes("{mm}") && t.includes("{dd}"), t);
  check(`sitemap template for ${o.domain} is https on the outlet's own host`, t.startsWith("https://") && urlBelongsTo(sitemapUrlFor(t, NOW), o), t);
  check(`sitemap outlet ${o.domain} has no feed (no tie-break rule needed)`, o.feed === null);
  check(`sitemap include for ${o.domain} is the dated-path filter`, o.sitemap!.include.source === "^\\/\\d{4}\\/\\d{2}\\/\\d{2}\\/");
}
check(
  "a sitemap outlet becomes usable once a lean is signed off",
  usableOutlets(withSitemap.map((o) => ({ ...o, leanTag: "center" as const }))).length === withSitemap.length,
);
check("usableOutlets is still empty (leans null)", usableOutlets().length === 0);
```

And change the news-sources import at the top of the verify script to:

```ts
import { OUTLETS, UNRATED, sitemapUrlFor, urlBelongsTo, usableOutlets, type Outlet } from "../src/lib/news-sources.ts";
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --no-warnings scripts/verify-news-sweep.ts`
Expected: SyntaxError — `sitemapUrlFor` is not exported.

- [ ] **Step 3: Implement**

In `src/lib/news-sources.ts`:

After `OutletRobots`, add:

```ts
/** Retrieval mode 2 (PRD §5): a per-day Google News sitemap, for an outlet
    whose RSS is blocked but whose sitemap is open. Both Tribune dailies. */
export interface OutletSitemap {
  /** URL template; `{yyyy}` `{mm}` `{dd}` are filled in UTC by `sitemapUrlFor`. */
  daily: string;
  /** Tested against each entry's URL path. Non-matching entries never enter
      the pool. This is the editorial line for "what is an article here". */
  include: RegExp;
}
```

In `Outlet`, after `robots?: OutletRobots;`:

```ts
  /** Set only when `feed` is null. See `OutletSitemap`. */
  sitemap?: OutletSitemap;
```

In `RowOptions`, add `sitemap?: OutletSitemap;`. In `o()`, add `if (opts.sitemap) row.sitemap = opts.sitemap;`.

Before `OUTLETS`, add:

```ts
/* Tribune Publishing sites: RSS is WAF-blocked to every UA; the per-day
   Google News sitemap is open. News articles live under a dated path;
   obituaries (the only other shape seen) do not, so the dated-path filter is
   the founder-chosen boundary (spec 2026-09-18). */
const TRIBUNE_DATED_PATH = /^\/\d{4}\/\d{2}\/\d{2}\//;
const tribuneSitemap = (host: string): OutletSitemap => ({
  daily: `https://${host}/sitemap.xml?yyyy={yyyy}&mm={mm}&dd={dd}`,
  include: TRIBUNE_DATED_PATH,
});
```

Edit the Sun Sentinel row: keep `feed: null` and its comments; add `sitemap: tribuneSitemap("www.sun-sentinel.com"),` to its options object. Replace the second comment line (`//       BUT /sitemap.xml?... Needs retrieval mode 2 (PRD §5) in the runner.`) with `//       Read via its per-day Google News sitemap instead (retrieval mode 2) — see `sitemap` below.`

Same for the Orlando Sentinel row with `tribuneSitemap("www.orlandosentinel.com")`, replacing `//       Same open per-day Google News sitemap … Needs retrieval mode 2 in the runner.` with `//       Read via its per-day Google News sitemap instead (retrieval mode 2) — see `sitemap` below.`

Add after `o()`:

```ts
/** Fill a sitemap template for one UTC day. Pure; the runner and the
    guardrail both use it so they cannot disagree on the date format. */
export function sitemapUrlFor(template: string, day: Date): string {
  const yyyy = String(day.getUTCFullYear());
  const mm = String(day.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(day.getUTCDate()).padStart(2, "0");
  return template.replace("{yyyy}", yyyy).replace("{mm}", mm).replace("{dd}", dd);
}
```

Replace `usableOutlets()`:

```ts
/** Outlets the sweep may actually read: lean signed off, a retrieval path
    (RSS feed or news sitemap), and no fail-closed flag. */
export function usableOutlets(outlets: readonly Outlet[] = OUTLETS): Outlet[] {
  return outlets.filter(
    (x) =>
      x.leanTag !== null &&
      (x.feed !== null || x.sitemap !== undefined) &&
      !x.mixedFeed &&
      !x.syndicated,
  );
}
```

Update the header comment's `feed` gate paragraph with one sentence: "Two rows have no feed but a `sitemap` (retrieval mode 2); that counts as a retrieval path for `usableOutlets()`."

- [ ] **Step 4: Run tests and type check**

Run: `node --no-warnings scripts/verify-news-sweep.ts && npx tsc --noEmit -p .`
Expected: OK line with `(37 outlets listed, 0 usable)`; tsc silent.

- [ ] **Step 5: Commit**

```bash
git add src/lib/news-sources.ts scripts/verify-news-sweep.ts
git commit -m "feat(news): sitemap retrieval path on the two Tribune rows

OutletSitemap (daily template + include pattern), sitemapUrlFor() in UTC,
usableOutlets() accepts feed OR sitemap. Sun Sentinel and Orlando Sentinel
read via their open per-day Google News sitemaps with the dated-path filter.
Guardrail pins placeholders, host, no-feed-and-sitemap, and the filter.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Runner walks sitemap days

**Files:**
- Modify: `scripts/news-sweep.ts` (imports; the fetch loop after `const usable = usableOutlets();`; the summary line)

**Interfaces:**
- Consumes: `sitemapUrlFor`, `Outlet.sitemap` (Task 2); `parseNewsSitemap`, `sweep` `format` (Task 1).

- [ ] **Step 1: Implement**

Change the imports:

```ts
import { OUTLETS, sitemapUrlFor, urlBelongsTo, usableOutlets, type Outlet } from "../src/lib/news-sources.ts";
import { parseNewsSitemap, sweep } from "../src/lib/news-sweep.ts";
```

Add near `get()`:

```ts
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

Replace the block from `const feeds = [];` through the `console.error(` summary with:

```ts
const now = new Date();
const feeds: { outlet: Outlet; xml: string; format?: "feed" | "news-sitemap" }[] = [];
let feedOutlets = 0;
let sitemapDays = 0;
let sitemapDaysOk = 0;

for (const outlet of usable) {
  if (outlet.feed !== null) {
    const xml = await get(outlet.feed);
    if (xml) {
      feeds.push({ outlet, xml });
      feedOutlets++;
    }
    continue;
  }

  /* Retrieval mode 2: one request per UTC day in the window, oldest first,
     with a polite gap. A day that fails is logged by get() and skipped; a
     day that parses to nothing is logged here — silence is the failure mode
     gate C7-b exists to prevent. Never retried inside a run. */
  if (outlet.sitemap) {
    for (let back = days; back >= 0; back--) {
      const url = sitemapUrlFor(outlet.sitemap.daily, new Date(now.getTime() - back * 86_400_000));
      sitemapDays++;
      const xml = await get(url);
      if (xml) {
        if (parseNewsSitemap(xml).length === 0) console.error(`  0 entries: ${url}`);
        feeds.push({ outlet, xml, format: "news-sitemap" });
        sitemapDaysOk++;
      }
      await sleep(1000);
    }
  }
}

const articles = sweep({ feeds, now, windowDays: days, belongsTo: urlBelongsTo });
const sitemapOutlets = usable.filter((o) => o.feed === null && o.sitemap).length;
console.error(
  `swept ${feedOutlets}/${usable.length - sitemapOutlets} feeds + ${sitemapDaysOk}/${sitemapDays} sitemap days ` +
    `(${sitemapOutlets} outlet${sitemapOutlets === 1 ? "" : "s"}) -> ${articles.length} articles in the last ${days} days`,
);
```

Update the header comment's second mode description to: "Sweep every usable outlet (both founder gates filled, no fail-closed flag). RSS outlets are one request each; sitemap outlets (retrieval mode 2) are one request per day in the window."

- [ ] **Step 2: Type check and fail-closed check**

Run: `npx tsc --noEmit -p . && node --no-warnings scripts/news-sweep.ts; echo "exit=$?"`
Expected: tsc silent; the runner prints `No usable outlets: 37 listed, 0 with …` and `exit=1`.

- [ ] **Step 3: Live smoke test in the scratchpad (not committed)**

Create `<scratchpad>/smoke-sitemap.ts`:

```ts
// Absolute imports: Node resolves them without a build step. Replace the
// prefix with `git rev-parse --show-toplevel` of the worktree you are in.
import { OUTLETS, sitemapUrlFor, urlBelongsTo } from "/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/.claude/worktrees/subagent-driven-development-a087c8/src/lib/news-sources.ts";
import { sweep, parseNewsSitemap } from "/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/.claude/worktrees/subagent-driven-development-a087c8/src/lib/news-sweep.ts";
const UA = "KnowYourVote/1.0 (+https://github.com/JasonJosephIT/know-your-vote)";
const now = new Date();
const feeds: { outlet: any; xml: string; format: "news-sitemap" }[] = [];
for (const base of OUTLETS.filter((o) => o.sitemap)) {
  const outlet = { ...base, leanTag: "center" as const }; // scratch only
  for (let back = 14; back >= 0; back--) {
    const url = sitemapUrlFor(outlet.sitemap!.daily, new Date(now.getTime() - back * 86_400_000));
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) });
    const xml = res.ok ? await res.text() : "";
    console.error(`${res.status} ${parseNewsSitemap(xml).length.toString().padStart(4)} ${url}`);
    if (xml) feeds.push({ outlet, xml, format: "news-sitemap" });
    await new Promise((r) => setTimeout(r, 1000));
  }
}
const a = sweep({ feeds, now, windowDays: 14, belongsTo: urlBelongsTo });
const b = sweep({ feeds, now, windowDays: 14, belongsTo: urlBelongsTo });
const per = new Map<string, number>();
for (const x of a) per.set(x.publisher, (per.get(x.publisher) ?? 0) + 1);
console.log({ articles: a.length, reproducible: JSON.stringify(a) === JSON.stringify(b), per: [...per], obits: a.filter((x) => x.url.includes("/obituaries/")).length, allSitemap: a.every((x) => x.retrieval === "news-sitemap"), sample: a.slice(0, 3).map((x) => `${x.publishedAt.slice(0, 10)} ${x.title.slice(0, 60)}`) });
```

Run: `node --no-warnings <scratchpad>/smoke-sitemap.ts`
Expected: 30 lines of `200  1xx …`, then an object with `articles` in the low thousands, `reproducible: true`, `obits: 0`, `allSitemap: true`, both publishers present. Record the numbers for Task 4's docs.

- [ ] **Step 4: Commit**

```bash
git add scripts/news-sweep.ts
git commit -m "feat(news): runner walks per-day sitemaps for sitemap outlets

One request per UTC day in the window with a 1 s gap, no in-run retries,
zero-entry days logged, summary line splits feeds from sitemap days.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Docs, PR

**Files:**
- Modify: `docs/general-election/candidate-news-PRD.md` (the C7 status note; search `Gate C7-b closed for 31 of 37`)
- Modify: `docs/general-election/news-corpus-verification-2026-09-17.md` (Broward and Orange Sentinel rows; §3 item 5; §4 county table)

- [ ] **Step 1: PRD**

In the C7 note, replace the clause `Sun Sentinel and Orlando Sentinel (403 to every UA and to Firecrawl — **but their per-day Google News sitemaps are open to the sweep UA**, which makes retrieval mode 2 the next mechanism task)` with `Sun Sentinel and Orlando Sentinel (RSS 403 to every UA and to Firecrawl; **read via their per-day Google News sitemaps — retrieval mode 2, built 2026-09-18**, dated-path filter drops obituaries; `retrieval` is now recorded on every swept article)`.

- [ ] **Step 2: Verification doc**

Sun Sentinel row: replace `| Sun Sentinel | **null** |` cell with `| Sun Sentinel | **sitemap (mode 2)** `sun-sentinel.com/sitemap.xml?yyyy=&mm=&dd=` |` and append to Notes: `Built 2026-09-18; smoke run: <N> dated articles over 15 days, 0 obituaries.` (use Task 3's numbers). Same for the Orlando Sentinel row.

§3 item 5: change the last sentence from `This is the single highest-value mechanism change available: it restores the only daily in Broward and the only daily in Orange.` to `**Built 2026-09-18** (spec `docs/superpowers/specs/2026-09-18-news-sitemap-retrieval-design.md`): both papers now have a retrieval path; the dated-path filter drops obituaries only.`

§4 table: Broward row `| Broward | Sun Sentinel | **1** (sitemap, mode 2) |`; Orange row `| Orange | Orlando Sentinel | **1** (sitemap, mode 2) |`; replace the sentence `Signing off every corpus proposal today yields exactly one rated in-county outlet that can produce a card.` with `Signing off every corpus proposal today yields three rated in-county outlets that can produce cards (Tampa Bay Times by RSS; both Sentinels by sitemap). Miami-Dade still has none.` and delete `Retrieval mode 2 (§3 item 5) changes this table more than any lean decision does.`

Also update the Broward paragraph under the Broward table (`Broward now has **no daily and no television outlet** with a working feed…`) to: `Broward's daily is reachable again through retrieval mode 2 (below); it still has no television outlet with a working feed.`

- [ ] **Step 3: Full check, commit, push, PR**

Run: `node --no-warnings scripts/verify-news-sweep.ts && npx tsc --noEmit -p .`
Expected: OK, silent.

```bash
git add docs/general-election/candidate-news-PRD.md docs/general-election/news-corpus-verification-2026-09-17.md
git commit -m "docs(news): retrieval mode 2 built — Sentinels have a path, county table updated

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin claude/compass-artifact-workflow-41aa89
gh pr create --base main --title "feat(news): sweep retrieval mode 2 — Tribune Google News sitemaps" --body-file - <<'EOF'
## Summary

Implements retrieval mode 2 from candidate-news-PRD.md §5 ("RSS/Atom → sitemap"). The Sun Sentinel and Orlando Sentinel return 403 on every RSS path to every user agent, but serve per-day Google News sitemaps openly to the sweep's UA. They are now read that way. Spec: `docs/superpowers/specs/2026-09-18-news-sitemap-retrieval-design.md`.

## Changes
- `src/lib/news-sweep.ts`: `parseNewsSitemap()`; `sweep()` takes a per-entry `format`, applies the outlet's `sitemap.include` path filter, and records `retrieval: "rss" | "news-sitemap"` on every article.
- `src/lib/news-sources.ts`: `OutletSitemap` (daily URL template + include pattern), `sitemapUrlFor()` (UTC), both Tribune rows configured, `usableOutlets()` accepts feed or sitemap. Leans untouched; still 0 usable.
- `scripts/news-sweep.ts`: one request per UTC day in the window for sitemap outlets, 1 s gap, no in-run retries, zero-entry days logged.
- `scripts/verify-news-sweep.ts`: parser fixtures, sweep-over-sitemap cases (obituary dropped, boundary, window, reproducibility, retrieval recorded, both formats in one run), list invariants (placeholders, host, no feed+sitemap, exact filter).

## Founder decision recorded
Dated-path filter (`^/\d{4}/\d{2}/\d{2}/`). A metadata filter was preferred but both sitemaps carry only title, date and publication name. The filter removes obituaries (1–4/day) and nothing else.

## Smoke (scratch, leans stubbed, not committed)
Fill in from Task 3: `<sitemap days 200>/30`, `<articles>` dated articles over 15 days, 0 obituaries, reproducible.

## Verification
- `node --no-warnings scripts/verify-news-sweep.ts` — OK (37 listed, 0 usable)
- `npx tsc --noEmit -p .` — clean
- `node scripts/news-sweep.ts` — exits 1 fail-closed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```
