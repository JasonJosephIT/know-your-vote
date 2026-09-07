/* Guardrail for candidate-news-PRD.md §5 (task C7) — the corpus sweep.

   Pins C7's three acceptance clauses, each of which is a neutrality property
   that would fail silently if broken:

     1. Two sweeps over the same window return the same article set. A sweep
        that is not reproducible cannot support the coverage-variance number
        §5 exists to make meaningful.
     2. An off-list domain never appears. The outlet list is the auditable
        boundary; a syndicated link that smuggles a domain past it destroys
        that.
     3. Every article carries publisher / type / lean_tag taken FROM THE LIST,
        never from the feed and never from an agent.

   Also pins the two founder gates: an outlet with no signed-off lean, or no
   verified feed, produces nothing rather than a guess.

   Pure and offline: no DB, no network, no clock (the sweep takes `now`).
   Node >= 22 strips types natively.

   Run: node scripts/verify-news-sweep.ts */

import { OUTLETS, urlBelongsTo, usableOutlets, type Outlet } from "../src/lib/news-sources.ts";
import { normalizeUrl, parseFeed, sweep } from "../src/lib/news-sweep.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const NOW = new Date("2026-09-07T00:00:00Z");
const iso = (daysAgo: number) =>
  new Date(NOW.getTime() - daysAgo * 86_400_000).toUTCString();

/* A signed-off outlet, so the gates are not what these cases are testing. */
const times: Outlet = {
  domain: "tampabay.com",
  publisher: "Tampa Bay Times",
  type: "factual_reporting",
  countyFips: "12057",
  leanTag: "center",
  leanBasis: "fixture",
  feed: "https://tampabay.com/feed",
};

const rss = (items: string) =>
  `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>${items}</channel></rss>`;
const item = (title: string, link: string, daysAgo: number, desc = "A dek.") =>
  `<item><title>${title}</title><link>${link}</link><description>${desc}</description><pubDate>${iso(daysAgo)}</pubDate></item>`;

const run = (feeds: { outlet: Outlet; xml: string }[], windowDays?: number) =>
  sweep({ feeds, now: NOW, windowDays, belongsTo: urlBelongsTo });

/* ---- 1. reproducible ------------------------------------------------- */

const feed = rss(
  item("Third", "https://www.tampabay.com/news/c", 1) +
    item("First", "https://www.tampabay.com/news/a", 3) +
    item("Second", "https://www.tampabay.com/news/b", 2),
);
const a = run([{ outlet: times, xml: feed }]);
const b = run([{ outlet: times, xml: feed }]);
check("sweep is reproducible", JSON.stringify(a) === JSON.stringify(b));
check("all three in-window items kept", a.length === 3, `got ${a.length}`);
check(
  "ordered newest first",
  a.map((x) => x.title).join(",") === "Third,Second,First",
  a.map((x) => x.title).join(","),
);

/* ---- 2. the boundary holds ------------------------------------------- */

const smuggled = rss(
  item("Ours", "https://www.tampabay.com/news/real", 1) +
    item("Off-list", "https://example.com/story", 1) +
    item("Shortened", "https://t.co/abc123", 1) +
    item("Other listed outlet", "https://www.orlandosentinel.com/news/x", 1) +
    item("Not a URL", "not-a-url", 1),
);
const kept = run([{ outlet: times, xml: smuggled }]);
check("only the outlet's own link survives", kept.length === 1, `got ${kept.length}`);
check("survivor is ours", kept[0]?.url.includes("tampabay.com"), kept[0]?.url);
check(
  "no off-list domain anywhere",
  kept.every((x) => urlBelongsTo(x.url, times)),
);

/* A feed body cannot claim to be an outlet it is not: attribution comes from
   the outlet whose feed was fetched, never from the article. */
check(
  "attribution is not feed-supplied",
  kept.every((x) => x.publisher === times.publisher && x.type === times.type),
);

/* ---- 3. labels come from the list ------------------------------------ */

check(
  "lean/type/publisher all from the outlet",
  kept.every(
    (x) =>
      x.leanTag === times.leanTag &&
      x.type === times.type &&
      x.publisher === times.publisher &&
      x.countyFips === times.countyFips,
  ),
);

/* ---- the two founder gates ------------------------------------------- */

const unrated: Outlet = { ...times, leanTag: null };
check("an unrated outlet yields nothing", run([{ outlet: unrated, xml: feed }]).length === 0);

