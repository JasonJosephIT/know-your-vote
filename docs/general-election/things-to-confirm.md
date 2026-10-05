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

## TC-5 — a SECURITY DEFINER function shipped with EXECUTE granted to `anon`

**Introduced** 2026-09-09 by `0018_publication_audit.sql` (mine). **Found and
closed on live** 2026-09-10, roughly 24 hours later. **Fix-forward migration
`0020` is written and harness-verified; its second half is not yet applied.**

0018 ended with the revoke that reads correct:

```sql
REVOKE ALL ON FUNCTION set_race_publication(...) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION set_race_publication(...) TO service_role;
```

The live ACL was `postgres=X | anon=X | authenticated=X | service_role=X`.

Supabase ships `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON
FUNCTIONS TO anon, authenticated, service_role`, so `CREATE FUNCTION` wrote
**explicit** grants to those roles immediately. `REVOKE ... FROM PUBLIC`
removes the PUBLIC pseudo-role's grant and does not touch an explicit grant to
a named role. The function is `SECURITY DEFINER` owned by `postgres`, so
EXECUTE by anon meant the public browser key could publish or unpublish any
race — the gate that decides what a voter sees. RLS is not involved; a definer
function runs around it.

**Nothing was exploited.** `admin_action` held only this session's two rows and
all nine races were still published. That is answerable *only* because the
function writes its audit row in the same statement it flips — a design whose
value showed up first as forensics on its own hole.

**Why the harness said the opposite.** `verify-migrations.mjs` ran migrations
in PGlite with no default privileges, so `REVOKE FROM PUBLIC` really was
sufficient there and `anon cannot EXECUTE set_race_publication` passed
honestly. The harness modelled a **stricter** world than production, so a real
hole read as sealed. It now installs Supabase's default privileges before
applying migrations; that alone reproduces the defect as three failures.

**The repo already knew this — for tables.** 0002/0005/0006 carry explicit
REVOKEs from anon/authenticated and call it "the 0005 lesson". Nobody had
applied it to FUNCTIONS because until 0018 no function was ever granted to a
role: 0010's and 0012's are reached through triggers, which never consult
EXECUTE. The first function to need a grant walked straight into it.

> **The general shape:** a test environment that is stricter than production
> turns a missing defence into a passing assertion. When a platform grants
> privileges by default, the harness has to grant them too, or every explicit
> REVOKE in the codebase is being verified against a world where it was never
> needed. Check what your fixtures *do not* have that production does.

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

## TC-4 — ~~`verify-news-ungated.ts` is red on `main`, and has been since C9~~ ✅ RESOLVED

**Observed** 2026-09-07 on `origin/main` (`0283bf1`) and on every branch off it.
**Resolved 2026-10-04** on `claude/launch-handoff-completion` (launch handoff
§5), by rewriting the rule as asked below. The resolution and its evidence
follow the original entry.

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

### Resolution (2026-10-04)

The proxy is gone. The script now states the rule in three parts, and none of
them is "no parameters":

- **A. No storage reaches the feed.** There is no `localStorage`,
  `sessionStorage`, IndexedDB, cookie (`cookies()`, `document.cookie`, or a
  `"cookie"` request header) or `kyv.*` key in `NewsFeed.tsx`, in the `/news`
  page, or in any local module reachable from either through value imports,
  at any depth (`@/`, relative, `export … from` and dynamic `import()`; 15
  modules today). A cookie counts: `kyv.district` is device storage too, and
  `cookies()` is the form a regression would take in the server-rendered page.
- **B. The fetch is unconditional.** The `/api/news` request sits at the top
  level of the effect, starts its own statement (nothing like `if (x)`,
  `x &&` or `x ?` in front of it), and nothing returns before it. The page
  renders `<NewsFeed>` exactly once, as a plain JSX child, with no return,
  `redirect()` or `notFound()` before it other than the JSX return itself.
