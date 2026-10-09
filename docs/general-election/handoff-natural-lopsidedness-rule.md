# Handoff: make "natural lopsidedness" a repo rule

**From:** R4 ops digest session, 2026-10-09
**Founder direction (2026-10-09, paraphrased):** Some coverage is lopsided
because the world is lopsided, not because of anything we did. If one
candidate gets far more press, or public opinion runs strongly one way, voters
should be able to see that. It is neutral information, and it often reflects
something the candidate did or something happening in society. We never
*create* bias, and we never hide or flatten real imbalance either.

## The rule (proposed wording, to paste into the repo)

> **Neutrality governs our conduct, not the world's.** We never introduce
> bias through framing, selection, padding, or trimming. When coverage,
> opinion, or attention is uneven *in the world*, we show it accurately,
> with its sources. An imbalance is something to diagnose, not something to
> correct. Every symmetric-coverage check asks one question: **did our pipeline
> miss something (fix it), or is the skew real (show it)?**

Corollaries:
1. Fix pipeline gaps only: missing feeds, name aliases, unequal search effort.
   Never pad a thin candidate or trim a heavy one to even out counts.
2. A real skew is shown with context ("14 sourced stories for A, 3 for B in the
   last 30 days"), not hidden and not editorialised.
3. Lean is still disclosed, never scored (unchanged, `news-fairness.md` §1).

## Where it lands

| File | Change |
|---|---|
| `AGENTS.md` (repo root) | Add the rule as a short "Neutrality" section so every coding agent loads it. This is the "repo rules" home, since `CLAUDE.md` imports `AGENTS.md`. |
| `docs/general-election/news-fairness.md` §2 | Add the rule above "Equal slots". **See the open decision below.** |
| `docs/general-election/refresh-agents-plan.md` (~line 156) | Reword "a persistently lopsided feed is a flag" to say the flag triggers a source check, and a confirmed real skew is shown, not fixed. |
| `docs/general-election/agents/r1-candidate-news.prompt.txt` rule 5 and step 6 | Keep "same query pattern and effort". Change the "Balance note" so it labels each lopsided race *pipeline gap suspected* or *real-world skew*. |
| `~/.claude/scheduled-tasks/cap-r4-ops-digest/SKILL.md` §3 | Keep the ≥3× flag, but read it as "check source, don't correct". The 2026-10-09 digest already uses this framing. |
| `docs/VISION.md` / `docs/prd.md` | Optional: one line next to "verifiable neutrality". |

## Decision for Jason: **C chosen, 2026-10-09** (equal slots + "show all N stories" expander; written into `news-fairness.md` §2)

`news-fairness.md` §2 "Equal slots" says each candidate gets the same `N`
news slots, *specifically* so the layout does not inherit the media's
asymmetry. A shortfall is stated ("Only 2 sourced stories found…"), but the
heavier candidate's surplus is never shown. That partly conflicts with
today's direction. Options:

- **A. Keep equal slots and add a visible count line** per race: "Coverage in
  the last 30 days: A 14 · B 3 · C 0". The layout stays even, and the
  imbalance is shown as a fact. *(Recommended: smallest change, and it shows
  the skew without letting one candidate dominate the page.)*
- **B. Drop equal slots.** Show the most recent items per race so volume shows
  through directly.
- **C. Equal slots plus a "show all N stories" expander** for candidates with
  surplus.

## Current data that motivated this (from `CAP_Ops_Digest_latest.html`)

candidate_news, last 30 days: FL-GOV-general 8 · 6 · 0×6; FL-SEN-general
7 · 1 · 0. Before treating these as real, confirm the zero-count candidates
are missing from the news itself and not just from our 24 feeds.

## Verify before calling a skew "real": the source check

A count of 0 in our DB means only that our pipeline found nothing. Before
any race's imbalance is shown to voters as real-world coverage, run this
check. It is also the standing procedure for every ≥3× flag R4 raises.

**Procedure (per flagged race):**
1. **Include the review queue.** Count each candidate's `review_item`
   rows (`status = 'pending'`, `payload->>'item_type' = 'candidate_news'`)
   alongside the live `news_item` rows. 46 candidate_news items were pending
   on 2026-10-09 and may change these counts.
2. **Search outside our feeds.** For each low/zero-count candidate, run the
   same query pattern (full legal name, ballot name, and nickname/aliases)
   over the same 30-day window against at least one broad index outside our
   24 feeds (e.g. Google News, GDELT, or AP/Ballotpedia news pages). Run the same
   search for the high-count candidate as a baseline.
3. **Classify the result.** Record one label per candidate:
   - **pipeline gap**: the outside search finds in-window stories from an
     outlet we'd accept, and our feeds missed them. Fix the gap (feed, alias,
     sitemap, matching threshold). Never hand-add items to even out counts.
   - **real-world skew**: the outside search finds about the same (little or
     nothing). Show the imbalance as a fact.
   - **unclear**: say so, and don't present the skew as real yet.
4. **Write it down.** Put the label, the queries used, and the outside-search
   hit counts in the R1 run report, and in the R4 digest next time the race is
   flagged.

**First instance, owed now (counts = live candidate_news, 30 days, 2026-10-09):**

| Race | Candidate | Party | Ours | Source check |
|---|---|---|---|---|
| FL-GOV-general | Byron Donalds | REP | 8 | baseline |
| FL-GOV-general | David Jolly | DEM | 6 | baseline |
| FL-GOV-general | Charles Burkett | NPA | 0 | ☑ real-world skew |
| FL-GOV-general | Dean Ocean Abrams | NPA | 0 | ☑ real-world skew |
| FL-GOV-general | Frank J. Russo | NPA | 0 | ☑ real-world skew (press releases only) |
| FL-GOV-general | Jeffrey Peter "Dr. Jeff" Datto | NPA | 0 | ☑ real-world skew |
| FL-GOV-general | Moliere "Moe" Dimanche | NPA | 0 | ☑ real-world skew |
| FL-GOV-general | Scott Eckhard Jewett | LPF | 0 | ☑ real-world skew |
| FL-SEN-general | Angie Nixon | DEM | 7 | baseline |
| FL-SEN-general | Ashley Moody | REP | 1 | ☑ **pipeline gap**: WUSF 10-01 and NBC Miami 10-07 stories from registered outlets never entered the pipeline |
| FL-SEN-general | Neil J. Gillespie | NPA | 0 | ☑ real-world skew (passing mentions only) |

Ashley Moody is the sitting U.S. Senator, so 1 item in 30 days points to a
likely pipeline gap (name matching, or which outlets cover federal office). It
probably does not reflect real coverage. Verify it before anything else.

## Done when

Results: `source-check-2026-10-09.md`. Caveat for every row: R1 began writing
candidate_news on 2026-10-06 (earliest story 09-30), so our "30-day" counts
cover about 9 days; the baselines are also missing 09-09 to 09-29.

- [x] Rule text is in `AGENTS.md`
- [x] Open decision A/B/C is made, and `news-fairness.md` §2 is updated to match
- [x] `refresh-agents-plan.md` and the R1 prompt are reworded as above
- [x] R4 task file wording is aligned
- [x] Source-check procedure is written into the R1 prompt (run report) and the R4 task (§3)
- [x] First instance done: all 9 ☐ rows above labelled, Moody first
- [x] Shipped as one PR (main checkout is dirty; branch from a fresh worktree)
