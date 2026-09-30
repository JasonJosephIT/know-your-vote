# Step 3 review: FL-DOE-91699 (Phil "Felipe" Ehr), FL-28-general

Official site: https://ehrforcongress.us/
Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 17 of 17 passages asked, 0 failed.
SPINE: undecided for this race, so check 4 covers every taxonomy issue (tax-7) and check 5 considers every taxonomy issue.

Reviewed read-only from `passages.jsonl`, `run.json`, `ingest.log` (plus `links.jsonl`, `run-report.txt`, `ingest-report.md` for context). No site was fetched.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 17 run.json passages are on `ehrforcongress.us` (`/` 12, `/meet-phil` 5). No other host. |
| 2 | Quotes verbatim | PASS | 7 of 7 policy passages byte-identical to passages.jsonl: c109dfb1, 41430c1f, 1707e2b2, b9b09509, 01bcefdd, 30568a3c, 651eba12 |
| 3 | No inferred motive | PASS | No policy-marked passage is only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | Counts below; 20 of 26 issues are 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | PASS (none found) | No passage marked "no policy" plainly states a commitment on a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

Script (node) over `run.json.passages[].url`: host set is `{ehrforcongress.us}`. Pages: `https://ehrforcongress.us/` (12 passages) and `https://ehrforcongress.us/meet-phil` (5 passages). `ingest.log` shows no redirects and no other host. Every run.json id is present in passages.jsonl with the same url, and every passages.jsonl id is present in run.json (17 = 17).

Note for the founder: passage ba9cbb9d ("– Former U.S. Rep. Debbie Mucarsel-Powell", endorsement quote in its heading) and 57b1abcc / 1ee46eab (third-person praise) are hosted on the candidate's site but are endorsement-style copy. All three are marked `states_policy: false`, so none reaches a claim.

### 2. Quotes verbatim: PASS

Script (node, `Buffer.equals` on UTF-8 bytes) compared `text` for each passage with `verdict.states_policy === true` against the passage of the same id in passages.jsonl. url and heading were also compared.

| id | bytes | text identical | url identical | heading identical |
|---|---|---|---|---|
| c109dfb1 | 116 | yes | yes | yes |
| 41430c1f | 117 | yes | yes | yes |
| 1707e2b2 | 215 | yes | yes | yes |
| b9b09509 | 103 | yes | yes | yes |
| 01bcefdd | 171 | yes | yes | yes |
| 30568a3c | 199 | yes | yes | yes |
| 651eba12 | 272 | yes | yes | yes |

The 10 non-policy passages are also byte-identical. (`run-report.txt` truncates 651eba12 with "…" for display; run.json holds the full text.)

### 3. No inferred motive: PASS

All 7 policy-marked passages sit under the "Phil's Priorities" heading on the homepage and each contains an action commitment in the candidate's own framing:

- c109dfb1 "Lower premiums, expand access, and reduce out-of-pocket costs through the Healthcare Stability & Program Choice Act."
- 41430c1f "Enforce anti-fraud laws, hold bad actors accountable, stabilize the market, and protect homeowners from rising costs."
- 1707e2b2 "Putting America First means defending the Constitution and the rule of law, rejecting anti-American rhetoric, antisemitism, socialism and political extremism,"
- b9b09509 "Create an inter-agency public corruption task force and strengthen accountability for public contracts."
- 01bcefdd "Pursue a full VA hospital or major VA medical facility in South Dade to improve access for veterans in South"
- 30568a3c "Protect law-abiding immigrant families, Improve training and accountability for border personnel, a path to permanent residency for families stuck in"
- 651eba12 "Protect the Everglades, defend water resources, support responsible growth, and pursue a temporary moratorium on large-scale AI data centers and"

None is biography, an attack on an opponent, fundraising or event copy.

Notes for the founder (not failures):
- 1707e2b2 is mostly a values statement. Its concrete commitment is the closing clause, "using military force only when lawful and necessary". It is tagged KYV1 at exactly the threshold (0.85).
- 41430c1f names no subject. The only anchor is "protect homeowners from rising costs". Its A2 (0.86) and B7 (0.92) tags come from the text alone. On the live page the priority may carry a title the ingest did not capture.
- The attack passage 21c54aa8 ("The dire need for change in South Florida is clear. Our community is plagued by corruption, while Tallahassee is preoccupied") scores KYV1 0.89 but is correctly gated out (commitment 0.16, `states_policy: false`). It does not appear in `areas` and does not reach a claim.

### 4. Silence recorded, not filled: PASS

Threshold 0.85. The "gated" column is what the run publishes: the passage both clears the commitment gate and scores the issue at or above 0.85, which is what `areas` in run.json contains. The "raw" column counts any passage whose issue score is at or above 0.85, gated or not. Issues with at least one passage over the threshold:

| Issue | Label | Gated count | Passage ids | Raw count |
|---|---|---|---|---|
| A2 | Housing affordability | 1 | 41430c1f (0.86) | 1 |
| A5 | Water quality and Everglades restoration | 1 | 651eba12 (0.85) | 1 |
| B2 | Healthcare access and costs | 2 | c109dfb1 (0.98), 01bcefdd (0.96) | 2 |
| B3 | Immigration and border enforcement | 1 | 30568a3c (0.98) | 1 |
| B7 | Crime policy, policing and courts | 1 | 41430c1f (0.92) | 1 |
| KYV1 | Threats to democratic institutions | 1 | 1707e2b2 (0.85) | 2 (adds 21c54aa8, 0.89, gated out: attack copy) |
| KYV2 | Energy and utilities | 1 | 651eba12 (0.93) | 1 |
| KYV3 | Growth, development and land conservation | 1 | 651eba12 (0.98) | 1 |

Every other taxonomy issue has **0** passages and is `no_stated_position_found`: A1, A3, A4, A6, KYV9, KYV10, A7, B1, B4, B5, B6, B8, KYV4, KYV5, KYV6, KYV7, KYV8.

The run's `issues` arrays match `scores >= threshold` for all 17 passages; the script found no mismatch. The run and its report fill none of these zeros.

Candidate-tier (outside the taxonomy): b9b09509, the public corruption task force, clears the gate (0.97) but matches no taxonomy issue (best scores KYV1 0.79 and B7 0.76). Under the constitution this is a candidate-tier issue, not a spine match.

Coverage caveat: the ingest chose 0 policy pages (`ingest.log`: "56 links, 0 policy page(s) selected"). Jev judged 4 links, and `/fl-28-debates`, `/voter-information` and `/press` all scored under 0.5 for policy. The corpus is the homepage and `/meet-phil` only (17 passages, 642 words). The zeros above mean "not stated in these 17 passages", not "not stated anywhere on the site".

### 5. Possible misses (information for the founder): none found

The 10 passages marked `states_policy: false` were read in full against every taxonomy issue:

- 82bf9d9e, 5c2612ac, aae63009, 7beed08b: biography (Navy service, Mariel Boatlift, post-Navy work).
- 57b1abcc, 1ee46eab: third-person praise ("He will find solutions that matter to everyday people…"); no issue-specific commitment.
- ba9cbb9d: endorser attribution line.
- 21c54aa8: attack on the opponent; no commitment.
- 9579603b "Phil and Sue, his wife of 28 years, are blessed with two daughters. Phil is running to represent the people": family biography plus a general reason for running ("defend American freedoms, democracy and prosperity"). KYV1 score 0.51. It makes no specific commitment.
- 17ad5d2c: LinkedIn link.

None plainly states a commitment on a taxonomy issue.

VERDICT: PASS
