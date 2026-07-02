"""
Tests for profiler_guard_core — stdlib unittest, no dependencies.

Run:  python3 -m unittest -v test_profiler_guard_core.py

Covers the Tool Spec §2 Profiler column (grants and denials), the own-bucket
db_read scope, source_register type restriction, and the claim_write guard:
wrong-bucket halt, "no Source -> dropped", candidate_self-only citations,
and the full output contract (attributed / verification / verdict / issue_id).
"""

import unittest

from profiler_guard_core import (
    check_db_read,
    check_tool_access,
    validate_claim_write,
    validate_source_register,
)

SOURCES = {
    "src_self_1": "candidate_self",
    "src_self_2": "candidate_self",
    "src_primary": "primary_doc",
}


def claim(**overrides):
    base = {
        "claim_id": "clm_001",
        "candidate_id": "cand_001",
        "race_id": "FL-28-general",
        "issue_id": "iss_econ",
        "text": "The campaign website states support for X.",
        "bucket": "stated_position",
        "attributed": True,
        "derived_from": None,
        "verdict": None,
        "verification": "single_source",
        "source_ids": ["src_self_1"],
    }
    base.update(overrides)
    return base


class TestToolAccess(unittest.TestCase):

    def test_granted_tools(self):
        for tool in ("web_search", "fetch_source", "source_register",
                     "db_read", "claim_write"):
            self.assertTrue(check_tool_access(tool)["ok"], tool)

    def test_denied_tools(self):
        for tool in ("fec_api_query", "fl_legislature_query", "balance_audit",
                     "sms_dispatch", "doe_file_intake", "jurisdiction_resolve",
                     "log_action"):
            r = check_tool_access(tool)
            self.assertFalse(r["ok"], tool)
            self.assertEqual(r["guard_type"], "denied_tool")
            self.assertFalse(r["halt"])

    def test_unknown_tool_denied(self):
        r = check_tool_access("raw_http")
        self.assertFalse(r["ok"])
        self.assertEqual(r["guard_type"], "denied_tool")

    def test_denial_log_row(self):
        log = check_tool_access("fec_api_query")["log"]
        self.assertEqual(log["agent_id"], "profiler")
        self.assertEqual(log["status"], "fail")
        self.assertTrue(log["guard_triggered"])
        self.assertEqual(log["guard_type"], "denied_tool")


class TestDbRead(unittest.TestCase):

    def test_own_bucket_ok(self):
        self.assertTrue(check_db_read(["stated_position"])["ok"])

    def test_cross_bucket_rejected(self):
        r = check_db_read(["stated_position", "verifiable_fact"])
        self.assertFalse(r["ok"])
        self.assertEqual(r["guard_type"], "bucket")


class TestSourceRegister(unittest.TestCase):

    def test_candidate_self_ok(self):
        self.assertTrue(
            validate_source_register({"type": "candidate_self"})["ok"]
        )

    def test_other_types_rejected(self):
        for t in ("primary_doc", "factual_reporting", "opinion", None):
            r = validate_source_register({"type": t})
            self.assertFalse(r["ok"], t)
            self.assertTrue(r["log"]["guard_triggered"])


class TestClaimWrite(unittest.TestCase):

    def test_valid_claim_passes(self):
        r = validate_claim_write(claim(), SOURCES)
        self.assertTrue(r["ok"])
        self.assertFalse(r["halt"])
        self.assertEqual(r["log"]["bucket_written"], "stated_position")
        self.assertEqual(r["log"]["status"], "success")

    def test_multi_source_claim_passes(self):
        r = validate_claim_write(
            claim(source_ids=["src_self_1", "src_self_2"]), SOURCES
        )
        self.assertTrue(r["ok"])

    def test_wrong_bucket_halts(self):
        for bucket in ("verifiable_fact", "outside_opinion"):
            r = validate_claim_write(claim(bucket=bucket), SOURCES)
            self.assertFalse(r["ok"], bucket)
            self.assertTrue(r["halt"], bucket)
            self.assertEqual(r["guard_type"], "bucket")

    def test_invalid_bucket_halts(self):
        r = validate_claim_write(claim(bucket="opinions"), SOURCES)
        self.assertFalse(r["ok"])
        self.assertTrue(r["halt"])

    def test_no_source_dropped(self):
        r = validate_claim_write(claim(source_ids=[]), SOURCES)
        self.assertFalse(r["ok"])
        self.assertFalse(r["halt"])  # rejected, not a pipeline halt
        self.assertIn("no Source", r["reasons"][0])

    def test_unregistered_source_rejected(self):
        r = validate_claim_write(claim(source_ids=["src_ghost"]), SOURCES)
        self.assertFalse(r["ok"])

    def test_non_self_source_rejected(self):
        r = validate_claim_write(claim(source_ids=["src_primary"]), SOURCES)
        self.assertFalse(r["ok"])

    def test_contract_violations_rejected(self):
        bad = [
            claim(attributed=False),
            claim(verification="verified"),
            claim(verdict="accurate"),
            claim(issue_id=None),
            claim(text="   "),
            claim(candidate_id=None),
        ]
        for c in bad:
            r = validate_claim_write(c, SOURCES)
            self.assertFalse(r["ok"], r["reasons"])
            self.assertFalse(r["halt"])

    def test_reject_log_never_reports_bucket_written(self):
        r = validate_claim_write(claim(source_ids=[]), SOURCES)
        self.assertIsNone(r["log"]["bucket_written"])


if __name__ == "__main__":
    unittest.main()
