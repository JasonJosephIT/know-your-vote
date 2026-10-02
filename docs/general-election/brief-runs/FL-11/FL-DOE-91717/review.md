# Step 3 review: FL-DOE-91717 (Joe Strada), FL-11-general

Reviewed 2026-09-30, read-only, against the Profiler constitution. No website was fetched and nothing was committed.

Inputs: `passages.jsonl` (30 passages), `run.json` (`kyv.policy-run/1`, status `complete`, model `jev-1.13.0`, taxonomy 7, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, 30 asked, 0 failed, `states_policy: 3`, `with_issue: 0`, `areas: []`), `ingest.log`. Checks 1, 2 and 4 were done with a node script over the two files. It compares text with `Buffer.equals`, and it recomputes both gates and the per-issue `>=` threshold from the stored scores.

SPINE: undecided for this race. Checks 4 and 5 cover all 25 taxonomy sub-issues in `src/lib/news-issues.ts` (TAXONOMY_VERSION 7). These are the 25 issue questions in `run.json.question_ids`, after the two gates `q_states_policy` and `q_own_commitment`.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 30 run.json urls are on `votestrada.com` (12 at `/`, 4 at `/priorities`, 14 at `/meet-joe`). There is no other host. |
| 2 | Quotes verbatim | PASS | The 3 passages that state a policy (f348335c, 7630aea9, 61f35693) are byte-identical to passages.jsonl. The other 27 are identical too, and so are url and heading. |
| 3 | No inferred motive | PASS | f348335c, 7630aea9 and 61f35693 each contain "Joe supports …", which is a commitment. None of them is only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | KYV10 has 2 passages over the threshold (dd47499b, 6f585f88), and the gate excludes both. Every other issue has 0. `areas` is `[]`, so all 25 issues are no_stated_position_found. |
| 5 | Possible misses (for the founder) | reported | One possible miss: 6f585f88 (KYV10). |

## Evidence

### 1. Candidate-controlled sources only: PASS

`run.json.passages[].url` has one host, `votestrada.com`, for all 30 passages. `passages.jsonl` also has only that host, with the same 30 ids in the same order. `ingest.log` shows the crawl stayed on the site. Jev judged 3 of the 37 homepage links: it chose `/priorities` as the policy page and `/meet-joe` as the about page. It judged `/endorsements` (policy 0.05) and did not fetch it (`links.jsonl`). The log has no redirect lines, and no redirect was needed.

### 2. Quotes verbatim: PASS

For each run.json passage, the script compared `Buffer.from(text, "utf8")` with the passages.jsonl row that has the same id. It also compared url and heading.

| id | states_policy | bytes | identical to passages.jsonl |
|---|---|---|---|
| f348335c | true | 381 | yes |
| 7630aea9 | true | 292 | yes |
| 61f35693 | true | 444 | yes |

The other 27 passages (`states_policy: false`) are byte-identical too. Neither file has an id the other lacks.

Gate consistency: for all 30 passages, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, which is the rule in `readVerdict` in `src/lib/policy-noul.ts`. For every passage, `issues` is exactly the set of scores `>= 0.85`.

### 3. No inferred motive: PASS

These are the passages marked `states_policy: true`, with their first 20 words:

- f348335c (commitment 0.98, own 0.96): "1 Congress Is Not a Stock Exchange Investigate Congressional Insider Trading When members of Congress make suspiciously well-timed trades, the". It continues: "Joe supports serious investigations into potential congressional insider trading and real accountability…" This is a commitment.
- 7630aea9 (0.98 / 0.96): "2 Congress Is Not a Retirement Plan Enact Term Limits Joe supports firm congressional term limits so new leaders can". This is a commitment.
- 61f35693 (0.98 / 0.97): "3 Congress: Put Away the Credit Card Balanced Budget Central Florida families cannot spend without limits, ignore the bill, and". It continues: "Joe supports a balanced budget amendment requiring Washington to live within its means…" This is a commitment.

