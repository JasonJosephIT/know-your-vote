# Step 3 review: FL-DOE-90814 (Kedner Maxime), FL-20-general

Reviewed 2026-09-29 against `passages.jsonl`, `run.json` and `ingest.log` in this directory. Run provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 108 of 108 passages asked, 0 failed. The site was not fetched again for this review. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7, 25 sub-issues).

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS**. All 108 passages are on `www.maximeforcongress.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS**. All 51 `states_policy` passages are byte-identical to `passages.jsonl`, and so are all 108 passages (url and heading match too). |
| 3 | No inferred motive | **PASS**. None of the 51 is only biography, an attack, fundraising or event copy. Five lead-in lines are noted below. |
| 4 | Silence recorded, not filled | **PASS**. 8 issues have gated passages. The other 17 have 0 passages and no finding in `areas`. |
| 5 | Possible misses | **PASS** (this check only informs). There are 2 possible misses on B3 and 1 borderline case. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script (Node, `new URL(url).host`) went over every `run.json` passage. It found one host, `www.maximeforcongress.com`, with 108 passages. `passages.jsonl` has the same single host and 108 lines. Every page URL in `ingest.log` is on that host: `/`, `/about`, `/jobs`, `/immigration`, `/healthcare`, `/education`, `/lower-costs`, `/small-business`, `/students` and `/ownership-equity`. This is the same host as OFFICIAL_SITE `https://www.maximeforcongress.com/`, so there was no redirect to document.

### 2. Quotes verbatim: PASS

A Node script matched each `run.json` passage to the `passages.jsonl` line with the same id. It compared `text` as UTF-8 bytes (`Buffer.compare`) and also compared `url` and `heading`.

- 51 passages have `states_policy: true`, and none of them differs in text, url or heading.
- All 108 passages match, not just those 51. No id appears in only one of the two files, and all 108 ids are unique.

### 3. No inferred motive: PASS

I read all 51 `states_policy` passages by eye. Each one carries a commitment by the candidate: "will fight to…", a numbered item under a "Solutions" heading, or a page summary of "Dr. Kedner Maxime's plan…". None is only biography, an attack on an opponent, fundraising or event copy. The about page (25 passages) and the homepage volunteer, TCPA and voter-registration copy are all marked `states_policy: false`.

These five passages cleared the gate even though they are introductions to a list. Each ends in a colon, so the concrete commitment sits in the list items after it. A claim built on one of these alone would be an incomplete sentence. They are listed here for information, not as failures:

- `f2e618c6`: "Dr. Maxime will fight for the jobs, training, and protections District 20 workers deserve:"
- `e5093161`: "Dr. Maxime will bring that ground-level view to Washington and fight for a healthcare system that actually serves the people paying for it:"
- `d5fffad2`: "Every child deserves a real shot — not one that depends on their zip code. Dr. Maxime will fight to:"
- `df556416`: "Dr. Maxime will fight for policies that lower the everyday costs squeezing District 20 households — and open real pathways so working families…"
- `3b6e5899`: "Every young person in District 20 deserves a real path forward — whether that path runs through a university, a trade, or an apprenticeship.…"

The run is not consistent about these introductions. `a8ddf73e` (small business, "In Congress, he'll fight to:") scored 0.35 and `84615a70` (ownership, "…he'll fight for policies that help working families cross that line:") scored 0.67, so both fell below the gate.

### 4. Silence recorded, not filled: PASS

Counts were computed by a script over `verdict.scores[issue] >= 0.85`. The table shows two counts:

- **Gated**: the passage cleared the threshold for the issue AND `states_policy` is true. These are the only passages `groupByArea` puts into `areas`, so these are the ones that can become claims.
- **Raw**: the passage cleared the threshold for the issue, whether or not it cleared the gate.

For every issue, the gated count equals the count in `run.json` `areas`.

