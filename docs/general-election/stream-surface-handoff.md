# Stream S handoff — voter-facing surfaces

**Written:** 2026-09-07 · **Branch:** `claude/stream-surface` (10 commits over `main` at `fc20f12`, head `70cdbae`) · **Worktree:** `.claude/worktrees/subagent-driven-development-a087c8`

Plan executed: `stream-surface.md` (lives on `claude/data-architecture-ingest-plan-u9b1fq`, not on this branch). Sibling stream: `claude/stream-pipeline` (Stream P, separate worktree, see its own memory note).

---

## 1. State of the branch

All three tasks done, each task-reviewed, then a whole-branch review whose findings were fixed and re-reviewed. **Not merged, not pushed.** The founder still has to pick: merge locally / push + PR / keep / discard.

| Commit | What |
|---|---|
| `166a428` | S1 — methodology page: ballot-only policy + news clauses |
| `87a05c0`, `109b895` | S2 — neutrality lint requires a populated source on agent rows (+ empty-string fixtures) |
| `8d9bec7`, `2a25949`, `9212fb1` | S3 — `news-slots.ts` selector, guardrail, page wiring, shortfall copy, cross-tier fixture |
| `aba84da` | Final review fixes: labels on candidate cards, 30-day predicate, copy trued up |
| `232ed9d` | N4/N6/N7 done-notes in `news-fairness.md` |
| `70cdbae` | Methodology copy: interim slot rule covers the last 30 days |

