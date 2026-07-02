"""
Civic Awareness Project (CAP) — Orchestrator / Synthesis Layer,
deterministic core.

Reference implementation of the Agent Plan §5 blueprint: a DETERMINISTIC
CONTROLLER with no model calls and — by design — NO system prompt (PRD
§6.3, §9). This module is the runbook as code: tool grants, the per-race
pipeline state machine, the balance-audit branch, the human review gate,
and the dispatch gate.

This module is INTENTIONALLY pure: no database, no network, no model
call, no clock. The MCP wrapper / runner owns all I/O:
  - it calls the tools (doe_file_intake, jurisdiction_resolve, db_read,
    balance_audit, sms_dispatch) and feeds their results in;
  - it persists the state dict between steps;
  - it writes every returned `log` row via log_action (T11) before
    proceeding — early-return rejections are not exempt (CAP_Schema_v1 §8).

State machine (one instance per race):

    created ─ log_spine_issues ─▶ spine_logged ─ start_agents ─▶
    agents_running ─ agent_finished ×(3 agents × N candidates) ─▶
    agents_done ─ apply_audit_result ─▶ audited_pass | audited_halt
    audited_pass ─ mark_composed ─▶ composed ─ record_human_review ─▶
    approved ─ check_dispatch(ok) ─ mark_dispatched ─▶ dispatched
    audited_halt ─ (human remediation, agents re-run) ─▶ re-audit

Hard invariants enforced here (blueprint "Hard invariants"):
  I1. The orchestrator never calls claim_write — check_tool_access
      hard-denies it (it composes and dispatches, it does not author
      claims). web_search / fetch_source / the primary-source query
      tools for adjudication are likewise denied (Tool Spec §2).
  I2. sms_dispatch is unreachable for a race whose LATEST balance_audit
      returned HALT — enforced twice: 'approved' is only reachable
      through audited_pass, and check_dispatch independently re-checks
      the latest audit verdict (defense in depth).
  I3. Every halt is countable: apply_audit_result emits a log row with
      guard_triggered=True on HALT (Audit Block Rate KPI), and every
      blocked transition emits a guard_triggered=True row.

Sequencing rules enforced (blueprint control flow):
  - The SPINE issue set must be defined and LOGGED before agents run
    (the issue-selection lever must be transparent — Schema §6.2).
  - balance_audit runs only after ALL agents for the race finished.
  - Composition happens only on PASS. Flags never block composition —
    they are surfaced to the reviewer (flags alone never HALT).
  - Dispatch requires human approval AND verdict==PASS AND the
    recipient being the owner's phone (Twilio trial, PRD §6.4).

Profile write-back (blueprint step 3): profile_updates_from_audit maps a
balance_audit result onto each candidate's Profile.audit fields
(balance_check_passed / flag_reason / flagged_at). flag_reason precedence
when several apply: 'scrutiny_halt' > 'stated_position_asymmetry' >
'issue_coverage_asymmetry' (Schema §7 stores a single reason).

guard_type uses the CAP_Schema_v1 §8 discriminator. Tool grants are
'denied_tool'; blocked pipeline transitions (audit too early, compose or
dispatch in HALT, wrong recipient) are also classed 'denied_tool' — the
orchestrator's guards deny an action, they never involve buckets or
allowlists. The HALT row itself carries guard_type=None: the audit tool
succeeded; what triggered is the pipeline guard, not a tool rejection.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Mapping

AGENT_ID = "orchestrator"

# Tool Spec §1 — the full tool list (unknown tool names are also denied).
ALL_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "fec_api_query", "fl_legislature_query",
    "jurisdiction_resolve", "web_search", "fetch_source", "source_register",
    "db_read", "claim_write", "balance_audit", "log_action", "sms_dispatch",
})

# Blueprint "Authorized tools": T1, T4, T8 (all buckets), T10, T12.
# log_action is wrapper-internal, never agent-callable (Tool Spec §1).
GRANTED_TOOLS: frozenset[str] = frozenset({
    "doe_file_intake", "jurisdiction_resolve", "db_read",
    "balance_audit", "sms_dispatch",
})

# Blueprint "Denied tools", each with its own wording.
_HARD_DENIED: dict[str, str] = {
    "claim_write": (
        "the orchestrator never writes claims — it composes and "
        "dispatches, it does not author (blueprint hard invariant)"
    ),
    "web_search": "the orchestrator does no discovery (Tool Spec §2)",
    "fetch_source": "the orchestrator does no discovery (Tool Spec §2)",
    "fec_api_query": (
        "primary-source query tools are for agent adjudication, not the "
        "orchestrator (Tool Spec §2 — intake-layer fetches run outside "
        "the orchestrator identity)"
    ),
    "fl_legislature_query": (
        "primary-source query tools are for agent adjudication, not the "
        "orchestrator (Tool Spec §2)"
    ),
    "source_register": (
        "the orchestrator registers no sources — it authors nothing "
        "(Tool Spec §2)"
    ),
}

VALID_BUCKETS: frozenset[str] = frozenset({
    "verifiable_fact", "stated_position", "outside_opinion",
})

# PRD §6.2 — the three agents run in parallel per candidate.
RACE_AGENTS: frozenset[str] = frozenset({"profiler", "record", "factchecker"})

STATES: frozenset[str] = frozenset({
    "created", "spine_logged", "agents_running", "agents_done",
    "audited_pass", "audited_halt", "composed", "approved", "dispatched",
})

# Schema §7 flag_reason enum, in precedence order (single stored reason).
_FLAG_REASON_PRECEDENCE: tuple[str, ...] = (
    "scrutiny_halt", "stated_position_asymmetry", "issue_coverage_asymmetry",
)

SMS_MAX_CHARS = 160  # PRD §6.3 / §8 step 3

# States from which a (re-)audit may be applied: the first audit after all
# agents finish, re-audits after remediation of a HALT, and re-audits that
# supersede any pre-dispatch state (a fresh audit invalidates composition
# and approval — only 'dispatched' is final, and 'created'/'agents_running'
# have nothing to audit yet).
_AUDITABLE_STATES: frozenset[str] = frozenset({
    "agents_done", "audited_halt", "audited_pass", "composed", "approved",
})


# ---------------------------------------------------------------------------
# Result / log-row convention (same shape as the agent guard cores)
# ---------------------------------------------------------------------------

def _result(
    ok: bool,
    *,
    guard_type: str | None = None,
    reasons: list[str] | None = None,
    tool: str,
    race_id: str | None = None,
    guard_triggered: bool | None = None,
    status: str | None = None,
    **extra: Any,
) -> dict[str, Any]:
    reasons = reasons or []
    out: dict[str, Any] = {
        "ok": ok,
        "guard_type": guard_type,
        "reasons": reasons,
        "log": {
            "agent_id": AGENT_ID,
            "tool_called": tool,
            "race_id": race_id,
            "bucket_written": None,      # the orchestrator never writes claims
            "status": status or ("success" if ok else "fail"),
            "failure_reason": "; ".join(reasons) or None,
            "guard_triggered": (not ok) if guard_triggered is None
                               else guard_triggered,
            "guard_type": guard_type,
        },
    }
    out.update(extra)
    return out


# ---------------------------------------------------------------------------
# Guard 1 — tool grants (Tool Spec §2, orchestrator column + blueprint)
# ---------------------------------------------------------------------------

def check_tool_access(tool: str) -> dict[str, Any]:
    """Grant/deny a tool call for the orchestrator identity.

    NOTE: a grant here is only the identity-level grant. sms_dispatch is
    additionally gated by check_dispatch (PASS + human approval + owner
    phone) — a grant from this function alone never authorizes a send.
    """
    if tool in GRANTED_TOOLS:
        return _result(True, tool=tool)
    if tool in _HARD_DENIED:
        reason = f"tool '{tool}' hard-denied for agent '{AGENT_ID}' — " \
                 + _HARD_DENIED[tool]
    elif tool in ALL_TOOLS:
        reason = f"tool '{tool}' denied for agent '{AGENT_ID}'"
    else:
        reason = f"unknown tool '{tool}'"
    return _result(False, guard_type="denied_tool", reasons=[reason], tool=tool)


def check_db_read(buckets: list[str]) -> dict[str, Any]:
    """Orchestrator db_read spans ALL buckets (Tool Spec §2 — it needs the
    full picture to compose). Only unknown bucket names are rejected."""
    unknown = sorted(set(buckets) - VALID_BUCKETS)
    if not unknown:
        return _result(True, tool="db_read")
    return _result(
        False, guard_type="denied_tool",
        reasons=[f"unknown bucket(s) in db_read: {unknown}"],
        tool="db_read",
    )


# ---------------------------------------------------------------------------
# Race pipeline state machine (blueprint control flow, steps 1–6)
# ---------------------------------------------------------------------------

def new_race_state(race_id: str, candidate_ids: list[str]) -> dict[str, Any]:
    """Step 1 precondition: Race + Candidate objects exist (intake layer,
    PRD §6.1). One state dict per race; the wrapper persists it."""
    if not race_id:
        raise ValueError("race_id is required")
    if not candidate_ids:
        raise ValueError("a race needs at least one candidate")
    if len(set(candidate_ids)) != len(candidate_ids):
        raise ValueError("duplicate candidate_ids")
    return {
        "race_id": race_id,
        "candidate_ids": list(candidate_ids),
        "state": "created",
        "spine_issues": None,          # set by log_spine_issues
        "pending_agents": None,        # set by start_agents
        "latest_audit": None,          # set by apply_audit_result
        "flags": [],                   # surfaced to the reviewer
        "brief_html": None,
        "sms_text": None,
        "review": None,                # set by record_human_review
        "dispatched_to": None,
    }


def _blocked(state: Mapping[str, Any], tool: str,
             reasons: list[str]) -> dict[str, Any]:
    return _result(
        False, guard_type="denied_tool", reasons=reasons, tool=tool,
        race_id=state["race_id"], state=deepcopy(dict(state)),
    )


def log_spine_issues(
    state: Mapping[str, Any], issues: list[Mapping[str, Any]],
) -> dict[str, Any]:
    """Step 1: define and LOG the race's SPINE issue set before agents run.

    This is the issue-selection lever (Schema §6.2 neutrality rule): the
    spine is fixed per race, applied identically to all candidates, and
    its selection is logged (who/what/why) to action_log. 'Neutrally
    worded' is editorial and cannot be machine-checked; what IS checked:
    every issue is spine-tier, race-wide (no candidate_id), labeled, and
    carries a source/justification — so the log row is auditable.
    """
    if state["state"] != "created":
        return _blocked(state, "spine_select",
                        [f"spine already logged or race past intake "
                         f"(state='{state['state']}')"])
    reasons: list[str] = []
    if not issues:
        reasons.append("spine issue set is empty — the comparison axis "
                       "must exist before agents run")
    for i, issue in enumerate(issues):
        if issue.get("tier") != "spine":
            reasons.append(f"issue[{i}] tier '{issue.get('tier')}' — only "
                           "spine-tier issues belong in the race spine")
        if issue.get("candidate_id") is not None:
            reasons.append(f"issue[{i}] carries a candidate_id — spine "
                           "issues are race-wide (Schema §6.2 CHECK)")
        if not (issue.get("label") or "").strip():
            reasons.append(f"issue[{i}] has no label")
        if not (issue.get("justification") or "").strip():
            reasons.append(f"issue[{i}] has no source/justification — the "
                           "selection must be transparent (Schema §6.2)")
    if reasons:
        return _blocked(state, "spine_select", reasons)
    new = deepcopy(dict(state))
    new["spine_issues"] = [dict(i) for i in issues]
    new["state"] = "spine_logged"
    return _result(True, tool="spine_select", race_id=state["race_id"],
                   state=new)


def start_agents(state: Mapping[str, Any]) -> dict[str, Any]:
    """Step 2: launch the three agents IN PARALLEL for each candidate.
    The wrapper does the launching; this transition only authorizes it
    and records what must come back."""
    if state["state"] != "spine_logged":
        return _blocked(state, "start_agents",
                        [f"agents cannot start from state "
                         f"'{state['state']}' — the spine issue set must "
                         "be logged first (blueprint step 1)"])
    new = deepcopy(dict(state))
    new["pending_agents"] = sorted(
        f"{cid}:{agent}"
        for cid in state["candidate_ids"] for agent in RACE_AGENTS
    )
    new["state"] = "agents_running"
    return _result(True, tool="start_agents", race_id=state["race_id"],
                   state=new)


def agent_finished(
    state: Mapping[str, Any], candidate_id: str, agent_id: str,
) -> dict[str, Any]:
    """Step 2→3: record one agent's completion for one candidate. When the
    last one lands, the race becomes auditable."""
    if state["state"] != "agents_running":
        return _blocked(state, "agent_finished",
                        [f"no agents running (state='{state['state']}')"])
    key = f"{candidate_id}:{agent_id}"
    if agent_id not in RACE_AGENTS:
        return _blocked(state, "agent_finished",
                        [f"unknown agent_id '{agent_id}'"])
    if key not in (state["pending_agents"] or []):
        return _blocked(state, "agent_finished",
                        [f"'{key}' is not pending (already finished, or "
                         "candidate not in this race)"])
    new = deepcopy(dict(state))
    new["pending_agents"] = [k for k in new["pending_agents"] if k != key]
    if not new["pending_agents"]:
        new["state"] = "agents_done"
    return _result(True, tool="agent_finished", race_id=state["race_id"],
                   state=new)


# ---------------------------------------------------------------------------
# Step 3 — balance audit branch + Profile write-back
# ---------------------------------------------------------------------------

def profile_updates_from_audit(
    result: Mapping[str, Any], candidate_ids: list[str],
) -> dict[str, dict[str, Any]]:
    """Map a balance_audit result onto Profile.audit write-backs
    (blueprint step 3): balance_check_passed / flag_reason / flagged_at
    for every candidate in the race.

    flag_reason precedence (single stored reason, Schema §7):
    scrutiny_halt > stated_position_asymmetry > issue_coverage_asymmetry.
    """
    verdict = result["verdict"]
    raised = set(result.get("flags") or [])
    if verdict == "HALT":
        raised.add("scrutiny_halt")
    reason = next((r for r in _FLAG_REASON_PRECEDENCE if r in raised), None)
    flagged_at = result.get("flagged_at") if reason else None
    update = {
        "balance_check_passed": verdict == "PASS",
        "flag_reason": reason,
        "flagged_at": flagged_at,
    }
    return {cid: dict(update) for cid in candidate_ids}


def apply_audit_result(
    state: Mapping[str, Any], result: Mapping[str, Any],
) -> dict[str, Any]:
    """Step 3/4: branch on the deterministic balance_audit verdict.

    PASS → race becomes composable; flags (if any) are carried on the
           state to be surfaced to the reviewer. Flags alone never HALT.
    HALT → BLOCK. The returned log row has guard_triggered=True so every
           halt is countable (Audit Block Rate KPI). Composition and
           dispatch stay unreachable until a re-audit PASSes.

    Also returns `profile_updates` (candidate_id → audit write-back) for
    the wrapper to persist via the Profile store.
    """
    if state["state"] not in _AUDITABLE_STATES:
        return _blocked(state, "balance_audit",
                        [f"balance_audit is not runnable from state "
                         f"'{state['state']}' — all agents must have "
                         "finished (blueprint step 3)"])
    if result.get("race_id") != state["race_id"]:
        return _blocked(state, "balance_audit",
                        [f"audit result is for race "
                         f"'{result.get('race_id')}', not "
                         f"'{state['race_id']}'"])
    verdict = result.get("verdict")
    if verdict not in ("PASS", "HALT"):
        return _blocked(state, "balance_audit",
                        [f"invalid audit verdict '{verdict}'"])

    new = deepcopy(dict(state))
    new["latest_audit"] = deepcopy(dict(result))
    new["flags"] = list(result.get("flags") or [])
    # Any prior composition/approval is invalidated by a fresh audit.
    new["brief_html"] = None
    new["sms_text"] = None
    new["review"] = None
    updates = profile_updates_from_audit(result, state["candidate_ids"])

    if verdict == "HALT":
        new["state"] = "audited_halt"
        breached = result.get("breached_metrics") or []
        detail: list[str] = []
        for name in breached:
            m = (result.get("metrics") or {}).get(name, {})
            cands = m.get("candidates", {})
            detail.append(
                f"{name} variance {m.get('variance_pct')}% > "
                f"{m.get('threshold')}% (low={cands.get('low')}, "
                f"high={cands.get('high')})"
            )
        return _result(
            True, tool="balance_audit", race_id=state["race_id"],
            # The tool ran successfully; the PIPELINE guard triggered.
            guard_triggered=True, status="success",
            reasons=[f"HALT: {'; '.join(detail) or 'gate breach'}"],
            state=new, profile_updates=updates, verdict="HALT",
        )

    new["state"] = "audited_pass"
    return _result(True, tool="balance_audit", race_id=state["race_id"],
                   state=new, profile_updates=updates, verdict="PASS")


# ---------------------------------------------------------------------------
# Step 4 — composition (PASS only)
# ---------------------------------------------------------------------------

def compose_sms(race_list: list[str], link: str) -> dict[str, Any]:
    """SMS Composer (PRD §8 step 3): fixed template, hard 160-char cap.
    Deterministic — no model in the loop."""
    if not race_list or not link:
        return _result(False, guard_type="denied_tool",
                       reasons=["race list and link are both required"],
                       tool="sms_compose")
    text = (f"Your Florida voter brief is ready. Races covered: "
            f"{', '.join(race_list)}. Read it here: {link}")
    if len(text) > SMS_MAX_CHARS:
        return _result(
            False, guard_type="denied_tool",
            reasons=[f"composed SMS is {len(text)} chars — the PRD §8 cap "
                     f"is {SMS_MAX_CHARS}; shorten the race list or link"],
            tool="sms_compose",
        )
    return _result(True, tool="sms_compose", sms_text=text)


def mark_composed(
    state: Mapping[str, Any], brief_html: str, sms_text: str,
) -> dict[str, Any]:
    """Step 4 PASS branch: attach the composed brief + SMS. Blocked unless
    the latest audit PASSed — a HALTed race is never composed."""
    if state["state"] != "audited_pass":
        return _blocked(state, "compose",
                        [f"composition is blocked from state "
                         f"'{state['state']}' — only a PASS race is "
                         "composed (blueprint step 4)"])
    reasons: list[str] = []
    if not (brief_html or "").strip():
        reasons.append("brief_html is empty")
    if not (sms_text or "").strip():
        reasons.append("sms_text is empty")
    elif len(sms_text) > SMS_MAX_CHARS:
        reasons.append(f"sms_text is {len(sms_text)} chars (cap "
                       f"{SMS_MAX_CHARS})")
    if reasons:
        return _blocked(state, "compose", reasons)
    new = deepcopy(dict(state))
    new["brief_html"] = brief_html
    new["sms_text"] = sms_text
    new["state"] = "composed"
    return _result(True, tool="compose", race_id=state["race_id"],
                   state=new, surfaced_flags=list(new["flags"]))


# ---------------------------------------------------------------------------
# Step 5 — human review gate (PRD §6.4)
# ---------------------------------------------------------------------------

def record_human_review(
    state: Mapping[str, Any], *, approved: bool, reviewer: str,
) -> dict[str, Any]:
    """Step 5: the project owner reviews final HTML + SMS + any raised
    flags. This core records the decision; it can never manufacture one —
    `approved` must be an explicit boolean from the human."""
    if state["state"] != "composed":
        return _blocked(state, "human_review",
                        [f"nothing to review from state "
                         f"'{state['state']}' — the race must be composed "
                         "(blueprint step 5)"])
    if not isinstance(approved, bool):
        return _blocked(state, "human_review",
                        ["approved must be an explicit boolean from the "
                         "human reviewer"])
    if not (reviewer or "").strip():
        return _blocked(state, "human_review", ["reviewer is required"])
    new = deepcopy(dict(state))
    new["review"] = {"approved": approved, "reviewer": reviewer,
                     "flags_surfaced": list(state["flags"])}
    if approved:
        new["state"] = "approved"
    # A rejection leaves the race in 'composed' — recompose or re-review.
    return _result(True, tool="human_review", race_id=state["race_id"],
                   state=new)


# ---------------------------------------------------------------------------
# Step 6 — dispatch gate (the load-bearing guard)
# ---------------------------------------------------------------------------

def check_dispatch(
    state: Mapping[str, Any], *, recipient: str, owner_phone: str,
) -> dict[str, Any]:
    """The gate in front of sms_dispatch (T12).

    ALL of the following must hold, or the call is denied with a
    guard_triggered log row:
      - race state is 'approved' (human gate passed, PRD §6.4);
      - the LATEST balance_audit verdict is PASS (re-checked here —
        sms_dispatch is unreachable while a race is in HALT);
      - the human review on record says approved;
      - recipient == owner_phone (Twilio trial, owner phone only).
    """
    reasons: list[str] = []
    audit = state.get("latest_audit") or {}
    if audit.get("verdict") != "PASS":
        reasons.append(
            f"latest balance_audit verdict is "
            f"'{audit.get('verdict')}' — sms_dispatch is unreachable "
            "unless the latest audit PASSed (blueprint hard invariant)"
        )
    if state["state"] != "approved":
        reasons.append(f"race state is '{state['state']}' — dispatch "
                       "requires the human review gate (state 'approved')")
    review = state.get("review") or {}
    if review.get("approved") is not True:
        reasons.append("no affirmative human approval on record")
    if not owner_phone or recipient != owner_phone:
        reasons.append(f"recipient '{recipient}' is not the owner phone — "
                       "Twilio trial sends go to the owner only (PRD §6.4)")
    if not (state.get("sms_text") or "").strip():
        reasons.append("no composed sms_text on the race")
    if reasons:
        return _blocked(state, "sms_dispatch", reasons)
    return _result(True, tool="sms_dispatch", race_id=state["race_id"],
                   state=deepcopy(dict(state)))


def mark_dispatched(
    state: Mapping[str, Any], *, recipient: str, owner_phone: str,
) -> dict[str, Any]:
    """Terminal transition: re-runs check_dispatch, then marks the race
    dispatched. The wrapper calls this only after Twilio confirms."""
    gate = check_dispatch(state, recipient=recipient, owner_phone=owner_phone)
    if not gate["ok"]:
        return gate
    new = deepcopy(dict(state))
    new["dispatched_to"] = recipient
    new["state"] = "dispatched"
    gate["state"] = new
    return gate
