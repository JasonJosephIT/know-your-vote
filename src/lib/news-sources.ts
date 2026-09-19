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
                Null until a human fills it in from a stated basis. Five rows
                (the four legacy dailies and AP) now cite rating pages fetched
                on 2026-09-19 with a value, a confidence level or score where
                the rater publishes one, a URL and the access date; see
                docs/general-election/lean-ratings-fetched-2026-09-19.md.
                Florida Phoenix carries a network note with no outlet-specific
                rating. The remaining 31 rows carry `UNRATED` below and are NOT
                a backlog — see that report on why AllSides / Ad Fontes / MBFC
                do not rate a community weekly or a local broadcaster. The
                `unrated` lean value those rows need now EXISTS (migration 0027,
                src/lib/news-labels.ts rule 3) and renders as "No independent
                rating"; assigning it to a row is still this gate, and nothing
                here assigns it yet.
     feed     — a feed URL that 404s fails silently and looks exactly like
                "no news this week". Every non-null value below was fetched on
                2026-09-17 with the sweep's own user agent, parsed with
                src/lib/news-sweep.ts, and had an item dated within the last
                week (one weekly's 7.6-day exception is noted inline;
                docs/general-election/news-corpus-verification-2026-09-17.md
                has the per-URL evidence). Null means it was TRIED and failed;
                the inline comment says how. Two rows have no feed but a `sitemap` (retrieval mode 2); that counts as a retrieval path for `usableOutlets()`.

   Two row flags are FAIL-CLOSED and are not the founder's to lift by edit:

     mixedFeed  — the outlet's only feed carries commentary alongside
                  reporting. Signing off a lean would render opinion pieces
                  as "Reporting" (news-fairness.md §1). Lifted when the
                  runner splits items on the feed's <category>.
     syndicated — the feed is mostly republished copy from other outlets.
                  Signing off a lean would stamp this outlet's lean on
                  another outlet's journalism. Lifted when the runner reads
                  <dc:creator> / a byline and drops or re-attributes.

   `usableOutlets()` skips any entry missing a gate or carrying a flag. An
   empty result means the sweep does nothing and says so — never a silent
   success.

   ATTRIBUTION OWED. Several `leanBasis` values below carry AllSides Media
   Bias Ratings. The AllSides chart is Creative Commons BY-NC 4.0, and
   CAP_Change_Spec_Stances_and_RelatedNews_v1.md §7 requires a line such as
   "Source credibility ratings via AllSides (CC BY-NC 4.0)." wherever that
   data renders. Nothing in the app reads `leanBasis` today, so nothing is
   owed yet; the obligation attaches the moment a lean or its basis reaches a
   card. Where that line sits in the UI is open (spec §12 item 4).

   Pure and dependency-free; scripts/verify-news-sweep.ts drives it. */

import type { LeanTag, SourceType } from "./news-labels";

/** What the host's robots.txt said on 2026-09-17. The sweep's own UA
    (`KnowYourVote/1.0`) falls under `User-agent: *`, which permits every
    feed path used here; this field exists so the founder sees the
    publisher's stated stance on AI crawlers at the row they are signing
    off, not buried in a doc. */
export interface OutletRobots {
  /** AI / LLM user agents the host disallows by name. */
  aiDisallow?: readonly string[];
  /** `Crawl-delay` under `User-agent: *`, in seconds. */
  crawlDelaySec?: number;
  note?: string;
}

/** Retrieval mode 2 (PRD §5): a per-day Google News sitemap, for an outlet
    whose RSS is blocked but whose sitemap is open. Both Tribune dailies. */
export interface OutletSitemap {
  /** URL template; `{yyyy}` `{mm}` `{dd}` are filled in UTC by `sitemapUrlFor`. */
  daily: string;
  /** Tested against each entry's URL path. Non-matching entries never enter
      the pool. This is the editorial line for "what is an article here". */
  include: RegExp;
}

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
  /** See the header. Fail-closed; not lifted by editing this file. */
  mixedFeed?: boolean;
  /** See the header. Fail-closed; not lifted by editing this file. */
  syndicated?: boolean;
  robots?: OutletRobots;
  /** Set only when `feed` is null. See `OutletSitemap`. */
  sitemap?: OutletSitemap;
}

