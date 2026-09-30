# Step 3 review: FL-DOE-88870 (Kathy Castor), FL-14-general

Reviewer run 2026-09-29. Read-only against `passages.jsonl`, `run.json`, `ingest.log` (plus `run-report.txt`, `links.jsonl`, `ingest-report.md` for context). No website was fetched.

Run under review: `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 12 passages asked, 0 failed, 2 marked `states_policy`, 2 with an issue.

SPINE: undecided for this race. Check 4 reports every taxonomy issue (tax-7) with at least one passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive (policy-marked passages carry a commitment) | PASS (one borderline note: 3a9f9573) |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information for the founder, not a gate) | PASS (1 possible miss: 7dfda9a9) |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script collected the host of every `passages[].url` and every `areas[].subIssues[].citations[].passage.url` in `run.json`. There is one host: `castorforcongress.com`, the OFFICIAL_SITE host. No other host appears.

- `https://castorforcongress.com/`: 3023ae45, 7dfda9a9, 98cdc9cd, 4903083c
- `https://castorforcongress.com/delivering-for-florida`: 5e81fa0f
- `https://castorforcongress.com/about`: c37a21c1, a6f1bf63, 9d67e600, fac3c04f, 91625c45, 3a9f9573, 5b917f4e

Note: `links.jsonl` lists four same-host pages that republish third-party press (Tampa Bay Times, WUSF, Florida Politics) and `/news`. Jev scored all of them below 0.5 and none was ingested, so no third-party-authored text is in the corpus.

### 2. Quotes verbatim: PASS

A node script compared `run.json` against `passages.jsonl` by id, as Buffers (byte comparison):

- 12 of 12 run passages exist in `passages.jsonl`, with the same `url` and `heading` and byte-identical `text`.
- The two passages marked `states_policy: true` are byte-identical: 3a9f9573 (467 bytes on both sides) and 5b917f4e (216 bytes on both sides).
- All 4 citations under `areas` (A4: 5b917f4e; B1: 3a9f9573, 5b917f4e; B2: 5b917f4e) match their `passages.jsonl` text and url byte for byte. Mismatches: 0.

### 3. No inferred motive: PASS, with one borderline note

These passages are marked `states_policy: true`:

- **5b917f4e** (commitment 0.88; A4 0.86, B1 0.91, B2 0.92): "But the work isn’t done. Kathy Castor will continue to fight for a diverse and strong Tampa Bay economy that". This is a forward commitment by the candidate. Not flagged.
- **3a9f9573** (commitment 0.87; B1 0.96): "She stands up to grow the middle class and boost small business owners, guaranteeing that everyone has an equal opportunity". This is borderline. Its first sentence is a present-tense stance ("stands up to grow the middle class and boost small business owners"), so it is not *only* biography, and it is not flagged. Its second sentence ("She has successfully fought to bring new, good-paying job opportunities…") is record and biography. Any Profiler claim built on this passage should rest on the first sentence, be attributed ("The campaign website states…"), and not present the record sentence as a verified fact.

No passage marked as stating a policy is only an attack, fundraising or event copy. The fundraising passage 4903083c and the voter-info passage 98cdc9cd are correctly marked `states_policy: false`.

### 4. Silence recorded, not filled: PASS

The script counted the passages whose score is at or above the 0.85 threshold, for every taxonomy issue that has at least one. "Raw" counts every passage. "Gated" counts only passages that also cleared the `states_policy` gate, and only gated passages become citations in `areas` and so can become claims.

| Issue | Label | Raw ≥ 0.85 | Gated (states_policy) | Coverage |
|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 3 (7dfda9a9, 3a9f9573, 5b917f4e) | 2 (3a9f9573, 5b917f4e) | stated |
| B2 | Healthcare access and costs | 2 (fac3c04f, 5b917f4e) | 1 (5b917f4e) | stated |
| A4 | Cost of living in Florida | 1 (5b917f4e) | 1 (5b917f4e) | stated |
| A7 | Elections administration and voting access | 1 (98cdc9cd) | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 1 (a6f1bf63) | 0 | no_stated_position_found |

- A7 is 0: 98cdc9cd is voter-information copy ("You must request to vote by mail again after every general election.") with no commitment, and the gate rejected it (commitment 0.08).
- KYV3 is 0: a6f1bf63 is past-career biography (commitment 0.21), and the gate rejected it.
- Every other tax-7 sub-issue has 0 passages over the threshold, recorded as `no_stated_position_found`: A1, A2, A3, A5, A6, KYV9, KYV10, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.
- `run.json` fills none of these zeros: `areas` holds only A4, B1 and B2.
- Scope caveat: the corpus is 12 passages (459 words) from 3 pages. A zero means nothing in this corpus cleared the threshold. It is not a finding about the whole site.

### 5. Possible misses (information for the founder, not a fix): PASS, 1 reported

These passages are marked `states_policy: false` but read as a commitment on a taxonomy issue:

- **7dfda9a9** (commitment 0.74, below the 0.85 gate; B1 0.95, A4 0.80, B8 0.78): "From securing federal investments that drive the local economy to championing landmark environmental protections, she works tirelessly to lower family". The rest of the passage reads "…costs, create good-paying jobs, and protect Florida’s unique way of life… Congresswoman Castor is dedicated to building a strong, diverse economy…". It is a present-tense stance on B1/A4 of the same kind as 3a9f9573, which cleared the gate at 0.87. It is a possible miss on B1 and A4.

Borderline, not counted as a miss:

- **91625c45** (commitment 0.60; B2 0.73, A6 0.61): "She is a champion for veterans, co-chairing the Congressional Air Force and Congressional Special Operations Forces Caucus and consistently fighting". It is mostly record. The stance it carries is veterans' services, which has no tax-7 sub-issue. If the Profiler uses it, it would be a candidate-tier issue, not a spine issue.

Also noted, on a passage that did clear the gate: 5b917f4e says "keeps health care and energy affordable", and KYV2 (energy and utilities) scored 0.80 there, below the threshold. It is not tagged KYV2.

No other passage marked no-policy states a commitment. 3023ae45, 9d67e600 and c37a21c1 are biography or record. fac3c04f and a6f1bf63 are past record. 5e81fa0f is navigation copy, 4903083c is fundraising and 98cdc9cd is voter information.

VERDICT: PASS
