# Brief 01 — S2-01 live acceptance: Profiler end-to-end vs the real S1

**Prereq:** [Brief 00](00-founder-prerequisites.md) (arm64 venv, DB password,
demo-seed loaded). **Owner:** agent.

**Reads:** `../README.md`, `../cap_runtime/{mcp_client.py,session.py,agents.py}`,
`../../CAP_Runtime_PRD_v1.md` §6 S2-01, `../../CAP_Agent_Plan_v1.md` §2.

## Goal
Run the **real** Profiler against a demo-seed candidate through the actual S1
tool layer (a spawned S1 subprocess over MCP stdio, not a stub) and pass the
S2-01 Verify.

## What's already built (do not rebuild)
- `S1StdioClient` (`mcp_client.py`) — spawns one S1 subprocess for one identity
  (ADR-R1), runs `initialize` → `tools/list`, exposes `.tools` (already in
  Anthropic schema, identity-narrowed by `schemas.for_agent`) and a synchronous
  `.dispatch(tool, payload)` that routes to `tools/call`. It's a context manager.
- `LiveAnthropicBackend` (`session.py`) — the Anthropic tool-use loop; takes a
  `tools` list + a `dispatch`.
- `SessionRunner` — renders the verbatim prompt, enforces the S2-R4 budget rails,
  persists the transcript, cross-checks completion against `action_log`.
- `agents.PROFILER` — the config (verbatim Agent-Plan §2 prompt, `claude-sonnet-5`).

## The task: wire them into one end-to-end run
Roughly:

```python
from cap_runtime import agents, session
from cap_runtime.mcp_client import S1StdioClient

cfg = agents.PROFILER
with S1StdioClient(agent_id="profiler", env=os.environ) as s1:   # spawns S1
    backend = session.LiveAnthropicBackend(model=cfg.model, tools=s1.tools)
    runner = session.SessionRunner(runs_dir="runs")
    res = runner.run(
        cfg, candidate_id=<demo cand>, race_id=<demo race>, name=<legal name>,
        spine_issues=<the race's spine issues, read via db_read/T8>,
        dispatch=s1.dispatch,
        log_counter=<count successful profiler claim_writes in action_log>,
        backend=backend,
    )
```
Fold this into a small runner entrypoint (this is the start of what S3 will call
per candidate). `log_counter` should query `action_log` as `cap_readonly`.

## Done when (PRD S2-01 Verify)
- The Profiler completes one demo-seed candidate;
- every claim it wrote (in `claim` / `action_log`) is `stated_position` with a
  `candidate_self` source;
- a spine issue the candidate is silent on is recorded as a Position with
  `coverage='no_stated_position_found'` — **not invented**;
- mark S2-01 `[x]` in the PRD with the evidence.

## Watch-outs
- Real Anthropic spend + real DB writes — use the budget rails; start with one
  candidate.
- The S1 subprocess must inherit the venv (`s1_spawn_spec` uses `sys.executable`
  — run the runner *inside* `.venv`).
- Allowlist A needs the candidate's `official_site` / verified social handles in
  the DB; if the demo seed has none, the Profiler's fetches will (correctly)
  be blocked — seed at least one candidate-controlled source, or expect a
  legitimately empty self-portrait.
- If a tool call is rejected, read the `action_log` row — the guard reason is
  there. (The per-identity tool schema already stops the model guessing enums.)
