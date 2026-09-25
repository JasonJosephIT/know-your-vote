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

These sites are stored, and voters can click them, but
`scripts/candidate-site-ingest.ts` gets nothing from them. Each was checked
on 2026-09-25 by fetching its robots.txt and homepage the way the ingest does
(same UA, same client).

| Candidate | Race | What the ingest meets | Status |
|---|---|---|---|
| Jeannette Quiñones Hernández | Orange Commission D8 | robots.txt disallows ClaudeBot, anthropic-ai, Claude-Web; the ingest refuses by name | **Noted**: her opt-out is honored; she will have no sourced positions |
| Jackie Toledo | Hillsborough Commission D1 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Harry Cohen | Hillsborough Commission D1 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| James Pericola | U.S. House FL-11 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Brent Andersen | U.S. House FL-20 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Pia Dandiya | U.S. House FL-22 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Oliver G. Gilbert III | U.S. House FL-24 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Roberto Fernandez III | Broward School Board D6 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Caryl Sandler Shuham | Broward Commission D6 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Vicki L. Lopez | Miami-Dade Commission D5 | robots.txt answered with a bot-challenge page (HTTP 202) | **Open** (A) |
| Annette Taddeo | CFO | the connection is refused to a non-browser client | **Open** (A) |
| Tiffany Moore Russell | Orange County Mayor | the connection is refused to a non-browser client | **Open** (A) |
| Jennifer Jenkins | U.S. House FL-8 | robots.txt readable, but the homepage is a bot-challenge page, so no passages | **Open** (B) |
| Mike Beltran | U.S. House FL-14 | robots.txt readable, but the homepage is a bot-challenge page, so no passages | **Open** (B) |
| Rob Piper | Miami-Dade Commission D5 | Cloudflare answers 403 to robots.txt and homepage alike | **Open** (B) |

Two decisions cover all of these:

- **(A) Policy.** Should the ingest go ahead when a site's robots.txt cannot
  be read? Today it stops, because an unreadable policy is not consent. The
  news sweep leaves the same question (flvoicenews.com) to the founder.
- **(B) Mechanics.** These sites block any non-browser client, whatever
  robots.txt says. Reading them would need a browser-based fetch in the
  ingest, which is a separate change.

Until then, these candidates can have a site on their card but no sourced
positions from it. That is the same pipeline gap as Datto's.
