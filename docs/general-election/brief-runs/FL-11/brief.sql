-- Brief rows for FL-11-general, built by scripts/brief-rows-sql.ts.
-- Generated from 3 policy run(s) for 3 candidate(s). Review before applying.
--
-- 3 source, 12 issue, 14 claim, 20 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":180,"no_issue_matched":9}
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
DELETE FROM claim    WHERE race_id = 'FL-11-general';
DELETE FROM position WHERE race_id = 'FL-11-general';
DELETE FROM issue    WHERE race_id = 'FL-11-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-eff9cd98', 'https://www.grovesforcongress.com/my-mission', 'www.grovesforcongress.com/my-mission', 'www.grovesforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:11Z'),
  ('src-31e4af87', 'https://www.grovesforcongress.com/meet-ralph-groves', 'www.grovesforcongress.com/meet-ralph-groves', 'www.grovesforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:11Z'),
  ('src-77c70e9f', 'https://jamespericola.com/', 'jamespericola.com', 'jamespericola.com', 'candidate_self', 'N/A', '2026-09-29T11:42:11Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-11-general--issue-B1', 'FL-11-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-11-general--issue-B2', 'FL-11-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-11-general--issue-B3', 'FL-11-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-11-general--issue-B4', 'FL-11-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-11-general--issue-B5--FL-DOE-88517', 'FL-11-general', 'candidate', 'FL-DOE-88517', 'Abortion policy', NULL, NULL, 100),
  ('FL-11-general--issue-KYV9--FL-DOE-88517', 'FL-11-general', 'candidate', 'FL-DOE-88517', 'School choice and vouchers', NULL, NULL, 101),
  ('FL-11-general--issue-B7--FL-DOE-88517', 'FL-11-general', 'candidate', 'FL-DOE-88517', 'Crime policy, policing and courts', NULL, NULL, 102),
  ('FL-11-general--issue-KYV5--FL-DOE-88517', 'FL-11-general', 'candidate', 'FL-DOE-88517', 'Water supply and drinking water', NULL, NULL, 103),
  ('FL-11-general--issue-A1--FL-DOE-91715', 'FL-11-general', 'candidate', 'FL-DOE-91715', 'Property insurance costs', NULL, NULL, 100),
  ('FL-11-general--issue-A2--FL-DOE-91715', 'FL-11-general', 'candidate', 'FL-DOE-91715', 'Housing affordability', NULL, NULL, 101),
  ('FL-11-general--issue-A7--FL-DOE-91715', 'FL-11-general', 'candidate', 'FL-DOE-91715', 'Elections administration and voting access', NULL, NULL, 102),
  ('FL-11-general--issue-KYV1--FL-DOE-91715', 'FL-11-general', 'candidate', 'FL-DOE-91715', 'Threats to democratic institutions', NULL, NULL, 103)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-88517-53162ec9', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B5--FL-DOE-88517', '❖ Pro-life. Ralph Groves believes in encouraging a culture of life to protect babies and eliminate human trafficking, especially sexual exploitation. A culture of life should encourage women to keep and nurture their babies with help from private and Church-related pro-life agencies. Such agencies that help pregnant women and mothers of newborns should be protected. In extreme cases, abortion should be decided by women and their doctors, not government. Government exclusion from abortion means no government funding for Planned Parenthood. For the safety of women, rare abortions should be done in hospitals, not in outside clinics.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88517-295f33ba', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B3', '❖ Pro-legal immigration. Ralph Groves’ mother was an immigrant. He believes legal, regulated immigration boosts our economy and bolsters our population, which otherwise would be in decline. Contrariwise, illegal and unregulated migration stresses our communities, hospitals, and schools. He believes in simplified, reasonable immigration processes to enhance legal, regulated immigration.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88517-8a1000ba', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-KYV9--FL-DOE-88517', '❖ Ralph Groves applauds the abolition of the Federal Department of Education. Each state, including Florida, should manage education without Federal Government regulations. In addition, a broad range of options should be available to parents, including a voucher system and homeschooling.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88517-49921854', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B1', '❖ Uphold beneficial programs that Americans have already paid for and are still paying for. In Washington, Ralph Groves will uphold Social Security and Medicare, and will call for reduction of Federal taxes to stimulate the economy. Such stimulus will boost revenues for Social Security and Medicare while helping to reduce the Federal deficit. Lower Federal taxes will increase peoples’ spending power that will stimulate competition and eventually reduce prices. Lower taxes, as well as decreased regulation, will spur job growth and economic development in Florida. In addition, for the proximate future, the U.S. will depend on fossil fuels.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88517-a61ad4ad', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B4', '❖ Uphold beneficial programs that Americans have already paid for and are still paying for. In Washington, Ralph Groves will uphold Social Security and Medicare, and will call for reduction of Federal taxes to stimulate the economy. Such stimulus will boost revenues for Social Security and Medicare while helping to reduce the Federal deficit. Lower Federal taxes will increase peoples’ spending power that will stimulate competition and eventually reduce prices. Lower taxes, as well as decreased regulation, will spur job growth and economic development in Florida. In addition, for the proximate future, the U.S. will depend on fossil fuels.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88517-32f75a7d', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B7--FL-DOE-88517', 'As a Congressman, Ralph Groves will work with Florida State Legislators to ensure that Washington will assist Florida. For example, he will ensure that the Environmental Protection Agency provides Florida with more grants for safe drinking water, e.g. to eliminate lead in water. In addition, he will ensure that Coast Guard funding is increased to enable response to hurricanes in Florida and will support keeping the Florida National Guard at home to help Floridians during crises. Further, he will push for the abolishment of the War on Drugs due to its failure to reduce illicit drug usage and its inherent disproportionate punishment of minority people.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88517-c8537343', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-KYV5--FL-DOE-88517', 'As a Congressman, Ralph Groves will work with Florida State Legislators to ensure that Washington will assist Florida. For example, he will ensure that the Environmental Protection Agency provides Florida with more grants for safe drinking water, e.g. to eliminate lead in water. In addition, he will ensure that Coast Guard funding is increased to enable response to hurricanes in Florida and will support keeping the Florida National Guard at home to help Floridians during crises. Further, he will push for the abolishment of the War on Drugs due to its failure to reduce illicit drug usage and its inherent disproportionate punishment of minority people.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91715-7a21d202', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-B2', 'Oppose any cuts or privatization of Social Security and Medicare, and push to let Medicare negotiate lower prescription drug costs for seniors.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91715-9350f0ac', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-B4', 'Oppose any cuts or privatization of Social Security and Medicare, and push to let Medicare negotiate lower prescription drug costs for seniors.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91715-cf1fb00c', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-B2', 'Expand access to affordable, high-quality healthcare by protecting the Affordable Care Act.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91715-c8d288d5', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-A1--FL-DOE-91715', 'Secure federal funding to combat our housing crisis and lower property insurance costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91715-4554ebc2', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-A2--FL-DOE-91715', 'Secure federal funding to combat our housing crisis and lower property insurance costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91715-71f0bee8', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-A7--FL-DOE-91715', 'James will fight to end gerrymandering, pass the John Lewis Voting Rights Act, and defend our democracy from MAGA attacks.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91715-b716e7ef', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-KYV1--FL-DOE-91715', 'James will fight to end gerrymandering, pass the John Lewis Voting Rights Act, and defend our democracy from MAGA attacks.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-88517-53162ec9', source_id FROM source WHERE url_norm = 'www.grovesforcongress.com/my-mission'
