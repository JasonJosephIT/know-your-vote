# Step 3 review: FL-VF-BRO-1195 (Allen Zeman), FL-BRO-SBAL8-general

Reviewer: Step 3 reviewer under the Profiler constitution. Read-only; this file is the only one written.
Inputs: `passages.jsonl` (11 passages), `run.json` (schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`.
SPINE: undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy version 7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 11 passage urls are on `electallenzeman.com` (7 on `/`, 4 on `/dr-allen-zeman`). No other host. |
| 2 | Quotes verbatim | PASS | 0 passages marked `states_policy: true`, so nothing to quote. Script check: all 11 run.json passages have text byte-identical (and same url) to the same id in passages.jsonl; no id is missing on either side. |
| 3 | No inferred motive | PASS | 0 passages marked as stating a policy, so none is biography, attack, fundraising or event copy mislabelled as policy. |
| 4 | Silence recorded, not filled | PASS | No passage scores at or above 0.85 on any issue; every taxonomy issue is 0 → `no_stated_position_found`. `areas` is empty. |
| 5 | Possible misses (information only) | none found | No passage plainly states a commitment on a taxonomy issue. One borderline passage noted below (0541756a). |

## Evidence

### 1. Candidate-controlled sources only

Checked with node: `new URL(url).host` over all run.json passages returned the single host `electallenzeman.com`, matching OFFICIAL_SITE. `ingest.log` shows only `https://electallenzeman.com/` and `https://electallenzeman.com/dr-allen-zeman` were read; no redirect to another host.

Note for the founder (not a failure): the homepage carries third-party voices hosted on the candidate's site: 02f203bd (Sun Sentinel editorial board quote), cebe3799 (endorsement by five board members), 132cbf38 (endorsement quote by Jeff Holness). None is marked as stating a policy, so none would become a stated_position claim; if a later step ever used them, they would need attribution to the endorser, not to the candidate.

### 2. Quotes verbatim

Script (node, `Buffer.equals` on `text`, plus `url` equality), result: `identical 11 / 11`, no ids only in one file. The passages run.json marks as stating a policy: none (`counts.states_policy: 0`).

### 3. No inferred motive

Passages marked `states_policy: true`: none. For completeness, all 11 are marked `false`, with commitment scores 0.02 to 0.67 (highest: 0541756a at 0.67, below the 0.85 gate).

### 4. Silence recorded, not filled (every taxonomy issue, threshold 0.85)

Passages clearing the threshold, per issue:

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

Script check: no score in any passage is at or above 0.85 (highest issue score in the run: KYV1 0.37 on 0541756a). The run records the silence (`with_issue: 0`, `areas: []`) and fills nothing. Context from `links.jsonl`: the site's homepage links are About, Volunteer, Host Committee, Endorsement and a news item; no issues or policy page was offered, so 0 policy pages were chosen.

### 5. Possible misses (information for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue. One borderline passage, reported so the founder can judge it:

- 0541756a (heading "Commissioner Fitz Budhoo", commitment 0.67, top issue KYV1 0.37): "I am committed to ethical behavior and transparent decision making, something that is needed as much now as it was in 2011. We have to restore trust ..." This is a first-person commitment, but on ethics and transparency in school-board governance, which no taxonomy issue names. Who is speaking is also unclear from the page structure: the scraped heading names a commissioner, not the candidate. Not counted as a miss.

VERDICT: PASS
