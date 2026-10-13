/* The unsubscribe link: opening it never unsubscribes; pressing the button,
   or a mail app's one-click Unsubscribe, does.

   GET /api/voting-info/unsubscribe used to set active = false on the spot,
   and answer text/plain or raw JSON. Mail security gateways (Mimecast,
   Proofpoint, Defender's Safe Links) open the links in delivered mail, so a
   voter behind one could be unsubscribed before reading anything. The
   route now hands every request to unsubscribeResponse() in
   src/lib/notifications/unsubscribe.ts, driven here with an in-memory
   database:

     1. TOKEN AND MASK. Only a 32-hex token is looked up; the page names
        the address as "j***@gmail.com", never in full.
     2. GET NEVER WRITES. An active token gets a confirm page, 200, with
        one button, a <form method="post"> back to the same link; no row
        changes, however often it is opened. An address with nothing
        active left is told it is already unsubscribed, 200; one with
        another row still active gets the confirm page.
     3. POST UNSUBSCRIBES, exactly the rows the old GET did: the token's
        row and every active row for the same address (exact match), and
        no one else's. "You're unsubscribed", 200; again, "already", 200.
        It reads no body, so the RFC 8058 one-click POST
        ("List-Unsubscribe=One-Click") gets the same 2xx.
     4. HONEST ERRORS, as HTML: a malformed or unknown token is a 404 "this
        link isn't valid" naming info@; a database error, or no service
        key, is a 503 "try again", never "unknown token".
     5. EVERY PAGE: text/html, Cache-Control no-store, Referrer-Policy
        no-referrer, noindex (header and meta), a CSP with no script and
        no framing, no full address, lang, title, h1.
     6. THE QUERIES subscriptionStore() sends, recorded with a fake
        Supabase client. Each method calls its SQL function from migration
        0058 first, with the token or the address in the POST body, never
        in a Supabase request URL (the API gateway logs those). Only on
        PGRST202 (0058 not applied yet) does it run the query it ran
        before, unchanged: exact matches, writes only active = false. A
        database error, from the function or the fallback, throws rather
        than reading as "no such token", and any error but PGRST202 never
        falls back.
     7. ROUTE SOURCE. GET and POST only, both delegating, neither reading
        a body, redirecting or touching the database itself.
     8. THE PRIVACY PAGES no longer say the link "works immediately" or is
        "instant": one click, then the button, or the mail app's own
        (/privacy/how-it-works says so; /privacy that every email has the
        link).

   What it cannot cover: the deployed route and the live table. That is
   docs/general-election/reminders-e2e-runbook.md, step 4e.

   Run: node scripts/verify-unsubscribe.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  maskEmail,
  subscriptionStore,
  UNSUBSCRIBE_TOKEN_RE,
  unsubscribeResponse,
  type UnsubscribeStore,
} from "../src/lib/notifications/unsubscribe.ts";
import { unsubscribeUrl } from "../src/lib/site-url.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const code = (rel: string) =>
  source(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* ---- an in-memory voting_info_subscription ----------------------------- */

type Row = { email: string; zip5: string; token: string; active: boolean };
const T = (n: number) => n.toString(16).padStart(32, "0");
const ANA = "ana.lopez@gmail.com";

function table(): Row[] {
  return [
    { email: ANA, zip5: "33130", token: T(1), active: true },
    /* The same voter, signed up from a second ZIP. */
    { email: ANA, zip5: "32801", token: T(2), active: true },
    /* Someone else, and an older row differing only in case: neither is
       this voter's to stop (the store matches exactly, as before). */
    { email: "bo@example.com", zip5: "33130", token: T(3), active: true },
    { email: "Ana.Lopez@gmail.com", zip5: "33301", token: T(4), active: true },
    /* Unsubscribed earlier, nothing active left for the address. */
    { email: "cy@example.com", zip5: "33130", token: T(5), active: false },
    /* Unsubscribed from one ZIP, then signed up again from another. */
    { email: "di@example.com", zip5: "33130", token: T(6), active: false },
    { email: "di@example.com", zip5: "32801", token: T(7), active: true },
  ];
}

