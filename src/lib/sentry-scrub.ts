/* PII scrubbing for every Sentry event and breadcrumb (PRD § 2 Security).
   Drops ZIPs, email addresses, and IPs from all payloads before send.
   The app never *needs* these in errors — a report that loses one is
   strictly better than one that leaks one.

   An event's request keeps only its method, its URL without the query, and
   the host and user-agent headers. The server SDK attaches every header
   and cookie to the errors it captures (onRequestError), whatever
   sendDefaultPii says: cookies hold the saved district and, for admins,
   the Supabase session; the cron routes' Authorization and x-cron-secret
   headers hold CRON_SECRET; Vercel's x-vercel-ip-* headers hold a
   location; Referer holds the previous page's query. A query string can
   hold anything a voter typed, and an outbound call to hosted Pelias
   carries both the address and PELIAS_API_KEY in its query, which the
   SDK's fetch breadcrumbs record. Everywhere else, keys that name a
   cookie, a credential or a query are dropped, and URL queries are cut.

   Address-route request bodies are dropped whole rather than pattern-matched. A
   street address looks like ordinary prose — no regex catches "444 SW 2nd Ave"
   without catching half the app's copy — so /api/address/* bodies never reach
   Sentry at all. */

/* %40 is "@" in a URL-encoded query or path. */
const EMAIL_RE = /[\w.+-]+(?:@|%40)[\w-]+\.[\w.-]+/gi;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
/* Full form, and the "::" short forms ("2600:1700::1", "::1"). */
const IPV6_RE =
  /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b|\b[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6}::(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6})?\b|::[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6}\b/gi;
const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/g;

/* The query of anything URL-shaped: an absolute URL, or a path that starts
   with "/". "?[query]" stays so a reader can tell one was there. */
const URL_QUERY_RE = /((?:https?:\/\/|\/)[^\s?#"'<>]*)\?[^\s#"'<>]*/g;

/* Keys whose values are never kept, at any depth. "query" covers
   query_string and the SDK's http.query breadcrumb field; "cookie" covers
   cookie, cookies and set-cookie. */
const DROPPED_KEY_RE =
  /email|zip|ip_address|remote_addr|cookie|authorization|cron-secret|query|forwarded-for|real-ip/i;

export function scrubString(value: string): string {
  return value
    .replace(URL_QUERY_RE, "$1?[query]")
    .replace(EMAIL_RE, "[email]")
    .replace(IPV4_RE, "[ip]")
    .replace(IPV6_RE, "[ip]")
    .replace(ZIP_RE, "[zip]");
}

function scrubValue(value: unknown, depth = 0): unknown {
  /* Past the limit nothing is inspected, so nothing is kept. */
  if (depth > 8) return "[depth]";
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DROPPED_KEY_RE.test(k)) continue;
      out[k] = scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

/* Sentry's own Event/Breadcrumb types vary across runtimes; scrubbing is
   structural, so a minimal shape keeps this file runtime-agnostic. */
type AnyEvent = {
  user?: unknown;
  request?: unknown;
  message?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
  contexts?: unknown;
  tags?: unknown;
  exception?: { values?: Array<{ value?: string }> };
};

const ADDRESS_ROUTE_RE = /\/api\/address\//;
const KEPT_HEADERS = new Set(["host", "user-agent"]);

/* An allowlist, not a denylist: a header or field nobody thought of is
   dropped rather than sent. The body of an address request is the voter's
   home address. Nothing about it is safe to keep, so it is replaced rather
   than scrubbed; other bodies keep what survives scrubValue. */
function scrubRequest(request: unknown): unknown {
  if (!request || typeof request !== "object") return request;
  const req = request as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof req.method === "string") out.method = req.method;
  if (typeof req.url === "string") out.url = scrubString(req.url);
  if (req.headers && typeof req.headers === "object") {
    const headers: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(req.headers)) {
      if (KEPT_HEADERS.has(name.toLowerCase())) headers[name] = scrubValue(value);
    }
    out.headers = headers;
  }
  if ("data" in req) {
    out.data =
      typeof req.url === "string" && ADDRESS_ROUTE_RE.test(req.url)
        ? "[dropped]"
        : scrubValue(req.data);
  }
  return out;
}

export function scrubEvent<E extends AnyEvent>(event: E): E {
  /* No accounts exist; user context can only ever be incidental PII. */
  delete event.user;
  if (event.request) event.request = scrubRequest(event.request);
  if (typeof event.message === "string")
    event.message = scrubString(event.message);
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === "string") ex.value = scrubString(ex.value);
    }
  }
  if (event.breadcrumbs) event.breadcrumbs = scrubValue(event.breadcrumbs);
  if (event.extra) event.extra = scrubValue(event.extra);
  if (event.contexts) event.contexts = scrubValue(event.contexts);
  if (event.tags) event.tags = scrubValue(event.tags);
  return event;
}

export function scrubBreadcrumb<B>(breadcrumb: B): B {
  return scrubValue(breadcrumb) as B;
}
