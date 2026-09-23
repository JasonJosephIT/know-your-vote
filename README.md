# Know Your Vote

**Live at [knowyour.vote](https://knowyour.vote).**

The voter-facing web app of the Civic Awareness Project (CAP): a nonpartisan
civic tool that lets a Florida voter enter a ZIP code and see every candidate
in their races side by side — **What They Say**, **What They've Done**, and
**Fact-Check** cleanly separated, every claim traceable to a source.

The app is a presentation layer only. The CAP pipeline (Profiler / Record /
Fact-Checker / Orchestrator + deterministic Balance Audit) writes
neutrality-audited data to Supabase; this app **reads** what has passed the
audit and been published, and never authors, edits, or reorders a claim.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + RLS) · Anthropic Claude (quiz) · Resend (opt-in email) ·
Plausible (cookieless analytics) · Sentry (PII-scrubbed) · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

## Environment variables

[.env.example](.env.example) is the canonical list of **names**; it never
holds a value. Locally the values go in `.env.local` (gitignored — `.gitignore`
matches `.env*`). For the deployed app they live in Vercel → Settings →
Environment Variables and nowhere else. A secret that reaches a git history or
a chat transcript is burned: rotate it, don't delete it.

`NEXT_PUBLIC_` is a one-way door — Next.js inlines those values into the
browser bundle at build time. Everything else is server-only and must never
gain that prefix. `src/lib/supabase/service.ts` and `src/lib/geocode.ts` import
`server-only`, so pulling them into a client component is a build error rather
than a leak.

### Required to boot

- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project this app reads.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the key behind every public read. Public
  by design: RLS, not secrecy, is the boundary (`0002_rls.sql`).

Nothing else is needed to run `npm run dev`. Every other variable turns one
feature on, and each feature says so plainly when its key is absent — a
missing key degrades a surface, it never fakes one.

### Feature keys, and what happens without them

- `SUPABASE_SERVICE_ROLE_KEY` — the two app-owned write paths: voting-info
  signups and the news cron's `news_item` upserts. Bypasses RLS, so it is
  server-only in the strongest sense. Unset → `POST /api/voting-info` returns
  503 with nothing sent or stored, and the news cron returns 503 with
  yesterday's feed left intact.
- `ANTHROPIC_API_KEY` — the Find My Candidates quiz. Unset → the quiz returns
  503 ("the quiz is taking a quick break") and every candidate's full brief
  stays open below it.
- `PELIAS_BASE_URL` — address completion in the location field. **Where it
  points is the privacy decision, and it is made here rather than in code:**
  an instance you host (`deploy/pelias/`) means no third party ever sees a
  voter's address; `https://api.geocode.earth` means a geocoding company
  does. `/privacy` reads the configured host, so the page stays true without
  anyone remembering to edit the prose. Unset → `/api/address/suggest`
  answers 503 `unavailable`, the field takes a ZIP, and the district picker
  still works.
- `PELIAS_API_KEY` — hosted Pelias only; Geocode Earth authenticates by query
  parameter. A self-hosted instance normally needs nothing here, so an absent
  key is normal rather than an error.
- `RESEND_API_KEY` + `EMAIL_FROM` — opt-in transactional email: the
  voting-info reply and the deadline reminders. Both are required; one alone
  counts as unconfigured. Unset → the voting-info POST and the reminder cron
  both return 503 without sending or storing anything.
- `CRON_SECRET` — authenticates both cron routes. Vercel Cron invokes with
  `GET` + `Authorization: Bearer …`; the manual contract is `POST` +
  `x-cron-secret`. Compared in constant time (`secretEquals`), never `===`.
  Unset → fail-closed: every cron request gets 401, Vercel's included.
- `ADMIN_EMAILS` — the admin console's entire authorization surface: a
  comma-separated, case-folded allowlist of Supabase Auth emails. Unset →
  sign-in is closed and `/admin/login` says "Admin sign-in isn't configured
  yet." rather than pretending otherwise.
- `TYPESAFE_API_KEY` — the news issue characterizer
  (`scripts/news-characterize.ts`). Unset → the run refuses to start, loudly,
  because a silent skip looks exactly like "no issues found".

### Switches

- `NOTIFICATIONS_PAUSED` — pauses outbound reminder sends without a redeploy.
  **Any non-empty value pauses**, including the string `false`; to resume,
  remove the variable.
- `SHOW_CANDIDATE_CONTACT` — renders the campaign-contact block, and only
  when set to exactly `true`. Held until the first real R2 refresher run has
  been reviewed.

### Optional — URLs, analytics, error reporting

- `NEXT_PUBLIC_SITE_URL` — canonical origin for `sitemap.xml`, `robots.txt`,
  the OG metadata base, and the admin magic-link fallback. Falls back to
  `https://knowyour.vote`, the production domain, so an unset value is only
  wrong on a preview deployment.
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — loads the cookieless analytics script.
  Unset → no script at all.
- `NEXT_PUBLIC_SENTRY_DSN` — browser error reporting, loaded lazily after
  hydration so the SDK stays out of the initial bundle. Unset → never loaded.
- `SENTRY_DSN` — server error reporting, PII-scrubbed (verified by
  `node scripts/verify-sentry-scrub.ts`). Unset → Sentry stays disabled.

### Admin console integrations (optional)

The admin Site page pulls deploy health and recent errors. Each panel names
the exact variable it is missing instead of going blank, so "not wired" and
"wired but quiet" stay tellable apart.

- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` — the Deployments panel; add
  `VERCEL_TEAM_ID` when the project sits in a team.
- `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` — the Errors panel.
  `SENTRY_URL` only for self-hosted Sentry (defaults to `https://sentry.io`).

### Not the web app