function memoryStore(rows: Row[], fail: Partial<Record<keyof UnsubscribeStore, true>> = {}) {
  const calls: string[] = [];
  const store: UnsubscribeStore = {
    async addressFor(token) {
      calls.push("addressFor");
      if (fail.addressFor) throw new Error("connection refused");
      return rows.find((r) => r.token === token)?.email ?? null;
    },
    async subscribed(email) {
      calls.push("subscribed");
      if (fail.subscribed) throw new Error("connection refused");
      return rows.some((r) => r.email === email && r.active);
    },
    async unsubscribe(email) {
      calls.push("unsubscribe");
      if (fail.unsubscribe) throw new Error("connection refused");
      const hit = rows.filter((r) => r.email === email && r.active);
      for (const r of hit) r.active = false;
      return hit.length;
    },
  };
  return { store, calls };
}

const snapshot = (rows: Row[]) => JSON.stringify(rows);

type Got = { status: number; headers: Headers; html: string };
async function hit(
  method: "GET" | "POST",
  token: string | null,
  store: UnsubscribeStore | (() => never)
): Promise<Got> {
  const res = await unsubscribeResponse(
    method,
    token,
    typeof store === "function" ? store : () => store
  );
  return { status: res.status, headers: res.headers, html: await res.text() };
}

const heading = (html: string) => html.match(/<h1>([^<]*)<\/h1>/)?.[1] ?? "";

/* ---- 1. token and mask -------------------------------------------------- */

console.log("1. Token and mask");
check("a 32-hex token is a token", UNSUBSCRIBE_TOKEN_RE.test(T(1)));
check(
  "upper case, 31 or 33 characters, or non-hex are not",
  ["A".repeat(32), "a".repeat(31), "a".repeat(33), "g".repeat(32), `${T(1)}\n`].every(
    (t) => !UNSUBSCRIBE_TOKEN_RE.test(t)
  )
);
check("ana.lopez@gmail.com -> a***@gmail.com", maskEmail(ANA) === "a***@gmail.com", maskEmail(ANA));
check("j@x.org -> j***@x.org", maskEmail("j@x.org") === "j***@x.org");
check("a malformed stored value is never printed", maskEmail("nope") === "your address");

/* ---- 2. GET never writes ------------------------------------------------ */

console.log("\n2. GET never writes");
{
  const rows = table();
  const before = snapshot(rows);
  const { store, calls } = memoryStore(rows);
  const first = await hit("GET", T(1), store);
  const again = await hit("GET", T(1), store);
  check("an active token: 200 and the confirm page", first.status === 200 && /Unsubscribe from Know Your Vote\?/.test(heading(first.html)), heading(first.html));
  check("it names the address masked, a***@gmail.com", first.html.includes("<strong>a***@gmail.com</strong>"));
  const forms = first.html.match(/<form\b[^>]*>/g) ?? [];
  const action = new URL(unsubscribeUrl(T(1)));
  check(
    "one <form method=\"post\"> to the same link, with one submit button",
    forms.length === 1 &&
      forms[0] === `<form method="post" action="${action.pathname}${action.search}">` &&
      (first.html.match(/<button\b/g) ?? []).length === 1 &&
      /<button type="submit">Unsubscribe<\/button>/.test(first.html),
    forms.join(" ")
  );
  check("opening it twice changes no row", snapshot(rows) === before && again.status === 200);
  check("GET never calls unsubscribe()", !calls.includes("unsubscribe"), calls.join(", "));

  const { store: s2 } = memoryStore(rows);
  const already = await hit("GET", T(5), s2);
  check(
    "nothing active left for the address: 200, already unsubscribed, no button",
    already.status === 200 && /already unsubscribed/.test(heading(already.html)) && !/<form/.test(already.html)
  );
  const other = await hit("GET", T(6), s2);
  check(
    "the token's row is off but another row for the address is on: the confirm page, not \"already\"",
    other.status === 200 && /<form method="post"/.test(other.html)
  );
  check("still no row changed", snapshot(rows) === before);
}

/* ---- 3. POST unsubscribes ----------------------------------------------- */

