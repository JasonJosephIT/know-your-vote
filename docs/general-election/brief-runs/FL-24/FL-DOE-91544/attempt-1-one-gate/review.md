# Step 3 review: FL-DOE-91544 (Oliver G. Gilbert III), FL-24-general

Reviewer: Step 3, read-only. Inputs: `passages.jsonl` (217 lines), `run.json` (`kyv.policy-run/1`, status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 217 asked, 0 failed, 68 `states_policy`, 24 with a taxonomy issue), `ingest.log`. Official site: https://olivergilbert.vote/. Spine: undecided, so checks 4 and 5 cover the whole taxonomy (`src/lib/news-issues.ts`, 25 sub-issues). No website was fetched for this review.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (script) | **PASS** |
| 3 | No inferred motive | **FAIL** (1 passage: `7bab3fc3`) |
| 4 | Silence recorded, not filled | **PASS** (counts below; 16 issues at 0) |
| 5 | Possible misses (information only) | Reported, 18 passages |

## Evidence

### 1. Candidate-controlled sources only: PASS

Checked by script over `run.json` (all 217 passages, plus the 30 citations inside `areas`) and `passages.jsonl`:

- Hosts in `run.json` passages: `olivergilbert.vote` (217). Hosts in `areas` citations: `olivergilbert.vote` only. Hosts in `passages.jsonl`: `olivergilbert.vote` (217). No other host.
- URLs: `/` 19, `/about` 11, `/build-act` 21, `/build-business-act` 34, `/care-act` 82, `/es/home-act` 40, `/issues` 10. `/es/home-act` is a path on the official host (the English HOME Act page served under `/es/`), not a redirect to another host.
- `ingest.log` shows every page was fetched in the browser after an HTTP 202 bot challenge on the official host; no off-host fetch appears.
- Note (not a failure): `ingest.log` prints `14 passage(s)` for `/issues` and does not print a line for `/`; the run holds 10 for `/issues` and 19 for `/`. The ingest report's page table (10 and 19) matches `run.json`. It looks like per-page counts are printed before cross-page de-duplication; worth a look, but it does not affect source control.

### 2. Quotes verbatim: PASS

Node script (`Buffer.equals` on the UTF-8 bytes, joined on passage id):

- 68 of 68 passages with `states_policy: true` have text byte-identical to the passage with the same id in `passages.jsonl`, with the same url. None missing, none different.
- Also checked: all 217 passages match on text, url and heading, and all 30 citations in `areas` match their `passages.jsonl` text. `passages.jsonl` has 217 unique ids, no duplicates. No null verdicts.

### 3. No inferred motive: FAIL

Passages marked `states_policy: true` that are biography, an attack, fundraising or event copy with no commitment by the candidate:

| id | commitment | issues | url | first 20 words |
|---|---|---|---|---|
| `7bab3fc3` | 0.96 | A2, KYV3 | /about (County Commission Chair) | "On the County Commission, I’ve focused on a new goal: Make Miami-Dade County a truly world-class community. To get there, …" |

`7bab3fc3` is biography: it describes what the candidate did on the County Commission ("I’ve led bold initiatives…"), not what he commits to do in the office he is seeking. It reaches the published findings under A2 (Housing affordability, 0.95) and KYV3 (Growth, development and land conservation, 0.87). Under the constitution a record is not a stated position. Without it, A2 has 9 citations and KYV3 has 2 (both HOME Act passages).

Also no commitment, but outside the four named categories (page-structure copy, carrying no issue tag, so they do not reach `areas`):

- `78c3db1d` (0.90) /build-business-act: "Eleven concrete actions to help Americans start, grow, and expand small businesses. Tap any item to expand."
- `169b34e8` (0.85) /care-act: "One coordinated promise replaces a patchwork of disconnected programs. Here is the difference for families living it every day."

