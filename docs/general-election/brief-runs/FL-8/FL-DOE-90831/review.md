# Step 3 review: FL-DOE-90831 (Jennifer Jenkins), FL-8-general

Reviewer: Step 3, under the Profiler constitution. This is a read-only review of the run directory. No website was fetched.

- OFFICIAL_SITE: https://jenkinsforfl.com/
- Run reviewed: `run.json`, `jev:jev-1.13.0/tax-7/q-e7282116`, created 2026-09-30T01:58:44Z. It uses two gates, `q_states_policy` and `q_own_commitment`. Threshold is 0.85, and gates and issue scores both use `>=` (`src/lib/policy-noul.ts`, `statesPolicy` and `applyThreshold`). Status `complete`: 30 of 30 passages asked, 0 failed.
- Counts in run.json: 12 passages state a policy, and 8 of those match a taxonomy issue. `run.areas` holds 8 citations.
- SPINE: not decided for this race. Check 4 reports every taxonomy issue (tax-7, 25 sub-issues) with at least one passage at or over the threshold. Check 5 considers every taxonomy issue.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no non-commitment marked as policy) | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | 1 possible miss: 8bc09b3e |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the host of every `url` in run.json (30 passages) and passages.jsonl (30 passages). All 60 are on `jenkinsforfl.com`. No other host appears, and no redirect was involved.

| URL | Passages |
|---|---|
| https://jenkinsforfl.com/ | 9 |
| https://jenkinsforfl.com/priorities | 16 |
| https://jenkinsforfl.com/about | 5 |

According to `links.jsonl`, Jev judged three links. `/es` ("Conozca al Jennifer") was not chosen and was not fetched. All 8 citations in `run.areas` are on `https://jenkinsforfl.com/priorities`.

### 2. Quotes verbatim: PASS

A node script compared each of the 12 run.json passages with `verdict.states_policy === true` against the passage with the same id in passages.jsonl. It used `Buffer.equals` on the UTF-8 text and required an exact url match. Result: 0 mismatches and 0 missing ids.

The ids checked were 56548925, 21accd36, bce93cad, a85a5a67, 176f584a, 640821fa, b5b97b91, f013e79d, 6f3d321a, 089e0cee, 8df486c3 and 467dbd0c.

The same script also checked the other passages and the citations:
- All 30 passages: 0 mismatches.
- All 8 citations in `run.areas`: 0 text or url mismatches.
- Every cited passage has `states_policy: true`.

### 3. No inferred motive: PASS

Each of the 12 passages marked `states_policy` is a forward-looking commitment by the candidate. None is only biography, an attack on an opponent, fundraising copy or event copy.

| id | commitment / own | First 20 words |
|---|---|---|
| 56548925 | 0.97 / 0.92 | Stabilize Florida's property insurance market through bipartisan federal reinsurance and catastrophe backstops. |
| 21accd36 | 0.98 / 0.92 | Oppose reckless tariffs that drive up the cost of everyday goods. |
| bce93cad | 0.96 / 0.86 | Fight for tax and cost-of-living policies that put working families first, not special interests. |
| a85a5a67 | 0.98 / 0.93 | Expand Medicaid so Floridians aren't forced into emergency care or medical debt. |
| 176f584a | 0.98 / 0.94 | Restore and strengthen ACA subsidies to lower premiums immediately. |
| 640821fa | 0.97 / 0.95 | Protect coverage for pre-existing conditions and invest in access to mental health care. |
| b5b97b91 | 0.95 / 0.89 | Ensure first responders have stable funding, training, and mental health support. |
| f013e79d | 0.96 / 0.94 | Support evidence-based public safety strategies that reduce violence and recidivism. |
| 6f3d321a | 0.97 / 0.93 | Protect the U.S. Department of Education and federal civil rights enforcement in schools. |
| 089e0cee | 0.98 / 0.97 | Fully fund IDEA and defend Section 504, ensuring students with disabilities receive the supports they are guaranteed by law. |
| 8df486c3 | 0.98 / 0.95 | Expand Title I and invest in teachers, classrooms, and student mental health. |
| 467dbd0c | 0.95 / 0.94 | Now, Jennifer is running for Congress to take that same courage and determination to Washington. She'll fight to lower costs, … |

