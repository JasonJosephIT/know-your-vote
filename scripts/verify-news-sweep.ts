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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AI_POLICY_HOLD, OUTLETS, UNRATED, sitemapUrlFor, urlBelongsTo, usableOutlets, type Outlet } from "../src/lib/news-sources.ts";
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
import { electionPayloadFor } from "../src/lib/news-enqueue.ts";
import { runSweep } from "../src/lib/news-intake.ts";
import { ManualNewsPayloadSchema } from "../src/types/admin.ts";

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

/* ---- the dek: a headline and a line, never the article --------------- */

/* 2026-10-06: NBC6's feed sent whole articles as descriptions (up to 7,800
   characters), WordPress feeds appended "The post … appeared first on …",
   and an operator had to cut each one by hand before approving. These pin the
   cut at intake. Fixtures are synthetic, shaped like the real feeds. */

check("a short dek is kept as written", dek("Voters head to the polls Nov. 3.") === "Voters head to the polls Nov. 3.");
check(
  "the WordPress trailer is dropped, even when the title in it has periods",
  dek("Ballots go out this week. The post Ballots go out. Here's what to know. appeared first on Creative Loafing Tampa .") === "Ballots go out this week.",
  dek("Ballots go out this week. The post Ballots go out. Here's what to know. appeared first on Creative Loafing Tampa ."),
);
check("a WordPress cut excerpt ends in an ellipsis, not a bracket", dek("The board met on Monday and voted to […]") === "The board met on Monday and voted to…");
check(
  "double-encoded entities and markup are decoded",
  dek("Monday&nbsp;is the deadline &lt;b&gt;to register&lt;/b&gt; .") === "Monday is the deadline to register.",
);

const sentence = (i: number) => `Sentence ${i} says the U.S. House race and Gov. Smith's plan matter to voters in District ${i}. `;
const article = Array.from({ length: 40 }, (_, i) => sentence(i + 1)).join("");
const cut = dek(article);
check(`a full article is cut to at most ${DEK_MAX} characters`, cut.length <= DEK_MAX && cut.length >= 80, `${cut.length}`);
check("the cut keeps whole sentences", cut.endsWith("voters in District " + cut.match(/District (\d+)\.$/)?.[1] + "."), cut.slice(-60));
check("the cut never stops after an abbreviation", !/\b(?:U\.S|Gov)\.$/.test(cut), cut.slice(-30));
check("the cut is a prefix of the cleaned text (nothing invented)", article.startsWith(cut), cut.slice(0, 60));

/* "voter " is 6 characters, so the cap falls mid-word and the cut must back
   off to the last whole one. */
const runOnCut = dek("voter ".repeat(200).trim());
check("one sentence longer than the cap is cut at a whole word, with an ellipsis",
  runOnCut.length <= DEK_MAX && runOnCut.endsWith(" voter…"), runOnCut.slice(-20));
const commaCut = dek("voters, ".repeat(100).trim());
check("a word cut drops trailing punctuation before the ellipsis", commaCut.endsWith(" voters…"), commaCut.slice(-20));
check("the cap length is a parameter for tests", dek(article, { max: 120 }).length <= 120);

/* Abbreviations at the cut: a period after these is not the end of the dek.
   Each case puts the abbreviation's period as the LAST candidate boundary
   under the cap, so dropping it from the list changes the output. */
const lead = "Early voting opens in two weeks at sites across the county, officials said Monday.";
for (const [label, rest] of [
  ["Gov.", " The plan was signed by Gov. Ron DeSantis in a ceremony at the Capitol last spring."],
  ["U.S.", " The measure now goes to the U.S. Senate for a vote that could come as early as November."],
  ["p.m.", " Polls close at 7 p.m. Tuesday and results are expected later that night from every county."],
  ["Q.", " The complaint was filed by John Q. Public, a longtime resident of the district, on Monday."],
] as const) {
  const text = lead + rest;
  const max = text.indexOf(label) + label.length + 4;
  check(`the cut does not end after "${label}"`, dek(text, { max }) === lead, dek(text, { max }).slice(-40));
}

