# Step 3 review: FL-VF-ORA-1283 (Patricia Rumph), FL-ORA-CC7-general

Official site: https://www.patriciarumph.com/
Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 (a score counts as clearing when it is >= 0.85, per `src/lib/policy-noul.ts` and `applyThreshold` in `src/lib/news-characterize.ts`). Status `complete`: 80 passages, 80 asked, 0 failed, 10 state a policy, 4 carry a taxonomy issue.
Spine: undecided for this race, so checks 4 and 5 use all 25 issues in taxonomy v7 (`src/lib/news-issues.ts`, `SUB_ISSUES`).

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked with a script) | PASS |
| 3 | No inferred motive (no non-commitment passage marked as a policy) | PASS (one borderline passage noted) |
| 4 | Silence recorded, not filled | PASS (21 of 25 issues at 0, recorded as `no_stated_position_found`) |
| 5 | Possible misses (information only) | 2 reported |

## Evidence

### 1. Candidate-controlled sources only: PASS

- All 80 passages in run.json are on the host `www.patriciarumph.com`, and so are all 80 in passages.jsonl. No other host appears, and no redirects are needed.
- By page: `https://www.patriciarumph.com/` has 11, `/about` has 59 and `/on-the-issues` has 10.
- links.jsonl lists only the two same-host links Jev chose, `/on-the-issues` (policy, 0.95) and `/about` (about, 0.91).
- Note: ingest.log prints the passage counts for `/on-the-issues` (10) and `/about` (59) only. The 11 homepage passages are not on their own line there, but the total line (80) and ingest-report.md (11 for `/`) account for them. The `attempt-1-keywords/` folder is an earlier attempt and was not an input to run.json.

### 2. Quotes verbatim: PASS

A Node script compared every run.json passage with `verdict.states_policy === true` against the passages.jsonl row with the same id. It compared UTF-8 bytes with `Buffer.equals`, and also compared `url` and `heading`.

| id | bytes | result |
|---|---|---|
| 109f1dd2 | 137 | identical |
| adcb8c0e | 286 | identical |
| f048e62d | 288 | identical |
| 6476d0c1 | 229 | identical |
| bee9c92d | 248 | identical |
| 87614be3 | 187 | identical |
| ba5825c6 | 173 | identical |
| fcd84b3c | 184 | identical |
| dfbd431f | 191 | identical |
| c27255f1 | 183 | identical |

- The citations under `areas` (6476d0c1 and 87614be3 for A2, bee9c92d for KYV3, adcb8c0e for B7) are also identical to passages.jsonl.
- All 80 passage texts in run.json match passages.jsonl, and both files hold the same 80 ids.

### 3. No inferred motive: PASS

None of the 10 passages marked `states_policy: true` is only biography, an attack on an opponent, fundraising or event copy. Nine contain an explicit commitment, using wording such as "I'll work to", "I will champion", "I am committed to" or "supports … by".

One passage is borderline, listed for the founder:

- **109f1dd2** (home, "Meet Patricia"): "Patricia Rumph’s campaign will focus on public safety, investing in strong infrastructure, affordability and environmental stewardship."
  - This is a list of campaign priorities. It is not biography, an attack, fundraising or event copy, so it does not fail the check. It names priorities but no specific action.
  - It carries no issue tag (every issue score is below 0.85), so it adds nothing to any issue count.

The yard-sign fundraising or event copy was correctly marked as no policy:

- 3ac77efc: "Get your free Patricia Rumph Yard Sign to show your support!"
- 02db6ea3: "A member of our team will deliver it to you."

All biography passages on `/about` and in "Meet Patricia" were marked as no policy.

### 4. Silence recorded, not filled: PASS

This is the count of passages scoring >= 0.85 for each taxonomy issue, across all 80 passages. Every passage that clears an issue also clears the gate.

| issue | label | passages >= 0.85 | ids |
|---|---|---|---|
| A2 | Housing affordability | 2 | 6476d0c1, 87614be3 |
| B7 | Crime policy, policing and courts | 1 | adcb8c0e |
| KYV3 | Growth, development and land conservation | 1 | bee9c92d |

Every other issue has 0 passages and is recorded as `no_stated_position_found`. That covers these 21 issues:

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

The run's `areas` hold only A2, KYV3 and B7, so no issue below the threshold was filled in.

As the run itself reports, 6 of the 10 policy passages match no taxonomy issue: 109f1dd2, f048e62d, ba5825c6, fcd84b3c, dfbd431f and c27255f1.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but plainly state a commitment on a taxonomy issue:

- **b9dd5748** (`/on-the-issues`, "Crime"; gate 0.76, B7 0.79): "Patricia Rumph focuses on violence prevention, youth intervention, and stronger community trust, working to reduce crime, improve emergency response, and"
  - It is on crime and policing (B7), and it restates the same page's commitment that the homepage passage adcb8c0e makes.
- **080ebab0** (`/on-the-issues`, "Environmental"; gate 0.80, KYV3 0.63, A5 0.45): "Patricia Rumph is committed to protecting waterways, preserving green space, and ensuring clean, safe, and sustainable environments for future generations"
  - It is on environment and land conservation (KYV3, possibly A5).

Two more passages were considered and left out:

- 31cdd5d8 ("Transparency": "committed to transparency, accountability, and responsible planning…") states a commitment, but on no taxonomy issue.
- 270332bd ("Youth": "believes mentorship shapes strong futures…") states a belief rather than a commitment, and on no taxonomy issue.

VERDICT: PASS
