# Step 3 review: FL-DOE-90779 (Kelly Kirschner), FL-16-general

Reviewed 2026-09-29, read-only, against `passages.jsonl` (73 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 73 asked, 0 failed, 28 state a policy, 20 of those match an issue) and `ingest.log`. SPINE: undecided for this race, so check 4 covers every taxonomy issue (`src/lib/news-issues.ts`, taxonomy v7) and check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (checked with a script) | **PASS** |
| 3 | No inferred motive | **PASS** (2 borderline passages noted) |
| 4 | Silence recorded, not filled | **PASS** |
| 5 | Possible misses (for the founder, not a fix) | 2 found, plus 1 weaker |

## Evidence

### 1. Candidate-controlled sources only: PASS

All 73 passages in `run.json` have url `https://kellykirschner.com/`, host `kellykirschner.com`, which is the OFFICIAL_SITE host. The same holds for all 73 rows of `passages.jsonl`. No other host appears, and no redirect was needed.

From `ingest.log`, only the homepage was read: "39 links, 0 policy page(s) selected (cap 8), about page: none". Jev judged 5 links, all `/press/...` or `/media` on the same host, all scored at or below 0.31 policy, and none were fetched. This does not fail the check. It does mean the self-portrait covers the homepage only (73 passages, 2317 words).

### 2. Quotes verbatim: PASS

A node script (`Buffer.compare` on the UTF-8 bytes) compared each of the 28 `states_policy: true` passages in `run.json` with the passage of the same id in `passages.jsonl`. It found 0 text mismatches, 0 url mismatches and 0 missing ids. A second pass with `jq -c '{id,text,url,heading}'` and `comm` found the same: all 28 id/text/url/heading tuples are present in `passages.jsonl` unchanged. The whole corpus also matches: all 73 run passages are byte-identical to `passages.jsonl`.

The script also confirmed that the run is internally consistent. For every passage, `states_policy` equals `commitment >= 0.85`. For every policy passage, `issues` equals the set of scores at or above 0.85.

The 28 policy ids: 51fbeff3, a8d57065, 45f9b165, 369461db, 7c1f6b8e, 89f891dc, a718dc23, 86f94c8f, 27812425, 99132142, 2b067790, a14261e8, 850f1c8f, 2819fa01, 78029a6a, 44847856, 7a0b9d9f, b267f328, 936a05a4, 86c9c4aa, 8f04a1c1, 91d578a6, 21088dc0, 95fca85d, 984d2a4a, 01cbb163, 252195ad, 597e965e.

### 3. No inferred motive: PASS

None of the 28 policy passages is only biography, an attack on an opponent, fundraising or event copy. The biography passages (c6a47167, 56f7f090, b1f060ef, 30f6e54a, d73872e3, 3245bd43, f31050c5, 59a85054) are all `states_policy: false`. So are the opponent/press passages (b2a08ff1, 4b0bb589, 61a7bce7) and the fundraising and volunteer copy (35bd4d27, 942d8eb1, 192008a2, 4b2c2512, efb57f55, 531f4d1f, 24029b9c).

Two passages are borderline. They are not in the prohibited categories, but they carry little specific commitment, so the Profiler should word any claim from them narrowly:
- **86f94c8f** (0.88; A5, KYV3): "If the answer isn’t the people who live here, work here, and raise their families here, it’s time to fix it. This region’s water, wetlands, and working lands…" Mostly problem framing. The only commitment is "it's time to fix it".
- **51fbeff3** (0.95; B2): "Washington has been sold. It's time to take it back. Kelly is running for Congress to lower costs, defend health care, and bring opportunity home…" A campaign tagline that states broad aims.

Eight policy passages match no taxonomy issue. They are candidate-tier material and not a defect: a718dc23 and 8f04a1c1 (taxes/loopholes), 91d578a6, 2819fa01 (disaster/insurance aid equity), 44847856 (federal funding conditions), 95fca85d (war powers), and 984d2a4a and 01cbb163 (veterans).

### 4. Silence recorded, not filled: PASS

These are counts of policy passages that the run attributes to each issue (score at or above 0.85 and `states_policy: true`). Where a raw score also cleared 0.85 on a `states_policy: false` passage, the table notes it. The run gives those passages no issue, and they must not be used.

| Issue | Label | Count | Passage ids |
|---|---|---|---|
| A1 | Property insurance costs | 1 | 597e965e |
| A2 | Housing affordability | 1 | 369461db |
| A4 | Cost of living in Florida | 1 | a8d57065 |
| A5 | Water quality and Everglades restoration | 1 | 86f94c8f (borderline, see check 3) |
| KYV10 | Career, vocational and higher education | 1 | 78029a6a |
| B1 | Economy, inflation, and jobs | 3 | 78029a6a, b267f328, 21088dc0 |
| B2 | Healthcare access and costs | 6 | 51fbeff3, a8d57065, 45f9b165, 7c1f6b8e, 936a05a4, 86c9c4aa (raw score also at or above 0.85 on non-policy d93c9da2, 198acb64, 6b148798) |
| B4 | Social Security and Medicare | 2 | 45f9b165, 7c1f6b8e (raw score also at or above 0.85 on non-policy 198acb64) |
| B8 | Climate and environment (national) | 3 | 27812425, 99132142, 2b067790 |
| KYV2 | Energy and utilities | 3 | 89f891dc, a14261e8, 7a0b9d9f |
| KYV3 | Growth, development and land conservation | 4 | 86f94c8f, 99132142, a14261e8, 850f1c8f |
| KYV4 | Storm resilience and flood protection | 2 | 850f1c8f, 252195ad |
| KYV5 | Water supply and drinking water | 1 | a14261e8 |
| KYV6 | Renters and evictions | 1 | 369461db |

Every other taxonomy issue has **0** passages over the threshold and must be recorded as `no_stated_position_found`: A3, A6, KYV9, A7, B3, B5, B6, KYV1, B7, KYV7 and KYV8. The run fills none of these silences.

### 5. Possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that state a commitment on a taxonomy issue:
- **6b148798** (commitment 0.80; B2 0.93, B4 0.81): "Make crystal clear to every hospital along the Gulf Coast: we are not abandoning you."
- **ee6a3ffb** (commitment 0.74; B1 0.82, B8 0.72, KYV4 0.70): "Protect the Gulf Coast that powers our economy. Clean water, healthy beaches, and resilient coastlines protect tourism, commercial fishing, home values, and thousands…"

This one is weaker and more a value statement than a commitment:
- **2443752c** (commitment 0.67; B1 0.74): "Workers deserve protection. Consumers deserve rights."

These are not on a taxonomy issue and are listed only for context: a6f9f678 (veterans, 0.67) and 8bfd3871 (town halls and constituent access, 0.82).

### Other notes for the founder

- The constitution's attribution example reads "Senator Kelly Kirschner says…". The candidate's own site describes him as a "former Mayor of Sarasota" (f31050c5) and as a former City Commissioner (30f6e54a). No passage calls him a senator. Claims should use "Kelly Kirschner says…" or "The campaign website states…", not "Senator".
- Coverage is limited to the homepage because no policy or about page was selected. Silence on the zero-count issues above reflects this one page.

VERDICT: PASS