Files touched (all inside Stream S's §0 column): `src/app/(public)/methodology/page.tsx`, `src/app/(public)/candidates/[candidateId]/page.tsx` (comment only), `src/components/features/CandidateNews.tsx`, `src/lib/briefs.ts`, `src/lib/news-slots.ts` (new), `scripts/verify-news-neutrality.ts`, `scripts/verify-news-slots.ts` (new), `docs/general-election/news-fairness.md`. **No migration. Nothing in Stream P's column.**

### Baseline on `70cdbae` (all green)

```
npm run build
npx tsc --noEmit
node scripts/verify-party-label.ts
node scripts/verify-news-labels.ts
node scripts/verify-news-feed.ts
node scripts/verify-news-slots.ts          # NEW — add to the plan's §4 block
node scripts/verify-news-neutrality.ts --self-test
```

`npx eslint` still reports the same 4 pre-existing warnings (`scripts/build-demo-seed.mjs`, `src/lib/quiz.ts`), none in files this branch touched. Node prints an ExperimentalWarning about type stripping on every `verify-*.ts` run; it is noise.

---

## 2. What changed for a voter

- **Methodology page** has two new sections before "We describe. You decide.": *We show the ballot, not the filing list* (QUA/UNO shown; DEF, DNQ, WIT, REM and qualified write-ins excluded, with the reason, no write-in named) and *How we label the news* (publisher + Reporting/Opinion on every card; lean **disclosed**, never scored; equal slots per ballot candidate; shortfall stated; plus the honest interim sentence that until `N` is set every sourced story from the last 30 days is shown, ordered by the same rule for every candidate).
- **Candidate page news cards** now show publisher, kind, lean, and the opinion container treatment (`border-l-2 border-l-border-strong bg-surface-muted`, the word "Opinion") — identical to `NewsFeed.tsx`. Sourceless items render no labels.
- **Candidate news loader** (`fetchCandidateNews`) embeds `source(publisher, type, lean_tag)`, filters `published_at >= now − RECENT_WINDOW_DAYS` (30, shared with the lint via `src/lib/neutrality.ts`), and has **no count cap** any more (`.limit(10)` removed — a 10-newest pool could be single-lean and defeat the rule).
- **`selectNewsSlots(items, n?)`** in `src/lib/news-slots.ts`: `named` tier exhausts before `related`; within a tier greedy pick by fewest-selected `lean_tag`, then fewest-selected `type`, then newest `published_at`, then input order; lean/type counts **carry across the tier boundary**; sourceless items are their own `null` bucket and are not dropped; `'N/A'` is a real bucket. `n` undefined → order everything, no cap, shortfall 0. Returns `{ slots, shortfall }`.
- **`CandidateNews`** takes optional `slots?: number`. When given and short, renders "Only k story/stories found for this candidate in the last 30 days." **The page passes nothing today.**

---

## 3. Open decisions and gates (founder / next session)

1. **`N` is unchosen by design** (`news-fairness.md` §5: pick from measured counts once N5 reports). **Hard gate recorded in the N4 done-note:** `N` must be passed to `CandidateNews` before `candidate_news` rows go live. Until then the equal-slot promise is an ordering, not a cap. *Update 2026-10-04:* a recommended `N = 3` now sits in `news-slots.ts` as `NEWS_SLOTS_PER_CANDIDATE`, pending founder confirmation and **still not wired**. See §7.
2. **Live DB unproven.** The `source(...)` PostgREST embed and the `.gte("published_at")` predicate in `fetchCandidateNews`, and the lint's live path with the same embed, have never run against Supabase from these sessions. Schema preconditions were checked in the migration files (single FK `news_item.source_id → source`, `anon_read_source` policy exists), so the shape is very likely right; one live request confirms it. A wrong relationship name degrades silently to an empty news section, not a crash.
3. **30-day window is now real.** A candidate whose only coverage is older than 30 days shows the "No stories named this candidate…" line. Expect this on first live run; it is correct, not a regression.
4. **Brief-era methodology copy** ("Say, done, and true are kept separate", "The Balance Audit is a gate, not a goal", the "flag this brief" link) still describes the retired brief pipeline as current and now sits beside the news clauses. Seen and deliberately left — rewriting it is a founder call (briefs were retired "for now", reversibly).
5. **Plan file corrections** (on the other branch, not editable here): add `node scripts/verify-news-slots.ts` to `stream-surface.md` §4; §1's "already true" table lists source labelling as done without saying N2/N3 covered only `/news` — that is what let S1's copy over-promise until the final fix.
6. **Stream P dependency noted in memory:** migration `0014` was written but NOT applied, with a precondition on a Stream S admin `source_id` fix. **That fix was not part of this plan and was not done here.** Check `stream-pipeline.md` / the P memory note before applying 0014. *Update 2026-10-04:* the admin `source_id` fix is done on `claude/launch-handoff-completion`. 0014 is still unapplied, and it now also needs `0042_news_source_backfill.sql` first (`things-to-confirm.md` TC-6, `news-inlet-runbook.md` §4).

---

## 4. Deferred Minor findings (triaged by the final review, none blocking)

- `CandidateNews.tsx`: early `return null` keys off `items.length`, render off `selected`; `slots={0}` with items present would show the "No stories" line falsely. Unreachable today; document `n >= 1` or clamp.
- `news-slots.ts`: negative/fractional `n` is fail-open (uncapped). Documented in JSDoc; no caller can produce one.
- Tier predicate `relation === "related"` appears in both `CandidateNews.tsx` (display regroup) and `news-slots.ts` (ordering). Two occurrences; add `isRelated()` if a third appears.
- No self-test fixture for a PostgREST embed arriving as `source: []`; `raw[0] ?? null` handles it.
- No guardrail pins the card's null-source rendering (no stray "·"). Correct by construction; markup-level regressions would not be caught.
- `news-fairness.md` §4: the `~ ` done-note blocks split the markdown table (inherited from the N2/N3 precedent). Cosmetic.
- Doc/code drift, pre-existing: the N2/N3 note says `border-l-2 border-border-strong`; both components use `border-l-border-strong`.

---

## 5. How this was run (for repeatability)

Subagent-driven development: fresh implementer per task → task review (spec + quality) → fix → re-review → final whole-branch review on the most capable model → one fix wave → re-review. Every guardrail was mutation-checked (rule removed → script fails → restored). Briefs, reports, review packages and the progress ledger are in `.superpowers/sdd/` (git-ignored scratch in this worktree; will not survive `git clean -fdx`). The full dispatch history is recoverable from `git log fc20f12..70cdbae`.

Lessons that held: give each concurrent stream its own worktree (this one and `stream-pipeline` never collided); hand subagents files, not pasted context; controller-written copy strings need the same review as code (the "Only 1 stories" bug was the controller's template).

---

## 6. Paste-ready prompt for the next session

> "Branch `claude/stream-surface` is complete but unmerged (head `70cdbae`); read `docs/general-election/stream-surface-handoff.md` first. Decide merge/PR. Then, in order: (1) run the §1 baseline; (2) with a live Supabase, load one candidate page that has `candidate_news` rows and confirm cards show publisher/kind/lean and that `node scripts/verify-news-neutrality.ts` (live mode) runs the source embed without a PGRST error; (3) do not choose `N` — wait for N5's counts; (4) raise the four founder items in §3 (N gate, brief-era methodology copy, plan §4/§1 corrections, Stream P's 0014 precondition)."

---

## 7. Pending founder decisions before `candidate_news` goes live (2026-10-04)

Added while completing launch handoff §5. **Each row below is a
recommendation, pending founder confirmation, not a decision.** The code holds
each recommendation in one named constant so it can be flipped in one edit.
Nothing in this section switches candidate news on. The commands, pre-checks
and rollback are in `news-inlet-runbook.md`.

### How `candidate_news` is gated today

There is no feature flag. Four things keep it off:

1. **No rows.** Live has 0 `candidate_news` rows, and `CandidateNews` renders
   nothing for a candidate who has none.
2. **One way in.** `scripts/news-enqueue.ts` only queues `review_item` rows.
   A `news_item` row exists only after an operator approves it at
   `POST /api/admin/review/:id/decision`.
3. **That way is closed in production.** `ADMIN_EMAILS` is unset, so the
   console is closed and the route refuses (401/403 from `adminApiGuard`)
   before it reaches the service client. (The service-role key itself is
   readable since #109, as `SUPABASE`.) The enqueue and characterize scripts
   run locally and read the service key only as `SUPABASE_SERVICE_ROLE_KEY`,
   so they need it under that name in `.env.local`.
4. ~~**The N gate (§3 item 1) is open.** The candidate page passes no `slots`.~~ Closed 2026-10-09: both call sites pass `NEWS_SLOTS_PER_CANDIDATE` (3), founder-confirmed.

Going live therefore means running the runbook and approving rows. It is not
a code switch. Pre-check P3 in the runbook makes wiring N a condition of the
first approval.

### The decisions

| # | Decision | Recommended (pending founder confirmation) | Why, in short | Constant, and how to flip |
| - | -------- | ------------------------------------------ | ------------- | ------------------------- |
| D1 | **N**, news slots per candidate | **3** | Measured 2026-10-04 (30-day sweep, live roster of 82): 69 candidates had no `named` story; the 13 who did had a median of 2 and a top of 14, against 0 for another candidate in the same race. 3 binds only on the most-covered and turns 14-to-0 into 3-to-0 plus the stated shortfall. Every usable outlet is `unrated`, so a larger N would add stories of the same lean, not spread. Re-measure after the first approved batch. | `src/lib/news-slots.ts` `NEWS_SLOTS_PER_CANDIDATE`. Change the number. **Wiring is separate:** pass `slots={NEWS_SLOTS_PER_CANDIDATE}` at both `<CandidateNews>` call sites in `src/app/(public)/candidates/[candidateId]/page.tsx`. |
| D2 | **Surnames that are also common words** | **`title_and_surname`**: without the full name, a surname attaches only with a title right before it ("Rep. Lee", "Commissioner Smith"), for every candidate alike | The old bare-surname rule gave 75 `related` attachments in 30 days, at most one of them real; Robert People alone took 37. The new rule gives 0 and leaves the 51 `named` attachments untouched. A stop-list would mean deciding whose name is "common", which is a judgment about particular candidates, and it would still miss Strada, Rojas and Gilbert, which also misfired. A list of titles treats every name alike. Cost: a bare-surname headline with no title and no full name in the dek no longer reaches review (at most 1 in the sample). | `src/lib/news-match.ts` `SURNAME_ONLY_RULE`. `"bare_surname"` restores the previous behaviour exactly. `verify-news-match.ts` checks both modes. |
| D3 | **A policy story that names no candidate** | **`"drop"`**: no automatic inlet before Nov 3; operator submission stays the path | A Jev-gated policy inlet reverses the pipeline order and was meant to be "its own spec change with its own PR". The model has never run on production rows (no key; a threshold set on ten fixtures). 507 of 545 swept articles matched nobody, and one operator would review whatever the model admitted. `NewsInsertRow` has no `county_fips`, so the approval boundary cannot carry a county-scoped row anyway. | `src/lib/news-enqueue.ts` `UNMATCHED_ARTICLE_POLICY`. `"policy_inlet"` is not built, and the enqueue script refuses to run with it. |
| D4 | **R3 cadence for the final weeks** | **Daily on Cowork** from 10-05 to 11-03 (`0 9 * * *`). Do not build ADR-001 Option B now. | The plan's "daily in the final 8 weeks" default lapsed on 09-08. The key dates (10-05, 10-22, 10-24 to 10-31, 11-03) are too dense for a Wednesday-only run. Option B is a new route, a model key and monitoring, all built in the last four weeks. | The Cowork task's schedule, outside this repo. Leave it weekly to flip. |
| D5 | **The Ballotpedia row in 0042** | Attribute as `factual_reporting` / `unrated` ("No independent rating") | It is the only unlisted non-government source among the eight sourceless rows. `unrated` is the value 0028 made for "a lean applies and nobody rates it", as the measure resources used for other unlisted outlets. | The marked BALLOTPEDIA block in `supabase/migrations/0042_news_source_backfill.sql`. Swap it for the `DELETE` its header gives. Must be decided before 0042 is applied. |
| D6 | **Apply 0014** (with 0042 first) | Yes, after this branch deploys and before the first approval | It is the backstop for "no source, no card". The approve path now satisfies it by construction. | Runbook §4. The rollback is one `DROP CONSTRAINT`. |

Also not decided here: the candidate-news header copy ("On-the-record events,
restated neutrally and cited — no polls…") does not describe swept headlines
(runbook P4). The enqueue roster comes from `profile`, so candidates in the 17
`listed` races (24 ballot-tier candidates with no profile) get no candidate
news, although their listing pages render the section.

Also for the founder, a consequence of D6's approve-path change: **operator
posts from five large outlets are blocked until their leans are signed off.**
The approve path now refuses any story from `apnews.com`,
`miamiherald.com`, `tampabay.com`, `orlandosentinel.com` or `sun-sentinel.com`.
These are the five listed outlets with `leanTag: null` (gate C7-a). Adding a
page `source` row does not help, because the resolver stops at the unsigned
lean before it looks for one, so as not to put an unsigned lean on a card.
Before this branch these stories could be approved, and went in with no
source. The choice: sign off the five leans in `src/lib/news-sources.ts`, or
accept that operator posts from these outlets stay blocked until then.
The sweep is unaffected, since it never reads them. The details are in
`news-inlet-runbook.md` §5, step 4.
