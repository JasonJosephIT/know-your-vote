"""S1-02 skeleton tests — stdlib only, like every other core test here.

Covers the four load-bearing behaviors of the skeleton:
  identity fail-closed · denied_tool via the canonical guards ·
  T11 never callable · log-write failure fails the call ·
  halted state freezes writes but not reads.

Run: python3 test_toollayer_skeleton.py
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cap_toollayer import (  # noqa: E402
    cores, discovery, errors, handlers, identity, intake, logsink, middleware,
    schemas, server, store, synthesis,
)


class MemorySink:
    def __init__(self):
        self.rows = []

    def write(self, row):
        self.rows.append(dict(row))


class ExplodingSink:
    def write(self, row):
        raise logsink.LogWriteError("disk on fire")


def make_layer(agent_id="profiler", sink=None):
    sink = sink if sink is not None else MemorySink()
    return middleware.ToolLayer(agent_id, cores.load_guard_core(agent_id), sink), sink


class TestIdentity(unittest.TestCase):
    def test_missing_identity_refuses(self):
        with self.assertRaises(identity.IdentityError):
            identity.resolve_identity({})

    def test_blank_identity_refuses(self):
        with self.assertRaises(identity.IdentityError):
            identity.resolve_identity({"CAP_AGENT_ID": "  "})

    def test_unknown_identity_refuses(self):
        with self.assertRaises(identity.IdentityError):
            identity.resolve_identity({"CAP_AGENT_ID": "R2"})

    def test_all_valid_identities_resolve(self):
        for agent in sorted(identity.VALID_IDENTITIES):
            self.assertEqual(
                identity.resolve_identity({"CAP_AGENT_ID": agent}), agent
            )


class TestCores(unittest.TestCase):
    def test_every_identity_has_a_loadable_guard_core(self):
        for agent in sorted(identity.VALID_IDENTITIES):
            guard = cores.load_guard_core(agent)
            self.assertTrue(callable(guard.check_tool_access))

    def test_aux_cores_load(self):
        for name in ("allowlist_a", "allowlist_b", "balance_audit"):
            cores.load_aux_core(name)


class TestDispatchGuards(unittest.TestCase):
    def test_profiler_denied_primary_api(self):
        layer, sink = make_layer("profiler")
        result = layer.dispatch("fec_api_query", {"race_id": "r1"})
        self.assertEqual(result["error"], errors.DENIED_TOOL)
        self.assertEqual(len(sink.rows), 1)
        row = sink.rows[0]
        self.assertEqual(row["agent_id"], "profiler")
        self.assertEqual(row["tool_called"], "fec_api_query")
        self.assertEqual(row["status"], "fail")
        self.assertTrue(row["guard_triggered"])
        self.assertIn("[denied_tool]", row["failure_reason"])

    def test_orchestrator_denied_claim_write(self):
        layer, sink = make_layer("orchestrator")
        result = layer.dispatch("claim_write", {"bucket": "stated_position"})
        self.assertEqual(result["error"], errors.DENIED_TOOL)
        self.assertTrue(sink.rows[0]["guard_triggered"])

    def test_log_action_never_callable_for_any_identity(self):
        for agent in sorted(identity.VALID_IDENTITIES):
            layer, sink = make_layer(agent)
            result = layer.dispatch("log_action", {})
            self.assertEqual(result["error"], errors.DENIED_TOOL, agent)
            self.assertEqual(sink.rows[0]["status"], "fail")

    def test_unknown_tool_denied(self):
        layer, _ = make_layer("profiler")
        result = layer.dispatch("drop_table", {})
        self.assertEqual(result["error"], errors.DENIED_TOOL)

    def test_granted_but_unimplemented_is_honest_and_logged(self):
        layer, sink = make_layer("profiler")
        result = layer.dispatch("web_search", {"query": "x"})
        self.assertEqual(result["error"], errors.NOT_IMPLEMENTED)
        self.assertEqual(sink.rows[0]["status"], "fail")
        self.assertFalse(sink.rows[0]["guard_triggered"])  # not a guard event


class TestLoggingInvariant(unittest.TestCase):
    def test_log_write_failure_fails_the_call(self):
        layer, _ = make_layer("profiler", sink=ExplodingSink())
        with self.assertRaises(logsink.LogWriteError):
            layer.dispatch("fec_api_query", {})

    def test_jsonl_sink_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "log.jsonl"
            layer, _ = make_layer("record", sink=logsink.JsonlSink(path))
            layer.dispatch("web_search", {})  # denied for record
            rows = [json.loads(l) for l in path.read_text().splitlines()]
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["agent_id"], "record")
            self.assertEqual(
                sorted(rows[0]), sorted(logsink.LOG_COLUMNS)
            )


class TestHaltState(unittest.TestCase):
    def test_halt_freezes_writes_not_reads(self):
        layer, sink = make_layer("profiler")
        layer.handlers["claim_write"] = lambda payload: {
            "ok": False, "halt": True, "guard_type": "bucket",
            "reasons": ["claim_write bucket='verifiable_fact' outside "
                        "own bucket 'stated_position'"],
        }
        result = layer.dispatch("claim_write", {"bucket": "verifiable_fact"})
        self.assertEqual(result["error"], errors.BUCKET)
        self.assertTrue(layer.halted)
        self.assertTrue(sink.rows[-1]["guard_triggered"])

        frozen = layer.dispatch("source_register", {"type": "candidate_self"})
        self.assertEqual(frozen["error"], errors.PIPELINE_HALTED)

        read = layer.dispatch("db_read", {"buckets": ["stated_position"]})
        self.assertEqual(read["error"], errors.NOT_IMPLEMENTED)  # reads not frozen

    def test_handler_halt_error_code_defaults(self):
        layer, _ = make_layer("factchecker")
        layer.handlers["claim_write"] = lambda payload: {
            "ok": False, "halt": True, "guard_type": "bucket",
            "reasons": ["H1: write to stated_position"], "error": "bucket",
        }
        result = layer.dispatch("claim_write", {})
        self.assertEqual(result["error"], errors.BUCKET)


class TestLogConfig(unittest.TestCase):
    def test_no_sink_refuses(self):
        with self.assertRaises(logsink.LogConfigError):
            logsink.make_sink({})

    def test_postgres_sink_degrades_honestly_without_a_reachable_db(self):
        # PostgresSink is built (S1-03), but constructing it must fail
        # closed with a config error — either the psycopg driver is absent
        # (this env) or the DSN can't connect. Never a silent success.
        with self.assertRaises(logsink.LogConfigError):
            logsink.make_sink(
                {"CAP_LOG_SINK": "postgres", "SUPABASE_DB_URL": "postgres://x"}
            )

    def test_unknown_sink_refuses(self):
        with self.assertRaises(logsink.LogConfigError):
            logsink.make_sink({"CAP_LOG_SINK": "syslog"})


class FakeCursor:
    """Minimal psycopg-shaped cursor: context manager + execute()."""

    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params):
        if self.conn.fail_on_execute:
            raise RuntimeError("server closed the connection unexpectedly")
        self.conn.pending = (sql, params)


class FakeConn:
    """A stand-in DB-API connection so PostgresSink is testable without a
    live Postgres. `rows` holds only committed inserts (params tuple)."""

    def __init__(self, fail_on_execute=False):
        self.rows = []
        self.pending = None
        self.fail_on_execute = fail_on_execute
        self.committed = 0
        self.rolled_back = 0

    def cursor(self):
        return FakeCursor(self)

    def commit(self):
        if self.pending is not None:
            self.rows.append(self.pending)
            self.pending = None
        self.committed += 1

    def rollback(self):
        self.pending = None
        self.rolled_back += 1


def make_pg_layer(agent_id="profiler", conn=None):
    conn = conn if conn is not None else FakeConn()
    sink = logsink.PostgresSink("postgres://unused", connect=lambda dsn: conn)
    layer = middleware.ToolLayer(agent_id, cores.load_guard_core(agent_id), sink)
    return layer, conn


def logged_row(conn, i=-1):
    """Decode the i-th committed INSERT back into a column->value dict."""
    _sql, params = conn.rows[i]
    return dict(zip(logsink.LOG_COLUMNS, params))


class TestPostgresSink(unittest.TestCase):
    """S1-03 contract: through the real PostgresSink, a rejected call, a read
    call, and a write call each produce exactly one correct action_log row;
    a DB killed mid-call fails the tool call and orphans nothing."""

    def test_insert_sql_matches_the_ddl_column_set(self):
        # column list and placeholder count stay locked to LOG_COLUMNS
        self.assertIn(", ".join(logsink.LOG_COLUMNS), logsink.PostgresSink.INSERT_SQL)
        self.assertEqual(
            logsink.PostgresSink.INSERT_SQL.count("%s"), len(logsink.LOG_COLUMNS)
        )

    def test_rejected_call_writes_exactly_one_row(self):
        layer, conn = make_pg_layer("profiler")
        result = layer.dispatch("fec_api_query", {"race_id": "r1"})  # denied
        self.assertEqual(result["error"], errors.DENIED_TOOL)
        self.assertEqual(len(conn.rows), 1)
        row = logged_row(conn)
        self.assertEqual(row["agent_id"], "profiler")
        self.assertEqual(row["tool_called"], "fec_api_query")
        self.assertEqual(row["race_id"], "r1")
        self.assertEqual(row["status"], "fail")
        self.assertTrue(row["guard_triggered"])
        self.assertIn("[denied_tool]", row["failure_reason"])
        self.assertIsNone(row["bucket_written"])

    def test_read_call_writes_exactly_one_row(self):
        layer, conn = make_pg_layer("profiler")
        layer.handlers["db_read"] = lambda payload: {"ok": True, "result": {"claims": []}}
        result = layer.dispatch(
            "db_read", {"race_id": "r1", "buckets": ["stated_position"]}
        )
        self.assertTrue(result["ok"])
        self.assertEqual(len(conn.rows), 1)
        row = logged_row(conn)
        self.assertEqual(row["tool_called"], "db_read")
        self.assertEqual(row["status"], "success")
        self.assertFalse(row["guard_triggered"])
        self.assertIsNone(row["bucket_written"])  # reads never stamp a bucket
        self.assertIsNone(row["claim_id"])

    def test_write_call_writes_exactly_one_row(self):
        layer, conn = make_pg_layer("profiler")
        layer.handlers["claim_write"] = lambda payload: {
            "ok": True, "bucket_written": "stated_position",
            "claim_id": "c1", "source_id": "s1", "result": {"claim_id": "c1"},
        }
        result = layer.dispatch(
            "claim_write",
            {"race_id": "r1", "candidate_id": "cand1", "bucket": "stated_position"},
        )
        self.assertTrue(result["ok"])
        self.assertEqual(len(conn.rows), 1)
        row = logged_row(conn)
        self.assertEqual(row["tool_called"], "claim_write")
        self.assertEqual(row["status"], "success")
        self.assertEqual(row["bucket_written"], "stated_position")
        self.assertEqual(row["claim_id"], "c1")
        self.assertEqual(row["source_id"], "s1")
        self.assertFalse(row["guard_triggered"])

    def test_db_killed_mid_call_fails_the_call_and_orphans_nothing(self):
        conn = FakeConn(fail_on_execute=True)
        layer, conn = make_pg_layer("profiler", conn=conn)
        handler_ran = []
        layer.handlers["claim_write"] = lambda payload: (
            handler_ran.append(True) or {
                "ok": True, "bucket_written": "stated_position",
                "claim_id": "c1", "source_id": "s1",
            }
        )
        with self.assertRaises(logsink.LogWriteError):
            layer.dispatch("claim_write", {"bucket": "stated_position"})
        self.assertEqual(conn.rows, [])       # nothing committed to the log
        self.assertEqual(conn.rolled_back, 1)  # the failed INSERT was rolled back

    def test_write_error_carries_no_dsn_or_message(self):
        conn = FakeConn(fail_on_execute=True)
        sink = logsink.PostgresSink("postgres://user:secret@host/db",
                                    connect=lambda dsn: conn)
        with self.assertRaises(logsink.LogWriteError) as ctx:
            sink.write({k: None for k in logsink.LOG_COLUMNS})
        msg = str(ctx.exception)
        self.assertNotIn("secret", msg)
        self.assertNotIn("postgres://", msg)
        self.assertIn("RuntimeError", msg)  # type only

    def test_construction_wraps_connect_failure_without_leaking(self):
        def boom(dsn):
            raise OSError("could not connect to postgres://user:secret@host")
        with self.assertRaises(logsink.LogConfigError) as ctx:
            logsink.PostgresSink("postgres://user:secret@host/db", connect=boom)
        self.assertNotIn("secret", str(ctx.exception))


class FakeDb:
    """Transaction-modelling DB-API stand-in for the Store (S1-04).

    Writes stage into `pending`; commit() moves them to `committed`,
    rollback() discards them — so content + the log row commit or roll back
    together, exactly like the shared cap_tool_wrapper connection. SELECTs
    return the next primed result set. `fail_at` forces the Nth execute to
    raise (to drive atomic-rollback / killed-DB paths)."""

    def __init__(self, fail_at=None):
        self.pending = []
        self.committed = []
        # SELECTs are not writes, so they never reach `pending` -- but the
        # query shape is sometimes the thing under test (A3's LEFT JOIN).
        self.selects = []
        self._results = []
        self.fail_at = fail_at
        self.execute_count = 0
        self.commits = 0
        self.rolled_back = 0

    def prime_read(self, rows):
        self._results.append(list(rows))
        return self

    def cursor(self):
        return FakeDbCursor(self)

    def commit(self):
        self.committed.extend(self.pending)
        self.pending = []
        self.commits += 1

    def rollback(self):
        self.pending = []
        self.rolled_back += 1


class FakeDbCursor:
    def __init__(self, db):
        self.db = db
        self._rows = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.db.execute_count += 1
        if self.db.fail_at == self.db.execute_count:
            raise RuntimeError("server closed the connection unexpectedly")
        if sql.lstrip().upper().startswith("SELECT"):
            self.db.selects.append((sql, params))
            self._rows = self.db._results.pop(0) if self.db._results else []
        else:
            self.db.pending.append((sql, params))

    def fetchall(self):
        return self._rows


def make_data_layer(agent_id, db=None):
    db = db if db is not None else FakeDb()
    st = store.Store("postgres://unused", connect=lambda dsn: db)
    guard = cores.load_guard_core(agent_id)
    layer = middleware.ToolLayer(agent_id, guard, st)
    layer.handlers.update(handlers.build_data_handlers(agent_id, guard, st))
    return layer, db


def committed_log_rows(db):
    return [dict(zip(logsink.LOG_COLUMNS, params))
            for sql, params in db.committed if "action_log" in sql]


def committed_into(db, table):
    return [(sql, params) for sql, params in db.committed if f"INTO {table} (" in sql]


class TestDataToolsSourceRegister(unittest.TestCase):
    def test_new_source_inserts_and_logs_together(self):
        layer, db = make_data_layer("profiler")
        db.prime_read([])  # dedupe SELECT: not found
        res = layer.dispatch("source_register", {
            "url": "https://jane4congress.com/about", "type": "candidate_self",
            "publisher": "Jane for Congress",
        })
        self.assertTrue(res["ok"])
        self.assertFalse(res["result"]["deduped"])
        self.assertEqual(len(committed_into(db, "source")), 1)   # inserted
        log = committed_log_rows(db)
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0]["tool_called"], "source_register")
        self.assertEqual(log[0]["status"], "success")
        self.assertEqual(log[0]["source_url"], "https://jane4congress.com/about")

    def test_duplicate_url_returns_existing_id_no_insert(self):
        layer, db = make_data_layer("profiler")
        db.prime_read([{"source_id": "src_existing"}])
        res = layer.dispatch("source_register", {
            "url": "https://jane4congress.com/about", "type": "candidate_self",
        })
        self.assertTrue(res["ok"])
        self.assertEqual(res["result"]["source_id"], "src_existing")
        self.assertTrue(res["result"]["deduped"])
        self.assertEqual(len(committed_into(db, "source")), 0)  # no new row

    def test_wrong_type_is_rejected_and_logged(self):
        layer, db = make_data_layer("profiler")
        res = layer.dispatch("source_register", {
            "url": "https://apnews.com/x", "type": "factual_reporting",
        })
        self.assertEqual(res["error"], errors.BUCKET)
        self.assertEqual(len(committed_into(db, "source")), 0)
        self.assertTrue(committed_log_rows(db)[0]["guard_triggered"])

    def test_factchecker_requires_lean_tag(self):
        layer, db = make_data_layer("factchecker")
        res = layer.dispatch("source_register", {
            "url": "https://fec.gov/x", "type": "primary_doc",  # no lean_tag
        })
        self.assertEqual(res["error"], errors.BUCKET)

    def test_factchecker_lean_tagged_source_ok(self):
        layer, db = make_data_layer("factchecker")
        db.prime_read([])
        res = layer.dispatch("source_register", {
            "url": "https://fec.gov/x", "type": "primary_doc", "lean_tag": "center",
        })
        self.assertTrue(res["ok"])


class TestDataToolsDbRead(unittest.TestCase):
    def test_profiler_own_bucket_read_ok(self):
        layer, db = make_data_layer("profiler")
        db.prime_read([{"claim_id": "c1", "bucket": "stated_position"}])
        res = layer.dispatch("db_read", {
            "query": "claims_by_bucket", "race_id": "r1",
            "buckets": ["stated_position"],
        })
        self.assertTrue(res["ok"])
        self.assertEqual(res["result"]["rows"][0]["claim_id"], "c1")

    def test_profiler_cross_bucket_read_denied(self):
        layer, db = make_data_layer("profiler")
        res = layer.dispatch("db_read", {
            "query": "claims_by_bucket", "race_id": "r1",
            "buckets": ["verifiable_fact"],  # not own bucket
        })
        self.assertEqual(res["error"], errors.BUCKET)
        self.assertTrue(committed_log_rows(db)[0]["guard_triggered"])

    def test_factchecker_reads_all_buckets(self):
        layer, db = make_data_layer("factchecker")
        db.prime_read([{"claim_id": "c1"}])
        res = layer.dispatch("db_read", {
            "query": "claims_by_bucket", "race_id": "r1",
            "buckets": ["stated_position", "verifiable_fact", "outside_opinion"],
        })
        self.assertTrue(res["ok"])

    def test_named_metadata_read_ok(self):
        layer, db = make_data_layer("record")
        db.prime_read([{"race_id": "r1", "office": "US House FL-10"}])
        res = layer.dispatch("db_read", {"query": "race", "race_id": "r1"})
        self.assertTrue(res["ok"])
        self.assertEqual(res["result"]["rows"][0]["office"], "US House FL-10")

    def test_unknown_query_fails_closed(self):
        layer, db = make_data_layer("profiler")
        res = layer.dispatch("db_read", {"query": "raw_sql; DROP TABLE claim"})
        self.assertEqual(res["error"], errors.NOT_IMPLEMENTED)


PROFILER_CLAIM = {
    "claim_id": "c1", "candidate_id": "cand1", "race_id": "r1", "issue_id": "i1",
    "text": "Supports expanding the child tax credit.", "bucket": "stated_position",
    "attributed": True, "verdict": None, "verification": "single_source",
}


class TestDataToolsClaimWrite(unittest.TestCase):
    def test_profiler_valid_claim_writes_claim_and_source_and_traceable_log(self):
        layer, db = make_data_layer("profiler")
        db.prime_read([{"source_id": "s1", "url": "https://jane4congress.com/a",
                        "type": "candidate_self", "lean_tag": "N/A"}])
        res = layer.dispatch("claim_write", {**PROFILER_CLAIM, "source_ids": ["s1"]})
        self.assertTrue(res["ok"], res)
        self.assertEqual(len(committed_into(db, "claim")), 1)
        self.assertEqual(len(committed_into(db, "claim_source")), 1)
        log = committed_log_rows(db)[0]
        self.assertEqual(log["bucket_written"], "stated_position")
        self.assertEqual(log["claim_id"], "c1")
        self.assertEqual(log["source_id"], "s1")  # Traceability §4c: not null

    def test_profiler_wrong_bucket_halts_and_logs(self):
        layer, db = make_data_layer("profiler")
        res = layer.dispatch("claim_write", {
            **PROFILER_CLAIM, "bucket": "verifiable_fact", "source_ids": [],
        })
        self.assertEqual(res["error"], errors.BUCKET)
        self.assertTrue(layer.halted)
        self.assertEqual(len(committed_into(db, "claim")), 0)
        self.assertTrue(committed_log_rows(db)[0]["guard_triggered"])

    def test_profiler_no_source_is_dropped(self):
        layer, db = make_data_layer("profiler")
        res = layer.dispatch("claim_write", {**PROFILER_CLAIM, "source_ids": []})
        self.assertEqual(res["error"], errors.BUCKET)
        self.assertEqual(len(committed_into(db, "claim")), 0)

    def test_record_editorial_label_halts(self):
        layer, db = make_data_layer("record")
        db.prime_read([{"source_id": "s1", "url": "https://fec.gov/x",
                        "type": "primary_doc", "lean_tag": "N/A"}])
        res = layer.dispatch("claim_write", {
            "claim_id": "c9", "candidate_id": "cand1", "race_id": "r1",
            "text": "This vote is hypocrisy given the prior statement.",
            "bucket": "verifiable_fact", "attributed": False,
            "verdict": None, "verification": "verified", "source_ids": ["s1"],
        })
        self.assertEqual(res["error"], errors.BUCKET)
        self.assertTrue(layer.halted)

    def test_factchecker_verdict_under_two_tier1_halts_H3(self):
        layer, db = make_data_layer("factchecker")
        db.prime_read([{"source_id": "s1", "url": "https://www.fec.gov/data/1",
                        "type": "primary_doc", "lean_tag": "N/A"}])
        res = layer.dispatch("claim_write", {
            "claim_id": "c2", "candidate_id": "cand1", "race_id": "r1",
            "text": "Voted for HR 1.", "bucket": "verifiable_fact",
            "attributed": False, "verdict": "accurate",
            "verification": "verified", "source_ids": ["s1"],  # only 1 Tier-1
        })
        self.assertEqual(res["error"], errors.BUCKET)
        self.assertTrue(layer.halted)
        self.assertEqual(len(committed_into(db, "claim")), 0)

    def test_factchecker_two_independent_tier1_verdict_ok(self):
        layer, db = make_data_layer("factchecker")
        db.prime_read([
            {"source_id": "s1", "url": "https://www.fec.gov/data/1",
             "type": "primary_doc", "lean_tag": "N/A"},
            {"source_id": "s2", "url": "https://www.congress.gov/bill/1",
             "type": "primary_doc", "lean_tag": "N/A"},
        ])
        res = layer.dispatch("claim_write", {
            "claim_id": "c3", "candidate_id": "cand1", "race_id": "r1",
            "text": "Voted for HR 1.", "bucket": "verifiable_fact",
            "attributed": False, "verdict": "accurate",
            "verification": "verified", "source_ids": ["s1", "s2"],
        })
        self.assertTrue(res["ok"], res)
        self.assertEqual(len(committed_into(db, "claim")), 1)
        self.assertEqual(len(committed_into(db, "claim_source")), 2)

    def test_two_source_claim_rolls_back_atomically_on_second_insert_failure(self):
        # execute order: read(1) claim(2) cs1(3) cs2(4) -> fail the 2nd cs.
        db = FakeDb(fail_at=4)
        db.prime_read([
            {"source_id": "s1", "url": "https://jane4congress.com/a",
             "type": "candidate_self", "lean_tag": "N/A"},
            {"source_id": "s2", "url": "https://jane4congress.com/b",
             "type": "candidate_self", "lean_tag": "N/A"},
        ])
        layer, db = make_data_layer("profiler", db=db)
        res = layer.dispatch("claim_write", {**PROFILER_CLAIM,
                                             "source_ids": ["s1", "s2"]})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertGreaterEqual(db.rolled_back, 1)
        self.assertEqual(len(committed_into(db, "claim")), 0)        # atomic:
        self.assertEqual(len(committed_into(db, "claim_source")), 0)  # nothing
        # the failure is still audited (fresh transaction)
        self.assertEqual(committed_log_rows(db)[0]["status"], "fail")

    def test_db_error_during_source_read_is_logged_not_raised(self):
        # read_sources SELECT is execute #1 -> force it to fail. The tool
        # call must degrade to a logged upstream_failed, never an unlogged
        # exception out of dispatch (S1-R2).
        db = FakeDb(fail_at=1)
        layer, db = make_data_layer("profiler", db=db)
        res = layer.dispatch("claim_write", {**PROFILER_CLAIM, "source_ids": ["s1"]})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertEqual(len(committed_into(db, "claim")), 0)
        log = committed_log_rows(db)
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0]["status"], "fail")
        self.assertFalse(log[0]["guard_triggered"])  # a DB fault, not a guard event

    def test_log_write_failure_rolls_back_the_content_too(self):
        # read(1) claim(2) cs1(3) log(4) -> fail the log INSERT (S1-R2):
        # the content must not survive an unlogged write.
        db = FakeDb(fail_at=4)
        db.prime_read([{"source_id": "s1", "url": "https://jane4congress.com/a",
                        "type": "candidate_self", "lean_tag": "N/A"}])
        layer, db = make_data_layer("profiler", db=db)
        with self.assertRaises(logsink.LogWriteError):
            layer.dispatch("claim_write", {**PROFILER_CLAIM, "source_ids": ["s1"]})
        self.assertEqual(db.committed, [])            # nothing committed at all
        self.assertGreaterEqual(db.rolled_back, 1)


class MemCache:
    """In-memory stand-in for discovery.DiskCache (no repo/disk side effects)."""

    def __init__(self):
        self.data = {}

    def get(self, url, day):
        return self.data.get((url, day))

    def put(self, url, day, text):
        self.data[(url, day)] = text


def make_discovery_layer(agent_id, db=None, fetcher=None, searcher=None,
                         cache=None, psl=None):
    db = db if db is not None else FakeDb()
    st = store.Store("postgres://unused", connect=lambda dsn: db)
    guard = cores.load_guard_core(agent_id)
    layer = middleware.ToolLayer(agent_id, guard, st)
    layer.handlers.update(discovery.build_discovery_handlers(
        agent_id, st, fetcher=fetcher, searcher=searcher,
        cache=cache if cache is not None else MemCache(), registrable_domain=psl,
    ))
    return layer, db


# Allowlist A candidate scope: candidate row, social accounts, platforms.
def prime_profiler_scope(db, official_site="https://jane4congress.com",
                         accounts=None, platforms=None):
    db.prime_read([{"official_site": official_site}])
    db.prime_read(accounts if accounts is not None else [])
    db.prime_read(platforms if platforms is not None else [])
    return db


class TestDiscoveryAllowlistA(unittest.TestCase):
    def test_profiler_news_url_blocked_and_logged_allowlist(self):
        db = prime_profiler_scope(FakeDb())
        layer, db = make_discovery_layer(
            "profiler", db=db, fetcher=lambda u: "<html>should-not-fetch</html>")
        res = layer.dispatch("fetch_source", {
            "url": "https://apnews.com/article/x", "candidate_id": "cand1"})
        self.assertEqual(res["error"], errors.ALLOWLIST)
        log = committed_log_rows(db)[0]
        self.assertTrue(log["guard_triggered"])
        self.assertIn("[allowlist]", log["failure_reason"])
        self.assertEqual(log["source_url"], "https://apnews.com/article/x")

    def test_profiler_official_site_allowed_and_scripts_stripped(self):
        db = prime_profiler_scope(FakeDb())
        layer, db = make_discovery_layer(
            "profiler", db=db,
            fetcher=lambda u: "<html><script>evil()</script>ok</html>")
        res = layer.dispatch("fetch_source", {
            "url": "https://jane4congress.com/issues", "candidate_id": "cand1"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["rule"], "official_site")
        self.assertNotIn("evil", res["result"]["text"])  # <script> stripped

    def test_profiler_shortener_blocked(self):
        db = prime_profiler_scope(FakeDb())
        layer, db = make_discovery_layer(
            "profiler", db=db, fetcher=lambda u: "x")
        res = layer.dispatch("fetch_source", {
            "url": "https://bit.ly/abc", "candidate_id": "cand1"})
        self.assertEqual(res["error"], errors.ALLOWLIST)

    def test_injected_psl_is_honored(self):
        # inject a PSL that folds everything to the official_site domain ->
        # a URL that the default subset would block is now allowed (proves
        # the S1-R5 injection point is wired through).
        db = prime_profiler_scope(FakeDb(), official_site="https://jane.example")
        layer, db = make_discovery_layer(
            "profiler", db=db, fetcher=lambda u: "ok",
            psl=lambda host: "jane.example")
        res = layer.dispatch("fetch_source", {
            "url": "https://anything.jane.example/x", "candidate_id": "cand1"})
        self.assertTrue(res["ok"], res)

    def test_default_psl_falls_back_when_tldextract_absent(self):
        # tldextract is not installed here: load_psl() degrades to None so the
        # core uses its embedded fail-closed subset (S1-R5), never a guess.
        self.assertIsNone(discovery.load_psl())


class TestDiscoveryAllowlistB(unittest.TestCase):
    def test_factchecker_tier1_allowed_and_tagged(self):
        layer, db = make_discovery_layer(
            "factchecker", fetcher=lambda u: "<html>doc</html>")
        res = layer.dispatch("fetch_source", {"url": "https://www.fec.gov/data/1"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["tier"], "tier1")
        self.assertFalse(committed_log_rows(db)[0]["guard_triggered"])

    def test_factchecker_tier2_allowed_and_tagged(self):
        layer, db = make_discovery_layer(
            "factchecker", fetcher=lambda u: "doc")
        res = layer.dispatch("fetch_source", {"url": "https://ballotpedia.org/x"})
        self.assertTrue(res["ok"])
        self.assertEqual(res["result"]["tier"], "tier2")

    def test_factchecker_offlist_blocked_and_logged(self):
        layer, db = make_discovery_layer(
            "factchecker", fetcher=lambda u: "x")
        res = layer.dispatch("fetch_source", {"url": "https://randomblog.example/x"})
        self.assertEqual(res["error"], errors.ALLOWLIST)
        self.assertTrue(committed_log_rows(db)[0]["guard_triggered"])


class TestDiscoveryFetchAndSearch(unittest.TestCase):
    def test_missing_fetch_backend_degrades_not_configured(self):
        def no_backend(url):
            raise discovery.NotConfigured("httpx is not installed")
        layer, db = make_discovery_layer("factchecker", fetcher=no_backend)
        res = layer.dispatch("fetch_source", {"url": "https://www.fec.gov/x"})
        self.assertEqual(res["error"], errors.NOT_CONFIGURED)

    def test_network_error_degrades_upstream_failed_without_leaking(self):
        def boom(url):
            raise RuntimeError("connect to fec.gov:443 refused")
        layer, db = make_discovery_layer("factchecker", fetcher=boom)
        res = layer.dispatch("fetch_source", {"url": "https://www.fec.gov/x"})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertNotIn("fec.gov", " ".join(res["reasons"]))  # type only

    def test_disk_cache_avoids_a_second_fetch(self):
        calls = []
        def counting(url):
            calls.append(url)
            return "<html>doc</html>"
        cache = MemCache()
        layer, db = make_discovery_layer(
            "factchecker", fetcher=counting, cache=cache)
        r1 = layer.dispatch("fetch_source", {"url": "https://www.fec.gov/x"})
        r2 = layer.dispatch("fetch_source", {"url": "https://www.fec.gov/x"})
        self.assertFalse(r1["result"]["cached"])
        self.assertTrue(r2["result"]["cached"])
        self.assertEqual(len(calls), 1)  # second call served from cache

    def test_web_search_no_backend_is_not_configured(self):
        layer, db = make_discovery_layer("factchecker")  # searcher=None
        res = layer.dispatch("web_search", {"query": "hr1 vote"})
        self.assertEqual(res["error"], errors.NOT_CONFIGURED)

    def test_web_search_drops_offlist_results(self):
        def fake_search(q):
            return [
                {"url": "https://www.fec.gov/data/1", "title": "a"},
                {"url": "https://randomblog.example/x", "title": "b"},  # off-list
                {"url": "https://congress.gov/bill/2", "title": "c"},
            ]
        layer, db = make_discovery_layer("factchecker", searcher=fake_search)
        res = layer.dispatch("web_search", {"query": "hr1"})
        self.assertTrue(res["ok"])
        kept = {r["url"] for r in res["result"]["results"]}
        self.assertEqual(kept, {"https://www.fec.gov/data/1",
                                "https://congress.gov/bill/2"})
        self.assertEqual(res["result"]["dropped"], 1)


# Real DoE CandidateList.txt shape (captured live 2026-07-10): header + 26
# tab columns; PII in cols 14-25 must be dropped by the parser.
_DOE_HEADER = ("AcctNum\tVoterID\tElectionID\tOfficeCode\tOfficeDesc\tJuris1num\t"
               "Juris2num\tStatusCode\tStatusDesc\tPartyCode\tPartyDesc\tNameLast\t"
               "NameFirst\tNameMiddle\tSuppressAddress\tAddr1\tAddr2\tCity\tState\t"
               "Zip\tCounty\tPhone\tTrsNameLast\tTrsNameFirst\tTrsNameMiddle\tEmail")


def _doe_row(acct, office, desc, juris, status, party, last, first, middle="",
             email="secret@example.com", phone="5615551212"):
    return "\t".join([
        acct, "0", "20261103-GEN", office, desc, juris, "", status,
        {"QUA": "Qualified", "UNO": "Unopposed", "DEF": "Defeated",
         "DNQ": "Did Not Qualify", "WIT": "Withdrew", "REM": "Removed"}.get(status, status),
        party, party + " Party", last, first, middle, "N", "PO Box 1", "",
        "Miami", "FL", "33101", "MDA", phone, "", "", "", email])


# Status codes are the six B1 measured in the live 20261103-GEN export
# (data-ingest.md section 1 Q1). ACT and ELE are on the download form but not
# in the file, so the parser must reject them rather than pre-map them -- the
# fixture below deliberately contains none.
_DOE_FIXTURE = "\n".join([
    _DOE_HEADER,
    _doe_row("89070", "USR", "United States Representative", "023", "QUA", "REP", "Adeimy", "Deborah"),
    # UNO is FL-10's real shape: the file's only unopposed row.
    _doe_row("89111", "USR", "United States Representative", "010", "UNO", "DEM", "Smith", "Jane", "Q"),
    _doe_row("89222", "USR", "United States Representative", "001", "QUA", "REP", "Doe", "John"),   # non-target
    _doe_row("89333", "GOV", "Governor", "", "QUA", "NPA", "Abrams", "Pat"),
    # U.S. Senate: statewide AND federal. B1 measured 14 USS rows on the live
    # file and the parser skipped every one of them until 2026-09-07.
    _doe_row("89999", "USS", "United States Senator", "", "QUA", "DEM", "Reed", "Dana"),
    # A real minor party -- verbatim under D2, flattened to "other" before it.
    _doe_row("89777", "GOV", "Governor", "", "QUA", "LPF", "Reyes", "Sam"),
    _doe_row("89444", "USR", "United States Representative", "028", "WIT", "DEM", "Gone", "Gary"),
    # The post-primary case B1 found 83 of: a defeated filer still in the file.
    _doe_row("89555", "USR", "United States Representative", "028", "DEF", "DEM", "Lost", "Lee"),
    # Qualified write-in: blank ballot line, so excluded from the race (D1).
    _doe_row("89666", "USR", "United States Representative", "023", "QUA", "WRI", "Penn", "Wri"),
    # Status beats party: a write-in that did not qualify is excluded for
    # that, not filed as a write-in.
    _doe_row("89888", "USR", "United States Representative", "028", "DNQ", "WRI", "Nope", "Nora"),
])


def make_intake_layer(agent_id, db=None, **kw):
    db = db if db is not None else FakeDb()
    st = store.Store("postgres://unused", connect=lambda dsn: db)
    guard = cores.load_guard_core(agent_id)
    layer = middleware.ToolLayer(agent_id, guard, st)
    layer.handlers.update(intake.build_intake_handlers(agent_id, st, **kw))
    return layer, db


class TestIntakeDoEParser(unittest.TestCase):
    def test_filters_to_target_races_and_drops_nontarget(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        self.assertEqual(sorted(p["races"]), [
            "FL-10-general", "FL-23-general", "FL-28-general",
            "FL-GOV-general", "FL-SEN-general"])
        self.assertEqual(len(p["candidates"]), 9)
        self.assertEqual(p["skipped"], 1)  # FL-01 is not a target

    def test_field_mapping_and_pii_dropped(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        by_id = {c["candidate_id"]: c for c in p["candidates"]}
        jane = by_id["FL-DOE-89111"]
        self.assertEqual(jane["legal_name"], "Jane Q Smith")
        self.assertEqual(jane["party"], "DEM")
        self.assertEqual(jane["qualifying_status"], "qualified")  # UNO -> qualified
        # PII must not survive into the candidate row
        for pii in ("email", "phone", "Addr1", "City", "Zip"):
            self.assertNotIn(pii, jane)
        self.assertNotIn("secret@example.com", repr(jane))
        self.assertEqual(by_id["FL-DOE-89333"]["party"], "NPA")
        self.assertEqual(by_id["FL-DOE-89444"]["qualifying_status"], "withdrawn")

    def test_us_senate_is_a_target_race_and_is_federal(self):
        """The gap found by the 2026-09-07 database audit. USS fell through to
        `skipped` — silently, because skipping is the normal path for most of
        the file — so a statewide federal race was missing from every ballot
        with nothing in the output to say so."""
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        senate = p["races"]["FL-SEN-general"]
        self.assertEqual(senate["candidate_ids"], ["FL-DOE-89999"])
        # Statewide and federal are different axes: no district, but not a
        # state office. Filing it under 'state' would misplace it in the read
        # model's federal/state grouping.
        self.assertEqual(senate["level"], "federal")
        self.assertIsNone(senate["district"])

    def test_race_carries_its_candidate_ids(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        self.assertEqual(p["races"]["FL-GOV-general"]["candidate_ids"],
                         ["FL-DOE-89333", "FL-DOE-89777"])
        self.assertEqual(p["races"]["FL-GOV-general"]["level"], "state")
        self.assertEqual(p["races"]["FL-10-general"]["district"], "10")

    # --- B2: the D1 ballot-status filter -------------------------------

    def test_defeated_filer_is_absent_from_candidate_ids(self):
        """The post-primary defect B1 measured: 83 losers in 8 races. One
        candidate with zero claims against an incumbent with twelve is 100%
        variance, and the Balance Audit HALTs at 10% -- so a single defeated
        filer left in the race blocks publication permanently."""
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        by_id = {c["candidate_id"]: c for c in p["candidates"]}
        self.assertEqual(by_id["FL-DOE-89555"]["ballot_status"], "excluded")
        self.assertNotIn("FL-DOE-89555", p["races"]["FL-28-general"]["candidate_ids"])
        # The filing is still stored -- an invisible exclusion is not auditable.
        self.assertIn("FL-DOE-89555", by_id)

    def test_write_in_is_tiered_and_kept_off_the_ballot(self):
        """D1 (founder 2026-09-07): a write-in has no printed line, so nothing
        about one reaches a voter. It keeps its own tier because a write-in and
        a defeated filer are different facts."""
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        by_id = {c["candidate_id"]: c for c in p["candidates"]}
        self.assertEqual(by_id["FL-DOE-89666"]["ballot_status"], "write_in")
        self.assertNotIn("FL-DOE-89666", p["races"]["FL-23-general"]["candidate_ids"])
        self.assertEqual(p["races"]["FL-23-general"]["candidate_ids"], ["FL-DOE-89070"])

    def test_status_beats_party_for_a_disqualified_write_in(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        by_id = {c["candidate_id"]: c for c in p["candidates"]}
        self.assertEqual(by_id["FL-DOE-89888"]["ballot_status"], "excluded")

    def test_a_race_whose_filers_all_lost_has_no_ballot_lines(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        self.assertEqual(p["races"]["FL-28-general"]["candidate_ids"], [])

    def test_minor_party_code_is_stored_verbatim(self):
        """D2: LPF, IND and CPF are printed ballot lines. The old map
        flattened all three into 'other'."""
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        by_id = {c["candidate_id"]: c for c in p["candidates"]}
        self.assertEqual(by_id["FL-DOE-89777"]["party"], "LPF")
        self.assertEqual(by_id["FL-DOE-89666"]["party"], "WRI")

    def test_tier_counts_are_reported(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        self.assertEqual(p["tiers"], {"ballot": 5, "write_in": 1, "excluded": 3})

    def test_unknown_status_code_fails_loudly(self):
        """ACT and ELE are on the DoE form but not in the file. ELE arrives
        after certification and means the race is decided -- bucketing it
        silently would publish a settled race as a live one."""
        row = _doe_row("89999", "GOV", "Governor", "", "ELE", "REP", "New", "Ned")
        with self.assertRaises(intake.DoEFormatError) as ctx:
            intake.parse_candidate_list("\n".join([_DOE_HEADER, row]))
        self.assertIn("ELE", str(ctx.exception))

    def test_parse_is_deterministic_idempotent(self):
        self.assertEqual(intake.parse_candidate_list(_DOE_FIXTURE),
                         intake.parse_candidate_list(_DOE_FIXTURE))

    def test_unrecognized_format_fails_closed(self):
        with self.assertRaises(intake.DoEFormatError):
            intake.parse_candidate_list("not\ta\tdoe\tfile\nrandom garbage")


class TestIntakeDoEHandler(unittest.TestCase):
    def test_intake_upserts_target_races_with_on_conflict(self):
        layer, db = make_intake_layer("record", doe_fetch=lambda office=None: _DOE_FIXTURE)
        res = layer.dispatch("doe_file_intake", {"office": "FED"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["candidate_count"], 9)
        self.assertEqual(res["result"]["skipped"], 1)
        self.assertEqual(res["result"]["tiers"],
                         {"ballot": 5, "write_in": 1, "excluded": 3})
        races = committed_into(db, "race")
        cands = committed_into(db, "candidate")
        self.assertEqual(len(races), 5)
        self.assertEqual(len(cands), 9)
        # ballot_status rides the upsert, so the tier is in the database and
        # not only in the run report.
        self.assertIn("ballot_status", cands[0][0])
        self.assertIn("ON CONFLICT (race_id) DO UPDATE", races[0][0])       # idempotent
        self.assertIn("ON CONFLICT (candidate_id) DO UPDATE", cands[0][0])

    def test_bad_doe_format_degrades_upstream_failed(self):
        layer, db = make_intake_layer("record", doe_fetch=lambda office=None: "garbage")
        res = layer.dispatch("doe_file_intake", {})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertEqual(len(committed_into(db, "race")), 0)


# =========================================================================
# B4 — FEC incumbency (is_incumbent / incumbent_id / is_open_seat)
# =========================================================================

def committed_updates(db, table):
    return [(sql, params) for sql, params in db.committed
            if sql.lstrip().upper().startswith("UPDATE " + table.upper() + " ")]


def _fec_cand(cid, name, challenge, *, office="H", district="28", party="REP",
              election_years=(2026,), cycles=(2026,)):
    """One FEC /candidates/ result row in the live field shape (swagger
    definition `Candidate`, checked 2026-09-07)."""
    return {"candidate_id": cid, "name": name, "party": party, "office": office,
            "state": "FL", "district": district, "candidate_status": "C",
            "incumbent_challenge": challenge,
            "election_years": list(election_years), "cycles": list(cycles)}


def _fec_get_map(by_district, calls=None, count=None, pagination=True):
    """A /candidates/ envelope. `pagination.count` matches the rows returned
    unless a test overrides it -- a count greater than the rows returned means
    the field is truncated, which the handler refuses (it never pages)."""
    def fec_get(path, params):
        if calls is not None:
            calls.append((path, dict(params)))
        rows = list(by_district.get(params.get("district"), []))
        env = {"api_version": "1.0", "results": rows}
        if pagination:
            env["pagination"] = {"count": len(rows) if count is None else count,
                                 "per_page": 100, "page": 1}
        return env
    return fec_get


_GIMENEZ, _RIVERA = "FL-DOE-90001", "FL-DOE-90002"

# FL-28 is the shape B4 exists for: a sitting member plus a challenger.
_DOE_INCUMBENCY_FIXTURE = "\n".join([
    _DOE_HEADER,
    _doe_row("90001", "USR", "United States Representative", "028", "QUA", "REP",
             "Gimenez", "Carlos", "A"),
    _doe_row("90002", "USR", "United States Representative", "028", "QUA", "DEM",
             "Rivera", "Ana"),
    # A statewide race in the same file: the FEC has no jurisdiction over it.
    _doe_row("90003", "GOV", "Governor", "", "QUA", "REP", "Abrams", "Pat"),
])

_RACE_28 = {"race_id": "FL-28-general", "level": "federal", "district": "28"}
_ROSTER_28 = [
    {"candidate_id": _GIMENEZ, "legal_name": "Carlos A Gimenez", "party": "REP"},
    {"candidate_id": _RIVERA, "legal_name": "Ana Rivera", "party": "DEM"},
]

# The stale row is load-bearing: it is an "I" for a cycle that is over, so
# dropping the 2026 filter turns the happy path into an unmatched-incumbent
# refusal. That is mutation check (b).
_FL28_ROWS = [
    _fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "I"),
    _fec_cand("H4FL28002", "RIVERA, ANA", "C", party="DEM"),
    _fec_cand("H8FL28999", "RETIRED, ROBERT", "I",
              election_years=(2022,), cycles=(2022,)),
]


class TestIncumbencyResolver(unittest.TestCase):
    """The pure resolver: matching, and every way it refuses."""

    def test_incumbent_resolves_and_seat_is_not_open(self):
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, _FL28_ROWS)
        self.assertEqual(out["status"], "resolved", out)
        self.assertEqual(out["race_id"], "FL-28-general")
        self.assertEqual(out["incumbent_id"], _GIMENEZ)
        self.assertIs(out["is_open_seat"], False)
        self.assertTrue(out["candidates"][_GIMENEZ]["is_incumbent"])
        self.assertEqual(out["candidates"][_GIMENEZ]["fec_id"], "H0FL28001")
        self.assertFalse(out["candidates"][_RIVERA]["is_incumbent"])
        self.assertEqual(out["candidates"][_RIVERA]["fec_id"], "H4FL28002")
        # the 2022 "I" row is not this election and must not be considered
        self.assertEqual(out["unresolved"], [])

    def test_fec_id_beats_the_name(self):
        roster = [dict(_ROSTER_28[0]),
                  {"candidate_id": _RIVERA, "legal_name": "Nobody At All",
                   "fec_id": "H4FL28002"}]
        out = intake.resolve_incumbency(_RACE_28, roster, _FL28_ROWS)
        self.assertEqual(out["status"], "resolved", out)
        self.assertEqual(out["candidates"][_RIVERA]["fec_id"], "H4FL28002")

    def test_name_match_ignores_case_and_punctuation(self):
        race = {"race_id": "FL-26-general", "level": "federal", "district": "26"}
        roster = [{"candidate_id": "c1", "legal_name": "Mario Diaz-Balart"}]
        rows = [_fec_cand("H4FL26001", "DIAZ-BALART, MARIO", "I", district="26")]
        out = intake.resolve_incumbency(race, roster, rows)
        self.assertEqual(out["status"], "resolved", out)
        self.assertEqual(out["incumbent_id"], "c1")

    def test_open_seat_only_when_every_row_resolved_and_none_incumbent(self):
        """Open seat is a property of the FEC field for the district, not of
        our roster's coverage of it. Live FL-28 returns 7 filers against a
        2-3 name ballot roster (primary losers / never-qualified filers who
        still have a 2026 filing), so unmatched "O" rows must not block
        the verdict -- they are recorded under `unmatched_fec_rows` instead
        of blocking `is_open_seat` or landing in `unresolved`. Every row is
        "O": a "C" row would mean the FEC believes there is an incumbent to
        challenge, which refuses (see the C-without-I test below)."""
        rows = [_fec_cand("H4FL28002", "RIVERA, ANA", "O", party="DEM"),
                _fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "O"),
                _fec_cand("H6FL28039", "CAMPIONE, THOMAS", "O"),
                _fec_cand("H6FL28047", "MUJICA, HECTOR", "O"),
                _fec_cand("H6FL28021", "ROJAS, EDDY", "O")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "resolved", out)
        self.assertIs(out["is_open_seat"], True)
        self.assertIsNone(out["incumbent_id"])
        self.assertEqual(out["unresolved"], [])
        unmatched_ids = {u["fec_candidate_id"] for u in out["unmatched_fec_rows"]}
        self.assertEqual(unmatched_ids, {"H6FL28039", "H6FL28047", "H6FL28021"})
        for u in out["unmatched_fec_rows"]:
            self.assertEqual(u["incumbent_challenge"], "O")
            self.assertTrue(u["name"])

    def test_challengers_with_no_incumbent_row_refuse_rather_than_open(self):
        """FEC "C" is "challenger TO an incumbent", not "not the incumbent".
        A field of "C"s with no "I" is the FEC asserting an incumbent this
        run did not see -- a member whose own filing carries a stale
        `election_years`, or FEC lag. Reading that absence as an open seat
        publishes the resolver's strongest claim off the one missing row."""
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "C"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "C", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        joined = " ".join(out["reasons"])
        self.assertIn("C (challenger)", joined)
        self.assertIn("I (incumbent)", joined)
        self.assertIn("H0FL28001", joined)
        self.assertIn("H4FL28002", joined)

    def test_one_challenger_among_open_filers_still_refuses(self):
        """The contradiction is one "C" row, not a majority of them: a single
        challenger filing still asserts someone to challenge."""
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "O"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "C", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("H4FL28002", " ".join(out["reasons"]))

    def test_unmatched_incumbent_refuses_and_never_calls_the_seat_open(self):
        """A retiring member who still filed with the FEC is exactly this
        case. Calling the seat open because we failed to match would publish
        a challenger as the sitting member's equal."""
        rows = [_fec_cand("H0FL28777", "STRANGER, SAM", "I"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "C", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("H0FL28777", " ".join(out["reasons"]))

    def test_unknown_incumbent_challenge_refuses_naming_the_value(self):
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "X")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertIn("'X'", " ".join(out["reasons"]))

    def test_a_candidate_matching_two_rows_is_unresolved(self):
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "O"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "O", party="DEM"),
                _fec_cand("H4FL28003", "RIVERA, ANA M", "O", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "resolved", out)
        self.assertNotIn(_RIVERA, out["candidates"])       # nothing written
        self.assertIn(_RIVERA, [u.get("candidate_id") for u in out["unresolved"]])
        # An unresolved roster candidate does not block the open-seat
        # verdict: every FEC row here is a known "O".
        self.assertIs(out["is_open_seat"], True)

    def test_two_candidates_on_one_non_incumbent_row_are_both_unresolved(self):
        """One filing cannot be two people. Each candidate matches exactly
        one row, so nothing is ambiguous from either candidate's own side --
        only the collision on the row is -- and recording it from the row's
        side alone would drop both candidates in silence: `resolved`, empty
        `candidates`, empty `unresolved`."""
        roster = [{"candidate_id": "FL-DOE-90010", "legal_name": "Ana Rivera"},
                  {"candidate_id": "FL-DOE-90011", "legal_name": "Ana B Rivera"}]
        rows = [_fec_cand("H4FL28002", "RIVERA, ANA", "O", party="DEM"),
                _fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "O")]
        out = intake.resolve_incumbency(_RACE_28, roster, rows)
        self.assertEqual(out["status"], "resolved", out)
        by_cid = {u["candidate_id"]: u for u in out["unresolved"]}
        self.assertEqual(set(by_cid), {"FL-DOE-90010", "FL-DOE-90011"})
        for cid, entry in by_cid.items():
            self.assertIn("H4FL28002", entry["reason"])
            self.assertIn("FL-DOE-90010", entry["reason"])
            self.assertIn("FL-DOE-90011", entry["reason"])
        self.assertNotIn("FL-DOE-90010", out["candidates"])
        self.assertNotIn("FL-DOE-90011", out["candidates"])
        self.assertEqual(out["candidates"], {})
        # The colliding row is recorded too, so the report names the filing.
        collided = [u for u in out["unmatched_fec_rows"]
                    if u["fec_candidate_id"] == "H4FL28002"]
        self.assertEqual(len(collided), 1, out["unmatched_fec_rows"])
        self.assertIn("collision", collided[0]["note"])
        # The verdict is still the FEC field's to make: no row is "I".
        self.assertIs(out["is_open_seat"], True)
        self.assertIsNone(out["incumbent_id"])

    def test_two_candidates_on_one_incumbent_row_still_refuses(self):
        """The "I" variant is stricter: an incumbent filing we cannot pin to
        one person refuses the race rather than merely skipping them."""
        roster = [{"candidate_id": "FL-DOE-90010", "legal_name": "Ana Rivera"},
                  {"candidate_id": "FL-DOE-90011", "legal_name": "Ana B Rivera"}]
        rows = [_fec_cand("H4FL28002", "RIVERA, ANA", "I", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, roster, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("H4FL28002", " ".join(out["reasons"]))

    def test_two_incumbent_rows_name_both_offending_filings(self):
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "I"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "I", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        joined = " ".join(out["reasons"])
        self.assertIn("H0FL28001", joined)
        self.assertIn("H4FL28002", joined)

    def test_a_refusal_still_carries_what_it_classified(self):
        """Auditability: a refused race must still show which filings were
        read and how far they got."""
        rows = [_fec_cand("H6FL28039", "CAMPIONE, THOMAS", "C"),
                _fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "I"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "I", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertEqual([u["fec_candidate_id"] for u in out["unmatched_fec_rows"]],
                         ["H6FL28039"])

    def test_a_candidate_matching_no_row_is_unresolved(self):
        roster = _ROSTER_28 + [{"candidate_id": "FL-DOE-90009",
                                "legal_name": "Absent Andy"}]
        out = intake.resolve_incumbency(_RACE_28, roster, _FL28_ROWS)
        self.assertEqual(out["status"], "resolved", out)
        self.assertNotIn("FL-DOE-90009", out["candidates"])
        self.assertIn("FL-DOE-90009",
                      [u.get("candidate_id") for u in out["unresolved"]])

    def test_null_incumbent_challenge_on_a_matched_row_refuses(self):
        """Null means the FEC does not state a status -- even on a row that
        matches a roster candidate cleanly, this refuses the whole race
        rather than writing a silent default or waving it through as an
        established open seat."""
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", None),
                _fec_cand("H4FL28002", "RIVERA, ANA", "C", party="DEM")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("H0FL28001", " ".join(out["reasons"]))

    def test_null_incumbent_challenge_on_an_unmatched_row_refuses(self):
        """The null-code refusal applies to every row, not only ones that
        match a roster candidate -- an unmatched row with a null code is
        exactly as unreadable as a matched one."""
        rows = [_fec_cand("H4FL28002", "RIVERA, ANA", "C", party="DEM"),
                _fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "O"),
                _fec_cand("H9FL28999", "GHOST, GARY", None)]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("H9FL28999", " ".join(out["reasons"]))

    def test_non_house_rows_are_ignored(self):
        rows = [_fec_cand("S4FL00123", "GIMENEZ, CARLOS A.", "I", office="S",
                          district="00")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)   # nothing left to read
        self.assertIn("no FEC", " ".join(out["reasons"]))

    def test_no_rows_at_all_refuses_rather_than_declaring_an_open_seat(self):
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, [])
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)

    def test_null_election_years_refuses_naming_the_row_and_field(self):
        """A row this filter cannot classify might be the incumbent's own --
        dropping it silently the way an ordinary other-year row is dropped
        could publish `is_open_seat: True` by omission. Refuse instead."""
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "I")]
        rows[0]["election_years"] = None
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        joined = " ".join(out["reasons"])
        self.assertIn("H0FL28001", joined)
        self.assertIn("election_years", joined)

    def test_missing_office_refuses_naming_the_row_and_field(self):
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "I")]
        del rows[0]["office"]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        joined = " ".join(out["reasons"])
        self.assertIn("H0FL28001", joined)
        self.assertIn("office", joined)

    def test_a_non_list_election_years_also_refuses(self):
        """Not just null -- any shape that is not a list is unclassifiable."""
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "I")]
        rows[0]["election_years"] = 2026    # a bare int, not a list
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)
        self.assertIn("election_years", " ".join(out["reasons"]))

    def test_a_different_year_row_still_drops_silently_but_is_counted(self):
        """Well-formed, just not this election -- the drop stays silent, but
        `dropped_rows` is what makes it visible in the run report."""
        rows = [_fec_cand("H8FL28999", "RETIRED, ROBERT", "I",
                          election_years=(2022,), cycles=(2022,))]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertEqual(out["status"], "refused", out)   # nothing left to read
        self.assertEqual(out["dropped_rows"], {"other_year": 1, "other_office": 0})

    def test_dropped_rows_is_on_the_resolved_shape_too(self):
        # _FL28_ROWS carries one stale 2022 "I" row -> one other_year drop.
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, _FL28_ROWS)
        self.assertEqual(out["status"], "resolved", out)
        self.assertEqual(out["dropped_rows"], {"other_year": 1, "other_office": 0})

    def test_every_unresolved_entry_names_a_reason(self):
        rows = [_fec_cand("H4FL28002", "RIVERA, ANA", "O", party="DEM"),
                _fec_cand("H9FL28004", "GHOST, GARY", "O")]
        out = intake.resolve_incumbency(_RACE_28, _ROSTER_28, rows)
        self.assertTrue(out["unresolved"])
        for entry in out["unresolved"]:
            self.assertTrue(entry.get("reason"), entry)


