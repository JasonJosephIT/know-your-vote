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
| `cap_runtime/mcp_client.py` | `S1StdioClient` — the MCP-stdio adapter (S2-01). One instance = one S1 subprocess = one identity (ADR-R1): it spawns `cap_toollayer.server`, runs `initialize`→`tools/list`, exposes the tools as Anthropic schema in `.tools`, and routes the loop's synchronous `dispatch(tool, payload)` to `tools/call` over a background-thread event loop. Pure helpers `to_anthropic_tools`/`unwrap_tool_result` carry coverage; missing `mcp` → `NotConfigured`, malformed/`isError` result → structured error (no secrets). The real `mcp` code path reaches the wire only through the default factory and is exercised **only at the parked live run** — everything else is covered via an injected async-session seam. |
| `test_runtime.py` | 38 stdlib tests: prompt render, spawn spec, budget trips (tool-call + wall-clock), a full scripted Profiler session across complete / incomplete / halted / no-report paths, the gated live backend failing closed, and the S2-01 MCP client (tool translation, dispatch, halt passthrough, structured-error unwrapping with no secret leak, subprocess teardown, `mcp`-absent gate, and a drop-in end-to-end runner). |

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

The **MCP-stdio client** now exists (`cap_runtime/mcp_client.py`, S2-01): it
spawns S1 (`s1_spawn_spec` + the toollayer cwd), exposes its tool schemas to the
loop, and routes `dispatch` to it. Its unit coverage runs on this repo's
`3.11.0a3` through an injected async-session seam, so the client is tested
without `mcp`; the real `mcp` wire path is **best-effort-correct and exercised
only at the live run below** (it needs `mcp`, which needs a stable Python).

The **full acceptance** (*Profiler completes one demo-seed candidate against
the real S1*) is **parked / founder-gated** and still needs, all on **a stable
Python ≥3.11 final** (this repo's `3.11.0a3` breaks `psycopg`, system `3.9.6` is
too old for `mcp`):

- `mcp` + `psycopg` installed so `S1StdioClient` can open the real stdio session
  against a live-DB S1;
- `scripts/demo-seed*.sql` loaded into the live DB so a candidate exists;
- `anthropic` (installed 0.116.0) + `ANTHROPIC_API_KEY` (in `.env.local`).

Without `mcp` the client fails closed with `NotConfigured`; the loop still runs
against any injected `dispatch`, and without `anthropic` `LiveAnthropicBackend`
fails closed naming what's missing.

## Next (build order: Profiler → Record → Fact-Checker)

- **S2-01** the MCP-stdio client (`mcp_client.py`) + `LiveAnthropicBackend` are built and unit-verified; the demo-seed Profiler live acceptance against the real S1 remains **parked / founder-gated** (needs `mcp` on a stable Python + live DB + Anthropic spend).
- **S2-02** Record config · **S2-03** Fact-Checker config (cross-bucket read, H1–H3 halts).
