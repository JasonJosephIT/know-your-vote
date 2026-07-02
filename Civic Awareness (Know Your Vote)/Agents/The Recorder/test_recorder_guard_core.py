"""Tests for recorder_guard_core (Record agent / Agent 2 wrapper guards)."""

import unittest

import recorder_guard_core as g


def base_claim(**overrides):
    claim = {
        "claim_id": "clm-1",
        "candidate_id": "cand-1",
        "race_id": "FL-15",
        "issue_id": "iss-budget",
        "text": "Voted NAY on SB 123 on 2025-03-04.",
        "bucket": "verifiable_fact",
        "attributed": False,
        "verdict": None,
        "verification": "verified",
        "source_ids": ["src-1"],
    }
    claim.update(overrides)
    return claim


SOURCES = {"src-1": "primary_doc", "src-2": "primary_doc",
           "src-news": "news", "src-self": "candidate_self"}


class ToolAccessTests(unittest.TestCase):
    def test_granted_tools(self):
        for tool in ("doe_file_intake", "fec_api_query",
                     "fl_legislature_query", "source_register",
                     "db_read", "claim_write"):
            res = g.check_tool_access(tool)
            self.assertTrue(res["ok"], tool)
            self.assertFalse(res["halt"])
            self.assertEqual(res["log"]["agent_id"], "record")

    def test_web_search_hard_denied(self):
        res = g.check_tool_access("web_search")
        self.assertFalse(res["ok"])
        self.assertEqual(res["guard_type"], "denied_tool")
        self.assertIn("hard-denied", res["reasons"][0])

    def test_fetch_source_hard_denied(self):
        res = g.check_tool_access("fetch_source")
        self.assertFalse(res["ok"])
        self.assertEqual(res["guard_type"], "denied_tool")
        self.assertIn("hard-denied", res["reasons"][0])

    def test_other_denied_tools(self):
        for tool in ("balance_audit", "sms_dispatch",
                     "jurisdiction_resolve", "log_action"):
            res = g.check_tool_access(tool)
            self.assertFalse(res["ok"], tool)
            self.assertEqual(res["guard_type"], "denied_tool")

    def test_unknown_tool_denied(self):
        res = g.check_tool_access("rm_rf")
        self.assertFalse(res["ok"])
        self.assertIn("unknown tool", res["reasons"][0])

    def test_denial_is_logged_as_fail(self):
        res = g.check_tool_access("web_search")
        self.assertEqual(res["log"]["status"], "fail")
        self.assertTrue(res["log"]["guard_triggered"])


class DbReadTests(unittest.TestCase):
    def test_own_bucket_ok(self):
        self.assertTrue(g.check_db_read(["verifiable_fact"])["ok"])

    def test_other_bucket_rejected(self):
        res = g.check_db_read(["stated_position"])
        self.assertFalse(res["ok"])
        self.assertEqual(res["guard_type"], "bucket")
        self.assertFalse(res["halt"])

    def test_mixed_buckets_rejected(self):
        res = g.check_db_read(["verifiable_fact", "outside_opinion"])
        self.assertFalse(res["ok"])
        self.assertIn("outside_opinion", res["reasons"][0])


class SourceRegisterTests(unittest.TestCase):
    def test_primary_doc_ok(self):
        self.assertTrue(g.validate_source_register({"type": "primary_doc"})["ok"])

    def test_other_types_rejected(self):
        for stype in ("candidate_self", "news", "opinion", None):
            res = g.validate_source_register({"type": stype})
            self.assertFalse(res["ok"], stype)
            self.assertEqual(res["guard_type"], "bucket")
            self.assertFalse(res["halt"])


class ClaimWriteBucketHaltTests(unittest.TestCase):
    def test_valid_claim_passes(self):
        res = g.validate_claim_write(base_claim(), SOURCES)
        self.assertTrue(res["ok"], res["reasons"])
        self.assertEqual(res["log"]["bucket_written"], "verifiable_fact")

    def test_wrong_bucket_halts(self):
        for bucket in ("stated_position", "outside_opinion"):
            res = g.validate_claim_write(base_claim(bucket=bucket), SOURCES)
            self.assertFalse(res["ok"], bucket)
            self.assertTrue(res["halt"], bucket)
            self.assertEqual(res["guard_type"], "bucket")

    def test_invalid_bucket_halts(self):
        res = g.validate_claim_write(base_claim(bucket="facts"), SOURCES)
        self.assertFalse(res["ok"])
        self.assertTrue(res["halt"])
        self.assertIn("invalid bucket", res["reasons"][0])


