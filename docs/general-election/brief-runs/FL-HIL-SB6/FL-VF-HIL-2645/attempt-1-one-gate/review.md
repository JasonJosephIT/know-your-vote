# Step 3 review: FL-VF-HIL-2645 (Karen Perez), FL-HIL-SB6-general

Official site: https://keepkarenperez.com/
Run reviewed: `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 15 of 15 asked, 0 failed), `passages.jsonl` (15 passages), `ingest.log`.
Spine: undecided for this race, so checks 4 and 5 consider every taxonomy issue in `src/lib/news-issues.ts` (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 15 passages are on `keepkarenperez.com`. No other host. |
| 2 | Quotes verbatim | PASS | 0 passages marked `states_policy`. Script check: all 15 run.json texts are byte-identical to passages.jsonl. |
| 3 | No inferred motive | PASS | 0 passages marked `states_policy`, so none can be biography, attack, fundraising or event copy marked as policy. |
| 4 | Silence recorded, not filled | PASS | 0 passages clear the gate and an issue for any of the 25 issues. `areas` is empty. A6 has 1 passage over the issue threshold (a6b8c9f1), but it did not clear the commitment gate. |
| 5 | Possible misses (information only) | reported | 1 borderline passage: a6b8c9f1 (A6). |

## Evidence

### 1. Candidate-controlled sources only: PASS

Every `url` in `run.json` `passages[]` and in `passages.jsonl` has host `keepkarenperez.com`, and all of them are `https://keepkarenperez.com/`. Checked with node (`new URL(url).host` over both files). The ingest also fetched `https://keepkarenperez.com/about`, the only link Jev judged (about 0.91, policy 0.17). It is on the same host and produced 0 passages. No redirect to another host appears in `ingest.log`. No other host appears anywhere.

Passage ids (all on the official host): a6b8c9f1, 7c58ac3d, 913c2c4e, 77d272f6, 91092c7a, b57f3a39, c2751614, b796b0ef, b3a294e4, 21d68315, 2938769d, c318b293, b6daf3bd, f2f7822e, 40cd4dcd.

### 2. Quotes verbatim: PASS

`counts.states_policy` is 0, and no passage in `run.json` has `verdict.states_policy: true`, so no passage needs checking. As a stronger check, a node script compared every one of the 15 run.json passages with the passages.jsonl passage of the same id, using `Buffer.equals` on the UTF-8 text and a strict comparison on the url. Result: 15 of 15 are byte-identical. The id sets match (15 and 15), and no verdict is null.

### 3. No inferred motive: PASS

No passage is marked as stating a policy, so none can be. For the record, 14 of the 15 passages are résumé, board-service or personal lines, with commitment between 0.02 and 0.09. The run correctly marks all of them as stating no policy.

### 4. Silence recorded, not filled: PASS

Counts are of passages with `states_policy: true` whose `issues` include the id. This is what the run would turn into a stated position.

| Issue | Passages clearing gate + issue | Coverage |
|---|---|---|
| A1 Property insurance costs | 0 | no_stated_position_found |
| A2 Housing affordability | 0 | no_stated_position_found |
| A3 Property taxes | 0 | no_stated_position_found |
| A4 Cost of living in Florida | 0 | no_stated_position_found |
| A5 Water quality and Everglades restoration | 0 | no_stated_position_found |
| A6 Public school funding and teachers | 0 | no_stated_position_found |
| KYV9 School choice and vouchers | 0 | no_stated_position_found |
| KYV10 Career, vocational and higher education | 0 | no_stated_position_found |
| A7 Elections administration and voting access | 0 | no_stated_position_found |
| B1 Economy, inflation, and jobs | 0 | no_stated_position_found |
| B2 Healthcare access and costs | 0 | no_stated_position_found |
| B3 Immigration and border enforcement | 0 | no_stated_position_found |
| B4 Social Security and Medicare | 0 | no_stated_position_found |
| B5 Abortion policy | 0 | no_stated_position_found |
| B6 Election integrity | 0 | no_stated_position_found |
| KYV1 Threats to democratic institutions | 0 | no_stated_position_found |
| B7 Crime policy, policing and courts | 0 | no_stated_position_found |
| B8 Climate and environment (national) | 0 | no_stated_position_found |
| KYV2 Energy and utilities | 0 | no_stated_position_found |
| KYV3 Growth, development and land conservation | 0 | no_stated_position_found |
| KYV4 Storm resilience and flood protection | 0 | no_stated_position_found |
| KYV5 Water supply and drinking water | 0 | no_stated_position_found |
| KYV6 Renters and evictions | 0 | no_stated_position_found |
| KYV7 Homelessness | 0 | no_stated_position_found |
| KYV8 Condominium and HOA costs | 0 | no_stated_position_found |

The header asks for a count for every issue with at least one passage over the threshold. Counted on the issue score alone (score ≥ 0.85, gate ignored), only one issue has any:

- A6: 1 passage (a6b8c9f1, A6 = 0.95). Its commitment is 0.71, below the 0.85 gate. The run therefore marks it `states_policy: false`. `issues: ["A6"]` is recorded on the verdict, but the passage is not grouped into `areas`. It is not a stated position, and A6 stays "no_stated_position_found".

Every other issue has 0 passages over the threshold on the issue score alone. The run fills no issue with a stance. `areas` is `[]`, and run-report.txt says "No passage cleared both the commitment gate and an issue question."

Context on coverage, not a failure: the site yielded 272 words from one page. `ingest.log` shows the homepage and `/about` rendered to only 73 and 23 characters of text, and 0 policy pages were selected. The silence reflects a thin site as captured, which the run records honestly.

### 5. Possible misses (information for the founder, not a fix)

- **a6b8c9f1** (A6 Public school funding and teachers; commitment 0.71, A6 0.95), first 20 words: "As your Hillsborough County School Board member, Karen Perez is a calm and rational voice on the issues confronting our". The passage continues: "works diligently to ensure our limited resources make it to the classroom" and "fought uphill battles to make sure the first cuts due to budget shortfalls were at the administration level and not among our teachers and support staff." This is a borderline case. It is written in the third person and mostly describes her record as a board member ("She has fought…", "Karen's fight against waste…"), not a forward pledge. It does state an ongoing priority on classroom funding and protecting teacher positions, though. A founder may reasonably read it as a stated position on A6. The gate score of 0.71 is the reason the run passed on it.

No other passage states a commitment on any taxonomy issue. The other 14 are job titles, board memberships and a family line, for example 7c58ac3d "Education Advocate – Elected in 2018 as Hillsborough County School Board Member at-large" and 40cd4dcd "Karen Perez has three adult children…".

VERDICT: PASS
