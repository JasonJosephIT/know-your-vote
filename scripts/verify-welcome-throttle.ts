/* One welcome email per address per 24 hours, and the same answer either
   way.

   POST /api/voting-info saved the subscription and sent the welcome email
   on every request, so anyone could make the site mail any address five
   times a minute per IP (more across serverless instances), spending the
   Resend quota and inviting spam complaints. The route now asks
   welcomeSentWithinWindow() (src/lib/notifications/welcome-throttle.ts)
   after saving and before sending:

     1. THE QUERY it sends, recorded with a fake Supabase client that also
        applies the recorded filters to in-memory rows: any row for exactly
        this address with last_sent_at in the last 24 hours. Stamped 23h59m
        ago counts, 24h01m ago does not, NULL never does, another ZIP's row
        for the same address does, another address's never does. A
        database error throws.
     2. THE ROUTE. Upsert first (the subscription is saved or switched
        back on either way), then the check, then the dates read and the
        send. A recent send skips both and returns the very same success
        answer as a send, from one function, so the endpoint never says
        whether an address is already subscribed. A failed check sends
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

type Row = { id: string; email: string; zip5: string; last_sent_at: string | null };
type Call = [string, ...unknown[]];

/* Records the chain, then answers it the way PostgREST would for these
   rows: eq is equality, gte skips NULL, limit caps. Anything else in the
   chain is a failure to look at, not something to guess about. */
function fakeTable(rows: Row[], error: unknown = null) {
  const calls: Call[] = [];
  const answer = () => {
    if (error) return { data: null, error };
    let out = [...rows];
    let unknown = "";
    for (const [op, ...args] of calls.slice(1)) {
      const [col, value] = args as [keyof Row, unknown];
      if (op === "select") continue;
      else if (op === "eq") out = out.filter((r) => r[col] === value);
      else if (op === "gte") out = out.filter((r) => r[col] !== null && String(r[col]) >= String(value));
      else if (op === "limit") out = out.slice(0, args[0] as number);
      else unknown = op;
    }
    return unknown
      ? { data: null, error: { message: `unexpected .${unknown}()` } }
      : { data: out.map((r) => ({ id: r.id })), error: null };
  };
  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(answer()).then(resolve, reject);
        }
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
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const NOW = new Date("2026-10-06T15:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const H = 60 * 60 * 1000;
const M = 60 * 1000;
const ANA = "ana@example.com";

{
  const t = fakeTable([]);
  await welcomeSentWithinWindow(t.client, ANA, NOW);
  check(
    "reads voting_info_subscription: any row with exactly this address and last_sent_at >= now - 24h",
    JSON.stringify(t.calls) ===
      JSON.stringify([
        ["from", "voting_info_subscription"],
        ["select", "id"],
        ["eq", "email", ANA],
        ["gte", "last_sent_at", "2026-10-05T15:00:00.000Z"],
        ["limit", 1],
      ]),
    JSON.stringify(t.calls)
  );
}

const CASES: [string, Row[], boolean][] = [
  ["never signed up", [], false],
  ["signed up, the email failed (last_sent_at NULL)", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: null }], false],
  ["mailed 23h59m ago", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: ago(23 * H + 59 * M) }], true],
  ["mailed exactly 24h ago", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: ago(24 * H) }], true],
  ["mailed 24h01m ago", [{ id: "1", email: ANA, zip5: "33130", last_sent_at: ago(24 * H + M) }], false],
  [
    "this ZIP's row is old, but the address's other ZIP was mailed an hour ago",
    [
      { id: "1", email: ANA, zip5: "33130", last_sent_at: ago(72 * H) },
      { id: "2", email: ANA, zip5: "32801", last_sent_at: ago(H) },
    ],
    true,
  ],
  ["someone else was mailed an hour ago", [{ id: "1", email: "bo@example.com", zip5: "33130", last_sent_at: ago(H) }], false],
];
for (const [label, rows, expected] of CASES) {
  const got = await welcomeSentWithinWindow(fakeTable(rows).client, ANA, NOW);
  check(`${label}: ${expected ? "skip the send" : "send"}`, got === expected, `got ${got}`);
}
{
  let threw = false;
  try {
    await welcomeSentWithinWindow(fakeTable([], { message: "timeout" }).client, ANA, NOW);
  } catch {
    threw = true;
  }
  check("a database error throws (never reads as \"not sent\")", threw);
}

/* ---- 2. the route ------------------------------------------------------- */

console.log("\n2. POST /api/voting-info");
const route = code("src/app/api/voting-info/route.ts");
const at = (re: RegExp) => route.search(re);
const upsert = at(/\.upsert\(\s*\{ email, zip5: zip, active: true \}/);
const throttle = at(/await welcomeSentWithinWindow\(service, email\)/);
const skip = at(/if \(sentRecently\) return signedUp\(\);/);
const events = at(/await verifiedElectionEvents\(/);
const send = at(/resend\.emails\.send\(/);
const stamp = at(/\.update\(\{ last_sent_at: /);
const sendErrorCheck = at(/if \(sendError\) \{/);
check(
  "upsert, then the 24-hour check with the normalised address, then the dates read and the send",
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
  /try \{\s*sentRecently = await welcomeSentWithinWindow\(service, email\);\s*\} catch \{\s*return NextResponse\.json\(\s*\{ error: "We saved your request but the email didn't send — try again shortly\." \},\s*\{ status: 502 \}\s*\);\s*\}/.test(
    route
  )
);
check(
  "last_sent_at is stamped only after Resend accepted the email",
  stamp > sendErrorCheck && sendErrorCheck > send
);
const writers = [
  "src/app/api/cron/send-reminders/route.ts",
  "src/app/api/cron/send-correction/route.ts",
  "src/lib/notifications/cohort.ts",
].filter((f) => /last_sent_at/.test(code(f)));
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
  "both success lines hold when this request sent nothing: no \"Sent.\", and they say the email goes once a day",
  lines.length === 2 &&
    lines.every((l) => !l.startsWith("Sent.") && /at most once a day/.test(l)),
  lines.join("\n      ")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nWelcome throttle checks passed.");
