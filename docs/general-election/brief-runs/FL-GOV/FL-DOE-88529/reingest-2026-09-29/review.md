# Step 3 review: FL-DOE-88529 (Moliere "Moe" Dimanche), FL-GOV-general

- RUN_DIR: `docs/general-election/brief-runs/FL-GOV/FL-DOE-88529/reingest-2026-09-29`
- OFFICIAL_SITE: https://nomoecorruption.com/
- SPINE: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Run reviewed: `run.json`, schema `kyv.policy-run/1`, status `complete`, created 2026-09-30T01:59:39.898Z, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85. This is the two-gate run (`commitment` and `own_commitment` must both be >= 0.85). 123 passages asked, 6 marked `states_policy`, 5 with an issue tag, 0 failed, 0 null verdicts. The one-gate run it replaces is kept in `attempt-1-one-gate/`.
- Method: a node script loaded `run.json` and `passages.jsonl` and compared them. It also re-derived `states_policy` (commitment >= 0.85 AND own_commitment >= 0.85) and `issues` (score >= 0.85) from the stored scores. Both matched the stored values for all 123 passages. `areas` holds only the 6 gated passages, as `groupByArea` in `src/lib/policy-noul.ts` requires.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (checked by script) | PASS |
| 3 | No inferred motive (no bio, attack, fundraising or event copy marked as policy) | PASS (with notes) |
| 4 | Silence recorded, not filled | PASS (A1 = 0, A2 = 0, A4 = 0, no_stated_position_found; A3 = 1) |
| 5 | Possible misses (policy on a SPINE issue marked as no policy) | PASS (information only: 1 possible miss, 634a8fbb) |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 123 passage URLs in `run.json` and in `passages.jsonl` are on the host `nomoecorruption.com`. No other host appears. No redirect was involved: `ingest.log` has no redirect, robots, bot-challenge or unreachable lines.

| URL | Passages |
|---|---|
| https://nomoecorruption.com/ | 12 (be2b3dd0, 35f33085, 78f25f50, 40ed9e53, 20db998d, c75f5a06, a455591a, 14275f4c, 634a8fbb, 8a291072, fed82a0b, 0f653308) |
| https://nomoecorruption.com/2024/12/06/judicial-cleanup | 29 |
| https://nomoecorruption.com/judicial-corruption | 82 |

Other hosts: none.

### 2. Quotes verbatim: PASS

The script compared the UTF-8 bytes of `text` (plus `url` and `heading`) for every `run.json` passage against the passage with the same id in `passages.jsonl`. The ids are unique in both files, and the two files hold the same 123 ids.

| id | bytes | result |
|---|---|---|
| 20db998d | 378 | identical |
| 14275f4c | 468 | identical |
| 0f653308 | 167 | identical |
| 58e77567 | 695 | identical |
| 40b7276b | 517 | identical |
| cf66b20a | 551 | identical |

All 123 passages match, not only the 6 policy ones.

### 3. No inferred motive: PASS (with notes)

Each of the 6 passages marked `states_policy` contains a commitment by the candidate. None is only biography, an attack, fundraising or event copy.

| id | first 20 words | commitment in the passage |
|---|---|---|
| 20db998d | "Municipal incorporation of unincorporated county land is imperative to ensure public safety and full service to our communities. Moe led" | "seeks the same for ... all unincorporated lands across the State of Florida" |
| 14275f4c | "While our laws will be followed, we will not re-enact Jim Crow. During the Jim Crow era, Black babies were" | "On Day 1 , Moe will permanently close Alligator Alcatraz." |
| 0f653308 | "HOAs will be abolished under the Dimanche Administration, and Floridians will enjoy their Constitutional right to the pursuit of happiness/property" | "HOAs will be abolished under the Dimanche Administration" |
| 58e77567 | "Florida judges are corrupt to the core and their corruption is a cancer on our society as Floridians. Lawfare is" | "Below are some of the individuals Moe will remove from office" |
| 40b7276b | "A. James Craner, a Rick Scott appointee, blocked the grand jury investigation, blocked Alban and Herdocia from testifying, forced a" | "He will be suspended from office and prosecuted as soon as Moe takes office" |
| cf66b20a | "Moe is most likely going to have the courthouse in your county investigated and audited for corruption. Being on the" | "most likely going to have the courthouse in your county investigated and audited" |

