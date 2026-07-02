# Civic Awareness Project (CAP) — Balance Audit Specification
## Companion to CAP_PRD_v1.0, CAP_MCP_Tool_Spec_v1.0, CAP_Schema_v1.0

**Status:** Draft v1.1
**Last Updated:** 2026-06-29
**Revision v1.1:** split `claim_count` into `verifiable_fact_count` (hard gate) and `stated_position_count` (flag); added `spine_issues_covered` coverage flag. Aligns with CAP_Schema_v1 §7.1. Supersedes the single-`claim_count` model of v1.0.
**Closes Tool Spec deferred item:** "Confirm variance formula `(max − min) / max` vs. mean-relative spread for 3+ candidate races."

---

## 0. Governing Principles (inherited)

- The Balance Audit is **deterministic — no AI in the loop** (PRD §6.3, §9; Tool Spec §0, §4).
- Runs **once per race**, after all three agents finish, before composition.
- On HALT, the orchestrator **cannot** call `sms_dispatch`; the brief is blocked until a human resolves the imbalance (§6).
- This tool produces the **Symmetric Scrutiny Log** published for transparency (PRD §10 risk mitigation).

---

## 1. Architecture — one core, two adapters

Unchanged from v1.0. The audit is a **pure core** with two thin adapters; no logic is duplicated.

```
                 ┌─────────────────────────┐
                 │  balance_audit_core()   │   pure function
                 │  Profiles[] → result    │   (no I/O, no AI)
                 └───────────┬─────────────┘
            ┌────────────────┴────────────────┐
   ┌────────▼─────────┐              ┌────────▼─────────┐
   │ MCP wrapper (T10)│              │   CLI adapter    │
   │ orchestrator     │              │  humans + CI     │
   └──────────────────┘              └──────────────────┘
```

The MCP wrapper `db_read`s the Profiles, calls the core, writes results back to each Profile, and routes through `log_action`. The CLI (built last) runs the same core for the human review gate, CI, and regenerating the published log.

---

## 2. Inputs

```json
{
  "race_id": "string",
  "thresholds": {
    "word_count_pct": 15,
    "verifiable_fact_pct": 15,
    "stated_position_pct": 15,
    "fact_check_pct": 10
  }
}
```

Defaults from PRD §4 KPIs; passable for override/testing only. `spine_issues_covered` uses a gap check (any difference flags), so it has no percentage threshold.

---

## 3. Logic

1. `db_read` all `Profile` objects for `race_id`.
2. Per candidate, extract five quantities:
   - `word_count` ← `audit.word_count`
   - `verifiable_fact_count` ← number of `verifiable_fact` claims (Position/Profile `facts`)
   - `stated_position_count` ← number of `stated_position` claims (Profile `positions`)
   - `fact_checks` ← `audit.fact_checks_performed`
   - `spine_issues_covered` ← `audit.spine_issues_covered`
   - **`outside_opinion` claims are counted in NO metric.**
3. For the four count/word metrics compute `variance_pct = (max − min) / max × 100` (rounded 1 decimal). For coverage compute `gap = max − min`.
4. Classify each metric as a **gate** or a **flag** and evaluate:

| Metric | Kind | Threshold | On breach |
|---|---|---|---|
| `fact_checks` | **gate** | < 10% | HALT |
| `verifiable_fact_count` | **gate** | < 15% | HALT |
| `word_count` | **gate** | < 15% | HALT |
| `stated_position_count` | flag | < 15% | flag `stated_position_asymmetry` |
| `spine_issues_covered` | flag | gap = 0 | flag `issue_coverage_asymmetry` |

5. `verdict = HALT` if **any gate** breaches, else `PASS`. Flags are raised independently and never change the verdict.
6. Write `balance_check_passed` to every Profile; set `flag_reason` / `flagged_at` per candidate (the under-scrutinized / under-covered candidate).

### Why gates vs. flags

`verifiable_fact` and `fact_checks` are the scrutiny the neutrality claim rests on → they gate publication. `word_count` gates equal brief real estate (the composer caps per-candidate contribution symmetrically so this reflects allocated space, not raw footprint). `stated_position_count` and `spine_issues_covered` are candidate-authored / silence-driven — an imbalance is surfaced for a human, never "fixed" by fabricating content for the quiet candidate. This is what stops self-portrait size or issue silence from masking or manufacturing a scrutiny imbalance.

### Variance formula — `(max − min) / max × 100`, all race sizes

