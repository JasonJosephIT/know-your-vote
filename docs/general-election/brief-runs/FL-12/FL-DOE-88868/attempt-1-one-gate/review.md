# Step 3 review: FL-DOE-88868 (Gus Michael Bilirakis), FL-12-general

Reviewer: Step 3, under the Profiler constitution. This is a read-only review of `run.json`, `passages.jsonl` and `ingest.log` in this directory, with `run.log`, `run-report.txt`, `links.jsonl` and `ingest-report.md` read for context. No website was fetched.

- Official site: https://bilirakisforcongress.com/
- Run: `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, status `complete`. 53 passages, 53 asked, 12 state a policy, 9 of those with an issue, 0 failed.
- Spine: undecided for this race. Check 4 reports every taxonomy issue in `src/lib/news-issues.ts` (tax-7, 25 issues). Check 5 considers every taxonomy issue.

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (script-checked) | PASS |
| 3 | No inferred motive | FAIL (1 passage: dd27d7b2. 3 borderline passages noted) |
| 4 | Silence recorded, not filled | PASS (9 issues have passages over the threshold, 16 have 0) |
| 5 | Possible misses (information only) | 3 reported, 4 borderline |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed the host of every url. All 53 passages in `run.json` have host `bilirakisforcongress.com`. So do all 53 rows in `passages.jsonl` and all 12 citation urls in `run.json.areas`. No other host appears. The pages are `/` (30 passages), `/issues.html` (19) and `/bio.html` (4). `run.json.site` is `https://bilirakisforcongress.com`.

`ingest.log`: 39 links on the homepage and 8 judged by Jev. One policy page was chosen (`/issues.html`), and the about page was `/bio.html`. The log has no redirect, robots, bot-challenge, browser or unreachable lines, and no redirect off the host.

A minor log discrepancy, which does not affect this check: `ingest.log` prints "6 passage(s)" for `/bio.html`, but `passages.jsonl` holds 4 from that page. `ingest-report.md` also says 4. The log does not print a per-page line for the homepage. The totals reconcile: 30 + 19 + 4 = 53, the "53 passage(s)" in the log. The simplest explanation is that the ingest dropped 2 bio passages that repeat homepage copy, but this review did not verify that.

### 2. Quotes verbatim: PASS

A node script compared `Buffer.from(text, "utf8")` for each passage in `run.json` with the passage of the same id in `passages.jsonl`. It also compared `url` and `heading` for equality.

- `passages.jsonl` has 53 rows, 53 unique ids and no duplicates. Every id is present in both files.
- All 12 passages with `states_policy: true` are byte-identical, with matching url and heading: f9ec2552, dd27d7b2, 88a93053, ffa6d8e6, fc97e53c, bb5c897d, 30adcf1e, 7cf4fac1, 94b3a28b, 7c5d0bee, 18b8c4c5, 5f4dcb3a.
- All 12 citation copies in `run.json.areas` are byte-identical: A4 (94b3a28b), B2 (94b3a28b, dd27d7b2), A2 (bb5c897d), KYV4 (7c5d0bee), B3 (7cf4fac1, 5f4dcb3a, 18b8c4c5), A1 (7c5d0bee, fc97e53c, 94b3a28b) and B4 (30adcf1e).
- All 53 passages are also identical. Mismatches: 0.
- Internal consistency holds for every passage: `states_policy == (commitment >= 0.85)`, and `issues` is exactly the set of scores at or above 0.85. `counts` match a recount (12 state a policy, 9 with an issue).

### 3. No inferred motive: FAIL

**Failing passage: record copy with no commitment, cited as a stated position**

- **dd27d7b2** (`/`, heading "Gus Is For Our Families", commitment 0.85, cited under **B2** at 0.92). All 11 words: "$2M to expand mental-health services at Federally Qualified Health Centers."

  This is a line from the homepage list of record items: dollars the campaign says Gus delivered. It has no verb and no commitment by the candidate. It is record copy (biography of service), not a stated position. The run gated out every other item of the same kind:
  - 77dcd876, "$4 million for Moffitt…" (0.68)
  - 9755b9b8, "Magnolia Oaks Veterans Housing & Vincent House Pasco, federal dollars Gus delivered." (0.11)
  - 3a2b8aa8, "$6,000 senior tax exemption locked in…" (0.40)
  - 8fb8d10a, "$585M in federal disaster-recovery dollars…" (0.10)
  - 5cfb035d, "$3M in school-safety funding…" (0.59)
  - 84243712, the fuller `/issues.html` version of the same fact, "Gus secured $2 million to expand mental-health services at FQHCs…" (0.41)

  dd27d7b2 sits exactly on the gate (0.85). Because it passed, it is one of the two B2 citations in `areas`, so a Profiler would write it as a stated position on healthcare access. Without it, B2 has 1 cited passage (94b3a28b).

