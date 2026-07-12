# Brief 03 — S3: the orchestrator (final phase)

**Prereq:** [Brief 02](02-s2-02-03-record-factchecker-live.md) (all three agents
run live). **Owner:** agent (+ founder picks the first real race).

**Reads:** `../../CAP_Runtime_PRD_v1.md` §7, `../../CAP_Agent_Plan_v1.md` §5,
and — critically — `../../Agents/Orchestrator : Synthesis Layer/orchestrator_core.py`
(the state machine is **already built + tested**; go through `cap_toollayer.cores`,
never hand-build that path, and never reimplement the core).

## Goal
`orchestrator/run_race.py` — **deterministic Python, no model calls, no prompt**
(the runbook is a program, not an agent). It performs I/O and calls
`orchestrator_core` in runbook order:

```
new_race_state → log_spine_issues → start_agents
  → (per candidate, sequentially: profiler + record, then factchecker  [Brief 01/02])
  → agent_finished per session
  → balance_audit (T10)
  → apply_audit_result
  → on PASS: mark_composed → record_human_review → check_dispatch → mark_dispatched
```
Any transition the core blocks is final — the CLI never "retries around" the core.

## Tasks (in order)
- **S3-01 happy path** — demo-seed race end to end; PASS path through the human
  gate to (token-minted) dispatch readiness. *Verify:* the demo-seed race runs
  end to end; declining at the human gate leaves the race unpublished and
  dispatch impossible.
- **S3-02 HALT + block-rate** — the `apply_audit_result` HALT branch, a
  remediation report, `guard_triggered` accounting. *Verify:* a synthetic
  imbalanced race halts; the Logging-Schema §4 queries — (a) scrutiny,
  (b) block rate, (c) traceability — run clean against the accumulated log.
- **S3-03 first real race** — one real target race (**founder picks**) end to end
  on live data; publication decision recorded; scrutiny/balance numbers reviewed
  vs the KPI targets. This is the acceptance test for the whole PRD.
- **S3-04 docs + status sweep** — READMEs, Master Guide §11 build status, mark the
  PRD checkboxes + status line. *Verify:* a fresh session can run a race from the
  README alone.

## Non-negotiable invariants (from PRD S3-R1…R5)
- **No AI in the orchestrator.** It's control flow over the core; inventing a
  "system prompt" for it would be wrong.
- **The human gate is a person.** `record_human_review` is reachable only from
  `audited_pass`; approval is an interactive confirmation **naming the reviewer**,
  after the composed brief + audit numbers are shown. **There is no `--yes` flag.**
  On approval it mints the single-use token that T12 (`CAP_DISPATCH_TOKEN`)
  requires.
- **HALT is a full stop with a report**, exit non-zero. Re-running after
  remediation is a *new* run, not a resume past the gate.
- **Dispatch is unreachable while the latest audit is HALT** (core invariant I2,
  re-checked at T12).
- **Crash honesty (S3-R5).** A crashed run leaves recoverable state; restart
  detects it and requires an explicit `--abandon` before starting fresh. (If this
  graduates to the cloud, move that state into Postgres — see the cloud note in
  `../README.md`'s parent discussion.)
- **Ops-plane dual-write (S3-R4, nice-to-have):** where migration 0006 is live,
  write an `agent_run` row per run so the admin console sees it; failure to write
  ops rows never fails a run.

## Done when
One command runs one race end to end with every invariant enforced, every action
logged, and a HALT provably blocking composition + dispatch — the PRD §2
definition of done. Ship S2+S3 as one PR (per the PRD's progress-tracking note).
