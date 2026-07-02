"""
Civic Awareness Project (CAP) — Record agent (Agent 2) guards, deterministic core.

Reference implementation of the tool-wrapper guards for the Record agent, per
CAP_MCP_Tool_Spec_v1 §2 (per-agent authorization) and CAP_Agent_Plan_v1 §3.
These checks run INSIDE the tool wrappers, keyed on agent_id='record' —
they are the structural guarantee, not the prompt.

This module is INTENTIONALLY pure: no database, no network, no clock. The
wrapper owns all I/O and must write the returned `log` row via log_action
(T11) before returning to the agent — early-return rejections are not exempt
(CAP_Schema_v1 §8).

Guards implemented:
  1. check_tool_access   — the Record agent's tool grants. web_search and
                           fetch_source are hard-denied at the wrapper
                           ("primary sources only" is a wall, not a
                           guideline — Tool Spec §2). Anything not granted
                           -> guard_type='denied_tool'.
  2. check_db_read       — own-bucket read only (verifiable_fact).
  3. validate_source_register — type='primary_doc' only.
  4. validate_claim_write — the load-bearing guard. bucket='verifiable_fact'
                           ONLY; a wrong-bucket write is rejected AND halts
                           the pipeline (halt=True, guard_type='bucket').
                           Also enforces the Record output contract:
                           attributed=false (this is the record, not
                           something the candidate said), verification=
                           'verified' (documented in a primary record, by
                           construction), verdict null (adjudication is the
                           Fact-Checker's job — CAP_Schema_v1 §6 verdict
                           rule), >=1 cited source and every cited source
                           type='primary_doc' ("no Source -> dropped",
                           CAP_Schema_v1 §6.1). issue_id is OPTIONAL —
                           "set where the action maps to an issue"
                           (Agent Plan §3); not every filing maps to one.
  5. Editorial-label halt — Agent Plan §3 halt condition: labeling a
                           stated-vs-did contrast as hypocrisy / flip-flop /
                           broken promise / contradiction. Checked
                           deterministically inside validate_claim_write;
                           a match is rejected AND halts (the facts may sit
                           side by side; the reader draws the conclusion).

guard_type uses the CAP_Schema_v1 §8 discriminator
('bucket' | 'allowlist' | 'denied_tool'). Typed-write violations on
source_register, contract violations, and editorial-label halts on
claim_write are classed 'bucket' (the §8 enum has no finer value; same
convention as the Profiler guards). Tool grants are 'denied_tool'. The
Record agent has no allowlist — its source scope is the hardcoded API set
(Tool Spec §2.5), so no 'allowlist' rows originate here.

halt=True is set in exactly two cases, both on claim_write: a wrong-bucket
write (PRD: "a wrong-bucket write is rejected by the tool wrapper and halts
the pipeline") and an editorial label in the claim text (Agent Plan §3 halt
condition). All other violations reject the single call without halting the
race pipeline.
"""

from __future__ import annotations

import re
from typing import Any, Mapping

AGENT_ID = "record"

# Tool Spec §1 — the full tool list (unknown tool names are also denied).
ALL_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "fec_api_query", "fl_legislature_query",
    "jurisdiction_resolve", "web_search", "fetch_source", "source_register",
    "db_read", "claim_write", "balance_audit", "log_action", "sms_dispatch",
})

# Tool Spec §2, Record column. log_action is wrapper-internal, never
# agent-callable (Tool Spec §1 design note) — so it is NOT granted here.
# web_search / fetch_source are absent by design: the agent cannot reach a
# news article or opinion site even if prompted to.
GRANTED_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "fec_api_query", "fl_legislature_query",
    "source_register", "db_read", "claim_write",
})

OWN_BUCKET = "verifiable_fact"
ALLOWED_SOURCE_TYPE = "primary_doc"
VALID_BUCKETS: frozenset[str] = frozenset({
    "verifiable_fact", "stated_position", "outside_opinion",
})

