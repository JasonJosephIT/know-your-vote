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

   Fail-closed: a site that yields no passages exits non-zero. A silent empty
   file looks exactly like a candidate with no stated positions, and those are
   opposite facts. */

import { writeFileSync } from "node:fs";
import {
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

const UA = "KnowYourVote/1.0 (+https://github.com/JasonJosephIT/know-your-vote)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/* robots.txt first, and a missing one means no rules — which is the correct
   reading for a site that never published any, and the only safe one. */
const robotsTxt = (await get(new URL("/robots.txt", site).toString())) ?? "";
const allowed = (url: string) => isAllowedByRobots(robotsTxt, url);

if (!allowed(site)) {
  console.error(`robots.txt disallows ${site} — stopping.`);
  process.exit(1);
}

console.error(`site: ${site}`);
const homepage = await get(site);
if (homepage === null) {
  console.error("Could not fetch the homepage — stopping.");
  process.exit(1);
}

const links = extractLinks(homepage, site);
const pages = selectPolicyPages(links, site, pageLimit).filter(allowed);
console.error(
  `  ${links.length} links, ${pages.length} policy page(s) selected (cap ${pageLimit})`,
);

const all: Passage[] = [];
/* The homepage counts: a one-page campaign site keeps its whole platform
   there, and skipping it would report that candidate as having said nothing. */
for (const p of extractPassages(homepage, site)) all.push(p);

for (const url of pages) {
  await sleep(1_000);
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
      `candidate: check whether the site renders its text client-side.`,
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
