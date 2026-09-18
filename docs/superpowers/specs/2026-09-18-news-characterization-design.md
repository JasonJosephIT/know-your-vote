# Model characterization of swept articles — design

_Written 2026-09-18, answering `docs/general-election/news-characterization-BRIEF.md`.
Branch `claude/determined-nobel-a8886d`, base `ea2fe76` (main). No code written._

**Status: D1 resolved 2026-09-18 — option A, C dropped (§2.1). D2 narrowed the same
day: the founder has Jev access, so the engine question is now which to build
*first*, not whether one exists (§2.2).** Everything in this document is decided
and buildable.

---

## 1. Corrections to the brief

The brief is accurate about the constraints and wrong about five facts. Each was
checked against the repo, not against the brief's summary of it.

### 1.1 An issue taxonomy already exists — twice

The brief: *"Which issue(s) it relates to — nothing does this today. There is no
issue taxonomy anywhere in the repo."* There are two.

| Taxonomy | Where | Shape | State |
|---|---|---|---|
| **Quiz issues** | `src/lib/quiz-questions.ts` | 8 statewide ids + titles: `economy`, `education`, `healthcare`, `housing`, `environment`, `immigration`, `insurance`, `safety` (plus `free-response`, not an issue) | **Live, voter-facing, neutrally worded under TASK-032** |
| **`issue` table** | `0000_pipeline_read_models.sql:66` | `issue_id` PK, `race_id` **NOT NULL**, `tier IN ('spine','candidate')`, `title`, `display_order` | Demo-seeded only; pipeline-owned; idle since briefs were retired |

This changes G3 from "write a list" to "reuse, extend or fork", and it changes the
answer. See §4.1.

### 1.2 The brief's single output schema should be two units

The brief proposes one call returning `{issues, candidate_suggestions, abstain}`.
Splitting them is strictly better, because **issue tagging needs no roster**:

- Issue tagging: input is the taxonomy + the article's title/dek. No candidate
  names, no races, no parties, no outlet lean. Identity never enters the request.
- Candidate suggestion: input must contain the roster, and output must be
  operator-gated.

Bundled, the safe half cannot ship until the risky half's gates close, and the
roster must sit in every prompt for no reason. Split, Unit 1 ships independently —
including **independently of ingest B2**, contrary to the brief's "the real roster
… blocks any live evaluation". That is true of Unit 2 only.

### 1.3 "Temperature 0" now selects the model

The brief specifies "Temperature 0". Among current Anthropic models, `temperature`
is **removed and returns a 400** on Sonnet 5, Opus 5, Opus 4.8, Opus 4.7 and the
Fable family. It is still accepted on **`claude-haiku-4-5`**. So on the Anthropic
branch the brief's own constraint picks the model; `claude-sonnet-5` — the model
`src/lib/quiz.ts:172` already uses — cannot honour it.

### 1.4 Option B needs a migration, not just a payload shape

The brief: *"`review_item` rows, type to be added"*. `review_item.kind` is
CHECK-constrained to six values (`0006_admin_ops.sql:59`). A new kind is a
constraint change on a live table, plus a zod payload in `src/types/admin.ts`, plus
an entry in the fixed server-side effects map (`src/lib/admin/effects.ts`) — that
map is the security boundary and refuses anything not planned in it.

### 1.5 The next free migration number is 0027

`supabase/migrations/README.md` shows 0026 applied and 0019 reserved-unwritten.
Claim 0027 in the ledger in the same PR as the file, per that file's rule 2.

---

## 2. The two open founder decisions

### 2.1 D1 — Authority (gate G1) — **RESOLVED: A, C dropped**

Founder, 2026-09-18: *"A now, drop C."*

**A — issue tags only.** `news-match.ts` keeps owning `named`/`related`.
CN-R4's structural guarantee and CN-R10's denominator are untouched. No PRD §6
revision is needed or wanted. This is §4.

**C is dropped**, not deferred. The model does not decide candidate attachment.
Recorded here so a later session does not reopen it as an obvious extension: the
reason C was on the table at all is that the regex misses nicknames and "the
incumbent", and the answer to that is §5's operator-gated suggestions, never a
model writing `candidate_id`.

