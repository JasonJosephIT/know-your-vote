"""
Civic Awareness Project (CAP) — Allowlist A matcher, deterministic core.

Reference implementation of the Allowlist A matching algorithm
(CAP_MCP_Tool_Spec_v1 §2.5 A, completed per CAP_Schema_v1 §3/§4/§10).
Enforced inside the `web_search` (T5) and `fetch_source` (T6) wrappers when
the caller is the Profiler (Agent 1).

This module is INTENTIONALLY pure:
  - no database, no network, no redirects followed, no clock;
  - all candidate scope (official_site, verified social accounts) and the
    social_platform reference rows are passed in by the wrapper;
  - the only pluggable part is `registrable_domain` (PSL extraction). The
    default is a stdlib implementation over an embedded, US-centric public
    suffix subset. Production wrappers SHOULD inject a full PSL extractor
    (e.g. tldextract with its bundled snapshot). Unknown suffixes fail
    CLOSED: no registrable domain -> no match -> block.

A URL passes ONLY if (Tool Spec §2.5 A):
  - its registrable domain matches the candidate's registered official_site, OR
  - its host folds to a known social platform AND the extracted handle matches
    a `status='verified'` handle registered to this candidate
    (CAP_Schema_v1 §3 admission rule — unverified/disputed never admit).

Everything else is BLOCKED, including:
  - non-http(s) schemes;
  - URL shorteners (denylist; redirects are never followed);
  - social-platform URLs whose handle is not this candidate's verified handle;
  - an official_site that is itself a social platform or shortener page —
    domain matching is NOT applied to it (that would admit the whole
    platform); such a site must enter via a verified social-account row;
  - empty scope: no official_site and no verified handles -> fail closed.

The wrapper owns all I/O and logging. Every BLOCK decision returned here must
be logged by the wrapper BEFORE returning to the agent, per CAP_Schema_v1 §8:
status='fail', guard_triggered=true, guard_type='allowlist', source_url=URL.
The `log` field of the decision carries those values ready-made.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Callable
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit

# --------------------------------------------------------------------------
# Shortener denylist (registrable domains). Blocked outright; redirects are
# never followed. t.co is listed even though x.com is a platform host.
# --------------------------------------------------------------------------
SHORTENER_DOMAINS: frozenset[str] = frozenset({
    "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "buff.ly",
    "is.gd", "rb.gy", "lnkd.in", "rebrand.ly", "cutt.ly", "tiny.cc",
    "shorturl.at", "s.id", "soo.gd", "bl.ink", "snip.ly",
})

# Query parameters stripped by normalize_url (tracking only — never used
# for matching).
_TRACKING_PARAMS = re.compile(
    r"^(utm_\w+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref_src|ref_url|s|si)$",
    re.IGNORECASE,
)

# --------------------------------------------------------------------------
# Default registrable-domain extraction (stdlib PSL subset).
# --------------------------------------------------------------------------
_US_STATES = (
    "al ak az ar ca co ct de fl ga hi id il in ia ks ky la me md ma mi mn ms "
    "mo mt ne nv nh nj nm ny nc nd oh ok or pa ri sc sd tn tx ut vt va wa wv "
    "wi wy dc"
).split()

_DEFAULT_SUFFIXES: frozenset[str] = frozenset(
    {
        "com", "org", "net", "us", "gov", "edu", "info", "biz", "io", "co",
        "me", "app", "dev", "vote", "site", "online", "news", "media",
        "co.uk", "org.uk", "com.au",
    }
    | {f"{s}.us" for s in _US_STATES}
    | {f"k12.{s}.us" for s in _US_STATES}
)


def default_registrable_domain(host: str) -> str:
    """
    Longest-suffix match over the embedded subset; returns '<label>.<suffix>'
    or '' when no registrable domain can be derived (fail closed).
    Production should inject a full PSL extractor instead.
    """
    labels = host.lower().rstrip(".").split(".")
    if len(labels) < 2 or "" in labels:
        return ""
    # Longest matching public suffix.
    for i in range(1, len(labels)):
        suffix = ".".join(labels[i:])
        if suffix in _DEFAULT_SUFFIXES:
            if i == 0:  # pragma: no cover — i starts at 1
                return ""
            return ".".join(labels[i - 1:])
    # Unknown suffix: fail closed rather than guess.
    return ""


# --------------------------------------------------------------------------
# Normalization helpers (same rules as Source.url_norm / handle_norm).
# --------------------------------------------------------------------------
def norm_handle(handle: str) -> str:
    """CAP_Schema_v1 §3 handle_norm: NFC, percent-decode, casefold, strip
    whitespace, leading '@' and trailing '/'."""
    h = unicodedata.normalize("NFC", unquote(handle)).strip()
    return h.lstrip("@").rstrip("/").casefold()


def _host_of(url: str) -> str | None:
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    if parts.scheme not in ("http", "https"):
        return None
    host = parts.hostname
    if not host:
        return None
    return host.rstrip(".").casefold()


def normalize_url(url: str) -> str:
    """
    Produce Source.url_norm: casefolded host, default port stripped, tracking
    params stripped, fragment dropped, path NFC + percent-decoded, trailing
    slash trimmed. Same host normalization as the matcher.
    """
    parts = urlsplit(url)
    host = (parts.hostname or "").rstrip(".").casefold()
    port = f":{parts.port}" if parts.port and parts.port not in (80, 443) else ""
    path = unicodedata.normalize("NFC", unquote(parts.path)).rstrip("/")
    query = urlencode(
        [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
         if not _TRACKING_PARAMS.match(k)]
    )
    return f"{parts.scheme.casefold()}://{host}{port}{path}" + (f"?{query}" if query else "")


# --------------------------------------------------------------------------
# Handle extraction per platform.
# --------------------------------------------------------------------------
def _extract_handle(platform_row: dict[str, Any], path: str) -> str | None:
    """
    Extract the candidate handle from a URL path for a folded platform.
    Returns None when the path has no handle-shaped segment (fail closed).
    """
    segments = [s for s in path.split("/") if s]
    if not segments:
        return None
    if platform_row["platform"] == "youtube":
        first = segments[0]
        if first.startswith("@"):
            return first[1:]
        if first in ("channel", "user", "c") and len(segments) > 1:
            return segments[1]
        return None  # video ids, /watch, youtu.be paths — not a handle page
    if not platform_row.get("handle_in_path", True):
        return None
    return segments[0].lstrip("@")


def _fold_platform(
    platforms: list[dict[str, Any]], host: str
) -> dict[str, Any] | None:
    for row in platforms:
        if not row.get("active", True):
            continue
        try:
            if re.fullmatch(row["host_pattern"], host):
                return row
        except re.error:
            continue  # malformed pattern never admits (fail closed)
    return None


# --------------------------------------------------------------------------
# The matcher.
# --------------------------------------------------------------------------
def _decision(
    url: str,
    allowed: bool,
    *,
    rule: str | None = None,
    reason: str | None = None,
    matched: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "allowed": allowed,
        "rule": rule,
        "reason": reason,
        "matched": matched,
        "log": {
            "source_url": url,
            "status": "success" if allowed else "fail",
            "failure_reason": reason,
            "guard_triggered": not allowed,
            "guard_type": None if allowed else "allowlist",
        },
    }


def allowlist_a_check(
    url: str,
    official_site: str | None,
    social_accounts: list[dict[str, Any]],
    platforms: list[dict[str, Any]],
    registrable_domain: Callable[[str], str] | None = None,
) -> dict[str, Any]:
    """
    Decide whether the Profiler may retrieve `url` for one candidate.

    Args:
      url: the requested URL.
      official_site: the candidate's registered official_site (or None).
      social_accounts: this candidate's candidate_social_account rows
        ({platform, handle_norm, status, ...}). Only status='verified'
        rows are considered (CAP_Schema_v1 §3 admission rule).
      platforms: social_platform reference rows
        ({platform, host_pattern, handle_in_path, active}).
      registrable_domain: PSL extractor; defaults to the embedded subset.

    Returns a decision dict:
      {allowed, rule ('official_site'|'social_handle'|None), reason,
       matched, log {source_url, status, failure_reason, guard_triggered,
       guard_type}}.
    The wrapper must write the `log` row before returning to the agent —
    early-return rejections are not exempt (CAP_Schema_v1 §8).
    """
    rd = registrable_domain or default_registrable_domain

    host = _host_of(url)
    if host is None:
        return _decision(url, False, reason="scheme_or_host_invalid")

    url_domain = rd(host)

    # Shorteners: block outright, never follow redirects.
    if url_domain in SHORTENER_DOMAINS or host in SHORTENER_DOMAINS:
        return _decision(url, False, reason="shortener_blocked")

    verified = [a for a in social_accounts if a.get("status") == "verified"]

    # Fail closed on empty scope.
    site_host = _host_of(official_site) if official_site else None
    if site_host is None and not verified:
        return _decision(url, False, reason="no_scope_registered")

    # 1) Official-site registrable-domain match — but never when the
    # official_site is itself a social platform or shortener (that would
    # admit the entire platform; such sites must enter via a verified
    # social-account row).
    if site_host:
        site_domain = rd(site_host)
        site_is_platform = _fold_platform(platforms, site_host) is not None
        site_is_shortener = (
            site_domain in SHORTENER_DOMAINS or site_host in SHORTENER_DOMAINS
        )
        if site_domain and not site_is_platform and not site_is_shortener:
            if url_domain and url_domain == site_domain:
                return _decision(
                    url, True, rule="official_site",
                    matched={"registrable_domain": url_domain},
                )

    # 2) Social-handle match: fold host -> platform, extract handle,
    # match against this candidate's verified handles.
    platform_row = _fold_platform(platforms, host)
    if platform_row is not None:
        raw = _extract_handle(platform_row, urlsplit(url).path)
        if raw is not None:
            handle = norm_handle(raw)
            for account in verified:
                if (
                    account["platform"] == platform_row["platform"]
                    and account["handle_norm"] == handle
                ):
                    return _decision(
                        url, True, rule="social_handle",
                        matched={
                            "platform": platform_row["platform"],
                            "handle_norm": handle,
                        },
                    )
        return _decision(url, False, reason="handle_not_verified_for_candidate")

    return _decision(url, False, reason="outside_candidate_scope")


# --------------------------------------------------------------------------
# Seed social_platform rows (CAP_Schema_v1 §4). Reference data — the wrapper
# normally reads these from the social_platform table.
# --------------------------------------------------------------------------
SEED_PLATFORMS: list[dict[str, Any]] = [
    {"platform": "twitter", "display_name": "X (Twitter)",
     "host_pattern": r"^(www\.|m\.|mobile\.)?(x|twitter)\.com$",
     "handle_in_path": True, "active": True},
    {"platform": "facebook", "display_name": "Facebook",
     "host_pattern": r"^(www\.|m\.)?(facebook|fb)\.com$",
     "handle_in_path": True, "active": True},
    {"platform": "instagram", "display_name": "Instagram",
     "host_pattern": r"^(www\.)?instagram\.com$",
     "handle_in_path": True, "active": True},
    {"platform": "youtube", "display_name": "YouTube",
     "host_pattern": r"^((www\.|m\.)?youtube\.com|youtu\.be)$",
     "handle_in_path": True, "active": True},
]
