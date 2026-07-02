-- Pipeline-owned read models, defined authoritatively in CAP_Schema_v1.md.
-- The CAP pipeline (Profiler / Record / Fact-Checker / Orchestrator) writes
-- these tables; Know Your Vote only ever reads them. They are created from
-- this repo only because the shared Supabase project was empty when the app
-- was built — if the pipeline later manages its own migrations, this file is
-- superseded by them and must not diverge.

CREATE TABLE race (
  race_id       TEXT PRIMARY KEY,
  office        TEXT NOT NULL,
  level         TEXT NOT NULL CHECK (level IN ('federal','state')),
  district      TEXT,
  election      TEXT NOT NULL CHECK (election IN ('primary','general')),
  is_open_seat  BOOLEAN NOT NULL DEFAULT false,
  incumbent_id  TEXT,
  candidate_ids TEXT[] NOT NULL DEFAULT '{}',
  key_dates     JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE candidate (
  candidate_id      TEXT PRIMARY KEY,
  legal_name        TEXT NOT NULL,
  party             TEXT NOT NULL CHECK (party IN ('REP','DEM','NPA','other')),
  office_sought     TEXT NOT NULL,
  is_incumbent      BOOLEAN NOT NULL DEFAULT false,
  qualifying_status TEXT NOT NULL CHECK (qualifying_status IN ('qualified','withdrawn','other')),
  prior_offices     TEXT[] NOT NULL DEFAULT '{}',
  official_site     TEXT,
  fec_id            TEXT
);

CREATE TABLE social_platform (
  platform       TEXT PRIMARY KEY,
  display_name   TEXT NOT NULL,
  host_pattern   TEXT NOT NULL,
  handle_in_path BOOLEAN NOT NULL DEFAULT true,
  active         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE source (
  source_id    TEXT PRIMARY KEY,
  url          TEXT NOT NULL,
  url_norm     TEXT NOT NULL UNIQUE,
  publisher    TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('factual_reporting','opinion','primary_doc','candidate_self')),
  lean_tag     TEXT NOT NULL CHECK (lean_tag IN ('left','center-left','center','center-right','right','N/A')),
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidate_social_account (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id         TEXT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
  platform             TEXT NOT NULL REFERENCES social_platform(platform),
  handle               TEXT NOT NULL,
  handle_norm          TEXT NOT NULL,
  url                  TEXT,
  provenance           TEXT NOT NULL CHECK (provenance IN ('linked_from_official_site','doe_filing','fec_filing')),
  provenance_source_id TEXT REFERENCES source(source_id),
  status               TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('verified','unverified','disputed')),
  verified_at          TIMESTAMPTZ,
  UNIQUE (platform, handle_norm)
);
CREATE INDEX idx_social_lookup    ON candidate_social_account (platform, handle_norm);
CREATE INDEX idx_social_candidate ON candidate_social_account (candidate_id);

CREATE TABLE issue (
  issue_id      TEXT PRIMARY KEY,
  race_id       TEXT NOT NULL REFERENCES race(race_id),
  tier          TEXT NOT NULL CHECK (tier IN ('spine','candidate')),
  candidate_id  TEXT REFERENCES candidate(candidate_id),
  title         TEXT NOT NULL,
  description   TEXT,
  source_id     TEXT REFERENCES source(source_id),
  display_order INT NOT NULL DEFAULT 0,
  CHECK (
    (tier = 'spine' AND candidate_id IS NULL)
    OR (tier = 'candidate' AND candidate_id IS NOT NULL)
  )
);
CREATE INDEX idx_issue_race ON issue (race_id, display_order);

CREATE TABLE claim (
  claim_id     TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate(candidate_id),
  race_id      TEXT NOT NULL REFERENCES race(race_id),
  issue_id     TEXT REFERENCES issue(issue_id),
  text         TEXT NOT NULL,
  bucket       TEXT NOT NULL CHECK (bucket IN ('verifiable_fact','stated_position','outside_opinion')),
  attributed   BOOLEAN NOT NULL DEFAULT false,
  derived_from TEXT REFERENCES claim(claim_id),
  verdict      TEXT CHECK (verdict IN ('accurate','mostly_accurate','mixed','mostly_inaccurate','inaccurate','unverifiable')),
  verification TEXT NOT NULL CHECK (verification IN ('verified','single_source','unverified'))
);
CREATE INDEX idx_claim_race      ON claim (race_id);
CREATE INDEX idx_claim_candidate ON claim (candidate_id, race_id);

CREATE TABLE claim_source (
  claim_id  TEXT NOT NULL REFERENCES claim(claim_id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES source(source_id),
  PRIMARY KEY (claim_id, source_id)
);

CREATE TABLE position (
  position_id    TEXT PRIMARY KEY,
  candidate_id   TEXT NOT NULL REFERENCES candidate(candidate_id),
  race_id        TEXT NOT NULL REFERENCES race(race_id),
  issue_id       TEXT NOT NULL REFERENCES issue(issue_id),
  stance_summary TEXT NOT NULL DEFAULT '',
  claim_ids      TEXT[] NOT NULL DEFAULT '{}',
  attributed     BOOLEAN NOT NULL DEFAULT false,
  coverage       TEXT NOT NULL CHECK (coverage IN ('stated','no_stated_position_found')),
  UNIQUE (candidate_id, issue_id)
);
CREATE INDEX idx_position_candidate ON position (candidate_id, issue_id);

CREATE TABLE profile (
  candidate_id TEXT NOT NULL REFERENCES candidate(candidate_id),
  race_id      TEXT NOT NULL REFERENCES race(race_id),
  facts        TEXT[] NOT NULL DEFAULT '{}',
  positions    TEXT[] NOT NULL DEFAULT '{}',
  opinions     TEXT[] NOT NULL DEFAULT '{}',
  audit        JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (candidate_id, race_id)
);

-- Platform reference seed per CAP_Schema_v1 §4.
INSERT INTO social_platform (platform, display_name, host_pattern) VALUES
  ('twitter',   'X (Twitter)', '^(www\.|m\.|mobile\.)?(x|twitter)\.com$'),
  ('facebook',  'Facebook',    '^(www\.|m\.)?(facebook|fb)\.com$'),
  ('instagram', 'Instagram',   '^(www\.)?instagram\.com$'),
  ('youtube',   'YouTube',     '^((www\.|m\.)?youtube\.com|youtu\.be)$');
