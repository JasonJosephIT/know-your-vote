/* PII scrubbing for every Sentry event and breadcrumb (PRD § 2 Security).
   Drops ZIPs, email addresses, and IPs from all payloads before send.
   The app never *needs* these in errors — a report that loses one is
   strictly better than one that leaks one. */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_RE = /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi;
const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/g;

export function scrubString(value: string): string {
  return value
    .replace(EMAIL_RE, "[email]")
    .replace(IPV4_RE, "[ip]")
    .replace(IPV6_RE, "[ip]")
    .replace(ZIP_RE, "[zip]");
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return value;
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/email|zip|ip_address|remote_addr/i.test(k)) continue;
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

export function scrubEvent<E extends AnyEvent>(event: E): E {
  /* No accounts exist; user context can only ever be incidental PII. */
  delete event.user;
  if (event.request) event.request = scrubValue(event.request);
  if (typeof event.message === "string") event.message = scrubString(event.message);
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
