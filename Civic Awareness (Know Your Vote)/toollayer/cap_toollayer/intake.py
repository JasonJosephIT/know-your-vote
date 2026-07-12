"""S1-06 intake & primary-API tools — T1 doe_file_intake, T2 fec_api_query,
T3 fl_legislature_query, T4 jurisdiction_resolve.

All read-only against public sources, verified live 2026-07-10:

  T1  FL Division of Elections candidate export —
      POST https://dos.elections.myflorida.com/candidates/extractCanList.asp
        elecID=20261103-GEN, office=FED|CAB|..., status=All, cantype=ALL,
        FormSubmit="Download Candidate List"
      -> application/tab-separated-values, header row + 26 columns
         (AcctNum, VoterID, ElectionID, OfficeCode, OfficeDesc, Juris1num,
          Juris2num, StatusCode, StatusDesc, PartyCode, PartyDesc, NameLast,
          NameFirst, NameMiddle, SuppressAddress, Addr1, Addr2, City, State,
          Zip, County, Phone, TrsNameLast, TrsNameFirst, TrsNameMiddle, Email)
      The file carries candidate PII (address/phone/email/treasurer). The
      `candidate` table has no such columns, so intake extracts ONLY
      name/party/office/district/status and drops the rest.

  T2  FEC — GET https://api.open.fec.gov/v1/<endpoint> with FEC_API_KEY.
      Envelope {api_version, pagination, results}. Named endpoint catalog
      only (fail-closed), 429 backoff honoring Retry-After.

  T3  FL Legislature — flsenate.gov deterministic bill URLs
      /Session/Bill/{year}/{number}[/BillText/Filed/HTML]. HTML (no JSON
      API); cached to disk per URL+day.

  T4  jurisdiction_resolve — the app's `zip_district` table via SQL (T4 reads
      the same mapping the app uses; never a copy).

Fail-closed parsers (Risk R1): a shape the parser doesn't recognize is a loud
`status='fail'`, never a guess. The HTTP client is injectable so parsing/
upsert logic is fully testable without a network; live fetch degrades
honestly (`not_configured` / `upstream_failed`).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Callable, Mapping

from . import errors
from .discovery import DiskCache, NotConfigured, _strip_scripts
from .store import Store

# --- T1 DoE constants (captured live 2026-07-10) --------------------------
DOE_URL = "https://dos.elections.myflorida.com/candidates/extractCanList.asp"
DOE_ELECTION_ID = "20261103-GEN"  # 2026 general
_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")  # DoE WAF wants a UA

# OfficeCode -> statewide target race_id; USR + these districts are the
# congressional targets (CAP_PRD Target Races: Gov/AG/CFO/AgComm + FL-10/15/23/28).
_STATEWIDE_RACES = {
    "GOV": "FL-GOV-general", "ATG": "FL-ATG-general",
    "CFO": "FL-CFO-general", "AGR": "FL-AGR-general",
}
_TARGET_US_HOUSE = {"010", "015", "023", "028"}

_PARTY = {"REP": "REP", "DEM": "DEM", "NPA": "NPA"}          # else -> 'other'
_STATUS = {"QUA": "qualified", "WIT": "withdrawn"}           # else -> 'other'
_DOE_REQUIRED_COLS = (
    "AcctNum", "OfficeCode", "OfficeDesc", "Juris1num",
    "StatusCode", "PartyCode", "NameLast", "NameFirst",
)

# --- T2 FEC named endpoint catalog (read-only) ----------------------------
FEC_BASE = "https://api.open.fec.gov/v1"
_FEC_ENDPOINTS = {
    "candidates": "/candidates/",
    "candidate": "/candidate/{candidate_id}/",
    "committees": "/committees/",
    "candidate_totals": "/candidate/{candidate_id}/totals/",
}

# --- T3 FL Legislature -----------------------------------------------------
FLSENATE_BASE = "https://www.flsenate.gov"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ==========================================================================
# T1 — pure parser (deterministic; the DB upsert is separate & idempotent)
# ==========================================================================

class DoEFormatError(ValueError):
    """The DoE file header is not the shape we parse — fail closed, never guess."""


def parse_candidate_list(text: str) -> dict:
    """Parse the tab-separated DoE export into target-race rows.

    Returns {"races": {race_id: race}, "candidates": [candidate], "skipped": int}.
    Deterministic: same input -> same output (so re-intake is idempotent).
    Raises DoEFormatError if the expected header columns are absent.
    """
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if not lines:
        raise DoEFormatError("empty DoE candidate file")
    header = lines[0].split("\t")
    idx = {name: i for i, name in enumerate(header)}
    missing = [c for c in _DOE_REQUIRED_COLS if c not in idx]
    if missing:
        raise DoEFormatError(f"DoE file missing expected columns: {missing}")

    def col(row: list[str], name: str) -> str:
        i = idx[name]
        return row[i].strip() if i < len(row) else ""

    races: dict[str, dict] = {}
    candidates: list[dict] = []
    skipped = 0
    for line in lines[1:]:
        row = line.split("\t")
        office_code = col(row, "OfficeCode")
        juris = col(row, "Juris1num")
        if office_code in _STATEWIDE_RACES:
            race_id = _STATEWIDE_RACES[office_code]
            level, district = "state", None
        elif office_code == "USR" and juris in _TARGET_US_HOUSE:
            race_id = f"FL-{int(juris)}-general"
            level, district = "federal", str(int(juris))
        else:
            skipped += 1
            continue

        acct = col(row, "AcctNum")
        if not acct:
            skipped += 1
            continue
        candidate_id = f"FL-DOE-{acct}"
        name = " ".join(p for p in (col(row, "NameFirst"), col(row, "NameMiddle"),
                                    col(row, "NameLast")) if p)
        candidates.append({
            "candidate_id": candidate_id,
            "legal_name": name,
            "party": _PARTY.get(col(row, "PartyCode"), "other"),
            "office_sought": col(row, "OfficeDesc"),
            "qualifying_status": _STATUS.get(col(row, "StatusCode"), "other"),
            # PII columns (Addr*/Phone/Email/Trs*) are intentionally dropped.
        })
        race = races.setdefault(race_id, {
            "race_id": race_id, "office": col(row, "OfficeDesc"),
            "level": level, "district": district, "election": "general",
            "candidate_ids": [],
        })
        race["candidate_ids"].append(candidate_id)

    for race in races.values():  # stable order -> idempotent arrays
        race["candidate_ids"] = sorted(set(race["candidate_ids"]))
    return {"races": races, "candidates": candidates, "skipped": skipped}


def _default_doe_fetch(office: str = "FED") -> str:
    import httpx
    r = httpx.post(DOE_URL, headers={"User-Agent": _UA}, timeout=60, data={
        "elecID": DOE_ELECTION_ID, "office": office, "status": "All",
        "cantype": "ALL", "FormSubmit": "Download Candidate List"})
    r.raise_for_status()
    return r.text


# ==========================================================================
# T2 / T3 default HTTP backends
# ==========================================================================

def _default_fec_get(path: str, params: Mapping[str, Any]) -> dict:
    import httpx
    r = httpx.get(FEC_BASE + path, params=params, timeout=25)
    if r.status_code == 429:
        raise _RateLimited(r.headers.get("Retry-After"))
    r.raise_for_status()
    return r.json()


def _default_flsenate_get(path: str) -> str:
    import httpx
    r = httpx.get(FLSENATE_BASE + path, headers={"User-Agent": _UA},
                  timeout=25, follow_redirects=True)
    r.raise_for_status()
    return r.text


class _RateLimited(RuntimeError):
    def __init__(self, retry_after=None):
        self.retry_after = retry_after


# ==========================================================================
# Handler factory
# ==========================================================================

INTAKE_AGENTS = frozenset({"record", "factchecker", "orchestrator"})


def build_intake_handlers(
    agent_id: str,
    store: Store,
    *,
    doe_fetch: Callable[..., str] | None = None,
    fec_get: Callable[[str, Mapping[str, Any]], dict] | None = None,
    flsenate_get: Callable[[str], str] | None = None,
    sleep: Callable[[float], None] | None = None,
    cache: DiskCache | None = None,
    fec_api_key: str | None = None,
) -> dict[str, Callable[[Mapping[str, Any]], dict]]:
    doe_fetch = doe_fetch or _default_doe_fetch
    fec_get = fec_get or _default_fec_get
    flsenate_get = flsenate_get or _default_flsenate_get
    sleep = sleep or __import__("time").sleep
    key = fec_api_key if fec_api_key is not None else os.environ.get("FEC_API_KEY")

    def doe_file_intake(payload: Mapping[str, Any]) -> dict:
        office = payload.get("office", "FED")
        try:
            text = doe_fetch(office)
        except Exception as err:  # noqa: BLE001
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"DoE fetch failed ({type(err).__name__})"]}
        try:
            parsed = parse_candidate_list(text)
        except DoEFormatError as err:
            return {"ok": False, "error": errors.UPSTREAM_FAILED, "reasons": [str(err)]}
        try:
            for race in parsed["races"].values():
                store.upsert_race(race)
            for cand in parsed["candidates"]:
                store.upsert_candidate(cand)
        except Exception as err:  # noqa: BLE001
            store.rollback()
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"intake upsert failed ({type(err).__name__})"]}
        return {"ok": True, "result": {
            "races": sorted(parsed["races"]),
            "candidate_count": len(parsed["candidates"]),
            "skipped": parsed["skipped"],
        }}

    def fec_api_query(payload: Mapping[str, Any]) -> dict:
        if not key:
            return {"ok": False, "error": errors.NOT_CONFIGURED,
                    "reasons": ["FEC_API_KEY is not set — fec_api_query unavailable"]}
        endpoint = payload.get("endpoint")
        template = _FEC_ENDPOINTS.get(endpoint or "")
        if template is None:
            return {"ok": False, "error": errors.NOT_IMPLEMENTED,
                    "reasons": [f"unknown FEC endpoint {endpoint!r}; allowed: "
                                + ", ".join(sorted(_FEC_ENDPOINTS))]}
        params = dict(payload.get("params") or {})
        try:
            path = template.format(**{k: params.pop(k) for k in
                                      _path_keys(template) if k in params})
        except KeyError as err:
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"FEC endpoint {endpoint!r} needs param {err}"]}
        params["api_key"] = key
        data = _fec_with_backoff(fec_get, path, params, sleep)
        if isinstance(data, dict) and "error" in data:
            return data  # already an error payload
        if not isinstance(data, dict) or "results" not in data:
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": ["FEC response missing expected 'results' envelope"]}
        return {"ok": True, "result": {
            "endpoint": endpoint,
            "pagination": data.get("pagination"),
            "results": data.get("results"),
        }}

    def fl_legislature_query(payload: Mapping[str, Any]) -> dict:
        year, number = payload.get("year"), payload.get("bill_number")
        if not (year and number):
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": ["fl_legislature_query needs 'year' and 'bill_number'"]}
        kind = payload.get("query_type", "bill")
        suffix = {"bill": "", "bill_text": "/BillText/Filed/HTML",
                  "votes": "/?StartTab=VoteHistory"}.get(kind)
        if suffix is None:
            return {"ok": False, "error": errors.NOT_IMPLEMENTED,
                    "reasons": [f"unknown fl_legislature query_type {kind!r}"]}
        path = f"/Session/Bill/{year}/{number}{suffix}"
        day = datetime.now(timezone.utc).date().isoformat()
        url = FLSENATE_BASE + path
        text = cache.get(url, day) if cache else None
        cached = text is not None
        if text is None:
            try:
                text = _strip_scripts(flsenate_get(path))
            except Exception as err:  # noqa: BLE001
                return {"ok": False, "error": errors.UPSTREAM_FAILED,
                        "reasons": [f"FL Senate fetch failed ({type(err).__name__})"]}
            # Fail-closed sanity check vs. WAF/block pages. The bill & votes
            # pages carry the site chrome ("The Florida Senate"); the raw
            # BillText/Filed/HTML does not, so only require substance there.
            looks_ok = ("The Florida Senate" in text if kind in ("bill", "votes")
                        else len(text) > 200)
            if not looks_ok:
                return {"ok": False, "error": errors.UPSTREAM_FAILED,
                        "reasons": ["FL Senate response did not look like a bill page"]}
            if cache:
                cache.put(url, day, text)
        return {"ok": True, "result": {
            "url": url, "query_type": kind, "retrieved_at": _now_iso(),
            "cached": cached, "text": text}}

    def jurisdiction_resolve(payload: Mapping[str, Any]) -> dict:
        zip5 = str(payload.get("zip5") or "").strip()
        if len(zip5) != 5 or not zip5.isdigit():
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": ["jurisdiction_resolve needs a 5-digit 'zip5'"]}
        try:
            rows = store.jurisdiction_resolve(zip5)
        except Exception as err:  # noqa: BLE001
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"jurisdiction_resolve failed ({type(err).__name__})"]}
        return {"ok": True, "result": {
            "zip5": zip5,
            "congressional_districts": sorted({r["congressional_district"] for r in rows}),
            "in_coverage": any(r.get("in_coverage") for r in rows),
            "statewide_races": sorted(_STATEWIDE_RACES.values()),
            "rows": rows,
        }}

    return {
        "doe_file_intake": doe_file_intake,
        "fec_api_query": fec_api_query,
        "fl_legislature_query": fl_legislature_query,
        "jurisdiction_resolve": jurisdiction_resolve,
    }


def _path_keys(template: str) -> list[str]:
    import re
    return re.findall(r"\{(\w+)\}", template)


def _fec_with_backoff(fec_get, path, params, sleep, retries: int = 3):
    delay = 1.0
    for attempt in range(retries + 1):
        try:
            return fec_get(path, params)
        except _RateLimited as rl:
            if attempt == retries:
                return {"ok": False, "error": errors.UPSTREAM_FAILED,
                        "reasons": ["FEC rate limit exceeded after retries"]}
            wait = float(rl.retry_after) if rl.retry_after else delay
            sleep(wait)
            delay *= 2
        except Exception as err:  # noqa: BLE001
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"FEC request failed ({type(err).__name__})"]}
