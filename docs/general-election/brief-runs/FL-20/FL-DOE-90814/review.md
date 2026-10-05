# Step 3 review: FL-DOE-90814 (Kedner Maxime), FL-20-general

Reviewed 2026-09-30 against `passages.jsonl`, `run.json` and `ingest.log` in this directory. The run is `jev:jev-1.13.0/tax-7/q-e7282116` at threshold 0.85 with the two-gate verdict (`commitment` and `own_commitment` must both clear the threshold). Its status is `complete`: 108 of 108 passages asked, 0 failed, 46 `states_policy`, 35 with an issue. The site was not fetched again. SPINE is undecided for this race, so checks 4 and 5 cover all 25 sub-issues of taxonomy v7 (`src/lib/news-issues.ts`). The earlier one-gate attempt is kept in `attempt-1-one-gate/` and is not what this review covers.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS**. All 108 passages are on `www.maximeforcongress.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS**. All 46 `states_policy` passages are byte-identical to `passages.jsonl`, and so are all 108 passages, including url and heading. |
| 3 | No inferred motive | **PASS**. None of the 46 is only biography, an attack, fundraising or event copy. Three gated lead-in lines are noted below. |
| 4 | Silence recorded, not filled | **PASS**. 8 issues have gated passages. The other 17 have 0 and have no entry in `areas`. |
| 5 | Possible misses | For information only. There are 4 possible misses on B3, plus 4 borderline cases. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A Node script ran `new URL(url).host` over every passage in `run.json` and every line of `passages.jsonl`. Both files have exactly one host, `www.maximeforcongress.com`, with 108 passages each. The 10 pages in `ingest.log` are `/`, `/about`, `/jobs`, `/immigration`, `/healthcare`, `/education`, `/lower-costs`, `/small-business`, `/students` and `/ownership-equity`, all on that host. It is the OFFICIAL_SITE host (`https://www.maximeforcongress.com/`), so no redirect needed documenting. Other hosts: none.

### 2. Quotes verbatim: PASS

A Node script matched each `run.json` passage to the `passages.jsonl` line with the same id. It compared `text` as UTF-8 bytes (`Buffer.compare`) and also checked that `url` and `heading` are equal.

- 46 passages have `states_policy: true`, and 0 of them differ.
- All 108 passages also match. All 108 ids are unique, no id appears in only one file, and no verdict is null.
- Internal consistency, checked by the same script: in all 108 verdicts, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, and `issues` equals the set of scores `>= 0.85`. `counts` agrees: 46 gated, 35 of those with an issue, and 11 gated with no issue. The 11 match the line in `run.log`.

### 3. No inferred motive: PASS

I read all 46 `states_policy` passages. Each one carries a commitment by the candidate. Most are "Dr. Maxime will fight to…" lines, numbered items under a "Solutions" heading, or a page summary of "Dr. Kedner Maxime's plan…". None is only biography, an attack on an opponent, fundraising or event copy. The about page (25 passages), the homepage bio, the volunteer and TCPA copy, and the voter-registration copy are all `states_policy: false`.

Two gated passages open with problem copy and then state a commitment. Both are fine:
- `4f8e8f6a`: "Seniors rationing insulin. Parents skipping their own care. Families going bankrupt from a single hospital bill. Dr. Maxime will fight …"
- `64793730`: "Families are being squeezed by housing, groceries, insurance, and healthcare. Dr. Maxime will fight to bring costs down and open …"

Three gated passages are lead-ins that end in a colon, so the concrete commitment is in the list items that follow them. Each still states a general commitment, so none of them fails this check. A claim built on one of these alone would be an incomplete sentence:
- `f2e618c6`: "Dr. Maxime will fight for the jobs, training, and protections District 20 workers deserve:"
- `e5093161`: "Dr. Maxime will bring that ground-level view to Washington and fight for a healthcare system that actually serves the people …"
- `df556416`: "Dr. Maxime will fight for policies that lower the everyday costs squeezing District 20 households — and open real pathways …"

The second gate now keeps out lead-ins it previously let through: `d5fffad2` (own 0.80) and `3b6e5899` (own 0.83). It still passes the three above.

### 4. Silence recorded, not filled: PASS

A script counted passages with `verdict.scores[issue] >= 0.85`. The table has two columns:

- **Gated**: the passage cleared the threshold for the issue and has `states_policy: true`. Only these reach `areas`, so only these can become claims.
- **Raw**: the passage cleared the threshold for the issue, whether or not it cleared the gate.

For every issue, the gated count equals the citation count under that issue in `run.json` `areas`.

| Issue | Label | Gated | Raw | Gated passage ids |
|---|---|---|---|---|
| A2 | Housing affordability | 5 | 5 | 64793730, ac298e61, 58894e24, d59cf21f, bc8da39f |
| A4 | Cost of living in Florida | 1 | 1 | 5d23996f |
| A6 | Public school funding and teachers | 4 | 5 | 801d9a3b, 5ee5807b, 01e6c8c2, d4eb0a9a |
| KYV10 | Career, vocational and higher education | 9 | 10 | e81806ef, 64bec9d3, 5ee5807b, d2afac2c, 95352436, 8f7dc898, e576c947, cd3bdb55, 627148a8 |
| B1 | Economy, inflation, and jobs | 7 | 9 | 64793730, f2e618c6, e81806ef, 64bec9d3, 5d23996f, b3c5fe3d, 29c4cb16 |
| B2 | Healthcare access and costs | 10 | 11 | 64793730, 4f8e8f6a, 8d951173, 28aed5ea, 8316896f, 3d68780a, 63a497d8, e489a9b5, 9097da70, ac298e61 |
| B3 | Immigration and border enforcement | 3 | 8 | 51834afd, 6f6d49a4, 4d1e4ae5 |
| B4 | Social Security and Medicare | 3 | 3 | 409d3bb3, c1be5d1c, 96b6b7fe |

