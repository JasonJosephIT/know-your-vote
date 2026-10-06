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
       Sweep every usable outlet (both founder gates filled, no fail-closed flag).
       RSS outlets are one request each; sitemap outlets (retrieval mode 2) are one
       request per day in the window. Print the articles. Fail-closed: no usable
       outlets means no output and a non-zero exit, never a silent empty success. */

import { OUTLETS } from "../src/lib/news-sources.ts";
import { fetchText, runSweep } from "../src/lib/news-intake.ts";

const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) || 14;

/* The fetch, its user agent and its failure logging live in
   src/lib/news-intake.ts, shared with the twice-weekly cron. */
const get = (url: string) => fetchText(url, (line) => console.error(line));

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

/* The sweep itself is src/lib/news-intake.ts runSweep, the same code the
   twice-weekly cron runs (src/app/api/cron/news-sweep/route.ts). */
try {
  const result = await runSweep({ days, log: (line) => console.error(line) });
  console.error(result.summary);
  console.log(JSON.stringify(result.articles, null, 2));
} catch (err) {
  console.error((err as Error).message + "\nFill those in (see the header of src/lib/news-sources.ts) — run --probe to find the feeds.");
  process.exit(1);
}
