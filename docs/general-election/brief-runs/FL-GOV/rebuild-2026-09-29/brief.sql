-- Brief rows for FL-GOV-general, built by scripts/brief-rows-sql.ts.
-- Generated from 6 policy run(s) for 8 candidate(s). Review before applying.
--
-- 29 source, 59 issue, 317 claim, 87 position, 8 profile rows.
-- Passages that produced no row: {"states_no_policy":682,"no_issue_matched":185,"no_run":2}
-- FL-DOE-90433: no run, silent on every spine issue: site unreadable: bot challenge (HTTP 403) did not clear in the browser on 2026-09-27, on the 2026-09-29 Jev-link ingest, and on its one identical re-run (FL-DOE-90433/reingest-2026-09-29/ingest.log and attempt-1-failed/); never solve a captcha; founder decision D3/D4: record silence
-- FL-DOE-89630: no run, silent on every spine issue: no official_site (candidate-sites-2026-09-21.md); founder decision D3: record silence
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
DELETE FROM claim    WHERE race_id = 'FL-GOV-general';
DELETE FROM position WHERE race_id = 'FL-GOV-general';
DELETE FROM issue    WHERE race_id = 'FL-GOV-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-38d885b3', 'https://byrondonalds.com/', 'byrondonalds.com', 'byrondonalds.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-9d331b46', 'https://byrondonalds.com/issues/law-and-order', 'byrondonalds.com/issues/law-and-order', 'byrondonalds.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-336277f1', 'https://byrondonalds.com/issues/education', 'byrondonalds.com/issues/education', 'byrondonalds.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-3ca091eb', 'https://byrondonalds.com/issues/affordability', 'byrondonalds.com/issues/affordability', 'byrondonalds.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-e2f10ad0', 'https://byrondonalds.com/issues/space-and-tech', 'byrondonalds.com/issues/space-and-tech', 'byrondonalds.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-0f94d81b', 'https://byrondonalds.com/issues/economy', 'byrondonalds.com/issues/economy', 'byrondonalds.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-5de0848a', 'https://byrondonalds.com/issues/healthcare', 'byrondonalds.com/issues/healthcare', 'byrondonalds.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-1f888ec0', 'https://burkettforgov.com/', 'burkettforgov.com', 'burkettforgov.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-5bbc9359', 'https://davidjolly.com/homeowners-insurance', 'davidjolly.com/homeowners-insurance', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-873b9a10', 'https://davidjolly.com/issues/affordability', 'davidjolly.com/issues/affordability', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-f0fe3a60', 'https://davidjolly.com/issues/health-care', 'davidjolly.com/issues/health-care', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-a2ed7192', 'https://davidjolly.com/issues/public-education', 'davidjolly.com/issues/public-education', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-8acc6b0f', 'https://davidjolly.com/issues', 'davidjolly.com/issues', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-f4d95eb9', 'https://davidjolly.com/jolly-insurance-proposal-facts', 'davidjolly.com/jolly-insurance-proposal-facts', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-f918c365', 'https://davidjolly.com/where-david-stands', 'davidjolly.com/where-david-stands', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-baf0df24', 'https://davidjolly.com/about', 'davidjolly.com/about', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-01de2742', 'https://russo2026.com/', 'russo2026.com', 'russo2026.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-20ef3379', 'https://russo2026.com/en/priorities/children-teachers-trades', 'russo2026.com/en/priorities/children-teachers-trades', 'russo2026.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-bf79b0bc', 'https://russo2026.com/en/priorities/immigration', 'russo2026.com/en/priorities/immigration', 'russo2026.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-dd3ff2e5', 'https://russo2026.com/en/priorities', 'russo2026.com/en/priorities', 'russo2026.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-8311e056', 'https://russo2026.com/en/priorities/affordability', 'russo2026.com/en/priorities/affordability', 'russo2026.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-efa529ed', 'https://russo2026.com/en/priorities/innovation', 'russo2026.com/en/priorities/innovation', 'russo2026.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-dcacde8b', 'https://russo2026.com/en/priorities/florida-9-9', 'russo2026.com/en/priorities/florida-9-9', 'russo2026.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-530377e3', 'https://nomoecorruption.com/', 'nomoecorruption.com', 'nomoecorruption.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-07adc474', 'https://nomoecorruption.com/2024/12/06/judicial-cleanup', 'nomoecorruption.com/2024/12/06/judicial-cleanup', 'nomoecorruption.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-be9bd1de', 'https://scottjewett.com/', 'scottjewett.com', 'scottjewett.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-df36e3a5', 'https://scottjewett.com/the-issues', 'scottjewett.com/the-issues', 'scottjewett.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-ad20338c', 'https://scottjewett.com/our-mission', 'scottjewett.com/our-mission', 'scottjewett.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z'),
  ('src-6f41518a', 'https://scottjewett.com/meet-scott', 'scottjewett.com/meet-scott', 'scottjewett.com', 'candidate_self', 'N/A', '2026-09-29T11:41:45Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-GOV-general--issue-A1', 'FL-GOV-general', 'spine', NULL, 'Property insurance costs', NULL, NULL, 1),
  ('FL-GOV-general--issue-A3', 'FL-GOV-general', 'spine', NULL, 'Property taxes', NULL, NULL, 2),
  ('FL-GOV-general--issue-A2', 'FL-GOV-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 3),
  ('FL-GOV-general--issue-A4', 'FL-GOV-general', 'spine', NULL, 'Cost of living in Florida', NULL, NULL, 4),
  ('FL-GOV-general--issue-B3--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Immigration and border enforcement', NULL, NULL, 100),
  ('FL-GOV-general--issue-B1--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Economy, inflation, and jobs', NULL, NULL, 101),
  ('FL-GOV-general--issue-B7--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Crime policy, policing and courts', NULL, NULL, 102),
  ('FL-GOV-general--issue-A6--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Public school funding and teachers', NULL, NULL, 103),
  ('FL-GOV-general--issue-KYV10--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Career, vocational and higher education', NULL, NULL, 104),
  ('FL-GOV-general--issue-KYV9--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'School choice and vouchers', NULL, NULL, 105),
  ('FL-GOV-general--issue-KYV4--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Storm resilience and flood protection', NULL, NULL, 106),
  ('FL-GOV-general--issue-KYV2--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Energy and utilities', NULL, NULL, 107),
  ('FL-GOV-general--issue-KYV3--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Growth, development and land conservation', NULL, NULL, 108),
  ('FL-GOV-general--issue-B2--FL-DOE-89042', 'FL-GOV-general', 'candidate', 'FL-DOE-89042', 'Healthcare access and costs', NULL, NULL, 109),
  ('FL-GOV-general--issue-KYV3--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Growth, development and land conservation', NULL, NULL, 100),
  ('FL-GOV-general--issue-B1--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Economy, inflation, and jobs', NULL, NULL, 101),
  ('FL-GOV-general--issue-B2--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Healthcare access and costs', NULL, NULL, 102),
  ('FL-GOV-general--issue-KYV5--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Water supply and drinking water', NULL, NULL, 103),
  ('FL-GOV-general--issue-B5--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Abortion policy', NULL, NULL, 104),
  ('FL-GOV-general--issue-A6--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Public school funding and teachers', NULL, NULL, 105),
  ('FL-GOV-general--issue-KYV2--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Energy and utilities', NULL, NULL, 106),
  ('FL-GOV-general--issue-KYV4--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Storm resilience and flood protection', NULL, NULL, 107),
  ('FL-GOV-general--issue-B3--FL-DOE-90630', 'FL-GOV-general', 'candidate', 'FL-DOE-90630', 'Immigration and border enforcement', NULL, NULL, 108),
  ('FL-GOV-general--issue-KYV2--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Energy and utilities', NULL, NULL, 100),
  ('FL-GOV-general--issue-KYV8--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Condominium and HOA costs', NULL, NULL, 101),
  ('FL-GOV-general--issue-KYV6--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Renters and evictions', NULL, NULL, 102),
  ('FL-GOV-general--issue-B2--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Healthcare access and costs', NULL, NULL, 103),
  ('FL-GOV-general--issue-A6--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Public school funding and teachers', NULL, NULL, 104),
  ('FL-GOV-general--issue-KYV9--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'School choice and vouchers', NULL, NULL, 105),
  ('FL-GOV-general--issue-B1--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Economy, inflation, and jobs', NULL, NULL, 106),
  ('FL-GOV-general--issue-B5--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Abortion policy', NULL, NULL, 107),
  ('FL-GOV-general--issue-KYV10--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Career, vocational and higher education', NULL, NULL, 108),
  ('FL-GOV-general--issue-A7--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Elections administration and voting access', NULL, NULL, 109),
  ('FL-GOV-general--issue-B7--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Crime policy, policing and courts', NULL, NULL, 110),
  ('FL-GOV-general--issue-KYV3--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Growth, development and land conservation', NULL, NULL, 111),
  ('FL-GOV-general--issue-A6--FL-DOE-89571', 'FL-GOV-general', 'candidate', 'FL-DOE-89571', 'Public school funding and teachers', NULL, NULL, 100),
  ('FL-GOV-general--issue-KYV10--FL-DOE-89571', 'FL-GOV-general', 'candidate', 'FL-DOE-89571', 'Career, vocational and higher education', NULL, NULL, 101),
  ('FL-GOV-general--issue-B1--FL-DOE-89571', 'FL-GOV-general', 'candidate', 'FL-DOE-89571', 'Economy, inflation, and jobs', NULL, NULL, 102),
  ('FL-GOV-general--issue-B3--FL-DOE-89571', 'FL-GOV-general', 'candidate', 'FL-DOE-89571', 'Immigration and border enforcement', NULL, NULL, 103),
  ('FL-GOV-general--issue-B7--FL-DOE-89571', 'FL-GOV-general', 'candidate', 'FL-DOE-89571', 'Crime policy, policing and courts', NULL, NULL, 104),
  ('FL-GOV-general--issue-KYV2--FL-DOE-89571', 'FL-GOV-general', 'candidate', 'FL-DOE-89571', 'Energy and utilities', NULL, NULL, 105),
  ('FL-GOV-general--issue-KYV3--FL-DOE-89571', 'FL-GOV-general', 'candidate', 'FL-DOE-89571', 'Growth, development and land conservation', NULL, NULL, 106),
  ('FL-GOV-general--issue-B3--FL-DOE-88529', 'FL-GOV-general', 'candidate', 'FL-DOE-88529', 'Immigration and border enforcement', NULL, NULL, 100),
  ('FL-GOV-general--issue-KYV8--FL-DOE-88529', 'FL-GOV-general', 'candidate', 'FL-DOE-88529', 'Condominium and HOA costs', NULL, NULL, 101),
  ('FL-GOV-general--issue-KYV1--FL-DOE-88529', 'FL-GOV-general', 'candidate', 'FL-DOE-88529', 'Threats to democratic institutions', NULL, NULL, 102),
  ('FL-GOV-general--issue-B7--FL-DOE-88529', 'FL-GOV-general', 'candidate', 'FL-DOE-88529', 'Crime policy, policing and courts', NULL, NULL, 103),
  ('FL-GOV-general--issue-B6--FL-DOE-88529', 'FL-GOV-general', 'candidate', 'FL-DOE-88529', 'Election integrity', NULL, NULL, 104),
  ('FL-GOV-general--issue-KYV9--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'School choice and vouchers', NULL, NULL, 100),
  ('FL-GOV-general--issue-B1--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Economy, inflation, and jobs', NULL, NULL, 101),
  ('FL-GOV-general--issue-KYV2--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Energy and utilities', NULL, NULL, 102),
  ('FL-GOV-general--issue-KYV3--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Growth, development and land conservation', NULL, NULL, 103),
  ('FL-GOV-general--issue-B3--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Immigration and border enforcement', NULL, NULL, 104),
  ('FL-GOV-general--issue-B7--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Crime policy, policing and courts', NULL, NULL, 105),
  ('FL-GOV-general--issue-KYV1--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Threats to democratic institutions', NULL, NULL, 106),
  ('FL-GOV-general--issue-B2--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Healthcare access and costs', NULL, NULL, 107),
  ('FL-GOV-general--issue-KYV5--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Water supply and drinking water', NULL, NULL, 108),
  ('FL-GOV-general--issue-KYV4--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Storm resilience and flood protection', NULL, NULL, 109),
  ('FL-GOV-general--issue-A5--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Water quality and Everglades restoration', NULL, NULL, 110),
  ('FL-GOV-general--issue-KYV10--FL-DOE-84076', 'FL-GOV-general', 'candidate', 'FL-DOE-84076', 'Career, vocational and higher education', NULL, NULL, 111)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-89042-eab71dac', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Florida cannot become too expensive for working families and seniors on fixed incomes. The status quo has a cost. Progress doesn''t pay the bill sitting on your kitchen counter today—it''s time to bring down costs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-19390392', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89042', 'We must secure our borders, keep local neighborhoods safe, stop taxpayer handouts to illegal immigration, and keep deadly drugs off our streets.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-37eac487', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89042', 'Every American who walked on the Moon took off from Florida''s coast. It''s time to bring NASA home, build out our launchpads, and create thousands of high-paying jobs right here in Florida.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-d21e87f5', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89042', '“We must secure our borders, keep local neighborhoods safe, stop taxpayer handouts to illegal immigration, and keep deadly drugs off our streets.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-edbfe7aa', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89042', 'Cut off state funds, subsidies, and free perks that encourage illegal immigration into Florida.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-b5fdff2b', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89042', 'Require every Florida business to use the E-Verify system so legal workers keep the jobs and wages they''ve earned.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-d6f40531', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89042', 'Require every Florida business to use the E-Verify system so legal workers keep the jobs and wages they''ve earned.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-5703267d', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89042', 'Coordinate state and local police directly with federal authorities to quickly deport noncitizens who commit crimes in our communities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-18982559', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89042', 'Coordinate state and local police directly with federal authorities to quickly deport noncitizens who commit crimes in our communities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-fc320e10', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89042', 'Target drug cartels with heavy penalties and joint police task forces to take deadly fentanyl off Florida streets.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-2453a61f', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89042', 'Reward top-performing reading teachers with real bonus pay for getting results.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-8c6e14bf', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89042', 'Connect high schools and community colleges with local businesses to offer paid apprenticeships in construction, advanced manufacturing, and defense.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-47fa2f9a', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89042', 'College, university, workforce/trade, military, entrepreneurship, and hybrid pathways are equally resourced and equally respected.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-4958cb63', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-89042', 'Let education money follow the student so parents can choose the best school for their child.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-dab37593', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '“Florida cannot become too expensive for working families and seniors on fixed incomes. The status quo has a cost. Progress doesn''t pay the bill sitting on your kitchen counter today—it''s time to bring down costs.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-b5bb8ff1', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Protect reforms and stop lawsuit abuse that jacks up rates for everyone, saving homeowners hundreds of dollars a year.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-16759930', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Reform the My Safe Florida Home program and other grants programs to fund real, storm-hardening upgrades that lower your annual premium the most.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-25e9e64c', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-89042', 'Reform the My Safe Florida Home program and other grants programs to fund real, storm-hardening upgrades that lower your annual premium the most.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-8d390ab5', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Keep Citizens Insurance small so everyday drivers and homeowners never get hit with a surprise "hurricane tax" bill after a big storm.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-997872de', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Cut the red tape and slow permitting that make rebuilding a home after a storm needlessly expensive and drive up your insurance premiums.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-328fc44e', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Keep property taxes in check so seniors and working families aren''t taxed out of their homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-febdcb82', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89042', 'Stop giant industrial data centers from passing their massive electric and water bills onto everyday households.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-037470b0', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89042', '“Every American who walked on the Moon took off from Florida''s coast. It''s time to bring NASA home, build out our launchpads, and create thousands of high-paying jobs right here in Florida.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-1a44be9f', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89042', '“California passes heavy regulations. New York sends you the bill. Florida puts out the welcome mat. Bureaucratic delays shouldn''t stop honest people from opening a business and earning a living.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-f8551817', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89042', 'Put every business, building, and road permit on an open state website with a ticking clock, forcing local offices to approve projects on time.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-ed9255c1', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89042', 'Bring all major development permits under a single digital hub so job creators spend less time in lines and more time hiring workers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-78bc19d3', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89042', 'Bring all major development permits under a single digital hub so job creators spend less time in lines and more time hiring workers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-1c99d9cd', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89042', 'Require doctors and hospitals to post plain, guaranteed cash prices for the 50 most common medical tests and procedures.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-6f7bc21b', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89042', 'Ensure everyday patients paying cash get the lowest discounted rate that the hospital gives to big insurance companies.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-060feae6', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89042', 'Let what you pay to an out-of-network doctor count directly toward your yearly insurance deductible.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-460052a4', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89042', 'Require insurance companies to approve common treatments within three days instead of letting paperwork delay your care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89042-e4763ba9', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89042', 'Expose pharmacy middleman markups so prescription discounts get passed straight to you at the checkout counter.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-1326b745', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Slash and eventually eliminate property taxes for vested Florida homeowners and renters. For each year beyond a year-ten residency vesting period requirement, Florida homeowners would be entitled to a cumulative 10%-point increase of their existing homestead exemption, until their adjusted exemption reaches 100%. Renters in Florida, who meet a ten-year residency vesting period requirement and who go on to purchase a Florida home, would also enjoy the same cumulative 10%-point increase of their new home''s homestead exemption, until their adjusted exemption reaches 100%. Additionally, the adjusted homestead exemption shall be transferable to the homeowner''s wife or children.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-e489a8dc', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Slash and eventually eliminate property taxes for vested Florida homeowners and renters. For each year beyond a year-ten residency vesting period requirement, Florida homeowners would be entitled to a cumulative 10%-point increase of their existing homestead exemption, until their adjusted exemption reaches 100%. Renters in Florida, who meet a ten-year residency vesting period requirement and who go on to purchase a Florida home, would also enjoy the same cumulative 10%-point increase of their new home''s homestead exemption, until their adjusted exemption reaches 100%. Additionally, the adjusted homestead exemption shall be transferable to the homeowner''s wife or children.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-1f5e1317', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Slash and eventually eliminate property taxes for vested Florida homeowners and renters. For each year beyond a year-ten residency vesting period requirement, Florida homeowners would be entitled to a cumulative 10%-point increase of their existing homestead exemption, until their adjusted exemption reaches 100%. Renters in Florida, who meet a ten-year residency vesting period requirement and who go on to purchase a Florida home, would also enjoy the same cumulative 10%-point increase of their new home''s homestead exemption, until their adjusted exemption reaches 100%. Additionally, the adjusted homestead exemption shall be transferable to the homeowner''s wife or children.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-d59ef041', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'Make Florida''s current residents, and not new arrivals, a priority in all decisions. Stop the current radical new construction boom which is turning our roads into parking lots. Choose renovation over new construction to first fix what we have, contain overgrowth and preserve the quality of life that is slowly slipping away from each Floridian due to the "Manhattanization" of our beautiful villages, towns, cities, and eventually given enough time, our entire State.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-5c4990a7', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-90630', 'Give our first responders every tool they need to be the best in the business. Pay them, and all our public workers a fair, competitive wage. Honor (unsustainable) defined benefit pension promises to existing employees. Offer all new employees a menu of generous defined contribution plans which provide each employee with the ability to be vested immediately, to receive a generous match from government for each dollar they contribute, to take the plan with them if they leave their current job, and to have access to all of their funds decades before they otherwise would with existing plans.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-f276de12', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Eliminate property taxes on homesteaded primary residences. Benefit passes down to children. Completely rewrite broken property and auto insurance laws. Dismiss non-criminal traffic tickets for drivers with clean 10-year records. Eliminate unfair paid highway express lanes. Eliminate unfair tolls on public roads. Eliminate Florida’s unfair gas tax. Eliminate permit fees to repair and improve your home. Force local government to provide water and sewer at cost. Slash bloated government, wherever it is, that we don’t need – or want. Rewrite the unaffordable, broken healthcare laws. Put doctors, not government and insurance companies, in charge. Make ‘Right to Try’ laws absolute.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-72df0b11', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Eliminate property taxes on homesteaded primary residences. Benefit passes down to children. Completely rewrite broken property and auto insurance laws. Dismiss non-criminal traffic tickets for drivers with clean 10-year records. Eliminate unfair paid highway express lanes. Eliminate unfair tolls on public roads. Eliminate Florida’s unfair gas tax. Eliminate permit fees to repair and improve your home. Force local government to provide water and sewer at cost. Slash bloated government, wherever it is, that we don’t need – or want. Rewrite the unaffordable, broken healthcare laws. Put doctors, not government and insurance companies, in charge. Make ‘Right to Try’ laws absolute.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-b500f80a', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'Eliminate property taxes on homesteaded primary residences. Benefit passes down to children. Completely rewrite broken property and auto insurance laws. Dismiss non-criminal traffic tickets for drivers with clean 10-year records. Eliminate unfair paid highway express lanes. Eliminate unfair tolls on public roads. Eliminate Florida’s unfair gas tax. Eliminate permit fees to repair and improve your home. Force local government to provide water and sewer at cost. Slash bloated government, wherever it is, that we don’t need – or want. Rewrite the unaffordable, broken healthcare laws. Put doctors, not government and insurance companies, in charge. Make ‘Right to Try’ laws absolute.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-f26829f1', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV5--FL-DOE-90630', 'Eliminate property taxes on homesteaded primary residences. Benefit passes down to children. Completely rewrite broken property and auto insurance laws. Dismiss non-criminal traffic tickets for drivers with clean 10-year records. Eliminate unfair paid highway express lanes. Eliminate unfair tolls on public roads. Eliminate Florida’s unfair gas tax. Eliminate permit fees to repair and improve your home. Force local government to provide water and sewer at cost. Slash bloated government, wherever it is, that we don’t need – or want. Rewrite the unaffordable, broken healthcare laws. Put doctors, not government and insurance companies, in charge. Make ‘Right to Try’ laws absolute.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-db9f7ca2', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B5--FL-DOE-90630', 'Affirm and codify “My Body, My Choice.” Free Florida medical research from bureaucratic and litigious strangulation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-9287a21c', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'Stop dangerous over-development that is destroying our way of life:', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-ab57fdfb', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'Repeal the Live Local Act sham, and all others like it, put in place mostly to line the pockets of developers – who then gladly line the pockets of politicians. Stop the “Manhattanization” and continued “over-densification” of Florida’s charming and historic communities. Crush traffic and population gridlock by favoring smart renovation over unchecked new construction, and by favoring current residents over those who wish to move to Florida.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-2babadb9', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-90630', 'Real education for our kids, not factory-style, educational warehousing. Retain only great teachers — good enough is not good enough for our kids. Demand clean water and air. Transform Florida''s slums, ghettos, and war zone neighborhoods by enacting my proposed "Oasis Act”. Employ economic development and tourism programs that benefit Floridians most — not developers, special interests, new Florida arrivals, or tourists. Data centers only permitted after a referendum vote and approval by the citizens of the targeted county and city.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-6676ce3b', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-90630', 'Real education for our kids, not factory-style, educational warehousing. Retain only great teachers — good enough is not good enough for our kids. Demand clean water and air. Transform Florida''s slums, ghettos, and war zone neighborhoods by enacting my proposed "Oasis Act”. Employ economic development and tourism programs that benefit Floridians most — not developers, special interests, new Florida arrivals, or tourists. Data centers only permitted after a referendum vote and approval by the citizens of the targeted county and city.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-b22c09bc', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-90630', 'Real education for our kids, not factory-style, educational warehousing. Retain only great teachers — good enough is not good enough for our kids. Demand clean water and air. Transform Florida''s slums, ghettos, and war zone neighborhoods by enacting my proposed "Oasis Act”. Employ economic development and tourism programs that benefit Floridians most — not developers, special interests, new Florida arrivals, or tourists. Data centers only permitted after a referendum vote and approval by the citizens of the targeted county and city.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-03509ce5', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'Real education for our kids, not factory-style, educational warehousing. Retain only great teachers — good enough is not good enough for our kids. Demand clean water and air. Transform Florida''s slums, ghettos, and war zone neighborhoods by enacting my proposed "Oasis Act”. Employ economic development and tourism programs that benefit Floridians most — not developers, special interests, new Florida arrivals, or tourists. Data centers only permitted after a referendum vote and approval by the citizens of the targeted county and city.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-cf1c9be7', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV5--FL-DOE-90630', 'Real education for our kids, not factory-style, educational warehousing. Retain only great teachers — good enough is not good enough for our kids. Demand clean water and air. Transform Florida''s slums, ghettos, and war zone neighborhoods by enacting my proposed "Oasis Act”. Employ economic development and tourism programs that benefit Floridians most — not developers, special interests, new Florida arrivals, or tourists. Data centers only permitted after a referendum vote and approval by the citizens of the targeted county and city.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-57cf1b22', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'The likely best two solutions are: allow radical competition between ALL legitimate and financially strong insurance carriers. Encourage a wide menu of deductibles, so that if customers wish, they can participate in risk in return for lower premiums.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-327eba65', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '1) For homes that can be satisfactorily fortified against hurricanes, the total cost of approved upgrades could be offset against the property’s real estate taxes. Of course, in the short run this would impact local municipalities, but have the long-term benefit of strengthening homes, improving taxable values and retaining residents and entire neighborhoods that could be displaced following a hurricane.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-b81e21ff', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-90630', '1) For homes that can be satisfactorily fortified against hurricanes, the total cost of approved upgrades could be offset against the property’s real estate taxes. Of course, in the short run this would impact local municipalities, but have the long-term benefit of strengthening homes, improving taxable values and retaining residents and entire neighborhoods that could be displaced following a hurricane.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-f4149bbf', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '2) For homes that are not candidates for fortification initiatives, and cannot buy affordable insurance, homeowners could be incentivized, one time, to buy a new, hurricane-proof home by providing them with an additional homestead exemption amount on their new home equal to the sale price of their existing home.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-9d20aa5c', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '2) For homes that are not candidates for fortification initiatives, and cannot buy affordable insurance, homeowners could be incentivized, one time, to buy a new, hurricane-proof home by providing them with an additional homestead exemption amount on their new home equal to the sale price of their existing home.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-007e4119', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '2) For homes that are not candidates for fortification initiatives, and cannot buy affordable insurance, homeowners could be incentivized, one time, to buy a new, hurricane-proof home by providing them with an additional homestead exemption amount on their new home equal to the sale price of their existing home.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-5156ef6b', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-90630', '2) For homes that are not candidates for fortification initiatives, and cannot buy affordable insurance, homeowners could be incentivized, one time, to buy a new, hurricane-proof home by providing them with an additional homestead exemption amount on their new home equal to the sale price of their existing home.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-6afb9fcb', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-90630', '3) All home lenders must make a determination prior to the issuance of any home loan that the property’s structure is hurricane resistant and following issuance of the loan, shall not be permitted to withdraw the loan or penalize a homeowner in any way, during the term of the loan, related to the hurricane resistance of the structure.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-3583c626', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', '1) Restore real incentives for doctors—driven out of private practice by crushing costs, litigation, insurance companies, and red tape—to reopen small offices, treat patients directly, and bill as they see fit.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-72e7eb2e', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', '3) Rewrite the unaffordable, broken healthcare laws. Put doctors, not government and insurance companies, in charge. Make ‘Right to Try’ laws absolute. Affirm and codify “My Body, My Choice.” Free Florida medical research from bureaucratic and litigious strangulation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-53e9bf85', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B5--FL-DOE-90630', '3) Rewrite the unaffordable, broken healthcare laws. Put doctors, not government and insurance companies, in charge. Make ‘Right to Try’ laws absolute. Affirm and codify “My Body, My Choice.” Free Florida medical research from bureaucratic and litigious strangulation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-e04c011c', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '4) Restore our insurance market back to pricing risk, reflected in policy premiums.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-ecf2868c', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', '5) For healthy individuals with no pre-existing conditions - rebuild a genuine insurance market.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-0dc1aec9', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'a. Diamond Plan – Covers every healthcare circumstance.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-92424984', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'Leverage the insurance companies'' expertise in managing costs and their strong negotiated rates with providers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-86c2d619', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'Assign every person with a pre-existing condition to one of the insurers operating in the state.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-1d4af61e', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'In return for a fair administrative fee, each company would manage, not pay for, care for an equal share of these patients.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-58903250', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'This ''care arrangement'' would eliminate the crazy hospital pricing schemes, the extreme price shocks and anxiety patients face every day, like the well-known emergency room visit that gets billed to the patient for $21,000, and then is reduced for the insurance company to $1650! This one step alone could ignite a ''back to affordability'' healthcare revolution!', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-0cc0b901', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'Every applicant would first be means-tested. Those who qualify could access a state-backed loan fund — up to $200,000 lifetime per person — administered jointly by the patient and their assigned insurer.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-be0b5dc2', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'For those who do not qualify, or whose needs exceed that lifetime limit , they would necessarily enter a tightly managed state pool overseen by physicians and medical experts who would directly coordinate their care and make cost-conscious treatment decisions.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-d5d7e0af', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'This plan keeps private insurers handling day-to-day administration and negotiation, uses loans instead of grants to reduce moral hazard, only applies full government control for the most extreme cases, and leaves the insurance market healthy, competing, and functioning with the most competitive premiums, exactly like it should function.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-22703cf3', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'In other words, this plan would bring back “ real ” insurance coverage and aggressive competition, which will see premiums reflect actual risk – not the unknown costs of subsidizing a market with no visible bottom.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-3061fa1a', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', 'It also provides for fair, compassionate and cost effective healthcare coverage for the most sick and needy among us.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-fc8ba1d2', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'On the contrary, AWH built nearby, in blighted or lower income areas, has many benefits. Those benefits include the ability to buy land at lower costs, build more and better-quality units, transform the blighted and lower income areas with investments in the community, including roads, sidewalks, funds for better municipal services, new and better infrastructure, community activities and programs and many other benefits that go along with large investments in new projects.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-d2d350cb', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'In short, AWH investment is desired and necessary. It should be used as a double-edged sword to both provide needed housing and improve needy areas.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-ff978635', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Stop building new housing until we can absorb the number of residents we currently have and start taking care of the Floridians who are already here and who deserve the quality of life they were promised and expect.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-a891ee15', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'Stop building new housing until we can absorb the number of residents we currently have and start taking care of the Floridians who are already here and who deserve the quality of life they were promised and expect.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-ec44ff5d', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'If we stop making the problem worse by mindlessly adding more housing units, and fix and/or improve the housing units we already have, we might be able to preserve the amazing quality of life our current Florida residents envision, get our traffic nightmare under control and further increase the value of all our residents’ investment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-f33a29db', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-90630', '3) It allows the State to pay as you go, budget responsibly, not go into debt and retain employees by raising the State’s contribution to a level which would entice and financially motivate its employees.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-af04ca7f', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Slash and eventually eliminate property taxes for residency vested Florida homeowners and renters.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-3e61c7b1', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'For each year beyond a year-ten residency vesting period requirement, Florida homeowners would be entitled to a cumulative 10%-point increase of their existing homestead exemption, until their adjusted exemption reaches 100%.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-a6cdf448', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Renters in Florida, who meet the ten-year residency vesting period requirement and who go on to purchase a Florida home, would also enjoy the same cumulative 10%-point increase of their new home''s homestead exemption, until their adjusted exemption reaches 100%.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-dc2737cd', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Renters in Florida, who meet the ten-year residency vesting period requirement and who go on to purchase a Florida home, would also enjoy the same cumulative 10%-point increase of their new home''s homestead exemption, until their adjusted exemption reaches 100%.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-b40a62c6', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Additionally and critically, the adjusted homestead exemption shall be transferable to the homeowner''s wife or children.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-6aa0a10e', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '1) Immediately reduce the Florida Constitutional maximum property tax rate by 50%.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-384302c6', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-90630', '2) Reduce school spending by at least 5%, possibly 10%, directing those savings to property owners, reducing revenue to government by $1.5B to $3B.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-be5deb60', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '7) Last but not least, the law must be changed to allow homesteaded property owners the right to pass down properties to wives and children, without an increase in assessed value - which would otherwise make a family home instantly unaffordable and ensure that Florida families will all be involuntarily displaced.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-961906dd', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '7) Last but not least, the law must be changed to allow homesteaded property owners the right to pass down properties to wives and children, without an increase in assessed value - which would otherwise make a family home instantly unaffordable and ensure that Florida families will all be involuntarily displaced.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-461290dc', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-90630', 'Legal immigration is good. Uncontrolled, unvetted, unregulated, illegal immigration is bad.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-706f7291', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-90630', 'As a condition of approval, each data center must commit to building or funding additional power generation and infrastructure sufficient to supply at least 120% of its actual power consumption. This obligation would remain in effect for the entire life of the project.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-75b86104', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'As a condition of approval, each data center must commit to building or funding additional power generation and infrastructure sufficient to supply at least 120% of its actual power consumption. This obligation would remain in effect for the entire life of the project.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-76fc3576', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Additionally, data centers would be required to pay 110% of the electricity rate charged to residential customers, or 110% of the rate they normally pay, whichever is greater. The extra 10% would be credited back on a pro-rata basis to Florida’s residential ratepayers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-5284a601', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-90630', 'Additionally, data centers would be required to pay 110% of the electricity rate charged to residential customers, or 110% of the rate they normally pay, whichever is greater. The extra 10% would be credited back on a pro-rata basis to Florida’s residential ratepayers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-296f517d', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'The failed “Live Local Act” and its clones are a disgrace: they deliver almost zero low-cost housing for struggling Floridians, bulldoze historic neighborhoods, and stuff millions into the pockets of connected developers and politicians. It’s corporate welfare dressed up as compassion.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-ced28d5d', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'The failed “Live Local Act” and its clones are a disgrace: they deliver almost zero low-cost housing for struggling Floridians, bulldoze historic neighborhoods, and stuff millions into the pockets of connected developers and politicians. It’s corporate welfare dressed up as compassion.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-cc2ea413', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', 'Instead of scattering money to the wind, the Oasis Act redirects the exact same developer incentives to the worst, most dangerous, and forgotten slum parcels across Florida where the land is dirt-cheap.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90630-432d3862', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Safe, dignified housing rises next — clean, affordable units for families who want better. Parks, playgrounds, and real neighborhood features included.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-697d6a2e', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Floridians pay the highest home insurance prices in America because every family is made to pay a private insurer to carry hurricane risk. Jolly''s proposal moves that risk into one strong, state-backed fund. Here is how it works, what it costs, and what it saves.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-863e97d1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Hurricane and wind risk makes up 60 to 70 percent of a Florida homeowners insurance bill. David Jolly''s plan creates one strong, state-backed hurricane fund to carry that risk, so private insurers no longer have to price it into your policy. The fund is built to a financially sound level and backed by reinsurance before it covers anyone, and it is paid for by making insurance companies pay the taxes they currently avoid, along with other revenue that does not put the burden back on homeowners. Based on Insure.com''s Florida calculator, that is the difference between $7,136 a year and $2,557 for a $300,000 home: about $4,500 a year, a 64 percent savings.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-a9c875e8', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'And the rule that governs all of it: the costs will be lower for Floridians, or we won''t do it.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-c2ec4232', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Instead of forcing every Florida family to pay a private insurer to take on that enormous hurricane risk, Jolly''s proposal does four things, in order.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-075197df', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Private insurers no longer have to price hurricane risk into your policy. That is where the 60 to 70 percent savings comes from. The rest of your policy stays private, competitive, and priced the way policies are in other states.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-0083b242', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'And in the end, the costs will be lower for Floridians, or we won''t do it. Simple as that.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-465fdfe4', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Our plan takes on Florida''s affordability crisis in several ways. Let''s start with housing and insurance.It dramatically lowers insurance premiums by creating a statewide catastrophic fund. It reduces monthly electric bills by capping utility company profits. It scales up workforce and affordable housing construction with down-payment assistance for first-time buyers. Our plan protects renters through expanded affordable housing programs and, to help condo owners cover special assessments, it offers no-interest state-backed loans. It''s an actual plan, not an empty promise, to leave Florida families with more money at the end of each month.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-e1da7e5b', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Our plan takes on Florida''s affordability crisis in several ways. Let''s start with housing and insurance.It dramatically lowers insurance premiums by creating a statewide catastrophic fund. It reduces monthly electric bills by capping utility company profits. It scales up workforce and affordable housing construction with down-payment assistance for first-time buyers. Our plan protects renters through expanded affordable housing programs and, to help condo owners cover special assessments, it offers no-interest state-backed loans. It''s an actual plan, not an empty promise, to leave Florida families with more money at the end of each month.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-547f863d', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Our plan takes on Florida''s affordability crisis in several ways. Let''s start with housing and insurance.It dramatically lowers insurance premiums by creating a statewide catastrophic fund. It reduces monthly electric bills by capping utility company profits. It scales up workforce and affordable housing construction with down-payment assistance for first-time buyers. Our plan protects renters through expanded affordable housing programs and, to help condo owners cover special assessments, it offers no-interest state-backed loans. It''s an actual plan, not an empty promise, to leave Florida families with more money at the end of each month.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-85e3db16', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Our plan takes on Florida''s affordability crisis in several ways. Let''s start with housing and insurance.It dramatically lowers insurance premiums by creating a statewide catastrophic fund. It reduces monthly electric bills by capping utility company profits. It scales up workforce and affordable housing construction with down-payment assistance for first-time buyers. Our plan protects renters through expanded affordable housing programs and, to help condo owners cover special assessments, it offers no-interest state-backed loans. It''s an actual plan, not an empty promise, to leave Florida families with more money at the end of each month.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-4b4c856c', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-89243', 'Our plan takes on Florida''s affordability crisis in several ways. Let''s start with housing and insurance.It dramatically lowers insurance premiums by creating a statewide catastrophic fund. It reduces monthly electric bills by capping utility company profits. It scales up workforce and affordable housing construction with down-payment assistance for first-time buyers. Our plan protects renters through expanded affordable housing programs and, to help condo owners cover special assessments, it offers no-interest state-backed loans. It''s an actual plan, not an empty promise, to leave Florida families with more money at the end of each month.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-fafef46f', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'No family should have to choose between insuring their home and keeping the lights on. Florida pays the highest homeowners'' premiums in the country, and too many carriers have walked away, leaving people stranded. We will fight for a system that treats hurricane risk as the shared statewide challenge it is, so a single storm season doesn''t decide whether you keep your house.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d010d03a', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Electricity is not a luxury, and over-the-top profits for the biggest utilities should not come out of your monthly budget. Florida regulators have let investor-owned power companies earn some of the fattest returns in the nation while families ration the air conditioning in the summer heat. We will push to cap utility profits in line with the national average and put that money back where it belongs, in your pocket.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-241bd399', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Electricity is not a luxury, and over-the-top profits for the biggest utilities should not come out of your monthly budget. Florida regulators have let investor-owned power companies earn some of the fattest returns in the nation while families ration the air conditioning in the summer heat. We will push to cap utility profits in line with the national average and put that money back where it belongs, in your pocket.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-1a6ced69', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'You cannot fix a shortage by wishing it away, and Florida is short the homes its growing families need. We will invest in the tools that work, from workforce housing to real down-payment help for first-time buyers, so a nurse, a teacher, or a young couple can find a place they can afford. Building more is how we bring prices back within reach.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d453a07e', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Half of Florida renters now hand over more than a third of their income just to keep a roof overhead, and older condo owners are being hit with special assessments that can wipe out a lifetime of savings. Safety matters, and no one should live in an unsafe building, but families cannot be left to shoulder impossible bills alone. We will stand with renters and long-time owners so the fine print doesn''t force them out of their own homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-a5c37184', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Half of Florida renters now hand over more than a third of their income just to keep a roof overhead, and older condo owners are being hit with special assessments that can wipe out a lifetime of savings. Safety matters, and no one should live in an unsafe building, but families cannot be left to shoulder impossible bills alone. We will stand with renters and long-time owners so the fine print doesn''t force them out of their own homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-bc9ab697', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV6--FL-DOE-89243', 'Half of Florida renters now hand over more than a third of their income just to keep a roof overhead, and older condo owners are being hit with special assessments that can wipe out a lifetime of savings. Safety matters, and no one should live in an unsafe building, but families cannot be left to shoulder impossible bills alone. We will stand with renters and long-time owners so the fine print doesn''t force them out of their own homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-8824b2dd', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-89243', 'Half of Florida renters now hand over more than a third of their income just to keep a roof overhead, and older condo owners are being hit with special assessments that can wipe out a lifetime of savings. Safety matters, and no one should live in an unsafe building, but families cannot be left to shoulder impossible bills alone. We will stand with renters and long-time owners so the fine print doesn''t force them out of their own homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-70f4e354', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'More than half of Florida renters now pay over 30 percent of income on housing. The plan scales workforce and affordable housing targeted near job centers, expands existing state housing programs, and caps utility profits to lower the monthly bills renters pay on top of rent.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-b019efe6', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'More than half of Florida renters now pay over 30 percent of income on housing. The plan scales workforce and affordable housing targeted near job centers, expands existing state housing programs, and caps utility profits to lower the monthly bills renters pay on top of rent.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-0548e5b1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'More than half of Florida renters now pay over 30 percent of income on housing. The plan scales workforce and affordable housing targeted near job centers, expands existing state housing programs, and caps utility profits to lower the monthly bills renters pay on top of rent.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-e345b517', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Older coastal condos have been hit hardest by new inspection requirements, with many owners facing assessments of $50,000 or more per unit. The plan offers no-interest state-backed loans so associations can spread costs over time without forcing fixed-income owners to sell.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-883aec3c', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-89243', 'Older coastal condos have been hit hardest by new inspection requirements, with many owners facing assessments of $50,000 or more per unit. The plan offers no-interest state-backed loans so associations can spread costs over time without forcing fixed-income owners to sell.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d56ffe8c', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'David Jolly''s health care plan for Florida expands Medicaid to cover hundreds of thousands of uninsured Floridians and invests in more primary care clinics throughout the state so people can access care when and where they need it, regardless of income. Medicaid expansion can start within months once the Legislature approves it, with coverage beginning in the first year. Jolly proposes a five-year pilot to dramatically expand community health centers in every Florida county so care is available, not just coverage on paper.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-94f2d306', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'Expanding Medicaid is part of the solution. It would provide coverage to hundreds of thousands of Floridians who are currently left without access to care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-bd60f899', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'That''s why Florida should invest in more primary healthcare clinics throughout the state. Places where people can go, regardless of income, to receive basic care, support, and treatment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-b0090273', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'Because expansion provides coverage, but people still need somewhere to actually get care. Jolly proposes a 5-year pilot to dramatically expand community health centers in every Florida county so new enrollees can connect with primary care providers, not just have coverage on paper.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d997fcc3', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'Rural counties have been hit hardest by healthcare gaps. Jolly''s plan scales community health centers in every county, including rural areas where private practices are unviable, and stabilizes rural hospital revenue by reducing uncompensated care through Medicaid expansion.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-2c578ebf', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'David Jolly believes public education should be Florida''s foundation, not an afterthought. His plan focuses on paying teachers what they deserve, investing in school infrastructure and resources, and ensuring every child has access to strong public schools regardless of zip code. He argues Florida needs a public education renaissance, not abandonment, because strong public schools strengthen communities, support families, and build the workforce Florida''s future depends on.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-258049c6', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'That means paying teachers what they deserve. Supporting the people who show up every day to educate, guide, and inspire the next generation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-25eefe94', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'It means investing in school infrastructure, classrooms, and resources so students aren’t trying to learn in systems that have been neglected for too long.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-f68ba3c3', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-89243', 'Florida doesn’t need to abandon public education.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-5020c1c0', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'That starts with schools we are willing to invest in.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-32775a74', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'Jolly wants to dramatically increase teacher pay as part of a 10-year public education renaissance. He proposes redirecting Tourist Development Tax revenue (currently used for convention centers and tourism promotion) toward teacher pay and school infrastructure, which would require legislative change.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-4fc3fa00', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'Jolly proposes expanding the allowed uses of Florida''s Tourist Development Tax (over $1 billion per year statewide) to include teacher pay and school infrastructure. His framing: Florida doesn''t have a crisis of convention centers, it has a crisis of public education.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-1a75c9f6', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'The property insurance crisis is the primary reason so many people in Florida are struggling to afford a place to live. From renters to retirees to homeowners, the burden of property insurance continues to make housing costs in Florida unaffordable for many. A state catastrophic fund that removes natural disaster risk from the private insurance market would dramatically reduce property and car insurance rates, restoring affordability and price stability for millions of Floridians. Allowing condominium associations and owners access to a no-interest state-backed loan program would likewise address the crushing financial burden of generational condominium repairs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-e03d78d9', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'The property insurance crisis is the primary reason so many people in Florida are struggling to afford a place to live. From renters to retirees to homeowners, the burden of property insurance continues to make housing costs in Florida unaffordable for many. A state catastrophic fund that removes natural disaster risk from the private insurance market would dramatically reduce property and car insurance rates, restoring affordability and price stability for millions of Floridians. Allowing condominium associations and owners access to a no-interest state-backed loan program would likewise address the crushing financial burden of generational condominium repairs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-4f7fb113', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'The property insurance crisis is the primary reason so many people in Florida are struggling to afford a place to live. From renters to retirees to homeowners, the burden of property insurance continues to make housing costs in Florida unaffordable for many. A state catastrophic fund that removes natural disaster risk from the private insurance market would dramatically reduce property and car insurance rates, restoring affordability and price stability for millions of Floridians. Allowing condominium associations and owners access to a no-interest state-backed loan program would likewise address the crushing financial burden of generational condominium repairs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-c117b02e', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-89243', 'The property insurance crisis is the primary reason so many people in Florida are struggling to afford a place to live. From renters to retirees to homeowners, the burden of property insurance continues to make housing costs in Florida unaffordable for many. A state catastrophic fund that removes natural disaster risk from the private insurance market would dramatically reduce property and car insurance rates, restoring affordability and price stability for millions of Floridians. Allowing condominium associations and owners access to a no-interest state-backed loan program would likewise address the crushing financial burden of generational condominium repairs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-f65647a1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'Public schools have been inadequately funded in the state of Florida for decades. We need to dramatically increase investment in Florida''s public schools to provide higher quality public schools in more neighborhoods, with more teachers who earn a more competitive salary. Schools in Florida''s private school voucher program need to meet the same high standards as our public schools. Private schools that accept vouchers should be required to provide the same specialized services public schools provide and not charge additional tuition. The voucher program should be means-tested to ensure funding is provided for families with demonstrated economic need.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-933b9fdf', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-89243', 'Public schools have been inadequately funded in the state of Florida for decades. We need to dramatically increase investment in Florida''s public schools to provide higher quality public schools in more neighborhoods, with more teachers who earn a more competitive salary. Schools in Florida''s private school voucher program need to meet the same high standards as our public schools. Private schools that accept vouchers should be required to provide the same specialized services public schools provide and not charge additional tuition. The voucher program should be means-tested to ensure funding is provided for families with demonstrated economic need.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-1eb35ecb', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89243', 'Florida has one of the largest economies in the world, but it has been hindered by short-term political thinking. Florida should become a leading technology economy and invest in a renewed agriculture economy with a vision for the next century. We should continue to grow our tourist economy and should retain Florida''s top talent while attracting the world''s brightest minds and creators.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-169b726e', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B5--FL-DOE-89243', 'Reproductive healthcare decisions should be made between women and their doctors, not politicians. Roe v. Wade and Casey v. Planned Parenthood provided a responsible, balanced framework for protecting these decisions. Absent federal legislation restoring these protections, Florida should codify the Roe/Casey framework.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-b4437ad2', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89243', 'Too many Florida families are locked out of our state''s flagship universities. Florida is fortunate to be home to some of our nation''s leading colleges and universities, but it only benefits Florida families if our students can gain admission. Qualified Florida students should have preferred application status for Florida''s universities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-2ad3d2c5', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Florida leaders should unleash clean and renewable energies across the Sunshine State, requiring greater integration of clean energy technologies into our public utilities. Environmentally sound energy technologies provide for greater stewardship of our environment, protect our tourist and environmental economy, and can drive down utility costs for all Florida consumers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-85ef825f', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A7--FL-DOE-89243', 'Across Florida, voters continue to use their vote to choose the direction of their state and their community. But Tallahassee politicians preempt the will of the voters based on selfish ideological whims. Direct democracy in Florida should be easier, not harder. Florida should respect home rule, and support the implementation of successful voter initiatives in communities across the state. Florida should make constitutional amendments easier for voters to place on the ballot, and if an amendment gets more than 50% of the vote, the Governor should fight to enact it on behalf of the people.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-734bca05', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89243', 'Whether you''re a native born Floridian, an immigrant to our state, or a Tallahassee politician, if you break the law in Florida, you''ll be held accountable. But Florida can also be a state that corrects disparities in criminal justice for communities of color and immigrant communities, promoting local control of community policing. It''s time Florida fights crime, not communities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d1823d54', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'Medicaid is a critical program for Florida. It supports childbirth care for women and infants, long-term care for seniors, care for those with special needs and unique abilities, and is a critical funding source for hospitals across the state. In the face of cuts from Washington and Tallahassee, Florida should commit to expanding Medicaid and ensuring healthcare for all Floridians.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d4b1f4ea', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Byron Donalds is lying to scare people with invented numbers. There is no “$1,000 hurricane tax” in the plan. Here is the plan to cut Florida homeowners insurance by 60 to 70 percent, in plain English, and the facts behind the ads.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-b61a6821', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Jolly''s model to fix homeowners insurance, in plain English. Hurricane and wind risk can make up 60–70% of a homeowners insurance bill. So instead of forcing every Florida family to pay private insurers to take on that enormous risk: Florida creates one strong, state-backed hurricane fund. We build that fund to a financially sound level and buy backup insurance for catastrophic storms. We fund it by making insurance companies pay the taxes they currently avoid, along with other revenue sources that don''t put the burden back on homeowners. Private insurers no longer have to price that hurricane risk into your policy, which has the potential to cut homeowners insurance costs by 60–70%.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-97c9fc6a', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'This will lower costs for Floridians. It can be funded through a mix of forcing insurance companies to pay the taxes they currently avoid, a fee on real estate transactions, or existing tourist taxes. The fund can be rolled out responsibly, with coverage becoming available after a fiscally sound amount of money is set aside and backup reinsurance is in place. The Legislature will be involved in creating the specific policies, including the funding.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-19db108f', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'David Jolly’s Plan to Cut Florida Homeowners Insurance by 60 to 70 Percent THE PLAN, IN PLAIN ENGLISH David Jolly''s Plan to Cut Florida Homeowners Insurance by 60 to 70 Percent…', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-6c95ca42', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Data Centers DATA CENTERS Florida''s voters are saying no. David Jolly is listening. A moratorium on hyperscale data centers, issued…', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-ae94a9b3', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', 'Data Centers DATA CENTERS Florida''s voters are saying no. David Jolly is listening. A moratorium on hyperscale data centers, issued…', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d9b5e5d4', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'David Jolly is a former Member of Congress, attorney, and fifth-generation Floridian running for Florida Governor in 2026. His campaign focuses on historic homeowner''s insurance reform, expanding primary healthcare services, and investing in community public schools. Jolly believes everyone deserves access to work, wages, and wealth, with rights protected and dignity celebrated regardless of background.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-02db7401', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', 'David has focused his campaign on historic groundbreaking homeowner’s insurance reform, the expansion of primary healthcare services, and investing in more community public schools. A fifth-generation Floridian and son of a minister, David and his wife Laura are raising their young family in Pinellas County.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-326b62d1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89243', 'Today, David is a proud Florida Democrat, fighting for the values he sees rooted in democratic tradition, that the economy should work for everyone; responsible investments in housing, healthcare, and education can improve people’s lives; and, everyone’s rights should be protected regardless of their walk of life.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-7f48a847', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Frank wants to raise Florida''s average teacher salary to at least $75,000, strengthen teacher recruitment and retention, and expand skilled trades, apprenticeships and career pathways so every student has a path to a good-paying future. He is also working to become a Florida substitute teacher because leadership begins by listening - and Frank believes elected officials should experience the classrooms their decisions affect.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-6ba87ac5', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'Frank wants to raise Florida''s average teacher salary to at least $75,000, strengthen teacher recruitment and retention, and expand skilled trades, apprenticeships and career pathways so every student has a path to a good-paying future. He is also working to become a Florida substitute teacher because leadership begins by listening - and Frank believes elected officials should experience the classrooms their decisions affect.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-c701fd15', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Frank wants to raise Florida''s average teacher salary to at least $75,000, strengthen teacher recruitment and retention, and expand skilled trades, apprenticeships and career pathways so every student has a path to a good-paying future. He is also working to become a Florida substitute teacher because leadership begins by listening - and Frank believes elected officials should experience the classrooms their decisions affect.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-13d5ad7e', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'His approach is pro-innovation, pro-business and pro-accountability - protecting taxpayers and communities, preparing Florida workers for an economy transformed by AI, and giving more entrepreneurs a fair shot to build something successful.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-a6277538', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'Frank believes Florida can protect its communities, uphold the rule of law, support legal immigration and still treat people with dignity. Those principles are not in conflict.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-37b2978e', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'His Common Sense Immigration Principles focus on stronger public safety partnerships, targeting violent criminals, traffickers and gangs, cracking down on worker exploitation, supporting legal immigration and pushing Washington to finally address a broken federal immigration system.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-3b413adc', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Florida''s future starts in its classrooms. Frank Russo believes we cannot say children are our future while undervaluing the people responsible for educating them. And we cannot prepare young Floridians for a changing economy if we continue pretending a four-year college degree is the only path to success. Frank''s plan starts with a simple idea: invest in children, respect teachers and give every student a real path to a good-paying future.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-6f872f3a', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'Florida''s future starts in its classrooms. Frank Russo believes we cannot say children are our future while undervaluing the people responsible for educating them. And we cannot prepare young Floridians for a changing economy if we continue pretending a four-year college degree is the only path to success. Frank''s plan starts with a simple idea: invest in children, respect teachers and give every student a real path to a good-paying future.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-f0e49f2b', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Frank is proposing to raise Florida''s average teacher salary to at least $75,000 a year while strengthening teacher recruitment, retention and classroom support.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-2f95703c', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'We should cut bureaucracy before we cut teachers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-1bf742a8', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Frank believes raising teacher pay has to be accompanied by a serious look at where Florida''s education dollars are going.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-dafc6778', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'His approach is to reduce administrative waste and redirect resources toward teachers and classrooms rather than allowing bureaucracy to continue growing. His existing education proposal also calls for using state reserves as a bridge for increased teacher compensation rather than initially funding the increase through new taxes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-1258a09d', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Put the people teaching our children ahead of the bureaucracy surrounding them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-3b0929b9', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'Frank wants to bring skilled-trades education back into Florida high schools so more students can graduate with certifications, practical skills and a direct path into the workforce.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-5bef209f', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'Frank''s plan would expand technical training and create more paid apprenticeship opportunities connecting students directly with employers and skilled careers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-e9a86174', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'He also wants experienced tradesmen and tradeswomen to have greater opportunities to teach the next generation - recognizing that decades of real-world experience can be just as valuable in a technical classroom as a traditional academic credential.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-db78775e', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Frank believes Florida should prepare for that change rather than wait until workers are displaced by it.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-05566d99', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'That means strengthening skilled careers that are difficult to automate while also preparing students and workers to participate in AI and emerging industries.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-01149069', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'That means strengthening skilled careers that are difficult to automate while also preparing students and workers to participate in AI and emerging industries.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-9bd33ea0', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Frank''s Florida 9.9 proposal would reinforce that investment through the protected Florida Future Fund - supporting teacher pay, skilled trades and apprenticeships, and education and retraining for workers affected by AI and automation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-dcd98692', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'Frank''s Florida 9.9 proposal would reinforce that investment through the protected Florida Future Fund - supporting teacher pay, skilled trades and apprenticeships, and education and retraining for workers affected by AI and automation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-8efeb562', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Frank''s Florida 9.9 proposal would reinforce that investment through the protected Florida Future Fund - supporting teacher pay, skilled trades and apprenticeships, and education and retraining for workers affected by AI and automation.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-1604577d', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'Frank believes in secure borders. He believes in the rule of law. And as Governor, his first responsibility will always be keeping Floridians safe. But immigration is personal to Frank too. His family came to this country for the same reason generations of families have come here - for a chance to work hard, build a life and give their children something better. That''s why Frank doesn''t believe we have to choose between enforcing the law and treating people with dignity. Protect our communities. Follow the law. Support legal immigration. Treat people like human beings. We can do all four.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-3a889edd', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89571', 'That means focusing law enforcement resources on the people who actually threaten our communities - violent criminals, drug traffickers, human traffickers and transnational gangs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-dcf1bae0', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89571', 'As Governor, Frank would strengthen partnerships between Florida law enforcement and federal agencies and prioritize state resources toward removing people who commit violent crimes and pose genuine threats to public safety.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-8d1b73b4', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'Frank supports securing America''s border.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-c898e1f6', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'What Florida can do is strengthen public safety partnerships, combat trafficking and exploitation, enforce the laws within its authority and make sure our state is doing its part.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-bb87d82e', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'If a business or individual knowingly exploits undocumented workers or commits immigration-related fraud, they should be held accountable too.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-533fb7c8', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'Frank would crack down on that exploitation while strengthening employment verification requirements for state agencies and state contractors so taxpayer-funded jobs comply with federal law.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-9f0dba05', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'Frank would expand English-language and workforce-development opportunities that help legal immigrants successfully integrate into Florida''s economy.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-ec240228', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'Frank believes the federal government needs to secure the border, enforce the law and finally create a legal process that actually works.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-04a50e53', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', 'He supports calling on Congress to establish an earned federal process for long-term, law-abiding residents who meet strict legal requirements, including background checks and compliance with federal law.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-75d888c4', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Florida 9.9 - Invest in Florida''s future through a proposed 9.9% consumption tax only on spending above $1 million, with the first $1 million exempt and the resulting revenue protected in public trust for housing, teachers, healthcare, skilled trades and the future of work. This replaces other taxes that currently take money while it’s being made; Frank’s plan harnesses money only when it is spent.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-ef6883fa', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Property Insurance Reform - Put homeowners first with a more affordable, accountable and transparent insurance system - backed by Frank''s more than 30 years of experience in the industry.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-838e7530', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Housing Affordability & Accountability - Build more housing working Floridians can afford while demanding measurable results when taxpayer dollars and public incentives are involved.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-f973f76a', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Property Tax Relief - Help Floridians keep more of what they earn, pursue additional relief for homeowners and hold government accountable for how property tax dollars are spent.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-d0509601', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89571', 'Data Centers & AI Infrastructure - Welcome technology investment while requiring major projects receiving public incentives to plan responsibly for power, water and infrastructure needs and deliver measurable benefits to the communities where they build.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-1c93597e', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'AI & the Future of Work - Bring the jobs of the future to Florida while making sure Florida students and workers have the skills, training and opportunities to fill them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-e7a8a0ae', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'AI & the Future of Work - Bring the jobs of the future to Florida while making sure Florida students and workers have the skills, training and opportunities to fill them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-370b12ac', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Frank supports responsible property tax relief while protecting schools, public safety and essential services. But he also believes government needs to do its part - eliminate waste, spend smarter and show taxpayers where their money is going.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-c6257f5c', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Frank wants to work with developers and the private sector to build more housing - but when taxpayer dollars or public incentives are involved, taxpayers deserve to know what they''re getting in return. His plan ties public support to real, measurable and lasting affordability.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-4124395b', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'He also believes extraordinary success comes with an opportunity to help keep Florida affordable for the people who teach our children, care for our families, build our homes and keep this state running. Ensuring local and state essential services for all Floridians also should not burden Floridian families (like property tax) in such a way that they are unable to build wealth for their children’s future. Frank''s Florida 9.9 proposal would apply a 9.9% consumption state tax only to spending above $1 million. The first $1 million in spending would not be taxed, and implementation of this plan would require the approval from Florida voters through their elected representatives.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-a92d1662', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'The revenue from this plan would be protected in public trust, not in government agency hands and reinvested in priorities including housing, teachers, healthcare workers, skilled trades and preparing Florida''s workforce for AI and automation - with independent audits, public reporting and protections against politicians diverting the money elsewhere.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-15db0c50', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Florida should be one of the best places in America to build a company, develop new technology, create jobs and turn a good idea into something successful. Frank wants Florida leading the next generation of American innovation - but growth should work for the people who already live here. That means welcoming investment while protecting taxpayers and communities, preparing Floridians for an economy being transformed by AI, and giving more entrepreneurs the opportunity to build and grow businesses here. Frank''s approach is simple: Welcome innovation. Create opportunity. Demand accountability.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-e7952238', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Florida should compete for AI, technology investment and high-paying jobs - but existing residents shouldn''t be left paying for the infrastructure that makes major developments possible.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-66ec838b', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89571', 'Frank''s Florida Community Dividend framework would require major data center projects receiving public incentives to plan responsibly for their power, water and infrastructure needs while providing binding, measurable benefits to the communities where they build.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-994fe02a', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89571', 'Frank''s Florida Community Dividend framework would require major data center projects receiving public incentives to plan responsibly for their power, water and infrastructure needs while providing binding, measurable benefits to the communities where they build.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-475eed74', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'Frank wants Florida preparing now - attracting the industries and jobs of the future while investing in education, skilled workforce programs and opportunities that help Floridians adapt as AI and automation reshape the economy. His Florida Future Fund specifically includes investment in preparing students and workers for AI and emerging technologies.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-bd3cb724', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Frank wants Florida preparing now - attracting the industries and jobs of the future while investing in education, skilled workforce programs and opportunities that help Floridians adapt as AI and automation reshape the economy. His Florida Future Fund specifically includes investment in preparing students and workers for AI and emerging technologies.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-87502f81', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Frank''s proposed $100 million Florida Women''s Entrepreneur Initiative would help qualified women learn the fundamentals of running a business, develop a viable plan, access professional support, compete for performance-based startup assistance and grow businesses that create Florida jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-fabc4344', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', 'Teachers - Raise Florida''s average teacher salary to at least $75,000 and improve recruitment and retention.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-5b938a13', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Housing - Expand first-time homeownership opportunities and address housing affordability.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-7c4b8a9f', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', 'Skilled Trades - Expand trade schools, apprenticeships and skilled workforce programs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-05d0620f', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Skilled Trades - Expand trade schools, apprenticeships and skilled workforce programs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-d1149e5d', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'AI & the Future of Work - Prepare students and workers for emerging technologies and help Floridians adapt as automation changes industries and jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-955c36a9', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Frank does not want the proposal to unintentionally punish legitimate business activity, entrepreneurship or investment.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89571-bf4da03b', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', 'Detailed legislation would include protections for legitimate pass-through business operations, investment and job creation, with additional fiscal modeling, legal review and implementation details developed before the proposal moves forward.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-0c603efe', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-88529', 'While our laws will be followed, we will not re-enact Jim Crow. During the Jim Crow era, Black babies were often fed to alligators under the racist name “ licorice drops “. This cruel practice has been extensively documented by the Jim Crow Museum , and with DeSantis and James Uthmeier bringing that back to make migrants the new licorice drops , this nation has already been set back more than 100 years. On Day 1 , Moe will permanently close Alligator Alcatraz.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-d6e8d2b1', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'HOAs are unconstitutional, and property taxes on Floridians’ homesteads infringes on ownership rights. While property taxes are an important way to fund our schools and public works, the state can fund these efforts without taxing property held as the homestead.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-8b058de3', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-88529', 'HOAs are unconstitutional, and property taxes on Floridians’ homesteads infringes on ownership rights. While property taxes are an important way to fund our schools and public works, the state can fund these efforts without taxing property held as the homestead.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-145e0735', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'And with new HOA scams arising every single day throughout the state, Floridians are paying double their property taxes when unelected HOA boards “assess dues” for the exact same thing Floridians are paying the county for.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-cd2b9047', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-88529', 'And with new HOA scams arising every single day throughout the state, Floridians are paying double their property taxes when unelected HOA boards “assess dues” for the exact same thing Floridians are paying the county for.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-62178dbd', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Everybody knows HOAs are a honeypot for taxation without representation, and are manipulated to initiate scam foreclosures against our most vulnerable citizens, the elderly. And in Orange County, malicious neighbors are taxing their communities through unauthorized HOAs without even being licensed CAMs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-3e559507', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-88529', 'Everybody knows HOAs are a honeypot for taxation without representation, and are manipulated to initiate scam foreclosures against our most vulnerable citizens, the elderly. And in Orange County, malicious neighbors are taxing their communities through unauthorized HOAs without even being licensed CAMs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-92b14ece', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'HOAs will be abolished under the Dimanche Administration, and Floridians will enjoy their Constitutional right to the pursuit of happiness/property in their own homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-36b82874', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-88529', 'HOAs will be abolished under the Dimanche Administration, and Floridians will enjoy their Constitutional right to the pursuit of happiness/property in their own homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-fdd93cf2', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV1--FL-DOE-88529', 'Florida judges are corrupt to the core and their corruption is a cancer on our society as Floridians. Lawfare is real and these judges do immense harm to the public trust that allows our systems to function properly when We The People consent to be governed. There is no consent to the corrupt, but they have pervaded and destroyed the system that was once trusted by the People. Moe Dimanche has taken corruption head-on and it is everywhere. It’s in our courts, our elections, law enforcement, and “public service” has been reduced to “self-service at the public’s expense.” Below are some of the individuals Moe will remove from office based on the corruption that he is aware of.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-d62e1060', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-88529', 'Florida judges are corrupt to the core and their corruption is a cancer on our society as Floridians. Lawfare is real and these judges do immense harm to the public trust that allows our systems to function properly when We The People consent to be governed. There is no consent to the corrupt, but they have pervaded and destroyed the system that was once trusted by the People. Moe Dimanche has taken corruption head-on and it is everywhere. It’s in our courts, our elections, law enforcement, and “public service” has been reduced to “self-service at the public’s expense.” Below are some of the individuals Moe will remove from office based on the corruption that he is aware of.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-3830ff3f', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-B6--FL-DOE-88529', 'A. James Craner, a Rick Scott appointee, blocked the grand jury investigation, blocked Alban and Herdocia from testifying, forced a bench trial where he was the jury himself, and covered up how Buddy Dyer stole the 2023 election. The law demands free and fair elections, and that a grand jury assist in maintaining the integrity of our elections, and Craner obstructed justice to help keep Dyer in power. He will be suspended from office and prosecuted as soon as Moe takes office as Governor of the State of Florida.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-6e76f4cc', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV1--FL-DOE-88529', 'A. James Craner, a Rick Scott appointee, blocked the grand jury investigation, blocked Alban and Herdocia from testifying, forced a bench trial where he was the jury himself, and covered up how Buddy Dyer stole the 2023 election. The law demands free and fair elections, and that a grand jury assist in maintaining the integrity of our elections, and Craner obstructed justice to help keep Dyer in power. He will be suspended from office and prosecuted as soon as Moe takes office as Governor of the State of Florida.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-1fbbe33e', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV1--FL-DOE-88529', 'Moe is most likely going to have the courthouse in your county investigated and audited for corruption. Being on the receiving end of Lawfare is a learning experience, and knowing who the Deep State operatives are is valuable because it exposes which government officials are willing to compromise democracy for them. Corruption is a stubborn creature, but it is time that Floridians have a Governor who knows what it is like to have a government apparatus weaponized against him. Moe is going to ensure that what he went through never happens to you.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88529-55b499dc', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-88529', 'Moe is most likely going to have the courthouse in your county investigated and audited for corruption. Being on the receiving end of Lawfare is a learning experience, and knowing who the Deep State operatives are is valuable because it exposes which government officials are willing to compromise democracy for them. Corruption is a stubborn creature, but it is time that Floridians have a Governor who knows what it is like to have a government apparatus weaponized against him. Moe is going to ensure that what he went through never happens to you.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-d4e144b2', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'His agenda centers on a robust economy with more living wage jobs , real educational choice, public safety, lower taxes, and a government that respects the rights of every Floridian, regardless of which major party they usually vote for.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-2f4ab892', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'His agenda centers on a robust economy with more living wage jobs , real educational choice, public safety, lower taxes, and a government that respects the rights of every Floridian, regardless of which major party they usually vote for.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-3edbc716', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Floridians are feeling the squeeze every month . Insurance premiums keep climbing, everyday costs keep rising, and too much of your hard earned money disappears into government waste. Scott Jewett is fighting to fix the insurance affordability crisis, cut taxes, shrink the size of government, and put real solutions in place that help families keep more of what they earn. He believes Florida can do better when we put people first .', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-4c359131', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Nicole is ready to help cut the red tape that drives up prices, protect parental rights , and fight for a Florida where people can keep more of what they earn and live free. She wants her kids, and every Florida family, to have the same chance that hard work should still provide.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-ef16ca5b', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Government rules and state programs keep pushing your insurance higher. We will cut those rules and open the market so more companies compete for your business. More competition means lower premiums for Florida homeowners.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-53d220f9', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Cut the rules and taxes that drive prices up. Open markets so more companies compete on groceries, housing, insurance, and power. When government gets out of the way, costs fall for working Florida families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-c1df32b3', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Cut the rules and taxes that drive prices up. Open markets so more companies compete on groceries, housing, insurance, and power. When government gets out of the way, costs fall for working Florida families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-877d9110', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Cut the rules and taxes that drive prices up. Open markets so more companies compete on groceries, housing, insurance, and power. When government gets out of the way, costs fall for working Florida families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-1a1a752b', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'Parents should decide where their kids go to school. We support real school choice so education dollars follow the child, not the system. Public, private, charter, or homeschool, families pick what works best. Bureaucrats don’t.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-0e311e03', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Hardworking people should keep more of what they earn. Government should get out of the way so prices can come down and paychecks can stretch further.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-fe30886a', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Cut rules and fees that raise the price of food, housing, energy, insurance, and hiring.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-dfdcfb20', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Cut rules and fees that raise the price of food, housing, energy, insurance, and hiring.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-73b3fa5f', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Cut rules and fees that raise the price of food, housing, energy, insurance, and hiring.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-936394c4', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Insurance should protect the home, not feed a bloated system . Premiums should be honest. Claims should get paid. Families should not be trapped with one expensive option.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-7fd2fefe', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Cut the waste that drives premiums up and keeps claim dollars from reaching damaged homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-fbe0b4d1', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Tell families the truth about flood risk and storm exposure instead of hiding costs until renewal day.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-4eb383bf', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Your home should not be a luxury item because the insurance system failed. Fix the insurance affordability crisis.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-5758d421', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'That hits retirees on fixed incomes first. It hits widows who want to stay on the same street. It hits young families who finally bought a starter home and then learned the tax bill is another mortgage.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-08768490', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'That hits retirees on fixed incomes first. It hits widows who want to stay on the same street. It hits young families who finally bought a starter home and then learned the tax bill is another mortgage.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-0e8ed559', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'There is another way. If you own your home, you should not keep paying rent to the government forever.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-01829096', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Eliminate 100% of property taxes on homesteaded homes . Your home, your money, and your freedom belong to you, not them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-a3a8689b', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Florida families should never be taxed out of houses they already paid for . Government should live within its means, just like those families do.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-c51e239f', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Fight to eliminate homestead property taxes so owners are not billed every year for staying in their own home.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-5f6c3928', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Force state and local governments to set priorities and cut waste instead of leaning on the next assessment increase.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-52b4e977', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'If you own your home, you shouldn’t have to keep paying the government for the privilege of living in it.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-784fcb9d', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Housing gets cheaper when people are free to build, buy, and rent without a maze of permission . Get government out of the way of new homes, especially starter homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-ad74a8fd', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-84076', 'Housing gets cheaper when people are free to build, buy, and rent without a maze of permission . Get government out of the way of new homes, especially starter homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-15004701', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'We will not pretend a new office in Tallahassee can wish prices down . Cut the barriers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-b1a8a2dd', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-84076', 'Strip the red tape that makes ordinary homes take years and extra dollars to approve.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-3e822f65', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A2', 'Support local decisions that add starter homes and rentals without turning every project into a political fight.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-30694cc5', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-84076', 'Support local decisions that add starter homes and rentals without turning every project into a political fight.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-63aa521a', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-84076', 'Respect property rights while rejecting the idea that government should pick winners among developers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-d804a706', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-84076', 'Secure the border. Make legal immigration simpler and faster . Focus enforcement on criminals, traffickers, and real security threats.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-0a4fbcc2', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Peaceful people who want to work and follow the law should not face a wall of bureaucracy . People who commit crimes should not get a pass.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-465b19b6', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-84076', 'Support secure borders and clear enforcement against criminals, traffickers, and genuine security threats.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-8dad52fb', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-84076', 'Push for a simpler, faster legal path so honest people can come, work, and contribute without disappearing into a backlog.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-f8a3706c', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV1--FL-DOE-84076', 'Protect the rule of law so legal residents and citizens are not asked to ignore the rules everyone else is told to follow.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-9828c396', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-84076', 'Welcome people who come to build a life and assimilate. Stop people who come to harm our way of life. Make the lawful path the easier path.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-b1ff19d3', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'Too often the system protects itself first . Families get assigned a building and told to be grateful. Teachers get buried in paperwork. Kids who need something different wait. A mom who wants to homeschool, pick a charter, or try a small private school should not have to fight the state for permission to do what is best for her child.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-8d767ddf', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'Parents decide. Funding should follow the student , whether that is a traditional public school, a charter, a private school, homeschool, or another option that fits the child.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-25c186a4', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'ZIP code and income should not trap a family in a school that is failing their kid . Choice is for every parent, not only the ones who can already buy their way out.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-e1bdd6fe', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'Make money follow the child so families have real options, not just a brochure.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-504680c0', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', 'Patients and healthcare professionals should come first. People need affordable care and more choices, not a thicker rulebook.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-720fa410', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', 'Government should not make healthcare more expensive or more confusing . More options, clearer prices, and fewer barriers beat another layer of control.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-f287a9c0', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', 'A nurse or doctor should be free to care for patients. A family should be free to pick the coverage that fits their life.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-f48fc9b0', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', 'Fight rules that raise premiums and shrink the number of plans families can actually use.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-f2c60e1a', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', 'Push for clearer prices so a parent can know the cost before the bill arrives.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-2537c8e4', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', 'Expand choices for workers, small shops, and people who buy coverage on their own.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-35f65d9b', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', 'People need care they can reach and a price they can live with. Government should stop making that harder.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-a03672cb', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-84076', 'Communities should grow without being crushed . Infrastructure is not a favor. If you allow the houses, you have to be honest about the roads, water, sewer, and classrooms.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-fb601fd7', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV5--FL-DOE-84076', 'Demand that roads, water, sewer, and schools keep up with growth instead of trailing it by a decade.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-ff007456', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-84076', 'Stop using taxpayer incentives to force growth the community cannot support.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-ac5d53d5', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-84076', 'Support preparedness and mitigation that actually protect homes and businesses, not just press releases after landfall.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-579eb87e', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A5--FL-DOE-84076', 'Protect water quality and the Everglades without burying working people in paperwork that does not clean a single gallon.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-0d4afae2', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Oppose warrantless tracking of everyday Floridians, including ALPR and Flock style camera networks that log parents, nurses, and delivery drivers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-66dd8019', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Florida communities need to be safe . That means going after people who hurt others: violent offenders, traffickers, dealers who poison neighborhoods, and crews that treat theft like a business.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-a903d4d9', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'It also means the justice system should spend its time on real threats, not on turning everyday life into a dragnet . Warrantless cameras that log every errand do not make a family safer. They treat free people like suspects.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-562bb330', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Keep communities safe . Give law enforcement the tools to go after violent crime, trafficking, drugs, and organized theft.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-0d2ace54', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Demand accountability . Focus the justice system on people who pose a real threat. Protect the rights of everyone else.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-8f3b4ff5', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Support effective policing aimed at violent crime, trafficking, drugs, and organized theft.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-d579d7bf', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Push courts and prosecutors to focus resources on people who threaten public safety.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-167e7887', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Give local law enforcement flexibility to solve problems in their own communities, and hold them accountable when they abuse that power.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-769930be', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Safe streets. Free people. Go after real threats. Leave law abiding Floridians alone.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-fc45c55f', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'A robust economy with more living wage work is how families stay . Government does not create that by adding another office. It creates that by getting out of the way.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-a6d6f10a', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Trust people who build things . Small shops, the self employed, and gig workers should be free to earn a living without asking permission for every step.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-3f34a96b', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Keep taxes competitive. Cut rules that make it expensive to hire. Welcome new industries without handing them a taxpayer subsidy.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-8ff83d0c', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Cut occupational licenses and rules that block people from working.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-885e9ac6', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Make it cheaper and simpler to hire, especially for small shops. Keep Florida competitive on taxes without selling the state off through special deals.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-97d4672d', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-84076', 'Support workforce paths that lead to real jobs, trades, skills, and new industries, instead of paperwork theaters.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-f54bc41d', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Support workforce paths that lead to real jobs, trades, skills, and new industries, instead of paperwork theaters.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-d17310a3', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'Let Floridians work, hire, and build. The best jobs plan is less permission and more freedom.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-e6c16911', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Data centers should pay their own way for power, water, land, and grid upgrades . Taxpayers should not underwrite some of the world’s largest technology companies.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-06b8ac36', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Energy policy should serve Florida families first . That includes cleaner, safer, reliable power, and it includes nuclear as part of a serious energy future.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-98fb85d1', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Require data centers and similar projects to cover the power, water, and infrastructure they use instead of shifting costs onto household rates.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-ea79f1af', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Plan energy capacity for Florida homes and shops first, then for industrial demand that pays its own bill.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-c38dbcb5', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Support cleaner, safer, reliable energy, including nuclear, so the state is not stuck choosing between growth and brownouts.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-5da4d8e9', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Florida should welcome builders and innovators. It should not put their power bill on your kitchen table.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-8b12ea12', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', 'Florida should welcome builders and innovators. It should not put their power bill on your kitchen table.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-94221a52', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Communities still need real policing aimed at real threats. Tracking every errand is not the same thing. It is cheaper for government to watch everyone than to do the harder work of going after people who actually hurt others.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-a960e318', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'If police have a suspect and a warrant, they can do their job. That is a far cry from logging parents, nurses, and delivery drivers by default.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-2d14d208', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Stop selling “public safety” as a reason to watch people who have done nothing wrong.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-a30f835b', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', 'Keep law enforcement focused on violent crime, trafficking, and real threats, not on building a map of every drive to school and every night shift.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-ad5af6f7', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A4', 'Floridians are working harder than ever . Government keeps making life more expensive and more complicated. We’re running as Libertarians because we trust you. Keep more of what you earn. Raise your kids your way. Live without a stack of new rules from Tallahassee or Washington. If you want leaders who get out of the way instead of standing in it, stand with us.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-d5e8cc0c', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Stop taxing people out of their homes. If you own your homestead, you should not keep paying the government for the privilege of living in it.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-dc5664fc', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'Put parents in the driver’s seat. Education money should follow the child. Parents know their kids better than Tallahassee does.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-ee6654af', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-84076', 'Secure the border and open a lawful path to work. Welcome peaceful people who come to build a life. Focus enforcement on criminals, traffickers, and real threats.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-d97a9bb4', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Scott and Regina live in Boca Raton, where they face the same insurance premiums, property costs, and everyday pressures that millions of their neighbors know all too well. For Scott, this isn''t abstract policy; it''s personal. He has drafted concrete proposals to reform Florida''s broken homeowners insurance system because he''s lived the frustration of paying far more in premiums than is ever paid back in claims. He is the only candidate who has attended the legislative sessions in person, and he''s fighting to eliminate property tax for every homestead homeowner in the state.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-b508a766', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', 'Scott and Regina live in Boca Raton, where they face the same insurance premiums, property costs, and everyday pressures that millions of their neighbors know all too well. For Scott, this isn''t abstract policy; it''s personal. He has drafted concrete proposals to reform Florida''s broken homeowners insurance system because he''s lived the frustration of paying far more in premiums than is ever paid back in claims. He is the only candidate who has attended the legislative sessions in person, and he''s fighting to eliminate property tax for every homestead homeowner in the state.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-dd8ad15e', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Scott is not a career politician. He''s a builder who has solved hard problems in the private sector and for the Department of Defense . He has already drafted insurance reform legislation and a detailed plan, because he refuses to accept that Floridians should keep paying six times more in premiums than they ever receive back in claims.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-490fa98f', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', 'His agenda centers on a strong economy with more living wage jobs , real educational choice, public safety, lower taxes, and a government that respects the rights of every Floridian, regardless of which party they usually vote for.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-84076-8d5994ef', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', 'His agenda centers on a strong economy with more living wage jobs , real educational choice, public safety, lower taxes, and a government that respects the rights of every Floridian, regardless of which party they usually vote for.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-89042-eab71dac', source_id FROM source WHERE url_norm = 'byrondonalds.com'
