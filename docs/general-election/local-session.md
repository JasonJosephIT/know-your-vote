# Local session runbook — the network-bound tasks

**Why this file exists:** Claude Code remote/web sessions have no general
outbound network. Verified 2026-09-06 — the egress proxy answers `403` to
CONNECT for every external host, including
`dos.elections.myflorida.com`, `api.open.fec.gov`, `www.flsenate.gov`,
`dos.fl.gov`, and `example.com`. Only the infrastructure allowlist (npm, PyPI,
the Anthropic API) is reachable. So every task that touches a live election
endpoint has to run **on a machine with real network** — the same box that
live-verified T1–T3 on 2026-07-10.

**This file owns:** how to run those tasks here, and what to send back.
**`data-ingest.md` owns:** what each task changes and why. Tasks are referenced
by ID; nothing is restated.

---

## Do this first — B1 (≈2 minutes) — ✅ done 2026-09-06

**B1 ran on 2026-09-06.** Findings are in `data-ingest.md` §1 *B1 results*;
B2 and B3 are unblocked. The steps stay here so the run can be repeated when
the export changes (e.g. after certification, when `ELE` will appear).

```bash
git fetch origin
git checkout claude/data-architecture-ingest-plan-u9b1fq
python3 scripts/doe-code-dump.py            # fetches FED, CAB, LEG
```

Python 3.9+ is enough — the script is stdlib only (`urllib`), no venv, no
install, no API key. It needs none of the arm64/`mcp`/`psycopg` setup that
AGENT_BRIEF §5 describes for running S1.

**Use `/usr/bin/python3` on the founder's machine.** The python.org 3.11
*alpha* that is first on `PATH` ships without a CA bundle and fails every
fetch with `CERTIFICATE_VERIFY_FAILED`; the system 3.9.6 works (verified
2026-09-06).

Sanity-check it without touching the network first if you like:

```bash
python3 scripts/doe-code-dump.py --selftest   # prints "selftest OK"
```

**If the DoE WAF blocks the scripted POST**, download the export by hand from
the DoE candidate-list page and parse the saved file — same output:

```bash
python3 scripts/doe-code-dump.py --file ~/Downloads/CandidateList.txt
```

---

## The three questions the output has to answer

Read the output against these. Each one decides a specific thing, and a wrong
guess here propagates into the audit population.

| # | Question | Where to look | What it decides |
|---|---|---|---|
| **Q1** | Which `StatusCode` values actually appear now that the primary is over? | `StatusCode / StatusDesc` counts | The `excluded` tier. `intake.py` only knows `QUA` and `WIT` and maps everything else to `other` — **and never excludes anything**. Whatever code marks a primary loser is the one that must stop entering `race.candidate_ids` (defect I1) |
| **Q2** | Is there *any* column identifying write-ins? | the `unknown-to-parser columns:` line, then `PartyCode` | The `write_in` tier (defect I2). **Answered 2026-09-06:** no candidate-type column; the signal is `PartyCode = 'WRI'`, with status taking precedence (write-ins also carry `DNQ`/`WIT`/`REM`) |
| **Q3** | Which `PartyCode` values appear beyond `REP`/`DEM`/`NPA`? | `PartyCode / PartyDesc` counts | Confirms **D2** in `data-architecture.md` — every distinct minor party found is one the current CHECK constraint would flatten into `other` |

### The `cantype` diff is not a write-in test

Earlier drafts of this file proposed diffing two fetches with different
`cantype` values if no write-in column existed. Read off the DoE download form
(`downloadcanlist.asp`) on 2026-09-06, `cantype` is **`STA` State Candidates /
`LOC` Local Candidates / `ALL` State & Local** — a jurisdiction filter. Diffing
it separates county-level filers from state-level ones and says nothing about
write-ins. Use `PartyCode = 'WRI'` instead (Q2). The same form's `office`
values are `All, FED, CAB, ATT, LEG, JUD, SPD` — `STA` was never valid there,
which is why the script's third fetch used to return 0 rows.

---

## Sending results back

**Paste the script's stdout verbatim.** It is safe to paste: it prints only
column *names*, row counts, and code/description pairs — never a candidate row.

That matters, because the raw export is a different story:

> ⚠️ **The DoE export carries candidate PII** — `Addr1`, `Addr2`, `City`, `Zip`,
> `Phone`, `Email`, and treasurer names. `intake.py` deliberately drops those
> columns and the `candidate` table has no place to put them. **Never commit a
> raw export to the repo.** Save it outside the working tree, or delete it when
> you're done. The script's aggregate output is the only thing that should
> travel.

