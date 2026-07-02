# Agent 3 — The Fact-Checker ("What Is True")

Build package for the Fact-Checker agent. Canonical specs live in the project
root (`CAP_PRD_v1.md`, `CAP_MCP_Tool_Spec_v1.md`, `CAP_Schema_v1.md`,
`CAP_Agent_Plan_v1.md`) — this folder holds only the Fact-Checker-specific
implementation, tests, and prompt. Where anything here disagrees with those
documents, the documents govern.

## What the Fact-Checker is

Adjudicates the truth of specific, checkable claims made by or about the
candidate, on the record, with sources. The only agent with cross-bucket
read (it needs the claims Agents 1 & 2 surfaced) — but it can never write
into `stated_position`, so it cannot rewrite the self-portrait.

| Field | Value |
|---|---|
| Output buckets | `verifiable_fact` (adjudicated) + `outside_opinion` (opinions, unrated) |
| Source scope | Allowlist B (Tier 1 / Tier 2) + primary APIs (fec, fl_legislature, doe) in read mode |
| Verdict scale | Fixed six values (PRD §6.2), stored per Schema §6 enum: `accurate`, `mostly_accurate`, `mixed`, `mostly_inaccurate`, `inaccurate`, `unverifiable` |
| Output contract | Facts: verdict set, `verification="verified"` when ≥2 Tier 1; Opinions: `verdict=null`, excluded from balance claim count; `derived_from`/`issue_id` set on split claims; ≥1 registered source always |
| Denied | `balance_audit`, `sms_dispatch`, any write to `stated_position` |

**Halt conditions (blueprint), as enforced:**

| # | Blueprint condition | Enforcement |
|---|---|---|
| H1 | Any write to `stated_position` | `validate_claim_write` → reject **and halt** |
| H2 | Rating an opinion/value judgment true/false | `outside_opinion` claim with non-null verdict → reject **and halt** |
| H3 | Non-"Unverifiable" verdict on <2 independent Tier 1 primary sources | Tier-1 count from cited sources' URLs → reject **and halt** |

## Files

| File | Purpose |
|---|---|
| `factchecker_system_prompt.txt` | The paste-ready system prompt (verbatim from the Agent 3 blueprint). |
| `allowlist_b_core.py` | Deterministic Allowlist B — static two-tier list (Tool Spec §2.5 B), enforced inside `web_search` (T5) / `fetch_source` (T6) for the Fact-Checker. Suffix matching on label boundaries, shortener denylist (no redirects), fail-closed on everything unmatched. Also provides `count_independent_tier1` for the ≥2 rule. |
| `factchecker_guard_core.py` | Deterministic per-agent guards — tool grants (`denied_tool`), cross-bucket `db_read` (all buckets), `source_register` (any type, valid `lean_tag` required), and the load-bearing `claim_write` guard (three halt paths H1–H3 + full output contract). |
| `test_allowlist_b_core.py` | 26 tests: both tiers, lookalike/mid-label/shortener/scheme fail-closed paths, independence counting. |
| `test_factchecker_guard_core.py` | 34 tests: grants/denials, cross-bucket read, lean-tag rule, all three halts, verdict scale, contract. |

Run tests (stdlib only, no dependencies):

```
python3 -m unittest -v test_allowlist_b_core.py test_factchecker_guard_core.py
```

## Design decisions (recorded, beyond-spec or spec-ambiguous)

- **Independence proxy for the ≥2 Tier-1 rule:** the spec does not define
  "independent". Implemented as *distinct Tier-1 documents by normalized
  URL* (host + path + query, fragment dropped): two different FEC filings
  count as two; the same page cited twice counts once. Query strings are
  kept (distinct API queries are distinct documents). Domain-level
  independence (e.g. requiring two different Tier-1 *sites*) is NOT
  enforced — two primary records from the same registry are legitimately
  independent evidence. Revisit if the council wants a stricter bar.
- **FL DoE domain:** matched at `dos.fl.gov` per Tool Spec §2.5 B.
  `leg.state.fl.us` is listed at full depth, so sibling `*.state.fl.us`
  hosts do not inherit Tier 1.
- **Verdict storage form:** the guard enforces the Schema §6 enum
  (`mostly_accurate`), not the prompt's display labels ("Mostly
  Accurate") — the wrapper/composer owns the 1:1 display mapping. A
  display label in the `verdict` field is rejected.
- **Source types on claims are unrestricted** (unlike Agents 1 & 2):
  split claims must be able to cite the originating `candidate_self`
  source for "they said it" provenance (Schema §6 `derived_from` rule).
  Only the Tier-1 URL count gates verdicts.
- **`verification='verified'` is lawful only with ≥2 Tier 1** — even on
  an `unverifiable` verdict; otherwise use `single_source`/`unverified`.
- **`attributed` must be an explicit boolean**, either value lawful — it
  records "did they say it", never "is it true" (Schema §6 two-axes rule).
- **Tier-2-only evidence with a verdict is H3, not a soft reject** — the
  "never inherit another checker's conclusion" rule is a halt, same
  severity as the blueprint's ≥2 condition it instantiates.
- Typed-write / contract violations are classed `guard_type='bucket'`;
  Allowlist B blocks are `'allowlist'`; grants are `'denied_tool'`
  (Schema §8 enum, same convention as the Profiler and Record guards).

## Integration notes for the wrapper

- Both cores are pure: no DB, no network, no clock. The MCP wrapper owns
  all I/O and must write each returned `log` row via `log_action` (T11)
  **before** returning to the agent — early-return rejections are not
  exempt (CAP_Schema_v1 §8).
- `validate_claim_write` takes `sources` (source_id → registered Source
  row with `url` and `type`) — the wrapper reads these from the DB; the
  agent cannot forge a registration.
- Each successful adjudication (`claim_write` into `verifiable_fact` with
  a verdict) must increment that candidate's
  `Profile.audit.fact_checks_performed` — recomputed from `action_log`,
  which the Symmetric Scrutiny audit reads (Schema §7). The prompt warns
  the agent it is being audited; the count itself is wrapper-side.
- Suffix matching here is host-based, not PSL registrable-domain — safe
  because Allowlist B is a small static list of trusted domains (no
  attacker-controlled entries), unlike Allowlist A.

## Status (2026-07-01)

- Enforcement layer built and tested (60/60 in this folder; 148/148
  project-wide including balance-audit, Profiler, and Recorder suites).
- All three blueprint halt conditions are wrapper-enforced (H1–H3), so
  the prompt's constitution is backed structurally, not just verbally.
- Remaining before full production enforcement: the wrapper must join
  `claim_source` rows and pass the registered Source rows into
  `validate_claim_write`; `fact_checks_performed` increment wiring
  (Schema §7) lives in the wrapper/orchestrator, not this core.
