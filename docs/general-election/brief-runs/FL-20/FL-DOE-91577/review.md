# Step 3 review: FL-DOE-91577 (Debbie Wasserman Schultz), FL-20-general

Reviewed 2026-09-29 against `passages.jsonl`, `run.json` and `ingest.log` in this directory. Run provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 8 of 8 passages asked, 0 failed. The site was not fetched again for this review. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7, 25 sub-issues).

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS**. All 8 passages are on `debbiewassermanschultz.com`. No other host appears. Four passages are third-party text reproduced on that host; none is marked as stating a policy (see below). |
| 2 | Quotes verbatim | **PASS**. The 1 `states_policy` passage is byte-identical to `passages.jsonl`, and so are all 8 passages and the 3 citations in `areas`. |
| 3 | No inferred motive | **PASS** (1 borderline note). The only policy passage, `3b9a6802`, names causes the candidate fights for. It is framed as career record, not a forward pledge, which limits what a claim may say. |
| 4 | Silence recorded, not filled | **PASS**. 3 issues have a gated passage (B2, B4, B5), all from the same passage. The other 22 have 0 and no finding in `areas`. |
| 5 | Possible misses | **PASS** (this check only informs). 0 possible misses. Three sub-threshold issues inside the gated passage are noted. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A Node script (`new URL(url).host`) went over every `run.json` passage. It found one host, `debbiewassermanschultz.com`, with 8 passages. `passages.jsonl` has the same single host and 8 lines. `ingest.log` shows one page fetched, `https://debbiewassermanschultz.com/`, which is the OFFICIAL_SITE itself, so there was no redirect to document. `run.json` `site` is `https://debbiewassermanschultz.com`.

The check passes on host. But four of the eight passages were not written by the campaign. They are news or editorial text that the campaign republished on its own homepage:

- `f9e008de`, heading "Herald endorsement: U.S. House District 20 Democratic primary | Opinion". Its text ends with a link to `miamiherald.com`.
- `f4af0fff`, heading "District 20, the Sun Sentinel Editorial Board recommends Democrat Debbie Wasserman Schultz". Its text ends with a link to `sun-sentinel.com`.
- `92a4eae8`, heading "Sun-Sentinel: Campaign poll shows Wasserman Schultz viewed favorably by Black voters, leading primary matchup".
- `4f9766a4`, heading "A crossroads moment for Broward Democrats | Editorial". The passage does not name who wrote it.

None of the four is marked `states_policy: true`, so none reaches `areas` and none can become a claim. `4f9766a4` does carry issue tags (A7 0.90, KYV1 0.86) with a commitment score of 0.20; see check 4. If a later run gates any of these four, that would be a check 3 failure of the FL-15 kind: a third party's words, not the candidate's stance.

The outlet URLs inside the passage text are text only. No passage `url` is on those hosts.

### 2. Quotes verbatim: PASS

A Node script matched each `run.json` passage to the `passages.jsonl` line with the same id. It compared `text` as UTF-8 bytes (`Buffer.compare`) and also compared `url` and `heading`.

- 1 passage has `states_policy: true` (`3b9a6802`), and it does not differ in text, url or heading.
- All 8 passages match, not just that one. No id appears in only one of the two files, and all 8 ids are unique.
- The 3 citations in `run.json` `areas` (B2, B4 and B5, all `3b9a6802`) are also byte-identical to `passages.jsonl`.

### 3. No inferred motive: PASS

One passage is marked as stating a policy:

- `3b9a6802` (commitment 0.88), heading "Debbie Wasserman Schultz": "Democrat Debbie Wasserman Schultz has spent her entire career fighting for Broward County to protect Social Security and Medicare, defend reproductive freedom, …"

It is not only biography. In the campaign's own words it names what she fights for: protect Social Security and Medicare, defend reproductive freedom, strengthen public schools, lower healthcare costs and prevent gun violence. That is her stated stance, in her own framing, which is what the Profiler bucket holds.

It is borderline, and it limits what a claim built on it may say:

- It is written as a career record ("has spent her entire career fighting"), not as a pledge. A claim should be attributed in that framing, for example "The campaign website states that she has spent her career fighting to protect Social Security and Medicare." It should not be restated as "she will…" or "she promises…".
- The B5 tag rests on the words "defend reproductive freedom". A claim should quote those words. Paraphrasing them into a specific abortion stance would go beyond the passage.
- Its second and third sentences are biography and record: "championed affordable healthcare, women's health, veterans, seniors, and our environment", "Florida's senior Congresswoman and a breast cancer survivor", "landmark laws…". They are not stated positions. The Profiler may not verify or rate them, and must not present them as its own finding.
- "fighting the reckless Trump agenda" is campaign language about an opponent. If it is used at all it must be quoted and attributed, never paraphrased.

