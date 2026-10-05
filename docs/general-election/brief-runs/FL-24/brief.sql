-- Brief rows for FL-24-general, built by scripts/brief-rows-sql.ts.
-- Generated from 2 policy run(s) for 2 candidate(s). Review before applying.
--
-- 9 source, 14 issue, 39 claim, 18 position, 2 profile rows.
-- Passages that produced no row: {"states_no_policy":190,"no_issue_matched":26}
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
DELETE FROM claim    WHERE race_id = 'FL-24-general';
DELETE FROM position WHERE race_id = 'FL-24-general';
DELETE FROM issue    WHERE race_id = 'FL-24-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-92f7ba27', 'https://tebrownforflorida.com/the-people-first-agenda', 'tebrownforflorida.com/the-people-first-agenda', 'tebrownforflorida.com', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-dadc4faa', 'https://tebrownforflorida.com/issues', 'tebrownforflorida.com/issues', 'tebrownforflorida.com', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-246b6cce', 'https://tebrownforflorida.com/meet-te-brown', 'tebrownforflorida.com/meet-te-brown', 'tebrownforflorida.com', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-89565bfd', 'https://olivergilbert.vote/es/home-act', 'olivergilbert.vote/es/home-act', 'olivergilbert.vote', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-4cb1d132', 'https://olivergilbert.vote/build-business-act', 'olivergilbert.vote/build-business-act', 'olivergilbert.vote', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-68ce5eb2', 'https://olivergilbert.vote/care-act', 'olivergilbert.vote/care-act', 'olivergilbert.vote', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-9199ca97', 'https://olivergilbert.vote/build-act', 'olivergilbert.vote/build-act', 'olivergilbert.vote', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-88593f42', 'https://olivergilbert.vote/issues', 'olivergilbert.vote/issues', 'olivergilbert.vote', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z'),
  ('src-89885ae7', 'https://olivergilbert.vote/about', 'olivergilbert.vote/about', 'olivergilbert.vote', 'candidate_self', 'N/A', '2026-09-29T19:18:25Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-24-general--issue-B1', 'FL-24-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-24-general--issue-B2', 'FL-24-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-24-general--issue-B3', 'FL-24-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-24-general--issue-B4', 'FL-24-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-24-general--issue-A2--FL-DOE-90703', 'FL-24-general', 'candidate', 'FL-DOE-90703', 'Housing affordability', NULL, NULL, 100),
  ('FL-24-general--issue-A4--FL-DOE-90703', 'FL-24-general', 'candidate', 'FL-DOE-90703', 'Cost of living in Florida', NULL, NULL, 101),
  ('FL-24-general--issue-KYV10--FL-DOE-90703', 'FL-24-general', 'candidate', 'FL-DOE-90703', 'Career, vocational and higher education', NULL, NULL, 102),
  ('FL-24-general--issue-B7--FL-DOE-90703', 'FL-24-general', 'candidate', 'FL-DOE-90703', 'Crime policy, policing and courts', NULL, NULL, 103),
  ('FL-24-general--issue-KYV9--FL-DOE-90703', 'FL-24-general', 'candidate', 'FL-DOE-90703', 'School choice and vouchers', NULL, NULL, 104),
  ('FL-24-general--issue-A2--FL-DOE-91544', 'FL-24-general', 'candidate', 'FL-DOE-91544', 'Housing affordability', NULL, NULL, 100),
  ('FL-24-general--issue-B7--FL-DOE-91544', 'FL-24-general', 'candidate', 'FL-DOE-91544', 'Crime policy, policing and courts', NULL, NULL, 101),
  ('FL-24-general--issue-KYV10--FL-DOE-91544', 'FL-24-general', 'candidate', 'FL-DOE-91544', 'Career, vocational and higher education', NULL, NULL, 102),
  ('FL-24-general--issue-A6--FL-DOE-91544', 'FL-24-general', 'candidate', 'FL-DOE-91544', 'Public school funding and teachers', NULL, NULL, 103),
  ('FL-24-general--issue-KYV3--FL-DOE-91544', 'FL-24-general', 'candidate', 'FL-DOE-91544', 'Growth, development and land conservation', NULL, NULL, 104)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-90703-64ac8b75', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-90703', 'A bold agenda focused on lowering the cost of living, making housing and childcare more affordable, protecting seniors and veterans, creating jobs, protecting the healthcare system, strengthening communities, and putting families first.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-bf891d43', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B1', 'A bold agenda focused on lowering the cost of living, making housing and childcare more affordable, protecting seniors and veterans, creating jobs, protecting the healthcare system, strengthening communities, and putting families first.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-125488fa', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-90703', '1. Affordability & Homeownership — Lower the barriers to buying a home, build more affordable housing, and address the cost of living. 2. Healthcare That Works — Increase transparency, lower prescription and healthcare costs, and protect patients from unnecessary costs. 3. Jobs & Economic Opportunity — Support small businesses, attract manufacturing, and create good-paying jobs in the district. 4. Infrastructure & Resilience — Invest in roads, bridges, water systems, drainage, and infrastructure that keeps South Florida moving. 5. Protecting Seniors & Veterans — Protect Social Security and Medicare while making sure veterans receive the services they’ve earned. 6.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-24679a80', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-A4--FL-DOE-90703', '1. Affordability & Homeownership — Lower the barriers to buying a home, build more affordable housing, and address the cost of living. 2. Healthcare That Works — Increase transparency, lower prescription and healthcare costs, and protect patients from unnecessary costs. 3. Jobs & Economic Opportunity — Support small businesses, attract manufacturing, and create good-paying jobs in the district. 4. Infrastructure & Resilience — Invest in roads, bridges, water systems, drainage, and infrastructure that keeps South Florida moving. 5. Protecting Seniors & Veterans — Protect Social Security and Medicare while making sure veterans receive the services they’ve earned. 6.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-a141e3b4', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B1', '1. Affordability & Homeownership — Lower the barriers to buying a home, build more affordable housing, and address the cost of living. 2. Healthcare That Works — Increase transparency, lower prescription and healthcare costs, and protect patients from unnecessary costs. 3. Jobs & Economic Opportunity — Support small businesses, attract manufacturing, and create good-paying jobs in the district. 4. Infrastructure & Resilience — Invest in roads, bridges, water systems, drainage, and infrastructure that keeps South Florida moving. 5. Protecting Seniors & Veterans — Protect Social Security and Medicare while making sure veterans receive the services they’ve earned. 6.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-d7953ab7', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B2', '1. Affordability & Homeownership — Lower the barriers to buying a home, build more affordable housing, and address the cost of living. 2. Healthcare That Works — Increase transparency, lower prescription and healthcare costs, and protect patients from unnecessary costs. 3. Jobs & Economic Opportunity — Support small businesses, attract manufacturing, and create good-paying jobs in the district. 4. Infrastructure & Resilience — Invest in roads, bridges, water systems, drainage, and infrastructure that keeps South Florida moving. 5. Protecting Seniors & Veterans — Protect Social Security and Medicare while making sure veterans receive the services they’ve earned. 6.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-53e4c16d', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B4', '1. Affordability & Homeownership — Lower the barriers to buying a home, build more affordable housing, and address the cost of living. 2. Healthcare That Works — Increase transparency, lower prescription and healthcare costs, and protect patients from unnecessary costs. 3. Jobs & Economic Opportunity — Support small businesses, attract manufacturing, and create good-paying jobs in the district. 4. Infrastructure & Resilience — Invest in roads, bridges, water systems, drainage, and infrastructure that keeps South Florida moving. 5. Protecting Seniors & Veterans — Protect Social Security and Medicare while making sure veterans receive the services they’ve earned. 6.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-508a7829', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-KYV10--FL-DOE-90703', 'Safe & Strong Communities — Support law enforcement, address crime, and make communities safer. 7. Education & Opportunity — Expand educational choices and make sure children have pathways to careers, trades, college, or entrepreneurship. 8. Accountability in Washington — Make government live within its means, eliminate waste, and demand measurable results', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-dbab370f', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B7--FL-DOE-90703', 'Safe & Strong Communities — Support law enforcement, address crime, and make communities safer. 7. Education & Opportunity — Expand educational choices and make sure children have pathways to careers, trades, college, or entrepreneurship. 8. Accountability in Washington — Make government live within its means, eliminate waste, and demand measurable results', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-9747c644', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-90703', 'Te Brown supports redirecting federal housing dollars away from lifelong rental subsidies and toward helping low-income families in our district buy their first home. Instead of keeping hardworking Americans trapped as permanent renters, housing policy should help families build stability, equity, and independence. It is time to move beyond dependency and give more families the chance to own a piece of the American Dream.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-c60d3613', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-KYV9--FL-DOE-90703', 'Every child in Florida’s 24th District deserves a quality education, not a zip code assignment. Te Brown supports taking federal education dollars that currently prop up failing schools and putting that money directly in the hands of parents by funding students, not systems. Families should be empowered to choose the best learning environment for their children, whether that is a public school, charter school, private school, or homeschool. No child should be trapped in an underperforming school because of where their family lives.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-5675c99b', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B1', 'The H-1B program should serve America’s workforce—not be used to undercut American workers’ wages or replace qualified Americans. I support reforms that prioritize American workers, require employers to pay competitive wages, crack down on abuse, and reserve H-1B visas for legitimate high-skill workforce needs where American workers cannot fill the position.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-0e306de1', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B3', 'The H-1B program should serve America’s workforce—not be used to undercut American workers’ wages or replace qualified Americans. I support reforms that prioritize American workers, require employers to pay competitive wages, crack down on abuse, and reserve H-1B visas for legitimate high-skill workforce needs where American workers cannot fill the position.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-14abd606', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B3', 'I support securing our southern border, enforcing our immigration laws, and prioritizing the removal of criminals and those who pose a threat to public safety.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-c9fbde74', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B3', 'At the same time, we should create a clear, lawful process for people who have earned the right to remain, while ending policies that encourage illegal immigration and ensuring that those who follow the rules are not left behind.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-5328e450', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B3', 'For 15 years, Washington has told Haitian families in South Florida that their status was temporary, and for 15 years nothing changed. During that time, the situation in Haiti has only worsened, and many community members have built businesses, raised families, staffed hospitals, and created institutions the rest of us depend on. Put simply, that is not a temporary population, and the community has earned better than a deportation notice. In Congress, I will fight for an earned path to citizenship. Earned: a steady work history, taxes paid, a clean record, a full background check. Not amnesty, and not a cut ahead of anyone who waited in line.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-f1b9ca7c', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B3', 'A Republican Congress did this in 1998 with the Haitian Refugee Immigration Fairness Act, and it was right then. Those who have worked, paid taxes, built our communities, and embodied the American experience should not be cast aside, but welcomed as who they are: Haitian-Americans. I won’t pretend, either, that the other side doesn’t matter. No immigration bill can fix the status of Port-Au-Prince and Haiti. I will work to end the South Florida weapons pipeline to Port-Au-Prince, and back the effort to rebuild, because nobody wants a stable Haiti more than those forced to leave it.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-1e512c70', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-90703', 'As a former teacher, she believes every child deserves access to a quality education and that parents—not government bureaucrats—should have the freedom to choose the best educational path for their children. She is a strong advocate for school choice and policies that put students and families first. Now, Te is taking her experience as a builder, educator, and entrepreneur to Washington. She isn’t a career politician—she’s a proven leader who knows how to get results. She is committed to fighting for stronger wage growth, affordable housing, lower costs for working families, safer communities, and policies that encourage businesses to grow and create better-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-9e4fe3ea', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-KYV9--FL-DOE-90703', 'As a former teacher, she believes every child deserves access to a quality education and that parents—not government bureaucrats—should have the freedom to choose the best educational path for their children. She is a strong advocate for school choice and policies that put students and families first. Now, Te is taking her experience as a builder, educator, and entrepreneur to Washington. She isn’t a career politician—she’s a proven leader who knows how to get results. She is committed to fighting for stronger wage growth, affordable housing, lower costs for working families, safer communities, and policies that encourage businesses to grow and create better-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-b8db074a', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B1', 'As a former teacher, she believes every child deserves access to a quality education and that parents—not government bureaucrats—should have the freedom to choose the best educational path for their children. She is a strong advocate for school choice and policies that put students and families first. Now, Te is taking her experience as a builder, educator, and entrepreneur to Washington. She isn’t a career politician—she’s a proven leader who knows how to get results. She is committed to fighting for stronger wage growth, affordable housing, lower costs for working families, safer communities, and policies that encourage businesses to grow and create better-paying jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90703-4dcf963b', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B1', 'Te believes America is strongest when government is limited, communities are safe, the economy is growing, and every family has the opportunity to succeed through hard work. As your next representative in Congress, Te Mayonna Brown will be a strong voice for economic growth, public safety, fiscal responsibility, individual freedom, and common-sense leadership. She will work every day to protect taxpayers, support small businesses, strengthen families, and ensure the next generation has even greater opportunities than the last. Together, we can build a stronger Florida, a stronger economy, and a brighter future for the families of Florida’s 24th Congressional District.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-6a74ebf3', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-91544', 'And for the families locked out the longest — first-time and working-family buyers — it opens three more doors: expanded FHA lending, a homebuyer tax credit, and a cap on starter rates.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-2ff59253', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-91544', 'When interest rates spike, first-time buyers are the first ones priced out — families with strong income and credit watch the same house drift out of reach. The HOME Act caps the interest rate on qualifying first-time homebuyer mortgages, backed by the same public-private financing as the HOME mortgage: Treasury-backed bonds and lender tax credits cover the difference, so lenders stay whole and standards stay sound.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-b079f7a7', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B1', 'Strengthen the SBA 504 program by expanding funding, modernizing eligibility, speeding project approvals, and creating a new 504 Express Expansion track for established businesses creating jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-d16758fd', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B1', 'Provide enhanced financing incentives for businesses that establish employee ownership and profit-sharing programs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-6268338e', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B7--FL-DOE-91544', 'Investigate and prosecute fraud aggressively.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-6c992df3', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B1', 'The plan invests in direct support professionals through better reimbursement, competitive wages, training, career ladders, benefits, recruitment, retention, and emergency staffing.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-e177bbb4', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B2', 'The CARE Act will establish continuous coverage and coordinated care for people with qualifying lifelong disabilities. Medicaid will remain the principal payer for long-term services and supports. Medicare will cover eligible medical services. Social Security will provide income support. The CARE Advocate will make those systems function as one plan instead of separate bureaucracies.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-d8ac2287', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B2', 'Prevent unnecessary interruptions in Medicaid for people with permanent qualifying disabilities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-7e831ca8', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B2', 'Provide Medicaid wraparound coverage for services Medicare does not cover.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-2fd47745', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B2', 'Expand access to Medicaid Buy-In so people can work without losing essential care.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-2fc8d613', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-KYV10--FL-DOE-91544', 'Educational assistance for trade school, college, graduate school, and professional school in exchange for service in designated national priority industries.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-c0793efd', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-A6--FL-DOE-91544', 'Enhanced grants for districts investing in teacher compensation, teacher retention, mentoring, and professional development. Teachers are America''s first responders for the future.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-4b38c02a', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-KYV10--FL-DOE-91544', 'Increase funding for Historically Black Colleges and Universities and other colleges that provide education to underserved communities.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-5ec3acec', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B2', 'We’re the richest country on earth, but we send billions of dollars to other countries so they can afford universal healthcare. How does that make sense? In Congress, Oliver will fight for a pathway to ensure that healthcare is a right for every American.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-4ececce6', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-KYV10--FL-DOE-91544', 'Oliver will fight in Washington to reinvest in job training, especially in high-paying technical fields that can’t easily be taken away by AI, and to strengthen support for entrepreneurs and small business owners.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-66fe3c76', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B1', 'Oliver will fight in Washington to reinvest in job training, especially in high-paying technical fields that can’t easily be taken away by AI, and to strengthen support for entrepreneurs and small business owners.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-97754437', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-91544', 'On the County Commission, I’ve focused on a new goal: Make Miami-Dade County a truly world-class community. To get there, we have to overhaul our transportation system, which is why I’ve led bold initiatives to build up density along our transit corridors, creating partnerships that will fund rapid transit expansion and lead to more affordable housing in the neighborhoods that need it the most.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-91544-9550c217', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-KYV3--FL-DOE-91544', 'On the County Commission, I’ve focused on a new goal: Make Miami-Dade County a truly world-class community. To get there, we have to overhaul our transportation system, which is why I’ve led bold initiatives to build up density along our transit corridors, creating partnerships that will fund rapid transit expansion and lead to more affordable housing in the neighborhoods that need it the most.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-90703-64ac8b75', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-bf891d43', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-125488fa', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-24679a80', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-a141e3b4', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-d7953ab7', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-53e4c16d', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-508a7829', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-dbab370f', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/the-people-first-agenda'
