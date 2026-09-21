-- County offices already settled: 25 seats that will NOT appear on the
-- November ballot, and the officials who hold them.
--
-- WHY: a Broward voter in County Commission District 2 has a commissioner
-- taking office, and until now the site could only answer "no race here".
-- Broward has ONE printed county contest against Orange's 12 and
-- Hillsborough's 29 -- so a Broward voter checking their local ballot saw
-- almost nothing, and the reason (your races were already decided) is exactly
-- what this product exists to say. 0023's comment already settled the
-- principle: "an unopposed candidate is still a ballot-tier filing -- briefed,
-- audited, shown", and "an unopposed candidate is the one who will hold the
-- office". Founder call 2026-09-21 extends that to county seats.
--
-- TWO STATES, AND CONFLATING THEM WOULD PUBLISH A FALSEHOOD:
--
--   unopposed (13)          nobody filed. F.S. 101.151(7) keeps the contest
--                           off the ballot entirely. Mark D. Bogen, Broward
--                           County Commission District 2, drew no opponent.
--
--   elected_in_primary (12) they BEAT someone. Florida's nonpartisan county
--                           races -- school board everywhere, county offices
--                           in charter counties -- end in August when a
--                           candidate clears 50%. Caryl Sandler Shuham won
--                           Broward Commission District 6 against three
--                           opponents.
--
-- Both are absent from November, for opposite reasons. Telling the second
-- voter "no one filed against this candidate" would be a plain untruth about
-- an election that happened, which is why `elected_in_primary` is a new
-- qualifying_status rather than a reuse of `unopposed`, and why
-- isDecidedInPrimary is a separate predicate from isUnopposedContest.
--
-- This is the same reasoning D-B (founder 2026-09-07) applied when it refused
-- to DERIVE `unopposed` from candidate count: these three states are
-- indistinguishable once you only count rows.
--
-- SOURCE: each county's VoterFocus candidate list, read 2026-09-21, the same
-- source as 0031. Status Unopposed -> unopposed, Elected -> elected_in_primary.
-- Candidate ids reuse the VoterFocus `ca` key: FL-VF-<county>-<ca>.
--
-- ballot_status stays 'ballot': 0013 defines that as the briefed, audited,
-- shown tier, and 0023 is explicit that unopposed is a QUALIFYING status on a
-- different axis. These people hold the office; they are not excluded filings.
--
-- COUNTY JUDGES: 10 of the 25 are Orange County Judge groups. They are county
-- ballot offices and are included for completeness; if the founder wants the
-- county surface limited to commission and school board, drop the FL-ORA-CJ*
-- rows -- nothing else depends on them.
--
-- NOT PUBLISHED: no race_publication rows, so RLS hides all of it, exactly as
-- for 0031's 17 contested races.
--
-- Idempotent: safe to re-run.

-- 0023 raises if a stale CHECK survives, so drop by name and re-add.
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_qualifying_status_check;
ALTER TABLE candidate ADD CONSTRAINT candidate_qualifying_status_check
  CHECK (qualifying_status IN
    ('qualified','unopposed','elected_in_primary','withdrawn','other'));

COMMENT ON COLUMN candidate.qualifying_status IS
  'qualified = QUA, made the ballot against opposition; unopposed = UNO, '
  'nobody filed, so the contest is not printed at all (F.S. 101.151(7)); '
  'elected_in_primary = won outright in August, so the seat never reaches the '
  'November ballot -- NOT a synonym for unopposed, this candidate beat someone '
  '(0032); withdrawn = WIT/DEF/DNQ/REM; other = XTL/DEC.';

INSERT INTO candidate
  (candidate_id, legal_name, party, office_sought, is_incumbent,
   qualifying_status, ballot_status)
