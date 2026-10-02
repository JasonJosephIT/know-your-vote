# Step 3 review: FL-VF-ORA-1271 (Vicki Vargo), FL-ORA-CC7-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (34 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status complete, 34 of 34 asked, 0 failed, created 2026-09-30T01:59:14Z), `ingest.log`. This is the two-gate run: a passage states a policy only if `q_states_policy` ≥ 0.85 **and** `q_own_commitment` ≥ 0.85 (`readVerdict` in `src/lib/policy-noul.ts`). The earlier one-gate run and its review are in `attempt-1-one-gate/` and were not inputs here. The SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 34 passage urls are on `votevickivargo.com`: 9 on `/`, 4 on `/issues`, 21 on `/meet-vicki`. No other host, no redirect. |
| 2 | Quotes verbatim | PASS | The 2 policy passages (`371bf609`, `a6c3ad63`) are byte-identical to `passages.jsonl`. So are all 34 texts, urls and headings. |
| 3 | No inferred motive | PASS | Both policy passages contain a forward commitment by the candidate. `a6c3ad63` is mostly record and biography around one commitment sentence (see evidence). |
| 4 | Silence recorded, not filled | PASS | All 25 issues count 0 passages that state a policy, so all are no_stated_position_found. A2 has 3 scores and KYV3 has 1 score over the threshold, all on gated-out passages. `run.json.areas` is `[]` and `counts.with_issue` is 0. |
| 5 | Possible misses (information only) | 7 listed | `3f6a9df4` (A2), `6f993006` (B2), `8bc2db77` (KYV3), `3e6d7595` (KYV7), plus borderline `aa9a83c1` (KYV4), `39b9348b` (A2) and `7df1954f` (B2). |

## Evidence

### 1. Candidate-controlled sources only

A `node` script parsed `new URL(url).host` for every passage in `run.json`. It found one host, `votevickivargo.com`, which is the OFFICIAL_SITE host. `run.json.site` is `https://votevickivargo.com`.

- `https://votevickivargo.com/`: `44df452c`, `728b7011`, `39b9348b`, `442285b9`, `692bda04`, `7df1954f`, `87eff7ba`, `4316e207`, `7c3c575e`
- `https://votevickivargo.com/issues` (the one policy page chosen, link score policy=0.58): `3f6a9df4`, `aa9a83c1`, `371bf609`, `6f993006`
- `https://votevickivargo.com/meet-vicki` (About page, about=0.73): `67ad2bc2`, `612d6cc8`, `243d54e4`, `8bc2db77`, `a6c3ad63`, `3e6d7595`, `e923e97d`, `eaf5ad04`, `a3b8b8bf`, `0c68f452`, `11115ff0`, `fee8f83e`, `500612ea`, `b7bdab12`, `5eea36c5`, `a81ab639`, `cac99fc8`, `20e884a2`, `bcff1706`, `e0854579`, `053b1645`

`ingest.log` names only this site. It prints counts for `/issues` (4) and `/meet-vicki` (21). The other 9 are homepage passages, for 34 in total. `/endorsements` was judged but not chosen (policy 0.04, about 0.03), so no endorser page entered the corpus. The three homepage testimonials (`87eff7ba`, `4316e207`, `7c3c575e`) are third-party words hosted on the candidate's own site. All three were gated out (commitment 0.03, own_commitment 0.03).

### 2. Quotes verbatim

I checked this with `node`. The script compares `Buffer.from(text)` for each `run.json` passage against the passage with the same id in `passages.jsonl`, and also compares url and heading:

- The id sets match: 34 in `run.json`, 34 in `passages.jsonl`. Every id is shared and none is duplicated.
- The 2 passages with states_policy=true are byte-identical, with matching url and heading: `371bf609` (206 bytes) and `a6c3ad63` (696 bytes).
- All 34 passages match, including those that were gated out. There were 0 mismatches.
- `run.json.areas` is empty, so it carries no citation text to check.

### 3. No inferred motive

Two passages are marked as stating a policy. The first 20 words of each:

- `371bf609` (commitment 0.90, own_commitment 0.89, no issue tag): "Orange County’s parks bring our community together. They also help shape the future of our community. Vicki is committed to". The passage continues "…increasing youth recreation to ensure Orange County has an even brighter future." That is a forward commitment by the candidate. It is not biography, an attack, fundraising or event copy.
- `a6c3ad63` (0.92 / 0.93, no issue tag): "She represented residents for six years, fighting for affordability, accountability, and transparent local government while working closely with the Florida". Most of this passage is past record: reviewing city finances, and "She built both the Rosemont and College Park Neighborhood Centers". It also contains a forward commitment: "Vicki will make fiscal oversight and responsible stewardship of public funds a top priority on the Orange County Commission." So it is not only biography, and it passes. Any claim written from it should rest on that sentence, not on the record around it.

Neither passage carries a taxonomy tag. Under the constitution they are candidate-tier material (parks and youth recreation; fiscal oversight). They should not be forced into a spine issue.

