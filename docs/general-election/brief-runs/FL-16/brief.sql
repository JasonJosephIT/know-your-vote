-- Brief rows for FL-16-general, built by scripts/brief-rows-sql.ts.
-- Generated from 3 policy run(s) for 3 candidate(s). Review before applying.
--
-- 3 source, 17 issue, 30 claim, 25 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":142,"no_issue_matched":4}
-- Withheld after review (../withheld-2026-09-30.json): none in this race
--
-- Every claim is stated_position / single_source with a NULL verdict: a Noul
-- scores relevance and cannot adjudicate. Nothing here is a checked fact.
--
-- This drops and rewrites the race's brief rows, INCLUDING the balance
-- verdict in profile.audit. That is deliberate: the content changed, so the
-- old verdict no longer describes it. Re-run the Balance Audit (T10) before
-- publishing — briefs.ts refuses a race whose profiles lack
-- balance_check_passed = true, so the race stays dark until it is re-audited.

BEGIN;

-- Clear this race's prior brief rows (claim_source cascades from claim).
DELETE FROM claim    WHERE race_id = 'FL-16-general';
DELETE FROM position WHERE race_id = 'FL-16-general';
DELETE FROM issue    WHERE race_id = 'FL-16-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-1dae561a', 'https://markdavisforcongress.com/more-about-why', 'markdavisforcongress.com/more-about-why', 'markdavisforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:25Z'),
  ('src-4ad2edcb', 'https://grutersforcongress.com/', 'grutersforcongress.com', 'grutersforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:25Z'),
  ('src-750e3e72', 'https://kellykirschner.com/', 'kellykirschner.com', 'kellykirschner.com', 'candidate_self', 'N/A', '2026-09-29T11:42:25Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-16-general--issue-B1', 'FL-16-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-16-general--issue-B2', 'FL-16-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-16-general--issue-B3', 'FL-16-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-16-general--issue-B4', 'FL-16-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-16-general--issue-KYV10--FL-DOE-89623', 'FL-16-general', 'candidate', 'FL-DOE-89623', 'Career, vocational and higher education', NULL, NULL, 100),
  ('FL-16-general--issue-A4--FL-DOE-90251', 'FL-16-general', 'candidate', 'FL-DOE-90251', 'Cost of living in Florida', NULL, NULL, 100),
  ('FL-16-general--issue-B6--FL-DOE-90251', 'FL-16-general', 'candidate', 'FL-DOE-90251', 'Election integrity', NULL, NULL, 101),
  ('FL-16-general--issue-A2--FL-DOE-90251', 'FL-16-general', 'candidate', 'FL-DOE-90251', 'Housing affordability', NULL, NULL, 102),
  ('FL-16-general--issue-KYV3--FL-DOE-90251', 'FL-16-general', 'candidate', 'FL-DOE-90251', 'Growth, development and land conservation', NULL, NULL, 103),
  ('FL-16-general--issue-A2--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Housing affordability', NULL, NULL, 100),
  ('FL-16-general--issue-KYV6--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Renters and evictions', NULL, NULL, 101),
  ('FL-16-general--issue-B8--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Climate and environment (national)', NULL, NULL, 102),
  ('FL-16-general--issue-KYV3--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Growth, development and land conservation', NULL, NULL, 103),
  ('FL-16-general--issue-KYV2--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Energy and utilities', NULL, NULL, 104),
  ('FL-16-general--issue-KYV5--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Water supply and drinking water', NULL, NULL, 105),
  ('FL-16-general--issue-KYV4--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Storm resilience and flood protection', NULL, NULL, 106),
  ('FL-16-general--issue-KYV10--FL-DOE-90779', 'FL-16-general', 'candidate', 'FL-DOE-90779', 'Career, vocational and higher education', NULL, NULL, 107)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-89623-605b7bc0', 'FL-DOE-89623', 'FL-16-general', 'FL-16-general--issue-KYV10--FL-DOE-89623', '• Free public college and trade school...because debt shouldn’t be the price of opportunity', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90251-44084951', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-A4--FL-DOE-90251', '“As a dedicated civic leader, public servant, and most importantly as a mother, I understand what’s at stake. We must do everything we can to defend our American way of life. I will fight for the real issues that affect everyday working Americans and together we will MAKE AMERICA GREAT AGAIN! President Trump trusts me to work to lower the cost of living, cut taxes and regulations, and protect affordability for Southwest Florida families! "', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90251-f48dcb55', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B1', '“As a dedicated civic leader, public servant, and most importantly as a mother, I understand what’s at stake. We must do everything we can to defend our American way of life. I will fight for the real issues that affect everyday working Americans and together we will MAKE AMERICA GREAT AGAIN! President Trump trusts me to work to lower the cost of living, cut taxes and regulations, and protect affordability for Southwest Florida families! "', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90251-d60833d4', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B3', 'Sydney will work with President Trump and ICE to keep our families safe from violent criminals entering our country illegally.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90251-993fd70c', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B6--FL-DOE-90251', 'Sydney is ready to fight for Democracy and stand with President Trump to ensure our elections are secure.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90251-5cff7e79', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-A2--FL-DOE-90251', 'Sydney will fight to curb overdevelopment and keep homeownership within reach for working families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90251-05308259', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-KYV3--FL-DOE-90251', 'Sydney will fight to curb overdevelopment and keep homeownership within reach for working families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90251-04879c7f', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B4', 'Sydney will strengthen veterans’ benefits and protect Social Security and Medicare so seniors and those who served can retire with security and peace of mind.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-c322f6e9', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B2', 'Washington has been sold. It''s time to take it back. Kelly is running for Congress to lower costs, defend health care, and bring opportunity home to the Gulf Coast.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-c4aefbe7', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B2', 'Government is supposed to solve problems for the people it serves. My first priority is, lowering the cost of living for Gulf Coast families — and protecting the healthcare and retirement security you’ve already earned. On day one, I will get to work on:', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-4a591921', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B2', 'Lowering insurance, healthcare, and prescription drug costs by creating an insurance backstop, repeal cuts to Medicare and Medicaid, and allow government to negotiate for lower prescription drug prices.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-9b0fdd97', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B4', 'Lowering insurance, healthcare, and prescription drug costs by creating an insurance backstop, repeal cuts to Medicare and Medicaid, and allow government to negotiate for lower prescription drug prices.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-f6ca139d', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-A2--FL-DOE-90779', 'Expand affordable housing and stop Wall Street from buying up single-family homes and gouging renters.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-966c0e84', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV6--FL-DOE-90779', 'Expand affordable housing and stop Wall Street from buying up single-family homes and gouging renters.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-175c6349', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B2', 'Protect people with pre-existing conditions, and keep Social Security, Medicare, and Medicaid, the promises they’ve always been – an earned right.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-8d669fdf', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B4', 'Protect people with pre-existing conditions, and keep Social Security, Medicare, and Medicaid, the promises they’ve always been – an earned right.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-5319509e', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B8--FL-DOE-90779', 'Protect Tampa Bay, Sarasota Bay, and our coastline by prohibiting offshore drilling, stopping open-water fish farming, and enforcing the Clean Water Act.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-d56db86c', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B8--FL-DOE-90779', 'Keep public lands public. Invest in more conservation land upstream to protect our water and wildlife, and stop the push to privatize state and federal lands for golf courses, development, and additional resource extraction.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-34185b3f', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV3--FL-DOE-90779', 'Keep public lands public. Invest in more conservation land upstream to protect our water and wildlife, and stop the push to privatize state and federal lands for golf courses, development, and additional resource extraction.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-3db19630', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B8--FL-DOE-90779', 'Hold phosphate companies accountable and strengthen clean air protections, so toxic waste and dirty air don’t become the taxpayers’ cleanup bill.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-632741bb', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV2--FL-DOE-90779', 'Keep AI hyperscale data centers out of District 16 until they prove they won’t drain our aquifers, raise utility costs, contaminate our air, or override local control.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-1582c2ce', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV3--FL-DOE-90779', 'Keep AI hyperscale data centers out of District 16 until they prove they won’t drain our aquifers, raise utility costs, contaminate our air, or override local control.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-a7e0c368', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV5--FL-DOE-90779', 'Keep AI hyperscale data centers out of District 16 until they prove they won’t drain our aquifers, raise utility costs, contaminate our air, or override local control.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-ff28f1d1', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV3--FL-DOE-90779', 'Fix stormwater systems and stop rewarding the kind of overdevelopment that causes flooding and polluted runoff', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-c4d59572', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV4--FL-DOE-90779', 'Fix stormwater systems and stop rewarding the kind of overdevelopment that causes flooding and polluted runoff', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-4106d372', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV10--FL-DOE-90779', 'Restore the workforce opportunities our Manasota region lost by supporting nursing, teacher preparation, veterans’ education, workforce training, apprenticeships, and affordable four-year degree pathways.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-fa3a9102', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B1', 'Restore the workforce opportunities our Manasota region lost by supporting nursing, teacher preparation, veterans’ education, workforce training, apprenticeships, and affordable four-year degree pathways.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-79c76ad3', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV2--FL-DOE-90779', 'Support affordable, reliable alternative energy that lowers utility bills, strengthens our electric grid, and gives families and businesses more certainty.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-b0690ebc', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B2', 'Protect every patient with a pre-existing condition.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90779-f097046a', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV4--FL-DOE-90779', 'A fully funded, proactive FEMA so that when hurricanes strike, our region isn’t left waiting for help.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-89623-605b7bc0', source_id FROM source WHERE url_norm = 'markdavisforcongress.com/more-about-why'
