# Know Your Vote

**Live at [knowyour.vote](https://knowyour.vote).**

The voter-facing web app of the Civic Awareness Project (CAP): a nonpartisan
voter guide for Florida's **November 3, 2026 general election**. A voter sees
everyone on their ballot, with no ZIP needed for the statewide races and
amendments, and can add a district or county for the rest. For each race with
a published brief, every candidate gets the same issues, fixed by office, and
under each issue **what the candidate says, quoted word for word from their
own campaign site**, with a link to the page it came from. Where a candidate's
site says nothing on an issue, the brief says "No stated position found".

What ships this cycle is **stated positions only**. Records ("What They've
Done") and fact-checks are not part of the 2026 general: every published
profile has `verifiable_fact_count = 0` and `fact_checks_performed = 0`
(`docs/general-election/launch-handoff-2026-10-04.md` §1). The schema keeps
room for them; nothing fills them this cycle.

The app is a presentation layer only. The briefs are built offline, never in
a request. The candidate-site ingest and the brief-rows writer produce them
(`docs/general-election/brief-runs/`), the CAP pipeline's deterministic
Balance Audit checks them, and a human publishes them. This app **reads** what
has passed the audit and been published, and never authors, edits, or
reorders a claim.

## Stack

Next.js 16 (App Router) · React · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + RLS) · Resend (opt-in email reminders) · Vercel (hosting and
cron) · Plausible (cookieless analytics, off until configured) · Sentry
(PII-scrubbed, off until configured) · Google Ads tag (loads only after a
visitor accepts the cookie banner).

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

**The NAME must match exactly.** The code reads each variable by its exact
name, and a near miss is the same as no variable at all: nothing warns, the
feature just stays off.

There is one deliberate exception. Vercel production stores the Supabase
service-role key as `SUPABASE` and the Resend API key as `RESEND` (the
founder's names, confirmed 2026-10-05). Until a later fix, nothing read them,
so the signup, both crons, the deadline banner and the calendar file all
failed. `instrumentation.ts` now copies them to `SUPABASE_SERVICE_ROLE_KEY`
and `RESEND_API_KEY` when the server starts, unless the correct name is
already set. `JEV` holds the TypeSafe key, which Vercel doesn't need
(`TYPESAFE_API_KEY` below). Every other variable must use the exact name.
After adding or renaming a variable,
compare its name against the list below character for character, then
redeploy (Vercel applies env changes only to new deployments). The fix and an
end-to-end test are in
[`docs/general-election/reminders-e2e-runbook.md`](docs/general-election/reminders-e2e-runbook.md).

Also unset in production on 2026-10-04, under any name:
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`,
`PELIAS_BASE_URL` and `ADMIN_EMAILS`. So knowyour.vote runs no analytics,
sends no error reports and offers no address completion, and the admin
console is closed.

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

- `SUPABASE_SERVICE_ROLE_KEY` — the two app-owned write paths (voting-info
  signups and the news cron's `news_item` upserts), the reminder cron, and
  every read of the verified election dates in `election_event`: the
  deadline banner on `/` and the calendar file `/api/calendar/general_2026.ics`.
  Bypasses RLS, so it is server-only in the strongest sense. Unset →
  `POST /api/voting-info` returns 503 with nothing sent or stored, both crons
  return 503 (the news feed keeps yesterday's items), the calendar file
  returns 503, and the deadline banner renders nothing.
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
  (`scripts/news-characterize.ts`) and the candidate-site ingest, both local
  scripts. No route, cron or page reads it, so Vercel does not need it. Unset
  → the run refuses to start, loudly, because a silent skip looks exactly
  like "no issues found".

### Switches

- `NOTIFICATIONS_PAUSED` — pauses outbound reminder sends without a code
  change. **Any non-empty value pauses**, including the string `false`; to
  resume, remove the variable. On Vercel an env change reaches only new
  deployments, so redeploy after setting or removing it.
- `SHOW_CANDIDATE_CONTACT` — renders the campaign-contact block, and only
  when set to exactly `true`. Held until the first real R2 refresher run has
  been reviewed.

### Optional — URLs, analytics, error reporting

- `NEXT_PUBLIC_SITE_URL` — canonical origin for `sitemap.xml`, `robots.txt`,
  the OG metadata base, and the admin magic-link fallback. Falls back to
  `https://knowyour.vote`, the production domain, so an unset value is only
  wrong on a preview deployment.
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — loads the cookieless analytics script.
  Unset → no script at all. **Unset in production as of 2026-10-04**, so no
  analytics run on knowyour.vote today, although `/privacy` describes
  Plausible as in use.
- `NEXT_PUBLIC_SENTRY_DSN` — browser error reporting, loaded lazily after
  hydration so the SDK stays out of the initial bundle. Unset → never loaded.
- `SENTRY_DSN` — server error reporting, PII-scrubbed (verified by
  `node scripts/verify-sentry-scrub.ts`). Unset → Sentry stays disabled.

The Google Ads tag has no variable. Its ID is a constant in
`src/components/features/SitePrompts.tsx`, and it loads only after a visitor
presses Accept on the cookie banner; Decline means it never loads. Keeping
it is **recommended, pending founder confirmation**; `docs/scope-changes.md`
(2026-10-04) records the choice and what removing it would touch.

### Admin console integrations (optional)

The admin Site page pulls deploy health and recent errors. Each panel names
the exact variable it is missing instead of going blank, so "not wired" and
"wired but quiet" stay tellable apart.

- `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` — the Deployments panel; add
  `VERCEL_TEAM_ID` when the project sits in a team.
- `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` — the Errors panel.
  `SENTRY_URL` only for self-hosted Sentry (defaults to `https://sentry.io`).

### Not the web app

The tail of `.env.example` — `SUPABASE_DB_URL`, `CAP_READONLY_DB_URL`,
`ANTHROPIC_API_KEY`, `FEC_API_KEY`, `TWILIO_*`, `CAP_*` — belongs to the CAP
pipeline, which runs locally under `Civic Awareness (Know Your Vote)/`.
Vercel never needs them. `CAP_AGENT_ID`, `CAP_LOG_SINK`, and
`CAP_DISPATCH_TOKEN` are set by the launcher per process, never by hand.

`ANTHROPIC_API_KEY` sits there, not with the web app's keys, on purpose. The
web app stopped reading it when the Find My Candidates quiz was removed on
2026-09-25 (`docs/general-election/quiz-clipped-2026-09-25.md`); checked on
2026-10-04, nothing under `src/` or `scripts/` reads it. Its one remaining
reader is the CAP agent runtime (`runtime/cap_runtime/session.py`, which also
accepts `ANTHROPIC_AUTH_TOKEN`), the parked "Session C" way of building
briefs. It is not set in Vercel and does not need to be.

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

State as of 2026-10-04. What is left before Election Day, and who acts on
each item, is in `docs/general-election/launch-handoff-2026-10-04.md`.

1. Fill in `.env.local` / Vercel env: `SUPABASE_SERVICE_ROLE_KEY` (enables
   voting-info storage, both crons and the election dates), `CRON_SECRET`
   (without it both cron routes 401, Vercel's own invocation included),
   `RESEND_API_KEY` + `EMAIL_FROM` (enables the email), `ADMIN_EMAILS` (opens
   admin sign-in), and optionally `NEXT_PUBLIC_SITE_URL`,
   `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` / `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN`.
   See [Environment variables](#environment-variables) for what each one
   degrades to when it's absent. **Not done in production on 2026-10-04:**
   only `NEXT_PUBLIC_SITE_URL`, the two public Supabase variables and
   `CRON_SECRET` are set under the right names (see the warning above);
   `docs/general-election/reminders-e2e-runbook.md` step 1 is the fix.
2. In Vercel → Settings → Deployment Protection, set Vercel Authentication to
   "Only Preview Deployments" so the production URL is public. **Done
   2026-09-23**: `knowyour.vote` and the production `*.vercel.app` URLs are
   public; preview deployments still require a Vercel login.
3. Apply `supabase/migrations/0033_listed_publication.sql` live, **after**
   the code that renders the listed tier has deployed. On its own it makes
   nothing visible: it widens what `listed` could show and seeds a `draft`
   `race_publication` row for every general-election race, so the door has
   something to flip. **Done 2026-09-23.**
4. Run `scripts/list-ballot-2026.sql` by hand. It flips every `draft` general
   race to `listed` through `set_race_publication` (one `admin_action` row per
   race) and inserts `listed` rows for the three amendments. That puts the
   roster and the ballot text in front of voters, and not one brief. The
   script's header says how to reverse it. **Done:** no general race is still
   `draft`.
5. Run real races through the pipeline's Balance Audit and publish only
   passes (roadmap TASK-050 — the launch gate). **36 of 53 races are
   published** (FL-GOV on 09-27, 35 more on 10-04,
   `docs/general-election/brief-runs/apply-2026-10-04.md`). The other 17 are
   `listed`: roster only, because no candidate in them has a usable quote.
   Amendments 2 and 3 are published; Amendment 1 is `listed`.

The order of 3 and 4, and why, is in
`docs/general-election/listed-tier-2026-09-23.md`.

## The one non-negotiable

Every claim shown is audited pipeline output, held to the same rules for
every candidate in the race. A race's **brief** — profiles, issues, positions, claims and
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
(`profile`, `issue`, `position`, `claim`, `claim_source`, `measure_resource`)
reading `'published'` exactly as `0002` and `0011` wrote them — so a listed
race cannot leak an unaudited claim, whatever rows sit beneath it.

Candidate order is a fixed neutral rule. Party chips are never color-coded.
See `docs/` for the PRD, vision, roadmap, and design system.