Unit 2 (§5) is unaffected by this answer — it was gated on D1 **and** Q5, and Q5
is still open. Nothing in Unit 2 is C: a suggestion an operator approves is not
the model deciding attachment.

### 2.2 D2 — Which "System 1" (new; not in the brief)

The brief reads the founder's "System 1" as Kahneman's fast/cheap metaphor. The
founder asked whether "model" meant an Anthropic model or **System One** — which
is a real product: TypeSafe's, whose flagship model is **Jev**, returning typed
judgments and probabilities instead of generated text. There is a `typesafe-ai`
skill installed in this session.

It fits this task unusually well. The brief's `[{id, confidence}]` output is
TypeSafe's **Noul** primitive almost exactly — "define one Noul per label" is the
documented multi-label recipe, returning `{"type":"noul","noul":0.93}` per label.

**Correction to something said earlier in this session:** System One's
probabilities were described as "trained to be calibrated". The skill says the
models are trained for calibrated decisions, but `docs.typesafe.ai/confidence.md`
does **not** document calibration — it says to start with conservative thresholds
and validate on your own data. The honest statement of the advantage is narrower,
and it is in §4.4.

**Updated 2026-09-18: the founder has Jev access, and the pricing and limits are
published after all** (on `docs.typesafe.ai/models.md`, not a pricing page — two
claims made earlier in this document's session were wrong and are corrected in
§4.4). `jev-1.13.0` (alias `jev-latest`) is the only System One model; the same
weights serve every account.

**Recommendation: keep the engine a seam, but build the TypeSafe arm first and
build the Anthropic arm only if the evaluation is unsatisfying.** Three reasons,
in order of weight:

1. **Noul is literally this task's primitive.** "Define one Noul per label" is the
   documented multi-label recipe. The Anthropic arm reaches the same shape by
   constraining a text model with a tool schema and a validator.
2. **There is no free-text channel to police.** A Noul returns a number. A lean,
   a summary or a sentiment cannot be emitted even if the question text is wrong.
   §4.4 expands on why that is worth more here than in most products.
3. **~100× cheaper** (§4.5) — not decisive on its own, since both are cheap in
   absolute terms, but it stops mattering entirely if the sweep goes daily and
   the pool grows.

Building both adapters up front would double the work to answer a question the
first arm's numbers may settle on its own. The seam stays so the second arm is a
~40-line addition whenever it is wanted.

---

## 3. Architecture

Two units, built in order, with a shared pure core.

```
                    ┌─────────────────────────────────────────┐
  sweep pool  ──►   │ news-match.ts  (deterministic, today)    │ ──► news_item rows
  (title/dek)       └─────────────────────────────────────────┘     (named / related)
                                      │
                                      │  ONLY stored rows, never the raw pool (§4.2)
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │ news-characterize.ts  (pure)            │
                    │   buildQuestions(article, taxonomy)     │
                    │   validate(response)  → threshold/abstain│
                    └─────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    ▼                                     ▼
       engine: typesafe (built first)          engine: anthropic (only if §6
       jev-latest, one Noul per issue           item 6 asks for it)
                    │                                     │
                    └─────────────────┬───────────────────┘
                                      ▼
                          news_item.issues text[]  (Unit 1)
                          review_item suggestions  (Unit 2, gated)
```

**Unit 1 — issue tagging.** This is the work. Not blocked on B2, on the `leanTag`
sign-off, or on Q5.

**Unit 2 — candidate suggestions.** Blocked on Q5 (reverse `design.md` §7 so agent
news may enter `review_item`). Specified in §5, not built.

---

## 4. Unit 1 — issue tagging

### 4.1 Taxonomy (gate G3) — **REOPENED 2026-09-18, founder reviewing**

