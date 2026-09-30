# Step 3 review: FL-DOE-89339 (Darren Soto), FL-9-general

Reviewed files: `passages.jsonl` (15 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, 15 asked, 0 failed, created 2026-09-30T01:58:42Z; two gates: `q_states_policy` and `q_own_commitment`, both must be ≥ 0.85), `ingest.log`. Official site: https://www.darrensoto.com/. Spine: undecided, so check 4 covers every taxonomy issue (tax-7, 25 issues) and check 5 considers every taxonomy issue.

Checks 1, 2 and 4 were run with a `node` script over `run.json` and `passages.jsonl`. Checks 3 and 5 are reading judgments, with the evidence given below.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 15 `passages[].url` and all 8 `areas[]` citation urls are on `www.darrensoto.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | All 5 `states_policy: true` passages (e4849f19, 735f07ca, 16695c81, 5a5199ba, b312e31b) and all 8 area citations are byte-identical (`Buffer.equals`) to the passage with the same id in `passages.jsonl`, and their urls match. Both files hold the same 15 ids in the same order. |
| 3 | No inferred motive | **FAIL** | 4 of the 5 `states_policy: true` passages carry no commitment by the candidate: 735f07ca, 16695c81, 5a5199ba, b312e31b are items of a list about federal funding already brought to the district. Two of them are cited in `areas`: 735f07ca (B1) and 5a5199ba (A2, B2). |
| 4 | Silence recorded, not filled | **PASS** | 6 issues have passages over the threshold (A2, A4, B1, B2, B4, B8). The other 19 have 0 and are `no_stated_position_found`. `areas` lists only issues with citations. Nothing is filled in for an issue with none. |
| 5 | Possible misses (information only) | **PASS** (none found) | None of the 10 `states_policy: false` passages plainly states a commitment on a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources

Host tally from the script: `{"www.darrensoto.com": 23}` (15 passage rows plus 8 area citations). All 15 passages come from the homepage `https://www.darrensoto.com/`. `ingest.log` shows that the one policy page Jev chose, `https://www.darrensoto.com/issues`, gave **0 passages**, so no page other than the homepage contributed text.

### 2. Quotes verbatim

Script output for each passage the run marks as stating a policy:

```
sp e4849f19 IDENTICAL
sp 735f07ca IDENTICAL
sp 16695c81 IDENTICAL
sp 5a5199ba IDENTICAL
sp b312e31b IDENTICAL
```

Area citations: A4 e4849f19, B1 735f07ca, B1 e4849f19, B2 e4849f19, B2 5a5199ba, A2 5a5199ba, A2 e4849f19, B4 e4849f19: all IDENTICAL. No id is present in only one of the two files.

### 3. Passages marked as stating a policy that make no commitment

The two files list passages in the same order, which is document order. Every passage from c5cc59f8 through b312e31b sits under the heading "Meet Darren Soto". c5cc59f8 ends in a colon: "During his nearly 10 years in the House, he has brought billions of dollars back in federal funding to the district to:". The next four one-line passages are the items of that list. They describe what past funding paid for. That is record and biography, with no stated commitment. Out of context they read as imperatives. Both gates scored them as commitments, and the second gate (`own_commitment`) did not catch them.

| id | commitment / own_commitment | issues cited in `areas` | Kind | First 20 words |
|---|---|---|---|---|
| 735f07ca | 0.89 / 0.86 | B1 | Record: item in the "brought billions of dollars … to:" list | "Boost high-paying jobs at Lake Nona, NeoCity, University of Central Florida Research Park, and NASA/commercial space" |
| 16695c81 | 0.91 / 0.89 | none | Record: same list | "Expand I-4, Orlando International Airport, SunRail, and Kissimmee Gateway Airport" |
| 5a5199ba | 0.93 / 0.88 | A2, B2 | Record: same list | "Make food, healthcare, and housing more affordable" |
| b312e31b | 0.91 / 0.85 (exactly the gate) | none | Record: same list | "Restore the Kissimmee Chain of Lakes, Lake Conway, and the Indian River Lagoon" |

The one `states_policy: true` passage that carries a first-person campaign commitment is **e4849f19** ("We must stop tariffs … Stop Medicaid and ACA cuts … Protect Social Security and Medicare. And fight rampant corruption in Washington."). It sits under the heading "I’m running for re-election on the three C’s".

