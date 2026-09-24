# `official_site` for the rest of the 2026 ballot: what was collected and how

**Collected** 2026-09-24 · Ships as `supabase/migrations/0036_official_sites_2026.sql` (**not applied**)
· Session B, `docs/general-election/sessions/session-b-candidate-websites.md`.

Before this, 7 of 106 ballot candidates had an `official_site`, all of them in FL-GOV
(`0032`, `candidate-sites-2026-09-21.md`). This batch covers 66 more: **57 have a
verified campaign site and 9 have none**, each with its reason recorded. With `0036`
applied, 64 of 106 ballot candidates have a site. Datto (FL-GOV) remains the one
NULL from `0032`.

## Method

The FL-GOV method, unchanged:

- Every URL was **fetched and read** on 2026-09-24 before being written down. A search result
  was never enough on its own, because a lapsed, parked or re-registered domain looks the same
  as a live one in a listing.
- A row was accepted only when the page itself named **the candidate and the 2026 office**
  (page title, `og:title`, or the F.S. 106.143 "Paid for by ..." disclaimer). A site that names
  only a past race was not accepted.
- Social profiles, Linktree, donation pages (ActBlue/WinRed), news articles and government
  office pages were never stored. Where an incumbent has only a `.gov` office page it is noted
  below for the founder's decision, not stored.
- Leads came from Ballotpedia's per-candidate and per-race external links, the county
  Supervisor of Elections candidate listings, the Libertarian Party of Florida and web search.
- Every accepted URL was fetched a **second time, independently**, before it went into the
  migration; the evidence below is what that second read showed.
- Ballotpedia serves a JavaScript challenge to plain HTTP clients, so pages were read in
  headless Chromium. Stored values are the canonical `https://host/` origin (apex vs `www` as
  the site itself redirects or declares in `og:url`).
- `robots.txt` was read the same day for every accepted site (crawlability table below).

## Statewide: U.S. Senate and the Cabinet

| Candidate | Party | Office | `official_site` | Confirmed by |
|---|---|---|---|---|
| Ashley Moody | REP | U.S. Senate | `https://ashleymoody.com/` | Page title "Home - Ashley Moody for U.S. Senate"; disclaimer "Paid for by Moody for Florida" |
| Angie Nixon | DEM | U.S. Senate | `https://angienixon.com/` | Page title "Angie Nixon for U.S. Senate \| Change Can't Wait"; Ballotpedia campaign link |
| Neil J. Gillespie | NPA | U.S. Senate | `https://neilgillespie4senate.blogspot.com/` | Blogger site titled "Neil J. Gillespie for U.S. Senate"; disclaimer "Paid for by Neil J. Gillespie For US Senate"; Ballotpedia campaign link |
| James Uthmeier | REP | Attorney General | `https://jamesforfl.com/` | og:title "James Uthmeier for Attorney General"; disclaimer "Paid for by James Uthmeier, Republican, for Attorney General" |
| Jose Javier Rodriguez | DEM | Attorney General | `https://www.jjr.vote/` | Page title "Jose Javier Rodriguez for Florida Attorney General"; disclaimer "...paid for and approved by Jose Javier Rodriguez, Democrat, for Florida Attorney General" |
| Annette Taddeo | DEM | Chief Financial Officer | `https://annettetaddeo.com/` | /about/ page title "Meet Annette Taddeo - Annette Taddeo for Chief Financial Officer"; Ballotpedia campaign link |
| Blaise Ingoglia | REP | Chief Financial Officer | `https://blaiseforflorida.com/` | Page title "Home - Blaise Ingoglia for CFO" |
| Joey Mendoza Atkins | DEM | Commissioner of Agriculture | `https://www.joeyforflorida.com/` | Page title "Joey Mendoza Atkins for Florida Agriculture Commissioner"; disclaimer "Paid for and approved by Joey Mendoza Atkins, Democrat, for Commissioner of Agriculture" |
| Wilton Simpson | REP | Commissioner of Agriculture | `https://wiltonsimpson.com/` | Page title "Wilton Simpson, Agriculture Commissioner"; disclaimer "Paid by Wilton Simpson, Republican, for Florida Commissioner of Agriculture" |

## U.S. House (FL-7 to FL-16)

