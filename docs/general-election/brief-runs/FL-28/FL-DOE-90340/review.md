# Step 3 review: FL-DOE-90340 (Eddy Rojas), FL-28-general

Reviewer: Step 3 reviewer under the Profiler constitution. This review is read-only apart from this file. No website was fetched.

Inputs:
- `passages.jsonl`: 3 passages.
- `run.json`: schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85. This is the two-gate run: `q_states_policy` and `q_own_commitment`.
- `ingest.log`.

The earlier one-gate run and its review are kept in `attempt-1-one-gate/`. They were not used as evidence here.

SPINE: not yet decided for this race. Check 4 therefore covers every taxonomy issue in `src/lib/news-issues.ts`, which are the 25 sub-issues asked in `run.json`. Check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | 969d6682, c56ddb49 and 3a97f259 are all on `www.eddyrojas.com`, the OFFICIAL_SITE host. No other host appears. |
| 2 | Quotes verbatim | PASS | No passage is marked `states_policy: true`, so none needs checking. As an extra check, all 3 passages (969d6682, c56ddb49, 3a97f259) match `passages.jsonl` byte for byte in text, and their url and heading are identical too. |
| 3 | No inferred motive | PASS | No passage is marked as stating a policy (`counts.states_policy` = 0). No biography or campaign copy was turned into a position. |
| 4 | Silence recorded, not filled | PASS | All 25 taxonomy issues have 0 passages over the threshold, so each one is `no_stated_position_found`. `areas` is empty. |
| 5 | Possible misses (information only) | none | None of the 3 passages states a commitment on any taxonomy issue. |

## Evidence

### Check 1: hosts

A node script read `new URL(p.url).host` for every passage in `run.json`.

| id | url | host |
|---|---|---|
| 969d6682 | https://www.eddyrojas.com/about | www.eddyrojas.com |
| c56ddb49 | https://www.eddyrojas.com/about | www.eddyrojas.com |
| 3a97f259 | https://www.eddyrojas.com/about | www.eddyrojas.com |

`ingest.log` agrees. It lists one page read (`https://www.eddyrojas.com/about`, 3 passages). It has no redirect, robots.txt, bot-challenge or unreachable lines.

### Check 2: verbatim

A node script compared `Buffer.from(text)` for each `run.json` passage with the `passages.jsonl` passage that has the same id. It also compared url and heading. Both files contain the same 3 ids, in the same order.

| id | states_policy | text byte-identical | url identical | heading identical |
|---|---|---|---|---|
| 969d6682 | false | yes | yes | yes |
| c56ddb49 | false | yes | yes | yes |
| 3a97f259 | false | yes | yes | yes |

### Check 3: inferred motive

No passage is flagged. All three have `states_policy: false` and `issues: []`. Both gates are far below 0.85:

| id | commitment | own_commitment |
|---|---|---|
| 969d6682 | 0.02 | 0.03 |
| c56ddb49 | 0.06 | 0.19 |
| 3a97f259 | 0.10 | 0.28 |

### Check 4: counts per taxonomy issue

The counting rule is the one `readVerdict` applies in `src/lib/policy-noul.ts`. A passage counts for an issue only when all three of these are at or above 0.85:
- `commitment`
- `own_commitment`
- `scores[issue]`

The script also counted issue scores at or above 0.85 with the gates ignored, and that count was 0 for every issue too. The highest issue score on any passage is 0.06. Each passage has all 25 issue scores present.

| Issue | Passages over threshold | Coverage |
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

### Check 5: possible misses

None found. The first 20 words of each passage are quoted below so the founder can confirm:

- **969d6682:** "Eddy Rojas came to Miami from Cuba with a dream and a work ethic that wouldn't quit. Over the past". This is biography with no commitment.
- **c56ddb49:** "He knows what it means to work hard, raise a family, and fight for the American Dream. Now, Eddy is". This is a general campaign statement. It names no issue and makes no commitment on one.
- **3a97f259:** "\"My family is my anchor. Everything I do is for their future — and for every family in District 28.\"". This is personal and values copy with no commitment.

### Notes for the founder (not failures)

- **Scope of this finding.** The homepage has a link with the anchor text "ISSUES" that goes to `/events-1`. Jev's link judge scored it 0.20 for policy and 0.03 for about. Both are under the 0.5 link threshold, so the page was not ingested (see `links.jsonl` and `ingest-report.md`). This run shows only that the About page states no policy. It does not show that the whole site states none. Any positions on that page are outside this corpus. This review makes no guess about what the page says.
- **Stale figures in `ingest-report.md`.** Its "Step 2" table gives provenance `jev:jev-1.13.0/tax-7/q-b2171346` and token counts of 10565 in and 1374 out. Those are the one-gate run's figures, now in `attempt-1-one-gate/`. The current `run.json` and `run-report.txt`/`run.log` show `q-e7282116` and 11189 in, 1437 out. The verdict counts match either way (0 state a policy), but the report should be updated to point at the current run.

VERDICT: PASS
