/* Guardrail for candidate-site ingest — src/lib/candidate-site.ts.

   The properties here are the ones whose failure would be invisible in the
   output and wrong in the product:

     - An edited quote. Everything downstream cites this text verbatim, so a
       decode or a split that changes a word puts words in a candidate's mouth.
     - A crawl that escapes the site, or the cap, or robots.txt. That is
       someone else's server.
     - A heading treated as a passage: the citation would quote a label
       instead of a commitment.
     - Boilerplate kept: "Paid for by..." tagged as a policy position.
     - An unstable passage id: the same text re-ingested twice looks like two
       separate statements.

   Pure and offline. Run: node scripts/verify-candidate-site.ts */

import {
  MAX_PASSAGE_CHARS,
  MIN_PASSAGE_CHARS,
  canonicalizeUrl,
  decodeEntities,
  dedupeAcrossPages,
  ANTHROPIC_AGENTS,
  INGEST_AGENT,
  MIN_PAGE_TEXT_CHARS,
  ROBOTS_AGENTS,
  blockedAgents,
  crawlDelaySec,
  extractLinks,
  extractPassages,
  isAllowedByRobots,
  isSameSite,
  looksClientRendered,
  looksLikeBotChallenge,
  visibleTextLength,
  looksLikePolicyPath,
  namesPolicyArea,
  passageId,
  pathWords,
  selectPolicyPages,
} from "../src/lib/candidate-site.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- urls ------------------------------------------------------------ */
check("canonicalize drops fragment, query and trailing slash",
  canonicalizeUrl("https://Example.com/Issues/?utm_source=x#top") === "https://example.com/Issues");
check("canonicalize resolves a relative href",
  canonicalizeUrl("/issues", "https://example.com/about") === "https://example.com/issues");
check("canonicalize keeps the root path",
  canonicalizeUrl("https://example.com/") === "https://example.com/");
check("canonicalize refuses non-http schemes",
  canonicalizeUrl("mailto:a@b.com") === null &&
    canonicalizeUrl("javascript:alert(1)") === null);
check("canonicalize refuses nonsense", canonicalizeUrl("not a url") === null);

check("apex and www are one site",
  isSameSite("https://example.com/a", "https://www.example.com/b"));
check("a different host is a different site",
  !isSameSite("https://example.com", "https://example.org"));
check("a subdomain is not the site",
  !isSameSite("https://shop.example.com", "https://example.com"));

/* ---- which pages get fetched ----------------------------------------- */
check("a policy section path is recognized",
  looksLikePolicyPath("https://e.com/issues") &&
    looksLikePolicyPath("https://e.com/the-issues") &&
    looksLikePolicyPath("https://e.com/issues-2026") &&
    looksLikePolicyPath("https://e.com/our/platform"));
check("a word merely CONTAINING a hint is not a policy path",
  !looksLikePolicyPath("https://e.com/tissues") &&
    !looksLikePolicyPath("https://e.com/airplane"));
check("a link that names a policy area is recognized",
  namesPolicyArea({ url: "https://e.com/environment", text: "" }) &&
    namesPolicyArea({ url: "https://e.com/homeowners-insurance", text: "" }) &&
    namesPolicyArea({ url: "https://e.com/x", text: "Housing" }));
check("a biography link names no policy area",
  !namesPolicyArea({ url: "https://e.com/about-david", text: "About David" }));
check("pathWords reads the last segment as words",
  pathWords("https://e.com/a/homeowners-insurance/") === "homeowners insurance");

const LINKS = [
  { url: "https://e.com/about-david", text: "About David" },
  { url: "https://e.com/environment", text: "Environment" },
  { url: "https://e.com/issues", text: "Issues" },
  { url: "https://e.com/donate", text: "Donate" },
  { url: "https://other.com/issues", text: "Issues" },
  { url: "https://e.com/x", text: "Read our platform" },
  { url: "https://e.com/issues", text: "Issues" },
  { url: "https://e.com/logo.png", text: "Our plan" },
];
const picked = selectPolicyPages(LINKS, "https://e.com", 8);
check("policy pages are ranked: section, then area, then anchor text",
  picked.join(" ") === "https://e.com/issues https://e.com/environment https://e.com/x",
  picked.join(" "));
check("off-site links are never fetched",
  !picked.some((u) => u.includes("other.com")));
check("donate and assets are never fetched",
  !picked.some((u) => u.includes("donate") || u.endsWith(".png")));
