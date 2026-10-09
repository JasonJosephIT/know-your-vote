-- 0055_official_link_sources.sql
-- Gives the six official_link rows a source, and extends 0014's "no source,
-- no card" CHECK to official_link (docs/superpowers/specs/
-- 2026-10-08-news-source-integrity-design.md §3.2.4, decision D8; ledger
-- row 0055).
--
-- WHY. 0014 exempted official_link because a resource link had "no publisher
-- to attribute". Each of the six does have one: the body whose site it is.
-- With a source, the card prints that publisher and "Official document"
-- (news-labels.ts), as every other card names its publisher, instead of the
-- generic "Official resource".
--
-- APPLY ORDER ON LIVE: after 0014 (this file raises without 0014's CHECK),
-- and after news PR A is deployed (#135, already deployed), whose approve
-- path writes the same official rows. No DELETE, so through the MCP
-- (apply_migration, name 0055_official_link_sources), which wraps the file
-- in one transaction.
--
-- THE FIVE OFFICIAL ROWS are exactly what officialSourceRow
-- (src/lib/official-sources.ts) builds for the entry officialForUrl returns
-- on each link's URL, checked with that code 2026-10-09:
--   https://www.ocfelections.gov      -> ocfelections.gov
--   https://www.browardvotes.gov      -> browardvotes.gov
--   https://www.votehillsborough.gov  -> votehillsborough.gov
--   https://registertovoteflorida.gov -> registertovoteflorida.gov
--   https://dos.fl.gov/elections/     -> dos.fl.gov/elections
-- Same builder as the approve path, so the row is the same whichever writes
-- it first; ON CONFLICT (url_norm) DO NOTHING keeps the first.
-- scripts/verify-migrations.mjs section 24 compares these rows with
-- officialSourceRow's output, so the two cannot drift apart unseen.
--
-- THE MIAMI-DADE LINK (https://www.miamidade.gov/global/elections/home.page)
-- is outside the path-scoped entry miamidade.gov/elections, so officialForUrl
-- returns null for it. It gets a page row instead, publisher "Miami-Dade
-- County Supervisor of Elections", primary_doc / N/A. (src/lib/supervisors.ts
-- records that this page now redirects to votemiamidade.gov; pointing the
-- link there is D8's TO FLIP and is not done here.)
--
-- ATTRIBUTED BY URL, NOT BY ID. The six rows are 0004's seed, whose ids are
-- generated, so only the URL is the same on live and on a fresh database (as
-- 0015 matches). Each UPDATE reads the source_id back by url_norm, as 0042
-- does, so a row already holding that url_norm under another id is used.
-- The assertion then refuses unless every official_link row has a source and
-- each of the six is primary_doc / N/A (the approve path's ensureListedRow
-- refuses an official row of any other type or lean in the same way).
--
-- THE CHECK REBUILD IS GUARDED on the exact pre-state (spec §3.9).
-- pg_get_constraintdef(news_item_agent_source_check) must equal 0014's
-- CHECK as Postgres prints it (the same shape live prints for 0034's
-- measure_resource_neutral_kinds, read 2026-10-09):
--   CHECK (((item_type <> ALL (ARRAY['candidate_news'::text, 'election_news'::text])) OR (source_id IS NOT NULL)))
-- Equal: rebuilt with official_link added. Already this file's post-state:
-- a re-run, nothing changes. Missing, any other text, or a second CHECK on
-- news_item that mentions source_id: raises, so a value is never dropped
-- silently. The file is unapplied and is then rewritten against what is
-- there.
--
-- pipeline_event stays exempt (D11): no URL, no publisher, and no page shows
-- one. No app code writes official_link rows; only 0004 and 0015 do.
--
-- Read back after applying (read-only):
--   SELECT count(*) FROM news_item
--    WHERE item_type = 'official_link' AND source_id IS NULL;              -- 0
--   SELECT n.url, s.source_id, s.publisher, s.type, s.lean_tag
--     FROM news_item n JOIN source s USING (source_id)
--    WHERE n.item_type = 'official_link' ORDER BY 1;                      -- six rows
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname = 'news_item_agent_source_check';                      -- lists official_link
--
-- Rollback: restore 0014's CHECK text, and set the six source_ids to NULL.
-- The source rows can stay.
--
-- Idempotent: ON CONFLICT DO NOTHING, UPDATEs scoped to source_id IS NULL,
-- and the guard's no-op on its own post-state.

-- ---- Guard: 0014 applied, and its CHECK untouched since --------------------
DO $$
DECLARE
  cdef   TEXT;
  others TEXT;
  pre_state  CONSTANT TEXT :=
    'CHECK (((item_type <> ALL (ARRAY[''candidate_news''::text, ''election_news''::text])) OR (source_id IS NOT NULL)))';
  post_state CONSTANT TEXT :=
    'CHECK (((item_type <> ALL (ARRAY[''candidate_news''::text, ''election_news''::text, ''official_link''::text])) OR (source_id IS NOT NULL)))';
BEGIN
  SELECT string_agg(conname, ', ') INTO others
    FROM pg_constraint
   WHERE conrelid = 'news_item'::regclass
     AND contype = 'c'
     AND conname <> 'news_item_agent_source_check'
     AND pg_get_constraintdef(oid) ~ '\msource_id\M';
  IF others IS NOT NULL THEN
    RAISE EXCEPTION '0055: news_item has other CHECK constraint(s) on source_id: %. Rewrite 0055 against what is there', others;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO cdef
    FROM pg_constraint
   WHERE conrelid = 'news_item'::regclass AND conname = 'news_item_agent_source_check';
  IF cdef IS NULL THEN
    RAISE EXCEPTION '0055: news_item_agent_source_check not found. Apply 0042 and then 0014 first';
  END IF;
  IF cdef IS DISTINCT FROM pre_state AND cdef IS DISTINCT FROM post_state THEN
    RAISE EXCEPTION '0055: news_item_agent_source_check is %, not 0014''s text. Another migration changed it first; rewrite 0055 against what is there', cdef;
  END IF;
END $$;

-- ---- The five official rows (officialSourceRow) -----------------------------
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('official:ocfelections.gov', 'https://ocfelections.gov', 'ocfelections.gov',
   'Orange County Supervisor of Elections', 'primary_doc', 'N/A'),
  ('official:browardvotes.gov', 'https://browardvotes.gov', 'browardvotes.gov',
   'Broward County Supervisor of Elections', 'primary_doc', 'N/A'),
  ('official:votehillsborough.gov', 'https://votehillsborough.gov', 'votehillsborough.gov',
   'Hillsborough County Supervisor of Elections', 'primary_doc', 'N/A'),
  ('official:registertovoteflorida.gov', 'https://registertovoteflorida.gov', 'registertovoteflorida.gov',
   'Florida Dept. of State', 'primary_doc', 'N/A'),
  ('official:dos.fl.gov/elections', 'https://dos.fl.gov/elections', 'dos.fl.gov/elections',
   'Florida Dept. of State, Division of Elections', 'primary_doc', 'N/A')
ON CONFLICT (url_norm) DO NOTHING;

-- ---- The Miami-Dade page row ------------------------------------------------
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_gov_miamidade_elections_home',
   'https://www.miamidade.gov/global/elections/home.page',
   'www.miamidade.gov/global/elections/home.page',
   'Miami-Dade County Supervisor of Elections', 'primary_doc', 'N/A')
ON CONFLICT (url_norm) DO NOTHING;

-- ---- Attribute each link by URL, the source read back by url_norm -----------
UPDATE news_item SET source_id = (SELECT source_id FROM source WHERE url_norm = 'ocfelections.gov')
 WHERE item_type = 'official_link' AND url = 'https://www.ocfelections.gov' AND source_id IS NULL;
UPDATE news_item SET source_id = (SELECT source_id FROM source WHERE url_norm = 'browardvotes.gov')
 WHERE item_type = 'official_link' AND url = 'https://www.browardvotes.gov' AND source_id IS NULL;
UPDATE news_item SET source_id = (SELECT source_id FROM source WHERE url_norm = 'votehillsborough.gov')
 WHERE item_type = 'official_link' AND url = 'https://www.votehillsborough.gov' AND source_id IS NULL;
UPDATE news_item SET source_id = (SELECT source_id FROM source WHERE url_norm = 'registertovoteflorida.gov')
 WHERE item_type = 'official_link' AND url = 'https://registertovoteflorida.gov' AND source_id IS NULL;
UPDATE news_item SET source_id = (SELECT source_id FROM source WHERE url_norm = 'dos.fl.gov/elections')
 WHERE item_type = 'official_link' AND url = 'https://dos.fl.gov/elections/' AND source_id IS NULL;
UPDATE news_item SET source_id = (SELECT source_id FROM source WHERE url_norm = 'www.miamidade.gov/global/elections/home.page')
 WHERE item_type = 'official_link' AND url = 'https://www.miamidade.gov/global/elections/home.page' AND source_id IS NULL;

-- ---- Assert -----------------------------------------------------------------
DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(coalesce(url, id::text), ', ' ORDER BY url) INTO bad
    FROM news_item WHERE item_type = 'official_link' AND source_id IS NULL;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0055: official_link row(s) still without a source: %', bad;
  END IF;

  SELECT string_agg(n.url || ' -> ' || s.source_id || ' (' || s.type || ' / ' || s.lean_tag || ')', ', ' ORDER BY n.url)
    INTO bad
    FROM news_item n JOIN source s USING (source_id)
   WHERE n.item_type = 'official_link'
     AND n.url IN ('https://www.ocfelections.gov', 'https://www.browardvotes.gov',
                   'https://www.votehillsborough.gov', 'https://registertovoteflorida.gov',
                   'https://dos.fl.gov/elections/',
                   'https://www.miamidade.gov/global/elections/home.page')
     AND (s.type <> 'primary_doc' OR s.lean_tag <> 'N/A');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0055: a source row for an official link exists with another type or lean: %. Fix the row first', bad;
  END IF;
END $$;

-- ---- Rebuild the CHECK with official_link -----------------------------------
DO $$
BEGIN
  IF pg_get_constraintdef((SELECT oid FROM pg_constraint
                            WHERE conrelid = 'news_item'::regclass
                              AND conname = 'news_item_agent_source_check'))
     LIKE '%''official_link''%' THEN
    RAISE NOTICE '0055: news_item_agent_source_check already covers official_link; nothing to do';
    RETURN;
  END IF;
  ALTER TABLE news_item DROP CONSTRAINT news_item_agent_source_check;
  ALTER TABLE news_item ADD CONSTRAINT news_item_agent_source_check
    CHECK (item_type NOT IN ('candidate_news','election_news','official_link') OR source_id IS NOT NULL);
END $$;

COMMENT ON CONSTRAINT news_item_agent_source_check ON news_item IS
  'No source, no card (news-fairness.md N1; 0055): candidate_news, '
  'election_news and official_link rows must carry a source_id, the only path '
  'to the publisher, source.type and source.lean_tag a card prints. '
  'pipeline_event is exempt: no URL, no publisher, never shown.';
