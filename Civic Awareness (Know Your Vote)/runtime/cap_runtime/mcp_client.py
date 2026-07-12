"""S2-01 — the MCP-stdio client that connects the S2 agent loop to the real S1.

`LiveAnthropicBackend` (session.py) drives the Anthropic tool-use loop against a
`tools` list and a synchronous `dispatch`. This module supplies both by talking
to the S1 tool-layer server (`cap_toollayer.server:serve`) over MCP stdio:

  * `S1StdioClient` spawns one S1 subprocess for one identity (ADR-R1 — identity
    binds at spawn, never per call), runs the `initialize` -> `tools/list`
    handshake, exposes the tools already translated to Anthropic schema in
    `.tools`, and routes each `dispatch(tool, payload)` to `tools/call`.
  * `to_anthropic_tools` / `unwrap_tool_result` are pure helpers (no third-party
    imports) that carry the test coverage.

The `mcp` API is async and the session must stay open across many calls, while
`dispatch` is called synchronously by the loop. So the async session lives on a
dedicated background thread with its own event loop, and every call is marshalled
across with `asyncio.run_coroutine_threadsafe`. This bridge is the *only* extra
machinery here — open / call / close, nothing more.

Degrade honestly (never a stub that pretends to work): missing `mcp` raises
`session.NotConfigured`; a malformed/`isError` tool result becomes a structured
error dict. No secret ever reaches a result/error — we surface an exception's
*type*, never its message, and never echo env/DSN/tool text.

Testability: the real `mcp` stack is reachable only through an injectable async
**session factory** (a callable returning an async context manager that yields an
object with async `initialize()` / `list_tools()` / `call_tool()`). Tests inject a
fake and never import `mcp`. The real factory (below) is best-effort-correct and
is exercised only at the PARKED, founder-gated live run (see runtime/README.md).
"""

from __future__ import annotations

import asyncio
import json
import threading
from contextlib import asynccontextmanager
from typing import Any, Callable, Mapping, Sequence

from . import session as _session

# One place for the honest "mcp is missing" message, mirroring how
# LiveAnthropicBackend gates on `anthropic` and server.serve() gates on `mcp`.
_MCP_MISSING = ("the `mcp` package is not installed (needs a stable Python "
                ">=3.11): pip install mcp")

# Margin by which connect()'s outer ready-wait is made STRICTLY longer than the
# inner handshake timeout (_serve_session bounds `_handshake` with
# `_connect_timeout`). This one ordering invariant — outer ready-wait > inner
# handshake timeout — makes the inner timeout the *single source of truth* for a
# handshake timeout: it always resolves `_ready` (with success, or an in-task
# `asyncio.TimeoutError`) before this outer backstop could fire, so connect()
# deterministically surfaces the intended handshake error instead of a racing,
# bare `concurrent.futures.TimeoutError`. Because `Future.result(timeout=...)`
# returns the instant `_ready` resolves, the happy and handshake-timeout paths
# stay fast (~`_connect_timeout`); this backstop only ever caps a background
# thread that is genuinely wedged (one that never resolves `_ready` at all).
_CONNECT_BACKSTOP_S = 5.0


# -- pure helpers (no third-party imports) ---------------------------------

def to_anthropic_tools(mcp_tools: Sequence[Any]) -> list[dict]:
    """Translate MCP `types.Tool` objects (`.name`, `.description`,
    `.inputSchema`) to the Anthropic tool shape (`input_schema`), ready to hand
    straight to `LiveAnthropicBackend(model=..., tools=client.tools)`."""
    return [
        {
            "name": t.name,
            "description": getattr(t, "description", None),
            "input_schema": getattr(t, "inputSchema", None),
        }
        for t in mcp_tools
    ]


def unwrap_tool_result(result: Any) -> dict:
    """Parse an MCP `tools/call` result into the dict the agent loop expects.

    S1 returns exactly one text block whose text is `json.dumps(tool_result)`.
    Every failure mode (an `isError` result, empty content, a non-text first
    block, non-string or non-JSON text, or a JSON value that isn't an object)
    degrades to a structured error dict. Per the no-secrets house rule we never
    put the raw text, an exception message, or env/DSN into the returned dict —
    only a coarse reason, so a leaked DSN in tool output can't ride out here."""
    if getattr(result, "isError", False):
        return {"error": "tool_error", "reason": "s1_returned_mcp_error"}

    content = getattr(result, "content", None)
    if not content:
        return {"error": "malformed_tool_result", "reason": "empty_content"}

    block = content[0]
    if getattr(block, "type", None) != "text":
        return {"error": "malformed_tool_result", "reason": "non_text_block"}

    text = getattr(block, "text", None)
    if not isinstance(text, str):
        return {"error": "malformed_tool_result", "reason": "no_text"}

    try:
        parsed = json.loads(text)
    except ValueError:  # invalid JSON — do NOT echo `text` (may carry a secret)
        return {"error": "malformed_tool_result", "reason": "invalid_json"}

    if not isinstance(parsed, dict):
        return {"error": "malformed_tool_result", "reason": "not_an_object"}
    return parsed


