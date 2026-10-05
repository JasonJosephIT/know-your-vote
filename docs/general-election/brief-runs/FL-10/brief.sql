-- Brief rows for FL-10-general, built by scripts/brief-rows-sql.ts.
-- Generated from 1 policy run(s) for 1 candidate(s). Review before applying.
--
-- 1 source, 6 issue, 4 claim, 6 position, 1 profile rows.
-- Passages that produced no row: {"states_no_policy":11}
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
DELETE FROM claim    WHERE race_id = 'FL-10-general';
DELETE FROM position WHERE race_id = 'FL-10-general';
DELETE FROM issue    WHERE race_id = 'FL-10-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-daf9dbe2', 'https://www.frostforcongress.com/', 'www.frostforcongress.com', 'www.frostforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:41:49Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-10-general--issue-B1', 'FL-10-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-10-general--issue-B2', 'FL-10-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-10-general--issue-B3', 'FL-10-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-10-general--issue-B4', 'FL-10-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-10-general--issue-B7--FL-DOE-89909', 'FL-10-general', 'candidate', 'FL-DOE-89909', 'Crime policy, policing and courts', NULL, NULL, 100),
  ('FL-10-general--issue-B8--FL-DOE-89909', 'FL-10-general', 'candidate', 'FL-DOE-89909', 'Climate and environment (national)', NULL, NULL, 101)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-89909-f4af7195', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B2', 'I’m running for Congress because I know we won’t change the system until we change our leadership. It’s time for poor, working-class, and young people to have a seat at the table. As the first generation-z member of Congress, from day one , I will fight to end gun violence, win Medicare For All, transform our racist criminal justice system, and end the climate crisis.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89909-52e47f5f', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B4', 'I’m running for Congress because I know we won’t change the system until we change our leadership. It’s time for poor, working-class, and young people to have a seat at the table. As the first generation-z member of Congress, from day one , I will fight to end gun violence, win Medicare For All, transform our racist criminal justice system, and end the climate crisis.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89909-284b1dcc', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B7--FL-DOE-89909', 'I’m running for Congress because I know we won’t change the system until we change our leadership. It’s time for poor, working-class, and young people to have a seat at the table. As the first generation-z member of Congress, from day one , I will fight to end gun violence, win Medicare For All, transform our racist criminal justice system, and end the climate crisis.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89909-6d3851cb', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B8--FL-DOE-89909', 'I’m running for Congress because I know we won’t change the system until we change our leadership. It’s time for poor, working-class, and young people to have a seat at the table. As the first generation-z member of Congress, from day one , I will fight to end gun violence, win Medicare For All, transform our racist criminal justice system, and end the climate crisis.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-89909-f4af7195', source_id FROM source WHERE url_norm = 'www.frostforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89909-52e47f5f', source_id FROM source WHERE url_norm = 'www.frostforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89909-284b1dcc', source_id FROM source WHERE url_norm = 'www.frostforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89909-6d3851cb', source_id FROM source WHERE url_norm = 'www.frostforcongress.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89909-0bdd3c5c', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89909-0edd4115', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B2', '', ARRAY['claim-FL-DOE-89909-f4af7195']::text[], true, 'stated'),
  ('pos-FL-DOE-89909-0ddd3f82', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89909-08dd37a3', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B4', '', ARRAY['claim-FL-DOE-89909-52e47f5f']::text[], true, 'stated'),
  ('pos-FL-DOE-89909-09dd3936', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B7--FL-DOE-89909', '', ARRAY['claim-FL-DOE-89909-284b1dcc']::text[], true, 'stated'),
  ('pos-FL-DOE-89909-14dd4a87', 'FL-DOE-89909', 'FL-10-general', 'FL-10-general--issue-B8--FL-DOE-89909', '', ARRAY['claim-FL-DOE-89909-6d3851cb']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89909', 'FL-10-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89909-f4af7195','claim-FL-DOE-89909-52e47f5f','claim-FL-DOE-89909-284b1dcc','claim-FL-DOE-89909-6d3851cb']::text[], ARRAY[]::text[], '{"word_count":260,"verifiable_fact_count":0,"stated_position_count":4,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-10-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-10-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-10-general, then
-- set_race_publication once a human has read the brief.
