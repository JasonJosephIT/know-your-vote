-- Brief rows for FL-20-general, built by scripts/brief-rows-sql.ts.
-- Generated from 3 policy run(s) for 3 candidate(s). Review before applying.
--
-- 9 source, 9 issue, 44 claim, 17 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":80,"no_issue_matched":11}
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
DELETE FROM claim    WHERE race_id = 'FL-20-general';
DELETE FROM position WHERE race_id = 'FL-20-general';
DELETE FROM issue    WHERE race_id = 'FL-20-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-d7db2319', 'https://www.maximeforcongress.com/', 'www.maximeforcongress.com', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-9a91cb32', 'https://www.maximeforcongress.com/jobs', 'www.maximeforcongress.com/jobs', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-51a65378', 'https://www.maximeforcongress.com/immigration', 'www.maximeforcongress.com/immigration', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-fbc52e59', 'https://www.maximeforcongress.com/healthcare', 'www.maximeforcongress.com/healthcare', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-415c7e18', 'https://www.maximeforcongress.com/education', 'www.maximeforcongress.com/education', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-34ab0c4c', 'https://www.maximeforcongress.com/lower-costs', 'www.maximeforcongress.com/lower-costs', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-8b7851e6', 'https://www.maximeforcongress.com/students', 'www.maximeforcongress.com/students', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-377b00d1', 'https://www.maximeforcongress.com/ownership-equity', 'www.maximeforcongress.com/ownership-equity', 'www.maximeforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z'),
  ('src-8ed1d74f', 'https://brentandersenfl.com/meet-brent', 'brentandersenfl.com/meet-brent', 'brentandersenfl.com', 'candidate_self', 'N/A', '2026-09-29T11:42:44Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-20-general--issue-B1', 'FL-20-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-20-general--issue-B2', 'FL-20-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-20-general--issue-B3', 'FL-20-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-20-general--issue-B4', 'FL-20-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-20-general--issue-A2--FL-DOE-90814', 'FL-20-general', 'candidate', 'FL-DOE-90814', 'Housing affordability', NULL, NULL, 100),
  ('FL-20-general--issue-A6--FL-DOE-90814', 'FL-20-general', 'candidate', 'FL-DOE-90814', 'Public school funding and teachers', NULL, NULL, 101),
  ('FL-20-general--issue-KYV10--FL-DOE-90814', 'FL-20-general', 'candidate', 'FL-DOE-90814', 'Career, vocational and higher education', NULL, NULL, 102),
  ('FL-20-general--issue-A4--FL-DOE-90814', 'FL-20-general', 'candidate', 'FL-DOE-90814', 'Cost of living in Florida', NULL, NULL, 103),
  ('FL-20-general--issue-A4--FL-DOE-91278', 'FL-20-general', 'candidate', 'FL-DOE-91278', 'Cost of living in Florida', NULL, NULL, 100)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-90814-57a81da1', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A2--FL-DOE-90814', 'Families are being squeezed by housing, groceries, insurance, and healthcare. Dr. Maxime will fight to bring costs down and open real pathways to ownership and long-term wealth.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-25f3455b', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', 'Families are being squeezed by housing, groceries, insurance, and healthcare. Dr. Maxime will fight to bring costs down and open real pathways to ownership and long-term wealth.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-4969b0cc', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Families are being squeezed by housing, groceries, insurance, and healthcare. Dr. Maxime will fight to bring costs down and open real pathways to ownership and long-term wealth.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-65e33c05', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Seniors rationing insulin. Parents skipping their own care. Families going bankrupt from a single hospital bill. Dr. Maxime will fight to lower drug costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-37818dfc', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A6--FL-DOE-90814', 'Our schools are underfunded and our teachers underpaid. Dr. Maxime will fight to raise funding and pay, and build real pathways to careers site-wide.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-51bab1b3', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', 'Dr. Maxime will fight for the jobs, training, and protections District 20 workers deserve:', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-f2794d31', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Invest in workforce training aligned to South Florida''s real industries — healthcare, construction, logistics, hospitality, and skilled trades.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-4e84b3e1', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', 'Invest in workforce training aligned to South Florida''s real industries — healthcare, construction, logistics, hospitality, and skilled trades.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-8357cb52', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Expand apprenticeship pathways so workers can earn while they learn.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-607e9662', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', 'Expand apprenticeship pathways so workers can earn while they learn.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-d07df3d8', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A4--FL-DOE-90814', 'Support fair wages that keep pace with the actual cost of living in South Florida.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-d8edc0f4', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', 'Support fair wages that keep pace with the actual cost of living in South Florida.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-82edcf3e', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B4', 'Defend earned benefits — Social Security, Medicare, and workplace protections — from cuts.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-4feb218d', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', 'Protect the right to organize and negotiate for fair pay and safe conditions.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-4bd2ae18', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B3', 'Dr. Kedner Maxime''s balanced plan — secure borders, fair laws, a legal path for those who follow the law, and family reunification.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-a53ef162', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B3', 'Secure borders that protect our communities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-aed98fa9', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B3', 'A clear, fair pathway to legal permanent residency for those who follow the law.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-762e162d', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Dr. Kedner Maxime''s plan to lower prescription drug costs, protect pre-existing conditions, expand access, and strengthen community health centers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-2475351a', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Lower prescription drug costs so no senior has to choose between insulin and groceries.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-ed8218fe', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Protect coverage for people with pre-existing conditions — no one should lose care because of a diagnosis outside their control.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-9852504e', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Expand access to affordable care for working families, the self-employed, and small-business owners.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-10255205', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Strengthen the community health centers that serve our most vulnerable neighbors — the safety net working families rely on.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-04a2d73a', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Bring transparency to hospital and insurance billing so families aren''t blindsided by charges they never agreed to.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-21cb3d0a', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Healthcare is not a luxury. It''s a right. And in Congress, Dr. Maxime will fight for that right — for every family in District 20.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-597dd75b', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A6--FL-DOE-90814', 'Dr. Maxime plans to work to raise school funding and teacher pay, expand vocational training, and build real career pathways for District 20''s young people.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-0299665d', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Dr. Maxime plans to work to raise school funding and teacher pay, expand vocational training, and build real career pathways for District 20''s young people.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-71483f64', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A6--FL-DOE-90814', 'Raise public-school funding so classrooms have the resources, materials, and support they need.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-ee02bade', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Expand vocational and technical training so students who don''t take a four-year path still have a real path.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-fb434ea0', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A6--FL-DOE-90814', 'Raise teacher salaries so we can recruit and keep the great educators our children deserve.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-1d3bc9fd', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Build real pathways — apprenticeships, dual enrollment, industry partnerships — so a diploma opens doors, not just closes a chapter.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-bc7e6c5d', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A2--FL-DOE-90814', 'Dr. Kedner Maxime''s plan to lower everyday costs for District 20 families — housing, groceries, healthcare — and open real pathways to ownership.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-1b42d450', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', 'Dr. Kedner Maxime''s plan to lower everyday costs for District 20 families — housing, groceries, healthcare — and open real pathways to ownership.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-a230f1fc', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', 'Support responsible federal spending and fair competition that brings inflation down and stops price gouging.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-2905114d', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A2--FL-DOE-90814', 'Expand affordable housing so working families, seniors, and young people can find a home they can actually afford.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-bbe2c1e1', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B4', 'Protect Social Security, Medicare, and the earned benefits working people paid into their whole lives.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-3ecc781e', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A2--FL-DOE-90814', 'Back responsible first-time-homebuyer assistance so more District 20 families move from renting to owning.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-933698b7', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Expand Pell grants and make community college genuinely affordable.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-53b82696', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Grow apprenticeship and vocational pathways so a trade is a real career, not a fallback.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-48fc950a', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Protect and strengthen trade schools and technical training programs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-8e1b7aed', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', 'Invest in mentorship, internships, and workforce partnerships that keep District 20 talent in District 20.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-1742c08a', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A2--FL-DOE-90814', 'Expand responsible first-time-homebuyer assistance so renting doesn''t have to be forever.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90814-9eafa7a4', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B4', 'Defend Social Security and Medicare — the earned benefits working people paid into.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91278-921d3b36', 'FL-DOE-91278', 'FL-20-general', 'FL-20-general--issue-A4--FL-DOE-91278', 'A devoted husband to Yula and father to their young daughter, Brent understands the pressures Florida families face every day—from skyrocketing insurance premiums and housing costs to taxes, healthcare access, and education. He is running to bring common-sense conservative leadership to Washington: fiscal responsibility, market-based solutions that lower costs for working families, strong borders and law enforcement, policies that empower parents, and a commitment to protecting the American Dream for the next generation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91278-623defdc', 'FL-DOE-91278', 'FL-20-general', 'FL-20-general--issue-B3', 'A devoted husband to Yula and father to their young daughter, Brent understands the pressures Florida families face every day—from skyrocketing insurance premiums and housing costs to taxes, healthcare access, and education. He is running to bring common-sense conservative leadership to Washington: fiscal responsibility, market-based solutions that lower costs for working families, strong borders and law enforcement, policies that empower parents, and a commitment to protecting the American Dream for the next generation.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-90814-57a81da1', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90814-25f3455b', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90814-4969b0cc', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90814-65e33c05', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90814-37818dfc', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90814-51bab1b3', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-f2794d31', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-4e84b3e1', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-8357cb52', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-607e9662', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-d07df3d8', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-d8edc0f4', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-82edcf3e', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-4feb218d', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/jobs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-4bd2ae18', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-90814-a53ef162', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-90814-aed98fa9', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-90814-762e162d', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90814-2475351a', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90814-ed8218fe', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90814-9852504e', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90814-10255205', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90814-04a2d73a', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90814-21cb3d0a', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90814-597dd75b', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/education'
