-- Brief rows for FL-12-general, built by scripts/brief-rows-sql.ts.
-- Generated from 3 policy run(s) for 3 candidate(s). Review before applying.
--
-- 5 source, 16 issue, 24 claim, 24 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":117,"withheld_after_review":1,"no_issue_matched":3}
-- Withheld after review (../withheld-2026-09-30.json): 1
--   FL-DOE-88868 dd27d7b2: Past record: funding already delivered ("$2M to expand mental-health services at Federally Qualified Health Centers."), no commitment. Step 3 check 3, 2026-09-30.
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
DELETE FROM claim    WHERE race_id = 'FL-12-general';
DELETE FROM position WHERE race_id = 'FL-12-general';
DELETE FROM issue    WHERE race_id = 'FL-12-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-5355bfbf', 'https://bilirakisforcongress.com/', 'bilirakisforcongress.com', 'bilirakisforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:41:54Z'),
  ('src-2d39f82f', 'https://bilirakisforcongress.com/issues.html', 'bilirakisforcongress.com/issues.html', 'bilirakisforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:41:54Z'),
  ('src-0c44fdc3', 'https://kimberlyoverman.com/', 'kimberlyoverman.com', 'kimberlyoverman.com', 'candidate_self', 'N/A', '2026-09-29T11:41:54Z'),
  ('src-16f5298c', 'https://kimberlyoverman.com/issues', 'kimberlyoverman.com/issues', 'kimberlyoverman.com', 'candidate_self', 'N/A', '2026-09-29T11:41:54Z'),
  ('src-2583ea38', 'https://brandenscrivenerfl.info/', 'brandenscrivenerfl.info', 'brandenscrivenerfl.info', 'candidate_self', 'N/A', '2026-09-29T11:41:54Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-12-general--issue-B1', 'FL-12-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-12-general--issue-B2', 'FL-12-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-12-general--issue-B3', 'FL-12-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-12-general--issue-B4', 'FL-12-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-12-general--issue-A1--FL-DOE-88868', 'FL-12-general', 'candidate', 'FL-DOE-88868', 'Property insurance costs', NULL, NULL, 100),
  ('FL-12-general--issue-A4--FL-DOE-88868', 'FL-12-general', 'candidate', 'FL-DOE-88868', 'Cost of living in Florida', NULL, NULL, 101),
  ('FL-12-general--issue-A2--FL-DOE-89453', 'FL-12-general', 'candidate', 'FL-DOE-89453', 'Housing affordability', NULL, NULL, 100),
  ('FL-12-general--issue-B5--FL-DOE-89453', 'FL-12-general', 'candidate', 'FL-DOE-89453', 'Abortion policy', NULL, NULL, 101),
  ('FL-12-general--issue-A6--FL-DOE-89453', 'FL-12-general', 'candidate', 'FL-DOE-89453', 'Public school funding and teachers', NULL, NULL, 102),
  ('FL-12-general--issue-KYV10--FL-DOE-89453', 'FL-12-general', 'candidate', 'FL-DOE-89453', 'Career, vocational and higher education', NULL, NULL, 103),
  ('FL-12-general--issue-B7--FL-DOE-89453', 'FL-12-general', 'candidate', 'FL-DOE-89453', 'Crime policy, policing and courts', NULL, NULL, 104),
  ('FL-12-general--issue-B8--FL-DOE-89453', 'FL-12-general', 'candidate', 'FL-DOE-89453', 'Climate and environment (national)', NULL, NULL, 105),
  ('FL-12-general--issue-KYV4--FL-DOE-89453', 'FL-12-general', 'candidate', 'FL-DOE-89453', 'Storm resilience and flood protection', NULL, NULL, 106),
  ('FL-12-general--issue-A6--FL-DOE-89778', 'FL-12-general', 'candidate', 'FL-DOE-89778', 'Public school funding and teachers', NULL, NULL, 100),
  ('FL-12-general--issue-KYV9--FL-DOE-89778', 'FL-12-general', 'candidate', 'FL-DOE-89778', 'School choice and vouchers', NULL, NULL, 101),
  ('FL-12-general--issue-KYV3--FL-DOE-89778', 'FL-12-general', 'candidate', 'FL-DOE-89778', 'Growth, development and land conservation', NULL, NULL, 102)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-88868-2f801b42', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-A1--FL-DOE-88868', 'Taking on skyrocketing homeowners insurance with the Homeowners Premium Tax Reduction Act, up to a $10,000 above-the-line deduction.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88868-4b3b34c7', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-B3', 'Securing the southern border to choke off cartels driving fentanyl into our communities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88868-a847832b', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-A4--FL-DOE-88868', 'Gus delivered the new $6,000 senior tax exemption , championed no tax on tips and no tax on overtime , and continues to push affordability legislation that puts money back in working families'' pockets, including ending taxation on Social Security, lowering prescription drug costs for seniors, and his new homeowners insurance deduction.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-88868-1583a410', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-B2', 'Gus delivered the new $6,000 senior tax exemption , championed no tax on tips and no tax on overtime , and continues to push affordability legislation that puts money back in working families'' pockets, including ending taxation on Social Security, lowering prescription drug costs for seniors, and his new homeowners insurance deduction.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-540524fb', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-A2--FL-DOE-89453', 'Kimberly knows what it’s like to juggle bills and worry about rent. In Congress, she’ll fight for real solutions to rising costs, including affordable housing, infrastructure investment, and fair wages.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-a9e535b1', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B1', 'Kimberly knows what it’s like to juggle bills and worry about rent. In Congress, she’ll fight for real solutions to rising costs, including affordable housing, infrastructure investment, and fair wages.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-3c5f5a3d', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B2', 'Healthcare isn’t a luxury—it’s a right. Kimberly will work to expand access to care, lower prescription costs, and defend reproductive rights and mental health services.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-64d08b16', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B5--FL-DOE-89453', 'Healthcare isn’t a luxury—it’s a right. Kimberly will work to expand access to care, lower prescription costs, and defend reproductive rights and mental health services.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-f00baf6a', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-A6--FL-DOE-89453', 'Every child deserves a strong start. Kimberly will fight for fully funded public schools, better teacher pay, and pathways to college, trade careers, and lifelong learning.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-2d29c97c', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-KYV10--FL-DOE-89453', 'Every child deserves a strong start. Kimberly will fight for fully funded public schools, better teacher pay, and pathways to college, trade careers, and lifelong learning.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-41f2667b', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B7--FL-DOE-89453', 'Safe communities start with smart investments. Kimberly supports balanced public safety policies that combine law enforcement with prevention, youth programs, and mental health care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-b85a0e58', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-A2--FL-DOE-89453', 'As someone who grew up in a working-class household and has helped others manage through financial hardship, Kimberly understands the urgent need for economic stability. In Congress, she’ll fight for increased investment in affordable housing, expanded transportation options, and stronger support for working families and small businesses. She believes housing, transit, and child care are essential infrastructure—and should be treated as such.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-b2aa2262', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B2', 'Kimberly has seen firsthand how medical bills can destabilize families. She will work to lower prescription drug costs, expand coverage—especially mental health care—and protect access to reproductive services. No one should have to choose between seeing a doctor and paying their rent.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-ac741061', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B5--FL-DOE-89453', 'Kimberly has seen firsthand how medical bills can destabilize families. She will work to lower prescription drug costs, expand coverage—especially mental health care—and protect access to reproductive services. No one should have to choose between seeing a doctor and paying their rent.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-54052afb', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B7--FL-DOE-89453', 'Kimberly supports public safety policies that work: strong law enforcement paired with investments in mental health services, youth engagement, and community-led crime prevention. She knows safety comes from both accountability and opportunity.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-b4402448', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-A6--FL-DOE-89453', 'Kimberly believes public education is the foundation of opportunity. She will advocate for stronger investments in schools, competitive teacher pay, and expanded access to early childhood education, vocational training, and higher education that prepares students for good-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-e82feb92', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-KYV10--FL-DOE-89453', 'Kimberly believes public education is the foundation of opportunity. She will advocate for stronger investments in schools, competitive teacher pay, and expanded access to early childhood education, vocational training, and higher education that prepares students for good-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-467efbcb', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B2', 'With over 45,000 veterans and active-duty personnel in the district, Kimberly knows our service members deserve more than just symbolic support. She’ll fight to improve access to VA care, mental health services, job training, and transitional support for returning veterans.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-fea43122', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B5--FL-DOE-89453', 'Kimberly trusts people to make their own healthcare decisions. She will fight to restore and protect the right to abortion and access to reproductive care—because these decisions belong to individuals, not politicians', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-72050d80', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B8--FL-DOE-89453', 'For Florida families, climate change isn’t abstract – it shows up in flooding, rising insurance costs, water quality, and extreme heat. Kimberly understands that climate resilience is affordability: when communities skip investment in drainage, flood mitigation, and clean water infrastructure, families pay through higher premiums and repair bills. In Congress, she’ll fight for resilient infrastructure, protection of the Florida Wildlife Corridor, and environmental justice for the communities hit hardest – because safeguarding our air, water, and coastline lowers long-term costs for working families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89453-692393dc', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-KYV4--FL-DOE-89453', 'For Florida families, climate change isn’t abstract – it shows up in flooding, rising insurance costs, water quality, and extreme heat. Kimberly understands that climate resilience is affordability: when communities skip investment in drainage, flood mitigation, and clean water infrastructure, families pay through higher premiums and repair bills. In Congress, she’ll fight for resilient infrastructure, protection of the Florida Wildlife Corridor, and environmental justice for the communities hit hardest – because safeguarding our air, water, and coastline lowers long-term costs for working families.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89778-22595edf', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-A6--FL-DOE-89778', 'We have shifted our focus to develop Charter and other 3rd party school systems over public education. I believe in parent choice, the problem stems from where that choice funding comes from. Funding for public education should not be diverted to these programs. Teachers need to be supported and valued. Students and staff should feel safe in the public school system. We must take steps to ensure our children are not harmed while attending school.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89778-35a5d459', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-KYV9--FL-DOE-89778', 'We have shifted our focus to develop Charter and other 3rd party school systems over public education. I believe in parent choice, the problem stems from where that choice funding comes from. Funding for public education should not be diverted to these programs. Teachers need to be supported and valued. Students and staff should feel safe in the public school system. We must take steps to ensure our children are not harmed while attending school.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89778-5b07ded9', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-KYV3--FL-DOE-89778', 'Your data should be protected and required to be accessed by the government with the use of a warrant. They should not be able to buy your consumer data on the market to create their own lists and data. Overdevelopment is an issue here in Florida. We must maintain our communities while expanding in ways residents actually want. No AI data centers paid for by Floridians. We need to expand public transportation to reduce traffic and provide an alternative to the expensive auto insurance industry.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-88868-2f801b42', source_id FROM source WHERE url_norm = 'bilirakisforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-88868-4b3b34c7', source_id FROM source WHERE url_norm = 'bilirakisforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-88868-a847832b', source_id FROM source WHERE url_norm = 'bilirakisforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-88868-1583a410', source_id FROM source WHERE url_norm = 'bilirakisforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-89453-540524fb', source_id FROM source WHERE url_norm = 'kimberlyoverman.com'
