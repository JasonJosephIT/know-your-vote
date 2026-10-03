-- Brief rows for FL-9-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 2 source, 8 issue, 9 claim, 12 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":26,"withheld_after_review":4,"no_issue_matched":2}
-- Withheld after review (../withheld-2026-09-30.json): 4
--   FL-DOE-89339 735f07ca: Past record: item in the list after "he has brought billions of dollars back in federal funding to the district to:", not a commitment. Step 3 check 3, 2026-09-30.
--   FL-DOE-89339 16695c81: Past record: item in the list after "he has brought billions of dollars back in federal funding to the district to:", not a commitment. Step 3 check 3, 2026-09-30.
--   FL-DOE-89339 5a5199ba: Past record: item in the list after "he has brought billions of dollars back in federal funding to the district to:", not a commitment. Step 3 check 3, 2026-09-30.
--   FL-DOE-89339 b312e31b: Past record: item in the list after "he has brought billions of dollars back in federal funding to the district to:", not a commitment. Step 3 check 3, 2026-09-30.
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
DELETE FROM claim    WHERE race_id = 'FL-9-general';
DELETE FROM position WHERE race_id = 'FL-9-general';
DELETE FROM issue    WHERE race_id = 'FL-9-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-933082d2', 'https://www.darrensoto.com/', 'www.darrensoto.com', 'www.darrensoto.com', 'candidate_self', 'N/A', '2026-09-29T19:18:19Z'),
  ('src-80d62256', 'https://dangreenfl.com/', 'dangreenfl.com', 'dangreenfl.com', 'candidate_self', 'N/A', '2026-09-29T19:18:19Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-9-general--issue-B1', 'FL-9-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-9-general--issue-B2', 'FL-9-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-9-general--issue-B3', 'FL-9-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-9-general--issue-B4', 'FL-9-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-9-general--issue-A2--FL-DOE-89339', 'FL-9-general', 'candidate', 'FL-DOE-89339', 'Housing affordability', NULL, NULL, 100),
  ('FL-9-general--issue-A4--FL-DOE-89339', 'FL-9-general', 'candidate', 'FL-DOE-89339', 'Cost of living in Florida', NULL, NULL, 101),
  ('FL-9-general--issue-A4--FL-DOE-91337', 'FL-9-general', 'candidate', 'FL-DOE-91337', 'Cost of living in Florida', NULL, NULL, 100),
  ('FL-9-general--issue-A2--FL-DOE-91337', 'FL-9-general', 'candidate', 'FL-DOE-91337', 'Housing affordability', NULL, NULL, 101)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-89339-c3ff8a36', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-A2--FL-DOE-89339', 'We must stop tariffs and other policies that are raising grocery, fuel, and housing costs, and hurting local agriculture. Stop Medicaid and ACA cuts causing thousands of Central Florida families to lose their healthcare. Protect Social Security and Medicare. And fight rampant corruption in Washington.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89339-0cf71d84', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-A4--FL-DOE-89339', 'We must stop tariffs and other policies that are raising grocery, fuel, and housing costs, and hurting local agriculture. Stop Medicaid and ACA cuts causing thousands of Central Florida families to lose their healthcare. Protect Social Security and Medicare. And fight rampant corruption in Washington.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89339-564d8720', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-B1', 'We must stop tariffs and other policies that are raising grocery, fuel, and housing costs, and hurting local agriculture. Stop Medicaid and ACA cuts causing thousands of Central Florida families to lose their healthcare. Protect Social Security and Medicare. And fight rampant corruption in Washington.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89339-b6d9012f', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-B2', 'We must stop tariffs and other policies that are raising grocery, fuel, and housing costs, and hurting local agriculture. Stop Medicaid and ACA cuts causing thousands of Central Florida families to lose their healthcare. Protect Social Security and Medicare. And fight rampant corruption in Washington.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89339-6bbf69bd', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-B4', 'We must stop tariffs and other policies that are raising grocery, fuel, and housing costs, and hurting local agriculture. Stop Medicaid and ACA cuts causing thousands of Central Florida families to lose their healthcare. Protect Social Security and Medicare. And fight rampant corruption in Washington.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91337-9f766633', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-A4--FL-DOE-91337', '“I didn''t fight radical extremists overseas just to stand by and watch left-wing extremists attack our freedoms here at home. I''m running for Congress because I believe that access to opportunity and prosperity for those willing to work for it are American ideals worth protecting. In Congress, I will fight to make America affordable again, because when groceries and gas prices are too high, Florida''s families, farmers and small business owners suffer.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91337-6d3e57f7', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-B1', '“I didn''t fight radical extremists overseas just to stand by and watch left-wing extremists attack our freedoms here at home. I''m running for Congress because I believe that access to opportunity and prosperity for those willing to work for it are American ideals worth protecting. In Congress, I will fight to make America affordable again, because when groceries and gas prices are too high, Florida''s families, farmers and small business owners suffer.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91337-ddd018b8', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-B1', 'We are still paying for the bad policies of the Biden Administration. Dan Green and President Trump will do everything necessary to lower fuel costs, groceries, and the ever rising cost of living.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91337-1741e229', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-A2--FL-DOE-91337', 'The American Dream of owning a home is not dead, but it is becoming more and more difficult for the next generation of homebuyers. Dan will use time-tested conservative values to lower housing costs and keep them low!', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-89339-c3ff8a36', source_id FROM source WHERE url_norm = 'www.darrensoto.com'
