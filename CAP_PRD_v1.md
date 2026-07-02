# Civic Awareness Project (CAP) — FL MVP
## Product Requirements Document v1.0

---

## 0. How to Use This Document

This PRD is the single source of truth for Phase 1 of the Civic Awareness Project. It lives in a Claude Project knowledge base. Every conversation in this project should reference it directly.

**Working conventions for Claude:**
- All agent system prompts must align to the data schema in Section 7.
- All claims produced by agents must map to a `Source` object or be dropped.
- "Unverifiable" is a valid and acceptable verdict — hallucination is not.
- Never infer motive. Never editorialize. Only describe.

---

## 1. Meta Information

| Field | Value |
|---|---|
| **Project Name** | Civic Awareness Project (CAP) |
| **Document Status** | Draft v1.0 |
| **Phase** | 1 — Florida MVP |
| **Target Geography** | FL's top 4 population metros (Miami, Fort Lauderdale, Tampa, Orlando) |
| **Target Races** | FL Statewide (Gov, AG, CFO, Ag Comm) + FL-28, FL-23, FL-15, FL-10 |
| **Application Target** | Claude Corps Cohort 1 |
| **Last Updated** | 2026-06 |

---

## 2. Executive Summary

The Civic Awareness Project (CAP) is a non-partisan, location-based service that delivers highly sourced, neutrally synthesized political candidate briefs to voters via SMS.

**Core differentiator:** Verifiable neutrality through a multi-agent AI pipeline that mechanically separates:
1. **What they say** — the candidate's self-portrait (Profiler Agent)
2. **What they've done** — the factual legislative/financial record (Record Agent)
3. **What is true** — adjudicated fact-checks with verdict scale (Fact-Checker Agent)

The pipeline is designed so that bias cannot easily creep in — it must be *detected* and *blocked* by the system itself before a brief is ever published.

---

## 3. Problem Statement

Voters lack accessible, comprehensive, and neutral information about political races. Existing information is:
- Fragmented across dozens of sources
- Heavily partisan or editorially framed
- Often behind paywalls
- Difficult to distinguish: promised positions vs. actual record vs. independently verified facts

CAP solves this by enforcing a strict mechanical separation between these three categories at the data-schema level — not just as an editorial guideline.

---

## 4. Goals & Success Metrics

### Product Goals

- Produce polished, fully-sourced, neutrality-audited candidate briefs for 4 congressional districts and 4 statewide Florida races.
- Demonstrate a verifiable AI pipeline that mechanically enforces balance.
- Deliver working SMS-to-brief flow on Twilio trial account.

### KPIs (Claude Corps Application)

| Metric | Target |
|---|---|
| **Traceability** | 100% of published claims map to a `Source` object |
| **Symmetric Scrutiny** | < 10% variance in fact-checks performed per candidate per race |
| **Balance** | < 15% variance in word count and claim count between candidates in same race |
| **Audit Block Rate** | Track every instance the balance check halts the pipeline |

---

## 5. MVP Scope

### Phase 1 — MVP (July Application Deadline)

**Statewide Races (processed once, delivered statewide):**
- Governor
- Attorney General
- Chief Financial Officer
- Agriculture Commissioner

**Target Congressional Districts:**

| District | Metro Anchor | County |
|---|---|---|
| FL-28 | Miami | Miami-Dade |
| FL-23 | Fort Lauderdale | Broward |
| FL-15 | Tampa | Hillsborough |
| FL-10 | Orlando | Orange |

**Delivery:** Twilio trial SMS → project owner's phone only.

**Out of scope for Phase 1:**
- All other FL congressional districts
- State Senate and House races
- Municipal races
- Mass SMS / A2P 10DLC carrier registration
- Any geography outside Florida

### Phase 2 — Post-Application Expansion

- Expand Jurisdiction Resolver to all 28 FL congressional districts
- Add FL State Senate and House races
- Transition to full A2P 10DLC registration for real voter deployment

---

## 6. System Architecture & Pipeline

### 6.1 Intake & Resolution (Deterministic Layer)

```
1. Download FL Division of Elections tab-delimited candidate file
2. Filter for: Statewide races + FL-10, FL-15, FL-23, FL-28
3. Query FEC API for federal candidates in the 4 target districts
4. Merge + deduplicate records
5. Assign internal IDs
6. Map candidates to races
7. Flag primary logic (FL = closed primary state)
```

