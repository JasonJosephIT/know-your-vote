-- Brief rows for FL-28-general, built by scripts/brief-rows-sql.ts.
-- Generated from 3 policy run(s) for 3 candidate(s). Review before applying.
--
-- 1 source, 9 issue, 8 claim, 17 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":22,"no_issue_matched":1}
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
DELETE FROM claim    WHERE race_id = 'FL-28-general';
DELETE FROM position WHERE race_id = 'FL-28-general';
DELETE FROM issue    WHERE race_id = 'FL-28-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-50aff9ff', 'https://ehrforcongress.us/', 'ehrforcongress.us', 'ehrforcongress.us', 'candidate_self', 'N/A', '2026-09-29T11:43:14Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-28-general--issue-B1', 'FL-28-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-28-general--issue-B2', 'FL-28-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-28-general--issue-B3', 'FL-28-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-28-general--issue-B4', 'FL-28-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-28-general--issue-A2--FL-DOE-91699', 'FL-28-general', 'candidate', 'FL-DOE-91699', 'Housing affordability', NULL, NULL, 100),
  ('FL-28-general--issue-B7--FL-DOE-91699', 'FL-28-general', 'candidate', 'FL-DOE-91699', 'Crime policy, policing and courts', NULL, NULL, 101),
  ('FL-28-general--issue-KYV1--FL-DOE-91699', 'FL-28-general', 'candidate', 'FL-DOE-91699', 'Threats to democratic institutions', NULL, NULL, 102),
  ('FL-28-general--issue-KYV2--FL-DOE-91699', 'FL-28-general', 'candidate', 'FL-DOE-91699', 'Energy and utilities', NULL, NULL, 103),
  ('FL-28-general--issue-KYV3--FL-DOE-91699', 'FL-28-general', 'candidate', 'FL-DOE-91699', 'Growth, development and land conservation', NULL, NULL, 104)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-91699-d34083eb', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B2', 'Lower premiums, expand access, and reduce out-of-pocket costs through the Healthcare Stability & Program Choice Act.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91699-d3eb0c42', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-A2--FL-DOE-91699', 'Enforce anti-fraud laws, hold bad actors accountable, stabilize the market, and protect homeowners from rising costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91699-788998ae', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B7--FL-DOE-91699', 'Enforce anti-fraud laws, hold bad actors accountable, stabilize the market, and protect homeowners from rising costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91699-3ed02dca', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-KYV1--FL-DOE-91699', 'Putting America First means defending the Constitution and the rule of law, rejecting anti-American rhetoric, antisemitism, socialism and political extremism, and using military force only when lawful and necessary.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91699-9d20fad4', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B2', 'Pursue a full VA hospital or major VA medical facility in South Dade to improve access for veterans in South Dade and Monroe County while strengthening essential services.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91699-d0472f93', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B3', 'Protect law-abiding immigrant families, Improve training and accountability for border personnel, a path to permanent residency for families stuck in legal limbo and target criminals and traffickers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91699-5daef59e', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-KYV2--FL-DOE-91699', 'Protect the Everglades, defend water resources, support responsible growth, and pursue a temporary moratorium on large-scale AI data centers and other high-impact developments until their impacts on infrastructure, energy, housing, and the environment are fully evaluated.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91699-67d18b2f', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-KYV3--FL-DOE-91699', 'Protect the Everglades, defend water resources, support responsible growth, and pursue a temporary moratorium on large-scale AI data centers and other high-impact developments until their impacts on infrastructure, energy, housing, and the environment are fully evaluated.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-91699-d34083eb', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
UNION ALL
  SELECT 'claim-FL-DOE-91699-d3eb0c42', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
UNION ALL
  SELECT 'claim-FL-DOE-91699-788998ae', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
UNION ALL
  SELECT 'claim-FL-DOE-91699-3ed02dca', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
UNION ALL
  SELECT 'claim-FL-DOE-91699-9d20fad4', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
UNION ALL
  SELECT 'claim-FL-DOE-91699-d0472f93', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
UNION ALL
  SELECT 'claim-FL-DOE-91699-5daef59e', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
UNION ALL
  SELECT 'claim-FL-DOE-91699-67d18b2f', source_id FROM source WHERE url_norm = 'ehrforcongress.us'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-90340-0bdd3c5c', 'FL-DOE-90340', 'FL-28-general', 'FL-28-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90340-0edd4115', 'FL-DOE-90340', 'FL-28-general', 'FL-28-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90340-0ddd3f82', 'FL-DOE-90340', 'FL-28-general', 'FL-28-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90340-08dd37a3', 'FL-DOE-90340', 'FL-28-general', 'FL-28-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91226-0bdd3c5c', 'FL-DOE-91226', 'FL-28-general', 'FL-28-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91226-0edd4115', 'FL-DOE-91226', 'FL-28-general', 'FL-28-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91226-0ddd3f82', 'FL-DOE-91226', 'FL-28-general', 'FL-28-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91226-08dd37a3', 'FL-DOE-91226', 'FL-28-general', 'FL-28-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91699-0bdd3c5c', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91699-0edd4115', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B2', '', ARRAY['claim-FL-DOE-91699-d34083eb','claim-FL-DOE-91699-9d20fad4']::text[], true, 'stated'),
  ('pos-FL-DOE-91699-0ddd3f82', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B3', '', ARRAY['claim-FL-DOE-91699-d0472f93']::text[], true, 'stated'),
  ('pos-FL-DOE-91699-08dd37a3', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91699-9cd5d1da', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-A2--FL-DOE-91699', '', ARRAY['claim-FL-DOE-91699-d3eb0c42']::text[], true, 'stated'),
  ('pos-FL-DOE-91699-09dd3936', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-B7--FL-DOE-91699', '', ARRAY['claim-FL-DOE-91699-788998ae']::text[], true, 'stated'),
  ('pos-FL-DOE-91699-b5b28d54', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-KYV1--FL-DOE-91699', '', ARRAY['claim-FL-DOE-91699-3ed02dca']::text[], true, 'stated'),
  ('pos-FL-DOE-91699-b8b2920d', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-KYV2--FL-DOE-91699', '', ARRAY['claim-FL-DOE-91699-5daef59e']::text[], true, 'stated'),
  ('pos-FL-DOE-91699-b7b2907a', 'FL-DOE-91699', 'FL-28-general', 'FL-28-general--issue-KYV3--FL-DOE-91699', '', ARRAY['claim-FL-DOE-91699-67d18b2f']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-90340', 'FL-28-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-91226', 'FL-28-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-91699', 'FL-28-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-91699-d34083eb','claim-FL-DOE-91699-d3eb0c42','claim-FL-DOE-91699-788998ae','claim-FL-DOE-91699-3ed02dca','claim-FL-DOE-91699-9d20fad4','claim-FL-DOE-91699-d0472f93','claim-FL-DOE-91699-5daef59e','claim-FL-DOE-91699-67d18b2f']::text[], ARRAY[]::text[], '{"word_count":204,"verifiable_fact_count":0,"stated_position_count":8,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-28-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-28-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-28-general, then
-- set_race_publication once a human has read the brief.
