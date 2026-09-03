import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

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

/* Makes the wrangler.jsonc bindings (R2, D1, vars) reachable from `next dev`,
   so local dev exercises the same cache path production uses. No-op in the
   production build. */
void initOpenNextCloudflareForDev();

export default withSentryConfig(nextConfig, {
  /* Source-map upload runs only when SENTRY_AUTH_TOKEN is present (CI). */
  silent: true,
  disableLogger: true,
});
