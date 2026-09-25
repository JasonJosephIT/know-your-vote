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
       [--pages 8] [--out passages.jsonl]

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

   Fail-closed: a site that yields no passages exits non-zero. A silent empty
   file looks exactly like a candidate with no stated positions, and those are
   opposite facts. */

import { writeFileSync } from "node:fs";
import {
  INGEST_AGENT,
  blockedAgents,
  crawlDelaySec,
  dedupeAcrossPages,
  extractLinks,
  extractPassages,
  isAllowedByRobots,
  canonicalizeUrl,
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
    "Usage: node scripts/candidate-site-ingest.ts --site https://example.com [--pages 8] [--out passages.jsonl]",
  );
  process.exit(2);
}
const pageLimit = Number(flag("pages") ?? 8);
const outPath = flag("out");

const UA = `${INGEST_AGENT}/1.0 (+https://github.com/JasonJosephIT/know-your-vote)`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Our own floor between requests; a site's Crawl-delay can only raise it. */
const MIN_DELAY_MS = 1_000;

async function get(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
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

/* robots.txt first. A 4xx means the site published none (RFC 9309), so there
   are no rules. A 5xx, a failed fetch, or a 2xx that is an HTML page (a bot
   challenge served in its place) means we could not read it: that is not the
   same fact as "none", so it is named, and then treated as no rules (see the
   header). Returns the file's text, or "" for no rules. */
async function getRobots(url: string): Promise<string> {
  const unreadable = (why: string) => {
    robotsUnreadable = true;
    console.error(
      `  WARNING robots.txt unreadable (${why}) at ${url} — its policy is unknown; proceeding with no rules.`,
    );
    return "";
  };
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/plain" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    return unreadable((err as Error).name);
  }
  if (res.status >= 400 && res.status < 500) return "";
  const text = await res.text();
  if (!res.ok) return unreadable(`HTTP ${res.status}`);
  if (/^\s*</.test(text)) return unreadable(`HTTP ${res.status}, an HTML page in its place`);
  return text;
}

let robotsUnreadable = false;

const robotsTxt = await getRobots(new URL("/robots.txt", site).toString());
const allowed = (url: string) => isAllowedByRobots(robotsTxt, url);

const blocked = blockedAgents(robotsTxt, site);
if (blocked.length > 0) {
  console.error(`robots.txt disallows ${site} for ${blocked.join(", ")} — stopping.`);
  process.exit(1);
}

const delaySec = crawlDelaySec(robotsTxt);
const delayMs = Math.max(MIN_DELAY_MS, (delaySec ?? 0) * 1_000);

console.error(`site: ${site}`);
if (delaySec !== null) console.error(`  honoring Crawl-delay: ${delaySec}s`);
await sleep(delayMs);
const homepage = await get(site);
if (homepage === null) {
  console.error("Could not fetch the homepage — stopping.");
  process.exit(1);
}

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
  process.exit(1);
}

if (outPath) {
  writeFileSync(outPath, `${lines.join("\n")}\n`);
  console.error(`\n${passages.length} passage(s) -> ${outPath}`);
} else {
  console.log(lines.join("\n"));
  console.error(`\n${passages.length} passage(s)`);
}