/* The WordPress trailer is found from the end, so a dek's own "The post
   office…" survives, and a title that starts "The post" is not split. */
check("a dek's own 'The post office' sentence is kept",
  dek("Turnout was high on the first day. The post office on Main Street served as a polling site. The post Turnout high appeared first on WLRN.")
    === "Turnout was high on the first day. The post office on Main Street served as a polling site.",
  dek("Turnout was high on the first day. The post office on Main Street served as a polling site. The post Turnout high appeared first on WLRN."));
for (const prose of [
  "The post appeared first on Facebook on Monday, and by Tuesday the Broward commissioner had deleted it.",
  "A mayoral candidate apologized Tuesday for a social media post. The post appeared first on Instagram and was later deleted by her campaign.",
  "El alcalde borró la publicación. The post appeared first on X before it was removed.",
]) {
  check(`prose about a post that "appeared first on" a platform is kept: ${prose.slice(0, 40)}…`,
    dek(prose, { title: "Commissioner deletes post" }) === prose, dek(prose, { title: "Commissioner deletes post" }));
}
check("a sentence saying the post appeared first on a platform, with no title between, is kept",
  dek("The commissioner deleted the message hours later. The post appeared first on Facebook.")
    === "The commissioner deleted the message hours later. The post appeared first on Facebook.");
check("a sentence about a post that appeared first on a platform, then a clause, is kept",
  dek("Officials corrected the hours. The post about early voting hours appeared first on Instagram and was later deleted by the office.")
    === "Officials corrected the hours. The post about early voting hours appeared first on Instagram and was later deleted by the office.");
check("a trailer naming a lowercase-led outlet is still dropped",
  dek("Votantes acuden a las urnas. The post Votantes acuden appeared first on el Nuevo Herald.") === "Votantes acuden a las urnas.");
check("a trailer whose title starts 'The post' is dropped whole",
  dek("Hours were extended for voters. The post The post office extends hours appeared first on WLRN.", { title: "The post office extends hours" })
    === "Hours were extended for voters.");

check("an entity name that is a built-in object key is left as written",
  dek("Tax &valueOf; cut and &constructor; on the ballot") === "Tax &valueOf; cut and &constructor; on the ballot");

/* When the whole sentences in reach end before character 80 (a very short
   first sentence, then one too long to fit), the cut falls back to a word. */
const floor = dek("Short lead. " + "Voters in the county ".repeat(40).trim() + ".");
check("a short first sentence alone is not a dek: the cut falls back to whole words",
  floor.length >= 80 && floor.length <= DEK_MAX && floor.startsWith("Short lead. Voters") && floor.endsWith("…"), floor.slice(0, 40));

/* A malformed numeric entity must never abort a sweep: one bad item would
   otherwise stop the whole daily intake run. */
let entityRows: ReturnType<typeof run> = [];
let threw = "";
try {
  entityRows = run([{ outlet: times, xml: rss(
    item("Title &amp;#x110000; here", "https://www.tampabay.com/news/e1", 1, "Hello &amp;#99999999; world") +
      item("Plain &#99999999; title", "https://www.tampabay.com/news/e2", 1) +
      item("Hex &#x110000; title", "https://www.tampabay.com/news/e3", 1),
  ) }]);
} catch (err) {
  threw = (err as Error).message;
}
check("an out-of-range numeric entity, single or double encoded, is left as written instead of throwing",
  threw === "" && entityRows.length === 3 && entityRows.some((r) => r.summary === "Hello &#99999999; world"),
  threw || JSON.stringify(entityRows.map((r) => [r.title, r.summary])));

/* End to end: a feed carrying a whole article becomes a swept dek that the
   console's own payload schema accepts. Before this, anything over 2,000
   characters was refused on approval ("Stored payload no longer matches its
   schema"). */
