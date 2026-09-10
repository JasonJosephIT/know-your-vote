# Scoping the pipeline run that unblocks publication

**Written:** 2026-09-10 · **Status:** scope only, nothing run.
**Question it answers:** what it takes to get the 21 real races from "in the
table, unpublished" to "publishable", now that intake has landed.

---

## 0. A naming correction, because it changes what you'd be approving

I earlier told you the blocker was "the R1–R4 pipeline". That was wrong, and the
distinction is not cosmetic — **there are two different R1–R4 schemes in this
repo**:

| | What they are | Do they unblock publication? |
|---|---|---|
| **R1–R4 refresh agents** (`docs/general-election/refresh-agents-plan.md`) | R1 Candidate News Curator, R2 Contact & Race Info Refresher, R3 Election News Curator, R4 Ops Digest. They write `news_item`, `candidate_contact`, `race.key_dates` and an ops report. | **No.** They never touch `profile`, `claim`, or the Balance Audit. |
| **The runtime pipeline** (`Civic Awareness (Know Your Vote)/runtime/`) | Three model agents — **Profiler**, **Record**, **Fact-Checker** — plus the **S3 orchestrator** that sequences them and runs the Balance Audit. | **Yes.** This is the one. |

Everything below scopes the runtime pipeline. Running R1–R4 would refresh news
and contact details and leave every race exactly as unpublishable as it is now.

---

## 1. Why publication is blocked

`getRaceBrief` returns `null` unless **every** ballot-tier profile carries
`audit.balance_check_passed === true` (`src/lib/briefs.ts:172`, FR-005).

Live right now: **0** of the 247 intake candidates have a `profile` row at all.
All 29 profiles and all 261 claims belong to the retired demo races. So
publishing today yields races whose pages render nothing.

The only way to make that flag true without running the pipeline is to write it
by hand, which forges the product's central claim. It is not on the table.

---

## 2. What the run actually is

Per the S3 runbook (`runtime/BRIEFS/03-s3-orchestrator.md`), one race:

```
new_race_state → log_spine_issues → start_agents
  → per candidate, sequentially: Profiler + Record, then Fact-Checker
  → agent_finished per session
  → balance_audit (T10) → apply_audit_result
  → on PASS: mark_composed → record_human_review → check_dispatch → mark_dispatched
```

`balance_audit → apply_audit_result` is the step that sets the flag in §1.

| Agent | Model | Tool calls | Session tokens | Wall clock | Notes |
|---|---|---|---:|---:|---|
| Profiler | `claude-sonnet-5` | 60 | 400K | 15 min | Web search + fetch. One Position per spine issue (**27 spine issues**); silence is recorded as `no_stated_position_found`, never invented. |
| Record | `claude-sonnet-5` | 60 | 400K | 15 min | Primary APIs only (FEC/FL Leg/DoE) — web search is denied. Every claim `verifiable_fact` + `primary_doc`. |
| Fact-Checker | `claude-sonnet-5`, escalates to `claude-opus-4-8` | 120 | 800K | 30 min | Consumes the other two's claims cross-bucket; adjudicates symmetrically across the race. |

Token rails are **cumulative per session** (input + output, summed across up to
50 turns), not per-request; per-request output is capped at 4096.

---

## 3. Volume

| | Count |
|---|---:|
| Races | 21 |
| Ballot-line candidates | **57** (40 House, 17 statewide) |
| Model sessions (3 per candidate) | **171** |
| Largest single race | 8 candidates (Governor) |
| Spine issues driving Profiler length | 27 |

**Ceilings if every session runs to its rail:** 91.2M tokens and ~57 hours of
sequential wall clock. Both are ceilings, not forecasts — sessions normally
finish well short.

---

## 4. Cost

`claude-sonnet-5` is $2.00/$10.00 per MTok; `claude-opus-4-8` (the Fact-Checker's
escalation) is $5.00/$25.00. The escalation ID is **valid and current** — not
stale, as I first suspected.

| Scenario | Estimate |
|---|---:|
| Floor (91.2M tokens, all input, no escalation) | ~$182 |
| Mid (85/15 input/output blend) | ~$290 |
| With Fact-Checker escalating on ~⅓ of candidates | ~$350–400 |

Treat that as a **ceiling band, not a forecast.** The honest number comes from
measurement, and measurement is cheap: **one candidate is 3 sessions, ≈$5 at the
rails.** Nobody should approve a $400 run on an estimate when $5 buys the real
number.

