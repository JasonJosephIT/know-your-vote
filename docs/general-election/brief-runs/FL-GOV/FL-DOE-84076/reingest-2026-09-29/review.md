# Profiler review: FL-DOE-84076 (Scott Eckhard Jewett, FL-GOV-general)

- Official site: https://scottjewett.com/
- Run: `run.json` status `complete`, schema `kyv.policy-run/1`, provenance `jev:jev-1.13.0/tax-7/q-e7282116`, model `jev-1.13.0`, taxonomy 7, threshold 0.85, two gates (`q_states_policy` and `q_own_commitment`)
- Counts (run.json): 351 passages, 351 asked, 93 state a policy, 51 with an issue, 0 failed. A script recount over `run.json.passages` gives the same numbers.
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. Checks 1, 2 and 4 were run with node scripts over `run.json` and `passages.jsonl`, not by eye. For checks 3 and 5, all 93 gated passages and every ungated passage with a spine score of 0.4 or more, a commitment score of 0.6 or more, or a cost/tax/housing/insurance keyword were read in full.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS: one host, `scottjewett.com` |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS: 93 of 93 policy passages identical; 0 mismatches |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | PASS: none found. 5 borderline passages noted |
| 4 | Silence recorded, not filled | PASS: A1 = 4, A3 = 5, A2 = 4, A4 = 2. No spine issue is 0 |
| 5 | Possible misses (information only, not a fix) | 5 clear misses (`98ccbb98`, `8b59c6a6`, `d2cef668`, `ed2d73e5`, `a18ad673`), plus borderline ones listed below |

## 1. Candidate-controlled sources only: PASS

All 351 passage URLs in `run.json` have host `scottjewett.com`, and so do all 351 in `passages.jsonl`. All 59 citation URLs inside `run.json.areas` are on the same host. `run.json.site` is `https://scottjewett.com`. No other host appears as a passage URL.

| URL | Passages (run.json = passages.jsonl) |
|---|---|
| https://scottjewett.com/ | 21 |
| https://scottjewett.com/policies | 80 |
| https://scottjewett.com/the-issues | 204 |
| https://scottjewett.com/our-mission | 22 |
| https://scottjewett.com/meet-scott | 24 |

`ingest.log` shows no redirects. Every page got a bot challenge (HTTP 202) and was fetched again in the browser at the same URL. robots.txt was also read in the browser. `/platform` was fetched and gave 0 passages.

