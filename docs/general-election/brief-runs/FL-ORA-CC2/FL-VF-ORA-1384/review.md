# Step 3 review: FL-VF-ORA-1384 (Mike Crabb), FL-ORA-CC2-general

Reviewer, acting under the Profiler constitution. This is a read-only review of the machine run in this directory. No website was fetched. Every finding below comes from `passages.jsonl`, `run.json` and `ingest.log`. `links.jsonl`, `run-report.txt`, `ingest-report.md`, `src/lib/policy-run.ts`, `src/lib/policy-noul.ts` and `src/lib/news-issues.ts` were read for context only.

- Official site: https://ilikemikecrabb.com/
- Run under review: `run.json`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, 45 asked, 0 failed. The run uses the two-gate verdict: `states_policy` requires `commitment >= 0.85` AND `own_commitment >= 0.85` (`policy-noul.ts`).
- Counts: 45 passages, 9 `states_policy`, 4 of them with a taxonomy issue. `areas` holds 7 citations under B1, A2 and KYV3.
- Spine: not yet decided for this race. Check 4 reports every taxonomy issue (tax-7, 25 sub-issues) that has at least one passage over the threshold. Check 5 covers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (short) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 45 passage urls and all 7 `areas` citation urls are on host `ilikemikecrabb.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | A node script found that all 9 `states_policy` passages match `passages.jsonl` byte for byte on `text`, and also on `url` and `heading`. The 7 `areas` citations and all 45 passages match too. |
| 3 | No inferred motive | **PASS** | None of the 9 `states_policy` passages is only biography, an attack, fundraising or event copy. Each one contains a commitment by the candidate. |
| 4 | Silence recorded, not filled | **PASS** | 4 issues have a passage over the threshold: A2 = 3, B1 = 3, KYV3 = 3 by raw score (1 passes the gate), B7 = 1 by raw score (0 pass the gate). The other 21 issues have 0 (`no_stated_position_found`). The run never fills a silent issue. |
| 5 | Possible misses (information only) | **6 reported** | 11bdf44d (KYV3) and 23fc3df6 (B7) are the clearest. Also 78311d86 (B7), 4dbfb5b1 (KYV3), 2539921d (environment/conservation) and the borderline b806b53f. |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

Script output (node, run over `run.json`):

```
hosts { 'ilikemikecrabb.com': 45, 'areas:ilikemikecrabb.com': 7 }
```

- By page: `https://ilikemikecrabb.com/` has 25 passages, `/issues` has 11 and `/about` has 9. There are no redirects to document.
- `links.jsonl`: 6 same-host links were judged and 2 were chosen (`/issues` as policy, `/about` as about). `/admin`, `/vote`, `/get-involved` and `/district2-map` were not fetched.
- `ingest.log` gives 11 passages for `/about` and `passages.jsonl` has 9. That fits `dedupeAcrossPages` in `scripts/candidate-site-ingest.ts`, which runs after the per-page log line. The homepage has no per-page log line because the script does not print one for it. Neither is a source issue.
- Two homepage passages are in endorsers' words, although the candidate hosts them: c72c02e9 (Florida FOP, "…who will always back the badge") and ccd1dc82 (WOPA). Both are `states_policy=false` (c72c02e9 own_commitment 0.33, ccd1dc82 0.11), so no third-party voice reaches a citation.

### Check 2: quotes verbatim (PASS)

The script compared each `run.json` passage with the `passages.jsonl` row of the same id. It compared `text` as UTF-8 buffers with `Buffer.compare`, and compared `url` and `heading` with `===`:

```
sp deb833cb text= url= heading=
sp fd9848d3 text= url= heading=
sp 8207c3ac text= url= heading=
sp 6dd940c8 text= url= heading=
sp e6a6da9b text= url= heading=
sp d4c79a01 text= url= heading=
sp 1c7e9102 text= url= heading=
sp 746e2f4d text= url= heading=
sp c983c2a6 text= url= heading=
area B1 fd9848d3 / d4c79a01 / deb833cb   text= url= heading=
area A2 fd9848d3 / d4c79a01 / deb833cb   text= url= heading=
area KYV3 746e2f4d                       text= url= heading=
{ states_policy: 9, mismatches: 0, all45_mismatches: 0, run_ids: 45, src_ids: 45, runIdsNotInSrc: 0 }
```

### Check 3: no inferred motive (PASS)

Each of the 9 `states_policy` passages contains a commitment in the candidate's own voice. The first 20 words of each:

| id | page | first 20 words | commitment |
|---|---|---|---|
| deb833cb | / | Tackle housing costs, reduce taxes, and attract high-paying jobs. | A priority tile under "Economic Affordability" |
| fd9848d3 | /issues | Mike will work to tackle housing costs, reduce taxes, and attract high-paying jobs so families can afford to live, work, … | "will work to" |
| 8207c3ac | /issues | Mike supports faster implementation of technology to improve traffic flow, strengthen connectivity, and expand transportation options for residents. | "supports" |
| 6dd940c8 | /issues | As a deputy sheriff with decades of experience, Mike understands that safe communities are the foundation of a strong quality … | Opens with biography, then "He will support first responders and work to ensure public safety remains a top priority." |
| e6a6da9b | /issues | Mike will work to protect wildlife, preserve natural resources, and secure grants to convert aging septic systems that are leaking … | "will work to" |
| d4c79a01 | /issues | Mike Crabb works to make Northwest Orange County more affordable for families by tackling housing costs, reducing taxes, and attracting … | "works to" |
| 1c7e9102 | /issues | Mike Crabb supports reducing traffic congestion with better roads, smarter traffic technology, and more transportation options across District 2. | "supports" |
| 746e2f4d | /issues | Mike Crabb supports smart, responsible growth that protects existing neighborhoods and pays for the infrastructure it requires. | "supports" |
| c983c2a6 | /issues | Mike Crabb supports protecting the parks, wildlife, watershed, and natural places of District 2 for future generations. | "supports" |

