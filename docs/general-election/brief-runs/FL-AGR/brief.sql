-- Brief rows for FL-AGR-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 1 source, 5 issue, 1 claim, 9 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":132,"no_issue_matched":2,"withheld_after_review":4}
-- Withheld after review (../withheld-2026-09-30.json): 4
--   FL-DOE-90560 ed8c0672: Past record: item in the /economic-freedom list of tax relief already passed ("Some of that tax relief includes:"), not a commitment. Step 3 check 3, 2026-09-30.
--   FL-DOE-90560 33c5a1fd: Past record: item in the /economic-freedom list of tax relief already passed ("Some of that tax relief includes:"), not a commitment. Step 3 check 3, 2026-09-30.
--   FL-DOE-90560 91d076da: Past record: item in the /economic-freedom list of tax relief already passed ("Some of that tax relief includes:"), not a commitment. Step 3 check 3, 2026-09-30.
--   FL-DOE-90560 d6e4045d: Past record: item in the /economic-freedom list of tax relief already passed ("Some of that tax relief includes:"), not a commitment. Step 3 check 3, 2026-09-30.
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
DELETE FROM claim    WHERE race_id = 'FL-AGR-general';
DELETE FROM position WHERE race_id = 'FL-AGR-general';
DELETE FROM issue    WHERE race_id = 'FL-AGR-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-ae36d6f9', 'https://wiltonsimpson.com/education', 'wiltonsimpson.com/education', 'wiltonsimpson.com', 'candidate_self', 'N/A', '2026-09-29T11:43:51Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-AGR-general--issue-A5', 'FL-AGR-general', 'spine', NULL, 'Water quality and Everglades restoration', NULL, NULL, 1),
  ('FL-AGR-general--issue-KYV5', 'FL-AGR-general', 'spine', NULL, 'Water supply and drinking water', NULL, NULL, 2),
  ('FL-AGR-general--issue-KYV3', 'FL-AGR-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 3),
  ('FL-AGR-general--issue-A4', 'FL-AGR-general', 'spine', NULL, 'Cost of living in Florida', NULL, NULL, 4),
  ('FL-AGR-general--issue-KYV9--FL-DOE-90560', 'FL-AGR-general', 'candidate', 'FL-DOE-90560', 'School choice and vouchers', NULL, NULL, 100)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-90560-86215895', 'FL-DOE-90560', 'FL-AGR-general', 'FL-AGR-general--issue-KYV9--FL-DOE-90560', 'Wilton understands that education isn’t one-size-fits all, and a parent’s income shouldn’t be a barrier to a good school. He stands with Florida parents and will continue to make sure school choice is an option for every family in Florida.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-90560-86215895', source_id FROM source WHERE url_norm = 'wiltonsimpson.com/education'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-90560-97d5c9fb', 'FL-DOE-90560', 'FL-AGR-general', 'FL-AGR-general--issue-A5', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90560-b1b28708', 'FL-DOE-90560', 'FL-AGR-general', 'FL-AGR-general--issue-KYV5', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90560-b7b2907a', 'FL-DOE-90560', 'FL-AGR-general', 'FL-AGR-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90560-96d5c868', 'FL-DOE-90560', 'FL-AGR-general', 'FL-AGR-general--issue-A4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90560-adb280bc', 'FL-DOE-90560', 'FL-AGR-general', 'FL-AGR-general--issue-KYV9--FL-DOE-90560', '', ARRAY['claim-FL-DOE-90560-86215895']::text[], true, 'stated'),
  ('pos-FL-DOE-92013-97d5c9fb', 'FL-DOE-92013', 'FL-AGR-general', 'FL-AGR-general--issue-A5', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92013-b1b28708', 'FL-DOE-92013', 'FL-AGR-general', 'FL-AGR-general--issue-KYV5', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92013-b7b2907a', 'FL-DOE-92013', 'FL-AGR-general', 'FL-AGR-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92013-96d5c868', 'FL-DOE-92013', 'FL-AGR-general', 'FL-AGR-general--issue-A4', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-90560', 'FL-AGR-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90560-86215895']::text[], ARRAY[]::text[], '{"word_count":40,"verifiable_fact_count":0,"stated_position_count":1,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-92013', 'FL-AGR-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-AGR-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-AGR-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-AGR-general, then
-- set_race_publication once a human has read the brief.
