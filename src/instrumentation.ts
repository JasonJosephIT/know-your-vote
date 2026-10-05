/* Server-side Sentry, and only when SENTRY_DSN is set. Without a DSN the SDK
   never loads: Sentry.init({ enabled: false }) still registers a global
   OpenTelemetry stack, which a review measured at about 140 ms per cold
   start and 1.4 ms per request, and makes every page carry trace meta
   tags. Nothing here runs on the edge runtime.

   This file must sit in src/: with a src/ folder, next build registers the
   hook only from there. At the repo root it was compiled but never
   deployed, so until 2026-10-05 no server error was ever reported. */
const enabled = () =>
  process.env.NEXT_RUNTIME === "nodejs" && Boolean(process.env.SENTRY_DSN);

export async function register() {
  if (!enabled()) return;
  try {
    await import("../sentry.server.config");
  } catch (error) {
    /* Next.js fails every request if register() throws. Losing error
       reports is better than losing the site. */
    console.error("Sentry failed to start; server error reporting is off.", error);
  }
}

export async function onRequestError(...args: unknown[]) {
  if (!enabled()) return;
  const Sentry = await import("@sentry/nextjs");
  return (
    Sentry.captureRequestError as (...a: unknown[]) => unknown
  )(...args);
}
