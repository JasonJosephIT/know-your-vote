# CAP / Know Your Vote — MVP Change Spec

## Stances, Who They Are, and Related News (retiring the adjudicated Fact-Check layer)

**Status:** Proposed change to `CAP_PRD_v1.md` (v1.0)
**Date:** 2026-07-15
**Scope:** Phase 1, Florida MVP
**Purpose:** Ship sooner and cut ongoing overhead. Replace the adjudicated fact-check section with three lanes per candidate: their stances, a sourced "Who They Are" profile, and a running Related News feed drawn from a credibility-vetted outlet list.

---

## 1. Plain-language summary

The system stops judging whether claims are true or false. Each candidate brief shows three things:

1. **Where They Stand.** The candidate's positions on common issues, in their own words. If the candidate posted or spoke about a position, link that post next to it.
2. **Who They Are.** A sourced profile of background and record, drawn from official documents. Facts only, no character read.
3. **Related News.** Articles about the candidate and the issues, pulled only from outlets that pass a non-partisan credibility standard. These sit beside a stance as *Related News*, never as "supporting" or "verifying" evidence.

We point voters to relevant information and let them decide. "Unverifiable" stops being a verdict, because the system issues no verdicts.

---

## 2. Copy standard — Stop Slop governs all product copy

Every piece of copy the product shows a voter, and every string an agent writes into a brief, follows the attached **stop-slop** skill. This covers agent-generated summaries, UI microcopy, section labels, SMS text, and the methodology page.

Rules that apply to CAP copy:

- **No em dashes anywhere.** Use commas or periods.
- **Active voice.** Name the actor. "Senator X sponsored HB-100," not "HB-100 was sponsored."
- **No adverbs, no filler openers.** Drop "really," "simply," "it's worth noting," "here's what."
- **No binary-contrast framing.** State the point. Avoid "not X, it's Y" and "stops being X and starts being Y."
- **Be specific.** Name the vote, the bill, the office, the date. Avoid vague declaratives such as "the implications are significant."
- **No false agency.** A record does not "reveal" anything. A person voted, filed, or signed. Name them.
- **Trust the reader.** State the fact and stop. No softening, no editorial glue.

**Gate:** score each finished brief on the stop-slop 1–10 scale across Directness, Rhythm, Trust, Authenticity, Density. A brief below 35/50 goes back for revision before the Balance Audit runs.

This standard reinforces the existing neutrality rules. Both point the same direction: describe, name the source, cut the editorializing.

---

## 3. What changes vs. current PRD

| Area | Current PRD (v1.0) | Proposed change |
|---|---|---|
| Core model | 3 agents: What they say / What they've done / What is true (adjudicated) | 3 lanes: Where They Stand / Who They Are / Related News. No truth adjudication. |
| Agent 3 (Fact-Checker) | Assigns a 6-point verdict scale | Retired. No verdicts. |
| Agent 2 (Record) | "What They've Done," votes and filings only | Reframed as the Background Agent behind "Who They Are." Widened inputs. See §4. |
| Claim to Source rule | "All claims must map to a Source object or be dropped." | Relaxed. A stance can appear without a source. Link a source when one exists. Never drop a stance for lacking one. |
| Evidence label | "Sources:" presented as fact-check backing | "Related News." Associative, not confirmatory. |
| News sourcing | Independent sources chosen per fact-check | Fixed to a vetted non-partisan outlet list, swept on a schedule into a per-candidate feed. |
| Copy | House neutrality rules | House neutrality rules plus the stop-slop standard in §2. |

---

## 4. The three lanes

**Where They Stand.** Bucket `stated_position`. The candidate's positions in their own words, plus their own posts and statements. Source type `candidate_self`.

**Who They Are.** Bucket `verifiable_fact`. A sourced factual profile of the person: current office and incumbency, prior offices, professional background, education, years in office, district ties, plus the record (votes, bill sponsorships, FEC and FL finance filings).

Guardrails for "Who They Are," because the name invites characterization:

- Facts only. No character labels such as "moderate," "career politician," or "firebrand." No motive.
- Independent and authoritative sources make it `verifiable_fact`: FL Division of Elections, FL Legislature record, FEC, official legislative journals.
- If only the candidate's own bio asserts a detail and no independent record confirms it, that detail belongs in `stated_position`, not here. This boundary keeps "Who They Are" from becoming a second copy of "Where They Stand."
- A stated-vs-record contrast can appear, stated as facts. The copy never labels it hypocrisy, a flip-flop, or a contradiction.

**Related News.** Bucket `outside_opinion`. Third-party coverage of the candidate and the issues, presented as related reading.

The Background Agent runs this second lane. Same mechanics as the current Record Agent: primary and authoritative sources, describe do not judge, no news, no motive. Its input list widens to add authoritative biographical records alongside the votes and filings it already pulls.

---

## 5. Sourcing hierarchy per stance

For each position a candidate holds on a common issue, attach sources in this order:

1. **Primary: the candidate's own words.** Official site, issue page, or verified social post. Source `type: candidate_self`.
2. **Secondary: one Related News article** from a vetted outlet. Prefer a single strong piece.
3. **Additional Related News** only when one article does not cover the issue.