No passage marked as a policy is an attack on an opponent, fundraising or event copy.

### 4. Silence recorded, not filled

A passage counts for an issue only if it clears both gates and its issue score is ≥ 0.85. This is the rule in `groupByArea` and `readVerdict` (`src/lib/policy-noul.ts`), and `run.json.areas` follows it. These are the taxonomy issues where at least one passage scored over the threshold:

| Issue | Label | Scores over threshold | Of those, passages that state a policy | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 3: `3f6a9df4` 0.97, `39b9348b` 0.96, `612d6cc8` 0.96 | 0. `3f6a9df4` failed own_commitment (0.84). `39b9348b` failed own_commitment (0.53). `612d6cc8` failed both gates (0.68 / 0.14). | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 1: `8bc2db77` 0.92 | 0. It failed both gates (0.69 / 0.13). | no_stated_position_found |

The other 23 issues have 0 scores over the threshold and 0 passages that state a policy. Each is no_stated_position_found: A1, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.

So the run records silence on all 25 issues. It fills none of them. `run-report.txt` says the same: "No passage cleared both the commitment gate and an issue question".

Observations (not failures):
- `run.json` writes `verdict.issues` for four passages that failed a gate: `39b9348b` and `3f6a9df4` get `["A2"]`, `612d6cc8` gets `["A2"]`, and `8bc2db77` gets `["KYV3"]`. `areas` and `counts.with_issue` exclude them correctly. A downstream reader that reads `verdict.issues` without checking `states_policy` would fill the A2 and KYV3 silences.
- `ingest-report.md`'s "Step 2: policy run" table still describes the earlier one-gate run: provenance `q-b2171346`, 6 state a policy, 2 match an issue, 119246 input tokens. The current `run.json` and `run.log` show `q-e7282116`, 2 state a policy, 0 match an issue, 126318 input tokens. The report is stale, not the run.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked states_policy=false, but they state a commitment on a taxonomy issue. In each case the first gate cleared or came close, and the second gate (own_commitment) is what held the passage out.

- `3f6a9df4` (commitment 0.93, own_commitment 0.84, A2 0.97): "Vicki believes that everyone should have the opportunity to own a home. She is ready to fight for affordability in". It continues "…Orange County and help homeowners keep their homes." This is a plain third-person commitment on A2, the form the own_commitment question says counts. It missed the second gate by 0.01. It was a stated policy in the one-gate run. Without it, A2 reads as silence even though the `/issues` page has an "Affordable Housing" section.
- `6f993006` (0.88 / 0.81, B2 0.83): "From upgrading public transportation to increasing accessible healthcare, Vicki Vargo is ready to fight for us. Why? Because Orange County". This is a commitment ("ready to fight for … increasing accessible healthcare"). It is held out by own_commitment 0.81. B2 at 0.83 would also leave it untagged. B2 is 0 either way.
- `8bc2db77` (0.69 / 0.13, KYV3 0.92): "Former Orlando City Councilmember (District 3) As an Orlando City Commissioner, Vicki supported and assisted with bringing the FAMU law". Inside it is "She believes in smart growth.", a present-tense belief on KYV3. The rest is past record: Baldwin Park, the Navy base land, and votes to promote police and fire chiefs. This one is weak: a single belief sentence inside a record passage.
- `3e6d7595` (0.09 / 0.11, KYV7 0.32): "Former Attorney for The Housing Authority of the City of Orlando Worked directly on housing and affordability issues impacting working". It ends "…experience that shaped her lifelong commitment to tackling homelessness and housing instability." That is a stated commitment on KYV7 (Homelessness), phrased as biography.
- `aa9a83c1` (0.94 / 0.65, KYV4 0.79), borderline: "Orange County needs to invest in local infrastructure today in order to meet the needs of tomorrow. This includes improving". It is a stance from the `/issues` page ("…roads, sidewalks, stormwater drainage, and local parks"), but it is phrased as what the county needs rather than as what Vicki will do. The only link to KYV4 is "stormwater drainage".
- `39b9348b` (0.85 / 0.53, A2 0.96), borderline: "A Champion for Affordable Housing So Everyone Has the Opportunity to Own a Home". This is a homepage tagline, a self-description rather than a commitment. `3f6a9df4` above is the better source for the same stance.
- `7df1954f` (0.86 / 0.73, B2 0.80), borderline: "Bettering County Services Upgrading Public Transportation and Accessible Healthcare". This is the homepage tagline for `6f993006`, a bare plan item.

I read these and judged that none states a commitment on a taxonomy issue:
- `612d6cc8` (A2 0.96): framed as past record ("Vicki has spent decades fighting for…").
- `442285b9`: the infrastructure tagline, KYV4 0.64.
- `692bda04`: the parks tagline, no fitting issue.
- `053b1645`: "ready to bring accountability, affordability, and integrity", with no issue named.
- `b7bdab12`: an economy belief inside a biography passage, B1 0.60.
- `44df452c`: a values quote about leaders in general.

VERDICT: PASS