- **C. Parameters are optional URL values.** Every effect dependency and every
  `params.set(…)` value is one of the component's own props, and each of those
  props is optional. The page fills each one from its search params and from
  nothing else. Every identifier in the JSX expression, and in each `const` it
  reads (followed through), must be `sp` (`const sp = await searchParams;`,
  never written to), a local import (which A has scanned), an arrow parameter
  or a literal. No `await` or `use()` is allowed: a URL value needs neither,
  and in Next 16 a request cookie needs one or the other. No spread props are
  allowed. The route keeps all five parameters optional (`county` and `issue`
  were added to the check) and always queries the statewide scope.

**Evidence.**

- `node scripts/verify-news-ungated.ts`: 26/26 ok, exit 0. HEAD's version of
  the script, run against the same source, still fails its two old checks.
- `node scripts/verify-news-ungated.ts --self-test`: applies fifteen gates to
  the real source in memory, and each one is caught. They include the
  TC-4-named `kyv.location` read with an early return, `sessionStorage`
  feeding `?county=`, `if (county) fetch(…)`, `county && fetch(…)`, the fetch
  moved into an `if` block, a helper module that reads storage (one and two
  modules deep), the page defaulting `county` from the `kyv.district` cookie,
  `county` made a required prop, and the route making `?county=` required.
  The six added after the review are listed below. The unmutated source
  passes.
- **Scratch-copy mutation,** as the entry asked. The files were copied under
  the session scratchpad, never `src/`, and the script was run with
  `--root <copy>`:
  - With `const stored = window.localStorage.getItem("kyv.location"); if (!stored) return;`
    put back before the fetch, it gave
    `FAIL NewsFeed reads no device storage — found localStorage` and
    `FAIL nothing returns before the fetch`, exit 1.
  - With `const stored = window.sessionStorage.getItem("kyv.county"); if (stored) fetch(…)`
    (a gate with no early return), it gave
    `FAIL NewsFeed reads no device storage — found sessionStorage` and
    `FAIL the fetch starts its own statement — preceded by ")"`, exit 1.
  - With the copy restored, it passed, exit 0.

**Review follow-up (2026-10-04).** An adversarial review found a hole in the
first rewrite. Part A read only NewsFeed's own imports, one level deep. Part C
accepted any county declaration that mentioned `sp.county`. In a scratch copy,
the review added `src/lib/saved-county.ts` (reading the `kyv.district` cookie
through `cookies()`) and changed the page to
`const fallback = await savedCounty(); … c.fips === (sp.county ?? fallback)`.
The script passed it, exit 0. A second hole had the same root: only the first
identifier of the JSX expression was followed, so
`county={selected?.fips ?? fallback}` would also have passed. Both are closed
by the A and C wording above. Re-run with the fixed script:

- The review's scratch copy now gives
  `FAIL no module reachable from /news reads device storage — src/lib/saved-county.ts (cookies(, via src/app/(public)/news/page.tsx)`
  and
  `FAIL the page passes county from the URL only — county={selected?.fips}: \`selected\` ← \`fallback\` ← it awaits something`,
  exit 1.
- A second scratch copy put the cookie read two modules deep: the page
  imports `@/lib/county-store` (index.ts, no storage), which imports
  `./read`, which calls `cookies()`. The fallback was in the JSX. Both checks
  failed the same way, through `src/lib/county-store/index.ts`, exit 1. With
  the copy restored, it passed, exit 0.
- New self-test mutations, each caught by two independent checks unless
  noted:
  - the review's own case;
  - the same read two modules deep, with the fallback in the JSX;
  - the read through `(await headers()).get("cookie")` instead of
    `cookies()`;
  - a storage hook two modules deep behind NewsFeed (caught by three checks);
  - `{selected && <NewsFeed … />}` in the page (one check: renders once, on
    every path);
  - `if (!selected) return <Prompt />` before the page's JSX (the same one
    check).

**What the rule now guarantees, and what it does not.** A parameter passes
only if it is an optional prop that the page fills from `sp` through consts
and local imports. No module reachable from `/news` may name device storage,
and nothing in that chain may await. That closes every route the review found
and the deeper versions of each. It is still a static check over source text:
a storage read under a name it does not know (a new storage API, or a key that
does not start `kyv.`) behind a synchronous helper would pass. In a server
component that cannot read a request cookie, because Next 16 removed
synchronous `cookies()`/`headers()`. On the client it would have to reach
NewsFeed as a prop, which C checks. It is a guardrail, not a proof.

