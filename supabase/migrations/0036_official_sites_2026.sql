-- official_site for the 2026 general-election ballot candidates outside FL-GOV.
--
-- Session B (docs/general-election/sessions/session-b-candidate-websites.md).
-- 0032 covered FL-GOV-general (7 of 8). This file covers the rest of the
-- ballot tier: 49 candidates here, 46 with a verified site and
-- 3 recorded as having none. Evidence per candidate, the robots.txt
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


-- ==========================================================================
-- U.S. House (FL-7 to FL-16)
-- ==========================================================================

UPDATE candidate SET
  official_site = 'https://baledalton.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90631';
-- Bale Dalton (DEM), U.S. House, FL-7. title/og:title 'Bale Dalton - Veteran
-- for Florida'; page text 'BALE DALTON FOR CONGRESS: COUNTRY OVER POLITICS'
-- and 'Bale Dalton, a Navy combat veteran and the Democratic nominee in
-- FL-07'; footer 'PAID FOR BY DALTON FOR FLORIDA'

UPDATE candidate SET
  official_site = 'https://dennison4congress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-92377';
-- Christopher Dennison (LPF), U.S. House, FL-7. h1 'Chris Dennison:
-- Libertarian for U.S. Congress (FL D7)'; footer 'Paid for by Christopher
-- "Chris" Dennison for Congress'; title/og:title 'Chris Dennison' (domain not
-- linked from Ballotpedia or any source found; the page self-identifies)

UPDATE candidate SET
  official_site = 'https://elijahforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90696';
-- Ryan Elijah (REP), U.S. House, FL-7. title 'Ryan Elijah for Congress --
-- Florida's 7th Congressional District'; footer 'Paid for by Ryan Elijah for
-- Congress'

UPDATE candidate SET
  official_site = 'https://jenkinsforfl.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90831';
-- Jennifer Jenkins (DEM), U.S. House, FL-8. title/og:title 'Jennifer Jenkins
-- for U.S. Congress'; footer 'Paid for by Jenkins for U.S. Congress'

UPDATE candidate SET
  official_site = 'https://www.mike4congress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89522';
-- Mike Haridopolos (REP), U.S. House, FL-8. title/og:title 'Mike Haridopolos
-- for Congress | Republican for Congress'; footer 'PAID FOR BY MIKE
-- HARIDOPOLOS FOR CONGRESS'

UPDATE candidate SET
  official_site = 'https://dangreenfl.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91337';
-- Dan Green (REP), U.S. House, FL-9. title/og:title 'Dan Green for Congress';
-- footer 'PAID FOR BY DAN GREEN FOR CONGRESS'

UPDATE candidate SET
  official_site = 'https://www.darrensoto.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89339';
-- Darren Soto (DEM), U.S. House, FL-9. title/og:title 'Darren Soto'; text
-- 'CONTRIBUTE FOR FL-09 VOTERS I'm Congressman Darren Soto, and I'm running
-- for re-election'; footer 'PAID FOR AND AUTHORIZED BY DARREN SOTO FOR
-- CONGRESS'

UPDATE candidate SET
  official_site = 'https://www.frostforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89909';
-- Maxwell Alejandro Frost (DEM), U.S. House, FL-10. title/og:title 'Maxwell
-- Frost for Congress'; footer 'PAID FOR BY MAXWELL ALEJANDRO FROST FOR
-- CONGRESS'

UPDATE candidate SET
  official_site = 'https://jamespericola.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91715';
-- James Pericola (DEM), U.S. House, FL-11. title 'James Pericola for Congress
-- | Lower Costs. Common Sense. Results.'; footer 'Paid for by James Pericola
-- for Congress.'

UPDATE candidate SET
  official_site = 'https://votestrada.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91717';
-- Joe Strada (REP), U.S. House, FL-11. title/og:title 'Joe Strada for
-- Congress | Florida's 11th Congressional District | Election Day November 3,
-- 2026'; footer 'PAID FOR BY JOE STRADA FOR CONGRESS'

UPDATE candidate SET
  official_site = 'https://www.grovesforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-88517';
-- Ralph Groves (LPF), U.S. House, FL-11. title/og:title 'Ralph Groves -
-- Libertarian Party | Groves for Congress 2026'; h1 'Ralph Groves for
-- Congress, 2026'; text 'Vote for RALPH GROVES, the Libertarian Party
-- candidate in Florida's 11th Congressional District'

