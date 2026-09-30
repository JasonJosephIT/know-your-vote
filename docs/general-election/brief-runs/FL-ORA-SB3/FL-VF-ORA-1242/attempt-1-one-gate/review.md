# Step 3 review: FL-VF-ORA-1242 (Susanne Peña), FL-ORA-SB3-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (10 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`. For context only: `links.jsonl`, `run-report.txt`, `run.log`, `meta.tsv`, `ingest-report.md`, `attempt-1-keywords/`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`), and check 5 considers every taxonomy issue.

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 10 passages in run.json are on `www.vote4pena.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | Both `states_policy` passages (`1af08806`, `0a9bd09d`) match passages.jsonl byte for byte (text and url), checked with a script. So do all 10. |
| 3 | No inferred motive | **PASS** | `1af08806` and `0a9bd09d` are both platform planks with a commitment by the candidate ("Support…", "Invest in…"). Neither is biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | No passage reaches 0.85 on any taxonomy issue. All 25 issues have 0 and are `no_stated_position_found`. The highest score on any issue is 0.47 (A6). The run report fills nothing. |
| 5 | Possible misses (information only) | Reported | A6: `d5665461`. Weaker, and on no taxonomy issue: `d9d39f56`. Also see the note on `0a9bd09d`. |

## Evidence

### 1. Candidate-controlled sources only: PASS

I parsed the host from every `url` in run.json and in passages.jsonl:

| Host | run.json | passages.jsonl |
|---|---|---|
| www.vote4pena.com | 10 | 10 |

These passages come from two pages: `/` (3: `1af08806`, `0a9bd09d`, `d5665461`) and `/about` (7: `c4790197`, `b19216ef`, `cde7d5be`, `518ff949`, `31c12d2b`, `d9d39f56`, `86dc3d87`). No other host, redirect or third-party URL appears. `/endorsements` was judged by Jev (policy 0.04) and not ingested.

Informational: `ingest.log` lists only `/about` (7 passages) and does not list the homepage, yet it reports 10 passages in total. passages.jsonl, run.json and `ingest-report.md` all show `/` = 3 and `/about` = 7. This does not affect any check, but the log does not account for the 3 homepage passages.

Informational: Jev chose 0 policy pages (cap 8). The site seems to have no separate issues page, and the platform is the three homepage planks. On all three homepage passages the `heading` field holds a whole biography paragraph ("With over 20 years experience as a professional educator…"), not a heading. The `text` field is correct, and this affects no check.

### 2. Quotes verbatim: PASS

A node script compared each run.json passage to the passages.jsonl passage with the same `id`. It used `Buffer.compare` on the UTF-8 text and also compared the url and heading.

- `states_policy: true` passages: 2 (`1af08806`, `0a9bd09d`). Text mismatches: 0. URL mismatches: 0. Ids missing from passages.jsonl: 0.
- All 10 passages: 0 text, url or heading mismatches. passages.jsonl has no duplicate ids, and no id is in one file but missing from the other.
- Also checked: every `states_policy` equals `commitment >= 0.85`, and every `issues` array equals the set of scores at or above 0.85. There are 0 inconsistencies and 0 null verdicts.

### 3. No inferred motive: PASS

I read both passages marked `states_policy: true`:

| id | Commitment | Reading | First 20 words |
|---|---|---|---|
| `1af08806` | 0.96 | A platform plank. It states a commitment: "Support an inclusive curriculum…". | "Champion Academic Freedom & Excellence– Support an inclusive curriculum that promotes critical thinking and reflects diverse perspectives to prepare students" |
| `0a9bd09d` | 0.97 | A platform plank. It states a commitment: "Invest in strong academic programs… as well as support services…". | "Expand Access to High-Quality Education– Invest in strong academic programs, such as bilingual education and STEAM, as well as support" |

Neither passage is biography, an attack on an opponent, fundraising or event copy. None of the seven `/about` biography passages was marked as stating a policy.

### 4. Silence recorded, not filled: PASS

"Over" is the number of passages with a score of at least 0.85 on that issue. No taxonomy issue has even one passage over the threshold, so the table of issues with at least one passage over is empty.

All 25 taxonomy issues have 0 and are `no_stated_position_found`: A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

For the record, the highest score on each issue across all 10 passages is 0.47 (A6, `d5665461`), then 0.28 (KYV10, `1af08806`). Everything else is 0.09 or lower. `run.json` has `areas: []` and `with_issue: 0`, and `run-report.txt` says "No passage cleared both the commitment gate and an issue question." The run fills no issue. The 2 `states_policy` passages carry no taxonomy issue, so they are candidate-tier material only.

### 5. Possible misses (information only)

Passages marked as stating no policy that state a commitment on a taxonomy issue:

| id | Commitment | Issue (score) | Note | First 20 words |
|---|---|---|---|---|
| `d5665461` | 0.80 | A6 Public school funding and teachers (0.47) | The third platform plank, next to the two that passed the gate. It is an imperative commitment ("Create…") about teachers, but it is vague and scored under the gate. | "Empowering Teachers & Students– Create safer, more independent learning environments where educators feel valued and students thrive." |

Weaker. This one is a commitment, but on no taxonomy issue:

| id | Commitment | Note | First 20 words |
|---|---|---|---|
| `d9d39f56` | 0.70 | The biography ends with "she continues to advocate for policies that support an inclusive curriculum…". That wording repeats the `1af08806` plank. Curriculum has no taxonomy issue (A6 0.09, KYV10 0.21). | "Susanne is the lead education consultant at SMP Education Consulting, where she provides strategic guidance on bilingual program development, curriculum" |

Not flagged: `cde7d5be` (0.54) says she "champions equitable access to multilingual learning opportunities" as president of FABE, which describes her role, not a campaign commitment. `c4790197` (0.12) is a self-description ("fierce advocate for children, teachers and our public schools") with no commitment.

Outside check 5's scope, but for the founder: `0a9bd09d` clears the gate and says "Invest in strong academic programs… as well as support services". That is arguably A6 (Public school funding and teachers), but it scored 0.46 and carries no issue. So the run's A6 `no_stated_position_found` rests on scores of 0.46 and 0.47 for two of the candidate's three planks.

VERDICT: PASS
