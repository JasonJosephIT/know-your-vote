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
import re
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

# D2 (founder 2026-09-07): no party map. The DoE PartyCode is stored verbatim
# and the UI maps codes to labels with a raw-code fallback. The old
# {REP,DEM,NPA} -> else "other" map erased IND, LPF and CPF -- all real printed
# ballot lines in the target races -- into one bucket. Migration 0013 drops the
# CHECK that made the map necessary.

# candidate.qualifying_status is CHECK-constrained to three values, so this map
# is a real narrowing and not a display choice.
_STATUS = {
    "QUA": "qualified", "UNO": "qualified",
    "WIT": "withdrawn", "DEF": "withdrawn", "DNQ": "withdrawn", "REM": "withdrawn",
}

# D1 (founder 2026-09-07): ballot status tier. Status decides first, party
# second -- B1's whole-file cross-tab found WRI rows carrying DNQ, REM and WIT
# as well as QUA, so a write-in that withdrew is excluded for withdrawing
# rather than filed as a write-in.
_ON_BALLOT_STATUS = frozenset({"QUA", "UNO"})
_EXCLUDED_STATUS = frozenset({"DEF", "DNQ", "WIT", "REM"})
_WRITE_IN_PARTY = "WRI"


def _ballot_status(status_code: str, party_code: str) -> str:
    """Tier for one filed row, or raise on a code we have never seen.

    Fail loud rather than guess (Risk R1): the DoE form also offers ACT and
    ELE, neither present in today's export. ELE appears after certification
    and means the race is decided -- silently bucketing it would publish a
    settled race as a live one. An unknown code is a file change, and a file
    change should stop the run, not pick a default.
    """
    if status_code in _EXCLUDED_STATUS:
        return "excluded"
    if status_code in _ON_BALLOT_STATUS:
        return "write_in" if party_code == _WRITE_IN_PARTY else "ballot"
    raise DoEFormatError(
        f"unrecognised StatusCode {status_code!r} -- the DoE file changed; "
        "map it in data-ingest.md section 1 Q1 before re-running"
    )
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
    tiers: dict[str, int] = {"ballot": 0, "write_in": 0, "excluded": 0}
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
        status_code = col(row, "StatusCode")
        party_code = col(row, "PartyCode")
        ballot_status = _ballot_status(status_code, party_code)
        tiers[ballot_status] += 1
        candidates.append({
            "candidate_id": candidate_id,
            "legal_name": name,
            "party": party_code,          # verbatim (D2)
            "office_sought": col(row, "OfficeDesc"),
            "qualifying_status": _STATUS[status_code],
            "ballot_status": ballot_status,
            # PII columns (Addr*/Phone/Email/Trs*) are intentionally dropped.
        })
        race = races.setdefault(race_id, {
            "race_id": race_id, "office": col(row, "OfficeDesc"),
            "level": level, "district": district, "election": "general",
            "candidate_ids": [],
        })
        # D1: only printed ballot lines enter candidate_ids. Everyone else is
        # still stored as a candidate row -- the filing is a public fact, and
        # dropping it would make the exclusion invisible -- but they are not
        # part of the race, so they never reach the Balance Audit denominator
        # or a side-by-side. B1 measured 87 non-ballot names against 22 real
        # ones, in every one of the eight races; without this line the
        # pipeline HALTs on all of them forever.
        if ballot_status == "ballot":
            race["candidate_ids"].append(candidate_id)

    for race in races.values():  # stable order -> idempotent arrays
        race["candidate_ids"] = sorted(set(race["candidate_ids"]))
    return {"races": races, "candidates": candidates, "skipped": skipped,
            "tiers": tiers}


