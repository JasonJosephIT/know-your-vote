# Step 3 review: FL-VF-ORA-1283 (Patricia Rumph), FL-ORA-CC7-general

- Official site: https://www.patriciarumph.com/
- Run reviewed: `run.json`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, written 2026-09-30T01:59:22Z.
- A score clears the threshold when it is >= 0.85. `states_policy` requires both gates to clear: `q_states_policy` (commitment) and `q_own_commitment` (see `readVerdict` in `src/lib/policy-noul.ts`). Issue tags use `applyThreshold` in `src/lib/news-characterize.ts`.
- Status `complete`: 80 passages, 80 asked, 0 failed, 7 state a policy, 4 carry a taxonomy issue.
- Spine: undecided for this race. Checks 4 and 5 therefore use all 25 issues in taxonomy v7 (`SUB_ISSUES` in `src/lib/news-issues.ts`).

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked with a script) | PASS |
| 3 | No inferred motive | PASS (one borderline passage noted) |
| 4 | Silence recorded, not filled | PASS (3 issues have passages; 22 of 25 are at 0 and recorded as `no_stated_position_found`) |
| 5 | Possible misses (information only) | 5 reported |

## Evidence

### 1. Candidate-controlled sources only: PASS

- All 80 passage URLs in run.json are on the host `www.patriciarumph.com`, and so are all 80 in passages.jsonl. No other host appears, and no redirect is involved.
- Passages per page: `https://www.patriciarumph.com/` has 11, `/about` has 59 and `/on-the-issues` has 10.
- run.json and passages.jsonl hold the same 80 ids. Neither file has an id the other lacks.
- links.jsonl lists only two links, both on the same host: `/on-the-issues` (chosen as policy, 0.95) and `/about` (chosen as about, 0.91).
- ingest.log prints the per-page lines for `/on-the-issues` (10) and `/about` (59) only. The 11 homepage passages are included in its total line (80), and ingest-report.md lists them.

### 2. Quotes verbatim: PASS

A Node script compared each run.json passage with `verdict.states_policy === true` against the passages.jsonl row that has the same id. It compared the UTF-8 bytes of the text with `Buffer.equals`, and also checked that `url` and `heading` match.

| id | page | bytes | result |
|---|---|---|---|
| 109f1dd2 | / | 137 | identical |
| adcb8c0e | / | 286 | identical |
| f048e62d | / | 288 | identical |
| 6476d0c1 | / | 229 | identical |
| bee9c92d | / | 248 | identical |
| 87614be3 | /on-the-issues | 187 | identical |
| dfbd431f | /on-the-issues | 191 | identical |

- The citations under `areas` are also identical to passages.jsonl: 6476d0c1 and 87614be3 for A2, bee9c92d for KYV3, and adcb8c0e for B7.
- The texts of all 80 passages in run.json are byte-identical to passages.jsonl.
- The script also recomputed every verdict from its scores. For all 80 passages, `states_policy` equals "both gates >= 0.85", and `issues` equals the set of issue scores >= 0.85.

### 3. No inferred motive: PASS

None of the 7 passages marked `states_policy: true` is only biography, an attack on an opponent, fundraising or event copy. Six of them state an explicit commitment ("I'll work to", "I will champion", "I am committed to", "supports …"). No passage attacks an opponent.

One passage is borderline, and is listed for the founder:

- **109f1dd2** (home, "Meet Patricia"; gates 0.93 and 0.91): "Patricia Rumph’s campaign will focus on public safety, investing in strong infrastructure, affordability and environmental stewardship."
  - This passage lists campaign priorities without a specific action. It is not biography, an attack, fundraising or event copy, so it does not fail the check.
  - It carries no issue tag (its highest score is A2 at 0.74), so it adds nothing to any issue count.

The run correctly marked the fundraising and event copy as stating no policy:

- 3ac77efc: "Get your free Patricia Rumph Yard Sign to show your support!"
- 02db6ea3: "A member of our team will deliver it to you."

It also marked every biography passage on `/about` and in "Meet Patricia" as no policy. That includes fa74fb5c ("In 2020, I was honored to be appointed as the Inaugural Community Ambassador…"), whose gates are 0.08 and 0.06.

### 4. Silence recorded, not filled: PASS

For each taxonomy issue, this table counts the passages (out of all 80) that score >= 0.85. Every passage that clears an issue also clears both gates.

