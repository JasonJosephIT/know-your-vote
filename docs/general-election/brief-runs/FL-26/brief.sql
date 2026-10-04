-- Brief rows for FL-26-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 3 candidate(s). Review before applying.
--
-- 6 source, 11 issue, 24 claim, 19 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":130,"no_issue_matched":9,"withheld_after_review":2,"no_run":1}
-- FL-DOE-92137: no run, silent on every spine issue: no official_site (spine-roster-2026-10-03.json); founder decision D3: record silence
-- Withheld after review (../withheld-2026-09-30.json): 2
--   FL-DOE-90330 8242653c: Past record: FY26 Homeland Security funding he led as appropriations chair, no commitment. Step 3 check 3, 2026-09-30.
--   FL-DOE-90330 05fe83f1: Past record: FY25-to-FY26 spending cuts as chairman, no commitment. Step 3 check 3, 2026-09-30.
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
DELETE FROM claim    WHERE race_id = 'FL-26-general';
DELETE FROM position WHERE race_id = 'FL-26-general';
DELETE FROM issue    WHERE race_id = 'FL-26-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-2741feeb', 'https://locklinforcongress.com/issues-affordability', 'locklinforcongress.com/issues-affordability', 'locklinforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:05Z'),
  ('src-ca33ab8a', 'https://locklinforcongress.com/issues-healthcare', 'locklinforcongress.com/issues-healthcare', 'locklinforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:05Z'),
  ('src-89a347df', 'https://locklinforcongress.com/issues-social-security', 'locklinforcongress.com/issues-social-security', 'locklinforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:05Z'),
  ('src-b78de258', 'https://locklinforcongress.com/issues-cuba', 'locklinforcongress.com/issues-cuba', 'locklinforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:05Z'),
  ('src-7a243c37', 'https://locklinforcongress.com/corruption', 'locklinforcongress.com/corruption', 'locklinforcongress.com', 'candidate_self', 'N/A', '2026-09-29T11:43:05Z'),
  ('src-44c9ee5f', 'https://mariodiazbalart.org/', 'mariodiazbalart.org', 'mariodiazbalart.org', 'candidate_self', 'N/A', '2026-09-29T11:43:05Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-26-general--issue-B1', 'FL-26-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-26-general--issue-B2', 'FL-26-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-26-general--issue-B3', 'FL-26-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-26-general--issue-B4', 'FL-26-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-26-general--issue-A2--FL-DOE-89980', 'FL-26-general', 'candidate', 'FL-DOE-89980', 'Housing affordability', NULL, NULL, 100),
  ('FL-26-general--issue-KYV2--FL-DOE-89980', 'FL-26-general', 'candidate', 'FL-DOE-89980', 'Energy and utilities', NULL, NULL, 101),
  ('FL-26-general--issue-KYV1--FL-DOE-89980', 'FL-26-general', 'candidate', 'FL-DOE-89980', 'Threats to democratic institutions', NULL, NULL, 102),
  ('FL-26-general--issue-A6--FL-DOE-89980', 'FL-26-general', 'candidate', 'FL-DOE-89980', 'Public school funding and teachers', NULL, NULL, 103),
  ('FL-26-general--issue-B7--FL-DOE-89980', 'FL-26-general', 'candidate', 'FL-DOE-89980', 'Crime policy, policing and courts', NULL, NULL, 104),
  ('FL-26-general--issue-A4--FL-DOE-90330', 'FL-26-general', 'candidate', 'FL-DOE-90330', 'Cost of living in Florida', NULL, NULL, 100),
  ('FL-26-general--issue-B7--FL-DOE-90330', 'FL-26-general', 'candidate', 'FL-DOE-90330', 'Crime policy, policing and courts', NULL, NULL, 101)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-89980-69bb0f35', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-A2--FL-DOE-89980', 'We need to stop adding costs to the economy. There a many ways for us to turn this around, but it all starts with HITTING THE BRAKES. After we remove Trump''s puppet, Mario Díaz-Balart, we can start doing the obvious things: 1. End wars that disrupt energy markets. 2. Reduce unnecessary tariffs. 3. Bring deficits and debt under control without cutting healthcare and basic services. 4. Build more housing. 5. Invest in sustainable energy. 6. Spend our tax dollars right here in the USA. Instead, our representative, Mario Díaz-Balart makes the wrong choice, every. single. time. We should also recognize that legal immigration as an economic strength.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-14706d23', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B1', 'We need to stop adding costs to the economy. There a many ways for us to turn this around, but it all starts with HITTING THE BRAKES. After we remove Trump''s puppet, Mario Díaz-Balart, we can start doing the obvious things: 1. End wars that disrupt energy markets. 2. Reduce unnecessary tariffs. 3. Bring deficits and debt under control without cutting healthcare and basic services. 4. Build more housing. 5. Invest in sustainable energy. 6. Spend our tax dollars right here in the USA. Instead, our representative, Mario Díaz-Balart makes the wrong choice, every. single. time. We should also recognize that legal immigration as an economic strength.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-e19f556d', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B3', 'We need to stop adding costs to the economy. There a many ways for us to turn this around, but it all starts with HITTING THE BRAKES. After we remove Trump''s puppet, Mario Díaz-Balart, we can start doing the obvious things: 1. End wars that disrupt energy markets. 2. Reduce unnecessary tariffs. 3. Bring deficits and debt under control without cutting healthcare and basic services. 4. Build more housing. 5. Invest in sustainable energy. 6. Spend our tax dollars right here in the USA. Instead, our representative, Mario Díaz-Balart makes the wrong choice, every. single. time. We should also recognize that legal immigration as an economic strength.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-8ed957e8', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-KYV2--FL-DOE-89980', 'We need to stop adding costs to the economy. There a many ways for us to turn this around, but it all starts with HITTING THE BRAKES. After we remove Trump''s puppet, Mario Díaz-Balart, we can start doing the obvious things: 1. End wars that disrupt energy markets. 2. Reduce unnecessary tariffs. 3. Bring deficits and debt under control without cutting healthcare and basic services. 4. Build more housing. 5. Invest in sustainable energy. 6. Spend our tax dollars right here in the USA. Instead, our representative, Mario Díaz-Balart makes the wrong choice, every. single. time. We should also recognize that legal immigration as an economic strength.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-29c02b94', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B1', 'Immigrants expand our workforce, start businesses, fill critical jobs, pay taxes, and create demand throughout the economy. Cutting immigration while our population ages makes it harder for the economy to grow and can make worker shortages, and contributes to rising prices. Instead of asking working families to carry the cost of our debt, require billionaires and large corporations to contribute more. The answer to an affordability crisis is lowering unnecessary costs while building a larger, stronger, more productive economy. When we remove Mario Díaz-Balart on November 3rd, I will get to work fixing his mess.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-f56144ae', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B3', 'Immigrants expand our workforce, start businesses, fill critical jobs, pay taxes, and create demand throughout the economy. Cutting immigration while our population ages makes it harder for the economy to grow and can make worker shortages, and contributes to rising prices. Instead of asking working families to carry the cost of our debt, require billionaires and large corporations to contribute more. The answer to an affordability crisis is lowering unnecessary costs while building a larger, stronger, more productive economy. When we remove Mario Díaz-Balart on November 3rd, I will get to work fixing his mess.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-13893910', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B2', 'Nicole supports the fastest responsible path to guaranteed care for every American: Medicare for All, a strong public option, Medicare buy-in, or any model that gets us to universal coverage.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-20feb24d', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B2', 'Nicole will fight for universal healthcare. Díaz-Balart has fought against the protections people already have.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-dc4f1644', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B4', 'Social Security is not a handout. It is money Americans earned and paid into throughout their working lives. My first promise is that I will never vote to cut Social Security benefits, raise the retirement age, privatize the program, or reduce cost-of-living adjustments. Protecting Social Security also means making sure it will be there for future generations. Congress has waited too long to act. I support asking wealthy Americans to pay Social Security taxes on more of their income, just as working families already do. That would strengthen the program without cutting earned benefits.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-ccbaa182', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B4', 'I will also fight for a cost-of-living adjustment that reflects what seniors actually pay for, especially housing, health care, prescriptions, food, insurance, and utilities. In Congress, I will work to: • Protect every dollar of earned benefits • Oppose raising the retirement age • Oppose privatization • Require high-income Americans to contribute on more of their earnings • Improve benefits for low-income seniors and widows • Adopt a more accurate cost-of-living formula for seniors • Protect Social Security data and personal information • Fund Social Security offices so people can receive timely, in-person help', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-87ca6591', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B4', 'During my first year in Congress, I will: 1. Cosponsor the Credit for Caring Act 2. Support Social Security legislation that protects benefits and requires high-income Americans to contribute more 3. Oppose any increase in the retirement age 4. Fight for adequate staffing and service at the Social Security Administration 5. Support Social Security caregiving credits 6. Protect Medicaid and home-based care from cuts 7. Establish bilingual senior and caregiver constituent services throughout FL-26 8. Hold regular roundtables with seniors and caregivers to track whether federal programs are actually working. I will not make promises that one member of Congress cannot deliver alone.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-005b2925', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B4', 'I will make clear commitments about the bills I will support, the cuts I will oppose, and the work I will do to build bipartisan support. Seniors deserve security, caregivers deserve support, and every American deserves to know that Social Security will be there when they need it.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-94891091', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-KYV2--FL-DOE-89980', 'policies that worsen human suffering without achieving change must be re-evaluated A smarter, more effective, and somewhat obvious approach would be target the regime, not the people! Focus sanctions on officials responsible for corruption and human rights abuses, instead of broad restrictions that impact an entire population. Apply pressure where it matters, but allow greater access to food, medicine, humanitarian aid, and civilian infrastructure, especially energy. If elected, I will target sanctions on corrupt officials, not blanket hardship. I will work with international partners to stabilize access to fuel and essential services so families are not left in the dark (literally) .', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-74aaad88', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-KYV1--FL-DOE-89980', 'If elected, Nicole Locklin will work to: - Establish enforceable standards for knowingly false statements made by elected officials in an official capacity - Apply accountability to formal public communications, reports, and certifications - Clearly distinguish intentional deception from opinion or political disagreement - Create real consequences, including ethics sanctions and public accountability - Protect whistleblowers who expose intentional dishonesty in government This is not about policing speech. It’s about stopping deliberate lies by people in power. Public office is a public trust — and lying to the public should never be part of the job.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-8f5bb2a1', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-A6--FL-DOE-89980', 'Congress decides where your tax dollars go. Right now, Washington spends billions on enforcement and bureaucracy, while teachers are underpaid, classrooms are overcrowded, and families are told there’s “no money” for the basics. That’s not a budget problem. That’s a priorities problem. If elected, Nicole will: - Push to redirect federal spending toward public education , including better pay for teachers - Invest in job creation and workforce development , not bloated enforcement budgets - Demand transparency and accountability for how federal agencies spend taxpayer money This isn’t about politics or slogans. It’s about using public money to make life better for the public.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-115e4b43', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B1', 'Congress decides where your tax dollars go. Right now, Washington spends billions on enforcement and bureaucracy, while teachers are underpaid, classrooms are overcrowded, and families are told there’s “no money” for the basics. That’s not a budget problem. That’s a priorities problem. If elected, Nicole will: - Push to redirect federal spending toward public education , including better pay for teachers - Invest in job creation and workforce development , not bloated enforcement budgets - Demand transparency and accountability for how federal agencies spend taxpayer money This isn’t about politics or slogans. It’s about using public money to make life better for the public.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89980-13b3cd82', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B7--FL-DOE-89980', 'That is not optional in America . Nicole Locklin believes: - Enforcement must be targeted toward genuine public safety - Due process must be protected, never bypassed - Conditions of detention must meet constitutional standards - Congress has a duty to exercise strict oversight of federal agencies - Taxpayer dollars should never fund unconstitutional conduct Nicole Locklin took an oath to uphold the Constitution. The rulebook is what makes us Americans, not where we came from .', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90330-5f9715ce', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-A4--FL-DOE-90330', 'No tax on tips or overtime, permanent tax cuts for working families, and relief for seniors — sparing FL-26 taxpayers an average 24% tax increase.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90330-ae430d30', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-A4--FL-DOE-90330', 'Sin impuestos sobre propinas ni horas extra, recortes permanentes para familias trabajadoras y alivio para adultos mayores — evitando un aumento fiscal promedio del 24% en FL-26.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90330-78c6ccc3', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B3', 'Detaining and removing criminal aliens, cracking down on fentanyl trafficking, and backing the men and women who enforce our laws.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90330-0c64d1b7', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B7--FL-DOE-90330', 'Detaining and removing criminal aliens, cracking down on fentanyl trafficking, and backing the men and women who enforce our laws.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90330-b619a4f9', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B3', 'Deteniendo y expulsando a criminales, combatiendo el tráfico de fentanilo y apoyando a quienes hacen cumplir nuestras leyes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90330-9881b425', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B7--FL-DOE-90330', 'Deteniendo y expulsando a criminales, combatiendo el tráfico de fentanilo y apoyando a quienes hacen cumplir nuestras leyes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90330-962d298f', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B1', 'Backing the 21,000+ manufacturing jobs and $1.9B in annual wages that power FL-26 — with expanded tax relief and renewed Opportunity Zones.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-89980-69bb0f35', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89980-14706d23', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89980-e19f556d', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89980-8ed957e8', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89980-29c02b94', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89980-f56144ae', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-affordability'
