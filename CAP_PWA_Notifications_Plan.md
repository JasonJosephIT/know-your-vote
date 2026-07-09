# CAP PWA + Notifications Plan — agent build plan (ponytail revision)

> Executable plan for coding agents. Work tasks **in order** within a phase;
> phases ship as separate PRs. Mark tasks `- [x]` as they are finished and keep
> the Status line current. Every task ends with its Verify step passing.

**Status:** 9/15 agent tasks complete · Phase A complete — PR #3
(feat/pwa-notifications-a). Founder gates open: F4 (verify dates — nothing
sends until then), Resend env in Vercel, A2/A3 device smoke test. Phase B
starts after A merges.
**Design authority:** `docs/design/notification-pipeline-and-pwa.md` (full DDL,
rationale, trade-offs) and `docs/adr/ADR-001-mobile-mirror-and-shell-parity.md`
— **as amended by the ponytail decision of 2026-07-06 (user-approved), which
wins over the design doc where they conflict.** The amendment: every reminder
in scope is day-granularity (T-7 / T-1 / day-of), so the per-minute delivery
machine (outbox state machine, pg_cron + pg_net, SKIP LOCKED drain, chained
self-POSTs) is replaced by a send-log table plus one daily Vercel cron.
Upgrade path stays open: the send log becomes the outbox and the cron becomes
the drain if minute-level sends are ever needed.

---

## §0 Ground rules (read before any task)

1. **Next.js 16 is not the Next you know.** Before touching any Next API
   (manifest/metadata, route handlers, caching/revalidate, Script, proxy),
   read the relevant guide in `node_modules/next/dist/docs/` (run `npm install`
   first in a fresh worktree). Known repo facts: `middleware.ts` is `proxy.ts`,
   `cookies()`/`params` are async, `scripts/` is excluded from tsc.
2. **RLS posture is law:** anon role never writes; new tables are service-role
   only (mirror `supabase/migrations/0002_rls.sql`). Token-keyed flows
   (unsubscribe) go through API routes using `createServiceClient()` — copy
   the shape of `src/app/api/voting-info/route.ts`.
3. **No free text in the send path.** Notification copy exists ONLY in the
   template registry (task A7). Sends carry `template_id` + zod-validated
   params. If a task seems to need a free-text message field, stop — it's out
   of scope.
4. **Neutrality carries over** (roadmap philosophy §7): 2026 notification
   templates contain dates, deadlines, and official links only — never
   candidate names, race outcomes, or news summaries.
5. **Migration numbering:** migrations `0000–0005` exist on this branch and the
   admin-console branch may hold `0006+`. Before creating a migration, check
   `supabase/migrations/` on YOUR branch after merging/rebasing main, take the
   next free number (skip any number known to be applied to the live DB by a
   parallel branch), and run `node scripts/verify-migrations.mjs` (embedded
   pglite) — it must pass with your migration appended.
6. **Verify as you go.** Each task's Verify step must pass before checking the
   box: `npm run lint`, `npx tsc --noEmit`, plus the task-specific command.
7. **Missing env = graceful no-op, never a crash.** Copy the pattern of
   `voting-info/route.ts:77-82` (503 with honest copy) and
   `rate-limit.ts` (documented fallback).
8. **Do not touch** pipeline-owned tables (`race`, `candidate`, `claim`, …),
   the quiz, or admin-console files on the parallel branch. Scope guards in §6.

---

## §1 Phase A — PWA shell + election data + daily email reminders (one PR)

- [x] **A1 — Web manifest + icons.** Add the Next 16 manifest convention file
  (verify exact convention in `node_modules/next/dist/docs/` — expected
  `src/app/manifest.ts`): name "Know Your Vote", short_name "KnowYourVote",
  `display: "standalone"`, `start_url: "/?shell=pwa"`, theme/background from
  `docs/design.md` tokens. Generate maskable icons (192, 512) + Apple touch
  icon into `public/` from the wordmark/tokens (placeholder geometric mark is
  fine; founder may replace). Wire `appleWebApp` + `viewport-fit=cover` via the
  metadata/viewport exports in `src/app/layout.tsx`.
  **Verify:** manifest route responds with valid JSON linking existing icons;
  lint/tsc. (Full Lighthouse installability check = founder smoke test.)

