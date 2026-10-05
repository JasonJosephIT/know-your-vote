-- Brief rows for FL-BRO-SB1-general, built by scripts/brief-rows-sql.ts.
-- Generated from 1 policy run(s) for 1 candidate(s). Review before applying.
--
-- 1 source, 3 issue, 1 claim, 3 position, 1 profile rows.
-- Passages that produced no row: {"states_no_policy":17}
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
DELETE FROM claim    WHERE race_id = 'FL-BRO-SB1-general';
DELETE FROM position WHERE race_id = 'FL-BRO-SB1-general';
DELETE FROM issue    WHERE race_id = 'FL-BRO-SB1-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-00da74c7', 'https://www.mauraforbroward.com/', 'www.mauraforbroward.com', 'www.mauraforbroward.com', 'candidate_self', 'N/A', '2026-09-29T11:43:55Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-BRO-SB1-general--issue-A6', 'FL-BRO-SB1-general', 'spine', NULL, 'Public school funding and teachers', NULL, NULL, 1),
  ('FL-BRO-SB1-general--issue-KYV9', 'FL-BRO-SB1-general', 'spine', NULL, 'School choice and vouchers', NULL, NULL, 2),
  ('FL-BRO-SB1-general--issue-KYV10', 'FL-BRO-SB1-general', 'spine', NULL, 'Career, vocational and higher education', NULL, NULL, 3)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-BRO-1194-1df12a39', 'FL-VF-BRO-1194', 'FL-BRO-SB1-general', 'FL-BRO-SB1-general--issue-A6', 'I believe in creating a nurturing, safe learning environment for all students, where they can explore diverse ideas and perspectives. Our schools must be places where students thrive, and teachers are valued and supported. Our teachers deserve competitive pay and the resources they need to succeed. They are the backbone of our schools, and I will fight for them.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-BRO-1194-1df12a39', source_id FROM source WHERE url_norm = 'www.mauraforbroward.com'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-BRO-1194-98d5cb8e', 'FL-VF-BRO-1194', 'FL-BRO-SB1-general', 'FL-BRO-SB1-general--issue-A6', '', ARRAY['claim-FL-VF-BRO-1194-1df12a39']::text[], true, 'stated'),
  ('pos-FL-VF-BRO-1194-adb280bc', 'FL-VF-BRO-1194', 'FL-BRO-SB1-general', 'FL-BRO-SB1-general--issue-KYV9', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-BRO-1194-6c14946c', 'FL-VF-BRO-1194', 'FL-BRO-SB1-general', 'FL-BRO-SB1-general--issue-KYV10', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-BRO-1194', 'FL-BRO-SB1-general', ARRAY[]::text[], ARRAY['claim-FL-VF-BRO-1194-1df12a39']::text[], ARRAY[]::text[], '{"word_count":59,"verifiable_fact_count":0,"stated_position_count":1,"fact_checks_performed":0,"spine_issue_count":3,"spine_issues_covered":1}'::jsonb)
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
  WHERE r.race_id = 'FL-BRO-SB1-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-BRO-SB1-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-BRO-SB1-general, then
-- set_race_publication once a human has read the brief.
