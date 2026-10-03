-- Brief rows for FL-DAD-CC5-general, built by scripts/brief-rows-sql.ts.
-- Generated from 1 policy run(s) for 2 candidate(s). Review before applying.
--
-- 1 source, 5 issue, 3 claim, 9 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":3,"no_issue_matched":3,"no_run":1}
-- FL-VF-DAD-2998: no run, silent on every spine issue: site unreadable: bot challenge did not clear (never solved, by rule) on the 2026-09-29 Jev-link ingest and on its one identical re-run (FL-DAD-CC5/FL-VF-DAD-2998/ingest-report.md, attempt-1-failed/); founder decision D3/D4: record silence
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
DELETE FROM claim    WHERE race_id = 'FL-DAD-CC5-general';
DELETE FROM position WHERE race_id = 'FL-DAD-CC5-general';
DELETE FROM issue    WHERE race_id = 'FL-DAD-CC5-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-8182393f', 'https://vickilopez.vote/', 'vickilopez.vote', 'vickilopez.vote', 'candidate_self', 'N/A', '2026-09-29T11:44:28Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-DAD-CC5-general--issue-A2', 'FL-DAD-CC5-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-DAD-CC5-general--issue-KYV3', 'FL-DAD-CC5-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-DAD-CC5-general--issue-KYV4', 'FL-DAD-CC5-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-DAD-CC5-general--issue-B7', 'FL-DAD-CC5-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4),
  ('FL-DAD-CC5-general--issue-B1--FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'candidate', 'FL-VF-DAD-2949', 'Economy, inflation, and jobs', NULL, NULL, 100)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-DAD-2949-5c7dcc1e', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-A2', 'Create more affordable and workforce housing', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-2949-4a602195', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-B1--FL-VF-DAD-2949', 'Support small businesses to grow our economy and create opportunities', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-2949-77b9680f', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-KYV4', 'Protect Biscayne Bay, defend our environment, and mitigate flooding', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-DAD-2949-5c7dcc1e', source_id FROM source WHERE url_norm = 'vickilopez.vote'
UNION ALL
  SELECT 'claim-FL-VF-DAD-2949-4a602195', source_id FROM source WHERE url_norm = 'vickilopez.vote'
UNION ALL
  SELECT 'claim-FL-VF-DAD-2949-77b9680f', source_id FROM source WHERE url_norm = 'vickilopez.vote'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-DAD-2949-9cd5d1da', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-A2', '', ARRAY['claim-FL-VF-DAD-2949-5c7dcc1e']::text[], true, 'stated'),
  ('pos-FL-VF-DAD-2949-b7b2907a', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2949-b2b2889b', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-KYV4', '', ARRAY['claim-FL-VF-DAD-2949-77b9680f']::text[], true, 'stated'),
  ('pos-FL-VF-DAD-2949-09dd3936', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2949-0bdd3c5c', 'FL-VF-DAD-2949', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-B1--FL-VF-DAD-2949', '', ARRAY['claim-FL-VF-DAD-2949-4a602195']::text[], true, 'stated'),
  ('pos-FL-VF-DAD-2998-9cd5d1da', 'FL-VF-DAD-2998', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2998-b7b2907a', 'FL-VF-DAD-2998', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2998-b2b2889b', 'FL-VF-DAD-2998', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2998-09dd3936', 'FL-VF-DAD-2998', 'FL-DAD-CC5-general', 'FL-DAD-CC5-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-DAD-2949', 'FL-DAD-CC5-general', ARRAY[]::text[], ARRAY['claim-FL-VF-DAD-2949-5c7dcc1e','claim-FL-VF-DAD-2949-4a602195','claim-FL-VF-DAD-2949-77b9680f']::text[], ARRAY[]::text[], '{"word_count":25,"verifiable_fact_count":0,"stated_position_count":3,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-VF-DAD-2998', 'FL-DAD-CC5-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-DAD-CC5-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-DAD-CC5-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-DAD-CC5-general, then
-- set_race_publication once a human has read the brief.
