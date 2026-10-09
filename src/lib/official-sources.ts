/* The official-source list: the government bodies whose own pages count as
   primary documents for an election notice. The counterpart of OUTLETS in
   news-sources.ts (spec docs/superpowers/specs/2026-10-08-news-source-integrity-design.md
   §3.2.1, decision D6, with the agent-retrofit spec's four changes, §3.4).

   THE LIST IS AN EDITORIAL DECISION, so it changes only by PR, like OUTLETS.
   Each entry is the body that issues the notice: the Division of Elections, a
   county Supervisor of Elections, the Legislature, a court.

   Left off on purpose (D6, Recommended pending founder confirmation):
   courtlistener.com (the Free Law Project's archive, not the court),
   congress.gov, the Governor's site (it also carries political releases) and
   R3's old Tier 2 (AP, Ballotpedia, VoteSmart, PolitiFact, FactCheck.org,
   OpenSecrets). TO FLIP: add or drop an entry here, by PR.

   WHERE AN OFFICIAL SOURCE APPLIES (D7). Only from a given `official:<domain>`
   id, only on an election_news item that names no candidate and no race, and
   only when the story's URL is on that entry (planSourceAttribution in
   news-enqueue.ts). Never by host alone: an incumbent's release on a .gov
   host would otherwise print "Official document", which a challenger's
   release cannot get.

   Matching is urlBelongsTo from news-sources.ts: the exact host or a
   label-boundary subdomain, plus a path prefix for a path-scoped entry. When
   two entries match one URL the longest `domain` wins, so the more specific
   entry decides.

   Two consequences, both by design:
     - A path-scoped entry's host matches its subdomains too, as every
       entry's does: `dos.fl.gov/elections` takes
       https://files.dos.fl.gov/elections/x. Longest-domain-wins still gives
       constitutionalinitiatives.dos.fl.gov its own entry.
     - The path is matched in any letter case (officialForUrl lowercases it
       first): dos.fl.gov and miamidade.gov serve /Elections and /elections
       alike (checked 2026-10-08), so a capitalised link is not refused.
       Outlet matching (outletForUrl) is unchanged.

   Relative imports with the extension: plain-Node scripts import this. */

import type { LeanTag, SourceType } from "./news-labels.ts";
import { urlBelongsTo } from "./news-sources.ts";
import { supervisorSite } from "./supervisors.ts";

export interface OfficialSource {
  /** Registrable host, or host plus path for a path-scoped entry. */
  domain: string;
  /** Goes into `source.publisher` verbatim. */
  publisher: string;
  /** The county the body serves; null for a statewide body. */
  countyFips: string | null;
}

/** A covered county's Supervisor host, from supervisors.ts, without `www.`. */
function supervisorHost(countyFips: string): string {
  const site = supervisorSite(countyFips);
  if (!site) throw new Error(`official-sources: no Supervisor site for county ${countyFips}`);
  return new URL(site).hostname.replace(/^www\./, "");
}

const DIVISION = "Florida Dept. of State, Division of Elections";
const DEPARTMENT = "Florida Dept. of State";
const HOUSE = "Florida House of Representatives";
const MIAMI_DADE_SOE = "Miami-Dade County Supervisor of Elections";
const ORANGE_SOE = "Orange County Supervisor of Elections";

/* Seventeen entries. Publisher strings are the ones migrations 0014 and 0042
   write for the same body ("Florida Senate", the Division's string, the
   Broward and Hillsborough Supervisors). */
