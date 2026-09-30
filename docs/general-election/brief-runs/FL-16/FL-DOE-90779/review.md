# Step 3 review: FL-DOE-90779 (Kelly Kirschner), FL-16-general

Reviewed 2026-09-30, read-only. Inputs: `passages.jsonl` (73 passages), `run.json` and `ingest.log`. The run is `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, created 2026-09-30T01:58:23Z. It asked 73 passages with 0 failures, and it is the two-gate run: `q_states_policy` and `q_own_commitment` must both be at or above 0.85. Of the 73 passages, 17 state a policy and 14 of those match a taxonomy issue. SPINE is undecided for this race, so check 4 covers every taxonomy issue in `src/lib/news-issues.ts` (taxonomy v7) and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (checked with a script) | **PASS** |
| 3 | No inferred motive | **PASS** (2 borderline passages noted) |
| 4 | Silence recorded, not filled | **PASS** |
| 5 | Possible misses (for the founder, not a fix) | 5 clear, 3 weaker, plus off-taxonomy commitments |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 73 passages in `run.json` have host `kellykirschner.com`, which is the OFFICIAL_SITE host, and the url of every one is `https://kellykirschner.com/`. The 22 citations in `run.json` `areas` all use the same host. No other host appears, and no redirect was involved.

`ingest.log` shows that only the homepage was read: "39 links, 0 policy page(s) selected (cap 8), about page: none". Jev judged 5 links (`links.jsonl`), all `/press/...` or `/media` on the same host with policy scores of 0.31 or lower, and none of them was fetched. This does not fail the check, but it limits the self-portrait to the homepage.

### 2. Quotes verbatim: PASS

A node script compared each of the 17 `states_policy: true` passages in `run.json` with the passage of the same id in `passages.jsonl`, using `Buffer.compare` on the UTF-8 bytes. It found 0 text mismatches, 0 url mismatches, 0 heading mismatches and 0 missing ids. A second check with `jq -c` and `[id,text]` tuples plus `grep -vxFf` also found 0 of 17 missing. All 22 citations in `areas` have the same text as `passages.jsonl`. All 73 run passages are byte-identical to the corpus, and both files hold the same 73 ids.

The script also confirmed that the run is internally consistent. For every passage, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, and `issues` equals the set of scores at or above 0.85. Every `areas` citation belongs to a gated passage, is tagged with that issue, and has a score of 0.85 or higher.

The 17 policy ids are 51fbeff3, a8d57065, 45f9b165, 369461db, 7c1f6b8e, 27812425, 99132142, 2b067790, a14261e8, 850f1c8f, 2819fa01, 78029a6a, 44847856, 7a0b9d9f, 936a05a4, 01cbb163 and 252195ad.

### 3. No inferred motive: PASS

None of the 17 policy passages is only biography, an attack on an opponent, fundraising or event copy. The run marks all of the following `states_policy: false`:
- Biography: f31050c5, c6a47167, 56f7f090, b1f060ef, 11cd5f6e, 30f6e54a, d73872e3, 3245bd43, 59a85054, 597b22fa.
- Endorsements, press and poll copy, and the attack on the opponent: 1b8f3386, 43ed59e0, bdb7833e, 8d4d3158, a4b37e3b, b2a08ff1, 4b0bb589, 61a7bce7.
- Fundraising and volunteer copy: 35bd4d27, 942d8eb1, 192008a2, 4b2c2512, efb57f55, 531f4d1f, 24029b9c.

Two policy passages are borderline. They are campaign framing that states broad aims, not a specific commitment, and neither falls in the prohibited categories. The Profiler should word any claim from them narrowly and attribute it:
- **51fbeff3** (commitment 0.94, own 0.89; B2): "Washington has been sold. It's time to take it back. Kelly is running for Congress to lower costs, defend health…" This is the site's tagline.
- **a8d57065** (commitment 0.94, own 0.90; B2): "Government is supposed to solve problems for the people it serves. My first priority is, lowering the cost of living…" This is the lead-in ("On day one, I will get to work on:") to the list below it. It states a priority but no measure.

Three policy passages match no taxonomy issue. They are candidate-tier material, not a defect:
- 2819fa01: aid distributed by need.
- 44847856: conditions on federal funding.
- 01cbb163: Veterans Crisis Line.

### 4. Silence recorded, not filled: PASS

The count is the number of passages that clear the threshold for the issue and pass both gates. These are the only passages the run attributes to an issue, and they match `areas` exactly (22 citations). The raw column also counts passages whose issue score is at or above 0.85 but that failed a gate. The run gives those passages no position, so they must not be used.

