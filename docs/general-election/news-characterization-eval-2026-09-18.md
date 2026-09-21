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
0 and the sweep has never run. Migration 0027 was applied live on 2026-09-19 (recorded as `news_issues`); this line said otherwise until 2026-09-21.

## 1. Threshold sweep — taxonomy v2

63 of 116 articles carry at least one gold tag; **53 should carry none**.

| Threshold | Precision | Recall | F1 | Exact set | Empty-case correct | No-dek recall |
|---|---|---|---|---|---|---|
| 0.50 | 76% | 88% | 82% | 80% | 83% | 75% |
| 0.70 | 80% | 84% | 82% | 81% | 89% | 75% |
| 0.80 | 85% | 81% | **83%** | 81% | 91% | 75% |
| **0.85** | **85%** | **78%** | 82% | **80%** | **92%** | 75% |
| 0.90 | 91% | 74% | 81% | 81% | 92% | 75% |
| 0.95 | 91% | 63% | 75% | 77% | 92% | 50% |

### What the v1 → v2 fixes bought

| At 0.85 | v1 | v2 | Δ |
|---|---|---|---|
| Precision | 84% | 85% | +1 |
| **Recall** | **69%** | **78%** | **+9** |
| **F1** | **76%** | **82%** | **+6** |
| Exact set | 75% | 80% | +5 |
| Empty case | 92% | 92% | — |

**Recall rose 9 points with no precision cost.** The B6 split did most of it;
the alias widening did the rest.

**0.85 still stands.** F1 is flat across 0.50–0.85 (82/82/82/83/82) — all
inside the noise of a 116-row set. Two notes if you want to revisit:
- **0.90 now costs less than it did.** In v1 it halved no-dek recall (75% →
  50%); in v2 no-dek recall holds at 75% all the way to 0.90. So 0.90 buys
  +6 points of precision for −4 of recall, where before it was a bad trade.
- **0.80 is nominally the F1 peak** (83% vs 82%). One point on 116 rows is not
  a reason to move a threshold.

## 2. Per-issue at 0.85 (v2)

| Issue | Gold | Pred | Precision | Recall | vs v1 |
|---|---|---|---|---|---|
| B1 economy/inflation/jobs | 4 | 4 | 100% | 100% | unchanged |
| A7 elections administration | 3 | 4 | 75% | 100% | unchanged |
| **KYV1 democratic institutions** | 5 | 7 | **71%** | **100%** | **was B6 at 25%/20%** |
| B7 crime/public safety | 25 | 29 | 83% | 96% | unchanged |
| B3 immigration/border | 11 | 9 | 100% | 82% | unchanged |
| A3 property taxes | 5 | 4 | 100% | 80% | unchanged |
| **A6 public education** | 4 | 2 | 100% | **50%** | **was 25%** |
| **B2 healthcare** | 5 | 2 | 100% | **40%** | **was 20%** |
| A4 cost of living | 2 | 0 | n/a | 0% | unchanged — see §3 |
| B8 climate/environment | 4 | 0 | n/a | 0% | unchanged — labels suspect |
| B6 election integrity (narrowed) | 0 | 1 | 0% | n/a | not exercised |
| A1, A2, A5, B4, B5 | 0 | 0 | n/a | n/a | not exercised |

## 3. What the failures actually are

**B6 — fixed, and the split was vindicated by the data.** CAP's "Election
integrity and threats to democracy" was two subjects under one label. Split
into `B6` (Election integrity — certification, security, voter rolls,
recounts) and `KYV1` (Threats to democratic institutions — press freedom, rule
of law, political violence). The `KYV` prefix marks it as this project's
addition rather than a sourced CAP entry.

Re-labelling was revealing: **all five rows the annotator had filed under the
bundled B6 were the democracy half** — press-freedom stories — and **none were
election integrity**. So the model's original refusal to tag them B6 was
correct, and the 25%/20% score was measuring an ambiguous label, not a weak
classifier. KYV1 now scores 71% precision, 100% recall.

Narrowed B6 has **zero** gold examples: the 14-day window carried no
election-integrity story at all. It is unmeasured, not validated.

**A6 and B2 — improved by widening aliases, as predicted.** A6 25% → 50%,
B2 20% → 40%. Both still miss real stories, so there is more room in the alias
lists; this is the cheapest lever available and it demonstrably works.