Notes for the founder. These are not failures:

- **58e77567** is mostly an attack on Florida judges. Its only commitment is its last sentence, which introduces a list of officials to remove. Any claim written from it should quote that sentence and nothing else.
- **40b7276b** is mostly an allegation against a named judge ("covered up how Buddy Dyer stole the 2023 election"). The commitment is a personnel action (suspend and prosecute). Its B6 tag (0.95) and KYV1 tag (0.93) come from the allegation, not from an election-integrity policy. Any claim must attribute the allegation to the candidate and must not restate it as fact.
- **cf66b20a** is hedged ("most likely going to"). Keep the hedge in any claim.
- **0f653308** has an A3 (Property taxes, 0.90) tag, but its text only mentions HOAs. The property-tax part comes from the candidate's own section heading, "ABOLISHING HOAs and PROPERTY TAXES ON HOMESTEADS", which the model sees (`src/lib/policy-noul.ts`). That is candidate-authored, so it is within the constitution. But a brief that quotes only the text under A3 would show an HOA sentence. See check 5 for the passage that states the property-tax position in its text.
- **20db998d** matched no taxonomy issue (issues = []). It is the "1 state a policy the taxonomy has no question for" in `run.log`, a candidate-tier issue (municipal incorporation).

### 4. Silence recorded, not filled: PASS

A passage counts when it clears both gates and its score for the issue is >= 0.85. That is the same rule `areas` uses.

| SPINE issue | Passages clearing threshold | Coverage |
|---|---|---|
| A1 Property insurance costs | 0 | no_stated_position_found |
| A2 Housing affordability | 0 | no_stated_position_found |
| A3 Property taxes | 1 (0f653308) | stated |
| A4 Cost of living in Florida | 0 | no_stated_position_found |

No passage scores >= 0.85 on A1, A2 or A4, gated or not. The highest are A2 0.65 and A4 0.71 (8a291072), neither near the threshold. `run-report.txt` and `areas` list nothing under A1, A2 or A4. Three other passages score >= 0.85 on A3 but fail the second gate, so they are not counted: 634a8fbb (0.98, own_commitment 0.80), 8a291072 (0.92, own_commitment 0.47), fed82a0b (0.88, own_commitment 0.42).

### 5. Possible misses: information only

One passage is marked as stating no policy but plainly states the candidate's position on a SPINE issue:

- **634a8fbb** (A3 Property taxes; commitment 0.98, own_commitment 0.80, below 0.85; A3 score 0.98). First 20 words: "HOAs are unconstitutional, and property taxes on Floridians’ homesteads infringes on ownership rights. While property taxes are an important way". It continues: "the state can fund these efforts without taxing property held as the homestead." It sits under the heading "ABOLISHING HOAs and PROPERTY TAXES ON HOMESTEADS", and it is the only passage whose text states the homestead property-tax position. It was gated in the one-gate run and is now excluded because it misses the second gate by 0.05.

Not misses: 8a291072 and fed82a0b (same section, A3 >= 0.85) are complaints about HOAs, with no commitment. A keyword scan of the other 111 non-policy passages (insurance, housing, tax, afford, rent, homestead, mortgage, foreclosure, price, HOA, condo, property) found only narrative about the candidate's own property dispute and court cases. None states a SPINE commitment.

### Other observations (not part of the verdict)

- `ingest-report.md`, section "Step 2: policy run (Jev)", describes the one-gate run in `attempt-1-one-gate/`: provenance `q-b2171346`, 10 state a policy, 8 with an issue, 438473/56334 tokens. It does not describe the current `run.json`: provenance `q-e7282116`, 6, 5, 464057/58917 tokens. The ingest part of that file is still accurate.
- `ingest.log` lists only the two policy pages. The 12 homepage passages come from the homepage itself: 12 + 29 + 82 = 123, which matches `passages.jsonl`.
- The site has no about page and no issues page. Of the 123 passages, 111 come from two judicial-corruption pages. This thin corpus is why A1, A2 and A4 have no coverage.

VERDICT: PASS