UPDATE candidate SET
  official_site = 'https://brandenscrivenerfl.info/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89778';
-- Branden Scrivener (NPA), U.S. House, FL-12. title/og:title/h1 'Federal
-- Congressional District 12, No Party Affiliation Candidate'; page names
-- 'Branden Scrivener'; footer 'Paid for and authorized by Citizens for
-- Branden Scrivener'

UPDATE candidate SET
  official_site = 'https://bilirakisforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-88868';
-- Gus Michael Bilirakis (REP), U.S. House, FL-12. title 'Gus Bilirakis for
-- Congress | Florida's 12th District'; footer 'Paid for by Bilirakis for
-- Congress'

UPDATE candidate SET
  official_site = 'https://kimberlyoverman.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89453';
-- Kimberly Overman (DEM), U.S. House, FL-12. title 'Kimberly Overman for
-- Congress'; og:title 'Kimberly Overman for Congress - FL-12'; h1 'Kimberly
-- Overman for Congress FL-12'; footer 'Paid For by Overman for Congress'

UPDATE candidate SET
  official_site = 'https://www.brianlambertforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-92395';
-- Brian Lambert (LPF), U.S. House, FL-14. title 'Brian Lambert for Congress |
-- Libertarian Candidate for FL-14'; footer 'Paid for by Brian Lambert for
-- Congress'

UPDATE candidate SET
  official_site = 'https://castorforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-88870';
-- Kathy Castor (DEM), U.S. House, FL-14. title/og:title 'Home - Castor for
-- Congress'; h1 'Kathy Castor: Fighting for Florida'; footer 'PAID FOR BY
-- CASTOR FOR CONGRESS ... Help Kathy Castor continue to fight for FL-14
-- families'

UPDATE candidate SET
  official_site = 'https://beltranforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91313';
-- Mike Beltran (REP), U.S. House, FL-14. title/og:title 'Home - Mike Beltran
-- for Congress'; text '...endorsed Mike Beltran for Florida's 14th
-- Congressional District'; footer 'Paid for by Mike Beltran for Congress'

UPDATE candidate SET
  official_site = 'https://votelaurel.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89121';
-- Laurel Lee (REP), U.S. House, FL-15. title 'Laurel Lee, Republican
-- Candidate for CD15'; h1 'CONSERVATIVE LEADER FOR CONGRESSIONAL DISTRICT
-- 15'; footer 'PAID FOR BY LAUREL LEE FOR CONGRESS'

UPDATE candidate SET
  official_site = 'https://www.peopleforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89116';
-- Robert People (DEM), U.S. House, FL-15. title/og:title 'HOME | People For
-- Congress'; h1 'ROBERT PEOPLE', 'General Election: November 3, 2026'; text
-- 'U.S. HOUSE OF REPRESENTATIVES FLORIDA CD-15 ROBERT PEOPLE'; footer
-- 'Copyright 2026 Robert People for Congress'

UPDATE candidate SET
  official_site = 'https://kellykirschner.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90779';
-- Kelly Kirschner (DEM), U.S. House, FL-16. title/og:title 'Kelly Kirschner
-- for U.S. Congress - FL 16 - Let's Fix This'; footer 'PAID FOR BY KELLY
-- KIRSCHNER FOR CONGRESS'

UPDATE candidate SET
  official_site = 'https://markdavisforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89623';
-- Mark Davis (NPA), U.S. House, FL-16. title/og:title 'Mark Davis for
-- Congress | Join the Campaign - Make a Difference'; text '...in Congress
-- (FL-16)'; footer 'Paid by Mark Davis for US House of Representatives
-- Florida Congressional District 16.'

UPDATE candidate SET
  official_site = 'https://grutersforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90251';
-- Sydney Gruters (REP), U.S. House, FL-16. title/og:title 'Sydney Gruters For
-- Congress'; footer 'PAID FOR BY SYDNEY GRUTERS FOR CONGRESS'


-- ==========================================================================
-- U.S. House (FL-20 to FL-28)
-- ==========================================================================

UPDATE candidate SET
  official_site = 'https://brentandersenfl.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91278';
-- Brent Andersen (REP), U.S. House, FL-20. title 'Brent Andersen for
-- Congress'; footer 'Paid for by ANDERSEN FOR CONGRESS' (read with a plain
-- fetch; the site fronts a SiteGround challenge)

