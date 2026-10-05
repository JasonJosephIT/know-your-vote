-- 0043_county_early_voting_2026.sql
-- Early voting in the four covered counties runs Mon Oct 19 to Sun Nov 1,
-- 2026. The site only knew the statewide window (Sat Oct 24 to Sat Oct 31,
-- 0008), which is the MINIMUM every county must offer: s. 101.657(1)(d),
-- Fla. Stat., lets a Supervisor of Elections add the 15th to 11th days
-- before the election and the 2nd. All four covered counties add every one
-- of them. With statewide rows only, every subscriber would have got "Early
-- voting starts today" on Oct 24, five days after their county opened, and
-- the banner would have said early voting "starts October 24" while it was
-- already open.
--
-- These rows override the statewide early-voting rows for voters in their
-- county (eventsForCounty in src/lib/notifications/schedule.ts): the
-- reminder cron, the banner, the welcome email and the calendar file all
-- read them. The code that reads them ships first and works without them,
-- so this file can be applied before or after it deploys.
--
-- Sources, each checked twice on 2026-10-05 against the county Supervisor
-- of Elections' own site, for the 2026-11-03 general election:
--   Miami-Dade   "EARLY VOTING SCHEDULE FOR THE GENERAL ELECTION 11/3/2026",
--                Oct 19 (Monday) through Nov 1 (Sunday), 7 a.m. to 7 p.m.
--   Broward      "November 3, 2026 Election ... Early voting period:
--                October 19 – November 1, 2026 from 7:00 a.m. to 7:00 p.m."
--   Hillsborough "2026 General Election Early Voting Dates / October 19
--                through November 1, 2026"
--   Orange       "2026 General Election Early Voting Period — Monday,
--                October 19 – Sunday, November 1 from 8:00 AM – 8:00 PM"
--                (ocfelections.gov now redirects to voteorangefl.gov)
--
-- verified_by is NULL by design, as in 0008 and 0021: no row reaches a
-- page, an email or a calendar until the founder has opened its
-- details_url and stamped it (founder task F4). The stamp is in
-- docs/general-election/reminders-e2e-runbook.md, "County early-voting
-- dates". The first county reminder is due Mon Oct 19 at 14:00 UTC, so
-- apply and stamp by Sun Oct 18.
--
-- Idempotent: ON CONFLICT DO NOTHING against uq_election_event_scope
-- (state, COALESCE(county_fips, ''), event_type, election).

INSERT INTO election_event (county_fips, event_type, election, event_date, details_url) VALUES
  ('12086', 'early_voting_start', 'general_2026', '2026-10-19', 'https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf'),
  ('12086', 'early_voting_end',   'general_2026', '2026-11-01', 'https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf'),
  ('12011', 'early_voting_start', 'general_2026', '2026-10-19', 'https://browardvotes.gov/voters/early-voting-ballot-return'),
  ('12011', 'early_voting_end',   'general_2026', '2026-11-01', 'https://browardvotes.gov/voters/early-voting-ballot-return'),
  ('12057', 'early_voting_start', 'general_2026', '2026-10-19', 'https://www.votehillsborough.gov/EarlyVoting'),
  ('12057', 'early_voting_end',   'general_2026', '2026-11-01', 'https://www.votehillsborough.gov/EarlyVoting'),
  ('12095', 'early_voting_start', 'general_2026', '2026-10-19', 'https://voteorangefl.gov/vote-early/'),
  ('12095', 'early_voting_end',   'general_2026', '2026-11-01', 'https://voteorangefl.gov/vote-early/')
ON CONFLICT DO NOTHING;