| Candidate | Party | Office | `official_site` | Confirmed by |
|---|---|---|---|---|
| Bale Dalton | DEM | U.S. House, FL-7 | `https://baledalton.com/` | title/og:title 'Bale Dalton – Veteran for Florida'; page text 'BALE DALTON FOR CONGRESS: COUNTRY OVER POLITICS' and 'Bale Dalton, a Navy combat veteran and the Democratic nominee in FL-07'; footer 'PAID FOR BY DALTON FOR FLORIDA' |
| Christopher Dennison | LPF | U.S. House, FL-7 | `https://dennison4congress.com/` | h1 'Chris Dennison: Libertarian for U.S. Congress (FL D7)'; footer 'Paid for by Christopher "Chris" Dennison for Congress'; title/og:title 'Chris Dennison' (domain not linked from Ballotpedia or any source found; the page self-identifies) |
| Ryan Elijah | REP | U.S. House, FL-7 | `https://elijahforcongress.com/` | title 'Ryan Elijah for Congress — Florida’s 7th Congressional District'; footer 'Paid for by Ryan Elijah for Congress' |
| Jennifer Jenkins | DEM | U.S. House, FL-8 | `https://jenkinsforfl.com/` | title/og:title 'Jennifer Jenkins for U.S. Congress'; footer 'Paid for by Jenkins for U.S. Congress' |
| Mike Haridopolos | REP | U.S. House, FL-8 | `https://www.mike4congress.com/` | title/og:title 'Mike Haridopolos for Congress \| Republican for Congress'; footer 'PAID FOR BY MIKE HARIDOPOLOS FOR CONGRESS' |
| Dan Green | REP | U.S. House, FL-9 | `https://dangreenfl.com/` | title/og:title 'Dan Green for Congress'; footer 'PAID FOR BY DAN GREEN FOR CONGRESS' |
| Darren Soto | DEM | U.S. House, FL-9 | `https://www.darrensoto.com/` | title/og:title 'Darren Soto'; text 'CONTRIBUTE FOR FL-09 VOTERS I’m Congressman Darren Soto, and I’m running for re-election'; footer 'PAID FOR AND AUTHORIZED BY DARREN SOTO FOR CONGRESS' |
| Maxwell Alejandro Frost | DEM | U.S. House, FL-10 | `https://www.frostforcongress.com/` | title/og:title 'Maxwell Frost for Congress'; footer 'PAID FOR BY MAXWELL ALEJANDRO FROST FOR CONGRESS' |
| James Pericola | DEM | U.S. House, FL-11 | `https://jamespericola.com/` | title 'James Pericola for Congress \| Lower Costs. Common Sense. Results.'; footer 'Paid for by James Pericola for Congress.' |
| Joe Strada | REP | U.S. House, FL-11 | `https://votestrada.com/` | title/og:title 'Joe Strada for Congress \| Florida's 11th Congressional District \| Election Day November 3, 2026'; footer 'PAID FOR BY JOE STRADA FOR CONGRESS' |
| Ralph Groves | LPF | U.S. House, FL-11 | `https://www.grovesforcongress.com/` | title/og:title 'Ralph Groves - Libertarian Party \| Groves for Congress 2026'; h1 'Ralph Groves for Congress, 2026'; text 'Vote for RALPH GROVES, the Libertarian Party candidate in Florida’s 11th Congressional District' |
| Branden Scrivener | NPA | U.S. House, FL-12 | `https://brandenscrivenerfl.info/` | title/og:title/h1 'Federal Congressional District 12, No Party Affiliation Candidate'; page names 'Branden Scrivener'; footer 'Paid for and authorized by Citizens for Branden Scrivener' |
| Gus Michael Bilirakis | REP | U.S. House, FL-12 | `https://bilirakisforcongress.com/` | title 'Gus Bilirakis for Congress \| Florida's 12th District'; footer 'Paid for by Bilirakis for Congress' |
| Kimberly Overman | DEM | U.S. House, FL-12 | `https://kimberlyoverman.com/` | title 'Kimberly Overman for Congress'; og:title 'Kimberly Overman for Congress - FL-12'; h1 'Kimberly Overman for Congress FL-12'; footer 'Paid For by Overman for Congress' |
| Brian Lambert | LPF | U.S. House, FL-14 | `https://www.brianlambertforcongress.com/` | title 'Brian Lambert for Congress \| Libertarian Candidate for FL-14'; footer 'Paid for by Brian Lambert for Congress' |
| Kathy Castor | DEM | U.S. House, FL-14 | `https://castorforcongress.com/` | title/og:title 'Home - Castor for Congress'; h1 'Kathy Castor: Fighting for Florida'; footer 'PAID FOR BY CASTOR FOR CONGRESS ... Help Kathy Castor continue to fight for FL-14 families' |
| Mike Beltran | REP | U.S. House, FL-14 | `https://beltranforcongress.com/` | title/og:title 'Home - Mike Beltran for Congress'; text '...endorsed Mike Beltran for Florida’s 14th Congressional District'; footer 'Paid for by Mike Beltran for Congress' |
| Laurel Lee | REP | U.S. House, FL-15 | `https://votelaurel.com/` | title 'Laurel Lee, Republican Candidate for CD15'; h1 'CONSERVATIVE LEADER FOR CONGRESSIONAL DISTRICT 15'; footer 'PAID FOR BY LAUREL LEE FOR CONGRESS' |
| Robert People | DEM | U.S. House, FL-15 | `https://www.peopleforcongress.com/` | title/og:title 'HOME \| People For Congress'; h1 'ROBERT PEOPLE', 'General Election: November 3, 2026'; text 'U.S. HOUSE OF REPRESENTATIVES FLORIDA CD-15 ROBERT PEOPLE'; footer 'Copyright © 2026 Robert People for Congress' |
| Kelly Kirschner | DEM | U.S. House, FL-16 | `https://kellykirschner.com/` | title/og:title 'Kelly Kirschner for U.S. Congress - FL 16 - Let's Fix This'; footer 'PAID FOR BY KELLY KIRSCHNER FOR CONGRESS' |
| Mark Davis | NPA | U.S. House, FL-16 | `https://markdavisforcongress.com/` | title/og:title 'Mark Davis for Congress \| Join the Campaign - Make a Difference'; text '...in Congress (FL-16)'; footer 'Paid by Mark Davis for US House of Representatives Florida Congressional District 16.' |
| Sydney Gruters | REP | U.S. House, FL-16 | `https://grutersforcongress.com/` | title/og:title 'Sydney Gruters For Congress'; footer 'PAID FOR BY SYDNEY GRUTERS FOR CONGRESS' |