Looked at and not flagged, because each carries a commitment: `4aab8e30` (/issues, criticises ICE policy but ends "It’s time to end funding for these shameful deportation policies…"), `45abce7b` (HOME Act summary ending in "Add your support", but it lists the proposal's measures), `da1dd9dc`, `73e8082a`, `ef25c6b2` (value statements attached to named proposals).

Correctly kept out by the gate: biography `9168e8a3` (0.67) and `79bb7f1a` (0.31, which scores B7 0.86 on its own), the attack `b0abb288` (0.65), and the Donate Today / endorsement blocks `4fcedaa8`, `05ffc8ef`, `5e8fc791`, `604c0daa`, `a679e9f0` (0.02 to 0.18).

### 4. Silence recorded, not filled: PASS

"Clears the threshold" = `states_policy: true` and the issue's score ≥ 0.85, the rule `groupByArea` publishes. The counts match `areas` exactly. For reference, the second column counts every passage whose issue score is ≥ 0.85, whether or not the gate cleared.

| Issue | Label | Count (published) | Issue score ≥ 0.85, any gate | Passage ids (published) |
|---|---|---|---|---|
| A2 | Housing affordability | 10 | 17 | d4637f26, 1a3cb742, da1dd9dc, 6fda7a5c, 7de94c24, 2ec82ee4, f6766dc7, 93a29248, 45abce7b, 7bab3fc3 |
| B2 | Healthcare access and costs | 5 | 7 | 2322d8a3, 2d069267, 98a321eb, 5aae532d, 6601caca |
| B1 | Economy, inflation, and jobs | 4 | 10 | 0a42ee1c, fd6013e0, 0a6d0120, 307e9c65 |
| KYV10 | Career, vocational and higher education | 4 | 7 | 0a6d0120, f4fdd081, b0857d6f, 307e9c65 |
| KYV3 | Growth, development and land conservation | 3 | 3 | 6fda7a5c, 93a29248, 7bab3fc3 |
| A6 | Public school funding and teachers | 1 | 1 | 1e9ae5ba |
| B3 | Immigration and border enforcement | 1 | 1 | 4aab8e30 |
| B4 | Social Security and Medicare | 1 | 1 | 2322d8a3 |
| B7 | Crime policy, policing and courts | 1 | 2 | e552fbe8 |

If check 3 is upheld, A2 falls to 9 and KYV3 to 2. The B7 citation (`e552fbe8`, "Investigate and prosecute fraud aggressively.") sits under a section about protecting small-business grant money. It is a commitment, but the founder may want to know that it is the only B7 passage.

0, recorded as `no_stated_position_found`: A1 Property insurance costs, A3 Property taxes, A4 Cost of living in Florida, A5 Water quality and Everglades restoration, KYV9 School choice and vouchers, A7 Elections administration and voting access, B5 Abortion policy, B6 Election integrity, KYV1 Threats to democratic institutions, B8 Climate and environment (national), KYV2 Energy and utilities, KYV4 Storm resilience and flood protection, KYV5 Water supply and drinking water, KYV6 Renters and evictions, KYV7 Homelessness, KYV8 Condominium and HOA costs. Nothing in the run fills these.

44 passages clear the gate with no taxonomy issue (candidate-tier material): for example the SBA program items on /build-business-act, most CARE Act commitments, `30d2d517` (rapid transit funding), `302ea050` (income-tax relief for working families), `e8bd96b0` (universal childcare and pre-K), `5d2bd387` (public-service loan forgiveness).

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false`, but each plainly states a commitment on a taxonomy issue. Commitment scores are in brackets.

Housing affordability (A2), /es/home-act:
- `7bd37ee2` [0.74]: "A refundable federal tax credit for first-time and low-to-moderate-income homebuyers — real help with the down payment and closing costs …"
- `79a7d8f7` [0.79]: "The HOME mortgage lowers the monthly payment. These three policies clear the other barriers — the down payment, the closing …"
- `263d25d7` [0.80]: "Yes. They stack. A first-time buyer could pair a HOME mortgage or an expanded FHA loan with the homebuyer tax …"
- `f8d03ad0` [0.27]: "The HOME Act keeps traditional underwriting and simply restructures repayment. You qualify the way you would today. Your total cost …"
- `a0017014` [0.40]: "The interest rate and total repayment obligation are fixed at closing. Borrowers choose a 40, 50, or 60-year payment schedule …"
- `343f8421` [0.42]: "First-time buyers are defined the way federal housing programs define them today — generally, families who haven't owned a home …"

`f8d03ad0` and `a0017014` state the HOME Act's central mechanism (restructured 40/50/60-year repayment), and no gated passage states it directly.

Economy, inflation, and jobs (B1), /build-business-act:
- `d4acf5e8` [0.84]: "Small businesses are the backbone of the American economy. The BUILD Business Act modernizes the Small Business Administration by expanding …"
- `2f556a5f` [0.80]: "The BUILD Business Act shifts federal policy from simply recruiting employers to creating more of them. When small businesses succeed, …"

Healthcare access and costs (B2) / Social Security and Medicare (B4) / Homelessness (KYV7), /care-act:
- `65cca763` [0.84]: "Eligible individuals will receive timely access to necessary home and community-based services, including personal assistance, nursing, therapies, behavioral healthcare, transportation, …"
- `03e1225a` [0.65]: "No. It would make those programs work together. Medicaid would generally fund long-term care and community supports. Social Security would …"
- `62b6dc43` [0.69]: "The CARE Act coordinates existing federal programs and adds targeted investments in community care, housing, the caregiving workforce, technology, and …"
- `b1fe54cd` [0.84]: "No person should lose healthcare, housing, caregiving, or community because a parent can no longer provide care." (a value statement more than a measure; borderline)

Public school funding and teachers (A6) / Career, vocational and higher education (KYV10), /build-act:
- `a900cb92` [0.69]: "Federal incentive grants reward school districts that develop career pathways in AI, cybersecurity, healthcare, advanced manufacturing, logistics, infrastructure, entrepreneurship, aerospace, …"
- `03380f9c` [0.84]: "Every student graduates college ready, trade ready, entrepreneurially ready, or workforce ready through certifications, dual enrollment, apprenticeships, and career pathways."
- `cb487c4e` [0.57]: "Competitive federal grants reward districts that embrace innovation, workforce readiness, measurable outcomes, and industry partnerships."
- `e557bb52` [0.75]: "Accomplished professionals including engineers, physicians, scientists, entrepreneurs, artists, musicians, architects, attorneys, journalists, software developers, skilled trades professionals, veterans, and researchers …"
- `3fbb2ea5` [0.77]: "National recognition and additional grant eligibility for school districts demonstrating exceptional workforce preparation and student success."

Pattern: many misses are short bullets or FAQ answers that name the measure without "the HOME/BUILD/CARE Act will…", so the gate scores them low. Commitments on non-taxonomy topics that the gate also missed (for example `d163d0b7`, CARE Act caregiver supports, 0.56) are left out, because check 5 covers taxonomy issues only.

### Other note for the founder

The constitution text in the review brief attributes quotes as "Senator Oliver G. Gilbert III says…". Nothing in the corpus calls him a senator. The site describes him as a former Mayor of Miami Gardens and as County Commission Chair. Any attribution template should drop the title or use one the site uses.

VERDICT: FAIL (check 3: `7bab3fc3`, a biography passage, is marked as stating a policy and published under A2 and KYV3)
