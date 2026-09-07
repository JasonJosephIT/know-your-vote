-- 0013_general_election_copy.sql
-- Fix voter-facing copy that still described the primary.
--
-- WHY A MIGRATION AND NOT A FILE EDIT: 0004_official_links.sql is already
-- applied to the live database. Editing that file changes what a fresh
-- database would get and nothing that current voters see — the row is already
-- there. Confirmed live on production 2026-09-07: /api/news returned the old
-- summary verbatim. So the fix has to be an UPDATE.
--
-- WHAT WAS WRONG: the seeded summary read "Florida is a closed-primary state
-- — party registration determines your primary ballot." That was true and is
-- now misleading: the 2026 primary closed on 2026-08-18, and the general
-- election is open to every registered voter regardless of party. Telling a
-- voter in September that their registration determines their ballot invites
-- them to think they may be shut out of an election they can vote in.
--
-- The replacement matches the app copy already shipped in
-- src/app/api/voting-info/route.ts, so the two surfaces say the same thing.
--
-- NO DATE HERE, DELIBERATELY: election dates live in election_event, where
-- verified_by gates every row behind human verification before it can be sent
-- or shown. Duplicating the October 5 registration deadline into a news
-- summary would create a second copy with no such gate.
--
-- Idempotent: matched by URL, and re-running writes the same text.

UPDATE news_item
   SET summary = 'The state''s official online voter registration system. Every registered Florida voter gets the same ballot in the general election, whatever party you''re registered with — including no party at all.'
 WHERE url = 'https://registertovoteflorida.gov'
   AND item_type = 'official_link';
