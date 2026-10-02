# Step 3 review: FL-DOE-88868 (Gus Michael Bilirakis), FL-12-general

Reviewer: Step 3, under the Profiler constitution. This is a read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory. I also read `run.log`, `run-report.txt`, `links.jsonl`, `ingest-report.md` and `attempt-1-one-gate/` for context. No website was fetched.

- Official site: https://bilirakisforcongress.com/
- Run under review: the two-gate re-run, `jev:jev-1.13.0/tax-7/q-e7282116`, threshold 0.85, status `complete`, created 2026-09-30T01:58:07Z.
  - 53 passages, all 53 asked, 0 failed.
  - 5 state a policy, and 4 of those match an issue.
  - A passage states a policy only when it clears both gates: `commitment` ≥ 0.85 and `own_commitment` ≥ 0.85 (`src/lib/policy-noul.ts`).
- Spine: undecided for this race.
  - Check 4 reports every taxonomy issue in `src/lib/news-issues.ts` (TAXONOMY_VERSION 7, 25 issues).
  - Check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | FAIL (dd27d7b2) |
| 4 | Silence recorded, not filled | PASS. 8 issues have passages over the threshold; 4 of them have a cited passage. 17 issues have 0. |
| 5 | Possible misses (information only) | 5 reported, 3 borderline |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the URL host of every passage and citation:
- All 53 passages in `run.json` have host `bilirakisforcongress.com`.
- So do all 53 rows in `passages.jsonl`.
- So do all 5 citation URLs in `run.json.areas`.

No other host appears. The passages come from three pages:

| Page | Passages |
|---|---|
| `/` | 30 |
| `/issues.html` | 19 |
| `/bio.html` | 4 |

`run.json.site` is `https://bilirakisforcongress.com`.

`ingest.log`:
- 39 links on the homepage, 8 of them judged by Jev.
- The policy page chosen was `/issues.html`, and the about page was `/bio.html`.
- The log has no redirect, robots, bot-challenge, browser or unreachable lines.

A log discrepancy, carried over from the one-gate review, that does not affect this check:
- `ingest.log` prints "6 passage(s)" for `/bio.html`, but `passages.jsonl` holds 4 from that page.
- The log has no per-page line for the homepage.
- The totals reconcile: 30 + 19 + 4 = 53, which matches the log's "53 passage(s)".

### 2. Quotes verbatim: PASS

A node script checked every passage in `run.json` against the passage with the same id in `passages.jsonl`:
- It compared the text as bytes, with `Buffer.from(text, "utf8").equals(...)`.
- It also checked that `url` and `heading` are equal.

Results:
- `passages.jsonl` has 53 rows with 53 unique ids. Every id is in both files.
- All 5 passages with `states_policy: true` are byte-identical and have a matching url and heading: dd27d7b2, ffa6d8e6, fc97e53c, 7cf4fac1 and 94b3a28b.
- All 5 citation copies in `run.json.areas` are byte-identical:
  - A4: 94b3a28b
  - B2: 94b3a28b and dd27d7b2
  - B3: 7cf4fac1
  - A1: fc97e53c
- All 53 passages in the file are identical too, with 0 mismatches.

Internal consistency holds for every passage:
- `states_policy` equals `commitment ≥ 0.85 && own_commitment ≥ 0.85`.
- `issues` is exactly the set of scores at or above 0.85.
- `counts` matches a recount: 5 state a policy, 4 with an issue.
- `areas` holds exactly the (issue, passage) pairs of the gated passages.

### 3. No inferred motive: FAIL

**Failing passage: record copy with no commitment, cited as a stated position**

- **dd27d7b2**
  - Page `/`, heading "Gus Is For Our Families".
  - Scores: commitment 0.86, own_commitment 0.90. Cited under **B2** at 0.92.
  - First 20 words (the whole passage is 10 words): "$2M to expand mental-health services at Federally Qualified Health Centers."

  This line comes from the homepage list of dollars the campaign says Gus delivered. It is past record. It has no verb and commits the candidate to nothing. The fuller `/issues.html` version of the same fact reads "Gus **secured** $2 million to expand mental-health services at FQHCs…" (84243712), and the run gates that version out (own_commitment 0.11).

  The second gate was added to reject exactly this kind of line, and this passage clears it at 0.90. `gate2-2026-09-30.md` names "$2M to expand …" as one of the genuine past-record lines that still pass.

  The passage is one of B2's two citations, so a Profiler would write it as a stated position on healthcare access. Without it, B2 has 1 cited passage (94b3a28b).

  The run gates out the other record items in the same list: 77dcd876, 9755b9b8, 611b889d, 0a7e5a91, 3a2b8aa8, 8fb8d10a and 5cfb035d.

