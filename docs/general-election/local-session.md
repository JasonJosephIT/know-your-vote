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

## Do this first — B1 (≈2 minutes)

B1 gates B2, which is the parser fix at the centre of the whole scope change.
Nothing else in the ingest plan can be written correctly until it's done.

```bash
git fetch origin
git checkout claude/data-architecture-ingest-plan-u9b1fq
python3 scripts/doe-code-dump.py            # fetches FED, CAB, STA
```

Python 3.9+ is enough — the script is stdlib only (`urllib`), no venv, no
install, no API key. It needs none of the arm64/`mcp`/`psycopg` setup that
AGENT_BRIEF §5 describes for running S1.

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
| **Q2** | Is there *any* column identifying write-ins? | the `unknown-to-parser columns:` line | The `write_in` tier (defect I2). If a candidate-type column exists, use it. If the line says `(none)`, fall back to the `cantype` diff below |
| **Q3** | Which `PartyCode` values appear beyond `REP`/`DEM`/`NPA`? | `PartyCode / PartyDesc` counts | Confirms **D2** in `data-architecture.md` — every distinct minor party found is one the current CHECK constraint would flatten into `other` |

### If Q2 comes back `(none)`

The export has no candidate-type column, so identify write-ins by set
difference instead — two fetches, compare `AcctNum`. The form posts a `cantype`
field (the script sends `cantype=ALL`); read the real option values off the DoE
candidate-list form's `cantype` dropdown rather than guessing them, then fetch
once per value and diff. Record the values you used.

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

Same network constraint, all detailed in `data-ingest.md` §7 — listed here only
so nobody schedules them into a remote session and watches them 403.

| ID | Needs | Also needs |
|---|---|---|
| **B3** | nothing but a browser — seed `official_site` for ~20–30 briefed candidates, human-verified | — |
| **B4** | live FEC (T2) for incumbency / open-seat | `FEC_API_KEY` (already in `.env.local`) |
| **B5** | live Congress.gov for federal incumbent voting records | a free `api.data.gov` key |
| **B7** | the full S2-01 acceptance through real S1 | the AGENT_BRIEF §7 gates: arm64 Python 3.12 venv with `mcp`+`psycopg`, `SUPABASE_DB_URL` password, demo seed loaded, Anthropic spend |

B3 is worth doing while you're here — it needs no network tooling at all, and
it clears defect I3, which is the one that would otherwise publish hollow
briefs without tripping a single audit gate.

---

## Paste-ready session prompt

> "Run B1 from `docs/general-election/local-session.md`. Execute
> `python3 scripts/doe-code-dump.py` on this machine (remote sessions are
> egress-blocked), then answer Q1/Q2/Q3 from that file against the real output.
> Do not commit the raw DoE export — it carries candidate PII. Record the
> findings in `data-ingest.md` §1, tick B1 in its §7 task table, and commit to
> branch `claude/data-architecture-ingest-plan-u9b1fq`. Do not start B2 until
> Q1 and Q2 are answered from the actual file — the whole point of B1 is that
> the status codes are not guessed."
