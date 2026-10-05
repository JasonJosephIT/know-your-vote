# Step 3 review: FL-VF-HIL-2640 (Harry Cohen), FL-HIL-CC1-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (10 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:58:54Z), `ingest.log`. For context only: `links.jsonl`, `run-report.txt`, `run.log`, `meta.tsv`, `ingest-report.md`. The earlier one-gate run and its review are kept in `attempt-1-one-gate/`; this review covers the current two-gate `run.json` only.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 sub-issues), and check 5 considers every taxonomy issue.

Threshold rule, from the code: a passage states a policy only when BOTH gates clear, `commitment >= 0.85` AND `own_commitment >= 0.85` (`readVerdict` in `src/lib/policy-noul.ts`, lines 206-208). It is tagged with an issue when that issue's score is `>= 0.85` (`applyThreshold` in `src/lib/news-characterize.ts`), whether or not the gates pass. Only passages that state a policy go into `areas` (`groupByArea`).

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 10 passages in run.json are on `harrycohen.vote`, the OFFICIAL_SITE host. `areas` is empty. No other host appears. |
| 2 | Quotes verbatim | **PASS** | No passage is marked `states_policy`, so the required set is empty. All 10 run.json passages were still checked with a script and match passages.jsonl byte for byte. |
| 3 | No inferred motive | **PASS** | No passage is marked as stating a policy (`counts.states_policy` 0, recomputed 0), so none can be biography, attack, fundraising or event copy marked as policy. |
| 4 | Silence recorded, not filled | **PASS** | All 25 issues: 0 passages state a policy and clear the issue threshold. All 25 are `no_stated_position_found`. Two passages clear the A2 issue score but fail the gates (`0e490e37`, `8f337f9d`), and the run correctly keeps them out of `areas`. Every gate, tag and count matches the scores and the threshold. |
| 5 | Possible misses (information only) | Reported | `8f337f9d` (A2), `9b5717e6` (KYV5), and `047fd66f` (B7, borderline). Also for information: `daefda1e` (transportation) makes a commitment, but no taxonomy issue covers transportation. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script (`scratchpad/check-2640-v2.cjs`) parsed the host from every `url` in run.json and passages.jsonl:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| harrycohen.vote | 10 | 0 (`areas` is `[]`) | 10 |

Every passage comes from one page, `https://harrycohen.vote/`. The run.json `site` is `https://harrycohen.vote`. No other host, redirect or third-party URL appears.

Informational: `ingest.log` shows Jev chose `/plans` as the policy page (policy 0.94) and `/about` as the about page (about 0.91). Both were fetched in the browser after a bot challenge (HTTP 202), and each gave `0 passage(s)`. The corpus is therefore the homepage only. The candidate's own plans page was reached but added no text, so every count below covers the homepage only.

### 2. Quotes verbatim: PASS

The same script compared each run.json passage to the passages.jsonl passage with the same `id`, using `Buffer.equals` on the UTF-8 text. It also compared url and heading. Neither file has duplicate ids, and every passages.jsonl id is in run.json.

| id | states_policy | bytes | sha256 (first 12) | text | url + heading |
|---|---|---|---|---|---|
| 0e490e37 | false | 259 | 44de5d9b163a | identical | match |
| 7d423e57 | false | 190 | 6aa7f8ef6ba6 | identical | match |
| cba2612e | false | 68 | 1f72f2f93d0c | identical | match |
| daefda1e | false | 78 | 323c545ecdf0 | identical | match |
| 9b5717e6 | false | 81 | bff81300fe0d | identical | match |
| 8f337f9d | false | 87 | 20a18c08215c | identical | match |
| 047fd66f | false | 86 | bb6a087b1457 | identical | match |
| 195d2a3c | false | 49 | c854e2b426c9 | identical | match |
| 7e8149ed | false | 97 | 9d7fbb4086ed | identical | match |
| e5d67585 | false | 104 | b0844f4219e4 | identical | match |

No passage is marked as stating a policy, so the check is vacuously met. It would also be met for any subset.

### 3. No inferred motive: PASS

No passage is marked `states_policy: true`. `counts.states_policy` is 0, and recomputing the two-gate rule from the stored scores also gives 0. `run-report.txt` says: "No passage cleared both the commitment gate and an issue question."

The non-policy copy was correctly left out. For the record:

