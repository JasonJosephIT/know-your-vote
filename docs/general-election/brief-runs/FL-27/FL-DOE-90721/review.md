# Step 3 review: FL-DOE-90721 (Maria Elvira Salazar), FL-27-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (104 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status complete, 104 of 104 asked, 0 failed, 4 state a policy, 2 of those match a taxonomy issue), `ingest.log`. This is the two-gate run: a passage states a policy only if both `q_states_policy` (commitment) and `q_own_commitment` are at least 0.85. The earlier one-gate run and its review are in `attempt-1-one-gate/`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 104 passage urls in `run.json` (and in `passages.jsonl`) are on `mariaelvirasalazar.com`. No other host, no redirect. |
| 2 | Quotes verbatim | PASS | The 4 states_policy passages (`e83d6b56`, `a5c44f49`, `3844f34c`, `aad40ce0`) are byte-identical to the same ids in `passages.jsonl` (node `Buffer.equals`). All 104 match on text; url and heading also match for the 4. |
| 3 | No inferred motive | PASS | None of the 4 is only biography, an attack on an opponent, fundraising or event copy. Two are past-record legislation items admitted at or just above the threshold (`e83d6b56`, `a5c44f49`). See notes. |
| 4 | Silence recorded, not filled | PASS | Counted: A5 1 (`aad40ce0`), KYV4 1 (`aad40ce0`), KYV1 1 (`a5c44f49`). A2, B1, B2, B4, B7, B8 have passages over 0.85 on the issue but none cleared both gates, so they count 0. The other 16 issues count 0. Every zero is no_stated_position_found. |
| 5 | Possible misses (information only) | INFO: 6 plain forward commitments, 11 past-record items, 5 funding records, 2 not misses | Forward commitments missed: `65b955e0`, `e4a3df8d`, `02b2e42e`, `e1517041` (B1/B2), `f40ac11e` (A5 below threshold), `ae68ef64` (KYV1). See below. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script over `run.json` and `passages.jsonl` found one host: `mariaelvirasalazar.com`, 104 of 104 passages in both files. `run.json` `site` is `https://mariaelvirasalazar.com`. Every page in `ingest.log` and every link in `links.jsonl` is on the same host.

| URL | Passages |
|---|---|
| `https://mariaelvirasalazar.com/` | 4 |
| `https://mariaelvirasalazar.com/bio` | 10 |
| `https://mariaelvirasalazar.com/issues` | 11 |
| `https://mariaelvirasalazar.com/issues/economy` | 11 |
| `https://mariaelvirasalazar.com/issues/environment` | 15 |
| `https://mariaelvirasalazar.com/issues/fight_socialism` | 10 |
| `https://mariaelvirasalazar.com/issues/healthcare` | 11 |
| `https://mariaelvirasalazar.com/issues/infrastructure` | 20 |
| `https://mariaelvirasalazar.com/issues/public_safety` | 12 |

Bookkeeping note, not a failure: `ingest.log` has no line for the homepage and shows 24 passages for `/issues/infrastructure`; `passages.jsonl` has 4 and 20. Both total 104.

### 2. Quotes verbatim

Checked with `node` (`Buffer.from(text, "utf8").equals(...)`) against `passages.jsonl` by id:

- Id sets match: 104 in `run.json`, 104 unique in `passages.jsonl`, all shared, 0 missing.
- The 4 states_policy=true passages: 0 byte mismatches on text; url and heading also identical.
- All 104 passages: 0 text mismatches; 0 null verdicts.
- Internal consistency: for every passage, `states_policy` equals `commitment >= 0.85 && own_commitment >= 0.85`, and `issues` equals the set of scores >= 0.85. 0 inconsistencies.
- `areas` holds only gated passages: A5 `aad40ce0`, KYV4 `aad40ce0`, KYV1 `a5c44f49`. This matches `run-report.txt`.

### 3. No inferred motive

The 4 passages marked states_policy=true (commitment / own_commitment), first 20 words:

- `e83d6b56` (0.97 / 0.88, no issue), `/issues/fight_socialism`: "The FORCE Act: I introduced legislation to ensure Cuba remains on the State Sponsor of Terrorism list until it meets"
- `a5c44f49` (0.97 / 0.85, KYV1), `/issues/fight_socialism`: "Introduced Legislation to Restore Democracy and Accountability in Venezuela: I proposed support for international efforts to address the Maduro regime’s"
- `3844f34c` (0.98 / 0.85, no issue), `/issues` Term Limits: "We must get rid of career politicians in both parties that put profits and power above people, and we must"
- `aad40ce0` (0.98 / 0.96, A5, KYV4), `/issues` Protect the Environment: "As a proud champion of the Everglades, I am fully committed to securing funding for its restoration and preservation, ensuring"

None is only biography, an attack on an opponent, fundraising or event copy. `3844f34c` criticizes "career politicians in both parties" in general, names no opponent, and commits to "set limits on how long public servants can serve in Washington". `aad40ce0` is a first-person forward commitment.

Notes for the Profiler and the founder (not failures):

- **The second gate admitted two past-record items and rejected their siblings.** `e83d6b56` and `a5c44f49` are "key accomplishments" entries ("I introduced legislation", "I proposed support"). The `q_own_commitment` wording says to answer no for "a past record". They passed at 0.88 and exactly 0.85, while the other eight fight_socialism entries of the same form scored 0.73 to 0.84 and were gated out. Both passages share a heading that quotes the candidate: "That’s why I am committed to being a strong advocate against these oppressive regimes." That heading may be what lifted them. They are still candidate-authored statements of a stance and may be written as attributed statements ("The campaign website states that she introduced…"). They must not be verified or compared with a legislative record.
- **Threshold margins.** `a5c44f49` and `3844f34c` are exactly at 0.85 on `own_commitment`. KYV1 coverage and the term-limits candidate-tier item both depend on that margin.
- **The KYV1 tag is about foreign countries.** `a5c44f49` concerns Venezuela. KYV1 ("Threats to democratic institutions") sits under "Elections & Voting", so a voter could read it as a U.S. stance. The passage says nothing about U.S. institutions. Any KYV1 claim should name the country.
- **Candidate-tier issues.** `e83d6b56` (Cuba policy) and `3844f34c` (term limits) cleared both gates and matched no taxonomy issue. Under the constitution they are candidate-tier issues. They must not be forced into a spine issue.
- **Gated-out passages still carry `issues`.** `readVerdict` fills `issues` regardless of the gate; `groupByArea` skips states_policy=false. Examples: `02b2e42e` `["B1"]`, `65b955e0` `["B2"]`, `4540b881` `["B8","KYV4"]`, `dab3d02c` `["B7"]`. These are not issue tags and must not become claims.
- **The title "Senator" is not supported.** The Profiler prompt calls the candidate "Senator Maria Elvira Salazar". No passage supports that. The site says "As your representative in Congress" (`02b2e42e`, `65b955e0`, `ae56de71`, `dba31dd5`) and "elected to Congress in November 2020" (`201ded52`). Under rules 1 and 2, no claim should call her "Senator".

### 4. Silence recorded, not filled

A passage counts only if it clears both gates and its issue score is >= 0.85 (as `groupByArea` does). Every taxonomy issue with at least one passage at or over 0.85 on the issue score:

| Issue | Label | Passages that count | Over 0.85 on the issue but gated out (issue / commitment / own) | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 0 | `23791039` (0.92 / 0.29 / 0.09) | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 1: `aad40ce0` | `e184d99c` (0.93 / 0.75 / 0.15) | stated |
| B1 | Economy, inflation, and jobs | 0 | `02b2e42e` (0.98 / 0.94 / 0.46), `45c6c059` (0.96 / 0.90 / 0.22), `af832e14` (0.93 / 0.56 / 0.15), `3ddd37ab` (0.90 / 0.64 / 0.20), `e1517041` (0.90 / 0.65 / 0.31), `7e7433df` (0.90 / 0.94 / 0.25), `c91f5d6a` (0.87 / 0.86 / 0.17), `e3b18550` (0.85 / 0.16 / 0.06) | no_stated_position_found |
| B2 | Healthcare access and costs | 0 | `a47a0c4c` (0.97 / 0.81 / 0.26), `65b955e0` (0.96 / 0.93 / 0.73), `e4a3df8d` (0.94 / 0.85 / 0.63) | no_stated_position_found |
| B4 | Social Security and Medicare | 0 | `a47a0c4c` (0.90 / 0.81 / 0.26) | no_stated_position_found |
| B7 | Crime policy, policing and courts | 0 | `dab3d02c` (0.95 / 0.78 / 0.42), `0603903f` (0.93 / 0.71 / 0.10), `2b20f914` (0.89 / 0.31 / 0.09), `12c95fba` (0.88 / 0.76 / 0.28) | no_stated_position_found |
| B8 | Climate and environment (national) | 0 | `4540b881` (0.92 / 0.86 / 0.39), `e184d99c` (0.87 / 0.75 / 0.15) | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 1: `a5c44f49` | `ae68ef64` (0.97 / 0.91 / 0.72), `8c8a0ec1` (0.85 / 0.94 / 0.80) | stated (Venezuela only; see check 3 notes) |
| KYV4 | Storm resilience and flood protection | 1: `aad40ce0` | `4540b881` (0.97 / 0.86 / 0.39), `dba31dd5` (0.96 / 0.52 / 0.12), `8cdf293e` (0.88 / 0.14 / 0.07), `1ed0a8d2` (0.87 / 0.31 / 0.18) | stated |

