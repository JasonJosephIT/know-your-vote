import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  /* Source-map upload runs only when SENTRY_AUTH_TOKEN is present (CI). */
  silent: true,
  disableLogger: true,
});