/* The corpus cited AllSides, Ad Fontes and Media Bias/Fact Check ratings only
   for the four legacy dailies, and noted that ratings exist for AP. For every
   other outlet it recorded "no independent rating found", never a reasoned
   value. This text is exported so the guardrail can tell a default basis from
   a cited one. */
export const UNRATED =
  "No independent bias rating cited in the 2026-09-17 corpus (which searched AllSides / Ad Fontes / MBFC). " +
  "Settle from a published nonpartisan rating cited in the PR that fills this in, or the founder signs off an explicit 'no rating' designation.";

interface RowOptions {
  leanBasis?: string;
  mixedFeed?: boolean;
  syndicated?: boolean;
  robots?: OutletRobots;
  sitemap?: OutletSitemap;
}

/* Tribune Publishing sites: RSS is WAF-blocked to every UA; the per-day
   Google News sitemap is open. News articles live under a dated path;
   obituaries (the only other shape seen) do not, so the dated-path filter is
   the founder-chosen boundary (spec 2026-09-18). */
const TRIBUNE_DATED_PATH = /^\/\d{4}\/\d{2}\/\d{2}\//;
const tribuneSitemap = (host: string): OutletSitemap => ({
  daily: `https://${host}/sitemap.xml?yyyy={yyyy}&mm={mm}&dd={dd}`,
  include: TRIBUNE_DATED_PATH,
});

/* Four covered counties (src/lib/resolve.ts COVERED_COUNTIES) plus statewide.
   A broadcaster's countyFips is its newsroom base, not its signal footprint —
   several of these cover two counties, and a story that names a candidate is
   scoped by that candidate's race anyway (§6).

   Ordering inside a county is by verified feed first, then the nulls, so the
   gaps read at a glance. */
