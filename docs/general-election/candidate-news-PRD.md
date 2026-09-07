# Candidate News — PRD

**Status:** Draft v1.1 · **Created:** 2026-09-06 · **Revised:** 2026-09-06 (C0) · **Owner:** Jason (founder)
**Companion:** `news-fairness.md` (owns labelling + fairness rules — **not yet written, see §6 Q0**),
`refresh-agents-plan.md` (the governing R1–R4 spec, brought into this directory by C0),
`agents/r1-candidate-news.prompt.txt` (snapshot of the live R1 contract),
`CAP_Runtime_PRD_v1.md` (the S-plane, now idle)

> **v1.1 note.** v1.0 was written from schema defaults and console docs
> because the R-agent spec could not be found. C0 found it. Several v1.0
> premises were wrong; the corrections are inline and the evidence is in §7.
> The one that matters most: **R1 already exists and has run four times.** It
> has written nothing because every candidate in the database is a demo
> fixture, not because nothing writes news.

## 1. Why this exists

The founder retired candidate briefs on 2026-09-06. A candidate page is now a
short biography plus that candidate's **news cards**. `news-fairness.md`
specifies how those cards are labelled and allotted — and `news_item` has
held a `candidate_id` column and a `candidate_news` item type since
migration `0005` (applied 2026-07-04), and not one row has ever been written.

> **This is the critical path for the entire pivot.** Every other task in
> `news-fairness.md` (N2–N7) styles, selects from, and audits a table that is
> currently empty.

**Goal:** for each `ballot`-tier candidate in the eight target races, keep a
current set of sourced, neutrally-worded, lean-labelled news items in
`news_item`, written by a scheduled agent and gated by the existing operator
queue.

**Why the table is empty (C0):** R1 (`cap-r1-candidate-news`) ran on
2026-07-03 (dry), 07-06, 07-15 and 09-01. Each run read the 8 published races,
found 26 candidates all with `demo-cand-*` ids and `example.org` sites,
confirmed by web search that no such people exist, and wrote **honest zeros**
for all 26 rather than attach real people's news to fictional profiles. The
blocker is the roster, and the roster is the ingest branch's job (§2).

## 2. What already exists — do not rebuild it

| Asset | Where | State |
|---|---|---|
| **`CAP_Refresh_Agents_Plan_v1`** — the governing spec for R1–R4 | HTML at `Civic Awareness (Know Your Vote)/CAP_Refresh_Agents_Plan_v1.html` — on `main` via PR #14 (it had lived only on `wip/raw-worktree` until 2026-09-06). Text extraction: `docs/general-election/refresh-agents-plan.md` | found (C0) |
| **R1 Candidate News Curator** — the agent this PRD is about | Cowork scheduled task `cap-r1-candidate-news`, cron `0 9 1,15 * *`, enabled. Mirror `.superpowers/sdd/r1-scheduled-prompt.txt` (gitignored). Snapshot: `agents/r1-candidate-news.prompt.txt` | **exists; 4 runs; 0 rows (roster blocker)** |
| R2 / R3 / R4 | `cap-r2-contact-refresher` (`0 8 * * 1`), `cap-r3-election-news` (`0 9 * * 3`), `cap-r4-ops-digest` (`30 7 * * 1`) | exist, enabled |
| `news_item.candidate_id`, `candidate_news` / `election_news` types, `idx_news_item_candidate`, `uq_news_item_url_candidate` | `0005_refresh_agents.sql` | **applied live** (`20260704003152`) |
| `candidate_contact` (+ `verified_by` default `agent:R2`) | `0005` | applied |
| `agent_run`, `agent_run_request`, `review_item`, `admin_action` | `0006_admin_ops.sql` | **applied live** (`20260704003235`); all four tables have **0 rows** |
| `source.type` (incl. `opinion`) + `source.lean_tag`, both `NOT NULL` + CHECK | `0000` | applied — the labelling axes exist; 87 rows, all demo |
| `verify-news-neutrality.ts` — banned-terms lint + self-test | `scripts/` | built; self-test and live lint green 2026-09-06 |
| `verify-refresh-schema.mjs`, `verify-admin-ops.mjs` | `scripts/` | built; refresh-schema green live 2026-09-06 |
| Admin console Phase A1 (schema, auth, shell) | `main` (`2fcfc49`) | merged — the Agents page on `main` is the A4 placeholder |
| **Admin console Phases A2–A5** — `/api/admin/*` routes, agents run-request API (TASK-A13), `src/lib/admin/{effects,monitor,review}.ts`, **`src/lib/neutrality.ts`** (TASK-A05), `src/types/admin.ts` | on `main` via PR #14 (`admin/console-a2-a5`, reconciled 2026-09-06; it had lived only on `wip/raw-worktree`). PR #14 also scopes the console's two `race` reads to the active election | built |
| `cap-r0-dispatcher` (TASK-A14) | — | **does not exist** |
| Agent prompts v1.1: `agent_run` dual-write (TASK-A15) | — | **not applied** — no R prompt writes `agent_run`; 0 rows |
| `allowlist_b_core` — Tier-1/Tier-2 source classification | `Civic Awareness (Know Your Vote)/Agents/The Fact-Checker/` | built + tested |
| `candidate.ballot_status` (`ballot` / `write_in` / `excluded`) — what "ballot-tier" means | ingest branch `claude/data-architecture-ingest-plan-u9b1fq`, `data-architecture.md` D1, task A1 (`0010_general_election.sql`) | **designed, founder gate A0 open, migration not written** |
| Real candidate roster (22 ballot-tier candidates, 8 races) | ingest branch tasks B2 (parser) + B3 (official sites) | **not ingested** — live `candidate` has 29 rows, 29 demo |

