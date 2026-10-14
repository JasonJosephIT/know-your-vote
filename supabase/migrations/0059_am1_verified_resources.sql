-- 0059_am1_verified_resources.sql
-- Seeds Amendment 1's (FL-AM1-general) verified SIDED resources: every
-- support and oppose row that docs/general-election/measure-resources-
-- verified-2026-09-24.md marks as opened and usable and that the live
-- measure_resource table did not hold on 2026-10-14 (read-only check:
-- AM1 had the 0035 booklet row and 0041's 9 neutral rows, 0 sided).
-- Founder, 2026-10-14: seed the 2026-10-12 re-check's Villages-News letter
-- (PR #170) before the content freeze, together with all of AM1's other
-- verified sided rows, so the held measure's stored rows stay balanced.
--
-- AM1 STAYS LISTED. This file never writes measure_publication. While AM1
-- is `listed`, 0041's anon policy shows only `neutral` rows, so these 8
-- rows stay invisible to voters until AM1 is published. There is no
-- set_measure_publication function; a measure is published by a migration
-- with 0040's self-auditing publish block. That publish is a separate
-- founder decision, and its file must sort AFTER this one: 0051 (claimed in
-- the ledger for an AM1 publish) would replay before 0059 on a fresh
-- database, with no sided rows yet, and fail the balance trigger.
--
-- CONTENT FREEZE (0050). From 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC
-- the guard refuses every write to measure_resource. Applying this file
-- inside that window needs a freeze correction: the founder's yes recorded
-- in a correction file (docs/general-election/corrections/README.md, which
-- lists "a newly found statement on an amendment" as NOT a correction, so
-- it is an explicit exception) and, as this file's first statement,
--   SELECT set_config('kyv.freeze_correction', '<correction file>', true);
-- Applied before 2026-10-18 04:00 UTC it needs nothing.
--
-- Spec: docs/superpowers/specs/2026-09-26-amendment-context-design.md §1
-- (inclusion rules, one row per organisation per side, verbatim titles,
-- attribution-only notes) and the ladder spec
-- docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md.
-- Founder rules applied: an organisation's own bare "opposed" listing is
-- `argument` (D2, 2026-09-26); letters to the editor are `commentary`
-- (2026-10-14).
--
-- ROWS. Each was verified on the date shown in the doc, then RE-OPENED
-- 2026-10-14 (curl -sIL for the status chain, then a GET of the body, whose
-- title, date and the quoted text were read off the page). All 8 loaded
-- (HTTP 200; the VOTE411 page answers HEAD with 405 and GET with 200).
--
-- support (4)
--   1. Republican Party of Florida, "Florida GOP Officially Endorses
--      Amendments 1 and 3", 2026-09-14 (argument; press release quoting
--      Chairman Evan Power: "Amendment 1 keeps Florida prepared for storms,
--      emergencies, and downturns without raising taxes.")
--      https://florida.gop/florida-gop-officially-endorses-amendments-1-and-3/
--      verified 2026-09-26 (widened search, row 1); re-opened 2026-10-14.
--   2. Florida TaxWatch, "The Florida Taxpayer's Guide for the 2026
--      Constitutional Amendments", 2026-09-17 (analysis; "Florida TaxWatch
--      Recommends a 'Yes' Vote on Amendment 1.")
--      https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/
--      verified 2026-09-24 (AM1 table, row 5); re-opened 2026-10-14.
--   3. Citrus County Chronicle, letter to the editor signed George Wilson,
--      Homosassa, "A bigger rainy day fund makes sense", 2026-10-02
--      (commentary; "Increasing the rainy day fund ... makes perfect sense.")
--      https://www.chronicleonline.com/opinion/letters_to_editor/a-bigger-rainy-day-fund-makes-sense/article_0b78ca85-1655-582d-bf77-7a05b48d85d0.html
--      verified 2026-10-09 (weekly re-check, row 1); re-opened 2026-10-14.
--   4. Palm Beach Examiner (Substack), Karl Dickey, "Stop Paying Rent to the
--      State How Florida Amendments 1, 2, and 3 Cut Your Taxes", 2026-08-07
--      (commentary; "I will be voting YES on all three amendments")
--      https://palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how
--      verified 2026-09-24 (AM1 table, row 13); re-opened 2026-10-14.
--
-- oppose (4)
--   5. Florida Education Association, voter toolkit, section "Constitutional
--      Amendments", undated (argument; bare listing "Amendment 1 OPPOSED BY
--      FEA Budget Stabilization Fund", no reasons). The same page still
--      carries an older flier "Vote NO on Amendment 1" about a DIFFERENT,
--      prior-cycle school-board amendment; this row is filed on the 2026
--      listing only.
--      https://feaweb.org/action-center/voter-toolkit/
--      verified 2026-09-26 (widened search, row 2); re-opened 2026-10-14.
--   6. League of Women Voters of Florida, VOTE411 guide page "Florida
--      Amendment 1- Budget Stabilization Fund", undated (argument; bare
--      listing "Opponents: Florida Education Association, LWV of Florida"
--      inside an otherwise neutral summary, no reasons).
--      https://onyourballot.vote411.org/race-detail.do?id=71659260
--      verified 2026-09-26 (widened search, row 3); re-opened 2026-10-14.
--   7. Villages-News.com, letter to the editor signed Charlene Griffin,
--      Village of Tamarind Grove, "What is the Budget Stabilization Fund
--      (and why should I care)?", 2026-10-08 (commentary; "that is why I've
--      decided to vote 'no' on Amendment 1"). The 2026-10-12 re-check saw
--      one redirect to an http:// form; on 2026-10-14 the https URL below
--      answered 200 directly.
--      https://www.villages-news.com/2026/10/08/what-is-the-budget-stabilization-fund-and-why-should-i-care/
--      verified 2026-10-12 (weekly re-check, row 1; PR #170); re-opened
--      2026-10-14.
--   8. Amanda Informed (Substack), "Three Amendments, Three Reasons to Vote
--      No", 2026-09-23 (commentary; "That's why I'm voting no on Amendment 1.")
--      https://amandainformed.substack.com/p/three-amendments-three-reasons-to
--      verified 2026-09-24 (AM1 table, row 12); re-opened 2026-10-14.
--
-- TITLES are each page's own headline, re-read 2026-10-14, with a trailing
-- " | Site" / " - Site" suffix stripped and typographic apostrophes written
-- as ASCII (as 0040/0041 do). Two notes:
--   - Palm Beach Examiner: the page's <title>, og:title and <h1> all read
--     "Stop Paying Rent to the State How ..." with NO colon. 0040's AM2 row
--     for the same post carries a colon; this file uses the page's text.
--   - FEA: "Constitutional Amendments" is the page's own section heading
--     (the <title> is "Voter Toolkit"), the same title 0040's AM2 row uses.
--
-- EXCLUDED, even though the doc discusses them:
--   - Sparker's Soapbox (AM1 table, row 14): a both-sides explainer with no
--     stance; `commentary` cannot be neutral and the founder dropped it
--     (2026-09-24 Decisions).
--   - Your Observer, "Observer recommends: State Amendments 1 & 2"
--     (2026-10-07): logged by the 2026-10-12 re-check as blocked, never
--     opened. It opened on 2026-10-14 for the first time and recommends a
--     no vote on Amendment 1, but it is not yet a verified row in the doc
--     and its kind (editorial `argument` or columnist `commentary`) needs a
--     founder call. Not seeded here.
--   - Every position known only through news coverage (Gov. DeSantis, Rich
--     Templin / Florida AFL-CIO, Rep. Driskell, David Jolly, an Albritton
--     quote seen only in a search summary): `reporting` at most, and the
--     opened news rows are already 0041's neutral rows.
--   - Nothing from the "Groups checked, nothing found" lists: no own-words
--     AM1 material exists to seed.
--
-- COUNTS: support 4 (1 argument, 1 analysis, 2 commentary), oppose 4
-- (2 argument, 2 commentary). With 0035's booklet row and 0041's 9 neutral
-- rows, FL-AM1-general stores 18 rows: 4 / 4 / 10. Gate (0034,
-- measure_sides_balanced): both sides present, larger 4 <= 2 x smaller 4,
-- so a later publish would pass the balance trigger. Tier 4 (`argument`)
-- is support 1 (RPOF) vs oppose 2 (FEA, LWV, both bare listings); the only
-- oppose rows giving reasons are the two `commentary` rows (7, 8).
--
-- SOURCE CONVENTIONS (0038/0040/0041): type 'opinion' for a stated
-- position, lean_tag 'unrated' (no lean is assigned to anyone; spec §11 is
-- a separate registry). Four sources already exist since 0040 (TaxWatch,
-- Palm Beach Examiner, FEA, Amanda Informed); they are repeated with 0040's
-- own ids so this file stands alone, and ON CONFLICT (url_norm) DO NOTHING
-- keeps the live rows. Each resource resolves its source_id by url_norm at
-- insert time, so it points at whichever source row actually exists.
-- url_norm follows src/lib/brief-rows.ts's urlNorm().
--
-- `note` is attribution only (<= 140 chars, none of "would", "will",
-- "means", "because"; scripts/verify-measure-resources.ts checks it).
--
-- Idempotent: sources ON CONFLICT (url_norm) DO NOTHING; resources
-- ON CONFLICT (measure_id, source_id) DO UPDATE. A re-run changes nothing
-- unless a row was hand-edited, which it overwrites with this file.
--
-- READ BACK (read-only), after applying:
--   SELECT stance, kind, count(*) FROM measure_resource
--    WHERE measure_id = 'FL-AM1-general' GROUP BY 1, 2 ORDER BY 1, 2;
--     -> neutral analysis 1, neutral official 4, neutral reporting 5,
--        oppose argument 2, oppose commentary 2,
--        support analysis 1, support argument 1, support commentary 2
--   SELECT status FROM measure_publication WHERE measure_id = 'FL-AM1-general';
--     -> listed
--   SELECT public.measure_sides_balanced('FL-AM1-general');  -> true
--   As anon (SET ROLE anon), the same AM1 count is still 10, all neutral.

-- (1) Sources -- one row per outside resource, keyed by url_norm.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_rpof_endorsement_am1_am3',
   'https://florida.gop/florida-gop-officially-endorses-amendments-1-and-3/',
   'florida.gop/florida-gop-officially-endorses-amendments-1-and-3',
   'Republican Party of Florida', 'opinion', 'unrated'),
  ('src_taxwatch_guide_2026',
   'https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/',
   'floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments',
   'Florida TaxWatch', 'opinion', 'unrated'),
  ('src_chronicle_letter_am1',
   'https://www.chronicleonline.com/opinion/letters_to_editor/a-bigger-rainy-day-fund-makes-sense/article_0b78ca85-1655-582d-bf77-7a05b48d85d0.html',
   'www.chronicleonline.com/opinion/letters_to_editor/a-bigger-rainy-day-fund-makes-sense/article_0b78ca85-1655-582d-bf77-7a05b48d85d0.html',
   'Citrus County Chronicle', 'opinion', 'unrated'),
  ('src_palmbeachexaminer_am2',
   'https://palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how',
   'palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how',
   'Palm Beach Examiner (Substack)', 'opinion', 'unrated'),
  ('src_fea_voter_toolkit',
   'https://feaweb.org/action-center/voter-toolkit/',
   'feaweb.org/action-center/voter-toolkit',
   'Florida Education Association', 'opinion', 'unrated'),
  ('src_lwv_vote411_am1',
   'https://onyourballot.vote411.org/race-detail.do?id=71659260',
   'onyourballot.vote411.org/race-detail.do?id=71659260',
   'League of Women Voters of Florida', 'opinion', 'unrated'),
  ('src_villages_news_letter_am1',
   'https://www.villages-news.com/2026/10/08/what-is-the-budget-stabilization-fund-and-why-should-i-care/',
   'www.villages-news.com/2026/10/08/what-is-the-budget-stabilization-fund-and-why-should-i-care',
   'Villages-News.com', 'opinion', 'unrated'),
  ('src_amandainformed_am2',
   'https://amandainformed.substack.com/p/three-amendments-three-reasons-to',
   'amandainformed.substack.com/p/three-amendments-three-reasons-to',
   'Amanda Informed (Substack)', 'opinion', 'unrated')
ON CONFLICT (url_norm) DO NOTHING;

-- (2) Resources -- one row per source, scoped to FL-AM1-general, sided only.
INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM1-general:rpof-endorsement', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'florida.gop/florida-gop-officially-endorses-amendments-1-and-3'),
   'support', 'argument', 'article',
   'Florida GOP Officially Endorses Amendments 1 and 3', NULL, '2026-09-14', NULL,
   'Republican Party of Florida''s own press release', 1),

  ('FL-AM1-general:taxwatch-guide-2026', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments'),
   'support', 'analysis', 'document',
   'The Florida Taxpayer''s Guide for the 2026 Constitutional Amendments', NULL, '2026-09-17', NULL,
   NULL, 2),

  ('FL-AM1-general:chronicle-letter', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.chronicleonline.com/opinion/letters_to_editor/a-bigger-rainy-day-fund-makes-sense/article_0b78ca85-1655-582d-bf77-7a05b48d85d0.html'),
   'support', 'commentary', 'article',
   'A bigger rainy day fund makes sense', 'George Wilson', '2026-10-02', NULL,
   'Letter to the editor, Citrus County Chronicle', 3),

  ('FL-AM1-general:palmbeachexaminer', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how'),
   'support', 'commentary', 'article',
   'Stop Paying Rent to the State How Florida Amendments 1, 2, and 3 Cut Your Taxes', 'Karl Dickey', '2026-08-07', NULL,
   NULL, 4),

  ('FL-AM1-general:fea-voter-toolkit', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'feaweb.org/action-center/voter-toolkit'),
   'oppose', 'argument', 'document',
   'Constitutional Amendments', NULL, NULL, NULL,
   'Florida Education Association''s own voter toolkit, listing itself as opposed', 1),

  ('FL-AM1-general:lwv-vote411', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'onyourballot.vote411.org/race-detail.do?id=71659260'),
   'oppose', 'argument', 'document',
   'Florida Amendment 1- Budget Stabilization Fund', NULL, NULL, NULL,
   'League of Women Voters of Florida''s own VOTE411 guide page, listing itself as opposed', 2),

  ('FL-AM1-general:villages-news-letter', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.villages-news.com/2026/10/08/what-is-the-budget-stabilization-fund-and-why-should-i-care'),
   'oppose', 'commentary', 'article',
   'What is the Budget Stabilization Fund (and why should I care)?', 'Charlene Griffin', '2026-10-08', NULL,
   'Letter to the editor, Villages-News.com', 3),

  ('FL-AM1-general:amandainformed', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'amandainformed.substack.com/p/three-amendments-three-reasons-to'),
   'oppose', 'commentary', 'article',
   'Three Amendments, Three Reasons to Vote No', 'Amanda Informed', '2026-09-23', NULL,
   NULL, 4)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;
