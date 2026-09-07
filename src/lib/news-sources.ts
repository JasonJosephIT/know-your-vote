/* The news-intake corpus — candidate-news-PRD.md §5 (task C7).

   R1 stops asking a search engine about each candidate and instead sweeps a
   fixed list of outlets, then matches what it finds against the roster. The
   list below IS the editorial decision, which is why it lives in the repo:
   reviewable, diffable, blameable. Changes land by PR with a stated reason —
   the same discipline Allowlist B has (`Agents/The Fact-Checker/
   allowlist_b_core.py`), and the host-matching rule here is deliberately the
   same one, so the two allowlists cannot disagree about what a domain is.

   Two fields are FOUNDER GATES and ship null on purpose:

     leanTag  — assigning a lean to a named news organisation is an editorial
                act with a real reputational cost for a nonpartisan product.
                It is not something a coding agent should assert from memory.
                Null until a human fills it in from a stated basis.
     feed     — a feed URL that 404s fails silently and looks exactly like
                "no news this week". Null until someone has actually fetched
                it. (The session that wrote this file had no network egress
                and could not, so it guessed nothing.)

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

const UNRATED =
  "Unrated. Settle from a published nonpartisan media-bias rating, cited in the PR that fills this in.";

/* Four covered counties (src/lib/resolve.ts COVERED_COUNTIES) plus statewide.
   A broadcaster's countyFips is its newsroom base, not its signal footprint —
   several of these cover two counties, and a story that names a candidate is
   scoped by that candidate's race anyway (§6). */
export const OUTLETS: readonly Outlet[] = Object.freeze([
  // --- Miami-Dade ---
  o("miamiherald.com", "Miami Herald", "12086"),
  o("wlrn.org", "WLRN", "12086"),
  o("local10.com", "WPLG Local 10", "12086"),
  o("wsvn.com", "WSVN 7News", "12086"),
  o("nbcmiami.com", "NBC6 South Florida", "12086"),
  o("miaminewtimes.com", "Miami New Times", "12086"),

  // --- Broward ---
  o("sun-sentinel.com", "South Florida Sun Sentinel", "12011"),
  o("cbsnews.com/miami", "CBS News Miami", "12011"),

  // --- Hillsborough ---
  o("tampabay.com", "Tampa Bay Times", "12057"),
  o("wusf.org", "WUSF", "12057"),
  o("wfla.com", "WFLA News Channel 8", "12057"),
  o("wtsp.com", "10 Tampa Bay", "12057"),
  o("cltampa.com", "Creative Loafing Tampa Bay", "12057"),

  // --- Orange ---
  o("orlandosentinel.com", "Orlando Sentinel", "12095"),
  o("cfpublic.org", "Central Florida Public Media", "12095"),
  o("wftv.com", "WFTV Channel 9", "12095"),
  o("wesh.com", "WESH 2 News", "12095"),
  o("orlandoweekly.com", "Orlando Weekly", "12095"),

  // --- Statewide ---
  o("floridaphoenix.com", "Florida Phoenix", null),
  o("newsserviceflorida.com", "News Service of Florida", null),
  o("wfsu.org", "WFSU Public Media", null),
  o("floridapolitics.com", "Florida Politics", null),
  o("apnews.com", "The Associated Press", null),
]);

function o(domain: string, publisher: string, countyFips: string | null): Outlet {
  return {
    domain,
    publisher,
    type: "factual_reporting",
    countyFips,
    leanTag: null,
    leanBasis: UNRATED,
    feed: null,
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
