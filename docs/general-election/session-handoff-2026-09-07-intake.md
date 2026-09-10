# Session handoff — ballots docs landed, XTL/DEC mapped

**Written:** 2026-09-07 · **Worktree:** `.claude/worktrees/ballots-handoff-docs-835025`
**Worktree is currently on `claude/intake-xtl-dec`**, not on the branch PR #33 was opened from. Run `git branch --show-current` before anything else.

## 1. State of the two branches

| Branch | Commit | Pushed | PR | Contents |
|---|---|---|---|---|
| `claude/ballots-handoff-docs-835025` | `f575d9a` | ✅ | **[#33 open](https://github.com/JasonJosephIT/know-your-vote/pull/33)**, Vercel green, `MERGEABLE` | `ballots-handoff.md` + `docs/general-election/ballots/` (README, CSV, 2 JSON, HTML) and `.gitignore` rules |
| `claude/intake-xtl-dec` | `4c3b115` | ❌ **not pushed, no PR** | — | the XTL/DEC parser fix, its tests, and `data-ingest.md` |

Both branch off `main` at `0cebc42`. They touch different files, so they do not conflict.

To push the second one:

```bash
git push -u origin claude/intake-xtl-dec
```

## 2. What was done

### PR #33 — ballots-by-ZIP docs and derived data

Copied out of the `missing-data-streams-html-7d8f8f` worktree, where it was uncommitted. Before committing, all five derived files were grepped for emails and phone numbers: **zero hits** — they carry candidate name, party and ballot status only. Two things are deliberately gitignored, with comments saying why: `EOGPCRP2026_block_assignment.txt` (7.6 MB, re-fetchable from flsenate.gov; the repo has no LFS) and `doe_*.tsv` (**the raw DoE export carries addresses, phones, emails and treasurer names**).

The handoff doc's header was rewritten — it had claimed "Nothing on this branch is committed" and pointed at the old branch.

### `claude/intake-xtl-dec` — the parser fix

`Civic Awareness (Know Your Vote)/toollayer/cap_toollayer/intake.py`:

- `_EXCLUDED_STATUS` gains `XTL` and `DEC` → tier `excluded`.
- `_STATUS` gains both → `qualifying_status = 'other'`, **not** `'withdrawn'`. A filing that moved to a county office and a filer who died did not withdraw, and that column gates social-account ingestion (`CAP_Schema_v1.md`).

Three new tests, plus updated fixture counts (9 → 11 candidates, `excluded` 3 → 5, races 5 → 6 since the new rows sit in FL-15). **173 toollayer tests pass.**

## 3. The finding that matters: F3 was overstated

`ballots-handoff.md` F3 says an unmapped `XTL` would **stop** the next live `doe_file_intake` run. **It would not have.** Verified by parsing rows of both shapes against the real parser:

| Row | Result |
|---|---|
| `XTL` on `STS` (state senator) — the live file's actual shape | **skipped**, never reaches `_ballot_status` |
| `DEC` on `CIRJUD` (circuit judge) — the live shape | **skipped** |
| `XTL` on `USR` district 028 — a *targeted* office | raises `DoEFormatError` |

`parse_candidate_list` filters by office **before** it tiers by status, and every XTL row is state-legislative while the DEC row is judicial. So the office filter — not the status map — is what kept the run green. The trap is **latent, not active**: it springs the first time a targeted office carries one of these codes, which is exactly what widening coverage past the eight races does. Since §4.2 proposes going to 16 House districts, and the ZIP manifests already carry state senate and state house contests, the fix was still worth doing now.

This correction is written into `data-ingest.md` §1 Q1 **on the `claude/intake-xtl-dec` branch only**.

### ⚠️ Open: F3 is still wrong in `ballots-handoff.md`

That file lives on the **PR #33 branch**, which this fix does not touch. Someone should amend F3's "Consequence" cell there to say the row is skipped by the office filter today and the risk is latent. One small edit on `claude/ballots-handoff-docs-835025`, ideally before #33 merges.

## 4. Also worth knowing

- **A pre-existing, unrelated test failure** in `runtime/test_runtime.py::TestLiveBackendLoop::test_no_client_and_no_sdk_is_not_configured`. It asserts the Anthropic SDK is absent, but it is installed at `~/Library/Python/3.9/`, so the test attempts a real API call. `git diff origin/main -- runtime` is empty — not caused by this work. 58 runtime tests, 1 error.
- The mutation testing the handoff asked for was actually run. Three mutations each fail the suite: dropping the tier half, dropping the qualifying half, and mapping to `withdrawn` instead of `other`.
- `_STATUS` and `_EXCLUDED_STATUS` are separate maps that could drift. A code in one but not the other dies on a bare `KeyError` instead of the promised `DoEFormatError`. `test_every_tiered_status_code_has_a_qualifying_status` now pins them equal.
- Use `/usr/bin/python3` on this Mac — the python.org 3.11 alpha on `PATH` has no CA bundle.

## 5. Next, in order

1. **Push `claude/intake-xtl-dec` and open its PR** (command in §1). Nothing blocks it.
2. **Fix F3 in `ballots-handoff.md`** on the PR #33 branch (§3).
3. **§4.2 — rebuild `zip_district` from the enacted 2026 map.** The big one. Needs a migration number **claimed in `supabase/migrations/README.md` first**, and a founder decision: do the four target races stay 10/15/23/28 (FL-23 is now out of coverage, FL-10 is not printed) or become the 16 districts that actually cover the four counties — FL-7/8/9/10/11, 12/14/15/16, 20/22/24/25/26, 27/28? **That decision also decides how urgent the XTL/DEC fix was**, since expanding to state legislative races is what makes those codes reachable.
4. **§4.4 — the "not printed" read-model state** for unopposed races (`src/lib/briefs.ts`).
5. **§4.1 — county sample ballots**, on or after 2026-09-24.

Full task list with rebuild recipes: `docs/general-election/ballots-handoff.md` §4.

## 6. Paste-ready prompt

> "Read `docs/general-election/session-handoff-2026-09-07-intake.md` first, then `ballots-handoff.md`. The worktree may be on `claude/intake-xtl-dec` — check. Push that branch and open its PR, then fix F3 in `ballots-handoff.md` on the `claude/ballots-handoff-docs-835025` branch (PR #33) to say the risk is latent, not active. Then take §4.2: rebuild `zip_district` from the enacted 2026 congressional plan, claiming a migration number in the ledger before writing the file, and ask me the target-races question before you start. Never commit the raw DoE export. Use `/usr/bin/python3`; remote sessions have no network."