UPDATE candidate SET
  official_site = 'https://debbiewassermanschultz.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91577';
-- Debbie Wasserman Schultz (DEM), U.S. House, FL-20. Live homepage:
-- title/og:title 'Debbie Wasserman Schultz | Democrat for Congress'; og:url
-- https://debbiewassermanschultz.com/; footer 'PAID FOR BY DEBBIE WASSERMAN
-- SCHULTZ FOR CONGRESS'; page features 'Debbie Wasserman Schultz wins primary
-- -- this time in Florida's 20th District'

UPDATE candidate SET
  official_site = 'https://www.maximeforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90814';
-- Kedner Maxime (IND), U.S. House, FL-20. Live homepage: title/og:title
-- 'Kedner Maxime for Congress -- District 20 Florida'; h1 'Service Over
-- Politics. Solutions Over Promises.'; footer 'Paid for by Dr. Kedner Maxime
-- for Congress, Inc.'

UPDATE candidate SET
  official_site = 'https://www.caseyaskar.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-92109';
-- Casey Askar (REP), U.S. House, FL-22. Live homepage: title/og:title 'Casey
-- Askar for Congress'; footer 'PAID FOR BY CASEY FOR CONGRESS'; body cites
-- 'Casey Askar launches bid for Florida's District 22 seat'

UPDATE candidate SET
  official_site = 'https://piaforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89301';
-- Pia Dandiya (DEM), U.S. House, FL-22. title 'Pia Dandiya for Congress - A
-- New Future for Florida'; footer 'Paid for by Pia Dandiya for Congress'
-- (live read on retry past a SiteGround challenge)

UPDATE candidate SET
  official_site = 'https://olivergilbert.vote/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91544';
-- Oliver G. Gilbert III (DEM), U.S. House, FL-24. title 'Oliver Gilbert for
-- Congress'; footer 'Paid for by Oliver Gilbert for Congress' (live read on
-- retry past a SiteGround challenge)

UPDATE candidate SET
  official_site = 'https://tebrownforflorida.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90703';
-- Te Mayonna Brown (REP), U.S. House, FL-24. Live homepage: title 'Home - Te
-- Brown For Congress'; og:url https://tebrownforflorida.com/; footer 'Paid
-- for by Te Brown for Congress 20200 West Dixie Highway Suite 902, Aventura,
-- FL, 33180'; body 'support Te's campaign for Florida's 24th District'

UPDATE candidate SET
  official_site = 'https://jaredforflorida.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-88911';
-- Jared Moskowitz (DEM), U.S. House, FL-25. Live homepage (read.mjs):
-- title/og:title 'Jared Moskowitz for Congress -- Independent Leadership.
-- Real Results.'; og:url https://jaredforflorida.com/. Wayback 2026-08-20
-- capture also shows footer 'Paid for by Jared Moskowitz for Congress'

UPDATE candidate SET
  official_site = 'https://www.scottsingerusa.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89801';
-- Scott Singer (REP), U.S. House, FL-25. Live homepage: title/og:title 'SCOTT
-- SINGER FOR CONGRESS'; og:url https://www.scottsingerusa.com; body 'Boca
-- Raton Mayor Scott Singer is the Republican nominee running to represent
-- Florida's 25th district in Congress'; footer 'Scott Singer for Congress PO
-- Box 810335 Boca Raton, FL 33481'

UPDATE candidate SET
  official_site = 'https://mariodiazbalart.org/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90330';
-- Mario Diaz-Balart (REP), U.S. House, FL-26. Live homepage: title 'Mario
-- Diaz-Balart for Congress 2026 | Florida's 26th District'; og:title 'Mario
-- Diaz-Balart for Congress 2026'; footer 'PAID FOR BY MARIO DIAZ-BALART FOR
-- CONGRESS 2026'

UPDATE candidate SET
  official_site = 'https://locklinforcongress.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89980';
-- Nicole Locklin (DEM), U.S. House, FL-26. Live homepage: title 'Nicole
-- Locklin for Congress'; og:title 'Nicole Locklin for U.S. Congress | Florida
-- District 26'; footer 'Nicole Locklin for U.S. Congress 1808 N. University
-- Dr, Pembroke Pines, FL 33024'

