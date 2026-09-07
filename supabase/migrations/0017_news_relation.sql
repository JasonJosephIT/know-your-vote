-- 0017_news_relation.sql
-- Record HOW a news item was matched to a candidate.
-- candidate-news-PRD.md §6 (task C8), requirements CN-R9 / CN-R10.
--
-- WHY NO JOIN TABLE: 0005's uq_news_item_url_candidate is keyed on
-- (url, COALESCE(candidate_id,'')), not on url, so the same article already
-- may exist once per candidate plus once unattached. One article matched to
-- three candidates is three news_item rows and always was legal. The only
-- thing missing was a column saying how each row got there.
--
-- THE TWO VALUES:
--   'named'   — the candidate's full name appears in the title or dek. One
--               rule, applied identically to every candidate.
--   'related' — ambiguous: the story is about the race and names nobody, or
--               it names a surname/nickname that is not a full-name match.
--               A 'related' row attaches to EVERY candidate the ambiguity
--               admits, never to the most likely one. Resolving ambiguity by
--               picking a winner would put back exactly the editorial
--               discretion this project removes.
--
-- NULLABLE, AND NULL IS NOT A THIRD TIER. It means "not a candidate match":
-- official_link, pipeline_event and unattached election_news rows. The CHECK
-- allows NULL for those; it does not admit any value beyond the two.
--
-- WHY NOT NOT NULL WITH A DEFAULT: defaulting to either tier would label
-- every existing row with a match that never happened. The 10 live rows
-- predate the matcher entirely.
--
-- CN-R10 lives in code, not here: coverage variance counts 'named' rows only,
-- because 'related' rows are equal across a race by construction and would
-- drag (max-min)/max toward zero — flattering our own coverage with the tier
-- that exists to fill a voter's page. A constraint cannot express that; the
-- guardrail is scripts/verify-news-match.ts.
--
-- Idempotent: safe to re-run.

ALTER TABLE news_item ADD COLUMN IF NOT EXISTS relation TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'news_item_relation_check'
  ) THEN
    ALTER TABLE news_item ADD CONSTRAINT news_item_relation_check
      CHECK (relation IS NULL OR relation IN ('named','related'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_news_item_candidate_relation
  ON news_item (candidate_id, relation, published_at DESC);

COMMENT ON COLUMN news_item.relation IS
  'How this row was matched to its candidate: named (full-name match) or '
  'related (ambiguous — attaches to every candidate the ambiguity admits). '
  'NULL means the row is not a candidate match at all. Coverage variance '
  'counts named rows only (candidate-news-PRD.md §6).';
