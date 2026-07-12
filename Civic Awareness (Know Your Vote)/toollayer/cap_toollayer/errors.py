"""Structured error taxonomy for tool results (CAP_Runtime_PRD_v1 §5.3 S1-02).

Every failed tool call returns one of these codes so agents and the
orchestrator can branch deterministically. Secrets, connection strings,
and raw upstream errors never appear in the payload (S1-R4).
"""

from __future__ import annotations

from typing import Any

# guard layer (CAP_Schema_v1 §8 discriminators)
DENIED_TOOL = "denied_tool"      # tool not granted to this identity
ALLOWLIST = "allowlist"          # URL outside the caller's allowlist
BUCKET = "bucket"                # wrong-bucket / typed-write / contract violation

# runtime layer
PIPELINE_HALTED = "pipeline_halted"  # a prior halt froze all write tools
NOT_CONFIGURED = "not_configured"    # missing env/creds — degrade honestly
NOT_IMPLEMENTED = "not_implemented"  # tool not yet built (skeleton phase)
UPSTREAM_FAILED = "upstream_failed"  # external API/DB failure, sanitized

ALL_CODES: frozenset[str] = frozenset({
    DENIED_TOOL, ALLOWLIST, BUCKET,
    PIPELINE_HALTED, NOT_CONFIGURED, NOT_IMPLEMENTED, UPSTREAM_FAILED,
})


def error_payload(code: str, reasons: list[str]) -> dict[str, Any]:
    if code not in ALL_CODES:
        raise ValueError(f"unknown error code {code!r}")
    return {"ok": False, "error": code, "reasons": list(reasons)}


def ok_payload(result: Any = None) -> dict[str, Any]:
    return {"ok": True, "result": result}