- [x] **A2 — Safe-area audit.** The fixed bottom nav (`body` `pb-[88px]`,
  `src/components/nav/SectionNav.tsx`) must respect
  `env(safe-area-inset-bottom)` in standalone mode; audit any fixed header
  (`md:pt-[72px]`) for `safe-area-inset-top`.
  **Verify:** lint/tsc; CSS uses `env(safe-area-inset-*)`; screenshot in PR.

- [x] **A3 — Install card.** Dismissible "Get the app" card component:
  `beforeinstallprompt` flow on Chromium; on iOS Safari (no API), two-tap
  Share → Add to Home Screen instructions. Dismissible on sight (no page-view
  counter — ponytail cut); remember dismissal in localStorage; never an
  interstitial. Hidden entirely when already `display-mode: standalone`.
  **Verify:** manual dev-tools run through both branches; lint/tsc.

- [x] **A4 — Backbone migration (two tables, not five).** New migration (per
  §0.5) creating exactly:
  (a) `election_event` — DDL verbatim from design doc §4 (the liability
  table; `verified_by NULL = never sends`).
  (b) `notification_send_log (dedupe_key TEXT PRIMARY KEY, sent_at
  TIMESTAMPTZ NOT NULL DEFAULT NOW(), recipient_count INT)` —
  `INSERT … ON CONFLICT DO NOTHING` before sending IS the idempotency; no
  outbox state machine.
  RLS: service-role only on both (mirror `0002_rls.sql`).
  **Ponytail cuts (do NOT create):** `notification_subscription` (Phase B —
  the email cohort is the existing `voting_info_subscription`),
  `notification_outbox`, `reminder_rule` (offsets are constants in code,
  task A7), `notification_control` (pause switch is the `NOTIFICATIONS_PAUSED`
  env var).
  **Verify:** `node scripts/verify-migrations.mjs` passes; extend it with
  same-shaped probes for the new tables (RLS: anon SELECT fails, service
  insert works; CHECK constraints reject bad event_type; send_log dedupe:
  second insert with same key is a no-op).

- [x] **A5 — election_event seeding + route cutover.** Seed script
  (`scripts/build-election-seed.mjs`, mirroring `build-zip-seed.mjs`) emitting
  statewide FL rows for primary + general 2026 (registration_deadline,
  vbm_request_deadline, early_voting_start/end, election_day) with
  `details_url` = official FL SoS/county URLs, `verified_by` NULL. Rewrite
  `src/app/api/voting-info/route.ts:109-112` to read **verified** rows from
  `election_event` (drop the hardcoded `2026-10-05`/`2026-11-03`); when no
  verified row exists, omit the line (existing formatting already handles
  absent dates). Do NOT invent dates — take them from the official sources and
  cite the URL in the seed file comments; founder verification (F4) flips
  `verified_by`.
  **Verify:** `scripts/verify-election-seed.mjs` (dates parse, urls https,
  uniqueness holds); voting-info route returns 200 with and without verified
  rows (local pglite or mocked client).

- [x] **A6 — `.ics` calendar endpoint.** `GET /api/calendar/[election].ics`
  streaming VCALENDAR of that election's **verified** statewide events
  (all-day VEVENTs, UID = event id, URL = details_url,
  `Content-Type: text/calendar`). Link it from the voting-info email text and
  the `/where-i-stand` / voting-info UI where dates render.
  **Verify:** route returns valid VCALENDAR (validated with an ics parse in
  the verify script); 404 for unknown election; empty calendar when nothing
  verified.

