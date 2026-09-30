# Step 3 review: FL-VF-ORA-1271 (Vicki Vargo), FL-ORA-CC7-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (34 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 34 of 34 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 34 passages are on `votevickivargo.com`: 9 on `/`, 4 on `/issues`, 21 on `/meet-vicki`. No other host. |
| 2 | Quotes verbatim | PASS | The 6 policy passages (`39b9348b`, `3f6a9df4`, `aa9a83c1`, `371bf609`, `6f993006`, `a6c3ad63`) are byte-identical to `passages.jsonl`. So are all 34 texts, urls and headings. |
| 3 | No inferred motive | PASS | Each of the 6 passages states a stance or commitment in the campaign's own words. `a6c3ad63` is mostly biography but contains "Vicki will make fiscal oversight … a top priority". `39b9348b` is a homepage tagline (borderline, see evidence). |
| 4 | Silence recorded, not filled | PASS | A2: 2 (`39b9348b`, `3f6a9df4`). KYV3 has 1 score over the threshold (`8bc2db77`), but that passage failed the gate, so KYV3 counts 0. A2 also has `612d6cc8` over the threshold with a failed gate. The other 23 issues are 0. `run.json.areas` holds only A2. |
| 5 | Possible misses (information only) | 5 listed | `7df1954f` (B2), `442285b9` (KYV4), `8bc2db77` (KYV3), `3e6d7595` (KYV7), `612d6cc8` (A2, borderline). |

## Evidence

### 1. Candidate-controlled sources only

A script over `run.json` and `passages.jsonl` found one host in the passage urls: `votevickivargo.com`, the OFFICIAL_SITE host. No redirect was involved. `run.json.site` is `https://votevickivargo.com`.

- `https://votevickivargo.com/`: `44df452c`, `728b7011`, `39b9348b`, `442285b9`, `692bda04`, `7df1954f`, `87eff7ba`, `4316e207`, `7c3c575e`
- `https://votevickivargo.com/issues` (the one policy page Jev chose, at policy=0.58): `3f6a9df4`, `aa9a83c1`, `371bf609`, `6f993006`
- `https://votevickivargo.com/meet-vicki` (About page, about=0.73): `67ad2bc2`, `612d6cc8`, `243d54e4`, `8bc2db77`, `a6c3ad63`, `3e6d7595`, `e923e97d`, `eaf5ad04`, `a3b8b8bf`, `0c68f452`, `11115ff0`, `fee8f83e`, `500612ea`, `b7bdab12`, `5eea36c5`, `a81ab639`, `cac99fc8`, `20e884a2`, `bcff1706`, `e0854579`, `053b1645`

`ingest.log` records only this site. It lists the `/issues` (4) and `/meet-vicki` (21) counts. The 9 homepage passages make up the 34 total, which matches `ingest-report.md`. The three links Jev judged (`links.jsonl`) are all on the same host. `/endorsements` was not chosen (policy 0.04, about 0.03), so no endorser copy entered the corpus. The earlier keyword crawl in `attempt-1-keywords/` is not an input to this `run.json`.

### 2. Quotes verbatim

I checked this with `node`. The script compares `Buffer.from(text)` for each `run.json` passage with the passage of the same id in `passages.jsonl`:

- The id sets match: 34 in `run.json`, 34 in `passages.jsonl`, all shared, no duplicates.
- The 6 states_policy=true passages are byte-identical: `39b9348b` (79 bytes), `3f6a9df4` (166), `aa9a83c1` (183), `371bf609` (206), `6f993006` (172), `a6c3ad63` (696). Their urls and headings match too.
- All 34 passage texts, urls and headings are identical, including the ones gated out.
- Both citations in `run.json.areas` (A2: `3f6a9df4`, `39b9348b`) carry text identical to `passages.jsonl`.

Note (not a failure): `44df452c` ends in `…public.” -Vicki Vargo`. It has a closing curly quote but no opening one. The mismatch is in both files the same way, so it comes from the site or the extractor, not from the run. If this passage is ever quoted, quote it as it appears on the site.

### 3. No inferred motive

The 6 passages marked as stating a policy, with their first 20 words:

