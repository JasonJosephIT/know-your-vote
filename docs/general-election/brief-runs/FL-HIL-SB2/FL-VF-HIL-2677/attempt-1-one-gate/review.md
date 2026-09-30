# Step 3 review: FL-VF-HIL-2677 (Brittany Lyssy), FL-HIL-SB2-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (3 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`. For context only: `run-report.txt`, `run.log`, `meta.tsv`, `ingest-report.md`, `links.jsonl` (empty), `attempt-1-keywords/`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 issues), and check 5 considers every taxonomy issue.

Threshold rule: a passage states a policy when `commitment >= 0.85`, and it is tagged with an issue when that issue's score is `>= 0.85`.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 3 passages (`9e1c8547`, `72e7e3d8`, `1a8be4f5`) are on `www.votebrittanylyssy.com`, the OFFICIAL_SITE host. No other host appears. `areas` is empty. |
| 2 | Quotes verbatim | **PASS** | Both `states_policy` passages (`72e7e3d8`, `1a8be4f5`) match passages.jsonl byte for byte (text, url and heading), checked with a script. So does `9e1c8547`. |
| 3 | No inferred motive | **PASS** | Neither `states_policy` passage is only biography, attack, fundraising or event copy. Each contains a stance statement attributed to the candidate. Borderline: `72e7e3d8` is mostly biography (see evidence). |
| 4 | Silence recorded, not filled | **PASS** | All 25 taxonomy issues: 0 passages over the threshold. Every issue is `no_stated_position_found`. Every `issues` array is `[]`, which matches the scores and the threshold. |
| 5 | Possible misses (information only) | Reported | None. The one passage marked as stating no policy (`9e1c8547`) states no commitment. |

## Evidence

### 1. Candidate-controlled sources only: PASS

I parsed the host from every `url` in run.json and in passages.jsonl:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| www.votebrittanylyssy.com | 3 | 0 | 3 |

All three passages come from one page, `https://www.votebrittanylyssy.com/`. No redirect or third-party URL appears.

Informational: `ingest.log` says the homepage had 10 links, but Jev was asked about 0 of them (`asking Jev about 0 link(s)`), and 0 policy pages and no about page were chosen. `links.jsonl` is empty. So the corpus is the homepage only (3 passages, 191 words). This does not affect any check, but it limits how much of the site the run saw. `attempt-1-keywords/passages.jsonl` holds the same 3 passages (same ids, text, url and heading; only `retrieved_at` differs).

### 2. Quotes verbatim: PASS

A node script compared each run.json passage to the passages.jsonl passage with the same `id`. It used `Buffer.equals` on the UTF-8 text and also compared url and heading. Every id appears in both files, and neither file has an id the other lacks.

| id | states_policy | bytes | sha256 (first 12) | result |
|---|---|---|---|---|
| 72e7e3d8 | true | 671 | 132ce71e97c8 | identical |
| 1a8be4f5 | true | 440 | 73355a943721 | identical |
| 9e1c8547 | false | 139 | 2caa43e56f07 | identical |

### 3. No inferred motive: PASS

The two passages marked as stating a policy:

- `72e7e3d8` (commitment 0.91): "who believes parents, not politics, should guide their children’s education. She and her husband, Doug, are raising their three young". Borderline. Most of it is biography (family, degrees, Florida Bar, Ph.D. studies). It also contains a stance attributed to the candidate: "Brittany believes parents deserve a clear voice in their children’s education and that schools must prioritize reading, math, science, and civics, not politics." That is a stated belief, not only biography, so it is not a failure. A Profiler claim from this passage should quote only the stance sentence and attribute it ("The campaign website states…").
- `1a8be4f5` (commitment 0.96): "She also served on the City of Tampa Citizens Advisory Budget and Finance Committee, where she works to ensure transparency". The first sentence is biography. The passage then states: "She is running for the School Board to defend parental rights, demand financial responsibility, and keep the focus where it belongs, on students and academic excellence." That is a commitment by the candidate.

Neither passage is an attack on an opponent, fundraising or event copy.

### 4. Silence recorded, not filled: PASS

Count of passages with a score `>= 0.85` for each taxonomy issue (25 issues, all 25 scored on all 3 passages):

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

A script recomputed each passage's issue tags from its scores and the threshold. All three match run.json (`[]`). `counts.with_issue` is 0 and `areas` is `[]`, and `run-report.txt` says: "No passage cleared both the commitment gate and an issue question."

### 5. Possible misses (information only)

Passages marked as stating no policy: `9e1c8547` only (commitment 0.13).

- `9e1c8547`: "“ Strong families and well-rounded education give children the foundation they need to thrive, adapt, and achieve in the years". This is a general values quote. It makes no commitment, so it is not a miss.

For information, not a fix: the two passages that do state a policy (`72e7e3d8`, `1a8be4f5`) carry no issue tag. `run.log` records them as "state a policy the taxonomy has no question for". Their stances (parental rights, curriculum priorities, school-board fiscal responsibility) are not tagged to any taxonomy issue at this threshold. If the Profiler writes them, they go in as candidate-tier issues, not under a taxonomy issue.

VERDICT: PASS
