# Agent Brief — building S1 (and later S2/S3) from this skeleton

> Deliver this file alongside `toollayer/` to any coding-agent session that
> continues the runtime build. It is the loop protocol + the context that
> isn't obvious from the code. The specs always govern; this brief only
> orients.

## 0. The one-paragraph situation

The CAP pipeline's *decisions* are done and tested (148 tests across 7 pure
cores: guards, allowlists, balance audit, orchestrator state machine). What
you are building is the *runtime* around them, specified in
`../CAP_Runtime_PRD_v1.md` as tasks S1-01…S3-04. S1-01 (migration 0009) and
S1-02 (this skeleton) are done. You continue from the first unchecked task.
Nothing you build ever makes a content decision — if you find yourself
writing logic that decides what's allowed, stop: that logic belongs in a
core, and the cores are already written.

## 1. Read order (before touching code)

1. `../CAP_Runtime_PRD_v1.md` — your task list, requirements (S1-R1…R6,
   S2-R1…R4, S3-R1…R5), and ADR-R1. This is the file whose checkboxes you
   maintain.
2. `../CAP_MCP_Tool_Spec_v1.md` §1–§2.5 — the twelve tools and the per-agent
   authorization matrix you are wiring, not re-deciding.
3. `../CAP_Logging_Schema_v1.md` — the action_log contract; §4's three
   queries are what the log must be able to answer.
4. `README.md` (this folder) — what each skeleton module does.
5. The guard core for whatever you're wiring (e.g.
   `../Agents/The Profiler/profiler_guard_core.py`) — read its docstring;
   the `_result()` shape (`ok/halt/guard_type/reasons/log`) is the contract
   your handler consumes.

Do NOT read the whole spec corpus up front; each task names what it needs.

## 2. The loop protocol

Repeat until the phase you were asked to build is done:

1. Open `../CAP_Runtime_PRD_v1.md`, find the **first unchecked task**. Tasks
   are dependency-ordered — never skip ahead, never reorder.
2. Read only that task's spec references.
3. Implement inside `toollayer/` (S1), `../runtime/` (S2), or
   `../orchestrator/` (S3). Wire cores via `cap_toollayer.cores` path
   loaders — never copy a core, never edit one (a core change goes through
   its own build package + spec amendment first).
4. Run the task's **Verify** step. It must actually pass — no "should work".
   Baseline that must stay green after every task:
   ```
   python3 test_toollayer_skeleton.py
   python3 -m cap_toollayer.server --selfcheck
   node ../../scripts/verify-migrations.mjs        # if you touched SQL
   ```
5. Mark the task `- [x]`, append a one-line `~ Done <date>: <what/how verified>`
   note (house style — see S1-01/S1-02 for the pattern), and update the
   PRD's `**Build status:**` line.
6. Commit per task or per small task-group on the current branch. Never
   commit secrets; `.env.local` is out of bounds for git.

## 3. House rules (non-negotiable, learned the hard way)

- **Never run DDL against live Supabase** (project `pqracitpmzpiqfnzlngw`).
  You write migration files + PGlite regression checks; the founder applies
  them. If a task needs a live object that isn't applied yet, verify
  everything you can and record the rest as "pending founder gate" — do not
  fake it.
- **Degrade honestly.** Missing env var, unbuilt dependency, unreachable
  API → a structured `not_configured` / `not_implemented` error naming the
  missing thing. Never a silent success, never a stub that pretends.
- **Guards run before side effects; the log row is written before the
  result returns; a failed log write fails the call.** These three are
  already enforced in `middleware.py` — extend them, never route around
  them. New handlers plug into `ToolLayer.handlers`, they do not bypass
  `dispatch()`.
- **Identity is process state** (ADR-R1). No tool, handler, or test may
  accept an `agent_id` argument from the caller side. A different identity
  means a different process.
- **No secrets in tool results, errors, logs, or agent context** — ever.
  Secrets live in S1's environment only.
- **Prompts are not the enforcement mechanism.** If a behavior matters, it
  is enforced in the wrapper/DB and covered by a test.
- **Fail closed.** Empty allowlist scope, missing tier-list file, unknown
  config value → refuse, don't permit. (The Allowlist B tier list is
  founder-gated: it ships as an empty in-repo file until Jason approves the
  v1 contents. Empty = every fetch blocked. That is correct behavior, not a
  bug to fix.)

## 4. Environment facts (so you don't rediscover them)

- Python here is **3.11.0a3**; the cores are stdlib-only and the skeleton's
  tests follow that convention (`unittest`, no pytest). Keep it that way
  for tests. Runtime deps allowed by the PRD when a task actually needs
  them: `mcp`, `psycopg[binary]`, `httpx`, `tldextract`, `pydantic` —
  nothing else without cause. `mcp` is **not installed** yet; everything
  must stay runnable/testable without it (`server.py` shows the
  import-guard pattern).
- The Fact-Checker guard imports its sibling by bare name; `cores._load()`
  already handles that (parent dir on sys.path during exec). The
  orchestrator folder name contains a literal ` : ` — always go through
  `cores.py`, never hand-build paths.
- The guard cores emit `guard_type`, but the action_log DDL has no such
  column (Logging Schema §2 governs). The middleware folds it into
  `failure_reason` as a `[guard_type] ` prefix. Keep that convention.
- Migration 0009 is written and regression-verified; **live apply is a
  pending founder gate**, so S1-03's live-DB verify may be blocked — build
  it against PGlite/local Postgres semantics and record the live check as
  pending.
- `FEC_API_KEY` is set in the main checkout's `.env.local` (validated).
  The dev log sink is `CAP_LOG_SINK=jsonl:<path>`; there is deliberately
  no default sink.
- Roles are NOLOGIN until the founder runs
  `ALTER ROLE cap_tool_wrapper LOGIN PASSWORD '…'` out-of-band. Connection
  strings therefore come from env (`SUPABASE_DB_URL`), never from files.

## 5. Founder gates — park, don't block

When you hit one of these, note it in the PRD next to the task and move on
to what's buildable:

| Gate | Blocks |
|---|---|
| Apply 0009 + role LOGIN | S1-03 live verify (build against embedded PG meanwhile) |
| Allowlist B v1 tier list contents | S1-05 live fetches (empty-fail-closed until then) |
| Anthropic API budget confirmation | S2 sessions |
| First-race pick | S3-03 acceptance |

## 6. Definition of done (whole build)

One command runs one race end to end — intake → 3 agents × N candidates →
balance audit → human gate → publication decision — with every invariant
enforced by code, every action logged, and the Logging-Schema §4 queries
(scrutiny / block rate / traceability) returning sane numbers. A HALT
provably stops composition and dispatch. Zero secrets in any agent context.

---

### Paste-ready session prompt

> "We're continuing the CAP pipeline runtime build. Read
> `Civic Awareness (Know Your Vote)/toollayer/AGENT_BRIEF.md` and follow its
> loop protocol: find the first unchecked task in
> `Civic Awareness (Know Your Vote)/CAP_Runtime_PRD_v1.md`, read only that
> task's references, implement, run its Verify step until it actually
> passes, mark it `[x]` with a `~ Done` note, update the Build status line,
> and continue. Stop at founder gates and record them; never run DDL
> against live Supabase; keep `test_toollayer_skeleton.py` and
> `--selfcheck` green after every task."