The only off-host URL anywhere in either file is `https://dos.myflorida.com/elections/candidates-committees/campaign-finance/`. It is text inside a passage on `https://scottjewett.com/policies` (the campaign's privacy and terms page), not a page that was fetched. That passage did not clear the gate.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 351 lines and 351 unique ids (0 duplicates). `run.json` has 351 passages. Every id appears in both.
- All 93 passages with `states_policy: true` have `text` byte-identical (`Buffer.compare` over UTF-8) to the passage with the same id in `passages.jsonl`. Their `url` also matches. Missing: 0. Mismatches: 0.
- The same comparison over all 351 passages found 0 text or URL mismatches and 0 heading mismatches. All 59 citation copies in `run.json.areas` are byte-identical too, and each is a gated passage whose `issues` include that sub-issue.
- Internal consistency: for every passage, `states_policy` equals `commitment >= 0.85 AND own_commitment >= 0.85` (0 exceptions), and `issues` equals the set of scores `>= 0.85` (0 exceptions).

## 3. No inferred motive: PASS

No gated passage is only biography, an attack on an opponent, fundraising, or event copy. The earlier attempt's failure (`fe9c51f2`, biography tagged A1) is now gated out (`own_commitment` 0.70). All 80 `/policies` passages (privacy and terms copy) are gated out.

Borderline, for the founder. Each contains a commitment, so none fails the check, but a Profiler writing claims from them should quote only the committing sentence and attribute it carefully:

| id | Page | Issues | Why borderline | First 20 words |
|---|---|---|---|---|
| `80c3d463` | /meet-scott | A1, A3 | Mostly biography. The commitment is the last clause ("fighting to eliminate property tax for every homestead homeowner"); the A1 part is only "has drafted concrete proposals". Also contains a comparative statement about other candidates ("the only candidate who has attended the legislative sessions in person"). | "Scott and Regina live in Boca Raton, where they face the same insurance premiums, property costs, and everyday pressures that millions" |
| `6d25aab6` | / | B1 | About the running mate, Nicole Skelly, not the candidate. On the ticket's site, but attribution should name her. | "Nicole is ready to help cut the red tape that drives up prices, protect parental rights , and fight for" |
| `222ab292` / `726a0346` | / and /meet-scott | KYV9, B1 | Third-person agenda summary in bio sections ("His agenda centers on..."). A list of priorities, not a specific commitment. | "His agenda centers on a robust economy with more living wage jobs , real educational choice, public safety, lower taxes," |
| `0db88c44` | /the-issues | A2 | `own_commitment` exactly 0.85. First sentence is a jab at an unnamed "new office in Tallahassee" proposal; the commitment is "Cut the barriers." | "We will not pretend a new office in Tallahassee can wish prices down . Cut the barriers." |
| `ca95d834` | /our-mission | none | Opens with the Libertarian Party of Florida's position; the commitment ("We will uphold and defend the Constitution") is generic. `commitment` exactly 0.85. | "The Libertarian Party of Florida says you own your life. We agree. We will uphold and defend the Constitution, not" |

## 4. Silence recorded, not filled: PASS

Count = passages with `states_policy: true` whose `issues` include the spine id (the same set `run.json.areas` cites). No spine issue is 0, so no `no_stated_position_found` is needed for this run.

| Spine | Passages | Ids |
|---|---|---|
| A1 Property insurance costs | 4 | `719d043d`, `7f92811a`, `418ba52c`, `80c3d463` |
| A3 Property taxes | 5 | `e0983c0a`, `149cd8e8`, `9550a836`, `3446a650`, `80c3d463` |
| A2 Housing affordability | 4 | `3dc1ba4c`, `109a6542`, `0db88c44`, `bcb016b5` |
| A4 Cost of living in Florida | 2 | `4a8c5577`, `3dc1ba4c` |

Notes: `80c3d463` counts under both A1 and A3, and `3dc1ba4c` under both A2 and A4. `80c3d463` and `0db88c44` are the borderline passages from check 3. If both were set aside, A1 would be 3 and A2 would be 3; no spine issue would reach 0.

For the record, passages with a spine score of 0.85 or more regardless of the gates: A1 12, A3 12, A2 11, A4 11. The gates removed 8, 7, 7 and 9 of them.

## 5. Possible misses (information for the founder, not a fix)

Passages the run marks `states_policy: false` that plainly state a commitment on a spine issue. Scores shown as commitment / own_commitment / spine score.

Clear misses:

| id | Page | Scores | First 20 words |
|---|---|---|---|
| `98ccbb98` | /the-issues ("What We Will Do") | 0.94 / 0.75 / A1 0.96 | "Your home should not be a luxury item because the insurance system failed. Fix the insurance affordability crisis." |
| `8b59c6a6` | /our-mission ("A mission is a promise you can measure. Here is ours.") | 0.77 / 0.64 / A1 0.97 | "Fix the insurance affordability crisis . Homeowners should not pay some of the highest premiums in the country for coverage that" |
| `d2cef668` | /the-issues ("What We Will Do") | 0.87 / 0.45 / A3 0.92 | "If you own your home, you shouldn't have to keep paying the government for the privilege of living in it." |
| `ed2d73e5` | /the-issues ("What Scott and Nicole Believe") | 0.96 / 0.74 / A2 0.98 | "Housing gets cheaper when people are free to build, buy, and rent without a maze of permission . Get government" |
| `a18ad673` | /the-issues ("What We Will Do") | 0.92 / 0.83 / A4 0.65 | "Treat cost of living as the test for every state decision: does this make life cheaper for families, or more" |

`d2cef668` is nearly the same sentence as `3446a650` on `/our-mission`, which was gated in and tagged A3.

Borderline (a stated position or measure rather than a concrete action):

- A1: `829ce6b6` "Insurance should protect the home, not feed a bloated system . Premiums should be honest. Claims should get paid. Families should" (0.94 / 0.58 / 0.95); `b72985d7` "Homeowners deserve competition, clear rules, and a market that wants to write coverage in Florida . Citizens should be a" (0.95 / 0.62 / 0.73); `fe9c51f2` "Scott is not a career politician. He's a builder who has solved hard problems in the private sector and for" (0.91 / 0.70 / 0.92; states he has drafted insurance reform legislation); `08656d30` "Scott has already drafted insurance reform work because he refuses to accept that this is “just Florida.” People who" (0.90 / 0.59 / 0.76); `7dcdbcf3` "Measure reform the only way that matters: are premiums coming down, and do claims get paid?" (0.67 / 0.57 / 0.38).
- A3: `d579eca6` "Florida families should never be taxed out of houses they already paid for . Government should live within its means," (0.95 / 0.74 / 0.89); `35c46593` "There is another way. If you own your home, you should not keep paying rent to the government forever." (0.89 / 0.49 / 0.92); `60d8b491` "Protect retirees and fixed income owners who did everything right and still fear the tax notice." (0.85 / 0.80 / 0.31).
- A2: `2e9f9a8f` "Measure success by whether nurses, teachers, tradespeople, and young families can still live in their communities." (0.61 / 0.53 / 0.80).
- A4: `f0d433c3` "Tie the rest of this agenda together — insurance, taxes, housing, healthcare, energy, and spending — so the kitchen table" (0.70 / 0.85 / 0.43); `84fe1a13` "Hardworking people should keep more of what they earn. Government should get out of the way so prices can come" (0.94 / 0.59 / 0.64); `4afaf844` "Cost of living is not one bill. It is insurance, property taxes, housing, energy, healthcare, and red tape stacked" (0.80 / 0.42 / 0.62).

Related, outside the letter of check 5: these passages cleared both gates but got no spine tag, although they sit under a spine section of `/the-issues` and state a commitment on it. They do not appear under A1 to A4 in `run.json.areas`.

- A1 section: `8f31f27b` "Increase competition so more companies want to insure Florida families." (A1 0.68); `5e6fd672` "Keep Citizens as a backstop, not a growing substitute for a working market." (A1 0.65); `1a93dca3` "Protect homeowners from abusive claims practices and endless runaround." (A1 0.09); `96df8681` "Connect storm policy to insurance reform so recovery does not become a second disaster." (A1 0.53).
- A2 section: `17946dd2` "Stop stacking insurance, tax, and fee costs onto the monthly payment until working families are priced out." (A2 0.52); `4488818c` "Cut the delays that raise costs, then dump those costs on the next buyer." (A2 0.62).
- A4 section: `1e339d24` "Stop shifting government costs onto household bills." (A4 0.74); `4b5ed503` "Force agencies to show how new rules hit parents, retirees, renters, and small shops before those rules take effect." (A4 0.15).

## Other notes for the founder (do not change the verdict)

- `ingest-report.md` is stale for Step 2. It gives provenance `q-b2171346` with 156 gated and 79 with an issue, which match the earlier attempt in `attempt-1-one-gate/`. The current `run.json` is `q-e7282116` with 93 and 51, as `run.log` also reports.
- `ingest.log` lists per-page counts of 80, 205, 0, 23 and 26, with no line for the homepage. `passages.jsonl` and `ingest-report.md` give 21, 80, 204, 22 and 24 (351 in total, matching the log's final line). The difference looks like de-duplication at write time. It was not investigated.
- `/policies` is a privacy and terms page, not an issues page. Jev's link judge chose it at 0.95 on the link text "Policies". All 80 of its passages were gated out in this run.

VERDICT: PASS