### The one cost lever worth pulling first

`LiveAnthropicBackend` sets **no `cache_control` anywhere** (`cache_control`
appears 0 times in `session.py`). Every turn re-sends the verbatim Agent-Plan
system prompt plus the full tool schemas, up to 50 turns per session, across 171
sessions. That prefix is exactly what prompt caching is for — stable system
text, deterministic tool list — and cached reads are ~10% of input cost.

It is a change in one place, and it lands before the expensive part. Recommend
doing it between the pilot and the full run, so the pilot measures the
uncached baseline and the full run gets the discount.

---

## 5. What is built vs what has to be written

| Piece | State |
|---|---|
| `agents.py` (all three configs, verbatim prompts) | **Built**, unit-tested |
| `mcp_client.py`, `session.py`, `run_agent.py`, `orchestration.py` | **Built**, 39 tests |
| `orchestrator_core.py` (the state machine) | **Built + tested** |
| S2-01/02/03 **live acceptance** (Briefs 01, 02) | **Not run** — founder-gated |
| S3 `orchestrator/run_race.py` | **Does not exist** (Brief 03 is a build task) |

So this is not purely "press go": the orchestrator that drives the Balance Audit
still has to be written. It is deterministic Python over an already-tested core —
no prompt, no model calls — but it is work, not configuration.

---

## 6. Prerequisites (Brief 00 — founder-owned, blocks everything)

1. **An arm64 Python 3.12 venv.** This box's `python3` is `3.11.0a3` (an alpha —
   breaks `psycopg`) and `/usr/bin/python3` is `3.9.6` (too old for `mcp`).
   Homebrew here is the **Intel** install, so its 3.12 is x86_64 and
   `cryptography` has arm64-only wheels. Brief 00 gives the exact `uv` recipe.
2. **`SUPABASE_DB_URL`.** Not merely unset — **absent from `.env.local`
   entirely**. The `cap_tool_wrapper` password has to go in.
3. **Rotate three exposed secrets** (FEC, Anthropic, DB password) — all were
   pasted into a transcript.
4. `CAP_READONLY_DB_URL` for the read plane.

Brief 00 step 3 ("load the demo seed") is now **obsolete** — real races and
candidates are in the table, which is a better target than the demo seed ever was.

---

## 7. Gates that stay in the way, by design

- **Balance Audit PASS/HALT per race.** A HALT produces a remediation report and
  blocks composition. A race whose candidates have very uneven source coverage
  can HALT repeatedly — that is the feature working.
- **Human review** (`record_human_review`) before dispatch is possible.
- **Publication** is still a separate `set_race_publication()` call afterwards.

---

## 8. The risk that deserves naming

This pipeline writes **claims about real, named people** into a voter guide. The
Fact-Checker and the Balance Audit exist precisely because that is the risk, and
the human gate is the backstop — but the backstop only works if someone actually
reads the output.

Recommendation: read **every claim** on the first race by hand, not a sample.
57 candidates is small enough that full review is feasible for the first few
races and gets cheaper as trust builds.

---

## 9. Recommended sequence

| # | Step | Cost | Who |
|---|---|---:|---|
| 0 | Brief 00 prerequisites (venv, DB URL, rotations) | — | Founder |
| 1 | Brief 01: Profiler live on **one** candidate; record actual tokens/time | ~$2 | Agent |
| 2 | Brief 02: Record + Fact-Checker on the same candidate | ~$3 | Agent |
| 3 | **Decide.** Extrapolate measured numbers ×57. Go / no-go on the full run | — | Founder |
| 4 | Add prompt caching to `LiveAnthropicBackend` | — | Agent |
| 5 | Brief 03: write `run_race.py`; run **FL-27** (2 candidates) end to end through Balance Audit + human gate | ~$10 | Agent |
| 6 | Review every claim in FL-27 by hand | — | Founder |
| 7 | Scale in batches, smallest races first; review each before the next | remainder | Both |

Steps 1–3 cost about **$5** and replace every estimate in §4 with a measured
number. That is the whole point of sequencing it this way.

---

## 10. What this does not cover

- **R1–R4 refresh agents.** Separate, cheap, and independent — they refresh news
  and contact data. Worth running, unrelated to publication.
- **Retiring the demo rows.** Already done 2026-09-10: all nine are `draft`.
  Their 29 profiles and 261 claims are untouched in the tables.
- **The Google Places key**, which gates address completion, not publication.