UNION ALL
  SELECT 'claim-FL-DOE-88517-295f33ba', source_id FROM source WHERE url_norm = 'www.grovesforcongress.com/my-mission'
UNION ALL
  SELECT 'claim-FL-DOE-88517-8a1000ba', source_id FROM source WHERE url_norm = 'www.grovesforcongress.com/my-mission'
UNION ALL
  SELECT 'claim-FL-DOE-88517-49921854', source_id FROM source WHERE url_norm = 'www.grovesforcongress.com/my-mission'
UNION ALL
  SELECT 'claim-FL-DOE-88517-a61ad4ad', source_id FROM source WHERE url_norm = 'www.grovesforcongress.com/my-mission'
UNION ALL
  SELECT 'claim-FL-DOE-88517-32f75a7d', source_id FROM source WHERE url_norm = 'www.grovesforcongress.com/meet-ralph-groves'
UNION ALL
  SELECT 'claim-FL-DOE-88517-c8537343', source_id FROM source WHERE url_norm = 'www.grovesforcongress.com/meet-ralph-groves'
UNION ALL
  SELECT 'claim-FL-DOE-91715-7a21d202', source_id FROM source WHERE url_norm = 'jamespericola.com'
UNION ALL
  SELECT 'claim-FL-DOE-91715-9350f0ac', source_id FROM source WHERE url_norm = 'jamespericola.com'
UNION ALL
  SELECT 'claim-FL-DOE-91715-cf1fb00c', source_id FROM source WHERE url_norm = 'jamespericola.com'
UNION ALL
  SELECT 'claim-FL-DOE-91715-c8d288d5', source_id FROM source WHERE url_norm = 'jamespericola.com'