- [x] **A7 — Trust rails.** (a) New `src/lib/secret-compare.ts` wrapping
  `crypto.timingSafeEqual` (length-safe); upgrade
  `refresh-news/route.ts` secret checks to use it.
  (b) Template registry `src/lib/notifications/templates.ts`:
  `Record<template_id, {channel, schema: zod, render(params): {subject?,
  title?, body, url}}>` with the 2026 set: `reg_deadline_t7`,
  `reg_deadline_t1`, `vbm_deadline_t1`, `early_voting_start`, `election_day`,
  `correction` (the pre-approved manual-broadcast template) — copy per §0.4,
  every body ends with the details_url.
  (c) `REMINDER_OFFSETS` constants beside the registry: (event_type ×
  offset_days × template_id) for the Phase A email rows — T-7 and T-1 for
  each deadline type, day-of for election_day. This replaces the
  `reminder_rule` table.
  **Ponytail cut:** NO Upstash backend — `rate-limit.ts`'s in-memory limiter
  stays until traffic outgrows it (its header comment already documents the
  swap trigger).
  **Verify:** `npx tsc --noEmit`; registry unit check in
  `scripts/verify-notification-templates.mjs` (every template renders inside
  the §6-D length budget with sample params; unknown id throws; every
  REMINDER_OFFSETS entry references a registered template).

- [x] **A8 — Daily reminder cron.** `GET /api/cron/send-reminders` (same auth
  shape as `refresh-news`: `CRON_SECRET` via `secret-compare`; add to
  `vercel.json` crons, daily ~14:00 UTC ≈ 9–10am ET). Logic: if
  `NOTIFICATIONS_PAUSED` env is set → 200 no-op with honest body. Else:
  read **verified** `election_event` rows; for each (event × REMINDER_OFFSETS
  entry) due today, build `dedupe_key`
  (`{election}:{event_type}:{offset}:email`), `INSERT … ON CONFLICT DO
  NOTHING` into `notification_send_log` — if the insert landed, expand the
  cohort (`voting_info_subscription` WHERE active), render the template, send
  via Resend batch (chunks of 100, each with its per-recipient unsubscribe
  link), then write `recipient_count`. Cohort fuse: abort + Sentry capture if
  cohort > 50k. Missing `RESEND_API_KEY`/`EMAIL_FROM` → graceful no-op (§0.7).
  Keep `/api/voting-info/unsubscribe` untouched (cohort table is unchanged).
  **Ponytail cuts:** no outbox claim/drain, no pg_cron/pg_net, no chained
  self-POST, no manage page (one topic — the unsubscribe link IS the manage
  page).
  **Verify:** `scripts/verify-notifications-schema.mjs` (live-probe style of
  `verify-refresh-schema.mjs`): send-log idempotency (double-insert lands
  once), RLS denies anon on both tables; plus a dry-run of the route logic
  against pglite with a fake sender (due-today matching, dedupe short-circuit,
  pause env respected, fuse trips at >50k).

