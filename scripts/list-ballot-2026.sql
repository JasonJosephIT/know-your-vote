-- scripts/list-ballot-2026.sql
-- GO-LIVE for the `listed` tier (0033): puts the 2026 general-election roster
-- in front of voters -- every race, every ballot-tier candidate, the three
-- amendments' ballot text -- and not one brief.
--
-- NOT A MIGRATION. Run BY HAND, once, after BOTH of these are true:
--   1. the listing UI is deployed (the race / candidate / measure pages and
--      the lists know how to render a row that is visible with no brief), and
--   2. 0033_listed_publication.sql is applied live (it widens the CHECKs,
--      recreates set_race_publication with 'listed', and seeds a 'draft'
--      race_publication row for every general race).
-- Order and reasoning: docs/general-election/listed-tier-2026-09-23.md.
-- Running it before (1) hands listed rows to code written for published-only
-- rows, which may read a roster as an empty brief; before (2) it fails on the
-- CHECK (and set_race_publication rejects 'listed').
--
-- WHAT IT DOES, in one transaction:
--   * races: every general-election race whose publication row is 'draft' is
--     flipped to 'listed' THROUGH THE DOOR, set_race_publication(), so each
--     flip writes its own admin_action row (action 'list') with the actor and
--     reason below. race_publication accepts no direct UPDATE (0020), so there
--     is no other way, and that is the point. in_review and published rows
--     are left alone: this script never pulls a brief down, and never
--     promotes a race a reviewer is holding.
--   * measures: every general_2026 ballot_measure with NO measure_publication
--     row gets one at 'listed'. Measures have no door function, so the audit
--     row is written here, in the same statement block, with the same actor
--     and reason (subject_kind 'measure_publication', action 'list'). A
--     listed measure with no arguments is accepted: 0010's balance trigger
--     only checks status = 'published'.
--
-- Idempotent: a second run finds no draft race and no measure without a row,
-- flips nothing and logs nothing.
--
-- Actor and reason are constants at the top of the DO block rather than psql
-- variables, because psql does not interpolate :'vars' inside a dollar-quoted
-- body and this has to run unchanged through the Supabase SQL editor / MCP
-- execute_sql as well as psql. Edit them there if someone else runs it.
--
-- HOW TO REVERSE (also by hand, also through the door):
--   races:    SELECT set_race_publication(rp.race_id, 'draft', '<actor>', '<why>')
--               FROM race_publication rp JOIN race r USING (race_id)
--              WHERE r.election = 'general' AND rp.status = 'listed';
--             (logs 'unlist' per race)
--   measures: DELETE FROM measure_publication WHERE status = 'listed';
--             then INSERT an admin_action row saying so -- there is no door
--             to do it for you.
--   Neither touches a published race or measure.
--
-- Verified: scripts/verify-ballot-seeds.mjs applies every migration, then this
-- file, to PGlite and asserts every general race ends 'listed', none
-- 'published', and every measure 'listed' -- then runs it again to prove the
-- second run is a no-op.

BEGIN;

DO $$
DECLARE
  c_actor  CONSTANT TEXT := 'founder';
  c_reason CONSTANT TEXT :=
    'Listed tier: roster from DoE 20261103-GEN export and county VoterFocus '
    'lists; briefs not yet written (0033)';
  v_race    RECORD;
  v_races   INT := 0;
  v_measures INT := 0;
BEGIN
  FOR v_race IN
    SELECT rp.race_id
      FROM race_publication rp
      JOIN race r ON r.race_id = rp.race_id
     WHERE r.election = 'general'
       AND rp.status = 'draft'
     ORDER BY rp.race_id
  LOOP
    PERFORM set_race_publication(v_race.race_id, 'listed', c_actor, c_reason);
    v_races := v_races + 1;
  END LOOP;

  WITH inserted AS (
    INSERT INTO measure_publication (measure_id, status, note)
    SELECT bm.measure_id, 'listed', c_reason
      FROM ballot_measure bm
     WHERE bm.election = 'general_2026'
       AND NOT EXISTS (
         SELECT 1 FROM measure_publication mp WHERE mp.measure_id = bm.measure_id
       )
    RETURNING measure_id
  ), logged AS (
    INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
    SELECT c_actor, 'list', 'measure_publication', measure_id,
           jsonb_build_object(
             'prior_status', NULL,
             'new_status',   'listed',
             'reason',       c_reason
           )
      FROM inserted
    RETURNING 1
  )
  SELECT count(*) INTO v_measures FROM logged;

  RAISE NOTICE 'list-ballot-2026: listed % race(s) and % measure(s)', v_races, v_measures;
END $$;

COMMIT;
