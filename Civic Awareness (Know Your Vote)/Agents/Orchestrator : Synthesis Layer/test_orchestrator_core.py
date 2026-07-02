"""Tests for orchestrator_core (Orchestrator / Synthesis Layer).

stdlib only. Covers: tool grants (I1), the state machine sequencing,
the audit branch + Profile write-back, flags-never-halt, the human
review gate, and the dispatch gate (I2/I3).
"""

from __future__ import annotations

import unittest

import orchestrator_core as oc

RACE = "FL-28-general"
CANDS = ["cand_001", "cand_002"]
OWNER = "+15550001111"

SPINE = [
    {"issue_id": "iss_econ", "tier": "spine", "candidate_id": None,
     "label": "Economy & cost of living",
     "justification": "Top issue in FL-28 per Census/BLS district profile"},
    {"issue_id": "iss_env", "tier": "spine", "candidate_id": None,
     "label": "Environment & water policy",
     "justification": "Everglades funding votes on record in flsenate.gov"},
]


def pass_audit(flags=None, flagged_at=None):
    r = {"verdict": "PASS", "race_id": RACE,
         "metrics": {}, "flags": list(flags or [])}
    if flags:
        r["flagged_at"] = flagged_at or "2026-07-01T12:00:00Z"
    return r


def halt_audit():
    return {
        "verdict": "HALT", "race_id": RACE,
        "breached_metrics": ["fact_checks"],
        "metrics": {"fact_checks": {
            "min": 4, "max": 6, "variance_pct": 33.3, "threshold": 10,
            "kind": "gate", "breach": True,
            "candidates": {"low": "cand_002", "high": "cand_001"},
        }},
        "flags": [], "flagged_at": "2026-07-01T12:00:00Z",
    }


def run_to_agents_done(state=None):
    state = state or oc.new_race_state(RACE, CANDS)
    state = oc.log_spine_issues(state, SPINE)["state"]
    state = oc.start_agents(state)["state"]
    for cid in CANDS:
        for agent in sorted(oc.RACE_AGENTS):
            state = oc.agent_finished(state, cid, agent)["state"]
    return state


def run_to_approved():
    state = run_to_agents_done()
    state = oc.apply_audit_result(state, pass_audit())["state"]
    state = oc.mark_composed(state, "<html>brief</html>", "sms ok")["state"]
    state = oc.record_human_review(
        state, approved=True, reviewer="owner")["state"]
    return state


class ToolAccess(unittest.TestCase):
    def test_granted(self):
        for tool in ("doe_file_intake", "jurisdiction_resolve", "db_read",
                     "balance_audit", "sms_dispatch"):
            r = oc.check_tool_access(tool)
            self.assertTrue(r["ok"], tool)
            self.assertFalse(r["log"]["guard_triggered"])

    def test_claim_write_hard_denied(self):
        r = oc.check_tool_access("claim_write")
        self.assertFalse(r["ok"])
        self.assertEqual(r["guard_type"], "denied_tool")
        self.assertIn("never writes claims", r["reasons"][0])
        self.assertTrue(r["log"]["guard_triggered"])

    def test_denied_tools(self):
        for tool in ("web_search", "fetch_source", "fec_api_query",
                     "fl_legislature_query", "source_register"):
            r = oc.check_tool_access(tool)
            self.assertFalse(r["ok"], tool)
            self.assertEqual(r["guard_type"], "denied_tool")

    def test_log_action_not_agent_callable(self):
        self.assertFalse(oc.check_tool_access("log_action")["ok"])

    def test_unknown_tool(self):
        r = oc.check_tool_access("rm_rf")
        self.assertFalse(r["ok"])
        self.assertIn("unknown tool", r["reasons"][0])

    def test_db_read_all_buckets(self):
        r = oc.check_db_read(sorted(oc.VALID_BUCKETS))
        self.assertTrue(r["ok"])

    def test_db_read_unknown_bucket(self):
        self.assertFalse(oc.check_db_read(["stated_position", "vibes"])["ok"])

    def test_orchestrator_never_logs_a_bucket_write(self):
        # Every log row this core emits has bucket_written=None (I1).
        r = oc.check_tool_access("db_read")
        self.assertIsNone(r["log"]["bucket_written"])


