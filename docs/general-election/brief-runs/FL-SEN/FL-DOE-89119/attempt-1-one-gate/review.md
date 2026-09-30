# Step 3 review: FL-DOE-89119 (Ashley Moody), FL-SEN-general

Reviewer: Profiler constitution, read-only review of the machine run. No website was fetched, no file other than this one was written, nothing was committed.

Inputs: `passages.jsonl` (12 passages), `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 12 asked, 0 failed), `ingest.log`.

SPINE: undecided for this race, so check 4 covers every taxonomy issue (tax-7, 25 sub-issues) and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script) | PASS |
| 3 | No inferred motive | PASS (with a note) |
| 4 | Silence recorded, not filled | PASS |
| 5 | Possible misses (information only) | None that plainly state a commitment; one item noted |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` and in `passages.jsonl`. It found exactly one host, `ashleymoody.com`, which is the OFFICIAL_SITE host. No other host appears, and there are no redirects.

- `https://ashleymoody.com/`: d5b934e4, b4f8d4d6, 1a80dd49, 67a7d026
- `https://ashleymoody.com/about`: a4b143fb, d7d80e5c, e0ef5734, 0b4c91f9, d6af6490, e6d2f61a, 453d4273, 1a7510d5

`ingest.log` agrees: `site: https://ashleymoody.com/`, the about page `https://ashleymoody.com/about`, and 0 policy pages selected. The earlier attempt in `attempt-1-keywords/passages.jsonl` also uses only `https://ashleymoody.com/` (the same 4 homepage ids).

Some passages on the candidate's own site carry third-party voices: b4f8d4d6 is headed "Endorsed by President Donald J. Trump", and 67a7d026 quotes an op-ed by Jaime Arellano. The host is still candidate-controlled. Neither passage is marked as stating a policy.

### 2. Quotes verbatim: PASS

A node script compared each `run.json` passage's `text` with the `passages.jsonl` passage of the same id as UTF-8 byte buffers (`Buffer.equals`). The id sets match (12 and 12). All 12 are byte-identical, including both passages marked `states_policy: true`:

- d5b934e4: text identical (120 bytes), url and heading identical
- 1a7510d5: text identical (407 bytes), url and heading identical

The other 10 passages are also byte-identical.

### 3. No inferred motive: PASS, with a note

Two passages are marked `states_policy: true`. Neither is only biography, an attack, fundraising or event copy. Each contains the same candidate-authored statement of dedication to a policy direction.

- **d5b934e4** (commitment 0.86): "Ashley is dedicated to America First policies that promote law and order, economic prosperity, and American sovereignty."
- **1a7510d5** (commitment 0.91): "As U.S. Senator, Ashley continues her mission to uphold conservative values, strengthen national security, and fight for Floridians. She is"

Note for the founder: both statements are general value statements, not specific policy commitments. 1a7510d5 also ends in family biography ("Ashley and her husband, Justin, … have two sons"). Both repeat the same sentence ("dedicated to America First policies that promote law and order, economic prosperity, and American sovereignty"). Neither cleared any issue question: B1 scored 0.69 and 0.65, and B7 scored 0.63 and 0.62, all below 0.85. So neither reaches a Position (`areas: []`, `with_issue: 0`), and the run cannot turn them into an issue stance.

### 4. Silence recorded, not filled: PASS

A script counted, for each taxonomy issue, the passages whose score was at least 0.85 (the same `>=` rule as `applyThreshold`). It also counted how many of those passages cleared the commitment gate.

| Issue | Passages over threshold | Of those, gate cleared | Coverage |
|---|---|---|---|
| B7 Crime policy, policing and courts | 1 (d6af6490, 0.94) | 0 (commitment 0.70 < 0.85) | no_stated_position_found |
| All other 24 issues (A1–A7, B1–B6, B8, KYV1–KYV10) | 0 | 0 | no_stated_position_found |

d6af6490 clears the B7 issue question but not the commitment gate, so `states_policy` is false and `groupByArea` drops it. `run.json` has `areas: []` and `counts.with_issue: 0`. `run-report.txt` states "No passage cleared both the commitment gate and an issue question". The run filled nothing, and every taxonomy issue is recorded as no_stated_position_found. The script also confirmed that each passage's `issues` array equals its set of scores at or above 0.85.

Context, not a finding: the ingest selected 0 policy pages ("37 links, 0 policy page(s) selected (cap 8)"). The highest link policy score was 0.30, for `/page/2`. The site's news and press-release pages were not read. The silence recorded here covers only the homepage and `/about`.

### 5. Possible misses (information for the founder, not a fix)

No passage marked `states_policy: false` plainly states a commitment by the candidate on a taxonomy issue.

The closest item is listed for transparency, not counted as a miss:

- **d6af6490** (commitment 0.70; B7 0.94, B5 0.67): "After serving as a judge for over a decade, Ashley was elected as Florida's 38th Attorney General and quickly earned". It describes her past tenure as Attorney General ("championed policies to enhance public safety, strengthen law enforcement, and crack down on violent crime … protecting religious freedom and the sanctity of life"). That is a record, not a forward commitment.

The other passages marked as stating no policy are biography (a4b143fb, d7d80e5c, e0ef5734, 0b4c91f9, e6d2f61a, 453d4273), an endorsement quote (b4f8d4d6), campaign-organizing event copy that refers to her "record" (1a80dd49), and an op-ed or opponent item (67a7d026). None of them is a commitment.

VERDICT: PASS