check(
  "usableOutlets is empty until a human fills the gates in",
  usableOutlets().length === 0,
  `${usableOutlets().length} outlet(s) already usable — if that is intended, this check should change with them`,
);
check("the list itself is non-empty", OUTLETS.length > 0);
check(
  "every listed outlet records a lean basis",
  OUTLETS.every((o) => typeof o.leanBasis === "string" && o.leanBasis.length > 0),
);
check(
  "no duplicate domains",
  new Set(OUTLETS.map((o) => o.domain)).size === OUTLETS.length,
);

/* ---- windowing ------------------------------------------------------- */

const aged = rss(
  item("Fresh", "https://www.tampabay.com/n/1", 1) +
    item("Edge", "https://www.tampabay.com/n/2", 13) +
    item("Stale", "https://www.tampabay.com/n/3", 20) +
    `<item><title>Undated</title><link>https://www.tampabay.com/n/4</link></item>` +
    item("Future", "https://www.tampabay.com/n/5", -5),
);
const windowed = run([{ outlet: times, xml: aged }]);
check("14-day window keeps 2", windowed.length === 2, windowed.map((x) => x.title).join(","));
check("undated is dropped", !windowed.some((x) => x.title === "Undated"));
check("future-dated is dropped", !windowed.some((x) => x.title === "Future"));
check("narrower window narrows the set", run([{ outlet: times, xml: aged }], 2).length === 1);

/* ---- dedupe + normalisation ------------------------------------------ */

const dupes = rss(
  item("Same", "https://www.tampabay.com/news/x?utm_source=twitter", 1) +
    item("Same again", "https://www.tampabay.com/news/x/#comments", 1) +
    item("Same again 2", "https://www.tampabay.com/news/x", 1),
);
const deduped = run([{ outlet: times, xml: dupes }]);
check("one article, not three", deduped.length === 1, `got ${deduped.length}`);
check(
  "tracking params and fragment stripped",
  deduped[0]?.url === "https://www.tampabay.com/news/x",
  deduped[0]?.url,
);
check("a real query param survives", normalizeUrl("https://x.com/a?id=7") === "https://x.com/a?id=7");

/* ---- parsing: Atom, CDATA, entities ---------------------------------- */

const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Council &amp; mayor spar</title>
    <link rel="alternate" href="https://www.tampabay.com/atom/1"/>
    <link rel="edit" href="https://example.com/edit"/>
    <summary><![CDATA[A <b>dek</b> with markup]]></summary>
    <published>${new Date(NOW.getTime() - 86_400_000).toISOString()}</published>
  </entry></feed>`;
const parsedAtom = run([{ outlet: times, xml: atom }]);
check("atom entry parsed", parsedAtom.length === 1, `got ${parsedAtom.length}`);
check("rel=alternate wins over rel=edit", parsedAtom[0]?.url === "https://www.tampabay.com/atom/1");
check("entities decoded", parsedAtom[0]?.title === "Council & mayor spar", parsedAtom[0]?.title);
check("CDATA unwrapped and tags stripped", parsedAtom[0]?.summary === "A dek with markup", String(parsedAtom[0]?.summary));

check("garbage parses to nothing", parseFeed("<html><body>nope</body></html>").length === 0);
check("empty string parses to nothing", parseFeed("").length === 0);

/* ---- host matching: the label-boundary rule -------------------------- */

for (const [url, want] of [
  ["https://tampabay.com/a", true],
  ["https://www.tampabay.com/a", true],
  ["https://tampabay.com.evil.com/a", false],
  ["https://nottampabay.com/a", false],
  ["http://TAMPABAY.COM/a", true],
  ["ftp://tampabay.com/a", false],
] as const) {
  check(`belongsTo ${url}`, urlBelongsTo(url, times) === want);
}

/* A path-scoped entry matches only under its path. */
const scoped: Outlet = { ...times, domain: "cbsnews.com/miami" };
check("path-scoped matches its path", urlBelongsTo("https://www.cbsnews.com/miami/news/x", scoped));
check("path-scoped rejects the rest of the site", !urlBelongsTo("https://www.cbsnews.com/news/x", scoped));
check("path-scoped rejects a prefix collision", !urlBelongsTo("https://www.cbsnews.com/miamibeach/x", scoped));

if (failures > 0) {
  console.error(`\nverify-news-sweep: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-news-sweep: OK — reproducible, boundary holds, labels come from the list (${OUTLETS.length} outlets listed, ${usableOutlets().length} usable)`,
);
