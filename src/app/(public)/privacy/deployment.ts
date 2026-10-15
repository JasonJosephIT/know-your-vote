import { addressEntryEnabled } from "@/lib/geocode";
import { ADS_TAG_ENABLED } from "@/lib/ads";
import { remindersPaused } from "@/lib/notifications/config";

/* The deployment facts the two privacy pages describe, read in one place.

   /privacy states each point in a sentence or two and /privacy/how-it-works
   explains it. Several points are deployment facts rather than constants:
   whether the field takes an address, and whether
   analytics, the ad tag and error reports are on. If each page read them on
   its own, a new switch added to one page could leave the short statement
   and its explanation describing two different sites. So both read this,
   and scripts/verify-privacy-pages.ts checks that they do.

   Not a client module: the Sentry DSN is server configuration, and only its
   presence is read, never its value. */
export type PrivacyDeployment = {
  /* ADDRESS_LOOKUP_OFF unset and GOOGLE_MAPS_API_KEY set
     (src/lib/geocode.ts). Off means no address field at all, only the
     district picker. On, a typed address goes to Google. */
  addressOn: boolean;
  analyticsOn: boolean;
  adsOn: boolean;
  errorReportsOn: boolean;
  /* NOTIFICATIONS_PAUSED unset (src/lib/notifications/config.ts). While it
     is set no reminder sends, so neither page may promise one. */
  remindersOn: boolean;
};

export function privacyDeployment(): PrivacyDeployment {
  const addressOn = addressEntryEnabled();
  return {
    addressOn,
    /* The same variable the root layout uses to load the script, so the
       pages can't drift from what runs. On 2026-10-04
       NEXT_PUBLIC_PLAUSIBLE_DOMAIN was unset in production and /privacy
       still said "We use … Plausible" (docs/scope-changes.md). */
    analyticsOn: Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN),
    /* The ads switch (src/lib/ads.ts, founder decision 2), imported from
       there and not from SitePrompts: through a "use client" module it would
       arrive as a client reference, always truthy. */
    adsOn: ADS_TAG_ENABLED,
    /* The same variables that start the two Sentry SDKs
       (src/instrumentation.ts, src/instrumentation-client.ts). */
    errorReportsOn: Boolean(
      process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    ),
    remindersOn: !remindersPaused(),
  };
}
