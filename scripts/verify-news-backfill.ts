/* Offline guardrail for src/lib/news-backfill.ts. No network.

     node scripts/verify-news-backfill.ts */

import { usableOutlets, OUTLETS, type Outlet } from "../src/lib/news-sources.ts";
import type { SweptArticle } from "../src/lib/news-sweep.ts";
import { matchArticle } from "../src/lib/news-match.ts";
import {
  ARCHIVES,
  claudeDisallowed,
  days,
  entryMayBeInWindow,
  mergeArticles,
  months,
  pageArticle,
  pagedFeedUrl,
  parseSitemapEntries,
  pathDate,
  readPageMeta,
  slugMayName,
  starAllows,
  surnameOf,
} from "../src/lib/news-backfill.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- every usable outlet has an archive entry, and only listed ones ---- */
const usable = usableOutlets().map((o) => o.domain).sort();
check("every usable outlet has an ARCHIVES entry", usable.every((d) => d in ARCHIVES), usable.filter((d) => !(d in ARCHIVES)).join(","));
check("every ARCHIVES key is a listed outlet", Object.keys(ARCHIVES).every((d) => OUTLETS.some((o) => o.domain === d)),
  Object.keys(ARCHIVES).filter((d) => !OUTLETS.some((o) => o.domain === d)).join(","));
check("paged-feed outlets have a feed", Object.entries(ARCHIVES)
  .filter(([, a]) => a.kind === "paged-feed")
  .every(([d]) => OUTLETS.find((o) => o.domain === d)?.feed));

/* ---- robots ----------------------------------------------------------- */
const nbcLike = `User-agent: *
Disallow: /wp-admin/

User-Agent: anthropic-ai
User-Agent: Claude-Web
User-Agent: ClaudeBot
Allow: /author*
Allow: /news/local/about-nbc-6/2861756/
Disallow: /
`;
check("claudeDisallowed names the agents of a Disallow: / group, Allow lines and all",
  claudeDisallowed(nbcLike).join(",") === "anthropic-ai,Claude-Web,ClaudeBot", claudeDisallowed(nbcLike).join(","));
check("claudeDisallowed ignores a partial disallow",
  claudeDisallowed("User-agent: ClaudeBot\nDisallow: /private/\n").length === 0);
check("claudeDisallowed ignores the * group", claudeDisallowed("User-agent: *\nDisallow: /\n").length === 0);
check("claudeDisallowed reads an agent listed after others in one group",
  claudeDisallowed("User-agent: GPTBot\nUser-agent: anthropic-ai\nDisallow: /\n").join(",") === "anthropic-ai");
check("claudeDisallowed: an empty robots says nothing", claudeDisallowed("").length === 0);

check("starAllows: a disallowed prefix", !starAllows(nbcLike, "/wp-admin/x"));
check("starAllows: an unlisted path", starAllows(nbcLike, "/news/local/story/123/"));
check("starAllows: longest rule wins, Allow on a tie",
  starAllows("User-agent: *\nDisallow: /news/\nAllow: /news/local/\n", "/news/local/a") &&
    !starAllows("User-agent: *\nDisallow: /news/\nAllow: /news/local/\n", "/news/world/a"));
check("starAllows: wildcard and anchor", !starAllows("User-agent: *\nDisallow: /*.rss$\n", "/tags/news.rss") &&
  starAllows("User-agent: *\nDisallow: /*.rss$\n", "/tags/news.rss/page"));
check("starAllows: the Claude group does not apply to our UA", starAllows(nbcLike, "/elections/x/3869181/"));

/* ---- dates and windows ------------------------------------------------ */
const FROM = new Date("2026-09-09T00:00:00Z");
const TO = new Date("2026-10-09T23:59:59Z");
check("months spans the window", months(FROM, TO).map((m) => m.join("")).join(",") === "202609,202610");
check("days spans the window inclusively", days(FROM, TO).length === 31 && days(FROM, TO)[0] === "2026-09-09" && days(FROM, TO)[30] === "2026-10-09");
check("pathDate reads both shapes", pathDate("/politics/2026-10-01/x")?.toISOString().slice(0, 10) === "2026-10-01" &&
  pathDate("/news/2026/09/15/x/")?.toISOString().slice(0, 10) === "2026-09-15" && pathDate("/news/x") === null);
check("entryMayBeInWindow: path date decides",
  entryMayBeInWindow({ url: "https://www.wusf.org/politics-issues/2026-10-01/x", lastmod: "2020-01-01" }, FROM, TO) &&
    !entryMayBeInWindow({ url: "https://www.wusf.org/politics-issues/2026-08-01/x", lastmod: "2026-10-01" }, FROM, TO));
check("entryMayBeInWindow: a lastmod before the window rules a dateless URL out, after it keeps it",
  !entryMayBeInWindow({ url: "https://x.com/news/a", lastmod: "2026-08-01T00:00:00Z" }, FROM, TO) &&
    entryMayBeInWindow({ url: "https://x.com/news/a", lastmod: "2026-10-20T00:00:00Z" }, FROM, TO) &&
    entryMayBeInWindow({ url: "https://x.com/news/a", lastmod: "" }, FROM, TO));

