# Step 3 review: FL-DOE-90721 (Maria Elvira Salazar), FL-27-general

Reviewed under the Profiler constitution (stated_position bucket only). Inputs: `passages.jsonl` (104 passages), `run.json` (`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status complete, 104 of 104 asked, 0 failed, 23 state a policy, 9 of those match a taxonomy issue), `ingest.log`. SPINE is undecided for this race, so checks 4 and 5 cover every taxonomy issue (25 sub-issues, taxonomy v7).

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | PASS | All 104 passages in `run.json` (and in `passages.jsonl`) are on `mariaelvirasalazar.com`, the OFFICIAL_SITE host. No other host and no redirect. |
| 2 | Quotes verbatim | PASS | All 23 states_policy=true passages are byte-identical (text, url, heading) to the same id in `passages.jsonl`. So are the other 81. Checked with `node` `Buffer.equals`. |
| 3 | No inferred motive | PASS | None of the 23 is only biography, an attack on an opponent, fundraising or event copy. Each has a first-person statement of a stance or an action on policy. 14 are past-tense "key accomplishments" items (see notes). |
| 4 | Silence recorded, not filled | PASS | Issues with a stated position: B1 3, B2 2, A5 1, B8 1, KYV4 2, KYV1 2. A2, B4 and B7 have passages over 0.85 but all of them failed the gate, so they count 0. The other 16 issues count 0. All zeros are no_stated_position_found. |
| 5 | Possible misses (information only) | 9 possible misses, 4 funding records, 2 not misses | Commitment or sponsored-legislation language: `e1517041`, `e184d99c`, `a47a0c4c`, `c91f5d6a`, `3ddd37ab`, `af832e14`, `0603903f`, `12c95fba`, `dba31dd5`. See below. |

## Evidence

### 1. Candidate-controlled sources only

A `node` script over `run.json` and `passages.jsonl` found one host in the passage urls: `mariaelvirasalazar.com`. It covers 104 of 104 passages in both files. No redirect was involved.

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

Every URL in `ingest.log` is on the same host. The 14 links Jev judged (`links.jsonl`) are also on the same host. `run.json` `site` is `https://mariaelvirasalazar.com`.

A bookkeeping note, not a failure: `ingest.log` has no line for the homepage and shows 24 passages for `/issues/infrastructure`. `passages.jsonl` and `ingest-report.md` show 4 for the homepage and 20 for infrastructure. Both total 104. No passage id or host is affected.

### 2. Quotes verbatim

I checked this with `node`. For each `run.json` passage, I compared `Buffer.from(text, "utf8")` with the passage of the same id in `passages.jsonl`:

- The id sets match: 104 in `run.json` and 104 unique ids in `passages.jsonl`, all shared.
- All 23 states_policy=true passages match byte for byte: 0 mismatches.
- All 104 passages match on text, url and heading.
- Internal consistency: for every passage, `states_policy` equals `commitment >= 0.85`, and `issues` equals the set of scores ≥ 0.85. There were 0 inconsistencies.
- The `areas` in `run.json` hold only passages that cleared the gate: B1 `02b2e42e`, `45c6c059`, `7e7433df`; B2 `65b955e0`, `e4a3df8d`; A5 `aad40ce0`; B8 `4540b881`; KYV4 `aad40ce0`, `4540b881`; KYV1 `ae68ef64`, `a5c44f49`.

### 3. No inferred motive

These are the 23 passages marked states_policy=true, with the first 20 words of each. The source runs sentences together, so the fight_socialism items start with their bold lead-in. None is only biography, an attack on an opponent, fundraising or event copy.

`/issues` (the summary page, forward-looking or "committed" language):
- `2b86bd62` (0.87, no issue): "I remain committed to ensuring South Florida has the modern infrastructure needed to support a strong economy, protect our quality"
- `ae56de71` (0.92, no issue): "As your representative in Congress, I have been one of the strongest voices in Washington against socialism, communism, and authoritarian"
- `ae68ef64` (0.92, KYV1): "I have also spoken out against attacks on free speech and democratic institutions in countries like Brazil and worked to"
- `02b2e42e` (0.95, B1): "As your representative in Congress, I am working to create more opportunities for South Florida families, support local businesses, and"
- `3844f34c` (0.98, no issue): "We must get rid of career politicians in both parties that put profits and power above people, and we must". This is the Term Limits section. It criticizes "career politicians in both parties" in general and names no opponent. It commits to "set limits on how long public servants can serve", so it is a stated position, not an attack.
- `65b955e0` (0.93, B2): "As your representative in Congress, I am committed to strengthening our healthcare system and ensuring patients have access to the"
- `e4a3df8d` (0.85, B2, exactly at the threshold): "I also fought to protect and preserve programs that train the next generation of doctors, helping expand the healthcare workforce"
- `aad40ce0` (0.98, A5, KYV4): "As a proud champion of the Everglades, I am fully committed to securing funding for its restoration and preservation, ensuring"
- `f40ac11e` (0.90, no issue): "Additionally, I passed legislation to support coral reef restoration, including the transformation of retired Navy ships into artificial reefs, which"

"Key accomplishments" items (past-tense record of legislation or advocacy the candidate describes as her own):
- `4540b881` (0.86, B8, KYV4): "Introduced the National Climate Adaptation and Resilience Strategy Act: This creates a comprehensive plan for strengthening our resilience against hurricane"
- `45c6c059` (0.91, B1): "Capital Support for Small Businesses: I cosponsored the Main Street Tax Certainty Act to permanently extend the 20% tax deduction"
- `7e7433df` (0.93, B1): "Supporting the Fiscal Responsibility Act: I backed the Fiscal Responsibility Act, which cuts over $2 trillion in spending, reclaims $28"
- `e27c55a6` (0.87, no issue): "Improving Global Health Outcomes for Mothers and Infants: Lead efforts to pass the End Tuberculosis Now Act and support increased"
- `1d311b21` (0.96, no issue): "My Resolution Condemning Socialism Passes U.S. House of Representatives: I passed a resolution that sends a strong message that socialism"
- `dfd92819` (0.95, no issue): "Western Hemisphere Security Legislation Signed Into Law: Passed and enacted legislation strengthening U.S. leadership against authoritarian regimes in the Western"
- `222ffdac` (0.96, no issue): "American Leadership on Cuba and Haiti: I called for U.S. leadership to address the economic and political crises in Cuba"
- `49f6fe69` (0.95, no issue): "I asked President Biden to grant Internet Access in Cuba: I advocated for increased internet access in Cuba to allow"
- `e83d6b56` (0.97, no issue): "The FORCE Act: I introduced legislation to ensure Cuba remains on the State Sponsor of Terrorism list until it meets"
- `ba32605b` (0.96, no issue): "I Constantly Denounce the Cuban Regime: I reaffirmed our commitment to freedom, liberty, and human rights by demanding the Cuban"
- `f8383285` (0.94, no issue): "My RENACER Act signed into law: This bill sanctions the Ortega-Murillo Regime in Nicaragua." (full text, 13 words)
- `9b89039d` (0.96, no issue): "Introduced the Nicaragua Political Prisoner Support Act: I introduced legislation to provide critical support services to 222 political prisoners expelled"
- `8c8a0ec1` (0.94, no issue): "Support Free Speech in Brazil: I voiced support for free speech in Brazil, criticizing the current administration’s attacks on fundamental"
- `a5c44f49` (0.97, KYV1): "Introduced Legislation to Restore Democracy and Accountability in Venezuela: I proposed support for international efforts to address the Maduro regime’s"

Notes for the Profiler and the founder (not failures):

- **Past-record items.** 14 of the 23 describe past actions ("I cosponsored", "I introduced", "signed into law"). They are candidate-authored and self-describe a stance, so they belong in stated_position. They must be written as attributed statements ("The campaign website states that she cosponsored…"). They must not be verified or rated, and must not be compared with any legislative record. That comparison is not this bucket.
- **Candidate-tier issues.** 14 passages cleared the gate but matched no taxonomy issue: `2b86bd62`, `ae56de71`, `3844f34c`, `f40ac11e`, `e27c55a6` and the nine fight_socialism items (`1d311b21`, `dfd92819`, `222ffdac`, `49f6fe69`, `e83d6b56`, `ba32605b`, `f8383285`, `9b89039d`, `8c8a0ec1`). Under the constitution they are captured as candidate-tier issues (anti-socialism and foreign policy in the Western Hemisphere, term limits, infrastructure, coral reefs, global health). They must not be forced into a spine issue.
- **The KYV1 tag is about foreign countries.** Both KYV1 citations (`a5c44f49` Venezuela, `ae68ef64` Brazil/Honduras) concern democratic institutions abroad. KYV1 ("Threats to democratic institutions") sits under the "Elections & Voting" category, so a voter could read it as a stance on U.S. institutions. The passages say nothing about U.S. institutions. Any claim under KYV1 should say which countries the passage names.
- **Gated-out passages still carry `issues`.** As designed, `readVerdict` fills `issues` whether or not the gate passes, and `groupByArea` skips states_policy=false. Examples: `dab3d02c` `["B7"]`, `a47a0c4c` `["B2","B4"]`, `23791039` `["A2"]`. These are not issue tags and must not become claims.
- **The title "Senator" is not supported.** The Profiler prompt calls the candidate "Senator Maria Elvira Salazar". No passage supports that title. The site says "As your representative in Congress" (`02b2e42e`, `65b955e0`, `ae56de71`, `dba31dd5`) and "elected to Congress in November 2020" (`201ded52`). Under rules 1 and 2, no claim should call her "Senator".
- **An HTML entity in one heading.** The `/issues` heading "Economy &#038; Jobs" (`02b2e42e`, `e1517041`) contains an undecoded HTML entity. It is cosmetic and byte-identical in both files, but should not be copied into a claim as-is.

### 4. Silence recorded, not filled

A passage counts only if it clears the gate (commitment ≥ 0.85) and its issue score is ≥ 0.85. This matches `groupByArea` in `src/lib/policy-noul.ts`. The table lists every taxonomy issue where at least one passage scored at or over the threshold:

| Issue | Label | Passages that count | Over 0.85 on the issue but failed the gate | Coverage |
|---|---|---|---|---|
| A2 | Housing affordability | 0 | `23791039` (A2 0.92, gate 0.32) | no_stated_position_found |
| A5 | Water quality and Everglades restoration | 1: `aad40ce0` | `e184d99c` (A5 0.92, gate 0.74) | stated |
| B1 | Economy, inflation, and jobs | 3: `02b2e42e`, `45c6c059`, `7e7433df` | `3ddd37ab` (0.90 / 0.71), `af832e14` (0.94 / 0.58), `c91f5d6a` (0.87 / 0.84), `e1517041` (0.90 / 0.64) | stated |
| B2 | Healthcare access and costs | 2: `65b955e0`, `e4a3df8d` | `a47a0c4c` (B2 0.97, gate 0.80) | stated |
| B4 | Social Security and Medicare | 0 | `a47a0c4c` (B4 0.91, gate 0.80) | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 2: `a5c44f49`, `ae68ef64` | none | stated (foreign countries only; see check 3 notes) |
| B7 | Crime policy, policing and courts | 0 | `dab3d02c` (0.95 / 0.79), `2b20f914` (0.89 / 0.30), `12c95fba` (0.89 / 0.72), `0603903f` (0.92 / 0.72) | no_stated_position_found |
| B8 | Climate and environment (national) | 1: `4540b881` | `e184d99c` (B8 0.86, gate 0.74) | stated |
| KYV4 | Storm resilience and flood protection | 2: `aad40ce0`, `4540b881` | `1ed0a8d2` (0.85 / 0.31), `8cdf293e` (0.88 / 0.15), `dba31dd5` (0.96 / 0.51) | stated |

The other 16 issues have 0 passages over the threshold. They are recorded as no_stated_position_found: A1, A3, A4, A6, KYV9, KYV10, A7, B3, B5, B6, KYV2, KYV3, KYV5, KYV6, KYV7, KYV8.

The run filled nothing. Every zero stays a zero, including B7, even though the site has a whole Public Safety page (12 passages, none gated). That silence is what this run records. Check 5 lists what the founder may want to look at.

Threshold sensitivity, for information: `e4a3df8d` is exactly at 0.85 on the gate, and `4540b881` is at 0.86. `c91f5d6a` and `fff20226` are just below at 0.84. The B2 and B8 coverage depends on those margins.

### 5. Possible misses (information for the founder, not a fix)

These are passages marked states_policy=false that state a commitment, or describe sponsored legislation, on a taxonomy issue. The gate let through the same kind of passage elsewhere on this site. For example, `4540b881` "Introduced the … Act" and `45c6c059` "I cosponsored …" passed, while the items below did not. They are listed so the founder can judge. They are not suggested fills.

Commitment language or sponsored legislation, with an issue score ≥ 0.85:
- `e1517041` (gate 0.64; B1 0.90, KYV10 0.78): "In addition, I have secured funding for workforce training programs and hosted five major job fairs, connecting thousands of South". It ends "My focus is simple: creating opportunity, supporting workers and small businesses, and building a stronger economy for every family in South Florida." This is the same form as the gated `e4a3df8d` ("My goal is simple: …").
- `e184d99c` (gate 0.74; A5 0.92, B8 0.86): "Army Corp of Engineers: I signed a letter urging the Army Corps of Engineers to fund the Comprehensive Everglades Restoration". It continues "Plan at or above $725 million." This is a specific stated funding position.
- `a47a0c4c` (gate 0.80; B2 0.97, B4 0.91): "Introduced Legislation to Expand Home Infusions for Medicare Patients with Rare Genetic Disease: Introduced the John W. Walsh Alpha-1 Home"
- `c91f5d6a` (gate 0.84; B1 0.87): "Reducing Red Tape: I co-sponsored the Small Business Regulatory Reduction Act, which mandates that any new SBA regulation must not"
- `3ddd37ab` (gate 0.71; B1 0.90): "Passed Amendment to Expand Contracting Opportunities for Small Businesses: This amendment increases the limits for sole source contracting, and expands"
- `af832e14` (gate 0.58; B1 0.94): "My RECLAIM Taxpayer Funds Act was Implemented by SBA: This legislation recovers billions from fraudulent government loans, ensuring fiscal responsibility"
- `0603903f` (gate 0.72; B7 0.92): "Supporting Law Enforcement Resolution: I cosponsored and helped pass a resolution expressing support for police officers and recognizing the critical"
- `12c95fba` (gate 0.72; B7 0.89): "I Introduced the SERVICE Act for Veterans and Law Enforcement: Launches a pilot program through the U.S. Department of Justice"
- `dba31dd5` (gate 0.51; KYV4 0.96, KYV5 0.64): "As your representative in Congress, I have secured millions of dollars in federal funding to modernize and strengthen South Florida’s". This is the record summary in the `/issues` Infrastructure section, next to the gated `2b86bd62`. It describes funding secured, not a forward commitment.

Funding records (earmarks) with an issue score ≥ 0.85. These are statements of money secured, not commitments. They are listed for completeness:
- `23791039` (gate 0.32; A2 0.92): "$3.5 Million for Affordable Housing for Seniors: Inflation has hit many seniors hard, especially those on fixed incomes. I secured". It gives a reason: "to ensure our seniors have safe, affordable homes". This is the only housing passage on the site.
- `2b20f914` (gate 0.30; B7 0.89): "$2.1 Million for City of Miami Police Cruisers: Secured funding to acquire additional marked police cruisers equipped with lights and"
- `1ed0a8d2` (gate 0.31; KYV4 0.85): "$5 Million for Auburndale Flood Mitigation Improvements: Upgrades drainage systems and elevates roadways to reduce flooding in vulnerable, low-lying areas."
- `8cdf293e` (gate 0.15; KYV4 0.88): "Strengthened Disaster Preparedness Infrastructure: Secured federal investments to harden South Florida against hurricanes, flooding, and sea-level rise."

Not misses:
- `dab3d02c` (gate 0.79; B7 0.95): "Recognized for her strong support of law enforcement, commitment to public safety, and efforts to ensure officers have the resources". This is third-person recognition copy that follows a list of police associations (`0fd70933`). It is endorsement copy, not a commitment by the candidate. Keeping it out was correct.
- `fff20226` (gate 0.84; B1 0.76): "María Elvira Salazar is the daughter of Cuban exiles who fled communism in search of freedom and opportunity. Before serving". This is a third-person biography summary ending in a general "she fights for … the economy, improving healthcare, supporting public safety". It makes no specific commitment, and no issue score clears 0.85.

Also sponsored-legislation items whose issue score is below 0.85. They would not be tagged even if gated: `21cee54f` (B2 0.75, Summer Barrow Act), `249254cd` (B7 0.67, TAKE IT DOWN Act), `48b5cbbf` (B8 0.80, REEF Act), `e3b18550` (B1 0.83, EIDL Relief Act), `94a4a7d5` (B8 0.68, migratory birds), `9aa34b84` (B2 0.38, Give Kids a Chance Act).

Scope note: the folder `attempt-1-keywords/` holds an earlier keyword crawl (`passages.jsonl`, `ingest.log`, `ingest-report.md`, `meta.tsv`). It is not part of this run, and I did not review it.

VERDICT: PASS
