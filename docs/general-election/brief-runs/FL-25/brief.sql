-- Brief rows for FL-25-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 3 candidate(s). Review before applying.
--
-- 5 source, 12 issue, 23 claim, 20 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":56,"no_issue_matched":12,"no_run":1}
-- FL-DOE-92357: no run, silent on every spine issue: no official_site (spine-roster-2026-10-03.json); founder decision D3: record silence
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
DELETE FROM claim    WHERE race_id = 'FL-25-general';
DELETE FROM position WHERE race_id = 'FL-25-general';
DELETE FROM issue    WHERE race_id = 'FL-25-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-6003a808', 'https://jaredforflorida.com/', 'jaredforflorida.com', 'jaredforflorida.com', 'candidate_self', 'N/A', '2026-09-29T11:43:34Z'),
  ('src-95a5fd5e', 'https://jaredforflorida.com/about', 'jaredforflorida.com/about', 'jaredforflorida.com', 'candidate_self', 'N/A', '2026-09-29T11:43:34Z'),
  ('src-89e8ee23', 'https://www.scottsingerusa.com/', 'www.scottsingerusa.com', 'www.scottsingerusa.com', 'candidate_self', 'N/A', '2026-09-29T11:43:34Z'),
  ('src-4d84dfd8', 'https://www.scottsingerusa.com/priorities', 'www.scottsingerusa.com/priorities', 'www.scottsingerusa.com', 'candidate_self', 'N/A', '2026-09-29T11:43:34Z'),
  ('src-01168b62', 'https://www.scottsingerusa.com/about-scott-singer', 'www.scottsingerusa.com/about-scott-singer', 'www.scottsingerusa.com', 'candidate_self', 'N/A', '2026-09-29T11:43:34Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-25-general--issue-B1', 'FL-25-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-25-general--issue-B2', 'FL-25-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-25-general--issue-B3', 'FL-25-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-25-general--issue-B4', 'FL-25-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-25-general--issue-A1--FL-DOE-88911', 'FL-25-general', 'candidate', 'FL-DOE-88911', 'Property insurance costs', NULL, NULL, 100),
  ('FL-25-general--issue-A4--FL-DOE-88911', 'FL-25-general', 'candidate', 'FL-DOE-88911', 'Cost of living in Florida', NULL, NULL, 101),
  ('FL-25-general--issue-B7--FL-DOE-88911', 'FL-25-general', 'candidate', 'FL-DOE-88911', 'Crime policy, policing and courts', NULL, NULL, 102),
  ('FL-25-general--issue-B7--FL-DOE-89801', 'FL-25-general', 'candidate', 'FL-DOE-89801', 'Crime policy, policing and courts', NULL, NULL, 100),
  ('FL-25-general--issue-KYV2--FL-DOE-89801', 'FL-25-general', 'candidate', 'FL-DOE-89801', 'Energy and utilities', NULL, NULL, 101),
  ('FL-25-general--issue-KYV10--FL-DOE-89801', 'FL-25-general', 'candidate', 'FL-DOE-89801', 'Career, vocational and higher education', NULL, NULL, 102),
  ('FL-25-general--issue-A1--FL-DOE-89801', 'FL-25-general', 'candidate', 'FL-DOE-89801', 'Property insurance costs', NULL, NULL, 103),
  ('FL-25-general--issue-A3--FL-DOE-89801', 'FL-25-general', 'candidate', 'FL-DOE-89801', 'Property taxes', NULL, NULL, 104)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-88911-6cc6771d', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-A1--FL-DOE-88911', 'Cutting property insurance premiums, drug prices, and the everyday costs squeezing South Florida families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-847087b4', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-A4--FL-DOE-88911', 'Cutting property insurance premiums, drug prices, and the everyday costs squeezing South Florida families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-f87837fb', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B2', 'Cutting property insurance premiums, drug prices, and the everyday costs squeezing South Florida families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-d687318a', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B4', 'Fighting every effort to cut, weaken, or privatize the programs seniors earned.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-4a4dbd69', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-A1--FL-DOE-88911', 'In Congress, Jared has stayed focused on what South Florida families actually feel: the cost of living. He authored legislation to cut homeowners'' property insurance premiums, one of the biggest expenses squeezing Florida families, and he is fighting to protect Social Security and Medicare from cuts and to lower health care and prescription drug costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-7d0dc4cc', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-A4--FL-DOE-88911', 'In Congress, Jared has stayed focused on what South Florida families actually feel: the cost of living. He authored legislation to cut homeowners'' property insurance premiums, one of the biggest expenses squeezing Florida families, and he is fighting to protect Social Security and Medicare from cuts and to lower health care and prescription drug costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-9adf0faf', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B2', 'In Congress, Jared has stayed focused on what South Florida families actually feel: the cost of living. He authored legislation to cut homeowners'' property insurance premiums, one of the biggest expenses squeezing Florida families, and he is fighting to protect Social Security and Medicare from cuts and to lower health care and prescription drug costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-32b42d05', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B4', 'In Congress, Jared has stayed focused on what South Florida families actually feel: the cost of living. He authored legislation to cut homeowners'' property insurance premiums, one of the biggest expenses squeezing Florida families, and he is fighting to protect Social Security and Medicare from cuts and to lower health care and prescription drug costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88911-04d33031', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B7--FL-DOE-88911', 'What sets Jared apart is his willingness to stand up to both parties. He said no to Republicans when they threatened Medicare and Medicaid, and no to Democrats who wanted to defund the police. He supports banning members of Congress from trading stocks, because corruption is a problem on both sides, and he has called out issues at FEMA under Republican and Democratic administrations alike. While too many in Washington retreat to their partisan corners, Jared will work with anyone, and stand up to anyone, to deliver for Floridians.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-feab8db3', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B1', 'As Congressman, he will keep taxes and costs low, ensure strong borders and national defense, and cut waste, fraud, and abuse. He will work with President Trump and colleagues in Congress to advance common-sense solutions to improve our economy and protect our nation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-122793c1', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B3', 'As Congressman, he will keep taxes and costs low, ensure strong borders and national defense, and cut waste, fraud, and abuse. He will work with President Trump and colleagues in Congress to advance common-sense solutions to improve our economy and protect our nation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-02ec8c9e', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B3', 'As the inaugural Chair of the America First Policy Institute Mayors’ Council, Scott leads a national group of mayors working to advance America First solutions and improve our cities. Singer has been active in a variety of nonprofit and leadership roles and has earned broad bipartisan support throughout his service. Scott has been a strong voice against antisemitism, and an advocate for stronger national security that safeguards our borders and protects our future. Scott’s family fled communism and he will stand up to far-left proposals to abolish prisons and federal law enforcement or private health care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-4f71d26a', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B7--FL-DOE-89801', 'As the inaugural Chair of the America First Policy Institute Mayors’ Council, Scott leads a national group of mayors working to advance America First solutions and improve our cities. Singer has been active in a variety of nonprofit and leadership roles and has earned broad bipartisan support throughout his service. Scott has been a strong voice against antisemitism, and an advocate for stronger national security that safeguards our borders and protects our future. Scott’s family fled communism and he will stand up to far-left proposals to abolish prisons and federal law enforcement or private health care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-1712d8ec', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B1', 'When in Congress, Scott will work to put into law the many gains from the Trump executive orders that are unleashing our economy so that our families have more opportunity and greater affordability.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-e64a2b24', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B1', 'Scott supports energy independence to advance our economy free from destabilizing foreign influences and to reduce costs for our nation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-80309b5b', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-KYV2--FL-DOE-89801', 'Scott supports energy independence to advance our economy free from destabilizing foreign influences and to reduce costs for our nation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-d805c734', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B1', 'Scott Singer will work to help advance the America First agenda by sponsoring bills to make permanent President Trump''s policies that are unleashing our economy and moving America forward.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-f4e057cb', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B1', 'Scott is a staunch supporter of President Donald J. Trump''s leadership to cut waste and fraud from the budget. In Congress, he will work to help advance the America First agenda by sponsoring laws to make permanent the policies that are unleashing our economy and moving America forward.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-b99f5f81', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-KYV10--FL-DOE-89801', 'Scott supports banning American schools and universities who receive foreign funding for programming from receiving federal dollars.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-d8227a8d', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B7--FL-DOE-89801', 'Scott has always stood with our brave law enforcement officers, funding to ensure the best police professionals, leading to a 25% drop in crime rates when he was mayor – from what were already 40-year lows. Scott stood up to challenge a law that could have had police officers responsible to pay for their own defense even when acting lawfully. At the same time, Scott will protect our Second Amendment rights against attempts to infringe on them. He knows that lawful gun owners deserve our rights and that we need to focus on stopping criminals, greater enforcement of existing laws, and more mental health treatment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-180164b4', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-A1--FL-DOE-89801', 'Scott will push for greater action by Congress to expand insurance programs that will save our taxpayers more of their dollars. This coastal district has unique needs for flooding and windstorms, and Scott will work to increase federal support to lower costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-c3c15697', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B3', 'Scott Singer is an America First Republican running to represent Florida’s 23rd district in Congress. As Congressman, he will keep taxes and costs low, and ensure strong borders and national defense.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89801-b3bd2d67', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-A3--FL-DOE-89801', 'As Mayor of Boca Raton since 2018, Scott has voted consistently to lower the tax rate to ensure Boca Raton has the lowest property tax of any full-service city in Florida. He streamlined and cut red tape, while investing to ensure public safety and infrastructure are priorities. He will defend the U.S. Constitution and ensure unelected bureaucrats will not be able to impose their agendas on the American people. In his time as Mayor, Boca Raton has attracted significant strategic investment as Scott has driven initiative partnerships to advance Boca Raton’s schools, mobility, and economy.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-88911-6cc6771d', source_id FROM source WHERE url_norm = 'jaredforflorida.com'
