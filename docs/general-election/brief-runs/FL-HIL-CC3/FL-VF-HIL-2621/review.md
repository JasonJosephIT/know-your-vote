# Step 3 review: FL-VF-HIL-2621 (Gwen Myers), FL-HIL-CC3-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (5 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, two gates, threshold 0.85, status complete, 5 of 5 asked, 0 failed), `ingest.log`. The SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 5 passages are on `www.votegwenmyers.com`: `03759321` on `/`, and `b665560f`, `f15bbe54`, `bb21e679`, `0e642f6d` on `/meet-gwen`. No other host. |
| 2 | Quotes verbatim | PASS | No passage is marked states_policy=true, so the check applies to none. The script also compared all 5 texts against `passages.jsonl`, and all 5 are byte-identical. |
| 3 | No inferred motive | PASS | No passage is marked as stating a policy (`counts.states_policy` = 0, `areas` = []). |
| 4 | Silence recorded, not filled | PASS | All 25 issues have 0 passages, so all 25 are no_stated_position_found. A2 has one passage over the issue threshold (`f15bbe54`, 0.93), but it fails the second gate, so it does not count. |
| 5 | Possible misses (information only) | 1 borderline | `f15bbe54` (own_commitment 0.82, just under 0.85). See below. |

## Evidence

### 1. Candidate-controlled sources only

A node script took the host of every passage url in `run.json`. It found one host, `www.votegwenmyers.com`, which is the OFFICIAL_SITE host. No redirect was involved. `run.json.areas` is empty, so there are no citation urls to check.

- `https://www.votegwenmyers.com/`: `03759321`
- `https://www.votegwenmyers.com/meet-gwen` (the About page, which Jev scored about=0.57): `b665560f`, `f15bbe54`, `bb21e679`, `0e642f6d`

`ingest.log` records only this site and this About page. Jev judged 3 links (`links.jsonl`), all on the same host. None was chosen as a policy page. `/platform` (link text "ACCOMPLISHMENTS", policy 0.13) was not crawled.

### 2. Quotes verbatim

A node script compared `Buffer.from(text, "utf8")` for each `run.json` passage against the passage with the same id in `passages.jsonl`.

- The id sets match: 5 ids in each file, all shared, none unique to either file.
- No passage has states_policy=true, so check 2 applies to none.
- All 5 texts are byte-identical anyway (`03759321` 45 B, `b665560f` 169 B, `f15bbe54` 248 B, `bb21e679` 230 B, `0e642f6d` 168 B). The url and heading also match for all 5.

### 3. No inferred motive

No passage is marked as stating a policy, so there is nothing to list. The two-gate run gated out all 5 passages:

- `03759321`, `b665560f`, `bb21e679` and `0e642f6d`: commitment and own_commitment are both between 0.03 and 0.05. These are a race heading and biography.
- `f15bbe54`: commitment 0.90, own_commitment 0.82. It fails the second gate, so states_policy=false.

This differs from the earlier one-gate run (`attempt-1-one-gate/`, `q-b2171346`), which marked `f15bbe54` as stating a policy on A2. `ingest-report.md` "Step 2" still gives that earlier run's figures: provenance `q-b2171346`, 1 passage stating a policy, and 17575/2290 tokens. `run.json` and `run-report.txt` are the current run, with `q-e7282116`, 0 passages and 18615/2395 tokens. The report section is stale. It is not an error in the run.

### 4. Silence recorded, not filled

The counting rule matches `groupByArea` in `src/lib/policy-noul.ts`. A passage counts for an issue only if it clears both gates (q_states_policy ≥ 0.85 and q_own_commitment ≥ 0.85) and its issue score is ≥ 0.85. A script over all 25 issue ids gave these counts:

| Issue | Label | Passages counted | Coverage |
|---|---|---|---|
| all 25 (A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8) | — | 0 | no_stated_position_found |

Only one issue score in the whole run is at or over 0.85: A2 (Housing affordability) at 0.93 on `f15bbe54`. That passage fails the own-commitment gate, so it counts 0 and A2 is no_stated_position_found.

`run.json` still lists `"issues": ["A2"]` on `f15bbe54`, even though states_policy is false. `readVerdict` computes the issue ids whether or not the gates pass. `groupByArea` and `counts.with_issue` filter on states_policy, so the run's own totals are correct. Any consumer that reads `passages[].verdict.issues` directly must also check `states_policy`. Otherwise it would file this passage under A2.

Scope: the crawl read only the homepage and the About page, 128 words in all, and chose 0 policy pages. These silences therefore cover those two pages only.

### 5. Possible misses (information for the founder, not a fix)

One borderline case.

- `f15bbe54` (commitment 0.90, own_commitment 0.82, A2 0.93, B2 0.78). First 20 words: "She has long been an advocate for improving affordable housing, health care, and transportation in the county. She is championing". The passage ends: "…the construction of an African American Art and Cultural Center to be located in West Tampa at 2103 North Rome Avenue."
  - Why it might be a miss: the own-commitment question counts third-person text ("he supports"). "Has long been an advocate for improving affordable housing" can be read as a present stance of support on A2 (Housing affordability), and "health care" touches B2. The second gate cleared at 0.82, 0.03 under the threshold.
  - Why it might be correct: this is third-person About-page copy about long-running advocacy. It has no pledge, plan or proposal on housing or health care. The one concrete, present commitment in the passage ("is championing the construction of" a cultural center) maps to no taxonomy issue (its highest other score is KYV3, 0.26).
  - If a claim were ever written from this passage, it could only say what the site says: "The campaign website states that she has long been an advocate for improving affordable housing, health care, and transportation." Nothing should be written from it under the current run, because it did not clear both gates.

None of the other 3 non-heading passages states a commitment. None has an issue score over 0.05.

- `03759321`: "Hillsborough County (Tampa's District 3) 2026". A race heading.
- `b665560f`: "Commissioner Gwen Myers is a native and lifelong resident of Hillsborough County. She was elected to the Hillsborough County Board". Biography.
- `bb21e679`: "Commissioner Myers uses the theme, "It's About The People." She worked in Hillsborough County Government for 25 Years, from 1988". A past job, not a commitment.
- `0e642f6d`: "Commissioner Myers has a bachelor's degree in Business Administration/Accounting from Florida Agriculture and Mechanical University (FAMU). She has one adult". Biography.

VERDICT: PASS
