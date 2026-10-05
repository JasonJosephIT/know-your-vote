import { scrubBreadcrumb, scrubEvent } from "./sentry-scrub.ts";

/* The options both Sentry SDKs run with, in one place so
   sentry.server.config.ts, sentry.client.config.ts and
   scripts/verify-sentry-server.ts use the same settings; a check against a
   copy would prove nothing. Relative imports with the extension, because
   that check loads this file in plain Node, which doesn't know the @/
   alias.

   Only scrubbed error reports leave the app (/privacy says so):
   - No tracesSampleRate, not even 0. Any number switches tracing on, and a
     request whose sentry-trace header says "sampled" then forces a
     transaction, which never passes through beforeSend. Unset, no span is
     ever recorded, and beforeSendTransaction drops any that slips through.
   - No client reports, no session counts (serverIntegrations and
     clientIntegrations below), and no trace headers added to outgoing
     requests, which go to Supabase, Resend and the geocoder. */
export const sharedOptions = {
  sendDefaultPii: false,
  sendClientReports: false,
  tracePropagationTargets: [] as string[],
  beforeSend<E extends Parameters<typeof scrubEvent>[0]>(event: E): E {
    return scrubEvent(event);
  },
  beforeSendTransaction(): null {
    return null;
  },
  beforeBreadcrumb<B>(breadcrumb: B): B {
    return scrubBreadcrumb(breadcrumb);
  },
};

/* Generic over the SDK's own Integration type, which @sentry/nextjs doesn't
   export; only the name is read here. */
type Named = { name: string };
type HttpIntegration<I> = (options: {
  disableIncomingRequestSpans: boolean;
  trackIncomingRequestsAsSessions: boolean;
}) => I;

/* @sentry/nextjs replaces the default Http integration with one that skips
   incoming-request spans; this keeps that and also stops it counting every
   request as a session. ProcessSession reports the server process's own
   session, which is no error report either. The SDK module is passed in
   because the browser build has no httpIntegration. */
export function serverIntegrations<H extends Named>(sdk: {
  httpIntegration: HttpIntegration<H>;
}) {
  return <D extends Named>(defaults: D[]): (D | H)[] => [
    ...defaults.filter((i) => i.name !== "Http" && i.name !== "ProcessSession"),
    sdk.httpIntegration({
      disableIncomingRequestSpans: true,
      trackIncomingRequestsAsSessions: false,
    }),
  ];
}

/* The browser SDK sends a session on every page load and navigation. */
export function clientIntegrations<I extends Named>(defaults: I[]): I[] {
  return defaults.filter((i) => i.name !== "BrowserSession");
}