> **This section's decision was premature and is withdrawn.** It closed G3 on the
> strength of two taxonomies. There is a **third** — `CAP_Issue_List_FL_2026_v1.md`,
> a sourced, balance-checked, versioned 15-issue research artifact — and
> `CAP_Change_Spec_Stances_and_RelatedNews_v1.md` §14.3 already records the common
> issues set as an open question. Four CAP issues (A7 elections administration,
> B4 Social Security/Medicare, B5 abortion, B6 election integrity) have **no quiz
> equivalent**, so under the quiz's list those articles are untaggable and return
> `{}` — a silent hole that looks like a working system.
>
> The options, the full mapping and the recommendation are in
> `docs/general-election/news-issue-taxonomy-options-2026-09-18.md`.
> **Founder is reviewing. Task 1 of the plan is blocked until this is answered.**
>
> Everything below is retained as the argument for the quiz-list option, which is
> Option 2 in that document. The rest of this spec is taxonomy-agnostic: the core,
> the migration, the adapter, the runner and the evaluation all iterate whatever
> `ISSUES` contains, so no other section changes whichever list wins.

**Withdrawn decision (now Option 2): promote the quiz's issue list to
`src/lib/news-issues.ts` as the single frozen taxonomy.** One list, two consumers.

Why this and not a new list:

- It is **already founder-approved and already voter-facing.** TASK-032 authored
  it under explicit neutrality rules ("no leading language, no valence words").
  A second list would put two issue vocabularies in front of the same voter.
- It buys a real feature for free: a voter's quiz answers and their news tags
  share ids, so "news on the issues you picked" is a query, not a project.
- It is statewide. The `issue` table is **race-scoped** (`race_id NOT NULL`) and
  cannot hold a statewide news taxonomy without a schema change; it is also
  pipeline-owned and idle. Leave it alone.

Shape — `{ id, label, aliases[] }`, one row per issue, PR-reviewed:

```ts
export interface NewsIssue {
  /** Stable id. Shared with QUIZ_QUESTIONS[].id — never renamed, only added to. */
  id: string;
  /** Voter-facing label. Neutrality-linted; no valence words. */
  label: string;
  /** Surface forms that mean this issue, for the prompt and for the lint. */
  aliases: readonly string[];
}
```

Guardrail (`scripts/verify-news-issues.ts`): unique ids, non-empty labels, no
lean-shaped words in any label or alias (reuse `verify-news-neutrality.ts`'s banned
list), and — the load-bearing one — **every `QUIZ_QUESTIONS` id except
`free-response` has a matching `NewsIssue`**, so the two cannot drift.

**Ballot measures are not issues.** The brief's G3 asks whether Amendment 1 and
Amendment 3 belong in the taxonomy. They do not: `ballot_measure` already exists
(`0010_ballot_measure.sql`) with `measure_id`, `number`, `official_title`. An
article about Amendment 3 attaches to the measure. Modelling amendments as
pseudo-issues would duplicate a table that already holds them and would make the
taxonomy churn every election. Measure attachment is out of scope for Unit 1;
noted here so it is not silently absorbed into the issue list.

**The taxonomy is versioned.** `TAXONOMY_VERSION` is a constant bumped in the same
PR as any change, and it is recorded on every characterized row (§4.6). A tag
written under v1 must be distinguishable from one written under v2.

### 4.2 Input (gate G2) — title + dek, never a body; and only stored rows

**Decision: title + dek + URL slug. Never fetch an article body.** This upholds
PRD §5's "never the full article text", and it respects what the verification doc
§3 item 4 recorded: Tampa Bay Times, WFLA, Florida Phoenix, WESH, Miami New Times
and both Sentinels disallow `anthropic-ai` / `ClaudeBot` by name, and Hearst's
terms prohibit automated aggregation. Reading a headline the publisher pushed into
a syndication feed is what RSS is for; issuing a *second* request to that host for
the body is the act those lines address. If G2 is ever reopened, it needs a
per-outlet `bodyFetch` permission beside `robots`, defaulting false — not a global
switch.

**Decision: characterize what gets stored, not what gets swept.** The brief treats
the sweep pool as the input. It should not be. The Sentinel news sitemaps return
~115–130 URLs *per paper per day*, including obituaries and wire sports
(verification §3 item 5); over a 14-day window that is ~3,400 URLs, most of which
will never become a `news_item`. The characterizer runs on rows the matcher
already attached (`named` or `related`) plus the race-scoped feed rows — the pool
that is actually the product. This is cheaper, and it keeps the issue-tag
distribution measured over the same rows the coverage numbers are measured over,
which §6 depends on.

