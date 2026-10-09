# News PR B: Daily Sweep, Feed Depth, Chunked Dedupe Reads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the news sweep daily, record each run's feed depth (a log line, plus `shallowFeeds` in the cron's JSON), and make the intake's dedupe reads filtered by URL, chunked and error-checked, so they stay correct as the review queue grows.

**Architecture:** Three pure helpers in `src/lib/news-sweep.ts` (`feedDepthHours`, `shallowFeeds`, `depthLine`) measure each fetched RSS feed. `runSweep` in `src/lib/news-intake.ts` carries the result. A new `readHandled` in the same file replaces the unfiltered `review_item` read with URL-filtered reads in the same chunks as the `news_item` read, and throws on a read error. The cron route logs the depth line and returns `shallowFeeds`; `vercel.json` moves the cron to daily.

**Tech Stack:** TypeScript under Node 22 type stripping (plain-Node verify scripts), `@supabase/supabase-js` 2.110 / `postgrest-js` 2.110, Next.js 16 App Router (one API route), Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-10-08-news-source-integrity-design.md` on branch `claude/specs-gap-closure` (commit `3e377f9`; it is not on this branch). This PR is its rollout step 2, "PR B" (spec `:1485-1494`), covering §3.5 (`:1102-1127`), §3.7 (`:1163-1174`), decision D9 (`:1427-1429`) and the PR B lines of §6 Testing (`:1576-1582`, `:1620-1622`).

**Worktree and branch:** `/Users/jsloth/Projects/kyv-build/newsB`, branch `claude/news-daily-sweep`. The branch starts at `08384c5` (the migration-ledger commit, branch `claude/migration-ledger-2026-10-09`), which is not on `main` yet. This PR adds no migration and does not depend on that commit.

## Global Constraints

Copied from the spec, the house rules and the build environment. Every task's requirements include this section.

**From the spec (verbatim where quoted):**
- §3.5: "`/api/cron/news-sweep` moves to `0 11 * * *`. The window stays 14 days, so overlap and dedupe are unchanged."
- §3.5: "`runSweep` returns each feed's item count and the age in hours of its oldest item, computed by a pure helper, `feedDepthHours(entries, now)`, in `src/lib/news-sweep.ts`. Undated items are skipped, and an empty feed reports 0 items."
- §3.5: "`shallowFeeds`. These are the feeds whose oldest item is younger than `CADENCE_HOURS = 24`, which are still losing stories at a daily cadence."
- §3.5: "The JSON response gains `shallowFeeds`, for a manual `POST` with `x-cron-secret`."
- §3.5: "One `console.log` line per run: `news-sweep depth: <n> feeds; shallow (<24h): <domain> <hours>h, …`."
- §3.5: the durable record is the retrofit's `agent_run` row: "Once the retrofit's PR A records each cron run in `agent_run` … that row's `summary` includes the same depth line. Whichever of the two PRs merges second wires it." **This PR does not write or touch `agent_run`** (the retrofit's PR A owns it). It exposes `sweep.depthLine` so that wiring is one line in PR A's code.
- §3.7: "`enqueueIntake` reads `review_item` with `.eq("kind", "manual_news").in("payload->>url", chunk)`, in the same 200-URL chunks as the `news_item` lookup beside it … Each response is bounded by the chunk, not by the size of the table. Both reads now check `error` and throw, so the cron answers 502 instead of queueing on a partial read. The skip rules are unchanged: any status counts, and election stories key on the URL alone."
- §6 (`verify-news-sweep.ts`): "`feedDepthHours` on fixture feeds, including an empty feed and undated items, and `shallowFeeds` at the 24-hour edge."
- §6 (`verify-news-enqueue.ts`, the dedupe read): "the `review_item` read is filtered by the sweep's URLs, in chunks of 200; with a fake table of 1,500 decided items where the matching one comes last, the story is still skipped; a read error throws instead of queueing."
- §6: "Every guard is mutation-checked: break it, see the script fail, restore it."
- §3.10: "A daily sweep shrinks the feed-depth bias, which otherwise favours candidates covered by deep feeds."
- D9: "Recommended (pending founder confirmation): daily at 11:00 UTC from now to Nov 3. The operator's review cadence is unchanged. **TO FLIP:** restore `0 11 * * 1,4` in `vercel.json`."

**House rules:**
- Nothing from the sweep is voter-facing until a person approves it in /admin. The intake writes only `review_item` rows with `status: "pending"`; it never inserts `news_item`.
- Every `candidate_news` / `election_news` row needs a `source_id` (unchanged here; the queued payloads already carry `outlet:<domain>`).
- Equal treatment: no rule here reads party or ranks candidates; every outlet's feed is measured and reported the same way.
- No change to `/methodology` or any frozen file.

**Safety (never break):**
- No migration, no live database write, no `apply_migration`. Do not run `scripts/news-enqueue.ts`, `scripts/news-sweep.ts`, the cron route or any write script against the live database. Every test here is offline: fake clients, a stubbed `fetch`.
- Never open, print or copy `.env.local` or any key. Never create, run or change a scheduled task. Never merge, never push to `main`, never force-push.
- Work only in `/Users/jsloth/Projects/kyv-build/newsB` on `claude/news-daily-sweep`.

**Environment:**
- The default `node` crashes on this Mac. Every command below uses
  `NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"` (always quoted as `"$NODE"`). Each Bash call starts a fresh shell, so set `NODE` in the same command.
- Modules imported by plain-Node scripts use relative imports with the `.ts` extension (no `@/` alias). `src/lib/news-sweep.ts` and `src/lib/news-intake.ts` already follow this.
- `scripts/` is excluded from `tsconfig.json`. Type-check changed scripts with the strict standalone command in Task 5.
- Commit messages: one-line subject, blank line, body, then the final line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions this PR encodes

Each is listed again in the PR body (Task 5).

