-- Tier A local contests for the 2026 general ballot: county commission,
-- school board, county mayor and clerk of the courts across the four covered
-- counties. 17 races, 34 candidates.
--
-- SOURCE: each county's own candidate list, published through VoterFocus
-- (VR Systems), their elections vendor, read 2026-09-21:
--   https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=<county>
-- A row is on the November ballot when its status is Runoff (advanced from the
-- primary) or Qualified. Unopposed and Elected are decided and not printed --
-- the same rule F.S. 101.151(7) applies to FL-10 -- and Withdrawn, Defeated,
-- Did-not-qualify and Qualified-Write-In are excluded. Derived list:
-- docs/general-election/ballots/local-ballot-2026-09-21.json
--
-- WHY A MIGRATION: the state-level roster arrived through the intake pipeline,
-- which reads the DoE export. The DoE publishes no county contests at all --
-- county commission, school board and municipal offices are filed with and
-- published by county Supervisors of Elections -- so the pipeline has no path
-- to this data. Seeding it here follows 0003/0008/0026.
--
-- LEVEL: race.level admitted only 'federal' and 'state'. County contests are
-- neither, so the CHECK is widened rather than mislabelling them. RaceLevel in
-- src/types/schema.ts widens to match.
--
-- DISTRICT, and the limit this leaves: district carries a county-scoped value
-- ('ORA-CC-2'), NOT a bare number. A ZIP resolves to congressional, state
-- house and state senate districts; nothing resolves a voter to a county
-- commission or school board district, because we hold no boundary file for
-- either. coverage.ts matches `district IS NULL OR district = X`, so these
-- rows deliberately match nothing: a county-scoped value shows to no one,
-- whereas NULL would mean statewide and show an Orange County race to a
-- Broward voter. These are loaded and inert until that geography exists.
--
-- NOT PUBLISHED: no race_publication rows, so RLS hides every row here. That
-- is the same posture as all 21 state-level races.
--
-- PARTY: stored exactly as the county published it. Blank where the county
-- printed none and 'NOP' where Miami-Dade printed that -- both are the same
-- fact (school board is nonpartisan by constitution, several county offices by
-- charter), and party-label.ts renders both as no chip at all.
--
-- INCUMBENCY: is_incumbent is left false everywhere because these lists do not
-- state it. False here means UNKNOWN, not "challenger" -- do not read it as a
-- claim, and fill it from a source that actually says so.
--
-- Idempotent: safe to re-run.

ALTER TABLE race DROP CONSTRAINT IF EXISTS race_level_check;
ALTER TABLE race ADD CONSTRAINT race_level_check
  CHECK (level IN ('federal','state','county'));

INSERT INTO candidate
  (candidate_id, legal_name, party, office_sought, is_incumbent,
   qualifying_status, ballot_status)
