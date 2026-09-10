-- 0020_publication_door_only.sql
-- Two changes, one theme: the flip-and-log door from 0018 becomes the only
-- way in, and stops being reachable by people who should never find it.
--
-- (1) THE DEFECT — 0018's EXECUTE grant did not hold on Supabase.
--
-- 0018 ended with `REVOKE ALL ON FUNCTION ... FROM PUBLIC` then a GRANT to
-- service_role, and verify-migrations passed. On the live project the ACL
-- read:
--
--     postgres=X/postgres | anon=X/postgres | authenticated=X/postgres
--     | service_role=X/postgres
--
-- Supabase ships `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON
-- FUNCTIONS TO anon, authenticated, service_role`, so the grants to anon and
-- authenticated were written at CREATE time as explicit entries. REVOKE FROM
-- PUBLIC does not touch an explicit grant to a named role, so both survived.
-- set_race_publication is SECURITY DEFINER owned by postgres, which means
-- anyone holding the public anon key could have flipped any race in or out of
-- publication. Live ACL fixed 2026-09-10; measured before and after, and the
-- audit showed no flip but the two this session made — the function's own
-- mandatory logging is what made that answerable.
--
-- This is the 0005 lesson, which 0002/0005/0006 already apply to TABLES:
-- explicit REVOKEs, because Supabase's default privileges silently grant new
-- objects to anon. Nobody had applied it to FUNCTIONS, because until 0018 no
-- function was ever granted to a role — 0010/0012's are reached through
-- triggers, which do not consult EXECUTE. verify-migrations.mjs now models
-- those default privileges, so the next function that forgets this fails the
-- harness instead of production.
--
-- (2) THE DOOR BECOMES MANDATORY — 0018 left service_role holding direct
-- UPDATE on race_publication and said so, deferring the revoke because the
-- blast radius was unverified. Audited 2026-09-10: there is no UPDATE of
-- race_publication anywhere in the codebase. src/ holds four reads (three
-- counts in admin/monitor.ts, one anon SELECT in the refresh-news cron),
-- build-demo-seed.mjs does a plain INSERT and a DELETE with no ON CONFLICT
-- clause, and verify-migrations.mjs reads it. Nothing to break.
--
-- The function keeps working without the privilege because SECURITY DEFINER
-- runs it as postgres, which retains UPDATE. That is the property that makes
-- this safe, and the harness asserts it rather than assuming it.
--
-- CONSEQUENCE, deliberate: race_publication.note is no longer writable by
-- service_role either. It holds prose from before the audit table existed
-- (FL-10's release reasoning). The structured record now lives in
-- admin_action.detail, so note is legacy, and freezing it is the point —
-- a second, hand-maintained account of the same event is how the two drift.
--
-- Idempotent: safe to re-run.

-- (1) Explicit, by name. FROM PUBLIC alone is what failed.
REVOKE ALL ON FUNCTION public.set_race_publication(TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;
GRANT EXECUTE ON FUNCTION public.set_race_publication(TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- (2) Publication moves through the door or it does not move.
REVOKE UPDATE ON race_publication FROM service_role;

COMMENT ON TABLE race_publication IS
  'Publication state. status and published_at move ONLY through '
  'set_race_publication(), which writes the admin_action row in the same '
  'statement (0018, 0020). service_role holds no UPDATE here by design.';
