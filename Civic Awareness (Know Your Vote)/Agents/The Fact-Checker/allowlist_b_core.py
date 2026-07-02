"""
Civic Awareness Project (CAP) — Allowlist B (independent authoritative),
deterministic core.

Reference implementation of the Fact-Checker's domain allowlist, per
CAP_MCP_Tool_Spec_v1 §2.5 B. Enforced inside the web_search (T5) and
fetch_source (T6) wrappers when the caller is agent_id='factchecker'.
The guard core also uses `classify_url` to count Tier 1 sources for the
>=2 rule on claim_write.

Unlike Allowlist A (per-candidate, derived at intake), Allowlist B is
STATIC and CURATED — two fixed tiers:

  Tier 1 — primary evidence. Counts toward the >=2 independent Tier 1
           sources required for any verdict other than "Unverifiable".
  Tier 2 — nonpartisan reference / corroboration ONLY. Never sufficient
           alone for a verdict; never counts toward the >=2 rule
           (resolved 2026-06-29: the Fact-Checker grounds in primary
           evidence, it does not inherit another checker's conclusion).

This module is INTENTIONALLY pure: no database, no network, no clock.
Fail-closed everywhere: a URL that cannot be positively matched to a
tiered domain is blocked. Shorteners are blocked outright and redirects
are never followed (same posture as Allowlist A).

Matching rule: exact host match or subdomain (label-boundary suffix)
match against the tier domain lists — e.g. `www.fec.gov` and
`api.open.fec.gov` match `fec.gov`; `fec.gov.evil.com` does not.
`leg.state.fl.us` is listed at full depth, so subdomains such as
`www.leg.state.fl.us` match it while unrelated `*.state.fl.us` hosts do
not. The FL Division of Elections is matched at `dos.fl.gov`
(Tool Spec §2.5 B); election docs hosted under other state hosts must be
added to the list deliberately, not matched loosely.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import urlsplit

TIER1 = "tier1"
TIER2 = "tier2"

# Tool Spec §2.5 B — Tier 1: primary evidence.
TIER1_DOMAINS: frozenset[str] = frozenset({
    "fec.gov",              # incl. api.open.fec.gov via suffix match
    "dos.fl.gov",           # FL Division of Elections
    "flsenate.gov",
    "myfloridahouse.gov",
    "leg.state.fl.us",
    "congress.gov",
    "govinfo.gov",
    "gao.gov",
    "cbo.gov",
    "bls.gov",
    "census.gov",
    "courtlistener.com",
})

# Tool Spec §2.5 B — Tier 2: nonpartisan reference / corroboration only.
TIER2_DOMAINS: frozenset[str] = frozenset({
    "ballotpedia.org",
    "votesmart.org",
    "opensecrets.org",
    "politifact.com",
    "factcheck.org",
    "apnews.com",
})

# Same shortener posture as Allowlist A: block, never follow redirects.
SHORTENER_DOMAINS: frozenset[str] = frozenset({
    "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "buff.ly",
    "is.gd", "rb.gy", "lnkd.in", "rebrand.ly", "cutt.ly", "shorturl.at",
})

_ALLOWED_SCHEMES = ("http", "https")


def _host_matches(host: str, domain: str) -> bool:
    """Exact or label-boundary subdomain match (never mid-label)."""
    return host == domain or host.endswith("." + domain)


def _extract_host(url: str) -> tuple[str | None, str | None]:
    """Return (host, error). Fail-closed on anything unparseable."""
    if not isinstance(url, str) or not url.strip():
        return None, "empty or non-string URL"
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None, "unparseable URL"
    if parts.scheme.lower() not in _ALLOWED_SCHEMES:
        return None, f"scheme '{parts.scheme}' not allowed (http/https only)"
    host = (parts.hostname or "").rstrip(".").lower()
    if not host:
        return None, "URL has no host"
    return host, None


def classify_url(url: str) -> dict[str, Any]:
    """
    Classify a URL against Allowlist B.

    Returns:
      {"ok": bool, "tier": "tier1" | "tier2" | None,
       "host": str | None, "reason": str | None}

    ok=False (blocked) for: bad scheme / no host, shorteners, and any
    host not positively matched to a Tier 1 or Tier 2 domain. Fail-closed.
    """
    host, err = _extract_host(url)
    if err:
        return {"ok": False, "tier": None, "host": host, "reason": err}
    for dom in SHORTENER_DOMAINS:
        if _host_matches(host, dom):
            return {
                "ok": False, "tier": None, "host": host,
                "reason": f"shortener '{dom}' blocked — redirects are never "
                          "followed (fail-closed)",
            }
    for dom in TIER1_DOMAINS:
        if _host_matches(host, dom):
            return {"ok": True, "tier": TIER1, "host": host, "reason": None}
    for dom in TIER2_DOMAINS:
        if _host_matches(host, dom):
            return {"ok": True, "tier": TIER2, "host": host, "reason": None}
    return {
        "ok": False, "tier": None, "host": host,
        "reason": f"host '{host}' is not on Allowlist B (fail-closed)",
    }


def check_fetch(url: str) -> dict[str, Any]:
    """
    Wrapper-facing pass/block decision for web_search (T5) / fetch_source
    (T6) when agent_id='factchecker', with the log row the wrapper must
    write via log_action (T11) BEFORE returning (CAP_Schema_v1 §8 —
    early-return rejections are not exempt).
    """
    verdict = classify_url(url)
    blocked = not verdict["ok"]
    return {
        "ok": verdict["ok"],
        "tier": verdict["tier"],
        "reason": verdict["reason"],
        "log": {
            "agent_id": "factchecker",
            "tool_called": "fetch_source",
            "source_url": url if isinstance(url, str) else None,
            "status": "success" if verdict["ok"] else "fail",
            "failure_reason": verdict["reason"],
            "guard_triggered": blocked,
            "guard_type": "allowlist" if blocked else None,
        },
    }


def url_norm(url: str) -> str | None:
    """
    Normalized document identity used for source INDEPENDENCE in the
    >=2 Tier-1 rule: lowercased host + path (trailing slash stripped)
    + query (kept — distinct API queries are distinct documents),
    fragment dropped. Returns None for URLs that fail extraction.
    """
    host, err = _extract_host(url)
    if err:
        return None
    parts = urlsplit(url.strip())
    path = parts.path.rstrip("/")
    norm = host + path
    if parts.query:
        norm += "?" + parts.query
    return norm


def count_independent_tier1(urls: list[str]) -> int:
    """
    Number of INDEPENDENT Tier 1 documents among `urls`: Tier-1-classified
    URLs, deduplicated by url_norm. The same document cited twice counts
    once. Unclassifiable / non-Tier-1 URLs count zero (fail-closed).
    """
    norms: set[str] = set()
    for u in urls:
        if classify_url(u)["tier"] == TIER1:
            n = url_norm(u)
            if n is not None:
                norms.add(n)
    return len(norms)
