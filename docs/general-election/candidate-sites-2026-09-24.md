# `official_site` for the rest of the 2026 ballot: what was collected and how

**Collected** 2026-09-24 · Ships as `supabase/migrations/0036_official_sites_2026.sql` (**applied 2026-09-25**)
· Session B, `docs/general-election/sessions/session-b-candidate-websites.md`.

Before this, 7 of 106 ballot candidates had an `official_site`, all of them in FL-GOV
(`0032`, `candidate-sites-2026-09-21.md`). This batch covers 98 more: **86 have a
verified campaign site and 12 have none**, each with its reason recorded. With `0036`
applied, 93 of 106 ballot candidates have a site. Datto (FL-GOV) remains the one
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
  migration (the last of those second reads ran into 2026-09-25 UTC); the evidence below is what
  the reads showed. `site_last_verified_at` carries the first read's date.
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

## Hillsborough County

| Candidate | Party | Office | `official_site` | Confirmed by |
|---|---|---|---|---|
| Harry Cohen | DEM | Hillsborough County Commission, District 1 | `https://harrycohen.vote/` | Page title "Re-Elect Harry Cohen for County Commission, District 1" |
| Jackie Toledo | REP | Hillsborough County Commission, District 1 | `https://jackietoledo.com/` | Page title "Jackie Toledo for Hillsborough County Commission, District 1" |
| Gwen Myers | DEM | Hillsborough County Commission, District 3 | `https://www.votegwenmyers.com/` | Disclaimer "Paid for and Approved by Commissioner Gwen Myers, Democrat, Hillsborough County- Distrcit 3" (sic); page text "Hillsborough County (Tampa's District 3) 2026" |
| Luiz F. F. Garcia | REP | Hillsborough County Commission, District 3 | `https://www.electluizffgarcia.com/` | Page title "Luiz F. F. Garcia for District 3 County Commission" |
| Neil Manimala | DEM | Hillsborough County Commission, District 5 | `https://www.neilmanimala.com/` | Disclaimer "paid for and approved by Neil Manimala, Democrat, for Hillsborough County Commission, District 5" |
| Stacy Hahn | REP | Hillsborough County Commission, District 5 | `https://www.votestacyhahn.com/` | Disclaimer "Paid for by Stacy Hahn, Republican, for Hillsborough County Commission, District 5" |
| Adam Hattersley | DEM | Hillsborough County Commission, District 7 | **none** | WITHDRAWN. SOE lists him "Inactive-Withdrawn" for Commission District 7; the qualified Democrat is Aileen Rodriguez, who is not in our roster. His old campaign domain is now a gambling-spam site. Roster error, see the doc. |
| Joshua Wostal | REP | Hillsborough County Commission, District 7 | `https://www.joshuawostal.com/` | Page title "Home \| Joshua Wostal for Hillsborough County Commissioner" (no district number; he is the sitting District 7 commissioner and the SOE files him under District 7) |
| Brittany Lyssy | NPA/nonpartisan | Hillsborough County School Board, District 2 | `https://www.votebrittanylyssy.com/` | Disclaimer "Paid for and approved by Brittany Lyssy for Hillsborough County School Board, District 2" |
| Daniela Simic | NPA/nonpartisan | Hillsborough County School Board, District 2 | `https://danielaforschools.com/` | Disclaimer "Political advertisement paid for and approved by Daniela Simic, nonpartisan, for Hillsborough School Board, District 2" |
| Karen Perez | NPA/nonpartisan | Hillsborough County School Board, District 6 | `https://keepkarenperez.com/` | og:title "Karen Perez for School Board District 6"; matching disclaimer |
| Kenneth "Ken" Gay | NPA/nonpartisan | Hillsborough County School Board, District 6 | `https://votekennethgay.com/` | Page text "Vote Kenneth Gay - Hillsborough County School Board District 6" |
| Ashley Meeder | NPA/nonpartisan | Hillsborough County School Board, District 4 | **none** | WITHDRAWN. SOE lists her "Inactive-Withdrawn" for School Board District 4; Patricia "Patti" Rendon holds that seat unopposed and is not in our roster. No site found. Roster error, see the doc. |

## Orange County

