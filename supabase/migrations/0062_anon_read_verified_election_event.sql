-- Public read of verified election dates, so the home banner/masthead
-- (src/lib/notifications/home-events.ts) and the calendar file
-- (src/app/api/calendar/[election]/route.ts) read election_event with the
-- anon key instead of the service-role key, which bypasses RLS.
--
-- THIS WIDENS ANON ACCESS. 0007 revoked all anon access to election_event
-- ("deliberately NOT anon-readable"): the only guard against an unverified
-- date reaching a page was the verified_by filter in application code. After
-- this file the guard is in the database instead:
--
--   * anon may SELECT verified rows only (policy USING verified_by IS NOT
--     NULL). An unverified row stays invisible to anon however it is queried.
--   * anon may SELECT every column EXCEPT verified_by, which holds the
--     operator's email. Column grants, not a table grant, so `SELECT *` and
--     any filter on verified_by are refused (the anon reader in
--     src/lib/notifications/election-events.ts names its columns and relies
--     on the policy for the verified filter).
--   * anon gains no INSERT/UPDATE/DELETE. authenticated gains nothing.
--
-- The dates are public already: every verified row is shown on the home page
-- and in the .ics file, and each cites its official details_url.
--
-- Deploy order: apply this BEFORE deploying the code that reads with the
-- anon key. Code first means the anon read is refused, the banner and
-- masthead show no dates (readers degrade to []), and calendar files come
-- back empty until this is applied.
--
-- Idempotent: column GRANTs are no-ops when held; the policy is dropped and
-- re-created.

GRANT SELECT (id, state, county_fips, event_type, election, event_date, rule,
              details_url, verified_at)
  ON election_event TO anon;

DROP POLICY IF EXISTS anon_read_verified_election_event ON election_event;
CREATE POLICY anon_read_verified_election_event ON election_event
  FOR SELECT TO anon
  USING (verified_by IS NOT NULL);
