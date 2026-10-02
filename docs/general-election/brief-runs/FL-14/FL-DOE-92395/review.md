# Step 3 review: FL-DOE-92395 (Brian Lambert, FL-14-general)

Reviewer run on 2026-09-30, read-only, against the files in this directory:
`passages.jsonl` (171 passages), `run.json` (schema `kyv.policy-run/1`, status `complete`,
model `jev-1.13.0`, taxonomy v7, threshold 0.85, provenance `jev:jev-1.13.0/tax-7/q-e7282116`,
171 asked, 14 `states_policy`, 4 `with_issue`, 0 failed) and `ingest.log`.

This is the two-gate run (`q_states_policy` and `q_own_commitment`). The earlier one-gate run and
its review are in `attempt-1-one-gate/`.

SPINE is undecided for this race, so check 4 covers every taxonomy issue in
`src/lib/news-issues.ts` (the 25 issue question ids in `run.json`), and check 5 considers every
taxonomy issue.

All checks were run with a node script (in the reviewer's scratchpad, not committed) that loads
both files and compares them. It also confirmed the run is internally consistent:
- `states_policy` equals `commitment >= 0.85 AND own_commitment >= 0.85` on all 171 passages.
- Each passage's `issues` array is exactly its issue scores at or above 0.85.
- `areas` (the published findings) cites only 4 passages (`c5cb4c19`, `fdf3227a`, `f3796b4c`,
  `4abcfde7`), and all 4 have `states_policy: true`.

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | Reported: 13 passages |

## 1. Candidate-controlled sources only: PASS

- All 171 passage URLs in `run.json` have host `www.brianlambertforcongress.com`, the
  OFFICIAL_SITE host. The same holds for all 171 rows of `passages.jsonl` and all 10 rows of
  `links.jsonl`.
- `ingest.log` lists the site root plus 8 pages, all on that host, with no redirect to another
  host: `/`, `/issues/fiscal-responsibility`, `/issues/veterans`, `/issues/election-integrity`,
  `/issues/constitutional-government`, `/issues/individual-liberty`, `/issues`,
  `/why-libertarian`, `/about-brian`.
- Other hosts: none.

## 2. Quotes verbatim: PASS

The script matched each `states_policy: true` passage by id to `passages.jsonl` and compared
`text` as UTF-8 bytes (`Buffer.equals`), plus `url`. All 14 are byte-identical with the same URL:

`2b0b9a59`, `2ea4db62`, `e062a159`, `3c24523a`, `569d85a2`, `4abcfde7`, `3e812651`,
`abf2ecdb`, `f77de592`, `73a0e414`, `f3796b4c`, `fdf3227a`, `c5cb4c19`, `1ac559d5`.

The same comparison over all 171 passages found 0 mismatches and no run id missing from
`passages.jsonl`.

## 3. No inferred motive: PASS

None of the 14 `states_policy` passages is only biography, an attack on an opponent,
fundraising, or event copy. Each contains a commitment in the candidate's own voice ("I will",
"I support", "Every vote I take", or an imperative on the `/issues` summary page):

