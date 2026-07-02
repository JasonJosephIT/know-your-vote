# Civic Awareness Project (CAP) — Data Schema v1
## Authoritative schema. Supersedes and expands PRD §7.

**Status:** v1.0
**Last Updated:** 2026-06-29
**Supersedes:** PRD §7 (Data Schema). Where this document and PRD §7 differ, this document governs.
**Incorporates:** Council review of 2026-06-29 (database, neutrality/integrity, and pipeline-enforcement seats), and the balance-metric split (`stated_position` vs `verifiable_fact`).

---

## 0. What changed from PRD §7 (summary)

1. **Social handles are modeled** — new `candidate_social_account` + `social_platform` tables so Allowlist A can enforce social matching (closes the Tool Spec schema dependency).
2. **Handle trust is a provenance chain**, not an assertion — only `verified` handles enter Allowlist A.
3. **`Claim` gains a `verdict` field** — the six-value Fact-Checker verdict now has a queryable home.
4. **Balance metric is split** — `Profile.audit` carries `stated_position_count` and `verifiable_fact_count` separately; `verifiable_fact` is the hard gate, `stated_position` is a human-review flag.
5. **Integrity constraints added** — primary keys, uniqueness, enum `CHECK`s, and a `claim_source` join table so "no Source → dropped" is enforced by referential integrity.
6. **Issue / Position layer added** — content is organized by shared political **Issues** (a fixed per-race spine applied to every candidate, plus candidate-specific extras). A **Position** is a candidate's stance on one issue, built from claims. Issues sit *above* the buckets; they do not change them.
7. **Attribution split from verification** — `Claim.attributed` ("did the candidate state it") is distinct from `verification`/`verdict` ("is it true"). A candidate can accurately state a false claim or vaguely state a true one; the two axes are independent.
8. **Spine-issue coverage is a soft flag** — uneven coverage of shared issues raises `issue_coverage_asymmetry` for human review, never a hard halt.

---

## 1. Race

Unchanged from PRD §7 in shape. Constraints added.

```json
{
  "race_id": "string (PK)",
  "office": "string",
  "level": "federal | state",
  "district": "string | null",
  "election": "primary | general",
  "is_open_seat": "boolean",
  "incumbent_id": "candidate_id | null",
  "candidate_ids": ["candidate_id"],
  "key_dates": {
    "primary_date": "ISO8601",
    "general_date": "ISO8601",
    "registration_deadline": "ISO8601"
  }
}
```

- **PK:** `race_id`.
- **CHECK:** `level IN ('federal','state')`, `election IN ('primary','general')`.

---

## 2. Candidate

`social_accounts` is now a **relation**, not an embedded field (see §3). The `Candidate` object exposes it as a read-only projection.

```json
{
  "candidate_id": "string (PK)",
  "legal_name": "string",
  "party": "REP | DEM | NPA | other",
  "office_sought": "string",
  "is_incumbent": "boolean",
  "qualifying_status": "qualified | withdrawn | other",
  "prior_offices": ["string"],
  "official_site": "url | null",
  "fec_id": "string | null",
  "social_accounts": "[projection of candidate_social_account rows — read model]"
}
```

- **PK:** `candidate_id`.
- **CHECK:** `party IN ('REP','DEM','NPA','other')`, `qualifying_status IN ('qualified','withdrawn','other')`.
- **Ingestion gate:** `social_accounts` are ingested and used **only** when `qualifying_status = 'qualified'`. Withdrawn/other candidates' accounts are not pulled (prevents a withdrawn candidate's still-active account from skewing a race).

---

## 3. candidate_social_account  *(new)*

The Profiler's Allowlist A does a reverse lookup — "this handle → whose is it?" — on every fetch. That is keyed on the handle, so it lives in an indexed table, not a JSON blob.

