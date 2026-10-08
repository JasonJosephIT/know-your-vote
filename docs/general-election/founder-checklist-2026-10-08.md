# Founder checklist (2026-10-08)

This is the list of steps only you can take before Election Day: accounts, secrets, DNS, dashboard settings and sign-offs. It is not a spec. Agent work is left out unless it waits on one of these steps.

- **Dates.** Early voting opens **Mon Oct 19** in all four covered counties (Miami-Dade, Broward, Hillsborough, Orange). The first real reminder email goes out that day at 14:00 UTC (10 a.m. EDT). The brief-content freeze runs **Sun Oct 18 to Tue Nov 3**. Election Day is **Tue Nov 3**.
- **Order.** Items are grouped by deadline and numbered in the order to do them. Where one item needs another done first, it says so.
- **Each item gives:** why it matters, where to do it, what to do, how to confirm it worked, and the evidence that it was still open on 2026-10-08. Every check was read-only: `SELECT` queries on the live database (Supabase's `auth` tables included), GET requests to knowyour.vote, public DNS lookups, the GitHub API, and the scheduled-task list, run history and run transcripts on this Mac. Dashboards that only you can open (Resend, Cloudflare, Vercel, Spacemail, Sentry, Plausible, Supabase settings, the API consoles) were not visible. For those, an item counts as open when it is listed as open in `cowork-handoff-2026-10-05.md` and nothing since records it done.
- **Decisions.** Where a step involves a choice, the item gives a recommendation, marked "Recommended (pending founder confirmation)", and a **TO FLIP** note saying how to take the other path.
- **Secrets.** This file contains no secret value, and none should go into a chat, a file or a URL. When you paste a secret into a terminal, use `read -rs NAME`, which shows nothing on screen. Keep each secret in your password manager. In Vercel, mark each secret **Sensitive**.

## Already done (checked 2026-10-08, no action)

| What | Evidence |
| --- | --- |
| All 14 `general_2026` dates are verified: the 6 statewide rows and 0043's 8 county rows | `SELECT election, event_type, county_fips, event_date, verified_by IS NULL FROM election_event`: every `general_2026` row has `verified_by` set (statewide on 2026-09-07 and 09-10, county rows on 2026-10-05) |
| Production email is configured and reminders are not paused | GET `https://knowyour.vote/` shows "Get deadline reminders by email". That card renders only when the Resend key, `EMAIL_FROM` and the service-role key are set and `NOTIFICATIONS_PAUSED` is unset (`src/lib/notifications/config.ts:59-61`) |
| The calendar file works | GET `/api/calendar/general_2026.ics` returns 200 |
| CI runs and passes on `main` | Check runs on `1580328`: `checks` success, `build` success, `live-db` skipped. The last 5 CI runs on `main` all passed |
| Migration 0047 (candidate leads) is applied | `pg_get_constraintdef` of `review_item_kind_check` lists `candidate_lead`; the index `uq_review_item_candidate_lead_key` exists |
| Anonymous visitors cannot run `set_race_publication` (TC-5) | `has_function_privilege('anon', …, 'EXECUTE')` = false; the same for `authenticated` |
| The agent worktree exists | `/Users/jsloth/Projects/kyv-agent-worktree` was created 2026-10-08 00:54 EDT and refreshed by R5's first run at 02:40 EDT. It is detached at `1580328` |

---

## A. Now: by Fri Oct 9 (10 days before early voting)

### A1. Pause the R1 and R3 scheduled agents

- **Why.** Both agents write news cards straight onto the live site. They skip review and never set a source. That breaks two house rules: nothing an agent writes reaches voters until you approve it in /admin, and every news card needs a source ("no source, no card").
  - R1's prompt allows `INSERT into news_item ONLY … item_type='candidate_news'` (`~/.claude/scheduled-tasks/cap-r1-candidate-news/SKILL.md:56`). R3's allows the same for `election_news` (`cap-r3-election-news/SKILL.md:52`). Neither sets `source_id`.
  - The public feed shows every `news_item` row in a voter's scope. It does not filter on item type or source (`src/app/api/news/route.ts:96-101`).
  - Nothing blocks them now. Neither has inserted since 2026-09-09: the newest of the 8 unsourced `election_news` rows is dated 2026-09-09, and every `candidate_news` row has a source. But that is not because a prompt stops the write. `execute_sql`, the tool both agents INSERT with, already runs without a prompt in scheduled runs:
    - R1's 2026-10-01 run made 4 `execute_sql` calls and 13 web searches with nobody present, then stopped at a WebFetch.
    - R3's 2026-10-07 run (235 transcript messages) made 3 `execute_sql` calls and many WebFetch and WebSearch calls. It ended on an API error (the fetch tool cannot reach `apnews.com`, one of R3's own sources) and an interruption at 02:02 UTC on Oct 8.
  - So R3's next run, Wed Oct 14, can publish without asking anyone. R1's run on Thu Oct 15 has the same access.
  - The news-sweep cron (#129) is meant to take over their jobs: it queues candidate and election stories as pending items for your review. It has not run yet. A3 checks its first run.
- **Where.** In the Claude desktop app, open **Scheduled**, then `cap-r1-candidate-news`, and turn it off. Do the same for `cap-r3-election-news`. Or tell a Claude session "pause R1 and R3", and it calls `update_scheduled_task` with `enabled: false` once you say yes.
- **Do not delete them.** Pause only.
- **Confirm.** Both tasks show as off in the Scheduled list (`enabled: false` in `list_scheduled_tasks`), and neither runs on Wed Oct 14 or Thu Oct 15.
- **Still open.** On 2026-10-08, `list_scheduled_tasks` showed both enabled. R3's next run is Wed Oct 14 at 09:08 EDT; R1's is Thu Oct 15 at 09:10 EDT.
- **Recommended (pending founder confirmation):** keep both paused through Nov 3. This replaces decision 11e's "R3 daily" (`founder-decisions-2026-10-04.md:77`), written before the sweep queued election stories.
- **TO FLIP:** turn either task back on. Do that only after an agent session rewrites its prompt to queue `review_item` rows with a source, as R5 does, and after B1, whose constraint refuses unsourced rows. Until then, every run can publish without review.

### A2. Open the admin console in production, and sign in once

Do this today if you can. It needs nothing else first.

- **Why.** Every approval is meant to happen in /admin, and /admin has never had a signed-in session, in production or under `npm run dev` (both use project `pqracitpmzpiqfnzlngw`; `news-inlet-runbook.md:60`):
  - `auth.users` holds 1 user, created 2026-07-04 00:03:47 UTC. Its `email_confirmed_at` was set 18 ms after creation, so not by a sign-in link, and its `last_sign_in_at` is NULL. `auth.sessions` and `auth.flow_state` have 0 rows.
  - The 10-06 news decisions are in `admin_action` as 49 `approve` and 42 `reject` rows, actor `founder via Claude Code (2026-10-06)`, written between 2026-10-06 22:16 UTC and 2026-10-08 00:02 UTC. They were your decisions, written to the database by a Claude Code session, not made in /admin.
  - Production `/admin/login` still shows "Set ADMIN_EMAILS … Until then the console is reachable by no one" (GET on 2026-10-08; `src/app/admin/login/page.tsx:108-114`).
  - From today the console has work. The news sweep queues pending stories from its first run at 11:00 UTC (A3), and R5 queues `candidate_lead` items (A5). Until this item is done, every approval keeps going through a Claude Code session.
- **Two traps.**
  - **Supabase only mails your own team.** With its built-in email sender, Supabase Auth will "refuse to deliver messages to addresses that are not part of the project's team" (Supabase docs, Auth SMTP guide). Any other address fails with "Email address not authorized", and the built-in sender allows only a few messages an hour. Our login page ignores that error and always shows "Check your email" (`src/app/admin/login/page.tsx:43-51`), so a refused address looks like a lost email.
  - **Open the link in the browser that asked for it.** Sign-in uses PKCE: the callback exchanges the link's code using a verifier that the request left in that browser (`src/app/admin/auth/callback/route.ts:18-23`). Opened on another device, in another browser, or in a mail app's built-in browser, the link lands on "That sign-in link has expired or was already used". To approve from a phone, request the link from the phone's browser, then copy the link from the email into that same browser instead of tapping it in the mail app.
- **Where and what.**
  1. Supabase dashboard, **Organization settings**, **Team**: note the email address your account is listed under. That is the address to sign in with.
  2. Supabase, project `pqracitpmzpiqfnzlngw`, **Authentication**:
     - **Sign In / Providers**: Email is enabled. `docs/admin-dashboard/roadmap.md:24` records it on, with sign-ups allowed, but no sign-in has ever tested it.
     - **URL Configuration**: set Site URL to `https://knowyour.vote`, and add `https://knowyour.vote/admin/auth/callback` to Redirect URLs, the path the link returns to (`admin/login/page.tsx:46`). Keep any `http://localhost:3000` entry.
  3. Vercel, project **know-your-vote**, Settings, Environment Variables, target **Production**:
     - `ADMIN_EMAILS` = the Team address from step 1.
     - `CORRECTION_SECRET` (Sensitive): see below.
  4. Deployments, the current Production deployment, **⋯**, **Redeploy**.
  5. In the browser you will approve from, open `https://knowyour.vote/admin/login`, enter the address, and open the emailed link in that same browser.
- **`CORRECTION_SECRET`.** A long random value you generate yourself (`openssl rand -hex 32` in your own terminal), kept only in your password manager. Without it, the correction route answers 503 to every call (`src/app/api/cron/send-correction/route.ts:94-101`). It is the remedy if an email ever states a wrong date, and A6 and E2 need it. It was last recorded as unset (`cowork-handoff-2026-10-05.md:25`). It was not re-probed: the probe is a POST to the live site.
- **Confirm.**
  - The link lands on `/admin`, and the review queue opens.
  - `SELECT count(*) FROM auth.users WHERE last_sign_in_at IS NOT NULL` returns 1 or more. It returned 0 on 2026-10-08.
  - Your next decision appears in `admin_action` with your email as the actor (`src/lib/admin/api.ts:11`), not "founder via Claude Code".
  - If the page says "Check your email" and nothing arrives within 5 minutes, Supabase, **Logs**, **Auth** gives the reason. "Email address not authorized" means the address is not on the Team list.
- **Recommended (pending founder confirmation):**
  - `ADMIN_EMAILS` = your Supabase Team address, with Supabase's built-in sender. There is nothing else to set up, and a link or two a day fits its limit.
  - Add `CORRECTION_SECRET` in this same redeploy. It costs nothing and may be needed this week (A6).
- **TO FLIP:**
  - To sign in as `admin@knowyour.vote`, or any address not on the Team list, set up custom SMTP first: Supabase, Authentication, Emails, **SMTP Settings**. Resend's SMTP works (host `smtp.resend.com`, username `resend`, password a Resend API key you create for this, sender on `knowyour.vote`). Each sign-in link then counts against Resend's daily cap (D3). Supabase then starts the project at 30 Auth emails an hour. `admin@` also needs D2's routing rule first.
  - Add `CORRECTION_SECRET` later, with D5's redeploy on Fri Oct 16 at the latest, since E2 needs it before Oct 18. Until it is set, a wrong date that reached a subscriber cannot be corrected by email.

### A3. Check the news sweep's first run (after 11:00 UTC today)

- **Why.** A1 relies on the sweep to replace R1 and R3, and it has never run.
  - #129 added `/api/cron/news-sweep`, merged 2026-10-06 19:49 UTC and scheduled for Mondays and Thursdays at 11:00 UTC (`vercel.json`). Its first scheduled run is **Thu Oct 8 at 11:00 UTC** (7 a.m. EDT).
  - All 90 `review_item` rows (kind `manual_news`: 48 approved, 42 rejected) were created on 2026-10-06 between 16:40 and 19:55 UTC, by the hand-run scripts the route replaced (`src/app/api/cron/news-sweep/route.ts:17-20`). None has been created since, and none is pending.
- **Where.** Vercel, project **know-your-vote**, **Logs**, filtered to `/api/cron/news-sweep` (or Settings, **Cron Jobs**). Then the Supabase SQL editor.
- **Confirm.**
  - The 11:00 UTC request answered 200. Its JSON reports `sweep`, `queue` and `queued`.
  - `SELECT count(*) FROM review_item WHERE kind = 'manual_news' AND created_at >= '2026-10-08 11:00+00'` returns more than 0, or the run's JSON shows 0 queued. A quiet run is valid.
  - A 401 means `CRON_SECRET` is missing in Production. A 503 means the service-role key is missing. A 502 is a sweep or queue error. Hand any of these to a Claude Code session.
- **Then.** Review the pending stories in /admin (A2). Repeat this check after the Mon Oct 12 run.
- **Still open.** On 2026-10-08 before 11:00 UTC: 0 `review_item` rows created after 2026-10-06 19:55 UTC, and 0 pending.

### A4. Accept, or decline, the risk that comes with the scheduled agents

- **Why.** A scheduled task runs with the desktop app's tools, including the Supabase connector and a shell. Its prompt's rules are instructions to the model, not a security boundary. A run hijacked by text in a story or web page could write anywhere.
  - **That access exists today.** `execute_sql` already runs without a prompt in scheduled runs: R1's 10-01 run made 4 calls, R2's 10-05 run 5, and R3's 10-07 run 3, with nobody present. The desktop permission covers the whole tool, so it cannot be narrowed to `SELECT`. A hijacked R2, R4 or R5 can already insert, update or delete in any table the connector reaches. There is no narrow approval left to give for it in A5.
  - The R5 spec records this as an accepted risk (`docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md` §6, line 175).
  - That section was added on 2026-10-08 (commit `2212352`), after the design approval noted on line 3. No document records your acceptance of it.
  - The same risk applies to R2 and R4.
- **What limits the damage.** None of these prevents a bad write. They limit what a sanctioned write can do and make any write visible.
  - **R5** writes only pending, operator-only `candidate_lead` rows through `candidate-leads.ts queue`.
  - **R2** writes `candidate_contact` rows and freshness stamps:
    - the contact rows are not shown on any page while `SHOW_CANDIDATE_CONTACT` is not exactly `true` (`src/components/features/CandidateContact.tsx:15`);
    - they are still public data: the policy `anon_read_candidate_contact` (`pg_policies`: `SELECT`, role `anon`, `qual` true) lets anyone holding the site's public anon key read every row. The impact is low, because the rows copy campaigns' own sites;
    - the stamps appear only in the admin Freshness panel.
  - **R4** writes only files.
- **Where.** In a Claude Code session, reply "scheduled-agent risk: accepted for R2, R4, R5 through Nov 3" or "declined". The session records your answer and the date in spec §6 and in `founder-decisions-2026-10-04.md`.
- **Confirm.** Spec §6 names you and the date.
- **Recommended (pending founder confirmation):** accept for R2, R4 and R5 through Nov 3. In A5, allow named commands only.
- **TO FLIP:** decline, and pause `cap-r2-contact-refresher`, `cap-r4-ops-digest` and `cap-r5-candidate-leads` as in A1. Nothing voter-facing depends on them. Pausing is the only way to take the SQL tool away from them.

### A5. Approve tool permissions once for R5, R2 and R4 ("Run now")

Do A1 and A4 first. R5's first three commands were already approved before them (below); answer nothing more until A1 and A4 are done.

- **Why.** No scheduled agent has finished a run since mid-September. The newest file in `Civic Awareness (Know Your Vote)/Agents/RunReports/` is `2026-09-14-R2.md`. Each run stops at a permission prompt nobody is there to answer, and the Scheduled list marks most of those stalled runs "succeeded".
  - **R5**'s first run started at 06:19:46 UTC today. Its `date`, `mkdir` and `agent-worktree.sh` commands were answered at about 06:40 UTC:
    - `/Users/jsloth/Projects/kyv-agent-runs/2026-10-08` was created at 02:40:13 EDT (06:40:13 UTC) and is empty;
    - the agent worktree's `.env.local` link, the script's last step (`scripts/agent-worktree.sh:51`), was recreated in the same second;
    - `list_task_runs` shows the run "running", last active at 06:40:18 UTC.
    - No `stories.json` exists, so PREP, the full-path `node` command, has not started: the run is waiting at that prompt. No `candidate_lead` row is queued (`review_item` holds only `manual_news` rows).
  - **R4**'s 2026-10-05 run lasted 11 seconds and stopped at its first shell command.
  - **R2**'s 2026-10-05 run read 82 candidates with 5 `execute_sql` calls, then stopped at a shell command. `candidate_contact` has 0 rows.
  - Sources: `list_task_runs` and the run transcripts, read 2026-10-08.
- **Where.** Claude desktop app, **Scheduled**:
  1. Open the R5 run that is waiting, and answer its prompt. Or stop it, then press **Run now** on `cap-r5-candidate-leads`.
  2. **Run now** on `cap-r2-contact-refresher`.
  3. **Run now** on `cap-r4-ops-digest`.
- **What to allow.**
  - Watch each run, and answer each prompt with the narrowest "always allow" the app offers: that one command or tool, not every shell command. `execute_sql` will not ask; it already runs (A4).
  - R5 (its `date`, `mkdir` and `agent-worktree.sh` are already answered) needs:
    - the full-path `node` running `scripts/candidate-leads.ts`, for `prep`, `check`, `queue --dry-run` and `queue`;
    - reading `stories.json` and `leads.json`, and writing `mentions.json` and `verified.json`, all in `/Users/jsloth/Projects/kyv-agent-runs/<date>/`. That folder is outside the session folder, so the file writes may ask;
    - web fetches of the Division of Elections candidate search (`dos.elections.myflorida.com`) and county Supervisor of Elections candidate lists;
    - writing its report in `Agents/RunReports/`.
  - R2 needs `date`, web fetches of each candidate's own site (79 of the 82 have one) and of `dos.fl.gov` and the four county election sites, and writing its report.
  - R4 needs `date`, the neutrality-lint command (`node scripts/verify-news-neutrality.ts`), reading the run reports, and writing `CAP_Ops_Digest_latest.html` (on a month's first run, also a dated copy) and its report. R4 uses no web access.
- **Confirm.** A "succeeded" status proves nothing: the stalled runs above show it too.
  - A finished run leaves a new file in `Agents/RunReports/`: `2026-10-DD-R5.md`, `-R2.md` and `-R4.md`.
  - For R4, `CAP_Ops_Digest_latest.html` in the project folder also carries that day's date. It was last written 2026-07-06.
  - For R5, the report ends with `queue`'s final line, and any queued leads show under /admin's candidate-leads filter (needs A2).
  - The next scheduled runs also leave reports: R5 today at 09:38 EDT and Mon Oct 12; R2 and R4 on Mon Oct 12.
  - Expect R4's report to say the neutrality lint could not run. Its prompt calls plain `node` (`cap-r4-ops-digest/SKILL.md:52`), which crashes on this Mac (spec §2, line 41). Fixing the prompt is agent work.
- **Keep `SHOW_CANDIDATE_CONTACT` unset in Vercel.** R2 covers only the 82 candidates in published races. The 24 candidates in listed races have pages that render the same contact block (`src/app/(public)/candidates/[candidateId]/page.tsx:81`), and R2 never fills theirs. With the flag on, some candidates would show "Contact the campaign" and others nothing: a label shown unequally. D5's "Leave these unset" table says when it can flip.

### A6. Read Hillsborough's early-voting page in your own browser

- **Why.** The live Hillsborough rows say early voting runs Oct 19 to Nov 1. The banner, the calendar file and the Oct 19 reminder all use them. Hillsborough's site has refused every automated read since Oct 5, so the rows rest on reads made earlier that day, the county's news post and a TV report (`cowork-handoff-2026-10-05.md:34`).
- **Where.** https://www.votehillsborough.gov/EarlyVoting. This is the `details_url` on both rows (`SELECT event_type, event_date, details_url FROM election_event WHERE election = 'general_2026' AND county_fips = '12057'` returned early_voting_start 2026-10-19 and early_voting_end 2026-11-01).
- **Confirm.** The page says Oct 19 to Nov 1 for the **November 3, 2026 general election**. Tell a Claude session it matches, so it is recorded.
- **If it differs:**
  1. Correct both rows with the `UPDATE` in `reminders-e2e-runbook.md`, "Sending a correction", step 2 (the county-row form, `county_fips = '12057'`). That also fixes the banner, the welcome email and the calendar file (runbook line 317).
  2. Run `SELECT count(*) FROM voting_info_subscription WHERE active` in the SQL editor. It returned 0 on 2026-10-08. While it is 0, step 1 is all that is needed: no email has stated the date.
  3. If it is above 0, run "Sending a correction" steps 3 to 6 for the county row (`"county_fips":"12057"`). That needs A2's `CORRECTION_SECRET`; without it every call answers 503. The dry run (step 4) answers 200 with `"recipients"`. At 0, its `"next"` field says there is nothing to send (`send-correction/route.ts:240-261`), and you stop there.
- **Still open.** A GET from this Mac on 2026-10-08 returned 403, and no document records the check done.

### A7. Answer the brief-refresh decisions (overdue since Wed Oct 7)

- **Why.** The plan for one refresh before early voting needs your answers before any work starts (Gate 0). Its next gate, the re-ingest, is Mon Oct 12 (`brief-runs/refresh-plan-2026-10.md:39-44`).
  - Without answers, the plan's own cut-off applies (line 48): no refresh happens, and every brief stays the 2026-09-29 snapshot through Nov 3.
  - Decisions 4, 6 and 8 and the Incumbent chip are in the same table.
- **Where.**
  - Read the table "Decisions, built as recommended" in `founder-decisions-2026-10-04.md` (lines 57-81): rows 4 to 8, plus "Incumbent chip".
  - Reply in a Claude Code session with "yes" or "flip" for each of 4, 5, 6, 7 (with 7a and 7b), 8 and the chip.
  - If you say yes to 7, Gate 0 also needs `TYPESAFE_API_KEY` available to the session that runs the re-ingest (`refresh-plan-2026-10.md:39`).
- **Confirm.** The answers are written to `docs/general-election/founder-answers-2026-10.md`. A yes on 7 starts Gate 1 by Mon Oct 12. Your yes on the changed races (Gate 3) is due Thu Oct 15.
- **Still open.**
  - No `founder-answers-2026-10*` file exists under your home folder (searched 6 levels deep).
  - No commit since 2026-10-05 touches `brief-runs/` or `policy-runs/`.
  - `BRIEF_SNAPSHOT_DATE` is still `"2026-09-29"` (`src/app/(public)/methodology/page.tsx:61`).
- **Recommended (pending founder confirmation):** answer by Fri Oct 9, so Gate 1 can still make Mon Oct 12. The recommended answer to each is the "Built as" column.
- **TO FLIP:** say "no refresh". The 09-29 briefs stay as they are, and nothing needs undoing.

---

## B. By Tue Oct 13 (6 days before early voting)

### B1. Decide 0042's Ballotpedia row, then give the go for migrations 0042 and 0014

- **Why.** Migration 0014 adds the database rule behind "no source, no card": a `candidate_news` or `election_news` row without a source is refused. It is also the backstop if R1 or R3 is ever turned back on.
  - 0014's constraint fails while any unsourced row exists.
  - 0014 attributes, by id, the 4 rows that existed when it was written (`0014_news_fairness.sql:88-95`).
  - 0042 attributes the 4 added since (ids `1ae20884`, `4c787ba7`, `8d12a9b1`, `ce038b86`; `0042_news_source_backfill.sql:1-18, 78-105`), so it runs first (`news-inlet-runbook.md` §4).
- **Your decision.** One of 0042's 4 rows, `ce038b86`, is a Ballotpedia story (`0042_news_source_backfill.sql:38-43, 91-105`).
- **Recommended (pending founder confirmation):** attribute it to Ballotpedia News as factual reporting, lean `unrated`, as the file is written.
- **TO FLIP:** delete that row instead. Edit only the marked BALLOTPEDIA block, as the file's header says, before applying. MCP `DELETE`s hang, so the delete runs in your SQL editor.
- **Then.** Say "apply 0042 then 0014". An agent session runs the pre-checks, applies both and runs the post-checks (`news-inlet-runbook.md` §4, steps 2 to 5). The approve path that sets a source is already deployed (#108).
- **Confirm.** Both of these:
  - `SELECT count(*) FROM news_item WHERE item_type IN ('candidate_news', 'election_news') AND source_id IS NULL` returns 0.
  - `SELECT conname FROM pg_constraint WHERE conname = 'news_item_agent_source_check'` returns one row.
- **Still open.** On 2026-10-08:
  - the constraint count is 0;
  - 0 `src_gov_*` or `src_ballotpedia_*` source rows exist;
  - 8 `election_news` rows have no `source_id`;
  - `news_item.source_id` is nullable.

---

## C. By Wed Oct 14 (5 days before early voting, so fixes can ship before the freeze)

### C1. Try the site on real phones, with VoiceOver, and on PageSpeed

- **Why.** The Oct 4 audit could not use a real screen reader or PageSpeed Insights (`a11y-perf-2026-10-04.md:358, 368, 685`). Its screen-reader findings came from Chromium's accessibility tree. The install flow has only been seen in screenshots. Whatever this turns up needs time to ship before Oct 18.
- **Real phones.**
  - iPhone, in Safari: Share, then **Add to Home Screen**.
  - Android, in Chrome: the three-dot menu, then **Install app** (or **Add to Home screen**).
  - **Confirm:** the icon opens the site without a browser address bar, and the home page, a race page and the deadline banner all load.
- **VoiceOver, about 15 minutes.**
  - On the Mac, Cmd+F5 turns it on; on the iPhone, Settings, Accessibility, VoiceOver.
  - Pages: `/`, `/races/FL-SEN-general`, `/candidates` and `/news`.
  - **Listen for:**
    - a skip link first;
    - the banner announced as "Key dates";
    - candidates read in ballot order;
    - every candidate's buttons and links read the same way, naming that candidate (a label read for some candidates and not others is an equal-treatment problem);
    - after Accept or Decline on the cookie banner, focus moving to the content.
- **PageSpeed.**
  - At https://pagespeed.web.dev, test the nine audited pages: `/`, `/races/FL-SEN-general`, `/races/FL-GOV-general`, `/races/FL-CFO-general`, `/measures/FL-AM2-general`, `/methodology`, `/privacy`, `/candidates` and `/news`.
  - Note the mobile Performance and Accessibility scores. The audit's lab figures were 90 to 96 and 96 to 100 (`a11y-perf-2026-10-04.md:41-49`).
- **Confirm.** Hand a Claude Code session the notes, the scores and anything that sounded wrong. Each finding becomes a fix or a recorded "accept".
- **Still open.** Listed as open in `cowork-handoff-2026-10-05.md:83`, and no document records it done.

### C2. Confirm or flip the other decisions that were built as recommended

- **Why.** `founder-decisions-2026-10-04.md` built each decision as its recommended default and says "Nothing is final until you confirm it" (line 3). Some are handled elsewhere in this checklist: 4 to 8 and the Incumbent chip (A7), 11d (B1), 11e (A1) and 13 (D6). Two have since been decided by you: 11c, flipped on 2026-10-06 to queue election stories (commit `6ad74ae`), and the cookie banner's Accept kept as the filled primary button (commit `47a8f6b`). Everything below is live as built and unconfirmed. A flip needs time to ship before the Oct 18 freeze.
- **The decisions** (lines of `founder-decisions-2026-10-04.md` unless noted; each row's "To flip" column names the one place to change):
  - **1a**, the methodology page rewrite (line 59).
  - **1b**, `/terms` and the site footer (line 60), including its suggestion to have someone with legal knowledge read `/terms`.
  - **1c**, the title, description and share card (line 61).
  - **2**, keeping the consent-gated Google Ads tag, with the PRD amended to match (line 62; `docs/prd.md:210`).
  - **3**, promoting the reminder signup (line 63).
  - **3a**, rehearsal mode for the reminder cron (line 64). E1's step 4c uses it.
  - **Known quality limits**: accept and disclose; FL-27 and FL-AGR stay published (line 70).
  - **9**, Amendment 1 held neutral-only (line 71).
  - **10**, judicial retention out of scope, with a neutral note (line 72).
  - **11a**, 3 news slots per candidate, built but not wired (line 73).
  - **11b**, title and surname only for surnames that are common words (line 74).
  - **12**, the cuts for Nov 3: SMS, web push, county district placement, statewide ZIPs and a quiz replacement (line 78).
  - **Accessibility** (line 80; the six rows in `a11y-perf-2026-10-04.md:370-379`): the `CONTACT_EMAIL` target, the fixed cookie banner with padding, the input-border token, the jump links (fix 11), rendering the cookie banner on the server (not built) and `inlineCss` on a preview only (not built).
  - **The home page's "What this guide covers" and latest-news sections** (commit `9c5ad49`, 2026-10-05, "Recommended pending founder confirmation").
  - **Dennison (FL-7)**: close it without emailing the Libertarian Party of Florida (line 85).
- **Where.** In a Claude Code session, reply "yes" or "flip" for each line. The session writes your answers to `docs/general-election/founder-answers-2026-10.md`, the same file as A7, and opens a pull request for each flip.
- **Confirm.** `founder-answers-2026-10.md` lists every line above with a yes or a flip, and each flip's pull request is merged by Thu Oct 15.
- **Still open.** No commit or document since 2026-10-05 records any of these confirmed. In `git log --since=2026-10-05`, the only founder decisions are the cookie-banner button and 11c.
- **Recommended (pending founder confirmation):** yes to each, as built, by Wed Oct 14.
- **TO FLIP:** say "flip" on a line. Its "To flip" column says what changes.

---

## D. By Fri Oct 16 (3 days before early voting, 2 before the freeze)

### D1. Add the DMARC record in Cloudflare

- **Why.** Gmail and Yahoo expect DMARC from domains that send in volume. Without it, reminder emails are more likely to land in spam. `p=none` only monitors and never blocks mail (`reminders-e2e-runbook.md:59-63`).
- **Where.** Cloudflare, `knowyour.vote`, DNS, Records, **Add record**: type `TXT`, name `_dmarc`, content `v=DMARC1; p=none; rua=mailto:info@knowyour.vote`, TTL Auto.
- **Confirm.** `dig +short TXT _dmarc.knowyour.vote @1.1.1.1` prints the record. The E1 test email then shows **DMARC: PASS** in Gmail's "Show original".
- **Still open.** On 2026-10-08 that lookup printed nothing, and 8.8.8.8 answered NXDOMAIN.
- **Recommended (pending founder confirmation):** the record exactly as above.
- **TO FLIP:** leave out `rua=…` to get no daily report emails, or use Cloudflare's DMARC Management, which gives its own report address.

### D2. Forward info@ to an inbox you read

- **Why.** The domain's mail servers are Cloudflare's (MX `route1/2/3.mx.cloudflare.net`, seen 2026-10-08), so mail to `info@` never reaches Spacemail. `info@` is the `EMAIL_FROM` address and the public contact. Voters' replies, the send-day digest and the DMARC reports all land there (`reminders-e2e-runbook.md:64`).
- **Where.** Cloudflare, `knowyour.vote`, Email, Email Routing, Routing rules.
  - There must be an **Active** rule for `info@knowyour.vote` whose destination is a **Verified** address on another domain that you read.
  - `admin@knowyour.vote` needs a rule only if you take A2's TO FLIP and sign in to /admin as admin@ through custom SMTP.
- **Confirm.** From another account, send a message to info@. It arrives in your inbox.
- **Still open.** Routing rules cannot be seen from outside Cloudflare. Listed open in `cowork-handoff-2026-10-05.md:73`.
- **Recommended (pending founder confirmation):** keep Cloudflare Email Routing. No MX change this close to the election.
- **TO FLIP:** point the MX at Spacemail and turn Email Routing off, following Spacemail's DNS instructions (runbook line 67).

### D3. Resend: check the domain is verified, and decide the plan

- **Why.**
  - Resend refuses to send from an unverified domain.
  - The free plan caps daily sends (100 a day when last checked; `reminders-e2e-runbook.md:70`). Welcome emails and reminders share that cap.
  - A send day with more active subscribers than the cap fails part-way. The cron then answers 502, and a re-run mails the first recipients twice.
  - The signup card is live on the home page now.
- **Where.**
  - resend.com, **Domains**: `knowyour.vote` must show **Verified**.
  - resend.com, your plan or billing page: the daily and monthly limits.
- **Confirm.** The domain shows Verified. The plan's daily limit is written down where you will see it on send days.
- **Still open.**
  - The DNS records are in place: on 2026-10-08, a DKIM key at `resend._domainkey`, and MX and SPF at `send.knowyour.vote`.
  - The Resend dashboard status and the plan cannot be seen from here.
  - `voting_info_subscription` had 0 rows on 2026-10-08.
- **Recommended (pending founder confirmation):**
  1. On Fri Oct 16, run `SELECT count(DISTINCT lower(email)) FROM voting_info_subscription WHERE active` in the SQL editor.
  2. If it is above 50 (half the free cap, which leaves room for that day's welcome emails), move to a paid plan before Sun Oct 18.
  3. Otherwise stay free, and re-run the count each evening before a send day: Oct 18, Oct 20, Oct 26, Nov 1 and Nov 2. Upgrade once the count passes 50.
- **TO FLIP:**
  - Upgrade now, with no count checks.
  - Or stay free throughout and accept that a day over the cap fails part-way.

### D4. Change the Spacemail passwords for info@ and admin@

- **Why.** Both mailboxes shared one password, and it was pasted into a session chat (`founder-decisions-2026-10-04.md:32`). The mailboxes receive nothing while the MX is at Cloudflare, but their logins can still send mail as `knowyour.vote`.
- **Where.** Spaceship, Spacemail, each mailbox's password setting. Give each mailbox a different new password, and save both in your password manager.
- **Confirm.** Webmail sign-in works with each new password and fails with the old one.
- **Still open.** Listed open in `cowork-handoff-2026-10-05.md:75`, and nothing since records it done.
- **Recommended (pending founder confirmation):** change both.
- **TO FLIP:** if you never use Spacemail, delete the two mailboxes instead. That closes them fully.

### D5. Vercel environment variables, then one redeploy

- **Why.** Each variable below switches something on. All of them reach the site only after a redeploy (`reminders-e2e-runbook.md:32`). `ADMIN_EMAILS`, the Supabase Auth URLs and `CORRECTION_SECRET` are in A2.
- **Where.** Vercel, project **know-your-vote**, Settings, Environment Variables, target **Production**. Then Deployments, the current Production deployment, **⋯**, **Redeploy**: once, after all of them are set.

| Variable | Value | Why it matters | Still open because |
| --- | --- | --- | --- |
| `CRON_SECRET` (Sensitive) | Only if you have no saved copy: a new value you generate yourself (`openssl rand -hex 32` in your own terminal) | You need a copy for E1's trigger and rehearsal. Vercel cannot show a Sensitive value (`reminders-e2e-runbook.md:39-44`). Vercel Cron picks up a new value by itself after the redeploy, for all three crons | Only you know whether you kept a copy |
| `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` | The DSN from Sentry: create a Next.js project, then Project Settings, Client Keys (DSN). The same value works for both | Without them, no server or browser error is ever reported (`src/instrumentation.ts:10-11`, `src/instrumentation-client.ts:5`) | GET `/privacy` on 2026-10-08 says "We don't collect error reports right now" (`privacy/page.tsx:186-193`) |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `knowyour.vote`, after adding that site in your Plausible account | Turns on cookieless, aggregate analytics (`src/app/layout.tsx:183-189`). `/privacy` then says so by itself. **Cost:** Plausible's hosted service is a paid subscription after its free trial. The PRD estimated $0 to $9 a month and asked for the price to be checked (`docs/scope-changes.md:158`) | GET `/privacy` says "We don't run site analytics right now"; the home page HTML has no `plausible` script |

- **Confirm, after the redeploy.**
  - **Sentry and Plausible:** `/privacy` says "If something breaks, an error report goes to Sentry" and "We use cookieless, aggregate analytics (Plausible)".
  - **Sentry, browser side:**
    - Turn off any ad or content blocker for knowyour.vote. Blockers often block Sentry's ingest host, as they do Plausible.
    - Load a page, then wait at least 5 seconds. The browser SDK loads only once the page is idle, up to 5 seconds after load (`src/instrumentation-client.ts:11-15`).
    - In the browser console, run `setTimeout(() => { throw new Error("Sentry check 2026-10") })`. Within a minute it shows under Sentry, Issues.
    - The server side reports its first real error; do not cause one on purpose.
  - **Plausible:** the Realtime view counts your visit, with any ad blocker off.
- **Recommended (pending founder confirmation):** set the Sentry and Plausible rows. Set `CRON_SECRET` only if you have no saved copy.
- **TO FLIP:** leave Sentry or Plausible unset, or both. `/privacy` describes the unset state truthfully, and an unset Plausible costs nothing.

**Leave these unset through Nov 3:**

| Variable | Why | TO FLIP |
| --- | --- | --- |
| `SHOW_CANDIDATE_CONTACT` | Equal treatment (A5). The flag is site-wide, and the block renders for a candidate only when that candidate has a contact row with at least one field filled (`CandidateContact.tsx:18, 22-27`). Recommended (pending founder confirmation) | Set it to `true` only when the query below returns 0, so every ballot candidate on every published or listed race shows the block. Or first have an agent add a same-size "No campaign contact found" block for candidates without one, so every candidate shows the same section |
| `NOTIFICATIONS_PAUSED` | Any value stops all reminders. Recommended (pending founder confirmation) | Set it only while a correction is prepared (runbook, "Sending a correction", step 1) |
| `PELIAS_BASE_URL` | It would send voters' typed addresses to a new place a week before voting. Recommended (pending founder confirmation) | Set it, and `/privacy` describes the host by itself |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | They feed the admin Site page's Deployments panel (`src/lib/admin/site.ts:156-157`), listed as founder items in `docs/admin-dashboard/roadmap.md:25`, `launch-handoff-2026-10-04.md:159` and `.env.example:71-84`. A Vercel token reaches every project in its scope, far more than this read-only panel needs, and the Vercel dashboard shows the same deploys. Recommended (pending founder confirmation) | Create a token scoped to the team, with an expiry after Nov 3. Set all three (`VERCEL_TEAM_ID` only if the project sits in a team), then redeploy. Until then the panel names the missing variable |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | They feed the Errors panel (`src/lib/admin/site.ts:261-262`). Sentry's own Issues page shows the same, and the panel is empty until D5's DSN rows are set. Recommended (pending founder confirmation) | Create a Sentry user auth token with read scopes only (project read, event read). Set the three, then redeploy |

The `SHOW_CANDIDATE_CONTACT` check, which counts ballot candidates on published or listed races with no usable contact. It returned **106** on 2026-10-08 (82 in published races, 24 in listed ones):

```sql
SELECT count(*)
FROM race r
JOIN race_publication p ON p.race_id = r.race_id AND p.status IN ('published', 'listed')
CROSS JOIN LATERAL unnest(r.candidate_ids) AS u(cid)
JOIN candidate c ON c.candidate_id = u.cid AND c.ballot_status = 'ballot'
LEFT JOIN candidate_contact cc ON cc.candidate_id = c.candidate_id
WHERE coalesce(cc.campaign_email, cc.campaign_phone, cc.mailing_address, cc.contact_url) IS NULL;
```

### D6. Require CI on `main` in GitHub

- **Why.** A merge to `main` deploys production. Today a pull request can merge with red checks, and a push can skip review entirely. During early voting, every change should pass the `checks` and `build` jobs first (`docs/ci.md` "Founder actions", line 142).
- **Where.** GitHub, `JasonJosephIT/know-your-vote`, Settings, Rules, Rulesets, **New ruleset**, **New branch ruleset**:
  1. Name it `main`, set Enforcement to **Active**, and target the default branch.
  2. Tick **Require a pull request before merging**. Leave Required approvals at 0: GitHub does not let you approve your own pull request.
  3. Tick **Require status checks to pass**, and add `checks` and `build`. Leave `live-db` out.
  4. Leave the **Bypass list** empty (see the recommendation below).
  5. Save.
- **Confirm.** `gh api repos/JasonJosephIT/know-your-vote/rules/branches/main` lists a `pull_request` rule and a `required_status_checks` rule naming `checks` and `build`. The next pull request's merge box marks both as Required.
- **Still open.** On 2026-10-08:
  - `gh api repos/JasonJosephIT/know-your-vote/branches/main/protection` answered 404 "Branch not protected";
  - `…/rulesets` returned `[]`;
  - `…/rules/branches/main` returned `[]`.
- **Who a bypass covers.** On this Mac, `gh` is signed in as `JasonJosephIT` (`gh auth status`), and agent sessions open and merge pull requests through it. A bypass for you is therefore a bypass for every agent session: `gh pr merge --admin` would merge past red checks.
- **Recommended (pending founder confirmation):**
  - Leave the Bypass list empty. If a broken check ever blocks an Election Day fix, set the ruleset's Enforcement to **Disabled**, merge, then set it back to **Active**. That is a deliberate step in the GitHub UI, not a flag on a merge command. (`docs/ci.md:152` recommends keeping yourself on the bypass list; it does not consider that agent sessions merge as you.)
  - Leave "Require branches to be up to date" unticked. Several sessions merge on the same day, and that setting would force a re-run of CI for each.
- **TO FLIP:**
  - Add Repository admin to the Bypass list with mode **For pull requests only**. That stops direct pushes to `main`, but you, and any session on your account, can still merge a pull request past red checks.
  - Or tick "up to date" for strict ordering.

### D7. Rotate the four secrets that were pasted into chats

- **Why.** Each was exposed in a transcript (`cowork-handoff-2026-10-05.md:81`; `pipeline-run-scope-2026-09-10.md:135`).
- **Nothing breaks.** Nothing deployed reads any of them: a search of `src/` finds no `ANTHROPIC_API_KEY`, `FEC_API_KEY`, `SUPABASE_DB_URL` or RapidAPI key. So rotating cannot break the site, and doing it before the freeze clears it.
- **`.env.local`.** Agents never read it. Edit it yourself.

1. **FEC key.**
   - Where: https://api.open.fec.gov/developers/, which links to the api.data.gov sign-up. Get a new key and put it in the main checkout's `.env.local` as `FEC_API_KEY`. Only the local Python tool layer reads it.
   - If you cannot deactivate the old key yourself, ask api.data.gov to, through its contact page. An FEC key only reads public data, so the exposure is someone using up your rate limit.
   - Confirm: in a terminal, run `read -rs FEC_API_KEY`, then `curl -sS -o /dev/null -w "%{http_code}\n" -H "X-Api-Key: $FEC_API_KEY" "https://api.open.fec.gov/v1/candidates/?per_page=1"`. It prints `200`.
2. **Anthropic key.**
   - First, open the main checkout's `.env.local` yourself and look at the `ANTHROPIC_API_KEY` line. An agent session reported it present but empty on 2026-10-07 (spec §2, line 57). If it holds a value, that value is the exposed key: blank the line.
   - Then, at console.anthropic.com, Settings, API keys: delete every key that was ever pasted into a chat.
   - Create a new key only when something needs one. The S2 runtime that reads it is parked.
   - Confirm: the old key is gone from the list, and Usage shows no calls from it after the deletion.
3. **`cap_tool_wrapper` database password.**
   - The role can still log in, but nothing uses it: on 2026-10-08, `pg_roles.rolcanlogin` was true, there were 0 sessions in `pg_stat_activity`, and `action_log` had 0 rows.
   - Do: connect with `psql` as the database owner, run `\password cap_tool_wrapper`, and type the new password at the prompt. `\password` sends it hashed and keeps it out of history.
   - Fallback: `ALTER ROLE cap_tool_wrapper WITH PASSWORD '…'` in the Supabase SQL editor. Then delete that query from the editor's saved queries, because the editor keeps them.
   - Put the new connection string in `.env.local` as `SUPABASE_DB_URL` only if you will run the tool layer.
   - Confirm: a connection with the old password is refused.
   - Recommended (pending founder confirmation): rotate.
   - TO FLIP: run `ALTER ROLE cap_tool_wrapper NOLOGIN;` instead. That closes the role until the runtime is un-parked.
4. **MBFC RapidAPI key.**
   - Where: rapidapi.com, the app that holds the MBFC subscription, Authorization. Delete the exposed key. Add a new one only if you still use that API; nothing in the repo does.
   - Cancel the MBFC plan there if it is a paid one.
   - Confirm: the key list no longer shows the old key.

---

## E. By Sun Oct 18 (before the first real reminder, Mon Oct 19 at 14:00 UTC)

### E1. Run the reminder end-to-end test

Needs D1, D2 and D5 first. Step 5 (E2) also needs A2's `CORRECTION_SECRET`.

- **Why.** No reminder has ever been sent in production. Reminders send only on their exact day, so a broken send on Oct 19 is lost for good (`founder-decisions-2026-10-04.md:36-39`).
- **Where.** `reminders-e2e-runbook.md` step 4 (from line 81), from your own browser, terminal and Supabase SQL editor:
  1. **4a.** Subscribe a personal address (not info@) with a covered ZIP.
  2. **4b.** Trigger the cron. Between Oct 8 and Oct 18 it answers `{"due":0,"sent":[],"skipped":[]}`.
  3. **4c.** Rehearse. This uses rehearsal mode, decision 3a, which C2 asks you to confirm. With a covered-county ZIP the answer names `early_voting_start`, with `real_send_date` `2026-10-19`.
  4. **4d.** Read the send log.
  5. Run **E2** now, while the address is still subscribed.
  6. **4e.** Unsubscribe.
  7. **4f.** The canary (below).
- **4f, keep a canary. Recommended (pending founder confirmation; `reminders-e2e-runbook.md:186`):** subscribe one address you read and leave it subscribed through Nov 3, so you receive every real reminder as voters do.
  - **TO FLIP:** skip it. You then see each send day only through its digest at info@ (F1), not as a voter sees it.
- **If you flipped 3a:** the rehearsal block is gone, so skip 4c and 4d. The first real send on Oct 19 is then the first test of the send path.
- **Confirm.**
  - The welcome email and "[Rehearsal] Early voting starts today" both arrive, and Gmail's "Show original" reads SPF, DKIM and DMARC PASS.
  - `SELECT dedupe_key, recipient_count FROM notification_send_log ORDER BY sent_at DESC LIMIT 5` shows the `rehearsal:…` row with `recipient_count = 1`.
  - Unsubscribing sets `active = false`.
- **Still open.** On 2026-10-08, `voting_info_subscription` had 0 rows and `notification_send_log` had 0 rows.

### E2. Rehearse a correction once (never its real send)

Needs A2's `CORRECTION_SECRET` and E1 4a first.

- **Why.** The correction is the only remedy if an email states a wrong date. A rehearsal is the only way to see it work before it is needed.
- **Where.** `reminders-e2e-runbook.md`, "Sending a correction". Use the rehearsal fields from lines 362-365: the statewide vote-by-mail request deadline, 2026-10-22, a date that is already right. Run step 3, then the **dry run** (step 4), then **rehearse** (step 5) to your E1 address.
- **Never run step 6 as a test.** It mails every subscriber a correction for a date that was never wrong (line 367).
- **Confirm.**
  - The dry run returns `"dry_run":true` with a `dedupe_key` beginning `correction:general_2026:vbm_request_deadline:2026-10-22`.
  - The rehearsal returns `"rehearsal":true`, and "[Rehearsal] Correction: an election date we sent was wrong" arrives.
- **Still open.** `notification_send_log` had 0 rows, so no rehearsal has run.
- **Recommended (pending founder confirmation; `reminders-e2e-runbook.md:360`):** rehearse once, before Oct 19.
- **TO FLIP:** skip it. The first live call to the correction route is then a real correction, made on a day something has already gone wrong.

### E3. Confirm the 5 p.m. vote-by-mail request cutoff

- **Why.** The Oct 21 reminder, the welcome email and the banner all say a vote-by-mail request "must be received by 5 p.m. local time" (`src/lib/notifications/templates.ts:114-116, 285`). That wording rests on one reading of s. 101.62(3)(c), Fla. Stat. (`reminders-e2e-runbook.md:438`).
- **Where.** The statute at flsenate.gov (s. 101.62), and the Division of Elections dates page (https://dos.fl.gov/elections/for-voters/election-dates/).
- **Confirm.** Both say 5 p.m. local time on the 12th day before the election, which is Thu Oct 22. Tell a Claude session it matches. If it does not, an agent changes those three strings before Oct 20.
- **Still open.** The runbook lists it under "To confirm (Founder)", and nothing records it done.
- **Deadline.** Sun Oct 18, with Tue Oct 20 as the last safe day.

---

## F. By Mon Nov 2 (before Election Day)

### F1. Re-check the Resend cap before each send day

This is the recurring part of D3.

- **When.** The evenings of Oct 18, Oct 20, Oct 26, Nov 1 and Nov 2.
- **What.** Run the active-address count from D3, and upgrade before a send day if it is above 50.
- **Confirm.** Each send day's digest arrives at info@ ("Know Your Vote reminders digest — <date>"). If you kept a canary (E1, 4f), it receives each reminder.

### F2. Install arm64 Node for the whole Mac

- **Why.** Every agent command runs Node from inside another app's folder: `…/Logi/LogiPluginService/PluginHosts/node22/node/bin/node`. That path can move when the Logi app updates, and R5 and the agent worktree would then stop until a session notices (spec §2, lines 51-54; `scripts/agent-worktree.sh`).
- **Where.** The arm64 Node 22 installer from nodejs.org (macOS, ARM64), or an arm64 Homebrew.
- **Confirm.** `node -p process.arch` prints `arm64` in a new terminal.
- **Recommended (pending founder confirmation):** do it after Nov 3, unless the Logi path breaks first. A new Node mid-election is a change nobody needs.
- **TO FLIP:** install now, then ask a session to point the agent prompts at it.

---

## No action recommended

### N1. The 6 election-date rows with `verified_by` NULL

- **What they are.** They are the **primary** election's rows (`primary_2026`), dated 2026-07-20 to 2026-08-18. All of those dates are past. Every `general_2026` row is verified (see "Already done").
- **Why not stamp them.**
  - Unverified rows never reach a page, an email or a calendar file (`src/lib/notifications/election-events.ts:5-8, 58`).
  - The banner and the signup read only `general_2026` (`src/lib/election.ts:21`, `src/app/api/voting-info/route.ts:132`).
  - Stamping them would only publish past primary dates in `/api/calendar/primary_2026.ics`.
- **Recommended (pending founder confirmation):** leave them unverified.
- **TO FLIP:** check each against its `details_url`, then stamp it with the `UPDATE` in `reminders-e2e-runbook.md`, "Sending a correction", step 2, using `election = 'primary_2026'`.

## Order at a glance

1. **A1 → A2 → A3:** pause R1 and R3 first, then open /admin, then check the sweep's first run after 11:00 UTC today. A2 needs nothing else first.
2. **A4 → A5:** decide the risk, then approve tools. R5's first three commands were already approved before A4; answer nothing more until A1 and A4 are done. **A6** and **A7** can be done in any order by Fri Oct 9. A6's correction path needs A2's `CORRECTION_SECRET`.
3. **B1:** your Ballotpedia decision and go, before Wed Oct 14.
4. **C1 and C2:** by Wed Oct 14, so their fixes and flips ship before the freeze.
5. **D1 to D7:** D1, D2 and D5 come before E1. D2's admin@ rule is needed only for A2's TO FLIP.
6. **E1 4a to 4d → E2 → E1 4e and 4f:** the correction rehearsal needs an active subscription and A2's `CORRECTION_SECRET`.
7. **E3:** any time before Oct 18.
8. **F1:** the evening before each send day. **F2:** after Nov 3 unless forced.