console.log("\n3. POST unsubscribes (the button, and RFC 8058 one-click)");
{
  const rows = table();
  const { store } = memoryStore(rows);
  const done = await hit("POST", T(1), store);
  check("200, \"You're unsubscribed\"", done.status === 200 && heading(done.html) === "You're unsubscribed", heading(done.html));
  check("it names the address masked", done.html.includes("<strong>a***@gmail.com</strong>"));
  check(
    "the token's row and the address's other row are off",
    rows.filter((r) => r.email === ANA).every((r) => !r.active)
  );
  check(
    "no one else's row changed, nor a row differing only in case",
    rows.filter((r) => r.email !== ANA).map((r) => r.active).join() === table().filter((r) => r.email !== ANA).map((r) => r.active).join()
  );
  const again = await hit("POST", T(2), store);
  check(
    "pressing it again, or the other row's link: 200, already unsubscribed",
    again.status === 200 && /already unsubscribed/.test(heading(again.html))
  );
  const reactivated = await hit("POST", T(6), store);
  check(
    "an off token whose address signed up again turns that row off: 200, unsubscribed",
    reactivated.status === 200 && heading(reactivated.html) === "You're unsubscribed" &&
      rows.filter((r) => r.email === "di@example.com").every((r) => !r.active)
  );
}

/* ---- 4. honest errors --------------------------------------------------- */

console.log("\n4. Honest errors");
const pages: Got[] = [];
for (const method of ["GET", "POST"] as const) {
  for (const bad of [null, "", "not-a-token", "A".repeat(32), `${T(1)}x`]) {
    let opened = false;
    const res = await hit(method, bad, () => {
      opened = true;
      throw new Error("must not open");
    });
    pages.push(res);
    if (res.status !== 404 || opened || !/isn't valid/.test(heading(res.html))) {
      check(`${method} ${JSON.stringify(bad)}: 404 "isn't valid", no database read`, false, `${res.status} ${heading(res.html)} opened=${opened}`);
    }
  }
  check(`${method} with a malformed or missing token: 404 "This link isn't valid", no database read`, true);

  const unknown = await hit(method, T(99), memoryStore(table()).store);
  pages.push(unknown);
  check(
    `${method} with an unknown token: 404 "This link isn't valid", naming info@knowyour.vote`,
    unknown.status === 404 && /isn't valid/.test(heading(unknown.html)) && unknown.html.includes('href="mailto:info@knowyour.vote"')
  );

  const noKey = await hit(method, T(1), () => {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  });
  pages.push(noKey);
  check(`${method} with no service key: 503 "Something went wrong"`, noKey.status === 503 && heading(noKey.html) === "Something went wrong");

  for (const step of ["addressFor", "subscribed", "unsubscribe"] as const) {
    if (method === "GET" && step === "unsubscribe") continue;
    if (method === "POST" && step === "subscribed") continue;
    const rows = table();
    const res = await hit(method, T(1), memoryStore(rows, { [step]: true }).store);
    pages.push(res);
    check(
      `${method}, ${step}() fails: 503 "try again", not "isn't valid"`,
      res.status === 503 && /try the link again/i.test(res.html) && !/isn't valid/.test(res.html),
      `${res.status} ${heading(res.html)}`
    );
  }
}

/* ---- 5. every page ------------------------------------------------------ */

console.log("\n5. Every page");
{
  const rows = table();
  const { store } = memoryStore(rows);
  pages.push(await hit("GET", T(1), store), await hit("POST", T(1), store), await hit("POST", T(1), store));
}
const every = (name: string, test: (p: Got) => boolean) => {
  const bad = pages.filter((p) => !test(p));
  check(`${name} (${pages.length} pages)`, bad.length === 0, bad.map((p) => `${p.status} ${heading(p.html)}`).join("; "));
};
every("Content-Type text/html; charset=utf-8", (p) => p.headers.get("content-type") === "text/html; charset=utf-8");
every("Cache-Control: no-store", (p) => p.headers.get("cache-control") === "no-store");
every("Referrer-Policy: no-referrer, and the meta tag too", (p) => p.headers.get("referrer-policy") === "no-referrer" && p.html.includes('<meta name="referrer" content="no-referrer">'));
every("noindex in X-Robots-Tag and in the page", (p) => /noindex/.test(p.headers.get("x-robots-tag") ?? "") && p.html.includes('<meta name="robots" content="noindex, nofollow">'));
every(
  "a CSP with no script and no framing",
  (p) => {
    const csp = p.headers.get("content-security-policy") ?? "";
    return /default-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /form-action 'self'/.test(csp) && !/script-src/.test(csp);
  }
);
every("no <script>, no JSON", (p) => !/<script/i.test(p.html) && !p.html.trimStart().startsWith("{"));
every("never the full address", (p) => !p.html.includes(ANA) && !/ana\.lopez/i.test(p.html));
every("an HTML document: lang, viewport, title, one h1", (p) =>
  p.html.startsWith("<!doctype html>") && /<html lang="en">/.test(p.html) && /<meta name="viewport"/.test(p.html) &&
  /<title>[^<]+ — Know Your Vote<\/title>/.test(p.html) && (p.html.match(/<h1>/g) ?? []).length === 1
);

