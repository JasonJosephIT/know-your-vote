"""
Tests for allowlist_a_core — stdlib unittest, no dependencies.

Run:  python3 -m unittest -v test_allowlist_a_core.py

Covers the Tool Spec §2.5 A pass rules (official_site registrable-domain
match, verified social-handle match), and the fail-closed paths: shorteners,
unverified/disputed handles, wrong candidate's handle, non-handle platform
paths, platform-hosted official_site, empty scope, unknown suffixes, bad
schemes, and the log-row contract on every block.
"""

import unittest

from allowlist_a_core import (
    SEED_PLATFORMS,
    allowlist_a_check,
    default_registrable_domain,
    norm_handle,
    normalize_url,
)

SITE = "https://www.janedoeforcongress.com"

ACCOUNTS = [
    {"platform": "twitter", "handle_norm": "janedoefl", "status": "verified"},
    {"platform": "youtube", "handle_norm": "janedoefl", "status": "verified"},
    {"platform": "facebook", "handle_norm": "janedoeforcongress",
     "status": "unverified"},
    {"platform": "instagram", "handle_norm": "janedoefl", "status": "disputed"},
]


def check(url, official_site=SITE, accounts=ACCOUNTS, platforms=SEED_PLATFORMS):
    return allowlist_a_check(url, official_site, accounts, platforms)


class TestOfficialSiteMatch(unittest.TestCase):

    def test_exact_domain_passes(self):
        d = check("https://janedoeforcongress.com/issues/economy")
        self.assertTrue(d["allowed"])
        self.assertEqual(d["rule"], "official_site")

    def test_subdomain_passes(self):
        d = check("https://blog.janedoeforcongress.com/post?a=1")
        self.assertTrue(d["allowed"])

    def test_case_and_port_folded(self):
        d = check("HTTPS://WWW.JaneDoeForCongress.COM:443/About")
        self.assertTrue(d["allowed"])

    def test_other_domain_blocked(self):
        d = check("https://apnews.com/article/janedoe")
        self.assertFalse(d["allowed"])
        self.assertEqual(d["reason"], "outside_candidate_scope")

    def test_lookalike_domain_blocked(self):
        d = check("https://janedoeforcongress.com.evil.net/")
        self.assertFalse(d["allowed"])

    def test_state_us_two_level_suffix(self):
        d = check("https://vote.janedoe.fl.us/", official_site="https://janedoe.fl.us")
        self.assertTrue(d["allowed"])

    def test_unknown_suffix_fails_closed(self):
        # default extractor does not know '.campaign' -> no registrable
        # domain -> block, even for an identical host.
        d = check("https://janedoe.campaign/", official_site="https://janedoe.campaign")
        self.assertFalse(d["allowed"])


class TestSocialHandleMatch(unittest.TestCase):

    def test_verified_x_handle_passes(self):
        d = check("https://x.com/JaneDoeFL")
        self.assertTrue(d["allowed"])
        self.assertEqual(d["rule"], "social_handle")
        self.assertEqual(d["matched"]["platform"], "twitter")

    def test_twitter_alias_and_mobile_host_fold(self):
        for url in ("https://twitter.com/janedoefl",
                    "https://mobile.twitter.com/janedoefl/status/1"):
            self.assertTrue(check(url)["allowed"], url)

    def test_percent_encoded_and_at_handle(self):
        d = check("https://x.com/%40JaneDoeFL")
        self.assertTrue(d["allowed"])

    def test_youtube_handle_forms_pass(self):
        for url in ("https://www.youtube.com/@JaneDoeFL",
                    "https://youtube.com/c/JaneDoeFL",
                    "https://m.youtube.com/user/JaneDoeFL/videos"):
            self.assertTrue(check(url)["allowed"], url)

    def test_youtube_video_paths_blocked(self):
        for url in ("https://www.youtube.com/watch?v=abc123",
                    "https://youtu.be/abc123"):
            d = check(url)
            self.assertFalse(d["allowed"], url)
            self.assertEqual(d["reason"], "handle_not_verified_for_candidate")

    def test_unverified_handle_blocked(self):
        d = check("https://facebook.com/JaneDoeForCongress")
        self.assertFalse(d["allowed"])

    def test_disputed_handle_blocked(self):
        d = check("https://instagram.com/JaneDoeFL")
        self.assertFalse(d["allowed"])

    def test_other_users_handle_blocked(self):
        d = check("https://x.com/SomeoneElse")
        self.assertFalse(d["allowed"])
        self.assertEqual(d["reason"], "handle_not_verified_for_candidate")

    def test_platform_root_no_handle_blocked(self):
        self.assertFalse(check("https://x.com/")["allowed"])


