"""Tests for the S2 per-candidate entrypoint + read plane — stdlib only.

Covers the two staged pieces (Brief 01, the unit S3 will call per candidate):
  * `orchestration.ReadPlane` — the cap_readonly reads, against an injected
    fake connection (no live Postgres): each method issues the right query and
    parses the result; `from_env` fails closed.
  * `run_agent.run_session` — the wiring of read plane + S1 client + backend +
    SessionRunner, driven by a ScriptedBackend and fakes (no `mcp`, no Anthropic
    spend): the Profiler happy path, the Fact-Checker's claim-inventory
    forwarding (S2-R1), the missing-candidate stop, and model resolution (S2-R2).

The live run itself stays founder-gated (Brief 00); this proves the plumbing.

Run: python3 test_run_agent.py
"""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cap_runtime import agents, orchestration, run_agent, session  # noqa: E402


# --- a fake DB connection for ReadPlane (routes SQL -> canned rows) --------

class _FakeCursor:
    def __init__(self, conn):
        self._conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params):
        self._conn.calls.append((sql, tuple(params)))
        self._conn.rows = self._conn.router(sql, tuple(params))

    def fetchall(self):
        return self._conn.rows


class FakeConn:
    """Routes each executed SQL (by substring) to a list of dict rows."""

    def __init__(self, router):
        self.router = router
        self.calls: list = []
        self.rows: list = []
        self.closed = False

    def cursor(self):
        return _FakeCursor(self)

    def close(self):
        self.closed = True


def make_read_plane(router):
    return orchestration.ReadPlane("dsn-ignored", connect=lambda dsn: FakeConn(router))


class TestReadPlane(unittest.TestCase):
    def test_spine_issues_queries_spine_tier_and_parses(self):
        def router(sql, params):
            self.assertIn("FROM issue", sql)
            self.assertIn("tier = 'spine'", sql)
            self.assertEqual(params, ("FL-28-general",))
            return [{"issue_id": "i-housing", "title": "Housing", "display_order": 1},
                    {"issue_id": "i-jobs", "title": "Jobs", "display_order": 2}]
        rp = make_read_plane(router)
        issues = rp.spine_issues("FL-28-general")
        self.assertEqual([i["issue_id"] for i in issues], ["i-housing", "i-jobs"])

    def test_candidate_name_returns_legal_name(self):
        rp = make_read_plane(lambda sql, p: [{"legal_name": "Jane Q. Doe"}])
        self.assertEqual(rp.candidate_name("cand1"), "Jane Q. Doe")

    def test_candidate_name_none_when_absent(self):
        rp = make_read_plane(lambda sql, p: [])
        self.assertIsNone(rp.candidate_name("nope"))

    def test_claim_inventory_scopes_to_candidate_and_the_two_buckets(self):
        seen = {}

        def router(sql, params):
            seen["sql"], seen["params"] = sql, params
            return [{"claim_id": "cl1", "bucket": "stated_position", "text": "x"}]
        rp = make_read_plane(router)
        inv = rp.claim_inventory("FL-28-general", "cand1")
        self.assertEqual(inv[0]["claim_id"], "cl1")
        # race, candidate, then the exact two input buckets (order preserved).
        self.assertEqual(seen["params"],
                         ("FL-28-general", "cand1",
                          ["stated_position", "verifiable_fact"]))
        self.assertEqual(orchestration.FACTCHECK_INPUT_BUCKETS,
                         ("stated_position", "verifiable_fact"))

    def test_claim_write_count_counts_successful_writes(self):
        def router(sql, params):
            self.assertIn("tool_called = 'claim_write'", sql)
            self.assertIn("status = 'success'", sql)
            self.assertEqual(params, ("profiler", "cand1"))
            return [{"n": 3}]
        rp = make_read_plane(router)
        self.assertEqual(rp.claim_write_count("profiler", "cand1"), 3)

    def test_claim_write_count_zero_when_no_row(self):
        rp = make_read_plane(lambda sql, p: [])
        self.assertEqual(rp.claim_write_count("profiler", "cand1"), 0)

    def test_from_env_missing_var_fails_closed(self):
        with self.assertRaises(session.NotConfigured):
            orchestration.ReadPlane.from_env({})

    def test_from_env_builds_with_injected_connect(self):
        rp = orchestration.ReadPlane.from_env(
            {"CAP_READONLY_DB_URL": "dsn"},
            connect=lambda dsn: FakeConn(lambda s, p: []))
        self.assertIsInstance(rp, orchestration.ReadPlane)

    def test_connect_failure_becomes_notconfigured_without_dsn(self):
        def boom(dsn):
            raise OSError("connection to host 10.0.0.1 refused, password=hunter2")
        with self.assertRaises(session.NotConfigured) as ctx:
            orchestration.ReadPlane("secret-dsn", connect=boom)
        msg = str(ctx.exception)
        self.assertIn("OSError", msg)          # type only
        self.assertNotIn("hunter2", msg)       # never the secret / message
        self.assertNotIn("secret-dsn", msg)


