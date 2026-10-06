/* Every email to a subscriber carries RFC 8058 one-click unsubscribe
   headers, built by one helper, and the founder's digests do not.

   Gmail and Yahoo expect "List-Unsubscribe" and "List-Unsubscribe-Post"
   from bulk senders, and a mail app shows its own Unsubscribe button only
   when they are there. None of the five sends to a subscriber carried
   them. unsubscribeHeaders() in src/lib/site-url.ts now builds both from
   the subscriber's token:

     1. THE HELPER. Exactly the two headers: the footer's own https link in
        angle brackets, and "List-Unsubscribe=One-Click". No mailto (the
        repo has no mailbox that processes unsubscribes). It follows
        NEXT_PUBLIC_SITE_URL as the footer link does.
     2. RESEND CARRIES THEM, per email, in emails.send and in each item of
        batch.send: the installed package's types keep `headers` on a batch
        item, and its client, run here against a stubbed fetch (no network,
        no key), puts each item's headers in the request body.
     3. EVERY SENDER. Each call to resend.emails.send or resend.batch.send
        that mails a subscriber (the welcome email; each reminder and its
        rehearsal; each correction and its rehearsal) passes
        unsubscribeHeaders() with the same token as the email's own
        unsubscribe link. The two digests to EMAIL_FROM carry none. No
        other file sends email.

   Run: node scripts/verify-list-unsubscribe.ts */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resend } from "resend";
import { unsubscribeHeaders, unsubscribeUrl } from "../src/lib/site-url.ts";

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

const TOKEN = "0123456789abcdef0123456789abcdef";

/* ---- 1. the helper ------------------------------------------------------ */

