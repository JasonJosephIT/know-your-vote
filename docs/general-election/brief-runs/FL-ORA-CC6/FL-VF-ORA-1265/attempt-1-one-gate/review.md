# Step 3 review: FL-VF-ORA-1265 (Michael "Mike" Scott), FL-ORA-CC6-general

Reviewed 2026-09-29 against `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`), `passages.jsonl` (19 passages) and `ingest.log`. OFFICIAL_SITE: https://mymikescott.com/. SPINE: undecided for this race, so check 4 covers every taxonomy issue in `src/lib/news-issues.ts` (the 25 issue questions in `run.json` `question_ids`) and check 5 considers every taxonomy issue.

All checks were run with a node script over the two files, not by eye.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 19 passage urls are on host `mymikescott.com`. No other host. |
| 2 | Quotes verbatim | PASS | 0 passages marked `states_policy: true`, so nothing to compare. All 19 passages were also compared: every `run.json` text and url is byte-identical to the passage with the same id in `passages.jsonl`. The id sets match (19 = 19). |
| 3 | No inferred motive | PASS | 0 passages marked as stating a policy, so none can be biography, attack, fundraising or event copy marked as a policy. `counts.states_policy` = 0, `areas` = []. |
| 4 | Silence recorded, not filled | PASS | 0 gated passages on all 25 issues, so every issue is `no_stated_position_found`. `run-report.txt` states no passage cleared the gate. One passage scored above 0.85 on an issue (A2) but failed the gate. See below. |
| 5 | Possible misses (information only) | 1 borderline | `4bfa341d` (A2). See below. |

## Evidence

### Check 1: hosts

`mymikescott.com`: 17ed6b4e, 2129e887, 0bb3578d, 3beb07da, 17f626c4, 82feebef, 5848f8a9, 5b57343c (url `https://mymikescott.com/`); 4bfa341d (`/case_study/affordable-and-attainable-housing`); 2f98b536, 80cc6519, 15e51395, 0112d523, 90dacb11, 213fd3f9, 421549e0, 46c2be58, cd51699b, fe75efc9 (`/about-us`).

No other host. No redirects appear in `ingest.log`.

### Check 2: verbatim

The script compared `Buffer.from(text)` for each id. There were 0 `states_policy` passages to check. Across all 19 passages: 19 identical, 0 differing. The url of each passage also matches.

Note: in `passages.jsonl` itself, the three homepage teasers (17ed6b4e, 2129e887, 0bb3578d) end in "…". That ellipsis is in the ingested text, and `run.json` reproduces it unchanged.

### Check 3: no inferred motive

No passage is marked `states_policy: true`. All 19 have `states_policy: false`, and the highest commitment score is 0.79 (4bfa341d), below the 0.85 gate. The run correctly left the following as non-policy:
- Biography: 2f98b536, 80cc6519, 15e51395, 0112d523, 90dacb11, 213fd3f9, 421549e0, 46c2be58, cd51699b, fe75efc9.
- Site boilerplate: 3beb07da (Lorem ipsum placeholder), 17f626c4, 82feebef, 5848f8a9, 5b57343c (cookie notices).

### Check 4: passages over the threshold, per taxonomy issue

A passage counts as a stated position only if it clears the commitment gate (≥ 0.85) and the issue score (≥ 0.85). The "issue score ≥ 0.85" column counts passages over the threshold on that issue's score alone, whether or not they passed the gate.

| Issue | Label | Stated (gate + issue) | Issue score ≥ 0.85 | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 0 | 1 (4bfa341d, 0.96; commitment 0.79, gate failed) | no_stated_position_found |
| All other 24 (A1, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8) | | 0 | 0 | no_stated_position_found |

Every one of the 25 issues has 0 stated passages and is recorded as `no_stated_position_found`. The run did not fill any gap: `areas` is empty and `counts.with_issue` = 0.

A2 is the only issue with any passage over 0.85. `run.json` lists `"issues": ["A2"]` on 4bfa341d, but that passage has `states_policy: false`, so it produces no finding and appears in no area.

### Check 5: possible misses (for the founder, not a fix)

- **4bfa341d** (A2, Housing affordability; commitment 0.79, A2 0.96), `/case_study/affordable-and-attainable-housing`. First 20 words: "As a member of the Orange County Affordable Housing Advisory Board, Mike has advocated for an increase in the number". This is borderline. The passage describes advocacy the candidate has done and still does on an advisory board ("has advocated for an increase in the number of affordable housing units", "advocates for the creation of initiatives, policies, and county ordinances that create more affordable housing opportunities"). It is on the candidate's own issue page, but it is phrased as a record of his role, not as a pledge for the commission seat. The gate missed it by 0.06.

No other passage states a commitment on any taxonomy issue.

### Ingest facts relevant to the silence (recorded, not filled)

These are facts from `ingest.log` and `ingest-report.md`. They are not claims about what the candidate's position is.
- The ingest selected `/case_study/business-and-economic-development` (link score 0.79). It rendered only 23 characters of text and produced 0 passages.
- According to `ingest.log`, `/mike-scotts-priorities` (link score 0.95) produced 7 passages. No passage in `passages.jsonl` has that url, and the ingest report lists only 3 pages with passages. The log does not say why those passages are missing.
- The ingest did not select `/case_study/community-engagement` (link score 0.18).

For B1 and the other issues, then, `no_stated_position_found` means nothing was found in what was ingested. The candidate's pages were not all ingested.

VERDICT: PASS