| Issue | Label | Count | Policy passage ids | Raw count (incl. gated out) |
|---|---|---|---|---|
| A1 | Property insurance costs | **0** (no_stated_position_found) | none | 1 (597e965e) |
| A2 | Housing affordability | 1 | 369461db | 1 |
| KYV10 | Career, vocational and higher education | 1 | 78029a6a | 1 |
| B1 | Economy, inflation, and jobs | 1 | 78029a6a | 3 (+ b267f328, 21088dc0) |
| B2 | Healthcare access and costs | 5 | 51fbeff3, a8d57065, 45f9b165, 7c1f6b8e, 936a05a4 | 9 (+ d93c9da2, 198acb64, 6b148798, 86c9c4aa) |
| B4 | Social Security and Medicare | 2 | 45f9b165, 7c1f6b8e | 3 (+ 198acb64) |
| B8 | Climate and environment (national) | 3 | 27812425, 99132142, 2b067790 | 3 |
| KYV2 | Energy and utilities | 2 | a14261e8, 7a0b9d9f | 3 (+ 89f891dc) |
| KYV3 | Growth, development and land conservation | 3 | 99132142, a14261e8, 850f1c8f | 4 (+ 86f94c8f) |
| KYV4 | Storm resilience and flood protection | 2 | 850f1c8f, 252195ad | 2 |
| KYV5 | Water supply and drinking water | 1 | a14261e8 | 1 |
| KYV6 | Renters and evictions | 1 | 369461db | 1 |

Every other taxonomy issue has **0** passages over the threshold and is recorded as `no_stated_position_found`: A1 (see above), A3, A4, A5, A6, KYV9, A7, B3, B5, B6, KYV1, B7, KYV7 and KYV8. The run fills none of these silences. None of them appears in `areas`.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but plainly state a commitment on a taxonomy issue. Most of them are imperative platform bullets that clear the first gate but fail `q_own_commitment`. The second gate appears to penalise bullets that lack an explicit "I will".

- **597e965e** (commitment 0.94, own 0.75; A1 0.97), heading "The Insurance Crisis": "Affordable home and flood insurance — and an end to the price-gouging and “business-as-usual” corruption that lets insurers lobby for…" This miss alone is why A1 reads 0.
- **89f891dc** (commitment 0.89, own 0.81; KYV2 0.91): "Invest in affordable energy that lowers your bills."
- **b267f328** (commitment 0.91, own 0.76; B1 0.93): "Give small businesses, farmers, manufacturers, and commercial fishermen stable, predictable rules so they can invest, hire, and grow with confidence."
- **86c9c4aa** (commitment 0.90, own 0.72; B2 0.97): "When Congress guts Medicaid, it isn't some abstraction — it's our brother or cousin choosing between medication and groceries. That…" The passage ends "That ends."
- **6b148798** (commitment 0.81, own 0.79; B2 0.93, B4 0.80): "Make crystal clear to every hospital along the Gulf Coast: we are not abandoning you."

These are weaker. They are aims or values rather than a measure:
- **21088dc0** (commitment 0.85, own 0.45; B1 0.90): "Make sure the AI revolution — which billionaires like Elon Musk are building with our data and our labor market…"
- **ee6a3ffb** (commitment 0.70, own 0.29; B1 0.82, B8 0.70, KYV4 0.68, A5 0.67): "Protect the Gulf Coast that powers our economy. Clean water, healthy beaches, and resilient coastlines protect tourism, commercial fishing, home…"
- **2443752c** (commitment 0.70, own 0.25; B1 0.73): "Workers deserve protection. Consumers deserve rights."

The following commitments fall under no taxonomy issue and are listed only for context, as candidate-tier material that the gate dropped:
- a718dc23 "Tear up the tax breaks that let billionaires pay less than we do." (commitment 0.95, own 0.81)
- 8f04a1c1 "Close those loopholes and pay down the debt." (commitment 0.97, own 0.82)
- 91d578a6 "Put the savings to work for working families instead of offshore accounts."
- 95fca85d "If it’s worth American blood, it is worth a full, public, and rigorous debate in the halls of Congress."
- 984d2a4a "…We owe our veterans a VA that answers the phone, a…"
- a6f9f678 "Make sure no veteran ever has to choose between their dignity and their bureaucracy."

### Other notes for the founder

- **Stale ingest report.** `ingest-report.md` still describes the earlier one-gate run: provenance `q-b2171346`, 28 policy passages, 20 with an issue. The current `run.json` is `q-e7282116`, with 17 and 14. The earlier run and its review are kept in `attempt-1-one-gate/`. The report should be regenerated or annotated so it doesn't contradict `run.json`.
- **"Senator" in the attribution example.** The constitution's example reads "Senator Kelly Kirschner says…". The site describes him as a former Mayor of Sarasota (f31050c5) and former City Commissioner (30f6e54a), and no passage calls him a senator. Claims should read "Kelly Kirschner says…" or "The campaign website states…".
- **Homepage only.** No policy or about page was selected, so coverage is the homepage alone (73 passages, 2317 words). The zero counts above reflect that one page.

VERDICT: PASS
