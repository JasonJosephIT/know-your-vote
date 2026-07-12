"""S1-04 content-plane data store — the DB side of T7/T8/T9.

A `Store` **is** a `logsink.PostgresSink`: it inherits `write()` (the
action_log INSERT + commit) and therefore shares ONE `cap_tool_wrapper`
connection with logging. That is what makes the invariants hold without any
middleware change:

  * A write handler runs its content INSERTs on this connection **without
    committing**. The middleware's post-handler `_log` -> `write()` then
    INSERTs the log row and commits — so content + log land in the SAME
    transaction (atomic), and a failed log write rolls the content back too
    (S1-R2: no unlogged side effect).
  * A mid-handler DB error (e.g. the 2nd claim_source insert) leaves the
    transaction dirty; the handler calls `rollback()` so nothing content-side
    persists, then the failure is still logged in a fresh transaction.

`db_read` is a fixed catalog of named, parameterized queries — never a raw
SQL surface (fail closed on an unknown name). Source dedupe uses the same
`url_norm` the Fact-Checker's independence rule uses (canonical core, not a
re-implementation).

Driver/connection injectable exactly like PostgresSink, so this is unit-
testable without a live Postgres. Live verification is founder-gated (apply
0009 + `ALTER ROLE cap_tool_wrapper LOGIN`).
"""

from __future__ import annotations

import uuid
from typing import Any, Mapping, Sequence

from . import cores, logsink


class UnknownQuery(RuntimeError):
    """db_read was asked for a query name outside the named catalog."""


def _default_store_connect(dsn: str):
    """Real psycopg connection with dict rows. Imported lazily so the module
    loads without the driver (mirrors logsink._default_connect)."""
    try:
        import psycopg  # psycopg 3
        from psycopg.rows import dict_row
    except ImportError as err:
        raise logsink.LogConfigError(
            "CAP_LOG_SINK=postgres needs the 'psycopg' package "
            "(pip install 'psycopg[binary]') — it is not installed."
        ) from err
    return psycopg.connect(dsn, row_factory=dict_row)


# db_read named catalog. Each value is (sql, param_keys) with %s positional
# params filled from the payload in order. claims_by_bucket is special-cased
# (it also binds the guard-checked bucket list). Nothing else is readable —
# an unknown name fails closed.
_NAMED_READS: dict[str, tuple[str, tuple[str, ...]]] = {
    "race": (
        "SELECT race_id, office, level, district, election, is_open_seat, "
        "incumbent_id, candidate_ids, key_dates FROM race WHERE race_id = %s",
        ("race_id",),
    ),
    "candidate": (
        "SELECT candidate_id, legal_name, party, office_sought, is_incumbent, "
        "qualifying_status, prior_offices, official_site, fec_id "
        "FROM candidate WHERE candidate_id = %s",
        ("candidate_id",),
    ),
    "profile": (
        "SELECT candidate_id, race_id, facts, positions, opinions, audit "
        "FROM profile WHERE candidate_id = %s AND race_id = %s",
        ("candidate_id", "race_id"),
    ),
    "spine_issues": (
        "SELECT issue_id, race_id, tier, candidate_id, title, description, "
        "source_id, display_order FROM issue "
        "WHERE race_id = %s AND tier = 'spine' ORDER BY display_order",
        ("race_id",),
    ),
}

_CLAIM_COLUMNS = (
    "claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, "
    "derived_from, verdict, verification"
)


