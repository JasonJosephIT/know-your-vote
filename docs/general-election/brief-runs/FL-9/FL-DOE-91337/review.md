# Step 3 review: FL-DOE-91337 (Dan Green), FL-9-general

Reviewer: Step 3, working under the Profiler constitution. This review is read-only. It covers `run.json`, `passages.jsonl` and `ingest.log` in this directory, and it reads `ingest-report.md`, `links.jsonl`, `run-report.txt` and `run.log` for context. Nothing was fetched from the web.

Run under review: `run.json`, created 2026-09-30T01:58:45Z, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`. This is the two-gate run: it asks `q_states_policy` and `q_own_commitment`, and a passage states a policy only if it clears both. Of 21 passages read, 21 were asked and 0 failed. 5 state a policy, and 3 of those 5 match a taxonomy issue. The earlier one-gate run (`q-b2171346`) and its review are kept in `attempt-1-one-gate/`. This review does not cover them.

SPINE: not decided for this race. So check 4 reports every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7, 25 sub-issues) that has at least one passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 21 passages come from host `dangreenfl.com`: `/` 10, `/meet-dan` 10, `/on-the-issues` 1. There is no other host. |
| 2 | Quotes verbatim | **PASS** | All 5 `states_policy: true` passages (febdc5f2, c88d0824, f88d44f6, d1838a83, b8c84c52) are byte-identical to `passages.jsonl`. So are all 21 run passages and all 4 `areas` citations. |
| 3 | No inferred motive | **PASS** | Each of the 5 contains a commitment in the candidate's voice. c88d0824 is borderline and is explained below. |
| 4 | Silence recorded, not filled | **PASS** | Over threshold: B1 2, A4 1, A2 1, A1 1 (not gated), KYV3 1 (not gated). Gated: B1 2, A4 1, A2 1, and 0 for A1 and KYV3. The other 20 issues are 0. `areas` holds only A4, B1 and A2. |
| 5 | Possible misses (information only) | reported | db0b42b7 (A1) and e8eddc69 (KYV3). |

## Evidence

### Check 1: hosts

A node script parsed every `url` in `run.json` and `passages.jsonl`. The only host in either file is `dangreenfl.com`, which is the OFFICIAL_SITE host. No redirect was involved. The 5 links that Jev judged (`links.jsonl`) are also on `dangreenfl.com`.

| url | passages |
|---|---|
| https://dangreenfl.com/ | 10 |
| https://dangreenfl.com/meet-dan | 10 |
| https://dangreenfl.com/on-the-issues | 1 |

`ingest.log` prints "12 passage(s)" for `/meet-dan` and has no line for the homepage. The 12 is counted before `dedupeAcrossPages` (`scripts/candidate-site-ingest.ts:424`) removes text already seen on another page. The final total is 21 in the log, in `passages.jsonl` and in `run.json`.

**For the founder:** the only page chosen as a policy page, `/on-the-issues` (policy score 0.94), returned a 404. Its single passage, cb7f1f44, is "Oops! That page can't be found. / It looks like nothing was found at this location." The run correctly marks it as stating no policy. Every issue passage in this run comes from the homepage's issue blocks. If the campaign has an issues page at another URL, this run did not read it.

### Check 2: verbatim

A node script compared `Buffer.from(text, "utf8")` for each run passage against the `passages.jsonl` row with the same id. It also compared url and heading.

- `states_policy: true` passages: 5 checked (febdc5f2 460 bytes, c88d0824 244, f88d44f6 267, d1838a83 196, b8c84c52 217). There were 0 mismatches.
- All run passages: 21 checked, 0 mismatches in text, url or heading.
- No id appears in `run.json` without a row in `passages.jsonl`, and none the other way round. All 21 ids are unique.
- `areas` citations: A4 febdc5f2, B1 febdc5f2, B1 d1838a83 and A2 b8c84c52 are all identical to their `passages.jsonl` rows.

The script also recomputed the verdicts. For all 21 passages, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`. `issues` equals the set of scores at or above 0.85, in taxonomy order. Every passage has all 25 issue scores. There are 0 mismatches.

### Check 3: the 5 passages marked as stating a policy

| id | commitment / own | issues | The commitment in the text |
|---|---|---|---|
| febdc5f2 | 0.93 / 0.89 | A4, B1 | "In Congress, I will fight to make America affordable again" |
| c88d0824 | 0.85 / 0.86 | none | "Dan will work to safeguard our Constitutional rights on day one" |
| f88d44f6 | 0.96 / 0.95 | none | "Dan will work with President Trump to ensure our military remains funded and fit for action" |
| d1838a83 | 0.92 / 0.87 | B1 | "Dan Green and President Trump will do everything necessary to lower fuel costs, groceries, and the ever rising cost of living" |
| b8c84c52 | 0.92 / 0.90 | A2 | "Dan will use time-tested conservative values to lower housing costs and keep them low!" |