UNION ALL
  SELECT 'claim-FL-DOE-89042-19390392', source_id FROM source WHERE url_norm = 'byrondonalds.com'
UNION ALL
  SELECT 'claim-FL-DOE-89042-37eac487', source_id FROM source WHERE url_norm = 'byrondonalds.com'
UNION ALL
  SELECT 'claim-FL-DOE-89042-d21e87f5', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/law-and-order'
UNION ALL
  SELECT 'claim-FL-DOE-89042-edbfe7aa', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/law-and-order'
UNION ALL
  SELECT 'claim-FL-DOE-89042-b5fdff2b', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/law-and-order'
UNION ALL
  SELECT 'claim-FL-DOE-89042-d6f40531', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/law-and-order'
UNION ALL
  SELECT 'claim-FL-DOE-89042-5703267d', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/law-and-order'
UNION ALL
  SELECT 'claim-FL-DOE-89042-18982559', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/law-and-order'
UNION ALL
  SELECT 'claim-FL-DOE-89042-fc320e10', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/law-and-order'
UNION ALL
  SELECT 'claim-FL-DOE-89042-2453a61f', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/education'
UNION ALL
  SELECT 'claim-FL-DOE-89042-8c6e14bf', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/education'
UNION ALL
  SELECT 'claim-FL-DOE-89042-47fa2f9a', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/education'
