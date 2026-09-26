-- 0040_measure_resources_am2.sql
-- Seeds Amendment 2 (FL-AM2-general) resources from the row-by-row
-- verification in docs/general-election/measure-resources-verified-2026-09-24.md,
-- including its "Widened search, 2026-09-26" addendum (spec:
-- docs/superpowers/specs/2026-09-26-amendment-context-design.md §1), then
-- flips AM2's publication to `published` in the same file so the deferred
-- gate trigger (0034) checks it at commit. Modelled directly on
-- 0038_measure_resources_am3.sql -- same three-section shape, same
-- url_norm-subquery source_id, same self-auditing publish block.
--
-- ROW-BY-ROW DECISIONS (every AM2 candidate in the doc):
--
-- INCLUDED -- neutral (8, all official or reporting, per the
-- official/reporting=>neutral rule):
--   1. Florida Dept. of State, Division of Elections -- InitDetail seqnum=109
--      (official; primary_doc; opened, "Yes").
--   2. The Florida Senate, Committee on Finance and Tax -- Bill Analysis and
--      Fiscal Impact Statement for CS/SJR 318, 2025-04-16 (official;
--      primary_doc; opened, "Yes"; confirms the ~$31M/yr local-revenue
--      figure directly).
--   3. James Madison Institute -- 2026 Florida Amendment Guide (analysis;
--      describes AM2 factually with no recommendation, so it lands neutral
--      even though `analysis` may take any stance; opened, "Yes").
--   4. Spectrum News / MyNews13 (Jason Delgado) -- straight news quoting
--      both Rep. Alvarez and Rep. Eskamani without editorializing (reporting;
--      opened, "Yes").
--   5. Ag Information Network of the West (Haylie Shipp) -- straight news of
--      the legislative vote (reporting; opened, "Yes").
--   6. Bloomberg Tax -- "Florida Legislature Proposes Property Tax Exemption
--      Constitutional Amendment" (reporting). Paywalled past the lede on
--      2026-09-24; the widened search's browser pass on 2026-09-26 opened it
--      in full ("A short news brief, fully visible") -- now a verified read.
--   7. The Bradenton Times -- "Amendment 2: Agricultural Tangible Personal
--      Property Tax Exemption, Explained" (2026-09-12, Dawn Kitterman)
--      (reporting). HTTP 403 to the fetcher on 2026-09-24; opened in a real
--      browser on 2026-09-26 ("An explainer").
--   8. WKRG (WMBB reporting, Peyton Gay) -- "New amendment aims to cut costs
--      for Florida farms," 2026-09-19 (reporting). This is the syndicated
--      copy of the WFLA story, opened on 2026-09-26 through a different
--      entry point after WFLA's own page stayed blocked. Per the brief, the
--      WKRG URL is used and the WFLA original is excluded (see below).
--
-- INCLUDED -- support (5, one row per organisation, argument/commentary/
-- analysis all landing `support`):
--   1. Florida Farm Bureau Federation -- floridafarmbureau.org/yeson2/, "Vote
--      YES on Amendment 2" (argument). The widened search surfaced this as a
--      second, fuller Farm Bureau page (four stated reasons) alongside the
--      one already verified on 2026-09-24 (/news/vote-yes-on-amendment-2/).
--      Per the new one-row-per-organisation-per-side rule, only the fullest
--      page is kept; the shorter news post is excluded (see below).
--   2. Florida TaxWatch -- "The Florida Taxpayer's Guide for the 2026
--      Constitutional Amendments," 2026-09-17 (analysis; recommends YES).
--   3. Florida Dept. of Agriculture & Consumer Services / Commissioner
--      Wilton Simpson -- 2024-01-08 press release (argument; his own
--      statement).
--   4. Tampa Bay Times "Viewpoints" (opinion column, Danny Alvarez and Pat
--      Durden) -- "Vote yes on Amendment 2 for Florida's farmers, food
--      security and landscape," 2026-09-23 (argument). Paywalled past the
--      lede on 2026-09-24; the widened search's browser pass opened the
--      full 21-paragraph column on 2026-09-26.
--   5. Palm Beach Examiner (Substack, Karl Dickey) -- "Stop Paying Rent to
--      the State: How Florida Amendments 1, 2, and 3 Cut Your Taxes,"
--      2026-08-07 (commentary; support).
--
-- INCLUDED -- oppose (4, one row per organisation/individual):
--   1. Rep. Dr. Anna V. Eskamani -- signed "Explanation of Vote for Sequence
--      Number 256," House Journal No. 31, April 25, 2025 (argument; her own
--      reasons: the ~$30M local-government hit with no anti-windfall
--      guardrails, and that the benefit accrues mostly to large
--      agribusiness). Found by the widened search's House/Senate Journal
--      pass. Publisher is "Florida House of Representatives" and
--      source.type is `primary_doc`, but the resource's own `kind` is
--      `argument`, not `official` -- this is deliberate (spec §1): a
--      legislator's signed floor explanation is her own case, not the
--      chamber's institutional position, and scripts/verify-measure-resources.ts
--      only flags `official` paired with a non-primary_doc source, so an
--      `argument` row on a primary_doc source raises no advisory finding.
--      This is also the ONLY NO-side reasoning found anywhere for AM2 in
--      either search pass; a floor-debate quote with the same substance
--      (mynews13.com, floridapolitics.com) exists solely inside news
--      reporting, never in Eskamani's own release or social account, so it
--      is not used as a second row for her (see "Not used as rows" below).
--   2. Florida Education Association -- feaweb.org voter toolkit, "OPPOSED
--      BY FEA" (argument; a bare position listing, no reasoning given, but
--      still FEA's own stated position on its own page).
--   3. League of Women Voters of Florida -- lwvfl.org Vote411 synopsis PDF,
--      "Vote411 Voter Guide -- Florida Proposed Amendments" (argument; like
--      FEA, a bare position listing -- "Opponents Florida Education
--      Association, LWV of Florida" -- with no reasoning given, but still
--      LWV's own document naming its own opposition to this amendment).
--      Founder call D2, 2026-09-26: an organisation's own "opposed" listing
--      counts consistently as an argument/oppose row whether it is FEA's or
--      LWV's -- so this is INCLUDED, reversing the EXCLUDE call the prior
--      pass made for this same PDF.
--   4. Amanda Informed (Substack) -- "Three Amendments, Three Reasons to
--      Vote No," 2026-09-23 (commentary; oppose).
--
-- EXCLUDED -- not a verified open, or excluded by rule, even though the doc
-- discusses them:
--   - WFLA (Nexstar) -- "New amendment aims to cut costs for Florida farms."
--     403 to the fetcher on 2026-09-24 AND to the widened search's real
--     browser pass on 2026-09-26 ("Access to this page has been denied").
--     Never an independently verified read; the WKRG syndicated copy above
--     is used instead, per the brief's explicit call.
--   - Florida Farm Bureau's shorter news post
--     (floridafarmbureau.org/news/vote-yes-on-amendment-2/) -- superseded by
--     the fuller /yeson2/ page above under the one-row-per-organisation rule
--     (spec §1's "new" rule); this stops one voice filling two rows on the
--     same side.
--   - sisusari Substack ("Florida Amendment 2: who exactly gets...") --
--     doc's own caveat: "reads as an undecided/skeptical piece, not a clean
--     oppose case." Excluded as uncertain stance, per spec §1's inclusion
--     rule.
--   - floridapolitics.com legislative-vote piece -- HTTP 402 paywall, never
--     opened (widened search, row 4); not a verified read.
--   - Rep. Eskamani's floor-debate quote as reported by mynews13.com /
--     floridapolitics.com (widened search, row 5) -- "not a row: quote
--     exists only inside news coverage... no primary Eskamani statement,
--     release, or social post... was found." Her House Journal vote
--     explanation (included above) is the verified primary-source version
--     of the same case.
--   - flcities.com/propertytaxes and noto2.org -- widened-search dead ends:
--     the first covers Amendment 3 only and never mentions AM2, the second
--     is the unrelated 2024 hunting/fishing "Amendment 2." Neither is usable
--     as an AM2 row.
--   - The wide "Groups checked, nothing found" list (Florida Cattlemen's,
--     FNGLA, Florida Citrus Mutual, UF/IFAS Extension, Florida Policy
--     Institute, newspaper editorial boards, and 20+ others) -- no own-words
--     AM2 material located for any of them in the widened search; nothing to
--     seed.
--
-- INCLUDED: 17 new rows, all independently opened/confirmed, unambiguous
-- kind/stance.
--   support = 5 (Florida Farm Bureau /yeson2/; Florida TaxWatch; FDACS/
--              Wilton Simpson; Tampa Bay Times "Viewpoints"; Palm Beach
--              Examiner Substack)
--   oppose  = 4 (Eskamani House Journal vote explanation; FEA voter toolkit;
--              LWV Florida Vote411 PDF; Amanda Informed Substack)
--   neutral = 8 (2 official, 1 analysis, 5 reporting)
-- Gate (0034 §4 / spec §1): both sides present, larger(5) <= 2 x smaller(4)
-- = 8 -- passes.
--
-- Counts (support / oppose / non-neutral total): 5 / 4 / 9. Plus the 8
-- neutral rows here and the pre-existing FL-AM2-general:booklet row (0035),
-- anon reads 18 FL-AM2-general resource rows once published.
--
-- SOURCE TYPE / LEAN CONVENTIONS (same as 0038): `type` is source.type's
-- coarse 4-value CHECK, not the ladder's `kind`. The two `official` rows use
-- type='primary_doc' (DoS InitDetail, Senate Finance & Tax analysis); the
-- Eskamani row ALSO uses type='primary_doc' (it is a House Journal record)
-- but kind='argument', which is allowed (see above). Everything else is an
-- organisation or newsroom making its own case or reporting -- type=
-- 'opinion' for a stated position (argument/commentary/analysis kind),
-- type='factual_reporting' for straight news (reporting kind). `lean_tag` is
-- 'N/A' only for the three primary-document rows (0035's convention); every
-- other row is 'unrated' -- no lean or organisation category is assigned to
-- anyone here (spec §11 is a future, separate registry).
--
-- `note` is attribution only (who they are), never a summary of their
-- argument -- checked against scripts/verify-measure-resources.ts's own
-- heuristic (flags "would"/"will"/"means"/"because").
--
-- url_norm follows src/lib/brief-rows.ts's urlNorm(). Checked before
-- writing: `grep` across supabase/migrations/*.sql found no existing source
-- row for any of the 17 URLs below, so each gets a fresh source_id here --
-- but a LIVE database may already hold a source row for one of these URLs
-- with a DIFFERENT source_id than the ones minted below. Section (2) never
-- writes the literal 'src_...' id into measure_resource -- it resolves
-- `(SELECT source_id FROM source WHERE url_norm = '...')` at insert time, so
-- ON CONFLICT (url_norm) DO NOTHING in section (1) losing to a pre-existing
-- row still leaves section (2) pointing at the row that actually won.
--
-- Idempotent: source rows ON CONFLICT (url_norm) DO NOTHING, measure_resource
-- rows ON CONFLICT (measure_id, source_id) DO UPDATE, and the publication
-- flip is an UPSERT that only raises status, never lowers it.

-- (1) Sources -- one row per outside resource, keyed by url_norm.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_dos_init_detail_am2',
   'https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=109',
   'constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=109',
   'Florida Dept. of State, Division of Elections', 'primary_doc', 'N/A'),
  ('src_flsenate_finance_tax_analysis_am2',
   'https://www.flsenate.gov/Session/Bill/2025/318/Analyses/2025s00318.ft.PDF',
   'www.flsenate.gov/Session/Bill/2025/318/Analyses/2025s00318.ft.PDF',
   'The Florida Senate, Committee on Finance and Tax', 'primary_doc', 'N/A'),
  ('src_jmi_amendment_guide_am2',
   'https://jamesmadison.org/2026-florida-amendment-guide/',
   'jamesmadison.org/2026-florida-amendment-guide',
   'James Madison Institute', 'opinion', 'unrated'),
  ('src_mynews13_am2',
   'https://mynews13.com/fl/orlando/news/2026/04/09/floridians-to-vote-on-amendment-on-tangible-property-tax-for-agricultural-businesses',
   'mynews13.com/fl/orlando/news/2026/04/09/floridians-to-vote-on-amendment-on-tangible-property-tax-for-agricultural-businesses',
   'Spectrum News / MyNews13', 'factual_reporting', 'unrated'),
  ('src_aginfo_am2',
   'https://www.aginfo.net/report/62493/Southeast-Regional-Ag-News/Florida-Voters-to-Decide-on-Agricultural-Tax-Break-in-2026',
   'www.aginfo.net/report/62493/Southeast-Regional-Ag-News/Florida-Voters-to-Decide-on-Agricultural-Tax-Break-in-2026',
   'Ag Information Network of the West', 'factual_reporting', 'unrated'),
  ('src_bloombergtax_am2',
   'https://news.bloombergtax.com/daily-tax-report-international/florida-legislature-proposes-property-tax-exemption-constitutional-amendment',
   'news.bloombergtax.com/daily-tax-report-international/florida-legislature-proposes-property-tax-exemption-constitutional-amendment',
   'Bloomberg Tax', 'factual_reporting', 'unrated'),
  ('src_bradentontimes_am2_explainer',
   'https://thebradentontimes.com/stories/2026-constitutional-amendment-2-agricultural-tangible-personal-property-tax-exemption,212219',
   'thebradentontimes.com/stories/2026-constitutional-amendment-2-agricultural-tangible-personal-property-tax-exemption,212219',
   'The Bradenton Times', 'factual_reporting', 'unrated'),
  ('src_wkrg_farm_story_am2',
   'https://www.wkrg.com/news/new-amendment-aims-to-cut-costs-for-florida-farms/',
   'www.wkrg.com/news/new-amendment-aims-to-cut-costs-for-florida-farms',
   'WKRG', 'factual_reporting', 'unrated'),
  ('src_farmbureau_yeson2',
   'https://floridafarmbureau.org/yeson2/',
   'floridafarmbureau.org/yeson2',
   'Florida Farm Bureau Federation', 'opinion', 'unrated'),
  ('src_taxwatch_guide_2026',
   'https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/',
   'floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments',
   'Florida TaxWatch', 'opinion', 'unrated'),
  ('src_fdacs_simpson_statement_am2',
   'https://www.fdacs.gov/News-Events/Press-Releases/2024-Press-Releases/Constitutional-Amendment-Proposed-to-Support-Florida-Agriculture-by-Eliminating-Multiple-Taxation-of-Agricultural-Production',
   'www.fdacs.gov/News-Events/Press-Releases/2024-Press-Releases/Constitutional-Amendment-Proposed-to-Support-Florida-Agriculture-by-Eliminating-Multiple-Taxation-of-Agricultural-Production',
   'Florida Dept. of Agriculture & Consumer Services', 'opinion', 'unrated'),
  ('src_tampabay_times_am2_column',
   'https://www.tampabay.com/viewpoints/2026/09/23/florida-amendment-farm-equipment-tangible-tax/',
   'www.tampabay.com/viewpoints/2026/09/23/florida-amendment-farm-equipment-tangible-tax',
   'Tampa Bay Times', 'opinion', 'unrated'),
  ('src_palmbeachexaminer_am2',
   'https://palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how',
   'palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how',
   'Palm Beach Examiner (Substack)', 'opinion', 'unrated'),
  -- `#page=155` deep-links the reader straight to her signed explanation
  -- inside the bound journal PDF; urlNorm() (src/lib/brief-rows.ts) drops
  -- the fragment, so url_norm below is unaffected and still matches the
  -- plain journal URL.
  ('src_eskamani_vote_explanation',
   'https://www.flhouse.gov/Sections/Documents/loaddoc.aspx?PublicationType=Session&DocumentType=Journals&Session=2025&FileName=Bound_House%20Journal%20No.31,%20April%2025,%202025%20(Friday).pdf#page=155',
   'www.flhouse.gov/Sections/Documents/loaddoc.aspx?PublicationType=Session&DocumentType=Journals&Session=2025&FileName=Bound_House%20Journal%20No.31,%20April%2025,%202025%20(Friday).pdf',
   'Florida House of Representatives', 'primary_doc', 'N/A'),
  ('src_fea_voter_toolkit',
   'https://feaweb.org/action-center/voter-toolkit/',
   'feaweb.org/action-center/voter-toolkit',
   'Florida Education Association', 'opinion', 'unrated'),
  ('src_lwvfl_vote411_synopsis_am2',
   'https://www.lwvfl.org/wp-content/uploads/2026-State-Amendments-Synopses-English-from-Vote411-1.pdf',
   'www.lwvfl.org/wp-content/uploads/2026-State-Amendments-Synopses-English-from-Vote411-1.pdf',
   'League of Women Voters of Florida', 'opinion', 'unrated'),
  ('src_amandainformed_am2',
   'https://amandainformed.substack.com/p/three-amendments-three-reasons-to',
   'amandainformed.substack.com/p/three-amendments-three-reasons-to',
   'Amanda Informed (Substack)', 'opinion', 'unrated')
ON CONFLICT (url_norm) DO NOTHING;

-- (2) Resources -- one row per source, scoped to FL-AM2-general.
INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM2-general:dos-init-detail', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=109'),
   'neutral', 'official', 'document',
   'EXEMPTION OF TANGIBLE PERSONAL PROPERTY ON AGRICULTURAL LAND FROM TAXATION', NULL, NULL, NULL,
   'Division of Elections'' amendment database record', 1),

  ('FL-AM2-general:flsenate-finance-tax-analysis', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.flsenate.gov/Session/Bill/2025/318/Analyses/2025s00318.ft.PDF'),
   'neutral', 'official', 'document',
   'BILL ANALYSIS AND FISCAL IMPACT STATEMENT', NULL, '2025-04-16', NULL,
   'Senate Finance and Tax Committee staff analysis of CS/SJR 318', 2),

  ('FL-AM2-general:jmi-amendment-guide', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'jamesmadison.org/2026-florida-amendment-guide'),
   'neutral', 'analysis', 'article',
   '2026 Florida Amendment Guide', NULL, '2026-09-21', NULL,
   'James Madison Institute''s own guide page', 3),

  ('FL-AM2-general:mynews13-report', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'mynews13.com/fl/orlando/news/2026/04/09/floridians-to-vote-on-amendment-on-tangible-property-tax-for-agricultural-businesses'),
   'neutral', 'reporting', 'article',
   'Floridians to vote on amendment on tangible property tax for agricultural businesses', 'Jason Delgado', '2026-04-09', NULL,
   NULL, 4),

  ('FL-AM2-general:aginfo-report', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.aginfo.net/report/62493/Southeast-Regional-Ag-News/Florida-Voters-to-Decide-on-Agricultural-Tax-Break-in-2026'),
   'neutral', 'reporting', 'article',
   'Florida Voters to Decide on Agricultural Tax Break in 2026', 'Haylie Shipp', '2025-05-07', NULL,
   NULL, 5),

  ('FL-AM2-general:bloombergtax-brief', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'news.bloombergtax.com/daily-tax-report-international/florida-legislature-proposes-property-tax-exemption-constitutional-amendment'),
   'neutral', 'reporting', 'article',
   'Florida Legislature Proposes Property Tax Exemption Constitutional Amendment', 'Bloomberg Tax Automation', '2025-07-09', NULL,
   NULL, 6),

  ('FL-AM2-general:bradentontimes-explainer', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'thebradentontimes.com/stories/2026-constitutional-amendment-2-agricultural-tangible-personal-property-tax-exemption,212219'),
   'neutral', 'reporting', 'article',
   'Amendment 2: Agricultural Tangible Personal Property Tax Exemption, Explained', 'Dawn Kitterman', '2026-09-12', NULL,
   NULL, 7),

  ('FL-AM2-general:wkrg-farm-story', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.wkrg.com/news/new-amendment-aims-to-cut-costs-for-florida-farms'),
   'neutral', 'reporting', 'article',
   'New amendment aims to cut costs for Florida farms', 'Peyton Gay', '2026-09-19', NULL,
   'WMBB reporting, syndicated copy (the WFLA original stayed blocked)', 8),

  ('FL-AM2-general:farmbureau-yeson2', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'floridafarmbureau.org/yeson2'),
   'support', 'argument', 'article',
   'Vote YES on Amendment 2', NULL, NULL, NULL,
   'Florida Farm Bureau Federation''s own campaign page', 1),

  ('FL-AM2-general:taxwatch-guide-2026', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments'),
   'support', 'analysis', 'document',
   'The Florida Taxpayer''s Guide for the 2026 Constitutional Amendments', NULL, '2026-09-17', NULL,
   NULL, 2),

  ('FL-AM2-general:fdacs-simpson-statement', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.fdacs.gov/News-Events/Press-Releases/2024-Press-Releases/Constitutional-Amendment-Proposed-to-Support-Florida-Agriculture-by-Eliminating-Multiple-Taxation-of-Agricultural-Production'),
   'support', 'argument', 'article',
   'Constitutional Amendment Proposed to Support Florida Agriculture by Eliminating Multiple Taxation of Agricultural Production', 'Commissioner Wilton Simpson', '2024-01-08', NULL,
   NULL, 3),

  ('FL-AM2-general:tampabay-times-column', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.tampabay.com/viewpoints/2026/09/23/florida-amendment-farm-equipment-tangible-tax'),
   'support', 'argument', 'article',
   'Vote yes on Amendment 2 for Florida''s farmers, food security and landscape', 'Danny Alvarez and Pat Durden', '2026-09-23', NULL,
   'Tampa Bay Times ''Viewpoints'' opinion column', 4),

  ('FL-AM2-general:palmbeachexaminer', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how'),
   'support', 'commentary', 'article',
   'Stop Paying Rent to the State: How Florida Amendments 1, 2, and 3 Cut Your Taxes', 'Karl Dickey', '2026-08-07', NULL,
   NULL, 5),

  ('FL-AM2-general:eskamani-vote-explanation', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.flhouse.gov/Sections/Documents/loaddoc.aspx?PublicationType=Session&DocumentType=Journals&Session=2025&FileName=Bound_House%20Journal%20No.31,%20April%2025,%202025%20(Friday).pdf'),
   'oppose', 'argument', 'document',
   'Explanation of Vote for Sequence Number 256', 'Rep. Anna V. Eskamani', '2025-04-25', NULL,
   'Signed vote explanation, House Journal, April 25, 2025', 1),

  ('FL-AM2-general:fea-voter-toolkit', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'feaweb.org/action-center/voter-toolkit'),
   'oppose', 'argument', 'document',
   'Constitutional Amendments', NULL, NULL, NULL,
   'Florida Education Association''s own voter toolkit, listing itself as opposed', 2),

  ('FL-AM2-general:lwvfl-vote411-synopsis', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.lwvfl.org/wp-content/uploads/2026-State-Amendments-Synopses-English-from-Vote411-1.pdf'),
   'oppose', 'argument', 'document',
   'Vote411 Voter Guide - Florida Proposed Amendments', NULL, NULL, NULL,
   'League of Women Voters of Florida''s own Vote411 synopsis, listing itself as opposed', 3),

  ('FL-AM2-general:amandainformed', 'FL-AM2-general',
   (SELECT source_id FROM source WHERE url_norm = 'amandainformed.substack.com/p/three-amendments-three-reasons-to'),
   'oppose', 'commentary', 'article',
   'Three Amendments, Three Reasons to Vote No', 'Amanda Informed', '2026-09-23', NULL,
   NULL, 4)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;

-- (3) Publish, with its admin_action audit row written in the SAME statement.
--     Both sides are present (5 support, 4 oppose; 5 <= 2x4) so 0034's
--     trg_measure_balance accepts this. AM1 and AM3 are untouched here.
--
--     Same pattern as 0038: a CTE reads the prior status before the UPSERT
--     applies, and the admin_action row is written only when status
--     actually changes, so a second run of this file -- where AM2 is
--     already `published` -- flips nothing and logs nothing.
WITH prior AS (
  SELECT status FROM measure_publication WHERE measure_id = 'FL-AM2-general'
), upserted AS (
  INSERT INTO measure_publication (measure_id, status, published_at, note)
  VALUES (
    'FL-AM2-general', 'published', now(),
    'Amendment 2 resources seeded from row-by-row verification, 2026-09-26 (0040). '
    'AM1 remains listed; AM3 was already published by 0038.'
  )
  ON CONFLICT (measure_id) DO UPDATE SET
    status = 'published',
    published_at = COALESCE(measure_publication.published_at, EXCLUDED.published_at),
    note = EXCLUDED.note
  RETURNING measure_id, status
), logged AS (
  INSERT INTO admin_action (actor, action, subject_kind, subject_ref, detail)
  SELECT 'founder', 'publish', 'measure_publication', u.measure_id,
         jsonb_build_object(
           'prior_status', p.status,
           'new_status',   u.status,
           'reason',       'Amendment 2 resources seeded from row-by-row verification, 2026-09-26 (0040)'
         )
    FROM upserted u
    LEFT JOIN prior p ON true
   WHERE p.status IS DISTINCT FROM u.status
  RETURNING 1
)
SELECT 1;