Once the answers land, B2 (the parser fix) can be written and the rest of the
ingest plan unblocks.

---

## The other local-only tasks

Same network constraint, all detailed in `data-ingest.md` §7 (TASK-060 is the
exception — it lives in `general-election-pivot.md`) — listed here only so
nobody schedules them into a remote session and watches them 403.

| ID | Needs | Also needs |
|---|---|---|
| **B3** | nothing but a browser — seed `official_site` for the **22** `ballot`-tier candidates counted in `data-ingest.md` §1, human-verified | — |
| **B4** | live FEC (T2) for incumbency / open-seat | `FEC_API_KEY` (already in `.env.local`) |
| **B5** | live Congress.gov for federal incumbent voting records | a free `api.data.gov` key |
| **B7** | the full S2-01 acceptance through real S1 | the AGENT_BRIEF §7 gates: arm64 Python 3.12 venv with `mcp`+`psycopg`, `SUPABASE_DB_URL` password, demo seed loaded, Anthropic spend |
| **C7-b** | `node scripts/news-sweep.ts --probe` — confirms the RSS/Atom feed URL for each of the 23 outlets in `src/lib/news-sources.ts` (they ship `feed: null`; the remote session refused to guess) | nothing — one command, ~1 minute |
| **TASK-060** | the two Census ZCTA crosswalk files, downloaded on any machine with real network, then `node scripts/build-zip-seed.mjs <zcta_cd.txt> <zcta_county.txt>` | **a script edit first — see the note below.** The output is migration **0019**; claim it in `supabase/migrations/README.md` before writing the file |

B3 is worth doing while you're here — it needs no network tooling at all, and
it clears defect I3, which is the one that would otherwise publish hollow
briefs without tripping a single audit gate.

**TASK-060 is the one with a trap.** The two files are named in the header of
`scripts/build-zip-seed.mjs`:

```
https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld/tab20_cd11920_zcta520_natl.txt
https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
```

`www2.census.gov` answers **403** to CONNECT through the remote session's proxy
— a policy denial, re-confirmed 2026-09-08, not a flake worth retrying. But
downloading the files is the easy half. The script as written **filters every
ZCTA down to the four metro counties** (`if (METROS[county])`) and then derives
each row's `county_fips` by searching `METROS` for a matching `metro` value —
which cannot work when `metro` is NULL for the other 63 counties. Run unedited,
it reproduces the same 304 rows it produced in July and looks like a success.
A statewide run needs the FIPS taken straight from the crosswalk row, and
`metro` allowed to be NULL.

Two more corrections worth having before you start, both from
`session-handoff-2026-09-08-map-coverage.md` §3: the migration is **data-only**
(no DDL — `metro` is already nullable with no CHECK and `anon_read_zip_district`
is already `USING (true)`), and `in_coverage` is **unused today** — 0 of 304
rows are false, so "not covered" is currently signalled by row absence and
redefining the flag is its first use, not a migration of meaning.

**And the thing widening the map does NOT fix:** 133 of the 235 currently
seeded ZIPs resolve to a district with no published House race. Since 2026-09-09
the app says so out loud rather than rendering a silently short ballot
(`src/lib/coverage.ts`), but every ZIP this task adds arrives in that same state
until its district's race is published. Widen the map knowing that.

**C7-b is the cheapest thing on this list.** `--probe` fetches each outlet's
homepage and prints the feeds it advertises; paste the confirmed URLs into the
`feed:` fields and open a PR. It does not fill `leanTag` — that is a founder
call, not a lookup (see `candidate-news-PRD.md` §5 and the C7 note). Until both
are filled, `scripts/news-sweep.ts` exits 1 and says so rather than reporting an
empty sweep as a success.

---

## Paste-ready session prompt

B1 is done; the prompt below is kept for a re-run after the export changes.

> "Re-run B1 from `docs/general-election/local-session.md`. Execute
> `/usr/bin/python3 scripts/doe-code-dump.py` on this machine (remote sessions
> are egress-blocked), then diff the output against the *B1 results* recorded
> in `data-ingest.md` §1 — any new `StatusCode` or `PartyCode` is a B2 change.
> Do not commit the raw DoE export — it carries candidate PII. Commit to
> branch `claude/data-architecture-ingest-plan-u9b1fq`."
