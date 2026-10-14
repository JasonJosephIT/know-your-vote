-- 0057_miami_dade_decided_seats.sql
-- Eight Miami-Dade county seats that are settled for 2026 and missing from
-- the guide: six County Commission seats and two School Board seats. A voter
-- in Commission District 4, say, had no row for their own commissioner, where
-- a Broward voter in Commission District 2 has had one since 0032. Founder
-- rule 2026-10-12: no covered voter lands on an empty race state.
-- Write-up: docs/general-election/empty-races-2026-10-12.md.
--
-- THE SEATS (Miami-Dade's VoterFocus candidate list, read 2026-10-13 01:29
-- UTC, https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=miamidade;
-- the label is the row's last status span, as src/lib/logistics-check.ts
-- parseVoterFocus reads it):
--   County Commission District 01   Steve Gallon III               Unopposed
--   County Commission District 04   Micky Steinberg                Unopposed
--   County Commission District 06   Natalie Milian Orbis           Unopposed
--   County Commission District 08   Danielle Cohen Higgins         Elected
--                                   (beat John Edward DuBois and Martha "Vega"
--                                   Hero in the Aug 18 primary)
--   County Commission District 10   Anthony Rodriguez              Unopposed
--   County Commission District 12   Juan Carlos "JC" Bermudez      Unopposed
--   School Board District 04        Roberto J. Alonso              Unopposed
--   School Board District 06        Maria "Mari Tere" Rojas        Unopposed
-- Unopposed -> 'unopposed' (nobody filed against them; F.S. 101.151(7) keeps
-- the contest off the ballot) and Elected -> 'elected_in_primary' (won in
-- August), the two D-B states 0032 defines and never merges. Every other
-- county commission, school board, mayor and clerk office on all four
-- counties' lists that night is already in the database, with the same
-- candidates; the write-up has the full comparison.
--
-- ROOT CAUSE. 0032 kept the rows VoterFocus prints as "(Active-Unopposed)"
-- and "(Active-Elected)". These eight print as "(Inactive - Unopposed)" and
-- "(Inactive - Elected)": the candidate has closed the campaign account,
-- which says nothing about the seat. Miami-Dade's three that 0032 did load
-- (Bastien, Bendross-Mindingall, Colucci) were still Active. Broward,
-- Hillsborough and Orange had no Inactive winner in a covered office, which
-- is why only Miami-Dade came up short. parseVoterFocus (R2's check) already
-- reads the last status span, so the same read cannot drop them again.
--
-- CORROBORATION. The School Board's member list
-- (https://www.dadeschools.net/SchoolBoard/members, read 2026-10-13) shows
-- Districts 2, 4, 6 and 8 with "Present Term: Nov. 2022 - Nov. 2026", which
-- is exactly the four regular seats on this year's list (District 1 is the
-- special election already in FL-DAD-SB1-general).
--
-- INCUMBENCY, read the way 0049 read it (D1, membership: serves today on the
-- body the race elects to), from the same two member lists 0049 used:
--   https://www.miamidade.gov/global/government/commission/home.page
--     lists Steinberg (4), Milian Orbis (6), Cohen Higgins (8), Rodriguez
--     (10) and Bermudez (12) as members, and Oliver G. Gilbert, III for
--     District 1, so Gallon is a CHECKED false and FL-DAD-CC1-general an open
--     seat.
--   https://www.dadeschools.net/SchoolBoard/members
--     lists Alonso (District 4) and Rojas (Chair, District 6).
-- race.incumbent_id and is_open_seat follow 0049's rule: the one ballot
-- candidate with is_incumbent, NULL otherwise, and is_open_seat exactly
-- (incumbent_id IS NULL). Neither is shown to voters (D4).
-- No official_site: 0049 D11 writes sites from its re-check only.
--
-- PUBLICATION. Each race gets a 'draft' race_publication row, as 0033 seeded
-- for every general race, and nothing more: no migration lists or publishes
-- a race (scripts/verify-ballot-seeds.mjs and verify-migrations.mjs pin
-- that). Listing is a separate step through the door, so each flip writes
-- its admin_action row, exactly as scripts/list-ballot-2026.sql listed
-- 0032's seats. With the founder's yes, after this file:
--   SELECT set_race_publication(race_id, 'listed', 'founder',
--     'Listed tier: decided Miami-Dade county seat from the VoterFocus list '
--     || '(read 2026-10-13), missed by 0032; roster only, no brief (0057)')
--     FROM race_publication
--    WHERE status = 'draft'
--      AND race_id IN ('FL-DAD-CC1-general', 'FL-DAD-CC4-general',
--                      'FL-DAD-CC6-general', 'FL-DAD-CC8-general',
--                      'FL-DAD-CC10-general', 'FL-DAD-CC12-general',
--                      'FL-DAD-SB4-general', 'FL-DAD-SB6-general');
-- (Re-running scripts/list-ballot-2026.sql does the same: on 2026-10-13 no
-- other general race is at draft.) Listed is the roster-only tier: the race
-- and its one candidate, no brief. The races view shows them under "Already
-- decided" (CountyRaces.tsx).
--
-- TIMING. Apply this file before the content freeze opens (2026-10-18 04:00
-- UTC, 0050). Inside the window its INSERTs are refused, and it can only go
-- in as a correction:
--   SELECT set_config('kyv.freeze_correction', '<correction file>', true);
-- at the top, with a note in docs/general-election/corrections/. The listing
-- step passes inside the window too (0050 lets an UPDATE to 'listed' through).
--
-- Idempotent: every statement re-runs. A second run inserts nothing and
-- updates nothing (0049's guard lets an unchanged value through), and it
-- never moves a publication row that is already past draft.
--
-- TO REVERSE: if listed, back to draft through the door
--   (set_race_publication(race_id, 'draft', '<actor>', '<why>')), then DELETE
--   the eight race_publication, race and candidate rows, in that order.
--   Before those DELETEs, remove or re-point every row that references one
--   of the eight candidates or races (news_item, candidate_contact, claim,
--   position, profile, issue), or the foreign keys refuse them. Between
--   2026-10-18 04:00 UTC and 2026-11-04 05:00 UTC (0050's window) the whole
--   reversal is a freeze correction: one transaction that starts with
--   SET LOCAL kyv.freeze_correction = '<correction file>', with the note in
--   docs/general-election/corrections/.

INSERT INTO candidate
  (candidate_id, legal_name, party, office_sought, is_incumbent,
   qualifying_status, ballot_status, incumbency_source, incumbency_verified_at)
VALUES
  ('FL-VF-DAD-2981', 'Steve Gallon III', 'NOP', 'Miami-Dade County Commission, District 1', false, 'unopposed', 'ballot',
   'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-13T00:00:00+00:00'),
  ('FL-VF-DAD-2954', 'Micky Steinberg', 'NOP', 'Miami-Dade County Commission, District 4', true, 'unopposed', 'ballot',
   'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-13T00:00:00+00:00'),
  ('FL-VF-DAD-2922', 'Natalie Milian Orbis', 'NOP', 'Miami-Dade County Commission, District 6', true, 'unopposed', 'ballot',
   'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-13T00:00:00+00:00'),
  ('FL-VF-DAD-2962', 'Danielle Cohen Higgins', 'NOP', 'Miami-Dade County Commission, District 8', true, 'elected_in_primary', 'ballot',
   'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-13T00:00:00+00:00'),
  ('FL-VF-DAD-2972', 'Anthony Rodriguez', 'NOP', 'Miami-Dade County Commission, District 10', true, 'unopposed', 'ballot',
   'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-13T00:00:00+00:00'),
  ('FL-VF-DAD-2955', 'Juan Carlos "JC" Bermudez', 'NOP', 'Miami-Dade County Commission, District 12', true, 'unopposed', 'ballot',
   'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-13T00:00:00+00:00'),
  ('FL-VF-DAD-2956', 'Roberto J. Alonso', 'NOP', 'Miami-Dade County School Board, District 4', true, 'unopposed', 'ballot',
   'https://www.dadeschools.net/SchoolBoard/members', '2026-10-13T00:00:00+00:00'),
  ('FL-VF-DAD-2914', 'Maria "Mari Tere" Rojas', 'NOP', 'Miami-Dade County School Board, District 6', true, 'unopposed', 'ballot',
   'https://www.dadeschools.net/SchoolBoard/members', '2026-10-13T00:00:00+00:00')
ON CONFLICT (candidate_id) DO UPDATE SET
  legal_name             = EXCLUDED.legal_name,
  party                  = EXCLUDED.party,
  office_sought          = EXCLUDED.office_sought,
  is_incumbent           = EXCLUDED.is_incumbent,
  qualifying_status      = EXCLUDED.qualifying_status,
  ballot_status          = EXCLUDED.ballot_status,
  incumbency_source      = EXCLUDED.incumbency_source,
  incumbency_verified_at = EXCLUDED.incumbency_verified_at;

INSERT INTO race
  (race_id, office, level, district, election, candidate_ids, incumbent_id, is_open_seat)
VALUES
  ('FL-DAD-CC1-general', 'Miami-Dade County Commission, District 1', 'county', 'DAD-CC-1', 'general', ARRAY['FL-VF-DAD-2981'], NULL, true),
  ('FL-DAD-CC4-general', 'Miami-Dade County Commission, District 4', 'county', 'DAD-CC-4', 'general', ARRAY['FL-VF-DAD-2954'], 'FL-VF-DAD-2954', false),
  ('FL-DAD-CC6-general', 'Miami-Dade County Commission, District 6', 'county', 'DAD-CC-6', 'general', ARRAY['FL-VF-DAD-2922'], 'FL-VF-DAD-2922', false),
  ('FL-DAD-CC8-general', 'Miami-Dade County Commission, District 8', 'county', 'DAD-CC-8', 'general', ARRAY['FL-VF-DAD-2962'], 'FL-VF-DAD-2962', false),
  ('FL-DAD-CC10-general', 'Miami-Dade County Commission, District 10', 'county', 'DAD-CC-10', 'general', ARRAY['FL-VF-DAD-2972'], 'FL-VF-DAD-2972', false),
  ('FL-DAD-CC12-general', 'Miami-Dade County Commission, District 12', 'county', 'DAD-CC-12', 'general', ARRAY['FL-VF-DAD-2955'], 'FL-VF-DAD-2955', false),
  ('FL-DAD-SB4-general', 'Miami-Dade County School Board, District 4', 'county', 'DAD-SB-4', 'general', ARRAY['FL-VF-DAD-2956'], 'FL-VF-DAD-2956', false),
  ('FL-DAD-SB6-general', 'Miami-Dade County School Board, District 6', 'county', 'DAD-SB-6', 'general', ARRAY['FL-VF-DAD-2914'], 'FL-VF-DAD-2914', false)
ON CONFLICT (race_id) DO UPDATE SET
  office        = EXCLUDED.office,
  level         = EXCLUDED.level,
  district      = EXCLUDED.district,
  candidate_ids = EXCLUDED.candidate_ids,
  incumbent_id  = EXCLUDED.incumbent_id,
  is_open_seat  = EXCLUDED.is_open_seat;

INSERT INTO race_publication (race_id, status)
SELECT r.race_id, 'draft'
  FROM race r
 WHERE r.race_id IN ('FL-DAD-CC1-general', 'FL-DAD-CC4-general',
                     'FL-DAD-CC6-general', 'FL-DAD-CC8-general',
                     'FL-DAD-CC10-general', 'FL-DAD-CC12-general',
                     'FL-DAD-SB4-general', 'FL-DAD-SB6-general')
   AND NOT EXISTS (
     SELECT 1 FROM race_publication rp WHERE rp.race_id = r.race_id
   );

DO $$
DECLARE
  n INT;
BEGIN
  -- The eight exist, each with its one decided ballot candidate and a
  -- publication row the door can flip.
  SELECT count(*) INTO n
    FROM race r
    JOIN race_publication rp ON rp.race_id = r.race_id
    JOIN candidate c ON c.candidate_id = r.candidate_ids[1]
   WHERE r.race_id IN ('FL-DAD-CC1-general', 'FL-DAD-CC4-general',
                       'FL-DAD-CC6-general', 'FL-DAD-CC8-general',
                       'FL-DAD-CC10-general', 'FL-DAD-CC12-general',
                       'FL-DAD-SB4-general', 'FL-DAD-SB6-general')
     AND r.election = 'general'
     AND cardinality(r.candidate_ids) = 1
     AND c.ballot_status = 'ballot'
     AND c.qualifying_status IN ('unopposed', 'elected_in_primary');
  IF n <> 8 THEN
    RAISE EXCEPTION '0057: % of the 8 Miami-Dade seats have a publication row and one decided ballot candidate', n;
  END IF;

  -- 0049's race rules hold for every Miami-Dade race, old and new.
  SELECT count(*) INTO n
    FROM race r
   WHERE r.race_id LIKE 'FL-DAD-%-general'
     AND (r.is_open_seat <> (r.incumbent_id IS NULL)
          OR (r.incumbent_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM candidate c
                 WHERE c.candidate_id = r.incumbent_id
                   AND c.is_incumbent
                   AND c.candidate_id = ANY (r.candidate_ids))));
  IF n <> 0 THEN
    RAISE EXCEPTION '0057: % Miami-Dade race(s) break 0049''s incumbent_id / is_open_seat rule', n;
  END IF;
END;
$$;