1. **D9, daily sweep** (recommended, pending founder confirmation): `vercel.json` `/api/cron/news-sweep` is `0 11 * * *`. TO FLIP: restore `0 11 * * 1,4` in `vercel.json` and in the check in `scripts/verify-news-enqueue.ts`, **and set `CADENCE_HOURS` to 96** in `src/lib/news-sweep.ts` (the Thursday-to-Monday gap). Without that, the depth line keeps saying `shallow (<24h)` and leaves out every feed that loses stories at a 72 h or 96 h gap. `scripts/verify-news-sweep.ts` checks `CADENCE_HOURS` against the schedule, so a flip that forgets it fails verify-all (decision 3).
2. **The window stays 14 days** (`WINDOW_DAYS = 14` in the route), pinned by a static check.
3. **`CADENCE_HOURS = 24`** is exported from `src/lib/news-sweep.ts`. A feed is shallow when its oldest dated item is younger than 24 hours. It is the **longest gap between two runs** of the cron: `scripts/verify-news-sweep.ts` reads the `/api/cron/news-sweep` schedule from `vercel.json` (`M H * * <days>`, days `*` or a comma list) and fails unless `CADENCE_HOURS` equals that gap (24 for daily, 96 for `1,4`). The depth tests pass their cadence explicitly, so changing `CADENCE_HOURS` changes no other check.
4. **Hours are rounded down to one decimal** (`Math.floor(h * 10) / 10`), so `hours < 24` is true exactly when the real age is (23 h 59 m reads 23.9 and is shallow; 24 h is not).
5. **An empty feed** (fetched, 0 dated items) reports `{ items: 0, hours: 0 }`, as the spec says, and is listed among the shallow feeds as `<domain> 0h (0 items)`. The spec does not say whether an empty feed is shallow; listing it keeps a feed that went silent visible. TO FLIP: filter `d.items > 0` in `shallowFeeds`.
6. **Undated or unparseable items** are neither counted nor aged. A future-dated oldest item counts as 0 hours.
7. **Depth is measured for RSS/Atom feeds only.** A sitemap outlet fetches one sitemap per day of the window, so it has no feed depth and no row. (No sitemap outlet is usable today: `usableOutlets()` is 24 outlets, all RSS.) A feed whose fetch failed has no row; it is named in `fetchFailures` and counted in the depth line (decision 18).
8. **The depth line is logged once the sweep returns, before queueing**, so a run whose queueing fails still records it. `shallowFeeds` is in the 200 response and in the queue-failure 502. A sweep that throws has no depth to report.
9. **Any status counts** in the dedupe read: the `review_item` read has no status filter. `0006_admin_ops.sql:64-65` limits `status` to `pending`, `approved`, `rejected`, the three values the old filter listed, so this changes nothing today.
10. **Chunks are bounded by count and by size. This deviates from spec §3.7**, which says "the same 200-URL chunks"; the size bound is this PR's addition. At most `DEDUPE_CHUNK = 200` URLs (the spec's number) **and** at most `DEDUPE_CHUNK_CHARS = 6_000` form-encoded characters per chunk. Why the size bound: the filter travels in the GET query string, and 200 real article URLs (the 116 in `docs/general-election/news-characterization-goldset-2026-09-18.jsonl`, median 109 characters, longest 170, padded to 200) built a 25,590-character request URL with the installed supabase-js 2.110, measured offline with a captured `fetch` while writing this plan. Cloudflare documents a 16 KB URL limit, and nginx's default request-line buffer is 8 KB. With the size bound, those 116 URLs split 46/44/26 and the longest request is 5,840 characters. The live gateway's limit was **not** probed (a probe of the production API was declined while planning). TO FLIP: raise `DEDUPE_CHUNK_CHARS` (for example to `1_000_000`) to get plain 200-URL chunks. Tell the founder: the old 200-URL `news_item` read ignored its error, so on the live system it may have been failing silently (a too-long request read as "nothing published"); now any read error is a 502 that queues nothing.
11. **Both dedupe reads throw on error** (`could not read news_item to dedupe (<n> URLs, longest <k> chars: <url>): …`, and the same for `review_item`). The message names the chunk so a refused request (a 414 from one URL longer than `DEDUPE_CHUNK_CHARS`, which gets a chunk of its own) is quick to find; that case fails closed, answering 502 daily until the story leaves the 14-day window. The cron route already turns a thrown `enqueueIntake` into a 502. The per-outlet `source` upserts still run before the reads (unchanged order); they are idempotent upserts on `url_norm`.
12. **`readHandled(db, urls)` is exported** from `src/lib/news-intake.ts`, so the spec's PR A (`src/lib/election-news.ts`, "R3's queue CLI uses the same chunked reads", §3.7) can import it if this PR lands first. Nothing in this PR depends on PR A.
13. **No `agent_run` write, no migration, no voter-facing change.** The `review_item` read by `payload->>url` is a sequential scan of a table holding about 90 rows (spec Q6); no index is added.
14. **The depth line is not wired into `agent_run` here, even if this PR merges second.** Spec rollout step 2 says the second of this PR and the retrofit's PR A to merge "wires the depth line into the `agent_run` summary"; the scope rule for this build gives all `agent_run` writing to PR A. This PR exposes `sweep.depthLine` so the wiring is one line, and if PR A is already on `main` at rebase time the builder reports the follow-up instead of editing PR A's code (see "Overlap with other PRs"). **Tracked follow-up:** add `sweep.depthLine` to the `agent_run` summary in whichever PR lands second (one line). Until then the depth record lives only in Vercel runtime logs, which are kept briefly, and in manual `POST` responses.
15. **The hand-run sweep prints the depth line.** `scripts/news-sweep.ts` writes `result.depthLine` to stderr after the summary, so the runbook's hand sweeps (`--days 30`) leave the same record. It writes nothing else and its JSON output is unchanged. TO FLIP: delete that one line and its static check in `scripts/verify-news-sweep.ts`.
16. **What depth measures, and what it does not.** Depth is the age of a feed's oldest dated item, as the spec defines it. One old pinned or evergreen item makes a shallow feed look deep, and it counts dated items that `sweep()` later drops for having no link or title. Read it as a floor on how often to sweep, not as how many stories the feed holds.
17. **The cron has no end date (open gap against D9).** D9 says daily "from now to Nov 3"; a cron cannot express the end, so the schedule stays daily after the election until someone changes `vercel.json`. The spec does not say who or when; this PR leaves it as a founder/operator item for after Nov 3 (restore `0 11 * * 1,4`, or remove the cron).