class SpineLogging(unittest.TestCase):
    def test_spine_required_before_agents(self):
        state = oc.new_race_state(RACE, CANDS)
        r = oc.start_agents(state)
        self.assertFalse(r["ok"])
        self.assertIn("spine issue set must be logged first", r["reasons"][0])

    def test_spine_logs_and_advances(self):
        state = oc.new_race_state(RACE, CANDS)
        r = oc.log_spine_issues(state, SPINE)
        self.assertTrue(r["ok"])
        self.assertEqual(r["state"]["state"], "spine_logged")
        self.assertEqual(r["log"]["tool_called"], "spine_select")
        self.assertEqual(r["log"]["race_id"], RACE)

    def test_empty_spine_rejected(self):
        state = oc.new_race_state(RACE, CANDS)
        self.assertFalse(oc.log_spine_issues(state, [])["ok"])

    def test_candidate_tier_issue_rejected(self):
        bad = [dict(SPINE[0], tier="candidate", candidate_id="cand_001")]
        r = oc.log_spine_issues(oc.new_race_state(RACE, CANDS), bad)
        self.assertFalse(r["ok"])

    def test_unjustified_issue_rejected(self):
        bad = [dict(SPINE[0], justification="")]
        r = oc.log_spine_issues(oc.new_race_state(RACE, CANDS), bad)
        self.assertFalse(r["ok"])
        self.assertIn("transparent", r["reasons"][0])

    def test_spine_cannot_be_relogged(self):
        state = oc.log_spine_issues(oc.new_race_state(RACE, CANDS),
                                    SPINE)["state"]
        self.assertFalse(oc.log_spine_issues(state, SPINE)["ok"])


class AgentTracking(unittest.TestCase):
    def test_three_agents_per_candidate(self):
        state = oc.log_spine_issues(oc.new_race_state(RACE, CANDS),
                                    SPINE)["state"]
        r = oc.start_agents(state)
        self.assertTrue(r["ok"])
        self.assertEqual(len(r["state"]["pending_agents"]),
                         3 * len(CANDS))

    def test_all_must_finish(self):
        state = run_to_agents_done()
        self.assertEqual(state["state"], "agents_done")
        self.assertEqual(state["pending_agents"], [])

    def test_double_finish_rejected(self):
        state = oc.start_agents(
            oc.log_spine_issues(oc.new_race_state(RACE, CANDS),
                                SPINE)["state"])["state"]
        state = oc.agent_finished(state, "cand_001", "profiler")["state"]
        r = oc.agent_finished(state, "cand_001", "profiler")
        self.assertFalse(r["ok"])

    def test_unknown_agent_rejected(self):
        state = oc.start_agents(
            oc.log_spine_issues(oc.new_race_state(RACE, CANDS),
                                SPINE)["state"])["state"]
        self.assertFalse(oc.agent_finished(state, "cand_001", "editor")["ok"])


