# News source integrity: design

Date: 2026-10-08. Status: draft for founder review, revised twice the same
day after spec review. Nothing in this document has been applied, merged or
scheduled.

**How this relates to the other 2026-10-08 documents.** The four specs dated
today were revised in parallel. This revision follows the agent retrofit spec
(`2026-10-08-agent-retrofit-design.md`) as it stood at 07:28 UTC (file time).
Its §3.0 (`:376-391`) names this spec the owner of the official-source list,
the approve-path change, R3's queue CLI and R1's retirement, and its §3.4
(`:576-606`) asks for four changes to that list. So this spec designs those
items (§3.2), and the retrofit moves R3 onto its wrapper. §2.10 gives the
ownership table and every recommendation that still differs between this
spec, the retrofit, `ballot-content-completion` and
`founder-checklist-2026-10-08.md`.

## 1. Purpose

Make these true before early voting opens in the covered counties on
2026-10-19 and before Election Day on 2026-11-03:

1. **Every `candidate_news` and `election_news` row has a source**, and the
   database refuses one without. Migration 0042 attributes four sourceless
   rows, migration 0014 attributes the other four and adds the CHECK. Neither
   is applied (§3.1).
2. **Every agent-written news row that voters see was approved by a person
   in /admin.** R1 and R3 are paused first (§3.0). The eight rows R3 inserted
   directly go through the review queue (§3.3). R3 comes back only as a queue
   (§3.2, D5).
3. **Government notices can carry a source without giving some candidates a
   label others cannot get.** A fixed official list, and an approve path that
   attributes an official source only to an election notice that names no
   candidate and no race (§3.2, D6, D7).
4. **Given source ids are checked against the story's URL**, so a payload
   cannot attribute one publisher's story to another (§3.2).
5. **The five unrated outlets and the AI-crawler hold** stay founder gates.
   §3.6 states what each choice changes.
6. **Topic tags reach voters only after a person approves them**, and only
   where every story can carry them alike (§3.4).
7. **The sweep runs daily and records its feed depth where it can be read
   later.** Its dedupe read stays correct as the queue grows (§3.5, §3.7).
8. **What `/methodology` says about news is true** before the freeze locks
   that page (§3.8).

Nothing here changes a brief, a race or a candidate row. `news_item`,
`review_item` and `admin_action` are outside the freeze
(ballot-content-completion §3.6.1, `:860-871`), and the guard lets every
`source` INSERT through (§3.6.2, `:929-931`). One change touches a frozen
file, `src/app/(public)/methodology/page.tsx` (`:975`), so it lands before
2026-10-18 (§3.8, D15).

## 2. Current state

### 2.1 Evidence used

All SQL below was read-only (`SELECT` only), run against project
`pqracitpmzpiqfnzlngw` on 2026-10-08, first between 06:20 and 07:10 UTC and
again for this revision between 07:23 and 07:40 UTC, with the same results.
`SELECT now()` returned 07:23 UTC at the start of the second pass, so the
11:00 UTC sweep had not yet run.

| # | Query (abridged) | Observed |
| - | ---------------- | -------- |
| Q1 | Per `item_type`: count, sourceless, `issues IS NULL`, and how many have `race_id`, `candidate_id`, `metro`, `county_fips`, or none of them | `candidate_news` 29: all with `race_id` and `candidate_id`, 0 with `metro` or `county_fips`, 0 sourceless, 29 untagged. `election_news` 26: 5 with `metro`, 14 with `county_fips`, 7 with no scope (statewide), 8 sourceless, 26 untagged. `official_link` 6: 4 `metro`, 2 statewide, 6 sourceless. `pipeline_event` 36: all with `race_id`, 36 sourceless. No row anywhere has `issues = '{}'` or a non-empty `issues`. |
| Q2 | `SELECT id, metro, county_fips, published_at, url, char_length(title), char_length(summary) FROM news_item WHERE item_type = 'election_news' AND source_id IS NULL` | Exactly 8 rows: `126725c6…` (Miami-Dade, primary early voting, 06-01, `metro` miami), `1ae20884…` (Miami-Dade, general-election options, 09-01, miami), `4c787ba7…` (Hillsborough, 27 general sites, 09-09, tampa), `7d95cfb2…` (HB 991 becomes law, 04-02, statewide), `8d12a9b1…` (DoS statewide deadlines, 09-09, statewide), `9b4a9bf0…` (Broward early-voting windows, 07-06, fort_lauderdale), `bbc7a4c8…` (Hillsborough, 27 primary sites, 07-06, tampa), `ce038b86…` (Ballotpedia: three amendments certified, 06-03, statewide). No `county_fips`, `race_id` or `candidate_id` on any of them. Titles are 59 to 86 characters and summaries 234 to 473. |
| Q3 | `pg_constraint` on `news_item`, `source`, `review_item`, `agent_run` | No `news_item_agent_source_check`. `news_item_item_type_check` admits `pipeline_event`, `official_link`, `candidate_news`, `election_news`. `source_type_check` admits `factual_reporting`, `opinion`, `primary_doc`, `candidate_self`. `source.url_norm` is UNIQUE. |
| Q4 | The six newest rows of `supabase_migrations.schema_migrations`, and any named `%news_fairness%` or `%news_source_backfill%` | Newest first: `20261008060351 0047_candidate_lead_kind`, `0046_uthmeier_incumbent`, `0044_general_ballot_order`, `0043_county_early_voting_2026`, `create_portfolio_assets`, `0041_measure_neutral_listed`. There are 0 rows for 0014 and 0 for 0042. |
| Q5 | `source` rows with `source_id LIKE 'src_gov_%'`, `'src_ballotpedia_%'` or `'official:%'`, or a `url_norm` containing `ballotpedia` | 0. |
| Q6 | `SELECT kind, source, status, count(*) FROM review_item GROUP BY 1,2,3`, plus `max(created_at)` | `manual_news` / `agent:R1`: 48 approved, 42 rejected, 0 pending. No other kind has a row. The newest was created 2026-10-06 19:55 UTC. |
| Q7 | Q6 grouped by `payload->>'item_type'` and the minute it was created, with the oldest and newest `published_at` | Two batches. 16:40 UTC: 47 `candidate_news`, published 09-30 to 10-06, 29 approved. 19:55 UTC: 43 `election_news`, published 09-29 to 10-06, 19 approved. The last decision was 2026-10-08 00:02 UTC. |
| Q8 | `SELECT (payload->>'published_at')::date, count(*), count(*) FILTER (WHERE status='approved') FROM review_item WHERE kind='manual_news' GROUP BY 1` | Sep 29: 1 (1 approved); Sep 30: 3 (3); Oct 1: 7 (4); Oct 2: 9 (7); Oct 4: 3 (1); Oct 5: 37 (19); Oct 6: 30 (13). |
| Q9 | Sourced `candidate_news` and `election_news` rows joined to `source`, by `source_id` | All 47 point at `outlet:<domain>` rows, all `factual_reporting` / `unrated`. `outlet:flvoicenews.com` has 7 of them (5 candidate, 2 election). None is from a domain on `AI_POLICY_HOLD`. |
| Q10 | Approved election items with no `news_item` at their URL, and their `admin_action` rows | One: review item `c8f34ab8…` (Florida's Voice, "Voter registration deadline arrives ahead of Florida homestead exemption vote"). Its `admin_action` at 2026-10-06 22:16:47 UTC records `effect: news_item inserted … source=outlet:flvoicenews.com` and `source: {via: "given"}`. No row exists now, and no logged action removes it. |
| Q11 | `pg_get_constraintdef` of `review_item_kind_check`, and `pg_indexes` on `review_item` | `CHECK ((kind = ANY (ARRAY['manual_news', 'gated_diff', 'fact_flag', 'unclear_statement', 'unverified_fact', 'date_mismatch', 'candidate_lead'])))`. `uq_review_item_candidate_lead_key` exists. |
| Q12 | `source` rows typed `primary_doc` whose `url_norm` is not on `example.org` | 9 rows, all lean `N/A`, all measure resources. Publishers as stored: `src_flsenate_bill_page_am1` "The Florida Senate" and `src_flsenate_finance_tax_analysis_am2` "The Florida Senate, Committee on Finance and Tax" (`www.flsenate.gov`); `src_fldos_amend_booklet_2026` "Florida Division of Elections" (`files.floridados.gov`); three `src_dos_init_detail_am*` rows "Florida Dept. of State, Division of Elections" (`constitutionalinitiatives.dos.fl.gov`); `src_flhouse_bill_detail_am1` and `src_eskamani_vote_explanation` "Florida House of Representatives" (`www.flhouse.gov`); `src_ocfl_property_tax_am3` "Orange County Government, FL" (`ocfl.net`). |
| Q13 | `source` rows whose `url_norm` equals any of 23 hosts, bare or with `www.`: the 17 in §3.2.1, plus `miamidade.gov`, `fec.gov`, `congress.gov`, `govinfo.gov`, `courtlistener.com` and `flgov.com`; or equals `www.miamidade.gov/global/elections/home.page` | 0 rows. |
| Q14 | `source` rows whose `url_norm` contains any of the five outlets' domains | One: `src_tampabay_times_am2_column`, `opinion`, `unrated` (an Amendment 2 measure resource). |
| Q15 | `official_link` rows: `id`, scope, `title`, `url` | 6 rows: `https://www.ocfelections.gov` (orlando), `https://www.browardvotes.gov` (fort_lauderdale), `https://www.votehillsborough.gov` (tampa), `https://www.miamidade.gov/global/elections/home.page` (miami), `https://registertovoteflorida.gov` (statewide), `https://dos.fl.gov/elections/` (statewide). |
| Q16 | `pipeline_event` rows: count, `count(url)`, date range | 36 rows, 0 with a URL, all with `race_id`, published 2026-09-27 to 2026-10-04. Sample title "Race published: Attorney General". |
| Q17 | `pg_get_constraintdef` of `agent_run_agent_check` | `CHECK ((agent = ANY (ARRAY['R1', 'R2', 'R3', 'R4', 'dispatcher'])))`. |
| Q18 | `information_schema.columns` for `news_item` | `id` defaults to `gen_random_uuid()` and `published_at` to `now()`. `item_type`, `title` and `published_at` are NOT NULL. There is no `created_at` and no `verified_by`. |

Scheduled tasks, read with the scheduled-tasks `list_scheduled_tasks` and
`list_task_runs` tools at about 07:30 UTC:

| # | Observed |
| - | -------- |
| S1 | `cap-r3-election-news` is enabled, `0 9 * * 3`, next run 2026-10-14 13:08 UTC. Its 2026-10-07 run **failed**, with the error "The following domains are not accessible to our user agent: ['apnews.com']". The newest R3 report in `Agents/RunReports/` is `2026-09-09-R3.md`. |
| S2 | `cap-r1-candidate-news` is enabled, `0 9 1,15 * *`, next run 2026-10-15 13:10 UTC. The newest R1 report is `2026-07-15-R1.md`. |
| S3 | `cap-r5-candidate-leads` is enabled, `30 9 * * 1,4`, next run 2026-10-08 13:38 UTC. |

Offline (arm64 Node, no network, no database):
- `usableOutlets()` returns 24 of the 37 listed outlets, all read by RSS.
- The characterizer's provenance for the current taxonomy is
  `jev:jev-1.13.0/tax-7/q-13cdde05`: 25 questions, `buildQuestions(ASKABLE)`
  as the runner builds them (`scripts/news-characterize.ts:116-117`).
- `urlNorm` (`src/lib/brief-rows.ts:219-231`) on each of Q2's eight URLs
  gives exactly the `url_norm` that 0014 or 0042 writes for that page (8 of
  8 equal).

### 2.2 The eight sourceless rows, and the agents that wrote them

- **R3 wrote all eight with `execute_sql INSERT`.** `2026-07-06-R3.md:4,124`
  records `126725c6`, `9b4a9bf0`, `bbc7a4c8` and `7d95cfb2`.
  `2026-09-09-R3.md:4,144-146` records `1ae20884`, `4c787ba7`, `ce038b86` and
  `8d12a9b1`. None went through `review_item` (Q6 has no `agent:R3` row), and
  nobody approved them in /admin.
- **R3's prompt allows only that write path and forbids source rows.**
  `cap-r3-election-news/SKILL.md:52` says "execute_sql INSERT into news_item
  ONLY", and `:67` says "You never write … source … rows". Every row it
  writes therefore breaks "no source, no card".
- **R1's prompt is the same** (`cap-r1-candidate-news/SKILL.md:56,69`), **but
  R1 has never written a row.** Both of its live reports record "Items
  written: 0" (`2026-07-06-R1.md:168`, `2026-07-15-R1.md:136`). All 29
  `candidate_news` rows came through the review queue with outlet sources
  (Q9).
- **After 0014, neither prompt blames the wrong migration.** The "0005 not
  applied" rule covers only "the item_type CHECK constraint" (`R1 SKILL.md:58`,
  `R3 SKILL.md:55`). A refusal from `news_item_agent_source_check` falls under
  the next line instead: "errors persist: write a run report saying so,
  change nothing, and stop" (`R1 :59`, `R3 :56`). So 0014 stops the insert
  and the agent stops too.