const longFeed = rss(item("Voter guide", "https://www.tampabay.com/news/guide", 1, article + " The post Voter guide appeared first on Tampa Bay Times."));
const swept = run([{ outlet: times, xml: longFeed }]);
check("a swept summary is never longer than the dek cap", swept.length === 1 && (swept[0].summary ?? "").length <= DEK_MAX, String(swept[0]?.summary?.length));
const titledTrailer = run([{ outlet: times, xml: rss(item("The post office extends hours", "https://www.tampabay.com/news/po", 1, "Hours were extended for voters. The post The post office extends hours appeared first on Tampa Bay Times.")) }]);
check("the sweep passes the article title to the trailer cut",
  titledTrailer[0]?.summary === "Hours were extended for voters.", String(titledTrailer[0]?.summary));
const shortTrailer = run([{ outlet: times, xml: rss(item("Voter guide", "https://www.tampabay.com/news/vg", 1, "Ballots go out this week. The post Voter guide appeared first on Tampa Bay Times.")) }]);
check("a swept dek carries no WordPress trailer", shortTrailer[0]?.summary === "Ballots go out this week.", String(shortTrailer[0]?.summary));
check(
  "a payload from a whole-article feed parses with ManualNewsPayloadSchema",
  ManualNewsPayloadSchema.safeParse(electionPayloadFor(swept[0], "outlet:tampabay.com")).success,
  JSON.stringify(ManualNewsPayloadSchema.safeParse(electionPayloadFor(swept[0], "outlet:tampabay.com")).error?.issues),
);
check("a title's double-encoded entities are decoded too",
  run([{ outlet: times, xml: rss(item("Early&amp;nbsp;voting opens", "https://www.tampabay.com/news/ev", 1)) }])[0]?.title === "Early voting opens");

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
/* Hold-free rows only: both Tribune sitemap outlets are on the AI-crawler hold,
   so signing off their lean deliberately does NOT make them usable. Asserting
   the original claim over all sitemap rows would now be asserting that the hold
   does not work. */