18. **The depth line counts failed fetches.** It reads `news-sweep depth: <n> feeds, <k> failed; shallow (<24h): …`, where `<k>` is the RSS feeds whose fetch failed (they have no depth row). This adds `, <k> failed` to the spec's `<n> feeds; shallow (<24h): …` template. Why: the line is the run's only lasting record (Vercel does not keep the JSON response, spec §2.8), and without the count a feed that failed today reads the same as one that is not listed. `depthLine(depth, { cadenceHours?, failed? })` takes an options object; `failed` defaults to 0. TO FLIP: drop `, ${failed} failed` from `depthLine` and its expected strings in `scripts/verify-news-sweep.ts`. "1 feeds" is left unpluralised, as in the spec's `<n> feeds` template.
19. **The `runSweep` test serves sitemap days too.** Its `fetch` stub answers any URL that is not a usable RSS feed with an empty news sitemap, and it sweeps a one-day window (depth does not depend on the window; the real loop pauses 1 s per sitemap day). So flipping D3/D4 for the two Sentinels (sitemap outlets) needs no change to this test, and costs it about 2 s each; it checks that their days are fetched and get no depth row. It replaces the earlier tripwire that failed as soon as any sitemap outlet became usable. That flip still has to update the existing `usableOutlets is 24` and held-outlet checks, which are outside this PR.

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/lib/news-sweep.ts` | Modify (append after `sweep()`, which ends at line 418) | `CADENCE_HOURS`, `FeedDepth`, `feedDepthHours`, `shallowFeeds`, `depthLine`: pure depth helpers |
| `src/lib/news-intake.ts` | Modify (`:1-3` header, `:28` import, `:69-77` `SweepResult`, `:93-105` loop, `:130` return, new exports above `:174`, `:265-290` dedupe) | `runSweep` carries depth; `DEDUPE_CHUNK`, `DEDUPE_CHUNK_CHARS`, `chunkUrls`, `Handled`, `readHandled`; `enqueueIntake` uses `readHandled` |
| `src/app/api/cron/news-sweep/route.ts` | Modify (`:6-7` header, `:67-82`) | Logs `sweep.depthLine`; returns `shallowFeeds` |
| `vercel.json` | Modify (`:15`) | `0 11 * * 1,4` becomes `0 11 * * *` |
| `scripts/verify-news-sweep.ts` | Modify (`:24` import, `:402` comment, insert above `:668`) | Tests for the depth helpers and for `runSweep`'s depth (stubbed `fetch`) |
| `scripts/verify-news-enqueue.ts` | Modify (`:39-40` imports, `:377-391` cron checks, `:398-414` `fakeDb`, insert above `:452`) | Tests for the chunked reads, the 1,500-row cap, read errors, the real client's request size, and the cron's static checks |
| `scripts/news-sweep.ts` | Modify (`:35`, `:55`, comments only) | "twice-weekly cron" becomes "daily cron" |
| `scripts/news-enqueue.ts` | Modify (`:46`, comment only) | "twice-weekly cron" becomes "daily cron" |

No file is created. `scripts/verify-all.mjs` discovers the two verify scripts by name, so it needs no edit.

---

### Task 1: Feed depth helpers

**Files:**
- Modify: `src/lib/news-sweep.ts` (append at the end of the file, after line 418)
- Test: `scripts/verify-news-sweep.ts` (import at line 24; insert a block immediately above the final `if (failures > 0) {`, line 668)

**Interfaces:**
- Consumes: `FeedEntry` (`src/lib/news-sweep.ts:28-38`), `parseFeed(xml: string): FeedEntry[]` (`:155`).
- Produces (later tasks rely on these exact names):
  - `export const CADENCE_HOURS = 24;`
  - `export interface FeedDepth { domain: string; items: number; hours: number }`
  - `export function feedDepthHours(entries: readonly Pick<FeedEntry, "published">[], now: Date): { items: number; hours: number }`
  - `export function shallowFeeds(depth: readonly FeedDepth[], cadenceHours?: number): FeedDepth[]`
  - `export function depthLine(depth: readonly FeedDepth[], cadenceHours?: number): string`

- [ ] **Step 1: Write the failing test**

In `scripts/verify-news-sweep.ts`, replace line 24:

```ts
import { DEK_MAX, dek, normalizeUrl, parseFeed, parseNewsSitemap, sweep } from "../src/lib/news-sweep.ts";
```

with:

```ts
import {
  CADENCE_HOURS,
  DEK_MAX,
  dek,
  depthLine,
  feedDepthHours,
  normalizeUrl,
  parseFeed,
  parseNewsSitemap,
  shallowFeeds,
  sweep,
} from "../src/lib/news-sweep.ts";
```

Then insert this block immediately above the final `if (failures > 0) {` (line 668 before the import change). It uses the file's existing `check`, `NOW` (`2026-09-07T00:00:00Z`), `rss` and `item` helpers:

```ts
/* ---- feed depth (news-source-integrity §3.5, D9) ------------------------
   A feed shows only its last N items, so its depth decides what a daily run
   can see. feedDepthHours measures it; shallowFeeds names the feeds still
   losing stories at CADENCE_HOURS; depthLine is the one log line. */

const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3_600_000).toUTCString();
const entry = (published: string) => ({ published });

check("CADENCE_HOURS is daily", CADENCE_HOURS === 24, String(CADENCE_HOURS));

const deep = feedDepthHours([entry(at(2)), entry(at(70.25)), entry(at(5))], NOW);
check("depth counts dated items and ages the oldest",
  deep.items === 3 && deep.hours === 70.2, JSON.stringify(deep));

const emptyDepth = feedDepthHours([], NOW);
check("an empty feed reports 0 items and 0 hours",
  emptyDepth.items === 0 && emptyDepth.hours === 0, JSON.stringify(emptyDepth));

const undated = feedDepthHours([entry(""), entry("not a date"), entry(at(30)), entry(at(1))], NOW);
check("undated and unparseable items are skipped, not counted and not aged",
  undated.items === 2 && undated.hours === 30, JSON.stringify(undated));

const allUndated = feedDepthHours([entry(""), entry("garbage")], NOW);
check("a feed with only undated items reads as empty",
  allUndated.items === 0 && allUndated.hours === 0, JSON.stringify(allUndated));

const future = feedDepthHours([entry(new Date(NOW.getTime() + 3_600_000).toUTCString())], NOW);
check("a future-dated oldest item is 0 hours old, never negative",
  future.items === 1 && future.hours === 0, JSON.stringify(future));

/* The parsed fixture, end to end: parseFeed's output is what runSweep passes. */
const parsedDepth = feedDepthHours(parseFeed(rss(
  item("Newest", "https://www.tampabay.com/news/n", 0.5) + item("Oldest", "https://www.tampabay.com/news/o", 3),
)), NOW);
check("depth reads parseFeed's entries", parsedDepth.items === 2 && parsedDepth.hours === 72, JSON.stringify(parsedDepth));

/* The 24-hour edge. Rounding DOWN keeps `hours < 24` exact: 23h59m is
   shallow, exactly 24h is not. */
const justUnder = feedDepthHours([entry(new Date(NOW.getTime() - (24 * 3_600_000 - 60_000)).toISOString())], NOW);
const exactly = feedDepthHours([entry(at(24))], NOW);
check("23h59m rounds down to 23.9, not up to 24", justUnder.hours === 23.9, String(justUnder.hours));
const depthRows = [
  { domain: "wusf.org", items: 20, hours: 16.8 },
  { domain: "a-edge.example", ...justUnder },
  { domain: "b-edge.example", ...exactly },
  { domain: "wlrn.org", items: 40, hours: 200 },
  { domain: "empty.example", items: 0, hours: 0 },
];
const shallow = shallowFeeds(depthRows);
check("shallowFeeds: younger than 24h, shallowest first; exactly 24h and deeper are not shallow",
  shallow.map((d) => d.domain).join(",") === "empty.example,wusf.org,a-edge.example",
  shallow.map((d) => `${d.domain}:${d.hours}`).join(","));
check("shallowFeeds takes another cadence",
  shallowFeeds(depthRows, 100).map((d) => d.domain).join(",") === "empty.example,wusf.org,a-edge.example,b-edge.example");

check("depthLine names the count and each shallow feed with its hours",
  depthLine(depthRows) === "news-sweep depth: 5 feeds; shallow (<24h): empty.example 0h (0 items), wusf.org 16.8h, a-edge.example 23.9h",
  depthLine(depthRows));
check("depthLine says none when no feed is shallow",
  depthLine([{ domain: "wlrn.org", items: 40, hours: 200 }]) === "news-sweep depth: 1 feeds; shallow (<24h): none",
  depthLine([{ domain: "wlrn.org", items: 40, hours: 200 }]));

```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-news-sweep.ts; echo "exit $?"
```
Expected: `SyntaxError: The requested module '../src/lib/news-sweep.ts' does not provide an export named 'CADENCE_HOURS'`, `exit 1`.

- [ ] **Step 3: Write the implementation**

Append to the end of `src/lib/news-sweep.ts` (after the closing `}` of `sweep()`, line 418):

```ts

/* ---------- feed depth (news-source-integrity §3.5, D9) ----------------- */

/** The sweep's cadence in hours: daily at 11:00 UTC (vercel.json; founder D9,
    recommended and pending confirmation). A feed whose oldest item is younger
    than this drops stories between two runs, whatever the window says. */
export const CADENCE_HOURS = 24;

/** How far back one fetched RSS/Atom feed reached at sweep time. */
export interface FeedDepth {
  /** The outlet's list domain, e.g. "wlrn.org" or "cbsnews.com/miami". */
  domain: string;
  /** Items with a parseable date. Undated items are not counted. */
  items: number;
  /** Age of the oldest dated item in hours, rounded DOWN to one decimal, so
      `hours < CADENCE_HOURS` is true exactly when the real age is. 0 when
      `items` is 0. */
  hours: number;
}

/** A feed exposes only its last N items, so its depth, not the sweep's
    window, sets what a run can see (news-corpus-verification-2026-09-17.md).
    Pure: the caller passes the parsed entries and the sweep's `now`. Undated
    or unparseable items are skipped; an empty feed reports 0 items and 0
    hours. A future-dated oldest item counts as 0 hours old. */
export function feedDepthHours(
  entries: readonly Pick<FeedEntry, "published">[],
  now: Date,
): { items: number; hours: number } {
  let items = 0;
  let oldest = Infinity;
  for (const entry of entries) {
    const t = new Date(entry.published).getTime();
    if (Number.isNaN(t)) continue;
    items++;
    if (t < oldest) oldest = t;
  }
  if (items === 0) return { items: 0, hours: 0 };
  const hours = Math.max(0, (now.getTime() - oldest) / 3_600_000);
  return { items, hours: Math.floor(hours * 10) / 10 };
}

/** The feeds still losing stories at this cadence: oldest item younger than
    `cadenceHours`, shallowest first. An empty feed (0 items, 0 hours) is
    listed too: it showed nothing to measure, and that is worth a look. */
export function shallowFeeds(
  depth: readonly FeedDepth[],
  cadenceHours: number = CADENCE_HOURS,
): FeedDepth[] {
  return depth
    .filter((d) => d.hours < cadenceHours)
    .sort((a, b) => a.hours - b.hours || a.domain.localeCompare(b.domain));
}

/** The one log line a run prints:
      news-sweep depth: <n> feeds; shallow (<24h): <domain> <hours>h, …
    "none" when no feed is shallow; an empty feed reads "<domain> 0h (0 items)". */
export function depthLine(
  depth: readonly FeedDepth[],
  cadenceHours: number = CADENCE_HOURS,
): string {
  const shallow = shallowFeeds(depth, cadenceHours);
  const list =
    shallow.length === 0
      ? "none"
      : shallow
          .map((d) => (d.items === 0 ? `${d.domain} 0h (0 items)` : `${d.domain} ${d.hours}h`))
          .join(", ");
  return `news-sweep depth: ${depth.length} feeds; shallow (<${cadenceHours}h): ${list}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run the Step 2 command.
Expected: `verify-news-sweep: OK — reproducible, boundary holds, labels come from the list (37 outlets listed, 24 usable)`, `exit 0`.

- [ ] **Step 5: Mutation-check the edge**

In `feedDepthHours`, change `Math.floor(hours * 10) / 10` to `Math.round(hours * 10) / 10` and rerun the Step 2 command.
Expected: 4 FAILs, including `FAIL 23h59m rounds down to 23.9, not up to 24 — 24`, `exit 1`. Restore `Math.floor` and rerun: `exit 0`.

- [ ] **Step 6: Lint**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" node_modules/eslint/bin/eslint.js src/lib/news-sweep.ts scripts/verify-news-sweep.ts; echo "eslint exit $?"
```
Expected: no output, `eslint exit 0`.

- [ ] **Step 7: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git add src/lib/news-sweep.ts scripts/verify-news-sweep.ts && git commit -F - <<'EOF'
News sweep: feedDepthHours, shallowFeeds and depthLine

A feed exposes only its last N items, so its depth, not the 14-day window,
sets what a run can see. Pure helpers measure each fetched feed: dated items
and the oldest item's age in hours, rounded down so "younger than 24h" is
exact. An empty feed reports 0 items and is listed as shallow.
news-source-integrity §3.5, D9.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: `runSweep` carries the depth

**Files:**
- Modify: `src/lib/news-intake.ts` (import `:28`; `SweepResult` `:69-77`; `runSweep` loop `:93-105`; return `:130`)
- Test: `scripts/verify-news-sweep.ts` (import after line 25; insert a block immediately above the final `if (failures > 0) {`)

**Interfaces:**
- Consumes (Task 1): `feedDepthHours`, `shallowFeeds`, `depthLine`, `FeedDepth` from `./news-sweep.ts`; `parseFeed` (existing).
- Produces: `SweepResult` gains
  - `depth: FeedDepth[]` (one row per RSS/Atom feed fetched),
  - `shallowFeeds: FeedDepth[]`,
  - `depthLine: string`.
  `runSweep`'s signature is unchanged: `runSweep({ days?, log?, now? }): Promise<SweepResult>`. Task 4's route reads `sweep.depthLine` and `sweep.shallowFeeds`. `scripts/candidate-leads.ts:107-108` and `scripts/news-sweep.ts:57` also call `runSweep`; the new fields are additive, so they need no change.

- [ ] **Step 1: Write the failing test**

In `scripts/verify-news-sweep.ts`, after the line `import { electionPayloadFor } from "../src/lib/news-enqueue.ts";` (line 25), add:

```ts
import { runSweep } from "../src/lib/news-intake.ts";
```

Then insert this block immediately above the final `if (failures > 0) {` (after Task 1's block). It stubs `globalThis.fetch`, so nothing leaves the machine, and restores it in `finally`:

```ts
/* ---- runSweep carries the depth (news-source-integrity §3.5) ------------
   runSweep fetches, so the network is stubbed: every usable feed URL gets a
   fixture, nothing leaves the machine, and the real loop runs. One feed is
   shallow, one is empty, one fails, the rest are three days deep. */
{
  const sweepNow = new Date("2026-10-08T11:00:00Z");
  const ago = (h: number) => new Date(sweepNow.getTime() - h * 3_600_000).toUTCString();
  const dated = (title: string, link: string, hoursAgo: number) =>
    `<item><title>${title}</title><link>${link}</link><description>A dek.</description><pubDate>${ago(hoursAgo)}</pubDate></item>`;
  const rssFeeds = usableOutlets().filter((o) => o.feed !== null);
  check("at least three usable RSS feeds to stub", rssFeeds.length >= 3, String(rssFeeds.length));
  const [shallowOne, emptyOne, failingOne] = rssFeeds;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const host = `https://www.${shallowOne.domain.split("/")[0]}`;
    if (url === failingOne.feed) return new Response("gone", { status: 404 });
    if (url === emptyOne.feed) return new Response(rss(""), { status: 200 });
    if (url === shallowOne.feed) {
      return new Response(rss(dated("New", `${host}/a`, 2) + dated("Older", `${host}/b`, 10.5)), { status: 200 });
    }
    return new Response(rss(dated("Deep", "https://elsewhere.example/x", 72)), { status: 200 });
  }) as typeof fetch;
  try {
    const result = await runSweep({ days: 14, now: sweepNow });
    check("runSweep measures every fetched RSS feed, and only those",
      result.depth.length === rssFeeds.length - 1 && !result.depth.some((d) => d.domain === failingOne.domain),
      `${result.depth.length} rows for ${rssFeeds.length} feeds`);
    check("runSweep's depth row is feedDepthHours of that feed",
      JSON.stringify(result.depth.find((d) => d.domain === shallowOne.domain)) ===
        JSON.stringify({ domain: shallowOne.domain, items: 2, hours: 10.5 }),
      JSON.stringify(result.depth.find((d) => d.domain === shallowOne.domain)));
    check("runSweep's shallowFeeds are the empty and the shallow feed, shallowest first",
      result.shallowFeeds.map((d) => d.domain).join(",") === `${emptyOne.domain},${shallowOne.domain}`,
      JSON.stringify(result.shallowFeeds));
    check("runSweep's depthLine is depthLine(depth)",
      result.depthLine === depthLine(result.depth) &&
        result.depthLine.startsWith(`news-sweep depth: ${rssFeeds.length - 1} feeds; shallow (<24h): ${emptyOne.domain} 0h (0 items), ${shallowOne.domain} 10.5h`),
      result.depthLine);
  } finally {
    globalThis.fetch = realFetch;
  }
}

```

Note for the implementer: if a sitemap outlet ever becomes usable, `runSweep` sleeps 1 s per sitemap day, so this block would take about 15 s per such outlet. Today there are none (24 usable outlets, all RSS).

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-news-sweep.ts; echo "exit $?"
```
Expected: `TypeError: Cannot read properties of undefined (reading 'length')` (no `result.depth` yet), `exit 1`.

- [ ] **Step 3: Write the implementation**

In `src/lib/news-intake.ts`:

(a) Replace line 28:

```ts
import { parseNewsSitemap, sweep, type SweptArticle } from "./news-sweep.ts";
```

with:

```ts
import {
  depthLine,
  feedDepthHours,
  parseFeed,
  parseNewsSitemap,
  shallowFeeds,
  sweep,
  type FeedDepth,
  type SweptArticle,
} from "./news-sweep.ts";
```

(b) In `export interface SweepResult` (lines 69-77), replace:

```ts
  sitemapDaysOk: number;
  summary: string;
}
```

with:

```ts
  sitemapDaysOk: number;
  summary: string;
  /** One row per RSS/Atom feed fetched: its dated items and the age of its
      oldest (news-sweep.ts feedDepthHours). Sitemap outlets have no row:
      each day of their window is its own request, so they have no depth. */
  depth: FeedDepth[];
  /** The rows of `depth` younger than CADENCE_HOURS, shallowest first. */
  shallowFeeds: FeedDepth[];
  /** `news-sweep depth: <n> feeds; shallow (<24h): …`, for the logs. */
  depthLine: string;
}
```

(c) In `runSweep`, replace:

```ts
  const feeds: { outlet: Outlet; xml: string; format?: "feed" | "news-sitemap" }[] = [];
  let feedsOk = 0;
```

with:

```ts
  const feeds: { outlet: Outlet; xml: string; format?: "feed" | "news-sitemap" }[] = [];
  const depth: FeedDepth[] = [];
  let feedsOk = 0;
```

(d) In the same loop, replace:

```ts
      if (xml) {
        feeds.push({ outlet, xml });
        feedsOk++;
      }
```

with:

```ts
      if (xml) {
        feeds.push({ outlet, xml });
        depth.push({ domain: outlet.domain, ...feedDepthHours(parseFeed(xml), now) });
        feedsOk++;
      }
```

(e) Replace the return statement (line 130):

```ts
  return { articles, usable: usable.length, feedsOk, feedOutlets, sitemapDays, sitemapDaysOk, summary };
```

with:

```ts
  return {
    articles,
    usable: usable.length,
    feedsOk,
    feedOutlets,
    sitemapDays,
    sitemapDaysOk,
    summary,
    depth,
    shallowFeeds: shallowFeeds(depth),
    depthLine: depthLine(depth),
  };
```

- [ ] **Step 4: Run the test to verify it passes**

Run the Step 2 command.
Expected: `verify-news-sweep: OK — …`, `exit 0`.

- [ ] **Step 5: Mutation-check the wiring**

Delete the line `depth.push({ domain: outlet.domain, ...feedDepthHours(parseFeed(xml), now) });` and rerun the Step 2 command.
Expected: 4 FAILs, starting `FAIL runSweep measures every fetched RSS feed, and only those — 0 rows for 24 feeds`, `exit 1`. Restore the line and rerun: `exit 0`.

- [ ] **Step 6: Type-check and lint**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" node_modules/typescript/bin/tsc --noEmit; echo "tsc exit $?"; "$NODE" node_modules/eslint/bin/eslint.js src/lib/news-intake.ts scripts/verify-news-sweep.ts; echo "eslint exit $?"
```
Expected: `tsc exit 0`, `eslint exit 0`, no other output.

- [ ] **Step 7: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git add src/lib/news-intake.ts scripts/verify-news-sweep.ts && git commit -F - <<'EOF'
News intake: runSweep returns feed depth, shallow feeds and the depth line

Each RSS/Atom feed fetched gets a depth row (dated items, oldest item's
age). runSweep returns the rows, the shallow ones and the one-line summary
the cron will log. Sitemap outlets have no row. Tested offline with a
stubbed fetch over the real loop.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Chunked, error-checked dedupe reads

**Files:**
- Modify: `src/lib/news-intake.ts` (new exports inserted immediately above `/** Match, then queue the candidate matches` at line 174; the dedupe block at lines 265-290 inside `enqueueIntake`)
- Test: `scripts/verify-news-enqueue.ts` (imports `:39-40`; the static check `:389-390`; `fakeDb` `:398-414`; insert above the final `if (failures > 0) {`, line 452)

**Interfaces:**
- Consumes: `dedupeKey(url: string, candidateId: string | null): string` from `./news-enqueue.ts` (already imported in `news-intake.ts:31`).
- Produces:
  - `export const DEDUPE_CHUNK = 200;`
  - `export const DEDUPE_CHUNK_CHARS = 6_000;`
  - `export function chunkUrls(urls: readonly string[], opts?: { max?: number; maxChars?: number }): string[][]`
  - `export interface Handled { keys: Set<string>; urls: Set<string> }`
  - `export async function readHandled(db: SupabaseClient, urls: readonly string[]): Promise<Handled>`
  - `enqueueIntake`'s signature and `EnqueueResult` are unchanged.

- [ ] **Step 1: Write the failing tests**

In `scripts/verify-news-enqueue.ts`:

(a) Replace lines 39-40:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueIntake } from "../src/lib/news-intake.ts";
```

with:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { chunkUrls, DEDUPE_CHUNK, DEDUPE_CHUNK_CHARS, enqueueIntake, readHandled } from "../src/lib/news-intake.ts";
```

(b) Replace the static check at lines 389-390:

```ts
  check("rejected stories aren't re-queued on the next run",
    /\.in\("status", \["pending", "approved", "rejected"\]\)/.test(intake));
```

with:

```ts
  /* news-source-integrity §3.7: the review_item read is filtered by the
     sweep's URLs, never the whole table, and it has no status filter (any
     status counts; the behaviour is tested below). */
  const intakeCode = intake.replace(/\/\*[\s\S]*?\*\//g, "");
  check("the dedupe reads review_item by URL, any status",
    /\.eq\("kind", "manual_news"\)\s*\.in\("payload->>url", chunk\)/.test(intakeCode) &&
      !/\.in\("status"/.test(intakeCode),
    "expected .eq(\"kind\", \"manual_news\").in(\"payload->>url\", chunk) and no status filter");
```

(c) Replace the whole `fakeDb` function (lines 398-414, from `function fakeDb(tables: Record<string, Record<string, unknown>[]>) {` to its closing `}`) with this version. It resolves `payload->>url` the way PostgREST does, caps every response at 1,000 rows like Supabase's default "Max rows", records every read, and can fail every read of a table. Its `readonly` table type also clears the one strict-type error the standalone `tsc` run reports today, at the old line 444.

```ts
type Row = Record<string, unknown>;
interface FakeRead { table: string; eq: [string, unknown][]; in: [string, readonly unknown[]][] }
/* Like PostgREST: `payload->>url` reads a JSON field as text, and a response
   holds at most `maxRows` rows (Supabase's "Max rows", 1000 by default), the
   rest dropped without an error. `failOn` makes every read of a table fail. */
function fakeDb(
  tables: Record<string, readonly Row[]>,
  { maxRows = 1000, failOn = {} }: { maxRows?: number; failOn?: Record<string, string> } = {},
) {
  const inserted: Row[] = [];
  const reads: FakeRead[] = [];
  const field = (r: Row, col: string): unknown => {
    const [column, key] = col.split("->>");
    return key === undefined ? r[column] : (r[column] as Row | null | undefined)?.[key];
  };
  const from = (table: string) => {
    const read: FakeRead = { table, eq: [], in: [] };
    const q = {
      select: () => { reads.push(read); return q; },
      eq: (col: string, v: unknown) => { read.eq.push([col, v]); return q; },
      in: (col: string, vs: readonly unknown[]) => { read.in.push([col, vs]); return q; },
      upsert: async () => ({ error: null }),
      insert: async (rows: Row[]) => { inserted.push(...rows); return { error: null }; },
      then: (resolve: (v: { data: Row[] | null; error: { message: string } | null }) => unknown) => {
        if (failOn[table]) return resolve({ data: null, error: { message: failOn[table] } });
        const rows = (tables[table] ?? []).filter((r) =>
          read.eq.every(([c, v]) => field(r, c) === v) && read.in.every(([c, vs]) => vs.includes(field(r, c))));
        return resolve({ data: rows.slice(0, maxRows), error: null });
      },
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, inserted, reads };
}
```

(d) Insert these three blocks immediately above the final `if (failures > 0) {` (line 452 before the edits above):

```ts
/* ---- the dedupe reads, chunked by URL (news-source-integrity §3.7) ------ */
{
  const profile = ROSTER.map((r) => ({
    candidate_id: r.candidateId, race_id: r.raceId, candidate: { legal_name: r.legalName, ballot_status: "ballot" },
  }));
  const story = article({ title: "County ballots mailed this week", url: "https://www.wlrn.org/ballots-mailed" });

  /* Any status counts: approved and pending are skipped like rejected. */
  for (const status of ["approved", "pending"] as const) {
    const f = fakeDb({ profile, review_item: [{ kind: "manual_news", status, payload: { url: story.url, candidate_id: null } }] });
    const r = await enqueueIntake(f.db, [story]);
    check(`an election story already ${status} is not queued again`,
      r.queued === 0 && r.skipped === 1 && f.inserted.length === 0, JSON.stringify({ queued: r.queued, skipped: r.skipped }));
  }

  /* Past the response cap: 1,500 decided items, the match last. The old
     unfiltered read got the first 1,000 and queued the story a second time. */
  const decided: Row[] = Array.from({ length: 1500 }, (_, i) => ({
    kind: "manual_news",
    status: i % 2 === 0 ? "approved" : "rejected",
    payload: { url: `https://www.wlrn.org/older-${i}`, candidate_id: null },
  }));
  decided[1499] = { kind: "manual_news", status: "rejected", payload: { url: story.url, candidate_id: null } };
  const big = fakeDb({ profile, review_item: decided });
  const rBig = await enqueueIntake(big.db, [story]);
  check("with 1,500 decided items and the match last, the story is still skipped",
    rBig.queued === 0 && rBig.skipped === 1 && big.inserted.length === 0,
    JSON.stringify({ queued: rBig.queued, skipped: rBig.skipped }));

  /* 450 election stories: every read is filtered by URL, chunked, and the
     chunks cover exactly the stories' URLs. */
  const many = Array.from({ length: 450 }, (_, i) =>
    article({ title: `County ballots mailed this week, part ${i}`, url: `https://www.wlrn.org/2026/10/08/ballots-mailed-${i}` }));
  const wide = fakeDb({ profile });
  const rWide = await enqueueIntake(wide.db, many);
  const reviewReads = wide.reads.filter((r) => r.table === "review_item");
  const newsReads = wide.reads.filter((r) => r.table === "news_item");
  const urlsOf = (reads: FakeRead[], col: string) =>
    reads.flatMap((r) => r.in.filter(([c]) => c === col).flatMap(([, vs]) => vs as string[]));
  const wanted = many.map((a) => a.url).sort().join("\n");
  check("all 450 new election stories are queued", rWide.queued === 450, String(rWide.queued));
  check("every review_item read is manual_news filtered by payload->>url, with no status filter",
    reviewReads.length > 1 && reviewReads.every((r) =>
      r.eq.length === 1 && r.eq[0][0] === "kind" && r.eq[0][1] === "manual_news" &&
      r.in.length === 1 && r.in[0][0] === "payload->>url"),
    JSON.stringify(reviewReads.map((r) => ({ eq: r.eq, in: r.in.map(([c, vs]) => [c, vs.length]) }))));
  check("every read carries at most DEDUPE_CHUNK URLs",
    [...reviewReads, ...newsReads].every((r) => r.in.every(([, vs]) => vs.length <= DEDUPE_CHUNK)));
  check("the review_item chunks cover exactly the stories' URLs",
    urlsOf(reviewReads, "payload->>url").sort().join("\n") === wanted);
  check("the news_item reads use the same chunks",
    newsReads.length === reviewReads.length && urlsOf(newsReads, "url").sort().join("\n") === wanted);

  /* A read error throws, and nothing is queued. */
  for (const table of ["news_item", "review_item"]) {
    const f = fakeDb({ profile }, { failOn: { [table]: "simulated outage" } });
    let message = "";
    try {
      await enqueueIntake(f.db, [story]);
    } catch (err) {
      message = (err as Error).message;
    }
    check(`a failed ${table} read throws instead of queueing`,
      message.includes(table) && message.includes("simulated outage") && f.inserted.length === 0,
      JSON.stringify({ message, inserted: f.inserted.length }));
  }
}

/* chunkUrls on its own: the count bound, the size bound, order, and a URL too
   long for any chunk still gets one. */
{
  const short = Array.from({ length: 450 }, (_, i) => `https://a.b/${i}`);
  const byCount = chunkUrls(short, { maxChars: Infinity });
  check("chunkUrls: 450 URLs with no size bound make chunks of 200, 200, 50",
    byCount.map((c) => c.length).join(",") === "200,200,50", byCount.map((c) => c.length).join(","));
  check("chunkUrls keeps every URL in order", byCount.flat().join(",") === short.join(","));
  const longUrls = Array.from({ length: 400 }, (_, i) => `https://www.example-news-outlet.com/news/politics/elections/2026/10/08/a-long-headline-slug-that-goes-on-for-a-while-to-reach-one-seventy-${i}`);
  const bySize = chunkUrls(longUrls);
  /* What each URL adds to the query string: form-encoded, plus a comma and
     two quotes (the same allowance chunkUrls makes). */
  const encoded = (c: string[]) =>
    c.reduce((n, u) => n + new URLSearchParams([["", u]]).toString().length - 1 + 9, 0);
  check("chunkUrls: long URLs make chunks of at most DEDUPE_CHUNK_CHARS encoded characters",
    bySize.length > 2 && bySize.every((c) => c.length < DEDUPE_CHUNK && encoded(c) <= DEDUPE_CHUNK_CHARS) &&
      bySize.flat().join(",") === longUrls.join(","),
    bySize.map((c) => `${c.length}:${encoded(c)}`).join(","));
  const huge = `https://www.wlrn.org/${"x".repeat(7_000)}`;
  const alone = chunkUrls(["https://www.wlrn.org/a", huge, "https://www.wlrn.org/b"], { maxChars: 6_000 });
  check("chunkUrls: a URL longer than the size bound gets a chunk of its own",
    alone.length === 3 && alone[1].length === 1 && alone[1][0] === huge, alone.map((c) => c.length).join(","));
  check("chunkUrls: nothing in, nothing out", chunkUrls([]).length === 0);
}

/* The size bound against the real client: supabase-js builds each read's
   GET URL, captured here before it would leave the machine. Every request
   stays under 8 KB, including URLs that postgrest-js must quote. */
{
  const requested: string[] = [];
  const client = createClient("https://example.supabase.co", "offline-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (async (input: string | URL | Request) => {
        requested.push(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      }) as typeof fetch,
    },
  });
  const urls = Array.from({ length: 400 }, (_, i) =>
    `https://www.example-news-outlet.com/news/politics/elections/2026/10/08/headline-with-commas,and(parens)-${i}-${"y".repeat(90)}`);
  const handled = await readHandled(client, urls);
  const longest = Math.max(...requested.map((u) => u.length));
  check("readHandled through supabase-js sends two reads per chunk", requested.length === chunkUrls(urls).length * 2,
    `${requested.length} requests for ${chunkUrls(urls).length} chunks`);
  check("every dedupe request URL stays under 8 KB", longest <= 8192, `longest ${longest} characters`);
  check("the review_item request filters payload->>url",
    requested.some((u) => u.includes("/rest/v1/review_item?") && u.includes("payload-%3E%3Eurl=in.")));
  check("an empty answer is nothing handled", handled.keys.size === 0 && handled.urls.size === 0);
}

```

The existing dedupe tests at the old lines 415-450 (fresh story queued, second candidate still queued, rejected and published URLs skipped) keep running against the new `fakeDb` unchanged.

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-news-enqueue.ts; echo "exit $?"
```
Expected: `SyntaxError: The requested module '../src/lib/news-intake.ts' does not provide an export named 'chunkUrls'`, `exit 1`.

- [ ] **Step 3: Write the implementation**

In `src/lib/news-intake.ts`:

(a) Insert this immediately above the line `/** Match, then queue the candidate matches and the unmatched election stories` (line 174), leaving one blank line before it:

```ts
/** The most URLs one `.in()` dedupe read carries (news-source-integrity
    §3.7). */
export const DEDUPE_CHUNK = 200;

/** The most form-encoded URL characters one `.in()` read carries. The filter
    travels in the GET query string, and 200 real article URLs (median 109
    characters, longest 170, in the 2026-09-18 gold set) build a request URL
    of about 25.6 KB with supabase-js 2.110. Cloudflare documents a 16 KB URL
    limit, and nginx's default request-line buffer is 8 KB. 6,000 keeps a
    request under 8 KB with room for the path and the other filters, so a
    chunk is about 40 typical URLs. The live gateway's limit was not probed. */
export const DEDUPE_CHUNK_CHARS = 6_000;

/** What one URL adds to an `.in()` filter's query string. postgrest-js
    appends the list with URLSearchParams (form encoding), wraps a value that
    holds , ( or ) in double quotes, and joins values with commas; the 9
    covers an encoded comma and two encoded quotes. */
function inFilterChars(url: string): number {
  return new URLSearchParams([["", url]]).toString().length - 1 + 9;
}

/** Split URLs into the chunks the dedupe reads send: at most `max` URLs and
    `maxChars` encoded characters each, order kept. A URL too long for any
    chunk still gets one of its own; it is never dropped. Pure. */
export function chunkUrls(
  urls: readonly string[],
  { max = DEDUPE_CHUNK, maxChars = DEDUPE_CHUNK_CHARS }: { max?: number; maxChars?: number } = {}
): string[][] {
  const chunks: string[][] = [];
  let chunk: string[] = [];
  let chars = 0;
  for (const url of urls) {
    const n = inFilterChars(url);
    if (chunk.length > 0 && (chunk.length >= max || chars + n > maxChars)) {
      chunks.push(chunk);
      chunk = [];
      chars = 0;
    }
    chunk.push(url);
    chars += n;
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
}

export interface Handled {
  /** `dedupeKey(url, candidate)` of every `news_item` row, and of every
      `manual_news` review item in any status, at the URLs asked about. */
  keys: Set<string>;
  /** The same URLs, under any candidate or none. */
  urls: Set<string>;
}

/** What is already queued, decided or published at these URLs. Both reads
    are filtered by URL, in the same chunks, so each response is bounded by
    its chunk and never by the size of the table: Supabase caps a response at
    its "Max rows" setting (1000 by default) and drops the rest without an
    error, and past that cap a story an operator already decided would be
    queued again. Any status counts (pending, approved, rejected: 0006's
    CHECK). Either read failing throws, so the cron answers 502 instead of
    queueing on a partial read. */
export async function readHandled(
  db: SupabaseClient,
  urls: readonly string[]
): Promise<Handled> {
  const keys = new Set<string>();
  const seenUrls = new Set<string>();
  for (const chunk of chunkUrls([...new Set(urls)])) {
    const published = await db.from("news_item").select("url, candidate_id").in("url", chunk);
    if (published.error) {
      throw new Error(`could not read news_item to dedupe: ${published.error.message}`);
    }
    for (const r of (published.data ?? []) as { url: string; candidate_id: string | null }[]) {
      keys.add(dedupeKey(r.url, r.candidate_id));
      seenUrls.add(r.url);
    }
    const queued = await db
      .from("review_item")
      .select("payload")
      .eq("kind", "manual_news")
      .in("payload->>url", chunk);
    if (queued.error) {
      throw new Error(`could not read review_item to dedupe: ${queued.error.message}`);
    }
    for (const r of (queued.data ?? []) as {
      payload: { url?: string; candidate_id?: string | null } | null;
    }[]) {
      if (!r.payload?.url) continue;
      keys.add(dedupeKey(r.payload.url, r.payload.candidate_id ?? null));
      seenUrls.add(r.payload.url);
    }
  }
  return { keys, urls: seenUrls };
}

```

(b) In `enqueueIntake`, keep the comment that starts `/* Skip anything already queued or published for this (url, candidate), the` (lines 252-264) and replace the code under it (lines 265-290):

```ts
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
```

with:

```ts
  const handled = await readHandled(
    db,
    all.map((r) => r.url)
  );
  const rows = all
    .filter((r) => !handled.keys.has(r.key) && !(r.election && handled.urls.has(r.url)))
```

The `.map((r) => ({ kind: "manual_news", source: "agent:R1", status: "pending", payload: r.payload }))` that follows is unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command.
Expected: `verify-news-enqueue: OK — the relation tier reaches the payload for both tiers, …`, `exit 0`.

- [ ] **Step 5: Mutation-check the read**

Put the old block from Step 3(b) back in place of the new one (keep the new exports), and rerun the Step 2 command.
Expected: 7 FAILs, including:
```
  FAIL the dedupe reads review_item by URL, any status — …
  FAIL with 1,500 decided items and the match last, the story is still skipped — {"queued":1,"skipped":0}
  FAIL every review_item read is manual_news filtered by payload->>url, with no status filter — …
  FAIL a failed news_item read throws instead of queueing — {"message":"","inserted":1}
  FAIL a failed review_item read throws instead of queueing — {"message":"","inserted":1}
```
and `exit 1`. Restore the new block.

Then change `export const DEDUPE_CHUNK_CHARS = 6_000;` to `export const DEDUPE_CHUNK_CHARS = 1_000_000;` and rerun.
Expected: 2 FAILs, `chunkUrls: long URLs make chunks of at most DEDUPE_CHUNK_CHARS encoded characters — 200:…,200:…` and `every dedupe request URL stays under 8 KB — longest 46707 characters`, `exit 1`. Restore `6_000` and rerun: `exit 0`.

- [ ] **Step 6: Type-check and lint**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" node_modules/typescript/bin/tsc --noEmit; echo "tsc exit $?"; "$NODE" node_modules/eslint/bin/eslint.js src/lib/news-intake.ts scripts/verify-news-enqueue.ts; echo "eslint exit $?"
```
Expected: `tsc exit 0`, `eslint exit 0`, no warnings (an unused import is a warning; every import added in Step 1 is used).

- [ ] **Step 7: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git add src/lib/news-intake.ts scripts/verify-news-enqueue.ts && git commit -F - <<'EOF'
News intake: dedupe reads filtered by URL, chunked, and error-checked

The review_item read took every manual_news item in one unpaged select.
Supabase caps a response at its Max rows (1000 by default), so past that a
story an operator already decided could be queued again. readHandled reads
news_item and review_item by URL in the same chunks (at most 200 URLs and
6,000 encoded characters, so a GET stays under 8 KB) and throws on a read
error, so the cron answers 502 instead of queueing on a partial read. Any
status still counts. news-source-integrity §3.7.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Daily cron, the depth log line, `shallowFeeds` in the response

**Files:**
- Modify: `vercel.json` (line 15)
- Modify: `src/app/api/cron/news-sweep/route.ts` (header `:6-7`; `:67-82`)
- Modify: `scripts/news-sweep.ts` (`:35`, `:55`), `scripts/news-enqueue.ts` (`:46`), `src/lib/news-intake.ts` (`:2`), `scripts/verify-news-sweep.ts` (`:402`): comments only
- Test: `scripts/verify-news-enqueue.ts` (the cron block at `:377-385`)

**Interfaces:**
- Consumes (Task 2): `sweep.depthLine: string`, `sweep.shallowFeeds: FeedDepth[]` on `SweepResult`.
- Produces: the route's 200 JSON gains `shallowFeeds` (array of `{ domain, items, hours }`); the queue-failure 502 JSON gains the same key. One `console.log` per authorized run whose sweep returned. No `agent_run` write (the retrofit's PR A owns that; see "Overlap with other PRs" below).

- [ ] **Step 1: Write the failing checks**

In `scripts/verify-news-enqueue.ts`, replace the head of the cron block (old lines 377-382):

```ts
/* The twice-weekly cron (founder 2026-10-06). */
{
  const vercel = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "vercel.json"), "utf8"));
  const cron = (vercel.crons ?? []).find((c: { path: string }) => c.path === "/api/cron/news-sweep");
  check("vercel.json runs /api/cron/news-sweep Mondays and Thursdays", cron?.schedule === "0 11 * * 1,4", JSON.stringify(cron));
  const routeSrc = readFileSync(resolve(import.meta.dirname, "..", "src/app/api/cron/news-sweep/route.ts"), "utf8");