**Sitemap-retrieved articles have no dek** — title and slug only. That is a real
input floor, and §6 reports those rows separately rather than averaging over them.

### 4.3 Symmetry — and an honest limit

Under Unit 1 the request contains the taxonomy and the article's title/dek. It
contains **no roster, no candidate name, no race, no party, no outlet, and no
lean**. Per-candidate symmetry is therefore not a property to be audited; it is
not expressible in the request. This is strictly stronger than ADR-R1, which
removed identity from tool *arguments* — here identity never enters the call.

**The honest limit:** candidate names appear *inside* the headline we pass, and
stripping them would mangle the text. So identity is absent from everything **we**
supply, not from the input as a whole. A model could in principle tag a headline
naming one candidate differently from an equivalent headline naming another. That
is exactly why §6 measures issue-tag distribution per candidate and treats it as a
new fairness axis to report. Do not claim symmetry is proven; claim the request
carries no identity we put there, and measure the rest.

### 4.4 What the model returns, and what it cannot

One judgment per issue: *does this article relate to this issue?* — a probability,
not a label. Tag when the probability clears a threshold; otherwise no tag. An
article with no issue over threshold gets **no tags**, which is a normal outcome
and never an error.

**One request per article on both engines**, not one per issue: the Anthropic
adapter returns all eight numbers in a single tool-use response; TypeSafe takes
eight Nouls over shared state in a single `systemOne` call, which its docs
describe as the multi-label recipe ("define one Noul per label"). Per-article
cost in §4.5 is therefore per request, not per issue.

**Forbidden outputs — lean, sentiment, framing, tone, "fair/unfair", and any
free-text summary — are prevented structurally, not by instruction.** The response
is a fixed set of numbers keyed by taxonomy id. There is no field a lean could be
written into. This is the same move as the outlet list: make the guarantee
unforgeable rather than well-worded (CN-R3).

**This is where the two engines genuinely differ**, and it is the argument that
should decide D2 — not price:

| | Anthropic `claude-haiku-4-5` | TypeSafe System One (Jev) |
|---|---|---|
| Output channel | Tool-use JSON. A `string` field could carry prose if the schema ever loosened; the validator is what stops it | Noul returns a **number**. There is no free-text channel to loosen |
| The confidence number | Self-reported by the model — a token it wrote. Not calibrated; thresholding it is thresholding a claim | A probability from the scoring mechanism, not a generated token. Calibration is **not documented** — the docs say validate on your own data |
| In the repo today | Yes: `@anthropic-ai/sdk` ^0.109.1, pattern at `src/lib/quiz.ts:120–190` | No. New dependency (`@typesafe-ai/sdk`, Node 20+), new key, new vendor |
| Pricing | $1/MTok in, $5/MTok out | **$0.042/MTok input; output free.** ~100× cheaper (§4.5) |
| Rate limits | Documented | 1,200 req/min, 250k tok/s — a whole sweep in seconds |
| Context | 200k | 64k total, 32k for state + longest question — ample for headlines |
| Model choice | Several tiers | One: `jev-1.13.0` (`jev-latest`). Same weights for every account |

The structural point stands on its own: a primitive that returns a number cannot
emit a lean even if the prompt is wrong. That is worth more to this project than
it would be to most, and it is why D2 deserves measurement rather than a coin flip.

### 4.5 Cost is not a deciding factor

Per article on the Anthropic branch: taxonomy (~700 tok) + title/dek (~150 tok) in,
~80 tok out ≈ **$0.00125**. At 200 stored rows per daily sweep that is ~$0.25 a
sweep; at 600, ~$0.75. Across the ~45 days to 2026-11-03: **roughly $11–34 total**,
halved again on the Batch API (50%, and the sweep is not latency-sensitive).

Caveat, so no false saving is claimed: prompt caching has a model-dependent minimum
cacheable prefix of 512–4096 tokens. A 700-token taxonomy may fall **below** it and
silently not cache. Assert `usage.cache_read_input_tokens > 0` in the runner's
dry-run output; if it is zero, drop the `cache_control` rather than reporting a
discount that is not happening.