The borderline case is 467dbd0c, from the /about page. It opens with a biographical bridge, but its second sentence states commitments: "She'll fight to lower costs, address the broken property insurance system, protect health care…". It is not only biography, so it passes.

None of the five opponent-attack passages (7a6a87a7, 42812761, 9f25cda1, 7f97da0f, fd13b8ea), the two fundraising passages (e5ad958a, c87a8d01) or the biography passages is marked `states_policy`.

### 4. Silence recorded, not filled: PASS

The table below lists each taxonomy issue with at least one passage at or above 0.85 on that issue. Only passages that also clear both gates count as a stated position. A passage that clears the issue score but fails a gate is shown separately and marked `*`.

| Issue | Stated-position passages over threshold | Ids | Over threshold but gated out (not cited) |
|---|---|---|---|
| A1 Property insurance costs | 1 | 56548925 | none |
| A4 Cost of living in Florida | **0: no_stated_position_found** | none | c0340854* (A4 0.85; commitment 0.29 / own 0.41) |
| A6 Public school funding and teachers | 1 | 8df486c3 | none |
| B1 Economy, inflation, and jobs | 1 | 21accd36 | none |
| B2 Healthcare access and costs | 3 | a85a5a67, 176f584a, 640821fa | 1a37f02f* (B2 0.90; commitment 0.38 / own 0.31) |
| B7 Crime policy, policing and courts | 2 | b5b97b91, f013e79d | none |
| KYV1 Threats to democratic institutions | **0: no_stated_position_found** | none | 7f97da0f* (KYV1 0.89; commitment 0.06 / own 0.05) |

The run did not fill any silence:
- The three gated-out passages carry an issue id in `verdict.issues` but `states_policy: false`, so they appear in neither `run.areas` nor `run-report.txt`.
  - c0340854 and 1a37f02f are lead-in sentences ending "…she will:" / "Jennifer will:".
  - 7f97da0f is an attack on the opponent.
- The report's A4 and KYV1 counts are 0. They are recorded as 0 and are not topped up with neighbouring passages.

The other 18 taxonomy issues have no passage at or above the threshold, so each is 0 (no_stated_position_found): A2, A3, A5, A7, B3, B4, B5, B6, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9 and KYV10.

### 5. Possible misses (information for the founder, not a fix)

One possible miss:

- **8bc09b3e** (/priorities, heading "Public Safety"): "Protect the constitutional rights of U.S. citizens and immigrants alike, because safety and civil liberties go hand in hand."
  - It is one of the bullets under "In Congress, she will:" and plainly states a commitment by the candidate.
  - It passed the first gate (commitment 0.90) and failed the second (own_commitment 0.72 < 0.85).
  - Its highest issue scores are B7 0.60 and B3 0.55. Both are below threshold, so even with the gate passed it would carry no issue tag.
  - The earlier one-gate run (`attempt-1-one-gate/`) marked this passage `states_policy`. The second gate is the change that dropped it.

The other `states_policy: false` passages that mention an issue are not misses:
- c0340854, 1a37f02f, 4b6cd5c8 and 8022a4c2 are lead-ins that end in "…she will:". They introduce commitments but do not state one.
- 07c13a57, 15f790bb, 1690a237, ada168b4, bfe8b78a and 7e1bfc8b describe biography or past record.

The run's own count also has something the founder should see. `run.log` notes "4 state a policy the taxonomy has no question for": bce93cad, 6f3d321a, 089e0cee and 467dbd0c. Each cleared both gates but scored below 0.85 on every issue, so none of them appears in `run.areas`. They are not check 5 misses, because they are marked as stating a policy. Per check 4, this review does not assign them an issue.

### Notes (not check failures)

- `ingest-report.md` is stale for Step 2. It still describes the earlier one-gate policy run (`q-b2171346`, 13 state a policy, 9 matched, 105136 tokens in). The current `run.json` and `run.log` are `q-e7282116`, with 12 and 8 (111376 tokens in). The ingest half of the report (30 passages, 9/16/5 by page) still matches.
- `ingest.log` prints "6 passage(s)" for /about, while passages.jsonl, run.json and ingest-report.md all hold 5. The totals still reconcile at 30.

VERDICT: PASS
