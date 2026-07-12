"""S2-01 runtime tests — stdlib only (same convention as the tool layer).

Covers the deterministic runner around the (injectable) agent loop: prompt
rendering, budget rails, S1 spawn spec, and a full scripted Profiler session
driven end to end (complete / incomplete / halted paths) with the action_log
as the source of truth. The live Anthropic+MCP backend is gated and asserted
to fail closed.

Run: python3 test_runtime.py
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cap_runtime import agents, session  # noqa: E402

SPINE = [{"issue_id": "i-housing", "title": "Housing affordability"},
         {"issue_id": "i-jobs", "title": "Jobs and the economy"}]


class MutableClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def ok_dispatch(calls):
    """A fake S1 dispatch that records calls and returns ok results."""
    def dispatch(tool, payload):
        calls.append((tool, dict(payload)))
        if tool == "source_register":
            return {"ok": True, "result": {"source_id": "src_1", "deduped": False}}
        if tool == "claim_write":
            return {"ok": True, "result": {"claim_id": payload.get("claim_id")}}
        return {"ok": True, "result": {}}
    return dispatch


PROFILER_SCRIPT = [
    {"tool": "fetch_source", "payload": {"url": "https://jane4congress.com/issues",
                                         "candidate_id": "cand1"}},
    {"tool": "source_register", "payload": {"url": "https://jane4congress.com/issues",
                                            "type": "candidate_self"}},
    {"tool": "claim_write", "payload": {"claim_id": "cl1", "bucket": "stated_position",
                                        "source_ids": ["src_1"], "attributed": True}},
    {"report": "Wrote 1 stated_position claim for cand1; i-jobs -> no_stated_position_found."},
]


class TestProfilerConfig(unittest.TestCase):
    def test_render_substitutes_placeholders(self):
        s = agents.PROFILER.render_system(candidate_id="cand1", race_id="FL-28-general",
                                          name="Jane Doe")
        self.assertIn("candidate cand1 in race FL-28-general", s)
        self.assertIn('Senator Jane Doe says', s)
        self.assertNotIn("{{", s)  # every placeholder filled
        self.assertIn("You write to exactly ONE bucket: stated_position", s)  # verbatim

    def test_kickoff_lists_spine_issues(self):
        k = agents.PROFILER.kickoff(candidate_id="cand1", race_id="FL-28-general",
                                    spine_issues=SPINE)
        self.assertIn("i-housing: Housing affordability", k)
        self.assertIn("i-jobs", k)

    def test_model_is_sonnet_default(self):
        self.assertEqual(agents.PROFILER.model, "claude-sonnet-5")

    def test_unknown_agent_config_raises(self):
        with self.assertRaises(KeyError):
            agents.get_config("orchestrator")  # deterministic, has no prompt

    def test_registry_has_all_three_agents(self):
        self.assertEqual(sorted(agents.CONFIGS), ["factchecker", "profiler", "record"])


class TestRecordConfig(unittest.TestCase):
    def test_verbatim_prompt_and_identity(self):
        cfg = agents.get_config("record")
        self.assertEqual(cfg.model, "claude-sonnet-5")
        s = cfg.render_system(candidate_id="cand1", race_id="FL-28-general", name="Jane")
        self.assertIn("You write to exactly ONE bucket: verifiable_fact", s)
        self.assertIn("You have NO web search and NO fetch_source", s)
        self.assertIn("candidate cand1 in race FL-28-general", s)
        self.assertNotIn("{{", s)

    def test_no_claim_inventory_required(self):
        k = agents.RECORD.kickoff(candidate_id="cand1", race_id="r1", spine_issues=SPINE)
        self.assertIn("issue_id where a documented action maps", k)
        self.assertNotIn("CLAIM INVENTORY", k)

    def test_record_never_gets_escalation_model(self):
        self.assertIsNone(agents.RECORD.escalation_model)


class TestFactCheckerConfig(unittest.TestCase):
    INVENTORY = [
        {"claim_id": "cl1", "bucket": "stated_position",
         "text": "I cut taxes for working families."},
        {"claim_id": "cl2", "bucket": "verifiable_fact",
         "text": "Voted NAY on SB 123 on 2025-03-04."},
    ]

    def test_verbatim_prompt_carries_the_load_bearing_rules(self):
        cfg = agents.get_config("factchecker")
        s = cfg.render_system(candidate_id="cand1", race_id="FL-28-general", name="Jane")
        self.assertIn("THE >=2 TIER-1 RULE", s)
        self.assertIn("You may NEVER write to\n   stated_position", s)
        self.assertIn("Route these to the outside_opinion bucket, unrated", s)
        for verdict in ("Accurate", "Mostly Accurate", "Mixed",
                        "Mostly Inaccurate", "Inaccurate", "Unverifiable"):
            self.assertIn(verdict, s)

    def test_escalation_model_available(self):
        self.assertEqual(agents.FACTCHECKER.model, "claude-sonnet-5")
        self.assertEqual(agents.FACTCHECKER.escalation_model, "claude-opus-4-8")

    def test_claim_inventory_is_required(self):
        with self.assertRaises(ValueError):
            agents.FACTCHECKER.kickoff(candidate_id="cand1", race_id="r1",
                                       spine_issues=SPINE)  # S2-R1

    def test_kickoff_lists_the_claim_inventory(self):
        k = agents.FACTCHECKER.kickoff(candidate_id="cand1", race_id="r1",
                                       spine_issues=SPINE,
                                       claim_inventory=self.INVENTORY)
        self.assertIn("CLAIM INVENTORY", k)
        self.assertIn("cl1 [stated_position] I cut taxes", k)
        self.assertIn("cl2 [verifiable_fact]", k)

    def test_empty_inventory_is_explicit_not_missing(self):
        k = agents.FACTCHECKER.kickoff(candidate_id="c", race_id="r",
                                       spine_issues=SPINE, claim_inventory=[])
        self.assertIn("(empty — nothing to adjudicate)", k)

    def test_expensive_session_gets_more_headroom(self):
        self.assertGreater(agents.FACTCHECKER.max_tool_calls, agents.PROFILER.max_tool_calls)
        self.assertGreater(agents.FACTCHECKER.max_wall_clock_s, agents.PROFILER.max_wall_clock_s)


class TestSpawnSpec(unittest.TestCase):
    def test_spawn_binds_identity_and_forwards_only_present_secrets(self):
        spec = session.s1_spawn_spec("profiler", {
            "CAP_LOG_SINK": "postgres", "SUPABASE_DB_URL": "postgresql://x",
            "FEC_API_KEY": "k"})
        self.assertEqual(spec["command"][-2:], ["-m", "cap_toollayer.server"])
        self.assertEqual(spec["env"]["CAP_AGENT_ID"], "profiler")
        self.assertEqual(spec["env"]["CAP_LOG_SINK"], "postgres")
        self.assertEqual(spec["env"]["SUPABASE_DB_URL"], "postgresql://x")
        self.assertNotIn("TWILIO_ACCOUNT_SID", spec["env"])  # absent -> not forwarded


class TestBudgetGuard(unittest.TestCase):
    def test_trips_on_tool_call_cap(self):
        b = session.BudgetGuard(max_tool_calls=2, max_wall_clock_s=1e9,
                                clock=MutableClock())
        b.before_tool_call(); b.before_tool_call()
        with self.assertRaises(session.BudgetExceeded) as c:
            b.before_tool_call()
        self.assertEqual(c.exception.rail, "max_tool_calls")

    def test_trips_on_wall_clock(self):
        clock = MutableClock()
        b = session.BudgetGuard(max_tool_calls=99, max_wall_clock_s=10, clock=clock)
        b.before_tool_call()
        clock.t = 11
        with self.assertRaises(session.BudgetExceeded) as c:
            b.before_tool_call()
        self.assertEqual(c.exception.rail, "max_wall_clock_s")


class TestSessionRunner(unittest.TestCase):
    def _run(self, script, *, config=None, log_count=1, clock=None, tmp=None):
        calls = []
        runner = session.SessionRunner(runs_dir=tmp, clock=clock or MutableClock())
        res = runner.run(
            config or agents.PROFILER,
            candidate_id="cand1", race_id="FL-28-general", name="Jane Doe",
            spine_issues=SPINE, dispatch=ok_dispatch(calls),
            log_counter=lambda: log_count, backend=session.ScriptedBackend(script))
        return res, calls

    def test_complete_session_writes_transcript_and_crosschecks_log(self):
        with tempfile.TemporaryDirectory() as tmp:
            res, calls = self._run(PROFILER_SCRIPT, log_count=1, tmp=tmp)
            self.assertEqual(res.status, "complete")
            self.assertEqual(res.claims_written, 1)   # from the log, not the report
            self.assertEqual(res.tool_calls, 3)
            self.assertEqual([t for t, _ in calls],
                             ["fetch_source", "source_register", "claim_write"])
            # transcript persisted under runs/<race>/<candidate>/<agent>/
            data = json.loads(Path(res.transcript_path).read_text())
            self.assertEqual(res.transcript_path.parts[-4:],
                             ("FL-28-general", "cand1", "profiler", "transcript.json"))
            self.assertEqual(data["status"], "complete")
            self.assertEqual(data["events"][0]["role"], "system")

    def test_budget_trip_marks_incomplete(self):
        cfg = agents.AgentConfig(agent_id="profiler", model="m",
                                 system_prompt="p", max_tool_calls=1)
        with tempfile.TemporaryDirectory() as tmp:
            res, _ = self._run(PROFILER_SCRIPT, config=cfg, tmp=tmp)
            self.assertEqual(res.status, "incomplete")
            self.assertIn("max_tool_calls", res.incomplete_reason)

    def test_halt_result_marks_halted(self):
        halt_script = [{"tool": "claim_write", "payload": {"bucket": "verifiable_fact"}},
                       {"report": "done"}]
        def halting_dispatch(tool, payload):
            return {"ok": False, "error": "pipeline_halted", "reasons": ["frozen"]}
        with tempfile.TemporaryDirectory() as tmp:
            runner = session.SessionRunner(runs_dir=tmp, clock=MutableClock())
            res = runner.run(agents.PROFILER, candidate_id="cand1",
                             race_id="FL-28-general", name="Jane",
                             spine_issues=SPINE, dispatch=halting_dispatch,
                             log_counter=lambda: 0,
                             backend=session.ScriptedBackend(halt_script))
            self.assertEqual(res.status, "halted")

    def test_no_report_is_incomplete(self):
        with tempfile.TemporaryDirectory() as tmp:
            res, _ = self._run(PROFILER_SCRIPT[:-1], tmp=tmp)  # drop the report step
            self.assertEqual(res.status, "incomplete")
            self.assertIn("without a completion report", res.incomplete_reason)


# --- mock Anthropic client (mimics the Messages API response shape) -------
class _Block:
    def __init__(self, type, text=None, id=None, name=None, input=None):
        self.type, self.text, self.id = type, text, id
        self.name, self.input = name, (input or {})


def _text(t):
    return _Block("text", text=t)


def _tool(id, name, inp):
    return _Block("tool_use", id=id, name=name, input=inp)


class _Usage:
    def __init__(self, i, o):
        self.input_tokens, self.output_tokens = i, o


class _Resp:
    def __init__(self, blocks, usage=None):
        self.content, self.usage = blocks, usage


class MockAnthropic:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []
        self.messages = self  # client.messages.create(...)

    def create(self, **kw):
        self.calls.append(kw)
        return self._responses.pop(0)


class TestLiveBackendLoop(unittest.TestCase):
    def _profiler_client(self):
        return MockAnthropic([
            _Resp([_tool("t1", "source_register",
                         {"url": "https://jane4congress.com", "type": "candidate_self"})],
                  _Usage(100, 50)),
            _Resp([_tool("t2", "claim_write", {"claim_id": "cl1", "bucket": "stated_position"})],
                  _Usage(80, 40)),
            _Resp([_text("Wrote 1 stated_position claim for cand1.")], _Usage(60, 20)),
        ])

    def test_tool_loop_executes_dispatch_and_reports(self):
        calls = []
        backend = session.LiveAnthropicBackend(
            model="claude-sonnet-5", tools=[], client=self._profiler_client())
        transcript = []
        res = backend.run(system="sys", kickoff="go",
                          dispatch=ok_dispatch(calls), transcript=transcript)
        self.assertEqual(res.final_report, "Wrote 1 stated_position claim for cand1.")
        self.assertEqual([t for t, _ in calls], ["source_register", "claim_write"])
        self.assertTrue(any(e.get("role") == "tool" and e["tool"] == "claim_write"
                            for e in transcript))

    def test_token_budget_trips(self):
        client = MockAnthropic([_Resp([_tool("t1", "db_read", {})], _Usage(5000, 5000))])
        backend = session.LiveAnthropicBackend(
            model="m", tools=[], client=client, max_tokens=1000)
        with self.assertRaises(session.BudgetExceeded) as c:
            backend.run(system="s", kickoff="k",
                        dispatch=lambda *a: {"ok": True}, transcript=[])
        self.assertEqual(c.exception.rail, "max_tokens")

    def test_halt_result_stops_loop(self):
        client = MockAnthropic([_Resp([_tool("t1", "claim_write",
                                             {"bucket": "verifiable_fact"})], _Usage(10, 10))])
        backend = session.LiveAnthropicBackend(model="m", tools=[], client=client)
        res = backend.run(system="s", kickoff="k",
                          dispatch=lambda *a: {"ok": False, "error": "pipeline_halted"},
                          transcript=[])
        self.assertTrue(res.halted)

    def test_no_client_and_no_sdk_is_not_configured(self):
        # `anthropic` isn't installed here -> honest gate, not a fake success
        backend = session.LiveAnthropicBackend(model="m", tools=[])
        with self.assertRaises(session.NotConfigured):
            backend.run(system="s", kickoff="k", dispatch=lambda *a: {}, transcript=[])

    def test_live_backend_drives_full_runner_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            runner = session.SessionRunner(runs_dir=tmp, clock=MutableClock())
            res = runner.run(
                agents.PROFILER, candidate_id="cand1", race_id="FL-28-general",
                name="Jane", spine_issues=SPINE, dispatch=ok_dispatch([]),
                log_counter=lambda: 1,
                backend=session.LiveAnthropicBackend(
                    model="claude-sonnet-5", tools=[], client=self._profiler_client()))
            self.assertEqual(res.status, "complete")
            self.assertEqual(res.claims_written, 1)
            self.assertEqual(res.tool_calls, 2)   # 2 dispatches, budget-counted


if __name__ == "__main__":
    unittest.main(verbosity=2)
