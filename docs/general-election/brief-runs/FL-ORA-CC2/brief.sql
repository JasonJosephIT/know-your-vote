-- Brief rows for FL-ORA-CC2-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 3 source, 5 issue, 13 claim, 9 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":63,"no_issue_matched":11}
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
DELETE FROM claim    WHERE race_id = 'FL-ORA-CC2-general';
DELETE FROM position WHERE race_id = 'FL-ORA-CC2-general';
DELETE FROM issue    WHERE race_id = 'FL-ORA-CC2-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-962c5bfd', 'https://www.kamiafororangecounty.com/', 'www.kamiafororangecounty.com', 'www.kamiafororangecounty.com', 'candidate_self', 'N/A', '2026-09-29T11:45:32Z'),
  ('src-090ee1e4', 'https://ilikemikecrabb.com/', 'ilikemikecrabb.com', 'ilikemikecrabb.com', 'candidate_self', 'N/A', '2026-09-29T11:45:32Z'),
  ('src-dca546e5', 'https://ilikemikecrabb.com/issues', 'ilikemikecrabb.com/issues', 'ilikemikecrabb.com', 'candidate_self', 'N/A', '2026-09-29T11:45:32Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-ORA-CC2-general--issue-A2', 'FL-ORA-CC2-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-ORA-CC2-general--issue-KYV3', 'FL-ORA-CC2-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-ORA-CC2-general--issue-KYV4', 'FL-ORA-CC2-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-ORA-CC2-general--issue-B7', 'FL-ORA-CC2-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4),
  ('FL-ORA-CC2-general--issue-B1--FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'candidate', 'FL-VF-ORA-1384', 'Economy, inflation, and jobs', NULL, NULL, 100)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-ORA-1290-3436cd1a', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-A2', 'Expand affordable and workforce housing options', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1290-bc65fe5a', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-A2', 'Support solutions that lower homeowner costs and stabilize housing', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1290-0fb494c6', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV3', 'Encourage smart zoning for diverse housing types', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1290-539edeac', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV4', 'Upgrade utilities, stormwater systems, and public facilities', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1290-6dd110d4', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV3', 'Protect natural resources through responsible land use', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1290-3e2eec0e', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV3', 'Balance growth while preserving parks, waterways, and green space', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1384-764938b4', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-A2', 'Tackle housing costs, reduce taxes, and attract high-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1384-a8959ebe', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-B1--FL-VF-ORA-1384', 'Tackle housing costs, reduce taxes, and attract high-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1384-1dd4dbec', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-A2', 'Mike will work to tackle housing costs, reduce taxes, and attract high-paying jobs so families can afford to live, work, and thrive in Northwest Orange County.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1384-dfba9baa', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-B1--FL-VF-ORA-1384', 'Mike will work to tackle housing costs, reduce taxes, and attract high-paying jobs so families can afford to live, work, and thrive in Northwest Orange County.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1384-731a42a1', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-A2', 'Mike Crabb works to make Northwest Orange County more affordable for families by tackling housing costs, reducing taxes, and attracting high-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1384-7253519f', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-B1--FL-VF-ORA-1384', 'Mike Crabb works to make Northwest Orange County more affordable for families by tackling housing costs, reducing taxes, and attracting high-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1384-6636f79c', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV3', 'Mike Crabb supports smart, responsible growth that protects existing neighborhoods and pays for the infrastructure it requires.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-ORA-1290-3436cd1a', source_id FROM source WHERE url_norm = 'www.kamiafororangecounty.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1290-bc65fe5a', source_id FROM source WHERE url_norm = 'www.kamiafororangecounty.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1290-0fb494c6', source_id FROM source WHERE url_norm = 'www.kamiafororangecounty.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1290-539edeac', source_id FROM source WHERE url_norm = 'www.kamiafororangecounty.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1290-6dd110d4', source_id FROM source WHERE url_norm = 'www.kamiafororangecounty.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1290-3e2eec0e', source_id FROM source WHERE url_norm = 'www.kamiafororangecounty.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1384-764938b4', source_id FROM source WHERE url_norm = 'ilikemikecrabb.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1384-a8959ebe', source_id FROM source WHERE url_norm = 'ilikemikecrabb.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1384-1dd4dbec', source_id FROM source WHERE url_norm = 'ilikemikecrabb.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1384-dfba9baa', source_id FROM source WHERE url_norm = 'ilikemikecrabb.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1384-731a42a1', source_id FROM source WHERE url_norm = 'ilikemikecrabb.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1384-7253519f', source_id FROM source WHERE url_norm = 'ilikemikecrabb.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1384-6636f79c', source_id FROM source WHERE url_norm = 'ilikemikecrabb.com/issues'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-ORA-1290-9cd5d1da', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-A2', '', ARRAY['claim-FL-VF-ORA-1290-3436cd1a','claim-FL-VF-ORA-1290-bc65fe5a']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1290-b7b2907a', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV3', '', ARRAY['claim-FL-VF-ORA-1290-0fb494c6','claim-FL-VF-ORA-1290-6dd110d4','claim-FL-VF-ORA-1290-3e2eec0e']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1290-b2b2889b', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV4', '', ARRAY['claim-FL-VF-ORA-1290-539edeac']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1290-09dd3936', 'FL-VF-ORA-1290', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1384-9cd5d1da', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-A2', '', ARRAY['claim-FL-VF-ORA-1384-764938b4','claim-FL-VF-ORA-1384-1dd4dbec','claim-FL-VF-ORA-1384-731a42a1']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1384-b7b2907a', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV3', '', ARRAY['claim-FL-VF-ORA-1384-6636f79c']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1384-b2b2889b', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1384-09dd3936', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1384-0bdd3c5c', 'FL-VF-ORA-1384', 'FL-ORA-CC2-general', 'FL-ORA-CC2-general--issue-B1--FL-VF-ORA-1384', '', ARRAY['claim-FL-VF-ORA-1384-a8959ebe','claim-FL-VF-ORA-1384-dfba9baa','claim-FL-VF-ORA-1384-7253519f']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-ORA-1290', 'FL-ORA-CC2-general', ARRAY[]::text[], ARRAY['claim-FL-VF-ORA-1290-3436cd1a','claim-FL-VF-ORA-1290-bc65fe5a','claim-FL-VF-ORA-1290-0fb494c6','claim-FL-VF-ORA-1290-539edeac','claim-FL-VF-ORA-1290-6dd110d4','claim-FL-VF-ORA-1290-3e2eec0e']::text[], ARRAY[]::text[], '{"word_count":45,"verifiable_fact_count":0,"stated_position_count":6,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-VF-ORA-1384', 'FL-ORA-CC2-general', ARRAY[]::text[], ARRAY['claim-FL-VF-ORA-1384-764938b4','claim-FL-VF-ORA-1384-a8959ebe','claim-FL-VF-ORA-1384-1dd4dbec','claim-FL-VF-ORA-1384-dfba9baa','claim-FL-VF-ORA-1384-731a42a1','claim-FL-VF-ORA-1384-7253519f','claim-FL-VF-ORA-1384-6636f79c']::text[], ARRAY[]::text[], '{"word_count":131,"verifiable_fact_count":0,"stated_position_count":7,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-ORA-CC2-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-ORA-CC2-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-ORA-CC2-general, then
-- set_race_publication once a human has read the brief.
