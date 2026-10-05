-- Brief rows for FL-HIL-CC3-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 3 source, 6 issue, 7 claim, 10 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":23,"no_issue_matched":6}
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
DELETE FROM claim    WHERE race_id = 'FL-HIL-CC3-general';
DELETE FROM position WHERE race_id = 'FL-HIL-CC3-general';
DELETE FROM issue    WHERE race_id = 'FL-HIL-CC3-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-dc01b583', 'https://www.electluizffgarcia.com/', 'www.electluizffgarcia.com', 'www.electluizffgarcia.com', 'candidate_self', 'N/A', '2026-09-29T11:44:59Z'),
  ('src-2361a4cc', 'https://www.electluizffgarcia.com/issues', 'www.electluizffgarcia.com/issues', 'www.electluizffgarcia.com', 'candidate_self', 'N/A', '2026-09-29T11:44:59Z'),
  ('src-b032ef59', 'https://www.electluizffgarcia.com/about', 'www.electluizffgarcia.com/about', 'www.electluizffgarcia.com', 'candidate_self', 'N/A', '2026-09-29T11:44:59Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-HIL-CC3-general--issue-A2', 'FL-HIL-CC3-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-HIL-CC3-general--issue-KYV3', 'FL-HIL-CC3-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-HIL-CC3-general--issue-KYV4', 'FL-HIL-CC3-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-HIL-CC3-general--issue-B7', 'FL-HIL-CC3-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4),
  ('FL-HIL-CC3-general--issue-B1--FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'candidate', 'FL-VF-HIL-2646', 'Economy, inflation, and jobs', NULL, NULL, 100),
  ('FL-HIL-CC3-general--issue-A6--FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'candidate', 'FL-VF-HIL-2646', 'Public school funding and teachers', NULL, NULL, 101)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-HIL-2646-c14ee21d', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-B7', 'Public Safety Invest in law enforcement, first responders, and crime prevention to keep neighborhoods safe.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2646-340e22cd', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-B1--FL-VF-HIL-2646', 'Structured Growth Support local businesses, attract new industries, and create jobs to strengthen our economy.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2646-a59e0292', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-KYV3', 'Infrastructure Improvements Hillsborough County is expanding rapidly, but growth without strategy leads to overcrowded roads, strained utilities, and communities that feel overwhelmed. My plan focuses on structured, intentional development that improves infrastructure before new projects break ground. That includes smarter traffic flow, upgraded drainage systems, modernized utilities, and transportation planning that reduces congestion rather than reacting to it. Development should enhance neighborhoods—not burden them—and that requires holding builders accountable, protecting taxpayer dollars, and ensuring every project benefits the people who already live here.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2646-682695c1', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-B7', 'Public Safety A safe community is the foundation of a strong county, and public safety begins with leadership that supports law enforcement, invests in community wellbeing, and plans ahead instead of reacting after problems arise. My focus is on strengthening coordination between agencies, improving response times, and ensuring our deputies, firefighters, and first responders have the tools, training, and resources they need to protect our families. This includes addressing infrastructure issues that impact safety—like poor lighting, outdated intersections, and neighborhoods that need better visibility and road design to reduce accidents and crime.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2646-1e64a26d', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-B1--FL-VF-HIL-2646', 'Structured Growth Hillsborough County has enormous potential for economic expansion, but growth must be structured, intentional, and aligned with the needs of our communities. As a small business owner, I understand the challenges local entrepreneurs face—long permitting delays, inconsistent regulations, and county processes that slow progress. My approach focuses on cutting red tape, modernizing county operations, and ensuring that businesses receive timely, transparent, and accountable service. When government becomes more efficient and predictable, job creation accelerates, investment rises, and our economy becomes more resilient.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2646-950e4d8f', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-KYV3', 'Structured Growth Hillsborough County has enormous potential for economic expansion, but growth must be structured, intentional, and aligned with the needs of our communities. As a small business owner, I understand the challenges local entrepreneurs face—long permitting delays, inconsistent regulations, and county processes that slow progress. My approach focuses on cutting red tape, modernizing county operations, and ensuring that businesses receive timely, transparent, and accountable service. When government becomes more efficient and predictable, job creation accelerates, investment rises, and our economy becomes more resilient.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2646-2228a01d', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-A6--FL-VF-HIL-2646', 'Our children are the foundation of our county’s future which is why it’s time to properly fund and modernize our schools. Every child deserves access to quality education, safe facilities, and the tools to build a successful life right here in Hillsborough. But education can’t thrive if our infrastructure fails. We must fix the roads, reduce congestion, and modernize our public spaces to make it easier for families and small businesses to grow.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-HIL-2646-c14ee21d', source_id FROM source WHERE url_norm = 'www.electluizffgarcia.com'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2646-340e22cd', source_id FROM source WHERE url_norm = 'www.electluizffgarcia.com'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2646-a59e0292', source_id FROM source WHERE url_norm = 'www.electluizffgarcia.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2646-682695c1', source_id FROM source WHERE url_norm = 'www.electluizffgarcia.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2646-1e64a26d', source_id FROM source WHERE url_norm = 'www.electluizffgarcia.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2646-950e4d8f', source_id FROM source WHERE url_norm = 'www.electluizffgarcia.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2646-2228a01d', source_id FROM source WHERE url_norm = 'www.electluizffgarcia.com/about'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-HIL-2621-9cd5d1da', 'FL-VF-HIL-2621', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2621-b7b2907a', 'FL-VF-HIL-2621', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2621-b2b2889b', 'FL-VF-HIL-2621', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2621-09dd3936', 'FL-VF-HIL-2621', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2646-9cd5d1da', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2646-b7b2907a', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-KYV3', '', ARRAY['claim-FL-VF-HIL-2646-a59e0292','claim-FL-VF-HIL-2646-950e4d8f']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2646-b2b2889b', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2646-09dd3936', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-B7', '', ARRAY['claim-FL-VF-HIL-2646-c14ee21d','claim-FL-VF-HIL-2646-682695c1']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2646-0bdd3c5c', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-B1--FL-VF-HIL-2646', '', ARRAY['claim-FL-VF-HIL-2646-340e22cd','claim-FL-VF-HIL-2646-1e64a26d']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2646-98d5cb8e', 'FL-VF-HIL-2646', 'FL-HIL-CC3-general', 'FL-HIL-CC3-general--issue-A6--FL-VF-HIL-2646', '', ARRAY['claim-FL-VF-HIL-2646-2228a01d']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-HIL-2621', 'FL-HIL-CC3-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-VF-HIL-2646', 'FL-HIL-CC3-general', ARRAY[]::text[], ARRAY['claim-FL-VF-HIL-2646-c14ee21d','claim-FL-VF-HIL-2646-340e22cd','claim-FL-VF-HIL-2646-a59e0292','claim-FL-VF-HIL-2646-682695c1','claim-FL-VF-HIL-2646-1e64a26d','claim-FL-VF-HIL-2646-950e4d8f','claim-FL-VF-HIL-2646-2228a01d']::text[], ARRAY[]::text[], '{"word_count":446,"verifiable_fact_count":0,"stated_position_count":7,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-HIL-CC3-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-HIL-CC3-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-HIL-CC3-general, then
-- set_race_publication once a human has read the brief.
