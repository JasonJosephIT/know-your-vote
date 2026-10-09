-- 0046_uthmeier_incumbent.sql
-- James Uthmeier (FL-DOE-89041) is the sitting Attorney General and is on
-- the Nov 3 ballot for that office, but his row said is_incumbent = false and
-- FL-ATG-general had no incumbent_id.
--
-- THE SOURCE. Gov. DeSantis appointed him to fill Ashley Moody's unexpired
-- term when she went to the U.S. Senate; he was sworn in on 2025-02-17. The
-- Office of the Attorney General's own site (myfloridalegal.com, read
-- 2026-10-07) issues this week's releases as "Attorney General James
-- Uthmeier", including the 2026-10-05 poaching charges.
--
-- WHY FALSE WAS THERE. False has only ever meant "unknown" on this column
-- (0031, 0038, src/lib/incumbency.ts): the B4 incumbency run has never been
-- applied, so the DoE intake left every candidate false. This sets one more
-- verified true fact, as 0038 did for Patti Rendon.
--
-- WHAT VOTERS SEE: NOTHING YET. The Incumbent chip stays hidden for everyone
-- (SHOW_INCUMBENT_CHIP = false) until every ballot candidate's incumbency is
-- set from a verified source, so one marked incumbent never makes the others
-- read as challengers. scripts/verify-incumbent-chip.ts keeps every other
-- reader of these columns out of src/.
--
-- race.incumbent_id is set beside the flag for the two hand-verified
-- incumbents, Uthmeier and Rendon (0038), so the column and the flag agree,
-- which is one of incumbency.ts's conditions for turning the chip on.
-- prior_offices stays empty, as for everyone (data-ingest.md: display-only,
-- deliberately skipped).
--
-- Idempotent: safe to re-run.

UPDATE candidate SET is_incumbent = true
 WHERE candidate_id = 'FL-DOE-89041'
   AND legal_name = 'James Uthmeier'
   AND office_sought = 'Attorney General';

UPDATE race SET incumbent_id = 'FL-DOE-89041'
 WHERE race_id = 'FL-ATG-general'
   AND 'FL-DOE-89041' = ANY (candidate_ids)
   AND (incumbent_id IS NULL OR incumbent_id = 'FL-DOE-89041');

UPDATE race SET incumbent_id = 'FL-VF-HIL-2672'
 WHERE race_id = 'FL-HIL-SB4-general'
   AND 'FL-VF-HIL-2672' = ANY (candidate_ids)
   AND (incumbent_id IS NULL OR incumbent_id = 'FL-VF-HIL-2672')
   AND EXISTS (SELECT 1 FROM candidate WHERE candidate_id = 'FL-VF-HIL-2672' AND is_incumbent);
