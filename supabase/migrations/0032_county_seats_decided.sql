-- County offices already settled: 15 seats that will NOT appear on the
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
--   unopposed (5)           nobody filed. F.S. 101.151(7) keeps the contest
--                           off the ballot entirely. Mark D. Bogen, Broward
--                           County Commission District 2, drew no opponent.
--
--   elected_in_primary (10) they BEAT someone. Florida's nonpartisan county
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
-- COUNTY JUDGES ARE DELIBERATELY EXCLUDED. Ten Orange County Judge groups
-- (8 unopposed, 2 elected in the primary) were in an earlier draft and were
-- removed on the founder's call 2026-09-21: this surface is county commission
-- and school board. A county judge is a state trial judge elected countywide
-- -- a county BALLOT office, not a county GOVERNMENT office -- so it does not
-- belong to the local-government gap this file exists to fill. If they are
-- ever wanted they come from the same VoterFocus read; nothing depends on
-- their absence.
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