# Agent Plan §3 halt condition — editorial framing the Record agent may
# never apply to a stated-vs-did contrast. Word-boundary, case-insensitive,
# inflection-tolerant. Deliberately narrow: only the labels named in the
# blueprint (hypocrisy, flip-flop, broken promise, contradiction), so
# legitimate record language is never caught.
_EDITORIAL_LABEL_RE = re.compile(
    r"""\b(?:
        hypocris\w*            # hypocrisy, hypocrisies
      | hypocrit\w*            # hypocrite(s), hypocritical
      | flip[\s-]?flop\w*      # flip-flop(ped/per/ping), flip flop, flipflop
      | broken\s+promise\w*    # broken promise(s)
      | broke\s+(?:a|his|her|their)\s+promise\w*
      | contradict\w*          # contradiction(s), contradicts, contradictory
    )\b""",
    re.IGNORECASE | re.VERBOSE,
)


def find_editorial_labels(text: str) -> list[str]:
    """Return the distinct editorial labels found in `text` (order kept)."""
    seen: dict[str, None] = {}
    for match in _EDITORIAL_LABEL_RE.finditer(text or ""):
        seen.setdefault(match.group(0).lower(), None)
    return list(seen)


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
    """Grant/deny a tool call for the Record agent (Tool Spec §2)."""
    if tool in GRANTED_TOOLS:
        return _result(True, tool=tool)
    if tool in ("web_search", "fetch_source"):
        reason = (
            f"tool '{tool}' hard-denied for agent '{AGENT_ID}' — "
            "primary sources only is enforced at the wrapper (Tool Spec §2)"
        )
    elif tool in ALL_TOOLS:
        reason = f"tool '{tool}' denied for agent '{AGENT_ID}'"
    else:
        reason = f"unknown tool '{tool}'"
    return _result(False, guard_type="denied_tool", reasons=[reason], tool=tool)


def check_db_read(buckets: list[str]) -> dict[str, Any]:
    """Record agent db_read is own-bucket only (Tool Spec §2)."""
    outside = sorted(set(buckets) - {OWN_BUCKET})
    if not outside:
        return _result(True, tool="db_read")
    return _result(
        False, guard_type="bucket",
        reasons=[f"db_read outside own bucket: {outside}"],
        tool="db_read",
    )


def validate_source_register(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Record agent may register Sources with type='primary_doc' only."""
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
    The load-bearing guard on claim_write (T9) for the Record agent.

    Args:
      claim: the Claim payload (CAP_Schema_v1 §6 shape, with source_ids).
      source_types: source_id -> Source.type for every REGISTERED source
        (the wrapper reads these; an id absent here does not exist).

    Two halt paths (ok=False, halt=True, guard_type='bucket'):
      - wrong-bucket write (buckets are sacred);
      - editorial label in the claim text (Agent Plan §3 halt condition).
    All other contract violations reject the call without halting.
    """
    bucket = claim.get("bucket")

    # Buckets are sacred — halt path 1.
    if bucket != OWN_BUCKET:
        detail = (
            f"wrong-bucket write: '{bucket}'"
            if bucket in VALID_BUCKETS
            else f"invalid bucket: '{bucket}'"
        )
        return _result(
            False, halt=True, guard_type="bucket",
            reasons=[f"{detail} — record agent writes '{OWN_BUCKET}' only"],
            tool="claim_write",
        )

    # Editorial labels — halt path 2 (Agent Plan §3).
    labels = find_editorial_labels(claim.get("text") or "")
    if labels:
        return _result(
            False, halt=True, guard_type="bucket",
            reasons=[
                "editorial label(s) in claim text: "
                + ", ".join(f"'{lb}'" for lb in labels)
                + " — the record agent never labels a stated-vs-did "
                "contrast; present the facts side by side and stop"
            ],
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
                    f"source '{sid}' has type '{stype}' — record-agent "
                    f"claims must cite '{ALLOWED_SOURCE_TYPE}' sources"
                )

    # Record output contract (Agent Plan §3 / CAP_Schema_v1 §6 rules).
    if claim.get("attributed") is not False:
        reasons.append(
            "record-agent claims must be attributed=false — this is the "
            "record, not something the candidate said (Schema §6)"
        )
    if claim.get("verification") != "verified":
        reasons.append(
            "record-agent verification must be 'verified' — the action is "
            "documented in a primary record, by construction"
        )
    if claim.get("verdict") is not None:
        reasons.append(
            "verdict must be null — verdicts belong to the Fact-Checker "
            "(Schema §6 verdict rule)"
        )
    # issue_id is intentionally NOT required: "set where the action maps to
    # an issue" (Agent Plan §3) — a finance filing may map to none.
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
