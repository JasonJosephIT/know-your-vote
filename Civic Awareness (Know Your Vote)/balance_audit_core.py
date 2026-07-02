"""
Civic Awareness Project (CAP) — Balance Audit, deterministic core.

Reference implementation of the pure function described in
CAP_Balance_Audit_Spec_v1.1 §1 ("one core, two adapters") and CAP_Schema_v1 §7.1.

This module is INTENTIONALLY pure:
  - no database, no network, no model call, no clock side effects;
  - the only time-dependent value (flagged_at) is injected by the caller.

The MCP wrapper (balance_audit, T10) and the CLI adapter both call
balance_audit_core() and own all I/O (db_read of Profiles, writing
balance_check_passed / flag_reason back, routing through log_action).

Metrics (v1.1 — split from the old single claim_count):
  GATES (a breach HALTs publication):
    - fact_checks           variance < 10%
    - verifiable_fact_count variance < 15%   (record/fact scrutiny — the neutrality claim)
    - word_count            variance < 15%   (equal brief real estate)
  FLAGS (raised for human review, never halt):
    - stated_position_count variance < 15%   -> 'stated_position_asymmetry'
    - spine_issues_covered  any gap          -> 'issue_coverage_asymmetry'

Formula (locked, all race sizes): variance_pct = (max - min) / max * 100
Halt rule: HALT when a GATE variance > threshold. outside_opinion is counted nowhere.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# Defaults from PRD §4 KPIs. Passable for override/testing only.
DEFAULT_THRESHOLDS: dict[str, float] = {
    "word_count_pct": 15,
    "verifiable_fact_pct": 15,
    "stated_position_pct": 15,
    "fact_check_pct": 10,
}

# (output metric name, row key, threshold key) — hard gates; a breach HALTs.
_GATES: list[tuple[str, str, str]] = [
    ("word_count", "word_count", "word_count_pct"),
    ("verifiable_fact_count", "verifiable_fact_count", "verifiable_fact_pct"),
    ("fact_checks", "fact_checks", "fact_check_pct"),
]

# (output metric name, row key, threshold key, flag_reason) — soft flags; never HALT.
_FLAGS: list[tuple[str, str, str, str]] = [
    ("stated_position_count", "stated_position_count",
     "stated_position_pct", "stated_position_asymmetry"),
]


def _variance_pct(values: list[int]) -> float:
    """(max - min) / max * 100, rounded to 1 decimal. 0.0 when max is 0."""
    mx = max(values)
    if mx == 0:
        return 0.0
    return round((mx - min(values)) / mx * 100, 1)


def _lohi(rows: list[dict[str, Any]], key: str) -> dict[str, str]:
    return {
        "low": min(rows, key=lambda r: r[key])["candidate_id"],
        "high": max(rows, key=lambda r: r[key])["candidate_id"],
    }


def _extract(profile: dict[str, Any]) -> dict[str, Any]:
    """
    Pull the audited quantities from a Schema v1 Profile object.

    verifiable_fact_count and stated_position_count are derived from the claim
    lists so the 'opinions excluded' rule is enforced by this core, not trusted.
    """
    audit = profile["audit"]
    return {
        "candidate_id": profile["candidate_id"],
        "word_count": audit["word_count"],
        "verifiable_fact_count": len(profile["facts"]),
        "stated_position_count": len(profile["positions"]),
        "fact_checks": audit["fact_checks_performed"],
        "spine_issues_covered": audit.get("spine_issues_covered", 0),
    }


def balance_audit_core(
    profiles: list[dict[str, Any]],
    thresholds: dict[str, float] | None = None,
    now: str | None = None,
) -> dict[str, Any]:
    """
    Run the deterministic balance audit for one race.

    Returns a result dict matching CAP_Balance_Audit_Spec_v1.1 §4/§5:
    verdict (PASS|HALT), per-metric detail, and a `flags` list of raised
    soft-flag reasons. Flags never change the verdict.
    """
    if not profiles:
        raise ValueError("balance_audit_core requires at least one Profile")

    thr = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    rows = [_extract(p) for p in profiles]
    race_id = profiles[0]["race_id"]

    metrics: dict[str, Any] = {}
    breached: list[str] = []
    flags: list[str] = []

    # Hard gates — order defines report order (word, verifiable_fact, fact_checks).
    for name, key, tkey in _GATES:
        values = [r[key] for r in rows]
        variance = _variance_pct(values)
        threshold = thr[tkey]
        breach = variance > threshold  # PRD §6.3: HALT when variance > threshold
        entry: dict[str, Any] = {
            "min": min(values), "max": max(values),
            "variance_pct": variance, "threshold": threshold,
            "kind": "gate", "breach": breach,
        }
        if breach:
            entry["candidates"] = _lohi(rows, key)
            breached.append(name)
        metrics[name] = entry

    # Soft flags — variance-based (stated_position_count).
    for name, key, tkey, reason in _FLAGS:
        values = [r[key] for r in rows]
        variance = _variance_pct(values)
        threshold = thr[tkey]
        flagged = variance > threshold
        entry = {
            "min": min(values), "max": max(values),
            "variance_pct": variance, "threshold": threshold,
            "kind": "flag", "flagged": flagged,
        }
        if flagged:
            entry["candidates"] = _lohi(rows, key)
            flags.append(reason)
        metrics[name] = entry

    # Soft flag — spine issue coverage (gap-based: any difference flags).
    covered = [r["spine_issues_covered"] for r in rows]
    gap = max(covered) - min(covered)
    cov_entry: dict[str, Any] = {
        "min": min(covered), "max": max(covered), "gap": gap,
        "kind": "flag", "flagged": gap > 0,
    }
    if gap > 0:
        cov_entry["candidates"] = _lohi(rows, "spine_issues_covered")
        flags.append("issue_coverage_asymmetry")
    metrics["spine_issue_coverage"] = cov_entry

    verdict = "HALT" if breached else "PASS"
    result: dict[str, Any] = {"verdict": verdict, "race_id": race_id}
    if breached:
        result["breached_metrics"] = breached
    result["metrics"] = metrics
    result["flags"] = flags
    if breached or flags:
        result["flagged_at"] = now or (
            datetime.now(timezone.utc).replace(microsecond=0)
            .isoformat().replace("+00:00", "Z")
        )
    return result


if __name__ == "__main__":
    import json

    def claims(n):
        return [f"c{i}" for i in range(n)]

    def profile(cid, race, wc, facts, positions, fc, covered, opinions=0):
        return {
            "candidate_id": cid, "race_id": race,
            "facts": claims(facts), "positions": claims(positions),
            "opinions": claims(opinions),
            "audit": {"word_count": wc, "fact_checks_performed": fc,
                      "spine_issues_covered": covered},
        }

    fl28 = [
        profile("cand_001", "FL-28-general", 455, 5, 4, 5, 4, opinions=3),
        profile("cand_002", "FL-28-general", 412, 5, 4, 5, 4, opinions=2),
    ]
    print(json.dumps(balance_audit_core(fl28), indent=2))
