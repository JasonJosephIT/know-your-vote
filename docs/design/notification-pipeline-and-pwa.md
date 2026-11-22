# System design: PWA + notification pipeline (email, web push, SMS)

**Status:** Draft for review
**Date:** 2026-07-05
**Builds on:** ADR-001 (mirror apps as thin shells + parity harness); local-council
review of 2026-07-03 (`.claude/council-cache/local-council-1783273516.md`).
This document is the technical basis for a future ADR-002 (notification
architecture) if we want a decision record; the design decisions marked
**[decided]** below are the hard-to-reverse ones.

---

## 1. Requirements

### Functional

- **FR-A (PWA):** the site is installable on phones (manifest, icons, standalone
  display); installing it is the "mirror app" from ADR-001 Phase 1.
- **FR-B (reminders):** scheduled, cohort-level election reminders — registration
  deadline, vote-by-mail request deadline, early-voting window, election day —
  delivered on the subscriber's channel(s) at sensible local times.
- **FR-C (channels):** email (exists as one-time send today — becomes scheduled),
  web push (new), SMS (new), and zero-infrastructure `.ics` calendar links.
- **FR-D (targeting):** cohort-level only in 2026 — state / county_fips / metro,
  resolved from `zip_district`. **No personalized sends** ("your ballot changed")
  this cycle; that's a scaling and privacy cliff we step over deliberately.
- **FR-E (self-service):** per-channel opt-in with recorded consent, a preference
  page keyed by an unguessable token (no accounts), one-tap unsubscribe, SMS
  STOP/HELP compliance.
- **FR-F (operator control):** sends can only originate from typed templates and
  verified data; manual broadcasts require confirm + audit; a kill switch pauses
  any channel instantly.

### Non-functional

- Solo-founder ops on the existing stack (Vercel + Supabase + Resend + Sentry).
  New vendors limited to two: Twilio (SMS) and Upstash (durable rate limiting).
- A cohort send to ~10k subscribers completes inside its intended window
  (email/push: minutes; SMS: within the hour). Design headroom to 100k.
- The click-through herd (5–20% of a push tapping within minutes) lands on
  cacheable pages, not per-request SSR + DB reads.
- Wrong-notification risk is treated as the top product risk (civic harm):
  every reminder traces to a verified `election_event` row with a source URL.
- Privacy posture stays minimal and explicit: today
  `voting_info_subscription` is "the ONLY table holding personal data" — this
  design adds exactly one more (`notification_subscription`) and retires the old
  one into it. `/privacy` must be updated in the same release.

### Constraints & timeline anchors

- Today is July 5, 2026. FL primary is mid-August; general-election registration
  deadline Oct 5; general Nov 3 (dates currently hardcoded in
  `src/app/api/voting-info/route.ts:109-112` — this design moves them to data).
- SMS sender verification (toll-free) or A2P 10DLC registration has **weeks of
  lead time** and is out of our control — it starts in Phase A even though SMS
  ships in Phase C.
- Vercel cron minimum granularity on the current plan is daily; reminders need
  per-minute scheduling → scheduling lives in Supabase (pg_cron), not Vercel.

---

## 2. High-level design

One channel-agnostic backbone; channels are interchangeable senders. The native
reminder app, if it ever exists (post-November decision), plugs in as a fourth
sender without touching anything upstream.

```
  TRIGGERS                          GATES                    DELIVERY
┌──────────────────┐
│ pg_cron scheduler │─┐
│ (election_event ×│ │   ┌──────────────────────┐   ┌──────────────────┐
│  offset rules)   │ │   │ Trust gates          │   │ notification_    │
└──────────────────┘ ├──▶│ • template registry  │──▶│ outbox           │
┌──────────────────┐ │   │   (typed params only)│   │ (idempotent rows,│
│ Admin broadcast  │─┤   │ • verified_by NOT    │   │  cohort + channel│
│ (confirm + audit)│ │   │   NULL on events     │   │  + template_id)  │
└──────────────────┘ │   │ • kill switch        │   └────────┬─────────┘
┌──────────────────┐ │   └──────────────────────┘            │ pg_net ping
│ News alerts      │─┘                                        ▼
│ (2026: OFF —     │                                 ┌──────────────────┐
│  needs verified_ │                                 │ Drain worker     │
│  by workflow)    │                                 │ /api/notifications│
└──────────────────┘                                 │ /drain — claim   │
                                                     │ batch (SKIP      │
                                                     │ LOCKED), send,   │
                                                     │ retry ≤3, prune  │
                                                     └───┬────┬────┬────┘
                                                         ▼    ▼    ▼
                                                     Resend  Web   Twilio
                                                     email   push  SMS
                                                     (live) (VAPID)(gated)
```