export const OFFICIAL_SOURCES: readonly OfficialSource[] = Object.freeze([
  // --- Statewide ---
  /* Path-scoped so the rest of the Department of State is not labelled
     Elections (retrofit change 2). */
  { domain: "dos.fl.gov/elections", publisher: DIVISION, countyFips: null },
  /* The Division's candidate and Supervisor directories (change 2). */
  { domain: "dos.elections.myflorida.com", publisher: DIVISION, countyFips: null },
  /* The Division's amendment database (change 2). */
  { domain: "constitutionalinitiatives.dos.fl.gov", publisher: DIVISION, countyFips: null },
  /* The Department's file server, which serves the amendment booklet. */
  { domain: "files.floridados.gov", publisher: DEPARTMENT, countyFips: null },
  /* The registration portal. */
  { domain: "registertovoteflorida.gov", publisher: DEPARTMENT, countyFips: null },
  { domain: "flsenate.gov", publisher: "Florida Senate", countyFips: null },
  { domain: "myfloridahouse.gov", publisher: HOUSE, countyFips: null },
  /* Both live House source rows are on www.flhouse.gov (change 3). */
  { domain: "flhouse.gov", publisher: HOUSE, countyFips: null },
  { domain: "leg.state.fl.us", publisher: "Florida Legislature", countyFips: null },
  /* Rulings on covered races, on the court's own host (change 4). */
  { domain: "flcourts.gov", publisher: "Florida State Courts", countyFips: null },
  { domain: "uscourts.gov", publisher: "U.S. Courts", countyFips: null },
  // --- Covered counties: each Supervisor's site from supervisors.ts ---
  { domain: supervisorHost("12086"), publisher: MIAMI_DADE_SOE, countyFips: "12086" },
  /* The Division's directory address for Miami-Dade (change 1). Path-scoped
     so the County Commission's pages are not official sources for 12086. */
  { domain: "miamidade.gov/elections", publisher: MIAMI_DADE_SOE, countyFips: "12086" },
  { domain: supervisorHost("12011"), publisher: "Broward County Supervisor of Elections", countyFips: "12011" },
  { domain: supervisorHost("12057"), publisher: "Hillsborough County Supervisor of Elections", countyFips: "12057" },
  { domain: supervisorHost("12095"), publisher: ORANGE_SOE, countyFips: "12095" },
  /* The older Orange host, which now redirects (supervisors.ts header). */
  { domain: "ocfelections.gov", publisher: ORANGE_SOE, countyFips: "12095" },
]);

/** The official entry `url` belongs to, or null. The longest matching
    `domain` wins, so a more specific entry decides over a broader one. */
export function officialForUrl(
  url: string,
  sources: readonly OfficialSource[] = OFFICIAL_SOURCES,
): OfficialSource | null {
  const lowered = lowerPath(url);
  let best: OfficialSource | null = null;
  for (const s of sources) {
    if (urlBelongsTo(lowered, s) && (best === null || s.domain.length > best.domain.length)) best = s;
  }
  return best;
}

/** `url` with its path lowercased, for matching only (every entry's domain
    is lowercase). An unparseable URL is returned as is, and matches nothing. */
function lowerPath(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = u.pathname.toLowerCase();
    return u.href;
  } catch {
    return url;
  }
}

export const OFFICIAL_ID_PREFIX = "official:";

/** `source_id` for an official entry: one source row per listed body, as
    `outlet:<domain>` is one per outlet. */
export function officialSourceIdFor(domain: string): string {
  return `${OFFICIAL_ID_PREFIX}${domain}`;
}

export interface OfficialSourceRow {
  source_id: string;
  url: string;
  url_norm: string;
  publisher: string;
  type: SourceType;
  lean_tag: LeanTag;
}

/** The `source` row for one official entry: the shape outletSourceRow builds
    (news-enqueue.ts), typed `primary_doc` with lean `N/A`, so a card shows the
    publisher and "Official document" and never a lean. One builder for the
    approve path and migration official_link_sources (0055), so the row cannot
    depend on which wrote it first. */
export function officialSourceRow(entry: OfficialSource): OfficialSourceRow {
  return {
    source_id: officialSourceIdFor(entry.domain),
    url: `https://${entry.domain}`,
    url_norm: entry.domain,
    publisher: entry.publisher,
    type: "primary_doc",
    lean_tag: "N/A",
  };
}
