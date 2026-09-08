# Map-coverage handoff — what "we cover this area" actually means

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

**Cheapest possible fix, and the first thing the next session should do:** add
a TASK-060 row to that table. It needs two file downloads and one command:

```bash
node scripts/build-zip-seed.mjs <zcta_cd.txt> <zcta_county.txt>
```

---

## 3. Corrections to TASK-060 as written

Three things in the task text are now wrong. Fix them before working it.

1. **Migration number.** It pencils `supabase/migrations/0011_zip_statewide.sql`.
   `0011` is `0011_measure_rls.sql`, applied 2026-09-07. Per the ledger, the
   next free number is **`0018`**. Claim it in `supabase/migrations/README.md`
   first, in the same PR.
2. **It is a data migration, not a schema one.** No DDL is needed. `metro` is
   already `TEXT` and nullable with no CHECK (`0001_app_tables.sql:16`), so
   non-metro counties store `NULL` today; `anon_read_zip_district` is already
   `USING (true)`. `0018` is a `DELETE FROM zip_district` + `INSERT`, exactly
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

## 5. Decisions this session did not make

1. **Which gap is worth closing first.** §1 (the promise already broken inside
   the four metros) is a correctness problem in production today. §2 (TASK-060)
   is a reach problem, blocked on a download. They are independent, and §1 is
   cheaper: it is copy plus a resolver branch, no Census file, no migration.
2. **What the honest answer is when a district has no race.** The resolver
   returns `inCoverage: true` and an empty House slot; nothing tells the voter
   why. The options are (a) say it — "we don't have your House race yet" — or
   (b) make `in_coverage` mean it, per §3.3, and let the existing out-of-coverage
   copy fire. (b) is tidier but currently routes to a county picker that is the
   wrong offer for a Florida voter who already has their statewide ballot.
3. **Whether the ZIP field should appear at all where it cannot pay off.**
   Orlando is the sharp case: 45 ZIPs, zero possible House races, and a heading
   that promises one.
4. **Whether FL-10's `in_review` is deliberate.** One published district would
   move 28 Orange County ZIPs out of the "never" column. It may be a content
   gate; nobody in this session knew.

---

## 6. What the next session should do

Blocked-free, in order:

1. Add the **TASK-060 row** to `local-session.md` §"The other local-only tasks"
   (§2 above). It is two downloads and one command, and it is the only reason
   that task has sat still.
2. Land the **§3 corrections** into `general-election-pivot.md` TASK-060 —
   migration `0018` not `0011`, data-only not DDL, the `in_coverage` finding,
   the `build-zip-seed.mjs` reverse-lookup bug. Claim `0018` in the ledger.
3. Put **§1 to the founder** with the table. It is a live product defect and
   the decision in §5.2 is theirs, not an implementer's.
4. Consider a guardrail — `scripts/verify-coverage.ts` in the style of the
   existing `verify-*.ts` — asserting that every district in `zip_district`
   has a published `race`, or is flagged. Nothing checks this today, and §1 is
   what "nothing checks this" produced. Note TC-0: it would not run in CI.

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
> correct TASK-060 in `general-election-pivot.md` (migration **0018**, claimed
> in the ledger; data-only, no DDL; `in_coverage` is unused today; the
> `build-zip-seed.mjs` county reverse-lookup breaks statewide). Then put §1 to
> the founder with the table as written and get a decision on §5.1 and §5.2
> before writing any resolver or copy change. Do not reseed `zip_district` or
> widen `COVERED_COUNTIES` first."
