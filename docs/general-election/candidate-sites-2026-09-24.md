# `official_site` for the rest of the 2026 ballot: what was collected and how

**Collected** 2026-09-24 · Ships as `supabase/migrations/0036_official_sites_2026.sql` (**not applied**)
· Session B, `docs/general-election/sessions/session-b-candidate-websites.md`.

Before this, 7 of 106 ballot candidates had an `official_site`, all of them in FL-GOV
(`0032`, `candidate-sites-2026-09-21.md`). This batch covers 9 more: **9 have a
verified campaign site and 0 have none**, each with its reason recorded. With `0036`
applied, 16 of 106 ballot candidates have a site. Datto (FL-GOV) remains the one
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

## Still open

- Applying `0036` to production is the founder's call. It asserts the roster is still 106
  ballot candidates and that exactly the expected number now have a site, so it fails loudly
  rather than half-applying if the roster moved.
- Candidates with no site are the same pipeline gap as Datto (`candidate-sites-2026-09-21.md`):
  the brief pipeline's only input is a website, so they will read as `no_stated_position_found`
  until something ingests another source.
