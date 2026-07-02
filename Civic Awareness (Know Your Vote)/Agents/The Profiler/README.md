# Agent 1 — The Profiler ("What They Say")

Build package for the Profiler agent. Canonical specs live in the project
root (`CAP_PRD_v1.md`, `CAP_MCP_Tool_Spec_v1.md`, `CAP_Schema_v1.md`,
`CAP_Agent_Plan_v1.md`) — this folder holds only the Profiler-specific
implementation, tests, and prompt. Where anything here disagrees with those
documents, the documents govern.

## What the Profiler is

Captures how a candidate presents **themselves** — the self-portrait, in
their own framing. Writes to exactly one bucket: `stated_position`.
Structurally incapable of fact-checking: it cannot reach any primary API or
independent source (Tool Spec §2).

| Field | Value |
|---|---|
| Output bucket | `stated_position` only |
| Source type | `candidate_self` only |
| Source scope | Candidate-controlled only, enforced by Allowlist A |
| Output contract | `attributed=true`, `verification="single_source"`, `verdict=null`, `issue_id` set, ≥1 `candidate_self` source |

## Files

| File | Purpose |
|---|---|
| `profiler_system_prompt.txt` | The paste-ready system prompt (verbatim from Agent Plan §2). |
| `allowlist_a_core.py` | Deterministic Allowlist A matcher — enforced inside `web_search` (T5) / `fetch_source` (T6) when the caller is the Profiler. Official-site registrable-domain match, platform folding + verified-handle match, shortener denylist (no redirects), fail-closed on empty scope. |
| `profiler_guard_core.py` | Deterministic per-agent guards — tool grants (`denied_tool`), own-bucket `db_read`, `source_register` type=`candidate_self` only, and the load-bearing `claim_write` guard (wrong bucket → reject **and halt**; contract violations → reject). |
| `test_allowlist_a_core.py` | 25 tests: pass rules + every fail-closed path. |
| `test_profiler_guard_core.py` | 18 tests: grants/denials, bucket halt, no-Source-dropped, output contract. |

Run tests (stdlib only, no dependencies):

```
python3 -m unittest -v test_allowlist_a_core.py test_profiler_guard_core.py
```

## Integration notes for the wrapper

- Both cores are pure: no DB, no network, no clock. The MCP wrapper owns all
  I/O and must write each returned `log` row via `log_action` (T11) **before**
  returning to the agent — early-return rejections are not exempt
  (CAP_Schema_v1 §8).
- Inject a full PSL extractor (e.g. `tldextract` with its bundled snapshot)
  as `registrable_domain`; the built-in default covers a US-centric suffix
  subset and fails closed on unknown suffixes.
- Only `status='verified'` social-account rows are admitted (Schema §3
  admission rule); the wrapper should pass the candidate's rows as stored.
- Guard added beyond spec (recorded in Schema §10): an `official_site` that
  is itself a social platform or shortener page never admits by domain match —
  it must enter via a verified social-account row.
- Typed-write violations are classed `guard_type='bucket'` (the §8 enum has
  no finer value).

## Status (2026-07-01)

- Enforcement layer built and tested (54/54 across the project, incl. the
  balance-audit suite).
- Matcher landed before the agent chat, so the prompt's "the wrapper will
  BLOCK" promise holds as written (closes Schema §10 items 1 and 3).
- Remaining before full production enforcement: intake must populate
  `candidate_social_account` rows with provenance (Schema §3); handle
  freshness re-verification window (Schema §10) still open.
