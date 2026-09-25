# Candidates that raised conflicts: Session B, 2026-09-24/25

Every ballot-tier candidate whose sources disagreed, or whose record did not
line up, while `official_site` was collected
(`candidate-sites-2026-09-24.md`) and the county roster was re-checked. Built
from the per-candidate review notes of that pass. A candidate appears once per
kind of conflict.

**Status key:** **Resolved**: fixed in the data. **Decided**: founder call made.
**Open**: still needs a person. **Noted**: stored as is, recorded so nobody
re-litigates it.

## 1. Our roster vs the county elections office

The candidate list said one thing and the Supervisor of Elections' own
VoterFocus list said another. All three came from one cause: the 2026-09-21
local-ballot derivation joined each name to another candidate's status in the
same contest. All 49 county ballot-tier candidates were re-checked on
2026-09-25, and no other race was affected.

| Candidate | Race | Conflict | Status |
|---|---|---|---|
| Adam Hattersley | Hillsborough Commission D7 | Roster: qualified. SOE: "Inactive-Withdrawn". The Democrat is Aileen Rodriguez | **Resolved** in `0038` |
| Ashley Meeder | Hillsborough School Board D4 | Roster: unopposed. SOE: "Inactive-Withdrawn". The seat is Patricia "Patti" Rendon's, unopposed | **Resolved** in `0038` |
| Thera Johnson | Miami-Dade School Board D1 | Roster: in the runoff. SOE: "Inactive-Defeated" (32 write-in votes). The runoff is Cothiere vs Katrina Wilson | **Resolved** in `0038` |

## 2. A listed website that was wrong, dead, stale or someone else's

A source (Ballotpedia, the SOE listing, the candidate's own emails or social
profiles) pointed at a URL that did not hold up when read.

| Candidate | Race | What the source said vs what was there | Status |
|---|---|---|---|
| Carlos A. Gimenez | U.S. House FL-28 | His own committee site, but the copy is from the 2020 first run ("Mayor Gimenez ... a candidate for Congress"); no 2026 or District 28 | **Decided**: stored anyway (`0039`, founder 2026-09-25) |
| Monica Colucci | Miami-Dade School Board D8 | Her genuine site, but hacked: injected casino/SEO spam in the footer | **Decided**: left NULL until cleaned |
| Adam Hattersley | Hillsborough Commission D7 | Ballotpedia's link `adamforflorida.com` is now a gambling-spam site; `adam4florida.com` (his SOE email domain) is parked | **Resolved**: he is off the ballot (`0038`) |
| Angie Gallo | Orange School Board Chair | Ballotpedia and the SOE both list `voteangiegallo.com`; it is a "Squarespace - Website Expired" 404 | **Noted**: NULL |
| Lamar Fisher | Broward Commission D4 | `fisherfordistrict4.com` is disconnected (Wix 404); `lamarfisher.com` is parked | **Noted**: NULL; worth a re-check later |
| Stacy Hahn | Hillsborough Commission D5 | Ballotpedia also lists `votehahn.com`, which is now parked | **Noted**: `votestacyhahn.com` stored |
| Vicki L. Lopez | Miami-Dade Commission D5 | Ballotpedia lists `vickiforflorida.com`, her old State House site. Her current site still carries "Lisa Klein for State House" template text | **Noted**: `vickilopez.vote` stored |
| Marleine Bastien | Miami-Dade Commission D2 | Ballotpedia's "personal website" is a page on her nonprofit's site (`fanm.org`) | **Noted**: `reelectbastien.com` stored |
| Johanna Lopez | Orange Commission D4 | Ballotpedia's "official website" is her flhouse.gov member page | **Noted**: campaign site stored |
| Joe Strada | U.S. House FL-11 | The site declares `og:url` `https://ssms.life/` and its sitemap points there too; builder leftover | **Noted**: `votestrada.com` stored |
| Kathy Castor | U.S. House FL-14 | Ballotpedia links `www`; the site redirects to the apex and declares it canonical | **Noted**: apex stored |
| Maria Elvira Salazar | U.S. House FL-27 | Ballotpedia's survey email domain `salazar27.com` is a parked page | **Noted**: `mariaelvirasalazar.com` stored |
| Phil "Felipe" Ehr | U.S. House FL-28 | Disclaimer names "EHR FORCE INC", not a for-Congress committee; Ballotpedia's email domain `ehrforce.com` goes to a PAC form | **Noted**: `ehrforcongress.us` stored on its title and FL-28 content |
| Kedner Maxime | U.S. House FL-20 | Ballotpedia's email domain `drkednermaxime.com` does not resolve | **Noted**: `maximeforcongress.com` stored |
| Oliver G. Gilbert III | U.S. House FL-24 | Ballotpedia's email domain `olivergilbert.com` could not be fetched; the site is `olivergilbert.vote` | **Noted**: `.vote` stored |
| Te Mayonna Brown | U.S. House FL-24 | Footer email uses `tmbrownforcongress`; the site is `tebrownforflorida.com` | **Noted** |
| Jeffrey "Dr. Jeff" Datto | Governor | His own posts advertise `DrJeffDatto.com`, which is a parked domain (from `0032`) | **Open**: how to brief a social-only candidate |

## 3. Name or party that differs across sources

Not errors in our data, but a reviewer matching records by name will trip on
them.