No passage fails this check. Biography (a052beca, 8c0012f5, the `/about` bullets), endorsements (4fb6c80b, e0b9d5aa, ccd1dc82, c72c02e9, 1f756652, 5b78d5af), record items (d6ef6486, 188dd13d, f2cdf5f6, 593b9ca5, f1a692db), and vote/support copy (92c7f16b, 7715e0d5, 305f7ab0) are all `states_policy=false`.

### Check 4: silence recorded, not filled (PASS)

A script counted, for each of the 25 taxonomy issues, the passages with `scores[id] >= 0.85`. It then split each count by whether the passage also passes the `states_policy` gate. Only gated passages become citations in `areas`.

| issue | label | over threshold (raw score) | also pass the gate (cited) | passages |
|---|---|---|---|---|
| A2 | Housing affordability | 3 | 3 | deb833cb 0.93, fd9848d3 0.97, d4c79a01 0.96 |
| B1 | Economy, inflation, and jobs | 3 | 3 | deb833cb 0.89, fd9848d3 0.92, d4c79a01 0.90 |
| KYV3 | Growth, development and land conservation | 3 | 1 | 746e2f4d 0.96 (gate); 4dbfb5b1 0.92 and 11bdf44d 0.96 (fail own_commitment) |
| B7 | Crime policy, policing and courts | 1 | 0 | 23fc3df6 0.92 (fails own_commitment) |

B7 is **0 cited**, so the run records it as `no_stated_position_found`.

The other 21 issues have 0 passages over the threshold, so each one is `no_stated_position_found`: A1, A3, A4, A5, A6, KYV9, KYV10, A7, B2, B3, B4, B5, B6, KYV1, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.

`areas` has entries only for B1, A2 and KYV3, which matches the gated counts above. No zero-count issue has a citation.

### Check 5: possible misses (information for the founder, not a fix)

These passages are marked `states_policy=false`, yet each plainly states a commitment on a taxonomy issue. Scores come from `run.json`.

| id | page | first 20 words | issue score | commitment / own_commitment |
|---|---|---|---|---|
| 11bdf44d | /issues | Mike believes growth must be managed responsibly. Development should meet the needs of residents, protect existing neighborhoods, improve infrastructure, and … | KYV3 0.96 | 0.93 / 0.65 |
| 23fc3df6 | /issues | Mike Crabb supports law enforcement, crime prevention, and safe neighborhoods, drawing on 30 years as an Orange County deputy sheriff. | B7 0.92 | 0.92 / 0.67 |
| 78311d86 | / | Support first responders, prevent crime, keep families safe. | B7 0.79 | 0.85 / 0.75 |
| 4dbfb5b1 | / | Development that protects neighborhoods and pays for itself. | KYV3 0.92 | 0.73 / 0.47 |
| 2539921d | / | Protect wildlife, natural resources, and our watershed. | KYV3 0.63, B8 0.54 | 0.72 / 0.65 |
| b806b53f | /about | As Orange County Commissioner for District 2, Mike is focused on what matters most to local families: safe neighborhoods, affordable … | KYV3 0.84, A2 0.80 | 0.78 / 0.63 (borderline: a list of focus areas) |

Notes for the founder:

- 11bdf44d and 23fc3df6 are the clearest misses. Both are in the candidate's own voice ("Mike believes…", "Mike Crabb supports…") on the `/issues` page, and both clear the issue threshold. They fail only on `own_commitment`.
- 78311d86, 4dbfb5b1 and 2539921d are homepage priority tiles written the same way as deb833cb, which did pass the gate.
- **B7 (public safety).** The run records `no_stated_position_found`. On the site, 23fc3df6 (B7 0.92) fails the gate, and 6dd940c8 passes the gate but scores B7 at 0.83. No single passage has both, so the site's public-safety section cites nothing.
- **Gated passages with no taxonomy issue.** These are not misses under this check. 8207c3ac and 1c7e9102 are about traffic and transportation, and tax-7 has no sub-issue for that. e6a6da9b (septic-to-sewer and watershed) scores A5 0.83 and KYV3 0.65. c983c2a6 (parks and environment) scores KYV3 0.74.
- **Housekeeping.** The "Step 2" table in `ingest-report.md` still describes the earlier one-gate run: `q-b2171346`, 12 `states_policy` and 6 with an issue. That run is now in `attempt-1-one-gate/`. The current `run.json` is `q-e7282116`, with 9 `states_policy` and 4 with an issue.

VERDICT: PASS
