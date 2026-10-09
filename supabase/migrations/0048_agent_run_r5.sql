-- 0048_agent_run_r5.sql
-- Admits R5, the candidate-leads agent, in agent_run.agent
-- (docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.1 and §5
-- step 7; ledger row 0048).
--
-- WHY: scripts/agent-run.sh records every scheduled agent run in agent_run
-- through scripts/agent-run-log.ts. The CHECK 0006 declared inline admits
-- R1, R2, R3, R4 and dispatcher only, so R5's run-log insert is refused.
-- That refusal is tolerated by design: a failed run-log write prints a
-- warning and never stops a run. So this file is on no critical path. It
-- makes R5's runs visible in /admin's Agent runs panel and run history.
--
-- WHAT IT DOES: rebuilds agent_run_agent_check with R5 added and the five
-- existing values kept. No row is written or changed. The watchdog writes
-- no agent_run row of its own (it only marks stale rows failed), so it needs
-- no value here. agent_run_request is untouched: the console cannot request
-- an R5 run.
--
-- GUARD ON THE EXACT PRE-STATE (news-source-integrity §3.9). The values are
-- read out of pg_get_constraintdef. Exactly {R1, R2, R3, R4, dispatcher}:
-- rebuild. Already exactly that set plus R5: a re-run, nothing changes.
-- Anything else (another migration changed the CHECK first, the CHECK is
-- missing, or a second CHECK on agent exists) raises and names what it
-- found, so a value is never dropped silently; the file is then rewritten
-- against what is there. 0052_news_tags_kind's own guard expects this file's
-- post-state.
--
-- Live pre-state, read 2026-10-08 (SELECT only):
--   CHECK ((agent = ANY (ARRAY['R1'::text, 'R2'::text, 'R3'::text, 'R4'::text, 'dispatcher'::text])))
-- agent_run held 0 rows.
--
-- Read back after applying:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'agent_run'::regclass AND conname = 'agent_run_agent_check';
-- expect R1, R2, R3, R4, R5 and dispatcher.

DO $$
DECLARE
  cdef       TEXT;
  vals       TEXT[];
  others     TEXT;
  pre_state  CONSTANT TEXT[] := ARRAY['R1', 'R2', 'R3', 'R4', 'dispatcher'];
  post_state CONSTANT TEXT[] := ARRAY['R1', 'R2', 'R3', 'R4', 'R5', 'dispatcher'];
BEGIN
  SELECT string_agg(conname, ', ') INTO others
    FROM pg_constraint
   WHERE conrelid = 'agent_run'::regclass
     AND contype = 'c'
     AND conname <> 'agent_run_agent_check'
     AND pg_get_constraintdef(oid) ~ '\magent\M';
  IF others IS NOT NULL THEN
    RAISE EXCEPTION '0048: agent_run has other CHECK constraint(s) on agent: %. Rewrite 0048 against what is there', others;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO cdef
    FROM pg_constraint
   WHERE conrelid = 'agent_run'::regclass AND conname = 'agent_run_agent_check';
  IF cdef IS NULL THEN
    RAISE EXCEPTION '0048: agent_run_agent_check not found. Rewrite 0048 against what is there';
  END IF;

  SELECT COALESCE(array_agg(m[1] ORDER BY m[1] COLLATE "C"), '{}') INTO vals
    FROM regexp_matches(cdef, '''([^'']+)''', 'g') AS m;

  IF vals @> post_state AND vals <@ post_state THEN
    RAISE NOTICE '0048: agent_run_agent_check already admits R5; nothing to do';
    RETURN;
  END IF;
  IF NOT (vals @> pre_state AND vals <@ pre_state) THEN
    RAISE EXCEPTION '0048: agent_run_agent_check admits {%}, expected exactly {R1, R2, R3, R4, dispatcher}. Another migration changed it first; rewrite 0048 against what is there',
      array_to_string(vals, ', ');
  END IF;

  ALTER TABLE agent_run DROP CONSTRAINT agent_run_agent_check;
  ALTER TABLE agent_run ADD CONSTRAINT agent_run_agent_check
    CHECK (agent IN ('R1', 'R2', 'R3', 'R4', 'R5', 'dispatcher'));
END $$;
