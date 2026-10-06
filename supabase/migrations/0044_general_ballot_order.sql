-- 0044_general_ballot_order.sql
-- Puts race.candidate_ids for the 2026 general into Florida's ballot order.
--
-- Every race page says its candidates are "in ballot order", and the
-- methodology page said "one neutral rule (ballot order, otherwise
-- alphabetical)". The app sorted by position in race.candidate_ids, and that
-- array was not ballot order: the DoE intake (intake.py) sorted it by
-- candidate-ID string, and the county seeds (0031, 0038) kept whatever order
-- the county list came in. On 2026-10-05, 17 of the 25 contested partisan
-- races were out of order and 11 listed the Democrat ahead of the Republican.
--
-- THE RULE (Fla. Stat., 2025, read on flsenate.gov 2026-10-05):
--   s. 101.151(3)(a): on the general election ballot, the candidates of the
--     party that received the most votes for Governor in the last election
--     in which a Governor was elected go first, and the second party's go
--     second. In 2022 the Republican won and the Democrat came second, so
--     for 2026: REP first, DEM second.
--   s. 101.151(3)(b): minor-party candidates follow, "in the same order as
--     they were qualified", then candidates with no party affiliation, "in
--     the order as they were qualified".
--   s. 105.041(2): candidates for a nonpartisan office are "listed in
--     alphabetical order" (by surname, as the county ballots do).
--
-- QUALIFYING ORDER is in no feed we read (the DoE export has no qualifying
-- date). Only FL-GOV has more than one minor-party or no-party candidate, and
-- its order is copied from the Orange County composite sample ballot for the
-- Nov 3 2026 general, created 2026-10-01:
--   https://voteorangefl.gov/wp-content/uploads/2026/10/26GEN113-CB-EN-26-10-1-15-9-21.pdf
--   Governor and Lieutenant Governor: Byron Donalds REP, David Jolly DEM,
--   Scott Eckhard Jewett LPF, Charles Burkett NPA, Frank J. Russo NPA,
--   Moliere "Moe" Dimanche NPA, Dean Ocean Abrams NPA,
--   Jeffrey Peter "Dr. Jeff" Datto NPA.
-- Every other race below has at most one candidate per party rank, so the
-- statute alone fixes its order.
--
-- CROSS-CHECKED against that same Orange composite: every race it shares
-- with us comes out in its printed order once this file is applied. Changed
-- here: U.S. Senator (Moody, Nixon, Gillespie), Congress 9 (Green, Soto),
-- Congress 11 (Strada, Pericola, Groves), Governor, and Orange Clerk of
-- Courts (Johnson DEM, Thomas NPA). Already right: Congress 8, Attorney
-- General, CFO, Agriculture Commissioner, and the nonpartisan Orange Mayor,
-- Commission 2/4/6/7/8 and School Board 3. Hillsborough Commission 1 and 7
-- follow the statute; no Hillsborough sample ballot was read.
--
-- NONPARTISAN RACES are not touched: all 12 contested ones were already in
-- surname order.
--
-- THE CODE does not depend on this file. src/lib/ballot-order.ts orders by
-- party rank first and uses candidate_ids only to break ties inside a rank,
-- so every partisan race reads REP, DEM, minor, NPA whether or not this has
-- been applied. What this file adds: FL-GOV's five NPA candidates in their
-- qualifying order (until it is applied the new code lists them in
-- candidate-ID order), and arrays that agree with the page for the pipeline
-- and anyone reading the table directly. Applying it before the code
-- deploys also fixes the order the CURRENT code shows, since that code sorts
-- by this array alone (a cached race page picks it up when its one-hour
-- cache next refreshes, or when the news cron revalidates the "races" tag).
--
-- SAFE AGAINST A CHANGED ROSTER: each UPDATE fires only when the race holds
-- exactly the same candidates as listed here, in a different order. If a
-- candidate has been added or removed since 2026-10-05, the row is left alone
-- and the NOTICE at the end names it, rather than this file putting back a
-- withdrawn candidate or dropping a new one.
--
-- Note: 0038 sets FL-HIL-CC7's array with the Democrat first. Run in order,
-- this file comes after it and wins. Re-running 0038 by hand would put the
-- old order back in the data (the page would still show the statute's order).
--
-- Idempotent: a second run matches no row (IS DISTINCT FROM).

UPDATE race SET candidate_ids = ARRAY['FL-DOE-89042', 'FL-DOE-89243', 'FL-DOE-84076', 'FL-DOE-90630', 'FL-DOE-89571', 'FL-DOE-88529', 'FL-DOE-90433', 'FL-DOE-89630']
 WHERE race_id = 'FL-GOV-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-89042', 'FL-DOE-89243', 'FL-DOE-84076', 'FL-DOE-90630', 'FL-DOE-89571', 'FL-DOE-88529', 'FL-DOE-90433', 'FL-DOE-89630']
   AND candidate_ids @> ARRAY['FL-DOE-89042', 'FL-DOE-89243', 'FL-DOE-84076', 'FL-DOE-90630', 'FL-DOE-89571', 'FL-DOE-88529', 'FL-DOE-90433', 'FL-DOE-89630']
   AND cardinality(candidate_ids) = 8;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-89119', 'FL-DOE-90009', 'FL-DOE-89955']
 WHERE race_id = 'FL-SEN-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-89119', 'FL-DOE-90009', 'FL-DOE-89955']
   AND candidate_ids @> ARRAY['FL-DOE-89119', 'FL-DOE-90009', 'FL-DOE-89955']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-90696', 'FL-DOE-90631', 'FL-DOE-92377']
 WHERE race_id = 'FL-7-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-90696', 'FL-DOE-90631', 'FL-DOE-92377']
   AND candidate_ids @> ARRAY['FL-DOE-90696', 'FL-DOE-90631', 'FL-DOE-92377']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-91337', 'FL-DOE-89339']
 WHERE race_id = 'FL-9-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-91337', 'FL-DOE-89339']
   AND candidate_ids @> ARRAY['FL-DOE-91337', 'FL-DOE-89339']
   AND cardinality(candidate_ids) = 2;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-91717', 'FL-DOE-91715', 'FL-DOE-88517']
 WHERE race_id = 'FL-11-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-91717', 'FL-DOE-91715', 'FL-DOE-88517']
   AND candidate_ids @> ARRAY['FL-DOE-91717', 'FL-DOE-91715', 'FL-DOE-88517']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-91313', 'FL-DOE-88870', 'FL-DOE-92395']
 WHERE race_id = 'FL-14-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-91313', 'FL-DOE-88870', 'FL-DOE-92395']
   AND candidate_ids @> ARRAY['FL-DOE-91313', 'FL-DOE-88870', 'FL-DOE-92395']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-89121', 'FL-DOE-89116']
 WHERE race_id = 'FL-15-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-89121', 'FL-DOE-89116']
   AND candidate_ids @> ARRAY['FL-DOE-89121', 'FL-DOE-89116']
   AND cardinality(candidate_ids) = 2;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-90251', 'FL-DOE-90779', 'FL-DOE-89623']
 WHERE race_id = 'FL-16-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-90251', 'FL-DOE-90779', 'FL-DOE-89623']
   AND candidate_ids @> ARRAY['FL-DOE-90251', 'FL-DOE-90779', 'FL-DOE-89623']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-91278', 'FL-DOE-91577', 'FL-DOE-90814']
 WHERE race_id = 'FL-20-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-91278', 'FL-DOE-91577', 'FL-DOE-90814']
   AND candidate_ids @> ARRAY['FL-DOE-91278', 'FL-DOE-91577', 'FL-DOE-90814']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-92109', 'FL-DOE-89301']
 WHERE race_id = 'FL-22-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-92109', 'FL-DOE-89301']
   AND candidate_ids @> ARRAY['FL-DOE-92109', 'FL-DOE-89301']
   AND cardinality(candidate_ids) = 2;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-89801', 'FL-DOE-88911', 'FL-DOE-92357']
 WHERE race_id = 'FL-25-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-89801', 'FL-DOE-88911', 'FL-DOE-92357']
   AND candidate_ids @> ARRAY['FL-DOE-89801', 'FL-DOE-88911', 'FL-DOE-92357']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-90330', 'FL-DOE-89980', 'FL-DOE-92137']
 WHERE race_id = 'FL-26-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-90330', 'FL-DOE-89980', 'FL-DOE-92137']
   AND candidate_ids @> ARRAY['FL-DOE-90330', 'FL-DOE-89980', 'FL-DOE-92137']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-90721', 'FL-DOE-89933']
 WHERE race_id = 'FL-27-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-90721', 'FL-DOE-89933']
   AND candidate_ids @> ARRAY['FL-DOE-90721', 'FL-DOE-89933']
   AND cardinality(candidate_ids) = 2;

