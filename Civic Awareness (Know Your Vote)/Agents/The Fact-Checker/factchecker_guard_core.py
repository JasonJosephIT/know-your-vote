"""
Civic Awareness Project (CAP) — Fact-Checker agent (Agent 3) guards,
deterministic core.

Reference implementation of the tool-wrapper guards for the Fact-Checker,
per CAP_MCP_Tool_Spec_v1 §2 (per-agent authorization) and the Agent 3
blueprint in the Agent Plan. These checks run INSIDE the tool wrappers,
keyed on agent_id='factchecker' — they are the structural guarantee, not
the prompt.

This module is INTENTIONALLY pure: no database, no network, no clock. The
wrapper owns all I/O and must write the returned `log` row via log_action
(T11) before returning to the agent — early-return rejections are not
exempt (CAP_Schema_v1 §8).

Guards implemented:
  1. check_tool_access   — tool grants. balance_audit and sms_dispatch are
                           hard-denied (the checker never audits itself and
                           never dispatches). Anything not granted
                           -> guard_type='denied_tool'. Allowlist B on
                           web_search/fetch_source lives in
                           allowlist_b_core.check_fetch.
  2. check_db_read       — ALL buckets readable (the only agent with
                           cross-bucket read — it needs claims from
                           Agents 1 & 2). Unknown bucket names rejected.
  3. validate_source_register — any Source type (Tool Spec §2), but every
                           source must carry a valid lean_tag ("every
                           source is lean-tagged", Tool Spec §2.5 B).
  4. validate_claim_write — the load-bearing guard. Three halt paths and
                           the full output contract (below).

The three HALT paths (ok=False, halt=True, guard_type='bucket'), mapped
to the blueprint halt conditions:
  H1. Any write to stated_position (or an invalid bucket) — the checker
      can never rewrite the self-portrait.
  H2. A verdict on an outside_opinion claim — rating an opinion/value
      judgment as true/false.
  H3. A non-'unverifiable' verdict on fewer than 2 independent Tier 1
      primary sources (the >=2 Tier-1 rule; Tier 2 never counts).

Output contract enforced on claim_write (CAP_Schema_v1 §6):
  - bucket='verifiable_fact': verdict REQUIRED, exactly one of the fixed
    six-value scale; verdict != 'unverifiable' => verification='verified'
    AND >=2 independent Tier 1 sources (H3 otherwise);
    verification='verified' is itself only lawful with >=2 Tier 1.
  - bucket='outside_opinion': verdict must be null (H2 otherwise);
    opinions are excluded from the balance-audit claim count downstream.
  - >=1 cited source, every cited source registered ("no Source ->
    dropped", CAP_Schema_v1 §6.1). Derived/split claims may cite
    candidate_self sources (the "they said it" provenance), so source
    TYPE is not restricted here — only the Tier-1 count gates verdicts.
  - attributed must be an explicit boolean — it answers "did they say
    it", never "is it true" (Schema §6 two-axes rule).
  - derived_from / issue_id are OPTIONAL (set when the claim was split
    from a candidate statement — Schema §6 derived_from rule).

Independence (deterministic proxy): distinct Tier-1 documents by
normalized URL (allowlist_b_core.url_norm) — two distinct FEC filings are
two independent sources; the same page cited twice is one. Recorded as a
design decision in the README.

guard_type uses the CAP_Schema_v1 §8 discriminator
('bucket' | 'allowlist' | 'denied_tool'). Contract violations on
source_register / claim_write are classed 'bucket' (same convention as
the Profiler and Record guards); tool grants are 'denied_tool';
Allowlist B blocks (in allowlist_b_core) are 'allowlist'.
"""

from __future__ import annotations

from typing import Any, Mapping

from allowlist_b_core import count_independent_tier1

AGENT_ID = "factchecker"

# Tool Spec §1 — the full tool list (unknown tool names are also denied).
ALL_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "fec_api_query", "fl_legislature_query",
    "jurisdiction_resolve", "web_search", "fetch_source", "source_register",
    "db_read", "claim_write", "balance_audit", "log_action", "sms_dispatch",
})

