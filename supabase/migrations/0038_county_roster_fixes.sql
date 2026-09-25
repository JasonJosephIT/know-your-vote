-- Three county races listed candidates who are not on the November ballot.
--
-- Found during Session B (docs/general-election/candidate-sites-2026-09-24.md,
-- "Roster problems found along the way") and confirmed on each county's
-- VoterFocus 2026 candidate list, read 2026-09-25 -- the same source 0031 and
-- 0032 were seeded from:
--
--   FL-HIL-CC7-general  Hillsborough County Commission, District 7
--     Adam Hattersley (DEM, ca=2639)   "Inactive-Withdrawn"  -> out
--     Aileen Rodriguez (DEM, ca=2660)  "Active-Qualified"    -> in
--     The race is Joshua Wostal (REP) vs Aileen Rodriguez (DEM).
--
--   FL-HIL-SB4-general  Hillsborough County School Board, District 4
--     Ashley Meeder (ca=2691)          "Inactive-Withdrawn"  -> out
--     Patricia "Patti" Rendon (ca=2672) "Active-Unopposed"   -> in
--     A decided seat (0032): Rendon, the sitting member, drew no opponent.
--
--   FL-DAD-SB1-general  Miami-Dade County School Board, District 1 (special)
--     Thera Johnson (NOP, ca=3080)     "Inactive-Defeated"   -> out
--     Katrina Wilson (NOP, ca=3070)    "Active-Runoff"       -> in
--     The Nov 3 runoff is Linda Cothiere vs Katrina Wilson. Johnson got 32
--     write-in votes in the Aug 18 primary (Ballotpedia agrees).
--
-- ROOT CAUSE. docs/general-election/ballots/local-ballot-2026-09-21.json, the
-- derived list 0031/0032 were written from, paired each of these names with a
-- status belonging to a DIFFERENT candidate in the same contest: Hattersley
-- carries Rodriguez's "Qualified", Meeder carries Rendon's "Unopposed", Johnson
-- carries Wilson's "Runoff". The candidate list itself was right; the
-- name-to-status join was not. That snapshot is left as it was read (it is a
-- record of that read), and this file corrects the rows built from it.
--
-- NO OTHER RACE IS AFFECTED. All 49 county ballot-tier candidates were checked
-- against the live VoterFocus lists on 2026-09-25: every other name carries
-- the status 0031/0032 gave it, and no other contest has a live candidate
-- (Qualified, Runoff, Unopposed or Elected) missing from our race.
--
-- HOW, following the existing conventions:
--   - The three out are kept, not deleted: qualifying_status 'withdrawn'
--     (0032 defines it as WIT/DEF/DNQ/REM) and ballot_status 'excluded' (0013:
--     DEF/DNQ/WIT/REM). They leave race.candidate_ids, because no excluded
--     candidate is listed in any race; that is also what removes them from the
--     anon-readable roster, whose policy (0033) keys on race.candidate_ids.
--     Nothing references them (no socials, contacts, news, profiles).
--   - The three in reuse the VoterFocus key, FL-VF-<county>-<ca>, and the
--     party exactly as each county printed it (0031's rule).
--   - Their official_site was verified by the Session B method: fetched and
--     read, accepted only where the page names the candidate and the office.
--     Evidence and robots.txt readings are in the candidate-sites doc.
--   - is_incumbent is true only for Rendon, the sitting District 4 member
--     (Ballotpedia; hillsboroughschools.org). False elsewhere still means
--     unknown, as 0031 says.
--
-- The ballot tier stays at 106 (three out, three in); sited goes 93 -> 96.
--
-- Idempotent: safe to re-run.

UPDATE candidate SET
  qualifying_status = 'withdrawn',
  ballot_status     = 'excluded'
WHERE candidate_id IN ('FL-VF-HIL-2639', 'FL-VF-HIL-2691', 'FL-VF-DAD-3080');

INSERT INTO candidate
  (candidate_id, legal_name, party, office_sought, is_incumbent,
   qualifying_status, ballot_status, official_site, site_last_verified_at)
VALUES
  ('FL-VF-HIL-2660', 'Aileen Rodriguez', 'DEM',
   'Hillsborough County Commission, District 7', false,
   'qualified', 'ballot', 'https://voteaileen2026.com/', '2026-09-25T00:00:00Z'),
  -- Disclaimer "Paid for and approved by Aileen Rodriguez, Democrat for
  -- Hillsborough County Commission, District 7"; the SOE lists the same
  -- domain in her campaign email.
  ('FL-VF-HIL-2672', 'Patricia "Patti" Rendon', '',
   'Hillsborough County School Board, District 4', true,
   'unopposed', 'ballot', 'https://www.votepattirendon.com/', '2026-09-25T00:00:00Z'),
  -- Title "Patti Rendon For School Board"; disclaimer "Paid for by Patti
  -- Rendon, Non-Partisan, for School Board District 4". www is canonical
  -- (og:url).
  ('FL-VF-DAD-3070', 'Katrina Wilson', 'NOP',
   'Miami-Dade County School Board, District 1', false,
   'qualified', 'ballot', 'https://wilsonforeducation.com/', '2026-09-25T00:00:00Z')
  -- Ballotpedia's campaign link; the page names her and "School Board
  -- District 1" in Miami-Dade. No title or disclaimer on the page.
ON CONFLICT (candidate_id) DO UPDATE SET
  legal_name            = EXCLUDED.legal_name,
  party                 = EXCLUDED.party,
  office_sought         = EXCLUDED.office_sought,
  is_incumbent          = EXCLUDED.is_incumbent,
  qualifying_status     = EXCLUDED.qualifying_status,
  ballot_status         = EXCLUDED.ballot_status,
  official_site         = EXCLUDED.official_site,
  site_last_verified_at = EXCLUDED.site_last_verified_at;

UPDATE race SET candidate_ids = ARRAY['FL-VF-HIL-2660', 'FL-VF-HIL-2620']
 WHERE race_id = 'FL-HIL-CC7-general';
UPDATE race SET candidate_ids = ARRAY['FL-VF-HIL-2672']
 WHERE race_id = 'FL-HIL-SB4-general';
UPDATE race SET candidate_ids = ARRAY['FL-VF-DAD-3076', 'FL-VF-DAD-3070']
 WHERE race_id = 'FL-DAD-SB1-general';

-- Assert the corrected state. The county roster is seeded by 0031/0032, so
-- everything down to the roster counts holds in the offline harness too; the
-- whole-ballot counts need the DoE roster and run only on the live project.
DO $$
DECLARE
  n INT;
BEGIN
  -- Each race holds exactly the corrected candidates.
  IF (SELECT candidate_ids FROM race WHERE race_id = 'FL-HIL-CC7-general')
       IS DISTINCT FROM ARRAY['FL-VF-HIL-2660', 'FL-VF-HIL-2620']
  OR (SELECT candidate_ids FROM race WHERE race_id = 'FL-HIL-SB4-general')
       IS DISTINCT FROM ARRAY['FL-VF-HIL-2672']
  OR (SELECT candidate_ids FROM race WHERE race_id = 'FL-DAD-SB1-general')
       IS DISTINCT FROM ARRAY['FL-VF-DAD-3076', 'FL-VF-DAD-3070'] THEN
    RAISE EXCEPTION 'a corrected race does not hold the expected candidate_ids';
  END IF;

  -- The three out are excluded and listed in no race.
  SELECT count(*) INTO n FROM candidate
   WHERE candidate_id IN ('FL-VF-HIL-2639', 'FL-VF-HIL-2691', 'FL-VF-DAD-3080')
     AND (ballot_status <> 'excluded' OR qualifying_status <> 'withdrawn');
  IF n > 0 THEN
    RAISE EXCEPTION '% removed candidate(s) are not withdrawn/excluded', n;
  END IF;
  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
   WHERE cid IN ('FL-VF-HIL-2639', 'FL-VF-HIL-2691', 'FL-VF-DAD-3080');
  IF n > 0 THEN
    RAISE EXCEPTION 'a removed candidate is still listed in % race(s)', n;
  END IF;

  -- No race lists an excluded candidate (the invariant this file relies on).
  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE c.ballot_status <> 'ballot';
  IF n > 0 THEN
    RAISE EXCEPTION '% race entries point at a non-ballot candidate', n;
  END IF;

  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.level = 'county' AND c.ballot_status = 'ballot';
  IF n <> 49 THEN
    RAISE EXCEPTION 'county ballot tier has % candidates, expected 49', n;
  END IF;

  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general';
  IF n = 0 THEN
    RAISE NOTICE 'DoE roster absent (offline harness) - whole-ballot counts not asserted';
    RETURN;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot';
  IF n <> 106 THEN
    RAISE EXCEPTION 'the ballot tier has % candidates, expected 106', n;
  END IF;
  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot'
     AND c.official_site IS NOT NULL;
  IF n <> 96 THEN
    RAISE EXCEPTION 'expected 96 of 106 ballot candidates to have official_site, found %', n;
  END IF;

  RAISE NOTICE 'county roster corrected: 106 ballot candidates, 96 with a verified official_site';
END $$;
