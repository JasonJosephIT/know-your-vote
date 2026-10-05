# Step 3 review: FL-DOE-89778 (Branden Scrivener), FL-12-general

Reviewer: Step 3 (read-only, under the Profiler constitution). No site was fetched. The inputs were `passages.jsonl` (11 passages), `run.json` and `ingest.log`. `run.json` is `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, with 11 asked and 0 failed. This run uses two gates: `states_policy` is true only when both `commitment` and `own_commitment` are `>= 0.85` (`readVerdict` in `src/lib/policy-noul.ts`).

SPINE: undecided for this race. Check 4 therefore reports every one of the 25 taxonomy sub-issues in `src/lib/news-issues.ts` (A1–A7, B1–B8, KYV1–KYV10), and check 5 considers all of them. A passage "clears the threshold" for an issue when its score is `>= 0.85`, the comparison `applyThreshold` makes in `src/lib/news-characterize.ts`.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 11 passage urls are `https://brandenscrivenerfl.info/`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | The 3 policy passages (80cffe6c, beb4417b, 4c4aeea6) are byte-identical to `passages.jsonl`. So are all 11 passages and the 3 citations under `areas`. |
| 3 | No inferred motive | **PASS** | None of the 3 policy passages is only biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | **PASS** | A6 = 1, KYV9 = 1 and KYV3 = 1, all gated. B1 = 1 on its issue score, but that passage (642c3734) fails the gate, so it yields no citation. The other 21 issues are 0 (`no_stated_position_found`). |
| 5 | Possible misses (information only) | **1 borderline** | 642c3734 (cost of living) was dropped by the second gate. See below. |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` `passages[]` and in `passages.jsonl` with `new URL(...).host`. Both files contain a single host, `brandenscrivenerfl.info`, which is the OFFICIAL_SITE host. No redirect was involved. `ingest.log` shows 1 page crawled, 5 homepage links, 0 policy pages selected and no about page, so every passage comes from the homepage.

Note: the *text* of passage 9813934a is the bare string `https://linktr.ee/Citzensforbrandenscrivener`. Its source url is the official site, so it is not an off-host source. The run marks it `states_policy: false` (commitment 0.03, own_commitment 0.04), so no claim can come from it.

### 2. Quotes verbatim: PASS

A node script took each `run.json` passage and compared it with the `passages.jsonl` row that has the same id, using `Buffer.equals` on the UTF-8 text:

| id | states_policy | text byte-equal | url equal | heading equal |
|---|---|---|---|---|
| 80cffe6c | true | yes | yes | yes |
| beb4417b | true | yes | yes | yes |
| 4c4aeea6 | true | yes | yes | yes |
| the other 8 | false | yes | yes | yes |

The citation copies under `run.json` `areas` (A6 → beb4417b, KYV9 → beb4417b, KYV3 → 4c4aeea6) also match `passages.jsonl` byte for byte. Both files have the same 11 ids, and neither has an id the other lacks.

### 3. No inferred motive: PASS

These are the three passages marked `states_policy: true`:

- **80cffe6c** (Government Reform, commitment 0.99, own 0.97): "All political offices need strict term limits. I believe 8 years is sufficient for the House. Someone serving a decade long…" It makes explicit commitments: term limits, uncapping the House, campaign finance reform and "I will advocate for open primaries".
- **beb4417b** (Invest in local public education, commitment 0.97, own 0.88): "We have shifted our focus to develop Charter and other 3rd party school systems over public education. I believe in…" It commits to "Funding for public education should not be diverted to these programs".
- **4c4aeea6** (Data Privacy & Development, commitment 0.98, own 0.88): "Your data should be protected and required to be accessed by the government with the use of a warrant. They should…" It makes explicit commitments: a warrant requirement, "No AI data centers paid for by Floridians" and expanding public transportation.

No passage is flagged.

### 4. Silence recorded, not filled: PASS

This table counts, for every taxonomy issue, the passages whose `run.json` score is `>= 0.85`. The "gated" column counts only passages that also have `states_policy: true`, and only those passages reach `areas`.