Subscription state (`notification_subscription`) is read by the drain worker to
expand a cohort into recipients; delivery feedback (web-push 404/410, Twilio
STOP webhooks, email bounces) writes back to it.

---

## 3. Deep dive A — the PWA layer

Scope: ADR-001 Phase 1, specified concretely. All items live in the one repo.

1. **Manifest + icons.** App-router metadata manifest (`src/app/manifest.ts`
   convention — **verify the exact Next 16 file convention against
   `node_modules/next/dist/docs/` before coding**, per AGENTS.md): name
   "Know Your Vote", short_name "KnowYourVote", `display: "standalone"`,
   `start_url: "/?shell=pwa"` (feeds the ADR-001 shell beacon), theme/background
   colors from the design tokens, maskable icons 192/512 + Apple touch icon.
2. **Viewport & safe areas.** `viewport-fit=cover`; audit the fixed bottom nav
   (`body` uses `pb-[88px]` in `src/app/layout.tsx`) with
   `env(safe-area-inset-bottom)` so standalone mode on notched iPhones doesn't
   clip the nav — this is difference class #2 from ADR-001's table.
3. **Service worker — minimal by design [decided].** `public/sw.js` handles
   exactly two events: `push` (showNotification from a template payload) and
   `notificationclick` (focus/open the deep link). **No fetch handler, no
   precache.** Rationale: freshness is the product; a caching SW is the #1
   source of the stale-build drift ADR-001's build-SHA beacon exists to catch.
   Offline support is explicitly out of scope for 2026.
4. **Install UX.** A dismissible "Get the app" affordance: Android/desktop hooks
   `beforeinstallprompt`; iOS shows the two-tap Share → Add to Home Screen
   instructions (no API exists). Shown after engagement (e.g., second page
   view), never as an interstitial.
5. **Parity harness** (ADR-001 action items 2–5): `NEXT_PUBLIC_BUILD_SHA` from
   `VERCEL_GIT_COMMIT_SHA`, shell detection (`display-mode: standalone` media
   query + `?shell=` param) → Sentry tags, `/api/shell-report` beacon,
   `/shell-check` page. The beacon endpoint is the codebase's first anon-write
   route — it gets the Upstash rate limiter first, and the subscribe endpoints
   below copy its abuse controls.

**Launch sequencing:** items 1, 2, 4 are pure additions with no backend
dependency — they ride the next deploy. Item 3 ships disabled-until-push
(registering a push-only SW early is harmless and lets iOS users who installed
early get push later without re-onboarding).

---

## 4. Deep dive B — data model [decided: hard to reverse]

New migration (next number in sequence). All tables service-role only via RLS
(anon gets nothing, matching `0002_rls.sql` posture); the two token-keyed reads
(preference page, unsubscribe) go through API routes using the service client.