UPDATE race SET candidate_ids = ARRAY['FL-DOE-91226', 'FL-DOE-91699', 'FL-DOE-90340']
 WHERE race_id = 'FL-28-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-DOE-91226', 'FL-DOE-91699', 'FL-DOE-90340']
   AND candidate_ids @> ARRAY['FL-DOE-91226', 'FL-DOE-91699', 'FL-DOE-90340']
   AND cardinality(candidate_ids) = 3;

UPDATE race SET candidate_ids = ARRAY['FL-VF-HIL-2880', 'FL-VF-HIL-2640']
 WHERE race_id = 'FL-HIL-CC1-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-VF-HIL-2880', 'FL-VF-HIL-2640']
   AND candidate_ids @> ARRAY['FL-VF-HIL-2880', 'FL-VF-HIL-2640']
   AND cardinality(candidate_ids) = 2;

UPDATE race SET candidate_ids = ARRAY['FL-VF-HIL-2620', 'FL-VF-HIL-2660']
 WHERE race_id = 'FL-HIL-CC7-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-VF-HIL-2620', 'FL-VF-HIL-2660']
   AND candidate_ids @> ARRAY['FL-VF-HIL-2620', 'FL-VF-HIL-2660']
   AND cardinality(candidate_ids) = 2;

UPDATE race SET candidate_ids = ARRAY['FL-VF-ORA-1401', 'FL-VF-ORA-1364']
 WHERE race_id = 'FL-ORA-CLERK-general'
   AND candidate_ids IS DISTINCT FROM ARRAY['FL-VF-ORA-1401', 'FL-VF-ORA-1364']
   AND candidate_ids @> ARRAY['FL-VF-ORA-1401', 'FL-VF-ORA-1364']
   AND cardinality(candidate_ids) = 2;

