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
        {"QUA": "Qualified", "WIT": "Withdrawn", "ACT": "Active"}.get(status, status),
        party, party + " Party", last, first, middle, "N", "PO Box 1", "",
        "Miami", "FL", "33101", "MDA", phone, "", "", "", email])


_DOE_FIXTURE = "\n".join([
    _DOE_HEADER,
    _doe_row("89070", "USR", "United States Representative", "023", "QUA", "REP", "Adeimy", "Deborah"),
    _doe_row("89111", "USR", "United States Representative", "010", "ACT", "DEM", "Smith", "Jane", "Q"),
    _doe_row("89222", "USR", "United States Representative", "001", "QUA", "REP", "Doe", "John"),   # non-target
    _doe_row("89333", "GOV", "Governor", "", "QUA", "NPA", "Abrams", "Pat"),
    _doe_row("89444", "USR", "United States Representative", "028", "WIT", "DEM", "Gone", "Gary"),
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
            "FL-10-general", "FL-23-general", "FL-28-general", "FL-GOV-general"])
        self.assertEqual(len(p["candidates"]), 4)
        self.assertEqual(p["skipped"], 1)  # FL-01 is not a target

    def test_field_mapping_and_pii_dropped(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        by_id = {c["candidate_id"]: c for c in p["candidates"]}
        jane = by_id["FL-DOE-89111"]
        self.assertEqual(jane["legal_name"], "Jane Q Smith")
        self.assertEqual(jane["party"], "DEM")
        self.assertEqual(jane["qualifying_status"], "other")  # ACT -> other
        # PII must not survive into the candidate row
        for pii in ("email", "phone", "Addr1", "City", "Zip"):
            self.assertNotIn(pii, jane)
        self.assertNotIn("secret@example.com", repr(jane))
        self.assertEqual(by_id["FL-DOE-89333"]["party"], "NPA")
        self.assertEqual(by_id["FL-DOE-89444"]["qualifying_status"], "withdrawn")

    def test_race_carries_its_candidate_ids(self):
        p = intake.parse_candidate_list(_DOE_FIXTURE)
        self.assertEqual(p["races"]["FL-GOV-general"]["candidate_ids"], ["FL-DOE-89333"])
        self.assertEqual(p["races"]["FL-GOV-general"]["level"], "state")
        self.assertEqual(p["races"]["FL-10-general"]["district"], "10")

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
        self.assertEqual(res["result"]["candidate_count"], 4)
        self.assertEqual(res["result"]["skipped"], 1)
        races = committed_into(db, "race")
        cands = committed_into(db, "candidate")
        self.assertEqual(len(races), 4)
        self.assertEqual(len(cands), 4)
        self.assertIn("ON CONFLICT (race_id) DO UPDATE", races[0][0])       # idempotent
        self.assertIn("ON CONFLICT (candidate_id) DO UPDATE", cands[0][0])

    def test_bad_doe_format_degrades_upstream_failed(self):
        layer, db = make_intake_layer("record", doe_fetch=lambda office=None: "garbage")
        res = layer.dispatch("doe_file_intake", {})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)
        self.assertEqual(len(committed_into(db, "race")), 0)


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
        self.assertEqual(len(res["result"]["statewide_races"]), 4)

    def test_jurisdiction_bad_zip_degrades(self):
        layer, db = make_intake_layer("orchestrator")
        res = layer.dispatch("jurisdiction_resolve", {"zip5": "abc"})
        self.assertEqual(res["error"], errors.UPSTREAM_FAILED)


def _profile(cid, race, wc, facts, positions, fc, covered):
    return {"candidate_id": cid, "race_id": race,
            "facts": [f"f{i}" for i in range(facts)],
            "positions": [f"p{i}" for i in range(positions)],
            "opinions": [],
            "audit": {"word_count": wc, "fact_checks_performed": fc,
                      "spine_issues_covered": covered}}


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