```sql
-- Authoritative election dates. Replaces the hardcoded strings in
-- voting-info/route.ts. THE liability table: nothing sends unless verified.
CREATE TABLE election_event (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state        CHAR(2) NOT NULL DEFAULT 'FL',
  county_fips  CHAR(5),                -- NULL = statewide
  event_type   TEXT NOT NULL CHECK (event_type IN
                 ('registration_deadline','vbm_request_deadline',
                  'early_voting_start','early_voting_end','election_day')),
  election     TEXT NOT NULL,          -- 'primary_2026' | 'general_2026'
  event_date   DATE NOT NULL,
  details_url  TEXT NOT NULL,          -- official source, shown in every send
  verified_by  TEXT,                   -- operator email; NULL = never sends
  verified_at  TIMESTAMPTZ,
  UNIQUE (state, county_fips, event_type, election)
);

-- One row per (channel, address). Absorbs voting_info_subscription:
-- existing rows backfill as kind='email'; old table dropped after cutover.
CREATE TABLE notification_subscription (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL CHECK (kind IN ('email','sms','webpush')),
  address       TEXT NOT NULL,         -- email | E.164 phone | push endpoint URL
  webpush_keys  JSONB,                 -- {p256dh, auth} when kind='webpush'
  zip5          CHAR(5) NOT NULL,
  county_fips   CHAR(5),               -- denormalized from zip_district at write
  state         CHAR(2) NOT NULL DEFAULT 'FL',
  topics        TEXT[] NOT NULL DEFAULT '{deadlines}',  -- 'deadlines' only in v1
  consent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_meta  JSONB,                 -- ip, user-agent, copy version (TCPA record)
  verified_at   TIMESTAMPTZ,           -- sms double opt-in ts; email/webpush = consent
  manage_token  TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('pending','active','paused','dead','opted_out')),
  last_sent_at  TIMESTAMPTZ,
  dead_reason   TEXT,                  -- '410', 'unregistered', 'stop', 'bounce'
  UNIQUE (kind, address)
);
CREATE INDEX idx_notif_sub_cohort ON notification_subscription
  (state, county_fips, kind) WHERE status = 'active';

-- The outbox. One row = one (cohort × channel × template) send job.
CREATE TABLE notification_outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key    TEXT NOT NULL UNIQUE,  -- e.g. 'general_2026:reg_deadline:T-1:FL:sms'
  channel       TEXT NOT NULL CHECK (channel IN ('email','sms','webpush')),
  state         CHAR(2) NOT NULL,
  county_fips   CHAR(5),               -- NULL = statewide cohort
  template_id   TEXT NOT NULL,         -- must exist in the code registry
  params        JSONB NOT NULL,        -- validated against the template's zod schema
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sending','sent','failed','cancelled')),
  attempt_count INT NOT NULL DEFAULT 0,
  last_error    TEXT,
  source        TEXT NOT NULL CHECK (source IN ('scheduler','admin')),
  created_by    TEXT,                  -- operator email when source='admin'
  sent_count    INT,
  pruned_count  INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_outbox_due ON notification_outbox (scheduled_at)
  WHERE status = 'queued';

-- Single-row control table: the kill switch.
CREATE TABLE notification_control (
  id            BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),  -- exactly one row
  email_paused  BOOLEAN NOT NULL DEFAULT false,
  sms_paused    BOOLEAN NOT NULL DEFAULT false,
  push_paused   BOOLEAN NOT NULL DEFAULT false,
  paused_note   TEXT,
  updated_by    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Decisions embedded here, and why they're the hard-to-reverse ones:

- **Channel-per-row, no person entity [decided].** We never build cross-channel
  identity from PII matching; a person who opts into two channels has two rows.
  Cross-channel dedupe (the council's triple-notification warning) is handled at
  the *product* layer: the signup UI's default topic set differs by channel
  (email = everything; SMS = deadline-critical only; push = deadline + election
  day), so overlap is small by construction, and the preference page shows all
  rows sharing an address when the user opens it. Revisit only if complaints
  prove it insufficient.
- **`dedupe_key` on outbox [decided].** The scheduler is idempotent by
  construction: re-running pg_cron after a failure can never enqueue the same
  logical send twice. This is the wire-format bet — every future trigger source
  must be able to express "the identity of this send" as a string.
- **Templates in code, params in data [decided].** `template_id` + zod-validated
  `params`; the drain worker refuses unknown ids or invalid params. No free-text
  message body exists anywhere in the pipeline — a compromised admin session or
  poisoned row can misfire a *true* template, but cannot compose a lie.

---

## 5. Deep dive C — scheduling and dispatch

### Scheduler (Supabase pg_cron)

A pg_cron job runs every 5 minutes and executes one SQL function:

```
enqueue_due_reminders():
  for each verified election_event × offset rule
      (T-7d 14:00 UTC, T-1d 14:00 UTC, day-of 12:00 UTC ≈ 8am ET)
    for each channel with active subscribers in that cohort
      INSERT INTO notification_outbox (dedupe_key, ...) ON CONFLICT DO NOTHING
