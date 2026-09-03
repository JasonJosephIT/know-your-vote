# Data Architecture — Primary → General

**Scope change:** Know Your Vote was built and seeded around the **2026 Florida
primary** (2026-08-18, now past). It must run off the **general election**
(2026-11-03). This document owns the **stored shape**: DDL, constraints, RLS,
read-model types, and audit-population policy.

**Companion:** `data-ingest.md` owns *how rows get filled* — HTTP sources,
parsers, field population, and voter-facing copy. Where the two meet, this
document defines the constraint and the ingest document defines the mapping to
it. Neither restates the other.

**Clock:** general election **2026-11-03** · registration deadline
**2026-10-05** (`supabase/migrations/0008_election_seed.sql`). From 2026-09-03
that is **61 days** and **32 days**.

---

## 0. What does NOT change

Read this section before proposing any migration. The primary→general move is
much smaller than it sounds, because the schema was already built with both in
mind. Every line below was verified against the tree:

| Already general-ready | Evidence |
|---|---|
| `race.election` accepts `'general'` | `0000_pipeline_read_models.sql` — `CHECK (election IN ('primary','general'))` |
| Race IDs are already general-scoped | `intake.py` `_STATEWIDE_RACES` → `FL-GOV-general`, `FL-{n}-general` |
| Ingest already points at the general election | `intake.py` `DOE_ELECTION_ID = "20261103-GEN"` |
| Rows are stamped `election='general'` | `intake.py` `parse_candidate_list` sets `"election": "general"` |
| General key dates are seeded | `0008_election_seed.sql` — 5 `general_2026` rows |
| App already reads the general calendar | `voting-info/route.ts`, `ics.ts`, `templates.ts` → `general_2026` |
| Demo fixtures are already `'general'` | `demo-seed*.sql` — 12 occurrences, zero `'primary'` |
| Balance-audit formula is race-size agnostic | `balance_audit_core.py` — `(max-min)/max`, "locked, all race sizes" |

**There is no `election`-column migration, no race-ID rename, no date backfill,
and no read-query rewrite.** The scope change is not a schema migration problem.
It is a **population policy** problem: *which candidates count as being in a
general-election race, and which of them get briefed and audited.* That is §2
and §3, and it is where all the risk lives.

---

## 1. The one decision that gates everything

### D1 — Who is in the audited population? **(founder call, blocks publication)**

A general-election ballot is not a primary field. It carries three kinds of
name that the primary did not, and the current code treats all of them
identically:

1. **Defeated primary candidates.** The DoE export for `20261103-GEN` is a
   filing list, not a ballot. It still carries everyone who filed, with a
   status code. `parse_candidate_list` appends **every parsed row** to
   `race.candidate_ids` with no status filter (`intake.py`, the
   `race["candidate_ids"].append(...)` line). Post-primary, that means losers
   land in the general race.
2. **Write-in candidates.** They qualify for the general, but appear on the
   ballot as a blank line, not a printed name. They typically have no campaign
   site, no FEC committee, and no public positions.
3. **Minor-party candidates.** Real ballot lines (Libertarian, Green, and
   others), currently collapsed — see D2.

Why this is the gating decision and not a detail: **the Balance Audit is a
hard publication gate**, and its variance formula is
`(max - min) / max * 100` with a **10%** threshold on `fact_checks` and 15% on
`verifiable_fact_count` and `word_count` (`balance_audit_core.py`
`DEFAULT_THRESHOLDS`, `_GATES`). One candidate with **zero** claims against an
incumbent with twelve is `(12-0)/12*100 = 100%` variance → **HALT**.

> A single write-in or defeated filer left in `candidate_ids` HALTs the race
> permanently. With write-ins present in most contested Florida general races,
> **the default outcome of running the pipeline today is that nothing
> publishes at all.**

**Recommendation (adopt unless the founder objects):** three tiers, one column.

