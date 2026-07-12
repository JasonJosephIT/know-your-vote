# Agent Brief — continuing the CAP runtime build (S2 → S3)

> Deliver this file to any coding-agent session that continues the runtime
> build. It is the loop protocol plus the context that isn't obvious from the
> code. The specs always govern; this brief only orients.
> **Last updated 2026-07-10.**

## 0. Where the build actually is

The pipeline's *decisions* were always done (148 tests across 7 pure cores).
The runtime around them is now mostly built too:

| Stage | State |
|---|---|
| **S1 — MCP tool layer** | ✅ **COMPLETE** (S1-01…S1-07), all twelve tools. Shipped as **PR #4** (`feat/cap-s1-tool-layer`). 100 stdlib tests. |
| **Live DB** | ✅ **Gate closed.** `0009` applied to live Supabase; `cap_tool_wrapper` has LOGIN + password; verified over the wire (INSERT `action_log` ✓, read-back denied, DELETE denied, PII denied). |
| **S2 — agent runtime** | 🟡 All three agent configs built + live-verified. **The MCP↔S1 client is the one missing piece.** 26 tests. `runtime/` is **uncommitted**. |
| **S3 — orchestrator** | ⬜ Not started. |

**126 tests green** (100 toollayer + 26 runtime), `--selfcheck` green, migration
regression green.

### What is proven, and how
- **T1–T3 against real endpoints** — the current FL DoE candidate file parses to
  exactly the 8 target races; FEC returns schema-valid payloads; FL Senate bill
  fetch works.
- **`cap_tool_wrapper` against live Postgres** — the whole grant model behaves.
- **All three agents against real `claude-sonnet-5` + the real guard cores** —
  Profiler wrote attributed `stated_position` claims; Record used only primary
  APIs (zero web tools), `verifiable_fact` / `attributed=false`; Fact-Checker
  split a statement, wrote `verdict='unverifiable'` under the ≥2-Tier-1 rule and
  `outside_opinion` with `verdict=null`.

## 1. The single next task

**Finish S2-01: build the MCP-stdio client.** Everything around it exists.

`runtime/cap_runtime/session.py` already has:
- `s1_spawn_spec(agent_id, env)` → command + env to launch S1 (identity fixed at
  spawn per ADR-R1; only present secrets forwarded);
- `LiveAnthropicBackend` → a **working, live-verified** Anthropic tool-use loop
  that takes an injectable `dispatch(tool, payload) -> dict` and a `tools` list.

So the client is the missing adapter:

1. `subprocess` the S1 server from `s1_spawn_spec`.
2. Speak MCP stdio: `initialize` → `tools/list` → `tools/call`.
3. Expose `tools` (S1 publishes real per-tool `inputSchema`, already narrowed to
   the identity — see `schemas.for_agent`) and a `dispatch` that calls
   `tools/call` and returns the parsed JSON result.
4. Feed both into `LiveAnthropicBackend`. Tear the subprocess down on exit.

Then run the S2-01 acceptance: **Profiler completes one demo-seed candidate**
(load `scripts/demo-seed*.sql` first). S2-02 / S2-03 acceptances are the same
run under the other two identities. Then S3 begins.

## 2. Read order (before touching code)

1. `../CAP_Runtime_PRD_v1.md` — the task list + per-task `~ Done` notes. **This
   is the file whose checkboxes you maintain.**
2. `../CAP_MCP_Tool_Spec_v1.md` §1–§2.5 — the twelve tools and the per-agent
   authorization matrix you are wiring, not re-deciding.
3. `README.md` (toollayer) and `../runtime/README.md` — what each module does.
4. The guard core for whatever you touch — read its docstring; the `_result()`
   shape (`ok/halt/guard_type/reasons/log`) is the contract your handler consumes.

Do NOT read the whole spec corpus up front; each task names what it needs.

## 3. The loop protocol

1. Open the PRD, find the **first unchecked task**. Dependency-ordered — never
   skip ahead, never reorder.
2. Read only that task's spec references.
3. Implement. Wire cores via `cap_toollayer.cores` path loaders — **never copy a
   core, never edit one** (a core change goes through its own build package +
   spec amendment first).
4. Run the task's **Verify** step. It must actually pass — no "should work."
   Baseline that must stay green after every task:
   ```
   python3 toollayer/test_toollayer_skeleton.py        # 100
   (cd toollayer && python3 -m cap_toollayer.server --selfcheck)
   python3 runtime/test_runtime.py                     # 26
   node ../scripts/verify-migrations.mjs               # if you touched SQL
   ```
5. Mark the task `- [x]`, append a one-line `~ Done <date>: <what/how verified>`
   note, and update the PRD's `**Build status:**` line.
6. Commit per task or small task-group. Never commit secrets.

## 4. House rules (non-negotiable, learned the hard way)

- **ADR-R1 is load-bearing.** Identity binds at S1 process spawn via
  `CAP_AGENT_ID`. No tool, handler, or test accepts an `agent_id` from the
  caller side. **Never turn S1 into a shared service with identity as a
  parameter** — the ADR explicitly rejected that as model-forgeable; it would
  make every guard decorative. A different identity means a different process.
- **Guards run before side effects; the log row is written before the result
  returns; a failed log write fails the call.** Enforced in `middleware.py`.
  Content writes commit atomically with their log row (shared connection).
  Extend these, never route around them.
- **Live DDL:** the founder applied `0009` and authorized connector use. Still —
  never run schema changes casually, and never invent schema.