| id | commitment / own_commitment | kind | first words |
|---|---|---|---|
| 0e490e37 | 0.75 / 0.42 | past record | "Since joining the Hillsborough County Commission, Harry has focused on the work that matters — strengthening infrastructure, improving transportation, protecting…" |
| 7d423e57 | 0.10 / 0.10 | reelection appeal | "Important work is already underway. Reelecting Harry means keeping an experienced, effective commissioner on the job and continuing the progress…" |
| cba2612e | 0.08 / 0.10 | section intro | "Real plans, not slogans — here's where this campaign is focused." |
| 195d2a3c | 0.06 / 0.08 | volunteer / fundraising | "Volunteer, request a yard sign, or chip in today." |
| 7e8149ed | 0.04 / 0.31 | fundraising | "Harry is counting on supporters like you. Every dollar goes to reaching voters across District 1." |
| e5d67585 | 0.03 / 0.04 | sign-up | "Get campaign news, events, and ways to help keep Hillsborough moving forward — straight to your inbox." |

### 4. Silence recorded, not filled: PASS

**States policy + issue** counts passages that pass both gates and whose issue score is at least 0.85. These are the passages that would enter `areas` and support a stated position. **Issue score only** counts passages whose issue score is at least 0.85, whatever the gates say. It is shown for transparency and does not establish a stated position.

| Issue | Label | States policy + issue | Issue score only (ids: score) | Coverage |
|---|---|---|---|---|
| A1 | Property insurance costs | 0 | 0 | no_stated_position_found |
| A2 | Housing affordability | 0 | 2 (`0e490e37`: 0.91, `8f337f9d`: 0.96) | no_stated_position_found |
| A3 | Property taxes | 0 | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | 0 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | 0 | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 | 0 | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | 0 | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | 0 | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | 0 | no_stated_position_found |
| B5 | Abortion policy | 0 | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | 0 | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | 0 | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | 0 | no_stated_position_found |

Consistency, checked by script: for all 10 passages, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, and `issues` equals the issue ids scoring at least 0.85. `counts` (10 / 10 / 0 / 0 / 0) matches the recomputation. `areas` is `[]`, which is right when nothing states a policy. The run fills nothing: the two A2 score hits failed the gates, and the run did not promote them into a position.

### 5. Possible misses (information only, not a fix)

These are passages the run marks `states_policy: false` although their wording plainly commits the candidate on a taxonomy issue. All four sit under the homepage section "What We're Fighting For" ("Real plans, not slogans — here's where this campaign is focused."). The `q_own_commitment` question says in its own wording that "a bare plan item … counts".

| id | heading | text (in full, under 20 words) | gates (c / own) | issue scores | note |
|---|---|---|---|---|---|
| 8f337f9d | Affordable housing | "Fight for practical housing investments that help families stay in Hillsborough County." | 0.92 / **0.84** | A2 0.96 | Clear miss on A2. It passes the first gate and the issue, and misses the second gate by 0.01. |
| 9b5717e6 | Water & environment | "Protect the region's water supply, natural resources, and environmental future." | 0.80 / 0.70 | KYV5 0.79, B8 0.49 | Plain commitment on water supply (KYV5). It fails both gates and the KYV5 threshold. |
| 047fd66f | Public safety & services | "Give first responders and county employees the resources to serve a growing community." | 0.89 / 0.80 | B7 0.73 | Plain commitment. Mapping it to B7 (crime policy, policing and courts) is borderline: first responders include police, but the label is narrower. It fails the second gate and the B7 threshold. |

Not a spine miss, for information: `daefda1e` (Transportation & infrastructure), "Keep projects moving, improve safety, and ease congestion as the county grows." It is a bare plan item (c 0.72 / own 0.67). The v7 taxonomy has no transportation issue, and its highest score is KYV3 at 0.16, so it would be a candidate-tier issue.

Not flagged: `0e490e37` scores A2 at 0.91 and KYV5 at 0.81, but it describes a past record ("has focused on"). The second gate (0.42) correctly keeps it out.

### Other notes for the founder

- `ingest-report.md`, section "Step 2: policy run (Jev)", describes the earlier one-gate run (`q-b2171346`: 2 state a policy, 1 with an issue, 34906 / 4580 tokens). The current `run.json`, `run-report.txt` and `run.log` are the two-gate run (`q-e7282116`: 0 state a policy, 36986 / 4790 tokens). The ingest sections of the report still match. The Step 2 table is out of date and was not edited here.
- The whole corpus is 10 homepage passages (159 words). `/plans` and `/about` were fetched but gave 0 passages, so the zero counts above reflect what was ingested, not necessarily everything the site says.

VERDICT: PASS