class Store(logsink.PostgresSink):
    def __init__(self, dsn: str, connect=None):
        super().__init__(dsn, connect=connect or _default_store_connect)
        # canonical normalizer — same identity the >=2 Tier-1 rule uses.
        self._url_norm = cores.load_aux_core("allowlist_b").url_norm

    # -- transaction control (write() from PostgresSink owns commit) -------

    def rollback(self) -> None:
        try:
            self._conn.rollback()
        except Exception:
            pass

    # -- low-level helpers -------------------------------------------------

    def _execute(self, sql: str, params: Sequence[Any]) -> None:
        with self._conn.cursor() as cur:
            cur.execute(sql, params)

    def _fetchall(self, sql: str, params: Sequence[Any]) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]

    # -- T7 source_register ------------------------------------------------

    def register_source(self, payload: Mapping[str, Any]) -> tuple[str, bool]:
        """Dedupe on normalized URL, INSERT if new. Returns (source_id,
        deduped). Uncommitted — the tool-call log write commits it."""
        url = payload.get("url")
        norm = self._url_norm(url or "")
        if not norm:
            raise ValueError("source url missing or unparseable — cannot dedupe")
        existing = self._fetchall(
            "SELECT source_id FROM source WHERE url_norm = %s", (norm,)
        )
        if existing:
            return existing[0]["source_id"], True
        source_id = "src_" + uuid.uuid4().hex[:16]
        self._execute(
            "INSERT INTO source "
            "(source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, COALESCE(%s, NOW()))",
            (source_id, url, norm,
             payload.get("publisher") or "",
             payload.get("type"),
             payload.get("lean_tag") or "N/A",
             payload.get("retrieved_at")),
        )
        return source_id, False

    # -- read the cited sources for the claim_write guard ------------------

    def read_sources(self, source_ids: Sequence[str]) -> dict[str, dict]:
        """{source_id -> {source_id,url,type,lean_tag}} for the ids that
        exist. An absent id is simply not in the map — the guard reads that
        as 'not registered' ("no Source -> dropped")."""
        ids = list(source_ids or [])
        if not ids:
            return {}
        rows = self._fetchall(
            "SELECT source_id, url, type, lean_tag FROM source "
            "WHERE source_id = ANY(%s)",
            (ids,),
        )
        return {r["source_id"]: r for r in rows}

    # -- T1 intake upserts (idempotent by natural key) ---------------------

    def upsert_race(self, race: Mapping[str, Any]) -> None:
        """Idempotent by race_id (PK). candidate_ids is REPLACED, not
        appended, so re-running intake yields identical rows."""
        self._execute(
            "INSERT INTO race "
            "(race_id, office, level, district, election, candidate_ids) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (race_id) DO UPDATE SET "
            "office = EXCLUDED.office, level = EXCLUDED.level, "
            "district = EXCLUDED.district, election = EXCLUDED.election, "
            "candidate_ids = EXCLUDED.candidate_ids",
            (race["race_id"], race["office"], race["level"], race.get("district"),
             race["election"], list(race.get("candidate_ids") or [])),
        )

    def upsert_candidate(self, cand: Mapping[str, Any]) -> None:
        """Idempotent by candidate_id (PK). A later FEC linkage (fec_id) is
        preserved if this DoE row doesn't carry one."""
        self._execute(
            "INSERT INTO candidate "
            "(candidate_id, legal_name, party, office_sought, qualifying_status, fec_id) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (candidate_id) DO UPDATE SET "
            "legal_name = EXCLUDED.legal_name, party = EXCLUDED.party, "
            "office_sought = EXCLUDED.office_sought, "
            "qualifying_status = EXCLUDED.qualifying_status, "
            "fec_id = COALESCE(EXCLUDED.fec_id, candidate.fec_id)",
            (cand["candidate_id"], cand["legal_name"], cand["party"],
             cand["office_sought"], cand["qualifying_status"], cand.get("fec_id")),
        )

    # -- T4 jurisdiction_resolve (read zip_district; one mapping, no copy) --

    def jurisdiction_resolve(self, zip5: str) -> list[dict]:
        return self._fetchall(
            "SELECT zip5, county_fips, county_name, congressional_district, "
            "metro, is_split, in_coverage FROM zip_district "
            "WHERE zip5 = %s ORDER BY congressional_district",
            (zip5,),
        )

    # -- Allowlist A candidate scope (T5/T6, profiler) ---------------------

    def candidate_scope(self, candidate_id: str) -> dict:
        """The per-candidate inputs Allowlist A matches against: the
        registered official_site, this candidate's social accounts, and the
        social_platform reference rows. One scope, read live — never a copy."""
        crow = self._fetchall(
            "SELECT official_site FROM candidate WHERE candidate_id = %s",
            (candidate_id,),
        )
        accounts = self._fetchall(
            "SELECT platform, handle_norm, status FROM candidate_social_account "
            "WHERE candidate_id = %s",
            (candidate_id,),
        )
        platforms = self._fetchall(
            "SELECT platform, host_pattern, handle_in_path, active "
            "FROM social_platform",
            (),
        )
        return {
            "official_site": crow[0]["official_site"] if crow else None,
            "social_accounts": accounts,
            "platforms": platforms,
        }

    # -- T8 db_read (named catalog) ----------------------------------------

    def read(
        self, query: str | None, params: Mapping[str, Any], buckets: Sequence[str]
    ) -> list[dict]:
        if query == "claims_by_bucket":
            sql = (
                f"SELECT {_CLAIM_COLUMNS} FROM claim "
                "WHERE race_id = %s AND bucket = ANY(%s)"
            )
            args: list[Any] = [params.get("race_id"), list(buckets)]
            if params.get("candidate_id"):
                sql += " AND candidate_id = %s"
                args.append(params.get("candidate_id"))
            sql += " ORDER BY claim_id"
            return self._fetchall(sql, tuple(args))

        spec = _NAMED_READS.get(query or "")
        if spec is None:
            raise UnknownQuery(
                f"unknown db_read query {query!r}; named queries are: "
                + ", ".join(sorted(list(_NAMED_READS) + ["claims_by_bucket"]))
            )
        sql, keys = spec
        return self._fetchall(sql, tuple(params.get(k) for k in keys))

    # -- T10 balance_audit (orchestrator reads profiles, writes results) ---

    def read_profiles(self, race_id: str) -> list[dict]:
        return self._fetchall(
            "SELECT candidate_id, race_id, facts, positions, opinions, audit "
            "FROM profile WHERE race_id = %s ORDER BY candidate_id",
            (race_id,),
        )

    def write_balance_result(
        self, candidate_id: str, race_id: str, patch: Mapping[str, Any]
    ) -> None:
        """Merge the balance fields (balance_check_passed / flag_reason /
        flagged_at) into profile.audit. Uncommitted — the log write commits."""
        import json
        self._execute(
            "UPDATE profile SET audit = audit || %s::jsonb "
            "WHERE candidate_id = %s AND race_id = %s",
            (json.dumps(dict(patch)), candidate_id, race_id),
        )

    # -- T9 claim_write (transactional; caller rolls back on error) --------

    def write_claim(self, claim: Mapping[str, Any], source_ids: Sequence[str]) -> str:
        """INSERT the claim + one claim_source per cited source, uncommitted.
        Raises on any failure (the handler rolls back so nothing persists)."""
        cid = claim.get("claim_id")
        self._execute(
            "INSERT INTO claim "
            "(claim_id, candidate_id, race_id, issue_id, text, bucket, "
            "attributed, derived_from, verdict, verification) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (cid, claim.get("candidate_id"), claim.get("race_id"),
             claim.get("issue_id"), claim.get("text"), claim.get("bucket"),
             bool(claim.get("attributed")), claim.get("derived_from"),
             claim.get("verdict"), claim.get("verification")),
        )
        for sid in source_ids:
            self._execute(
                "INSERT INTO claim_source (claim_id, source_id) VALUES (%s, %s)",
                (cid, sid),
            )
        return cid
