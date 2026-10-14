/* Relative, with the extension: scripts/verify-supervisor-link.ts loads
   this file in plain Node, which doesn't know the @/ alias. */
import { coveredCounty } from "./counties.ts";

/* Where a voter's county Supervisor of Elections lives online, for code that
   runs in the browser.

   src/lib/notifications/config.ts (officialSources) names the same four
   offices for the welcome email and VotingInfo, but it is server-only, so
   the split-ZIP prompt in CountyPicker could not use it and linked "your
   county Supervisor of Elections" to the Department of Education
   (fldoe.org) instead. That prompt's "Not sure?" line now sits under the
   district picker in LocationEntry. officialSources now takes each
   office's address from supervisorSite below (home readability,
   2026-10-13), which retired the two older addresses it kept for
   Miami-Dade and Orange, both of which redirect here.

   Each address is the Supervisor's own home page, checked 2026-10-05
   against the Division of Elections' county directory
   (dos.elections.myflorida.com/supervisors), which lists Broward,
   Hillsborough and Orange at these hosts and Miami-Dade at
   miamidade.gov/elections, the same Elections Department as
   votemiamidade.gov. Miami-Dade and Broward answered 200; Hillsborough and
   Orange sit behind a Cloudflare check that refuses scripted requests. */
const SUPERVISOR_SITES: Record<string, string> = {
  "12086": "https://www.votemiamidade.gov/",
  "12011": "https://www.browardvotes.gov/",
  "12057": "https://www.votehillsborough.gov/",
  "12095": "https://voteorangefl.gov/",
};

/* The Division of Elections' list of all 67 Supervisors, for a voter whose
   county we do not know. */
export const SUPERVISOR_LIST_URL =
  "https://dos.fl.gov/elections/contacts/supervisor-of-elections/";

export type SupervisorLink = {
  url: string;
  /* "the Orange County Supervisor of Elections", or "your county Supervisor
     of Elections" when the link is the statewide list. */
  label: string;
};

/* The covered county's Supervisor of Elections home page, or null for any
   other county. src/lib/official-sources.ts builds its four county entries
   from this, so the Supervisor hosts the approve path and R3's queue accept
   come from this one map (agent-retrofit spec §3.4). */
export function supervisorSite(countyFips: string): string | null {
  return SUPERVISOR_SITES[countyFips] ?? null;
}

export function supervisorLink(countyFips?: string | null): SupervisorLink {
  const county = countyFips ? coveredCounty(countyFips) : undefined;
  const url = county ? SUPERVISOR_SITES[county.fips] : undefined;
  return county && url
    ? { url, label: `the ${county.name} County Supervisor of Elections` }
    : { url: SUPERVISOR_LIST_URL, label: "your county Supervisor of Elections" };
}

/* The home page's "Sample ballot and how to vote" block (VotingResources;
   docs/design/home-readability-2026-10-12/ §2.3): each covered county's
   own pages for the four things a voter came to do, and the Division of
   Elections' pages for everyone else.

   Checked 2026-10-12 and again 2026-10-13. Supervisors' own pages only:
   never a vendor's tool (VoterFocus, electionsfl.org, OmniBallot), whose
   addresses change between elections, and never a third party's guide.
   The same six links for every county, so every county gets the same four
   tiles. Miami-Dade, Broward and the state pages answered 200 to curl.
   Hillsborough's sit behind a Cloudflare check that refuses every scripted
   request (403); all five loaded in a browser on 2026-10-13. Orange's
   refuse curl's own user agent and answer 200 to a browser's.

   No opening hours here: Orange runs early voting 8 to 8 and the others 7
   to 7, so one line can't be true for all four. Election Day hours are the
   same everywhere by law, and VotingResources states those.

   2026 data. Re-check every address before another election uses it. */
export type VoterLinks = {
  /* The host a voter reads in the copy, without www.: "voteorangefl.gov".
     The end of supervisorSite's host (verify-voter-links). */
  site: string;
  sampleBallot: string;
  /* What the county's sample-ballot form asks for, after "Asks for". */
  sampleBallotAsks: string;
  pollingPlace: string;
  earlyVoting: string;
  mailRequest: string;
  mailReturn: string;
};

