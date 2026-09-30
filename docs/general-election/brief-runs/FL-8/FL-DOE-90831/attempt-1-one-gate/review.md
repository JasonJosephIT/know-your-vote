# Step 3 review: FL-DOE-90831 (Jennifer Jenkins), FL-8-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of this run directory; no site was fetched.

- OFFICIAL_SITE: https://jenkinsforfl.com/
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85 (gate and issue scores both use `>=`, per `src/lib/policy-noul.ts:171` and `applyThreshold`), status `complete`, 30 of 30 passages asked, 0 failed.
- Counts in run.json: 13 passages state a policy; 9 of them match a taxonomy issue.
- SPINE: not yet decided for this race. Check 4 reports every taxonomy issue that has at least one passage at or over the threshold. Check 5 considers every taxonomy issue.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no non-commitment marked as policy) | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | 0 misses found under the check's definition. 4 notes below. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the host of every `url` in run.json and in passages.jsonl. All 30 are on `jenkinsforfl.com`. No other host appears, and no redirect was involved.

| URL | Passages |
|---|---|
| https://jenkinsforfl.com/ | 9 |
| https://jenkinsforfl.com/priorities | 16 |
| https://jenkinsforfl.com/about | 5 |

According to `links.jsonl`, Jev judged three links. `/es` ("Conozca al Jennifer") was not chosen and was not fetched.

Minor log discrepancy, not a source problem: `ingest.log` prints "6 passage(s)" for /about, but run.json, passages.jsonl and ingest-report.md all hold 5. The totals still reconcile at 30.

### 2. Quotes verbatim: PASS

A node script compared each of the 13 run.json passages with `verdict.states_policy === true` against the passage with the same id in passages.jsonl. It checked `Buffer.equals` on the UTF-8 text, plus an exact url match. Result: 0 mismatches and 0 missing ids.

The same script also checked every passage (30 of 30, 0 mismatches) and all 10 citations embedded in `run.areas` (0 mismatches).

The ids checked were 56548925, 21accd36, bce93cad, a85a5a67, 176f584a, 640821fa, b5b97b91, f013e79d, 8bc09b3e, 6f3d321a, 089e0cee, 8df486c3 and 467dbd0c.

Note: `run-report.txt` cuts off the display of 467dbd0c with "…". That affects only the printed report. The stored text in run.json is complete and byte-identical.

### 3. No inferred motive: PASS

Each of the 13 passages marked `states_policy` is a forward-looking commitment by the candidate. None is only biography, an attack on an opponent, fundraising copy or event copy.

| id | Commitment | Text |
|---|---|---|
| 56548925 | 0.96 | Stabilize Florida's property insurance market through bipartisan federal reinsurance and catastrophe backstops. |
| 21accd36 | 0.98 | Oppose reckless tariffs that drive up the cost of everyday goods. |
| bce93cad | 0.95 | Fight for tax and cost-of-living policies that put working families first, not special interests. |
| a85a5a67 | 0.98 | Expand Medicaid so Floridians aren't forced into emergency care or medical debt. |
| 176f584a | 0.97 | Restore and strengthen ACA subsidies to lower premiums immediately. |
| 640821fa | 0.97 | Protect coverage for pre-existing conditions and invest in access to mental health care. |
| b5b97b91 | 0.95 | Ensure first responders have stable funding, training, and mental health support. |
| f013e79d | 0.97 | Support evidence-based public safety strategies that reduce violence and recidivism. |
| 8bc09b3e | 0.91 | Protect the constitutional rights of U.S. citizens and immigrants alike, because safety and civil liberties go hand in hand. |
| 6f3d321a | 0.97 | Protect the U.S. Department of Education and federal civil rights enforcement in schools. |
| 089e0cee | 0.98 | Fully fund IDEA and defend Section 504, ensuring students with disabilities receive the supports they are guaranteed by law. |
| 8df486c3 | 0.98 | Expand Title I and invest in teachers, classrooms, and student mental health. |
| 467dbd0c | 0.95 | Now, Jennifer is running for Congress to take that same courage and determination to Washington. She'll fight to lower costs, address the broken property insurance system, protect health care, and ensure... |

About 467dbd0c: it comes from the /about page, and its first sentence is campaign framing. The second sentence ("She'll fight to lower costs, address the broken property insurance system, protect health care…") is a stated commitment, so the gate is correct. It is the broadest of the 13.

