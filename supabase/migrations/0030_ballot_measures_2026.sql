-- The three statewide constitutional amendments on the 2026 general ballot.
--
-- SOURCE, and why it is this one: every string below is lifted verbatim from
-- the Division of Elections' own booklet, "Proposed Constitutional Amendments
-- for the General Election (November 3, 2026)", updated 2026-08-21:
--   https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf
-- `ballot_summary` is defined by 0010 as "the text as it appears on the
-- ballot", so a paraphrase is not an acceptable substitute. The gists in
-- docs/general-election/ballots/ballots_by_zip.json are summaries we wrote and
-- are deliberately NOT used here.
--
-- EXTRACTION: the booklet is a PDF that mixes literal and CID-encoded text, so
-- it was read with pypdf rather than a hand-rolled parser -- an earlier
-- hand-rolled pass silently dropped the line carrying Amendment 3's dollar
-- figures. If this is ever regenerated, diff the summaries against the PDF
-- before trusting them.
--
-- placed_by: all three were referred by the Legislature; none is a citizen
-- initiative. threshold_pct: 60, per Art. XI s.5(e), Fla. Const.
--
-- This seeds the measures only. It deliberately does NOT insert
-- measure_publication rows: 0010's trigger refuses to publish a measure whose
-- support/oppose arguments are absent or lopsided, and no measure_argument
-- rows exist yet. These stay unpublished -- and therefore invisible under RLS
-- -- until sourced arguments for both sides are written.
--
-- Idempotent: safe to re-run.

INSERT INTO ballot_measure
  (measure_id, election, number, official_title, ballot_summary,
   full_text_url, placed_by, threshold_pct, jurisdiction, display_order)
VALUES
  (
    'FL-AM1-general', 'general_2026', '1',
    'BUDGET STABILIZATION FUND',
    'Proposing an amendment to the State Constitution to increase the amount of funds that may be retained in the budget stabilization fund from 10% to 25% of general revenue collections, require the legislature to transfer the lesser of $750 million or the amount required to reach 25% of the general revenue collections each year unless certain conditions are met, and allow the legislature to withdraw funds for critical state needs.',
    'https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf',
    'legislature', 60.00, 'FL', 1
  ),
  (
    'FL-AM2-general', 'general_2026', '2',
    'EXEMPTION OF TANGIBLE PERSONAL PROPERTY ON AGRICULTURAL LAND FROM TAXATION',
    'Proposing an amendment to the State Constitution to exempt tangible personal property habitually located or typically present on land classified as agricultural, used in the production of agricultural products or for agritourism activities, and owned by the landowner or leaseholder of the agricultural land from ad valorem taxation. If approved this amendment would first apply for tax years beginning January 1, 2027.',
    'https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf',
    'legislature', 60.00, 'FL', 2
  ),
  (
    'FL-AM3-general', 'general_2026', '3',
    'INCREASED HOMESTEAD EXEMPTION; LOWER CAP ON INCREASES IN NON-HOMESTEAD PROPERTY ASSESSMENTS',
    'This amendment increases the homestead exemption, for all non-school taxes, to $150,000 in 2027 and $250,000 in 2028, and adjusts for inflation thereafter. It requires the Legislature to prescribe a uniform procedure for counties and municipalities, for their respective levies, to increase the homestead exemption up to full assessed value, and allows special districts, subject to referendum approval, to do the same. Persons who are not Florida residents on December 31, 2026, will receive the existing homestead exemption upon qualifying for a homestead exemption, with the increased homestead exemption beginning with the fifth year of exemption, to the extent permitted by the U.S. Constitution. This amendment reduces the annual cap on assessment increases for non-homestead properties from 10% to 5%. This amendment requires counties and municipalities to use property taxes solely for public safety, education and schools, infrastructure, natural resources, bond debt service, retirement benefits for employees, and operations and administration. Other expenditures may be approved by county officers or county or municipal governing bodies unless prohibited by general law, notwithstanding Article VII, Section 9(a) of the Florida Constitution, which allows counties and municipalities to levy property taxes for their respective purposes. This amendment takes effect January 1, 2027.',
    'https://files.floridados.gov/media/711355/eng-2026-booklet-constitutional-amendpub-updated-20260821.pdf',
    'legislature', 60.00, 'FL', 3
  )
ON CONFLICT (measure_id) DO UPDATE SET
  official_title = EXCLUDED.official_title,
  ballot_summary = EXCLUDED.ballot_summary,
  full_text_url  = EXCLUDED.full_text_url,
  placed_by      = EXCLUDED.placed_by,
  threshold_pct  = EXCLUDED.threshold_pct,
  jurisdiction   = EXCLUDED.jurisdiction,
  display_order  = EXCLUDED.display_order;
