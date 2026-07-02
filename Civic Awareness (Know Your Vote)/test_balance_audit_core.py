"""
Tests for balance_audit_core (v1.1) — stdlib unittest, no dependencies.

Run:  python3 -m unittest -v test_balance_audit_core.py

Covers the split metrics (verifiable_fact gate vs stated_position flag), the
spine-issue coverage flag, the masked-scrutiny case the split exists to catch,
plus the dilution guarantee, opinion exclusion, threshold boundary, and
zero-division safety.
"""

import statistics
import unittest

from balance_audit_core import balance_audit_core


def claims(n):
    return [f"c{i}" for i in range(n)]


def profile(cid, race, wc, facts, positions, fc, covered, opinions=0):
    """facts -> verifiable_fact claims; positions -> stated_position claims."""
    return {
        "candidate_id": cid,
        "race_id": race,
        "facts": claims(facts),
        "positions": claims(positions),
        "opinions": claims(opinions),
        "audit": {
            "word_count": wc,
            "fact_checks_performed": fc,
            "spine_issues_covered": covered,
        },
    }


class TestBalanceAuditCore(unittest.TestCase):

    def test_two_candidate_pass_no_flags(self):
        profiles = [
            profile("cand_001", "FL-28-general", 455, 5, 4, 5, 4, opinions=3),
            profile("cand_002", "FL-28-general", 412, 5, 4, 5, 4, opinions=2),
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "PASS")
        self.assertEqual(r["flags"], [])
        self.assertEqual(r["metrics"]["word_count"]["variance_pct"], 9.5)
        self.assertEqual(r["metrics"]["verifiable_fact_count"]["variance_pct"], 0.0)
        self.assertEqual(r["metrics"]["fact_checks"]["variance_pct"], 0.0)
        self.assertFalse(r["metrics"]["spine_issue_coverage"]["flagged"])
        self.assertNotIn("flagged_at", r)

    def test_split_catches_masked_scrutiny_gap(self):
        # THE reason to split. Old blended claim_count: A=12+3=15, B=6+9=15 -> 0% PASS.
        # Split: verifiable_fact_count 12 vs 6 -> 50% -> HALT.
        profiles = [
            profile("cand_020", "FL-15-general", 440, 12, 3, 5, 4),
            profile("cand_021", "FL-15-general", 445, 6, 9, 5, 4),
        ]
        r = balance_audit_core(profiles, now="2026-06-29T14:02:00Z")
        self.assertEqual(r["verdict"], "HALT")
        self.assertIn("verifiable_fact_count", r["breached_metrics"])
        vf = r["metrics"]["verifiable_fact_count"]
        self.assertEqual(vf["variance_pct"], 50.0)
        self.assertEqual(vf["candidates"], {"low": "cand_021", "high": "cand_020"})
        # stated_position is a FLAG, not a gate: it does not appear in breached_metrics.
        self.assertNotIn("stated_position_count", r["breached_metrics"])
        self.assertIn("stated_position_asymmetry", r["flags"])

    def test_stated_position_flag_does_not_halt(self):
        # Equal scrutiny (verifiable_fact, fact_checks) but unequal self-portrait.
        # Must PASS with a flag, never HALT.
        profiles = [
            profile("cand_a", "OP-general", 400, 6, 3, 5, 4),
            profile("cand_b", "OP-general", 400, 6, 9, 5, 4),
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "PASS")
        self.assertTrue(r["metrics"]["stated_position_count"]["flagged"])
        self.assertIn("stated_position_asymmetry", r["flags"])
        self.assertIn("flagged_at", r)  # flags set flagged_at even on PASS

    def test_issue_coverage_flag(self):
        # One candidate covers 4 spine issues, the other 3 -> flag, still PASS.
        profiles = [
            profile("cand_x", "COV-general", 400, 6, 4, 5, 4),
            profile("cand_y", "COV-general", 400, 6, 4, 5, 3),
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "PASS")
        cov = r["metrics"]["spine_issue_coverage"]
        self.assertTrue(cov["flagged"])
        self.assertEqual(cov["gap"], 1)
        self.assertEqual(cov["candidates"], {"low": "cand_y", "high": "cand_x"})
        self.assertIn("issue_coverage_asymmetry", r["flags"])

    def test_verifiable_fact_gate_halts(self):
        profiles = [
            profile("cand_020", "FL-15-general", 430, 6, 4, 5, 4),
            profile("cand_021", "FL-15-general", 445, 4, 4, 5, 4),
        ]
        r = balance_audit_core(profiles, now="2026-06-29T14:02:00Z")
        self.assertEqual(r["verdict"], "HALT")
        self.assertEqual(r["breached_metrics"], ["verifiable_fact_count"])
        self.assertEqual(r["metrics"]["verifiable_fact_count"]["variance_pct"], 33.3)
        self.assertEqual(r["flagged_at"], "2026-06-29T14:02:00Z")

    def test_fact_check_dilution_case_is_caught(self):
        # [5,5,5,5,4] fact-checks: max-min HALTs (20%); CV (~8.3%) would not. Anti-dilution.
        fcs = [5, 5, 5, 5, 4]
        profiles = [
            profile(f"cand_{i}", "DIL-general", 400, 6, 4, fc, 4)
            for i, fc in enumerate(fcs)
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "HALT")
        self.assertEqual(r["metrics"]["fact_checks"]["variance_pct"], 20.0)
        cv = statistics.pstdev(fcs) / statistics.mean(fcs) * 100
        self.assertLess(round(cv, 1), 10)  # ~8.3% -> would wrongly PASS

    def test_three_candidate_pass(self):
        profiles = [
            profile("cand_010", "GOV-general", 520, 6, 5, 6, 5),
            profile("cand_011", "GOV-general", 498, 6, 5, 6, 5),
            profile("cand_012", "GOV-general", 505, 6, 5, 6, 5),
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "PASS")
        self.assertEqual(r["flags"], [])
        self.assertEqual(r["metrics"]["word_count"]["variance_pct"], 4.2)

    def test_opinions_excluded(self):
        # Wildly different opinion counts must not move any metric.
        profiles = [
            profile("cand_a", "OPX-general", 400, 6, 4, 5, 4, opinions=0),
            profile("cand_b", "OPX-general", 400, 6, 4, 5, 4, opinions=40),
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "PASS")
        self.assertEqual(r["flags"], [])
        self.assertEqual(r["metrics"]["verifiable_fact_count"]["variance_pct"], 0.0)
        self.assertEqual(r["metrics"]["stated_position_count"]["variance_pct"], 0.0)

    def test_threshold_boundary_is_not_a_breach(self):
        # verifiable_fact 10 vs 9 -> 10.0% < 15% -> PASS.
        profiles = [
            profile("cand_x", "EDGE-general", 400, 10, 4, 5, 4),
            profile("cand_y", "EDGE-general", 400, 9, 4, 5, 4),
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "PASS")
        self.assertFalse(r["metrics"]["verifiable_fact_count"]["breach"])

    def test_zero_values_no_division_error(self):
        profiles = [
            profile("cand_p", "ZERO-general", 400, 0, 0, 0, 0),
            profile("cand_q", "ZERO-general", 400, 0, 0, 0, 0),
        ]
        r = balance_audit_core(profiles)
        self.assertEqual(r["verdict"], "PASS")
        self.assertEqual(r["flags"], [])

    def test_empty_raises(self):
        with self.assertRaises(ValueError):
            balance_audit_core([])


if __name__ == "__main__":
    unittest.main(verbosity=2)