| Candidate | Party | Office | `official_site` | Confirmed by |
|---|---|---|---|---|
| Chris Messina | NPA/nonpartisan | Orange County Mayor | `https://www.chrismessina.com/` | Homepage (https://www.chrismessina.com/): header 'CHRIS MESSINA FOR ORANGE COUNTY MAYOR'; footer disclaimer 'Paid for and approved by Chris Messina for Orange County Mayor'; title/og:title 'Chris Messina Compassionate Visionary Leader Rooted in Conservative Values' |
| Tiffany Moore Russell | NPA/nonpartisan | Orange County Mayor | `https://tiffanyformayor.com/` | Homepage (https://tiffanyformayor.com/): title and og:title 'Tiffany Moore Russell for Orange County Mayor'; disclaimer 'paid for and approved by Tiffany Moore Russell for Orange County Mayor, Non-partisan' |
| Roberta Walton Johnson | DEM | Orange County Clerk of the Courts | `https://voteroberta.com/` | Homepage (https://voteroberta.com/): title, og:title and h1 'Roberta Walton Johnson for Orange County Clerk of Court'; disclaimer 'Political advertisement paid for and approved by Roberta Walton Johnson, Democrat, for Orange County Clerk of Courts' |
| Terrell Thomas | NPA | Orange County Clerk of the Courts | `https://thomasforclerk.com/` | Homepage (https://thomasforclerk.com/): title 'Thomas For Orange County Clerk of Court – Together. Clerk Forward.'; h1 'Thomas For Orange County Clerk of Court'; disclaimer 'Political advertisement paid for and approved by Terrell Thomas, No Party Affiliation, for Orange County Clerk of Court' |
| Kamia Brown | NPA/nonpartisan | Orange County Commission, District 2 | `https://www.kamiafororangecounty.com/` | Homepage (https://www.kamiafororangecounty.com/): title and og:title 'Kamia Brown for Orange County Commissioner – District 2'; disclaimer 'Political advertisement paid for and approved by Kamia Brown for Orange County Commissioner District 2' |
| Mike Crabb | NPA/nonpartisan | Orange County Commission, District 2 | `https://ilikemikecrabb.com/` | Homepage (https://ilikemikecrabb.com/): title 'Commissioner Mike Crabb (Mike Crab), Orange County Commissioner, District 2 \| Vote November 3, 2026'; h1 'Keep Commissioner Mike Crabb Orange County District 2'; disclaimer 'Political advertisement paid for and approved by Mike Crabb, nonpartisan, for Orange County Commissioner, District 2' |
| Brian Jones | NPA/nonpartisan | Orange County Commission, District 4 | `https://brianhubertjones.com/` | Homepage (https://brianhubertjones.com/, via curl): title 'Brian Jones for Commissioner'; hero 'Building a Better Community Together for District 4'; footer 'Political advertising paid for and approved by Brian Jones Campaign for County Commissioner, Inc.' |
| Johanna Lopez | NPA/nonpartisan | Orange County Commission, District 4 | `https://www.votejohannalopez.com/` | Homepage (https://www.votejohannalopez.com/): title/og:title 'Johanna Lopez For Orange County'; disclaimer 'Political Advertisement paid for and approved by Johanna López for Orange County Commissioner, District 4' |
| Lawanna Gelzer | NPA/nonpartisan | Orange County Commission, District 6 | `https://www.lawannagelzer.com/` | Homepage (https://www.lawannagelzer.com/): title 'HOME \| LawannaGelzer.com'; disclaimer 'Political advertisement paid for and approved by Lawanna Gelzer for Orange County Commissioner, District 6' |
| Michael "Mike" Scott | NPA/nonpartisan | Orange County Commission, District 6 | `https://mymikescott.com/` | Homepage (https://mymikescott.com/): title 'District 6 Commissioner - Michael "Mike" Scott'; og:title 'Mike Scott for District 6 Commissioner'; hero 'RE-ELECT COMMISSIONER MIKE SCOTT' |
| Patricia Rumph | NPA/nonpartisan | Orange County Commission, District 7 | `https://www.patriciarumph.com/` | Homepage (https://www.patriciarumph.com/): title/og:title 'Patricia Rumph for Orange County Commissioner District 7 \| ...'; disclaimer 'Political Advertisement Paid for and Approved by Patricia Rumph, Non-partisan, for Orange County Commission, District 7' |
| Vicki Vargo | NPA/nonpartisan | Orange County Commission, District 7 | `https://votevickivargo.com/` | Homepage (https://votevickivargo.com/): title/og:title 'Vicki Vargo for Orange County Commissioner'; footer 'Paid by Vicki Vargo for Orange County Commissioner, District 7' |
| Jeannette Quinones Hernandez | NPA/nonpartisan | Orange County Commission, District 8 | `https://www.jeannette2026.com/` | Homepage (https://www.jeannette2026.com/): title/og:title 'Jeannette Quiñones for Orange County Commission District 8'; disclaimer 'PAID FOR BY THE JEANNETTE QUIÑONES HERNÁNDEZ CAMPAIGN, NONPARTISAN, FOR ORANGE COUNTY COMMISSION DISTRICT 8' |
| Victor M. Torres Jr. | NPA/nonpartisan | Orange County Commission, District 8 | `https://www.electvictorres.com/` | Homepage (https://www.electvictorres.com/): 'Victor "Vic" Torres is a lifelong public servant running for Orange County Commission District 8'; disclaimer 'Paid for and approved by Victor Torres, non-partisan, for Orange County Commission District 8'; title 'Vic Torres \| Support Community Progress – Act Now' |
| Diana Moore | NPA/nonpartisan | Orange County School Board, District 3 | `https://www.votefordianamoore.com/` | Homepage (https://www.votefordianamoore.com/): footer 'Paid for by the Campaign to Elect Diana Moore for District 3 School Board'; title/og:title 'About \| www.VoteforDianaMoorecom' |
| Susanne Peña | NPA/nonpartisan | Orange County School Board, District 3 | `https://www.vote4pena.com/` | Homepage (https://www.vote4pena.com/): title/og:title 'Susanne Pena for Orange County School Board'; disclaimer 'Political advertisement paid for by Susanne Peña, Non-partisan, for Orange County School Board, District 3' |
| Melissa Lopez Marantes | NPA/nonpartisan | Orange County School Board, District 1 | `https://www.melissaforkids.com/` | Homepage (https://www.melissaforkids.com/): title/og:title 'Melissa Lopez Marantes for Orange County School Board District 1 \| school board candidate \| Orange County, FL, USA'; disclaimer 'Political advertisement paid for and approved by Melissa Lopez Marantes, non-partisan, for Orange County School Board District 1' |
| Gloria Reina O'Neal | NPA/nonpartisan | Orange County School Board, District 2 | `https://votegloriareina.com/` | Homepage (https://votegloriareina.com/): title/og:title "Gloria Reina O'Neal for School Board District 2"; disclaimer 'Paid for by Gloria Reina, Non-partisan, for Orange County School Board, District 2' |
| Angie Gallo | NPA/nonpartisan | Orange County School Board Chair | **none** | Campaign domain voteangiegallo.com has lapsed ("Squarespace - Website Expired" 404) after she won the seat outright in the Aug 18 primary; no other campaign site. Her OCPS District 1 board page is noted, not stored. |

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
| Adam Hattersley (`FL-VF-HIL-2639`) | Hillsborough County Commission, District 7 | Campaign withdrawn and no live site: SOE lists him 'Inactive - Withdrawn' for County Commissioner Dist. 7 (Florida Politics: 'Adam Hattersley suspends campaign for Hillsborough County Commission', ~Sept 2025). Ballotpedia's campaign link https://www.adamforflorida.com/ now redirects to a re-registered Indonesian slot-gambling spam site; SOE email domain adam4florida.com resolves to GoDaddy parking IPs and resets HTTPS; adamforhillsborough.com (found in search) is NXDOMAIN. | — |
| Ashley Meeder (`FL-VF-HIL-2691`) | Hillsborough County School Board, District 4 | Candidate withdrew; no site found. SOE lists Ashley Meeder 'Inactive - Withdrawn' for School Board Member Dist. 4 with $0 raised/spent; nothing found on Ballotpedia or in search. | — |
| Angie Gallo (`FL-VF-ORA-1245`) | Orange County School Board Chair | Campaign site voteangiegallo.com has lapsed (Squarespace account expired, 404) after she won the chair race outright in the Aug 18, 2026 primary; no other campaign site found (only Facebook). | https://www.ocps.net/district-1-angie-gallo |

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
| `harrycohen.vote` | robots.txt (MDW platform): User-agent: * Allow: / with Disallows on /mdw/system/, /mdw/_data/, /mdw/global/, /mdw/submit; Crawl-delay: 10; no Claude-specific block. BUT site serves a SiteGround-style 'Robot Challenge Screen' (sgcaptcha) to repeat headless requests. |
| `jackietoledo.com` | robots.txt not readable: served a SiteGround captcha redirect (/.well-known/sgcaptcha/) with status 202; site has bot protection that blocks repeat automated requests. Crawlability for Claude agents effectively limited by the captcha. |
| `www.votegwenmyers.com` | Wix robots.txt: User-agent: * Allow: / (Disallow *?lightbox=); blocks only PetalBot; no Claude-specific rules; crawl allowed. |
| `www.electluizffgarcia.com` | Squarespace robots.txt: ClaudeBot/anthropic-ai are listed in the same group as User-agent: * with only admin/api/query-param Disallows, so Claude agents may crawl public pages; no Crawl-delay. |
| `www.neilmanimala.com` | Squarespace robots.txt: ClaudeBot/anthropic-ai are listed in the same group as User-agent: * with only admin/api/query-param Disallows, so Claude agents may crawl public pages; no Crawl-delay. |
| `www.votestacyhahn.com` | WordPress robots.txt: User-agent: * disallows /wp-admin/ and /wp-content/uploads/wpforms/ only; no Claude-specific blocks; crawl allowed. |
| `www.joshuawostal.com` | robots.txt: User-agent: * Allow: / (Disallow /admin/); blocks GPTBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, meta-externalagent; no ClaudeBot/anthropic-ai/Claude-User rule, so Claude agents fall under * and may crawl. |
| `www.votebrittanylyssy.com` | Squarespace robots.txt: ClaudeBot/anthropic-ai are listed in the same group as User-agent: * with only admin/api/query-param Disallows, so Claude agents may crawl public pages; no Crawl-delay. |
| `danielaforschools.com` | User-agent: * disallows only /wp-admin/ (admin-ajax allowed); no Claude-specific blocks; crawl allowed. |
| `keepkarenperez.com` | User-agent: * disallows only /wp-admin/ (admin-ajax allowed); no Claude-specific blocks; crawl allowed. |
| `votekennethgay.com` | User-agent: * disallows only /wp-admin/ (admin-ajax allowed); no Claude-specific blocks; crawl allowed. |
| `www.chrismessina.com` | Allowed: User-agent: * with no Disallow, but Crawl-Delay: 20; no Claude-specific rules; no bot challenge |
| `tiffanyformayor.com` | Allowed: User-agent: * disallows only /wp-admin/; no Claude-specific rules. BOT PROTECTION: SiteGround sgcaptcha 'Robot Challenge Screen' (curl gets 202 challenge; headless Chromium passes after ~6 s JS wait) |
| `voteroberta.com` | Allowed: User-agent: * Allow: /; no Claude-specific rules; no bot challenge |
| `thomasforclerk.com` | Allowed: User-agent: * disallows only /wp-admin/, WooCommerce and WPForms upload paths; no Claude-specific rules; no bot challenge |
| `www.kamiafororangecounty.com` | Allowed: Wix default, User-agent: * Allow: / (Disallow *?lightbox=); no Claude-specific rules; no bot challenge |
| `ilikemikecrabb.com` | Allowed: User-agent: * Allow: / (disallows /admin, /unsubscribe, /preview, /email/, /lovable/); no Claude-specific rules; no bot challenge |
| `brianhubertjones.com` | Allowed: User-agent: * disallows only /wp-admin/; no Claude-specific rules. BOT PROTECTION: headless Chromium got 403 'Bot Verification' page; plain curl gets 200 |
| `www.votejohannalopez.com` | Allowed: Wix default, User-agent: * Allow: /; no Claude-specific rules; no bot challenge |
| `www.lawannagelzer.com` | Allowed: Wix default, User-agent: * Allow: /; no Claude-specific rules; no bot challenge |
| `mymikescott.com` | Allowed: WordPress/Yoast, User-agent: * disallows only /wp-admin/ and WooCommerce paths; no Claude-specific rules; no bot challenge |
| `www.patriciarumph.com` | Allowed: Wix default, User-agent: * Allow: /; no Claude-specific rules; no bot challenge |
| `votevickivargo.com` | Allowed: Yoast, User-agent: * with empty Disallow; no Claude-specific rules; no bot challenge |
| `www.jeannette2026.com` | BLOCKED for Claude crawlers: robots.txt has 'User-agent: ClaudeBot', 'anthropic-ai', 'Claude-Web' (and GPTBot) each 'Disallow: /'; User-agent: * Allow: / (Disallow /css2/). Claude-User not named. No bot challenge |
| `www.electvictorres.com` | Allowed for content: Squarespace robots lists ClaudeBot/anthropic-ai in the same group as User-agent: *, which only disallows /config, /search, /account, /api/, /static/ and query-param variants (no full-site block); no bot challenge |
| `www.votefordianamoore.com` | Allowed: Wix default, User-agent: * Allow: /; no Claude-specific rules; no bot challenge |
| `www.vote4pena.com` | Allowed for content: Squarespace robots lists ClaudeBot/anthropic-ai in the same group as User-agent: *, which only disallows /config, /search, /account, /api/, /static/ and query-param variants; no bot challenge |
| `www.melissaforkids.com` | Allowed: Wix default, User-agent: * Allow: /; no Claude-specific rules; no bot challenge |
| `votegloriareina.com` | Allowed: User-agent: * Allow: /; no Claude-specific rules; no bot challenge |

## Roster problems found along the way

**Fixed in `supabase/migrations/0038_county_roster_fixes.sql`, applied 2026-09-25.** The three below were confirmed on the live VoterFocus lists on 2026-09-25, and all 49 county ballot-tier candidates were re-checked the same day; no other race is affected. The cause was the 2026-09-21 local-ballot derivation, which joined each of these names to another candidate's status in the same contest. The replacements and their verified sites:

| Race | Out | In | `official_site` | Confirmed by | robots.txt |
|---|---|---|---|---|---|
| Hillsborough Commission D7 | Adam Hattersley (withdrew) | Aileen Rodriguez (DEM, `FL-VF-HIL-2660`) | `https://voteaileen2026.com/` | Disclaimer "Paid for and approved by Aileen Rodriguez, Democrat for Hillsborough County Commission, District 7"; SOE email on the same domain | Squarespace default: AI crawlers share the `*` group, which blocks only admin/API paths |
| Hillsborough School Board D4 | Ashley Meeder (withdrew) | Patricia "Patti" Rendon (`FL-VF-HIL-2672`, incumbent, unopposed) | `https://www.votepattirendon.com/` | Title "Patti Rendon For School Board"; disclaimer "Paid for by Patti Rendon, Non-Partisan, for School Board District 4" | `User-agent: *` `Allow: /` |
| Miami-Dade School Board D1 | Thera Johnson (lost primary) | Katrina Wilson (NOP, `FL-VF-DAD-3070`) | `https://wilsonforeducation.com/` | Ballotpedia campaign link; page names her and "School Board District 1" (no title or disclaimer on the page) | Empty file: nothing disallowed |

As found on 2026-09-24:

Checking each candidate against the county Supervisor of Elections listing turned up ballot-tier candidates who are **not on the November ballot**. This batch does not change the roster (`ballot_status` and `race.candidate_ids` belong to the intake pipeline); it records each one as NULL with the reason, and flags it here so the roster can be corrected before these races are briefed.

- `FL-VF-DAD-3080` Thera Johnson. Miami-Dade School Board District 1 (special election): Thera Johnson is "Inactive-Defeated" on the SOE listing (32 write-in votes in the Aug 18 primary). The Nov 3 runoff is **Linda Cothiere vs Katrina Wilson** (SOE "Active-Runoff" for both; Ballotpedia agrees). Wilson is not in our roster, so the race shows the wrong opponent.
- `FL-VF-HIL-2639` Adam Hattersley. Hillsborough Commission District 7: Adam Hattersley (DEM) is "Inactive-Withdrawn" on the SOE 2026 listing. The qualified Democrat is **Aileen Rodriguez** (VoterFocus `ca=2660`, "Active-Qualified"), who is not in our roster. The race is Wostal (REP) vs Rodriguez (DEM), and the directory currently shows a withdrawn candidate.
- `FL-VF-HIL-2691` Ashley Meeder. Hillsborough School Board District 4: Ashley Meeder is "Inactive-Withdrawn" ($0 raised). The seat is held by **Patricia "Patti" Rendon** ("Active-Unopposed", VoterFocus `ca=2672`), who is not in our roster. The decided seat is attributed to the wrong person.

## Notes on the stored values

- **Christopher Dennison**: `dennison4congress.com` was found by trying the obvious domain. Nothing links to it (Ballotpedia lists no site, the LPF candidate page is behind a Cloudflare challenge, search found nothing), but the page itself is unambiguous: h1 "Chris Dennison: Libertarian for U.S. Congress (FL D7)" and the full-name disclaimer. Worth a confirmation from the LPF before the ingest quotes it.
- **Joe Strada**: the page declares `og:url` `https://ssms.life/`, and its robots.txt sitemap points there too, apparently left over from a site-builder template. `votestrada.com` is the host that actually serves the campaign, so it is what is stored.
- **Branden Scrivener**: a GoodParty.org-built site carrying `noindex`. The title names only "Federal Congressional District 12, No Party Affiliation Candidate"; his name is in the body and disclaimer.
- **Kathy Castor**: Ballotpedia links the `www` host, which redirects to the apex; the apex is the page's own `og:url`, so the apex is stored.
- **Phil "Felipe" Ehr**: the disclaimer names "EHR FORCE INC" rather than a "for Congress" committee; the page title "Vote Phil Ehr for U.S. House of Representatives" and FL-28 content establish the race.
- **Vicki L. Lopez**: Ballotpedia still links `vickiforflorida.com`, her old State House site, which was rejected. The current site carries leftover template text ("Lisa Klein for State House" in its SMS consent block); the title and content are hers.
- **Stacy Hahn**: Ballotpedia also lists `votehahn.com`; that domain is now parked and was rejected.
- **Kenneth "Ken" Gay**: the homepage carries `noindex, nofollow`. That governs search indexing, not this ingest, but it is worth a second look before quoting.
- **Brian Jones**: the page names "Brian Jones for Commissioner" and District 4 but never "Orange County"; accepted because Ballotpedia and the Orange SOE both list this URL for him. It fronts a bot-verification page to headless browsers (plain fetch reads it).
- **Jeannette Quinones Hernandez**: **robots.txt disallows ClaudeBot, anthropic-ai and Claude-Web.** The URL is stored (it is her site and voters can click it), but the ingest must not crawl it.
- **Diana Moore**: the disclaimer names her and "District 3 School Board" but still carries the Wix template address (San Francisco); the title is just the domain.

## Decisions for the founder

1. ~~**Apply `0036`.**~~ **Done 2026-09-25** (recorded as `official_sites_2026`; 93 of 106 sited, values verified byte-exact against this file). The file asserts the roster is still 106 ballot candidates
   and that exactly the expected number are sited, so it fails rather than half-applies if the
   roster moved. Fix the roster (item 2) in a separate change; `0036` does not depend on it,
   but its 106 count will need updating if the roster fix lands first.
2. ~~**Three races carry candidates who are not on the November ballot**~~ **Fixed in `0038`** (section above):
   Hillsborough Commission D7 (Hattersley withdrew; Aileen Rodriguez is the Democrat),
   Hillsborough School Board D4 (Meeder withdrew; Patricia "Patti" Rendon holds the seat), and
   Miami-Dade School Board D1 (Thera Johnson lost the primary; the runoff is Cothiere vs Katrina
   Wilson). The directory shows the wrong people for these seats today. This batch was only
   checked against the SOE listings where a candidate looked wrong, so the other county rosters
   are worth one systematic pass against their SOE status column.
3. **Carlos Gimenez (FL-28)**: store his stale 2020-copy campaign site, or leave NULL (current).
4. **Monica Colucci (Miami-Dade SB 8)**: her real site is compromised with injected spam. Leave
   NULL until it is cleaned (current), or store it.
5. **Chris Dennison (FL-7, LPF)**: stored on the page's own strong self-identification, though
   nothing links to the domain. A confirmation from the LPF would close it.
6. ~~**AI-crawler opt-outs.**~~ **Fixed.** `src/lib/candidate-site.ts` now reads robots.txt per RFC 9309 for the ingest's own token *and* every Anthropic crawler token (`ClaudeBot`, `Claude-User`, `Claude-SearchBot`, `Claude-Web`, `anthropic-ai`), and a path is fetched only if all of them may fetch it, the same rule the news sweep's `AI_POLICY_HOLD` keeps. `jeannette2026.com` is now refused by name ("disallows … for ClaudeBot, Claude-Web, anthropic-ai"). The ingest also honors `Crawl-delay` (including the site-wide one WordPress puts above the first `User-agent`), and stops when robots.txt cannot be read (a 5xx, a failed fetch, or a bot-challenge page served in its place), because an unreadable policy is not consent. Sites behind a SiteGround challenge (Taddeo, Pericola and others in the table above) therefore stop at robots.txt when fetched by the ingest.

## Still open

- Candidates with no site are the same pipeline gap as Datto (`candidate-sites-2026-09-21.md`):
  the brief pipeline's only input is a website, so they will read as `no_stated_position_found`
  until something ingests another source.
- `fec_id` is still empty for the federal candidates; several FEC committee ids were seen
  during this pass (Gillespie `C00943399`, Jassenoff `C00953877`) but none were stored.
