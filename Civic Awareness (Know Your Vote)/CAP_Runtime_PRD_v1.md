# CAP Runtime PRD — S1 Tool Layer · S2 Agent Runtime · S3 Orchestrator
## Companion to CAP_PRD_v1.0, CAP_MCP_Tool_Spec_v1.0, CAP_Logging_Schema_v1.0, CAP_Agent_Plan_v1.1, CAP_Balance_Audit_Spec_v1.1, Master Guide §9

**Status:** Draft v1.0
**Last Updated:** 2026-07-09
**Owner:** Jason (founder) · build: coding agent sessions
**Scope:** the three runtime services that turn the built-and-tested cores into a pipeline that actually runs. S4 (inbound SMS webhook) and S5 (CLI adapters beyond what S3 needs) are explicitly out of scope here.

> **Progress tracking:** mark tasks `- [x]` as they are finished and keep the Status
> line current. Every task ends with its Verify step passing. Ship S1 as its own PR,
> then S2+S3 as a second PR.

**Build status:** 7/14 tasks · **S1 COMPLETE (S1-01…S1-07)** — the full T1–T12 MCP tool layer: intake/primary-APIs, discovery, data writes, balance audit + token-gated dispatch; 86 stdlib tests + `--selfcheck` + migration regression green; T1–T3 verified against real DoE/FEC/FL endpoints · **live-DB gate CLOSED 2026-07-10**: 0009 confirmed applied on live Supabase (grants/policies match the regression checks), `cap_tool_wrapper` LOGIN password set + live-verified as the role (INSERT action_log ✓, read-back denied ✓, read claim ✓ [261 rows], DELETE denied ✓, PII denied ✓) · **S2-01/02/03 built; all three agents live-verified against `claude-sonnet-5` + the real guard cores** (Profiler: 2 attributed stated_position claims; Record: zero web tools, verifiable_fact/attributed=false; Fact-Checker: split statement → `unverifiable` under the ≥2-Tier-1 rule + `outside_opinion` verdict=null). 26 S2 tests + 100 S1 tests = **126 total green**. The MCP input-schema gap found by those probes is **fixed** (`schemas.py` + per-identity `for_agent()`; live-reprobed: rejections 17 → 0). Remaining: MCP↔S1 client + demo-seed acceptance, gated on `mcp` + a stable Python ≥3.11

---

## 1. Purpose & Background

Everything deterministic about the pipeline already exists and is tested (148 tests across 7 cores):

| Core (built) | What it decides |
|---|---|
| `balance_audit_core.py` | PASS/HALT per race, four-metric split, locked variance formula |
| `allowlist_a_core.py` | Profiler source scope — candidate-controlled domains/handles, fail-closed |
| `allowlist_b_core.py` | Fact-Checker source tiers, Tier-1 independence counting |
| `profiler_guard_core.py` / `recorder_guard_core.py` / `factchecker_guard_core.py` | Per-agent tool grants, own-bucket reads, `source_register` typing, the load-bearing `claim_write` contract (wrong bucket → reject **and halt**) |
| `orchestrator_core.py` | The race state machine — spine logging → agents → audit → compose → human gate → dispatch, with dispatch unreachable while the latest audit is HALT |

What does **not** exist is anything that *executes*: no MCP server exposes T1–T12, no agent session has ever called a tool, no race has run end to end. This PRD specifies those three services:

- **S1 — MCP tool-layer service**: one Python MCP server exposing the twelve tools, embedding the cores. The single chokepoint; the only component holding DB write credentials and external API keys.
- **S2 — agent runtime**: three Claude agent configurations (profiler / record / factchecker) that connect to S1 and produce Sources/Claims/Positions per their contracts.
- **S3 — orchestrator**: deterministic Python (no model calls) implementing the Agent Plan §5 runbook on top of `orchestrator_core.py`.

The constitution (Master Guide §2) governs every requirement below; where this document is silent, the Tool Spec and Agent Plan govern.

---

## 2. Goals & Success Metrics

**Goal:** one command runs one race end to end — intake → 3 agents × N candidates → balance audit → human gate → publication decision — with every invariant enforced by code, and every action logged.

Acceptance is measured against the PRD §4 KPIs, now finally measurable:

| KPI | Target | Where it comes from |
|---|---|---|
| Traceability | 100% of written claims have ≥1 `claim_source` row | pre-publish check (§9.1 of Master Guide) returns empty |
| Symmetric Scrutiny | <10% variance in fact-checks performed per candidate | `action_log` aggregation (a) in Logging Schema §4 |
| Balance | <15% variance in word/claim count per race | `balance_audit` result rows |
| Audit Block Rate | tracked, not targeted | `action_log` rows with `guard_triggered = true` |

**Definition of done for this PRD:** a demo-seed race and then one real target race complete the full sequence; the audit result is written; a HALT provably blocks composition and dispatch; the Symmetric Scrutiny queries return sane numbers; zero secrets appear in any agent context or tool result.

---

## 3. Non-Goals

- **No cloud hosting.** Everything here runs on the operator's machine (ADR-001 posture). `agent_run_request` graduation to serverless is admin-roadmap Q3, later.
- **No S4 SMS webhook** and no Twilio sends beyond the T12 stub contract (§5.2).
- **No schema invention.** The ten Schema-v1 content objects exist (migration 0000). This PRD adds only `action_log` + the two DB roles, exactly as already specified in Logging Schema v1.0 §2.
- **No prompt rewrites.** The Agent Plan v1.1 prompts are pasted verbatim; if a prompt fails in practice, amend the Agent Plan first, then re-sync.
- **No R-agent changes.** The freshness layer (R0–R4) is a separate plane; its console integration is admin tasks A14/A15.

---

## 4. Architecture Overview

```
 S3 orchestrator (deterministic Python, no model calls)
 │  spawns per-candidate agent sessions, sequences the runbook
 ▼
 S2 agent sessions (Claude)                 one session = one (agent, candidate, race)
 │  profiler │ record │ factchecker         prompts from Agent Plan v1.1, verbatim
 ▼  MCP (stdio)
 S1 tool-layer server (Python 3.10+, FastMCP)
 │  T1–T12 wrappers · guards · allowlists · auto-logging
 │  holds: SUPABASE_DB_URL(cap_tool_wrapper) · FEC_API_KEY · TWILIO_*
 ▼
 Supabase Postgres (content plane + action_log)
```

### ADR-R1 (embedded): how agent identity binds to the wrapper

The §5 authorization matrix keys every guard on `agent_id`. If `agent_id` were a tool *parameter*, the model could pass someone else's identity and the guards would be decorative.

**Decision: one S1 process per agent session, identity fixed at spawn.** The orchestrator (or the dev harness) launches the S1 server with `CAP_AGENT_ID=profiler|record|factchecker|orchestrator` in its environment; every wrapper reads identity from process state. No tool accepts an identity argument. A session that wants a different identity needs a different server process, which only S3 can launch.

*Rejected:* single shared server with identity as a per-call header/param (model-forgeable over stdio; MCP has no trustworthy per-call auth on a local transport) and identity inferred from prompt content (prompts are explicitly not the enforcement mechanism).

Consequences: 3–4 short-lived S1 processes per candidate run (cheap — stdio, local); guards stay pure functions; the audit log's `agent_id` column is trustworthy because the wrapper stamps it from its own environment.

---

## 5. S1 — MCP Tool-Layer Service

**Location:** `Civic Awareness (Know Your Vote)/toollayer/` (Python package `cap_toollayer`, Python 3.10+, MCP Python SDK / FastMCP, stdio transport). Dependency budget (ponytail): `mcp`, `psycopg[binary]`, `httpx`, `tldextract` (PSL), `pydantic` — nothing else without cause.

### 5.1 Cross-cutting requirements