VALUES
  ('FL-VF-ORA-1364', 'Terrell Thomas', 'NPA', 'Orange County Clerk of the Courts', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1401', 'Roberta Walton Johnson', 'DEM', 'Orange County Clerk of the Courts', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1239', 'Chris Messina', '', 'Orange County Mayor', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1236', 'Tiffany Moore Russell', '', 'Orange County Mayor', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1290', 'Kamia Brown', '', 'Orange County Commission, District 2', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1384', 'Mike Crabb', '', 'Orange County Commission, District 2', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1260', 'Brian Jones', '', 'Orange County Commission, District 4', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1279', 'Johanna Lopez', '', 'Orange County Commission, District 4', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1295', 'Lawanna Gelzer', '', 'Orange County Commission, District 6', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1265', 'Michael "Mike" Scott', '', 'Orange County Commission, District 6', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1283', 'Patricia Rumph', '', 'Orange County Commission, District 7', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1271', 'Vicki Vargo', '', 'Orange County Commission, District 7', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1275', 'Jeannette Quinones Hernandez', '', 'Orange County Commission, District 8', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1272', 'Victor M. Torres Jr.', '', 'Orange County Commission, District 8', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1314', 'Diana Moore', '', 'Orange County School Board, District 3', false, 'qualified', 'ballot'),
  ('FL-VF-ORA-1242', 'Susanne Peña', '', 'Orange County School Board, District 3', false, 'qualified', 'ballot'),
  ('FL-VF-DAD-3076', 'Linda Cothiere', 'NOP', 'Miami-Dade County School Board, District 1', false, 'qualified', 'ballot'),
  ('FL-VF-DAD-3080', 'Thera Johnson', 'NOP', 'Miami-Dade County School Board, District 1', false, 'qualified', 'ballot'),
  ('FL-VF-DAD-2949', 'Vicki L. Lopez', 'NOP', 'Miami-Dade County Commission, District 5', false, 'qualified', 'ballot'),
  ('FL-VF-DAD-2998', 'Rob Piper', 'NOP', 'Miami-Dade County Commission, District 5', false, 'qualified', 'ballot'),
  ('FL-VF-BRO-1184', 'Adam Cervera', '', 'Broward County School Board, District 6', false, 'qualified', 'ballot'),
  ('FL-VF-BRO-1172', 'Roberto Fernandez III', '', 'Broward County School Board, District 6', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2640', 'Harry Cohen', 'DEM', 'Hillsborough County Commission, District 1', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2880', 'Jackie Toledo', 'REP', 'Hillsborough County Commission, District 1', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2646', 'Luiz F. F. Garcia', 'REP', 'Hillsborough County Commission, District 3', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2621', 'Gwen Myers', 'DEM', 'Hillsborough County Commission, District 3', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2661', 'Stacy Hahn', 'REP', 'Hillsborough County Commission, District 5', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2636', 'Neil Manimala', 'DEM', 'Hillsborough County Commission, District 5', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2639', 'Adam Hattersley', 'DEM', 'Hillsborough County Commission, District 7', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2620', 'Joshua Wostal', 'REP', 'Hillsborough County Commission, District 7', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2677', 'Brittany Lyssy', '', 'Hillsborough County School Board, District 2', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2675', 'Daniela Simic', '', 'Hillsborough County School Board, District 2', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2610', 'Kenneth "Ken" Gay', '', 'Hillsborough County School Board, District 6', false, 'qualified', 'ballot'),
  ('FL-VF-HIL-2645', 'Karen Perez', '', 'Hillsborough County School Board, District 6', false, 'qualified', 'ballot')
ON CONFLICT (candidate_id) DO UPDATE SET
  legal_name    = EXCLUDED.legal_name,
  party         = EXCLUDED.party,
  office_sought = EXCLUDED.office_sought,
  ballot_status = EXCLUDED.ballot_status;

INSERT INTO race (race_id, office, level, district, election, candidate_ids)
VALUES
  ('FL-ORA-CLERK-general', 'Orange County Clerk of the Courts', 'county', 'ORA-CLERK', 'general', ARRAY['FL-VF-ORA-1364','FL-VF-ORA-1401']),
  ('FL-ORA-MAYOR-general', 'Orange County Mayor', 'county', 'ORA-MAYOR', 'general', ARRAY['FL-VF-ORA-1239','FL-VF-ORA-1236']),
  ('FL-ORA-CC2-general', 'Orange County Commission, District 2', 'county', 'ORA-CC-2', 'general', ARRAY['FL-VF-ORA-1290','FL-VF-ORA-1384']),
  ('FL-ORA-CC4-general', 'Orange County Commission, District 4', 'county', 'ORA-CC-4', 'general', ARRAY['FL-VF-ORA-1260','FL-VF-ORA-1279']),
  ('FL-ORA-CC6-general', 'Orange County Commission, District 6', 'county', 'ORA-CC-6', 'general', ARRAY['FL-VF-ORA-1295','FL-VF-ORA-1265']),
  ('FL-ORA-CC7-general', 'Orange County Commission, District 7', 'county', 'ORA-CC-7', 'general', ARRAY['FL-VF-ORA-1283','FL-VF-ORA-1271']),
  ('FL-ORA-CC8-general', 'Orange County Commission, District 8', 'county', 'ORA-CC-8', 'general', ARRAY['FL-VF-ORA-1275','FL-VF-ORA-1272']),
  ('FL-ORA-SB3-general', 'Orange County School Board, District 3', 'county', 'ORA-SB-3', 'general', ARRAY['FL-VF-ORA-1314','FL-VF-ORA-1242']),
  ('FL-DAD-SB1-general', 'Miami-Dade County School Board, District 1', 'county', 'DAD-SB-1', 'general', ARRAY['FL-VF-DAD-3076','FL-VF-DAD-3080']),
  ('FL-DAD-CC5-general', 'Miami-Dade County Commission, District 5', 'county', 'DAD-CC-5', 'general', ARRAY['FL-VF-DAD-2949','FL-VF-DAD-2998']),
  ('FL-BRO-SB6-general', 'Broward County School Board, District 6', 'county', 'BRO-SB-6', 'general', ARRAY['FL-VF-BRO-1184','FL-VF-BRO-1172']),
  ('FL-HIL-CC1-general', 'Hillsborough County Commission, District 1', 'county', 'HIL-CC-1', 'general', ARRAY['FL-VF-HIL-2640','FL-VF-HIL-2880']),
  ('FL-HIL-CC3-general', 'Hillsborough County Commission, District 3', 'county', 'HIL-CC-3', 'general', ARRAY['FL-VF-HIL-2646','FL-VF-HIL-2621']),
  ('FL-HIL-CC5-general', 'Hillsborough County Commission, District 5', 'county', 'HIL-CC-5', 'general', ARRAY['FL-VF-HIL-2661','FL-VF-HIL-2636']),
  ('FL-HIL-CC7-general', 'Hillsborough County Commission, District 7', 'county', 'HIL-CC-7', 'general', ARRAY['FL-VF-HIL-2639','FL-VF-HIL-2620']),
  ('FL-HIL-SB2-general', 'Hillsborough County School Board, District 2', 'county', 'HIL-SB-2', 'general', ARRAY['FL-VF-HIL-2677','FL-VF-HIL-2675']),
  ('FL-HIL-SB6-general', 'Hillsborough County School Board, District 6', 'county', 'HIL-SB-6', 'general', ARRAY['FL-VF-HIL-2610','FL-VF-HIL-2645'])
ON CONFLICT (race_id) DO UPDATE SET
  office        = EXCLUDED.office,
  level         = EXCLUDED.level,
  district      = EXCLUDED.district,
  candidate_ids = EXCLUDED.candidate_ids;