The other 16 issues have 0 passages over the threshold and are no_stated_position_found: A1, A3, A4, A6, KYV9, KYV10, A7, B3, B5, B6, KYV2, KYV3, KYV5, KYV6, KYV7, KYV8.

The run filled nothing: every zero stays a zero. Compared with the one-gate run (`attempt-1-one-gate/`, 23 gated, 9 with an issue), the second gate removed B1 (3 to 0), B2 (2 to 0) and B8 (1 to 0), and cut KYV1 and KYV4 from 2 to 1. That is a recall finding for check 5, not a fill.

### 5. Possible misses (information for the founder, not a fix)

Passages marked states_policy=false that state a commitment on a taxonomy issue. Listed for the founder to judge. They are not suggested fills.

**Plain forward commitments by the candidate (the `own_commitment` gate is what rejected them).** These are first-person, present or forward-looking, on `/issues`:
- `65b955e0` (B2 0.96; 0.93 / 0.73): "As your representative in Congress, I am committed to strengthening our healthcare system and ensuring patients have access to the"
- `e4a3df8d` (B2 0.94; 0.85 / 0.63): "I also fought to protect and preserve programs that train the next generation of doctors, helping expand the healthcare workforce". It ends "My goal is simple: to improve access to care, strengthen our healthcare system, and help every family live healthier lives."
- `02b2e42e` (B1 0.98; 0.94 / 0.46): "As your representative in Congress, I am working to create more opportunities for South Florida families, support local businesses, and"
- `e1517041` (B1 0.90; 0.65 / 0.31): "In addition, I have secured funding for workforce training programs and hosted five major job fairs, connecting thousands of South". It ends "My focus is simple: creating opportunity, supporting workers and small businesses, and building a stronger economy for every family in South Florida."
- `ae68ef64` (KYV1 0.97; 0.91 / 0.72): "I have also spoken out against attacks on free speech and democratic institutions in countries like Brazil and worked to". It ends "my commitment is unwavering: defending liberty, confronting tyranny…". Foreign countries only.
- `f40ac11e` (A5 0.82, below threshold; 0.91 / 0.53): "Additionally, I passed legislation to support coral reef restoration, including the transformation of retired Navy ships into artificial reefs, which". It ends "my focus remains on protecting our environment…". Would not be tagged even if gated.

The healthcare and economy sections of `/issues` are the candidate's own summary of her stance on B1 and B2. With both rejected, this run reports no stated position on either, which the site's text does not support. The `aad40ce0` environment summary, which has the same form, passed at 0.96. The founder may want to look at how `q_own_commitment` scores "I am committed to…" and "My goal is…" sentences that sit next to a past record in the same passage.

