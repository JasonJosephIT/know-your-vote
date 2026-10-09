/* The campaign-website slot on every candidate card (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.7, D7,
   Recommended pending founder confirmation). Pure, with a relative import
   and its extension, so scripts/verify-campaign-website.ts runs it under
   plain node.

   CampaignWebsite (src/components/features/CampaignWebsite.tsx) prints
   "Campaign website: " and then either this link, whose text is the host,
   or "none listed". Null here means "none listed": no stored site, or a
   stored value that is not a plain http(s) URL (safeHttpUrl). */

import { safeHttpUrl } from "./format.ts";

export interface CampaignSite {
  /** The stored URL, unchanged. */
  href: string;
  /** Its host without a leading "www.": cynthiaforbrowardschools.com. */
  host: string;
}

export function campaignSite(url: string | null | undefined): CampaignSite | null {
  const href = safeHttpUrl(url);
  if (!href) return null;
  const host = new URL(href).hostname.replace(/^www\./i, "");
  return host ? { href, host } : null;
}
