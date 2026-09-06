# Candidate News — PRD

**Status:** Draft v1.0 · **Created:** 2026-09-06 · **Owner:** Jason (founder)
**Companion:** `news-fairness.md` (owns labelling + fairness rules), `CAP_Runtime_PRD_v1.md` (the S-plane, now idle)

## 1. Why this exists

The founder retired candidate briefs on 2026-09-06. A candidate page is now a
short biography plus that candidate's **news cards**. `news-fairness.md`
specifies how those cards are labelled and allotted — but **nothing writes
them**. `news_item` has held a `candidate_id` column and a `candidate_news`
item type since migration `0005` (applied), and not one row has ever been
written.

> **This is the critical path for the entire pivot.** Every other task in
> `news-fairness.md` (N2–N7) styles, selects from, and audits a table that is
> currently empty.

**Goal:** for each `ballot`-tier candidate in the eight target races, keep a
current set of sourced, neutrally-worded, lean-labelled news items in
`news_item`, written by a scheduled agent and gated by the existing operator
queue.

## 2. What already exists — do not rebuild it

| Asset | Where | State |
|---|---|---|
| `news_item.candidate_id`, `candidate_news` / `election_news` types, `idx_news_item_candidate`, URL+candidate dedupe index | `0005_refresh_agents.sql` | **applied** |
| `candidate_contact` (+ `verified_by` default `agent:R2`) | `0005` | applied |
| `agent_run`, `agent_run_request`, `review_item`, `admin_action` | `0006_admin_ops.sql` | applied |
| `source.type` (incl. `opinion`) + `source.lean_tag`, both `NOT NULL` + CHECK | `0000` | applied — **the labelling axes already exist** |
| `verify-news-neutrality.ts` — banned-terms lint + self-test | `scripts/` | built; "run inside R4 per the plan" |
| `verify-refresh-schema.mjs`, `verify-admin-ops.mjs` | `scripts/` | built |
| Agent-control console page (TASK-A13) | `src/app/admin/(console)/agents` | merged |
| `allowlist_b_core` — Tier-1/Tier-2 source classification | `Agents/The Fact-Checker/` | built + tested |

**Schema cost of this PRD: zero.** Everything needed is applied. The one
constraint the pivot adds (`0011`, agent news must carry a source) belongs to
`news-fairness.md` §3, not here.

## 3. The architecture asymmetry (read before designing anything)

Per `docs/admin-dashboard/design.md`:

> *"the dashboard is hosted; the agents are not. Everything trigger-shaped is
> therefore a **queue write** the local dispatcher consumes — never an RPC."*

The R-agents are **Cowork scheduled tasks stored outside this repo**, executing
on the operator's machine, with prompt mirrors under `.superpowers/sdd/`.
**That directory does not exist in this repo.** So:

- A coding agent working only in this repo **cannot** edit an R-agent prompt.
  `TASK-A14`/`TASK-A15` in `docs/admin-dashboard/roadmap.md` are explicitly
  flagged as work for "a session with the scheduled-tasks MCP", not a repo
  agent — and **both are still unchecked**.
- `CAP_Refresh_Agents_Plan` is referenced by `0005`, `verify-news-neutrality.ts`
  (§4.2 wording rules, §7 lint) and `verify-refresh-schema.mjs` (§7) — and is
  **not in this repository**. It is the governing spec for R1–R4.

**Task C0 exists because of this and gates everything else.**

### Known R-agent roles, inferred from schema and console docs

Not authoritative — confirm against the real plan in C0.

| Agent | Apparent role | Evidence |
|---|---|---|
| **R1** | writes news | `review_item` with `source='agent:R1'`; design.md's "per-agent `require_approval` flag routing agent-written news through the queue" |
| **R2** | candidate contact / logistics freshness | `candidate_contact.verified_by DEFAULT 'agent:R2'`; gated-diff dual-write |
| **R3** | diffs / date mismatches | `review_item kind='date_mismatch'`, `source='agent:R3'` |
| **R4** | **read-only** monitor; runs the neutrality lint | design.md: "R4's rule 1 … READ-ONLY on the content plane"; `verify-news-neutrality.ts` "run inside R4" |

**R1 is the agent this PRD is about.**

## 4. Requirements

- **CN-R1 — every written row is attributable.** A `candidate_news` row must
  carry a `source_id` whose `source` row has a real `publisher`, `type` and
  `lean_tag`. No source → the item is dropped, not written unlabelled.
  (`news-fairness.md` §1; enforced by `0011`.)
