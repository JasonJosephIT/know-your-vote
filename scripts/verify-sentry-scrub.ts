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

if (failures) {
  console.error(`\n${failures} scrub check(s) failed`);
  process.exit(1);
}
console.log("\nAll Sentry scrub checks passed.");