/* ---- 6. the queries ----------------------------------------------------- */

console.log("\n6. The queries subscriptionStore() sends");
type Call = [string, ...unknown[]];
type Result = { data: unknown; error: unknown };
/* PostgREST's answer while migration 0058 is not applied. */
const MISSING: Result = {
  data: null,
  error: { code: "PGRST202", message: "Could not find the function in the schema cache" },
};
/* Records every call. `.rpc()` answers `rpc`; a `.from()` chain answers
   `table`. */
function recordingClient(rpc: Result, table: Result = { data: null, error: { message: "the table was read" } }) {
  const calls: Call[] = [];
  const thenable = (result: Result) => (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return thenable(table);
        return (...args: unknown[]) => {
          calls.push([String(prop), ...args]);
          return builder;
        };
      },
    }
  );
  const client = {
    from(name: string) {
      calls.push(["from", name]);
      return builder;
    },
    rpc(...args: unknown[]) {
      calls.push(["rpc", ...args]);
      return { then: thenable(rpc) };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}
const chain = (calls: Call[]) => JSON.stringify(calls);
{
  /* With 0058 applied: one function call each, the token or the address
     in the POST body, never a filter in a URL (the API gateway logs
     those), and no option that would turn the call into a GET. */
  const r = recordingClient({ data: ANA, error: null });
  const email = await subscriptionStore(r.client).addressFor(T(1));
  check(
    "addressFor: subscription_email_for_token, the token in the body",
    email === ANA && chain(r.calls) === chain([["rpc", "subscription_email_for_token", { p_token: T(1) }]]),
    chain(r.calls)
  );
  check("no row: null", (await subscriptionStore(recordingClient({ data: null, error: null }).client).addressFor(T(1))) === null);

  const s = recordingClient({ data: true, error: null });
  const on = await subscriptionStore(s.client).subscribed(ANA);
  const off = await subscriptionStore(recordingClient({ data: false, error: null }).client).subscribed(ANA);
  check(
    "subscribed: subscription_is_active, the address in the body; true and false come back as they are",
    on === true && off === false && chain(s.calls) === chain([["rpc", "subscription_is_active", { p_email: ANA }]]),
    chain(s.calls)
  );

  const u = recordingClient({ data: 2, error: null });
  const n = await subscriptionStore(u.client).unsubscribe(ANA);
  const zero = await subscriptionStore(recordingClient({ data: 0, error: null }).client).unsubscribe(ANA);
  check(
    "unsubscribe: subscription_unsubscribe, the address in the body, and the count it turned off",
    n === 2 && zero === 0 && chain(u.calls) === chain([["rpc", "subscription_unsubscribe", { p_email: ANA }]]),
    chain(u.calls)
  );

  /* Before 0058 (PGRST202): the function call, then exactly the query each
     method sent before, answered the same way. */
  const fr = recordingClient(MISSING, { data: { email: ANA }, error: null });
  const fEmail = await subscriptionStore(fr.client).addressFor(T(1));
  check(
    "0058 not applied: addressFor falls back to the token's row by exact token, one row at most",
    fEmail === ANA &&
      chain(fr.calls) ===
        chain([
          ["rpc", "subscription_email_for_token", { p_token: T(1) }],
          ["from", "voting_info_subscription"], ["select", "email"], ["eq", "unsubscribe_token", T(1)], ["maybeSingle"],
        ]),
    chain(fr.calls)
  );
  check(
    "0058 not applied: no row is null",
    (await subscriptionStore(recordingClient(MISSING, { data: null, error: null }).client).addressFor(T(1))) === null
  );

  const fs = recordingClient(MISSING, { data: [{ id: "x" }], error: null });
  const fOn = await subscriptionStore(fs.client).subscribed(ANA);
  check(
    "0058 not applied: subscribed falls back to any active row with exactly this address",
    fOn === true &&
      chain(fs.calls) ===
        chain([
          ["rpc", "subscription_is_active", { p_email: ANA }],
          ["from", "voting_info_subscription"], ["select", "id"], ["eq", "email", ANA], ["eq", "active", true], ["limit", 1],
        ]),
    chain(fs.calls)
  );

  const fu = recordingClient(MISSING, { data: [{ id: "x" }, { id: "y" }], error: null });
  const fN = await subscriptionStore(fu.client).unsubscribe(ANA);
  check(
    "0058 not applied: unsubscribe falls back to active = false on every active row with exactly this address, and nothing else",
    fN === 2 &&
      chain(fu.calls) ===
        chain([
          ["rpc", "subscription_unsubscribe", { p_email: ANA }],
          ["from", "voting_info_subscription"], ["update", { active: false }], ["eq", "email", ANA], ["eq", "active", true], ["select", "id"],
        ]),
    chain(fu.calls)
  );

  /* A database error throws (the 503 page), from the function or from the
     fallback; an error from the function that is not PGRST202 never falls
     back to a URL filter. */
  const methods = [
    (c: SupabaseClient) => subscriptionStore(c).addressFor(T(1)),
    (c: SupabaseClient) => subscriptionStore(c).subscribed(ANA),
    (c: SupabaseClient) => subscriptionStore(c).unsubscribe(ANA),
  ];
  let threw = 0;
  let fellBack = 0;
  for (const run of methods) {
    const viaFn = recordingClient({ data: null, error: { code: "57014", message: "timeout" } }, { data: [], error: null });
    try {
      await run(viaFn.client);
    } catch {
      threw++;
    }
    if (viaFn.calls.some(([op]) => op === "from")) fellBack++;
    try {
      await run(recordingClient(MISSING, { data: null, error: { message: "timeout" } }).client);
    } catch {
      threw++;
    }
  }
  check(
    "a database error throws from every method, through the function or the fallback (the 503 page), never reads as \"no such token\"",
    threw === 6,
    `${threw} of 6 threw`
  );
  check("an error from the function other than PGRST202 never falls back to the URL filter", fellBack === 0);
}

/* ---- 7. route source ---------------------------------------------------- */

console.log("\n7. Route source");
const route = code("src/app/api/voting-info/unsubscribe/route.ts");
const exported = [...route.matchAll(/export (?:async )?function (\w+)/g)].map((m) => m[1]).sort();
check("exports GET and POST, nothing else", exported.join() === "GET,POST", exported.join());
check(
  "GET hands \"GET\" and POST hands \"POST\" to unsubscribeResponse, with the URL's token",
  /export async function GET\([^)]*\) \{\s*return unsubscribeResponse\(\s*"GET",\s*request\.nextUrl\.searchParams\.get\("token"\),/.test(route) &&
    /export async function POST\([^)]*\) \{\s*return unsubscribeResponse\(\s*"POST",\s*request\.nextUrl\.searchParams\.get\("token"\),/.test(route)
);
check(
  "the route itself never queries, writes, reads a body, redirects or answers JSON",
  !/\.from\(|\.update\(|\.formData\(|\.text\(|\.json\(|redirect|NextResponse/.test(route)
);
const lib = code("src/lib/notifications/unsubscribe.ts");
check(
  "the module has no server-only and no @/ import (plain Node loads it)",
  !/server-only|from "@\//.test(lib)
);

/* ---- 8. privacy page ---------------------------------------------------- */

console.log("\n8. Privacy pages");
/* Comments stripped: the pages' own notes quote the old wording. Since
   2026-10-13 /privacy says only that every email has an unsubscribe link,
   and /privacy/how-it-works says how it works, so the old wording is barred
   from both and the confirm step is pinned where it is explained. */
const privacy = code("src/app/(public)/privacy/page.tsx").replace(/\s+/g, " ");
const howItWorks = code("src/app/(public)/privacy/how-it-works/page.tsx").replace(/\s+/g, " ");
for (const [page, text] of [
  ["/privacy", privacy],
  ["/privacy/how-it-works", howItWorks],
] as const) {
  check(`${page} no longer says the link "works immediately"`, !/works immediately/.test(text));
  check(`${page} no longer calls it "instant"`, !/instant unsubscribe/i.test(text));
}
check("/privacy says every email has an unsubscribe link", /every email has an unsubscribe link/.test(privacy));
check(
  "/privacy/how-it-works says it is one click on the link, one on the confirm button, or the mail app's own button",
  /press the confirm button/.test(howItWorks) && /mail app(&apos;|&rsquo;|'|’)s own Unsubscribe/.test(howItWorks)
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nUnsubscribe checks passed.");
