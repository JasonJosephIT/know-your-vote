-- 0014_news_fairness.sql
-- Agent-written news rows must carry a source. docs/general-election/
-- news-fairness.md §1, task N1: "no source, no card" — the news-plane
-- restatement of the pipeline's "no Source -> no Claim" constitution.
--
-- NUMBER: 0014 was reserved in supabase/migrations/README.md weeks before
-- this file was written, and 0015-0017 shipped ahead of it (same situation
-- 0013's header documents). Postgres applies by filename order, so this file
-- lands BEFORE 0015-0017 on a fresh database and AFTER them on the live one.
-- Checked before writing: 0015 UPDATEs one official_link row's copy; 0016
-- adds news_item.county_fips + an index; 0017 adds news_item.relation + a
-- CHECK + an index. None of the three touches source_id, item_type, or the
-- source table, so applying in either order is safe. Do not assume that for
-- the next out-of-order number — check it again.
--
-- WHAT THIS CONSTRAINS: news_item.source_id has been nullable since 0001.
-- An agent-written row (item_type candidate_news or election_news) could
-- exist with no source_id, therefore no source.type and no source.lean_tag
-- — an unlabelled card the app cannot show fairly. official_link and
-- pipeline_event are NOT constrained: an official resource link and a
-- pipeline status event legitimately have no publisher to attribute.
--
-- PRECONDITION — DO NOT APPLY LIVE UNTIL BOTH HOLD:
--   (a) the admin console's manual-news approve path sets `source_id` on the
--       `news_item` rows it inserts, and its `describeNewsInsertError`
--       distinguishes `news_item_agent_source_check` from the 0005 checks.
--       Today (`src/lib/admin/effects.ts`, Stream S) that path inserts with
--       NO source_id and maps EVERY 23514 CHECK violation to "migration 0005
--       not applied". Applying this file before that fix turns every approved
--       manual news item into a failure described as the wrong migration --
--       an operator would chase 0005 while the real cause is this CHECK.
--   (b) the REST check for NULL-source `candidate_news`/`election_news` rows
--       has been re-run IMMEDIATELY BEFORE applying. The count below is from
--       2026-09-07; a row added since then makes `ADD CONSTRAINT` fail loudly,
--       which is the intended behaviour, but it should be a known outcome and
--       not a surprise mid-apply.
--
-- Idempotent: the source INSERTs below are ON CONFLICT (url_norm) DO
-- NOTHING, the UPDATE is scoped to WHERE source_id IS NULL so a re-run
-- touches nothing, and the CHECK is added inside a DO $$ guard exactly like
-- 0017's news_item_relation_check. Safe to re-run.

-- ---------------------------------------------------------------------
-- DATA FIX (live database only; a no-op on a fresh one, since a fresh DB
-- has no news_item rows yet). Live-data check performed 2026-09-07 via the
-- Supabase REST API found exactly 10 live news_item rows, and ALL 10 have
-- source_id IS NULL: 6 are official_link (legitimately source-less, kept
-- admitted below) and 4 are election_news with NO source — these four would
-- VIOLATE the CHECK this migration adds, so it must resolve them first or
-- the CHECK could never be added at all.
--
-- Four primary-era election_news rows (early-voting-schedule notices and one
-- HB 991 bill-signing item) were seeded before the source-attribution rule
-- existed and never got a source. This fix is FIX, not delete or
-- reclassify: it attributes each to the government body that published it,
-- since all four already read as primary-source government notices, not
-- opinion or campaign copy. The founder may prefer deletion or
-- reclassification instead; either replacement is a single UPDATE/DELETE on
-- these four rows, non-destructive to anything else.
--
-- url_norm is computed by hand here to match
-- Agents/The Fact-Checker/allowlist_b_core.py's url_norm() exactly:
-- lowercased host + path (trailing slash stripped) + query (kept verbatim,
-- unnormalized), fragment dropped. None of the four URLs below has a
-- fragment or a trailing slash, and only the Miami-Dade one has a query
-- string, so the mapping is direct with no reformatting decisions to make.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_gov_miamidade_early_voting_2026',
   'https://www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276',
   'www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276',
   'Miami-Dade County', 'primary_doc', 'N/A'),
  ('src_gov_broward_early_voting_2026',
   'https://browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites',
   'browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites',
   'Broward County Supervisor of Elections', 'primary_doc', 'N/A'),
  ('src_gov_hillsborough_early_voting_2026',
   'https://www.votehillsborough.gov/281/2026-Primary-Election',
   'www.votehillsborough.gov/281/2026-Primary-Election',
   'Hillsborough County Supervisor of Elections', 'primary_doc', 'N/A'),
  ('src_gov_flsenate_hb991_2026',
   'https://www.flsenate.gov/Session/Bill/2026/991',
   'www.flsenate.gov/Session/Bill/2026/991',
   'Florida Senate', 'primary_doc', 'N/A')
ON CONFLICT (url_norm) DO NOTHING;

-- Matched by id (the controller's live-data check), scoped to
-- WHERE source_id IS NULL so a re-run is a no-op rather than a no-match.
UPDATE news_item SET source_id = 'src_gov_miamidade_early_voting_2026'
 WHERE id = '126725c6-2ab0-4488-998a-314bf25c2460' AND source_id IS NULL;
UPDATE news_item SET source_id = 'src_gov_broward_early_voting_2026'
 WHERE id = '9b4a9bf0-052d-4d62-88d3-682101e3f511' AND source_id IS NULL;
UPDATE news_item SET source_id = 'src_gov_hillsborough_early_voting_2026'
 WHERE id = 'bbc7a4c8-3fb6-4199-91c8-99103dcc9617' AND source_id IS NULL;
UPDATE news_item SET source_id = 'src_gov_flsenate_hb991_2026'
 WHERE id = '7d95cfb2-dee3-40a6-895f-9e4d5cb5f18c' AND source_id IS NULL;

-- ---------------------------------------------------------------------
-- THE CONSTRAINT. Agent rows only: candidate_news and election_news must
-- carry a source_id. official_link and pipeline_event stay unconstrained —
-- they legitimately have none.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'news_item_agent_source_check'
  ) THEN
    ALTER TABLE news_item ADD CONSTRAINT news_item_agent_source_check
      CHECK (item_type NOT IN ('candidate_news','election_news') OR source_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON CONSTRAINT news_item_agent_source_check ON news_item IS
  'No source, no card (news-fairness.md N1): candidate_news and '
  'election_news rows must carry a source_id, since that is the only path '
  'to source.type / source.lean_tag the card needs to render fairly. '
  'official_link and pipeline_event are exempt — legitimately source-less.';