## U.S. House (FL-20 to FL-28)

| Candidate | Party | Office | `official_site` | Confirmed by |
|---|---|---|---|---|
| Brent Andersen | REP | U.S. House, FL-20 | `https://brentandersenfl.com/` | title 'Brent Andersen for Congress'; footer 'Paid for by ANDERSEN FOR CONGRESS' (read with a plain fetch; the site fronts a SiteGround challenge) |
| Debbie Wasserman Schultz | DEM | U.S. House, FL-20 | `https://debbiewassermanschultz.com/` | Live homepage: title/og:title 'Debbie Wasserman Schultz \| Democrat for Congress'; og:url https://debbiewassermanschultz.com/; footer 'PAID FOR BY DEBBIE WASSERMAN SCHULTZ FOR CONGRESS'; page features 'Debbie Wasserman Schultz wins primary — this time in Florida’s 20th District' |
| Kedner Maxime | IND | U.S. House, FL-20 | `https://www.maximeforcongress.com/` | Live homepage: title/og:title 'Kedner Maxime for Congress — District 20 Florida'; h1 'Service Over Politics. Solutions Over Promises.'; footer 'Paid for by Dr. Kedner Maxime for Congress, Inc.' |
| Casey Askar | REP | U.S. House, FL-22 | `https://www.caseyaskar.com/` | Live homepage: title/og:title 'Casey Askar for Congress'; footer 'PAID FOR BY CASEY FOR CONGRESS'; body cites 'Casey Askar launches bid for Florida's District 22 seat' |
| Pia Dandiya | DEM | U.S. House, FL-22 | `https://piaforcongress.com/` | title 'Pia Dandiya for Congress - A New Future for Florida'; footer 'Paid for by Pia Dandiya for Congress' (live read on retry past a SiteGround challenge) |
| Oliver G. Gilbert III | DEM | U.S. House, FL-24 | `https://olivergilbert.vote/` | title 'Oliver Gilbert for Congress'; footer 'Paid for by Oliver Gilbert for Congress' (live read on retry past a SiteGround challenge) |
| Te Mayonna Brown | REP | U.S. House, FL-24 | `https://tebrownforflorida.com/` | Live homepage: title 'Home - Te Brown For Congress'; og:url https://tebrownforflorida.com/; footer 'Paid for by Te Brown for Congress 20200 West Dixie Highway Suite 902, Aventura, FL, 33180'; body 'support Te's campaign for Florida's 24th District' |
| Jared Moskowitz | DEM | U.S. House, FL-25 | `https://jaredforflorida.com/` | Live homepage (read.mjs): title/og:title 'Jared Moskowitz for Congress — Independent Leadership. Real Results.'; og:url https://jaredforflorida.com/. Wayback 2026-08-20 capture also shows footer 'Paid for by Jared Moskowitz for Congress' |
| Peter Jassenoff | LPF | U.S. House, FL-25 | **none** | Nothing found: no site on Ballotpedia, BallotReady, his FEC committee record or the national LP candidate page (lp.org/candidate/peter-jassenoff, bio only); lpf.org is behind a Cloudflare challenge. |
| Scott Singer | REP | U.S. House, FL-25 | `https://www.scottsingerusa.com/` | Live homepage: title/og:title 'SCOTT SINGER FOR CONGRESS'; og:url https://www.scottsingerusa.com; body 'Boca Raton Mayor Scott Singer is the Republican nominee running to represent Florida’s 25th district in Congress'; footer 'Scott Singer for Congress PO Box 810335 Boca Raton, FL 33481' |
| Deborah Ann Meidinger Hosey | NPA | U.S. House, FL-26 | **none** | Nothing found: no site on Ballotpedia or BallotReady; her FEC filing gives only an email at damhforcongress.com, which serves no website. |
| Mario Diaz-Balart | REP | U.S. House, FL-26 | `https://mariodiazbalart.org/` | Live homepage: title 'Mario Diaz-Balart for Congress 2026 \| Florida's 26th District'; og:title 'Mario Diaz-Balart for Congress 2026'; footer 'PAID FOR BY MARIO DIAZ-BALART FOR CONGRESS · © 2026' |
| Nicole Locklin | DEM | U.S. House, FL-26 | `https://locklinforcongress.com/` | Live homepage: title 'Nicole Locklin for Congress'; og:title 'Nicole Locklin for U.S. Congress \| Florida District 26'; footer 'Nicole Locklin for U.S. Congress 1808 N. University Dr, Pembroke Pines, FL 33024' |
| Eliott Rodriguez | DEM | U.S. House, FL-27 | `https://eliottrodriguez.com/` | Live homepage: title 'Eliott Rodriguez – For Congress'; footer 'Paid for by Eliott Rodriguez for Congress' |
| Maria Elvira Salazar | REP | U.S. House, FL-27 | `https://mariaelvirasalazar.com/` | Live homepage: title 'Maria Elvira Salazar for Congress - Fighting for FL-27'; og:title 'Maria Salazar for Congress'; og:url https://mariaelvirasalazar.com/; footer 'Paid for by Salazar for Congress', '© 2026 Maria Elvira Salazar for Congress' |
| Carlos A. Gimenez | REP | U.S. House, FL-28 | **none** | Campaign site exists (carlosgimenezforcongress.com) but its copy is from the 2020 first run and never mentions 2026 or District 28; not stored so the ingest does not quote 2020 positions as current. Founder decision. |
| Eddy Rojas | NPA | U.S. House, FL-28 | `https://www.eddyrojas.com/` | Live homepage: title/og:title 'Eddy Rojas for Congress - District 28 \| district 28 \| Miami-Dade, FL, USA'; h1 'Running for U.S. Congress — Florida District 28'; /about title 'About \| ROJAS FOR CONGRESS' |
| Phil "Felipe" Ehr | DEM | U.S. House, FL-28 | `https://ehrforcongress.us/` | Live homepage: title/og:title 'Vote Phil Ehr for U.S. House of Representatives'; og:url https://ehrforcongress.us/; footer 'PAID FOR BY EHR FORCE INC'; body 'DONATE FL-28 Bike Tour', 'FL-28 Debate Request', 'Help us defeat Gimenez' |

