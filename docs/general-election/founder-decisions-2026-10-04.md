# Founder decisions after the launch handoff (2026-10-04)

The handoff (`launch-handoff-2026-10-04.md`) asked for 13 founder decisions. You asked the agents to finish everything else first, so each decision is already **built as its recommended default**. Each one can be switched back from one place, listed in the table below. Nothing is final until you confirm it.

- Code: PR #108 (`claude/launch-handoff-completion`).
- PR #107 (deadline banner rollover, news-cron wording): merged 2026-10-05.
- PR #109 (reads the production key names): merged and deployed 2026-10-05.

All database work in this session was read-only, and nothing was posted to the live site.

## First (10-04 and 10-05)

Voter registration closes 10-05.

1. **Production env: fixed 2026-10-05.** You confirmed that `SUPABASE`, `RESEND` and `JEV` hold the service-role, Resend and TypeSafe keys, and you added `EMAIL_FROM` on `knowyour.vote`.
   - No renaming is needed. Since #109 the deployed app reads either name (`src/lib/server-keys.ts`).
   - #107 had tried a startup mapping in the root `instrumentation.ts`. It never ran on Vercel: with a `src/` folder, Next.js deploys the instrumentation hook only from `src/`. #109 replaced it.
   - After #109 deployed, the calendar file returned 200 and the home page showed "Register to vote by October 5 · Election Day is November 3" (live GETs).
   - Not yet seen working: the email signup, the reminder cron and the news cron. Each needs a POST or a cron run, which agents don't trigger. The end-to-end test below covers the first two.
   - Keep `EMAIL_FROM` on `knowyour.vote`. `knowyourvote.com` is a parked domain for sale whose SPF forbids all senders, so Resend would refuse every email from it.
   - `EMAIL_SERVICE` isn't read by anything. For `admin@knowyour.vote` to sign in to the admin console, the variable is `ADMIN_EMAILS`.

   Full steps: `reminders-e2e-runbook.md` step 1.
2. **#107: merged 2026-10-05.**
   - The news cron writes each "Race published" item once and never updates it. Before #107 it said every candidate got "equal space and comparable scrutiny", which the Balance Audit does not enforce at 150%. #107 corrects that wording.
   - It also makes the banner move on from "Register by October 5" once 10-05 ends in Florida.
3. **Early voting opens Mon Oct 19 in all four covered counties, not Sat Oct 24.** Apply migration `0043_county_early_voting_2026.sql` and stamp its 8 rows **by Sun 10-18, ideally now**. The SQL is in `reminders-e2e-runbook.md`, "County early-voting dates (0043)".
   - Each county's Supervisor of Elections says early voting runs Oct 19 to Nov 1. Two agents checked each county's official page independently on 2026-10-05. The site only knew the statewide minimum, Oct 24 to Oct 31.
   - Without 0043, every subscriber gets "Early voting starts today" on Oct 24, five days after their county opened. Until then, the banner and the welcome email give the statewide window.
   - The code that reads the county rows is PR #112, and it works with or without them.
   - The end-to-end test deadline moves up with it: the first real send is now Oct 19, so finish it by **Sun 10-18**.
4. **Change the Spacemail passwords for info@knowyour.vote (hello@ until 2026-10-05) and admin@knowyour.vote**, each to a different one. They shared the password that was pasted into the session chat. No agent used it or wrote it anywhere.

## This week

- **Run the reminder end-to-end test** (`reminders-e2e-runbook.md` step 4), no later than **Sun 10-18** (was Tue 10-20 before the county dates, item 3 above).
  - The next real send is the county early-voting reminder at 14:00 UTC on **Mon Oct 19**, once 0043 is stamped. Without it, the next send is the vote-by-mail reminder on Oct 21.
  - A reminder sends only on its exact day, so a missed run loses it.
  - Rehearsal mode (step 4c) lets you test the full send path before then.
