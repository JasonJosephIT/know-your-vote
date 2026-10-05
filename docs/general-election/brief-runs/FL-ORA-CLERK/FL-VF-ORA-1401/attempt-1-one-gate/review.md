# Step 3 review: FL-VF-ORA-1401 (Roberta Walton Johnson), FL-ORA-CLERK-general

- Official site: https://voteroberta.com/
- Run reviewed: `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `passages.jsonl` (56 passages), `ingest.log`
- Spine: undecided for this race, so check 4 covers all 25 taxonomy issues in `src/lib/news-issues.ts` (tax-7) and check 5 considers every taxonomy issue.
- Method: every check below was run with `node` over the two files. Nothing was fetched from the web.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical) | PASS |
| 3 | No inferred motive (policy flags are real commitments) | PASS |
| 4 | Silence recorded, not filled | PASS: 0 passages clear the threshold on any taxonomy issue, so every issue is `no_stated_position_found` |
| 5 | Possible misses (information only, not a fix) | 2 possible misses reported: `93f93158`, `bd3894ca` |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 56 passages in `run.json` and all 56 in `passages.jsonl` are on host `voteroberta.com`. No other host appears. The set of passage ids is the same in both files (no id in one and not the other, no duplicate ids). `ingest.log` shows only three pages read, all on the official site:

| Page | Passages |
|---|---|
| https://voteroberta.com/ | 37 |
| https://voteroberta.com/platform | 11 |
| https://voteroberta.com/meet-roberta | 8 |

The homepage passages include endorser names (for example `a3ffc417`, `13565b29`) and an account of a Democratic Party event (`9467da20`, `6b1fc7f3`, `64f3f090`, `600d3278`). These are published on the candidate's own site. The run marks all of them as stating no policy.

### 2. Quotes verbatim: PASS

A script compared each `run.json` passage's `text` with the `passages.jsonl` passage that has the same id, as UTF-8 buffers (`Buffer.equals`). It also compared `url`. All 56 passages match on both, so the 10 marked `states_policy: true` match too:

`94842098`, `4a8f94e8`, `e8b3fab1`, `512de5a2`, `9a7af51f`, `ef062914`, `882f77d8`, `d344c47e`, `88eef6e5`, `939fc48e`: all IDENTICAL.

### 3. No inferred motive: PASS

`counts.states_policy` is 10, and all 10 passages come from `/platform`. Each one is a forward-looking commitment by the candidate: either a "Roberta will ..." sentence or a numbered item under the heading "What Roberta will do as your Clerk of Court." None of them is only biography, an attack on an opponent, fundraising or event copy.

| id | commitment | first words |
|---|---|---|
| 94842098 | 0.95 | Every person who interacts with the Clerk's Office should be treated with dignity, respect, and professionalism. Roberta will lead a... |
| 4a8f94e8 | 0.91 | Orange County is growing, and the Clerk's Office must grow with it. Roberta will champion innovation and technology-forward service... |
| e8b3fab1 | 0.88 | The Clerk is the official keeper of the court's records and the steward of public funds. Roberta will safeguard court records,... |
| 512de5a2 | 0.91 | Roberta will lead community education partnerships that help residents understand how their courts work for them, building public trust... |
| 9a7af51f | 0.94 | 1 Build community education partnerships for residents navigating complex, quality-of-life issues. |
| ef062914 | 0.93 | 2 Report important data analytics to improve public trust and governmental accountability. |
| 882f77d8 | 0.94 | 3 Innovate and rebrand our offices as a technology-forward service provider. |
| d344c47e | 0.93 | 4 Develop customer-centered service tools for our growing population and multilingual communities. |
| 88eef6e5 | 0.91 | 5 Guard and steward our trusted public records. |
| 939fc48e | 0.95 | 6 Establish a community-focused gateway to our courts. |

Every biography passage (all of `/meet-roberta`, and homepage `30f6de3b` and `f0746d82`), every endorsement passage, and every event passage is marked `states_policy: false`. No passage was flagged as policy wrongly.

### 4. Silence recorded, not filled: PASS

The count below is the number of passages whose score for the issue is at or above 0.85. It is 0 for every one of the 25 taxonomy issues, and `issues` is `[]` on all 56 passages. `areas` is `[]` and `counts.with_issue` is 0. `run-report.txt` records this as a result ("No passage cleared both the commitment gate and an issue question"), not as an error.

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

All 10 policy passages are commitments about running the Clerk's Office: court access, technology, records, data reporting and community education. The run leaves them untagged and does not assign them a taxonomy issue. Under the constitution these can be kept as candidate-tier issues for this candidate only, and should not be counted toward any spine issue.

### 5. Possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` even though they state a commitment in plain words that touches a taxonomy issue. The only issue involved is B7, whose aliases include "court system".

| id | commitment | B7 score | first words |
|---|---|---|---|
| 93f93158 | 0.72 | 0.54 | Safeguard official court records, protect public funds, and uphold the highest standard of data quality. |
| bd3894ca | 0.82 | 0.70 | Build community education partnerships that strengthen public trust and help residents navigate the courts. |

Both are homepage summary cards (headings "Public Records Integrity" and "Community & Court Connection"). They repeat commitments that the run already catches on `/platform` (`e8b3fab1` / `88eef6e5` and `512de5a2` / `9a7af51f`), so the substance is not lost. Whether court administration by the Clerk belongs under B7 is a taxonomy question for the founder, not something this review decides.

Two other homepage cards were considered but not listed as possible misses:
- `c78c24cb` (commitment 0.68): "Innovate and rebrand our offices as a technology-forward service provider built for our growing population." This is a commitment, but it matches no taxonomy issue.
- `049109aa` (0.39): "Every resident deserves dignity, respect, professionalism, and compassion when they interact with the Clerk's Office." This states a value, not a commitment.

Coverage note: the ingest read 3 of the 7 links Jev judged. It skipped `/service-leadership` (policy 0.47), `/clerk-of-court-explained` (0.29) and `/legal-timeline` (0.12), all on the candidate's own domain. Positions on those pages, if any, are not in this run.

VERDICT: PASS
