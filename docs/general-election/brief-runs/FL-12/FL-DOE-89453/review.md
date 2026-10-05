# Step 3 review: FL-DOE-89453 (Kimberly Overman), FL-12-general

Reviewed under the Profiler constitution. Read-only review of the run in this folder. No website was fetched.

- Official site: https://kimberlyoverman.com/
- Run reviewed: `run.json`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:58:11Z
- Counts in `run.json`: 73 passages, 73 asked, 12 state a policy, 11 of those match a taxonomy issue, 0 failed
- Spine: undecided for this race, so check 4 covers every taxonomy v7 sub-issue (25) and check 5 considers all of them.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 73 passage urls, and all 17 citations in `areas`, are on `kimberlyoverman.com`: `/` 18, `/issues` 10, `/meet-kimberly` 45. No other host. |
| 2 | Quotes verbatim | **PASS** | Byte comparison by script (node `Buffer.equals`): all 12 policy passages match `passages.jsonl` in text, url and heading: 25e222d1, 03a0f303, 7ca134b9, b2f87133, ea3bfcf9, a25a3aaf, cc710f7b, b5b04752, 5dfb4c2d, fd3edd42, 088de975, 3b021b7f. All 73 run passages and all 17 `areas` citations match too. The two files hold the same 73 ids. |
| 3 | No inferred motive | **PASS** | None of the 12 policy passages is only biography, an attack, fundraising or event copy. Each has a forward commitment by the candidate ("will", "she'll fight for", "supports"). |
| 4 | Silence recorded, not filled | **PASS** | 9 issues have at least one passage over the threshold. The other 16 have 0 and are recorded as `no_stated_position_found`. `areas` contains only issues that have gated citations. |
| 5 | Possible misses (information only) | **REPORTED** | One clear miss: 0a8899c8 (voting rights, own_commitment 0.84, just under the gate). Three borderline: e9dc6867, 541b0654, 0819d6e2. |

## 1. Candidate-controlled sources only: PASS

I counted hosts by script over `run.json` `passages[].url`: `{ 'kimberlyoverman.com': 73 }`. The page split is `https://kimberlyoverman.com/` 18, `/issues` 10 and `/meet-kimberly` 45, which matches `passages.jsonl` and `ingest-report.md`. All 17 citations in `areas[].subIssues[].citations[].passage.url` are on the same host. No redirect was involved and no other host appears.

## 2. Quotes verbatim: PASS

The script loaded `passages.jsonl` by id and compared each policy passage's `text` in `run.json` with `Buffer.from(text,'utf8').equals(...)`, and also compared `url` and `heading`:

```
25e222d1 text_identical=true url=true heading=true
03a0f303 text_identical=true url=true heading=true
7ca134b9 text_identical=true url=true heading=true
b2f87133 text_identical=true url=true heading=true
ea3bfcf9 text_identical=true url=true heading=true
a25a3aaf text_identical=true url=true heading=true
cc710f7b text_identical=true url=true heading=true
b5b04752 text_identical=true url=true heading=true
5dfb4c2d text_identical=true url=true heading=true
fd3edd42 text_identical=true url=true heading=true
088de975 text_identical=true url=true heading=true
3b021b7f text_identical=true url=true heading=true
all-passages mismatches: 0
area citations 17 mismatch 0
```

## 3. No inferred motive: PASS

All 12 passages marked `states_policy: true` contain a commitment by the candidate. None is only biography, an attack on an opponent, fundraising or event copy. Three open with biographical framing but go on to a commitment, so they pass:

- a25a3aaf: "As someone who grew up in a working-class household… In Congress, she'll fight for increased investment in affordable ho…"
- cc710f7b: "Kimberly has seen firsthand how medical bills can destabilize families. She will work to lower prescription drug costs…"
- fd3edd42: "With over 45,000 veterans and active-duty personnel in the district… She'll fight to improve access to VA care…"

7ca134b9 ("Florida's 12th is home to thousands of veterans. Kimberly will ensure they receive the benefits, healthcare, and respect they've earned.") is a broad but real commitment. It matched no taxonomy issue, since the highest score was under 0.85. It is the run's one "states a policy the taxonomy has no question for", and it is a candidate-tier issue (veterans) under the constitution.

The run's gate logic matches its scores. For every passage, `states_policy` equals `commitment ≥ 0.85 AND own_commitment ≥ 0.85`, and I found no mismatch.

## 4. Silence recorded, not filled: PASS

"Clears the threshold" here means the passage passed the policy gate and its score for the issue is at least 0.85. `groupByArea` in `src/lib/policy-noul.ts` publishes exactly this set.