class TestIntakeIncumbencyHandler(unittest.TestCase):
    def _layer(self, calls=None, by_district=None, db=None,
               count=None, pagination=True, **kw):
        return make_intake_layer(
            "record", db=db,
            doe_fetch=lambda office=None: _DOE_INCUMBENCY_FIXTURE,
            fec_api_key=kw.pop("fec_api_key", "testkey"),
            fec_get=_fec_get_map(by_district if by_district is not None
                                 else {"28": _FL28_ROWS}, calls,
                                 count=count, pagination=pagination),
            **kw)

    def test_fl28_incumbent_reaches_both_tables(self):
        layer, db = self._layer()
        res = layer.dispatch("doe_file_intake", {"office": "FED",
                                                 "fill_incumbency": True})
        self.assertTrue(res["ok"], res)
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["incumbent_id"], _GIMENEZ)
        self.assertIs(out["is_open_seat"], False)
        race_updates = committed_updates(db, "race")
        cand_updates = committed_updates(db, "candidate")
        self.assertEqual(len(race_updates), 1)
        self.assertIn("incumbent_id", race_updates[0][0])
        self.assertIn("is_open_seat", race_updates[0][0])
        self.assertEqual(race_updates[0][1], (_GIMENEZ, False, "FL-28-general"))
        self.assertEqual(len(cand_updates), 2)
        by_cid = {p[-1]: (sql, p) for sql, p in cand_updates}
        self.assertIn("is_incumbent", by_cid[_GIMENEZ][0])
        self.assertEqual(by_cid[_GIMENEZ][1], (True, "H0FL28001", _GIMENEZ))
        self.assertEqual(by_cid[_RIVERA][1], (False, "H4FL28002", _RIVERA))
        # the FEC linkage must never clobber an existing one with NULL
        self.assertIn("COALESCE", by_cid[_GIMENEZ][0])

    def test_query_asks_for_the_2026_house_field_in_this_district(self):
        calls = []
        layer, db = self._layer(calls=calls)
        layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertEqual(len(calls), 1)          # only the federal race
        path, params = calls[0]
        self.assertEqual(path, "/candidates/")
        self.assertEqual(params["state"], "FL")
        self.assertEqual(params["district"], "28")
        self.assertEqual(params["office"], "H")
        self.assertEqual(params["election_year"], 2026)
        self.assertEqual(params["per_page"], 100)
        self.assertEqual(params["api_key"], "testkey")

    def test_open_seat_sets_the_flag(self):
        # All "O": a "C" row would assert an incumbent to challenge and the
        # resolver would refuse (TestIncumbencyResolver covers that).
        rows = [_fec_cand("H0FL28001", "GIMENEZ, CARLOS A.", "O"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "O", party="DEM")]
        layer, db = self._layer(by_district={"28": rows})
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertIs(out["is_open_seat"], True)
        self.assertIsNone(out["incumbent_id"])
        self.assertEqual(committed_updates(db, "race")[0][1],
                         (None, True, "FL-28-general"))

    def test_a_stored_fec_id_decides_when_the_name_would_not_match(self):
        """The id-first rule only fires if something hydrates it: the DoE file
        carries no FEC id, so the handler reads `candidate.fec_id` back after
        the upserts. Here the stored id points at a row whose NAME matches no
        roster candidate -- without the read this race refuses as an
        unmatched incumbent."""
        db = FakeDb()
        db.prime_read([{"candidate_id": _GIMENEZ, "fec_id": "H0FL28777"}])
        rows = [_fec_cand("H0FL28777", "STRANGER, SAM", "I"),
                _fec_cand("H4FL28002", "RIVERA, ANA", "C", party="DEM")]
        layer, db = self._layer(db=db, by_district={"28": rows})
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertTrue(res["ok"], res)
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["status"], "resolved", out)
        self.assertEqual(out["incumbent_id"], _GIMENEZ)
        self.assertEqual(out["candidates"][_GIMENEZ]["fec_id"], "H0FL28777")
        self.assertIs(out["is_open_seat"], False)

    def test_the_hydration_read_asks_candidate_for_fec_id_by_id_list(self):
        db = FakeDb()
        db.prime_read([])
        layer, db = self._layer(db=db)
        layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        # FakeDb hands back primed rows whatever the SQL says, so the query
        # shape is only checkable here.
        self.assertEqual(len(db.selects), 1)      # one federal race
        sql, params = db.selects[0]
        self.assertIn("fec_id", sql)
        self.assertIn("FROM candidate", sql)
        self.assertIn("ANY(", sql)
        self.assertEqual(sorted(params[0]), [_GIMENEZ, _RIVERA])

    def test_an_empty_hydration_read_is_no_stored_ids_not_an_error(self):
        """The ordinary case, and the one the §6 dry-run snippet runs: no
        candidate has an FEC id yet, so matching falls through to names."""
        layer, db = self._layer()                 # nothing primed -> []
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertTrue(res["ok"], res)
        self.assertEqual(
            res["result"]["incumbency"]["FL-28-general"]["incumbent_id"],
            _GIMENEZ)

    def test_a_failed_hydration_read_is_upstream_failed_and_the_whole_call_rolls_back(self):
        """Unlike a FEC fetch failure, this read shares the store's one
        connection with the DoE upserts above it in the same call -- a real
        driver error poisons that transaction, so the DoE intake cannot be
        said to "stand". FakeDb has no transaction-poisoning model (unlike
        real psycopg it would happily let a later statement succeed on a
        connection a real driver would have aborted), so it cannot
        demonstrate InFailedSqlTransaction directly; the rollback count is
        the closest observable proxy, same approach as the P2 test
        `test_coverage_read_failure_is_recorded_without_failing_the_audit`."""
        db = FakeDb()
        st = store.Store("postgres://unused", connect=lambda dsn: db)
        def explode(*a, **kw):
            raise RuntimeError("server closed the connection unexpectedly")
        st.read_candidate_fec_ids = explode
        guard = cores.load_guard_core("record")
        layer = middleware.ToolLayer("record", guard, st)
        layer.handlers.update(intake.build_intake_handlers(
            "record", st, doe_fetch=lambda office=None: _DOE_INCUMBENCY_FIXTURE,
            fec_api_key="testkey", fec_get=_fec_get_map({"28": _FL28_ROWS})))
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertIs(res["ok"], False, res)
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertIn("read_candidate_fec_ids", " ".join(res["reasons"]))
        self.assertEqual(db.rolled_back, 1)
        self.assertEqual(committed_into(db, "candidate"), [])  # DoE rolled back
        self.assertEqual(committed_updates(db, "race"), [])

    def test_a_truncated_fec_page_refuses_rather_than_publishing_it(self):
        """`per_page=100` and no paging: if the FEC says the district has more
        filers than it returned, page 2 could hold the "I" row and we would
        publish an open seat. Fail closed."""
        layer, db = self._layer(count=137)
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("137", " ".join(out["reasons"]))
        self.assertIn("returned 3", " ".join(out["reasons"]))  # rows returned
        self.assertEqual(committed_updates(db, "race"), [])
        self.assertEqual(committed_updates(db, "candidate"), [])

    def test_a_response_without_pagination_refuses(self):
        """Unknown completeness is not completeness."""
        layer, db = self._layer(pagination=False)
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["status"], "refused", out)
        self.assertIn("pagination.count", " ".join(out["reasons"]))
        self.assertEqual(committed_updates(db, "race"), [])

    def _layer_returning_results(self, results):
        """A well-formed envelope whose `results` is the wrong shape. The
        `"results" in data` check upstream only proves the key exists."""
        def fec_get(path, params):
            return {"api_version": "1.0", "results": results,
                    "pagination": {"count": 1, "per_page": 100, "page": 1}}
        return make_intake_layer(
            "record", doe_fetch=lambda office=None: _DOE_INCUMBENCY_FIXTURE,
            fec_api_key="testkey", fec_get=fec_get)

    def test_a_null_results_refuses_the_race_rather_than_raising(self):
        """Nothing wraps this handler, so a TypeError here would escape
        `dispatch` and leave the DoE upserts uncommitted on the shared
        connection. Refuse the race, like the pagination checks do."""
        layer, db = self._layer_returning_results(None)
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertTrue(res["ok"], res)
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("'results'", " ".join(out["reasons"]))
        self.assertEqual(committed_updates(db, "race"), [])
        self.assertEqual(committed_updates(db, "candidate"), [])

    def test_a_results_list_of_non_objects_refuses_the_race(self):
        """The other half: a list is not enough -- every item has to be a
        mapping or the resolver's `.get()` calls raise AttributeError."""
        layer, db = self._layer_returning_results(["x"])
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertTrue(res["ok"], res)
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("'results'", " ".join(out["reasons"]))
        self.assertEqual(committed_updates(db, "race"), [])
        self.assertEqual(committed_updates(db, "candidate"), [])

    def test_a_complete_page_resolves(self):
        """The other side of the check: count == rows returned is complete."""
        layer, db = self._layer(count=len(_FL28_ROWS))
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["status"], "resolved", out)
        self.assertEqual(len(committed_updates(db, "race")), 1)

    def _parsed_for_race(self, race, candidates):
        """Bypass parse_candidate_list's DoE-file gate to hand
        `_incumbency_for_race` a race dict directly -- the parser only ever
        emits `district` as `str(int(Juris1num))`, so a non-numeric or
        single/unusual-width district can't arise from the ordinary DoE
        pipeline (`_TARGET_US_HOUSE` only has 2-digit codes). This is the
        shape a hand-edited or otherwise corrupted row would produce."""
        def fake_parse(text):
            return {"races": {race["race_id"]: race}, "candidates": candidates,
                    "skipped": 0, "tiers": {"ballot": len(candidates),
                                            "write_in": 0, "excluded": 0}}
        return fake_parse

    def test_single_digit_district_is_zero_padded_in_the_fec_query(self):
        race = {"race_id": "FL-8-general", "office": "United States Representative",
                "level": "federal", "district": "8", "election": "general",
                "candidate_ids": ["FL-DOE-90020"]}
        cand = {"candidate_id": "FL-DOE-90020", "legal_name": "Cody Test",
                "party": "REP", "office_sought": "United States Representative",
                "qualifying_status": "Qualified", "ballot_status": "ballot"}
        original = intake.parse_candidate_list
        intake.parse_candidate_list = self._parsed_for_race(race, [cand])
        calls = []
        try:
            layer, db = make_intake_layer(
                "record", doe_fetch=lambda office=None: "unused",
                fec_api_key="testkey",
                fec_get=_fec_get_map({"08": []}, calls))
            res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        finally:
            intake.parse_candidate_list = original
        self.assertTrue(res["ok"], res)
        self.assertEqual(len(calls), 1)
        _, params = calls[0]
        self.assertEqual(params["district"], "08")

    def test_non_numeric_district_refuses_rather_than_raising(self):
        race = {"race_id": "FL-AB-general", "office": "United States Representative",
                "level": "federal", "district": "AB", "election": "general",
                "candidate_ids": ["FL-DOE-90099"]}
        cand = {"candidate_id": "FL-DOE-90099", "legal_name": "Cody Test",
                "party": "REP", "office_sought": "United States Representative",
                "qualifying_status": "Qualified", "ballot_status": "ballot"}
        original = intake.parse_candidate_list
        intake.parse_candidate_list = self._parsed_for_race(race, [cand])
        try:
            layer, db = make_intake_layer(
                "record", doe_fetch=lambda office=None: "unused",
                fec_api_key="testkey", fec_get=_fec_get_map({}))
            res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        finally:
            intake.parse_candidate_list = original
        self.assertTrue(res["ok"], res)
        out = res["result"]["incumbency"]["FL-AB-general"]
        self.assertEqual(out["status"], "refused", out)
        self.assertNotIn("is_open_seat", out)
        self.assertIn("'AB'", " ".join(out["reasons"]))

    def test_statewide_race_is_not_applicable(self):
        layer, db = self._layer()
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        gov = res["result"]["incumbency"]["FL-GOV-general"]
        self.assertEqual(gov["status"], "not_applicable")
        self.assertIn("federal", gov["reason"])

    def test_senate_race_is_not_implemented_not_misfiled_as_non_federal(self):
        # FL-SEN-general is federal but has no district. FEC covers it; this
        # fill only knows the House query shape. Degrade honestly: name the
        # missing thing instead of claiming the Senate is not a federal race.
        layer, db = self._layer()
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        sen = res["result"]["incumbency"]["FL-SEN-general"]
        self.assertEqual(sen["status"], "not_implemented", sen)
        self.assertIn("office=S", sen["reason"])
        self.assertNotIn("is_open_seat", sen)
        self.assertEqual(committed_updates(db, "race"), [])

    def test_refused_race_writes_nothing(self):
        rows = [_fec_cand("H0FL28777", "STRANGER, SAM", "I")]
        layer, db = self._layer(by_district={"28": rows})
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        out = res["result"]["incumbency"]["FL-28-general"]
        self.assertEqual(out["status"], "refused")
        self.assertNotIn("is_open_seat", out)
        self.assertEqual(committed_updates(db, "race"), [])
        self.assertEqual(committed_updates(db, "candidate"), [])

    def test_missing_key_refuses_before_anything_is_fetched(self):
        fetched = []
        def doe_fetch(office=None):
            fetched.append(office)
            return _DOE_INCUMBENCY_FIXTURE
        layer, db = make_intake_layer("record", doe_fetch=doe_fetch,
                                      fec_api_key="")
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertEqual(res["error"], errors.NOT_CONFIGURED)
        self.assertIn("FEC_API_KEY", " ".join(res["reasons"]))
        self.assertEqual(fetched, [])
        self.assertEqual(committed_into(db, "race"), [])
        self.assertEqual(committed_into(db, "candidate"), [])

    def test_flag_absent_is_exactly_todays_behaviour(self):
        calls = []
        layer, db = self._layer(calls=calls)
        with_flag = layer.dispatch("doe_file_intake", {"fill_incumbency": False})
        self.assertNotIn("incumbency", with_flag["result"])
        layer2, db2 = self._layer(calls=calls)
        plain = layer2.dispatch("doe_file_intake", {})
        self.assertEqual(plain["result"], with_flag["result"])
        self.assertEqual(calls, [])          # the FEC is never touched

    def test_fec_failure_is_recorded_and_the_intake_still_stands(self):
        def boom(path, params):
            raise RuntimeError("connection reset")
        layer, db = make_intake_layer(
            "record", doe_fetch=lambda office=None: _DOE_INCUMBENCY_FIXTURE,
            fec_api_key="testkey", fec_get=boom)
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["incumbency"]["FL-28-general"]["error"],
                         errors.UPSTREAM_FAILED)
        self.assertEqual(len(committed_into(db, "candidate")), 3)  # DoE stands
        self.assertEqual(committed_updates(db, "race"), [])

    def test_a_write_failure_rolls_the_whole_call_back(self):
        db = FakeDb()
        st = store.Store("postgres://unused", connect=lambda dsn: db)
        def explode(*a, **kw):
            raise RuntimeError("server closed the connection unexpectedly")
        st.write_incumbency = explode
        guard = cores.load_guard_core("record")
        layer = middleware.ToolLayer("record", guard, st)
        layer.handlers.update(intake.build_intake_handlers(
            "record", st, doe_fetch=lambda office=None: _DOE_INCUMBENCY_FIXTURE,
            fec_api_key="testkey", fec_get=_fec_get_map({"28": _FL28_ROWS})))
        res = layer.dispatch("doe_file_intake", {"fill_incumbency": True})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertGreaterEqual(db.rolled_back, 1)
        self.assertEqual(committed_into(db, "race"), [])


