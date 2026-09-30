# Step 3 review: FL-DOE-91337 (Dan Green), FL-9-general

Reviewer: Step 3, under the Profiler constitution. This is a read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory, with `ingest-report.md`, `links.jsonl` and `run-report.txt` read for context. Nothing was fetched from the web.

Run under review: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`. 21 passages were read and 21 asked. 6 state a policy, 3 of those match an issue, and 0 failed.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7) that has a passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 21 passages are on `dangreenfl.com`: `/` 10, `/meet-dan` 10, `/on-the-issues` 1. No other host. |
| 2 | Quotes verbatim | **PASS** | All 6 `states_policy: true` passages (febdc5f2, c88d0824, f88d44f6, d1838a83, b8c84c52, 86eb55ed) are byte-identical to `passages.jsonl`, as are all 21 run passages, including url and heading. |
| 3 | No inferred motive | **PASS** | Each of the 6 contains a commitment or a stance in the candidate's voice. None is only biography, an attack, fundraising or event copy. Two borderline passages are noted below (86eb55ed, c88d0824). |
| 4 | Silence recorded, not filled | **PASS** | Gated counts: B1 2, A4 1, A2 1. A1 and KYV3 clear the issue threshold only on passages that fail the gate, so they are 0 gated. The other 20 issues are 0. Nothing was filled. |
| 5 | Possible misses (information only) | reported | db0b42b7 (A1) and e8eddc69 (KYV3) are below. |

## Evidence

### Check 1: hosts

A node script parsed every `url` in `run.json`. The only host is `dangreenfl.com`, which is the OFFICIAL_SITE host. No redirects were involved. The 5 links Jev judged (`links.jsonl`) are also all on `dangreenfl.com`.

| url | passages |
|---|---|
| https://dangreenfl.com/ | 10 |
| https://dangreenfl.com/meet-dan | 10 |
| https://dangreenfl.com/on-the-issues | 1 |

`ingest.log` says "12 passage(s) https://dangreenfl.com/meet-dan" and gives no line for the homepage. This is not a discrepancy. The per-page line is printed before `dedupeAcrossPages` (`src/lib/candidate-site.ts`), which drops text already seen on an earlier page. The final count is 21 in the log, in `passages.jsonl` and in `run.json`.

**For the founder:** the only page chosen as a policy page, `/on-the-issues` (policy 0.94), rendered a 404. Its single passage, cb7f1f44, reads "Oops! That page can't be found. / It looks like nothing was found at this location." It was correctly marked as stating no policy (commitment 0.02). Every issue passage in this run comes from the homepage's issue blocks, not from a dedicated issues page. If the campaign has an issues page at another URL, this run did not read it. The first attempt (`attempt-1-failed/`) failed on near-empty rendering, and this run is the founder-rule re-run.

### Check 2: verbatim

A node script compared `Buffer.from(text, "utf8")` for each run passage against the `passages.jsonl` row with the same id. It also compared url and heading.

- `states_policy: true` passages: 6 checked, 0 mismatches (text, url and heading all equal).
- All run passages: 21 checked, 0 mismatches.
- Ids in `run.json` but not in `passages.jsonl`: none. The reverse: none. Duplicate ids: none (21 unique).

Every citation in `run.json` `areas` (A4 febdc5f2, B1 febdc5f2, B1 d1838a83, A2 b8c84c52) is byte-identical to its `passages.jsonl` row.

### Check 3: the 6 passages marked as stating a policy

febdc5f2, c88d0824, f88d44f6, d1838a83, b8c84c52, 86eb55ed.

For every passage, `states_policy` equals `commitment >= 0.85`, and `issues` equals the set of scores at or above 0.85. The gate and the issue threshold are applied consistently.

Several of these passages contain partisan framing or criticism: "left-wing extremists" (febdc5f2), "progressive members of Congress" (c88d0824), "the bad policies of the Biden Administration" (d1838a83). Each one also carries an explicit commitment ("In Congress, I will fight to make America affordable again", "Dan will work to safeguard our Constitutional rights on day one", "will do everything necessary to lower fuel costs, groceries…"), so none is only an attack. Any claim written from them must attribute the framing to the candidate and must not restate it as fact.

Two are borderline. Both passed:

- **86eb55ed** (`/meet-dan`, commitment 0.88, no issue tag). First 20 words: "“Floridians deserve proven leaders in Washington who will stand with President Trump to protect our constitutional government and ensure access". The passage has no first-person "I will" or "Dan will". It is a quoted stance, attributed "– Dan Green", on congressional gridlock, debt and the budget ("It's been 30 years since they last passed a budget, making it impossible to control spending"). That is a stance, not biography, fundraising or event copy, so it is not listed as a failure. Two notes:
  - The homepage passage 30528d96 opens with nearly the same sentence and was gated out at 0.63. The model is inconsistent on this framing.
  - The budget sentence is a factual assertion by the campaign. Under the constitution it may only be written as "Dan Green says…" and must never be verified or restated as fact.
  It carries no taxonomy issue (B1 0.62, KYV1 0.53), so it reaches no taxonomy Position. It could only surface as a candidate-tier item.
- **c88d0824** (homepage, "Follow the Constitution", commitment 0.85, exactly at the gate, no issue tag). First 20 words: "As a member of the U.S. Navy Reserve, Dan has dedicated his life to serving our Constitution. Unfortunately, progressive members". The passage is mostly biography and criticism, but it ends with a commitment ("Dan will work to safeguard our Constitutional rights on day one"), so it passes. That commitment is general and names no specific right or measure. It carries no taxonomy issue (KYV1 0.51).

The other two gated passages that carry no taxonomy issue are f88d44f6 (military funding: "Dan will work with President Trump to ensure our military remains funded and fit for action") and 86eb55ed. Defense has no taxonomy question, so f88d44f6 is a candidate-tier item, not a miss.

### Check 4: passages over the threshold (0.85), by taxonomy issue

"Gated" means the passage also passes the `states_policy` gate. Only gated passages reach `areas` and Positions. "Raw" counts any issue score of 0.85 or more.

| Issue | Label | Gated | Gated passage ids | Raw | Raw only (not gated) |
|---|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 2 | febdc5f2 (0.95), d1838a83 (0.92) | 2 | none |
| A4 | Cost of living in Florida | 1 | febdc5f2 (0.96) | 1 | none |
| A2 | Housing affordability | 1 | b8c84c52 (0.96) | 1 | none |
| A1 | Property insurance costs | **0** | none (`no_stated_position_found` as the run stands) | 1 | db0b42b7 (0.93, gate 0.74) |
| KYV3 | Growth, development and land conservation | **0** | none (`no_stated_position_found` as the run stands) | 1 | e8eddc69 (0.93, gate 0.84) |

Every other taxonomy issue has 0 passages over the threshold, raw or gated, and is recorded as `no_stated_position_found`: A3, A5, A6, KYV9, KYV10, A7, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.

The run did not fill silence. `areas` contains only A4, B1 and A2, each backed by gated passages. A1 and KYV3 do not appear in `areas`.

### Check 5: possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that state a commitment on a taxonomy issue:

- **db0b42b7** (homepage, "Lower Property Insurance Rates"; commitment 0.74; A1 0.93). First 20 words: "Florida homeowners are feeling the impact of rising insurance rates. Dan Green stands with our homeowners and is ready to". It continues "…take their fight to Washington. Together we can make Florida affordable again." The heading and body take a stated side on property insurance costs, though without a specific measure. If it were gated in, A1 would move from 0 to 1.
- **e8eddc69** (homepage, "Stop Over-development in Florida"; commitment 0.84, 0.01 under the gate; KYV3 0.93). First 20 words: "While we welcome freedom-loving Americans to our great state, overdevelopment has started to push native Floridians out of their communities." It continues "Dan is here to find real solutions to overdevelopment in Florida to protect our way of life." That is a commitment on growth and development, though no solution is named. If it were gated in, KYV3 would move from 0 to 1.

Considered and not listed:
- 30528d96 (homepage "On the Issues", KYV1 0.63) is a general stance with no taxonomy issue.
- 085ef795 (`/meet-dan`, "Dan will continue to fight for the future of our country") has no issue.
- The remaining passages are biography, awards or the 404 page.

VERDICT: PASS