- **Mail plumbing:**
  - Confirm Resend shows knowyour.vote as **Verified**.
  - Add a DMARC record: TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:info@knowyour.vote`.
  - Confirm Cloudflare Email Routing forwards info@ to an inbox you read. It is both the reminder sender and the public contact. The domain's MX points to Cloudflare, not Spacemail.
  - Check your Resend plan's daily cap before promoting the signup.
- **CRON_SECRET:** if you have no saved copy (Vercel won't show Sensitive values), rotate it.
- **Optional env:**
  - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=knowyour.vote` turns analytics on. `/privacy` now says "we don't run analytics" while it is unset.
  - `NEXT_PUBLIC_SENTRY_DSN` turns on browser error reporting and `SENTRY_DSN` server error reporting (since 2026-10-05: the server hook moved to `src/instrumentation.ts`; at the root it was never deployed, see item 1). Redeploy after setting either; `/privacy` then says reports go to Sentry.
  - `ADMIN_EMAILS` plus Supabase Auth open the admin console.
  - `PELIAS_BASE_URL` turns on address autocomplete. Optional.
- **Review and merge #108.** Production's email env is now complete, so merging it turns on the home-page reminder card and the banner's reminder link at once, although the signup has not been seen working yet. CI runs on it for the first time. Once CI is green, require the `checks` and `build` jobs on main (`docs/ci.md`).
- **By Wed 10-07, answer decisions 4–8 below.** The refresh before early voting depends on them.

## Decisions, built as recommended

