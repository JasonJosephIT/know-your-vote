# System Design — Operator Console

> Implements `docs/admin-dashboard/prd.md`. Version 1.0 · 2026-07-03.
> Frame: solo operator, existing Next.js 16 + Supabase + Vercel stack, agents on Cowork (ADR-001), $0 infra budget, "degrade honestly" house rule.

## § 1 Requirements Summary

**Functional:** live monitor (six R4 sections), agent run triggers, manual submissions, unified approval queue with applied effects + audit, deployments/errors panels. Full list: PRD § 3.

**Non-functional:**
- Scale: 1 user, tens of rows/day, hundreds of rows total year one. No scaling design needed — correctness and honesty dominate.
- Latency: overview < 1 s p95 (a handful of indexed queries + two cached HTTP calls).
- Availability: whatever Vercel + Supabase free tiers give; the console is not on the voter path, so its downtime is tolerable.
- Cost: $0 marginal (existing projects; Supabase Auth free tier; Vercel/Sentry APIs free at this volume).
- Security: no new anon capability; all privileged writes server-side, allowlist-verified, audited.

## § 2 High-Level Design

```
                    OPERATOR (any device)
                          │ magic-link session (Supabase Auth)
                          ▼
        ┌──────────────────────────────────────────┐
        │  Next.js app (existing Vercel project)   │
        │  /admin/* pages (RSC)                    │
        │  /api/admin/* route handlers             │
        │   · middleware gate + per-route verify   │
        │   · zod-validated bodies                 │
        └───────┬──────────────┬───────────┬───────┘
                │ service-role │ 60s cache │ 60s cache
                ▼              ▼           ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────┐
        │   SUPABASE   │ │ Vercel   │ │ Sentry   │
        │ content plane│ │ REST API │ │ Issues   │
        │  (RO except  │ │ deploys  │ │ API      │
        │  approve-    │ └──────────┘ └──────────┘
        │  applies)    │
        │ ops plane    │◄─────────────┐
        │  agent_run   │              │ writes: run rows, gated
        │  run_request │              │ findings, heartbeats
        │  review_item │      ┌───────┴─────────────────────┐
        │  admin_action│      │ OPERATOR'S MACHINE (Cowork)  │
        └──────────────┘      │  R1 R2 R3 R4 scheduled tasks │
                              │  + cap-r0-dispatcher (polls  │
                              │    run_request, executes)    │
                              │  + RunReports/*.md (narrative)│
                              └──────────────────────────────┘
```

**The one asymmetry that drives the design:** the dashboard is hosted; the agents are not. Everything "trigger-shaped" is therefore a *queue write* the local dispatcher consumes — never an RPC. This is honest about ADR-001 and survives its revisit: if R1/R3 graduate to Vercel cron later, the cron becomes another consumer of the same table.

**Data flows**

1. *Trigger:* UI → `POST /api/admin/agents/run-requests` → `agent_run_request(pending)` → dispatcher (every 30 min while the Claude app is open) claims it (`claimed_at`), runs the agent's existing prompt, agent writes `agent_run` + report → dispatcher marks `fulfilled`. UI polls request state and shows age honestly.
2. *Submit → approve:* form → `POST /api/admin/ingest` → lint advisory → `review_item(pending)` → operator opens queue → `POST /api/admin/review/:id/decision {approve}` → transaction: re-lint, apply effect (INSERT `news_item` / UPDATE gated field), write `admin_action`, mark `approved+applied`. Reject: decision recorded, nothing applied.
3. *Agent gated finding:* R2/R3 (prompt v1.1) INSERT `review_item(kind='gated_diff'|'date_mismatch', source='agent:RN')` in addition to their run-report prose → appears in the same queue.
4. *Monitor:* RSC overview runs ~8 indexed SELECTs (counts, max timestamps) + `/api/health` + cached Vercel/Sentry fetches.

## § 3 Data Model (migration `0006_admin_ops.sql`)

House style: idempotent DDL, RLS enabled, explicit REVOKEs (Supabase default-privileges lesson from 0005), extend `verify-migrations.mjs` with same-shaped embedded-Postgres probes + new `verify-admin-ops.mjs` live guardrail.

