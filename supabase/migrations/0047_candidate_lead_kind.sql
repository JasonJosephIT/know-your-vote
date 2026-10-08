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
-- Idempotent: safe to re-run.

ALTER TABLE review_item DROP CONSTRAINT IF EXISTS review_item_kind_check;
ALTER TABLE review_item ADD CONSTRAINT review_item_kind_check CHECK (kind IN (
  'manual_news', 'gated_diff', 'fact_flag',
  'unclear_statement', 'unverified_fact', 'date_mismatch',
  'candidate_lead'
));