# --- fakes for run_session -------------------------------------------------

SPINE = [{"issue_id": "i-housing", "title": "Housing affordability"}]


class FakeReadPlane:
    """In-memory read plane for the entrypoint wiring tests."""

    def __init__(self, *, name="Jane Doe", spine=None, inventory=None, log_count=1):
        self._name = name
        self._spine = spine if spine is not None else SPINE
        self._inventory = inventory if inventory is not None else []
        self._log_count = log_count
        self.counted: list = []

    def spine_issues(self, race_id):
        return self._spine

    def candidate_name(self, candidate_id):
        return self._name

    def claim_inventory(self, race_id, candidate_id):
        return self._inventory

    def claim_write_count(self, agent_id, candidate_id):
        self.counted.append((agent_id, candidate_id))
        return self._log_count


class FakeS1:
    """A drop-in for S1StdioClient: a context manager exposing .tools/.dispatch."""

    def __init__(self, tools):
        self.tools = tools
        self.entered = self.exited = False

    def __enter__(self):
        self.entered = True
        return self

    def __exit__(self, *exc):
        self.exited = True
        return False

    def dispatch(self, tool, payload):
        if tool == "source_register":
            return {"ok": True, "result": {"source_id": "src_1"}}
        return {"ok": True, "result": {"claim_id": payload.get("claim_id")}}


class RecordingBackend:
    """Captures the kickoff it was handed, then finishes with a report."""

    def __init__(self, report="done"):
        self.report = report
        self.kickoff = None

    def run(self, *, system, kickoff, dispatch, transcript):
        self.kickoff = kickoff
        transcript.append({"role": "user", "content": kickoff})
        transcript.append({"role": "assistant", "content": self.report})
        return session.BackendResult(final_report=self.report)


PROFILER_SCRIPT = [
    {"tool": "source_register", "payload": {"url": "https://x.com", "type": "candidate_self"}},
    {"tool": "claim_write", "payload": {"claim_id": "cl1", "bucket": "stated_position"}},
    {"report": "Wrote 1 stated_position claim."},
]


