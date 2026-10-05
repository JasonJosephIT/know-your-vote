# Session B — Collect `official_site` for the remaining ballot candidates

**Start this session with:** "Read `docs/general-election/sessions/session-b-candidate-websites.md` and do it."

## Goal

Give every ballot-tier candidate a verified `official_site`, or a recorded
reason there isn't one. This is the input the brief pipeline reads from. The
sites also render on the brief and directory pages right away, so every row
helps voters before any brief exists.

## Read first

- `docs/general-election/candidate-sites-2026-09-21.md`. **Follow its method
  exactly.** It is the FL-GOV batch (7 of 8) and shows the evidence standard
  and the Datto case.
- `supabase/migrations/0032_fl_gov_official_sites.sql`, the row format to copy.
- `src/lib/candidate-site.ts` and `scripts/verify-candidate-site.ts`, for how a
  stored URL is normalised and checked.

## State on 2026-09-24

- 106 ballot-tier candidates across 53 races. 7 have an `official_site`, all
  in FL-GOV. **99 to go.**
- Get the list from the live database: candidates with `ballot_status =
'ballot'` and `official_site IS NULL`, joined to their race for office and
  district.

## Order

Do the races most likely to be briefed first, so each finished race unblocks
the pipeline for that race:

1. The other 4 statewide races (U.S. Senate, then the Cabinet offices).
2. The 17 U.S. House districts.
3. The 4 state races.
4. The 32 county races, contested seats before decided ones.

Commit after each group rather than at the end.

## Method (from the FL-GOV batch)

- **Fetch and read every URL** before recording it. A search result alone is
  never enough: a lapsed, parked or re-registered domain looks the same in a
  listing.
- Accept a row only when the page itself names **the candidate and the office**.
  Record the evidence, such as a page title, a disclaimer line, or Ballotpedia's
  published contact address.
- Starting points: Ballotpedia's per-candidate external links, the party's own
  candidate page, and the county Supervisor of Elections candidate listing.
- **No site is a valid answer.** Record NULL with the reason (parked domain,
  social-only, nothing found). Never store a parking page or a social profile
  as `official_site`.
- Read each site's `robots.txt` and record whether it allows Claude agents, as
  the FL-GOV doc does. The ingest step needs that.

## Output

- **`supabase/migrations/0036_official_sites_2026.sql`**, the migration number
  reserved for this session. Idempotent `UPDATE candidate SET official_site =
… WHERE candidate_id = …`, same shape as `0032`. Add your row to
  `supabase/migrations/README.md` as **not applied**.
- `docs/general-election/candidate-sites-2026-09-XX.md`, the evidence table
  and crawlability table in the FL-GOV doc's format, plus a list of every
  candidate with no site and why.
- Applying `0036` to production is the founder's call. Ask; don't apply it
  yourself.

## Done when

- Every one of the 99 has either a verified URL or a recorded reason for NULL.
- `node scripts/verify-candidate-site.ts` and `node scripts/verify-migrations.mjs`
  pass.

## Don't

- Don't touch `0034`, `0035` or `0037+`.
- Don't ingest or quote site content. That's the brief pipeline's job (Session C).
