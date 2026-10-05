# Profiler review: FL-DOE-84076 (Scott Eckhard Jewett, FL-GOV-general)

- Official site: https://scottjewett.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 351 passages, 351 asked, 156 state a policy, 79 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. All checks were run with node scripts over `run.json` and `passages.jsonl`, not by eye. Passage texts were read in full for checks 3 and 5.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS: one host, `scottjewett.com` (see the note on `/policies`) |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS: 156 of 156 policy passages identical; 0 mismatches |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | FAIL: `fe9c51f2` is biography with no commitment, marked as policy and tagged A1 (0.93) |
| 4 | Silence recorded, not filled | PASS: A1 = 7, A3 = 9, A2 = 6, A4 = 4. No spine issue is 0 |
| 5 | Possible misses (information only, not a fix) | 4 reported (`8b59c6a6`, `f0d433c3`, `7dcdbcf3`, `2e9f9a8f`), plus 5 borderline |

## 1. Candidate-controlled sources only: PASS

All 351 passage URLs in `run.json` have host `scottjewett.com`. So do all 91 citation URLs inside `run.json.areas`. `run.json.site` is `https://scottjewett.com`. No other host appears.

| URL | Passages (run.json = passages.jsonl) |
|---|---|
| https://scottjewett.com/ | 21 |
| https://scottjewett.com/policies | 80 |
| https://scottjewett.com/the-issues | 204 |
| https://scottjewett.com/our-mission | 22 |
| https://scottjewett.com/meet-scott | 24 |

`ingest.log` has no redirects. Every page got a bot challenge (HTTP 202) and was fetched again in the browser at the same URL. robots.txt was also read in the browser. `/platform` was fetched and gave 0 passages.

Notes for the founder. None of these changes the result.

- `/policies` is the campaign's website privacy policy and terms page. It is not an issues page. Jev's link judge chose it at 0.95 because the link text is "Policies". The page reads like an unfinished draft. It contains `[INSERT CAMPAIGN EMAIL]` (`edc07ed6`, `fd576548`, `e2cb9a77`), a builder note (`03a37cd0`: "Builder: link Florida Division of Elections campaign finance search ..."), and "OPTIONAL — short Website Terms (replace the current Terms of Service)" (`7d328a86`). One passage (`ae6df531`) is the text of a `dos.myflorida.com` URL, but its page URL is on-host. 79 of the 80 passages were gated out. The one that passed, `c66e89d5`, is listed under check 3.
- `ingest.log` lists per-page counts of 205 (`/the-issues`), 23 (`/our-mission`) and 26 (`/meet-scott`), 355 in total. 351 were written. `passages.jsonl` has 351 unique ids and `ingest-report.md` gives the written counts. The 4-passage gap looks like de-duplication at write time. This was not investigated further.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 351 lines and 351 unique ids (0 duplicates). `run.json` has 351 passages. Every id appears in both.
- All 156 passages with `states_policy: true` have `text` byte-identical (`Buffer.compare` over UTF-8) to the passage with the same id in `passages.jsonl`. Their `url` and `heading` match too. Missing: 0. Mismatches: 0.
- The same comparison over all 351 passages found 0 mismatches. So did the comparison over all 91 citation copies in `run.json.areas`. Every area citation is a gated passage whose `issues` include that sub-issue.
- There are no null verdicts.
- Internal consistency: `states_policy == (commitment >= 0.85)` holds for every passage. For gated passages, `issues` equals exactly the set of scores at 0.85 or above. 36 gated-out passages also carry non-empty `issues`. That is by design: in `src/lib/policy-noul.ts`, `readVerdict` computes `issueIds` without looking at the gate, and `groupByArea` skips passages that fail the gate. None of the 36 appears in `areas` or in the counts.

## 3. No inferred motive: FAIL

Failing item:

- `fe9c51f2` (`/meet-scott`, heading "Why Scott Is Running for Governor for FLorida"; commitment 0.91; A1 0.93): "Scott is not a career politician. He's a builder who has solved hard problems in the private sector and for". The whole passage is biography: his career, and that he "has already drafted insurance reform legislation and a detailed plan", followed by the reason the site gives for it. It commits to nothing and gives no content of the plan. The run marks it as stating a policy and cites it under A1 in `run.json.areas` and `run-report.txt`. A stated_position claim built from it would present a biographical statement as an insurance position. Without it, A1 falls from 7 to 6, so it still has positions.

Borderline items. These passed the gate. None is clearly only biography, attack, fundraising or event copy, so none fails the check by itself. Each is listed for the founder:

