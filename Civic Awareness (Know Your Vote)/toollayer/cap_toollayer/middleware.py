"""Dispatch middleware — the order of operations every tool call goes through.

    1. log_action?            -> denied always (T11 is wrapper-internal)
    2. check_tool_access      -> denied_tool
    3. halted state?          -> pipeline_halted (write tools frozen)
    4. tool handler           -> guard-checked side effects (S1-04+)
    5. write the log row      -> BEFORE returning; a failed write fails the call

A guard result with halt=True flips this process into the halted state:
every subsequent write-tool call is refused until the orchestrator starts
a fresh run (halt is a state, not an exception — S1-R3).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Mapping, Optional

from . import errors

# Tool Spec §1 — the twelve tools.
ALL_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "fec_api_query", "fl_legislature_query",
    "jurisdiction_resolve", "web_search", "fetch_source", "source_register",
    "db_read", "claim_write", "balance_audit", "log_action", "sms_dispatch",
})

# Tools with side effects — frozen while halted. Reads stay available so the
# orchestrator can inspect the wreckage.
WRITE_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "source_register", "claim_write",
    "balance_audit", "sms_dispatch",
})

Handler = Callable[[Mapping[str, Any]], dict[str, Any]]


class ToolLayer:
    """One instance per S1 process; identity fixed at construction (ADR-R1)."""

    def __init__(self, agent_id: str, guard, sink):
        self.agent_id = agent_id
        self.guard = guard
        self.sink = sink
        self.halted = False
        self.handlers: dict[str, Handler] = {}

    # -- logging ---------------------------------------------------------

    def _log(
        self,
        tool: str,
        *,
        status: str,
        failure_reason: str | None = None,
        guard_triggered: bool = False,
        guard_type: str | None = None,
        payload: Mapping[str, Any] | None = None,
        bucket_written: str | None = None,
        source_id: str | None = None,
        claim_id: str | None = None,
    ) -> None:
        """Write the action_log row. Raises LogWriteError on failure —
        callers must let that propagate so the tool call fails (S1-R2)."""
        payload = payload or {}
        reason = failure_reason
        if guard_type and reason:
            reason = f"[{guard_type}] {reason}"   # DDL has no guard_type column
        self.sink.write({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_id": self.agent_id,
            "tool_called": tool,
            "race_id": payload.get("race_id"),
            "candidate_id": payload.get("candidate_id"),
            "source_url": payload.get("url") or payload.get("source_url"),
            "source_id": source_id,
            "bucket_written": bucket_written,
            "claim_id": claim_id,
            "status": status,
            "failure_reason": reason,
            "guard_triggered": guard_triggered,
        })

    def _refuse(
        self,
        tool: str,
        code: str,
        reasons: list[str],
        *,
        guard_type: str | None = None,
        payload: Mapping[str, Any] | None = None,
    ) -> dict[str, Any]:
        self._log(
            tool,
            status="fail",
            failure_reason="; ".join(reasons) or code,
            guard_triggered=True,
            guard_type=guard_type,
            payload=payload,
        )
        return errors.error_payload(code, reasons)

    # -- dispatch --------------------------------------------------------

    def dispatch(self, tool: str, payload: Mapping[str, Any] | None = None) -> dict[str, Any]:
        payload = payload or {}

        # (1) T11 is invoked inside every wrapper, never by a caller —
        # exposing it would let an agent write fiction into the audit trail.
        if tool == "log_action":
            return self._refuse(
                tool, errors.DENIED_TOOL,
                ["log_action (T11) is wrapper-internal and never callable"],
                guard_type="denied_tool", payload=payload,
            )

        # (2) identity-keyed grant check — the guard core decides.
        access = self.guard.check_tool_access(tool)
        if not access["ok"]:
            return self._refuse(
                tool, errors.DENIED_TOOL, access["reasons"],
                guard_type=access.get("guard_type"), payload=payload,
            )

        # (3) a halted pipeline freezes every write tool.
        if self.halted and tool in WRITE_TOOLS:
            return self._refuse(
                tool, errors.PIPELINE_HALTED,
                ["pipeline halted by a prior guard violation; "
                 "write tools are frozen for this run"],
                payload=payload,
            )

        # (4) the tool itself. Handlers arrive with S1-04+; until then a
        # granted call is answered honestly, and still logged.
        handler = self.handlers.get(tool)
        if handler is None:
            self._log(
                tool, status="fail",
                failure_reason="tool not implemented yet (S1 skeleton)",
                payload=payload,
            )
            return errors.error_payload(
                errors.NOT_IMPLEMENTED,
                [f"{tool} is not implemented yet (CAP_Runtime_PRD_v1 S1-04+)"],
            )

        outcome = handler(payload)

        # A handler reports a guard halt through its result (S1-R3).
        if outcome.get("halt"):
            self.halted = True

        # (5) success/failure row before the result leaves the process.
        self._log(
            tool,
            status="success" if outcome.get("ok") else "fail",
            failure_reason=None if outcome.get("ok")
            else "; ".join(outcome.get("reasons", [])) or "handler failure",
            guard_triggered=bool(outcome.get("halt"))
            or (not outcome.get("ok") and outcome.get("guard_type") is not None),
            guard_type=outcome.get("guard_type"),
            payload=payload,
            bucket_written=outcome.get("bucket_written"),
            source_id=outcome.get("source_id"),
            claim_id=outcome.get("claim_id"),
        )
        if outcome.get("ok"):
            return errors.ok_payload(outcome.get("result"))
        # error code precedence: explicit > guard discriminator > upstream
        code = outcome.get("error") or outcome.get("guard_type")
        if code not in errors.ALL_CODES:
            code = errors.UPSTREAM_FAILED
        return errors.error_payload(code, outcome.get("reasons", []))
