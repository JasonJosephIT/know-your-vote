# Things to confirm

Findings from one session that **another session may already be fixing**.
Nothing here has been pushed as a fix. Each entry says what was observed, how
it was reproduced, and the change that was verified locally — so whoever owns
the file can confirm it is already handled, or apply it, without rediscovering
it from scratch.

**Check before acting.** These were true at the stated commit. If the current
head already handles one, delete the entry rather than re-fixing it.

---

## TC-1 — `test_toollayer_skeleton.py` is red on `claude/stream-pipeline`

**Observed at** `b74820c` (PR #32 head), 2026-09-07.
**Status: unfixed at that commit; fix verified locally but deliberately not pushed** —
another session was working the branch and a competing push would conflict.

```
Ran 170 tests — FAILED (errors=1)

ERROR: test_senate_race_is_not_implemented_not_misfiled_as_non_federal
  KeyError: 'FL-SEN-general'
  test_toollayer_skeleton.py:1594
    sen = res["result"]["incumbency"]["FL-SEN-general"]
```

### Why GitHub does not show this

**Vercel does not run the Python suite.** The only check on the PR is the
Vercel preview build, which compiles the Next.js app and never touches
`toollayer/`. So the PR reads green while the toollayer baseline is broken.
Anything relying on the PR's checks to catch a Python regression will not
catch one.

### Root cause

The test asserts on `FL-SEN-general`, but `_DOE_INCUMBENCY_FIXTURE`
(line ~1022) contains only two `USR`/028 rows and one `GOV` row. There is no
`USS` row, so the Senate race is never parsed and the key is absent. The test
was written against a fixture that cannot produce the thing it asserts.

### The fix, verified locally (170 tests green)

Two changes, and the second is the interesting one.

**1. Give the fixture a Senate row.**

```python
# in _DOE_INCUMBENCY_FIXTURE, after the GOV row
_doe_row("90004", "USS", "United States Senator", "", "QUA", "DEM",
         "Reed", "Dana"),
```

**2. Two assertions then need updating — one is stale, one is wrong.**

`test_fec_failure_is_recorded_and_the_intake_still_stands` counts committed
candidates. The fixture grew by one, so `3` becomes `4`. Stale, not wrong.

`test_senate_race_is_not_implemented_not_misfiled_as_non_federal` ends with:

```python
self.assertEqual(committed_updates(db, "race"), [])
```

That asserts **no race UPDATE at all**, but FL-28 is in the same fixture and
legitimately fills its incumbency in the same run. The broad form was passing
only because the fixture had no Senate row — it never actually exercised the
Senate path. Scope it to the race under test:

```python
self.assertEqual(
    [p for _, p in committed_updates(db, "race") if "FL-SEN-general" in p], [])
```

**Mutation-checked:** removing the fixture row again fails the suite, so the
row is doing the work rather than sitting there.

### Confirm

```
cd "Civic Awareness (Know Your Vote)/toollayer" && python3 test_toollayer_skeleton.py
```

Expect **170 OK**. If it already says that, this entry is done — delete it.

---

## TC-2 — PR #32's description no longer matches its contents

**Observed at** `b74820c`, 2026-09-07. **Not corrected.**

I opened #32 for a two-commit change (the Senate-race intake fix and the
database audit). It now carries **13 commits and 11 files**, because another
session pushed Stream P's real work onto the same branch: migration `0014`
(N1), coverage variance (N5), FEC incumbency (B4) and several
degrade-honestly fixes.

The description still describes only the original two commits. A reviewer
reading it would not know `0014` or B4 are in the diff — including that the
PR now contains a **schema change**, which is the single most review-worthy
thing in it.

**Confirm:** whoever lands #32 should rewrite the body to cover the whole
branch, or split it. Not done here because the branch is in flight and the
body is not mine to describe on their behalf.

---

## TC-3 — TASK-066's race count is still wrong in the roadmap

**Observed** 2026-09-07. **Not corrected — was blocked, and is now unblocked.**

`product-roadmap.md` says TASK-066 covers *"8 target races, 22 ballot
candidates"*. I wrote that, citing B1. It is wrong: B1 measured the eight
races the parser targeted, and the parser was skipping the U.S. Senate race
(see `db-audit-2026-09-07.md` §1). The real ballot has **nine**.

It was left alone because PR #31 also edited that file and a competing edit
would have recreated the collision the stream split exists to prevent.
**PR #31 has since merged (`0283bf1`), so that reason has expired.**

**Confirm:** correct the count to nine races, and note that the candidate
total is unknown until a DoE run tiers the 14 `USS` filings.
