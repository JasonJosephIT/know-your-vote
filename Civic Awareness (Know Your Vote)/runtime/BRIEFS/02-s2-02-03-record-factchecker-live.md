# Brief 02 — S2-02 / S2-03 live acceptance: Record + Fact-Checker

**Prereq:** [Brief 01](01-s2-01-profiler-live.md) working (the end-to-end
Profiler run + entrypoint). **Owner:** agent.

**Reads:** `../../CAP_Runtime_PRD_v1.md` §6 S2-02/03,
`../../CAP_Agent_Plan_v1.md` §3 (Record) / §4 (Fact-Checker).

## Goal
Run the same live pattern for the other two identities. Build order is
**Record → Fact-Checker** (the Fact-Checker consumes the other two's claims).
Both configs (`agents.RECORD`, `agents.FACTCHECKER`) already exist and were
behaviour-verified against the real guard cores; this brief is the live run.

## S2-02 — Record
Same wiring as Brief 01 but `agent_id="record"` / `agents.RECORD`. The Record
agent has **no** `web_search`/`fetch_source` — its sources are the primary APIs
(FEC / FL Legislature / DoE). For a demo-seed run without live vote/finance data,
either point T2/T3 at a known real candidate/bill or accept a small/empty record.

**Done when (Verify):**
- the run log shows **zero** `web_search` / `fetch_source` calls (they're denied
  anyway — confirm the denial path never even triggered);
- every claim is `verifiable_fact` + `primary_doc`, `attributed=false`;
- mark S2-02 `[x]`.

## S2-03 — Fact-Checker
`agent_id="factchecker"` / `agents.FACTCHECKER`. Two extra inputs vs the others:
- **The claim inventory (S2-R1).** `agents.FACTCHECKER.kickoff(...)` *requires*
  `claim_inventory` — read the Profiler + Record claims for the candidate via a
  `db_read` (T8, cross-bucket) and pass them in. The kickoff raises without it.
- **Model escalation (S2-R2).** `agents.FACTCHECKER.escalation_model` is
  `claude-opus-4-8`; escalate from `claude-sonnet-5` only if verdict quality
  demands it. Larger budget rails are already set (risk R2 — the expensive
  session).

**Done when (Verify):**
- a claim with `<2` independent Tier-1 sources cannot carry a non-`unverifiable`
  verdict — **H3 fires through the live MCP surface** (not just a stub);
- opinions land in `outside_opinion` with `verdict=null`;
- split statements carry `derived_from` back to the originating `stated_position`
  claim, buckets kept separate;
- each fact-check increments that candidate's `fact_checks_performed`;
- mark S2-03 `[x]`.

## Watch-outs
- Symmetric scrutiny is audited downstream (Brief 03's balance audit): aim to
  fact-check comparably across candidates in a race.
- The Fact-Checker is the costly one — cap tool calls / tokens / wall-clock and
  watch spend.
- Verdict values are the **storage form** (`mostly_accurate`, not "Mostly
  Accurate"); the tool schema documents this, and the guard enforces it.
