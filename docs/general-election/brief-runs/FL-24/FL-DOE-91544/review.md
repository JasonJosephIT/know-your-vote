# Step 3 review: FL-DOE-91544 (Oliver G. Gilbert III), FL-24-general

Reviewer: Step 3, read-only. Inputs: `passages.jsonl` (217 lines), `run.json` (`kyv.policy-run/1`, status `complete`, created 2026-09-30T01:58:52Z, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, 217 asked, 0 failed, 42 `states_policy`, 16 with a taxonomy issue), `ingest.log`. Official site: https://olivergilbert.vote/. Spine: undecided, so checks 4 and 5 cover the whole taxonomy (`src/lib/news-issues.ts`, 25 sub-issues). No website was fetched for this review.

This is the two-gate run (`states_policy` = `commitment` ≥ 0.85 **and** `own_commitment` ≥ 0.85). The earlier one-gate run and its review are in `attempt-1-one-gate/`.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (script) | **PASS** |
| 3 | No inferred motive | **FAIL** (1 passage: `7bab3fc3`) |
| 4 | Silence recorded, not filled | **PASS** (counts below; 18 issues at 0 published) |
| 5 | Possible misses (information only) | Reported, 35 passages |

## Evidence

### 1. Candidate-controlled sources only: PASS

Checked by a node script over `run.json` (all 217 passages, plus the 18 citations inside `areas`) and `passages.jsonl`:

- Hosts in `run.json` passages: `olivergilbert.vote` (217). Hosts in `areas` citations: `olivergilbert.vote` (18). Hosts in `passages.jsonl`: `olivergilbert.vote` (217). No other host.
- URLs: `/` 19, `/about` 11, `/build-act` 21, `/build-business-act` 34, `/care-act` 82, `/es/home-act` 40, `/issues` 10. `/es/home-act` is a path on the official host, not a redirect to another host.
- `ingest.log`: every page was fetched in the browser after an HTTP 202 bot challenge on the official host. No off-host fetch appears.
- Note (not a failure): `ingest.log` prints `14 passage(s)` for `/issues` and no line for `/`, while the corpus holds 10 and 19. The per-page counts look like they are printed before cross-page de-duplication.

### 2. Quotes verbatim: PASS

Node script (`Buffer.compare` on the UTF-8 bytes, joined on passage id, url also compared):

- 42 of 42 passages with `states_policy: true` have text byte-identical to the passage with the same id in `passages.jsonl`, at the same url. None missing, none different.
- Also checked: all 217 run passages match their `passages.jsonl` text; all 18 `areas` citations match on text and url. 217 unique ids on each side, none missing either way.
- Also recomputed from the stored scores: every `states_policy` equals `commitment ≥ 0.85 && own_commitment ≥ 0.85`, and every `issues` list equals the set of scores ≥ 0.85. No inconsistencies.

### 3. No inferred motive: FAIL

Passages marked `states_policy: true` that are biography, an attack, fundraising or event copy with no commitment by the candidate:

| id | commitment / own | issues | url | first 20 words |
|---|---|---|---|---|
| `7bab3fc3` | 0.96 / 0.86 | A2, KYV3 | /about (County Commission Chair) | "On the County Commission, I’ve focused on a new goal: Make Miami-Dade County a truly world-class community. To get there," |

`7bab3fc3` is biography. It describes what the candidate did as County Commissioner ("I’ve led bold initiatives to build up density along our transit corridors…"), not what he commits to do in the office he is seeking. It passes both gates and is published in `areas` under A2 (Housing affordability, 0.94) and KYV3 (Growth, development and land conservation, 0.86). A record is not a stated position. It is also the **only** KYV3 citation, so without it KYV3 has no published passage, and A2 falls from 3 citations to 2. The same passage was flagged in the one-gate review; the added `own_commitment` gate did not remove it (0.86).

Also carrying no commitment of its own, but outside the four named categories (page-structure copy, no issue tag, so not in `areas`):

