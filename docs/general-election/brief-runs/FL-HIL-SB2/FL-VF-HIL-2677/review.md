# Step 3 review: FL-VF-HIL-2677 (Brittany Lyssy), FL-HIL-SB2-general

Reviewer: Step 3, working under the Profiler constitution. The review was read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (3 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:59:02Z), `ingest.log`. Read for context only: `run-report.txt`, `run.log`, `meta.tsv`, `ingest-report.md`, `links.jsonl` (empty), `attempt-1-keywords/`, `attempt-1-one-gate/` (the earlier one-gate run and its review).

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 issues). Check 5 considers every taxonomy issue.

Threshold rule (`src/lib/policy-noul.ts`): a passage states a policy only when `commitment >= 0.85` AND `own_commitment >= 0.85`. It is tagged with an issue when that issue's score is `>= 0.85`.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 3 passages (`9e1c8547`, `72e7e3d8`, `1a8be4f5`) are on `www.votebrittanylyssy.com`, the OFFICIAL_SITE host. No other host appears. `areas` is empty. |
| 2 | Quotes verbatim | **PASS** | The one `states_policy` passage (`1a8be4f5`) matches passages.jsonl byte for byte (text, url and heading). A script checked this. The other two passages match as well. |
| 3 | No inferred motive | **PASS** | `1a8be4f5` states a commitment by the candidate. It is not only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | 0 passages clear the threshold on any of the 25 taxonomy issues. Every issue is `no_stated_position_found`. Every `issues` array is `[]`, which matches the scores. |
| 5 | Possible misses (information only) | Reported | None on a taxonomy issue. `72e7e3d8` is noted for information: it holds a stated belief that the second gate dropped. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script parsed the host from every `url` in run.json:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| www.votebrittanylyssy.com | 3 | 0 | 3 |

All three passages come from one page, `https://www.votebrittanylyssy.com/`. No redirect or third-party URL appears. `run.json` `site` is `https://www.votebrittanylyssy.com`.

This does not affect any check, but `ingest.log` shows the run saw only the homepage. The homepage had 10 links, and Jev was asked about 0 of them (`asking Jev about 0 link(s)`). No policy pages and no about page were chosen. The corpus is 3 passages (191 words).

### 2. Quotes verbatim: PASS

A node script compared each run.json passage with the passages.jsonl passage of the same `id`. It ran `Buffer.equals` on the UTF-8 text and also compared url and heading. Every id is in both files, and neither file has an id the other lacks.

| id | states_policy | bytes | sha256 (first 12) | result |
|---|---|---|---|---|
| 1a8be4f5 | true | 440 | 73355a943721 | identical |
| 72e7e3d8 | false | 671 | 132ce71e97c8 | identical |
| 9e1c8547 | false | 139 | 2caa43e56f07 | identical |

The script also recomputed each `states_policy` from `commitment`, `own_commitment` and the threshold. All three match run.json.

### 3. No inferred motive: PASS

The only passage marked as stating a policy:

- `1a8be4f5` (commitment 0.96, own_commitment 0.85): "She also served on the City of Tampa Citizens Advisory Budget and Finance Committee, where she works to ensure transparency". The first sentence is biography. The passage then says: "She is running for the School Board to defend parental rights, demand financial responsibility, and keep the focus where it belongs, on students and academic excellence." That is a commitment by the candidate. The passage is not an attack on an opponent, fundraising or event copy. `own_commitment` sits exactly on the threshold (0.85).

`72e7e3d8` passed this check in the one-gate run (`attempt-1-one-gate/review.md`), where it was borderline. It is no longer marked as stating a policy (see check 5).

### 4. Silence recorded, not filled: PASS

This table counts, for each taxonomy issue, the passages that score `>= 0.85` on it. There are 25 issues, and each was scored on all 3 passages.

| Issue | Count | Coverage |
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

A script recomputed each passage's issue tags from its scores and the threshold. All three match run.json (`[]`). `counts.with_issue` is 0 and `areas` is `[]`. `run-report.txt` says: "No passage cleared both the commitment gate and an issue question."

### 5. Possible misses (information only)

Two passages are marked as stating no policy.

- `9e1c8547` (commitment 0.13, own_commitment 0.08): "“ Strong families and well-rounded education give children the foundation they need to thrive, adapt, and achieve in the years". This is a general values quote with no commitment. It is not a miss.
- `72e7e3d8` (commitment 0.91, own_commitment 0.55): "who believes parents, not politics, should guide their children’s education. She and her husband, Doug, are raising their three young". Most of this passage is biography: family, degrees, Florida Bar membership, Ph.D. studies. It also includes a belief attributed to the candidate: "Brittany believes parents deserve a clear voice in their children’s education and that schools must prioritize reading, math, science, and civics, not politics." That belief is about parental voice and curriculum priorities, and none of the 25 taxonomy issues covers either subject. So it is not a plain commitment on a taxonomy issue, and I do not count it as a miss. The founder may still want to know about it. In the one-gate run this passage counted as stating a policy (commitment 0.91). The second gate (`own_commitment` 0.55) is the only reason it now falls out.

Also for information, not a fix: `1a8be4f5` states a policy but carries no issue tag (A6 scores 0.81, below 0.85). `run.log` records it as one that "state[s] a policy the taxonomy has no question for". If the Profiler writes it, it becomes a candidate-tier issue, not a taxonomy issue.

A housekeeping note: `ingest-report.md` is stale. Its Step 2 table describes the earlier one-gate run (`q-b2171346`, "State a policy: 2", 10691 tokens in). The current run.json is `q-e7282116`, has 1 passage stating a policy, and used 11315 tokens in. This does not change any check.

VERDICT: PASS