**Past-record items (sponsored or supported legislation) with an issue score >= 0.85.** The second gate is worded to reject these, and it did, except for `e83d6b56` and `a5c44f49` (check 3):
- `4540b881` (B8 0.92, KYV4 0.97; 0.86 / 0.39): "Introduced the National Climate Adaptation and Resilience Strategy Act: This creates a comprehensive plan for strengthening our resilience against hurricane"
- `e184d99c` (A5 0.93, B8 0.87; 0.75 / 0.15): "Army Corp of Engineers: I signed a letter urging the Army Corps of Engineers to fund the Comprehensive Everglades Restoration". It continues "Plan at or above $725 million."
- `a47a0c4c` (B2 0.97, B4 0.90; 0.81 / 0.26): "Introduced Legislation to Expand Home Infusions for Medicare Patients with Rare Genetic Disease: Introduced the John W. Walsh Alpha-1 Home"
- `45c6c059` (B1 0.96; 0.90 / 0.22): "Capital Support for Small Businesses: I cosponsored the Main Street Tax Certainty Act to permanently extend the 20% tax deduction"
- `7e7433df` (B1 0.90; 0.94 / 0.25): "Supporting the Fiscal Responsibility Act: I backed the Fiscal Responsibility Act, which cuts over $2 trillion in spending, reclaims $28"
- `c91f5d6a` (B1 0.87; 0.86 / 0.17): "Reducing Red Tape: I co-sponsored the Small Business Regulatory Reduction Act, which mandates that any new SBA regulation must not"
- `3ddd37ab` (B1 0.90; 0.64 / 0.20): "Passed Amendment to Expand Contracting Opportunities for Small Businesses: This amendment increases the limits for sole source contracting, and expands"
- `af832e14` (B1 0.93; 0.56 / 0.15): "My RECLAIM Taxpayer Funds Act was Implemented by SBA: This legislation recovers billions from fraudulent government loans, ensuring fiscal responsibility"
- `0603903f` (B7 0.93; 0.71 / 0.10): "Supporting Law Enforcement Resolution: I cosponsored and helped pass a resolution expressing support for police officers and recognizing the critical"
- `12c95fba` (B7 0.88; 0.76 / 0.28): "I Introduced the SERVICE Act for Veterans and Law Enforcement: Launches a pilot program through the U.S. Department of Justice"
- `8c8a0ec1` (KYV1 0.85; 0.94 / 0.80): "Support Free Speech in Brazil: I voiced support for free speech in Brazil, criticizing the current administration’s attacks on fundamental". Foreign country.

**Funding records (earmarks) with an issue score >= 0.85.** Money secured, not commitments. Listed for completeness:
- `23791039` (A2 0.92; 0.29 / 0.09): "$3.5 Million for Affordable Housing for Seniors: Inflation has hit many seniors hard, especially those on fixed incomes. I secured". The only housing passage on the site.
- `2b20f914` (B7 0.89; 0.31 / 0.09): "$2.1 Million for City of Miami Police Cruisers: Secured funding to acquire additional marked police cruisers equipped with lights and"
- `1ed0a8d2` (KYV4 0.87; 0.31 / 0.18): "$5 Million for Auburndale Flood Mitigation Improvements: Upgrades drainage systems and elevates roadways to reduce flooding in vulnerable, low-lying areas."
- `dba31dd5` (KYV4 0.96; 0.52 / 0.12): "As your representative in Congress, I have secured millions of dollars in federal funding to modernize and strengthen South Florida’s". It describes funding secured. `8cdf293e` (KYV4 0.88; 0.14 / 0.07) is the same kind: "Strengthened Disaster Preparedness Infrastructure: Secured federal investments to harden South Florida against hurricanes, flooding, and sea-level rise."

**Not misses:**
- `dab3d02c` (B7 0.95; 0.78 / 0.42): "Recognized for her strong support of law enforcement, commitment to public safety, and efforts to ensure officers have the resources". Third-person recognition copy after a list of police associations (`0fd70933`). Keeping it out was correct.
- `fff20226` (B1 0.78; 0.85 / 0.81): "María Elvira Salazar is the daughter of Cuban exiles who fled communism in search of freedom and opportunity. Before serving". Third-person biography with a general "she fights for…". No issue score clears 0.85.

Outside the taxonomy: `2b86bd62` (0.87 / 0.81), "I remain committed to ensuring South Florida has the modern infrastructure needed to support a strong economy, protect our quality", is a forward commitment on infrastructure, a candidate-tier subject with no taxonomy issue over 0.85 (B1 0.32).

Scope note: `attempt-1-keywords/` and `attempt-1-one-gate/` hold earlier attempts. I used the one-gate run only for the comparison in check 4 and did not re-review it.

VERDICT: PASS
