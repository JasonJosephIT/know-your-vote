-- Pipeline runtime plumbing (CAP_Runtime_PRD_v1 S1-01): the append-only
-- action_log from CAP_Logging_Schema_v1 §2, and the two Postgres roles the
-- S1 tool-layer service and read-only reporting connect through.
--
-- Idempotent by construction: CREATE TABLE/INDEX use IF NOT EXISTS, roles
-- are created inside an existence-checked DO block, and policies use the
-- drop-then-add pattern (same as 0005).
--
-- Role design notes:
--   * Roles are created NOLOGIN. Supabase's `postgres` role cannot create
--     BYPASSRLS roles, so access is granted the long way: explicit table
--     privileges (the verb layer) + explicit RLS policies (the row layer).
--     Enabling login is a founder step done out-of-band, never in a
--     committed file:  ALTER ROLE cap_tool_wrapper LOGIN PASSWORD '...';
--   * cap_tool_wrapper — used only by the S1 MCP tool-layer service.
--     INSERT-only on action_log; SELECT/INSERT/UPDATE on the content-plane
--     tables the pipeline maintains; SELECT-only on reference tables.
--     No DELETE anywhere. No access to PII (voting_info_subscription),
--     notifications, news_item (freshness plane), or the ops plane.
--   * cap_readonly — composer/report/CI queries. SELECT only, same
--     no-PII scope, plus action_log (the Symmetric Scrutiny + Audit Block
--     Rate + Traceability queries in Logging Schema §4 run as this role).
--   * race_publication stays read-only for BOTH roles: publication flips
--     through the founder/console (service role), never through a tool call.
--   * action_log is immutable for everyone: UPDATE/DELETE/TRUNCATE are
--     revoked even from service_role (same append-only posture as
--     admin_action in 0006).

-- (1) the table — DDL per CAP_Logging_Schema_v1 §2
CREATE TABLE IF NOT EXISTS action_log (
  log_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp       timestamptz NOT NULL DEFAULT NOW(),
  agent_id        text NOT NULL CHECK (agent_id IN
                    ('profiler','record','factchecker','orchestrator')),
  tool_called     text NOT NULL,
  race_id         text,
  candidate_id    text,
  source_url      text,
  source_id       text,
  bucket_written  text CHECK (bucket_written IN
                    ('verifiable_fact','stated_position','outside_opinion')),
  claim_id        text,
  status          text NOT NULL CHECK (status IN ('success','fail')),
  failure_reason  text,
  guard_triggered boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_log_race_candidate ON action_log (race_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_log_guard ON action_log (guard_triggered) WHERE guard_triggered;

-- (2) roles (CREATE ROLE has no IF NOT EXISTS in this grammar)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cap_tool_wrapper') THEN
    CREATE ROLE cap_tool_wrapper NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cap_readonly') THEN
    CREATE ROLE cap_readonly NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO cap_tool_wrapper, cap_readonly;

-- (3) action_log: RLS on, zero anon/authenticated access, append-only for all
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON action_log FROM anon, authenticated;
GRANT INSERT ON action_log TO cap_tool_wrapper;          -- write, never read back
GRANT SELECT ON action_log TO cap_readonly;              -- report/CI queries
GRANT SELECT, INSERT ON action_log TO service_role;      -- console visibility
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON action_log FROM cap_tool_wrapper, cap_readonly, service_role;
-- (no role holds UPDATE or DELETE — the log is immutable; Logging Schema §2)

DROP POLICY IF EXISTS capw_insert_action_log ON action_log;
CREATE POLICY capw_insert_action_log ON action_log
  FOR INSERT TO cap_tool_wrapper
  WITH CHECK (true);

DROP POLICY IF EXISTS capr_read_action_log ON action_log;
CREATE POLICY capr_read_action_log ON action_log
  FOR SELECT TO cap_readonly
  USING (true);

-- (4) content plane — cap_tool_wrapper writes (T1 intake upserts, T7
-- source_register, T9 claim_write, position/profile maintenance, T10 audit
-- results). SELECT is included because the wrapper reads what it maintains
-- (T8 db_read) and RLS would otherwise filter it to published-only like anon.
GRANT SELECT, INSERT, UPDATE
  ON race, candidate, candidate_social_account, source,
     claim, claim_source, issue, position, profile
  TO cap_tool_wrapper;

-- reference tables the wrapper only reads (T4 jurisdiction_resolve reads
-- zip_district; allowlist folding reads social_platform; T12's dispatch
-- check reads race_publication)
GRANT SELECT ON social_platform, zip_district, race_publication TO cap_tool_wrapper;

-- (5) cap_readonly — SELECT across the content plane + publication state.
-- Full-table visibility (not published-only): the Traceability spot-check
-- must see unpublished claims too.
GRANT SELECT
  ON race, candidate, candidate_social_account, social_platform, source,
     claim, claim_source, issue, position, profile,
     zip_district, race_publication
  TO cap_readonly;

-- (6) RLS policies for the two roles. 0002 enabled RLS on all of these with
-- anon-scoped published-only policies; these roles need their own policies
-- or every read/write is filtered to nothing. Policies are permissive (OR'd)
-- so the anon rules are untouched. The FOR ALL policies still cannot grant
-- DELETE — the privilege layer above never grants that verb.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'race','candidate','candidate_social_account','source',
    'claim','claim_source','issue','position','profile'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS capw_all_%s ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY capw_all_%s ON %I FOR ALL TO cap_tool_wrapper USING (true) WITH CHECK (true)',
      t, t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'social_platform','zip_district','race_publication'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS capw_read_%s ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY capw_read_%s ON %I FOR SELECT TO cap_tool_wrapper USING (true)',
      t, t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'race','candidate','candidate_social_account','social_platform','source',
    'claim','claim_source','issue','position','profile',
    'zip_district','race_publication'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS capr_read_%s ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY capr_read_%s ON %I FOR SELECT TO cap_readonly USING (true)',
      t, t);
  END LOOP;
END
$$;
