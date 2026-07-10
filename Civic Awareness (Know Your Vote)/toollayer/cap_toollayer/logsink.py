"""Log sinks — where the auto-logging middleware writes action_log rows.

The invariant (S1-R2): every tool invocation writes exactly one row BEFORE
its result is returned, and a failed log write fails the call. So the sink
must be configured explicitly — there is no silent default and no /dev/null
mode. Fail closed, degrade honestly.

Sinks:
  * PostgresSink  — the real thing (S1-03): one INSERT into action_log per
                    call, as cap_tool_wrapper. The psycopg driver and the
                    connection are injectable, so the sink is unit-testable
                    without a live DB. Live verification is founder-gated:
                    migration 0009 + `ALTER ROLE cap_tool_wrapper LOGIN`
                    must be applied before a real DSN can connect.
  * JsonlSink     — explicit dev/test sink (CAP_LOG_SINK=jsonl:<path>).
                    Append-only JSON lines, fsync'd per row.

Schema note: the guard cores emit a `guard_type` field
('bucket'|'allowlist'|'denied_tool') that the action_log DDL
(CAP_Logging_Schema_v1 §2, authoritative) does not carry as a column.
The middleware folds it into failure_reason as a '[guard_type] ' prefix
so nothing is lost and the DDL stays canonical.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Mapping

ENV_VAR = "CAP_LOG_SINK"

# The DDL columns (minus log_id/timestamp defaults) — the row contract.
LOG_COLUMNS: tuple[str, ...] = (
    "timestamp", "agent_id", "tool_called", "race_id", "candidate_id",
    "source_url", "source_id", "bucket_written", "claim_id",
    "status", "failure_reason", "guard_triggered",
)


class LogConfigError(RuntimeError):
    """No usable sink configured. The server must not start."""


class LogWriteError(RuntimeError):
    """A row could not be persisted. The tool call MUST fail (S1-R2)."""


class JsonlSink:
    """Append-only JSON-lines file. Dev/test only — opt in explicitly."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, row: Mapping[str, Any]) -> None:
        try:
            line = json.dumps({k: row.get(k) for k in LOG_COLUMNS}, default=str)
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(line + "\n")
                f.flush()
                os.fsync(f.fileno())
        except OSError as err:
            raise LogWriteError(f"jsonl sink write failed: {err}") from err


def _default_connect(dsn: str):
    """Open a real psycopg connection. Imported lazily so the module (and
    the whole tool-layer under --selfcheck / the stdlib tests) loads without
    the driver installed — degrade honestly if it isn't."""
    try:
        import psycopg  # psycopg 3
    except ImportError as err:
        raise LogConfigError(
            "CAP_LOG_SINK=postgres needs the 'psycopg' package "
            "(pip install 'psycopg[binary]') — it is not installed. "
            "Use CAP_LOG_SINK=jsonl:<path> for dev runs."
        ) from err
    return psycopg.connect(dsn)


class PostgresSink:
    """One INSERT into action_log per tool call, as cap_tool_wrapper (S1-03).

    Append-only and fail-closed: each write() inserts exactly one row and
    commits it; any driver/DB error is re-raised as LogWriteError so the
    tool call fails (S1-R2) — a killed DB mid-call can never leave an
    unlogged side effect. Only the exception *type* is surfaced, never its
    message or the DSN, so no secret leaks (S1-R4).

    The connection is opened eagerly at construction (fail fast if the log
    DB is unreachable at boot). `connect` is injectable purely for tests;
    production uses the real psycopg connect. Live verification against
    Supabase is blocked on the founder gate (apply 0009 + role LOGIN) —
    see AGENT_BRIEF §5.

    S1-04 note: the write-tool handlers will need their content INSERTs and
    this log row in one transaction. That coordination lands with the
    transactional claim_write; this sink owns its own connection for now.
    """

    # Built from LOG_COLUMNS so the column list, placeholders, and the
    # value tuple below can never drift out of alignment.
    INSERT_SQL = (
        "INSERT INTO action_log ("
        + ", ".join(LOG_COLUMNS)
        + ") VALUES ("
        + ", ".join(["%s"] * len(LOG_COLUMNS))
        + ")"
    )

    def __init__(self, dsn: str, connect=_default_connect):
        self._connect = connect
        try:
            self._conn = connect(dsn)
        except LogConfigError:
            raise  # already clear and secret-free (e.g. missing driver)
        except Exception as err:
            raise LogConfigError(
                f"cannot connect to the action_log DB ({type(err).__name__}); "
                "check SUPABASE_DB_URL and that cap_tool_wrapper has LOGIN"
            ) from err

    def write(self, row: Mapping[str, Any]) -> None:
        values = tuple(row.get(k) for k in LOG_COLUMNS)
        try:
            with self._conn.cursor() as cur:
                cur.execute(self.INSERT_SQL, values)
            self._conn.commit()
        except Exception as err:
            try:
                self._conn.rollback()
            except Exception:
                pass
            # type only — the message could echo host/DSN internals (S1-R4)
            raise LogWriteError(
                f"action_log INSERT failed ({type(err).__name__})"
            ) from err


def make_sink(env: Mapping[str, str] | None = None):
    env = os.environ if env is None else env
    raw = env.get(ENV_VAR)
    if raw is None or raw.strip() == "":
        raise LogConfigError(
            f"{ENV_VAR} is not set — refusing to start. Logging is not "
            "optional (S1-R2): set jsonl:<path> for dev or postgres for prod."
        )
    value = raw.strip()
    if value.startswith("jsonl:"):
        return JsonlSink(value[len("jsonl:"):])
    if value == "postgres":
        dsn = env.get("SUPABASE_DB_URL")
        if not dsn:
            raise LogConfigError(
                "CAP_LOG_SINK=postgres but SUPABASE_DB_URL is not set."
            )
        return PostgresSink(dsn)
    raise LogConfigError(f"unrecognized {ENV_VAR} value {value!r}")
