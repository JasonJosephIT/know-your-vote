# Candidate News — PRD

**Status:** Draft v1.2 · **Created:** 2026-09-06 · **Revised:** 2026-09-07 (§5–§7) · **Owner:** Jason (founder)
**Companion:** `news-fairness.md` (owns labelling + fairness rules; founder decision 2026-09-06, N2/N3 built),
`refresh-agents-plan.md` (the governing R1–R4 spec, brought into this directory by C0),
`agents/r1-candidate-news.prompt.txt` (snapshot of the live R1 contract),
`CAP_Runtime_PRD_v1.md` (the S-plane, now idle)

> **v1.1 note.** v1.0 was written from schema defaults and console docs
> because the R-agent spec could not be found. C0 found it. Several v1.0
> premises were wrong; the corrections are inline and the evidence is in §10.
> The one that matters most: **R1 already exists and has run four times.** It
> has written nothing because every candidate in the database is a demo
> fixture, not because nothing writes news.

> **v1.2 note (2026-09-07).** Three founder decisions added as §5–§7: news
> intake sweeps a fixed corpus of outlets rather than searching per candidate;
> association gains a `related` tier beside the deterministic name match; and
> the election news feed is scoped by county with a switcher. Together they
> cost **two columns on `news_item`** — migration `0016` — which is why the
> "schema cost: zero" line in §2 no longer holds.

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
| `verify-news-neutrality.ts` — banned-terms lint + self-test | `scripts/` | built; self-test and live lint green 2026-09-06; N6 (assert source + labels) pending |
| **N2 + N3** — feed API joins `source` and returns `publisher` / `type` / `lean_tag`; cards render them, opinion cards visually distinct | `src/app/api/news/route.ts`, `src/lib/news-labels.ts`, `src/components/features/NewsFeed.tsx`, `scripts/verify-news-labels.ts` | on `main` (PR #10, 2026-09-06); the PostgREST embed is unverified against a live DB |
| `verify-refresh-schema.mjs`, `verify-admin-ops.mjs` | `scripts/` | built; refresh-schema green live 2026-09-06 |
| Admin console Phase A1 (schema, auth, shell) | `main` (`2fcfc49`) | merged — the Agents page on `main` is the A4 placeholder |
| **Admin console Phases A2–A5** — `/api/admin/*` routes, agents run-request API (TASK-A13), `src/lib/admin/{effects,monitor,review}.ts`, **`src/lib/neutrality.ts`** (TASK-A05), `src/types/admin.ts` | on `main` via PR #14 (`admin/console-a2-a5`, reconciled 2026-09-06; it had lived only on `wip/raw-worktree`). PR #14 also scopes the console's two `race` reads to the active election | built |
| `cap-r0-dispatcher` (TASK-A14) | — | **does not exist** |
| Agent prompts v1.1: `agent_run` dual-write (TASK-A15) | — | **not applied** — no R prompt writes `agent_run`; 0 rows |
| `allowlist_b_core` — Tier-1/Tier-2 source classification | `Civic Awareness (Know Your Vote)/Agents/The Fact-Checker/` | built + tested |
| `candidate.ballot_status` (`ballot` / `write_in` / `excluded`) — what "ballot-tier" means | ingest branch `claude/data-architecture-ingest-plan-u9b1fq`, `data-architecture.md` D1, task A1 (`0010_general_election.sql`) | **designed, founder gate A0 open, migration not written** |
| Real candidate roster (22 ballot-tier candidates, 8 races) | ingest branch tasks B2 (parser) + B3 (official sites) | **not ingested** — live `candidate` has 29 rows, 29 demo |
| **County switcher parts** — `COVERED_COUNTIES`, `resolveCounty()`, a rendered county picker, `zip_district.county_fips` | `src/lib/resolve.ts`, `src/components/features/CandidateBrowser.tsx`, `0001` | **all exist** — only the news feed is county-blind (§7) |
| **Outlet corpus list** (`src/lib/news-sources.ts`) | — | **does not exist** (§5, C7) |

**Schema cost of this PRD (v1.2): two columns on `news_item`.** v1.0 and v1.1
said zero, and that was true of them. §6 adds `relation` and §7 adds
`county_fips`, both nullable, both additive — reserved as **`0016`** in
`supabase/migrations/README.md`. Nothing else in the news plane changes shape.
Two corrections to v1.0's numbering claim:

- Live migrations are `0000`–`0012` (`0009`–`0012` applied 2026-09-07; `0012`
  is `measure_function_search_path` from PR #13).
- Planned, not written: **`0013_general_election.sql`** (`candidate.ballot_status`,
  ingest A1) and **`0014_news_fairness.sql`** (agent news must carry a source,
  `news-fairness.md` §3 / N1). These have been renumbered twice (`0010`/`0011`
  → `0012`/`0013` → `0013`/`0014`) as other migrations landed first; the numbers
  are now reserved in `supabase/migrations/README.md`.

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
| **CN-R9** *(v1.2)* | Every candidate-scoped row records **how** it matched: `relation` is `named` (deterministic full-name match) or `related` (ambiguous). `related` attaches to **every** candidate the ambiguity admits, never to one picked by judgment. | **Met in code 2026-09-07 (C8)**, unwired: `0017` adds the column, `src/lib/news-match.ts` assigns it, the candidate page renders the tiers apart. Nothing calls the matcher in production yet — its inputs are C7's sweep (gates open) and a real roster (B2). |
| **CN-R10** *(v1.2)* | Coverage variance (`news-fairness.md` §2) is computed over **`named` rows only**. | **Met in code 2026-09-07 (C8)**: `namedCountsByCandidate()` is the denominator selection, and the guardrail proves that including `related` would move the variance from 1.00 to 0.75 on a fixture where one candidate has no coverage at all. The variance itself stays `balance_audit_core`'s (N5) — never reimplemented. |
| **CN-R11** *(v1.2)* | Every feed-eligible row carries a `county_fips`, or is explicitly statewide (`NULL`). The feed scopes to any county without a schema change. | **Met in code 2026-09-07 (C9)**, unpopulated in data: `0016` adds the column and index, `/api/news?county=` scopes on it, and the statewide clause now excludes county-scoped rows. No live row carries a county yet — the writers are C7's sweep and C8's matcher. |

**What §5 changes about CN-R4.** Under the corpus sweep, "same query pattern and
effort per candidate" stops being an instruction the agent is trusted to obey
and becomes a property of the design — one pool, one matching rule, applied to
everyone. The prompt line stays; it just stops being the enforcement mechanism.
That is the same trade CN-R2 and CN-R5 already make (lint and unique index over
prose).

## 5. News intake: sweep a fixed corpus, don't search per candidate

**Founder question (2026-09-07):** *"When it comes to our news intake, would
having a large pool of local news channels and papers, and then having a
biweekly scan of those, mean we have actual articles that the refresh agent can
use, or that the refresh agent can look for news articles from those
preselected sites?"*

**Decision: the first one — sweep the pool, then match.** R1 stops asking a
search engine about each candidate and starts reading a fixed list of outlets,
then matches what it finds against the roster (§6).

### Why, in two arguments

1. **Symmetry becomes structural instead of promised.** R1's Constitution 5
   says *"search every candidate in a race with the same query pattern and
   effort."* Under per-candidate search that promise **cannot be verified from
   the outside**: an opaque ranker decides what comes back, so per-candidate
   count variance measures the ranker at least as much as it measures the
   press. Under a sweep, every candidate is matched against the **same pool by
   the same rule**, so equal effort is a property of the design rather than an
   instruction the agent is trusted to follow. This is the move S1 made when it
   removed identity from the tool arguments (ADR-R1): make the guarantee
   unforgeable rather than well-worded.
2. **The corpus is the denominator.** `news-fairness.md` §2 asks for
   `(max-min)/max` variance over items-available-per-candidate, and reports it
   publicly. A variance number over per-candidate search results has no
   denominator — "14 stories for one, 3 for another" out of *what*? Over a
   swept corpus it does: out of the N articles the listed outlets published in
   the window. Without the corpus, the one number `news-fairness.md` promises
   to publish means nothing.

### What this is not

It is **not** evidence that R1's current search backend is broken. C0 found
four runs and a 26-row zero table, and that zero is the **roster** blocker
(§1), not a search failure — the three WebSearch spot-checks worked and
correctly found that the demo people don't exist. This is a change of
*mechanism for a property we want to be able to prove*, and it is a real
change to a live scheduled task, so it needs the founder's go the same way any
prompt edit does (§3).

### Shape of the sweep

| Decision | Choice | Why |
|---|---|---|
| **The list** | A frozen in-repo module, `src/lib/news-sources.ts`, one row per outlet: domain, publisher name, `type`, `lean_tag`, `county_fips`, feed URL. Changes land by PR with a stated reason — Allowlist B's discipline (`data-architecture.md`, `allowlist_b_core`). | The list *is* the editorial decision. In the repo it is reviewable, diffable and blameable; in a prompt it is none of those. |
| **Retrieval order** | RSS/Atom → `sitemap.xml` / news sitemap → HTML listing page → search API. Take the first that works per outlet and record which. | RSS is published *for* syndication: cheapest, most stable, least likely to break or to be unwelcome. Scraping is the fallback, not the plan. |
| **Window** | Publish date within the last 14 days, same as R1 today. | Unchanged; the sweep changes where articles come from, not how fresh they must be. |
| **What is stored** | Title, dek/summary, canonical URL, publish date, outlet. **Never the full article text.** | Copyright, and the cards only ever show a headline plus a line. Storing more creates an obligation with no product behind it. |
| **Where sweep results live** | Nowhere new. One run sweeps, matches (§6), and inserts; the pool is in-run memory. | YAGNI. A `news_corpus` staging table is the change to make *if* the sweep and the match ever run on different schedules — not before. |
| **`lean_tag`** | Assigned **once per outlet, in the list**. The agent never classifies an article. | Closes CN-R3 by construction: there is nothing left for the agent to editorialise about. |

### Cadence — biweekly is now too slow

The general is **2026-11-03**. Registration closes **2026-10-05**; early voting
runs **2026-10-24 – 10-31**. R1's cron is `0 9 1,15 * *` — on the 15th of
October a voter can already have voted before the next sweep. Recommended, for
the founder to apply (editing a live scheduled task is a config change, §3):

| Window | Cadence |
|---|---|
| now → 2026-10-04 | weekly |
| 2026-10-05 → 2026-11-03 | daily |
| after 2026-11-03 | back to biweekly |

A sweep costs one pass over the outlet list regardless of roster size, so
tightening the cadence scales with the press, not with the 26 candidates —
which is the other reason the sweep is the affordable option.

### The honest cost

A story on an outlet that is not on the list is **invisible**, and no amount of
searching inside a run will find it. That is a real loss of recall. It is also
the point: the boundary is a file in the repo that anyone can read and argue
with, rather than a ranker nobody can inspect. Recall is traded for an
auditable denominator, deliberately. The remedy for a missed outlet is a PR.

---

## 6. Association: a hard name match, and a `related` tier

**Founder direction (2026-09-07):** keep the deterministic name match, and add
a second tier — *"if it's a bit ambiguous, we can still relate to that user
rather than requiring a hard match."*

### Storage: no join table, no new table

`0005` already made this legal:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_news_item_url_candidate
  ON news_item (url, (COALESCE(candidate_id, ''))) WHERE url IS NOT NULL;
```

The key is `(url, candidate_id)`, not `url` — **the same article may already
exist once per candidate**, plus once with `candidate_id NULL`. So one article
matched to three candidates is three `news_item` rows, and nothing needs to be
built for that. The only addition is a column saying *how* each row was
matched:

```sql
ALTER TABLE news_item ADD COLUMN relation TEXT
  CHECK (relation IN ('named','related'));   -- NULL for non-candidate rows
```

### The two tiers

| Tier | Rule | Attaches to |
|---|---|---|
| **`named`** | The candidate's **full name** appears in the title or dek. One rule, applied identically to every candidate. | that candidate |
| **`related`** | Either (a) the article is about the race, office, jurisdiction, or a measure on that ballot and names no candidate; or (b) it names a person-token that matches a candidate without being a full-name match — surname only, a nickname, `title + surname`. | **every** ballot-tier candidate the ambiguity admits |

That second column is the load-bearing part. `related` never resolves ambiguity
by picking the most likely candidate — a judgment call there would reintroduce
exactly the editorial discretion this project removes, one row at a time.
Ambiguity resolves **toward symmetry**: a race story attaches to everyone in
the race; a "Commissioner Smith" story attaches to every Smith it could mean.
Case (b) attaches to one candidate only when exactly one candidate could match,
and it is still `related`, because the match was not deterministic.

Explicitly out of scope for v1: embedding similarity, topical relevance
scoring, or any model judgment about whether an article "feels" like it is
about someone. Two values, one column, deterministic rules.

### Display and slots

- The candidate page shows **`named` cards first**, then `related` under a
  labelled divider — *"Also about this race"*. A voter must never read a
  race-level story as one that named the candidate. Never mixed silently.
- `news-fairness.md` §2's `N` slots fill from `named` first; `related` fills
  what is left. Showing a real race story beats showing an empty rectangle,
  and it beats padding with an older `named` item from a different window.
- Shortfall is still stated: *"No stories naming this candidate in the last 30
  days"* is different from, and more informative than, an empty page.

### The audit rule that keeps this honest

> **Coverage variance is computed on `named` rows only.**

`related` rows are, by construction, equal across a race — every candidate gets
them. Feeding them into `balance_audit_core` would drag `(max-min)/max` toward
zero and make coverage look fairer than the press actually was. The `related`
tier exists to fill a voter's page, **not** to improve the number we publish
about ourselves.

### What this replaces

Q3's answer ("a race-scoped story becomes `election_news` with `candidate_id
NULL`") still stands **for the feed** (§7), but it is no longer the whole
answer for the candidate page: the same article now also gets a `related` row
per candidate. Write the `candidate_id NULL` row only for articles that matched
**no** candidate at any tier — otherwise the feed's URL dedupe (§7) covers it
and the extra row is waste.

---

## 7. The election news feed, filtered by county

**Founder direction (2026-09-07):** everything the sweep finds also lands in an
election news feed that is *"filtered based on your given location county and
can be changed if you want to look into another county."*

### Most of the switcher already exists

| Piece | Where | State |
|---|---|---|
| County list — `{ fips, name, metro }` × 4 | `src/lib/resolve.ts` `COVERED_COUNTIES` | exists |
| `resolveCounty(countyFips)` → races for that county | `src/lib/resolve.ts` | exists, used by `YourRaces.tsx` |
| A rendered county picker off that list | `src/components/features/CandidateBrowser.tsx` | exists |
| ZIP → county | `zip_district.county_fips CHAR(5) NOT NULL` + `county_name` | seeded |
| The feed's scope filter | `/api/news` `metro` + `race_id` + statewide | **county-blind** |

So this is a plumbing task, not a design task. The feed is the one surface that
never learned about counties.

### The one schema addition

```sql
ALTER TABLE news_item ADD COLUMN county_fips CHAR(5);   -- NULL = statewide
CREATE INDEX idx_news_item_county ON news_item (county_fips, published_at DESC);
```

**Keep `metro`.** It has live rows and `idx_news_item_scope` depends on it;
dropping it is a separate decision with no benefit here. But `county_fips` is
the **durable** key: `zip_district` is already keyed on it, the DoE files are
keyed on it, and it grows to 67 counties, whereas `metro` is a four-value
display grouping that cannot.

Population: a candidate-scoped row inherits the county of its race; an
unmatched `election_news` row takes the county of the outlet that published it
(the outlet list carries `county_fips`, §5); genuinely statewide items stay
`NULL`.

### API and UI

- `/api/news?county=12086`, alongside the existing `zip` / `metro` / `district`.
  The PostgREST scope list gains `county_fips.eq.<fips>`; statewide stays the
  `race_id is null and metro is null` clause, extended with `county_fips is
  null`.
- `resolveZip` already **selects** `county_fips` and returns only `county_name`
  — return the FIPS too, so a ZIP lands the voter in their county with no
  lookup by name.
- The feed selects **both** `election_news` and `candidate_news` and
  **dedupes on `url`**, so a story matched to three candidates is one card in
  the feed and three cards across three candidate pages.
- The switcher reuses `COVERED_COUNTIES` and the `CandidateBrowser` picker
  pattern. Default to the stored location's county.

> **Switching county is a view, not a move.** Looking at Broward must not
> overwrite the device's stored location — the voter is reading about another
> county, not relocating. Keep it in component state (or a `?county=` search
> param), never in `readLocation`/`writeLocation`.

**Amended 2026-09-07 (C9).** There is no device location store any more —
TASK-070 removed `kyv.location` and the `useSyncExternalStore` dance that read
it, and the feed now requests the statewide scope with no parameters. So the
rule above is satisfied by construction rather than by discipline: there is
nothing to overwrite. Two consequences: the default is **statewide**, not "the
stored county" (which is also the honest default the page copy already
claims), and the choice lives in `?county=` — shareable, reload-stable, and
working without JavaScript, which localStorage never was.

### Honest limit

`COVERED_COUNTIES` has four rows, so *"switch to another county"* means four
counties until the roster and the outlet list grow. `county_fips` is precisely
the column that lets it reach 67 without a second migration.

---

## 8. Tasks

- [x] **C0** — Locate `CAP_Refresh_Agents_Plan` and the R1–R4 stored prompts; bring
  the plan into the repo; quote R1's real contract; confirm or correct §3.
  ~ Done 2026-09-06: plan found on the operator's Mac and on branch
  `wip/raw-worktree` (it had never reached `main`; PR #14 lands it); extracted to
  `docs/general-election/refresh-agents-plan.md`. Stored R1 prompt read via
  `list_scheduled_tasks` → `SKILL.md`, diffed against `.superpowers/sdd/`
  mirror (identical), snapshotted to `agents/r1-candidate-news.prompt.txt`.
  §3 table confirmed for R1/R2/R4, corrected for R3. Evidence in §10.

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

- [ ] **C7** *(v1.2)* — Build the outlet corpus and the sweep (§5).
  `src/lib/news-sources.ts`: one frozen row per outlet — domain, publisher,
  `type`, `lean_tag`, `county_fips`, feed URL, retrieval mode. Then the sweep
  itself: RSS/Atom → sitemap → listing page, 14-day window, title + dek + URL +
  date + outlet, no full text, results held in-run.
  Verify: two sweeps over the same window return the same article set; an
  off-list domain never appears; every returned article carries a publisher,
  `type` and `lean_tag` taken **from the list**, never from the agent.
  **Not blocked on the roster** — the sweep has no candidates in it. This is
  the one v1.2 task that can start today.
  ~ **Mechanism done 2026-09-07; two data gates open.** Shipped
  `src/lib/news-sources.ts` (23 outlets across the four counties + statewide,
  host matching copied in behaviour from `allowlist_b_core`, shorteners
  blocked), `src/lib/news-sweep.ts` (RSS 2.0 + Atom parsing, 14-day window,
  URL normalisation, dedupe, deterministic ordering — pure, no network, no
  clock), `scripts/verify-news-sweep.ts` (offline; pins C7's three acceptance
  clauses and both gates) and `scripts/news-sweep.ts` (`--probe` to discover
  feeds, default to sweep). Verify passes and was mutation-checked: breaking
  the boundary check, the lean gate, dedupe, the window floor, `utm`
  stripping, the label-boundary host rule, or feed-supplied attribution each
  makes it fail. One redundant line was deleted when a mutation proved it
  changed nothing.
  **`usableOutlets()` returns 0 by design** — every outlet ships with
  `leanTag: null` and `feed: null`, and the sweep fail-closed skips both:
    - **Gate C7-a (`leanTag`)** — founder. Assigning a lean to a named news
      organisation is an editorial act with a real reputational cost for a
      nonpartisan product; it is not something a coding agent should assert
      from memory. Each entry carries a `leanBasis` saying what would settle
      it. Nothing renders until these are filled.
    - **Gate C7-b (`feed`)** — local session. A feed URL that 404s fails
      silently and looks exactly like "no news this week", and the session
      that wrote the list had no egress to check one. `--probe` fills these.

- [ ] **C8** *(v1.2)* — Association: `named` + `related` (§6, CN-R9/CN-R10).
  Migration `0016` adds `news_item.relation`; the matcher assigns it; the
  candidate page renders `named` first and `related` under an *"Also about this
  race"* divider; slot-filling takes `named` first; `balance_audit_core` is
  called on `named` counts only.
  Verify: a race-level article produces one row per ballot candidate, all
  `related`; a full-name article produces exactly one `named` row; a
  surname-only collision attaches to both candidates; variance computed with
  and without `related` differs, and the reported number is the `named` one.
  **Blocked** on roster (C6's blocker) for a live run; the matcher itself is
  fixture-testable now.
  ~ **Done as code 2026-09-07; nothing calls it yet.** `0017_news_relation.sql`,
  **applied live the same day** — `relation TEXT` nullable, CHECK admits only
  `named`/`related`, plus `idx_news_item_candidate_relation`. Verified over
  the wire: `is_nullable=YES`, the CHECK reads
  `relation IS NULL OR relation = ANY (ARRAY['named','related'])`, the index
  exists, and all 10 live rows carry NULL — correct, since they predate the
  matcher and sort with `named` rather than into a tier they were never
  given. (This one did not need applying first, unlike `0016`:
  `fetchCandidateNews` selects `*`, so a missing column would have read as
  absent rather than 500ing.)
  `src/lib/news-match.ts` is the matcher: full-name match allowing only the
  candidate's **own** middle tokens or their initials between first and last
  (so "Maria met John Smith" is not a match for Maria Smith), accent folding,
  honorific and suffix stripping, and — the subtle one — full-name spans are
  **masked before the surname pass**, so naming Maria Vasquez does not spray
  `related` rows across every other Vasquez on the ballot.
  `namedCountsByCandidate()` is CN-R10: a selection, not a calculation, since
  the variance stays `balance_audit_core`'s. Every roster candidate appears,
  including at zero — the candidate the press ignored is the widest gap in the
  report and must not be dropped from it.
  `CandidateNews.tsx` renders `named` first, then `related` under an "Also
  about this race" heading with a sentence saying these did not name the
  candidate; `briefs.ts` sorts `named` ahead of `related` (stable, so recency
  still decides within a tier) and NULL-relation rows sort with `named`
  because they are pre-matcher R1 output, not a tier they were never given.
  Shortfall is stated where `named` is empty.
  Verified: `node scripts/verify-news-match.ts` (new, mutation-checked — six
  mutations, including "`related` picks only when unique", "do not mask
  resolved full names", "count `related` rows in the audit", "drop
  zero-coverage candidates", "attach the race story even when someone is
  named", and "allow any filler between first and last", each makes it fail);
  `verify-migrations.mjs` (four new invariants, mutation-checked against a
  third tier, a NOT NULL default, and no constraint at all); the other three
  news guardrails; `npx tsc --noEmit`; `npm run build`.
  **Still not done:** nothing calls `matchArticle()` in production. The writer
  is R1's sweep → match → insert, and both its inputs are gated — C7's outlet
  list needs `leanTag` and `feed` filled, and the roster is still 29 demo
  rows until B2. `N` (the per-candidate slot count) is still unchosen, so the
  ordering rule ships and the cap does not — picking `N` before N5 measures
  anything would be a guess.

- [ ] **C9** *(v1.2)* — County-scoped feed + switcher (§7, CN-R11).
  Migration `0016` adds `news_item.county_fips` + index; `/api/news` takes
  `county`; `resolveZip` also returns `countyFips`; the feed selects
  `election_news` **and** `candidate_news` deduped on `url`; the switcher
  reuses `COVERED_COUNTIES` and does **not** write the device location.
  Verify: `?county=12011` returns Broward + statewide and excludes
  Miami-Dade-only items; a story matched to three candidates appears once;
  switching county then reloading the app returns the voter to their own
  county. **Not blocked** — the four live `election_news` rows are enough to
  test the filter.
  ~ **Done 2026-09-07.** `0016_news_county.sql`, **applied live the same day**
  (`county_fips CHAR(5)` nullable + `idx_news_item_county`; verified over the
  wire: `character(5)`, `is_nullable=YES`, index present, and all 10 existing
  rows read NULL so the statewide bucket still holds the same 3); `/api/news` takes
  `?county=` validated against `COVERED_COUNTIES`, adds `county_fips.eq.` to
  the scope list, and — the regression that would otherwise be invisible —
  the statewide clause now reads `race_id IS NULL AND metro IS NULL AND
  county_fips IS NULL`, so one county's news cannot reach the whole state.
  `resolveZip`/`resolveCounty` return `countyFips` (already selected; callers
  no longer look it up by name). `src/lib/news-feed.ts` `dedupeByUrl()` makes
  one story one card and, when the story spans several candidates, drops the
  candidate link rather than picking one — the same discretion §6 removes from
  the matcher would otherwise come back one card later. The switcher is a
  plain GET form on `/news`, matching `CandidateBrowser`'s picker.
  Verified: `node scripts/verify-news-feed.ts` (new, mutation-checked — no
  dedupe, no no-claim rule, merging null URLs, and losing spread fields each
  make it fail); `node scripts/verify-migrations.mjs` (three new invariants,
  mutation-checked against NOT NULL, wrong width, renamed index);
  `npx tsc --noEmit`; `npm run build`.
  Two honest notes: the `.limit(50)` counts **rows, not cards**, so once C8
  lands a three-candidate story spends three of them; and `/news` moved from
  static to server-rendered because it now reads `searchParams` — the page
  shell is tiny and the feed was always client-fetched, so the cost is a
  round trip, but it is a real change.
  The apply had to come **before** the merge: `/api/news` selects
  `county_fips`, and against a database without it PostgREST errors and the
  feed returns its 500 path — a green build proves nothing about that.

**External prerequisites (not C-tasks, but on the critical path):**

1. ~~`reconcile-git.sh`~~ — done 2026-09-06 as PR #14: admin console A2–A5
   and the plan HTML are on `main`. The July run reports were gitignored by
   that PR's `.gitignore` (script default) and are tracked since 2026-09-07 at
   `Civic Awareness (Know Your Vote)/Agents/RunReports/`.
2. Ingest
   branch `claude/data-architecture-ingest-plan-u9b1fq` — A0 (founder decides the
   three-tier `ballot_status`), A1 (migration `0013`), B2 (parser writes real
   candidates), B3 (official sites). Until B2 lands, every R1 run will keep
   writing honest zeros, correctly.

## 9. Open questions

- **Q0 — `news-fairness.md`.** *Answered:* it landed on `main` with PR #10
  (`docs/general-election/news-fairness.md`) after C0 had searched for it. Its
  §1 is the labelling rule CN-R1/CN-R3 implement, §3 is migration `0014`, and
  its §5 names this PRD as the producer.
- **Q1 — search backend + budget.** *Answered by C0:* R1 uses the Claude
  app's web search; there is no separate API key or budget line. Cost is
  Cowork session time. The T5 `web_search` path in the S-plane is not involved.
  **Superseded by §5 (v1.2):** the backend becomes a sweep of a frozen outlet
  list; the Claude app's search stays available for spot-checks, not for
  discovery.
- **Q2 — cadence.** *Answered:* plan §8 Q1 default — every two weeks, 1st and
  15th at 09:00. The dispatcher's `*/30` cadence (A14) is for on-demand
  requests, not sweeps. **Reopened by §5 (v1.2)** — biweekly misses early
  voting; see Q8.
- **Q3 — `election_news` vs `candidate_news`.** *Answered by plan §4.2:* a
  story naming two candidates in one race becomes either one neutral item per
  candidate or one race-scoped item, never one item centring one candidate's
  view of the other. Race-scoped ⇒ `election_news` with `race_id` set,
  `candidate_id NULL`. **Amended by §6 (v1.2):** that remains the feed's row,
  but a race-scoped story now *also* gets a `related` row per ballot candidate
  so it reaches the candidate page. Write the `candidate_id NULL` row only when
  an article matched no candidate at any tier.
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
- **Q7 — "briefs retired".** *Answered:* the decision is recorded at the top
  of `news-fairness.md` (founder, 2026-09-06, reversible). The candidate page
  still renders `CandidateBrief` until N4 replaces it, and `docs/scope-changes.md`
  has no entry yet — worth one line there since that file is the errata index.
- **Q8 — sweep cadence, and who changes it. (new, v1.2)** §5 recommends
  weekly now and daily from 2026-10-05. R1's cron is `0 9 1,15 * *` and lives
  in a Cowork scheduled task on the operator's Mac; per §3 this PRD drafts and
  stops. Founder decision, and it has a deadline: the 10-15 sweep is the last
  one before early voting opens.
- **Q9 — retrieval fallback for outlets with no feed. (new, v1.2)** §5 orders
  RSS → sitemap → listing page → search API, but does not say what to do with
  an outlet where all four are hostile (JS-only listing, aggressive bot block).
  Options: drop the outlet from the list (honest, loses a real local paper), or
  keep a narrow per-candidate search for exactly those outlets (recovers
  recall, reopens the denominator hole for that slice). Decide when C7 finds
  the first one; do not pre-solve.

## 10. C0 evidence (2026-09-06)

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
SELECT version, name FROM supabase_migrations.schema_migrations; -- 0000..0008 on 2026-09-06 (0009..0012 applied 2026-09-07)
SELECT source_id FROM news_item WHERE item_type='election_news'; -- all NULL
```

Scheduled tasks (`list_scheduled_tasks`): four `cap-r*` tasks, all enabled;
`cap-r1-candidate-news` cron `0 9 1,15 * *`, lastRunAt `2026-09-01T13:09:01Z`,
nextRunAt `2026-09-15`. No `cap-r0-dispatcher`.

Prompt fidelity: `diff <(SKILL.md body) .superpowers/sdd/r1-scheduled-prompt.txt`
→ trailing-newline only.

Run reports (tracked on `main` at `Civic Awareness (Know Your Vote)/Agents/RunReports/`):
`2026-07-03-R1-DRYRUN.md` (0005 unapplied + fixture roster),
`2026-07-06-R1.md` (0005 applied; 26/26 zeros; three WebSearch spot-checks found no such people),
`2026-07-15-R1.md` (26/26 zeros; all 29 `candidate.fec_id IS NULL`, sites `example.org/demo/*`).

Baseline on this branch, 2026-09-06: `verify-refresh-schema.mjs` 7/7 ok (live);
`verify-news-neutrality.ts --self-test` all ok; live lint "0 agent-written
rows in the last 30 days" ok. `verify-migrations.mjs` **could not run on this
Mac** — PGlite aborts under Rosetta (`node` here is x64: "rosetta error:
target for 19-bit branch is out-of-range"). Pre-existing environment issue,
not a regression; run it on arm64 node or in CI.