UNION ALL
  SELECT 'claim-FL-DOE-88911-847087b4', source_id FROM source WHERE url_norm = 'jaredforflorida.com'
UNION ALL
  SELECT 'claim-FL-DOE-88911-f87837fb', source_id FROM source WHERE url_norm = 'jaredforflorida.com'
UNION ALL
  SELECT 'claim-FL-DOE-88911-d687318a', source_id FROM source WHERE url_norm = 'jaredforflorida.com'
UNION ALL
  SELECT 'claim-FL-DOE-88911-4a4dbd69', source_id FROM source WHERE url_norm = 'jaredforflorida.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-88911-7d0dc4cc', source_id FROM source WHERE url_norm = 'jaredforflorida.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-88911-9adf0faf', source_id FROM source WHERE url_norm = 'jaredforflorida.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-88911-32b42d05', source_id FROM source WHERE url_norm = 'jaredforflorida.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-88911-04d33031', source_id FROM source WHERE url_norm = 'jaredforflorida.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-89801-feab8db3', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com'
UNION ALL
  SELECT 'claim-FL-DOE-89801-122793c1', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com'
UNION ALL
  SELECT 'claim-FL-DOE-89801-02ec8c9e', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com'
UNION ALL
  SELECT 'claim-FL-DOE-89801-4f71d26a', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com'
