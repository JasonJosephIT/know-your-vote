-- 0061_am3_am2_more_sides.sql
-- Adds five sided rows to Amendment 3 (FL-AM3-general) and one to
-- Amendment 2 (FL-AM2-general), both already published, and corrects one
-- AM2 title to its verbatim form. Publishes nothing; writes no
-- measure_publication or admin_action row.
--
-- FOUNDER DECISION, 2026-10-14 ("add for both"), on the two questions 0060
-- left open (docs/general-election/measure-resources-verified-2026-09-24.md,
-- "Rows re-opened for 0060"):
--   AM3. Add FEA's "opposed" listing (0060's decision 4) together with the
--        four already-verified pages that also state an AM3 position: the
--        RPOF release and Palm Beach Examiner (yes), Florida TaxWatch and
--        Amanda Informed (no). All five, so AM3 goes from 2 / 4 to 4 / 7.
--   AM2. Add Your Observer's "Vote yes on Amendment 2" (the page 0060 seeded
--        for AM1 only). AM2 goes from 5 / 4 to 6 / 4.
-- Every page here was already a row for another amendment; this file
-- records the positions each one states on AM3 or AM2 that were never
-- stored (0038 left the RPOF and Palm Beach Examiner AM3 material out as
-- unopened at the time). That is a pipeline gap, fixed on both sides
-- (AGENTS.md, Neutrality).
--
-- ROWS. Each URL was opened on 2026-10-14 (`curl -sIL` for the status
-- chain, a GET of the body) by one reader, then re-fetched by a second
-- reader trying to refute each title, date and quote; none was refuted.
-- Every quote below is verbatim. Each source row already exists (0059,
-- 0060), so each resource resolves its source_id by url_norm.
--
-- FL-AM3-general, support (2)
--   1. Republican Party of Florida, "Florida GOP Officially Endorses
--      Amendments 1 and 3", 2026-09-14 (argument: the party's own release).
--      HTTP 200. "The Florida GOP urges Floridians to vote YES on Amendment
--      1, YES on Amendment 2, and YES on Amendment 3." Its Amendment 3
--      section reprints the 2026 ballot text ($150,000 in 2027, $250,000 in
--      2028). Same title, date and note as 0059's AM1 row.
--      https://florida.gop/florida-gop-officially-endorses-amendments-1-and-3/
--   2. Palm Beach Examiner (Substack), Karl Dickey, "Stop Paying Rent to the
--      State How Florida Amendments 1, 2, and 3 Cut Your Taxes", 2026-08-07
--      (commentary). HTTP 200. "I can tell you that I will be voting YES on
--      all three amendments this coming November." It names AM3 as "SAVE OUR
--      HOMES FROM EXCESSIVE PROPERTY TAXES" with the $150,000 / $250,000
--      figures. Title as <h1>, og:title, JSON-LD and <title> all give it, no
--      colon (same as 0059's AM1 row).
--      https://palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how
--
-- FL-AM3-general, oppose (3)
--   3. Florida Education Association, voter toolkit, section "Constitutional
--      Amendments" (argument: the org's own bare listing, the rule applied
--      to its AM1 and AM2 rows). HTTP 200, undated. "Amendment 3 / OPPOSED
--      BY FEA / Save Our Homes From Excessive Property Taxes", linking the
--      Division of Elections page for the 2026 AM3 (seqnum 110). Same title
--      and note as its AM1 and AM2 rows. The page also carries a hidden 2024
--      "Vote NO on Amendment 1" block (partisan school boards): not the 2026
--      AM1, never quoted.
--      https://feaweb.org/action-center/voter-toolkit/
--   4. Florida TaxWatch, "The Florida Taxpayer's Guide for the 2026
--      Constitutional Amendments", 2026-09-17 (analysis, as its AM1 and AM2
--      rows; F5: analysis may take a side). HTTP 200. "Florida TaxWatch
--      Recommends a “No” Vote on Amendment 3." after its Arguments, Analysis
--      and Conclusion sections. The same page recommends Yes on AM1 and AM2,
--      which its existing rows record.
--      https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/
--   5. Amanda Informed (Substack), "Three Amendments, Three Reasons to Vote
--      No", 2026-09-23 (commentary). HTTP 200. "That is why I am voting no on
--      Amendment 3." Same title, author and date as its AM1 and AM2 rows.
--      https://amandainformed.substack.com/p/three-amendments-three-reasons-to
--
-- FL-AM2-general, support (1)
--   6. Your Observer, Matt Walsh, "Observer recommends: State Amendments 1 &
--      2", 2026-10-07 (commentary, the founder's call for this page on AM1).
--      HTTP 200. Its Amendment 2 section ends "We recommend: Vote yes on
--      Amendment 2" (a no-break space follows the colon on the page). Same
--      title, author, date and note as 0060's AM1 oppose row.
--      https://www.yourobserver.com/news/2026/oct/07/observer-recommends-state-amendments/
--
-- CORRECTION, FL-AM2-general:palmbeachexaminer. 0040 stored its title with
-- a colon ("Stop Paying Rent to the State: How ..."). The page's <h1>,
-- og:title, JSON-LD headline and <title> all read it with no colon, and the
-- string "Stop Paying Rent to the State:" does not occur on the page
-- (2026-10-14). Titles are verbatim, so the AM2 row now matches the page,
-- 0059's AM1 row and row 2 above. 0040's file is left as it is (applied
-- migrations are not edited); a replay of 0040 after this file restores the
-- colon, and re-applying this file corrects it again.
--
-- NOT IN THIS FILE, reported to the founder (found by the same day's sweep
-- of every page already stored, the equal-search-effort step):
--   - LWV of Florida's Vote411 synopsis PDF (already an AM2 row) also lists
--     "League of Women Voters of Florida" among AM3's opponents.
--   - The RPOF release above also urges "YES on Amendment 2" (the body says
--     the party "endorsed Amendment 2 in May of last year").
--   - Your Observer published a separate AM3 editorial on 2026-10-14,
--     "Amendment 3: It's wrong", ending "We recommend: Vote no on
--     Amendment 3".
--   - Unopened leads: two Tampa Bay Times AM3 columns (one yes, one no), a
--     dedicated Palm Beach Examiner AM3 post, a Palm Beach Post AM2 piece.
--   With the three positions above, AM3 would be 4 / 9 and fail the 2x gate
--   (9 > 8), and AM2 7 / 4. Which of them become rows is the founder's call.
--
-- COUNTS AFTER THIS FILE.
--   FL-AM3-general: support 4 (3 argument, 1 commentary), oppose 7 (4
--   argument, 1 analysis, 2 commentary), neutral 9; 20 rows. Gate: both
--   present, 7 <= 2 x 4 = 8, passes.
--   FL-AM2-general: support 6 (3 argument, 1 analysis, 2 commentary),
--   oppose 4 (3 argument, 1 commentary), neutral 9; 19 rows. Gate: 6 <= 2 x
--   4 = 8, passes.
--   FL-AM1-general: unchanged, 4 / 5 / 12, 21 rows.
--   Both measures are published, so anon reads every row at once. 0034's
--   deferred trg_measure_resource_balance checks each published measure's
--   final state at commit; the DO block in (3) names the failing measure
--   first.
--
-- CONVENTIONS (0038/0040/0059/0060): titles verbatim; `note` attribution
-- only (<= 140 chars, none of "would", "will", "means", "because";
-- scripts/verify-measure-resources.ts checks it); display_order continues
-- each measure's side (AM3 support 3-4, AM3 oppose 5-7, AM2 support 6).
--
-- CONTENT FREEZE (0050). From 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC
-- the guard refuses every write to measure_resource. Apply this file BEFORE
-- 2026-10-18 04:00 UTC; then it needs nothing. Inside the window it needs
-- the founder's yes recorded in a correction file and, as this file's first
-- statement,
--   SELECT set_config('kyv.freeze_correction', '<correction file>', true);
--
-- PRECONDITIONS: 0038, 0040, 0059 and 0060 applied (all live since
-- 2026-10-14); the six source rows exist.
--
-- Idempotent: ON CONFLICT (measure_id, source_id) DO UPDATE; the title
-- UPDATE is a no-op the second time.
--
-- READ BACK (read-only), after applying:
--   SELECT measure_id, stance, count(*) FROM measure_resource
--    WHERE measure_id IN ('FL-AM2-general', 'FL-AM3-general')
--    GROUP BY 1, 2 ORDER BY 1, 2;
--     -> FL-AM2-general neutral 9, oppose 4, support 6;
--        FL-AM3-general neutral 9, oppose 7, support 4
--   SELECT measure_id, status, public.measure_sides_balanced(measure_id)
--     FROM measure_publication ORDER BY 1;
--     -> all three published, all three t
--   SELECT title FROM measure_resource
--    WHERE resource_id = 'FL-AM2-general:palmbeachexaminer';
--     -> Stop Paying Rent to the State How Florida Amendments 1, 2, and 3 Cut Your Taxes
--   As anon (SET ROLE anon): FL-AM2-general 19 rows, FL-AM3-general 20.
--
-- ROLLBACK (before the freeze; inside it, a recorded correction):
--   DELETE FROM measure_resource WHERE resource_id IN (
--     'FL-AM3-general:rpof-endorsement', 'FL-AM3-general:palmbeachexaminer',
--     'FL-AM3-general:fea-voter-toolkit', 'FL-AM3-general:taxwatch-guide-2026',
--     'FL-AM3-general:amandainformed', 'FL-AM2-general:yourobserver-recommends');
-- Deleting all six together leaves AM3 at 2 / 4 and AM2 at 5 / 4, both
-- balanced at commit. Leave the title correction in place.

