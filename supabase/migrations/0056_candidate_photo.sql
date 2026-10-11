-- 0056_candidate_photo.sql
--
-- Candidate headshots (founder, 2026-10-11): every candidate in a race gets
-- one, or none in that race do. Source order: an official government
-- portrait where one exists, otherwise the photo the campaign publishes on
-- its own site. We keep our own square crop in Storage, with the page it
-- came from and a credit, and take a photo down on request.
--
-- A row reaches a voter only once a person has checked it is the right
-- face (verified_by). A wrong-person photo is the worst failure this table
-- can have, and no automated step is trusted to rule it out.
--
-- All or none is enforced in code (src/lib/headshots.ts racePhotosFor),
-- the same way incumbency and running mates are: the reader returns the
-- race's photos only when every ballot candidate has a verified one.
--
-- Additive only: one new table, one policy, one public bucket. Nothing
-- existing changes, and code deployed before this is applied reads an
-- error, which it treats as "no photos".

BEGIN;

CREATE TABLE IF NOT EXISTS candidate_photo (
  candidate_id    TEXT PRIMARY KEY REFERENCES candidate (candidate_id) ON DELETE CASCADE,
  -- Path inside the candidate-photos bucket, e.g. 'FL-DOE-91310.webp'.
  storage_path    TEXT NOT NULL,
  source_kind     TEXT NOT NULL CHECK (source_kind IN ('official', 'campaign')),
  -- The page the photo was taken from (an official bio page or the
  -- campaign site), shown as the credit's link.
  source_page_url TEXT NOT NULL CHECK (source_page_url ~ '^https://'),
  -- The image file's own URL at the source, kept for re-checks.
  source_image_url TEXT,
  -- What the credit line says, e.g. 'Campaign website' or 'Florida Senate'.
  credit          TEXT NOT NULL CHECK (length(credit) BETWEEN 1 AND 80),
  verified_by     TEXT,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((verified_by IS NULL) = (verified_at IS NULL))
);

ALTER TABLE candidate_photo ENABLE ROW LEVEL SECURITY;

-- Anon sees a verified photo of a candidate whose race is listed or
-- published: the same visibility as candidate_social_account (0033).
DROP POLICY IF EXISTS anon_read_candidate_photo ON candidate_photo;
CREATE POLICY anon_read_candidate_photo ON candidate_photo
  FOR SELECT TO anon
  USING (
    verified_by IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM race r
      JOIN race_publication rp ON rp.race_id = r.race_id
      WHERE candidate_photo.candidate_id = ANY (r.candidate_ids)
        AND rp.status IN ('listed', 'published')
    )
  );

GRANT SELECT ON candidate_photo TO anon;

-- Public-read bucket for the crops. Writes go through the service role
-- only (the collection script); no anon or authenticated write policy.
-- Guarded: storage.buckets exists on Supabase, not in the embedded Postgres
-- scripts/verify-migrations.mjs applies these files to.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('candidate-photos', 'candidate-photos', true, 524288, ARRAY['image/webp', 'image/jpeg'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

COMMIT;