**A4 — alias widening did NOT work, and the reason is structural.** Both gold
A4 rows (a gas-price story, a minimum-wage rise) were tagged `B1` by the model
and not `A4`, even after "gas prices" and "fuel costs" were added. A4 "Cost of
living in Florida" and B1 "Economy, inflation, and jobs" overlap so heavily
that the model consistently prefers the broader one. **This is a taxonomy
overlap, not a wording gap** — more aliases will not fix it. Either accept that
A4 rarely fires, or merge it into B1 and lose the Florida-specific distinction.
A founder call; not urgent, since B1 catches the article either way and both
roll up to the same `economy` category.

**B8 — still 0%, and the labels are still the suspect half.** Unchanged
deliberately: the gold rows were left alone so v1 and v2 stay comparable. All
four are data-centre stories the annotator filed under "Climate and environment
(national)". The model declined, and on reflection it is right — a county
moratorium on AI data centres is land use and energy policy. **Fix the labels,
then re-measure.**

## 4. Cost and reliability

- **258,856 input tokens for 116 articles** (v2, 16 questions), output free —
  **$0.0109 total**, **$0.000094 per article**, 2,232 tokens per article.
- v1 was $0.0099 at 15 questions. The B6 split added one Noul; +$0.001 a run.
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

1. **Keep 0.85.** Still inside the flat region of the sweep. If you want to
   favour precision, 0.90 is now a reasonable trade that it was not in v1.
2. **Fix the four B8 gold rows**, then re-run. It is the last known-bad input.
3. **Keep widening A6/B2 aliases** — the lever measurably works, ~$0.011 a pass.
4. **Decide A4 vs B1** (§3). Structural overlap, no urgency.
5. **Do not build a second engine.** Nothing here is an engine weakness; every
   remaining defect is taxonomy wording or annotation.
6. **Re-label the gold set as founder work.** This still rests on an agent's
   labels, and the B6 episode is a live example of an annotator's reading being
   the thing under test.

---

## 7. Follow-up — taxonomy v3 (2026-09-20)

**Every number above is a v2 number and stays one.** This section records what
changed afterwards so the report is not read as covering a taxonomy it never
ran against.

**Recommendation 2 is done: the four B8 gold rows are fixed.** All four were
data-centre stories — one Orange County moratorium and the same David Jolly
interview from three outlets — filed under "Climate and environment
(national)". They now carry `["KYV2", "KYV3"]`.

**That required new issues, not new labels.** There was nowhere correct to put
them: the taxonomy had `A5` (Florida water and Everglades) and `B8` (national
climate) and nothing for energy or land use. So `environment` gained three
sub-issues, and `TAXONOMY_VERSION` went to `3`:

| id | label | why |
|---|---|---|
| `KYV2` | Energy and utilities | The measured gap. Half of what a data-centre story is about; nothing else in the taxonomy covered electricity, the grid or power bills. |
| `KYV3` | Growth, development and land conservation | The other half — a county moratorium is a land-use decision. Also the quiz's "balancing environmental rules with growth and development", which had no sub-issue. |
| `KYV4` | Storm resilience and flood protection | The quiz's "preparing infrastructure for storms and flooding", which had no sub-issue either. No gold examples — see below. |
| `KYV5` | Water supply and drinking water | Water had two halves and only one was in the taxonomy. `A5`'s label — CAP's, verbatim — is about ambient quality and the Everglades; nothing named the tap. A wellfield permit, a hosepipe ban, an aquifer drawdown or a water-rate rise had nowhere to go. No gold examples. |

`A5` keeps its label and gains the ambient-quality aliases it lacked (algae
blooms, sewage spills, wastewater discharge, septic-to-sewer, springs,
seagrass). `KYV2`'s aliases were narrowed to electric and fuel terms so a
water bill lands in `KYV5` and not in both.

### The gold set caught a bad label before the model did

`KYV4` was first drafted as **"Storm resilience and flooding"**, with
`flooding` among its aliases. Two rows already in the gold set refute that
wording: *"Flooding causes travel delays across Broward County"* and *"Flood
advisory issued for Broward as heavy rain could lead to more flooding"*, both
correctly tagged with **no issue** — they are weather reports. Asked whether
they relate to "flooding", a model says yes and is not wrong; the question was
bad. Asked whether they relate to flood **protection**, it says no. The label
and every alias now name what a government builds or funds, not what the sky
does. This is the `B6` lesson a second time: when precision looks likely to
fail, suspect the label first.

