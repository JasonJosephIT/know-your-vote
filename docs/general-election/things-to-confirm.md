# Things to confirm

Findings from one session that **another session may already be fixing**.
Nothing here has been pushed as a fix. Each entry says what was observed, how
it was reproduced, and the change that was verified locally — so whoever owns
the file can confirm it is already handled, or apply it, without rediscovering
it from scratch.

**Check before acting.** These were true at the stated commit. If the current
head already handles one, delete the entry rather than re-fixing it.

---

## TC-1 — ~~`test_toollayer_skeleton.py` is red on `claude/stream-pipeline`~~ ✅ RESOLVED

**Observed at** `b74820c`. **Fixed at `e1fd96a`** by the session that owns the
branch, ~20 minutes later. Suite confirmed **170 OK**, `--selfcheck` passed.

Kept as a worked example rather than deleted, because the two sessions
converged on the same fix independently and the second half of it is the part
worth remembering.

The failure was `KeyError: 'FL-SEN-general'` — the test asserted on a Senate
race that `_DOE_INCUMBENCY_FIXTURE` could not produce, because the fixture had
no `USS` row.

Adding the row is the obvious half. The non-obvious half is what it then
breaks:

```python
self.assertEqual(committed_updates(db, "race"), [])   # no race UPDATE at all
```

That assertion is not stale — it is **wrong**. FL-28 is in the same fixture
and legitimately fills its incumbency in the same run. It was passing only
because the fixture had no Senate row, so it never exercised the Senate path
it was written for. Both sessions arrived at the same correction: scope it to
the race under test.

```python
self.assertEqual(
    [p for _, p in committed_updates(db, "race") if "FL-SEN-general" in p], [])
```

> **The general shape:** a fixture that cannot produce the thing under test
> makes its assertions vacuous, and the broadest assertion in the test is the
> one most likely to be hiding it. When a fixture gains a row and an unrelated
> assertion starts failing, check whether it was ever true rather than just
> updating the number.

---

## TC-0 — Vercel is the only PR check, and it does not run the Python suite

**Standing, not a bug to fix.** Confirmed 2026-09-07.

The only check on a PR here is the Vercel preview build, which compiles the
Next.js app and never touches `toollayer/`. TC-1 was a **red Python suite on a
PR that GitHub showed as green** — for ~20 minutes the PR's checks said
nothing was wrong.

Consequences worth holding:

- A PR's green checks are **not** evidence the toollayer baseline is intact.
  Run `python3 test_toollayer_skeleton.py` and `--selfcheck` locally before
  trusting a Python-touching branch.
- The same applies to `verify-migrations.mjs` and every `scripts/verify-*.ts`
  guardrail: none of them run in CI either.

Whether that is worth a GitHub Action is a founder call, not something to
quietly add.

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
