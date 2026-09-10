# Scoping the R1–R4 run

**Written 2026-09-10.** The question this answers: what does it take to publish
the 21 real races that the 2026 intake put in the database, and why can't they
just be flipped to `published`?

## 1. Why publishing is not a publication flip

`getRaceBrief` returns `null` unless **every** ballot-tier profile carries
`audit.balance_check_passed === true` — `src/lib/briefs.ts:172`, FR-005.

Measured live on 2026-09-10:

| | |
|---|---:|
| profiles in the database | 29 |
| …of those, passing the Balance Audit | 28 |
| …of those, belonging to **demo** races | 29 |
| profiles for the 247 real intake candidates | **0** |
| claims in the database | 261 |
| …belonging to demo races | **261** |

So publishing the real races today yields 21 races whose pages render nothing,
and whose links 404 from the landing page. The demo races were retired to
`draft` the same day (they were fabricated people — "Gregory Boone", "Marta
Villanueva" — published as real 2026 ballot lines), which is why the site now
shows its honest "the ballot isn't published yet" state.

The one way to make the real races pass today would be to write
`balance_check_passed: true` onto stub profiles. That flag **is** the "equal
space, equal scrutiny" guarantee. Forging it to make a publish succeed would
counterfeit the single claim this product is built on, so the gate stands and
this document exists instead.

## 2. What the run actually is

Three agent identities (`cap_runtime/agents.py`) plus a deterministic
orchestrator:

| identity | role | sources | model |
|---|---|---|---|
| `profiler` | the candidate's own stated positions | web + fetch_source | `claude-sonnet-5` |
| `record` | the verifiable record | primary APIs only (FEC / FL Leg / DoE) — **no** web_search | `claude-sonnet-5` |
| `factchecker` | verdicts over the other two's claims | claim inventory (S2-R1) | `claude-sonnet-5`, escalating to `claude-opus-4-8` (S2-R2) |
| orchestrator | S3 runbook — **no model calls, no prompt** | — | — |

The orchestrator's order is fixed and the core refuses out-of-order
transitions: `new_race_state → log_spine_issues → start_agents → (per
candidate: profiler + record, then factchecker) → agent_finished →
balance_audit (T10) → apply_audit_result → on PASS: mark_composed →
record_human_review → check_dispatch → mark_dispatched`.

Note the human gate sits **after** the Balance Audit and before dispatch.
Declining there leaves the race unpublished — by design.

## 3. Scale

Measured from the live database, not estimated:

- **21 races** (16 U.S. House + 5 statewide)
- **57 ballot-line candidates** — these are the subjects; `candidate_ids`
  carries only printed ballot lines (D1)
- 8 write-ins and 182 withdrawn candidates are stored but **not** briefed
- **3 sessions per candidate** (profiler, record, fact-checker) → **171
  sessions** for full coverage

Per-session rails, from `agents.py` — these are ceilings, not expected use:

| | profiler / record | fact-checker |
|---|---:|---:|
| max tool calls | 60 | 120 |
| max tokens | 400,000 | 800,000 |
| max wall clock | 900 s | 1,800 s |

A full run therefore has a **worst-case** ceiling in the tens of millions of
tokens. That number is not a forecast — it is the rail. **The pilot exists to
replace it with a measurement**, which is why nobody should price the full run
before running two sessions.

## 4. Prerequisites — current status

From `runtime/BRIEFS/00-founder-prerequisites.md`:

| # | prerequisite | status |
|---|---|---|
| 1 | arm64 Python 3.12 venv | ✅ **done 2026-09-10** — `.venv`, CPython **3.12.13 arm64**, `psycopg 3.3.5` · `anthropic 1.4.0` · `mcp` · `httpx` · `tldextract`; `cap_toollayer` and `cap_runtime` both import; all three agent configs load |
| 2 | `SUPABASE_DB_URL` (`cap_tool_wrapper`) | ❌ **absent** from `.env.local` |
| 3 | `CAP_READONLY_DB_URL` (`cap_readonly`) | ❌ **absent**, and the role has `rolcanlogin = false` — it needs `ALTER ROLE cap_readonly LOGIN PASSWORD '…'` |
| 4 | `ANTHROPIC_API_KEY` | ❌ present in `.env.local` but **empty** |
| 5 | a race + candidates to run against | ✅ real 2026 data, live since the intake run |

Step 1 was the only agent-ownable one and is complete. The rest are passwords
and an API key: they are the founder's to set, and rotating
`cap_tool_wrapper` could break anything else already configured with it.
`BRIEFS/00` also wants all three rotated regardless, since they were exposed in
a transcript.

## 5. What provisioning already found

Building the venv surfaced a defect the alpha Python had been hiding, now fixed
in PR #46: `LiveAnthropicBackend` refused only when the `anthropic` SDK could
not be imported, making the fail-closed guarantee a property of the machine.
On the very venv `BRIEFS/00` tells you to build — where the SDK is installed by
design — it constructed a client and reached the network. A gate that only
holds on machines that cannot run the pipeline is not a gate.

That is the argument for the pilot in one paragraph: the first two sessions are
worth more as a bug detector than as output.

## 6. Recommended order

1. **Pilot** — Briefs 01 + 02: profiler, then record, then fact-checker,
   against **one** candidate. Measures real tokens, wall clock and cost per
   session, and exercises the S1 tool layer over MCP stdio for the first time.
2. **One race end to end** — Brief 03 S3-01, through the Balance Audit and the
   human gate. This is the first time `balance_check_passed` is set by
   something other than the demo seed.
3. **Then decide the full run** against measured numbers, not the rails in §3.

Nothing beyond step 1 should be scheduled until step 1 has produced numbers.