**The other four policy passages each state a commitment by the candidate:**
- ffa6d8e6: "Working to pass the Major Richard Star Act for combat-injured veterans." No issue tag, so this is candidate-tier material.
- fc97e53c: "Taking on skyrocketing homeowners insurance with the Homeowners Premium Tax Reduction Act, up to a $10,000 above-the-line deduction."
- 7cf4fac1: "Securing the southern border to choke off cartels driving fentanyl into our communities."
- 94b3a28b: "…and continues to push affordability legislation that puts money back in working families' pockets, including ending taxation on Social Security, lowering prescription drug costs for seniors…". This passage opens with record ("Gus delivered…, championed…"). Claims written from it should rest on the "continues to push" clause.

**Change from the one-gate run.** The second gate removed three passages that the one-gate review listed as borderline:
- f9ec2552, a slogan: own_commitment 0.78.
- 5f4dcb3a, record and endorsement copy: 0.13.
- 18b8c4c5, where the border sentence is attributed to "Florida families": 0.78.

It still gates out all biography (f18e32f1, e186499b, 7b3eb710, 45833fe5).

It still gates out all record and credibility copy:
- 0576be9f, 454e310a, 26eae3da and d2d11ec6
- 8a36eb65, f373e9bd, bef51e0e and 84243712
- 2e1878ec

It still gates out all endorsement copy (5e31a103) and all fundraising, volunteer, sign and vote-by-mail copy (e511c593, 9cf98d3e, 79805f5a, d8a4dcce, 76cf2e29).

### 4. Silence recorded, not filled: PASS

For each taxonomy issue, a script counted the passages, out of all 53, whose `verdict.scores[issue]` is 0.85 or more.
- The "Cited" column counts the subset that also cleared both gates.
- Only cited passages appear in `run.json.areas`, so only they could become stated_position claims.
- An asterisk marks a cited passage. For uncited passages, c and oc give the two gate scores.

| Issue | Label | Passages ≥ 0.85 | Cited | Ids (score) |
|---|---|---|---|---|
| A1 | Property insurance costs | 3 | 1 | fc97e53c* (0.96), c29d9884 (0.91; c 0.78, oc 0.44), 7c5d0bee (0.97; oc 0.83) |
| A2 | Housing affordability | 2 | 0 | c29d9884 (0.93; oc 0.44), bb5c897d (0.98; oc 0.79) |
| A3 | Property taxes | 0 | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 2 | 1 | 94b3a28b* (0.90), c29d9884 (0.92; oc 0.44) |
| A5 | Water quality and Everglades restoration | 0 | 0 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | 0 | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 1 | 0 | 8af194d1 (0.89; c 0.70, oc 0.62) |
| B2 | Healthcare access and costs | 6 | 2 | dd27d7b2* (0.92), 94b3a28b* (0.94), 611b889d (0.90; c 0.70), 84243712 (0.85; c 0.38), 8a36eb65 (0.88; c 0.35), f373e9bd (0.88; c 0.30) |
| B3 | Immigration and border enforcement | 4 | 1 | 7cf4fac1* (0.97), bef51e0e (0.92; oc 0.08), 18b8c4c5 (0.92; oc 0.78), 5f4dcb3a (0.94; oc 0.13) |
| B4 | Social Security and Medicare | 1 | 0 | 30adcf1e (0.94; oc 0.74) |
| B5 | Abortion policy | 0 | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 2 | 0 | 087fbbd1 (0.93; c 0.71, oc 0.70), bef51e0e (0.91; oc 0.08) |
| B8 | Climate and environment (national) | 0 | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 1 | 0 | 7c5d0bee (0.87; oc 0.83) |
| KYV5 | Water supply and drinking water | 0 | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | 0 | no_stated_position_found |

- `run.json.areas` has entries only for A1, A4, B2 and B3. That matches the "Cited" column exactly.
- The run cites nothing for any issue with a count of 0, so no silence was filled.
- A2, B1, B4, B7 and KYV4 have passages over the threshold, but none cleared both gates. As the run stands, a Profiler would record each of them as `no_stated_position_found`.
- The B2 cited count of 2 includes dd27d7b2, the check 3 failure.
- ffa6d8e6 cleared both gates with no issue tag. The taxonomy has no veterans issue, so it is candidate-tier material.

**Coverage.** The ingest read three pages: the homepage, `/issues.html` and `/bio.html`. The 0 counts describe those three pages only.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but plainly state a commitment by the candidate on a taxonomy issue. Most were dropped by the new `own_commitment` gate, and each leaves an issue uncited.