```

with:

```ts
/* The daily cron (news-source-integrity §3.5, D9: recommended, pending the
   founder; it was Mondays and Thursdays from 2026-10-06). TO FLIP: restore
   "0 11 * * 1,4" in vercel.json and here. */
{
  const vercel = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "vercel.json"), "utf8"));
  const cron = (vercel.crons ?? []).find((c: { path: string }) => c.path === "/api/cron/news-sweep");
  check("vercel.json runs /api/cron/news-sweep daily at 11:00 UTC", cron?.schedule === "0 11 * * *", JSON.stringify(cron));
  const routeSrc = readFileSync(resolve(import.meta.dirname, "..", "src/app/api/cron/news-sweep/route.ts"), "utf8");
  const routeCode = routeSrc.replace(/\/\*[\s\S]*?\*\//g, "");
  check("the window stays 14 days, so overlap and dedupe are unchanged", /const WINDOW_DAYS = 14;/.test(routeCode));
  const logAt = routeCode.indexOf("console.log(sweep.depthLine)");
  const queueAt = routeCode.indexOf("enqueueIntake(service, sweep.articles)");
  check("the cron logs the depth line once the sweep returns, before queueing can fail",
    logAt !== -1 && queueAt !== -1 && logAt < queueAt, `log@${logAt} queue@${queueAt}`);
  check("both the 200 and the queue-failure 502 carry shallowFeeds",
    (routeCode.match(/shallowFeeds: sweep\.shallowFeeds/g) ?? []).length === 2);
```

The lines after it in that block (the `CRON_SECRET` check, the "only ever writes pending review items" check, and Task 3's "reads review_item by URL" check) stay.

- [ ] **Step 2: Run the checks to verify they fail**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-news-enqueue.ts; echo "exit $?"
```
Expected:
```
  FAIL vercel.json runs /api/cron/news-sweep daily at 11:00 UTC — {"path":"/api/cron/news-sweep","schedule":"0 11 * * 1,4"}
  FAIL the cron logs the depth line once the sweep returns, before queueing can fail — log@-1 queue@…
  FAIL both the 200 and the queue-failure 502 carry shallowFeeds
```
`exit 1`.

- [ ] **Step 3: Move the cron to daily**

In `vercel.json`, replace:

```json
      "path": "/api/cron/news-sweep",
      "schedule": "0 11 * * 1,4"
```

with:

```json
      "path": "/api/cron/news-sweep",
      "schedule": "0 11 * * *"
```

- [ ] **Step 4: Log the depth line and return `shallowFeeds`**

In `src/app/api/cron/news-sweep/route.ts`:

(a) Replace the first two lines of the header comment (lines 6-7):

```ts
/* The news intake, twice a week (founder 2026-10-06; vercel.json, Mondays and
   Thursdays). It sweeps every usable outlet for the last 14 days and queues
```

with:

```ts
/* The news intake, daily at 11:00 UTC (vercel.json; news-source-integrity
   §3.5, founder decision D9, recommended and pending confirmation; it ran
   Mondays and Thursdays from 2026-10-06). Most feeds hold under three days of
   stories, so a twice-weekly run missed what fell off between runs; daily
   leaves only the feeds the depth line below names as shallow. It sweeps
   every usable outlet for the last 14 days and queues
```

(b) Replace (lines 68-72):

```ts
  try {
    const result = await enqueueIntake(service, sweep.articles);
    return NextResponse.json({
      sweep: sweep.summary,
      fetchFailures: failures,
```

with:

```ts
  /* Feed depth, one line per run, logged before queueing so a run that fails
     to queue still records it. Vercel's runtime logs keep it for a while;
     the response carries the shallow feeds for a manual POST. */
  console.log(sweep.depthLine);

  try {
    const result = await enqueueIntake(service, sweep.articles);
    return NextResponse.json({
      sweep: sweep.summary,
      shallowFeeds: sweep.shallowFeeds,
      fetchFailures: failures,
```

(c) Replace (line 81):

```ts
      { sweep: sweep.summary, error: (err as Error).message },
```

with:

```ts
      { sweep: sweep.summary, shallowFeeds: sweep.shallowFeeds, error: (err as Error).message },
```

Leave `WINDOW_DAYS = 14`, `maxDuration = 300` and the auth code as they are.

- [ ] **Step 5: Keep the cadence comments true**

Comment-only edits ("twice-weekly" becomes "daily"):

- `src/lib/news-intake.ts` line 2: `   scripts/news-enqueue.ts) and the twice-weekly cron` becomes `   scripts/news-enqueue.ts) and the daily cron`.
- `scripts/news-sweep.ts` line 35: `   src/lib/news-intake.ts, shared with the twice-weekly cron. */` becomes `   src/lib/news-intake.ts, shared with the daily cron. */`.
- `scripts/news-sweep.ts` line 55: `   twice-weekly cron runs (src/app/api/cron/news-sweep/route.ts). */` becomes `   daily cron runs (src/app/api/cron/news-sweep/route.ts). */`.
- `scripts/news-enqueue.ts` line 46: `   (enqueueIntake), shared with the twice-weekly cron, and an article that` becomes `   (enqueueIntake), shared with the daily cron, and an article that`.
- `scripts/verify-news-sweep.ts` line 402 (before Task 1's import change; search for it): `   otherwise stop the whole twice-weekly intake run. */` becomes `   otherwise stop the whole daily intake run. */`.

Then confirm nothing else in these files still says twice-weekly:
```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git grep -n -i -E 'twice[- ]weekly|twice a week|Mondays and Thursdays' -- vercel.json src/lib/news-intake.ts src/lib/news-sweep.ts src/app/api/cron/news-sweep/route.ts scripts/news-sweep.ts scripts/news-enqueue.ts scripts/verify-news-sweep.ts scripts/verify-news-enqueue.ts
```
Expected: only the two history mentions this task wrote on purpose: `route.ts` ("it ran Mondays and Thursdays from 2026-10-06", "a twice-weekly run missed") and `verify-news-enqueue.ts` ("it was Mondays and Thursdays from 2026-10-06"). `agents/r5-candidate-leads.prompt.md` and `src/lib/candidate-leads.ts` mention R5's own twice-weekly schedule, which is a different job; leave them.

- [ ] **Step 6: Run the checks to verify they pass**

Run the Step 2 command, then:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-news-sweep.ts; echo "exit $?"
```
Expected: both print `OK`, both `exit 0`.

- [ ] **Step 7: Mutation-check the order**

Move `console.log(sweep.depthLine);` inside the `try`, after the `enqueueIntake` call, and rerun `scripts/verify-news-enqueue.ts`.
Expected: `FAIL the cron logs the depth line once the sweep returns, before queueing can fail — log@… queue@…`, `exit 1`. Move it back and rerun: `exit 0`.

- [ ] **Step 8: Type-check and lint**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" node_modules/typescript/bin/tsc --noEmit; echo "tsc exit $?"; "$NODE" node_modules/eslint/bin/eslint.js src/app/api/cron/news-sweep/route.ts src/lib/news-intake.ts scripts/news-sweep.ts scripts/news-enqueue.ts scripts/verify-news-sweep.ts scripts/verify-news-enqueue.ts; echo "eslint exit $?"
```
Expected: `tsc exit 0`, `eslint exit 0`, no other output.

- [ ] **Step 9: Commit**

```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git add vercel.json src/app/api/cron/news-sweep/route.ts src/lib/news-intake.ts scripts/news-sweep.ts scripts/news-enqueue.ts scripts/verify-news-sweep.ts scripts/verify-news-enqueue.ts && git commit -F - <<'EOF'
News sweep cron: daily at 11:00 UTC, with the depth line and shallowFeeds

Most feeds hold under three days of stories, so the Monday/Thursday sweep
missed what fell off between runs. The cron now runs daily (D9, recommended
and pending founder confirmation; TO FLIP: restore 0 11 * * 1,4). The window
stays 14 days. Each run logs "news-sweep depth: <n> feeds; shallow (<24h):
..." before queueing, and the JSON response carries shallowFeeds.
news-source-integrity §3.5.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Full verification, then the pull request

**Files:** none changed (unless a check fails; fix in the task that owns the file and recommit).

- [ ] **Step 1: Every verify script**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" scripts/verify-all.mjs 2>&1 | grep -E '^\s+(FAIL|SKIPPED|PARTIAL)|^verify-all'
```
Expected (the known baseline: one live-data failure, two env-gated skips):
```
verify-all: 71 runs, 4 at a time
  SKIPPED  verify-admin-ops.mjs …: needs SUPABASE_SERVICE_ROLE_KEY (withheld: write probes are opt-in)
  FAIL     verify-news-neutrality.ts …: exit 1
  SKIPPED  verify-refresh-schema.mjs …: needs SUPABASE_SERVICE_ROLE_KEY (withheld: write probes are opt-in) …
  PARTIAL  verify-notifications-schema.mjs    offline checks only; …
verify-all: 68 passed (1 offline only), 1 failed, 2 skipped (needs env), 71 total
```
Any FAIL other than `verify-news-neutrality.ts` is a regression: stop and fix it. `verify-news-neutrality.ts` is the known live-data failure (it reads the live tables read-only and fails on rows this PR does not touch); report it, do not try to fix it here.

- [ ] **Step 2: The project type-check and the strict script type-check**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" node_modules/typescript/bin/tsc --noEmit; echo "project tsc exit $?"; "$NODE" node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target es2022 --lib es2022,dom --module esnext --moduleResolution bundler --allowImportingTsExtensions --types node scripts/verify-news-sweep.ts scripts/verify-news-enqueue.ts scripts/news-sweep.ts scripts/news-enqueue.ts; echo "scripts tsc exit $?"
```
Expected: `project tsc exit 0`, `scripts tsc exit 0`. (Before this PR the strict run reported one error, `scripts/verify-news-enqueue.ts(444,22): error TS2345` about a `readonly` fixture; Task 3's `fakeDb` signature removes it.)

- [ ] **Step 3: Lint every changed file**

Run:
```bash
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"; cd /Users/jsloth/Projects/kyv-build/newsB && "$NODE" node_modules/eslint/bin/eslint.js src/lib/news-sweep.ts src/lib/news-intake.ts src/app/api/cron/news-sweep/route.ts scripts/verify-news-sweep.ts scripts/verify-news-enqueue.ts scripts/news-sweep.ts scripts/news-enqueue.ts; echo "eslint exit $?"
```
Expected: no output, `eslint exit 0`.

- [ ] **Step 4: The Next build (the cron route is compiled by it)**

Run:
```bash
set -o pipefail; ND="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin"; cd /Users/jsloth/Projects/kyv-build/newsB && PATH="$ND:$PATH" "$ND/node" node_modules/next/dist/bin/next build 2>&1 | tail -15; echo "build exit $?"
```
Expected: the route table ending with the `○ (Static)`, `● (SSG)`, `ƒ (Dynamic)` legend, and `build exit 0`. Then confirm the build left no tracked change:
```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git status --short
```
Expected: no output. (If `next build` rewrote `AGENTS.md` or `next-env.d.ts`, restore it with `git checkout -- <file>`; it is not part of this PR.)

- [ ] **Step 5: Review the diff against the scope**

Run:
```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git diff --stat 08384c5..HEAD
```
Expected: exactly these 8 files plus this plan (`docs/superpowers/plans/2026-10-08-news-sweep.md`, committed on the branch before Task 1):
`scripts/news-enqueue.ts`, `scripts/news-sweep.ts`, `scripts/verify-news-enqueue.ts`, `scripts/verify-news-sweep.ts`, `src/app/api/cron/news-sweep/route.ts`, `src/lib/news-intake.ts`, `src/lib/news-sweep.ts`, `vercel.json`. No `supabase/migrations/` file, nothing under `src/app/(public)/`, no `agent_run` in the diff:
```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git diff 08384c5..HEAD | grep -c agent_run
```
Expected: `0`.

- [ ] **Step 6: Push the branch and open the pull request (never merge)**

```bash
cd /Users/jsloth/Projects/kyv-build/newsB && git push -u origin claude/news-daily-sweep
```

Open the PR against `main` with `gh pr create --base main --head claude/news-daily-sweep --title "News: daily sweep, feed depth on record, chunked dedupe reads" --body-file <file>`, the body written to a file in the session scratchpad first. The body must contain:

1. **What and why**: the three changes, with the spec reference (news-source-integrity §3.5, §3.7, D9; rollout step 2).
2. **Decisions this PR encodes**: decisions 1 to 19 from this plan, each with its TO FLIP where it has one. Say plainly that D9 is recommended and pending founder confirmation (its TO FLIP includes `CADENCE_HOURS = 96`), that the 6,000-character chunk bound deviates from spec §3.7's 200-URL chunks, with the measured numbers and that the live gateway limit was not probed, that wiring the depth line into the `agent_run` summary is deferred to whichever of this PR and retrofit PR A merges second (decision 14, a tracked follow-up), that the cron stays daily after Nov 3 until someone changes it (decision 17), and that `, <k> failed` is an addition to the spec's depth-line template (decision 18).
3. **Base**: the branch starts at `08384c5` (the migration-ledger commit, `claude/migration-ledger-2026-10-09`), which is not on `main` yet; that commit drops out of this PR's diff once the ledger PR merges. This PR does not depend on it.
4. **Verification**: the outputs of Steps 1 to 4 above, including the known `verify-news-neutrality.ts` live-data failure and the two env-gated skips.
5. **Overlap with other PRs** (below).
6. **After deploy (founder or operator; not done by this PR)**: per spec rollout step 2, target Mon 10-12 before that day's 11:00 UTC run. After the first daily run, read the `news-sweep depth:` line in the Vercel runtime logs for `/api/cron/news-sweep` (or, once the retrofit's PR A has landed, the run's `agent_run` summary), or make a manual `POST` with `x-cron-secret`. Check `shallowFeeds`, and that `skipped` is above 0 (its 14-day window re-reads stories the previous run queued). A 502 naming `could not read … to dedupe` means a dedupe read failed; it queued nothing.
7. The line `🤖 Generated with [Claude Code](https://claude.com/claude-code)` at the end.

Do not merge, do not enable auto-merge, do not push to `main`.

---

## Overlap with other PRs

- **Agent retrofit PR A** (`claude/agent-wrapper`, built in parallel) adds an `agent_run` row at the end of the same cron route, with `summary` = "the sweep and queue lines" (retrofit spec `:477-493`). Both PRs edit `src/app/api/cron/news-sweep/route.ts`; whichever merges second rebases. The depth line belongs in that row's `summary` (this spec §3.5). This PR exposes it as `sweep.depthLine` and does not touch `agent_run`. If PR A is already on `main` when this branch rebases, resolve the route conflict keeping both changes, and report to the orchestrator that `sweep.depthLine` still needs adding to PR A's summary; do not edit PR A's `agent_run` code here.
- **News-source-integrity PR A** (official sources, `src/lib/election-news.ts`) needs "the same chunked reads" (§3.7) for R3's queue. If this PR lands first, it can import `readHandled` and `chunkUrls` from `src/lib/news-intake.ts`.
- **Agent retrofit PRs B and D** edit `src/lib/news-intake.ts` (`loadBallotRoster`, retrofit `:631-638`), in `loadRoster`'s area, not the dedupe or sweep code changed here.

## Out of scope (other PRs or later)

- Writing `agent_run` from the cron (retrofit PR A).
- WordPress paging (`?paged=N`) for shallow feeds (spec §7); the depth line is what will say whether it is needed.
- Any migration, including an index on `review_item ((payload->>'url'))`.
- The `/methodology` copy, the runbook and `news-issues.ts` text (the spec's copy PR, §3.8).
- R3's queue CLI, `official-sources.ts`, the approve path (the spec's PR A).
- Changing the hand-run scripts' behaviour, beyond `scripts/news-sweep.ts` printing the depth line (decision 15); otherwise only their comments change.