- `39b9348b` (commitment 0.87, A2 0.96): "A Champion for Affordable Housing So Everyone Has the Opportunity to Own a Home". This is a homepage tagline, a self-description rather than a commitment in the first person. It is not biography, attack, fundraising or event copy, and it matches the `/issues` Affordable Housing section (`3f6a9df4`). Borderline, not a failure. When writing the claim, `3f6a9df4` is the better citation and this one can support it.
- `3f6a9df4` (0.93, A2 0.97): "Vicki believes that everyone should have the opportunity to own a home. She is ready to fight for affordability in". This is a commitment ("ready to fight for affordability … help homeowners keep their homes").
- `aa9a83c1` (0.94, no issue tag): "Orange County needs to invest in local infrastructure today in order to meet the needs of tomorrow. This includes improving". This is a stance, from the `/issues` Infrastructure section.
- `371bf609` (0.90, no issue tag): "Orange County’s parks bring our community together. They also help shape the future of our community. Vicki is committed to". This is a commitment ("committed to increasing youth recreation").
- `6f993006` (0.87, no issue tag): "From upgrading public transportation to increasing accessible healthcare, Vicki Vargo is ready to fight for us. Why? Because Orange County". This is a commitment.
- `a6c3ad63` (0.92, no issue tag): "She represented residents for six years, fighting for affordability, accountability, and transparent local government while working closely with the Florida". Most of this passage is record and biography: city finances, and "She built both the Rosemont and College Park Neighborhood Centers". It also contains a forward commitment: "Vicki will make fiscal oversight and responsible stewardship of public funds a top priority on the Orange County Commission." So it is not only biography. Any claim drawn from it should use that sentence, not the record around it.

The testimonials (`87eff7ba`, `4316e207`, `7c3c575e`), the credentials, awards and education lines, and the pure biography (`67ad2bc2`) were all gated out with commitment 0.02 to 0.09. No passage marked as a policy attacks an opponent or is fundraising or event copy.

### 4. Silence recorded, not filled

A passage counts only if it clears the gate (commitment ≥ 0.85) and its issue score is ≥ 0.85. This matches `groupByArea` in `src/lib/policy-noul.ts` and `run.json.areas`. These are the taxonomy issues where at least one passage scored over the threshold:

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| A2 | Housing affordability | 2 (`3f6a9df4` 0.97, `39b9348b` 0.96). `612d6cc8` also scored 0.96 but failed the gate (commitment 0.68), so it is not counted. | stated |
| KYV3 | Growth, development and land conservation | 0. `8bc2db77` scored 0.91 on KYV3 but failed the gate (commitment 0.70), so it is not a stated position. | no_stated_position_found |

The other 23 issues have 0 passages over the threshold. They are recorded as no_stated_position_found: A1, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8.

Observations (not failures):
- Four passages that state a policy carry no taxonomy tag, so their stances appear under no spine issue in `areas`. They are `aa9a83c1`, `371bf609`, `6f993006` and `a6c3ad63`. The two closest scores are `aa9a83c1` at KYV4 0.78 and `6f993006` at B2 0.82. Both are under 0.85, and the run correctly left them untagged. `run-report.txt` counts these as "4 state a policy the taxonomy has no question for". Under the constitution they are candidate-tier material: infrastructure, parks and youth recreation, county services and transit, and fiscal oversight. They should not be forced into a spine issue.
- `run.json` writes `verdict.issues` for two passages that failed the gate: `612d6cc8` gets `["A2"]` and `8bc2db77` gets `["KYV3"]`. `areas` and `counts.with_issue` exclude them correctly. A downstream reader that reads `verdict.issues` without checking `states_policy` would fill the KYV3 silence.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked states_policy=false but state a stance on a taxonomy issue. In each, the stance is either a campaign tagline or a single stance sentence set inside biography:

- `7df1954f` (commitment 0.84, B2 0.81): "Bettering County Services Upgrading Public Transportation and Accessible Healthcare". This is the homepage tagline for the `6f993006` commitment, and it falls just under both the gate and the B2 threshold. B2 (Healthcare access and costs) stays at 0 either way, because `6f993006` scored B2 0.82.
- `442285b9` (0.79, KYV4 0.62): "Building a Better Community Improving Roads, Sidewalks, Stormwater Drainage, and Parks". This is the homepage tagline for `aa9a83c1`. The only link to KYV4 (Storm resilience and flood protection) is "stormwater drainage".
- `8bc2db77` (0.70, KYV3 0.91): "Former Orlando City Councilmember (District 3) As an Orlando City Commissioner, Vicki supported and assisted with bringing the FAMU law". The passage contains "She believes in smart growth.", a belief stated in the present tense on KYV3. The rest is past record: Baldwin Park, the Navy base purchase, and votes to promote police and fire chiefs.
- `3e6d7595` (0.09, KYV7 0.34): "Former Attorney for The Housing Authority of the City of Orlando Worked directly on housing and affordability issues impacting working". It ends "experience that shaped her lifelong commitment to tackling homelessness and housing instability". That is a stated commitment on KYV7 (Homelessness), phrased as biography.
- `612d6cc8` (0.68, A2 0.96), borderline: "From expanding access to affordable housing — including townhomes, condominiums, and duplexes for first-time homeowners — to rooting out government". The sentence is framed as record ("Vicki has spent decades fighting for…"), not as a forward commitment. A2 is already covered by `3f6a9df4`.

These were read and judged not to state a commitment on a spine issue: `692bda04` (parks and youth recreation tagline, no taxonomy issue fits it better than KYV3 0.32), `053b1645` ("ready to bring accountability, affordability, and integrity", with no issue named), `b7bdab12` (economy belief in a biography passage, B1 0.64), and `44df452c` (a values quote about leaders in general).

VERDICT: PASS
