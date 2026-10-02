# Step 3 review: FL-VF-HIL-2621 (Gwen Myers), FL-HIL-CC3-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (5 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 5 of 5 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 5 passages are on `www.votegwenmyers.com`: 1 on `/` (`03759321`) and 4 on `/meet-gwen` (`b665560f`, `f15bbe54`, `bb21e679`, `0e642f6d`). No other host. |
| 2 | Quotes verbatim | PASS | The one policy passage, `f15bbe54`, is byte-identical to its entry in `passages.jsonl` (248 bytes). All 5 texts, urls and headings also match. |
| 3 | No inferred motive | PASS (borderline, see notes) | `f15bbe54` is third-person About-page copy. It does state two present-tense stances: "has long been an advocate for improving affordable housing…" and "is championing the construction of…". It is not only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | A2 has 1 passage (`f15bbe54`). The other 24 issues have 0 and are recorded as no_stated_position_found. |
| 5 | Possible misses (information only) | none | None of the 4 passages marked states_policy=false states a commitment on any taxonomy issue. |

## Evidence

### 1. Candidate-controlled sources only

A script over `run.json` found exactly one host in the passage urls, and the same host in `areas[].citations`: `www.votegwenmyers.com`. That is the OFFICIAL_SITE host, and no redirect was involved.

- `https://www.votegwenmyers.com/`: `03759321`
- `https://www.votegwenmyers.com/meet-gwen` (About page, chosen by Jev at about=0.57): `b665560f`, `f15bbe54`, `bb21e679`, `0e642f6d`

`ingest.log` records only this site and this About page. Jev judged three links (`links.jsonl`), all on the same host. None was chosen as a policy page. `/platform` (link text "ACCOMPLISHMENTS", policy 0.13, about 0.36) was not crawled.

### 2. Quotes verbatim

I checked this with `node`. The script compares `Buffer.from(text, "utf8")` for each `run.json` passage against the passage with the same id in `passages.jsonl`:

- The id sets match: 5 in `run.json` and 5 in `passages.jsonl`, all shared.
- `f15bbe54` (states_policy=true) is byte-identical in both files at 248 bytes, and its url and heading match too.
- All 5 passage texts are identical, including the 4 gated out.
- The only citation in `run.json.areas` is A2 → `f15bbe54` (score 0.92), and its text matches `passages.jsonl` exactly. `run-report.txt` shortens the quote with "…" for display only. The run file holds the full text.

### 3. No inferred motive

Only one passage is marked as stating a policy:

- `f15bbe54` (commitment 0.90). First 20 words: "She has long been an advocate for improving affordable housing, health care, and transportation in the county. She is championing". The passage ends: "…the construction of an African American Art and Cultural Center to be located in West Tampa at 2103 North Rome Avenue."

The passage is not only biography, attack, fundraising or event copy. It states, on the candidate's own site and in the present tense, that she advocates for improving affordable housing and is championing a specific construction project. I marked this check PASS. It is borderline, and the founder should know why:

- The text is third-person About-page copy, not the candidate speaking. It describes long-running advocacy. It contains no pledge, plan or proposal. By this standard, it is the weakest kind of stated position.
- The A2 tag (Housing affordability, 0.92) rests only on the words "advocate for improving affordable housing". The second sentence, the one with a concrete present commitment (the Cultural Center), maps to no taxonomy issue. Its highest score is KYV3 at 0.27.
- A claim written from this passage should say what the site says: "The campaign website states that she has long been an advocate for improving affordable housing…". It must not be restated as a commitment, a plan or a policy proposal on housing affordability.

The other four passages were gated out with commitment between 0.03 and 0.05. They are a race heading (`03759321`) and biography (`b665560f`, `bb21e679`, `0e642f6d`).

### 4. Silence recorded, not filled

A passage counts only if it clears the gate (commitment ≥ 0.85) and its issue score is ≥ 0.85. This matches `groupByArea` in `src/lib/policy-noul.ts`. Across all 5 passages, the only issue score at or over 0.85 is A2 on `f15bbe54`, so the two counting rules agree.

| Issue | Label | Passages over threshold that state a policy | Coverage |
|---|---|---|---|
| A2 | Housing affordability | 1 (`f15bbe54`, 0.92) | stated |

The other 24 issues have 0 passages over the threshold and are recorded as no_stated_position_found: A1, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8.

B2 (Healthcare access and costs) scored 0.80 on `f15bbe54`. That is under the threshold, so it counts 0 and stays no_stated_position_found.

On scope: the crawl read only the homepage and the About page, 128 words in all. It selected 0 policy pages, because none of the 3 judged links scored ≥ 0.5 as policy. These silences therefore cover those two pages only.

### 5. Possible misses (information for the founder, not a fix)

None. I read all 4 passages marked states_policy=false. None states a commitment by the candidate on any taxonomy issue, and none has any issue score ≥ 0.10:

- `03759321` (0.04): "Hillsborough County (Tampa's District 3) 2026". A race heading.
- `b665560f` (0.03): "Commissioner Gwen Myers is a native and lifelong resident of Hillsborough County. She was elected to the Hillsborough County Board". Biography.
- `bb21e679` (0.05): "Commissioner Myers uses the theme, "It's About The People." She worked in Hillsborough County Government for 25 Years, from 1988". Employment history. It names the Housing and Community Development department, but as a past job, not a commitment.
- `0e642f6d` (0.03): "Commissioner Myers has a bachelor's degree in Business Administration/Accounting from Florida Agriculture and Mechanical University (FAMU). She has one adult". Biography.

Outside this check's scope, for information: `f15bbe54` (states_policy=true) also names "health care" and "transportation". Health care scored B2 0.80, under the threshold, so it was not tagged. The taxonomy has no transportation sub-issue.

VERDICT: PASS