| Issue | Label | Passages over threshold | Of which gated | Coverage in this run |
|---|---|---|---|---|
| A6 | Public school funding and teachers | 1 (beb4417b, 0.98) | 1 | stated |
| KYV9 | School choice and vouchers | 1 (beb4417b, 0.97) | 1 | stated |
| KYV3 | Growth, development and land conservation | 1 (4c4aeea6, 0.95) | 1 | stated |
| B1 | Economy, inflation, and jobs | 1 (642c3734, 0.87) | 0 | no_stated_position_found |
| A1 | Property insurance costs | 0 | 0 | no_stated_position_found |
| A2 | Housing affordability | 0 | 0 | no_stated_position_found |
| A3 | Property taxes | 0 | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | 0 | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | 0 | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | 0 | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | 0 | no_stated_position_found |
| B5 | Abortion policy | 0 | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | 0 | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | 0 | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | 0 | no_stated_position_found |

`run.json` `areas` lists exactly the three gated issue/passage pairs. B1 is the one issue where the counts disagree. Passage 642c3734 scores 0.87 on B1, and `issues: ["B1"]` is recorded on its verdict. It fails the second gate (own_commitment 0.51), so `states_policy` is false and it does not appear in `areas`. The run therefore leaves B1 unfilled rather than filling it. That is the fail-closed behavior the constitution asks for, so it is not a failure.

`run-report.txt` records one passage that "state[s] a policy the taxonomy has no question for". That passage is 80cffe6c, which passes the gate with `issues: []`. Under the constitution, its content is a candidate-tier issue for this candidate. This review does not assign it to a taxonomy issue.

### 5. Possible misses (information for the founder)

The 8 passages marked `states_policy: false`, with their first 20 words:

- **642c3734** (Quality of Life; commitment 0.91, own 0.51; B1 0.87): "Cost of living has skyrocketed and continues to rise. We need to change fundamentals rather than only addressing the symptoms. The…" **Borderline possible miss.** It is written in the candidate's own voice and takes a stance on cost of living and the economy ("The interest of working class Americans must be prioritized over those of foreign nations or corporate capital"). It names no specific measure. The previous one-gate run (`attempt-1-one-gate/`) counted it as a B1 policy passage, and the new `own_commitment` gate is what drops it. The founder should decide whether a general stance at this level belongs in the self-portrait.
- **6b43c10f** (My Bio): "My name is Branden Scrivener, I’m a 27-year-old working class father of two. I have a bachelor’s in human services, along…" This is biography. "Broken insurance system" is an observation, not a commitment (B2 0.63).
- **f0eb4736** (My Bio): "All this experience has led me to the same conclusion; our government policies are the source of many of our issues. For…" This is biography and motivation, with no commitment on an issue.
- **9813934a** (My Bio): "https://linktr.ee/Citzensforbrandenscrivener". A link only.
- **dc978e4e** (Government Reform): "In Pasco County, there are more registered independents than Democrats. That means there’s a significant portion of eligible voters unable to…" This is a description with no commitment in the passage itself (A7 0.69).
- **6e49d97e** (Grassroots): "This is a grassroots campaign and that means I need your support. Both parties are corrupted with special interests and selfish…" This is fundraising and volunteer copy, plus criticism of both parties, with no commitment on an issue.
- **a810b8b7** (Send Me a Message): "Have questions or suggestions? I would love to hear from you!" Contact copy.
- **718fedc3** (Send Me a Message): "Land O' Lakes Blvd, Land O' Lakes, FL, USA". An address.

Also for the founder, though outside check 5's scope because the passage is gated true: 80cffe6c says "I will advocate for open primaries to allow all voters to participate in the election process", and it scores 0.82 on A7 (Elections administration and voting access), just under the threshold. It is not tagged to A7, so its open-primaries commitment appears only as candidate-tier content.

### Other note (not a check)

The "Step 2: policy run (Jev)" section of `ingest-report.md` is stale. It describes the earlier one-gate run: provenance `q-b2171346`, 4 passages stating a policy, 3 matching an issue, and 38917/5038 tokens. The current `run.json` and `run-report.txt` show `q-e7282116`, 3 passages stating a policy, 2 with an issue, and 41205/5269 tokens. This review did not edit that file.

VERDICT: PASS