A stance with none of the above still appears, with no linked source. The system never drops it.

---

## 6. The Related News rule

The neutrality-critical part. Enforce it in copy:

- Label the section beside a stance **"Related News."**
- Never call an article "Supporting," "Proof," "Verified," "Confirms," or "Debunks."
- Keep the framing associative: "News related to this issue."
- A high-value or contested claim gets the same treatment as any other: stance on one side, Related News beside it. The system does not rank or adjudicate.

---

## 7. Trusted-outlet standard, two-gate and non-commercial

Related News comes only from outlets that clear both gates:

- **Gate A, AllSides:** rated **Center**. The AllSides chart is free under Creative Commons BY-NC 4.0, which fits non-commercial use with an attribution line.
- **Gate B, Ad Fontes Media green box:** reliability score **≥ 36** and bias within **±12**.

An outlet joins the approved feed only when it passes both. Two independent raters defend the non-partisan claim better than any single rater's methodology.

**Attribution:** show a line such as "Source credibility ratings via AllSides (CC BY-NC 4.0)."

**Cost:** $0. Ad Fontes sells the full dataset through a paid educator tier, but the green-box criteria are public and free to apply.

---

## 8. Ongoing news feed

- Sweep the approved outlets about twice per week for new coverage tied to each candidate.
- Results fill a running per-candidate Related News feed instead of one-at-a-time curation.
- This removes the per-claim adjudication, the verdict labor, and the symmetric-scrutiny counting. That labor was the overhead being cut.

---

## 9. Buckets preserved

The change retires a layer. It does not blend buckets.

- `stated_position`: stances plus the candidate's own posts (`candidate_self`).
- `verifiable_fact`: the "Who They Are" profile and record from the Background Agent.
- `outside_opinion`: Related News from third-party outlets.

No cross-writing between buckets. A wrong-bucket write halts the pipeline, same as today.

---

## 10. Schema impacts (`CAP_PRD_v1.md` §7)

- `Claim.verification`: the `verified | single_source | unverified` field loses its adjudication meaning. Retire it, or rename it to a neutral `source_state: has_source | no_source`.
- `Claim.bucket`: unchanged set.
- `Source`: unchanged. Optionally log `credibility_gate: passed` to record why an outlet cleared both gates.
- New optional field: a fixed display label `"Related News"` on the news grouping, so nothing renders it as "Supporting."
- Fact-Checker verdict scale (§6.2 Agent 3): removed.

---

## 11. UX block, before and after (`CAP_PRD_v1.md` §8)

Copy below follows the §2 standard: active voice, no em dashes, specific.

**After:**

```
CANDIDATE NAME (PARTY)

WHERE THEY STAND
  Issue: [common issue]
  Position: "[candidate's stated position]"
  In their words: [candidate post or site link]   (if it exists)

WHO THEY ARE
  Office: [current office, incumbency]
  Before this: [prior offices, profession, education]
  On the record: [votes, sponsorships, filings]
  Sources: [FL DoE / FL Legislature / FEC links]

RELATED NEWS
  [article from a vetted outlet]
  [article from a vetted outlet]   (only if needed)

[Footer]
  How we choose news sources: [methodology link]
  Source ratings via AllSides (CC BY-NC 4.0)
  Flag this brief: [form link]
```

The "FACT-CHECK / Verdict" block is gone.

---

## 12. KPI and pipeline impacts

- **Traceability KPI** ("100% of claims map to a Source"): restate as "100% of linked sources resolve to a valid `Source` object. Stances can appear without a source."
- **Symmetric Scrutiny KPI** (fact-check count variance): retired with Agent 3.
- **Balance Audit:** still runs on word count and stance count per candidate. It also runs the §2 stop-slop score gate. The fact-check-count leg is dropped.
- **New audit note:** now that "Who They Are" carries biographical facts, add a balance check on profile depth per candidate so one candidate does not get a richer background write-up than an opponent in the same race.

---

## 13. Required source-of-truth edits (approve separately)

This spec conflicts with two standing rules and cannot override them on its own:

- `CAP_PRD_v1.md` §0 and §10, and the `CLAUDE.md` project rule: "All claims must map to a Source object or be dropped." Needs the relaxed wording in §5.
- `CAP_PRD_v1.md` §6.2 Agent 3, §8 UX, §4 KPIs: need the edits in §10 through §12.
- Add the §2 copy standard to `CLAUDE.md` and the PRD so every agent inherits stop-slop.

Update the PRD and CLAUDE.md in a follow-up once this spec is approved.

---

## 14. Open questions

1. **"Who They Are" scope.** Confirm the biographical fields in scope (office, prior offices, profession, education, tenure, district ties). Anything outside this list needs a rule before an agent writes it.
2. **Confirmed outlet roster.** The live two-gate roster still needs a one-time pull: the AllSides Center list checked against the Ad Fontes green box.
3. **Common issues set.** Define the fixed list of issues each candidate is profiled against, so stance coverage stays symmetric across a race.
4. **Attribution placement.** Confirm where the AllSides CC BY-NC line sits in the UI.
