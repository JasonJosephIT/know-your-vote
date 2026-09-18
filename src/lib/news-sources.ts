/* The news-intake corpus — candidate-news-PRD.md §5 (task C7).

   R1 stops asking a search engine about each candidate and instead sweeps a
   fixed list of outlets, then matches what it finds against the roster. The
   list below IS the editorial decision, which is why it lives in the repo:
   reviewable, diffable, blameable. Changes land by PR with a stated reason —
   the same discipline Allowlist B has (`Agents/The Fact-Checker/
   allowlist_b_core.py`), and the host-matching rule here is deliberately the
   same one, so the two allowlists cannot disagree about what a domain is.

   Two fields are FOUNDER GATES:

     leanTag  — assigning a lean to a named news organisation is an editorial
                act with a real reputational cost for a nonpartisan product.
                It is not something a coding agent should assert from memory.
                Null until a human fills it in from a stated basis. Every
                `leanBasis` below records what the 2026-09-17 corpus
                (docs/general-election/news-corpus-2026-09-17.md) found, so
                the sign-off is a one-word edit per row, not a research task.
     feed     — a feed URL that 404s fails silently and looks exactly like
                "no news this week". Every non-null value below was fetched on
                2026-09-17 with the sweep's own user agent, parsed with
                src/lib/news-sweep.ts, and had an item dated within the last
                week (docs/general-election/news-corpus-verification-2026-09-17.md
                has the per-URL evidence). Null means it was TRIED and failed;
                the inline comment says how.

   `usableOutlets()` fail-closed skips any entry missing either. An empty
   result means the sweep does nothing and says so — never a silent success.

   Pure and dependency-free; scripts/verify-news-sweep.ts drives it. */

import type { LeanTag, SourceType } from "./news-labels";

export interface Outlet {
  /** Registrable host. Matched exactly or at a label boundary. */
  domain: string;
  /** Goes into `source.publisher` verbatim. */
  publisher: string;
  /** Goes into `source.type`. A newsroom's main feed is reporting; an
      opinion section is a SEPARATE entry, because the card treatment
      differs (news-fairness.md §1). */
  type: SourceType;
  /** Where the newsroom is based — used to scope an article that matched no
      candidate to a county feed (§7). Null = statewide. */
  countyFips: string | null;
  /** `source.lean_tag`. NULL = not yet signed off; the sweep skips it. */
  leanTag: LeanTag | null;
  /** What a reviewer should use to settle `leanTag`. Kept as data, not a
      comment, so it survives edits and shows up in review. */
  leanBasis: string;
  /** Verified feed URL (RSS/Atom). NULL = not yet confirmed to resolve. */
  feed: string | null;
}

/* The corpus searched AllSides, Ad Fontes and Media Bias/Fact Check for every
   outlet and found ratings only for the four legacy dailies. Everything else
   is recorded as "no independent rating found", never reasoned to a value. */
const UNRATED =
  "No independent bias rating found (AllSides / Ad Fontes / MBFC searched, corpus 2026-09-17). " +
  "Settle from a published nonpartisan rating cited in the PR that fills this in, or the founder signs off an explicit 'no rating' designation.";

/* Four covered counties (src/lib/resolve.ts COVERED_COUNTIES) plus statewide.
   A broadcaster's countyFips is its newsroom base, not its signal footprint —
   several of these cover two counties, and a story that names a candidate is
   scoped by that candidate's race anyway (§6).

   Ordering inside a county is by verified feed first, then the nulls, so the
   gaps read at a glance. */
