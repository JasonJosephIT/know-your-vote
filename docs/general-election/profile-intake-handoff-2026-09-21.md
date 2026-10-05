# Handoff — profile intake: the writer that has to exist before anything ships

**Written** 2026-09-21 · **Live project** `pqracitpmzpiqfnzlngw` · Every number
below was read from the live database on that date. Queries in §8.

This exists because the founder asked for the shortest path to MVP. The honest
answer is that the shortest path does not run through district lookup, more
races, or more ingest. It runs through this one missing piece.

---

## 1. The headline

**The roster is complete and nothing can be published, because no code writes
the tables that hold a brief.**

| | Live today |
|---|---|
| Races | **38** — 21 state/federal, 17 county |
| Ballot candidates | **91** |
| `profile` rows | **0** |
| `issue` rows | **0** |
| `position` rows | **0** |
| `claim` rows | **0** |
| Published races | **0** |

Every count in the bottom half is zero, and there is no code path that would
make them non-zero. `scripts/demo-seed*.sql` is the only thing in the repo that
has ever written `profile`, `issue` or `position`, and its content is invented —
`docs/general-election/candidate-profiles-handoff-2026-09-21.md` §5 forbids
using it for a real race.

## 2. What changed since the last handoff

**The demo races are gone.** The previous handoff recorded 9 demo races, 29
demo candidates and 29 empty `profile` rows. All are now deleted, along with
their 28 issues, 88 positions and 261 claims. Someone ran the teardown.

That resolves that handoff's Open Question 1 — the invented content is no
longer one `set_race_publication` call away from a voter. It also means **the
database no longer contains a worked example of the target shape.** The only
remaining illustration is `scripts/demo-seed*.sql` in the repo, which is
reference material, not data to copy.

**87 orphaned `source` rows survived the teardown** — 29 each of `primary_doc`,
`factual_reporting` and `candidate_self`, every one an `example.org/demo/...`
URL, none referenced by any `claim_source`. They are invisible through the
brief path (`briefs.ts` inner-joins `claim_source`), but they sit in the same
table the news pipeline reads. Worth deleting; see §7.

## 3. The gap, precisely

The policy pipeline is built and ends in the wrong place:

```
candidate site
  → scripts/candidate-site-ingest.ts   → passages.jsonl        BUILT
  → scripts/candidate-policy-noul.ts   → report.json           BUILT
  → ???                                → profile/issue/position/claim   MISSING
  → set_race_publication                                       BUILT (0018)
```

`candidate-policy-noul.ts` emits a `PolicyRun` (`src/lib/policy-run.ts`) whose
findings are `SubIssueFinding { id, label, citations: [{ passage, score }] }`.
A `Passage` carries the text and the URL it came from. That is genuinely all
the raw material a brief needs — what is missing is the code that turns it into
rows.

The Python tool layer (`toollayer/cap_toollayer/store.py`) writes `source`,
`race`, `candidate`, `claim` and `claim_source`. It **only reads** profiles. So
`profile`, `issue` and `position` have no writer anywhere.

## 4. What the writer has to produce

Four tables, and the constraints are the specification:

**`issue`** — `tier` is `'spine'` (race-wide, `candidate_id` NULL) or
`'candidate'` (`candidate_id` NOT NULL); a CHECK enforces the pairing. Spine
issues are what make two candidates comparable, so a race needs them before any
position means anything.

**`position`** — `UNIQUE (candidate_id, issue_id)`, and
`coverage IN ('stated','no_stated_position_found')`. That second value is the
important one: a candidate who has said nothing on a spine issue gets a row
saying so, not a missing row. Silence must be rendered as silence.

**`claim`** — `bucket IN ('verifiable_fact','stated_position','outside_opinion')`
and `verification IN ('verified','single_source','unverified')`. Policy-pipeline
output is `stated_position` / `single_source` at best: a Noul returns a number,
and the quote is the passage that was sent. It cannot manufacture a fact.

**`claim_source`** — `source_id` is NOT NULL and `briefs.ts` inner-joins it, so
a claim without a source does not render. No source, no claim.

