-- Brief rows for FL-ORA-MAYOR-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 1 source, 7 issue, 7 claim, 11 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":48,"no_issue_matched":4}
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
DELETE FROM claim    WHERE race_id = 'FL-ORA-MAYOR-general';
DELETE FROM position WHERE race_id = 'FL-ORA-MAYOR-general';
DELETE FROM issue    WHERE race_id = 'FL-ORA-MAYOR-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-4975bf68', 'https://www.chrismessina.com/platform', 'www.chrismessina.com/platform', 'www.chrismessina.com', 'candidate_self', 'N/A', '2026-09-29T11:47:59Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-ORA-MAYOR-general--issue-A2', 'FL-ORA-MAYOR-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-ORA-MAYOR-general--issue-KYV3', 'FL-ORA-MAYOR-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-ORA-MAYOR-general--issue-KYV4', 'FL-ORA-MAYOR-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-ORA-MAYOR-general--issue-B7', 'FL-ORA-MAYOR-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4),
  ('FL-ORA-MAYOR-general--issue-A3--FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'candidate', 'FL-VF-ORA-1239', 'Property taxes', NULL, NULL, 100),
  ('FL-ORA-MAYOR-general--issue-KYV10--FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'candidate', 'FL-VF-ORA-1239', 'Career, vocational and higher education', NULL, NULL, 101),
  ('FL-ORA-MAYOR-general--issue-B1--FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'candidate', 'FL-VF-ORA-1239', 'Economy, inflation, and jobs', NULL, NULL, 102)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-ORA-1239-87720592', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-A3--FL-VF-ORA-1239', 'Orange County families are paying more while government continues to grow. Chris believes families deserve tax relief—not more wasteful spending. He supports YES on Amendment 3 to reduce the property-tax burden while protecting essential services.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1239-5f6e1da7', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-KYV10--FL-VF-ORA-1239', 'A good-paying career shouldn’t require a four-year degree. Orange County Works will expand vocational, technical, and workforce training—connecting residents with the trade skills employers need and creating a pathway from classroom to career.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1239-4411f757', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-B1--FL-VF-ORA-1239', 'A good-paying career shouldn’t require a four-year degree. Orange County Works will expand vocational, technical, and workforce training—connecting residents with the trade skills employers need and creating a pathway from classroom to career.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1239-52b6487b', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-B1--FL-VF-ORA-1239', 'Orange County has an opportunity to attract high-paying, technology-driven employers—especially in the growing space industry. Chris will champion bringing a future Space Force Academy to Central Florida, attracting talent, innovation, and investment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1239-b5f77560', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-KYV3', 'We need more housing—but we don’t need more sprawl. Chris will transform vacant and underused commercial properties into vibrant communities with housing, shops, restaurants, and services. He’ll use technology to modernize and right-size LYNX and work to make Downtown Orlando safer, cleaner, and more vibrant.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1239-72273337', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-B7', 'Finally, we will strengthen partnerships with local, state, and federal law enforcement to combat human trafficking, with particular focus on protecting children from exploitation. Every child deserves to grow up safe, supported, and free from abuse and fear.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-ORA-1239-590e0452', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-B7', 'Public safety is one of the most fundamental responsibilities of local government. As Orange County continues to grow, our investment in law enforcement, fire rescue, and emergency medical services must keep pace. As Mayor, I will ensure our first responders have the staffing, training, equipment, and resources they need to protect our residents and respond effectively. We will strengthen recruitment and retention, evaluate staffing levels and response times, and invest in effective crime prevention and community policing. Public safety is not a partisan issue—it is a quality-of-life issue.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-ORA-1239-87720592', source_id FROM source WHERE url_norm = 'www.chrismessina.com/platform'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1239-5f6e1da7', source_id FROM source WHERE url_norm = 'www.chrismessina.com/platform'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1239-4411f757', source_id FROM source WHERE url_norm = 'www.chrismessina.com/platform'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1239-52b6487b', source_id FROM source WHERE url_norm = 'www.chrismessina.com/platform'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1239-b5f77560', source_id FROM source WHERE url_norm = 'www.chrismessina.com/platform'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1239-72273337', source_id FROM source WHERE url_norm = 'www.chrismessina.com/platform'
UNION ALL
  SELECT 'claim-FL-VF-ORA-1239-590e0452', source_id FROM source WHERE url_norm = 'www.chrismessina.com/platform'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-ORA-1236-9cd5d1da', 'FL-VF-ORA-1236', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1236-b7b2907a', 'FL-VF-ORA-1236', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1236-b2b2889b', 'FL-VF-ORA-1236', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1236-09dd3936', 'FL-VF-ORA-1236', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1239-9cd5d1da', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1239-b7b2907a', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-KYV3', '', ARRAY['claim-FL-VF-ORA-1239-b5f77560']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1239-b2b2889b', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-ORA-1239-09dd3936', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-B7', '', ARRAY['claim-FL-VF-ORA-1239-72273337','claim-FL-VF-ORA-1239-590e0452']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1239-9dd5d36d', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-A3--FL-VF-ORA-1239', '', ARRAY['claim-FL-VF-ORA-1239-87720592']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1239-6c14946c', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-KYV10--FL-VF-ORA-1239', '', ARRAY['claim-FL-VF-ORA-1239-5f6e1da7']::text[], true, 'stated'),
  ('pos-FL-VF-ORA-1239-0bdd3c5c', 'FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', 'FL-ORA-MAYOR-general--issue-B1--FL-VF-ORA-1239', '', ARRAY['claim-FL-VF-ORA-1239-4411f757','claim-FL-VF-ORA-1239-52b6487b']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-ORA-1236', 'FL-ORA-MAYOR-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-VF-ORA-1239', 'FL-ORA-MAYOR-general', ARRAY[]::text[], ARRAY['claim-FL-VF-ORA-1239-87720592','claim-FL-VF-ORA-1239-5f6e1da7','claim-FL-VF-ORA-1239-4411f757','claim-FL-VF-ORA-1239-52b6487b','claim-FL-VF-ORA-1239-b5f77560','claim-FL-VF-ORA-1239-72273337','claim-FL-VF-ORA-1239-590e0452']::text[], ARRAY[]::text[], '{"word_count":304,"verifiable_fact_count":0,"stated_position_count":7,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-ORA-MAYOR-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-ORA-MAYOR-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-ORA-MAYOR-general, then
-- set_race_publication once a human has read the brief.
