import * as Sentry from "@sentry/nextjs";
import { clientIntegrations, sharedOptions } from "@/lib/sentry-options";

/* Loaded lazily, and only when NEXT_PUBLIC_SENTRY_DSN is set
   (src/instrumentation-client.ts). */
Sentry.init({
  ...sharedOptions,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  integrations: clientIntegrations,
});