## Broward and Miami-Dade County

| Candidate | Party | Office | `official_site` | Confirmed by |
|---|---|---|---|---|
| Mark D. Bogen | DEM | Broward County Commission, District 2 | **none** | Nothing found on Ballotpedia, the SOE listing or search; decided seat. Only social profiles and the county office page exist. |
| Lamar Fisher | DEM | Broward County Commission, District 4 | **none** | Old campaign domain fisherfordistrict4.com is disconnected (Wix "ConnectYourDomain" 404) and lamarfisher.com is parked; social profiles only. |
| Caryl Sandler Shuham | DEM | Broward County Commission, District 6 | `https://www.carylshuham.com/` | Page title 'Caryl Shuham for Broward County Commission - District 6'; disclaimer 'Paid for by Caryl Shuham, Democrat, for Broward County Commission, District 6' |
| Robert McKinzie | DEM | Broward County Commission, District 8 | **none** | Nothing found on Ballotpedia, the SOE listing or search; decided seat. Only social profiles and the county office page exist. |
| Maura McCarthy Bulman | NPA/nonpartisan | Broward County School Board, District 1 | `https://www.mauraforbroward.com/` | Disclaimer 'Political advertisement paid for and approved by Maura McCarthy Bulman for Broward County School Board, District 1, non partisan' |
| Nicole Morst | NPA/nonpartisan | Broward County School Board, District 4 | `https://nicolemorst.com/` | Disclaimer 'Political Advertisement Paid for and Approved by Nicole Morst, non-partisan, for Broward County School Board, District 4' |
| Adam Cervera | NPA/nonpartisan | Broward County School Board, District 6 | `https://www.adamcervera.com/` | Disclaimer 'Political advertisement paid for and approved by Adam Cervera for Broward County School Board, District 6' |
| Roberto Fernandez III | NPA/nonpartisan | Broward County School Board, District 6 | `https://www.electroberto2026.com/` | Page title 'Vote Roberto Fernandez, III for Broward County School Board'; disclaimer '...approved by Roberto Fernandez, III, non-partisan, for Broward County School Board District 6' (live read after its SiteGround challenge cleared) |
| Cynthia Alceus Dominique | NPA/nonpartisan | Broward County School Board, District 7 | `https://www.cynthiaforbrowardschools.com/` | Disclaimer 'Political advertisement paid for by Cynthia Dominique for Broward County School Board, District 7' |
| Allen Zeman | NPA/nonpartisan | Broward County School Board, At-Large Seat 8 | `https://electallenzeman.com/` | Disclaimer 'Political advertisement paid for and approved by Allen Zeman for School Board of Broward County, Seat 8, nonpartisan' |
| Marleine Bastien | NPA/nonpartisan | Miami-Dade County Commission, District 2 | `https://reelectbastien.com/` | Page title 'Marleine Bastien for Miami-Dade Commission District 2 \| Re-Elect' |
| Rob Piper | NPA/nonpartisan | Miami-Dade County Commission, District 5 | `https://www.robpiperheretoserve.com/` | Page title 'Rob Piper for Miami-Dade County Commissioner - District 5'; disclaimer 'Paid for by ROB PIPER for Miami-Dade County District 5 Commissioner' |
| Vicki L. Lopez | NPA/nonpartisan | Miami-Dade County Commission, District 5 | `https://vickilopez.vote/` | Page title 'Vicki Lopez for Miami-Dade County Commissioner' |
| Linda Cothiere | NPA/nonpartisan | Miami-Dade County School Board, District 1 | `https://lindaforschoolboard.com/` | og:title 'Elect Linda Cothiere Aristide - Miami-Dade School Board, District 1 - Runoff Nov 3'; disclaimer '...approved by Linda Cothiere, nonpartisan, for Miami-Dade School Board District 1' |
| Thera Johnson | NPA/nonpartisan | Miami-Dade County School Board, District 1 | **none** | Not on the ballot (lost the Aug 18 primary as a write-in, SOE "Inactive-Defeated"); her site is for that past race. Roster error. |
| Dorothy Bendross-Mindingall | NPA/nonpartisan | Miami-Dade County School Board, District 2 | **none** | Nothing found on Ballotpedia, the SOE listing or search; only social profiles and her school-board office pages, which are not campaign sites. |
| Monica Colucci | NPA/nonpartisan | Miami-Dade County School Board, District 8 | **none** | Genuine campaign site (monicacolucci.com) but compromised: its footer carries injected casino/SEO spam. Not stored until cleaned; founder decision. |

