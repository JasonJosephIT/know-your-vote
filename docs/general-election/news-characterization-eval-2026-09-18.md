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

## 8. Follow-up — taxonomy v5 (2026-09-21)

**Version 4 was taken by other work, and it changed this section's claim.**
While this was being written, `f171c61` shipped taxonomy v4 — the fold that
put the orphaned *category* aliases back onto sub-issues after categories
stopped being asked on 2026-09-18. That commit reports a number this report
does not have: **`A2` housing scored 0.0% across an 834-article corpus that
carried two homelessness stories.** So the housing work below is now version
**5**, and one of its three entries is measured after all.

**What this corpus can and cannot say.** These 116 rows contain no housing,
insurance, condo, eviction or homelessness story at all, and `A1`/`A2` sat at
zero gold rows in §2. The homelessness evidence comes from the 834-article run,
not from here. `KYV6` and `KYV8` have no evidence from either.

| id | label | parent | why |
|---|---|---|---|
| `KYV6` | Renters and evictions | `housing` | The quiz's "stronger protections and stability for renters" had no sub-issue. `A2` is a price; a tenancy is not. |
| `KYV7` | Homelessness | `housing` | **Measured, and the alias route was measured to fail first.** See below. |
| `KYV8` | Condominium and HOA costs | `insurance` | Post-Surfside milestone inspections, reserve funding, special assessments. **The corpus argues against it** — see below. The weakest entry in the taxonomy. |

### Why `KYV7` rather than leaving the term on `A2`

`news-corpus-analysis-2026-09-19.md` — preserved on main after this section
was first written — already answered this, and it is worth quoting rather than
paraphrasing:

> **A2 is probably correct.** The two candidate articles are about homelessness
> *services*, not housing **affordability**, which is A2's label. Adding
> "homelessness" as an alias did not change it, and the label is right to
> resist. CAP's 15 has no concept for housing insecurity — a taxonomy gap to
> note, not a tagging failure.

So the alias route was not merely inelegant, it was **tried and measured not
to move the number**, and the analysis names the remedy: a missing concept.
`KYV7` is that concept. `homelessness` and `unhoused` move there. They are
still asked, which is the property `verify-news-issues.ts` asserts — it checks
"asked somewhere", deliberately not "asked under its own category".

This is the same failure as `B6` (§3) and the `KYV4` draft (§7), now three for
three: when an issue underperforms, suspect the label before the vocabulary.

### Alias widening, held down on purpose

v4 measured the counter-lesson: `A6` went **14 → 11** on the 834-article
corpus when its aliases were widened, so past roughly a dozen terms vocabulary
blurs a question instead of sharpening it. Held honestly, that datum cuts both
ways — the same corpus report warns it can show a count moved but not that the
new count is righter, so trimming on it is following the repo's own reading of
the number, not a proof that the trim is correct. `A1` therefore takes three
additions and lands at 7 — flood insurance, windstorm coverage, reinsurance,
because in Florida those are three different policies and three different
arguments, and its original four named only wind. `rate filing` and `insurer
insolvency` were dropped as insider vocabulary no headline uses. `A2` lands at
8 and keeps `homebuying` from the fold; `mortgage rates` and `homeownership`
were dropped as adjacent rather than central.

### `KYV8` has evidence against its urgency

The 834-article corpus puts `Insurance & Property Costs` at 13 articles, and
`A1` (3) plus `A3` (10) account for all 13. Nothing unexplained is sitting
there waiting for a condo issue: twenty-five days of 29 Florida outlets
produced no condominium story that any issue caught.

That is evidence against **urgency**, not against correctness. A special-
assessment story could be among the corpus's 531 untagged articles — precisely
what `KYV8` would catch — and the pool file was not preserved, so nobody can
look. The remedy is the one that report prescribes for every zero in it: label
rows. If you would rather not carry an unevidenced issue in the meantime, this
is the one to drop, and dropping it costs nothing today.

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
- **The rest of v4's fold.** Every other term it restored stayed exactly where
  it put them. `A2` was the one case where the receiving label did not describe
  the term, and it is the one case touched here.
- **A3 untouched.** It measured 100% precision / 80% recall in §2 — the only
  housing-or-property issue in this report with real numbers. Leave it alone.

### What the re-run should show

23 Nouls per article now, up from 16 at the time of §1, so roughly $0.016 a
pass at the §4 rate. Expect `KYV6` and `KYV8` to report `n/a` on a corpus like
this one; that is not a pass, it is silence. For `KYV7` there is a sharper test, and it is deliberately **not** alias
tuning: the corpus analysis identified its two homelessness articles by hand,
so those two have a known right answer. Re-run the corpus and check whether
they land on `KYV7`. That respects that report's own warning — *"do not tune
aliases against this corpus… it is unlabelled, so it can show a count moved
but never that the new count is righter"* — because two hand-identified
articles are not a count, they are a labelled pair. Everything wider than that
needs the gold set, and the gold set needs more rows. A window containing an
actual condo-assessment or encampment-ordinance story is what would test them,
and pulling one deliberately (`scripts/news-eval-pool.ts` over a wider date
range) is a cheaper way to find out than waiting for the daily sweep.