UNION ALL
  SELECT 'claim-FL-DOE-90814-0299665d', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/education'
UNION ALL
  SELECT 'claim-FL-DOE-90814-71483f64', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/education'
UNION ALL
  SELECT 'claim-FL-DOE-90814-ee02bade', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/education'
UNION ALL
  SELECT 'claim-FL-DOE-90814-fb434ea0', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/education'
UNION ALL
  SELECT 'claim-FL-DOE-90814-1d3bc9fd', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/education'
UNION ALL
  SELECT 'claim-FL-DOE-90814-bc7e6c5d', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/lower-costs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-1b42d450', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/lower-costs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-a230f1fc', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/lower-costs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-2905114d', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/lower-costs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-bbe2c1e1', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/lower-costs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-3ecc781e', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/lower-costs'
UNION ALL
  SELECT 'claim-FL-DOE-90814-933698b7', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/students'
UNION ALL
  SELECT 'claim-FL-DOE-90814-53b82696', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/students'
UNION ALL
  SELECT 'claim-FL-DOE-90814-48fc950a', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/students'
UNION ALL
  SELECT 'claim-FL-DOE-90814-8e1b7aed', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/students'
UNION ALL
  SELECT 'claim-FL-DOE-90814-1742c08a', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/ownership-equity'
UNION ALL
  SELECT 'claim-FL-DOE-90814-9eafa7a4', source_id FROM source WHERE url_norm = 'www.maximeforcongress.com/ownership-equity'