export const OUTLETS: readonly Outlet[] = Object.freeze([
  // --- Miami-Dade ---
  o("wlrn.org", "WLRN", "12086", "https://www.wlrn.org/tags/news.rss"),
  o("local10.com", "WPLG Local 10", "12086", "https://www.local10.com/arc/outboundfeeds/rss/?outputType=xml", {
    robots: { aiDisallow: ["GPTBot"] },
  }),
  o("wsvn.com", "WSVN 7News", "12086", "https://wsvn.com/news/feed/"),
  o("nbcmiami.com", "NBC6 South Florida", "12086", "https://www.nbcmiami.com/?rss=y"),
  o("miaminewtimes.com", "Miami New Times", "12086", "https://www.miaminewtimes.com/feed/", {
    robots: {
      aiDisallow: ["GPTBot", "anthropic-ai", "ClaudeBot", "Claude-Web", "Claude-User", "Google-Extended", "PerplexityBot", "CCBot", "cohere-ai"],
      note: "One grouped block of ~35 AI/scraper agents ending in Disallow: /.",
    },
  }),
  /* WFOR's studios are on NW 18th Terrace in Doral (Miami-Dade), so this moves
     here from Broward, where the first draft had it. Broward loses its only
     television entry as a result — see the verification doc. Under the
     "placement by market" reading used for FOX 35 below, WFOR also serves
     Broward and this move is a choice; the founder should pick one rule. */
  o("cbsnews.com/miami", "CBS News Miami", "12086", "https://www.cbsnews.com/miami/latest/rss/main", {
    robots: { aiDisallow: ["GPTBot"] },
  }),
  /* Spanish-language daily. The Florida section feed is live; the site-wide
     /rss/home.xml last updated in 2019. */
  o("diariolasamericas.com", "Diario Las Américas", "12086", "https://www.diariolasamericas.com/rss/pages/florida.xml"),
  /* Spanish-language TV (Canal 41). Same CMS as Diario Las Américas; the
     feed index at /contenidos/rss.html lists section feeds (found via
     Firecrawl site map, then verified with the sweep UA). The Miami section
     is the local one; /rss/pages/opinion.xml exists but was 23 days stale. */
  o("americateve.com", "América TeVé", "12086", "https://www.americateve.com/rss/pages/miami.xml"),
  /* Bilingual English/French Haitian-diaspora biweekly, North Miami. Runs
     clearly labelled political advertisements — a reviewer should know. */
  o("lefloridien.com", "Le Floridien", "12086", "https://lefloridien.com/feed/"),
  /* Black-owned weekly, founded 1923. BLOX/TownNews search feed — same
     platform and same rate-limit caveat as News Service of Florida below.
     FLAGGED `syndicated`: the 25-item sample was mostly Florida Politics,
     Florida Phoenix, AP and press-release wire copy, with the origin in
     <dc:creator>. See the header. */
  o("miamitimesonline.com", "The Miami Times", "12086", "https://www.miamitimesonline.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc", {
    syndicated: true,
  }),
  o("miamiherald.com", "Miami Herald", "12086",
    null, // Arc RSS path is a real 404 (confirmed via Firecrawl); every other path timed out for the sweep UA. No RSS 2026-09-17 — sitemap only.
    {
      leanBasis:
        "Rating pages fetched 2026-09-19. Raters disagree. " +
        "AllSides: Lean Left, bias meter -2.00, low or initial confidence as of Sep 2026 " +
        "(allsides.com/news-source/miami-herald-media-bias). " +
        "MBFC: Left-Center, score -3.4, factual High, last updated 2025-03-25; its entry records Democratic presidential endorsements since 2000 " +
        "(mediabiasfactcheck.com/miami-herald). " +
        "Ad Fontes: Skews Left, bias -8.01, reliability 39.10 (scales -42..+42 and 0..64), no rating date published " +
        "(adfontesmedia.com/miami-herald-bias-and-reliability). " +
        "The 2026-09-17 corpus recorded Ad Fontes as Middle/Reliable; this fetch does not confirm that. " +
        "Corpus proposed center-left. Founder decides.",
    }),
  /* McClatchy eliminated el Nuevo Herald's entire writing staff on 2026-09-10
     (AP via WLRN). Kept for auditability; expect near-zero original output. */
  o("elnuevoherald.com", "el Nuevo Herald", "12086", null), // same McClatchy CMS as the Herald; Arc RSS path is a real 404 (Firecrawl), sweep UA times out. 2026-09-17.
  /* NOT LISTED, on purpose — The Haitian Times (haitiantimes.com). Its feed
     verifies (10 items, 0.3 d) but the newsroom is in Brooklyn and the feed
     is mostly non-Florida; a Miami-Dade countyFips would fill that county's
     feed (§7) with New York stories, and null would call it a Florida
     statewide outlet. Founder call, per the corpus. Add it here by PR. */

  // --- Broward ---
  /* Fort Lauderdale nonprofit investigative newsroom. Low cadence (five items
     span ~19 days). */
  o("floridabulldog.org", "Florida Bulldog", "12011", "https://www.floridabulldog.org/feed/", {
    robots: { crawlDelaySec: 10 },
  }),
  /* Black weekly, Fort Lauderdale, founded 1971. Newest item was 7.6 days old
     at verification — a weekly's normal cadence, but over the corpus's 7-day
     threshold by half a day. Included; founder may veto. */
  o("thewestsidegazette.com", "The Westside Gazette", "12011", "https://thewestsidegazette.com/feed/"),
  o("sfltimes.com", "South Florida Times", "12011", "https://www.sfltimes.com/feed"),
  o("sun-sentinel.com", "South Florida Sun Sentinel", "12011",
    null, // /feed/ (advertised on the homepage) returns HTTP 403 to the sweep UA, a browser UA, and Firecrawl's stealth proxy 2026-09-17 — a WAF, not a path problem.
    //       Read via its per-day Google News sitemap instead (retrieval mode 2) — see `sitemap` below.
    {
      leanBasis:
        "Rating pages fetched 2026-09-19. All three raters place it at or near the centre. " +
        "AllSides: Center, low or initial confidence as of Sep 2026, no numeric meter value published " +
        "(allsides.com/news-source/sun-sentinel-media-bias). " +
        "MBFC: Least Biased, no numeric score published, factual High, last updated 2023-07-31 " +
        "(mediabiasfactcheck.com/south-florida-sun-sentinel). " +
        "Ad Fontes, FIRST-HAND this time: Middle, bias -5.87, reliability 44.04, no rating date published " +
        "(adfontesmedia.com/sun-sentinel-bias-and-reliability). " +
        "That replaces the corpus's second-hand \"Ad Fontes Lean Left per Ground News\", which Ad Fontes itself does not corroborate. " +
        "Corpus proposed center. Founder decides.",
      robots: { aiDisallow: ["anthropic-ai", "ClaudeBot", "GPTBot", "CCBot", "Google-Extended", "PerplexityBot", "Applebot-Extended", "Bytespider"] },
      sitemap: tribuneSitemap("www.sun-sentinel.com"),
    }),
  o("outsfl.com", "OutSFL", "12011", null), // every feed path redirects to the HTML homepage 2026-09-17; no feed advertised; Firecrawl site map finds none.

  // --- Hillsborough ---
  /* The news-section feed is the only one deep enough to cover a 14-day
     window (100 items, ~25 days); the site-wide Arc feed holds ~2.4 days. */
  o("tampabay.com", "Tampa Bay Times", "12057", "https://www.tampabay.com/arc/outboundfeeds/rss/category/news/?outputType=xml", {
    leanBasis:
      "Rating pages fetched 2026-09-19. Not a single-rater row — the corpus recorded AllSides only, and the other two raters both carry entries. " +
      "AllSides: Center, low or initial confidence as of Sep 2026, no numeric meter value published " +
      "(allsides.com/news-source/tampa-bay-times-media-bias). " +
      "MBFC: Left-Center, score -3.4, factual High, last updated 2025-05-27 " +
      "(mediabiasfactcheck.com/tampa-bay-times). " +
      "Ad Fontes: Middle, bias -3.28, reliability 45.56, no rating date published " +
      "(adfontesmedia.com/tampa-bay-times-bias-and-reliability). " +
      "Corpus proposed center. Founder decides.",
    robots: { aiDisallow: ["GPTBot", "anthropic-ai", "ClaudeBot", "CCBot", "Bytespider"], note: "Google-Extended explicitly allowed." },
  }),
  o("wusf.org", "WUSF", "12057", "https://www.wusf.org/news.rss"),
  o("wfla.com", "WFLA News Channel 8", "12057", "https://www.wfla.com/news/florida/feed/", {
    robots: { aiDisallow: ["GPTBot", "anthropic-ai", "ClaudeBot", "CCBot", "Google-Extended", "PerplexityBot", "Applebot-Extended", "Bytespider"] },
  }),
  o("wtsp.com", "10 Tampa Bay", "12057", "https://www.wtsp.com/feeds/syndication/rss/news"),
  o("cltampa.com", "Creative Loafing Tampa Bay", "12057", "https://www.cltampa.com/feed/?partner-feed=all"),

  // --- Orange ---
  /* Brightspot section feeds are shallow; politics.rss (12 items, ~10 days)
     is the deepest live ARTICLE feed. The "Engage" podcast RSS the corpus
     verified is episodes, not articles, so it is not used. */
  o("cfpublic.org", "Central Florida Public Media", "12095", "https://www.cfpublic.org/politics.rss"),
  o("wftv.com", "WFTV Channel 9", "12095", "https://www.wftv.com/arc/outboundfeeds/rss/?outputType=xml"),
  /* Hearst. The robots.txt header states Hearst's terms prohibit any robot,
     crawler or aggregation tool on the site — a stance broader than the
     rules below it. Founder policy item. */
  o("wesh.com", "WESH 2 News", "12095", "https://www.wesh.com/topstories-rss", {
    robots: {
      aiDisallow: ["GPTBot", "anthropic-ai", "ClaudeBot", "Claude-Web", "CCBot", "Google-Extended", "PerplexityBot", "Applebot-Extended", "Bytespider", "cohere-ai"],
      crawlDelaySec: 10,
      note: "Hearst terms in the robots.txt header prohibit crawlers and aggregation outright.",
    },
  }),
  o("orlandoweekly.com", "Orlando Weekly", "12095", "https://www.orlandoweekly.com/feed/?partner-feed=all"),
  /* Added 2026-09-17 on the corpus's recommendation once the feed verified. */
  o("clickorlando.com", "WKMG News 6", "12095", "https://www.clickorlando.com/arc/outboundfeeds/rss/?outputType=xml", {
    robots: { aiDisallow: ["GPTBot", "Bytespider"] },
  }),
  /* Added 2026-09-17. Studios are in Lake Mary (Seminole), like WTSP's are in
     St. Petersburg (Pinellas): placed by market, consistent with those rows.
     Note the corpus rejected Bay News 9 on the OPPOSITE rule (base county,
     Pinellas). The list is inconsistent on this and the founder should pick
     one reading before more broadcasters are added. */
  o("fox35orlando.com", "FOX 35 Orlando", "12095", "https://www.fox35orlando.com/rss/category/news", {
    robots: { aiDisallow: ["GPTBot"] },
  }),
  o("orlandosentinel.com", "Orlando Sentinel", "12095",
    null, // same Tribune/Alden WAF as the Sun Sentinel: HTTP 403 to every UA 2026-09-17 (Firecrawl declines the site entirely).
    //       Read via its per-day Google News sitemap instead (retrieval mode 2) — see `sitemap` below.
    {
      leanBasis:
        "Rating pages fetched 2026-09-19. Raters disagree. " +
        "AllSides: Center, low or initial confidence as of Sep 2026, no numeric meter value and no review method listed " +
        "(allsides.com/news-source/orlando-sentinel-media-bias). " +
        "MBFC: Left-Center, score -2.8, factual High, last updated 2025-04-25 " +
        "(mediabiasfactcheck.com/orlando-sentinel). " +
        "Ad Fontes: Skews Left, bias -6.70, reliability 44.94, no rating date published " +
        "(adfontesmedia.com/orlando-sentinel-bias-and-reliability). " +
        "Corpus proposed center-left. Founder decides.",
      robots: { aiDisallow: ["anthropic-ai", "ClaudeBot", "GPTBot", "CCBot", "Google-Extended", "PerplexityBot", "Applebot-Extended", "Bytespider"] },
      sitemap: tribuneSitemap("www.orlandosentinel.com"),
    }),

  // --- Statewide ---
  /* FLAGGED `mixedFeed`: the corpus records that this one feed carries the
     Phoenix's commentary as well as its reporting, and the site has a
     /category/commentary/ section whose own feed 403s. See the header. */
  o("floridaphoenix.com", "Florida Phoenix", null, "https://floridaphoenix.com/feed/", {
    leanBasis: "No outlet-specific rating captured; part of the States Newsroom network. Corpus 2026-09-17 proposes center-left without a citation. Founder decides.",
    mixedFeed: true,
    robots: { aiDisallow: ["GPTBot", "anthropic-ai", "ClaudeBot", "Claude-Web", "CCBot", "Google-Extended", "PerplexityBot", "Applebot-Extended", "Bytespider", "cohere-ai"] },
  }),
  /* BLOX/TownNews search feed. Verified once; the platform rate-limits per IP
     burst (HTTP 429 after two or three quick requests), so fetch it once per
     sweep and never retry inside a run. */
  o("newsserviceflorida.com", "News Service of Florida", null, "https://www.newsserviceflorida.com/search/?f=rss&t=article&l=25&s=start_time&sd=desc"),
  /* The corpus's podcast path last updated in 2022; the state-news section
     feed is live. */
  o("wfsu.org", "WFSU Public Media", null, "https://news.wfsu.org/state-news.rss"),
  /* Highest-volume political outlet in the state and the shallowest feed: ten
     items covering ~five hours. WordPress `?paged=N` works here — see the
     verification doc for the depth finding.
     FLAGGED `mixedFeed`: the main feed carries an "Emails & Opinions"
     category and "Guest Author" bylines alongside reporting (3 of 10 items
     on 2026-09-17); the opinion category's own feed 404s. See the header. */
  o("floridapolitics.com", "Florida Politics", null, "https://floridapolitics.com/feed/", { mixedFeed: true }),
  o("floridadaily.com", "Florida Daily", null, "https://floridadaily.com/feed/"),
  o("flvoicenews.com", "Florida's Voice", null, "https://flvoicenews.com/feed/", {
    // apex host only; www. returns 403.
    robots: { note: "robots.txt itself returns 403; policy unknown." },
  }),
  o("floridianpress.com", "The Floridian", null, "https://floridianpress.com/feed/", {
    robots: { crawlDelaySec: 600 },
  }),
  o("apnews.com", "The Associated Press", null,
    null, // no public RSS; robots.txt disallows /*.rss; hub pages 403 to the sweep UA 2026-09-17. HTML listing (retrieval mode 3) only.
    {
      leanBasis:
        "Rating pages fetched 2026-09-19, closing the corpus's \"rating exists; not fetched\" note for this row. " +
        "AllSides: Lean Left, bias meter -2.93, medium confidence as of Sep 2026 " +
        "(allsides.com/news-source/associated-press-media-bias). " +
        "MBFC: Left-Center, score -2.1, factual High, last updated 2026-04-09 " +
        "(mediabiasfactcheck.com/associated-press). " +
        "Ad Fontes: Middle, bias -2.60, reliability 44.29, no rating date published " +
        "(adfontesmedia.com/ap-bias-and-reliability). " +
        "The corpus proposed center pending this fetch; AllSides rates it Lean Left, so the proposal is not confirmed. Founder confirms.",
      robots: { note: "Disallows /*.rss for all agents." },
    }),
]);