| id | page | c / oc | issue scores | First 20 words |
|---|---|---|---|---|
| bb5c897d | / | 0.93 / 0.79 | A2 0.98 | "Fighting for affordable housing so families can afford to stay in the homes and neighborhoods they love." |
| 7c5d0bee | /issues.html | 0.97 / 0.83 | A1 0.97, KYV4 0.87 | "Gus filed the Homeowners Premium Tax Reduction Act , an above-the-line $10,000 tax deduction on homeowners insurance premiums for a" |
| c29d9884 | / | 0.78 / 0.44 | A1 0.91, A2 0.93, A4 0.92 | "Gus Bilirakis is delivering real results for Tampa Bay families: taking on skyrocketing property insurance, fighting for affordable housing, and" |
| 087fbbd1 | / | 0.71 / 0.70 | B7 0.93 | "Standing with Pasco Sheriff Chris Nocco's law-enforcement-first approach." |
| 2e1878ec | /issues.html | 0.36 / 0.10 | B2 0.70 | "Gus is leading the fight to expand the federal newborn-screening panel (two new conditions were added at HHS this year)" |

- **bb5c897d** is the site's plainest statement on housing. It cleared the gate in the one-gate run and fails the second gate at 0.79. A2 now has no cited passage.
- **7c5d0bee** goes on to say that Gus "is fighting for an Anclote River Basin study to attack the flooding driving repetitive-loss premiums". That is a present commitment on flood protection, and it is the only KYV4 passage. It also carries the filed Homeowners Premium Tax Reduction Act. It cleared the gate in the one-gate run and fails the second gate at 0.83.
- **c29d9884** names three ongoing efforts: "taking on skyrocketing property insurance, fighting for affordable housing, and working to lower the cost of living". It is the only other A2 passage.
- **087fbbd1** is the only passage on the site that states a stance on policing, so B7 has no cited passage. It was gated out in both runs.
- **2e1878ec** is a present commitment ("is leading the fight to expand") on children's health. It scored B2 at 0.70, below the threshold.

Borderline cases. These are record, an attributed aim or a slogan rather than a plain commitment, so they are not counted as misses:
- **30adcf1e** (c 0.95, oc 0.74, B4 0.94): "Co-sponsored legislation to eliminate taxes on Social Security."
  - This is a past act, but it shows a present stance on the only B4 passage.
  - It cleared the gate in the one-gate run. B4 now has no cited passage.
- **18b8c4c5** (c 0.87, oc 0.78, B3 0.92): "Florida families want a Washington that secures the border, lowers costs, and puts America First. That takes a representative who".
  - The border wording is attributed to "Florida families".
  - The candidate's own commitment is only to "stand with President Trump and fight to get his agenda across the finish line".
- **8af194d1** (c 0.70, oc 0.62, B1 0.89): "Lower costs, real tax relief, and a stronger recovery." This is a slogan fragment with no subject.

Commitments with no taxonomy issue are candidate-tier material, not spine misses:
- 88a93053, "Standing with our veterans, delivering healthcare, housing, and job opportunities." (c 0.85, oc 0.83)
- b82c35dd, "Working to empower parents with greater tools to keep kids safe online." (c 0.52, oc 0.77)

## Other observations (no effect on the verdict)

- **Effect of the second gate on this candidate.** It cut the policy passages from 12 to 5.
  - The three borderline one-gate passages are gone: f9ec2552, 5f4dcb3a and 18b8c4c5.
  - Four real commitments went with them: bb5c897d, 7c5d0bee, 30adcf1e and 88a93053.
  - The one passage the one-gate review failed, dd27d7b2, still passes.
  - Net effect: cited coverage fell from 7 issues (A1, A2, A4, B2, B3, B4, KYV4) to 4 (A1, A4, B2, B3), and the check 3 failure remains.
- **`ingest-report.md` is stale.** Its "Step 2: policy run (Jev)" section describes the one-gate run: `q-b2171346`, 12 state a policy, 9 with an issue, 185818 tokens in. That run is now in `attempt-1-one-gate/`. The current `run.json` is `q-e7282116`, with 5 and 4.
- **The ingest read 3 pages.** `/news.html`, `/videos.html`, `/vote.html`, `/take-action.html` and `/media.html` fell below the link threshold and were not read.

VERDICT: FAIL (check 3: dd27d7b2, the homepage record line "$2M to expand mental-health services at Federally Qualified Health Centers.", clears both gates, at commitment 0.86 and own_commitment 0.90, and is cited under B2 with no commitment by the candidate)
