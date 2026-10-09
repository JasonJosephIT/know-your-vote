# Agent retrofit (R2 to R5 onto one footing): design

Date: 2026-10-08, revised the same day after review. Status: draft for
founder review. Nothing here has been applied, merged or scheduled. Every
founder call in §4 is "Recommended (pending founder confirmation)" until the
founder says otherwise.

This is one of four specs dated 2026-10-08. Three of them touch the same
agents: `2026-10-08-news-source-integrity-design.md`,
`2026-10-08-ballot-content-completion-design.md` and
`2026-10-08-roster-completeness-design.md`. The founder checklist
`docs/general-election/founder-checklist-2026-10-08.md` also has agent steps.
§3.0 names one owner for each shared item, so a builder gets one design per
file and the founder answers each question once.

## 1. Purpose

Move the scheduled agents R2 to R5 onto the footing R5 began on 2026-10-07
(`docs/superpowers/specs/2026-10-07-candidate-leads-agent-design.md`): a
clean agent worktree, the arm64 `node` by literal path, and one reviewed CLI
per agent as its only write path. Early voting starts 2026-10-19 in the four
covered counties, Election Day is 2026-11-03, and the brief-content freeze
runs 2026-10-18 to 2026-11-03, so the parts that matter for voters land first
(§5).

What the retrofit has to make true:

1. **Nothing an agent produces is voter-facing until a human approves it in
   /admin.** R2 stops writing `candidate_contact`. R3's direct `news_item`
   insert is replaced by a queue (news-source-integrity §3.2), which this
   spec runs through the shared wrapper. Every agent write is a pending
   `review_item`, or an ops-only column no page reads.
2. **No source, no card.** Every news row an agent proposes carries a
   `source_id` the approve path can resolve. The resolution is
   news-source-integrity's (§3.2 there). This spec keeps R3 on it and asks for
   four changes to its official list (§3.4).
3. **A run does not wait on a prompt for a tool its job needs, and a run that
   stalls anyway is reported within about two hours.** Each agent runs one
   pre-approved command, every CLI step has a hard timeout, and the wall-clock
   budget is checked at every step. Nothing inside a session can end a session
   that is waiting on a prompt or on a tool call that never returns (R3's
   2026-10-07 run, §2.2). So this design does not promise that no run lasts
   for hours. It promises that such a run is marked failed in /admin and
   pushed to the founder's phone by the watchdog (§3.2, D10). Stopping it
   stays one tap in the app.
4. **Agents run current code**, not the stale main checkout with its x86
   `node`.
5. **R4 describes the system that exists.** It keeps everything it reports
   today that is still true (pipeline state, the daily cron's heartbeat), and
   adds the review queue, the cron sweep, the reminder cron, R5 and stalled
   runs. It drops `race.key_dates` and metro slugs.

End state:

| Agent | After the retrofit |
|---|---|
| R1 | No routine. "R1" is the news-sweep cron, which already queues candidate news for review (news-source-integrity D5). This spec adds its run record and its console label. |
| R2 | Logistics checks: candidate-site liveness, qualifying-status changes queued as `gated_diff`, official-date changes queued as `date_mismatch`. Contact collection after 2026-11-03, to roster-completeness §3.8's design. |
| R3 | Election notices from official sources only, queued as `manual_news` through news-source-integrity's `election-news.ts`, run through the wrapper with four added rules. |
| R4 | Read-only digest regenerated from the agent worktree. |
| R5 | Same job; moves onto the wrapper so one approval covers every run. One verification change is D1. |
| Watchdog | New, hourly: reports any run still going after twice its budget. |

## 2. Current state

Every claim was checked on 2026-10-08 between 06:20 and 07:10 UTC, read-only.
SQL ran against project `pqracitpmzpiqfnzlngw` through the Supabase connector
(SELECT only). Scheduled-task facts come from the desktop app's
`list_scheduled_tasks`, `list_task_runs` and the run transcripts
(`list_events`); file times come from `stat`.

### 2.1 Where the agents run

- **All five routines start in the main checkout.** `get_session` on R3's
  2026-10-07 run and R5's 2026-10-08 run both report
  `cwd: /Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)`.
- **The main checkout is stale and dirty.** `git rev-parse --short HEAD` =
  `f79b1d2`; `git rev-list --count HEAD..origin/main` = **349**;
  `git status --porcelain | wc -l` = **118**.
- **Its `node` is x86.** `which -a node` finds only `/usr/local/bin/node`
  (`file`: `Mach-O 64-bit executable x86_64`), which crashes under Rosetta on
  this Mac (R5 spec §2). The arm64 binary at
  `/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node`
  reports `arm64 v22.19.0`.
- **The agent worktree and the runs folder exist.** `git worktree list` shows
  `/Users/jsloth/Projects/kyv-agent-worktree 1580328 (detached HEAD)`;
  `node_modules/.lock-sum` was written 2026-10-08 00:54:40 EDT.
  `/Users/jsloth/Projects/kyv-agent-runs/` and its subfolder `2026-10-08/` were
  both created 2026-10-08 02:40:13 EDT (06:40:13 UTC); the subfolder is empty.
  The worktree's `.env.local` link was recreated in the same second, and that
  link is the last step of `scripts/agent-worktree.sh` (`:50-51`). Both come
  from R5's first run (§2.8).

### 2.2 How the runs stopped

The main checkout's `.claude/settings.local.json` is the only allow list these
sessions get (`~/.claude/settings.json` has 0 allow rules). It allows
`mcp__dcc7c42a-9393-475b-91b1-7e352d5d21f0__execute_sql`, `list_migrations`,
`list_tables`, `WebSearch`, `Bash(node scripts/verify-news-neutrality.ts)`,
`Bash(git checkout *)`, `Bash(git fetch *)`, `Bash(gh pr *)`, one literal
`mkdir` of the RunReports folder, and `WebFetch` for ten hosts
(`example.org`, `www.ocfelections.gov`, `ocfelections.gov`,
`www.votehillsborough.gov`, `www.miamidade.gov`, `dos.fl.gov`,
`storage.courtlistener.com`, `browardvotes.gov`, `news.ballotpedia.org`,
`ballotpedia.org`). Nothing in it allows the agent worktree, the Logi `node`,
`apnews.com`, `voteorangefl.gov` or `www.votemiamidade.gov`.

| Routine | Newest run (UTC) | Recorded status | Tool calls at the end of the transcript | Newest report file |
|---|---|---|---|---|
| R1 `cap-r1-candidate-news` | 2026-10-01 14:36 to 14:38 | succeeded | three `WebSearch`, then two `WebFetch` | `2026-07-15-R1.md` |
| R2 `cap-r2-contact-refresher` | 2026-10-05 12:01 to 12:09 | succeeded | `ToolSearch`, `Bash`, `Read`, five `execute_sql`, a status line, then a second `Bash` | `2026-09-14-R2.md` |
| R3 `cap-r3-election-news` | 2026-09-30 13:02:13 to 13:02:27 | succeeded | `ToolSearch`, `Bash`, `execute_sql`, `Read`, four `execute_sql`, `WebFetch`, `WebSearch`, two `WebFetch`, then `Bash`, `WebSearch`, `WebSearch` | (none) |
| R3 | 2026-10-07 13:08 to 2026-10-08 02:02 | failed | three `WebFetch` and a `WebSearch`, then `[Request interrupted by user for tool use]`. The recorded error is an API 400: "The following domains are not accessible to our user agent: ['apnews.com']" | (none) |
| R4 `cap-r4-ops-digest` | 2026-10-05 11:48:44 to 11:48:55 | succeeded | `ToolSearch`, then its first `Bash` | `2026-07-06-R4.md` |
| R5 `cap-r5-candidate-leads` | 2026-10-08 06:19:46, still open | running, last activity 06:40:18 | two `Bash` calls (§2.8) | (none) |

Reports are in
`/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/Civic Awareness (Know Your Vote)/Agents/RunReports/`
(`ls -t`). No agent has written a report since 2026-09-14, and
`CAP_Ops_Digest_latest.html` was last written 2026-07-06 00:31 (file time).

What the record shows, and what it does not:

- The transcripts name the tool of each call. They do not show its argument
  or whether it raised a permission prompt. So the cause of each stop is not
  established.
- A shell call is not by itself the stop. R2's first `Bash` ran, and the run
  went on to five database reads. R3's 2026-09-30 first `Bash` (its second
  call) ran, and the run went on. R4 stopped at its first `Bash`, R2 at its
  second. R5's setup shell work waited about 20 minutes and ran at 06:40,
  when the founder answered it by hand (founder checklist A5; §2.8).
- R3's 2026-09-30 run ended on one batch of `Bash`, `WebSearch`, `WebSearch`
  (the whole run spans 14 s by its recorded times). `WebSearch` is allowed, so
  the `Bash` is the likelier blocker.
- R1's 2026-10-01 run ended on two `WebFetch` calls whose hosts the
  transcript does not show.
- R3's 2026-10-07 run is the one that sat for about 13 hours. Its last call
  was a `WebSearch`, which is allowed, and its recorded error is an API
  refusal of `apnews.com`, not a permission prompt. As far as the record
  shows, that run stalled on a tool call after an API error, and only the
  founder could end it.

So two causes have to be covered: a prompt for a tool the run needs, and a
stall on a tool that is allowed. Pre-approval of one fixed command (§3.3)
addresses the first. Nothing inside a session can end the second; the
watchdog (§3.2) and the run log (§3.1) report it.

### 2.3 R1 and R3 write news straight to `news_item`

