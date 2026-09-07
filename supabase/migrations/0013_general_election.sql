-- 0013_general_election.sql
-- Primary -> general. See docs/general-election/data-architecture.md §1-§2.
--
-- NUMBER: 0013 was reserved in supabase/migrations/README.md long before this
-- file was written (it was 0010, then 0012; both were taken by other work in
-- the meantime). 0014-0017 shipped ahead of it. Postgres applies by filename
-- order, so this file lands BEFORE them on a fresh database and AFTER them on
-- the live one. That is safe here only because nothing in 0014-0017 touches
-- the candidate table — verified before writing this. Do not assume it for
-- the next out-of-order number.
--
-- D1 (founder, 2026-09-07): three tiers, but only 'ballot' is ever shown.
-- The founder's rule is "solely people that will be visible on the ballot",
-- so a qualified write-in is treated exactly like a defeated filer: out of
-- race.candidate_ids, out of the audit, off the page. The tier keeps its own
-- value anyway because the parser must distinguish PartyCode='WRI' to apply
-- the status-then-party precedence rule, and because a write-in and a primary
-- loser are different facts worth not conflating.
--
-- WHY THIS COLUMN AT ALL: parse_candidate_list appends EVERY filed row to
-- race.candidate_ids with no status filter. B1 measured the damage on the
-- live file — 87 non-ballot names against 22 real ballot lines, at least one
-- in every one of the eight target races. The Balance Audit HALTs a race at
-- 10% variance, and one candidate with zero claims against an incumbent with
-- twelve is 100%. Without this filter the pipeline's default outcome is that
-- nothing publishes at all.
--
-- DEFAULT 'ballot' keeps every existing row valid and makes this a no-op for
-- current data.
--
-- D2 (founder, 2026-09-07): drop the party CHECK. In a closed primary only
-- REP/DEM ballots existed, so the enum was free. On a general ballot IND, LPF
-- and CPF are distinct printed lines that all render as 'other' today — real
-- parties erased into one bucket. B1 also found MGT, which arrives with an
-- EMPTY PartyDesc, so the read model must tolerate a code with no label at
-- all. A constraint whose job is protecting display logic is better replaced
-- by display logic that cannot crash.
--
-- Idempotent: safe to re-run.

ALTER TABLE candidate
  ADD COLUMN IF NOT EXISTS ballot_status TEXT NOT NULL DEFAULT 'ballot';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_ballot_status_check'
  ) THEN
    ALTER TABLE candidate ADD CONSTRAINT candidate_ballot_status_check
      CHECK (ballot_status IN ('ballot','write_in','excluded'));
  END IF;
END $$;

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_party_check;

-- Audit + brief reads always filter on the briefed tier.
CREATE INDEX IF NOT EXISTS idx_candidate_ballot_status ON candidate (ballot_status);

COMMENT ON COLUMN candidate.ballot_status IS
  'ballot = printed line (QUA/UNO, not WRI); write_in = qualified write-in, '
  'no printed line; excluded = DEF/DNQ/WIT/REM. Only ballot is briefed, '
  'audited, or shown (docs/general-election/data-architecture.md D1).';
