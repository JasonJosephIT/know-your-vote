# Step 3 review: FL-VF-BRO-1195 (Allen Zeman), FL-BRO-SBAL8-general

Reviewed under the Profiler constitution (stated_position bucket only). This file is the only one written.
Inputs: `passages.jsonl` (11 passages), `run.json` (schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, two gates, threshold 0.85, created 2026-09-30T01:58:50Z, 11 of 11 asked, 0 failed), `ingest.log`.
SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy version 7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 11 passage urls are on `electallenzeman.com` (7 on `/`: `02f203bd`, `cebe3799`, `132cbf38`, `dfb17370`, `0541756a`, `80282434`, `205ff958`; 4 on `/dr-allen-zeman`: `4978d852`, `6fe7ea4e`, `70e716e8`, `f3a38584`). No other host. |
| 2 | Quotes verbatim | PASS | No passage is marked `states_policy: true`, so there is nothing to quote. Script check: all 11 run.json texts, urls and headings are byte-identical to the same ids in passages.jsonl, and no id is missing from either file. |
| 3 | No inferred motive | PASS | No passage is marked as stating a policy, so no biography, attack, fundraising or event copy is mislabelled as policy. `areas` is empty. |
| 4 | Silence recorded, not filled | PASS | No passage clears 0.85 on any issue, and no passage passes either gate. All 25 issues are 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | none | No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue. One borderline passage, `0541756a`, is noted below. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script ran `new URL(url).host` over every passage in `run.json`. It returned one host, `electallenzeman.com`, which is the OFFICIAL_SITE host. `areas` is empty, so there are no citations to check. `ingest.log` shows that only `https://electallenzeman.com/` and the About page `https://electallenzeman.com/dr-allen-zeman` were read (Jev scored the About page at about=0.91). No redirect was involved. The five links Jev judged in `links.jsonl` (`/dr-allen-zeman`, `/join-our-team-of-volunteers`, `/host-committee`, `/endorsement`, `/latest-news`) are all on the same host. None scored above 0.19 as a policy page, so no policy page was chosen.

A note for the founder, not a failure: the candidate's homepage hosts third-party voices. They are `02f203bd` (a Sun Sentinel editorial board quote), `cebe3799` (an endorsement by five board members) and `132cbf38` (an endorsement quote by Jeff Holness). None is marked as stating a policy, so none can become a stated_position claim. If a later step ever used them, it would have to attribute them to the endorser, not the candidate.

### 2. Quotes verbatim

I checked this with `node`, comparing `Buffer.from(text, "utf8")` for each `run.json` passage against the passage with the same id in `passages.jsonl`, and comparing `url` and `heading` for equality.

- Ids: 11 in `run.json` and 11 in `passages.jsonl`, all shared.
- Mismatches: 0. The byte lengths are 53, 108, 680, 42, 204, 58, 117, 320, 649, 240 and 157, in file order.
- Passages marked as stating a policy: none (`counts.states_policy: 0`, `counts.with_issue: 0`).

### 3. No inferred motive

No passage is marked `states_policy: true`. Every passage fails both gates:

- The highest scores belong to `0541756a`: commitment 0.64 and own_commitment 0.77, both under 0.85.
- The next highest is `80282434`: commitment 0.20 and own_commitment 0.19.
- The other nine passages score 0.11 or lower on both gates.

The biography passages (`4978d852`, `6fe7ea4e`, `70e716e8`, `f3a38584`), the endorsements (`02f203bd`, `cebe3799`, `132cbf38`), the event and media line `80282434` and the paid-for disclaimer `205ff958` are all correctly excluded.

### 4. Silence recorded, not filled

A passage counts when it has `states_policy: true` and an issue score of at least 0.85. As an extra check, I also counted raw issue scores of at least 0.85 regardless of the gates. That count is also zero: the highest issue score in the run is KYV1 at 0.40, on `0541756a`.

| Issue | Label | Count | Coverage |
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

The run records the silence itself (`with_issue: 0`, `areas: []`, and `run-report.txt` says "No passage cleared both the commitment gate and an issue question"). It fills nothing in.

### 5. Possible misses (information for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue. The one borderline passage is reported here so the founder can judge it:

- `0541756a` (heading "Commissioner Fitz Budhoo"; commitment 0.64, own_commitment 0.77; top issue KYV1 at 0.40). First 20 words: "I am committed to ethical behavior and transparent decision making, something that is needed as much now as it was". The passage is a first-person commitment, but it is about ethics and transparency in school-board governance, which no taxonomy issue names. The page structure also leaves the speaker unclear, because the scraped heading names a commissioner rather than the candidate. It is not counted as a miss. If the page confirms that the candidate is speaking, it would fit as a candidate-tier issue under the constitution, not as a spine issue.

Other notes for the founder, neither of which is a failure:

- `ingest-report.md`'s "Step 2: policy run" table describes the earlier one-gate run (`q-b2171346`, 38759 tokens in), now kept in `attempt-1-one-gate/`. It does not describe the current `run.json` (`q-e7282116`, 41047 tokens in). The result is the same either way: 0 state a policy, 0 with an issue.
- The site links to no issues or policy page, so this empty result reflects the site's content rather than a crawl gap.

VERDICT: PASS
