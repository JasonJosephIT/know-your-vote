# Step 3 review: FL-VF-DAD-3070 (Katrina Wilson), FL-DAD-SB1-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (1 line), `run.json` (`kyv.policy-run/1`, status `complete`, model `jev-1.13.0`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:58:53Z), `ingest.log`. For context only: `links.jsonl` (empty), `meta.tsv`, `run-report.txt`, `run.log`, `ingest-report.md`, `attempt-1-keywords/`, `attempt-1-one-gate/`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 issues), and check 5 considers every taxonomy issue.

Threshold rule, from the code: a passage states a policy only when BOTH gates clear, `commitment >= 0.85` and `own_commitment >= 0.85` (`src/lib/policy-noul.ts:206-208`), and it is tagged with an issue when that issue's score is `>= 0.85` (`src/lib/news-characterize.ts:164`).

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | The single passage `eae17f13` is on `wilsonforeducation.com` (`/`). No other host appears. `areas` is empty. |
| 2 | Quotes verbatim | **PASS** (vacuous) | No passage is marked `states_policy: true`. The one passage, `eae17f13`, still matches passages.jsonl byte for byte (text, url, heading), checked with a script. |
| 3 | No inferred motive | **PASS** | No passage is marked as stating a policy. `eae17f13` is biography only and is correctly `states_policy: false` (commitment 0.02, own_commitment 0.04). |
| 4 | Silence recorded, not filled | **PASS** | All 25 taxonomy issues have 0 passages over the threshold, so all are `no_stated_position_found`. Highest score on any issue is 0.03. `issues` is `[]`. |
| 5 | Possible misses (information only) | Reported | None. `eae17f13` states no commitment on any taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

I parsed the host (`new URL(url).host`) of every `url` in run.json (`passages`, and `areas`, which is empty) and in passages.jsonl:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| wilsonforeducation.com | 1 (`eae17f13`, `https://wilsonforeducation.com/`) | 0 | 1 |

No other host, redirect or third-party URL appears. `run.json.site` is `https://wilsonforeducation.com`, matching OFFICIAL_SITE.

### 2. Quotes verbatim: PASS (nothing to quote)

`counts.states_policy` is 0, so no passage is marked as stating a policy, and the check is met vacuously. For completeness, a node script compared every run.json passage with the passages.jsonl passage of the same `id`, using `Buffer.equals` on the UTF-8 text, and also compared url and heading. There are no duplicate ids, and no run.json id is missing from passages.jsonl.

| id | bytes | sha256 (first 12) | text | url | heading |
|---|---|---|---|---|---|
| eae17f13 | 108 | ad3fa562b91f | identical | identical | identical |

### 3. No inferred motive: PASS

No passage is marked `states_policy: true`. The only passage, `eae17f13`, is biography. The run marks it `states_policy: false`, with commitment 0.02 and own_commitment 0.04, both far below 0.85. First 20 words of its text (the whole text is 18 words): "In December, 2018 Katrina Wilson was sworn as Councilwoman in the City of Miami Gardens, Residential Seat 4."

Its `heading` field is also biography (education, family, sorority membership). The phrase "exemplifying its commitment to service, sisterhood, and academic excellence" describes the sorority, not a policy commitment by the candidate.

### 4. Silence recorded, not filled: PASS

One passage was asked; none cleared the 0.85 threshold on any issue. Every issue score on `eae17f13` is 0.02 or 0.03.

| Issue | Label | Passages >= 0.85 | Coverage |
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

All 25 issue ids in `question_ids` (besides `q_states_policy` and `q_own_commitment`) have a score on the passage; none is missing. `issues: []`, `counts.with_issue: 0` and `areas: []` agree with the scores. The run filled no gap. The campaign domain name mentions education, but a domain name is not a stated position, and no passage states one on A6, KYV9 or KYV10.

### 5. Possible misses (information only)

None. The one passage marked as stating no policy, `eae17f13` ("In December, 2018 Katrina Wilson was sworn as Councilwoman in the City of Miami Gardens, Residential Seat 4."), records an office held. It makes no commitment on any taxonomy issue.

### Informational notes for the founder (not check failures)

- **Thin corpus.** The whole ingest is one passage of 18 words from the homepage. `ingest.log` reports 4 links on the homepage but "asking Jev about 0 link(s)", so no policy page and no about page were fetched, and `links.jsonl` is empty. The all-zero result in check 4 is a result about this one passage, not evidence that the site has no issue content.
- **Stale numbers in ingest-report.md.** Its "Step 2: policy run" table gives provenance `jev:jev-1.13.0/tax-7/q-b2171346` and tokens 3620 in / 458 out. Those belong to the earlier one-gate run in `attempt-1-one-gate/`. The current `run.json` is `jev:jev-1.13.0/tax-7/q-e7282116`, tokens 3828 in / 479 out, and adds the second gate (`q_own_commitment`). The outcome (0 of 1 passages state a policy) is the same in both runs.
- **Heading holds body text.** The `heading` of `eae17f13` is a full biography paragraph (about 90 words), longer than the `text` itself. This looks like a page-structure quirk in extraction. It affects nothing here, since nothing was marked as policy.
- **Title in the constitution template.** Part 1's attribution example reads "Senator Katrina Wilson says…". The only source describes her as a Councilwoman of the City of Miami Gardens (sworn in December 2018). Any attribution line should not use "Senator" unless a candidate-controlled source says so.

VERDICT: PASS
