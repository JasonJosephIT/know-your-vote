-- 0042_news_source_backfill.sql
-- Attribute the four live election_news rows that 0014's data fix does not
-- cover, so 0014 (news source required, task N1) can be applied at all.
-- Written 2026-10-04 for the launch handoff (launch-handoff-2026-10-04.md §5).
-- The steps and pre-checks are in docs/general-election/news-inlet-runbook.md
-- §4 and things-to-confirm.md TC-6.
--
-- WHY THIS EXISTS. 0014 was written on 2026-09-07, when the live database held
-- four election_news rows with no source, and it attributes exactly those four
-- by id. A read-only SELECT on 2026-10-04 found EIGHT. The four below were
-- added after 0014 was written: two are general-election notices dated
-- 2026-09-09, one is the statewide deadlines page and one is the June
-- amendments story. None has a source_id. Applied as written, 0014's
-- `ADD CONSTRAINT news_item_agent_source_check` would fail on these four rows
-- and roll the whole migration back. 0014's header asked for exactly this
-- re-check ("a row added since then makes ADD CONSTRAINT fail loudly").
-- 0014 is never edited (supabase/migrations/README.md rule 1), so the extra
-- four are handled in this new file, which runs first on the live database.
--
-- ORDER ON LIVE: apply THIS FILE FIRST, THEN 0014. 0014 is unapplied and
-- already out of order (its header says so). On a fresh database the filename
-- order runs 0014 first. That is safe: a fresh database has none of these
-- rows, so both data fixes are no-ops there and 0014's CHECK is added to an
-- empty table.
--
-- HOW EACH ROW IS ATTRIBUTED. Three are notices published by a government
-- body. They follow 0014's precedent: the body that published the page,
-- `primary_doc`, lean `N/A` (a lean does not apply to a government notice;
-- migration 0028 explains why that differs from 'unrated'). The fourth is a
-- Ballotpedia news story. Ballotpedia is not on the outlet list in
-- src/lib/news-sources.ts and has no lean anyone signed off, so it gets
-- `factual_reporting` with 'unrated', the value 0028 created for "a lean
-- applies and no rating agency has published one". The card then prints "No
-- independent rating". This is how the measure-resource sources from other
-- unlisted outlets were attributed (0035-0041, e.g. Bloomberg Tax and The
-- Bradenton Times).
--
-- RECOMMENDED (PENDING FOUNDER CONFIRMATION): the Ballotpedia attribution.
-- 0014 leaves the same choice open for its own four rows ("the founder may
-- prefer deletion or reclassification instead"). To flip, edit only the
-- clearly marked BALLOTPEDIA block below before applying:
--   * delete the row instead: replace that block's INSERT and UPDATE with
--       DELETE FROM news_item WHERE id = 'ce038b86-a7a8-4c04-84b1-624f50917682';
--   * keep it but rate it: change 'unrated' to the signed-off lean value.
-- The final assertion accepts either outcome: the row attributed, or the row
-- gone.
--
-- url_norm values match src/lib/brief-rows.ts `urlNorm` exactly (computed with
-- it, not by hand): lowercased host plus path, trailing slash stripped, query
-- kept, fragment dropped. That is the same function the admin approve path
-- uses to look a page's source up (decision route, `resolveSource`).
--
-- RESOLVED BY url_norm, NOT BY THE ID INSERTED. Each UPDATE reads the
-- source_id back from `source` by url_norm. If a row for one of these pages
-- ever exists under another id, ON CONFLICT leaves it alone, and the news row
-- still points at a source that exists. Setting the literal id would leave
-- news_item pointing at nothing and fail the foreign key. That is the same
-- lesson scripts/brief-rows-sql.ts applies to claim sources.
--
-- Idempotent: ON CONFLICT (url_norm) DO NOTHING, and every UPDATE is scoped
-- to WHERE source_id IS NULL. A re-run touches nothing.

INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_gov_miamidade_general_voting_2026',
   'https://www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232',
   'www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232',
   'Miami-Dade County', 'primary_doc', 'N/A'),
  ('src_gov_hillsborough_general_2026',
   'https://www.votehillsborough.gov/291/2026-General-Election',
   'www.votehillsborough.gov/291/2026-General-Election',
   'Hillsborough County Supervisor of Elections', 'primary_doc', 'N/A'),
  ('src_gov_dos_election_dates_2026',
   'https://dos.fl.gov/elections/for-voters/election-dates/',
   'dos.fl.gov/elections/for-voters/election-dates',
   'Florida Dept. of State, Division of Elections', 'primary_doc', 'N/A')
ON CONFLICT (url_norm) DO NOTHING;

UPDATE news_item SET source_id = (
  SELECT source_id FROM source
   WHERE url_norm = 'www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232')
 WHERE id = '1ae20884-6268-4217-91cd-619c50fa2056' AND source_id IS NULL;
UPDATE news_item SET source_id = (
  SELECT source_id FROM source
   WHERE url_norm = 'www.votehillsborough.gov/291/2026-General-Election')
 WHERE id = '4c787ba7-22cd-4eb9-9b4b-39dbd9c378d5' AND source_id IS NULL;
UPDATE news_item SET source_id = (
  SELECT source_id FROM source
   WHERE url_norm = 'dos.fl.gov/elections/for-voters/election-dates')
 WHERE id = '8d12a9b1-bfa8-4501-bb7c-9db0f8536ead' AND source_id IS NULL;

-- ---- BALLOTPEDIA: Recommended (pending founder confirmation) -------------
-- "Three constitutional amendments certified for Florida's November 3
-- ballot". See the header for the two alternatives and how to switch.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_ballotpedia_news_amendments_2026',
   'https://news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-tax-exemption-amendment-in-november/',
   'news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-tax-exemption-amendment-in-november',
   'Ballotpedia News', 'factual_reporting', 'unrated')
ON CONFLICT (url_norm) DO NOTHING;

UPDATE news_item SET source_id = (
  SELECT source_id FROM source
   WHERE url_norm = 'news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-tax-exemption-amendment-in-november')
 WHERE id = 'ce038b86-a7a8-4c04-84b1-624f50917682' AND source_id IS NULL;
-- ---- end BALLOTPEDIA ------------------------------------------------------

-- Assert only where the rows exist: the offline harness
-- (scripts/verify-migrations.mjs) has no live news rows, the same situation
-- 0039 handles for its roster row.
DO $$
DECLARE
  missing INT;
BEGIN
  SELECT count(*) INTO missing FROM news_item
   WHERE id IN ('1ae20884-6268-4217-91cd-619c50fa2056',
                '4c787ba7-22cd-4eb9-9b4b-39dbd9c378d5',
                '8d12a9b1-bfa8-4501-bb7c-9db0f8536ead',
                'ce038b86-a7a8-4c04-84b1-624f50917682')
     AND source_id IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION '0042: % of the four targeted election_news rows still have no source', missing;
  END IF;
  RAISE NOTICE '0042: no targeted election_news row is left without a source';
END $$;