check("the same page is not fetched twice",
  new Set(picked).size === picked.length);
check("the cap is a cap", selectPolicyPages(LINKS, "https://e.com", 1).length === 1);
check("the homepage is never re-selected, even as a one-page site's #anchor",
  selectPolicyPages(extractLinks(`<a href="/#issues">Issues</a><a href="https://www.e.com/">Platform</a>`, "https://e.com/"),
    "https://e.com/").length === 0);

/* ---- links ----------------------------------------------------------- */
const links = extractLinks(
  `<a href="/issues" class="x">The <b>Issues</b></a><a>no href</a><a href="#top">top</a>`,
  "https://e.com/",
);
check("links resolve and their text is flattened",
  links.length === 2 &&
    links[0].url === "https://e.com/issues" &&
    links[0].text === "The Issues",
  JSON.stringify(links));

/* ---- entities: decode what we know, leave what we do not -------------- */
check("known entities decode",
  decodeEntities("Tom &amp; Jerry&rsquo;s &quot;plan&quot;&hellip;") ===
    "Tom & Jerry’s \"plan\"…");
check("an unknown entity is left alone, never guessed",
  decodeEntities("A &frac34; share") === "A &frac34; share");

/* ---- passages -------------------------------------------------------- */
const HTML = `
<nav><p>Home Issues Donate About us and everything else in the navigation bar</p></nav>
<script>var x = "I will cap property insurance rates for every Florida family";</script>
<style>.p { content: "I will fund public schools across the whole of the state"; }</style>
<h2>Housing</h2>
<p>I will cap property insurance rate increases at five percent a year for every homeowner.</p>
<p>Short.</p>
<ul><li>Build 50,000 new affordable homes in the first term, starting with the counties that need them most.</li></ul>
<p>Paid for by the Committee to Elect Somebody, a political committee of Florida.</p>
<p>We will not donate our future to the insurance lobby, and we will say so plainly every single day.</p>
<footer><p>Copyright 2026 the campaign, all rights reserved, every page of this website</p></footer>
`;
const ps = extractPassages(HTML, "https://e.com/issues");
const texts = ps.map((p) => p.text);

check("script and style contents never become passages",
  !texts.some((t) => t.includes("var x") || t.includes("content:")),
  JSON.stringify(texts));
check("nav and footer never become passages",
  !texts.some((t) => t.includes("navigation bar") || t.includes("all rights reserved")),
  JSON.stringify(texts));
check("a heading is context, not a passage",
  !texts.includes("Housing") && ps.every((p) => p.heading === "Housing"));
check("a paragraph and a list item both count",
  texts.some((t) => t.startsWith("I will cap property insurance")) &&
    texts.some((t) => t.startsWith("Build 50,000")));
check("text under the minimum is dropped", !texts.includes("Short."));
check("boilerplate is dropped by prefix",
  !texts.some((t) => t.startsWith("Paid for by")));
check("a sentence that merely CONTAINS a boilerplate word survives",
  texts.some((t) => t.includes("We will not donate our future")),
  "a substring rule here would edit the candidate's words");
check("every passage clears the minimum",
  ps.every((p) => p.text.length >= MIN_PASSAGE_CHARS));
check("passages carry the url they came from",
  ps.every((p) => p.url === "https://e.com/issues"));

/* Splitting a long block must keep every word, in order. */
const sentence = "Florida needs a state catastrophe fund that carries hurricane risk. ";
const long = `<p>${sentence.repeat(12)}</p>`;
const split = extractPassages(long, "https://e.com/plan");
check("an over-long block is split, not truncated", split.length > 1, `${split.length} part(s)`);
check("every split part is within the cap",
  split.every((p) => p.text.length <= MAX_PASSAGE_CHARS));
check("splitting loses no words",
  split.map((p) => p.text).join(" ").replace(/\s+/g, " ").trim() ===
    sentence.repeat(12).replace(/\s+/g, " ").trim());

/* ---- ids and dedupe --------------------------------------------------- */
check("the same url and text give the same id",
  passageId("https://e.com/a", "text") === passageId("https://e.com/a", "text"));
check("a different url gives a different id",
  passageId("https://e.com/a", "text") !== passageId("https://e.com/b", "text"));
const dupPage = extractPassages(
  `<p>${"A repeated block of campaign copy that appears twice on the page."}</p>
   <p>${"A repeated block of campaign copy that appears twice on the page."}</p>`,
  "https://e.com/x",
);
check("the same text twice on one page is one passage", dupPage.length === 1);