# ==========================================================================
# B4 — incumbency resolver (pure; the FEC fetch and the UPDATEs are separate)
# ==========================================================================
#
# The FEC `/candidates/` field `incumbent_challenge` is the only structured
# statement anyone publishes about who currently holds a federal seat, so B4
# reads it rather than inferring incumbency from a title string. It is also
# the field that decides whether a race is a challenge to a sitting member or
# an open seat -- a framing difference the Balance Audit and every profile
# page inherit -- which is why every ambiguity below refuses instead of
# guessing.
#
# Matching, in order:
#   1. `candidate.fec_id == fec_row.candidate_id`. If the DoE candidate
#      already carries an FEC id, that id decides and the name is not read.
#      The DoE file carries no FEC id, so `doe_file_intake` hydrates the
#      roster from `candidate.fec_id` in the database (a linkage an earlier
#      run or an operator established) before calling this resolver --
#      without that read the id branch is dead code and the name is always
#      what decides. See `_incumbency_for_race`.
#   2. Otherwise names. FEC `name` is "LAST, FIRST MIDDLE"; the DoE
#      `legal_name` parse_candidate_list builds is "First Middle Last". Both
#      sides are lowercased and split on non-alphanumerics, so case, commas,
#      periods and the hyphen in "DIAZ-BALART" all fall out. A match needs
#      BOTH the surname (the pre-comma tokens, compared against the same
#      number of trailing DoE tokens, so a two-word surname still matches)
#      AND the first given token.
#      The two sides are deliberately asymmetric about extra tokens: FEC
#      honorifics and suffixes sit among the *given* tokens ("SMITH, JOHN
#      MR JR") and are ignored, but a DoE `NameLast` that carries a suffix
#      ("Smith Jr" -> legal_name "John Smith Jr") puts that suffix where the
#      surname must be and so matches nothing -- that candidate falls to
#      `unresolved`. Fail-closed, and visible in the run report; seed the
#      candidate's `fec_id` to fix it (rule 1 then decides).
#
# Open seat is a property of the FEC field for the district, not of our
# roster coverage of it. Live FL-28 (checked 2026-09-07, `election_year=2026,
# office=H`) returns 7 filers -- Campione, Ehr, Gimenez[I], Henry, Lara,
# Mujica, Rojas -- against a general-election roster of 2-3 ballot names:
# primary losers and never-qualified filers keep their 2026 FEC filings. A
# rule that required every FEC row to resolve to a roster candidate could
# therefore never mark a genuinely open seat live, which defeats the reason
# this resolver exists. So:
#
#   `is_open_seat = True` iff (a) at least one 2026 House row exists for the
#   district, (b) no row has `incumbent_challenge == "I"`, and (c) every
#   row's `incumbent_challenge` is a known value (I/C/O). A non-"I" row that
#   matches no roster candidate does NOT block the open-seat verdict --
#   it is recorded under `unmatched_fec_rows` for auditability, not under
#   `unresolved` (which is for roster candidates).
#
# Refusals (`status: "refused"`, nothing written for the race, `is_open_seat`
# absent entirely so a caller cannot read a missing answer as a negative one):
#   * a null or unknown `incumbent_challenge` on ANY row, matched or not --
#     null means "we do not know whether this is the incumbent", and an
#     unrecognised code is a schema change; the fail-closed rule
#     (AGENT_BRIEF §4) says stop either way;
#   * an "I" row matching zero or several roster candidates. A member who is
#     retiring still has an FEC record, so an unmatched "I" is precisely the
#     case where calling the seat open would be wrong;
#   * two "I" rows -- the district cannot have two sitting members;
#   * no 2026 House rows at all. Empty is not evidence of an open seat.
#
# Unresolved (recorded with a reason, that candidate simply not written; does
# NOT block `is_open_seat` -- the incumbent's own FEC row, if any, is still
# in the field and would refuse via the unmatched-"I" rule above):
#   * a roster candidate matching zero or several FEC rows. Two or more
#     including an "I" row still refuses (see above): that is the incumbent
#     matching ambiguously, not a spectator filing.
#   * EVERY roster candidate sharing a single non-"I" FEC row with another
#     roster candidate. Each of them matches exactly one row, so neither is
#     ambiguous from its own side -- only the collision on the row makes the
#     pair unreadable, and recording it from the row's side alone would drop
#     both candidates silently.
#
# `unmatched_fec_rows` (recorded for auditability, never blocks anything;
# every entry carries a `note` saying which of the two cases it is):
#   * a non-"I" FEC row matching zero roster candidates -- a primary loser or
#     never-qualified filer who still has a 2026 filing is the ordinary
#     live-data case above ("no roster candidate matched");
#   * a non-"I" FEC row matched by two or more roster candidates ("collision"),
#     the row half of the unresolved-pair rule above.

_TARGET_ELECTION_YEAR = 2026
_CHALLENGE_CODES = frozenset({"I", "C", "O"})


def _name_tokens(name: str) -> list[str]:
    return [t for t in re.split(r"[^0-9a-z]+", (name or "").lower()) if t]


def _fec_name_parts(name: str) -> tuple[list[str], list[str]]:
    """"LAST, FIRST MIDDLE" -> (surname tokens, given tokens)."""
    surname, sep, given = (name or "").partition(",")
    if not sep:
        return [], []          # not the documented shape -> matches nothing
    return _name_tokens(surname), _name_tokens(given)


