# Ballot content completion before the October 18 freeze: design

Date: 2026-10-08 (Thursday). Status: draft for the founder, revised after
spec review the same day. Every call in it is Recommended (pending founder
confirmation) and listed in section 4.

## 1. Purpose

Finish what voters see about their ballot before early voting opens, then hold
it still until Election Day. Early voting opens Mon Oct 19 in all four covered
counties (migration 0043) and Election Day is Tue Nov 3. The founder's plan
freezes brief content from Oct 18 to Nov 3 (founder decision 7).

Four pieces of work, in this order:

1. **The 17 listed races.** Decide, by one rule, which can get a brief before
   the freeze. Chief Financial Officer goes first, because it is the only
   statewide race without a brief and every voter in the state sees it.
2. **What the races that cannot get a brief say.** Their card line must be
   true for each of them, including a race whose brief was found but not
   finished in time.
3. **The one refresh of the 36 published briefs** (decision 7), re-dated
   because its first gate slipped, with a rule that stops scoring noise from
   rewriting briefs whose candidates changed nothing.
4. **Amendment 1's path to `published`** within the measure rules: the site
   writes no case for or against it, and a side is added only from that
   side's own words read at its own source.

Then **the freeze itself**: what is frozen, what enforces it, how a correction
gets in, and how the checks keep working while it is on.

No new standard is introduced. The 0.85 gates, the 25-issue taxonomy, the
office spines, the 150% `word_count` setting and the one-site-per-candidate
source rule all stay as they are (`listed-races-2026-10-04.md` line 96 explains
why changing any of them now would mean re-running every race).

## 2. Current state (2026-10-08)

Every SQL below is a read-only `SELECT` on project `pqracitpmzpiqfnzlngw`, run
on 2026-10-08. Every live page was fetched with a `GET`. Scheduled-task facts
come from the scheduled-tasks MCP (`list_scheduled_tasks`, `list_task_runs`).

### 2.1 Publication

- `SELECT status, count(*) FROM race_publication GROUP BY 1` returned
  `listed 17, published 36`.
- Brief rows are exactly what was applied on 2026-10-04: 82 profiles (all with
  `audit->>'balance_check_passed' = true`), 648 claims, 648 claim sources, 502
  positions, 320 issues. The last race publish is 2026-10-04 18:05:30 UTC
  (`max(published_at)` on `race_publication`, matching the last `publish` row
  for `race_publication` in `admin_action`).
- Measures (`measure_publication`): `FL-AM1-general` is `listed`;
  `FL-AM2-general` was published 2026-09-27 01:48 UTC and `FL-AM3-general`
  2026-09-25 01:56 UTC.

### 2.2 The 17 listed races

Read with `race_publication JOIN race JOIN candidate` on the listed rows; every
one has 0 claims. FL-CFO is the only row with `level = 'state'`; the other 16
are county commission, school board and clerk races in Broward, Miami-Dade,
Hillsborough and Orange. The "why" column is from
`listed-races-2026-10-04.md` lines 62-87 and the run files it names; the last
column is this design's reading of what could change it.

| Race | On the Nov 3 ballot? | Candidates (site) | Why no claim today | What could give it a brief |
| --- | --- | --- | --- | --- |
| FL-CFO | yes | Ingoglia (blaiseforflorida.com), Taddeo (annettetaddeo.com) | Taddeo's site walled on 09-29 and on its re-run; Ingoglia's one issue-matched passage withheld as a past record | Taddeo's site reading in the refresh, or new text on either site |
| BRO-SB6 | yes | Cervera, Fernandez III (both sited) | Nothing clears both gates and an issue | New site text only |
| HIL-SB6 | yes | Gay, Perez (both sited) | Gay's two commitments score A6 0.63 and 0.82 | New site text only (see 2.5 on why 0.82 is not "nearly there") |
| ORA-CC4 | yes | Jones, Lopez (both sited) | Jones's three commitments match no issue (top B7 0.47) | New site text only |
| ORA-CC6 | yes | Gelzer, Scott (both sited) | Nothing clears both gates | New site text only |
| ORA-CLERK | yes | Johnson, Thomas (both sited) | Commitments clear both gates but no issue fits a Clerk; the office has no spine (`plans-2026-10-03.ts` line 31 returns `[]`) | Nothing under section 4 BC5 |
| ORA-SB3 | yes | Moore, Peña (both sited) | Closest is KYV9 0.72 | New site text only |
| BRO-CC6 | no (decided in August) | Shuham (sited) | Walled on 09-29 and its re-run; read on 09-25 (42 passages) | Her site reading in the refresh |
| BRO-SBAL8 | no (decided in August) | Zeman (sited) | Nothing clears both gates | New site text only |
| ORA-SB1 | no (decided in August) | Lopez Marantes (sited) | Commitments score A6 0.13 and 0.20 | New site text only |
| HIL-SB4 | no (unopposed) | Rendon (sited) | The site yields one short passage | New site text only |
| DAD-SB8 | no (decided in August) | Colucci (site NULL: hacked) | No usable site | Nothing this cycle |
| ORA-SBCHAIR | no (decided in August) | Gallo (site NULL: lapsed) | No site | Nothing this cycle |
| BRO-CC2 | no (unopposed) | Bogen (no site) | No site | Nothing this cycle |
| BRO-CC4 | no (unopposed) | Fisher (no site) | No site | Nothing this cycle |
| BRO-CC8 | no (unopposed) | McKinzie (no site) | No site | Nothing this cycle |
| DAD-SB2 | no (unopposed) | Bendross-Mindingall (no site) | No campaign site | Nothing this cycle |

Ballot status comes from `candidate.qualifying_status`: `qualified` for the 7
printed contests, `elected_in_primary` for 5 races, `unopposed` for 5. A new
or changed site is out of scope for the refresh: it needs its own verification
and database write first (`refresh-plan-2026-10.md` lines 57-64).

**The CFO evidence, in detail.**

