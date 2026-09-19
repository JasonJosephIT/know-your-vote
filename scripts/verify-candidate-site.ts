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
  disallowedPaths,
  extractLinks,
  extractPassages,
  isAllowedByRobots,
  isSameSite,
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
check("only the * group is read",
  disallowedPaths(ROBOTS).join(",") === "/wp-admin/,/private",
  disallowedPaths(ROBOTS).join(","));
check("a disallowed path is refused",
  !isAllowedByRobots(ROBOTS, "https://e.com/private/plan") &&
    !isAllowedByRobots(ROBOTS, "https://e.com/wp-admin/"));
check("an allowed path is fetched", isAllowedByRobots(ROBOTS, "https://e.com/issues"));
check("no robots.txt means no rules", isAllowedByRobots("", "https://e.com/issues"));
check("an unparseable url is refused rather than fetched",
  !isAllowedByRobots(ROBOTS, "not a url"));

if (failures > 0) {
  console.error(`\nverify-candidate-site: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-candidate-site: OK — quotes stay verbatim, the crawl stays on-site, capped and robots-aware",
);