# -- the adapter -----------------------------------------------------------

SessionFactory = Callable[[], Any]  # () -> async context manager yielding a session


class S1StdioClient:
    """One instance == one S1 subprocess == one identity (ADR-R1).

    Use as a context manager:

        spec = session.s1_spawn_spec(agent_id, env)
        with S1StdioClient.from_spawn_spec(spec, cwd=TOOLLAYER_DIR) as s1:
            backend = LiveAnthropicBackend(model=..., tools=s1.tools)
            runner.run(..., dispatch=s1.dispatch, backend=backend)

    `dispatch` is the synchronous callable the loop wants; internally it hops to
    the background event loop, awaits `tools/call`, and unwraps the result.
    """

    def __init__(
        self,
        *,
        command: Sequence[str],
        env: Mapping[str, str],
        cwd: str,
        session_factory: SessionFactory | None = None,
        connect_timeout: float = 30.0,
        call_timeout: float = 60.0,
        close_timeout: float = 15.0,
    ):
        self._command = list(command)
        self._env = dict(env)
        self._cwd = str(cwd)
        self._session_factory = session_factory
        self._connect_timeout = connect_timeout
        self._call_timeout = call_timeout
        self._close_timeout = close_timeout

        self.tools: list[dict] = []
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._session: Any = None
        self._shutdown: asyncio.Event | None = None
        self._ready: Any = None          # concurrent.futures.Future
        self._serve_future: Any = None   # concurrent.futures.Future for _serve_session

    # -- construction from the spawn spec ----------------------------------

    @classmethod
    def from_spawn_spec(cls, spec: Mapping[str, Any], *, cwd: str, **kw) -> "S1StdioClient":
        """Build a client from `session.s1_spawn_spec(...)` output (`command`,
        `env`), supplying the toollayer dir as the subprocess `cwd` so
        `cap_toollayer.server` is importable (the spec deliberately carries no cwd)."""
        return cls(command=spec["command"], env=spec.get("env", {}), cwd=cwd, **kw)

    # -- context manager ---------------------------------------------------

    def __enter__(self) -> "S1StdioClient":
        self.connect()
        return self

    def __exit__(self, *exc) -> bool:
        self.close()
        return False

    # -- connect / call / close -------------------------------------------

    def connect(self) -> "S1StdioClient":
        """Spawn S1, run the MCP handshake, and populate `self.tools`. Raises
        `session.NotConfigured` if `mcp` is missing and no factory was injected."""
        import concurrent.futures  # stdlib; kept local to the connect path

        # Resolve the factory. The default one lazily imports `mcp` and raises
        # NotConfigured before any thread is started (nothing to reap on failure).
        factory = self._session_factory or self._build_default_factory()

        self._ready = concurrent.futures.Future()
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(
            target=self._loop.run_forever, name="s1-mcp-loop", daemon=True)
        self._thread.start()

        self._serve_future = asyncio.run_coroutine_threadsafe(
            self._serve_session(factory), self._loop)
        try:
            # Invariant: this outer ready-wait > the inner handshake timeout
            # (_serve_session bounds `_handshake` with `_connect_timeout`), so the
            # inner `asyncio.wait_for` deterministically resolves `_ready` first —
            # it, not a racing outer timer, is the single source of the
            # handshake-timeout truth. `Future.result` returns the instant `_ready`
            # resolves, so this stays fast; the backstop margin only caps a truly
            # wedged background thread that never resolves `_ready`.
            self._ready.result(timeout=self._connect_timeout + _CONNECT_BACKSTOP_S)
        except BaseException:
            self.close()   # tear the half-open bridge down, then surface the cause
            raise
        return self

    def dispatch(self, tool: str, payload: Mapping[str, Any]) -> dict:
        """Synchronous seam for the agent loop: run `tools/call` on the session
        thread and return the parsed dict. Any transport/timeout failure degrades
        to a structured error (type only, never a message) — never an exception
        into the loop, never a silent success."""
        loop, sess = self._loop, self._session
        if loop is None or sess is None:
            return {"error": "not_connected", "reason": "s1_session_unavailable"}
        fut = asyncio.run_coroutine_threadsafe(
            sess.call_tool(tool, dict(payload)), loop)
        try:
            result = fut.result(timeout=self._call_timeout)
        except BaseException as exc:            # incl. concurrent.futures.TimeoutError
            fut.cancel()
            return {"error": "tool_dispatch_failed", "type": type(exc).__name__}
        return unwrap_tool_result(result)

    def close(self) -> None:
        """Signal the session coroutine to exit its context managers (reaping the
        S1 subprocess *in the task that opened it*), stop the loop, and join the
        thread. Safe to call more than once and even if connect never completed."""
        loop = self._loop
        if loop is None:
            return
        self._loop = None  # idempotent: a second close() short-circuits above

        if not loop.is_closed():
            loop.call_soon_threadsafe(self._signal_shutdown)
        # Wait for _serve_session to return == both async CMs fully exited.
        if self._serve_future is not None:
            try:
                self._serve_future.result(timeout=self._close_timeout)
            except BaseException:
                pass
        if not loop.is_closed():
            loop.call_soon_threadsafe(loop.stop)
        if self._thread is not None:
            self._thread.join(timeout=self._close_timeout)
        try:
            loop.close()
        except BaseException:
            pass
        self._session = None

    # -- internals ---------------------------------------------------------

    def _signal_shutdown(self) -> None:
        # Runs on the loop thread (scheduled via call_soon_threadsafe).
        if self._shutdown is not None:
            self._shutdown.set()

    async def _serve_session(self, factory: SessionFactory) -> None:
        """Own the whole session lifecycle in ONE task: enter the async CMs, run
        the handshake, then hold them open until close() sets the shutdown event.
        Entering and exiting the `mcp` context managers in the same task is
        required by their anyio cancel scopes; tool calls arrive from other tasks
        on this loop, which is safe.

        The handshake is bounded by `asyncio.wait_for(..., self._connect_timeout)`
        so a hung real `initialize()`/`list_tools()` raises IN THIS TASK rather
        than parking it forever: the `async with factory()` block then exits
        normally, reaping the S1 subprocess, instead of being abandoned
        mid-handshake where close() has nothing to unwedge and the child is
        orphaned. This inner bound is *authoritative*: connect()'s outer
        ready-wait is deliberately longer (`_connect_timeout + _CONNECT_BACKSTOP_S`),
        so this timeout — not a racing outer `concurrent.futures.TimeoutError` —
        is the single source of the handshake-timeout truth (see
        `_CONNECT_BACKSTOP_S`)."""
        self._shutdown = asyncio.Event()
        try:
            async with factory() as sess:
                listed = await asyncio.wait_for(
                    self._handshake(sess), timeout=self._connect_timeout)
                self._session = sess
                self.tools = to_anthropic_tools(_tools_of(listed))
                if not self._ready.done():
                    self._ready.set_result(None)
                await self._shutdown.wait()   # stay open across dispatch() calls
        except BaseException as exc:
            # Before the handshake completed -> report the cause to connect().
            # After it (a teardown-phase error) -> swallow; close() is best-effort.
            if self._ready is not None and not self._ready.done():
                self._ready.set_exception(exc)
        finally:
            self._session = None

    @staticmethod
    async def _handshake(sess: Any) -> Any:
        """`initialize` -> `list_tools`, factored out so `_serve_session` can
        bound it with `asyncio.wait_for`. On timeout, `wait_for` cancels this
        coroutine in-task and raises `asyncio.TimeoutError` — an honest,
        non-secret failure (no env/DSN/exception text) that propagates to
        `connect()` via the `_ready` future."""
        await sess.initialize()
        return await sess.list_tools()

    def _build_default_factory(self) -> SessionFactory:
        """The real path: lazily import `mcp` (NotConfigured if absent) and return
        a factory that opens the stdio transport + ClientSession bound to the S1
        subprocess. Best-effort-correct; only truly exercised at the parked live
        run — every other path is covered through an injected factory."""
        try:
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client
        except ImportError as err:
            raise _session.NotConfigured(_MCP_MISSING) from err

        command, args = self._command[0], self._command[1:]
        # Give the child both a cwd and a PYTHONPATH at the toollayer dir: the
        # stdio child gets only an allow-listed env, so cwd alone may not put
        # `cap_toollayer` on the path.
        child_env = dict(self._env)
        child_env.setdefault("PYTHONPATH", self._cwd)

        def _make_params():
            try:
                return StdioServerParameters(
                    command=command, args=list(args), env=child_env, cwd=self._cwd)
            except (TypeError, ValueError):
                # Older `mcp` without a `cwd` field — PYTHONPATH still carries it.
                return StdioServerParameters(
                    command=command, args=list(args), env=child_env)

        @asynccontextmanager
        async def factory():
            async with stdio_client(_make_params()) as (read, write):
                async with ClientSession(read, write) as sess:
                    yield sess

        return factory


def _tools_of(listed: Any) -> Sequence[Any]:
    """`ClientSession.list_tools()` returns a result object with `.tools`; accept
    a bare sequence too so the injected seam can stay minimal."""
    tools = getattr(listed, "tools", None)
    return listed if tools is None else tools