console.log("1. unsubscribeHeaders()");
{
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const h = unsubscribeHeaders(TOKEN);
  check(
    "exactly List-Unsubscribe and List-Unsubscribe-Post",
    Object.keys(h).sort().join() === "List-Unsubscribe,List-Unsubscribe-Post",
    Object.keys(h).join()
  );
  check(
    "List-Unsubscribe is the footer's link in angle brackets",
    h["List-Unsubscribe"] === `<${unsubscribeUrl(TOKEN)}>` &&
      h["List-Unsubscribe"] ===
        `<https://knowyour.vote/api/voting-info/unsubscribe?token=${TOKEN}>`,
    h["List-Unsubscribe"]
  );
  check(
    'List-Unsubscribe-Post is "List-Unsubscribe=One-Click"',
    h["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click"
  );
  check("https only, no mailto", !/mailto:/i.test(JSON.stringify(h)));
  process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example/";
  check(
    "follows NEXT_PUBLIC_SITE_URL, as the footer link does",
    unsubscribeHeaders(TOKEN)["List-Unsubscribe"] ===
      `<https://preview.example/api/voting-info/unsubscribe?token=${TOKEN}>`
  );
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
}

/* ---- 2. Resend carries per-email headers ------------------------------- */

console.log("\n2. The installed Resend client sends each email's headers");
const types = source("node_modules/resend/dist/index.d.mts");
const base = types.slice(
  types.indexOf("interface CreateEmailBaseOptions {"),
  types.indexOf("type CreateEmailOptions =")
);
check(
  "CreateEmailBaseOptions has headers?: Record<string, string>",
  /\n\s*headers\?: Record<string, string>;/.test(base)
);
const batchType = types.match(/type CreateBatchEmailOptions = Omit<CreateEmailOptions, ([^>]+)>;/)?.[1] ?? "";
check(
  "a batch item is CreateEmailOptions without attachments and scheduledAt, so it keeps headers",
  batchType !== "" && !/headers/.test(batchType),
  batchType
);
{
  const bodies: unknown[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ data: [{ id: "x" }], id: "x" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const resend = new Resend("re_offline_test_key");
    const other = "fedcba9876543210fedcba9876543210";
    await resend.batch.send([
      { from: "a@knowyour.vote", to: "x@example.com", subject: "s", text: "t", headers: unsubscribeHeaders(TOKEN) },
      { from: "a@knowyour.vote", to: "y@example.com", subject: "s", text: "t", headers: unsubscribeHeaders(other) },
    ]);
    await resend.emails.send({
      from: "a@knowyour.vote", to: "x@example.com", subject: "s", text: "t", headers: unsubscribeHeaders(TOKEN),
    });
    const [batch, single] = bodies as [Array<{ headers?: unknown }>, { headers?: unknown }];
    check(
      "batch.send: each item's own headers are in the request body",
      Array.isArray(batch) &&
        JSON.stringify(batch[0]?.headers) === JSON.stringify(unsubscribeHeaders(TOKEN)) &&
        JSON.stringify(batch[1]?.headers) === JSON.stringify(unsubscribeHeaders(other)),
      JSON.stringify(batch)
    );
    check(
      "emails.send: the headers are in the request body",
      JSON.stringify(single?.headers) === JSON.stringify(unsubscribeHeaders(TOKEN)),
      JSON.stringify(single)
    );
  } finally {
    globalThis.fetch = realFetch;
  }
}

/* ---- 3. every sender ---------------------------------------------------- */

console.log("\n3. Every send to a subscriber carries them; the digests do not");

/* The argument text of every resend.<emails|batch>.send( call, matched by
   parentheses with string and template literals skipped. */
function sendCalls(text: string): { kind: "emails" | "batch"; arg: string }[] {
  const out: { kind: "emails" | "batch"; arg: string }[] = [];
  for (const m of text.matchAll(/resend\.(emails|batch)\.send\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (c === '"' || c === "'" || c === "`") {
        const q = c;
        i++;
        while (i < text.length && text[i] !== q) i += text[i] === "\\" ? 2 : 1;
      } else if (c === "(") depth++;
      else if (c === ")") depth--;
      i++;
    }
    out.push({ kind: m[1] as "emails" | "batch", arg: text.slice(start, i - 1) });
  }
  return out;
}

const DIGEST_TO = /\bto: process\.env\.EMAIL_FROM!/;
const SENDERS: {
  file: string;
  /* Per subscriber call, in source order: the to: expression and the token
     its unsubscribe link is built from. */
  subscriber: { kind: "emails" | "batch"; to: string; token: string; link: RegExp }[];
  digests: number;
}[] = [
  {
    file: "src/app/api/voting-info/route.ts",
    subscriber: [
      {
        kind: "emails",
        to: "email",
        token: "subscription.unsubscribe_token",
        link: /unsubscribeUrl: unsubscribeUrl\(subscription\.unsubscribe_token\)/,
      },
    ],
    digests: 0,
  },
  {
    file: "src/app/api/cron/send-reminders/route.ts",
    subscriber: [
      { kind: "batch", to: "sub.email", token: "sub.unsubscribe_token", link: /text: reminderText\(rendered, sub\.unsubscribe_token\)/ },
      { kind: "batch", to: "sub.email", token: "sub.unsubscribe_token", link: /text: reminderText\(rendered, sub\.unsubscribe_token\)/ },
    ],
    digests: 1,
  },
  {
    file: "src/app/api/cron/send-correction/route.ts",
    subscriber: [
      { kind: "batch", to: "sub.email", token: "sub.unsubscribe_token", link: /text: reminderText\(rendered, sub\.unsubscribe_token\)/ },
      { kind: "batch", to: "sub.email", token: "sub.unsubscribe_token", link: /text: reminderText\(rendered, sub\.unsubscribe_token\)/ },
    ],
    digests: 1,
  },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const { file, subscriber, digests } of SENDERS) {
  const text = code(file);
  const calls = sendCalls(text);
  const toSubscribers = calls.filter((c) => !DIGEST_TO.test(c.arg));
  const toFounder = calls.filter((c) => DIGEST_TO.test(c.arg));
  check(
    `${file}: ${subscriber.length} send(s) to subscribers, ${digests} digest(s)`,
    toSubscribers.length === subscriber.length && toFounder.length === digests,
    `found ${toSubscribers.length} and ${toFounder.length}`
  );
  toSubscribers.forEach((call, n) => {
    const want = subscriber[n];
    if (!want) return;
    const headers = new RegExp(`headers: unsubscribeHeaders\\(${esc(want.token)}\\)`);
    check(
      `${file}, send ${n + 1} (${call.kind}.send to ${want.to}): headers: unsubscribeHeaders(${want.token})`,
      call.kind === want.kind &&
        new RegExp(`\\bto: ${esc(want.to)},`).test(call.arg) &&
        headers.test(call.arg) &&
        (want.kind === "emails" ? want.link.test(text) : want.link.test(call.arg)),
      call.arg.trim()
    );
  });
  toFounder.forEach((call) => {
    check(`${file}: the digest to EMAIL_FROM carries no unsubscribe headers`, !/headers:|unsubscribeHeaders/.test(call.arg));
  });
  check(
    `${file}: imports unsubscribeHeaders from @/lib/site-url`,
    subscriber.length === 0 ||
      /import \{[^}]*\bunsubscribeHeaders\b[^}]*\} from "@\/lib\/site-url";/.test(text)
  );
}

/* No sender outside the three routes, where this check would not see it. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}
const senders = files(path.join(root, "src"))
  .filter((f) => /\.(emails|batch)\.send\(|new Resend\(/.test(readFileSync(f, "utf8")))
  .map((f) => path.relative(root, f))
  .sort();
check(
  "no other file under src/ sends email",
  senders.join() === SENDERS.map((s) => s.file).sort().join(),
  senders.join(", ")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nList-Unsubscribe checks passed.");
