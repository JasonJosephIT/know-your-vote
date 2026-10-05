# Step 3 review: FL-VF-HIL-2660 (Aileen Rodriguez), FL-HIL-CC7-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (14 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 14 of 14 asked, 0 failed, 4 state a policy, 3 of those match a taxonomy issue), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 14 passages in `run.json` (and in `passages.jsonl`, and in `areas`) are on `voteaileen2026.com`, the OFFICIAL_SITE host. No other host and no redirect. |
| 2 | Quotes verbatim | PASS | All 4 states_policy=true passages (`50aa3bbc`, `b80bb664`, `df8e73f5`, `a4725eef`) are byte-identical (text, url, heading) to the same id in `passages.jsonl`. So are the other 10. Checked with `node` `Buffer.equals`. |
| 3 | No inferred motive | PASS | None of the 4 is only biography, an attack on an opponent, fundraising or event copy. Each has a forward-looking "Aileen will ..." commitment. |
| 4 | Silence recorded, not filled | PASS | Issues with a stated position: A2 1 (`50aa3bbc`), KYV3 1 (`df8e73f5`), B7 1 (`a4725eef`). The other 22 issues count 0 and are no_stated_position_found. No passage scored over 0.85 on any issue without also clearing the gate. |
| 5 | Possible misses (information only) | 0 possible misses | None of the 10 states_policy=false passages states a commitment on a taxonomy issue. Two related notes on gated passages are below. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script over `run.json` (`passages` and `areas`) and `passages.jsonl` found one host: `voteaileen2026.com`. It covers 14 of 14 passages in both files.

| URL | Passages |
|---|---|
| `https://voteaileen2026.com/` | 14 |

`run.json` `site` is `https://voteaileen2026.com`. `ingest.log` names only `https://voteaileen2026.com/`. `links.jsonl` is empty.

Coverage note, not a failure: `ingest.log` reports 36 links on the homepage, 0 of them sent to Jev ("asking Jev about 0 link(s)"), 0 policy pages selected and no about page. The whole corpus is the homepage (498 words). The zeros in check 4 describe that page only.

### 2. Quotes verbatim

I checked this with `node`. For each `run.json` passage, I compared `Buffer.from(text, "utf8")` with the passage of the same id in `passages.jsonl`:

- The id sets match: 14 in `run.json` and 14 in `passages.jsonl`, all shared.
- All 4 states_policy=true passages match byte for byte (265, 217, 241 and 224 bytes): 0 mismatches. Their url and heading also match.
- All 14 passages match on text.
- The 3 citations in `areas` (A2 `50aa3bbc`, KYV3 `df8e73f5`, B7 `a4725eef`) are byte-identical to `passages.jsonl`.
- Internal consistency: for every passage, `states_policy` equals `commitment >= 0.85`, and `issues` equals the set of scores ≥ 0.85 on gated passages. There were 0 inconsistencies.

### 3. No inferred motive

The 4 passages marked states_policy=true, with the first 20 words of each. All four sit under the homepage "ISSUES" heading.

- `50aa3bbc` (gate 0.98, A2 0.98): "LOWER THE COST OF LIVING Hillsborough should be a place where everyone can afford to live. Aileen will tackle the"
- `b80bb664` (gate 0.98, no issue): "FIX OUR INFRASTRUCTURE Our roads shouldn’t be failing us. Aileen will fight to reinvest tax dollars directly into the neighborhoods"
- `df8e73f5` (gate 0.97, KYV3 0.97): "PROTECT OUR LANDS & NEIGHBORHOODS Our community’s character is not for sale. Aileen will hold developers accountable and ensure they"
- `a4725eef` (gate 0.98, B7 0.96): "PRIORITIZE PUBLIC SAFETY In an emergency, every second counts. Aileen will support funding the fire and police stations our"

Each one commits the candidate to an action ("will tackle", "will fight to reinvest", "will hold developers accountable", "will support funding"). None names or attacks an opponent. `df8e73f5` says "reckless sprawl" and "not for sale", but that is the candidate's own framing of her position on development, not an attack on a named person.

The 10 passages the gate rejected: biography (`97aaf2bb`, `4f81533e`, `bfe8a270`, `06169f8b`, `fa521e91`), endorser names under the ISSUES heading (`b19bf48d` "Fentrice Driskell ...", `12fe2acc` "Frank Sanchez ..."), volunteer copy (`fa865ffc`, `dec0e6c8`) and fundraising (`3f8fb37f`, "Please send campaign checks to ..."). All have commitment ≤ 0.04, and none is cited.

### 4. Silence recorded, not filled

A passage counts for an issue when it cleared the gate (commitment ≥ 0.85) and scored ≥ 0.85 on that issue. I computed this with `node` from `run.json` scores.

| Issue | Label | Passages that count | Over 0.85 on the issue but failed the gate | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 1: `50aa3bbc` | none | stated |
| KYV3 | Growth, development and land conservation | 1: `df8e73f5` | none | stated |
| B7 | Crime policy, policing and courts | 1: `a4725eef` | none | stated |
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

The run tagged nothing beyond these three, and `areas` holds only them. The zeros are left as zeros.

### 5. Possible misses (information for the founder, not a fix)

No passage marked states_policy=false states a commitment on a taxonomy issue. `4f81533e` uses the word "commitment" ("Aileen has demonstrated her commitment to community service through her involvement with various community organizations. Her contributions include prior service"), but it lists past board service and commits to no policy. `fa865ffc` ("This campaign is about bringing experience, integrity, and community-focused leadership to the work ahead. Whether you want to volunteer,") is campaign copy with no issue.

Two notes on passages that did clear the gate, for information only:

- `b80bb664` ("FIX OUR INFRASTRUCTURE Our roads shouldn’t be failing us. Aileen will fight to reinvest tax dollars directly into the neighborhoods") states a policy that the taxonomy has no question for. Its best score is KYV3 0.53. Under the constitution this is a candidate-tier issue (roads / infrastructure), not a spine gap.
- `50aa3bbc` names "housing and transportation costs" and the "cost of living", but scores A4 (Cost of living in Florida) 0.75, below the threshold. So it counts for A2 only, and A4 stays at 0.

Scope note: the folder `attempt-1-keywords/` holds an earlier keyword crawl of the same homepage (same 14 passage ids in the same order). It is not part of this run, and I did not review it.

VERDICT: PASS