UNION ALL
  SELECT 'claim-FL-DOE-90251-44084951', source_id FROM source WHERE url_norm = 'grutersforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90251-f48dcb55', source_id FROM source WHERE url_norm = 'grutersforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90251-d60833d4', source_id FROM source WHERE url_norm = 'grutersforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90251-993fd70c', source_id FROM source WHERE url_norm = 'grutersforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90251-5cff7e79', source_id FROM source WHERE url_norm = 'grutersforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90251-05308259', source_id FROM source WHERE url_norm = 'grutersforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90251-04879c7f', source_id FROM source WHERE url_norm = 'grutersforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-c322f6e9', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-c4aefbe7', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-4a591921', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-9b0fdd97', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-f6ca139d', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-966c0e84', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-175c6349', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-8d669fdf', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-5319509e', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-d56db86c', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-34185b3f', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-3db19630', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-632741bb', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-1582c2ce', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-a7e0c368', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-ff28f1d1', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-c4d59572', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-4106d372', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-fa3a9102', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-79c76ad3', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-b0690ebc', source_id FROM source WHERE url_norm = 'kellykirschner.com'
UNION ALL
  SELECT 'claim-FL-DOE-90779-f097046a', source_id FROM source WHERE url_norm = 'kellykirschner.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89623-0bdd3c5c', 'FL-DOE-89623', 'FL-16-general', 'FL-16-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89623-0edd4115', 'FL-DOE-89623', 'FL-16-general', 'FL-16-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89623-0ddd3f82', 'FL-DOE-89623', 'FL-16-general', 'FL-16-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89623-08dd37a3', 'FL-DOE-89623', 'FL-16-general', 'FL-16-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89623-6c14946c', 'FL-DOE-89623', 'FL-16-general', 'FL-16-general--issue-KYV10--FL-DOE-89623', '', ARRAY['claim-FL-DOE-89623-605b7bc0']::text[], true, 'stated'),
  ('pos-FL-DOE-90251-0bdd3c5c', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B1', '', ARRAY['claim-FL-DOE-90251-f48dcb55']::text[], true, 'stated'),
  ('pos-FL-DOE-90251-0edd4115', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90251-0ddd3f82', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B3', '', ARRAY['claim-FL-DOE-90251-d60833d4']::text[], true, 'stated'),
  ('pos-FL-DOE-90251-08dd37a3', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B4', '', ARRAY['claim-FL-DOE-90251-04879c7f']::text[], true, 'stated'),
  ('pos-FL-DOE-90251-96d5c868', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-A4--FL-DOE-90251', '', ARRAY['claim-FL-DOE-90251-44084951']::text[], true, 'stated'),
  ('pos-FL-DOE-90251-0add3ac9', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-B6--FL-DOE-90251', '', ARRAY['claim-FL-DOE-90251-993fd70c']::text[], true, 'stated'),
  ('pos-FL-DOE-90251-9cd5d1da', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-A2--FL-DOE-90251', '', ARRAY['claim-FL-DOE-90251-5cff7e79']::text[], true, 'stated'),
  ('pos-FL-DOE-90251-b7b2907a', 'FL-DOE-90251', 'FL-16-general', 'FL-16-general--issue-KYV3--FL-DOE-90251', '', ARRAY['claim-FL-DOE-90251-05308259']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-0bdd3c5c', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B1', '', ARRAY['claim-FL-DOE-90779-fa3a9102']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-0edd4115', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B2', '', ARRAY['claim-FL-DOE-90779-c322f6e9','claim-FL-DOE-90779-c4aefbe7','claim-FL-DOE-90779-4a591921','claim-FL-DOE-90779-175c6349','claim-FL-DOE-90779-b0690ebc']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-0ddd3f82', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90779-08dd37a3', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B4', '', ARRAY['claim-FL-DOE-90779-9b0fdd97','claim-FL-DOE-90779-8d669fdf']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-9cd5d1da', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-A2--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-f6ca139d']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-b4b28bc1', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV6--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-966c0e84']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-14dd4a87', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-B8--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-5319509e','claim-FL-DOE-90779-d56db86c','claim-FL-DOE-90779-3db19630']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-b7b2907a', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV3--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-34185b3f','claim-FL-DOE-90779-1582c2ce','claim-FL-DOE-90779-ff28f1d1']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-b8b2920d', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV2--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-632741bb','claim-FL-DOE-90779-79c76ad3']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-b1b28708', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV5--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-a7e0c368']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-b2b2889b', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV4--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-c4d59572','claim-FL-DOE-90779-f097046a']::text[], true, 'stated'),
  ('pos-FL-DOE-90779-6c14946c', 'FL-DOE-90779', 'FL-16-general', 'FL-16-general--issue-KYV10--FL-DOE-90779', '', ARRAY['claim-FL-DOE-90779-4106d372']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89623', 'FL-16-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89623-605b7bc0']::text[], ARRAY[]::text[], '{"word_count":14,"verifiable_fact_count":0,"stated_position_count":1,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-90251', 'FL-16-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90251-44084951','claim-FL-DOE-90251-f48dcb55','claim-FL-DOE-90251-d60833d4','claim-FL-DOE-90251-993fd70c','claim-FL-DOE-90251-5cff7e79','claim-FL-DOE-90251-05308259','claim-FL-DOE-90251-04879c7f']::text[], ARRAY[]::text[], '{"word_count":241,"verifiable_fact_count":0,"stated_position_count":7,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-90779', 'FL-16-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90779-c322f6e9','claim-FL-DOE-90779-c4aefbe7','claim-FL-DOE-90779-4a591921','claim-FL-DOE-90779-9b0fdd97','claim-FL-DOE-90779-f6ca139d','claim-FL-DOE-90779-966c0e84','claim-FL-DOE-90779-175c6349','claim-FL-DOE-90779-8d669fdf','claim-FL-DOE-90779-5319509e','claim-FL-DOE-90779-d56db86c','claim-FL-DOE-90779-34185b3f','claim-FL-DOE-90779-3db19630','claim-FL-DOE-90779-632741bb','claim-FL-DOE-90779-1582c2ce','claim-FL-DOE-90779-a7e0c368','claim-FL-DOE-90779-ff28f1d1','claim-FL-DOE-90779-c4d59572','claim-FL-DOE-90779-4106d372','claim-FL-DOE-90779-fa3a9102','claim-FL-DOE-90779-79c76ad3','claim-FL-DOE-90779-b0690ebc','claim-FL-DOE-90779-f097046a']::text[], ARRAY[]::text[], '{"word_count":515,"verifiable_fact_count":0,"stated_position_count":22,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb)
ON CONFLICT (candidate_id, race_id) DO UPDATE SET
  facts = EXCLUDED.facts, positions = EXCLUDED.positions,
  opinions = EXCLUDED.opinions, audit = EXCLUDED.audit;

-- Sanity: every ballot candidate in the race must have a profile, or the race
-- cannot publish. Fails the transaction rather than leaving a half-built race.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c.candidate_id, ', ') INTO missing
  FROM race r, unnest(r.candidate_ids) cid
  JOIN candidate c ON c.candidate_id = cid
  WHERE r.race_id = 'FL-16-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-16-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-16-general, then
-- set_race_publication once a human has read the brief.