**Borderline passages (they pass, but are listed for the founder)**

All three carry some stance, and none is only biography, an attack on an opponent, fundraising or event copy. Two of them sit exactly on the 0.85 gate.

- **f9ec2552** (`/`, "Families. Future. Freedom.", commitment 0.85, no issue tag). First 20 words: "Three pillars. One promise. Gus shows up, gets results, and fights to lower the cost of living, because Gus Is". This is a campaign tagline. Its only content is the general aim "fights to lower the cost of living", which is the same wording the run gated out in the re-elect copy of d8a4dcce (0.41) and 76cf2e29 (0.54). It has no issue tag (A4 is 0.68), so it adds no spine claim. It is one of the three "state a policy the taxonomy has no question for".
- **5f4dcb3a** (`/issues.html`, "Supporting the Trump Agenda", commitment 0.85, B3 0.94). First 20 words: "Gus is a proven partner for the America First agenda, voting to secure the border, cut taxes for working families". This is record and endorsement copy ("…the record that earned him President Trump's full support"). It passes because it gives a voting record on the border and a present alignment with an agenda.
- **18b8c4c5** (`/issues.html`, "Supporting the Trump Agenda", commitment 0.87, B3 0.93). First 20 words: "Florida families want a Washington that secures the border, lowers costs, and puts America First. That takes a representative who". The border sentence is attributed to "Florida families", not the candidate. The candidate's commitment is only the implicit "a representative who will stand with President Trump and fight to get his agenda across the finish line". Any claim written from it must attribute that framing to the campaign website. It must not state that the candidate commits to a specific border measure.

The other SP passages carry a commitment or a stated legislative stance:
- fc97e53c: Homeowners Premium Tax Reduction Act.
- bb5c897d: "Fighting for affordable housing…".
- 30adcf1e: co-sponsored legislation to eliminate taxes on Social Security.
- 7cf4fac1: "Securing the southern border…".
- 94b3a28b: "continues to push affordability legislation…".
- 7c5d0bee: filed the Act, and "is fighting for an Anclote River Basin study".
- ffa6d8e6: "Working to pass the Major Richard Star Act…".
- 88a93053: "Standing with our veterans…", general.

The run correctly gated out the rest of the site's non-policy copy:
- Biography: f18e32f1, e186499b, 7b3eb710, 45833fe5.
- Record and credibility copy: 0576be9f, 454e310a, 26eae3da, d2d11ec6, 8a36eb65, f373e9bd.
- Endorsement: 5e31a103.
- Fundraising, volunteer, sign and vote-by-mail asks: e511c593, 9cf98d3e, 79805f5a, d8a4dcce, 76cf2e29.

### 4. Silence recorded, not filled: PASS

For each taxonomy issue, a script counted the passages whose `verdict.scores[issue]` is 0.85 or more, over all 53 passages. The "cited" column counts the subset that also passed the policy gate. Only those appear in `run.json.areas`, and so only those could become stated_position claims. An asterisk marks a cited passage.

| Issue | Label | Passages ≥ 0.85 | Cited (in `areas`) | Ids (score) |
|---|---|---|---|---|
| A1 | Property insurance costs | 4 | 3 | c29d9884 (0.90), fc97e53c* (0.96), 94b3a28b* (0.85), 7c5d0bee* (0.97) |
| A2 | Housing affordability | 2 | 1 | c29d9884 (0.94), bb5c897d* (0.98) |
| A3 | Property taxes | 0 | 0 | no_stated_position_found |
| A4 | Cost of living in Florida | 2 | 1 | c29d9884 (0.91), 94b3a28b* (0.90) |
| A5 | Water quality and Everglades restoration | 0 | 0 | no_stated_position_found |
| A6 | Public school funding and teachers | 0 | 0 | no_stated_position_found |
| KYV9 | School choice and vouchers | 0 | 0 | no_stated_position_found |
| KYV10 | Career, vocational and higher education | 0 | 0 | no_stated_position_found |
| A7 | Elections administration and voting access | 0 | 0 | no_stated_position_found |
| B1 | Economy, inflation, and jobs | 1 | 0 | 8af194d1 (0.90), gated out (commitment 0.71) |
| B2 | Healthcare access and costs | 6 | 2 | dd27d7b2* (0.92), 611b889d (0.90), 94b3a28b* (0.94), 84243712 (0.85), 8a36eb65 (0.88), f373e9bd (0.87) |
| B3 | Immigration and border enforcement | 4 | 3 | 7cf4fac1* (0.97), bef51e0e (0.93), 18b8c4c5* (0.93), 5f4dcb3a* (0.94) |
| B4 | Social Security and Medicare | 1 | 1 | 30adcf1e* (0.94) |
| B5 | Abortion policy | 0 | 0 | no_stated_position_found |
| B6 | Election integrity | 0 | 0 | no_stated_position_found |
| KYV1 | Threats to democratic institutions | 0 | 0 | no_stated_position_found |
| B7 | Crime policy, policing and courts | 2 | 0 | 087fbbd1 (0.93), bef51e0e (0.90), both gated out (0.71, 0.64) |
| B8 | Climate and environment (national) | 0 | 0 | no_stated_position_found |
| KYV2 | Energy and utilities | 0 | 0 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | 0 | 0 | no_stated_position_found |
| KYV4 | Storm resilience and flood protection | 1 | 1 | 7c5d0bee* (0.86) |
| KYV5 | Water supply and drinking water | 0 | 0 | no_stated_position_found |
| KYV6 | Renters and evictions | 0 | 0 | no_stated_position_found |
| KYV7 | Homelessness | 0 | 0 | no_stated_position_found |
| KYV8 | Condominium and HOA costs | 0 | 0 | no_stated_position_found |

