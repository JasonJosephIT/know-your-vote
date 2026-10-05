-- Brief rows for FL-7-general, built by scripts/brief-rows-sql.ts.
-- Generated from 3 policy run(s) for 3 candidate(s). Review before applying.
--
-- 5 source, 16 issue, 25 claim, 24 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":94,"no_issue_matched":13}
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
DELETE FROM claim    WHERE race_id = 'FL-7-general';
DELETE FROM position WHERE race_id = 'FL-7-general';
DELETE FROM issue    WHERE race_id = 'FL-7-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-bfe3487b', 'https://baledalton.com/priorities', 'baledalton.com/priorities', 'baledalton.com', 'candidate_self', 'N/A', '2026-09-29T11:43:27Z'),
  ('src-98ba144c', 'https://elijahforcongress.com/', 'elijahforcongress.com', 'elijahforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:27Z'),
  ('src-7cc24c3c', 'https://elijahforcongress.com/issues.html', 'elijahforcongress.com/issues.html', 'elijahforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:27Z'),
  ('src-fca91684', 'https://dennison4congress.com/', 'dennison4congress.com', 'dennison4congress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:27Z'),
  ('src-80a50b7e', 'https://dennison4congress.com/issues-2', 'dennison4congress.com/issues-2', 'dennison4congress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:27Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-7-general--issue-B1', 'FL-7-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-7-general--issue-B2', 'FL-7-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-7-general--issue-B3', 'FL-7-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-7-general--issue-B4', 'FL-7-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-7-general--issue-A4--FL-DOE-90631', 'FL-7-general', 'candidate', 'FL-DOE-90631', 'Cost of living in Florida', NULL, NULL, 100),
  ('FL-7-general--issue-A1--FL-DOE-90631', 'FL-7-general', 'candidate', 'FL-DOE-90631', 'Property insurance costs', NULL, NULL, 101),
  ('FL-7-general--issue-KYV2--FL-DOE-90631', 'FL-7-general', 'candidate', 'FL-DOE-90631', 'Energy and utilities', NULL, NULL, 102),
  ('FL-7-general--issue-B5--FL-DOE-90631', 'FL-7-general', 'candidate', 'FL-DOE-90631', 'Abortion policy', NULL, NULL, 103),
  ('FL-7-general--issue-B8--FL-DOE-90631', 'FL-7-general', 'candidate', 'FL-DOE-90631', 'Climate and environment (national)', NULL, NULL, 104),
  ('FL-7-general--issue-B7--FL-DOE-90631', 'FL-7-general', 'candidate', 'FL-DOE-90631', 'Crime policy, policing and courts', NULL, NULL, 105),
  ('FL-7-general--issue-KYV9--FL-DOE-90696', 'FL-7-general', 'candidate', 'FL-DOE-90696', 'School choice and vouchers', NULL, NULL, 100),
  ('FL-7-general--issue-KYV4--FL-DOE-90696', 'FL-7-general', 'candidate', 'FL-DOE-90696', 'Storm resilience and flood protection', NULL, NULL, 101),
  ('FL-7-general--issue-B7--FL-DOE-90696', 'FL-7-general', 'candidate', 'FL-DOE-90696', 'Crime policy, policing and courts', NULL, NULL, 102),
  ('FL-7-general--issue-A7--FL-DOE-90696', 'FL-7-general', 'candidate', 'FL-DOE-90696', 'Elections administration and voting access', NULL, NULL, 103),
  ('FL-7-general--issue-B7--FL-DOE-92377', 'FL-7-general', 'candidate', 'FL-DOE-92377', 'Crime policy, policing and courts', NULL, NULL, 100),
  ('FL-7-general--issue-B5--FL-DOE-92377', 'FL-7-general', 'candidate', 'FL-DOE-92377', 'Abortion policy', NULL, NULL, 101)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-90631-f72e678d', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-A4--FL-DOE-90631', 'My first priority in Congress will be working to make Florida affordable again. We need to stop the bleeding, by reversing health care premium hikes and illegal, unpredictable tariffs. But more than that, we need representatives who will fight for working families – not for another tax giveaway for corporations and billionaires.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-97e87ba1', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B1', 'My first priority in Congress will be working to make Florida affordable again. We need to stop the bleeding, by reversing health care premium hikes and illegal, unpredictable tariffs. But more than that, we need representatives who will fight for working families – not for another tax giveaway for corporations and billionaires.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-72f5edc2', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B2', 'My first priority in Congress will be working to make Florida affordable again. We need to stop the bleeding, by reversing health care premium hikes and illegal, unpredictable tariffs. But more than that, we need representatives who will fight for working families – not for another tax giveaway for corporations and billionaires.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-7f36f35d', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-A1--FL-DOE-90631', 'We need to crack down on the power companies and property insurers that are ripping Floridians off and raising rates year after year, without any improvement in service. Tallahassee has let these companies run state-sanctioned monopolies for too long. In Congress, I will be laser-focused on fostering competition, not consolidation, and fighting for a better deal for Florida families. With prices rising, wages also need to keep up – which is why I support raising the federal minimum wage and passing the PRO Act, so labor unions can advocate for workers in a changing economy.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-98dfe0e4', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-A4--FL-DOE-90631', 'We need to crack down on the power companies and property insurers that are ripping Floridians off and raising rates year after year, without any improvement in service. Tallahassee has let these companies run state-sanctioned monopolies for too long. In Congress, I will be laser-focused on fostering competition, not consolidation, and fighting for a better deal for Florida families. With prices rising, wages also need to keep up – which is why I support raising the federal minimum wage and passing the PRO Act, so labor unions can advocate for workers in a changing economy.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-ab772bb0', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B1', 'We need to crack down on the power companies and property insurers that are ripping Floridians off and raising rates year after year, without any improvement in service. Tallahassee has let these companies run state-sanctioned monopolies for too long. In Congress, I will be laser-focused on fostering competition, not consolidation, and fighting for a better deal for Florida families. With prices rising, wages also need to keep up – which is why I support raising the federal minimum wage and passing the PRO Act, so labor unions can advocate for workers in a changing economy.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-97857aff', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-KYV2--FL-DOE-90631', 'We need to crack down on the power companies and property insurers that are ripping Floridians off and raising rates year after year, without any improvement in service. Tallahassee has let these companies run state-sanctioned monopolies for too long. In Congress, I will be laser-focused on fostering competition, not consolidation, and fighting for a better deal for Florida families. With prices rising, wages also need to keep up – which is why I support raising the federal minimum wage and passing the PRO Act, so labor unions can advocate for workers in a changing economy.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-78bf2fcf', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B2', 'We need to elect members of Congress who will restore funding to Medicaid, reverse premium cuts, and protect Social Security and Medicare for generations to come. We also must lower costs throughout our health care system, which is why I support negotiating drug prices in the United States – like every other wealthy country does – to keep Americans from being ripped off. We need to build on the Affordable Care Act to lower premiums, deductibles, and surprise medical bills that keep hardworking families from seeking care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-bef6a31d', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B4', 'We need to elect members of Congress who will restore funding to Medicaid, reverse premium cuts, and protect Social Security and Medicare for generations to come. We also must lower costs throughout our health care system, which is why I support negotiating drug prices in the United States – like every other wealthy country does – to keep Americans from being ripped off. We need to build on the Affordable Care Act to lower premiums, deductibles, and surprise medical bills that keep hardworking families from seeking care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-213acb45', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B5--FL-DOE-90631', 'And here in Florida, women and girls face yet another health crisis. The state’s dangerous, six-week abortion ban puts politicians between women and their doctors, making women everywhere less safe and less free. That’s why I support codifying Roe into federal law, to put these decisions back where they belong – with patients.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-37501a8b', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B8--FL-DOE-90631', 'Preserving environmental resources and preventing drilling off the coasts of Florida means protecting the Eglin Gulf Test and Training Range, as well as the Eastern Range, so that our military and our space program can continue to operate in order to keep our nation safe and secure. Endorsing an all-of-the-above energy policy means strengthening our nation’s energy independence and reducing our need for foreign oil and Chinese solar while also lowering costs for American consumers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-236b20a5', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-KYV2--FL-DOE-90631', 'Preserving environmental resources and preventing drilling off the coasts of Florida means protecting the Eglin Gulf Test and Training Range, as well as the Eastern Range, so that our military and our space program can continue to operate in order to keep our nation safe and secure. Endorsing an all-of-the-above energy policy means strengthening our nation’s energy independence and reducing our need for foreign oil and Chinese solar while also lowering costs for American consumers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90631-8902d2d0', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B7--FL-DOE-90631', 'Public safety, whether from gun violence or any other type of violent crime, is our government’s number one priority. Without safe communities and safe schools, we cannot have prosperous families and prosperous businesses. We must ensure that our police departments are fully funded and have the resources they need to do their job well.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-d248d6a2', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-KYV9--FL-DOE-90696', 'Ryan champions parental rights and school choice, empowering families to make the best decisions for their kids and have transparency on curriculum.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-f2f93bfc', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B1', 'By unleashing the world’s best economy through lower taxes, less regulation, and smart growth, we will make America more affordable and prosperous for millions of Americans.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-296dd4a3', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B2', 'Ryan supports solutions that deliver affordable, patient-centered healthcare options. He also believes healthcare costs can be reduced by providing individuals with tax benefits, such as expanded Health Savings Accounts.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-35d62745', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B2', 'Additionally, Ryan supports greater transparency in the system, including requirements for clear pricing from hospitals, insurers, and other providers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-3ad6ff6f', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-KYV4--FL-DOE-90696', 'Ryan will prioritize working with federal agencies to secure long-term beach nourishment and storm-damage reduction projects.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-42e114da', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-KYV9--FL-DOE-90696', 'That’s why he champions parental rights and school choice, empowering families to make the best decisions for their kids and have transparency on curriculum.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-de94c48a', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B7--FL-DOE-90696', 'Ryan is a strong defender of law enforcement and deeply understands the daily challenges officers face. He will strongly support legislation that protects law enforcement, including tougher penalties for assaulting or shooting officers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-152e1b45', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B3', 'We must continue to secure our borders and oppose any measures that weaken enforcement or prioritize non-citizens over American safety.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90696-73684b30', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-A7--FL-DOE-90696', 'He strongly supports the Save America Act, which ensures only American citizens can vote in our elections — because citizenship must matter.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92377-7714a85b', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B7--FL-DOE-92377', 'Flock and Axon have turned our streets into a permanent lineup. Every plate, every face, every trip you take, logged and stored without a warrant and without your consent. I will get these systems out of public spaces and keep the Fourth Amendment from becoming a technicality.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92377-760e8942', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B2', 'Let Veterans Choose Their Own Care. My benefits should not be trapped inside one government hospital system. Veterans earned that care and should be able to take it to whatever doctor they trust, close to home, without waiting on a bureaucracy to approve it. Put the benefit in the veteran''s hands.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-92377-25fab632', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B5--FL-DOE-92377', 'The federal government has no authority here. This belongs to the states, and I will not vote to hand Washington power over it in either direction. That is where the Constitution leaves it and that is where I will leave it.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-90631-f72e678d', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-97e87ba1', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-72f5edc2', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-7f36f35d', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-98dfe0e4', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-ab772bb0', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-97857aff', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-78bf2fcf', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-bef6a31d', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-213acb45', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-37501a8b', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-236b20a5', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90631-8902d2d0', source_id FROM source WHERE url_norm = 'baledalton.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90696-d248d6a2', source_id FROM source WHERE url_norm = 'elijahforcongress.com'
