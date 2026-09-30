# Step 3 review: FL-VF-ORA-1290 (Kamia Brown), FL-ORA-CC2-general

Reviewer run on 2026-09-29, read-only against `passages.jsonl`, `run.json` and `ingest.log` in this folder. No website was fetched.

- Official site: https://www.kamiafororangecounty.com/
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, status `complete`, threshold 0.85 (gate and issue tags both use `>=`, per `readVerdict` in `src/lib/policy-noul.ts`)
- Counts: 39 passages, 39 asked, 0 failed, 14 state a policy, 7 of those carry a taxonomy issue
- Spine: not set for this race, so checks 4 and 5 cover all 25 taxonomy issues in `src/lib/news-issues.ts`

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim | **PASS** |
| 3 | No inferred motive (no bio, attack, fundraising or event copy marked as policy) | **FAIL**: 1 passage (`c64ae9b8`) |
| 4 | Silence recorded, not filled | **PASS** |
| 5 | Possible misses (information only) | **PASS**: none found (one borderline item noted) |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 39 passages in `run.json` are on one host, `www.kamiafororangecounty.com`, which is the OFFICIAL_SITE host. `passages.jsonl` has the same 39 ids on the same host. There are no other hosts and no redirects.

| URL | Passages |
|---|---|
| https://www.kamiafororangecounty.com/ | 15 |
| https://www.kamiafororangecounty.com/meet-kamia | 24 |

`ingest.log` agrees. Jev looked at 3 links and chose 0 policy pages and 1 about page (`/meet-kamia`). `/get-involved` and `/donation` were not chosen, so no fundraising page was read.

### 2. Quotes verbatim: PASS

I compared the texts with a node script. For each of the 14 passages with `states_policy: true`, I compared the `text` in `run.json` byte for byte (`Buffer.compare` on the UTF-8 encoding) with the passage of the same id in `passages.jsonl`. I also compared the `url`. There were 0 mismatches and 0 missing ids.

The 14 ids: `5d8ff81d`, `5fc16ad9`, `05628733`, `d74d5c9d`, `06c4341f`, `8dbf04fd`, `bfb04d38`, `05a70774`, `b44c97f9`, `2b9c1616`, `481919f2`, `fa78a0f3`, `21cc8c3b`, `c64ae9b8`.

A second check with jq also matched. I sorted the `[id,url,heading,text]` tuples for all 39 passages in each file and ran `diff` on them. The two files were identical.

### 3. No inferred motive: FAIL

13 of the 14 policy-marked passages are items from the homepage list headed "Kamia's Vision For District 2:". Each one is a forward-looking commitment by the candidate, such as "Expand affordable and workforce housing options". One is not:

| id | Page and section | commitment | issues | First 20 words |
|---|---|---|---|---|
| `c64ae9b8` | /meet-kamia, "How Kamia Has Advocated For You:" | 0.86 | none | "Focused on efficient, accountable government spending and operations." |

This passage is past-tense biography. It sits in the About page's account of her House record (2016–2022) and makes no commitment about the County Commission seat.

The run treats the other items in the same list as not stating a policy, which shows the gate is inconsistent here:

| id | commitment |
|---|---|
| `1c4d60ee` | 0.83 |
| `811ebbe1` | 0.74 |
| `1687d969` | 0.39 |
| `91c40f74` | 0.19 |
| `36fea77c` | 0.20 |

`c64ae9b8` got through only because it scored 0.86 against a threshold of 0.85.

Impact: the passage has no taxonomy issue, so it does not appear in `run.areas` and would not be attached to any issue Position. It is still counted in `counts.states_policy` (14) and in the "7 state a policy the taxonomy has no question for" line in `run.log`. A downstream step that turns issue-less policy passages into candidate-tier issues would publish biography as a stated position. It should be excluded, or flagged, before that happens.

### 4. Silence recorded, not filled: PASS

**Counted**: passages that cleared the gate (`states_policy: true`) and score 0.85 or higher on the issue. These are what `groupByArea` cites.

**Gated out**: passages that score 0.85 or higher on the issue but have `states_policy: false`. These are not counted and not cited. All of them are past-record copy from `/meet-kamia`.

| Issue | Label | Counted | Passage ids | Gated out (not counted) | Status |
|---|---|---|---|---|---|
| A1 | Property insurance costs | 0 | | | no_stated_position_found |
| A2 | Housing affordability | 2 | `5d8ff81d` (0.97), `05628733` (0.96) | | stated |
| A3 | Property taxes | 0 | | | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | | | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | | | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | | | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | | | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | | `1c4d60ee` | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | | | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 | | `1c4d60ee` | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | | `d615e2a9`, `1687d969`, `811ebbe1` | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | | | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | | | no_stated_position_found |
| B5 | Abortion policy | 0 | | | no_stated_position_found |
| B6 | Election integrity | 0 | | | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | | | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | | | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | | | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | | | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 4 | `481919f2` (0.97), `d74d5c9d` (0.96), `b44c97f9` (0.95), `5fc16ad9` (0.88) | | stated |
| KYV4 | Storm resilience and flood protection | 1 | `bfb04d38` (0.85, exactly at the threshold) | | stated |
| KYV5 | Water supply and drinking water | 0 | | | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | | | no_stated_position_found |
| KYV7 | Homelessness | 0 | | | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | | | no_stated_position_found |

`run.areas` contains exactly A2 (2 citations), KYV3 (4) and KYV4 (1), which matches the counted column. Nothing in the run gives a stance to any issue with a count of 0.

### 5. Possible misses (information for the founder, not a fix): PASS, none found

I read all 25 passages with `states_policy: false` and found none that plainly states a commitment on a taxonomy issue:

- **Bio or record copy** (`/meet-kamia`, 22 passages): past offices, awards, committee seats, and past advocacy described in the past tense. Examples are `1c4d60ee`, `811ebbe1`, `1687d969` and `d615e2a9`. Several of these score 0.85 or higher on B1, B2 or KYV10, but each describes what she did in the Florida House, not what she commits to do as Commissioner. Leaving them out is consistent with check 3.
- **Page chrome**: `cbf54d5b` "To play, press and hold the enter key. To stop, release the enter key." is widget text.
- **Borderline, not a spine-issue miss**: `da2f7000` "Advance equitable access to opportunity across District 2" (commitment 0.77). It is an item in the Vision list, but it names no taxonomy issue, and its highest issue score is B1 at 0.10.

Also for the founder: 6 passages that do state a policy carry no taxonomy issue, because every issue score is below 0.85. The run records these as issue-less and does not add them to any Position.

| id | Text | Highest issue score |
|---|---|---|
| `06c4341f` | "Improve road conditions and neighborhood traffic safety" | B7 0.04 |
| `8dbf04fd` | "Expand transportation options: sidewalks, bike paths, and transit" | B8 0.07 |
| `05a70774` | "Secure state and federal funding for infrastructure investments" | B1 0.27 |
| `2b9c1616` | "Promote green infrastructure and resilient planning" | KYV3 0.65 |
| `fa78a0f3` | "Ensure transparency and community input in county decisions" | KYV1 0.27 |
| `21cc8c3b` | "Strengthen public-private partnerships to maximize resources" | B1 0.27 |

Transportation and roads have no issue in the taxonomy. Under the constitution these would go in as candidate-tier issues.

VERDICT: FAIL (check 3)
