# Step 3 review: FL-VF-ORA-1242 (Susanne Peña), FL-ORA-SB3-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (10 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates: `q_states_policy` and `q_own_commitment`), `ingest.log`. Read for context only: `links.jsonl`, `run-report.txt`, `run.log`, `meta.tsv`, `ingest-report.md`. The earlier `attempt-1-one-gate/` run was not re-reviewed.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`, 25 issues), and check 5 considers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 10 passages in run.json are on `www.vote4pena.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | Both `states_policy` passages (`1af08806`, `0a9bd09d`) match passages.jsonl byte for byte, checked with a node script. All 10 passages match. |
| 3 | No inferred motive | **PASS** | `1af08806` and `0a9bd09d` are platform planks with a commitment by the candidate ("Support…", "Invest in…"). Neither is biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | No passage reaches 0.85 on any issue. All 25 issues have a count of 0 and are `no_stated_position_found`. The highest issue score is 0.49 (A6, `0a9bd09d`). `areas: []`. |
| 5 | Possible misses (information only) | Reported | A6: `d5665461`. Weaker, and on no taxonomy issue: `d9d39f56`. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A script parsed the host of every `url` in run.json and in passages.jsonl:

| Host | run.json | passages.jsonl |
|---|---|---|
| www.vote4pena.com | 10 | 10 |

The passages come from two pages. `/` has 3 (`1af08806`, `0a9bd09d`, `d5665461`) and `/about` has 7 (`c4790197`, `b19216ef`, `cde7d5be`, `518ff949`, `31c12d2b`, `d9d39f56`, `86dc3d87`). No other host, redirect or third-party URL appears. `/endorsements` was judged by Jev (policy 0.04) and not ingested.

Informational: `ingest.log` lists only `/about` (7 passages), but it reports 10 passages in total. It does not list the 3 homepage passages. passages.jsonl, run.json and `ingest-report.md` all show `/` = 3 and `/about` = 7.

Informational: on the three homepage passages, the `heading` field holds a whole biography paragraph ("With over 20 years experience as a professional educator…"), not a heading. The `text` field is correct, and this affects no check.

Informational: `ingest-report.md` is stale for Step 2. It gives provenance `q-b2171346` and 35576/4580 tokens. The current `run.json` and `run.log` give `q-e7282116` and 37656/4790 tokens. The counts it reports (2 state a policy, 0 with an issue) still match.

### 2. Quotes verbatim: PASS

A node script compared each run.json passage to the passages.jsonl passage with the same `id`. It used `Buffer.compare` on the UTF-8 `text`, and it also compared `url` and `heading`.

- `states_policy: true` passages: 2 (`1af08806`, `0a9bd09d`). Text mismatches: 0.
- All 10 passages: 0 text mismatches, 0 url mismatches and 0 heading mismatches. passages.jsonl has no duplicate ids. No id is in one file and missing from the other.
- Consistency: every `states_policy` equals `commitment >= 0.85 AND own_commitment >= 0.85` (the two-gate rule in `src/lib/policy-noul.ts`). Every `issues` array equals the issues scored at or above 0.85. The script found 0 inconsistencies and 0 null verdicts.

### 3. No inferred motive: PASS

| id | commitment / own | Reading | First 20 words |
|---|---|---|---|
| `1af08806` | 0.96 / 0.94 | A platform plank. It states a commitment: "Support an inclusive curriculum…". | "Champion Academic Freedom & Excellence– Support an inclusive curriculum that promotes critical thinking and reflects diverse perspectives to prepare students" |
| `0a9bd09d` | 0.97 / 0.95 | A platform plank. It states a commitment: "Invest in strong academic programs… as well as support services…". | "Expand Access to High-Quality Education– Invest in strong academic programs, such as bilingual education and STEAM, as well as support" |

Neither passage is biography, an attack on an opponent, fundraising or event copy. None of the seven `/about` biography passages is marked as stating a policy.

### 4. Silence recorded, not filled: PASS

The count is the number of passages scoring at least 0.85 on the issue. No issue has even one passage over the threshold, so the list of issues with a count above 0 is empty.

All 25 taxonomy issues have a count of 0 and are `no_stated_position_found`: A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

For the record, the highest scores are all on two issues:
- A6: 0.49 (`0a9bd09d`), 0.46 (`d5665461`) and 0.37 (`c4790197`).
- KYV10: 0.27 (`1af08806`) and 0.21 (`d9d39f56`).

Every other score is 0.07 or lower. `run.json` has `areas: []` and `with_issue: 0`, and `run-report.txt` says "No passage cleared both the commitment gate and an issue question." The run fills no issue. The 2 `states_policy` passages carry no taxonomy issue, so they are candidate-tier material only.

### 5. Possible misses (information only)

Passages marked as stating no policy that state a commitment on a taxonomy issue:

| id | commitment / own | Issue (score) | Note | First 20 words |
|---|---|---|---|---|
| `d5665461` | 0.80 / 0.83 | A6 Public school funding and teachers (0.46) | The third platform plank, next to the two that passed. It states a commitment ("Create…") about teachers and learning environments. It is vague and fell just under both gates. | "Empowering Teachers & Students– Create safer, more independent learning environments where educators feel valued and students thrive." |

Weaker. This one states a commitment, but on no taxonomy issue:

| id | commitment / own | Note | First 20 words |
|---|---|---|---|
| `d9d39f56` | 0.71 / 0.50 | The biography ends with "she continues to advocate for policies that support an inclusive curriculum…", which repeats the `1af08806` plank. Curriculum has no taxonomy issue (A6 0.09, KYV10 0.21). | "Susanne is the lead education consultant at SMP Education Consulting, where she provides strategic guidance on bilingual program development, curriculum" |

Not flagged:
- `cde7d5be` (0.54 / 0.48) says she "champions equitable access to multilingual learning opportunities" as president of FABE. This describes her role, not a campaign commitment.
- `c4790197` (0.13 / 0.16) is a self-description ("fierce advocate for children, teachers and our public schools") with no commitment.

Outside check 5's scope, for the founder: `0a9bd09d` clears both gates and says "Invest in strong academic programs… as well as support services". That is arguably A6 (Public school funding and teachers), but it scored 0.49 and carries no issue. So the run's A6 `no_stated_position_found` rests on scores of 0.49 and 0.46 for two of the candidate's three planks.

VERDICT: PASS
