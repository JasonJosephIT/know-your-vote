# Map-coverage handoff — what "we cover this area" actually means

> **Not to be confused with** `session-handoff-2026-09-08-enacted-map-uno.md`, written the same day from the PR #35 worktree. Both were called "the map coverage handoff" and collided on this filename at merge. This file is the *audit* — what "we cover this area" delivers today. That one is the *change* — the enacted map, the sixteen districts, and `unopposed`. `coverage.ts`, `verify-coverage.ts` and `intake.py` cite the sections in THIS file.


**Written:** 2026-09-08 · **Branch:** `claude/map-coverage-handoff-gc39rq`
(at `0cebc42`, **zero commits over `origin/main`**) · **Scope of this session:**
audit only — no code, no migration, no copy change.

This file exists because "map coverage" turned out not to be one gap but
**two, pointing in opposite directions**, and only one of them is written down
anywhere. Every number below was measured — against the seed file in the repo
and against the live project `pqracitpmzpiqfnzlngw` — not inferred from a plan
doc. Queries are included so the next session can re-run them rather than
trust this file (the standing rule in `supabase/migrations/README.md`).

---

## 1. The headline

`zip_district` promises **more** than the race data can deliver, and the
promise is broken for **69% of the ZIPs we advertise as covered**.

The landing page renders the shared statewide ballot with no ZIP at all
(TASK-067), then offers a ZIP field under the heading **"Add your U.S. House
race"** (`src/app/(public)/page.tsx:52`). For 161 of the 235 ZIPs in
`zip_district`, that button cannot add anything — the district it resolves to
has no voter-visible House race, and the voter is returned a resolution that
succeeded and a ballot that did not grow.

| County (metro) | ZIPs seeded | Always gets a House race | Only if the split-confirm picks right | **Never** |
|---|---:|---:|---:|---:|
| Miami-Dade (Miami) | 80 | 16 | 9 | **55** |
| Broward (Fort Lauderdale) | 55 | 15 | 10 | **30** |
| Hillsborough (Tampa) | 55 | 16 | 8 | **31** |
| Orange (Orlando) | 45 | 0 | 0 | **45** |
| **Total** | **235** | **47** | **27** | **161** |

