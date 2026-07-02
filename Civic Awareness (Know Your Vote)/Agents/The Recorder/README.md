# Agent 2 — The Record Agent ("What They've Done")

Build package for the Record agent. Canonical specs live in the project
root (`CAP_PRD_v1.md`, `CAP_MCP_Tool_Spec_v1.md`, `CAP_Schema_v1.md`,
`CAP_Agent_Plan_v1.md`) — this folder holds only the Recorder-specific
implementation, tests, and prompt. Where anything here disagrees with those
documents, the documents govern.

## What the Recorder is

Documents what a candidate has actually **done** on the record — votes,
sponsored bills, official actions, campaign finance — independent of
anything they say about themselves. Writes to exactly one bucket:
`verifiable_fact`. Structurally incapable of reading a news article or
opinion site: it has no `web_search` and no `fetch_source` at all (Tool
Spec §2). "Primary sources only" is a hard wall, not a guideline.

| Field | Value |
|---|---|
| Output bucket | `verifiable_fact` only |
| Source type | `primary_doc` only |
| Source scope | Hardcoded primary-API set — `fl_legislature_query` (T3), `fec_api_query` (T2), `doe_file_intake` (T1, finance filings). No allowlist needed (Tool Spec §2.5) |
| Output contract | `attributed=false`, `verification="verified"`, `verdict=null`, `issue_id` set where the action maps to an issue (optional otherwise), ≥1 `primary_doc` source |

## Files

| File | Purpose |
|---|---|
| `recorder_system_prompt.txt` | The paste-ready system prompt (verbatim from Agent Plan §3). |
| `recorder_guard_core.py` | Deterministic per-agent guards — tool grants (`denied_tool`; `web_search`/`fetch_source` hard-denied with an explicit reason), own-bucket `db_read`, `source_register` type=`primary_doc` only, and the load-bearing `claim_write` guard (wrong bucket → reject **and halt**; editorial label — hypocrisy / flip-flop / broken promise / contradiction — → reject **and halt** per the Agent Plan §3 halt condition; other contract violations → reject). |
| `test_recorder_guard_core.py` | 34 tests: grants/denials, bucket halt, editorial-label halt + neutral-language non-matches, no-Source-dropped, output contract. |

Run tests (stdlib only, no dependencies):

```
python3 -m unittest -v test_recorder_guard_core.py
```

## Integration notes for the wrapper

- The core is pure: no DB, no network, no clock. The MCP wrapper owns all
  I/O and must write each returned `log` row via `log_action` (T11) **before**
  returning to the agent — early-return rejections are not exempt
  (CAP_Schema_v1 §8).
- Two halt paths, both on `claim_write`: wrong-bucket write (PRD) and an
  editorial label in claim text (Agent Plan §3). Everything else rejects the
  single call without halting the race pipeline.
- The editorial-label matcher is deliberately narrow — only the four labeled
  framings from the blueprint, word-boundary and inflection-tolerant — so
  neutral record language ("the amendment flipped the fee schedule",
  "Promise Scholarship Act") is never caught. Presenting said-vs-did facts
  side by side passes; naming the contrast does not.
- `verdict` must be null: `verification="verified"` records that the action
  is documented in a primary record (true by construction); adjudicating
  truth of candidate statements is the Fact-Checker's job (Schema §6
  verdict rule).
- Typed-write, contract, and editorial-label violations are classed
  `guard_type='bucket'` (the §8 enum has no finer value — same convention
  as the Profiler guards).

## Status (2026-07-01)

- Enforcement layer built and tested (88/88 across the project: 11
  balance-audit, 43 Profiler, 34 Recorder).
- The prompt's structural claim ("You have NO web search and NO
  fetch_source") holds as written — both tools are hard-denied in
  `check_tool_access`, not merely un-prompted.
- Remaining before full production enforcement: wrapper wiring of the T2/T3
  fetchers and `doe_file_intake` parsing (Tool Spec §1); spine-issue mapping
  for `issue_id` assignment happens at intake, not in this guard.
