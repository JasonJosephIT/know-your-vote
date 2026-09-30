# Step 3 review: FL-DOE-89119 (Ashley Moody), FL-SEN-general

Reviewer: Profiler constitution, read-only review of the machine run. No website was fetched, no file other than this one was written, nothing was committed.

Inputs: `passages.jsonl` (12 passages), `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, 12 asked, 0 failed, created 2026-09-30T01:59:20Z), `ingest.log`. This run has the second gate (`q_own_commitment`). `states_policy` is true only when both `commitment` and `own_commitment` are at or above 0.85 (`src/lib/policy-noul.ts`).

SPINE: undecided for this race. Check 4 therefore covers every taxonomy issue (tax-7, 25 sub-issues), and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script) | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | None that plainly state a commitment; three closest items listed |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` and in `passages.jsonl`. It found one host, `ashleymoody.com`, which is the OFFICIAL_SITE host. No other host appears, and no redirect is involved.

- `https://ashleymoody.com/`: d5b934e4, b4f8d4d6, 1a80dd49, 67a7d026
- `https://ashleymoody.com/about`: a4b143fb, d7d80e5c, e0ef5734, 0b4c91f9, d6af6490, e6d2f61a, 453d4273, 1a7510d5

`ingest.log` agrees: `site: https://ashleymoody.com/`, about page `https://ashleymoody.com/about`, and 0 policy pages selected.

Two passages on the candidate's own site carry third-party voices. b4f8d4d6 is headed "Endorsed by President Donald J. Trump", and 67a7d026 quotes an op-ed by Jaime Arellano. The host is still candidate-controlled, and neither passage is marked as stating a policy.

### 2. Quotes verbatim: PASS

A node script compared each `run.json` passage `text` with the `passages.jsonl` passage of the same id, as UTF-8 byte buffers (`Buffer.equals`). The id sets match (12 and 12). No passage is marked `states_policy: true` in this run, so the check on policy passages holds vacuously. The script checked all 12 anyway. All 12 texts are byte-identical, and every url and heading matches.

| id | bytes | text identical |
|---|---|---|
| d5b934e4 | 120 | yes |
| b4f8d4d6 | 146 | yes |
| 1a80dd49 | 273 | yes |
| 67a7d026 | 265 | yes |
| a4b143fb | 96 | yes |
| d7d80e5c | 310 | yes |
| e0ef5734 | 374 | yes |
| 0b4c91f9 | 177 | yes |
| d6af6490 | 558 | yes |
| e6d2f61a | 188 | yes |
| 453d4273 | 106 | yes |
| 1a7510d5 | 407 | yes |

### 3. No inferred motive: PASS

No passage is marked as stating a policy (`counts.states_policy: 0`, and every `verdict.states_policy` is false). So no passage of biography, opponent attack, fundraising or event copy is marked as a commitment.

The script also re-derived each verdict from its scores. For every passage, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, and `issues` equals the set of issue scores at or above 0.85. There were no mismatches.

The second gate changed two verdicts compared with the earlier one-gate attempt (`attempt-1-one-gate/`, provenance `q-b2171346`). That attempt marked d5b934e4 and 1a7510d5 as stating a policy. Here they clear `commitment` (0.88 and 0.92) but not `own_commitment` (0.62 and 0.72), so both now read `states_policy: false`.

### 4. Silence recorded, not filled: PASS

A script counted, for each taxonomy issue, the passages with a score at or above 0.85 (the `>=` rule of `applyThreshold`). It also counted how many of those passages cleared the gate.

| Issue | Passages over threshold | Of those, gate cleared | Coverage |
|---|---|---|---|
| B7 Crime policy, policing and courts | 1 (d6af6490, 0.95) | 0 (commitment 0.71, own_commitment 0.13) | no_stated_position_found |
| The other 24 issues (A1–A7, B1–B6, B8, KYV1–KYV10) | 0 | 0 | no_stated_position_found |

d6af6490 clears the B7 issue question but not the gate, so `groupByArea` drops it. `run.json` has `areas: []` and `counts.with_issue: 0`. `run-report.txt` states "No passage cleared both the commitment gate and an issue question". The run filled nothing. Every taxonomy issue stands as no_stated_position_found.

Context, not a finding: the ingest selected 0 policy pages ("37 links, 0 policy page(s) selected (cap 8)"). The highest link policy score was 0.30, for `/page/2`. The site's `/news`, `/category/press-release` and `/endorsements` pages were not read, so this silence covers only the homepage and `/about`. `ingest-report.md` still describes the earlier one-gate run (`q-b2171346`, "State a policy: 2"). It does not match the current `run.json` (`q-e7282116`, 0).

### 5. Possible misses (information for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment by the candidate on a taxonomy issue. The three closest items are listed for transparency. They are not counted as misses.

- **d5b934e4** (commitment 0.88, own_commitment 0.62; B1 0.64, B7 0.62): "Ashley is dedicated to America First policies that promote law and order, economic prosperity, and American sovereignty." This is a general statement of values. It names no specific policy, and no issue score reaches 0.85.
- **1a7510d5** (commitment 0.92, own_commitment 0.72; B7 0.65, B1 0.64): "As U.S. Senator, Ashley continues her mission to uphold conservative values, strengthen national security, and fight for Floridians. She is". It repeats the sentence in d5b934e4 and ends in family biography. No issue score reaches 0.85.
- **d6af6490** (commitment 0.71, own_commitment 0.13; B7 0.95, B5 0.69): "After serving as a judge for over a decade, Ashley was elected as Florida’s 38th Attorney General and quickly earned". It describes her past tenure as Attorney General ("championed policies to enhance public safety, strengthen law enforcement, and crack down on violent crime … protecting religious freedom and the sanctity of life"). That is a record, not a forward commitment.

The other passages marked as stating no policy are:

- biography: a4b143fb, d7d80e5c, e0ef5734, 0b4c91f9, e6d2f61a, 453d4273
- an endorsement quote: b4f8d4d6
- campaign-organizing event copy that refers to her "record": 1a80dd49
- an op-ed or opponent item: 67a7d026

None of them is a commitment.

VERDICT: PASS
