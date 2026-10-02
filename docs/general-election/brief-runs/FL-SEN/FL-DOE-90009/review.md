# Step 3 review: FL-DOE-90009 (Angie Nixon), FL-SEN-general

Reviewed 2026-09-30 against the Profiler constitution. This is a read-only review of
`passages.jsonl`, `run.json` (`kyv.policy-run/1`, status `complete`, provenance
`jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, two gates: `q_states_policy` and
`q_own_commitment`) and `ingest.log`. No website was fetched. The one-gate run and
its review are kept in `attempt-1-one-gate/` and were not re-used as evidence.

SPINE: undecided for this race. Check 4 therefore covers every taxonomy issue in
`src/lib/news-issues.ts` (25 sub-issues, taxonomy v7), and check 5 considers every
taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS (133/133 passages on `angienixon.com`) |
| 2 | Quotes verbatim | PASS (94/94 policy passages byte-identical; all 133 texts and headings match) |
| 3 | No inferred motive | FAIL (1 passage: `bf9027e8`, fundraising copy; no issue tag) |
| 4 | Silence recorded, not filled | PASS (16 issues have passages clearing the threshold; 9 are 0 / `no_stated_position_found`) |
| 5 | Possible misses (information only) | 3 possible misses (`c9c9db66` B3, `53ad9313` B2, `ceac6de5` B1); 4 borderline |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script read `run.json` and `passages.jsonl`. All 133 passages in both files,
and every citation in `run.json.areas`, have host `angienixon.com`, the OFFICIAL_SITE
host. No other host appears and no redirect was involved.

| URL | Passages |
|---|---|
| `https://angienixon.com/` | 18 |
| `https://angienixon.com/priorities` | 111 |
| `https://angienixon.com/meet-angie` | 4 |

This matches `ingest.log`: 3 pages fetched in the browser, 111 passages from
`/priorities` and 4 from `/meet-angie` (the homepage count is not printed;
133 - 111 - 4 = 18).

Note: `61f8fa13` on `/priorities` quotes a third party ("– Alphonso Mayfield (Labor
Leader ...)"). It is `states_policy: false` (0.63/0.10), so no claim can come from it.

### 2. Quotes verbatim: PASS

`run.json` marks 94 passages `states_policy: true` (matches `counts.states_policy`).
A node script compared each one's `text` with the passage of the same `id` in
`passages.jsonl` using `Buffer.equals`:

- 94/94 byte-identical; all URLs match; no ids missing; no duplicate ids in `passages.jsonl`.
- All 133 passages match on text and heading, including those not marked as policy.
- All 64 citations in `run.json.areas` have text identical to their passage (0 mismatches).
- `states_policy` equals (commitment >= 0.85 AND own_commitment >= 0.85) for all 133
  passages (0 inconsistencies).

Consistency note (not a failure): 13 passages are `states_policy: false` but carry a
non-empty `issues` array, because `readVerdict` in `src/lib/policy-noul.ts` applies
the issue threshold independently of the gates: `582fd03b`, `53ad9313`, `6f2f9c54`,
`c9c9db66`, `8eee7a5b`, `78c287b3`, `df49be9c`, `024dad02`, `47923aa7`, `4092ac2e`,
`005211ea`, `e458a7ce`, `ceac6de5`. None appears in `areas`. A consumer reading
`issues` without checking `states_policy` would mis-tag them.

### 3. No inferred motive: FAIL

Marked `states_policy: true` but only fundraising copy, with no policy commitment:

| Id | Gates (commitment / own) | Issues | Heading | First 20 words |
|---|---|---|---|---|
| `bf9027e8` | 0.87 / 0.86 | none | "Will You Chip In?" | "Angie Nixon is running to take on corporate greed, lower costs for hardworking families, and ensure the government actually works" |

`bf9027e8` is the homepage donation block. Its first sentence restates the campaign's
general aims ("take on corporate greed", "lower costs", "ensure the government
actually works for the people") without naming any policy, program or action; its
second sentence is the donation ask ("Help power a grassroots movement built by
Florida, for Florida."). It clears both gates by 0.02 and 0.01. It has no issue tag, so
it reaches no issue Position; it sits in the 48 "states a policy the taxonomy has no
question for" (candidate-tier) passages. This is a close call: the same general aims
appear outside fundraising copy in `cf5972d7` (below), so withholding `bf9027e8` loses
no stated aim. The attempt-1 review also flagged it; the second gate did not remove it.

Borderline, not counted in the FAIL (commitment is general, or partly in the heading):

| Id | Gates | Issues | First 20 words | Note |
|---|---|---|---|---|
| `cf5972d7` | 0.97 / 0.92 | B1 | "Angie Nixon is running to lower costs, raise wages, and build a people-powered government that puts working families first, not" | Homepage hero. General campaign aims, but "raise wages" is a direction on B1. Feeds B1. |
| `ae4a4e21` | 0.91 / 0.86 | none | "A union organizer who'll fight for the Working Families Guarantee." | Biography plus commitment to a named program (defined on `/priorities`). |
| `6ea13f38` | 0.90 / 0.90 | none | "For too long, corporations have rigged labor law against working people. Angie was a labor organizer and will fight for" | Biography plus "the dignity of all workers". |
| `d596d512` | 0.95 / 0.85 | none | "When a handful of billionaires can spend hundreds of millions of dollars to influence an election and the average person" | Problem statement plus "will fight to make this country a real democracy". |
| `7b30037b` | 0.97 / 0.88 | B2, B4 | "Billionaire fortunes have exploded over the past few years while working families fall further behind on rent, groceries, and medical" | Mostly conditions; ends "Angie believes we can afford Medicare for All, universal child care, and a clean-energy future." Feeds B2 and B4. |

Passages correctly left at `states_policy: false`: biography `e21732ed`, `35a5155a`,
`9ce54d14`, `8c3ad91f`, `5c86248e`, `fb2572e9` (flagged in attempt-1, now 0.72 on the
second gate); State House record `3bb48a39`, `582fd03b`, `e458a7ce`; press releases
and statements `6f2f9c54`, `c9e524b0`, `6cbffde5`, `d9a86a3a`; endorsement `3317aa97`;
volunteer copy `7b899649`; third-party quote `61f8fa13`.

### 4. Silence recorded, not filled: PASS

A passage clears the threshold for an issue only if it clears both gates (>= 0.85) and
scores >= 0.85 on that issue, which is what `groupByArea` applies. For every issue the
script-derived list equals both the passages whose `issues` include it and the
citations under it in `run.json.areas`. The last column lists passages that reached
0.85 on the issue score but failed a gate; they are not counted.

| Issue | Label | Passages clearing threshold | Coverage | Raw score >= 0.85 only (not counted) |
|---|---|---|---|---|
| A1 | Property insurance costs | 1 (`f79f6561`) | stated | none |
| A2 | Housing affordability | 8 (`989b08bd` `ddb81e18` `0e2d258d` `778d3bea` `99a917e5` `281001d4` `0ebda502` `b18c3170`) | stated | `024dad02` `4092ac2e` |
| A3 | Property taxes | 0 | no_stated_position_found | none |
| A4 | Cost of living in Florida | 0 | no_stated_position_found | `024dad02` `e458a7ce` |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found | none |
| A6 | Public school funding and teachers | 2 (`eb3f0ea8` `53f95638`) | stated | none |
| KYV9 | School choice and vouchers | 0 | no_stated_position_found | none |
| KYV10 | Career, vocational and higher education | 2 (`b7664fab` `a4a34c19`) | stated | `df49be9c` |
| A7 | Elections administration and voting access | 4 (`f5124db1` `bacb1b46` `e5a8dfa6` `46f744e1`) | stated | `582fd03b` `e458a7ce` |
| B1 | Economy, inflation, and jobs | 9 (`cf5972d7` `ed1d4f22` `c8c427de` `a4a34c19` `37151b54` `f03f29ab` `3c5bb879` `2d34d9cb` `ea130e22`) | stated | `47923aa7` `ceac6de5` |
| B2 | Healthcare access and costs | 7 (`3111b02f` `8ae65445` `9d155a8f` `c358a279` `7b30037b` `0ebda502` `b18c3170`) | stated | `53ad9313` `6f2f9c54` `8eee7a5b` `78c287b3` |
| B3 | Immigration and border enforcement | 4 (`279a407d` `fc621a25` `1cea0362` `1bd49aea`) | stated | `c9c9db66` `4092ac2e` |
| B4 | Social Security and Medicare | 3 (`3111b02f` `7b30037b` `0ebda502`) | stated | none |
| B5 | Abortion policy | 1 (`654a35d4`) | stated | none |
| B6 | Election integrity | 0 | no_stated_position_found | none |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found | none |
| B7 | Crime policy, policing and courts | 7 (`279a407d` `84d79c9b` `e515153e` `aa882618` `4c5dd114` `1bd49aea` `d82ad9b4`) | stated | `4092ac2e` |
| B8 | Climate and environment (national) | 3 (`1190bf2f` `ea130e22` `c747db52`) | stated | `005211ea` |
| KYV2 | Energy and utilities | 5 (`68e70ce2` `1190bf2f` `ea130e22` `c747db52` `9a52996d`) | stated | `47923aa7` |
| KYV3 | Growth, development and land conservation | 1 (`1190bf2f`) | stated | none |
| KYV4 | Storm resilience and flood protection | 2 (`8d557e7f` `ce95d983`) | stated | none |
| KYV5 | Water supply and drinking water | 0 | no_stated_position_found | none |
| KYV6 | Renters and evictions | 5 (`989b08bd` `ddb81e18` `778d3bea` `99a917e5` `281001d4`) | stated | none |
| KYV7 | Homelessness | 0 | no_stated_position_found | none |
| KYV8 | Condominium and HOA costs | 0 | no_stated_position_found | none |

- 16 issues have at least one passage clearing the threshold.
- 9 issues are 0, recorded as `no_stated_position_found`: A3, A4, A5, KYV9, B6, KYV1,
  KYV5, KYV7, KYV8.
- No passage below a gate is counted toward any issue.
- 48 passages clear both gates with no issue tag (`counts.states_policy` 94 minus
  `with_issue` 46): foreign policy, AI/tech, surveillance, campaign finance and ethics,
  taxation, child care, paid leave, labor, pensions/Social Security (`5adc7ea2`,
  scored below 0.85 on B4), FEMA, D.C. and Puerto Rico status, anti-hate items. These
  are candidate-tier material, not spine silence.

### 5. Possible misses (information only, not a fix)

Marked `states_policy: false` but plainly stating a commitment on a taxonomy issue:

| Id | Gates | Issue score | First 20 words | Note |
|---|---|---|---|---|
| `c9c9db66` | 0.84 / 0.59 | B3 0.95 | "In full support of protestors, clergy, and others seeking reinstatement of TPs protections for Haitians, Rep. Angie Nixon sets the" | Campaign press-release teaser stating support for reinstating TPS for Haitians. Truncated ("..."). B3 already has 4 citations. |
| `53ad9313` | 0.93 / 0.73 | B2 0.95 | "Health care as a right, not a privilege tied to your paycheck." | Homepage block under the heading "Medicare for All". B2 already has 7 citations. |
| `ceac6de5` | 0.89 / 0.76 | B1 0.94 | "With our state's rich resources, we all deserve to thrive. Angie is fighting for better opportunities for our children. For" | Bio page; "Angie is fighting ... For lower costs and higher wages." Same aims as `cf5972d7`, which passes. |

Borderline (a stance or belief, but no specific commitment), for completeness:

| Id | Gates | Issue score | First 20 words |
|---|---|---|---|
| `4092ac2e` | 0.96 / 0.68 | B3 0.97, B7 0.97 | "The US has the largest policing, incarceration and deportation system in the world. Millions of people — disproportionately Black, brown," |
| `005211ea` | 0.79 / 0.51 | B8 0.93 | "The climate crisis is an existential threat, and the fossil fuel industry has spent decades lying about it while cashing" |
| `024dad02` | 0.68 / 0.12 | A2 0.98 | "Rent is too high, homeownership is out of reach for millions, and Wall Street landlords are buying up housing stock" |
| `995eda18` | 0.91 / 0.40 | B7 0.80 | "Across the country, communities are pushing back against the rapid, unregulated spread of AI-powered surveillance technology — including automated license" |

- `4092ac2e` ends "I don't believe any person is illegal ... Real safety comes from good jobs ... not
  from more cameras, more cages, and more agents tearing families apart."
- `005211ea` ends "Angie rejects the false choice between good jobs and a livable planet."
- `024dad02` ends "Housing is a human right, not a speculative asset for the billionaire class."
- `995eda18` ends "I believe you shouldn't have to choose between public safety and your right to privacy."

No other passage below a gate states a commitment on a taxonomy issue; the rest are
biography, record, statistics, problem statements, press-release teasers, event or
volunteer copy.

VERDICT: FAIL (check 3)
