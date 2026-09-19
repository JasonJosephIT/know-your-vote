# Which issue list do news tags come from? — founder review

_Written 2026-09-18 for gate G3 of
`docs/superpowers/specs/2026-09-18-news-characterization-design.md`.
Nothing is built until this is answered. The design spec previously marked G3
closed on the quiz's list; that was premature and is corrected here._

This is an editorial decision, which is why it is yours and not a coding
agent's. `CAP_Change_Spec_Stances_and_RelatedNews_v1.md` §14.3 already records
it as open: *"Common issues set. Define the fixed list of issues each candidate
is profiled against, so stance coverage stays symmetric across a race."*

---

## 1. The three lists that exist

| | Where | Count | Scope | State |
|---|---|---|---|---|
| **Quiz** | `src/lib/quiz-questions.ts` | 8 | statewide | **Live and voter-facing.** Neutrally worded under TASK-032 |
| **CAP** | `CAP_Issue_List_FL_2026_v1.md` | 15 | FL statewide + FL-10/15/23/28 | Research artifact, 2026-07-15. Sourced, balance-checked, versioned. Never wired to anything |
| **`issue` table** | `0000_pipeline_read_models.sql:66` | — | **per race** (`race_id NOT NULL`) | Demo-seeded only; pipeline-owned; idle since briefs were retired |

The `issue` table is not a candidate for this job: it is race-scoped, so a
statewide news taxonomy does not fit it without a schema change, and nothing
has written to it outside the demo seed. It is listed here only so it is not
rediscovered later as a missed option.

---

## 2. The full mapping — CAP's 15 against the quiz's 8

| CAP id | CAP label | `applies_to` | Rolls up to quiz issue |
|---|---|---|---|
| A1 | Property insurance costs | both | `insurance` |
| A2 | Housing affordability | voter_salience | `housing` |
| A3 | Property taxes | both | `insurance` |
| A4 | Cost of living in Florida | voter_salience | `economy` |
| A5 | Water quality and Everglades restoration | both | `environment` |
| A6 | Public education and school choice | both | `education` |
| **A7** | **Elections administration and voting access** | both | **— none —** |
| B1 | Economy, inflation, and jobs | voter_salience | `economy` |
| B2 | Healthcare access and costs | voter_salience | `healthcare` |
| B3 | Immigration and border enforcement | voter_salience | `immigration` |
| **B4** | **Social Security and Medicare** | voter_salience | **— none —** |
| **B5** | **Abortion policy** | voter_salience | **— none —** |
| **B6** | **Election integrity and threats to democracy** | voter_salience | **— none —** |
| B7 | Crime and public safety | voter_salience | `safety` |
| B8 | Climate and environment (national) | voter_salience | `environment` |

Eleven of fifteen roll up cleanly. Two quiz issues are collapses of two CAP
issues each (`economy` = A4 + B1; `insurance` = A1 + A3; `environment` =
A5 + B8 makes three).

---

## 3. The four gaps, and why they matter

**A7, B4, B5, B6 have no quiz equivalent.** Under the quiz's 8, an article
about abortion policy, Social Security, Medicare, voting access or election
administration is **untaggable**. It comes back `{}` — which the schema reads
as *"characterized, nothing over threshold"*, i.e. indistinguishable from an
article about nothing in particular.

That is the failure mode worth naming plainly: a silent hole, in four issues
the project's own polling research places at the top of the 2026 cycle, that
looks exactly like a working system.

---

## 4. Honest caveats about CAP's list

These are from the document's own "Sourcing notes and limitations", not from me:

1. **Four of fifteen carry sourcing caveats it flags itself.**
   - A1 and A4 lean on advocacy polling (AIF; a poll carried by Florida
     Politics). The doc says use as corroboration only and *"replace with a
     university or primary poll before locking"*.
   - A6's note: *"the strongest coverage found was partisan messaging; replace
     with a vetted outlet before locking"*.
   - B6's note: *"confirm against the underlying NBC survey before locking"*.
2. **Its scope is the old four-district MVP** — FL-10, FL-15, FL-23, FL-28.
   The general-election work now covers 16 House districts. The issue list may
   deserve a re-run at the wider scope.
3. **It is two months old** (2026-07-15) and says so: *"Ballot measures are
   moving… Re-pull ballot status before the brief goes live."*

**Why these caveats weigh less for news tagging than for candidate profiling.**
CAP's sourcing discipline exists to justify *issue selection for profiling
candidates*, where a missing or lopsided issue becomes a fairness problem
across a race — that is what the balance check protects. News tagging is a
weaker claim: *"this article relates to property taxes."* A slightly imperfect
issue list yields slightly imperfect tags, not an unfair candidate profile. So
adopting the structure now and upgrading A1/A4/A6/B6's sources as a separate
piece of work is defensible — **provided the upgrade is actually tracked and
not quietly forgotten**, because the same list is what Stage 2 would later use,
where the caveats do bite.

---

## 5. The options

### Option 1 — CAP's 15, with a roll-up map to the quiz's 8 *(recommended)*

Tag at CAP's granularity. Keep a documented `CAP id → quiz id` map (§2's last
column) so "news on the issues you picked" still works from the quiz.

- **For:** no coverage holes; best provenance; matches what the change spec
  §14.3 asks for; keeps the quiz feature.
- **The decisive argument:** *granularity is easy to collapse and impossible to
  recover.* Tag `Economy & Affordability` today and you can never separate
  property taxes from inflation later without re-running every row. Tag A3 and
  B1 separately and the quiz's `economy` bucket is one line of code away.
- **Against:** a mapping table to maintain; 15 questions per article instead of
  8. Cost goes from ~$0.32 to ~$0.60 for the entire run-up to 2026-11-03 — on
  Jev's $0.042/MTok, input-only pricing, this is not a real constraint.

### Option 2 — the quiz's 8 only

- **For:** one vocabulary, no mapping, smallest surface.
- **Against:** the four gaps in §3 become permanent silent holes, and undoing
  that later means re-characterizing every row.

### Option 3 — CAP's 15, no quiz mapping

- **For:** best provenance, no mapping table.
- **Against:** two vocabularies in front of one voter, and it drops the
  quiz→news feature. This is the thing the design spec argued against.

---

## 6. What I recommend, in one line

**Option 1**, and treat the A1/A4/A6/B6 source upgrade plus a re-run at 16
districts as a tracked follow-up that must land before the same list is used
for Stage 2 stances — where the caveats stop being cosmetic.

---

## 7. What happens once you answer

- Task 1 of `docs/superpowers/plans/2026-09-18-news-issue-tagging.md` is
  unblocked; its taxonomy module is written from whichever list you pick,
  with the ids taken verbatim rather than drafted.
- Under Option 1, `src/lib/news-issues.ts` carries the CAP ids (`A1`…`B8`)
  with CAP's labels and scope questions, plus a `rollsUpTo` field holding the
  quiz id — so the mapping is data in the same reviewed file, not a second
  artifact that can drift.
- Nothing else in the plan changes. The characterizer core, the migration, the
  Jev adapter, the runner and the gold-set evaluation are all taxonomy-agnostic
  by construction; they iterate whatever `ISSUES` contains.