```sql
CREATE TABLE candidate_social_account (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   text NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
  platform       text NOT NULL REFERENCES social_platform(platform),
  handle         text NOT NULL,                 -- display form, e.g. '@JaneDoe'
  handle_norm    text NOT NULL,                 -- MATCH KEY: casefold, strip '@' and trailing slash, NFC, percent-decode
  url            text,                           -- canonical display URL ONLY; never the match key
  provenance     text NOT NULL
                   CHECK (provenance IN ('linked_from_official_site','doe_filing','fec_filing')),
  provenance_source_id text REFERENCES source(source_id),  -- the doc that LINKS to this handle
  status         text NOT NULL DEFAULT 'unverified'
                   CHECK (status IN ('verified','unverified','disputed')),
  verified_at    timestamptz,
  UNIQUE (platform, handle_norm)                 -- one handle -> one candidate; a collision is an intake flag
);
CREATE INDEX idx_social_lookup    ON candidate_social_account (platform, handle_norm);
CREATE INDEX idx_social_candidate ON candidate_social_account (candidate_id);
```

**Trust rule (load-bearing):** a handle is `verified` only if a candidate-authoritative source *points at it* — the `official_site` links to it, or a DoE/FEC filing lists it — and `provenance_source_id` references that document. A handle typed from nowhere is `unverified`.

**Admission rule:** the `web_search` (T5) / `fetch_source` (T6) wrappers admit **only `status = 'verified'`** handles to Allowlist A. `unverified` / `disputed` handles produce zero claims — "no Source → dropped," applied in substance.

**Symmetric standard:** the same provenance bar applies to every candidate in a race. If one candidate has no verifiable social provenance, the outcome is "no social for that candidate" — never a lowered bar for anyone.

---

## 4. social_platform  *(new reference table)*

New platforms are a data insert, not a migration. Also encodes the host aliases the matcher folds.

```sql
CREATE TABLE social_platform (
  platform       text PRIMARY KEY,       -- canonical: 'twitter','facebook','instagram','youtube', ...
  display_name   text NOT NULL,
  host_pattern   text NOT NULL,          -- regex of accepted hosts, e.g. '^(www\.|m\.|mobile\.)?(x|twitter)\.com$'
  handle_in_path boolean NOT NULL DEFAULT true,
  active         boolean NOT NULL DEFAULT true
);
```

Seed: `twitter` (`x.com`/`twitter.com`/`mobile.`), `facebook` (`facebook.com`/`m.`/`fb.com`), `instagram` (`instagram.com`), `youtube` (`youtube.com`/`m.`/`youtu.be`; handle at `/@handle`, `/channel/`, `/user/`, `/c/`).

> **Depends on:** the Allowlist A matching algorithm (PSL registrable-domain extraction, host→platform folding, per-platform handle extraction, shortener denylist, fail-closed on empty). That algorithm is a Tool Spec §2.5 edit, not a schema field — tracked in §10 below.

---

## 5. Source

Adds normalized-URL uniqueness (so `source_register` dedupe is enforced) and a provenance note for self-sources.

```json
{
  "source_id": "string (PK)",
  "url": "url",
  "url_norm": "string (unique)",
  "publisher": "string",
  "type": "factual_reporting | opinion | primary_doc | candidate_self",
  "lean_tag": "left | center-left | center | center-right | right | N/A",
  "retrieved_at": "ISO8601"
}
```

- **PK:** `source_id`. **UNIQUE:** `url_norm` (same host-normalization as the allowlist matcher).
- **CHECK:** `type IN ('factual_reporting','opinion','primary_doc','candidate_self')`; `lean_tag IN (...)`.

---

## 6. Claim

