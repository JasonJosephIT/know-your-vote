/* The single switch for the Google Ads tag: founder decision 2 in the launch
   handoff (2026-10-04), "Ads versus the PRD's privacy promise".
   docs/scope-changes.md (the 2026-10-04 entry, section A) sets out the
   decision. Without this constant, removing the tag meant a block of edits
   with a trap in it: the donation prompt waits for the cookie choice, so
   deleting the banner alone would silently stop the donation prompt too.

   Recommended (pending founder confirmation): true, keep the consent-gated
   tag. With true, everything behaves exactly as it did before this switch
   existed.

   To flip (remove the tag): set it to false.
   - SitePrompts then renders neither the Google tag nor the cookie banner.
   - The donation prompt no longer waits for a cookie choice; there is none,
     so it shows once, on the first page opened.
   - ResetAdsConsent renders nothing, and /privacy drops its advertising
     paragraph.
   The rest of the removal is outside the code (scope-changes section A):
   - the kyv.ads-consent line in /privacy's device-storage list;
   - docs/prd.md going back to its pre-ads wording;
   - the founder pausing the Google Ads campaigns that relied on the tag.

   It lives in a module without "use client" so server components can read
   the value. Imported from SitePrompts (a "use client" module) into a server
   component such as /privacy, it would arrive as a client reference, a
   function and so always truthy, and the page would keep describing the tag
   after a flip. SitePrompts and /privacy both import it from here. */
export const ADS_TAG_ENABLED: boolean = true;