UNION ALL
  SELECT 'claim-FL-DOE-89980-13893910', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-89980-20feb24d', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-healthcare'
UNION ALL
  SELECT 'claim-FL-DOE-89980-dc4f1644', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-social-security'
UNION ALL
  SELECT 'claim-FL-DOE-89980-ccbaa182', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-social-security'
UNION ALL
  SELECT 'claim-FL-DOE-89980-87ca6591', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-social-security'
UNION ALL
  SELECT 'claim-FL-DOE-89980-005b2925', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-social-security'
UNION ALL
  SELECT 'claim-FL-DOE-89980-94891091', source_id FROM source WHERE url_norm = 'locklinforcongress.com/issues-cuba'
UNION ALL
  SELECT 'claim-FL-DOE-89980-74aaad88', source_id FROM source WHERE url_norm = 'locklinforcongress.com/corruption'
UNION ALL
  SELECT 'claim-FL-DOE-89980-8f5bb2a1', source_id FROM source WHERE url_norm = 'locklinforcongress.com/corruption'
UNION ALL
  SELECT 'claim-FL-DOE-89980-115e4b43', source_id FROM source WHERE url_norm = 'locklinforcongress.com/corruption'
UNION ALL
  SELECT 'claim-FL-DOE-89980-13b3cd82', source_id FROM source WHERE url_norm = 'locklinforcongress.com/corruption'
