# Step 3 review: FL-DOE-90009 (Angie Nixon), FL-SEN-general

Reviewed 2026-09-29 against the Profiler constitution. This is a read-only review of
`passages.jsonl`, `run.json` (`kyv.policy-run/1`, status `complete`, provenance
`jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85) and `ingest.log`. No website
was fetched.

SPINE: undecided for this race. Check 4 therefore covers every taxonomy issue in
`src/lib/news-issues.ts` (25 sub-issues, taxonomy v7), and check 5 considers every
taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim | PASS (102/102 policy passages byte-identical; all 133 texts match) |
| 3 | No inferred motive | FAIL (2 passages: `fb2572e9` biography, `bf9027e8` fundraising copy; neither carries an issue tag) |
| 4 | Silence recorded, not filled | PASS (16 issues have citations; 9 are 0 / `no_stated_position_found`) |
| 5 | Possible misses (information only) | 1 possible miss (`c9c9db66`, B3); 2 borderline |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script read `run.json` and `passages.jsonl`. All 133 passages in both files
have host `angienixon.com`, which is the OFFICIAL_SITE host. No other host appears,
and no redirect was involved. The passages come from three URLs:

| URL | Passages |
|---|---|
| `https://angienixon.com/` | 18 |
| `https://angienixon.com/priorities` | 111 |
| `https://angienixon.com/meet-angie` | 4 |

This matches `ingest.log`: 3 pages were fetched in the browser, with 111 passages
from `/priorities` and 4 from `/meet-angie`. The log does not print the homepage
count, but 133 - 111 - 4 = 18.

The site is candidate-controlled, but one passage on it quotes a third party:
`61f8fa13` ends "– Alphonso Mayfield (Labor Leader ...)". It is
`states_policy: false`, so no claim can come from it. If it is ever promoted, it must
not be attributed to the candidate.

### 2. Quotes verbatim: PASS

`run.json` marks 102 passages `states_policy: true` (`counts.states_policy` = 102).
A node script compared each one's `text` against the passage with the same `id` in
`passages.jsonl` using `Buffer.equals`. The results:

- 102/102 are byte-identical and all URLs match.
- No ids are missing and there are no duplicate ids in `passages.jsonl`.
- All 133 passage texts match, including the ones not marked as policy.
- Every citation inside `run.json.areas` also has text identical to its passage (0 mismatches).
- The per-issue citation lists in `areas` exactly match the passages that are
  `states_policy: true` with that issue in `issues`.

Consistency note (not a failure): 9 passages have `states_policy: false` but a
non-empty `issues` array: `582fd03b`, `6f2f9c54`, `c9c9db66`, `78c287b3`,
`df49be9c`, `024dad02`, `47923aa7`, `005211ea`, `e458a7ce`. The cause is
`readVerdict` in `src/lib/policy-noul.ts`, which applies the issue threshold
independently of the commitment gate. `groupByArea` skips passages that fail the
gate, and none of the 9 appears in `areas`. Anyone who reads `issues` directly
without checking `states_policy` would mis-tag them.

### 3. No inferred motive: FAIL

These passages are marked `states_policy: true` but contain only biography or
fundraising copy, with no commitment by the candidate:

| Id | Commitment | Issues | Heading | First 20 words |
|---|---|---|---|---|
| `fb2572e9` | 0.91 | none | "Angie believes in Universal Child Care & Pre-K." | "Child care in America costs more than college tuition in most states. As a mom of 5, Angie knows this" |
| `bf9027e8` | 0.87 | none | "Will You Chip In?" | "Angie Nixon is running to take on corporate greed, lower costs for hardworking families, and ensure the government actually works" |

- `fb2572e9` is a cost statistic followed by biography ("As a mom of 5, Angie knows
  this struggle deeply because she is experiencing it."). It contains no commitment.
- `bf9027e8` is the donation block. It gives a general campaign aim and then asks
  for money ("Help power a grassroots movement ..."). It commits to no policy.

Neither has an issue tag, so neither reaches any issue Position in `areas`. Both fall
in the "states a policy the taxonomy has no question for" set, which is the
candidate-tier path. A stated_position written from either one would be a stance
the passage does not contain.

The passages below are borderline and are not counted in the FAIL. In each, the
commitment is in the heading, or the text is rhetoric or general aims rather than
a specific commitment:

| Id | Commitment | Issues | First 20 words | Note |
|---|---|---|---|---|
| `8eee7a5b` | 0.92 | B2 | "The United States is the richest country on earth but doesn't guarantee healthcare to all its people. Americans pay more" | Argument only; the commitment is in the heading "Angie believes in Medicare for All." This is the only borderline passage that feeds a Position (B2). |
| `639a5750` | 0.89 | none | "So no parent has to choose between working and their kids." | Purpose clause; the commitment is in the heading "Free Child Care & Pre-K". |
| `ae4a4e21` | 0.91 | none | "A union organizer who'll fight for the Working Families Guarantee." | Biography plus the name of a program. |
| `6ea13f38` | 0.91 | none | "For too long, corporations have rigged labor law against working people. Angie was a labor organizer and will fight for" | Biography plus "the dignity of all workers". |
| `ceac6de5` | 0.89 | B1 | "With our state's rich resources, we all deserve to thrive. Angie is fighting for better opportunities for our children. For" | Bio-page copy with general aims. Feeds B1. |

Biography, record, opponent-directed and event passages that were correctly left at
`states_policy: false`:

- Biography: `e21732ed`, `35a5155a`, `9ce54d14`, `8c3ad91f`, `5c86248e`.
- State House record: `3bb48a39`, `582fd03b`, `e458a7ce`.
- Press releases and statements: `6f2f9c54`, `c9e524b0`, `6cbffde5`, `d9a86a3a`.
- Endorsement: `3317aa97`.
- Volunteer copy: `7b899649`.

### 4. Silence recorded, not filled: PASS

A passage clears the threshold for an issue only if it clears the commitment gate
(commitment >= 0.85) and also scores >= 0.85 on that issue. This is the rule
`groupByArea` applies. The column "raw score >= 0.85 only" lists passages that
reached 0.85 on the issue score but failed the gate. They are shown for
transparency and are not counted.

| Issue | Label | Passages clearing threshold | Coverage | Raw score >= 0.85 only (not counted) |
|---|---|---|---|---|
| A1 | Property insurance costs | 1 (`f79f6561`) | stated | none |
| A2 | Housing affordability | 9 (`989b08bd` `ddb81e18` `0e2d258d` `778d3bea` `99a917e5` `281001d4` `4092ac2e` `0ebda502` `b18c3170`) | stated | `024dad02` |
| A3 | Property taxes | 0 | no_stated_position_found | none |
| A4 | Cost of living in Florida | 0 | no_stated_position_found | `024dad02` `e458a7ce` |
| A5 | Water quality and Everglades restoration | 0 | no_stated_position_found | none |
| A6 | Public school funding and teachers | 2 (`eb3f0ea8` `53f95638`) | stated | none |
| KYV9 | School choice and vouchers | 0 | no_stated_position_found | none |
| KYV10 | Career, vocational and higher education | 2 (`b7664fab` `a4a34c19`) | stated | `df49be9c` |
| A7 | Elections administration and voting access | 4 (`f5124db1` `bacb1b46` `e5a8dfa6` `46f744e1`) | stated | `582fd03b` `e458a7ce` |
| B1 | Economy, inflation, and jobs | 11 (`cf5972d7` `ed1d4f22` `c8c427de` `a4a34c19` `37151b54` `f03f29ab` `3c5bb879` `2d34d9cb` `ea130e22` `b18c3170` `ceac6de5`) | stated | `47923aa7` |
| B2 | Healthcare access and costs | 9 (`53ad9313` `8eee7a5b` `3111b02f` `8ae65445` `9d155a8f` `c358a279` `7b30037b` `0ebda502` `b18c3170`) | stated | `6f2f9c54` `78c287b3` |
| B3 | Immigration and border enforcement | 5 (`4092ac2e` `279a407d` `fc621a25` `1cea0362` `1bd49aea`) | stated | `c9c9db66` |
| B4 | Social Security and Medicare | 3 (`3111b02f` `7b30037b` `0ebda502`) | stated | none |
| B5 | Abortion policy | 1 (`654a35d4`) | stated | none |
| B6 | Election integrity | 0 | no_stated_position_found | none |
| KYV1 | Threats to democratic institutions | 0 | no_stated_position_found | none |
| B7 | Crime policy, policing and courts | 8 (`4092ac2e` `279a407d` `84d79c9b` `e515153e` `aa882618` `4c5dd114` `1bd49aea` `d82ad9b4`) | stated | none |
| B8 | Climate and environment (national) | 3 (`1190bf2f` `ea130e22` `c747db52`) | stated | `005211ea` |
| KYV2 | Energy and utilities | 5 (`68e70ce2` `1190bf2f` `ea130e22` `c747db52` `9a52996d`) | stated | `47923aa7` |
| KYV3 | Growth, development and land conservation | 1 (`1190bf2f`) | stated | none |
| KYV4 | Storm resilience and flood protection | 2 (`8d557e7f` `ce95d983`) | stated | none |
| KYV5 | Water supply and drinking water | 0 | no_stated_position_found | none |
| KYV6 | Renters and evictions | 5 (`989b08bd` `ddb81e18` `778d3bea` `99a917e5` `281001d4`) | stated | `024dad02` |
| KYV7 | Homelessness | 0 | no_stated_position_found | none |
| KYV8 | Condominium and HOA costs | 0 | no_stated_position_found | none |

Summary:

- 16 issues have at least one passage that clears the threshold. These counts match
  the citation counts in `run.json.areas` exactly.
- 9 issues are 0 and are recorded as `no_stated_position_found`: A3, A4, A5, KYV9,
  B6, KYV1, KYV5, KYV7, KYV8.
- No passage below the gate is counted toward any issue.
- 52 passages clear the gate with no issue tag (`counts.states_policy` 102 minus
  `with_issue` 50). They include foreign policy, AI/tech, surveillance, campaign
  finance, taxation, child care and labor items. These are candidate-tier material,
  not spine silence.

### 5. Possible misses (information only, not a fix)

These passages are marked `states_policy: false` but appear to state a position on a
taxonomy issue:

| Id | Commitment | Issue score | First 20 words | Note |
|---|---|---|---|---|
| `c9c9db66` | 0.84 | B3 0.95 | "In full support of protestors, clergy, and others seeking reinstatement of TPs protections for Haitians, Rep. Angie Nixon sets the" | Possible miss. This press-release teaser, written by the campaign, states support for reinstating TPS for Haitians. It is just under the gate (0.84), and the text is truncated with "...". B3 already has 5 citations. |

Borderline passages (a stance, but no specific commitment), listed for completeness:

| Id | Commitment | Issue score | First 20 words |
|---|---|---|---|
| `005211ea` | 0.82 | B8 0.93 | "The climate crisis is an existential threat, and the fossil fuel industry has spent decades lying about it while cashing" |
| `024dad02` | 0.66 | A2 0.98 | "Rent is too high, homeownership is out of reach for millions, and Wall Street landlords are buying up housing stock" |

- `005211ea` ends "Angie rejects the false choice between good jobs and a livable planet."
- `024dad02` ends "Housing is a human right, not a speculative asset for the billionaire class."

No other passage below the gate states a commitment on a taxonomy issue. The rest
are biography, record, statistics, problem statements or press-release teasers.

VERDICT: FAIL (check 3)