class AuditBranch(unittest.TestCase):
    def test_audit_blocked_until_agents_done(self):
        state = oc.log_spine_issues(oc.new_race_state(RACE, CANDS),
                                    SPINE)["state"]
        r = oc.apply_audit_result(state, pass_audit())
        self.assertFalse(r["ok"])
        self.assertTrue(r["log"]["guard_triggered"])

    def test_pass_branch(self):
        r = oc.apply_audit_result(run_to_agents_done(), pass_audit())
        self.assertTrue(r["ok"])
        self.assertEqual(r["verdict"], "PASS")
        self.assertEqual(r["state"]["state"], "audited_pass")
        self.assertFalse(r["log"]["guard_triggered"])
        for cid in CANDS:
            u = r["profile_updates"][cid]
            self.assertTrue(u["balance_check_passed"])
            self.assertIsNone(u["flag_reason"])
            self.assertIsNone(u["flagged_at"])

    def test_halt_branch_blocks_and_is_countable(self):
        r = oc.apply_audit_result(run_to_agents_done(), halt_audit())
        self.assertTrue(r["ok"])  # the audit ran; the pipeline is blocked
        self.assertEqual(r["verdict"], "HALT")
        self.assertEqual(r["state"]["state"], "audited_halt")
        # I3 — every halt countable via log_action.guard_triggered.
        self.assertTrue(r["log"]["guard_triggered"])
        self.assertEqual(r["log"]["status"], "success")
        self.assertIn("fact_checks", r["reasons"][0])
        self.assertIn("low=cand_002", r["reasons"][0])
        for cid in CANDS:
            u = r["profile_updates"][cid]
            self.assertFalse(u["balance_check_passed"])
            self.assertEqual(u["flag_reason"], "scrutiny_halt")
            self.assertEqual(u["flagged_at"], "2026-07-01T12:00:00Z")

    def test_flags_alone_never_halt(self):
        r = oc.apply_audit_result(
            run_to_agents_done(),
            pass_audit(flags=["stated_position_asymmetry",
                              "issue_coverage_asymmetry"]))
        self.assertEqual(r["state"]["state"], "audited_pass")
        self.assertFalse(r["log"]["guard_triggered"])
        u = r["profile_updates"]["cand_001"]
        self.assertTrue(u["balance_check_passed"])
        # precedence: stated_position_asymmetry over issue_coverage.
        self.assertEqual(u["flag_reason"], "stated_position_asymmetry")
        self.assertIsNotNone(u["flagged_at"])

    def test_flag_precedence_halt_wins(self):
        result = halt_audit()
        result["flags"] = ["issue_coverage_asymmetry"]
        u = oc.profile_updates_from_audit(result, CANDS)["cand_001"]
        self.assertEqual(u["flag_reason"], "scrutiny_halt")

    def test_wrong_race_rejected(self):
        r = oc.apply_audit_result(run_to_agents_done(),
                                  dict(pass_audit(), race_id="FL-10"))
        self.assertFalse(r["ok"])

    def test_reaudit_after_halt(self):
        state = oc.apply_audit_result(run_to_agents_done(),
                                      halt_audit())["state"]
        r = oc.apply_audit_result(state, pass_audit())
        self.assertTrue(r["ok"])
        self.assertEqual(r["state"]["state"], "audited_pass")

    def test_fresh_audit_invalidates_composition(self):
        state = oc.apply_audit_result(run_to_agents_done(),
                                      pass_audit())["state"]
        state = oc.mark_composed(state, "<html/>", "sms")["state"]
        state = oc.apply_audit_result(state, halt_audit())["state"]
        self.assertIsNone(state["brief_html"])
        self.assertIsNone(state["review"])
        self.assertEqual(state["state"], "audited_halt")


class Composition(unittest.TestCase):
    def test_compose_blocked_on_halt(self):
        state = oc.apply_audit_result(run_to_agents_done(),
                                      halt_audit())["state"]
        r = oc.mark_composed(state, "<html/>", "sms")
        self.assertFalse(r["ok"])
        self.assertTrue(r["log"]["guard_triggered"])

    def test_compose_blocked_before_audit(self):
        r = oc.mark_composed(run_to_agents_done(), "<html/>", "sms")
        self.assertFalse(r["ok"])

    def test_compose_surfaces_flags(self):
        state = oc.apply_audit_result(
            run_to_agents_done(),
            pass_audit(flags=["issue_coverage_asymmetry"]))["state"]
        r = oc.mark_composed(state, "<html/>", "sms")
        self.assertTrue(r["ok"])
        self.assertEqual(r["surfaced_flags"], ["issue_coverage_asymmetry"])

    def test_oversized_sms_rejected(self):
        state = oc.apply_audit_result(run_to_agents_done(),
                                      pass_audit())["state"]
        self.assertFalse(oc.mark_composed(state, "<html/>", "x" * 161)["ok"])

    def test_compose_sms_template_and_cap(self):
        r = oc.compose_sms(["FL-28 General"], "https://cap.example/fl-28")
        self.assertTrue(r["ok"])
        self.assertLessEqual(len(r["sms_text"]), oc.SMS_MAX_CHARS)
        self.assertIn("FL-28 General", r["sms_text"])
        long = oc.compose_sms(["A" * 200], "https://cap.example/x")
        self.assertFalse(long["ok"])


