-- Brief rows for FL-ORA-SB2-general, built by scripts/brief-rows-sql.ts.
-- Generated from 1 policy run(s) for 1 candidate(s). Review before applying.
--
-- 1 source, 3 issue, 1 claim, 3 position, 1 profile rows.
-- Passages that produced no row: {"states_no_policy":33,"no_issue_matched":5}
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
DELETE FROM claim    WHERE race_id = 'FL-ORA-SB2-general';
DELETE FROM position WHERE race_id = 'FL-ORA-SB2-general';
DELETE FROM issue    WHERE race_id = 'FL-ORA-SB2-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-e0b5ae19', 'https://votegloriareina.com/', 'votegloriareina.com', 'votegloriareina.com', 'candidate_self', 'N/A', '2026-09-29T11:46:11Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-ORA-SB2-general--issue-A6', 'FL-ORA-SB2-general', 'spine', NULL, 'Public school funding and teachers', NULL, NULL, 1),
  ('FL-ORA-SB2-general--issue-KYV9', 'FL-ORA-SB2-general', 'spine', NULL, 'School choice and vouchers', NULL, NULL, 2),
  ('FL-ORA-SB2-general--issue-KYV10', 'FL-ORA-SB2-general', 'spine', NULL, 'Career, vocational and higher education', NULL, NULL, 3)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-ORA-1318-98c344c1', 'FL-VF-ORA-1318', 'FL-ORA-SB2-general', 'FL-ORA-SB2-general--issue-A6', 'Fight for competitive compensation that keeps great teachers in our schools', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-ORA-1318-98c344c1', source_id FROM source WHERE url_norm = 'votegloriareina.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-ORA-1318-98d5cb8e', 'FL-VF-ORA-1318', 'FL-ORA-SB2-general', 'FL-ORA-SB2-general--issue-A6', '', ARRAY['claim-FL-VF-ORA-1318-98c344c1']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1318-adb280bc', 'FL-VF-ORA-1318', 'FL-ORA-SB2-general', 'FL-ORA-SB2-general--issue-KYV9', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1318-6c14946c', 'FL-VF-ORA-1318', 'FL-ORA-SB2-general', 'FL-ORA-SB2-general--issue-KYV10', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-ORA-1318', 'FL-ORA-SB2-general', ARRAY[]::text[], ARRAY['claim-FL-VF-ORA-1318-98c344c1']::text[], ARRAY[]::text[], '{"word_count":11,"verifiable_fact_count":0,"stated_position_count":1,"fact_checks_performed":0,"spine_issue_count":3,"spine_issues_covered":1}'::jsonb)
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
  WHERE r.race_id = 'FL-ORA-SB2-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-ORA-SB2-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-ORA-SB2-general, then
-- set_race_publication once a human has read the brief.
