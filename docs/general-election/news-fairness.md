# News Fairness & Opinion Labelling

**Decision (founder, 2026-09-06):** take the trade. Candidate **briefs** are
retired for now — no *What They Say / What They've Done / Fact-Check*. A
candidate page carries a **short biography** plus that candidate's **news
cards**. The S-pipeline's three agents (Profiler / Record / Fact-Checker) go
idle; see `../../Civic Awareness (Know Your Vote)/CAP_Runtime_PRD_v1.md` for
what they were. "For now" — this is reversible; nothing is deleted.

**What that costs, in one line:** the Balance Audit measured brief content, so
retiring briefs removes the mechanical publication gate that made neutrality
auditable. **This document is where that guarantee is rebuilt**, on the news
articles instead.

**This document owns:** how a news article is labelled and how coverage is kept
fair. `data-architecture.md` still owns `candidate.ballot_status` and the read
model; `data-ingest.md` still owns the DoE parser and sources.

---

## 0. What already exists (most of it)

The two axes this clause needs are **already in the schema and already
enforced** — and the app uses neither.

| Asset | Where | State |
|---|---|---|
| `source.type` — `factual_reporting` / `opinion` / `primary_doc` / `candidate_self` | `0000_pipeline_read_models.sql` | `NOT NULL` + CHECK. **The opinion axis already exists.** |
| `source.lean_tag` — `left` … `right`, `N/A` | same | `NOT NULL` + CHECK. **The lean axis already exists.** |
| `news_item.candidate_id` + `idx_news_item_candidate` | `0005_refresh_agents.sql` (applied) | per-candidate feed, already indexed |
| `item_type` `candidate_news` / `election_news` | same | already allowed |
| `verify-news-neutrality.ts` | `scripts/` | 392-line banned-terms wording lint, with a self-test |
| `allowlist_b_core` | `Agents/The Fact-Checker/` | Tier-1/Tier-2 classification + independence counting |
| `balance_audit_core` | repo root | pure `(max-min)/max` variance over per-candidate counts |

**So this is mostly a surfacing problem, not a modelling one.** Two real gaps:

1. **`news_item.source_id` is nullable.** An article can exist with no source
   row, therefore no `type` and no `lean_tag` — an unlabelled card.
2. **The app never reads either axis.** `src/app/api/news/route.ts` selects
   `id, race_id, metro, item_type, title, summary, url, published_at` — no
   `source_id`, no join. `NewsFeed.tsx` renders only "official resource" /
   "update". Publisher, opinion status and lean never reach the client.

---

## 1. Opinionation — the per-article clause

**Rule: no source, no card.** This is the news-plane restatement of the
pipeline's existing "no Source → no Claim" constitution, and it is the whole
mechanism. An article the system cannot attribute is not shown.

Every card displays three things from its `source` row, always, never on hover
and never collapsed:

| Shown | From | Why |
|---|---|---|
| Publisher | `source.publisher` | the reader judges the outlet themselves |
| **Reporting** or **Opinion** | `source.type` | an opinion column and a news report are not the same object |
| Lean | `source.lean_tag` | disclosed, not corrected — `N/A` is a legitimate value |

**Opinion cards are visually distinct from reporting cards** — a different
container treatment, not merely a word in the byline. The failure this prevents
is a voter reading a columnist's argument as established fact because both
arrived in the same grey rectangle.

**Lean is disclosed, never scored.** The app labels what a source is; it never
rates an article as biased, and it never "corrects" a lean. Neutrality here is
transparency about provenance, not a verdict on content.

---

## 2. Fairness — the per-race clause

### Why this cannot be a gate

The Balance Audit could HALT publication because the pipeline **controlled the
supply** — if the Profiler wrote 12 claims for one candidate and 2 for another,
that asymmetry was ours to fix. News is different: we do not control what the
press publishes. A candidate may genuinely have ten times the coverage.

Halting a race because the media covered it unevenly would hide a real ballot
from real voters over something no one can remediate. **So on the news plane,
fairness is enforced by selection and disclosure, not by a publication gate.**

### Equal slots

The original principle survives intact, applied to the surface we do control —
*how many cards each candidate gets*:

> **Every `ballot`-tier candidate in a race gets the same number of news
> slots, `N`.** Not "the most recent N in the race" — that inherits the
> media's asymmetry directly into the layout.

Within a candidate's `N` slots, fill by **lean spread first, recency second**:
take the most recent item from each distinct `lean_tag` before taking a second
item from any one lean. Same rule for `type` — a candidate's slots are not all
opinion columns while another's are all reporting.

Shortfall is stated, not padded: *"Only 2 sourced stories found for this
candidate in the last 30 days."* Silence is data the voter should see.

### The one number worth auditing

Reuse `balance_audit_core` — it is a pure variance function over per-candidate
counts and does not care whether it is counting claims or articles. Compute
`(max-min)/max` over **items available per candidate** per race and record it.