None of the 5 is only biography, an attack, fundraising or event copy. Three contain partisan framing about other people: "left-wing extremists" (febdc5f2), "progressive members of Congress don't share his commitment" (c88d0824) and "the bad policies of the Biden Administration" (d1838a83). Each of the three also carries its own commitment. A claim written from any of them must attribute that framing to the candidate ("the campaign website states…") and must not restate it as fact.

**Borderline: c88d0824** (homepage, "Follow the Constitution"). It sits at the gate, with commitment exactly 0.85. First 20 words: "As a member of the U.S. Navy Reserve, Dan has dedicated his life to serving our Constitution. Unfortunately, progressive members". The first two sentences are biography and criticism of opponents. The third is a first-person-attributed commitment, but a general one that names no right or measure. The passage passes because it does contain a commitment. It carries no taxonomy issue (the highest is KYV1 at 0.52), so it reaches no taxonomy Position and could only surface as a candidate-tier item. f88d44f6 (military funding) likewise has no taxonomy issue, because defense has no taxonomy question. It is a candidate-tier item, not a miss.

**Change from the one-gate run.** 86eb55ed (`/meet-dan`, an attributed quote about gridlock, debt and the budget) was gated in the earlier run. Here it clears the first gate (0.89) but fails `q_own_commitment` (0.68), so it now states no policy. It is the only passage that the second gate removed.

### Check 4: passages over the threshold (0.85), by taxonomy issue

"Raw" counts every passage whose issue score is 0.85 or higher. "Gated" counts the ones that also pass both `states_policy` gates. Only gated passages reach `areas`, and only gated passages can become Positions.

| Issue | Label | Raw | Gated | Passages |
|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | 2 | 2 | febdc5f2 (0.96, gated), d1838a83 (0.92, gated) |
| A4 | Cost of living in Florida | 1 | 1 | febdc5f2 (0.96, gated) |
| A2 | Housing affordability | 1 | 1 | b8c84c52 (0.96, gated) |
| A1 | Property insurance costs | 1 | **0** | db0b42b7 (0.94, not gated: commitment 0.78, own 0.79) |
| KYV3 | Growth, development and land conservation | 1 | **0** | e8eddc69 (0.94, not gated: commitment 0.84, own 0.59) |

A1 and KYV3 have 0 gated passages, so as the run stands both are `no_stated_position_found`.

No passage reaches 0.85 on any of the other 20 taxonomy issues, gated or not. Each of them is 0 and `no_stated_position_found`: A3, A5, A6, KYV9, KYV10, A7, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.

The run did not fill any silence. `areas` contains only A4, B1 and A2, and each is backed by gated passages. A1 and KYV3 are absent from `areas` and from `run-report.txt`.

### Check 5: possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but state a commitment on a taxonomy issue:

- **db0b42b7** (homepage, "Lower Property Insurance Rates"), A1 0.94. It fails the first gate at 0.78 and the second at 0.79. First 20 words: "Florida homeowners are feeling the impact of rising insurance rates. Dan Green stands with our homeowners and is ready to take". The passage states a position on property insurance ("stands with our homeowners and is ready to take their fight to Washington"). The commitment names no measure. The heading, "Lower Property Insurance Rates", is the campaign's own stated goal.
- **e8eddc69** (homepage, "Stop Over-development in Florida"), KYV3 0.94. It misses the first gate by 0.01 (0.84) and fails the second at 0.59. First 20 words: "While we welcome freedom-loving Americans to our great state, overdevelopment has started to push native Floridians out of their communities. Dan". The passage states a position on overdevelopment and a commitment ("Dan is here to find real solutions to overdevelopment in Florida"). The commitment names no measure. The low `q_own_commitment` score looks like the model reading "Dan is here to" as something other than a commitment by the candidate. This is the second gate's clearest miss on this site.

Considered and not listed: 86eb55ed and 30528d96 (constitutional government, gridlock, debt, the budget). Their highest issue scores are B1 0.63 and KYV1 0.65. They state views but no commitment on a taxonomy issue. 085ef795 ("Dan will continue to fight for the future of our country") names no issue. The remaining passages are biography, awards, or the 404 text.

### Other findings for the founder

- **`ingest-report.md` is stale in its "Step 2: policy run" table.** That table describes the earlier one-gate run: provenance `q-b2171346`, "State a policy 6", tokens 73844 in / 9618 out. The current `run.json`, `run-report.txt` and `run.log` show `q-e7282116`, 5 state a policy, 3 with an issue, and 78212 in / 10059 out. The ingest sections of `ingest-report.md` still match `ingest.log` and `passages.jsonl`. Only the Step 2 table needs updating. This review did not edit it.
- In `meta.tsv`, `policy_end` is 2026-09-29T19:18:23Z, which is the first policy run. `run.json` was created 2026-09-30T01:58:45Z. `meta.tsv` has no record of the re-run.

VERDICT: PASS
