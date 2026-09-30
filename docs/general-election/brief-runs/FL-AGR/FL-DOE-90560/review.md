# Step 3 review: FL-DOE-90560 (Wilton Simpson), FL-AGR-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (137 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status complete, 137 of 137 asked, 0 failed, 7 state a policy, 2 of those match a taxonomy issue), `ingest.log`. This is the two-gate run: a passage states a policy only if both `q_states_policy` (commitment) and `q_own_commitment` are at least 0.85. The earlier one-gate run and its review are in `attempt-1-one-gate/`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7). No website was fetched.

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 137 passage urls in `run.json` (and in `passages.jsonl`) are on `wiltonsimpson.com`. No other host, no redirect. |
| 2 | Quotes verbatim | PASS | The 7 states_policy passages (`fc738887`, `ed8c0672`, `33c5a1fd`, `91d076da`, `d6e4045d`, `4018d934`, `c02b9331`) are byte-identical to the same ids in `passages.jsonl` (node `Buffer.equals`); url and heading also match. All 137 match on text. |
| 3 | No inferred motive | **FAIL** (4 passages) | `91d076da`, `ed8c0672`, `33c5a1fd`, `d6e4045d`: bare items from a list of past tax relief ("Some of that tax relief includes:"), with no commitment by the candidate. `91d076da` is the only B1 citation in `run.json.areas`. |
| 4 | Silence recorded, not filled | PASS | Counted: B1 1 (`91d076da`, flagged in check 3), KYV9 1 (`4018d934`). A2, A3, A4, A5, KYV10, A7, B3, B6, B7, KYV3, KYV4 have passages over 0.85 on the issue but none cleared both gates, so they count 0. The other 12 issues count 0. Every zero is no_stated_position_found. |
| 5 | Possible misses (information only) | INFO: 4 plain stances or commitments, 3 weaker, many past-record items | `012e39e2` (KYV9), `7bba5a01` (A2, KYV4), `475975c4` (KYV10), `69f66975` (KYV3). See below. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script parsed every `url` with `new URL()` in both files: `{ "wiltonsimpson.com": 137 }` in `run.json` and in `passages.jsonl`. `run.json` `site` is `https://wiltonsimpson.com`, the OFFICIAL_SITE origin. Every page in `ingest.log` and every link in `links.jsonl` is on the same host. `ingest.log` has no robots, bot-challenge or off-host lines.

| URL | Passages |
|---|---|
| `https://wiltonsimpson.com/` | 15 |
| `https://wiltonsimpson.com/about` | 9 |
| `https://wiltonsimpson.com/agriculture` | 20 |
| `https://wiltonsimpson.com/economic-freedom` | 24 |
| `https://wiltonsimpson.com/education` | 12 |
| `https://wiltonsimpson.com/environment` | 27 |
| `https://wiltonsimpson.com/free-florida` | 12 |
| `https://wiltonsimpson.com/public-safety` | 18 |

Bookkeeping notes, not failures:
- `ingest.log` lists no homepage line and gives per-page counts one higher (four for `/about`) than `passages.jsonl` (for example 19 vs 18 for `/public-safety`). Both total 137; the gap looks like cross-page de-duplication and does not affect provenance.
- `ingest-report.md`'s "Step 2: policy run" table still describes the one-gate run (`q-b2171346`, 30 states policy, 19 with an issue). The current `run.json`, `run.log` and `run-report.txt` are the two-gate run (`q-e7282116`, 7 and 2).

### 2. Quotes verbatim

Checked with `node` (`Buffer.from(text, "utf8").equals(...)`) against `passages.jsonl` by id:

- Id sets match: 137 in `run.json`, 137 unique in `passages.jsonl`, 0 missing either way, no duplicate ids.
- The 7 states_policy=true passages: 0 byte mismatches on text; url and heading identical.
- All 137 passages: 0 text mismatches; 0 null verdicts.
- Internal consistency: for every passage, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, and `issues` equals the taxonomy-ordered set of scores >= 0.85. 0 inconsistencies.
- `areas` holds only gated passages: B1 `91d076da` (0.89), KYV9 `4018d934` (0.97). This matches `run-report.txt`.

### 3. No inferred motive

The 7 passages marked states_policy=true (commitment / own_commitment, issues), first 20 words:

| id | page | scores | first 20 words | finding |
|---|---|---|---|---|
| `fc738887` | /public-safety | 0.94 / 0.93, none | "Our constitutional right to protest has played a critical role in the great history of our democracy. Wilton will defend" | OK. Forward commitment: "Wilton will defend the right of every Floridian to peacefully protest." B7 is 0.84, so no issue tag. |
| `ed8c0672` | /economic-freedom | 0.93 / 0.92, none | "Permanent Sales Tax Exemption for Independent Living Items" | **FAIL.** Past-record list item. |
| `33c5a1fd` | /economic-freedom | 0.89 / 0.85, none | "Tax Exemption for Feminine Hygiene Products" | **FAIL.** Past-record list item. |
| `91d076da` | /economic-freedom | 0.95 / 0.91, B1 | "Permanently Eliminated Sales Tax for Machinery and Manufacturing Equipment" | **FAIL.** Past-record list item, in the past tense. Published under B1. |
| `d6e4045d` | /economic-freedom | 0.94 / 0.93, none | "Permanent Sales Tax Exemptions for Children’s Car Seats, Booster Seats, and Bicycle Helmets" | **FAIL.** Past-record list item. |
| `4018d934` | /education | 0.97 / 0.96, KYV9 | "Wilton understands that education isn’t one-size-fits all, and a parent’s income shouldn’t be a barrier to a good school. He" | OK. Forward commitment: "will continue to make sure school choice is an option for every family in Florida." |
| `c02b9331` | /agriculture | 0.86 / 0.93, none | "Like Wilton, Florida farmers couldn’t take a day off during the COVID-19 Pandemic. Florida had no diminishment of our food" | OK. Forward commitment: "Wilton will continue to support our farmers and make sure this critical industry is protected." |

Why the four tax items fail. They sit under the heading "Tax Relief for Florida’s Families and Businesses" on `/economic-freedom`, and the passage that opens the list, `78c9f895`, reads: "For nearly a decade, Wilton has fought to ensure Floridians and businesses keep more of their hard-earned money. Some of that tax relief includes:". Their siblings in the same list are past tense: `dbcf35c0` "Expanded the Tax Credit for Affordable Housing", `4ded5f3a` "Permanently Decreased the Communication Services Tax…", `e310d2b0` "Eliminated the Sales Tax Charged to Returning Service Members…", `bcb6d24b` "Provided a Nearly $400 million Reduction in Vehicle Registration Fees". The four gated items are entries in the candidate's record of enacted tax relief. They are not bare plan items ("Cut property taxes") of the kind the `q_own_commitment` wording counts, and none states anything the candidate will do. This matches the precedent in `FL-12/FL-DOE-88868/review.md` (the record line "$2M to expand mental-health services…" failed check 3). These items carry no inferred motive. The failure is that they would be published as stated positions when they are record. The one-gate review of this candidate listed `91d076da` as a legislative record item. It was not a failure there. The batch summary `review-2026-09-29.md` counted it as flagged.

Effect if the four are withheld: B1 falls from 1 to 0 (no_stated_position_found), and only KYV9 (`4018d934`) remains a taxonomy position. `fc738887` (protest rights and public order) and `c02b9331` (support for farmers) remain as candidate-tier items with no taxonomy issue at or over 0.85.

Notes for the Profiler and the founder (not failures):
- **The second gate removed all three one-gate check 3 failures.** `fa5d4f41` (Brewster Bevis endorsement, own 0.34), `f5f61553` (attack copy, own 0.17) and `6f81ca9a` (biography, own 0.31) are now states_policy=false.
- **The gate is inconsistent within one list.** In the same tax relief list, `ed8c0672`, `d6e4045d`, `91d076da` and `33c5a1fd` passed at own 0.85–0.93, while `dbcf35c0` (0.78), `4ded5f3a` (0.70), `e310d2b0` (0.67) and `bcb6d24b` (0.29) did not. The noun-phrase items ("Permanent Sales Tax Exemption for…") read like plan items without their list lead-in, which the model does not see. `33c5a1fd` is exactly at 0.85.
- **Gated-out passages still carry `issues`.** `readVerdict` fills `issues` regardless of the gate, and `groupByArea` skips states_policy=false. Examples: `fa5d4f41` `["B1"]`, `f5f61553` `["B6"]`, `db2defb0` `["B3"]`. These are not issue tags and must not become claims.
- **The title "Senator" is not current.** The Profiler prompt says "Senator Wilton Simpson". The site calls him "Commissioner Simpson" (`c98f6156`), "Agricultural Commissioner and former Florida Senate President" (`98b6ceda`, a quoted news line), and describes past acts "As Senate President" (`2799f41f`, `e02dfa80`). Under rules 1 and 2, no claim should call him a sitting Senator. Attribute to "the campaign website" or to "Commissioner Wilton Simpson".