const COUNTY_VOTER_LINKS: Record<string, VoterLinks> = {
  "12086": {
    site: "votemiamidade.gov",
    sampleBallot:
      "https://www.votemiamidade.gov/elections/voters/information.page",
    sampleBallotAsks: "your name and date of birth",
    /* The same page: Miami-Dade's one voter lookup gives the sample
       ballot and the polling place together. */
    pollingPlace:
      "https://www.votemiamidade.gov/elections/voters/information.page",
    earlyVoting:
      "https://www.votemiamidade.gov/elections/voters/early-voting.page",
    mailRequest:
      "https://www.votemiamidade.gov/elections/voters/vote-by-mail.page",
    /* The same page lists the ways to return a ballot. */
    mailReturn:
      "https://www.votemiamidade.gov/elections/voters/vote-by-mail.page",
  },
  "12011": {
    site: "browardvotes.gov",
    /* The county's own subdomain, not OmniBallot. browardvotes.gov's
       /voters/sample-ballot answered 404. */
    sampleBallot:
      "https://my.browardvotes.gov/Portals/ElectionLink/VoterSearch.aspx",
    sampleBallotAsks: "your name, year of birth and house number",
    pollingPlace: "https://browardvotes.gov/voters/precinct-finder",
    earlyVoting: "https://browardvotes.gov/voters/early-voting-ballot-return",
    mailRequest: "https://browardvotes.gov/voters/vote-mail-information",
    mailReturn: "https://browardvotes.gov/voters/early-voting-ballot-return",
  },
  "12057": {
    site: "votehillsborough.gov",
    /* The personal lookup and the all-races PDF. */
    sampleBallot: "https://www.votehillsborough.gov/180/On-the-Ballot",
    sampleBallotAsks: "your name and date of birth",
    pollingPlace: "https://www.votehillsborough.gov/159/Voting-Precincts",
    earlyVoting: "https://www.votehillsborough.gov/171/Early-Voting",
    mailRequest:
      "https://www.votehillsborough.gov/173/Request-a-Vote-By-Mail-Ballot",
    /* The 2026 general-election page, not /173 (founder, 2026-10-14):
       on 2026-10-13 /173 covered requests only, and this one says where to
       drop a mail ballot off. */
    mailReturn: "https://www.votehillsborough.gov/291/2026-General-Election",
  },
  "12095": {
    site: "voteorangefl.gov",
    /* The sample ballot for any address in the county. */
    sampleBallot: "https://voteorangefl.gov/whats-on-my-ballot/",
    sampleBallotAsks: "your address",
    pollingPlace: "https://voteorangefl.gov/find-your-polling-place/",
    earlyVoting: "https://voteorangefl.gov/vote-early/",
    mailRequest: "https://voteorangefl.gov/request-a-mail-ballot/",
    mailReturn:
      "https://voteorangefl.gov/secure-ballot-intake-stations-drop-boxes/",
  },
};

/* The covered county's own links, or null for any other county and for
   none, which get the Division of Elections' links instead. */
export function voterLinks(countyFips?: string | null): VoterLinks | null {
  const county = countyFips ? coveredCounty(countyFips) : undefined;
  return (county && COUNTY_VOTER_LINKS[county.fips]) || null;
}

/* The Division of Elections' directory of all 67 Supervisors, each with
   their own site, for "Another Florida county". SUPERVISOR_LIST_URL above
   (the contact hub) stays as it is: the district picker uses it and
   verify-supervisor-link pins it. */
export const SUPERVISOR_DIRECTORY_URL =
  "https://dos.elections.myflorida.com/supervisors/";

/* The state's voter-status lookup. Answers 404 to HEAD and 200 to GET. */
export const REGISTRATION_STATUS_URL =
  "https://registration.dos.fl.gov/CheckVoterStatus";

/* The Division of Elections' pages for a voter in any county. */
export const STATE_VOTER_LINKS = {
  pollingPlace:
    "https://dos.fl.gov/elections/for-voters/check-your-voter-status-and-polling-place/voter-precinct-lookup/",
  earlyVoting:
    "https://dos.fl.gov/elections/for-voters/voting/early-voting-and-secure-ballot-intake-stations/",
  mail: "https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/",
} as const;
