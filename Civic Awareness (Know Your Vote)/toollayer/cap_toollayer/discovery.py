"""S1-05 discovery tools — T5 web_search, T6 fetch_source.

Caller-keyed allowlist enforcement (Tool Spec §2.5), run in the wrapper
BEFORE any network I/O:
  * profiler   -> Allowlist A (per-candidate: official_site + verified social
                  handles), read live from the DB. Off-list -> blocked.
  * factchecker-> Allowlist B (static Tier-1/Tier-2 core list). Off-list ->
                  blocked; allowed results are tier-tagged.
  * record     -> no discovery grant at all (denied in check_tool_access
                  before a handler is ever reached).

A blocked URL is a `guard_type='allowlist'` fail row, logged before return
(the middleware does this). web_search filters every result through the same
gate — off-list results are DROPPED from the set, not just flagged.

Fail-closed / degrade honestly:
  * PSL (S1-R5): inject a real registrable-domain extractor (tldextract,
    offline snapshot) when installed; otherwise Allowlist A falls back to its
    embedded fail-closed subset — never a permissive guess.
  * No redirects are followed; shorteners are blocked in the cores.
  * The search backend is not configured in v1 -> `not_configured` (never a
    faked result set). The fetch backend (httpx) and the search backend are
    injectable so the gate is testable without a network.

The disk cache stores fetched, script-stripped text per (normalized-URL, day).
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping

from . import cores, errors
from .store import Store

Handler = Callable[[Mapping[str, Any]], dict]

DISCOVERY_AGENTS: frozenset[str] = frozenset({"profiler", "factchecker"})

_SCRIPT_RE = re.compile(r"(?is)<script.*?>.*?</script>")


class NotConfigured(RuntimeError):
    """A required backend (search API / fetch client) is absent."""


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _strip_scripts(text: str) -> str:
    return _SCRIPT_RE.sub("", text)


def load_psl() -> Callable[[str], str] | None:
    """Registrable-domain extractor for Allowlist A, or None to let the core
    use its embedded subset. Offline snapshot only — never a network fetch."""
    try:
        import tldextract  # noqa: F401
    except ImportError:
        return None
    extract = tldextract.TLDExtract(suffix_list_urls=())  # bundled snapshot

    def registrable_domain(host: str) -> str:
        ext = extract(host)
        if ext.domain and ext.suffix:
            return f"{ext.domain}.{ext.suffix}"
        return ""  # fail closed

    return registrable_domain


def _httpx_fetch(url: str, timeout: float = 10.0) -> str:
    try:
        import httpx
    except ImportError as err:  # pragma: no cover - httpx is in the budget
        raise NotConfigured("httpx is not installed; fetch_source unavailable") from err
    resp = httpx.get(url, timeout=timeout, follow_redirects=False)
    resp.raise_for_status()
    return resp.text


class DiskCache:
    """Content cache keyed by (normalized URL, day). Best-effort: a cache I/O
    error never fails a fetch — it just misses."""

    def __init__(self, root: str | Path, normalize: Callable[[str], str]):
        self.root = Path(root)
        self._normalize = normalize

    def _path(self, url: str, day: str) -> Path:
        key = hashlib.sha256(f"{self._normalize(url)}|{day}".encode()).hexdigest()
        return self.root / f"{key[:32]}.txt"

    def get(self, url: str, day: str) -> str | None:
        try:
            p = self._path(url, day)
            return p.read_text(encoding="utf-8") if p.exists() else None
        except OSError:
            return None

    def put(self, url: str, day: str, text: str) -> None:
        try:
            self.root.mkdir(parents=True, exist_ok=True)
            self._path(url, day).write_text(text, encoding="utf-8")
        except OSError:
            pass


def build_discovery_handlers(
    agent_id: str,
    store: Store,
    *,
    fetcher: Callable[[str], str] | None = None,
    searcher: Callable[[str], list[dict]] | None = None,
    registrable_domain: Callable[[str], str] | None = None,
    cache: DiskCache | None = None,
) -> dict[str, Handler]:
    """Wire T5/T6 for one discovery identity. `fetcher`/`searcher` are
    injectable so the allowlist gate is testable without a network."""
    fetcher = fetcher or _httpx_fetch
    psl = registrable_domain if registrable_domain is not None else load_psl()
    allow_a = cores.load_aux_core("allowlist_a")
    allow_b = cores.load_aux_core("allowlist_b")
    if cache is None:
        cache = DiskCache(Path("runs") / "cache", allow_a.normalize_url)

    # Candidate scope is fixed for the life of one S1 process (ADR-R1), so
    # read it at most once per candidate instead of once per result/fetch.
    _scope_memo: dict[Any, dict] = {}

    def _scope(candidate_id: Any) -> dict:
        if candidate_id not in _scope_memo:
            _scope_memo[candidate_id] = store.candidate_scope(candidate_id)
        return _scope_memo[candidate_id]

    def _gate(url: str, payload: Mapping[str, Any]) -> dict:
        """Per-caller allowlist decision: {ok, tier?, rule?, reason?}."""
        if agent_id == "factchecker":
            v = allow_b.check_fetch(url)
            return {"ok": v["ok"], "tier": v["tier"], "reason": v["reason"]}
        scope = _scope(payload.get("candidate_id"))
        d = allow_a.allowlist_a_check(
            url, scope["official_site"], scope["social_accounts"],
            scope["platforms"], registrable_domain=psl,
        )
        return {"ok": d["allowed"], "rule": d["rule"], "reason": d["reason"]}

    def _blocked(gate: dict) -> dict:
        return {
            "ok": False, "guard_type": errors.ALLOWLIST,
            "reasons": [gate.get("reason") or "blocked by allowlist"],
        }

    def _fetch(url: str) -> tuple[str, bool]:
        day = _today()
        hit = cache.get(url, day)
        if hit is not None:
            return hit, True
        text = _strip_scripts(fetcher(url))
        cache.put(url, day, text)
        return text, False

    def fetch_source(payload: Mapping[str, Any]) -> dict:
        url = payload.get("url")
        if not url:
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": ["fetch_source requires a 'url'"]}
        gate = _gate(url, payload)
        if not gate["ok"]:
            return _blocked(gate)
        try:
            text, cached = _fetch(url)
        except NotConfigured as err:
            return {"ok": False, "error": errors.NOT_CONFIGURED, "reasons": [str(err)]}
        except Exception as err:  # noqa: BLE001 - network/HTTP failure
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"fetch_source failed ({type(err).__name__})"]}
        return {"ok": True, "result": {
            "url": url, "tier": gate.get("tier"), "rule": gate.get("rule"),
            "retrieved_at": _now_iso(), "cached": cached, "text": text,
        }}

    def web_search(payload: Mapping[str, Any]) -> dict:
        if searcher is None:
            return {"ok": False, "error": errors.NOT_CONFIGURED,
                    "reasons": ["web_search has no configured search backend (v1)"]}
        try:
            results = list(searcher(payload.get("query") or ""))
        except NotConfigured as err:
            return {"ok": False, "error": errors.NOT_CONFIGURED, "reasons": [str(err)]}
        except Exception as err:  # noqa: BLE001
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"web_search failed ({type(err).__name__})"]}
        kept = []
        for r in results:
            gate = _gate(r.get("url", ""), payload)
            if gate["ok"]:  # off-list results are DROPPED, not flagged
                kept.append({**r, "tier": gate.get("tier"), "rule": gate.get("rule")})
        return {"ok": True, "result": {
            "query": payload.get("query"), "results": kept,
            "dropped": len(results) - len(kept),
        }}

    return {"web_search": web_search, "fetch_source": fetch_source}