-- (1) Resources. One statement; the deferred trigger checks the end state.
INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM3-general:rpof-endorsement', 'FL-AM3-general',
   (SELECT source_id FROM source WHERE url_norm = 'florida.gop/florida-gop-officially-endorses-amendments-1-and-3'),
   'support', 'argument', 'article',
   'Florida GOP Officially Endorses Amendments 1 and 3', NULL, '2026-09-14', NULL,
   'Republican Party of Florida''s own press release', 3),

  ('FL-AM3-general:palmbeachexaminer', 'FL-AM3-general',
   (SELECT source_id FROM source WHERE url_norm = 'palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how'),
   'support', 'commentary', 'article',
   'Stop Paying Rent to the State How Florida Amendments 1, 2, and 3 Cut Your Taxes', 'Karl Dickey', '2026-08-07', NULL,
   NULL, 4),

  ('FL-AM3-general:fea-voter-toolkit', 'FL-AM3-general',
   (SELECT source_id FROM source WHERE url_norm = 'feaweb.org/action-center/voter-toolkit'),
   'oppose', 'argument', 'document',
   'Constitutional Amendments', NULL, NULL, NULL,
   'Florida Education Association''s own voter toolkit, listing itself as opposed', 5),

  ('FL-AM3-general:taxwatch-guide-2026', 'FL-AM3-general',
   (SELECT source_id FROM source WHERE url_norm = 'floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments'),
   'oppose', 'analysis', 'document',
   'The Florida Taxpayer''s Guide for the 2026 Constitutional Amendments', NULL, '2026-09-17', NULL,
   NULL, 6),

  ('FL-AM3-general:amandainformed', 'FL-AM3-general',
   (SELECT source_id FROM source WHERE url_norm = 'amandainformed.substack.com/p/three-amendments-three-reasons-to'),
   'oppose', 'commentary', 'article',
   'Three Amendments, Three Reasons to Vote No', 'Amanda Informed', '2026-09-23', NULL,
   NULL, 7),

  ('FL-AM2-general:yourobserver-recommends', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.yourobserver.com/news/2026/oct/07/observer-recommends-state-amendments'),
   'support', 'commentary', 'article',
   'Observer recommends: State Amendments 1 & 2', 'Matt Walsh', '2026-10-07', NULL,
   'Your Observer opinion page, by Observer Media Group''s founder and CEO', 6)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;

