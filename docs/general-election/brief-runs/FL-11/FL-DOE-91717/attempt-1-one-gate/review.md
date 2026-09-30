# Step 3 review: FL-DOE-91717 (Joe Strada), FL-11-general

Reviewed 2026-09-29, read-only, against the Profiler constitution. Inputs: `passages.jsonl` (30 passages), `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 30 asked, 0 failed), `ingest.log`. No website was fetched.

SPINE: undecided for this race, so checks 4 and 5 cover all 25 taxonomy sub-issues in `src/lib/news-issues.ts` (TAXONOMY_VERSION 7), which are the 25 issue questions in `run.json.question_ids`.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 30 passage urls in run.json are on `votestrada.com` (12 `/`, 4 `/priorities`, 14 `/meet-joe`). No other host. |
| 2 | Quotes verbatim | PASS | The 4 policy-stating passages (80d4f684, f348335c, 7630aea9, 61f35693) are byte-identical to passages.jsonl, and so are the other 26. url and heading match too. |
| 3 | No inferred motive | PASS | All 4 policy-stating passages contain a commitment by the candidate. 80d4f684 is a borderline case (see below). |
| 4 | Silence recorded, not filled | PASS | KYV10: 2 passages over the threshold (dd47499b, 6f585f88), both gated out. Every other issue: 0. `areas` is `[]`, so no issue was filled. |
| 5 | Possible misses (for the founder) | reported | 1 possible miss: 6f585f88 (KYV10). |

## Evidence

### 1. Candidate-controlled sources only: PASS

Script over `run.json.passages[].url`: one host, `votestrada.com`, 30 of 30. `passages.jsonl` also has only that host. `ingest.log` shows the crawl stayed on the site: `/priorities` was picked as the policy page, `/meet-joe` as the about page, and `/endorsements` was judged (policy 0.05) but not fetched (`links.jsonl`). The ingest log has no redirect lines, and none were needed.

### 2. Quotes verbatim: PASS

Checked with node by comparing `Buffer.from(text, "utf8").equals(...)` for each run.json passage against the passages.jsonl row with the same id:

| id | states_policy | bytes (run / jsonl) | identical |
|---|---|---|---|
| 80d4f684 | true | 207 / 207 | yes |
| f348335c | true | 381 / 381 | yes |
| 7630aea9 | true | 292 / 292 | yes |
| 61f35693 | true | 444 / 444 | yes |

The other 26 passages are identical too. The two files have the same 30 ids and no extras on either side.

### 3. No inferred motive: PASS

None of the 4 passages marked `states_policy: true` is only biography, an attack on an opponent, fundraising or event copy:

- f348335c (commitment 0.98): "1 Congress Is Not a Stock Exchange Investigate Congressional Insider Trading When members of Congress make suspiciously well-timed trades, the American people deserve answers." It goes on: "Joe supports serious investigations into potential congressional insider trading…" This is a commitment.
- 7630aea9 (0.98): "2 Congress Is Not a Retirement Plan Enact Term Limits Joe supports firm congressional term limits so new leaders can rise, new ideas can be heard,…" This is a commitment.
- 61f35693 (0.98): "3 Congress: Put Away the Credit Card Balanced Budget Central Florida families cannot spend without limits, ignore the bill, and leave the balance…" It goes on: "Joe supports a balanced budget amendment…" This is a commitment.
- 80d4f684 (0.93), a borderline pass: "Washington has become far too comfortable serving itself. Joe's plan begins with three commonsense reforms to make Congress less profitable, less permanent, and finally…" This is homepage teaser copy. Its first sentence is general rhetoric about Washington, not an attack on a named opponent. The second sentence commits to a stated plan (making Congress "less profitable, less permanent, and … accountable"), so it is not motive-only copy. A claim written from this passage should attribute the words to the candidate and not add the details of the three reforms, which are in f348335c, 7630aea9 and 61f35693.

For the founder: none of the 4 matched a taxonomy issue (`with_issue: 0`). The run log reads "4 state a policy the taxonomy has no question for". Their highest scores are KYV1 0.80 (f348335c), KYV1 0.48 (80d4f684), B1 0.54 (61f35693) and KYV1 0.29 (7630aea9), all below 0.85. Under the constitution these belong under candidate-tier issues (congressional stock trading, term limits, balanced budget amendment) and not under a spine issue.

### 4. Silence recorded, not filled: PASS

A passage counts for an issue when its score for that issue is at least 0.85 (`applyThreshold` uses `>=`), whatever its commitment gate says:

| Issue | Passages ≥ 0.85 | Ids | Run outcome |
|---|---|---|---|
| KYV10 Career, vocational and higher education | 2 | dd47499b (0.96), 6f585f88 (0.94) | Both have `states_policy: false` (commitment 0.46 and 0.80), so neither is in `areas`: no_stated_position_found |
| A1, A2, A3, A4, A5, A6, A7, B1, B2, B3, B4, B5, B6, B7, B8, KYV1, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9 | 0 each | none | no_stated_position_found |

`areas` is `[]` and `run-report.txt` states "No passage cleared both the commitment gate and an issue question." No issue got a position that the passages don't support.

Coverage limit, stated as a fact about the run and not as a guess about content: ece85b92 on `/priorities` reads "Additional priorities / Click any priority to read where Joe stands." The ingest chose 1 policy page (cap 8), and no per-priority subpages are in the corpus. So these silences mean nothing was found on the 3 ingested pages. They do not show that the site is silent. Also, `ingest.log` reports "5 passage(s) https://votestrada.com/priorities", but passages.jsonl and run.json hold 4 passages from that url (ingest-report.md also says 4). The reason is not recorded here.

### 5. Possible misses on taxonomy issues (information only)

Passages the run marks `states_policy: false` that plainly state a commitment on a taxonomy issue:

- 6f585f88 (KYV10 0.94, commitment 0.80, just under the gate): "That experience is why workforce development, apprenticeships, and career and technical education are central to his campaign. He has watched training change…" It states that KYV10 subjects are campaign priorities. It names no specific policy.

Considered and not listed, because they are belief, biography or general focus statements and not commitments:

- dd47499b (KYV10 0.96, commitment 0.46) is a stated belief ("a four-year degree should not be the only respected path") followed by business biography.
- caae2fa0 ("focused on affordability, opportunity, accountability…"), fee08648 and 7c01e73f ("practical experience, fiscal discipline, and a focus on Central Florida") and 6fc0e81e ("not buried under debt") are general themes or motivation.
- af5c0627 is a slogan.
- 11f20a59 is fundraising copy.

VERDICT: PASS
