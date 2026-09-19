/* Builds an evaluation pool of REAL headlines, straight from the verified
   feeds — docs/superpowers/specs/2026-09-18-news-characterization-design.md §6.

   Why this exists rather than reading news_item. The live table holds 14
   seeded rows (6 official_link, 8 election_news) and no swept articles,
   because every outlet's `leanTag` is null pending founder gate C7-a, so
   `usableOutlets()` returns 0 and the sweep has never run. An evaluation needs
   real press coverage, so this reads the feeds directly.

   WHY IGNORING THE LEAN GATE IS CORRECT HERE, stated plainly because it looks
   like a shortcut: `usableOutlets()` gates the sweep→STORE path. Its purpose
   is that no row reaches a voter without an attributable, labelled source
   (news-fairness.md §1, "no source, no card"). This script stores nothing and
   shows nothing to anyone — it writes a local JSONL file used to measure a
   classifier offline. The 2026-09-17 corpus verification fetched these same
   feeds for the same kind of reason. Nothing here may be inserted into
   news_item; that path still requires C7-a.

   One request per host, sequential, with a delay — BLOX/TownNews rate-limits
   across hosts (verification §3 item 3), and several outlets declare a
   crawl-delay. Failures are reported and skipped, never retried in-run.

   Run: node scripts/news-eval-pool.ts [--per-outlet 4] [--days 14] > pool.jsonl */

import { OUTLETS } from "../src/lib/news-sources.ts";
import { parseFeed } from "../src/lib/news-sweep.ts";

const args = process.argv.slice(2);
const flag = (n: string, d: number) => {
  const i = args.indexOf(n);
  if (i === -1) return d;
  const v = Number(args[i + 1]);
  if (!Number.isFinite(v) || v < 1) { console.error(`${n} needs a positive number`); process.exit(2); }
  return v;
};
const perOutlet = flag("--per-outlet", 4);
const days = flag("--days", 14);
const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
const UA = "KnowYourVote/1.0";

const withFeeds = OUTLETS.filter((o) => o.feed !== null);
console.error(`fetching ${withFeeds.length} feeds, up to ${perOutlet} items each, ${days}-day window`);

let ok = 0, failed = 0, emitted = 0;

for (const outlet of withFeeds) {
  try {
    const res = await fetch(outlet.feed!, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) { failed++; console.error(`  ${res.status} ${outlet.domain}`); continue; }
    const entries = parseFeed(await res.text());
    ok++;

    let taken = 0;
    for (const e of entries) {
      if (taken >= perOutlet) break;
      const when = Date.parse(e.published);
      if (Number.isFinite(when) && when < cutoff) continue;
      if (!e.title.trim() || !e.link.trim()) continue;
      /* Publisher and outlet are recorded for the report's per-outlet
         breakdown ONLY. They are not passed to the model — the characterizer's
         state carries no outlet identity (spec §4.3). */
      console.log(JSON.stringify({
        title: e.title,
        summary: e.summary.trim() || null,
        url: e.link,
        outlet: outlet.domain,
        publisher: outlet.publisher,
        publishedAt: Number.isFinite(when) ? new Date(when).toISOString() : null,
        issues: null, // ← to be filled in by a human; null means UNLABELLED
      }));
      taken++; emitted++;
    }
  } catch (e) {
    failed++;
    console.error(`  FAIL ${outlet.domain}: ${(e as Error).message.slice(0, 60)}`);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

console.error(`\n${ok} feeds ok, ${failed} failed, ${emitted} articles emitted`);
if (emitted === 0) { console.error("no articles — refusing to write an empty pool"); process.exit(1); }