---

## TC-6 — migration 0014 would fail on live today: eight sourceless rows, not four

**Observed** 2026-10-04 with read-only `SELECT`s on `pqracitpmzpiqfnzlngw`.
**Fix written, not applied:** `0042_news_source_backfill.sql`, plus the
approve-path change on `claude/launch-handoff-completion`. The apply steps are
in `news-inlet-runbook.md` §4.

**What 0014 is.** `0014_news_fairness.sql` adds
`news_item_agent_source_check`: `candidate_news` and `election_news` rows must
carry a `source_id` (news-fairness.md N1, "no source, no card").
`list_migrations` has no `news_fairness` entry, and `pg_constraint` has no
such constraint, so it is not applied.

**What changed since it was written.** 0014 was written on 2026-09-07 against
four sourceless `election_news` rows, and attributes exactly those four by id.
Live now holds **eight**. The four 0014 does not know about:

| id | Row | Dated |
| -- | --- | ----- |
| `1ae20884-…` | Miami-Dade general-election options | 09-01 |
| `4c787ba7-…` | Hillsborough 27 early-voting sites | 09-09 |
| `8d12a9b1-…` | DoS statewide deadlines page | 09-09 |
| `ce038b86-…` | Ballotpedia amendments story | 06-03 |

Applied alone, 0014's `ADD CONSTRAINT` fails on those four rows and the whole
migration rolls back. A PGlite simulation of the live state reproduced that,
with no constraint and no data change left behind. The live neutrality lint
already flags two of them: run with the public anon key,
`verify-news-neutrality.ts` reports `missing source_id` for `4c787ba7` and
`8d12a9b1`, the only two agent rows inside its 30-day window. So that script
is red on live data, not only for want of an env var.

**The fix.** `0042_news_source_backfill.sql` attributes the four, resolving
each `source_id` by `url_norm`. Three are government notices, attributed
`primary_doc`/`N/A` as 0014 attributed its four. The Ballotpedia story is
`factual_reporting`/`unrated`, which is **recommended (pending founder
confirmation)**; the file's marked block shows how to delete the row instead.
Live order: **0042, then 0014.** The simulation of that order gave 0 sourceless
agent rows, every `source_id` resolving, both files idempotent on a re-run, a
new sourceless row refused, and the delete-instead flip also applying. On a
fresh database, `verify-migrations.mjs` applies 0014 then 0042 and passes.

**0014's precondition (a), the approve path, is met on this branch.**
`POST /api/admin/review/:id/decision` now resolves a source before it inserts:
the payload's `outlet:<domain>` first, then the URL's listed outlet, then a
source row for that exact page. With none, it fails closed with its own reason
and the item stays pending. One consequence the founder should know about: a
story from one of the five listed outlets whose lean is not signed off
(`apnews.com`, `miamiherald.com`, `tampabay.com`, `orlandosentinel.com`,
`sun-sentinel.com`) is refused even if a page source row exists. Before this
branch it went in sourceless. The only remedy is the founder signing off those
leans (C7-a). See runbook §5 step 4 and stream-surface-handoff.md §7. `describeNewsInsertError` now names
`news_item_agent_source_check`, `news_item_relation_check` and
`news_item_item_type_check` separately, where it used to call every 23514
"0005 not applied". `verify-news-enqueue.ts` §8 pins the order, and mutating
the route to insert without the source, or to resolve after the insert, turns
it red.

**Confirm before acting:**

- The branch is deployed before 0014 is applied.
- Pre-check (a) in runbook §4 returns exactly the eight ids. A ninth means a
  new sourceless row arrived, and it needs attributing first.
- R3's Cowork prompt (outside this repo) sets a `source_id` on every
  `election_news` row it writes. Otherwise R3's inserts fail once 0014 is live.
- The 0014 and 0042 rows in `supabase/migrations/README.md` are updated. This
  session does not own that file.

> **The general shape:** a data fix written against a count is a claim about
> the data on the day it was counted. The migration that carries it can sit
> unapplied for weeks while the count moves. Re-run the count, not the
> migration, the day you apply it — 0014's own header said so, and that is
> what found the other four.