function o(
  domain: string,
  publisher: string,
  countyFips: string | null,
  feed: string | null,
  opts: RowOptions = {},
): Outlet {
  const row: Outlet = {
    domain,
    publisher,
    type: "factual_reporting",
    countyFips,
    leanTag: null,
    leanBasis: opts.leanBasis ?? UNRATED,
    feed,
  };
  if (opts.mixedFeed) row.mixedFeed = true;
  if (opts.syndicated) row.syndicated = true;
  if (opts.robots) row.robots = opts.robots;
  if (opts.sitemap) row.sitemap = opts.sitemap;
  return row;
}

/** Fill a sitemap template for one UTC day. Pure; the runner and the
    guardrail both use it so they cannot disagree on the date format. */
export function sitemapUrlFor(template: string, day: Date): string {
  const yyyy = String(day.getUTCFullYear());
  const mm = String(day.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(day.getUTCDate()).padStart(2, "0");
  return template.replaceAll("{yyyy}", yyyy).replaceAll("{mm}", mm).replaceAll("{dd}", dd);
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

/** Outlets the sweep may actually read: lean signed off, a retrieval path
    (RSS feed or news sitemap), and no fail-closed flag.

    `leanTag: 'unrated'` counts as signed off, deliberately — that is the whole
    point of the value (migration 0027). It is not a hole in the gate: null
    means "no human has decided", while `'unrated'` is a human recording that no
    rating agency covers this outlet, and the card says so in those words. An
    agent still cannot produce it, because an agent does not edit `leanTag`. */
export function usableOutlets(outlets: readonly Outlet[] = OUTLETS): Outlet[] {
  return outlets.filter(
    (x) =>
      x.leanTag !== null &&
      (x.feed !== null || x.sitemap !== undefined) &&
      !x.mixedFeed &&
      !x.syndicated,
  );
}
