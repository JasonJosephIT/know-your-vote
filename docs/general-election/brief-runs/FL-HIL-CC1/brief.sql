-- Brief rows for FL-HIL-CC1-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 1 source, 4 issue, 4 claim, 8 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":50,"no_issue_matched":2}
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
DELETE FROM claim    WHERE race_id = 'FL-HIL-CC1-general';
DELETE FROM position WHERE race_id = 'FL-HIL-CC1-general';
DELETE FROM issue    WHERE race_id = 'FL-HIL-CC1-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-47567e69', 'https://jackietoledo.com/issues', 'jackietoledo.com/issues', 'jackietoledo.com', 'candidate_self', 'N/A', '2026-09-29T11:45:30Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-HIL-CC1-general--issue-A2', 'FL-HIL-CC1-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-HIL-CC1-general--issue-KYV3', 'FL-HIL-CC1-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-HIL-CC1-general--issue-KYV4', 'FL-HIL-CC1-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-HIL-CC1-general--issue-B7', 'FL-HIL-CC1-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-HIL-2880-4ff54fbd', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-A2', 'Jackie believes infrastructure should come before unchecked development and that growth must be managed responsibly. She will work to implement smarter planning, better infrastructure coordination, protect neighborhoods and for greater transparency in development decisions. Work to develop affordable housing options with transportation coordination within our urban core.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2880-76e8559d', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-KYV3', 'Jackie believes infrastructure should come before unchecked development and that growth must be managed responsibly. She will work to implement smarter planning, better infrastructure coordination, protect neighborhoods and for greater transparency in development decisions. Work to develop affordable housing options with transportation coordination within our urban core.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2880-64156b30', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-B7', 'Jackie will strongly support law enforcement, firefighters, emergency responders, and emergency management professionals who keep our communities safe.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2880-9ce581a8', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-KYV4', 'Jackie will prioritize infrastructure resilience, stormwater improvements, flood mitigation, and emergency preparedness to protect residents and property.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-HIL-2880-4ff54fbd', source_id FROM source WHERE url_norm = 'jackietoledo.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2880-76e8559d', source_id FROM source WHERE url_norm = 'jackietoledo.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2880-64156b30', source_id FROM source WHERE url_norm = 'jackietoledo.com/issues'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2880-9ce581a8', source_id FROM source WHERE url_norm = 'jackietoledo.com/issues'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-HIL-2640-9cd5d1da', 'FL-VF-HIL-2640', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2640-b7b2907a', 'FL-VF-HIL-2640', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2640-b2b2889b', 'FL-VF-HIL-2640', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2640-09dd3936', 'FL-VF-HIL-2640', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2880-9cd5d1da', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-A2', '', ARRAY['claim-FL-VF-HIL-2880-4ff54fbd']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2880-b7b2907a', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-KYV3', '', ARRAY['claim-FL-VF-HIL-2880-76e8559d']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2880-b2b2889b', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-KYV4', '', ARRAY['claim-FL-VF-HIL-2880-9ce581a8']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2880-09dd3936', 'FL-VF-HIL-2880', 'FL-HIL-CC1-general', 'FL-HIL-CC1-general--issue-B7', '', ARRAY['claim-FL-VF-HIL-2880-64156b30']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-HIL-2640', 'FL-HIL-CC1-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-VF-HIL-2880', 'FL-HIL-CC1-general', ARRAY[]::text[], ARRAY['claim-FL-VF-HIL-2880-4ff54fbd','claim-FL-VF-HIL-2880-76e8559d','claim-FL-VF-HIL-2880-64156b30','claim-FL-VF-HIL-2880-9ce581a8']::text[], ARRAY[]::text[], '{"word_count":129,"verifiable_fact_count":0,"stated_position_count":4,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb)
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
  WHERE r.race_id = 'FL-HIL-CC1-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-HIL-CC1-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-HIL-CC1-general, then
-- set_race_publication once a human has read the brief.