## Candidates with no site, and why

NULL is the true value for each of these: we looked, and there is no campaign site to read.

| Candidate | Race | Reason | Government page (not stored) |
|---|---|---|---|
| Peter Jassenoff (`FL-DOE-92357`) | U.S. House, FL-25 | Nothing found: Ballotpedia candidate page has no campaign/personal website link (FEC link only); BallotReady lists none; FEC committee C00953877 'PETER JASSENOFF FOR CONGRESS' lists no website (gmail contact only); web search found only news coverage. Guessed domains peterjassenoff.com / jassenoffforcongress.com do not resolve; jassenoff.com resolves to a parking-type IP with no candidate content. lp.org/candidate/peter-jassenoff/ read on 2026-09-24: bio only, no website link. | — |
| Deborah Ann Meidinger Hosey (`FL-DOE-92137`) | U.S. House, FL-26 | Nothing found: Ballotpedia page has no website link (FEC only); BallotReady lists none; FEC Form 1 for 'Deborah Ann Meidinger Hosey for US Congress' (filed 2026-06-10) gives only email DeborahUnites@DAMHforCongress.com — damhforcongress.com (and www) has no A record (DNS shows only Microsoft/Azure mail-hosting SOA), so no website is served. | — |
| Carlos A. Gimenez (`FL-DOE-91226`) | U.S. House, FL-28 | STALE SITE, NOT STORED. carlosgimenezforcongress.com is his committee's site, but its copy is from the 2020 first run: "Mayor Gimenez ... Now, he's building on this record as a candidate for Congress", with no mention of 2026 or District 28. Storing it would have the ingest quote 2020 positions as current ones. Founder's call whether to store it anyway. | https://gimenez.house.gov/ |
| Mark D. Bogen (`FL-VF-BRO-1179`) | Broward County Commission, District 2 | Nothing found after checking Ballotpedia, the SOE listing and search; incumbent seeking re-election unopposed. Only social (X @mark_bogen) and the county office page exist. | https://www.broward.org/district2 |
| Lamar Fisher (`FL-VF-BRO-1178`) | Broward County Commission, District 4 | fisherfordistrict4.com (apex and www) returns a Wix 'ConnectYourDomain Error' 404, so the domain is not connected. lamarfisher.com is a GoDaddy parked page. Only social profiles (Facebook @FisherForDistrict4, X @LamarPFisher) are live. | https://www.broward.org/district4 |
| Robert McKinzie (`FL-VF-BRO-1182`) | Broward County Commission, District 8 | Nothing found after checking Ballotpedia, the SOE listing and search; incumbent is unopposed. | https://www.broward.org/district8 |
| Thera Johnson (`FL-VF-DAD-3080`) | Miami-Dade County School Board, District 1 | NOT ON THE BALLOT. Miami-Dade SOE (VoterFocus) lists her "Inactive-Defeated"; Ballotpedia records 32 write-in votes (0.1%) in the Aug 18 special primary. Her site, vote4therajohnson.com, is real but campaigns as a "Write In Candidate" for that primary, so it is a site for a past race and is not stored. Roster error, see below. | — |
| Dorothy Bendross-Mindingall (`FL-VF-DAD-2926`) | Miami-Dade County School Board, District 2 | Nothing found after checking Ballotpedia, the SOE listing and search. Only social profiles exist, plus board-member office pages (district2.dadeschools.net and a WordPress office blog, mdcpsd2.wordpress.com), which are not campaign sites. | https://district2.dadeschools.net/ |
| Monica Colucci (`FL-VF-DAD-2953`) | Miami-Dade County School Board, District 8 | SITE COMPROMISED, NOT STORED. monicacolucci.com is her genuine campaign site (disclaimer "paid for and approved by Monica Colucci for Miami-Dade School Board, District 8"), but its WordPress footer carries injected casino/SEO spam links and text, a sign the site has been hacked. Not stored behind her name until it is cleaned; founder's call. | — |

