# Civic Awareness Project (CAP) — Logging Schema Specification
## Companion to CAP_PRD_v1.0 and CAP_MCP_Tool_Spec_v1.0

**Status:** Draft v1.0
**Last Updated:** 2026-06-29
**Closes Tool Spec deferred item:** "Confirm storage backend for the action log (Supabase table per PRD §12 DB recommendation)."

---

## 0. Governing Principles (inherited)

- The log is **deterministic** — no AI in the loop (PRD §9, Tool Spec §0).
- `log_action` (T11) is **not called by agents directly**; it is invoked automatically inside every other tool wrapper, so logging cannot be skipped (Tool Spec §1).
- The log exists to make three PRD KPIs *mechanically queryable*: Traceability, Symmetric Scrutiny, and Audit Block Rate (PRD §4).
- Append-only. A log record is never updated or deleted.

---

## 1. Log Record Format

One row per tool invocation, written by the wrapper **before** it returns to the agent.

```json
{
  "log_id":          "string (uuid)",
  "timestamp":       "ISO8601",
  "agent_id":        "profiler | record | factchecker | orchestrator",
  "tool_called":     "string (T1–T12 name)",
  "race_id":         "string | null",
  "candidate_id":    "string | null",
  "source_url":      "url | null",
  "source_id":       "string | null",
  "bucket_written":  "verifiable_fact | stated_position | outside_opinion | null",
  "claim_id":        "string | null",
  "status":          "success | fail",
  "failure_reason":  "string | null",
  "guard_triggered": "boolean"
}
```

### Field mapping (PRD request → schema)

| PRD-requested field | Schema field | Notes |
|---|---|---|
| timestamp | `timestamp` | ISO8601, UTC |
| agent_id (profiler/record/fact_checker) | `agent_id` | adds `orchestrator` for synthesis/delivery tools |
| tool_called | `tool_called` | one of T1–T12 |
| source_url (if applicable) | `source_url` | `null` for non-source tools |
| bucket_written_to | `bucket_written` | `null` for reads and non-write tools |
| candidate_id / race_id | `candidate_id`, `race_id` | both nullable (intake-layer tools may have neither) |
| status (success/fail) | `status` | |
| error_detail (if failed) | `failure_reason` | `null` on success |

### Three fields beyond the PRD request (each backs a KPI)

- `source_id` + `claim_id` — make the **Traceability** chain queryable (claim → source). A write row with a `bucket_written` but a null `source_id` is a traceability violation and must surface in audit.
- `guard_triggered` — makes every wrong-bucket / denied-tool rejection independently countable for **Audit Block Rate** (PRD §4, "track every instance the balance check halts the pipeline" — extended here to every guard halt).

---

## 2. Storage Backend — RESOLVED

**Decision: a dedicated Supabase (Postgres) table `action_log`. Not a file.**

Rationale:
- The log's primary consumer is the **Symmetric Scrutiny report**, which is a `GROUP BY candidate_id` aggregation — a SQL operation, not a text scan.
- PRD §12 already recommends Supabase for the structured schema; the Tool Spec deferred only confirmation.
- Append-only is enforceable at the database privilege level (see §3), which a flat file cannot guarantee.
- Indexing makes the per-race rollups O(log n) instead of a full file read.

### Table DDL (reference)

```sql
create table action_log (
  log_id          uuid primary key default gen_random_uuid(),
  timestamp       timestamptz not null default now(),
  agent_id        text not null check (agent_id in
                    ('profiler','record','factchecker','orchestrator')),
  tool_called     text not null,
  race_id         text,
  candidate_id    text,
  source_url      text,
  source_id       text,
  bucket_written  text check (bucket_written in
                    ('verifiable_fact','stated_position','outside_opinion')),
  claim_id        text,
  status          text not null check (status in ('success','fail')),
  failure_reason  text,
  guard_triggered boolean not null default false
);

create index idx_log_race_candidate on action_log (race_id, candidate_id);
create index idx_log_guard on action_log (guard_triggered) where guard_triggered;
```

### Append-only enforcement

```sql
-- tool-wrapper role may only INSERT
grant insert on action_log to cap_tool_wrapper;
revoke update, delete on action_log from cap_tool_wrapper;
-- no role is granted UPDATE or DELETE; the log is immutable
```

---

## 3. Read vs. Write Logging — RESOLVED

**Decision: log EVERY tool invocation — all twelve tools, reads included.**

Rationale:
- The Tool Spec already states `log_action` runs inside every other wrapper, so reads are logged by construction.
- **Symmetric Scrutiny counts fact-checks *performed*.** A fact-check is mostly read work: cross-bucket `db_read` (T8) plus `fec_api_query` (T2) / `fl_legislature_query` (T3) reads. If only writes were logged, the system could not demonstrate how much scrutiny each candidate received — defeating the KPI.
- For read and non-write tools, `bucket_written`, `claim_id`, and `source_id` are simply `null`.

Volume is a non-issue: a few thousand rows per race.

---

## 4. Queryability for the Symmetric Scrutiny Report

The report is three aggregations over `action_log`.

```sql
-- (a) Symmetric Scrutiny — fact-checks performed per candidate per race
select candidate_id,
       count(*) filter (where agent_id = 'factchecker'
                         and status = 'success') as fact_check_actions
from action_log
where race_id = $1
group by candidate_id;

-- (b) Audit Block Rate — every guard halt, by tool
select tool_called, count(*) as halts
from action_log
where guard_triggered = true
group by tool_called;

-- (c) Traceability spot-check — any written claim missing a Source (must be empty)
select claim_id
from action_log
where bucket_written is not null
  and source_id is null;
```

The authoritative per-candidate scrutiny counts for the **published** Symmetric Scrutiny Log come from each `Profile.audit.fact_checks_performed` (PRD §7), which the Balance Audit reads. The `action_log` is the *independent audit trail* that corroborates those counts and exposes the guard/block history — i.e., the log is how you prove the published numbers were not hand-tuned.

---

## 5. Open Items

- [x] Storage backend confirmed: dedicated Supabase table `action_log`, append-only. **(Resolved 2026-06-29)**
- [x] Read-vs-write confirmed: log every invocation; `bucket_written` null for reads. **(Resolved 2026-06-29)**
- [x] Symmetric Scrutiny / Audit Block Rate / Traceability queries defined. **(Resolved 2026-06-29)**

*Companion to CAP_PRD_v1.0 and CAP_MCP_Tool_Spec_v1.0. Source of truth for the logging layer.*