UPDATE candidate SET
  official_site = 'https://eliottrodriguez.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-89933';
-- Eliott Rodriguez (DEM), U.S. House, FL-27. Live homepage: title 'Eliott
-- Rodriguez - For Congress'; footer 'Paid for by Eliott Rodriguez for
-- Congress'

UPDATE candidate SET
  official_site = 'https://mariaelvirasalazar.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90721';
-- Maria Elvira Salazar (REP), U.S. House, FL-27. Live homepage: title 'Maria
-- Elvira Salazar for Congress - Fighting for FL-27'; og:title 'Maria Salazar
-- for Congress'; og:url https://mariaelvirasalazar.com/; footer 'Paid for by
-- Salazar for Congress', ' 2026 Maria Elvira Salazar for Congress'

UPDATE candidate SET
  official_site = 'https://www.eddyrojas.com/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-90340';
-- Eddy Rojas (NPA), U.S. House, FL-28. Live homepage: title/og:title 'Eddy
-- Rojas for Congress - District 28 | district 28 | Miami-Dade, FL, USA'; h1
-- 'Running for U.S. Congress -- Florida District 28'; /about title 'About |
-- ROJAS FOR CONGRESS'

UPDATE candidate SET
  official_site = 'https://ehrforcongress.us/',
  site_last_verified_at = '2026-09-24T00:00:00Z'
WHERE candidate_id = 'FL-DOE-91699';
-- Phil "Felipe" Ehr (DEM), U.S. House, FL-28. Live homepage: title/og:title
-- 'Vote Phil Ehr for U.S. House of Representatives'; og:url
-- https://ehrforcongress.us/; footer 'PAID FOR BY EHR FORCE INC'; body
-- 'DONATE FL-28 Bike Tour', 'FL-28 Debate Request', 'Help us defeat Gimenez'

-- No official_site (recorded NULL, see the doc for the full reason):
--   FL-DOE-92357, Peter Jassenoff: Nothing found: no site on Ballotpedia,
--   BallotReady, his FEC committee record or the national LP candidate page
--   (lp.org/candidate/peter-jassenoff, bio only); lpf.org is behind a
--   Cloudflare challenge.
--   FL-DOE-92137, Deborah Ann Meidinger Hosey: Nothing found: no site on
--   Ballotpedia or BallotReady; her FEC filing gives only an email at
--   damhforcongress.com, which serves no website.
--   FL-DOE-91226, Carlos A. Gimenez: Campaign site exists
--   (carlosgimenezforcongress.com) but its copy is from the 2020 first run
--   and never mentions 2026 or District 28; not stored so the ingest does not
--   quote 2020 positions as current. Founder decision.


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
   WHERE candidate_id IN ('FL-DOE-89119', 'FL-DOE-90009', 'FL-DOE-89955', 'FL-DOE-89041', 'FL-DOE-89231', 'FL-DOE-91310', 'FL-DOE-89394', 'FL-DOE-92013', 'FL-DOE-90560', 'FL-DOE-90631', 'FL-DOE-92377', 'FL-DOE-90696', 'FL-DOE-90831', 'FL-DOE-89522', 'FL-DOE-91337', 'FL-DOE-89339', 'FL-DOE-89909', 'FL-DOE-91715', 'FL-DOE-91717', 'FL-DOE-88517', 'FL-DOE-89778', 'FL-DOE-88868', 'FL-DOE-89453', 'FL-DOE-92395', 'FL-DOE-88870', 'FL-DOE-91313', 'FL-DOE-89121', 'FL-DOE-89116', 'FL-DOE-90779', 'FL-DOE-89623', 'FL-DOE-90251', 'FL-DOE-91278', 'FL-DOE-91577', 'FL-DOE-90814', 'FL-DOE-92109', 'FL-DOE-89301', 'FL-DOE-91544', 'FL-DOE-90703', 'FL-DOE-88911', 'FL-DOE-89801', 'FL-DOE-90330', 'FL-DOE-89980', 'FL-DOE-89933', 'FL-DOE-90721', 'FL-DOE-90340', 'FL-DOE-91699')
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
  IF n_sited <> 53 THEN
    RAISE EXCEPTION 'expected 53 of 106 ballot candidates to have official_site (7 from 0032 + 46 here), found %', n_sited;
  END IF;

  RAISE NOTICE '53 of 106 ballot candidates have a verified official_site';
END $$;
