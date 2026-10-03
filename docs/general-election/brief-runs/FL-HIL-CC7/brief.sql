-- Brief rows for FL-HIL-CC7-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 3 source, 5 issue, 5 claim, 9 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":54,"no_issue_matched":5}
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
DELETE FROM claim    WHERE race_id = 'FL-HIL-CC7-general';
DELETE FROM position WHERE race_id = 'FL-HIL-CC7-general';
DELETE FROM issue    WHERE race_id = 'FL-HIL-CC7-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-40a910dd', 'https://www.joshuawostal.com/taxes', 'www.joshuawostal.com/taxes', 'www.joshuawostal.com', 'candidate_self', 'N/A', '2026-09-29T11:45:14Z'),
  ('src-24bffbd9', 'https://www.joshuawostal.com/the-boring-budget-guy', 'www.joshuawostal.com/the-boring-budget-guy', 'www.joshuawostal.com', 'candidate_self', 'N/A', '2026-09-29T11:45:14Z'),
  ('src-b6e84676', 'https://voteaileen2026.com/', 'voteaileen2026.com', 'voteaileen2026.com', 'candidate_self', 'N/A', '2026-09-29T11:45:14Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-HIL-CC7-general--issue-A2', 'FL-HIL-CC7-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 1),
  ('FL-HIL-CC7-general--issue-KYV3', 'FL-HIL-CC7-general', 'spine', NULL, 'Growth, development and land conservation', NULL, NULL, 2),
  ('FL-HIL-CC7-general--issue-KYV4', 'FL-HIL-CC7-general', 'spine', NULL, 'Storm resilience and flood protection', NULL, NULL, 3),
  ('FL-HIL-CC7-general--issue-B7', 'FL-HIL-CC7-general', 'spine', NULL, 'Crime policy, policing and courts', NULL, NULL, 4),
  ('FL-HIL-CC7-general--issue-A3--FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'candidate', 'FL-VF-HIL-2620', 'Property taxes', NULL, NULL, 100)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-HIL-2620-59684d21', 'FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-A3--FL-VF-HIL-2620', 'I have voted against 4 different property tax increase attempts , and I''ll continue to vote no. Our county government has gotten into the habit of increasing taxes to fund their wasteful spending. I guess that''s what we have come to expect from politicians, but as a small businessman, I''ve advocated for identifying more creative solutions.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2620-aef39a5f', 'FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-A3--FL-VF-HIL-2620', 'I''m fighting for you on the Hillsborough County Board. I am bringing accountability and transparency in an effort to stop the unsustainable wasteful spending and ensure our tax dollars are finally being used to fix our county''s crumbling infrastructure. I''ve voted against 4 different property tax increase attempts. I developed a creative plan to change how we tax our residents for mileage, which has increased revenue while lowering property taxes. And I''m finding millions of dollars that should be going towards fixing our roads.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2660-b048085f', 'FL-VF-HIL-2660', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-A2', 'LOWER THE COST OF LIVING Hillsborough should be a place where everyone can afford to live. Aileen will tackle the housing and transportation costs that burden our wallets, ensuring teachers, first responders, and young families aren’t priced out of our community.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2660-b3b99570', 'FL-VF-HIL-2660', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-KYV3', 'PROTECT OUR LANDS & NEIGHBORHOODS Our community’s character is not for sale. Aileen will hold developers accountable and ensure they pay their fair share, preserving the unique culture and natural beauty of our County from reckless sprawl.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-HIL-2660-e544ea7f', 'FL-VF-HIL-2660', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-B7', 'PRIORITIZE PUBLIC SAFETY In an emergency, every second counts. Aileen will support funding the fire and police stations our growing population needs to ensure fast response times for every resident—no matter your zip code.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-HIL-2620-59684d21', source_id FROM source WHERE url_norm = 'www.joshuawostal.com/taxes'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2620-aef39a5f', source_id FROM source WHERE url_norm = 'www.joshuawostal.com/the-boring-budget-guy'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2660-b048085f', source_id FROM source WHERE url_norm = 'voteaileen2026.com'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2660-b3b99570', source_id FROM source WHERE url_norm = 'voteaileen2026.com'
UNION ALL
  SELECT 'claim-FL-VF-HIL-2660-e544ea7f', source_id FROM source WHERE url_norm = 'voteaileen2026.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-HIL-2620-9cd5d1da', 'FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2620-b7b2907a', 'FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-KYV3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2620-b2b2889b', 'FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2620-09dd3936', 'FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-B7', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2620-9dd5d36d', 'FL-VF-HIL-2620', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-A3--FL-VF-HIL-2620', '', ARRAY['claim-FL-VF-HIL-2620-59684d21','claim-FL-VF-HIL-2620-aef39a5f']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2660-9cd5d1da', 'FL-VF-HIL-2660', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-A2', '', ARRAY['claim-FL-VF-HIL-2660-b048085f']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2660-b7b2907a', 'FL-VF-HIL-2660', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-KYV3', '', ARRAY['claim-FL-VF-HIL-2660-b3b99570']::text[], true, 'stated'),
  ('pos-FL-VF-HIL-2660-b2b2889b', 'FL-VF-HIL-2660', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-KYV4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-HIL-2660-09dd3936', 'FL-VF-HIL-2660', 'FL-HIL-CC7-general', 'FL-HIL-CC7-general--issue-B7', '', ARRAY['claim-FL-VF-HIL-2660-e544ea7f']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-HIL-2620', 'FL-HIL-CC7-general', ARRAY[]::text[], ARRAY['claim-FL-VF-HIL-2620-59684d21','claim-FL-VF-HIL-2620-aef39a5f']::text[], ARRAY[]::text[], '{"word_count":140,"verifiable_fact_count":0,"stated_position_count":2,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-VF-HIL-2660', 'FL-HIL-CC7-general', ARRAY[]::text[], ARRAY['claim-FL-VF-HIL-2660-b048085f','claim-FL-VF-HIL-2660-b3b99570','claim-FL-VF-HIL-2660-e544ea7f']::text[], ARRAY[]::text[], '{"word_count":112,"verifiable_fact_count":0,"stated_position_count":3,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb)
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
  WHERE r.race_id = 'FL-HIL-CC7-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-HIL-CC7-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-HIL-CC7-general, then
-- set_race_publication once a human has read the brief.
