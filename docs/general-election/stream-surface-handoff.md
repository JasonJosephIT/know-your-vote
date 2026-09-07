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

1. **`N` is unchosen by design** (`news-fairness.md` §5: pick from measured counts once N5 reports). **Hard gate recorded in the N4 done-note:** `N` must be passed to `CandidateNews` before `candidate_news` rows go live. Until then the equal-slot promise is an ordering, not a cap.
2. **Live DB unproven.** The `source(...)` PostgREST embed and the `.gte("published_at")` predicate in `fetchCandidateNews`, and the lint's live path with the same embed, have never run against Supabase from these sessions. Schema preconditions were checked in the migration files (single FK `news_item.source_id → source`, `anon_read_source` policy exists), so the shape is very likely right; one live request confirms it. A wrong relationship name degrades silently to an empty news section, not a crash.
3. **30-day window is now real.** A candidate whose only coverage is older than 30 days shows the "No stories named this candidate…" line. Expect this on first live run; it is correct, not a regression.
4. **Brief-era methodology copy** ("Say, done, and true are kept separate", "The Balance Audit is a gate, not a goal", the "flag this brief" link) still describes the retired brief pipeline as current and now sits beside the news clauses. Seen and deliberately left — rewriting it is a founder call (briefs were retired "for now", reversibly).
5. **Plan file corrections** (on the other branch, not editable here): add `node scripts/verify-news-slots.ts` to `stream-surface.md` §4; §1's "already true" table lists source labelling as done without saying N2/N3 covered only `/news` — that is what let S1's copy over-promise until the final fix.
6. **Stream P dependency noted in memory:** migration `0014` was written but NOT applied, with a precondition on a Stream S admin `source_id` fix. **That fix was not part of this plan and was not done here.** Check `stream-pipeline.md` / the P memory note before applying 0014.

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