**Schema cost of this PRD: zero** — for the news table. Two corrections to
v1.0's numbering claim:

- Live migrations are `0000`–`0008`. Repo `main` also holds `0009_action_log_roles`,
  `0010_ballot_measure`, `0011_measure_rls` — **written, not applied live.**
- v1.0 said "`0011`, agent news must carry a source" belongs to
  `news-fairness.md`. `0011` is already `measure_rls` on `main`, and the ingest
  branch has claimed `0010` for `general_election`. The source constraint needs
  a fresh number, assigned when written.

## 3. The architecture, confirmed (was "inferred" in v1.0)

Per `docs/admin-dashboard/design.md` § 2: *"the dashboard is hosted; the agents
are not. Everything trigger-shaped is therefore a queue write the local
dispatcher consumes — never an RPC."* Confirmed. Additionally:

- The R-agents are Cowork scheduled tasks under `~/.claude/scheduled-tasks/`
  on the operator's Mac; a repo coding agent cannot edit them. A **Claude
  desktop session** (this one) has the `scheduled-tasks` MCP and can — but
  editing a live standing task is a config change that needs the founder's
  explicit go, so this PRD drafts prompt changes into `agents/` and stops.
- `TASK-A14` / `TASK-A15` are confirmed unbuilt (no dispatcher task; no
  `agent_run` writes in any prompt; 0 `agent_run` rows).

### R-agent roles — confirmed from `refresh-agents-plan.md` §6

| Agent | Role (spec) | Writes | v1.0 inference |
|---|---|---|---|
| **R1** | Candidate News Curator — biweekly (1st, 15th) | `news_item` `item_type='candidate_news'` with `candidate_id`, `race_id`, `url` | correct |
| **R2** | Contact & Race Info Refresher — weekly | `candidate_contact`, freshness stamps; gated diffs to run report | correct |
| **R3** | Election News Curator — weekly | `news_item` `item_type='election_news'`, `candidate_id NULL`, `metro` | **wrong** — v1.0 called R3 "diffs / date mismatches"; that is a side-effect flag, not its job |
| **R4** | Ops Overview Digest — weekly, read-only | no DB writes; regenerates `CAP_Ops_Digest_latest.html` | correct |

### R1's actual contract (quoted from the stored prompt, 2026-09-06)

