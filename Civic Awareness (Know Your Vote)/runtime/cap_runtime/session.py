"""S2 session runner — one session = one (agent, candidate, race) (S2-R1).

The runner is deterministic plumbing around a non-deterministic agent loop:
it renders the verbatim prompt, spawns an S1 tool-layer process bound to the
agent identity (ADR-R1), drives the agent through an injectable backend,
enforces the S2-R4 budget rails, persists the transcript under
`runs/<race>/<candidate>/<agent>/`, and cross-checks the agent's self-report
against the action_log — the log is the truth (S2-R3).

The LLM/MCP integration lives behind `AgentBackend`. `ScriptedBackend` drives
the runner deterministically in tests (no API calls, no spend);
`LiveAnthropicBackend` is the real loop and is gated: it needs an
ANTHROPIC_API_KEY, the `anthropic` + `mcp` packages, and a stable Python
>=3.11 — so it fails loudly rather than ship unverified (S2 founder gate).
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Mapping, Protocol

from .agents import AgentConfig


class NotConfigured(RuntimeError):
    """A required runtime dependency (API key / SDK / Python) is absent."""


class BudgetExceeded(RuntimeError):
    def __init__(self, rail: str):
        super().__init__(f"budget rail tripped: {rail}")
        self.rail = rail


# -- S1 spawn spec (ADR-R1: identity fixed at process spawn) ---------------

def s1_spawn_spec(agent_id: str, env: Mapping[str, str]) -> dict[str, Any]:
    """Command + environment to launch the S1 tool-layer for one identity.
    The agent connects to this over MCP stdio; nothing here trusts a
    per-call identity. Secrets flow via the child's ENV only (S1-R4)."""
    child_env = {
        "CAP_AGENT_ID": agent_id,
        "CAP_LOG_SINK": env.get("CAP_LOG_SINK", "postgres"),
    }
    for k in ("SUPABASE_DB_URL", "FEC_API_KEY", "CAP_DISPATCH_TOKEN",
              "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_OWNER_PHONE"):
        if env.get(k):
            child_env[k] = env[k]
    return {
        "command": [sys.executable, "-m", "cap_toollayer.server"],
        "env": child_env,
    }


# -- S2-R4 budget rails ----------------------------------------------------

class BudgetGuard:
    def __init__(self, *, max_tool_calls: int, max_wall_clock_s: float,
                 clock: Callable[[], float] = time.monotonic):
        self.max_tool_calls = max_tool_calls
        self.max_wall_clock_s = max_wall_clock_s
        self._clock = clock
        self._start = clock()
        self.tool_calls = 0

    def before_tool_call(self) -> None:
        """Called before each tool dispatch; raises when a cap is reached so
        the run stops and is marked incomplete — never silently truncated."""
        if self._clock() - self._start > self.max_wall_clock_s:
            raise BudgetExceeded("max_wall_clock_s")
        if self.tool_calls >= self.max_tool_calls:
            raise BudgetExceeded("max_tool_calls")
        self.tool_calls += 1


# -- agent backend interface ----------------------------------------------

Dispatch = Callable[[str, Mapping[str, Any]], dict]


@dataclass
class BackendResult:
    final_report: str | None
    halted: bool = False


class AgentBackend(Protocol):
    def run(self, *, system: str, kickoff: str, dispatch: Dispatch,
            transcript: list[dict]) -> BackendResult: ...


class ScriptedBackend:
    """Deterministic stand-in agent for tests. `script` is a list of steps:
      {"tool": name, "payload": {...}}   -> dispatch a tool call
      {"report": "text"}                 -> finish with a completion report
    """

    def __init__(self, script: list[dict]):
        self.script = script

    def run(self, *, system, kickoff, dispatch, transcript) -> BackendResult:
        transcript.append({"role": "system", "content": system})
        transcript.append({"role": "user", "content": kickoff})
        halted = False
        for step in self.script:
            if "report" in step:
                transcript.append({"role": "assistant", "content": step["report"]})
                return BackendResult(final_report=step["report"], halted=halted)
            payload = step.get("payload", {})
            result = dispatch(step["tool"], payload)
            transcript.append({"role": "tool", "tool": step["tool"],
                               "payload": payload, "result": result})
            if isinstance(result, dict) and result.get("error") == "pipeline_halted":
                halted = True
        return BackendResult(final_report=None, halted=halted)


def _usage_tokens(resp: Any) -> int:
    u = getattr(resp, "usage", None)
    if u is None:
        return 0
    return int(getattr(u, "input_tokens", 0) or 0) + int(getattr(u, "output_tokens", 0) or 0)


