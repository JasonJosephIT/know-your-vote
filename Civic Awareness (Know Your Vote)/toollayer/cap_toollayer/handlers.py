"""S1-04 data-tool handlers — T7 source_register, T8 db_read, T9 claim_write.

Each handler runs the caller's guard core FIRST and only touches the DB on a
pass. It decides nothing about what's allowed — that lives in the guard
cores, unchanged. Handlers plug into `ToolLayer.handlers`; they never bypass
`dispatch()`, so the grant check, halt freeze, and pre-return logging still
wrap every call.

Outcome shape consumed by the middleware:
  reject/halt -> {ok:False, halt, guard_type, reasons}   (dispatch logs it)
  ok write    -> {ok:True, claim_id/source_id, bucket_written, result}

Content writes are left UNCOMMITTED so the post-handler log write commits
content + log atomically (see store.py). A DB error rolls back and degrades
to a structured `upstream_failed` — never a silent partial write.
"""

from __future__ import annotations

from typing import Any, Callable, Mapping

from . import errors
from .store import Store, UnknownQuery

Handler = Callable[[Mapping[str, Any]], dict]

# Only these identities have T7/T8/T9 guard contracts (Tool Spec §2); the
# orchestrator's data access arrives with S1-07 / S3.
DATA_AGENTS: frozenset[str] = frozenset({"profiler", "record", "factchecker"})


def _guard_reject(verdict: Mapping[str, Any]) -> dict:
    return {
        "ok": False,
        "halt": bool(verdict.get("halt")),
        "guard_type": verdict.get("guard_type"),
        "reasons": list(verdict.get("reasons") or []),
    }


def _db_failure(tool: str, err: Exception) -> dict:
    # type only — never echo DB internals / the DSN (S1-R4)
    return {
        "ok": False,
        "error": errors.UPSTREAM_FAILED,
        "reasons": [f"{tool} DB failure ({type(err).__name__})"],
    }


def build_data_handlers(agent_id: str, guard, store: Store) -> dict[str, Handler]:
    """Wire the three data tools to `guard` + `store` for one identity."""

    def source_register(payload: Mapping[str, Any]) -> dict:
        verdict = guard.validate_source_register(payload)
        if not verdict["ok"]:
            return _guard_reject(verdict)  # source_register never halts
        try:
            source_id, deduped = store.register_source(payload)
        except Exception as err:  # noqa: BLE001 - degrade honestly
            store.rollback()
            return _db_failure("source_register", err)
        return {
            "ok": True,
            "source_id": source_id,
            "result": {"source_id": source_id, "deduped": deduped},
        }

    def db_read(payload: Mapping[str, Any]) -> dict:
        buckets = list(payload.get("buckets") or [])
        verdict = guard.check_db_read(buckets)
        if not verdict["ok"]:
            return _guard_reject(verdict)
        query = payload.get("query")
        try:
            rows = store.read(query, payload, buckets)
        except UnknownQuery as err:
            return {"ok": False, "error": errors.NOT_IMPLEMENTED, "reasons": [str(err)]}
        except Exception as err:  # noqa: BLE001
            return _db_failure("db_read", err)
        return {"ok": True, "result": {"query": query, "rows": rows}}

    def claim_write(payload: Mapping[str, Any]) -> dict:
        # the payload IS the claim (flat), with a source_ids field.
        source_ids = list(payload.get("source_ids") or [])
        # Every store call is wrapped so a DB error becomes a logged
        # upstream_failed, never an unlogged exception out of dispatch (S1-R2).
        try:
            sources = store.read_sources(source_ids)
        except Exception as err:  # noqa: BLE001
            store.rollback()
            return _db_failure("claim_write", err)
        # Profiler/Record guards want {source_id: type}; the Fact-Checker
        # guard wants the full row (it needs url for the Tier-1 count).
        if agent_id == "factchecker":
            guard_arg: Mapping[str, Any] = sources
        else:
            guard_arg = {sid: row.get("type") for sid, row in sources.items()}
        verdict = guard.validate_claim_write(payload, guard_arg)
        if not verdict["ok"]:
            return _guard_reject(verdict)
        try:
            claim_id = store.write_claim(payload, source_ids)
        except Exception as err:  # noqa: BLE001
            store.rollback()  # claim + any claim_source roll back together
            return _db_failure("claim_write", err)
        return {
            "ok": True,
            "claim_id": claim_id,
            "bucket_written": payload.get("bucket"),
            # log one cited source so the Traceability query (bucket set,
            # source_id null) never flags this row (Logging Schema §4c).
            "source_id": source_ids[0] if source_ids else None,
            "result": {"claim_id": claim_id, "sources": len(source_ids)},
        }

    return {
        "source_register": source_register,
        "db_read": db_read,
        "claim_write": claim_write,
    }