| # | Decision | Built as (recommended, pending you) | To flip |
| --- | --- | --- | --- |
| 1a | Methodology page | Rewritten to describe what ships: quotes from candidates' own sites, the two gates, the 25 issues, "No stated position found", the Balance Audit at 150, known limits, what's not covered. The always-zero facts and fact-checks columns are hidden. | `SHOW_UNCOLLECTED_COLUMNS` in `src/app/(public)/methodology/page.tsx`. Update `BRIEF_SNAPSHOT_DATE` there on every refresh. |
| 1b | Terms page and footer | New `/terms` (independent, no endorsement, as-is, official sources, contact) and a site-wide footer: "Independent and nonpartisan. Not affiliated with any candidate, party or government agency. No endorsements." Ideally have someone with legal knowledge read `/terms`. | Delete `src/app/(public)/terms/`; `FOOTER_DISCLAIMER` and `FOOTER_LINKS` in `src/components/nav/SiteFooter.tsx` |
| 1c | Title, description, share card | "Know Your Vote — Florida candidates, in their own words", replacing "everything on every Florida ballot". The landing h1 and intro, the manifest and the voice guide's canonical lines match. | `SITE_TITLE`, `SITE_DESCRIPTION`, `SHARE_DESCRIPTION` in `src/app/layout.tsx`, plus the h1 in `src/app/(public)/page.tsx` |
| 2 | Google Ads tag vs the PRD's privacy promise | **Keep** the consent-gated tag. It loads only after "Accept". The PRD and scope-changes are amended to match. | `ADS_TAG_ENABLED` in `src/lib/ads.ts`; removal steps in `docs/scope-changes.md` §A |
| 3 | Promote the reminder signup | **Yes, once email works.** A home-page card, plus a link in the deadline banner. Both show only while email delivery is configured and reminders aren't paused. | `PROMOTE_REMINDER_SIGNUP` in `src/lib/notifications/config.ts` |
| 3a | Rehearsal mode for the reminder cron | POST `{"rehearse":"<address>"}` with the cron secret. It sends the next reminder to one existing subscriber. | Delete the block marked REHEARSAL in `src/app/api/cron/send-reminders/route.ts` |
| 4 | 17 races "listed" on Election Day | **Accept.** Their cards say "No brief for this race" and why, instead of promising a brief. | `LISTED_IS_FINAL` in `src/lib/listing-copy.ts`. Per-race detail: `listed-races-2026-10-04.md` |
| 5 | One more re-run for intermittent bot walls | **Yes**, one identical re-run, never solving a captcha. Five candidates qualify: Taddeo, Shuham, Beltran, Dandiya, and Rodriguez's /issues page. The handoff named only the first two. | `brief-runs/rerun-targets-2026-10.tsv` (delete lines) |
| 6 | Second source for silent candidates | **No**, not this cycle. They stay "No stated position found". | `listed-races-2026-10-04.md` §4 has the narrowest version if you want one |
| 7 | Refresh briefs before early voting | **One refresh with a cut-off:** <br>• you answer by 10-07<br>• re-ingest and re-run by 10-12<br>• review by 10-14<br>• your yes by 10-15<br>• publish by 10-17<br>• freeze 10-18 → 11-03, corrections only<br>A walled site keeps its 09-29 run (7a). A rebuilt race runs its SQL in your SQL editor, because MCP DELETEs hang (7b, Path B1). | `brief-runs/refresh-plan-2026-10.md` |
| 8 | Bio section (FL-GOV D1) | **Drop for 2026.** About pages were read for only 56 of 106 candidates, and there's no review time. | Note under D1 in `brief-runs/FL-GOV/decisions.md` |
| — | Known quality limits | **Accept and disclose.** The methodology page states roughly 85% recall, the 8-page cap and issue matching. FL-27 and FL-AGR stay published. | `listed-races-2026-10-04.md` §5 has the SQL to take them to listed |
| 9 | Amendment 1 | **Hold neutral-only.** The two sided sources are Substacks. The held-note wording was corrected. | `ballots-handoff.md` §7.2 (migration recipe to publish) |
| 10 | Judicial retention | **Say it's out of scope**, with a neutral note naming who's up and linking to official pages: <br>• Justice Muñiz<br>• judges of the 2nd, 3rd and 4th District Courts of Appeal<br>• none for the 6th (Orange) | `SHOW_JUDICIAL_RETENTION_NOTE` in `src/components/features/JudicialRetentionNote.tsx` |
| 11a | News: slots per candidate | **N = 3.** Built but not wired; candidate_news stays off. | `NEWS_SLOTS_PER_CANDIDATE` in `src/lib/news-slots.ts` |
| 11b | Surnames that are common words | **Title and surname only** ("Rep. Lee"). On a 30-day sweep: 75 junk matches drop to 0, and all 51 named matches are kept. | `SURNAME_ONLY_RULE` in `src/lib/news-match.ts` |
| 11c | Policy story naming no candidate | **Drop** (no automatic inlet before Nov 3) | `UNMATCHED_ARTICLE_POLICY` in `src/lib/news-enqueue.ts` |
| 11d | Migration 0014 (news source required) | **Apply 0042 first, then 0014**, after #108 deploys. Production has 8 unsourced news rows; 0014 alone would fail. The approve path now sets source_id, and refuses the five outlets whose lean nobody signed off (C7-a). | `news-inlet-runbook.md` §4; TC-6 in `things-to-confirm.md` |
| 11e | Refresh agent R3 | **Daily** on Cowork (`0 9 * * *`) through 11-03. Its prompt must set source_id once 0014 is live. Note that as of 10-04 no news item had been written since 09-09. | Your Cowork task schedule |
| 12 | Cuts for Nov 3 | **Cut:** SMS, web push, county district placement, statewide ZIPs, a quiz replacement | `docs/scope-changes.md` 2026-10-04 entry |
| 13 | CI | **Yes.** It runs lint, typecheck, every verify script, the 435 Python tests and `next build` on every PR. The live-DB job is manual only and never gets the service-role key. | Delete `.github/workflows/ci.yml`; see `docs/ci.md` |
| — | Accessibility fixes | The audit's fixes 1–10 and 12–14 are built. Three are recommended rather than plain fixes:<br>• fix 11, candidate jump links<br>• the input-border token<br>• `CONTACT_EMAIL`<br>Not built, pending you: rendering the cookie banner on the server, and `inlineCss`. | `a11y-perf-2026-10-04.md` "Recommendations pending founder confirmation" |

## Candidate checks

- **Dennison (FL-7):** the Division of Elections shows him qualified for the Libertarian Party of Florida, and the FEC committee matches his site. Recommended: close it without emailing the LPF.
- **Colucci:** her site still carries a hidden casino-link block, so it stays NULL. If her campaign cleans it, run the UPDATE in `candidate-conflicts-2026-09-25.md` §6.

## What no agent could do here

- **No POST to the live site** (refused as a real-world transaction). The reminder pipeline has never sent in production, and the end-to-end test is yours.
- **No production writes:**
  - no env changes;
  - no migrations (0042 and 0014 are written, not applied);
  - no publish or listing changes;
  - no news inlet run, which needs `TYPESAFE_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, under those names, in your local `.env.local`.
- **No screen-reader pass.** After #108 merges, do 15 minutes of VoiceOver on /, a race page, /candidates and /news. The audit lists what to listen for.
- **No real-network Lighthouse.** Run PageSpeed Insights from your browser on the nine audited URLs.
