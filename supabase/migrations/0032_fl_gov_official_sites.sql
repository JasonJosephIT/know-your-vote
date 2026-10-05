-- official_site for the eight FL-GOV-general ballot candidates.
--
-- WHY THIS IS THE FIRST BLOCKER. scripts/candidate-site-ingest.ts takes
-- `--site <url>`, so the entire policy pipeline -- ingest, the Noul pass, and
-- the brief writer added in src/lib/brief-rows.ts -- has no input for a
-- candidate whose official_site is NULL. Before this migration that was all 91
-- ballot candidates, so the pipeline could not run for a single real person.
-- FL-GOV-general is the largest single unblock at 8 candidates
-- (docs/general-election/profile-intake-handoff-2026-09-21.md §5/§6).
-- official_site also renders on the brief and directory pages, so these rows
-- have value before any ingest runs.
--
-- METHOD, and why it is not just a search. Every URL below was FETCHED on
-- 2026-09-21 and read before being written here. A campaign domain that has
-- lapsed, been parked, or been taken by someone else looks identical to a live
-- one in a search result, and the failure is not cosmetic: official_site is a
-- link a voter clicks, and it is the root the ingest crawls and then quotes as
-- the candidate's own words. Each row was accepted only when the page itself
-- named the candidate and the office. Evidence per candidate:
-- docs/general-election/candidate-sites-2026-09-21.md
--
-- SOURCES: Ballotpedia's per-candidate External links, the Libertarian Party's
-- own candidate page for the LPF nominee, and in two cases the campaign
-- contact address Ballotpedia publishes (Team@russo2026.com, info@deanabrams.com)
-- corroborating the domain. All then confirmed against the live page.
--
-- DATTO IS DELIBERATELY LEFT NULL -- see the note below the UPDATEs. That is a
-- finding, not an omission.
--
-- site_last_verified_at is stamped only where a page was actually read, which
-- is what src/lib/admin/monitor.ts reports on. It is the date of the read, not
-- of the deploy, so it is written as a literal rather than NOW().

UPDATE candidate SET
  official_site = 'https://scottjewett.com/',
  site_last_verified_at = '2026-09-21T00:00:00Z'
WHERE candidate_id = 'FL-DOE-84076';
-- Scott Eckhard Jewett (LPF). Page title "Scott Jewett for Florida Governor -
-- Libertarian Party"; also listed on lp.org's own candidate page.

UPDATE candidate SET
  official_site = 'https://nomoecorruption.com/',
  site_last_verified_at = '2026-09-21T00:00:00Z'
WHERE candidate_id = 'FL-DOE-88529';
-- Moliere "Moe" Dimanche (NPA). Page title "No MOE Corruption - Moe Dimanche
-- For Governor of Florida". The domain does not carry the candidate's name,
-- which is why it was confirmed against the page rather than inferred.

UPDATE candidate SET
  official_site = 'https://byrondonalds.com/',
  site_last_verified_at = '2026-09-21T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89042';
-- Byron Donalds (REP). Page title "Home - Byron Donalds for Governor".

UPDATE candidate SET
  official_site = 'https://davidjolly.com/',
  site_last_verified_at = '2026-09-21T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89243';
-- David Jolly (DEM). og:title "David Jolly for Governor - Florida 2026".

UPDATE candidate SET
  official_site = 'https://russo2026.com/',
  site_last_verified_at = '2026-09-21T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89571';
-- Frank J. Russo (NPA). "Russo-Rodriguez 2026"; the apex 302s to /en, so the
-- apex is stored rather than a language path -- the ingest follows the
-- redirect and isSameSite() treats both as one site, while pinning /en would
-- silently choose a language on the candidate's behalf.

UPDATE candidate SET
  official_site = 'https://www.deanabrams.com/',
  site_last_verified_at = '2026-09-21T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90433';
-- Dean Ocean Abrams (NPA). Page title "Dean Abrams for Governor"; www is the
-- canonical host here (og:url), not a redirect target.

UPDATE candidate SET
  official_site = 'https://burkettforgov.com/',
  site_last_verified_at = '2026-09-21T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90630';
-- Charles Burkett (NPA). Carries the F.S. 106.143 disclaimer "Political
-- advertisement paid for and approved by Charles Burkett, NPA, for Florida
-- Governor" -- the strongest self-identification of the eight.

-- FL-DOE-89630, Jeffrey Peter "Dr. Jeff" Datto (NPA): NO official_site.
--
-- Ballotpedia lists no campaign website for him, only campaign X, Instagram
-- and YouTube accounts. His own X bio and social posts advertise
-- "DrJeffDatto.com" -- and that domain serves a NAMECHEAP DOMAIN-PARKING PAGE
-- listing unrelated domains for auction (read 2026-09-21; the apex does not
-- resolve, http:// redirects to the parked www host).
--
-- Writing it would have put a parking page behind a candidate's name on the
-- brief, and pointed the ingest at auction copy to quote back as his stated
-- positions. NULL is the true value: we looked, and there is no site to read.
-- The same distinction the briefs make between silence and absence applies to
-- the roster, so this is recorded here and in the doc rather than left to look
-- like an oversight. A social-only candidate is a real case the pipeline does
-- not yet cover.

-- Assert what was actually achieved, on the live project. The FL-GOV roster
-- arrives through the DoE intake pipeline and is NOT seeded by any migration,
-- so it is absent when this file is replayed against the embedded Postgres in
-- scripts/verify-migrations.mjs. Assert conditionally rather than either
-- failing that harness or dropping the check where it matters.
DO $$
DECLARE
  n_ballot INT;
  n_sited  INT;
  n_bad    INT;
BEGIN
  SELECT count(*) INTO n_ballot
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general' AND c.ballot_status = 'ballot';

  IF n_ballot = 0 THEN
    RAISE NOTICE 'FL-GOV-general roster absent (offline harness) - nothing to assert';
    RETURN;
  END IF;

  IF n_ballot <> 8 THEN
    RAISE EXCEPTION 'FL-GOV-general has % ballot candidates, expected 8 - the roster moved, re-collect before trusting these URLs', n_ballot;
  END IF;

  SELECT count(*) INTO n_sited
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general' AND c.ballot_status = 'ballot'
     AND c.official_site IS NOT NULL AND c.official_site <> '';

  IF n_sited <> 7 THEN
    RAISE EXCEPTION 'expected 7 of 8 FL-GOV-general candidates to have official_site, found %', n_sited;
  END IF;

  -- Every stored value must be an absolute https origin. A bare host or an
  -- http:// URL would be fetched and rendered as-is.
  SELECT count(*) INTO n_bad
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general' AND c.official_site IS NOT NULL
     AND c.official_site !~ '^https://[a-z0-9.-]+/$';

  IF n_bad > 0 THEN
    RAISE EXCEPTION '% official_site value(s) are not an absolute https origin', n_bad;
  END IF;

  RAISE NOTICE 'FL-GOV-general: 7 of 8 ballot candidates have a verified official_site (Datto has no site)';
END $$;