| Tier | Definition | In `candidate_ids`? | Briefed? | In audit denominator? |
|---|---|---|---|---|
| `ballot` | Printed ballot line, qualified for the general | yes | yes | **yes** |
| `write_in` | Qualified write-in, no printed line | yes | no | **no** |
| `excluded` | Withdrawn, defeated in the primary, disqualified | **no** | no | no |

Rationale: the audit measures *symmetry of scrutiny among candidates we brief*.
Briefing a write-in with no public material and then halting the race for
asymmetry punishes the voter, not the pipeline. Listing write-ins by name with
an honest note ("qualified write-in — no printed ballot line; no published
platform to summarize") is more neutral than either silently dropping them or
letting them block every race.

**This is a neutrality decision, not just a schema one — it needs the founder's
explicit sign-off and belongs in the public methodology page.**

### D2 — Minor parties

`candidate.party CHECK (party IN ('REP','DEM','NPA','other'))`. In a closed
primary only REP/DEM ballots exist, so the enum was free. On a general ballot,
Libertarian and Green are distinct printed lines that both currently render as
`other` — one real party erased into a bucket with another.

**Recommendation (ponytail — this deletes code):** drop the CHECK, store the
DoE `PartyCode` verbatim, and let the UI map known codes to labels with a
fallback to the raw code. A constraint whose job is to protect display logic is
better replaced by display logic that cannot crash.

### D3 — Ballot measures and judicial retention: **skip them**

The general ballot also carries constitutional amendments and appellate
judicial merit retention. They have no candidates, so *none* of the pipeline
applies: no Profiler, no Record, no Fact-Checker, no Balance Audit, no
side-by-side.

**Recommendation: build nothing.** Do not add an amendment table, a measure
model, or a retention entity. The voter need is "what else is on my ballot",
and that is already served by the county Supervisor of Elections sample-ballot
links seeded in `0004_official_links.sql`. Modelling amendments means inventing
a whole second neutrality regime (what is a "balanced" summary of an
amendment?) eight weeks before an election.

*Revisit after 2026-11-03, and only if voters actually ask for it.*

---

## 2. Schema changes — migration `0010_general_election.sql`

One migration, three statements. Everything else in this document is policy or
code, not DDL.

```sql
-- 0010_general_election.sql
-- Primary -> general. See docs/general-election/data-architecture.md.

-- D1: ballot status tier. Drives audit population and display.
ALTER TABLE candidate
  ADD COLUMN ballot_status TEXT NOT NULL DEFAULT 'ballot'
    CHECK (ballot_status IN ('ballot','write_in','excluded'));

-- D2: minor parties are real ballot lines; store the DoE code verbatim.
ALTER TABLE candidate DROP CONSTRAINT candidate_party_check;

-- Audit + brief reads always filter on the briefed tier.
CREATE INDEX idx_candidate_ballot_status ON candidate (ballot_status);
```

`DEFAULT 'ballot'` keeps every existing demo row valid and makes the migration
a no-op for current data.

> **Not in this migration, deliberately:** `race.level` still reads
> `CHECK (level IN ('federal','state'))`. A general ballot also has county,
> municipal, and nonpartisan judicial contests — but the eight target races
> (Gov/AG/CFO/AgComm + FL-10/15/23/28) are all federal or state, so the
> constraint is not binding. Widen it if and only if coverage expands.

---

## 3. Balance-audit population policy

`balance_audit_core.py` is a **pure function** and must stay one — it takes the
profiles it is given. The filter therefore belongs in its caller, the T10
wrapper in `toollayer/cap_toollayer/synthesis.py`, which reads profiles via
SQL before invoking the core.

- T10 selects profiles for candidates with `ballot_status = 'ballot'` only.
- The audit result records the excluded candidate IDs and the reason, so the
  exclusion is auditable rather than invisible.
- **Do not edit `balance_audit_core.py`.** It carries 148 core test vectors and
  the AGENT_BRIEF house rule is that a core change requires a spec amendment
  first.

**Unopposed races.** A general race with one briefed candidate yields variance
`0.0` and passes trivially. That is arithmetically correct but not meaningful —
"equal scrutiny" is vacuous with a sample of one. Record `unopposed` on the
audit result so the race view can say so plainly instead of implying a
comparison happened.

---

## 4. Read model

`src/types/schema.ts` mirrors the DDL and must move with it:

- `Party` — widen from the four-value union to `string`, with a display map and
  a raw-code fallback (D2).
- `Candidate` — add `ballot_status: "ballot" | "write_in" | "excluded"`.
- `KeyDates.primary_date` — leave it. It is optional, the primary is a real
  historical date, and deleting it buys nothing.

Brief and race reads (`src/lib/briefs.ts`, `src/lib/directory.ts`) filter to
`ballot_status = 'ballot'`; the race view renders write-ins as a separate,
clearly-labelled list.

---

## 5. RLS

**No policy changes.** The gate in `0002_rls.sql` is
`race_publication.status = 'published'`, which is orthogonal to primary vs
general. The new column inherits the existing `anon_read_candidate` policy.

Confirm rather than assume: `node scripts/verify-migrations.mjs` after 0010.

---

## 6. Deferred (YAGNI register)

Recorded so nobody rediscovers them as gaps. None block 2026-11-03.

| Deferred | Add when |
|---|---|
| Amendment / ballot-measure model (D3) | voters ask post-election |
| Judicial merit retention | same |
| `race.level` widened past federal/state | coverage adds county or judicial races |
| Primary-results ingest | never — the general DoE export already carries the resolved field (`data-ingest.md` §1) |
| Runoff modelling | Florida holds no general-election runoffs |
| Per-county ballot variation below district level | coverage goes below congressional district |

---

## 7. Sub-agent task list

Dependency-ordered. Each task is self-contained; run its Verify before marking
it done. **A1 must land before A3 or A4** — both read the column it adds.

| ID | Task | Files | Verify | Depends |
|---|---|---|---|---|
| **A0** | Get founder sign-off on **D1** (three tiers) and **D2** (drop party CHECK). Do not start A1 until D1 is answered — it defines the column. | — | Written decision recorded in this file | — |
| **A1** | Write migration `0010_general_election.sql` exactly as §2 | `supabase/migrations/0010_general_election.sql` | `node scripts/verify-migrations.mjs` green, incl. existing RLS invariants | A0 |
| **A2** | Extend `verify-migrations.mjs` with 0010 invariants: default is `'ballot'`, CHECK rejects a bogus tier, party CHECK is gone, index exists | `scripts/verify-migrations.mjs` | New checks fail against pre-0010 schema, pass after | A1 |
| **A3** | T10 filters the audit population to `ballot_status='ballot'`; record excluded IDs + `unopposed` on the result. **Do not touch `balance_audit_core.py`** | `toollayer/cap_toollayer/synthesis.py` | `python3 toollayer/test_toollayer_skeleton.py` (100) green; new case: a write-in with 0 claims no longer HALTs a race that otherwise passes | A1 |
| **A4** | Read model: widen `Party`, add `ballot_status`, filter briefs/directory to briefed tier, render write-ins as a labelled list | `src/types/schema.ts`, `src/lib/briefs.ts`, `src/lib/directory.ts`, `src/app/(public)/races/[raceId]/page.tsx` | `npm run build` clean; a seeded write-in appears in its own section and not in the side-by-side | A1 |
| **A5** | Methodology page states the write-in and exclusion policy in plain language | `src/app/(public)/methodology/page.tsx` | Page renders; wording matches the D1 decision | A0 |

**Baseline that must stay green after every task** (AGENT_BRIEF §3):

```
python3 toollayer/test_toollayer_skeleton.py        # 100
(cd toollayer && python3 -m cap_toollayer.server --selfcheck)
python3 runtime/test_runtime.py                     # 39
node scripts/verify-migrations.mjs                  # if SQL changed
```
