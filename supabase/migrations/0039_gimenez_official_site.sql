-- official_site for Carlos A. Gimenez (REP, FL-28), on the founder's call.
--
-- 0036 left him NULL on purpose. carlosgimenezforcongress.com is his
-- committee's own site ("Paid For By Carlos Gimenez for Congress"; og:url is
-- the apex), but its copy dates from his 2020 first run -- "Mayor Gimenez ...
-- Now, he's building on this record as a candidate for Congress" -- and never
-- mentions 2026 or District 28. The worry was the ingest quoting 2020
-- positions as current ones.
--
-- Founder decision 2026-09-25: store it. It is the candidate's own campaign
-- site for the office he holds and is running for again, which is what
-- official_site means, and a voter is better served by the link than by
-- nothing. The staleness is a fact about the SITE, recorded in
-- docs/general-election/candidate-sites-2026-09-24.md, and is for the brief
-- pipeline to weigh when it reads the passages (each carries its url and
-- retrieved_at), not a reason to hide the link.
--
-- Re-read 2026-09-25: HTTP 200, same title, same disclaimer, same 2020 copy.
-- robots.txt: `User-agent: *` disallows only /wp-admin/, no AI-crawler
-- groups, no Crawl-delay.
--
-- Idempotent: safe to re-run.

UPDATE candidate SET
  official_site = 'https://carlosgimenezforcongress.com/',
  site_last_verified_at = '2026-09-25T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91226';

-- The FL-28 roster arrives through the DoE intake and is absent from the
-- offline harness (scripts/verify-migrations.mjs), so assert only where the
-- row exists.
DO $$
DECLARE
  n INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM candidate WHERE candidate_id = 'FL-DOE-91226') THEN
    RAISE NOTICE 'FL-DOE-91226 absent (offline harness) - nothing to assert';
    RETURN;
  END IF;

  IF (SELECT official_site FROM candidate WHERE candidate_id = 'FL-DOE-91226')
       IS DISTINCT FROM 'https://carlosgimenezforcongress.com/' THEN
    RAISE EXCEPTION 'FL-DOE-91226 did not take its official_site';
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot'
     AND c.official_site IS NOT NULL;
  IF n <> 97 THEN
    RAISE EXCEPTION 'expected 97 of 106 ballot candidates to have official_site, found %', n;
  END IF;

  RAISE NOTICE '97 of 106 ballot candidates have a verified official_site';
END $$;