```sql
CREATE TABLE IF NOT EXISTS agent_run (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent           TEXT NOT NULL CHECK (agent IN ('R1','R2','R3','R4','dispatcher')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','ok','ok_empty','failed','dry_run')),
  items_written   INTEGER,
  summary         TEXT,            -- the 3-line chat summary
  report_path     TEXT,            -- RunReports/… (local narrative artifact)
  run_request_id  UUID             -- NULL for scheduled runs
);
CREATE INDEX IF NOT EXISTS idx_agent_run_agent_time ON agent_run (agent, started_at DESC);

CREATE TABLE IF NOT EXISTS agent_run_request (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent        TEXT NOT NULL CHECK (agent IN ('R1','R2','R3','R4')),
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','claimed','fulfilled','failed','cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at   TIMESTAMPTZ,
  resolved_at  TIMESTAMPTZ,
  failure_reason TEXT
);
-- one live request per agent (duplicate-click protection, AFR-012)
CREATE UNIQUE INDEX IF NOT EXISTS uq_run_request_live
  ON agent_run_request (agent) WHERE status IN ('pending','claimed');

CREATE TABLE IF NOT EXISTS review_item (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL CHECK (kind IN
                 ('manual_news','gated_diff','fact_flag',
                  'unclear_statement','unverified_fact','date_mismatch')),
  source       TEXT NOT NULL,            -- 'operator' | 'agent:R1' | 'agent:R2' | 'agent:R3'
  payload      JSONB NOT NULL,           -- shape per kind, zod-mirrored in src/types/admin.ts
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at   TIMESTAMPTZ,
  decision_note TEXT,
  applied_at   TIMESTAMPTZ,              -- set only when the approve-effect committed
  apply_error  TEXT                      -- fail-closed detail (e.g. 0005 not applied)
);
CREATE INDEX IF NOT EXISTS idx_review_item_queue ON review_item (status, created_at);

CREATE TABLE IF NOT EXISTS admin_action (   -- append-only audit
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        TEXT NOT NULL,              -- allowlisted email
  action       TEXT NOT NULL,              -- 'trigger' | 'submit' | 'approve' | 'reject' | 'cancel'
  subject_kind TEXT NOT NULL,              -- 'agent_run_request' | 'review_item'
  subject_id   UUID NOT NULL,
  detail       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: ops plane is server-side only. Enable RLS on all four; create NO
-- anon/authenticated policies; REVOKE ALL from anon, authenticated
-- (defense against Supabase default privileges, as in 0005). service_role only.
```

**Payload shapes (zod, `src/types/admin.ts`):** `manual_news {item_type, title, summary, url, metro?, race_id?, candidate_id?, published_at}` · `gated_diff {table, pk, field, old, new, source_url, seen_at}` · `fact_flag / unclear_statement / unverified_fact {text, context, candidate_id?, race_id?, source_url?}` · `date_mismatch {race_id, field, db_value, official_value, source_url}`.

## § 4 API Contracts

All under `/api/admin/*`; every handler: (1) session from `@supabase/ssr`, (2) email ∈ `ADMIN_EMAILS`, (3) zod-parse, (4) service-role client. 401 unauthenticated / 403 not-allowlisted / 400 invalid / 409 state-conflict / 200|201|202.

| Route | Method | Body → Result |
|---|---|---|
| `/api/admin/overview` | GET | — → six-section snapshot (counts, max stamps, heartbeats) |
| `/api/health` | GET | — → `{supabase, migrations:{0005,0006}, agents:{R1:{last,status}…}, cron_heartbeat_age}` (auth-gated detail; unauth gets 401 — nothing about ops leaks anon) |
| `/api/admin/agents/runs` | GET | `?agent&limit` → run rows |
| `/api/admin/agents/run-requests` | POST | `{agent, note?}` → 202 request row · 409 if one is live |
| `/api/admin/agents/run-requests/:id` | DELETE | cancel pending → 200 |
| `/api/admin/ingest` | POST | `{kind, payload}` → 201 review_item (+ advisory lint result for manual_news) |
| `/api/admin/review` | GET | `?status&kind` → queue page |
| `/api/admin/review/:id/decision` | POST | `{action:'approve'\|'reject', note?}` → 200 with applied/`apply_error` · 409 if already decided |
| `/api/admin/site/deployments` | GET | — → Vercel deploys (60 s cache) or `{unavailable:'VERCEL_API_TOKEN missing'}` |
| `/api/admin/site/errors` | GET | — → Sentry issues (60 s cache) or honest-unavailable |
| `/api/admin/log` | GET | `?limit` → admin_action rows |

## § 5 Deep Dives

**Auth.** Supabase Auth (magic link) — first project use of the auth schema; the voter app's "no accounts" posture is untouched because no anon-facing policy references `authenticated`. `src/lib/admin/guard.ts` exports `requireAdmin()` used by middleware *and* every handler/RSC — Next.js middleware alone is a known bypass class (CVE-2025-29927), so the route-level check is the real gate; middleware is UX. Allowlist via `ADMIN_EMAILS` env (comma-separated, compared case-folded).

**Neutrality lint as a library.** Extract the banned-terms list + matcher from `scripts/verify-news-neutrality.ts` into `src/lib/neutrality.ts`; the script and `/api/admin/*` both import it (script keeps its CLI/self-test shell). One source of truth for §4.2 wording rules; approve-time re-lint is authoritative (submit-time is advisory), and the terminal-sanitization stays in the script layer while the web layer relies on React's default escaping.