### 6.2 Agent Execution (AI Layer)

All three agents run **in parallel** for each candidate. Each agent writes to a separate database bucket. Cross-contamination between buckets is a pipeline failure.

---

#### Agent 1: The Profiler — *The Self-Portrait*

**Objective:** Faithfully capture how the candidate presents themselves.

**Inputs (candidate-controlled sources only):**
- Campaign website
- Official bio page
- Issue/policy pages
- Official social accounts (Twitter/X, Facebook, Instagram)

**Rules:**
- Never fact-check. This agent is not authorized to adjudicate truth.
- All output must be attributed to the candidate ("Senator X states...", "The campaign website describes...")
- No loaded adjectives (e.g., "claims" vs. "states" — use "states" unless the agent is quoting a source that used "claims")
- Output bucket: `stated_position`

---

#### Agent 2: The Record Agent — *What They've Done*

**Objective:** Document on-the-record actions independent of messaging.

**Inputs (primary sources only):**
- FL Legislature bill/vote system
- Official legislative journals
- FEC campaign finance filings
- FL Division of Elections finance filings

**Rules:**
- Primary sources only — no news articles, no opinion sites
- Describe actions neutrally; never infer motive
- May present a stated-vs-did contrast, but must NOT label it hypocrisy, flip-flop, or contradiction — state the facts, let the reader decide
- Output bucket: `verifiable_fact`

---

#### Agent 3: The Fact-Checker — *The Holy Grail*

**Objective:** Adjudicate the truth of specific, checkable claims made by or about the candidate.

**Inputs:**
- Claims surfaced by Agents 1 & 2
- Primary evidence from authoritative independent sources

**Verdict Scale (fixed — no deviation):**

| Verdict | Meaning |
|---|---|
| **Accurate** | Claim is supported by ≥2 independent primary sources |
| **Mostly Accurate** | Mostly supported; minor caveats or imprecision |
| **Mixed** | Partially true, partially false, or highly context-dependent |
| **Mostly Inaccurate** | Mostly unsupported; some kernel of truth |
| **Inaccurate** | Contradicted by ≥2 independent primary sources |
| **Unverifiable** | Cannot be adjudicated with available evidence |

**Rules:**
- Cite ≥2 independent sources for any verdict *other than* "Unverifiable"
- Symmetric scrutiny log enforced: the number of claims fact-checked must be tracked per candidate and balanced within the same race
- Never rate an opinion or value judgment as true/false (e.g., "taxes are too high" is not fact-checkable)
- Output bucket: `outside_opinion` for opinions; use verdict scale only for factual claims
- Output bucket: `verifiable_fact` for adjudicated claims

---

### 6.3 Synthesis & Composition

```
1. Balance Audit
   - Calculate word count per candidate
   - Calculate claim count per candidate
   - Calculate fact-checks performed per candidate
   - IF variance > thresholds → HALT pipeline, flag for review

2. Brief Composer
   - Assemble data into structured HTML web page (see Section 8 UX)

3. SMS Composer
   - Generate 160-character teaser + link
```

### 6.4 Delivery

```
1. Human Review Gate
   → Project owner reviews final HTML and SMS text before dispatch

2. Dispatch
   → Twilio trial API sends SMS to owner's phone only
```

---

## 7. Data Schema

Five linked objects. Every claim in every published brief must be traceable through this chain.

### Race

