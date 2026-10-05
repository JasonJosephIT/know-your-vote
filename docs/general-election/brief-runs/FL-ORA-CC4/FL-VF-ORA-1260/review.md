# Step 3 review: FL-VF-ORA-1260 (Brian Jones), FL-ORA-CC4-general

Official site: https://brianhubertjones.com/
Inputs reviewed: `passages.jsonl` (6 passages), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, taxonomy v7, two gates: `q_states_policy` and `q_own_commitment`), `ingest.log`.
SPINE: undecided for this race, so every taxonomy issue in `src/lib/news-issues.ts` (25 sub-issues, the same 25 ids `run.json` asked) is considered.
Checks 1, 2 and 4 were run with a node script against the two files, not by eye.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS (0 passages for every issue) |
| 5 | Possible misses (information only) | None on a taxonomy issue; notes below |

## Evidence

### 1. Candidate-controlled sources only: PASS

Every passage url in `run.json` has host `brianhubertjones.com`, the OFFICIAL_SITE host. All six come from one page, `https://brianhubertjones.com/about`: 3dfd9b51, 45030221, 780a3e06, ad7597d1, 4ac0648d, 33d2dcaa. `passages.jsonl` has the same single host. `ingest.log` shows only this site and its about page were read, with no redirect to another host. Other hosts: none.

### 2. Quotes verbatim: PASS

`run.json` marks three passages `states_policy: true`. For each, `text` was compared as UTF-8 bytes (`Buffer.equals`) with the passage of the same id in `passages.jsonl`:

| id | bytes (run / passages) | text | url | heading |
|---|---|---|---|---|
| ad7597d1 | 383 / 383 | byte-identical | matches | matches |
| 4ac0648d | 148 / 148 | byte-identical | matches | matches |
| 33d2dcaa | 106 / 106 | byte-identical | matches | matches |

The three passages marked `false` are byte-identical too (3dfd9b51 247/247, 45030221 68/68, 780a3e06 338/338). The id sets of the two files are identical: no id is in one file only.

### 3. No inferred motive: PASS

None of the three passages marked as stating a policy is only biography, opponent attack, fundraising or event copy. Each carries a commitment by the candidate:

- ad7597d1: "The data is clear: micromobility crashes are not random. They are concentrated around schools, major crossings, and high-traffic corridors. As" (continues "As County Commissioner, I will focus first on the top 10 schools..."). commitment 0.98, own_commitment 0.98.
- 4ac0648d: "I will partner with Orange County Public Schools, the School Board, and safety organizations to move from reactive response to". commitment 0.96, own_commitment 0.97.
- 33d2dcaa: "Protecting children requires leadership—and school-area micromobility safety will be a day-one priority." commitment 0.94, own_commitment 0.92.

The biography passage 3dfd9b51 is marked `false` (commitment 0.04, own_commitment 0.06). For all six passages, `states_policy` equals `commitment >= 0.85 AND own_commitment >= 0.85`, as `readVerdict` in `src/lib/policy-noul.ts` defines it.

### 4. Silence recorded, not filled: PASS

No passage scores at or above 0.85 on any taxonomy issue, with or without the gates. The highest issue score in the run is B7 = 0.47 (4ac0648d). Every passage has `issues: []`, `counts.with_issue` is 0 and `areas` is empty. Counts per issue:

A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8: 0 each, `no_stated_position_found`.

No issue has a passage over the threshold, so there is no non-zero count to report. The run did not fill any issue: `run-report.txt` says no passage cleared both the gate and an issue question.

### 5. Possible misses (information for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue:

- 3dfd9b51: "Brian Jones has been an active part of Orange County District 4 for years, serving his community through leadership on" (biography, no commitment).
- 45030221: "To build a safer community, we must act now on micromobility safety." (commitment 0.70, own_commitment 0.43; a general call to act, below both gates).
- 780a3e06: "E-bikes and e-scooters are faster and more powerful than ever and they are motorized vehicles, not toys. Many can travel" (guidance to parents, not a commitment by the candidate).

45030221 and 780a3e06 concern micromobility safety. That subject has no question in taxonomy v7 (no transportation or traffic-safety issue), so neither is a miss under this check.

Other notes for the founder:

- The three policy passages (ad7597d1, 4ac0648d, 33d2dcaa) all concern school-area micromobility and traffic safety. `run.log` reports "3 state a policy the taxonomy has no question for". Under the constitution this is a candidate-tier issue, not a spine issue.
- Coverage is thin: the ingest read one page (`/about`, 6 passages). The only other link Jev judged, `/vote`, scored policy 0.14 and was not chosen. No policy pages were selected.
- `ingest-report.md` is out of date for Step 2: it gives provenance `q-b2171346` and 21091/2748 tokens, which match the earlier run in `attempt-1-one-gate/`. The current `run.json` has `q-e7282116` and 22339/2874 tokens. The verdicts on `states_policy` are the same in both runs (3 of 6, the same ids).

VERDICT: PASS
