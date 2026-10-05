-- Brief rows for FL-14-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 3 candidate(s). Review before applying.
--
-- 3 source, 7 issue, 8 claim, 15 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":168,"no_run":1,"no_issue_matched":10}
-- FL-DOE-91313: no run, silent on every spine issue: site unreadable: bot challenge did not clear (never solved, by rule) on the 2026-09-29 Jev-link ingest and on its one identical re-run (FL-14/FL-DOE-91313/ingest-report.md, attempt-1-failed/); founder decision D3/D4: record silence
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
DELETE FROM claim    WHERE race_id = 'FL-14-general';
DELETE FROM position WHERE race_id = 'FL-14-general';
DELETE FROM issue    WHERE race_id = 'FL-14-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-1a0cf01d', 'https://castorforcongress.com/about', 'castorforcongress.com/about', 'castorforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:29Z'),
  ('src-335d5224', 'https://www.brianlambertforcongress.com/issues/election-integrity', 'www.brianlambertforcongress.com/issues/election-integrity', 'www.brianlambertforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:29Z'),
  ('src-9389b930', 'https://www.brianlambertforcongress.com/issues', 'www.brianlambertforcongress.com/issues', 'www.brianlambertforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:29Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-14-general--issue-B1', 'FL-14-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-14-general--issue-B2', 'FL-14-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-14-general--issue-B3', 'FL-14-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-14-general--issue-B4', 'FL-14-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-14-general--issue-A4--FL-DOE-88870', 'FL-14-general', 'candidate', 'FL-DOE-88870', 'Cost of living in Florida', NULL, NULL, 100),
  ('FL-14-general--issue-A7--FL-DOE-92395', 'FL-14-general', 'candidate', 'FL-DOE-92395', 'Elections administration and voting access', NULL, NULL, 100),
  ('FL-14-general--issue-B6--FL-DOE-92395', 'FL-14-general', 'candidate', 'FL-DOE-92395', 'Election integrity', NULL, NULL, 101)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-88870-ee2f2f3f', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-A4--FL-DOE-88870', 'But the work isn’t done. Kathy Castor will continue to fight for a diverse and strong Tampa Bay economy that keeps costs for families in check, keeps health care and energy affordable, and protects our way of life.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88870-67ecb233', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-B1', 'But the work isn’t done. Kathy Castor will continue to fight for a diverse and strong Tampa Bay economy that keeps costs for families in check, keeps health care and energy affordable, and protects our way of life.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88870-e2bd23b8', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-B2', 'But the work isn’t done. Kathy Castor will continue to fight for a diverse and strong Tampa Bay economy that keeps costs for families in check, keeps health care and energy affordable, and protects our way of life.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92395-1bfe0349', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-A7--FL-DOE-92395', 'I support election systems that are secure, transparent, and easy for eligible citizens to use while making fraud difficult to commit and easy to detect.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92395-a1209a21', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B6--FL-DOE-92395', 'I support election systems that are secure, transparent, and easy for eligible citizens to use while making fraud difficult to commit and easy to detect.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92395-4a4bd848', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B3', 'Secure every border and port of entry while supporting legal immigration and the rule of law.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92395-e957fac2', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B2', 'Restore patient choice, medical freedom, price transparency, and competition while reducing unnecessary federal interference in healthcare.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92395-bebf2602', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B1', 'Lower taxes, reduce regulation, and let American entrepreneurs succeed.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-88870-ee2f2f3f', source_id FROM source WHERE url_norm = 'castorforcongress.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-88870-67ecb233', source_id FROM source WHERE url_norm = 'castorforcongress.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-88870-e2bd23b8', source_id FROM source WHERE url_norm = 'castorforcongress.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-92395-1bfe0349', source_id FROM source WHERE url_norm = 'www.brianlambertforcongress.com/issues/election-integrity'
UNION ALL
  SELECT 'claim-FL-DOE-92395-a1209a21', source_id FROM source WHERE url_norm = 'www.brianlambertforcongress.com/issues/election-integrity'
UNION ALL
  SELECT 'claim-FL-DOE-92395-4a4bd848', source_id FROM source WHERE url_norm = 'www.brianlambertforcongress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-92395-e957fac2', source_id FROM source WHERE url_norm = 'www.brianlambertforcongress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-92395-bebf2602', source_id FROM source WHERE url_norm = 'www.brianlambertforcongress.com/issues'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-88870-0bdd3c5c', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-B1', '', ARRAY['claim-FL-DOE-88870-67ecb233']::text[], true, 'stated'),
  ('pos-FL-DOE-88870-0edd4115', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-B2', '', ARRAY['claim-FL-DOE-88870-e2bd23b8']::text[], true, 'stated'),
  ('pos-FL-DOE-88870-0ddd3f82', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88870-08dd37a3', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88870-96d5c868', 'FL-DOE-88870', 'FL-14-general', 'FL-14-general--issue-A4--FL-DOE-88870', '', ARRAY['claim-FL-DOE-88870-ee2f2f3f']::text[], true, 'stated'),
  ('pos-FL-DOE-91313-0bdd3c5c', 'FL-DOE-91313', 'FL-14-general', 'FL-14-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91313-0edd4115', 'FL-DOE-91313', 'FL-14-general', 'FL-14-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91313-0ddd3f82', 'FL-DOE-91313', 'FL-14-general', 'FL-14-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91313-08dd37a3', 'FL-DOE-91313', 'FL-14-general', 'FL-14-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92395-0bdd3c5c', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B1', '', ARRAY['claim-FL-DOE-92395-bebf2602']::text[], true, 'stated'),
  ('pos-FL-DOE-92395-0edd4115', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B2', '', ARRAY['claim-FL-DOE-92395-e957fac2']::text[], true, 'stated'),
  ('pos-FL-DOE-92395-0ddd3f82', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B3', '', ARRAY['claim-FL-DOE-92395-4a4bd848']::text[], true, 'stated'),
  ('pos-FL-DOE-92395-08dd37a3', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92395-99d5cd21', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-A7--FL-DOE-92395', '', ARRAY['claim-FL-DOE-92395-1bfe0349']::text[], true, 'stated'),
  ('pos-FL-DOE-92395-0add3ac9', 'FL-DOE-92395', 'FL-14-general', 'FL-14-general--issue-B6--FL-DOE-92395', '', ARRAY['claim-FL-DOE-92395-a1209a21']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-88870', 'FL-14-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-88870-ee2f2f3f','claim-FL-DOE-88870-67ecb233','claim-FL-DOE-88870-e2bd23b8']::text[], ARRAY[]::text[], '{"word_count":114,"verifiable_fact_count":0,"stated_position_count":3,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-DOE-91313', 'FL-14-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-92395', 'FL-14-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-92395-1bfe0349','claim-FL-DOE-92395-a1209a21','claim-FL-DOE-92395-4a4bd848','claim-FL-DOE-92395-e957fac2','claim-FL-DOE-92395-bebf2602']::text[], ARRAY[]::text[], '{"word_count":91,"verifiable_fact_count":0,"stated_position_count":5,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb)
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
  WHERE r.race_id = 'FL-14-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-14-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-14-general, then
-- set_race_publication once a human has read the brief.
