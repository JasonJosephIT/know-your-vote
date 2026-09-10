# Session handoff — enacted 2026 map, 16-district coverage, `unopposed` carried

> **Not to be confused with** `session-handoff-2026-09-08-map-coverage.md`, written the same day on `claude/map-coverage-handoff-gc39rq`. Both were called "the map coverage handoff" and collided on that filename at merge; this one was renamed because the code comments cite the other's section numbers. That file is the audit of what coverage delivers; this one is the change that widened it.


**Written:** 2026-09-08 · **Worktree:** `.claude/worktrees/session-handoff-intake-58b27d`
**Branch:** `claude/general-election-2026-map` (PR #35). Run `git branch --show-current` before anything else.

Three PRs are open and they are **stacked**. Read §1 before merging anything.

---

## 1. The three PRs, and why the order matters

| PR | Branch | Base | Contents |
|---|---|---|---|
| [#33](https://github.com/JasonJosephIT/know-your-vote/pull/33) | `claude/ballots-handoff-docs-835025` | `main` | `ballots-handoff.md` + `docs/general-election/ballots/` (README, CSV, 2 JSON, HTML) and the `.gitignore` rules |
| [#34](https://github.com/JasonJosephIT/know-your-vote/pull/34) | `claude/intake-xtl-dec` | `main` | the XTL/DEC parser fix, its tests, `data-ingest.md` |
| [#35](https://github.com/JasonJosephIT/know-your-vote/pull/35) | `claude/general-election-2026-map` | **`claude/intake-xtl-dec`** | migrations `0022` + `0023`, the 16-district widening, the "not printed" read model, docs |

**Merge #33 → #34 → #35.** Three hard dependencies, not stylistic preference:

1. `scripts/verify-zip-seed-2026.mjs` reads #33's `zip_districts_2026.csv` **at runtime** — it is the oracle the ZIP seed is checked against. Merge #35 first and that check has no oracle. (It now fails with a clear message rather than an unhandled child-process error, but it still cannot verify.)
2. `0022`'s ledger row, `intake.py` and several doc passages cite `ballots-handoff.md` §4.2, which exists only on #33.
3. The `.gitignore` rules protecting `EOGPCRP2026_block_assignment.txt` (7.6 MB) and `doe_*.tsv` (**the raw DoE export carries addresses, phones, emails and treasurer names**) are on #33. #35 is the branch that tells an operator to run the generator.

#35's base is `claude/intake-xtl-dec`, so GitHub will retarget it to `main` when #34 merges. If you merge #34 by squash, retarget #35 manually first.

## 2. What shipped

### Two founder decisions, taken 2026-09-07

**D-A — coverage becomes sixteen U.S. House districts.** Orange 7/8/9/10/11, Hillsborough 12/14/15/16, Broward 20/22/24/25/26, Miami-Dade 27/28. FL-23 leaves: under the enacted map it falls in no covered ZIP.

**Total scope is now 21 races: 5 at-large + 16 House.** The five includes `USS` → `FL-SEN-general`. The old "eight target races" framing was always short by the Senate — that was a parser bug (`_NO_DISTRICT_RACES` had no `USS`), not a scope decision, and `db-audit-2026-09-07.md` had already recorded the real number as nine.

**D-B — the DoE's `UNO` code is *carried* into the read model, not derived.** See §3.

### The changes

| Area | What |
|---|---|
| `scripts/build-zip-seed.mjs` | rebuilt on the enacted plan's per-block assignment + the Census ZCTA↔tabblock file. County now comes from the block GEOID (state 2 + county 3 + tract 6 + block 4) instead of a third Census download |
| `0022_zip_seed_2026.sql` | 316 rows / 235 ZIPs / 75 split. Supersedes `0003`, which stays applied and untouched |
| `0023_candidate_unopposed.sql` | widens `candidate.qualifying_status`'s CHECK to admit `unopposed` |
| `intake.py` | `_TARGET_US_HOUSE` 4 → 16; `_STATUS["UNO"] = "unopposed"`; `juris.zfill(3)` normalisation |
| `src/lib/unopposed.ts`, `briefs.ts`, race page | the "elected without opposition / not on the ballot" state |
| `scripts/doe-code-dump.py` | targets brought back into step with the parser, including the missing `USS` |
| docs | both decisions recorded; the stale "eight target races" framing swept out of current-state claims |

### Verification at `efca022`

```
toollayer                180/180 OK
verify-zip-seed-rules    pass (16 fixture assertions)
verify-zip-seed-2026     316 pairs over 235 ZIPs — matches the oracle exactly
verify-unopposed         pass
doe-code-dump --selftest pass
verify-migrations        137 ok / 0 FAIL over 19 migrations (embedded PGlite)
tsc --noEmit             clean
next build               succeeds
```

`0022` is reproduced **byte-identically** by re-running the generator from the raw inputs, and the oracle check was mutation-tested three ways (changed district / dropped row / flipped `is_split`) — each mutation fails it. The oracle was derived independently by a different session from the same two inputs; two derivations agree on all 316 pairs.

## 3. Migration `0023` — what it is and why intake needs it

**The problem it solves.** Florida marks a candidate `UNO` when nobody filed against them. Under **F.S. 101.151(7)** that contest is then **not printed on the general ballot at all** — there is no line to vote on and the candidate takes the office. FL-10 is in exactly that shape this cycle, as are state senate districts 4 and 16 and 28 state house districts.

The app could not say that, because the distinction died at ingest: `_STATUS` in `intake.py` mapped **both** `QUA` and `UNO` to `"qualified"`. It did that because the CHECK on `candidate.qualifying_status`, written inline in `0000_pipeline_read_models.sql`, admitted only three values. So `0023` widens it:

```sql
CHECK (qualifying_status IN ('qualified','unopposed','withdrawn','other'))
```

**Why carried and not derived.** The obvious substitute is "exactly one ballot-tier candidate and no write-in". That is wrong for a race whose other candidates withdrew *after* qualifying: the survivor is `QUA`, the ballot is already printed with their name on it, and the derivation would tell a voter their race does not exist. The two races are **indistinguishable by composition** and distinguishable only by the code the DoE already publishes — so the column has to keep it. That is decision D-B.

**Why it is a precondition for the next intake run.** `intake.py` now writes `qualifying_status = 'unopposed'`, and `store.py` puts that value on the row at upsert. The live three-value CHECK **refuses** it. Run an intake against a database that has not had `0023` applied and every `UNO` row fails. Recorded in the ledger row, the migration header, `intake.py` and `data-ingest.md`.

**Not `ballot_status`.** That column (`0013`) is a different axis — whether a filing gets a printed line. An unopposed candidate is still a ballot-tier filing: briefed, audited, shown. `unopposed` is a *qualifying* status.

**The unnamed-constraint guard.** Unlike `0013`'s `candidate_ballot_status_check`, this CHECK was written inline in `0000` and named by Postgres, so nothing in the repo ever asserted its name. Dropping the wrong name would leave the old three-value CHECK standing beside the new one — the migration would report success and every `UNO` row would still be rejected, with the constraint list as the only evidence. `0023` drops the auto-generated name, then scans `pg_constraint` and **RAISEs** if any CHECK mentioning `qualifying_status` survived. Verified against `0000_pipeline_read_models.sql:26`; the abort path always leaves at least the old CHECK standing, so it cannot leave the column unconstrained. Idempotent.

**One consequence, stated so it is not discovered later.** `CAP_Schema_v1.md` says social accounts are ingested "only when `qualifying_status = 'qualified'`". No code implements that as a literal comparison today (checked across `src/` and `toollayer/`), but **whoever writes it must treat `unopposed` as ballot-tier alongside `qualified`** — an unopposed candidate is the one who will hold the office, so an equality test would mute exactly the candidate a voter cannot vote against.

## 4. Where the uncontested-seat metadata actually lives

Confirmed working as intended, and worth knowing precisely:

- **The candidate row is kept**, with `candidate.qualifying_status = 'unopposed'`. The filing is a public fact and stays queryable.
- **The race row is kept**, and the candidate **enters `race.candidate_ids`** — because `UNO` is still in `_ON_BALLOT_STATUS`, so `_ballot_status` tiers them `ballot`. They are briefed and audited like anyone else.
- **"Is this contest printed" is derived at read time**, not stored: `isUnopposedContest()` in `src/lib/unopposed.ts` requires one ballot-tier candidate **whose status is `unopposed`** *and* no qualified write-in. `briefs.ts` sets `notPrintedOnBallot` from it.

The write-in half cannot be read off the brief's candidates: a qualified write-in **is** opposition, so the office appears on the ballot with a blank write-in line under it, and D1's filtering removes write-ins before the brief is built. `briefs.ts` looks for them separately.

> **If you want a race-level column** (`race.printed_on_ballot`, say) rather than a read-time derivation, that is a new migration and a small `store.py` change. The candidate-level metadata you asked for is already there; the race-level fact is currently computed. Worth deciding before the first live run writes rows either way.

`notPrintedOnBallot` is **optional** on the interface on purpose: `getRaceBrief` is memoised with `unstable_cache` across deploys, so an entry written before the field existed comes back without it, and `undefined` must mean "printed" — the weaker, safer claim.

## 5. Open decisions — yours, not the next session's

### 5.1 The layout call (small, reversible, blocks nothing)

A not-printed race currently renders the "does not appear on the ballot" copy **and** still shows the candidate card. `ballots-handoff.md` §4.4 says render the message ***instead of*** the single-candidate view.

Two reviewers preferred keeping the card: an unopposed candidate takes the office, so hiding their brief hides the person who will hold it. `RaceCompare.tsx` is a pure grid over `brief.candidates` and the flag lives on the brief, so switching is **one conditional** at `page.tsx`. Whichever you pick, **amend §4.4 on #33 to match** or the two documents disagree the moment both merge.

### 5.2 `docs/prd.md:22`

Still scopes the MVP to "statewide + FL-28/FL-23/FL-15/FL-10". Left deliberately — an MVP definition is a founder decision, not a documentation sweep. D-A makes it stale.

### 5.3 Applying `0022` and `0023`

Both read **"written, NOT yet applied"**. Neither has touched the live database. Note that **applying `0022` alone** re-points 133 ZIPs at districts whose `race` rows do not exist yet (races come from the intake run, never from a migration). It degrades gracefully — `resolve.ts` returns statewide races only and `directory.ts` filters the rest out — but plan the two together with an intake run.

## 6. Known gaps, deliberately not closed

| # | Gap | Why left |
|---|---|---|
| G1 | **No CI runs any of this.** No `.github/workflows`, no `test` script in `package.json`. This branch adds four `verify-*` scripts and 180 Python tests that only run when a human runs them | Pre-existing; the project tracks it as **TC-0**. It is now a bigger gap than it was |
| G2 | `scripts/build-zip-seed.mjs` has two silent paths: a covered ZIP whose blocks are *all* absent from the plan emits no rows (reads as out-of-coverage to a voter), and a ZIP whose plan-attributable land is fragmented below 5% everywhere still emits the dominant district with `is_split=false`, auto-picking against FR-001 | Neither occurred with the real inputs — output matched the oracle exactly. A `throw` naming the ZIP when `covered && districts.size === 0` closes the first cheaply |
| G3 | `verify-migrations.mjs` asserts `0023`'s post-state but never exercises its RAISE | Pre-creating a second differently-named CHECK and asserting the abort would demonstrate the guard rather than assert it |
| G4 | Task 3's original fixture tests have **no RED/GREEN transcript** — that implementer was killed by an API rate limit before writing a report | The controller verified the left-behind work independently (byte-identical regeneration, three-way mutation test) before committing. Later fix rounds do have transcripts |
| G5 | `_TARGET_US_HOUSE` (`intake.py`) and `TARGET_USR`/`TARGET_OFFICES` (`doe-code-dump.py`) are duplicated sets kept in step by a comment | They had already silently drifted once — that is how the missing `USS` was found. An import is awkward: the toollayer path has spaces and parentheses, and `_TARGET_US_HOUSE` is underscore-private |

## 7. Next, in order

1. **Merge #33, then #34, then #35** (§1). Retarget #35 if #34 is squashed.
2. **Decide §5.1** and amend `ballots-handoff.md` §4.4 to match.
3. **Apply `0022` + `0023` and run a live intake** — together, not separately (§5.3). This is the first run that exercises twelve new districts and the `unopposed` value. Expect new `race` rows for FL-7/8/9/11/12/14/16/20/22/24/25/26/27.
4. **§4.4 follow-through:** verify a real FL-10 brief renders the not-printed state end to end once real rows exist.
5. **§4.1 — county sample ballots.** Gated to **on or after 2026-09-24**. Orange, Broward, Hillsborough, Miami-Dade; goal is one composite ballot per county, then precinct → ZIP overlap so each ZIP gains `county_and_municipal.contests[]`. Recipes in `ballots-handoff.md` §4.1.
6. **§4.5 — amendments and retention content** (3 amendments at 60%; Muñiz statewide; DCA judges by county).
7. **Close G1** if you want any of this to survive a careless merge.

## 8. Gotchas that cost time

- **There is no pytest on this Mac** — not under `/usr/bin/python3` (3.9) and not under `/usr/local/bin/python3`. The toollayer suite is stdlib `unittest`: `cd "Civic Awareness (Know Your Vote)/toollayer" && /usr/bin/python3 test_toollayer_skeleton.py`.
- Use `/usr/bin/python3` for anything that fetches — the python.org 3.11 on `PATH` has no CA bundle.
- `node scripts/verify-migrations.mjs` uses **embedded PGlite**, not a live database. Safe to run, and it is the right way to prove a migration applies in order. Takes 2+ minutes.
- Every `verify-*.ts` prints a `MODULE_TYPELESS_PACKAGE_JSON` warning because the repo has no `"type": "module"`. Pre-existing; not a regression to chase.
- **Never run `scripts/build-zip-seed.mjs` casually** — it overwrites `0022_zip_seed_2026.sql`. **Never run `scripts/doe-code-dump.py` without `--selftest`** — it makes live DoE requests.
- Census ranged GETs return `520`; stream whole files. The ZCTA↔block national file is 1.06 GB; filter on the **10th** `|` column (`GEOID_TABBLOCK_20`), not the 9th (`OID_`).
- DoE `Juris1num` **is** zero-padded — the live roster has `USR|007|`, `USR|008|`, `USR|009|`. `zfill(3)` now normalises anyway.
- Give each concurrent agent its **own worktree**. A shared tree across sessions is a branch-yank hazard.

## 9. Paste-ready prompt

> "Read `docs/general-election/session-handoff-2026-09-08-map-coverage.md` first, then `ballots-handoff.md`. Three PRs are stacked — merge #33 → #34 → #35 and retarget #35 if #34 squashes. Then take §7 in order. Ask me the §5.1 layout question before touching the race page. Never commit the raw DoE export. There is no pytest here: run the toollayer suite as `/usr/bin/python3 test_toollayer_skeleton.py`. `verify-migrations.mjs` is embedded PGlite and safe; `build-zip-seed.mjs` overwrites a migration and `doe-code-dump.py` hits the live DoE, so don't run either casually."
