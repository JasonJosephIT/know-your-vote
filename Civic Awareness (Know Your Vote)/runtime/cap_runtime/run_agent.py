"""S2 per-candidate entrypoint — one (agent, candidate, race) live session.

This is the smallest thing that runs a real S2 agent end to end against the
real S1, and the unit S3's `run_race` will call per candidate (Brief 01). It
folds the already-built pieces into one call:

    read plane (cap_readonly)  ->  spine issues, candidate name,
                                   (factchecker) claim inventory, log_counter
    S1StdioClient (ADR-R1)     ->  spawn one S1 for this identity, expose .tools
    LiveAnthropicBackend       ->  the Anthropic tool-use loop over those tools
    SessionRunner              ->  budget rails, transcript, action_log crosscheck

`run_session` takes the read plane, the S1-client factory, and the backend
factory as injected seams, so the wiring is unit-tested with fakes (no DB, no
`mcp`, no Anthropic spend). `main` supplies the real seams. A live run is
founder-gated (Brief 00): an arm64 Python 3.12 venv with `mcp`+`psycopg`+
`anthropic`, `CAP_READONLY_DB_URL` + `SUPABASE_DB_URL` + `ANTHROPIC_API_KEY`,
and the demo seed loaded. Until then this module imports clean and fails
closed — it never pretends a run happened.

Run (inside the founder venv, from `runtime/`):
    python -m cap_runtime.run_agent --agent profiler \
        --candidate <demo cand> --race <demo race>
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any, Callable, ContextManager, Mapping

from . import agents, session
from .agents import AgentConfig
from .orchestration import ReadPlane

# runtime/cap_runtime/run_agent.py -> the toollayer dir is a sibling of runtime/
# under the project root, and is the cwd the S1 subprocess needs so that
# `cap_toollayer.server` imports (the spawn spec deliberately carries no cwd).
TOOLLAYER_DIR = Path(__file__).resolve().parents[2] / "toollayer"


# A factory takes the S1 spawn spec and returns a context manager yielding an
# object with `.tools` (Anthropic schema) and `.dispatch(tool, payload)`.
S1Factory = Callable[[Mapping[str, Any]], ContextManager[Any]]
# A factory takes (model, tools, config) and returns an AgentBackend.
BackendFactory = Callable[[str, list, AgentConfig], "session.AgentBackend"]


def _real_s1_factory(spec: Mapping[str, Any]):
    # Imported here so importing this module never needs `mcp` (the client
    # lazy-imports it only inside connect()); this keeps the module import-clean
    # on the alpha box, same as the rest of the runtime.
    from .mcp_client import S1StdioClient
    return S1StdioClient.from_spawn_spec(spec, cwd=str(TOOLLAYER_DIR))


def _real_backend_factory(model: str, tools: list, config: AgentConfig):
    # max_tokens is the S2-R4 token rail; tool-call and wall-clock rails are
    # enforced by the SessionRunner's BudgetGuard.
    return session.LiveAnthropicBackend(
        model=model, tools=tools, max_tokens=config.max_tokens)


def run_session(
    config: AgentConfig,
    *,
    candidate_id: str,
    race_id: str,
    read_plane: ReadPlane,
    s1_factory: S1Factory,
    backend_factory: BackendFactory,
    runs_dir: str | Path = "runs",
    env: Mapping[str, str] | None = None,
    model: str | None = None,
) -> session.SessionResult:
    """Run one agent against the real S1 for one candidate. Deterministic
    plumbing: every orchestration read is cap_readonly, the agent's only DB
    path is its own S1 tool surface, and the action_log — not the model's
    self-report — is the source of truth for what was written (S2-R3)."""
    env = os.environ if env is None else env

    spine_issues = read_plane.spine_issues(race_id)
    name = read_plane.candidate_name(candidate_id)
    if name is None:
        raise LookupError(
            f"candidate {candidate_id!r} not found in the read plane — load the "
            "demo seed (Brief 00) or check the id/race.")
    claim_inventory = None
    if config.needs_claim_inventory:   # Fact-Checker only (S2-R1)
        claim_inventory = read_plane.claim_inventory(race_id, candidate_id)

    spec = session.s1_spawn_spec(config.agent_id, env)
    runner = session.SessionRunner(runs_dir=runs_dir)

    def log_counter() -> int:
        return read_plane.claim_write_count(config.agent_id, candidate_id)

    with s1_factory(spec) as s1:
        backend = backend_factory(model or config.model, s1.tools, config)
        return runner.run(
            config,
            candidate_id=candidate_id, race_id=race_id, name=name,
            spine_issues=spine_issues, dispatch=s1.dispatch,
            log_counter=log_counter, claim_inventory=claim_inventory,
            backend=backend,
        )


def _print_result(res: session.SessionResult) -> None:
    print(f"agent      : {res.agent_id}")
    print(f"candidate  : {res.candidate_id}")
    print(f"race       : {res.race_id}")
    print(f"status     : {res.status}")
    print(f"claims     : {res.claims_written}  (from action_log — the truth)")
    print(f"tool_calls : {res.tool_calls}")
    print(f"transcript : {res.transcript_path}")
    if res.incomplete_reason:
        print(f"incomplete : {res.incomplete_reason}")
    if res.self_report:
        print("-- self-report (informational; the log is authoritative) --")
        print(res.self_report)


def _resolve_model(config: AgentConfig, model_override: str | None,
                   escalate: bool) -> str | None:
    """S2-R2: default is the config model; `--model` overrides explicitly;
    `--escalate` picks the config's escalation model (Fact-Checker only)."""
    if escalate:
        if not config.escalation_model:
            raise ValueError(
                f"agent {config.agent_id!r} has no escalation model — S2-R2 "
                "escalation is the Fact-Checker only.")
        return config.escalation_model
    return model_override


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m cap_runtime.run_agent",
        description="Run one S2 agent against the real S1 for one candidate "
                    "(the per-candidate unit S3 orchestrates).")
    parser.add_argument("--agent", required=True, choices=sorted(agents.CONFIGS),
                        help="which S2 identity to run (ADR-R1: one per S1 process)")
    parser.add_argument("--candidate", required=True, help="candidate_id (demo seed)")
    parser.add_argument("--race", required=True, help="race_id (demo seed)")
    parser.add_argument("--runs-dir", default="runs",
                        help="where transcripts are persisted (default: ./runs)")
    parser.add_argument("--model", default=None,
                        help="override the config model (default: the agent's)")
    parser.add_argument("--escalate", action="store_true",
                        help="use the agent's escalation model "
                             "(Fact-Checker: opus-4-8) — S2-R2")
    ns = parser.parse_args(argv)

    config = agents.get_config(ns.agent)
    try:
        model = _resolve_model(config, ns.model, ns.escalate)
    except ValueError as exc:
        parser.error(str(exc))

    # from_env fails closed (NotConfigured) if cap_readonly isn't wired — before
    # any S1 spawn or Anthropic spend.
    read_plane = ReadPlane.from_env(os.environ)
    try:
        res = run_session(
            config, candidate_id=ns.candidate, race_id=ns.race,
            read_plane=read_plane, s1_factory=_real_s1_factory,
            backend_factory=_real_backend_factory, runs_dir=ns.runs_dir,
            model=model,
        )
    finally:
        read_plane.close()

    _print_result(res)
    # Exit non-zero on anything but a clean completion so a caller (and S3) can
    # branch on the process result without parsing stdout.
    return 0 if res.status == "complete" else 1


if __name__ == "__main__":
    raise SystemExit(main())