- **S1-R1 — guards run first.** Every tool call is checked, in order: (1) `check_tool_access` for the process identity → `guard_type='denied_tool'`; (2) tool-specific guard/allowlist → `'allowlist'` or `'bucket'`; (3) only then side effects. Prompts are never the enforcement mechanism.
- **S1-R2 — everything is logged, before returning.** Every invocation — reads included, rejections included — writes one `action_log` row with the Logging-Schema fields (`timestamp, agent_id, race_id, candidate_id, tool_called, source_url, bucket_written, claim_id, source_id, status, failure_reason, guard_triggered, guard_type`) **before** the tool result is returned. If the log INSERT fails, the tool call fails: no unlogged side effect can exist.
- **S1-R3 — halt is a state, not an exception.** A `halt=True` guard result writes the log row, marks the run halted in the S1 process (all subsequent write-tools return `pipeline_halted`), and surfaces a structured error to the caller. S3 owns converting that into race-state HALT.
- **S1-R4 — secrets stay inside.** `SUPABASE_DB_URL` (the `cap_tool_wrapper` role), `FEC_API_KEY`, `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` live only in S1's environment. No secret, connection string, or raw HTTP header ever appears in a tool result or error message.
- **S1-R5 — PSL injection.** `allowlist_a_core` gets a real public-suffix extractor (`tldextract`, offline snapshot mode) injected at server start; the built-in fail-closed subset is the fallback, never the plan.
- **S1-R6 — DB constraints are the last line.** S1 connects as `cap_tool_wrapper` (INSERT-only on `action_log`; scoped INSERT/UPDATE on content tables; no DELETE anywhere). A wrapper bug that slips past a guard still dies on the Postgres CHECK/FK/role grants.

### 5.2 Tool-by-tool contract