# Tool Spec §2, Fact-Checker column. log_action is wrapper-internal, never
# agent-callable (Tool Spec §1 design note) — so it is NOT granted here.
GRANTED_TOOLS: frozenset[str] = frozenset({
    "web_search", "fetch_source",
    "fec_api_query", "fl_legislature_query", "doe_file_intake",
    "source_register", "db_read", "claim_write",
})

# Blueprint: explicitly hard-denied with their own wording.
_HARD_DENIED: frozenset[str] = frozenset({"balance_audit", "sms_dispatch"})

WRITABLE_BUCKETS: frozenset[str] = frozenset({
    "verifiable_fact", "outside_opinion",
})
FORBIDDEN_BUCKET = "stated_position"
VALID_BUCKETS: frozenset[str] = frozenset({
    "verifiable_fact", "stated_position", "outside_opinion",
})

# CAP_Schema_v1 §6 — the six-value verdict enum (storage form; the prompt's
# display labels map 1:1, e.g. "Mostly Accurate" -> 'mostly_accurate').
VERDICTS: frozenset[str] = frozenset({
    "accurate", "mostly_accurate", "mixed",
    "mostly_inaccurate", "inaccurate", "unverifiable",
})

VALID_SOURCE_TYPES: frozenset[str] = frozenset({
    "factual_reporting", "opinion", "primary_doc", "candidate_self",
})
VALID_LEAN_TAGS: frozenset[str] = frozenset({
    "left", "center-left", "center", "center-right", "right", "N/A",
})
VALID_VERIFICATION: frozenset[str] = frozenset({
    "verified", "single_source", "unverified",
})

MIN_TIER1_FOR_VERDICT = 2


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
    """Grant/deny a tool call for the Fact-Checker (Tool Spec §2)."""
    if tool in GRANTED_TOOLS:
        return _result(True, tool=tool)
    if tool in _HARD_DENIED:
        reason = (
            f"tool '{tool}' hard-denied for agent '{AGENT_ID}' — the "
            "Fact-Checker never runs the balance audit and never "
            "dispatches (Tool Spec §2)"
        )
    elif tool in ALL_TOOLS:
        reason = f"tool '{tool}' denied for agent '{AGENT_ID}'"
    else:
        reason = f"unknown tool '{tool}'"
    return _result(False, guard_type="denied_tool", reasons=[reason], tool=tool)


def check_db_read(buckets: list[str]) -> dict[str, Any]:
    """
    Fact-Checker db_read spans ALL buckets (Tool Spec §2 — the only agent
    with cross-bucket read; it needs the claims Agents 1 & 2 surfaced).
    Only unknown bucket names are rejected.
    """
    unknown = sorted(set(buckets) - VALID_BUCKETS)
    if not unknown:
        return _result(True, tool="db_read")
    return _result(
        False, guard_type="bucket",
        reasons=[f"unknown bucket(s) in db_read: {unknown}"],
        tool="db_read",
    )


def validate_source_register(payload: Mapping[str, Any]) -> dict[str, Any]:
    """
    Fact-Checker may register ANY Source type (Tool Spec §2), but every
    source must be lean-tagged with a valid value (Tool Spec §2.5 B:
    "Every retrieved source is lean-tagged via Source.lean_tag").
    """
    reasons: list[str] = []
    src_type = payload.get("type")
    if src_type not in VALID_SOURCE_TYPES:
        reasons.append(f"invalid source type '{src_type}'")
    lean = payload.get("lean_tag")
    if lean not in VALID_LEAN_TAGS:
        reasons.append(
            f"invalid or missing lean_tag '{lean}' — every Fact-Checker "
            "source is lean-tagged (Tool Spec §2.5 B)"
        )
    if reasons:
        return _result(
            False, guard_type="bucket", reasons=reasons,
            tool="source_register",
        )
    return _result(True, tool="source_register")


