-- 0047_candidate_lead_kind.sql
-- Adds 'candidate_lead' to review_item.kind, for R5, the candidate-leads
-- agent (docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md).
--
-- A candidate_lead is a person the news names as a 2026 Florida candidate
-- whom the guide does not cover (another county, or a lieutenant governor
-- running mate). It is operator-only: approving it records "noted for
-- research" and writes nothing else (src/lib/admin/effects.ts). The payload
-- shape is CandidateLeadPayloadSchema in src/types/admin.ts.
--
-- The CHECK was declared inline in 0006, so Postgres named it
-- review_item_kind_check; this replaces it with the same six kinds plus one.
--
-- It also adds a partial unique index on the lead's dedupe key. `queue` reads
-- the keys already queued and skips them, but two runs that overlap can both
-- read before either writes; the index makes the database refuse the second
-- insert, so the backstop does not depend on the runs taking turns. It covers
-- every status: a rejected lead stays decided, as `queue` already treats it.
-- Idempotent: safe to re-run.

ALTER TABLE review_item DROP CONSTRAINT IF EXISTS review_item_kind_check;
ALTER TABLE review_item ADD CONSTRAINT review_item_kind_check CHECK (kind IN (
  'manual_news', 'gated_diff', 'fact_flag',
  'unclear_statement', 'unverified_fact', 'date_mismatch',
  'candidate_lead'
));

-- Backstop for concurrent runs (see the header).
CREATE UNIQUE INDEX IF NOT EXISTS uq_review_item_candidate_lead_key
  ON review_item ((payload->>'dedupe_key'))
  WHERE kind = 'candidate_lead';