| Tool | Wraps / calls | v1 behavior |
|---|---|---|
| T1 `doe_file_intake` | FL DoE tab-delimited candidate file (HTTP fetch + parse) | Download, parse, filter to the 8 target races, upsert `race`/`candidate` rows. Idempotent by natural key. |
| T2 `fec_api_query` | api.open.fec.gov (`FEC_API_KEY`) | Read-only passthrough with per-endpoint schema validation + rate-limit backoff. Registers nothing itself. |
| T3 `fl_legislature_query` | flsenate.gov / FL House public endpoints | Read-only: bill text, vote records, journals. Deterministic fetch, cached to disk per URL+date. |
| T4 `jurisdiction_resolve` | the same ZIP↔district mapping the app's `zip_district` table uses | One mapping, two consumers, no drift: read `zip_district` via SQL, never a copy. |
| T5 `web_search` | search API of choice behind allowlist | Caller-keyed: profiler → Allowlist A filter on every result; factchecker → Allowlist B `classify_url`; record → denied. Off-list results are *dropped from the result set*, not just flagged. |
| T6 `fetch_source` | `httpx` GET | Same allowlist gate as T5 per caller; tags `retrieved_at`; no redirects through shortener denylist; strips scripts; returns text + metadata. |
| T7 `source_register` | `validate_source_register` (caller's guard core) → INSERT `source` | Dedupe on normalized URL (`normalize_url` / `url_norm`); returns existing `source_id` on hit. |
| T8 `db_read` | `check_db_read` (caller's guard core) → SELECT | Named, parameterized queries only (race, candidate, claims-by-bucket, spine issues, profile) — not a raw SQL surface. |
| T9 `claim_write` | `validate_claim_write` (caller's guard core) → INSERT `claim` + `claim_source` rows in one transaction | The load-bearing guard. Wrong bucket → reject + halt (S1-R3). A claim and its `claim_source` rows commit atomically or not at all — "no Source → no claim" is transactional, not procedural. |
| T10 `balance_audit` | `balance_audit_core` | Orchestrator-only. Reads profiles via SQL, runs the core, writes the audit result + per-profile `balance_check_passed`, returns PASS/HALT with exact numbers. |
| T11 `log_action` | — | **Not externally callable.** Invoked inside every other wrapper (S1-R2). Exposing it would let an agent write fiction into the audit trail. |
| T12 `sms_dispatch` | Twilio trial | Orchestrator-only, and refuses unless the caller presents the approval token S3 mints at the human gate (§7). v1 sends to the owner's verified phone only. Without Twilio env set: structured `not_configured` error (degrade honestly, never fake a send). |

### 5.3 Tasks

- [x] **S1-01 — Migration `0009_action_log_roles.sql`**: `action_log` DDL verbatim from Logging Schema v1.0 §2 + `cap_tool_wrapper` / `cap_readonly` roles and grants (INSERT-only log; scoped content-table grants; SELECT-only readonly).
  Verify: extend `scripts/verify-migrations.mjs`; live apply is **founder-gated** (never run DDL against the live project — hand the file to Jason).
  ~ Done 2026-07-09: 26 new invariant checks green (roles created NOLOGIN — Supabase can't mint BYPASSRLS, so access = grants + explicit policies; founder enables LOGIN out-of-band). **Pending founder: apply to live.**
- [x] **S1-02 — Server skeleton + identity binding**: FastMCP stdio server, `CAP_AGENT_ID` env binding (ADR-R1), config loading, structured error taxonomy (`denied_tool` / `allowlist` / `bucket` / `pipeline_halted` / `not_configured`).
  Verify: server starts under each of the four identities; an ungranted tool returns `denied_tool` and logs it.
  ~ Done 2026-07-09: `toollayer/` package, 18 stdlib tests + `--selfcheck` green under all four identities; DB pool moved to S1-03 with the PostgresSink.
- [x] **S1-03 — T11 auto-logging middleware**: every wrapper writes its `action_log` row pre-return; log-INSERT failure fails the call.
  Verify: contract test — a rejected call, a read call, and a write call each produce exactly one correct row; killing the DB mid-call yields a failed tool call and no orphaned side effect.
  ~ Done 2026-07-09: real `PostgresSink` — one INSERT/call as `cap_tool_wrapper`, `INSERT_SQL` built from `LOG_COLUMNS` (no drift), fail-closed, only the exception *type* surfaced so no DSN/secret leaks (S1-R4). 7 new contract tests drive the real sink through an injected fake DB-API connection: rejected/read/write each commit exactly one correct row; a DB killed mid-call raises `LogWriteError`, rolls back, and orphans nothing. 25 stdlib tests + `--selfcheck` green; migration regression still green. **Pending founder: apply 0009 + `ALTER ROLE cap_tool_wrapper LOGIN` to verify against live Supabase (psycopg not installed here; driver + connection are injectable so everything else is proven).**
- [x] **S1-04 — Data tools T7/T8/T9**: source_register with dedupe, named db_read queries, transactional claim_write wired to the caller's guard core.
  Verify: replay every guard-core test vector *through the MCP surface* (the 148 core tests become integration tests); a two-source claim rolls back atomically when the second `claim_source` insert is forced to fail.
  ~ Done 2026-07-09: `store.py` (a `Store` **is** the PostgresSink — shares one cap_tool_wrapper connection, so a write handler's content INSERTs and the action_log row commit in ONE transaction; a log-write failure rolls the content back too — S1-R2) + `handlers.py` (T7 dedupe on canonical `url_norm`; T8 fixed named-query catalog, fail-closed on unknown names — not a raw SQL surface; T9 reads cited sources → guard → transactional claim+claim_source). Guard verdicts are re-proved through `dispatch()` for all three agents across accept/reject/halt (denied-tool, own/cross-bucket read, each source type, wrong-bucket + editorial-label + H3 halts, no-source drop, two-independent-Tier1 pass). Atomicity: a forced 2nd-claim_source failure rolls back claim+claim_source and still logs the fail row; a forced log-write failure rolls the content back too; a DB error on the cited-source read degrades to a logged `upstream_failed`. 44 stdlib tests + `--selfcheck` + migration regression green. The cores are untouched, so their exhaustive 148 vectors remain the authoritative guard proof; these add the wrapper-parity layer. **Pending founder: live-DB run (apply 0009 + role LOGIN + `pip install psycopg[binary]`); everything is proven through an injected connection meanwhile.**
- [ ] **S1-05 — Discovery tools T5/T6 + allowlists**: search + fetch with per-caller Allowlist A/B enforcement, PSL injection (S1-R5), shortener denylist, disk cache.
  Verify: profiler fetch of a news URL → blocked + logged `guard_type='allowlist'`; factchecker fetch of a Tier-1 URL → allowed and tier-tagged.
  ~ **FOUNDER GATE — RESOLVED 2026-07-09 (Jason):** wire Allowlist B to the core's frozen Tool-Spec-§2.5-B list (`allowlist_b_core`), which is the approved v1. Rationale accepted: the Tool Spec governs over this PRD (its own precedence clause), the list is already built + tested, and the Fact-Checker's ≥2-Tier-1 verdict rule already counts against it — an empty override would be incoherent (a verdict could cite a Tier-1 source the agent may not fetch). Supersedes R3's "ships empty-fail-closed" for Allowlist B.
  ~ Done 2026-07-09: `discovery.py` (T5 web_search + T6 fetch_source). Gate runs before any I/O: profiler → Allowlist A (per-candidate `official_site` + verified social handles, read live via `store.candidate_scope`, scope memoized per process); factchecker → Allowlist B core (tier-tagged); record → denied at `check_tool_access`. Off-list web_search results are dropped from the set; blocked fetches log `guard_type='allowlist'` before returning. S1-R5 PSL injection: real `tldextract` (offline snapshot) when installed, else the core's fail-closed subset (tldextract absent here → fallback exercised). No redirects (`follow_redirects=False`), shorteners blocked, `<script>` stripped, disk cache per (normalized-URL, day). Fetch/search backends injectable → gate tested offline; missing search backend → `not_configured`, network error → `upstream_failed` (type only, no host/secret leak). 57 stdlib tests + `--selfcheck` green. **Pending founder: live fetch against real endpoints (httpx installed; needs network) — the allowlist decision + logging + tier-tagging are proven offline.**
- [x] **S1-06 — Intake & primary APIs T1–T4**: DoE intake upserts, FEC + FL Legislature read tools with backoff, jurisdiction_resolve over `zip_district`.
  Verify: T1 against the current DoE file populates the 8 target races idempotently (run twice, same rows); T2/T3 return schema-valid payloads for a known candidate/bill.
  ~ Done 2026-07-10 (founder supplied the FEC key + fetch authorization; formats captured live): `intake.py` (T1–T4) + `store` upserts/jurisdiction, wired for record/factchecker/orchestrator (per-agent grants gate access). **Live-verified against real endpoints:** T1 parses the *current* DoE `extractCanList.asp` export (POST elecID=20261103-GEN; tab-separated `CandidateList.txt`, header-mapped 26 cols) into **exactly the 8 target races** (FL-10/15/23/28 + GOV/ATG/CFO/AGR) — 26 federal + 83 statewide candidates, PII (addr/phone/email/treasurer) dropped, party/status normalized, parse deterministic & idempotent; T2 FEC `/candidates` returned a schema-valid `{api_version,pagination,results}` payload (7 FL-28 candidates, key works); T3 FL Senate bill fetch returned the live bill page (deterministic URLs, disk-cached, fail-closed sanity). Upsert idempotency is `ON CONFLICT (…) DO UPDATE` (verified in SQL + parse determinism). Review fix: the FL-Senate block-page sanity check was made query-type-aware so `bill_text` (raw statute, no site chrome) isn't false-rejected. 75 stdlib tests (17 new) + `--selfcheck` + migration regression green. FEC endpoints are a fail-closed named catalog (not a raw API surface); 429 → Retry-After backoff. **Pending founder: the live DB *round-trip* idempotency ("same rows" after a second run) needs 0009 applied + role LOGIN — the parse/target-race/ON-CONFLICT mechanism is proven; only the live write is gated.**
- [x] **S1-07 — Synthesis & delivery T10/T12**: balance_audit wrapper writing results + `balance_check_passed`; sms_dispatch behind the approval token, `not_configured` degrade.
  Verify: a synthetic imbalanced race returns HALT with the breached gate + lo/hi candidates and `guard_triggered=true` in the log; T12 without a token is refused *and logged*.
  ~ Done 2026-07-10: `synthesis.py` (orchestrator-only). T10 reads all Profiles, runs `balance_audit_core` (four-metric split), writes `balance_check_passed`/`flag_reason`/`flagged_at` into each `profile.audit`; a HALT returns ok=True **with** the numbers and sets `halt` so the middleware logs `guard_triggered=true` (Audit Block Rate KPI) and freezes the process's write tools — so T12 becomes `pipeline_halted` after a HALT (proven). Verified: an imbalanced race → verdict HALT, breached=[`fact_checks`] (min/max 4/6, 33.3%), lo/hi = cand_002/cand_001. T12 is fail-closed: **disarmed unless S3 configured `CAP_DISPATCH_TOKEN`** and the caller presents a matching token (constant-time compare); no/ wrong token → `denied_tool` + logged; token-but-no-Twilio → `not_configured` (never fakes a send); owner-phone-only. 86 stdlib tests (11 new) + `--selfcheck` + migration regression green. **Pending: live DB (0009 gate) for the profile write-back; Twilio creds for a real send (degrades honestly until set).**

**S1 is complete (7/7 tasks) — the MCP tool layer is built and tested end to end.** Ship it as its own PR (PRD §"Progress tracking"). S2 (agent runtime) is next and needs the founder Anthropic-budget gate.

---

## 6. S2 — Agent Runtime

**Location:** `Civic Awareness (Know Your Vote)/runtime/` — three agent config files + one session runner.

- **S2-R1 — one session = one (agent, candidate, race).** The runner takes `agent_id`, `candidate_id`, `race_id`, the spine issue set, and (factchecker only) the claim inventory from T8; spawns S1 with the matching `CAP_AGENT_ID`; runs the Agent Plan v1.1 prompt verbatim with `{{candidate_id}}`/`{{race_id}}`/spine substitutions; ends when the agent reports completion or a halt error arrives.
- **S2-R2 — agents hold nothing.** No credentials, no raw DB access, no filesystem. Model: `claude-sonnet-5` default, `claude-opus-4-8` escalation for the Fact-Checker if verdict quality demands it (same policy as the quiz).
- **S2-R3 — completion contract.** A session's final message must report claims written / positions created / issues with `no_stated_position_found`; the runner cross-checks against `action_log` counts (the model's self-report is informational; the log is the truth).
- **S2-R4 — budget rails.** Per-session caps (max tool calls, max tokens, wall-clock) with the run marked `incomplete` — never silently partial — when a cap trips.
- **Build order:** Profiler → Record → Fact-Checker (needs 1 & 2's claims), per Agent Plan §1.

### Tasks

- [ ] **S2-01 — Session runner + Profiler config**: harness (Anthropic SDK or Claude Agent SDK, whichever gets MCP-stdio wiring with less code), S1 spawn/teardown, transcript persisted per run under `runs/<race>/<candidate>/<agent>/`.
  Verify: Profiler completes one demo-seed candidate; every claim is `stated_position` with a `candidate_self` source; spine silence recorded as `no_stated_position_found`, not invented.
  ~ In progress 2026-07-10 — **runner + Profiler + agent loop built and LIVE-verified against real Claude; only the MCP↔S1 wiring + full-stack acceptance remain.** `runtime/cap_runtime/` (`agents.py`: Profiler config + Agent-Plan §2 prompt verbatim + render/kickoff substitution; `session.py`: `SessionRunner` with S2-R4 budget rails, `s1_spawn_spec` identity-at-spawn, transcript under `runs/<race>/<candidate>/<agent>/`, completion cross-check vs `action_log`). The agent loop is a real Anthropic Messages tool-use loop (`LiveAnthropicBackend`, injectable client) + a `ScriptedBackend` for tests — **16 S2 stdlib tests** (102 total with S1). **Live probe 2026-07-10:** ran the actual Profiler prompt through `claude-sonnet-5` against a *stubbed* S1 (fake dispatch, no mcp/DB needed) — Claude drove `fetch_source`→`source_register`→`claim_write`×2 and produced 2 attributed `stated_position` claims organized by spine issue, in the mandated "states"/"says" voice. `ANTHROPIC_API_KEY` now set in `.env.local`. **Remaining (narrower) gate:** an MCP-stdio client connecting the loop to the *real* S1 server + the demo-seed acceptance — needs `mcp` on a **stable Python ≥3.11** (this box's 3.11.0a3/3.9 can't run the S1 server+mcp+psycopg together) and `scripts/demo-seed*.sql` loaded.
- [ ] **S2-02 — Record config**: primary-API-only sourcing.
  Verify: run log shows zero T5/T6 calls (they're denied anyway — confirm the denial path never triggered either); claims are `verifiable_fact` + `primary_doc`, attributed=false.
  ~ Built + behaviour live-verified 2026-07-10 (`agents.RECORD`, Agent-Plan §3 prompt verbatim, sonnet-5). Probe: real `claude-sonnet-5` against the **real `recorder_guard_core`** with stubbed I/O — tools called were only `fec_api_query`/`fl_legislature_query`/`source_register`/`claim_write`, **zero `web_search`/`fetch_source`** (and zero denial-path triggers); both claims came out `verifiable_fact`, `attributed=false`, `verification=verified`, citing `primary_doc` sources; no editorialising (it declined to tag an `issue_id` it couldn't justify). **Pending:** the same run through the real MCP surface + `action_log` (same gate as S2-01).
- [ ] **S2-03 — Fact-Checker config**: cross-bucket read of 1 & 2's output, verdicts on the six-value scale, H1–H3 halt conditions live.
  Verify: a claim with <2 independent Tier-1 sources cannot carry a non-Unverifiable verdict (H3 fires through the MCP surface); opinions land in `outside_opinion` with `verdict=null`.
  ~ Built + behaviour live-verified 2026-07-10 (`agents.FACTCHECKER`, Agent-Plan §4 prompt verbatim, sonnet-5 + opus-4-8 escalation per S2-R2, `needs_claim_inventory` enforces the T8 inventory of S2-R1, larger budget rails per risk R2). Probe: real `claude-sonnet-5` against the **real `factchecker_guard_core`** (which enforces H3 via `count_independent_tier1`) with only ONE reachable Tier-1 source — the agent split the statement, wrote the checkable fact as `verifiable_fact` with **`verdict='unverifiable'`** (self-limiting; H3 never had to fire) and the opinion as `outside_opinion` with **`verdict=null`**; a first `outside_opinion` write with no sources was correctly rejected by the guard ("no Source, no claim") and the agent corrected. **Pending:** the same run through the real MCP surface + `action_log`.

> **Discovered + FIXED 2026-07-10 — S1's MCP surface published no per-tool input schema.** `server.py` registered every tool as `call(payload: dict)`, so an agent over MCP got no field names and no enums. A live `claude-sonnet-5` Fact-Checker burned **17 of 26 tool calls** on rejected `source_register` attempts guessing `type` (`primary_gov`, `wiki`, `tier1`, …) and `lean_tag='neutral'`, and never wrote a claim.
> **Fix:** new `cap_toollayer/schemas.py` publishes a real `input_schema` per tool, and `schemas.for_agent()` narrows it **per identity** — ADR-R1 gives one process one identity, so the surface advertises *only that agent's granted tools*, with `source.type` / `bucket` / `verdict` / `lean_tag` enums read from that agent's own guard-core constants (no second source of truth; tests pin them to the cores). `serve()` moved from FastMCP (which infers schemas from signatures) to the low-level `Server` so the schemas can actually be published; `--selfcheck` now fails if any identity advertises an ungranted tool. **Re-probed live:** rejections 17 → 1 (flat enums) → **0** (identity-narrowed), with correct output both times (`outside_opinion` verdict=null; `verifiable_fact` verdict=`unverifiable` under the ≥2-Tier-1 rule). 100 toollayer tests (+14).
> Residual: the `serve()` MCP wiring itself still can't be exercised here (`mcp` needs a stable Python ≥3.11) — the schemas it publishes are fully tested.

---

## 7. S3 — Orchestrator

**Location:** `Civic Awareness (Know Your Vote)/orchestrator/run_race.py` — deterministic Python over `orchestrator_core.py`. **No model calls, no prompt** (the §5 runbook is a program, not an agent).

- **S3-R1 — the core is the state machine.** `run_race.py` only performs I/O and calls the core in runbook order: `new_race_state` → `log_spine_issues` → `start_agents` → (spawn S2 sessions, sequentially per candidate: profiler+record, then factchecker) → `agent_finished` per session → T10 `balance_audit` → `apply_audit_result` → on PASS: `mark_composed` → `record_human_review` → `check_dispatch` → `mark_dispatched`. Any transition the core blocks is final — the CLI never "retries around" the core.
- **S3-R2 — HALT is a full stop with a report.** On audit HALT: print the breached gate, metric numbers, and lo/hi candidates; write the audit result; exit non-zero. Re-running after remediation is a new run, not a resume past the gate.
- **S3-R3 — the human gate is a person.** `record_human_review` is reachable only from `audited_pass`; approval is an interactive confirmation naming the reviewer, after the composed brief and audit numbers are displayed. On approval S3 mints the single-use dispatch token T12 requires. No `--yes` flag exists.
- **S3-R4 — ops-plane visibility (nice-to-have, not blocking).** Where migration 0006 is live, S3 dual-writes an `agent_run` row per run (start/finish/outcome) so the admin console sees pipeline runs. Failure to write ops rows never fails a run.
- **S3-R5 — crash honesty.** A crashed/killed run leaves state on disk (`runs/<race>/state.json`); restart detects it and requires an explicit `--abandon` before starting fresh. No zombie state silently overwritten.

### Tasks

- [ ] **S3-01 — `run_race.py` happy path**: runbook sequencing, S2 session orchestration, state persistence, T10 invocation, PASS path through the human gate to (token-minted) dispatch readiness.
  Verify: demo-seed race runs end to end; declining at the human gate leaves the race unpublished and dispatch impossible.
- [ ] **S3-02 — HALT + block-rate reporting**: apply_audit_result HALT branch, remediation report, `guard_triggered` accounting.
  Verify: the synthetic imbalanced race halts; Logging-Schema §4 queries (a) scrutiny, (b) block rate, (c) traceability run clean against the accumulated log.
- [ ] **S3-03 — First real race**: run one real target race (founder picks) end to end on live data; publication decision recorded; scrutiny/balance numbers reviewed against KPI targets.
  Verify: this is the acceptance test for the whole PRD (§2 definition of done).
- [ ] **S3-04 — Docs + status sweep**: README for `toollayer/` + `runtime/` + `orchestrator/`, update Master Guide §11 build status, mark this PRD's checkboxes and status line.
  Verify: a fresh session can run a race from the README alone.

---

## 8. Verification Strategy

1. **Core vectors through the wire** — the existing 148 test vectors re-run as MCP integration tests (S1-04). The cores prove the logic; this proves the wiring didn't un-prove it.
2. **Invariant probes** — dedicated tests per constitutional invariant: unlogged-side-effect impossibility (S1-R2), claim/claim_source atomicity, identity non-forgeability (ADR-R1: a profiler-bound server refuses record tools no matter what the session sends), dispatch-unreachable-under-HALT (core I2, re-checked at T12).
3. **Demo-seed rehearsal** — the full S3 run against `scripts/demo-seed-*.sql` data before any live-data run.
4. **KPI queries as CI** — the three Logging-Schema §4 aggregations wired into a `verify-pipeline-log.mjs`-style script, run after every race.

---

## 9. Dependencies & Founder Gates

| Gate | Needed by | Status |
|---|---|---|
| Apply migration 0009 (roles + action_log) to live Supabase | S1 live runs | ✅ **done 2026-07-10** — confirmed applied (was applied out-of-band; grants/policies match regression); `cap_tool_wrapper` LOGIN password set + live-verified as the role. (Not yet in the tracked-migrations list — optional to register.) |
| `FEC_API_KEY` (free, api.data.gov signup) | T2, Record agent | ✅ done 2026-07-09 — set in `.env.local`, validated live (200 on FL House query) |
| Anthropic API key with budget for agent sessions | S2 | founder (may already exist for the quiz) |
| Twilio trial creds in S1 env | T12 only | optional for this PRD; `not_configured` degrade until set |
| Pick the first real race for S3-03 | acceptance | founder decision |

---

## 10. Risks & Open Questions

- **R1 — DoE/FL-Legislature scraping fragility.** T1/T3 parse public files/pages that can change format. Mitigation: fail-closed parsers + cached last-good copies; a parse failure is a loud `status='fail'` log row, never a guess. 
- **R2 — Fact-Checker cost/latency.** Cross-bucket read + multi-source verification is the expensive session. Mitigation: S2-R4 budget rails; measure on demo seed before live.
- **R3 — Allowlist B tier list drift. RESOLVED (2026-07-09, founder):** the tier list is a **frozen data file in-repo**; changes only via commit/PR so source-policy changes carry the same audit trail as everything else. The *contents* of the v1 list are deliberately still open — to be decided with the founder before S1-05 lands; the file ships empty-fail-closed until then.
- **Q1 — Brief Composer. RESOLVED (2026-07-09, founder): retired.** The voter app renders briefs from the content plane; publication is `race_publication.status='published'`; SMS body composition (`compose_sms`) is in-core. No separate composer artifact will be built — Master Guide §8's line item is superseded. **Future (not this PRD):** a voter-app "share candidate" feature — a templated **candidate card** rendering the selected candidate's simplified info for sharing. Tracked as TASK-057 in `docs/product-roadmap.md` Phase 5.

---

*Where anything here disagrees with CAP_PRD_v1.0, CAP_MCP_Tool_Spec_v1.0, CAP_Logging_Schema_v1.0, or CAP_Agent_Plan_v1.1, those documents govern — amend them first, then this one.*