UNION ALL
  SELECT 'claim-FL-DOE-90703-9747c644', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-c60d3613', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-5675c99b', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-0e306de1', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-14abd606', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-c9fbde74', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-5328e450', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-f1b9ca7c', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/issues'
UNION ALL
  SELECT 'claim-FL-DOE-90703-1e512c70', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/meet-te-brown'
UNION ALL
  SELECT 'claim-FL-DOE-90703-9e4fe3ea', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/meet-te-brown'
UNION ALL
  SELECT 'claim-FL-DOE-90703-b8db074a', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/meet-te-brown'
UNION ALL
  SELECT 'claim-FL-DOE-90703-4dcf963b', source_id FROM source WHERE url_norm = 'tebrownforflorida.com/meet-te-brown'
UNION ALL
  SELECT 'claim-FL-DOE-91544-6a74ebf3', source_id FROM source WHERE url_norm = 'olivergilbert.vote/es/home-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-2ff59253', source_id FROM source WHERE url_norm = 'olivergilbert.vote/es/home-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-b079f7a7', source_id FROM source WHERE url_norm = 'olivergilbert.vote/build-business-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-d16758fd', source_id FROM source WHERE url_norm = 'olivergilbert.vote/build-business-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-6268338e', source_id FROM source WHERE url_norm = 'olivergilbert.vote/build-business-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-6c992df3', source_id FROM source WHERE url_norm = 'olivergilbert.vote/care-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-e177bbb4', source_id FROM source WHERE url_norm = 'olivergilbert.vote/care-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-d8ac2287', source_id FROM source WHERE url_norm = 'olivergilbert.vote/care-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-7e831ca8', source_id FROM source WHERE url_norm = 'olivergilbert.vote/care-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-2fd47745', source_id FROM source WHERE url_norm = 'olivergilbert.vote/care-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-2fc8d613', source_id FROM source WHERE url_norm = 'olivergilbert.vote/build-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-c0793efd', source_id FROM source WHERE url_norm = 'olivergilbert.vote/build-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-4b38c02a', source_id FROM source WHERE url_norm = 'olivergilbert.vote/build-act'
