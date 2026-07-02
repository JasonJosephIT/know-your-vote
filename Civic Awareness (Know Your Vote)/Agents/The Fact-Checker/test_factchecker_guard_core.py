"""Tests for factchecker_guard_core — grants/denials, cross-bucket read,
lean-tag rule, the three claim_write halt paths, verdict scale, >=2 Tier-1
rule, and the output contract. Stdlib only."""

import unittest

from factchecker_guard_core import (
    check_db_read, check_tool_access,
    validate_claim_write, validate_source_register,
)

# Registered-source fixture the wrapper would pass (source_id -> row).
SOURCES = {
    "s_fec1": {"url": "https://www.fec.gov/data/filing/111", "type": "primary_doc"},
    "s_fec2": {"url": "https://www.fec.gov/data/filing/222", "type": "primary_doc"},
    "s_cong": {"url": "https://www.congress.gov/bill/119/hr1", "type": "primary_doc"},
    "s_pfct": {"url": "https://www.politifact.com/factchecks/x",
               "type": "factual_reporting"},
    "s_self": {"url": "https://janedoeforcongress.com/issues/taxes",
               "type": "candidate_self"},
}


def fact_claim(**over):
    claim = {
        "claim_id": "clm_100",
        "candidate_id": "cand_001",
        "race_id": "FL-28-general",
        "issue_id": "iss_taxes",
        "text": "Voted for HB 1 in 2025.",
        "bucket": "verifiable_fact",
        "attributed": True,
        "derived_from": "clm_001",
        "verdict": "accurate",
        "verification": "verified",
        "source_ids": ["s_fec1", "s_cong"],
    }
    claim.update(over)
    return claim


def opinion_claim(**over):
    claim = {
        "claim_id": "clm_101",
        "candidate_id": "cand_001",
        "race_id": "FL-28-general",
        "issue_id": "iss_taxes",
        "text": "Taxes are too high.",
        "bucket": "outside_opinion",
        "attributed": True,
        "derived_from": "clm_001",
        "verdict": None,
        "verification": "single_source",
        "source_ids": ["s_self"],
    }
    claim.update(over)
    return claim


class TestToolAccess(unittest.TestCase):
    def test_granted(self):
        for tool in ("web_search", "fetch_source", "fec_api_query",
                     "fl_legislature_query", "doe_file_intake",
                     "source_register", "db_read", "claim_write"):
            self.assertTrue(check_tool_access(tool)["ok"], tool)

    def test_balance_audit_hard_denied(self):
        r = check_tool_access("balance_audit")
        self.assertFalse(r["ok"])
        self.assertEqual(r["guard_type"], "denied_tool")
        self.assertIn("hard-denied", r["reasons"][0])

    def test_sms_dispatch_hard_denied(self):
        r = check_tool_access("sms_dispatch")
        self.assertFalse(r["ok"])
        self.assertIn("hard-denied", r["reasons"][0])

    def test_log_action_not_agent_callable(self):
        self.assertFalse(check_tool_access("log_action")["ok"])

    def test_jurisdiction_resolve_denied(self):
        self.assertFalse(check_tool_access("jurisdiction_resolve")["ok"])

    def test_unknown_tool_denied(self):
        r = check_tool_access("rm_rf")
        self.assertFalse(r["ok"])
        self.assertIn("unknown tool", r["reasons"][0])


class TestDbRead(unittest.TestCase):
    def test_cross_bucket_read_allowed(self):
        r = check_db_read(
            ["stated_position", "verifiable_fact", "outside_opinion"]
        )
        self.assertTrue(r["ok"])

    def test_unknown_bucket_rejected(self):
        r = check_db_read(["stated_position", "secret_bucket"])
        self.assertFalse(r["ok"])
        self.assertEqual(r["guard_type"], "bucket")


class TestSourceRegister(unittest.TestCase):
    def test_any_type_allowed_with_lean_tag(self):
        for t in ("primary_doc", "factual_reporting", "opinion",
                  "candidate_self"):
            r = validate_source_register({"type": t, "lean_tag": "N/A"})
            self.assertTrue(r["ok"], t)

    def test_missing_lean_tag_rejected(self):
        r = validate_source_register({"type": "primary_doc"})
        self.assertFalse(r["ok"])
        self.assertIn("lean_tag", r["reasons"][0])

    def test_invalid_lean_tag_rejected(self):
        r = validate_source_register(
            {"type": "primary_doc", "lean_tag": "far-left"}
        )
        self.assertFalse(r["ok"])

    def test_invalid_type_rejected(self):
        r = validate_source_register({"type": "blog", "lean_tag": "N/A"})
        self.assertFalse(r["ok"])


