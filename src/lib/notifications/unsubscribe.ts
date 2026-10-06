import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_EMAIL } from "../contact.ts";

/* The unsubscribe link, end to end. src/app/api/voting-info/unsubscribe/
   route.ts only hands each request to unsubscribeResponse() below.

   GET shows a confirm page and never writes. It used to unsubscribe on the
   spot, and email security gateways (Mimecast, Proofpoint, Microsoft
   Defender's Safe Links) open the links in delivered mail to scan them,
   often before the voter has read anything. A voter behind one could have
   been unsubscribed by a scanner and missed every reminder after it.
   Scanners fetch links; they do not press buttons in forms. HEAD is GET in
   a route handler, so it never writes either.

   POST unsubscribes. It is both the confirm page's button and RFC 8058
   one-click: a mail app's own Unsubscribe button POSTs
   "List-Unsubscribe=One-Click" to the same link (the headers come from
   unsubscribeHeaders() in src/lib/site-url.ts). The body is not read. The
   token in the URL is the credential (PRD § 4), so there is no CSRF token,
   and both kinds of POST get the same answer: a page with a 2xx status.
   RFC 8058 rules out answering with a redirect.

   Why HTML from a route handler and not a page under src/app: every page
   renders inside the root layout, which loads Plausible (it reports
   location.href, token included, to plausible.io), the opt-in Google Ads
   tag and the client Sentry SDK. The token is a credential and stays on
   our server. A page also cannot answer 503 for a database error or set
   its own headers, and a mail provider's one-click POST cannot reach a
   page at all. So this file renders its five small pages itself, with the
   site's colours inline (src/app/globals.css) and no script.

   Errors are pages too, never JSON: a malformed or unknown token is a 404
   that says the link isn't valid and where to get help; a database error
   is a 503 that says to try again, never "unknown token".

   No server-only and no @/ imports, so scripts/verify-unsubscribe.ts can
   drive it in plain Node with a fake database. */

const TABLE = "voting_info_subscription";
const PATH = "/api/voting-info/unsubscribe";

/* The column default: encode(gen_random_bytes(16), 'hex'). */
export const UNSUBSCRIBE_TOKEN_RE = /^[a-f0-9]{32}$/;

/* What the route needs from the database. Every method throws on a
   database error, which becomes the 503 page. */
export type UnsubscribeStore = {
  /* The address on the token's row, or null when no row holds the token. */
  addressFor(token: string): Promise<string | null>;
  /* Whether any row for the address is still active. */
  subscribed(email: string): Promise<boolean>;
  /* Turns off every active row for the address, and says how many. */
  unsubscribe(email: string): Promise<number>;
};

export function subscriptionStore(service: SupabaseClient): UnsubscribeStore {
  return {
    async addressFor(token) {
      const { data, error } = await service
        .from(TABLE)
        .select("email")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.email ?? null;
    },
    async subscribed(email) {
      const { data, error } = await service
        .from(TABLE)
        .select("id")
        .eq("email", email)
        .eq("active", true)
        .limit(1);
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },
    /* The same rows the GET used to turn off: the token's row, and every
       active row for its address, in one statement (the token's row holds
       that address, so it is one of them). Rows are unique on (email,
       zip5), so a voter who signed up from two ZIPs holds two rows, and
       the cron (which dedupes by address) keeps mailing them while either
       is active; the page promises "we won't email you again". Exact match
       on purpose: the signup route stores addresses trimmed and
       lower-cased, and ilike would read "_" in an address as a wildcard
       and could stop someone else's mail. */
    async unsubscribe(email) {
      const { data, error } = await service
        .from(TABLE)
        .update({ active: false })
        .eq("email", email)
        .eq("active", true)
        .select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).length;
    },
  };
}

/* openStore may throw (no service-role key): that is the 503 page too. */
export async function unsubscribeResponse(
  method: "GET" | "POST",
  token: string | null,
  openStore: () => UnsubscribeStore
): Promise<Response> {
  if (!token || !UNSUBSCRIBE_TOKEN_RE.test(token)) return page("invalid");
  try {
    const store = openStore();
    const email = await store.addressFor(token);
    if (email === null) return page("invalid");
    if (method === "GET") {
      return (await store.subscribed(email))
        ? page("confirm", email, token)
        : page("already", email);
    }
    /* Nothing left to turn off: already unsubscribed, by an earlier click,
       the mail app's button or another row's link. Same answer, 200. */
    return (await store.unsubscribe(email)) > 0
      ? page("done", email)
      : page("already", email);
  } catch {
    return page("error");
  }
}

