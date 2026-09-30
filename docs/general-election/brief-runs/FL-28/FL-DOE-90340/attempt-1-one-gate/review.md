# Step 3 review: FL-DOE-90340 (Eddy Rojas), FL-28-general

Reviewer: Step 3 reviewer under the Profiler constitution. Read-only, apart from this file. No website was fetched.

Inputs: `passages.jsonl` (3 passages), `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`.

SPINE: not yet decided for this race. Check 4 therefore covers every taxonomy issue in `src/lib/news-issues.ts` (the 25 sub-issues asked in `run.json`), and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | 969d6682, c56ddb49, 3a97f259: all on `www.eddyrojas.com` (the OFFICIAL_SITE host). No other host. |
| 2 | Quotes verbatim | PASS | No passage is marked `states_policy: true`, so nothing is required. As an extra check, all 3 passages (969d6682, c56ddb49, 3a97f259) are byte-identical in text and url to `passages.jsonl`. |
| 3 | No inferred motive | PASS | No passage is marked as stating a policy (`counts.states_policy` = 0), so no biography or campaign copy was turned into a position. |
| 4 | Silence recorded, not filled | PASS | Every taxonomy issue has 0 passages over the threshold, so every issue is `no_stated_position_found`. `areas` is empty. |
| 5 | Possible misses (information only) | none | None of the 3 passages states a commitment on any taxonomy issue. |

## Evidence

### Check 1: hosts

Checked with a node script: `new URL(p.url).host` for every passage in `run.json`.

| id | url | host |
|---|---|---|
| 969d6682 | https://www.eddyrojas.com/about | www.eddyrojas.com |
| c56ddb49 | https://www.eddyrojas.com/about | www.eddyrojas.com |
| 3a97f259 | https://www.eddyrojas.com/about | www.eddyrojas.com |

`ingest.log` matches: one page read (`https://www.eddyrojas.com/about`, 3 passages), with no redirects, robots.txt, bot-challenge or unreachable lines.

### Check 2: verbatim

A node script compared `Buffer.from(text)` for each `run.json` passage with the `passages.jsonl` passage that has the same id, and also compared the urls. The two files contain the same 3 ids.

| id | states_policy | text byte-identical | url identical |
|---|---|---|---|
| 969d6682 | false | yes | yes |
| c56ddb49 | false | yes | yes |
| 3a97f259 | false | yes | yes |

### Check 3: inferred motive

Nothing is flagged. All three passages have `states_policy: false` and `issues: []`, with commitment scores of 0.02, 0.07 and 0.10 against a 0.85 gate. The run was right to treat them as biography or campaign copy and not as positions.

### Check 4: counts per taxonomy issue

A passage counts for an issue when both `commitment` and `scores[issue]` are at or above 0.85. That is the same rule `src/lib/policy-noul.ts` applies. The highest issue score on any passage is 0.06, and the highest commitment score is 0.10.

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

None. The first 20 words of each passage are quoted below so the founder can confirm:

- 969d6682: "Eddy Rojas came to Miami from Cuba with a dream and a work ethic that wouldn't quit. Over the" (biography, no commitment)
- c56ddb49: "He knows what it means to work hard, raise a family, and fight for the American Dream. Now, Eddy" (a general campaign statement with no issue named and no commitment on an issue)
- 3a97f259: "\"My family is my anchor. Everything I do is for their future — and for every family in District" (personal and values copy, no commitment)

### Note for the founder (scope, not a failure)

The site links a page with the anchor text "ISSUES" at `/events-1`. Jev's link judge scored it 0.20 on policy and 0.03 on about, which is under the 0.5 link threshold, so it was not ingested (`links.jsonl`, `ingest-report.md`). This run only shows that the About page states no policy. It does not show that the whole site states none. If that page holds positions, they are outside this corpus. This review does not suggest what that page might say.

VERDICT: PASS