Each of the other 17 issues has **0** passages, gated and raw: A1, A3, A5, KYV9, A7, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8. If any of them joins the spine, its Position is `coverage="no_stated_position_found"`. None of them has an entry in `areas`, so the run filled no gap.

Eight passages score over 0.85 on an issue but did not clear the gate, so `groupByArea` drops them:
- 3b6e5899 (KYV10)
- f5369170 and 33baf82e (B1)
- 1c01d411 (B2)
- c334ef90 (A6)
- 41ebff76, 7fea8606, 0130cb2d, b43802b0 and c097b47a (B3)

That is why every raw count is equal to or higher than its gated count. B3 shows the biggest gap: it had 5 gated in the one-gate attempt and has 3 now. The second gate removed `b43802b0` and `c097b47a` (see check 5).

The zeros cover only the 10 pages that were fetched. `/accountability` (policy 0.40), `/civility-unity` (0.36), `/blog`, two `/post/...` pages and `/event-list` fell below the 0.5 link threshold and were not read (`ingest-report.md`). This review makes no assumption about what those pages contain.

### 5. Possible misses (for the founder, not a fix)

These are marked `states_policy: false` but plainly state a commitment on a taxonomy issue:

- `b43802b0` (commitment 0.88, own 0.84, B3 0.95), `/immigration`, item "04": "Family-reunification policies that keep families together."
- `c097b47a` (commitment 0.89, own 0.81, B3 0.90), `/immigration`, item "05": "Fair, faster processing so people who follow the rules aren't punished for doing so."
- `0130cb2d` (commitment 0.80, own 0.70, B3 0.91), `/immigration`, item "02": "A pathway to citizenship for those who contribute to our society."
- `41ebff76` (commitment 0.76, own 0.50, B3 0.96), homepage card: "Drawing on 30 years working with immigrant families, Dr. Maxime believes we can have both security and compassion — borders …"

The first three are numbered items in the same "Solutions" list as the gated `6f6d49a4` (own 0.85) and `4d1e4ae5` (own 0.85). The list is introduced by "Dr. Maxime believes…". On the other issue pages the list is introduced by "Dr. Maxime will fight to…". The second gate is scoring the immigration list lower than those. Four of its five items sit at or below own 0.85, and two pass only because they land exactly on 0.85.

These borderline cases are not counted above:
- `3b6e5899` (commitment 0.89, own 0.83, KYV10 0.95), `/students`: "Every young person in District 20 deserves a real path forward — whether that path runs through a university, a …" It ends "Dr. Maxime will fight to:", so it is a lead-in whose list items (8f7dc898, e576c947, cd3bdb55, 627148a8) are gated.
- `7fea8606` (commitment 0.64, own 0.33, B3 0.85), `/immigration`: "Dr. Maxime believes we can have both security and compassion — and that we should stop pretending we have to …" This is also a lead-in.
- `47f87825` (commitment 0.95, own 0.82), `/small-business` item "05": "Level the playing field so small businesses aren't crushed by unfair competition from national players." It is a plain commitment, but no issue reaches 0.85 (B1 0.74), so any fit to a taxonomy issue is uncertain.
- `21e102ba` (commitment 0.35, own 0.41), `/lower-costs` item "02": "Open pathways to ownership, equity, and generational wealth — because the goal isn't just surviving the paycheck, it's building something …" It is a list item under a commitment lead-in. It has no issue near threshold (B1 0.35, A2 0.26).

These gated passages have no issue: e5093161, df556416, 67d3cd41, 16abb481, 955c9ad9, a404da12, 5cc2614b, 34b24f0d, 5ccefe88, f3c331df and f2a9f144. They are outside this check, but because the spine is undecided, they will become candidate-tier positions unless an issue is assigned. Examples are `f2a9f144`, student-debt relief (KYV10 0.67, A6 0.62), and `34b24f0d`, retirement savings (B4 0.33).

### Other notes

- `ingest-report.md` still describes the step 2 run of the previous attempt (`q-b2171346`, 51 gated, 38 with an issue). `run.json`, `run.log` and `run-report.txt` are the current run (`q-e7282116`, 46 gated, 35 with an issue). The corpus is the same, with 108 identical ids, so only the report's step 2 section is out of date.
- The Profiler constitution for this candidate uses "Senator Kedner Maxime says…" as its example attribution. Nothing in the passages supports that title. The site uses "Dr. Kedner Maxime", and his only prior race on the about page is the 2022 Oakland Park City Commission race (`6105c933`). Attribute to "Dr. Kedner Maxime" or "The campaign website".
- The numbered headings on `/immigration` run 01, 02, 04, 05, 05, 06, so no "03" was ingested. This is an ingest observation only. No claim is made about content that was not captured.

VERDICT: PASS
