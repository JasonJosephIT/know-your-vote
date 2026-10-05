# Step 3 review: FL-VF-HIL-2675 (Daniela Simic), FL-HIL-SB2-general

Reviewed 2026-09-29 under the Profiler constitution. Read-only review of `passages.jsonl`, `run.json` and `ingest.log` in this directory; no website fetched, nothing else edited.

- Official site: https://danielaforschools.com/
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 10 of 10 passages asked, 0 failed
- SPINE: undecided for this race, so check 4 covers every taxonomy issue in `src/lib/news-issues.ts` (25 issues, taxonomy v7) and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 10 passages are on host `danielaforschools.com` (4 from `/`, 6 from `/about`). No other host. |
| 2 | Quotes verbatim | PASS | 7f62011e, bbabfe40 (the two `states_policy: true` passages) are byte-identical to `passages.jsonl`. All 10 passages were checked, and all 10 match. |
| 3 | No inferred motive | PASS | 7f62011e and bbabfe40 each contain a first-person commitment ("I will ..."). Neither is biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | A6 = 1 (7f62011e). The other 24 issues = 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | none plain | No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue. The notes below list one borderline passage and one truncated passage. |

## Check 1: candidate-controlled sources only: PASS

A node script read every `url` in `run.json` and in `passages.jsonl`. The only host is `danielaforschools.com`.

| Page | Passage ids |
|---|---|
| https://danielaforschools.com/ | 9d2a6d87, 7f62011e, 66729ecd, bbabfe40 |
| https://danielaforschools.com/about | 69a7f830, 891d3e70, 528e9d85, 596a2e2d, 747b86b3, 03bcb134 |

No redirect was needed. `ingest.log` shows both pages were rendered in the browser because the plain fetch returned only 73 characters. Both are on the official host. `run.json` `site` is `https://danielaforschools.com`.

## Check 2: quotes verbatim: PASS

A node script loaded both files. For each `run.json` passage it looked up the same id in `passages.jsonl` and compared `Buffer.from(text, "utf8")` with `Buffer.equals`. It also compared `url` and `heading`.

- 7f62011e (`states_policy: true`): text byte-identical (197 bytes), url and heading equal.
- bbabfe40 (`states_policy: true`): text byte-identical (195 bytes), url and heading equal.
- The other 8 passages also matched byte for byte. `passages.jsonl` has 10 ids and `run.json` has 10. No id appears in only one of the two files.
- The one citation in `run.json` `areas` (A6 -> 7f62011e) also matched byte for byte.

## Check 3: no inferred motive: PASS

Passages marked as stating a policy:

| id | commitment | issues | First 20 words | Assessment |
|---|---|---|---|---|
| 7f62011e | 0.97 | A6 | "Taxpayer dollars should work for students. Period. I will protect your investment and focus funding on classrooms and the teachers" | First-person commitment ("I will ... focus funding on classrooms and the teachers"). Not biography, attack, fundraising or event copy. |
| bbabfe40 | 0.93 | (none) | "Our responsibility is not just to talk about improvement, but to measure it. I will insist on clear goals, regular" | First-person commitment ("I will insist on clear goals, regular reporting, and honest evaluation"). It matches no taxonomy issue, so it is a candidate-tier item (school accountability / performance reporting), not a spine claim. |

No passage marked as stating a policy is only biography, an attack on an opponent, fundraising or event copy. The six `/about` biography passages (69a7f830, 891d3e70, 528e9d85, 596a2e2d, 747b86b3, 03bcb134) are all `states_policy: false`, with commitment scores between 0.02 and 0.27.

## Check 4: silence recorded, not filled: PASS

This counts passages whose issue score is >= 0.85, computed by script from `scores` in `run.json`. It matches each passage's `issues` array.

| Issue | Label | Passages over threshold | Coverage |
|---|---|---|---|
| A6 | Public school funding and teachers | 1 (7f62011e, 0.97) | stated position |
| A1 | Property insurance costs | 0 | no_stated_position_found |
| A2 | Housing affordability | 0 | no_stated_position_found |
| A3 | Property taxes | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found |
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

`run.json` `areas` contains only Education / A6 -> 7f62011e. No issue is filled beyond what cleared the threshold.

## Check 5: possible misses (information for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment by the candidate on a taxonomy issue. Two passages are noted for the founder:

- **9d2a6d87** (homepage plank "1. Every Child. Every Chance.", commitment 0.59, KYV10 0.65): "A child’s future should never depend on their zip code, family circumstance, or unique needs. Every student deserves strong academics, early" This is a platform plank, but it is written as a value statement ("should", "deserves") with no "I will". It is below the gate and is not counted as a plain commitment. It is listed only because it is a numbered platform plank on the homepage.
- **03bcb134** (/about, commitment 0.07): "She is running for School Board with one clear mission:" The passage ends at the colon, so the mission statement that follows it on the page was not captured as text in this passage. This may be an ingest gap: the rest of the sentence may be in a list or element the extractor did not attach. It is not a miss by the run, because the captured text states nothing.

Other notes, not misses:
- 66729ecd (plank "3. Safe Schools. Strong Learning.", commitment 0.49): "Strong leadership and clear expectations create schools where students learn accountability, respect, and the skills they need to succeed and" This is descriptive and states no commitment. It maps to no taxonomy issue (B7 is crime policy, and this passage scores 0.04 on it).
- `ingest.log`: 14 homepage links, 2 judged by Jev, 0 policy pages selected. `/news` was not chosen (policy 0.11). Only the homepage and `/about` were read.

VERDICT: PASS
