-- 0016_news_county.sql
-- Scope a news item to a county, so the election news feed can be filtered
-- by county and switched to another one.
-- candidate-news-PRD.md §7 (task C9), requirement CN-R11.
--
-- WHY A NEW COLUMN AND NOT `metro`: news_item.metro already exists and holds
-- four values ('miami','fort_lauderdale','tampa','orlando'). It is a display
-- grouping that cannot grow past those four. county_fips is the key the rest
-- of the system is already built on — zip_district.county_fips is NOT NULL,
-- COVERED_COUNTIES in src/lib/resolve.ts is keyed on it, the DoE files are
-- keyed on it, and Florida has 67 counties. Filtering on the durable key
-- means reaching county 5 through 67 needs a seed, not a migration.
--
-- `metro` IS DELIBERATELY KEPT. Live rows use it, idx_news_item_scope is
-- built on it, and the API still accepts ?metro=. Dropping it is a separate
-- decision with no benefit to this one.
--
-- NULLABLE, AND NULL MEANS STATEWIDE. A statewide item (the registration
-- link, a Division of Elections notice) legitimately has no county, and the
-- read query treats race_id IS NULL AND metro IS NULL AND county_fips IS NULL
-- as the statewide scope every voter sees. A NOT NULL default would force a
-- county onto items that do not have one.
--
-- NO FOREIGN KEY: zip_district is keyed on (zip5, congressional_district),
-- so county_fips is not a unique key there and cannot be referenced. CHAR(5)
-- matches zip_district.county_fips exactly.
--
-- Idempotent: safe to re-run.

ALTER TABLE news_item ADD COLUMN IF NOT EXISTS county_fips CHAR(5);

CREATE INDEX IF NOT EXISTS idx_news_item_county
  ON news_item (county_fips, published_at DESC);

COMMENT ON COLUMN news_item.county_fips IS
  'County scope for the news feed; NULL means statewide. Populated from the '
  'race for a candidate-scoped item, or from the publishing outlet '
  '(src/lib/news-sources.ts) for an unmatched one.';