class TestIntakeFEC(unittest.TestCase):
    def _ok_response(self):
        return {"api_version": "1.0", "pagination": {"count": 7},
                "results": [{"candidate_id": "H6FL28039", "name": "CAMPIONE, THOMAS"}]}

    def test_fec_query_ok(self):
        layer, db = make_intake_layer(
            "record", fec_api_key="testkey",
            fec_get=lambda path, params: self._ok_response())
        res = layer.dispatch("fec_api_query", {
            "endpoint": "candidates", "params": {"state": "FL", "district": "28"}})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["results"][0]["candidate_id"], "H6FL28039")

    def test_fec_no_key_is_not_configured(self):
        layer, db = make_intake_layer("record", fec_api_key="")
        res = layer.dispatch("fec_api_query", {"endpoint": "candidates"})
        self.assertEqual(res["error"], errors.NOT_CONFIGURED)

    def test_fec_unknown_endpoint_fails_closed(self):
        layer, db = make_intake_layer("record", fec_api_key="k",
                                      fec_get=lambda p, q: self._ok_response())
        res = layer.dispatch("fec_api_query", {"endpoint": "schedule_a_raw"})
        self.assertEqual(res["error"], errors.NOT_IMPLEMENTED)

    def test_fec_rate_limit_backs_off_then_succeeds(self):
        state = {"calls": 0}
        def flaky(path, params):
            state["calls"] += 1
            if state["calls"] == 1:
                raise intake._RateLimited(retry_after="1")
            return self._ok_response()
        slept = []
        layer, db = make_intake_layer("record", fec_api_key="k",
                                      fec_get=flaky, sleep=lambda s: slept.append(s))
        res = layer.dispatch("fec_api_query", {"endpoint": "candidates"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(state["calls"], 2)   # retried once
        self.assertEqual(slept, [1.0])

    def test_fec_unexpected_schema_fails_closed(self):
        layer, db = make_intake_layer("record", fec_api_key="k",
                                      fec_get=lambda p, q: {"unexpected": True})
        res = layer.dispatch("fec_api_query", {"endpoint": "candidates"})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)

    def test_fec_denied_for_profiler(self):
        # profiler has no FEC grant — denied at check_tool_access, no handler run
        layer, sink = make_layer("profiler")
        res = layer.dispatch("fec_api_query", {"endpoint": "candidates"})
        self.assertEqual(res["error"], errors.DENIED_TOOL)


class TestIntakeFLSenateAndJurisdiction(unittest.TestCase):
    _BILL = "<html><head><title>Senate Bill 10 (2026) - The Florida Senate</title></head><body>text</body></html>"

    def test_bill_fetch_ok_and_cached(self):
        cache = MemCache()
        layer, db = make_intake_layer(
            "record", cache=cache, flsenate_get=lambda path: self._BILL)
        r1 = layer.dispatch("fl_legislature_query", {
            "year": 2026, "bill_number": 10, "query_type": "bill"})
        r2 = layer.dispatch("fl_legislature_query", {
            "year": 2026, "bill_number": 10, "query_type": "bill"})
        self.assertTrue(r1["ok"], r1)
        self.assertFalse(r1["result"]["cached"])
        self.assertTrue(r2["result"]["cached"])

    def test_bill_text_endpoint_accepts_raw_text_without_site_chrome(self):
        raw = "A bill to be entitled An act relating to ... " * 20  # no site chrome
        layer, db = make_intake_layer(
            "record", cache=MemCache(), flsenate_get=lambda path: raw)
        res = layer.dispatch("fl_legislature_query", {
            "year": 2026, "bill_number": 10, "query_type": "bill_text"})
        self.assertTrue(res["ok"], res)

    def test_bill_response_not_a_bill_fails_closed(self):
        layer, db = make_intake_layer(
            "record", cache=MemCache(), flsenate_get=lambda path: "<html>blocked</html>")
        res = layer.dispatch("fl_legislature_query", {"year": 2026, "bill_number": 10})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)

    def test_jurisdiction_resolve_over_zip_district(self):
        db = FakeDb().prime_read([
            {"zip5": "33101", "county_fips": "12086", "county_name": "Miami-Dade",
             "congressional_district": "FL-28", "metro": "Miami", "is_split": False,
             "in_coverage": True}])
        layer, db = make_intake_layer("orchestrator", db=db)
        res = layer.dispatch("jurisdiction_resolve", {"zip5": "33101"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["congressional_districts"], ["FL-28"])
        self.assertTrue(res["result"]["in_coverage"])
        # Five, not four: the four state cabinet offices plus the U.S. Senate
        # seat. A ZIP lookup returns the races that apply regardless of
        # district, and the Senate race is statewide even though it is federal.
        # This assertion read 4 until 2026-09-07 and was encoding the parser's
        # blind spot as an expectation.
        self.assertEqual(
            res["result"]["statewide_races"],
            ["FL-AGR-general", "FL-ATG-general", "FL-CFO-general",
             "FL-GOV-general", "FL-SEN-general"])

    def test_jurisdiction_bad_zip_degrades(self):
        layer, db = make_intake_layer("orchestrator")
        res = layer.dispatch("jurisdiction_resolve", {"zip5": "abc"})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)