-- Name any race above that exists but was left alone because its candidates
-- changed after 2026-10-05. A NOTICE, not an exception: the code orders those
-- races correctly by party anyway, and a roster change is not this file's to
-- undo. The offline harness has only the county races, so it names none.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT race.race_id
      FROM race
      JOIN (VALUES
        ('FL-GOV-general',       ARRAY['FL-DOE-89042', 'FL-DOE-89243', 'FL-DOE-84076', 'FL-DOE-90630', 'FL-DOE-89571', 'FL-DOE-88529', 'FL-DOE-90433', 'FL-DOE-89630']),
        ('FL-SEN-general',       ARRAY['FL-DOE-89119', 'FL-DOE-90009', 'FL-DOE-89955']),
        ('FL-7-general',         ARRAY['FL-DOE-90696', 'FL-DOE-90631', 'FL-DOE-92377']),
        ('FL-9-general',         ARRAY['FL-DOE-91337', 'FL-DOE-89339']),
        ('FL-11-general',        ARRAY['FL-DOE-91717', 'FL-DOE-91715', 'FL-DOE-88517']),
        ('FL-14-general',        ARRAY['FL-DOE-91313', 'FL-DOE-88870', 'FL-DOE-92395']),
        ('FL-15-general',        ARRAY['FL-DOE-89121', 'FL-DOE-89116']),
        ('FL-16-general',        ARRAY['FL-DOE-90251', 'FL-DOE-90779', 'FL-DOE-89623']),
        ('FL-20-general',        ARRAY['FL-DOE-91278', 'FL-DOE-91577', 'FL-DOE-90814']),
        ('FL-22-general',        ARRAY['FL-DOE-92109', 'FL-DOE-89301']),
        ('FL-25-general',        ARRAY['FL-DOE-89801', 'FL-DOE-88911', 'FL-DOE-92357']),
        ('FL-26-general',        ARRAY['FL-DOE-90330', 'FL-DOE-89980', 'FL-DOE-92137']),
        ('FL-27-general',        ARRAY['FL-DOE-90721', 'FL-DOE-89933']),
        ('FL-28-general',        ARRAY['FL-DOE-91226', 'FL-DOE-91699', 'FL-DOE-90340']),
        ('FL-HIL-CC1-general',   ARRAY['FL-VF-HIL-2880', 'FL-VF-HIL-2640']),
        ('FL-HIL-CC7-general',   ARRAY['FL-VF-HIL-2620', 'FL-VF-HIL-2660']),
        ('FL-ORA-CLERK-general', ARRAY['FL-VF-ORA-1401', 'FL-VF-ORA-1364'])
      ) AS v(race_id, ids) ON v.race_id = race.race_id
     WHERE race.candidate_ids IS DISTINCT FROM v.ids
  LOOP
    RAISE NOTICE '0044: % left as it is: its candidates differ from the 2026-10-05 roster', r.race_id;
  END LOOP;
END $$;

