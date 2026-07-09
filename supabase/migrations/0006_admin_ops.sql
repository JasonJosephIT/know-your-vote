-- Ops plane for the operator console (docs/admin-dashboard/design.md § 3,
-- PRD § 4 "two-plane constitution"). Four coordination tables that describe
-- the system rather than hold voter content:
--
--   agent_run          -- what each R1-R4/dispatcher run did
--   agent_run_request  -- console-issued run requests the dispatcher consumes
--   review_item        -- the unified approval queue (manual + agent-gated)
--   admin_action       -- append-only audit of every privileged action
--
-- Constitution: the ops plane is SERVER-SIDE ONLY. RLS is enabled on all four
-- with NO anon/authenticated policies, and every privilege is REVOKEd from
-- anon/authenticated — so nothing here is reachable without the service role
-- after an allowlist check. This adds zero anon-facing surface (PRD § 5).
--
-- Idempotent by construction (safe to re-run): CREATE ... IF NOT EXISTS
-- everywhere; ENABLE RLS and REVOKE/GRANT are naturally idempotent; there are
-- no policies to drop-then-add. Mirrors 0005_refresh_agents.sql's explicit
-- REVOKEs, which defend against Supabase default privileges silently granting
-- new tables to anon (the 0005 lesson).

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid(), as in 0001

-- (1) agent_run: one row per agent execution (scheduled or requested).
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

-- (2) agent_run_request: console → dispatcher queue.
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
-- one live request per agent (duplicate-click protection, AFR-012): at most
-- one row per agent may be pending OR claimed at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_run_request_live
  ON agent_run_request (agent) WHERE status IN ('pending','claimed');

-- (3) review_item: the unified approval queue (payload shape per kind is
-- zod-mirrored in src/types/admin.ts, added in Phase A3).
CREATE TABLE IF NOT EXISTS review_item (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL CHECK (kind IN
                 ('manual_news','gated_diff','fact_flag',
                  'unclear_statement','unverified_fact','date_mismatch')),
  source       TEXT NOT NULL,            -- 'operator' | 'agent:R1' | 'agent:R2' | 'agent:R3'
  payload      JSONB NOT NULL,           -- shape per kind
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at   TIMESTAMPTZ,
  decision_note TEXT,
  applied_at   TIMESTAMPTZ,              -- set only when the approve-effect committed
  apply_error  TEXT                      -- fail-closed detail (e.g. 0005 not applied)
);
CREATE INDEX IF NOT EXISTS idx_review_item_queue ON review_item (status, created_at);

-- (4) admin_action: append-only audit. No UPDATE/DELETE, ever (PRD § 5).
CREATE TABLE IF NOT EXISTS admin_action (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        TEXT NOT NULL,              -- allowlisted email
  action       TEXT NOT NULL,              -- 'trigger' | 'submit' | 'approve' | 'reject' | 'cancel'
  subject_kind TEXT NOT NULL,              -- 'agent_run_request' | 'review_item'
  subject_id   UUID NOT NULL,
  detail       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: ops plane is server-side only (design.md § 3, PRD § 4/§ 5).
-- Enable RLS on all four, create NO anon/authenticated policies (so RLS denies
-- them by default), and REVOKE ALL from anon/authenticated as defense in depth
-- against Supabase default privileges (the 0005 lesson).
ALTER TABLE agent_run          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_request  ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_item        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action       ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON agent_run, agent_run_request, review_item, admin_action
  FROM anon, authenticated;

-- The three mutable tables: full server-side CRUD via the service role only.
GRANT ALL ON agent_run, agent_run_request, review_item TO service_role;

-- admin_action is append-only: the service role may INSERT and SELECT, but may
-- never UPDATE/DELETE/TRUNCATE it — not even as a convenience in app code
-- (PRD § 5 "Audit"). REVOKE-then-narrow-GRANT so any default privilege that
-- pre-granted ALL on this new table is stripped back to insert+read.
REVOKE ALL ON admin_action FROM service_role;
GRANT SELECT, INSERT ON admin_action TO service_role;
