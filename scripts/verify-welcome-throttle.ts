/* One welcome email per address and ZIP per 24 hours, at most three per
   address, and the same status and body either way.

   POST /api/voting-info saved the subscription and sent the welcome email
   on every request, so anyone could make the site mail any address five
   times a minute per IP (more across serverless instances), spending the
   Resend quota and inviting spam complaints. The route now asks
   welcomeSentWithinWindow() (src/lib/notifications/welcome-throttle.ts)
   after saving and before sending:

     1. THE QUERY it sends, recorded with a fake Supabase client that also
        answers it from in-memory rows: the address's rows with
        last_sent_at in the last 24 hours, up to WELCOME_DAILY_CAP. It asks
        the SQL function subscription_welcomed_zips (migration 0058) first,
        with the address in the POST body, so it never sits in a Supabase
        request URL, which the API gateway logs; only on PGRST202 (0058
        not applied yet) does it run the old filter, unchanged, and any
        other error throws without falling back. Through either path: the
        same ZIP stamped 23h59m ago skips, 24h01m ago does not, NULL never
        does; another ZIP's recent row does not skip (a voter fixing a
        mistyped ZIP gets the right county's email), until the address has
        WELCOME_DAILY_CAP of them; another address's never counts. A
        database error throws. markWelcomeSent, the stamp, the same way:
        subscription_mark_welcomed with the token in the body, the old
        update by token on PGRST202, the token's row only, and it never
        throws.
     2. THE ROUTE. Upsert first (the subscription is saved or switched
        back on either way), then the check, then the dates read and the
        send. A recent send skips both and returns the same success answer
        as a send, from one function (it answers sooner, a limit the module
        states). A failed check sends
        nothing and says so, as a failed send does. last_sent_at is stamped
        only after Resend accepts the email, and nothing else writes it:
        reminders and corrections do not count.
     3. THE FORM's success line is true whether or not that request sent
        the email.

   What it cannot cover: the deployed route and Resend. The founder's
   step 4a in docs/general-election/reminders-e2e-runbook.md signs up once.

   Run: node scripts/verify-welcome-throttle.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  markWelcomeSent,
  WELCOME_DAILY_CAP,
  WELCOME_WINDOW_MS,
  welcomeSentWithinWindow,
} from "../src/lib/notifications/welcome-throttle.ts";

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

/* ---- 1. the query ------------------------------------------------------- */

console.log("1. welcomeSentWithinWindow()");
check("the window is 24 hours", WELCOME_WINDOW_MS === 24 * 60 * 60 * 1000);
check("the per-address cap is 3", WELCOME_DAILY_CAP === 3);

/* `id` stands in for the unsubscribe token too: both are unique per row. */
type Row = { id: string; email: string; zip5: string; last_sent_at: string | null };
type Call = [string, ...unknown[]];
const column = (col: string) => (col === "unsubscribe_token" ? "id" : col) as keyof Row;

/* How the fake database answers .rpc(): "applied" is migration 0058 in
   place, and the function does what 0058's SQL does (verify-migrations.mjs
   checks that SQL on a real Postgres); "missing" is PostgREST's PGRST202,
   the function not there yet; "error" is any other database error. */
type FnState = "applied" | "missing" | "error";

/* Records every call, then answers it the way PostgREST would for these
   rows: eq is equality, gte skips NULL, limit caps, and an update stamps.
   Anything else in the chain is a failure to look at, not something to
   guess about. */