/* ---- sitemaps --------------------------------------------------------- */
const sm = `<urlset><url><loc>https://www.wlrn.org/government-politics/2026-09-01/a</loc><lastmod>2026-09-02T14:32:40-04:00</lastmod></url>
<url><loc><![CDATA[https://www.wftv.com/arc/x/?outputType=xml&amp;from=100]]></loc></url></urlset>`;
const parsed = parseSitemapEntries(sm);
check("parseSitemapEntries reads loc and lastmod", parsed.length === 2 && parsed[0].lastmod.startsWith("2026-09-02"));
check("parseSitemapEntries unwraps CDATA and &amp;", parsed[1].url.endsWith("outputType=xml&from=100"), parsed[1].url);
check("parseSitemapEntries reads an index", parseSitemapEntries(
  "<sitemapindex><sitemap><loc>https://a.com/post-sitemap.xml</loc><lastmod>2026-10-08</lastmod></sitemap></sitemapindex>", "sitemap").length === 1);

/* Each archive's include, on real paths seen 2026-10-09. */
const includeCases: [string, string[], string[]][] = [
  ["wlrn.org", ["/government-politics/2026-09-01/miami-acevedo-lawsuit-carollo-portilla-noriega"], ["/shows/nova/preview/x", "/podcast/engage/2026-09-17/x"]],
  ["wusf.org", ["/politics-issues/2026-10-01/democrats-slam-ashley-moody-amid-heated-us-senate-race"], ["/2026-10-08/how-oct-7-reshaped-israeli-politics", "/tags/x"]],
  ["cfpublic.org", ["/politics/2026-09-18/central-florida-election-supervisors-urge-voters-to-prepare"], ["/podcast/engage/2026-09-18/central-florida-election-supervisors-urge-voters-to-prepare"]],
  ["cbsnews.com/miami", ["/miami/news/florida-senate-race-poll/"], ["/minnesota/news/summit-brewing/", "/miami/video/previewing-x"]],
  ["diariolasamericas.com", ["/eeuu/tras-audiencia-migrante-venezolano-n5403048"], ["/sitemap/news-full/x.xml.gz", "/eeuu"]],
  ["local10.com", ["/news/politics/2026/09/15/moody-x/", "/news/local/2026/09/15/x/"], ["/news/politics/", "/video/x"]],
  ["fox35orlando.com", ["/news/heavy-rain-floods-central-florida"], ["/video/123", "/tag/x"]],
  ["cltampa.com", ["/news/moody-x-12345/", "/news/a-story/"], ["/uncategorized/obama-car-12385718/", "/news/a/b/"]],
];
for (const [domain, keep, drop] of includeCases) {
  const a = ARCHIVES[domain];
  if (a?.kind !== "url-archive") {
    check(`${domain} is a url-archive`, false);
    continue;
  }
  check(`${domain} include keeps stories`, keep.every((p) => a.include.test(p)), keep.filter((p) => !a.include.test(p)).join(","));
  check(`${domain} include drops non-stories`, drop.every((p) => !a.include.test(p)), drop.filter((p) => a.include.test(p)).join(","));
}
const cbs = ARCHIVES["cbsnews.com/miami"];
check("CBS lists each month's parts", cbs.kind === "url-archive" && cbs.sitemaps(FROM, TO).length === 6 &&
  cbs.sitemaps(FROM, TO)[0] === "https://www.cbsnews.com/xml-sitemap/article-2026-09.xml");
const l10 = ARCHIVES["local10.com"];
check("local10 lists one sitemap a day", l10.kind === "url-archive" && l10.sitemaps(FROM, TO).length === 31);

/* ---- the slug pre-filter ---------------------------------------------- */
const surnames = new Set(["moody", "nixon", "donalds", "datto", "people"]);
check("slugMayName finds a surname word", slugMayName("https://www.wusf.org/politics-issues/2026-10-01/democrats-slam-ashley-moody-amid-heated-us-senate-race", surnames));
check("slugMayName needs a whole word", !slugMayName("https://x.com/news/moodys-downgrade", surnames));
check("slugMayName folds case and accents", slugMayName("https://x.com/news/Nixón-rally", surnames));
check("slugMayName: no surname, no fetch", !slugMayName("https://x.com/news/hurricane-isaias-update", surnames));
check("surnameOf drops honorifics, suffixes and nicknames' quotes",
  surnameOf('Jeffrey P. "Dr. Jeff" Datto') === "datto" && surnameOf("Ashley Moody") === "moody" &&
    surnameOf("John Smith Jr.") === "smith" && surnameOf("José Javier Rodríguez") === "rodriguez" && surnameOf("") === null);
