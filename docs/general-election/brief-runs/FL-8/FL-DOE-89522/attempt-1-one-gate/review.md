# Step 3 review: FL-DOE-89522 (Mike Haridopolos), FL-8-general

Reviewer run on 2026-09-29, read-only, against:

- `passages.jsonl`: 39 passages
- `run.json`: `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 39 asked, 18 `states_policy`, 11 with an issue, 0 failed
- `ingest.log`

Official site: https://www.mike4congress.com/

SPINE: undecided for this race. Check 4 covers all 25 taxonomy sub-issues in `src/lib/news-issues.ts` (A1–A7, B1–B8, KYV1–KYV10), and check 5 considers all of them.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (script-checked) | **PASS** |
| 3 | No inferred motive | **PASS** (2 borderline passages noted) |
| 4 | Silence recorded, not filled | **PASS** (reported below) |
| 5 | Possible misses (information only) | 1 plain miss, 1 borderline |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` `passages[]` and in `areas[].subIssues[].citations[]`, and every `url` in `passages.jsonl`.

- The only host found is `www.mike4congress.com`, the OFFICIAL_SITE host. All 39 of 39 passages are on it.
  - `/`: 16 passages
  - `/issues`: 18 passages
  - `/about`: 5 passages
- `run.json` `site` is `https://www.mike4congress.com`.
- No redirects are involved. No other host appears.
- `links.jsonl` (6 links judged) is all on the same host. Of those, only `/issues` (policy) and `/about` (about) were chosen.

Minor note: `ingest.log` prints per-page lines only for `/issues` (18) and `/about` (5). The homepage's 16 passages are counted in the 39 total, and `ingest-report.md` lists them, but the log has no line for them. This does not change the result.

### 2. Quotes verbatim: PASS

A node script loaded both files and indexed `passages.jsonl` by `id`. For each of the 18 passages where `verdict.states_policy === true`, it compared `run.json` `text` against `passages.jsonl` `text` with `Buffer.compare` on the UTF-8 bytes.

- 18 of 18 identical, 0 mismatches.
- IDs checked: 721f97f2, edbb4fc9, 67dc4ebd, cdf4cbda, 028520a0, 474ba98c, 7fa3b19b, a2a3199d, 09ef25b8, 4c24f783, 3e005845, 3a922585, 3a5cd3cd, 5b7a8406, bf2a8a22, 2728200b, b2317584, b3004edf.

The script also checked beyond what the check asks:

- All 39 `run.json` passages match `passages.jsonl` on `text` and `url`.
- No `run.json` id is missing from `passages.jsonl`.
- Every citation `passage.text` and `url` inside `run.json` `areas` matches `passages.jsonl`, with 0 mismatches.
- Every passage's `issues` equals the set of scores ≥ 0.85.
- Every `states_policy` equals `commitment >= 0.85`.

### 3. No inferred motive: PASS

None of the 18 `states_policy` passages is only biography, attack on an opponent, fundraising or event copy. Each one contains a first-person or attributed commitment, support statement or stated priority:

- 3e005845 opens with an attack on the opponent's party ("Joe Biden's economy crushed working families…") but contains "Mike will stand against federal mandates…".
- 09ef25b8 opens with an attack ("Washington Democrats…") but contains "supporting the SAVE America Act".
- 2728200b and b2317584 include record and attack copy, alongside "strong supporter of President Trump's immigration measures" and "fully stands by President Trump's immigration agenda".
- 3a922585 includes biography and record, alongside "Advancing common sense ideas that protect our Lagoon … is important to Mike".

The fundraising and event passages (dd175ab8, ff92170c, ff15227f, 4d722184), the endorsement passage (4f3d9c06) and the pure biography passages (4bcbd5a9, 224ee1f0, 22db3bfe, ff7ff92b, 39f3ce0a) are all correctly marked no policy.

Borderline, listed for the founder. They are not failures, because each names priorities the candidate states rather than being pure biography:

- **721f97f2** (homepage "About Mike Haridopolos" blurb): "In Congress, he focuses his efforts on supporting our space industry, improving the water quality of our Indian River Lagoon, fighting to protect election integrity, banning…"
  - This is a biography-style sentence that lists focus areas.
  - It is the only citation for A2 (Housing affordability), from the clause "expanding access to affordable housing". The site has no housing section.