Adds `verdict` (the Fact-Checker's six-value scale now has a queryable home) and moves `source_ids` to a join table.

```json
{
  "claim_id": "string (PK)",
  "candidate_id": "string (FK)",
  "race_id": "string (FK)",
  "issue_id": "string (FK) | null",
  "text": "string",
  "bucket": "verifiable_fact | stated_position | outside_opinion",
  "attributed": "boolean",
  "derived_from": "claim_id | null",
  "verdict": "accurate | mostly_accurate | mixed | mostly_inaccurate | inaccurate | unverifiable | null",
  "verification": "verified | single_source | unverified"
}
```

- **PK:** `claim_id`. **FKs:** `candidate_id`, `race_id`, `issue_id`, `derived_from` (self-ref).
- **CHECK:** `bucket IN ('verifiable_fact','stated_position','outside_opinion')`; `verification IN ('verified','single_source','unverified')`; `verdict IN ('accurate','mostly_accurate','mixed','mostly_inaccurate','inaccurate','unverifiable')` **or NULL**.
- **Rule (verdict):** `verdict` is non-null only for `bucket = 'verifiable_fact'` claims adjudicated by the Fact-Checker; null for `stated_position` and `outside_opinion`.
- **Rule (attribution vs. verification — the two axes):**
  - `attributed = true` means the candidate actually said/asserted this claim, sourced to a `candidate_self` source. This is what makes a claim part of the candidate's self-portrait. `stated_position` claims are always `attributed = true`; Record-agent `verifiable_fact` claims (what they *did*, from the record) are `attributed = false`.
  - `verification` / `verdict` are the *independent* evidentiary axis — is the claim true. A claim can be `attributed = true` (they said it) and `verdict = inaccurate` (it's false), or `attributed = false` (from the record) and `verified`. Never conflate "they said it" with "it is true."
- **Rule (`derived_from`):** when the Fact-Checker splits a candidate statement into its opinion and its supporting fact, the derived `verifiable_fact` and/or `outside_opinion` claims point back to the originating `stated_position` claim via `derived_from`. Same statement, separate typed claims, buckets never cross-contaminated.

### 6.1 claim_source  *(new join table)*

Replaces the embedded `source_ids` array so every cited source is FK-validated — "no Source → dropped" enforced by the database.

```sql
CREATE TABLE claim_source (
  claim_id   text NOT NULL REFERENCES claim(claim_id) ON DELETE CASCADE,
  source_id  text NOT NULL REFERENCES source(source_id),
  PRIMARY KEY (claim_id, source_id)
);
```

A claim with zero `claim_source` rows is invalid and must not be published.

---

## 6.2 Issue  *(new)*

A shared political topic. Two tiers:

- **spine** — the fixed set of issues applied to **every** candidate in the race. This is the apples-to-apples comparison axis; coverage of spine issues is auditable (§7.1).
- **candidate** — an extra issue a specific candidate campaigns on that is not on the spine. Shown in that candidate's brief; **not** expected of other candidates and **not** counted toward coverage parity.

```json
{
  "issue_id": "string (PK)",
  "race_id": "string (FK)",
  "tier": "spine | candidate",
  "candidate_id": "string (FK) | null",   // null for spine issues; set for candidate extras
  "title": "string (neutral wording)",
  "description": "string | null",
  "source_id": "string | null",           // provenance/justification for including this issue
  "display_order": "int"
}
```

- **CHECK:** `tier IN ('spine','candidate')`; `tier='spine'` ⇒ `candidate_id IS NULL`; `tier='candidate'` ⇒ `candidate_id IS NOT NULL`.
- **Neutrality rule (the editorial lever):** the **spine** issue set is fixed per race, **neutrally worded**, applied identically to all candidates, and its selection is **logged** (who/what/why) to `action_log`. Choosing and wording the spine is an editorial decision sitting upstream of every candidate — it gets the same transparency as every other CAP decision. Candidate-tier issues are derived only from that candidate's own controlled sources.

---

## 6.3 Position  *(new)*

A candidate's stance on one issue, assembled from claims. This is the layer the brief renders under each issue heading.

```json
{
  "position_id": "string (PK)",
  "candidate_id": "string (FK)",
  "race_id": "string (FK)",
  "issue_id": "string (FK)",
  "stance_summary": "string",             // neutral synthesis of the candidate's stance
  "claim_ids": ["claim_id"],              // the stated_position / verifiable_fact / outside_opinion claims under it
  "attributed": "boolean",                // true if backed by >=1 verified candidate-controlled statement
  "coverage": "stated | no_stated_position_found"
}
```

- **PK / UNIQUE:** `(candidate_id, issue_id)` — one position per candidate per issue.
- **Sourced absence:** for a **spine** issue a candidate has no stance on, still create the Position with `coverage = 'no_stated_position_found'` (the Profiler searched the candidate's sources and found nothing). Silence is recorded honestly and made measurable — never fabricated into a position, never left as a silent gap.
- Claims under a position keep their own buckets; the Position groups them, it does not merge them.

---

## 7. Profile

The balance metric is **split**. `claim_count` (blended) is removed; `stated_position_count` and `verifiable_fact_count` are tracked separately. `outside_opinion` remains fully excluded.

```json
{
  "candidate_id": "string",
  "race_id": "string",
  "facts": ["claim_id"],
  "positions": ["claim_id"],
  "opinions": ["claim_id"],
  "audit": {
    "word_count": "int",
    "verifiable_fact_count": "int",     // facts adjudicated/recorded — the HARD-GATED scrutiny metric
    "stated_position_count": "int",     // self-portrait claims — human-review FLAG, not a hard gate
    "fact_checks_performed": "int",     // adjudications by the Fact-Checker (Symmetric Scrutiny KPI)
    "spine_issue_count": "int",         // number of spine issues in the race (same for all candidates)
    "spine_issues_covered": "int",      // spine issues where coverage = 'stated' — human-review FLAG
    "balance_check_passed": "boolean",
    "flag_reason": "string | null",     // 'scrutiny_halt' | 'stated_position_asymmetry' | 'issue_coverage_asymmetry' | null
    "flagged_at": "ISO8601 | null"
  }
}
```

- **PK / UNIQUE:** `(candidate_id, race_id)` — exactly one Profile per candidate per race.
- `outside_opinion` claims are counted in **no** balance metric.
- `fact_checks_performed` is a **cache recomputed from `action_log`**, not an independent source of truth (avoids drift from the append-only log the Symmetric Scrutiny KPI reads).

### 7.1 Balance-metric split — behavior

The Balance Audit (see CAP_Balance_Audit_Spec) now evaluates **four** metrics instead of three:

| Metric | Threshold | On breach |
|---|---|---|
| `fact_checks` variance | < 10% | **HALT** (hard gate) |
| `verifiable_fact_count` variance | < 15% | **HALT** (hard gate) |
| `word_count` variance | < 15% | **HALT** (hard gate) — composer caps per-candidate contribution symmetrically so this reflects allocated space, not raw footprint |
| `stated_position_count` variance | < 15% | **FLAG for human review** (`flag_reason = 'stated_position_asymmetry'`) — does **not** hard-HALT |
| `spine_issues_covered` variance | any gap | **FLAG for human review** (`flag_reason = 'issue_coverage_asymmetry'`) — does **not** hard-HALT |

Rationale: `verifiable_fact` and `fact_checks` are the scrutiny the neutrality claim rests on, so they gate publication. `stated_position` is candidate-authored and footprint-driven, so an imbalance there is surfaced for a human — never "fixed" by pulling more content for the quiet candidate (that would fabricate a footprint) or trimming the loud one arbitrarily. **Spine-issue coverage** is likewise a flag, not a gate: a candidate's silence on a shared issue is real, sourced information (`coverage = 'no_stated_position_found'`), and must neither block publication nor pressure the system to manufacture a position. Only the spine tier is measured; candidate-tier extras never count toward coverage parity. This is what prevents self-portrait size *or* issue coverage from masking or manufacturing a scrutiny imbalance.

> **Requires companion edit:** CAP_Balance_Audit_Spec_v1 must be bumped to compute four metrics and to HALT only on the three hard gates. The deterministic core changes from one `claim_count` metric to two count metrics with different breach behavior.

---

## 8. action_log

Defined in CAP_Logging_Schema_v1. One change carried here for consistency: add a guard discriminator so allowlist blocks and bucket halts are separately countable.

- Add `guard_type: 'bucket' | 'allowlist' | 'denied_tool' | null`.
- A wrapper-level allowlist block must write its log row (`status='fail'`, `guard_triggered=true`, `guard_type='allowlist'`, `source_url`=requested URL) **before** returning. Early-return rejections are not exempt from logging.

---

## 9. Constraints & keys — consolidated

| Object | PK | Uniqueness | Enum CHECKs |
|---|---|---|---|
| Race | `race_id` | — | `level`, `election` |
| Candidate | `candidate_id` | — | `party`, `qualifying_status` |
| candidate_social_account | `id` | `(platform, handle_norm)` | `provenance`, `status` |
| social_platform | `platform` | — | — |
| Source | `source_id` | `url_norm` | `type`, `lean_tag` |
| Claim | `claim_id` | — | `bucket`, `verification`, `verdict` (nullable) |
| claim_source | `(claim_id, source_id)` | (composite PK) | — |
| Issue | `issue_id` | — | `tier`; tier/candidate_id coherence |
| Position | `position_id` | `(candidate_id, issue_id)` | `coverage` |
| Profile | `(candidate_id, race_id)` | `(candidate_id, race_id)` | — |

Enum `CHECK`s enforce "buckets are sacred" at the database level — a wrong-bucket write is rejected by Postgres, not just the tool wrapper (defense in depth for the pipeline's central invariant).

---

## 10. Open items carried to the tool/agent builds

- [x] **Allowlist A matching algorithm** (Tool Spec §2.5 A edit): PSL registrable-domain extraction; host→platform folding via `social_platform.host_pattern`; per-platform handle extraction (incl. YouTube `/@`, `/channel/`, `/user/`, `/c/`); tracking-param stripping; **block shorteners, do not follow redirects**; **fail-closed** when `social_accounts` is empty. Also fix the `official_site` half's normalization. Requires un-freezing Tool Spec §5. **(Resolved 2026-07-01: reference implementation in `allowlist_a_core.py` + `test_allowlist_a_core.py`. PSL extraction is injectable; the built-in default covers a US-centric suffix subset and fails closed on unknown suffixes — production wrapper should inject a full PSL extractor. Added guard beyond spec: an `official_site` that is itself a social platform or shortener never admits by domain match — it must enter via a verified social-account row.)**
- [ ] **Bump CAP_Balance_Audit_Spec_v1** to the four-metric split (§7.1).
- [x] **Soften the Profiler system prompt** (Agent Plan §2): it currently promises the wrapper blocks any non-candidate URL; true only once the matcher lands. Build order puts the Profiler first, so land the matcher or soften the claim before that chat. **(Resolved 2026-07-01: matcher landed first (`allowlist_a_core.py`), so the prompt's promise holds as written — no softening needed. Profiler-side wrapper guards also landed: `profiler_guard_core.py` + tests.)**
- [ ] **Handle drift / freshness:** re-verify `verified_at` within a bounded window before composition; stale → `unverified` → excluded. (Optional `handle_aliases` to carry a renamed handle without silent drops.)
- [ ] **Spine issue set per race:** define the fixed, neutrally-worded spine issue list for each target race, with a source/justification per issue, and log the selection to `action_log`. Owner: intake / editorial. This is the issue-selection lever — it must be settled and transparent before briefs are composed.
- [ ] **Agent responsibilities for the Issue layer:** Profiler assembles `stated_position` claims into Positions per issue (incl. `no_stated_position_found` for uncovered spine issues); Fact-Checker sets `derived_from` when splitting a statement into fact + opinion. Reflect in the Agent Plan prompts.
- [ ] **Bump CAP_Balance_Audit_Spec_v1** to add the `spine_issues_covered` flag alongside the four metrics (flag only, no halt).

*Authoritative data schema for CAP. Companion to CAP_PRD_v1.0, CAP_MCP_Tool_Spec_v1.0, CAP_Logging_Schema_v1.0, CAP_Balance_Audit_Spec_v1.0.*