UNION ALL
  SELECT 'claim-FL-DOE-89042-4958cb63', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/education'
UNION ALL
  SELECT 'claim-FL-DOE-89042-dab37593', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-b5bb8ff1', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-16759930', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-25e9e64c', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-8d390ab5', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-997872de', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-328fc44e', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-febdcb82', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89042-037470b0', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/space-and-tech'
UNION ALL
  SELECT 'claim-FL-DOE-89042-1a44be9f', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/economy'
UNION ALL
  SELECT 'claim-FL-DOE-89042-f8551817', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/economy'
UNION ALL
  SELECT 'claim-FL-DOE-89042-ed9255c1', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/economy'
UNION ALL
  SELECT 'claim-FL-DOE-89042-78bc19d3', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/economy'
UNION ALL
  SELECT 'claim-FL-DOE-89042-1c99d9cd', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-89042-6f7bc21b', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-89042-060feae6', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-89042-460052a4', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-89042-e4763ba9', source_id FROM source WHERE url_norm = 'byrondonalds.com/issues/healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-90630-1326b745', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-e489a8dc', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-1f5e1317', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-d59ef041', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-5c4990a7', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-f276de12', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-72df0b11', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-b500f80a', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-f26829f1', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-db9f7ca2', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-9287a21c', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-ab57fdfb', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-2babadb9', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-6676ce3b', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-b22c09bc', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-03509ce5', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-cf1c9be7', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-57cf1b22', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-327eba65', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-b81e21ff', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-f4149bbf', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-9d20aa5c', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-007e4119', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-5156ef6b', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-6afb9fcb', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-3583c626', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-72e7eb2e', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-53e9bf85', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-e04c011c', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-ecf2868c', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-0dc1aec9', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-92424984', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-86c2d619', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-1d4af61e', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-58903250', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-0cc0b901', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-be0b5dc2', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-d5d7e0af', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-22703cf3', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-3061fa1a', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-fc8ba1d2', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-d2d350cb', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-ff978635', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-a891ee15', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-ec44ff5d', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-f33a29db', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-af04ca7f', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-3e61c7b1', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-a6cdf448', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-dc2737cd', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-b40a62c6', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-6aa0a10e', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-384302c6', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-be5deb60', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-961906dd', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-461290dc', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-706f7291', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-75b86104', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-76fc3576', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-5284a601', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-296f517d', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-ced28d5d', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-cc2ea413', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-90630-432d3862', source_id FROM source WHERE url_norm = 'burkettforgov.com'
