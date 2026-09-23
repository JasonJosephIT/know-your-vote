# Handoff — the ingest order: what reaches Jev, and what never does

**Written** 2026-09-23 · **Read from the repo at `c0cc33f`** (taxonomy v7, PR
#72 merged). **Nothing in this file was read from the live database** — that is
precisely the work being handed off. Every claim below is traceable to a file
and line, and §4 is the checklist for confirming the ones that need a running
system.

This exists because the founder asked to confirm a workflow: _"Jev first
categorizes these different headlines and news stories, and then only the ones
that are political, candidate-related, or policy-related are processed into our
system."_ That is not what the code does. It runs in the opposite order, and
the difference changes how two existing measurements should be read.

---

## 1. The headline

**Jev does not gate ingest. It labels rows that are already stored.** The
political/candidate filter runs before it, and is deterministic code with no
model in it.

| #   | Stage               | Where                             | Decides                                                                                       |
| --- | ------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | **Sweep**           | `src/lib/news-sweep.ts`           | Pulls RSS/sitemaps from the outlet list. Parses, windows, dedupes by URL. No subject filter.  |
| 2   | **Outlet gate**     | `src/lib/news-enqueue.ts`         | Host not on the list → dropped, counted as `offList`                                          |
| 3   | **Candidate match** | `src/lib/news-match.ts`           | Deterministic surname/race matching against the roster. Matched nobody → dropped, `unmatched` |
| 4   | **Admin approval**  | `/api/admin/review/[id]/decision` | Becomes a `news_item` row                                                                     |
| 5   | **Jev tags**        | `scripts/news-characterize.ts`    | Writes `issues`, `characterized_by`, `characterized_at` on rows where `issues IS NULL`        |

`OUTLETS` holds 37 entries, 24 of them usable (`usableOutlets()`). The
characterizer's threshold is `DEFAULT_THRESHOLD = 0.85`, and provenance is
written as `jev:<model>/tax-<version>/q-<digest>`.

**Jev can only add a label, never reject a row.** A row it cannot tag keeps an
empty issue list and still renders. There is no path by which a stored row is
removed for failing characterization.

This is deliberate, not an oversight. The design spec
(`docs/superpowers/specs/2026-09-18-news-characterization-design.md` §4.2)
decided **"characterize what gets stored, not what gets swept"** for two
reasons: the Sentinel news sitemaps alone return ~115–130 URLs per paper per
day including obituaries and wire sports — ~3,400 URLs over a 14-day window —
and running a model over that is waste; and tagging the stored pool keeps the
issue-tag distribution measured over the same rows the coverage numbers use.

## 2. Two corrections to earlier framing

**(a) "Jev filters, then we ingest" is backwards.** Ingest filters, then Jev
tags. Anything that depends on Jev being a gate — cost estimates, neutrality
arguments about what the model is allowed to exclude, or any claim that the
feed contains only model-approved stories — needs re-deriving from the real
order.

**(b) The 834-article corpus and the 116-row gold set were measured over the
sweep pool, not over stored rows.** This matters for the v7 work that just
merged. PR #72 reports `B7` carrying **155 of 834 corpus articles, 18.6%** —
that is a **sweep-pool** number, and the feed is a different population.
Checked against the candidate names in `ballots/ballotpedia/*.json`, **17 of the
18 blotter rows in the `B7` gold set name no candidate**, so under the real
pipeline they would be dropped at stage 3 and never reach Jev. The 18th is a
surname collision ("Thomas", against an Orange County Clerk candidate) that
`news-match.ts` would attach as `related`, never `named`. Ballotpedia is a proxy
for the live roster; §4.4 confirms against the real one.

The v7 narrowing is still correct — a story can name a candidate _and_ be
blotter, and the old label named the phenomenon rather than the policy either
way — but **"18.6% of the feed" overstates what production would have
carried**, and the eval's §10 numbers should be re-stated against `news_item`
rows once §4.4 below is run.

## 3. Verified here vs. needs a running system

| Claim                                                              | Status                                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Characterizer reads stored rows, not the sweep pool                | **Verified** — script header + spec §4.2                              |
| Unmatched articles dropped before any model call                   | **Verified** — `planAttachments`, `PlanCounts`                        |
| Off-list hosts dropped                                             | **Verified** — same function                                          |
| Jev writes only `issues` / `characterized_by` / `characterized_at` | **Verified** — script header, "never writes candidate_id or relation" |
| Sweep's only automatic inlet is candidate-matched                  | **Read from code, not confirmed live** — §5                           |
| Row counts and issue distribution over real `news_item` rows       | **Unknown** — no live read has been done                              |
| A row with `issues = []` still renders                             | **Unknown** — needs the feed running                                  |

## 4. The checklist for the next session

Requires `TYPESAFE_API_KEY` (absent from the container this brief was written
in) and live database access. Run the offline guardrails first —
`scripts/verify-news-characterize.ts`, `verify-news-issues.ts`,
`verify-news-feed.ts` — because if those fail, nothing below is worth reading.

**4.1 Confirm the characterizer's input population.**

```bash
node scripts/news-characterize.ts --dry-run --limit 20
```

Pass: every row printed corresponds to an existing `news_item`. Fail: it prints
URLs that are not stored rows.

**4.2 Confirm the unmatched drop is counted, not silent.** Run the enqueue path
over a sweep and read `PlanCounts`. Pass: `unmatched` and `offList` are non-zero
and reported. Fail: articles disappear with no count — that failure mode looks
exactly like "the press ignored these people".

**4.3 Confirm an untagged row survives.** Find a `news_item` with
`issues = '{}'` and load the feed. Pass: it renders. Fail: it is missing, which
would mean characterization is acting as a hidden filter.

**4.4 Re-measure issue distribution over `news_item`, not the corpus.** This is
the number that describes the product. Compare it against the corpus figures in
`news-corpus-analysis-2026-09-19.md` and `news-characterization-eval-2026-09-18.md`
§10, and correct §10's framing if the gap is large. Expect `B7` to be far
smaller than 18.6%.

In the same pass, **measure the near-duplicate rate over `news_item`** — same
event, different outlets. It is nearly free once you are already counting rows,
and it is the number that decides whether an event-level card (one story, a
list of the outlets that covered it) earns a new UI surface. For reference, a
cheap title-overlap check on the 116-row gold set put 19 rows (16%) in 8
multi-outlet clusters, but 5 of the 8 were `B7` blotter since relabelled — and
that set is the sweep pool, so it is an upper bound on the feed. Report the
feed number separately. Do not build clustering off this measurement alone:
sweep-time clustering sees articles that stage 3 then drops, so a card could
say "2 outlets" for an event four covered — that is a schema decision, and §5
changes the feed population first.

**4.5 Answer the §5 question below.** It is a founder decision, not a test.

## 5. The open question: political, but names no candidate

Today the sweep's only automatic inlet is candidate-matched. `election_news`
rows — race-scoped, no candidate — are **operator-submitted** through the admin
form (`src/components/admin/SubmitForm.tsx:99`, `candidateId ? "candidate_news"
: "election_news"`), then approved at the same boundary.

So a story that is unmistakably policy — a legislative vote, a budget decision,
a rule change — **has no automatic path into the system unless it names a
candidate on the roster.** The taxonomy work of the last week (v3–v7, 25
sub-issues across 11 categories) describes issues that the automatic pipeline
cannot currently deliver stories about.

Three options, none of them this brief's to pick:

1. **Leave it.** Operator submission is the path for non-candidate policy news.
   Honest, and it does not scale.
2. **Add a policy inlet.** Let Jev's tags admit a row that matched no candidate
   — which makes Jev a gate after all, a real change to the order in §1, with
   the cost §4.2 of the spec was avoiding.
3. **Race-scope more aggressively** at match time, so race-identifiable stories
   enter without naming anyone.

Option 2 is the one that matches the founder's original description of the
workflow. It should be chosen deliberately if it is chosen, not arrived at.

## 6. Read order

1. This file.
2. `docs/superpowers/specs/2026-09-18-news-characterization-design.md` §3
   (the pipeline diagram) and §4.2 (why stored rows).
3. `src/lib/news-match.ts` header — the ambiguity rule that decides stage 3.
4. `src/lib/news-enqueue.ts` — `planAttachments` and `PlanCounts`.
5. `scripts/news-characterize.ts` header — modes and fail-closed behaviour.
6. `docs/general-election/news-characterization-eval-2026-09-18.md` §10 — the
   v7 rationale whose numbers §2(b) qualifies.

## 7. What not to do

- **Do not change the order in §1 as a side effect of testing it.** If option 2
  in §5 is chosen, that is its own spec change with its own PR.
- **Do not re-tune the taxonomy against new numbers.** The corpus report's rule
  still holds: a measurement can show a count moved, never that the new count is
  righter. Label more rows first.
- **Do not treat a `B7` drop as a regression.** The 18 blotter labels were
  re-labelled on 2026-09-23 (eval §10); `B7` now carries 7 gold rows, 4 of them
  founder calls still open. The drop is the change working.
- **Do not read anything in this file as a live measurement.** Nothing here was
  read from the database.