- **Degrade honestly.** Missing env var, unbuilt dependency, unreachable API →
  a structured `not_configured` / `not_implemented` / `upstream_failed` naming
  the missing thing. Never a silent success, never a stub that pretends.
- **No secrets in tool results, errors, logs, or agent context — ever.** Only
  the exception *type* is surfaced, never its message or the DSN.
- **Prompts are not the enforcement mechanism.** The Agent Plan prompts are
  pasted **verbatim** into `runtime/cap_runtime/agents.py`. To change one,
  amend the Agent Plan first, then re-sync.
- **Fail closed.** Empty allowlist scope, unknown config value, unknown named
  query → refuse, don't permit.

## 5. Environment facts (so you don't rediscover them the hard way)

- **The work lives in worktree `kyv-visual-roadmap-25857f`, branch
  `feat/cap-s1-tool-layer`.** `runtime/` is untracked — it belongs to the future
  S2 PR (the PRD wants S1 and S2+S3 as separate PRs).
- **Python is a minefield on this Mac (Apple M3, arm64):**
  - default `python3` is **3.11.0a3, an alpha** → breaks `psycopg`
    (`typing.LiteralString` doesn't exist yet).
  - `/usr/bin/python3` is 3.9.6 → too old for `mcp` (needs ≥3.10).
  - Homebrew is the **Intel** install at `/usr/local`; its `python@3.12` is
    x86_64, and `cryptography` ships **arm64-only macOS wheels**, so any Intel
    interpreter triggers a Rust source build that fails.
  - **Correct setup:**
    `uv venv --python-preference only-managed --python 3.12 .venv`
    then verify `python -c "import platform;print(platform.machine())"` → `arm64`.
  - The **test suites run fine on the alpha** (stdlib only). Only the live
    server (`mcp` + `psycopg`) needs the arm64 3.12 venv.
- `mcp` drags `pyjwt[crypto]` → `cryptography` (~42 packages) for HTTP/OAuth
  transports we never use (we are stdio-only). Unused at runtime; harmless once
  the wheel installs.
- Secrets live in the **worktree-root `.env.local`** (git-ignored via `.env*`):
  `FEC_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_DB_URL` (password is a
  placeholder — fill it). **All three were pasted into a chat transcript:
  rotate them.**
- The orchestrator folder name contains a literal ` : ` — always go through
  `cores.py`, never hand-build paths.
- Guard cores emit `guard_type`, but `action_log` has no such column (Logging
  Schema §2 governs), so the middleware folds it into `failure_reason` as a
  `[guard_type] ` prefix. Keep that convention.

## 6. The probe technique — use it, it's cheap and it works

Before wiring anything to the real MCP surface, you can test an agent's actual
behaviour for a few cents:

> **real Claude + the real guard cores + a stubbed `dispatch`.**

The guard cores are pure functions and import fine on `/usr/bin/python3` 3.9.6
(where `anthropic` 0.116 is already installed). `LiveAnthropicBackend` takes an
injectable `dispatch`, so no `mcp`, no DB, and no live server are required.

This is how the three agents were verified — and how a real defect was caught:
S1 was publishing **no per-tool MCP input schema**, so a live Fact-Checker
burned **17 of its 26 tool calls** inventing `type` values (`primary_gov`,
`wiki`, `tier1`, …) and `lean_tag='neutral'`, and never wrote a claim. Fixed by
`cap_toollayer/schemas.py` + `schemas.for_agent()`. Re-probed: **0 rejections.**

The lesson generalises: **an agent will guess whatever you don't tell it.**

## 7. Founder gates — park, don't block

| Gate | Blocks | Status |
|---|---|---|
| Apply `0009` + role LOGIN | S1 live runs | ✅ done |
| Anthropic API budget + key | S2 sessions | ✅ done (key in `.env.local`) |
| Allowlist B v1 tier list | S1-05 | ✅ resolved — use the core's §2.5 B list |
| Load `scripts/demo-seed*.sql` | S2-01 acceptance | ⬜ pending |
| Fill `SUPABASE_DB_URL` password | any live DB run | ⬜ pending |
| arm64 Python 3.12 venv | running S1 (`mcp` + `psycopg`) | ⬜ pending |
| Twilio creds | a real T12 send | optional — `not_configured` until set |
| Pick the first real race | S3-03 acceptance | ⬜ founder decision |
| Rotate FEC + Anthropic keys, DB password | hygiene | ⬜ pending |

## 8. Definition of done (whole build)

One command runs one race end to end — intake → 3 agents × N candidates →
balance audit → human gate → publication decision — with every invariant
enforced by code, every action logged, and the Logging-Schema §4 queries
(scrutiny / block rate / traceability) returning sane numbers. A HALT provably
stops composition and dispatch. Zero secrets in any agent context.

---

### Paste-ready session prompt

> "We're continuing the CAP pipeline runtime build. Read
> `Civic Awareness (Know Your Vote)/toollayer/AGENT_BRIEF.md` and follow its
> loop protocol: find the first unchecked task in
> `Civic Awareness (Know Your Vote)/CAP_Runtime_PRD_v1.md`, read only that
> task's references, implement, run its Verify step until it actually passes,
> mark it `[x]` with a `~ Done` note, update the Build status line, and
> continue. S1 is complete and the live-DB gate is closed; the next task is
> finishing S2-01 by building the MCP-stdio client. Stop at founder gates and
> record them; keep the 126 tests and `--selfcheck` green after every task."