UNION ALL
  SELECT 'claim-FL-DOE-91715-4554ebc2', source_id FROM source WHERE url_norm = 'jamespericola.com'
UNION ALL
  SELECT 'claim-FL-DOE-91715-71f0bee8', source_id FROM source WHERE url_norm = 'jamespericola.com'
UNION ALL
  SELECT 'claim-FL-DOE-91715-b716e7ef', source_id FROM source WHERE url_norm = 'jamespericola.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-88517-0bdd3c5c', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B1', '', ARRAY['claim-FL-DOE-88517-49921854']::text[], true, 'stated'),
  ('pos-FL-DOE-88517-0edd4115', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88517-0ddd3f82', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B3', '', ARRAY['claim-FL-DOE-88517-295f33ba']::text[], true, 'stated'),
  ('pos-FL-DOE-88517-08dd37a3', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B4', '', ARRAY['claim-FL-DOE-88517-a61ad4ad']::text[], true, 'stated'),
  ('pos-FL-DOE-88517-07dd3610', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B5--FL-DOE-88517', '', ARRAY['claim-FL-DOE-88517-53162ec9']::text[], true, 'stated'),
  ('pos-FL-DOE-88517-adb280bc', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-KYV9--FL-DOE-88517', '', ARRAY['claim-FL-DOE-88517-8a1000ba']::text[], true, 'stated'),
  ('pos-FL-DOE-88517-09dd3936', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-B7--FL-DOE-88517', '', ARRAY['claim-FL-DOE-88517-32f75a7d']::text[], true, 'stated'),
  ('pos-FL-DOE-88517-b1b28708', 'FL-DOE-88517', 'FL-11-general', 'FL-11-general--issue-KYV5--FL-DOE-88517', '', ARRAY['claim-FL-DOE-88517-c8537343']::text[], true, 'stated'),
  ('pos-FL-DOE-91715-0bdd3c5c', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91715-0edd4115', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-B2', '', ARRAY['claim-FL-DOE-91715-7a21d202','claim-FL-DOE-91715-cf1fb00c']::text[], true, 'stated'),
  ('pos-FL-DOE-91715-0ddd3f82', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91715-08dd37a3', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-B4', '', ARRAY['claim-FL-DOE-91715-9350f0ac']::text[], true, 'stated'),
  ('pos-FL-DOE-91715-9bd5d047', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-A1--FL-DOE-91715', '', ARRAY['claim-FL-DOE-91715-c8d288d5']::text[], true, 'stated'),
  ('pos-FL-DOE-91715-9cd5d1da', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-A2--FL-DOE-91715', '', ARRAY['claim-FL-DOE-91715-4554ebc2']::text[], true, 'stated'),
  ('pos-FL-DOE-91715-99d5cd21', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-A7--FL-DOE-91715', '', ARRAY['claim-FL-DOE-91715-71f0bee8']::text[], true, 'stated'),
  ('pos-FL-DOE-91715-b5b28d54', 'FL-DOE-91715', 'FL-11-general', 'FL-11-general--issue-KYV1--FL-DOE-91715', '', ARRAY['claim-FL-DOE-91715-b716e7ef']::text[], true, 'stated'),
  ('pos-FL-DOE-91717-0bdd3c5c', 'FL-DOE-91717', 'FL-11-general', 'FL-11-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91717-0edd4115', 'FL-DOE-91717', 'FL-11-general', 'FL-11-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91717-0ddd3f82', 'FL-DOE-91717', 'FL-11-general', 'FL-11-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91717-08dd37a3', 'FL-DOE-91717', 'FL-11-general', 'FL-11-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-88517', 'FL-11-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-88517-53162ec9','claim-FL-DOE-88517-295f33ba','claim-FL-DOE-88517-8a1000ba','claim-FL-DOE-88517-49921854','claim-FL-DOE-88517-a61ad4ad','claim-FL-DOE-88517-32f75a7d','claim-FL-DOE-88517-c8537343']::text[], ARRAY[]::text[], '{"word_count":595,"verifiable_fact_count":0,"stated_position_count":7,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-91715', 'FL-11-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-91715-7a21d202','claim-FL-DOE-91715-9350f0ac','claim-FL-DOE-91715-cf1fb00c','claim-FL-DOE-91715-c8d288d5','claim-FL-DOE-91715-4554ebc2','claim-FL-DOE-91715-71f0bee8','claim-FL-DOE-91715-b716e7ef']::text[], ARRAY[]::text[], '{"word_count":122,"verifiable_fact_count":0,"stated_position_count":7,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-DOE-91717', 'FL-11-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-11-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-11-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-11-general, then
-- set_race_publication once a human has read the brief.