- **Until 0014 is applied, nothing stops either agent.** Both tasks are
  enabled (S1, S2). The founder checklist records that `execute_sql` already
  ran without a prompt in R1's 10-01 and R3's 10-07 scheduled runs
  (`founder-checklist-2026-10-08.md` A1, `:32-35`). R3 runs next on 10-14.
- **R3's current sources** are its prompt's Tier 1 (`dos.fl.gov`,
  `registertovoteflorida.gov`, `miamidade.gov`, `browardvotes.gov`,
  `votehillsborough.gov`, `ocfelections.gov`, `flsenate.gov`,
  `myfloridahouse.gov`, `leg.state.fl.us`, `courtlistener.com`,
  `congress.gov`) and Tier 2 (`apnews.com`, `ballotpedia.org`,
  `votesmart.org`, `politifact.com`, `factcheck.org`, `opensecrets.org`)
  (`SKILL.md:26-31`). Its job includes "court rulings affecting covered
  races" (`:13`).
- The candidate-leads spec left this gap open
  (`2026-10-07-candidate-leads-agent-design.md:205-206`).

### 2.3 Migrations 0042 and 0014

- **0014** (`supabase/migrations/0014_news_fairness.sql`) inserts four page
  source rows (`:67-84`) and attributes four rows by literal id (`:88-95`).
  It then adds `news_item_agent_source_check`,
  `CHECK (item_type NOT IN ('candidate_news','election_news') OR source_id IS NOT NULL)`,
  inside a guard (`:101-109`). It exempts `official_link` and
  `pipeline_event` (`:16-21`, `:97-100`). It is not applied (Q3, Q4).
- **0014 precondition (a) is met and deployed.** The approve route resolves
  a source before it inserts (`src/app/api/admin/review/[id]/decision/route.ts:141-161`,
  `resolveSource` at `:285-363`). `describeNewsInsertError` names the new
  CHECK instead of blaming 0005 (`:372-376`). The 10-06 approvals recorded
  `source: {via: "given", …}` in `admin_action` (Q10).
- **0014 precondition (b)** is the pre-apply re-count. Q2 is that count
  today: exactly the eight known ids.
- **0042** (`0042_news_source_backfill.sql`) attributes the other four. Three
  government pages become `primary_doc` / `N/A` (`:63-89`). The Ballotpedia
  story becomes `factual_reporting` / `unrated` inside a marked block
  (`:91-105`). The header recommends that block, pending founder
  confirmation, and gives a delete alternative (`:38-46`). Each UPDATE reads
  the `source_id` back by `url_norm` (`:53-58`). The final assertion accepts
  the row attributed or the row gone (`:107-124`). It is not applied (Q4,
  Q5).
- **Order on live: 0042 first, then 0014.** Applied alone, 0014 fails on
  0042's four rows and rolls back (`0042:8-24`; `things-to-confirm.md` TC-6,
  `:337-339`). The runbook's apply steps are `news-inlet-runbook.md:158-207`.
  That file names the MCP migrations `news_source_backfill` and
  `news_fairness` (`:183-185`). 0043, 0044, 0046 and 0047 were recorded with
  their numbers (Q4). 0045 was applied by hand in the SQL editor, after the
  connector timed out on its `DELETE`, and is not recorded
  (`supabase/migrations/README.md:61`).
- **The offline harness checks 0014 but not 0042.**
  `scripts/verify-migrations.mjs` checks 0014 (`:505-556`). It never mentions
  0042, Ballotpedia, a backfill or 0042's row ids, so 0042 is only applied in
  fresh-database order with no check of its own. That is what runbook §8
  claims and no more (`news-inlet-runbook.md:351`).
- **The ledger has drifted.** `supabase/migrations/README.md:63` says 0047
  is "not applied", but live has it (Q4, Q11). `README.md:64` lists 0048
  onward as free.

### 2.4 The Ballotpedia row

- Its title is "Three constitutional amendments certified for Florida's
  November 3 ballot", dated 2026-06-03. The summary lists the three measures
  and the 60% threshold, with no case for or against.
- 0042 gives it lean `unrated` because Ballotpedia "has no lean anyone signed
  off" (`0042:30-33`). `unrated` means something narrower: "a lean applies
  perfectly well and no rating agency has published one"
  (`src/lib/news-labels.ts:15-24`, migration 0028). Nobody checked whether a
  rater covers Ballotpedia. The handoff that recommends this attribution
  (`stream-surface-handoff.md:124`, D5) gives no such check.
- No surface prints that lean today. A card prints the publisher and, for
  any type other than `factual_reporting`, a kind word, and never a lean
  (`newsCardLabels`, `news-labels.ts:125-135`). 0042's header still says the
  card prints "No independent rating" (`0042:33-34`), which predates that
  contract. Only listed outlets have an outlet page
  (`src/app/(public)/news/outlet/[slug]/page.tsx:44-45`), and Ballotpedia is
  not listed.
- The site's measure pages now cover the same three measures from official
  sources and named resources (migrations 0035 to 0041).

### 2.5 The five outlets with no lean, and the AI-crawler hold

Facts from `src/lib/news-sources.ts`, rows at the lines given:

| Outlet | Retrieval path | On `AI_POLICY_HOLD` | AllSides | MBFC | Ad Fontes |
| ------ | -------------- | ------------------- | -------- | ---- | --------- |
| AP (`:487-500`) | none: no public RSS, robots.txt disallows `/*.rss` | no | Lean Left, −2.93, medium confidence | Left-Center, −2.1 | Middle, −2.60 |
| Miami Herald (`:331-344`) | none: "No RSS 2026-09-17 — sitemap only" (`:332`), and the row configures no `sitemap` | no | Lean Left, −2.00, low or initial | Left-Center, −3.4 | Skews Left, −8.01 |
| Sun Sentinel (`:365-381`) | news sitemap | yes | Center, low or initial | Least Biased | Middle, −5.87 |
| Tampa Bay Times (`:387-398`) | RSS | yes | Center, low or initial | Left-Center, −3.4 | Middle, −3.28 |
| Orlando Sentinel (`:435-450`) | news sitemap | yes | Center, low or initial | Left-Center, −2.8 | Skews Left, −6.70 |

- `usableOutlets()` needs a non-null lean, a retrieval path, no fail-closed
  flag and no hold (`:598-610`). So signing off all five leans would add
  **zero** sweepable outlets: two have no retrieval path and three are held.
- **The founder has already seen every rating.** On 2026-09-21 the founder
  was shown all three raters' values for all five rows and chose to wait.
  The file records that as a decision, not a backlog (`:154-159`).
- **Two raters' categories map onto the file's scale without a cut point.**
  AllSides (Left, Lean Left, Center, Lean Right, Right) and MBFC's
  categories as the file records them ("Left-Center", "Least Biased") each
  have five steps that map one to one onto `left` / `center-left` /
  `center` / `center-right` / `right`. Ad Fontes is recorded as a number on
  −42 to +42 with its own band names ("Middle", "Skews Left"), so it needs a
  cut point. The file says none of the three "uses this file's five-value
  scale" (`:161-166`). That is true of the labels, but two of the three map
  without a choice of cut. Read one to one, AllSides gives AP `center-left`,
  Miami Herald `center-left`, Sun Sentinel `center`, Tampa Bay Times `center`
  and Orlando Sentinel `center`. MBFC gives `center-left`, `center-left`,
  `center`, `center-left` and `center-left`. So those two agree on three
  outlets and differ on Tampa Bay Times and Orlando Sentinel.
- `unrated` is not allowed for these five, because ratings exist
  (`:168-171`).
- **What a signed lean shows.** An outlet page with a `null` lean shows "Not
  yet reviewed" (`leanDisclosure`, `src/lib/news-outlets.ts:93-110`), and
  `/methodology` explains that label (`methodology/page.tsx:820-823`). A
  signed lean replaces it with the rating. Once a rating or its basis
  renders, the AllSides CC BY-NC 4.0 attribution line is owed
  (`news-sources.ts:56-62`).
- **The hold covers seven domains** (`:256-263`): `miaminewtimes.com`,
  `wfla.com`, `wesh.com`, `sun-sentinel.com`, `tampabay.com`,
  `orlandosentinel.com` and `floridaphoenix.com`. Each one's robots.txt names
  an Anthropic or Claude agent. `flvoicenews.com` is not held, because its
  robots.txt returns 403 and its policy is unknown. The file leaves that
  call to the founder (`:247-251`). It is swept today, and 7 live rows come
  from it (Q9).
