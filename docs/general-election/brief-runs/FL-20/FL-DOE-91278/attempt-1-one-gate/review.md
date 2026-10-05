# Step 3 review: FL-DOE-91278 (Brent Andersen), FL-20-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (11 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 11 of 11 asked, 0 failed), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 11 passages are on `brentandersenfl.com` (3 on `/`, 8 on `/meet-brent`). No other host. |
| 2 | Quotes verbatim | PASS | The one policy passage, `918afcd0`, is byte-identical to `passages.jsonl` (528 bytes). All 11 texts, urls and headings match too. |
| 3 | No inferred motive | PASS | `918afcd0` opens with biography but states a commitment ("He is running to bring … strong borders and law enforcement …"). No passage marked as stating a policy is only biography, attack, fundraising or event copy. |
| 4 | Silence recorded, not filled | PASS | A4 1, B3 1 (both `918afcd0`). B1 has 1 score over the threshold (`db47392c`, 0.88), but that passage failed the gate, so it counts 0. The other 23 issues are 0. |
| 5 | Possible misses (information only) | 2 listed | `db47392c` and `2c4f2e3b` hold the same sentence, "committed to fighting for lower costs, economic opportunity …". Both were gated out, at commitment 0.83 and 0.71. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script over `run.json` found exactly one host in the passage urls: `brentandersenfl.com`, the OFFICIAL_SITE host. No redirect was involved. The bot challenges in `ingest.log` (HTTP 202) were retried in the browser on the same urls.

- `https://brentandersenfl.com/`: `82c0dcd7`, `db47392c`, `04fbd90a`
- `https://brentandersenfl.com/meet-brent` (About page, chosen by Jev at about=0.65): `2c4f2e3b`, `ee545961`, `df6e17a9`, `1c328bc9`, `9701ffe0`, `918afcd0`, `b560a502`, `dce8d996`

`ingest.log` records only this site and this About page. The 7 links Jev judged (`links.jsonl`) are all on the same host. None was chosen as a policy page (the highest policy score was 0.37, against a 0.5 threshold).

### 2. Quotes verbatim

I checked this with `node`. The script compares `Buffer.from(text, "utf8")` for each passage in `run.json` against the passage with the same id in `passages.jsonl`.

- The id sets match: 11 in `run.json`, 11 in `passages.jsonl`, and every id appears in both.
- `918afcd0` (states_policy=true) is byte-identical, and so are its url and heading.
- All 11 passage texts are identical, including the ones gated out.
- Both citations in `run.json.areas` (A4, B3) point to `918afcd0`, and their text matches `passages.jsonl` exactly. `run-report.txt` cuts the quote short with "…" for display only; the run file holds the full text.
- The script also re-derived every verdict from its scores. `states_policy` equals `commitment >= 0.85`, and `issues` equals the set of scores >= 0.85, for all 11 passages. No mismatches.

### 3. No inferred motive

Only one passage is marked as stating a policy:

- `918afcd0` (commitment 0.97). First 20 words: "A devoted husband to Yula and father to their young daughter, Brent understands the pressures Florida families face every day—from skyrocketing". The first sentence is biography and a description of pressures on families. The second sentence is a commitment: "He is running to bring common-sense conservative leadership to Washington: fiscal responsibility, market-based solutions that lower costs for working families, strong borders and law enforcement, policies that empower parents, and a commitment to protecting the American Dream for the next generation." The passage is therefore not only biography, attack, fundraising or event copy. Its two tags, A4 (0.87) and B3 (0.96), match the phrases "lower costs for working families" and "strong borders".

The gate kept out the other passages:

- Biography: `82c0dcd7`, `ee545961`, `df6e17a9`, `1c328bc9`, `9701ffe0`, `b560a502`, with commitment 0.02 to 0.06.
- Campaign-update copy: `04fbd90a`, commitment 0.02.
- Closing summary: `dce8d996`, commitment 0.67.

`df6e17a9` mentions "the property insurance crisis facing Florida homeowners and businesses" only as a description of the candidate's experience, and it was correctly gated out (commitment 0.04, A1 0.09).

### 4. Silence recorded, not filled

The table counts passages that cleared the 0.85 threshold for each issue and also cleared the gate. That makes them citable as stated_position under the constitution.

| Issue | Passages over threshold | Cleared gate (counted) | Coverage |
|---|---|---|---|
| A4 Cost of living in Florida | 1 (`918afcd0`, 0.87) | 1 | stated |
| B3 Immigration and border enforcement | 1 (`918afcd0`, 0.96) | 1 | stated |
| B1 Economy, inflation, and jobs | 1 (`db47392c`, 0.88) | 0 | no_stated_position_found |
| A1, A2, A3, A5, A6, KYV9, KYV10, A7, B2, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8 (22 issues) | 0 | 0 | no_stated_position_found |

In total, 2 issues have a stated position and 23 are 0. `run.json.areas` holds exactly A4 and B3. It adds no citation for any other issue, so the silence stands recorded as silence.

`db47392c` carries `issues: ["B1"]` in `run.json` even though `states_policy` is false. This is expected: `readVerdict` in `src/lib/policy-noul.ts` thresholds the issues separately from the gate, and `groupByArea` skips passages that failed the gate. B1 therefore does not appear in `areas`, and it counts 0 here.

The corpus is only two pages: the homepage and the About page. No policy page was chosen. The 0 counts describe these 11 passages and nothing beyond them.

### 5. Possible misses (information only)

These passages are marked states_policy=false but state a commitment on a taxonomy issue:

- `db47392c` (commitment 0.83, B1 0.88, A4 0.74), on `/`. First 20 words: "A proud resident of Pompano Beach, Brent is committed to fighting for lower costs, economic opportunity, and constitutional principles that". "Committed to fighting for lower costs, economic opportunity" is a stated commitment in the economy and cost-of-living area, though a broad one. The gate missed it by 0.02.
- `2c4f2e3b` (commitment 0.71, B1 0.79, A4 0.70), on `/meet-brent`. First 20 words: "Brent Andersen is a conservative businessman, proven Republican leader, and dedicated community servant running for the U.S. House of Representatives in". This passage contains the same sentence as `db47392c`, joined to the biography sentence in `82c0dcd7`.

Two items are not counted as misses:

- `dce8d996` (commitment 0.67) mentions "limited government and constitutional principles". That is not a commitment on any taxonomy issue.
- `918afcd0` scored B7 (Crime policy, policing and courts) at 0.84 for "strong borders and law enforcement". It is just under the threshold, but the passage cleared the gate, so it is not a gate miss. It is noted here for the founder only.

VERDICT: PASS
