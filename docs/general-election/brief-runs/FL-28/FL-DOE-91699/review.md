# Step 3 review: FL-DOE-91699 (Phil "Felipe" Ehr), FL-28-general

Official site: https://ehrforcongress.us/
Run: `jev:jev-1.13.0/tax-7/q-e7282116` (two gates: `q_states_policy` and `q_own_commitment`), threshold 0.85, status `complete`, created 2026-09-30T01:58:35Z, 17 of 17 passages asked, 0 failed.
SPINE: undecided for this race, so check 4 covers every taxonomy issue (tax-7, 25 sub-issues) and check 5 considers every taxonomy issue.

Reviewed read-only from `passages.jsonl`, `run.json`, `ingest.log` (plus `links.jsonl`, `run-report.txt`, `run.log`, `ingest-report.md`, and the earlier `attempt-1-one-gate/run.json` for comparison). No site was fetched.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 17 run.json passages are on `ehrforcongress.us` (`/` 12, `/meet-phil` 5). No other host. |
| 2 | Quotes verbatim | PASS | 7 of 7 policy passages byte-identical to passages.jsonl: c109dfb1, 41430c1f, 1707e2b2, b9b09509, 01bcefdd, 30568a3c, 651eba12 |
| 3 | No inferred motive | PASS | No policy-marked passage is only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | 7 issues have a gated passage; 18 of 25 issues are 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | PASS (none found) | No passage marked "no policy" plainly states a commitment on a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script over `run.json.passages[].url` gives the host set `{ehrforcongress.us: 17}`. Pages: `https://ehrforcongress.us/` (12 passages) and `https://ehrforcongress.us/meet-phil` (5 passages). `ingest.log` shows no redirect and no other host. The ids match both ways: all 17 run.json ids are in passages.jsonl, all 17 passages.jsonl ids are in run.json, and there are no duplicates.

Note for the founder: three passages hosted on the candidate's site are endorsement or third-person copy rather than the candidate's own voice. They are ba9cbb9d (an attribution line, "– Former U.S. Rep. Debbie Mucarsel-Powell", with the endorsement quote in its heading), 57b1abcc and 1ee46eab. All three are marked `states_policy: false`, so none reaches a claim. 1ee46eab has `own_commitment` 0.65 but `commitment` 0.25, so it fails both gates.

### 2. Quotes verbatim: PASS

A node script compared `text` as UTF-8 bytes (`Buffer.equals`) for each passage with `verdict.states_policy === true` against the passage with the same id in passages.jsonl. It also compared url and heading.

| id | bytes | text identical | url identical | heading identical |
|---|---|---|---|---|
| c109dfb1 | 116 | yes | yes | yes |
| 41430c1f | 117 | yes | yes | yes |
| 1707e2b2 | 215 | yes | yes | yes |
| b9b09509 | 103 | yes | yes | yes |
| 01bcefdd | 171 | yes | yes | yes |
| 30568a3c | 199 | yes | yes | yes |
| 651eba12 | 272 | yes | yes | yes |

The 10 non-policy passages are also byte-identical. The same script checked that `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85` for all 17 passages, and that `issues` equals the set of `scores >= 0.85`. It found 0 mismatches. (`run-report.txt` shortens 651eba12 with "…" for display. run.json holds the full text.)

### 3. No inferred motive: PASS

All 7 policy-marked passages sit under the "Phil's Priorities" heading on the homepage. Each clears both gates (commitment 0.96 to 0.98, own_commitment 0.90 to 0.96) and each makes an action commitment in the candidate's own framing. First 20 words:

- c109dfb1 "Lower premiums, expand access, and reduce out-of-pocket costs through the Healthcare Stability & Program Choice Act."
- 41430c1f "Enforce anti-fraud laws, hold bad actors accountable, stabilize the market, and protect homeowners from rising costs."
- 1707e2b2 "Putting America First means defending the Constitution and the rule of law, rejecting anti-American rhetoric, antisemitism, socialism and political extremism,"
- b9b09509 "Create an inter-agency public corruption task force and strengthen accountability for public contracts."
- 01bcefdd "Pursue a full VA hospital or major VA medical facility in South Dade to improve access for veterans in South"
- 30568a3c "Protect law-abiding immigrant families, Improve training and accountability for border personnel, a path to permanent residency for families stuck in"
- 651eba12 "Protect the Everglades, defend water resources, support responsible growth, and pursue a temporary moratorium on large-scale AI data centers and"

None is biography, an attack on an opponent, fundraising or event copy.