---

## 9. Follow-up — taxonomy v6, the A6 split (2026-09-21)

**§2's education row is retired by this change.** `A6` measured 100% precision
and 50% recall *as a two-subject label*. It is now three labels, and that
number predicts nothing about them.

### Why split rather than widen again

`A6`'s own history is the argument:

| | aliases | result |
|---|---|---|
| v1 | 5 | 25% recall |
| v2 | 13 | **50% recall, 100% precision** (§2) |
| v4 | 16 | the 834-corpus count fell **14 → 11** |

The lever is spent. Sixteen terms is past the point where that corpus measured
vocabulary starting to blur a question instead of sharpening it, and `A6` still
missed half the education stories in this gold set. `B6` sat in exactly this
position — a CAP label carrying two subjects, scoring badly — and splitting it
bought **+9 points of recall at no cost to precision** (§3). This is the fourth
application of the rule those episodes established: **when an issue
underperforms, suspect the label before the vocabulary.**

In Florida the two halves of CAP's label are not merely distinct, they are the
two *sides* of one argument. A voter who picked "Raising teacher pay and
classroom funding" and a voter who picked "Expanding families' options for
where students enroll" were shown the same tag.

| id | label | takes |
|---|---|---|
| `A6` | Public school funding and teachers | CAP's id and the public-school half, as `B6` kept its id and the election half |
| `KYV9` | School choice and vouchers | vouchers, scholarships, charters, open enrollment |
| `KYV10` | Career, vocational and higher education | vocational and technical training, apprenticeships, state colleges, universities, financial aid |

**`KYV10` is not an optional third.** `universities` is an `education` *category*
alias, so the v4 invariant requires some sub-issue to ask about it. Once funding
splits from choice, higher education has no honest home — its terms would sit
under a label about K-12 funding, which is the defect being fixed. It also fills
the quiz's third education option ("More vocational and career-path programs"),
which had no vocabulary anywhere, and covers the work-based learning grant §3
recorded `A6` missing.

`education policy` was dropped rather than reassigned, on the v4 precedent that
retired bare `development`: too generic to sharpen anything.

### `B2` healthcare: deliberately not split

It shows two of the same symptoms — 13 aliases, 40% recall, and a vocabulary
that has quietly absorbed public health (vaccines, disease outbreaks), which is
arguably its own subject. The quiz's third healthcare option, *"keeping
hospitals and clinics open where they're scarce"*, has no vocabulary beyond the
bare words `hospitals` and `clinics`.

**It waits, and the reason is measurement discipline rather than doubt.** A
split is only adjudicable against labelled rows, and `B2` has five. The corpus
analysis is explicit that 116 rows with several issues at n=0 is *"too thin for
a ±3 swing. Label more rows first."* `A6` could go ahead of that because its
alias count had crossed a measured threshold — a defect visible without new
labels. `B2`'s case rests on its recall number, and that number is exactly what
more labels would move. Splitting it now would spend the only healthcare
measurement this project has.

Named candidates for when the gold set is bigger: **public health** as its own
issue, and **rural and hospital access** for that orphaned quiz option.

### This should be the last growth round before labelling

