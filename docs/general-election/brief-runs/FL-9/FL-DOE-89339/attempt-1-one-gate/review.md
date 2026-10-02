# Step 3 review: FL-DOE-89339 (Darren Soto), FL-9-general

Reviewed files: `passages.jsonl` (15 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 15 asked, 0 failed), `ingest.log`. Official site: https://www.darrensoto.com/. Spine: undecided, so check 4 covers every taxonomy issue (tax-7, 25 issues) and check 5 considers every taxonomy issue.

Checks 1, 2 and 4 were run with a `node` script over `run.json` and `passages.jsonl`. Checks 3 and 5 are reading judgments, and the evidence for each is given below.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 15 `passages[].url` and all 11 `areas[]` citation urls are on `www.darrensoto.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | All 7 `states_policy: true` passages (e4849f19, 8dd9de40, 2d859ca5, 735f07ca, 16695c81, 5a5199ba, b312e31b) and all 11 area citations are byte-identical (`Buffer.equals`) to the passage with the same id in `passages.jsonl`, and their urls match too. Both files hold the same 15 ids. |
| 3 | No inferred motive | **FAIL** | 6 of the 7 `states_policy: true` passages carry no commitment by the candidate. 8dd9de40 is a vote ask. 735f07ca, 16695c81, 5a5199ba and b312e31b are list items that finish a sentence about past federal funding. 2d859ca5 describes committee service. Three of them are cited in `areas`: 735f07ca (B1), 5a5199ba (A2, B2) and 2d859ca5 (B1, B2, B8). |
| 4 | Silence recorded, not filled | **PASS** | 6 issues have passages over the threshold (A2, A4, B1, B2, B4, B8). The other 19 have 0 and are `no_stated_position_found`. `areas` lists only issues that have citations. Nothing is filled in for an issue with none. |
| 5 | Possible misses (information only) | **PASS** (none found) | None of the 8 `states_policy: false` passages states a commitment on any taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources

Host tally from the script: `{"www.darrensoto.com": 26}` (15 passage rows plus 11 area citations). All 15 passages come from the homepage `https://www.darrensoto.com/`. `ingest.log` shows that the only policy page Jev chose, `https://www.darrensoto.com/issues`, returned **0 passages**. No page other than the homepage contributed text.

### 2. Quotes verbatim

Script output, one line for each passage the run marks as stating a policy:

```
e4849f19 IDENTICAL   8dd9de40 IDENTICAL   2d859ca5 IDENTICAL   735f07ca IDENTICAL
16695c81 IDENTICAL   5a5199ba IDENTICAL   b312e31b IDENTICAL
```

The 11 area citations (A4, B1×3, B2×3, A2×2, B8, B4) are also IDENTICAL. No id exists in only one of the two files.

### 3. Passages marked as stating a policy that make no commitment

`candidate-site.ts` reads block elements in document order, and all passages from c5cc59f8 through b312e31b sit under the "Meet Darren Soto" heading. c5cc59f8 ends in a colon: "During his nearly 10 years in the House, he has brought billions of dollars back in federal funding to the district to:". The four one-line passages after it are the items of that list. They describe what past funding paid for, which is record and biography, not a stated commitment. Taken out of context they read as imperatives, and the run scored them as commitments.

| id | commitment | issues cited in `areas` | Kind | First 20 words |
|---|---|---|---|---|
| 8dd9de40 | 0.85 (exactly the gate) | none | Vote ask / campaign copy | "I’m fighting for you and your family, and I ask for your vote this November." |
| 2d859ca5 | 0.85 (exactly the gate) | B1, B2, B8 | Biography: third-person account of committee service | "In Congress, he serves on the powerful Energy and Commerce Committee and the Natural Resources Committee, where he fights to" |
| 735f07ca | 0.88 | B1 | Record: item in the "brought billions of dollars … to:" list | "Boost high-paying jobs at Lake Nona, NeoCity, University of Central Florida Research Park, and NASA/commercial space" |
| 16695c81 | 0.91 | none | Record: same list | "Expand I-4, Orlando International Airport, SunRail, and Kissimmee Gateway Airport" |
| 5a5199ba | 0.93 | A2, B2 | Record: same list | "Make food, healthcare, and housing more affordable" |
| b312e31b | 0.91 | none | Record: same list | "Restore the Kissimmee Chain of Lakes, Lake Conway, and the Indian River Lagoon" |

