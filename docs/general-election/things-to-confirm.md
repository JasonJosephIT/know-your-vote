# Things to confirm

Findings from one session that **another session may already be fixing**. Each
entry says what was observed, how it was reproduced, and the change that was
verified locally — so whoever owns the file can confirm it is already handled,
or apply it, without rediscovering it from scratch.

An entry is written **before** anyone fixes it, and is only marked resolved
once the fix is confirmed on the current head — by the owning session, or here
when the file turns out to be ours after all (TC-3).

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

## TC-2 — ~~PR #32's description no longer matches its contents~~ ✅ RESOLVED

**Observed at** `b74820c`. **Fixed by the branch owner** the same day.

I opened #32 for a two-commit change (the Senate-race intake fix and the
database audit). It grew to 17 commits because another session pushed Stream
P's real work onto the same branch, and the body still described only the
original two — including saying nothing about the fact that the diff had
gained a **schema change** (`0014`), the most review-worthy thing in it.

The body now leads with P1/P2/P3 — `0014` and its **not applied live**
precondition, coverage variance (N5), FEC incumbency (B4) — and keeps the
original Senate-fix text below a divider. Nothing left to do.

> **The general shape:** a shared branch makes the PR body stale without
> anyone editing it. The description is a claim about the diff, and the diff
> moved. Whoever pushes onto someone else's PR branch owns re-reading the body
> against it.

---

## TC-3 — ~~TASK-066's race count is still wrong in the roadmap~~ ✅ FIXED HERE

**Observed** 2026-09-07. **Corrected 2026-09-07**, once the block expired.

`product-roadmap.md` said TASK-066 covered *"8 target races, 22 ballot
candidates"*. I wrote that, citing B1. It was wrong: B1 measured the eight
races the parser targeted, and the parser was skipping the U.S. Senate race
(`db-audit-2026-09-07.md` §1). The real ballot has **nine**.

It was left alone because PR #31 also edited that file and a competing edit
would have recreated the collision the stream split exists to prevent. #31
merged as `0283bf1`, so the reason expired and the fix landed:

- The launch table now reads **9 races**, and states plainly that the Senate
  race's share of the 14 `USS` filings is **unknown** until a DoE run tiers
  them. The 22 is kept where it is true — across the other eight.
- The B1 paragraph now says *"each of the eight races B1 covered"* and points
  at the audit, rather than implying eight is the ballot.
- A short paragraph records the missing-race bug itself, so the 9 is sourced
  in the file that asserts it.

> **The general shape:** the fix and the number it invalidates usually live in
> different files, and the second one is the one nobody re-reads. A count
> asserted in a doc is a measurement with a scope — write the scope next to
> it, or the next reader inherits the blind spot.

---

## TC-4 — `verify-news-ungated.ts` is red on `main`, and has been since C9

**Observed** 2026-09-07 on `origin/main` (`0283bf1`) and on every branch off it.
**Not corrected** — the fix is a judgment call about what the rule now means.

Two of its eight checks fail:

```
FAIL  fetch requests the statewide scope with no parameters
FAIL  effect has no location dependency
```

The guardrail asserts a literal `fetch("/api/news", { signal: ... })` and an
empty `useEffect` dependency array. C9 changed `NewsFeed.tsx` to send
`?county=` and to depend on `[county]` — which is **candidate-news-PRD.md §7,
built on purpose**, not a regression.

**The rule the guardrail exists to protect still holds.** It was written for
TASK-070: the feed must never be gated behind a device-storage location. The
county now comes from the **URL**, it is optional, and the fetch is issued
unconditionally on every render path — so there is no gate. What broke is the
regex, which encoded "no parameters at all" as a proxy for "no location gate".
Those were the same thing until §7 shipped.

**Confirm before changing it:** the replacement has to keep forbidding a
`kyv.location` / storage read from reaching this fetch while allowing a URL
parameter. Loosening it to "any parameter is fine" would retire the check
rather than update it. Mutation-check the new form against a reintroduced
storage gate.

Not fixed while merging #32 because it is red on `main` independently of that
branch — carrying it into an unrelated merge would have hidden which change
owned it.