The taxonomy has gone 15 → 25 sub-issues in four days. Two of those additions
have measured support (`KYV7`, and this split's premise); the rest rest on the
quiz's wording and Florida's issue space. Twenty-five Nouls is ~$0.018 a pass,
so cost is not the constraint — **evaluability is**. The gold set has not grown
since 2026-09-18, and every question added since then is unmeasurable against
it. The highest-value work in this area is no longer taxonomy design; it is
labelling rows, and §0's point about who labelled them still stands.

---

## 10. Follow-up — taxonomy v7, B7 narrowed to policy (2026-09-22)

**§2's best row is retired, and it was the best row.** `B7` measured 83%
precision and 96% recall on 25 gold rows and carried **155 of 834 articles**
in the corpus — 18.6%, several times any other issue. Those numbers were
real. What they could not say is what the 25 rows are.

### Reading the 25 rows

- **18 are crime blotter with no policy content whatever** — individual
  arrests and shootings, a road-rage incident involving thrown mayonnaise, a man
  robbed while buying cooking oil for his brother.
- **3 are near-duplicate execution-scheduling notices** for one kind of case.
- **3 are actual policy** (listed below).
- **1 is a road-safety statistic.**

So 96% recall meant `B7` was excellent at catching crime blotter, and the 83%
precision was measured against labels that call blotter *"Crime and public
safety"*. The label invited exactly that: asked whether a shooting relates to
`crime`, a model correctly says yes.

This is the `KYV4` defect — a label naming the phenomenon rather than the
policy — at the largest scale in the taxonomy, and the **fifth** instance of
the same lesson after `B6` (§3), `KYV4` (§7), `A2`/`KYV7` (§8) and `A6` (§9).

### Why it matters more here than anywhere else

This is a nonpartisan voter guide. A feed whose job is "news on the issues you
picked" would have placed last night's shooting under a political issue heading
beside candidate names, at roughly a fifth of the feed. What this category owes
a voter is where candidates stand on policing, courts and sentencing — not the
crime report.

### The change

`B7` keeps CAP's id and takes the policy half, as `B6` and `A6` did:
**"Crime policy, policing and courts"**, with aliases naming police funding and
oversight, sentencing laws, criminal justice reform, the court system, public
safety budgets, prison policy and fraud enforcement. Bare `crime` is dropped
rather than reassigned, exactly as bare `development` was in v4 — it is the
phenomenon, and no sub-issue should ask for it. The `safety` category's bare
aliases (`police`, `sheriff`, `courts`, `sentencing`) retire with it on that
same precedent; every one of them appears in routine crime coverage.

### Founder work: 22 of these 25 labels were in question

> **Applied 2026-09-23, founder-approved.** The 18 blotter rows below had `B7`
> removed in the gold set. 16 are now `[]`. **Two are now `["B3"]`, not `[]`**:
> the Hialeah row and the Christian Castro row were already multi-labelled
> `B7`+`B3` (both mention ICE), and v7 is a change to `B7` only — so `B3` was
> left as it was rather than removed without review. The **4 founder-call rows
> are unchanged and still `["B7"]`** pending that call. `B7` now carries 7 gold
> rows: the 3 kept below plus those 4.
>
> This heading previously said 21; the lists total 3 kept + 18 re-labelled + 4
> founder calls, so 22 rows were ever in question.
>
> **Scope note (2026-09-23).** This corpus and gold set were drawn from the
> sweep pool, not from stored `news_item` rows — see
> `news-ingest-order-handoff-2026-09-23.md` §2(b). Checked against the
> candidate names in `ballots/ballotpedia/*.json`, **17 of the 18 name no
> candidate** and would have been dropped before characterization in production;
> the 18th is a surname collision ("Thomas") that the matcher's ambiguity rule
> would attach as `related`, not `named`. So the `B7` share of the *feed* was
> smaller than the corpus figure above. (Ballotpedia is a proxy for the live
> roster, not the roster itself.)

**Expect the next run to look like a collapse.** `B7`'s recall against the
*current* labels should fall to roughly the rows listed as policy below,
because this change says the other labels are wrong. That is the `B8` situation
reversed: there the labels were suspect and the model was right; here the model
was right about the label it was given. **Do not read the drop as a regression
until these are re-labelled**, and per §0 and recommendation 6 the re-labelling
is not an agent's to do.

**Keep as `B7` (policy):**

- Axon, Flock questions surface as St. Pete signs off on FY 2027 budget
- Protecting the protectors: Donald Trump signs Laurel Lee’s prison staff safety measure
- House passes bills targeting senior scams, federal fraud and data-center power costs

**Re-label to no issue (crime blotter)** — applied; `B7` removed from all 18:

- Arrest made after southwest Miami-Dade teen shot in leg during argument, deputies say
- Community reacts after man killed during altercation with FDLE agent in southwest Miami-Dade
- Video shows fight before FDLE agent shot and killed man in SW Miami-Dade
- Ex-Miami Hurricanes star Mark Pope arrested, accused of pistol-whipping woman
- Suspect identified in shooting of teen after argument in southwest Miami-Dade, deputies say
- Deputy opens fire after multiple dogs maul woman in northwest Miami-Dade, MDSO says
- Cubano de 65 años vuelve a prisión tras grave acusación contra una niña en un Lowe's de Hialeah
- After ax murder at Palm Harbor home, convicted killer is sentenced
- Federal indictment accuses Lutz man of financially supporting Hamas
- Florida woman accused of throwing 'veganaise mayo' at driver in road rage incident
- $40K+ stolen from Florida man attempting to buy cooking oil for brother
- Argument between roommates leads to shooting inside Deltona home, deputies say
- Deltona man arrested in DeLand road rage shooting involving garbage truck driver
- Fight over drone escalates into murder-for-hire plot in Florida
- Suspect accused of shooting into roommate's bedroom after dispute, Volusia deputies say
- 2 arrested after violent motel attack in Kissimmee, officials say
- Roommate dispute leads to shooting in Deltona, deputies say
- ICE agent Christian Castro released from Minnesota state custody, pleads not guilty in federal court

**Founder call (case-specific, not clearly policy):**

- DeSantis sets execution of man convicted of killing sheriff’s deputy
- Execution date set for man convicted of fatally shooting Florida deputy
- DeSantis Sets Execution of Man Who Killed Indian River Deputy
- Florida Ranks No. 1 in U.S. for Deadliest Highways, New Study Finds

The three execution notices are one judgment: capital punishment is a policy
area, but a scheduling notice for a named case is closer to court reporting.
The highway-safety statistic is arguably road-funding policy rather than crime.
Both go whichever way the founder reads them; neither is this change's to
decide.