| issue | label | passages >= 0.85 | ids |
|---|---|---|---|
| A2 | Housing affordability | 2 | 6476d0c1 (0.98), 87614be3 (0.98) |
| KYV3 | Growth, development and land conservation | 1 | bee9c92d (0.94) |
| B7 | Crime policy, policing and courts | 1 | adcb8c0e (0.87) |

The other 22 issues have 0 passages each, recorded as `no_stated_position_found`:

- A1 Property insurance costs
- A3 Property taxes
- A4 Cost of living in Florida
- A5 Water quality and Everglades restoration
- A6 Public school funding and teachers
- KYV9 School choice and vouchers
- KYV10 Career, vocational and higher education
- A7 Elections administration and voting access
- B1 Economy, inflation, and jobs
- B2 Healthcare access and costs
- B3 Immigration and border enforcement
- B4 Social Security and Medicare
- B5 Abortion policy
- B6 Election integrity
- KYV1 Threats to democratic institutions
- B8 Climate and environment (national)
- KYV2 Energy and utilities
- KYV4 Storm resilience and flood protection
- KYV5 Water supply and drinking water
- KYV6 Renters and evictions
- KYV7 Homelessness
- KYV8 Condominium and HOA costs

- The run's `areas` hold only A2, KYV3 and B7, so no issue below the threshold was filled in.
- Three policy passages match no taxonomy issue: 109f1dd2, f048e62d and dfbd431f. That matches the run's own count (`states_policy` 7, `with_issue` 4).

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false`, but each plainly states a commitment on a taxonomy issue. Each entry gives the page, the section heading, the two gate scores, the relevant issue scores and the first 20 words.

- **b9dd5748** (`/on-the-issues`, "Crime"; gates 0.76 and 0.55; B7 0.79): "Patricia Rumph focuses on violence prevention, youth intervention, and stronger community trust, working to reduce crime, improve emergency response, and"
  - The issue is B7 (crime and policing).
- **080ebab0** (`/on-the-issues`, "Environmental"; gates 0.80 and 0.73; KYV3 0.60, A5 0.47): "Patricia Rumph is committed to protecting waterways, preserving green space, and ensuring clean, safe, and sustainable environments for future generations"
  - The issue is KYV3 (land conservation), and possibly A5 (water quality).
- **c27255f1** (`/on-the-issues`, "Reentry & Training"; gates 0.87 and 0.70; KYV10 0.84, B7 0.81): "Patricia Rumph supports workforce training and second-chance opportunities, helping individuals become productive citizens, reduce recidivism, and build safer communities across"
  - The issues are KYV10 ("workforce training" is one of its aliases) and B7 (recidivism).
- **ba5825c6** (`/on-the-issues`, "Small Business"; gates 0.90 and 0.79; B1 0.80): "Patricia Rumph supports small businesses by expanding opportunity, reducing barriers, and streamlining processes to help entrepreneurs grow and strengthen the"
  - The issue is B1 (economy and jobs).
- **fcd84b3c** (`/on-the-issues`, "Safety Workforce"; gates 0.87 and 0.78; B1 0.61, B7 0.41): "Patricia Rumph supports public safety professionals and essential workers by prioritizing training, mental health, and fair pay for those who"
  - The issues are B7 (public safety) and B1 (wages). This one is the least clear-cut of the five.

Notes on the second gate:

- c27255f1, ba5825c6 and fcd84b3c were marked `states_policy: true` in the earlier one-gate run (`attempt-1-one-gate/run.json`, `q-b2171346`). In this run each clears the first gate (0.87 to 0.90) and fails only `q_own_commitment` (0.70 to 0.79).
- 87614be3 and dfbd431f pass both gates, and they use the same third-person wording on the same page ("Patricia Rumph supports …").
- So the second gate is dropping some third-person issue statements on the candidate's own issues page but not others.

Also for the founder, not a failure of any check:

- dfbd431f (policy, no issue tag) names "drainage" and scores KYV4 at 0.80, just under the threshold.
- 31cdd5d8 ("Transparency") states a commitment, but on no taxonomy issue.
- 270332bd ("Youth") states a belief rather than a commitment.
- a3aba136 ("Priorities for District 7") is a tagline.
- All three are left out of the misses above.
- `ingest-report.md`'s "Step 2: policy run" section still describes the earlier one-gate run (`q-b2171346`, 10 policy passages), not this `run.json` (`q-e7282116`, 7). `run-report.txt` and `run.log` match this run.

VERDICT: PASS