class HumanGateAndDispatch(unittest.TestCase):
    def test_review_requires_composed(self):
        state = oc.apply_audit_result(run_to_agents_done(),
                                      pass_audit())["state"]
        r = oc.record_human_review(state, approved=True, reviewer="owner")
        self.assertFalse(r["ok"])

    def test_rejection_stays_composed(self):
        state = oc.apply_audit_result(run_to_agents_done(),
                                      pass_audit())["state"]
        state = oc.mark_composed(state, "<html/>", "sms")["state"]
        r = oc.record_human_review(state, approved=False, reviewer="owner")
        self.assertTrue(r["ok"])
        self.assertEqual(r["state"]["state"], "composed")

    def test_full_happy_path_dispatch(self):
        state = run_to_approved()
        r = oc.mark_dispatched(state, recipient=OWNER, owner_phone=OWNER)
        self.assertTrue(r["ok"])
        self.assertEqual(r["state"]["state"], "dispatched")
        self.assertEqual(r["state"]["dispatched_to"], OWNER)

    def test_dispatch_unreachable_in_halt(self):
        # I2 — even with a forged 'approved' review, a HALT race is blocked.
        state = oc.apply_audit_result(run_to_agents_done(),
                                      halt_audit())["state"]
        state["review"] = {"approved": True, "reviewer": "forged"}
        state["sms_text"] = "forged"
        state["state"] = "approved"  # forge the state too
        r = oc.check_dispatch(state, recipient=OWNER, owner_phone=OWNER)
        self.assertFalse(r["ok"])
        self.assertIn("unreachable", r["reasons"][0])
        self.assertTrue(r["log"]["guard_triggered"])

    def test_dispatch_requires_human_approval(self):
        state = oc.apply_audit_result(run_to_agents_done(),
                                      pass_audit())["state"]
        state = oc.mark_composed(state, "<html/>", "sms")["state"]
        r = oc.check_dispatch(state, recipient=OWNER, owner_phone=OWNER)
        self.assertFalse(r["ok"])

    def test_dispatch_owner_phone_only(self):
        state = run_to_approved()
        r = oc.check_dispatch(state, recipient="+15559998888",
                              owner_phone=OWNER)
        self.assertFalse(r["ok"])
        self.assertIn("owner", r["reasons"][0])

    def test_no_double_dispatch(self):
        state = oc.mark_dispatched(run_to_approved(), recipient=OWNER,
                                   owner_phone=OWNER)["state"]
        r = oc.check_dispatch(state, recipient=OWNER, owner_phone=OWNER)
        self.assertFalse(r["ok"])


class StatePurity(unittest.TestCase):
    def test_inputs_not_mutated(self):
        state = oc.new_race_state(RACE, CANDS)
        before = dict(state)
        oc.log_spine_issues(state, SPINE)
        self.assertEqual(state, before)

    def test_new_race_state_validation(self):
        with self.assertRaises(ValueError):
            oc.new_race_state("", CANDS)
        with self.assertRaises(ValueError):
            oc.new_race_state(RACE, [])
        with self.assertRaises(ValueError):
            oc.new_race_state(RACE, ["a", "a"])


if __name__ == "__main__":
    unittest.main()