The gate correctly held back all of the opponent-attack passages: 7a6a87a7, 42812761, 9f25cda1, 7f97da0f and fd13b8ea. It also held back the fundraising passages (e5ad958a and c87a8d01) and the biography passages (ada168b4, 07c13a57, bfe8b78a, 15f790bb, 1690a237 and 7e1bfc8b).

### 4. Silence recorded, not filled: PASS

Two counts are given for each issue. **Raw** is every passage with a score at or over 0.85, which is what `verdict.issues` lists. **Cited** is the subset that also passed the policy gate, and so appears in `run.areas`. Only cited passages can become stated_position claims.

| Issue | Label | Raw ≥ 0.85 | Cited (gated) | Coverage |
|---|---|---|---|---|
| A1 | Property insurance costs | 2 (56548925, 467dbd0c) | 2 | stated |
| B1 | Economy, inflation, and jobs | 1 (21accd36) | 1 | stated |
| B2 | Healthcare access and costs | 5 (a85a5a67, 176f584a, 640821fa, 467dbd0c, 1a37f02f) | 4 (not 1a37f02f) | stated |
| B7 | Crime policy, policing and courts | 2 (f013e79d 0.89, b5b97b91 0.85) | 2 | stated |
| A6 | Public school funding and teachers | 1 (8df486c3) | 1 | stated |
| A4 | Cost of living in Florida | 1 (c0340854, the section lead-in "…In Congress, she will:") | **0** | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 1 (7f97da0f, the Ethics Commission attack on the opponent) | **0** | no_stated_position_found |

Every other taxonomy issue has **0** passages at or over the threshold and is recorded as `no_stated_position_found`. Those issues are A2, A3, A5, A7, KYV9, KYV10, B3, B4, B5, B6, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7 and KYV8.

`run.areas` contains only A1, A6, B1, B2 and B7. The raw hits on A4 and KYV1, which the gate held back, did not leak into a Position, so neither silence has been filled. B7 b5b97b91 sits exactly at the threshold (0.85). It is included because the comparison is `>=`.

### 5. Possible misses (information for the founder, not a fix)

**Passages the run marks as stating no policy that plainly state a commitment on a taxonomy issue: none found.**

The closest candidates are the four section lead-ins below. None of them is itself a commitment, because each hands off to the bullets that follow.

- c0340854: "Jennifer understands Florida's cost crisis because she lives it. From groceries to property insurance, everyday expenses are out of control. In Congress, she will:"
- 1a37f02f: "While GOP leadership has stood with MAGA extremists who cut Medicaid and allowed Affordable Care Act Subsidies to expire, families are seeing health insurance premiums spike. Jennifer will:"
- 4b6cd5c8: "The daughter of a corrections officer, Jennifer Jenkins has always stood with law enforcement. She also knows that safety requires trust, not fear. In Congress, she will:"
- 8022a4c2: "Jennifer Jenkins took on the co-founder of Moms for Liberty and won. On the Brevard County School Board, she fought back against culture war distractions to deliver results for students, parents, and teachers. In Congress, she will:"

The run did capture the bullets that follow each of these.

**Related note, outside check 5's definition.** Four passages cleared the policy gate but matched no issue at or over 0.85. They are commitments that currently sit under no issue:

- bce93cad: "Fight for tax and cost-of-living policies that put working families first, not special interests." Top scores: B1 0.69, A4 0.45.
- 8bc09b3e: "Protect the constitutional rights of U.S. citizens and immigrants alike, because safety and civil liberties go hand in hand." Top scores: B7 0.57, B3 0.51.
- 6f3d321a: "Protect the U.S. Department of Education and federal civil rights enforcement in schools." Top scores: KYV1 0.13, A6 0.10.
- 089e0cee: "Fully fund IDEA and defend Section 504, ensuring students with disabilities receive the supports they are guaranteed by law." Top score: A6 0.44.

Two of these fall on the education side. 6f3d321a and 089e0cee both sit under the site's own "Education" heading, but the A6 label ("Public school funding and teachers") did not claim them. Whether federal education administration and special education belong under A6 is a taxonomy question for the founder. This review does not assign them.

VERDICT: PASS