| id | page / heading | first words |
|----|----------------|-------------|
| 2b0b9a59 | `/` Your Money | Lower taxes. Responsible spending. End government waste. |
| 2ea4db62 | `/` Constitution First | The Constitution limits the government, not the citizen. Every vote I cast will begin with one question: Is this constitutional? |
| e062a159 | `/` Citizen Legislator | Congress should be filled with citizens who serve for a time—not politicians who build lifelong careers in Washington. I will |
| 3c24523a | `/` Fiscal Responsibility | Washington does not have a revenue problem—it has a spending problem. I will fight for balanced budgets, honest accounting, and |
| 569d85a2 | `/` Veterans | Veterans earned their benefits through service and sacrifice. I will fight for greater choice, less bureaucracy, real accountability, and care |
| 4abcfde7 | `/issues/election-integrity` Where I Stand | I support election systems that are secure, transparent, and easy for eligible citizens to use while making fraud difficult to |
| 3e812651 | `/issues/constitutional-government` Begin with the Constitution | Every vote I take will begin with whether the Constitution authorizes the federal government to act. |
| abf2ecdb | `/issues` Fiscal Responsibility | Restore fiscal discipline, balance the budget, and protect future generations from crushing debt. |
| f77de592 | `/issues` Individual Liberty | Protect the freedoms guaranteed by the Bill of Rights and defend individual choice. |
| 73a0e414 | `/issues` Second Amendment | Protect the right to keep and bear arms and defend the Constitution without compromise. |
| f3796b4c | `/issues` Border Security & Immigration | Secure every border and port of entry while supporting legal immigration and the rule of law. |
| fdf3227a | `/issues` Healthcare Reform | Restore patient choice, medical freedom, price transparency, and competition while reducing unnecessary federal interference in healthcare. |
| c5cb4c19 | `/issues` Economy & Small Business | Lower taxes, reduce regulation, and let American entrepreneurs succeed. |
| 1ac559d5 | `/why-libertarian` Why I Believe | That's why I believe Congress should balance the budget instead of passing debt to our children. |

Passages flagged: none. `3c24523a` opens with a characterization of "Washington", not of a
named opponent, and follows it with a commitment. The biography passages on `/about-brian` and
the "Father of Three" passage (`772b9b8e`) were all gated out.

## 4. Silence recorded, not filled: PASS

Counts per taxonomy issue. "Published" = passages that clear both gates and score at or above
0.85 on the issue (what reaches `areas`). "Score only" = passages scoring at or above 0.85 on the
issue regardless of the gate, shown for completeness; those did not reach the findings.

| Issue | Label | Published | Coverage | Score only (not published) |
|-------|-------|-----------|----------|------------------------------|
| A7 | Elections administration and voting access | 1 (`4abcfde7`) | stated | 9 |
| B6 | Election integrity | 1 (`4abcfde7`) | stated | 11 |
| B1 | Economy, inflation, and jobs | 1 (`c5cb4c19`) | stated | 4 |
| B2 | Healthcare access and costs | 1 (`fdf3227a`) | stated | 2 |
| B3 | Immigration and border enforcement | 1 (`f3796b4c`) | stated | 1 |
| KYV2 | Energy and utilities | 0 | no_stated_position_found | 2 (`4582445b`, `69d1c80d`) |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found | 1 (`362df6e6`) |
| A1, A2, A3, A4, A5, A6, KYV9, KYV10, B4, B5, B7, B8, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 | (18 issues) | 0 | no_stated_position_found | 0 |

The run fills no silence: `areas` holds only B1, B2, B3, A7 and B6, each backed by one
`states_policy` passage. The 10 `states_policy` passages with no issue over threshold (fiscal
discipline, constitutional review, citizen legislator, veterans, Bill of Rights, Second
Amendment) are left untagged rather than forced onto a taxonomy issue. Under the constitution
those are candidate-tier issues (fiscal responsibility / balanced budget, constitutional
government, term service, Second Amendment, veterans), not spine positions.

## 5. Possible misses (information for the founder, not a fix)

Passages the run marks `states_policy: false` that state a commitment on a taxonomy issue. In
every case the first gate (`commitment`) is high and the second gate (`own_commitment`) is below
0.85; 38 passages in this run clear the first gate and fail only the second. Most are
"should"-phrased planks under an action heading on the candidate's own issue pages.