const across = dedupeAcrossPages([
  { id: "1", url: "https://e.com/a", heading: null, text: "Same site-wide callout text here." },
  { id: "2", url: "https://e.com/b", heading: null, text: "Same site-wide callout text here." },
  { id: "3", url: "https://e.com/b", heading: null, text: "Something else entirely." },
]);
check("a site-wide callout is kept once, at its first page",
  across.length === 2 && across[0].url === "https://e.com/a");

/* ---- robots.txt ------------------------------------------------------- */
const ROBOTS = `
User-agent: BadBot
Disallow: /

User-agent: *
Disallow: /wp-admin/
Disallow: /private
# a comment
Allow: /
`;
check("a group naming someone else is not ours",
  isAllowedByRobots(ROBOTS, "https://e.com/issues"));
check("a disallowed path is refused",
  !isAllowedByRobots(ROBOTS, "https://e.com/private/plan") &&
    !isAllowedByRobots(ROBOTS, "https://e.com/wp-admin/"));
check("an allowed path is fetched", isAllowedByRobots(ROBOTS, "https://e.com/issues"));
check("no robots.txt means no rules", isAllowedByRobots("", "https://e.com/issues"));
check("an unparseable url is refused rather than fetched",
  !isAllowedByRobots(ROBOTS, "not a url"));

/* The ingest answers to its own token AND every Anthropic token, because what
   it reads goes to a model. */
check("the ingest honors its own token and every Anthropic crawler token",
  ROBOTS_AGENTS.includes(INGEST_AGENT) &&
    ANTHROPIC_AGENTS.every((a) => ROBOTS_AGENTS.includes(a)) &&
    ["ClaudeBot", "anthropic-ai", "Claude-Web", "Claude-User"].every((a) => ROBOTS_AGENTS.includes(a)));

/* jeannette2026.com, 2026-09-24: AI crawlers named and refused, `*` allowed.
   Under the old `*`-only reading the ingest would have crawled this site. */
const AI_OPT_OUT = `
User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /
Disallow: /css2/
`;
check("a site that disallows Anthropic's crawlers is not read, though * allows it",
  !isAllowedByRobots(AI_OPT_OUT, "https://www.jeannette2026.com/"));
check("the refusal names the agents that were refused",
  blockedAgents(AI_OPT_OUT, "https://www.jeannette2026.com/").join(",") ===
    "ClaudeBot,Claude-Web,anthropic-ai",
  blockedAgents(AI_OPT_OUT, "https://www.jeannette2026.com/").join(","));
check("our own token still falls back to *",
  isAllowedByRobots(AI_OPT_OUT, "https://e.com/issues", [INGEST_AGENT]));

/* Squarespace's default: ClaudeBot listed in the SAME group as *, which blocks
   only admin paths. Listing an agent is not refusing it. */
const SHARED_GROUP = `
User-agent: AI2Bot
User-agent: anthropic-ai
User-agent: ClaudeBot
User-agent: GPTBot
User-agent: *
Disallow: /config
Disallow: /api/
Allow: /api/ui-extensions/
`;
check("an agent listed in a permissive shared group may fetch content pages",
  isAllowedByRobots(SHARED_GROUP, "https://e.com/issues"));
check("the shared group's disallows still apply to it",
  !isAllowedByRobots(SHARED_GROUP, "https://e.com/config") &&
    !isAllowedByRobots(SHARED_GROUP, "https://e.com/api/data"));

check("a group naming our own token binds us even when * allows",
  !isAllowedByRobots("User-agent: KnowYourVote\nDisallow: /\n\nUser-agent: *\nAllow: /\n", "https://e.com/"));
check("a named group replaces *, it does not add to it",
  isAllowedByRobots("User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /private\n",
    "https://e.com/issues", ["ClaudeBot"]) &&
  !isAllowedByRobots("User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /private\n",
    "https://e.com/issues"),
  "ClaudeBot is governed by its own group; the ingest's own token still falls to * and is refused");
check("agent names match case-insensitively and ignore a version suffix",
  !isAllowedByRobots("User-agent: claudebot/1.0\nDisallow: /\n", "https://e.com/"));
/* Lines before the first User-agent apply to everyone (a deliberate,
   politer departure from RFC 9309; see candidate-site.ts). The real case is a
   WordPress plugin's site-wide Crawl-delay above a Yoast block. */