```

Offset rules are a small SQL table (`reminder_rule`: event_type × offset ×
channel × template_id) so adding "T-3d for SMS" is a row, not a deploy. All of
FL is one timezone in practice (the panhandle CT sliver is out of coverage);
send times are fixed UTC constants until multi-state expansion.

A second pg_cron job (every minute) fires `pg_net` HTTP POST to
`/api/notifications/drain` whenever queued rows are due. The route also accepts
manual POSTs (admin "drain now"). **Auth: a dedicated `DRAIN_SECRET` compared
with `crypto.timingSafeEqual`** — and the existing `===` comparisons in
`refresh-news/route.ts:24-26` get upgraded to the same helper in this change.

### Drain worker (`/api/notifications/drain`)

1. Check `notification_control`; exit early for paused channels.
2. Claim work: `UPDATE ... SET status='sending' WHERE id IN (SELECT ... WHERE
   status='queued' AND scheduled_at <= now() ORDER BY scheduled_at LIMIT 5 FOR
   UPDATE SKIP LOCKED) RETURNING *` (SQL function). Concurrent drains are safe.
3. For each claimed outbox row: expand cohort → recipient list from
   `notification_subscription`; render template; hand to the channel sender.
4. Senders (all share: per-recipient result, dead-address pruning, Sentry
   breadcrumbs):
   - **EmailSender** — Resend batch endpoint, 100/call. Bounce webhooks (later)
     mark `dead('bounce')`.
   - **WebPushSender** — `web-push` lib, VAPID keys. Concurrency ~50. HTTP
     404/410 → `status='dead', dead_reason='410'` in the same pass (the token-
     decay tax is paid on every send, never accumulated).
   - **SmsSender** — Twilio Messaging Service SID. Errors 21610 (STOP) /
     21408 → `opted_out`. Status callbacks land on
     `/api/webhooks/twilio/status` for delivery receipts.
5. Finish the row: `sent` with `sent_count`/`pruned_count`, or `failed` with
   backoff re-queue (`attempt_count < 3`, then terminal `failed` + Sentry alert).
6. If more due rows remain and the function budget allows, self-re-POST (chained
   drains) so a big backlog clears without waiting for the next cron tick.

Batch-size cap: a drain that expands to > (active cohort size × 1.05) or
> 50k recipients aborts and alerts — the "never mass-send by accident" fuse.

### Manual broadcasts (admin console integration)

The admin console (ops-plane, parallel branch) gets a "Send reminder" flow:
pick template + cohort + time → preview rendered copy → **type the cohort name
to confirm** → row lands in outbox with `source='admin'`, `created_by`, and a
15-minute `scheduled_at` delay by default (the undo window — `cancelled` is one
click). Every admin send is an audit row by construction (it *is* the outbox row).

News alerts stay **off** for 2026: `news_item` has no verification workflow
(the known `verified_by` gap), and the trust gate is non-negotiable.

---

## 6. Deep dive D — channel specifics

### Email (upgrade, not new)

The one-time welcome email in `voting-info/route.ts` stays but its hardcoded
dates (`2026-10-05`, `2026-11-03`) now read from `election_event`, and its `.ics`
links come free: `GET /api/calendar/:election.ics` streams a static VCALENDAR of
the cohort's verified events — the user's own calendar app becomes a reminder
channel with zero send infrastructure. Existing `voting_info_subscription` rows
backfill into `notification_subscription (kind='email', topics='{deadlines}')`;
their unsubscribe tokens carry over as `manage_token`.

### Web push

- VAPID keypair in env (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` — generated once,
  **losing the private key orphans every subscription**; store in Vercel env +
  password manager).
- Subscribe UX: only ever after a user gesture on a value proposition card
  ("Remind me before deadlines"), never on page load. iOS shows the card only in
  standalone display-mode (push requires install on iOS 16.4+); in Safari it
  becomes the install instructions.
