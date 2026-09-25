/* Ingest one candidate's own site into passages.

   The ONE part of this path that touches the network, which is why it is a
   script and not a library: every rule it applies lives in
   src/lib/candidate-site.ts and is verified offline by
   scripts/verify-candidate-site.ts. Run that first; if it fails, this
   script's output is not worth reading.

   It writes JSONL — one passage per line, each with the url it came from —
   and nothing else. Deciding what a passage is ABOUT is the next step
   (scripts/candidate-policy-noul.ts), and that decision is not this script's
   to make.

     node scripts/candidate-site-ingest.ts --site https://example.com \
       [--pages 8] [--out passages.jsonl] [--browser auto|always|never]

   Polite by construction: robots.txt is read and honored, the crawl is capped
   at --pages beyond the homepage, requests are serialized with a delay, and
   only links that look like a policy section are followed. This is a handful
   of requests to someone else's server, not a crawl.

   robots.txt is honored for our own UA token AND every Anthropic crawler
   token (src/lib/candidate-site.ts, ROBOTS_AGENTS): what this fetches is read
   into a model, so a site that disallows ClaudeBot or anthropic-ai is not
   read, whatever our UA string says. Its Crawl-delay is honored too.

   A robots.txt we cannot read (a server error, a failed fetch, or a
   bot-challenge page served in its place) is treated as no rules, and the run
   proceeds with a warning. Founder decision 2026-09-25: an unreadable file
   states no policy to honor, and a readable one that refuses Anthropic's
   crawlers still stops the run. The warning is the audit trail that the site's
   stance was unknown when it was read
   (docs/general-election/candidate-conflicts-2026-09-25.md §5).

   BOT CHALLENGES. Many campaign hosts answer a plain fetch with an anti-bot
   interstitial (SiteGround's "Robot Challenge Screen", Cloudflare's "Just a
   moment..."). With --browser auto (the default), a response recognised as
   one (looksLikeBotChallenge) is fetched again in headless Chromium, which
   runs the host's own check the way any visitor's browser does. That goes for
   robots.txt too, so a challenged policy is READ rather than skipped. The
   browser identifies itself: its own UA with our token appended, never a
   disguised one. It downloads no images, media or fonts, and it solves no
   captchas. If the check does not clear, the page is reported unreachable and
   nothing from it is quoted.

   CLIENT-RENDERED PAGES. A page that loads but carries almost no text
   (looksClientRendered: an empty `<div id="root">` shell whose words are
   built by its scripts) is rendered in the same browser, under the same rules,
   so its text and links exist to be read. --browser always skips the plain fetch;
   --browser never restores fetch-only behavior. Needs Chromium for
   playwright-core (`npx playwright-core install chromium`, or CHROMIUM_PATH).

   Fail-closed: a site that yields no passages exits non-zero. A silent empty
   file looks exactly like a candidate with no stated positions, and those are
   opposite facts. */

import { writeFileSync } from "node:fs";
import type { Browser, BrowserContext } from "playwright-core";
import {
  INGEST_AGENT,
  MIN_PAGE_TEXT_CHARS,
  blockedAgents,
  crawlDelaySec,
  dedupeAcrossPages,
  extractLinks,
  extractPassages,
  isAllowedByRobots,
  canonicalizeUrl,
  looksClientRendered,
  looksLikeBotChallenge,
  visibleTextLength,
  selectPolicyPages,
  type Passage,
} from "../src/lib/candidate-site.ts";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const site = canonicalizeUrl(flag("site") ?? "");
if (!site) {
  console.error(
    "Usage: node scripts/candidate-site-ingest.ts --site https://example.com [--pages 8] [--out passages.jsonl] [--browser auto|always|never]",
  );
  process.exit(2);
}
const pageLimit = Number(flag("pages") ?? 8);
const outPath = flag("out");
const browserMode = flag("browser") ?? "auto";
if (!["auto", "always", "never"].includes(browserMode)) {
  console.error(`--browser must be auto, always or never, not "${browserMode}"`);
  process.exit(2);
}

const UA = `${INGEST_AGENT}/1.0 (+https://github.com/JasonJosephIT/know-your-vote)`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Our own floor between requests; a site's Crawl-delay can only raise it. */
const MIN_DELAY_MS = 1_000;

/* ---- the browser, launched at most once and only when needed ---------- */

/* How long the browser waits for a challenge to clear, or for a
   client-rendered page's text to appear. SiteGround's challenge usually clears
   in under 15 s; a rendered page, in a few. */