UNION ALL
  SELECT 'claim-FL-DOE-89243-697d6a2e', source_id FROM source WHERE url_norm = 'davidjolly.com/homeowners-insurance'
UNION ALL
  SELECT 'claim-FL-DOE-89243-863e97d1', source_id FROM source WHERE url_norm = 'davidjolly.com/homeowners-insurance'
UNION ALL
  SELECT 'claim-FL-DOE-89243-a9c875e8', source_id FROM source WHERE url_norm = 'davidjolly.com/homeowners-insurance'
UNION ALL
  SELECT 'claim-FL-DOE-89243-c2ec4232', source_id FROM source WHERE url_norm = 'davidjolly.com/homeowners-insurance'
UNION ALL
  SELECT 'claim-FL-DOE-89243-075197df', source_id FROM source WHERE url_norm = 'davidjolly.com/homeowners-insurance'
UNION ALL
  SELECT 'claim-FL-DOE-89243-0083b242', source_id FROM source WHERE url_norm = 'davidjolly.com/homeowners-insurance'
UNION ALL
  SELECT 'claim-FL-DOE-89243-465fdfe4', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-e1da7e5b', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-547f863d', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-85e3db16', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-4b4c856c', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-fafef46f', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d010d03a', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-241bd399', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-1a6ced69', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d453a07e', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-a5c37184', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-bc9ab697', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-8824b2dd', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-70f4e354', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-b019efe6', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-0548e5b1', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-e345b517', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-883aec3c', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d56ffe8c', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/health-care'