-- REVERSAL (not run). Restores each race's order as it was on 2026-10-05,
-- and only where this file's order is still in place:
--
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-84076', 'FL-DOE-88529', 'FL-DOE-89042', 'FL-DOE-89243', 'FL-DOE-89571', 'FL-DOE-89630', 'FL-DOE-90433', 'FL-DOE-90630']
--  WHERE race_id = 'FL-GOV-general' AND candidate_ids = ARRAY['FL-DOE-89042', 'FL-DOE-89243', 'FL-DOE-84076', 'FL-DOE-90630', 'FL-DOE-89571', 'FL-DOE-88529', 'FL-DOE-90433', 'FL-DOE-89630'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-89119', 'FL-DOE-89955', 'FL-DOE-90009']
--  WHERE race_id = 'FL-SEN-general' AND candidate_ids = ARRAY['FL-DOE-89119', 'FL-DOE-90009', 'FL-DOE-89955'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-90631', 'FL-DOE-90696', 'FL-DOE-92377']
--  WHERE race_id = 'FL-7-general' AND candidate_ids = ARRAY['FL-DOE-90696', 'FL-DOE-90631', 'FL-DOE-92377'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-89339', 'FL-DOE-91337']
--  WHERE race_id = 'FL-9-general' AND candidate_ids = ARRAY['FL-DOE-91337', 'FL-DOE-89339'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-88517', 'FL-DOE-91715', 'FL-DOE-91717']
--  WHERE race_id = 'FL-11-general' AND candidate_ids = ARRAY['FL-DOE-91717', 'FL-DOE-91715', 'FL-DOE-88517'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-88870', 'FL-DOE-91313', 'FL-DOE-92395']
--  WHERE race_id = 'FL-14-general' AND candidate_ids = ARRAY['FL-DOE-91313', 'FL-DOE-88870', 'FL-DOE-92395'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-89116', 'FL-DOE-89121']
--  WHERE race_id = 'FL-15-general' AND candidate_ids = ARRAY['FL-DOE-89121', 'FL-DOE-89116'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-89623', 'FL-DOE-90251', 'FL-DOE-90779']
--  WHERE race_id = 'FL-16-general' AND candidate_ids = ARRAY['FL-DOE-90251', 'FL-DOE-90779', 'FL-DOE-89623'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-90814', 'FL-DOE-91278', 'FL-DOE-91577']
--  WHERE race_id = 'FL-20-general' AND candidate_ids = ARRAY['FL-DOE-91278', 'FL-DOE-91577', 'FL-DOE-90814'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-89301', 'FL-DOE-92109']
--  WHERE race_id = 'FL-22-general' AND candidate_ids = ARRAY['FL-DOE-92109', 'FL-DOE-89301'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-88911', 'FL-DOE-89801', 'FL-DOE-92357']
--  WHERE race_id = 'FL-25-general' AND candidate_ids = ARRAY['FL-DOE-89801', 'FL-DOE-88911', 'FL-DOE-92357'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-89980', 'FL-DOE-90330', 'FL-DOE-92137']
--  WHERE race_id = 'FL-26-general' AND candidate_ids = ARRAY['FL-DOE-90330', 'FL-DOE-89980', 'FL-DOE-92137'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-89933', 'FL-DOE-90721']
--  WHERE race_id = 'FL-27-general' AND candidate_ids = ARRAY['FL-DOE-90721', 'FL-DOE-89933'];
-- UPDATE race SET candidate_ids = ARRAY['FL-DOE-90340', 'FL-DOE-91226', 'FL-DOE-91699']
--  WHERE race_id = 'FL-28-general' AND candidate_ids = ARRAY['FL-DOE-91226', 'FL-DOE-91699', 'FL-DOE-90340'];
-- UPDATE race SET candidate_ids = ARRAY['FL-VF-HIL-2640', 'FL-VF-HIL-2880']
--  WHERE race_id = 'FL-HIL-CC1-general' AND candidate_ids = ARRAY['FL-VF-HIL-2880', 'FL-VF-HIL-2640'];
-- UPDATE race SET candidate_ids = ARRAY['FL-VF-HIL-2660', 'FL-VF-HIL-2620']
--  WHERE race_id = 'FL-HIL-CC7-general' AND candidate_ids = ARRAY['FL-VF-HIL-2620', 'FL-VF-HIL-2660'];
-- UPDATE race SET candidate_ids = ARRAY['FL-VF-ORA-1364', 'FL-VF-ORA-1401']
--  WHERE race_id = 'FL-ORA-CLERK-general' AND candidate_ids = ARRAY['FL-VF-ORA-1401', 'FL-VF-ORA-1364'];

-- CHECK after applying (read-only). Every general race, its candidates in
-- stored order; each partisan race should read REP, DEM, minor parties, NPA,
-- and each nonpartisan race A to Z by surname:
--
-- SELECT r.race_id,
--        array_agg(c.party || ':' || c.legal_name ORDER BY o.ord) AS ballot
--   FROM race r
--   CROSS JOIN LATERAL unnest(r.candidate_ids) WITH ORDINALITY o(cid, ord)
--   JOIN candidate c ON c.candidate_id = o.cid
--  WHERE r.race_id LIKE '%-general'
--  GROUP BY r.race_id
--  ORDER BY r.race_id;
