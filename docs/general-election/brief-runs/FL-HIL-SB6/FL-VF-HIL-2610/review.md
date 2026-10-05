# Step 3 review: FL-VF-HIL-2610 (Kenneth "Ken" Gay), FL-HIL-SB6-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (18 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, two gates, threshold 0.85, status complete, created 2026-09-30T01:59:05Z, 18 of 18 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 18 passages are on `votekennethgay.com` (7 on `/`, 6 on `/priorities`, 5 on `/meet-kenneth`). No other host appears. |
| 2 | Quotes verbatim | PASS | The two policy passages, `a6eb1c7c` (44 bytes) and `77d7b7e5` (45 bytes), are byte-identical to `passages.jsonl`. All 18 texts, urls and headings match. `areas` is empty, so there are no citation copies to check. |
| 3 | No inferred motive | PASS | `a6eb1c7c` and `77d7b7e5` are items in the candidate's own "Building Strong Schools" priorities list. Neither is biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | No passage clears the threshold on any of the 25 issues, so every issue counts 0 and is `no_stated_position_found`. The highest score is A6 0.82 (`77d7b7e5`). |
| 5 | Possible misses (information only) | 3 | `f0f2259d`, `e7334f97` and `52a2fe82` are items from the same priorities list as the two passages that passed, but the gate marked them states_policy=false. See the evidence section. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script collected the host of every passage url in `run.json` and in `passages.jsonl`. There is one host, `votekennethgay.com`, which is the OFFICIAL_SITE host. No redirect was involved.

- `https://votekennethgay.com/`: `a419fb9a`, `8f86e6bf`, `cee45730`, `ef4c2641`, `f8506f7e`, `0ee65ee8`, `f0bbeb24`
- `https://votekennethgay.com/priorities` (Jev chose it as a policy page, policy=0.94): `18a55b21`, `a6eb1c7c`, `f0f2259d`, `52a2fe82`, `77d7b7e5`, `e7334f97`
- `https://votekennethgay.com/meet-kenneth` (the About page, about=0.71): `6713c2ea`, `1b5c1cbd`, `c6dfb3c0`, `839faaa6`, `b6982fe6`

`links.jsonl` lists only these two links, and both are on the same host.

There is a bookkeeping discrepancy that does not affect this check. The per-page counts in `ingest.log` ("7 passage(s) /priorities", "6 passage(s) /meet-kenneth", no homepage line) and in `ingest-report.md` (meet-kenneth 5, priorities 6, homepage 7) do not agree with each other. `passages.jsonl` itself has 7 on `/`, 6 on `/priorities` and 5 on `/meet-kenneth`, and those are the counts this review used. `ingest-report.md` is also stale for Step 2: it gives provenance `q-b2171346` and 63103/8244 tokens, while `run.json`, `run.log` and `run-report.txt` (the 2026-09-30 rerun) give `q-e7282116` and 66847/8622 tokens.

### 2. Quotes verbatim

I checked this with `node`, comparing `Buffer.from(text, "utf8")` for each `run.json` passage against the passage with the same id in `passages.jsonl`:

- The id sets match: 18 ids in each file, all shared.
- `a6eb1c7c` (states_policy=true) is byte-identical at 44 bytes, and its url and heading match.
- `77d7b7e5` (states_policy=true) is byte-identical at 45 bytes, and its url and heading match.
- All 18 passage texts, urls and headings are identical, including the passages the gates excluded.
- `areas` is `[]` because no passage both passed the gates and matched an issue. There are no citation copies to compare.

### 3. No inferred motive

Two passages are marked states_policy=true. Both are on `/priorities` under the heading "Building Strong Schools", in a list that the page introduces as "His priorities" (`18a55b21`).

- `a6eb1c7c` (commitment 0.89, own_commitment 0.88), full text: "Create Pathways for New Teacher Recruitment."
- `77d7b7e5` (commitment 0.93, own_commitment 0.85, exactly at the threshold), full text: "Prioritize Money Directly to Student Learning"

Each is an imperative priority item on the candidate's own platform page, so each counts as a commitment by the candidate. Neither is biography, an attack on an opponent, fundraising or event copy. Both are headline-length fragments with no subject. A brief should attribute them to the page, for example "The campaign website lists 'Create Pathways for New Teacher Recruitment' among its priorities", and should not expand them into specifics the site does not give.

### 4. Silence recorded, not filled

Threshold 0.85. For each issue, the count is the number of passages whose score is at or above the threshold:

| Issue | Count | Coverage |
|---|---|---|
| A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 | 0 each | `no_stated_position_found` |

No taxonomy issue has a passage over the threshold, so the list of non-zero issues is empty. `counts.with_issue` is 0 and `run-report.txt` says "No passage cleared both the commitment gate and an issue question", which is consistent. The highest issue score anywhere is A6 at 0.82 (`77d7b7e5`). It is below the threshold and counts as 0.

### 5. Possible misses (information only, not a fix)

These passages are marked states_policy=false but state a commitment in the same form as the two items that passed. All three are on `/priorities` under "Building Strong Schools", in the same list as `a6eb1c7c` and `77d7b7e5`:

- `f0f2259d` (commitment 0.73, own 0.69; KYV10 0.40, B1 0.20), full text: "Increase Graduation and Workforce Readiness". This is a commitment on career and workforce readiness (KYV10).
- `e7334f97` (commitment 0.76, own 0.76; A6 0.27), full text: "Implement Best Practices for Resource Usage". This is a commitment on how school resources are spent (A6, public school funding).
- `52a2fe82` (commitment 0.78, own 0.81; A6 0.06, B7 0.05), full text: "Create Safe Classroom Learning Environments". This is a commitment in the education area, but no taxonomy sub-issue clearly covers school safety or discipline. It is a gate miss, and it may also be a taxonomy gap.

The founder may also want to know about the tagging of the two passages that passed. `run-report.txt` says both "state a policy the taxonomy has no question for". But `77d7b7e5` (money to student learning) scored A6 0.82 and `a6eb1c7c` (teacher recruitment) scored A6 0.63, and both are on the subject of A6, "Public school funding and teachers". They fell below the threshold rather than outside the taxonomy.

Some passages are close to the line but are not listed as misses, because they are normative or biographical statements rather than plain commitments. `18a55b21` ("His priorities focus on improving student outcomes, supporting educators, and creating safe, well-managed schools for every family.", commitment 0.67, own 0.65) is a third-person summary of the list above. `f8506f7e` ("Teachers and staff should have what they need to succeed in the classroom.") and `0ee65ee8` ("Schools should maintain discipline and create a positive culture for students and teachers.") are homepage "should" statements. `ef4c2641` ("The focus is on improving academic performance and preparing students for life after graduation.") is a homepage value statement. `cee45730`, `c6dfb3c0` and `b6982fe6` are biography ("remains committed to strong schools"). `f0bbeb24` is the paid-for disclaimer.

VERDICT: PASS