const CHALLENGE_WAIT_MS = 30_000;

let browser: Browser | null = null;
let browserCtx: BrowserContext | null = null;
let browserUnavailable = false;

async function browserContext(): Promise<BrowserContext | null> {
  if (browserCtx) return browserCtx;
  if (browserUnavailable) return null;
  try {
    const { chromium } = await import("playwright-core");
    const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      proxy: proxy ? { server: proxy } : undefined,
    });
    /* Honest identification: the browser's own UA, unaltered, plus ours. */
    const probe = await browser.newPage();
    const ownUA = await probe.evaluate(() => navigator.userAgent);
    await probe.close();
    browserCtx = await browser.newContext({ userAgent: `${ownUA} ${UA}` });
    /* Page text is all we read; images, media and fonts are someone else's
       bandwidth for nothing. */
    await browserCtx.route("**/*", (route) =>
      ["image", "media", "font"].includes(route.request().resourceType())
        ? route.abort()
        : route.continue(),
    );
    return browserCtx;
  } catch (err) {
    browserUnavailable = true;
    console.error(
      `  browser unavailable (${(err as Error).message.split("\n")[0]}); ` +
        "install Chromium with `npx playwright-core install chromium` or set CHROMIUM_PATH.",
    );
    return null;
  }
}

/** Load `url` in the browser and wait for any challenge to clear and the
    page's text to appear. Returns the page's HTML, or for a text resource
    (robots.txt) its rendered text. Null only when a bot challenge is still
    showing at the deadline: a page that renders but stays short is still the
    page, and is returned as it is. */
async function browserGet(url: string, asText: boolean): Promise<string | null> {
  const ctx = await browserContext();
  if (!ctx) return null;
  const page = await ctx.newPage();
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const deadline = Date.now() + CHALLENGE_WAIT_MS;
    let html = "";
    while (Date.now() < deadline) {
      html = await page.content().catch(() => "");
      if (!looksLikeBotChallenge(html)) {
        const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
        if (asText) {
          /* A 4xx robots.txt is "none" in a browser too. */
          if (res && res.status() >= 400 && res.status() < 500) return "";
          if (!/^\s*</.test(text)) return text;
        } else if (text.trim().length >= MIN_PAGE_TEXT_CHARS) {
          return html;
        }
      }
      await page.waitForTimeout(1_500);
    }
    if (!asText && html && !looksLikeBotChallenge(html)) {
      console.error(`  rendered, but only ${visibleTextLength(html)} characters of text: ${url}`);
      return html;
    }
    console.error(`  bot challenge did not clear in the browser: ${url}`);
    return null;
  } catch (err) {
    console.error(`  browser ${(err as Error).name}: ${url}`);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function closeBrowser(): Promise<void> {
  await browser?.close().catch(() => {});
  browser = null;
  browserCtx = null;
}

/* Every exit goes through here, so a launched browser is always closed. */
async function done(code: number): Promise<never> {
  await closeBrowser();
  process.exit(code);
}

/* ---- fetching ----------------------------------------------------------- */

let viaBrowser = 0;

/** A page's HTML: plain fetch first; a bot challenge goes to the browser
    (unless --browser never). Null, with the reason named, when neither
    yields the page. */
async function get(url: string): Promise<string | null> {
  if (browserMode === "always") {
    const html = await browserGet(url, false);
    if (html !== null) viaBrowser++;
    return html;
  }
  let status = 0;
  let body = "";
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
    status = res.status;
    body = await res.text();
    if (res.ok && !looksLikeBotChallenge(body)) {
      /* A client-rendered shell: its text only exists once its scripts run.
         Render it; if the browser cannot, the shell is still what we got. */
      if (browserMode === "never" || !looksClientRendered(body)) return body;
      console.error(
        `  only ${visibleTextLength(body)} characters of text, rendering in the browser: ${url}`,
      );
      const html = await browserGet(url, false);
      if (html === null) return body;
      viaBrowser++;
      return html;
    }
  } catch (err) {
    /* Degrade honestly: name the failure, never a silent empty result. */
    console.error(`  ${(err as Error).name}: ${url}`);
    return null;
  }
  if (looksLikeBotChallenge(body)) {
    if (browserMode === "never") {
      console.error(`  bot challenge (HTTP ${status}), --browser never: ${url}`);
      return null;
    }
    console.error(`  bot challenge (HTTP ${status}), retrying in the browser: ${url}`);
    const html = await browserGet(url, false);
    if (html !== null) viaBrowser++;
    return html;
  }
  console.error(`  HTTP ${status} ${url}`);
  return null;
}

