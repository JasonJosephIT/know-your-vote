-- Brief rows for FL-ORA-CC7-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 2 source, 4 issue, 4 claim, 8 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":105,"no_issue_matched":5}
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
DELETE FROM claim    WHERE race_id = 'FL-ORA-CC7-general';
DELETE FROM position WHERE race_id = 'FL-ORA-CC7-general';
DELETE FROM issue    WHERE race_id = 'FL-ORA-CC7-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-d6dac4d0', 'https://www.patriciarumph.com/', 'www.patriciarumph.com', 'www.patriciarumph.com', 'candidate_self', 'N/A', '2026-09-29T11:45:48Z'),
  ('src-a7b5ee09', 'https://www.patriciarumph.com/on-the-issues', 'www.patriciarumph.com/on-the-issues', 'www.patriciarumph.com', 'candidate_self', 'N/A', '2026-09-29T11:45:48Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-ORA-CC7-general--issue-A2', 'FL-ORA-CC7-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-ORA-CC7-general--issue-KYV3', 'FL-ORA-CC7-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-ORA-CC7-general--issue-KYV4', 'FL-ORA-CC7-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-ORA-CC7-general--issue-B7', 'FL-ORA-CC7-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-ORA-1283-97c34f98', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-B7', 'I believe every family deserves to feel safe in their homes and neighborhoods. Whether it''s partnering with local law enforcement to reduce crime, supporting violence prevention programs, or improving emergency services, I''ll work tirelessly to ensure our neighborhoods are safe places.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1283-4f514f45', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-A2', 'Everyone should have access to an affordable place to call home. I''ll work to increase accessible housing options and ensure new developments are responsibly planned. A stronger community is one where families can afford to live.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1283-98fba80b', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-KYV3', 'Protecting our environment is about ensuring a healthy Orange County for generations to come. I will champion responsible growth policies, conservation of our natural resources, and initiatives that reduce pollution and safeguard our water sources.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1283-a2fe59b0', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-A2', 'Patricia Rumph supports affordable housing and responsible development, ensuring working families, seniors, and essential workers can live, work, and thrive in the communities they serve.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-ORA-1283-97c34f98', source_id FROM source WHERE url_norm = 'www.patriciarumph.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1283-4f514f45', source_id FROM source WHERE url_norm = 'www.patriciarumph.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1283-98fba80b', source_id FROM source WHERE url_norm = 'www.patriciarumph.com'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1283-a2fe59b0', source_id FROM source WHERE url_norm = 'www.patriciarumph.com/on-the-issues'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-ORA-1271-9cd5d1da', 'FL-VF-ORA-1271', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1271-b7b2907a', 'FL-VF-ORA-1271', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1271-b2b2889b', 'FL-VF-ORA-1271', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1271-09dd3936', 'FL-VF-ORA-1271', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1283-9cd5d1da', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-A2', '', ARRAY['claim-FL-VF-ORA-1283-4f514f45','claim-FL-VF-ORA-1283-a2fe59b0']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1283-b7b2907a', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-KYV3', '', ARRAY['claim-FL-VF-ORA-1283-98fba80b']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1283-b2b2889b', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1283-09dd3936', 'FL-VF-ORA-1283', 'FL-ORA-CC7-general', 'FL-ORA-CC7-general--issue-B7', '', ARRAY['claim-FL-VF-ORA-1283-97c34f98']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-ORA-1271', 'FL-ORA-CC7-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-VF-ORA-1283', 'FL-ORA-CC7-general', ARRAY[]::text[], ARRAY['claim-FL-VF-ORA-1283-97c34f98','claim-FL-VF-ORA-1283-4f514f45','claim-FL-VF-ORA-1283-98fba80b','claim-FL-VF-ORA-1283-a2fe59b0']::text[], ARRAY[]::text[], '{"word_count":137,"verifiable_fact_count":0,"stated_position_count":4,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb)
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
  WHERE r.race_id = 'FL-ORA-CC7-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-ORA-CC7-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-ORA-CC7-general, then
-- set_race_publication once a human has read the brief.