**MEASURED 2026-09-18**, `scripts/news-characterize-demo.ts`, 10 fixtures
against `jev-1.13.0`, one request per article:

| Configuration | Nouls/article | Input tokens/article | $/article | Run-up total* |
|---|---|---|---|---|
| Both levels, threshold 0.70 | 26 | 3,111 | $0.00013 | ~$1.18 |
| **Sub-issues only, threshold 0.85** (chosen) | **15** | **1,965** | **$0.0000825** | **~$0.74** |

\* 200 stored rows per daily sweep to 2026-11-03.

**Founder decisions taken from that run, 2026-09-18:**

1. **Drop the category questions.** In all 10 rows a parent never fired alone —
   whenever a category cleared, one of its children cleared too, including on
   the fixture written specifically to need a parent (a deliberately broad
   "Florida's economy is slowing", which B1 caught at 0.98 unaided). Eleven of
   26 questions were doing no work. Categories remain in the taxonomy as a
   derived display layer via `categoriesFor()`; they are simply never asked and
   never stored. Reversing this is adding `CATEGORIES` back to `ASKABLE`.
2. **Threshold 0.85, not 0.70.** At 0.70 a property-insurance story over-tagged
   into A2 (housing affordability) and A4 (cost of living), pulling `housing`
   in as a category; at 0.85 it collapses to A1 alone with no true positive
   lost anywhere in the sample.

Both are ten-fixture signals, not tunings. The gold-set sweep (§6 item 4)
remains what settles the threshold, and item 6 remains what decides whether a
second engine is ever built.

**Reproducibility caveat, found in the same run.** Two runs of the same input
gave `economy` 0.71 once and below-threshold the next. Provenance pins the
*inputs* — model id, taxonomy version, question hash — but not the answers, so
a score near the threshold can flip between runs. Do not describe a stored tag
as deterministic. Raising the threshold to 0.85 also widens the margin around
most decisions, which reduces how often this matters.

Both are cheap in absolute terms, so cost does not decide §6 on today's volumes.
It would start to matter if the sweep goes daily against a growing pool, which
the cadence table in PRD §5 already anticipates.

### 4.6 Storage

**Migration 0027** (claim it in `supabase/migrations/README.md` in the same PR):

```sql
ALTER TABLE news_item ADD COLUMN issues TEXT[];
ALTER TABLE news_item ADD COLUMN characterized_by TEXT;
ALTER TABLE news_item ADD COLUMN characterized_at TIMESTAMPTZ;
CREATE INDEX idx_news_item_issues ON news_item USING GIN (issues);
```

- **`text[]` + GIN, not a join table.** The query the product needs is "rows
  matching any of the issues this voter picked", which is `issues && ARRAY[...]`
  against a GIN index. A join table buys per-issue queryability that an array
  index already provides, and costs a table, a migration and a write path.
- **`characterized_by`** mirrors `verified_by` (`0005_refresh_agents.sql:29`,
  `0007_notifications.sql:27`) and carries the full provenance in one string:
  engine, model id, `TAXONOMY_VERSION`, and a hash of the question template. A run
  must be reproducible and two runs must be comparable.
- **NULL `issues` means "not characterized"; `{}` means "characterized, no issue
  over threshold".** These are different facts and the column must distinguish
  them — an empty array is a result, a NULL is an absence.
- No row is ever *re-tagged in place* under a new taxonomy version without
  rewriting `characterized_by` in the same statement.

### 4.7 Modules

| File | Purpose | Tested by |
|---|---|---|
| `src/lib/news-issues.ts` | The frozen taxonomy + `TAXONOMY_VERSION`. Pure data. | `scripts/verify-news-issues.ts` |
| `src/lib/news-characterize.ts` | Pure: `buildQuestions(article, taxonomy)` (deterministic), `validate(response)` (shape, threshold, abstain), `provenance()`. **No network, no clock, no DB** | `scripts/verify-news-characterize.ts`, fixtures with recorded responses |
| `src/lib/news-characterize-engines.ts` | The engine adapters behind one interface. The only file that touches a vendor SDK. TypeSafe built first; the interface exists so a second arm is a ~40-line addition, not a refactor | integration-only; excluded from the pure self-test |
| `scripts/news-characterize.ts` | The runner: reads stored rows, calls an engine with a fixed per-article budget, writes `issues`. `--dry-run` prints without writing; `--engine=` selects | run manually; dry-run output is the evidence |

