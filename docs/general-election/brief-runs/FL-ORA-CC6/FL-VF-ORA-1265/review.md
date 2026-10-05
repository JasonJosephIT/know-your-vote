# Step 3 review: FL-VF-ORA-1265 (Michael "Mike" Scott), FL-ORA-CC6-general

Reviewed 2026-09-30 against `run.json` (schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates: `q_states_policy` and `q_own_commitment`), `passages.jsonl` (19 passages) and `ingest.log`. OFFICIAL_SITE: https://mymikescott.com/. SPINE: undecided for this race, so check 4 reports every taxonomy issue in `src/lib/news-issues.ts` (the 25 issue questions in `run.json` `question_ids`) and check 5 considers every taxonomy issue.

All checks were run with a node script over `run.json` and `passages.jsonl`, not by eye.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 19 passage urls in `run.json` are on host `mymikescott.com`. No other host. |
| 2 | Quotes verbatim | PASS | 0 passages marked `states_policy: true`, so nothing to compare. All 19 passages were compared anyway: text (as bytes), url and heading are identical to the passage with the same id in `passages.jsonl`. Id sets match (19 = 19). |
| 3 | No inferred motive | PASS | 0 passages marked as stating a policy. `counts.states_policy` = 0, `counts.with_issue` = 0, `areas` = []. |
| 4 | Silence recorded, not filled | PASS | 0 stated passages on all 25 issues, so every issue is `no_stated_position_found`. One passage (4bfa341d) scored over 0.85 on A2 alone but failed both gates. |
| 5 | Possible misses (information only) | 1 borderline | 4bfa341d (A2). See below. |

## Evidence

### Check 1: hosts

`mymikescott.com`:
- `https://mymikescott.com/`: 17ed6b4e, 2129e887, 0bb3578d, 3beb07da, 17f626c4, 82feebef, 5848f8a9, 5b57343c
- `/case_study/affordable-and-attainable-housing`: 4bfa341d
- `/about-us`: 2f98b536, 80cc6519, 15e51395, 0112d523, 90dacb11, 213fd3f9, 421549e0, 46c2be58, cd51699b, fe75efc9

No other host. `ingest.log` shows no redirect.

### Check 2: verbatim

The script compared `Buffer.from(text)` for each id. There were 0 `states_policy` passages to check. Across all 19 passages, 19 were identical and 0 differed. The url and heading of each also match.

Note: in `passages.jsonl` itself, the three homepage teasers (17ed6b4e, 2129e887, 0bb3578d) end in "…". The ellipsis comes from the site's teaser text as ingested, and `run.json` reproduces it unchanged.

### Check 3: no inferred motive

All 19 passages have `states_policy: false`. The highest first-gate score is 0.76 (4bfa341d) and the highest second-gate (`own_commitment`) score is 0.34 (46c2be58). Both are below 0.85. The run left the following as non-policy:
- Biography or record of past work: 2f98b536, 80cc6519, 15e51395, 0112d523, 90dacb11, 213fd3f9, 421549e0, 46c2be58, cd51699b, fe75efc9, and 4bfa341d (see check 5).
- Homepage teasers: 17ed6b4e, 2129e887, 0bb3578d.
- Site boilerplate: 3beb07da (Lorem ipsum placeholder), 17f626c4, 82feebef, 5848f8a9, 5b57343c (cookie notices).

### Check 4: passages over the threshold, per taxonomy issue

A passage counts as a stated position only if it clears both gates (commitment ≥ 0.85 and own_commitment ≥ 0.85) and the issue score (≥ 0.85). The last column counts passages whose score on that issue alone is at least 0.85, whether or not they passed the gates.

