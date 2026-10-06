/* Relative, with the extension: scripts/verify-supervisor-link.ts loads
   this file in plain Node, which doesn't know the @/ alias. */
import { coveredCounty } from "./counties.ts";

/* Where a voter's county Supervisor of Elections lives online, for code that
   runs in the browser.

   src/lib/notifications/config.ts (officialSources) names the same four
   offices for the welcome email and VotingInfo, but it is server-only, so
   the split-ZIP prompt in CountyPicker could not use it and linked "your
   county Supervisor of Elections" to the Department of Education
   (fldoe.org) instead. That map keys on the county's name and keeps two
   older addresses that now redirect here (miamidade.gov's elections page
   to votemiamidade.gov, ocfelections.gov to voteorangefl.gov); folding it
   into this one is a follow-up for whoever owns that file.

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

export function supervisorLink(countyFips?: string | null): SupervisorLink {
  const county = countyFips ? coveredCounty(countyFips) : undefined;
  const url = county ? SUPERVISOR_SITES[county.fips] : undefined;
  return county && url
    ? { url, label: `the ${county.name} County Supervisor of Elections` }
    : { url: SUPERVISOR_LIST_URL, label: "your county Supervisor of Elections" };
}
