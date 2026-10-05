# Step 3 review: FL-DOE-89801 (Scott Singer), FL-25-general

Reviewer: Step 3, under the Profiler constitution. Read-only review of `passages.jsonl`, `run.json` (`kyv.policy-run/1`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`, 58 of 58 asked, 0 failed) and `ingest.log`. Nothing was fetched from the web.

SPINE for this race is undecided, so check 4 counts every taxonomy issue in `src/lib/news-issues.ts` (25 sub-issues) and check 5 considers all of them.

## Summary

| # | Check | Result | Evidence (short) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 58 run passages (and all 58 in `passages.jsonl`) are on `www.scottsingerusa.com`. No other host. |
| 2 | Quotes verbatim | **PASS** | Script: 30 of 30 `states_policy` passages byte-identical to `passages.jsonl` by id (all 58 match; urls match too). |
| 3 | No inferred motive | **FAIL** | 2 passages marked as stating a policy are biography or mayoral record with no commitment: `b3ee0ff5`, `7d6a9bdc`. |
| 4 | Silence recorded, not filled | **PASS** | 7 issues have at least one passage over 0.85; the other 18 are 0 → `no_stated_position_found`. |
| 5 | Possible misses (information only) | reported | 3 passages marked no-policy that state a commitment: `2a00d913` (B1), `2ac9e9a7` (B7), `f9cdba78` (B7). |

## Evidence

### Check 1: candidate-controlled sources only (PASS)

Hosts of every passage url, counted by script:

| Host | run.json | passages.jsonl |
|---|---|---|
| www.scottsingerusa.com | 58 | 58 |

Pages: `/` (19), `/priorities` (33), `/about-scott-singer` (6). `links.jsonl` (the four links Jev judged) and the superseded `attempt-1-keywords/passages.jsonl` (52 passages) are also all on `www.scottsingerusa.com`. No other host and no redirect appear.

Side note, not a check failure: `ingest.log` prints "7 passage(s)" for `/about-scott-singer` and 33 for `/priorities`, while `passages.jsonl` holds 6 and 33 (and 19 for `/`), totalling the 58 the log reports. `ingest-report.md` gives 6. The counts per page in the log appear to be pre-deduplication; the total agrees.

### Check 2: quotes verbatim (PASS)

Checked with node (`Buffer.equals` on the UTF-8 bytes of `text`, joined by `id`), not by eye:

- `passages.jsonl`: 58 lines, 58 unique ids. `run.json`: 58 passages, same id set.
- 30 passages have `verdict.states_policy: true`; mismatches in `text`: **0**; mismatches in `url`: **0**.
- All 58 passages (policy or not) are byte-identical as well.

Internal consistency, also by script: every `states_policy` equals `commitment >= 0.85`, and for every policy passage the `issues` list equals the set of scores `>= 0.85`. `counts.with_issue` (16) matches the policy passages carrying at least one issue.

### Check 3: no inferred motive (FAIL)

Passages marked `states_policy: true` that are only biography or record, with no commitment by the candidate:

| id | Page | commitment / issues | First 20 words |
|---|---|---|---|
| `b3ee0ff5` | /about-scott-singer | 0.86 / B3 | "As the inaugural Chair of the America First Policy Institute Mayors’ Council, Scott leads of national group of mayors working" |
| `7d6a9bdc` | /priorities | 0.86 / A3 | "Scott’s core principles have always centered around keeping taxes low so that more money was in the pockets of American" |

- `b3ee0ff5` is a list of roles (AFPI Mayors’ Council chair, nonprofit roles) and past advocacy ("has been a strong voice against antisemitism, and an advocate for stronger national security that safeguards our borders"). It contains no statement of what the candidate will do or supports. Its B3 tag would place a biography passage under Immigration.
- `7d6a9bdc` is the Boca Raton property-tax voting record plus a present-tense statement of principle ("core principles have always centered around keeping taxes low"). There is no commitment about what he will do in Congress. It is one of the two policy passages behind A3 (Property taxes).

Both sit just over the gate (0.86). Neither is attack, fundraising or event copy.

Borderline, not counted as failures (each contains a commitment, but the reviewer notes them):

- `edb87f9a` (0.96, B3+B7): same biography as `b3ee0ff5`, plus "he will stand up to far-left proposals to abolish prisons and federal law enforcement or private health care". The commitment supports B7; the B3 tag rests on the biography sentence about borders.
- `021025a1` (0.95, A3): it has a commitment ("He will defend the U.S. Constitution and ensure unelected bureaucrats will not be able to impose their agendas"), but that commitment is not about property taxes; the A3 tag rests on the mayoral tax-rate record.
- `bc531e21` (0.88, no issue): mostly biography; the only commitment is "In Congress, he will work with President Trump to advance the America First agenda".
- `39f4cb7c` (0.97, no issue): "will oppose all actions of the radical left to institute debilitating socialist policies", which is a commitment framed as opposition to opponents.
- `d429568c` (0.92, no issue) "Scott Pledged to Keep Taxes Low and Has Delivered MORE →" and `33870894` (0.89, no issue) "Advance Free-Market Capitalism & Oppose Socialism MORE →" are homepage navigation link labels, not body copy. Neither carries an issue tag, so neither would reach a Position.

Also for the founder: `2b487cd1` (policy, B3) states "running to represent Florida’s 23rd district in Congress", while the homepage passage `f2d0e7b6` says "Florida’s 25th district". The quote is verbatim from the site; the reviewer does not adjudicate it, but the about page appears to carry older copy.

### Check 4: silence recorded, not filled (PASS)

"Clears the threshold" = the passage is marked `states_policy` (commitment ≥ 0.85) and its score for the issue is ≥ 0.85, which is what `groupByArea` (`src/lib/policy-noul.ts:209`) puts into a Position. The run also records issue tags on 8 passages that failed the gate; they are excluded from `areas` by design, and are shown in the last column for completeness only.

Issues with at least one passage over the threshold:

| Issue | Label | Count (policy passages) | Passage ids | Raw score ≥ 0.85 on non-policy passages (not in Positions) |
|---|---|---|---|---|
| B1 | Economy, inflation, and jobs | **7** | b0fca4b3, d62de5ef, 23d4f36b, fde88f10, cb165715, 79a88afa, d7cfc9cc | bcd6326b, 65df19b5, 2a00d913 |
| B3 | Immigration and border enforcement | **5** | b0fca4b3, edb87f9a, 8f207977, 2b487cd1, b3ee0ff5 | none |
| A3 | Property taxes | **2** | 7d6a9bdc, 021025a1 | b6dc65ec |
| B7 | Crime policy, policing and courts | **2** | edb87f9a, 57263530 | 08391f50, 3cb36f20, 2ac9e9a7, 61e91796 |
| A1 | Property insurance costs | **1** | be2957cf | none |
| KYV2 | Energy and utilities | **1** | fde88f10 | none |
| KYV10 | Career, vocational and higher education | **1** | 7dcbff9f (score exactly 0.85) | none |

If check 3's two flagged passages were removed, B3 would be 4 and A3 would be 1; no issue would drop to 0.

Issues with **0** passages over the threshold, each `no_stated_position_found`:

A2 Housing affordability · A4 Cost of living in Florida · A5 Water quality and Everglades restoration · A6 Public school funding and teachers · A7 Elections administration and voting access · KYV9 School choice and vouchers · B2 Healthcare access and costs · B4 Social Security and Medicare · B5 Abortion policy · B6 Election integrity · B8 Climate and environment (national) · KYV1 Threats to democratic institutions · KYV3 Growth, development and land conservation · KYV4 Storm resilience and flood protection · KYV5 Water supply and drinking water · KYV6 Renters and evictions · KYV7 Homelessness · KYV8 Condominium and HOA costs.

`run.json` `areas` matches this: economy (B1), education (KYV10), environment (KYV2), immigration (B3), insurance (A1, A3), safety (B7). No zero-count issue is filled.

14 policy passages carry no taxonomy issue (e.g. national defense, veterans, Israel, crypto, congressional stock trading, term limits, transportation/permitting). Under the constitution these are candidate-tier issues, not spine fills.

### Check 5: possible misses (information for the founder, not a fix)

Passages marked `states_policy: false` that state a commitment on a taxonomy issue:

| id | Page | commitment / top score | First 20 words |
|---|---|---|---|
| `2a00d913` | /priorities | 0.78 / B1 0.87 | "As our next congressman, Scott will work hand in hand with our local business leaders to build consensus on plans" |
| `2ac9e9a7` | /priorities | 0.84 / B7 0.93 | "Scott stands with our local law enforcement officers who have come under baseless attacks by the radical left in recent" |
| `f9cdba78` | /priorities | 0.74 / B7 0.78 | "As a father of two young children, Scott will keep making sure our neighborhoods and homes are safe. He also" |

- `2a00d913`: a forward commitment ("will work ... to build consensus on plans for sustained long-term financial growth").
- `2ac9e9a7`: a present-tense stance ("stands with our local law enforcement officers"). It is phrased like `9bb31405` ("Scott stands with our veterans"), which the run did mark as policy. Commitment 0.84 is just under the gate.
- `f9cdba78`: "will keep making sure our neighborhoods and homes are safe" and "wants to make sure our children are safe in cyberspace".

Considered and not listed: `08391f50` "Respect the Rule of Law & Stand with Law Enforcement MORE →" is a navigation label, not a plain statement by the candidate. `0279837f` "Committed to a Strong National Defense and Military" is also a navigation label, and national defense is not a taxonomy issue. Mayoral-record passages (`b6dc65ec`, `bcd6326b`, `65df19b5`, `3cb36f20`, `61e91796`, `ddf50040`, `d43a2df2`) describe past actions, not commitments.

VERDICT: FAIL (check 3)
