# Fetch the lean ratings — session brief

_Written 2026-09-18. A self-contained task for a fresh session. It closes the
research half of founder gate **C7-a**, which has blocked the news sweep since
2026-09-17. It does **not** close the gate — see §7._

## 1. The task in one sentence

Fetch the published AllSides / Ad Fontes / MBFC rating pages for the **12
outlets that can be cited**, and record what they actually say — publisher,
rating, date, URL, access date — into `leanBasis` in `src/lib/news-sources.ts`,
so the founder signs off against citations instead of proposals.

**This is retrieval and transcription. It is not judgment.** You are copying
what a rating agency published. At no point do you decide, infer, estimate or
"sanity-check" an outlet's political lean. If a rating cannot be found, that
is a finding, and you record the absence.

## 2. Why this exists

`src/lib/news-sources.ts` holds 37 outlets. Its header claims the founder
sign-off is *"a one-word edit per row, not a research task"* because
`leanBasis` records what the 2026-09-17 corpus cited.

**That is false for 33 of the 37 rows**, which read *"No independent bias
rating cited in the 2026-09-17 corpus."* There is nothing to transcribe for
them, and the reason is structural, not a backlog: AllSides, Ad Fontes and MBFC
rate national and large-metro outlets. They do not rate WSVN, WFTV,
Le Floridien, The Westside Gazette or América TeVé, and they never will.

So the 37 rows split three ways:

| Group | Count | What this task does |
|---|---|---|
| Local outlets with a recorded rating | 4 | Fetch and verify the exact rating text (§4) |
| National outlets researched but never added | 8 | Fetch ratings so they *can* be added (§5) |
| Local outlets no rater covers | 25 | **Nothing. Do not touch them.** They need the `unrated` schema change (§7) |

`docs/general-election/news-corpus-2026-09-17.md` Recommendation 5 already asks
for exactly this: *"before launch, fetch the AllSides/Ad Fontes/MBFC pages for
all eight to lock `leanBasis`."* It was never done.

## 3. The rules, which are not negotiable

1. **Never assert a lean from your own knowledge.** Not for a famous outlet,
   not as a "safe" default, not to fill a gap. `CN-R3` and the module header
   both forbid it. A lean with no citation is worse than no lean.
2. **A rating is only usable if you fetched the page this session.** The corpus
   doc's own rule: *"A feed you did not fetch is worse than no feed."* The same
   applies to ratings. Record the URL and the access date on every one.
3. **Record disagreement as disagreement.** Where raters differ (they do for 3
   of the 4 locals), write all of them with their values. Do not average,
   reconcile, or pick the majority. The founder decides; you supply evidence.
4. **`leanTag` stays `null`.** This task only writes `leanBasis`. Setting
   `leanTag` is the founder's act, and it is what gate C7-a *is*.
5. **The two-gate standard is the project's** (`CAP_Change_Spec_Stances_and_RelatedNews_v1.md` §7):
   AllSides **Center**, and Ad Fontes reliability **≥ 36** with bias within
   **±12**. Record the numbers so the gate can be applied; do not apply it
   yourself.
6. **Attribution is required if AllSides data is used.** Their chart is
   CC BY-NC 4.0 and the spec calls for a line such as *"Source credibility
   ratings via AllSides (CC BY-NC 4.0)."* Note in your report that this line is
   owed wherever the data renders.
7. **Honour robots and rate limits.** One request per host at a time, and back
   off on 429 rather than retrying in-run. Several outlets in this project's
   corpus declare crawl delays; the rating sites are third parties and deserve
   the same courtesy.

## 4. Group A — the 4 local outlets that have ratings

Verify each against the live rating pages. Current `leanBasis` text is quoted
so you can tell confirmation from drift.

| Outlet | Domain | County | Current recorded basis |
|---|---|---|---|
| Miami Herald | `miamiherald.com` | 12086 | Raters disagree: MBFC Left-Center (−3.4, High; notes Democratic presidential endorsements since 2000); AllSides Lean Left (low confidence, Sep 2026); Ad Fontes Middle/Reliable. Corpus proposes **center-left** |
| South Florida Sun Sentinel | `sun-sentinel.com` | 12011 | Mild disagreement: AllSides Center (low confidence, Apr 2026); MBFC Least Biased (High); Ad Fontes Lean Left *per Ground News*. Corpus proposes **center** |
| Tampa Bay Times | `tampabay.com` | 12057 | Single rater: AllSides Center (low confidence, Aug 2026). No corroboration. Corpus proposes **center** |
| Orlando Sentinel | `orlandosentinel.com` | 12095 | Raters disagree: MBFC Left-Center (−2.8, High); Ad Fontes Skews Left/Reliable; AllSides Center (low confidence, Aug 2026). Corpus proposes **center-left** |

Two things to resolve specifically:

- **The Sun Sentinel's Ad Fontes value is second-hand** ("per Ground News").
  Get it from Ad Fontes directly or mark it unconfirmed.
- **AllSides "low confidence" matters.** AllSides publishes a confidence level
  per rating; three of these four are low. Record the confidence level, because
  a low-confidence Center is weaker evidence than the word "Center" suggests.

## 5. Group B — the 8 national outlets, currently unadded

From `docs/general-election/news-corpus-2026-09-17.md` TABLE 3. Every row there
says *"rating exists; not fetched — confirm"*. Proposed leans are the corpus's
guesses and carry no authority.

| Domain | Publisher | Corpus-proposed lean |
|---|---|---|
| `reuters.com` | Reuters | center |
| `apnews.com` | Associated Press | center |
| `thehill.com` | The Hill | center |
| `politico.com` | POLITICO | center-left |
| `nytimes.com` | The New York Times | center-left |
| `wsj.com` | The Wall Street Journal (news) | center-right |
| `washingtonexaminer.com` | Washington Examiner | right |
| `foxnews.com` | Fox News (Politics) | right |

**Do not add these rows to `OUTLETS` in this task.** A national row carries
`countyFips: null`, which is indistinguishable from a Florida statewide outlet
in the county feed (`news-corpus-verification-2026-09-17.md` §3 item 7). Adding
a national tier needs a schema decision first. Write their ratings into the
corpus doc, and note the tier problem is still open.

Note also: AP is **already** in `OUTLETS` as a statewide row. Reconcile rather
than duplicating it.

## 6. Where to put what

- **Group A** → edit `leanBasis` in place in `src/lib/news-sources.ts`.
  `leanTag` stays `null`.
- **Group B** → a new table in
  `docs/general-election/lean-ratings-fetched-<date>.md`, with the same columns
  plus URL and access date. Do not edit `news-sources.ts` for these.
- **A report** at the same path covering: what was found, what was not, which
  raters had no entry, any rating that contradicts the 2026-09-17 record, and
  the CC BY-NC attribution obligation from rule 6.
- **Run the guardrail after any edit**: `node scripts/verify-news-issues.ts`
  and `node scripts/verify-news-sweep.ts`. The neutrality lint checks wording
  and *will* catch banned terms — it caught "election fraud **claims**" in a
  previous session, because "claims" is a banned attribution verb. `leanBasis`
  is prose and is subject to it.

## 7. What this does NOT do — read before promising anything

**This does not unblock the sweep.** After a perfect run:

- 4 local rows have citations, `leanTag` still null pending the founder.
- 8 national rows have citations but are not in `OUTLETS`, pending a tier
  decision.
- **25 local outlets still have no rating and never will.**

`usableOutlets()` requires a non-null `leanTag`, so it would still return 0
until the founder signs the 4 — and even then the sweep would cover 4 large
metro dailies, which is the opposite of what a local-news corpus is for.

**The actual unblock is a schema value for "no rater covers this outlet."**
Today `lean_tag` is CHECK-constrained to
`left | center-left | center | center-right | right | N/A`, and `N/A` means
*"lean does not apply"* (a government primary document), not *"nobody has rated
this."* Conflating them is a small lie on a voter-facing card. Adding
`unrated` — migration, the `LeanTag` type, `newsLabels()` rendering, and
`usableOutlets()` — is a separate task and a founder decision, because it
changes what 25+ of 37 cards say.

## 8. Read order

1. `src/lib/news-sources.ts` header — the two founder gates and the two
   fail-closed flags, and why `leanTag` is null.
2. `CAP_Change_Spec_Stances_and_RelatedNews_v1.md` §7 — the two-gate standard
   and the attribution requirement. **Project root, not `docs/`.**
3. `docs/general-election/news-corpus-2026-09-17.md` — TABLE 3, "Outlets
   Considered and Rejected", "Flagged for Founder Sign-off", Recommendation 5.
4. `docs/general-election/news-corpus-verification-2026-09-17.md` §3 — items 3
   (BLOX rate limits), 4 (AI-crawler stance) and 7 (the national-tier problem).
5. `docs/general-election/news-fairness.md` §1 — lean is disclosed, never
   judged, and never colour-coded.

## 9. Acceptance

- [ ] Every Group A row's `leanBasis` cites a rater, a value, a confidence or
      score where published, a URL, and an access date.
- [ ] The Sun Sentinel's Ad Fontes value is first-hand or explicitly marked
      unconfirmed.
- [ ] Group B ratings are recorded in the report, and **no national row was
      added to `OUTLETS`**.
- [ ] No `leanTag` changed from `null`. Not one.
- [ ] Any rater with no entry for an outlet is recorded as absent, not skipped.
- [ ] Guardrails green; `leanBasis` prose passes the neutrality lint.
- [ ] The report states plainly that the sweep is still blocked, and why.