function fakeDb(rows: Row[], fn: FnState = "applied", error: unknown = null) {
  const calls: Call[] = [];
  const answer = (chain: Call[]) => {
    if (error) return { data: null, error };
    let out = [...rows];
    let unknown = "";
    let update: Partial<Row> | null = null;
    for (const [op, ...args] of chain.slice(1)) {
      const col = column(String(args[0]));
      const value = args[1];
      if (op === "select") continue;
      else if (op === "update") update = args[0] as Partial<Row>;
      else if (op === "eq") out = out.filter((r) => r[col] === value);
      else if (op === "gte") out = out.filter((r) => r[col] !== null && String(r[col]) >= String(value));
      else if (op === "limit") out = out.slice(0, args[0] as number);
      else unknown = op;
    }
    if (unknown) return { data: null, error: { message: `unexpected .${unknown}()` } };
    if (update) for (const r of out) Object.assign(r, update);
    return { data: out.map((r) => ({ id: r.id, zip5: r.zip5 })), error: null };
  };
  const rpc = (name: string, args: Record<string, unknown>) => {
    if (fn === "missing") {
      return { data: null, error: { code: "PGRST202", message: `Could not find the function public.${name}` } };
    }
    if (fn === "error" || error) return { data: null, error: error ?? { code: "57014", message: "timeout" } };
    if (name === "subscription_welcomed_zips") {
      const hits = rows.filter(
        (r) => r.email === args.p_email && r.last_sent_at !== null && r.last_sent_at >= String(args.p_since)
      );
      return { data: hits.slice(0, args.p_limit as number).map((r) => ({ zip5: r.zip5 })), error: null };
    }
    if (name === "subscription_mark_welcomed") {
      for (const r of rows) if (r.id === args.p_token) r.last_sent_at = String(args.p_sent_at);
      return { data: null, error: null };
    }
    return { data: null, error: { code: "PGRST202", message: `no fake for ${name}` } };
  };
  const thenable = (result: () => unknown) => (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve().then(result).then(resolve, reject);
  const client = {
    from(name: string) {
      const chain: Call[] = [["from", name]];
      calls.push(...chain);
      const builder: object = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "then") return thenable(() => answer(chain));
            return (...args: unknown[]) => {
              const call: Call = [String(prop), ...args];
              chain.push(call);
              calls.push(call);
              return builder;
            };
          },
        }
      );
      return builder;
    },
    rpc(...args: unknown[]) {
      calls.push(["rpc", ...args]);
      const [name, params] = args as [string, Record<string, unknown>];
      return { then: thenable(() => rpc(name, params)) };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const NOW = new Date("2026-10-06T15:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const H = 60 * 60 * 1000;
const M = 60 * 1000;
const ANA = "ana@example.com";
const ZIP = "33130";
const SINCE = "2026-10-05T15:00:00.000Z";
const FALLBACK_READ = [
  ["from", "voting_info_subscription"],
  ["select", "zip5"],
  ["eq", "email", ANA],
  ["gte", "last_sent_at", SINCE],
  ["limit", WELCOME_DAILY_CAP],
];

{
  const t = fakeDb([]);
  await welcomeSentWithinWindow(t.client, ANA, ZIP, NOW);
  check(
    "0058 applied: one call to subscription_welcomed_zips, the address in the POST body (no URL filter, no GET option)",
    JSON.stringify(t.calls) ===
      JSON.stringify([
        ["rpc", "subscription_welcomed_zips", { p_email: ANA, p_since: SINCE, p_limit: WELCOME_DAILY_CAP }],
      ]),
    JSON.stringify(t.calls)
  );
  const m = fakeDb([], "missing");
  await welcomeSentWithinWindow(m.client, ANA, ZIP, NOW);
  check(
    "0058 not applied (PGRST202): then exactly the old read, this address's ZIPs with last_sent_at >= now - 24h, up to the cap",
    JSON.stringify(m.calls) ===
      JSON.stringify([
        ["rpc", "subscription_welcomed_zips", { p_email: ANA, p_since: SINCE, p_limit: WELCOME_DAILY_CAP }],
        ...FALLBACK_READ,
      ]),
    JSON.stringify(m.calls)
  );
  const e = fakeDb([], "error");
  let threw = false;
  try {
    await welcomeSentWithinWindow(e.client, ANA, ZIP, NOW);
  } catch {
    threw = true;
  }
  check(
    "any other error from the function throws and never falls back to the URL filter",
    threw && !e.calls.some(([op]) => op === "from"),
    JSON.stringify(e.calls)
  );
}

const CASES: [string, Row[], boolean][] = [
  ["never signed up", [], false],
  ["signed up, the email failed (last_sent_at NULL)", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: null }], false],
  ["mailed 23h59m ago", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: ago(23 * H + 59 * M) }], true],
  ["mailed exactly 24h ago", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: ago(24 * H) }], true],
  ["mailed 24h01m ago", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: ago(24 * H + M) }], false],
  [
    "this ZIP's row is old, the address's other ZIP was mailed an hour ago (a ZIP fix): send",
    [
      { id: "1", email: ANA, zip5: "33130", last_sent_at: ago(72 * H) },
      { id: "2", email: ANA, zip5: "32801", last_sent_at: ago(H) },
    ],
    false,
  ],
  [
    "two other ZIPs mailed today, this one not yet: send (under the cap)",
    [
      { id: "2", email: ANA, zip5: "32801", last_sent_at: ago(H) },
      { id: "3", email: ANA, zip5: "33602", last_sent_at: ago(2 * H) },
    ],
    false,
  ],
  [
    "three other ZIPs mailed today: skip (the cap)",
    [
      { id: "2", email: ANA, zip5: "32801", last_sent_at: ago(H) },
      { id: "3", email: ANA, zip5: "33602", last_sent_at: ago(2 * H) },
      { id: "4", email: ANA, zip5: "33301", last_sent_at: ago(3 * H) },
    ],
    true,
  ],
  ["someone else was mailed an hour ago", [{ id: "1", email: "bo@example.com", zip5: "33130", last_sent_at: ago(H) }], false],
];
for (const fn of ["applied", "missing"] as const) {
  const via = fn === "applied" ? "through the function" : "through the fallback";
  for (const [label, rows, expected] of CASES) {
    const got = await welcomeSentWithinWindow(fakeDb(rows, fn).client, ANA, ZIP, NOW);
    check(`${via}, ${label}: ${expected ? "skip the send" : "send"}`, got === expected, `got ${got}`);
  }
  let threw = false;
  try {
    await welcomeSentWithinWindow(fakeDb([], fn, { message: "timeout" }).client, ANA, ZIP, NOW);
  } catch {
    threw = true;
  }
  check(`${via}, a database error throws (never reads as "not sent")`, threw);
}

