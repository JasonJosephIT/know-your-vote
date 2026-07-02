# Know Your Vote

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

See [.env.example](.env.example). `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` are server-only —
never give them a `NEXT_PUBLIC_` prefix.

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

The database currently holds **clearly-fictional demo fixtures** (every id is
`demo-` prefixed, every person and program invented, sources point at
example.org) so the app could be built and verified before the CAP pipeline
produces real audited briefs. `scripts/build-demo-seed.mjs` regenerates them;
`scripts/demo-teardown.sql` removes every demo row. Replace with real
pipeline output before public launch.

## Going live — the short list

1. Fill in `.env.local` / Vercel env: `SUPABASE_SERVICE_ROLE_KEY` (enables
   voting-info storage + the news cron), `ANTHROPIC_API_KEY` (enables the
   quiz), `RESEND_API_KEY` + `EMAIL_FROM` (enables the email), and optionally
   `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` / `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN`.
2. In Vercel → Settings → Deployment Protection, set Vercel Authentication to
   "Only Preview Deployments" so the production URL is public.
3. Run real races through the pipeline's Balance Audit and publish only
   passes (roadmap TASK-050 — the launch gate), then remove the demo data.

## The one non-negotiable

Everything shown is audited pipeline output, presented with equal space and
equal scrutiny. A race is publicly reachable only when every candidate
Profile has `balance_check_passed = true` **and**
`race_publication.status = 'published'` — enforced in RLS and the read
queries, not just the UI. Candidate order is a fixed neutral rule. Party
chips are never color-coded. See `docs/` for the PRD, vision, roadmap, and
design system.