- `80c3d463` (`/meet-scott`; commitment 0.98; A1 0.94, A3 0.98): "Scott and Regina live in Boca Raton, where they face the same insurance premiums, property costs, and everyday pressures that". This is mostly biography. It passes on its last clause: "he's fighting to eliminate property tax for every homestead homeowner in the state" (A3). Its A1 tag rests on "He has drafted concrete proposals to reform Florida's broken homeowners insurance system", which is biography with no stated content. It also says "He is the only candidate who has attended the legislative sessions in person". That is a comparative claim, and the Profiler must not verify or repeat it as fact.
- `08656d30` (`/the-issues`; commitment 0.89; no issue tag, A1 0.74): "Scott has already drafted insurance reform work because he refuses to accept that this is “just Florida.” People who pay". This is biography plus a value statement ("People who pay the bill deserve a system that works when they need it"). It has no commitment to act. It has no spine tag.
- `e6a9c64c` (homepage; commitment 0.85, exactly at the threshold; no issue tag): "He is running for Governor because he believes Florida can do better , with less government overreach, more individual liberty,". This is why-he-is-running copy. The motive is the site's own wording, not the run's. Its near-duplicate on `/meet-scott`, `414f74ae` ("He's running for Florida Governor because ..."), scored 0.84 and was gated out. So this pass depends on a 0.01 margin.
- `0c1b4a77` (`/the-issues`, "Stop Taxing People Out of Their Homes"; commitment 0.85; A2 0.86, A3 0.92): "That hits retirees on fixed incomes first. It hits widows who want to stay on the same street. It hits". It describes a problem and contains no commitment. The commitment is in the section heading. It counts toward both A2 and A3.
- `7746b4c8` (same section; commitment 0.85; no tag): "Parents should not have to choose between keeping the house and paying for groceries. Small shops tied to a building". It describes a problem and contains no commitment.
- `8949d23d` ("Government Should Live on a Budget"; commitment 0.85; no tag): "When a family earns less, they cut what they cannot afford . When a small shop has a bad month,". It describes a problem and contains no commitment.
- `dbf1ca3a` (`/our-mission`; commitment 0.92; A4 0.85): "Floridians are working harder than ever . Government keeps making life more expensive and more complicated. We’re running as Libertarians". This is mission copy. It ends in a campaign appeal ("stand with us"), and its only commitments are slogans ("Keep more of what you earn"). It counts toward A4.
- `c66e89d5` (`/policies`, the privacy policy; commitment 0.86; no tag): "We do not buy secret dossiers on you. We also do not need a voter-file dump sitting on this website." This is the campaign's statement about how its website handles visitor data. It is not a position on a public issue. It would reach the brief as a candidate-tier "policy the taxonomy has no question for".
- `6d25aab6` (homepage, heading "Libertarian Candidate for Florida Lieutenant Governor"; commitment 0.96; B1): "Nicole is ready to help cut the red tape that drives up prices, protect parental rights , and fight for". This states the running mate's (Nicole Skelly's) positions, not the candidate's. If it is used, attribute it to her or to the ticket, not to Scott Jewett. B1 is not a spine issue.

No attack on an opponent and no fundraising or event copy passed the gate. Gated out: the Volunteer, Stay Informed, Register to Vote, Major Donors, News, Videos and Social Media blurbs (`8376bd3b`, `9937879a`, `7c448ac3`, `55dff371`, `7304b666`, `1b134de7` and `37d7dfe0`, commitment 0.02 to 0.14); the `/meet-scott` career biography (`09c86194`, `d3449423`, `b266bdc1`, `81863049`, `47584c5a` and the Quick Facts, 0.02 to 0.04); and the "two major parties" copy, `64ff7d2b` (0.83).

## 4. Silence recorded, not filled: PASS

This counts the passages with `states_policy: true` and the issue in `issues`, meaning a score of 0.85 or more. These counts match `run.json.areas` and `run-report.txt` (7, 9, 6 and 4 citations).

| Spine issue | Passages clearing 0.85 | Passage ids (issue score) |
|---|---|---|
| A1 Property insurance costs | 7 | 719d043d (0.98), 829ce6b6 (0.95), 7f92811a (0.92), 418ba52c (0.86), 98ccbb98 (0.95), 80c3d463 (0.94), fe9c51f2 (0.93) |
| A3 Property taxes | 9 | 0c1b4a77 (0.92), 35c46593 (0.92), e0983c0a (0.99), d579eca6 (0.89), 149cd8e8 (0.98), 9550a836 (0.90), d2cef668 (0.92), 3446a650 (0.98), 80c3d463 (0.98) |
| A2 Housing affordability | 6 | 3dc1ba4c (0.95), 109a6542 (0.92), 0c1b4a77 (0.86), ed2d73e5 (0.98), 0db88c44 (0.85), bcb016b5 (0.94) |
| A4 Cost of living in Florida | 4 | 4a8c5577 (0.93), 3dc1ba4c (0.98), 786fb3dc (0.88), dbf1ca3a (0.85) |

