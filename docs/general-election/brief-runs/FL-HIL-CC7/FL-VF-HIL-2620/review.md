# Step 3 review: FL-VF-HIL-2620 (Joshua Wostal), FL-HIL-CC7-general

Reviewed 2026-09-30 under the Profiler constitution. Read-only apart from this file. Nothing fetched from the web.

| Field | Value |
|---|---|
| Official site | https://www.joshuawostal.com/ |
| SPINE | undecided for this race: check 4 covers every taxonomy issue with a passage over the threshold, and check 5 considers every taxonomy issue |
| run.json | `kyv.policy-run/1`, status `complete`, created 2026-09-30T01:59:09Z, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85 |
| Counts (run.json) | 50 passages, 50 asked, 0 failed, 6 state a policy (both gates ≥ 0.85), 2 of those carry a taxonomy issue |
| Inputs | `passages.jsonl` (50 lines), `run.json`, `ingest.log`, plus `run.log`, `run-report.txt`, `links.jsonl`, `ingest-report.md` for cross-checking |

## Summary of the five checks

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 50 run.json passage URLs are on `www.joshuawostal.com`. No other host, no redirects. |
| 2 | Quotes verbatim | **PASS** | All 6 policy passages match byte for byte (`6380e500`, `eb265a67`, `82a61530`, `bb26eb61`, `ab9928dc`, `fa63e97e`). The same holds for all 50 passages and for both `areas` citations. |
| 3 | No inferred motive | **PASS** | None of the 6 policy passages is only biography, attack, fundraising or event copy. The weakest are `fa63e97e` and `6380e500` (notes below). |
| 4 | Silence recorded, not filled | **PASS** | A3: 5 passages clear the threshold, and 2 of them also pass the gate (`ab9928dc`, `fa63e97e`). Every other taxonomy issue has 0 passages and records `no_stated_position_found`. |
| 5 | Possible misses (information only) | **0 plain misses** | Borderline passages, none counted as a miss: `92d24dbd`, `c9ca2e38`, `84e0a6a7` (notes below). |

## Evidence

### 1. Candidate-controlled sources only: PASS

I checked this with a node script over `run.json` and `passages.jsonl`:

| URL | Passages (run.json = passages.jsonl) |
|---|---|
| https://www.joshuawostal.com/ | 7 |
| https://www.joshuawostal.com/infrastructure | 7 |
| https://www.joshuawostal.com/spending | 10 |
| https://www.joshuawostal.com/taxes | 7 |
| https://www.joshuawostal.com/the-boring-budget-guy | 9 |
| https://www.joshuawostal.com/about | 10 |

- Distinct hosts: `www.joshuawostal.com` only, in both files. This is the OFFICIAL_SITE host. No redirect was involved.
- The two files hold the same 50 ids. No id is in one file and missing from the other, and neither file has a duplicate.
- The 7 links Jev judged (`links.jsonl`) are all on the same host. `/get-involved` and `/vote` were not chosen.
- A note on `ingest.log`: it lists 9/12/9/12/10 passages for the five sub-pages and does not mention the homepage. `passages.jsonl` holds 7/7/10/7/9/10 including the homepage. The two do not conflict:
  - `scripts/candidate-site-ingest.ts` always extracts the homepage without logging it.
  - It logs each sub-page's count before `dedupeAcrossPages`.
  - 7 + 52 = 59 passages go in, and 50 remain after cross-page de-duplication.

### 2. Quotes verbatim: PASS

I compared `Buffer.from(text,'utf8')` for each id in `run.json` against the same id in `passages.jsonl`, using node. The script also compared url and heading.

| id | Bytes | Result |
|---|---|---|
| 6380e500 | 658 | IDENTICAL |
| eb265a67 | 259 | IDENTICAL |
| 82a61530 | 183 | IDENTICAL |
| bb26eb61 | 486 | IDENTICAL |
| ab9928dc | 341 | IDENTICAL |
| fa63e97e | 534 | IDENTICAL |

- All 50 run.json passages are identical to their passages.jsonl counterparts in text, url and heading.
- The two `areas[].subIssues[].citations[]` passages (`ab9928dc`, `fa63e97e`) are identical in text and `retrieved_at`.

### 3. No inferred motive: PASS

Each of the 6 passages marked `states_policy: true` contains a first-person commitment by the candidate:

| id | Page | commitment / own | Commitment found | First 20 words |
|---|---|---|---|---|
| 6380e500 | /infrastructure | 0.89 / 0.92 | "if elected to another term I will ensure we continue making progress" | "Another thing that has really concerned me is finding out that our sidewalk complaints from residents were 16 years behind. Residents" |
| eb265a67 | /spending | 0.97 / 0.92 | "I'm fighting to lower our spending" | "I'm fighting to put a stop to it. It doesn't always make me popular on the county board, but I" |
| 82a61530 | /spending | 0.97 / 0.95 | "I will stop this unsustainable wasteful spending" | "I'm running again for Hillsborough County Commissioner to continue bringing accountability and transparency to our county government. I will stop" |
| bb26eb61 | /spending | 0.98 / 0.98 | "I will further audit the county's spending … cut fat from the budget" | "With your support, I will continue to use my business experience and lean operations background to give taxpayers a voice" |
| ab9928dc | /taxes | 0.98 / 0.94 | "I'll continue to vote no" (on property tax increases) | "I have voted against 4 different property tax increase attempts , and I'll continue to vote no. Our county government" |
| fa63e97e | /the-boring-budget-guy | 0.97 / 0.86 | "I'm fighting for you … in an effort to stop the unsustainable wasteful spending" | "I'm fighting for you on the Hillsborough County Board. I am bringing accountability and transparency in an effort to stop" |