UNION ALL
  SELECT 'claim-FL-DOE-90330-5f9715ce', source_id FROM source WHERE url_norm = 'mariodiazbalart.org'
UNION ALL
  SELECT 'claim-FL-DOE-90330-ae430d30', source_id FROM source WHERE url_norm = 'mariodiazbalart.org'
UNION ALL
  SELECT 'claim-FL-DOE-90330-78c6ccc3', source_id FROM source WHERE url_norm = 'mariodiazbalart.org'
UNION ALL
  SELECT 'claim-FL-DOE-90330-0c64d1b7', source_id FROM source WHERE url_norm = 'mariodiazbalart.org'
UNION ALL
  SELECT 'claim-FL-DOE-90330-b619a4f9', source_id FROM source WHERE url_norm = 'mariodiazbalart.org'
UNION ALL
  SELECT 'claim-FL-DOE-90330-9881b425', source_id FROM source WHERE url_norm = 'mariodiazbalart.org'
UNION ALL
  SELECT 'claim-FL-DOE-90330-962d298f', source_id FROM source WHERE url_norm = 'mariodiazbalart.org'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89980-0bdd3c5c', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B1', '', ARRAY['claim-FL-DOE-89980-14706d23','claim-FL-DOE-89980-29c02b94','claim-FL-DOE-89980-115e4b43']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-0edd4115', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B2', '', ARRAY['claim-FL-DOE-89980-13893910','claim-FL-DOE-89980-20feb24d']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-0ddd3f82', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B3', '', ARRAY['claim-FL-DOE-89980-e19f556d','claim-FL-DOE-89980-f56144ae']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-08dd37a3', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B4', '', ARRAY['claim-FL-DOE-89980-dc4f1644','claim-FL-DOE-89980-ccbaa182','claim-FL-DOE-89980-87ca6591','claim-FL-DOE-89980-005b2925']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-9cd5d1da', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-A2--FL-DOE-89980', '', ARRAY['claim-FL-DOE-89980-69bb0f35']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-b8b2920d', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-KYV2--FL-DOE-89980', '', ARRAY['claim-FL-DOE-89980-8ed957e8','claim-FL-DOE-89980-94891091']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-b5b28d54', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-KYV1--FL-DOE-89980', '', ARRAY['claim-FL-DOE-89980-74aaad88']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-98d5cb8e', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-A6--FL-DOE-89980', '', ARRAY['claim-FL-DOE-89980-8f5bb2a1']::text[], true, 'stated'),
  ('pos-FL-DOE-89980-09dd3936', 'FL-DOE-89980', 'FL-26-general', 'FL-26-general--issue-B7--FL-DOE-89980', '', ARRAY['claim-FL-DOE-89980-13b3cd82']::text[], true, 'stated'),
  ('pos-FL-DOE-90330-0bdd3c5c', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B1', '', ARRAY['claim-FL-DOE-90330-962d298f']::text[], true, 'stated'),
  ('pos-FL-DOE-90330-0edd4115', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90330-0ddd3f82', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B3', '', ARRAY['claim-FL-DOE-90330-78c6ccc3','claim-FL-DOE-90330-b619a4f9']::text[], true, 'stated'),
  ('pos-FL-DOE-90330-08dd37a3', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90330-96d5c868', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-A4--FL-DOE-90330', '', ARRAY['claim-FL-DOE-90330-5f9715ce','claim-FL-DOE-90330-ae430d30']::text[], true, 'stated'),
  ('pos-FL-DOE-90330-09dd3936', 'FL-DOE-90330', 'FL-26-general', 'FL-26-general--issue-B7--FL-DOE-90330', '', ARRAY['claim-FL-DOE-90330-0c64d1b7','claim-FL-DOE-90330-9881b425']::text[], true, 'stated'),
  ('pos-FL-DOE-92137-0bdd3c5c', 'FL-DOE-92137', 'FL-26-general', 'FL-26-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92137-0edd4115', 'FL-DOE-92137', 'FL-26-general', 'FL-26-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92137-0ddd3f82', 'FL-DOE-92137', 'FL-26-general', 'FL-26-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-92137-08dd37a3', 'FL-DOE-92137', 'FL-26-general', 'FL-26-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89980', 'FL-26-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89980-69bb0f35','claim-FL-DOE-89980-14706d23','claim-FL-DOE-89980-e19f556d','claim-FL-DOE-89980-8ed957e8','claim-FL-DOE-89980-29c02b94','claim-FL-DOE-89980-f56144ae','claim-FL-DOE-89980-13893910','claim-FL-DOE-89980-20feb24d','claim-FL-DOE-89980-dc4f1644','claim-FL-DOE-89980-ccbaa182','claim-FL-DOE-89980-87ca6591','claim-FL-DOE-89980-005b2925','claim-FL-DOE-89980-94891091','claim-FL-DOE-89980-74aaad88','claim-FL-DOE-89980-8f5bb2a1','claim-FL-DOE-89980-115e4b43','claim-FL-DOE-89980-13b3cd82']::text[], ARRAY[]::text[], '{"word_count":1485,"verifiable_fact_count":0,"stated_position_count":17,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb),
  ('FL-DOE-90330', 'FL-26-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90330-5f9715ce','claim-FL-DOE-90330-ae430d30','claim-FL-DOE-90330-78c6ccc3','claim-FL-DOE-90330-0c64d1b7','claim-FL-DOE-90330-b619a4f9','claim-FL-DOE-90330-9881b425','claim-FL-DOE-90330-962d298f']::text[], ARRAY[]::text[], '{"word_count":150,"verifiable_fact_count":0,"stated_position_count":7,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb),
  ('FL-DOE-92137', 'FL-26-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb)
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
  WHERE r.race_id = 'FL-26-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-26-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-26-general, then
-- set_race_publication once a human has read the brief.
