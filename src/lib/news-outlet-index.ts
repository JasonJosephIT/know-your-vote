/* Relative, with the extension: scripts/verify-news-outlet-copy.ts loads
   this file in plain Node, which doesn't know the @/ alias. */
import { coveredCountyNames } from "./counties.ts";
import { outletForUrl, type Outlet } from "./news-sources.ts";

/* What the outlets index (/news/outlet) says about the list as a whole, and
   about what has actually reached the site from it.

   The page used to say "We read a fixed list of 37 newsrooms ... We read 24
   of them today". The 24 counted the outlets the sweep MAY read
   (usableOutlets), not anything read, and no story from any of the 37 had
   ever been published here (review 2026-10-05: the sweep is a script run
   by hand, review_item was empty, and no news_item row came from a listed
   outlet). So the copy now says how
   many newsrooms are listed, how many are cleared to be read, and, from the
   published rows themselves, how many of their stories are on the site,
   which is none until one is. Pure, so the sentences can be checked in
   plain Node against any count. */

/* Published stories per listed outlet, by domain. A story is a distinct URL:
   one article matched to several candidates is several news_item rows
   (news-fairness.md §6) and still one story. A URL belongs to an outlet by
   `outletForUrl`, the same fail-closed rule the outlet page and the feed
   use, so the two never disagree about whose story a URL is. The outlet
   page lists from the newest 200 URL rows, deduplicated the same way; past
   200 stories in all it can show fewer than this counts. */
export function publishedStoriesByOutlet(
  urls: readonly (string | null)[],
  outlets: readonly Outlet[]
): Map<string, number> {
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const outlet = outletForUrl(url, outlets);
    if (outlet) counts.set(outlet.domain, (counts.get(outlet.domain) ?? 0) + 1);
  }
  return counts;
}

const stories = (n: number) => `${n} ${n === 1 ? "story" : "stories"}`;

/* The opening paragraph's first half: the list, and how much of it may be
   read. "Cleared" is usableOutlets(): lean reviewed, a feed or sitemap we
   can reach, no mixed or syndicated feed, not on the AI-policy hold. */
export function outletListLine(listed: number, cleared: number): string {
  return (
    `We keep a fixed list of ${listed} newsrooms — local papers, broadcasters, ` +
    `public radio and statewide outlets covering ${coveredCountyNames()} ` +
    "counties and Florida as a whole. " +
    `${cleared} of them ${cleared === 1 ? "is" : "are"} cleared for us to read today; each row below says ` +
    "why when one is not. The list changes only with a stated reason."
  );
}

/* What has been published from the list. null when the published rows could
   not be read: then the page says nothing about them rather than guess. */
export function publishedLine(published: ReadonlyMap<string, number> | null): string | null {
  if (published === null) return null;
  const total = [...published.values()].reduce((a, b) => a + b, 0);
  if (total === 0) {
    return "No story from any of them is published on Know Your Vote yet.";
  }
  const from = published.size;
  return `${stories(total)} from ${from} of them ${total === 1 ? "is" : "are"} published on Know Your Vote so far.`;
}

/* One row's published count, under its reading status. An outlet we read
   but have published nothing from says so, so "Cleared to read" is never
   taken to mean its stories are here. Nothing for an outlet we do not read
   and have nothing from: its row already says why. */
export function outletPublishedLine(
  domain: string,
  reading: boolean,
  published: ReadonlyMap<string, number> | null
): string | null {
  if (published === null) return null;
  const n = published.get(domain) ?? 0;
  if (n > 0) return `${stories(n)} published here.`;
  return reading ? "None published here yet." : null;
}
