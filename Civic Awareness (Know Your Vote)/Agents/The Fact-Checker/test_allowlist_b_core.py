"""Tests for allowlist_b_core — Allowlist B tiering, fail-closed paths,
independence counting. Stdlib only."""

import unittest

from allowlist_b_core import (
    TIER1, TIER2,
    check_fetch, classify_url, count_independent_tier1, url_norm,
)


class TestTier1(unittest.TestCase):
    def test_fec_exact(self):
        self.assertEqual(classify_url("https://fec.gov/data")["tier"], TIER1)

    def test_fec_www(self):
        self.assertEqual(
            classify_url("https://www.fec.gov/data/candidate/H0FL10001/")["tier"],
            TIER1,
        )

    def test_fec_api_subdomain(self):
        self.assertEqual(
            classify_url("https://api.open.fec.gov/v1/filings/?cand=X")["tier"],
            TIER1,
        )

    def test_fl_doe(self):
        self.assertEqual(classify_url("https://dos.fl.gov/elections/")["tier"], TIER1)

    def test_leg_state_fl_us_deep_domain(self):
        self.assertEqual(
            classify_url("http://www.leg.state.fl.us/statutes/")["tier"], TIER1
        )

    def test_other_state_fl_us_host_blocked(self):
        # leg.state.fl.us is listed at full depth; siblings do not inherit.
        self.assertFalse(classify_url("https://dms.state.fl.us/x")["ok"])

    def test_courtlistener(self):
        self.assertEqual(
            classify_url("https://www.courtlistener.com/docket/123/")["tier"], TIER1
        )

    def test_host_case_and_trailing_dot_folded(self):
        self.assertEqual(classify_url("https://WWW.Census.GOV./data")["tier"], TIER1)


class TestTier2(unittest.TestCase):
    def test_ballotpedia(self):
        self.assertEqual(
            classify_url("https://ballotpedia.org/Jane_Doe")["tier"], TIER2
        )

    def test_apnews(self):
        self.assertEqual(
            classify_url("https://apnews.com/article/x")["tier"], TIER2
        )


class TestFailClosed(unittest.TestCase):
    def test_lookalike_suffix_blocked(self):
        self.assertFalse(classify_url("https://fec.gov.evil.com/data")["ok"])

    def test_mid_label_not_matched(self):
        self.assertFalse(classify_url("https://notfec.gov/data")["ok"])

    def test_news_outlet_blocked(self):
        self.assertFalse(classify_url("https://www.nytimes.com/x")["ok"])

    def test_candidate_site_blocked(self):
        # Candidate-controlled domains are Allowlist A territory, not B.
        self.assertFalse(classify_url("https://janedoeforcongress.com")["ok"])

    def test_shortener_blocked(self):
        v = classify_url("https://bit.ly/abc123")
        self.assertFalse(v["ok"])
        self.assertIn("shortener", v["reason"])

    def test_bad_scheme_blocked(self):
        self.assertFalse(classify_url("ftp://fec.gov/file")["ok"])

    def test_schemeless_blocked(self):
        self.assertFalse(classify_url("fec.gov/data")["ok"])

    def test_empty_and_none_blocked(self):
        self.assertFalse(classify_url("")["ok"])
        self.assertFalse(classify_url(None)["ok"])

    def test_no_host_blocked(self):
        self.assertFalse(classify_url("https:///path-only")["ok"])


class TestCheckFetch(unittest.TestCase):
    def test_pass_logs_success(self):
        r = check_fetch("https://www.congress.gov/bill/119th-congress/hr1")
        self.assertTrue(r["ok"])
        self.assertEqual(r["log"]["status"], "success")
        self.assertFalse(r["log"]["guard_triggered"])
        self.assertIsNone(r["log"]["guard_type"])

    def test_block_logs_allowlist_guard(self):
        r = check_fetch("https://www.foxnews.com/politics/x")
        self.assertFalse(r["ok"])
        self.assertEqual(r["log"]["status"], "fail")
        self.assertTrue(r["log"]["guard_triggered"])
        self.assertEqual(r["log"]["guard_type"], "allowlist")
        self.assertEqual(r["log"]["agent_id"], "factchecker")


class TestIndependence(unittest.TestCase):
    def test_url_norm_drops_fragment_keeps_query(self):
        a = url_norm("https://api.open.fec.gov/v1/filings/?cand=X#top")
        b = url_norm("https://API.OPEN.FEC.GOV/v1/filings?cand=X")
        self.assertEqual(a, b)

    def test_distinct_queries_are_distinct_documents(self):
        self.assertNotEqual(
            url_norm("https://api.open.fec.gov/v1/filings/?cand=X"),
            url_norm("https://api.open.fec.gov/v1/filings/?cand=Y"),
        )

    def test_same_doc_twice_counts_once(self):
        self.assertEqual(
            count_independent_tier1([
                "https://www.fec.gov/data/filing/1/",
                "https://www.fec.gov/data/filing/1",
            ]),
            1,
        )

    def test_two_distinct_tier1_count_two(self):
        self.assertEqual(
            count_independent_tier1([
                "https://www.fec.gov/data/filing/1",
                "https://www.congress.gov/bill/119/hr1",
            ]),
            2,
        )

    def test_tier2_never_counts(self):
        self.assertEqual(
            count_independent_tier1([
                "https://www.fec.gov/data/filing/1",
                "https://www.politifact.com/factchecks/x",
                "https://ballotpedia.org/Jane_Doe",
            ]),
            1,
        )

    def test_unclassifiable_counts_zero(self):
        self.assertEqual(
            count_independent_tier1(["", "not a url", "https://cnn.com/x"]), 0
        )


if __name__ == "__main__":
    unittest.main()