- `78c3db1d` (0.90 / 0.89) /build-business-act: "Eleven concrete actions to help Americans start, grow, and expand small businesses. Tap any item to expand." A section intro; the eleven actions are separate passages.
- `cc8984cc` (0.90 / 0.85) /care-act: "The federal government will be required to report whether participants are actually living better lives. Measures will include:" A commitment, but the list it introduces is not in the passage.

Looked at and not flagged, because each carries a commitment despite attack or personal framing: `e8bd96b0` (childcare; "As a father…", criticises "mass deportations", then "he will redirect spending toward our children and families"), `6601caca` (healthcare; rhetorical opening, then "Oliver will fight for a pathway…"), `302ea050` (taxes; "Oliver supports common sense tax policies…").

Scope note (not a failure): the only B7 citation, `e552fbe8` ("Investigate and prosecute fraud aggressively."), sits under "04 / Protecting Taxpayer Dollars" on the small-business page and is about grant and loan fraud, not general crime policy.

Correctly kept out by the gates: biography `9168e8a3` (0.65 / 0.19) and `79bb7f1a` (0.32 / 0.06, which scores B7 0.86 on its own), the attack `b0abb288`, the fundraising block `604c0daa` (0.17 / 0.38).

### 4. Silence recorded, not filled: PASS

"Clears the threshold" = `states_policy: true` and the issue's score ≥ 0.85, the rule that fills `areas`. The published counts match `areas` and `run-report.txt` exactly. The third column counts every passage whose issue score is ≥ 0.85 whether or not the gates cleared.

| Issue | Label | Count (published) | Issue score ≥ 0.85, any gate | Passage ids (published) |
|---|---|---|---|---|
| B2 | Healthcare access and costs | 5 | 7 | 2322d8a3, 2d069267, 98a321eb, 5aae532d, 6601caca |
| B1 | Economy, inflation, and jobs | 4 | 11 | 0a42ee1c, fd6013e0, 7b7f35e6, 307e9c65 |
| A2 | Housing affordability | 3 | 17 | 1a3cb742, f6766dc7, 7bab3fc3 |
| KYV10 | Career, vocational and higher education | 3 | 7 | f4fdd081, b0857d6f, 307e9c65 |
| A6 | Public school funding and teachers | 1 | 1 | 1e9ae5ba |
| B7 | Crime policy, policing and courts | 1 | 2 | e552fbe8 |
| KYV3 | Growth, development and land conservation | 1 | 3 | 7bab3fc3 |
| B3 | Immigration and border enforcement | **0** | 1 | (none; `4aab8e30` scores B3 0.98 but fails `own_commitment`, 0.59) |

If check 3 is upheld, A2 falls to 2 and KYV3 to 0.

0, recorded as `no_stated_position_found`: B3 Immigration and border enforcement, A1 Property insurance costs, A3 Property taxes, A4 Cost of living in Florida, A5 Water quality and Everglades restoration, KYV9 School choice and vouchers, A7 Elections administration and voting access, B4 Social Security and Medicare, B5 Abortion policy, B6 Election integrity, KYV1 Threats to democratic institutions, B8 Climate and environment (national), KYV2 Energy and utilities, KYV4 Storm resilience and flood protection, KYV5 Water supply and drinking water, KYV6 Renters and evictions, KYV7 Homelessness, KYV8 Condominium and HOA costs. Nothing in the run fills these.

26 passages clear the gates with no taxonomy issue (candidate-tier material): for example most SBA program items on /build-business-act, most CARE Act commitments, `30d2d517` (rapid transit funding), `302ea050` (income-tax relief for working families), `e8bd96b0` (universal childcare and pre-K), `5d2bd387` (public-service loan forgiveness).

### 5. Possible misses (information for the founder, not a fix)

Passages marked `states_policy: false` that plainly state a commitment on a taxonomy issue. Scores are `commitment / own_commitment`, then the issue score. Most of these clear `commitment` and fail only `own_commitment`: the new gate removed 26 passages from the one-gate run's 68, and most of the losses are here.

Immigration and border enforcement (B3), /issues. This one decides whether B3 is published at all:
- `4aab8e30` [0.97 / 0.59; B3 0.98]: "Our government has shamefully spent billions ripping families apart. They said ICE would only target criminals, but every day more" (ends "It’s time to end funding for these shameful deportation policies and redirect that investment where it belongs: into our communities.")

