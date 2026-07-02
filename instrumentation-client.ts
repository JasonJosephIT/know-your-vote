/* Client error tracking loads lazily after hydration so the Sentry SDK
   stays out of the initial bundle (PRD § 7: initial JS < 200KB gz). With no
   DSN configured it never loads at all. */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const load = () => {
    void import("./sentry.client.config");
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(load, { timeout: 5000 });
  } else {
    setTimeout(load, 3000);
  }
}

export function onRouterTransitionStart() {
  /* Router-transition tracing is intentionally off — tracesSampleRate is 0
     and the lazy-loaded SDK does not instrument navigation. */
}