def validate_claim_write(
    claim: Mapping[str, Any],
    sources: Mapping[str, Mapping[str, Any]],
) -> dict[str, Any]:
    """
    The load-bearing guard on claim_write (T9) for the Fact-Checker.

    Args:
      claim: the Claim payload (CAP_Schema_v1 §6 shape, with source_ids).
      sources: source_id -> registered Source row (at least 'url' and
        'type') for every REGISTERED source. An id absent here does not
        exist — the wrapper reads these, the agent cannot forge them.

    Halt paths (ok=False, halt=True, guard_type='bucket') H1–H3 are
    documented in the module docstring. All other contract violations
    reject the single call without halting the race pipeline.
    """
    bucket = claim.get("bucket")
    verdict = claim.get("verdict")

    # H1 — buckets are sacred; stated_position is the self-portrait.
    if bucket not in WRITABLE_BUCKETS:
        if bucket == FORBIDDEN_BUCKET:
            detail = (
                "write to 'stated_position' — the Fact-Checker can never "
                "rewrite the candidate's self-portrait"
            )
        elif bucket in VALID_BUCKETS:  # unreachable; kept for symmetry
            detail = f"wrong-bucket write: '{bucket}'"
        else:
            detail = f"invalid bucket: '{bucket}'"
        return _result(
            False, halt=True, guard_type="bucket",
            reasons=[detail], tool="claim_write",
        )

    # H2 — opinions are never rated true/false.
    if bucket == "outside_opinion" and verdict is not None:
        return _result(
            False, halt=True, guard_type="bucket",
            reasons=[
                f"verdict '{verdict}' on an outside_opinion claim — "
                "opinions and value judgments are routed unrated "
                "(verdict must be null)"
            ],
            tool="claim_write",
        )

    reasons: list[str] = []

    # No Source -> dropped (CAP_Schema_v1 §6.1).
    source_ids = list(claim.get("source_ids") or [])
    cited_urls: list[str] = []
    if not source_ids:
        reasons.append("no source_ids cited — no Source, no claim")
    else:
        for sid in source_ids:
            row = sources.get(sid)
            if row is None:
                reasons.append(f"source '{sid}' is not registered")
            else:
                cited_urls.append(row.get("url") or "")

    tier1_count = count_independent_tier1(cited_urls)

    if bucket == "verifiable_fact":
        if verdict not in VERDICTS:
            reasons.append(
                f"verdict '{verdict}' is not on the fixed six-value scale — "
                "adjudicated verifiable_fact claims carry exactly one of: "
                + ", ".join(sorted(VERDICTS))
            )
        elif verdict != "unverifiable":
            # H3 — the >=2 Tier-1 rule. Tier 2 is corroboration only.
            if tier1_count < MIN_TIER1_FOR_VERDICT:
                return _result(
                    False, halt=True, guard_type="bucket",
                    reasons=[
                        f"verdict '{verdict}' issued on {tier1_count} "
                        "independent Tier 1 primary source(s) — any verdict "
                        "other than 'unverifiable' requires >=2; Tier 2 "
                        "sources never count (Tool Spec §2.5 B). If you "
                        "cannot reach 2, the verdict is 'unverifiable'."
                    ],
                    tool="claim_write",
                )
            if claim.get("verification") != "verified":
                reasons.append(
                    "a non-'unverifiable' verdict requires "
                    "verification='verified' (>=2 independent Tier 1 "
                    "primary sources, which are present)"
                )
        if (
            claim.get("verification") == "verified"
            and tier1_count < MIN_TIER1_FOR_VERDICT
        ):
            reasons.append(
                "verification='verified' claimed with "
                f"{tier1_count} independent Tier 1 source(s) — 'verified' "
                "means >=2 (use 'single_source' or 'unverified')"
            )

    if claim.get("verification") not in VALID_VERIFICATION:
        reasons.append(
            f"invalid verification '{claim.get('verification')}'"
        )

    # Two-axes rule: attributed answers "did they say it", never "is it
    # true" — it must be an explicit boolean, either value lawful.
    if not isinstance(claim.get("attributed"), bool):
        reasons.append(
            "attributed must be an explicit boolean — it records whether "
            "the candidate asserted the claim, never whether it is true "
            "(Schema §6)"
        )

    # derived_from / issue_id are intentionally OPTIONAL: set when the
    # claim was split from a candidate statement, absent otherwise.
    if not (claim.get("text") or "").strip():
        reasons.append("claim text is empty")
    for field in ("claim_id", "candidate_id", "race_id"):
        if not claim.get(field):
            reasons.append(f"missing required field '{field}'")

    if reasons:
        return _result(
            False, guard_type="bucket", reasons=reasons, tool="claim_write"
        )
    return _result(True, tool="claim_write", bucket_written=bucket)