```json
{
  "race_id": "string",
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

### Candidate

```json
{
  "candidate_id": "string",
  "legal_name": "string",
  "party": "REP | DEM | NPA | other",
  "office_sought": "string",
  "is_incumbent": "boolean",
  "qualifying_status": "qualified | withdrawn | other",
  "prior_offices": ["string"],
  "official_site": "url | null",
  "fec_id": "string | null"
}
```

### Source

```json
{
  "source_id": "string",
  "url": "url",
  "publisher": "string",
  "type": "factual_reporting | opinion | primary_doc | candidate_self",
  "lean_tag": "left | center-left | center | center-right | right | N/A",
  "retrieved_at": "ISO8601"
}
```

### Claim

```json
{
  "claim_id": "string",
  "candidate_id": "string",
  "race_id": "string",
  "text": "string",
  "bucket": "verifiable_fact | stated_position | outside_opinion",
  "source_ids": ["source_id"],
  "verification": "verified | single_source | unverified"
}
```

### Profile

```json
{
  "candidate_id": "string",
  "race_id": "string",
  "facts": ["claim_id"],
  "positions": ["claim_id"],
  "opinions": ["claim_id"],
  "audit": {
    "word_count": "int",
    "claim_count": "int",
    "fact_checks_performed": "int",
    "balance_check_passed": "boolean",
    "flagged_at": "ISO8601 | null"
  }
}
```

---

## 8. UX Flow

### Step 1: User Input
User texts their ZIP code to the Twilio trial number.

### Step 2: Jurisdiction Resolution
System maps ZIP → congressional district + confirms statewide races.

### Step 3: SMS Response
```
Your Florida voter brief is ready. Races covered: [Race List]. Read it here: [link]
```
*(160 characters max)*

### Step 4: Web Page — The Brief

**Page Structure:**

```
[Header]
  Race Name | Election: [date] | Registration Deadline: [date]
  Note: Florida is a closed primary state.

[For each candidate — repeated block]

  CANDIDATE NAME (PARTY)
  ─────────────────────

  📋 WHAT THEY SAY
  [Bulleted summary from Profiler Agent]
  Source: [candidate site URL]

  📊 WHAT THEY'VE DONE
  [Bulleted summary from Record Agent]
  Sources: [FL Legislature / FEC links]

  ✅ FACT-CHECK
  Claim: "[exact claim text]"
  Verdict: [Accurate / Mostly Accurate / Mixed / Mostly Inaccurate / Inaccurate / Unverifiable]
  Sources: [link 1] [link 2]

  [Repeat for each checked claim]

[Footer]
  How we ensure neutrality → [methodology link]
  Flag this brief as biased → [form link]
```

---

## 9. MCP Architecture & Tools

*(To be detailed in a separate conversation/document. High-level summary:)*

- All three agents interact with the data pipeline strictly through **MCP tool wrappers** — they cannot write directly to the database or call external APIs without going through the tool layer.
- **Log tool** captures every agent action with timestamp, agent ID, source URL, and output bucket written to.
- **Balance Audit tool** is deterministic (no AI) — it computes variance and returns PASS/HALT with exact numbers.
- **Web search** is authorized for Agents 1 and 3, with domain allowlist enforcement. Agent 2 is restricted to primary source APIs only (no web search).

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Accusations of editorial bias | Publish the Symmetric Scrutiny Log showing exact fact-check counts per candidate |
| AI hallucination / unverifiable claims | Grounding rule: any claim without a `Source` object is dropped — not published |
| Legal / TCPA SMS violations | MVP delivers to developer's phone only via Twilio trial; no mass registration |
| News deserts / local data scarcity | MVP targets high-profile races where FL DoE and FEC data is abundant |
| Agent cross-contamination (Profiler fact-checking, Record Agent using opinion sources) | Bucket writes are enforced at schema level; wrong-bucket writes halt the pipeline |

---

## 11. Claude Corps Application Narrative

| Element | CAP's Answer |
|---|---|
| **Societal Challenge** | Local civic disengagement and information pollution |
| **AI Expertise** | Multi-agent system with distinct, non-overlapping roles and deterministic routing |
| **Judgment** | Recognized that "unbiased AI" is a myth; engineered verifiable transparency and mechanical balance enforcement instead |
| **Action** | Shipped a scoped, working MVP in ~3 weeks rather than overpromising a national automated system |

---

## 12. Open Questions (Phase 1 Blockers)

- [ ] Confirm FL DoE candidate file format and download endpoint for 2026 cycle
- [ ] Confirm FEC API key and rate limits for the 4 target districts
- [ ] Draft and finalize system prompts for all 3 agents
- [ ] Define MCP tool list and logging schema
- [ ] Confirm Twilio trial account configuration and ZIP → district resolution logic
- [ ] Decide database (Supabase recommended for structured schema + easy querying)

---

*Document owner: CAP Project*
*Next step: Draft agent system prompts and MCP tool specifications*
