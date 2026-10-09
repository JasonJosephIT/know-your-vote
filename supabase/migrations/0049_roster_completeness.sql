-- 0049_roster_completeness.sql
-- Verified incumbency for every ballot candidate and race, running mates for
-- the eight Governor tickets, and the listed-race sites a re-check found.
-- Spec: docs/superpowers/specs/2026-10-08-roster-completeness-design.md
-- (§3.1 what the words mean, §3.2 schema, §3.3-3.4 the reads and the data).
--
-- THE DATA IS GENERATED. Every value between a "BEGIN generated" and an
-- "END generated" line is written by `node scripts/roster-worksheet.ts
-- --write-migration` from docs/general-election/roster-completeness-2026-10.md,
-- where each row carries its source URL, both read times and the page's own
-- words. scripts/verify-roster-worksheet.ts fails if the two ever differ. Edit
-- the worksheet, never these lines.
--
-- WHAT "INCUMBENT" MEANS HERE (D1, Recommended pending founder confirmation):
-- the candidate serves today in the office, or on the body, the race elects
-- to. For the U.S. House, the Senate, a county commission or a school board
-- that is membership, whatever seat they hold: Wasserman Schultz (holds
-- District 25, runs in FL-20) and Moskowitz (holds 23, runs in FL-25) are
-- members of the House. A false here is a CHECKED false: the source lists the
-- body's current members, or names the office's holder, without them. Until
-- this file, false only meant "unknown" (0031, 0038, src/lib/incumbency.ts).
-- The worksheet also records the narrower fact (holds this race's own seat);
-- D1's TO FLIP is `--write-migration --d1 seat`, no new read.
--
-- race.incumbent_id is derived here from the candidate rows: the one ballot
-- candidate with is_incumbent, NULL when none; a race with two or more gets
-- the seat holder named in the worksheet, or NULL. is_open_seat is exactly
-- (incumbent_id IS NULL). Neither is shown to voters (D4).
--
-- RUNNING MATES (D5, D6): the Division of Elections' canDetail page for each
-- ticket, the "Running Mate" field with entities decoded and whitespace
-- collapsed (normalizeDoeText), nothing else changed.
--
-- SITES (D11): only a re-check find in a LISTED race is written; a find in a
-- published race waits in the worksheet until after Nov 3, because its brief
-- was built without it. The UPDATE below refuses a published-race row anyway.
--
-- GUARDS, added after the data so every existing row satisfies them:
--   * CHECKs: a source always has its date; a true is_incumbent needs a
--     source; the three running-mate columns are set together, only on a
--     Governor row, and never carry doubled or edge whitespace.
--   * candidate_sourced_fact_guard: on a row that already has a source, a
--     changed is_incumbent or running_mate must arrive with a new source or
--     date in the same statement. B4's write (toollayer store.py:245-247)
--     names neither, so it fails on any value it would change. A tripwire,
--     not a lock: the control is still that no agent writes these columns
--     (D10). EXECUTE on the function is revoked by name (the lesson of 0020);
--     Postgres checks EXECUTE on a trigger function when the trigger is
--     created, not when it fires, so the trigger fires for every writer.
--
-- ORDER: this file must sort before 0050_content_freeze.sql (ledger,
-- supabase/migrations/README.md): a replay inside the freeze window applies
-- the guard after these UPDATEs, not before them.
--
-- Nothing here is voter-facing on apply: SHOW_INCUMBENT_CHIP stays false and
-- no page reads running_mate until the display PR (claude/roster-display).
-- New columns reach the anon roster through the existing row policy (0033).
--
-- Idempotent: every statement re-runs. A re-run with the same values passes
-- the trigger, because no value changes.

-- (1) Columns.
ALTER TABLE candidate
  ADD COLUMN IF NOT EXISTS incumbency_source        text,
  ADD COLUMN IF NOT EXISTS incumbency_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS running_mate             text,
  ADD COLUMN IF NOT EXISTS running_mate_source      text,
  ADD COLUMN IF NOT EXISTS running_mate_verified_at timestamptz;

-- (2) Incumbency for all 106 ballot candidates, joined on id AND legal name so
-- a wrong id updates nothing and the count assertion below fails. fec_id only
-- where the FEC cross-check matched a federal row by hand; COALESCE keeps
-- NULL otherwise.
UPDATE candidate c
   SET is_incumbent           = v.is_incumbent,
       incumbency_source      = v.source,
       incumbency_verified_at = v.verified_at::timestamptz,
       fec_id                 = COALESCE(v.fec_id, c.fec_id)
  FROM (VALUES
    -- BEGIN generated: candidates
    ('FL-DOE-90560', 'Wilton Simpson', true, 'https://www.fdacs.gov/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-92013', 'Joey Mendoza Atkins', false, 'https://www.fdacs.gov/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89041', 'James Uthmeier', true, 'https://www.myfloridalegal.com/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89231', 'Jose Javier Rodriguez', false, 'https://www.myfloridalegal.com/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89394', 'Blaise Ingoglia', true, 'https://www.myfloridacfo.com/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-91310', 'Annette Taddeo', false, 'https://www.myfloridacfo.com/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89042', 'Byron Donalds', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89243', 'David Jolly', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-84076', 'Scott Eckhard Jewett', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-90630', 'Charles Burkett', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89571', 'Frank J. Russo', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-88529', 'Moliere "Moe" Dimanche', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-90433', 'Dean Ocean Abrams', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89630', 'Jeffrey Peter "Dr. Jeff" Datto', false, 'https://www.flgov.com/eog/', '2026-10-08T00:00:00Z', NULL),
    ('FL-DOE-89909', 'Maxwell Alejandro Frost', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H2FL10259'),
    ('FL-DOE-91717', 'Joe Strada', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL11332'),
    ('FL-DOE-91715', 'James Pericola', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL11357'),
    ('FL-DOE-88517', 'Ralph Groves', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H4FL11089'),
    ('FL-DOE-88868', 'Gus Michael Bilirakis', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL09070'),
    ('FL-DOE-89453', 'Kimberly Overman', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL15200'),
    ('FL-DOE-89778', 'Branden Scrivener', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL12231'),
    ('FL-DOE-91313', 'Mike Beltran', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL14237'),
    ('FL-DOE-88870', 'Kathy Castor', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL11126'),
    ('FL-DOE-92395', 'Brian Lambert', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL14245'),
    ('FL-DOE-89121', 'Laurel Lee', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H2FL15241'),
    ('FL-DOE-89116', 'Robert People', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL15168'),
    ('FL-DOE-90251', 'Sydney Gruters', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL16141'),
    ('FL-DOE-90779', 'Kelly Kirschner', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL16158'),
    ('FL-DOE-89623', 'Mark Davis', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL06365'),
    ('FL-DOE-91278', 'Brent Andersen', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL20143'),
    ('FL-DOE-91577', 'Debbie Wasserman Schultz', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H4FL20023'),
    ('FL-DOE-90814', 'Kedner Maxime', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL20119'),
    ('FL-DOE-92109', 'Casey Askar', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL22248'),
    ('FL-DOE-89301', 'Pia Dandiya', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL21059'),
    ('FL-DOE-90703', 'Te Mayonna Brown', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL14203'),
    ('FL-DOE-91544', 'Oliver G. Gilbert III', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL24095'),
    ('FL-DOE-89801', 'Scott Singer', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL23188'),
    ('FL-DOE-88911', 'Jared Moskowitz', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H2FL22171'),
    ('FL-DOE-92357', 'Peter Jassenoff', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL25068'),
    ('FL-DOE-90330', 'Mario Diaz-Balart', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H2FL25018'),
    ('FL-DOE-89980', 'Nicole Locklin', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL26058'),
    ('FL-DOE-92137', 'Deborah Ann Meidinger Hosey', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL26074'),
    ('FL-DOE-90721', 'Maria Elvira Salazar', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H8FL27185'),
    ('FL-DOE-89933', 'Eliott Rodriguez', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL27098'),
    ('FL-DOE-91226', 'Carlos A. Gimenez', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H0FL26036'),
    ('FL-DOE-91699', 'Phil "Felipe" Ehr', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H4FL28042'),
    ('FL-DOE-90340', 'Eddy Rojas', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL28021'),
    ('FL-DOE-90696', 'Ryan Elijah', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL07231'),
    ('FL-DOE-90631', 'Bale Dalton', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL07215'),
    ('FL-DOE-92377', 'Christopher Dennison', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL07249'),
    ('FL-DOE-89522', 'Mike Haridopolos', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H4FL08168'),
    ('FL-DOE-90831', 'Jennifer Jenkins', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL06399'),
    ('FL-DOE-91337', 'Dan Green', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL09294'),
    ('FL-DOE-89339', 'Darren Soto', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-08T00:00:00Z', 'H6FL09179'),
    ('FL-DOE-89119', 'Ashley Moody', true, 'https://www.senate.gov/general/contact_information/senators_cfm.xml', '2026-10-08T00:00:00Z', 'S6FL00640'),
    ('FL-DOE-90009', 'Angie Nixon', false, 'https://www.senate.gov/general/contact_information/senators_cfm.xml', '2026-10-08T00:00:00Z', 'S6FL00830'),
    ('FL-DOE-89955', 'Neil J. Gillespie', false, 'https://www.senate.gov/general/contact_information/senators_cfm.xml', '2026-10-08T00:00:00Z', 'S6FL00863'),
    ('FL-VF-BRO-1179', 'Mark D. Bogen', true, 'https://www.broward.org/district2', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1178', 'Lamar Fisher', true, 'https://www.broward.org/district4', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1041', 'Caryl Sandler Shuham', false, 'https://www.broward.org/district6', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1182', 'Robert McKinzie', true, 'https://www.broward.org/district8', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1194', 'Maura McCarthy Bulman', true, 'https://www.browardschools.com/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1191', 'Nicole Morst', false, 'https://www.browardschools.com/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1184', 'Adam Cervera', true, 'https://www.browardschools.com/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1172', 'Roberto Fernandez III', false, 'https://www.browardschools.com/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1254', 'Cynthia Alceus Dominique', false, 'https://www.browardschools.com/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-BRO-1195', 'Allen Zeman', true, 'https://www.browardschools.com/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-DAD-2964', 'Marleine Bastien', true, 'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-DAD-2949', 'Vicki L. Lopez', true, 'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-DAD-2998', 'Rob Piper', false, 'https://www.miamidade.gov/global/government/commission/home.page', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-DAD-3076', 'Linda Cothiere', false, 'https://www.dadeschools.net/SchoolBoard/members', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-DAD-3070', 'Katrina Wilson', false, 'https://www.dadeschools.net/SchoolBoard/members', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-DAD-2926', 'Dorothy Bendross-Mindingall', true, 'https://www.dadeschools.net/SchoolBoard/members', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-DAD-2953', 'Monica Colucci', true, 'https://www.dadeschools.net/SchoolBoard/members', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2880', 'Jackie Toledo', false, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2640', 'Harry Cohen', true, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2646', 'Luiz F. F. Garcia', false, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2621', 'Gwen Myers', true, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2661', 'Stacy Hahn', false, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2636', 'Neil Manimala', false, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2620', 'Joshua Wostal', true, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2660', 'Aileen Rodriguez', false, 'https://hcfl.gov/government/board-of-county-commissioners', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2677', 'Brittany Lyssy', false, 'https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2675', 'Daniela Simic', false, 'https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2672', 'Patricia "Patti" Rendon', true, 'https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2610', 'Kenneth "Ken" Gay', false, 'https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-HIL-2645', 'Karen Perez', true, 'https://www.hillsboroughschools.org/o/hcps/page/board-member-district-map', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1290', 'Kamia Brown', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1384', 'Mike Crabb', true, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1260', 'Brian Jones', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1279', 'Johanna Lopez', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1295', 'Lawanna Gelzer', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1265', 'Michael "Mike" Scott', true, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1283', 'Patricia Rumph', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1271', 'Vicki Vargo', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1275', 'Jeannette Quinones Hernandez', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1272', 'Victor M. Torres Jr.', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1401', 'Roberta Walton Johnson', false, 'https://www.myorangeclerk.com/', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1364', 'Terrell Thomas', false, 'https://www.myorangeclerk.com/', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1239', 'Chris Messina', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1236', 'Tiffany Moore Russell', false, 'https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1270', 'Melissa Lopez Marantes', false, 'https://www.ocps.net/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1318', 'Gloria Reina O''Neal', false, 'https://www.ocps.net/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1314', 'Diana Moore', false, 'https://www.ocps.net/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1242', 'Susanne Peña', false, 'https://www.ocps.net/school-board', '2026-10-08T00:00:00Z', NULL),
    ('FL-VF-ORA-1245', 'Angie Gallo', true, 'https://www.ocps.net/school-board', '2026-10-08T00:00:00Z', NULL)
    -- END generated: candidates
  ) AS v(candidate_id, legal_name, is_incumbent, source, verified_at, fec_id)
 WHERE c.candidate_id = v.candidate_id
   AND c.legal_name   = v.legal_name;

-- (3) race.incumbent_id from the candidate rows: the one ballot candidate with
-- is_incumbent, else NULL. Races with two or more are left to (4).
UPDATE race r
   SET incumbent_id = s.one_inc
  FROM (SELECT r2.race_id,
               count(*) FILTER (WHERE c.is_incumbent)          AS n_inc,
               max(c.candidate_id) FILTER (WHERE c.is_incumbent) AS one_inc
          FROM race r2
          JOIN candidate c ON c.candidate_id = ANY (r2.candidate_ids)
         WHERE r2.election = 'general' AND c.ballot_status = 'ballot'
         GROUP BY r2.race_id) s
 WHERE r.race_id = s.race_id
   AND s.n_inc <= 1
   AND r.incumbent_id IS DISTINCT FROM s.one_inc;

-- (4) A race with two or more incumbents: the worksheet's seat holder, or NULL.
-- The first row matches no race; it keeps the list valid when none is needed.
UPDATE race r
   SET incumbent_id = v.incumbent_id
  FROM (VALUES
    ('__none__', NULL::text)
    -- BEGIN generated: race_overrides
    -- END generated: race_overrides
  ) AS v(race_id, incumbent_id)
 WHERE r.race_id = v.race_id
   AND r.incumbent_id IS DISTINCT FROM v.incumbent_id;

-- (5) is_open_seat is exactly (incumbent_id IS NULL), on every general race.
UPDATE race
   SET is_open_seat = (incumbent_id IS NULL)
 WHERE election = 'general'
   AND is_open_seat IS DISTINCT FROM (incumbent_id IS NULL);

-- (6) Running mates for the eight Governor tickets, all in one statement.
UPDATE candidate c
   SET running_mate             = v.running_mate,
       running_mate_source      = v.source,
       running_mate_verified_at = v.verified_at::timestamptz
  FROM (VALUES
    -- BEGIN generated: tickets
    ('FL-DOE-89042', 'Byron Donalds', 'Bryan Avila', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89042', '2026-10-08T00:00:00Z'),
    ('FL-DOE-89243', 'David Jolly', 'Gwen Graham', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89243', '2026-10-08T00:00:00Z'),
    ('FL-DOE-84076', 'Scott Eckhard Jewett', 'Nicole Skelly', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=84076', '2026-10-08T00:00:00Z'),
    ('FL-DOE-90630', 'Charles Burkett', 'Ruben A. Coto', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=90630', '2026-10-08T00:00:00Z'),
    ('FL-DOE-89571', 'Frank J. Russo', 'Rachel Rodriguez', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89571', '2026-10-08T00:00:00Z'),
    ('FL-DOE-88529', 'Moliere "Moe" Dimanche', 'Benjiman Rojas', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=88529', '2026-10-08T00:00:00Z'),
    ('FL-DOE-90433', 'Dean Ocean Abrams', 'Joe Van Vactor', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=90433', '2026-10-08T00:00:00Z'),
    ('FL-DOE-89630', 'Jeffrey Peter "Dr. Jeff" Datto', 'Juan Santana', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=89630', '2026-10-08T00:00:00Z')
    -- END generated: tickets
  ) AS v(candidate_id, legal_name, running_mate, source, verified_at)
 WHERE c.candidate_id  = v.candidate_id
   AND c.legal_name    = v.legal_name
   AND c.office_sought = 'Governor';

-- (7) A site the re-check found for a candidate in a LISTED race (D11).
UPDATE candidate c
   SET official_site         = v.official_site,
       site_last_verified_at = v.verified_at::timestamptz
  FROM (VALUES
    ('__none__', '', '', '2026-10-08T00:00:00Z')
    -- BEGIN generated: sites
    -- END generated: sites
  ) AS v(candidate_id, legal_name, official_site, verified_at)
 WHERE c.candidate_id = v.candidate_id
   AND c.legal_name   = v.legal_name
   AND EXISTS (SELECT 1
                 FROM race r
                 JOIN race_publication rp ON rp.race_id = r.race_id
                WHERE c.candidate_id = ANY (r.candidate_ids)
                  AND rp.status = 'listed');

-- (8) Constraints, after the data.
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_incumbency_sourced;
ALTER TABLE candidate ADD CONSTRAINT candidate_incumbency_sourced
  CHECK ((incumbency_source IS NULL) = (incumbency_verified_at IS NULL));

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_incumbent_needs_source;
ALTER TABLE candidate ADD CONSTRAINT candidate_incumbent_needs_source
  CHECK (NOT is_incumbent OR incumbency_verified_at IS NOT NULL);

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_running_mate_sourced;
ALTER TABLE candidate ADD CONSTRAINT candidate_running_mate_sourced
  CHECK ((running_mate IS NULL) = (running_mate_source IS NULL)
     AND (running_mate IS NULL) = (running_mate_verified_at IS NULL));

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_running_mate_governor;
ALTER TABLE candidate ADD CONSTRAINT candidate_running_mate_governor
  CHECK (running_mate IS NULL OR office_sought = 'Governor');

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_running_mate_clean;
ALTER TABLE candidate ADD CONSTRAINT candidate_running_mate_clean
  CHECK (running_mate IS NULL
      OR running_mate = btrim(regexp_replace(running_mate, '\s+', ' ', 'g')));

-- (9) The guard on changing a sourced value, last.
CREATE OR REPLACE FUNCTION public.candidate_sourced_fact_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_incumbent IS DISTINCT FROM OLD.is_incumbent
     AND OLD.incumbency_verified_at IS NOT NULL
     AND NEW.incumbency_source      IS NOT DISTINCT FROM OLD.incumbency_source
     AND NEW.incumbency_verified_at IS NOT DISTINCT FROM OLD.incumbency_verified_at THEN
    RAISE EXCEPTION 'candidate %: is_incumbent changed without a new incumbency_source or incumbency_verified_at', OLD.candidate_id
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.running_mate IS DISTINCT FROM OLD.running_mate
     AND NEW.running_mate IS NOT NULL
     AND OLD.running_mate_verified_at IS NOT NULL
     AND NEW.running_mate_source      IS NOT DISTINCT FROM OLD.running_mate_source
     AND NEW.running_mate_verified_at IS NOT DISTINCT FROM OLD.running_mate_verified_at THEN
    RAISE EXCEPTION 'candidate %: running_mate changed without a new running_mate_source or running_mate_verified_at', OLD.candidate_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.candidate_sourced_fact_guard()
  FROM PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;

DROP TRIGGER IF EXISTS candidate_sourced_fact_guard ON candidate;
CREATE TRIGGER candidate_sourced_fact_guard
  BEFORE UPDATE OF is_incumbent, running_mate ON candidate
  FOR EACH ROW EXECUTE FUNCTION public.candidate_sourced_fact_guard();

-- (10) Assert the result. The county roster is seeded by 0031/0032/0038, so
-- the county assertions hold in the offline harness too; the whole-ballot ones
-- need the DoE roster and run only on the live project.
DO $$
DECLARE
  n int;
  -- BEGIN generated: totals
  -- D1 rule: membership (Recommended). Regenerate: node scripts/roster-worksheet.ts --write-migration --d1 membership
  n_incumbents_expected CONSTANT int := 33;
  n_sited_expected      CONSTANT int := 97;
  -- END generated: totals
BEGIN
  SELECT count(*) INTO n
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.level = 'county' AND c.ballot_status = 'ballot'
     AND c.incumbency_source IS NOT NULL AND c.incumbency_verified_at IS NOT NULL;
  IF n <> 49 THEN
    RAISE EXCEPTION '0049: % of the 49 county ballot candidates carry an incumbency source', n;
  END IF;

  -- Every incumbent_id names a ballot candidate of that race who has is_incumbent.
  SELECT count(*) INTO n FROM race r
   WHERE r.election = 'general' AND r.incumbent_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM candidate c
                      WHERE c.candidate_id = r.incumbent_id
                        AND c.candidate_id = ANY (r.candidate_ids)
                        AND c.ballot_status = 'ballot' AND c.is_incumbent);
  IF n > 0 THEN
    RAISE EXCEPTION '0049: % race(s) name an incumbent_id who is not an incumbent on their ballot', n;
  END IF;

  -- A race with exactly one incumbent names that one.
  SELECT count(*) INTO n
    FROM race r
    CROSS JOIN LATERAL (
      SELECT count(*) FILTER (WHERE c.is_incumbent)            AS n_inc,
             max(c.candidate_id) FILTER (WHERE c.is_incumbent) AS one_inc
        FROM candidate c
       WHERE c.candidate_id = ANY (r.candidate_ids) AND c.ballot_status = 'ballot') s
   WHERE r.election = 'general' AND s.n_inc = 1 AND r.incumbent_id IS DISTINCT FROM s.one_inc;
  IF n > 0 THEN
    RAISE EXCEPTION '0049: % race(s) with one incumbent do not name them', n;
  END IF;

  SELECT count(*) INTO n FROM race
   WHERE election = 'general' AND is_open_seat <> (incumbent_id IS NULL);
  IF n > 0 THEN
    RAISE EXCEPTION '0049: % race(s) where is_open_seat disagrees with incumbent_id', n;
  END IF;

  IF (SELECT incumbent_id FROM race WHERE race_id = 'FL-HIL-SB4-general') IS DISTINCT FROM 'FL-VF-HIL-2672' THEN
    RAISE EXCEPTION '0049: FL-HIL-SB4-general must name Patti Rendon (FL-VF-HIL-2672)';
  END IF;

  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general';
  IF n = 0 THEN
    RAISE NOTICE '0049: DoE roster absent (offline harness) - whole-ballot assertions not run';
    RETURN;
  END IF;

  SELECT count(*) INTO n FROM race WHERE election = 'general';
  IF n <> 53 THEN
    RAISE EXCEPTION '0049: % general races, expected 53', n;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot'
     AND c.incumbency_source IS NOT NULL AND c.incumbency_verified_at IS NOT NULL;
  IF n <> 106 THEN
    RAISE EXCEPTION '0049: % of 106 ballot candidates carry an incumbency source', n;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot' AND c.is_incumbent;
  IF n <> n_incumbents_expected THEN
    RAISE EXCEPTION '0049: % ballot candidates are incumbents, the worksheet says %', n, n_incumbents_expected;
  END IF;

  IF (SELECT incumbent_id FROM race WHERE race_id = 'FL-GOV-general') IS NOT NULL THEN
    RAISE EXCEPTION '0049: FL-GOV-general must be open';
  END IF;
  IF (SELECT incumbent_id FROM race WHERE race_id = 'FL-ATG-general') IS DISTINCT FROM 'FL-DOE-89041' THEN
    RAISE EXCEPTION '0049: FL-ATG-general must name James Uthmeier (FL-DOE-89041)';
  END IF;

  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general' AND c.ballot_status = 'ballot'
     AND c.running_mate IS NOT NULL;
  IF n <> 8 THEN
    RAISE EXCEPTION '0049: % of 8 Governor tickets carry a running mate', n;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot' AND c.official_site IS NOT NULL;
  IF n <> n_sited_expected THEN
    RAISE EXCEPTION '0049: % ballot candidates have an official_site, expected %', n, n_sited_expected;
  END IF;

  RAISE NOTICE '0049: 106 ballot candidates sourced, % incumbents, 8 running mates, % sited',
    n_incumbents_expected, n_sited_expected;
END $$;
