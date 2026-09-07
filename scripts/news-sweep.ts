/* Runs the corpus sweep — candidate-news-PRD.md §5 (task C7).

   This is the ONE part of C7 that touches the network, which is why it is a
   script and not a library: everything decidable is in src/lib/news-sweep.ts
   and verified offline by scripts/verify-news-sweep.ts. Run that first; if it
   fails, this script's output is not worth reading.

   It prints JSON and writes nothing. Turning swept articles into rows is §6
   (task C8) — the matcher decides which candidates an article attaches to,
   and that decision is not this script's to make.

   Two modes:

     node scripts/news-sweep.ts --probe
       For each listed outlet, fetch the homepage and print any RSS/Atom feed
       it advertises. This exists to close the `feed: null` founder gate — the
       session that wrote news-sources.ts had no network egress and refused to
       guess feed URLs, because a feed URL that 404s fails silently and looks
       exactly like "no news this week". Paste the confirmed URLs into
       news-sources.ts in a PR.

     node scripts/news-sweep.ts [--days 14]
       Sweep every usable outlet (both founder gates filled) and print the
       articles. Fail-closed: no usable outlets means no output and a non-zero
       exit, never a silent empty success. */

import { OUTLETS, urlBelongsTo, usableOutlets } from "../src/lib/news-sources.ts";
import { sweep } from "../src/lib/news-sweep.ts";

const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) || 14;
const UA = "KnowYourVote/1.0 (+https://github.com/JasonJosephIT/know-your-vote)";

async function get(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/atom+xml, text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`  HTTP ${res.status} ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    /* Degrade honestly: name the failure, never a silent empty result. */
    console.error(`  ${(err as Error).name}: ${url}`);
    return null;
  }
}

if (args.includes("--probe")) {
  for (const outlet of OUTLETS) {
    const host = outlet.domain.split("/")[0];
    const html = await get(`https://${host}/`);
    if (!html) continue;
    const feeds = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((m) => m[0])
      .filter((t) => /rel\s*=\s*["']alternate["']/i.test(t) && /(rss|atom)\+xml/i.test(t))
      .map((t) => t.match(/href\s*=\s*["']([^"']+)["']/i)?.[1])
      .filter((h): h is string => Boolean(h))
      .map((h) => new URL(h, `https://${host}/`).toString());
    console.log(JSON.stringify({ domain: outlet.domain, publisher: outlet.publisher, feeds }));
  }
  process.exit(0);
}

const usable = usableOutlets();
if (usable.length === 0) {
  console.error(
    `No usable outlets: ${OUTLETS.length} listed, 0 with both a signed-off leanTag and a verified feed.\n` +
      `Fill those in (see the header of src/lib/news-sources.ts) — run --probe to find the feeds.`,
  );
  process.exit(1);
}

const feeds = [];
for (const outlet of usable) {
  const xml = await get(outlet.feed!);
  if (xml) feeds.push({ outlet, xml });
}

const articles = sweep({ feeds, now: new Date(), windowDays: days, belongsTo: urlBelongsTo });
console.error(
  `swept ${feeds.length}/${usable.length} feeds -> ${articles.length} articles in the last ${days} days`,
);
console.log(JSON.stringify(articles, null, 2));