### 4. Silence recorded, not filled

A passage counts only if it clears both gates and its issue score is >= 0.85 (as `groupByArea` does). Every taxonomy issue with at least one passage at or over 0.85 on the issue score:

| Issue | Label | Passages that count | Over 0.85 on the issue but gated out (issue / commitment / own) | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 0 | `dbcf35c0` (0.94 / 0.92 / 0.78), `c6bacdd2` (0.96 / 0.75 / 0.36), `7bba5a01` (0.93 / 0.95 / 0.73) | no_stated_position_found |
| A3 | Property taxes | 0 | `db4723da` (0.97 / 0.73 / 0.20), `74cb9096` (0.94 / 0.50 / 0.36) | no_stated_position_found |
| A4 | Cost of living in Florida | 0 | `2ea108d4` (0.91 / 0.81 / 0.25), `125e5a57` (0.88 / 0.85 / 0.40) | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 0 | `449f8935` (0.92 / 0.66 / 0.19), `c8bcc7f5` (0.92 / 0.59 / 0.71), `e27c429e` (0.94 / 0.32 / 0.19) | no_stated_position_found |
| KYV9 | School choice and vouchers | 1: `4018d934` | `aaba4190` (0.96 / 0.94 / 0.73), `2799f41f` (0.91 / 0.19 / 0.07), `012e39e2` (0.98 / 0.96 / 0.53), `9eee9082` (0.93 / 0.38 / 0.07), `773d0fca` (0.96 / 0.92 / 0.44), `de9aabe0` (0.92 / 0.61 / 0.20) | stated |
| KYV10 | Career, vocational and higher education | 0 | `8a6a06bb` (0.96 / 0.69 / 0.56), `aaba4190` (0.92 / 0.94 / 0.73), `475975c4` (0.97 / 0.90 / 0.64) | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | `9973439b` (0.98 / 0.92 / 0.48), `e02dfa80` (0.95 / 0.68 / 0.13) | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 1: `91d076da`* | `125e5a57` (0.87 / 0.85 / 0.40), `6860ddf8` (0.96 / 0.94 / 0.79), `b6824c3b` (0.87 / 0.94 / 0.73), `14999fb4` (0.88 / 0.47 / 0.11), `51e21350` (0.87 / 0.78 / 0.22), `5d3686f5` (0.97 / 0.76 / 0.19), `fa5d4f41` (0.97 / 0.87 / 0.34) | stated as run; 0 (no_stated_position_found) if `91d076da` is withheld |
| B3 | Immigration and border enforcement | 0 | `db2defb0` (0.98 / 0.93 / 0.33) | no_stated_position_found |
| B6 | Election integrity | 0 | `f5f61553` (0.86 / 0.87 / 0.17), `e02dfa80` (0.98 / 0.68 / 0.13) | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | `c16add7a` (0.85 / 0.72 / 0.34), `3845ba5f` (0.98 / 0.85 / 0.16), `1d063f90` (0.95 / 0.58 / 0.11), `8a444990` (0.96 / 0.86 / 0.30), `c3b9bcfb` (0.87 / 0.55 / 0.25), `a1fcf106` (0.94 / 0.67 / 0.45) | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | `f6debb37` (0.87 / 0.21 / 0.07), `4d0f2797` (0.90 / 0.17 / 0.13), `78d01558` (0.89 / 0.72 / 0.36), `289a6ab1` (0.88 / 0.60 / 0.44), `baf2ba58` (0.95 / 0.71 / 0.22), `9015173f` (0.89 / 0.82 / 0.45), `a13e416a` (0.86 / 0.77 / 0.72), `69f66975` (0.89 / 0.90 / 0.66), `db4723da` (0.91 / 0.73 / 0.20) | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 0 | `c6bacdd2` (0.89 / 0.75 / 0.36), `7bba5a01` (0.90 / 0.95 / 0.73), `9015173f` (0.91 / 0.82 / 0.45) | no_stated_position_found |

\* Flagged in check 3.

The other 12 issues have 0 passages at or over the threshold and are no_stated_position_found: A1, A6, B2, B4, B5, KYV1, B8, KYV2, KYV5, KYV6, KYV7, KYV8.