None of these is only biography, attack, fundraising or event copy. The line "Washington has become far too comfortable serving itself" in 80d4f684 is the kind of framing the gate should exclude, and the gate did exclude it: own_commitment was 0.82, below 0.85. It is not marked as stating a policy.

For the founder: none of the 3 matched a taxonomy issue (`with_issue: 0`). `run.log` says "3 state a policy the taxonomy has no question for". Their highest issue scores are KYV1 0.78 (f348335c), KYV1 0.30 (7630aea9) and B1 0.55 (61f35693), all below 0.85. The constitution puts them under candidate-tier issues (congressional insider trading, term limits, balanced budget amendment), not under a spine issue.

### 4. Silence recorded, not filled: PASS

This check counts a passage for an issue when its score for that issue is at least 0.85 (`applyThreshold`, `>=`), whether or not the passage passed the commitment gates.

| Issue | Passages ≥ 0.85 | Ids (score) | Also clear both gates | Run outcome |
|---|---|---|---|---|
| KYV10 Career, vocational and higher education | 2 | dd47499b (0.96), 6f585f88 (0.92) | 0 (dd47499b: commitment 0.46, own 0.18; 6f585f88: 0.78 / 0.54) | no_stated_position_found |
| A1, A2, A3, A4, A5, A6, KYV9, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 | 0 each | none | 0 | no_stated_position_found |

The highest score below the threshold was B1 0.82 (7c01e73f). It is not counted. `areas` is `[]`, and `run-report.txt` says "No passage cleared both the commitment gate and an issue question." No issue was given a position.

Coverage limit, stated as a fact about the run: ece85b92 on `/priorities` reads "Click any priority to read where Joe stands." under the heading "Additional priorities". The ingest chose 1 policy page (cap 8), and the corpus has no per-priority subpages. So these zeros mean nothing was found on the 3 ingested pages. They do not show that the site is silent on these issues.

### 5. Possible misses on taxonomy issues (information only)

These are passages the run marks `states_policy: false` that plainly state a commitment on a taxonomy issue:

- 6f585f88 (KYV10 0.92, commitment 0.78, own 0.54): "That experience is why workforce development, apprenticeships, and career and technical education are central to his campaign. He has watched". It states that KYV10 subjects are central to the campaign. It names no specific policy.

I considered these and did not list them, because they are belief, biography, general focus or campaign copy, with no commitment:

- dd47499b (KYV10 0.96): a stated belief ("a four-year degree should not be the only respected path to a good life"), followed by business biography.
- 80d4f684 (commitment 0.93, own 0.82; KYV1 0.48): "Joe's plan begins with three commonsense reforms…" This introduces the three reforms that the run already captures in f348335c, 7630aea9 and 61f35693. It is not on a taxonomy issue.
- caae2fa0 ("focused on affordability, opportunity, accountability…"), fee08648 and 7c01e73f ("practical experience, fiscal discipline, and a focus on Central Florida"), and 6fc0e81e ("not buried under debt") are general themes or motivation.
- af5c0627 is a slogan, 11f20a59 is fundraising copy, and ceece3e5, 9aebc0e9, 1064dccc, 43a559d1 and 2d565be1 are election-date or signup copy.

### Notes for the founder (not checks)

- `ingest-report.md` is out of date for Step 2. It gives provenance `q-b2171346`, "State a policy … 4", and tokens 105438 / 13740. The `run.json` reviewed here has `q-e7282116`, 3 policy-stating passages and tokens 111678 / 14370, which matches `run.log` and `run-report.txt`. The report describes the earlier run in `attempt-1-one-gate/`, where 80d4f684 passed the single gate.
- `ingest.log` says "5 passage(s) https://votestrada.com/priorities", but passages.jsonl holds 4 passages from that url. 80d4f684 has the `/priorities` heading and the homepage url, which fits deduplication against the homepage, but the log does not say so.

VERDICT: PASS
