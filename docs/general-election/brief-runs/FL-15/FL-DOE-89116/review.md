# Step 3 review: FL-DOE-89116 (Robert People), FL-15-general

Reviewer: Step 3, under the Profiler constitution. Read-only apart from this file. No website was fetched.

Inputs: `passages.jsonl` (48 passages), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-e7282116`, created 2026-09-30T01:58:12Z, threshold 0.85, 48 asked, 0 failed, 15 `states_policy`, 5 with an issue), and `ingest.log`. I also read `run-report.txt`, `run.log`, `ingest-report.md` and `src/lib/policy-run.ts` / `src/lib/policy-noul.ts` for context.

This run uses both gates: `states_policy` is `commitment >= 0.85` **and** `own_commitment >= 0.85` (`readVerdict`, `src/lib/policy-noul.ts`). A script confirmed that all 48 verdicts in `run.json` follow that rule, and that every `issues` array equals the set of scores ≥ 0.85. There were 0 inconsistencies.

SPINE: undecided for this race. Check 4 covers all 25 taxonomy sub-issues in `src/lib/news-issues.ts` (A1–A7, B1–B8, KYV1–KYV10), which are the same 25 keys as `scores` in `run.json`. Check 5 considers all of them.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (checked by script) | **PASS** |
| 3 | No inferred motive | **PASS** (2 borderline passages noted) |
| 4 | Silence recorded, not filled | **PASS** (counts below) |
| 5 | Possible misses (information only) | 3 possible misses, plus 1 borderline |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` and `passages.jsonl` with `new URL()`. All 48 passages in each file are on host `www.peopleforcongress.com`, which is the OFFICIAL_SITE host. No other host appears, and no redirect was involved.

| URL | Passages |
|---|---|
| https://www.peopleforcongress.com/ | 15 |
| https://www.peopleforcongress.com/general-7 ("MY PLATFORM") | 28 |
| https://www.peopleforcongress.com/about-8 ("ENDORSE ROBERT", used as the about page) | 5 |

Note: passage `463fcb03` quotes `http://pgpf.org` inside the candidate's own sentence. That is the campaign citing a figure. The run did not fetch pgpf.org. Any claim built from this passage should be attributed to the campaign website and should not name pgpf.org as a source.

### 2. Quotes verbatim: PASS

A node script took each of the 15 passages where `verdict.states_policy === true`, found the passage with the same `id` in `passages.jsonl`, and compared the two `text` fields byte for byte with `Buffer.compare` on UTF-8. It also checked that the `url` values match.

- Mismatches among the 15 policy passages: **0**, for both text and url.
- The same comparison across all 48 passages: **0** mismatches. All 48 ids are unique, and every id appears in both files.
- Leading zero-width and non-breaking characters (for example at the start of `98ca5d20`) are identical in both files.

Ids checked: fbc2a460, 867c9e0f, 4c6749c3, 7da96735, aae55d13, 98ca5d20, 9b81c1a3, 60927668, 5f9b5117, f4b16645, 7ca7a538, 463fcb03, 8023e9c8, 49ba4d4c, 27280e19.

### 3. No inferred motive: PASS

I read all 15 passages marked `states_policy: true`. Each one carries a commitment or stance by the candidate, such as "Robert will…", "Robert will NOT…", "Robert would like to…", "Robert is looking to support or put forth legislation…", or "his goal here would be to propose legislation…". None is only biography, only an attack on an opponent, only fundraising, or only event copy. All 15 biography, army and closing passages on the homepage (`8fb65c64`, `88d9c055`, `75741f83` through `2e50febd`) and all 5 endorsement and fundraising passages on `/about-8` are marked `states_policy: false`.

Two borderline passages are listed here for the founder. Neither is a violation:

- `fbc2a460` (commitment 0.96, own 0.89; tagged A7, B2, B4, KYV2, KYV3): "Robert speaks with members of the American Postal Workers Union about his priorities, including protecting Social Security, Medicare for All,". This is a photo or event caption. It still names the candidate's priorities, so it is more than event copy. It is the **only** passage behind A7 ("Vote by Mail"), KYV3 ("opposing data centers when communities don't want them") and KYV2 (score exactly 0.85, on the same list). Each of those three issues rests on one item in a list. A claim built from it should say "the campaign website lists … among his priorities" and nothing more.
- `7da96735` (commitment 0.93, own 0.89; no issue): "NO AIPAC Contributions and NO Further Arms to Israel". This is a section heading captured as a passage. The commitment itself is stated in full in `aae55d13`, which follows it. It maps to no taxonomy issue.

Several policy passages use the campaign's own charged wording: `4c6749c3` ("whoever is benefiting … needs to be held accountable"), `98ca5d20` ("GENOCIDE"), and `f4b16645` and `7ca7a538` ("horrible, ugly bill"). The passages are verbatim, and the wording is the candidate's framing. Any claim must quote it or attribute it to the campaign, never restate it in the brief's voice.

### 4. Silence recorded, not filled: PASS

A passage counts as a stated position on an issue only if it clears both gates (`states_policy`) **and** scores ≥ 0.85 on that issue. `run-report.txt` and `run.json` `areas` publish on the same rule. The table lists every taxonomy issue with at least one passage over the threshold on its issue score:

