/* The outlets index (/news/outlet) says only what is true of the list and of
   what has been published from it.

   It said "We read a fixed list of 37 newsrooms ... We read 24 of them
   today". 24 counted the outlets the sweep may read (usableOutlets), and no
   story from any of the 37 had ever been published on the site. Its
   sentences now come from src/lib/news-outlet-index.ts:

     1. The list line states the listed and cleared counts, both computed
        from OUTLETS, and never "We read".
     2. publishedStoriesByOutlet counts distinct story URLs per listed
        outlet with outletForUrl: the rows live on 2026-10-05 (official
        sources, Ballotpedia, the Senate) count for no outlet; a story
        matched to two candidates counts once.
     3. publishedLine says plainly that none is published when that is the
        case, and counts them once there are some; it says nothing when the
        rows could not be read.
     4. outletPublishedLine: a read outlet with nothing published says so;
        an unread one with nothing says nothing more.
     5. The page renders these functions over the published rows it reads,
        cached under a versioned key and re-rendered every 15 minutes: no
        hard-coded count, no "We read N of them today".

   Run: node scripts/verify-news-outlet-copy.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  outletListLine,
  outletPublishedLine,
  publishedLine,
  publishedStoriesByOutlet,
} from "../src/lib/news-outlet-index.ts";
import { listedOutlets } from "../src/lib/news-outlets.ts";
import { OUTLETS, usableOutlets } from "../src/lib/news-sources.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const code = (rel: string) =>
  readFileSync(path.join(root, rel), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

console.log("1. The list");
const listed = listedOutlets(OUTLETS).length;
const cleared = usableOutlets(OUTLETS).length;
const line = outletListLine(listed, cleared);
check(
  `names the ${listed} listed newsrooms and the ${cleared} cleared to be read`,
  line.includes(`a fixed list of ${listed} newsrooms`) &&
    line.includes(`${cleared} of them are cleared for us to read today`),
  line
);
check("never says we read them", !/\bWe read\b/.test(line), line);
check(
  "the counts follow the list (computed, not typed in)",
  outletListLine(3, 1).includes("a fixed list of 3 newsrooms") &&
    outletListLine(3, 1).includes("1 of them is cleared"),
  outletListLine(3, 1)
);

console.log("\n2. Counting published stories");
/* Every news_item URL live on 2026-10-05. */
const LIVE_URLS = [
  "https://dos.fl.gov/elections/for-voters/election-dates/",
  "https://www.votehillsborough.gov/291/2026-General-Election",
  "https://www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232",
  "https://www.votehillsborough.gov/281/2026-Primary-Election",
  "https://browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites",
  "https://www.browardvotes.gov",
  "https://www.votehillsborough.gov",
  "https://www.ocfelections.gov",
  "https://dos.fl.gov/elections/",
  "https://registertovoteflorida.gov",
  "https://www.miamidade.gov/global/elections/home.page",
  "https://news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-exemption",
  "https://www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276",
  "https://www.flsenate.gov/Session/Bill/2026/991",
];
const live = publishedStoriesByOutlet([...LIVE_URLS, null], OUTLETS);
check("the live rows count for no listed outlet", live.size === 0, JSON.stringify([...live]));

const a = OUTLETS[0];
const b = OUTLETS[1];
const story = (o: (typeof OUTLETS)[number], slug: string) =>
  `https://${o.domain.includes("/") ? o.domain : `www.${o.domain}`}/${slug}`;
const counted = publishedStoriesByOutlet(
  [story(a, "x"), story(a, "x"), story(a, "y"), story(b, "z"), LIVE_URLS[0]],
  OUTLETS
);
check(
  "distinct URLs per outlet; a story on two candidates (two rows) counts once",
  counted.get(a.domain) === 2 && counted.get(b.domain) === 1 && counted.size === 2,
  JSON.stringify([...counted])
);

console.log("\n3. What the page says about published stories");
check(
  "none published: says so plainly",
  publishedLine(live) === "No story from any of them is published on Know Your Vote yet.",
  String(publishedLine(live))
);
check(
  "once there are some: counts stories and outlets",
  publishedLine(counted) === "3 stories from 2 of them are published on Know Your Vote so far." &&
    publishedLine(new Map([[a.domain, 1]])) ===
      "1 story from 1 of them is published on Know Your Vote so far.",
  String(publishedLine(counted))
);
check("unreadable rows: says nothing", publishedLine(null) === null);

console.log("\n4. Per row");
check("read, nothing published", outletPublishedLine(a.domain, true, live) === "None published here yet.");
check("not read, nothing published: nothing added", outletPublishedLine(a.domain, false, live) === null);
check("stories published", outletPublishedLine(a.domain, true, counted) === "2 stories published here.");
check("unreadable rows: nothing added", outletPublishedLine(a.domain, true, null) === null);

console.log("\n5. The page");
const PAGE = "src/app/(public)/news/outlet/page.tsx";
const page = code(PAGE);
check(
  "renders outletListLine over the listed and cleared counts",
  /outletListLine\(outlets\.length, readCount\)/.test(page)
);
check(
  "renders publishedLine and outletPublishedLine over the rows it reads",
  /publishedStoriesByOutlet\(await publishedStoryUrls\(\), OUTLETS\)/.test(page) &&
    /publishedLine\(published\)/.test(page) &&
    /outletPublishedLine\(o\.domain, reading\.reading, published\)/.test(page)
);
check(
  'no "We read" sentence and no typed-in count',
  !/We read/.test(page) && !/\b(37|24)\b/.test(page) && !/No story from/.test(page)
);
check(
  "reads news_item through unstable_cache under a versioned key, re-rendered every 15 minutes",
  /\.from\("news_item"\)/.test(page) &&
    /\["outlet-index-story-urls-v\d+"\]/.test(page) &&
    /export const revalidate = 900;/.test(page)
);

/* 6. The rows and the page's description don't say "we read" either: the
   sweep that would read a cleared outlet is run by hand, and nothing from
   any outlet is published (review, 2026-10-05). */
const outletsSrc = code("src/lib/news-outlets.ts");
check(
  'no outlet row is labelled "We read its stories"',
  !/label: "We read/.test(outletsSrc) && /label: "Cleared to read"/.test(outletsSrc)
);
check(
  'the page description does not say "which of them we read"',
  !/which of them we read/i.test(page)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nOutlet index copy checks passed.");
