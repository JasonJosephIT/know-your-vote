# Step 3 review: FL-DOE-92377 (Christopher Dennison), FL-7-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (17 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, two gates `q_states_policy` + `q_own_commitment`, threshold 0.85, status complete, 17 of 17 asked, 0 failed, created 2026-09-30T01:58:39Z), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

This review is of the current top-level `run.json`. The earlier one-gate run (`q-b2171346`) and its review are kept in `attempt-1-one-gate/` and were not re-reviewed.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 17 passages and all 3 `areas` citations are on `dennison4congress.com` (5 from `/`, 12 from `/issues-2`). No other host. |
| 2 | Quotes verbatim | PASS | All 5 states_policy=true passages (`41b9675e`, `a424af76`, `2dcb8eed`, `2bee679f`, `1537d983`) and all 3 `areas` citations are byte-identical to `passages.jsonl`. Checked with `node`. |
| 3 | No inferred motive | PASS | None of the 5 passages marked as stating a policy is only biography, an attack on an opponent, fundraising or event copy. Each carries a commitment in the candidate's voice. |
| 4 | Silence recorded, not filled | PASS | Published (gated): B2 = 1 (`2dcb8eed`), B5 = 1 (`2bee679f`), B7 = 1 (`a424af76`). The other 22 issues = 0, no_stated_position_found. Ungated over-threshold scores listed below for the record. |
| 5 | Possible misses (information only) | 3 found | `83b70a8e` (KYV3), `1c672fe2` (B7), `a3d4dea8` (B7): each plainly states a position but failed the own-commitment gate. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script collected the host of every passage url in `run.json` and every citation url under `areas`. One host: `dennison4congress.com`, the OFFICIAL_SITE host. No redirect was involved.

- `https://dennison4congress.com/`: `49346e1a`, `41b9675e`, `a424af76`, `2dcb8eed`, `0e65de95`
- `https://dennison4congress.com/issues-2`: `184a806e`, `83b70a8e`, `1c672fe2`, `2bee679f`, `a3d4dea8`, `1537d983`, `86a55d23`, `b2bf97cf`, `f53e222d`, `96fabaaf`, `480de0ab`, `eca9438e`

`ingest.log` records only this site. Both links Jev judged (`links.jsonl`: `/issues-2` chosen, `/issues` "Help us reach District 7" not chosen) are on the same host. `run.json` `site` is `https://dennison4congress.com`.

### 2. Quotes verbatim

Checked with `node`, comparing `Buffer.from(text)` for each `run.json` passage against the passage with the same id in `passages.jsonl`:

- Id sets match: 17 in `run.json`, 17 in `passages.jsonl`, 17 distinct, none missing on either side.
- The 5 passages with states_policy=true are byte-identical in text, and url and heading also match: `41b9675e` (217 bytes), `a424af76` (277), `2dcb8eed` (298), `2bee679f` (223), `1537d983` (285).
- The 3 `areas` citations (B2 `2dcb8eed`, B7 `a424af76`, B5 `2bee679f`) are byte-identical too.
- The remaining 12 passages are also identical (no MISMATCH printed for any of the 17).

The same script confirmed every `states_policy` equals `commitment >= 0.85 AND own_commitment >= 0.85` (0 mismatches), and every `issues` array equals the set of scores >= 0.85. No verdict disagrees with its own numbers.

### 3. No inferred motive

The 5 passages marked as stating a policy, with gate scores (commitment / own_commitment) and first 20 words:

- `41b9675e` (0.98 / 0.98, FOREIGN POLICY, no taxonomy issue): "I served, and I will not vote to send anyone else's kid into a war we cannot explain. We end". A voting commitment.
- `a424af76` (0.98 / 0.98, FOURTH AMENDMENT, B7): "Flock and Axon have turned our streets into a permanent lineup. Every plate, every face, every trip you take, logged". Continues "I will get these systems out of public spaces". Flock and Axon are vendors, not opponents; the passage is a commitment, not an attack on a candidate.
- `2dcb8eed` (0.98 / 0.88, SUPPORTING VETERANS, B2): "Let Veterans Choose Their Own Care. My benefits should not be trapped inside one government hospital system. Veterans earned that". A stated policy ("Put the benefit in the veteran's hands").
- `2bee679f` (0.98 / 0.95, Abortion, Not a Federal Question, B5): "The federal government has no authority here. This belongs to the states, and I will not vote to hand Washington". A voting commitment.
- `1537d983` (0.98 / 0.95, End Foreign Aid. Charge for Defense., no taxonomy issue): "Not one more dollar borrowed from my grandchildren to fund another country's government. If a nation wants American troops on". A stated policy.

Biography (`49346e1a`, `86a55d23`, `b2bf97cf`, `f53e222d`, `480de0ab`, `96fabaaf`), volunteer/event copy (`0e65de95`) and framing copy (`184a806e`, `eca9438e`) are all states_policy=false.

### 4. Silence recorded, not filled

Threshold 0.85. "Published" means the passage also cleared both gates, so it appears under `areas` and would become a stated_position claim.

| Issue | Published (gated) | Over threshold but not gated |
|---|---|---|
| B2 Healthcare access and costs | 1: `2dcb8eed` (0.95) | 0 |
| B5 Abortion policy | 1: `2bee679f` (0.93) | 0 |
| B7 Crime policy, policing and courts | 1: `a424af76` (0.93) | 2: `1c672fe2` (0.92), `a3d4dea8` (0.92) |
| KYV3 Growth, development and land conservation | 0, no_stated_position_found | 1: `83b70a8e` (0.96) |
| A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B3, B4, B6, KYV1, B8, KYV2, KYV4, KYV5, KYV6, KYV7, KYV8 | 0 each, no_stated_position_found | 0 each |

The run did not fill any silence: no issue gets a citation from a passage below the threshold, and `areas` holds only the three gated citations. Two gated passages (`41b9675e` foreign policy / war powers, `1537d983` foreign aid and defense cost-sharing) match no taxonomy issue. Under the constitution these are candidate-tier issues, not spine issues, and the run correctly did not force them into one.

### 5. Possible misses (information for the founder, not a fix)

Three passages are marked states_policy=false only because the second gate (own_commitment) fell below 0.85. Each plainly states the candidate's position on a taxonomy issue, and each already scores over the threshold on that issue:

- `83b70a8e`, heading "Washington Doesn't Own Your Land" (commitment 0.92, own_commitment 0.38; KYV3 0.96): "If you want to build a data center on property you own, that is between you and your neighbors. The". KYV3 therefore publishes as no_stated_position_found although the issues page has a plank on it.
- `1c672fe2`, heading "End Qualified Immunity" (0.97 / 0.80; B7 0.92): "No government employee should be shielded from the consequences of their own actions. This is not about any one profession."
- `a3d4dea8`, heading "The State Should Not Decide Who Dies" (0.94 / 0.79; B7 0.92): "I do not trust any government that gets this wrong even once. Courts convict innocent people. I would rather one". A stated opposition to the death penalty.

`184a806e` ("Every plank below is a position I will defend on the record...", own_commitment 0.71) says each plank on `/issues-2` is a position the candidate will defend. That frames all three passages above as the candidate's own positions, which is what the own-commitment gate asks. `96fabaaf` (commitment 0.74, B1 0.55) was considered and is not a miss: it is a statement of political philosophy, not a commitment on a spine issue.

### Bookkeeping notes (not failures)

- `ingest.log` prints "13 passage(s)" for `/issues-2`, but `passages.jsonl` holds 12 from that url (5 + 12 = 17, matching the log's final line). The difference is in the ingest's own count before writing; it does not change what was asked.
- `ingest-report.md`'s "Step 2: policy run" table still describes the earlier one-gate run (`q-b2171346`, 8 state a policy, 6 with an issue, 60014 tokens in). The current `run.json`, `run-report.txt` and `run.log` show `q-e7282116`, 5 state a policy, 3 with an issue, 63550 tokens in. The report needs updating to match.

VERDICT: PASS