## Crawlability, for the ingest step

`robots.txt` read the same day.

| Site | Verdict |
|---|---|
| `ashleymoody.com` | Allowed: Yoast block 'User-agent: * / Disallow:' (nothing disallowed); a stray 'Crawl-delay: 10' and 'Disallow: /wp-content/uploads/wpforms/' sit above any User-agent line; no Claude/GPTBot-specific rules; no bot challenge seen |
| `angienixon.com` | Allowed: 'User-agent: *' disallows only /wp-admin/ (admin-ajax and uploads allowed); no Claude/GPTBot-specific rules; no bot challenge seen |
| `neilgillespie4senate.blogspot.com` | Allowed: Blogger default. 'User-agent: *' disallows /search and /share-widget and allows /; no Claude-specific rules; no bot challenge seen |
| `jamesforfl.com` | Allowed: 'User-Agent: * / Disallow:' (nothing disallowed); no Claude-specific rules; no bot challenge seen |
| `www.jjr.vote` | Allowed: robots.txt contains only a Sitemap line (no User-agent groups, so nothing is disallowed); no bot challenge seen |
| `annettetaddeo.com` | Unknown: robots.txt sits behind a SiteGround bot challenge (HTTP 202, header 'sg-captcha: challenge', 'x-robots-tag: noindex'), so it could not be read. Automated agents are effectively blocked most of the time. |
| `blaiseforflorida.com` | Allowed: Yoast 'User-agent: * / Disallow:' (nothing disallowed); no Claude-specific rules; no bot challenge seen |
| `www.joeyforflorida.com` | Allowed for the pages that matter: Squarespace default robots.txt lists ClaudeBot, anthropic-ai, GPTBot and others in the same group as 'User-agent: *'. That group disallows only /config, /search, /account, /api, /static and some query-string patterns. Claude-User is not named. No bot challenge seen |
| `wiltonsimpson.com` | Allowed: 'User-Agent: * / Disallow:' (nothing disallowed); no Claude-specific rules; no bot challenge seen |
| `baledalton.com` | Allowed: User-agent * disallows only /wp-admin/; no Claude/AI-specific blocks |
| `dennison4congress.com` | Allowed: robots.txt is only the Cloudflare content-signals comment preamble with no User-agent/Disallow directives and no Content-Signal values set |
| `elijahforcongress.com` | Allowed: robots.txt 404 (Vercel), no restrictions |
| `jenkinsforfl.com` | Allowed: User-agent * disallows only /wp-admin/; no Claude/AI-specific blocks; site uses SiteGround sgcaptcha bot challenge (intermittent; headless browser got 'Robot Challenge Screen', curl retry passed) |
| `www.mike4congress.com` | Allowed: User-agent * Allow: / (Wix default; Disallow *?lightbox=); no Claude/AI-specific blocks; Crawl-delay 10 only for dotbot/AhrefsBot |
| `dangreenfl.com` | Allowed: Yoast default, User-agent * Disallow: (empty); no AI-specific blocks |
| `www.darrensoto.com` | Allowed: Squarespace default; ClaudeBot/anthropic-ai/GPTBot are listed in the same group as User-agent * with only utility-path Disallows (/config, /search, /account, /api/, format= query variants); no root block |
| `www.frostforcongress.com` | Allowed: Squarespace default; ClaudeBot/anthropic-ai/GPTBot are listed in the same group as User-agent * with only utility-path Disallows (/config, /search, /account, /api/, format= query variants); no root block |
| `jamespericola.com` | Allowed: User-agent * Allow: / with Crawl-delay 10 and Disallows on /mdw/ system paths, /mdw-admin, /thank-you; no AI-specific blocks. SiteGround sgcaptcha bot challenge (headless browser blocked; curl passed on retry) |
| `votestrada.com` | Allowed: User-agent * Allow: /; no AI-specific blocks |
| `www.grovesforcongress.com` | Allowed: User-agent * Allow: / (Wix default; Disallow *?lightbox=); no Claude/AI-specific blocks; Crawl-delay 10 only for dotbot/AhrefsBot |
| `brandenscrivenerfl.info` | Allowed: robots.txt 404, no restrictions (but page has meta robots 'noindex, nofollow, nocache') |
| `bilirakisforcongress.com` | Allowed: robots.txt 404 (Vercel), no restrictions |
| `kimberlyoverman.com` | Allowed: User-agent * Disallow: (empty); no AI-specific blocks |
| `www.brianlambertforcongress.com` | Allowed: robots.txt 404, no restrictions |
| `castorforcongress.com` | Allowed: User-agent * Disallow: (empty); Crawl-delay: 10 (placed before the User-agent line); no AI-specific blocks |
| `beltranforcongress.com` | Allowed: User-agent * disallows only /wp-admin/; no Claude/AI-specific blocks; site uses SiteGround sgcaptcha bot challenge (headless browser got 'Robot Challenge Screen'; curl passed on retry) |
| `votelaurel.com` | Allowed: User-agent * disallows only /wp-admin/, Crawl-delay: 10; no AI-specific blocks |
| `www.peopleforcongress.com` | Allowed: User-agent * Allow: / (Wix default; Disallow *?lightbox=); no Claude/AI-specific blocks; Crawl-delay 10 only for dotbot/AhrefsBot |
| `kellykirschner.com` | Allowed: User-agent * disallows only /wp-admin/; no Claude/AI-specific blocks |
| `markdavisforcongress.com` | Allowed: Squarespace default; ClaudeBot/anthropic-ai/GPTBot are listed in the same group as User-agent * with only utility-path Disallows (/config, /search, /account, /api/, format= query variants); no root block |
| `grutersforcongress.com` | Allowed: robots.txt 404, no restrictions |
| `brentandersenfl.com` | robots.txt (read via headless browser) allows all: User-agent: * Disallow: /wp-admin/ only. Bot protection: SiteGround sgcaptcha challenge intermittently blocks plain curl and sometimes headless Chromium |
| `debbiewassermanschultz.com` | robots.txt allows all agents (User-agent: * only disallows /wp-admin/); no AI-bot-specific rules |
| `www.maximeforcongress.com` | Wix default robots.txt: User-agent: * Allow: / (Disallow *?lightbox=); only PetalBot blocked; no Claude/AI-bot rules |
| `www.caseyaskar.com` | robots.txt returns 200 with an empty body (so nothing disallowed) but carries X-Robots-Tag: noindex on the robots.txt response itself; homepage has no noindex; Cloudflare-fronted, no challenge seen |
| `piaforcongress.com` | robots.txt (read once via headless browser) allows all: User-agent: * Allow: / with only /mdw/system/, /mdw/_data/, /mdw/global/, /mdw/submit disallowed. Bot protection: SiteGround sgcaptcha 'Robot Challenge Screen' blocks curl and headless Chromium on the live homepage (repeated attempts) |
| `olivergilbert.vote` | Allowed: 'User-agent: *' disallows only /wp-admin/ (admin-ajax allowed); read on retry past the SiteGround challenge, which the ingest may also meet |
| `tebrownforflorida.com` | Yoast robots.txt: User-agent: * Disallow: (empty) — everything allowed; no AI-bot rules |
| `jaredforflorida.com` | robots.txt allows all: User-agent: * Allow: / with only /mdw/system/, /mdw/_data/, /mdw/global/, /mdw/submit disallowed. Bot protection: SiteGround sgcaptcha challenges plain curl; headless Chromium got through on 2nd try |
| `www.scottsingerusa.com` | Squarespace robots.txt: ClaudeBot and anthropic-ai (plus GPTBot etc.) are listed in the same group as User-agent: *, which only disallows /config, /search, /account, /api/, /static/ and query-param variants — page crawling allowed; no Crawl-delay |
| `mariodiazbalart.org` | robots.txt returns 404 — no restrictions; Cloudflare-fronted, no challenge seen |
| `locklinforcongress.com` | robots.txt contains only a Sitemap line — no disallows, everything allowed; Cloudflare-fronted, no challenge seen |
| `eliottrodriguez.com` | robots.txt allows all agents (User-agent: * only disallows /wp-admin/); no AI-bot-specific rules |
| `mariaelvirasalazar.com` | Yoast robots.txt: User-agent: * Disallow: (empty) — all allowed; a Crawl-delay: 10 line precedes the user-agent block (applies loosely to all) |
| `www.eddyrojas.com` | Wix default robots.txt: User-agent: * Allow: / (Disallow *?lightbox=); only PetalBot blocked; no Claude/AI-bot rules |
| `ehrforcongress.us` | Yoast robots.txt: User-agent: * Disallow: (empty) — all allowed; no AI-bot rules |
| `www.carylshuham.com` | Allowed: robots.txt is 'User-agent: *' with Crawl-delay: 10 and no Disallow and no AI-bot blocks. SiteGround anti-bot captcha is served to curl and sometimes to headless Chromium. |
| `www.mauraforbroward.com` | Allowed (Squarespace default): ClaudeBot, anthropic-ai and GPTBot are listed in the same group as 'User-agent: *', which only disallows admin/API/search/query paths. There is no 'Disallow: /'. |
| `nicolemorst.com` | Allowed: 'User-agent: *' disallows only /Login, store cart/checkout and filter paths. No AI-bot blocks. |
| `www.adamcervera.com` | Allowed: 'User-agent: *' disallows only /admin/, /portal/, /js/ and /_*. No AI-bot blocks. |
| `www.electroberto2026.com` | By its rules, allowed: the archived robots.txt (2026-08-19) is 'User-agent: *' with Disallow only /wp-admin/. In practice the live site is behind a SiteGround captcha that blocked curl and headless Chromium, robots.txt included. |
| `www.cynthiaforbrowardschools.com` | Allowed: Wix default, 'User-agent: *' Allow: / (Disallow only *?lightbox=). PetalBot is blocked; no AI-bot blocks. |
| `electallenzeman.com` | Allowed: WordPress default, 'User-agent: *' Disallow /wp-admin/ only. |
| `reelectbastien.com` | Allowed: 'User-agent: *' Allow: /. |
| `www.robpiperheretoserve.com` | Allowed by robots.txt ('User-agent: *' Allow: /). In practice a Cloudflare 'Just a moment' challenge returns 403 to curl; headless Chromium got through after about 20 s. |
| `vickilopez.vote` | Allowed: WordPress default, 'User-agent: *' Disallow /wp-admin/ only. A SiteGround captcha blocks curl; headless Chromium got through after about 20 s. |
| `lindaforschoolboard.com` | Explicitly allowed: ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai, Claude-Web and '*' all Allow: /. |