No spine issue is 0, so no `no_stated_position_found` Position is due. If every failing and borderline item from check 3 were removed, each spine issue would still have at least one passage: A1 5, A3 7, A2 5, A4 3.

For information, not counted: some gated-out passages have a raw spine score of 0.85 or more. A1 has 5 (`b57612b5`, `0c47c57f`, `fa5aabc3`, `51f20c89`, `8b59c6a6`). A3 has 2 (`65baf8ca`, `ae322531`). A2 has 5 (`8b71b84b`, `0822f6f9`, `f91dd4dd`, `964e7ade`, `24e7a35d`). A4 has 7 (`20993ff3`, `c24f7679`, `4cbc79b6`, `7ad38c46`, `8b71b84b`, `964e7ade`, `24e7a35d`). Only `8b59c6a6` of these states a commitment in plain words (see check 5). The rest are problem descriptions or slogans.

## 5. Possible misses (information for the founder, not a fix)

These passages were gated out (`states_policy: false`), but each states a commitment on a spine issue in plain words:

- `8b59c6a6` (`/our-mission`, heading "A mission is a promise you can measure. Here is ours."; commitment 0.77; A1 0.97): "Fix the insurance affordability crisis . Homeowners should not pay some of the highest premiums in the country for coverage". This is A1. It sits in the same list as `3446a650` (A3), which passed at 0.97.
- `f0d433c3` (`/the-issues`, "What We Will Do"; commitment 0.72; A4 0.46): "Tie the rest of this agenda together — insurance, taxes, housing, healthcare, energy, and spending — so the kitchen table". This is A4. It is the closing item of the cost-of-living section.
- `7dcdbcf3` (`/the-issues`, "What We Will Do" under "Fix the Insurance Affordability Crisis"; commitment 0.67; A1 0.41, B2 0.88): "Measure reform the only way that matters: are premiums coming down, and do claims get paid?" This is A1. The run's raw tag is B2 (healthcare), but by its section this passage is about homeowners insurance.
- `2e9f9a8f` (`/the-issues`, "What We Will Do" under "Florida Housing Should Not Be So Expensive"; commitment 0.62; A2 0.80): "Measure success by whether nurses, teachers, tradespeople, and young families can still live in their communities." This is A2.

Borderline. These state a view on a spine issue, but as a slogan or belief rather than a commitment to act:

- `4afaf844` (0.81; A4 0.65): "Cost of living is not one bill. It is insurance, property taxes, housing, energy, healthcare, and red tape stacked on"
- `7ad38c46` (0.77; A4 0.87): "Florida families should not have to work two jobs to afford one life. Keep what you earn. Live free."
- `24e7a35d` (0.58; A2 0.89, A4 0.91): "Florida should be a place you can start a life, not a place you get priced out of."
- `964e7ade` (0.64; A2 0.97, A4 0.88): "Floridians should not have to leave Florida to afford Florida."
- `ae322531` (0.60; A3 0.95): "Property tax relief is not a gift . It is the state admitting it does not own your house."

Related, outside check 5's scope: some passages cleared the gate and state a commitment on a spine issue, but no spine score reached 0.85, so they are not counted in check 4. For A1 these are `8f31f27b` "Increase competition so more companies want to insure Florida families." (A1 0.72), `5e6fd672` "Keep Citizens as a backstop ..." (0.63), `b72985d7` (0.71), `f710d148` (0.64) and `96df8681` (0.52). For A4 they are `a18ad673` "Treat cost of living as the test for every state decision ..." (A4 0.68), `1e339d24` (0.73) and `17946dd2` (0.66). For A2 there is `4488818c` (0.58). The spine counts understate how much the site says on A1 and A4. The run does not overstate it.

## Other notes for the founder

- The Profiler constitution in this run's review file tells the writer to attribute as "Senator Scott Eckhard Jewett says…". The candidate's own site describes him as "not a career politician" (`fe9c51f2`), and nothing in the corpus gives him the title Senator. Claims should attribute to "The campaign website" or "Scott Jewett", not "Senator".
- Many `/the-issues` passages speak for "Scott and Nicole", the ticket. That is candidate-controlled and fine to attribute to the campaign.

VERDICT: FAIL (check 3: `fe9c51f2`, biography with no commitment, marked as stating a policy and tagged A1)
