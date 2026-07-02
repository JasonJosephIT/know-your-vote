import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      /* Races merged into the Candidates hub; quiz renamed. Query params
         (zip, district, county) carry through automatically. */
      { source: "/races", destination: "/candidates?view=races", permanent: false },
      { source: "/find-my-candidates", destination: "/where-i-stand", permanent: false },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  /* Source-map upload runs only when SENTRY_AUTH_TOKEN is present (CI). */
  silent: true,
  disableLogger: true,
});