const PREAMBLE = `Disallow: /wp-content/uploads/wpforms/
Crawl-delay: 10
# START YOAST BLOCK
User-agent: *
Disallow:
`;
check("a Crawl-delay above the first User-agent is honored",
  crawlDelaySec(PREAMBLE) === 10, String(crawlDelaySec(PREAMBLE)));
check("a Disallow above the first User-agent applies to every agent",
  !isAllowedByRobots(PREAMBLE, "https://e.com/wp-content/uploads/wpforms/x") &&
    isAllowedByRobots(PREAMBLE, "https://e.com/issues"));
check("the preamble adds to a named group rather than replacing it",
  !isAllowedByRobots("Disallow: /private\nUser-agent: ClaudeBot\nDisallow: /drafts\n",
    "https://e.com/private/x", ["ClaudeBot"]) &&
  !isAllowedByRobots("Disallow: /private\nUser-agent: ClaudeBot\nDisallow: /drafts\n",
    "https://e.com/drafts/x", ["ClaudeBot"]));
check("an empty Disallow allows everything",
  isAllowedByRobots("User-agent: ClaudeBot\nDisallow:\n", "https://e.com/issues"));

/* Precedence: the longest matching pattern wins, and a tie goes to Allow. */
const PRECEDENCE = "User-agent: *\nDisallow: /issues\nAllow: /issues/housing\nDisallow: /a\nAllow: /a\n";
check("a longer Allow beats a shorter Disallow",
  isAllowedByRobots(PRECEDENCE, "https://e.com/issues/housing"));
check("a longer Disallow beats a shorter Allow",
  !isAllowedByRobots("User-agent: *\nAllow: /\nDisallow: /private\n", "https://e.com/private/x"));
check("the Disallow still covers the rest of its prefix",
  !isAllowedByRobots(PRECEDENCE, "https://e.com/issues/taxes"));
check("an equal-length tie goes to Allow",
  isAllowedByRobots(PRECEDENCE, "https://e.com/a"));

/* Wildcards and anchors, including the query-string rule Wix ships. */
check("* matches any run and $ anchors the end",
  !isAllowedByRobots("User-agent: *\nDisallow: /*.pdf$\n", "https://e.com/docs/plan.pdf") &&
    isAllowedByRobots("User-agent: *\nDisallow: /*.pdf$\n", "https://e.com/docs/plan.pdf.html"));
check("rules match the query string too",
  !isAllowedByRobots("User-agent: *\nDisallow: *?lightbox=\n", "https://e.com/gallery?lightbox=1") &&
    isAllowedByRobots("User-agent: *\nDisallow: *?lightbox=\n", "https://e.com/gallery"));
check("regex characters in a pattern are literal",
  isAllowedByRobots("User-agent: *\nDisallow: /a.b\n", "https://e.com/axb"));

/* Crawl-delay: the longest one any governing group asks for, from groups that
   govern us only. */
check("Crawl-delay is read from the groups that govern us",
  crawlDelaySec("User-agent: *\nCrawl-delay: 10\n") === 10);
check("the longest applicable Crawl-delay wins",
  crawlDelaySec("User-agent: ClaudeBot\nCrawl-delay: 20\n\nUser-agent: *\nCrawl-delay: 10\n") === 20);
check("another agent's Crawl-delay does not apply to us",
  crawlDelaySec("User-agent: BadBot\nCrawl-delay: 600\n\nUser-agent: *\nDisallow:\n") === null);
check("a malformed Crawl-delay is ignored, not read as zero",
  crawlDelaySec("User-agent: *\nCrawl-delay: soon\n") === null);

/* ---- bot challenges ---------------------------------------------------
   Real markup captured from candidate hosts on 2026-09-25. A challenge read
   as the page yields zero passages, which looks like a candidate who said
   nothing, so every shape the ingest meets must be recognised. */
const SITEGROUND_REFRESH =
  `<html><head><link rel="icon" href="data:;"><meta http-equiv="refresh" ` +
  `content="0;/.well-known/sgcaptcha/?r=%2F&y=ipr:160.79.106.132:1790305984.952"></meta></head></html>`;
const SITEGROUND_SCREEN =
  `<!DOCTYPE html><html><head><title>Robot Challenge Screen</title></head>` +
  `<body>annettetaddeo.com Checking the site connection security</body></html>`;
const CLOUDFLARE_WAIT =
  `<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title>` +
  `<script>window._cf_chl_opt={cvId:'3'};</script></head><body></body></html>`;