console.log("\n   markWelcomeSent()");
{
  const TOKEN = "0".repeat(31) + "1";
  const AT = new Date("2026-10-06T15:00:05.000Z");
  const rows = (): Row[] => [
    { id: TOKEN, email: ANA, zip5: ZIP, last_sent_at: null },
    { id: "other", email: ANA, zip5: "32801", last_sent_at: null },
  ];
  const a = fakeDb(rows());
  await markWelcomeSent(a.client, TOKEN, AT);
  check(
    "0058 applied: one call to subscription_mark_welcomed, the token and the time in the POST body",
    JSON.stringify(a.calls) ===
      JSON.stringify([["rpc", "subscription_mark_welcomed", { p_token: TOKEN, p_sent_at: AT.toISOString() }]]),
    JSON.stringify(a.calls)
  );
  const m = fakeDb(rows(), "missing");
  await markWelcomeSent(m.client, TOKEN, AT);
  check(
    "0058 not applied (PGRST202): then exactly the old stamp, last_sent_at on the token's row",
    JSON.stringify(m.calls) ===
      JSON.stringify([
        ["rpc", "subscription_mark_welcomed", { p_token: TOKEN, p_sent_at: AT.toISOString() }],
        ["from", "voting_info_subscription"],
        ["update", { last_sent_at: AT.toISOString() }],
        ["eq", "unsubscribe_token", TOKEN],
      ]),
    JSON.stringify(m.calls)
  );
  for (const fn of ["applied", "missing"] as const) {
    const stampedRows = rows();
    await markWelcomeSent(fakeDb(stampedRows, fn).client, TOKEN, AT);
    check(
      `${fn === "applied" ? "through the function" : "through the fallback"}, the stamp lands on the token's row only, and the throttle then reads it: the same ZIP skips, another ZIP does not`,
      stampedRows.find((r) => r.id === TOKEN)?.last_sent_at === AT.toISOString() &&
        stampedRows.find((r) => r.id === "other")?.last_sent_at === null &&
        (await welcomeSentWithinWindow(fakeDb(stampedRows).client, ANA, ZIP, NOW)) === true &&
        (await welcomeSentWithinWindow(fakeDb(stampedRows).client, ANA, "32801", NOW)) === false,
      JSON.stringify(stampedRows)
    );
  }
  const failing: [string, SupabaseClient][] = [
    ["the function errs", fakeDb(rows(), "error").client],
    ["the fallback errs", fakeDb(rows(), "missing", { message: "timeout" }).client],
    ["the request itself throws", { rpc: () => Promise.reject(new Error("fetch failed")) } as unknown as SupabaseClient],
  ];
  const threw: string[] = [];
  for (const [label, client] of failing) {
    try {
      await markWelcomeSent(client, TOKEN, AT);
    } catch {
      threw.push(label);
    }
  }
  check(
    "best-effort: a failed stamp never throws (the email has already gone), whether the function errs, the fallback errs or the request throws",
    threw.length === 0,
    threw.join(", ")
  );
}

