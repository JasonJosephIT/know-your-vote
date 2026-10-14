-- 0060_am1_publish.sql
-- Adds three rows to Amendment 1 (FL-AM1-general), then PUBLISHES it, so
-- its support and oppose rows (0059) become readable to voters.
--
-- FOUNDER DECISIONS, 2026-10-14 (all approved):
--   1. Publish AM1 before the content freeze, through the same door 0038
--      and 0040 used.
--   2. Add the Your Observer piece to AM1 as oppose / commentary, if it
--      still opens and still recommends No on AM1. Not an AM2 row from it.
--   3. Add the two verified neutral reporting rows from the 2026-10-09
--      re-check (Florida Politics on David Jolly, WPTV's AM1-AM2 explainer).
--   4. Add FEA's voter toolkit to Amendment 3 as oppose / argument, if the
--      page still lists AM3 as opposed and AM3's gate stays balanced.
--      NOT SEEDED: see EXCLUDED below.
--
-- THE DOOR. measure_publication has no door function (the only one is
-- set_race_publication, for races; read live 2026-10-14). A measure is
-- published by 0038's self-auditing block: a CTE reads the prior status,
-- UPSERTs the row to `published` and writes one admin_action row
-- ('founder', 'publish', 'measure_publication', <measure_id>) only when
-- the status actually changes, so a re-run logs nothing. Section (4) below
-- is that block, unchanged apart from the measure and the reason.
--
-- ROWS. Each URL was opened on 2026-10-14: `curl -sIL` for the status
-- chain, then a GET of the body, with the title, date, author and the
-- quoted text read off the page.
--
-- oppose (1)
--   1. Your Observer, "Observer recommends: State Amendments 1 & 2",
--      2026-10-07, by Matt Walsh ("the CEO and founder of Observer Media
--      Group", per the page). Commentary (founder, decision 2). HTTP 200.
--      Its Amendment 1 section ends "We recommend: Vote no on Amendment 1".
--      Title from the page's <h1>; the <title> adds "Opinion: " in front
--      and " | Your Observer" after. Date from article:published_time
--      (2026-10-07T05:00:00-04:00).
--      https://www.yourobserver.com/news/2026/oct/07/observer-recommends-state-amendments/
--
-- neutral (2)
--   2. Florida Politics, A.G. Gancarski, "Amendment 1 scrambles traditional
--      partisan lines, pitting David Jolly and the Florida GOP against Ron
--      DeSantis", 2026-10-03 (reporting). HTTP 200 with a plain
--      "Mozilla/5.0" user agent; a full desktop-Chrome user agent gets
--      Cloudflare's 403 "Update Browser Required" page. Reports Jolly's
--      support ("I support raising that cap."), RPOF chair Evan Power's
--      support and Gov. DeSantis's opposition, each in their own words.
--      Title from og:title and <h1>; date and author from JSON-LD.
--      https://floridapolitics.com/archives/823095-a1-jolly-floridagop-desantis/
--   3. WPTV, Scott Sutton, "Amendments 1 & 2: Lesser-known Florida ballot
--      amendments focus on state reserves, farm tax breaks", 2026-10-08
--      (reporting). HTTP 200. Explainer giving both sides unnamed:
--      "Supporters say the amendment would strengthen Florida's financial
--      position ..." and "Opponents, however, argue that setting aside
--      additional money in reserves could limit the state's ability to
--      address immediate needs ...". Title from <h1>, og:title and JSON-LD
--      headline; the <title> tag is a different SEO line ("Amendments 1 &
--      2: What to know about these lesser-known ballot measures", the
--      embedded video's caption). Date from JSON-LD datePublished.
--      https://www.wptv.com/news/political/elections-local/amendments-1-2-lesser-known-florida-ballot-amendments-focus-on-state-reserves-farm-tax-breaks
--
-- EXCLUDED, reported to the founder, not seeded:
--   - Your Observer on Amendment 2. The same page ends its Amendment 2
--     section "We recommend: Vote yes on Amendment 2". That is a clear AM2
--     recommendation, but decision 2 covers AM1 only; an AM2 row needs the
--     founder.
--   - FEA voter toolkit on Amendment 3 (decision 4). The page still lists
--     "Amendment 3 / OPPOSED BY FEA / Save Our Homes From Excessive
--     Property Taxes" (HTTP 200, 2026-10-14), a bare listing like its AM1
--     and AM2 rows. But AM3 is published with 2 support and 4 oppose rows
--     (read live 2026-10-14). A fifth oppose row makes it 2 vs 5, and 5 >
--     2 x 2, so measure_sides_balanced('FL-AM3-general') turns false and
--     0034's deferred trigger refuses the commit. The founder's condition
--     ("check that AM3's gate stays balanced") fails, so the row is left
--     out. Padding AM3's support side to make room is not done here
--     (AGENTS.md, Neutrality): which further AM3 rows are owed is the
--     founder's call.
--
-- COUNTS AFTER THIS FILE.
--   FL-AM1-general: support 4 (1 argument, 1 analysis, 2 commentary),
--   oppose 5 (2 argument, 3 commentary), neutral 12 (4 official, 1
--   analysis, 7 reporting); 21 rows. Gate: both present, 5 <= 2 x 4 = 8,
--   passes. Status `published`; anon reads all 21.
--   FL-AM3-general: unchanged, support 2, oppose 4, neutral 9; 15 rows.
--   Gate: 4 <= 2 x 2 = 4, passes (at the boundary).
--
-- SOURCE CONVENTIONS (0038/0040/0041/0059): type 'opinion' for a stated
-- position, 'factual_reporting' for straight news; lean_tag 'unrated' (no
-- lean is assigned to anyone; spec §11 is a separate registry). None of the
-- three URLs had a source row live on 2026-10-14, and none of the three
-- source_ids below was taken. Each resource still resolves its source_id by
-- url_norm at insert time. url_norm follows src/lib/brief-rows.ts's
-- urlNorm(). `note` is attribution only (<= 140 chars, none of "would",
-- "will", "means", "because"; scripts/verify-measure-resources.ts checks
-- it).
--
-- CONTENT FREEZE (0050). From 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC
-- the guard refuses every write to measure_resource and every write to
-- measure_publication except an UPDATE to `listed` (a takedown). Apply
-- this file BEFORE 2026-10-18 04:00 UTC; then it needs nothing. Applied
-- inside the window it needs a freeze correction: the founder's yes
-- recorded in a correction file (docs/general-election/corrections/
-- README.md; publishing a held measure is not a correction, so it is an
-- explicit exception) and, as this file's first statement,
--   SELECT set_config('kyv.freeze_correction', '<correction file>', true);
--
-- PRECONDITIONS: 0041 and 0059 applied (both live since 2026-10-14). AM1
-- `listed` with 4 support / 4 oppose rows before this file runs.
--
-- Idempotent: sources ON CONFLICT (url_norm) DO NOTHING; resources
-- ON CONFLICT (measure_id, source_id) DO UPDATE; the publish UPSERT only
-- raises the status and logs only a change, so a re-run writes no second
-- admin_action row.
--
-- READ BACK (read-only), after applying:
--   SELECT stance, kind, count(*) FROM measure_resource
--    WHERE measure_id = 'FL-AM1-general' GROUP BY 1, 2 ORDER BY 1, 2;
--     -> neutral analysis 1, neutral official 4, neutral reporting 7,
--        oppose argument 2, oppose commentary 3,
--        support analysis 1, support argument 1, support commentary 2
--   SELECT measure_id, status, published_at IS NOT NULL AS stamped,
--          public.measure_sides_balanced(measure_id) AS balanced
--     FROM measure_publication ORDER BY 1;
--     -> FL-AM1-general published t t; FL-AM2-general published t t;
--        FL-AM3-general published t t
--   SELECT actor, action, subject_ref, detail FROM admin_action
--    WHERE subject_kind = 'measure_publication' AND subject_ref = 'FL-AM1-general'
--    ORDER BY created_at;
--     -> list (0033's listing, 2026-09-23), then one publish row with
--        prior_status listed, new_status published
--   SELECT stance, count(*) FROM measure_resource
--    WHERE measure_id = 'FL-AM3-general' GROUP BY 1 ORDER BY 1;
--     -> neutral 9, oppose 4, support 2 (unchanged)
--   As anon (SET ROLE anon), FL-AM1-general's count is 21, of which 4
--   support and 5 oppose.
--
-- ROLLBACK. Inside the freeze the UPDATE to `listed` goes through on its
-- own (0050's takedown exception); the DELETE needs a recorded correction.
-- admin_action is append-only, so a rollback logs its own 'unpublish' row
-- rather than deleting the 'publish' one; published_at is kept, as
-- set_race_publication keeps it when a race leaves publication:
--   WITH prior AS (
--     SELECT status FROM measure_publication WHERE measure_id = 'FL-AM1-general'
--   ), moved AS (
--     UPDATE measure_publication SET status = 'listed'
--      WHERE measure_id = 'FL-AM1-general' AND status = 'published'
--     RETURNING measure_id, status
--   )
--   INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
--   SELECT 'founder', 'unpublish', 'measure_publication', m.measure_id,
--          jsonb_build_object('prior_status', p.status, 'new_status', m.status,
--                             'reason', '<why>')
--     FROM moved m LEFT JOIN prior p ON true;
--   DELETE FROM measure_resource WHERE resource_id IN (
--     'FL-AM1-general:yourobserver-recommends',
--     'FL-AM1-general:floridapolitics-jolly',
--     'FL-AM1-general:wptv-explainer');
-- The three source rows can stay (nothing else cites them; an uncited
-- source row is harmless). Unpublish FIRST: with AM1 published, deleting
-- the Observer row leaves 4 vs 4, which the trigger allows, but the order
-- above never depends on that.

-- (1) Sources -- one row per outside resource, keyed by url_norm.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_yourobserver_recommends_am1',
   'https://www.yourobserver.com/news/2026/oct/07/observer-recommends-state-amendments/',
   'www.yourobserver.com/news/2026/oct/07/observer-recommends-state-amendments',
   'Your Observer', 'opinion', 'unrated'),
  ('src_floridapolitics_jolly_am1',
   'https://floridapolitics.com/archives/823095-a1-jolly-floridagop-desantis/',
   'floridapolitics.com/archives/823095-a1-jolly-floridagop-desantis',
   'Florida Politics', 'factual_reporting', 'unrated'),
  ('src_wptv_am1_am2_explainer',
   'https://www.wptv.com/news/political/elections-local/amendments-1-2-lesser-known-florida-ballot-amendments-focus-on-state-reserves-farm-tax-breaks',
   'www.wptv.com/news/political/elections-local/amendments-1-2-lesser-known-florida-ballot-amendments-focus-on-state-reserves-farm-tax-breaks',
   'WPTV', 'factual_reporting', 'unrated')
ON CONFLICT (url_norm) DO NOTHING;

-- (2) Resources -- scoped to FL-AM1-general. Neutral display orders 10-11
--     follow 0041's 1-9; the oppose row's 5 follows 0059's 1-4.
INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM1-general:yourobserver-recommends', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.yourobserver.com/news/2026/oct/07/observer-recommends-state-amendments'),
   'oppose', 'commentary', 'article',
   'Observer recommends: State Amendments 1 & 2', 'Matt Walsh', '2026-10-07', NULL,
   'Your Observer opinion page, by Observer Media Group''s founder and CEO', 5),

  ('FL-AM1-general:floridapolitics-jolly', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'floridapolitics.com/archives/823095-a1-jolly-floridagop-desantis'),
   'neutral', 'reporting', 'article',
   'Amendment 1 scrambles traditional partisan lines, pitting David Jolly and the Florida GOP against Ron DeSantis', 'A.G. Gancarski', '2026-10-03', NULL,
   NULL, 10),

  ('FL-AM1-general:wptv-explainer', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.wptv.com/news/political/elections-local/amendments-1-2-lesser-known-florida-ballot-amendments-focus-on-state-reserves-farm-tax-breaks'),
   'neutral', 'reporting', 'article',
   'Amendments 1 & 2: Lesser-known Florida ballot amendments focus on state reserves, farm tax breaks', 'Scott Sutton', '2026-10-08', NULL,
   NULL, 11)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;

-- (3) The gate, checked by name before anything is published: refuse the
--     whole file if AM1 or AM3 fails "both present, larger <= 2x smaller".
--     The triggers would refuse an unbalanced publish too; this says which
--     measure and why, before the publish block runs.
DO $$
DECLARE
  m TEXT;
BEGIN
  FOREACH m IN ARRAY ARRAY['FL-AM1-general', 'FL-AM3-general'] LOOP
    IF NOT COALESCE(public.measure_sides_balanced(m), false) THEN
      RAISE EXCEPTION '0060: % fails measure_sides_balanced (support %, oppose %)',
        m,
        (SELECT count(*) FROM measure_resource WHERE measure_id = m AND stance = 'support'),
        (SELECT count(*) FROM measure_resource WHERE measure_id = m AND stance = 'oppose');
    END IF;
  END LOOP;
END
$$;

-- (4) Publish AM1 through the door, with its admin_action audit row written
--     in the SAME statement (0038/0040's block). 4 support, 5 oppose;
--     5 <= 2x4, so 0034's trg_measure_balance accepts it. AM2 and AM3 are
--     untouched. On production AM1 is `listed` (prior_status 'listed'); on
--     a fresh replay it has no row yet (prior_status NULL).
WITH prior AS (
  SELECT status FROM measure_publication WHERE measure_id = 'FL-AM1-general'
), upserted AS (
  INSERT INTO measure_publication (measure_id, status, published_at, note)
  VALUES (
    'FL-AM1-general', 'published', now(),
    'Amendment 1 published by the founder, 2026-10-14 (0060): 4 support and 5 '
    'oppose rows from row-by-row verification (0059, 0060). AM2 and AM3 were '
    'already published by 0040 and 0038.'
  )
  ON CONFLICT (measure_id) DO UPDATE SET
    status = 'published',
    published_at = COALESCE(measure_publication.published_at, EXCLUDED.published_at),
    note = EXCLUDED.note
  RETURNING measure_id, status
), logged AS (
  INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
  SELECT 'founder', 'publish', 'measure_publication', u.measure_id,
         jsonb_build_object(
           'prior_status', p.status,
           'new_status',   u.status,
           'reason',       'Founder decision 2026-10-14: publish Amendment 1 before the content freeze, '
                           '4 support / 5 oppose verified rows (0059, 0060)'
         )
    FROM upserted u
    LEFT JOIN prior p ON true
   WHERE p.status IS DISTINCT FROM u.status
  RETURNING 1
)
SELECT 1;
