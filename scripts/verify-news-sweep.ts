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

import { OUTLETS, UNRATED, sitemapUrlFor, urlBelongsTo, usableOutlets, type Outlet } from "../src/lib/news-sources.ts";
import { normalizeUrl, parseFeed, parseNewsSitemap, sweep } from "../src/lib/news-sweep.ts";

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

/* This check used to read "usableOutlets is empty until a human fills the gates
   in", and its own failure message said: "if that is intended, this check should
   change with them". It is intended now. The founder designated 31 rows
   `leanTag: 'unrated'` on 2026-09-19 and floridaphoenix.com on 2026-09-21,
   making 32 (gate C7-a; see UNRATED_DESIGNATED in
   src/lib/news-sources.ts), so the gate is no longer uniformly closed and the
   assertions below pin the shape it closed into instead of the empty set. */
const designated = OUTLETS.filter((o) => o.leanTag === "unrated");
const stillNull = OUTLETS.filter((o) => o.leanTag === null);

check(
  "exactly 32 rows are designated unrated",
  designated.length === 32,
  `${designated.length} designated — a change here is an editorial act and must be deliberate`,
);
/* Down from six to five: floridaphoenix.com was designated 2026-09-21. What is
   left is exactly the set with FETCHED, CITED ratings — where a lean must be
   *chosen* rather than recorded as absent. That is the whole of the remaining
   C7-a gate, and it cannot be closed by a coding agent. */
check(
  "the five undesignated rows are exactly those with cited ratings",
  stillNull.map((o) => o.domain).sort().join(",") ===
    "apnews.com,miamiherald.com,orlandosentinel.com,sun-sentinel.com,tampabay.com",
  stillNull.map((o) => o.domain).join(","),
);
/* The gate's real job: no lean was ever ASSERTED. Every row is either null
   ("no human has decided") or 'unrated' ("a human recorded that nobody rates
   this"). A left/center/right value appearing here without a founder commit is
   the regression this file exists to catch. */
check(
  "no row carries an asserted lean — only null or 'unrated'",
  OUTLETS.every((o) => o.leanTag === null || o.leanTag === "unrated"),
  [...new Set(OUTLETS.map((o) => String(o.leanTag)))].join(","),
);
/* A designation must never sit on a row that HAS a rating: 'unrated' would then
   contradict its own basis text and the card would deny a rating the repo
   cites. That is the property being protected — not the literal string.

   ONE DOMAIN IS ALLOWED A BESPOKE BASIS, by name. floridaphoenix.com was
   designated 2026-09-21 and keeps its States Newsroom note instead of the
   shared text, because that note explains WHY no outlet-specific rating exists
   for a newsroom inside a national network — something `UNRATED` cannot say.
   Naming it here rather than loosening the rule keeps the check fail-closed: a
   second bespoke-basis designation still fails until someone adds it
   deliberately, which is the same reason UNRATED_DESIGNATED is a list and not a
   derived default. */
const BESPOKE_BASIS_ALLOWED: ReadonlySet<string> = new Set(["floridaphoenix.com"]);
check(
  "every designated row carries the shared UNRATED basis, bar the one allowed by name",
  designated.every((o) => o.leanBasis === UNRATED || BESPOKE_BASIS_ALLOWED.has(o.domain)),
  designated
    .filter((o) => o.leanBasis !== UNRATED && !BESPOKE_BASIS_ALLOWED.has(o.domain))
    .map((o) => o.domain)
    .join(","),
);
/* The allowance is not a hole. A bespoke basis on a DESIGNATED row must still
   state that no rating was found — otherwise 'unrated' could sit on top of prose
   citing a real rating, which is the exact contradiction the check above exists
   to prevent, just smuggled through the exception. */
for (const o of designated) {
  if (o.leanBasis === UNRATED) continue;
  check(
    `bespoke designated basis for ${o.domain} still records that no rating was found`,
    /no (outlet-specific )?rating/i.test(o.leanBasis),
    o.leanBasis,
  );
  /* And it must not read as though a value were adopted. Phoenix's basis names
     the uncited center-left proposal in order to DECLINE it; a designated row
     mentioning a lean word without declining or disclaiming it is the
     regression. */
  check(
    `bespoke designated basis for ${o.domain} never adopts a lean value`,
    !/\b(left|right|center|centre|middle)\b/i.test(o.leanBasis)
      || /declined|not a rating|no citation|without a citation|uncited/i.test(o.leanBasis),
    o.leanBasis,
  );
}
check("the list itself is non-empty", OUTLETS.length > 0);
check(
  "every listed outlet records a lean basis",
  OUTLETS.every((o) => typeof o.leanBasis === "string" && o.leanBasis.length > 0),
);
check(
  "no duplicate domains",
  new Set(OUTLETS.map((o) => o.domain)).size === OUTLETS.length,
);

/* ---- the list's own invariants (2026-09-17, once feeds were filled) --- */

/* The sweep dedupes by URL, last writer wins. Two outlets sharing one feed
   would silently relabel each other's articles — which is exactly why there
   are no `opinion` rows yet: no daily exposes a distinct opinion feed. */
const feeds = OUTLETS.map((o) => o.feed).filter((f): f is string => f !== null);
check(
  "no two outlets share a feed URL",
  new Set(feeds.map((f) => new URL(f).toString())).size === feeds.length,
);
check("at least one feed is verified", feeds.length > 0);

/* A basis that departs from the shared UNRATED text must be a citation, not
   an argument: it names a rater and hands the decision back. This is what
   keeps a lean from being smuggled into prose the founder skims. */
