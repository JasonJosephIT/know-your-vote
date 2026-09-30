# Step 3 review: FL-DOE-90560 (Wilton Simpson), FL-AGR-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of `passages.jsonl`, `run.json` and `ingest.log` in this directory. No website fetched.

Run under review: `run.json`, schema `kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85. Counts: 137 passages, 137 asked, 30 `states_policy`, 19 with an issue, 0 failed.

SPINE: undecided for this race. Check 4 therefore covers every taxonomy issue in `src/lib/news-issues.ts` (tax-7, 25 sub-issues), and check 5 considers every taxonomy issue.

## Result

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 137 run.json passages (and all 137 in passages.jsonl) are on host `wiltonsimpson.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | 30/30 `states_policy` passages byte-identical to passages.jsonl (also url and heading). All 137 match. |
| 3 | No inferred motive (non-commitment marked as policy) | **FAIL** | `fa5d4f41` (third-party endorser quote), `f5f61553` (attack copy), `6f81ca9a` (biography/record summary) |
| 4 | Silence recorded, not filled | **PASS** | 11 taxonomy issues have gated passages. The other 14 have 0 and are `no_stated_position_found`. The run creates no area for an issue with 0 gated passages. |
| 5 | Possible misses (information only) | reported | 13 clear misses, 13 weaker ones. Listed below. |

## Evidence

### Check 1: sources

A node script parsed each `url` with `new URL()` and tallied hosts:

- run.json: `{ "wiltonsimpson.com": 137 }`. passages.jsonl: `{ "wiltonsimpson.com": 137 }`.
- Pages: `/` (15), `/about` (9), `/agriculture` (20), `/economic-freedom` (24), `/education` (12), `/environment` (27), `/free-florida` (12), `/public-safety` (18). `run.json.site` is `https://wiltonsimpson.com`, the OFFICIAL_SITE origin. No redirect was involved.
- ingest.log shows no robots, bot-challenge or off-host lines. The per-page counts in ingest.log (for example 19 for `/public-safety`) are higher than the counts in passages.jsonl (18), and the homepage is missing from the log's per-page list. Both files total 137, so the gap is most likely cross-page de-duplication. It does not affect provenance.

### Check 2: verbatim

Script (node): each run.json passage with `verdict.states_policy === true` was looked up by id in passages.jsonl, and the two texts were compared with `Buffer.compare(Buffer.from(a,'utf8'), Buffer.from(b,'utf8'))`. `url` and `heading` were also compared.

- 30 `states_policy` passages: 0 missing ids, 0 text mismatches, 0 url or heading mismatches.
- All 137 passages: 0 text mismatches. passages.jsonl has no duplicate ids.
- Internal consistency, also checked: for every passage, `states_policy == (commitment >= 0.85)`, and `issues` equals the taxonomy-ordered set of `scores >= 0.85`. 0 inconsistencies.

### Check 3: marked as policy, but no candidate commitment

| id | page | commitment / issues | first 20 words | why |
|---|---|---|---|---|
| `fa5d4f41` | /economic-freedom | 0.86 / B1 0.97 | "“Wilton Simpson understands that the more affordable Florida is for our businesses, the stronger our economy will be for hardworking" | **Third-party endorsement, not the candidate's words.** The next passage on the same page, `d1db6d99`, is its attribution line: "— Brewster Bevis, President and CEO Associated Industries of Florida". It is praise of the candidate with no commitment by him. It is also the **top-ranked B1 citation** in `run.json.areas`, so the brief would lead Economy with an endorser's words written as `attributed=true`. |
| `f5f61553` | /free-florida | 0.87 / B6 0.87 | "Floridians are fed up with ineffective politicians in Washington, corporate media in New York and billionaire liberals in California telling" | Attack copy ("billionaire liberals", "elitist socialists") with a generic record list ("fought vaccine mandates, protected parental choice and ensured election integrity"). It makes no commitment and names no measure. It is the **only** gated B6 citation. |
| `6f81ca9a` | /about | 0.92 / none | "With an eye toward outcomes and problem solving, Wilton has a proven record of fighting for Florida’s hardworking families and" | Biography and record summary under the heading "Wilton’s Record". No commitment, no measure. It has no issue tag, so it cannot reach a Position, but it is counted in `states_policy`. |

Borderline, not counted as failures:

- `4bb6dcc7` (/, no issue): a values statement. "we must remove boundaries and ensure all Floridians have access to opportunities" is a stance, but it names no issue or measure.
- `125e5a57` (A4, B1): a generic record ("fought to keep Florida’s businesses open … keep Florida affordable"). It is the **only** gated A4 citation.
- `db2defb0` (B3) and `3845ba5f` (B7) attack the Biden Administration and "other states", but each also names a concrete action (banning sanctuary cities; opposing defund attempts). Acceptable.
- Many gated passages are legislative record items, for example `6860ddf8`, `b6824c3b`, `91d076da`, `dbcf35c0`, `9973439b`, `8c8b263b`, `39f2fd9a`, `9d71cbb0`, `773d0fca`. These are self-described record, not forward pledges. The Profiler should phrase them as "The campaign website lists … among his record", not as promises.

If the three flagged passages are dropped, B1 falls from 5 to 4 gated passages and **B6 falls from 1 to 0** (`no_stated_position_found` at the gate).

### Check 4: count of passages clearing the threshold, per taxonomy issue

"Gated" means `states_policy` is true (commitment ≥ 0.85) and the issue score is ≥ 0.85. These are the only passages the run lets into `stated_position` / `run.json.areas`. "Score only" counts passages whose issue score is ≥ 0.85 but whose commitment gate failed. Those cannot enter the bucket. They are a count, not a suggestion.

| Issue | Label | Gated count | Gated ids | Score only (gate failed) | Status |
|---|---|---|---|---|---|
| A1 | Property insurance costs | 0 | none | 0 | no_stated_position_found |
| A2 | Housing affordability | 2 | `dbcf35c0`, `7bba5a01` | 1 | position |
| A3 | Property taxes | 0 | none | 2 | no_stated_position_found |
| A4 | Cost of living in Florida | 1 | `125e5a57` | 1 | position |
| A5 | Water quality and Everglades restoration | 0 | none | 3 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | none | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 4 | `aaba4190`, `4018d934`, `012e39e2`, `773d0fca` | 3 | position |
| KYV10 | Career, vocational and higher education | 2 | `aaba4190`, `475975c4` | 1 | position |
| A7 | Elections administration and voting access | 1 | `9973439b` | 1 | position |
| B1 | Economy, inflation, and jobs | 5 | `125e5a57`, `6860ddf8`, `b6824c3b`, `91d076da`, `fa5d4f41`* | 3 | position |
| B2 | Healthcare access and costs | 0 | none | 0 | no_stated_position_found |
| B3 | Immigration and border enforcement | 1 | `db2defb0` | 0 | position |
| B4 | Social Security and Medicare | 0 | none | 0 | no_stated_position_found |
| B5 | Abortion policy | 0 | none | 0 | no_stated_position_found |
| B6 | Election integrity | 1 | `f5f61553`* | 1 | position (0 if `f5f61553` is dropped) |
| KYV1 | Threats to democratic institutions | 0 | none | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 3 | `3845ba5f`, `fc738887`, `8a444990` | 3 | position |
| B8 | Climate and environment (national) | 0 | none | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | none | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 1 | `69f66975` | 8 | position |
| KYV4 | Storm resilience and flood protection | 1 | `7bba5a01` | 2 | position |
| KYV5 | Water supply and drinking water | 0 | none | 1 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | none | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | none | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | none | 0 | no_stated_position_found |

\* Flagged in check 3.

`run.json.areas` holds exactly the 11 issues with a gated count ≥ 1, and each area's citations match the gated ids above. No area exists for a 0-count issue. The run itself does not write `no_stated_position_found` records. Those stay the Profiler's job when it builds Positions.

### Check 5: possible misses (marked "no policy", but plainly a commitment on a taxonomy issue)

This section is information for the founder, not a fix. Each entry shows the id, page, commitment score, issue scores ≥ 0.85 (if any), and the first 20 words.

The candidate is named with a concrete action in the passage itself:

- `e02dfa80` /free-florida, c=0.70, B6 0.98, A7 0.95: "As Senate President, Wilton worked with Governor Ron DeSantis to proactively review and address election security in Florida. Safeguarding and". (It goes on to voter ID, a ban on ballot harvesting, and a ban on unsolicited mass mail ballots. This is the clearest B6 passage on the site, and it was gated out while `f5f61553` was gated in.)
- `5d3686f5` /economic-freedom, c=0.75, B1 0.97: "In 2021, despite our pandemic challenged economy, Wilton fought to prevent a 700% unemployment tax hike, cut commercial rent taxes"
- `51e21350` /economic-freedom, c=0.80, B1 0.87: "While in the State Senate, Wilton worked to return hundreds of millions of dollars to Florida tax payers. While states"
- `14999fb4` /economic-freedom, c=0.49, B1 0.88: "Visitors, businesses and new residents flock to the Sunshine State in record numbers for more than just our beautiful beaches"
- `c6bacdd2` /environment, c=0.76, A2 0.96, KYV4 0.88: "This plan prioritizes investing in state and local affordable housing programs, mitigates the impacts of sea level rise and enhances"
- `db4723da` /agriculture, c=0.73, A3 0.97, KYV3 0.92: "The agricultural classification of land in Florida affords our farmers lower property taxes. Wilton worked to strengthen our Greenbelt Laws"
- `2ea108d4` /public-safety, c=0.79, A4 0.90: "Making Florida More Affordable for Military and Veterans. Wilton worked to eliminate fees and regulations to make living in Florida"
- `2799f41f` /education, c=0.17, KYV9 0.91: "As Senate President, Wilton ensured the passage of a historic expansion of school choice that increased eligibility and streamlined key"
- `baf2ba58` /environment, c=0.70, KYV3 0.96: "Under Wilton’s leadership, the Legislature prioritized funding to create incentives for conservation and sustainable development while conserving the green infrastructure"
- `449f8935` /environment, c=0.66, A5 0.91: "A lot of folks talk about the need for critical investments in Florida’s environment, but Wilton has actually done the"
- `e27c429e` /environment, c=0.32, A5 0.95: "Under Wilton’s leadership as Senate President, Florida law now calls for expedited implementation of the Lake Okeechobee Watershed Restoration Project."
- `c8f42d4a` /environment, c=0.70, A5 0.81 (below threshold): "Florida’s pristine natural beauty is world-renowned and Wilton has worked tirelessly to ensure that Florida has the money needed to"
- `f6debb37` /environment, c=0.22, KYV3 0.88: "As a member of the Florida Cabinet, Wilton stood with Governor Ron DeSantis in May 2023 to approve the preservation"

Weaker cases. The candidate is not named in the passage; each is a list item or law description under one of his record headings:

- `facbc862` /economic-freedom, c=0.63: "Passage of Florida’s online sales tax reform to level the playing field for local retailers."
- `bcb6d24b` /economic-freedom, c=0.59: "Provided a Nearly $400 million Reduction in Vehicle Registration Fees"
- `d4339867` /economic-freedom, c=0.76: "COVID-19 liability protections for Florida business and health care providers."
- `9015173f` /environment, c=0.82, KYV3 0.89, KYV4 0.91, KYV5 0.86: "These efforts are critical as we work to address flooding and sea-level rise resiliency as well as water management and"
- `a1fcf106` /public-safety, c=0.67, B7 0.95: "The Military Protection Act makes it clear that attempts to defraud or swindle military service members and their families will"
- `8a6a06bb` /public-safety, c=0.67, KYV10 0.96: "The Florida GI Bill waives out-of-state tuition fees, for veterans and funds scholarships, including online programs and book stipends, for"
- `74cb9096` /agriculture, c=0.48, A3 0.94: "It also prohibits a property appraiser from denying agricultural status due to construction or maintenance of a non-dwelling structure for"
- `289a6ab1` /environment, c=0.63, KYV3 0.89: "The Rural and Family Lands Program is critical for preserving Florida’s natural resources while allowing agricultural operations to continue to"
- `4d0f2797` /environment, c=0.18, KYV3 0.91: "The preservation efforts will prevent future development of the land and allow agriculture operations to continue to contribute to Florida’s"
- `c8bcc7f5` /environment, c=0.56, A5 0.91: "$10.8 million investment for the implementation of the Blue-Green Algae Task Force recommendations. The Blue-Green Algae Task Force will prioritize"
- `3eaad6f5` /environment, c=0.57: "$26 million investment in the effort to stem red tide through research and for red tide mitigation. This builds on"
- `fcf0e5e9` /education, c=0.18: "Now students in family of four earning less than $100,000 a year can receive a scholarship to attend the K-12"
- `c16add7a` /public-safety, c=0.71: "Florida’s law enforcement officers put their lives on the line each and every day to protect our families and our"

Pattern for the founder: the gate treats record statements inconsistently. In one bulleted list under /economic-freedom, `6860ddf8`, `b6824c3b`, `91d076da`, `ed8c0672` and others passed the gate. `facbc862`, `bcb6d24b` and `d4339867`, from the same list, did not. Longer record paragraphs on /environment and /agriculture fell mostly below the gate. That is why A5 (Water quality and Everglades) and A3 (Property taxes) show 0 gated passages even though the environment page is the largest on the site.

Third-party quotes were correctly **not** gated in: `9eee9082` and `de9aabe0` (John Kirtley), `1d063f90` (Sheriff Wayne Ivey), `c3b9bcfb`, `f5b247e3`, `76518f4f`, `745db92c`, `46fc0f56`. `fa5d4f41` is the exception flagged in check 3.

VERDICT: FAIL (check 3: `fa5d4f41` third-party endorsement and `f5f61553` attack copy gated as stated policy and tagged B1/B6; `6f81ca9a` biography gated as policy)