The run filled nothing. `run.json.areas` has exactly B1 and KYV9, and no area exists for a 0-count issue. The run does not write `no_stated_position_found` records itself; that stays the Profiler's job. Compared with the one-gate run (11 issues with gated passages), the second gate removed A2, A4, KYV10, A7, B3, B6, B7, KYV3 and KYV4 to 0 and cut KYV9 from 4 to 1 and B1 from 5 to 1. That is a recall finding for check 5, not a fill.

### 5. Possible misses (information for the founder, not a fix)

Passages marked states_policy=false that state a stance or commitment on a taxonomy issue. Listed for the founder to judge; they are not suggested fills.

**Plain stances or forward commitments by the candidate (the `own_commitment` gate rejected them):**
- `012e39e2` /education (KYV9 0.98; 0.96 / 0.53): "“The only way to eliminate generational poverty is through school choice in the K-12 education system. We must allow parents". A signed quote ("— Wilton Simpson") stating a stance in his own words.
- `7bba5a01` /environment (A2 0.93, KYV4 0.90; 0.95 / 0.73): "“It is crucial that we modernize our documentary stamp distributions to dedicate a steady stream of funding in three key". It continues "areas of infrastructure – affordable housing, wastewater, and mitigation of sea-level rise.” — Wilton Simpson". A signed stance, under a past-record heading ("Established a Statewide Infrastructure Plan").
- `475975c4` /education (KYV10 0.97; 0.90 / 0.64): "Wilton worked to rebalance state financial aid programs to cover the cost of tuition and fees for general education requirements." It continues "He understands that we must pursue targeted programs that lead to jobs and scholarship programs…". Past record plus a stated stance.
- `69f66975` /agriculture (KYV3 0.89; 0.90 / 0.66): "As more and more people leave densely populated areas of the country and relocate to rural areas of our state," It ends "Wilton wants to make certain we continue to preserve existing farms which create critical jobs…". A forward commitment.

**Weaker cases:**
- `aaba4190` /education (KYV9 0.96, KYV10 0.92; 0.94 / 0.73): "Ensuring access to world class education opportunities for Florida’s students is key to achieving the American Dream. Keeping our schools". It calls school choice and vocational education "commonsense Florida solutions" but does not name the candidate or a commitment.
- `a13e416a` /agriculture (KYV3 0.86; 0.77 / 0.72): "Strengthening Florida’s Greenbelt Protections". A bare item; it may be a plan item or a record heading (the page's other Greenbelt passages are record, `db4723da`).
- `9015173f` /environment (KYV3 0.89, KYV4 0.91; 0.82 / 0.45): "These efforts are critical as we work to address flooding and sea-level rise resiliency as well as water management and". Describes legislation already passed; "as we work to address" is the only forward language.

**Past-record items with an issue score >= 0.85.** The second gate is worded to reject these, and it did (the check 3 exceptions aside): `e02dfa80` (B6 0.98, A7 0.95; "As Senate President, Wilton worked with Governor Ron DeSantis to proactively review and address election security in Florida."), `9973439b` (A7), `db2defb0` (B3; "That is why Wilton worked to ban sanctuary cities in Florida."), `3845ba5f` and `8a444990` (B7), `773d0fca` and `2799f41f` (KYV9), `8a6a06bb` (KYV10), `6860ddf8`, `b6824c3b`, `5d3686f5`, `51e21350`, `125e5a57` (B1), `dbcf35c0` and `c6bacdd2` (A2), `2ea108d4` (A4), `db4723da` and `74cb9096` (A3), `449f8935`, `c8bcc7f5`, `e27c429e` (A5), `baf2ba58`, `f6debb37`, `4d0f2797`, `289a6ab1` (KYV3), `a1fcf106` (B7). The site is written mostly as a record of past work, so under the two-gate rule most of it cannot be a stated position.

**Correctly kept out (not misses):** third-party quotes and endorsements `fa5d4f41`, `9eee9082`, `de9aabe0`, `1d063f90`, `c3b9bcfb`, `76518f4f`, `745db92c`, `63849b4b`; attack copy `f5f61553`; description of conditions `14999fb4`, `c16add7a`. `78d01558` (KYV3 0.89; 0.72 / 0.36) is an unattributed quote on land preservation, so it is kept out as someone else's words.

VERDICT: FAIL (check 3: `91d076da`, `ed8c0672`, `33c5a1fd` and `d6e4045d` are items from the /economic-freedom list of past tax relief with no commitment by the candidate, but they clear both gates; `91d076da` is published as the only B1 citation)