const sitemapNotHeld = withSitemap.filter((o) => !AI_POLICY_HOLD.has(o.domain));
check(
  "a sitemap outlet becomes usable once a lean is signed off (hold-free rows)",
  usableOutlets(sitemapNotHeld.map((o) => ({ ...o, leanTag: "center" as const }))).length
    === sitemapNotHeld.length,
  `${sitemapNotHeld.length} hold-free sitemap outlets`,
);
check(
  "a HELD sitemap outlet stays unusable even with a lean signed off",
  usableOutlets(
    withSitemap
      .filter((o) => AI_POLICY_HOLD.has(o.domain))
      .map((o) => ({ ...o, leanTag: "center" as const })),
  ).length === 0,
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
check("usableOutlets is 24 after the designation and the AI-crawler hold",
  usableOutlets().length === 24, `${usableOutlets().length}`);

/* ---- the AI-crawler policy hold (founder 2026-09-21) ------------------
   A hold is only worth anything if it cannot quietly fall out of step with the
   thing it is based on. Two properties, and the second is the one that would
   rot: */
for (const domain of AI_POLICY_HOLD) {
  const o = OUTLETS.find((x) => x.domain === domain);
  check(`held outlet exists in the list: ${domain}`, o !== undefined);
  check(`held outlet is not usable: ${domain}`,
    !usableOutlets().some((u) => u.domain === domain));
}
/* EVERY outlet whose robots names a Claude/Anthropic agent must be held. This
   is what stops the hold covering only the outlets that happened to be
   sweepable on the day it was written: three of the seven are excluded today by
   the lean gate or mixedFeed, and would become readable the moment those are
   lifted for reasons having nothing to do with crawler policy. */
const namesClaude = (o: Outlet) =>
  (o.robots?.aiDisallow ?? []).some((a) => /anthropic|claude/i.test(a));
const unheld = OUTLETS.filter((o) => namesClaude(o) && !AI_POLICY_HOLD.has(o.domain));
check(
  "every outlet whose robots names a Claude/Anthropic agent is on the hold",
  unheld.length === 0,
  `${unheld.map((o) => o.domain).join(",")} — add to AI_POLICY_HOLD or record the founder's decision to read it anyway`,
);
/* And the hold is a POLICY mechanism, not a technical one: satisfying every
   technical requirement must not lift it. Give each held row a lean, a feed and
   no flags, and it must still be refused. */
const heldRows = OUTLETS.filter((o) => AI_POLICY_HOLD.has(o.domain));
check("the hold survives a row being made technically perfect",
  usableOutlets(
    heldRows.map((o) => ({
      ...o,
      leanTag: "unrated" as const,
      feed: `https://${o.domain.split("/")[0]}/feed/`,
      mixedFeed: false,
      syndicated: false,
    })),
  ).length === 0,
  "a held outlet became usable once its flags were cleared — the hold is being read as technical");
check(
  "every usable outlet has a retrieval path and neither flag",
  usableOutlets().every(
    (o) => (o.feed !== null || o.sitemap !== undefined) && !o.mixedFeed && !o.syndicated,
  ),
);
/* Eight now, not five: the AI-crawler hold (2026-09-21) added miaminewtimes.com,
   wfla.com and wesh.com, which are designated and technically fine and are not
   read by choice. The list is spelled out because a change to it is either an
   editorial or a policy act, never an incidental one. */
check(
  "the eight designated-but-held-out rows are exactly the flagged, path-less and held ones",
  designated
    .filter((o) => !usableOutlets().some((u) => u.domain === o.domain))
    .map((o) => o.domain)
    .sort()
    .join(",")
    === "elnuevoherald.com,floridaphoenix.com,floridapolitics.com,miaminewtimes.com,"
      + "miamitimesonline.com,outsfl.com,wesh.com,wfla.com",
  designated.filter((o) => !usableOutlets().some((u) => u.domain === o.domain)).map((o) => o.domain).sort().join(","),
);
/* Stated as a property rather than a list, so it survives the next
   designation: every held-out row must be held out for a NAMED reason. A row
   that became unusable for some other reason would pass the list check above
   only by coincidence. */
for (const o of designated) {
  if (usableOutlets().some((u) => u.domain === o.domain)) continue;
  check(
    `${o.domain} is held out for a named reason, not by accident`,
    o.mixedFeed === true
      || o.syndicated === true
      || (o.feed === null && o.sitemap === undefined)
      /* Added 2026-09-21: the AI-crawler policy hold is a fourth named reason,
         and the only one that is a choice rather than a limitation. */
      || AI_POLICY_HOLD.has(o.domain),
    `mixedFeed=${o.mixedFeed} syndicated=${o.syndicated} feed=${o.feed} sitemap=${o.sitemap !== undefined} held=${AI_POLICY_HOLD.has(o.domain)}`,
  );
}
/* And 'unrated' specifically does not slip past a flag — the existing flagged
   check above uses 'center'; this repeats it with the value actually in use. */
check(
  "a flagged row is not usable even when designated unrated",
  usableOutlets(flagged.map((o) => ({ ...o, leanTag: "unrated" as const }))).length === 0,
);

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
  /* The stub serves RSS only. A usable sitemap outlet would make the real
     loop sleep 1 s for each of the window's 15 days and parse RSS as a
     sitemap, so say so here instead of running slow and wrong. */
  check("every usable outlet is RSS (stub sitemap days before adding a sitemap outlet to this test)",
    rssFeeds.length === usableOutlets().length,
    usableOutlets().filter((o) => o.feed === null).map((o) => o.domain).join(","));
  if (rssFeeds.length === usableOutlets().length) {
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
}

/* The hand-run sweep (scripts/news-sweep.ts, the runbook's --days 30 sweeps)
   prints the depth line too, so a hand sweep leaves the same record. */
const handScript = readFileSync(resolve(import.meta.dirname, "news-sweep.ts"), "utf8");
check("scripts/news-sweep.ts prints result.depthLine",
  /console\.error\(result\.depthLine\)/.test(handScript));

if (failures > 0) {
  console.error(`\nverify-news-sweep: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-news-sweep: OK — reproducible, boundary holds, labels come from the list (${OUTLETS.length} outlets listed, ${usableOutlets().length} usable)`,
);