It reports; it does not halt. Its purpose is the methodology page and the admin
console: *"we found 14 stories for one candidate and 3 for another, and here is
how we allotted slots anyway."* **Do not edit `balance_audit_core.py`** — call
it, as `data-architecture.md` §3 already requires.

---

## 3. Schema change — migration `0011_news_fairness.sql`

One constraint. Everything else in this document is application code.

```sql
-- 0011_news_fairness.sql
-- No source, no card. Agent-written news must be attributable; the seeded
-- official_link / pipeline_event rows predate this and are unaffected.
ALTER TABLE news_item ADD CONSTRAINT news_item_agent_rows_need_source
  CHECK (item_type NOT IN ('candidate_news','election_news')
         OR source_id IS NOT NULL);
```

`0010_general_election.sql` (`candidate.ballot_status`, party CHECK dropped)
**survives the pivot unchanged** — `ballot_status` still decides who gets a
candidate page and news slots. Only its *justification* moves: it defines the
slot population rather than the audit denominator. The B1 findings behind it
stand.

---

## 4. Tasks

Dependency-ordered. N1 gates N2–N4.

| ID | Task | Files | Verify |
|---|---|---|---|
| **N1** | Migration `0011` exactly as §3 | `supabase/migrations/0011_news_fairness.sql` | `node scripts/verify-migrations.mjs` green; a `candidate_news` row with `source_id NULL` is rejected; an `official_link` row with NULL still inserts |
| ~~**N2**~~ ✅ | News read joins `source`; API returns `publisher`, `type`, `lean_tag`. `item_type` widened to the four values 0005 allows; `candidate_id` added | `src/app/api/news/route.ts`, `src/types/app.ts`, `src/lib/news-labels.ts` | `npx tsc --noEmit` clean, `npm run build` clean, `node scripts/verify-news-labels.ts` passes |
| ~~**N3**~~ ✅ | Card renders publisher + Reporting/Opinion + lean; opinion cards visually distinct | `src/components/features/NewsFeed.tsx` | `npm run build` clean; opinion rows get a muted ground + left rule, and say "Opinion" in words |
~ **N2/N3 done 2026-09-06.** Label logic lives in `src/lib/news-labels.ts`
(pure, no DB/network) and is pinned by `scripts/verify-news-labels.ts`, which
was mutation-checked — breaking the `N/A` rule makes it exit 1. Two neutrality
rules are encoded there rather than left to convention: **lean is never
colour-coded** (the README's party-chip rule applies equally to lean), and
**`N/A` is not a lean** so it prints nothing rather than the literal string. An
item with no source gets *no* labels, so an unattributed row can never render
as though it were attributed. Opinion styling reuses the repo's existing
`border-l-2 border-border-strong` blockquote treatment on a muted ground —
deliberately not a colour, which would imply a verdict about the piece.
**Not verified:** the PostgREST embed `source(publisher, type, lean_tag)` is
unproven against a live database — there is no Supabase reachable from this
session. Typecheck, build and the pure label tests all pass; the join itself
needs one live request to confirm.
~ Pre-existing lint error left alone: `react-hooks/set-state-in-effect` in
`NewsFeed.tsx` is on a line this change did not touch (present at HEAD).

| **N4** | Equal-slot selection: `N` per `ballot` candidate, lean spread before recency, shortfall stated | `src/lib/` (new selector) + candidate page | Unit check: given a 14-vs-3 split, both candidates get `N` slots or an explicit shortfall note; slots are not single-lean when alternatives exist |
| **N5** | Per-race coverage variance via `balance_audit_core`, recorded not gated. **Do not edit the core** | `toollayer/cap_toollayer/synthesis.py` or a script | Variance computed for an uneven race; nothing is blocked from publishing |
| **N6** | Extend `verify-news-neutrality.ts`: assert every agent-written row has a source, and that its `type`/`lean_tag` are populated | `scripts/verify-news-neutrality.ts` | `--self-test` passes; a sourceless fixture fails the lint |
| **N7** | Methodology page states both clauses in plain language — labelling, equal slots, and that lean is disclosed rather than judged | `src/app/(public)/methodology/page.tsx` | Page renders; wording matches §1 and §2 |

---

## 5. Still open

- **Who writes `candidate_news` rows?** Nothing populates them today — this is
  the critical path for the whole pivot, and it now has its own spec:
  **`candidate-news-PRD.md`** plus **`candidate-news-BRIEF.md`** for the session
  that builds it. Short version: the R1–R4 agents are Cowork scheduled tasks
  stored *outside* this repo, `CAP_Refresh_Agents_Plan` is not here, and
  `TASK-A14`/`A15` are both unchecked.
- **What is `N`?** Pick it from real data once N5 reports actual per-candidate
  counts. Choosing it before measuring is guessing.
- **Where does the biography come from?** No `bio` field exists on `candidate`
  or `profile`. Out of scope here — it belongs in `data-architecture.md` once
  the founder says whether it is hand-written, agent-written, or assembled from
  `prior_offices` + incumbency + FEC.