**`profile`** — `candidate_id`, `race_id`, `facts[]`, `positions[]`,
`opinions[]`, `audit`. Note this is *not* a link table; the arrays are the
candidate's brief. But the rendered brief content lives in
`issue`/`position`/`claim`, which is why the old demo races looked populated
while every `profile` array was empty. **Decide explicitly what `profile`
arrays are for before filling them** — today nothing depends on them being
non-empty, and `briefs.ts:289` only checks that the row exists.

## 5. The upstream blocker

**0 of 91 ballot candidates have an `official_site`.** `candidate-site-ingest.ts`
takes `--site <url>`, so the pipeline cannot run for a single real candidate
today. `fec_id` is also 0.

This is unchanged from the previous handoff and is still the first thing that
has to happen. It is also cheap: FEC filings give federal candidates both the
site and the `fec_id`; the FL DoE covers GOV/AGR/CFO/ATG; county SOE candidate
pages cover the 34 local candidates. `official_site` is already rendered on the
brief and directory pages, so filling it has value before any ingest runs.

## 6. Suggested shape of the work

1. **Collect `official_site` for one race.** `FL-GOV-general` has 8 candidates
   and is the largest single unblock. Ships as a migration.
2. **Write the report → rows writer**, offline-verifiable against a fixture
   before it touches live, like every other `verify-*` in this repo. It must
   preserve the pipeline's citation discipline: the model scores relevance, the
   quote is the passage that was sent, the link is where it was fetched.
3. **Run it on that one race end to end**, then `set_race_publication`.
4. **Only then scale out.**

A publishable race needs: spine `issue` rows, a `position` per candidate per
spine issue (including `no_stated_position_found`), `claim` + `claim_source`
behind each stated position, and a `profile` row per candidate.

## 7. Open questions for the founder

1. **What are `profile.facts/positions/opinions` for?** Nothing reads them
   today. If they are vestigial, the writer should create the row and leave
   them empty and that should be written down; if they are meant to be the
   brief, that contradicts how `briefs.ts` renders. This needs answering before
   the writer is built, not after.
2. **Who signs off a position before publication?** `set_race_publication`
   (0018) is audited and `REVOKE`d from PUBLIC precisely so the answer is
   recorded. There is no admin surface for briefs — `/admin/submit` is news,
   `/admin/site` is deployment health.
3. **Are spine issues per-race, or a shared set?** The 21 state/federal races
   could share a spine; the 17 county races almost certainly need their own.
4. **Delete the 87 orphaned demo sources?** They are unreferenced and fake.

## 8. Re-run the numbers

```sql
SELECT 'races' k, count(*)::text v FROM race
UNION ALL SELECT 'ballot candidates', count(*)::text
  FROM race r, unnest(r.candidate_ids) cid
  JOIN candidate c ON c.candidate_id = cid WHERE c.ballot_status='ballot'
UNION ALL SELECT 'profile',  count(*)::text FROM profile
UNION ALL SELECT 'issue',    count(*)::text FROM issue
UNION ALL SELECT 'position', count(*)::text FROM position
UNION ALL SELECT 'claim',    count(*)::text FROM claim
UNION ALL SELECT 'published', count(*)::text FROM race_publication WHERE status='published'
UNION ALL SELECT 'candidates with a site', count(*)::text
  FROM candidate WHERE official_site IS NOT NULL AND official_site <> '';

-- the orphaned demo sources
SELECT type, count(*) FROM source s
 WHERE NOT EXISTS (SELECT 1 FROM claim_source cs WHERE cs.source_id = s.source_id)
 GROUP BY type;
```

## 9. Not blocked by this

Local district lookup is **parked** (founder, 2026-09-21). The 17 county races
are loaded and invisible under RLS, costing nothing. District boundaries are
committed in `docs/general-election/boundaries/`; the crosswalk that would use
them was built, verified, and deliberately not committed. Google Civic's
representatives endpoint shut down 2025-04-30, so a commercial API (Geocodio,
Cicero) is the alternative being evaluated.

None of that is on the path to MVP. **The statewide and congressional ballot is
already loaded and needs only briefs to ship.**
