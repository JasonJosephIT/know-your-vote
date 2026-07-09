-- Schema for the freshness layer (CAP_Refresh_Agents_Plan §5): four
-- scheduled agents (R1-R4, built in later tasks) keep feed and contact data
-- current. This migration only adds the tables/columns/indexes they write
-- to and the RLS that governs them; no agent code lives here.
--
-- Idempotent by construction (safe to re-run): every ADD uses IF NOT EXISTS,
-- and the one constraint without an IF-NOT-EXISTS form (news_item_item_type
-- _check) uses the drop-then-add pattern instead.

-- (1) news_item: candidate scoping + new item types + dedupe
ALTER TABLE news_item ADD COLUMN IF NOT EXISTS candidate_id TEXT REFERENCES candidate(candidate_id);
ALTER TABLE news_item DROP CONSTRAINT IF EXISTS news_item_item_type_check;
ALTER TABLE news_item ADD CONSTRAINT news_item_item_type_check
  CHECK (item_type IN ('pipeline_event','official_link','candidate_news','election_news'));
CREATE INDEX IF NOT EXISTS idx_news_item_candidate ON news_item (candidate_id, published_at DESC);
-- idempotency for agent runs: same story for same candidate can never duplicate
CREATE UNIQUE INDEX IF NOT EXISTS uq_news_item_url_candidate
  ON news_item (url, (COALESCE(candidate_id, ''))) WHERE url IS NOT NULL;

-- (2) contact & logistics: app-surface data, never brief content
CREATE TABLE IF NOT EXISTS candidate_contact (
  candidate_id     TEXT PRIMARY KEY REFERENCES candidate(candidate_id),
  campaign_email   TEXT,
  campaign_phone   TEXT,
  mailing_address  TEXT,
  contact_url      TEXT,           -- the campaign's own /contact page
  source_url       TEXT NOT NULL,  -- where each fact was read (candidate-controlled or SoE filing)
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by      TEXT NOT NULL DEFAULT 'agent:R2'
);

-- (3) freshness stamps on logistics fields the app already renders
ALTER TABLE race      ADD COLUMN IF NOT EXISTS info_last_verified_at TIMESTAMPTZ;
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS site_last_verified_at TIMESTAMPTZ;

-- (4) RLS for candidate_contact — same defense-in-depth pattern as
-- 0002_rls.sql: anon reads only, service_role writes only. This table did
-- not exist when 0002's blanket REVOKE ran, and Supabase's default
-- privileges may otherwise grant new tables to anon, so it is repeated
-- here explicitly rather than assumed inherited.
ALTER TABLE candidate_contact ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON candidate_contact FROM anon, authenticated;
GRANT SELECT ON candidate_contact TO anon;
GRANT ALL ON candidate_contact TO service_role;

-- Public campaign contact info — same visibility class as news_item (0002's
-- anon_read_news_item), so anon may read all rows unconditionally.
-- CREATE POLICY has no IF NOT EXISTS in this grammar; drop-then-add is the
-- idempotency mechanism (same pattern as the CHECK constraint above).
DROP POLICY IF EXISTS anon_read_candidate_contact ON candidate_contact;
CREATE POLICY anon_read_candidate_contact ON candidate_contact
  FOR SELECT TO anon
  USING (true);