This mirrors the split the sweep already uses (`src/lib/news-sweep.ts` pure,
`scripts/news-sweep.ts` fetches) and the reason is the same: a function that
reaches the network is not verifiable offline.

**Mutation checks** — each must fail the self-test when removed:
drop the threshold (everything tags); accept an issue id not in the taxonomy;
accept a `lean`/`sentiment`/`summary` field; treat NULL and `{}` as the same;
let `buildQuestions` vary across two calls with the same inputs.

**Before writing any of this, read `node_modules/next/dist/docs/` for the relevant
guide** — per `AGENTS.md`, this Next.js differs from training data. Only the
runner and any future route are affected; the pure modules are plain TypeScript.

---

## 5. Unit 2 — candidate suggestions (specified, not built)

Blocked on **Q5** (`design.md` §7 currently says do not queue agent news; CN-R7
asks to reverse it — open since 2026-09-06). D1 is resolved and does not block
this: an operator-approved suggestion is not the model deciding attachment.

- The model proposes attachments the regex missed — nicknames, "the incumbent",
  "the Republican nominee". It never writes `news_item.candidate_id` or `relation`.
- Every suggestion carries **`evidence`: a verbatim substring of the title/dek**.
  A suggestion whose evidence is not found in the input verbatim is discarded, not
  shown. This is what makes a suggestion checkable by an operator in one glance.
- Suggestions land as `review_item` rows and reach a card only through an operator
  approval. That requires, in one PR: the `kind` CHECK extended (§1.4), a zod
  payload in `src/types/admin.ts`, and a planned effect in
  `src/lib/admin/effects.ts` — the fixed map that refuses anything unplanned.
- The roster enters the prompt here. Reuse `quiz.ts`'s existing anonymization
  shape (`candidateRef: 1..N`) where it can — it is the same identity-symmetry
  pattern — but note it cannot be complete: resolving "the incumbent" requires
  knowing who the incumbent is.
- **Evaluation of Unit 2 is blocked on ingest B2.** Against 29 demo fixtures,
  precision and recall are meaningless.

---

## 6. Evaluation — before any rendering (gate G4 stays shut until this reports)

**The measure is a hand-labelled gold set, not engine agreement.** Two models
agreeing does not make either right, and with one engine built first there is
nothing to agree with. Label **100 stored rows by hand** against the taxonomy —
drawn across outlets and including sitemap-only rows — and treat that as ground
truth. It is a couple of hours of founder time and it is the only thing in this
design that can actually say whether a tag is correct.

Report:

1. **Precision and recall per issue** against the gold set, at the chosen
   threshold. Per issue, not averaged: a taxonomy where `economy` works and
   `insurance` does not is a fixable problem, and an average hides it.
2. **Issue-tag distribution per candidate**, over `named` rows only, using
   `namedCountsByCandidate()`'s selection rule. The question is whether tags are
   distributed as evenly as coverage is. **This is a new fairness axis: report it,
   do not publish it, and never feed it to `balance_audit_core`** — CN-R10's
   variance stays over deterministic `named` counts, whatever the model does.
3. **Tag rate and abstain rate**, with **sitemap-only rows (no dek) reported
   separately** — that is the input floor from §4.2, and averaging over it would
   hide it.
4. **Threshold sweep** against the gold set. The docs tell us to validate
   thresholds on our own data; this is where that happens. Report precision and
   recall at several thresholds rather than asserting one, and pick the threshold
   from that curve — tagging is low-stakes and disclosed, so recall is worth more
   here than it would be in a gating decision, but say so rather than assuming it.
5. **Cost and latency per article and per sweep**, measured, not estimated.
6. **Whether to build the second engine at all.** If precision and recall against
   the gold set are acceptable, the Anthropic arm is never built and the seam
   simply goes unused. Build it only to answer a specific dissatisfaction, and say
   in the report which one.