/* ---- 2. the route ------------------------------------------------------- */

console.log("\n2. POST /api/voting-info");
const route = code("src/app/api/voting-info/route.ts");
const at = (re: RegExp) => route.search(re);
const upsert = at(/\.upsert\(\s*\{ email, zip5: zip, active: true \}/);
const throttle = at(/await welcomeSentWithinWindow\(service, email, zip\)/);
const skip = at(/if \(sentRecently\) return signedUp\(\);/);
const events = at(/await verifiedElectionEvents\(/);
const send = at(/resend\.emails\.send\(/);
const stamp = at(/await markWelcomeSent\(service, subscription\.unsubscribe_token\);/);
const sendErrorCheck = at(/if \(sendError\) \{/);
check(
  "upsert, then the 24-hour check with the normalised address and the ZIP, then the dates read and the send",
  upsert > 0 && throttle > upsert && skip > throttle && events > skip && send > events,
  `upsert ${upsert}, check ${throttle}, skip ${skip}, events ${events}, send ${send}`
);
check(
  "the address checked is the trimmed, lower-cased one the row was saved under",
  /const email = parsed\.data\.email\.trim\(\)\.toLowerCase\(\);/.test(route) &&
    at(/const email = parsed\.data\.email/) < upsert
);
const okLiterals = route.match(/\{\s*ok:\s*true\s*\}/g) ?? [];
const returns = [...route.matchAll(/return signedUp\(\);/g)].map((m) => m.index);
check(
  "one success answer, { ok: true }, in one function: the skip and the send both return signedUp()",
  okLiterals.length === 1 &&
    /function signedUp\(\) \{\s*return NextResponse\.json\(\{ ok: true \}\);\s*\}/.test(route) &&
    returns.length === 2 &&
    returns[0] === skip + "if (sentRecently) ".length &&
    returns[1] > stamp,
  `${okLiterals.join(" | ")}; returns at ${returns.join(", ")}`
);
check(
  "a failed check sends nothing and answers like a failed send: saved, not sent, 502",
  /try \{\s*sentRecently = await welcomeSentWithinWindow\(service, email, zip\);\s*\} catch \{\s*return NextResponse\.json\(\s*\{ error: "We saved your request but the email didn't send — try again shortly\." \},\s*\{ status: 502 \}\s*\);\s*\}/.test(
    route
  )
);
check(
  "last_sent_at is stamped (markWelcomeSent, by the subscription's token) only after Resend accepted the email",
  stamp > 0 && stamp > sendErrorCheck && sendErrorCheck > send,
  `send ${send}, sendError ${sendErrorCheck}, stamp ${stamp}`
);
check(
  "the route writes last_sent_at only through markWelcomeSent, once, and never by an address filter",
  !/last_sent_at|\.eq\("unsubscribe_token"|\.eq\("email"/.test(route) &&
    (route.match(/markWelcomeSent\(/g) ?? []).length === 1
);
const writers = [
  "src/app/api/cron/send-reminders/route.ts",
  "src/app/api/cron/send-correction/route.ts",
  "src/lib/notifications/cohort.ts",
  "src/lib/notifications/rehearsal.ts",
].filter((f) => /last_sent_at|markWelcomeSent|subscription_mark_welcomed/.test(code(f)));
check(
  "neither cron writes last_sent_at, so only the welcome email counts (said in the module)",
  writers.length === 0 && /Neither cron\s+writes the column/.test(source("src/lib/notifications/welcome-throttle.ts")),
  writers.join(", ")
);
check(
  "welcome-throttle.ts has no server-only and no @/ import (plain Node loads it)",
  !/server-only|from "@\//.test(code("src/lib/notifications/welcome-throttle.ts"))
);

/* ---- 3. the form -------------------------------------------------------- */

console.log("\n3. The signup form's success line");
const form = code("src/components/features/VotingInfo.tsx");
const lines = [...form.matchAll(/"(Done\.[^"]*|Sent\.[^"]*)"/g)].map((m) => m[1]);
check(
  "both success lines hold when this request sent nothing: no \"Sent.\", and they say the email goes once a day per ZIP",
  lines.length === 2 &&
    lines.every((l) => !l.startsWith("Sent.") && /at most once a day for each ZIP/.test(l)),
  lines.join("\n      ")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nWelcome throttle checks passed.");