Notes for the founder (not failures):
- 1707e2b2 is mostly a values statement. Its concrete commitment is the closing clause, "using military force only when lawful and necessary". It is tagged KYV1 at 0.86, just over the threshold.
- 41430c1f names no subject. Its only anchor is "protect homeowners from rising costs". Its A2 (0.85, exactly at the threshold) and B7 (0.92) tags come from the text alone. On the live page this priority may have a title that the ingest did not capture.
- The attack passage 21c54aa8 ("The dire need for change in South Florida is clear. Our community is plagued by corruption, while Tallahassee is preoccupied") scores KYV1 0.88, but both gates keep it out (commitment 0.19, own_commitment 0.07, `states_policy: false`). It is not in `areas` and does not reach a claim.

### 4. Silence recorded, not filled: PASS

Threshold 0.85. "Gated count" is what the run publishes: passages that clear both gates and score the issue at or above 0.85. That is exactly what `areas` in run.json contains, and the script confirmed the two match. "Raw count" counts any passage scoring the issue at or above 0.85, gated or not. Issues with at least one passage over the threshold:

| Issue | Label | Gated count | Passage ids | Raw count |
|---|---|---|---|---|
| A2 | Housing affordability | 1 | 41430c1f (0.85) | 1 |
| B2 | Healthcare access and costs | 2 | c109dfb1 (0.98), 01bcefdd (0.96) | 2 |
| B3 | Immigration and border enforcement | 1 | 30568a3c (0.98) | 1 |
| B7 | Crime policy, policing and courts | 1 | 41430c1f (0.92) | 1 |
| KYV1 | Threats to democratic institutions | 1 | 1707e2b2 (0.86) | 2 (adds 21c54aa8, 0.88, gated out: attack copy) |
| KYV2 | Energy and utilities | 1 | 651eba12 (0.93) | 1 |
| KYV3 | Growth, development and land conservation | 1 | 651eba12 (0.99) | 1 |

The other 18 taxonomy issues each have **0** passages and are `no_stated_position_found`: A1, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B4, B5, B6, B8, KYV4, KYV5, KYV6, KYV7, KYV8.

Neither the run nor its report fills any of these zeros.

Candidate-tier issue (outside the taxonomy): b9b09509, the public corruption task force, clears both gates (0.97 / 0.95) but matches no taxonomy issue. Its best scores are KYV1 0.80 and B7 0.77. Under the constitution it is a candidate-tier issue, not a spine match. It is the one passage `run-report.txt` counts as "state a policy the taxonomy has no question for".

Run-to-run fact for the founder: the corpus is unchanged from `attempt-1-one-gate`, with the same 17 ids and texts. The only change in any passage's over-threshold tag set is on 651eba12: A5 was 0.85 in the earlier run (`q-b2171346`) and is 0.83 in this one. That is why A5 went from 1 to 0 here. The gate verdicts are the same in both runs.

Coverage caveat: the ingest chose 0 policy pages (`ingest.log`: "56 links, 0 policy page(s) selected"). Jev judged 4 links, and `/fl-28-debates`, `/voter-information` and `/press` all scored under 0.5 for policy (`links.jsonl`). The corpus is only the homepage and `/meet-phil`: 17 passages. So each zero above means "not stated in these 17 passages", not "not stated anywhere on the site".

### 5. Possible misses (information for the founder): none found

I read all 10 passages marked `states_policy: false` in full and checked each against every taxonomy issue:

- 82bf9d9e, 5c2612ac, aae63009, 7beed08b: biography (the Mariel Boatlift, Navy career, work after the Navy). 82bf9d9e also names the opponent and describes the district, with no commitment.
- 57b1abcc, 1ee46eab: third-person praise ("He will find solutions that matter to everyday people in South Florida…"), with no commitment on any issue.
- ba9cbb9d: the endorser's attribution line.
- 21c54aa8: an attack on the opponent, with no commitment.
- 9579603b "Phil and Sue, his wife of 28 years, are blessed with two daughters. Phil is running to represent the people": family biography plus a general reason for running ("defend American freedoms, democracy and prosperity"). It scores KYV1 0.46 and makes no specific commitment.
- 17ad5d2c: a LinkedIn link.

None of them plainly states a commitment on a taxonomy issue.

### Housekeeping note (not a check)

`ingest-report.md` in this directory still describes the earlier one-gate policy run (`q-b2171346`, 59924 in / 7786 out tokens). The current `run.json`, `run.log` and `run-report.txt` are `q-e7282116` (63460 in / 8143 out). This review is of the current run.json.

VERDICT: PASS