export const OUTLETS: readonly Outlet[] = Object.freeze([
  // --- Miami-Dade ---
  o("wlrn.org", "WLRN", "12086", "https://www.wlrn.org/tags/news.rss"),
  o("local10.com", "WPLG Local 10", "12086", "https://www.local10.com/arc/outboundfeeds/rss/?outputType=xml"),
  o("wsvn.com", "WSVN 7News", "12086", "https://wsvn.com/news/feed/"),
  o("nbcmiami.com", "NBC6 South Florida", "12086", "https://www.nbcmiami.com/?rss=y"),
  o("miaminewtimes.com", "Miami New Times", "12086", "https://www.miaminewtimes.com/feed/"),
  /* WFOR's studios are on NW 18th Terrace in Doral (Miami-Dade), so this moves
     here from Broward, where the first draft had it. Broward loses its only
     television entry as a result — see the verification doc. */
  o("cbsnews.com/miami", "CBS News Miami", "12086", "https://www.cbsnews.com/miami/latest/rss/main"),
  /* Spanish-language daily. The Florida section feed is live; the site-wide
     /rss/home.xml last updated in 2019. */
  o("diariolasamericas.com", "Diario Las Américas", "12086", "https://www.diariolasamericas.com/rss/pages/florida.xml"),
  /* Bilingual English/French Haitian-diaspora biweekly, North Miami. Runs
     clearly labelled political advertisements — a reviewer should know. */
  o("lefloridien.com", "Le Floridien", "12086", "https://lefloridien.com/feed/"),
  o(
    "miamiherald.com",
    "Miami Herald",
    "12086",
    null, // Arc RSS path is a real 404 (confirmed via Firecrawl); every other path timed out for the sweep UA. No RSS 2026-09-17 — sitemap only.
    "Raters disagree: MBFC Left-Center (-3.4, High); AllSides Lean Left (low confidence, Sep 2026); Ad Fontes Middle/Reliable. " +
      "Corpus 2026-09-17 proposes center-left; endorsed Democratic presidential candidates since 2000 (MBFC). Founder decides.",
  ),
  /* McClatchy eliminated el Nuevo Herald's entire writing staff on 2026-09-10
     (AP via WLRN). Kept for auditability; expect near-zero original output. */
  o("elnuevoherald.com", "el Nuevo Herald", "12086", null), // same McClatchy CMS as the Herald; Arc RSS path is a real 404 (Firecrawl), sweep UA times out. 2026-09-17.
  /* Spanish-language TV (Canal 41). Same CMS as Diario Las Américas; the
     feed index at /contenidos/rss.html lists section feeds (found via
     Firecrawl site map, then verified with the sweep UA). The Miami section
     is the local one; /rss/pages/opinion.xml exists but was 23 days stale. */
  o("americateve.com", "América TeVé", "12086", "https://www.americateve.com/rss/pages/miami.xml"),
  /* Black-owned weekly, founded 1923. BLOX/TownNews search feed — same
     platform and same rate-limit caveat as News Service of Florida below.
     The feed is heavily syndicated (Florida Politics, Florida Phoenix, AP,
     press-release wires), with the origin in <dc:creator>; see the
     verification doc on republisher attribution. */
  o("miamitimesonline.com", "The Miami Times", "12086", "https://www.miamitimesonline.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc"),

  // --- Broward ---
  /* Fort Lauderdale nonprofit investigative newsroom. Low cadence (five items
     span ~19 days) and robots.txt asks for a 10 s crawl delay. */
  o("floridabulldog.org", "Florida Bulldog", "12011", "https://www.floridabulldog.org/feed/"),
  /* Black weekly, Fort Lauderdale, founded 1971. Newest item was 7.6 days old
     at verification — a weekly's normal cadence, but over the corpus's 7-day
     threshold by half a day. Included; founder may veto. */
  o("thewestsidegazette.com", "The Westside Gazette", "12011", "https://thewestsidegazette.com/feed/"),
  o("sfltimes.com", "South Florida Times", "12011", "https://www.sfltimes.com/feed"),
  o(
    "sun-sentinel.com",
    "South Florida Sun Sentinel",
    "12011",
    null, // /feed/ (advertised on the homepage) returns HTTP 403 to the sweep UA, a browser UA, and Firecrawl's stealth proxy 2026-09-17 — a WAF, not a path problem.
    //       BUT /sitemap.xml?yyyy=&mm=&dd= (Google News sitemap: title + publication_date, ~115 URLs/day) is OPEN to the sweep UA. Needs retrieval mode 2 (PRD §5) in the runner.
    "Mild disagreement: AllSides Center (low confidence, Apr 2026); MBFC Least Biased (High); Ad Fontes Lean Left per Ground News. " +
      "Corpus 2026-09-17 proposes center. Founder decides.",
  ),
  o("outsfl.com", "OutSFL", "12011", null), // every feed path redirects to the HTML homepage 2026-09-17; no feed advertised.

  // --- Hillsborough ---
  /* The news-section feed is the only one deep enough to cover a 14-day
     window (100 items, ~25 days); the site-wide Arc feed holds ~2.4 days. */
  o(
    "tampabay.com",
    "Tampa Bay Times",
    "12057",
    "https://www.tampabay.com/arc/outboundfeeds/rss/category/news/?outputType=xml",
    "Single rater: AllSides Center (low confidence, Aug 2026). No corroboration found. Corpus 2026-09-17 proposes center. Founder decides.",
  ),
  o("wusf.org", "WUSF", "12057", "https://www.wusf.org/news.rss"),
  o("wfla.com", "WFLA News Channel 8", "12057", "https://www.wfla.com/news/florida/feed/"),
  o("wtsp.com", "10 Tampa Bay", "12057", "https://www.wtsp.com/feeds/syndication/rss/news"),
  o("cltampa.com", "Creative Loafing Tampa Bay", "12057", "https://www.cltampa.com/feed/?partner-feed=all"),

  // --- Orange ---
  /* Brightspot section feeds are shallow; politics.rss (12 items, ~10 days)
     is the deepest live ARTICLE feed. The "Engage" podcast RSS the corpus
     verified is episodes, not articles, so it is not used. */
  o("cfpublic.org", "Central Florida Public Media", "12095", "https://www.cfpublic.org/politics.rss"),
  o("wftv.com", "WFTV Channel 9", "12095", "https://www.wftv.com/arc/outboundfeeds/rss/?outputType=xml"),
  o("wesh.com", "WESH 2 News", "12095", "https://www.wesh.com/topstories-rss"),
  o("orlandoweekly.com", "Orlando Weekly", "12095", "https://www.orlandoweekly.com/feed/?partner-feed=all"),
  /* Added 2026-09-17 on the corpus's recommendation once the feed verified. */
  o("clickorlando.com", "WKMG News 6", "12095", "https://www.clickorlando.com/arc/outboundfeeds/rss/?outputType=xml"),
  /* Added 2026-09-17. Studios are in Lake Mary (Seminole), like WTSP's are in
     St. Petersburg (Pinellas): placed by market, consistent with those rows. */
  o("fox35orlando.com", "FOX 35 Orlando", "12095", "https://www.fox35orlando.com/rss/category/news"),
  o(
    "orlandosentinel.com",
    "Orlando Sentinel",
    "12095",
    null, // same Tribune/Alden WAF as the Sun Sentinel: HTTP 403 to every UA 2026-09-17 (Firecrawl declines the site entirely).
    //       Same open per-day Google News sitemap as the Sun Sentinel (~130 URLs/day). Needs retrieval mode 2 in the runner.
    "Raters disagree: MBFC Left-Center (-2.8, High); Ad Fontes Skews Left/Reliable; AllSides Center (low confidence, Aug 2026). " +
      "Corpus 2026-09-17 proposes center-left. Founder decides.",
  ),

  // --- Statewide ---
  o("floridaphoenix.com", "Florida Phoenix", null, "https://floridaphoenix.com/feed/",
    "No outlet-specific rating captured; part of the States Newsroom network. Corpus 2026-09-17 proposes center-left without a citation. Founder decides."),
  /* BLOX/TownNews search feed. Verified once; the platform rate-limits
     aggressively (HTTP 429 on back-to-back requests), so fetch it once per
     sweep and never retry inside a run. */
  o("newsserviceflorida.com", "News Service of Florida", null, "https://www.newsserviceflorida.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc"),
  /* The corpus's podcast path last updated in 2022; the state-news section
     feed is live. */
  o("wfsu.org", "WFSU Public Media", null, "https://news.wfsu.org/state-news.rss"),
  /* Highest-volume political outlet in the state and the shallowest feed: ten
     items covering ~five hours. WordPress `?paged=N` works here — see the
     verification doc for the depth finding. */
  o("floridapolitics.com", "Florida Politics", null, "https://floridapolitics.com/feed/"),
  o("floridadaily.com", "Florida Daily", null, "https://floridadaily.com/feed/"),
  o("flvoicenews.com", "Florida's Voice", null, "https://flvoicenews.com/feed/"), // apex host only; www. returns 403.
  o("floridianpress.com", "The Floridian", null, "https://floridianpress.com/feed/"), // robots.txt asks for a 600 s crawl delay.
  o("apnews.com", "The Associated Press", null, null), // no public RSS; robots.txt disallows /*.rss; hub pages 403 2026-09-17. Sitemap only.
]);

