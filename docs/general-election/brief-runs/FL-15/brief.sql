-- Brief rows for FL-15-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 3 source, 11 issue, 16 claim, 15 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":55,"no_issue_matched":10}
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
DELETE FROM claim    WHERE race_id = 'FL-15-general';
DELETE FROM position WHERE race_id = 'FL-15-general';
DELETE FROM issue    WHERE race_id = 'FL-15-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-2e66be61', 'https://www.peopleforcongress.com/', 'www.peopleforcongress.com', 'www.peopleforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:25Z'),
  ('src-c08ce1de', 'https://www.peopleforcongress.com/general-7', 'www.peopleforcongress.com/general-7', 'www.peopleforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:25Z'),
  ('src-25d1755b', 'https://votelaurel.com/', 'votelaurel.com', 'votelaurel.com', 'candidate_self', 'N/A', '2026-09-29T11:42:25Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-15-general--issue-B1', 'FL-15-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-15-general--issue-B2', 'FL-15-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-15-general--issue-B3', 'FL-15-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-15-general--issue-B4', 'FL-15-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-15-general--issue-A7--FL-DOE-89116', 'FL-15-general', 'candidate', 'FL-DOE-89116', 'Elections administration and voting access', NULL, NULL, 100),
  ('FL-15-general--issue-KYV2--FL-DOE-89116', 'FL-15-general', 'candidate', 'FL-DOE-89116', 'Energy and utilities', NULL, NULL, 101),
  ('FL-15-general--issue-KYV3--FL-DOE-89116', 'FL-15-general', 'candidate', 'FL-DOE-89116', 'Growth, development and land conservation', NULL, NULL, 102),
  ('FL-15-general--issue-A6--FL-DOE-89116', 'FL-15-general', 'candidate', 'FL-DOE-89116', 'Public school funding and teachers', NULL, NULL, 103),
  ('FL-15-general--issue-KYV2--FL-DOE-89121', 'FL-15-general', 'candidate', 'FL-DOE-89121', 'Energy and utilities', NULL, NULL, 100),
  ('FL-15-general--issue-KYV10--FL-DOE-89121', 'FL-15-general', 'candidate', 'FL-DOE-89121', 'Career, vocational and higher education', NULL, NULL, 101),
  ('FL-15-general--issue-A7--FL-DOE-89121', 'FL-15-general', 'candidate', 'FL-DOE-89121', 'Elections administration and voting access', NULL, NULL, 102)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-89116-f7bc7cc1', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-A7--FL-DOE-89116', 'Robert speaks with members of the American Postal Workers Union about his priorities, including protecting Social Security, Medicare for All, Vote by Mail, protecting people and the environment, and opposing data centers when communities don’t want them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-0ab67745', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B2', 'Robert speaks with members of the American Postal Workers Union about his priorities, including protecting Social Security, Medicare for All, Vote by Mail, protecting people and the environment, and opposing data centers when communities don’t want them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-56f90873', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B4', 'Robert speaks with members of the American Postal Workers Union about his priorities, including protecting Social Security, Medicare for All, Vote by Mail, protecting people and the environment, and opposing data centers when communities don’t want them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-d17ae36d', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-KYV2--FL-DOE-89116', 'Robert speaks with members of the American Postal Workers Union about his priorities, including protecting Social Security, Medicare for All, Vote by Mail, protecting people and the environment, and opposing data centers when communities don’t want them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-c0a8b9ec', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-KYV3--FL-DOE-89116', 'Robert speaks with members of the American Postal Workers Union about his priorities, including protecting Social Security, Medicare for All, Vote by Mail, protecting people and the environment, and opposing data centers when communities don’t want them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-a82b690c', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B2', 'We have proven time and time again that we have the capacity to support Medicare For All, and there has been enough "kicking this can down the road." Robert will support universal healthcare to ensure that our citizens receive the healthcare they need without being financially drained just to pay for medication(s), forcing them to decide between paying a bill or receiving, in many cases, life-saving medicines. Our citizens should not have to decide to essentially die due to the inflated costs of medications that they can no longer afford, and whoever is benefiting from these astronomical costs needs to be held accountable as well. Enough of pretending we do not know that is happening.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-ea55778b', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B2', 'This bill was passed on July 3, 2025, and signed on July 4, 2025. This is a horrible bill, to say the least. Millions will lose healthcare coverage and SNAP benefits. Our national debt will rise by nearly $3.5 trillion. There will be limits to overtime and tips deductions. And this is just the start. If this has not taken place by the time Robert is in office in 2027, his goal here would be to propose legislation to amend and/or repeal this bill.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-5247d71e', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B4', 'Robert will propose raising the Social Security tax cap. According to http://pgpf.org , in 2025, the Social Security tax cap was set at $176,100, which is an increase of $7,500 more than in 2024.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-44a9a4bc', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-A6--FL-DOE-89116', 'One way Robert will look to do this is to establish a minimum salary in every state. This will be determined at the very least by the cost of living, the current median salaries, and a few other factors. It will be enough for teachers not to have to get second jobs over the summer.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89116-54411a82', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B1', 'One way Robert will look to do this is to establish a minimum salary in every state. This will be determined at the very least by the cost of living, the current median salaries, and a few other factors. It will be enough for teachers not to have to get second jobs over the summer.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89121-0ad326db', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-B1', 'Laurel served as Florida’s Secretary of State for three years, and delivered strong results for families, and businesses. In Congress, Laurel is fighting tirelessly to Grow our Economy, Cut Taxes and Regulations, Promote MADE IN THE U.S.A., Ensure American Energy DOMINANCE, Keep our now very Secure Border, SECURE, Champion Innovation, Strengthen our Great Military/Veterans, and Protect our always under siege Second Amendment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89121-f3d4721d', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-B3', 'Laurel served as Florida’s Secretary of State for three years, and delivered strong results for families, and businesses. In Congress, Laurel is fighting tirelessly to Grow our Economy, Cut Taxes and Regulations, Promote MADE IN THE U.S.A., Ensure American Energy DOMINANCE, Keep our now very Secure Border, SECURE, Champion Innovation, Strengthen our Great Military/Veterans, and Protect our always under siege Second Amendment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89121-c7fabbe0', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-KYV2--FL-DOE-89121', 'Laurel served as Florida’s Secretary of State for three years, and delivered strong results for families, and businesses. In Congress, Laurel is fighting tirelessly to Grow our Economy, Cut Taxes and Regulations, Promote MADE IN THE U.S.A., Ensure American Energy DOMINANCE, Keep our now very Secure Border, SECURE, Champion Innovation, Strengthen our Great Military/Veterans, and Protect our always under siege Second Amendment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89121-70c8f89a', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-KYV10--FL-DOE-89121', 'She also supported efforts to cut unnecessary government spending and end fraud, waste, and abuse in government programs —ensuring that taxpayer resources go to those truly in need, not those who are ineligible or defrauding the system. Recognizing the value of skilled trades and hands-on careers, Laurel supports the PELL Act, expanding Pell grants for technical education and job training.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89121-6c871b6a', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-B1', 'She also supported efforts to cut unnecessary government spending and end fraud, waste, and abuse in government programs —ensuring that taxpayer resources go to those truly in need, not those who are ineligible or defrauding the system. Recognizing the value of skilled trades and hands-on careers, Laurel supports the PELL Act, expanding Pell grants for technical education and job training.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89121-8be3b799', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-A7--FL-DOE-89121', 'Laurel co-introduced the Supporting Military Voters Act, a bipartisan effort to improve absentee ballot access for deployed servicemembers and their dependents. She supports expanding access to mental health care, improving veteran job placement programs, and strengthening benefits delivery systems to make sure promises made are promises kept.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-89116-f7bc7cc1', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89116-0ab67745', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89116-56f90873', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89116-d17ae36d', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89116-c0a8b9ec', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89116-a82b690c', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com/general-7'