Housing affordability (A2) and Growth, development and land conservation (KYV3), /es/home-act unless noted:
- `d4637f26` [0.90 / 0.63; A2 0.98]: "The HOME Act lowers monthly housing costs without weakening lending standards — helping responsible families own a home, build generational"
- `da1dd9dc` [0.95 / 0.76; A2 0.98]: "Home prices and mortgage rates have pushed monthly payments beyond what many hardworking families can carry — even when their"
- `7de94c24` [0.92 / 0.80; A2 0.97]: "First-time buyers and working families face hurdles a lower payment alone can't fix: saving a down payment while paying rent,"
- `2ec82ee4` [0.90 / 0.77; A2 0.97]: "FHA loans are how generations of American families bought a first home — low down payments, sound underwriting, and a"
- `7bd37ee2` [0.73 / 0.62; A2 0.95]: "A refundable federal tax credit for first-time and low-to-moderate-income homebuyers — real help with the down payment and closing costs"
- `79a7d8f7` [0.79 / 0.79; A2 0.94]: "The HOME mortgage lowers the monthly payment. These three policies clear the other barriers — the down payment, the closing"
- `263d25d7` [0.80 / 0.64; A2 0.95]: "Yes. They stack. A first-time buyer could pair a HOME mortgage or an expanded FHA loan with the homebuyer tax"
- `45abce7b` [0.87 / 0.62; A2 0.98]: "A lower monthly payment. Expanded FHA lending. A first-time homebuyer tax credit. Capped starter rates. The HOME Act proves families"
- `f8d03ad0` [0.26 / 0.47; A2 0.68]: "The HOME Act keeps traditional underwriting and simply restructures repayment. You qualify the way you would today. Your total cost"
- `a0017014` [0.37 / 0.50; A2 0.68]: "The interest rate and total repayment obligation are fixed at closing. Borrowers choose a 40, 50, or 60-year payment schedule"
- `343f8421` [0.42 / 0.32; A2 0.84]: "First-time buyers are defined the way federal housing programs define them today — generally, families who haven't owned a home"
- `673900b0` [0.49 / 0.41; A2 0.83]: "Because the cap changes what a qualified borrower pays — not who qualifies. Underwriting stays exactly as strict. The same"
- `6fda7a5c` [0.89 / 0.74; KYV3 0.89, A2 0.88]: "The HOME Act is paired with policies that increase housing production, streamline permitting, encourage workforce housing, support modular construction, and"
- `93a29248` [0.90 / 0.76; A2 0.91, KYV3 0.91]: "Yes. The HOME Act is paired with policies to increase housing production — streamlining permitting, encouraging workforce housing, supporting modular"
- `2985591e` /care-act [0.93 / 0.76; A2 0.82]: "The CARE Act will create a national Community Living Capital Fund to help nonprofit organizations, local governments, housing providers, and"

`f8d03ad0` and `a0017014` state the HOME Act's central mechanism (40/50/60-year repayment of a fixed cost), and no published passage states it. `6fda7a5c` and `93a29248` are the only KYV3 commitments in the corpus; if check 3 is upheld, KYV3 rests on them.

Economy, inflation, and jobs (B1), /build-business-act and the homepage:
- `d4acf5e8` [0.84 / 0.44; B1 0.86]: "Small businesses are the backbone of the American economy. The BUILD Business Act modernizes the Small Business Administration by expanding"
- `2f556a5f` [0.80 / 0.25; B1 0.96]: "The BUILD Business Act shifts federal policy from simply recruiting employers to creating more of them. When small businesses succeed,"
- `ccf2a151` [0.90 / 0.80; B1 0.74]: "Too many entrepreneurs have the talent and determination to succeed but cannot access the capital needed to get started. The"
- `f380812f` [0.85 / 0.70; B1 0.81]: "Growing a construction, trucking, retail, or service business? A stronger SBA 7(a) program helps finance hiring and equipment."
- `48d3cee4` / [0.65 / 0.70; B1 0.76]: "Employee ownership and profit-sharing incentives that help workers build wealth."
- `19f050a8` / [0.64 / 0.66; B1 0.74]: "Small Business Opportunity Zones that revitalize local commercial corridors."
- `eb833e8e` / [0.76 / 0.52; B1 0.63]: "A strengthened SBA 504 program makes buying property and expanding easier."

