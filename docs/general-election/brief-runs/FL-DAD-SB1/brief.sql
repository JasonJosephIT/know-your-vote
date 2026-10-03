-- Brief rows for FL-DAD-SB1-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 2 source, 4 issue, 9 claim, 7 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":101,"no_issue_matched":15}
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
DELETE FROM claim    WHERE race_id = 'FL-DAD-SB1-general';
DELETE FROM position WHERE race_id = 'FL-DAD-SB1-general';
DELETE FROM issue    WHERE race_id = 'FL-DAD-SB1-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-14640cb5', 'https://lindaforschoolboard.com/', 'lindaforschoolboard.com', 'lindaforschoolboard.com', 'candidate_self', 'N/A', '2026-09-29T11:44:35Z'),
  ('src-aa85be86', 'https://lindaforschoolboard.com/es', 'lindaforschoolboard.com/es', 'lindaforschoolboard.com', 'candidate_self', 'N/A', '2026-09-29T11:44:35Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-DAD-SB1-general--issue-A6', 'FL-DAD-SB1-general', 'spine', NULL, 'Public school funding and teachers', NULL, NULL, 1),
  ('FL-DAD-SB1-general--issue-KYV9', 'FL-DAD-SB1-general', 'spine', NULL, 'School choice and vouchers', NULL, NULL, 2),
  ('FL-DAD-SB1-general--issue-KYV10', 'FL-DAD-SB1-general', 'spine', NULL, 'Career, vocational and higher education', NULL, NULL, 3),
  ('FL-DAD-SB1-general--issue-B1--FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'candidate', 'FL-VF-DAD-3076', 'Economy, inflation, and jobs', NULL, NULL, 100)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-VF-DAD-3076-a0c5a4d8', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', 'Audit district-mandated paperwork and cut duplicative reporting so teachers teach, not document.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-2d0e66a5', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', 'Protect and prioritize the voter-approved teacher-salary referendum — up for renewal on this term — toward competitive pay and retention.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-0627700c', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', 'Close the pay and working-condition gap with neighboring counties so we stop losing great teachers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-435573f9', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', 'Fight in Tallahassee for a real state investment in teacher salaries — Florida currently ranks 50th in the nation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-a0463068', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', 'Exigir cuentas para el Distrito 1 del bono escolar de $1.2 mil millones de 2012 — continuando la auditoría que pidió el propio ex miembro de este puesto — para saber si a nuestros edificios, aires acondicionados y tecnología les tocó lo justo.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-d8bdf3da', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', 'Proteger y priorizar el referéndum de salario docente que aprobaron los votantes — se renueva en este término — hacia sueldo competitivo y retención.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-6b526eb0', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-B1--FL-VF-DAD-3076', 'Proteger y priorizar el referéndum de salario docente que aprobaron los votantes — se renueva en este término — hacia sueldo competitivo y retención.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-b41bcbcc', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', 'Cerrar la brecha de sueldo y condiciones con los condados vecinos, para dejar de perder buenos maestros.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-VF-DAD-3076-09d65132', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-B1--FL-VF-DAD-3076', 'Cerrar la brecha de sueldo y condiciones con los condados vecinos, para dejar de perder buenos maestros.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-VF-DAD-3076-a0c5a4d8', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-2d0e66a5', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-0627700c', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-435573f9', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-a0463068', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com/es'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-d8bdf3da', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com/es'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-6b526eb0', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com/es'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-b41bcbcc', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com/es'
UNION ALL
  SELECT 'claim-FL-VF-DAD-3076-09d65132', source_id FROM source WHERE url_norm = 'lindaforschoolboard.com/es'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-VF-DAD-3070-98d5cb8e', 'FL-VF-DAD-3070', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-3070-adb280bc', 'FL-VF-DAD-3070', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-KYV9', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-3070-6c14946c', 'FL-VF-DAD-3070', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-KYV10', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-3076-98d5cb8e', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-A6', '', ARRAY['claim-FL-VF-DAD-3076-a0c5a4d8','claim-FL-VF-DAD-3076-2d0e66a5','claim-FL-VF-DAD-3076-0627700c','claim-FL-VF-DAD-3076-435573f9','claim-FL-VF-DAD-3076-a0463068','claim-FL-VF-DAD-3076-d8bdf3da','claim-FL-VF-DAD-3076-b41bcbcc']::text[], true, 'stated'),
  ('pos-FL-VF-DAD-3076-adb280bc', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-KYV9', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-3076-6c14946c', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-KYV10', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-VF-DAD-3076-0bdd3c5c', 'FL-VF-DAD-3076', 'FL-DAD-SB1-general', 'FL-DAD-SB1-general--issue-B1--FL-VF-DAD-3076', '', ARRAY['claim-FL-VF-DAD-3076-6b526eb0','claim-FL-VF-DAD-3076-09d65132']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-VF-DAD-3070', 'FL-DAD-SB1-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":3,"spine_issues_covered":0}'::jsonb),
  ('FL-VF-DAD-3076', 'FL-DAD-SB1-general', ARRAY[]::text[], ARRAY['claim-FL-VF-DAD-3076-a0c5a4d8','claim-FL-VF-DAD-3076-2d0e66a5','claim-FL-VF-DAD-3076-0627700c','claim-FL-VF-DAD-3076-435573f9','claim-FL-VF-DAD-3076-a0463068','claim-FL-VF-DAD-3076-d8bdf3da','claim-FL-VF-DAD-3076-6b526eb0','claim-FL-VF-DAD-3076-b41bcbcc','claim-FL-VF-DAD-3076-09d65132']::text[], ARRAY[]::text[], '{"word_count":191,"verifiable_fact_count":0,"stated_position_count":9,"fact_checks_performed":0,"spine_issue_count":3,"spine_issues_covered":1}'::jsonb)
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
  WHERE r.race_id = 'FL-DAD-SB1-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-DAD-SB1-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-DAD-SB1-general, then
-- set_race_publication once a human has read the brief.