UNION ALL
  SELECT 'claim-FL-DOE-91278-921d3b36', source_id FROM source WHERE url_norm = 'brentandersenfl.com/meet-brent'
UNION ALL
  SELECT 'claim-FL-DOE-91278-623defdc', source_id FROM source WHERE url_norm = 'brentandersenfl.com/meet-brent'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-90814-0bdd3c5c', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B1', '', ARRAY['claim-FL-DOE-90814-25f3455b','claim-FL-DOE-90814-51bab1b3','claim-FL-DOE-90814-4e84b3e1','claim-FL-DOE-90814-607e9662','claim-FL-DOE-90814-d8edc0f4','claim-FL-DOE-90814-4feb218d','claim-FL-DOE-90814-a230f1fc']::text[], true, 'stated'),
  ('pos-FL-DOE-90814-0edd4115', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B2', '', ARRAY['claim-FL-DOE-90814-4969b0cc','claim-FL-DOE-90814-65e33c05','claim-FL-DOE-90814-762e162d','claim-FL-DOE-90814-2475351a','claim-FL-DOE-90814-ed8218fe','claim-FL-DOE-90814-9852504e','claim-FL-DOE-90814-10255205','claim-FL-DOE-90814-04a2d73a','claim-FL-DOE-90814-21cb3d0a','claim-FL-DOE-90814-1b42d450']::text[], true, 'stated'),
  ('pos-FL-DOE-90814-0ddd3f82', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B3', '', ARRAY['claim-FL-DOE-90814-4bd2ae18','claim-FL-DOE-90814-a53ef162','claim-FL-DOE-90814-aed98fa9']::text[], true, 'stated'),
  ('pos-FL-DOE-90814-08dd37a3', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-B4', '', ARRAY['claim-FL-DOE-90814-82edcf3e','claim-FL-DOE-90814-bbe2c1e1','claim-FL-DOE-90814-9eafa7a4']::text[], true, 'stated'),
  ('pos-FL-DOE-90814-9cd5d1da', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A2--FL-DOE-90814', '', ARRAY['claim-FL-DOE-90814-57a81da1','claim-FL-DOE-90814-bc7e6c5d','claim-FL-DOE-90814-2905114d','claim-FL-DOE-90814-3ecc781e','claim-FL-DOE-90814-1742c08a']::text[], true, 'stated'),
  ('pos-FL-DOE-90814-98d5cb8e', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A6--FL-DOE-90814', '', ARRAY['claim-FL-DOE-90814-37818dfc','claim-FL-DOE-90814-597dd75b','claim-FL-DOE-90814-71483f64','claim-FL-DOE-90814-fb434ea0']::text[], true, 'stated'),
  ('pos-FL-DOE-90814-6c14946c', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-KYV10--FL-DOE-90814', '', ARRAY['claim-FL-DOE-90814-f2794d31','claim-FL-DOE-90814-8357cb52','claim-FL-DOE-90814-0299665d','claim-FL-DOE-90814-ee02bade','claim-FL-DOE-90814-1d3bc9fd','claim-FL-DOE-90814-933698b7','claim-FL-DOE-90814-53b82696','claim-FL-DOE-90814-48fc950a','claim-FL-DOE-90814-8e1b7aed']::text[], true, 'stated'),
  ('pos-FL-DOE-90814-96d5c868', 'FL-DOE-90814', 'FL-20-general', 'FL-20-general--issue-A4--FL-DOE-90814', '', ARRAY['claim-FL-DOE-90814-d07df3d8']::text[], true, 'stated'),
  ('pos-FL-DOE-91278-0bdd3c5c', 'FL-DOE-91278', 'FL-20-general', 'FL-20-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91278-0edd4115', 'FL-DOE-91278', 'FL-20-general', 'FL-20-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91278-0ddd3f82', 'FL-DOE-91278', 'FL-20-general', 'FL-20-general--issue-B3', '', ARRAY['claim-FL-DOE-91278-623defdc']::text[], true, 'stated'),
  ('pos-FL-DOE-91278-08dd37a3', 'FL-DOE-91278', 'FL-20-general', 'FL-20-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91278-96d5c868', 'FL-DOE-91278', 'FL-20-general', 'FL-20-general--issue-A4--FL-DOE-91278', '', ARRAY['claim-FL-DOE-91278-921d3b36']::text[], true, 'stated'),
  ('pos-FL-DOE-91577-0bdd3c5c', 'FL-DOE-91577', 'FL-20-general', 'FL-20-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91577-0edd4115', 'FL-DOE-91577', 'FL-20-general', 'FL-20-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91577-0ddd3f82', 'FL-DOE-91577', 'FL-20-general', 'FL-20-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91577-08dd37a3', 'FL-DOE-91577', 'FL-20-general', 'FL-20-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-90814', 'FL-20-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90814-57a81da1','claim-FL-DOE-90814-25f3455b','claim-FL-DOE-90814-4969b0cc','claim-FL-DOE-90814-65e33c05','claim-FL-DOE-90814-37818dfc','claim-FL-DOE-90814-51bab1b3','claim-FL-DOE-90814-f2794d31','claim-FL-DOE-90814-4e84b3e1','claim-FL-DOE-90814-8357cb52','claim-FL-DOE-90814-607e9662','claim-FL-DOE-90814-d07df3d8','claim-FL-DOE-90814-d8edc0f4','claim-FL-DOE-90814-82edcf3e','claim-FL-DOE-90814-4feb218d','claim-FL-DOE-90814-4bd2ae18','claim-FL-DOE-90814-a53ef162','claim-FL-DOE-90814-aed98fa9','claim-FL-DOE-90814-762e162d','claim-FL-DOE-90814-2475351a','claim-FL-DOE-90814-ed8218fe','claim-FL-DOE-90814-9852504e','claim-FL-DOE-90814-10255205','claim-FL-DOE-90814-04a2d73a','claim-FL-DOE-90814-21cb3d0a','claim-FL-DOE-90814-597dd75b','claim-FL-DOE-90814-0299665d','claim-FL-DOE-90814-71483f64','claim-FL-DOE-90814-ee02bade','claim-FL-DOE-90814-fb434ea0','claim-FL-DOE-90814-1d3bc9fd','claim-FL-DOE-90814-bc7e6c5d','claim-FL-DOE-90814-1b42d450','claim-FL-DOE-90814-a230f1fc','claim-FL-DOE-90814-2905114d','claim-FL-DOE-90814-bbe2c1e1','claim-FL-DOE-90814-3ecc781e','claim-FL-DOE-90814-933698b7','claim-FL-DOE-90814-53b82696','claim-FL-DOE-90814-48fc950a','claim-FL-DOE-90814-8e1b7aed','claim-FL-DOE-90814-1742c08a','claim-FL-DOE-90814-9eafa7a4']::text[], ARRAY[]::text[], '{"word_count":720,"verifiable_fact_count":0,"stated_position_count":42,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb),
  ('FL-DOE-91278', 'FL-20-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-91278-921d3b36','claim-FL-DOE-91278-623defdc']::text[], ARRAY[]::text[], '{"word_count":146,"verifiable_fact_count":0,"stated_position_count":2,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":1}'::jsonb),
  ('FL-DOE-91577', 'FL-20-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-20-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-20-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-20-general, then
-- set_race_publication once a human has read the brief.
