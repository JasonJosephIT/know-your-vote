# Civic Awareness Project (CAP) — MCP Tool Layer Specification
## Companion to CAP_PRD_v1.0 — Detailing PRD §9 ("MCP Architecture & Tools")

**Status:** Draft v1.0
**Last Updated:** 2026-06-29
**Closes PRD §12 blocker:** "Define MCP tool list and logging schema"

---

## 0. Governing Principles (from PRD)

- Agents interact with the data pipeline **only** through MCP tool wrappers. No direct DB writes, no raw HTTP.
- All claims map to a `Source` object or are dropped. No exceptions.
- Bucket writes are enforced at the schema level. A wrong-bucket write **halts the pipeline**.
- The Balance Audit and Log tools are **deterministic** — no AI in the loop.
- Agent buckets are sacred: `stated_position`, `verifiable_fact`, `outside_opinion` must never be cross-contaminated.

---

## 1. Full Tool List

Twelve tools across five layers. Every agent reaches the database and external APIs only through these.

| # | Tool | Layer | Determinism | Purpose |
|---|---|---|---|---|
| T1 | `doe_file_intake` | Intake | Deterministic | Download + parse FL DoE tab-delimited candidate file; filter to target races |
| T2 | `fec_api_query` | Primary API | Deterministic fetch | Query FEC API for federal candidates / finance filings in FL-10/15/23/28 |
| T3 | `fl_legislature_query` | Primary API | Deterministic fetch | Bill text, vote records, legislative journals (Record Agent's spine) |
| T4 | `jurisdiction_resolve` | Intake | Deterministic | ZIP → congressional district + statewide race set |
| T5 | `web_search` | Discovery | Non-deterministic | Allowlist-enforced search; candidate URLs (Agent 1) or independent sources (Agent 3) |
| T6 | `fetch_source` | Discovery | Deterministic fetch | Retrieve a specific URL's content; tags retrieval time for the Source object |
| T7 | `source_register` | Data write | Deterministic | Create/dedupe a `Source` object; returns `source_id`. Every claim must reference one |
| T8 | `db_read` | Data read | Deterministic | Read Race / Candidate / Claim / Profile / Source objects |
| T9 | `claim_write` | Data write | Deterministic + guard | Write a `Claim` into a bucket. Validates bucket against caller identity; wrong bucket → reject + halt |
| T10 | `balance_audit` | Synthesis | Deterministic (no AI) | Compute variance, return PASS / HALT with exact numbers |
| T11 | `log_action` | Observability | Deterministic | Append-only action log (every tool call routes through it) |
| T12 | `sms_dispatch` | Delivery | Deterministic | Twilio trial send — gated behind human review, owner phone only |

**Design notes:**
- `source_register` (T7) is separate from `claim_write` (T9) so a Source exists and is typed *before* any claim can cite it — this is what makes "no Source → dropped" mechanically enforceable.
- `log_action` (T11) is **not** called by agents directly; it is invoked automatically inside every other tool wrapper, so logging cannot be skipped.

---

## 2. Per-Agent Authorization

The guard is enforced in the tool wrapper, keyed on the caller's `agent_id`. Bucket-write rights are the load-bearing constraint.

| Tool | Agent 1 Profiler | Agent 2 Record | Agent 3 Fact-Checker | Synthesis/Orchestrator |
|---|---|---|---|---|
| `web_search` (T5) | ✅ candidate-domain allowlist only | ❌ **denied** | ✅ independent-source allowlist | ❌ |
| `fetch_source` (T6) | ✅ candidate domains only | ❌ | ✅ any allowlisted | ❌ |
| `fec_api_query` (T2) | ❌ | ✅ | ✅ (read) | ❌ |
| `fl_legislature_query` (T3) | ❌ | ✅ | ✅ (read) | ❌ |
| `doe_file_intake` (T1) | ❌ | ✅ (finance filings) | ✅ (read) | ✅ |
| `source_register` (T7) | ✅ type=`candidate_self` only | ✅ type=`primary_doc` only | ✅ any type | ❌ |
| `db_read` (T8) | ✅ own bucket | ✅ own bucket | ✅ **all buckets** (needs claims from 1&2) | ✅ all |
| `claim_write` (T9) | ✅ `stated_position` **only** | ✅ `verifiable_fact` **only** | ✅ `verifiable_fact` + `outside_opinion` | ❌ |
| `balance_audit` (T10) | ❌ | ❌ | ❌ | ✅ |
| `sms_dispatch` (T12) | ❌ | ❌ | ❌ | ✅ (post human-gate) |

**Enforcement points (mapped to PRD rules):**
- **Agent 1 (Profiler)** is structurally incapable of fact-checking — it cannot reach any primary API or independent source, and its only write target is `stated_position`. ("Never fact-check.")
- **Agent 2 (Record)**'s `web_search` denial is enforced at the wrapper, not by prompt — "primary sources only" becomes a hard wall, not a guideline.
- **Agent 3 (Fact-Checker)** is the only agent with cross-bucket read, which it needs to pull claims surfaced by Agents 1 & 2, but it still cannot write into `stated_position`, so it cannot rewrite the self-portrait.

---

## 2.5 Domain Allowlists (completes the tool layer)

The allowlists are enforced inside the `web_search` (T5) and `fetch_source` (T6) wrappers. They are configuration of the tool layer, not content of the agent prompts — agents reference source scope abstractly; the wrapper decides pass/block.

### Allowlist A — Candidate-controlled (Agent 1 / Profiler)

**Not a static global list.** Scoped per-candidate, derived from the `Candidate` object at intake.

A requested URL passes **only if**:
- its registrable domain matches the candidate's registered `official_site`, **OR**
- it is a known social platform (`x.com`, `facebook.com`, `instagram.com`, `youtube.com`) **AND** the handle/path matches that candidate's registered handle for that platform.

Everything else — news outlets, PACs, endorsers, party sites, third parties — is **blocked**. This is what keeps the self-portrait genuinely self-authored.

> **Schema dependency:** The PRD `Candidate` object has `official_site` but no field for social handles, so there is nothing to match against. Intake must add a `social_accounts` field to `Candidate` (platform → registered handle). Until this exists, Allowlist A can only enforce the `official_site` domain.

### Allowlist B — Independent authoritative (Agent 3 / Fact-Checker)

Static, curated, two tiers. Every retrieved source is lean-tagged via `Source.lean_tag`.

**Tier 1 — primary evidence (counts toward the ≥2 independent sources required for a verdict):**
`fec.gov`, FL Division of Elections (`dos.fl.gov` / `dos.elections`), `flsenate.gov`, `myfloridahouse.gov`, `leg.state.fl.us`, `congress.gov`, `govinfo.gov`, GAO (`gao.gov`), CBO (`cbo.gov`), BLS (`bls.gov`), `census.gov`, `courtlistener.com`.

**Tier 2 — nonpartisan reference / corroboration (supporting only; not sufficient alone for a verdict):**
`ballotpedia.org`, `votesmart.org`, `opensecrets.org`, `politifact.com`, `factcheck.org`, `apnews.com`.

> **Resolved (2026-06-29):** Fact-checking outlets (PolitiFact, FactCheck.org, AP) are included in **Tier 2** as corroboration only — lean-tagged, and never sufficient on their own for a verdict. They are kept **out of Tier 1** so Agent 3 grounds verdicts in primary evidence rather than inheriting another checker's conclusion. A verdict other than "Unverifiable" still requires ≥2 independent **Tier 1** primary sources.

### Agent 2 (Record) — no allowlist

Agent 2 has no `web_search`. Its source scope is the hardcoded API set: `fec_api_query` (T2), `fl_legislature_query` (T3), and `doe_file_intake` (T1) finance filings. No domain matching needed.

---

## 3. Logging Schema (`log_action`)

Append-only. One row per tool invocation, written by the wrapper before returning to the agent.

```json
{
  "log_id": "string (uuid)",
  "timestamp": "ISO8601",
  "agent_id": "profiler | record | factchecker | orchestrator",
  "tool_called": "string (T1–T12 name)",
  "race_id": "string | null",
  "candidate_id": "string | null",
  "source_url": "url | null",
  "source_id": "string | null",
  "bucket_written": "verifiable_fact | stated_position | outside_opinion | null",
  "claim_id": "string | null",
  "status": "success | fail",
  "failure_reason": "string | null",
  "guard_triggered": "boolean"
}
```

**Field rationale:**
- The six PRD-required fields: `timestamp`, `agent_id`, `tool_called`, `source_url`, `bucket_written`, `status`.
- `race_id` / `candidate_id` / `claim_id` make the log directly queryable for the **Symmetric Scrutiny** KPI (fact-checks per candidate per race).
- `guard_triggered` makes every wrong-bucket / denied-tool rejection independently countable for the **Audit Block Rate** KPI.
- `bucket_written` is `null` for reads and non-write tools.

---

## 4. Balance Audit Tool Spec (`balance_audit`)

Deterministic, no AI. Runs once per race after all three agents finish, before composition.

### Inputs

```json
{
  "race_id": "string",
  "thresholds": {
    "word_count_pct": 15,
    "claim_count_pct": 15,
    "fact_check_pct": 10
  }
}
```

Defaults pulled from PRD §4 KPIs; passable for override/testing.

### Logic

1. `db_read` all `Profile` objects for `race_id` → per-candidate `word_count`, `claim_count`, `fact_checks_performed`.
2. **`claim_count` counts `verifiable_fact` + `stated_position` claims only. `outside_opinion` claims are EXCLUDED** — opinions are not scrutiny and must not inflate the balance metric.
3. For each of the three metrics, compute variance across candidates as `(max − min) / max × 100`, rounded to 1 decimal.
4. Compare each variance to its threshold.
5. Write `balance_check_passed` to every candidate's Profile; set `flagged_at` if HALT.

**Variance definition:** `(max − min) / max × 100`. Chosen for simplicity and unambiguity in 2-candidate races. (Design decision; revisit if races with 3+ candidates need a mean-relative spread instead.)

### Output — PASS

```json
{
  "verdict": "PASS",
  "race_id": "FL-28-general",
  "metrics": {
    "word_count":  {"min": 412, "max": 455, "variance_pct": 9.5, "threshold": 15, "breach": false},
    "claim_count": {"min": 8,   "max": 9,   "variance_pct": 11.1, "threshold": 15, "breach": false},
    "fact_checks": {"min": 5,   "max": 5,   "variance_pct": 0.0, "threshold": 10, "breach": false}
  }
}
```

### Output — HALT

```json
{
  "verdict": "HALT",
  "race_id": "FL-28-general",
  "breached_metrics": ["fact_checks"],
  "metrics": {
    "word_count":  {"min": 412, "max": 455, "variance_pct": 9.5,  "threshold": 15, "breach": false},
    "claim_count": {"min": 8,   "max": 9,   "variance_pct": 11.1, "threshold": 15, "breach": false},
    "fact_checks": {"min": 4,   "max": 6,   "variance_pct": 33.3, "threshold": 10, "breach": true,
                    "candidates": {"low": "cand_002", "high": "cand_001"}}
  },
  "flagged_at": "2026-06-29T14:02:00Z"
}
```

### Halt behavior

On HALT, the orchestrator **cannot** call `sms_dispatch` — the brief is blocked until a human resolves the imbalance (e.g., Agent 3 re-runs to check more claims for the under-scrutinized candidate). This is the "detected and blocked by the system itself" behavior from PRD §2.

---

## 5. Open Items

- [x] Domain allowlists defined: candidate-controlled (Agent 1, §2.5 A) and independent-authoritative (Agent 3, §2.5 B). **(Resolved 2026-06-29)**
- [x] `outside_opinion` excluded from `claim_count` in the balance audit. **(Resolved 2026-06-29)**
- [ ] **Schema change required:** add `social_accounts` field to the PRD `Candidate` object so Allowlist A can match social handles. Owner: intake layer.
- [x] Fact-checking outlets (PolitiFact, FactCheck.org, AP) added to Allowlist B Tier 2 as corroboration only. **(Resolved 2026-06-29)**

### Deferred to log / balance-audit chat (next session)
- [ ] Confirm variance formula `(max − min) / max` vs. mean-relative spread for 3+ candidate races.
- [ ] Confirm storage backend for the action log (Supabase table per PRD §12 DB recommendation).

**Tool layer is otherwise complete and frozen. Next: log + balance-audit layer, then the three agent chats built against this spec.**

---

*Companion document to CAP_PRD_v1.0. Source of truth for the MCP tool layer.*