| id | page / heading | c / own | issue scores >= 0.5 | first 20 words |
|----|----------------|---------|---------------------|----------------|
| ee144dfb | `/issues/election-integrity` Where I Stand | 0.97 / 0.79 | A7 0.96, B6 0.86 | States should continue leading election administration while Congress respects constitutional limits on federal authority. |
| 598ea509 | `/issues` Election Integrity | 0.83 / 0.63 | B6 0.88, A7 0.70, KYV1 0.56 | Restore confidence through transparency, accountability, and secure elections. |
| 47e0db33 | `/issues/election-integrity` Support Secure Elections | 0.85 / 0.34 | B6 0.96, A7 0.93 | Election systems should protect against fraud while remaining accessible to lawful voters. |
| 21eef4db | `/issues/election-integrity` Respect Constitutional Authority | 0.90 / 0.55 | A7 0.93, B6 0.83 | Election administration should remain consistent with the Constitution and the role of the states. |
| 4e07f0e7 | `/issues/election-integrity` Promote Transparency | 0.86 / 0.43 | B6 0.95, A7 0.80, KYV1 0.55 | Election processes should be open, observable, and accountable to the public. |
| 169c8bc1 | `/issues/election-integrity` Ensure Equal Application of the Law | 0.92 / 0.56 | B6 0.93, A7 0.88, KYV1 0.60 | Election laws should be applied fairly and consistently to every voter, every campaign, and every jurisdiction. |
| 9eb3d8e8 | `/issues/election-integrity` Protect Every Legal Vote | 0.85 / 0.33 | A7 0.96, B6 0.96 | Every eligible citizen should be able to vote, and every legal vote should be counted accurately. |
| 93876ec1 | `/issues/veterans` Expand Community Care | 0.95 / 0.70 | B2 0.90 | When the VA cannot provide timely treatment, veterans should have access to care in their own communities. |
| 2c82bbbe | `/issues/veterans` Respect Veteran Choice | 0.94 / 0.70 | B2 0.69 | Veterans should have access to traditional medicine, community care, mental health support, and complementary, holistic, herbal, and alternative therapies when |
| 3cedc60a | `/issues/individual-liberty` Healthcare Reform | 0.93 / 0.57 | (B2 0.22) | Patients should control their healthcare decisions without unnecessary government interference. |
| 7000e360 | `/issues/fiscal-responsibility` Stop Inflationary Money Printing | 0.93 / 0.61 | B1 0.98 | Printing trillions of dollars devalues every paycheck and every retirement account. |
| 1f50f5a5 | `/issues` Education | 0.88 / 0.67 | (A6 0.40) | Education is not one-size-fits-all. Empower parents, support teachers, and give every child the opportunity to succeed. |
| 362df6e6 | `/issues/constitutional-government` Respect Separation of Powers | 0.91 / 0.53 | KYV1 0.85 | No branch of government should be allowed to exceed its constitutional role. |

Notes on the list:
- `598ea509`, `1f50f5a5` are on `/issues`, the same summary page whose parallel imperative
  entries (`c5cb4c19`, `fdf3227a`, `f3796b4c`) passed both gates.
- `7000e360`: the commitment is in the heading ("Stop Inflationary Money Printing"); the text
  itself is descriptive.
- `3cedc60a` (healthcare) and `1f50f5a5` (education) would also miss on the issue score, so
  lowering the second gate alone would not publish them under B2 / A6.
- `362df6e6` is borderline for KYV1, whose label is "Threats to democratic institutions".
- Not listed as misses: `4582445b` and `69d1c80d` (KYV2 energy, 0.92) describe a value
  ("Affordable, reliable American energy strengthens...") without a commitment, and `2a424cdd`
  and `3631c60a` (B1) describe a condition or belief, not a commitment.
- Gate-only near misses on candidate-tier topics (no taxonomy issue), not counted above:
  `9dacff21` (Pass a Balanced Budget, 0.97 / 0.83), `d06a84db` (Eliminate Unconstitutional
  Bureaucracies, 0.97 / 0.83), `76f738fc` (separation of powers, 0.97 / 0.82), `e3271b30`
  (Defend the Second Amendment, 0.96 / 0.77).

VERDICT: PASS