- `POST /api/notifications/subscribe` validates zod body, Upstash rate limit
  (IP + rough UA key), resolves zip via existing `resolveZip`, inserts the row.
- Payload budget: title ≤ 50 chars, body ≤ 120, always a deep link to a
  cohort page. Templates enforce this at the registry level.

### SMS (the gated channel)

- **Provider: Twilio, toll-free number for v1 [decided].** Toll-free
  verification is a single queue (typically 1–3 weeks) vs A2P 10DLC's
  brand + campaign registration where civic/election traffic draws extra
  vetting. Throughput ~3 msg/sec default is fine: 10k × 1 segment ≈ 55 min,
  and every SMS we send is schedulable an hour early. Revisit 10DLC/short code
  at 50k+ subscribers or if delivery data shows toll-free filtering.
  **The verification application is a Phase A task** (it's the long pole and
  needs the live site + privacy page as evidence).
- **TCPA posture:** express consent checkbox with explicit copy ("up to 6
  automated texts per election cycle; msg&data rates apply; reply STOP to
  cancel, HELP for help"), `consent_meta` records ip/timestamp/copy-version;
  double opt-in confirmation text ("Reply YES") before `status='active'`;
  sends only inside 8am–9pm recipient-local (scheduler constants already
  respect this); Twilio Advanced Opt-Out handles STOP/HELP automatically and
  `/api/webhooks/twilio/inbound` syncs `opted_out` into our table.
- **Volume cap as product policy:** max 6 SMS per subscriber per cycle,
  enforced by the small fixed set of reminder_rule rows for the sms channel —
  the cap is structural, not a counter.
- **Cost honesty:** ~$0.008–0.01/segment ⇒ 10k subscribers × 4 sends ≈ **$350–400
  per cycle**, by far the most expensive channel. SMS topics default to the two
  highest-value sends (reg deadline T-1, election day morning) and users add
  more explicitly.

### Burst landing pages

Every template deep-links to a cohort-level page (e.g. `/voting-info?county=…`),
never a personalized one. Those routes must serve from cache under the
click-through herd: verify the Next 16 caching/revalidate idiom in
`node_modules/next/dist/docs/` (the repo already uses `revalidateTag` in the
refresh cron) and add a load check to the pre-send rehearsal (§8).

---

## 7. Scale & reliability

**Load estimates (10k subscribers, headroom 100k):**

| Path | 10k | Notes |
|---|---|---|
| Email batch | ~100 Resend calls, < 1 min | trivially fine |
| Web push | 10k encrypted POSTs, ~50 conc ≈ 3–7 min across chained drains | prune 410s inline |
| SMS toll-free | ~3 MPS ≈ 55 min | schedule 60–90 min ahead of target time |
| Click-through herd | 20% × 10k over ~5 min ≈ 7 rps avg, spikes ~30 rps | fine **iff** cached; pool-exhausting if SSR+DB per hit |

**Failure modes and answers:**

- *Double send:* `dedupe_key` (enqueue-level) + `SKIP LOCKED` claims +
  per-recipient provider idempotency where offered. Worst case on a crashed
  drain: one cohort×channel row retries and some recipients get a duplicate —
  acceptable; the reverse (silent no-send on deadline day) is not, hence
  retry-forward.
- *Provider outage:* rows stay `queued`/re-queued; kill switch pauses a flapping
  channel; other channels unaffected.
- *Stale/dead addresses:* pruned on every send (410/bounce/STOP), so list decay
  never compounds.
- *Wrong-date catastrophe:* `verified_by NOT NULL` gate, `details_url` in every
  message ("check your official source"), and the rehearsal send (§8). A
  discovered error post-send has a playbook: correction template exists from
  day one (the one manual-broadcast template pre-approved for speed).
- *Missed cron tick:* enqueue is idempotent and drains are catch-up (due rows,
  not tick-aligned), so a missed tick delays, never drops.
- *Silent failure:* every drain writes a Sentry breadcrumb + the outbox row is
  the audit trail; a daily "notification digest" email to the founder
  (yesterday's sends, failures, prune counts, subscriber deltas) rides the
  existing daily cron.

---

## 8. Rollout plan (aligned to launch)

**Phase A — with the website launch (target: next 2 weeks)**
1. PWA: manifest, icons, safe-area audit, install card (§3.1–4).
2. Migration: the four tables above + backfill `voting_info_subscription`.
3. `election_event` seeded (primary + general, statewide FL rows) and
   **verified against official SoS/county sources**; `voting-info` route reads
   it; `.ics` endpoint.
4. Trust rails: Upstash rate limiter (shell-report + subscribe + existing
   voting-info), `timingSafeEqual` helper replacing `===` secret compares.
5. Outbox + scheduler + drain + **EmailSender only**; reminder emails live.
6. **Submit Twilio toll-free verification** (long pole starts now).
7. `/privacy` update covering all three channels.

**Phase B — before the August primary window**
8. Web push end to end (SW push handlers, subscribe card, WebPushSender).
9. ADR-001 parity items: build-SHA beacon, Sentry shell tags, `/shell-check`.
10. Rehearsal: full pipeline dry-run against a founder-only cohort (every
    channel, every template), plus a cache check on landing routes.
11. Admin console: election_event CRUD + manual-broadcast flow (parallel branch
    integration).

**Phase C — September (gated on toll-free verification clearing)**
12. SmsSender + Twilio webhooks + double opt-in flow; SMS signup UI.
13. Marquee sends: Oct 5 registration-deadline campaign (T-7 email/push, T-1
    all channels), then the Nov 3 sequence.

**Explicitly deferred past November:** personalized notifications, news-alert
pushes (needs the verified_by workflow), the native reminder app (revisit as a
4th sender per the council review), offline PWA support, non-FL states.

---

## 9. Trade-offs made

- **pg_cron + pg_net over Vercel cron:** per-minute granularity, colocated with
  the data, no plan upgrade; cost is logic split across repo + SQL functions
  (mitigated: SQL lives in the migration, versioned like everything else).
- **Toll-free over 10DLC for SMS v1:** faster/simpler verification and adequate
  throughput vs lower per-message cost and higher throughput later; revisit at
  scale.
- **Minimal SW over offline-capable PWA:** freshness and drift-detection beat
  offline reading for a civic-info product whose data changes; offline is a
  feature we can add, stale ballot info is a harm we can't retract.
- **Channel-per-row over person-entity model:** no PII-matching infrastructure,
  smaller privacy surface, simpler RLS; cost is imperfect cross-channel dedupe,
  managed by product defaults instead of identity resolution.
- **Twilio over Telnyx/SNS:** best-in-class opt-out compliance automation for a
  solo operator vs ~30–50% higher per-message cost; compliance failure is the
  existential risk, message cost is a line item.
- **Outbox-in-Postgres over a queue service (QStash/Inngest):** one less vendor,
  transactional with subscriptions, SKIP LOCKED is enough at 100k; revisit if
  drains outgrow function limits.

## 10. Revisit when

- Personalized sends get demanded → per-token pipeline + uncacheable landing
  pages + real identity model: a deliberate, separate design.
- SMS > 50k subscribers or toll-free filtering appears → 10DLC/short code.
- Native reminder app decision post-November → new sender on this backbone
  (~500 lines), plus the Expo-vs-native-minimal security/ops tension recorded
  in the council file.
- Multi-state expansion → `election_event` already keys on state; timezone
  constants become per-state; coverage tables grow.
- Drain volume outgrows serverless budgets → move drain to Supabase Edge
  Function or a queue service; the outbox contract doesn't change.

## 11. Open questions (with defaults)

1. **Cross-channel duplicates:** accept product-default topic split (my
   recommendation) or build address-matching dedupe now? Default: ship the
   split, measure complaints.
2. **Web push on the primary or only the general?** Default: soft-launch push
   in August (primary) to a small cohort to harden the pipeline before the
   high-stakes October sends.
3. **Plausible funnel events** (install card shown/accepted, subscribe
   started/completed per channel)? Default: yes — cheap, and it's the data the
   post-November native-app decision needs.
