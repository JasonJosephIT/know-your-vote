# Step 3 review: FL-VF-HIL-2610 (Kenneth "Ken" Gay), FL-HIL-SB6-general

Official site: https://votekennethgay.com/
Run reviewed: `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 18 of 18 asked, 0 failed), `passages.jsonl` (18 passages), `ingest.log`.
Spine: undecided for this race, so checks 4 and 5 cover all 25 taxonomy issues in `src/lib/news-issues.ts` (taxonomy version 7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 18 passages are on host `votekennethgay.com`: 7 on `/`, 6 on `/priorities`, 5 on `/meet-kenneth`. No other host appears. |
| 2 | Quotes verbatim | PASS | Both policy passages, `a6eb1c7c` and `77d7b7e5`, are byte-identical (text and url) to the passages with the same ids in `passages.jsonl`. A script checked all 18: 18 match, 0 differ, and no id is missing on either side. |
| 3 | No inferred motive | PASS | The two passages marked `states_policy: true` (`a6eb1c7c`, `77d7b7e5`) are both commitments from the candidate's Priorities page. Neither is only biography, an attack on an opponent, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | No passage scores at or above 0.85 on any taxonomy issue. `areas` is `[]` and `counts.with_issue` is 0, so all 25 issues are `no_stated_position_found`. |
| 5 | Possible misses (information only) | REPORTED | Two passages marked as stating no policy do state a commitment on a taxonomy issue: `f8506f7e` (A6) and `f0f2259d` (KYV10). Details are below. |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

A script parsed each `run.json` passage URL and collected the hosts. The only host is `votekennethgay.com`. The pages are:

- `https://votekennethgay.com/`: 7 passages (a419fb9a, 8f86e6bf, cee45730, ef4c2641, f8506f7e, 0ee65ee8, f0bbeb24)
- `https://votekennethgay.com/priorities`: 6 passages (18a55b21, a6eb1c7c, f0f2259d, 52a2fe82, 77d7b7e5, e7334f97)
- `https://votekennethgay.com/meet-kenneth`: 5 passages (6713c2ea, 1b5c1cbd, c6dfb3c0, 839faaa6, b6982fe6)

The link log (`links.jsonl`) shows that only these two same-site links were judged and chosen, and there are no redirects to follow.

A side note on bookkeeping, which does not affect this check: `ingest.log` prints "7 passage(s) /priorities" and "6 passage(s) /meet-kenneth", but `passages.jsonl` and `run.json` hold 6 and 5 passages for those pages, plus 7 for the homepage. Both sources agree on the total of 18. This file does not show which count is right. The log line may be counted before de-duplication.

### Check 2: quotes verbatim (PASS)

I checked this with a node script that ran `Buffer.equals` on the UTF-8 bytes of each `text` field and compared the `url` values exactly:

```
policy a6eb1c7c IDENTICAL 44
policy 77d7b7e5 IDENTICAL 45
all passages identical: 18 mismatch: 0 run ids: 18 jsonl ids: 18
in jsonl not run: []
```

### Check 3: no inferred motive (PASS)

Passages marked `states_policy: true`:

- `a6eb1c7c` (commitment 0.88, /priorities, "Building Strong Schools"): "Create Pathways for New Teacher Recruitment." This is a commitment from the candidate's priorities list.
- `77d7b7e5` (commitment 0.93, /priorities, "Building Strong Schools"): "Prioritize Money Directly to Student Learning". This is a commitment from the candidate's priorities list.

No biography, attack, fundraising or event passage is marked as stating a policy. The biography passages score 0.02 to 0.09 on the gate: a419fb9a, 8f86e6bf, cee45730, 6713c2ea, 1b5c1cbd, c6dfb3c0, 839faaa6. The paid-for disclaimer `f0bbeb24` scores 0.18. None of them passed.

### Check 4: silence recorded, not filled (PASS)

A passage clears the threshold for an issue when its issue score is at least 0.85. In `policy-noul.ts`, `issueIds` comes from `applyThreshold(answers, threshold, ...)`. Across all 18 passages and all 25 issues, 0 scores reach 0.85. The run records this as silence. `areas: []`, `counts.with_issue: 0`, and `run-report.txt` says "No passage cleared both the commitment gate and an issue question." No issue was filled in.

| Issue | Label | Passages over threshold | Coverage |
|---|---|---|---|
| A1 | Property insurance costs | 0 | no_stated_position_found |
| A2 | Housing affordability | 0 | no_stated_position_found |
| A3 | Property taxes | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | no_stated_position_found |
| B5 | Abortion policy | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | no_stated_position_found |

### Check 5: possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but state a commitment on a taxonomy issue:

- `f8506f7e` (gate 0.65, A6 score 0.56, homepage, "Support for Educators"), on A6 Public school funding and teachers: "Strong schools start with strong educators who feel supported and respected. Teachers and staff should have what they need to succeed in the classroom."
- `f0f2259d` (gate 0.74, KYV10 score 0.41, /priorities, "Building Strong Schools"), on KYV10 Career, vocational and higher education: "Increase Graduation and Workforce Readiness"

These passages are also commitments marked `states_policy: false`, but they are not plainly on any taxonomy issue. The subject is school safety and discipline, which has no sub-issue in taxonomy v7 and would be a candidate-tier issue under the constitution:

- `0ee65ee8` (gate 0.82, homepage, "Safe & Orderly Schools"): "Students learn best in safe and structured environments where expectations are clear. Schools should maintain discipline and create a positive culture for students and teachers."
- `52a2fe82` (gate 0.80, /priorities, "Building Strong Schools"): "Create Safe Classroom Learning Environments"

I considered the following passages and left them out, because none plainly states a commitment on a taxonomy issue:

- `e7334f97`: "Implement Best Practices for Resource Usage". A commitment, but it names no issue.
- `ef4c2641`: "Every student deserves the opportunity to succeed and reach their full potential. The focus is on improving academic performance and preparing students for life after graduation." A general goal.
- `18a55b21`: a third-person summary of the priorities.
- `b6982fe6`: biography plus a general statement of commitment to "strong schools".

VERDICT: PASS
