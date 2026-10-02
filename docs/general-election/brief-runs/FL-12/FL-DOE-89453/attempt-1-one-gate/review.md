# Profiler review: FL-DOE-89453 (Kimberly Overman, FL-12-general)

- Official site: https://kimberlyoverman.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 73 passages, 73 asked, 16 state a policy, 14 with an issue, 0 failed
- Spine: undecided for this race. Check 4 reports every taxonomy issue (`src/lib/news-issues.ts`, tax-7) with at least one passage over the threshold. Check 5 considers every taxonomy issue.
- Reviewer: read-only. All checks were run with a node script over `run.json` and `passages.jsonl`, not by eye.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | PASS (with borderline notes) |
| 4 | Silence recorded, not filled | PASS: A2 = 4, A6 = 2, KYV10 = 2, B1 = 2, B2 = 5, B5 = 4, B7 = 2, B8 = 1, KYV4 = 1; the other 16 issues = 0 |
| 5 | Possible misses (information only, not a fix) | 0 reported (borderline and near-threshold notes below) |

## 1. Candidate-controlled sources only: PASS

All 73 passage URLs in `run.json` have host `kimberlyoverman.com`, and so do all 23 citation URLs inside `run.json.areas`. No other host appears. `run.json.site` is `https://kimberlyoverman.com`. The 3 distinct URLs are the homepage `/` (18 passages), `/issues` (10) and `/meet-kimberly` (45). `ingest.log` names `/issues` as the one policy page and `/meet-kimberly` as the about page. It has no redirect, robots, Crawl-delay, bot-challenge, browser-fallback or unreachable lines. Its only other content is a Node `MODULE_TYPELESS_PACKAGE_JSON` warning.