UNION ALL
  SELECT 'claim-FL-DOE-89243-94f2d306', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/health-care'
UNION ALL
  SELECT 'claim-FL-DOE-89243-bd60f899', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/health-care'
UNION ALL
  SELECT 'claim-FL-DOE-89243-b0090273', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/health-care'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d997fcc3', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/health-care'
UNION ALL
  SELECT 'claim-FL-DOE-89243-2c578ebf', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/public-education'
UNION ALL
  SELECT 'claim-FL-DOE-89243-258049c6', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/public-education'
UNION ALL
  SELECT 'claim-FL-DOE-89243-25eefe94', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/public-education'
UNION ALL
  SELECT 'claim-FL-DOE-89243-f68ba3c3', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/public-education'
UNION ALL
  SELECT 'claim-FL-DOE-89243-5020c1c0', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/public-education'
UNION ALL
  SELECT 'claim-FL-DOE-89243-32775a74', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/public-education'
UNION ALL
  SELECT 'claim-FL-DOE-89243-4fc3fa00', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/public-education'
UNION ALL
  SELECT 'claim-FL-DOE-89243-1a75c9f6', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-e03d78d9', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-4f7fb113', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-c117b02e', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-f65647a1', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-933b9fdf', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-1eb35ecb', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-169b726e', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-b4437ad2', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-2ad3d2c5', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-85ef825f', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-734bca05', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d1823d54', source_id FROM source WHERE url_norm = 'davidjolly.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d4b1f4ea', source_id FROM source WHERE url_norm = 'davidjolly.com/jolly-insurance-proposal-facts'
