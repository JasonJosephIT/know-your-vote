# Step 3 review: FL-VF-ORA-1401 (Roberta Walton Johnson), FL-ORA-CLERK-general

- Official site: https://voteroberta.com/
- Run reviewed: `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:59:21Z). This is the two-gate run: `question_ids` asks `q_states_policy` and `q_own_commitment`, and a passage states a policy only if it clears both. Also read: `passages.jsonl` (56 passages) and `ingest.log`.
- Spine: undecided for this race. Check 4 covers all 25 taxonomy issues in `src/lib/news-issues.ts` (tax-7), and check 5 considers every taxonomy issue.
- Method: every check was run with a `node` script over `run.json` and `passages.jsonl`. Nothing was fetched from the web.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical) | PASS |
| 3 | No inferred motive (policy flags are real commitments) | PASS |
| 4 | Silence recorded, not filled | PASS: 0 passages clear the threshold on any taxonomy issue, so every issue is `no_stated_position_found` |
| 5 | Possible misses (information only, not a fix) | 2 reported: `93f93158`, `bd3894ca` |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 56 passage urls in `run.json` are on host `voteroberta.com`, and so are all 56 in `passages.jsonl`. No other host appears. Both files hold the same 56 ids, with no id missing from either and no duplicates.

| Page | Passages |
|---|---|
| https://voteroberta.com/ | 37 |
| https://voteroberta.com/platform | 11 |
| https://voteroberta.com/meet-roberta | 8 |

The homepage includes endorser names (for example `a3ffc417`, `13565b29`, `15877698`) and an account of a Democratic Party event (`9467da20`, `6b1fc7f3`, `64f3f090`, `600d3278`). The candidate published these on her own site, and the run marks every one of them `states_policy: false`.

`ingest.log` lists per-page counts only for `/platform` (11) and `/meet-roberta` (8). It does not print the homepage's count, but its total is 56, which leaves 37 for the homepage and agrees with `run.json`.

### 2. Quotes verbatim: PASS

The script compared the UTF-8 bytes of each `run.json` passage's `text` (`Buffer.equals`) with the `passages.jsonl` passage that has the same id. It also compared `url` and `heading`. All 56 passages match on all three fields, so the 10 marked `states_policy: true` match too:

`94842098`, `4a8f94e8`, `e8b3fab1`, `512de5a2`, `9a7af51f`, `ef062914`, `882f77d8`, `d344c47e`, `88eef6e5`, `939fc48e`: all identical.

The script also recomputed each verdict from its scores. `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85` on all 56 passages. Each `issues` list equals the set of scores at or above 0.85, which is empty every time. `counts` (56 asked, 10 states_policy, 0 with_issue, 0 failed) matches the recount.

### 3. No inferred motive: PASS

`counts.states_policy` is 10, and all 10 passages come from `/platform`. Each one is a forward-looking commitment by the candidate: either a "Roberta will ..." sentence or a numbered item under the heading "What Roberta will do as your Clerk of Court." None of them is only biography, an attack on an opponent, fundraising or event copy.

| id | commitment / own_commitment | first 20 words |
|---|---|---|
| 94842098 | 0.95 / 0.94 | Every person who interacts with the Clerk's Office should be treated with dignity, respect, and professionalism. Roberta will lead a |
| 4a8f94e8 | 0.91 / 0.89 | Orange County is growing, and the Clerk's Office must grow with it. Roberta will champion innovation and technology-forward service so |
| e8b3fab1 | 0.88 / 0.92 | The Clerk is the official keeper of the court's records and the steward of public funds. Roberta will safeguard court |
| 512de5a2 | 0.92 / 0.94 | Roberta will lead community education partnerships that help residents understand how their courts work for them, building public trust between |
| 9a7af51f | 0.94 / 0.96 | 1 Build community education partnerships for residents navigating complex, quality-of-life issues. |
| ef062914 | 0.94 / 0.96 | 2 Report important data analytics to improve public trust and governmental accountability. |
| 882f77d8 | 0.94 / 0.96 | 3 Innovate and rebrand our offices as a technology-forward service provider. |
| d344c47e | 0.94 / 0.95 | 4 Develop customer-centered service tools for our growing population and multilingual communities. |
| 88eef6e5 | 0.90 / 0.95 | 5 Guard and steward our trusted public records. |
| 939fc48e | 0.95 / 0.97 | 6 Establish a community-focused gateway to our courts. |

Every biography passage is marked `states_policy: false`: all of `/meet-roberta`, homepage `30f6de3b` and `f0746d82`, and the past-record card `3cc2f423`. So is every endorsement passage, every event passage, and the quoted slogan `5d7a7759`. The largest `own_commitment` score on any of these is 0.18 (`4ef9cccd`). No passage was flagged as policy when it should not have been.

The 10 flagged passages are the same 10 that the earlier one-gate run (`attempt-1-one-gate/`, same 56-passage corpus) flagged. For this site the second gate removed nothing and added nothing.

### 4. Silence recorded, not filled: PASS

For each issue, the table counts the passages whose score is at or above 0.85. The count is 0 for all 25 taxonomy issues. `issues` is `[]` on all 56 passages, `areas` is `[]`, and `counts.with_issue` is 0. `run-report.txt` presents this as a result ("No passage cleared both the commitment gate and an issue question"), not as an error.

| Issue | Passages ≥ 0.85 | Coverage |
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

All 10 policy passages are commitments about running the Clerk's Office: court access, technology, records, data reporting and community education. The run leaves them untagged. Under the constitution they can be kept as candidate-tier issues for this candidate only, and they should not count toward any spine issue.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but state a commitment in plain words, and that commitment touches a taxonomy issue. The only issue involved is B7, whose aliases include "court system".

| id | commitment / own_commitment | B7 score | first 20 words |
|---|---|---|---|
| 93f93158 | 0.74 / 0.72 | 0.51 | Safeguard official court records, protect public funds, and uphold the highest standard of data quality. |
| bd3894ca | 0.83 / 0.87 | 0.71 | Build community education partnerships that strengthen public trust and help residents navigate the courts. |

Both are homepage summary cards, under the headings "Public Records Integrity" and "Community & Court Connection". They repeat commitments the run already catches on `/platform` (`e8b3fab1` / `88eef6e5` and `512de5a2` / `9a7af51f`), so the substance is not lost. Whether the Clerk's court administration belongs under B7 is a taxonomy question for the founder, and this review does not decide it.

Other passages considered and left off the list:
- `c78c24cb` (0.70 / 0.87): "Innovate and rebrand our offices as a technology-forward service provider built for our growing population." This is a commitment, but it matches no taxonomy issue.
- `049109aa` (0.42 / 0.36): "Every resident deserves dignity, respect, professionalism, and compassion when they interact with the Clerk's Office." This states a value, not a commitment.
- `2a4b201b` (0.32 / 0.53): "Roberta is running to ensure the office remains grounded in professionalism, accessibility, innovation, accountability, and trusted leadership..." This is a general statement of values, and it touches no taxonomy issue.

Also for information: `94842098` is already flagged as policy, and its B7 score of 0.82 is the closest any passage comes to an issue tag.

### Notes (not part of the verdict)

- **Stale report:** `ingest-report.md` describes the earlier run. Its "Step 2" section gives provenance `q-b2171346` and 196065 / 25648 tokens, which match `attempt-1-one-gate/run.json`. The current `run.json` and `run.log` give `q-e7282116` and 207713 / 26824 tokens. The counts in the report (10 policy, 0 with an issue) are unchanged.
- **Coverage:** the ingest read 3 of the 7 links Jev judged. It skipped `/service-leadership` (policy score 0.47), `/clerk-of-court-explained` (0.29) and `/legal-timeline` (0.12), all on the candidate's own domain. Any positions on those pages are not in this run.

VERDICT: PASS
