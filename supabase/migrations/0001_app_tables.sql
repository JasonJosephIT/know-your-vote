-- App-owned tables per PRD § 3 Data Model. The web app owns these four;
-- it never creates or modifies pipeline-owned tables.

-- voting_info_subscription.unsubscribe_token uses gen_random_bytes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ZIP -> jurisdiction resolution (seeded from Census/official FL data).
-- congressional_district is NOT NULL (PRD shows it nullable, but it is part
-- of the primary key; rows are only seeded when the district is known, and a
-- split ZIP gets one row per district).
CREATE TABLE zip_district (
  zip5                   CHAR(5) NOT NULL,
  county_fips            CHAR(5) NOT NULL,
  county_name            TEXT NOT NULL,
  congressional_district TEXT NOT NULL,
  metro                  TEXT,
  is_split               BOOLEAN NOT NULL DEFAULT false,
  in_coverage            BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (zip5, congressional_district)
);
CREATE INDEX idx_zip_district_zip ON zip_district (zip5);

-- Publication gate: a race is public only when status = 'published'.
CREATE TABLE race_publication (
  race_id      TEXT PRIMARY KEY REFERENCES race(race_id),
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','in_review','published')),
  published_at TIMESTAMPTZ,
  note         TEXT
);

-- Local Electoral News feed items (pipeline events + curated official links).
CREATE TABLE news_item (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id      TEXT REFERENCES race(race_id),
  metro        TEXT,
  item_type    TEXT NOT NULL CHECK (item_type IN ('pipeline_event','official_link')),
  title        TEXT NOT NULL,
  summary      TEXT,
  url          TEXT,
  source_id    TEXT REFERENCES source(source_id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_news_item_scope ON news_item (race_id, metro, published_at DESC);

-- The ONLY table holding personal data. Opt-in email delivery.
CREATE TABLE voting_info_subscription (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL,
  zip5              CHAR(5) NOT NULL,
  consent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribe_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  last_sent_at      TIMESTAMPTZ,
  active            BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (email, zip5)
);