-- (2) The verbatim-title correction for 0040's AM2 Palm Beach Examiner row.
UPDATE measure_resource
   SET title = 'Stop Paying Rent to the State How Florida Amendments 1, 2, and 3 Cut Your Taxes'
 WHERE resource_id = 'FL-AM2-general:palmbeachexaminer'
   AND title IS DISTINCT FROM 'Stop Paying Rent to the State How Florida Amendments 1, 2, and 3 Cut Your Taxes';

-- (3) The gate, by name, for every published measure: refuse the whole file
--     if any fails "both present, larger <= 2x smaller". The deferred
--     trigger would refuse it at commit too; this says which and why.
DO $$
DECLARE
  m TEXT;
BEGIN
  FOREACH m IN ARRAY ARRAY['FL-AM1-general', 'FL-AM2-general', 'FL-AM3-general'] LOOP
    IF NOT COALESCE(public.measure_sides_balanced(m), false) THEN
      RAISE EXCEPTION '0061: % fails measure_sides_balanced (support %, oppose %)',
        m,
        (SELECT count(*) FROM measure_resource WHERE measure_id = m AND stance = 'support'),
        (SELECT count(*) FROM measure_resource WHERE measure_id = m AND stance = 'oppose');
    END IF;
  END LOOP;
END
$$;