The tail of `.env.example` — `SUPABASE_DB_URL`, `FEC_API_KEY`, `TWILIO_*`,
`CAP_*` — belongs to the CAP pipeline, which runs locally under
`Civic Awareness (Know Your Vote)/toollayer/`. Vercel never needs them.
`CAP_AGENT_ID`, `CAP_LOG_SINK`, and `CAP_DISPATCH_TOKEN` are set by the
launcher per process, never by hand.

### Scripts and local development

Scripts that need keys load `.env.local` themselves — most with
`process.loadEnvFile`, the news characterizers through
`scripts/env-local.ts`, which also falls back to the main checkout's file
when run from a `.claude/worktrees/…` worktree and prints to stderr which
file it used. The migration and Sentry-scrub checks under
[Database](#database) need no keys at all.

Address completion can be exercised without a geocoder account or a 20GB
Elasticsearch import — `scripts/pelias-stub.mjs` serves a handful of real
Florida addresses in the exact shape `/v1/autocomplete` returns:

```bash
node scripts/pelias-stub.mjs             # listens on 127.0.0.1:4000
PELIAS_BASE_URL=http://127.0.0.1:4000 npm run dev
```

## Database

`supabase/migrations/` holds, in order:

- `0000_pipeline_read_models.sql` — the pipeline-owned read models per
  `CAP_Schema_v1.md` (created from here only because the shared project was
  empty at app-build time; the pipeline owns these tables).
- `0001_app_tables.sql` — the four app-owned tables (`zip_district`,
  `race_publication`, `news_item`, `voting_info_subscription`).
- `0002_rls.sql` — Row-Level Security: anon reads published races only and
  can never touch `voting_info_subscription`.

Verify migrations + RLS invariants locally (embedded Postgres, no cloud):

```bash
node scripts/verify-migrations.mjs
node scripts/verify-sentry-scrub.ts
```

## Demo data

The live database holds **no demo data**. The nine `demo-*` races — clearly
fictional fixtures (every person and program invented, sources pointing at
example.org) that let the app be built and verified before the CAP pipeline
produced anything real — were dropped from the live project on 2026-09-21 by
the `drop_demo_races` migration. They were `draft` and never voter-visible,
but their office names (`Governor of Florida`, `U.S. House — District 10`) did
not announce themselves as fake, and they were one publication flip away from
reading as real content.

The seed scripts remain in `scripts/` (`build-demo-seed.mjs`,
`demo-seed*.sql`, `demo-teardown.sql`) for the local verification harness
only — `node scripts/verify-demo-seed.mjs` replays them into embedded
Postgres. **Never run them against the live project, and never seed a real
race from them**: their content is invented, and a real race's positions come
from the candidate's own material with a citation per claim.

## Going live — the short list

1. Fill in `.env.local` / Vercel env: `SUPABASE_SERVICE_ROLE_KEY` (enables
   voting-info storage + the news cron), `CRON_SECRET` (without it both cron
   routes 401, Vercel's own invocation included), `ANTHROPIC_API_KEY` (enables
   the quiz), `RESEND_API_KEY` + `EMAIL_FROM` (enables the email),
   `ADMIN_EMAILS` (opens admin sign-in), and optionally
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` /
   `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN`. See
   [Environment variables](#environment-variables) for what each one degrades
   to when it's absent.
2. In Vercel → Settings → Deployment Protection, set Vercel Authentication to
   "Only Preview Deployments" so the production URL is public. **Done
   2026-09-23**: `knowyour.vote` and the production `*.vercel.app` URLs are
   public; preview deployments still require a Vercel login.
3. Apply `supabase/migrations/0033_listed_publication.sql` live, **after**
   the code that renders the listed tier has deployed. On its own it makes
   nothing visible: it widens what `listed` could show and seeds a `draft`
   `race_publication` row for every general-election race, so the door has
   something to flip.
4. Run `scripts/list-ballot-2026.sql` by hand. It flips every `draft` general
   race to `listed` through `set_race_publication` (one `admin_action` row per
   race) and inserts `listed` rows for the three amendments. That puts the
   roster and the ballot text in front of voters, and not one brief. The
   script's header says how to reverse it.
5. Run real races through the pipeline's Balance Audit and publish only
   passes (roadmap TASK-050 — the launch gate).

The order of 3 and 4, and why, is in
`docs/general-election/listed-tier-2026-09-23.md`.

## The one non-negotiable

Every claim shown is audited pipeline output, presented with equal space and
equal scrutiny. A race's **brief** — profiles, issues, positions, claims and
their sources — is publicly reachable only when every candidate Profile has
`balance_check_passed = true` **and** `race_publication.status =
'published'`; a ballot measure's arguments only when both sides are present,
balanced, and `measure_publication.status = 'published'`. Enforced in RLS and
the read queries, not just the UI.

Before that there is one lower tier, `listed`, and it carries no claims. At
`listed` a voter can see the **roster** and nothing else: the race, the names
printed on the ballot (`race.candidate_ids`, ballot tier only), party as
filed, the official site where it was verified by reading the page, verified
social handles, whether the seat was already decided, and an amendment's
verbatim ballot text. That is public record from the Division of Elections
and the county Supervisors of Elections, not our writing. Migration `0033`
enforces the split in RLS: it widens only the roster policies (`race`,
`candidate`, `race_publication`, `candidate_social_account`,
`ballot_measure`, `measure_publication`), and leaves every brief-table policy
(`profile`, `issue`, `position`, `claim`, `claim_source`, `measure_argument`)
reading `'published'` exactly as `0002` and `0011` wrote them — so a listed
race cannot leak an unaudited claim, whatever rows sit beneath it.

Candidate order is a fixed neutral rule. Party chips are never color-coded.
See `docs/` for the PRD, vision, roadmap, and design system.
