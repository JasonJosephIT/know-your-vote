-- Row-Level Security: the boundary that makes "published-and-audited-only"
-- a database guarantee rather than a UI habit (PRD § 2, FR-005).
--
--   anon           -> SELECT only, and only rows tied to published races
--                     (plus public reference data: sources, platforms,
--                     zip_district, news_item).
--   authenticated  -> no policies; this app has no accounts.
--   service_role   -> bypasses RLS (Supabase built-in); used server-side for
--                     voting_info_subscription and news_item writes only.
--   voting_info_subscription -> the ONLY personal-data table: no anon access
--                     of any kind.

ALTER TABLE race                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate                ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_social_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_platform          ENABLE ROW LEVEL SECURITY;
ALTER TABLE source                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_source             ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE position                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_district             ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_publication         ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_item                ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_info_subscription ENABLE ROW LEVEL SECURITY;

-- Verb-level defense in depth: anon may never write anything, and may not
-- read the subscription table at all. (RLS already denies by default; the
-- revokes keep even a mistaken future policy from widening writes.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON voting_info_subscription FROM anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON race, candidate, candidate_social_account, social_platform,
  source, claim, claim_source, issue, position, profile,
  zip_district, race_publication, news_item TO anon;

-- Publication gate rows themselves: only published rows are visible.
CREATE POLICY anon_read_published ON race_publication
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY anon_read_race ON race
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM race_publication rp
    WHERE rp.race_id = race.race_id AND rp.status = 'published'
  ));

CREATE POLICY anon_read_profile ON profile
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM race_publication rp
    WHERE rp.race_id = profile.race_id AND rp.status = 'published'
  ));

-- A candidate is visible only through a published race's profile.
CREATE POLICY anon_read_candidate ON candidate
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM profile p
    JOIN race_publication rp ON rp.race_id = p.race_id
    WHERE p.candidate_id = candidate.candidate_id AND rp.status = 'published'
  ));

CREATE POLICY anon_read_issue ON issue
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM race_publication rp
    WHERE rp.race_id = issue.race_id AND rp.status = 'published'
  ));

CREATE POLICY anon_read_claim ON claim
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM race_publication rp
    WHERE rp.race_id = claim.race_id AND rp.status = 'published'
  ));

CREATE POLICY anon_read_claim_source ON claim_source
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM claim c
    JOIN race_publication rp ON rp.race_id = c.race_id
    WHERE c.claim_id = claim_source.claim_id AND rp.status = 'published'
  ));

CREATE POLICY anon_read_position ON position
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM race_publication rp
    WHERE rp.race_id = position.race_id AND rp.status = 'published'
  ));

-- Only verified handles, and only for publicly visible candidates.
CREATE POLICY anon_read_social ON candidate_social_account
  FOR SELECT TO anon
  USING (
    status = 'verified'
    AND EXISTS (
      SELECT 1 FROM profile p
      JOIN race_publication rp ON rp.race_id = p.race_id
      WHERE p.candidate_id = candidate_social_account.candidate_id
        AND rp.status = 'published'
    )
  );

-- Public reference data.
CREATE POLICY anon_read_source          ON source          FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_social_platform ON social_platform FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_zip_district    ON zip_district    FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_news_item       ON news_item       FOR SELECT TO anon USING (true);

-- voting_info_subscription: deliberately no policies — anon and
-- authenticated are denied entirely; only the service role touches it.
