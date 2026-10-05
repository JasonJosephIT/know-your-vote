/* Runs the real server Sentry SDK with the app's own options
   (src/lib/sentry-options.ts) against a stand-in for Sentry's ingest on
   127.0.0.1, and asserts on what actually leaves the process. Nothing
   reaches the network.

   verify-sentry-scrub.ts tests the scrubbers on hand-built events; this
   tests the shapes the SDK really produces, which differ: the server SDK
   copies every request header and cookie onto an error, records outgoing
   calls as breadcrumbs with their query, and a request carrying a
   "sampled" sentry-trace header can force a transaction past beforeSend.
   Captured with a local next start on 2026-10-05.

   Run: node scripts/verify-sentry-server.ts */

import http from "node:http";
import { createRequire } from "node:module";
import zlib from "node:zlib";
import {
  clientIntegrations,
  serverIntegrations,
  sharedOptions,
} from "../src/lib/sentry-options.ts";

/* require, not import: plain Node's ESM view of the SDK's CommonJS build
   misses re-exported names such as httpIntegration. Next.js bundles it
   with full interop, so the app sees them all. */
const Sentry = createRequire(import.meta.url)(
  "@sentry/nextjs"
) as typeof import("@sentry/nextjs");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* The stand-in: every envelope item, parsed. */
const items: { type: string; payload: unknown }[] = [];
const sink = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    let body = Buffer.concat(chunks);
    if (req.headers["content-encoding"] === "gzip") body = zlib.gunzipSync(body);
    const lines = body.toString("utf8").split("\n").filter(Boolean);
    for (let i = 1; i + 1 < lines.length; i += 2) {
      items.push({ type: JSON.parse(lines[i]).type, payload: JSON.parse(lines[i + 1]) });
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  });
});
await new Promise<void>((resolve) => sink.listen(0, "127.0.0.1", resolve));
const { port } = sink.address() as { port: number };

Sentry.init({
  ...sharedOptions,
  dsn: `http://publickey@127.0.0.1:${port}/1`,
  enabled: true,
  integrations: serverIntegrations(Sentry),
});

/* Values that must never leave, planted where the SDK puts them. */
const SECRETS: [string, string][] = [
  ["saved district cookie", "FL-27"],
  ["Supabase session cookie", "session-secret"],
  ["CRON_SECRET", "cron-secret-value"],
  ["forwarded client IP", "203.0.113.9"],
  ["IP-based location", "25.7743"],
  ["referring page's query", "gclid-value"],
  ["email in the error", "maria@example.com"],
  ["URL-encoded email", "maria%40example.com"],
  ["ZIP", "33101"],
  ["typed address", "2nd+Ave"],
  ["PELIAS_API_KEY", "pelias-secret"],
];

Sentry.addBreadcrumb({
  category: "fetch",
  type: "http",
  data: {
    url: "https://api.geocode.earth/v1/autocomplete",
    "http.query": "?text=444+SW+2nd+Ave&api_key=pelias-secret",
    method: "GET",
    status_code: 200,
  },
});

/* What Next.js hands onRequestError for an unhandled route error. */
Sentry.captureRequestError(
  new Error("send failed for maria@example.com"),
  {
    path: "/api/cron/send-reminders?zip=33101&email=maria%40example.com&q=444+SW+2nd+Ave",
    method: "GET",
    headers: {
      host: "knowyour.vote",
      "user-agent": "vercel-cron/1.0",
      cookie: "kyv.district=FL-27; sb-abcdefghij-auth-token=session-secret",
      authorization: "Bearer cron-secret-value",
      "x-cron-secret": "cron-secret-value",
      "x-forwarded-for": "203.0.113.9",
      "x-vercel-ip-latitude": "25.7743",
      "x-vercel-ip-city": "Miami",
      referer: "https://knowyour.vote/candidates?zip=33101&gclid=gclid-value",
    },
  },
  { routerKind: "App Router", routePath: "/api/cron/send-reminders", routeType: "route" }
);

/* A request whose sentry-trace header says "sampled". */
Sentry.continueTrace(
  { sentryTrace: `${"a".repeat(32)}-${"b".repeat(16)}-1`, baggage: undefined },
  () => Sentry.startSpan({ name: "GET /privacy", forceTransaction: true }, () => {})
);

await Sentry.flush(5000);
await Sentry.close(2000);
await new Promise((resolve) => setTimeout(resolve, 200));
sink.close();

const types = items.map((i) => i.type);
const events = items.filter((i) => i.type === "event");
check("the error was reported", events.length === 1, JSON.stringify(types));
check(
  "nothing but the error report left, though the trace header asked for a transaction",
  types.every((t) => t === "event"),
  JSON.stringify(types)
);
/* Stack frames carry the source lines around each call, and the lines
   around captureRequestError above are this file's planted values. In the
   app those lines are compiled code, never request data, so frames are
   left out of the search. */
const sent = JSON.stringify(items.map((i) => i.payload), (key, value) =>
  key === "stacktrace" ? undefined : value
);
for (const [name, value] of SECRETS) {
  check(`the ${name} did not leave`, !sent.includes(value));
}
const event = (events[0]?.payload ?? {}) as {
  request?: { method?: string; url?: string; headers?: Record<string, string> };
  contexts?: { nextjs?: { router_path?: string } };
};
check(
  "the report keeps what a reader needs: route, method, user agent",
  event.contexts?.nextjs?.router_path === "/api/cron/send-reminders" &&
    event.request?.method === "GET" &&
    event.request?.headers?.["user-agent"] === "vercel-cron/1.0",
  JSON.stringify(event.request)
);

/* Session counts need a real HTTP server and a running process to show up,
   so the integration lists are checked directly. */
let httpOptions: unknown;
const server = serverIntegrations({
  httpIntegration: (options) => {
    httpOptions = options;
    return { name: "Http" };
  },
})([{ name: "Http" }, { name: "ProcessSession" }, { name: "Console" }]);
check(
  "the server drops ProcessSession and stops counting requests as sessions",
  JSON.stringify(server.map((i) => i.name)) === '["Console","Http"]' &&
    (httpOptions as { trackIncomingRequestsAsSessions?: boolean })
      ?.trackIncomingRequestsAsSessions === false &&
    (httpOptions as { disableIncomingRequestSpans?: boolean })
      ?.disableIncomingRequestSpans === true,
  JSON.stringify({ names: server.map((i) => i.name), httpOptions })
);
const client = clientIntegrations([{ name: "BrowserSession" }, { name: "Dedupe" }]);
check(
  "the browser drops BrowserSession",
  JSON.stringify(client.map((i) => i.name)) === '["Dedupe"]',
  JSON.stringify(client)
);
check(
  "no tracing, client reports or trace headers on outgoing calls",
  !("tracesSampleRate" in sharedOptions) &&
    !("tracesSampler" in sharedOptions) &&
    sharedOptions.sendClientReports === false &&
    sharedOptions.tracePropagationTargets.length === 0 &&
    sharedOptions.beforeSendTransaction() === null
);

if (failures) {
  console.error(`\n${failures} Sentry server check(s) failed`);
  process.exit(1);
}
console.log("\nAll Sentry server checks passed.");