class TestClaimWriteHalts(unittest.TestCase):
    def test_h1_stated_position_write_halts(self):
        r = validate_claim_write(fact_claim(bucket="stated_position"), SOURCES)
        self.assertFalse(r["ok"])
        self.assertTrue(r["halt"])
        self.assertEqual(r["guard_type"], "bucket")
        self.assertIn("self-portrait", r["reasons"][0])

    def test_h1_invalid_bucket_halts(self):
        r = validate_claim_write(fact_claim(bucket="misc"), SOURCES)
        self.assertFalse(r["ok"])
        self.assertTrue(r["halt"])

    def test_h2_rated_opinion_halts(self):
        r = validate_claim_write(opinion_claim(verdict="accurate"), SOURCES)
        self.assertFalse(r["ok"])
        self.assertTrue(r["halt"])
        self.assertIn("unrated", r["reasons"][0])

    def test_h3_verdict_on_one_tier1_halts(self):
        r = validate_claim_write(
            fact_claim(source_ids=["s_fec1", "s_pfct"]), SOURCES
        )
        self.assertFalse(r["ok"])
        self.assertTrue(r["halt"])
        self.assertIn("'unverifiable'", r["reasons"][0])

    def test_h3_same_tier1_doc_twice_is_not_independent(self):
        dup = dict(SOURCES)
        dup["s_fec1b"] = {"url": "https://www.fec.gov/data/filing/111/",
                          "type": "primary_doc"}
        r = validate_claim_write(
            fact_claim(source_ids=["s_fec1", "s_fec1b"]), dup
        )
        self.assertFalse(r["ok"])
        self.assertTrue(r["halt"])

    def test_h3_tier2_only_halts(self):
        r = validate_claim_write(
            fact_claim(source_ids=["s_pfct"]), SOURCES
        )
        self.assertFalse(r["ok"])
        self.assertTrue(r["halt"])


class TestClaimWriteContract(unittest.TestCase):
    def test_valid_fact_verdict_passes(self):
        r = validate_claim_write(fact_claim(), SOURCES)
        self.assertTrue(r["ok"], r["reasons"])
        self.assertEqual(r["log"]["bucket_written"], "verifiable_fact")

    def test_valid_unrated_opinion_passes(self):
        r = validate_claim_write(opinion_claim(), SOURCES)
        self.assertTrue(r["ok"], r["reasons"])
        self.assertEqual(r["log"]["bucket_written"], "outside_opinion")

    def test_unverifiable_needs_no_tier1(self):
        r = validate_claim_write(
            fact_claim(verdict="unverifiable", verification="unverified",
                       source_ids=["s_pfct"]),
            SOURCES,
        )
        self.assertTrue(r["ok"], r["reasons"])

    def test_null_verdict_on_fact_rejected_not_halted(self):
        r = validate_claim_write(fact_claim(verdict=None), SOURCES)
        self.assertFalse(r["ok"])
        self.assertFalse(r["halt"])
        self.assertIn("six-value scale", r["reasons"][0])

    def test_display_label_rejected_storage_enum_required(self):
        r = validate_claim_write(fact_claim(verdict="Mostly Accurate"), SOURCES)
        self.assertFalse(r["ok"])
        self.assertFalse(r["halt"])

    def test_verdict_requires_verified_verification(self):
        r = validate_claim_write(
            fact_claim(verification="single_source"), SOURCES
        )
        self.assertFalse(r["ok"])
        self.assertFalse(r["halt"])

    def test_verified_label_with_insufficient_tier1_rejected(self):
        r = validate_claim_write(
            fact_claim(verdict="unverifiable", verification="verified",
                       source_ids=["s_fec1"]),
            SOURCES,
        )
        self.assertFalse(r["ok"])
        self.assertFalse(r["halt"])

    def test_no_sources_rejected(self):
        r = validate_claim_write(
            fact_claim(verdict="unverifiable", verification="unverified",
                       source_ids=[]),
            SOURCES,
        )
        self.assertFalse(r["ok"])
        self.assertIn("no source_ids", r["reasons"][0])

    def test_unregistered_source_rejected(self):
        r = validate_claim_write(
            fact_claim(source_ids=["s_fec1", "s_cong", "s_ghost"]), SOURCES
        )
        self.assertFalse(r["ok"])
        self.assertTrue(any("not registered" in x for x in r["reasons"]))

    def test_candidate_self_source_allowed_in_split_lineage(self):
        r = validate_claim_write(
            fact_claim(source_ids=["s_fec1", "s_cong", "s_self"]), SOURCES
        )
        self.assertTrue(r["ok"], r["reasons"])

    def test_attributed_must_be_boolean(self):
        r = validate_claim_write(fact_claim(attributed="yes"), SOURCES)
        self.assertFalse(r["ok"])
        r2 = validate_claim_write(fact_claim(attributed=None), SOURCES)
        self.assertFalse(r2["ok"])

    def test_attributed_false_is_lawful(self):
        r = validate_claim_write(fact_claim(attributed=False), SOURCES)
        self.assertTrue(r["ok"], r["reasons"])

    def test_empty_text_rejected(self):
        r = validate_claim_write(fact_claim(text="  "), SOURCES)
        self.assertFalse(r["ok"])

    def test_missing_ids_rejected(self):
        r = validate_claim_write(fact_claim(claim_id=None), SOURCES)
        self.assertFalse(r["ok"])

    def test_fail_log_row_shape(self):
        r = validate_claim_write(fact_claim(bucket="stated_position"), SOURCES)
        log = r["log"]
        self.assertEqual(log["agent_id"], "factchecker")
        self.assertEqual(log["tool_called"], "claim_write")
        self.assertIsNone(log["bucket_written"])
        self.assertEqual(log["status"], "fail")
        self.assertTrue(log["guard_triggered"])
        self.assertEqual(log["guard_type"], "bucket")


if __name__ == "__main__":
    unittest.main()