> YOUR ONE JOB: for each candidate in each published race, find on-the-record
> news from the last 14 days on allowlisted sources, and write neutral
> candidate-scoped feed items to the news_item table.
>
> Writes: execute_sql INSERT into news_item ONLY, columns: item_type='candidate_news',
> candidate_id, race_id, title, summary, url, published_at
>
> 5. Symmetric coverage: search every candidate in a race with the same query
> pattern and effort. Report item counts per candidate in your run report.

Full text: `agents/r1-candidate-news.prompt.txt`. Search backend: the Claude
app's own web search tools (the 07-06 run report shows three live WebSearch
spot-checks). Source policy: plan §4.1 Tier 1 + Tier 2 only, listed verbatim
in the prompt.

## 4. Requirements — and where the live R1 contract falls short

| Req | Statement | Live R1 today (C0) |
|---|---|---|
| **CN-R1** | Every written row is attributable: `source_id` → a `source` row with real `publisher`, `type`, `lean_tag`. No source → dropped, never written unlabelled. | **Gap.** R1 inserts no `source_id`. R3's four live `election_news` rows also have `source_id NULL`. Nothing in the plan requires it — the plan's §4 rule is "url on an allowlisted domain", not a `source` row. |
| **CN-R2** | Neutral wording is linted, not promised: every title/summary passes `verify-news-neutrality.ts` before insert. | **Partial.** The prompt bans the terms in prose; the script lints *after* the fact and only from R4. |
| **CN-R3** | The agent classifies (`factual_reporting` vs `opinion`, `lean_tag`), never editorialises. | **Gap** — follows from CN-R1: no `source` row means no `type`/`lean_tag` is recorded. The plan §4.1 says "tag lean on every registered source", so the intent exists. |
| **CN-R4** | Symmetric search, per-candidate counts recorded. | **Met** in the prompt (Constitution 5, run-report step 6). Three run reports carry the 26-row zero table. |
| **CN-R5** | Dedupe is the database's job; never pre-query and branch. | **Conflict with the plan.** Plan §4 says "Dedupe on (url, candidate_id) before insert" with the unique index as backstop, and the prompt does both. Harmless either way; the index is authoritative. Drop the "never pre-query" wording or accept the plan's. |
| **CN-R6** | Ops plane written on every run (`agent_run`), skip-and-note if `0006` absent. | **Gap** — this is exactly TASK-A15, unbuilt. |
| **CN-R7** | Gated by default: agent news routes through `review_item` before it is publicly readable. | **Gap, and a reversal.** design.md § 7 recorded the opposite decision ("Manual + gated only … revisit via per-agent flag"). This PRD asks the founder to flip that flag for R1. Also note: the read path publishes `news_item` rows the moment they exist (anon SELECT); "gated" therefore means *don't INSERT until approved*, i.e. R1 writes a `review_item(kind='manual_news', source='agent:R1')` and the approve effect does the insert. That effect exists as `src/lib/admin/effects.ts` (on `main` via PR #14). |
| **CN-R8** | Degrade honestly: `status='failed'` on the run row; `ok_empty` for "ran fine, found nothing". | **Partial.** Fail-closed is in the prompt, but with no `agent_run` row there is no status anywhere a machine can read. Same fix as CN-R6. |

## 5. Tasks

