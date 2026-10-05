import * as Sentry from "@sentry/nextjs";
import { serverIntegrations, sharedOptions } from "@/lib/sentry-options";

/* Loaded only when SENTRY_DSN is set (src/instrumentation.ts). */
Sentry.init({
  ...sharedOptions,
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  integrations: serverIntegrations(Sentry),
});