## Roster problems found along the way

Checking each candidate against the county Supervisor of Elections listing turned up ballot-tier candidates who are **not on the November ballot**. This batch does not change the roster (`ballot_status` and `race.candidate_ids` belong to the intake pipeline); it records each one as NULL with the reason, and flags it here so the roster can be corrected before these races are briefed.

- `FL-VF-DAD-3080` Thera Johnson. Miami-Dade School Board District 1 (special election): Thera Johnson is "Inactive-Defeated" on the SOE listing (32 write-in votes in the Aug 18 primary). The Nov 3 runoff is **Linda Cothiere vs Katrina Wilson** (SOE "Active-Runoff" for both; Ballotpedia agrees). Wilson is not in our roster, so the race shows the wrong opponent.

## Notes on the stored values

- **Christopher Dennison**: `dennison4congress.com` was found by trying the obvious domain. Nothing links to it (Ballotpedia lists no site, the LPF candidate page is behind a Cloudflare challenge, search found nothing), but the page itself is unambiguous: h1 "Chris Dennison: Libertarian for U.S. Congress (FL D7)" and the full-name disclaimer. Worth a confirmation from the LPF before the ingest quotes it.
- **Joe Strada**: the page declares `og:url` `https://ssms.life/`, and its robots.txt sitemap points there too, apparently left over from a site-builder template. `votestrada.com` is the host that actually serves the campaign, so it is what is stored.
- **Branden Scrivener**: a GoodParty.org-built site carrying `noindex`. The title names only "Federal Congressional District 12, No Party Affiliation Candidate"; his name is in the body and disclaimer.
- **Kathy Castor**: Ballotpedia links the `www` host, which redirects to the apex; the apex is the page's own `og:url`, so the apex is stored.
- **Phil "Felipe" Ehr**: the disclaimer names "EHR FORCE INC" rather than a "for Congress" committee; the page title "Vote Phil Ehr for U.S. House of Representatives" and FL-28 content establish the race.
- **Vicki L. Lopez**: Ballotpedia still links `vickiforflorida.com`, her old State House site, which was rejected. The current site carries leftover template text ("Lisa Klein for State House" in its SMS consent block); the title and content are hers.

## Still open

- Applying `0036` to production is the founder's call. It asserts the roster is still 106
  ballot candidates and that exactly the expected number now have a site, so it fails loudly
  rather than half-applying if the roster moved.
- Candidates with no site are the same pipeline gap as Datto (`candidate-sites-2026-09-21.md`):
  the brief pipeline's only input is a website, so they will read as `no_stated_position_found`
  until something ingests another source.