UNION ALL
  SELECT 'claim-FL-DOE-89339-0cf71d84', source_id FROM source WHERE url_norm = 'www.darrensoto.com'
UNION ALL
  SELECT 'claim-FL-DOE-89339-564d8720', source_id FROM source WHERE url_norm = 'www.darrensoto.com'
UNION ALL
  SELECT 'claim-FL-DOE-89339-b6d9012f', source_id FROM source WHERE url_norm = 'www.darrensoto.com'
UNION ALL
  SELECT 'claim-FL-DOE-89339-6bbf69bd', source_id FROM source WHERE url_norm = 'www.darrensoto.com'
UNION ALL
  SELECT 'claim-FL-DOE-91337-9f766633', source_id FROM source WHERE url_norm = 'dangreenfl.com'
UNION ALL
  SELECT 'claim-FL-DOE-91337-6d3e57f7', source_id FROM source WHERE url_norm = 'dangreenfl.com'
UNION ALL
  SELECT 'claim-FL-DOE-91337-ddd018b8', source_id FROM source WHERE url_norm = 'dangreenfl.com'
UNION ALL
  SELECT 'claim-FL-DOE-91337-1741e229', source_id FROM source WHERE url_norm = 'dangreenfl.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89339-0bdd3c5c', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-B1', '', ARRAY['claim-FL-DOE-89339-564d8720']::text[], true, 'stated'),
  ('pos-FL-DOE-89339-0edd4115', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-B2', '', ARRAY['claim-FL-DOE-89339-b6d9012f']::text[], true, 'stated'),
  ('pos-FL-DOE-89339-0ddd3f82', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89339-08dd37a3', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-B4', '', ARRAY['claim-FL-DOE-89339-6bbf69bd']::text[], true, 'stated'),
  ('pos-FL-DOE-89339-9cd5d1da', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-A2--FL-DOE-89339', '', ARRAY['claim-FL-DOE-89339-c3ff8a36']::text[], true, 'stated'),
  ('pos-FL-DOE-89339-96d5c868', 'FL-DOE-89339', 'FL-9-general', 'FL-9-general--issue-A4--FL-DOE-89339', '', ARRAY['claim-FL-DOE-89339-0cf71d84']::text[], true, 'stated'),
  ('pos-FL-DOE-91337-0bdd3c5c', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-B1', '', ARRAY['claim-FL-DOE-91337-6d3e57f7','claim-FL-DOE-91337-ddd018b8']::text[], true, 'stated'),
  ('pos-FL-DOE-91337-0edd4115', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91337-0ddd3f82', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91337-08dd37a3', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91337-96d5c868', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-A4--FL-DOE-91337', '', ARRAY['claim-FL-DOE-91337-9f766633']::text[], true, 'stated'),
  ('pos-FL-DOE-91337-9cd5d1da', 'FL-DOE-91337', 'FL-9-general', 'FL-9-general--issue-A2--FL-DOE-91337', '', ARRAY['claim-FL-DOE-91337-1741e229']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89339', 'FL-9-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89339-c3ff8a36','claim-FL-DOE-89339-0cf71d84','claim-FL-DOE-89339-564d8720','claim-FL-DOE-89339-b6d9012f','claim-FL-DOE-89339-6bbf69bd']::text[], ARRAY[]::text[], '{"word_count":225,"verifiable_fact_count":0,"stated_position_count":5,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-91337', 'FL-9-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-91337-9f766633','claim-FL-DOE-91337-6d3e57f7','claim-FL-DOE-91337-ddd018b8','claim-FL-DOE-91337-1741e229']::text[], ARRAY[]::text[], '{"word_count":215,"verifiable_fact_count":0,"stated_position_count":4,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":1}'::jsonb)
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
  WHERE r.race_id = 'FL-9-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-9-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-9-general, then
-- set_race_publication once a human has read the brief.