**Dispatcher (`cap-r0-dispatcher`).** New Cowork scheduled task, cron `*/30 * * * *`. Contract: SELECT oldest `pending` request → set `claimed` + `claimed_at` (single UPDATE … WHERE status='pending' guard — last-write-wins is fine at n=1 operator) → execute that agent's existing SKILL.md prompt verbatim as a sub-run → agent itself writes `agent_run` (with `run_request_id`) → mark `fulfilled`/`failed`+reason. Stale-claim recovery: a `claimed` older than 6 h is re-markable `failed('stale claim — app likely closed mid-run')` by the next dispatcher pass. One request per pass (agents are heavy; a backlog drains over successive passes). The dispatcher writes nothing except ops-plane rows.

**Agent prompts v1.1 (small appendix edits, four tasks + mirrors).** Each R-agent gains: "on start INSERT agent_run(running); on finish UPDATE it (status, items_written, summary, report_path)". R2/R3 additionally: "INSERT review_item for each gated diff / date mismatch you would previously only write to the run report." R4's rule 1 is amended to "READ-ONLY on the content plane; you may write only your own agent_run row." If ops tables don't exist yet (0006 unapplied), agents skip registry writes and note it — same fail-closed idiom as 0005.

**Approve-effect transaction.** `decision(approve)` runs one service-role transaction: guard `status='pending'` (409 otherwise) → re-lint if `manual_news` → apply effect → `admin_action` insert → mark `approved, applied_at`. Any effect failure ⇒ rollback, item stays `pending` with `apply_error` recorded (visible in UI). Effects allowed per kind are a fixed server-side map — the payload can never name an arbitrary table/field (gated fields whitelist: `race.key_dates`, `race.office`, `race.district`, `candidate.qualifying_status`).

**Caching.** Vercel/Sentry fetches: `unstable_cache`/route revalidate 60 s. Queue + overview DB reads: no cache (always live). No client polling faster than 30 s.

## § 6 Scale & Reliability

Load is negligible by construction; reliability = honest failure modes:

| Failure | Behavior |
|---|---|
| `VERCEL_API_TOKEN` / `SENTRY_AUTH_TOKEN` absent | Panel renders "not configured: <var>" — never blank, never fake |
| Migration 0005 unapplied | Approving `manual_news` fails closed with the exact constraint message; Freshness panel says "candidate_contact absent (0005 pending)" |
| Migration 0006 unapplied | Console boots to a single setup screen naming the migration; agents skip registry writes and say so |
| Claude app closed | Requests age visibly in `pending`; UI copy states the execution model; stale `claimed` recovered next pass |
| Supabase unreachable | `/api/health` red; panels show the error, actions disabled |
| Double-approve race | `WHERE status='pending'` transition guard → second actor gets 409 |
| Duplicate trigger clicks | Partial unique index → 409 with the live request shown |

Monitoring the monitor: `/api/health` is itself the liveness answer; Sentry (once DSN set) covers route errors.

## § 7 Trade-off Analysis

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Placement | In-app `/admin` | Separate app; local-only console | One deploy/design-system for a solo operator; remote access required (local-only fails the "away from laptop" goal). Cost: admin code ships in the voter app's repo/deploy — mitigated by route-level auth + zero shared anon surface |
| Auth | Supabase Auth allowlist | Middleware shared secret; Clerk | Real sessions/revocation, already in stack, $0; secret = no revocation story; Clerk = new dependency for one user |
| Trigger model | Queue + Cowork dispatcher | Direct execution from dashboard; move agents to Vercel cron now | Agents *cannot* execute serverside today (ADR-001); queue is honest, and is forward-compatible with cron graduation |
| Agent state | DB ops-plane registry | Keep parsing markdown | Markdown is single-machine and unqueryable; registry is the dashboard-era answer while reports stay the narrative artifact |
| Approval scope | Manual + gated only | Review-all (agent news queued too) | Existing allowlist/fail-closed constitution has held through dry-runs; review-all doubles operator load — revisit via per-agent flag (PRD Q1) |
| Effects | Fixed server-side map per kind | Generic "apply this diff" executor | A generic executor is an injection surface; the whitelist is the security boundary |

## § 8 Revisit As It Grows

- **Second operator** → roles column on allowlist, `actor` already recorded; decisions may need four-eyes on gated fields.
- **ADR-001 revisit** (daily news cadence) → Vercel cron consumes `agent_run_request`/writes `agent_run`; dispatcher retires; nothing else moves.
- **Queue volume growth** → notifications (Resend) + realtime subscription instead of polling.
- **Run reports fully in DB** → only if multi-machine operation happens; today `report_path` + summary is enough.
- **Analytics/Web Vitals** → enable products, then extend `/api/admin/site/*`; panels already reserve the space.
- **Trust changes** → per-agent `require_approval` flag routing agent-written news through the queue (schema already supports it: `review_item.kind='manual_news'` with `source='agent:R1'`).