| Issue | Label | Count | Passages (score) |
|---|---|---|---|
| A2 | Housing affordability | 2 | 25e222d1 (0.97), a25a3aaf (0.98) |
| A6 | Public school funding and teachers | 2 | b2f87133 (0.99), 5dfb4c2d (0.98) |
| B1 | Economy, inflation, and jobs | 1 | 25e222d1 (0.90) |
| B2 | Healthcare access and costs | 3 | 03a0f303 (0.99), cc710f7b (0.99), fd3edd42 (0.87) |
| B5 | Abortion policy | 3 | 088de975 (0.98), 03a0f303 (0.89), cc710f7b (0.86) |
| B7 | Crime policy, policing and courts | 2 | b5b04752 (0.96), ea3bfcf9 (0.94) |
| B8 | Climate and environment (national) | 1 | 3b021b7f (0.90) |
| KYV4 | Storm resilience and flood protection | 1 | 3b021b7f (0.97) |
| KYV10 | Career, vocational and higher education | 2 | 5dfb4c2d (0.98), b2f87133 (0.92) |

The following have 0 passages over the threshold and are recorded as `no_stated_position_found`: A1 Property insurance costs, A3 Property taxes, A4 Cost of living in Florida, A5 Water quality and Everglades restoration, A7 Elections administration and voting access, B3 Immigration and border enforcement, B4 Social Security and Medicare, B6 Election integrity, KYV1 Threats to democratic institutions, KYV2 Energy and utilities, KYV3 Growth, development and land conservation, KYV5 Water supply and drinking water, KYV6 Renters and evictions, KYV7 Homelessness, KYV8 Condominium and HOA costs, KYV9 School choice and vouchers.

Candidate-tier issue with no taxonomy question: veterans (7ca134b9).

`run.json` `areas` lists only the 9 issues above. No area or sub-issue was created for a zero-count issue.

**Note on the `issues` field (not a failure):** four passages that did not pass the gate still have a non-empty `verdict.issues`:

- 541b0654: A2, B2
- e9dc6867: B1
- 0819d6e2: A2, B2, B5
- c7d8ebae: A2

This is how the code works. `readVerdict` applies the issue threshold whether or not the gate passed, and `groupByArea` skips passages with `statesPolicy` false, so these passages never reach `areas`. They are not counted above. Anyone who reads `verdict.issues` without also checking `states_policy` would count them wrongly. The doc comment on `PassageVerdict.issueIds` ("Empty when the passage cleared the gate but matched no issue") does not mention this case.

## 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but contain a commitment on a taxonomy issue.

**Clear miss**

- **0a8899c8** (`/`, section "THE ISSUES"). commitment 0.90, own_commitment 0.84, A7 0.84. It fails the second gate by 0.01, and its A7 score is also 0.01 under.
  First 20 words: "Kimberly is committed to protecting voting rights, restoring trust in government, and making sure everyday people—not lobbyists—have a seat at"
  If the gate had passed, this is the only passage on the site that speaks to A7. As things stand, A7 is recorded as silent.

**Borderline** (priority lists rather than commitments. I list them for the founder, but do not count them as misses):

- **e9dc6867** (`/`, "THE ISSUES"). commitment 0.89, own_commitment 0.80, B1 0.89.
  First 20 words: "From the cost of living to the classroom, Kimberly Overman is running to make government deliver for working people—fighting for fair"
- **541b0654** (`/`, "Time for Government That Works."). commitment 0.86, own_commitment 0.66, A2 0.90, B2 0.87.
  First 20 words: "Families are struggling while politicians argue. Kimberly is focused on what matters: affordable housing, accessible healthcare, and a fair shot for"
- **0819d6e2** (`/issues`, "What Kimberly Stands For"). commitment 0.88, own_commitment 0.64, A2 0.95, B2 0.90, B5 0.86.
  First 20 words: "Kimberly's priorities reflect what voters across the district are demanding: affordable housing, accessible healthcare, economic stability, reproductive freedom, and a government that"

Correctly excluded:

- c7d8ebae: county commission record, 2018–2022, past tense; own_commitment 0.07.
- a18afc79 and the other `/meet-kimberly` passages: biography and lists of boards and memberships.
- `Fuel Our Movement.` passages: fundraising.

None of the borderline items would change a zero-count issue except 0a8899c8 (A7). A2, B1, B2 and B5 already have gated citations.

## Other observations (information only)

- **The Step 2 section of `ingest-report.md` is stale.** It gives provenance `q-b2171346` with 16 policy passages and 14 matched to an issue. The `run.json` reviewed here is `q-e7282116` with 12 and 11. This matches `run.log` and `run-report.txt`. `ingest-report.md` was last modified 2026-09-29 19:19 and `run.json` 2026-09-30 01:58, so the report predates the current run.
- **`ingest.log` per-page counts differ from the final file.** The log shows `/issues` 13 and `/meet-kimberly` 48, and has no homepage line. `passages.jsonl` has `/` 18, `/issues` 10 and `/meet-kimberly` 45, which is 73 in total. The simplest explanation is de-duplication that assigns repeated passages to the page where they first appear. This review does not depend on it.

VERDICT: PASS
