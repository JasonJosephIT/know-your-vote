# Step 3 review: FL-VF-HIL-2660 (Aileen Rodriguez), FL-HIL-CC7-general

Reviewed 2026-09-30 against `run.json` (`created_at` 2026-09-30T01:59:03Z, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates: `commitment` and `own_commitment`), `passages.jsonl` (14 passages) and `ingest.log`. Official site: https://voteaileen2026.com/. SPINE: undecided, so all 25 taxonomy sub-issues (tax-7) are considered. Read-only review; no site was fetched.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 14 passage urls in run.json (and all 3 `areas` citations) are `https://voteaileen2026.com/`. No other host. |
| 2 | Quotes verbatim | PASS | Node byte comparison: all 4 `states_policy=true` passages (`50aa3bbc`, `b80bb664`, `df8e73f5`, `a4725eef`), and all 14 passages in the run, are byte-identical to the same id in passages.jsonl; url and heading match too. The 3 `areas` citation texts also match byte for byte. |
| 3 | No inferred motive | PASS | Each of the 4 passages marked as stating a policy contains a commitment in the candidate's own name ("Aileen will..."). None is only biography, an attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | A2 = 1, KYV3 = 1, B7 = 1. The other 22 sub-issues are 0 (`no_stated_position_found`). Recomputing from the scores gives the same gate and issue results as the run for every passage. |
| 5 | Possible misses (information only) | None found | No `states_policy=false` passage states a commitment on a taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only

run.json hosts: `voteaileen2026.com` (14 of 14 passages). passages.jsonl hosts: `voteaileen2026.com` (14 of 14). No redirect appears in `ingest.log`. The ingest read one page (the homepage). `ingest.log` shows 36 links, 0 policy pages selected and no about page, and `links.jsonl` is empty.

### 2. Quotes verbatim

A script compared each run.json passage with the passages.jsonl row that has the same id, using `Buffer.equals` on the UTF-8 text:

```
50aa3bbc sp=true  textByteEq=true urlEq=true headingEq=true
b80bb664 sp=true  textByteEq=true urlEq=true headingEq=true
df8e73f5 sp=true  textByteEq=true urlEq=true headingEq=true
a4725eef sp=true  textByteEq=true urlEq=true headingEq=true
(the 10 sp=false passages: all textByteEq=true)
area cite 50aa3bbc A2   true
area cite df8e73f5 KYV3 true
area cite a4725eef B7   true
```

Every passages.jsonl id is in run.json, and every run.json id is in passages.jsonl.

### 3. No inferred motive

The 4 passages marked as stating a policy (gate score / own-commitment score):

- `50aa3bbc` (0.98 / 0.94): "LOWER THE COST OF LIVING Hillsborough should be a place where everyone can afford to live. Aileen will tackle the housing" (a commitment).
- `b80bb664` (0.98 / 0.95): "FIX OUR INFRASTRUCTURE Our roads shouldn't be failing us. Aileen will fight to reinvest tax dollars directly into the neighborhoods" (a commitment).
- `df8e73f5` (0.97 / 0.95): "PROTECT OUR LANDS & NEIGHBORHOODS Our community's character is not for sale. Aileen will hold developers accountable and ensure" (a commitment).
- `a4725eef` (0.98 / 0.97): "PRIORITIZE PUBLIC SAFETY In an emergency, every second counts. Aileen will support funding the fire and police stations our" (a commitment).

None of the 4 is biography, an attack on an opponent, fundraising or event copy. The bio passages (`97aaf2bb`, `4f81533e`, `bfe8a270`, `06169f8b`, `fa521e91`), the two endorser name lines (`b19bf48d`, `12fe2acc`), the campaign and volunteer copy (`fa865ffc`, `dec0e6c8`) and the mailing address for checks (`3f8fb37f`) all fail the gate, with scores from 0.02 to 0.13.

### 4. Silence recorded, not filled

A passage counts when its score is at least 0.85. For every passage, recomputing `states_policy` (commitment ≥ 0.85 and own_commitment ≥ 0.85) and `issues` (score ≥ 0.85) from the scores gives exactly what the run recorded.

| Issue | Label | Passages ≥ 0.85 | Ids | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 1 | `50aa3bbc` (0.97) | stated |
| KYV3 | Growth, development and land conservation | 1 | `df8e73f5` (0.97) | stated |
| B7 | Crime policy, policing and courts | 1 | `a4725eef` (0.96) | stated |
| A1 | Property insurance costs | 0 | none | no_stated_position_found |
| A3 | Property taxes | 0 | none | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | none | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | none | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | none | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | none | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | none | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | none | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 0 | none | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | none | no_stated_position_found |
| B3 | Immigration and border enforcement | 0 | none | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | none | no_stated_position_found |
| B5 | Abortion policy | 0 | none | no_stated_position_found |
| B6 | Election integrity | 0 | none | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | none | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | none | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | none | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | none | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | none | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | none | no_stated_position_found |
| KYV7 | Homelessness | 0 | none | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | none | no_stated_position_found |

`areas` in run.json contains only A2, KYV3 and B7. These zeros apply to the one page that was crawled (see check 1).

### 5. Possible misses (information for the founder, not a fix)

None of the 10 `states_policy=false` passages states a commitment on a taxonomy issue.

- `4f81533e` ("Aileen has demonstrated her commitment to community service through her involvement with various community organizations. Her contributions include prior service") uses the word "commitment", but it lists past board service. It is not a policy.
- `fa865ffc` ("This campaign is about bringing experience, integrity, and community-focused leadership to the work ahead. Whether you want to volunteer,") is campaign copy and names no issue (own_commitment 0.13).

Notes on passages that did clear the gate, for information only:

- `b80bb664` (roads and infrastructure) clears the gate but matches no taxonomy issue. Its highest score is KYV3 at 0.52. Under the constitution, roads and infrastructure is a candidate-tier issue, not a gap in the spine. The run log reports it as "1 state a policy the taxonomy has no question for".
- `a4725eef` is tagged B7 ("Crime policy, policing and courts"), but its text is about funding fire and police stations and response times. The B7 label covers only the policing part.

### Other observations (not part of the five checks)

- The `## Step 2: policy run (Jev)` table in `ingest-report.md` is out of date. It gives provenance `q-b2171346` and 49231/6412 tokens. The current `run.json` and `run-report.txt` have `q-e7282116` and 52143/6706 tokens. The table appears to come from the earlier one-gate run in `attempt-1-one-gate/`. The two runs agree on the passage ids (the corpus is unchanged), but the report does not describe the run reviewed here.
- The template text in the Profiler constitution uses "Senator Aileen Rodriguez says…". Nothing on the site calls the candidate a senator: `97aaf2bb` describes a public affairs executive. Attributions should not copy that title.
- `attempt-1-keywords/` and `attempt-1-one-gate/` are earlier attempts and were not reviewed.

VERDICT: PASS