None of these is only biography, an attack on an opponent, a fundraising ask or event copy. Notes for whoever writes claims from them:

- **`fa63e97e` is the weakest.** Its commitment is in the present tense ("I'm fighting…", "I am bringing…", "I'm finding millions…") rather than a forward "I will". Most of the rest is his voting record ("I've voted against 4 different property tax increase attempts", "I developed a creative plan…").
  - The second gate is 0.86, just over 0.85.
  - The same content in the third person on /about (`cbac57a2`) was gated out (own 0.42).
  - A claim from this passage should say what the site states he is doing ("The campaign website states he is working to…"), not present it as a pledge.
- **`6380e500` is mostly constituent-service narrative.** Its one commitment is the final clause. That clause is about the sidewalk-complaint backlog, which is not a taxonomy issue.
- **`ab9928dc` criticises the county government, not a named opponent.** It says "Our county government has gotten into the habit of increasing taxes to fund their wasteful spending." Any claim from it must attribute that sentence to the site and must not restate it as fact or as the county's motive.
- **`bb26eb61` contains "put a stop to backroom deals".** Quote it with attribution. Do not paraphrase it into a statement about anyone's conduct.

### 4. Silence recorded, not filled: PASS

SPINE is undecided, so the table covers every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`) with at least one passage whose score clears the threshold. Threshold 0.85, compared as ≥, which matches `applyThreshold` in `src/lib/news-characterize.ts`.

| Issue | Label | Passages ≥ 0.85 | Of those, also pass the policy gate | Position |
|---|---|---|---|---|
| A3 | Property taxes | **5** (`bb4d1b79` 0.85, `09b1b3e1` 0.86, `ab9928dc` 0.98, `92d24dbd` 0.98, `fa63e97e` 0.98) | **2** (`ab9928dc`, `fa63e97e`) | stated position, 2 citations |

Every other taxonomy issue has **0** passages at or over 0.85. Each of them is `no_stated_position_found`: A1, A2, A4, A5, A6, A7, B1, B2, B3, B4, B5, B6, B7, B8, KYV1, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9, KYV10.

Consistency checks:

- `run.json.areas` holds exactly one area (insurance → A3), with exactly the two gated citations above.
- `bb4d1b79`, `09b1b3e1` and `92d24dbd` carry `issues: ["A3"]` but `states_policy: false`. They are correctly left out of `areas` and `counts.with_issue`, because `groupByArea` skips passages that did not pass the gate. By design (`readVerdict`), issue tags are recorded regardless of the gate.
- For all 50 passages I recomputed `states_policy` as (commitment ≥ 0.85 AND own_commitment ≥ 0.85) and `issues` as {scores ≥ 0.85}. Both match the stored values.
- The 4 policy passages with no taxonomy issue (`6380e500`, `eb265a67`, `82a61530`, `bb26eb61`) concern county spending, budget transparency and infrastructure backlog. The taxonomy has no issue for these subjects. Under the constitution they are candidate-tier material, not evidence for any taxonomy issue.

### 5. Possible misses: 0 plain misses (information for the founder)

I read all 44 passages marked `states_policy: false`. None of them plainly states a forward commitment by the candidate on a taxonomy issue. These are the closest, listed for information only and not counted as misses:

- **`92d24dbd`** (/taxes). A3 0.98, gate 0.97 / 0.70. First 20 words: "A prime example is our two millage tax approach. 1.1 million residents live outside of the city yet pay into". This is a past-tense record of a property-tax millage change he says he developed. It makes no forward commitment. The same record appears inside `fa63e97e`, which did pass, so A3 is not left without a citation.
- **`c9ca2e38`** (/spending). A3 0.70, gate 0.97 / 0.84. First 20 words: "One of the most mind-blowing streams of waste that I recently uncovered was about $235 million of our property tax". It narrowly misses the second gate. Its commitment ("we're not doing that anymore. We've put new policies in place…") is about oversight of county grants to non-government entities, which is not a taxonomy issue. At most it is candidate-tier material.
- **`84e0a6a7`** (/infrastructure). No issue above 0.09, gate 0.94 / 0.47. First 20 words: "I'm changing that. I've required all sales tax funds that are meant for infrastructure actually be spent on our roads,". This records road-funding actions. Roads and transportation are not a taxonomy issue.

The other passages are one of the following, with no commitment:

- Biography: the /about passages, `f64c2294`, `2b19d7db`, `17cb117a`.
- Descriptions of county taxes and spending: `bb4d1b79`, `09b1b3e1`, `2520a32f`, `e71efebc`, `996b0121`, `e472815e`.
- General argument without a pledge: `0e40b6d8`, `73b813e3`, `f3dbd42e`, `3849d714`.
- Campaign asks: `52a09edc`, `76935b3a`.

### Other observations (not part of the five checks)

- **The Step 2 section of `ingest-report.md` is out of date.** It reports provenance `q-b2171346`, 16 passages stating a policy, 5 with an issue, and 176751/22900 tokens. The current `run.json`, `run.log` and `run-report.txt` (the second-gate re-run of 2026-09-30T01:59Z) report `q-e7282116`, 6, 2 and 187151/23950. The earlier run appears to be the one kept in `attempt-1-one-gate/`. This review is of the current `run.json`. Updating the report is not in this reviewer's scope.
- `run-report.txt` prints the two A3 citations truncated with "…". That is display only. The full texts in `run.json` are byte-identical to `passages.jsonl` (check 2).

VERDICT: PASS