- **CN-R2 — neutral wording is linted, not promised.** Every written title and
  summary passes `verify-news-neutrality.ts`'s banned-term list. A row that
  fails is not written.
- **CN-R3 — the agent classifies, never editorialises.** It records what a
  source *is* (`factual_reporting` vs `opinion`, and its `lean_tag`). It never
  rates an article as biased, never summarises a candidate's position, and
  never writes a claim. The buckets belong to the retired S-plane.
- **CN-R4 — coverage is sought symmetrically.** R1 searches for **every**
  `ballot`-tier candidate in a race on every pass, with the same query shape and
  the same effort per candidate — even when a candidate reliably returns
  nothing. Asymmetric *searching* would manufacture the very imbalance
  `news-fairness.md` §2 measures. Per-candidate counts found are recorded.
- **CN-R5 — dedupe is the database's job.** `uq_news_item_url_candidate`
  (`0005`) already makes "same story, same candidate" impossible. Insert and let
  the constraint decide; never pre-query and branch.
- **CN-R6 — the ops plane is written on every run.** `INSERT agent_run` on
  start, `UPDATE` on finish with status / `items_written` / summary. If `0006`
  is absent, skip and note it — never fail the run (design.md fail-closed idiom).
- **CN-R7 — gated by default.** Agent-written news routes through
  `review_item` for operator approval before it is publicly readable, until the
  founder explicitly turns that off. Schema already supports it:
  `kind='manual_news'`, `source='agent:R1'`.
- **CN-R8 — degrade honestly.** No search backend, no network, no `0005` →
  a structured failure and `status='failed'` on the run row. Never a silent
  empty pass reported as success; `ok_empty` exists precisely for "ran fine,
  found nothing".

## 5. Tasks

**C0 gates everything.** Do not write an agent prompt from the inferences in §3.

| ID | Task | Verify |
|---|---|---|
| **C0** | Locate `CAP_Refresh_Agents_Plan` and the existing R1–R4 stored prompts (Cowork scheduled tasks + `.superpowers/sdd/` mirrors). Bring the plan into this repo, or record where it lives and what R1's current contract actually is | The R1 contract is quoted from a real artifact, not inferred; §3's table is confirmed or corrected |
| **C1** | Decide **where R1 runs**: keep it a Cowork scheduled task (ADR-001 posture, needs the operator's machine) or graduate it to a Vercel cron. design.md notes the queue survives either — but a hosted cron changes who holds the search API key | Written decision + rationale recorded here |
| **C2** | Source discovery: which search backend, and which sources are admissible. Reuse `allowlist_b_core`'s tier list rather than inventing a second source policy | A candidate query returns tier-classified results; off-list results are dropped, not flagged |
| **C3** | R1 write path: `source_register` → `news_item` insert with `candidate_id`, `item_type='candidate_news'`, `source_id`. Symmetric per-candidate search (CN-R4), dedupe by constraint (CN-R5) | Two runs over the same window produce identical rows; every row has a source; per-candidate counts logged |
| **C4** | Wording lint in the write path — `verify-news-neutrality.ts`'s matcher gates each row before insert (CN-R2) | A banned-term fixture is rejected before insert, not caught afterwards by the lint |
| **C5** | Ops-plane writes per CN-R6 + review-queue routing per CN-R7 | A run appears on the agents console; a written item lands in the approval queue; `0006`-absent path skips cleanly |
| **C6** | Backfill one real race end to end, then report per-candidate counts so `news-fairness.md`'s `N` can be chosen from data | Every `ballot` candidate in that race has been searched; counts recorded; `verify-news-neutrality.ts` passes live |

## 6. Open questions

- **Q1 — search backend + budget.** None is configured. T5 `web_search` in the
  S-plane was built "behind allowlist" with an injectable backend and degrades
  `not_configured`; whether R1 reuses that path or takes its own is C2's call.
- **Q2 — cadence.** The dispatcher runs `*/30 * * * *` (TASK-A14). How often
  should R1 itself sweep? Daily is likely enough for a news feed; every 30
  minutes is a cost decision, not a product one.
- **Q3 — election_news vs candidate_news.** `0005` allows both. Race-level
  stories that name no single candidate are `election_news` — but a story about
  two candidates in one race is ambiguous. Decide before C3.
- **Q4 — retention.** Nothing prunes `news_item`. The 2026-11-03 general will
  accumulate rows; `verify-news-neutrality.ts` already only lints a 30-day
  window, which hints at the intended shape.
