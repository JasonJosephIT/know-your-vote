/* Asserts the Sentry scrubbers remove ZIPs, emails, and IPs from events
   and breadcrumbs. Run: node scripts/verify-sentry-scrub.ts
   (Node >= 23 strips types natively.) */

import {
  scrubBreadcrumb,
  scrubEvent,
  scrubString,
} from "../src/lib/sentry-scrub.ts";

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const s = scrubString("voter maria@example.com at 33101 from 10.1.2.3 visited");
assert("email scrubbed", !s.includes("maria@example.com"), s);
assert("zip scrubbed", !s.includes("33101"), s);
assert("ip scrubbed", !s.includes("10.1.2.3"), s);

const event = scrubEvent({
  message: "Failed for maria@example.com in 33131",
  user: { ip_address: "1.2.3.4", email: "maria@example.com" },
  request: {
    url: "https://kyv.app/api/resolve?zip=33101",
    headers: { "x-forwarded-for": "8.8.8.8" },
  },
  exception: { values: [{ value: "quiz error for 32801" }] },
  extra: { email: "x@y.com", note: "zip 33629 failed" },
  breadcrumbs: [{ message: "GET /api/resolve?zip=33101" }],
  tags: { zip: "33101" },
});

const flat = JSON.stringify(event);
assert("event has no user block", !("user" in event));
assert("event has no raw email", !flat.includes("maria@example.com"), flat);
assert("event has no raw zip", !/\b3\d{4}\b/.test(flat), flat);
assert("event has no raw ip", !flat.includes("8.8.8.8"), flat);

/* An address route's body is the voter's home address. No regex separates it
   from ordinary prose, so the whole body is dropped rather than scrubbed. */
const addressEvent = scrubEvent({
  request: {
    url: "https://example.org/api/address/suggest",
    method: "POST",
    data: { q: "444 SW 2nd Ave, Miami" },
  },
});
const addressFlat = JSON.stringify(addressEvent);
assert(
  "address body is dropped",
  !addressFlat.includes("444 SW 2nd Ave"),
  addressFlat
);
assert(
  "address body is marked as dropped",
  addressFlat.includes("[dropped]"),
  addressFlat
);

/* The resolve body no longer carries a place id — since the move to Pelias it
   carries the COORDINATE of the address the voter picked, which is their home
   to about the width of a house. Nothing in the scrubber's PII regexes would
   catch a pair of plain numbers, so this asserts the whole-body drop covers
   the resolve route too, not just suggest. */
const resolveEvent = scrubEvent({
  request: {
    url: "https://example.org/api/address/resolve",
    method: "POST",
    data: { lat: 25.769463071522, lon: -80.197602442738 },
  },
});
const resolveFlat = JSON.stringify(resolveEvent);
assert(
  "resolve body (a home coordinate) is dropped",
  !resolveFlat.includes("25.769463") && !resolveFlat.includes("80.1976"),
  resolveFlat
);

/* A non-address route keeps its body, minus the usual PII. */
const otherEvent = scrubEvent({
  request: {
    url: "https://example.org/api/quiz",
    method: "POST",
    data: { issue: "housing" },
  },
});
assert(
  "other routes keep their body",
  JSON.stringify(otherEvent).includes("housing"),
  JSON.stringify(otherEvent)
);

const crumb = scrubBreadcrumb({
  message: "click by voter@x.com",
  data: { url: "/api/resolve?zip=33101", ip: "9.9.9.9" },
});
const cflat = JSON.stringify(crumb);
assert(
  "breadcrumb scrubbed",
  !cflat.includes("voter@x.com") && !cflat.includes("33101"),
  cflat
);

/* The shape the server SDK sends for an unhandled route error
   (onRequestError, captured from a local next start on 2026-10-05): the
   request's headers and cookies ride along whatever sendDefaultPii says,
   and the query appears in four places. */