UNION ALL
  SELECT 'claim-FL-DOE-89801-1712d8ec', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-e64a2b24', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-80309b5b', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-d805c734', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-f4e057cb', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-b99f5f81', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-d8227a8d', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-180164b4', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89801-c3c15697', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/about-scott-singer'
UNION ALL
  SELECT 'claim-FL-DOE-89801-b3bd2d67', source_id FROM source WHERE url_norm = 'www.scottsingerusa.com/about-scott-singer'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-88911-0bdd3c5c', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88911-0edd4115', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B2', '', ARRAY['claim-FL-DOE-88911-f87837fb','claim-FL-DOE-88911-9adf0faf']::text[], true, 'stated'),
  ('pos-FL-DOE-88911-0ddd3f82', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88911-08dd37a3', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B4', '', ARRAY['claim-FL-DOE-88911-d687318a','claim-FL-DOE-88911-32b42d05']::text[], true, 'stated'),
  ('pos-FL-DOE-88911-9bd5d047', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-A1--FL-DOE-88911', '', ARRAY['claim-FL-DOE-88911-6cc6771d','claim-FL-DOE-88911-4a4dbd69']::text[], true, 'stated'),
  ('pos-FL-DOE-88911-96d5c868', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-A4--FL-DOE-88911', '', ARRAY['claim-FL-DOE-88911-847087b4','claim-FL-DOE-88911-7d0dc4cc']::text[], true, 'stated'),
  ('pos-FL-DOE-88911-09dd3936', 'FL-DOE-88911', 'FL-25-general', 'FL-25-general--issue-B7--FL-DOE-88911', '', ARRAY['claim-FL-DOE-88911-04d33031']::text[], true, 'stated'),
  ('pos-FL-DOE-89801-0bdd3c5c', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B1', '', ARRAY['claim-FL-DOE-89801-feab8db3','claim-FL-DOE-89801-1712d8ec','claim-FL-DOE-89801-e64a2b24','claim-FL-DOE-89801-d805c734','claim-FL-DOE-89801-f4e057cb']::text[], true, 'stated'),
  ('pos-FL-DOE-89801-0edd4115', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89801-0ddd3f82', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B3', '', ARRAY['claim-FL-DOE-89801-122793c1','claim-FL-DOE-89801-02ec8c9e','claim-FL-DOE-89801-c3c15697']::text[], true, 'stated'),
  ('pos-FL-DOE-89801-08dd37a3', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89801-09dd3936', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-B7--FL-DOE-89801', '', ARRAY['claim-FL-DOE-89801-4f71d26a','claim-FL-DOE-89801-d8227a8d']::text[], true, 'stated'),
  ('pos-FL-DOE-89801-b8b2920d', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-KYV2--FL-DOE-89801', '', ARRAY['claim-FL-DOE-89801-80309b5b']::text[], true, 'stated'),
  ('pos-FL-DOE-89801-6c14946c', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-KYV10--FL-DOE-89801', '', ARRAY['claim-FL-DOE-89801-b99f5f81']::text[], true, 'stated'),
  ('pos-FL-DOE-89801-9bd5d047', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-A1--FL-DOE-89801', '', ARRAY['claim-FL-DOE-89801-180164b4']::text[], true, 'stated'),
  ('pos-FL-DOE-89801-9dd5d36d', 'FL-DOE-89801', 'FL-25-general', 'FL-25-general--issue-A3--FL-DOE-89801', '', ARRAY['claim-FL-DOE-89801-b3bd2d67']::text[], true, 'stated'),
  ('pos-FL-DOE-92357-0bdd3c5c', 'FL-DOE-92357', 'FL-25-general', 'FL-25-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92357-0edd4115', 'FL-DOE-92357', 'FL-25-general', 'FL-25-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92357-0ddd3f82', 'FL-DOE-92357', 'FL-25-general', 'FL-25-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92357-08dd37a3', 'FL-DOE-92357', 'FL-25-general', 'FL-25-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-88911', 'FL-25-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-88911-6cc6771d','claim-FL-DOE-88911-847087b4','claim-FL-DOE-88911-f87837fb','claim-FL-DOE-88911-d687318a','claim-FL-DOE-88911-4a4dbd69','claim-FL-DOE-88911-7d0dc4cc','claim-FL-DOE-88911-9adf0faf','claim-FL-DOE-88911-32b42d05','claim-FL-DOE-88911-04d33031']::text[], ARRAY[]::text[], '{"word_count":363,"verifiable_fact_count":0,"stated_position_count":9,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-DOE-89801', 'FL-25-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89801-feab8db3','claim-FL-DOE-89801-122793c1','claim-FL-DOE-89801-02ec8c9e','claim-FL-DOE-89801-4f71d26a','claim-FL-DOE-89801-1712d8ec','claim-FL-DOE-89801-e64a2b24','claim-FL-DOE-89801-80309b5b','claim-FL-DOE-89801-d805c734','claim-FL-DOE-89801-f4e057cb','claim-FL-DOE-89801-b99f5f81','claim-FL-DOE-89801-d8227a8d','claim-FL-DOE-89801-180164b4','claim-FL-DOE-89801-c3c15697','claim-FL-DOE-89801-b3bd2d67']::text[], ARRAY[]::text[], '{"word_count":718,"verifiable_fact_count":0,"stated_position_count":14,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-DOE-92357', 'FL-25-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-25-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-25-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-25-general, then
-- set_race_publication once a human has read the brief.