VALUES
  ('FL-VF-ORA-1245', 'Angie Gallo', '', 'Orange County School Board Chair', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-ORA-1270', 'Melissa Lopez Marantes', '', 'Orange County School Board, District 1', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-ORA-1318', 'Gloria Reina O''Neal', '', 'Orange County School Board, District 2', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-ORA-1248', 'Jeramy Beasley', '', 'Orange County Judge, Group 2', false, 'unopposed', 'ballot'),
  ('FL-VF-ORA-1243', 'Ayana Barrow', '', 'Orange County Judge, Group 3', false, 'unopposed', 'ballot'),
  ('FL-VF-ORA-1259', 'Asima Azam', '', 'Orange County Judge, Group 5', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-ORA-1313', 'Jeanette D. Bigney', '', 'Orange County Judge, Group 7', false, 'unopposed', 'ballot'),
  ('FL-VF-ORA-1282', 'Tina Caraballo', '', 'Orange County Judge, Group 10', false, 'unopposed', 'ballot'),
  ('FL-VF-ORA-1312', 'Brian F. Duckworth', '', 'Orange County Judge, Group 15', false, 'unopposed', 'ballot'),
  ('FL-VF-ORA-1307', 'Carly Wish', '', 'Orange County Judge, Group 16', false, 'unopposed', 'ballot'),
  ('FL-VF-ORA-1238', 'Cherish Adams', '', 'Orange County Judge, Group 17', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-ORA-1237', 'Heather Guarch', '', 'Orange County Judge, Group 20', false, 'unopposed', 'ballot'),
  ('FL-VF-ORA-1258', 'Judi Garabo Hayes', '', 'Orange County Judge, Group 21', false, 'unopposed', 'ballot'),
  ('FL-VF-DAD-2926', 'Dorothy Bendross-Mindingall', 'NOP', 'Miami-Dade County School Board, District 2', false, 'unopposed', 'ballot'),
  ('FL-VF-DAD-2953', 'Monica Colucci', 'NOP', 'Miami-Dade County School Board, District 8', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-DAD-2964', 'Marleine Bastien', 'NOP', 'Miami-Dade County Commission, District 2', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-BRO-1179', 'Mark D. Bogen', 'DEM', 'Broward County Commission, District 2', false, 'unopposed', 'ballot'),
  ('FL-VF-BRO-1178', 'Lamar Fisher', 'DEM', 'Broward County Commission, District 4', false, 'unopposed', 'ballot'),
  ('FL-VF-BRO-1041', 'Caryl Sandler Shuham', 'DEM', 'Broward County Commission, District 6', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-BRO-1182', 'Robert McKinzie', 'DEM', 'Broward County Commission, District 8', false, 'unopposed', 'ballot'),
  ('FL-VF-BRO-1194', 'Maura McCarthy Bulman', '', 'Broward County School Board, District 1', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-BRO-1191', 'Nicole Morst', '', 'Broward County School Board, District 4', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-BRO-1254', 'Cynthia Alceus Dominique', '', 'Broward County School Board, District 7', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-BRO-1195', 'Allen Zeman', '', 'Broward County School Board, At Large 8', false, 'elected_in_primary', 'ballot'),
  ('FL-VF-HIL-2691', 'Ashley Meeder', '', 'Hillsborough County School Board, District 4', false, 'unopposed', 'ballot')
ON CONFLICT (candidate_id) DO UPDATE SET
  legal_name        = EXCLUDED.legal_name,
  party             = EXCLUDED.party,
  office_sought     = EXCLUDED.office_sought,
  qualifying_status = EXCLUDED.qualifying_status,
  ballot_status     = EXCLUDED.ballot_status;

INSERT INTO race (race_id, office, level, district, election, candidate_ids)
VALUES
  ('FL-ORA-SBCHAIR-general', 'Orange County School Board Chair', 'county', 'ORA-SBCHAIR', 'general', ARRAY['FL-VF-ORA-1245']),
  ('FL-ORA-SB1-general', 'Orange County School Board, District 1', 'county', 'ORA-SB-1', 'general', ARRAY['FL-VF-ORA-1270']),
  ('FL-ORA-SB2-general', 'Orange County School Board, District 2', 'county', 'ORA-SB-2', 'general', ARRAY['FL-VF-ORA-1318']),
  ('FL-ORA-CJ2-general', 'Orange County Judge, Group 2', 'county', 'ORA-CJ-2', 'general', ARRAY['FL-VF-ORA-1248']),
  ('FL-ORA-CJ3-general', 'Orange County Judge, Group 3', 'county', 'ORA-CJ-3', 'general', ARRAY['FL-VF-ORA-1243']),
  ('FL-ORA-CJ5-general', 'Orange County Judge, Group 5', 'county', 'ORA-CJ-5', 'general', ARRAY['FL-VF-ORA-1259']),
  ('FL-ORA-CJ7-general', 'Orange County Judge, Group 7', 'county', 'ORA-CJ-7', 'general', ARRAY['FL-VF-ORA-1313']),
  ('FL-ORA-CJ10-general', 'Orange County Judge, Group 10', 'county', 'ORA-CJ-10', 'general', ARRAY['FL-VF-ORA-1282']),
  ('FL-ORA-CJ15-general', 'Orange County Judge, Group 15', 'county', 'ORA-CJ-15', 'general', ARRAY['FL-VF-ORA-1312']),
  ('FL-ORA-CJ16-general', 'Orange County Judge, Group 16', 'county', 'ORA-CJ-16', 'general', ARRAY['FL-VF-ORA-1307']),
  ('FL-ORA-CJ17-general', 'Orange County Judge, Group 17', 'county', 'ORA-CJ-17', 'general', ARRAY['FL-VF-ORA-1238']),
  ('FL-ORA-CJ20-general', 'Orange County Judge, Group 20', 'county', 'ORA-CJ-20', 'general', ARRAY['FL-VF-ORA-1237']),
  ('FL-ORA-CJ21-general', 'Orange County Judge, Group 21', 'county', 'ORA-CJ-21', 'general', ARRAY['FL-VF-ORA-1258']),
  ('FL-DAD-SB2-general', 'Miami-Dade County School Board, District 2', 'county', 'DAD-SB-2', 'general', ARRAY['FL-VF-DAD-2926']),
  ('FL-DAD-SB8-general', 'Miami-Dade County School Board, District 8', 'county', 'DAD-SB-8', 'general', ARRAY['FL-VF-DAD-2953']),
  ('FL-DAD-CC2-general', 'Miami-Dade County Commission, District 2', 'county', 'DAD-CC-2', 'general', ARRAY['FL-VF-DAD-2964']),
  ('FL-BRO-CC2-general', 'Broward County Commission, District 2', 'county', 'BRO-CC-2', 'general', ARRAY['FL-VF-BRO-1179']),
  ('FL-BRO-CC4-general', 'Broward County Commission, District 4', 'county', 'BRO-CC-4', 'general', ARRAY['FL-VF-BRO-1178']),
  ('FL-BRO-CC6-general', 'Broward County Commission, District 6', 'county', 'BRO-CC-6', 'general', ARRAY['FL-VF-BRO-1041']),
  ('FL-BRO-CC8-general', 'Broward County Commission, District 8', 'county', 'BRO-CC-8', 'general', ARRAY['FL-VF-BRO-1182']),
  ('FL-BRO-SB1-general', 'Broward County School Board, District 1', 'county', 'BRO-SB-1', 'general', ARRAY['FL-VF-BRO-1194']),
  ('FL-BRO-SB4-general', 'Broward County School Board, District 4', 'county', 'BRO-SB-4', 'general', ARRAY['FL-VF-BRO-1191']),
  ('FL-BRO-SB7-general', 'Broward County School Board, District 7', 'county', 'BRO-SB-7', 'general', ARRAY['FL-VF-BRO-1254']),
  ('FL-BRO-SBAL8-general', 'Broward County School Board, At Large 8', 'county', 'BRO-SBAL-8', 'general', ARRAY['FL-VF-BRO-1195']),
  ('FL-HIL-SB4-general', 'Hillsborough County School Board, District 4', 'county', 'HIL-SB-4', 'general', ARRAY['FL-VF-HIL-2691'])
ON CONFLICT (race_id) DO UPDATE SET
  office        = EXCLUDED.office,
  level         = EXCLUDED.level,
  district      = EXCLUDED.district,
  candidate_ids = EXCLUDED.candidate_ids;