UNION ALL
  SELECT 'claim-FL-DOE-91544-5ec3acec', source_id FROM source WHERE url_norm = 'olivergilbert.vote/issues'
UNION ALL
  SELECT 'claim-FL-DOE-91544-4ececce6', source_id FROM source WHERE url_norm = 'olivergilbert.vote/issues'
UNION ALL
  SELECT 'claim-FL-DOE-91544-66fe3c76', source_id FROM source WHERE url_norm = 'olivergilbert.vote/issues'
UNION ALL
  SELECT 'claim-FL-DOE-91544-97754437', source_id FROM source WHERE url_norm = 'olivergilbert.vote/about'
UNION ALL
  SELECT 'claim-FL-DOE-91544-9550c217', source_id FROM source WHERE url_norm = 'olivergilbert.vote/about'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-90703-0bdd3c5c', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B1', '', ARRAY['claim-FL-DOE-90703-bf891d43','claim-FL-DOE-90703-a141e3b4','claim-FL-DOE-90703-5675c99b','claim-FL-DOE-90703-b8db074a','claim-FL-DOE-90703-4dcf963b']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-0edd4115', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B2', '', ARRAY['claim-FL-DOE-90703-d7953ab7']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-0ddd3f82', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B3', '', ARRAY['claim-FL-DOE-90703-0e306de1','claim-FL-DOE-90703-14abd606','claim-FL-DOE-90703-c9fbde74','claim-FL-DOE-90703-5328e450','claim-FL-DOE-90703-f1b9ca7c']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-08dd37a3', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B4', '', ARRAY['claim-FL-DOE-90703-53e4c16d']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-9cd5d1da', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-90703', '', ARRAY['claim-FL-DOE-90703-64ac8b75','claim-FL-DOE-90703-125488fa','claim-FL-DOE-90703-9747c644','claim-FL-DOE-90703-1e512c70']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-96d5c868', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-A4--FL-DOE-90703', '', ARRAY['claim-FL-DOE-90703-24679a80']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-6c14946c', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-KYV10--FL-DOE-90703', '', ARRAY['claim-FL-DOE-90703-508a7829']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-09dd3936', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-B7--FL-DOE-90703', '', ARRAY['claim-FL-DOE-90703-dbab370f']::text[], true, 'stated'),
  ('pos-FL-DOE-90703-adb280bc', 'FL-DOE-90703', 'FL-24-general', 'FL-24-general--issue-KYV9--FL-DOE-90703', '', ARRAY['claim-FL-DOE-90703-c60d3613','claim-FL-DOE-90703-9e4fe3ea']::text[], true, 'stated'),
  ('pos-FL-DOE-91544-0bdd3c5c', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B1', '', ARRAY['claim-FL-DOE-91544-b079f7a7','claim-FL-DOE-91544-d16758fd','claim-FL-DOE-91544-6c992df3','claim-FL-DOE-91544-66fe3c76']::text[], true, 'stated'),
  ('pos-FL-DOE-91544-0edd4115', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B2', '', ARRAY['claim-FL-DOE-91544-e177bbb4','claim-FL-DOE-91544-d8ac2287','claim-FL-DOE-91544-7e831ca8','claim-FL-DOE-91544-2fd47745','claim-FL-DOE-91544-5ec3acec']::text[], true, 'stated'),
  ('pos-FL-DOE-91544-0ddd3f82', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91544-08dd37a3', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-91544-9cd5d1da', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-A2--FL-DOE-91544', '', ARRAY['claim-FL-DOE-91544-6a74ebf3','claim-FL-DOE-91544-2ff59253','claim-FL-DOE-91544-97754437']::text[], true, 'stated'),
  ('pos-FL-DOE-91544-09dd3936', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-B7--FL-DOE-91544', '', ARRAY['claim-FL-DOE-91544-6268338e']::text[], true, 'stated'),
  ('pos-FL-DOE-91544-6c14946c', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-KYV10--FL-DOE-91544', '', ARRAY['claim-FL-DOE-91544-2fc8d613','claim-FL-DOE-91544-4b38c02a','claim-FL-DOE-91544-4ececce6']::text[], true, 'stated'),
  ('pos-FL-DOE-91544-98d5cb8e', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-A6--FL-DOE-91544', '', ARRAY['claim-FL-DOE-91544-c0793efd']::text[], true, 'stated'),
  ('pos-FL-DOE-91544-b7b2907a', 'FL-DOE-91544', 'FL-24-general', 'FL-24-general--issue-KYV3--FL-DOE-91544', '', ARRAY['claim-FL-DOE-91544-9550c217']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-90703', 'FL-24-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90703-64ac8b75','claim-FL-DOE-90703-bf891d43','claim-FL-DOE-90703-125488fa','claim-FL-DOE-90703-24679a80','claim-FL-DOE-90703-a141e3b4','claim-FL-DOE-90703-d7953ab7','claim-FL-DOE-90703-53e4c16d','claim-FL-DOE-90703-508a7829','claim-FL-DOE-90703-dbab370f','claim-FL-DOE-90703-9747c644','claim-FL-DOE-90703-c60d3613','claim-FL-DOE-90703-5675c99b','claim-FL-DOE-90703-0e306de1','claim-FL-DOE-90703-14abd606','claim-FL-DOE-90703-c9fbde74','claim-FL-DOE-90703-5328e450','claim-FL-DOE-90703-f1b9ca7c','claim-FL-DOE-90703-1e512c70','claim-FL-DOE-90703-9e4fe3ea','claim-FL-DOE-90703-b8db074a','claim-FL-DOE-90703-4dcf963b']::text[], ARRAY[]::text[], '{"word_count":1586,"verifiable_fact_count":0,"stated_position_count":21,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb),
  ('FL-DOE-91544', 'FL-24-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-91544-6a74ebf3','claim-FL-DOE-91544-2ff59253','claim-FL-DOE-91544-b079f7a7','claim-FL-DOE-91544-d16758fd','claim-FL-DOE-91544-6268338e','claim-FL-DOE-91544-6c992df3','claim-FL-DOE-91544-e177bbb4','claim-FL-DOE-91544-d8ac2287','claim-FL-DOE-91544-7e831ca8','claim-FL-DOE-91544-2fd47745','claim-FL-DOE-91544-2fc8d613','claim-FL-DOE-91544-c0793efd','claim-FL-DOE-91544-4b38c02a','claim-FL-DOE-91544-5ec3acec','claim-FL-DOE-91544-4ececce6','claim-FL-DOE-91544-66fe3c76','claim-FL-DOE-91544-97754437','claim-FL-DOE-91544-9550c217']::text[], ARRAY[]::text[], '{"word_count":548,"verifiable_fact_count":0,"stated_position_count":18,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":2}'::jsonb)
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
  WHERE r.race_id = 'FL-24-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-24-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-24-general, then
-- set_race_publication once a human has read the brief.