**B8 was deliberately not widened**, against the shape of recommendation 3.
The lever works on A6/B2 because those were wording gaps. B8 was not: the model
declined the four rows because they were not national climate policy, and it
was right. `energy` moved out of B8's aliases to KYV2 so the broad label cannot
swallow the narrow one the way B1 swallows A4 (§3).

### What this is not

- **Not measured.** Nothing in §1–§2 was re-run. Four new Nouls per article
  (16 → 20), a widened `A5` and four re-labelled rows all move the numbers, in
  unknown directions. Re-running needs `TYPESAFE_API_KEY`, which is a founder action:
  `node scripts/news-characterize-eval.ts docs/general-election/news-characterization-goldset-2026-09-18.jsonl`.
  Expect roughly $0.014 at 20 questions (§4), and treat the result as the first
  v3 baseline rather than a comparison — v2 could not express these tags at all.
- **Not founder-labelled.** §0 still holds, and recommendation 6 is still open:
  these four rows were re-labelled by an agent, the same as the other 112.
- **KYV4 and KYV5 are unexercised.** The 14-day window carried no
  storm-resilience story and no water-supply story, so both sit where A1, A2,
  A5, B4 and B5 sit — present and unscored. They are in because the quiz asks
  about one and Florida argues about the other, not because the evaluation
  found either missing.
- **One thing to watch in the re-run.** The data-centre rows call the
  facilities "water- and power-guzzling", so they may now fire `KYV5` as well
  as `KYV2`/`KYV3`. Their gold labels were left at `KYV2`+`KYV3`; whether the
  water clause earns a third tag is a labelling call, and §0 still applies to
  who made these labels.
- **Recommendation 4 (A4 vs B1) is untouched.** Still a founder call, still not
  urgent.

---

## 8. Follow-up — taxonomy v4 (2026-09-21)

**Weaker footing than §7, and the difference matters.** Version 3 was prompted
by `B8`'s 0% recall over four real gold rows — a measured miss. Version 4 is
prompted by the quiz's wording and by Florida's issue space. **This corpus
contains no housing story, no insurance story, no condo story, no eviction
story and no homelessness story at all**, and `A1` and `A2` were already at
zero gold rows in §2. Nothing below is validated by anything in this report.

| id | label | parent | why |
|---|---|---|---|
| `KYV6` | Renters and evictions | `housing` | The quiz's "stronger protections and stability for renters" had no sub-issue. `A2` is a price; a tenancy is not. |
| `KYV7` | Homelessness | `housing` | The `housing` category has listed `homelessness` among its aliases since it was written, with no sub-issue able to catch it. A tag that can never fire is a promise the taxonomy doesn't keep. |
| `KYV8` | Condominium and HOA costs | `insurance` | Post-Surfside milestone inspections, reserve funding and special assessments. No quiz option names it and no gold row exercises it — the most speculative entry in the taxonomy. |

`A1` gained flood, windstorm, residual-market and reinsurance aliases — in
Florida those are three different policies and three different arguments, and
the original four aliases named only wind. `A2` gained home prices, down-payment
assistance, affordable housing, mortgage rates and homeownership, and stays
deliberately on cost, supply and buying.

### The `KYV8` parent is a judgment call, and a cheap one to reverse today

It rolls up to `insurance` because that category's quiz question reads "On
property insurance and what it costs to keep a home", and a five-figure special
assessment is the sharpest example of that cost Florida currently offers. The
argument for `housing` — a condominium is a home, and milestone inspections are
building safety — is not weak. Moving it costs nothing while the sweep has never
run and no row carries the tag; it stops being free the moment one does.

### Deliberately not added

- **Auto insurance** (PIP repeal and its successors). No quiz option, no gold
  row, and lower salience than the property-insurance argument. Adding an issue
  because it exists somewhere in the state's politics is how a taxonomy grows
  past what anyone can evaluate.
- **A3 untouched.** It measured 100% precision / 80% recall in §2 — the only
  housing-or-property issue in this report with real numbers. Leave it alone.

### What the re-run should show

23 Nouls per article now, up from 16 at the time of §1, so roughly $0.016 a
pass at the §4 rate. Expect `KYV6`, `KYV7` and `KYV8` to report `n/a` on a
corpus like this one; that is not a pass, it is silence. A window containing an
actual condo-assessment or encampment-ordinance story is what would test them,
and pulling one deliberately (`scripts/news-eval-pool.ts` over a wider date
range) is a cheaper way to find out than waiting for the daily sweep.