Note on 2d859ca5: "where he fights to lower the cost of healthcare, energy, and consumer goods …" is in the present tense. The campaign presents it as ongoing work, though. It describes committee service in the bio section and makes no commitment for the coming term. It is flagged here as biography, and the founder may rule on it. If it is ruled to be self-description that is in scope, only B8 depends on it.

The one `states_policy: true` passage that carries a first-person campaign commitment is **e4849f19** ("We must stop tariffs … Stop Medicaid and ACA cuts … Protect Social Security and Medicare. And fight rampant corruption in Washington."). It sits under the heading "I’m running for re-election on the three C’s".

### 4. Per-issue counts (threshold 0.85)

Score ≥ 0.85 for the issue, taken from `run.json` `verdict.scores`. "Cited" means the passage also has `states_policy: true` and so appears in `areas`. "Cited and not flagged in check 3" counts what is left once the check 3 passages are set aside.

| Issue | Label | Passages ≥ 0.85 | Cited in `areas` | Cited and not flagged in check 3 |
|---|---|---|---|---|
| A2 | Housing affordability | 2 (e4849f19, 5a5199ba) | 2 | 1 (e4849f19) |
| A4 | Cost of living in Florida | 1 (e4849f19) | 1 | 1 (e4849f19) |
| B1 | Economy, inflation, and jobs | 4 (e4849f19, 3b47215a, 2d859ca5, 735f07ca) | 3 (3b47215a is `states_policy: false`) | 1 (e4849f19) |
| B2 | Healthcare access and costs | 3 (e4849f19, 2d859ca5, 5a5199ba) | 3 | 1 (e4849f19) |
| B4 | Social Security and Medicare | 1 (e4849f19) | 1 | 1 (e4849f19) |
| B8 | Climate and environment (national) | 2 (2d859ca5, 02994461) | 1 (02994461 is `states_policy: false`) | 0 |

Every other taxonomy issue has **0** passages over the threshold, so each one is recorded as `no_stated_position_found`: A1, A3, A5, A6, KYV9, KYV10, A7, B3, B5, B6, KYV1, B7, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

Context from `ingest.log`, not a claim of coverage: the corpus is the homepage alone, because `/issues` yielded 0 passages. The zeros describe what this corpus says. Whether the rest of the site is silent on these issues is a separate question.

### 5. Possible misses

These 8 passages are `states_policy: false`: 848d75fb, 287a1da5, 0c5a367a, 3b47215a, c5cc59f8, 02994461, 68c41f37, cad07633. None of them plainly states a commitment on a taxonomy issue:

- 848d75fb ("Florida's families deserve a leader who champions bold solutions in the face of tough challenges.") is a slogan with no issue in it.
- 287a1da5, 0c5a367a and cad07633 are biography (election, background, education).
- c5cc59f8 is the lead-in to the funding list.
- 3b47215a ("He served for five and a half years in the Florida House of Representatives before he was elected to the"), 02994461 ("Darren has also passed major legislation in Congress to protect the Kissimmee River and Great Florida Reef, improve commercial spaceflight,") and 68c41f37 ("On the Energy and Commerce Committee, Darren worked directly on the American Rescue Plan, Bipartisan Infrastructure Law, CHIPS and Science") are legislative record, not commitments. 3b47215a (B1) and 02994461 (B8) clear the issue threshold. The commitment gate correctly kept both out of `areas`.

No misses to report.

VERDICT: FAIL (check 3)