Healthcare access and costs (B2), Social Security and Medicare (B4), Homelessness (KYV7), /care-act:
- `65cca763` [0.85 / 0.79; B2 0.82]: "Eligible individuals will receive timely access to necessary home and community-based services, including personal assistance, nursing, therapies, behavioral healthcare, transportation,"
- `34038b14` [0.85 / 0.79; B2 0.45]: "Require coverage of emergency backup caregiving and transition support."
- `62b6dc43` [0.67 / 0.47; B2 0.82, KYV7 0.81]: "The CARE Act coordinates existing federal programs and adds targeted investments in community care, housing, the caregiving workforce, technology, and"
- `03e1225a` [0.60 / 0.32; B4 0.67, B2 0.60]: "No. It would make those programs work together. Medicaid would generally fund long-term care and community supports. Social Security would"
- `dd879faa` [0.88 / 0.66; B2 0.61]: "Families should not have to spend a lifetime worrying about what happens next. The CARE Act creates a clear promise" (borderline: a summary promise)
- `b1fe54cd` [0.85 / 0.41; B2 0.88, KYV7 0.73]: "No person should lose healthcare, housing, caregiving, or community because a parent can no longer provide care." (borderline: a value statement more than a measure)

B4 note: `2322d8a3` (published under B2) scores B4 0.84, just under the line; with `03e1225a` it is the closest the site comes to a B4 statement.

Public school funding and teachers (A6) / Career, vocational and higher education (KYV10), /build-act:
- `0a6d0120` [0.87 / 0.62; KYV10 0.97, B1 0.89]: "Every student deserves a pathway to purpose. The BUILD Act prepares students for the economy of tomorrow by connecting education"
- `a900cb92` [0.68 / 0.45; KYV10 0.91]: "Federal incentive grants reward school districts that develop career pathways in AI, cybersecurity, healthcare, advanced manufacturing, logistics, infrastructure, entrepreneurship, aerospace,"
- `03380f9c` [0.86 / 0.82; KYV10 0.97]: "Every student graduates college ready, trade ready, entrepreneurially ready, or workforce ready through certifications, dual enrollment, apprenticeships, and career pathways."
- `cb487c4e` [0.55 / 0.26; A6 0.74, KYV10 0.72]: "Competitive federal grants reward districts that embrace innovation, workforce readiness, measurable outcomes, and industry partnerships."
- `e557bb52` [0.76 / 0.65; KYV10 0.69, A6 0.62]: "Accomplished professionals including engineers, physicians, scientists, entrepreneurs, artists, musicians, architects, attorneys, journalists, software developers, skilled trades professionals, veterans, and researchers"
- `3fbb2ea5` [0.78 / 0.69; A6 0.80, KYV10 0.78]: "National recognition and additional grant eligibility for school districts demonstrating exceptional workforce preparation and student success."

Pattern: the site presents its plans as named bills ("The HOME Act…", "The BUILD Business Act…") and as short bullets and FAQ answers, often without "Oliver will…". The `own_commitment` gate scores many of these below 0.85 even when `commitment` clears it. The biggest effect is on /es/home-act: of its 15 passages scoring A2 ≥ 0.85, 13 fall out and 2 are published.

### Other notes for the founder

- `ingest-report.md`'s "Step 2: policy run (Jev)" table describes the superseded one-gate run (provenance `q-b2171346`, 68 state a policy, 24 with an issue). The current `run.json` is `q-e7282116` with 42 and 16. The report should be updated or pointed at `attempt-1-one-gate/`.
- The constitution text in the review brief attributes quotes as "Senator Oliver G. Gilbert III says…". Nothing in the corpus calls him a senator. The site describes him as former Mayor of Miami Gardens and County Commission Chair. Any attribution template should drop the title or use one the site uses.

VERDICT: FAIL (check 3: `7bab3fc3`, a biography passage, is marked as stating a policy and published under A2 and KYV3)