UNION ALL
  SELECT 'claim-FL-DOE-89453-a9e535b1', source_id FROM source WHERE url_norm = 'kimberlyoverman.com'
UNION ALL
  SELECT 'claim-FL-DOE-89453-3c5f5a3d', source_id FROM source WHERE url_norm = 'kimberlyoverman.com'
UNION ALL
  SELECT 'claim-FL-DOE-89453-64d08b16', source_id FROM source WHERE url_norm = 'kimberlyoverman.com'
UNION ALL
  SELECT 'claim-FL-DOE-89453-f00baf6a', source_id FROM source WHERE url_norm = 'kimberlyoverman.com'
UNION ALL
  SELECT 'claim-FL-DOE-89453-2d29c97c', source_id FROM source WHERE url_norm = 'kimberlyoverman.com'
UNION ALL
  SELECT 'claim-FL-DOE-89453-41f2667b', source_id FROM source WHERE url_norm = 'kimberlyoverman.com'
UNION ALL
  SELECT 'claim-FL-DOE-89453-b85a0e58', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-b2aa2262', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-ac741061', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-54052afb', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-b4402448', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-e82feb92', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-467efbcb', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-fea43122', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-72050d80', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89453-692393dc', source_id FROM source WHERE url_norm = 'kimberlyoverman.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-89778-22595edf', source_id FROM source WHERE url_norm = 'brandenscrivenerfl.info'
