# Step 3 review: FL-VF-HIL-2640 (Harry Cohen), FL-HIL-CC1-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (10 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`. For context only: `links.jsonl`, `run-report.txt`, `run.log`, `meta.tsv`, `ingest-report.md`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 sub-issues), and check 5 considers every taxonomy issue.

Threshold rule, from the code: a passage states a policy when `commitment >= 0.85` (`readVerdict` in `src/lib/policy-noul.ts`). It is tagged with an issue when that issue's score is `>= 0.85` (`applyThreshold` in `src/lib/news-characterize.ts`). Tagging is applied whether or not the gate passes. Only passages that state a policy go into `areas` (`groupByArea`).

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 10 passages in run.json, and the 1 citation in `areas`, are on `harrycohen.vote` (the OFFICIAL_SITE host). No other host appears. |
| 2 | Quotes verbatim | **PASS** | Both `states_policy` passages (`8f337f9d`, `047fd66f`) match passages.jsonl byte for byte, checked with a script. So do all 10 passages and the `areas` citation. |
| 3 | No inferred motive | **PASS** | Both passages marked as stating a policy (`8f337f9d`, `047fd66f`) are forward commitments. Neither is only biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | A2 1 (`8f337f9d`). The other 24 issues have 0 and are `no_stated_position_found`. Every `issues` tag and gate matches the scores and the threshold exactly. |
| 5 | Possible misses (information only) | Reported | One: `9b5717e6` (water supply, KYV5). Also for information: `daefda1e` makes a commitment on transportation, which has no taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

I parsed the host from every `url` in run.json (`passages` and `areas`) and in passages.jsonl:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| harrycohen.vote | 10 | 1 | 10 |

Every passage comes from one page, `https://harrycohen.vote/`. No other host, redirect or third-party URL appears. `run.json` `site` is `https://harrycohen.vote`.

Informational: `ingest.log` shows that Jev chose `/plans` as the policy page (policy 0.94) and `/about` as the about page (0.91). Both were fetched in the browser after a bot challenge (HTTP 202), and each yielded `0 passage(s)`. So the corpus is the homepage only. The candidate's own plans page was reached but contributed no text, and every count in check 4 is limited to that.

### 2. Quotes verbatim: PASS

A node script (`scratchpad/check-2640.cjs`) compared each run.json passage to the passages.jsonl passage with the same `id`. It used `Buffer.equals` on the UTF-8 text and also compared url and heading. There are no duplicate ids in either file.

| id | states_policy | bytes | sha256 (first 12) | result |
|---|---|---|---|---|
| 8f337f9d | true | 87 | 20a18c08215c | identical |
| 047fd66f | true | 86 | bb6a087b1457 | identical |
| 0e490e37 | false | 259 | 44de5d9b163a | identical |
| 7d423e57 | false | 190 | 6aa7f8ef6ba6 | identical |
| cba2612e | false | 68 | 1f72f2f93d0c | identical |
| daefda1e | false | 78 | 323c545ecdf0 | identical |
| 9b5717e6 | false | 81 | bff81300fe0d | identical |
| 195d2a3c | false | 49 | c854e2b426c9 | identical |
| 7e8149ed | false | 97 | 9d7fbb4086ed | identical |
| e5d67585 | false | 104 | b0844f4219e4 | identical |

The single `areas` citation (A2, `8f337f9d`, score 0.96) also matches passages.jsonl byte for byte.

### 3. No inferred motive: PASS

The two passages marked `states_policy: true`:

| id | commitment | tags | heading | text (under 20 words, in full) | assessment |
|---|---|---|---|---|---|
| 8f337f9d | 0.93 | A2 | Affordable housing | "Fight for practical housing investments that help families stay in Hillsborough County." | Forward commitment on housing. Not biography, attack, fundraising or event copy. |
| 047fd66f | 0.87 | (none) | Public safety & services | "Give first responders and county employees the resources to serve a growing community." | Forward commitment on public safety and county services. Not biography, attack, fundraising or event copy. |

No passage is flagged under this check.

The fundraising and sign-up copy (`195d2a3c`, `7e8149ed`, `e5d67585`), the section header (`cba2612e`) and the reelection pitch (`7d423e57`) are all marked `states_policy: false`, with commitment between 0.03 and 0.10.

### 4. Silence recorded, not filled: PASS

This counts the passages that state a policy (gate `>= 0.85`) and clear the threshold for each issue. These are the passages that can become a stated position. The script also recomputed every `issues` tag from `scores` and every gate from `commitment`, and all 10 match the file.

| Issue | Label | Passages over threshold | Ids | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 1 | 8f337f9d (0.96) | stated |
| A1 | Property insurance costs | 0 | | no_stated_position_found |
| A3 | Property taxes | 0 | | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 | | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | | no_stated_position_found |
| B5 | Abortion policy | 0 | | no_stated_position_found |
| B6 | Election integrity | 0 | | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | | no_stated_position_found |
| KYV7 | Homelessness | 0 | | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | | no_stated_position_found |

Counted on raw scores alone, ignoring the gate, only A2 changes: it rises to 2. The extra passage is `0e490e37` (A2 0.91), which states no policy (commitment 0.75), so it is correctly kept out of `areas` and out of any stated position. No other issue has a score of 0.85 or more on any passage.

`047fd66f` states a policy but matches no taxonomy issue (highest score B7 0.72). The run reports it as "1 state a policy the taxonomy has no question for".

### 5. Possible misses (information for the founder, not a fix)

Passages marked `states_policy: false` that plainly state a commitment on a taxonomy issue:

| id | commitment | top score | heading | text (under 20 words, in full) |
|---|---|---|---|---|
| 9b5717e6 | 0.79 | KYV5 0.79 (B8 0.47) | Water & environment | "Protect the region’s water supply, natural resources, and environmental future." |

This is one of four platform lines under "What We’re Fighting For", in the same form as `8f337f9d` and `047fd66f`, which cleared the gate. Both its commitment and its KYV5 score are below 0.85.

Also for information (not a taxonomy issue, so not a spine miss):

| id | commitment | top score | heading | text (under 20 words, in full) |
|---|---|---|---|---|
| daefda1e | 0.75 | KYV3 0.17 | Transportation & infrastructure | "Keep projects moving, improve safety, and ease congestion as the county grows." |

This is a commitment on transportation. Taxonomy v7 has no transportation issue, so under the constitution it would be a candidate-tier issue.

Considered and not listed: `0e490e37` (commitment 0.75, A2 0.91, KYV5 0.81). Its first 20 words are "Since joining the Hillsborough County Commission, Harry has focused on the work that matters — strengthening infrastructure, improving transportation, protecting our water supply,". It describes past focus in the third person ("Harry has focused on") and is a summary of his record, not a plain commitment, so it is not listed as a miss.

VERDICT: PASS
