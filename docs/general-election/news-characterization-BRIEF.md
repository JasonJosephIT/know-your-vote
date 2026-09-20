# Model characterization of swept articles — session brief

_Written 2026-09-18 as a handoff for a fresh session. Founder idea, raised
during the retrieval-mode-2 build: "text will then go to a System 1 model for
characterizing the new candidate or related issue of the article." Nothing
here is built or decided. This brief exists so the next session starts from
the constraints and the open questions, not from the idea alone._

## 0. State of the branch you are inheriting

- Branch `claude/compass-artifact-workflow-41aa89`, base `ea2fe76` (main),
  carries retrieval mode 2 (Google News sitemaps for the Sun Sentinel and
  Orlando Sentinel). Built subagent-driven, per-task reviews approved, final
  whole-branch review "with fixes", fixes applied and mutation-checked in
  `ec89b2a`. **PR #52 is open** against main; the founder merges it. The SDD
  ledger is `.superpowers/sdd/progress.md`.
- This brief is the work AFTER that PR lands. Do not start it on the same
  branch.

## 1. The idea, restated precisely

After the corpus sweep produces its pool (title, dek, URL, date, outlet,
retrieval), each article is sent to a fast, cheap classifier ("System 1"
in the founder's phrase) that returns:

1. **Which candidate(s) the article is about** — today decided
   deterministically by full-name match (`named`) and race/surname
   ambiguity (`related`) in `src/lib/news-match.ts` (PRD §6).
2. **Which issue(s) it relates to** — nothing does this today. There is no
   issue taxonomy anywhere in the repo.

"Text" in the founder's sentence is ambiguous between the title + dek the
sweep already holds and the full article body, which the sweep deliberately
never fetches or stores. That ambiguity is gate G2 below and decides most of
the design.

## 2. What exists (do not rebuild it)

| Thing | Where | State |
|---|---|---|
| Corpus sweep, pure | `src/lib/news-sweep.ts` | title/dek/URL/date/outlet/retrieval; never a body; reproducible from inputs |
| Outlet list with founder gates and fail-closed flags | `src/lib/news-sources.ts` | 37 outlets; `leanTag` null everywhere; `mixedFeed`/`syndicated`/`robots`/`sitemap` per row |
| Deterministic matcher | `src/lib/news-match.ts` + `scripts/verify-news-match.ts` | `named` (full name, own middle tokens only), `related` (attaches to every candidate the ambiguity admits); mutation-checked |
| Coverage variance over `named` only | `namedCountsByCandidate()`; the variance itself is `balance_audit_core` (N5) | CN-R10 |
| Storage | `news_item(url, candidate_id)` unique; `relation` (`named`/`related`, migration 0017); `county_fips` (0016) | applied live |
| Neutrality lint | `scripts/verify-news-neutrality.ts` | banned terms; self-test green |
| Operator review queue | `review_item` (0006), admin console A2–A5 | exists, **and agent news now enters it** — founder reversed `admin-dashboard/design.md` §7 on 2026-09-19; `scripts/news-enqueue.ts` writes `review_item(kind='manual_news', source='agent:R1', status='pending')`. Gate G5/Q5 is closed |
| R1 Candidate News Curator | Cowork scheduled task `cap-r1-candidate-news`, snapshot `agents/r1-candidate-news.prompt.txt` | exists; extend, never replace |
| S-plane runtime (Python toollayer, three agents, MCP-stdio) | `Civic Awareness (Know Your Vote)/toollayer/`, `CAP_Runtime_PRD_v1` | merged, idle; prior art for guard patterns only (ADR-R1: identity removed from tool arguments) |
| Roster | live `candidate` table | **still 29 demo fixtures** — ingest B2 unshipped; this blocks any live evaluation |

## 3. Why this cannot be "just add a model call" — three rules it touches

1. **PRD §5, "What is stored: never the full article text."** The rationale
   is copyright and "an obligation with no product behind it". Fetching a
   body to classify it is not storing it, but it creates the fetch; and the
   verification doc §3 item 4 records that Tampa Bay Times, WFLA, Florida
   Phoenix, WESH, Miami New Times and both Sentinels disallow
   `anthropic-ai` / `ClaudeBot` by name, and Hearst's terms (WESH) prohibit
   automated aggregation outright. A Claude-run pipeline fetching bodies from
   those hosts is what they said no to. Title + dek from a syndication feed
   is a different act.
2. **PRD §6 / CN-R4: equal effort per candidate is a property of the design,
   not a promise.** The whole point of the sweep + deterministic match was to
   remove an opaque ranker from the path. A model deciding attachment puts an
   opaque judgment back in. It can be made symmetric (same prompt, same
   roster, same budget for every article) but it cannot be made
   inspectable the way a regex can. The published coverage-variance number
   must stay over deterministic `named` rows (CN-R10) whatever the model does.
3. **CN-R3: the agent never classifies an article's lean.** Issue tagging is
   not lean. But an issue taxonomy is editorial: which issues exist, how they
   are named, whether "property tax cut" and "Amendment 3" are one issue or
   two. That list has to live in the repo like the outlet corpus does, be
   PR-reviewed, and be signed off — the model picks from it, never invents.

## 4. Design space

### 4.1 What the model is allowed to decide

| Option | What changes | Conflicts |
|---|---|---|
| **A. Issue tags only** | New capability; `named`/`related` untouched | None of the three above, if the taxonomy is in-repo and the input is title + dek |
| **B. Candidate suggestions for review** | Model proposes candidate attachments the deterministic matcher missed (nicknames, "the incumbent", "the Republican nominee"); they land in `review_item`, never directly on a card | Touches §6 only as an additive, human-gated tier; **Q5 is now reversed** (2026-09-19), so the queue path B needs exists and is in use by the deterministic matcher |
| **C. Model replaces the matcher** | `named`/`related` become model output | Breaks CN-R4's structural guarantee and CN-R10's denominator; needs a PRD revision, not a task |

Recommendation to put to the founder: **A first, then B; C only with an
explicit PRD §6 revision.** A is the founder's "related issue"; B is the
founder's "new candidate" read charitably ("a candidate the regex did not
catch"), routed through the operator queue that already exists for exactly
this purpose.

### 4.2 Input to the model

| Option | Cost | Conflicts |
|---|---|---|
| **Title + dek + URL slug** (what the sweep holds) | ~150 tokens/article | None; it is syndication content the publisher pushed out |
| Full body, fetched | ~1,500–3,000 tokens/article, one HTTP fetch per article | §5 rationale; robots/terms on at least seven outlets; needs a per-outlet `bodyFetch` permission in `news-sources.ts` beside `robots`, defaulting to false |

Recommendation: title + dek first, measure agreement against the
deterministic matcher, and only then argue about bodies with numbers.
Sitemap-retrieved articles (both Sentinels) have **no dek** — title + slug
only — so the input floor is real and the evaluation must report those
separately.

### 4.3 Model and prompt shape

- "System 1" = fast/cheap classification. Use the current small model; load
  the `claude-api` skill in the session for exact IDs and pricing rather
  than guessing. Temperature 0. Structured output validated against a schema
  in code; anything that does not validate is an abstain, never a guess.
- **Symmetry (ADR-R1 pattern):** one prompt template, the same for every
  article; the roster (names, races, offices) passed identically every time;
  the taxonomy passed identically every time; no per-candidate branching.
  Record a hash of (prompt template + roster snapshot + taxonomy version +
  model id) on every output so a run is reproducible and comparable.
- Output schema (proposal):
  ```json
  {
    "issues": [{ "id": "<taxonomy id>", "confidence": 0.0 }],
    "candidate_suggestions": [{ "candidate_id": "<uuid>", "evidence": "<quoted span from title/dek>", "confidence": 0.0 }],
    "abstain": false
  }
  ```
  `evidence` must be a verbatim substring of the input or the suggestion is
  discarded — this is what makes a suggestion checkable by the operator.
- Forbidden outputs, enforced by the validator and the neutrality lint:
  lean, sentiment, framing, "fair/unfair", any free-text summary.

### 4.4 Where it runs and where results go

- Runtime: a TypeScript runner beside the sweep (`scripts/news-characterize.ts`)
  with the decision logic pure in `src/lib/news-characterize.ts` (prompt
  builder, schema validator, threshold policy) and fixture-tested with
  recorded model responses. The S-plane Python runtime is idle and heavier;
  reuse its guard patterns, not its process.
- Storage: issues need a home. Options: `news_item.issues text[]` (one
  column, simplest) vs a `news_item_issue` join table (queryable per issue).
  Reserve the migration number in `supabase/migrations/README.md` first.
  Provenance column `characterized_by` (model id + prompt hash), mirroring
  `verified_by`.
- Candidate suggestions: `review_item` rows, type to be added; never a
  `news_item.candidate_id` write without an operator action.
- Rendering: nothing renders until the founder decides (G4). Issue tags on
  cards would be a new voter-facing label with the same "disclosed, never
  judged" discipline as lean (news-fairness.md §1).

## 5. Founder gates to close before any code

- **G1 — Authority.** Issue tags only (A), plus review-queue suggestions (B),
  or model-decided attachment (C)? C requires a PRD §6 revision.
- **G2 — Input.** Title + dek only, or fetched bodies? If bodies: per-outlet
  permission in the list, consistent with each publisher's robots/terms, and
  an answer to §5's "never the full text" rationale.
- **G3 — Taxonomy.** Who writes the issue list, how many entries, does it
  include the ballot amendments (Amendment 1 reserve fund, Amendment 3
  property tax) and race-specific issues, and where does it live
  (`src/lib/news-issues.ts`, PR-reviewed, versioned)?
- **G4 — Surface.** Do model outputs ever reach a voter, or only the operator
  console? If voters: label wording and the news-fairness.md §1 treatment.
- **G5 — Queue. ANSWERED 2026-09-19: reversed.** Agent news may enter
  `review_item`. Asked whether swept articles matched to candidates should
  publish directly or be enqueued, the founder chose **enqueue for review**, and
  `scripts/news-enqueue.ts` implements exactly the shape CN-R7 specified and
  `admin-dashboard/design.md` §8 anticipated —
  `review_item(kind='manual_news', source='agent:R1', status='pending')`, with
  the approve effect doing the insert. Nothing reaches a voter unapproved.
  Open since 2026-09-06; closed in PR #54.

  Note what this does **not** license: the reversal is about the *route*, not
  about authority. G1 stands — the model still never writes `candidate_id` or
  `relation` (§9 of the design spec). What now queues is the deterministic
  matcher's output, human-gated.
- **Dependencies still open regardless:** the real roster (ingest B2) — the
  matcher and any evaluation are meaningless against 29 demo fixtures; the
  runner's feed-depth finding (sweep daily now).
- **No longer a dependency (2026-09-19, PR #54):** the missing `unrated` lean
  value shipped as migration **0028**, and the founder designated **31** outlets
  `unrated`, taking `usableOutlets()` from **0 to 27**. So cards can render.
  C7-a is **partly** open, not closed: six rows (Miami Herald, Sun Sentinel,
  Tampa Bay Times, Orlando Sentinel, AP, Florida Phoenix) still need a lean
  *chosen* rather than recorded as absent — all but Florida Phoenix now have
  fetched, cited ratings to choose from.

## 6. Proposed tasks, once gates are answered

- **C10 — Design.** Brainstorm → spec at
  `docs/superpowers/specs/<date>-news-characterization-design.md`, answering
  G1–G5 with the founder's words recorded. Plan via writing-plans.
- **C11 — Taxonomy.** `src/lib/news-issues.ts`: frozen list of `{ id, label,
  aliases[] }`, one row per issue, PR-reviewed; guardrail pins unique ids,
  non-empty labels, no lean-shaped words in labels (reuse the neutrality lint's
  banned list).
- **C12 — Pure characterizer.** `src/lib/news-characterize.ts`:
  `buildPrompt(article, roster, taxonomy)` (deterministic string),
  `validate(response)` (schema; evidence-substring rule; confidence
  threshold; abstain on any failure). Fixtures with recorded responses;
  mutation-checked (drop the evidence rule, drop the threshold, accept a lean
  field — each must fail). No network.
- **C13 — Runner + storage.** `scripts/news-characterize.ts`: reads a sweep's
  output, calls the model with a fixed budget per article, writes issues and
  `review_item` suggestions; migration reserved and written; prompt hash and
  model id recorded per row. Dry-run mode prints without writing.
- **C14 — Evaluation before any rendering.** On one real race after B2 lands:
  agreement between model suggestions and deterministic `named` (treat
  `named` as ground truth for precision); suggestions the regex missed,
  reviewed by hand; issue-tag distribution per candidate — and whether tags
  are distributed as evenly as coverage is (a new fairness axis to report,
  not to publish, until the founder says). Sitemap-only articles (no dek)
  reported separately. Cost per article and per sweep recorded.
- **C15 — Founder decision on G4** with C14's numbers in hand.

## 7. Read order for the next session

1. `docs/general-election/candidate-news-PRD.md` — §5, §6, the CN-R3/R4/R9/R10
   rows, and the C7 status note (which records this idea as a follow-up).
2. `docs/general-election/news-fairness.md` §1–§2.
3. `src/lib/news-match.ts` and `scripts/verify-news-match.ts` — the
   deterministic behaviour any model output is measured against.
4. `src/lib/news-sources.ts` header and the `robots` fields — the publisher
   stance that constrains G2.
5. `docs/general-election/news-corpus-verification-2026-09-17.md` §3 items 4
   and 6 — AI-crawler stance and the republisher-attribution problem, which
   a characterizer must not make worse (a Florida Politics story on the Miami
   Times feed must not be re-attributed by a model either).
6. `docs/admin-dashboard/design.md` §7 — the "don't queue agent news"
   decision that option B needs reversed.
7. `Civic Awareness (Know Your Vote)/toollayer/AGENT_BRIEF.md` and ADR-R1 —
   for the identity-symmetric prompt pattern only.

## 8. What not to do

- Do not let the model write `news_item.candidate_id` or `relation`.
- Do not fetch article bodies before G2 is answered in writing.
- Do not invent an issue list in a prompt; it goes in the repo or nowhere.
- Do not compute or publish any variance number from model output.
- Do not build a second R1. Extend the existing one or run beside it.
