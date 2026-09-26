-- 0041_measure_neutral_listed.sql
-- (a) Widens the anon RLS policy on measure_resource so a NEUTRAL row
--     becomes readable as soon as its measure is `listed`, not only once it
--     is `published`. (b) Seeds Amendment 1's (FL-AM1-general) verified
--     neutral rows, in 0038/0040's source/resource style. AM1 itself stays
--     `listed` -- this file never touches measure_publication.
--
-- Spec: docs/superpowers/specs/2026-09-26-amendment-context-design.md §2.
-- Plan: docs/superpowers/plans/2026-09-26-amendment-context.md (Global
-- Constraints).
--
-- (a) WHY SIDED ROWS STAY GATED WHILE NEUTRAL ROWS OPEN EARLY: 0034's
-- symmetry rule (the 2x rule, spec §1) protects a *side* from being shown
-- alone or lopsidedly -- a page with 3 support links and 0 oppose links
-- would read as an endorsement. That risk lives entirely in `support` and
-- `oppose` rows. A `neutral` row takes no side by construction (the CHECK
-- `measure_resource_neutral_kinds` already restricts `official`/`reporting`
-- to `stance = 'neutral'`, and `measure_resource_sided_kinds` keeps
-- `argument`/`commentary` off it) -- an official record or a straight news
-- explainer cannot make a page one-sided no matter how many of them sit
-- under a `listed` measure with zero support and zero oppose rows. So the
-- policy opens the neutral half of the ladder the moment a measure is
-- listed (ballot text already public) and keeps the sided half locked
-- behind `published` (the balance trigger's own gate), unchanged.
--
-- (b) AM1 ROW-BY-ROW DECISIONS, every neutral candidate in
-- docs/general-election/measure-resources-verified-2026-09-24.md's
-- "Amendment 1" section (2026-09-24) plus its "Widened search, 2026-09-26"
-- addendum (spec §2's exact list: official records, JMI guide, and the news
-- rows that were opened):
--
-- INCLUDED -- neutral (9, all official/analysis/reporting per the
-- official/reporting=>neutral rule; JMI's `analysis` lands neutral on its
-- own content, same call as AM2's JMI row):
--   1. Florida Dept. of State, Division of Elections -- InitDetail
--      seqnum=108 (official; primary_doc; opened, "Yes", 2026-09-24 table
--      row 1).
--   2. The Florida Senate -- HJR 5019 bill page, Analyses tab (official;
--      primary_doc; opened, "Yes", row 2; lists the staff-analysis PDFs
--      rather than embedding one, so this is the bill page itself, not a
--      dated document -- published_at left NULL, same convention as the
--      DoS record).
--   3. Florida House of Representatives -- HJR 5019 bill-detail page
--      (official; primary_doc; opened, "Yes", row 3; text, vote history and
--      staff-analysis links).
--   4. James Madison Institute -- 2026 Florida Amendment Guide (analysis;
--      describes AM1's mechanics with no support/oppose recommendation
--      stated, so it lands neutral even though `analysis` may take any
--      stance; opened, "Yes", row 4; same source row 0040 already created
--      for AM2 -- resolved here by url_norm, not re-keyed).
--   5. WUSF / Gray Rohrer, News Service of Florida -- straight-news account
--      of DeSantis's and RPOF's positions (reporting; opened, "Yes", row 6).
--   6. CBS Miami / News Service of Florida -- explainer plus DeSantis's
--      opposition quote, straight news (reporting; opened, "Yes", row 7).
--   7. Ocala Gazette / Jim Turner & Jim Saunders, News Service of Florida --
--      balanced legislative-process story quoting both sides (reporting;
--      opened, "Yes", row 10).
--   8. WFLA (Nexstar) -- "DeSantis breaks with GOP over budget stabilization
--      amendment" (reporting). HTTP 403 to the fetcher on 2026-09-24 (row 8,
--      "only the search-result snippet was seen... do not treat as
--      verified"); opened in a real browser on 2026-09-26 ("Blocked pages
--      re-opened in a real browser" table: "Opened. A straight-news
--      article; it quotes RPOF chair Evan Power for and reports DeSantis
--      against.", TypeSafe done 0.93) -- now a verified read. The doc's
--      2026-09-24 row gave the date only "per search snippet" and flagged it
--      as unconfirmed; re-opened again here (browser tool, 2026-09-26) and
--      read off the page's own JSON-LD (`datePublished`), which gives
--      2026-09-16 (Eastern time), not the snippet's 2026-09-15 -- the
--      confirmed page date is used below, superseding the snippet.
--   9. The Bradenton Times -- "Amendment 1: Budget Stabilization Fund,
--      Explained" (2026-09-12) (reporting). HTTP 403 to the fetcher on
--      2026-09-24 (row 9, snippet only); opened in the same 2026-09-26
--      browser pass ("Opened. A balanced explainer ('advocates say...
--      critics argue...').", TypeSafe done 0.91).
--
-- Both rows' `note` columns are left NULL (0040's convention when nothing
-- beyond publisher/author needs stating): `note` renders to voters
-- (MeasureResourceRow) and is attribution only, never a place for our own
-- research provenance (how a page was opened, which fetch attempt 403'd) --
-- that story belongs here in the header, not on the row.
--
-- EXCLUDED -- every sided AM1 row, and everything not opened, even though
-- the doc discusses them (spec §2: seed ONLY the neutral rows; AM1's sided
-- rows are for a future migration):
--   - Florida TaxWatch (row 5, analysis/support), Amanda Informed Substack
--     (row 12, commentary/oppose), Palm Beach Examiner/Freedom Vanguard
--     Substack (row 13, commentary/support) -- all sided, out of scope here.
--   - Republican Party of Florida press release (widened search row 1,
--     argument/support), Florida Education Association voter toolkit
--     (widened search row 2, argument/oppose), League of Women Voters
--     Vote411 page (widened search row 3, argument/oppose) -- all sided,
--     out of scope here.
--   - Sparker's Soapbox (row 14) -- flagged in the doc's own Gaps/Verifier
--     notes as a stance/kind conflict (a neutral, both-sides explainer
--     filed under the spec's tier-5 NO cell) that "needs a founder call on
--     whether to drop it or reclassify it." Not a settled neutral row;
--     excluded pending that call.
--   - Creative Loafing Tampa (row 11) -- no AM1-specific URL confirmed; the
--     one article found doesn't mention Amendment 1/HJR 5019 at all.
--   - Florida Channel testimony clip (gap a), DeSantis's own
--     video/transcript (gap b), RPOF's own 2026 statement before the
--     widened search found its press release (gap c, now closed above),
--     LWV/Driskell primary statement (gap e) -- none located; not usable as
--     rows.
--   - Every entry in the widened search's "Groups checked, nothing found"
--     list (Florida Chamber, AIF, AFP-FL, Florida Retail Federation, NFIB
--     Florida, Florida Realtors, Florida Home Builders, AFSCME/SEIU
--     Florida, Florida Center for Fiscal and Economic Policy, Florida
--     Association of Counties, Florida Democratic Party and its caucuses,
--     newspaper editorial boards) -- no own-words AM1 material located for
--     any of them; nothing to seed.
--
-- Titles are verbatim. The DoS and doc-table titles were already recorded
-- in the verified doc; the flsenate/flhouse bill-page titles and the WUSF/
-- CBS Miami/Ocala Gazette headlines were not, so each was re-opened
-- (WebFetch, 2026-09-26) to copy the page's own title/headline exactly:
--   - flsenate: "HJR 5019: Budget Stabilization Fund"
--   - flhouse:  "HJR 5019 (2025) - Budget Stabilization Fund"
--   - WUSF:     "DeSantis splits with the Florida Republicans on Amendment 1
--                and reserve funds"
--   - CBS Miami: "What is Florida's Amendment 1? What it would change and
--                 why Gov. Ron DeSantis opposes it"
--   - Ocala Gazette: "Lawmakers look to pump up rainy-day fund" (the
--     verified doc's section heading paraphrases this without the hyphen;
--     the page's own headline, re-fetched, has it)
-- The DoS row's title follows 0038/0040's own convention of using the
-- ballot_measure.official_title verbatim ("BUDGET STABILIZATION FUND",
-- 0030) rather than inventing page-specific wording for a database-record
-- page with no single headline. WFLA's and the Bradenton Times's titles are
-- taken directly from the 2026-09-26 browser pass's own table, which quotes
-- each page's headline the same way 0040 already relied on for its Bloomberg
-- Tax and Tampa Bay Times rows from the same pass.
--
-- INCLUDED: 9 new neutral rows (3 official, 1 analysis, 5 reporting). AM1
-- keeps 0 support and 0 oppose rows and stays `listed` -- the balance
-- trigger (0034) is never invoked because measure_publication is untouched.
-- Once listed, anon reads these 9 plus the pre-existing
-- `FL-AM1-general:booklet` row (0035, neutral/official) = 10 total.
--
-- SOURCE TYPE / LEAN CONVENTIONS (same as 0038/0040): the three official
-- rows use type='primary_doc', lean_tag='N/A'. JMI, WUSF, CBS Miami, Ocala
-- Gazette, WFLA and The Bradenton Times use type='factual_reporting'
-- (straight news) or 'opinion' (JMI's own guide page), lean_tag='unrated' --
-- no lean or organisation category is assigned to anyone here (spec §11 is
-- a future, separate registry).
--
-- `note` is attribution only (who they are), never a summary of their
-- content -- checked against scripts/verify-measure-resources.ts's own
-- heuristic (flags "would"/"will"/"means"/"because").
--
-- url_norm follows src/lib/brief-rows.ts's urlNorm(). The JMI guide URL is
-- already a source row from 0040 (AM2) -- section (2) resolves it by
-- url_norm at insert time, same as every other row here, so whichever
-- source_id actually won the ON CONFLICT (this file's own insert attempt,
-- or 0040's earlier one on a live database) is the row pointed at.
--
-- Idempotent: source rows ON CONFLICT (url_norm) DO NOTHING, measure_resource
-- rows ON CONFLICT (measure_id, source_id) DO UPDATE. No measure_publication
-- write at all.

-- (1) The policy. Sided rows (support/oppose) stay behind `published`;
--     neutral rows also open at `listed`. No other change to the gate or
--     triggers (0034 §4's balance function and both triggers are untouched).
DROP POLICY IF EXISTS anon_read_measure_resource ON measure_resource;
CREATE POLICY anon_read_measure_resource ON measure_resource
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM measure_publication mp
    WHERE mp.measure_id = measure_resource.measure_id
      AND (mp.status = 'published'
           OR (mp.status = 'listed' AND measure_resource.stance = 'neutral'))
  ));

-- 0034's own column comment said listed exposes "the ballot_measure row
-- only... NO measure_resource" -- true before this file, false after it.
-- Re-issued here with the rest of the wording kept, only the listed clause
-- corrected.
COMMENT ON COLUMN measure_publication.status IS
  'draft/in_review = invisible to anon; listed = ballot_measure row plus '
  'measure_resource''s neutral rows only (0041) -- never a support/oppose '
  'row; published = the two-sided resource list too, enforced by '
  'trg_measure_balance (0010, 0033, 0034).';

-- 0034's own table comment said anon reads measure_resource rows "only
-- through a published measure" -- true before this file, false after it.
-- Re-issued here with the rest of the wording kept, only that clause
-- corrected.
COMMENT ON TABLE measure_resource IS
  'Outside material about a ballot measure, one row per link. The credibility '
  'tier is a function of `kind` (src/lib/measure-ladder.ts) and never a '
  'per-row judgment; `format` is not credibility; `source.lean_tag` is not a '
  'sort key. Anon reads a neutral row once its measure is listed, and a '
  'support/oppose row only once its measure is published (0041).';

-- (2) Sources -- one row per outside resource, keyed by url_norm.
INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag) VALUES
  ('src_dos_init_detail_am1',
   'https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=108',
   'constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=108',
   'Florida Dept. of State, Division of Elections', 'primary_doc', 'N/A'),
  ('src_flsenate_bill_page_am1',
   'https://www.flsenate.gov/Session/Bill/2025/5019/?Tab=Analyses',
   'www.flsenate.gov/Session/Bill/2025/5019?Tab=Analyses',
   'The Florida Senate', 'primary_doc', 'N/A'),
  ('src_flhouse_bill_detail_am1',
   'https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=82516',
   'www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=82516',
   'Florida House of Representatives', 'primary_doc', 'N/A'),
  ('src_jmi_amendment_guide_am1',
   'https://jamesmadison.org/2026-florida-amendment-guide/',
   'jamesmadison.org/2026-florida-amendment-guide',
   'James Madison Institute', 'opinion', 'unrated'),
  ('src_wusf_am1',
   'https://www.wusf.org/politics-issues/2026-09-15/desantis-splits-with-gop-amendment-1-reserve-funds',
   'www.wusf.org/politics-issues/2026-09-15/desantis-splits-with-gop-amendment-1-reserve-funds',
   'WUSF', 'factual_reporting', 'unrated'),
  ('src_cbsmiami_am1',
   'https://www.cbsnews.com/miami/news/what-is-florida-amendment-1-gov-ron-desantis/',
   'www.cbsnews.com/miami/news/what-is-florida-amendment-1-gov-ron-desantis',
   'CBS Miami', 'factual_reporting', 'unrated'),
  ('src_ocalagazette_am1',
   'https://www.ocalagazette.com/lawmakers-look-to-pump-up-rainy-day-fund/',
   'www.ocalagazette.com/lawmakers-look-to-pump-up-rainy-day-fund',
   'Ocala Gazette', 'factual_reporting', 'unrated'),
  ('src_wfla_am1',
   'https://www.wfla.com/news/politics/desantis-breaks-with-gop-over-budget-stabilization-amendment/',
   'www.wfla.com/news/politics/desantis-breaks-with-gop-over-budget-stabilization-amendment',
   'WFLA', 'factual_reporting', 'unrated'),
  ('src_bradentontimes_am1_explainer',
   'https://thebradentontimes.com/stories/2026-constitutional-amendment-1-budget-stabilization-fund,212210',
   'thebradentontimes.com/stories/2026-constitutional-amendment-1-budget-stabilization-fund,212210',
   'The Bradenton Times', 'factual_reporting', 'unrated')
ON CONFLICT (url_norm) DO NOTHING;

-- (3) Resources -- one row per source, scoped to FL-AM1-general, all
--     `neutral`. Display orders 1-9 sit after the pre-existing
--     `FL-AM1-general:booklet` row's 0 (0035).
INSERT INTO measure_resource
  (resource_id, measure_id, source_id, stance, kind, format, title, author, published_at, duration_seconds, note, display_order)
VALUES
  ('FL-AM1-general:dos-init-detail', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=108'),
   'neutral', 'official', 'document',
   'BUDGET STABILIZATION FUND', NULL, NULL, NULL,
   'Division of Elections'' amendment database record', 1),

  ('FL-AM1-general:flsenate-bill-page', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.flsenate.gov/Session/Bill/2025/5019?Tab=Analyses'),
   'neutral', 'official', 'document',
   'HJR 5019: Budget Stabilization Fund', NULL, NULL, NULL,
   'Senate bill page, listing the staff analyses for HJR 5019', 2),

  ('FL-AM1-general:flhouse-bill-detail', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=82516'),
   'neutral', 'official', 'document',
   'HJR 5019 (2025) - Budget Stabilization Fund', NULL, NULL, NULL,
   'House bill-detail page: text, vote history and staff-analysis links', 3),

  ('FL-AM1-general:jmi-amendment-guide', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'jamesmadison.org/2026-florida-amendment-guide'),
   'neutral', 'analysis', 'article',
   '2026 Florida Amendment Guide', NULL, '2026-09-21', NULL,
   'James Madison Institute''s own guide page', 4),

  ('FL-AM1-general:wusf-report', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.wusf.org/politics-issues/2026-09-15/desantis-splits-with-gop-amendment-1-reserve-funds'),
   'neutral', 'reporting', 'article',
   'DeSantis splits with the Florida Republicans on Amendment 1 and reserve funds', 'Gray Rohrer, News Service of Florida', '2026-09-15', NULL,
   NULL, 5),

  ('FL-AM1-general:cbsmiami-report', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.cbsnews.com/miami/news/what-is-florida-amendment-1-gov-ron-desantis'),
   'neutral', 'reporting', 'article',
   'What is Florida''s Amendment 1? What it would change and why Gov. Ron DeSantis opposes it', 'News Service of Florida', '2026-09-16', NULL,
   NULL, 6),

  ('FL-AM1-general:ocalagazette-report', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.ocalagazette.com/lawmakers-look-to-pump-up-rainy-day-fund'),
   'neutral', 'reporting', 'article',
   'Lawmakers look to pump up rainy-day fund', 'Jim Turner & Jim Saunders, News Service of Florida', '2025-06-06', NULL,
   NULL, 7),

  ('FL-AM1-general:wfla-report', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'www.wfla.com/news/politics/desantis-breaks-with-gop-over-budget-stabilization-amendment'),
   'neutral', 'reporting', 'article',
   'DeSantis breaks with GOP over budget stabilization amendment', NULL, '2026-09-16', NULL,
   NULL, 8),

  ('FL-AM1-general:bradentontimes-explainer', 'FL-AM1-general',
   (SELECT source_id FROM source WHERE url_norm = 'thebradentontimes.com/stories/2026-constitutional-amendment-1-budget-stabilization-fund,212210'),
   'neutral', 'reporting', 'article',
   'Amendment 1: Budget Stabilization Fund, Explained', NULL, '2026-09-12', NULL,
   NULL, 9)
ON CONFLICT (measure_id, source_id) DO UPDATE SET
  stance = EXCLUDED.stance, kind = EXCLUDED.kind, format = EXCLUDED.format,
  title = EXCLUDED.title, author = EXCLUDED.author, published_at = EXCLUDED.published_at,
  duration_seconds = EXCLUDED.duration_seconds, note = EXCLUDED.note,
  display_order = EXCLUDED.display_order;