> **Update 2026-09-10 — the data half is closed, the visible half is not.**
> An intake run against the live DoE export for `20261103-GEN` created race
> rows for all **16** covered districts (21 races, 247 candidates). The "no race
> row" cause behind this table is gone: **235 of 235** covered ZIPs now resolve
> to a district that has a race row, Orlando included.
>
> The table above counts *voter-visible* races, and it has moved — downward.
> The nine `demo-*` races were retired to `draft` on 2026-09-10 (founder
> request): they were fabricated candidates — "Gregory Boone", "Marta
> Villanueva" — published as real 2026 ballot lines. **Nothing is published
> now**, so 0 of 235 ZIPs reach a visible race, and the app shows its honest
> "the ballot isn't published yet" state.
>
> The 21 real races cannot be published in their place yet, and the blocker is
> not the publication flip. `getRaceBrief` returns `null` unless **every**
> ballot-tier profile carries `audit.balance_check_passed === true`
> (`src/lib/briefs.ts:172`, FR-005). The 247 intake candidates have **no
> `profile` rows at all**, so publishing them would produce races whose pages
> render nothing. The only way to make them pass today would be to write that
> audit flag by hand, which fabricates the product's central claim — so the
> gate stands. What clears it is the R1–R4 pipeline producing real profiles,
> claims and a genuine Balance Audit.
>
> Getting here required a parser fix (PR #45): `parse_candidate_list` wrote
> `race.district` as a bare `"27"` while `zip_district` and `block_district`
> store `FL-27`, so the races it created would have joined to nothing.

**The entire Orlando metro is in the "never" column.** It is one of the four
metros the out-of-coverage copy names by name as somewhere we *do* cover
(`ZipEntry.tsx:132`, `YourRaces.tsx:67`).

Reproduce:

```sql
WITH visible AS (
  SELECT r.district FROM race r
  JOIN race_publication p ON p.race_id = r.race_id
  WHERE r.election='general' AND p.status='published' AND r.district IS NOT NULL
), z AS (
  SELECT zip5, county_name,
         bool_or(congressional_district IN (SELECT district FROM visible)) AS any_visible,
         bool_and(congressional_district IN (SELECT district FROM visible)) AS all_visible
  FROM zip_district GROUP BY zip5, county_name
)
SELECT county_name, count(*) zips,
       count(*) FILTER (WHERE all_visible) always_ok,
       count(*) FILTER (WHERE any_visible AND NOT all_visible) depends_on_split,
       count(*) FILTER (WHERE NOT any_visible) never
FROM z GROUP BY county_name;
```

### Why: the ZIP map covers 16 districts, the race table covers 3

| Layer | Coverage | Source |
|---|---|---|
| ZIP → district map | 235 ZIPs, **4** of 67 counties, **16** of 28 districts, 65 split ZIPs | `0003_zip_seed.sql`, confirmed live |
| House races that exist at all | **4** — FL-10, FL-15, FL-23, FL-28 | `race` where `district IS NOT NULL` |
| House races a voter can see | **3** — FL-15, FL-23, FL-28 (FL-10 is `in_review`) | `race_publication.status` |

Twelve seeded districts have no `race` row whatsoever: FL-7, FL-8, FL-9,
FL-11, FL-12, FL-14, FL-16, FL-20, FL-24, FL-25, FL-26, FL-27.

**Every one of the nine general-election races in the live database is a demo
row** (`race_id LIKE 'demo-%'`, 9 of 9, 29 candidate slots). So this measures
the demo seed, not a content decision that has been made and gone wrong —
TASK-066 ("Publish the content — *the real critical path*") is still open and
is what would populate real races. The point stands anyway, for two reasons:
this is what production serves **today**, and nothing in TASK-066 says which
districts it covers, so the mismatch is scheduled to survive it by default.

> **The general shape:** two coverage tables that must agree were widened by
> different tasks (TASK-013 seeded the map, the pipeline fills the races), and
> nothing asserts they agree. The map is the one voters see, so the map is the
> one that lies.

---

## 2. The other direction — TASK-060, and why it is stuck

`docs/general-election-pivot.md:203` (**TASK-060**, open) wants the opposite
widening: open ZIP resolution to all of Florida so a Tallahassee voter gets an
honest partial answer instead of a dead end.

Today a Leon County voter reads their entire statewide ballot on the landing
page, types their ZIP into "Add my House race", and is told:

> "We don't cover that area yet — right now we cover the Miami, Fort
> Lauderdale, Tampa, and Orlando metros."

…followed by a county picker offering four counties, none of them theirs, that
routes to `/candidates?view=races&county=…` (`ZipEntry.tsx:129-141`). That is the pre-Phase-7 framing
(ZIP as the gate to the product) surviving inside a page that has already
un-gated itself. The component is correct about the data and wrong about the
product.

### The blocker is real and still live — re-verified today

TASK-060's note says `www2.census.gov` returns 403 through the session proxy.
**Confirmed again 2026-09-08**, both crosswalk files:

```
curl: (56) CONNECT tunnel failed, response 403   # tab20_cd11920_zcta520_natl.txt
curl: (56) CONNECT tunnel failed, response 403   # tab20_zcta520_county20_natl.txt
```

`$HTTPS_PROXY/__agentproxy/status` logs both as
`connect_rejected — gateway answered 403 to CONNECT (policy denial)`. This is
the environment's network policy, not a flake or a retry candidate.

### It is scheduled nowhere

`local-session.md` §"The other local-only tasks" is the table that exists
precisely "so nobody schedules them into a remote session and watches them
403". It lists B3, B4, B5, B7 and C7-b. **TASK-060 is not in it**, and not in
`data-ingest.md` §7 either. The one network-blocked task on the voter-facing
side is missing from the only list a founder-machine session reads.

**Done 2026-09-10.** `local-session.md` now carries a TASK-060 row, the two
crosswalk URLs, and the migration number (0019). The row does not just say
"download and run" — it names the trap, because the run looks like a success
without it: `build-zip-seed.mjs` filters every ZCTA down to the four metro
counties and derives `county_fips` by reverse-lookup through `metro`, so
unedited it reproduces the same 304 rows and reports no error. The note also
carries §3's data-only and `in_coverage` corrections, and states that every ZIP
the task adds arrives with no published House race until its district's race
publishes — widening the map does not close §1.

```bash
node scripts/build-zip-seed.mjs <zcta_cd.txt> <zcta_county.txt>
```

---

## 3. Corrections to TASK-060 as written

Three things in the task text are now wrong. Fix them before working it.

1. **Migration number.** It pencils `supabase/migrations/0011_zip_statewide.sql`.
   `0011` is `0011_measure_rls.sql`, applied 2026-09-07. Per the ledger, the
   next free number is **`0019`**. (This originally read `0018`; that number
   was claimed on 2026-09-10 by `0018_publication_audit.sql`, so TASK-060 takes
   the one after it.) Claim it in `supabase/migrations/README.md` first, in the
   same PR.
2. **It is a data migration, not a schema one.** No DDL is needed. `metro` is
   already `TEXT` and nullable with no CHECK (`0001_app_tables.sql:16`), so
   non-metro counties store `NULL` today; `anon_read_zip_district` is already
   `USING (true)`. `0019` is a `DELETE FROM zip_district` + `INSERT`, exactly
   like `0003`. The listed file `src/types/app.ts` needs no change either —
   `metro: Metro | null` already permits it.
3. **`in_coverage` is dead today.** `resolveZip` filters `rows.filter(r => r.in_coverage)`,
   but **0 of 304 live rows have `in_coverage = false`**. "Not covered" is
   currently signalled by row *absence*, never by the flag. TASK-060's plan to
   redefine the flag as "we have this ZIP's congressional race" is therefore
   not a change of meaning — it is the first use of the column. Worth saying
   out loud, because it means the flag can be given §1's meaning without
   migrating any existing semantics.

`scripts/build-zip-seed.mjs` also needs a real edit, not just a wider `METROS`
map: it currently *filters* ZCTAs down to the four counties (`if (METROS[county])`)
and derives `countyFips` by reverse-lookup through `metro`, which cannot work
when `metro` is `NULL` for 63 counties. Statewide, the county FIPS must come
from the crosswalk row directly and `metro` becomes a lookup that may miss.

---

## 4. Where the four-metro assumption is baked in

Ten places, only one of which is the canonical list. Any widening touches all
of them; this is the checklist.

| File | What | Note |
|---|---|---|
| `src/lib/resolve.ts:8` | `COVERED_COUNTIES` — 4 × `{fips, name, metro}` | **canonical** |
| `src/components/features/CountyPicker.tsx:6` | the same 4 counties as a **second literal** | duplicate; its `metro` holds display names ("Miami") vs the enum (`miami`) |
| `src/types/app.ts:8` | `type Metro` — 4-value union | |
| `src/app/api/news/route.ts:30` | `z.enum(["miami",…])` — a **third** copy of that union | drifts from `Metro` silently |
| `src/lib/admin/refs.ts:25` | `METROS` runtime list — a **fourth** copy | |
| `scripts/build-zip-seed.mjs:27` | `METROS` filter map | see §3 |
| `src/app/api/voting-info/route.ts:14` | `OFFICIAL_SOURCES` — 4 Supervisor-of-Elections URLs, keyed by county **name** | 63 more needed, or the email flow stays metro-only |
| `src/lib/news-sources.ts:53` | 23 outlets keyed to the 4 FIPS + statewide | statewide expansion ≠ statewide *news* |
| `src/lib/directory.ts:31`, `src/components/features/CandidateBrowser.tsx:49`, `src/app/(public)/news/page.tsx:20` | county switcher / filter reads | fall out of `COVERED_COUNTIES` |

`voting-info` is the one with a hard floor: it refuses out-of-coverage ZIPs
with *"we can only send info for the four covered metros"* and needs a real
SOE URL per county before it can say anything else. That is 67 human-verified
links — a B3-shaped task, not a code task.

---

## 5. Decisions

1. ~~**Which gap is worth closing first.**~~ **Decided 2026-09-09 (founder): §1,
   the Orlando case, first.** §1 was the promise already broken inside the four
   metros — a correctness problem in production today; §2 (TASK-060) is a reach
   problem, blocked on a download. They are independent, and §1 was the cheaper
   of the two: copy plus a predicate, no Census file, no migration.
2. ~~**What the honest answer is when a district has no race.**~~ **Decided and
   shipped 2026-09-09: option (a), say it.** The rejected option (b) — make
   `in_coverage` mean it, per §3.3, and let the existing out-of-coverage copy
   fire — is tidier but routes to a county picker that is the wrong offer for a
   Florida voter who already has their statewide ballot. See the done-note
   below.
3. **Whether the ZIP field should appear at all where it cannot pay off.**
   Orlando is the sharp case: 45 ZIPs, zero possible House races, and a heading
   that promises one.
4. **Whether FL-10's `in_review` is deliberate.** One published district would
   move 28 Orange County ZIPs out of the "never" column. It may be a content
   gate; nobody in this session knew. **Still open** — publishing a race is a
   content call, and the fix below is deliberately independent of it.

### Done-note — §1, the honest answer (2026-09-09)

`src/lib/coverage.ts` adds `districtRaceMissing(district, races)`: true when a
ZIP resolved to a district and no district-scoped race came back with it. Kept
dependency-free, like `measure-balance.ts`, so the rule is testable under Node's
type stripping — importing it from `resolve.ts` would drag in `next/cache`.

`YourRaces` renders, directly under the race list and only when the list is
non-empty:

> We don't have the U.S. House race for FL-9 yet. What's above is the statewide
> ballot every Florida voter shares — your district's race will appear here once
> it's published.

Three facts the query cannot tell apart — no race row, an unpublished row, a row
in another election — all arrive as absence, and all get this one answer. That
is deliberate: they are the same answer to a voter, and distinguishing them
would claim knowledge the read does not have.

`scripts/verify-coverage.ts` pins it, including that the notice never fires on
an empty race set (where the "not published yet" copy already owns the message).
Mutation-checked four ways: predicate → `false`, predicate → `Boolean(district)`,
empty-string handling dropped, and the `races.length > 0` composition removed at
the call site. Each fails the script; all four restored pass.

**What did NOT change:** the landing page still reads "Add your U.S. House race".
Hedging it would degrade the 47 ZIPs where the promise is kept, so the honest
answer is delivered where the ballot is, not where the offer is made. `zip_district`,
`COVERED_COUNTIES`, the resolver's return shape, and the four-metro copy in §4
are all untouched — this notice is what makes the gap visible, not what closes it.

---

## 6. What the next session should do

Blocked-free, in order:

1. ~~Add the **TASK-060 row** to `local-session.md`.~~ **Done 2026-09-10** —
   with the `build-zip-seed.mjs` trap named, since the unedited run reproduces
   the four-county output and looks like it worked. See the §2 done-note.
2. Land the **§3 corrections** into `general-election-pivot.md` TASK-060 —
   migration `0019` not `0011`, data-only not DDL, the `in_coverage` finding,
   the `build-zip-seed.mjs` reverse-lookup bug. Claim `0019` in the ledger.
3. ~~Put **§1** to the founder.~~ **Done** — answered, and the fix shipped; see
   the §5 done-note.
4. ~~Consider a guardrail.~~ **Done** — `scripts/verify-coverage.ts` exists and
   is mutation-checked. It pins the *display* rule (a resolved district with no
   race is reported), not a data invariant over `zip_district`; the data-level
   assertion is still unwritten. Note TC-0: neither runs in CI.
5. Still open: **FL-10's `in_review`** (§5.4), and whether the ZIP field should
   appear where it cannot pay off (§5.3). The notice makes the gap honest; it
   does not close it.

**Do not** widen `COVERED_COUNTIES` or reseed `zip_district` before §5.1 is
answered. Widening the map without widening the races makes §1 worse by
exactly the number of ZIPs added.

---

## 7. Verification notes

Read-only SQL against `pqracitpmzpiqfnzlngw` (2026-09-08). The seed file and
the live table agree exactly — 304 rows / 235 ZIPs / 4 counties / 16 districts
/ 65 split ZIPs / 0 `in_coverage=false` / 0 `metro IS NULL` — measured both
ways, so `0003` is applied and unmodified.

No build or test baseline is quoted here: `node_modules` is absent in this
session and this branch changes no code, so there was nothing to regress. The
next session should run the `data-ingest.md` §7 baseline before touching code.

---

## 8. Paste-ready prompt for the next session

> "Read `docs/general-election/session-handoff-2026-09-08-map-coverage.md`.
> Do §6.1 and §6.2 — add TASK-060 to the local-session runbook table, and
> correct TASK-060 in `general-election-pivot.md` (migration **0019**, claimed
> in the ledger; data-only, no DDL; `in_coverage` is unused today; the
> `build-zip-seed.mjs` county reverse-lookup breaks statewide). Then put §1 to
> the founder with the table as written and get a decision on §5.1 and §5.2
> before writing any resolver or copy change. Do not reseed `zip_district` or
> widen `COVERED_COUNTIES` first."