UNION ALL
  SELECT 'claim-FL-DOE-89116-ea55778b', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com/general-7'
UNION ALL
  SELECT 'claim-FL-DOE-89116-5247d71e', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com/general-7'
UNION ALL
  SELECT 'claim-FL-DOE-89116-44a9a4bc', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com/general-7'
UNION ALL
  SELECT 'claim-FL-DOE-89116-54411a82', source_id FROM source WHERE url_norm = 'www.peopleforcongress.com/general-7'
UNION ALL
  SELECT 'claim-FL-DOE-89121-0ad326db', source_id FROM source WHERE url_norm = 'votelaurel.com'
UNION ALL
  SELECT 'claim-FL-DOE-89121-f3d4721d', source_id FROM source WHERE url_norm = 'votelaurel.com'
UNION ALL
  SELECT 'claim-FL-DOE-89121-c7fabbe0', source_id FROM source WHERE url_norm = 'votelaurel.com'
UNION ALL
  SELECT 'claim-FL-DOE-89121-70c8f89a', source_id FROM source WHERE url_norm = 'votelaurel.com'
UNION ALL
  SELECT 'claim-FL-DOE-89121-6c871b6a', source_id FROM source WHERE url_norm = 'votelaurel.com'
UNION ALL
  SELECT 'claim-FL-DOE-89121-8be3b799', source_id FROM source WHERE url_norm = 'votelaurel.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89116-0bdd3c5c', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B1', '', ARRAY['claim-FL-DOE-89116-54411a82']::text[], true, 'stated'),
  ('pos-FL-DOE-89116-0edd4115', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B2', '', ARRAY['claim-FL-DOE-89116-0ab67745','claim-FL-DOE-89116-a82b690c','claim-FL-DOE-89116-ea55778b']::text[], true, 'stated'),
  ('pos-FL-DOE-89116-0ddd3f82', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89116-08dd37a3', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-B4', '', ARRAY['claim-FL-DOE-89116-56f90873','claim-FL-DOE-89116-5247d71e']::text[], true, 'stated'),
  ('pos-FL-DOE-89116-99d5cd21', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-A7--FL-DOE-89116', '', ARRAY['claim-FL-DOE-89116-f7bc7cc1']::text[], true, 'stated'),
  ('pos-FL-DOE-89116-b8b2920d', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-KYV2--FL-DOE-89116', '', ARRAY['claim-FL-DOE-89116-d17ae36d']::text[], true, 'stated'),
  ('pos-FL-DOE-89116-b7b2907a', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-KYV3--FL-DOE-89116', '', ARRAY['claim-FL-DOE-89116-c0a8b9ec']::text[], true, 'stated'),
  ('pos-FL-DOE-89116-98d5cb8e', 'FL-DOE-89116', 'FL-15-general', 'FL-15-general--issue-A6--FL-DOE-89116', '', ARRAY['claim-FL-DOE-89116-44a9a4bc']::text[], true, 'stated'),
  ('pos-FL-DOE-89121-0bdd3c5c', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-B1', '', ARRAY['claim-FL-DOE-89121-0ad326db','claim-FL-DOE-89121-6c871b6a']::text[], true, 'stated'),
  ('pos-FL-DOE-89121-0edd4115', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89121-0ddd3f82', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-B3', '', ARRAY['claim-FL-DOE-89121-f3d4721d']::text[], true, 'stated'),
  ('pos-FL-DOE-89121-08dd37a3', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89121-b8b2920d', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-KYV2--FL-DOE-89121', '', ARRAY['claim-FL-DOE-89121-c7fabbe0']::text[], true, 'stated'),
  ('pos-FL-DOE-89121-6c14946c', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-KYV10--FL-DOE-89121', '', ARRAY['claim-FL-DOE-89121-70c8f89a']::text[], true, 'stated'),
  ('pos-FL-DOE-89121-99d5cd21', 'FL-DOE-89121', 'FL-15-general', 'FL-15-general--issue-A7--FL-DOE-89121', '', ARRAY['claim-FL-DOE-89121-8be3b799']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89116', 'FL-15-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89116-f7bc7cc1','claim-FL-DOE-89116-0ab67745','claim-FL-DOE-89116-56f90873','claim-FL-DOE-89116-d17ae36d','claim-FL-DOE-89116-c0a8b9ec','claim-FL-DOE-89116-a82b690c','claim-FL-DOE-89116-ea55778b','claim-FL-DOE-89116-5247d71e','claim-FL-DOE-89116-44a9a4bc','claim-FL-DOE-89116-54411a82']::text[], ARRAY[]::text[], '{"word_count":528,"verifiable_fact_count":0,"stated_position_count":10,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-89121', 'FL-15-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89121-0ad326db','claim-FL-DOE-89121-f3d4721d','claim-FL-DOE-89121-c7fabbe0','claim-FL-DOE-89121-70c8f89a','claim-FL-DOE-89121-6c871b6a','claim-FL-DOE-89121-8be3b799']::text[], ARRAY[]::text[], '{"word_count":353,"verifiable_fact_count":0,"stated_position_count":6,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-15-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-15-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-15-general, then
-- set_race_publication once a human has read the brief.
