# Step 3 review: FL-VF-BRO-1184 (Adam Cervera), FL-BRO-SB6-general

Reviewed under the Profiler constitution. Read-only review of `passages.jsonl`, `run.json` (schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85) and `ingest.log`. No website was fetched.

SPINE: undecided for this race, so check 4 covers every taxonomy issue in `src/lib/news-issues.ts` (TAXONOMY_VERSION 7, 25 sub-issues) and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | PASS |
| 4 | Silence recorded, not filled | PASS (0 passages clear the threshold on any issue; every issue is `no_stated_position_found`) |
| 5 | Possible misses (information only) | PASS (informational: 2 possible misses on A6, listed below) |

## Evidence

### 1. Candidate-controlled sources only: PASS

- OFFICIAL_SITE host: `www.adamcervera.com`.
- Every one of the 19 passage urls in `run.json` is `https://www.adamcervera.com/` (host `www.adamcervera.com`). The same holds for all 19 rows in `passages.jsonl`. `run.json` `site` is `https://www.adamcervera.com`.
- Other hosts: none.
- Coverage note (not a failure): `ingest.log` shows "19 links, 0 policy page(s) selected (cap 8), about page: none" and "asking Jev about 0 link(s)"; `links.jsonl` is empty. The whole corpus is the homepage only.

### 2. Quotes verbatim: PASS

Checked with node: for each `run.json` passage, looked up the same id in `passages.jsonl` and compared `text` with `Buffer.equals`, plus url and heading with `===`.

- Passages marked as stating a policy: 1, `3dd671d7`. Text byte-identical, url and heading identical.
- All 19 run passages matched their `passages.jsonl` counterpart byte-for-byte (no missing ids, no text, url or heading differences). Counts agree: 19 in `passages.jsonl`, 19 in `run.json`.

### 3. No inferred motive: PASS

Only one passage is marked `states_policy: true` (commitment 0.95):

- `3dd671d7`: "Safer Schools Every student deserves to feel safe at school. I’m committed to supporting common-sense safety measures and stronger school security."

This is a first-person commitment by the candidate. It is not biography, an attack on an opponent, fundraising or event copy. No passage of those kinds is marked as stating a policy. The biography passages (`16e7627f`, `80761470`, `492af281`, `77554922`, `e7a5438a`), the endorsement lead-in (`005fa61d`) and the sign-up/feedback copy (`c7256efe`, `e4f4e572`) are all `states_policy: false`.

Side note: `3dd671d7` cleared the gate but matched no taxonomy issue (highest score B7 "Crime policy, policing and courts" 0.31). `run.log` records it as "1 state a policy the taxonomy has no question for". Under the constitution, school safety is a candidate-tier issue for this candidate, not a spine issue. The reviewer does not assign it to one.

### 4. Silence recorded, not filled: PASS

A passage clears the threshold for an issue when that issue's score is >= 0.85. Counted by script, both with and without the commitment gate:

- Taxonomy issues with at least one passage over the threshold: **none**. `counts.with_issue` = 0 and `areas` = `[]` in `run.json`, which agrees.
- So every taxonomy issue gets 0 passages and is recorded as `no_stated_position_found`: A1, A2, A3, A4, A5, A6, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8. Each is **0, no_stated_position_found**.
- For reference only, these are the highest scores and none reaches 0.85: A6 0.73 (`fd035128`), KYV1 0.48 (`12442d3b`), B7 0.31 (`3dd671d7`). Every other issue has a highest score of 0.11 or lower.

The run did not fill any silence. `run-report.txt` states "No passage cleared both the commitment gate and an issue question."

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but read as a plain commitment on a taxonomy issue:

- `fd035128` (commitment 0.78, A6 0.73). A6 is "Public school funding and teachers". First 20 words: "Supporting Teachers Championing policies that give teachers the tools, respect, and support they need to succeed — because strong teachers build"
- `c0357942` (commitment 0.33, A6 0.20). A6 is "Public school funding and teachers", matched through "classroom resources". First 20 words: "Students First Prioritizing academic success, classroom resources, and real opportunities for every student to thrive."

Also listed, though it is a commitment that matches no taxonomy issue (so it is not a spine miss):

- `a751a7eb` (commitment 0.83, just under the 0.85 gate). First 20 words: "Standing with parents and ensuring they have a voice in their children’s education and what happens in the classroom."

### Other observations (no effect on the verdict)

- **Wrong headings.** Passage headings come from page-builder template text, not from the candidate's content. Examples are `16e7627f` and `80761470` under "CHIP IN NOW", and 16 passages, `c7256efe` through `e4f4e572`, under "Pricing Plans". If headings are ever shown next to a quote, these ones would misdescribe it.
- **Race context.** The race is a Broward school board seat (SB6). The whole corpus is about education. Most of the taxonomy (insurance, immigration, abortion and so on) is outside a school board's remit, so the zeros there are expected.
- **Earlier run.** `attempt-1-keywords/` holds an earlier ingest that also found 19 passages from 1 page and selected 0 policy pages. It was not an input to this run.

VERDICT: PASS
