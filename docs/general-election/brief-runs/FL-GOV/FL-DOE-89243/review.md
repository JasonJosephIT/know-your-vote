# Profiler review: FL-DOE-89243 (David Jolly, FL-GOV-general)

- Official site: https://davidjolly.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 215 passages, 215 asked, 65 state a policy, 47 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. All checks were run with a node script over `run.json` and `passages.jsonl`, not by eye.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | PASS (with borderline notes) |
| 4 | Silence recorded, not filled | PASS: A1 = 10, A3 = 0 (no_stated_position_found), A2 = 6, A4 = 5 |
| 5 | Possible misses (information only, not a fix) | 11 reported, 3 borderline |

## 1. Candidate-controlled sources only: PASS

Every one of the 215 passage URLs in `run.json` has host `davidjolly.com`, and so do all 70 citation URLs inside `run.json.areas`. No other host appears. `run.json.site` is `https://davidjolly.com`. The 9 distinct URLs are the homepage, `/issues`, `/issues/republicans-for-jolly`, `/issues/affordability`, `/issues/health-care`, `/issues/public-education`, `/issues/data-centers`, `/homeowners-insurance` and `/environment` (they match `ingest.log`). `ingest.log` has no redirect, bot-challenge, browser-fallback or unreachable lines. The only other line is `honoring Crawl-delay: 10s`.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 215 unique ids. `run.json` has 215 passages, and every id is present in both.
- All 65 passages with `states_policy: true` have `text` that is byte-identical (Buffer.compare over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 215 passages, and over all 70 citation copies in `run.json.areas`, also found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)` and `issues` equals exactly the set of scores >= 0.85. No inconsistencies.

## 3. No inferred motive: PASS

None of the 65 passages marked as stating a policy is only biography, an attack on an opponent, fundraising or event copy. The site's copy of those kinds was gated out: event copy `5dc18457`, `25cd25b0` and `ff93c48c` (commitment 0.61, 0.71 and 0.58), biography `d523fcbc` and `22d36f31` (0.62 and 0.78), the fundraising and volunteer ask `96caf63f` (0.78), and copy about the Donalds ads `6eebb1ba` (0.08).

Borderline items. These passed the gate but carry little or no concrete commitment on their own. None is biography, attack, fundraising or event copy, so none fails the check. Listed for the founder:

- `8ddd5549` (KYV2, KYV3): "Those are David Jolly's words, and he does not hedge them." It is a characterization, and the commitment is in its heading quote.
- `647e0e01` (KYV2, KYV3): "Water and power. Neighborhoods. An economic promise nobody has proven. And one more reason that politicians in Tallahassee tend to forget: the people..." A list of reasons with a jab at "politicians in Tallahassee". The commitment is in the heading.
- `8d79a86d` (A1): "Instead of forcing every Florida family to pay a private insurer to take on that enormous hurricane risk, Jolly's proposal does four things, in order." A lead-in sentence. It counts toward A1.
- `af7822f3` (KYV9): "Florida doesn't need to abandon public education."
- `998c6863` (A6): "That starts with schools we are willing to invest in."
- General statements of principle with no spine tag: `76b8c361`, `e50972d8`, `f4894fa9`, `35d19193`, `6f7ce18a`, `aac9c99c`, `588e69f2`, `563485db`, and `43bbc5e8` (tagged B2: "Limited government doesn't have to mean ineffective government. Floridians pay taxes and expect basic institutions to function. Schools should work.")

## 4. Silence recorded, not filled: PASS

This counts the passages with `states_policy: true` and the issue in `issues`, meaning a score of 0.85 or more.

| Spine issue | Passages clearing 0.85 | Passage ids (issue score) |
|---|---|---|
| A1 Property insurance costs | 10 | f91f38b0 (0.98), ca775777 (0.93), 18010427 (0.97), 0fa9eba0 (0.98), 1d5f9a9f (0.98), af5004c7 (0.98), 15728f6b (0.97), 8d79a86d (0.89), a0bbb4d3 (0.97), 0f2d6744 (0.86) |
| A3 Property taxes | 0 (no_stated_position_found) | none. The highest A3 score of any passage is 0.64 (`b243bfec`). |
| A2 Housing affordability | 6 | f91f38b0 (0.96), 18010427 (0.99), c85b00c4 (0.99), 8cb9558f (0.97), 9841ab56 (0.98), 56a17ea7 (0.94) |
| A4 Cost of living in Florida | 5 | f91f38b0 (0.90), 18010427 (0.98), 1552aa29 (0.95), 8cb9558f (0.93), 9841ab56 (0.95) |

`run.json.areas` has no A3 entry, which matches the count of 0. This review does not suggest any passage to stand in for A3.

## 5. Possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that plainly state a commitment on a spine issue. The first 20 words of each are quoted.

| id | url path | commitment | spine scores | First 20 words |
|---|---|---|---|---|
| 5d9e0ab9 | / | 0.80 | A1 0.94 | "Floridians pay the highest home insurance prices in America. Here is the plan to cut them by 60 to 70 percent." |
| 9f5f0a83 | /issues/affordability | 0.82 | A1 0.94 | "Read the full plan: how a state-backed catastrophe fund cuts Florida homeowners insurance by 60 to 70 percent." |
| cde8755c | /issues/affordability | 0.73 | A1 0.97, A2 0.88 | "No, it is a risk-pooling mechanism that lowers costs for everyone by spreading hurricane exposure across all Florida homes. Homeowners" |
| 39c90fa5 | /issues/affordability | 0.80 | A2 0.97, A4 0.91 | "The plan specifically calls for scaling workforce housing based on income and proximity to work, deliberately targeting tourism corridors rather" |
| 99397a78 | /issues/affordability | 0.51 | A1 0.78, A2 0.90, A4 0.87 | "Retirees face acute pressures from condo special assessments and rising property insurance. The no-interest state-backed condo loan is targeted" |
| 6d9d038d | /issues/affordability | 0.63 | A4 0.62 | "The cap would bring Florida's authorized utility return in line with the national average of roughly 9 to 10 percent." |
| dd261a7f | /homeowners-insurance | 0.62 | A1 0.77 | "David Jolly's plan takes a structure Florida has already proven and directs it to the people who actually pay the" |
| edaa05d2 | /homeowners-insurance | 0.41 | A1 0.48 | "Yes. The Florida Hurricane Catastrophe Fund has existed since 1993. Today it reimburses insurance companies for a share of their" (the commitment is the last sentence: "The plan applies a structure Florida has already proven to the people who pay the bills.") |
| 39e5b792 | /homeowners-insurance | 0.61 | A1 0.44 | "The fund is rolled out responsibly. Coverage becomes available only after a fiscally sound amount of money is set aside" (near-duplicate of `4cbd001d`, which passed the gate) |
| 7d167a89 | /homeowners-insurance | 0.17 | A1 0.52, A3 0.39 | "No. There is no $1,000 fee, tax or assessment on homeowners in the plan. The claim comes from a" (part rebuttal of an opponent ad. It concerns a hurricane fee, not property tax, so it is not an A3 position.) |
| e2c091f2 | /homeowners-insurance | 0.10 | A1 0.43 | "Hurricane and wind risk can be 60 to 70 percent of a Florida homeowners bill. Based on Insure.com's Florida home" (the savings the plan projects. The same figure appears in `af5004c7`, which passed the gate.) |

Borderline cases, where the goal is aspirational rather than a plain commitment:

- `e983526d` (c 0.55, A4 0.93): "When most people can't cover a surprise bill without going into debt, the whole economy is one storm away from crisis."
- `3a1efd65` (c 0.31, A2 0.84, A4 0.89): "Florida can be a place where hard work still buys a home, a full fridge, and a night's sleep without"
- `a8aeb190` (c 0.20, A2 0.92, A4 0.95): "From the rent check to the insurance bill, the cost of living here has outrun the paychecks of the people" (states the problem, not a commitment)

A related note on passages that did pass the gate. Five passages from `/homeowners-insurance` passed the policy gate but got no issue tag, because their A1 score fell below 0.85. All describe the catastrophe-fund plan: `b80c7018` (A1 0.78), `23c2f5ab` (0.72), `b243bfec` (0.72), `cc1ca7ba` (0.80) and `4cbd001d` (0.47). They are counted in `states_policy` but not under A1. None of them is about property taxes. `b243bfec` names "a fee on real estate transactions or existing tourist taxes" as funding options for the insurance fund.

No passage on the site, whether it passed the gate or not, states a commitment on property taxes (A3). `6945f001` mentions Save Our Homes caps as background (commitment 0.04), and `4b367e4a` mentions local property tax revenue as a fact about school funding (0.03). Neither is a commitment.

## Other observations (no effect on the verdict)

- `dry-run.log` reports 200 passages because of the dry-run default `--limit 200` in `scripts/candidate-policy-noul.ts`. The real run asked all 215 (`counts.asked` = 215, `run.log`).
- `attempt-1-failed/` holds an earlier ingest that failed because `/usr/bin/time` was missing. It is a failure in the harness, not in the site.
- There is no About or bio page among the 8 policy pages fetched, because the page cap of 8 was reached. The biography copy on the homepage was correctly gated out.

VERDICT: PASS