`ingest.log` reports 13 passages on `/issues` and 48 on `/meet-kimberly`, while `passages.jsonl` holds 10 and 45. `scripts/candidate-site-ingest.ts` runs `dedupeAcrossPages` after extraction, so 3 blocks per page that repeated homepage copy were dropped (18 + 13 + 48 = 79, and 79 - 6 = 73). This is not a host issue.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 73 unique ids. `run.json` has 73 passages. Every id is in both files, and neither file has an id the other lacks.
- All 16 passages with `states_policy: true` have `text` that is byte-identical (Buffer.equals over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 73 passages, and over all 23 citation copies in `run.json.areas`, found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)` and `issues` equals exactly the set of scores >= 0.85. No inconsistencies. The 23 area citations match the per-passage tags exactly.

## 3. No inferred motive: PASS

None of the 16 passages marked as stating a policy is only biography, an attack on an opponent, fundraising or event copy. Each has a forward-looking statement by or about the candidate ("she'll fight for", "will work to", "supports", "is committed to"). The site's copy of those kinds was gated out:
- Fundraising and volunteer copy (heading "Fuel Our Movement."): `bfbb77f2`, `ff4b866d`, `b5d012b9`, `3bc800e9`, `61cb7c85` (commitment 0.04 to 0.20).
- The press teaser `4fba2eb1` ("In the News", 0.05).
- All 45 `/meet-kimberly` passages: biography, the county commission record, and the lists of boards, community groups and credentials (0.02 to 0.49).

Some gated-in passages open with a biographical clause before the commitment. The commitment follows in the same passage, so they are not biography-only: `25e222d1` ("Kimberly knows what it's like to juggle bills and worry about rent. In Congress, she'll fight for..."), `a25a3aaf`, `cc710f7b`, `fd3edd42`.

Borderline items. These passed the gate but read as priority lists or slogans rather than a concrete commitment. None is biography, attack, fundraising or event copy, so none fails the check. Listed for the founder:

- `541b0654` (homepage, A2 + B2, commitment 0.86): "Families are struggling while politicians argue. Kimberly is focused on what matters: affordable housing, accessible healthcare, and a fair shot" "politicians argue" is a general remark and names no opponent.
- `e9dc6867` (homepage, B1, 0.90): "From the cost of living to the classroom, Kimberly Overman is running to make government deliver for working people—fighting for"
- `0819d6e2` (`/issues`, A2 + B2 + B5, 0.89): "Kimberly's priorities reflect what voters across the district are demanding: affordable housing, accessible healthcare, economic stability, reproductive freedom, and a" It lists priorities and states no action.

## 4. Silence recorded, not filled: PASS

This counts the passages with `states_policy: true` and the issue in `issues`, meaning a score of 0.85 or more. The table lists every taxonomy issue with at least one such passage.

| Taxonomy issue | Passages clearing 0.85 | Passage ids (issue score) |
|---|---|---|
| A2 Housing affordability | 4 | a25a3aaf (0.98), 25e222d1 (0.97), 0819d6e2 (0.95), 541b0654 (0.91) |
| A6 Public school funding and teachers | 2 | b2f87133 (0.99), 5dfb4c2d (0.98) |
| KYV10 Career, vocational and higher education | 2 | 5dfb4c2d (0.98), b2f87133 (0.93) |
| B1 Economy, inflation, and jobs | 2 | 25e222d1 (0.91), e9dc6867 (0.88) |
| B2 Healthcare access and costs | 5 | 03a0f303 (0.99), cc710f7b (0.99), 0819d6e2 (0.90), 541b0654 (0.87), fd3edd42 (0.87) |
| B5 Abortion policy | 4 | 088de975 (0.98), 03a0f303 (0.90), cc710f7b (0.87), 0819d6e2 (0.86) |
| B7 Crime policy, policing and courts | 2 | b5b04752 (0.96), ea3bfcf9 (0.94) |
| B8 Climate and environment (national) | 1 | 3b021b7f (0.90) |
| KYV4 Storm resilience and flood protection | 1 | 3b021b7f (0.97) |

The other 16 taxonomy issues have 0 passages over the threshold. Each is `no_stated_position_found` for this run: A1 Property insurance costs, A3 Property taxes, A4 Cost of living in Florida, A5 Water quality and Everglades restoration, KYV9 School choice and vouchers, A7 Elections administration and voting access, B3 Immigration and border enforcement, B4 Social Security and Medicare, B6 Election integrity, KYV1 Threats to democratic institutions, KYV2 Energy and utilities, KYV3 Growth, development and land conservation, KYV5 Water supply and drinking water, KYV6 Renters and evictions, KYV7 Homelessness, KYV8 Condominium and HOA costs. `run.json.areas` has entries only for the 9 issues in the table. This review does not suggest any passage to stand in for a 0.

Some statements appear twice, once as a homepage teaser and once in fuller form on `/issues`. Examples are `b2f87133`/`5dfb4c2d` (A6, KYV10), `ea3bfcf9`/`b5b04752` (B7) and `03a0f303`/`cc710f7b` (B2, B5). The dedupe did not merge them because the texts differ. The counts above include both copies.

Record note. `c7d8ebae` (`/meet-kimberly`) has A2 = 0.94, so `issues: ["A2"]` is set on it, but its commitment is 0.49 and `states_policy` is false. First 20 words: "As a Hillsborough County Commissioner from 2018 to 2022, Kimberly delivered during some of the region's most challenging moments. She" It describes her past record as a county commissioner, not a commitment. It is correctly left out of the count above and out of `run.json.areas`. Any downstream reader that uses `issues` without checking `states_policy` would count it.

## 5. Possible misses (information for the founder, not a fix)

The run marks 57 passages `states_policy: false`: 10 on the homepage, 2 on `/issues` and 45 on `/meet-kimberly`. They are slogans, fundraising and volunteer copy, a press teaser, biography, the county commission record, and one-line lists of boards, memberships and credentials. None plainly states a commitment on a taxonomy issue. Possible misses: none.

Closest cases. Neither is listed as a miss:
- `a18afc79` (homepage, commitment 0.46, top score A2 0.70): "Kimberly Overman is a mom, grandmother, small business owner, and former Hillsborough County Commissioner running for Congress in Florida's 12th" It says she "has always fought" on affordable housing and public health and is "ready to take that fight to Washington". That is biography with a general pledge, not a commitment on a named issue.
- `5b0f86d8` (`/meet-kimberly`, 0.10, top score B1 0.33): "Raised in a working-class family that faced housing insecurity, Kimberly learned early what it means to struggle—and to persevere. Her" This is biography.

Related notes on passages that did pass the gate. The run log says "2 state a policy the taxonomy has no question for". Those two are:
- `7ca134b9` (homepage, 0.92): "Florida's 12th is home to thousands of veterans. Kimberly will ensure they receive the benefits, healthcare, and respect they've earned." The top score is B2 0.62. Veterans' benefits have no taxonomy issue.
- `0a8899c8` (homepage, 0.90): "Kimberly is committed to protecting voting rights, restoring trust in government, and making sure everyday people—not lobbyists—have a seat at" A7 (Elections administration and voting access) is 0.84, just under the threshold, so A7 stays 0 in check 4.

Also `3b021b7f` (`/issues`, tagged B8 and KYV4) scores A1 (Property insurance costs) at 0.84, just under the threshold. It mentions "rising insurance costs" and "higher premiums" as effects of climate risk. `fd3edd42` (veterans, tagged B2) scores KYV10 at 0.78.

## Other observations (no effect on the verdict)

- The candidate's biography is on the about page `/meet-kimberly`, which the ingest fetched. All 45 passages there were correctly gated out.
- Links the ingest did not fetch (Jev policy score under 0.5): `/es` (Spanish, 0.37), `/issues/kimberly-on-substack` (0.24), press releases, news and endorsement pages. The Substack link is under `/issues`. Where it leads is outside this review.
- The earlier keyword-crawl attempt is kept in `attempt-1-keywords/` (47 passages from 4 pages). It was not used for this run.
- `run-report.txt`, `run.log`, `ingest-report.md` and `run.json` agree on 73 passages, 16 stating a policy, 14 with an issue, 0 failed, and 26 questions (`q_states_policy` plus 25 sub-issues).

VERDICT: PASS
