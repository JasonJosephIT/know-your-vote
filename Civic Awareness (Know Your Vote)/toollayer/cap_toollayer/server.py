"""S1 entrypoint.

Two modes:
  * MCP server (default): exposes the eleven callable tools (T11 log_action
    is wrapper-internal) over stdio via the MCP Python SDK. Requires `mcp`
    installed and CAP_AGENT_ID + CAP_LOG_SINK set.
  * --selfcheck: no SDK, no network — constructs the full stack under every
    identity and proves the S1-02 verify conditions: server boots per
    identity, an ungranted tool returns denied_tool, and the refusal is
    logged. Exit 0 = green.

Run:  python -m cap_toollayer.server --selfcheck
      CAP_AGENT_ID=profiler CAP_LOG_SINK=jsonl:runs/dev.jsonl \
          python -m cap_toollayer.server
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

from . import (
    cores, discovery, errors, handlers, identity, intake, logsink, middleware,
    store, synthesis,
)

# The externally callable surface: T1-T12 minus T11.
CALLABLE_TOOLS: tuple[str, ...] = tuple(sorted(
    middleware.ALL_TOOLS - {"log_action"}
))

# A tool each identity is NOT granted, per Tool Spec §2 — used by selfcheck.
UNGRANTED_PROBE: dict[str, str] = {
    "profiler": "fec_api_query",
    "record": "web_search",
    "factchecker": "balance_audit",
    "orchestrator": "claim_write",
}


def build_sink(env: dict | None = None):
    """The log destination. In postgres mode it is a `Store` — which is both
    the action_log sink AND the content plane (T7/T8/T9), sharing one
    cap_tool_wrapper connection so writes and their log rows commit together.
    Dev/test stays on the explicit jsonl sink (no content DB, no data tools)."""
    env = os.environ if env is None else env
    raw = (env.get(logsink.ENV_VAR) or "").strip()
    if raw == "postgres":
        dsn = env.get("SUPABASE_DB_URL")
        if not dsn:
            raise logsink.LogConfigError(
                "CAP_LOG_SINK=postgres but SUPABASE_DB_URL is not set."
            )
        return store.Store(dsn)
    return logsink.make_sink(env)


def build_layer(agent_id: str, sink) -> middleware.ToolLayer:
    guard = cores.load_guard_core(agent_id)
    layer = middleware.ToolLayer(agent_id, guard, sink)
    # T7/T8/T9 are live only with a content DB (a Store) and only for the
    # three data agents; otherwise those tools stay honestly not-implemented.
    if isinstance(sink, store.Store) and agent_id in handlers.DATA_AGENTS:
        layer.handlers.update(handlers.build_data_handlers(agent_id, guard, sink))
    # T5/T6 discovery for the profiler (Allowlist A) and factchecker
    # (Allowlist B). record has no discovery grant (denied upstream).
    if isinstance(sink, store.Store) and agent_id in discovery.DISCOVERY_AGENTS:
        layer.handlers.update(discovery.build_discovery_handlers(agent_id, sink))
    # T1–T4 intake / primary APIs for record, factchecker, orchestrator. Each
    # tool is still gated per-agent by check_tool_access (e.g. only record &
    # factchecker are granted the FEC/FL reads; jurisdiction_resolve is the
    # orchestrator's) — over-installing is safe, the guard is the authority.
    if isinstance(sink, store.Store) and agent_id in intake.INTAKE_AGENTS:
        layer.handlers.update(intake.build_intake_handlers(agent_id, sink))
    # T10 balance_audit + T12 sms_dispatch — orchestrator only. sms_dispatch
    # is additionally token-gated (S3 mints CAP_DISPATCH_TOKEN at the human
    # gate; unset -> dispatch stays disarmed) and state-gated by S3.
    if isinstance(sink, store.Store) and agent_id in synthesis.SYNTHESIS_AGENTS:
        layer.handlers.update(synthesis.build_synthesis_handlers(
            agent_id, sink, approval_token=os.environ.get("CAP_DISPATCH_TOKEN")))
    return layer


def selfcheck() -> int:
    failures = 0

    def check(name: str, cond: bool, detail: str = "") -> None:
        nonlocal failures
        if cond:
            print(f"  ok  {name}")
        else:
            failures += 1
            print(f"FAIL  {name}  {detail}")

    with tempfile.TemporaryDirectory() as tmp:
        for agent_id in sorted(identity.VALID_IDENTITIES):
            log_path = Path(tmp) / f"{agent_id}.jsonl"
            layer = build_layer(agent_id, logsink.JsonlSink(log_path))
            check(f"[{agent_id}] layer constructs with canonical guard core", True)

            probe = UNGRANTED_PROBE[agent_id]
            result = layer.dispatch(probe, {"race_id": "r-selfcheck"})
            check(
                f"[{agent_id}] ungranted tool '{probe}' -> denied_tool",
                result.get("error") == errors.DENIED_TOOL,
                f"got {result}",
            )

            t11 = layer.dispatch("log_action", {})
            check(
                f"[{agent_id}] log_action (T11) is never callable",
                t11.get("error") == errors.DENIED_TOOL,
                f"got {t11}",
            )

            rows = [json.loads(l) for l in log_path.read_text().splitlines()]
            check(
                f"[{agent_id}] both refusals were logged before returning",
                len(rows) == 2
                and all(r["status"] == "fail" and r["guard_triggered"] for r in rows)
                and rows[0]["agent_id"] == agent_id
                and rows[0]["tool_called"] == probe,
                f"rows={rows}",
            )

    # identity fail-closed paths
    try:
        identity.resolve_identity({})
        check("empty env refuses to resolve an identity", False)
    except identity.IdentityError:
        check("empty env refuses to resolve an identity", True)
    try:
        identity.resolve_identity({"CAP_AGENT_ID": "R1"})
        check("unknown identity is refused", False)
    except identity.IdentityError:
        check("unknown identity is refused", True)

    # logging is not optional
    try:
        logsink.make_sink({})
        check("missing CAP_LOG_SINK refuses to start", False)
    except logsink.LogConfigError:
        check("missing CAP_LOG_SINK refuses to start", True)

    print("\nselfcheck " + ("FAILED" if failures else "passed"))
    return 1 if failures else 0


def serve() -> int:
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        print(
            "The `mcp` package is not installed — the stdio server cannot "
            "start. Install with: pip install mcp\n"
            "(--selfcheck runs without it.)",
            file=sys.stderr,
        )
        return 2

    agent_id = identity.resolve_identity()
    sink = build_sink()
    layer = build_layer(agent_id, sink)

    app = FastMCP(f"cap-toollayer[{agent_id}]")
    for tool_name in CALLABLE_TOOLS:
        def make(tool: str):
            def call(payload: dict | None = None) -> dict:
                return layer.dispatch(tool, payload or {})
            call.__name__ = tool
            call.__doc__ = f"CAP tool {tool} (guarded; identity={agent_id})"
            return call
        app.tool(name=tool_name)(make(tool_name))

    app.run()  # stdio transport
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if "--selfcheck" in argv:
        return selfcheck()
    return serve()


if __name__ == "__main__":
    raise SystemExit(main())