def _profile(cid, race, wc, facts, positions, fc, covered, ballot_status="ballot"):
    # ballot_status rides the profile read (A3): store.read_profiles LEFT JOINs
    # candidate so T10 can audit the printed ballot lines only.
    return {"candidate_id": cid, "race_id": race,
            "facts": [f"f{i}" for i in range(facts)],
            "positions": [f"p{i}" for i in range(positions)],
            "opinions": [],
            "audit": {"word_count": wc, "fact_checks_performed": fc,
                      "spine_issues_covered": covered},
            "ballot_status": ballot_status}


def make_synthesis_layer(db=None, **kw):
    db = db if db is not None else FakeDb()
    st = store.Store("postgres://unused", connect=lambda dsn: db)
    guard = cores.load_guard_core("orchestrator")
    layer = middleware.ToolLayer("orchestrator", guard, st)
    layer.handlers.update(synthesis.build_synthesis_handlers("orchestrator", st, **kw))
    return layer, db


def profile_updates(db):
    return [s for s, _ in db.committed if s.startswith("UPDATE profile")]


class TestBalanceAudit(unittest.TestCase):
    def test_imbalanced_race_halts_with_breach_and_guard_log(self):
        db = FakeDb().prime_read([
            _profile("cand_001", "FL-28-general", 450, 5, 4, 6, 4),
            _profile("cand_002", "FL-28-general", 445, 5, 4, 4, 4),  # fc 6 vs 4 -> 33%
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-28-general"})
        self.assertTrue(res["ok"])                       # the audit ran
        self.assertEqual(res["result"]["verdict"], "HALT")
        self.assertEqual(res["result"]["breached_metrics"], ["fact_checks"])
        self.assertEqual(res["result"]["metrics"]["fact_checks"]["candidates"],
                         {"low": "cand_002", "high": "cand_001"})
        self.assertTrue(layer.halted)                    # freezes further writes
        self.assertEqual(len(profile_updates(db)), 2)    # balance_check_passed written
        log = committed_log_rows(db)[-1]
        self.assertEqual(log["status"], "success")
        self.assertTrue(log["guard_triggered"])          # Audit Block Rate KPI

    def test_balanced_race_passes(self):
        db = FakeDb().prime_read([
            _profile("cand_001", "FL-15-general", 450, 5, 4, 5, 4),
            _profile("cand_002", "FL-15-general", 448, 5, 4, 5, 4),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        self.assertEqual(res["result"]["verdict"], "PASS")
        self.assertFalse(layer.halted)
        self.assertFalse(committed_log_rows(db)[-1]["guard_triggered"])

    # --- A3: the audit population is the ballot tier only ---------------

    def test_write_in_with_no_claims_no_longer_halts_the_race(self):
        """The defect this task exists to fix. A write-in has no public
        material, so it enters with zero claims -- (5-0)/5 is 100% variance
        against a 10% threshold, and the race HALTs permanently. B1 found at
        least one such filer in every one of the eight target races."""
        db = FakeDb().prime_read([
            _profile("cand_001", "FL-15-general", 450, 5, 4, 5, 4),
            _profile("cand_002", "FL-15-general", 448, 5, 4, 5, 4),
            _profile("cand_wri", "FL-15-general", 0, 0, 0, 0, 0, ballot_status="write_in"),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["verdict"], "PASS")
        self.assertFalse(layer.halted)
        # PASS is itself the proof the core never saw the write-in: had it,
        # (5-0)/5 would be 100% variance and the verdict HALT. The filter is in
        # the caller, so balance_audit_core stays a pure function over what it
        # is handed (AGENT_BRIEF section 3: do not edit a core).
        self.assertEqual(res["result"]["audited_candidates"], ["cand_001", "cand_002"])
        self.assertEqual(res["result"]["excluded_candidates"],
                         [{"candidate_id": "cand_wri", "ballot_status": "write_in"}])
        # The write-in never passed an audit, so nothing may claim it did --
        # balance_check_passed is what the publication gate reads.
        self.assertEqual(len(profile_updates(db)), 2)

    def test_defeated_filer_is_excluded_and_recorded(self):
        db = FakeDb().prime_read([
            _profile("cand_001", "FL-23-general", 450, 5, 4, 5, 4),
            _profile("cand_002", "FL-23-general", 448, 5, 4, 5, 4),
            _profile("cand_def", "FL-23-general", 10, 0, 0, 0, 0, ballot_status="excluded"),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-23-general"})
        self.assertEqual(res["result"]["verdict"], "PASS")
        self.assertEqual([e["candidate_id"] for e in res["result"]["excluded_candidates"]],
                         ["cand_def"])

    def test_orphan_profile_is_excluded_not_silently_dropped(self):
        """LEFT JOIN, so a profile whose candidate row is gone arrives with
        ballot_status None. Fail closed -- excluded, and visibly so."""
        db = FakeDb().prime_read([
            _profile("cand_001", "FL-23-general", 450, 5, 4, 5, 4),
            _profile("cand_002", "FL-23-general", 448, 5, 4, 5, 4),
            _profile("orphan", "FL-23-general", 0, 0, 0, 0, 0, ballot_status=None),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-23-general"})
        self.assertEqual(res["result"]["excluded_candidates"],
                         [{"candidate_id": "orphan", "ballot_status": None}])

    def test_one_candidate_race_reports_unopposed(self):
        """FL-10's real shape: the file's only UNO row, so exactly one ballot
        line. Variance over one candidate is 0.0 and passes trivially --
        arithmetically right, but 'equal scrutiny' is vacuous with a sample of
        one. Recorded, never gated."""
        db = FakeDb().prime_read([
            _profile("cand_solo", "FL-10-general", 450, 5, 4, 5, 4),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-10-general"})
        self.assertTrue(res["result"]["unopposed"])
        self.assertEqual(res["result"]["verdict"], "PASS")   # reports, never gates
        self.assertFalse(layer.halted)

    def test_a_contested_race_is_not_unopposed(self):
        db = FakeDb().prime_read([
            _profile("cand_001", "FL-15-general", 450, 5, 4, 5, 4),
            _profile("cand_002", "FL-15-general", 448, 5, 4, 5, 4),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        self.assertFalse(res["result"]["unopposed"])

    def test_race_with_no_ballot_candidate_degrades_not_passes(self):
        """Every filer excluded is not a balanced race, it is an empty one.
        Variance over zero candidates must never read as a pass."""
        db = FakeDb().prime_read([
            _profile("cand_def", "FL-28-general", 10, 0, 0, 0, 0, ballot_status="excluded"),
            _profile("cand_wri", "FL-28-general", 0, 0, 0, 0, 0, ballot_status="write_in"),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-28-general"})
        self.assertFalse(res["ok"])
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertIn("no ballot-tier candidate", res["reasons"][0])
        self.assertIn("cand_def=excluded", res["reasons"][0])
        self.assertEqual(len(profile_updates(db)), 0)

    def test_profile_read_left_joins_so_an_orphan_survives_the_query(self):
        """Structural, not behavioural: FakeDb returns primed rows and never
        executes SQL, so this pins the emitted query rather than Postgres's
        answer. It earns its place because INNER JOIN here would drop an
        orphan profile from the result set entirely -- the same invisible
        filter the ballot tier exists to replace with a recorded one. Real
        semantics are exercised when S2-01 runs against live Postgres."""
        db = FakeDb().prime_read([_profile("cand_001", "FL-15-general", 450, 5, 4, 5, 4)])
        layer, db = make_synthesis_layer(db=db)
        layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        profile_reads = [sql for sql, _ in db.selects if "FROM profile" in sql]
        self.assertEqual(len(profile_reads), 1)
        self.assertIn("LEFT JOIN candidate", profile_reads[0])
        self.assertIn("c.ballot_status", profile_reads[0])

    # --- P2 / N5: per-race named-coverage variance, recorded never gated ---

    def _uneven_coverage_db(self, counts_rows, race="FL-15-general"):
        # SELECT results are consumed in execution order: profiles, then counts.
        return (FakeDb()
                .prime_read([_profile("cand_001", race, 450, 5, 4, 5, 4),
                             _profile("cand_002", race, 448, 5, 4, 5, 4)])
                .prime_read(counts_rows))

    def test_coverage_variance_recorded_for_an_uneven_race(self):
        db = self._uneven_coverage_db([{"candidate_id": "cand_001", "n": 4},
                                       {"candidate_id": "cand_002", "n": 1}])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        cov = res["result"]["coverage"]
        self.assertEqual(cov["counts"], {"cand_001": 4, "cand_002": 1})
        self.assertEqual(cov["variance_pct"], 75.0)   # (4-1)/4, the core's unit
        self.assertEqual((cov["min"], cov["max"]), (1, 4))
        self.assertEqual(cov["candidates"], {"low": "cand_002", "high": "cand_001"})

    def test_candidate_with_zero_coverage_is_counted_not_dropped(self):
        """The press ignoring a candidate is the widest gap in the report.
        Drop them from the denominator and the number we publish about our own
        fairness improves precisely because coverage got less fair."""
        db = self._uneven_coverage_db([{"candidate_id": "cand_001", "n": 3}])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        cov = res["result"]["coverage"]
        self.assertEqual(cov["counts"], {"cand_001": 3, "cand_002": 0})
        self.assertEqual(cov["variance_pct"], 100.0)
        self.assertEqual((cov["min"], cov["max"]), (0, 3))

    def test_uneven_coverage_never_gates_publication(self):
        """N5 reports, it never halts. Halting a race because the press covered
        it unevenly would hide a real ballot over something nobody can
        remediate -- so a 100% coverage gap leaves verdict/halt/
        balance_check_passed exactly as the scrutiny metrics left them."""
        db = self._uneven_coverage_db([{"candidate_id": "cand_001", "n": 9}])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        self.assertEqual(res["result"]["coverage"]["variance_pct"], 100.0)
        self.assertEqual(res["result"]["verdict"], "PASS")
        self.assertFalse(layer.halted)                    # nothing frozen
        self.assertFalse(committed_log_rows(db)[-1]["guard_triggered"])
        patches = [json.loads(params[0]) for sql, params in db.committed
                   if sql.startswith("UPDATE profile")]
        self.assertEqual(len(patches), 2)
        self.assertTrue(all(p["balance_check_passed"] for p in patches))
        self.assertTrue(all(p["flag_reason"] is None for p in patches))

    def test_coverage_read_counts_named_rows_only(self):
        """Structural, like the LEFT JOIN test above: FakeDb returns primed
        rows whatever the SQL, so the filter has to be pinned on the emitted
        query. It earns its place because `related` rows attach to every
        candidate the ambiguity admits -- equal across a race by construction
        -- so counting them would drag the variance toward zero."""
        db = self._uneven_coverage_db([{"candidate_id": "cand_001", "n": 4}])
        layer, db = make_synthesis_layer(db=db)
        layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        news_reads = [(sql, params) for sql, params in db.selects
                      if "FROM news_item" in sql]
        self.assertEqual(len(news_reads), 1)
        sql, params = news_reads[0]
        self.assertIn("relation = 'named'", sql)
        self.assertIn("ANY(", sql)            # roster filtered in SQL, not Python
        self.assertEqual(list(params[0]), ["cand_001", "cand_002"])

    def test_coverage_read_failure_is_recorded_without_failing_the_audit(self):
        # execute order: profiles(1) counts(2) -> kill the coverage read only.
        db = FakeDb(fail_at=2).prime_read([
            _profile("cand_001", "FL-15-general", 450, 5, 4, 5, 4),
            _profile("cand_002", "FL-15-general", 448, 5, 4, 5, 4),
        ])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        self.assertTrue(res["ok"], res)                      # the audit still ran
        self.assertEqual(res["result"]["coverage"]["error"], errors.UPSTREAM_FAILED)
        self.assertEqual(res["result"]["verdict"], "PASS")
        self.assertFalse(layer.halted)
        self.assertEqual(len(profile_updates(db)), 2)
        self.assertEqual(committed_log_rows(db)[-1]["status"], "success")
        # FakeDb has no transaction-poisoning model -- unlike real psycopg it
        # happily executes the write-back UPDATEs after a "failed" SELECT
        # (fail_at just raises once, it doesn't leave the connection dirty).
        # So it cannot demonstrate InFailedSqlTransaction directly; the
        # rollback count is the closest observable proxy: it confirms
        # _coverage's except block actually called store.rollback() before
        # returning the error dict, which on a real connection is what keeps
        # the later write_balance_result loop from being poisoned.
        self.assertEqual(db.rolled_back, 1)

    def test_coverage_computation_failure_degrades_without_rolling_back(self):
        """The second `except` in `_coverage`: the SELECT succeeded, so the
        failure is pure Python (here a non-numeric `n`) and the transaction
        is clean. It must degrade the report-only coverage block without
        rolling back the profiles read the write-backs depend on -- the
        distinction the read-failure test above is the other half of."""
        db = self._uneven_coverage_db([{"candidate_id": "cand_001", "n": "x"}])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["coverage"]["error"], errors.UPSTREAM_FAILED)
        self.assertEqual(res["result"]["verdict"], "PASS")
        self.assertFalse(layer.halted)
        self.assertEqual(db.rolled_back, 0)

    def test_unopposed_race_has_zero_coverage_variance(self):
        db = (FakeDb()
              .prime_read([_profile("cand_solo", "FL-10-general", 450, 5, 4, 5, 4)])
              .prime_read([{"candidate_id": "cand_solo", "n": 7}]))
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-10-general"})
        cov = res["result"]["coverage"]
        self.assertEqual(cov["counts"], {"cand_solo": 7})
        self.assertEqual(cov["variance_pct"], 0.0)
        # No low/high: with max == min there is no gap to name. `unopposed`
        # already tells the reader why the number is vacuous.
        self.assertNotIn("candidates", cov)

    def test_coverage_roster_is_the_ballot_tier_only(self):
        db = (FakeDb()
              .prime_read([
                  _profile("cand_001", "FL-15-general", 450, 5, 4, 5, 4),
                  _profile("cand_002", "FL-15-general", 448, 5, 4, 5, 4),
                  _profile("cand_wri", "FL-15-general", 0, 0, 0, 0, 0,
                           ballot_status="write_in")])
              .prime_read([{"candidate_id": "cand_001", "n": 4},
                           {"candidate_id": "cand_002", "n": 4}]))
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        # An excluded filer has no page to cover, so counting them would report
        # a coverage gap the pipeline itself created.
        self.assertEqual(res["result"]["coverage"]["counts"],
                         {"cand_001": 4, "cand_002": 4})

    def test_coverage_ignores_a_count_row_for_an_off_roster_candidate_id(self):
        """The `if row["candidate_id"] in counts` guard (mirrors
        namedCountsByCandidate() verbatim) is unreachable given the SQL's
        `ANY(%s)` filter -- but FakeDb returns primed rows regardless of SQL,
        so this pins the guard's own behaviour rather than trusting the SQL
        to enforce it: an off-roster row must not leak into `counts` or shift
        the variance."""
        db = self._uneven_coverage_db([{"candidate_id": "cand_001", "n": 4},
                                       {"candidate_id": "cand_002", "n": 4},
                                       {"candidate_id": "cand_999", "n": 999}])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        cov = res["result"]["coverage"]
        self.assertEqual(cov["counts"], {"cand_001": 4, "cand_002": 4})
        self.assertEqual(cov["variance_pct"], 0.0)
        self.assertNotIn("candidates", cov)

    def test_coverage_with_no_named_items_at_all_is_zero_variance(self):
        """No `named` row for any roster candidate -- the counts read comes
        back empty, not absent. Every roster candidate must still be zero-
        filled (not dropped), and equal zeros is zero variance, not an
        upstream failure."""
        db = self._uneven_coverage_db([])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-15-general"})
        cov = res["result"]["coverage"]
        self.assertEqual(cov["counts"], {"cand_001": 0, "cand_002": 0})
        self.assertEqual(cov["variance_pct"], 0.0)
        self.assertNotIn("candidates", cov)

    def test_no_profiles_degrades(self):
        db = FakeDb().prime_read([])
        layer, db = make_synthesis_layer(db=db)
        res = layer.dispatch("balance_audit", {"race_id": "FL-99-general"})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)

    def test_balance_audit_denied_for_factchecker(self):
        layer, sink = make_layer("factchecker")
        res = layer.dispatch("balance_audit", {"race_id": "r1"})
        self.assertEqual(res["error"], errors.DENIED_TOOL)


class TestSmsDispatch(unittest.TestCase):
    _TWILIO = {"TWILIO_ACCOUNT_SID": "AC1", "TWILIO_AUTH_TOKEN": "tok",
               "TWILIO_OWNER_PHONE": "+15615550100"}

    def test_no_token_is_refused_and_logged(self):
        layer, db = make_synthesis_layer()
        res = layer.dispatch("sms_dispatch", {"to": "+15615550100", "body": "hi"})
        self.assertEqual(res["error"], errors.DENIED_TOOL)
        self.assertTrue(committed_log_rows(db)[-1]["guard_triggered"])

    def test_dispatch_disarmed_when_no_token_configured(self):
        # S3 hasn't minted a token (approval_token=None) -> even a presented
        # token cannot arm dispatch. Fail closed.
        layer, db = make_synthesis_layer(twilio_env=self._TWILIO)  # approval_token=None
        res = layer.dispatch("sms_dispatch", {"approval_token": "anything",
                                              "to": "+15615550100", "body": "hi"})
        self.assertEqual(res["error"], errors.DENIED_TOOL)

    def test_token_but_twilio_unconfigured_degrades(self):
        layer, db = make_synthesis_layer(approval_token="tok123", twilio_env={})
        res = layer.dispatch("sms_dispatch", {"approval_token": "tok123",
                                              "to": "+1", "body": "hi"})
        self.assertEqual(res["error"], errors.NOT_CONFIGURED)

    def test_wrong_token_refused(self):
        layer, db = make_synthesis_layer(approval_token="right", twilio_env=self._TWILIO)
        res = layer.dispatch("sms_dispatch", {"approval_token": "wrong",
                                              "to": "+15615550100", "body": "hi"})
        self.assertEqual(res["error"], errors.DENIED_TOOL)

    def test_recipient_must_be_owner_phone(self):
        layer, db = make_synthesis_layer(approval_token="t", twilio_env=self._TWILIO)
        res = layer.dispatch("sms_dispatch", {"approval_token": "t",
                                              "to": "+19998887777", "body": "hi"})
        self.assertEqual(res["error"], errors.DENIED_TOOL)

    def test_valid_dispatch_sends_to_owner(self):
        sent = {}
        def fake_send(sid, auth, sender, to, body):
            sent.update(sid=sid, to=to, body=body)
            return "SM123"
        layer, db = make_synthesis_layer(
            approval_token="t", twilio_env=self._TWILIO, sms_sender=fake_send)
        res = layer.dispatch("sms_dispatch", {"approval_token": "t",
                             "to": "+15615550100", "body": "Your brief is ready"})
        self.assertTrue(res["ok"], res)
        self.assertEqual(res["result"]["message_sid"], "SM123")
        self.assertEqual(sent["to"], "+15615550100")

    def test_dispatch_frozen_after_balance_halt(self):
        # a balance HALT freezes the process's write tools — sms included (I2).
        db = FakeDb().prime_read([
            _profile("cand_001", "FL-28-general", 450, 5, 4, 6, 4),
            _profile("cand_002", "FL-28-general", 445, 5, 4, 4, 4),
        ])
        layer, db = make_synthesis_layer(
            db=db, approval_token="t", twilio_env=self._TWILIO,
            sms_sender=lambda *a: "SM999")
        layer.dispatch("balance_audit", {"race_id": "FL-28-general"})  # -> HALT
        frozen = layer.dispatch("sms_dispatch", {"approval_token": "t",
                                "to": "+15615550100", "body": "hi"})
        self.assertEqual(frozen["error"], errors.PIPELINE_HALTED)


class TestToolSchemas(unittest.TestCase):
    """The MCP surface must describe itself. A live claude-sonnet-5 Fact-Checker
    session burned 17/26 tool calls guessing `type`/`lean_tag` when the tools
    published no schema — these assertions keep the enums honest and pinned to
    the canonical cores so the two can never drift."""

    def setUp(self):
        self.guard = cores.load_guard_core("factchecker")  # carries the canonical enums

    def test_every_callable_tool_has_a_schema_and_t11_has_none(self):
        self.assertEqual(set(schemas.TOOL_SCHEMAS), set(server.CALLABLE_TOOLS))
        self.assertNotIn("log_action", schemas.TOOL_SCHEMAS)
        for tool, spec in schemas.TOOL_SCHEMAS.items():
            self.assertTrue(spec["description"].strip(), tool)
            self.assertTrue(spec["input_schema"]["properties"], tool)

    def test_enums_match_the_canonical_guard_core(self):
        self.assertEqual(set(schemas.SOURCE_TYPES), set(self.guard.VALID_SOURCE_TYPES))
        self.assertEqual(set(schemas.LEAN_TAGS), set(self.guard.VALID_LEAN_TAGS))
        self.assertEqual(set(schemas.BUCKETS), set(self.guard.VALID_BUCKETS))
        self.assertEqual(set(schemas.VERDICTS), set(self.guard.VERDICTS))
        self.assertEqual(set(schemas.VERIFICATION), set(self.guard.VALID_VERIFICATION))

    def test_named_catalogs_match_their_implementations(self):
        self.assertEqual(set(schemas.DB_READ_QUERIES),
                         set(store._NAMED_READS) | {"claims_by_bucket"})
        self.assertEqual(set(schemas.FEC_ENDPOINTS), set(intake._FEC_ENDPOINTS))

    def test_source_register_publishes_the_type_and_lean_enums(self):
        props = schemas.TOOL_SCHEMAS["source_register"]["input_schema"]["properties"]
        self.assertIn("candidate_self", props["type"]["enum"])
        self.assertIn("primary_doc", props["type"]["enum"])
        self.assertIn("N/A", props["lean_tag"]["enum"])
        self.assertNotIn("neutral", props["lean_tag"]["enum"])  # what the model guessed

    def test_claim_write_verdict_is_storage_form_and_nullable(self):
        props = schemas.TOOL_SCHEMAS["claim_write"]["input_schema"]["properties"]
        verdict = props["verdict"]
        self.assertIn("mostly_accurate", verdict["enum"])   # snake_case, not "Mostly Accurate"
        self.assertNotIn("Mostly Accurate", verdict["enum"])
        self.assertIn(None, verdict["enum"])                # outside_opinion -> null
        self.assertIn("storage form", verdict["description"].lower())
        required = schemas.TOOL_SCHEMAS["claim_write"]["input_schema"]["required"]
        self.assertIn("source_ids", required)               # no Source, no claim
        self.assertIn("bucket", required)
        self.assertEqual(props["source_ids"]["minItems"], 1)

    def test_db_read_is_a_named_catalog_not_raw_sql(self):
        props = schemas.TOOL_SCHEMAS["db_read"]["input_schema"]["properties"]
        self.assertIn("claims_by_bucket", props["query"]["enum"])
        self.assertEqual(set(props["buckets"]["items"]["enum"]), set(schemas.BUCKETS))

    def test_sms_dispatch_requires_the_approval_token(self):
        req = schemas.TOOL_SCHEMAS["sms_dispatch"]["input_schema"]["required"]
        self.assertIn("approval_token", req)

    def test_unknown_tool_schema_raises(self):
        with self.assertRaises(KeyError):
            schemas.schema_for("log_action")


class TestPerIdentitySurface(unittest.TestCase):
    """ADR-R1 makes one process = one identity, so the published MCP surface can
    be exact: only granted tools, with enums narrowed to what the guard accepts.
    Advertising a tool the guard will deny only invites a wasted call."""

    def test_surface_never_advertises_an_ungranted_tool(self):
        for agent in sorted(identity.VALID_IDENTITIES):
            guard = cores.load_guard_core(agent)
            surface = schemas.for_agent(agent, guard)
            self.assertTrue(surface, agent)
            for tool in surface:
                self.assertTrue(guard.check_tool_access(tool)["ok"], (agent, tool))

    def test_profiler_surface_is_narrowed_to_its_own_bucket_and_type(self):
        s = schemas.for_agent("profiler")
        self.assertNotIn("fec_api_query", s)      # denied -> not advertised
        self.assertNotIn("balance_audit", s)
        sr = s["source_register"]["input_schema"]["properties"]
        self.assertEqual(sr["type"]["enum"], ["candidate_self"])
        self.assertNotIn("lean_tag", sr)          # always N/A for the profiler
        cw = s["claim_write"]["input_schema"]["properties"]
        self.assertEqual(cw["bucket"]["enum"], ["stated_position"])
        self.assertEqual(cw["verdict"]["enum"], [None])   # never adjudicates
        self.assertEqual(s["db_read"]["input_schema"]["properties"]
                          ["buckets"]["items"]["enum"], ["stated_position"])

    def test_record_surface_has_no_web_tools_and_one_bucket(self):
        s = schemas.for_agent("record")
        self.assertNotIn("web_search", s)         # hard-denied at the wrapper
        self.assertNotIn("fetch_source", s)
        self.assertEqual(s["source_register"]["input_schema"]["properties"]
                          ["type"]["enum"], ["primary_doc"])
        self.assertEqual(s["claim_write"]["input_schema"]["properties"]
                          ["bucket"]["enum"], ["verifiable_fact"])

    def test_factchecker_surface_requires_lean_tag_and_excludes_stated_position(self):
        s = schemas.for_agent("factchecker")
        sr = s["source_register"]["input_schema"]
        self.assertIn("lean_tag", sr["required"])          # Tool Spec §2.5 B
        self.assertEqual(len(sr["properties"]["type"]["enum"]), 4)
        cw = s["claim_write"]["input_schema"]["properties"]
        self.assertEqual(set(cw["bucket"]["enum"]),
                         {"verifiable_fact", "outside_opinion"})
        self.assertNotIn("stated_position", cw["bucket"]["enum"])  # H1
        self.assertIn(None, cw["verdict"]["enum"])
        self.assertNotIn("balance_audit", s)
        self.assertNotIn("sms_dispatch", s)

    def test_orchestrator_surface_is_synthesis_and_intake_only(self):
        s = schemas.for_agent("orchestrator")
        self.assertIn("balance_audit", s)
        self.assertIn("sms_dispatch", s)
        self.assertIn("jurisdiction_resolve", s)
        self.assertNotIn("claim_write", s)        # it composes, it does not author

    def test_narrowing_does_not_mutate_the_base_schemas(self):
        schemas.for_agent("profiler")
        self.assertEqual(
            set(schemas.TOOL_SCHEMAS["claim_write"]["input_schema"]
                ["properties"]["bucket"]["enum"]), set(schemas.BUCKETS))


if __name__ == "__main__":
    unittest.main(verbosity=2)
