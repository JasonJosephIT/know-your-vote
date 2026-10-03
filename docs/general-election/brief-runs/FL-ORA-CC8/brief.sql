-- Brief rows for FL-ORA-CC8-general, built by scripts/brief-rows-sql.ts.
-- Generated from 1 policy run(s) for 2 candidate(s). Review before applying.
--
-- 1 source, 6 issue, 5 claim, 10 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":12,"no_issue_matched":1,"no_run":1}
-- FL-VF-ORA-1275: no run, silent on every spine issue: site unreadable: robots.txt disallows the crawl (honoured) on the 2026-09-29 Jev-link ingest and on its one identical re-run (FL-ORA-CC8/FL-VF-ORA-1275/ingest-report.md, attempt-1-failed/); founder decision D3/D4: record silence
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
DELETE FROM claim    WHERE race_id = 'FL-ORA-CC8-general';
DELETE FROM position WHERE race_id = 'FL-ORA-CC8-general';
DELETE FROM issue    WHERE race_id = 'FL-ORA-CC8-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-eb1a0597', 'https://www.electvictorres.com/', 'www.electvictorres.com', 'www.electvictorres.com', 'candidate_self', 'N/A', '2026-09-29T11:45:48Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-ORA-CC8-general--issue-A2', 'FL-ORA-CC8-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-ORA-CC8-general--issue-KYV3', 'FL-ORA-CC8-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-ORA-CC8-general--issue-KYV4', 'FL-ORA-CC8-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-ORA-CC8-general--issue-B7', 'FL-ORA-CC8-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4),
  ('FL-ORA-CC8-general--issue-B1--FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'candidate', 'FL-VF-ORA-1272', 'Economy, inflation, and jobs', NULL, NULL, 100),
  ('FL-ORA-CC8-general--issue-B2--FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'candidate', 'FL-VF-ORA-1272', 'Healthcare access and costs', NULL, NULL, 101)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-ORA-1272-8ba25426', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-A2', 'Expand Affordable Housing & Prevent Displacement Vic will advocate for policies that increase housing affordability, promote mixed-income developments, convert underutilized properties, and protect families from steep rent hikes. He understands that multiple families sharing a driveway means working people can’t find a place of their own.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1272-c0f1d21e', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-KYV4', 'Invest in Flood Prevention & Resilient Infrastructure Vic will prioritize upgrades to stormwater systems, flood mitigation projects, and smarter planning to prevent neighborhoods from being repeatedly underwater after heavy rains.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1272-e1cd886b', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-A2', 'Support Working Families & Veterans A longtime champion of living wages and access to care, Vic will continue fighting for workforce housing, workers’ rights, and strong services for veterans, seniors, and families. His legislation supporting PTSD treatment and honoring Tuskegee Airmen reflects his commitment to service members.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1272-d81c7ecd', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-B1--FL-VF-ORA-1272', 'Support Working Families & Veterans A longtime champion of living wages and access to care, Vic will continue fighting for workforce housing, workers’ rights, and strong services for veterans, seniors, and families. His legislation supporting PTSD treatment and honoring Tuskegee Airmen reflects his commitment to service members.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1272-f8bd68ce', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-B2--FL-VF-ORA-1272', 'Support Working Families & Veterans A longtime champion of living wages and access to care, Vic will continue fighting for workforce housing, workers’ rights, and strong services for veterans, seniors, and families. His legislation supporting PTSD treatment and honoring Tuskegee Airmen reflects his commitment to service members.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-ORA-1272-8ba25426', source_id FROM source WHERE url_norm = 'www.electvictorres.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1272-c0f1d21e', source_id FROM source WHERE url_norm = 'www.electvictorres.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1272-e1cd886b', source_id FROM source WHERE url_norm = 'www.electvictorres.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1272-d81c7ecd', source_id FROM source WHERE url_norm = 'www.electvictorres.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1272-f8bd68ce', source_id FROM source WHERE url_norm = 'www.electvictorres.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-ORA-1272-9cd5d1da', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-A2', '', ARRAY['claim-FL-VF-ORA-1272-8ba25426','claim-FL-VF-ORA-1272-e1cd886b']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1272-b7b2907a', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1272-b2b2889b', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-KYV4', '', ARRAY['claim-FL-VF-ORA-1272-c0f1d21e']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1272-09dd3936', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1272-0bdd3c5c', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-B1--FL-VF-ORA-1272', '', ARRAY['claim-FL-VF-ORA-1272-d81c7ecd']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1272-0edd4115', 'FL-VF-ORA-1272', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-B2--FL-VF-ORA-1272', '', ARRAY['claim-FL-VF-ORA-1272-f8bd68ce']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1275-9cd5d1da', 'FL-VF-ORA-1275', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1275-b7b2907a', 'FL-VF-ORA-1275', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1275-b2b2889b', 'FL-VF-ORA-1275', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1275-09dd3936', 'FL-VF-ORA-1275', 'FL-ORA-CC8-general', 'FL-ORA-CC8-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-ORA-1272', 'FL-ORA-CC8-general', ARRAY[]::text[], ARRAY['claim-FL-VF-ORA-1272-8ba25426','claim-FL-VF-ORA-1272-c0f1d21e','claim-FL-VF-ORA-1272-e1cd886b','claim-FL-VF-ORA-1272-d81c7ecd','claim-FL-VF-ORA-1272-f8bd68ce']::text[], ARRAY[]::text[], '{"word_count":217,"verifiable_fact_count":0,"stated_position_count":5,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-VF-ORA-1275', 'FL-ORA-CC8-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-ORA-CC8-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-ORA-CC8-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-ORA-CC8-general, then
-- set_race_publication once a human has read the brief.