UNION ALL
  SELECT 'claim-FL-DOE-89243-b61a6821', source_id FROM source WHERE url_norm = 'davidjolly.com/jolly-insurance-proposal-facts'
UNION ALL
  SELECT 'claim-FL-DOE-89243-97c9fc6a', source_id FROM source WHERE url_norm = 'davidjolly.com/jolly-insurance-proposal-facts'
UNION ALL
  SELECT 'claim-FL-DOE-89243-19db108f', source_id FROM source WHERE url_norm = 'davidjolly.com/where-david-stands'
UNION ALL
  SELECT 'claim-FL-DOE-89243-6c95ca42', source_id FROM source WHERE url_norm = 'davidjolly.com/where-david-stands'
UNION ALL
  SELECT 'claim-FL-DOE-89243-ae94a9b3', source_id FROM source WHERE url_norm = 'davidjolly.com/where-david-stands'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d9b5e5d4', source_id FROM source WHERE url_norm = 'davidjolly.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-89243-02db7401', source_id FROM source WHERE url_norm = 'davidjolly.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-89243-326b62d1', source_id FROM source WHERE url_norm = 'davidjolly.com/about'
UNION ALL
  SELECT 'claim-FL-DOE-89571-7f48a847', source_id FROM source WHERE url_norm = 'russo2026.com'
UNION ALL
  SELECT 'claim-FL-DOE-89571-6ba87ac5', source_id FROM source WHERE url_norm = 'russo2026.com'
UNION ALL
  SELECT 'claim-FL-DOE-89571-c701fd15', source_id FROM source WHERE url_norm = 'russo2026.com'
UNION ALL
  SELECT 'claim-FL-DOE-89571-13d5ad7e', source_id FROM source WHERE url_norm = 'russo2026.com'
UNION ALL
  SELECT 'claim-FL-DOE-89571-a6277538', source_id FROM source WHERE url_norm = 'russo2026.com'
UNION ALL
  SELECT 'claim-FL-DOE-89571-37b2978e', source_id FROM source WHERE url_norm = 'russo2026.com'
UNION ALL
  SELECT 'claim-FL-DOE-89571-3b413adc', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-6f872f3a', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-f0e49f2b', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-2f95703c', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-1bf742a8', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-dafc6778', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-1258a09d', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-3b0929b9', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-5bef209f', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-e9a86174', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-db78775e', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-05566d99', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-01149069', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-9bd33ea0', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-dcd98692', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-8efeb562', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/children-teachers-trades'
UNION ALL
  SELECT 'claim-FL-DOE-89571-1604577d', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-3a889edd', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-dcf1bae0', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-8d1b73b4', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-c898e1f6', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-bb87d82e', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-533fb7c8', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-9f0dba05', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-ec240228', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-04a50e53', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/immigration'
UNION ALL
  SELECT 'claim-FL-DOE-89571-75d888c4', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89571-ef6883fa', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89571-838e7530', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89571-f973f76a', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89571-d0509601', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89571-1c93597e', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89571-e7a8a0ae', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-89571-370b12ac', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89571-c6257f5c', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89571-4124395b', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89571-a92d1662', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89571-15db0c50', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/innovation'
UNION ALL
  SELECT 'claim-FL-DOE-89571-e7952238', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/innovation'
UNION ALL
  SELECT 'claim-FL-DOE-89571-66ec838b', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/innovation'
UNION ALL
  SELECT 'claim-FL-DOE-89571-994fe02a', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/innovation'
UNION ALL
  SELECT 'claim-FL-DOE-89571-475eed74', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/innovation'
UNION ALL
  SELECT 'claim-FL-DOE-89571-bd3cb724', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/innovation'
UNION ALL
  SELECT 'claim-FL-DOE-89571-87502f81', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/innovation'
UNION ALL
  SELECT 'claim-FL-DOE-89571-fabc4344', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/florida-9-9'
UNION ALL
  SELECT 'claim-FL-DOE-89571-5b938a13', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/florida-9-9'
UNION ALL
  SELECT 'claim-FL-DOE-89571-7c4b8a9f', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/florida-9-9'
UNION ALL
  SELECT 'claim-FL-DOE-89571-05d0620f', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/florida-9-9'
UNION ALL
  SELECT 'claim-FL-DOE-89571-d1149e5d', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/florida-9-9'
UNION ALL
  SELECT 'claim-FL-DOE-89571-955c36a9', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/florida-9-9'
UNION ALL
  SELECT 'claim-FL-DOE-89571-bf4da03b', source_id FROM source WHERE url_norm = 'russo2026.com/en/priorities/florida-9-9'
UNION ALL
  SELECT 'claim-FL-DOE-88529-0c603efe', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-d6e8d2b1', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-8b058de3', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-145e0735', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-cd2b9047', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-62178dbd', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-3e559507', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-92b14ece', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-36b82874', source_id FROM source WHERE url_norm = 'nomoecorruption.com'
UNION ALL
  SELECT 'claim-FL-DOE-88529-fdd93cf2', source_id FROM source WHERE url_norm = 'nomoecorruption.com/2024/12/06/judicial-cleanup'
UNION ALL
  SELECT 'claim-FL-DOE-88529-d62e1060', source_id FROM source WHERE url_norm = 'nomoecorruption.com/2024/12/06/judicial-cleanup'
UNION ALL
  SELECT 'claim-FL-DOE-88529-3830ff3f', source_id FROM source WHERE url_norm = 'nomoecorruption.com/2024/12/06/judicial-cleanup'
UNION ALL
  SELECT 'claim-FL-DOE-88529-6e76f4cc', source_id FROM source WHERE url_norm = 'nomoecorruption.com/2024/12/06/judicial-cleanup'
UNION ALL
  SELECT 'claim-FL-DOE-88529-1fbbe33e', source_id FROM source WHERE url_norm = 'nomoecorruption.com/2024/12/06/judicial-cleanup'
UNION ALL
  SELECT 'claim-FL-DOE-88529-55b499dc', source_id FROM source WHERE url_norm = 'nomoecorruption.com/2024/12/06/judicial-cleanup'
UNION ALL
  SELECT 'claim-FL-DOE-84076-d4e144b2', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-2f4ab892', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-3edbc716', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-4c359131', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-ef16ca5b', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-53d220f9', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-c1df32b3', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-877d9110', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-1a1a752b', source_id FROM source WHERE url_norm = 'scottjewett.com'
UNION ALL
  SELECT 'claim-FL-DOE-84076-0e311e03', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-fe30886a', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-dfdcfb20', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-73b3fa5f', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-936394c4', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-7fd2fefe', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-fbe0b4d1', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-4eb383bf', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-5758d421', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-08768490', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-0e8ed559', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-01829096', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-a3a8689b', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-c51e239f', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-5f6c3928', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-52b4e977', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-784fcb9d', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-ad74a8fd', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-15004701', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-b1a8a2dd', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-3e822f65', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-30694cc5', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-63aa521a', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-d804a706', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-0a4fbcc2', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-465b19b6', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-8dad52fb', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-f8a3706c', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-9828c396', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-b1ff19d3', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-8d767ddf', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-25c186a4', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-e1bdd6fe', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-504680c0', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-720fa410', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-f287a9c0', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-f48fc9b0', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-f2c60e1a', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-2537c8e4', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-35f65d9b', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-a03672cb', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-fb601fd7', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-ff007456', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-ac5d53d5', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-579eb87e', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-0d4afae2', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-66dd8019', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-a903d4d9', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-562bb330', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-0d2ace54', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-8f3b4ff5', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-d579d7bf', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-167e7887', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-769930be', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-fc45c55f', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-a6d6f10a', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-3f34a96b', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-8ff83d0c', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-885e9ac6', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-97d4672d', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-f54bc41d', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-d17310a3', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-e6c16911', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-06b8ac36', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-98fb85d1', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-ea79f1af', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-c38dbcb5', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-5da4d8e9', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-8b12ea12', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-94221a52', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-a960e318', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-2d14d208', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-a30f835b', source_id FROM source WHERE url_norm = 'scottjewett.com/the-issues'
UNION ALL
  SELECT 'claim-FL-DOE-84076-ad5af6f7', source_id FROM source WHERE url_norm = 'scottjewett.com/our-mission'
UNION ALL
  SELECT 'claim-FL-DOE-84076-d5e8cc0c', source_id FROM source WHERE url_norm = 'scottjewett.com/our-mission'
UNION ALL
  SELECT 'claim-FL-DOE-84076-dc5664fc', source_id FROM source WHERE url_norm = 'scottjewett.com/our-mission'
UNION ALL
  SELECT 'claim-FL-DOE-84076-ee6654af', source_id FROM source WHERE url_norm = 'scottjewett.com/our-mission'
UNION ALL
  SELECT 'claim-FL-DOE-84076-d97a9bb4', source_id FROM source WHERE url_norm = 'scottjewett.com/meet-scott'
UNION ALL
  SELECT 'claim-FL-DOE-84076-b508a766', source_id FROM source WHERE url_norm = 'scottjewett.com/meet-scott'
UNION ALL
  SELECT 'claim-FL-DOE-84076-dd8ad15e', source_id FROM source WHERE url_norm = 'scottjewett.com/meet-scott'
UNION ALL
  SELECT 'claim-FL-DOE-84076-490fa98f', source_id FROM source WHERE url_norm = 'scottjewett.com/meet-scott'