function o(
  domain: string,
  publisher: string,
  countyFips: string | null,
  feed: string | null,
  leanBasis: string = UNRATED,
): Outlet {
  return {
    domain,
    publisher,
    type: "factual_reporting",
    countyFips,
    leanTag: null,
    leanBasis,
    feed,
  };
}

/* Same posture as Allowlist A/B: a shortener is blocked outright and a
   redirect is never followed, so an off-list domain cannot smuggle itself in
   behind a t.co link. */
const SHORTENERS: ReadonlySet<string> = new Set([
  "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "buff.ly",
  "is.gd", "rb.gy", "lnkd.in", "rebrand.ly", "cutt.ly", "shorturl.at",
]);

/** Exact host or label-boundary subdomain — `www.x.com` matches `x.com`,
    `x.com.evil.com` does not. Copied in behaviour from allowlist_b_core. */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

/** Does `url` belong to this specific outlet? Fail-closed: anything that does
    not positively match is not ours, and is dropped.

    This is the one home for the matching rule. `sweep()` takes it as an
    argument rather than importing it — the same injectable-dependency shape
    the runtime's `LiveAnthropicBackend` uses for `dispatch`, and here it also
    keeps news-sweep.ts free of value imports so a plain `node` script can run
    it without a build step. */
export function urlBelongsTo(url: string, outlet: Outlet): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.replace(/\.$/, "").toLowerCase();
  if (!host || SHORTENERS.has(host)) return false;

  /* A few entries are path-scoped (a network's local edition lives under a
     path, not a subdomain), so match the path prefix too when one is given. */
  const slash = outlet.domain.indexOf("/");
  if (slash === -1) return hostMatches(host, outlet.domain);
  const dHost = outlet.domain.slice(0, slash);
  const dPath = outlet.domain.slice(slash);
  return (
    hostMatches(host, dHost) &&
    (parsed.pathname === dPath || parsed.pathname.startsWith(dPath + "/"))
  );
}

/** The outlet that published `url`, or null — for callers that have a URL and
    no outlet in hand (§6's matcher will want this). */
export function outletForUrl(url: string, outlets: readonly Outlet[] = OUTLETS): Outlet | null {
  return outlets.find((o) => urlBelongsTo(url, o)) ?? null;
}

/** Outlets the sweep may actually read: both founder gates filled in. */
export function usableOutlets(outlets: readonly Outlet[] = OUTLETS): Outlet[] {
  return outlets.filter((x) => x.leanTag !== null && x.feed !== null);
}