/* "jane.doe@gmail.com" -> "j***@gmail.com". Anyone holding the link sees
   the page, a forwarded email included, so it names the address only well
   enough for its owner to recognise. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "your address";
  return `${Array.from(email.slice(0, at))[0]}***${email.slice(at)}`;
}

type Kind = "confirm" | "done" | "already" | "invalid" | "error";

const STATUS: Record<Kind, number> = {
  confirm: 200,
  done: 200,
  already: 200,
  invalid: 404,
  error: 503,
};

const PAGE_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  /* The page names an address, if masked, and answers for one token. */
  "Cache-Control": "no-store",
  /* The token is in this page's URL; no request from it may carry that on. */
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  /* No script at all, only the inline style, a form that can post only to
     this site, and no framing: another site cannot dress the button up as
     something else and get it clicked. */
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const HELP = `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`;

function copy(kind: Kind, who: string, token: string) {
  switch (kind) {
    case "confirm":
      return {
        title: "Unsubscribe",
        heading: "Unsubscribe from Know Your Vote?",
        body: `<p>${who} will stop getting Know Your Vote emails, including the deadline reminders.</p>
<form method="post" action="${PATH}?token=${escapeHtml(token)}"><button type="submit">Unsubscribe</button></form>
<p class="note">Nothing changes until you press the button. Changed your mind? Just close this page.</p>`,
      };
    case "done":
      return {
        title: "You're unsubscribed",
        heading: "You're unsubscribed",
        body: `<p>We won't email ${who} again unless you ask.</p>`,
      };
    case "already":
      return {
        title: "Already unsubscribed",
        heading: "You're already unsubscribed",
        body: `<p>We're not sending anything to ${who}. There's nothing else to do.</p>`,
      };
    case "invalid":
      return {
        title: "Link not valid",
        heading: "This link isn't valid",
        body: `<p>Part of it may have been lost when it was copied. Try the link in the email again, or your mail app's own Unsubscribe button.</p>
<p>Still getting email from us? Write to ${HELP} and we'll take you off the list.</p>`,
      };
    case "error":
      return {
        title: "Something went wrong",
        heading: "Something went wrong",
        body: `<p>We couldn't reach our records just now. Try the link again in a few minutes.</p>
<p>If it keeps happening, write to ${HELP} and we'll take you off the list.</p>`,
      };
  }
}

/* The site's tokens from src/app/globals.css: background, surface, border,
   on-surface, on-surface-muted, primary, primary-hover, radius-lg and
   elevation-1. System fonts: the site's web fonts load through next/font,
   which only a page in the root layout gets. */
const STYLE = `:root{color-scheme:light}
body{margin:0;padding:32px 16px;background:#f6f3ec;color:#22271f;font:1rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:480px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e4ded2;border-radius:12px;box-shadow:0 1px 3px rgba(34,39,31,.06)}
.brand{margin:0 0 16px;font-size:.9375rem;font-weight:700}
.brand a{text-decoration:none}
h1{margin:0 0 12px;font-size:1.5rem;line-height:1.2;letter-spacing:-.01em}
p,form{margin:0 0 16px}
main>:last-child{margin-bottom:0}
.note{color:#585e52;font-size:.875rem;line-height:1.5}
strong{overflow-wrap:anywhere}
a{color:#2f6b4f;text-underline-offset:2px}
button{font:inherit;font-weight:600;min-height:44px;padding:10px 20px;border:0;border-radius:8px;background:#2f6b4f;color:#fff;cursor:pointer}
button:hover{background:#255a41}
a:focus-visible,button:focus-visible{outline:2px solid #2f6b4f;outline-offset:2px}`;

function page(kind: Kind, email = "", token = ""): Response {
  const who = `<strong>${escapeHtml(maskEmail(email))}</strong>`;
  const { title, heading, body } = copy(kind, who, token);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${title} — Know Your Vote</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<p class="brand"><a href="/">Know Your Vote</a></p>
<h1>${heading}</h1>
${body}
</main>
</body>
</html>
`;
  return new Response(html, {
    status: STATUS[kind],
    headers: PAGE_HEADERS,
  });
}