Unit 1's evaluation needs **no roster** for items 1, 3, 4, 5 and 6 — only item 2
wants real candidates, and it can run on whatever `named` rows exist. So this is
not blocked on B2, unlike the brief's C14.

Nothing reaches a voter until the founder reads this and answers G4. If issue tags
ever do render, they inherit `news-fairness.md` §1's discipline: disclosed, never
judged, never colour-coded.

---

## 7. Gates, restated

| Gate | Status |
|---|---|
| **G1 — authority** | **CLOSED 2026-09-18: A, C dropped** (founder: "A now, drop C"). The model never decides candidate attachment |
| **G2 — input** | **CLOSED by this document:** title + dek, never a body; and only stored rows, not the raw sweep pool. Reopening needs a per-outlet `bodyFetch` flag |
| **G3 — taxonomy** | **REOPENED 2026-09-18 — founder reviewing.** A third list exists (`CAP_Issue_List_FL_2026_v1.md`, 15 sourced issues) and covers four issues the quiz misses entirely. Options in `docs/general-election/news-issue-taxonomy-options-2026-09-18.md`. Blocks plan Task 1 only |
| **G4 — surface** | **OPEN, deliberately.** Decided after §6 reports, not before |
| **G5 / Q5 — queue** | **OPEN.** Blocks Unit 2 only. Unit 1 does not touch `review_item` |
| **D2 — which System One** | **Narrowed 2026-09-18.** Founder has Jev access; pricing and limits published. Build the TypeSafe arm first; §6 item 6 decides whether the Anthropic arm is ever built |
| Founder confirmation on G3 | Reusing the **voter-facing** quiz list for news tags is a product decision as much as a technical one. C11 is a PR-reviewed file, so the review is the gate — but flag it explicitly rather than letting it land silently |
| `TYPESAFE_API_KEY` | Not in `.env.example`; `@typesafe-ai/sdk` not installed. Both are C13 steps |
| Roster (ingest B2) | Blocks Unit 2's evaluation. **Does not block Unit 1** |
| `leanTag` sign-off (C7-a), `unrated` value | Blocks rendering any card at all. Independent of this work |

---

## 8. Tasks

| Task | Depends on | Output |
|---|---|---|
| **C11** — `src/lib/news-issues.ts` + guardrail; `quiz-questions.ts` imports it | G3 confirmed | One taxonomy, drift-proof |
| **C12** — `src/lib/news-characterize.ts`, pure, fixture-tested, mutation-checked | C11 | No network |
| **C13** — TypeSafe adapter; `@typesafe-ai/sdk`, `TYPESAFE_API_KEY` in `.env.example` | C12 | One Noul per issue over shared state, one request per article |
| **C13c** — migration 0027 + ledger row; runner with `--dry-run`/`--engine` | C12, 0027 claimed | Writes `issues` + provenance |
| **C14a** — hand-label 100 stored rows as the gold set | C11 | Ground truth; founder time, not agent time |
| **C14b** — evaluation (§6) against the gold set | C13, C13c, C14a | The numbers that decide the threshold and G4 |
| **C15** — founder decision on G4 | C14b | — |
| **C13-alt** — Anthropic adapter | only if C14b says so | `claude-haiku-4-5`, temperature 0, forced tool use |
| **C16** — Unit 2 | Q5, B2 | §5 |

---

## 9. What not to do

- Do not let the model write `news_item.candidate_id` or `relation` (unchanged
  from the brief; still the load-bearing rule).
- Do not fetch article bodies. G2 is closed in writing; reopening it is a
  per-outlet permission, not a flag flip.
- Do not invent an issue list in a prompt. It lives in `src/lib/news-issues.ts`.
- Do not add a second issue vocabulary. If the news taxonomy needs a new issue,
  the quiz gets it too — that is the point of one list.
- Do not compute or publish any variance from model output. CN-R10's denominator
  stays `namedCountsByCandidate()`.
- Do not model ballot amendments as issues; `ballot_measure` holds them.
- Do not build a second R1. Extend it or run beside it.
- Do not claim the characterizer is symmetric without §4.3's caveat attached.
