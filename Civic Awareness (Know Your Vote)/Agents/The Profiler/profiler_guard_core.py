"""
Civic Awareness Project (CAP) — Profiler (Agent 1) guards, deterministic core.

Reference implementation of the tool-wrapper guards for the Profiler, per
CAP_MCP_Tool_Spec_v1 §2 (per-agent authorization) and CAP_Agent_Plan_v1 §2.
These checks run INSIDE the tool wrappers, keyed on agent_id='profiler' —
they are the structural guarantee, not the prompt.

This module is INTENTIONALLY pure: no database, no network, no clock. The
wrapper owns all I/O and must write the returned `log` row via log_action
(T11) before returning to the agent — early-return rejections are not exempt
(CAP_Schema_v1 §8).

Guards implemented:
  1. check_tool_access   — the Profiler's tool grants. Anything not granted
                           -> guard_type='denied_tool'.
  2. check_db_read       — own-bucket read only (stated_position).
  3. validate_source_register — type='candidate_self' only.
  4. validate_claim_write — the load-bearing guard. bucket='stated_position'
                           ONLY; a wrong-bucket write is rejected AND halts
                           the pipeline (halt=True, guard_type='bucket').
                           Also enforces the Profiler output contract:
                           attributed=true, verification='single_source',
                           verdict null, issue_id set, >=1 cited source and
                           every cited source type='candidate_self'
                           ("no Source -> dropped", CAP_Schema_v1 §6.1).

guard_type uses the CAP_Schema_v1 §8 discriminator
('bucket' | 'allowlist' | 'denied_tool'). Typed-write violations on
source_register and contract violations on claim_write are classed 'bucket'
(the typed-write guard); URL-scope violations are 'allowlist' and live in
allowlist_a_core; tool grants are 'denied_tool'.

Only a wrong-bucket claim_write sets halt=True (PRD: "a wrong-bucket write is
rejected by the tool wrapper and halts the pipeline"). All other violations
reject the single call without halting the race pipeline.
"""

from __future__ import annotations

from typing import Any, Mapping

AGENT_ID = "profiler"

# Tool Spec §1 — the full tool list (unknown tool names are also denied).
ALL_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "fec_api_query", "fl_legislature_query",
    "jurisdiction_resolve", "web_search", "fetch_source", "source_register",
    "db_read", "claim_write", "balance_audit", "log_action", "sms_dispatch",
})

# Tool Spec §2, Profiler column. log_action is wrapper-internal, never
# agent-callable (Tool Spec §1 design note) — so it is NOT granted here.
GRANTED_TOOLS: frozenset[str] = frozenset({
    "web_search", "fetch_source", "source_register", "db_read", "claim_write",
})

OWN_BUCKET = "stated_position"
ALLOWED_SOURCE_TYPE = "candidate_self"
VALID_BUCKETS: frozenset[str] = frozenset({
    "verifiable_fact", "stated_position", "outside_opinion",
})


def _result(
    ok: bool,
    *,
    halt: bool = False,
    guard_type: str | None = None,
    reasons: list[str] | None = None,
    tool: str,
    bucket_written: str | None = None,
) -> dict[str, Any]:
    reasons = reasons or []
    return {
        "ok": ok,
        "halt": halt,
        "guard_type": guard_type,
        "reasons": reasons,
        "log": {
            "agent_id": AGENT_ID,
            "tool_called": tool,
            "bucket_written": bucket_written if ok else None,
            "status": "success" if ok else "fail",
            "failure_reason": "; ".join(reasons) or None,
            "guard_triggered": not ok,
            "guard_type": guard_type,
        },
    }


def check_tool_access(tool: str) -> dict[str, Any]:
    """Grant/deny a tool call for the Profiler (Tool Spec §2)."""
    if tool in GRANTED_TOOLS:
        return _result(True, tool=tool)
    reason = (
        f"tool '{tool}' denied for agent '{AGENT_ID}'"
        if tool in ALL_TOOLS
        else f"unknown tool '{tool}'"
    )
    return _result(False, guard_type="denied_tool", reasons=[reason], tool=tool)


def check_db_read(buckets: list[str]) -> dict[str, Any]:
    """Profiler db_read is own-bucket only (Tool Spec §2)."""
    outside = sorted(set(buckets) - {OWN_BUCKET})
    if not outside:
        return _result(True, tool="db_read")
    return _result(
        False, guard_type="bucket",
        reasons=[f"db_read outside own bucket: {outside}"],
        tool="db_read",
    )


def validate_source_register(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Profiler may register Sources with type='candidate_self' only."""
    src_type = payload.get("type")
    if src_type == ALLOWED_SOURCE_TYPE:
        return _result(True, tool="source_register")
    return _result(
        False, guard_type="bucket",
        reasons=[
            f"source type '{src_type}' forbidden for '{AGENT_ID}' "
            f"(only '{ALLOWED_SOURCE_TYPE}')"
        ],
        tool="source_register",
    )


def validate_claim_write(
    claim: Mapping[str, Any],
    source_types: Mapping[str, str],
) -> dict[str, Any]:
    """
    The load-bearing guard on claim_write (T9) for the Profiler.

    Args:
      claim: the Claim payload (CAP_Schema_v1 §6 shape, with source_ids).
      source_types: source_id -> Source.type for every REGISTERED source
        (the wrapper reads these; an id absent here does not exist).

    A wrong-bucket write -> ok=False, halt=True, guard_type='bucket'
    (rejected and halts the pipeline). Contract violations reject the call
    without halting.
    """
    bucket = claim.get("bucket")

    # Buckets are sacred — the halt condition.
    if bucket != OWN_BUCKET:
        detail = (
            f"wrong-bucket write: '{bucket}'"
            if bucket in VALID_BUCKETS
            else f"invalid bucket: '{bucket}'"
        )
        return _result(
            False, halt=True, guard_type="bucket",
            reasons=[f"{detail} — profiler writes '{OWN_BUCKET}' only"],
            tool="claim_write",
        )

    reasons: list[str] = []

    # No Source -> dropped.
    source_ids = claim.get("source_ids") or []
    if not source_ids:
        reasons.append("no source_ids cited — no Source, no claim")
    else:
        for sid in source_ids:
            stype = source_types.get(sid)
            if stype is None:
                reasons.append(f"source '{sid}' is not registered")
            elif stype != ALLOWED_SOURCE_TYPE:
                reasons.append(
                    f"source '{sid}' has type '{stype}' — "
                    f"profiler claims must cite '{ALLOWED_SOURCE_TYPE}' sources"
                )

    # Profiler output contract (Agent Plan §2 / CAP_Schema_v1 §6 rules).
    if claim.get("attributed") is not True:
        reasons.append("stated_position claims must be attributed=true")
    if claim.get("verification") != "single_source":
        reasons.append(
            "profiler verification must be 'single_source' "
            "(independent verification is Agent 3's job)"
        )
    if claim.get("verdict") is not None:
        reasons.append(
            "verdict must be null — the profiler never adjudicates truth"
        )
    if not claim.get("issue_id"):
        reasons.append("issue_id must be set (spine or candidate-tier issue)")
    if not (claim.get("text") or "").strip():
        reasons.append("claim text is empty")
    for field in ("claim_id", "candidate_id", "race_id"):
        if not claim.get(field):
            reasons.append(f"missing required field '{field}'")

    if reasons:
        return _result(
            False, guard_type="bucket", reasons=reasons, tool="claim_write"
        )
    return _result(True, tool="claim_write", bucket_written=OWN_BUCKET)