Compared with the earlier one-gate attempt (`attempt-1-one-gate/`), the second gate removed 8dd9de40 (vote ask, own_commitment 0.81) and 2d859ca5 (committee service, own_commitment 0.68). It did not remove the four funding-list items.

### 4. Per-issue counts (threshold 0.85)

A passage counts when its `verdict.scores` value for the issue is ≥ 0.85 in `run.json`. "Cited" means the passage also has `states_policy: true` and so appears in `areas`. The last column counts cited passages that check 3 does not flag.

| Issue | Label | Passages ≥ 0.85 | Cited in `areas` | Cited and not flagged in check 3 |
|---|---|---|---|---|
| A2 | Housing affordability | 2 (e4849f19, 5a5199ba) | 2 | 1 (e4849f19) |
| A4 | Cost of living in Florida | 1 (e4849f19) | 1 | 1 (e4849f19) |
| B1 | Economy, inflation, and jobs | 4 (e4849f19, 3b47215a, 2d859ca5, 735f07ca) | 2 (e4849f19, 735f07ca) | 1 (e4849f19) |
| B2 | Healthcare access and costs | 3 (e4849f19, 2d859ca5, 5a5199ba) | 2 (e4849f19, 5a5199ba) | 1 (e4849f19) |
| B4 | Social Security and Medicare | 1 (e4849f19) | 1 | 1 (e4849f19) |
| B8 | Climate and environment (national) | 2 (2d859ca5, 02994461) | 0 (both `states_policy: false`) | 0 |

Every other taxonomy issue has **0** passages over the threshold, so each is recorded as `no_stated_position_found`: A1, A3, A5, A6, KYV9, KYV10, A7, B3, B5, B6, KYV1, B7, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

B8 has 2 passages over the issue threshold, but neither passes the commitment gates, so B8 has no citation in `areas`.

Context from `ingest.log` (this is not a coverage claim): the corpus is only the homepage, because `/issues` gave 0 passages. The zeros describe this corpus. Whether the rest of the site is silent on these issues is a separate question.

### 5. Possible misses

These 10 passages are `states_policy: false`: 848d75fb, 8dd9de40, 287a1da5, 0c5a367a, 3b47215a, 2d859ca5, c5cc59f8, 02994461, 68c41f37, cad07633. None of them plainly states a commitment on a taxonomy issue:

- 848d75fb ("Florida's families deserve a leader who champions bold solutions in the face of tough challenges.") is a slogan and names no issue.
- 8dd9de40 ("I’m fighting for you and your family, and I ask for your vote this November.") is a vote ask and names no issue.
- 287a1da5, 0c5a367a and cad07633 are biography (election, background, education).
- c5cc59f8 is the lead-in to the funding list.
- 2d859ca5 ("In Congress, he serves on the powerful Energy and Commerce Committee and the Natural Resources Committee, where he fights to") is a third-person account of committee service in the bio section. It is written in the present tense but commits to nothing for the coming term. It clears the issue threshold for B1, B2 and B8, and the second gate kept it out of `areas`. It is listed here so the founder can rule on it. It is not counted as a miss.
- 3b47215a ("He served for five and a half years in the Florida House of Representatives before he was elected to the"), 02994461 ("Darren has also passed major legislation in Congress to protect the Kissimmee River and Great Florida Reef, improve commercial spaceflight,") and 68c41f37 ("On the Energy and Commerce Committee, Darren worked directly on the American Rescue Plan, Bipartisan Infrastructure Law, CHIPS and Science") are legislative record, not commitments.

No misses to report.

### Notes for the founder (not checks)

- `ingest-report.md` is stale for Step 2. Its policy-run table gives provenance `q-b2171346`, 7 passages stating a policy and 4 with an issue. Those numbers are from the one-gate attempt now in `attempt-1-one-gate/`. The current `run.json` and `run.log` give `q-e7282116`, 5 stating a policy and 3 with an issue.
- `run.log` reports "2 state a policy the taxonomy has no question for": 16695c81 and b312e31b. Both are funding-list items flagged in check 3.

VERDICT: FAIL (check 3)
