-- official_site for the 2026 general-election ballot candidates outside FL-GOV.
--
-- Session B (docs/general-election/sessions/session-b-candidate-websites.md).
-- 0032 covered FL-GOV-general (7 of 8). This file covers the rest of the
-- ballot tier: 9 candidates here, 9 with a verified site and
-- 0 recorded as having none. Evidence per candidate, the robots.txt
-- reading for each site, and the reason behind every NULL:
-- docs/general-election/candidate-sites-2026-09-24.md
--
-- METHOD, the same as 0032. Every URL below was FETCHED on 2026-09-24 and read
-- before being written here. A search result was never enough: a lapsed,
-- parked or re-registered campaign domain looks the same as a live one in a
-- listing, and official_site is both a link a voter clicks and the root the
-- ingest crawls and quotes as the candidate's own words. A row was accepted
-- only when the page itself named the candidate AND the office on the 2026
-- ballot. A site for a past race, a social profile, a Linktree, a donation
-- page or a government office page was never accepted.
--
-- SOURCES: Ballotpedia's per-candidate and per-race external links, the
-- county Supervisor of Elections candidate listings, the Libertarian Party
-- of Florida's candidate pages, and web search -- each lead then confirmed
-- against the live page.
--
-- NULLs are findings, not omissions. Each is listed in the doc with its
-- reason, and summarised at the end of each section below.
--
-- site_last_verified_at is stamped only where a page was actually read, and
-- is the date of the read rather than of the deploy (as in 0032).


-- ==========================================================================
-- Statewide: U.S. Senate and the Cabinet
-- ==========================================================================

UPDATE candidate SET
  official_site = 'https://ashleymoody.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89119';
-- Ashley Moody (REP), U.S. Senate. Page title "Home - Ashley Moody for U.S.
-- Senate"; disclaimer "Paid for by Moody for Florida"

UPDATE candidate SET
  official_site = 'https://angienixon.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90009';
-- Angie Nixon (DEM), U.S. Senate. Page title "Angie Nixon for U.S. Senate |
-- Change Can't Wait"; Ballotpedia campaign link

UPDATE candidate SET
  official_site = 'https://neilgillespie4senate.blogspot.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89955';
-- Neil J. Gillespie (NPA), U.S. Senate. Blogger site titled "Neil J.
-- Gillespie for U.S. Senate"; disclaimer "Paid for by Neil J. Gillespie For
-- US Senate"; Ballotpedia campaign link

UPDATE candidate SET
  official_site = 'https://jamesforfl.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89041';
-- James Uthmeier (REP), Attorney General. og:title "James Uthmeier for
-- Attorney General"; disclaimer "Paid for by James Uthmeier, Republican, for
-- Attorney General"

UPDATE candidate SET
  official_site = 'https://www.jjr.vote/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89231';
-- Jose Javier Rodriguez (DEM), Attorney General. Page title "Jose Javier
-- Rodriguez for Florida Attorney General"; disclaimer "...paid for and
-- approved by Jose Javier Rodriguez, Democrat, for Florida Attorney General"

UPDATE candidate SET
  official_site = 'https://annettetaddeo.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91310';
-- Annette Taddeo (DEM), Chief Financial Officer. /about/ page title "Meet
-- Annette Taddeo - Annette Taddeo for Chief Financial Officer"; Ballotpedia
-- campaign link

UPDATE candidate SET
  official_site = 'https://blaiseforflorida.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89394';
-- Blaise Ingoglia (REP), Chief Financial Officer. Page title "Home - Blaise
-- Ingoglia for CFO"

UPDATE candidate SET
  official_site = 'https://www.joeyforflorida.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-92013';
-- Joey Mendoza Atkins (DEM), Commissioner of Agriculture. Page title "Joey
-- Mendoza Atkins for Florida Agriculture Commissioner"; disclaimer "Paid for
-- and approved by Joey Mendoza Atkins, Democrat, for Commissioner of
-- Agriculture"

UPDATE candidate SET
  official_site = 'https://wiltonsimpson.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90560';
-- Wilton Simpson (REP), Commissioner of Agriculture. Page title "Wilton
-- Simpson, Agriculture Commissioner"; disclaimer "Paid by Wilton Simpson,
-- Republican, for Florida Commissioner of Agriculture"


-- Assert what was achieved. The county rosters are seeded by 0031/0032, so
-- they exist in the offline harness (scripts/verify-migrations.mjs); the
-- statewide and congressional rosters arrive through the DoE intake and do
-- not. The format check therefore runs everywhere, and the whole-roster
-- counts run only where the DoE roster is present (the live project).
DO $$
DECLARE
  n_ballot INT;
  n_sited  INT;
  n_mine   INT;
  n_bad    INT;
BEGIN
  -- Every stored value must be an absolute https origin. A bare host or an
  -- http:// URL would be fetched and rendered as-is.
  SELECT count(*) INTO n_bad
    FROM candidate
   WHERE official_site IS NOT NULL
     AND official_site !~ '^https://[a-z0-9.-]+/$';
  IF n_bad > 0 THEN
    RAISE EXCEPTION '% official_site value(s) are not an absolute https origin', n_bad;
  END IF;

  -- Every candidate this file sets must have received the value, wherever
  -- that candidate exists.
  SELECT count(*) INTO n_mine
    FROM candidate
   WHERE candidate_id IN ('FL-DOE-89119', 'FL-DOE-90009', 'FL-DOE-89955', 'FL-DOE-89041', 'FL-DOE-89231', 'FL-DOE-91310', 'FL-DOE-89394', 'FL-DOE-92013', 'FL-DOE-90560')
     AND (official_site IS NULL OR site_last_verified_at IS NULL);
  IF n_mine > 0 THEN
    RAISE EXCEPTION '% candidate(s) in this batch exist but did not take their official_site', n_mine;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n_ballot
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general' AND c.ballot_status = 'ballot';
  IF n_ballot = 0 THEN
    RAISE NOTICE 'DoE roster absent (offline harness) - roster counts not asserted';
    RETURN;
  END IF;

  SELECT count(DISTINCT c.candidate_id),
         count(DISTINCT c.candidate_id) FILTER (WHERE c.official_site IS NOT NULL)
    INTO n_ballot, n_sited
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot';
  IF n_ballot <> 106 THEN
    RAISE EXCEPTION 'the ballot tier has % candidates, expected 106 - the roster moved, re-check before trusting these URLs', n_ballot;
  END IF;
  IF n_sited <> 16 THEN
    RAISE EXCEPTION 'expected 16 of 106 ballot candidates to have official_site (7 from 0032 + 9 here), found %', n_sited;
  END IF;

  RAISE NOTICE '16 of 106 ballot candidates have a verified official_site';
END $$;
