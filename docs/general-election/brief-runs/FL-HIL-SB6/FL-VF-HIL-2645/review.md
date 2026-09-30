# Step 3 review: FL-VF-HIL-2645 (Karen Perez), FL-HIL-SB6-general

I ran this review read-only. It covers `run.json` as it stands now: `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, created 2026-09-30T01:59:05.818Z. That run has two gates: a passage states a policy only if it clears both `commitment` and `own_commitment`. The other inputs are `passages.jsonl` (15 passages) and `ingest.log`.
Official site: https://keepkarenperez.com/
Spine: not yet decided for this race. So check 4 gives a count for every taxonomy issue in `src/lib/news-issues.ts` that has at least one passage over the threshold, and check 5 looks at every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Only candidate-controlled sources | PASS | All 15 passages are on `keepkarenperez.com`. No other host. |
| 2 | Quotes are verbatim | PASS | 0 passages marked `states_policy`. Script check: all 15 run.json texts are byte-identical to passages.jsonl. |
| 3 | No inferred motive | PASS | 0 passages marked `states_policy`. |
| 4 | Silence is recorded, not filled | PASS | 0 passages clear both gates for any issue. `areas` is `[]`. One issue (A6) has 1 passage over the issue threshold: a6b8c9f1, which fails both gates. |
| 5 | Possible misses | 1 reported (information only, not a fix) | a6b8c9f1 (A6), borderline. |

## 1. Only candidate-controlled sources: PASS

- All 15 `passages[].url` values in `run.json`, and all 15 in `passages.jsonl`, have host `keepkarenperez.com`, the OFFICIAL_SITE host. Every one of them is the homepage `https://keepkarenperez.com/`. Checked with node (`new URL(url).host` over both files).
- `areas` is `[]`, so there are no citations to check there.
- No other host appears, and `ingest.log` shows no redirect. The ingest also rendered `https://keepkarenperez.com/about` (same host), the only link Jev judged (`links.jsonl`: about 0.91, policy 0.17). It rendered to 23 characters of text and gave 0 passages.

Passage ids (all on the official host): a6b8c9f1, 7c58ac3d, 913c2c4e, 77d272f6, 91092c7a, b57f3a39, c2751614, b796b0ef, b3a294e4, 21d68315, 2938769d, c318b293, b6daf3bd, f2f7822e, 40cd4dcd.

## 2. Quotes are verbatim: PASS

- `counts.states_policy` is 0, and no passage in `run.json` has `verdict.states_policy: true`. No passage needs checking.
- As a stronger check, a node script compared every `run.json` passage with the `passages.jsonl` passage of the same id, using `Buffer.equals` on the UTF-8 text and a strict comparison on the url. Result: 15 of 15 byte-identical. The id sets are equal (15 and 15), and no verdict is null.

## 3. No inferred motive: PASS

No passage is marked as stating a policy, so none can be biography, attack, fundraising or event copy marked as policy. For the record, 14 of the 15 passages are job titles, board memberships and a family line (commitment 0.02 to 0.10, own_commitment 0.03 to 0.14). The run marks all 15 as stating no policy.

## 4. Silence is recorded, not filled: PASS

Counts are of passages with a score of at least 0.85 on the issue question. The "both gates" column counts those that also have `states_policy: true`, which is what the run would turn into a stated position.

| Issue | Passages over threshold (issue score) | Also clear both gates | Coverage |
|---|---|---|---|
| A6 Public school funding and teachers | 1 (a6b8c9f1, A6 = 0.95) | 0 | no_stated_position_found |

Every other taxonomy issue (A1, A2, A3, A4, A5, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8) has 0 passages over the threshold. Each is `no_stated_position_found`.

- a6b8c9f1 has commitment 0.73 and own_commitment 0.20, both under 0.85, so the run marks it `states_policy: false`. `issues: ["A6"]` is recorded on the verdict, but the passage is not grouped into `areas`. A6 is not filled.
- `areas` is `[]`, and `run-report.txt` says "No passage cleared both the commitment gate and an issue question."
- A script confirmed that for all 15 passages, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, and `issues` equals the set of scores at or above 0.85.

Context on coverage, not a failure: the site gave 15 passages (272 words) from one page. `ingest.log` shows the homepage and `/about` rendered to only 73 and 23 characters of text, and 0 policy pages were selected. The silence reflects a thin site as captured, and the run records it as silence.

## 5. Possible misses (information for the founder, not a fix)

- **a6b8c9f1** (A6 Public school funding and teachers; commitment 0.73, own_commitment 0.20, A6 0.95). First 20 words: "As your Hillsborough County School Board member, Karen Perez is a calm and rational voice on the issues confronting our". It goes on: "works diligently to ensure our limited resources make it to the classroom" and "fought uphill battles to make sure the first cuts due to budget shortfalls were at the administration level and not among our teachers and support staff." This is borderline. It is written in the third person about her record as a board member ("She holds…", "She has fought…", "Karen's fight against waste…"), not a pledge in her own voice, which is what the low own_commitment score reflects. It does describe an ongoing priority on classroom funding and protecting teacher and support-staff positions, so a founder may read it as a stated position on A6.

No other passage states a commitment on any taxonomy issue. The other 14 are job titles, board memberships and a personal line, for example 7c58ac3d "Education Advocate – Elected in 2018 as Hillsborough County School Board Member at-large" and 40cd4dcd "Karen Perez has three adult children, eight grandchildren and lives in New Tampa with Riley and Baxter, certified Therapy Dogs…".

## Notes

- **`ingest-report.md` is stale about Step 2.** Its "Step 2: policy run" section shows provenance `q-b2171346` and 52381/6870 tokens. Those are the figures of the one-gate run, now kept in `attempt-1-one-gate/` (where a6b8c9f1 had commitment 0.71). The current `run.json` and `run.log` show `q-e7282116` and 55501/7185 tokens. The outcome is the same in both: 0 passages state a policy.
- In the current run, `counts` (15 asked, 0 stating a policy, 0 with an issue, 0 failed) agrees with the passages.

VERDICT: PASS