| Candidate (our roster) | Other name / label | Where |
|---|---|---|
| Linda Cothiere | "Linda Cothiere Aristide" | Her own site |
| Joey Mendoza Atkins | "Joey Atkins" | Ballotpedia; his site title also carries a Squarespace "(Copy)" leftover |
| Rob Piper | "Rob Piper III" | Ballotpedia |
| Susanne Peña | "Susanne Marie Pena" | Ballotpedia |
| Te Mayonna Brown | "Te Brown" | Ballotpedia and her site |
| Tiffany Moore Russell | Labelled Democratic | Ballotpedia; the race is nonpartisan and her site says "Non-partisan" |
| Kedner Maxime | "Independent Party of Florida" | Ballotpedia; our roster says `IND` |
| Nicole Morst | SOE listing's office label for her row is misaligned in the HTML | VoterFocus page (not relied on) |

## 4. The site does not itself prove the race

Accepted, because the candidate is named and the race is established, but the
page alone does not say it, so the proof rests partly on another source.

| Candidate | Race | Gap | What closed it |
|---|---|---|---|
| Christopher Dennison | U.S. House FL-7 | Found by guessing the domain; nothing links to it | The page names him, the LPF and "FL D7"; **Open**: confirm with the LPF |
| Brian Jones | Orange Commission D4 | Never says "Orange County" | Ballotpedia and the SOE both list the URL |
| Joshua Wostal | Hillsborough Commission D7 | No district number | Sitting D7 commissioner; SOE files him under D7 |
| Diana Moore | Orange School Board D3 | Disclaimer still has the Wix template address (San Francisco) | Disclaimer names her and "District 3 School Board" |
| Branden Scrivener | U.S. House FL-12 | Title has no name; page is `noindex` | Name in the body and disclaimer |
| Kenneth "Ken" Gay | Hillsborough School Board D6 | Disclaimer has no district; page is `noindex` | Page text names District 6 |
| Katrina Wilson | Miami-Dade School Board D1 | No title or disclaimer on the page | Ballotpedia's campaign link; page names her and District 1 |
| Neil J. Gillespie | U.S. Senate | A personal Blogspot blog that also links his older runs | Blog is titled for the 2026 Senate race, with an FEC-committee disclaimer |

## 5. The ingest cannot read it as things stand

These sites are stored and voters can click them, but they refused the
ingest's plain fetch. Two decisions were made on 2026-09-25, both measured by
running the ingest itself on every site below.

- **(A) Policy: decided.** An unreadable robots.txt is treated as no rules,
  with a `WARNING robots.txt unreadable` line naming the site. A readable file
  that refuses Anthropic's crawlers still stops the run.
- **(B) Mechanics: done.** `scripts/candidate-site-ingest.ts --browser auto`
  (the default) recognises a bot-challenge interstitial (`looksLikeBotChallenge`)
  and fetches that page again in headless Chromium, which runs the host's own
  check the way any visitor's browser does. robots.txt goes through the same
  path, so a challenged policy is now read rather than skipped. The browser
  identifies itself (its own UA plus `KnowYourVote/1.0`), downloads no images,
  media or fonts, and solves no captchas.

Challenges are intermittent: a site that serves a plain fetch on one run can
challenge it on the next. The table is the run of 2026-09-25 with (A) and (B)
in place, `--pages 2`.

| Candidate | Race | Result | Status |
|---|---|---|---|
| Jeannette Quiñones Hernández | Orange Commission D8 | robots.txt disallows ClaudeBot, anthropic-ai, Claude-Web; refused by name | **Noted**: her opt-out is honored; no sourced positions |
| Vicki L. Lopez | Miami-Dade Commission D5 | Ingests (9 passages, after (A)) | **Resolved** |
| Jackie Toledo | Hillsborough Commission D1 | 28 passages; robots.txt read in the browser | **Resolved** |
| Harry Cohen | Hillsborough Commission D1 | 42 passages; robots.txt read in the browser | **Resolved** |
| James Pericola | U.S. House FL-11 | 18 passages; robots.txt read in the browser | **Resolved** |
| Brent Andersen | U.S. House FL-20 | 3 passages (no challenge on this run) | **Resolved** |
| Pia Dandiya | U.S. House FL-22 | 41 passages | **Resolved** |
| Oliver G. Gilbert III | U.S. House FL-24 | 53 passages (one policy page's challenge did not clear and was skipped) | **Resolved** |
| Roberto Fernandez III | Broward School Board D6 | 21 passages | **Resolved** |
| Caryl Sandler Shuham | Broward Commission D6 | 68 passages; robots.txt read in the browser | **Resolved** |
| Annette Taddeo | CFO | 10 passages; robots.txt read in the browser | **Resolved** |
| Tiffany Moore Russell | Orange County Mayor | 79 passages; robots.txt read in the browser | **Resolved** |
| Jennifer Jenkins | U.S. House FL-8 | 72 passages; robots.txt read in the browser | **Resolved** |
| Mike Beltran | U.S. House FL-14 | 34 passages | **Resolved** |
| Rob Piper | Miami-Dade Commission D5 | Cloudflare's check does not clear even in a real browser; the run exits non-zero and quotes nothing | **Open**: unreachable to any automated client. His positions would have to come from another source |

The full ingest run (`policy-runs/passages-2026-09-25/`) met three more, and a
re-run the same day settled them:

| Candidate | Race | Result | Status |
|---|---|---|---|
| Blaise Ingoglia | CFO | 80 passages. Never a challenge: his page dns-prefetches `challenges.cloudflare.com` for a Turnstile form widget, and the check read the host name as Cloudflare's interstitial. Fixed in the challenge markers | **Resolved** |
| Annette Taddeo | CFO | 10 passages; SiteGround's challenge cleared on the re-run | **Resolved** |
| Dean Abrams | Governor | Cloudflare's "Just a moment..." (HTTP 403) did not clear in the browser on any of four attempts | **Open**: same as Piper. His positions would have to come from another source |

Rob Piper and Dean Abrams are now the only ballot candidates with a site the
ingest cannot read. The pipeline gap is the same as Datto's: a website is the brief
pipeline's only input.