const CLOUDFLARE_BLOCK =
  `<!DOCTYPE html><html><head><title>Attention Required! | Cloudflare</title></head><body></body></html>`;
const REAL_PAGE =
  `<!DOCTYPE html><html><head><title>Jennifer Jenkins for U.S. Congress</title></head>` +
  `<body><p>We use Cloudflare to keep this site fast. Just a moment of your time to sign up.</p></body></html>`;
const TURNSTILE_PAGE =
  `<!DOCTYPE html><html lang="en-US"><head><title>Home - Blaise Ingoglia for CFO</title>` +
  `<link rel='dns-prefetch' href='//challenges.cloudflare.com' />` +
  `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script></head>` +
  `<body><h1>KEEP FLORIDA FEARLESS WITH BLAISE</h1></body></html>`;

check("SiteGround's meta-refresh interstitial is a challenge", looksLikeBotChallenge(SITEGROUND_REFRESH));
check("SiteGround's Robot Challenge Screen is a challenge", looksLikeBotChallenge(SITEGROUND_SCREEN));
check("Cloudflare's 'Just a moment...' is a challenge", looksLikeBotChallenge(CLOUDFLARE_WAIT));
check("Cloudflare's 'Attention Required!' block is a challenge", looksLikeBotChallenge(CLOUDFLARE_BLOCK));
check("a real page that merely mentions Cloudflare is not a challenge",
  !looksLikeBotChallenge(REAL_PAGE));
check("a real page that embeds a Cloudflare Turnstile widget is not a challenge",
  !looksLikeBotChallenge(TURNSTILE_PAGE));
check("a robots.txt is not a challenge",
  !looksLikeBotChallenge("User-agent: *\nDisallow: /wp-admin/\n"));
check("only the head of a document is examined",
  !looksLikeBotChallenge(`<html><body>${"x".repeat(20_000)}<title>Just a moment...</title></body></html>`));
check("a rendered page must carry more text than an interstitial's one line",
  MIN_PAGE_TEXT_CHARS > "annettetaddeo.com Checking the site connection security".length);

/* ---- client-rendered pages --------------------------------------------
   The shell below is reelectbastien.com's real homepage, trimmed, 2026-09-25:
   a title, meta tags, an empty #root and a script bundle. Every word a voter
   reads is built by that script, so a plain fetch finds nothing to quote. */
const SPA_SHELL = `<!doctype html><html lang="en"><head><meta charset="UTF-8" />
<title>Marleine Bastien for Miami-Dade Commission District 2 | Re-Elect</title>
<meta name="description" content="Re-elect Commissioner Marleine Bastien, Miami-Dade County Commission District 2. The work is not done. Vote August 18, 2026. Ballot #134." />
<script type="module" crossorigin src="/assets/index-Bx2k.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-C9q.css"></head>
<body><div id="root"></div></body></html>`;
const SERVER_PAGE = `<html><head><title>Kathy Castor for Congress</title></head><body>
<h1>Kathy Castor: Fighting for Florida</h1>
<p>Kathy Castor has spent her career fighting to lower costs for Tampa Bay families,
protect Social Security and Medicare, and make homeowners insurance affordable again.</p>
<p>She will keep working to bring good-paying jobs to the district and protect our waters.</p>
</body></html>`;
const SCRIPT_ONLY_TEXT = `<html><body><div id="app"></div><script>
window.__DATA__ = {"text": "${"I will cap property insurance increases for every Florida family. ".repeat(10)}"};
</script></body></html>`;

check("a client-rendered shell is recognised", looksClientRendered(SPA_SHELL),
  `${visibleTextLength(SPA_SHELL)} chars`);
check("a server-rendered page is not", !looksClientRendered(SERVER_PAGE),
  `${visibleTextLength(SERVER_PAGE)} chars`);
check("text that exists only inside a script does not count as visible",
  looksClientRendered(SCRIPT_ONLY_TEXT));
check("visible text ignores meta tags and counts only what a reader sees",
  visibleTextLength(SPA_SHELL) === "Marleine Bastien for Miami-Dade Commission District 2 | Re-Elect".length,
  String(visibleTextLength(SPA_SHELL)));
check("a bot challenge is also too short to be a page, so either check alone would catch it",
  looksClientRendered(SITEGROUND_SCREEN));

if (failures > 0) {
  console.error(`\nverify-candidate-site: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-candidate-site: OK — quotes stay verbatim, the crawl stays on-site, capped and robots-aware",
);