UNION ALL
  SELECT 'claim-FL-DOE-84076-8d5994ef', source_id FROM source WHERE url_norm = 'scottjewett.com/meet-scott'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89042-9bd5d047', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY['claim-FL-DOE-89042-b5bb8ff1','claim-FL-DOE-89042-16759930','claim-FL-DOE-89042-8d390ab5','claim-FL-DOE-89042-997872de']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-9dd5d36d', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY['claim-FL-DOE-89042-328fc44e']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-9cd5d1da', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89042-96d5c868', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY['claim-FL-DOE-89042-eab71dac','claim-FL-DOE-89042-dab37593']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-0ddd3f82', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-19390392','claim-FL-DOE-89042-d21e87f5','claim-FL-DOE-89042-edbfe7aa','claim-FL-DOE-89042-d6f40531','claim-FL-DOE-89042-5703267d']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-0bdd3c5c', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-37eac487','claim-FL-DOE-89042-b5fdff2b','claim-FL-DOE-89042-037470b0','claim-FL-DOE-89042-1a44be9f','claim-FL-DOE-89042-ed9255c1']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-09dd3936', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-18982559','claim-FL-DOE-89042-fc320e10']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-98d5cb8e', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-2453a61f']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-6c14946c', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-8c6e14bf','claim-FL-DOE-89042-47fa2f9a']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-adb280bc', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-4958cb63']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-b2b2889b', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-25e9e64c']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-b8b2920d', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-febdcb82']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-b7b2907a', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-f8551817','claim-FL-DOE-89042-78bc19d3']::text[], true, 'stated'),
  ('pos-FL-DOE-89042-0edd4115', 'FL-DOE-89042', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89042', '', ARRAY['claim-FL-DOE-89042-1c99d9cd','claim-FL-DOE-89042-6f7bc21b','claim-FL-DOE-89042-060feae6','claim-FL-DOE-89042-460052a4','claim-FL-DOE-89042-e4763ba9']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-9bd5d047', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY['claim-FL-DOE-90630-57cf1b22','claim-FL-DOE-90630-f4149bbf','claim-FL-DOE-90630-e04c011c','claim-FL-DOE-90630-d5d7e0af','claim-FL-DOE-90630-22703cf3']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-9dd5d36d', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY['claim-FL-DOE-90630-e489a8dc','claim-FL-DOE-90630-f276de12','claim-FL-DOE-90630-327eba65','claim-FL-DOE-90630-007e4119','claim-FL-DOE-90630-af04ca7f','claim-FL-DOE-90630-3e61c7b1','claim-FL-DOE-90630-dc2737cd','claim-FL-DOE-90630-b40a62c6','claim-FL-DOE-90630-6aa0a10e','claim-FL-DOE-90630-961906dd']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-9cd5d1da', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY['claim-FL-DOE-90630-1326b745','claim-FL-DOE-90630-9d20aa5c','claim-FL-DOE-90630-d2d350cb','claim-FL-DOE-90630-ff978635','claim-FL-DOE-90630-a6cdf448','claim-FL-DOE-90630-be5deb60','claim-FL-DOE-90630-296f517d','claim-FL-DOE-90630-432d3862']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-96d5c868', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY['claim-FL-DOE-90630-1f5e1317','claim-FL-DOE-90630-72df0b11','claim-FL-DOE-90630-76fc3576']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-b7b2907a', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-d59ef041','claim-FL-DOE-90630-9287a21c','claim-FL-DOE-90630-ab57fdfb','claim-FL-DOE-90630-03509ce5','claim-FL-DOE-90630-fc8ba1d2','claim-FL-DOE-90630-a891ee15','claim-FL-DOE-90630-ec44ff5d','claim-FL-DOE-90630-75b86104','claim-FL-DOE-90630-ced28d5d','claim-FL-DOE-90630-cc2ea413']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-0bdd3c5c', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-5c4990a7','claim-FL-DOE-90630-6676ce3b','claim-FL-DOE-90630-f33a29db']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-0edd4115', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-b500f80a','claim-FL-DOE-90630-3583c626','claim-FL-DOE-90630-72e7eb2e','claim-FL-DOE-90630-ecf2868c','claim-FL-DOE-90630-0dc1aec9','claim-FL-DOE-90630-92424984','claim-FL-DOE-90630-86c2d619','claim-FL-DOE-90630-1d4af61e','claim-FL-DOE-90630-58903250','claim-FL-DOE-90630-0cc0b901','claim-FL-DOE-90630-be0b5dc2','claim-FL-DOE-90630-3061fa1a']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-b1b28708', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV5--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-f26829f1','claim-FL-DOE-90630-cf1c9be7']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-07dd3610', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B5--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-db9f7ca2','claim-FL-DOE-90630-53e9bf85']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-98d5cb8e', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-2babadb9','claim-FL-DOE-90630-384302c6']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-b8b2920d', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-b22c09bc','claim-FL-DOE-90630-706f7291','claim-FL-DOE-90630-5284a601']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-b2b2889b', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-b81e21ff','claim-FL-DOE-90630-5156ef6b','claim-FL-DOE-90630-6afb9fcb']::text[], true, 'stated'),
  ('pos-FL-DOE-90630-0ddd3f82', 'FL-DOE-90630', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-90630', '', ARRAY['claim-FL-DOE-90630-461290dc']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-9bd5d047', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY['claim-FL-DOE-89243-697d6a2e','claim-FL-DOE-89243-863e97d1','claim-FL-DOE-89243-a9c875e8','claim-FL-DOE-89243-c2ec4232','claim-FL-DOE-89243-075197df','claim-FL-DOE-89243-0083b242','claim-FL-DOE-89243-465fdfe4','claim-FL-DOE-89243-fafef46f','claim-FL-DOE-89243-1a75c9f6','claim-FL-DOE-89243-d4b1f4ea','claim-FL-DOE-89243-b61a6821','claim-FL-DOE-89243-97c9fc6a','claim-FL-DOE-89243-19db108f']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-9dd5d36d', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89243-9cd5d1da', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY['claim-FL-DOE-89243-e1da7e5b','claim-FL-DOE-89243-1a6ced69','claim-FL-DOE-89243-d453a07e','claim-FL-DOE-89243-70f4e354','claim-FL-DOE-89243-e345b517','claim-FL-DOE-89243-e03d78d9']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-96d5c868', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY['claim-FL-DOE-89243-547f863d','claim-FL-DOE-89243-d010d03a','claim-FL-DOE-89243-a5c37184','claim-FL-DOE-89243-b019efe6','claim-FL-DOE-89243-4f7fb113']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b8b2920d', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-85e3db16','claim-FL-DOE-89243-241bd399','claim-FL-DOE-89243-0548e5b1','claim-FL-DOE-89243-2ad3d2c5','claim-FL-DOE-89243-6c95ca42']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-aeb2824f', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-4b4c856c','claim-FL-DOE-89243-8824b2dd','claim-FL-DOE-89243-883aec3c','claim-FL-DOE-89243-c117b02e']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b4b28bc1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV6--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-bc9ab697']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-0edd4115', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-d56ffe8c','claim-FL-DOE-89243-94f2d306','claim-FL-DOE-89243-bd60f899','claim-FL-DOE-89243-b0090273','claim-FL-DOE-89243-d997fcc3','claim-FL-DOE-89243-d1823d54','claim-FL-DOE-89243-d9b5e5d4']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-98d5cb8e', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-2c578ebf','claim-FL-DOE-89243-258049c6','claim-FL-DOE-89243-25eefe94','claim-FL-DOE-89243-5020c1c0','claim-FL-DOE-89243-32775a74','claim-FL-DOE-89243-4fc3fa00','claim-FL-DOE-89243-f65647a1','claim-FL-DOE-89243-02db7401']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-adb280bc', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-f68ba3c3','claim-FL-DOE-89243-933b9fdf']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-0bdd3c5c', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-1eb35ecb','claim-FL-DOE-89243-326b62d1']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-07dd3610', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B5--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-169b726e']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-6c14946c', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-b4437ad2']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-99d5cd21', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A7--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-85ef825f']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-09dd3936', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-734bca05']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b7b2907a', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-ae94a9b3']::text[], true, 'stated'),
  ('pos-FL-DOE-90433-9bd5d047', 'FL-DOE-90433', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90433-9dd5d36d', 'FL-DOE-90433', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90433-9cd5d1da', 'FL-DOE-90433', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90433-96d5c868', 'FL-DOE-90433', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89571-9bd5d047', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY['claim-FL-DOE-89571-ef6883fa']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-9dd5d36d', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY['claim-FL-DOE-89571-f973f76a','claim-FL-DOE-89571-370b12ac']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-9cd5d1da', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY['claim-FL-DOE-89571-838e7530','claim-FL-DOE-89571-c6257f5c','claim-FL-DOE-89571-5b938a13']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-96d5c868', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY['claim-FL-DOE-89571-4124395b']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-98d5cb8e', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89571', '', ARRAY['claim-FL-DOE-89571-7f48a847','claim-FL-DOE-89571-3b413adc','claim-FL-DOE-89571-f0e49f2b','claim-FL-DOE-89571-2f95703c','claim-FL-DOE-89571-1bf742a8','claim-FL-DOE-89571-dafc6778','claim-FL-DOE-89571-1258a09d','claim-FL-DOE-89571-9bd33ea0','claim-FL-DOE-89571-75d888c4','claim-FL-DOE-89571-a92d1662','claim-FL-DOE-89571-fabc4344']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-6c14946c', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89571', '', ARRAY['claim-FL-DOE-89571-6ba87ac5','claim-FL-DOE-89571-6f872f3a','claim-FL-DOE-89571-3b0929b9','claim-FL-DOE-89571-5bef209f','claim-FL-DOE-89571-e9a86174','claim-FL-DOE-89571-05566d99','claim-FL-DOE-89571-dcd98692','claim-FL-DOE-89571-1c93597e','claim-FL-DOE-89571-475eed74','claim-FL-DOE-89571-7c4b8a9f']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-0bdd3c5c', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89571', '', ARRAY['claim-FL-DOE-89571-c701fd15','claim-FL-DOE-89571-13d5ad7e','claim-FL-DOE-89571-db78775e','claim-FL-DOE-89571-01149069','claim-FL-DOE-89571-8efeb562','claim-FL-DOE-89571-e7a8a0ae','claim-FL-DOE-89571-15db0c50','claim-FL-DOE-89571-e7952238','claim-FL-DOE-89571-bd3cb724','claim-FL-DOE-89571-87502f81','claim-FL-DOE-89571-05d0620f','claim-FL-DOE-89571-d1149e5d','claim-FL-DOE-89571-955c36a9','claim-FL-DOE-89571-bf4da03b']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-0ddd3f82', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-89571', '', ARRAY['claim-FL-DOE-89571-a6277538','claim-FL-DOE-89571-37b2978e','claim-FL-DOE-89571-1604577d','claim-FL-DOE-89571-8d1b73b4','claim-FL-DOE-89571-c898e1f6','claim-FL-DOE-89571-bb87d82e','claim-FL-DOE-89571-533fb7c8','claim-FL-DOE-89571-9f0dba05','claim-FL-DOE-89571-ec240228','claim-FL-DOE-89571-04a50e53']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-09dd3936', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89571', '', ARRAY['claim-FL-DOE-89571-3a889edd','claim-FL-DOE-89571-dcf1bae0']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-b8b2920d', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89571', '', ARRAY['claim-FL-DOE-89571-d0509601','claim-FL-DOE-89571-66ec838b']::text[], true, 'stated'),
  ('pos-FL-DOE-89571-b7b2907a', 'FL-DOE-89571', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89571', '', ARRAY['claim-FL-DOE-89571-994fe02a']::text[], true, 'stated'),
  ('pos-FL-DOE-89630-9bd5d047', 'FL-DOE-89630', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89630-9dd5d36d', 'FL-DOE-89630', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89630-9cd5d1da', 'FL-DOE-89630', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89630-96d5c868', 'FL-DOE-89630', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88529-9bd5d047', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88529-9dd5d36d', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY['claim-FL-DOE-88529-d6e8d2b1','claim-FL-DOE-88529-145e0735','claim-FL-DOE-88529-62178dbd','claim-FL-DOE-88529-92b14ece']::text[], true, 'stated'),
  ('pos-FL-DOE-88529-9cd5d1da', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88529-96d5c868', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88529-0ddd3f82', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-88529', '', ARRAY['claim-FL-DOE-88529-0c603efe']::text[], true, 'stated'),
  ('pos-FL-DOE-88529-aeb2824f', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-88529', '', ARRAY['claim-FL-DOE-88529-8b058de3','claim-FL-DOE-88529-cd2b9047','claim-FL-DOE-88529-3e559507','claim-FL-DOE-88529-36b82874']::text[], true, 'stated'),
  ('pos-FL-DOE-88529-b5b28d54', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-KYV1--FL-DOE-88529', '', ARRAY['claim-FL-DOE-88529-fdd93cf2','claim-FL-DOE-88529-6e76f4cc','claim-FL-DOE-88529-1fbbe33e']::text[], true, 'stated'),
  ('pos-FL-DOE-88529-09dd3936', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-88529', '', ARRAY['claim-FL-DOE-88529-d62e1060','claim-FL-DOE-88529-55b499dc']::text[], true, 'stated'),
  ('pos-FL-DOE-88529-0add3ac9', 'FL-DOE-88529', 'FL-GOV-general', 'FL-GOV-general--issue-B6--FL-DOE-88529', '', ARRAY['claim-FL-DOE-88529-3830ff3f']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-9bd5d047', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY['claim-FL-DOE-84076-ef16ca5b','claim-FL-DOE-84076-936394c4','claim-FL-DOE-84076-7fd2fefe','claim-FL-DOE-84076-fbe0b4d1','claim-FL-DOE-84076-4eb383bf','claim-FL-DOE-84076-d97a9bb4','claim-FL-DOE-84076-dd8ad15e']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-9dd5d36d', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY['claim-FL-DOE-84076-08768490','claim-FL-DOE-84076-0e8ed559','claim-FL-DOE-84076-01829096','claim-FL-DOE-84076-a3a8689b','claim-FL-DOE-84076-c51e239f','claim-FL-DOE-84076-5f6c3928','claim-FL-DOE-84076-52b4e977','claim-FL-DOE-84076-d5e8cc0c','claim-FL-DOE-84076-b508a766']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-9cd5d1da', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY['claim-FL-DOE-84076-53d220f9','claim-FL-DOE-84076-fe30886a','claim-FL-DOE-84076-5758d421','claim-FL-DOE-84076-784fcb9d','claim-FL-DOE-84076-15004701','claim-FL-DOE-84076-3e822f65']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-96d5c868', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY['claim-FL-DOE-84076-3edbc716','claim-FL-DOE-84076-c1df32b3','claim-FL-DOE-84076-5da4d8e9','claim-FL-DOE-84076-ad5af6f7']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-adb280bc', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-d4e144b2','claim-FL-DOE-84076-1a1a752b','claim-FL-DOE-84076-b1ff19d3','claim-FL-DOE-84076-8d767ddf','claim-FL-DOE-84076-25c186a4','claim-FL-DOE-84076-e1bdd6fe','claim-FL-DOE-84076-dc5664fc','claim-FL-DOE-84076-490fa98f']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-0bdd3c5c', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-2f4ab892','claim-FL-DOE-84076-4c359131','claim-FL-DOE-84076-0e311e03','claim-FL-DOE-84076-dfdcfb20','claim-FL-DOE-84076-fc45c55f','claim-FL-DOE-84076-a6d6f10a','claim-FL-DOE-84076-3f34a96b','claim-FL-DOE-84076-8ff83d0c','claim-FL-DOE-84076-885e9ac6','claim-FL-DOE-84076-f54bc41d','claim-FL-DOE-84076-d17310a3','claim-FL-DOE-84076-8d5994ef']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-b8b2920d', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-877d9110','claim-FL-DOE-84076-73b3fa5f','claim-FL-DOE-84076-e6c16911','claim-FL-DOE-84076-06b8ac36','claim-FL-DOE-84076-98fb85d1','claim-FL-DOE-84076-ea79f1af','claim-FL-DOE-84076-c38dbcb5','claim-FL-DOE-84076-8b12ea12']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-b7b2907a', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-ad74a8fd','claim-FL-DOE-84076-b1a8a2dd','claim-FL-DOE-84076-30694cc5','claim-FL-DOE-84076-63aa521a','claim-FL-DOE-84076-a03672cb','claim-FL-DOE-84076-ff007456']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-0ddd3f82', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B3--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-d804a706','claim-FL-DOE-84076-465b19b6','claim-FL-DOE-84076-8dad52fb','claim-FL-DOE-84076-9828c396','claim-FL-DOE-84076-ee6654af']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-09dd3936', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-0a4fbcc2','claim-FL-DOE-84076-0d4afae2','claim-FL-DOE-84076-66dd8019','claim-FL-DOE-84076-a903d4d9','claim-FL-DOE-84076-562bb330','claim-FL-DOE-84076-0d2ace54','claim-FL-DOE-84076-8f3b4ff5','claim-FL-DOE-84076-d579d7bf','claim-FL-DOE-84076-167e7887','claim-FL-DOE-84076-769930be','claim-FL-DOE-84076-94221a52','claim-FL-DOE-84076-a960e318','claim-FL-DOE-84076-2d14d208','claim-FL-DOE-84076-a30f835b']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-b5b28d54', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV1--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-f8a3706c']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-0edd4115', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-504680c0','claim-FL-DOE-84076-720fa410','claim-FL-DOE-84076-f287a9c0','claim-FL-DOE-84076-f48fc9b0','claim-FL-DOE-84076-f2c60e1a','claim-FL-DOE-84076-2537c8e4','claim-FL-DOE-84076-35f65d9b']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-b1b28708', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV5--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-fb601fd7']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-b2b2889b', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-ac5d53d5']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-97d5c9fb', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-A5--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-579eb87e']::text[], true, 'stated'),
  ('pos-FL-DOE-84076-6c14946c', 'FL-DOE-84076', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-84076', '', ARRAY['claim-FL-DOE-84076-97d4672d']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89042', 'FL-GOV-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89042-eab71dac','claim-FL-DOE-89042-19390392','claim-FL-DOE-89042-37eac487','claim-FL-DOE-89042-d21e87f5','claim-FL-DOE-89042-edbfe7aa','claim-FL-DOE-89042-b5fdff2b','claim-FL-DOE-89042-d6f40531','claim-FL-DOE-89042-5703267d','claim-FL-DOE-89042-18982559','claim-FL-DOE-89042-fc320e10','claim-FL-DOE-89042-2453a61f','claim-FL-DOE-89042-8c6e14bf','claim-FL-DOE-89042-47fa2f9a','claim-FL-DOE-89042-4958cb63','claim-FL-DOE-89042-dab37593','claim-FL-DOE-89042-b5bb8ff1','claim-FL-DOE-89042-16759930','claim-FL-DOE-89042-25e9e64c','claim-FL-DOE-89042-8d390ab5','claim-FL-DOE-89042-997872de','claim-FL-DOE-89042-328fc44e','claim-FL-DOE-89042-febdcb82','claim-FL-DOE-89042-037470b0','claim-FL-DOE-89042-1a44be9f','claim-FL-DOE-89042-f8551817','claim-FL-DOE-89042-ed9255c1','claim-FL-DOE-89042-78bc19d3','claim-FL-DOE-89042-1c99d9cd','claim-FL-DOE-89042-6f7bc21b','claim-FL-DOE-89042-060feae6','claim-FL-DOE-89042-460052a4','claim-FL-DOE-89042-e4763ba9']::text[], ARRAY[]::text[], '{"word_count":673,"verifiable_fact_count":0,"stated_position_count":32,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-90630', 'FL-GOV-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90630-1326b745','claim-FL-DOE-90630-e489a8dc','claim-FL-DOE-90630-1f5e1317','claim-FL-DOE-90630-d59ef041','claim-FL-DOE-90630-5c4990a7','claim-FL-DOE-90630-f276de12','claim-FL-DOE-90630-72df0b11','claim-FL-DOE-90630-b500f80a','claim-FL-DOE-90630-f26829f1','claim-FL-DOE-90630-db9f7ca2','claim-FL-DOE-90630-9287a21c','claim-FL-DOE-90630-ab57fdfb','claim-FL-DOE-90630-2babadb9','claim-FL-DOE-90630-6676ce3b','claim-FL-DOE-90630-b22c09bc','claim-FL-DOE-90630-03509ce5','claim-FL-DOE-90630-cf1c9be7','claim-FL-DOE-90630-57cf1b22','claim-FL-DOE-90630-327eba65','claim-FL-DOE-90630-b81e21ff','claim-FL-DOE-90630-f4149bbf','claim-FL-DOE-90630-9d20aa5c','claim-FL-DOE-90630-007e4119','claim-FL-DOE-90630-5156ef6b','claim-FL-DOE-90630-6afb9fcb','claim-FL-DOE-90630-3583c626','claim-FL-DOE-90630-72e7eb2e','claim-FL-DOE-90630-53e9bf85','claim-FL-DOE-90630-e04c011c','claim-FL-DOE-90630-ecf2868c','claim-FL-DOE-90630-0dc1aec9','claim-FL-DOE-90630-92424984','claim-FL-DOE-90630-86c2d619','claim-FL-DOE-90630-1d4af61e','claim-FL-DOE-90630-58903250','claim-FL-DOE-90630-0cc0b901','claim-FL-DOE-90630-be0b5dc2','claim-FL-DOE-90630-d5d7e0af','claim-FL-DOE-90630-22703cf3','claim-FL-DOE-90630-3061fa1a','claim-FL-DOE-90630-fc8ba1d2','claim-FL-DOE-90630-d2d350cb','claim-FL-DOE-90630-ff978635','claim-FL-DOE-90630-a891ee15','claim-FL-DOE-90630-ec44ff5d','claim-FL-DOE-90630-f33a29db','claim-FL-DOE-90630-af04ca7f','claim-FL-DOE-90630-3e61c7b1','claim-FL-DOE-90630-a6cdf448','claim-FL-DOE-90630-dc2737cd','claim-FL-DOE-90630-b40a62c6','claim-FL-DOE-90630-6aa0a10e','claim-FL-DOE-90630-384302c6','claim-FL-DOE-90630-be5deb60','claim-FL-DOE-90630-961906dd','claim-FL-DOE-90630-461290dc','claim-FL-DOE-90630-706f7291','claim-FL-DOE-90630-75b86104','claim-FL-DOE-90630-76fc3576','claim-FL-DOE-90630-5284a601','claim-FL-DOE-90630-296f517d','claim-FL-DOE-90630-ced28d5d','claim-FL-DOE-90630-cc2ea413','claim-FL-DOE-90630-432d3862']::text[], ARRAY[]::text[], '{"word_count":3058,"verifiable_fact_count":0,"stated_position_count":64,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb),
  ('FL-DOE-89243', 'FL-GOV-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89243-697d6a2e','claim-FL-DOE-89243-863e97d1','claim-FL-DOE-89243-a9c875e8','claim-FL-DOE-89243-c2ec4232','claim-FL-DOE-89243-075197df','claim-FL-DOE-89243-0083b242','claim-FL-DOE-89243-465fdfe4','claim-FL-DOE-89243-e1da7e5b','claim-FL-DOE-89243-547f863d','claim-FL-DOE-89243-85e3db16','claim-FL-DOE-89243-4b4c856c','claim-FL-DOE-89243-fafef46f','claim-FL-DOE-89243-d010d03a','claim-FL-DOE-89243-241bd399','claim-FL-DOE-89243-1a6ced69','claim-FL-DOE-89243-d453a07e','claim-FL-DOE-89243-a5c37184','claim-FL-DOE-89243-bc9ab697','claim-FL-DOE-89243-8824b2dd','claim-FL-DOE-89243-70f4e354','claim-FL-DOE-89243-b019efe6','claim-FL-DOE-89243-0548e5b1','claim-FL-DOE-89243-e345b517','claim-FL-DOE-89243-883aec3c','claim-FL-DOE-89243-d56ffe8c','claim-FL-DOE-89243-94f2d306','claim-FL-DOE-89243-bd60f899','claim-FL-DOE-89243-b0090273','claim-FL-DOE-89243-d997fcc3','claim-FL-DOE-89243-2c578ebf','claim-FL-DOE-89243-258049c6','claim-FL-DOE-89243-25eefe94','claim-FL-DOE-89243-f68ba3c3','claim-FL-DOE-89243-5020c1c0','claim-FL-DOE-89243-32775a74','claim-FL-DOE-89243-4fc3fa00','claim-FL-DOE-89243-1a75c9f6','claim-FL-DOE-89243-e03d78d9','claim-FL-DOE-89243-4f7fb113','claim-FL-DOE-89243-c117b02e','claim-FL-DOE-89243-f65647a1','claim-FL-DOE-89243-933b9fdf','claim-FL-DOE-89243-1eb35ecb','claim-FL-DOE-89243-169b726e','claim-FL-DOE-89243-b4437ad2','claim-FL-DOE-89243-2ad3d2c5','claim-FL-DOE-89243-85ef825f','claim-FL-DOE-89243-734bca05','claim-FL-DOE-89243-d1823d54','claim-FL-DOE-89243-d4b1f4ea','claim-FL-DOE-89243-b61a6821','claim-FL-DOE-89243-97c9fc6a','claim-FL-DOE-89243-19db108f','claim-FL-DOE-89243-6c95ca42','claim-FL-DOE-89243-ae94a9b3','claim-FL-DOE-89243-d9b5e5d4','claim-FL-DOE-89243-02db7401','claim-FL-DOE-89243-326b62d1']::text[], ARRAY[]::text[], '{"word_count":3403,"verifiable_fact_count":0,"stated_position_count":58,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-90433', 'FL-GOV-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-89571', 'FL-GOV-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89571-7f48a847','claim-FL-DOE-89571-6ba87ac5','claim-FL-DOE-89571-c701fd15','claim-FL-DOE-89571-13d5ad7e','claim-FL-DOE-89571-a6277538','claim-FL-DOE-89571-37b2978e','claim-FL-DOE-89571-3b413adc','claim-FL-DOE-89571-6f872f3a','claim-FL-DOE-89571-f0e49f2b','claim-FL-DOE-89571-2f95703c','claim-FL-DOE-89571-1bf742a8','claim-FL-DOE-89571-dafc6778','claim-FL-DOE-89571-1258a09d','claim-FL-DOE-89571-3b0929b9','claim-FL-DOE-89571-5bef209f','claim-FL-DOE-89571-e9a86174','claim-FL-DOE-89571-db78775e','claim-FL-DOE-89571-05566d99','claim-FL-DOE-89571-01149069','claim-FL-DOE-89571-9bd33ea0','claim-FL-DOE-89571-dcd98692','claim-FL-DOE-89571-8efeb562','claim-FL-DOE-89571-1604577d','claim-FL-DOE-89571-3a889edd','claim-FL-DOE-89571-dcf1bae0','claim-FL-DOE-89571-8d1b73b4','claim-FL-DOE-89571-c898e1f6','claim-FL-DOE-89571-bb87d82e','claim-FL-DOE-89571-533fb7c8','claim-FL-DOE-89571-9f0dba05','claim-FL-DOE-89571-ec240228','claim-FL-DOE-89571-04a50e53','claim-FL-DOE-89571-75d888c4','claim-FL-DOE-89571-ef6883fa','claim-FL-DOE-89571-838e7530','claim-FL-DOE-89571-f973f76a','claim-FL-DOE-89571-d0509601','claim-FL-DOE-89571-1c93597e','claim-FL-DOE-89571-e7a8a0ae','claim-FL-DOE-89571-370b12ac','claim-FL-DOE-89571-c6257f5c','claim-FL-DOE-89571-4124395b','claim-FL-DOE-89571-a92d1662','claim-FL-DOE-89571-15db0c50','claim-FL-DOE-89571-e7952238','claim-FL-DOE-89571-66ec838b','claim-FL-DOE-89571-994fe02a','claim-FL-DOE-89571-475eed74','claim-FL-DOE-89571-bd3cb724','claim-FL-DOE-89571-87502f81','claim-FL-DOE-89571-fabc4344','claim-FL-DOE-89571-5b938a13','claim-FL-DOE-89571-7c4b8a9f','claim-FL-DOE-89571-05d0620f','claim-FL-DOE-89571-d1149e5d','claim-FL-DOE-89571-955c36a9','claim-FL-DOE-89571-bf4da03b']::text[], ARRAY[]::text[], '{"word_count":2003,"verifiable_fact_count":0,"stated_position_count":57,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb),
  ('FL-DOE-89630', 'FL-GOV-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-88529', 'FL-GOV-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-88529-0c603efe','claim-FL-DOE-88529-d6e8d2b1','claim-FL-DOE-88529-8b058de3','claim-FL-DOE-88529-145e0735','claim-FL-DOE-88529-cd2b9047','claim-FL-DOE-88529-62178dbd','claim-FL-DOE-88529-3e559507','claim-FL-DOE-88529-92b14ece','claim-FL-DOE-88529-36b82874','claim-FL-DOE-88529-fdd93cf2','claim-FL-DOE-88529-d62e1060','claim-FL-DOE-88529-3830ff3f','claim-FL-DOE-88529-6e76f4cc','claim-FL-DOE-88529-1fbbe33e','claim-FL-DOE-88529-55b499dc']::text[], ARRAY[]::text[], '{"word_count":967,"verifiable_fact_count":0,"stated_position_count":15,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":1}'::jsonb),
  ('FL-DOE-84076', 'FL-GOV-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-84076-d4e144b2','claim-FL-DOE-84076-2f4ab892','claim-FL-DOE-84076-3edbc716','claim-FL-DOE-84076-4c359131','claim-FL-DOE-84076-ef16ca5b','claim-FL-DOE-84076-53d220f9','claim-FL-DOE-84076-c1df32b3','claim-FL-DOE-84076-877d9110','claim-FL-DOE-84076-1a1a752b','claim-FL-DOE-84076-0e311e03','claim-FL-DOE-84076-fe30886a','claim-FL-DOE-84076-dfdcfb20','claim-FL-DOE-84076-73b3fa5f','claim-FL-DOE-84076-936394c4','claim-FL-DOE-84076-7fd2fefe','claim-FL-DOE-84076-fbe0b4d1','claim-FL-DOE-84076-4eb383bf','claim-FL-DOE-84076-5758d421','claim-FL-DOE-84076-08768490','claim-FL-DOE-84076-0e8ed559','claim-FL-DOE-84076-01829096','claim-FL-DOE-84076-a3a8689b','claim-FL-DOE-84076-c51e239f','claim-FL-DOE-84076-5f6c3928','claim-FL-DOE-84076-52b4e977','claim-FL-DOE-84076-784fcb9d','claim-FL-DOE-84076-ad74a8fd','claim-FL-DOE-84076-15004701','claim-FL-DOE-84076-b1a8a2dd','claim-FL-DOE-84076-3e822f65','claim-FL-DOE-84076-30694cc5','claim-FL-DOE-84076-63aa521a','claim-FL-DOE-84076-d804a706','claim-FL-DOE-84076-0a4fbcc2','claim-FL-DOE-84076-465b19b6','claim-FL-DOE-84076-8dad52fb','claim-FL-DOE-84076-f8a3706c','claim-FL-DOE-84076-9828c396','claim-FL-DOE-84076-b1ff19d3','claim-FL-DOE-84076-8d767ddf','claim-FL-DOE-84076-25c186a4','claim-FL-DOE-84076-e1bdd6fe','claim-FL-DOE-84076-504680c0','claim-FL-DOE-84076-720fa410','claim-FL-DOE-84076-f287a9c0','claim-FL-DOE-84076-f48fc9b0','claim-FL-DOE-84076-f2c60e1a','claim-FL-DOE-84076-2537c8e4','claim-FL-DOE-84076-35f65d9b','claim-FL-DOE-84076-a03672cb','claim-FL-DOE-84076-fb601fd7','claim-FL-DOE-84076-ff007456','claim-FL-DOE-84076-ac5d53d5','claim-FL-DOE-84076-579eb87e','claim-FL-DOE-84076-0d4afae2','claim-FL-DOE-84076-66dd8019','claim-FL-DOE-84076-a903d4d9','claim-FL-DOE-84076-562bb330','claim-FL-DOE-84076-0d2ace54','claim-FL-DOE-84076-8f3b4ff5','claim-FL-DOE-84076-d579d7bf','claim-FL-DOE-84076-167e7887','claim-FL-DOE-84076-769930be','claim-FL-DOE-84076-fc45c55f','claim-FL-DOE-84076-a6d6f10a','claim-FL-DOE-84076-3f34a96b','claim-FL-DOE-84076-8ff83d0c','claim-FL-DOE-84076-885e9ac6','claim-FL-DOE-84076-97d4672d','claim-FL-DOE-84076-f54bc41d','claim-FL-DOE-84076-d17310a3','claim-FL-DOE-84076-e6c16911','claim-FL-DOE-84076-06b8ac36','claim-FL-DOE-84076-98fb85d1','claim-FL-DOE-84076-ea79f1af','claim-FL-DOE-84076-c38dbcb5','claim-FL-DOE-84076-5da4d8e9','claim-FL-DOE-84076-8b12ea12','claim-FL-DOE-84076-94221a52','claim-FL-DOE-84076-a960e318','claim-FL-DOE-84076-2d14d208','claim-FL-DOE-84076-a30f835b','claim-FL-DOE-84076-ad5af6f7','claim-FL-DOE-84076-d5e8cc0c','claim-FL-DOE-84076-dc5664fc','claim-FL-DOE-84076-ee6654af','claim-FL-DOE-84076-d97a9bb4','claim-FL-DOE-84076-b508a766','claim-FL-DOE-84076-dd8ad15e','claim-FL-DOE-84076-490fa98f','claim-FL-DOE-84076-8d5994ef']::text[], ARRAY[]::text[], '{"word_count":2403,"verifiable_fact_count":0,"stated_position_count":91,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb)
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
  WHERE r.race_id = 'FL-GOV-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-GOV-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-GOV-general, then
-- set_race_publication once a human has read the brief.