- Taddeo, 2026-09-29: `brief-runs/FL-CFO/FL-DOE-91310/meta.tsv` has `exit 1`,
  and `ingest.log` ends "bot challenge did not clear in the browser … Could not
  fetch the homepage — stopping." On 2026-09-25 her site read on the third
  attempt, 10 passages over 2 pages
  (`policy-runs/passages-2026-09-25/index.json` line 1907, note "SiteGround
  challenge cleared on the re-run"). Those 09-25 passages include her
  `/issues` page on property insurance rates
  (`policy-runs/passages-2026-09-25/FL-DOE-91310.jsonl`), the CFO spine's
  first issue (A1). They were never judged by the current two-gate Step 2, so
  they are evidence that a readable site would likely yield a claim, not a
  claim.
- Ingoglia: `brief-runs/FL-CFO/FL-DOE-89394/run.json` (provenance
  `jev:jev-1.13.0/tax-7/q-e7282116`) has 50 passages, 3 that clear both gates,
  1 with an issue: `6c7aaec4` "Strengthened voter ID and election integrity
  laws" (B6 0.97, A7 0.96), withheld as a past record under the founder's
  2026-09-30 middle-path rule. The other two score B7 0.82 (`e99fa16b`, first
  responders) and KYV1 0.75 (`7c51d635`, social media).
- The CFO spine is A1 Property insurance costs, A3 Property taxes, B1 Economy,
  A4 Cost of living (`plans-2026-10-03.ts` line 26).

**Within-race symmetry holds on every listed roster.** In each of the 7
two-candidate listed races both candidates have an `official_site` (the query
above), and both have 0 rows in `candidate_social_account`
(`SELECT … count(*) FROM candidate_social_account …` per candidate). So the
"Official site" link and the social links (`RaceListing.tsx` lines 75-108)
appear for both candidates or neither.

### 2.3 What a listed race shows today

- `src/lib/listing-copy.ts` line 122: `LISTED_IS_FINAL = true` (decision 4,
  built as recommended).
- Line 189, `NO_BRIEF_CARD_LINE`: "No brief for this race. We write a brief
  only when a candidate's own campaign website states a position we can quote
  on an issue we cover, and we have not found one here. That is about our
  sources, not a judgment of the candidates."
- Lines 199-203: `listingCardLine(status)` gives that line to a `listed` race
  and `BRIEF_IN_REVIEW_LINE` (line 178: "Brief in review — we publish what
  candidates state on their own campaign websites only after every candidate
  in the race has been held to the same rules.") to a `published` race that
  renders the roster. `RaceListing.tsx` line 112 renders it under every
  candidate, identically.
- A published race renders the roster when any of its ballot-tier profiles
  lacks `balance_check_passed = true`: `getRaceBrief` returns null
  (`src/lib/briefs.ts` lines 171-178), and the race page falls back to the
  listing, which carries the race's status as `published`, so its cards get
  the in-review line (`listed-races-2026-10-04.md` line 56). This is the state
  a Path B1 rebuild is in for its roughly 13 dark minutes.
- Lines 208-210: the race-card caption is "Names on the ballot · no brief"
  for a listed race; `raceStatusLabel` gives "Full brief" for any published
  race (`src/lib/races.ts` lines 54-56).
- Live, `GET https://knowyour.vote/races/FL-CFO-general` (2026-10-08, HTTP 200):
  the intro "These are the names printed on the ballot for this race, from the
  Florida Division of Elections and the county Supervisor of Elections.", then
  Ingoglia's card and Taddeo's card, each carrying the `NO_BRIEF_CARD_LINE`
  sentence word for word.

### 2.4 How a brief is produced

One pipeline, the same for every candidate. Each step's file:

1. **Fetch**: `scripts/candidate-site-ingest.ts` reads the homepage, up to 8
   policy pages Jev picks from its links (`--links jev`, `src/lib/link-noul.ts`)
   plus the strongest About page. `chooseLinks` (`link-noul.ts` lines 125-137)
   takes policy links at a score of 0.5 or more, strongest first, at most 8,
   and the single strongest About link at 0.5 or more that is not already a
   policy page. Every homepage link is written to `links.jsonl` with its two
   scores and `chosen` = `"policy"`, `"about"` or `null` (ingest lines
   385-393). The ingest honours robots.txt for our token and every Anthropic
   token and Crawl-delay, falls back to headless Chromium for a bot challenge,
   and never solves a captcha (header comment, lines 49-63). The browser is
   `playwright-core`'s Chromium, or `CHROMIUM_PATH` (line 162); without one,
   every browser fallback reports "browser unavailable" and the page is
   unreachable (lines 177-183).
2. **Step 2**: `scripts/candidate-policy-noul.ts` asks Jev the two gates
   (`commitment`, `own_commitment`) and the 25-issue match on every passage, at
   0.85 (`src/lib/policy-noul.ts`). Both scripts call `loadEnvLocal`
   (`scripts/env-local.ts`), which loads the working directory's `.env.local`
   and, only for a worktree under `.claude/worktrees/`, falls back to the main
   checkout's and says so on stderr (lines 25-37). The refresh plan instead
   has `TYPESAFE_API_KEY` set in the shell for that session only and never
   written to a file (`refresh-plan-2026-10.md` line 55; driver header line
   9).
3. **Driver**: `docs/general-election/brief-runs/jev-driver-2026-09-29.sh` runs
   1 and 2 for a target file, six hosts at a time, and writes `meta.tsv`,
   `ingest.log`, `passages.jsonl`, `links.jsonl` and `run.json` per candidate.
   It calls `node` by name.
4. **Step 3 review**: one reviewer subagent per run on
   `brief-runs/FL-GOV/profiler-review-prompt.md`; past-record passages go on
   the shared withheld list (`withheld-2026-09-30.json`).
5. **Plans**: `brief-runs/plans-2026-10-03.ts` fixes the spine by office
   (lines 22-32) and writes no plan for a race with no claim (line 53).
6. **SQL**: `scripts/brief-rows-sql.ts` turns a plan into `brief.sql` and
   writes nothing (header, lines 1-37). Its header says why: "There is no
   admin surface for briefs" (lines 3-9).
7. **Proof**: a local PGlite reference (every repo migration, the live
   roster, the live briefs, then the new `brief.sql` files; refresh plan
   Step 2.5) and five md5 fingerprints per race (`apply-fingerprint-35.sql`).
8. **Apply**: through the MCP in pieces of about 17 KB with the `DELETE`s left
   out for a race that has no rows yet (Path A), or by the founder in the SQL
   editor for a published race (Path B1), because MCP `DELETE`s hang
   (`apply-2026-10-04.md` line 24).
9. **Audit, read-back, publish**: `balance_audit_core` at
   `word_count_pct = 150` written back to `profile.audit`, a read as `anon`,
   then `set_race_publication(race_id, 'published', 'founder', reason)`, which
   only `service_role` may execute (`0020_publication_door_only.sql` lines
   53-58) and which writes the `admin_action` row that `/admin/log` lists.

### 2.5 The refresh plan, and where it stands

- The plan is `brief-runs/refresh-plan-2026-10.md`. Its gates (lines 37-44):
  answers by Wed 10-07 with `TYPESAFE_API_KEY` made available to the run's
  environment (line 39), fetch by Mon 10-12, review by Wed 10-14, founder's
  yes by Thu 10-15, publish by Sat 10-17, freeze 10-18 to 11-03. Its cut-off
  (lines 48-51): a missed Gate 1 or 2 stops the refresh with nothing to undo;
  nothing is applied after 10-17.
- **Gate 0 has not been met.** The Cowork plan writes the founder's answers to
  `founder-answers-2026-10.md` (`cowork-tasks-3-4.typesafe.json` line 381).
  No such file exists: `find /Users/jsloth -maxdepth 6 -name 'founder-answers*'`
  and `mdfind -name founder-answers` returned nothing. Decisions 4 to 8 remain
  "built as recommended, pending" (`founder-decisions-2026-10-04.md` lines
  65-69). The founder checklist of the same day lists them as overdue
  (`founder-checklist-2026-10-08.md` A7, lines 156-173).
- **Nothing has run.** No `refresh-2026-10`, `refresh-targets-2026-10.tsv`,
  `rerun-2026-10` or `rerun-jev-targets-2026-10.tsv` exists in the main
  checkout or any worktree (`find` across the project, 2026-10-08).
- **The roster has not moved.** The Step 1.0 query (refresh plan lines 59-64)
  returned `97 | 471681f38b0829d3ed09cf9b71a6fece`, the 2026-10-04 value.
- **"The same command" still holds.** `git log cdd5a23..HEAD` on
  `scripts/candidate-site-ingest.ts`, `scripts/candidate-policy-noul.ts`,
  `src/lib/link-noul.ts` and `src/lib/policy-noul.ts` printed nothing.
- **The 09-29 run host had a working browser.** Every 09-29 `ingest.log`
  starts with a Node warning naming `file:///home/user/know-your-vote/…`, so
  the run was a cloud container, not the founder's Mac. No `ingest.log` under
  `brief-runs/` contains "browser unavailable", and Taddeo's reads "retrying in
  the browser" before the challenge failed.
- **The Mac is not ready to run it.** This repo pins `playwright-core` 1.56.1
  (`package.json` line 35), whose `browsers.json`
  (`/Users/jsloth/Projects/kyv-agent-worktree/node_modules/playwright-core/browsers.json`
  lines 4-15) wants Chromium revision 1194. `~/Library/Caches/ms-playwright`
  holds only `chromium-1243`, `chromium_headless_shell-1243` and
  `ffmpeg-1011`. So on the Mac, with no install and no `CHROMIUM_PATH`, every
  browser fallback fails, including the bot-challenge path that Taddeo's site,
  and so CFO's brief, depends on.

**Scoring noise is large enough to rewrite briefs on its own.** Jev's scores
move by a few hundredths between runs on the same text (refresh plan line 165;
`ingest-jev-2026-09-29.md` line 34: Jolly's `/environment` link scored 0.52 in
the pilot and 0.49 on 09-29). Counted from the 09-29 files (a read-only Python
pass over every `run.json` and `links.jsonl` named in
`jev-targets-2026-09-29.tsv`):

- 90 of the 97 targets have a `run.json` (the other 7 were walled or refused).
- 143 passages in 30 of the 47 races have all three deciding scores
  (`commitment`, `own_commitment`, top issue score) at 0.82 or more and at
  least one between 0.82 and 0.88. A move of 0.03 can turn each into a claim
  or out of one. FL-GOV alone has 56.
- 14 of 91 candidates with a `links.jsonl` have a link whose policy or About
  score is between 0.45 and 0.55, so the pages read can change between runs.
- The 8-page cap bound for no one on 09-29: 0 of the 91 had more than 8 links
  at 0.5 or more. 3 had exactly 8 policy pages chosen; 39 had none.

Under the refresh plan's Step 2.1 as written (lines 162-165), any difference
in the claim-eligible passages makes a published race "changed", and each
changed published race needs the founder in the SQL editor (Path B1, lines
219-223). Noise alone could put most of the 36 races in that queue on the
weekend before the freeze.

`scripts/compare-policy-runs.ts` already separates the two kinds of
difference: a passage id is a hash of url and text, and `compareRuns` reports
the corpus diff (`shared`, `onlyA`, `onlyB`, `edited`) apart from the verdict
diff (`src/lib/policy-run.ts` lines 197-205 and 230-274).

### 2.6 Amendment 1, and the measure corrections path

- `measure_resource` for `FL-AM1-general`: 10 rows, all `neutral`: 4 `official`
  (the DoE booklet, the DoS record, the Senate and House bill pages), 1
  `analysis` (James Madison Institute), 5 `reporting` (WUSF, CBS Miami, Ocala
  Gazette, WFLA, Bradenton Times). No `support` or `oppose` row.
- The publication gate (`2026-09-23-measure-resource-ladder-design.md` §4,
  lines 188-198): at least one support and one oppose resource, the larger
  side at most twice the smaller. Official and reporting rows are neutral by
  CHECK; argument and commentary rows are never neutral (§2, lines 112-113).
  Amendment-context design: one row per organisation per side, only rows
  actually opened, titles verbatim, notes attribution only
  (`2026-09-26-amendment-context-design.md` lines 27-38); C3 kept AM1 listed
  with a held note (line 15); C5 set a weekly cloud routine that re-checks AM1
  "(and AM2 while it's new) for primary-source statements", opens a PR only
  when it finds something, and never publishes (line 17).
- **Verified sided rows exist but were never seeded**
  (`measure-resources-verified-2026-09-24.md`):
  - support: Florida TaxWatch guide, `analysis` (line 85); Karl Dickey's
    Freedom Vanguard Substack, `commentary` (line 93); Republican Party of
    Florida's own release of 2026-09-14, `argument`, with reasons (line 386);
  - oppose: Amanda Informed Substack, `commentary` (line 92); Florida
    Education Association's voter toolkit, `argument`, a bare "opposed" listing
    (line 387); League of Women Voters' Vote411 page, `argument`, a bare
    listing (line 388).
  - That is 3 against 3, inside the gate. AM2 was published with the same two
    bare FEA and LWV listings in its NO column (founder call D2,
    `ballots-handoff.md` line 225), but AM2 also had a reasoned opponent row
    (Rep. Eskamani's vote explanation).
- **Why it is held** (`ballots-handoff.md` lines 219-223, decision 9, pending):
  no opponent's own reasoned case has been read at its own source. The
  governor's 2026-09-14 post on X and the Florida AFL-CIO testimony are known
  only through reporting (line 229). No House or Senate member filed a vote
  explanation (`measure-resources-verified-2026-09-24.md` line 309). The 09-26
  search of The Florida Channel looked for the House Budget Committee hearing
  with the AFL-CIO's testimony (line 405). The floor debate in which, per the
  coverage, Rep. Driskell made her quoted remarks (line 102) is not recorded
  as searched.
- **Who voted no.** House Journal No. 39, vote sequence 431 on HJR 5019, was
  100-1: the lone no was Rep. Caruso; after the roll call Rep. Hinson was
  recorded no and Rep. Basabe changed from yea to nay. The Senate's vote was
  29-4: Berman, Jones, Osgood and Smith (line 309). Rep. Driskell is not among
  the recorded no votes, so her quoted floor remarks cannot be taken as an
  opponent's case without checking how she voted (3.5).
- **One summary understates the record.** The decisions table says "The two
  sided sources are Substacks" (`founder-decisions-2026-10-04.md` line 71).
  Six sided rows are verified, two of them Substacks (above).
- **The held page.** `src/lib/measure-held-copy.ts` lines 27-36 hold AM1's
  note, `updated: "2026-10-04"`. Its second paragraph (line 31) ends "We have
  read the supporters' case that way, but not yet the opponents', so neither
  column is shown yet." The measure page prints "We look for new statements
  every week. This note was last updated …" under it
  (`src/app/(public)/measures/[measureId]/page.tsx` lines 157-159). A listed
  measure with no note gets "Resources on both sides are being collected. We
  publish them only when both sides are represented …" (lines 162-170).
- **The weekly routine.** The caption rests on the cloud routine "Weekly
  amendment source re-check (FL AM1/AM2)", Mondays 12:07 UTC
  (`ballots-handoff.md` line 217). Every pull request opened since 2026-09-27
  (#100 to #132, `gh pr list --state all --limit 200`) is a named session
  branch with a title naming its own work; none is the routine's. Under C5
  that means it has found nothing or has not run. Its runs could not be read
  from this session: the remote-trigger listing returns 20 routines, all
  one-off PR check-ins, and does not page.
- `measure_publication.note` for AM1 still reads "briefs not yet written
  (0033)". It is not rendered and is left alone.
- **Measure corrections have no door.** There is no `set_measure_publication`
  function (`pg_proc`, 2026-10-08: only `set_race_publication` matches
  `%publication%`), so taking a measure down is a direct `UPDATE` that writes
  no `admin_action` row unless one is written by hand, as
  `scripts/list-ballot-2026.sql` (lines 25-30) and 0040 (lines 364-397) do.
- **AM3 sits exactly at the 2x limit.** `measure_resource` by stance: AM3 2
  support (both `argument`) against 4 oppose (3 `argument`, 1 `commentary`);
  AM2 5 against 4. Deleting either AM3 support row while AM3 is published
  is refused at commit by the deferred `trg_measure_resource_balance`
  (`enforce_published_measure_balance`, `0034_measure_resources.sql` lines
  155-187), unless AM3 is taken to `listed` in the same transaction.

### 2.7 Who can write ballot content

- **The app writes two ballot tables, only through `/admin`.** Approving a
  `gated_diff` or `date_mismatch` review item runs
  `.from(plan.table).update({[plan.field]: plan.value})`
  (`src/app/api/admin/review/[id]/decision/route.ts` lines 163-166), where the
  table is `race` or `candidate` and the field is one of `race.key_dates`,
  `race.office`, `race.district` or `candidate.qualifying_status`
  (`src/lib/admin/effects.ts` lines 18-26 and 116-128). If that write fails,
  `failClosed` leaves the item `pending` with the error as its `apply_error`
  and logs an `approve` row with `applied: false` (route lines 233-247).
  `race.key_dates` is voter-facing: `RaceHeader.tsx` lines 21-22 print its
  general date and registration deadline. No such item exists today:
  `review_item` holds only `manual_news` (48 approved, 42 rejected). Every
  other insert, update, upsert or delete in `src/app/api` and `src/lib` names
  `admin_action`, `agent_run_request`, `news_item`, `notification_send_log`,
  `review_item`, `source` or `voting_info_subscription` (grep for literal
  table names, 2026-10-08; the decision route's variable table is the one
  exception, above).
- **Outside the app**, ballot tables change through migrations, the Supabase
  MCP (`execute_sql`, used by Claude sessions and the scheduled agents), the
  founder's SQL editor, and one more writer:
- **The role `cap_tool_wrapper` can log in and write brief tables.**
  `pg_roles.rolcanlogin` is true for it (false for `cap_readonly`, `anon`,
  `authenticated` and `service_role`). It holds `INSERT, SELECT, UPDATE` (no
  `DELETE`) on `candidate`, `candidate_social_account`, `claim`,
  `claim_source`, `issue`, `position`, `profile`, `race` and `source`
  (`information_schema.role_table_grants`), each with a `capw_all_<table>`
  policy `FOR ALL` (`pg_policies`). 0009 created it `NOLOGIN` for the S1 tool
  layer and left login to an out-of-band step (lines 10-16). Nothing uses it
  now: 0 sessions in `pg_stat_activity` and 0 `action_log` rows on 2026-10-08
  (`founder-checklist-2026-10-08.md` line 385). Its password was pasted into a
  chat and is on the rotate list (`cowork-handoff-2026-10-05.md` line 81;
  founder checklist D7 item 3, lines 384-391).
- **Nothing in the database stops a write.** `pg_trigger` shows no trigger on
  `claim`, `claim_source`, `position`, `issue`, `profile`, `race`,
  `candidate`, `race_publication` or `candidate_contact`; `measure_resource`
  and `measure_publication` carry only the balance triggers.
- **Scheduled agents** (`list_scheduled_tasks`, 2026-10-08): all five enabled.
  - R1 `cap-r1-candidate-news`: next run 2026-10-15 13:10 UTC, last 10-01. Its
    prompt INSERTs `candidate_news` rows straight into `news_item` with no
    `source_id` (`SKILL.md` line 56). Those rows render on candidate pages
    (`<CandidateNews>`, `src/app/(public)/candidates/[candidateId]/page.tsx`
    lines 80 and 124). Every live `candidate_news` row has a source today (0
    of 29 unsourced).
  - R3 `cap-r3-election-news`: next run 2026-10-14 13:08 UTC; its 10-07 run
    failed on an unreachable `apnews.com` (`list_task_runs`). Its prompt says
    "Writes: execute_sql INSERT into news_item ONLY" for `election_news`,
    with no `source_id` and no review (`SKILL.md` line 52). 8 of the 26 live
    `election_news` rows have `source_id` NULL, the newest dated 2026-09-09.
    Neither read path filters on `source_id`: `/api/news`
    (`src/app/api/news/route.ts` lines 98-103) and the candidate-page news
    query (`src/lib/briefs.ts` lines 348-354). `news_item.source_id` is still
    nullable, because 0014 is not applied.
  - R2 `cap-r2-contact-refresher`: next run 2026-10-12 12:01 UTC. 15 runs in
    all; it succeeded on 09-21, 09-28 and 10-05 (12:01-12:09 UTC). Its prompt
    upserts `candidate_contact` with no review (`SKILL.md` line 56), and
    `candidate_contact` renders on candidate pages (`CandidateContact.tsx`,
    `src/lib/briefs.ts` lines 379-391). It has written 0 `candidate_contact`
    rows and no freshness stamp (`max(race.info_last_verified_at)` is NULL),
    and has put no report in `Agents/RunReports/` since `2026-09-14-R2.md`.
  - R4 (read-only digest) and R5 (operator-only leads into `review_item`) do
    not write ballot content or voter-facing rows.
- **Code** reaches voters on every merge to `main` (Vercel). CI runs every
  `scripts/verify-*` through `scripts/verify-all.mjs` (`.github/workflows/ci.yml`
  line 87), but `main` is not protected:
  `gh api repos/…/branches/main/protection` answered 404 "Branch not
  protected" (founder checklist D6, line 347).
- **The checks replay every migration and then write brief tables.** Five
  scripts boot PGlite, apply every file in `supabase/migrations/` in name
  order, then insert fixtures: `verify-migrations.mjs` (replay lines 166-170;
  `race`, `race_publication`, `candidate`, `profile`, `source`, `issue`,
  `claim` at lines 606-630), `verify-brief-rows-sql.mjs` (lines 50-61),
  `verify-demo-seed.mjs` (lines 31-35, then `demo-seed.sql`),
  `verify-ballot-seeds.mjs` (lines 48-51) and `verify-election-seed.mjs`
  (lines 89-90). `verify-all.mjs` counts a script as SKIPPED only when its one
  FAIL line is "FAIL environment: NAME is not set" (lines 14-25); any other
  non-zero exit is a FAIL.

### 2.8 The correction route and `CORRECTION_SECRET`

- `src/app/api/cron/send-correction/route.ts` emails every active subscriber a
  corrected **election date** (a reminder that stated a wrong date). It cannot
  change a brief, a measure page or any other page. It answers 503 until
  `CORRECTION_SECRET` is set (lines 94-102), is not called by Vercel Cron, and
  takes POST only (lines 45-50). Before any mode it requires the date to match
  a verified `election_event` row (lines 71-73).
- On 2026-10-05 the secret was not set ("The correction route answers 503 until
  `CORRECTION_SECRET` is set (task 3)", `cowork-handoff-2026-10-05.md` line
  25), and the rehearsal is due before Oct 19 (lines 48-50; founder checklist
  E2, lines 423-436). No later record says it was set. Whether it exists in
  Production can be read without any request to the site, from Vercel's
  environment-variable list (the dashboard's Settings, Environment Variables,
  or `vercel env ls production`), which shows names, not values; that is
  where ground rule 1 has the founder paste it (cowork handoff line 11). This
  session did not read that list.
- The first county early-voting reminder sends at 14:00 UTC on Mon Oct 19
  (`founder-decisions-2026-10-04.md` line 37).
- The public contact for reporting an error is `info@knowyour.vote`
  (`src/lib/contact.ts` line 19). Its forwarding to an inbox the founder reads
  is still open (`cowork-handoff-2026-10-05.md` line 73; founder checklist D2,
  lines 260-269).

### 2.9 The other designs dated 2026-10-08

Four specs and one checklist were written the same day, and they touch this
one:

- **Migration numbers collide.** The ledger (`supabase/migrations/README.md`)
  shows `0048+ free`. `2026-10-08-agent-retrofit-design.md` claims 0048
  (`0048_agent_run_r5.sql`) and 0049 (`0049_contact_update_kind.sql`, after
  Nov 3) (line 669); `2026-10-08-news-source-integrity-design.md` claims 0048
  (`0048_news_tags_kind.sql`, line 467); `2026-10-08-roster-completeness-design.md`
  claims 0048 for its roster data, applied by 10-13 (§5 step 4, line 669);
  this spec's first draft claimed 0048 and 0049. 0038 was claimed twice the
  same way (`sessions/README.md` lines 46-57).
- **Roster-completeness ships voter-facing code before the freeze**: a code
  PR on 10-13 to 10-14 (the `Candidate` fields, `incumbencyFor`, the running
  mate line, the "none listed" slot) and a flip PR on 10-16
  (`SHOW_INCUMBENT_CHIP = true` in `src/lib/incumbency.ts`), deployed by 10-17
  or not at all (its §5 steps 5-7, lines 674-688). Its step 2 also edits R2's
  prompt to drop the `candidate_contact` upsert.
- **Agent-retrofit** rewrites R2 and R3 to queue `review_item` rows only (its
  PRs B and D, §5 lines 784-793), and recommends R3 and R5 keep queueing in
  the freeze (D11, line 758).
- **News-source-integrity** keeps news and tag approvals running in the
  freeze (D10) and schedules 0042 then 0014 (§5 steps 3-5).
- **The founder checklist** recommends pausing R1 and R3 now and through Nov 3
  (A1, lines 27-42), applying 0042 then 0014 by Tue 10-13 (B1, lines 177-196),
  forwarding info@ (D2), requiring CI on `main` (D6), and rotating the
  `cap_tool_wrapper` password with `NOLOGIN` as the flip (D7 item 3).

## 3. Design

### 3.1 Calendar, re-dated from today

Only Gate 0 slipped. The plan's later gates still fit, so this keeps them and
adds a fast lane for CFO. Times are Eastern (EDT until Nov 1).

| When | What | Who |
| --- | --- | --- |
| Fri 10-09, by 18:00 | **Gate 0**: answers to section 4 (BC1 to BC21). The same day: R1, R2 and R3 paused (BC12; R2 runs Mon 08:01, R3 Wed 09:08); `cap_tool_wrapper` set `NOLOGIN` (BC19); `TYPESAFE_API_KEY` placed in the run environment chosen under BC13 | Founder |
| Fri 10-09 | Ledger PR claiming the six numbers in BC21, merged before any of the four specs' migration branches | Agent, founder merges |
| Fri 10-09, after Gate 0 | Environment check (3.4 item 2), Step 1.0 checks, then refresh **1a** (about 7 minutes for 97 sites) | Agent |
| Fri 10-09, 1 hour or more after 1a | **1b**: one identical re-run of every failure, then **1d** (the keep-0929 list) | Agent |
| Sat 10-10 | Carry-forward step (3.4) built and verified, then triage | Agent |
| Mon 10-12, 08:07 | Last weekly AM1 re-check that can still matter | Cloud routine |
| Mon 10-12, by 18:00 | **Gate 1** (unchanged). **CFO's Gate 2 package**: review, plan, `brief.sql`, reference, audit preview | Agent |
| Tue 10-13 | **CFO Gate 3** (founder's yes for CFO alone, if it has a claim). **AM1 search closes** (3.5) | Founder, agent |
| Wed 10-14 | **CFO Gate 4** (Path A through the MCP) and publish. **Gate 2** for every other race (unchanged). Guard PR merged | Agent |
| Thu 10-15 | **Gate 3** for the rest of the refresh and for AM1. Migration 0050 applied (inert until 10-18) | Founder |
| Fri 10-16 | Gate 4, Path A races through the MCP; migration 0051 if AM1 publishes. Roster-completeness's flip PR, if its gate closed | Agent |
| Sat 10-17, by 18:00 | Gate 4, Path B1 sitting (founder's SQL editor), then the checks; no B1 starts after 18:00. Last Path A race applied. info@ forwarding confirmed | Founder, agent |
| Sat 10-17, by 22:00 | Freeze-copy PR merged and deployed (snapshot date and sentences, AM1 note and caption, measure fallback text, unfinished-brief set, frozen-file manifest) | Agent, founder merges |
| Sat 10-17, late | Live pages checked after the 3600 s cache; one GET of every cited source URL; amendment routine disabled | Agent; founder disables the routine |
| **Sun 10-18, 00:00 (04:00 UTC)** | **Freeze starts**: the database guard turns on by itself | |
| Sun 10-18 | Guard probe (3.6.6) | Founder |
| Before Mon 10-19, 14:00 UTC | `CORRECTION_SECRET` set and one rehearsal (founder checklist E2) | Founder |
| Mon 10-26 | Mid-freeze GET of every cited source URL (3.6.6) | Agent |
| **Wed 11-04, 00:00 EST (05:00 UTC)** | Freeze ends | |

**Cut-offs if Gate 0 is late:**

- Answers after Fri 10-09 18:00 but by Sun 10-11 18:00: run only **1c**, the
  five decision-5 candidates (refresh plan lines 112-119). Steps 2 to 4 then
  cover FL-14, FL-22, FL-27, BRO-CC6 and FL-CFO. CFO keeps its fast lane. The
  snapshot date and sentence follow the 1c rule in 3.4.
- Answers after Sun 10-11 18:00: no refresh. The 2026-09-29 snapshot stays,
  CFO and the other 16 stay listed, and only the freeze work (3.6) and AM1
  (3.5) proceed.

### 3.2 Which listed races can get a brief

**One rule for every race, no exceptions by name.** A listed race gets a brief
when, after the refresh, at least one of its candidates has a reviewed claim
(spine-proposal Decision 3, `spine-proposal-2026-10-03.md` lines 42-48), its
office has a spine, and it passes the audit at 150. Nothing is decided per race
or per candidate:

- Every candidate is fetched by the same command from the same environment
  (BC13). The run is never re-routed for one candidate (another network,
  another browser, a hand-opened page) to get past a wall. A wall is a failed
  fetch, and the 09-29 rule "never solve a captcha" covers every way around
  it.
- No passage is collected by hand for one candidate, CFO included.
- Under the noise rule (BC3), a passage scored on 09-29 keeps its 09-29
  verdict. HIL-SB6's 0.82 and Orange Clerk's 0.82 cannot cross 0.85 by
  re-asking; only new text on a site can give those races a claim.
- **Gate 3 is a check for errors, not a second rule.** A founder "no" for a
  race names an error in its package: a quote that does not match its
  source, a passage attributed to the wrong candidate, or a past record the
  review missed. That passage goes on `withheld-2026-10.json` with the reason.
  Holding back a race whose package has no error would be a different rule,
  and under BC5 it would have to apply to every race (BC15).

So, from section 2.2:

| Outcome | Races |
| --- | --- |
| **Likely, if a walled site reads** | FL-CFO (Taddeo; her 09-25 `/issues` text is about property insurance) and BRO-CC6 (Shuham; off the November ballot) |
| **Only from new site text** | BRO-SB6, HIL-SB6, ORA-CC4, ORA-CC6, ORA-SB3 (on the ballot); BRO-SBAL8, ORA-SB1, HIL-SB4 (off it) |
| **Not this cycle** | ORA-CLERK (no spine: no issue fits a Clerk of Courts, BC5); BRO-CC2, BRO-CC4, BRO-CC8, DAD-SB2, DAD-SB8, ORA-SBCHAIR (no usable site) |

**What each briefable race needs**, in order: (1) a candidate site that reads,
with its run under `<RACE>/<candidate_id>/refresh-2026-10/`; (2) at least one
passage that clears both gates and an issue at 0.85, kept by the Step 3 review
and not withheld under the middle path; (3) a plan on the office spine
(`plans-2026-10-refresh.ts`, refresh plan line 169); (4) `brief.sql` matching
the local reference on all five fingerprints; (5) `balance_audit_core` PASS at
`word_count_pct = 150`; (6) the founder's yes, recorded as BC14 says; (7)
Path A apply, a read as `anon`, and `set_race_publication`.

**A one-sided brief is the rule, not an exception.** If Taddeo's site reads and
Ingoglia's does not change, CFO's brief quotes Taddeo and shows "No stated
position found" in Ingoglia's four spine cells. That is how 20 of the 30
published multi-candidate races already work: in each, at least one ballot
candidate has 0 claims (`claim` counted per ballot-tier candidate on published
races, 2026-10-08). The 20 are FL-11, FL-14, FL-20, FL-22, FL-25, FL-26,
FL-27, FL-28, FL-AGR, FL-ATG, FL-DAD-CC5, FL-DAD-SB1, FL-GOV, FL-HIL-CC1,
FL-HIL-CC3, FL-HIL-SB2, FL-ORA-CC7, FL-ORA-CC8, FL-ORA-MAYOR and FL-SEN.
Holding CFO back for that reason would need the same rule for those 20 (BC5).

**CFO goes first (BC4).** CFO is the one race every voter sees. Its two runs
are triaged and reviewed first, its Gate 2 package is ready Mon 10-12, the
founder answers for CFO alone on Tue 10-13, and it is applied by Path A and
published on Wed 10-14. That leaves three days for the page cache, the live
check and a correction, if one is needed, before the freeze. Path A needs no
founder SQL session: the race stays `listed` while its rows go in through the
MCP, and `INSERT`s there run normally (`apply-2026-10-04.md` line 24).

### 3.3 What a race without a published brief says

Every card in a race carries the same line, and the line has to be true for
that race. Three cases remain on Nov 3.

**1. No reviewed claim** (the expected state of the 16 listed races other
than CFO, and of CFO if Taddeo is still walled and Ingoglia's site is
unchanged). The race stays `listed` and keeps `NO_BRIEF_CARD_LINE` as
shipped. It is true here:

- **CFO, walled**: her site could not be read, and his one quotable passage is
  a past record. Both cards carry the same sentence, and both link to the
  candidate's official site, so a voter can read each campaign directly.
- **The other on-ballot contests**: the sites were read, and nothing cleared
  both gates on an issue we cover.
- **Off-ballot seats**: the status line above the cards already says the seat
  was decided in August or is unopposed (`listing-copy.ts` lines 57-63), and
  the intro drops "printed on the ballot" for them (lines 133-138).
- **Orange Clerk**: the line states the rule ("on an issue we cover") rather
  than promising a brief, which keeps it true for an office with no spine
  (`listing-copy.ts` lines 181-188).
- **A race whose only claim the founder rejects at Gate 3**: the rejection
  names an error, so the passage is no longer a position "we can quote"
  (3.2), and the line stays true.

**2. A reviewed claim that is not published by Sat 10-17, 18:00** (BC15):
its audit at 150 fails, or its Gate 4 does not finish. "We have not found one
here" would be false. The race goes into a set `UNFINISHED_BRIEF_RACES` in
`src/lib/listing-copy.ts`, and every card in it reads `UNFINISHED_BRIEF_LINE`:

> No brief for this race. We found a position we can quote on a candidate's
> own campaign website, but we did not finish this race's brief before
> October 18, when we stopped changing briefs for this election. That is
> about our process, not a judgment of the candidates.

The line names no candidate and is identical on every card in the race. The
caption "Names on the ballot · no brief" stays true. The guard PR (rollout
step 5) ships the line, an empty set, `listingCardLine(status, raceId)` with
`RaceListing.tsx` and `CandidateListing.tsx` passing the race id, and
`verify-listing.ts` cases; the freeze-copy PR only fills the set, from
`refresh-2026-10.md`. In the expected case it stays empty.

**3. A published race held for a correction in the freeze** (BC16). The hold
sets `balance_check_passed = false` on the race's profiles under the
correction setting (3.6.5), so the race stays `published` and renders the
roster with `BRIEF_IN_REVIEW_LINE`, which is true while the brief is checked
(2.3). This is the state a Path B1 rebuild already passes through, and it
needs no code. It replaces the first draft's takedown to `listed`, whose cards
would have read "we have not found one here" about a race that has a brief.
Known limit: the race card elsewhere still says "Full brief"
(`raceStatusLabel` reads only the publication status) until the hold ends,
the same as during a B1 rebuild.

What is verified at Gate 4 and live (section 6): every card in a race carries
the same sentence, the caption matches the race's case, and the "Official
site" link appears for every candidate in the race or for none.

### 3.4 The refresh of the published briefs

Run `refresh-plan-2026-10.md` Steps 1 to 4 as written, with these changes.

**1. Dates and order.** As in 3.1. CFO's candidates are triaged, reviewed and
built first; nothing else about them differs.

**2. Where it runs (BC13).** All 97 sites from one environment, chosen at
Gate 0 and recorded in `refresh-2026-10.md` with the Node version, the
`playwright-core` version and the browser's executable path.

- **Recommended: a Claude Code cloud session, as on 09-29.** It is the
  environment the published briefs were read from, and its browser fallback
  worked then (2.5), so a site that reads or walls differently now differs
  because of the site, not because of our network or browser. The founder
  places `TYPESAFE_API_KEY` in that cloud environment's variables at Gate 0
  (refresh plan line 39). The environment check before 1a: `node
  scripts/candidate-site-ingest.ts` on one fixture site with `--browser
  always` prints no "browser unavailable" line, and `echo
  ${TYPESAFE_API_KEY:+set}` prints `set`. The key is never printed.
- **If BC13 is flipped to the founder's Mac**, the setup is part of Gate 0 on
  Fri 10-09 and finishes before 1a:
  1. A dedicated worktree on the branch `claude/brief-refresh-2026-10` at
     `/Users/jsloth/Projects/kyv-brief-refresh`, outside `.claude/worktrees/`
     so `env-local.ts` has no fallback to the main checkout's `.env.local`
     (2.4), and not `/Users/jsloth/Projects/kyv-agent-worktree`: the driver
     writes into `docs/`, and that agent worktree refuses to run R5 once it
     has been edited (`2026-10-07-candidate-leads-agent-design.md` lines
     183-185).
  2. `npm ci` with the arm64 npm, and the arm64 `node` first on `PATH`,
     because the driver calls `node` by name and the default `node` crashes
     under Rosetta.
  3. `npx playwright-core install chromium` in that worktree, which downloads
     revision 1194 for `playwright-core` 1.56.1 (2.5), with the founder's
     yes for the download.
  4. `read -rs TYPESAFE_API_KEY; export TYPESAFE_API_KEY` in that shell, as
     the refresh plan says (line 55). The key is never printed or written.
  5. The same environment check as the cloud.

**3. The noise rule (BC3).** Step 2.1 compares runs by what the site says, not
by how Jev scored it this time. Per candidate, after 1d's `keep` lines are set
aside:

- **A passage whose id is in the 09-29 run** (same url, same text, so
  `compareRuns` counts it `shared`) keeps its 09-29 verdict and its 09-30
  review. A score that moved across 0.85 is not a change.
- **The link test.** Each row of the two `links.jsonl` files has a `url` and
  `chosen` (`"policy"`, `"about"` or `null`; 2.4).
  - **Carried:** a url in both files, `chosen` non-null on 09-29 and `null`
    now. Its page keeps its 09-29 passages, like a walled page under 7a,
    whatever changed the choice: a score that crossed 0.5, the 8-page cap, or
    another About link outranking it (`chooseLinks`, 2.4). All three are
    score movements on links that were there both times.
  - **Dropped:** a url in both files, `chosen` `null` on 09-29 and non-null
    now. The refreshed page's passages are dropped; the 09-29 choice stands.
  - A url chosen both times (as `policy` or `about`) is a page read both
    times.
- **Everything else is a real change** and is taken from the refresh: a
  passage that is new or edited on a page read both times (`onlyB`,
  `edited`), a passage gone from such a page (`onlyA`), the page behind a url
  that is only in the new `links.jsonl` and chosen now, and the loss of a page
  whose url is only in the 09-29 file.
- **The cap.** If the merged set has more than 8 policy pages (the homepage
  and the About page do not count), pages behind new links are dropped,
  lowest refreshed policy score first, until it has 8. A carried page is never
  dropped for a new one. On 09-29 only 3 of 91 candidates had 8 policy pages
  chosen (2.5), so only for them can a new page be crowded out.

The rule is pure code: `carryForward(old, new, oldLinks, newLinks)` goes in
`src/lib/policy-run.ts`, next to `compareRuns`, and is verified in
`scripts/verify-policy-run.ts` (section 6). A thin command,
`docs/general-election/brief-runs/merge-runs-2026-10.ts`, writes
`run-merged.json` and `merge-report.json` beside each refreshed `run.json`.
Plans point at `run-merged.json`, and `brief-rows-sql.ts` reads whatever run a
plan names (header line 25).

A candidate whose merged run equals the 09-29 run has no change, and their
race is "identical" in triage unless another candidate in it changed. Only new
or edited passages go to a reviewer. The withheld list becomes
`withheld-2026-10.json`: the 09-30 entries (their ids are unchanged) plus any
new ones, including Gate 3 rejections (3.2).

**4. The reference build sets the correction setting.** Step 2.5's PGlite
reference replays every repo migration, which from 0050 on includes the
guard. Its builder runs `SET kyv.freeze_correction = 'pglite reference'`
first, as the five check scripts do (3.6.2), so a reference built during the
freeze, for a correction, is not refused.

**What the founder does at Gate 4.** Path A races (a listed race's first brief)
go in through the MCP on Fri 10-16, and any left over by 18:00 on Sat 10-17.
Path B1 races (a published race whose brief changed) run their whole
`refresh-2026-10/brief.sql` in the founder's SQL editor, all in one sitting on
Sat 10-17, finishing by 18:00. Each is dark for about 13 minutes until its
audit write-back (refresh plan line 221). A B1 race not done by 18:00 keeps
its 09-29 brief, and the snapshot sentence names it (refresh plan lines
248-249). A Path A race not done by 18:00 goes into `UNFINISHED_BRIEF_RACES`
(3.3).

**After the last race**, as the refresh plan says (lines 246-251), with these
rules for the methodology page (`src/app/(public)/methodology/page.tsx`):

- **Full refresh (1a and 1b).** `BRIEF_SNAPSHOT_DATE` (line 61) becomes the
  UTC date 1a started, if every published race was re-applied or found
  identical (refresh plan line 248). The exception sentence names every
  candidate with a kept 7a run and every race left on its 09-29 brief (line
  249). Pages carried under the noise rule are not named one by one; the rule
  itself is stated (3.6.4).
- **1c only.** `BRIEF_SNAPSHOT_DATE` stays `"2026-09-29"`, because the other
  92 candidates were not read again. The snapshot sentence adds the
  re-reads: "We read the candidates' sites on September 29, 2026, and read
  {names} again on {date}, because on September 29 we could not read their
  sites, or a page of them." `{date}` is the UTC date 1c started, and
  `{names}` lists, in the order of `rerun-targets-2026-10.tsv`, only those of
  the five whose race was re-applied from the 1c run. If none was, the
  sentence is unchanged.
- **No refresh.** Nothing on the page changes except the freeze sentences in
  3.6.4.
- **The numbers from the 09-29 run.** The rendered "about 45 of every 100
  passages that passed both" (line 680) and its source comment (lines
  34-36: 878 passed both gates, 482 also matched an issue) are recomputed from
  the merged runs: the share, rounded to the nearest whole number, of passages
  that cleared both gates and matched no issue. The comment's About-page count
  (line 30, "56 of 90 readable sites") is recomputed from the refreshed
  `links.jsonl` files. Under 1c or no refresh they stay.
- **The scrutiny summary** (line 541, "… quotes, all as of {SNAPSHOT_LABEL}")
  becomes "… quotes, from the sites as read on {SNAPSHOT_LABEL}, except as
  listed under “Briefs are a snapshot”" whenever the snapshot sentence names
  an exception, and stays as it is otherwise.

### 3.5 Amendment 1

The site writes no case for or against Amendment 1 under any path. Its page
lists what others published, sorted by the kind of source, and adds a side
only from that side's own words, read at its own source.

**The path to `published` (BC7):**

1. **Search, Fri 10-09 to Tue 10-13, own words only.** An agent session looks
   for an opponent's reasoned statement, using the Session B method: open and
   read each page, record it in a new dated section of
   `measure-resources-verified-2026-09-24.md`. The leads, most likely first:
   - floor remarks on HJR 5019 by the members the journals record voting no
     (House: Caruso, Hinson, Basabe; Senate: Berman, Jones, Osgood, Smith;
     2.6), in the chambers' own video archives or on The Florida Channel;
   - Rep. Driskell's floor remarks, which the coverage quotes, only under the
     floor-remarks rule below;
   - the governor's 2026-09-14 post on X. Only the founder can open it at its
     source, in a logged-in browser;
   - a Florida AFL-CIO, FEA or LWV Florida page that gives reasons, not just a
     listing.
   The same search looks for any new supporter's statement, so neither side
   is searched harder than the other.
2. **The floor-remarks rule (BC20).** A member's words on the floor,
   published by the chamber or its broadcaster, file as `argument` on a side,
   the way C1 filed Rep. Eskamani's journal explanation, only when both hold:
   the remarks themselves state the member's side (they say the member
   opposes or supports the joint resolution, or ask members to vote no or
   yes), and the chamber's journal does not record that member voting the
   other way on HJR 5019 (House sequence 431; Senate vote, 2025 bound journal
   Vol. II p. 1576). Before Driskell's remarks are filed, the session reads her
   vote in sequence 431: if she is recorded yea, they are not filed as
   `oppose`. Critical remarks that state no side are not filed at all, because
   an `argument` row is never neutral (2.6). The site never infers a side from
   a reporter's description.
3. **If an opponent's reasoned statement is read by Tue 10-13:** an agent
   writes migration **0051** on the pattern of
   `0040_measure_resources_am2.sql`. It seeds the six verified sided rows plus
   the new one(s), at most one row per organisation per side, and flips
   `measure_publication` to `published` with an `admin_action` row only when
   the status changes.
   - Each of the six 09-24/09-26 URLs is opened again first. A row that no
     longer loads, or no longer says what was recorded, is dropped and named
     in the header.
   - The header states the counts and the 2x gate. With the six rows the gate
     is 3 against 3; one more opponent row makes it 3 against 4.
   - If the gate does not pass honestly, the migration is not written.
   - In the same pull request: the `"FL-AM1-general"` entry in `HELD_NOTES`
     is deleted and `scripts/verify-measure-held.ts` line 14 changed to
     expect no AM1 note; `scripts/verify-ballot-seeds.mjs` lines 110-119
     expect three published measures, lines 512-516 expect AM1 published, and
     lines 561-569 expect AM1's 10 neutral rows plus its sided rows as `anon`
     (with the counts 0051's header states); `scripts/verify-migrations.mjs`
     lines 1555-1574 expect AM1's rows too, because 0051 inserts AM1's
     `measure_publication` row at the migration level. `verify-measure-balance.ts`
     and `verify-measure-resources.ts` run on 0051.
   - The founder says yes at Gate 3 (Thu 10-15), recorded as BC14 says. 0051
     is applied on Fri 10-16 and read back as `anon`, and then the code
     change merges. Until that merge the page already shows the YES and NO
     columns, because the held note renders only when no brief exists
     (`page.tsx` lines 140-174).
4. **If not:** AM1 stays `listed` through Nov 3, showing its 10 neutral rows
   and the held note, whose wording changes in the freeze-copy PR (BC8).

**Why this is the recommendation.** Publishing now on the six rows is allowed
by the count rule, and AM2 is the precedent. But the NO column would hold two
listings that give no reasons and one personal blog, against a party release
with reasons and a think tank's analysis. That reads as one-sided even though
it passes the 2x count, and the neutral reporting on the page already quotes
both sides' reasons (`ballots-handoff.md` lines 219-223).

**AM1 in the freeze (BC8).** Adding a newly found statement is new content, not
a correction, so AM1 does not change after Sat 10-17. The weekly routine is
disabled after its Mon 10-12 run, by the founder in the claude.ai routines
list (or by a session's remote-trigger `update` with `enabled: false`, after
the founder's yes). That also ends its AM2 re-check, which looked only for new
primary-source statements (C5), which the freeze does not add either. Dead
links on AM2 and AM3 are caught by the source checks in 3.6.6. If AM1 is
held, the freeze-copy PR changes, in `measure-held-copy.ts`, the second
paragraph to "We add for and against columns only from each side's own case,
read at its own source: a statement, testimony or page it published itself.
We have read the supporters' case that way, but not the opponents', so
neither column is shown." and `updated` to `"2026-10-17"`; and, in `page.tsx`,
the caption "We look for new statements every week." to "We stopped adding
sources to this page on October 17, 2026, for this election." Both "yet"s go,
because nothing more is coming before Nov 3.

### 3.6 The freeze

#### 3.6.1 Scope

From Sun 2026-10-18 00:00 EDT (04:00 UTC) to Wed 2026-11-04 00:00 EST (05:00
UTC), **ballot content** changes only by a correction:

- race briefs: `claim`, `claim_source`, `position`, `issue`, `profile`;
- publication state: `race_publication`, `measure_publication`;
- the roster and its links: `candidate`, `race`, `candidate_contact`,
  `candidate_social_account`;
- measure pages: `ballot_measure`, `measure_resource`;
- which races a voter is shown: `zip_district`, `block_district`;
- `source` rows that a claim or a measure resource points to;
- the code files listed in 3.6.3.

**Not frozen**, each with its own gate:

- **The news plane** (`news_item`). It is not gated today: R1 and R3 insert
  straight into `news_item` with no source and no review, and 8 unsourced
  `election_news` rows are live (2.7). BC12 pauses R1 and R3 from Fri 10-09.
  Fixing the 8 rows (0042 then 0014) is the founder checklist's B1 and the
  news-source-integrity spec's steps 3-5, not this design's. The news sweep's
  items, R5's leads, and retrofitted agents' items reach voters only through
  approval in `/admin`.
- **Reminders and election dates**: `election_event` and the email correction
  route (3.6.7), and `race.key_dates` (BC18).
- `review_item`, `admin_action` and the operator console.

**What is a correction** (refresh plan lines 257-267, widened to measures,
roster and code):

- a quote that does not match its source byte for byte;
- a passage attributed to the wrong candidate or race;
- a roster fact that changed: a withdrawal, a death, a court-ordered ballot
  change;
- a link that now points somewhere hacked or unrelated, as Colucci's did;
- a measure resource that no longer loads or no longer says what its row
  records;
- a page that crashes, or states something false about our process or the
  ballot.

**What is not:** new or changed content on a candidate's site; a campaign
asking to add or remove positions; a newly found statement on an amendment; a
copy, layout or feature improvement. Each request is still recorded (3.6.5).

#### 3.6.2 The database guard: migration 0050 (BC9)

`supabase/migrations/0050_content_freeze.sql` (the number follows BC21):

- **`content_freeze`**: one row (`id = 1`), with `starts_at = '2026-10-18
  04:00+00'`, `ends_at = '2026-11-04 05:00+00'` and a `note`, created and then
  inserted by the migration. RLS on, and all privileges revoked from `anon`
  and `authenticated`, as for every table since 0005.
- **`refuse_during_content_freeze()`**: a trigger function, `SECURITY
  DEFINER`, owned by `postgres`, with `SET search_path TO ''` and every name
  schema-qualified (`public.content_freeze`), as 0034's functions are. Definer
  is required: as `INVOKER`, a writer with no `SELECT` on `content_freeze`
  (`cap_tool_wrapper`, `anon`, `authenticated`) would get a permission error
  even outside the window. It does nothing outside the window. Inside it, it
  raises `P0001` with "Ballot content is frozen until Election Day
  (content_freeze). Corrections only:
  docs/general-election/corrections/README.md", unless
  `current_setting('kyv.freeze_correction', true)` is non-empty. In that case
  it raises a NOTICE carrying the setting's value and lets the write through.
  `EXECUTE` is revoked from `PUBLIC`, `anon`, `authenticated`,
  `cap_tool_wrapper` and `cap_readonly` by name (the lesson of 0020 lines
  1-30).
- **Statement-level `BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE` triggers**
  on `claim`, `claim_source`, `position`, `issue`, `profile`,
  `ballot_measure`, `measure_resource`, `candidate_contact`,
  `candidate_social_account`, `zip_district` and `block_district`.
- **Row-level triggers, with exceptions.** "Changes only X" means every column
  whose value differs between `OLD` and `NEW` is in X, compared as
  `to_jsonb(OLD) - X = to_jsonb(NEW) - X`; an `UPDATE` that changes nothing
  passes.
  - `race_publication` and `measure_publication`: an `UPDATE` whose new
    `status` is `listed` passes, so an emergency takedown never waits on the
    setting. A publish needs the setting. The routine hold for a race is
    BC16's, not this one (3.3).
  - `candidate`: an `UPDATE` that changes only `site_last_verified_at`
    passes. `race`: an `UPDATE` that changes only `info_last_verified_at`
    and `key_dates` passes. The first two are R2's freshness stamps, which
    voters do not read as content; `key_dates` is election logistics,
    approved by a human in `/admin`, like `election_event` (BC18).
  - `source`: `INSERT` always passes, because news intake upserts outlet rows
    (`src/lib/news-intake.ts` line 248). `UPDATE` and `DELETE` are refused
    only for a row referenced by `claim_source` or `measure_resource`.
  - Each of these tables also gets a statement-level `TRUNCATE` trigger.

**The checks keep working in the window.** Each of the five PGlite scripts
(2.7) runs `SET kyv.freeze_correction = 'pglite replay'` right after creating
its database and before replaying migrations. Without it, every CI run from
10-18 to 11-04 would fail at the first migration after 0050 that writes a
frozen table (0051 inserts `measure_resource` rows), or at the fixtures, and a
correction pull request could never pass. The 0050 cases in
`verify-migrations.mjs` turn the bypass off where they test refusal, inside a
transaction with `SELECT set_config('kyv.freeze_correction', '', true)`. A
correction migration applied live in the window starts with `SELECT
set_config('kyv.freeze_correction', '<correction file>', true);`, which lasts
for that migration's transaction.

**What it is and is not.** It stops accidental writes, such as an agent
re-running a stale `brief.sql`, R2's contact upsert, or a migration applied by
mistake. It also makes every frozen write name its correction file. It is not
a security boundary: any session that can write can also set the setting or
disable a trigger, including any login role with write grants, which is why
BC19 closes `cap_tool_wrapper`. The real control stays the founder's yes on
every correction.

**It enforces the refresh's own cut-off.** It turns on by the clock at 04:00
UTC on 10-18, so nothing from the refresh lands after 10-17. It is applied on
Thu 10-15 and is inert until then. A Gate 4 write that runs past the cut-off is
refused. A B1 race caught dark by it (applied but not yet written back) is
finished under the setting, citing `refresh-2026-10.md`: that completes an
approved apply and adds nothing new.

`election_event` is deliberately not guarded, so a date correction (3.6.7) is
never slowed by it.

#### 3.6.3 The code tripwire (BC10)

The **frozen files** are what renders ballot content: the race, race-issues,
candidate, measure and methodology pages and everything they import that
shapes a brief, a roster, a party or incumbency label, a contact block or a
measure.

- Pages: `src/app/(public)/races/[raceId]/page.tsx`,
  `src/app/(public)/races/[raceId]/issues/page.tsx`,
  `src/app/(public)/candidates/[candidateId]/page.tsx`,
  `src/app/(public)/measures/[measureId]/page.tsx`,
  `src/app/(public)/methodology/page.tsx`.
- `src/components/features/`: `RaceCompare.tsx`, `CandidateBrief.tsx`,
  `IssueSection.tsx`, `IssueRows.tsx`, `IssueFilter.tsx`, `ClaimList.tsx`,
  `SourceLinks.tsx`, `RaceHeader.tsx`, `RaceListing.tsx`,
  `CandidateListing.tsx`, `CandidateContact.tsx`, `CandidateBrowser.tsx`,
  `CountyRaces.tsx`, `YourRaces.tsx`, `SharedBallot.tsx`,
  `SavedCandidates.tsx`, `JudicialRetentionNote.tsx`,
  `MeasureResourceLadder.tsx`, `MeasureResourceRow.tsx`,
  `MeasureVoteMeaning.tsx`, `MeasureThreshold.tsx`.
- `src/components/ui/`: `PartyChip.tsx`, `PolicyAreaChip.tsx`,
  `VerdictBadge.tsx`.
- `src/lib/`: `listing-copy.ts`, `measure-held-copy.ts`, `listing.ts`,
  `briefs.ts`, `races.ts`, `race-rows.ts`, `resolve.ts`, `measures.ts`,
  `measure-ladder.ts`, `ballot-order.ts`, `judicial-retention.ts`,
  `incumbency.ts`, `party-label.ts`, `contact.ts`, `issue-pick.ts`,
  `office-title.ts`.
- Any file that roster-completeness's code PR (2.9) adds to that render path,
  added to the list in the same PR.

Not frozen: the news components and `src/lib/news-*.ts` (news-source-
integrity D10), the admin console, reminders and banners (`DeadlineBanner`,
`VotingInfo`), analytics (`TrackView`) and generic UI (`Card`, `Chip`,
`SaveToggle`).

The **manifest**: `docs/general-election/freeze-2026-10-18.json` holds the
window and the sha256 of each frozen file. It is written last in the
freeze-copy PR by `node scripts/verify-freeze.ts --write`, after every other
frozen-file change has merged, roster-completeness's flip PR included (rollout
step 9).

The **check**: `scripts/verify-freeze.ts`, run by `verify-all.mjs` in CI.

- With no manifest it prints `  ok  no freeze manifest yet
  (docs/general-election/freeze-2026-10-18.json); nothing to compare` and
  exits 0, as `verify-notifications-schema.mjs` passes with its own note
  (`verify-all.mjs` lines 28-31). It does not claim SKIPPED, which
  `verify-all.mjs` reserves for a missing environment variable (2.7).
- Inside the window it fails when a frozen file's hash differs from the
  manifest. Outside the window it passes and prints which files differ.
- A correction pull request updates the file, the file's manifest hash, and
  adds `"correction": "docs/general-election/corrections/<file>.md"` to that
  entry. The check also fails if a named correction file does not exist.

This is a tripwire, not a lock: anyone can edit the manifest. Its job is to
make every frozen-file change visible in the diff, with its correction note
beside it. It blocks merges only once `main` requires the CI checks, which is
the founder's item in `docs/ci.md` §1 and founder checklist D6.

#### 3.6.4 What voters are told (BC11)

In the freeze-copy PR:

- The methodology bullet "Briefs are a snapshot." (lines 688-691) becomes:
  "We read the candidates' sites on {SNAPSHOT_LABEL}{the exception or 1c
  sentence from 3.4}. Where a page said the same thing as when we read it on
  September 29, 2026, we kept that reading's result, and we kept reading the
  same pages as then unless a homepage's links had changed. Anything added or
  changed on a site since then isn't here. From October 18 through Election
  Day we change a brief only to correct an error. To report one, email
  {CONTACT_EMAIL}." The second sentence discloses BC3; it is left out under
  1c and under no refresh, where nothing was carried forward. ("isn't here
  yet" is dropped, because nothing more is coming.)
- The 09-29 figures and the scrutiny summary, as in 3.4.
- AM1's note and caption, as in 3.5, if AM1 is held.
- The measure page's fallback for a listed measure with no note (page.tsx
  lines 162-170) becomes: "This page shows no for or against columns right
  now. We show them only when the sources on both sides meet our rules, which
  the methodology page explains. Until then, this page shows the official
  ballot text and the explainers above, and no case for either side." (with
  the existing "the official ballot text and nothing else." variant when
  there are no neutral rows). Through Nov 3 this branch is reached only by a
  measure taken down for a correction (3.6.5), where "Resources on both sides
  are being collected" would be false; the new text is true there and for any
  future listed measure.
- `UNFINISHED_BRIEF_RACES`, filled as 3.3 says.
- No banner, and no per-race or per-candidate note. Every page is frozen in
  the same way, so the statement is made once, on the methodology page.

#### 3.6.5 How a correction gets in

1. **Record it.** Create `docs/general-election/corrections/2026-MM-DD-<slug>.md`:
   who reported it and how, the claim, the evidence (the live source fetched
   that day), whether it is a correction under 3.6.1, and the founder's yes or
   no. Requests that are not corrections are recorded the same way and answered
   "after November 3".
2. **Hold it, if the error is live and harmful.** In the founder's SQL editor,
   one transaction each:
   - **A race (BC16):** `BEGIN; SET LOCAL kyv.freeze_correction =
     '<file>'; UPDATE profile SET audit = audit || '{"balance_check_passed":
     false}' WHERE race_id = '<race_id>'; INSERT INTO admin_action (actor,
     action, subject_kind, subject_ref, detail) VALUES ('founder', 'note',
     'race_publication', '<race_id>', jsonb_build_object('reason',
     'Correction hold: <file>')); COMMIT;` The race renders the roster with
     "Brief in review" (3.3).
   - **A measure:** `BEGIN; SET LOCAL kyv.freeze_correction = '<file>';
     UPDATE measure_publication SET status = 'listed' WHERE measure_id =
     '<id>';` plus an `admin_action` row (`'founder', 'list',
     'measure_publication', '<id>'`, with `prior_status`, `new_status` and
     `reason`, in 0040's shape), then `COMMIT;`. The page shows the neutral
     block and the fallback text from 3.6.4.
3. **The fix**, in the founder's SQL editor, as one transaction:
   `BEGIN; SET LOCAL kyv.freeze_correction = '<file>'; <the fix>; COMMIT;`.
   - **A brief fix** then runs refresh plan Step 4 checks 2 to 4 for that
     race: fingerprints against a reference rebuilt with the fix (built with
     the setting, 3.4 item 4), the audit at 150, and the read as `anon`.
   - **A measure resource that no longer loads (BC17):** the row is replaced,
     in one transaction, by the Internet Archive capture of the same URL taken
     on or before the date the row was verified, after that capture is opened
     and shows the recorded title; kind, stance, title and note stay, and a new
     `source` row carries the capture's URL. The count does not change, so the
     deferred balance trigger passes. Only when no such capture exists, or the
     page now says something else, is the row deleted; if the delete breaks the
     2x gate (either AM3 support row, 2.6), the same transaction first takes
     the measure to `listed` as in step 2, and it stays listed through Nov 3,
     because adding a replacement statement is new content.
   - **A roster field from `/admin` (BC18):** a `gated_diff` approval of
     `race.office`, `race.district` or `candidate.qualifying_status` fails
     with the freeze message as its `apply_error`, and the item stays pending
     (2.7). The founder applies the value here, then approves the item again:
     it writes the same value, which changes nothing, so the guard lets it
     through and the item closes.
   - **A code fix** goes through a pull request that updates the manifest
     (3.6.3).
4. **Re-publish** if it was held: for a race, re-run the audit write-back
   (refresh plan Step 4 check 3), which sets `balance_check_passed = true`;
   for a measure, set it back to `published` under the setting with an
   `admin_action` `publish` row. Cite the correction file in each reason.
   Request the page twice after the cache expires, and record a quote in the
   correction file.

`docs/general-election/corrections/README.md` holds 3.6.1's definitions and
these steps. It ships in the guard PR.

#### 3.6.6 Agents, the role, and source checks (BC12, BC19)

- **R1, R2 and R3 are paused on Fri 10-09** (Gate 0), through Nov 3, as the
  founder checklist recommends for R1 and R3 (A1). R1 and R3 each insert
  unsourced, unreviewed rows that voters see; R2 upserts `candidate_contact`
  with no review. R3 or R2 may come back before Nov 3 only on a prompt that
  writes nothing voter-facing: agent-retrofit's queue-only R3 (its PR B) or
  R2 (its PR D), or R2 with roster-completeness's prompt edit that drops the
  `candidate_contact` upsert (2.9). Such an R2 writes only freshness stamps,
  which the guard lets through, and `review_item` rows. R1 stays off; the
  structural fix is 0042 then 0014 (`founder-decisions-2026-10-04.md` line
  76), outside this design.
- **R4 and R5** are unchanged: R4 reads, and R5 queues operator-only leads.
- **The weekly amendment routine** is disabled after its 10-12 run (3.5).
- **`cap_tool_wrapper` is set `NOLOGIN`** by the founder in the SQL editor
  (`ALTER ROLE cap_tool_wrapper NOLOGIN;`) on Fri 10-09, and stays so through
  Nov 3. Nothing uses it (2.7); it can log in, write every brief table and set
  the correction setting. Turning login back on after Nov 4 is a founder step
  done only if the S1 runtime is un-parked.
- **Source checks.** On Sat 10-17 after the freeze-copy deploy, and again on
  Mon 10-26, a session sends one `GET` to every distinct URL that a published
  claim's `claim_source` or a published measure's `measure_resource` cites,
  reads nothing else, and writes the results to
  `docs/general-election/corrections/source-check-2026-10-1x.md` (and
  `-10-26.md`): status code, final host, and for measure resources whether the
  recorded title still appears. An unreachable page, a redirect to another
  host, or a missing measure title starts step 1 of 3.6.5. A candidate page
  whose text changed is not a correction (3.6.1).

On Sun 10-18 the founder probes the guard once:
`BEGIN; INSERT INTO issue (…) VALUES (…); ROLLBACK;` in the SQL editor, with a
throwaway row. The expected result is the freeze error and nothing written.
Then `SELECT now() >= starts_at AND now() < ends_at FROM content_freeze`
should return `true`, and `SELECT prosecdef, proconfig FROM pg_proc WHERE
proname = 'refuse_during_content_freeze'` should return `true` and
`{search_path=""}`.

#### 3.6.7 Reminder date corrections and `CORRECTION_SECRET`

The freeze does not depend on `CORRECTION_SECRET`. That secret gates only the
email that corrects a wrong reminder date (2.8). Its own sequence, from
`reminders-e2e-runbook.md` "Sending a correction":

1. Pause reminders.
2. Fix and verify the `election_event` row (not guarded).
3. Dry run.
4. Rehearse.
5. The real send, with the confirmed count and key.

The dependency is on the calendar, not on this design. Without the secret,
the first county reminder (Mon 10-19, 14:00 UTC) goes out with no way to
correct it by email. The founder's check sends no request: the Vercel
environment-variable list for Production shows whether `CORRECTION_SECRET`
exists (2.8). Setting the secret and the one rehearsal stay the founder
checklist's E2, due before Oct 19.

## 4. Founder decisions

Each is Recommended (pending founder confirmation) and answered by Fri 10-09,
18:00 EDT (Gate 0).

| # | Decision | Recommended (pending founder confirmation) | TO FLIP |
| --- | --- | --- | --- |
| BC1 | Run the refresh (decision 7), re-dated | **Yes**, the full refresh (1a and 1b) on the calendar in 3.1; only the five (1c) if answered by Sun 10-11 18:00, with the 1c snapshot rule in 3.4; no refresh after that | "No refresh": the 09-29 snapshot stays and `BRIEF_SNAPSHOT_DATE` is unchanged. CFO then gets a brief only if 1c is run |
| BC2 | Decisions 5, 7a, 7b | **As built** in `refresh-plan-2026-10.md` lines 7-12: one identical re-run for walls, never a captcha; a site or page walled now keeps its 09-29 run; Path B1 for published rebuilds | The "How to flip" column of that table |
| BC3 | Score and link noise (new) | **Carry forward**: unchanged text keeps its 09-29 verdict and review; a link on the homepage both times keeps its 09-29 choice whatever moved it (the 0.5 threshold, the 8-page cap, About ranking); only new, edited or removed text, and new or removed homepage links, count as change; the rule is disclosed on the methodology page (3.4, 3.6.4) | Run Step 2.1 as written (refresh plan lines 162-165): any difference in claim-eligible passages is a change, and noise rebuilds are accepted |
| BC4 | CFO fast lane | **Yes**: CFO's Gate 2 on Mon 10-12, the founder's yes for CFO alone on Tue 10-13, publish on Wed 10-14 | CFO waits for the common Gate 3 on Thu 10-15 |
| BC5 | Which listed races may publish | **The existing rule for every race**: at least one reviewed claim and a spine for its office, so one-sided briefs publish (as in 20 published races). A race whose office has no spine (Orange Clerk) stays listed this cycle | Hold a race unless every candidate has a claim. That rule must then cover all races, which takes these 20 published races to `listed`: FL-11, FL-14, FL-20, FL-22, FL-25, FL-26, FL-27, FL-28, FL-AGR, FL-ATG, FL-DAD-CC5, FL-DAD-SB1, FL-GOV, FL-HIL-CC1, FL-HIL-CC3, FL-HIL-SB2, FL-ORA-CC7, FL-ORA-CC8, FL-ORA-MAYOR, FL-SEN. Or brief Orange Clerk with no spine, on a render path never shown before |
| BC6 | Decision 4: listed is final | **Keep**: `LISTED_IS_FINAL = true` and `NO_BRIEF_CARD_LINE` unchanged, with BC15's line for an unfinished brief | `LISTED_IS_FINAL = false` in `src/lib/listing-copy.ts`, only while briefs are actually being written |
| BC7 | Amendment 1 (decision 9) | **Hold, unless** an opponent's reasoned statement is read at its own source by Tue 10-13. Then 0051 seeds the six verified sided rows plus that statement and publishes, with your yes on Thu 10-15 | Publish now on the six verified rows (AM2's footing, D2), or hold through Nov 3 whatever the search finds |
| BC8 | AM1 in the freeze | **Frozen like the briefs**: no AM1 change after 10-17; you disable the weekly routine after its 10-12 run, which also ends its AM2 re-check; the held note loses both "yet"s, `updated` becomes 2026-10-17, and the caption changes as in 3.5 | Keep the routine on and allow AM1 to publish during the freeze, as a named exception with your yes |
| BC9 | Database guard (0050) | **Build it, apply it Thu 10-15**: the window is 10-18 04:00 UTC to 11-04 05:00 UTC; `SECURITY DEFINER` with an empty `search_path`; corrections pass under `SET LOCAL kyv.freeze_correction`; the five PGlite checks set that setting so CI keeps passing in the window | A process-only freeze, as in the refresh plan's "The freeze" section; skip 0050 and the harness lines |
| BC10 | Code tripwire | **Yes**: `verify-freeze.ts` and the manifest over the files in 3.6.3, written after roster-completeness's flip PR; protect `main` (`docs/ci.md` §1, checklist D6) so it can block | Process only: frozen files change only with your yes, and nothing checks it |
| BC11 | Freeze copy for voters | **Yes**: the methodology sentences (snapshot, carry-forward disclosure, corrections only, how to report), the recomputed 09-29 figures, and the measure fallback text in 3.6.4 | Leave "isn't here yet" and the 09-29 figures as they are; accept that the measure fallback says "being collected" for a measure taken down in the freeze |
| BC12 | Scheduled agents | **Pause R1, R2 and R3 on Fri 10-09 through Nov 3**; R3 or R2 return only on a queue-only prompt (agent-retrofit PRs B and D) or, for R2, without the contact upsert; R4 and R5 unchanged | Leave them on. R1 and R3 can then insert unsourced, unreviewed news rows (R3 next runs Wed 10-14), and R2's contact rows can reach candidate pages; the guard stops only R2's upsert, and only from 10-18 |
| BC13 | Where the refresh runs | **A Claude Code cloud session, as on 09-29**, with `TYPESAFE_API_KEY` placed in its environment by you at Gate 0; all 97 sites from it, recorded in `refresh-2026-10.md` | Your Mac, for all 97, with the setup in 3.4 item 2 done on Fri 10-09 (its own worktree, arm64 `npm ci`, Chromium 1194 installed, the key in the shell). A different network can change which sites wall, in either direction |
| BC14 | Whose approval puts a brief or AM1 in front of voters | **Your written yes at Gate 3**, quoted with its date in `refresh-2026-10.md` (briefs) or the AM1 PR (0051), and cited in the reason of the `admin_action` row that `set_race_publication` or 0051 writes, which `/admin/log` lists. This is how the 36 published briefs were approved; there is no admin surface for briefs (`brief-rows-sql.ts` lines 3-9) | Build an approve control in `/admin` for publication before 10-15 (a new route calling `set_race_publication` with the operator's email, two days before the freeze), or publish nothing new before Nov 3 |
| BC15 | A reviewed claim that does not publish by 10-17 | **Gate 3 "no" names an error**, and the passage is withheld; a race whose audit fails or whose Gate 4 does not finish goes into `UNFINISHED_BRIEF_RACES` and every card in it reads `UNFINISHED_BRIEF_LINE` (3.3) | Accept "we have not found one here" on such a race through Nov 3, and allow a Gate 3 "no" without a named error |
| BC16 | Holding a published race for a correction | **Set its profiles' `balance_check_passed` to false under the correction setting**: the race shows "Brief in review" until the audit write-back re-publishes it; no code | Take it to `listed` with `set_race_publication` (no setting needed), and accept "No brief for this race … we have not found one here" until it is re-published |
| BC17 | Measure resource corrections | **Archive capture first**: a dead link is replaced by the Internet Archive capture from on or before its verification date, opened and title-checked; delete only when none exists or the page now says something else, taking the measure to `listed` if the delete breaks the 2x gate | Always delete; a dead AM3 support link then takes AM3 to `listed` through Nov 3 |
| BC18 | `/admin` approvals in the freeze | **`race.key_dates` passes the guard** (with `info_last_verified_at`), like `election_event`; `race.office`, `race.district` and `candidate.qualifying_status` are refused and applied as corrections (3.6.5) | Freeze `key_dates` too (a date fix then also goes through the SQL editor), or let all four gated fields through |
| BC19 | `cap_tool_wrapper` | **`NOLOGIN` on Fri 10-09 through Nov 3**. This is the founder checklist D7 item 3's TO FLIP (line 391); rotating alone leaves a login role that can write every brief table and set the correction setting | Rotate only (D7's recommendation), accepting that whoever holds the new password can write ballot tables in the freeze |
| BC20 | Filing a legislator's floor remarks on AM1 | **Only when the remarks state the member's side and the journal does not record the member voting the other way** on HJR 5019; Driskell's remarks are filed as `oppose` only if sequence 431 does not show her voting yea (3.5) | File remarks by the side reporting attributes to the speaker; the site then relies on a reporter's reading, which C1 did not |
| BC21 | Migration numbers for the four 10-08 specs | **One ledger PR on Fri 10-09 claims them in expected apply order**: 0048 agent-retrofit `agent_run_r5`; 0049 roster-completeness's roster data (by 10-13); 0050 this spec's guard (10-15); 0051 this spec's AM1 publish (10-16, unused if AM1 stays held); 0052 news-source-integrity `news_tags_kind`; 0053 the `contact_update` kind that agent-retrofit and roster-completeness both plan for after Nov 3. Each spec renames its files to match (ledger rule 3) | First come: each spec claims the next free number when its branch is cut; this spec's two files take whatever is next, and every number here moves with the ledger |

## 5. Rollout order

Each step lists what must be merged or applied before it.

1. **Gate 0, Fri 10-09 by 18:00.** The founder answers BC1 to BC21. The same
   day: R1, R2 and R3 paused (BC12); `cap_tool_wrapper` set `NOLOGIN` (BC19);
   `TYPESAFE_API_KEY` placed in the run environment, and on the Mac the setup
   in 3.4 item 2 (BC13). Needs nothing.
2. **Ledger PR, Fri 10-09.** One docs PR adds the six rows of BC21 to
   `supabase/migrations/README.md`, with 0051 marked "unused if AM1 stays
   held". It merges before any of the four specs cuts a migration branch.
   Needs: Gate 0's answer to BC21.
3. **Refresh branch `claude/brief-refresh-2026-10`.**
   1. The environment check (3.4 item 2), then the Step 1.0 checks.
   2. 1a, then 1b at least an hour later, then 1d.
   3. `carryForward` and its verify, merged into the branch before triage.
   4. Triage. CFO is reviewed and built first.
   5. The run folders, plans, `brief.sql` files, references and
      `refresh-2026-10.md` (with the environment and each Gate 3 answer) are
      committed to the branch.

   Needs: Gate 0 (BC1, BC13 and the key).
4. **CFO, Tue 10-13 to Wed 10-14.** Founder's yes, recorded (BC14), then Path
   A through the MCP, then fingerprints (0 mismatches), the audit at 150 and
   its write-back, a read as `anon`, and `set_race_publication`. Needs: step
   3's CFO package. If CFO has no claim, nothing is applied, and the founder
   is told on Mon 10-12.
5. **Guard PR `claude/ballot-freeze-guard`, merged by Wed 10-14.** It
   contains 0050; its `verify-migrations.mjs` cases; the `SET
   kyv.freeze_correction = 'pglite replay'` line in `verify-migrations.mjs`,
   `verify-ballot-seeds.mjs`, `verify-demo-seed.mjs`,
   `verify-brief-rows-sql.mjs` and `verify-election-seed.mjs`;
   `scripts/verify-freeze.ts` (exit 0 with its note while no manifest
   exists); `docs/general-election/corrections/README.md`; and
   `UNFINISHED_BRIEF_LINE`, the empty `UNFINISHED_BRIEF_RACES`, the
   `listingCardLine(status, raceId)` change in `listing-copy.ts`,
   `RaceListing.tsx` and `CandidateListing.tsx`, with `verify-listing.ts`
   cases. Needs: step 2. It can merge before or after the refresh, because
   the guard is inert until 10-18.
6. **Apply 0050, Thu 10-15**, with the founder's yes, through the MCP
   `apply_migration`: DDL, plus one `INSERT` of the `content_freeze` row; no
   `DELETE`. Read it back: `SELECT starts_at, ends_at FROM content_freeze`,
   the new triggers in `pg_trigger`, and `prosecdef = true` with
   `proconfig = {search_path=""}` for the function. Needs: step 5 merged.
   Roster-completeness's 0049 (candidate rows) should be applied by then, as
   its spec plans for 10-13; if it is not, it can still be applied until
   10-18 04:00 UTC, and after that only as a correction.
7. **AM1, Fri 10-09 to Fri 10-16.**
   - The search closes Tue 10-13, under the floor-remarks rule (BC20).
   - If an opponent's statement was found: PR `claude/am1-publish` with 0051,
     the `HELD_NOTES` removal and the check updates listed in 3.5. Founder's
     yes Thu 10-15, recorded (BC14). Apply 0051 Fri 10-16, read back as
     `anon`, then merge the PR.
   - If not: nothing until the freeze-copy PR.

   Needs: step 2 (number); 0051 applied before 10-18 04:00 UTC.
8. **Gate 3 for the rest, Thu 10-15. Gate 4, Fri 10-16 (Path A) and Sat 10-17
   (Path B1 by 18:00, the last Path A by 18:00).** Then
   `apply-2026-10-1x.md` and `apply-fingerprints-2026-10-1x.json`, the list
   of any unfinished race (3.3), and the refresh PR merged. Needs: steps 3
   and 4.
9. **Freeze-copy PR `claude/freeze-copy`, merged and deployed by Sat 10-17
   22:00.** It contains:
   - `BRIEF_SNAPSHOT_DATE`, the exception or 1c sentence, the recomputed 09-29
     figures and the scrutiny summary (3.4);
   - the 3.6.4 methodology sentences and the measure fallback text;
   - AM1's note and caption, if AM1 is held;
   - `UNFINISHED_BRIEF_RACES`, filled from step 8;
   - and, last, the manifest written by `verify-freeze.ts --write`.

   Needs: step 5 merged (so `verify-freeze.ts` is on `main`); step 8's
   results, because the sentences name candidates and races; step 7's
   outcome, for AM1's copy; roster-completeness's flip PR (its §5 step 7)
   merged, or its 10-17 stop recorded, because it changes
   `src/lib/incumbency.ts`; and info@ forwarding confirmed (founder checklist
   D2), because the new sentence sends error reports there. The manifest is
   generated after every other frozen-file change.
10. **Sat 10-17, late.** Live checks (section 6) and the first source check
    (3.6.6), by an agent. The founder disables the weekly amendment routine
    (BC8); it last ran Mon 10-12.
11. **Sun 10-18.** The guard probe (3.6.6). The freeze runs to Wed 11-04
    05:00 UTC, when the guard stops by itself; no step is needed to end it.
12. **Independent, before Mon 10-19 14:00 UTC.** `CORRECTION_SECRET` set and
    one rehearsal (founder checklist E2), after the reminder end-to-end
    test's subscription exists (`cowork-tasks-3-4.typesafe.json` line 72).
13. **Mon 10-26.** The second source check (3.6.6). Needs: step 10's file, to
    compare against.

## 6. Testing

- **`scripts/verify-policy-run.ts`, new cases for `carryForward`**, each one
  mutation-checked:
  - Identity: merging a 09-29 run with itself returns it unchanged. Fixtures:
    Ingoglia's real `run.json` and `links.jsonl`, and FL-GOV's
    `reingest-2026-09-29/` layout.
  - A shared id with a moved score keeps the old verdict.
  - An edited passage takes the new verdict.
  - A link in both files, chosen then and not now, keeps its old passages, in
    three variants: its score fell under 0.5; it was pushed past the 8-page
    cap; another About link outranked it.
  - A link in both files, not chosen then and chosen now, is removed.
  - A new homepage link's page is kept.
  - A removed homepage link's page is dropped.
  - Over 8 policy pages, the lowest-scored new pages are dropped and no
    carried page is.
- **The merge on real data**: `merge-runs-2026-10.ts` with the 09-29 folders
  as both old and new produces `run-merged.json` files byte-identical to each
  `run.json`, and a `merge-report.json` with no change for all 90.
- **Step 1.0** (roster hash, the four files unchanged since `cdd5a23`,
  provenance `jev:jev-1.13.0/tax-7/q-e7282116` on every new run) and the
  environment check (3.4 item 2) before 1a. 1b's and 1d's selections are
  checked against the refresh plan's 2026-10-04 dry runs (lines 110 and
  153-158).
- **Per applied race**: 0 fingerprint mismatches against the local reference
  (`apply-fingerprint-35.sql`, widened to the refreshed races);
  `balance_audit_core` PASS at 150, written back; the read as `anon` shows the
  reference totals; the `admin_action` row exists and its reason cites the
  recorded Gate 3 answer.
- **`scripts/verify-migrations.mjs`, 0050**, with the `content_freeze` window
  set around `now()` and the bypass turned off inside each case's
  transaction:
  - an `INSERT` into `claim` is refused, and is allowed with
    `SET LOCAL kyv.freeze_correction`;
  - as `cap_tool_wrapper` (created by 0009 in the replay), an `INSERT` into
    `claim` passes outside the window and inside it fails with the freeze
    message, not "permission denied for table content_freeze";
  - `set_race_publication(…, 'listed', …)` passes without the setting, and
    `'published'` is refused;
  - a `profile` audit update is refused without the setting and passes with
    it;
  - a `candidate` `UPDATE` of only `site_last_verified_at` passes, and one
    that also touches `official_site` is refused;
  - a `race` `UPDATE` of only `key_dates` passes, and one of `office` is
    refused; an `UPDATE` that sets a column to its current value passes;
  - a `source` `INSERT` passes; an `UPDATE` of a source referenced by
    `claim_source` is refused, and one of an unreferenced source passes;
  - `TRUNCATE zip_district` is refused;
  - with the window moved into the past, every write passes;
  - `anon` cannot read `content_freeze` or execute the function, and the
    default-privileges model from 0020 holds;
  - the function is `SECURITY DEFINER` with `search_path` empty.
- **The bypass in CI**: with the `content_freeze` row's window moved around
  `now()` in a scratch copy of 0050, all five PGlite scripts pass; with their
  `SET kyv.freeze_correction` line removed, they fail. This proves CI keeps
  working from 10-18 to 11-04.
- **`scripts/verify-freeze.ts`**: exits 0 with its note and no manifest;
  passes on matching hashes; fails on a changed file without a manifest
  update inside the window; passes when the changed entry names a correction
  file that exists; fails when that file is missing.
- **Copy**: `scripts/verify-listing.ts`: `NO_BRIEF_CARD_LINE` unchanged (BC6),
  `UNFINISHED_BRIEF_LINE` names no candidate, every card in a race in
  `UNFINISHED_BRIEF_RACES` gets it and every card in any other listed race
  gets `NO_BRIEF_CARD_LINE`. `scripts/verify-measure-held.ts` passes on the
  new AM1 wording (no "yet") if AM1 is held, and is changed as 3.5 says if it
  is published; `scripts/verify-ballot-seeds.mjs` and
  `scripts/verify-migrations.mjs` change only on the publish path (3.5);
  `verify-measure-balance.ts` and `verify-measure-resources.ts` run on 0051 if
  it is written.
- **Live, Sat 10-17 after the cache has expired, two GETs each:**
  - `/races/FL-CFO-general`: the brief if published, or both cards with the
    identical `NO_BRIEF_CARD_LINE` (or `UNFINISHED_BRIEF_LINE`, if CFO is in
    that set) if not;
  - each of the other 16 listed races: one line repeated identically on every
    card; the "Official site" link for all candidates in the race or none;
  - each changed published race: a quote from the reference and the "No
    stated position found" count, as `apply-2026-10-04.md` records them;
  - `/measures/FL-AM1-general`: the YES and NO columns if published, or the
    neutral block, the new note and the new caption if held;
  - `/methodology`: the snapshot date, the snapshot and freeze sentences, and
    the recomputed share.
- **Sun 10-18**: the guard probe (3.6.6). `npm run typecheck`, `npm run lint`
  and `next build` pass on every PR above.

## 7. Out of scope

- Lowering the 0.85 gates, adding a Clerk or school-safety issue, or any other
  taxonomy change (`listed-races-2026-10-04.md` line 96).
- A second source for silent candidates (decision 6), hand-collected passages,
  or a different fetch path for any one candidate.
- Verifying a new candidate site, or a database write for one (refresh plan
  lines 57-64). Colucci's site stays NULL unless her campaign cleans it
  (`founder-decisions-2026-10-04.md` line 86).
- The news plane: the 8 unsourced `election_news` rows, migrations 0042 and
  0014, rewriting R1, R2 or R3 onto the review queue, R3's cadence, and
  candidate news slots (founder checklist A1 and B1; the agent-retrofit and
  news-source-integrity specs).
- An approve surface for briefs in `/admin` (BC14's TO FLIP).
- Judicial retention, the bio section, and the organisation registry. The
  Incumbent chip and running mates are roster-completeness's; this design
  only freezes their files.
- Election night and after: results, and anything that changes once the freeze
  ends on Nov 4.