class TestFailClosed(unittest.TestCase):

    def test_shorteners_blocked(self):
        for url in ("https://bit.ly/3xYz", "https://t.co/abc",
                    "https://tinyurl.com/janedoe"):
            d = check(url)
            self.assertFalse(d["allowed"], url)
            self.assertEqual(d["reason"], "shortener_blocked")

    def test_empty_scope_fails_closed(self):
        d = allowlist_a_check("https://x.com/JaneDoeFL", None, [], SEED_PLATFORMS)
        self.assertFalse(d["allowed"])
        self.assertEqual(d["reason"], "no_scope_registered")

    def test_unverified_only_scope_fails_closed(self):
        unverified = [a for a in ACCOUNTS if a["status"] != "verified"]
        d = allowlist_a_check(
            "https://facebook.com/JaneDoeForCongress", None, unverified,
            SEED_PLATFORMS,
        )
        self.assertFalse(d["allowed"])
        self.assertEqual(d["reason"], "no_scope_registered")

    def test_platform_hosted_official_site_does_not_admit_platform(self):
        # official_site is a facebook page: domain matching must NOT admit
        # all of facebook.com.
        d = allowlist_a_check(
            "https://facebook.com/SomeoneElse",
            "https://facebook.com/JaneDoeForCongress",
            [], SEED_PLATFORMS,
        )
        self.assertFalse(d["allowed"])

    def test_bad_scheme_blocked(self):
        for url in ("ftp://janedoeforcongress.com/", "javascript:alert(1)",
                    "not a url"):
            d = check(url)
            self.assertFalse(d["allowed"], url)
            self.assertEqual(d["reason"], "scheme_or_host_invalid")

    def test_block_log_row_contract(self):
        d = check("https://apnews.com/x")
        log = d["log"]
        self.assertEqual(log["status"], "fail")
        self.assertTrue(log["guard_triggered"])
        self.assertEqual(log["guard_type"], "allowlist")
        self.assertEqual(log["source_url"], "https://apnews.com/x")

    def test_pass_log_row_contract(self):
        log = check("https://x.com/janedoefl")["log"]
        self.assertEqual(log["status"], "success")
        self.assertFalse(log["guard_triggered"])
        self.assertIsNone(log["guard_type"])


class TestNormalization(unittest.TestCase):

    def test_norm_handle(self):
        self.assertEqual(norm_handle("@JaneDoeFL/"), "janedoefl")
        self.assertEqual(norm_handle("%40JaneDoeFL"), "janedoefl")

    def test_registrable_domain(self):
        self.assertEqual(
            default_registrable_domain("www.janedoeforcongress.com"),
            "janedoeforcongress.com",
        )
        self.assertEqual(default_registrable_domain("a.b.janedoe.fl.us"),
                         "janedoe.fl.us")
        self.assertEqual(default_registrable_domain("com"), "")
        self.assertEqual(default_registrable_domain("janedoe.unknowntld"), "")

    def test_normalize_url_strips_tracking_and_fragment(self):
        self.assertEqual(
            normalize_url("HTTPS://WWW.Site.COM:443/A/?utm_source=x&q=1#frag"),
            "https://www.site.com/A?q=1",
        )


if __name__ == "__main__":
    unittest.main()
