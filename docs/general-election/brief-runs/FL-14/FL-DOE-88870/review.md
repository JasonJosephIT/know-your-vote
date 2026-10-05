# Step 3 review: FL-DOE-88870 (Kathy Castor), FL-14-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (12 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status complete, created 2026-09-30T01:58:04Z, 12 of 12 asked, 0 failed, 1 states a policy, 1 of those matches a taxonomy issue), `ingest.log`. This run uses both gates: `states_policy` requires `commitment` ≥ 0.85 and `own_commitment` ≥ 0.85 (`readVerdict` in `src/lib/policy-noul.ts`). SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 12 passages in `run.json` and `passages.jsonl` are on `castorforcongress.com`, the OFFICIAL_SITE host. No other host and no redirect. |
| 2 | Quotes verbatim | PASS | The single states_policy=true passage, `5b917f4e`, is byte-identical to the same id in `passages.jsonl`. So are the other 11, on text, url and heading. Checked with `node` `Buffer.equals`. |
| 3 | No inferred motive | PASS | `5b917f4e` is a forward-looking commitment ("will continue to fight for …"). It is not only biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | Issues with a stated position: A4 1, B1 1, B2 1 (all `5b917f4e`). A7 and KYV3 have passages over 0.85 but those failed the gate, so they count 0. The other 20 issues count 0. All zeros are no_stated_position_found. |
| 5 | Possible misses (information only) | 2 possible misses, 1 borderline | `7dfda9a9` and `3a9f9573` (B1). `91625c45` is borderline (veterans, not a taxonomy issue). See below. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script over `run.json` and `passages.jsonl` found one host in the passage urls: `castorforcongress.com`. It covers 12 of 12 passages in both files.

| URL | Passages |
|---|---|
| `https://castorforcongress.com/` | 4 (`3023ae45`, `7dfda9a9`, `98cdc9cd`, `4903083c`) |
| `https://castorforcongress.com/about` | 7 (`c37a21c1`, `a6f1bf63`, `9d67e600`, `fac3c04f`, `91625c45`, `3a9f9573`, `5b917f4e`) |
| `https://castorforcongress.com/delivering-for-florida` | 1 (`5e81fa0f`) |

Every URL in `ingest.log` is on the same host, and so are the 7 links Jev judged in `links.jsonl`. `run.json` `site` is `https://castorforcongress.com`.

Several homepage links are titled with a news outlet's name, for example "(Tampa Bay Times) …" and "(WUSF) …". Those pages are on the campaign's own domain, but they may reproduce third-party reporting. None was selected (policy scores 0.10 to 0.15), so none is in this corpus. If a later crawl selects one, the reviewer should check whether its text is the candidate's own words.

### 2. Quotes verbatim

I checked this with `node`. For each `run.json` passage, I compared `Buffer.from(text, "utf8")` with the passage of the same id in `passages.jsonl`:

- The id sets match: 12 in `run.json` and 12 unique ids in `passages.jsonl`, all shared.
- The 1 states_policy=true passage (`5b917f4e`) matches byte for byte: 0 mismatches.
- All 12 passages match on text, url and heading.
- The three `areas` citations (A4, B1 and B2, all `5b917f4e`) also match `passages.jsonl` byte for byte.
- Internal consistency: for every passage, `states_policy` equals `commitment ≥ 0.85 AND own_commitment ≥ 0.85`, and `issues` equals the set of scores ≥ 0.85. There were 0 inconsistencies.

### 3. No inferred motive

The one passage marked states_policy=true:

- `5b917f4e` (commitment 0.87, own_commitment 0.90; A4 0.85, B1 0.92, B2 0.92): "But the work isn’t done. Kathy Castor will continue to fight for a diverse and strong Tampa Bay economy that". It continues "…keeps costs for families in check, keeps health care and energy affordable, and protects our way of life."

It is a third-person commitment about the future ("will continue to fight for"). The second gate's instructions count this form. It is not biography, an attack on an opponent, fundraising or event copy.

Notes for the Profiler and the founder (not failures):

- **The commitment is general.** `5b917f4e` names goals (lower family costs, affordable health care and energy) but no specific policy, bill or amount. Any claim should say only what the site says, for example: "The campaign website states that Kathy Castor will continue to fight for a Tampa Bay economy that keeps costs for families in check and keeps health care and energy affordable." It must not add a mechanism the passage does not name.
- **A4 is exactly at the threshold (0.85).** The A4 tag depends on that margin.
- **The title "Senator" is not supported.** The Profiler prompt calls her "Senator Kathy Castor". No passage supports that title. The site says "Representative Kathy Castor" (`3023ae45`), "U.S. Representative Kathy Castor" (`c37a21c1`) and "Congresswoman Castor" (`7dfda9a9`). Under rules 1 and 2, no claim should call her "Senator".
- **Gated-out passages still carry `issues`.** As designed, `readVerdict` fills `issues` whether or not the gates pass, and `groupByArea` skips states_policy=false. Examples: `7dfda9a9` `["B1"]`, `98cdc9cd` `["A7"]`, `a6f1bf63` `["KYV3"]`, `fac3c04f` `["B2"]`, `3a9f9573` `["B1"]`. These are not issue tags and must not become claims.
- **Fundraising was kept out.** `4903083c` "Help Kathy Castor continue to fight for FL-14 families." is the Donate Now block (commitment 0.05, own_commitment 0.22). Keeping it out was correct.