def _names_match(doe_name: str, fec_name: str) -> bool:
    doe = _name_tokens(doe_name)
    surname, given = _fec_name_parts(fec_name)
    if not (doe and surname and given):
        return False
    n = len(surname)
    # `>` not `>=`: the first token must be a given name, not part of the
    # surname, or a bare "Gimenez" would match "GIMENEZ, CARLOS".
    return len(doe) > n and doe[-n:] == surname and doe[0] == given[0]


def resolve_incumbency(
    race: Mapping[str, Any],
    candidates: list[Mapping[str, Any]],
    fec_rows: list[Mapping[str, Any]],
) -> dict:
    """Match a race's ballot-tier roster against FEC rows. Pure — no I/O.

    See the section comment above for the matching order and every refusal.
    Returns either
      {"race_id", "status": "resolved", "incumbent_id", "is_open_seat",
       "candidates": {cid: {"is_incumbent", "fec_id"}}, "unresolved": [...],
       "unmatched_fec_rows": [{"fec_candidate_id", "name",
                                "incumbent_challenge", "note"}]}
    or {"race_id", "status": "refused", "reasons": [...], "unresolved": [...],
        "unmatched_fec_rows": [...]}
    — a refusal carries no `is_open_seat` at all, so a caller cannot read a
    missing answer as a False one, but it does carry everything classified
    before the refusal so the run report stays auditable. `is_open_seat` is a
    property of the FEC field for the district: a non-"I" row with no roster
    match goes to `unmatched_fec_rows` and does not block it (see the section
    comment).
    """
    race_id = race.get("race_id")
    # `election_years` is the year the candidate ran, so it names this
    # election exactly; `cycles` is the two-year FEC reporting bucket and a
    # 2025 special-election filer also carries cycle 2026. The narrower field
    # is the right one for "who is on the November 2026 ballot".
    rows = [r for r in fec_rows
            if str(r.get("office") or "").upper() == "H"
            and _TARGET_ELECTION_YEAR in (r.get("election_years") or [])]
    if not rows:
        return {"race_id": race_id, "status": "refused", "unresolved": [],
                "unmatched_fec_rows": [],
                "reasons": [f"no FEC House rows for {_TARGET_ELECTION_YEAR} in "
                            f"district {race.get('district')!r}"]}

    # Fail closed on every row's code first, before any matching: a null or
    # unrecognised `incumbent_challenge` refuses the whole race regardless of
    # whether that row ever matches a roster candidate, because we cannot
    # tell from an unknown code whether it names the incumbent.
    reasons: list[str] = []
    for row in rows:
        code = row.get("incumbent_challenge")
        if code is None:
            reasons.append(
                f"FEC row {row.get('candidate_id')!r} carries a null "
                "incumbent_challenge; refusing because we do not know "
                "whether this is the incumbent")
        elif code not in _CHALLENGE_CODES:
            reasons.append(
                f"FEC row {row.get('candidate_id')!r} carries an unrecognised "
                f"incumbent_challenge {code!r}; expected I, C, O or null")

    # Both directions of the match, so "one row, one candidate" is checkable
    # from either side.
    matched: dict[int, list[str]] = {}
    per_candidate_rows: dict[str, list[int]] = {}
    for cand in candidates:
        cid = cand.get("candidate_id")
        fec_id = cand.get("fec_id")
        hits = [i for i, row in enumerate(rows)
                if (row.get("candidate_id") == fec_id if fec_id
                    else _names_match(cand.get("legal_name") or "",
                                      row.get("name") or ""))]
        per_candidate_rows[cid] = hits
        for i in hits:
            matched.setdefault(i, []).append(cid)

    # A row matched by two or more roster candidates makes EVERY one of them
    # unresolved. Each of them matched exactly one row, so the per-candidate
    # count below cannot see the problem; without this the whole colliding
    # group would be dropped in silence -- no write, no `unresolved` entry,
    # and a `resolved` status saying nothing went wrong.
    collisions = {i: cids for i, cids in matched.items() if len(cids) > 1}

    unresolved: list[dict] = []
    for cid, hits in per_candidate_rows.items():
        if len(hits) != 1:
            unresolved.append({"candidate_id": cid, "reason": (
                f"matched {len(hits)} FEC rows; a name has to resolve to "
                "exactly one filing to be written")})
        elif hits[0] in collisions:
            others = [c for c in collisions[hits[0]] if c != cid]
            unresolved.append({"candidate_id": cid, "reason": (
                f"FEC row {rows[hits[0]].get('candidate_id')!r} is matched by "
                f"{len(collisions[hits[0]])} ballot-tier candidates "
                f"({', '.join(sorted(collisions[hits[0]]))}); one filing "
                f"cannot be two people, so neither {cid} nor "
                f"{', '.join(sorted(others))} is written")})

    incumbent_ids: list[str] = []
    incumbent_fec_ids: list[Any] = []
    unmatched_fec_rows: list[dict] = []
    resolved_pairs: dict[str, int] = {}      # cid -> row index, 1:1 and coded
    for i, row in enumerate(rows):
        cids = matched.get(i, [])
        code = row.get("incumbent_challenge")
        is_incumbent_row = code == "I"
        clean = len(cids) == 1 and len(per_candidate_rows.get(cids[0], [])) == 1
        if not clean:
            if is_incumbent_row:
                why = (f"matched {len(cids)} ballot-tier candidates in "
                       f"{race_id}" if len(cids) != 1 else
                       f"matched {cids[0]}, who also matches "
                       f"{len(per_candidate_rows[cids[0]])} FEC rows")
                reasons.append(
                    f"FEC row {row.get('candidate_id')!r} is the incumbent "
                    f"({why}); refusing rather than reporting an open seat")
            elif not cids:
                # A primary loser or never-qualified filer who still has a
                # 2026 FEC filing but matches no roster candidate at all.
                # Recorded for auditability; never blocks the open-seat
                # verdict — that is the whole point of this rule.
                unmatched_fec_rows.append({
                    "fec_candidate_id": row.get("candidate_id"),
                    "name": row.get("name"),
                    "incumbent_challenge": code,
                    "note": "no roster candidate matched",
                })
            elif len(cids) > 1:
                # Two roster candidates on one filing. Both are already in
                # `unresolved` (see the `collisions` block above); the row
                # itself is recorded here so the run report names the filing
                # they collided on, not just the candidates.
                unmatched_fec_rows.append({
                    "fec_candidate_id": row.get("candidate_id"),
                    "name": row.get("name"),
                    "incumbent_challenge": code,
                    "note": ("collision: matched "
                             f"{len(cids)} ballot-tier candidates "
                             f"({', '.join(sorted(cids))})"),
                })
            # else: exactly one roster candidate matched this row, but that
            # candidate also matches another row — already recorded from the
            # roster side in `unresolved` above. Nothing new to add.
            continue
        if is_incumbent_row:
            incumbent_ids.append(cids[0])
            incumbent_fec_ids.append(row.get("candidate_id"))
        resolved_pairs[cids[0]] = i

    if len(incumbent_ids) > 1:
        reasons.append(
            f"{len(incumbent_ids)} FEC rows claim to be the incumbent in "
            f"{race_id} ({', '.join(repr(f) for f in incumbent_fec_ids)}); "
            "a district has one")
    if reasons:
        return {"race_id": race_id, "status": "refused",
                "reasons": reasons, "unresolved": unresolved,
                # Everything classified before the refusal, so the run report
                # still shows which filings were read and how.
                "unmatched_fec_rows": unmatched_fec_rows}

    per_candidate = {
        cid: {"is_incumbent": rows[i].get("incumbent_challenge") == "I",
              "fec_id": rows[i].get("candidate_id")}
        for cid, i in sorted(resolved_pairs.items())
    }
    return {
        "race_id": race_id,
        "status": "resolved",
        "incumbent_id": incumbent_ids[0] if incumbent_ids else None,
        # Every row's code is known and non-null at this point (checked
        # above, fail-closed). So an open seat is simply: no row is "I" —
        # unmatched non-"I" rows and unresolved roster candidates do not
        # count against it (see the section comment).
        "is_open_seat": not incumbent_ids,
        "candidates": per_candidate,
        "unresolved": unresolved,
        "unmatched_fec_rows": unmatched_fec_rows,
    }


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

    def _incumbency_for_race(race: Mapping[str, Any],
                             roster: list[Mapping[str, Any]]) -> dict:
        race_id = race.get("race_id")
        if race.get("level") != "federal" or not race.get("district"):
            return {"status": "not_applicable",
                    "reason": "FEC covers federal races only"}
        # Hydrate the roster with any FEC id already stored on the candidate
        # row, so the resolver's id-first rule can actually fire: the DoE file
        # never carries one, and the dicts here came straight out of
        # parse_candidate_list. The intake upserts above ran on this same
        # connection, so this read sees them.
        try:
            stored = store.read_candidate_fec_ids(
                [c.get("candidate_id") for c in roster])
        except Exception as err:  # noqa: BLE001
            # Same shape as a FEC fetch failure and for the same reason: the
            # DoE intake already succeeded and must not be rolled back for a
            # read that only improves matching. This race is simply not
            # resolved, and the reason names the read.
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"read_candidate_fec_ids failed for {race_id} "
                                f"({type(err).__name__})"]}
        by_stored_id = {r.get("candidate_id"): r.get("fec_id")
                        for r in (stored or []) if r.get("fec_id")}
        if by_stored_id:
            roster = [dict(c, fec_id=by_stored_id[c.get("candidate_id")])
                      if c.get("candidate_id") in by_stored_id else c
                      for c in roster]
        data = _fec_with_backoff(fec_get, _FEC_ENDPOINTS["candidates"], {
            # `district` is two digits on the wire; parse_candidate_list has
            # already stripped the leading zero for the race_id.
            "state": "FL", "district": f"{int(race['district']):02d}",
            "office": "H", "election_year": _TARGET_ELECTION_YEAR,
            "per_page": 100, "api_key": key,
        }, sleep)
        if isinstance(data, dict) and "error" in data:
            return data                      # already a structured error
        if not isinstance(data, dict) or "results" not in data:
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": ["FEC response missing expected 'results' envelope"]}
        results = data["results"]
        # One page only, and we never page: a second page could hold the "I"
        # row that makes this a challenge rather than an open seat, so a
        # truncated field is refused outright rather than published from the
        # part we happened to see. An absent `pagination.count` is refused for
        # the same reason -- unknown completeness is not completeness.
        pagination = data.get("pagination")
        count = pagination.get("count") if isinstance(pagination, dict) else None
        if not isinstance(count, int) or isinstance(count, bool):
            return {"race_id": race_id, "status": "refused", "unresolved": [],
                    "unmatched_fec_rows": [],
                    "reasons": ["FEC response carries no pagination.count, so "
                                "we cannot tell whether the field is complete; "
                                f"refusing {race_id}"]}
        if count > len(results):
            return {"race_id": race_id, "status": "refused", "unresolved": [],
                    "unmatched_fec_rows": [],
                    "reasons": [f"FEC reports {count} candidates for {race_id} "
                                f"but returned {len(results)}; the field is "
                                "truncated and a later page could hold the "
                                "incumbent"]}
        return resolve_incumbency(race, roster, results)

    def doe_file_intake(payload: Mapping[str, Any]) -> dict:
        office = payload.get("office", "FED")
        fill_incumbency = bool(payload.get("fill_incumbency"))
        # Before the DoE fetch, not after: a run that cannot finish should not
        # half-finish. Nothing is written and nothing is downloaded.
        if fill_incumbency and not key:
            return {"ok": False, "error": errors.NOT_CONFIGURED,
                    "reasons": ["FEC_API_KEY is not set — incumbency fill "
                                "unavailable"]}
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
        result = {
            "races": sorted(parsed["races"]),
            "candidate_count": len(parsed["candidates"]),
            "skipped": parsed["skipped"],
            # Per-tier counts make the D1 exclusion auditable from the run
            # report rather than only from the database: a caller can see that
            # 87 filings were parsed and 22 became ballot lines.
            "tiers": parsed["tiers"],
        }
        if fill_incumbency:
            by_id = {c["candidate_id"]: c for c in parsed["candidates"]}
            incumbency: dict[str, dict] = {}
            for race_id, race in sorted(parsed["races"].items()):
                # Only the ballot tier is a roster candidate — candidate_ids
                # already holds exactly that set (D1).
                roster = [by_id[cid] for cid in race["candidate_ids"]]
                out = _incumbency_for_race(race, roster)
                incumbency[race_id] = out
                if out.get("status") != "resolved":
                    continue        # refused / not_applicable / upstream error
                try:
                    store.write_incumbency(race_id, out["incumbent_id"],
                                           out["is_open_seat"], out["candidates"])
                except Exception as err:  # noqa: BLE001
                    # A failed UPDATE leaves the transaction dirty, so the DoE
                    # upserts above are lost either way — roll back and say so
                    # rather than committing a half-written run. (A FEC *fetch*
                    # failure is different: it is recorded per race and the
                    # intake stands.)
                    store.rollback()
                    return {"ok": False, "error": errors.UPSTREAM_FAILED,
                            "reasons": [f"incumbency write failed for {race_id} "
                                        f"({type(err).__name__})"]}
            result["incumbency"] = incumbency
        return {"ok": True, "result": result}

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
