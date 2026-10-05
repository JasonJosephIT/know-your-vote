# Step 3 review: FL-VF-ORA-1270 (Melissa Lopez Marantes), FL-ORA-SB1-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (9 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`. For context only: `links.jsonl`, `run-report.txt`, `run.log`, `meta.tsv`, `ingest-report.md`, `attempt-1-keywords/`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 sub-issues; run.json's `question_ids` asks exactly those 25 plus `q_states_policy`), and check 5 considers every taxonomy issue.

Threshold rule, from the code: a passage states a policy when `commitment >= 0.85` (`src/lib/policy-noul.ts`), and it is tagged with an issue when that issue's score is `>= 0.85`.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 9 passages in run.json and passages.jsonl are on `www.melissaforkids.com`. `areas` is empty. No other host appears. |
| 2 | Quotes verbatim | **PASS** | All 3 `states_policy` passages (`bc99bddf`, `42020fae`, `9439152d`) match passages.jsonl byte for byte (text, url and heading), checked with a script. So do all 9. |
| 3 | No inferred motive | **PASS** | No passage marked as stating a policy is only biography, an attack, fundraising or event copy. Borderline: `9439152d` (mostly biography; its last sentence states beliefs). |
| 4 | Silence recorded, not filled | **PASS** | All 25 taxonomy issues have 0 passages over the threshold, so all 25 are `no_stated_position_found`. The highest issue score in the run is 0.46 (A7, `a0defbb7`). No `issues` tag was written anywhere. |
| 5 | Possible misses (information only) | Reported | One borderline item: `b8a0e601` (commitment 0.81, just under the gate). It does not plainly match any one taxonomy sub-issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

I parsed the host from every `url` in run.json and passages.jsonl with `new URL(url).host`:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| www.melissaforkids.com | 9 | 0 (`areas` is `[]`) | 9 |

Those passages come from `/` (5: `b8a0e601`, `bc99bddf`, `42020fae`, `a0defbb7`, `c5a88d9e`) and `/meet-melissa` (4: `aba6e36c`, `e36e0a64`, `da4f7356`, `9439152d`). That matches OFFICIAL_SITE `https://www.melissaforkids.com/`. No redirect or third-party URL appears.

Informational: `ingest.log` lists only `/meet-melissa` (4 passages) but reports 9 in total. passages.jsonl, run.json and `ingest-report.md` all show `/` = 5. This does not affect any check.

Informational, about coverage rather than compliance: the crawl found 10 links on the homepage, asked Jev about 1 (`/meet-melissa`, chosen as the about page) and chose 0 policy pages. The whole corpus is 9 passages from 2 pages.

### 2. Quotes verbatim: PASS

A node script compared each run.json passage with the passages.jsonl passage that has the same `id`. It used `Buffer.equals` on the UTF-8 text and also compared url and heading. Neither file has duplicate ids (checked with `jq ... | sort | uniq -d`), and both files have the same 9 ids.

| id | states_policy | text bytes | text equal | url equal | heading equal |
|---|---|---|---|---|---|
| bc99bddf | true | 135 | yes | yes | yes |
| 42020fae | true | 128 | yes | yes | yes |
| 9439152d | true | 484 | yes | yes | yes |
| b8a0e601 | false | 131 | yes | yes | yes |
| a0defbb7 | false | 58 | yes | yes | yes |
| c5a88d9e | false | 40 | yes | yes | yes |
| aba6e36c | false | 599 | yes | yes | yes |
| e36e0a64 | false | 326 | yes | yes | yes |
| da4f7356 | false | 584 | yes | yes | yes |

The script also checked that `states_policy` equals `commitment >= 0.85` for every passage. It does for all 9.

### 3. No inferred motive: PASS

These are the three passages marked `states_policy: true`:

| id | commitment | First 20 words | Reading |
|---|---|---|---|
| bc99bddf | 0.93 | "Foster safe, supportive schools by listening to our educators and parents needs. Ensure the safety and mental wellness of our" | Stated commitment (imperative agenda copy under the "Safety" heading). |
| 42020fae | 0.94 | "The arts builds confidence and fosters creativity. Champion policies that strengthen literacy, math, and keep arts in education." (19 words, whole passage) | Stated commitment ("Champion policies that…"). |
| 9439152d | 0.90 | "A proud FAMU Law alumna, a local graduate of Edgewater High School, a Latina, and mother of two (plus one" | Borderline. Mostly biography, but it ends with a stated belief on the candidate's own page: "She believes in strengthening public education through academic excellence, transparency, listening to parents and staff, a focus on safety including mental wellness, protecting arts programs and equitable opportunities for all students." That is a self-stated position, not only biography. |

None is only biography, an attack on an opponent, fundraising or event copy. The fundraising line (`a0defbb7`, "Mail your check with your employer name and occupation to:") and the name banner (`c5a88d9e`) are correctly marked as stating no policy. So are the three purely biographical passages (`aba6e36c`, `e36e0a64`, `da4f7356`).

Note for the founder: none of the three carries an issue tag, so the run puts no claim under any taxonomy issue. `run.log` records them as "3 state a policy the taxonomy has no question for". Under the constitution they could only become candidate-tier issues.

### 4. Silence recorded, not filled: PASS

This counts passages with an issue score `>= 0.85`, over all 9 passages and all 25 taxonomy issues:

| Issue | Label | Passages over threshold | Coverage |
|---|---|---|---|
| A1 | Property insurance costs | 0 | no_stated_position_found |
| A2 | Housing affordability | 0 | no_stated_position_found |
| A3 | Property taxes | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | no_stated_position_found |
| B5 | Abortion policy | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | no_stated_position_found |

The highest issue score anywhere in the run is 0.46 (A7 on `a0defbb7`, which states no policy). Every `issues` array is `[]`, `counts.with_issue` is 0 and `areas` is `[]`, which agrees with the scores. `run-report.txt` records the empty result as a result, not an error. Nothing was filled.

### 5. Possible misses (information only)

This covers the 6 passages marked `states_policy: false`:

| id | commitment | First 20 words | Reading |
|---|---|---|---|
| b8a0e601 | 0.81 | "Every child deserves an education that meets their unique needs. Public schools should have equitable opportunity for all students." (19 words, whole passage) | Borderline. It is a normative statement about public schools ("should have equitable opportunity"), placed under the homepage "Students" heading beside `bc99bddf` and `42020fae`, which cleared the gate. It is not a plain commitment on any single taxonomy sub-issue: its highest issue score is A6 at 0.21, and A6 is about funding and teachers. Even if it cleared the gate it would carry no issue tag. |
| a0defbb7 | 0.04 | "Mail your check with your employer name and occupation to:" | Fundraising. Not a miss. |
| c5a88d9e | 0.03 | "Melissa for Orange County Public Schools" | Name banner. Not a miss. |
| aba6e36c | 0.46 | "is a mother, an attorney, educator, and lifelong advocate for children and families in Central Florida. As the Executive" | Biography and general "ready to listen" copy. No commitment on a taxonomy issue. Not a miss. |
| e36e0a64 | 0.03 | "Melissa is an Orange County Public School graduate and has lived in District 1 for ten years. She also" | Biography. Not a miss. |
| da4f7356 | 0.08 | "Before becoming an attorney, Melissa spent a decade in the advertising industry as an interactive broadcast producer. During this" | Biography. Not a miss. |

VERDICT: PASS
