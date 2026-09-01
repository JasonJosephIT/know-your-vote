# Hosting on Cloudflare Workers

Replaces Vercel. The app runs as a single Cloudflare Worker built by the
[OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare), with R2 and
D1 behind the Next.js cache and Cron Triggers in place of `vercel.json` crons.

---

## What changed, and why

| Vercel | Cloudflare |
|---|---|
| `vercel.json` `crons` | `wrangler.jsonc` `triggers.crons` → `scheduled()` in `worker.ts` |
| Implicit ISR cache | R2 bucket (`NEXT_INC_CACHE_R2_BUCKET`) |
| Implicit `revalidateTag` | D1 database (`NEXT_TAG_CACHE_D1`) |
| Dashboard env vars | Build-time `.env` **and** Worker secrets — see below |
| `src/proxy.ts` (admin gate) | Removed — `/admin/auth/refresh` + `requireAdmin()` |

Three of those deserve the detail.

### The proxy had to go

Next.js 16 renamed Middleware to **Proxy** and made it **Node-runtime only** —
`runtime` is not a valid export in a Proxy file and setting it throws. OpenNext
in turn states plainly that *"Running Next.js Node.js middleware on workerd is
experimental and is not supported by the OpenNext maintainers."* In practice it
fails at build time: Next's tracer imports `@opentelemetry/api` (pulled in by
`@sentry/nextjs`), Next traces it through its CJS `main`, so `copyTracedFiles`
never copies `build/esm`, and esbuild — which prefers the `module` field —
cannot resolve it. That is
[opennextjs-cloudflare#969](https://github.com/opennextjs/opennextjs-cloudflare/issues/969),
still open, with no working upstream workaround. Removing `src/proxy.ts` makes
the build pass cleanly.

**No authorization was lost.** The proxy was UX only, and said so: the real
boundary is `requireAdmin()` inside every admin layout, page, and route
handler, precisely because Next.js middleware is a known bypass class
(CVE-2025-29927). Its two jobs were re-homed:

- *Redirect unauthenticated visitors* — already done by `requireAdmin()` in
  `src/app/admin/(console)/layout.tsx` and again in every page.
- *Refresh the Supabase session cookie* — moved to
  `POST /admin/auth/refresh`. Server Components cannot write cookies (which is
  why this lived in the proxy); route handlers can. `SessionRefresh` pings it
  on mount, every 30 minutes, and on tab focus.

### Environment variables are in two places, not one

This is the migration's sharpest edge. On Vercel one dashboard covered both
build and runtime. On Cloudflare they are genuinely separate:

- **`NEXT_PUBLIC_*` are inlined into the bundle at `next build`.** They must
  exist in the **build** environment. `wrangler secret put` happens after the
  build and cannot reach them — a `NEXT_PUBLIC_` value set only as a secret
  silently ends up `undefined` in the shipped JavaScript.
- **Server-only values are read at runtime** and belong in Worker secrets.

| Variable | Where it goes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | build env (`.env.local` / CI) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build env |
| `NEXT_PUBLIC_SITE_URL` | build env **and** `wrangler.jsonc` `vars` |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | build env |
| `NEXT_PUBLIC_SENTRY_DSN` | build env |
| `SUPABASE_SERVICE_ROLE_KEY` | `wrangler secret put` |
| `ANTHROPIC_API_KEY` | `wrangler secret put` |
| `RESEND_API_KEY` | `wrangler secret put` |
| `EMAIL_FROM` | `wrangler secret put` |
| `CRON_SECRET` | `wrangler secret put` |
| `ADMIN_EMAILS` | `wrangler secret put` |
| `NOTIFICATIONS_PAUSED` | `wrangler secret put` (optional) |
| `SENTRY_DSN` | `wrangler secret put` |

`NEXT_PUBLIC_SITE_URL` appears twice on purpose: the build needs it for
`robots.ts`, `sitemap.ts`, and `layout.tsx` metadata, and the Worker needs it
at runtime so `scheduled()` can build reminder emails' unsubscribe links
against the real origin.

### The compatibility date is load-bearing

`compatibility_date` must be **`2025-08-16` or later**. That date adds
`https.request` to the Workers runtime, which `@sentry/nextjs` needs in order
to transmit anything. On an earlier date the app still serves traffic while
server-side error reporting silently goes nowhere. We pin `2026-03-01`.

---

## First deploy

Steps 1–3 need your Cloudflare account and can only be done by you.

**1. Create the two backing resources.**

```bash
npx wrangler login
npx wrangler r2 bucket create know-your-vote-opennext-cache
npx wrangler d1 create know-your-vote-tag-cache
```

Paste the `database_id` that the D1 command prints into `wrangler.jsonc`,
replacing `REPLACE_WITH_D1_DATABASE_ID`. It is not a secret.

**2. Set the Worker secrets** (each prompts for the value):

```bash
for s in SUPABASE_SERVICE_ROLE_KEY ANTHROPIC_API_KEY RESEND_API_KEY \
         EMAIL_FROM CRON_SECRET ADMIN_EMAILS SENTRY_DSN; do
  npx wrangler secret put "$s"
done
```

**3. Point `NEXT_PUBLIC_SITE_URL` at the real hostname** in `wrangler.jsonc`
(and in your build `.env`). Until a custom domain is attached this is the
`*.workers.dev` URL; with one, it is the custom domain. Getting this wrong
mails out broken unsubscribe links, so change it before the first cron fires.

**4. Deploy.**

```bash
npm run deploy       # opennextjs-cloudflare build && ... deploy
```

`npm run preview` runs the same build locally in workerd first, which is worth
doing once before the real deploy.

---

## Verifying the crons

The two Cron Triggers are the piece with no UI feedback until they fire, so
check them explicitly:

```bash
# Should list both "0 10 * * *" and "0 14 * * *"
npx wrangler deployments list

# Drive a scheduled event without waiting for the clock
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+10+*+*+*"
```

`worker.ts` throws when `CRON_SECRET` or `NEXT_PUBLIC_SITE_URL` is missing, so
a misconfigured run shows as a failed invocation in the dashboard rather than
a silent success. That is deliberate: a quiet no-send on a deadline day is the
one outcome the notification design refuses to accept.

---

## Known follow-ups

- **`*.vercel.app` fallbacks remain** in `src/app/robots.ts`,
  `src/app/sitemap.ts`, and `src/app/layout.tsx`. They only apply when
  `NEXT_PUBLIC_SITE_URL` is unset, but while they say `vercel.app` an unset
  variable produces a sitemap pointing at the old host. Worth replacing once
  the final domain is known.
- **Worker size**: 2.28 MB gzipped against a 3 MB limit on the Workers free
  plan. There is room, but not a lot — watch it when adding dependencies.
- **`queue: "direct"`** in `open-next.config.ts` runs ISR revalidation inline
  instead of through a Durable Object, keeping the deploy off a paid plan.
  Revisit if revalidation volume grows.
- **Three pre-existing lint errors** (`react-hooks/set-state-in-effect` in
  `NewsFeed`, `SavedCandidates`, `SaveToggle`) are unrelated to hosting and
  were present before this change.
