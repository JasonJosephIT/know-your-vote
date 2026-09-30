# Step 3 review: FL-VF-BRO-1254 (Cynthia Alceus Dominique), FL-BRO-SB7-general

Reviewer: Step 3, read-only. Inputs: `passages.jsonl` (62 passages), `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`.
Official site: https://www.cynthiaforbrowardschools.com/
Spine: undecided for this race, so check 4 reports every taxonomy issue with at least one passage over the threshold, and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | PASS (1 possible miss reported, plus notes) |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` and `passages.jsonl`:

- run.json: 62 of 62 passages on `www.cynthiaforbrowardschools.com`.
- passages.jsonl: 62 of 62 on `www.cynthiaforbrowardschools.com`.
- No other host. There are no redirects to document.

`ingest.log`: one page crawled (the homepage). 20 links were found on it, Jev judged 0 of them, and 0 policy pages were chosen. There is no about page and `links.jsonl` is empty. This affects coverage, not source control: every passage comes from the homepage.

### 2. Quotes verbatim: PASS

A node script compared each passage in `run.json` against the passage with the same id in `passages.jsonl`, using `Buffer.compare` on the UTF-8 bytes of `text`. It also compared `url` and `heading`.

- 33 passages have `states_policy: true`: 56649abc e8611d38 be5d7b67 3874c056 c4c8307f 4296139b e3c39e75 20a5a153 b2e1af18 f8e1fca1 c5334919 a9b7fc9a ad9c8dc3 a031efaa da2c2d8b 977fa8cb c48c02ab 19ae11b7 e9422067 57cd31fd e970a8e8 c23e1e86 9804b508 ca1006b7 e95e2ecc 4c3f2fb5 54a931c2 c6f0e369 c78d027b 5fdffcd0 fda00dfe 6407fd3c c4bff4a0.
- Text mismatches: 0 of 33. Across all 62 passages there are also 0 text mismatches, 0 url mismatches and 0 heading mismatches.
- Both files have 62 unique ids, and the id sets match.

### 3. No inferred motive: PASS

All 33 passages marked as stating a policy are commitments in the candidate's own words. 32 of them are bullet items under the "My Vision for Broward Schools" heading, written as imperative commitments (for example "Ensure…", "Provide…", "Expand…", "Strengthen…").

The one outside that section is 56649abc ("Enhanced support for mental health, students with disabilities and early behavior intervention."). It is a list item that completes the sentence in 83be06ca: "As your next Broward County School Board Member for District 7, I will always put students first and prioritize".

None of the 33 is only biography, an attack on an opponent, fundraising copy or event copy.

For the record, the run correctly left the site's biography passages below the gate: 6559c44e, 4695ac5e, 5fd0ac22, 1550adc7, f64c89b0, e580810e, 797b3ca9, 5f747e65 and 722ab1ff. It did the same for the ask-for-support line 10de0a58 and the endorsement line 6f08e413. The run adds no motive. `run-report.txt` quotes only the passage text.

Two passages are weak but still commitments, not biography:
- 5fdffcd0: "Promote competent leadership that values the experiences, traditions, and perspectives of Broward's diverse student population."
- fda00dfe: "Celebrate and market the outstanding programs and achievements of Broward County Public Schools to strengthen community pride and increase enrollment."

### 4. Silence recorded, not filled: PASS

This is the count of passages whose issue score is at or above 0.85, for each taxonomy issue with at least one:

| Issue | Label | Passages ≥ 0.85 | Of those, cleared the commitment gate (cited in `areas`) |
|---|---|---|---|
| A6 | Public school funding and teachers | 4: 9804b508 (0.95), ca1006b7 (0.92), 57cd31fd (0.86), 86025bd9 (0.95) | 3: 9804b508, ca1006b7, 57cd31fd |
| KYV10 | Career, vocational and higher education | 2: 977fa8cb (0.98), da2c2d8b (0.96) | 2 |

Passage 86025bd9 carries `issues: ["A6"]`, but its commitment score is 0.83, below the gate. `groupByArea` therefore leaves it out of `areas` and `run-report.txt`, and `counts.with_issue` is 5, not 6.

Every other taxonomy issue has 0 passages over the threshold and is recorded as `no_stated_position_found`. These are A1, A2, A3, A4, A5, KYV9, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8. `run.json` `areas` holds only Education (A6 with 3 citations, KYV10 with 2). The run creates no finding for any issue that has 0 passages.

### 5. Possible misses: information for the founder, not a fix

These are passages marked `states_policy: false` that plainly state a commitment on a taxonomy issue:

- **06807192** (commitment 0.80, A6 0.79): "Competitive compensation and support for teachers and staff." This is a list item under 83be06ca, "…I will always put students first and prioritize". It is a commitment on A6 (teacher pay) and falls just under the gate and the issue threshold. The same commitment is captured in the vision section by 9804b508, so A6 coverage does not depend on it.

The following are borderline and not counted as misses:

- 86025bd9 (commitment 0.83, A6 0.95): "I have advocated for increased teacher pay, better support and work conditions for teachers and have made great progress this year." It describes the candidate's past advocacy, not a forward commitment.
- 16fee8c7 (commitment 0.82): "Raise academic achievement so every student has the opportunity to reach their full potential." It is a commitment, but it matches no taxonomy issue (all issue scores ≤ 0.07).

The next group is outside the letter of check 5. These passages are marked as stating a policy but match no issue, and each scores high on one taxonomy issue:

| Passage | Issue score | Text |
|---|---|---|
| e970a8e8 | A6 0.83 | "Incentivize educational advancement, certification, and continuing education for teachers." |
| c23e1e86 | A6 0.81 | "Ensure every tax dollar is invested responsibly with measurable results for students, increased operational efficiency, and return on our investment." |
| be5d7b67 | B7 0.81 | "Ensure every school is adequately staffed with trained security personnel, armed guardians, and School Resource Officers." |
| e9422067 | A6 0.70 | "Empower teachers with the professional autonomy to meet diverse student needs while maintaining high academic standards and accountability." |
| 4296139b | B2 0.51 | "Enhance access to counselors and mental health professionals so students receive help before problems become crises." |

VERDICT: PASS
