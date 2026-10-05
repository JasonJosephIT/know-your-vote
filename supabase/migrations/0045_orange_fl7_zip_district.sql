-- 0045_orange_fl7_zip_district.sql
-- Two Orange County ZIPs offered FL-7, a House race that is on no Orange
-- County ballot. 0022_zip_seed_2026 gave 32703 (Apopka) the districts
-- FL-10, FL-11 and FL-7, and 32751 (Maitland) FL-10 and FL-7, all under
-- county_fips 12095. A voter there was asked to pick between them, and
-- picking FL-7 showed them a race they cannot vote in.
--
-- WHY THE ROWS WERE WRONG. scripts/build-zip-seed.mjs summed district land
-- over every census block in a ZIP, whatever county the block sat in, then
-- filed every qualifying district under the ZIP's dominant county. Both
-- ZIPs cross into Seminole County, which the site does not cover, and their
-- FL-7 land is all on the Seminole side. Read from the same two inputs 0022
-- was built from (the enacted plan EOGPCRP2026, flsenate.gov, and the
-- Census 2020 ZCTA520/tabblock relationship file), 2026-10-05:
--   32703  Orange part: FL-10 46.8 km2, FL-11 28.9 km2; Seminole part: FL-7 7.5 km2
--   32751  Orange part: FL-10 13.6 km2;                  Seminole part: FL-7 4.6 km2
--
-- THE OFFICIAL CHECK. Orange County's composite sample ballot for the
-- 2026-11-03 general ("shows ALL contests in this election that can be voted
-- on by voters registered within Orange County") carries Representative in
-- Congress for Districts 8, 9 and 11 only. FL-10 is missing because its one
-- candidate is unopposed and F.S. 101.151(7) leaves it off the ballot. FL-7
-- is missing although it is contested (three candidates qualified), so no
-- Orange precinct votes in FL-7. The plan does put four Orange blocks in
-- FL-7, about 2.5 hectares in all, inside ZIP 32816, which 0022 already maps
-- to FL-8 alone; the composite ballot shows no Orange voter lives in them.
--
-- WHAT CHANGES. The two (12095, FL-7) rows go. is_split then follows the
-- rows that remain: 32751 has only FL-10 and stops asking the voter to
-- pick; 32703 keeps FL-10 and FL-11 and still asks. The seed source now
-- applies the same rule, so a rebuild cannot bring the pairing back: the
-- build counts only the covered county's own blocks, and
-- docs/general-election/ballots/zip_districts_2026.csv drops the two rows.
-- scripts/verify-zip-orange-fl7.mjs applies 0022 then this file (twice) and
-- checks the result against that CSV.
--
-- NOT CHANGED HERE. The same rule also drops 33598 (Wimauma, Hillsborough)
-- -> FL-16: the plan puts that ZIP's FL-16 land in Manatee County, and the
-- only Hillsborough blocks in FL-16 are water and islands in no ZIP. No
-- official Hillsborough ballot has been read to confirm it, so the row stays
-- until one is (the CSV keeps it too).
--
-- Idempotent: a second run deletes nothing and recomputes the same is_split.

DELETE FROM zip_district
WHERE county_fips = '12095'
  AND congressional_district = 'FL-7'
  AND zip5 IN ('32703', '32751');

UPDATE zip_district AS z
SET is_split = (
  SELECT count(*) > 1 FROM zip_district AS o WHERE o.zip5 = z.zip5
)
WHERE z.zip5 IN ('32703', '32751');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM zip_district WHERE zip5 IN ('32703', '32751')) THEN
    RAISE NOTICE '32703 and 32751 absent (unseeded harness) - nothing to assert';
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM zip_district
    WHERE county_fips = '12095' AND congressional_district = 'FL-7'
  ) THEN
    RAISE EXCEPTION 'an Orange County ZIP still maps to FL-7';
  END IF;
  IF (SELECT string_agg(congressional_district || ':' || is_split, ',' ORDER BY congressional_district)
        FROM zip_district WHERE zip5 = '32751') IS DISTINCT FROM 'FL-10:false' THEN
    RAISE EXCEPTION '32751 should be FL-10 alone, not split';
  END IF;
  IF (SELECT string_agg(congressional_district || ':' || is_split, ',' ORDER BY congressional_district)
        FROM zip_district WHERE zip5 = '32703') IS DISTINCT FROM 'FL-10:true,FL-11:true' THEN
    RAISE EXCEPTION '32703 should be FL-10 and FL-11, split';
  END IF;
END $$;

-- Reversal (only if the composite ballot above proves wrong):
-- INSERT INTO zip_district
--   (zip5, county_fips, county_name, congressional_district, metro, is_split, in_coverage)
-- VALUES
--   ('32703', '12095', 'Orange', 'FL-7', 'orlando', true, true),
--   ('32751', '12095', 'Orange', 'FL-7', 'orlando', true, true)
-- ON CONFLICT (zip5, congressional_district) DO NOTHING;
-- UPDATE zip_district SET is_split = true WHERE zip5 IN ('32703', '32751');