| Issue | Label | Stated-position passages (gates and issue ≥ 0.85) | Ids | Issue ≥ 0.85 but a gate failed (not a stated position) | Coverage |
|---|---|---|---|---|---|
| A4 | Cost of living in Florida | **0** | — | 292ca1d7 (0.95) | no_stated_position_found |
| A6 | Public school funding and teachers | **1** | 8023e9c8 | bf8ae8df (0.98) | stated |
| A7 | Elections administration and voting access | **1** | fbc2a460 | — | stated |
| B1 | Economy, inflation, and jobs | **1** | 8023e9c8 | 292ca1d7 (0.85) | stated |
| B2 | Healthcare access and costs | **3** | fbc2a460, 4c6749c3, f4b16645 | — | stated |
| B3 | Immigration and border enforcement | **0** | — | 49e85e80 (0.97), 1021e7c2 (0.92) | no_stated_position_found |
| B4 | Social Security and Medicare | **2** | fbc2a460, 463fcb03 | — | stated |
| B8 | Climate and environment (national) | **0** | — | a4848c83 (0.90) | no_stated_position_found |
| KYV2 | Energy and utilities | **1** | fbc2a460 | 292ca1d7 (0.89) | stated |
| KYV3 | Growth, development and land conservation | **1** | fbc2a460 | — | stated |

The other 15 taxonomy issues have **0** passages over the threshold on any score: A1, A2, A3, A5, B5, B6, B7, KYV1, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9 and KYV10. Each of them is `no_stated_position_found`.

These counts match `run-report.txt` and `run.json` `areas`, which list A6 (1), A7 (1), B1 (1), B2 (3), B4 (2), KYV2 (1) and KYV3 (1), and nothing for A4, B3 or B8. `counts.with_issue` is 5 (fbc2a460, 4c6749c3, f4b16645, 463fcb03, 8023e9c8), which matches. Nothing was filled in to cover a gap.

Note: `verdict.issues` is also populated on passages that failed a gate (292ca1d7, a4848c83, 49e85e80, 1021e7c2, bf8ae8df). The run's grouped output ignores those tags, which is correct. Any downstream consumer that reads `verdict.issues` directly must also check `states_policy`.

### 5. Possible misses (information only, not a fix)

These are passages the run marks `states_policy: false` that state a commitment on a taxonomy issue. All of them fail the second gate (`own_commitment`), not the first. Together they are why B3 is now 0 (it was 2 in the one-gate attempt in `attempt-1-one-gate/`) and A6 is 1.

- `1021e7c2` (B3 0.92; commitment 0.87, own 0.84, just under the threshold): "Also, there seems to be unnecessary confusion on due process, as Robert will also push that immigrants have better protection". This is a "Robert will…" commitment on immigration.
- `49e85e80` (B3 0.97; commitment 0.93, own 0.37): "There needs to be a much better and clearer path to citizenship that does not involve immigrants who are doing". This stance on immigration appears on the candidate's own platform page but is worded impersonally, without "Robert will".
- `bf8ae8df` (A6 0.98; commitment 0.93, own 0.62): "When annual budgets are established, teacher salaries need to be at the TOP of the list. Except for emergency issues,". This is a stance on teacher pay under the platform heading "Increasing Teacher Salaries", also worded impersonally.

Borderline, not counted as a miss:

- `b7da95ca` (B4 0.76; commitment 0.73, own 0.80): "We must make sure we keep the Social Security conversation on the table, and Robert pledges to keep the discussion". This pledges to keep discussing the issue, not to adopt a policy position.

Considered and not listed as misses: `292ca1d7` is context and criticism of the administration with no commitment. `a4848c83` ("Please read below for Robert's policies on lowering utility costs, expanding clean energy investments, restoring Environmental Protection Agency (EPA) standards,") only points to policies. `5f69fb07` ("Robert will always speak up against this war…") is a commitment, but on a subject with no taxonomy issue.

Ingest observation for the founder: `a4848c83` says Robert's policies on utility costs, clean energy, EPA standards and FEMA programs appear "below". None of the 28 `/general-7` passages contains that text. The energy and environment section may not have been captured, for example if it sits behind a collapsed "Read More Here" block. I could not check this without fetching the site, which this review does not do.

### Other observations

- `ingest-report.md`'s "Step 2: policy run" table is stale. It shows `q-b2171346`, 19 `states_policy` and 8 with an issue, which are the one-gate attempt's numbers. The current `run.json` / `run.log` show `q-e7282116`, 15 and 5.
- `ingest.log` prints per-page lines only for `/general-7` (28) and `/about-8` (5). The homepage's 15 passages make up the rest of the 48 and appear in `ingest-report.md`.
- 10 passages clear both gates but match no taxonomy issue: 867c9e0f, 7da96735, aae55d13, 98ca5d20, 9b81c1a3, 60927668, 5f9b5117, 7ca7a538, 49ba4d4c, 27280e19. Under the constitution these are candidate-tier issues (stock trading, AIPAC and Israel, school meals, food banks, women's health, the 2025 bill, LGBTQ+ protections). None of their issue scores reaches 0.85.

VERDICT: PASS