class EditorialLabelHaltTests(unittest.TestCase):
    def test_hypocrisy_halts(self):
        res = g.validate_claim_write(
            base_claim(text="This vote shows the candidate's hypocrisy."),
            SOURCES)
        self.assertFalse(res["ok"])
        self.assertTrue(res["halt"])
        self.assertEqual(res["guard_type"], "bucket")

    def test_flip_flop_variants_halt(self):
        for text in ("A clear flip-flop on SB 123.",
                     "The candidate flip flopped on the issue.",
                     "A flipflop from the 2024 position."):
            res = g.validate_claim_write(base_claim(text=text), SOURCES)
            self.assertFalse(res["ok"], text)
            self.assertTrue(res["halt"], text)

    def test_broken_promise_halts(self):
        for text in ("This is a broken promise.",
                     "The candidate broke a promise made in 2024.",
                     "They broke their promise on taxes."):
            res = g.validate_claim_write(base_claim(text=text), SOURCES)
            self.assertTrue(res["halt"], text)

    def test_contradiction_halts(self):
        res = g.validate_claim_write(
            base_claim(text="The vote contradicts the stated position."),
            SOURCES)
        self.assertTrue(res["halt"])

    def test_case_insensitive(self):
        res = g.validate_claim_write(
            base_claim(text="HYPOCRISY on display."), SOURCES)
        self.assertTrue(res["halt"])

    def test_neutral_side_by_side_passes(self):
        res = g.validate_claim_write(base_claim(
            text=("Stated support for HB 7 on 2025-01-10; "
                  "voted NAY on HB 7 on 2025-03-04.")), SOURCES)
        self.assertTrue(res["ok"], res["reasons"])

    def test_neutral_record_words_not_caught(self):
        # 'promise'/'flipped' alone are not the labeled framings.
        res = g.validate_claim_write(base_claim(
            text=("Sponsored the Promise Scholarship Act; the amendment "
                  "flipped the fee schedule per the journal.")), SOURCES)
        self.assertTrue(res["ok"], res["reasons"])

    def test_find_editorial_labels_returns_matches(self):
        labels = g.find_editorial_labels(
            "A flip-flop and a broken promise, plain hypocrisy.")
        self.assertEqual(len(labels), 3)


class ClaimWriteContractTests(unittest.TestCase):
    def test_no_sources_rejected_not_halted(self):
        res = g.validate_claim_write(base_claim(source_ids=[]), SOURCES)
        self.assertFalse(res["ok"])
        self.assertFalse(res["halt"])
        self.assertIn("no source_ids cited — no Source, no claim",
                      res["reasons"])

    def test_unregistered_source_rejected(self):
        res = g.validate_claim_write(
            base_claim(source_ids=["src-ghost"]), SOURCES)
        self.assertFalse(res["ok"])
        self.assertIn("source 'src-ghost' is not registered", res["reasons"])

    def test_non_primary_doc_source_rejected(self):
        for sid in ("src-news", "src-self"):
            res = g.validate_claim_write(
                base_claim(source_ids=[sid]), SOURCES)
            self.assertFalse(res["ok"], sid)
            self.assertFalse(res["halt"])

    def test_attributed_true_rejected(self):
        res = g.validate_claim_write(base_claim(attributed=True), SOURCES)
        self.assertFalse(res["ok"])
        self.assertIn("attributed=false", res["reasons"][0])

    def test_attributed_missing_rejected(self):
        claim = base_claim()
        del claim["attributed"]
        res = g.validate_claim_write(claim, SOURCES)
        self.assertFalse(res["ok"])

    def test_wrong_verification_rejected(self):
        for v in ("single_source", "unverified", None):
            res = g.validate_claim_write(
                base_claim(verification=v), SOURCES)
            self.assertFalse(res["ok"], v)

    def test_nonnull_verdict_rejected(self):
        res = g.validate_claim_write(base_claim(verdict="accurate"), SOURCES)
        self.assertFalse(res["ok"])
        self.assertIn("Fact-Checker", res["reasons"][0])

    def test_issue_id_optional(self):
        res = g.validate_claim_write(base_claim(issue_id=None), SOURCES)
        self.assertTrue(res["ok"], res["reasons"])

    def test_empty_text_rejected(self):
        res = g.validate_claim_write(base_claim(text="   "), SOURCES)
        self.assertFalse(res["ok"])
        self.assertIn("claim text is empty", res["reasons"])

    def test_missing_ids_rejected(self):
        res = g.validate_claim_write(
            base_claim(claim_id=None, candidate_id="", race_id=None),
            SOURCES)
        self.assertFalse(res["ok"])
        self.assertEqual(
            sum("missing required field" in r for r in res["reasons"]), 3)

    def test_multiple_primary_sources_pass(self):
        res = g.validate_claim_write(
            base_claim(source_ids=["src-1", "src-2"]), SOURCES)
        self.assertTrue(res["ok"], res["reasons"])

    def test_rejection_log_row_shape(self):
        res = g.validate_claim_write(base_claim(source_ids=[]), SOURCES)
        log = res["log"]
        self.assertEqual(log["agent_id"], "record")
        self.assertEqual(log["tool_called"], "claim_write")
        self.assertIsNone(log["bucket_written"])
        self.assertEqual(log["status"], "fail")
        self.assertTrue(log["guard_triggered"])
        self.assertEqual(log["guard_type"], "bucket")


if __name__ == "__main__":
    unittest.main()
