# Step 3 review: FL-DOE-91577 (Debbie Wasserman Schultz), FL-20-general

Reviewed 2026-09-30 against `passages.jsonl`, `run.json` and `ingest.log` in this directory. Run provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, 8 of 8 passages asked, 0 failed. This is the two-gate run: a passage states a policy only if both `q_states_policy` (commitment) and `q_own_commitment` reach 0.85 (`readVerdict` in `src/lib/policy-noul.ts`). The site was not fetched again for this review. The spine is undecided for this race, so checks 4 and 5 cover every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7, 25 sub-issues).

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS**. All 8 passage urls are on `debbiewassermanschultz.com`. No other host. |
| 2 | Quotes verbatim | **PASS**. No passage is marked `states_policy`, so the check is vacuous. All 8 passages are still byte-identical to `passages.jsonl`. |
| 3 | No inferred motive | **PASS**. 0 passages are marked as stating a policy, and `areas` is empty. |
| 4 | Silence recorded, not filled | **PASS**. All 25 issues have 0 gated passages, so all 25 are `no_stated_position_found`. Five issues have a passage over 0.85 that failed the gate. |
| 5 | Possible misses (for the founder, not a fix) | 1 borderline possible miss: `3b9a6802` (B2, B4, B5). |

## Evidence

### 1. Candidate-controlled sources only: PASS

A Node script ran `new URL(url).host` over every passage in `run.json` and `passages.jsonl`. Both files have one host, `debbiewassermanschultz.com`, with 8 passages each. `ingest.log` shows one page fetched in the browser, `https://debbiewassermanschultz.com/`. That is the OFFICIAL_SITE, so there is no redirect to document.

Passing on host does not make every passage self-authored. Four passages are news or editorial text that the campaign republished on its homepage: `f9e008de` (Miami Herald endorsement, links to `miamiherald.com`), `f4af0fff` (Sun Sentinel endorsement, links to `sun-sentinel.com`), `92a4eae8` (Sun-Sentinel poll story) and `4f9766a4` ("A crossroads moment for Broward Democrats | Editorial"). None of them is marked as stating a policy, so none can become a claim. The outlet URLs are in the passage text only. No passage `url` is on those hosts.

### 2. Quotes verbatim: PASS

A Node script matched each `run.json` passage to the `passages.jsonl` line with the same id. It compared `text` as UTF-8 bytes (`Buffer.compare`), and it also compared `url` and `heading`.

- 0 passages have `states_policy: true`, so there is nothing a claim could quote.
- All 8 passages match in text, url and heading anyway. All 8 ids are unique, and every id is in both files.
- `run.json` `areas` is `[]`, so there are no citations to compare.

### 3. No inferred motive: PASS

No passage is marked as stating a policy (`counts.states_policy: 0`, `areas: []`). The run can produce no stated_position claim, so it cannot turn biography, an attack, fundraising or event copy into a stance.

The previous one-gate run (`attempt-1-one-gate/`, provenance `q-b2171346`) gated `3b9a6802` on commitment alone. The second gate scored it 0.22 and closed it. That passage is covered under check 5.

Each passage the run kept out, and why it is not a commitment:

- `f81d0305`: the appropriations record ("has brought home billions of dollars…"). Commitment 0.11, own 0.06.
- `f1a513b4`: fundraising ("Help us defeat Trump and MAGA by supporting…"). Commitment 0.19, own 0.10.
- `f2b3efa3`: ActBlue donation copy. Commitment 0.02, own 0.03.
- `f9e008de`, `f4af0fff`, `92a4eae8` and `4f9766a4`: third-party text (see check 1). Commitment 0.03, 0.03, 0.03 and 0.21. Own commitment 0.04, 0.03, 0.03 and 0.14.

### 4. Silence recorded, not filled: PASS

A script counted `verdict.scores[issue] >= 0.85` for every issue. The table shows two counts:

- **Gated**: the passage is over the threshold for the issue and `states_policy` is true. Only these reach `areas` and can become claims.
- **Raw**: the passage is over the threshold for the issue, gated or not. These are the same as `verdict.issues`.

| Issue | Label | Gated | Raw | Raw passage ids |
|---|---|---|---|---|
| A7 | Elections administration and voting access | 0 | 1 | 4f9766a4 (0.90) |
| B2 | Healthcare access and costs | 0 | 1 | 3b9a6802 (0.98) |
| B4 | Social Security and Medicare | 0 | 1 | 3b9a6802 (0.94) |
| B5 | Abortion policy | 0 | 1 | 3b9a6802 (0.90) |
| KYV1 | Threats to democratic institutions | 0 | 1 | 4f9766a4 (0.86) |

The other 20 issues have 0 gated and 0 raw: A1, A2, A3, A4, A5, A6, KYV9, KYV10, B1, B3, B6, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8.

So all 25 issues have **0** gated passages. On this run, every issue that joins the spine is `coverage="no_stated_position_found"`. `run.json` has no entry in `areas`, so the run filled no gap.

These zeros cover only what was read, which was the homepage. Jev judged 10 of 63 homepage links, the highest policy score was 0.14 (threshold 0.5), and no policy page and no about page were chosen (`ingest-report.md`, `links.jsonl`).

### 5. Possible misses (for the founder, not a fix)

One passage is marked `states_policy: false` but could be read as stating the candidate's stance on taxonomy issues. It is borderline.

- `3b9a6802` (commitment 0.89, own commitment 0.22; B2 0.98, B4 0.94, B5 0.90): "Democrat Debbie Wasserman Schultz has spent her entire career fighting for Broward County to protect Social Security and Medicare, defend reproductive freedom, strengthen public schools, lower healthcare…"

  The campaign's own copy names what she fights for: protect Social Security and Medicare (B4), defend reproductive freedom (B5) and lower healthcare costs (B2). The `q_own_commitment` question counts third-person statements such as "she supports". Against that, the sentence is framed as a career record ("has spent her entire career fighting"), and the same question answers no for "a past record". The second gate's 0.22 follows that reading. If the founder counts an ongoing "fighting to protect X" as a stance, this is a miss on B2, B4 and B5. The same passage also names "strengthen public schools" (A6 0.69), "our environment" (B8 0.58) and "prevent gun violence" (B7 0.30), all under the threshold.

No other passage is a possible miss. `f81d0305` is a record of past funding (top score B1 0.54). `f1a513b4` and `f2b3efa3` are fundraising copy. The other four are third-party text. `4f9766a4` is tagged A7 and KYV1, but its words are an editorial's ("…the obvious target of an illegal redrawing of Florida congressional districts, orchestrated by Gov. Ron DeSantis…"), not a commitment by the candidate.

### Other notes

- `ingest-report.md` is stale in its "Step 2: policy run (Jev)" section. It gives provenance `q-b2171346`, "State a policy 1", "…and match a taxonomy issue 1" and 28290/3664 tokens. Those figures belong to the superseded one-gate run in `attempt-1-one-gate/`. The current `run.json` and `run-report.txt` give `q-e7282116`, 0 passages stating a policy and 29954/3832 tokens. The corpus is the same in both runs (8 identical passages), and only the gate changed. The report should be updated before anyone relies on it.
- The constitution's example attribution for this candidate is "Senator Debbie Wasserman Schultz says…". The passages call her "Florida's senior Congresswoman", and the race is U.S. House District 20. Any claim should use "Rep.", "Congresswoman" or "The campaign website", not "Senator".

VERDICT: PASS
