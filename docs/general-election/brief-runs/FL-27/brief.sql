-- Brief rows for FL-27-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 2 source, 7 issue, 3 claim, 11 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":103,"no_issue_matched":2}
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
DELETE FROM claim    WHERE race_id = 'FL-27-general';
DELETE FROM position WHERE race_id = 'FL-27-general';
DELETE FROM issue    WHERE race_id = 'FL-27-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-57e3370c', 'https://mariaelvirasalazar.com/issues/fight_socialism', 'mariaelvirasalazar.com/issues/fight_socialism', 'mariaelvirasalazar.com', 'candidate_self', 'N/A', '2026-09-29T11:44:37Z'),
  ('src-0054cb68', 'https://mariaelvirasalazar.com/issues', 'mariaelvirasalazar.com/issues', 'mariaelvirasalazar.com', 'candidate_self', 'N/A', '2026-09-29T11:44:37Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-27-general--issue-B1', 'FL-27-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-27-general--issue-B2', 'FL-27-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-27-general--issue-B3', 'FL-27-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-27-general--issue-B4', 'FL-27-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-27-general--issue-KYV1--FL-DOE-90721', 'FL-27-general', 'candidate', 'FL-DOE-90721', 'Threats to democratic institutions', NULL, NULL, 100),
  ('FL-27-general--issue-A5--FL-DOE-90721', 'FL-27-general', 'candidate', 'FL-DOE-90721', 'Water quality and Everglades restoration', NULL, NULL, 101),
  ('FL-27-general--issue-KYV4--FL-DOE-90721', 'FL-27-general', 'candidate', 'FL-DOE-90721', 'Storm resilience and flood protection', NULL, NULL, 102)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-90721-6b71139c', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-KYV1--FL-DOE-90721', 'Introduced Legislation to Restore Democracy and Accountability in Venezuela: I proposed support for international efforts to address the Maduro regime’s crimes and provide relief to Venezuelans suffering from a prolonged political and economic crisis.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90721-07ab97d3', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-A5--FL-DOE-90721', 'As a proud champion of the Everglades, I am fully committed to securing funding for its restoration and preservation, ensuring this unique ecosystem is protected for generations to come. I am leading the charge to create a National Resilience Strategy, designed to safeguard our coastal communities from the increasing threats of hurricanes, storm surges, and rising sea levels. I’ve secured millions of dollars through Community Funding Projects for Florida’s 27th district to build critical stormwater infrastructure, reduce flooding, and improve water quality in Biscayne Bay.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90721-0639d933', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-KYV4--FL-DOE-90721', 'As a proud champion of the Everglades, I am fully committed to securing funding for its restoration and preservation, ensuring this unique ecosystem is protected for generations to come. I am leading the charge to create a National Resilience Strategy, designed to safeguard our coastal communities from the increasing threats of hurricanes, storm surges, and rising sea levels. I’ve secured millions of dollars through Community Funding Projects for Florida’s 27th district to build critical stormwater infrastructure, reduce flooding, and improve water quality in Biscayne Bay.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-90721-6b71139c', source_id FROM source WHERE url_norm = 'mariaelvirasalazar.com/issues/fight_socialism'
UNION ALL
  SELECT 'claim-FL-DOE-90721-07ab97d3', source_id FROM source WHERE url_norm = 'mariaelvirasalazar.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90721-0639d933', source_id FROM source WHERE url_norm = 'mariaelvirasalazar.com/issues'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89933-0bdd3c5c', 'FL-DOE-89933', 'FL-27-general', 'FL-27-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89933-0edd4115', 'FL-DOE-89933', 'FL-27-general', 'FL-27-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89933-0ddd3f82', 'FL-DOE-89933', 'FL-27-general', 'FL-27-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89933-08dd37a3', 'FL-DOE-89933', 'FL-27-general', 'FL-27-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90721-0bdd3c5c', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90721-0edd4115', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90721-0ddd3f82', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90721-08dd37a3', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90721-b5b28d54', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-KYV1--FL-DOE-90721', '', ARRAY['claim-FL-DOE-90721-6b71139c']::text[], true, 'stated'),
  ('pos-FL-DOE-90721-97d5c9fb', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-A5--FL-DOE-90721', '', ARRAY['claim-FL-DOE-90721-07ab97d3']::text[], true, 'stated'),
  ('pos-FL-DOE-90721-b2b2889b', 'FL-DOE-90721', 'FL-27-general', 'FL-27-general--issue-KYV4--FL-DOE-90721', '', ARRAY['claim-FL-DOE-90721-0639d933']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89933', 'FL-27-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-90721', 'FL-27-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90721-6b71139c','claim-FL-DOE-90721-07ab97d3','claim-FL-DOE-90721-0639d933']::text[], ARRAY[]::text[], '{"word_count":204,"verifiable_fact_count":0,"stated_position_count":3,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-27-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-27-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-27-general, then
-- set_race_publication once a human has read the brief.
