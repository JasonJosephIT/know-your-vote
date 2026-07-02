# Orchestrator / Synthesis Layer (deterministic — NO system prompt)

Build package for the orchestrator. Canonical specs live in the project
root (`CAP_PRD_v1.md`, `CAP_MCP_Tool_Spec_v1.md`, `CAP_Schema_v1.md`,
`CAP_Agent_Plan_v1.md`) — this folder holds only the orchestrator-specific
implementation and tests. Where anything here disagrees with those
documents, the documents govern.

## What the orchestrator is

A **deterministic controller with no model calls** (PRD §6.3, §9). It has
**no LLM system prompt by design** — the Agent Plan §5 blueprint is a
runbook, not a prompt, and this folder deliberately contains no
`*_system_prompt.txt`. It sequences the pipeline: spine logging → agents
in parallel → balance audit → composition → human review gate → dispatch.
It composes and dispatches; it never authors claims.

| Field | Value |
|---|---|
| Nature | Deterministic controller. No model calls. No prompt. |
| Authorized tools | `doe_file_intake` (T1), `jurisdiction_resolve` (T4), `db_read` (T8, all buckets), `balance_audit` (T10), `sms_dispatch` (T12, post human-gate) |
| Denied tools | `claim_write` (never writes claims), `web_search`, `fetch_source`, `fec_api_query`, `fl_legislature_query`, `source_register` |
| Responsibilities | Run the 3 agents in parallel per candidate; run the balance audit per race; enforce the human review gate; dispatch only on PASS + human approval |

**Hard invariants (blueprint), as enforced:**

| # | Blueprint invariant | Enforcement |
|---|---|---|
| I1 | Never calls `claim_write` | `check_tool_access` hard-denies it; every log row this core emits carries `bucket_written=None` |
| I2 | `sms_dispatch` unreachable while the race's latest `balance_audit` is HALT | Enforced twice: `approved` is only reachable through `audited_pass`, AND `check_dispatch` independently re-checks the latest audit verdict — a forged state/approval is still blocked |
| I3 | Every halt countable via `log_action.guard_triggered` (Audit Block Rate KPI) | The HALT branch of `apply_audit_result` emits `guard_triggered=True` with the breached gate metric and low/high candidates; every blocked transition also emits `guard_triggered=True` |

**Sequencing enforced (blueprint control flow):** spine issue set logged
before agents start (steps 1–2); audit only after all 3 × N agents finish
(step 3); composition only on PASS, flags surfaced to the reviewer but
never blocking (step 4); human review only on a composed race (step 5);
dispatch only on approval + PASS + owner phone (step 6).

## Files

| File | Purpose |
|---|---|
| `orchestrator_core.py` | Deterministic core — tool grants (`denied_tool`), all-bucket `db_read`, the per-race state machine (`created → spine_logged → agents_running → agents_done → audited_pass/halt → composed → approved → dispatched`), Profile write-back mapping (`profile_updates_from_audit`), the SMS composer (160-char cap), and the dispatch gate. |
| `test_orchestrator_core.py` | 40 tests: grants/denials, spine-before-agents, agent tracking, PASS/HALT branches, flags-never-halt, flag-reason precedence, re-audit paths, composition gates, human gate, dispatch gate incl. forged-state attack, purity. |

Run tests (stdlib only, no dependencies):

```
python3 -m unittest -v test_orchestrator_core.py
```

## Design decisions (recorded, beyond-spec or spec-ambiguous)

- **`fec_api_query` is denied to the orchestrator** even though blueprint
  step 1 mentions it in intake. The blueprint's authorized-tools list and
  Tool Spec §2 both exclude T2 for the orchestrator; the intake-layer
  fetch (PRD §6.1) runs outside the orchestrator identity, and the
  orchestrator consumes the resulting Race/Candidate objects via
  `db_read`. Denied lists govern over prose.
- **Spine logging (`tool_called='spine_select'`)** is not a T1–T12 name.
  Schema §6.2 requires the spine selection be logged to `action_log`
  (who/what/why); the DDL has no enum CHECK on `tool_called`, so a
  dedicated pseudo-tool name keeps the issue-selection lever separately
  queryable. "Neutrally worded" is editorial and not machine-checkable;
  what IS checked: spine tier, race-wide (`candidate_id IS NULL`),
  non-empty label, non-empty source/justification.
- **HALT log row: `status='success'`, `guard_triggered=True`,
  `guard_type=None`.** The audit tool itself ran successfully; what
  triggered is the pipeline guard, not a tool rejection. KPI query (b) in
  the Logging Schema counts `guard_triggered`, so halts stay countable
  without misreporting a tool failure.
- **`flag_reason` precedence:** Schema §7 stores a single reason but an
  audit can raise several. Order: `scrutiny_halt` >
  `stated_position_asymmetry` > `issue_coverage_asymmetry`. All raised
  flags remain available on the state (`flags`) and in the audit result
  surfaced to the reviewer — only the Profile field is collapsed.
- **Blocked transitions are classed `guard_type='denied_tool'`** (Schema
  §8 enum): the orchestrator's guards deny actions; they never involve
  buckets or allowlists.
- **Re-audit supersedes any pre-dispatch state.** A fresh audit result is
  acceptable from `agents_done`, `audited_halt` (remediation path),
  `audited_pass`, `composed`, and `approved`; it invalidates any prior
  composition and approval (the human reviewed content the new audit
  supersedes). Only `dispatched` is final.
- **A review rejection leaves the race in `composed`** — recompose or
  re-review; it does not un-audit the race.
- **Brief Composer (structured HTML, PRD §8, grouped by issue) is NOT in
  this core.** It is deterministic template work with its own spec
  surface; `mark_composed` takes the composed HTML as input and gates it.
  The 160-char SMS composer IS included (`compose_sms`) because its
  entire contract fits one function.
- **`approved` must be an explicit boolean** from the human reviewer —
  this core records the decision, it can never manufacture one.

## Integration notes for the wrapper

- The core is pure: no DB, no network, no clock. The wrapper persists the
  state dict between steps and must write each returned `log` row via
  `log_action` (T11) **before** proceeding — early-return rejections are
  not exempt (CAP_Schema_v1 §8).
- `apply_audit_result` takes the output of `balance_audit_core` (project
  root — the deterministic core already built) verbatim. The wrapper
  runs the audit via T10, feeds the result in, then persists the returned
  `profile_updates` (candidate_id → `balance_check_passed` /
  `flag_reason` / `flagged_at`) onto each Profile.
- Timestamps: `flagged_at` comes from the audit result (the audit core
  owns the injected clock); this core adds no time of its own.
- `check_dispatch` / `mark_dispatched` take `owner_phone` injected by the
  wrapper (config, not code). `mark_dispatched` should be called only
  after Twilio confirms the send.
- Parallelism is the wrapper's job: `start_agents` authorizes the fan-out
  and records the 3 × N completions to await; `agent_finished` is called
  once per (candidate, agent) as each lands.

## Status (2026-07-01)

- Deterministic controller built and tested (40/40 in this folder;
  188/188 project-wide including balance-audit and all three agent
  suites).
- All three blueprint hard invariants are structurally enforced,
  including against a forged state/approval (I2 defense in depth).
- Remaining before full production: the Brief Composer (PRD §8 HTML,
  grouped by issue) as its own deterministic build; wrapper wiring for
  T10/T12 I/O and Profile persistence; owner phone config.
