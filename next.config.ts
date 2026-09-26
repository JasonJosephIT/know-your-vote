import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      /* Races merged into the Candidates hub. Query params (zip, district,
         county) carry through automatically. The quiz (/where-i-stand, and
         its old name /find-my-candidates) was clipped 2026-09-25; both land
         on the candidates hub. Temporary, so the path stays free for
         whatever replaces it. */
      { source: "/races", destination: "/candidates?view=races", permanent: false },
      { source: "/where-i-stand", destination: "/candidates", permanent: false },
      { source: "/find-my-candidates", destination: "/candidates", permanent: false },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  /* Source-map upload runs only when SENTRY_AUTH_TOKEN is present (CI). */
  silent: true,
  disableLogger: true,
});
