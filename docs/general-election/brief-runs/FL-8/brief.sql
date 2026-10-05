-- Brief rows for FL-8-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 3 source, 11 issue, 22 claim, 15 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":44,"no_issue_matched":8}
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
DELETE FROM claim    WHERE race_id = 'FL-8-general';
DELETE FROM position WHERE race_id = 'FL-8-general';
DELETE FROM issue    WHERE race_id = 'FL-8-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-35f4a741', 'https://www.mike4congress.com/', 'www.mike4congress.com', 'www.mike4congress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:54Z'),
  ('src-88faf4fe', 'https://www.mike4congress.com/issues', 'www.mike4congress.com/issues', 'www.mike4congress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:54Z'),
  ('src-7d7805fa', 'https://jenkinsforfl.com/priorities', 'jenkinsforfl.com/priorities', 'jenkinsforfl.com', 'candidate_self', 'N/A', '2026-09-29T11:43:54Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-8-general--issue-B1', 'FL-8-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-8-general--issue-B2', 'FL-8-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-8-general--issue-B3', 'FL-8-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-8-general--issue-B4', 'FL-8-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-8-general--issue-A2--FL-DOE-89522', 'FL-8-general', 'candidate', 'FL-DOE-89522', 'Housing affordability', NULL, NULL, 100),
  ('FL-8-general--issue-B6--FL-DOE-89522', 'FL-8-general', 'candidate', 'FL-DOE-89522', 'Election integrity', NULL, NULL, 101),
  ('FL-8-general--issue-A7--FL-DOE-89522', 'FL-8-general', 'candidate', 'FL-DOE-89522', 'Elections administration and voting access', NULL, NULL, 102),
  ('FL-8-general--issue-B7--FL-DOE-89522', 'FL-8-general', 'candidate', 'FL-DOE-89522', 'Crime policy, policing and courts', NULL, NULL, 103),
  ('FL-8-general--issue-A1--FL-DOE-90831', 'FL-8-general', 'candidate', 'FL-DOE-90831', 'Property insurance costs', NULL, NULL, 100),
  ('FL-8-general--issue-B7--FL-DOE-90831', 'FL-8-general', 'candidate', 'FL-DOE-90831', 'Crime policy, policing and courts', NULL, NULL, 101),
  ('FL-8-general--issue-A6--FL-DOE-90831', 'FL-8-general', 'candidate', 'FL-DOE-90831', 'Public school funding and teachers', NULL, NULL, 102)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-89522-f00a2024', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-A2--FL-DOE-89522', 'In Congress, he focuses his efforts on supporting our space industry, improving the water quality of our Indian River Lagoon, fighting to protect election integrity, banning insider trading in Congress, and expanding access to affordable housing.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-228ac665', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B6--FL-DOE-89522', 'In Congress, he focuses his efforts on supporting our space industry, improving the water quality of our Indian River Lagoon, fighting to protect election integrity, banning insider trading in Congress, and expanding access to affordable housing.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-380a7f6c', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-A7--FL-DOE-89522', 'Protecting Our Elections Mike Haridopolos believes free and fair elections start with ensuring American elections are decided by American citizens. He supports the SAVE America Act and commonsense voter verification measures to protect the integrity of the ballot box and restore confidence in our elections.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-4b0b7984', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B6--FL-DOE-89522', 'Protecting Our Elections Mike Haridopolos believes free and fair elections start with ensuring American elections are decided by American citizens. He supports the SAVE America Act and commonsense voter verification measures to protect the integrity of the ballot box and restore confidence in our elections.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-96a9046b', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B1', 'Stopping Illegal Immigration Addressing the catastrophic crisis at our southern border and securing our nation’s borders. Fixing Our Economy Making the American economy work for our families once again. Out-of-control inflation, higher taxes, and reckless spending are putting the American Dream out of reach for millions of Americans. Reducing National Debt Fighting reckless spending to preserve Social Security and Medicare for future generations. Mike faced a $4B budget shortfall in Florida and found common-sense solutions to balance the budget. He will do this again in Congress. End Weaponization of Justice Putting a stop to the misuse of the justice system.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-8a0b7d25', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B3', 'Stopping Illegal Immigration Addressing the catastrophic crisis at our southern border and securing our nation’s borders. Fixing Our Economy Making the American economy work for our families once again. Out-of-control inflation, higher taxes, and reckless spending are putting the American Dream out of reach for millions of Americans. Reducing National Debt Fighting reckless spending to preserve Social Security and Medicare for future generations. Mike faced a $4B budget shortfall in Florida and found common-sense solutions to balance the budget. He will do this again in Congress. End Weaponization of Justice Putting a stop to the misuse of the justice system.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-527d1f26', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B4', 'Stopping Illegal Immigration Addressing the catastrophic crisis at our southern border and securing our nation’s borders. Fixing Our Economy Making the American economy work for our families once again. Out-of-control inflation, higher taxes, and reckless spending are putting the American Dream out of reach for millions of Americans. Reducing National Debt Fighting reckless spending to preserve Social Security and Medicare for future generations. Mike faced a $4B budget shortfall in Florida and found common-sense solutions to balance the budget. He will do this again in Congress. End Weaponization of Justice Putting a stop to the misuse of the justice system.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-68f8e7e0', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B7--FL-DOE-89522', 'Mike will stand shoulder-to-shoulder key allies to end the weaponization of our justice system. Protecting the Indian River Lagoon Advancing common sense ideas to protect our environment and joining the Congressional Estuary Caucus. Supporting Space Exploration Promoting high-paying jobs and technological innovation through space exploration. Space is key to American technological innovation as well as our national security. Tackling Crime & Public Safety Backing law enforcement and defending Second Amendment rights. Mike will always “Back the Blue” and is grateful for the support of the Sheriffs of both Brevard and Indian River Counties.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-4e1fc035', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B3', 'Understanding the key issues that impact our country is crucial for making informed decisions. Mike Haridopolos is dedicated to addressing the most pressing concerns facing our district and our nation. From stopping illegal immigration to fixing our economy, reducing national debt, protecting the Indian River Lagoon, and supporting space exploration, Mike''s comprehensive policy agenda is designed to build a stronger future. See below how Mike plans to lead with integrity, strength and effective solutions.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-80050670', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-A7--FL-DOE-89522', 'For too long, Washington Democrats have fought against commonsense election safeguards. I’m fighting to restore trust in our elections by supporting the SAVE America Act and ensuring proper voter verification measures are in place.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-1df28da8', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B6--FL-DOE-89522', 'For too long, Washington Democrats have fought against commonsense election safeguards. I’m fighting to restore trust in our elections by supporting the SAVE America Act and ensuring proper voter verification measures are in place.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-f70a8906', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B6--FL-DOE-89522', '​ Protecting the ballot box isn’t partisan — it’s common sense. The American people deserve confidence that their voices will be heard and their votes will be protected. I will continue fighting for election integrity and standing up against efforts to undermine our democratic process.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-3135e832', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B1', 'Joe Biden’s economy crushed working families. Out-of control inflation, higher taxes, and reckless spending put the American Dream out of reach for millions of Americans. Under President Trump’s leadership, Mike helped pass historic tax relief and provided more opportunities for small businesses to grow than ever before. Mike understands that burdensome federal and state regulations and mandates stifle economic growth and job creation. Mike will stand against federal mandates that hurt small businesses and families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89522-4ec4f47d', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B2', 'Under Obamacare, prices have been spiraling out of control, and free-market competitive pricing has been reduced; keeping healthcare more expensive. Mike will always support measures that provide patient centered care and competition in the marketplace. Mike stands firm against any single-payer healthcare system.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-4cdc5521', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-A1--FL-DOE-90831', 'Stabilize Florida’s property insurance market through bipartisan federal reinsurance and catastrophe backstops.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-39cfec2b', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B1', 'Oppose reckless tariffs that drive up the cost of everyday goods.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-0a42bfa1', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B2', 'Expand Medicaid so Floridians aren’t forced into emergency care or medical debt.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-b9822dd9', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B2', 'Restore and strengthen ACA subsidies to lower premiums immediately.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-6455e425', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B2', 'Protect coverage for pre-existing conditions and invest in access to mental health care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-5445da99', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B7--FL-DOE-90831', 'Ensure first responders have stable funding, training, and mental health support.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-318469b1', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B7--FL-DOE-90831', 'Support evidence-based public safety strategies that reduce violence and recidivism.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90831-3f7a4fbc', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-A6--FL-DOE-90831', 'Expand Title I and invest in teachers, classrooms, and student mental health.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-89522-f00a2024', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-228ac665', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-380a7f6c', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-4b0b7984', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-96a9046b', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-8a0b7d25', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-527d1f26', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-68f8e7e0', source_id FROM source WHERE url_norm = 'www.mike4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-89522-4e1fc035', source_id FROM source WHERE url_norm = 'www.mike4congress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89522-80050670', source_id FROM source WHERE url_norm = 'www.mike4congress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89522-1df28da8', source_id FROM source WHERE url_norm = 'www.mike4congress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89522-f70a8906', source_id FROM source WHERE url_norm = 'www.mike4congress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89522-3135e832', source_id FROM source WHERE url_norm = 'www.mike4congress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89522-4ec4f47d', source_id FROM source WHERE url_norm = 'www.mike4congress.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90831-4cdc5521', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90831-39cfec2b', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90831-0a42bfa1', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90831-b9822dd9', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90831-6455e425', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90831-5445da99', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90831-318469b1', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90831-3f7a4fbc', source_id FROM source WHERE url_norm = 'jenkinsforfl.com/priorities'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89522-0bdd3c5c', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B1', '', ARRAY['claim-FL-DOE-89522-96a9046b','claim-FL-DOE-89522-3135e832']::text[], true, 'stated'),
  ('pos-FL-DOE-89522-0edd4115', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B2', '', ARRAY['claim-FL-DOE-89522-4ec4f47d']::text[], true, 'stated'),
  ('pos-FL-DOE-89522-0ddd3f82', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B3', '', ARRAY['claim-FL-DOE-89522-8a0b7d25','claim-FL-DOE-89522-4e1fc035']::text[], true, 'stated'),
  ('pos-FL-DOE-89522-08dd37a3', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B4', '', ARRAY['claim-FL-DOE-89522-527d1f26']::text[], true, 'stated'),
  ('pos-FL-DOE-89522-9cd5d1da', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-A2--FL-DOE-89522', '', ARRAY['claim-FL-DOE-89522-f00a2024']::text[], true, 'stated'),
  ('pos-FL-DOE-89522-0add3ac9', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B6--FL-DOE-89522', '', ARRAY['claim-FL-DOE-89522-228ac665','claim-FL-DOE-89522-4b0b7984','claim-FL-DOE-89522-1df28da8','claim-FL-DOE-89522-f70a8906']::text[], true, 'stated'),
  ('pos-FL-DOE-89522-99d5cd21', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-A7--FL-DOE-89522', '', ARRAY['claim-FL-DOE-89522-380a7f6c','claim-FL-DOE-89522-80050670']::text[], true, 'stated'),
  ('pos-FL-DOE-89522-09dd3936', 'FL-DOE-89522', 'FL-8-general', 'FL-8-general--issue-B7--FL-DOE-89522', '', ARRAY['claim-FL-DOE-89522-68f8e7e0']::text[], true, 'stated'),
  ('pos-FL-DOE-90831-0bdd3c5c', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B1', '', ARRAY['claim-FL-DOE-90831-39cfec2b']::text[], true, 'stated'),
  ('pos-FL-DOE-90831-0edd4115', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B2', '', ARRAY['claim-FL-DOE-90831-0a42bfa1','claim-FL-DOE-90831-b9822dd9','claim-FL-DOE-90831-6455e425']::text[], true, 'stated'),
  ('pos-FL-DOE-90831-0ddd3f82', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90831-08dd37a3', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90831-9bd5d047', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-A1--FL-DOE-90831', '', ARRAY['claim-FL-DOE-90831-4cdc5521']::text[], true, 'stated'),
  ('pos-FL-DOE-90831-09dd3936', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-B7--FL-DOE-90831', '', ARRAY['claim-FL-DOE-90831-5445da99','claim-FL-DOE-90831-318469b1']::text[], true, 'stated'),
  ('pos-FL-DOE-90831-98d5cb8e', 'FL-DOE-90831', 'FL-8-general', 'FL-8-general--issue-A6--FL-DOE-90831', '', ARRAY['claim-FL-DOE-90831-3f7a4fbc']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89522', 'FL-8-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89522-f00a2024','claim-FL-DOE-89522-228ac665','claim-FL-DOE-89522-380a7f6c','claim-FL-DOE-89522-4b0b7984','claim-FL-DOE-89522-96a9046b','claim-FL-DOE-89522-8a0b7d25','claim-FL-DOE-89522-527d1f26','claim-FL-DOE-89522-68f8e7e0','claim-FL-DOE-89522-4e1fc035','claim-FL-DOE-89522-80050670','claim-FL-DOE-89522-1df28da8','claim-FL-DOE-89522-f70a8906','claim-FL-DOE-89522-3135e832','claim-FL-DOE-89522-4ec4f47d']::text[], ARRAY[]::text[], '{"word_count":860,"verifiable_fact_count":0,"stated_position_count":14,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb),
  ('FL-DOE-90831', 'FL-8-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90831-4cdc5521','claim-FL-DOE-90831-39cfec2b','claim-FL-DOE-90831-0a42bfa1','claim-FL-DOE-90831-b9822dd9','claim-FL-DOE-90831-6455e425','claim-FL-DOE-90831-5445da99','claim-FL-DOE-90831-318469b1','claim-FL-DOE-90831-3f7a4fbc']::text[], ARRAY[]::text[], '{"word_count":90,"verifiable_fact_count":0,"stated_position_count":8,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-8-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-8-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-8-general, then
-- set_race_publication once a human has read the brief.
