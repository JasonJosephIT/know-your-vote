-- Brief rows for FL-SEN-general, built by scripts/brief-rows-sql.ts.
-- Generated from 3 policy run(s) for 3 candidate(s). Review before applying.
--
-- 2 source, 16 issue, 64 claim, 24 position, 3 profile rows.
-- Passages that produced no row: {"states_no_policy":131,"no_issue_matched":48}
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
DELETE FROM claim    WHERE race_id = 'FL-SEN-general';
DELETE FROM position WHERE race_id = 'FL-SEN-general';
DELETE FROM issue    WHERE race_id = 'FL-SEN-general';

-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same
-- normalization, so a page it already recorded keeps its existing source_id.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES
  ('src-6ca99be2', 'https://angienixon.com/', 'angienixon.com', 'angienixon.com', 'candidate_self', 'N/A', '2026-09-29T11:46:36Z'),
  ('src-e60526d7', 'https://angienixon.com/priorities', 'angienixon.com/priorities', 'angienixon.com', 'candidate_self', 'N/A', '2026-09-29T11:46:36Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-SEN-general--issue-B1', 'FL-SEN-general', 'spine', NULL, 'Economy, inflation, and jobs', NULL, NULL, 1),
  ('FL-SEN-general--issue-B2', 'FL-SEN-general', 'spine', NULL, 'Healthcare access and costs', NULL, NULL, 2),
  ('FL-SEN-general--issue-B3', 'FL-SEN-general', 'spine', NULL, 'Immigration and border enforcement', NULL, NULL, 3),
  ('FL-SEN-general--issue-B4', 'FL-SEN-general', 'spine', NULL, 'Social Security and Medicare', NULL, NULL, 4),
  ('FL-SEN-general--issue-A2--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Housing affordability', NULL, NULL, 100),
  ('FL-SEN-general--issue-KYV6--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Renters and evictions', NULL, NULL, 101),
  ('FL-SEN-general--issue-B5--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Abortion policy', NULL, NULL, 102),
  ('FL-SEN-general--issue-KYV10--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Career, vocational and higher education', NULL, NULL, 103),
  ('FL-SEN-general--issue-A6--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Public school funding and teachers', NULL, NULL, 104),
  ('FL-SEN-general--issue-A1--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Property insurance costs', NULL, NULL, 105),
  ('FL-SEN-general--issue-KYV4--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Storm resilience and flood protection', NULL, NULL, 106),
  ('FL-SEN-general--issue-KYV2--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Energy and utilities', NULL, NULL, 107),
  ('FL-SEN-general--issue-B8--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Climate and environment (national)', NULL, NULL, 108),
  ('FL-SEN-general--issue-KYV3--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Growth, development and land conservation', NULL, NULL, 109),
  ('FL-SEN-general--issue-B7--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Crime policy, policing and courts', NULL, NULL, 110),
  ('FL-SEN-general--issue-A7--FL-DOE-90009', 'FL-SEN-general', 'candidate', 'FL-DOE-90009', 'Elections administration and voting access', NULL, NULL, 111)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
  ('claim-FL-DOE-90009-6ded0d73', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'Angie Nixon is running to lower costs, raise wages, and build a people-powered government that puts working families first, not greedy billionaires.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-95d4cba6', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'A national rent freeze and a real moratorium on evictions.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-cec15b5f', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV6--FL-DOE-90009', 'A national rent freeze and a real moratorium on evictions.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-c29b226f', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'A National Rent Freeze and Moratorium on Evictions', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-9673b2f6', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV6--FL-DOE-90009', 'A National Rent Freeze and Moratorium on Evictions', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-fe8a4f5a', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'A universal jobs program with inflation-adjusted wages', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-031885e7', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', 'Medicare for All that covers every person in America — free at the point of service, with no premiums, no deductibles, no copays, and no surprise bills.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-21f5f369', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B4', 'Medicare for All that covers every person in America — free at the point of service, with no premiums, no deductibles, no copays, and no surprise bills.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-7dbc0909', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', 'Comprehensive coverage , including dental, vision, hearing, mental health and substance use treatment, reproductive and maternity care, and prescription drugs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-ef53aad4', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', 'Capping prescription drug costs and ending price gouging by drug companies.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-12914f1e', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B5--FL-DOE-90009', 'Protecting reproductive freedom , including the right to abortion, contraception, and IVF, free from political interference.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-b8589e27', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', 'Canceling the medical debt crushing families. Canceling existing medical debt, wiping it off credit reports for good, and banning debt collectors from coming after patients for medical bill. Angie support senator Sanders’ bipartisan-backed Medical Debt Cancellation Act.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-efd73b28', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'Living wages for child care and early-childhood educators , who are among the most underpaid workers in the country despite doing some of its most important work.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-17e9a562', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV10--FL-DOE-90009', 'Tuition-free public college and trade school , and canceling student debt.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-9ddeab92', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A6--FL-DOE-90009', 'Fully funding public K-12 schools and increased teacher wages', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-0e87b8aa', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV10--FL-DOE-90009', 'Expanding vocational and apprenticeship programs that lead directly to good union jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-5ea5061a', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'Expanding vocational and apprenticeship programs that lead directly to good union jobs.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-ecc86e76', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'Massive investment in permanently affordable housing , building millions of new affordable units nationwide.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-db635737', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'A national rent stabilization standard , just-cause eviction protections, and the right to counsel in eviction proceedings.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-c1402562', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV6--FL-DOE-90009', 'A national rent stabilization standard , just-cause eviction protections, and the right to counsel in eviction proceedings.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-e4e5a5f8', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'Cracking down on corporate landlords and Wallstreet speculators buying up single-family homes and driving up rents.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-654c0799', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV6--FL-DOE-90009', 'Cracking down on corporate landlords and Wallstreet speculators buying up single-family homes and driving up rents.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-15332d92', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'Expanding Section 8 vouchers so every eligible family can access one without languishing on a waitlist.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-705b1a63', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV6--FL-DOE-90009', 'Expanding Section 8 vouchers so every eligible family can access one without languishing on a waitlist.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-119f8bed', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A1--FL-DOE-90009', 'Federal action on the property insurance crisis , including reinsurance backstops and stronger consumer protections, so Floridians aren’t priced out of their own homes by an insurance market that keeps failing them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-aed5ab8a', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV4--FL-DOE-90009', 'Disaster resilience funding to harden homes against hurricanes', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-6e7bffe2', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'Raising the federal minimum wage to a real living wage, indexed to inflation, for every worker, including immigrant and incarcerated workers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-a902cad9', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'Ending “right to work” laws and extending labor protections to workers historically excluded from them, including farmworkers and domestic workers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-f4b683cb', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'Fighting outsourcing and trade policy that has hollowed out American manufacturing towns', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-5fd1cbc7', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV2--FL-DOE-90009', 'Making tech companies pay for the energy and water they use , not passing those costs on to ratepayers.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-38c767ae', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B8--FL-DOE-90009', 'No new construction of data centers before there are real federal guardrails put in place , including environmental review and community input requirements.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-7b2f37c0', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV2--FL-DOE-90009', 'No new construction of data centers before there are real federal guardrails put in place , including environmental review and community input requirements.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-3965c775', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV3--FL-DOE-90009', 'No new construction of data centers before there are real federal guardrails put in place , including environmental review and community input requirements.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-b77b5aaf', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'Protecting workers from AI-driven job displacement , including a real seat at the table for workers and unions as automation reshapes their industries.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-c755c8ac', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B3', 'It is time we had the courage to say it plainly: mass incarceration and mass deportation are moral failures, and I will fight in the United States Senate to end them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-cca08908', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', 'It is time we had the courage to say it plainly: mass incarceration and mass deportation are moral failures, and I will fight in the United States Senate to end them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-02d8b1a0', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', 'Ending mass incarceration , including federal decriminalization of marijuana and investment in treatment over incarceration for substance use.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-b7aff350', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', 'Demilitarizing policing and investing in community-based public safety, violence prevention and crisis response', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-2946b926', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B3', 'A humane immigration system , including a swift path to citizenship for Dreamers and undocumented residents, and a moratorium on deportations pending a full audit of enforcement practices.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-713459c1', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B3', 'Abolishing ICE and rebuilding immigration enforcement from scratch. Since its creation in 2003, ICE has operated with almost no accountability — and that’s escalated into real tragedy, including U.S. citizens killed by federal immigration agents during enforcement surges in cities like Minneapolis. Angie believes an agency that has repeatedly shown it cannot be trusted with the power it has should not be reformed at the margins — it should be dismantled, with any legitimate immigration enforcement function rebuilt under new, accountable civilian oversight, due process protections, and a mission that reflects American values instead of terror tactics.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-4b7238a9', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', 'Ending for-profit prisons and detention centers', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-80b4e644', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', 'Requiring warrants for Surveillance Data Access. Law enforcement should not be able to search months of a person’s movements without judicial oversight. I will fight for federal standards requiring a warrant before ALPR or similar location data can be accessed in most circumstances.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-a5a4fe1d', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B3', 'Ending Data Sharing with Federal Immigration Enforcement. Local police departments should not become a surveillance arm of ICE or CBP. I support legislation prohibiting the sharing of license plate and location data with federal immigration authorities absent a criminal warrant.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-1806ef91', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', 'Ending Data Sharing with Federal Immigration Enforcement. Local police departments should not become a surveillance arm of ICE or CBP. I support legislation prohibiting the sharing of license plate and location data with federal immigration authorities absent a criminal warrant.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-2bd07199', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', 'A bold, union-built transition to renewable energy , creating millions of good-paying, union jobs in wind, solar, and grid modernization, prioritizing the frontline communities that have borne the brunt of pollution for generations.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-b4ba5724', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B8--FL-DOE-90009', 'A bold, union-built transition to renewable energy , creating millions of good-paying, union jobs in wind, solar, and grid modernization, prioritizing the frontline communities that have borne the brunt of pollution for generations.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-dbe27f2a', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV2--FL-DOE-90009', 'A bold, union-built transition to renewable energy , creating millions of good-paying, union jobs in wind, solar, and grid modernization, prioritizing the frontline communities that have borne the brunt of pollution for generations.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-73f24d47', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B8--FL-DOE-90009', 'Ending taxpayer subsidies for fossil fuel corporations and making polluters pay for the damage they’ve caused.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-434ba8c5', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV2--FL-DOE-90009', 'Ending taxpayer subsidies for fossil fuel corporations and making polluters pay for the damage they’ve caused.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-5817e032', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV2--FL-DOE-90009', 'Rebuilding and hardening the electric grid , so it’s resilient, affordable, and ready for a clean-energy future', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-cdcf1c29', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV4--FL-DOE-90009', 'Disaster resilience funding to harden homes against hurricanes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-3df54ce4', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A7--FL-DOE-90009', 'Restoring and expanding the Voting Rights Act , including automatic voter registration for every American over 18, and ending racist voter suppression and burdensome voter ID laws.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-3e42621e', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A7--FL-DOE-90009', 'Ending partisan gerrymandering with independent redistricting commissions.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-f8d772d5', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A7--FL-DOE-90009', 'Making Election Day a national holiday , so working people don’t have to choose between their paycheck and their vote.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-91094050', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A7--FL-DOE-90009', 'Re-enfranchising Americans with felony convictions , restoring voting rights to the millions of Americans who have served their time and deserve to have their voice back.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-e52ab2e1', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', 'Billionaire fortunes have exploded over the past few years while working families fall further behind on rent, groceries, and medical bills. Florida is home to more billionaires than almost any other state and meanwhile, everyday Floridians are struggling more than anyone with housing costs, healthcare cuts, job loss and inflation. Angie believes we can afford Medicare for All, universal child care, and a clean-energy future. What we can’t afford is letting the richest people in the country keep paying less in taxes than a nurse or a line cook.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-4812e7cb', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B4', 'Billionaire fortunes have exploded over the past few years while working families fall further behind on rent, groceries, and medical bills. Florida is home to more billionaires than almost any other state and meanwhile, everyday Floridians are struggling more than anyone with housing costs, healthcare cuts, job loss and inflation. Angie believes we can afford Medicare for All, universal child care, and a clean-energy future. What we can’t afford is letting the richest people in the country keep paying less in taxes than a nurse or a line cook.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-05f08423', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'Direct relief for working families , funded by that revenue — including direct payments to households earning under $150,000 a year, expanding Medicare to cover dental, vision, and hearing, and building millions of affordable homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-dfb412ee', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', 'Direct relief for working families , funded by that revenue — including direct payments to households earning under $150,000 a year, expanding Medicare to cover dental, vision, and hearing, and building millions of affordable homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-e639ecb8', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B4', 'Direct relief for working families , funded by that revenue — including direct payments to households earning under $150,000 a year, expanding Medicare to cover dental, vision, and hearing, and building millions of affordable homes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-6bcbf7f9', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', 'Cracking down on corporate price gouging in groceries, housing, and health care, where record corporate profits have tracked closely with what families are paying at the register.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-822c1970', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', 'Cracking down on corporate price gouging in groceries, housing, and health care, where record corporate profits have tracked closely with what families are paying at the register.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-45632a73', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A6--FL-DOE-90009', 'Real History in Our Schools. Support federal funding incentives for states and school districts that teach comprehensive history. Oppose federal or state efforts to ban books, censor curricula, or punish teachers for teaching accurate history, while supporting age-appropriate standards developed by educators and historians rather than political appointees.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-90009-150fb43e', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', 'Hate Crime Enforcement. Support robust funding and enforcement for laws addressing hate crimes targeting. Ensure law enforcement agencies have training to recognize and respond to antisemitic, anti-Palestinian, Islamaphobic, anti-Black, anti-Immigrant and all threats and violence.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
  SELECT 'claim-FL-DOE-90009-6ded0d73', source_id FROM source WHERE url_norm = 'angienixon.com'
UNION ALL
  SELECT 'claim-FL-DOE-90009-95d4cba6', source_id FROM source WHERE url_norm = 'angienixon.com'
UNION ALL
  SELECT 'claim-FL-DOE-90009-cec15b5f', source_id FROM source WHERE url_norm = 'angienixon.com'
UNION ALL
  SELECT 'claim-FL-DOE-90009-c29b226f', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-9673b2f6', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-fe8a4f5a', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-031885e7', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-21f5f369', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-7dbc0909', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-ef53aad4', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-12914f1e', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-b8589e27', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-efd73b28', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-17e9a562', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-9ddeab92', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-0e87b8aa', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-5ea5061a', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-ecc86e76', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-db635737', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-c1402562', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-e4e5a5f8', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-654c0799', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-15332d92', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-705b1a63', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-119f8bed', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-aed5ab8a', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-6e7bffe2', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-a902cad9', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-f4b683cb', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-5fd1cbc7', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-38c767ae', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-7b2f37c0', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-3965c775', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-b77b5aaf', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-c755c8ac', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-cca08908', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-02d8b1a0', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-b7aff350', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-2946b926', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-713459c1', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-4b7238a9', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-80b4e644', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-a5a4fe1d', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-1806ef91', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-2bd07199', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-b4ba5724', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-dbe27f2a', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-73f24d47', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-434ba8c5', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-5817e032', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-cdcf1c29', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-3df54ce4', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-3e42621e', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-f8d772d5', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-91094050', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-e52ab2e1', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-4812e7cb', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-05f08423', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-dfb412ee', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-e639ecb8', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-6bcbf7f9', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-822c1970', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-45632a73', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
UNION ALL
  SELECT 'claim-FL-DOE-90009-150fb43e', source_id FROM source WHERE url_norm = 'angienixon.com/priorities'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89119-0bdd3c5c', 'FL-DOE-89119', 'FL-SEN-general', 'FL-SEN-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89119-0edd4115', 'FL-DOE-89119', 'FL-SEN-general', 'FL-SEN-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89119-0ddd3f82', 'FL-DOE-89119', 'FL-SEN-general', 'FL-SEN-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89119-08dd37a3', 'FL-DOE-89119', 'FL-SEN-general', 'FL-SEN-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89955-0bdd3c5c', 'FL-DOE-89955', 'FL-SEN-general', 'FL-SEN-general--issue-B1', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89955-0edd4115', 'FL-DOE-89955', 'FL-SEN-general', 'FL-SEN-general--issue-B2', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89955-0ddd3f82', 'FL-DOE-89955', 'FL-SEN-general', 'FL-SEN-general--issue-B3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89955-08dd37a3', 'FL-DOE-89955', 'FL-SEN-general', 'FL-SEN-general--issue-B4', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-90009-0bdd3c5c', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B1', '', ARRAY['claim-FL-DOE-90009-6ded0d73','claim-FL-DOE-90009-fe8a4f5a','claim-FL-DOE-90009-efd73b28','claim-FL-DOE-90009-5ea5061a','claim-FL-DOE-90009-6e7bffe2','claim-FL-DOE-90009-a902cad9','claim-FL-DOE-90009-f4b683cb','claim-FL-DOE-90009-b77b5aaf','claim-FL-DOE-90009-2bd07199']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-0edd4115', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B2', '', ARRAY['claim-FL-DOE-90009-031885e7','claim-FL-DOE-90009-7dbc0909','claim-FL-DOE-90009-ef53aad4','claim-FL-DOE-90009-b8589e27','claim-FL-DOE-90009-e52ab2e1','claim-FL-DOE-90009-dfb412ee','claim-FL-DOE-90009-822c1970']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-0ddd3f82', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B3', '', ARRAY['claim-FL-DOE-90009-c755c8ac','claim-FL-DOE-90009-2946b926','claim-FL-DOE-90009-713459c1','claim-FL-DOE-90009-a5a4fe1d']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-08dd37a3', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B4', '', ARRAY['claim-FL-DOE-90009-21f5f369','claim-FL-DOE-90009-4812e7cb','claim-FL-DOE-90009-e639ecb8']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-9cd5d1da', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A2--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-95d4cba6','claim-FL-DOE-90009-c29b226f','claim-FL-DOE-90009-ecc86e76','claim-FL-DOE-90009-db635737','claim-FL-DOE-90009-e4e5a5f8','claim-FL-DOE-90009-15332d92','claim-FL-DOE-90009-05f08423','claim-FL-DOE-90009-6bcbf7f9']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-b4b28bc1', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV6--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-cec15b5f','claim-FL-DOE-90009-9673b2f6','claim-FL-DOE-90009-c1402562','claim-FL-DOE-90009-654c0799','claim-FL-DOE-90009-705b1a63']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-07dd3610', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B5--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-12914f1e']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-6c14946c', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV10--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-17e9a562','claim-FL-DOE-90009-0e87b8aa']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-98d5cb8e', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A6--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-9ddeab92','claim-FL-DOE-90009-45632a73']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-9bd5d047', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A1--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-119f8bed']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-b2b2889b', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV4--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-aed5ab8a','claim-FL-DOE-90009-cdcf1c29']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-b8b2920d', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV2--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-5fd1cbc7','claim-FL-DOE-90009-7b2f37c0','claim-FL-DOE-90009-dbe27f2a','claim-FL-DOE-90009-434ba8c5','claim-FL-DOE-90009-5817e032']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-14dd4a87', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B8--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-38c767ae','claim-FL-DOE-90009-b4ba5724','claim-FL-DOE-90009-73f24d47']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-b7b2907a', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-KYV3--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-3965c775']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-09dd3936', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-B7--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-cca08908','claim-FL-DOE-90009-02d8b1a0','claim-FL-DOE-90009-b7aff350','claim-FL-DOE-90009-4b7238a9','claim-FL-DOE-90009-80b4e644','claim-FL-DOE-90009-1806ef91','claim-FL-DOE-90009-150fb43e']::text[], true, 'stated'),
  ('pos-FL-DOE-90009-99d5cd21', 'FL-DOE-90009', 'FL-SEN-general', 'FL-SEN-general--issue-A7--FL-DOE-90009', '', ARRAY['claim-FL-DOE-90009-3df54ce4','claim-FL-DOE-90009-3e42621e','claim-FL-DOE-90009-f8d772d5','claim-FL-DOE-90009-91094050']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89119', 'FL-SEN-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-89955', 'FL-SEN-general', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], '{"word_count":0,"verifiable_fact_count":0,"stated_position_count":0,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":0}'::jsonb),
  ('FL-DOE-90009', 'FL-SEN-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-90009-6ded0d73','claim-FL-DOE-90009-95d4cba6','claim-FL-DOE-90009-cec15b5f','claim-FL-DOE-90009-c29b226f','claim-FL-DOE-90009-9673b2f6','claim-FL-DOE-90009-fe8a4f5a','claim-FL-DOE-90009-031885e7','claim-FL-DOE-90009-21f5f369','claim-FL-DOE-90009-7dbc0909','claim-FL-DOE-90009-ef53aad4','claim-FL-DOE-90009-12914f1e','claim-FL-DOE-90009-b8589e27','claim-FL-DOE-90009-efd73b28','claim-FL-DOE-90009-17e9a562','claim-FL-DOE-90009-9ddeab92','claim-FL-DOE-90009-0e87b8aa','claim-FL-DOE-90009-5ea5061a','claim-FL-DOE-90009-ecc86e76','claim-FL-DOE-90009-db635737','claim-FL-DOE-90009-c1402562','claim-FL-DOE-90009-e4e5a5f8','claim-FL-DOE-90009-654c0799','claim-FL-DOE-90009-15332d92','claim-FL-DOE-90009-705b1a63','claim-FL-DOE-90009-119f8bed','claim-FL-DOE-90009-aed5ab8a','claim-FL-DOE-90009-6e7bffe2','claim-FL-DOE-90009-a902cad9','claim-FL-DOE-90009-f4b683cb','claim-FL-DOE-90009-5fd1cbc7','claim-FL-DOE-90009-38c767ae','claim-FL-DOE-90009-7b2f37c0','claim-FL-DOE-90009-3965c775','claim-FL-DOE-90009-b77b5aaf','claim-FL-DOE-90009-c755c8ac','claim-FL-DOE-90009-cca08908','claim-FL-DOE-90009-02d8b1a0','claim-FL-DOE-90009-b7aff350','claim-FL-DOE-90009-2946b926','claim-FL-DOE-90009-713459c1','claim-FL-DOE-90009-4b7238a9','claim-FL-DOE-90009-80b4e644','claim-FL-DOE-90009-a5a4fe1d','claim-FL-DOE-90009-1806ef91','claim-FL-DOE-90009-2bd07199','claim-FL-DOE-90009-b4ba5724','claim-FL-DOE-90009-dbe27f2a','claim-FL-DOE-90009-73f24d47','claim-FL-DOE-90009-434ba8c5','claim-FL-DOE-90009-5817e032','claim-FL-DOE-90009-cdcf1c29','claim-FL-DOE-90009-3df54ce4','claim-FL-DOE-90009-3e42621e','claim-FL-DOE-90009-f8d772d5','claim-FL-DOE-90009-91094050','claim-FL-DOE-90009-e52ab2e1','claim-FL-DOE-90009-4812e7cb','claim-FL-DOE-90009-05f08423','claim-FL-DOE-90009-dfb412ee','claim-FL-DOE-90009-e639ecb8','claim-FL-DOE-90009-6bcbf7f9','claim-FL-DOE-90009-822c1970','claim-FL-DOE-90009-45632a73','claim-FL-DOE-90009-150fb43e']::text[], ARRAY[]::text[], '{"word_count":1593,"verifiable_fact_count":0,"stated_position_count":64,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":4}'::jsonb)
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
  WHERE r.race_id = 'FL-SEN-general' AND c.ballot_status = 'ballot'
    AND NOT EXISTS (SELECT 1 FROM profile p
                     WHERE p.candidate_id = c.candidate_id AND p.race_id = 'FL-SEN-general');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;
  END IF;
END $$;

COMMIT;

-- Next: run the Balance Audit (T10) for FL-SEN-general, then
-- set_race_publication once a human has read the brief.
