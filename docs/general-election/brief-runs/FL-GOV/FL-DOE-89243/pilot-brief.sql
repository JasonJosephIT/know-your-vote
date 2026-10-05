-- Brief rows for FL-GOV-general, built by scripts/brief-rows-sql.ts.
-- Generated from 1 policy run(s). Review before applying.
--
-- 8 source, 18 issue, 70 claim, 18 position, 1 profile rows.
-- Passages that produced no row: {"states_no_policy":150,"no_issue_matched":18}
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
  ('src-8acc6b0f', 'https://davidjolly.com/issues', 'davidjolly.com/issues', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z'),
  ('src-741c1875', 'https://davidjolly.com/issues/republicans-for-jolly', 'davidjolly.com/issues/republicans-for-jolly', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z'),
  ('src-873b9a10', 'https://davidjolly.com/issues/affordability', 'davidjolly.com/issues/affordability', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z'),
  ('src-f0fe3a60', 'https://davidjolly.com/issues/health-care', 'davidjolly.com/issues/health-care', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z'),
  ('src-a2ed7192', 'https://davidjolly.com/issues/public-education', 'davidjolly.com/issues/public-education', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z'),
  ('src-fb4f4893', 'https://davidjolly.com/issues/data-centers', 'davidjolly.com/issues/data-centers', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z'),
  ('src-5bbc9359', 'https://davidjolly.com/homeowners-insurance', 'davidjolly.com/homeowners-insurance', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z'),
  ('src-709b58d0', 'https://davidjolly.com/environment', 'davidjolly.com/environment', 'davidjolly.com', 'candidate_self', 'N/A', '2026-09-27T12:37:03Z')
ON CONFLICT (url_norm) DO NOTHING;

INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES
  ('FL-GOV-general--issue-A1', 'FL-GOV-general', 'spine', NULL, 'Property insurance costs', NULL, NULL, 1),
  ('FL-GOV-general--issue-A3', 'FL-GOV-general', 'spine', NULL, 'Property taxes', NULL, NULL, 2),
  ('FL-GOV-general--issue-A2', 'FL-GOV-general', 'spine', NULL, 'Housing affordability', NULL, NULL, 3),
  ('FL-GOV-general--issue-A4', 'FL-GOV-general', 'spine', NULL, 'Cost of living in Florida', NULL, NULL, 4),
  ('FL-GOV-general--issue-KYV8--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Condominium and HOA costs', NULL, NULL, 100),
  ('FL-GOV-general--issue-A6--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Public school funding and teachers', NULL, NULL, 101),
  ('FL-GOV-general--issue-KYV9--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'School choice and vouchers', NULL, NULL, 102),
  ('FL-GOV-general--issue-B1--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Economy, inflation, and jobs', NULL, NULL, 103),
  ('FL-GOV-general--issue-B5--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Abortion policy', NULL, NULL, 104),
  ('FL-GOV-general--issue-KYV10--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Career, vocational and higher education', NULL, NULL, 105),
  ('FL-GOV-general--issue-KYV2--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Energy and utilities', NULL, NULL, 106),
  ('FL-GOV-general--issue-A7--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Elections administration and voting access', NULL, NULL, 107),
  ('FL-GOV-general--issue-B7--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Crime policy, policing and courts', NULL, NULL, 108),
  ('FL-GOV-general--issue-B2--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Healthcare access and costs', NULL, NULL, 109),
  ('FL-GOV-general--issue-KYV6--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Renters and evictions', NULL, NULL, 110),
  ('FL-GOV-general--issue-KYV3--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Growth, development and land conservation', NULL, NULL, 111),
  ('FL-GOV-general--issue-KYV5--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Water supply and drinking water', NULL, NULL, 112),
  ('FL-GOV-general--issue-KYV4--FL-DOE-89243', 'FL-GOV-general', 'candidate', 'FL-DOE-89243', 'Storm resilience and flood protection', NULL, NULL, 113)
;

INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES
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
  ('claim-FL-DOE-89243-71b93011', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Government doesn''t have to run everything to make people''s lives better. Businesses, entrepreneurs, workers and communities create growth and opportunity. Government should create the conditions for that to happen. But when a market is clearly failing Floridians, the answer cannot simply be to watch it fail. David''s housing and insurance proposals include public-private approaches and government intervention where Florida''s insurance market is no longer delivering affordable outcomes.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-21cb41df', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', 'Limited government doesn''t have to mean ineffective government. Floridians pay taxes and expect basic institutions to function. Schools should work. Roads and infrastructure should work. Insurance markets should work. Health care should be accessible. Public safety should work. And when something isn''t working, government should be willing to fix it rather than defend a broken system because the solution doesn''t fit neatly inside an ideological box.', 'stated_position', true, NULL, NULL, 'single_source'),
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
  ('claim-FL-DOE-89243-27605688', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'A moratorium on hyperscale data centers, issued on day one.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-c5afbc8d', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', 'A moratorium on hyperscale data centers, issued on day one.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-010a026a', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'David Jolly and Gwen Graham have proposed an immediate moratorium on the construction of hyperscale data centers in Florida, and David says they would issue it on their first day in office. His reasons are the strain on Florida''s water, power, and natural resources; what these facilities do to the neighborhoods and property values around them; and serious questions about the long term economic payoff that he says have yet to be answered. He also says voters across Florida are telling their leaders they do not want data centers, and that leaders should listen.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-34e1e2ab', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', 'David Jolly and Gwen Graham have proposed an immediate moratorium on the construction of hyperscale data centers in Florida, and David says they would issue it on their first day in office. His reasons are the strain on Florida''s water, power, and natural resources; what these facilities do to the neighborhoods and property values around them; and serious questions about the long term economic payoff that he says have yet to be answered. He also says voters across Florida are telling their leaders they do not want data centers, and that leaders should listen.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-3ceb5bd6', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Those are David Jolly''s words, and he does not hedge them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-924a84af', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', 'Those are David Jolly''s words, and he does not hedge them.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-a59fb557', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', '“Gwen and I have proposed an immediate moratorium on the construction of hyperscale data centers in the state of Florida, and it''s for several reasons.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-fd9d6f12', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', '“Gwen and I have proposed an immediate moratorium on the construction of hyperscale data centers in the state of Florida, and it''s for several reasons.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-df98d11d', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Water and power. Neighborhoods. An economic promise nobody has proven. And one more reason that politicians in Tallahassee tend to forget: the people who live here are saying no.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-0e7eadf0', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', 'Water and power. Neighborhoods. An economic promise nobody has proven. And one more reason that politicians in Tallahassee tend to forget: the people who live here are saying no.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-1d4951dd', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', 'David calls Florida''s aquifer already strained. His position is that you need to find out what a project like that does to the water before you build it, not after.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-d518a667', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV5--FL-DOE-89243', 'David calls Florida''s aquifer already strained. His position is that you need to find out what a project like that does to the water before you build it, not after.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-584ffab1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', '“Gwen and I are going to lead the state in an area of environmental protection, of economic integrity, of community resilience, but we''re also going to listen to voters who right now are telling us don''t build data centers in the state of Florida.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-3bca43c4', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', '“Gwen and I are going to lead the state in an area of environmental protection, of economic integrity, of community resilience, but we''re also going to listen to voters who right now are telling us don''t build data centers in the state of Florida.”', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-697d6a2e', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Floridians pay the highest home insurance prices in America because every family is made to pay a private insurer to carry hurricane risk. Jolly''s proposal moves that risk into one strong, state-backed fund. Here is how it works, what it costs, and what it saves.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-863e97d1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Hurricane and wind risk makes up 60 to 70 percent of a Florida homeowners insurance bill. David Jolly''s plan creates one strong, state-backed hurricane fund to carry that risk, so private insurers no longer have to price it into your policy. The fund is built to a financially sound level and backed by reinsurance before it covers anyone, and it is paid for by making insurance companies pay the taxes they currently avoid, along with other revenue that does not put the burden back on homeowners. Based on Insure.com''s Florida calculator, that is the difference between $7,136 a year and $2,557 for a $300,000 home: about $4,500 a year, a 64 percent savings.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-a9c875e8', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'And the rule that governs all of it: the costs will be lower for Floridians, or we won''t do it.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-c2ec4232', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Instead of forcing every Florida family to pay a private insurer to take on that enormous hurricane risk, Jolly''s proposal does four things, in order.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-075197df', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'Private insurers no longer have to price hurricane risk into your policy. That is where the 60 to 70 percent savings comes from. The rest of your policy stays private, competitive, and priced the way policies are in other states.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-0083b242', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', 'And in the end, the costs will be lower for Floridians, or we won''t do it. Simple as that.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-6c726d36', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'David Jolly believes protecting Florida''s environment is essential to the state''s economy and quality of life. His plan calls for real investments in environmental protection, accelerated clean and renewable energy integration into Florida''s utility system, sustained funding for coastal resiliency and water quality improvements, and honest climate planning in state policy. David sees environmental protection as protecting what makes Florida successful: the tourism economy, clean beaches, healthy waters, and the natural beauty that families depend on every day.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-bc1b218a', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Jolly''s position is to unleash clean and renewable energies across Florida, requiring greater integration of clean energy technologies into public utilities. This means stronger net metering rules to support rooftop solar and accelerated utility-scale renewable buildout. Florida is projected to receive $62.7 billion in IRA-funded clean power investment by 2030.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-4196e482', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', 'Coastal Floridians face the most direct climate exposure: rising sea levels, more intense hurricanes, and accelerating beach erosion. David Jolly''s plan calls for wiser coastal development practices and sustained investment in resiliency, which means living shorelines and hybrid systems, seawalls where necessary and appropriate, raised infrastructure, beach renourishment where cost-effective and sustainable, stormwater drainage upgrades, and building code modernization in coastal counties.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-aab6d665', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-89243', 'Coastal Floridians face the most direct climate exposure: rising sea levels, more intense hurricanes, and accelerating beach erosion. David Jolly''s plan calls for wiser coastal development practices and sustained investment in resiliency, which means living shorelines and hybrid systems, seawalls where necessary and appropriate, raised infrastructure, beach renourishment where cost-effective and sustainable, stormwater drainage upgrades, and building code modernization in coastal counties.', 'stated_position', true, NULL, NULL, 'single_source'),
  ('claim-FL-DOE-89243-9611db5f', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', 'Jolly''s clean energy position would require greater integration of renewables into Florida''s utility planning. That likely means stronger net metering rules to support rooftop solar and accelerated utility-scale renewable buildout, pushing FPL and other utilities to expand renewable generation.', 'stated_position', true, NULL, NULL, 'single_source')
;

-- Resolved by url_norm, not by the source_id above, so a claim binds to the
-- row that actually won the ON CONFLICT. No source, no claim_source, and
-- briefs.ts inner-joins claim_source — so such a claim would never render.
INSERT INTO claim_source (claim_id, source_id)
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
  SELECT 'claim-FL-DOE-89243-71b93011', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/republicans-for-jolly'
UNION ALL
  SELECT 'claim-FL-DOE-89243-21cb41df', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/republicans-for-jolly'
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
  SELECT 'claim-FL-DOE-89243-27605688', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-c5afbc8d', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-010a026a', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-34e1e2ab', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-3ceb5bd6', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-924a84af', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-a59fb557', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-fd9d6f12', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-df98d11d', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-0e7eadf0', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-1d4951dd', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-d518a667', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-584ffab1', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
UNION ALL
  SELECT 'claim-FL-DOE-89243-3bca43c4', source_id FROM source WHERE url_norm = 'davidjolly.com/issues/data-centers'
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
  SELECT 'claim-FL-DOE-89243-6c726d36', source_id FROM source WHERE url_norm = 'davidjolly.com/environment'
UNION ALL
  SELECT 'claim-FL-DOE-89243-bc1b218a', source_id FROM source WHERE url_norm = 'davidjolly.com/environment'
UNION ALL
  SELECT 'claim-FL-DOE-89243-4196e482', source_id FROM source WHERE url_norm = 'davidjolly.com/environment'
UNION ALL
  SELECT 'claim-FL-DOE-89243-aab6d665', source_id FROM source WHERE url_norm = 'davidjolly.com/environment'
UNION ALL
  SELECT 'claim-FL-DOE-89243-9611db5f', source_id FROM source WHERE url_norm = 'davidjolly.com/environment'
;

INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES
  ('pos-FL-DOE-89243-9bd5d047', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A1', '', ARRAY['claim-FL-DOE-89243-1a75c9f6','claim-FL-DOE-89243-71b93011','claim-FL-DOE-89243-465fdfe4','claim-FL-DOE-89243-fafef46f','claim-FL-DOE-89243-697d6a2e','claim-FL-DOE-89243-863e97d1','claim-FL-DOE-89243-a9c875e8','claim-FL-DOE-89243-c2ec4232','claim-FL-DOE-89243-075197df','claim-FL-DOE-89243-0083b242']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-9dd5d36d', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A3', '', ARRAY[]::text[], false, 'no_stated_position_found'),
  ('pos-FL-DOE-89243-9cd5d1da', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A2', '', ARRAY['claim-FL-DOE-89243-e03d78d9','claim-FL-DOE-89243-e1da7e5b','claim-FL-DOE-89243-1a6ced69','claim-FL-DOE-89243-d453a07e','claim-FL-DOE-89243-70f4e354','claim-FL-DOE-89243-e345b517']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-96d5c868', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A4', '', ARRAY['claim-FL-DOE-89243-4f7fb113','claim-FL-DOE-89243-547f863d','claim-FL-DOE-89243-d010d03a','claim-FL-DOE-89243-a5c37184','claim-FL-DOE-89243-b019efe6']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-aeb2824f', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV8--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-c117b02e','claim-FL-DOE-89243-4b4c856c','claim-FL-DOE-89243-8824b2dd','claim-FL-DOE-89243-883aec3c']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-98d5cb8e', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A6--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-f65647a1','claim-FL-DOE-89243-2c578ebf','claim-FL-DOE-89243-258049c6','claim-FL-DOE-89243-25eefe94','claim-FL-DOE-89243-5020c1c0','claim-FL-DOE-89243-32775a74','claim-FL-DOE-89243-4fc3fa00']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-adb280bc', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV9--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-933b9fdf','claim-FL-DOE-89243-f68ba3c3']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-0bdd3c5c', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B1--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-1eb35ecb']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-07dd3610', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B5--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-169b726e']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-6c14946c', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV10--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-b4437ad2']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b8b2920d', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV2--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-2ad3d2c5','claim-FL-DOE-89243-85e3db16','claim-FL-DOE-89243-241bd399','claim-FL-DOE-89243-0548e5b1','claim-FL-DOE-89243-27605688','claim-FL-DOE-89243-010a026a','claim-FL-DOE-89243-3ceb5bd6','claim-FL-DOE-89243-a59fb557','claim-FL-DOE-89243-df98d11d','claim-FL-DOE-89243-584ffab1','claim-FL-DOE-89243-6c726d36','claim-FL-DOE-89243-bc1b218a','claim-FL-DOE-89243-9611db5f']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-99d5cd21', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-A7--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-85ef825f']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-09dd3936', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B7--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-734bca05']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-0edd4115', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-B2--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-d1823d54','claim-FL-DOE-89243-21cb41df','claim-FL-DOE-89243-d56ffe8c','claim-FL-DOE-89243-94f2d306','claim-FL-DOE-89243-bd60f899','claim-FL-DOE-89243-b0090273','claim-FL-DOE-89243-d997fcc3']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b4b28bc1', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV6--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-bc9ab697']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b7b2907a', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV3--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-c5afbc8d','claim-FL-DOE-89243-34e1e2ab','claim-FL-DOE-89243-924a84af','claim-FL-DOE-89243-fd9d6f12','claim-FL-DOE-89243-0e7eadf0','claim-FL-DOE-89243-1d4951dd','claim-FL-DOE-89243-3bca43c4','claim-FL-DOE-89243-4196e482']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b1b28708', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV5--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-d518a667']::text[], true, 'stated'),
  ('pos-FL-DOE-89243-b2b2889b', 'FL-DOE-89243', 'FL-GOV-general', 'FL-GOV-general--issue-KYV4--FL-DOE-89243', '', ARRAY['claim-FL-DOE-89243-aab6d665']::text[], true, 'stated')
;

-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)
-- and balance_audit_core derives verifiable_fact_count and
-- stated_position_count from their LENGTHS. They are not decoration.
-- audit is REPLACED, not merged: the new content has not been audited.
INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES
  ('FL-DOE-89243', 'FL-GOV-general', ARRAY[]::text[], ARRAY['claim-FL-DOE-89243-1a75c9f6','claim-FL-DOE-89243-e03d78d9','claim-FL-DOE-89243-4f7fb113','claim-FL-DOE-89243-c117b02e','claim-FL-DOE-89243-f65647a1','claim-FL-DOE-89243-933b9fdf','claim-FL-DOE-89243-1eb35ecb','claim-FL-DOE-89243-169b726e','claim-FL-DOE-89243-b4437ad2','claim-FL-DOE-89243-2ad3d2c5','claim-FL-DOE-89243-85ef825f','claim-FL-DOE-89243-734bca05','claim-FL-DOE-89243-d1823d54','claim-FL-DOE-89243-71b93011','claim-FL-DOE-89243-21cb41df','claim-FL-DOE-89243-465fdfe4','claim-FL-DOE-89243-e1da7e5b','claim-FL-DOE-89243-547f863d','claim-FL-DOE-89243-85e3db16','claim-FL-DOE-89243-4b4c856c','claim-FL-DOE-89243-fafef46f','claim-FL-DOE-89243-d010d03a','claim-FL-DOE-89243-241bd399','claim-FL-DOE-89243-1a6ced69','claim-FL-DOE-89243-d453a07e','claim-FL-DOE-89243-a5c37184','claim-FL-DOE-89243-bc9ab697','claim-FL-DOE-89243-8824b2dd','claim-FL-DOE-89243-70f4e354','claim-FL-DOE-89243-b019efe6','claim-FL-DOE-89243-0548e5b1','claim-FL-DOE-89243-e345b517','claim-FL-DOE-89243-883aec3c','claim-FL-DOE-89243-d56ffe8c','claim-FL-DOE-89243-94f2d306','claim-FL-DOE-89243-bd60f899','claim-FL-DOE-89243-b0090273','claim-FL-DOE-89243-d997fcc3','claim-FL-DOE-89243-2c578ebf','claim-FL-DOE-89243-258049c6','claim-FL-DOE-89243-25eefe94','claim-FL-DOE-89243-f68ba3c3','claim-FL-DOE-89243-5020c1c0','claim-FL-DOE-89243-32775a74','claim-FL-DOE-89243-4fc3fa00','claim-FL-DOE-89243-27605688','claim-FL-DOE-89243-c5afbc8d','claim-FL-DOE-89243-010a026a','claim-FL-DOE-89243-34e1e2ab','claim-FL-DOE-89243-3ceb5bd6','claim-FL-DOE-89243-924a84af','claim-FL-DOE-89243-a59fb557','claim-FL-DOE-89243-fd9d6f12','claim-FL-DOE-89243-df98d11d','claim-FL-DOE-89243-0e7eadf0','claim-FL-DOE-89243-1d4951dd','claim-FL-DOE-89243-d518a667','claim-FL-DOE-89243-584ffab1','claim-FL-DOE-89243-3bca43c4','claim-FL-DOE-89243-697d6a2e','claim-FL-DOE-89243-863e97d1','claim-FL-DOE-89243-a9c875e8','claim-FL-DOE-89243-c2ec4232','claim-FL-DOE-89243-075197df','claim-FL-DOE-89243-0083b242','claim-FL-DOE-89243-6c726d36','claim-FL-DOE-89243-bc1b218a','claim-FL-DOE-89243-4196e482','claim-FL-DOE-89243-aab6d665','claim-FL-DOE-89243-9611db5f']::text[], ARRAY[]::text[], '{"word_count":3867,"verifiable_fact_count":0,"stated_position_count":70,"fact_checks_performed":0,"spine_issue_count":4,"spine_issues_covered":3}'::jsonb)
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
