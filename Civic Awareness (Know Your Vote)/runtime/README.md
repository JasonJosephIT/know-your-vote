# S2 — Agent runtime (foundation)

Three Claude agent sessions (profiler / record / factchecker) that connect to
the S1 tool layer over MCP-stdio and produce Sources/Claims/Positions per
their Agent-Plan contracts (`CAP_Runtime_PRD_v1` §6).

**One session = one (agent, candidate, race)** (S2-R1). The runner is
deterministic plumbing; the non-deterministic agent loop lives behind an
injectable backend so the runner is testable without API spend.

## What exists (S2-01, foundation)

| File | Purpose |
|---|---|
| `cap_runtime/agents.py` | `AgentConfig` + the **Profiler** config: model (`claude-sonnet-5`), the CAP_Agent_Plan §2 system prompt **verbatim**, and render/kickoff (`{{candidate_id}}`/`{{race_id}}`/`{{name}}` + spine-issue substitution). Record/Fact-Checker land with S2-02/S2-03. |
| `cap_runtime/session.py` | `SessionRunner` (renders prompt → drives an `AgentBackend` → S2-R4 budget rails → persists transcript under `runs/<race>/<candidate>/<agent>/` → cross-checks completion against `action_log`, the truth). `s1_spawn_spec` binds identity at spawn (ADR-R1) and forwards only present secrets via env. `ScriptedBackend` drives the runner deterministically in tests; `LiveAnthropicBackend` is the real loop, **gated**. |
| `test_runtime.py` | 12 stdlib tests: prompt render, spawn spec, budget trips (tool-call + wall-clock), and a full scripted Profiler session across complete / incomplete / halted / no-report paths, plus the gated live backend failing closed. |

## Run

```
python3 test_runtime.py
```

## Live-verified · what's left

The agent loop (`LiveAnthropicBackend`) is a real Anthropic Messages tool-use
loop and was **run against `claude-sonnet-5` on 2026-07-10** with a *stubbed*
S1 (fake `dispatch`): Claude drove `fetch_source` → `source_register` →
`claim_write`×2 and produced 2 attributed `stated_position` claims organized
by spine issue. The loop is decoupled from S1 via `dispatch`, so this needed
no `mcp`/DB.

The **full acceptance** (*Profiler completes one demo-seed candidate against
the real S1*) still needs, all on **a stable Python ≥3.11 final** (this repo's
`3.11.0a3` breaks `psycopg`, system `3.9.6` is too old for `mcp`):

- an **MCP-stdio client** that spawns S1 (`s1_spawn_spec`), exposes its tool
  schemas to the loop, and routes `dispatch` to it — needs `mcp`;
- `scripts/demo-seed*.sql` loaded into the live DB so a candidate exists;
- `anthropic` (installed 0.116.0) + `ANTHROPIC_API_KEY` (in `.env.local`).

Without a client the loop still runs against any injected `dispatch`; without
`anthropic` it fails closed naming what's missing.

## Next (build order: Profiler → Record → Fact-Checker)

- **S2-01** wire `LiveAnthropicBackend` (Anthropic Messages API + S1 MCP-stdio) once the gate/env is in place; run the demo-seed Profiler acceptance.
- **S2-02** Record config · **S2-03** Fact-Checker config (cross-bucket read, H1–H3 halts).