class LiveAnthropicBackend:
    """The real agent loop: the Anthropic Messages tool-use loop over the S1
    tool surface. The model is given `tools` + the system prompt; each
    `tool_use` block is executed via `dispatch` (which reaches S1) and fed
    back as a `tool_result`, until the model answers with no tool call — that
    final text is the completion report.

    `client` is INJECTABLE (default: a lazily-imported `anthropic.Anthropic`,
    which reads ANTHROPIC_API_KEY from the env), so this loop is unit-tested
    with a mock — no API spend, no `anthropic` install. `tools` are the
    Anthropic tool schemas for the caller's granted S1 tools; in production
    they come from the MCP client that also supplies `dispatch`. That MCP-
    stdio client + an actual live run still need `mcp` on a stable Python
    >=3.11 (see runtime/README.md) — this class does not depend on `mcp`.
    """

    def __init__(self, *, model: str, tools: list[dict], client: Any = None,
                 max_tokens: int | None = None, max_output_tokens: int = 4096,
                 max_turns: int = 50):
        self._model = model
        self._tools = tools
        self._client = client
        self._max_tokens = max_tokens
        self._max_output_tokens = max_output_tokens
        self._max_turns = max_turns

    def _client_or_default(self):
        if self._client is not None:
            return self._client
        try:
            import anthropic
        except ImportError as err:
            raise NotConfigured(
                "the `anthropic` package is not installed (needs a stable "
                "Python >=3.11): pip install anthropic") from err
        return anthropic.Anthropic()  # ANTHROPIC_API_KEY from env

    def run(self, *, system, kickoff, dispatch, transcript) -> BackendResult:
        client = self._client_or_default()
        transcript.append({"role": "system", "content": system})
        transcript.append({"role": "user", "content": kickoff})
        messages: list[dict] = [{"role": "user", "content": kickoff}]
        tokens = 0
        for _turn in range(self._max_turns):
            resp = client.messages.create(
                model=self._model, max_tokens=self._max_output_tokens,
                system=system, tools=self._tools, messages=messages)
            tokens += _usage_tokens(resp)
            if self._max_tokens and tokens > self._max_tokens:
                raise BudgetExceeded("max_tokens")
            blocks = list(resp.content)
            tool_uses = [b for b in blocks if getattr(b, "type", None) == "tool_use"]
            text = "".join(getattr(b, "text", "") or "" for b in blocks
                           if getattr(b, "type", None) == "text")
            transcript.append({"role": "assistant", "content": text,
                               "tool_uses": [b.name for b in tool_uses]})
            if not tool_uses:  # no tool call -> the final text is the report
                return BackendResult(final_report=text, halted=False)
            messages.append({"role": "assistant", "content": blocks})
            results, halted = [], False
            for tu in tool_uses:
                out = dispatch(tu.name, dict(tu.input))
                results.append({"type": "tool_result", "tool_use_id": tu.id,
                                "content": json.dumps(out, default=str)})
                transcript.append({"role": "tool", "tool": tu.name,
                                   "payload": dict(tu.input), "result": out})
                if isinstance(out, dict) and out.get("error") == "pipeline_halted":
                    halted = True
            if halted:
                return BackendResult(final_report=None, halted=True)
            messages.append({"role": "user", "content": results})
        return BackendResult(final_report=None, halted=False)  # hit max_turns


# -- session result + runner ----------------------------------------------

@dataclass
class SessionResult:
    agent_id: str
    candidate_id: str
    race_id: str
    status: str                 # 'complete' | 'incomplete' | 'halted'
    claims_written: int         # from action_log — the truth, not the self-report
    tool_calls: int
    transcript_path: Path
    self_report: str | None = None
    incomplete_reason: str | None = None


class SessionRunner:
    def __init__(self, *, runs_dir: str | Path = "runs",
                 clock: Callable[[], float] = time.monotonic):
        self.runs_dir = Path(runs_dir)
        self._clock = clock

    def run(
        self,
        config: AgentConfig,
        *,
        candidate_id: str,
        race_id: str,
        name: str,
        spine_issues: list[dict],
        dispatch: Dispatch,
        log_counter: Callable[[], int],
        backend: AgentBackend,
    ) -> SessionResult:
        system = config.render_system(candidate_id=candidate_id, race_id=race_id, name=name)
        kickoff = config.kickoff(candidate_id=candidate_id, race_id=race_id,
                                 spine_issues=spine_issues)
        budget = BudgetGuard(max_tool_calls=config.max_tool_calls,
                             max_wall_clock_s=config.max_wall_clock_s,
                             clock=self._clock)

        def guarded(tool: str, payload: Mapping[str, Any] | None = None) -> dict:
            budget.before_tool_call()
            return dispatch(tool, payload or {})

        transcript: list[dict] = []
        status, incomplete_reason, self_report, halted = "complete", None, None, False
        try:
            result = backend.run(system=system, kickoff=kickoff,
                                  dispatch=guarded, transcript=transcript)
            self_report, halted = result.final_report, result.halted
            if halted:
                status = "halted"
            elif self_report is None:
                status, incomplete_reason = "incomplete", "agent ended without a completion report"
        except BudgetExceeded as exc:
            status, incomplete_reason = "incomplete", str(exc)
        except NotConfigured:
            raise  # the live backend is honestly unavailable; surface it

        path = self._persist(race_id, candidate_id, config.agent_id, transcript,
                             status, incomplete_reason)
        # S2-R3: the log is the source of truth for what was written.
        claims_written = log_counter()
        return SessionResult(
            agent_id=config.agent_id, candidate_id=candidate_id, race_id=race_id,
            status=status, claims_written=claims_written, tool_calls=budget.tool_calls,
            transcript_path=path, self_report=self_report,
            incomplete_reason=incomplete_reason)

    def _persist(self, race_id, candidate_id, agent_id, transcript,
                 status, incomplete_reason) -> Path:
        d = self.runs_dir / race_id / candidate_id / agent_id
        d.mkdir(parents=True, exist_ok=True)
        path = d / "transcript.json"
        path.write_text(json.dumps(
            {"agent_id": agent_id, "candidate_id": candidate_id, "race_id": race_id,
             "status": status, "incomplete_reason": incomplete_reason,
             "events": transcript}, indent=2, default=str), encoding="utf-8")
        return path