UNION ALL
  SELECT 'claim-FL-DOE-90696-f2f93bfc', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-90696-296dd4a3', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-90696-35d62745', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-90696-3ad6ff6f', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-90696-42e114da', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-90696-de94c48a', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-90696-152e1b45', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-90696-73684b30', source_id FROM source WHERE url_norm = 'elijahforcongress.com/issues.html'
UNION ALL
  SELECT 'claim-FL-DOE-92377-7714a85b', source_id FROM source WHERE url_norm = 'dennison4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-92377-760e8942', source_id FROM source WHERE url_norm = 'dennison4congress.com'
UNION ALL
  SELECT 'claim-FL-DOE-92377-25fab632', source_id FROM source WHERE url_norm = 'dennison4congress.com/issues-2'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-90631-0bdd3c5c', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B1', '', ARRAY['claim-FL-DOE-90631-97e87ba1','claim-FL-DOE-90631-ab772bb0']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-0edd4115', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B2', '', ARRAY['claim-FL-DOE-90631-72f5edc2','claim-FL-DOE-90631-78bf2fcf']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-0ddd3f82', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90631-08dd37a3', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B4', '', ARRAY['claim-FL-DOE-90631-bef6a31d']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-96d5c868', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-A4--FL-DOE-90631', '', ARRAY['claim-FL-DOE-90631-f72e678d','claim-FL-DOE-90631-98dfe0e4']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-9bd5d047', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-A1--FL-DOE-90631', '', ARRAY['claim-FL-DOE-90631-7f36f35d']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-b8b2920d', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-KYV2--FL-DOE-90631', '', ARRAY['claim-FL-DOE-90631-97857aff','claim-FL-DOE-90631-236b20a5']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-07dd3610', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B5--FL-DOE-90631', '', ARRAY['claim-FL-DOE-90631-213acb45']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-14dd4a87', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B8--FL-DOE-90631', '', ARRAY['claim-FL-DOE-90631-37501a8b']::text[], true, 'stated'),
  ('pos-FL-DOE-90631-09dd3936', 'FL-DOE-90631', 'FL-7-general', 'FL-7-general--issue-B7--FL-DOE-90631', '', ARRAY['claim-FL-DOE-90631-8902d2d0']::text[], true, 'stated'),
  ('pos-FL-DOE-90696-0bdd3c5c', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B1', '', ARRAY['claim-FL-DOE-90696-f2f93bfc']::text[], true, 'stated'),
  ('pos-FL-DOE-90696-0edd4115', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B2', '', ARRAY['claim-FL-DOE-90696-296dd4a3','claim-FL-DOE-90696-35d62745']::text[], true, 'stated'),
  ('pos-FL-DOE-90696-0ddd3f82', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B3', '', ARRAY['claim-FL-DOE-90696-152e1b45']::text[], true, 'stated'),
  ('pos-FL-DOE-90696-08dd37a3', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90696-adb280bc', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-KYV9--FL-DOE-90696', '', ARRAY['claim-FL-DOE-90696-d248d6a2','claim-FL-DOE-90696-42e114da']::text[], true, 'stated'),
  ('pos-FL-DOE-90696-b2b2889b', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-KYV4--FL-DOE-90696', '', ARRAY['claim-FL-DOE-90696-3ad6ff6f']::text[], true, 'stated'),
  ('pos-FL-DOE-90696-09dd3936', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-B7--FL-DOE-90696', '', ARRAY['claim-FL-DOE-90696-de94c48a']::text[], true, 'stated'),
  ('pos-FL-DOE-90696-99d5cd21', 'FL-DOE-90696', 'FL-7-general', 'FL-7-general--issue-A7--FL-DOE-90696', '', ARRAY['claim-FL-DOE-90696-73684b30']::text[], true, 'stated'),
  ('pos-FL-DOE-92377-0bdd3c5c', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92377-0edd4115', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B2', '', ARRAY['claim-FL-DOE-92377-760e8942']::text[], true, 'stated'),
  ('pos-FL-DOE-92377-0ddd3f82', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92377-08dd37a3', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92377-09dd3936', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B7--FL-DOE-92377', '', ARRAY['claim-FL-DOE-92377-7714a85b']::text[], true, 'stated'),
  ('pos-FL-DOE-92377-07dd3610', 'FL-DOE-92377', 'FL-7-general', 'FL-7-general--issue-B5--FL-DOE-92377', '', ARRAY['claim-FL-DOE-92377-25fab632']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-90631', 'FL-7-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90631-f72e678d','claim-FL-DOE-90631-97e87ba1','claim-FL-DOE-90631-72f5edc2','claim-FL-DOE-90631-7f36f35d','claim-FL-DOE-90631-98dfe0e4','claim-FL-DOE-90631-ab772bb0','claim-FL-DOE-90631-97857aff','claim-FL-DOE-90631-78bf2fcf','claim-FL-DOE-90631-bef6a31d','claim-FL-DOE-90631-213acb45','claim-FL-DOE-90631-37501a8b','claim-FL-DOE-90631-236b20a5','claim-FL-DOE-90631-8902d2d0']::text[], ARRAY[]::text[], '{"word_count":967,"verifiable_fact_count":0,"stated_position_count":13,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-90696', 'FL-7-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90696-d248d6a2','claim-FL-DOE-90696-f2f93bfc','claim-FL-DOE-90696-296dd4a3','claim-FL-DOE-90696-35d62745','claim-FL-DOE-90696-3ad6ff6f','claim-FL-DOE-90696-42e114da','claim-FL-DOE-90696-de94c48a','claim-FL-DOE-90696-152e1b45','claim-FL-DOE-90696-73684b30']::text[], ARRAY[]::text[], '{"word_count":211,"verifiable_fact_count":0,"stated_position_count":9,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb),
  ('FL-DOE-92377', 'FL-7-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-92377-7714a85b','claim-FL-DOE-92377-760e8942','claim-FL-DOE-92377-25fab632']::text[], ARRAY[]::text[], '{"word_count":139,"verifiable_fact_count":0,"stated_position_count":3,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":1}'::jsonb)
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
  WHERE r.race_id = 'FL-7-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-7-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-7-general, then
-- set_race_publication once a human has read the brief.