`run.json.areas` has entries only for A1, A2, A4, B2, B3, B4 and KYV4. That matches the "cited" column exactly. The run cites nothing for any issue at 0, so no silence was filled. B1 and B7 have passages over the threshold, but none passed the gate. As the run stands they carry no stated_position claim, and without one a Profiler would record them as `no_stated_position_found`. The B2 cited count of 2 includes dd27d7b2, the check 3 failure.

The three passages that passed the gate with no issue are f9ec2552 (slogan, see check 3), 88a93053 (veterans: healthcare, housing, jobs) and ffa6d8e6 (Major Richard Star Act). The taxonomy has no veterans issue. Under the constitution, 88a93053 and ffa6d8e6 are candidate-tier material, not spine hits, and the run did not force them onto B2 (0.72 and 0.38).

Coverage note: the ingest read three pages (the homepage, `/issues.html` and `/bio.html`). `/news.html`, `/videos.html`, `/vote.html`, `/take-action.html` and `/media.html` were judged below the link threshold and not read. The 0 counts describe these three pages only.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but plainly state a commitment on a taxonomy issue:

| id | page | commitment | issue scores | First 20 words |
|---|---|---|---|---|
| c29d9884 | / | 0.73 | A1 0.90, A2 0.94, A4 0.91 | "Gus Bilirakis is delivering real results for Tampa Bay families: taking on skyrocketing property insurance, fighting for affordable housing, and" |
| 087fbbd1 | / | 0.71 | B7 0.93 | "Standing with Pasco Sheriff Chris Nocco's law-enforcement-first approach." (9 words) |
| 2e1878ec | /issues.html | 0.41 | B2 0.70 | "Gus is leading the fight to expand the federal newborn-screening panel (two new conditions were added at HHS this year)" |

- c29d9884 names three ongoing efforts, on property insurance, affordable housing and the cost of living. All three issues score above the threshold. The same stances pass the gate elsewhere (bb5c897d, fc97e53c, 94b3a28b), so missing it changes no issue's coverage.
- 087fbbd1 is the only passage on the site that states a stance on policing. Because it was gated out, B7 has no cited passage.
- 2e1878ec is a present commitment ("is leading the fight to expand") on children's health. It scored B2 at 0.70, below the threshold.

Borderline cases. These are aims or record rather than a plain commitment, so they are not counted as misses:

- 8af194d1 (0.71, B1 0.90): "Lower costs, real tax relief, and a stronger recovery." A slogan fragment with no subject or action.
- bef51e0e (0.64, B3 0.93, B7 0.90): "Gus secured the wall to choke off the cartels driving human and drug trafficking, passed the Take It Down Act". This is a record of votes and actions. By the same reading that passes 30adcf1e and 5f4dcb3a, a voting record is a stance, so this passage and 5f4dcb3a are treated inconsistently.
- 611b889d (0.71, B2 0.90): "EASE Act, extending telehealth access for seniors." This record line is the same kind as dd27d7b2, and consistent with check 3 it is correctly gated out.
- b82c35dd (0.56): "Working to empower parents with greater tools to keep kids safe online." This is a commitment, but no taxonomy issue scores above 0.05, so it is candidate-tier material, not a spine miss.

## Other observations (no effect on the verdict)

- Three of the 12 policy passages sit exactly on the gate at 0.85: dd27d7b2, f9ec2552 and 5f4dcb3a. Two of them are the weakest items in check 3. The gated-out c29d9884 (0.73) and 087fbbd1 (0.71) carry clearer commitments than those three.
- `attempt-1-keywords/` holds an earlier keyword-crawl ingest (49 passages from 2 pages, per `ingest-report.md`). It is not part of the run under review.

VERDICT: FAIL (check 3: dd27d7b2, homepage record line "$2M to expand mental-health services at Federally Qualified Health Centers." marked as stating a policy at commitment 0.85 and cited under B2, with no commitment by the candidate)
