-- 0023_candidate_unopposed.sql
-- Carry the DoE's UNO code into the read model.
-- See docs/general-election/ballots-handoff.md §2 (finding F2).
--
-- D-B (founder, 2026-09-07): the DoE's `UNO` status is CARRIED through ingest,
-- not derived from race composition. Florida marks a candidate `UNO` when
-- nobody filed against them, and under F.S. 101.151(7) that contest is not
-- printed on the general ballot at all — the candidate takes the office. FL-10
-- is in exactly that shape this cycle, as are state senate districts 4 and 16
-- and 28 state house districts.
--
-- WHY NOT DERIVE IT: the obvious substitute is "exactly one ballot-tier
-- candidate and no write-in". That is wrong for a race whose other candidates
-- withdrew AFTER qualifying: the survivor is `QUA`, the ballot is already
-- printed with their name on it, and the derivation would tell a voter their
-- race does not exist. The two races are indistinguishable by composition and
-- distinguishable only by the code the DoE already publishes, so the column
-- has to keep it.
--
-- WHY THIS COLUMN: `intake.py`'s `_STATUS` collapsed `UNO` into `qualified`
-- because the CHECK below admitted only three values, so the distinction died
-- at ingest. `_STATUS` now maps `UNO -> 'unopposed'`, which the old constraint
-- refuses — so this migration is a precondition for the next intake run.
--
-- NOT ballot_status. That column (0013) is a different axis: it says whether a
-- filing gets a printed line, and an unopposed candidate is still a ballot-tier
-- filing — briefed, audited, shown. `unopposed` is a *qualifying* status.
--
-- CONSEQUENCE FOR THE INGESTION GATE, stated so it is not discovered later:
-- CAP_Schema_v1.md says social accounts are ingested "only when
-- qualifying_status = 'qualified'". No code implements that as a literal
-- comparison today (checked across src/ and toollayer/ before writing this),
-- but whoever writes it must treat `unopposed` as ballot-tier alongside
-- `qualified` — an unopposed candidate is the one who will hold the office, so
-- an equality test would mute exactly the candidate a voter cannot vote
-- against.
--
-- CONSTRAINT NAME: unlike 0013's `candidate_ballot_status_check`, this CHECK
-- was written inline in 0000_pipeline_read_models.sql and named by Postgres,
-- so nothing in this repo ever asserted its name. Dropping the wrong name
-- would leave the old three-value CHECK in place beside the new one — the
-- migration would report success and every `UNO` row would still be rejected,
-- with the constraint list as the only evidence. The guard below turns that
-- silent half-application into a loud one. 0000's own header warns that the
-- pipeline may one day own these tables; this is that warning taken seriously.
--
-- Idempotent: safe to re-run.

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_qualifying_status_check;

DO $$
DECLARE stale TEXT;
BEGIN
  SELECT string_agg(conname, ', ') INTO stale
    FROM pg_constraint
   WHERE conrelid = 'candidate'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%qualifying_status%';
  IF stale IS NOT NULL THEN
    RAISE EXCEPTION
      'candidate.qualifying_status still carries CHECK constraint(s) %; drop them by name before re-running 0023, or UNO rows will keep being rejected', stale;
  END IF;
END $$;

ALTER TABLE candidate ADD CONSTRAINT candidate_qualifying_status_check
  CHECK (qualifying_status IN ('qualified','unopposed','withdrawn','other'));

COMMENT ON COLUMN candidate.qualifying_status IS
  'qualified = QUA, made the ballot against opposition; unopposed = UNO, '
  'nobody filed, so the contest is not printed at all (F.S. 101.151(7)); '
  'withdrawn = WIT/DEF/DNQ/REM; other = XTL/DEC, left the race by neither '
  'winning a place nor withdrawing (docs/general-election/ballots-handoff.md '
  'F2, decision D-B).';
