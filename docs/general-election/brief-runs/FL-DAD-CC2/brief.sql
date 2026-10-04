-- Brief rows for FL-DAD-CC2-general, built by scripts/brief-rows-sql.ts.
-- Generated from 1 policy run(s) for 1 candidate(s). Review before applying.
--
-- 1 source, 7 issue, 5 claim, 7 position, 1 profile rows.
-- Passages that produced no row: {"states_no_policy":14,"no_issue_matched":1}
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
DELETE FROM claim    WHERE race_id = 'FL-DAD-CC2-general';
DELETE FROM position WHERE race_id = 'FL-DAD-CC2-general';
DELETE FROM issue    WHERE race_id = 'FL-DAD-CC2-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-af5a1984', 'https://reelectbastien.com/', 'reelectbastien.com', 'reelectbastien.com', 'candidate_self', 'N/A', '2026-09-29T11:44:24Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-DAD-CC2-general--issue-A2', 'FL-DAD-CC2-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-DAD-CC2-general--issue-KYV3', 'FL-DAD-CC2-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-DAD-CC2-general--issue-KYV4', 'FL-DAD-CC2-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-DAD-CC2-general--issue-B7', 'FL-DAD-CC2-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4),
  ('FL-DAD-CC2-general--issue-KYV6--FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'candidate', 'FL-VF-DAD-2964', 'Renters and evictions', NULL, NULL, 100),
  ('FL-DAD-CC2-general--issue-B1--FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'candidate', 'FL-VF-DAD-2964', 'Economy, inflation, and jobs', NULL, NULL, 101),
  ('FL-DAD-CC2-general--issue-KYV10--FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'candidate', 'FL-VF-DAD-2964', 'Career, vocational and higher education', NULL, NULL, 102)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-DAD-2964-b649cf8c', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-A2', 'Keep building homes families can actually afford, and protect renters from being pushed out of the neighborhoods they built.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-2964-7bd71c59', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-KYV6--FL-VF-DAD-2964', 'Keep building homes families can actually afford, and protect renters from being pushed out of the neighborhoods they built.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-2964-87d4c6a4', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-B1--FL-VF-DAD-2964', 'Grow the Mom & Pop grant program and bring jobs and investment to District 2’s commercial corridors.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-2964-2ce284c6', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-KYV10--FL-VF-DAD-2964', 'Expand job training and real pathways so every family can build lasting financial security.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-2964-f0a67a76', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-B1--FL-VF-DAD-2964', 'Expand job training and real pathways so every family can build lasting financial security.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-DAD-2964-b649cf8c', source_id FROM source WHERE url_norm = 'reelectbastien.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-2964-7bd71c59', source_id FROM source WHERE url_norm = 'reelectbastien.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-2964-87d4c6a4', source_id FROM source WHERE url_norm = 'reelectbastien.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-2964-2ce284c6', source_id FROM source WHERE url_norm = 'reelectbastien.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-2964-f0a67a76', source_id FROM source WHERE url_norm = 'reelectbastien.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-DAD-2964-9cd5d1da', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-A2', '', ARRAY['claim-FL-VF-DAD-2964-b649cf8c']::text[], true, 'stated'),
  ('pos-FL-VF-DAD-2964-b7b2907a', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2964-b2b2889b', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2964-09dd3936', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-2964-b4b28bc1', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-KYV6--FL-VF-DAD-2964', '', ARRAY['claim-FL-VF-DAD-2964-7bd71c59']::text[], true, 'stated'),
  ('pos-FL-VF-DAD-2964-0bdd3c5c', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-B1--FL-VF-DAD-2964', '', ARRAY['claim-FL-VF-DAD-2964-87d4c6a4','claim-FL-VF-DAD-2964-f0a67a76']::text[], true, 'stated'),
  ('pos-FL-VF-DAD-2964-6c14946c', 'FL-VF-DAD-2964', 'FL-DAD-CC2-general', 'FL-DAD-CC2-general--issue-KYV10--FL-VF-DAD-2964', '', ARRAY['claim-FL-VF-DAD-2964-2ce284c6']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-DAD-2964', 'FL-DAD-CC2-general', ARRAY[]::text[], ARRAY['claim-FL-VF-DAD-2964-b649cf8c','claim-FL-VF-DAD-2964-7bd71c59','claim-FL-VF-DAD-2964-87d4c6a4','claim-FL-VF-DAD-2964-2ce284c6','claim-FL-VF-DAD-2964-f0a67a76']::text[], ARRAY[]::text[], '{"word_count":83,"verifiable_fact_count":0,"stated_position_count":5,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":1}'::jsonb)
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
  WHERE r.race_id = 'FL-DAD-CC2-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-DAD-CC2-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-DAD-CC2-general, then
-- set_race_publication once a human has read the brief.
