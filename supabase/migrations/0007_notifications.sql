-- Notification backbone (CAP_PWA_Notifications_Plan §1 A4, ponytail revision
-- 2026-07-06): exactly two tables.
--
--   election_event        THE liability table — authoritative election dates.
--                          verified_by NULL = never sends (founder task F4
--                          flips it after checking each row's details_url).
--   notification_send_log  idempotency ledger for the daily reminder cron:
--                          INSERT ... ON CONFLICT DO NOTHING before sending
--                          IS the dedupe. No outbox state machine (§6-H).
--
-- Numbering: 0006 is admin_ops on the admin-console branch and is already
-- applied to the live DB, so this file takes 0007 even though 0006 is absent
-- from this branch's tree.
--
-- Idempotent by construction: IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS election_event (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state        CHAR(2) NOT NULL DEFAULT 'FL',
  county_fips  CHAR(5),                -- NULL = statewide
  event_type   TEXT NOT NULL CHECK (event_type IN
                 ('registration_deadline','vbm_request_deadline',
                  'early_voting_start','early_voting_end','election_day')),
  election     TEXT NOT NULL,          -- 'primary_2026' | 'general_2026'
  event_date   DATE NOT NULL,
  details_url  TEXT NOT NULL,          -- official source, cited in every send
  verified_by  TEXT,                   -- operator email; NULL = never sends
  verified_at  TIMESTAMPTZ
);

-- Design doc §4 declared UNIQUE (state, county_fips, event_type, election)
-- inline, but NULL county_fips rows (statewide — the only rows in 2026)
-- would never collide under NULL-distinct semantics. COALESCE index instead,
-- same pattern as uq_news_item_url_candidate in 0005.
CREATE UNIQUE INDEX IF NOT EXISTS uq_election_event_scope
  ON election_event (state, (COALESCE(county_fips, '')), event_type, election);

CREATE TABLE IF NOT EXISTS notification_send_log (
  dedupe_key      TEXT PRIMARY KEY,    -- '{election}:{event_type}:{offset}:{channel}'
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_count INT
);

-- RLS: service-role only on both (0002_rls.sql posture). election_event is
-- deliberately NOT anon-readable — the app reads it through service routes,
-- which filter on verified_by, so unverified rows can never leak to a page.
ALTER TABLE election_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_send_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON election_event FROM anon, authenticated;
REVOKE ALL ON notification_send_log FROM anon, authenticated;
GRANT ALL ON election_event TO service_role;
GRANT ALL ON notification_send_log TO service_role;
