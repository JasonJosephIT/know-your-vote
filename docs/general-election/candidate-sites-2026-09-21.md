# `official_site` for FL-GOV-general — what was collected and how

**Collected** 2026-09-21 · Ships as `supabase/migrations/0032_fl_gov_official_sites.sql`
· Unblocks `docs/general-election/profile-intake-handoff-2026-09-21.md` §5/§6 step 1.

Before this, **0 of 91** ballot candidates had an `official_site`, so
`candidate-site-ingest.ts --site <url>` had no input for a single real person
and the whole policy pipeline was unrunnable. FL-GOV-general was the largest
single unblock at 8 candidates.

**7 of 8 collected. One candidate has no website, and that is a finding.**

## The rows

| # | Candidate | Party | `official_site` | Confirmed by |
|---|---|---|---|---|
| 1 | Scott Eckhard Jewett | LPF | `https://scottjewett.com/` | Page title "Scott Jewett for Florida Governor – Libertarian Party"; also on lp.org's own candidate page |
| 2 | Moliere "Moe" Dimanche | NPA | `https://nomoecorruption.com/` | Page title "No MOE Corruption – Moe Dimanche For Governor of Florida" |
| 3 | Byron Donalds | REP | `https://byrondonalds.com/` | Page title "Home – Byron Donalds for Governor" |
| 4 | David Jolly | DEM | `https://davidjolly.com/` | `og:title` "David Jolly for Governor — Florida 2026" |
| 5 | Frank J. Russo | NPA | `https://russo2026.com/` | "Russo–Rodriguez 2026"; Ballotpedia publishes `Team@russo2026.com` |
| 6 | Jeffrey Peter "Dr. Jeff" Datto | NPA | **none** | see below |
| 7 | Dean Ocean Abrams | NPA | `https://www.deanabrams.com/` | Page title "Dean Abrams for Governor"; Ballotpedia publishes `info@deanabrams.com` |
| 8 | Charles Burkett | NPA | `https://burkettforgov.com/` | Carries the F.S. 106.143 disclaimer "Political advertisement paid for and approved by Charles Burkett, NPA, for Florida Governor" |

## Method

Every URL was **fetched and read** on 2026-09-21 before being written down. A
search result was never enough on its own. A lapsed, parked or re-registered
campaign domain is indistinguishable from a live one in a search listing, and
the consequence is not cosmetic: `official_site` is a link a voter clicks, and
it is the root the ingest crawls and then quotes back as the candidate's own
words. A row was accepted only where the page itself named the candidate and
the office.

Starting points were Ballotpedia's per-candidate External links, the
Libertarian Party's own candidate page for the LPF nominee, and in two cases
the campaign contact address Ballotpedia publishes.

## The one that is empty, and why that is the right answer

**Jeffrey Peter "Dr. Jeff" Datto** has no `official_site`.

Ballotpedia lists no campaign website for him — only campaign X, Instagram and
YouTube accounts, plus a ResearchGate profile as "personal website". His own X
bio and social posts advertise **DrJeffDatto.com**. That domain serves a
**Namecheap domain-parking page** advertising unrelated domains for auction
(`harmonist.com`, `lv6.com`, `gxld.com`, `ufo.to`). The apex does not resolve;
`http://` redirects to the parked `www` host.

Recording it would have put a parking page behind a candidate's name on the
brief, and pointed the ingest at auction listings to quote as his stated
positions. NULL is the true value: we looked, and there is no site to read.

**This is a gap in the pipeline, not just in the data.** A candidate who
campaigns only on social platforms cannot be briefed by a pipeline whose only
input is a website. The `candidate_social_account` table exists and
`briefs.ts` already renders verified handles, but nothing ingests posts. Until
something does, Datto will sit at `no_stated_position_found` on every spine
issue in a race where seven opponents have sourced positions — an asymmetry
that is honest at the row level and still reads badly on the page. Worth
deciding before FL-GOV-general publishes.

## Crawlability, for the ingest step

`robots.txt` read the same day. Nothing here disallows Claude agents.

| Site | Verdict |
|---|---|
| `byrondonalds.com` | `Disallow:` (empty) — everything allowed |
| `davidjolly.com` | Allowed. **Explicitly** `Allow: /` for `ClaudeBot`, `Claude-Web` and `anthropic-ai`. `Crawl-delay: 10` — honour it |
| `nomoecorruption.com` | Allowed except `/wp-admin/`. Note the homepage also carries a `noindex` meta tag; that governs search indexing, not this ingest, but it is a signal worth a second look before quoting |
| `russo2026.com` | Allowed except `/staff`, `/admin`, `/api/` |
| `www.deanabrams.com` | Allowed except admin/auth/utils/forms/users |
| `burkettforgov.com` | No `robots.txt` (GoDaddy builder) — nothing disallowed |
| `scottjewett.com` | **Bot protection.** `robots.txt` itself is intercepted by an `sgcaptcha` redirect. The ingest will likely be blocked; expect to handle this one differently or not at all |

## Notes on the stored values

- **Russo**: the apex 302s to `/en`. The apex is stored rather than the
  language path — the ingest follows the redirect and `isSameSite()` treats
  both as one site, whereas pinning `/en` would choose a language on the
  candidate's behalf.
- **Abrams**: `www` is the canonical host (its own `og:url`), not a redirect
  target, so it is stored with `www`.
- `site_last_verified_at` is stamped only where a page was actually read, and
  carries the date of the read rather than of the deploy.

## Still open

- `fec_id` remains 0 of 91. Not needed for a state race; it matters for the
  federal lines.
- The other 83 ballot candidates still have no `official_site`. The 17 county
  races are parked behind district lookup, but the remaining state and
  congressional lines are the same job as this one.
