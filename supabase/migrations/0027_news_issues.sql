-- 0027_news_issues.sql
-- Issue tags for news_item, plus the provenance needed to reproduce them.
-- docs/superpowers/specs/2026-09-18-news-characterization-design.md §4.6
--
-- Additive and nullable. Nothing is backfilled: every existing row keeps
-- issues IS NULL, which is the correct statement about it — those rows were
-- never characterized.
--
-- THE DISTINCTION THIS SCHEMA CARRIES:
--   issues IS NULL   -- never characterized
--   issues = '{}'    -- characterized; no issue cleared the threshold
-- These are different facts. A query that treats them alike will report
-- "no issues found" for articles nobody ever looked at.
--
-- No CHECK constrains the array contents to the taxonomy. The taxonomy lives
-- in src/lib/news-issues.ts and changes by PR; a CHECK here would need a
-- migration every time an issue is added, and the two would drift the first
-- time someone forgot. src/lib/news-characterize.ts is the enforcement point:
-- applyThreshold() iterates the taxonomy rather than the model's response, so
-- an id outside the list cannot be produced in the first place.

ALTER TABLE news_item ADD COLUMN IF NOT EXISTS issues TEXT[];
ALTER TABLE news_item ADD COLUMN IF NOT EXISTS characterized_by TEXT;
ALTER TABLE news_item ADD COLUMN IF NOT EXISTS characterized_at TIMESTAMPTZ;

-- The product query is "rows matching any of the issues this voter picked",
-- i.e. issues && ARRAY[...]. GIN is the index for that, and it is the reason
-- this is an array column rather than a join table.
CREATE INDEX IF NOT EXISTS idx_news_item_issues ON news_item USING GIN (issues);

COMMENT ON COLUMN news_item.issues IS
  'Issue ids from src/lib/news-issues.ts. NULL = not characterized; {} = characterized, nothing over threshold.';
COMMENT ON COLUMN news_item.characterized_by IS
  'engine:model/tax-VERSION/q-HASH — everything needed to reproduce and compare a run.';
COMMENT ON COLUMN news_item.characterized_at IS
  'When the characterizer last wrote issues for this row.';