The passages marked `states_policy: false` are, for the record: `f81d0305` (appropriations record), `f1a513b4` (fundraising: "Help us defeat Trump and MAGA by supporting…"), `f2b3efa3` (ActBlue donation copy) and the four third-party passages from check 1. All seven were correctly kept out of the gate.

### 4. Silence recorded, not filled: PASS

Counts were computed by a script over `verdict.scores[issue] >= 0.85`. The table shows two counts:

- **Gated**: the passage cleared the threshold for the issue AND `states_policy` is true. These are the only passages `groupByArea` puts into `areas` (`src/lib/policy-noul.ts` skips any verdict without `statesPolicy`), so these are the ones that can become claims.
- **Raw**: the passage cleared the threshold for the issue, whether or not it cleared the gate.

For every issue, the gated count equals the count in `run.json` `areas`.

| Issue | Label | Gated | Raw | Passage ids |
|---|---|---|---|---|
| B2 | Healthcare access and costs | 1 | 1 | 3b9a6802 (0.98) |
| B4 | Social Security and Medicare | 1 | 1 | 3b9a6802 (0.95) |
| B5 | Abortion policy | 1 | 1 | 3b9a6802 (0.89) |
| A7 | Elections administration and voting access | 0 | 1 | 4f9766a4 (0.90), not gated |
| KYV1 | Threats to democratic institutions | 0 | 1 | 4f9766a4 (0.86), not gated |

The other 20 taxonomy issues each have **0** passages, both gated and raw: A1, A2, A3, A4, A5, A6, KYV9, KYV10, B1, B3, B6, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8. A7 and KYV1 have **0** gated passages. So for 22 issues, if they join the spine, the Position is `coverage="no_stated_position_found"`. None of them has an entry in `run.json` `areas`, so the run filled no gap.

`4f9766a4` is the only passage with an issue tag and `states_policy: false`. It is the third-party editorial from check 1 ("…the obvious target of an illegal redrawing of Florida congressional districts, orchestrated by Gov. Ron DeSantis…"). `groupByArea` drops it, which is correct: it is not the candidate's own statement.

The zeros cover a single page and nothing else. The ingest read only the homepage. Jev judged 10 of 63 homepage links, none reached the 0.5 policy threshold (highest 0.14), and 0 policy pages and no about page were chosen (`ingest-report.md`, `links.jsonl`). None of the 10 judged links looks like an issues page. The earlier keyword attempt (`attempt-1-keywords/`) also fetched `/vote`, which held only registration and ballot deadlines. This review makes no assumption about pages that were not read.

### 5. Possible misses (for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment by the candidate on a taxonomy issue:

- `f81d0305` ("As a senior appropriator and member of Democratic leadership, Debbie has brought home billions of dollars for South Florida – from Everglades restoration…") is a record of past funding, not a commitment. Its highest scores are B1 0.50 and A5 0.41.
- `f1a513b4` and `f2b3efa3` are fundraising copy.
- `f9e008de`, `f4af0fff`, `92a4eae8` and `4f9766a4` are third-party text.

This one is outside the check as written, because the passage is gated rather than marked no-policy. It is noted because the spine is undecided. The gated passage `3b9a6802` also names three causes that scored under the threshold, so they received no issue tag: "strengthen public schools" (A6 0.65), "our environment" (B8 0.59) and "prevent gun violence" (B7 0.29). If A6, B8 or B7 joins the spine, this run records them as `no_stated_position_found`. That matches the threshold, but the homepage does name them in one phrase each.

### Other notes

- The Profiler constitution text for this candidate uses the example attribution "Senator Debbie Wasserman Schultz says…". The passages describe her as "Florida's senior Congresswoman" and "a 21-year member of Congress", and the race is U.S. House District 20. The Profiler should attribute to "Rep. Debbie Wasserman Schultz", "Congresswoman Debbie Wasserman Schultz" or "The campaign website", not "Senator".
- The whole brief for this candidate would rest on one 88-word homepage block. Any Position built from it should cite `3b9a6802` and nothing else.

VERDICT: PASS