Unchanged and locked. Measures the gap between the most- and least-scrutinized candidate, so no candidate can be held to a lower standard regardless of how many others are balanced. Mean/CV rejected (dilution): fact-checks `[5,5,5,5,4]` → CV ≈ 8.3% would PASS, but `(max−min)/max = 20%` correctly HALTs. Reads as "the least-scrutinized candidate received X% fewer than the most."

---

## 4. Output — PASS (no flags)

```json
{
  "verdict": "PASS",
  "race_id": "FL-28-general",
  "metrics": {
    "word_count":            {"min": 412, "max": 455, "variance_pct": 9.5,  "threshold": 15, "kind": "gate", "breach": false},
    "verifiable_fact_count": {"min": 5,   "max": 5,   "variance_pct": 0.0,  "threshold": 15, "kind": "gate", "breach": false},
    "fact_checks":           {"min": 5,   "max": 5,   "variance_pct": 0.0,  "threshold": 10, "kind": "gate", "breach": false},
    "stated_position_count": {"min": 4,   "max": 4,   "variance_pct": 0.0,  "threshold": 15, "kind": "flag", "flagged": false},
    "spine_issue_coverage":  {"min": 4,   "max": 4,   "gap": 0,             "kind": "flag", "flagged": false}
  },
  "flags": []
}
```

## 5. Output — HALT (with a flag also raised)

```json
{
  "verdict": "HALT",
  "race_id": "FL-15-general",
  "breached_metrics": ["verifiable_fact_count"],
  "metrics": {
    "word_count":            {"min": 430, "max": 445, "variance_pct": 3.4,  "threshold": 15, "kind": "gate", "breach": false},
    "verifiable_fact_count": {"min": 6,   "max": 12,  "variance_pct": 50.0, "threshold": 15, "kind": "gate", "breach": true,
                              "candidates": {"low": "cand_021", "high": "cand_020"}},
    "fact_checks":           {"min": 5,   "max": 5,   "variance_pct": 0.0,  "threshold": 10, "kind": "gate", "breach": false},
    "stated_position_count": {"min": 3,   "max": 9,   "variance_pct": 66.7, "threshold": 15, "kind": "flag", "flagged": true,
                              "candidates": {"low": "cand_020", "high": "cand_021"}},
    "spine_issue_coverage":  {"min": 3,   "max": 4,   "gap": 1,             "kind": "flag", "flagged": true,
                              "candidates": {"low": "cand_021", "high": "cand_020"}}
  },
  "flags": ["stated_position_asymmetry", "issue_coverage_asymmetry"],
  "flagged_at": "2026-06-29T14:02:00Z"
}
```

This is exactly the masked-scrutiny case the split exists to catch: the old blended `claim_count` would read 15 vs 15 (0% → PASS), hiding a 50% record-scrutiny gap. Split, `verifiable_fact_count` breaches and the pipeline HALTs.

---

## 6. Halt behavior

On HALT the orchestrator is blocked from `sms_dispatch`. Resolution is a human action — re-running Agent 3 (or Agent 2) to bring the under-scrutinized candidate to the same standard, then re-running the audit (via CLI) until PASS. Flags do **not** block dispatch; they are surfaced to the human reviewer at the gate. Every halt is countable via `action_log.guard_triggered` (with `guard_type='bucket'`/audit) for the Audit Block Rate KPI.

---

## 7. The published artifact — Symmetric Scrutiny Log

The per-race results are published as the Symmetric Scrutiny Log (PRD §10). It shows, per candidate: word count, verifiable-fact count, stated-position count, fact-checks performed, spine-issue coverage, each metric's variance vs. threshold, the PASS / HALT verdict, and any flags raised. Reference rendering: `CAP_Symmetric_Scrutiny_Log.html` (update to show the split counts and flags).

---

## 8. Open Items

- [x] Variance formula confirmed: `(max − min) / max × 100`, all sizes; mean/CV rejected. **(Resolved 2026-06-29)**
- [x] Architecture: deterministic core + MCP wrapper + CLI adapter. **(Resolved 2026-06-29)**
- [x] Metric split into `verifiable_fact_count` (gate) + `stated_position_count` (flag). **(Resolved 2026-06-29, v1.1)**
- [x] `spine_issues_covered` coverage flag added. **(Resolved 2026-06-29, v1.1)**
- [ ] Update `CAP_Symmetric_Scrutiny_Log.html` to render split counts + flags.

*Companion to CAP_PRD_v1.0, CAP_MCP_Tool_Spec_v1.0, CAP_Schema_v1.0. Source of truth for the balance-audit layer.*