for (const o of OUTLETS) {
  if (o.leanBasis === UNRATED) continue;
  check(
    `non-default leanBasis for ${o.domain} cites a rater`,
    /AllSides|MBFC|Ad Fontes|States Newsroom|ratings exist/i.test(o.leanBasis),
    o.leanBasis,
  );
  check(
    `non-default leanBasis for ${o.domain} defers to the founder, or records their decision`,
    /Founder (decides|confirms)/.test(o.leanBasis)
      /* Once the founder HAS decided, "Founder decides" is stale and the honest
         text records the decision instead. Both forms keep a value from being
         asserted on a coding agent's authority, which is what this checks. */
      || /Founder designated/.test(o.leanBasis),
    o.leanBasis,
  );
}

/* Row-level flags are fail-closed: a mixed or syndicated feed cannot produce
   a card even with a lean filled in, because the card would carry the wrong
   type or the wrong outlet's lean. */
const flagged = OUTLETS.filter((o) => o.mixedFeed || o.syndicated);
check("the known flagged rows carry their flags (Phoenix, Florida Politics, Miami Times)", flagged.length >= 3);
check(
  "a flagged row is never usable, even with a lean",
  usableOutlets(flagged.map((o) => ({ ...o, leanTag: "center" as const }))).length === 0,
);

/* A feed must live on the outlet it is attributed to, under the same
   label-boundary rule the articles are held to; otherwise a feed hosted
   elsewhere could smuggle attribution past urlBelongsTo. */
for (const o of OUTLETS) {
  if (o.feed === null) continue;
  check(`feed for ${o.domain} is https`, o.feed.startsWith("https://"), o.feed);
  check(`feed for ${o.domain} is on the outlet's own host`, urlBelongsTo(o.feed, o), o.feed);
}

/* Four covered counties (src/lib/resolve.ts COVERED_COUNTIES) or statewide.
   Hard-coded rather than imported so this script stays free of app imports. */
const COUNTIES = new Set(["12086", "12011", "12057", "12095"]);
check(
  "every countyFips is a covered county or null",
  OUTLETS.every((o) => o.countyFips === null || COUNTIES.has(o.countyFips)),
  OUTLETS.filter((o) => o.countyFips !== null && !COUNTIES.has(o.countyFips!)).map((o) => o.domain).join(","),
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
  `<url><loc>${loc}</loc><changefreq>monthly</changefreq><lastmod>${dayIso(daysAgo - 0.5)}</lastmod>` +
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
const noNews = daySitemap(`<url><loc>https://www.sun-sentinel.com/2026/09/17/plain/</loc><lastmod>${dayIso(1)}</lastmod></url>`);
check(
  "sitemap: no news:news block falls back to lastmod with an empty title",
  parseNewsSitemap(noNews)[0]?.published === dayIso(1) && parseNewsSitemap(noNews)[0]?.title === "",
);
check(
  "sitemap sweep: an entry without a title is dropped",
  sweep({ feeds: [{ outlet: sentinel, xml: noNews, format: "news-sitemap" }], now: NOW, belongsTo: urlBelongsTo }).length === 0,
);
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
/* Designating did not bypass either fail-closed flag or the retrieval-path
   requirement — that is the whole point of them outliving the lean gate. 27 of
   the 32 designated rows are usable; the five that are not are held out by a
   flag or by having no feed and no sitemap, and no amount of lean sign-off
   should change that.

   floridaphoenix.com joining on 2026-09-21 is the cleanest demonstration of it:
   a brand-new designation that moves `usableOutlets()` by exactly ZERO, because
   `mixedFeed` still holds it out. A lean is necessary for a card, never
   sufficient. */
check("usableOutlets is 27 after the designation", usableOutlets().length === 27,
  `${usableOutlets().length}`);
check(
  "every usable outlet has a retrieval path and neither flag",
  usableOutlets().every(
    (o) => (o.feed !== null || o.sitemap !== undefined) && !o.mixedFeed && !o.syndicated,
  ),
);
check(
  "the five designated-but-held-out rows are exactly the flagged and path-less ones",
  designated
    .filter((o) => !usableOutlets().some((u) => u.domain === o.domain))
    .map((o) => o.domain)
    .sort()
    .join(",")
    === "elnuevoherald.com,floridaphoenix.com,floridapolitics.com,miamitimesonline.com,outsfl.com",
  designated.filter((o) => !usableOutlets().some((u) => u.domain === o.domain)).map((o) => o.domain).join(","),
);
/* Stated as a property rather than a list, so it survives the next
   designation: every held-out row must be held out for a NAMED reason. A row
   that became unusable for some other reason would pass the list check above
   only by coincidence. */
for (const o of designated) {
  if (usableOutlets().some((u) => u.domain === o.domain)) continue;
  check(
    `${o.domain} is held out for a named reason, not by accident`,
    o.mixedFeed === true || o.syndicated === true || (o.feed === null && o.sitemap === undefined),
    `mixedFeed=${o.mixedFeed} syndicated=${o.syndicated} feed=${o.feed} sitemap=${o.sitemap !== undefined}`,
  );
}
/* And 'unrated' specifically does not slip past a flag — the existing flagged
   check above uses 'center'; this repeats it with the value actually in use. */
check(
  "a flagged row is not usable even when designated unrated",
  usableOutlets(flagged.map((o) => ({ ...o, leanTag: "unrated" as const }))).length === 0,
);

if (failures > 0) {
  console.error(`\nverify-news-sweep: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-news-sweep: OK — reproducible, boundary holds, labels come from the list (${OUTLETS.length} outlets listed, ${usableOutlets().length} usable)`,
);
