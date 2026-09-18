# Characterizer evaluation — 2026-09-18

_Task C14 of `docs/superpowers/plans/2026-09-18-news-issue-tagging.md`, per
spec §6. Engine `jev-1.13.0`, provenance `jev:jev-1.13.0/tax-1/q-4598c359`,
15 sub-issue Nouls per article, one request each._

## 0. Read this before the numbers

**The gold set was annotated by Claude Opus 5, not by the founder.** An agent
grading an agent's output is circular, and these figures are a smoke test, not
ground truth. Where the model and the labels disagree, it is genuinely open
which one is wrong — §3 flags two cases where the labels are probably the
weaker of the two. Correct the labels in
`news-characterization-goldset-2026-09-18.jsonl` and re-run; the script is
deterministic given the same answers.

**The corpus is real.** 116 articles pulled from 29 of the 31 verified feeds on
2026-09-18 (`scripts/news-eval-pool.ts`), 14-day window, up to 4 per outlet.
Not fixtures. Two feeds failed: `diariolasamericas.com` (connection),
`miamitimesonline.com` (429 — the known BLOX rate-limit, verification §3.3).

Why feeds and not `news_item`: the live table holds **14 seeded rows** (6
`official_link`, 8 `election_news`) and no swept articles, because every
outlet's `leanTag` is null pending gate **C7-a**, so `usableOutlets()` returns
0 and the sweep has never run. Migration 0027 is also not applied live.

## 1. Threshold sweep

63 of 116 articles carry at least one gold tag; **53 should carry none**.

| Threshold | Precision | Recall | F1 | Exact set | Empty-case correct | No-dek recall |
|---|---|---|---|---|---|---|
| 0.50 | 74% | 76% | 75% | 73% | 83% | 75% |
| 0.70 | 81% | 74% | **77%** | 75% | 89% | 75% |
| 0.80 | 83% | 71% | 76% | 75% | 91% | 75% |
| **0.85** | **84%** | **69%** | 76% | **75%** | **92%** | 75% |
| 0.90 | 88% | 62% | 72% | 74% | 92% | 50% |
| 0.95 | 91% | 57% | 70% | 72% | 92% | 50% |

**0.85 holds up, and the founder's call stands.** F1 is flat from 0.70 to 0.85
(77/76/76 — inside the noise of a 116-row set), so the tie breaks on which
error is worse. Two reasons to prefer the higher end:

1. **The empty case is the majority case.** 53 of 116 articles should get no
   tags, and in a real sweep that share is higher still — the Sentinel sitemaps
   are ~120 URLs/paper/day of obituaries and wire sports. Empty-case accuracy
   rises 89% → 92% between 0.70 and 0.85. A false tag puts an irrelevant story
   on a candidate's card; a missed tag leaves a card one story shorter.
2. **Precision degrades gracefully, recall does not.** Past 0.90, no-dek recall
   halves (75% → 50%) — the input floor bites first when the threshold is
   raised, and sitemap rows are the ones with least to go on.

**Recall is 69%. Roughly one true tag in three is missed.** That is the headline
weakness, and §3 says where it comes from.

## 2. Per-issue at 0.85

| Issue | Gold | Predicted | Precision | Recall | Read |
|---|---|---|---|---|---|
| B1 economy/inflation/jobs | 4 | 4 | 100% | 100% | clean |
| B3 immigration/border | 11 | 9 | 100% | 82% | strong |
| A3 property taxes | 5 | 4 | 100% | 80% | strong |
| B7 crime/public safety | 25 | 29 | 83% | 96% | strong; the 5 FPs are the over-tag |
| A7 elections administration | 3 | 4 | 75% | 100% | small n |
| B2 healthcare | 5 | 1 | 100% | 20% | **under-tags** |
| A6 public education | 4 | 1 | 100% | 25% | **under-tags** |
| B6 election integrity | 5 | 4 | 25% | 20% | **broken — see §3** |
| A4 cost of living | 2 | 0 | n/a | 0% | **under-tags** |
| B8 climate/environment | 4 | 0 | n/a | 0% | **see §3 — labels suspect** |
| A1, A2, A5, B4, B5 | 0 | 0 | n/a | n/a | **not exercised at all** |

## 3. What the failures actually are

**B6 is a taxonomy problem, not a threshold problem.** "Election integrity and
threats to democracy" is doing two unrelated jobs. I labelled three
press-freedom stories (Trump barring CNN/MSNOW/Politico from the White House)
as B6 under "threats to democracy"; the model read B6 as *election* integrity
and declined. Both readings are defensible, which is the problem — the label is
ambiguous, and no threshold fixes an ambiguous label. Either split it, or
narrow it to election integrity and accept that press-freedom stories are
untagged. **This belongs to C11, not here.**

**B8's 0% recall is probably my labelling, not the model.** All four gold B8
rows are data-centre stories (moratoria, power costs). I filed those under
"Climate and environment (national)"; the model did not. On reflection the
model looks right — a county moratorium on AI data centres is land use and
energy policy, and CAP's B8 is about climate policy. **Fix the gold set before
blaming the model.**

**A4, A6 and B2 under-tag because the model reads labels narrowly.** It tags an
article when the headline is *about* the issue, not when the issue is a
consequence — a minimum-wage rise scored B1 but not A4; an AI-in-schools rule
scored nothing though it is plainly education policy. This is fixable in
`aliases`, which is what they exist for, and it is the cheapest experiment
available: widen A4/A6/B2 aliases, re-run, compare. **Also C11.**

**Five issues were never exercised.** A1 property insurance, A2 housing, A5
water/Everglades, B4 Social Security/Medicare, B5 abortion drew zero gold
labels in a 14-day window. The demo fixtures show the model handles all five,
but nothing here measures them. A longer window, or a targeted top-up, is
needed before anyone claims the taxonomy is validated.

## 4. Cost and reliability

- **236,352 input tokens for 116 articles**, output free — **$0.0099 total**,
  **$0.000085 per article**, 2,038 tokens per article.
- **0 errors in 116 calls.**
- At 200 rows per daily sweep: **$0.017 a sweep, ~$0.77 to 2026-11-03.**
- Cost decides nothing, so the second engine (spec §6 item 6) is not justified
  on price. Nor on quality yet: **do not build the Anthropic arm.** The failures
  above are taxonomy-wording problems, and a second engine would inherit every
  one of them.

## 5. Not measured here

- **Per-candidate tag distribution (spec §6 item 2).** Needs a real roster
  (ingest B2) and `named` rows, which need the sweep, which needs C7-a. When it
  runs: report it, never publish it, and never feed it to `balance_audit_core`
  — CN-R10's variance stays over deterministic `named` counts.
- **Rendering.** Gate G4 is untouched. Nothing here reaches a voter.

## 6. Recommendation

1. **Keep 0.85.** Supported by the sweep; revisit after the C11 fixes.
2. **Fix the gold set's B8 rows** before treating that 0% as a model failure.
3. **Split or narrow B6** — the single clearest defect, and it is editorial.
4. **Widen A4/A6/B2 aliases and re-run.** Cheapest available experiment at
   ~$0.01 a pass.
5. **Do not build a second engine.**
6. **Re-label the gold set as founder work.** Everything above rests on an
   agent's labels, and §3 already found two places where they are the weaker
   half of the disagreement.