- **7fa3b19b** (/issues intro): "Understanding the key issues that impact our country is crucial for making informed decisions. Mike Haridopolos is dedicated to addressing the most pressing concerns facing…"
  - This is generic intro copy. Its only content is a list of priority headings ("stopping illegal immigration…"). It is cited under B3.

### 4. Silence recorded, not filled: PASS

"Clears the threshold" means score ≥ 0.85, the same rule as `applyThreshold` in `src/lib/policy-noul.ts`. The "cited" column also requires the passage to pass the `states_policy` gate, which is what `areas` (and so the brief) uses.

| Issue | Label | Clears threshold | Cited in `areas` | Passage ids |
|---|---|---|---|---|
| A1 | Property insurance costs | 0 | 0 | no_stated_position_found |
| A2 | Housing affordability | 1 | 1 | 721f97f2 |
| A3 | Property taxes | 1 | **0** | 9641a511 (A3 0.95, gate 0.66: not cited) → no_stated_position_found in the brief |
| A4 | Cost of living in Florida | 0 | 0 | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | 0 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 2 | 2 | 67dc4ebd, 09ef25b8 |
| B1 | Economy, inflation, and jobs | 2 | 2 | cdf4cbda, 3e005845 |
| B2 | Healthcare access and costs | 1 | 1 | b3004edf |
| B3 | Immigration and border enforcement | 4 | 4 | cdf4cbda, 7fa3b19b, 2728200b, b2317584 |
| B4 | Social Security and Medicare | 1 | 1 | cdf4cbda |
| B5 | Abortion policy | 0 | 0 | no_stated_position_found |
| B6 | Election integrity | 4 | 4 | 721f97f2, 67dc4ebd, 09ef25b8, 4c24f783 |
| KYV1 | Threats to democratic institutions | 1 | 1 | 4c24f783 (0.85, exactly at threshold) |
| B7 | Crime policy, policing and courts | 1 | 1 | 028520a0 |
| B8 | Climate and environment (national) | 0 | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | 0 | no_stated_position_found |
| KYV5 | Water supply and drinking water | 0 | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | 0 | no_stated_position_found |

These zeros are reported as zeros. No stance was filled in for them.

The run itself records 7 passages that state a policy with no taxonomy issue over threshold: edbb4fc9, 474ba98c, a2a3199d, 3a922585, 3a5cd3cd, 5b7a8406 and bf2a8a22. Under the constitution these become candidate-tier issues, not spine fillers.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but read as a commitment on a taxonomy issue:

- **1b5270d0** (/issues, CRIME & PUBLIC SAFETY; commitment 0.73, B7 0.81): "As the son of a law enforcement agent, Mike knows the challenges our men and women in uniform face each day. Mike will always "Back the Blue"…"
  - "Mike will always 'Back the Blue'" is a plain commitment on B7.
  - The same stance is already cited under B7 through 028520a0, so B7 is not silent because of this miss.
- **d888f8a8** (/issues, PROTECTING OUR ELECTIONS; commitment 0.75, B6 0.76, A7 0.68): "Free and fair elections start with one simple principle: American elections should be decided by American citizens."
  - Borderline. It states a principle rather than an action.
  - A7 and B6 are already covered by 67dc4ebd and 09ef25b8.

Considered and not listed as misses:

- 9641a511 (A3 0.95) is past record: a 2008 property-tax amendment. It is not a stated commitment, so the gate treating it as no policy is consistent with the constitution.
- ba2f1f82 (military) and f09f7dfb (space) are not taxonomy issues.
- 4109aade, 7b31c89d and 6f5d4a64 are record or biography.

### Other note for the founder

The Profiler constitution header uses "Senator Mike Haridopolos says…" as its attribution example. The candidate's own site describes him as the Congressman for Florida's 8th District and as former Florida Senate President (224ee1f0, 22db3bfe). The title "Senator" would be inaccurate in attributed claims, so the template's example title should be corrected. The run output is not affected.

VERDICT: PASS
