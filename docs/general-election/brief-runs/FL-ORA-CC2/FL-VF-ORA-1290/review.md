# Step 3 review: FL-VF-ORA-1290 (Kamia Brown), FL-ORA-CC2-general

Reviewer, acting under the Profiler constitution. Read-only review of the machine run in this directory. No website was fetched; every finding below comes from `passages.jsonl`, `run.json`, `ingest.log` (plus `run-report.txt`, `ingest-report.md`, `links.jsonl` and `src/lib/policy-noul.ts` / `src/lib/news-issues.ts` for context).

- Official site: https://www.kamiafororangecounty.com/
- Run: `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, 39 asked, 0 failed
- Gates: `states_policy` requires both `commitment` (q_states_policy) and `own_commitment` (q_own_commitment) to be at least 0.85 (`src/lib/policy-noul.ts:206-208`). The script check confirms every one of the 39 verdicts agrees with that rule.
- Counts: 39 passages, 12 `states_policy`, 6 of them with a taxonomy issue
- Spine: not yet decided for this race. Check 4 reports every taxonomy issue (tax-7, 25 sub-issues) with at least one passage over the threshold. Check 5 covers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (short) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 39 passage urls, and all 6 citations in `areas`, are on host `www.kamiafororangecounty.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | Script check: all 12 `states_policy` passages match `passages.jsonl` byte for byte on `text`, and also on `url` and `heading`. The 6 `areas` citations match too, and so do all 39 passages. |
| 3 | No inferred motive | **PASS** | All 12 `states_policy` passages are items of the homepage list "Kamia's Vision For District 2:". Each is a forward commitment. None is biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | 3 issues have gated passages over the threshold: KYV3 = 3, A2 = 2, KYV4 = 1. By raw score only (gate not cleared): B2 = 3, B1 = 1, KYV10 = 1, KYV3 +1. Every other issue is 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | **1 reported** | 5fc16ad9 (KYV3; `own_commitment` 0.84, just under the gate). |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

Script output (node, over `run.json` and `passages.jsonl`):

```
{ 'www.kamiafororangecounty.com': 39 }
ids in run not in jsonl []
ids in jsonl not in run []
```

- By page: `https://www.kamiafororangecounty.com/` has 15 passages, `/meet-kamia` has 24. This matches `ingest.log` ("24 passage(s)  .../meet-kamia", "39 passage(s)") and `ingest-report.md`.
- All 6 `areas` citations have url `https://www.kamiafororangecounty.com/`.
- No duplicate ids in either file. No redirect is needed or recorded.
- `links.jsonl`: Jev judged 3 links (`/meet-kamia`, `/get-involved`, `/donation`), all on the official host. Only `/meet-kamia` was chosen (as the about page). 0 policy pages were selected.

### Check 2: quotes verbatim (PASS)

The script compares, for each passage with `verdict.states_policy === true`, `Buffer.from(text)` in `run.json` against the passage with the same id in `passages.jsonl`. It also compares `url` and `heading`.

```
SP 12 mismatch 0
area citations 6 mismatch 0
all identical 39
```

The 12 ids: 5d8ff81d, 05628733, d74d5c9d, 06c4341f, 8dbf04fd, bfb04d38, 05a70774, b44c97f9, 2b9c1616, 481919f2, fa78a0f3, 21cc8c3b.

Four passages contain non-ASCII characters (curly apostrophe, en dash, or zero-width spaces): ba4a5174, d465f5dc, 9c46f647, 811ebbe1. None of them is `states_policy`, and all four still compare byte-identical. Note for display: 811ebbe1 ends in three zero-width spaces (`​ ​ ​`), which are in the source text.

### Check 3: no inferred motive (PASS)

All 12 `states_policy` passages sit under the homepage heading "Kamia's Vision For District 2:". Each is a short imperative platform item, which is a commitment by the candidate. None is only biography, an attack on an opponent, fundraising or event copy.

- 5d8ff81d: "Expand affordable and workforce housing options"
- 05628733: "Support solutions that lower homeowner costs and stabilize housing"
- d74d5c9d: "Encourage smart zoning for diverse housing types"
- 06c4341f: "Improve road conditions and neighborhood traffic safety"
- 8dbf04fd: "Expand transportation options: sidewalks, bike paths, and transit"
- bfb04d38: "Upgrade utilities, stormwater systems, and public facilities"
- 05a70774: "Secure state and federal funding for infrastructure investments"
- b44c97f9: "Protect natural resources through responsible land use"
- 2b9c1616: "Promote green infrastructure and resilient planning"
- 481919f2: "Balance growth while preserving parks, waterways, and green space"
- fa78a0f3: "Ensure transparency and community input in county decisions"
- 21cc8c3b: "Strengthen public-private partnerships to maximize resources"

None of the following was marked `states_policy`:

- the biography lines: 87c6a336, a94c955b, ba4a5174, e1e4f615, 7d7ef097
- the legislative accomplishments, offices and awards: cfe520a4, d465f5dc, 507b106d, df4850f0, 3cf6c7ed, 9c46f647, a823fd1a, c8926c65, 3c8c028f, 1409d80a
- the past-record "How Kamia Has Advocated For You" items: d615e2a9, 1687d969, 36fea77c, 1c4d60ee, 811ebbe1, 91c40f74, c64ae9b8, d64e7536, 44425cfc
- the video-player boilerplate: cbf54d5b ("To play, press and hold the enter key. To stop, release the enter key.")

The second gate (`own_commitment`) is what held back the past-record items. For example, 1c4d60ee has commitment 0.85 but `own_commitment` 0.23, and c64ae9b8 has 0.84 / 0.51.

### Check 4: silence recorded, not filled (PASS)

A passage "clears the threshold" for an issue when its issue score is at least 0.85. The count used here is the run's own: the passage must also clear the `states_policy` gates, which is what `groupByArea` puts into `areas`. For every passage, the `issues` array agrees with the score ≥ 0.85 rule (script: `issues vs scores mismatch []`).

| Issue | Label | Gated passages over threshold (in `areas`) | Ids |
|---|---|---|---|
| KYV3 | Growth, development and land conservation | 3 | 481919f2, d74d5c9d, b44c97f9 |
| A2 | Housing affordability | 2 | 5d8ff81d, 05628733 |
| KYV4 | Storm resilience and flood protection | 1 | bfb04d38 (score 0.86) |

By raw score alone, these passages are also over the threshold but fail the `states_policy` gate, so the run correctly leaves them out of `areas`:

| Issue | Label | Raw-score only | Ids (commitment / own_commitment) |
|---|---|---|---|
| B2 | Healthcare access and costs | 3 | d615e2a9 (0.39 / 0.07), 1687d969 (0.40 / 0.07), 811ebbe1 (0.70 / 0.21) |
| B1 | Economy, inflation, and jobs | 1 | 1c4d60ee (0.85 / 0.23) |
| KYV10 | Career, vocational and higher education | 1 | 1c4d60ee (0.85 / 0.23) |
| KYV3 | Growth, development and land conservation | +1 (4 in all) | 5fc16ad9 (0.93 / 0.84), see check 5 |

The B2, B1 and KYV10 passages are all past legislative record ("fought for", "Championed and helped secure", "Advocated for", "Pushed for"). They are not stated positions for this race.

Every other taxonomy issue has **0** passages over the threshold, so each one is `no_stated_position_found`:

- A1, A3, A4, A5, A6, KYV9, KYV10, A7
- B1, B2, B3, B4, B5, B6, KYV1, B7, B8
- KYV2, KYV5, KYV6, KYV7, KYV8

(B1, B2 and KYV10 are 0 on the gated count; their raw-score passages are listed above.)

The run does not fill any of these silences. `areas` contains only KYV3, A2 and KYV4, and every citation in it is a gated passage over the threshold.

### Check 5: possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that state a commitment on a taxonomy issue.

1. **5fc16ad9** (homepage, "Kamia's Vision For District 2:"): "Reduce barriers and incentivize responsible development"
   - Scores: commitment 0.93, `own_commitment` 0.84 (0.01 under the gate), KYV3 0.86.
   - It is an item of the same vision list as the 12 passages that cleared the gate, with the same imperative form.

The following were looked at and not counted as misses:

- da2f7000 ("Advance equitable access to opportunity across District 2"): a vision-list item, but it does not name a taxonomy issue (no issue score above 0.85; commitment 0.78).
- e1e4f615 ("As a single mother to her son Kason, Kamia understands the real challenges families face. Her lived experience fuels her commitment to policies that support working parents, protect children, and strengthen neighborhoods."): biography framing a general commitment. Borderline, and not on a specific taxonomy issue.
- 7d7ef097 ("Today, Kamia continues her work in healthcare advocacy and community development. With proven leadership, deep local knowledge, and a neighbor-first approach, she is ready to serve…"): biography and a general readiness statement.
- d615e2a9, 1687d969, 1c4d60ee, 811ebbe1, c64ae9b8, 91c40f74: they describe past record as a state representative, not a forward commitment for this race.

Also for the founder, outside the literal scope of check 5: 6 passages cleared both gates but have no issue over the threshold (the run's "no issue" list). These are not claims about any issue, and I am not suggesting they cover one. Their highest issue scores, as recorded:

- 2b9c1616 ("Promote green infrastructure and resilient planning"): KYV3 0.62 (B8 0.42, KYV4 0.42)
- 21cc8c3b: B1 0.28
- fa78a0f3: KYV1 0.27
- 05a70774: B1 0.25
- 06c4341f and 8dbf04fd: road conditions, traffic safety and transportation, where no taxonomy issue scores above 0.08

Transportation / roads, government transparency and infrastructure funding are topics the candidate campaigns on. Taxonomy 7 has no sub-issue for them, so under the constitution they would be candidate-tier issues.

Coverage note (not a failure): the ingest selected 0 policy pages, so the whole self-portrait rests on the 14-item homepage vision list and the `/meet-kamia` biography.

VERDICT: PASS
