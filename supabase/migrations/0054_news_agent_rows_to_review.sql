-- 0054_news_agent_rows_to_review.sql
-- Moves the eight election_news rows the R3 agent inserted straight into
-- news_item into the /admin review queue, attributed, so a person decides
-- each one (docs/superpowers/specs/2026-10-08-news-source-integrity-design.md
-- §3.3, decision D2; ledger row 0054).
--
-- WHY. R3 wrote all eight with `execute_sql INSERT` (spec §2.2: its run
-- reports 2026-07-06-R3.md and 2026-09-09-R3.md name every id). None went
-- through review_item and nobody approved them. 0042 and 0014 give them a
-- source, but applying a migration is not an approval in /admin. So each row
-- becomes a pending `manual_news` item with source 'agent:R3' (the agent
-- that wrote it, per §2.2), and leaves the site until it is approved.
-- Approving re-inserts it through the normal path: the neutrality lint, the
-- given source (its src_* row), then a new news_item row.
--
-- APPLY ORDER ON LIVE: after 0042 AND 0014, in the Supabase SQL EDITOR, not
-- through the MCP. The MCP connector times out on DELETE (0045 had to be
-- applied by hand for the same reason, README.md). Applied that way it is
-- not recorded in supabase_migrations.schema_migrations; the ledger records
-- it instead, as for 0045. The file is one explicit transaction
-- (BEGIN ... COMMIT), so a refusal anywhere leaves nothing changed.
--
-- THE GUARD refuses, before anything is written, unless:
--   * news_item_agent_source_check (0014's CHECK) exists, and
--   * every targeted row still present has a source_id (0042 attributed
--     four, 0014 the other four), whose source row's url_norm is the row's
--     own page (the approve route refuses a given src_* id otherwise,
--     givenPageRowProblem), and
--   * every targeted row will build a payload ManualNewsPayloadSchema
--     accepts (below).
-- Applied before 0042 and 0014, it raises and names them.
--
-- EVERY PAYLOAD PARSES WITH ManualNewsPayloadSchema (src/types/admin.ts).
-- Checked against the schema, and against the eight live rows read
-- 2026-10-09 (SELECT only):
--   * item_type: enum candidate_news | election_news. All eight are
--     election_news; the guard refuses any other type.
--   * title: trimmed, 1 to 240 characters. Live titles are 59 to 86, with no
--     leading or trailing space; the guard refuses an empty or over-long one.
--   * summary: trimmed, at most 2000, nullish. Live summaries are 234 to 473;
--     a NULL summary is dropped by jsonb_strip_nulls, which the schema allows.
--   * url: an http(s) URL. All eight are https://; the guard refuses others.
--   * published_at: z.string().min(1), passed to the news_item insert as is.
--     Written as UTC ISO 8601, 'YYYY-MM-DD"T"HH24:MI:SS"Z"' (all eight are
--     midnight UTC, so nothing is lost to the dropped fraction). The guard
--     refuses a NULL published_at, which would be stripped and fail the
--     schema.
--   * scope (refine 2): at least one of race_id, candidate_id, metro,
--     county_fips, statewide. Five rows carry a metro; the three with no
--     metro and no county_fips get statewide: true.
--   * statewide (refine 3) excludes race, candidate, metro and county: set
--     only when metro and county_fips are both NULL, and the payload never
--     carries race_id or candidate_id.
--   * relation (refine 1) is needed only with a candidate_id, which no
--     payload carries.
--   * race_id and candidate_id: NULL on all eight. The payload has no place
--     for them, so the guard refuses a row that has one (it would lose its
--     scope, and a statewide flag would then be wrong).
--   * source_id: trimmed string. moved_from_news_item is not in the schema;
--     zod drops it on parse and it stays in the stored payload as the audit
--     link back to the row. scripts/verify-migrations.mjs section 23 parses
--     every payload this file builds with the real schema.
--
-- THE BALLOTPEDIA ROW (ce038b86, founder decision D1). Applied as written,
-- 0042 attributes it and this file moves eight rows. Under D1's TO FLIP,
-- 0042's delete variant removes it and this file moves seven. Either way the
-- file only touches targeted rows that still exist.
--
-- IDEMPOTENT. The INSERT skips an id that already has an agent:R3
-- manual_news item carrying it in moved_from_news_item, and the DELETE
-- removes only rows so copied. A re-run inserts nothing and deletes nothing.
--
-- Read back after applying (spec §3.3, read-only):
--   M1: 0
--     SELECT count(*) FROM news_item WHERE id IN (<the eight ids>);
--   M2: eight rows (seven under D1's TO FLIP), all pending, each with its
--       src_* id from 0042 or 0014
--     SELECT payload->>'moved_from_news_item', payload->>'source_id', status
--       FROM review_item WHERE source = 'agent:R3' ORDER BY 1;
--   M3: 0
--     SELECT count(*) FROM news_item
--      WHERE item_type IN ('candidate_news','election_news') AND source_id IS NULL;
--
-- Rollback: approve the items in /admin; each returns as a new news_item row
-- with the same source.

BEGIN;

CREATE TEMP TABLE kyv_0054_target (id UUID PRIMARY KEY) ON COMMIT DROP;
INSERT INTO kyv_0054_target (id) VALUES
  ('8d12a9b1-bfa8-4501-bb7c-9db0f8536ead'),  -- dos.fl.gov election dates (0042)
  ('4c787ba7-22cd-4eb9-9b4b-39dbd9c378d5'),  -- Hillsborough general (0042)
  ('1ae20884-6268-4217-91cd-619c50fa2056'),  -- Miami-Dade general release (0042)
  ('ce038b86-a7a8-4c04-84b1-624f50917682'),  -- Ballotpedia (0042, or gone under D1's TO FLIP)
  ('126725c6-2ab0-4488-998a-314bf25c2460'),  -- Miami-Dade early voting release (0014)
  ('9b4a9bf0-052d-4d62-88d3-682101e3f511'),  -- Broward early voting (0014)
  ('bbc7a4c8-3fb6-4199-91c8-99103dcc9617'),  -- Hillsborough primary (0014)
  ('7d95cfb2-dee3-40a6-895f-9e4d5cb5f18c');  -- Florida Senate HB 991 (0014)

-- The ids present when this run started, for the final assertion.
CREATE TEMP TABLE kyv_0054_present ON COMMIT DROP AS
  SELECT n.id FROM news_item n JOIN kyv_0054_target t USING (id);

-- ---- The guard ---------------------------------------------------------
DO $$
DECLARE
  bad TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'news_item'::regclass AND conname = 'news_item_agent_source_check'
  ) THEN
    RAISE EXCEPTION '0054: news_item_agent_source_check is missing. Apply 0042 and then 0014 first';
  END IF;

  SELECT string_agg(n.id::text, ', ' ORDER BY n.id) INTO bad
    FROM news_item n JOIN kyv_0054_target USING (id)
   WHERE n.source_id IS NULL;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0054: no source on %. Apply 0042 and then 0014 first', bad;
  END IF;

  -- The src_* row must be this page's own row, as the approve route requires
  -- of a given id. The page's url_norm is computed by the rule of urlNorm in
  -- src/lib/brief-rows.ts: lowercased host, path without trailing slashes,
  -- query kept, fragment dropped.
  SELECT string_agg(n.id::text || ' (source ' || n.source_id || ' is ' || s.url_norm || ')', ', ' ORDER BY n.id)
    INTO bad
    FROM news_item n
    JOIN kyv_0054_target USING (id)
    JOIN source s ON s.source_id = n.source_id
    CROSS JOIN LATERAL regexp_match(n.url, '^https?://([^/?#]+)([^?#]*)(\?[^#]+)?') AS m
   WHERE s.url_norm IS DISTINCT FROM
         lower(m[1]) || regexp_replace(m[2], '/+$', '') || coalesce(m[3], '');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0054: source row is not the page''s own on %', bad;
  END IF;

  -- What ManualNewsPayloadSchema needs of the payload built below.
  SELECT string_agg(n.id::text, ', ' ORDER BY n.id) INTO bad
    FROM news_item n JOIN kyv_0054_target USING (id)
   WHERE n.item_type NOT IN ('candidate_news', 'election_news')
      OR n.title IS NULL OR length(btrim(n.title)) NOT BETWEEN 1 AND 240
      OR length(btrim(n.summary)) > 2000
      OR n.url IS NULL OR n.url !~ '^https?://[^/?#]+'
      OR n.published_at IS NULL
      OR n.race_id IS NOT NULL OR n.candidate_id IS NOT NULL;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0054: would not build a ManualNewsPayloadSchema payload for %', bad;
  END IF;
END $$;

-- ---- Copy into the review queue ----------------------------------------
INSERT INTO review_item (kind, source, status, payload)
SELECT 'manual_news', 'agent:R3', 'pending',
       jsonb_strip_nulls(jsonb_build_object(
         'item_type',            n.item_type,
         'title',                n.title,
         'summary',              n.summary,
         'url',                  n.url,
         'metro',                n.metro,
         'county_fips',          n.county_fips,
         'statewide',            CASE WHEN n.metro IS NULL AND n.county_fips IS NULL THEN true END,
         'published_at',         to_char(n.published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'source_id',            n.source_id,
         'moved_from_news_item', n.id::text))
  FROM news_item n
  JOIN kyv_0054_target USING (id)
 WHERE NOT EXISTS (SELECT 1 FROM review_item r
                    WHERE r.kind = 'manual_news' AND r.source = 'agent:R3'
                      AND r.payload->>'moved_from_news_item' = n.id::text);

-- ---- Remove only the rows now copied ------------------------------------
DELETE FROM news_item n
 USING kyv_0054_target t
 WHERE n.id = t.id
   AND EXISTS (SELECT 1 FROM review_item r
                WHERE r.kind = 'manual_news' AND r.source = 'agent:R3'
                  AND r.payload->>'moved_from_news_item' = n.id::text);

-- ---- Assert -----------------------------------------------------------
DO $$
DECLARE
  bad TEXT;
  moved INT;
BEGIN
  SELECT string_agg(n.id::text, ', ' ORDER BY n.id) INTO bad
    FROM news_item n JOIN kyv_0054_target USING (id);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0054: still in news_item: %', bad;
  END IF;

  -- Exactly one pending agent:R3 item for each id that was there.
  SELECT string_agg(p.id::text || ' (' || coalesce(c.n, 0) || ' item(s))', ', ' ORDER BY p.id) INTO bad
    FROM kyv_0054_present p
    LEFT JOIN (SELECT r.payload->>'moved_from_news_item' AS id, count(*) AS n
                 FROM review_item r
                WHERE r.kind = 'manual_news' AND r.source = 'agent:R3' AND r.status = 'pending'
                GROUP BY 1) c ON c.id = p.id::text
   WHERE coalesce(c.n, 0) <> 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '0054: not exactly one pending agent:R3 item for %', bad;
  END IF;

  SELECT count(*) INTO moved FROM kyv_0054_present;
  RAISE NOTICE '0054: moved % row(s) into the review queue', moved;
END $$;

COMMIT;