### 4. Silence recorded, not filled

A passage counts only if it clears both gates and its issue score is ≥ 0.85. This matches `readVerdict` and `groupByArea` in `src/lib/policy-noul.ts`. The table lists every taxonomy issue where at least one passage scored at or over the threshold:

| Issue | Label | Passages that count | Over 0.85 on the issue but failed the gate | Coverage |
|---|---|---|---|---|
| A4 | Cost of living in Florida | 1: `5b917f4e` | none | stated |
| B1 | Economy, inflation, and jobs | 1: `5b917f4e` | `7dfda9a9` (B1 0.95; gates 0.72 / 0.50), `3a9f9573` (B1 0.96; gates 0.85 / 0.65) | stated |
| B2 | Healthcare access and costs | 1: `5b917f4e` | `fac3c04f` (B2 0.88; gates 0.20 / 0.06) | stated |
| A7 | Elections administration and voting access | 0 | `98cdc9cd` (A7 0.85; gates 0.09 / 0.05) | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | `a6f1bf63` (KYV3 0.90; gates 0.24 / 0.05) | no_stated_position_found |

The other 20 issues have 0 passages over the threshold. They are recorded as no_stated_position_found: A1, A2, A3, A5, A6, KYV9, KYV10, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.

The run filled nothing. `98cdc9cd` ("You must request to vote by mail again after every general election.") is voter information, not a position on A7, and it stays out. `a6f1bf63` is past record on KYV3 and stays out.

Threshold sensitivity, for information: `5b917f4e` cleared the first gate at 0.87 and A4 at exactly 0.85. `3a9f9573` sits exactly at 0.85 on the first gate but failed the second gate at 0.65. All of this candidate's stated coverage rests on one passage.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked states_policy=false but read as a present-tense stance by the candidate on a taxonomy issue. The second gate counts third-person statements ("she supports"), so the form alone does not rule them out. They are listed so the founder can judge. They are not suggested fills.

- `3a9f9573` (commitment 0.85, own_commitment 0.65; B1 0.96): "She stands up to grow the middle class and boost small business owners, guaranteeing that everyone has an equal opportunity". The second sentence is past record ("She has successfully fought to bring new, good-paying job opportunities to the region…"). The first sentence is a present-tense stance on B1. This passage cleared the gate in the earlier one-gate run (`attempt-1-one-gate/run.json`, commitment 0.87). The new second gate took it out. It is a possible miss on B1.
- `7dfda9a9` (commitment 0.72, own_commitment 0.50; B1 0.95, A4 0.80, B8 0.77): "From securing federal investments that drive the local economy to championing landmark environmental protections, she works tirelessly to lower family". It continues "…costs, create good-paying jobs, and protect Florida’s unique way of life. … Congresswoman Castor is dedicated to building a strong, diverse economy…". This is a present-tense stance on B1, and on A4 below the threshold. It is a possible miss on B1.

Borderline, not counted as a miss:

- `91625c45` (commitment 0.58, own_commitment 0.14; B2 0.71, A6 0.57, B1 0.50): "She is a champion for veterans, co-chairing the Congressional Air Force and Congressional Special Operations Forces Caucus and consistently fighting". It is mostly record ("worked to improve…", "supported investments…", "voted for…"). The stance it carries is veterans' services, which has no tax-7 sub-issue. If the Profiler uses it, it would be a candidate-tier issue, not a spine issue.

Also noted, on the passage that did clear the gate: `5b917f4e` says "keeps health care and energy affordable". KYV2 (energy and utilities) scored 0.79 there, below the threshold, so it is not tagged KYV2.

No other passage marked no-policy states a commitment. `3023ae45`, `9d67e600` and `c37a21c1` are biography or record. `fac3c04f` and `a6f1bf63` are past record. `5e81fa0f` is navigation copy, `4903083c` is fundraising and `98cdc9cd` is voter information.

### Bookkeeping notes (not failures)

- **`ingest-report.md` describes the earlier run.** Its "Step 2: policy run" table gives provenance `q-b2171346`, "State a policy: 2", and 42195/5496 tokens. That matches `attempt-1-one-gate/run.json`. The current `run.json` (provenance `q-e7282116`, two gates) has 1 passage that states a policy and used 44691/5748 tokens (`run-report.txt`). The difference is `3a9f9573` (see check 5). The ingest part of the report is unchanged and matches `ingest.log` and `passages.jsonl`.
- **Scope.** `attempt-1-keywords/` (an earlier keyword crawl) and `attempt-1-one-gate/` (the earlier one-gate run and its review) are not part of this run. I read `attempt-1-one-gate/run.json` only to compare verdicts. I did not re-review either folder.

VERDICT: PASS
