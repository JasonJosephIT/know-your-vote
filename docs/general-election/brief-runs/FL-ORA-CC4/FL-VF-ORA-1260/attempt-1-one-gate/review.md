# Step 3 review: FL-VF-ORA-1260 (Brian Jones), FL-ORA-CC4-general

Official site: https://brianhubertjones.com/
Inputs reviewed: `passages.jsonl` (6 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, taxonomy v7), `ingest.log`.
SPINE: undecided for this race, so every taxonomy issue in `src/lib/news-issues.ts` (25 sub-issues) is considered.
Checks 1, 2 and 4 were run with a node script against the two files, not by eye.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS (0 passages for every issue) |
| 5 | Possible misses (information only) | None on a taxonomy issue; one note below |

## Evidence

### 1. Candidate-controlled sources only: PASS

Every passage url in `run.json` has host `brianhubertjones.com`, the OFFICIAL_SITE host. All six come from one page, `https://brianhubertjones.com/about`: 3dfd9b51, 45030221, 780a3e06, ad7597d1, 4ac0648d, 33d2dcaa. The same holds for `passages.jsonl`. `ingest.log` shows only this site and its about page were fetched; no redirects to another host. Other hosts: none.

### 2. Quotes verbatim: PASS

`run.json` marks three passages `states_policy: true`. For each, `text` was compared as UTF-8 bytes with the passage of the same id in `passages.jsonl`:

| id | bytes (run / passages) | result | url |
|---|---|---|---|
| ad7597d1 | 383 / 383 | byte-identical | matches |
| 4ac0648d | 148 / 148 | byte-identical | matches |
| 33d2dcaa | 106 / 106 | byte-identical | matches |

The id sets of the two files are identical (no id in one file only).

### 3. No inferred motive: PASS

None of the three passages marked as stating a policy is only biography, opponent attack, fundraising or event copy. Each has a first-person or campaign commitment:

- ad7597d1: "The data is clear: micromobility crashes are not random. They are concentrated around schools, major crossings, and high-traffic corridors. As" (continues "As County Commissioner, I will focus first on the top 10 schools...")
- 4ac0648d: "I will partner with Orange County Public Schools, the School Board, and safety organizations to move from reactive response to"
- 33d2dcaa: "Protecting children requires leadership—and school-area micromobility safety will be a day-one priority."

The biography passage 3dfd9b51 is correctly marked `states_policy: false` (commitment 0.04). The `states_policy` flag matches `commitment >= 0.85` for all six passages.

### 4. Silence recorded, not filled: PASS

No passage scores at or above the 0.85 threshold on any taxonomy issue, with or without the commitment gate. `run.json` has `counts.with_issue: 0`, every passage has `issues: []`, and `areas` is empty. So no taxonomy issue has a passage over the threshold, and every one is 0, recorded as `no_stated_position_found`:

A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8: 0 each, `no_stated_position_found`.

The run did not fill any issue. `run-report.txt` states that no passage cleared both the gate and an issue question.

### 5. Possible misses (information for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment on a taxonomy issue:

- 3dfd9b51: "Brian Jones has been an active part of Orange County District 4 for years, serving his community through leadership on" (biography, no commitment)
- 780a3e06: "E-bikes and e-scooters are faster and more powerful than ever and they are motorized vehicles, not toys. Many can travel" (guidance to parents, not a commitment by the candidate)
- 45030221: "To build a safer community, we must act now on micromobility safety." (commitment 0.72, below the gate)

Note on 45030221: it is a general call to act on micromobility safety. That subject is not a taxonomy issue, so it is not a miss under this check.

Also for the founder: the three policy passages (ad7597d1, 4ac0648d, 33d2dcaa) all concern school-area micromobility and traffic safety. The taxonomy has no question for that subject, and `run.log` reports "3 state a policy the taxonomy has no question for". Under the constitution this is a candidate-tier issue, not a spine issue. Coverage is thin: the ingest read one page (`/about`). The only other link Jev judged, `/vote`, scored policy 0.14 and was not chosen, and no policy pages were selected.

VERDICT: PASS