- [x] **A9 — Privacy page + digest.** Update `src/app/(public)/privacy` for
  the scheduled-reminder reality (email now; push/SMS sections added in their
  own phases — ponytail cut: don't write "when available" placeholders).
  Append a founder digest section to the send-reminders cron response path:
  after the reminder pass, email `EMAIL_FROM` a one-paragraph summary
  (reminders sent today with counts, subscriber total) — only on days
  something happened (zero-activity days send nothing).
  **Verify:** lint/tsc; digest renders with zero-activity data without
  erroring (and sends nothing).

**Phase A definition of done:** installable PWA on a real phone; a seeded,
founder-verified deadline produces a scheduled email through the
daily-cron → send-log → Resend path; `verify-migrations` + the new verify
scripts green; PR opened referencing this plan §1.

---

## §2 Phase B — web push + parity page (one PR, after A merges)

- [ ] **B1 — Web push end to end.** This is where the push infrastructure
  arrives (moved from Phase A — a push-only SW with no subscribers does
  nothing):
  (a) Migration: `notification_subscription` — DDL from design doc §4.
  Backfill `voting_info_subscription` → `notification_subscription
  (kind='email', topics='{deadlines}', manage_token = unsubscribe_token)`;
  keep the old table until cutover is proven, marked deprecated.
  (b) `public/sw.js` with `push` (showNotification from a JSON payload:
  title/body/url) and `notificationclick` (focus-or-open url) handlers ONLY.
  **No fetch handler, no precache — hard scope guard.** Register from the
  root layout client-side.
  (c) `POST /api/notifications/subscribe` (zod: kind='webpush', subscription
  JSON, zip5, topics; existing in-memory rate limit; `resolveZip` coverage
  check).
  (d) Extend the daily cron with a `WebPushSender` using the `web-push` lib
  (VAPID from env, concurrency ~50, 404/410 → `status='dead'`); add webpush
  entries to `REMINDER_OFFSETS` (T-1 + day-of only).
  (e) Subscribe card UI ("Remind me before deadlines" — user gesture
  required; iOS: only in standalone display-mode, otherwise show the A3
  install instructions).
  **Verify:** end-to-end on localhost (Chrome): subscribe → force cron run →
  notification received; 410 pruning covered in
  `verify-notifications-schema.mjs` with a synthetic dead endpoint.

- [ ] **B2 — Shell parity (lean).** `NEXT_PUBLIC_BUILD_SHA` from
  `VERCEL_GIT_COMMIT_SHA` (next.config env), shell detection
  (`?shell=pwa` param + `display-mode` media query) → Sentry tags
  `shell.kind`/`build.sha` in `instrumentation-client.ts`, and `/shell-check`
  as a **static client page** rendering the live capability matrix (SW, push
  permission, storage persistence, cookies, safe-area insets, viewport, UA,
  build SHA). **Ponytail cut:** no `shell_report` table, no
  `POST /api/shell-report` — telemetry table for a one-founder QA loop is
  speculative; Sentry tags carry the signal.
  **Verify:** `/shell-check` correct in browser vs installed PWA; Sentry
  event in dev shows the tags.

- [ ] **B3 — Rehearsal script.** `scripts/rehearse-notifications.mjs`: sends
  every template × every active channel to a founder-only cohort (guarded by
  explicit `--yes-really` flag + cohort name typed in). **Ponytail cut:** no
  `verify-landing-cache.mjs` — check landing-route cache headers once by hand
  and note the result in the PR.
  **Verify:** rehearsal run output pasted in PR.

**Phase B definition of done:** founder receives a real push on an installed
PWA on their phone from a forced cron run; shell-check page live; rehearsal
script exists and has run once.

---

## §3 Phase C — SMS (one PR; **gated, do not start** until F2 approved and env set)

- [ ] **C1 — SmsSender + webhooks + double opt-in.** Twilio Messaging Service
  send in the daily cron (single-segment enforcement in template registry);
  `POST /api/webhooks/twilio/inbound` (signature-validated; STOP/UNSTOP sync →
  `opted_out`/`active`) and `/api/webhooks/twilio/status` (delivery receipts →
  send-log counters). Subscribe flow: phone (E.164 via zod), consent copy per
  design doc §6, row `status='pending'`, confirmation SMS, "YES" reply (via
  inbound webhook) → `active` + `verified_at`. SMS `REMINDER_OFFSETS`
  entries: reg_deadline T-1 and election_day only.
  **Verify:** Twilio test credentials round-trip; signature validation
  rejects unsigned posts; opt-in state machine covered in
  `verify-notifications-schema.mjs`.

- [ ] **C2 — SMS signup UI + quiet hours.** Phone field + explicit consent
  checkbox (copy verbatim from design doc §6 TCPA block, versioned in
  `consent_meta`), topics limited to the two SMS rules; cron send time
  double-checked against 8am–9pm ET.
  **Verify:** lint/tsc; consent copy snapshot in the templates verify script.

- [ ] **C3 — Correction playbook wiring.** Manual "send correction" path
  (`correction` template) exercised once against the founder cohort; document
  the wrong-date playbook in `docs/design/notification-pipeline-and-pwa.md`
  §7 if anything diverged.
  **Verify:** rehearsal including one correction send.

---

## §4 Founder-only tasks (agents: check as prerequisites, never perform)

- [ ] **F1 — Upstash: DEFERRED (ponytail).** Not needed until traffic
  outgrows the in-memory limiter (`rate-limit.ts` header documents the
  trigger). No Phase A/B dependency.
- [ ] **F2 — Twilio:** create account, buy toll-free number, create Messaging
  Service, **submit toll-free verification NOW** (1–3 week queue; needs live
  site + privacy page URL — after A9 deploys). Set `TWILIO_ACCOUNT_SID`,
  `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`. Gates all of §3.
- [ ] **F3 — VAPID keys:** agent may generate (`npx web-push generate-vapid-keys`)
  but founder stores them: `VAPID_PRIVATE_KEY` (Vercel env + password manager —
  losing it orphans every push subscription), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
  Needed for Phase B.
- [ ] **F4 — Verify election dates:** review each seeded `election_event` row
  against its `details_url` source, set `verified_by` = your email +
  `verified_at`. **Nothing sends until this is done — by design.**
- [ ] **F5 — DRAIN_SECRET: REMOVED (ponytail).** No drain endpoint exists;
  the daily cron authenticates with the existing `CRON_SECRET`.
- [ ] **F6 — Review privacy copy and SMS consent copy** before Phase A and
  Phase C deploys respectively.

---

## §5 Environment variables

| Var | Phase | Notes |
|---|---|---|
| `NOTIFICATIONS_PAUSED` | A | set to any value ⇒ send-reminders cron no-ops (the kill switch) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | B | web push; private key is unrecoverable-critical |
| `NEXT_PUBLIC_BUILD_SHA` | B | derived from `VERCEL_GIT_COMMIT_SHA` in next.config |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID` | C | absent ⇒ SmsSender no-ops with a logged skip |
| existing: `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, Supabase keys | — | unchanged; `CRON_SECRET` now also guards send-reminders |
| ~~`UPSTASH_REDIS_REST_URL/TOKEN`~~ | deferred | ponytail cut — in-memory limiter until traffic outgrows it |
| ~~`DRAIN_SECRET`~~ | removed | no drain endpoint in this architecture |

---

## §6 Scope guards — agents must NOT

- **A.** Add a fetch handler, precache, or any offline caching to the service
  worker (freshness is the product; see design doc §3.3).
- **B.** Build personalized notifications, per-user identity, accounts, or
  cross-channel identity matching (design doc §4 decided channel-per-row).
- **C.** Wire `news_item` to any send path (no verification workflow exists;
  news push is OFF for 2026).
- **D.** Add free-text message capability anywhere (admin included). Payload
  budgets: push title ≤50 / body ≤120 chars; SMS single GSM-7 segment.
- **E.** Start any native app / Capacitor / Expo work (post-November decision).
- **F.** Modify pipeline-owned tables or relax any RLS policy.
- **G.** Send anything to a non-founder address/device from any script or test.
- **H.** Reintroduce the outbox / pg_cron / pg_net / drain machinery (ponytail
  cut). If a requirement genuinely needs minute-level delivery, stop and add
  it to §8 — the upgrade path is send_log → outbox, cron → drain.

## §7 Working agreement

Branch per phase (`feat/pwa-notifications-a` …), PR references this plan's
section, CodeRabbit (or `/code-review`) review before merge per roadmap
philosophy §6, and update this file's checkboxes + Status line in the same PR
that completes the work. If a task is blocked > 30 minutes on a missing
decision, add it under §8 with your recommended default and move to the next
unblocked task — do not improvise architecture.

## §8 Decisions needed / discovered during build

- **2026-07-06 — Ponytail revision applied (user-approved).** This file IS the
  revised plan; the original (pre-revision) plan with the full ponytail
  rationale lives in the `sleepy-hodgkin-f25f00` worktree copy. Summary of
  cuts: outbox/pg_cron/pg_net/drain → send_log + daily Vercel cron;
  `reminder_rule` → code constants; `notification_control` →
  `NOTIFICATIONS_PAUSED` env; `notification_subscription` deferred to Phase B;
  Upstash deferred; dormant SW moved to B1; manage page deferred until ≥2
  topics; `shell_report` table/endpoint cut; `verify-landing-cache.mjs` cut.

*(agents append here)*
