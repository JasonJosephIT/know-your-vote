# The profile writer, built — and the gate it runs into

**Written** 2026-09-21 · Follows `profile-intake-handoff-2026-09-21.md`, whose
§8 numbers were re-read from `pqracitpmzpiqfnzlngw` on the same date and were
all still exact: 38 races, 91 ballot candidates, 0 profiles, 0 issues, 0
positions, 0 claims, 87 orphaned sources, 0 published races, 0 `official_site`.

The handoff said the missing piece was the code that turns a policy run into
rows. That code now exists. Building it answered its own Open Question 1 and
turned up a bigger one.

---

## 1. Open Question 1, answered — from the code, not from taste

**`profile.facts` and `profile.positions` are not vestigial. They are the
Balance Audit's denominators.**

`balance_audit_core.py::_extract` reads them directly:

```python
"verifiable_fact_count": len(profile["facts"]),
"stated_position_count": len(profile["positions"]),
```

with the comment that both are "derived from the claim lists so the 'opinions
excluded' rule is enforced by this core, not trusted". `CAP_Schema_v1` §7
types all three as `["claim_id"]`. So:

| array | holds | read by |
|---|---|---|
| `facts` | `verifiable_fact` claim ids | the audit's **hard gate** |
| `positions` | `stated_position` claim ids | the audit's soft flag |
| `opinions` | `outside_opinion` claim ids | nothing — counted in no metric, by design |

The handoff's "nothing reads them today" was true of the Next.js app and false
of the tool layer, and the tool layer is the half that decides whether a race
may publish. The writer populates them, and
`scripts/verify-brief-rows.ts` asserts `audit.verifiable_fact_count ===
facts.length` on every row.

**`scripts/demo-seed*.sql` gets this wrong.** Every demo profile shipped
`ARRAY[]::text[]` for all three arrays beside an audit claiming
`"verifiable_fact_count":6`. Nothing caught it because the demo never ran T10
— had it run, `_extract` would have read 0 facts for everyone, scored 0.0%
variance and passed vacuously. Treat the demo seed as reference for `issue` /
`position` / `claim` shape only; its `profile` rows are wrong in a way that
would be inherited silently.

## 2. What was built

```
report.json (PolicyRun)
  → src/lib/brief-rows.ts      buildBriefRows()   pure: no DB, no clock, no network
  → scripts/brief-rows-sql.ts  --plan <plan.json> prints a transaction, writes nothing
  → (human reads it, applies it)
  → Balance Audit (T10)        earns balance_check_passed
  → set_race_publication       0018, audited
```

Four rules the writer does not bend, each asserted offline:

1. **No source, no claim.** Claims and their `claim_source` rows are emitted as
   a pair. `briefs.ts` inner-joins `claim_source`, so the unsourced case is not
   constructible here.
2. **It cannot manufacture a fact.** Every claim leaves as `stated_position` /
   `single_source` with a NULL verdict. A Noul scores relevance; `verifiable_fact`
   belongs to the Record agent and `verdict` to the Fact-Checker.
3. **Silence is rendered as silence.** Every candidate gets a `position` on
   every spine issue; an empty one is `no_stated_position_found`, never absent.
4. **The spine is an input.** The writer never invents what makes two candidates
   comparable — it is handed the spine and writes against it.

Plus an identity check the pipeline did not have: every passage must come from
the candidate's `official_site`, or the run is refused. Nothing upstream stopped
a run file being paired with the wrong candidate id, and the failure mode is
publishing an opponent's words under someone's name.

It deliberately does **not** write `balance_check_passed`. T10 owns that field
and the publication gate reads it; a writer that set it would be marking its
own homework. On a rewrite the whole `audit` object is replaced, so a stale
PASS cannot survive content changing — the race goes dark until re-audited.

**Verification.** `node scripts/verify-brief-rows.ts` (pure, in-memory: 50+
assertions on the row shapes) and `node scripts/verify-brief-rows-sql.mjs`
(applies the emitted SQL to embedded Postgres with every migration, FK, CHECK
and UNIQUE in force, then re-applies it to prove idempotence). Both green.
Fixture: `scripts/fixtures/brief-rows/`, invented candidates on `example.com`.

## 3. The finding: a scraped brief HALTs the Balance Audit

Running the real `balance_audit_core` over the writer's fixture output:

```
VERDICT: HALT   breached: ['word_count']
  word_count             min=32  max=89  var=64.0%  thr=15   BREACH
  verifiable_fact_count  min=0   max=0   var=0.0%   thr=15
  fact_checks            min=0   max=0   var=0.0%   thr=10
  stated_position_count  min=2   max=4   var=50.0%  thr=15   flag
  spine_issue_coverage   min=1   max=3   gap=2               flag
```

This is not a bug in the writer. It is the audit doing exactly its job, and it
is structural: **`word_count` is a hard gate at 15% variance, and campaign
sites are not equally verbose.** One candidate with a detailed issues page and
one with a landing page produce briefs of very different size, and the audit
correctly refuses to call that a fair comparison.

So the shortest path to MVP has one more step in it than the last handoff
thought. Site-scraping alone yields asymmetric briefs. Closing the gap needs
one of:

- **The Record agent.** Comparable `verifiable_fact` rows per candidate from
  primary sources are the intended counterweight, and would also lift
  `verifiable_fact_count` off zero, where it currently passes its gate
  vacuously.
- **A levelled spine.** A smaller spine of questions every candidate actually
  addresses narrows both `word_count` and the coverage gap.
- **An explicit threshold decision.** The thresholds are overridable per call.
  Raising `word_count_pct` is a legitimate editorial choice, but it is a choice
  about our own fairness claim, and it should be recorded as one.

What should **not** happen is the writer trimming quotes to even out word
counts. The quote is the passage that was sent; editing it to pass our own
audit would falsify the citation and the audit at once.

## 4. Open questions still open

1. ~~What are `profile.facts/positions/opinions` for?~~ **Answered, §1.**
2. **Who signs off a position before publication?** Unchanged. The writer
   prints SQL and writes nothing, so it does not prejudge this — but there is
   still no admin surface for briefs.
3. **Are spine issues per-race or shared?** Partly settled by the schema:
   `issue.race_id` is NOT NULL, so every race gets its own rows either way. The
   writer takes the spine as input and namespaces ids as
   `<race_id>--issue-<taxonomy_id>`, so the shared-vocabulary decision stays a
   data decision, not a rewrite. **Still needs deciding: which questions.**
4. **Delete the 87 orphaned demo sources?** Unchanged — still unreferenced,
   still fake, still sitting in the table the news pipeline reads.
5. **New: what closes the `word_count` gap?** See §3. This now blocks the first
   publishable race.

## 5. Still the first blocker

**0 of 91 ballot candidates have an `official_site`**, so the pipeline cannot
run for a single real candidate. The writer is built and verified against
fixtures; it has no real input until that is filled. `FL-GOV-general` (8
candidates) remains the largest single unblock, and `official_site` already
renders on the brief and directory pages, so it has value before any ingest
runs.