- **The approve path refuses a hand-added story from any of the five**
  before it looks for a page source ("on the outlet list, but its lean has
  not been signed off", decision route `:341-345`; runbook `:247-259`).
- **R3's 10-07 run could not fetch `apnews.com`** (S1).
- **One page-level source row already gives Tampa Bay Times the lean
  `unrated`** (Q14, from migration 0040 `:223-226`). No surface prints a
  measure resource's lean (`src/components/features/MeasureResourceRow.tsx:14-18`),
  but it is a second answer in the table for an outlet the file says has no
  lean yet.

### 2.6 Official sources today

- **The approve path has no official step.** It resolves in order: `given`,
  then `outlet`, then `unsigned` (refused), then `page`, then `none`
  (`src/lib/news-enqueue.ts:181-203`; route `:285-363`). An R3 item from a
  Supervisor of Elections page therefore fails closed at approval unless a
  page row already exists for that exact URL (route `:346-355`).
- **A given id is not checked against the URL.** For an `outlet:<domain>`
  id, the outlet row is built from the id alone (`news-enqueue.ts:189-193`).
  For any other id, the route only checks that a `source` row with that id
  exists (route `:327-337`). The `/admin/submit` form sends no `source_id`
  (no match for `source_id` under `src/app/admin` or `src/components/admin`),
  but `/api/admin/ingest` would accept one from a signed-in operator: it
  parses with `ManualNewsPayloadSchema`, which has `source_id`
  (`src/types/admin.ts:68`).
- **Live government page rows spell the same bodies differently** (Q12).
  The Florida Senate is "The Florida Senate" on two measure-resource rows,
  while 0014 writes "Florida Senate" (`0014:83`). The Division of Elections
  is "Florida Division of Elections" on the booklet row, while 0042 and
  three other rows write "Florida Dept. of State, Division of Elections".
  `MeasureResourceRow` prints the publisher. The Florida House rows are on
  `www.flhouse.gov`, not `myfloridahouse.gov`.
- **The six `official_link` rows have no source** (Q1, Q15). A card with no
  source shows "Official resource" (`NewsFeed.tsx:189-195`,
  `HomeNews.tsx:109-115`). The two statewide rows reach `/` and `/news`. The
  four `metro` rows reach `/news?county=` (`src/lib/news-scope.ts:28-36`).
  The Miami-Dade link is `www.miamidade.gov/global/elections/home.page`.
  `src/lib/supervisors.ts` records that miamidade.gov's elections page now
  redirects to `votemiamidade.gov`, checked 2026-10-05 (`:12-14`, `:24-25`);
  this spec did not re-check it.
- **No page shows a `pipeline_event` row** (Q16). Each has a `race_id` and
  no `metro` or county. `/api/news` returns race-scoped rows only for a
  `?zip=` (`src/app/api/news/route.ts:82-95`). `NewsFeed` never sends one
  (`NewsFeed.tsx:82-86`), and `HomeNews` requires `race_id` NULL
  (`HomeNews.tsx:59`). They have no URL and no publisher. They are the
  `refresh-news` cron's own records (`src/app/api/cron/refresh-news/route.ts:68-100`).
- **What a host-wide official fallback would do.** This spec's first draft
  checked `official` after `page` for every `manual_news` item, and the
  retrofit's §3.4 adopts that order (`:581-584`). Under it:
  - **Candidate stories.** An approved `candidate_news` item whose URL is an
    incumbent's release on `flsenate.gov` or `myfloridahouse.gov`, or a
    county commissioner's on `miamidade.gov`, would print "Florida Senate" or
    "Miami-Dade County" with "Official document". A challenger's release has
    no such host, so it cannot get that label.
  - **Government advocacy.** An agency's page arguing for an amendment would
    become `primary_doc`, whereas 0040 typed FDACS's Amendment 2 statement
    as `opinion` (`0040:219-222`).
  - **Given ids.** An `official:` id would inherit the missing host check
    above.
- **The four list changes the retrofit asks for** (retrofit §3.4,
  `:587-592`): path-scope `miamidade.gov` to `miamidade.gov/elections` and
  add `votemiamidade.gov`; path-scope `dos.fl.gov` to `dos.fl.gov/elections`
  and add `constitutionalinitiatives.dos.fl.gov` and
  `dos.elections.myflorida.com`; add `flhouse.gov`; add `flcourts.gov` and
  `uscourts.gov`, because the first draft left CourtListener out and listed
  no court host, so no ruling could be cited. It also asks that the four
  county entries come from `supervisors.ts`, through a new
  `supervisorSite(countyFips)` (`:594-598`).

### 2.7 Topic tagging

- **The pieces exist.**
  - The pure core is `src/lib/news-characterize.ts`: a three-field input
    (headline, dek, URL path), `DEFAULT_THRESHOLD = 0.85` at `:48`, the item
    types at `:65` (`CHARACTERIZED_ITEM_TYPES`, both agent types) and
    provenance at `:192-202`.
  - The Jev adapter is `src/lib/news-characterize-engines.ts`. It is pinned
    to `jev-1.13.0` (`:26`) and refuses to start without `TYPESAFE_API_KEY`
    (`:52-57`).
  - The runner is `scripts/news-characterize.ts`.
- **What the runner does.**
  - It reads up to `--limit` (default 50, `:78`) `candidate_news` and
    `election_news` rows with `issues IS NULL`, newest first (`:125-132`).
  - It writes `issues`, `characterized_by` and `characterized_at` **directly**
    to `news_item` (`:193-200`).
  - When there is nothing to do it exits 1 (`:138-143`).
- **It has never run in production.** No live row is tagged (Q1).
- **The agent worktree is ready.** `/Users/jsloth/Projects/kyv-agent-worktree`
  is checked out detached at `1580328`, with `.env.local` symlinked from the
  main checkout (`scripts/agent-worktree.sh:50-51`). The candidate-leads spec
  records that this `.env.local` holds `TYPESAFE_API_KEY` (§2, `:55-56`).
- **Refreshing that worktree can disturb a running agent.** It runs
  `git checkout --detach` (`agent-worktree.sh:37`). When the lockfile has
  changed it also runs `npm ci` (`:44-48`), which rewrites `node_modules`
  under any agent already running from it. The retrofit's wrapper skips the
  refresh while another agent's run is inside its budget (retrofit `:425`).
- **The only measurement is old.**
  - The characterizer was measured against taxonomy v2 at 0.85: precision
    85%, recall 78%, empty-case correctness 92%, on 116 real articles
    (`news-characterization-eval-2026-09-18.md:27-38`). Agent labels make up
    that gold set (`:9`), apart from the founder's B7 re-labels of
    2026-09-23 (`:456-473`).
  - The taxonomy is now v7 (`TAXONOMY_VERSION`, `src/lib/news-issues.ts:127`).
    The eval report records v3 to v7 as not re-run (`:199-206`, `:316`,
    `:485-491`), and no later section reports a run.
  - Cost was $0.000094 per article at 16 questions (eval `:117-123`), about
    $0.00015 at 25.
  - **Nobody has measured whether Jev returns the same answers when it is
    asked the same thing twice.** The report's "deterministic" note is about
    the scoring script, given fixed answers (`:14-15`).
- **Tags already reach the UI.**
  - `/api/news` selects `issues` (`:100`), filters with `overlaps` for
    `?issue=` (`:116`) and returns `issues ?? []` (`:174`).
  - `/news` shows an Issue select (`src/app/(public)/news/page.tsx:117-149`).
    `NewsFeed` renders chips that link into that filter
    (`NewsFeed.tsx:180-184`).
  - With no tagged rows, every issue filter shows the "No stories here are
    tagged … yet" state (`NewsFeed.tsx:122-143`).
  - Candidate pages also render chips, unlinked
    (`src/components/features/CandidateNews.tsx:31-45`).
  - Gate G4, "do model outputs reach a voter", was never formally closed
    (`2026-09-18-news-characterization-design.md:506`). The display helpers
    shipped on 2026-09-23 anyway (`news-issues.ts:578-581`).
- **A tag on a candidate story reaches a voter only on the candidate page.**
  - All 29 `candidate_news` rows are race-scoped, with no `metro` or county
    (Q1). `/news` never sends `?zip=`, so `newsScopes` never includes them
    there.
  - `HomeNews` is statewide-only and passes no tags.
  - Outlet pages select no `issues` (`news/outlet/[slug]/page.tsx:55-62`).
- **Approved tags would land at different times.** If tag proposals for one
  candidate's stories are approved before the opponent's, one candidate's
  page shows chips and the other's does not yet.

### 2.8 Cadence

- **The sweep runs twice a week.** It is `/api/cron/news-sweep` at
  `0 11 * * 1,4` (`vercel.json`; founder 2026-10-06,
  `src/app/api/cron/news-sweep/route.ts:6-11`), with a 14-day window
  (`:25`). Daily schedules work on this project: `refresh-news` and
  `send-reminders` already run daily (`vercel.json`).
- **The cron has not run yet.** PR #129, which added the route, merged
  2026-10-06 19:49 UTC (merge `cc29710`). Its first scheduled run is
  2026-10-08 11:00 UTC.
- **Both existing batches were hand runs, with an unrecorded window.**
  - The 16:40 UTC batch (Q7) predates the route.
  - The 19:55 batch came 6 minutes after the merge, on a Tuesday, which is
    not a scheduled day. Its 43 election items match "43 of 488 unmatched
    admitted" on "today's sweep" in commit `6ad74ae`'s message.
  - The hand script defaults to 14 days (`scripts/news-sweep.ts:32`), and
    the runbook's hand sweep passes `--days 30` (`news-inlet-runbook.md:215`).
    Nothing records the window either batch used. The founder checklist
    also calls both hand runs (A3, `:83`).
  - So Q8 does not measure what a 14-day window yields. It is consistent with
    shallow feeds: nothing queued was published before Sep 29, and 67 of 90
    items were published Oct 5 or 6. It is not proof.
- **Feed depth, not the window, sets recall.** A feed exposes only its last
  N items. The evidence is the 2026-09-17 verification:
  - 15 of the 24 feeds now usable held less than 3 days of items, and 3 held
    less than 1 day: WUSF 0.7 d, 10 Tampa Bay 0.4 d and WFTV 0.5 d. WKMG sat
    at exactly 1.0 d. CBS Miami's depth was not recorded
    (`news-corpus-verification-2026-09-17.md:26-87`).
  - That report says a weekly sweep "would see only a fraction" and
    recommends daily (`:134-145`).
  - The gaps between runs are 72 hours (Mon to Thu) and 96 hours (Thu to
    Mon). At those gaps, twice weekly fully covers only the 7 feeds deeper
    than 4 days. Daily covers 20 of the 23 measured feeds, WKMG at the edge.
  - Depth was measured once, in September. October's heavier news volume
    can only make feeds shallower.
- **Results are not kept anywhere.** The route returns the sweep and queue
  summary only in its JSON response (`route.ts:70-78`). Nothing logs it or
  stores it, and Vercel does not keep a cron invocation's response body.
- **Review keeps up.** All 90 items were decided by 2026-10-08 00:02 UTC,
  about 31 hours after the first was created, with 53% approved and nothing
  pending (Q6, Q7). A pending item loses nothing by waiting. Stories are
  lost at the sweep, not in review.

### 2.9 The intake's dedupe read

- **The read is unfiltered.** `enqueueIntake` reads every `manual_news`
  review item, of any status, in one unordered and unpaged select
  (`src/lib/news-intake.ts:278-282`). It needs only the items whose URLs
  this sweep found. The `news_item` lookup beside it is already filtered by
  URL in chunks of 200 (`:268-277`). Neither read checks its `error`.
- **The table is approaching the read cap.** Supabase's API caps a response
  at its "Max rows" setting, 1000 by default. This project's value was not
  read for this spec. The table holds 90 items (Q6). Q8 shows about 30
  stories queued per publication day on the two busiest days, so a daily
  sweep could add up to about 800 by Nov 3.
- **Past the cap, already-decided stories can be queued again.** Which rows
  come back is then arbitrary, and a story an operator already decided can
  be queued a second time.
- **Only `manual_news` items count toward this read.** R6's `news_tags`
  items (§3.4) do not, because the read filters on `kind = 'manual_news'`.
  R3's queued items do count.

### 2.10 The other specs written 2026-10-08

**Who owns what.** This follows the retrofit's §3.0 (`:376-391`), which was
written against this spec's first draft:

| Item | Owner | Here |
| ---- | ----- | ---- |
| Applying 0042 and 0014; the Ballotpedia row | this spec | §3.1, D1 |
| The eight R3 rows | this spec | §3.3, D2 |
| Pausing R1 and R3 now | this spec, checklist A1, BC12 | §3.0 |
| Retiring the R1 routine; the cron as R1 | this spec (retirement), retrofit (the cron's `agent_run` row and console label, `:477-493`) | D5 |
| `official-sources.ts`, the approve-path change, given-id checks | this spec | §3.2, D6, D7 |
| R3's queue CLI `election-news.ts` | this spec (PR A); the retrofit's PR B adds `context` and four rules (`:608-649`) | §3.2.3 |
| R3's prompt, the wrapper, R3's watched run | retrofit (`:651-661`, `:1055-1059`) | none |
| R3's cadence | this spec | D5 |
| Sweep cadence and depth record | this spec | §3.5, D9 |
| The tagger R6 | this spec, on the retrofit's wrapper | §3.4 |
| Migration numbers | the ledger PR (BC21, roster D13) | §3.9 |

**Section and decision numbers.** The retrofit cites this spec's first draft
as §3.1 (apply), §3.2 (official sources and R3's queue), §3.4 (R6), §3.5
(cadence), D1 (Ballotpedia), D3 and D4 (leans and the hold), D5 (R1 and R3),
D9 (daily sweep) and D10 (approvals in the freeze). This revision keeps those
numbers for those subjects. `ballot-content-completion` cites D10 for the
news plane being outside the freeze (`:994-997`), which D10 here still
covers.

**Where the documents still differ, and why.**
- *The retrofit's §3.4 order.* It adopts "given, outlet, page row, official,
  refuse" (`:581-584`). This spec drops the official fall-through (D7), for
  the reasons in §2.6. What the retrofit wanted from that order, page rows
  keeping their pages, still holds, because R3's queue uses an existing page
  row (§3.2.3).
- *R3's first prompt.* The retrofit expects one from this spec (`:383`,
  `:610-611`). This spec writes none. R3 stays paused until the retrofit's
  own prompt passes its watched run (D5), so an interim prompt would never
  run unattended. An interim prompt in R5's current style would also embed
  the day's run folder in its commands and so prompt again every week
  (retrofit `:328-332`).
- *R3's future.* Checklist A1 recommends keeping R3 paused through Nov 3
  (`:41`). BC12 pauses it through Nov 3 unless it returns as a queue-only
  prompt (`:1182`). The retrofit re-enables it weekly after its PR B
  (`:1055-1059`). D5 here agrees with the retrofit and with BC12's
  exception, and with the conditions in A1's TO FLIP (`:42`). It differs from
  A1's recommendation.
- *CourtListener.* R3's prompt lists it today (`SKILL.md:29`). The retrofit
  leaves the choice here (`:930-934`). D6 recommends leaving it off.
- *Ballotpedia.* The checklist (B1, `:184`) recommends applying 0042 as
  written, and so does D1. Neither the checklist nor the retrofit moves the
  row into review, so neither says what to do with it there. D1 recommends
  rejecting it.
- *Stale citations of this spec.* The retrofit's §2.10 (`:364-366`),
  `ballot-content-completion` §2.9 (`:449-456`) and roster-completeness §2.1
  and §2.9 (`:74-75`, `:440-441`) describe the first draft: "0048" for
  `news_tags_kind`, the Ballotpedia delete, the host-wide official order. A
  builder should read this revision.

**Files more than one PR touches.**
- `src/lib/news-intake.ts`: this spec's PR B (the dedupe read) and the
  retrofit's PRs B and D (`loadBallotRoster`, `:631-638`).
- The cron route: this spec's PR B (daily, depth line) and the retrofit's
  PR A (its `agent_run` row, `:477-493`).
- `src/lib/supervisors.ts`: this spec's PR A and the retrofit's PR D, each
  adding `supervisorSite` unless the other landed first (`:597-598`).
- `src/lib/election-news.ts` and `scripts/election-news.ts`: created by this
  spec's PR A, extended by the retrofit's PR B (`:908`).
- `src/types/admin.ts`, `effects.ts`, `ReviewItemCard` and `QueueFilters`:
  this spec's PR C and the retrofit's PR D (`:910`).
- `AgentsConsole.tsx`, `monitor.ts` and the agent-runs route: this spec's
  PR C and the retrofit's PR A (`:906`).
- `scripts/agent-run.sh`: each PR adds its own agent's rows (`:413-416`).
- `src/app/(public)/methodology/page.tsx`: this spec's copy PR and
  `ballot-content-completion`'s freeze-copy PR (§3.6.4, `:1023-1027`).

§5 gives the order.

## 3. Design

### 3.0 Step zero: pause R1 and R3

The founder sets `cap-r1-candidate-news` and `cap-r3-election-news` to
disabled, as checklist A1 describes. This needs no code and no other
decision. It comes first, because the old R3 prompt publishes straight to
voters whether or not 0014 is applied (§2.2), and its next run is
2026-10-14. Tool approvals given to other routines may carry over to these
two (checklist A1). R1 is then retired and R3 returns only as a queue (D5).

### 3.1 Apply 0042 as written, then 0014, and verify each on live

0042 is applied as written (D1). That needs no edit to the file and no
`DELETE`, so it goes through the MCP like 0043, 0044, 0046 and 0047.

**Pre-checks, run immediately before 0042 (read-only):**

```sql
-- P1: exactly the eight ids from Q2. Any other id: stop and attribute it first.
SELECT id FROM news_item
 WHERE item_type IN ('candidate_news','election_news') AND source_id IS NULL ORDER BY id;
-- P2: 0 rows (0014 not applied)
SELECT conname FROM pg_constraint WHERE conname = 'news_item_agent_source_check';
-- P3: 0 rows. The runbook's query over the eight url_norms (news-inlet-runbook.md:168-178)
-- P4: 0 rows
SELECT version, name FROM supabase_migrations.schema_migrations
 WHERE name ILIKE '%news_fairness%' OR name ILIKE '%news_source_backfill%';
-- P5: the baseline for B3. Keep the output.
SELECT s.type, s.lean_tag, count(*) FROM news_item n JOIN source s USING (source_id)
 WHERE n.item_type = 'election_news' GROUP BY 1,2 ORDER BY 1,2;
```

- **If P3 returns rows,** 0042 still works, because it resolves by
  `url_norm`. 0014's four UPDATEs set literal ids, though, so check that each
  returned `source_id` is the one 0014 names (runbook `:180-182`).
- **Approve no news story between P5 and B3.** The sweep only queues, and
  queueing does not change `news_item`. An approval does.

**Apply 0042** with MCP `apply_migration`, name `0042_news_source_backfill`.
The file is one transaction, and its `DO` block raises if any of its four
rows is still sourceless.

**Post-checks after 0042 (read-only):**

```sql
-- A1: exactly 0014's four remain: 126725c6…, 7d95cfb2…, 9b4a9bf0…, bbc7a4c8…
SELECT id FROM news_item
 WHERE item_type IN ('candidate_news','election_news') AND source_id IS NULL ORDER BY id;
-- A2: one row, source_id src_ballotpedia_news_amendments_2026
SELECT id, source_id FROM news_item WHERE id = 'ce038b86-a7a8-4c04-84b1-624f50917682';
-- A3: four rows: three primary_doc / N/A, and the Ballotpedia row factual_reporting / unrated
SELECT source_id, publisher, type, lean_tag FROM source
 WHERE source_id LIKE 'src_gov_%' OR source_id LIKE 'src_ballotpedia_%' ORDER BY 1;
```

**Apply 0014** with MCP `apply_migration`, name `0014_news_fairness`. It
contains no `DELETE`. It is one transaction: four source INSERTs, four
UPDATEs, then the guarded `ADD CONSTRAINT`.

**Post-checks after 0014 (read-only):**

```sql
-- B1: 0
SELECT count(*) FROM news_item
 WHERE item_type IN ('candidate_news','election_news') AND source_id IS NULL;
-- B2: one row, the CHECK text at 0014:107, convalidated = true
SELECT pg_get_constraintdef(oid), convalidated FROM pg_constraint
 WHERE conname = 'news_item_agent_source_check';
-- B3: P5's rows, plus 7 in primary_doc / N/A and 1 in factual_reporting / unrated,
--     and no other change
SELECT s.type, s.lean_tag, count(*) FROM news_item n JOIN source s USING (source_id)
 WHERE n.item_type = 'election_news' GROUP BY 1,2 ORDER BY 1,2;
```

**Optional write probe, not read-only.** B2 already shows the constraint
exists and is validated. To watch it refuse a row as well, run this in the
**Supabase SQL editor**. It is a write inside a block that never commits.
Through a read-only connection it fails with SQLSTATE 25006
(`read_only_sql_transaction`), which proves nothing.

```sql
DO $$ BEGIN
  INSERT INTO news_item (item_type, title, url)
    VALUES ('election_news', 'probe 0014', 'https://example.invalid/probe-0014');
  RAISE EXCEPTION 'probe: a sourceless election_news row was accepted';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'probe ok: %', SQLERRM;
END $$;
```

If the probe row is accepted, the `RAISE EXCEPTION` (SQLSTATE P0001, not a
`check_violation`) is not caught, so the whole block rolls back. Nothing is
left behind either way.

**Then:**
- Load `/news` (GET). The government cards now show their publisher and
  "Official document".
- Run `node scripts/verify-news-neutrality.ts` in live mode with the arm64
  `node`. It reported `missing source_id` for two of these rows (TC-6,
  `:340-343`), and should now pass on sources.

**Rollback.**
- `ALTER TABLE news_item DROP CONSTRAINT IF EXISTS news_item_agent_source_check;`
  undoes 0014's CHECK.
- The attributions can stay, because each names the page's real publisher.
- Undoing them is runbook `:197-207`. Run its deletes in the SQL editor.

### 3.2 Official sources and R3's queue (PR A)

PR A ships the official list, the approve-path change with every given-id
check, and the queue CLI R3 will write through. It touches no table and
needs no migration. The retrofit's PR B (R3 on the wrapper) needs it first
(retrofit `:1053-1059`).

#### 3.2.1 The list: `src/lib/official-sources.ts` (D6)

`OFFICIAL_SOURCES` holds the government bodies whose own pages count as
primary documents for an election notice: the counterpart of `OUTLETS`. Each
entry is `{ domain, publisher, countyFips }` (`countyFips` null for
statewide). The list is an editorial decision, so it changes only by PR.

**Matching** reuses `urlBelongsTo` (`src/lib/news-sources.ts:561-582`), whose
parameter type widens from `Outlet` to `{ domain: string }` with no change in
behaviour: exact host or a label-boundary subdomain (`hostMatches`,
`:549-551`), plus a path prefix for path-scoped entries.
`officialForUrl(url)` returns the matching entry or null. So outlets and
official sources cannot disagree about what a host is.

**Recommended list (D6)**, with the retrofit's four changes:

| `domain` | `publisher` | County | Why |
| -------- | ----------- | ------ | --- |
| `dos.fl.gov/elections` | Florida Dept. of State, Division of Elections | statewide | path-scoped so the rest of the Department is not labelled Elections (retrofit change 2); 0042's string |
| `dos.elections.myflorida.com` | Florida Dept. of State, Division of Elections | statewide | the Division's candidate and supervisor directories (change 2) |
| `constitutionalinitiatives.dos.fl.gov` | Florida Dept. of State, Division of Elections | statewide | the amendment database; three live rows use this string (Q12; change 2) |
| `files.floridados.gov` | Florida Dept. of State | statewide | the Department's file server, which serves the amendment booklet (Q12) |
| `registertovoteflorida.gov` | Florida Dept. of State | statewide | the registration portal; one `official_link` (Q15) |
| `flsenate.gov` | Florida Senate | statewide | election-law changes such as HB 991; 0014's string |
| `myfloridahouse.gov` | Florida House of Representatives | statewide | |
| `flhouse.gov` | Florida House of Representatives | statewide | both live House rows use `www.flhouse.gov` (Q12; change 3) |
| `leg.state.fl.us` | Florida Legislature | statewide | statutes |
| `flcourts.gov` | Florida State Courts | statewide | court rulings on covered races (change 4) |
| `uscourts.gov` | U.S. Courts | statewide | federal rulings (change 4) |
| `votemiamidade.gov` | Miami-Dade County Supervisor of Elections | 12086 | `supervisorSite("12086")` |
| `miamidade.gov/elections` | Miami-Dade County Supervisor of Elections | 12086 | the Division's directory address (change 1); path-scoped so the County Commission's pages are not official sources scoped to 12086 |
| `browardvotes.gov` | Broward County Supervisor of Elections | 12011 | `supervisorSite`; 0014's string |
| `votehillsborough.gov` | Hillsborough County Supervisor of Elections | 12057 | `supervisorSite`; 0014's string |
| `voteorangefl.gov` | Orange County Supervisor of Elections | 12095 | `supervisorSite` |
| `ocfelections.gov` | Orange County Supervisor of Elections | 12095 | the older host that now redirects (`supervisors.ts:13-14`); one `official_link` (Q15) |

- **The four county Supervisor hosts come from `supervisors.ts`.** PR A adds
  `supervisorSite(countyFips)`, which returns `SUPERVISOR_SITES[fips]`
  (`supervisors.ts:24-29`), unless the retrofit's PR D added it first. The
  list takes each host with `www.` removed, plus the two older hosts.
- **One publisher string per body**: the one 0014 and 0042 write, where they
  wrote one ("Florida Senate", "Florida Dept. of State, Division of
  Elections", "Broward County Supervisor of Elections", "Hillsborough County
  Supervisor of Elections"). The measure-resource rows that spell the Senate
  and the Division differently (Q12) are out of scope (§7). "Miami-Dade
  County", 0014's string, is the county government's release page, which
  keeps its own page row; the Supervisor is a different office.
- **Not on the list** (D6): `courtlistener.com` and `congress.gov`, from R3's
  current Tier 1; the Governor's site; and R3's whole Tier 2 (§2.2).
  `verify-official-sources.ts` asserts that no official entry matches any
  `OUTLETS` entry and the reverse, so no URL can be both a swept story and an
  official notice. That keeps AP, an outlet with no signed-off lean, off it.

**Row builder.** `officialSourceRow(entry)` returns `{ source_id:
'official:<domain>', url: 'https://<domain>', url_norm: <domain>, publisher,
type: 'primary_doc', lean_tag: 'N/A' }`, the same shape `outletSourceRow`
builds (`news-enqueue.ts:135-145`): one row per listed body. Q13 shows no
existing row holds any of these `url_norm` values. A card shows the
publisher and the `primary_doc` word "Official document" (`news-labels.ts:64`,
`:125-135`), and never a lean.

#### 3.2.2 The approve path (D7)

`planSourceAttribution` takes the row (`url`, `source_id`, `item_type`,
`candidate_id`, `race_id`) and resolves in this order: `given` (checked),
`outlet`, `unsigned` (refused), `page`, `none`. **There is no official
fall-through.** An official source is attributed only from a given id.

Checks on a given id. Each refusal leaves the item pending with the reason
in `apply_error`, through the route's existing `failClosed`:

- **`outlet:<domain>`** is refused unless `outletForUrl(url)` is that
  outlet: "This story names outlet `<domain>`, but its URL belongs to
  `<other outlet, or no listed outlet>`."
- **`official:<domain>`** is refused unless all three hold:
  1. the item is `election_news`;
  2. it has no `candidate_id` and no `race_id`;
  3. `officialForUrl(url)` is the entry with that `domain`.

  The reason names the first that fails. The route then writes the row with
  `ensureListedRow(row)`: the existing `ensureOutletRow` generalised, an
  upsert on `url_norm` with `ignoreDuplicates`, read back by `url_norm`, and
  for an official row a refusal unless the row read back is `primary_doc` /
  `N/A` ("a source row for `<domain>` exists with another type or lean; fix
  the row or the list").
- **Any other given id** (a `src_*` page row) is refused unless that
  `source` row's `url_norm` equals `urlNorm(url)`. Such an id means "this
  page's row", so a mismatch is a mis-attribution.

What does not change:
- **The sweep.** It sets `outlet:<domain>` from `outletFor(article.url)`
  (`news-enqueue.ts:215-252`), including path-scoped outlets such as
  `cbsnews.com/miami`, so every swept payload passes.
- **An operator's hand-add of a government page** carries no given id. It
  resolves to `page`, as today, so it needs a page `source` row with the
  page's true type. That is how 0040 typed FDACS's statement `opinion`.
- **The eight moved payloads** (§3.3) pass: each `src_*` row's `url_norm`
  equals its page's (§2.1).
- **`news-inlet-runbook.md` step 4** (`:235-245`) is updated in the same PR
  to describe the checks and `official:` ids.

#### 3.2.3 R3's queue CLI (PR A)

`src/lib/election-news.ts` (pure rules) and `scripts/election-news.ts
queue [--dry-run]` (I/O). It reads keys from `.env.local` through
`scripts/env-local.ts`, as `scripts/candidate-leads.ts:17,24` does.

**Input** on stdin: a JSON array of at most 25 items, each exactly
`{ title, summary, url, published_at, scope }`. `scope` is
`{ "county_fips": "<5 digits>" }` or `{ "statewide": true }`. There is no
`metro` form.

**Refused batch** (exit 1, nothing written, the first problem named with its
index, as `mentionProblem` does, `src/lib/candidate-leads.ts:42`):
- not an array, more than 25 items, an unknown or missing field, a
  non-string, an unparseable date;
- a URL that is not http(s), matches an outlet, or matches no official
  entry;
- a `county_fips` outside `COVERED_FIPS` (`candidate-leads.ts:17`), or a
  county scope on a county entry whose county differs.

The retrofit's PR B tightens scope under its D2 (scope from the publisher,
`:623-627`, `:949-956`).

**Per item:**
1. **Source.** If a `source` row has `url_norm = urlNorm(url)`, use its id
   when it is `primary_doc` / `N/A`, and **drop** the item otherwise ("this
   page is recorded as `<type>` / `<lean>`, not an official notice"). Else
   use `official:<domain>`. So a page row already in `source` keeps backing
   its page, as the retrofit asks (`:582-584`).
2. **Skip** (not an error) a URL already in `news_item` under any candidate
   or none, in any `manual_news` item of any status, or earlier in the same
   batch. Both reads are filtered by URL in chunks, as §3.7 makes the
   intake's.
3. **Build** `{ item_type: 'election_news', title, summary, url,
   published_at, county_fips | statewide, source_id }` and parse it with
   `ManualNewsPayloadSchema` (`src/types/admin.ts:37-101`). One failure
   refuses the batch.

**Writes.** `--dry-run` writes nothing. Otherwise the CLI inserts the rows
as `review_item` (`kind 'manual_news'`, `source 'agent:R3'`, `status
'pending'`) and nothing else.

**Output.** stdout is one JSON object, `{ rows, skipped, dropped }`, with
each skip and drop carrying its index and reason. stderr is one line:
`queued N, skipped S, dropped D` (`would queue` under `--dry-run`). Exit 0
for a complete run, including 0 queued; 1 for a refused batch or a failed
insert; 2 for a configuration error.

**Not in PR A.** The `context` step, scope from the publisher, the
candidate-name drop over the 106 ballot candidates, the
case-for-or-against drop, the date window and the lint drop are the
retrofit's PR B (`:618-646`), with R3's prompt (`:651-661`). R3 runs only
after that PR's watched run (D5). Until then, nothing calls this CLI
unattended, and every item it queues still waits for a person in /admin.

#### 3.2.4 The six `official_link` rows (D8)

Migration `official_link_sources` (numbered as in §3.9), after PR A deploys
and after 0014. It contains no `DELETE`, so it goes through the MCP. One
transaction:

1. **Insert** the official rows for the hosts of five links, with exactly
   the values `officialSourceRow` builds, `ON CONFLICT (url_norm) DO
   NOTHING`: `ocfelections.gov`, `browardvotes.gov`, `votehillsborough.gov`,
   `registertovoteflorida.gov`, `dos.fl.gov/elections`. Each of the five
   URLs resolves to that entry (`www.ocfelections.gov` to `ocfelections.gov`,
   `dos.fl.gov/elections/` to `dos.fl.gov/elections`, and so on).
2. **The Miami-Dade link** is `/global/elections/home.page`, outside the
   path-scoped `miamidade.gov/elections`. It gets a page row instead:
   `src_gov_miamidade_elections_home`, `url_norm`
   `www.miamidade.gov/global/elections/home.page`, "Miami-Dade County
   Supervisor of Elections", `primary_doc` / `N/A`.
3. **Attribute** each link `WHERE item_type = 'official_link' AND url =
   '<its URL>' AND source_id IS NULL`, reading the `source_id` back by
   `url_norm`, as 0042 does (`0042:53-58`). It matches by URL, as 0015 does
   (`0015_general_election_copy.sql:27-30`), not by id: the six rows are
   0004's seed (`0004_official_links.sql:5-29`), whose ids are generated, so
   only the URL is the same on live and on a fresh database.
4. **Assert** that no `official_link` row is left without a source.
5. **Rebuild the CHECK.** Raise unless `pg_get_constraintdef` of
   `news_item_agent_source_check` equals 0014's text (`0014:107`). Then drop
   it and add `CHECK (item_type NOT IN ('candidate_news','election_news','official_link') OR source_id IS NOT NULL)`.

No app code writes `official_link` rows; only 0004 and 0015 do (no match
for `official_link` in an insert under `src/` or `scripts/`). The harness
check that an `official_link` row with no source still inserts
(`verify-migrations.mjs:520-529`) is replaced in the same PR by one that
expects the refusal.

The six cards change from "Official resource" to the publisher and "Official
document". Read back after applying: 0 sourceless `official_link` rows, and
the new CHECK text. Rollback: restore 0014's CHECK text and set the six
`source_id`s to NULL. The source rows can stay.

#### 3.2.5 The 36 `pipeline_event` rows (D11)

They stay exempt. They have no URL and no publisher, the site wrote them
about itself, and no page shows them (§2.6).

### 3.3 The eight agent rows go through /admin (D2)

Applying a migration is not an approval in /admin, and no person approved
these eight rows (§2.2). Under D2 they leave the site and wait in the review
queue, attributed, until the founder decides each one.

**Migration `news_agent_rows_to_review`** (numbered as in §3.9). It applies
after 0014, in the **SQL editor**, because the MCP connector times out on
`DELETE`. 0045 had to be applied by hand for the same reason
(`README.md:61`). It is one transaction:

```sql
-- Refuse unless 0042 and 0014 have attributed every targeted row.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM news_item WHERE id IN (<the eight ids>) AND source_id IS NULL) THEN
    RAISE EXCEPTION 'news_agent_rows_to_review: apply 0042 and 0014 first';
  END IF;
END $$;

INSERT INTO review_item (kind, source, status, payload)
SELECT 'manual_news', 'agent:R3', 'pending',
       jsonb_strip_nulls(jsonb_build_object(
         'item_type',            n.item_type,
         'title',                n.title,
         'summary',              n.summary,
         'url',                  n.url,
         'metro',                n.metro,
         'county_fips',          n.county_fips,
         'statewide',            CASE WHEN n.metro IS NULL AND n.county_fips IS NULL THEN true END,
         'published_at',         to_char(n.published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'source_id',            n.source_id,
         'moved_from_news_item', n.id::text))
  FROM news_item n
 WHERE n.id IN (<the eight ids>)
   AND NOT EXISTS (SELECT 1 FROM review_item r
                    WHERE r.kind = 'manual_news' AND r.source = 'agent:R3'
                      AND r.payload->>'moved_from_news_item' = n.id::text);

DELETE FROM news_item n
 WHERE n.id IN (<the eight ids>)
   AND EXISTS (SELECT 1 FROM review_item r
                WHERE r.kind = 'manual_news' AND r.source = 'agent:R3'
                  AND r.payload->>'moved_from_news_item' = n.id::text);

-- Assert: none of the eight ids remains in news_item, and one pending
-- agent:R3 item exists for each id that was there.
```

- **Each payload parses.** `ManualNewsPayloadSchema`
  (`src/types/admin.ts:37-101`) accepts it: titles are at most 86
  characters against a cap of 240, summaries at most 473 against 2000, and
  every row has a scope (`metro`, or `statewide: true` for the three with
  none; Q2). zod drops the extra `moved_from_news_item` key when it parses,
  and the key stays in the stored payload as the audit link.
- **Approval re-inserts the row.** The route re-runs the neutrality lint,
  resolves the `given` source (the row exists, and its `url_norm` equals the
  page's, §2.1 and §3.2.2), and inserts a new `news_item` row with that
  source. A rejected item never returns, because the intake and R3's queue
  both skip any URL already in a `manual_news` item of any status
  (`news-intake.ts:252-290`; §3.2.3).
- **It is idempotent.** Re-run, the INSERT finds no rows and the DELETE has
  nothing to delete.
- **Voters lose these cards until approval.** Six of the eight describe the
  primary or older events (Q2). The founder decides them in /admin.
  Checklist A2 opens /admin in production.
- **Under D1's TO FLIP** (0042's delete variant), the Ballotpedia row no
  longer exists, so seven items move.

**Post-checks (read-only):**

```sql
-- M1: 0
SELECT count(*) FROM news_item WHERE id IN (<the eight ids>);
-- M2: eight rows (seven under D1's TO FLIP), all pending, each with the src_* id from A3 or 0014
SELECT payload->>'moved_from_news_item', payload->>'source_id', status
  FROM review_item WHERE source = 'agent:R3' ORDER BY 1;
-- M3: 0 (B1 still holds)
SELECT count(*) FROM news_item
 WHERE item_type IN ('candidate_news','election_news') AND source_id IS NULL;
```

**Rollback.** To restore all eight without changing them, approve them in
/admin.

### 3.4 Topic tagging as an agent job (R6), approved in /admin (D12, D13, D14)

**Why an agent in the agent worktree, and not the production cron:**
- **The key and the code are there.** The worktree holds `TYPESAFE_API_KEY`
  and the SDK (§2.7). Production holds a `JEV` value that nothing reads
  (runbook `:40-46`).
- **The production route stays as it is.** Wiring Jev in would add a model
  key and a vendor SDK to the public app's runtime three weeks before the
  election.
- **A failure costs little.** An untagged card renders normally. A scheduled
  task runs only while the desktop app is open, which is acceptable for tags.

**Why tags need approval.** Tags are model output that voters see, as chips
and through the `/news` issue filter (§2.7). So the tagger proposes, and a
person approves in /admin.

**Scope: `election_news` only (D14).** Candidate pages stop rendering chips:
`CandidateNews.tsx` no longer passes `issues`. Two reasons:
- **Unequal labels.** Proposals approved at different times would show
  chips on one candidate's page and not yet on the opponent's (§2.7).
- **What a chip describes.** A chip on a candidate's page describes what the
  press wrote, not where the candidate stands. It sits a few inches from the
  candidate's brief, which does show positions.

Without those chips, a tag on a candidate story reaches no voter (§2.7). So
R6 does not ask about candidate stories, and the operator never reviews tags
no voter will see. On `/news`, a chip labels one story in a mixed feed.

**Migration `news_tags_kind`** (numbered as in §3.9; applied with MCP, no
`DELETE`):
1. **Guard on the kinds.** Read the quoted values out of
   `pg_get_constraintdef` for `review_item_kind_check`
   (`regexp_matches(def, '''([^'']+)''', 'g')`). Raise, naming what was
   found, unless the set equals Q11's seven kinds.
2. **Rebuild the kind CHECK** with those seven kinds plus `news_tags`.
3. **Add the dedupe index.** A partial unique index
   `uq_review_item_news_tags_key` on `payload->>'dedupe_key'` where
   `kind = 'news_tags'`, covering every status.
4. **Guard on the agents.** The same set check on `agent_run_agent_check`
   against `{R1, R2, R3, R4, dispatcher, R5}`, which is Q17 plus the
   retrofit's `agent_run_r5` (`:473-475`). Then rebuild it with `R6` added.
   This makes the migration refuse to run before `agent_run_r5`.
5. **The selection function.** `news_tags_to_ask(p_characterized_by text,
   p_item_types text[], p_limit int, p_offset int)` returns `id`, `title`,
   `summary`, `url`, `item_type` for the rows that meet all of these:
   - `item_type = ANY (p_item_types)`;
   - `issues IS NULL` and `url IS NOT NULL`;
   - `NOT EXISTS` a `news_tags` review item whose `dedupe_key` is
     `id || '|' || p_characterized_by`.

   It orders by `published_at DESC, id` and applies `LIMIT p_limit OFFSET
   p_offset`. The exclusion runs before the `LIMIT`, so rows already asked
   never fill the window. The function is `LANGUAGE sql STABLE SECURITY
   INVOKER`. `EXECUTE` is revoked from `PUBLIC`, `anon` and `authenticated`
   and granted to `service_role`, the lesson of 0020.

**Payload `NewsTagsPayloadSchema`** (`src/types/admin.ts`):
- `news_item_id` (uuid), `item_type`, `title` (to 240), `url`;
- `issues`: **0** to 25 ids. An empty list means nothing cleared the
  threshold;
- `characterized_by`, matching `^jev:[^/]+/tax-\d+/q-[0-9a-f]{8}$`;
- `characterized_at`, `threshold`;
- `dedupe_key = <news_item_id>|<characterized_by>`.

**Runner (`scripts/news-characterize.ts`):**
1. **Modes.**
   - `--dry-run` is unchanged.
   - `--queue` inserts pending `news_tags` items with `source: 'agent:R6'`.
   - There is no direct-write mode. The copy PR removes it ahead of this PR
     (§3.8), so no agent can write voter-facing tags.
2. **Selection.**
   - The runner calls `news_tags_to_ask` with the current provenance and
     `TAGGED_ITEM_TYPES`, a new constant beside `CHARACTERIZED_ITEM_TYPES`
     (`news-characterize.ts:65`), which is `["election_news"]` under D14.
     `CHARACTERIZED_ITEM_TYPES` keeps both types, because
     `verify-news-characterize.ts:172-182` pins it to the agent item types.
   - It pages by `p_offset` until it holds `--limit` askable rows or a page
     comes back short.
   - `--limit` defaults to 200, with a maximum of 500.
3. **A held outlet's text never reaches a model.** A row whose URL belongs
   to an `AI_POLICY_HOLD` outlet is skipped and counted, and paging
   continues past it. Such a row can exist only as an operator hand-add
   (none today, Q9).
4. **Every asked row gets exactly one proposal per provenance,** including
   an empty one. Nobody has measured whether Jev answers the same way twice
   (§2.7). So a row is never asked again under the same provenance, and
   repeated asking cannot raise the chance of a false tag. A rejected
   proposal stays decided, as R5's leads do. A taxonomy bump changes the
   provenance, which allows one fresh proposal.
5. **Failures are not proposals.** A row whose call fails is counted, gets
   no item, and is asked again next run.
6. **Output.**
   - stdout: one JSON line per queued item,
     `{ news_item_id, title, issues, dedupe_key }`.
   - stderr: one summary line: `asked N, proposed P (T with tags, E empty),
     failed F, skipped held H, provenance <by>`.
   - Exit 0 for a complete run, including `asked 0`. Exit 1 if any call
     failed. Exit 2 for a configuration error.

**Threshold and provenance (D13).**
- The threshold is `DEFAULT_THRESHOLD = 0.85`. The threshold is not part of
  the provenance hash (`news-characterize.ts:192-202`), so `--threshold`
  changes it without changing the provenance.
- Provenance is written as computed, today
  `jev:jev-1.13.0/tax-7/q-13cdde05`. It travels in the payload and is stored
  in `characterized_by` on approval.
- The operator can only **remove** a proposed tag, never add one. So every
  stored tag is one Jev proposed, and `characterized_by` stays true.
- `characterized_at` is the proposal time. The approval time is
  `review_item.decided_at`.
- The runbook's rollback still works:
  `UPDATE news_item SET issues = NULL, characterized_by = NULL, characterized_at = NULL WHERE characterized_by = '<provenance>'`
  (runbook `:295-296`).

**Approval.**
- **Request body.** `DecisionBodySchema` (`src/types/admin.ts:217`) gains
  `drop_issues` (an optional string array, at most 25). It is used only for
  `news_tags`. An id not in the proposal is a 400.
- **Planned effect.** `planEffect` maps `news_tags` to a new
  `update_news_tags` plan. That plan writes exactly `issues` (the proposed
  tags minus the dropped ones), `characterized_by` and `characterized_at`.
- **Route checks.** The route refuses a proposal whose taxonomy version is
  not the current `TAXONOMY_VERSION`. The operator rejects it, and the next
  run proposes under the new provenance. The route also refuses any id
  outside `ASKABLE_IDS` (`news-issues.ts:561`).
- **The update.** It runs guarded by `.eq("id", …).is("issues", null)`. If no
  row changes, the row is gone or already tagged, so the item fails closed
  and stays pending with `apply_error` set.
- **Empty results.** Approving an empty proposal, or one with every chip
  removed, writes `'{}'` ("a person saw that no tag applies"). The card says
  so.
- **Audit.** `admin_action.detail` records `issues_proposed`,
  `issues_written` and `characterized_by`.

**Console and run record.**
- `ReviewItemCard` gets a `news_tags` branch. It shows the title as a link,
  the item type, and the chips with a remove toggle. An empty proposal shows
  "No issue cleared the threshold (0.85). Approving records that no tag
  applies; nothing changes on the site." The threshold and provenance appear
  in small text. Toggling a chip sets `drop_issues` in `DecisionControls`.
- `REVIEW_KINDS` (`src/types/admin.ts:188-196`), the card's kind-style and
  label maps, and `QueueFilters` gain `news_tags`.
- R6 joins the agent lists the retrofit's PR A widens to R5:
  `AgentName` and `AGENTS` (`src/lib/admin/monitor.ts:27-34`), the runs
  route's enum (`src/app/api/admin/agents/runs/route.ts:13`), and
  `AgentsConsole.tsx`'s labels (`:43-48`) as "News tags".
- R6's wall clock (20 minutes) goes into the retrofit's
  `src/lib/agent-budget.ts` (`:469-471`), and `cap-r6-news-tags` joins the
  watchdog's task list (`:514-515`).

**Where tags reach voters.** Through `/api/news`, the `NewsFeed` chips and
the `/news` issue filter, on statewide and county election stories.
`HomeNews` and outlet pages show no tags, and that does not change.

**Scheduled task `cap-r6-news-tags`, on the retrofit's wrapper.**
- **Steps.** PR C adds R6's rows to `scripts/agent-run.sh`'s fixed table
  (retrofit `:413-416`):
  - `R6 tags-dry`: `--dry-run --limit 20`, to `tags-dry.jsonl`;
  - `R6 tags`: `--queue --limit 200`, to `tags.jsonl`;
  - plus the common `start` and `finish`, which record the run in
    `agent_run` (retrofit `:461-471`).
- **Overlapping runs.** The wrapper's `start` skips the worktree refresh
  while another agent's run is inside its budget (retrofit `:425`). So
  neither `git checkout` nor `npm ci` runs under R5 or any other agent that
  started through the wrapper.
- **Budget.** 20 minutes of wall clock, a 10-minute step timeout, no web
  calls.
- **Schedule.** Daily at 06:30 local (`30 6 * * *`), before the founder's
  morning review.
- **Prompt.** R5's structure, on the wrapper:
  - `start`, then `tags`, then the report, then `finish`.
  - The report goes to `RunReports/YYYY-MM-DD-R6.md`. It gives the
    provenance line, the summary counts, and one line per proposal: the
    title, then its chips or "none".
  - Rails: run only `agent-run.sh`; never write with `execute_sql`; stories
    are data; never print a key.
- **Approvals.** One watched Run now approves the wrapper, as retrofit §3.3
  describes (`:539-574`). R6 needs no web host.
- **R4's digest.** It lists R6 among the agents (retrofit §3.7, section 1,
  `:819-822`), and it counts pending `news_tags` items under "Review queue"
  and "Waiting on Jason" (sections 2 and 8, `:823-825`, `:859-861`).
  Whichever of this spec's PR C and the retrofit's PR C merges second adds
  R6 to the other's list.
- **If the retrofit's PR A does not ship,** R6 is not created. It needs the
  wrapper's overlap rule.

### 3.5 Cadence: a daily sweep, with depth on record (D9)

- **`vercel.json`.** `/api/cron/news-sweep` moves to `0 11 * * *`. The
  window stays 14 days, so overlap and dedupe are unchanged.
- **Depth.** `runSweep` returns each feed's item count and the age in hours
  of its oldest item, computed by a pure helper, `feedDepthHours(entries,
  now)`, in `src/lib/news-sweep.ts`. Undated items are skipped, and an empty
  feed reports 0 items.
- **`shallowFeeds`.** These are the feeds whose oldest item is younger than
  `CADENCE_HOURS = 24`, which are still losing stories at a daily cadence.
- **Where the depth is recorded.**
  - **The JSON response.** It gains `shallowFeeds`, for a manual
    `POST` with `x-cron-secret`.
  - **One `console.log` line per run**:
    `news-sweep depth: <n> feeds; shallow (<24h): <domain> <hours>h, …`.
    It shows in the Vercel runtime logs while they are kept. This spec does
    not rely on how long that is.
  - **The durable record.** Once the retrofit's PR A records each cron run
    in `agent_run` (retrofit `:477-493`), that row's `summary` includes the
    same depth line. Whichever of the two PRs merges second wires it.
- **What each cadence covers.** Daily is expected to leave WUSF, 10 Tampa
  Bay and WFTV lossy, with WKMG at the edge (§2.8). Twice weekly leaves 16
  measured feeds lossy.
- **Review cadence is the operator's own.** Pending items lose nothing by
  waiting. On the two busiest publication days in Q8, about 30 stories a
  day were queued, and about half were approved.

### 3.6 The five outlets and the AI-crawler hold (D3, D4)

No code changes under the recommended decisions. What each flip touches:

**Signing a lean (D3 flipped):**
- **Code.** Add an explicit founder-signed map to `news-sources.ts`, beside
  `UNRATED_DESIGNATED`. `o()` reads it the way it reads that set, so a new
  row still defaults to `null`. Each signed row's `leanBasis` names the rater
  that governs, why it was chosen, and the date of the sign-off.
  `scripts/verify-news-sweep.ts` allows exactly the signed domains, and it
  still forbids `unrated` for them.
- **What a voter sees.** The outlet page changes from "Not yet reviewed" to
  the rating (§2.5). If AllSides governs, the same PR adds the AllSides
  attribution line to the outlet page (`news-sources.ts:56-62`).
- **Hand-adds.** A hand-added story from that outlet stops being refused.
- **Sweepable outlets.** None is added (§2.5).
- **The Tampa Bay Times measure-resource row.** If that outlet is signed, a
  one-line migration updates `src_tampabay_times_am2_column` (Q14), so the
  table holds one answer. That row is referenced by `measure_resource`, and
  the freeze guard refuses an UPDATE to it from 2026-10-18 04:00 UTC to
  2026-11-04 05:00 UTC (ballot-content-completion `:894-895`, `:929-931`).
  So this lands before 10-18 or after 11-04.

**Lifting the hold (D4 flipped):** remove the domain from `AI_POLICY_HOLD`
by PR. For Tampa Bay Times and both Sentinels, that does nothing until D3
also signs their lean.

**Unaffected by either:**
- R6 never sends a held outlet's text to a model (§3.4).
- R5 reads only swept stories, and `runSweep` reads only `usableOutlets()`,
  so R5 never sees held outlets either.
- R3 never cites an outlet: the official list and `OUTLETS` cannot overlap
  (§3.2.1).

### 3.7 The intake's dedupe read (PR B)

`enqueueIntake` reads `review_item` with
`.eq("kind", "manual_news").in("payload->>url", chunk)`, in the same
200-URL chunks as the `news_item` lookup beside it (`news-intake.ts:268-277`).
Each response is bounded by the chunk, not by the size of the table. Both
reads now check `error` and throw, so the cron answers 502 instead of
queueing on a partial read. The skip rules are unchanged: any status counts,
and election stories key on the URL alone (`:252-290`). R3's queue CLI uses
the same chunked reads (§3.2.3). Live check: the first daily run after PR B
deploys reports `skipped` above 0, because its 14-day window re-reads
stories the previous run queued.

### 3.8 What voters are told, and the docs (D15)

**`/methodology`** (`src/app/(public)/methodology/page.tsx:825-834`). The
paragraph today says a stored story "has to come from an outlet on our list,
name a candidate on the ballot, and be approved by a person". That is not
true of election stories, which name no candidate, nor of the eight R3
rows. It also says nothing about approving tags. It becomes:

> Some stories carry tags for the issues they cover, from one fixed list of
> {CATEGORIES.length} categories: {ISSUE_CATEGORY_LIST}. A model suggests
> tags only after a story is stored, and a person approves them before they
> appear. The person can remove a suggested tag but never add one, and a
> story with no tag still appears, just without an issue label. Whether a
> story is stored is settled before any model sees it: a candidate story has
> to come from an outlet on our list and name a candidate on the ballot, and
> every story, election notices included, is approved by a person before it
> appears.

That text is true whichever way D1 to D8 go. It is true once:
- §3.3 has moved the eight rows into review;
- the runner has no direct-write mode, which this same **copy PR** removes
  (leaving `--dry-run` only until PR C adds `--queue`).

So the copy PR merges after §3.3 is applied, and **before** the
`ballot-content-completion` freeze-copy PR, which writes the freeze manifest
"after every other frozen-file change" and merges by Sat 10-17 22:00
(`:999-1003`, `:1254-1269`). That PR also edits this page, in a different
paragraph (§3.6.4, `:1023-1027`). If the manifest already exists when the
copy PR merges, the copy PR re-runs `node scripts/verify-freeze.ts --write`.

**Docs updated in the same PR:**
- `news-inlet-runbook.md`:
  - the pipeline table's row 4 (`:30`);
  - §5 steps 5 to 7 (`:260-277`), which become the R6 dry-run and the /admin
    approval;
  - the characterizer rollback (`:295-296`), which stays, scoped to approved
    tags.
- The meaning of `NULL` and `'{}'` in `issues`, in each place it is written
  down:
  - `src/lib/news-issues.ts:583-589`;
  - `src/app/api/news/route.ts:27-30`;
  - `src/components/features/NewsFeed.tsx:35-38` and its empty-filter copy
    at `:122-135`, which says "We add issue tags after a story is stored";
  - the 0027 ledger row.

  `NULL` becomes "no approved tags: not yet asked, or a proposal pending or
  rejected". `'{}'` becomes "a person approved that no tag applies".
- `CandidateNews.tsx:26-30` changes in PR C, with D14.

### 3.9 Migration numbers, and rebuilding a CHECK safely

**Three migrations, named here, numbered by the ledger:**

| Slug | Applied | Writes | Must sort after |
| ---- | ------- | ------ | --------------- |
| `news_agent_rows_to_review` (§3.3) | about 10-13 to 10-14, SQL editor | `review_item`, `news_item` | 0014 |
| `official_link_sources` (§3.2.4) | after PR A deploys, target 10-16 to 10-17, MCP | `source` (INSERT only), `news_item` and its CHECK | 0014 |
| `news_tags_kind` (§3.4) | after `agent_run_r5`, before 10-19 where possible, MCP | the kind and agent CHECKs, an index, a function | `agent_run_r5`; and before `contact_update_kind` |

- **Recommended (with roster D13 and BC21):** all three slugs go into the
  one ledger PR on Fri 10-09 (`ballot-content-completion` `:1191`,
  `:1201-1204`; roster-completeness `:1130-1144`). BC21 as written lists
  only `news_tags_kind`, as 0052, which already sorts after `agent_run_r5`
  (0048) and before `contact_update_kind` (0053). If the other two are added
  at the end (0054 and 0055), they sort after 0014 as required.
- **The freeze does not constrain their place.** None writes a table or
  column the guard covers, and the guard lets every `source` INSERT through
  (§1). The PGlite checks also set the bypass before replay
  (`ballot-content-completion` `:934-944`).
- **The same PR records 0047 as applied** (2026-10-08 06:03 UTC,
  `0047_candidate_lead_kind`), if no other PR has done so first, and 0045 as
  applied by hand but not recorded, as `README.md:61` already says.

**Rebuilding a list CHECK.** `news_tags_kind` rebuilds
`review_item_kind_check` and `agent_run_agent_check`, and
`official_link_sources` rebuilds `news_item_agent_source_check`, each only
after a guard confirms the exact pre-state (§3.4, §3.2.4). If another
migration has changed that CHECK first, the file fails loudly instead of
silently dropping a value. It is unapplied and can then be rewritten. The
same guard is recommended for the retrofit's `agent_run_r5` and
`contact_update_kind`, which rebuild the same CHECKs. In
`verify-migrations.mjs`, after every file has applied in filename order,
`review_item` must accept every kind in `REVIEW_KINDS` and `agent_run` every
agent the console lists. That catches a dropped value in fresh-database
order (§6).

### 3.10 House rules

- **Equal treatment.**
  - No rule here reads party or ranks candidates.
  - Candidate pages show no tag chips (D14).
  - "Official document" from the official list can never attach to a
    candidate story (D7), so an incumbent's release on a `.gov` host is
    labelled the same way a challenger's would be.
  - Every covered county's Supervisor is on the list on the same terms
    (§3.2.1).
  - A daily sweep shrinks the feed-depth bias, which otherwise favours
    candidates covered by deep feeds.
- **Amendments.**
  - Nothing here writes a case for or against a measure.
  - A tag names a topic.
  - Official attribution never applies to a page by its host alone, and R3's
    queue drops a page whose row records another type, so an agency's
    advocacy page keeps its true type (D7, §3.2.3).
- **Approval in /admin.**
  - R1 and R3 are paused (§3.0), and R3 returns only as a queue (D5).
  - The eight R3 rows go through the queue (§3.3).
  - Tags pass through /admin (§3.4).
- **No source, no card.**
  - After §3.1 the CHECK enforces it for every `candidate_news` and
    `election_news` row.
  - `official_link` joins it under D8.
  - `pipeline_event` stays exempt under D11, and no page shows it.
- **Founder decisions** are in §4, each pending.

## 4. Founder decisions

Each is Recommended (pending founder confirmation), and none is assumed.

**D1. The Ballotpedia row (`ce038b86`).** Recommended (pending founder
confirmation): apply 0042 as written, which attributes the row to
"Ballotpedia News", `factual_reporting` / `unrated`. Then **reject** it when
it comes up in /admin under D2. The migration step matches checklist B1.
- **Why apply as written.** 0042 then goes through the MCP with no edit and
  no `DELETE`, so the CHECK lands sooner.
- **Why reject.**
  - It is a June certification notice. The measure pages now cover the same
    three measures (0035 to 0041).
  - Ballotpedia is not on the outlet list.
  - The `unrated` lean 0042 gives it was never checked against the raters
    (§2.4).
- **TO FLIP:** approve it in /admin, and it returns as "Ballotpedia News".
  Or replace 0042's marked block with the `DELETE` its header gives, before
  applying (`0042:38-46`). In that case 0042 is applied in the SQL editor,
  B3 expects no new `factual_reporting` row, and seven items move under D2.

**D2. The eight R3 rows go through /admin.** Recommended (pending founder
confirmation): apply `news_agent_rows_to_review` after 0014 (§3.3), then
decide each row in /admin. No person approved these rows, and a migration
apply is not an approval in /admin.
- **TO FLIP:** skip the move. Record in `founder-decisions-2026-10-04.md` a
  written approval of each named row, as an exception to the /admin rule,
  and the rows stay on the site as 0042 and 0014 attribute them.

**D3. Lean sign-off for AP, Miami Herald, Sun Sentinel, Tampa Bay Times and
Orlando Sentinel.** Recommended (pending founder confirmation): leave all
five `null` through Nov 3. The 2026-09-21 deferral stands.
- **Why.**
  - Signing unlocks no sweepable outlet (§2.5).
  - AllSides' confidence is "low or initial" for four of the five.
- **What signing would change** (§3.6):
  - hand-adds from the outlet become possible;
  - the outlet page shows the rating instead of "Not yet reviewed";
  - if AllSides governs, its attribution line is owed.
- **TO FLIP:** choose one rater to govern all five, and record a reason that
  does not depend on the outcome, for example coverage or stated
  confidence. All three raters' results were already shown to the founder
  on 2026-09-21, so a choice made "before reading the results" is no longer
  possible.
  - Two raters need no cut point (§2.5). AllSides gives AP `center-left`,
    Miami Herald `center-left`, Sun Sentinel `center`, Tampa Bay Times
    `center` and Orlando Sentinel `center`. MBFC gives `center-left`,
    `center-left`, `center`, `center-left` and `center-left`.
  - Ad Fontes needs a cut point chosen as well.
  - Each row cites its rater's URL and access date, which `leanBasis`
    already holds. The change lands by the PR described in §3.6.

**D4. The AI-crawler hold.** Recommended (pending founder confirmation):
keep all seven held through Nov 3, and keep reading `flvoicenews.com`.
**`flvoicenews.com` half confirmed by the founder, 2026-10-10: "keep
Florida's Voice".** It stays off `AI_POLICY_HOLD`. The hold on the other
domains is unchanged by this decision.
- **Why.**
  - The pipeline's output is read by AI. R5 reads every swept story, and R6
    sends headlines and deks to Jev. That is what these robots.txt files
    decline.
  - For Florida's Voice, an unreadable policy is "unknown", not
    "disallowed", the distinction the file draws.
- **TO FLIP:**
  - Remove a domain from `AI_POLICY_HOLD` by PR. For the three dailies, D3
    must be signed as well.
  - Or add `flvoicenews.com` to the hold. Its 7 approved rows stay, and new
    stories stop.

**D5. R1 and R3.** Recommended (pending founder confirmation):
- **R1:** retired. `cap-r1-candidate-news` stays paused (§3.0) and is
  deleted after Nov 3. "R1" is the news-sweep cron, which already queues
  candidate news for review under `source 'agent:R1'`
  (`news-intake.ts:294`).
- **R3:** stays paused until the retrofit's PR B prompt passes its watched
  Run now (retrofit `:1055-1059`). It then runs weekly on Wednesdays, as
  scheduled today (S1), and only queues, through `election-news.ts`
  (§3.2.3). This spec writes no interim R3 prompt (§2.10).
- **Why.** Official notices about early-voting sites, deadlines and court
  rulings are what the sweep cannot see, because the sweep reads only
  outlets. A queue-only R3 publishes nothing without a person.
- **TO FLIP:**
  - Keep R3 paused through Nov 3, as checklist A1 recommends and BC12 says.
    Official notices then reach the site only as operator hand-adds.
  - Or run R3 on Mondays and Thursdays from 10-19 to 11-03, for early
    voting.
  - Keeping an R1 routine would need its own queue CLI, which no spec
    designs.

**D6. What counts as an official source.** Recommended (pending founder
confirmation): the 17 entries in §3.2.1, which include the retrofit's four
changes. Left off: CourtListener, `congress.gov`, the Governor's site, and
R3's Tier 2 (AP, Ballotpedia, VoteSmart, PolitiFact, FactCheck.org,
OpenSecrets).
- **Why.**
  - Each listed entry is the body that issues the notice: the Division of
    Elections, a county Supervisor, the Legislature, a court.
  - CourtListener is the Free Law Project's archive of court filings, not
    the court. A ruling on a court's own host can be queued, and one
    available only elsewhere is reported in R3's run report, never queued.
  - The Governor's site also carries political releases, and its
    executive-order path was not checked for this spec. A storm order that
    changes early voting reaches the site as an operator hand-add with a
    page row.
  - Tier 2 sources are not primary documents, and PolitiFact and
    FactCheck.org publish verdicts on candidates.
- **TO FLIP:**
  - Add `courtlistener.com` as "CourtListener (Free Law Project)". Federal
    filings are often free only there.
  - Add `flgov.com` as "Executive Office of the Governor", path-scoped once
    its executive-order path is confirmed.
  - Drop any entry, for example the Legislature's three hosts, to keep R3 to
    election administration and courts.

**D7. Where official attribution applies.** Recommended (pending founder
confirmation): only from a given `official:` id that R3's queue writes, only
on an `election_news` item with no candidate and no race, and only when the
URL's host is that entry's (§3.2.2). An operator's hand-add of a government
page keeps today's remedy, a page row with the page's true type.
- **TO FLIP:** the order the retrofit's §3.4 adopted from this spec's first
  draft: check `official` after `page` for every `manual_news` item. Then an
  approved candidate story from an incumbent's `.gov` page prints a
  government publisher and "Official document", which a challenger's cannot
  get, and an agency's advocacy page on an amendment prints as an official
  document.

**D8. The six `official_link` rows.** Recommended (pending founder
confirmation): attribute them in `official_link_sources` (§3.2.4): five to
their `official:` rows, the Miami-Dade link to a page row, and extend the
CHECK to `official_link`. The cards then name the publisher, as every other
card does.
- **TO FLIP:**
  - Keep them exempt, as 0014 decided (`0014:16-21`). They keep the
    "Official resource" label.
  - Or point the Miami-Dade link at `https://www.votemiamidade.gov/`
    (`supervisors.ts:25`) and attribute it to `official:votemiamidade.gov`.
    That changes a link voters follow, so it needs the redirect re-checked
    first.

**D9. Sweep cadence.** Recommended (pending founder confirmation): daily at
11:00 UTC from now to Nov 3. The operator's review cadence is unchanged.
- **TO FLIP:** restore `0 11 * * 1,4` in `vercel.json`.

**D10. News approvals during the freeze.** Recommended (pending founder
confirmation): news and tag approvals continue from 2026-10-18 to
2026-11-03. The freeze's corrections-only rule covers ballot content, and
the news plane, the news components and `src/lib/news-*.ts` are outside it
(`ballot-content-completion` `:860-871`, `:994-997`). The retrofit's D7
says the same for R3 and R5 queueing (`:1001-1006`).
- **TO FLIP:** stop approving on 10-18. The cron keeps queueing and nothing
  publishes. To stop queueing as well, revert the cron entry and pause R3.

**D11. The 36 `pipeline_event` rows.** Recommended (pending founder
confirmation): keep them exempt. They have no URL and no publisher, the site
wrote them about itself, and no page shows them (§2.6).
- **TO FLIP:** stop `/api/news` from returning `pipeline_event` rows, so
  they can never become a card. They stay in the table for the admin
  pipeline panel (`src/lib/admin/monitor.ts:167`).

**D12. Tags are approved in /admin before voters see them.** Recommended
(pending founder confirmation): yes, through the `news_tags` kind (§3.4).
- **TO FLIP:** treat tags as metadata. Keep the runner's direct-write mode,
  and skip `news_tags_kind`, the card and the payload schema. Tags then
  appear within a day of a run, and the methodology copy (D15) drops "a
  person approves them before they appear".

**D13. Threshold.** Recommended (pending founder confirmation): 0.85, unless
the v7 baseline (rollout step 12) shows empty-case correctness below 90% at
0.85. In that case use 0.90, the next measured point.
- **TO FLIP:** pass `--threshold <value>` in R6's `tags` step. The provenance
  does not change.

**D14. Tag chips on candidate pages, and R6's scope.** Recommended (pending
founder confirmation): remove the chips from candidate pages, keep them on
`/news`, and have R6 ask about `election_news` only (§3.4).
- **TO FLIP:** leave `CandidateNews.tsx` passing `issues`, and set
  `TAGGED_ITEM_TYPES` to both item types. Candidates then show chips at
  different times, as their proposals are approved.

**D15. The methodology copy.** Recommended (pending founder confirmation):
replace the paragraph with §3.8's text, merged before the freeze-copy PR.
- **TO FLIP:** leave it as it is. It then keeps saying every stored story
  names a candidate and says nothing about approving tags. After 10-18,
  changing it goes through the corrections process.

## 5. Rollout order

0. **Founder pauses R1 and R3** (§3.0; checklist A1). Today. This needs
   nothing first and decides nothing about their future.
1. **PR A: official sources, the approve path, R3's queue CLI** (§3.2).
   Target Mon 10-12.
   - It ships `official-sources.ts`, `supervisorSite`, the widened
     `urlBelongsTo`, every given-id check, `ensureListedRow`,
     `election-news.ts` (library and script) and the runbook step 4 update.
   - It needs nothing merged first. It needs D6 and D7 answered, because
     their flips change the list and one check. The retrofit's PR B needs
     it.
2. **PR B: the sweep and the intake** (§3.5, §3.7). Target Mon 10-12, before
   that day's 11:00 UTC run.
   - It ships the daily `vercel.json`, `feedDepthHours`, `shallowFeeds`, the
     depth log line and the chunked dedupe reads.
   - It needs nothing first. It and the retrofit's PR A both edit the cron
     route; the second to merge rebases and wires the depth line into the
     `agent_run` summary.
   - After deploy: read the first daily run's result in `agent_run` once the
     retrofit's PR A has landed, or else in the Vercel log line or a manual
     `POST`. Check `shallowFeeds` and that `skipped` is above 0.
3. **Founder decides D1 and D2** (checklist B1, by Wed 10-14).
4. **0042** with MCP, pre-checks P1 to P5 first and post-checks A1 to A3
   after (§3.1). Needs step 3.
5. **0014** with MCP, post-checks B1 to B3, the optional probe in the SQL
   editor, then `/news` and `verify-news-neutrality` (§3.1). Needs step 4.
6. **`news_agent_rows_to_review`** (D2).
   - First a PR with the file, its `verify-migrations.mjs` cases and its
     ledger row (§3.9); then the founder's apply in the SQL editor; then M1
     to M3.
   - The founder decides the items in /admin. Checklist A2 opens /admin.
   - Needs step 5 and the ledger PR.
7. **Ledger rows** for 0042 and 0014 as applied, with the date and how, in
   the next ledger or migration PR.
8. **Copy PR** (D15, §3.8): the methodology paragraph, removal of the
   runner's direct-write mode, and the docs. Needs step 6 applied. Merges by
   Fri 10-16, before the freeze-copy PR.
9. **`official_link_sources`** (D8). Needs step 1 deployed and step 5
   applied. Through the MCP, then read back: 0 sourceless `official_link`
   rows, and the new CHECK text.
10. **The retrofit's PR B** (R3 on the wrapper) and R3's watched Run now,
    then R3 weekly under D5. Owned by the retrofit; needs step 1.
11. **The retrofit's PR A and `agent_run_r5`**, merged and applied. R6 needs
    both.
12. **v7 baseline.** In the agent worktree, run
    `node scripts/news-characterize-eval.ts docs/general-election/news-characterization-goldset-2026-09-18.jsonl --json /Users/jsloth/Projects/kyv-agent-runs/<date>/eval-v7.json`
    with the arm64 node. It touches no database and costs about $0.02.
    Record the result as §11 of the eval report, then settle D13.
13. **PR C: tags.**
    - It ships `news_tags_kind`, the payload schema, the effect, the route,
      the card, R6 in the wrapper's table, the console lists and the budget
      module, the runner's `--queue` and selection, the `CandidateNews`
      change (D14), and tests.
    - It needs steps 8, 11 and 12.
    - After deploy, apply `news_tags_kind` with MCP. Verify that
      `pg_get_constraintdef` lists `news_tags`, that
      `uq_review_item_news_tags_key` exists, that `agent_run_agent_check`
      lists `R6`, and that `has_function_privilege('anon', 'news_tags_to_ask(text,text[],integer,integer)', 'EXECUTE')`
      is false.
14. **R6 goes live.**
    - The founder creates `cap-r6-news-tags`.
    - A watched Run now of `R6 tags-dry`, read against the v7 baseline.
    - Then a watched Run now of `R6 tags`.
    - Then enable the schedule. Its first run proposes tags for the
      `election_news` backlog.

**Targets.**
- Step 0 today. Steps 1 to 7 by Wed 10-14.
- Steps 8 and 9 by Fri 10-16.
- Steps 10 to 14 before early voting opens on Mon 10-19 where possible. None
  of them is ballot content, so the freeze does not gate them (D10).

## 6. Testing

Plain-Node scripts, found by `scripts/verify-all.mjs`. Every guard is
mutation-checked: break it, see the script fail, restore it.

- **`scripts/verify-official-sources.ts`** (new, PR A)
  - No official entry matches any `OUTLETS` entry, and the reverse.
  - `urlBelongsTo` behaves as before for every outlet
    (`verify-news-sweep.ts` still passes).
  - The four county Supervisor hosts equal `supervisorSite` for each covered
    county, with `www.` removed.
  - Q15's URLs: five resolve to the entries §3.2.4 names, and
    `www.miamidade.gov/global/elections/home.page` resolves to none.
  - `www.miamidade.gov/global/release.page?…` resolves to none, so 0014's
    page rows keep their pages. `constitutionalinitiatives.dos.fl.gov/…`
    resolves to the Division, and `www.flhouse.gov/…` to the House.
  - Publisher strings equal 0014's and 0042's for the bodies they name.
  - `officialSourceRow` has the shape of `outletSourceRow`.
- **`scripts/verify-news-enqueue.ts`** (extended, PR A and PR B)
  - **Given ids** (§3.2.2):
    - an `outlet:` id on another outlet's URL is refused, naming both;
    - a `src_*` id whose row has a different `url_norm` is refused;
    - an `official:` id is refused on `candidate_news`, on `election_news`
      with a `race_id`, on an outlet's URL, and on another official host's
      URL;
    - a government URL with no given id resolves to `page`, never to an
      official row;
    - each of the eight §3.3 payloads, built from Q2's rows, resolves
      `given` with its `src_*` id;
    - swept payloads are unchanged.
  - **The dedupe read** (§3.7):
    - the `review_item` read is filtered by the sweep's URLs, in chunks of
      200;
    - with a fake table of 1,500 decided items where the matching one comes
      last, the story is still skipped;
    - a read error throws instead of queueing.
- **`scripts/verify-election-news.ts`** (new, PR A; the retrofit's PR B
  extends it)
  - Each malformed input refuses the batch, naming the index: not an array,
    26 items, an unknown field, a missing field, a non-string, a `metro`
    scope, a county outside the four, a county scope on another county's
    entry.
  - A URL off the list, or on an outlet, refuses the batch, naming the index.
  - A URL with a `primary_doc` / `N/A` page row gets that row's id. One whose
    row is `opinion` is dropped with the reason. Any other gets
    `official:<domain>`.
  - A URL already in `news_item`, in a `manual_news` item of any status, or
    earlier in the batch is skipped.
  - Every queued row parses with `ManualNewsPayloadSchema` and carries a
    `source_id`.
  - `--dry-run` inserts nothing (an injected client records no insert).
- **`scripts/verify-admin-types.ts`**
  - the eight moved payloads parse with `ManualNewsPayloadSchema`;
  - `NewsTagsPayloadSchema` accepts 0 to 25 issues and refuses a malformed
    provenance.
- **`scripts/verify-admin-effects.ts`**
  - `news_tags` plans `update_news_tags`, touching only the three columns;
  - `drop_issues` removes tags and never adds them;
  - an id outside the proposal is refused;
  - an empty proposal writes `'{}'`;
  - `manual_news` is unchanged.
- **`scripts/verify-news-characterize.ts`**
  - The runner contains no `news_item` update. This is a static check, added
    in the copy PR.
  - The static check at `:191-192`, which pins the runner's direct select on
    `CHARACTERIZED_ITEM_TYPES`, is replaced in PR C by one that pins the
    `news_tags_to_ask` call with `TAGGED_ITEM_TYPES`, and
    `TAGGED_ITEM_TYPES` is pinned to a subset of `CHARACTERIZED_ITEM_TYPES`.
  - `--queue` payloads parse.
  - Empty results are queued with `issues: []`.
  - Held-outlet rows are skipped and paging continues past them.
  - The dedupe key is `<id>|<provenance>`.
  - Nothing to do exits 0.
  - A failed call is counted and queues nothing.
- **`scripts/verify-news-sweep.ts`:** `feedDepthHours` on fixture feeds,
  including an empty feed and undated items, and `shallowFeeds` at the 24-hour
  edge.
- **`scripts/verify-migrations.mjs`**
  - **0042 (new; there are none today).** On fixture rows shaped like its
    four targets, 0042 attributes each by `url_norm`. The Ballotpedia row
    gets `factual_reporting` / `unrated`, a re-run changes nothing, and 0014
    then adds its CHECK.
  - **`news_agent_rows_to_review`.**
    - On fixture rows shaped like Q2's eight, all sourced, it creates eight
      pending `agent:R3` items with the expected keys and deletes the rows.
    - On a sourceless fixture it raises.
    - A re-run is a no-op.
  - **`official_link_sources`.**
    - After every file has applied, each of 0004's six seeded links carries
      the source §3.2.4 names, and no `official_link` row is sourceless.
    - An `official_link` insert with no source is refused. This replaces the
      check at `:520-529`.
    - On a second PGlite instance whose source CHECK text differs from
      0014's, the guard raises.
  - **`news_tags_kind`.**
    - After every file has applied in filename order, `review_item` accepts
      every kind in `REVIEW_KINDS`, read from `src/types/admin.ts`, and
      `agent_run` accepts every agent in `AGENTS`.
    - The unique index rejects a second `news_tags` item with the same key
      in any status, and allows different keys.
    - `news_tags_to_ask` returns the newest rows not yet asked, and returns
      a full page when the 200 newest have all been asked.
    - `anon` cannot execute the function.
    - On a second PGlite instance whose kind CHECK holds one extra kind, the
      file's guard raises.
- **`scripts/verify-freeze.ts`:** passes with the copy PR's change, whether
  or not a manifest exists yet.
- **Live checks, read-only.**
  - §3.1 P1 to P5, A1 to A3 and B1 to B3; §3.3 M1 to M3; step 9's read-back;
    the catalog checks in step 13.
  - The first R6 report's `asked` count against:
    ```sql
    SELECT count(*) FROM news_item n
     WHERE n.item_type = 'election_news' AND n.issues IS NULL AND n.url IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM review_item r WHERE r.kind = 'news_tags'
                        AND r.payload->>'dedupe_key' = n.id::text || '|' || '<provenance>');
    ```
- **Live, not read-only.** Only §3.1's optional probe, run in the SQL
  editor.
- **First real runs.**
  - R6's `tags-dry` output is read in full against the v7 baseline before
    `tags` runs.
  - The first approval of a moved R3 item is read back. It gives a new
    `news_item` row with its `src_*` source, and the item `approved`.
  - The first approved item from the rewritten R3 is read back with
    `source_id 'official:<domain>'` or a page row's id, and its `source` row
    `primary_doc` / `N/A` (retrofit `:1056-1059`).

## 7. Out of scope

- **R3's prompt, its wrapper rows, its `context` step and its four content
  rules.** They are the retrofit's PR B (`:608-661`). §3.2.3 states what PR
  A gives it.
- **Wiring N, the per-candidate news slots.** Candidate pages pass no
  `slots` (`src/app/(public)/candidates/[candidateId]/page.tsx:121-123`).
  That is a separate decision (handoff D1).
- **WordPress paging** (`?paged=N`) for shallow WordPress feeds. It is the
  verification report's second remedy (`:141-145`). The depth record in
  §3.5 says whether it is needed.
- **Moving the sweep or the tagger to a production route** (ADR-001
  Option B).
- **The measure-resource rows that spell a government body differently**
  (Q12). They are measure-page content, and the freeze guard refuses
  `UPDATE`s to referenced `source` rows from 2026-10-18.
- **Founder re-labelling of the gold set** (eval recommendation 6).
- **A per-candidate tag distribution report.**
- **A policy inlet** for stories that name no candidate.
- **Adding Ballotpedia or AP to the outlet list.**
- **The approved Florida's Voice item with no `news_item` row** (Q10). It
  should be reconciled, with a note on how the row was removed. `news_item`
  has no `created_at` and no delete audit, so this design cannot say who
  removed it.
