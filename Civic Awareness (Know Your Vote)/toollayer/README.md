# S1 — MCP Tool-Layer Service (skeleton)

Build package for the S1 runtime (CAP_Runtime_PRD_v1 §5). Canonical specs
live in the project root (`CAP_MCP_Tool_Spec_v1.md`, `CAP_Logging_Schema_v1.md`,
`CAP_Runtime_PRD_v1.md`) — where anything here disagrees, the documents govern.

**Coding agents: start with [`AGENT_BRIEF.md`](AGENT_BRIEF.md)** — it has the
task-loop protocol, house rules, environment gotchas, and the paste-ready
session prompt for continuing the build.

## What exists (S1 complete — S1-07)

| File | Purpose |
|---|---|
| `cap_toollayer/identity.py` | ADR-R1: identity from `CAP_AGENT_ID` at process spawn — never a tool parameter. Fail-closed. |
| `cap_toollayer/cores.py` | Path-loads the canonical guard/allowlist/audit cores from their build folders. Nothing is copied. |
| `cap_toollayer/errors.py` | The error taxonomy: `denied_tool` / `allowlist` / `bucket` / `pipeline_halted` / `not_configured` / `not_implemented` / `upstream_failed`. |
| `cap_toollayer/logsink.py` | Log destinations. `jsonl:<path>` (dev, explicit); `postgres` → `PostgresSink` (S1-03): one INSERT/call into `action_log` as `cap_tool_wrapper`, fail-closed, no secrets in errors, driver+connection injectable for tests. No default sink — logging is not optional. |
| `cap_toollayer/store.py` | S1-04: `Store` **is** a `PostgresSink` (shares one cap_tool_wrapper connection). Content-plane I/O for T7/T8/T9 — source dedupe on canonical `url_norm`, a fixed named-query catalog for `db_read`, transactional `claim_write`. Content writes stay uncommitted so the post-handler log write commits content+log **atomically**. |
| `cap_toollayer/handlers.py` | S1-04: the T7/T8/T9 handlers — run the caller's guard, then touch the DB only on a pass. Guard rejects/halts flow back through `dispatch()`; DB errors degrade to a logged `upstream_failed`. |
| `cap_toollayer/discovery.py` | S1-05: T5 web_search + T6 fetch_source. Per-caller allowlist gate before any I/O — profiler → Allowlist A (per-candidate, live scope, injectable PSL); factchecker → Allowlist B (tier-tagged). No redirects, shorteners blocked, scripts stripped, disk cache. Fetch/search backends injectable; degrade honestly (`not_configured`/`upstream_failed`). |
| `cap_toollayer/intake.py` | S1-06: T1 doe_file_intake (FL DoE `extractCanList.asp` → tab-separated parse → target-race filter → idempotent upsert, PII dropped), T2 fec_api_query (named FEC endpoint catalog + 429 backoff), T3 fl_legislature_query (flsenate.gov bill URLs, cached), T4 jurisdiction_resolve (`zip_district`). HTTP client injectable; fail-closed parsers (R1). T1–T3 live-verified 2026-07-10. |
| `cap_toollayer/synthesis.py` | S1-07: T10 balance_audit (orchestrator; reads Profiles → `balance_audit_core` four-metric split → writes `balance_check_passed`; a HALT logs `guard_triggered` and freezes further writes) + T12 sms_dispatch (fail-closed approval-token gate `CAP_DISPATCH_TOKEN`, owner-phone-only, `not_configured` without Twilio). |
| `cap_toollayer/middleware.py` | The dispatch order every call goes through: T11 lockout → grant check → halt check → handler → log **before** return. A failed log write fails the call. |
| `cap_toollayer/schemas.py` | The MCP input schemas. `TOOL_SCHEMAS` describes all 11 callable tools; `for_agent()` narrows the surface to **one identity** (ADR-R1) — only its granted tools, with `type`/`bucket`/`verdict`/`lean_tag` enums read from that agent's own guard core. Found the hard way: with no schema a live agent burned 17/26 tool calls guessing enum values. |
| `cap_toollayer/server.py` | Entrypoint: MCP stdio server (low-level `Server`, so real per-tool `inputSchema` is published; needs `pip install mcp`) or `--selfcheck` (no dependencies, and it fails if any identity advertises an ungranted tool). Postgres mode builds a `Store` and installs the data handlers. |
| `test_toollayer_skeleton.py` | 86 stdlib tests across the whole layer: identity fail-closed, T11 lockout, log-failure-fails-call, halt freezes writes; `PostgresSink`; data tools (guard parity, dedupe, named-query fail-closed, claim atomicity); discovery (Allowlist A/B, PSL, cache, off-list drop); intake (DoE parse/PII-drop/idempotency, FEC catalog+backoff, FL bill fetch, jurisdiction); synthesis (balance HALT + guard log + write-freeze, token-gated + owner-only dispatch). |

## Run

```
# tests (stdlib only)
python3 test_toollayer_skeleton.py

# selfcheck: boots under all four identities, proves S1-02's verify conditions
python3 -m cap_toollayer.server --selfcheck

# dev server (after: pip install mcp)
CAP_AGENT_ID=profiler CAP_LOG_SINK=jsonl:runs/dev.jsonl \
    python3 -m cap_toollayer.server
```

## Next (S2 — separate PR)

S1 is complete. S2 (agent runtime — `runtime/`, three Claude agent configs +
a session runner) is the next phase and needs the founder Anthropic-budget
gate. See `../CAP_Runtime_PRD_v1.md` §6.

Schema note: the guard cores emit `guard_type`; the `action_log` DDL has no
such column (Logging Schema §2 governs), so the middleware folds it into
`failure_reason` as a `[guard_type] ` prefix.