| Issue | Label | Stated (gates + issue) | Coverage | Issue score ≥ 0.85 alone |
|---|---|---|---|---|
| A1 | Property insurance costs | 0 | no_stated_position_found | 0 |
| A2 | Housing affordability | 0 | no_stated_position_found | 1: 4bfa341d (A2 0.96; commitment 0.76, own_commitment 0.24, both gates failed) |
| A3 | Property taxes | 0 | no_stated_position_found | 0 |
| A4 | Cost of living in Florida | 0 | no_stated_position_found | 0 |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found | 0 |
| A6 | Public school funding and teachers | 0 | no_stated_position_found | 0 |
| KYV9 | School choice and vouchers | 0 | no_stated_position_found | 0 |
| KYV10 | Career, vocational and higher education | 0 | no_stated_position_found | 0 |
| A7 | Elections administration and voting access | 0 | no_stated_position_found | 0 |
| B1 | Economy, inflation, and jobs | 0 | no_stated_position_found | 0 |
| B2 | Healthcare access and costs | 0 | no_stated_position_found | 0 |
| B3 | Immigration and border enforcement | 0 | no_stated_position_found | 0 |
| B4 | Social Security and Medicare | 0 | no_stated_position_found | 0 |
| B5 | Abortion policy | 0 | no_stated_position_found | 0 |
| B6 | Election integrity | 0 | no_stated_position_found | 0 |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found | 0 |
| B7 | Crime policy, policing and courts | 0 | no_stated_position_found | 0 |
| B8 | Climate and environment (national) | 0 | no_stated_position_found | 0 |
| KYV2 | Energy and utilities | 0 | no_stated_position_found | 0 |
| KYV3 | Growth, development and land conservation | 0 | no_stated_position_found | 0 |
| KYV4 | Storm resilience and flood protection | 0 | no_stated_position_found | 0 |
| KYV5 | Water supply and drinking water | 0 | no_stated_position_found | 0 |
| KYV6 | Renters and evictions | 0 | no_stated_position_found | 0 |
| KYV7 | Homelessness | 0 | no_stated_position_found | 0 |
| KYV8 | Condominium and HOA costs | 0 | no_stated_position_found | 0 |

The run did not fill any gap: `areas` is empty and `counts.with_issue` = 0. 4bfa341d lists `"issues": ["A2"]`, but it has `states_policy: false`, so it produces no finding and appears in no area.

### Check 5: possible misses (for the founder, not a fix)

- **4bfa341d** (A2, Housing affordability; commitment 0.76, own_commitment 0.24, A2 0.96), `/case_study/affordable-and-attainable-housing`, heading "Housing for All.". First 20 words: "As a member of the Orange County Affordable Housing Advisory Board, Mike has advocated for an increase in the number". Borderline. The passage is on the candidate's own issue page and says he "has advocated for an increase in the number of affordable housing units" and "advocates for the creation of initiatives, policies, and county ordinances that create more affordable housing opportunities for all". It is written in the third person as a record of his board role, not as a pledge for the commission seat. The second gate scored it low (0.24), and that is consistent with the gate's stated purpose (records of past work).

No other passage states a commitment on any taxonomy issue. The homepage teasers 17ed6b4e (B1 0.67) and 2129e887 (A2 0.64) are headline-plus-truncated-lead text ("Small Business is Good Business. As a member of…", "Housing for All. As a member of…") and state no commitment on their own.

### Ingest facts relevant to the silence (recorded, not filled)

These come from `ingest.log`, `links.jsonl` and `src/lib/candidate-site.ts`. They are not statements about the candidate's positions.
- `/case_study/business-and-economic-development` (link score 0.79) rendered only 23 characters of text and produced 0 passages. B1's silence therefore reflects a page that did not render, not a page that was read and found empty.
- `ingest.log` reports 7 passages from `/mike-scotts-priorities`, 8 from the housing page and 17 from `/about-us`, but `passages.jsonl` holds 0, 1 and 10 from those urls, plus 8 from the homepage. The homepage extraction is not logged. The gap is consistent with `dedupeAcrossPages` (first occurrence wins, and the homepage is extracted first), which would re-attribute repeated teasers, Lorem ipsum and cookie text to `https://mymikescott.com/`. That is an inference from the code, not confirmed from the log.
- `/case_study/community-engagement` (link score 0.18) and `/results` (0.22) were not selected.
- `ingest-report.md` in this folder describes the earlier one-gate run (`q-b2171346`, 66783/8702 tokens), not this `run.json` (`q-e7282116`, 70735/9101 tokens). The report is stale on its Step 2 table. The finding is unchanged: 0 states_policy.

So `no_stated_position_found` means nothing was found in what was ingested. Not every candidate page was ingested.

VERDICT: PASS