UNION ALL
  SELECT 'claim-FL-DOE-89778-35a5d459', source_id FROM source WHERE url_norm = 'brandenscrivenerfl.info'
UNION ALL
  SELECT 'claim-FL-DOE-89778-5b07ded9', source_id FROM source WHERE url_norm = 'brandenscrivenerfl.info'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-88868-0bdd3c5c', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88868-0edd4115', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-B2', '', ARRAY['claim-FL-DOE-88868-1583a410']::text[], true, 'stated'),
  ('pos-FL-DOE-88868-0ddd3f82', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-B3', '', ARRAY['claim-FL-DOE-88868-4b3b34c7']::text[], true, 'stated'),
  ('pos-FL-DOE-88868-08dd37a3', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-88868-9bd5d047', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-A1--FL-DOE-88868', '', ARRAY['claim-FL-DOE-88868-2f801b42']::text[], true, 'stated'),
  ('pos-FL-DOE-88868-96d5c868', 'FL-DOE-88868', 'FL-12-general', 'FL-12-general--issue-A4--FL-DOE-88868', '', ARRAY['claim-FL-DOE-88868-a847832b']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-0bdd3c5c', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B1', '', ARRAY['claim-FL-DOE-89453-a9e535b1']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-0edd4115', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B2', '', ARRAY['claim-FL-DOE-89453-3c5f5a3d','claim-FL-DOE-89453-b2aa2262','claim-FL-DOE-89453-467efbcb']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-0ddd3f82', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89453-08dd37a3', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89453-9cd5d1da', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-A2--FL-DOE-89453', '', ARRAY['claim-FL-DOE-89453-540524fb','claim-FL-DOE-89453-b85a0e58']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-07dd3610', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B5--FL-DOE-89453', '', ARRAY['claim-FL-DOE-89453-64d08b16','claim-FL-DOE-89453-ac741061','claim-FL-DOE-89453-fea43122']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-98d5cb8e', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-A6--FL-DOE-89453', '', ARRAY['claim-FL-DOE-89453-f00baf6a','claim-FL-DOE-89453-b4402448']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-6c14946c', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-KYV10--FL-DOE-89453', '', ARRAY['claim-FL-DOE-89453-2d29c97c','claim-FL-DOE-89453-e82feb92']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-09dd3936', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B7--FL-DOE-89453', '', ARRAY['claim-FL-DOE-89453-41f2667b','claim-FL-DOE-89453-54052afb']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-14dd4a87', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-B8--FL-DOE-89453', '', ARRAY['claim-FL-DOE-89453-72050d80']::text[], true, 'stated'),
  ('pos-FL-DOE-89453-b2b2889b', 'FL-DOE-89453', 'FL-12-general', 'FL-12-general--issue-KYV4--FL-DOE-89453', '', ARRAY['claim-FL-DOE-89453-692393dc']::text[], true, 'stated'),
  ('pos-FL-DOE-89778-0bdd3c5c', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89778-0edd4115', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89778-0ddd3f82', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89778-08dd37a3', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89778-98d5cb8e', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-A6--FL-DOE-89778', '', ARRAY['claim-FL-DOE-89778-22595edf']::text[], true, 'stated'),
  ('pos-FL-DOE-89778-adb280bc', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-KYV9--FL-DOE-89778', '', ARRAY['claim-FL-DOE-89778-35a5d459']::text[], true, 'stated'),
  ('pos-FL-DOE-89778-b7b2907a', 'FL-DOE-89778', 'FL-12-general', 'FL-12-general--issue-KYV3--FL-DOE-89778', '', ARRAY['claim-FL-DOE-89778-5b07ded9']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-88868', 'FL-12-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-88868-2f801b42','claim-FL-DOE-88868-4b3b34c7','claim-FL-DOE-88868-a847832b','claim-FL-DOE-88868-1583a410']::text[], ARRAY[]::text[], '{"word_count":135,"verifiable_fact_count":0,"stated_position_count":4,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-DOE-89453', 'FL-12-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89453-540524fb','claim-FL-DOE-89453-a9e535b1','claim-FL-DOE-89453-3c5f5a3d','claim-FL-DOE-89453-64d08b16','claim-FL-DOE-89453-f00baf6a','claim-FL-DOE-89453-2d29c97c','claim-FL-DOE-89453-41f2667b','claim-FL-DOE-89453-b85a0e58','claim-FL-DOE-89453-b2aa2262','claim-FL-DOE-89453-ac741061','claim-FL-DOE-89453-54052afb','claim-FL-DOE-89453-b4402448','claim-FL-DOE-89453-e82feb92','claim-FL-DOE-89453-467efbcb','claim-FL-DOE-89453-fea43122','claim-FL-DOE-89453-72050d80','claim-FL-DOE-89453-692393dc']::text[], ARRAY[]::text[], '{"word_count":678,"verifiable_fact_count":0,"stated_position_count":17,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-DOE-89778', 'FL-12-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89778-22595edf','claim-FL-DOE-89778-35a5d459','claim-FL-DOE-89778-5b07ded9']::text[], ARRAY[]::text[], '{"word_count":235,"verifiable_fact_count":0,"stated_position_count":3,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-12-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-12-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-12-general, then
-- set_race_publication once a human has read the brief.