/* surnameOf must agree with the matcher: a full-name match always carries
   the surname surnameOf gives, so the pre-filter never hides a name the
   matcher would find in a slug-derived title. */
for (const name of ['Jeffrey P. "Dr. Jeff" Datto', "Ashley Moody", "Neil J. Gillespie", "Moliere \"Moe\" Dimanche", "Byron Donalds"]) {
  const last = surnameOf(name)!;
  /* The way outlets write a name: first name and surname. */
  const first = name.split(" ")[0];
  const m = matchArticle({ title: `Story about ${first} ${name.split(" ").at(-1)}`, summary: null }, [{ candidateId: "x", legalName: name, raceId: "r" }]);
  check(`surnameOf agrees with matchArticle for ${name}`, m.length === 1 && new RegExp(`\\b${last}\\b`).test(name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()));
}

/* ---- article pages ---------------------------------------------------- */
const html = `<html><head><title>Fallback | WUSF</title>
<meta property="og:title" content="Democrats slam Ashley Moody amid heated U.S. Senate race" />
<meta property="og:description" content="Florida Democrats criticized Sen. Ashley Moody&#039;s record on Tuesday." />
<meta property="article:published_time" content="2026-10-01T09:00:50Z" />
<meta property="og:image" content="https://www.wusf.org/x.jpg" />
</head><body><meta property="og:title" content="not this" /></body></html>`;
const meta = readPageMeta(html);
check("readPageMeta: Open Graph title, description, date, image",
  meta.title.startsWith("Democrats slam") && meta.description.includes("Moody's record") &&
    meta.published === "2026-10-01T09:00:50Z" && meta.image === "https://www.wusf.org/x.jpg", JSON.stringify(meta));
const ld = readPageMeta(`<html><head><title>T &amp; U</title><meta name="description" content="D"></head><body><script type="application/ld+json">{"datePublished":"2026-09-20T10:00:00-04:00"}</script></body></html>`);
check("readPageMeta falls back to <title>, meta description and JSON-LD", ld.title === "T & U" && ld.description === "D" && ld.published.startsWith("2026-09-20"), JSON.stringify(ld));

const wusf = OUTLETS.find((o) => o.domain === "wusf.org")!;
const url = "https://www.wusf.org/politics-issues/2026-10-01/democrats-slam-ashley-moody-amid-heated-us-senate-race";
const art = pageArticle(url, meta, wusf, FROM, TO);
check("pageArticle builds the article", art?.retrieval === "archive-page" && art.title.startsWith("Democrats slam") &&
  art.publishedAt === "2026-10-01T09:00:50.000Z" && art.publisher === wusf.publisher && art.leanTag === wusf.leanTag, JSON.stringify(art));
check("the backfilled WUSF story matches Moody as named",
  matchArticle({ title: art!.title, summary: art!.summary }, [{ candidateId: "FL-DOE-89119", legalName: "Ashley Moody", raceId: "FL-SEN-general" }])[0]?.relation === "named");
check("pageArticle: outside the window is null", pageArticle(url, { ...meta, published: "2026-08-01T00:00:00Z" }, wusf, FROM, TO) === null);
check("pageArticle: no page date falls back to the path date", pageArticle(url, { ...meta, published: "" }, wusf, FROM, TO)?.publishedAt.startsWith("2026-10-01") === true);
check("pageArticle: no title is null", pageArticle(url, { ...meta, title: "" }, wusf, FROM, TO) === null);
check("pageArticle: an outlet with no lean is null", pageArticle(url, meta, { ...wusf, leanTag: null } as Outlet, FROM, TO) === null);

/* ---- merging ---------------------------------------------------------- */
const base = art!;
const feedCopy: SweptArticle = { ...base, retrieval: "rss", summary: "The feed's dek." };
for (const [label, lists] of [["archive first", [[base], [feedCopy]]], ["feed first", [[feedCopy], [base]]]] as const) {
  const out = mergeArticles(...(lists as unknown as SweptArticle[][]));
  check(`mergeArticles (${label}): one row, the feed's`, out.length === 1 && out[0].retrieval === "rss" && out[0].summary === "The feed's dek.");
}
const older: SweptArticle = { ...base, url: "https://www.wusf.org/a/2026-09-10/b", publishedAt: "2026-09-10T00:00:00.000Z" };
check("mergeArticles orders newest first", mergeArticles([older, base]).map((a) => a.url)[0] === base.url);

check("pagedFeedUrl", pagedFeedUrl("https://a.com/feed/", 1) === "https://a.com/feed/" &&
  pagedFeedUrl("https://a.com/feed/", 3) === "https://a.com/feed/?paged=3" &&
  pagedFeedUrl("https://a.com/feed/?partner-feed=all", 2) === "https://a.com/feed/?partner-feed=all&paged=2");

if (failures > 0) {
  console.error(`\nverify-news-backfill: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`verify-news-backfill: OK — ${usable.length} usable outlets each have an archive entry; robots, windows, includes, pre-filter, page reading and merging hold`);