- [x] **C0** — Locate `CAP_Refresh_Agents_Plan` and the R1–R4 stored prompts; bring
  the plan into the repo; quote R1's real contract; confirm or correct §3.
  ~ Done 2026-09-06: plan found on the operator's Mac and on branch
  `wip/raw-worktree` (it had never reached `main`; PR #14 lands it); extracted to
  `docs/general-election/refresh-agents-plan.md`. Stored R1 prompt read via
  `list_scheduled_tasks` → `SKILL.md`, diffed against `.superpowers/sdd/`
  mirror (identical), snapshotted to `agents/r1-candidate-news.prompt.txt`.
  §3 table confirmed for R1/R2/R4, corrected for R3. Evidence in §7.

- [x] **C1** — Decide where R1 runs.
  ~ Done 2026-09-06 by inheritance: plan §3 **ADR-001 = Option A, Cowork**
  (all four agents), re-affirmed by design.md § 7 (trade-off table, "Trigger model"). Rationale:
  weekly/biweekly cadence tolerates "runs while the app is open"; every run is
  a readable session; no new infra; the search capability and its cost stay
  inside the Claude app rather than a hosted API key. Revisit triggers, from
  the plan: daily cadence, or unattended operation. **Recommendation added by
  C0 (founder to confirm):** keep search in Cowork but move the *write path*
  into the repo — a `scripts/r1-ingest.mjs` helper that R1 invokes with a JSON
  payload and that owns source registration, lint, insert-or-queue, and
  `agent_run`. That makes CN-R1/R2/R5/R6/R7 testable code instead of prompt
  prose, keeps ADR-001, and is the same move design.md § 5 made for the lint
  ("neutrality lint as a library").

- [ ] **C2** — Source discovery: backend + admissible sources.
  Decision recorded (C0): backend = Claude app web search (already what R1
  uses); sources = plan §4.1, which equals `allowlist_b_core` Tier 1 + Tier 2
  **plus** five election-office domains R1 lists and the Python core does not
  (`miamidade.gov`, `browardvotes.gov`, `votehillsborough.gov`,
  `ocfelections.gov`, `registertovoteflorida.gov`). If the write path moves to
  the repo (C1 rec.), port the two frozensets + those five to
  `src/lib/news-sources.ts` and drop off-list URLs there.
  Verify: a candidate query returns tier-classified results; off-list results
  are dropped, not flagged. **Blocked** on a real roster — there is no real
  candidate to query until ingest B2/B3 land.

- [ ] **C3** — R1 write path: `source` register → `news_item` insert with
  `candidate_id`, `item_type='candidate_news'`, `source_id`. Symmetric per-
  candidate search (CN-R4), dedupe by constraint (CN-R5).
  Shape depends on C1's recommendation (helper script vs. prompt-only SQL).
  Verify: two runs over the same window produce identical rows; every row has
  a source; per-candidate counts logged. **Blocked** on roster.

- [ ] **C4** — Wording lint in the write path (CN-R2).
  The library half is **already done** (TASK-A05, on `main` via PR #14:
  `src/lib/neutrality.ts` exports `findBannedTermMatch` /
  `findAllBannedTermMatches`, and the ingest + decision routes use it). Do not
  re-extract it. What remains is calling it from R1's write path, whose shape
  is C1's recommendation.
  Verify: a banned-term fixture is rejected before insert. **Blocked** on
  C1's founder answer.

- [ ] **C5** — Ops-plane writes (CN-R6) + review-queue routing (CN-R7).
  The `agent_run` half is TASK-A15 (prompt appendix, needs the scheduled-tasks
  MCP + founder go). The `review_item` half needs the founder to reverse
  design.md § 7 for R1 (gate Q5 below).
  Verify: a run appears on the agents console; a written item lands in the
  approval queue; `0006`-absent path skips cleanly.

- [ ] **C6** — Backfill one real race end to end; report per-candidate counts
  so `news-fairness.md`'s `N` can be chosen from data.
  Verify: every `ballot` candidate in that race searched; counts recorded;
  `verify-news-neutrality.ts` passes live. **Blocked** on roster.

**External prerequisites (not C-tasks, but on the critical path):**

1. ~~`reconcile-git.sh`~~ — done 2026-09-06 as PR #14: admin console A2–A5
   and the plan HTML are on `main`. The July run reports are gitignored by
   that PR's `.gitignore` (script default) and remain on `wip/raw-worktree`
   and the operator's disk only.
2. Ingest
   branch `claude/data-architecture-ingest-plan-u9b1fq` — A0 (founder decides the
   three-tier `ballot_status`), A1 (migration), B2 (parser writes real
   candidates), B3 (official sites). Until B2 lands, every R1 run will keep
   writing honest zeros, correctly.

## 6. Open questions

- **Q0 — `news-fairness.md` does not exist.** Not in this repo, not on any
  branch, not on the operator's Mac or in Downloads. v1.0 cites it for §1
  labelling and §2 equal slots and tasks N2–N7. Either it is unwritten or it
  lives somewhere C0 could not see. Founder gate.
- **Q1 — search backend + budget.** *Answered by C0:* R1 uses the Claude
  app's web search; there is no separate API key or budget line. Cost is
  Cowork session time. The T5 `web_search` path in the S-plane is not involved.
- **Q2 — cadence.** *Answered:* plan §8 Q1 default — every two weeks, 1st and
  15th at 09:00. The dispatcher's `*/30` cadence (A14) is for on-demand
  requests, not sweeps.
- **Q3 — `election_news` vs `candidate_news`.** *Answered by plan §4.2:* a
  story naming two candidates in one race becomes either one neutral item per
  candidate or one race-scoped item, never one item centring one candidate's
  view of the other. Race-scoped ⇒ `election_news` with `race_id` set,
  `candidate_id NULL`.
- **Q4 — retention.** Still open. Nothing prunes `news_item`;
  `verify-news-neutrality.ts` lints a 30-day window, which hints at the shape.
- **Q5 — gate agent news? (new)** design.md § 7 chose *not* to queue agent
  news. CN-R7 asks to reverse that for R1. Founder decision; C5 depends on it.
- **Q6 — where did the 09-01, 08-15 and 08-01 R1 runs go? (new)**
  `lastRunAt` is 2026-09-01T13:09Z, but the newest run report on disk is
  2026-07-15. Either those runs paused on a permission prompt (the sdd
  progress log warned first scheduled runs may), or they ran and wrote no
  report. Worth opening the task's run history in the Claude app before
  trusting the cadence.
- **Q7 — "briefs retired" is undocumented (new).** The candidate page still
  renders `CandidateBrief`; `docs/scope-changes.md` has no 2026-09-06
  retirement entry. Record it there before N-tasks build on it.

## 7. C0 evidence (2026-09-06)

Live project `pqracitpmzpiqfnzlngw`, read-only queries.

```sql
SELECT item_type, count(*) FROM news_item GROUP BY 1;
-- election_news 4 · official_link 6 · candidate_news 0 · pipeline_event 0
SELECT count(*) FROM agent_run;          -- 0
SELECT count(*) FROM agent_run_request;  -- 0
SELECT count(*) FROM review_item;        -- 0
SELECT count(*), count(*) FILTER (WHERE candidate_id LIKE 'demo-%') FROM candidate; -- 29, 29
SELECT count(*), count(*) FILTER (WHERE publisher ILIKE '%demo%') FROM source;      -- 87, 87
SELECT status, count(*) FROM race_publication GROUP BY 1; -- published 8 · in_review 1
SELECT version, name FROM supabase_migrations.schema_migrations; -- 0000..0008 (last: 20260706050224 0008_election_seed)
SELECT source_id FROM news_item WHERE item_type='election_news'; -- all NULL
```

Scheduled tasks (`list_scheduled_tasks`): four `cap-r*` tasks, all enabled;
`cap-r1-candidate-news` cron `0 9 1,15 * *`, lastRunAt `2026-09-01T13:09:01Z`,
nextRunAt `2026-09-15`. No `cap-r0-dispatcher`.

Prompt fidelity: `diff <(SKILL.md body) .superpowers/sdd/r1-scheduled-prompt.txt`
→ trailing-newline only.

Run reports (gitignored since PR #14; on `wip/raw-worktree` and the operator's disk at `Civic Awareness (Know Your Vote)/Agents/RunReports/`):
`2026-07-03-R1-DRYRUN.md` (0005 unapplied + fixture roster),
`2026-07-06-R1.md` (0005 applied; 26/26 zeros; three WebSearch spot-checks found no such people),
`2026-07-15-R1.md` (26/26 zeros; all 29 `candidate.fec_id IS NULL`, sites `example.org/demo/*`).

Baseline on this branch, 2026-09-06: `verify-refresh-schema.mjs` 7/7 ok (live);
`verify-news-neutrality.ts --self-test` all ok; live lint "0 agent-written
rows in the last 30 days" ok. `verify-migrations.mjs` **could not run on this
Mac** — PGlite aborts under Rosetta (`node` here is x64: "rosetta error:
target for 19-bit branch is out-of-range"). Pre-existing environment issue,
not a regression; run it on arm64 node or in CI.
