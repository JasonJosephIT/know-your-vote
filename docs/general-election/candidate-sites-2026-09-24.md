# `official_site` for the rest of the 2026 ballot: what was collected and how

**Collected** 2026-09-24 · Ships as `supabase/migrations/0036_official_sites_2026.sql` (**not applied**)
· Session B, `docs/general-election/sessions/session-b-candidate-websites.md`.

Before this, 7 of 106 ballot candidates had an `official_site`, all of them in FL-GOV
(`0032`, `candidate-sites-2026-09-21.md`). This batch covers 31 more: **31 have a
verified campaign site and 0 have none**, each with its reason recorded. With `0036`
applied, 38 of 106 ballot candidates have a site. Datto (FL-GOV) remains the one
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

## Candidates with no site, and why

None in the groups collected so far.

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

## Notes on the stored values

- **Christopher Dennison**: `dennison4congress.com` was found by trying the obvious domain. Nothing links to it (Ballotpedia lists no site, the LPF candidate page is behind a Cloudflare challenge, search found nothing), but the page itself is unambiguous: h1 "Chris Dennison: Libertarian for U.S. Congress (FL D7)" and the full-name disclaimer. Worth a confirmation from the LPF before the ingest quotes it.
- **Joe Strada**: the page declares `og:url` `https://ssms.life/`, and its robots.txt sitemap points there too, apparently left over from a site-builder template. `votestrada.com` is the host that actually serves the campaign, so it is what is stored.
- **Branden Scrivener**: a GoodParty.org-built site carrying `noindex`. The title names only "Federal Congressional District 12, No Party Affiliation Candidate"; his name is in the body and disclaimer.
- **Kathy Castor**: Ballotpedia links the `www` host, which redirects to the apex; the apex is the page's own `og:url`, so the apex is stored.

## Still open

- Applying `0036` to production is the founder's call. It asserts the roster is still 106
  ballot candidates and that exactly the expected number now have a site, so it fails loudly
  rather than half-applying if the roster moved.
- Candidates with no site are the same pipeline gap as Datto (`candidate-sites-2026-09-21.md`):
  the brief pipeline's only input is a website, so they will read as `no_stated_position_found`
  until something ingests another source.