/* robots.txt first. A 4xx means the site published none (RFC 9309), so there
   are no rules. A bot challenge in its place goes to the browser like any
   page, so the policy is read where it can be. Anything still unreadable (a
   5xx, a failed fetch, a challenge that did not clear) is named, then treated
   as no rules (see the header). Returns the file's text, or "" for none. */
async function getRobots(url: string): Promise<string> {
  const unreadable = (why: string) => {
    robotsUnreadable = true;
    console.error(
      `  WARNING robots.txt unreadable (${why}) at ${url} — its policy is unknown; proceeding with no rules.`,
    );
    return "";
  };
  const viaBrowserOr = async (why: string) => {
    if (browserMode === "never") return unreadable(why);
    const text = await browserGet(url, true);
    if (text === null) return unreadable(`${why}; the browser could not clear it either`);
    console.error(`  robots.txt read in the browser (${why})`);
    return text;
  };
  if (browserMode === "always") return viaBrowserOr("--browser always");
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/plain" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    return viaBrowserOr(`plain fetch failed: ${(err as Error).name}`);
  }
  const text = await res.text();
  if (looksLikeBotChallenge(text)) return viaBrowserOr(`plain fetch got a bot challenge, HTTP ${res.status}`);
  if (res.status >= 400 && res.status < 500) return "";
  if (!res.ok) return unreadable(`HTTP ${res.status}`);
  if (/^\s*</.test(text)) return viaBrowserOr(`plain fetch got an HTML page in its place, HTTP ${res.status}`);
  return text;
}

let robotsUnreadable = false;

const robotsTxt = await getRobots(new URL("/robots.txt", site).toString());
const allowed = (url: string) => isAllowedByRobots(robotsTxt, url);

const blocked = blockedAgents(robotsTxt, site);
if (blocked.length > 0) {
  console.error(`robots.txt disallows ${site} for ${blocked.join(", ")} — stopping.`);
  await done(1);
}

const delaySec = crawlDelaySec(robotsTxt);
const delayMs = Math.max(MIN_DELAY_MS, (delaySec ?? 0) * 1_000);

console.error(`site: ${site}`);
if (delaySec !== null) console.error(`  honoring Crawl-delay: ${delaySec}s`);
await sleep(delayMs);
const homepage =
  (await get(site)) ??
  (console.error("Could not fetch the homepage — stopping."), await done(1));

const links = extractLinks(homepage, site);
const selected = selectPolicyPages(links, site, pageLimit);
const pages = selected.filter(allowed);
for (const url of selected.filter((u) => !allowed(u))) {
  console.error(`  skipped, robots.txt disallows it for ${blockedAgents(robotsTxt, url).join(", ")}: ${url}`);
}
console.error(
  `  ${links.length} links, ${pages.length} policy page(s) selected (cap ${pageLimit})`,
);

const all: Passage[] = [];
/* The homepage counts: a one-page campaign site keeps its whole platform
   there, and skipping it would report that candidate as having said nothing. */
for (const p of extractPassages(homepage, site)) all.push(p);

for (const url of pages) {
  await sleep(delayMs);
  const html = await get(url);
  if (html === null) continue;
  const passages = extractPassages(html, url);
  console.error(`  ${passages.length.toString().padStart(3)} passage(s)  ${url}`);
  for (const p of passages) all.push(p);
}

const passages = dedupeAcrossPages(all);
const lines = passages.map((p) =>
  JSON.stringify({ ...p, retrieved_at: new Date().toISOString() }),
);

if (passages.length === 0) {
  console.error(
    `No passages from ${site}. That is a finding about the fetch, not about the ` +
      (robotsUnreadable
        ? `candidate: robots.txt was unreadable too, so the site is most likely serving a ` +
          `bot challenge to non-browser clients rather than its pages.`
        : `candidate: check whether the site renders its text client-side, or serves ` +
          `a bot challenge to non-browser clients.`),
  );
  await done(1);
}

await closeBrowser();
if (viaBrowser > 0) console.error(`  ${viaBrowser} page(s) fetched in the browser`);

if (outPath) {
  writeFileSync(outPath, `${lines.join("\n")}\n`);
  console.error(`\n${passages.length} passage(s) -> ${outPath}`);
} else {
  console.log(lines.join("\n"));
  console.error(`\n${passages.length} passage(s)`);
}