class TestRunSession(unittest.TestCase):
    def test_profiler_happy_path_wires_everything(self):
        captured = {}

        def s1_factory(spec):
            captured["spec"] = spec
            return FakeS1(tools=[{"name": "claim_write"}])

        def backend_factory(model, tools, config):
            captured["model"] = model
            captured["tools"] = tools
            return session.ScriptedBackend(PROFILER_SCRIPT)

        rp = FakeReadPlane(log_count=1)
        with tempfile.TemporaryDirectory() as tmp:
            res = run_agent.run_session(
                agents.PROFILER, candidate_id="cand1", race_id="FL-28-general",
                read_plane=rp, s1_factory=s1_factory, backend_factory=backend_factory,
                runs_dir=tmp, env={})
            self.assertEqual(res.status, "complete")
            self.assertEqual(res.claims_written, 1)        # from the read plane's log count
            self.assertEqual(res.tool_calls, 2)
            self.assertEqual(rp.counted, [("profiler", "cand1")])
        # the S1 was spawned as the profiler identity (ADR-R1) ...
        self.assertEqual(captured["spec"]["env"]["CAP_AGENT_ID"], "profiler")
        # ... and the backend got the config's default model + the S1 tools.
        self.assertEqual(captured["model"], "claude-sonnet-5")
        self.assertEqual(captured["tools"], [{"name": "claim_write"}])

    def test_factchecker_forwards_claim_inventory_into_kickoff(self):
        inventory = [{"claim_id": "cl-9", "bucket": "stated_position", "text": "T"}]
        rp = FakeReadPlane(inventory=inventory)
        backend = RecordingBackend()
        with tempfile.TemporaryDirectory() as tmp:
            res = run_agent.run_session(
                agents.FACTCHECKER, candidate_id="cand1", race_id="FL-28-general",
                read_plane=rp, s1_factory=lambda spec: FakeS1(tools=[]),
                backend_factory=lambda m, t, c: backend, runs_dir=tmp, env={})
        self.assertEqual(res.status, "complete")
        # S2-R1: the inventory reached the kickoff (without it the FC kickoff raises).
        self.assertIn("cl-9", backend.kickoff)
        self.assertIn("CLAIM INVENTORY", backend.kickoff)

    def test_missing_candidate_raises_before_spawn(self):
        spawned = []
        rp = FakeReadPlane(name=None)
        with self.assertRaises(LookupError):
            run_agent.run_session(
                agents.PROFILER, candidate_id="ghost", race_id="r",
                read_plane=rp,
                s1_factory=lambda spec: spawned.append(spec) or FakeS1([]),
                backend_factory=lambda m, t, c: session.ScriptedBackend([]),
                runs_dir="unused", env={})
        self.assertEqual(spawned, [])  # never spawned S1 for a nonexistent candidate

    def test_s1_context_manager_is_entered_and_exited(self):
        s1 = FakeS1(tools=[])
        with tempfile.TemporaryDirectory() as tmp:
            run_agent.run_session(
                agents.PROFILER, candidate_id="cand1", race_id="r",
                read_plane=FakeReadPlane(), s1_factory=lambda spec: s1,
                backend_factory=lambda m, t, c: session.ScriptedBackend(
                    [{"report": "ok"}]),
                runs_dir=tmp, env={})
        self.assertTrue(s1.entered and s1.exited)


class TestModelResolution(unittest.TestCase):
    def test_escalate_picks_factchecker_escalation_model(self):
        m = run_agent._resolve_model(agents.FACTCHECKER, None, escalate=True)
        self.assertEqual(m, "claude-opus-4-8")

    def test_escalate_on_non_escalatable_agent_raises(self):
        with self.assertRaises(ValueError):
            run_agent._resolve_model(agents.PROFILER, None, escalate=True)

    def test_explicit_override_passes_through(self):
        self.assertEqual(
            run_agent._resolve_model(agents.PROFILER, "claude-haiku-4-5", False),
            "claude-haiku-4-5")

    def test_default_is_none_so_config_model_is_used(self):
        self.assertIsNone(run_agent._resolve_model(agents.PROFILER, None, False))


class TestMainArgParsing(unittest.TestCase):
    def test_escalate_on_profiler_exits_nonzero(self):
        # parser.error -> SystemExit(2), before any read-plane/spawn.
        with self.assertRaises(SystemExit):
            run_agent.main(["--agent", "profiler", "--candidate", "c",
                            "--race", "r", "--escalate"])

    def test_unknown_agent_rejected(self):
        with self.assertRaises(SystemExit):
            run_agent.main(["--agent", "orchestrator", "--candidate", "c",
                            "--race", "r"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