| Issue | Label | Gated | Raw | Gated passage ids |
|---|---|---|---|---|
| A2 | Housing affordability | 5 | 5 | 64793730, ac298e61, 58894e24, d59cf21f, bc8da39f |
| A4 | Cost of living in Florida | 1 | 1 | 5d23996f |
| A6 | Public school funding and teachers | 4 | 5 | 801d9a3b, 5ee5807b, 01e6c8c2, d4eb0a9a |
| KYV10 | Career, vocational and higher education | 10 | 10 | e81806ef, 64bec9d3, 5ee5807b, d2afac2c, 95352436, 3b6e5899, 8f7dc898, e576c947, cd3bdb55, 627148a8 |
| B1 | Economy, inflation, and jobs | 7 | 9 | 64793730, f2e618c6, e81806ef, 64bec9d3, 5d23996f, b3c5fe3d, 29c4cb16 |
| B2 | Healthcare access and costs | 10 | 11 | 64793730, 4f8e8f6a, 8d951173, 28aed5ea, 8316896f, 3d68780a, 63a497d8, e489a9b5, 9097da70, ac298e61 |
| B3 | Immigration and border enforcement | 5 | 8 | 51834afd, 6f6d49a4, b43802b0, 4d1e4ae5, c097b47a |
| B4 | Social Security and Medicare | 3 | 3 | 409d3bb3, c1be5d1c, 96b6b7fe |

The other 17 taxonomy issues each have **0** passages, both gated and raw: A1, A3, A5, KYV9, A7, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8. If any of them joins the spine, its Position is `coverage="no_stated_position_found"`. None of them has an entry in `run.json` `areas`, so the run filled no gap.

Seven passages carry an issue tag while `states_policy` is false: 41ebff76 (B3), f5369170 (B1), 33baf82e (B1), 7fea8606 (B3), 0130cb2d (B3), 1c01d411 (B2) and c334ef90 (A6). This is by design. `readVerdict` in `src/lib/policy-noul.ts` thresholds issues independently of the gate, and `groupByArea` drops these passages, which makes `counts.with_issue` 38 rather than 45. The raw counts are higher than the gated counts only because of these seven.

The zeros cover the 10 pages that were fetched and nothing else. Two pages linked from the homepage, `/accountability` (policy 0.40) and `/civility-unity` (policy 0.36), fell below the 0.5 link threshold and were not read. So were `/blog`, two `/post/...` pages and `/event-list` (`ingest-report.md`). This review makes no assumption about what those pages contain.

### 5. Possible misses (for the founder, not a fix)

These passages are marked `states_policy: false` but plainly state a commitment on a taxonomy issue:

- `0130cb2d` (commitment 0.83, B3 0.92), `/immigration`, item "02" under "Solutions": "A pathway to citizenship for those who contribute to our society." This is a numbered solution item like its gated siblings 6f6d49a4, b43802b0, 4d1e4ae5 and c097b47a, and it missed the gate by 0.02.
- `41ebff76` (commitment 0.78, B3 0.97), homepage card "Secure borders, fair laws, and a path forward.": "Drawing on 30 years working with immigrant families, Dr. Maxime believes we can have both security and compassion — borders that protect our communities."

One borderline case is left out of the count above: `7fea8606` (commitment 0.67, B3 0.86), `/immigration` "Solutions": "Dr. Maxime believes we can have both security and compassion — and that we should stop pretending we have to choose:". It is an introductory line of the same kind as the five in check 3 that did clear the gate.

This one is outside the check as written, because the passage is gated rather than marked no-policy. It is noted because the spine is undecided. `f2a9f144` (commitment 0.97), `/students`: "Provide targeted student-debt relief for teachers, nurses, and public-service workers District 20 needs." It cleared the gate but got no issue: KYV10 scored 0.68 and A6 0.60, both under 0.85. It will land as a candidate-tier position unless someone assigns it to an issue.

### Other notes

- The Profiler constitution text for this candidate uses the example attribution "Senator Kedner Maxime says…". Nothing in the passages supports that title. The site uses "Dr. Kedner Maxime" and describes him as a pastor, an accountant and a 2022 candidate for the Oakland Park City Commission. The Profiler should attribute to "Dr. Kedner Maxime" or to "The campaign website".
- On `/immigration`, the numbered headings run 01, 02, 04, 05, 05, 06, so no "03" was ingested. The other issue pages have the same duplicated "05" pattern, where the closing line is labelled 05. This is an ingest observation only. No claim is made about content that was not captured.

VERDICT: PASS