- R1's stored prompt writes with `execute_sql INSERT into news_item ONLY`,
  columns `item_type, candidate_id, race_id, title, summary, url,
  published_at` (`cap-r1-candidate-news/SKILL.md:56`): no `source_id`, no
  review. R3's does the same for `election_news` with a `metro` slug
  (`cap-r3-election-news/SKILL.md:52-53`).
- R3 wrote 4 rows on 2026-07-06 (`2026-07-06-R3.md:4`) and 4 on 2026-09-09
  (`2026-09-09-R3.md:4`, ids at `:144-146`). R1 never wrote ("Items written:
  0", `2026-07-06-R1.md:168`, `2026-07-15-R1.md:136`).
- `SELECT count(*) FROM news_item WHERE item_type IN
  ('candidate_news','election_news') AND source_id IS NULL` returns **8**, all
  `election_news`. 0042 and 0014 attribute them and 0014 adds the CHECK.
  Neither is applied (`list_migrations`; `pg_constraint` on `news_item` has no
  `news_item_agent_source_check`). How they are applied is
  news-source-integrity §3.1.

### 2.4 The review queue and the cron sweep

- `review_item` holds 90 rows, all `manual_news` from source `agent:R1`
  (48 approved, 42 rejected), created 2026-10-06 between 16:40 and 19:55 UTC.
  0 are pending; no other kind has a row.
- `agent:R1` is the sweep's label: `enqueueIntake` writes
  `source: "agent:R1"` (`src/lib/news-intake.ts:294`).
- The cron runs Mondays and Thursdays at 11:00 UTC (`vercel.json`,
  `/api/cron/news-sweep`, `0 11 * * 1,4`) over a 14-day window
  (`src/app/api/cron/news-sweep/route.ts:25`). news-source-integrity D9
  recommends daily.
- The route returns early in four places: 401 on a wrong secret (`:47`), 503
  when the service client cannot be built (`:51-57`), 502 when the sweep
  throws (`:65`), and 502 when queueing throws (`:79-83`).
- `agent_run` exists with 0 rows. Its CHECK admits `R1`, `R2`, `R3`, `R4`
  and `dispatcher` (`0006_admin_ops.sql:26`), not `R5`.
- Migration 0047 is live (`list_migrations`: `0047_candidate_lead_kind` at
  `20261008060351`); the ledger row still says "not applied"
  (`supabase/migrations/README.md:63`).

### 2.5 Official sources and the approve path

- `planSourceAttribution` (`src/lib/news-enqueue.ts:181-203`) has three steps:
  a given `source_id` (`:188-192`); a listed outlet (`:193-199`), or
  `unsigned` when that outlet's lean is not signed off; then the page's
  `url_norm` (`:200-201`), or `none` when the URL cannot be normalised. The
  route looks the page row up by `url_norm` and refuses when none exists
  ("No source found for this story",
  `src/app/api/admin/review/[id]/decision/route.ts:345-356`). An official
  page is not an outlet, so an R3 item from a Supervisor of Elections page
  fails closed at approval unless a page row already exists.
- Live government rows. `SELECT source_id, publisher, url_norm FROM source
  WHERE type='primary_doc' AND url_norm NOT ILIKE '%example.org%'` returns
  **9**, all lean `N/A`:

  | Host | Rows | Publisher as stored |
  |---|---|---|
  | `constitutionalinitiatives.dos.fl.gov` | 3 (`src_dos_init_detail_am1` to `am3`) | Florida Dept. of State, Division of Elections |
  | `files.floridados.gov` | 1 (`src_fldos_amend_booklet_2026`) | Florida Division of Elections |
  | `www.flsenate.gov` | 2 | The Florida Senate; The Florida Senate, Committee on Finance and Tax |
  | `www.flhouse.gov` | 2 | Florida House of Representatives |
  | `ocfl.net` | 1 (`src_ocfl_property_tax_am3`) | Orange County Government, FL |

  The other 29 of the 38 `primary_doc` / `N/A` rows are `example.org` demo
  rows. All 9 are page rows behind measure resources; none has a bare host
  as its `url_norm`.
- The rows 0014 and 0042 would add use their own strings: 'Florida Senate'
  (`0014_news_fairness.sql:83`); 'Miami-Dade County', 'Broward County
  Supervisor of Elections' and 'Hillsborough County Supervisor of Elections'
  (`:71-79`); 'Florida Dept. of State, Division of Elections'
  (`0042_news_source_backfill.sql:75`). So one body can already read two ways
  across the site: the Senate's measure-resource rows against 0014's news
  row.
- Miami-Dade's Supervisor of Elections is at `https://www.votemiamidade.gov/`
  (`src/lib/supervisors.ts:24-29`, checked 2026-10-05); miamidade.gov's
  elections page redirects there (`:12-14`). The Division of Elections'
  directory lists the office at `miamidade.gov/elections` (`:17-22`).
  Hillsborough's and Orange's sites "sit behind a Cloudflare check that
  refuses scripted requests" (`:22-23`).
- Miami-Dade County Commission Districts 2 and 5 are on the roster
  (`FL-DAD-CC2-general`, `FL-DAD-CC5-general`, both published;
  `SELECT … FROM race WHERE district LIKE 'DAD-%'`).

### 2.6 R2: contact, stamps, gated diffs, dates

- R2's prompt writes `candidate_contact` (upsert),
  `candidate.site_last_verified_at` and `race.info_last_verified_at` directly
  (`cap-r2-contact-refresher/SKILL.md:55-58`), and puts gated diffs only in
  its report (`:66`).
- None of it has happened. `candidate_contact` has 0 rows; 0 of 53 races have
  `info_last_verified_at`. The 97 candidates with `site_last_verified_at`
  were stamped by the official-site migrations (`0032`, `0036`, `0038`,
  `0039`), not by R2.
- The queue R2 should use exists: `gated_diff` and `date_mismatch`
  (`src/types/admin.ts:103-111, 122-128, 180, 184`); the whitelist
  `race.key_dates`, `race.office`, `race.district`,
  `candidate.qualifying_status` (`src/lib/admin/effects.ts:20-26`);
  `date_mismatch` planned today as a `race` update (`:124-128`); and a
  confirm step before approving either kind
  (`src/components/admin/DecisionControls.tsx:16`).
  `DateMismatchPayloadSchema` is a plain `z.object` (`admin.ts:122-128`),
  which strips unknown keys.
- `candidate_contact` is anon-readable (`USING (true)`,
  `0005_refresh_agents.sql:52-55`). Its block renders only when
  `SHOW_CANDIDATE_CONTACT` is `"true"`
  (`src/components/features/CandidateContact.tsx:15`). The two freshness
  stamps are read only by the admin monitor
  (`src/lib/admin/monitor.ts:338-347`).
- **Dates moved.** `race.key_dates` is `{}` on all 53 races.
  `key_dates.general_date` is still read by `RaceHeader.tsx:21-22`,
  `YourRaces.tsx:59-64, 272`, `src/lib/races.ts:95, 150` and
  `src/lib/resolve.ts:266, 287`, so approving a `key_dates` diff for one race
  would show a date on that race and no other. The dates live in
  `election_event`: 6 statewide `general_2026` rows and 8 county early-voting
  rows, all with `verified_by` set (founder checklist, "Already done"), plus
  6 `primary_2026` rows. The `general_2026` rows cite these pages
  (`details_url`):

  | Scope | `details_url` |
  |---|---|
  | statewide | `https://dos.fl.gov/elections/for-voters/election-dates/` and `https://dos.fl.gov/elections/for-voters/voting/vote-by-mail/` |
  | 12011 Broward | `https://browardvotes.gov/voters/early-voting-ballot-return` |
  | 12057 Hillsborough | `https://www.votehillsborough.gov/EarlyVoting` |
  | 12086 Miami-Dade | `https://www.miamidade.gov/elections/library/early-voting/2026-11-03-general-election-early-voting-schedule.pdf` |
  | 12095 Orange | `https://voteorangefl.gov/vote-early/` |

- **Scope.** 106 ballot-tier candidates are listed in some
  `race.candidate_ids`: 82 in the 36 published races, 24 in the 17 listed
  races. `profile` has 82 rows, all in published races. So `loadRoster`
  (`news-intake.ts:151-171`, which reads `profile`) returns 82. No existing
  plain-Node function returns the 106: `src/lib/directory.ts:23-27` reads
  `race.candidate_ids` but imports the server client.
- **Statuses.** `SELECT split_part(candidate_id,'-',2), qualifying_status,
  count(*) FROM candidate WHERE ballot_status='ballot' GROUP BY 1,2`:
  `FL-DOE` 56 qualified, 1 unopposed; `FL-VF` 34 qualified, 5 unopposed,
  10 elected_in_primary. The CHECK admits `qualified`, `unopposed`,
  `elected_in_primary`, `withdrawn` and `other`.
- **The DoE extract** is a deterministic source for `FL-DOE` statuses:
  `extractCanList.asp`, `elecID=20261103-GEN`, one POST per office group
  (`Civic Awareness (Know Your Vote)/toollayer/cap_toollayer/intake.py:5-16,
  48-49, 825-831`), status map `_STATUS` (`:137-141`). The file carries
  addresses, phones and emails (`:12-16`).
- **VoterFocus** holds the county candidates' statuses: one server-rendered
  URL per county with no key,
  `https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=<county>`,
  `c` = `orange`, `miamidade`, `broward`, `hillsborough`
  (`docs/general-election/roster-recalibration-2026-09-21.md:164-165`). Its
  labels are Runoff, Qualified, Unopposed, Elected, Withdrawn, Defeated, Did
  not qualify and Qualified Write-In (`:155-159`). No code holds that label
  map or the county slugs. The 2026-09-21 derived file records only
  Qualified (104) and Runoff (22)
  (`docs/general-election/ballots/local-ballot-2026-09-21.json`).

### 2.7 R4

- R4's sections are AGENT RUNS for R1 to R3 plus the daily cron's heartbeat
  (newest `pipeline_event`), FRESHNESS, FEED HEALTH by `metro`, PIPELINE
  STATE (races by `race_publication.status`, profiles by
  `balance_check_passed`, recent flags), WAITING ON JASON (with "R3
  key_dates mismatches") and OPEN RISKS (`cap-r4-ops-digest/SKILL.md:20-33`).
  Nothing reads `review_item`, the sweep, the reminder cron or R5.
- `balance_check_passed` is not a column (the SELECT fails with 42703). It is
  a key in `profile.audit`: 82 profiles, all `true`; 33 carry a
  `flag_reason`. Races by status: 36 `published`, 17 `listed`.
- The refresh-news cron (`vercel.json`, `0 10 * * *`) inserts one
  `pipeline_event` row the first time it sees a race published
  (`src/app/api/cron/refresh-news/route.ts:77-106`). So the newest one
  (2026-10-04 18:05 UTC) dates the last publish, not the last run. A
  published race with no `pipeline_event` row a day after it was published
  means the cron did not run.
- The reminder cron (`/api/cron/send-reminders`, `0 14 * * *`) claims each
  send in `notification_send_log` (`dedupe_key`, `sent_at`,
  `recipient_count`) and writes no row when a reminder is due but has no
  recipients (`send-reminders/route.ts:210-213`). Today: 0 log rows, 0
  subscriptions. Which reminders fall due on a day is pure code
  (`dueRemindersByScope`, `nextReminder`,
  `src/lib/notifications/schedule.ts:145, 166`). Its imports are type-only,
  so plain Node can load it; `election-events.ts` imports `server-only`.
- R4 runs the lint as `node scripts/verify-news-neutrality.ts` from the main
  checkout (`:52`), with the x86 `node`.

### 2.8 R5

- R5's routine prompt equals `agents/r5-candidate-leads.prompt.md` apart
  from the frontmatter. Its commands embed that day's run folder: `<RUN>` is
  `/Users/jsloth/Projects/kyv-agent-runs/<today>` (prompt `:27-30`), used in
  the commands at `:39, 66, 80, 83`. A command approved on one day is a
  different command the next.
- Its first run (session `local_16def1c8…`) started 06:19:46 UTC. The
  transcript shows two `Bash` calls. The runs folder and the worktree's
  `.env.local` link were written at 06:40:13 UTC, so the setup (`date`,
  `mkdir`, `agent-worktree.sh`) has run. The run folder holds no
  `stories.json`, so PREP, the full-path `node` command, has not.
  `list_task_runs` shows the run `running`, last active 06:40:18. The founder
  checklist (A5) records the setup prompts as answered by hand at about
  06:40.
- Its next scheduled run is 2026-10-08 13:38:45 UTC (`list_scheduled_tasks`).
- Verification in the approved design: the Division of Elections candidate
  search for state and federal offices and running mates; "that county
  Supervisor of Elections' candidate list" for county offices; "the city
  clerk's or county Supervisor of Elections' list" for city offices (R5 spec
  §3 step 5; prompt `:69-72`). Leads are by definition outside the four
  covered counties, so those lists sit on hosts nobody has approved.

### 2.9 Console code that lists the agents

- `src/lib/admin/monitor.ts:27-33`: `AgentName` and `AGENTS` are `R1` to
  `R4` and `dispatcher`. Rows for any other agent are skipped (`:125-126`,
  `:304-305`).
- `src/app/api/admin/agents/runs/route.ts:13`: the `agent` filter is
  `z.enum(["R1","R2","R3","R4","dispatcher"])`, so `?agent=R5` is a 400.
- `src/components/admin/AgentsConsole.tsx:43-48`: the labels are R1
  "Fact-check", R2 "Candidate contact & gated fields", R3 "Key dates", R4
  "Ops digest"; the run filter's options come from that list (`:474-479`).

### 2.10 What the other 2026-10-08 documents say about the same things

| Document | On the shared items |
|---|---|
| news-source-integrity §3.1, D1 | Apply 0042 then 0014; recommends deleting the Ballotpedia row (0042's delete variant). |
| news-source-integrity §3.2, D5 | Disables R1 (the cron is R1). `official-sources.ts` with `official:<domain>` rows. Approve order: given, outlet, page row, official, refuse. `scripts/election-news.ts queue [--dry-run]` for R3, refusing the batch at the first bad item. R3's prompt rewritten to R5's structure. CourtListener left out. R3 stays weekly. |
| news-source-integrity §3.4, §3.5 | Claims 0048 for `news_tags`; a tagger routine R6. Sweep daily (D9). |
| ballot-content-completion §3.6.2, BC9 | Migration "0048_content_freeze". From 2026-10-18 04:00 UTC to 2026-11-04 05:00 UTC a row trigger refuses any `candidate` UPDATE except one changing only `site_last_verified_at`, and any `race` UPDATE except one changing only `info_last_verified_at`, unless `kyv.freeze_correction` is set. `candidate_contact` is refused outright. `election_event` is not guarded. |
| ballot-content-completion §3.6.6, BC12 | Disable R2 before Mon 10-12 08:00 EDT and R1 before Thu 10-15, both through Nov 3; R3, R4, R5 unchanged. Claims 0049 for AM1. |
| roster-completeness §3.2 | Claims 0048 for incumbency columns, including `candidate.running_mate`. |
| roster-completeness §3.8, §3.9, rollout 2 | `contact_update` review kind after Nov 3, with `verified_by` set to the approving operator. R2's prompt edited now to drop the contact upsert. R2 compares running mates against DoE `canDetail`. |
| founder checklist A1, A4, A5 | Pause R1 and R3. Accept the `execute_sql` risk for R2, R4 and R5 through Nov 3. Watched Run now of R5, R2 and R4 on their current prompts. |
| migration ledger | `README.md:64`: "0048+ free". Rules 2 and 3 (`:11-15`): claim the number in the ledger first; planning docs follow the table. |

## 3. Design

### 3.0 What this spec owns

| Item | Owned by | What this spec does |
|---|---|---|
| Applying 0042 and 0014; the Ballotpedia row | news-source-integrity §3.1, D1 | Nothing. Rollout step 1 points there. |
| Retiring the R1 routine; the cron as R1 | news-source-integrity §3.2, D5 | Adds the cron's `agent_run` row and the console labels (§3.1). |
| `official-sources.ts` and the approve-path change | news-source-integrity §3.2 items 1-2 | Asks for four list changes (§3.4). Adopts its order: page row before official row. |
| R3's queue CLI `election-news.ts`, R3's first prompt rewrite, R3's weekly cadence | news-source-integrity §3.2 items 3-4 | Moves R3 onto the wrapper and adds a `context` step and four rules (§3.5). |
| Sweep cadence | news-source-integrity §3.5, D9 | R4's missed-sweep rule reads the schedule from `vercel.json`, so it holds under either answer. |
| Freeze guard on `candidate` and `race` | ballot-content-completion BC9 | R2's stamps pass it by name; a status approval inside the window fails closed (§3.6). |
| Which agents run during the freeze | ballot-content-completion BC12 | D6 and D7 are the same questions; §4 says how one answer covers both. |
| Contact review kind, payload, display | roster-completeness §3.8, its D8 | PR E builds R2's collector to that design after Nov 3 (§3.6). |
| Running mates in R2's race check | roster-completeness §3.9 | PR D's `check` adds the comparison once the column exists (§3.6). |
| R2's interim prompt edit (drop the contact upsert) | roster-completeness rollout 2 | Not needed while R2 is disabled (D5); PR D replaces the prompt. |
| Migration numbers | the ledger | This spec claims none now (§5 step 0). |
| The wrapper, the run log, the watchdog, R2's checks, R4's digest, R5's move | this spec | §3.1 to §3.8. |

### 3.1 Shared footing: one wrapper for every agent step

**`scripts/agent-run.sh`** (new) is the only shell command an agent runs:

```
sh /Users/jsloth/Projects/kyv-agent-worktree/scripts/agent-run.sh <AGENT> <STEP> [--status ok|ok_empty|failed] [--items N]
```

- **Literal paths inside**:
  `NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"`,
  `WT=/Users/jsloth/Projects/kyv-agent-worktree`,
  `RUNS=/Users/jsloth/Projects/kyv-agent-runs`. `KYV_AGENT_WORKTREE` and
  `KYV_AGENT_RUNS` override the last two, for the test only.
- **No date, path or redirection in the agent's command.** The same command
  text runs every day, so one approval covers every run (§2.8 is why). The
  wrapper reads its inputs from, and writes its outputs to, the run
  directory.
- **Parsed before it runs.** The body sits in a `main()` called on the last
  line, so `start`'s refresh can replace the file on disk without the running
  shell reading new lines halfway.
- **A fixed table of (agent, step, script, input, output, timeout)**;
  anything else exits 2. Each PR adds its own agent's rows (table below), so
  no row names a script that is not in the same commit. The test checks this
  (§6).
- **Never writes inside `WT`**, so `agent-worktree.sh`'s dirty-tree refusal
  keeps meaning "someone edited the agent's code".

Steps for every routine agent (R2 to R5; all four ship in PR A, since they
run only `agent-worktree.sh` and `agent-run-log.ts`):

| Step | What it does |
|---|---|
| `start` | Refreshes the worktree with `sh $WT/scripts/agent-worktree.sh` (reused) and requires its "agent worktree ready at" line. Skips the refresh, and says so, when another agent's run is still inside its budget (a `current-<AGENT>` pointer younger than that agent's wall clock), so two agents never swap code under each other. Creates `$RUNS/<YYYY-MM-DD>/<AGENT>` (`-2`, `-3` for a second run that day), writes the deadline, points `$RUNS/current-<AGENT>` at it, and records the run (below). Prints `date:`, `run dir:`, `report:` (the full RunReports path for today), `budget:` and the worktree line. The prompt takes the date from here, so no agent calls `date`. |
| `budget` | Prints the minutes left. |
| `finish` | Records the outcome (`--status`, `--items`) and removes the pointer. |

Every other routine step requires a pointer (exit 5, "no active run: call
start"), refuses after the deadline (exit 3, "budget exhausted: write the run
report and stop"), runs its script with the arm64 `node` under a hard timeout
(`perl -e 'alarm shift; exec @ARGV' <seconds> …`, since macOS has no
`timeout`; exit 4 on expiry), and prints the script's summary lines and the
output file's path. A failing script exits 1 and the wrapper passes it on.
The deadline is checked when a step starts. A run that never calls the
wrapper again is not cut off by it; that case is §3.2's.

| Agent | Step | Script (in `WT`) | Input (run dir) | Output (run dir) | Timeout | PR |
|---|---|---|---|---|---|---|
| R5 | `prep` | `scripts/candidate-leads.ts prep --days 14` | | `stories.json` | 12 min | A |
| R5 | `check` | `scripts/candidate-leads.ts check --stories <run>/stories.json` | `mentions.json` (stdin) | `leads.json` | 5 min | A |
| R5 | `queue-dry` | `scripts/candidate-leads.ts queue --dry-run` | `verified.json` (stdin) | `queue-dry.txt` | 5 min | A |
| R5 | `queue` | `scripts/candidate-leads.ts queue` | `verified.json` (stdin) | `queue.txt` | 5 min | A |
| watch | `stale` | `scripts/agent-run-log.ts stale` | | (prints) | 2 min | A |
| watch | `check` | `scripts/agent-run-log.ts watch` | `$RUNS/watch/runs.json` | `$RUNS/watch/notified.txt` (appended) | 2 min | A |
| R3 | `context` | `scripts/election-news.ts context` | | `context.json` | 5 min | B |
| R3 | `queue-dry` | `scripts/election-news.ts queue --dry-run` | `items.json` (stdin) | `queue-dry.json` | 5 min | B |
| R3 | `queue` | `scripts/election-news.ts queue` | `items.json` (stdin) | `queue.json` | 5 min | B |
| R4 | `digest` | `scripts/ops-digest.ts` | | `digest.json` | 5 min | C |
| R4 | `lint` | `scripts/verify-news-neutrality.ts` | | `lint.txt`, with the exit code; a non-zero exit is a finding and the step exits 0 | 5 min | C |
| R2 | `context` | `scripts/logistics-check.ts context` | | `context.json` | 5 min | D |
| R2 | `sites` | `scripts/logistics-check.ts sites` | `context.json` | `sites.json` | 20 min | D |
| R2 | `check` | `scripts/logistics-check.ts check` | `context.json`, `observations.json` | `check.json` | 5 min | D |
| R2 | `queue-dry` | `scripts/logistics-check.ts queue --dry-run` | as `check` | `queue-dry.json` | 5 min | D |
| R2 | `queue` | `scripts/logistics-check.ts queue` | as `check` | `queue.json` | 5 min | D |

`watch` has no `start`, `budget` or `finish`. It never refreshes the
worktree, since an hourly refresh would swap code under a running agent, and
it needs no pointer.

**Run record.** `scripts/agent-run-log.ts` (new) inserts an `agent_run` row
(`status 'running'`) on `start`, after marking this agent's own `running`
rows older than its wall clock `failed` with summary "no finish recorded
within budget". `finish` updates the row (`finished_at`, `status`,
`items_written`, `report_path`). `stale` does the same marking for every
agent. A failed log write prints a warning and never stops the run: the queue
and the report are the run's real output. Until the `agent_run_r5` migration
applies, R5's log writes fail that way, with a warning, and nothing else
changes. The wall-clock budgets live in one pure module,
`src/lib/agent-budget.ts` (new), which `agent-run-log.ts`, the watchdog and
R4's digest all read.

**The `agent_run_r5` migration** widens `agent_run_agent_check` to admit
`R5` and keeps the five existing values. Its number comes from the ledger
(§5 step 0). It is on no critical path.

**The cron as R1.** `src/app/api/cron/news-sweep/route.ts` writes one
`agent_run` row per run, at the end (`agent 'R1'`, `started_at` = request
start, `finished_at`, `items_written` = queued, `status`, `summary` = the
sweep and queue lines), built by a pure `cronRunRow` in `agent-budget.ts`.
The CHECK already admits `R1`, so this needs no migration.

| Route outcome | Row |
|---|---|
| 401, wrong secret | none: an unauthenticated request never writes |
| 503, no service client | none: there are no credentials to write with |
| 502, the sweep threw | `failed`, with the error |
| 502, queueing threw | `failed`, with the sweep line and the error |
| 200 | `ok`, or `ok_empty` when nothing was queued |
| function timeout (`maxDuration` 300) | none |

A failed log write never fails the cron. Every "none" is caught by R4's
missed-run rule (§3.7).

**Wall-clock budgets** (from `start`; web caps are counted by the agent, as
its prompt instructs):

| Agent | Wall clock | Web calls |
|---|---|---|
| R2 | 60 min | 8 `WebFetch` |
| R3 | 40 min | 30 (`WebSearch` + `WebFetch`) |
| R4 | 20 min | 0 (plus 5 `list_task_runs` calls) |
| R5 | 45 min | 25 `WebFetch` |
| watch | 5 min | 0 (plus 4 `list_task_runs` calls) |

A prompt that reaches its web cap stops searching, queues what has already
passed its checks, writes the report and calls `finish`.

### 3.2 The watchdog (D10)

A sixth routine, `cap-rw-watchdog`, runs hourly from 08:00 to 22:00 local.
Its prompt (`agents/watchdog.prompt.md`):

1. Call `list_task_runs` (limit 2) for `cap-r2-contact-refresher`,
   `cap-r3-election-news`, `cap-r4-ops-digest` and `cap-r5-candidate-leads`.
   Write the runs as one JSON array,
   `[{ task_id, session_id, status, started_at, last_activity_at }]`, to
   `/Users/jsloth/Projects/kyv-agent-runs/watch/runs.json`.
2. `sh …/agent-run.sh watch stale`. This marks every agent's `running`
   `agent_run` rows older than its wall clock `failed`, so /admin's Agent runs
   panel shows them.
3. `sh …/agent-run.sh watch check`. This prints one line for each run whose
   status is `running`, which started more than twice its agent's wall clock
   ago, and whose `session_id` is not yet in `notified.txt`, then appends
   those ids. The rule is in `agent-budget.ts`. On the very first run, when
   `notified.txt` does not exist, it also prints one line, "watchdog
   installed: notifications work".
4. For each printed line, send one push notification with that line and "Open
   Scheduled and stop it". Nothing else.

It never stops a session itself (D10's flip would allow that) and reads no
web pages. With R3's 40-minute budget, a stalled R3 run is reported between
80 minutes and about 2 hours 20 minutes after it started. Whether a scheduled
session can send a push was not checked for this spec. The watchdog's first
watched Run now shows it (§5). If it cannot, step 2 still marks the run
failed in /admin and R4 lists it, and the founder decides under D10 whether
the watchdog is still worth running.

### 3.3 Tool pre-approval ("Run now" once per routine)

Each retrofitted routine is enabled only after one watched **Run now**. In it
the founder answers every prompt with the option that always allows it for
that routine. Only the prompts in this table should appear; anything else is
a prompt bug: deny it, note it, and fix the prompt before enabling the
schedule.

| Routine | Approvals |
|---|---|
| R2 to R5 | `Bash`: `sh /Users/jsloth/Projects/kyv-agent-worktree/scripts/agent-run.sh …`; `Read` and `Write` under `/Users/jsloth/Projects/kyv-agent-runs/`; `Write` under `…/Civic Awareness (Know Your Vote)/Agents/RunReports/` |
| R2 | `WebFetch` for the `details_url` hosts (`dos.fl.gov`, `browardvotes.gov`, `www.votehillsborough.gov`, `www.miamidade.gov`, `voteorangefl.gov`) and the Supervisor hosts in `supervisors.ts` that differ from them (`www.votemiamidade.gov`, `www.browardvotes.gov`) |
| R3 | `WebSearch`; `WebFetch` for each host on news-source-integrity's official list as §3.4 amends it |
| R4 | `Write` for `CAP_Ops_Digest_latest.html` and `CAP_Ops_Digest_<YYYY-MM>.html`; `mcp__scheduled-tasks__list_task_runs` |
| R5 | `WebFetch` for `dos.elections.myflorida.com` and `www.voterfocus.com` (D1) |
| watchdog | the wrapper; `Write` under `/Users/jsloth/Projects/kyv-agent-runs/watch/`; `mcp__scheduled-tasks__list_task_runs`; the push-notification tool |

No routine is approved for `execute_sql` (D4). If an approval does not
persist across runs, the same list goes into the main checkout's
`.claude/settings.local.json` (local and untracked). Every path uses the
absolute `//` form, so none is read relative to the settings file:

```
"Bash(sh /Users/jsloth/Projects/kyv-agent-worktree/scripts/agent-run.sh *)",
"Read(//Users/jsloth/Projects/kyv-agent-runs/**)",
"Edit(//Users/jsloth/Projects/kyv-agent-runs/**)",
"Edit(//Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/Civic Awareness (Know Your Vote)/Agents/RunReports/**)",
"Edit(//Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/Civic Awareness (Know Your Vote)/CAP_Ops_Digest_*.html)",
"mcp__scheduled-tasks__list_task_runs",
"WebSearch"
```

plus one `"WebFetch(domain:<host>)"` line for each host the watched runs
asked about. Two things were not checked for this spec: whether each site
answers on its `www.` form, and whether the app's "always allow" covers the
exact command or a prefix. The watched runs show both.

### 3.4 Official sources: four changes asked of news-source-integrity's list

news-source-integrity §3.2 owns `src/lib/official-sources.ts`, its matching
(exact host or label-boundary subdomain, with path-scoped entries as
`urlBelongsTo` already supports, `src/lib/news-sources.ts:561-582`), the
`official:<domain>` row builder and the approve-path change. This spec adopts
all of it, including its order (given, outlet, page row, official, refuse): a
page row already in `source` wins, so the 9 live rows (§2.5) and 0014's and
0042's rows keep backing their own pages. It asks for four changes before
that spec's PR A is cut, because R2's and R3's host rules depend on them:

| # | Change | Why |
|---|---|---|
| 1 | Replace the unscoped `miamidade.gov` entry with `miamidade.gov/elections` (path-scoped), beside `votemiamidade.gov`, both published as "Miami-Dade County Supervisor of Elections" | Every other covered county is listed by its Supervisor's site only. Unscoped `miamidade.gov` would admit every county page, including the pages of Commission Districts 2 and 5, both on the roster (§2.5), as an official source scoped to 12086. The verified Miami-Dade early-voting row cites a page under `/elections` (§2.6), which the scoped entry keeps. The two county release pages 0014 and 0042 attribute keep their page rows. |
| 2 | Replace the unscoped `dos.fl.gov` entry with `dos.fl.gov/elections`, and list `constitutionalinitiatives.dos.fl.gov` and `dos.elections.myflorida.com`, all as "Florida Dept. of State, Division of Elections" | Unscoped `dos.fl.gov` covers the whole Department of State under an Elections label. `constitutionalinitiatives.dos.fl.gov` is the Division's amendment database; three live rows use exactly that publisher string (§2.5). Path-scoping `dos.fl.gov` alone would drop it, so it needs its own entry. |
| 3 | Add `flhouse.gov` as "Florida House of Representatives" | Both live House rows are on `www.flhouse.gov` (§2.5); the list has only `myfloridahouse.gov`. |
| 4 | Add `flcourts.gov` ("Florida State Courts") and `uscourts.gov` ("U.S. Courts") | That spec leaves CourtListener out and says R3 "cites a court's own site instead", but lists no court host, so every ruling would be dropped as not official. Which subdomains each court uses was not checked; a ruling on a host not on the list is reported, never queued. |

It also asks that the four county entries be built from `supervisors.ts`'s
map plus the two older hosts that redirect (`ocfelections.gov` and
`miamidade.gov/elections`), so the Supervisor hosts R2 and R3 accept come
from one file. For that, `supervisors.ts` exports `supervisorSite(countyFips)`
(the URL) beside `supervisorLink`; whichever PR lands first adds it.

Publisher strings. The official rows will match 0014 and 0042 for the same
body ('Florida Senate', 'Broward County Supervisor of Elections', and so
on). They will not match every live row: the Senate's measure-resource rows
say 'The Florida Senate', and the amendment booklet says 'Florida Division of
Elections' (§2.5). Those rows back measure resources, not news cards, and
from 2026-10-18 BC9 refuses UPDATE of any `source` row a `measure_resource`
references. Making them read alike is out of scope (§7).

### 3.5 R3 on the wrapper (PR B)

news-source-integrity's PR A ships `scripts/election-news.ts queue
[--dry-run]` and R3's first rewritten prompt. The CLI takes
`[{ title, summary, url, published_at, scope }]` on stdin, refuses the batch
at the first bad item, skips URLs already stored or queued, and inserts
pending `manual_news` items with `source 'agent:R3'`. The prompt uses R5's
structure, so its commands carry the day's run folder and will prompt every
week (§2.8). PR B moves R3 onto the wrapper and adds:

- **A `context` subcommand** (writes nothing to the database): the official
  hosts by covered county and statewide, from `official-sources.ts`; the URLs
  from official hosts already in `news_item` or in any `manual_news` item in
  the last 60 days, so R3 knows its window; and the `general_2026`
  `election_event` rows for reference.
- **Scope must agree with the publisher** (refusal, D2). A county `scope`
  must equal the publisher entry's county. A statewide publisher's item is
  `{ statewide: true }`. `{ metro }` is refused for new items; the five legacy
  `metro` rows stay as they are, and the feed already reads them
  (`src/lib/news-scope.ts:28-36`).
- **Never a candidate story** (drop). `matchArticle`
  (`src/lib/news-match.ts:168`) runs over title and summary against all 106
  ballot-tier candidates; any match drops the item ("names a candidate on the
  ballot"). The roster comes from **`loadBallotRoster(db)`** (new, in
  `src/lib/news-intake.ts` beside `loadRoster`, with that file's plain-Node
  imports): the `race` rows for `ACTIVE_ELECTION_KIND` whose
  `race_publication.status` is `published` or `listed`, their
  `candidate_ids`, and the `candidate` rows with `ballot_status = 'ballot'`.
  County races take their county from `countyForRaceDistrict`
  (`src/lib/counties.ts`). It returns 106 today. `loadRoster` stays as it is
  for the sweep and R5.
- **Never a case for or against a measure** (drop): an item whose title or
  summary names an amendment and also contains "should", "vote yes", "vote
  no", "support", "oppose", "benefit" or "harm".
- **Date window** (drop): a `published_at` more than a day in the future, or
  older than 60 days. The pure functions take `now` as an argument.
- **The lint drops** instead of advising: a `findAllBannedTermMatches` hit
  (`src/lib/neutrality.ts:121`) drops the item. The approve route re-runs the
  same lint.

Drops are written with their reasons to `queue-dry.json` and `queue.json`.
Refusals stop the batch, as that spec already does.

**Prompt** (`agents/r3-election-notices.prompt.md`, installed as
`cap-r3-election-news`): the constitution as today, minus every `INSERT`;
`start`; `context`; for each covered county's Supervisor host and the
statewide hosts in `context.json`, look for announcements inside the window
(early-voting sites and hours, vote-by-mail, ballot or polling changes, court
rulings on covered races), fetching only listed hosts and counting web calls;
write `items.json`; `queue-dry`; fix wording at most once for a lint drop;
`queue`; report; `finish`. The report gives items per county and statewide
(zero included), every drop with its reason, web calls used, and hosts that
failed. Every covered county's Supervisor is checked with the same steps every
run. R3 keeps its weekly schedule (news-source-integrity §3.2).

### 3.6 R2: logistics checks (PR D)

R2 checks what voters act on and proposes changes; it never changes a
voter-facing value. **CLI**: `src/lib/logistics-check.ts` (pure) and
`scripts/logistics-check.ts` (I/O).

| Step | Reads | Writes |
|---|---|---|
| `context` | DB | `context.json`: the 106 candidates from `loadBallotRoster` (D8) with `candidate_id`, name, race, office, level, county, `qualifying_status`, `official_site`; the `general_2026` `election_event` rows with `details_url`. No party: no rule reads it. Nothing written to the DB. |
| `sites` | `context.json` | `sites.json`; `candidate.site_last_verified_at = now()` for `live` sites only |
| `check` | `context.json`, `observations.json` (written by R2), the DoE extract and the four VoterFocus lists (fetched by the CLI) | `check.json`. Nothing written to the DB. |
| `queue` | as `check` | pending `review_item` rows; `race.info_last_verified_at` |

**`sites`** fetches each `official_site` homepage with the sweep's user
agent, a 20-second timeout, at most 6 hosts at a time and one request per
host at a time, and honours robots.txt for our agent and Anthropic's
(`isAllowedByRobots`, `src/lib/candidate-site.ts:595`). Outcomes: `live`
(2xx, same site per `isSameSite` `:122`, not a bot challenge per
`looksLikeBotChallenge` `:650`, not parked), `challenge`, `moved` (redirect to
another site), `parked` (a new pure `looksParked` over the body: "domain is
for sale", "buy this domain", registrar parking text), `dead`, `robots`. Only
`live` stamps the column, which only the admin monitor reads. `moved` and
`parked` go to the report and to R4's "Waiting on Jason". A campaign link
that now lands elsewhere is a correction during the freeze
(ballot-content-completion §3.6.1 names "a link that now points somewhere
hacked or unrelated"), made through a reviewed migration, since
`official_site` is not a gated field.

**`check` builds the plan.**

- **Federal and state statuses (deterministic).** The CLI POSTs the DoE
  extract (endpoint and form fields as `intake.py:825-831`) once per office
  group holding an `FL-DOE` candidate in context (FED and CAB today). It keeps
  only `AcctNum`, office, district and `StatusCode`, and drops every other
  column in memory: address, phone, email and treasurer fields never reach a
  file. It maps codes with a TypeScript copy of `_STATUS`, parity-tested
  against `intake.py:137-141`. A candidate missing from every group fetched
  is a report line, never a diff.
- **County statuses (deterministic).** The CLI fetches the four VoterFocus
  lists itself (sweep user agent, 20 s), parses name, office and the literal
  label with a pure parser, and maps labels in code:

  | VoterFocus label | `qualifying_status` |
  |---|---|
  | Qualified, Runoff | `qualified` |
  | Unopposed | `unopposed` |
  | Elected | `elected_in_primary` |
  | Withdrawn, Defeated, Did not qualify | `withdrawn` (as `_STATUS` maps DEF and DNQ) |
  | Qualified Write-In, or any label not in this table | none: a report line, never a diff |

  Names are matched within that county's `FL-VF` candidates by
  `normalizeName` (`src/lib/candidate-leads.ts:111`). An unmatched roster
  candidate, or a page that parses to no rows, is a report line. The slugs
  live on `CoveredCounty` as a new field, `voterFocusSlug`, in
  `src/lib/counties.ts` (the one home for the covered counties, beside
  `raceDistrictPrefix`), with the four values from §2.6. The label table comes
  from `roster-recalibration-2026-09-21.md:155-159`. Only Qualified and Runoff
  appear in a saved file, so the first watched run's report lists every label
  it met.
- **Dates (R2's reading).** For each `general_2026` `election_event` row, R2
  reads that row's own `details_url` (6 distinct pages, §2.6) and writes
  `observations.json`:
  `{ dates: [{ election, event_type, county_fips, official_date, source_url }], unreadable: [{ url, reason }] }`.
  A page R2 cannot read, such as Hillsborough's and Orange's behind their
  Cloudflare check (`supervisors.ts:22-23`), goes in `unreadable`. It becomes
  a report line, never a diff, and the county's other rows are still
  compared.
- **Refusals (the whole run).** An unknown `(election, event_type,
  county_fips)` (a new event is a migration); a date not in `YYYY-MM-DD`; a
  date `source_url` that is neither the row's own `details_url` nor on that
  county's Supervisor host (`supervisorSite`, §3.4) or, for a statewide row,
  on `dos.fl.gov`; more than 30 date observations.
- **The plan.** For each status that differs from the database, a
  `gated_diff` `{ table: 'candidate', pk, field: 'qualifying_status', old,
  new, source_url, seen_at }`, with `old` read from the database at queue
  time, never taken from the agent. For each date that differs, a
  `date_mismatch` in the `election_event` form (below). A race whose every
  ballot candidate was observed and matched is "confirmed".
- **Running mates.** Once `candidate.running_mate` exists (roster-completeness's
  migration; `context` checks for the column), `check` compares it with the
  "Running Mate" on each governor candidate's DoE `canDetail` page, read the
  way roster-completeness §3.3 reads it, and reports a difference as a report
  line, never a diff (roster §3.9).
- **Never proposed**: `race.key_dates`, `race.office`, `race.district` (D3,
  D9).

**`queue`** re-runs `check`, inserts each payload as a pending `review_item`
with `source 'agent:R2'`, and stamps `race.info_last_verified_at = now()` on
confirmed races. Every payload parses with its schema first.

**Dedupe.** A payload is skipped when any `agent:R2` item, in any status,
has the same key. The key is computed from payload fields, so no schema field
is added: `candidate|<pk>|qualifying_status|<db value>|<new>`, or
`election_event|<election>|<event_type>|<county or statewide>|<db value>|<official value>`.
The database value is part of the key. So an approved `date_mismatch`, which
writes nothing (D3), is not queued again while the row is unchanged, and a
later, different change is a new key. Two overlapping R2 runs could still
queue one diff twice; the operator sees both, and nothing reaches a voter.

**`date_mismatch` for `election_event`.** `DateMismatchPayloadSchema`
becomes `z.union([DateMismatchRaceSchema, DateMismatchElectionEventSchema])`,
both `.strict()`. Zod strips unknown keys by default, so without `.strict()`
an `election_event` payload carrying a stray `race_id` would parse as the
race form. The race form is today's object. The new form is
`{ target: z.literal('election_event'), election, event_type, county_fips
(5-digit or null), db_value, official_value, source_url, seen_at }`. No
`date_mismatch` row exists today (§2.4), so making the race form strict
refuses nothing stored. `planEffect` maps the new form to
`record_disposition` ("Recorded. Change election_event through a reviewed
migration: reminders and the calendar read this table."), never to an update
(D3). `ReviewItemCard` shows the election, event and county, the DB value
against the official value, and the source link.

**Approving a status change, and the freeze.** Approval writes that one
column through the existing whitelist. It does not change `ballot_status` or
`race.candidate_ids`; removing someone from a race stays a reviewed
migration, as 0038 did, and the card says so. From 2026-10-18 04:00 UTC to
2026-11-04 05:00 UTC, BC9's trigger refuses that UPDATE: the item stays
pending, with the trigger's message as its `apply_error`, and the message
names the correction path. A withdrawal is a correction under
ballot-content-completion §3.6.1, so the operator follows §3.6.5 there
(record it, the founder's yes, the fix under `SET LOCAL
kyv.freeze_correction`), then rejects the item, naming the correction file.
R2's two stamps pass BC9 by name. `date_mismatch` approvals write only
`review_item` and `admin_action`, which BC9 does not guard.

**Contact info (after 2026-11-03, PR E).** roster-completeness §3.8 owns the
`contact_update` kind, its payload and its display. PR E builds R2's
collector to that design, inside `sites`: on a `live` homepage, follow one
same-site link whose path or anchor text names contact (`extractLinks`,
`candidate-site.ts:184`), read it under the same robots and challenge rules,
and take `mailto:` and `tel:` targets only. The email must be one valid
address; the phone must normalise to ten US digits; `contact_url` and
`source_url` must be on the candidate's own site. The collector sets no
mailing address, since no deterministic rule finds one, so that field stays
null in the payload. Approval sets `verified_by` to the approving operator,
as roster §3.8 says.

**Prompt** (`agents/r2-logistics.prompt.md`, installed as
`cap-r2-contact-refresher`): `start`; `context`; `sites`; read the six date
pages (8 fetches at most) and write `observations.json`; `check`;
`queue-dry`; `queue`; report (statuses checked and changed, labels seen,
dates checked and changed, pages unreadable, sites by outcome, every
refusal); `finish`.

### 3.7 R4: the digest from the agent worktree (PR C)

`scripts/ops-digest.ts` (new, SELECT only), with the counting rules in
`src/lib/ops-digest.ts` (pure). `R4 digest` writes `digest.json`. `R4 lint`
runs `scripts/verify-news-neutrality.ts` in live mode with the arm64 `node`.
R4 itself calls `list_task_runs` for R2 to R5 and the watchdog, and reads the
newest run report per agent.

Sections. R4 keeps everything it reports today that still exists, and adds
the rest:

1. **Runs.** Per agent (R1 = the sweep; R2 to R5; the watchdog): the newest
   `agent_run` row; the newest report file; the routine's last three runs
   (status, start, last activity). A run still `running` after twice its wall
   clock is "stuck: stop it in the app".
2. **Review queue.** Pending items by kind and source, with the oldest
   pending age per kind; items decided in the last 7 days by kind, source and
   outcome; pending items with an `apply_error`.
3. **Crons.**
   - News sweep: `agent_run` R1 rows; `review_item` rows from `agent:R1` per
     day over 14 days. Flagged when no R1 row is recorded within 6 hours of a
     scheduled fire. The schedule is read from `vercel.json`'s
     `/api/cron/news-sweep` entry, so the rule holds for `0 11 * * 1,4` and
     for a daily schedule.
   - Refresh-news (today's heartbeat, kept): the newest `pipeline_event`, and
     the published races with no `pipeline_event` row whose
     `race_publication.published_at` is more than 26 hours old. Expected 0;
     otherwise the daily cron has not run since.
   - Reminders: the reminders due in the last 7 days
     (`dueRemindersByScope`, over the verified `general_2026` rows the digest
     reads itself) against `notification_send_log` rows; the count of active
     subscriptions (a number, never an address); the next due reminder
     (`nextReminder`). A due reminder with no log row is expected when its
     scope has no subscriber (§2.7), and is flagged otherwise.
4. **R5.** `candidate_lead` items by status; items queued in the last 14
   days.
5. **Feed.** `news_item` rows from the last 30 days by `item_type`;
   `election_news` by scope (each county, statewide, legacy metro);
   `candidate_news` `named` rows per candidate within each race, flagged where
   one candidate has three times another's count; sourceless
   `candidate_news`/`election_news` rows (zero once 0014 is applied); the lint
   verdict.
6. **Logistics.** The oldest and newest `site_last_verified_at` among the 106
   and the count with none; races with `info_last_verified_at`; the
   `general_2026` `election_event` rows, verified or not; `candidate_contact`
   rows; moved or parked sites and unreadable date pages from R2's newest
   report.
7. **Pipeline state** (kept). Races by `race_publication.status`; profiles
   by `audit->>'balance_check_passed'` (R4's old prompt names it as a column,
   which does not exist, §2.7); profiles whose `audit->>'flagged_at'` falls
   in the last 14 days, with their `flag_reason`.
8. **Waiting on Jason.** Pending counts for `manual_news`, `gated_diff`,
   `date_mismatch` and `candidate_lead`; stuck runs; moved or parked sites;
   unreadable date pages.
9. **Open risks.** One line for each threshold crossed above.

Outputs are unchanged: overwrite `CAP_Ops_Digest_latest.html`, save a dated
monthly copy on a month's first run, and write `YYYY-MM-DD-R4.md`. R4 writes
no database row. Prompt: `agents/r4-ops-digest.prompt.md` (new), installed as
`cap-r4-ops-digest`.

### 3.8 R5 on the wrapper (PR A)

R5's job, its rules and `candidate-leads.ts` are unchanged. Its prompt
replaces each `cd … && "<node>" … > <RUN>/…` command with the wrapper:
`start`; `prep`; R5 writes `mentions.json`; `check`; R5 verifies and writes
`verified.json`; `queue-dry`; `queue`; report; `finish`.

One thing changes from the approved design, and it is a founder decision
(D1). Verification reads the Division of Elections candidate search
(`dos.elections.myflorida.com`) for state and federal offices and running
mates, and VoterFocus (`www.voterfocus.com`) for county offices. A lead whose
official list is on any other host is recorded `unchecked`, with a note
naming that host, and still queues. The repo copy
`agents/r5-candidate-leads.prompt.md` is updated and reinstalled.

### 3.9 Exact write paths

| Writer | Files | Database |
|---|---|---|
| wrapper (R2 to R5) | `/Users/jsloth/Projects/kyv-agent-runs/<YYYY-MM-DD>/<AGENT>[-n]/` (outputs, deadline, log); `/Users/jsloth/Projects/kyv-agent-runs/current-<AGENT>` | `agent_run` (insert on `start`, update on `finish`, stale rows of the same agent marked `failed`) |
| watchdog | `/Users/jsloth/Projects/kyv-agent-runs/watch/runs.json`, `notified.txt` | `agent_run` (stale rows of any agent marked `failed`) |
| R2 | `<run dir>/observations.json`; `…/Agents/RunReports/YYYY-MM-DD-R2.md` | through `logistics-check.ts` only: `review_item` (`gated_diff`, `date_mismatch`; `contact_update` after PR E), `candidate.site_last_verified_at`, `race.info_last_verified_at` |
| R3 | `<run dir>/items.json`; `…/RunReports/YYYY-MM-DD-R3.md` | through `election-news.ts` only: `review_item` (`manual_news`) |
| R4 | `…/CAP_Ops_Digest_latest.html`, `CAP_Ops_Digest_<YYYY-MM>.html`; `…/RunReports/YYYY-MM-DD-R4.md` | none |
| R5 | `<run dir>/mentions.json`, `verified.json`; `…/RunReports/YYYY-MM-DD-R5.md` | through `candidate-leads.ts` only: `review_item` (`candidate_lead`) |
| cron (R1) | none | `review_item`, `source` (unchanged), `agent_run` |

`…` is
`/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/Civic Awareness (Know Your Vote)`.
Reports go to the main checkout's folder, never the agent worktree, since an
edit there makes the next `start` refuse. A second run on one day appends a
"(second run)" section, as today.

### 3.10 Files, by PR

| PR | Reused as is | Changed | New |
|---|---|---|---|
| A: footing, R5, watchdog | `scripts/agent-worktree.sh`, `scripts/env-local.ts`, `scripts/candidate-leads.ts` | `src/app/api/cron/news-sweep/route.ts` (the `agent_run` row); `src/lib/admin/monitor.ts:27-33` (`R5` in `AgentName` and `AGENTS`); `src/app/api/admin/agents/runs/route.ts:13` (`R5` in the enum); `src/components/admin/AgentsConsole.tsx:43-48` (labels R1 "News sweep (cron)", R2 "Logistics checks", R3 "Election notices", R4 "Ops digest", R5 "Candidate leads"; the filter options at `:474-479` follow); `agents/r5-candidate-leads.prompt.md` | `scripts/agent-run.sh` (common steps, the R5 and `watch` rows), `scripts/agent-run-log.ts`, `src/lib/agent-budget.ts`, `agents/watchdog.prompt.md`, `scripts/verify-agent-run.mjs`, `scripts/verify-agent-budget.ts` |
| `agent_run_r5` migration | | `supabase/migrations/README.md` (its row); `scripts/verify-migrations.mjs` (its case) | the migration file, numbered from the ledger |
| B: R3 | `src/lib/news-match.ts` (`matchArticle`), `src/lib/neutrality.ts`, `src/lib/counties.ts` (`countyForRaceDistrict`) | `scripts/agent-run.sh` (R3 rows); `src/lib/election-news.ts` and `scripts/election-news.ts` (from news-source-integrity's PR A: `context` and the four rules); `src/lib/news-intake.ts` (`loadBallotRoster`); `scripts/verify-election-news.ts` | `agents/r3-election-notices.prompt.md` |
| C: R4 | `scripts/verify-news-neutrality.ts`, `src/lib/notifications/schedule.ts`, `src/lib/agent-budget.ts` | `scripts/agent-run.sh` (R4 rows) | `src/lib/ops-digest.ts`, `scripts/ops-digest.ts`, `agents/r4-ops-digest.prompt.md`, `scripts/verify-ops-digest.ts` |
| D: R2 | `src/lib/candidate-site.ts` (robots, links, challenge, same-site), `src/lib/candidate-leads.ts` (`normalizeName`), `GatedDiffPayloadSchema`, `GATED_FIELDS`, the decision route's fail-closed flow | `scripts/agent-run.sh` (R2 rows); `src/lib/counties.ts` (`voterFocusSlug`); `src/lib/supervisors.ts` (`supervisorSite`, unless already added); `src/lib/news-intake.ts` (`loadBallotRoster`, unless PR B landed first); `src/types/admin.ts` (the strict `date_mismatch` union); `src/lib/admin/effects.ts` (the `election_event` disposition); `src/components/admin/ReviewItemCard.tsx`; `scripts/verify-admin-types.ts`, `scripts/verify-admin-effects.ts` | `src/lib/logistics-check.ts`, `scripts/logistics-check.ts`, `agents/r2-logistics.prompt.md`, `scripts/verify-logistics-check.ts` |
| E: contact, after 2026-11-03 | | `src/lib/logistics-check.ts` (contact extraction in `sites`); the kind, schema, effect, card and filter as roster §3.8 specifies | the `contact_update_kind` migration, numbered from the ledger then |

### 3.11 Known risk (narrowed, still accepted)

R5's spec accepted that a hijacked run could write through the tools it holds
(§6 there). The founder checklist A4 asks to accept the same for R2, R4 and
R5 through Nov 3, because `execute_sql` runs without a prompt. This design
narrows it from rollout step 1: no routine is approved for `execute_sql`, and
D4 removes the blanket allow, so an unapproved database call waits on a
prompt instead of writing. Every sanctioned write is a pending,
operator-only review item or an ops-only stamp, and 0014 refuses a sourceless
news row at the database once applied. What remains: the wrapper approval
lets any routine run any agent's steps, and a step can be called with
agent-written input. Every step validates that input, and nothing it writes
is voter-facing. Per-routine tool limits in the app would close the rest
(§7).

## 4. Founder decisions

Each is Recommended (pending founder confirmation). Questions another
2026-10-08 document already asks are not asked again here: R1's retirement
and R3's sources, cadence and first prompt, including CourtListener
(news-source-integrity D5 and §3.2); 0042's Ballotpedia block
(news-source-integrity D1); the contact display (roster-completeness D8).
Where a question here is also asked elsewhere, the decision says so, and one
answer settles both.

**D1. R5's verification hosts.** This changes the founder-approved R5 design
(§2.8). Recommended: verify only on the Division of Elections candidate
search and VoterFocus. A lead whose list is elsewhere is queued `unchecked`,
with the host named in its note, and the founder checks it from /admin.
Leads are always outside the covered counties, so the approved design's
county Supervisor and city clerk lists are on hosts nobody has approved, and
an unattended run that meets one waits on a prompt, the failure this retrofit
fixes. TO FLIP: keep the approved sources, and either accept that such a run
stops until someone answers, or approve every `WebFetch` host for R5, which
is wider than any other routine gets.

**D2. R3's scope and text.** Recommended: scope comes from the publisher (a
county Supervisor gives that county; every other listed publisher is
statewide); `metro` is refused for new items; the title is the document's
own; the summary is at most two sentences and 400 characters in the guide's
voice, attributed. TO FLIP: accept the agent's `scope` as
news-source-integrity's CLI does, checking only that a county scope matches a
county publisher; or let a statewide notice take one covered county when that
county is named in its title or summary.

**D3. Date corrections.** Recommended: R2 compares official dates with
`election_event`, never `race.key_dates`. A difference is queued as an
`election_event` `date_mismatch` whose approval records the finding and
writes nothing. The fix is a reviewed migration with a read-back and a
`verified_by` stamp, as 0043 was. This agrees with BC9, which leaves
`election_event` unguarded so a date correction is never slowed. TO FLIP: add
`election_event.event_date` to the whitelist, keyed on the row id, so
approval writes it and clears `verified_by`.

**D4. `execute_sql` for routines.** Recommended: in rollout step 1, once the
routines are disabled, remove
`mcp__dcc7c42a-9393-475b-91b1-7e352d5d21f0__execute_sql`, `list_tables` and
`list_migrations` from the main checkout's `.claude/settings.local.json`, and
approve none of them for any routine. Every agent reads and writes through
its CLI. This replaces checklist A4's acceptance for routines. TO FLIP: keep
the allow, so sessions in the main checkout get fewer prompts, and rely on
the prompt rails as R5's spec accepted. Under D5's flip, D4 waits until R4 is
on the wrapper, because R4's current prompt reads through `execute_sql`.

**D5. Pause the old routines.** Recommended: today, disable R1, R2, R3 and
R4. Let R5's waiting run finish, or stop it (checklist A5), then disable R5
before its 13:38 UTC run. Re-enable each only after its retrofitted prompt
passes a watched Run now (§5). This agrees with checklist A1 (R1, R3),
news-source-integrity rollout step 3 (R1, R3) and BC12 (R1, R2). It replaces
checklist A5's Run now of R2 and R4 on their current prompts: R2's current
prompt upserts `candidate_contact` unreviewed, and R4's cannot run its lint
(x86 `node`) and reports on `key_dates` and metro slugs. R5 is disabled
between runs because each run's commands name that day's folder (§2.8), so
an unattended run prompts again. TO FLIP: keep R4 and R5 enabled and answer
their prompts when present (checklist A5). Unattended runs then stall at a
prompt, and D4 waits.

**D6. R2 through the freeze (the same question as BC12 for R2).**
Recommended: the retrofitted R2 runs weekly through Nov 3, once PR D passes
its watched run; the old R2 stays off, as BC12 says. BC12 disables R2
because "its contact upsert reaches candidate pages with no review". The
retrofitted R2 has no contact write, its two stamps pass BC9 by name, and
what it finds (a withdrawal, a hijacked campaign link, a moved date) are
corrections that ballot-content-completion §3.6.1 names. Answering this
answers BC12's R2 line too. TO FLIP: BC12 as written: R2 stays disabled
through Nov 3. PR D can still merge, with its routine left off until after
Nov 3.

**D7. R3, R4, R5 and the watchdog during the freeze.** Recommended: all keep
running from 2026-10-18 to 2026-11-03. Queueing publishes nothing, election
notices matter most during early voting, and R4 and the watchdog write
nothing voters read. This agrees with BC12 ("R3, R4 and R5 unchanged") and
news-source-integrity D10 (news approvals continue). TO FLIP: disable R3 and
R5 for those dates.

**D8. R2's scope.** Recommended: published and listed races, 106 ballot-tier
candidates, since a listed race's names are on the site too. The checklist's
A5 note on `SHOW_CANDIDATE_CONTACT` makes the same point about 82 against
106. TO FLIP: published races only, 82 candidates.

**D9. Race office and district.** Recommended: R2 never proposes
`race.office` or `race.district`; a change there is a reviewed migration. TO
FLIP: let `check` propose them as `gated_diff`, which the whitelist already
supports.

**D10. The watchdog.** Recommended: run `cap-rw-watchdog` hourly from 08:00
to 22:00 local. It marks stale runs failed and sends one push for each run
past twice its budget; it never stops a session. TO FLIP: (a) also let it
stop the session, if its watched run shows that a scheduled session can use
the app's stop-session tool; or (b) no watchdog, and goal 3 becomes "a stall
is seen at that agent's next start or in R4's Monday digest", days later.

## 5. Rollout order

0. **Before any branch is cut: migration numbers (founder, one ledger PR).**
   The 2026-10-08 documents name 0048 three times (roster-completeness §3.2,
   news-source-integrity §3.4, ballot-content-completion BC9) and 0049 once
   (ballot-content-completion, AM1), while the ledger still lists "0048+ free"
   (`README.md:64`). The numbers go into the ledger first, in the order the
   migrations will apply on live, and the documents follow the ledger (rules
   2 and 3). This spec claims nothing at this step. `agent_run_r5` takes the
   next free number when its PR is cut, after those claims, because a failed
   run-log write never stops a run (§3.1). `contact_update_kind` is numbered
   after Nov 3.
1. **Today, no code (founder).**
   - D5: disable R1, R2, R3 and R4. Let R5's waiting run finish or stop it,
     then disable R5 before 13:38 UTC.
   - D4: remove the three Supabase tools from the main checkout's
     `settings.local.json`.
   - 0042, then 0014, as news-source-integrity §3.1 and its rollout steps 3
     to 6 give them; its D1 decides the Ballotpedia variant. Nothing in this
     spec waits on them, and nothing in them waits on this spec.
2. **PR A: footing, R5 and the watchdog** (target 2026-10-10). Needs nothing
   else. After merge: run `sh scripts/agent-worktree.sh` once from a checkout
   of `main`; reinstall R5's prompt; watched Run now of R5 (§3.3); enable R5.
   Create `cap-rw-watchdog`; watched Run now, whose first run sends the test
   push (§3.2); enable it. The cron's and the wrapper's `agent_run` rows start
   to appear; R5's fail with a warning until step 7.
   news-source-integrity's PR B edits the same cron route (`shallowFeeds`);
   whichever merges second rebases.
3. **news-source-integrity PR A** (official sources, the approve path,
   `election-news.ts`), with §3.4's four changes. Owned there.
4. **PR B: R3 on the wrapper** (target before early voting opens,
   2026-10-19). Needs PR A here and step 3. After deploy: install R3's prompt;
   watched Run now; approve one item and read back a `news_item` with
   `source_id 'official:<domain>'` and its `source` row `primary_doc` / `N/A`;
   enable R3 on its weekly schedule.
5. **PR C: R4** (target Mon 2026-10-12, R4's slot, or the Monday after).
   Needs PR A. Watched Run now; enable.
6. **PR D: R2** (target 2026-10-16). Needs PR A. Uses `loadBallotRoster` and
   `supervisorSite` if PR B and step 3 have landed, and adds them itself
   otherwise. Watched Run now; enable as D6 decides.
7. **The `agent_run_r5` migration**, any time after step 0's claims: write it
   with its number from the ledger, apply it, and read back
   `pg_get_constraintdef` of `agent_run_agent_check` listing `R5`.
8. **After 2026-11-03.** PR E (contact): the `contact_update_kind` migration
   first, then roster §3.8's kind, schema, effect, card and filter, and the
   extraction in `sites`. Delete the R1 routine (news-source-integrity D5).

## 6. Testing

Plain-Node scripts, found by `scripts/verify-all.mjs` by file name. Every
guard is mutation-checked: break it, see the script fail, restore it.

- **`verify-agent-run.mjs`** (PR A). With `KYV_AGENT_RUNS` and
  `KYV_AGENT_WORKTREE` in temp directories and a stub in place of each
  script: an unknown agent or step exits 2; a routine step before `start`
  exits 5; a passed deadline exits 3; a step that outlives its timeout exits
  4; `watch` steps run with no pointer and never call `agent-worktree.sh`;
  nothing is written inside the worktree; every row in the table names a
  script that exists in the repo.
- **`verify-agent-budget.ts`** (PR A). The stuck rule fires at twice each
  wall clock and not before; a session id already in `notified.txt` is not
  printed again; the first-ever run prints the one test line; `cronRunRow`
  gives `failed` on both 502 paths, `ok_empty` when 0 were queued and `ok`
  otherwise.
- **`verify-election-news.ts`** (extended in PR B). Fixtures are R3's four
  2026-09-09 items, with the clock fixed at 2026-09-10T00:00:00Z so the
  60-day rule does not age them out. Under §3.4's list, the Hillsborough page
  scopes to 12057 and the DoE dates page to statewide; the Miami-Dade County
  release (`www.miamidade.gov/global/release.page…`) and the Ballotpedia
  story each refuse their batch as not official, naming the index. Also: a
  `votemiamidade.gov` item scopes to 12086; a county scope on a statewide
  publisher, and any `metro`, refuse their batch; a banned term drops; an
  amendment item saying "vote yes" drops; an item naming one of the 106,
  including a listed-race candidate, drops; an item dated 61 days before the
  fixed clock drops; every queued row parses with `ManualNewsPayloadSchema`.
- **`verify-logistics-check.ts`** (PR D). The TypeScript DoE map equals
  `intake.py`'s `_STATUS` (read from the Python source). A DoE extract
  fixture yields statuses and no address, phone or email in any output. A
  saved VoterFocus page fixture (fetched once by the builder from the
  `counties.ts` URL) parses to name, office and label rows, and against the
  stored statuses yields zero diffs; one changed label yields one
  `gated_diff` whose `old` comes from the database fixture. "Qualified
  Write-In" and an unknown label yield report lines and no diff. A key already
  present in any status is skipped, and the same change with a different
  database value is queued. A date from a host that is neither the row's
  `details_url` nor its Supervisor host refuses the run. An unreadable page
  yields a report line and no diff. `key_dates`, `office` and `district` are
  never proposed. Site classification over saved bodies: challenge, parked,
  moved.
- **`verify-admin-types.ts`, `verify-admin-effects.ts`** (extended, PR D).
  Both `date_mismatch` forms parse; a payload mixing them, or carrying an
  unknown key, is refused; the race form still plans `update_field`; the
  `election_event` form plans `record_disposition`.
- **`verify-ops-digest.ts`** (PR C). Backlog by kind and source; the oldest
  pending age; the three-times flag over `named` rows only; the stuck-run
  rule; the missed-sweep rule against `vercel.json` fixtures for
  `0 11 * * 1,4` and `0 11 * * *`; published races with no `pipeline_event`;
  a due reminder with a log row, without one, and with no subscriber.
- **`verify-migrations.mjs`**. The `agent_run_r5` migration applies, and
  `agent_run` accepts `R5` and the five old values. Later, `contact_update_kind`
  applies and `review_item` accepts `contact_update`.
- **Live acceptance, per routine, in its watched Run now**: no prompt outside
  §3.3; the report exists; `agent_run` shows the run finished; queued items
  appear in /admin under the right source; nothing voter-facing changed
  before an approval. For the watchdog: the test push arrives.

## 7. Out of scope

- Showing contact info to voters (roster-completeness §3.8).
- Showing running mates, and any change to how a withdrawn candidate who is
  still on the printed ballot is displayed.
- Removing `race.key_dates` and its readers (§2.6), and backfilling
  `county_fips` on the five legacy `metro` rows.
- Making the live measure-resource `source` rows read the same publisher
  strings as the official list (§3.4); they are frozen from 2026-10-18.
- Signing off leans for the outlets the sweep cannot use
  (news-source-integrity D3 and D4).
- The console's run-request dispatcher (`agent_run_request`).
- Per-routine tool limits in the desktop app, which would close §3.11's
  remaining risk.
- Installing arm64 Node system-wide, which would retire the Logi path (the
  founder's, per the R5 spec).
- R6, the tagger routine (news-source-integrity §3.4). It can move onto the
  wrapper the same way once it exists.
