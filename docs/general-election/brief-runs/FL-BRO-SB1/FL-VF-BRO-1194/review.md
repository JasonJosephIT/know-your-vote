# Step 3 review: FL-VF-BRO-1194 (Maura McCarthy Bulman), FL-BRO-SB1-general

Reviewed: `run.json` (schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates `q_states_policy` + `q_own_commitment`), `passages.jsonl` (18 passages), `ingest.log`. Official site: https://www.mauraforbroward.com/. Spine: undecided, so checks 4 and 5 cover every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7, 25 sub-issues).

The earlier one-gate run and its review are kept in `attempt-1-one-gate/`. This review covers the current `run.json` only.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 18 run.json passages are on `www.mauraforbroward.com` (12 at `/`, 6 at `/meetmaura`). No other host. |
| 2 | Quotes verbatim | **PASS** | 0e2f3328 (the only `states_policy: true` passage) is byte-identical in run.json `passages`, run.json `areas`, and passages.jsonl. All 18 of 18 run.json texts and urls match by script. |
| 3 | No inferred motive | **PASS** | 0e2f3328 is the only passage marked as stating a policy, and it is a first-person commitment ("I will fight for them"). |
| 4 | Silence recorded, not filled | **PASS** | A6: 1 gated passage (0e2f3328), 2 raw (plus 3eaa5ec7). Every other issue: 0, `no_stated_position_found`. `areas` holds A6 only. |
| 5 | Possible misses (information only) | reported | abe548ed (A6). 3e471db4 is a commitment on no taxonomy issue (candidate-tier). |

## Evidence

### Check 1: hosts

Script over `run.json.passages[].url` and `passages.jsonl[].url`: `{ "www.mauraforbroward.com": 18 }` in both. That is the OFFICIAL_SITE host. No redirects were needed. `links.jsonl` shows that the ingest judged only two same-site links (`/meetmaura` chosen as the about page, `/endorsements-1` not chosen). No endorsement, news or third-party page entered the corpus.

### Check 2: verbatim (by script)

A node script loaded both files and compared each run.json passage to the passages.jsonl passage with the same id using `Buffer.equals` on `text` and string equality on `url`. Result: **18 of 18 identical**. It also compared the only `areas` citation (A6 → 0e2f3328) byte for byte with passages.jsonl and found it identical. Ids are unique (18 of 18) in both files.

### Check 3: passages marked as stating a policy

`counts.states_policy = 1`. There is one such passage:

- **0e2f3328** (homepage, "Join our campaign!"; commitment 0.94, own_commitment 0.92; A6 0.97). First 20 words: "I believe in creating a nurturing, safe learning environment for all students, where they can explore diverse ideas and perspectives." It contains first-person commitments and positions: "Our teachers deserve competitive pay and the resources they need to succeed… I will fight for them." It is not biography, an attack, fundraising or event copy.

None of the passages that are only biography, record, contact details or campaign copy is marked as stating a policy. The second gate removes the attempt-1 failure: 0e45e163 now has commitment 0.91 and own_commitment 0.45, so `states_policy: false`.

### Check 4: passages over the threshold (0.85), by taxonomy issue

"Gated" means the passage also passes both gates. Only gated passages reach `areas` and Positions. "Raw" counts any issue score of 0.85 or more.

| Issue | Label | Gated | Raw | Passages |
|---|---|---|---|---|
| A6 | Public school funding and teachers | 1 | 2 | 0e2f3328 (0.97, gated); 3eaa5ec7 (0.86, raw only: commitment 0.55, own_commitment 0.15) |

Every other taxonomy issue has **0** passages over the threshold, raw or gated, and is recorded as `no_stated_position_found`: A1, A2, A3, A4, A5, KYV9, KYV10, A7, B1, B2, B3, B4, B5, B6, KYV1, B7, B8, KYV2, KYV3, KYV4, KYV5, KYV6, KYV7, KYV8. The highest score among them is B1 at 0.63, on 0e2f3328.

The run did not fill silence. `areas` contains only Education → A6, with the single citation 0e2f3328. 3eaa5ec7 carries `issues: ["A6"]` in its own verdict, because `readVerdict` applies the issue threshold whatever the gate returns. It has `states_policy: false`, though, and is correctly absent from `areas`.

### Check 5: possible misses (information for the founder, not a fix)

This is a passage marked `states_policy: false` that plainly states a commitment on a taxonomy issue:

- **abe548ed** (homepage, "Meet Maura"; commitment 0.58, own_commitment 0.84; A6 0.66). First 20 words: "Throughout her life, Maura has answered the call. As a lawyer, activist, School Board member, and mother, she has proven". Later it says: "She is committed to fighting for the resources, support, and respect that our families and school staff [sic]. She looks forward to continue working to ensure that our schools are the best they can be…". That is a stated commitment on resources for school staff (A6), in the campaign's third-person voice. A6 is already covered by 0e2f3328, so gating this passage in would add a second citation and would not change a 0 to a 1.

This passage states a commitment, but not on any taxonomy issue:

- **3e471db4** (homepage, "Join our campaign!"; commitment 0.87, own_commitment 0.83, just under the threshold; A6 0.25). First 20 words: "Our public schools offer incredible programs, but we need to better communicate their value and successes to parents and the". It includes "We must build a robust communication strategy…" and "We must continue to work to hold School Board staff accountable". No taxonomy issue fits it, so it could surface only as a candidate-tier item (school-district communication and accountability). It is not a miss on the spine.

These passages were considered and not listed:
- 3eaa5ec7 (A6 0.86), c8df7a87 (A6 0.74) and 0e45e163 (A6 0.82) are past record: school maintenance and renovation, accountability for the superintendent, keeping District 1 schools open, arts and science programming, and oversight of taxpayer dollars. 0e45e163 also gives her stated reason for running. None of the three is a forward commitment.
- 5de798d6 ("efforts to weaken our public schools will damage the future of our home") states a view with no commitment.
- fba0f36d, 63bd5265, 2aca8693, 601a29a2 and 228283a8 are general campaign copy: "running for re-election to continue to serve", "we will not [let] them down", "make our schools the best they can be".
- 2ba030c6 (school recycling) is past record, with B8 at 0.06.
- 4d36b917, 703cfc6f and 07873aa8 are biography. f25f43bc and 699bd756 are contact details.

### Other observations (they do not affect the checks)

- `ingest-report.md`'s "Step 2: policy run" table is stale. It describes the attempt-1 one-gate run (provenance `q-b2171346`, 3 passages over the gate, 63667 tokens in). The current `run.json`/`run.log` show `q-e7282116`, 1 passage over the gates and 67411 tokens in.
- `ingest.log` reports "8 passage(s)" for `/meetmaura`, but passages.jsonl holds 6 from that page (the ingest report also says 6). The log line appears to count before deduplication.

VERDICT: PASS