const serverEvent = scrubEvent({
  request: {
    method: "GET",
    url: "https://knowyour.vote/api/cron/send-reminders?zip=33101&email=voter%40example.com&q=444+SW+2nd+Ave",
    query_string: "zip=33101&email=voter%40example.com&q=444+SW+2nd+Ave",
    headers: {
      host: "knowyour.vote",
      cookie: "kyv.district=FL-27; sb-access-token=session-secret",
      authorization: "Bearer cron-secret-value",
      "x-cron-secret": "cron-secret-value",
      "x-forwarded-for": "203.0.113.9",
      "x-real-ip": "203.0.113.9",
      "x-vercel-ip-latitude": "25.7743",
      "x-vercel-ip-city": "Miami",
      referer: "https://knowyour.vote/candidates?gclid=gclid-value",
      "user-agent": "curl/8.5.0",
    },
    cookies: { "kyv.district": "FL-27", "sb-access-token": "session-secret" },
  },
  contexts: {
    nextjs: {
      request_path: "/api/cron/send-reminders?email=voter%40example.com&q=444+SW+2nd+Ave",
      router_path: "/api/cron/send-reminders",
    },
  },
  breadcrumbs: [
    {
      category: "fetch",
      data: {
        url: "https://api.geocode.earth/v1/autocomplete?text=444+SW+2nd+Ave&api_key=pelias-secret",
        "http.query": "text=444+SW+2nd+Ave&api_key=pelias-secret",
        method: "GET",
      },
    },
  ],
});
const serverFlat = JSON.stringify(serverEvent);
for (const [name, secret] of [
  ["saved district cookie", "FL-27"],
  ["Supabase session cookie", "session-secret"],
  ["CRON_SECRET (Authorization, x-cron-secret)", "cron-secret-value"],
  ["forwarded client IP", "203.0.113.9"],
  ["IP-based location (x-vercel-ip-*)", "25.7743"],
  ["referring page's query", "gclid-value"],
  ["URL-encoded email", "voter%40example.com"],
  ["address in a query string", "2nd+Ave"],
  ["PELIAS_API_KEY in a breadcrumb", "pelias-secret"],
]) {
  assert(`server event drops the ${name}`, !serverFlat.includes(secret), serverFlat);
}
assert(
  "server event keeps the route and method",
  serverFlat.includes("/api/cron/send-reminders?[query]") &&
    serverFlat.includes('"router_path":"/api/cron/send-reminders"') &&
    serverFlat.includes('"method":"GET"'),
  serverFlat
);
assert(
  "server event keeps harmless headers",
  serverFlat.includes("curl/8.5.0") && serverFlat.includes('"host":"knowyour.vote"'),
  serverFlat
);

const queryCrumb = JSON.stringify(
  scrubBreadcrumb({ category: "console", message: "GET /api/resolve?district=FL-27 failed" })
);
assert(
  "a query inside a breadcrumb message is dropped",
  !queryCrumb.includes("FL-27") && queryCrumb.includes("/api/resolve?[query]"),
  queryCrumb
);
for (const ip of ["2600:1700::1", "2001:db8::abcd", "::1", "fe80::1ff:fe23:4567:890a"]) {
  assert(`short-form IPv6 ${ip} scrubbed`, scrubString(`from ${ip} then`) === "from [ip] then");
}
assert(
  "code with :: is left alone",
  scrubString("std::vector and Foo::Bar at 10:30") === "std::vector and Foo::Bar at 10:30"
);
const deep = JSON.stringify(
  scrubEvent({ extra: { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: "maria@example.com" } } } } } } } } } } })
);
assert("values nested past the depth limit are not kept", !deep.includes("maria"), deep);
assert(
  "prose with a question mark is left alone",
  scrubString("Is this the right district? Check again.") === "Is this the right district? Check again."
);

if (failures) {
  console.error(`\n${failures} scrub check(s) failed`);
  process.exit(1);
}
console.log("\nAll Sentry scrub checks passed.");
