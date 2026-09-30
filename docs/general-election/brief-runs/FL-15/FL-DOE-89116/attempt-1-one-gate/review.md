# Step 3 review: FL-DOE-89116 (Robert People), FL-15-general

Reviewer: Step 3, under the Profiler constitution. Read-only apart from this file. No website was fetched.

Inputs: `passages.jsonl` (48 passages), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85, 48 asked, 0 failed, 19 `states_policy`, 8 with an issue), `ingest.log`. `run-report.txt`, `ingest-report.md` and `links.jsonl` were read for context only.

SPINE: undecided for this race. Check 4 covers every taxonomy sub-issue (A1–A7, B1–B8, KYV1–KYV10; 25 in all, the same 25 keys as `scores` in `run.json`), and check 5 considers all of them.

"Clears the threshold" means score ≥ 0.85, the `>=` comparison in `readVerdict` / `applyThreshold` (`src/lib/policy-noul.ts`, `src/lib/news-characterize.ts`).

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** |
| 2 | Quotes verbatim (checked by script) | **PASS** |
| 3 | No inferred motive (no non-commitment passage marked as policy) | **PASS** (2 borderline passages noted) |
| 4 | Silence recorded, not filled | **PASS** (counts below; 1 schema observation) |
| 5 | Possible misses (information only) | 2 possible misses reported |

## Evidence

### 1. Candidate-controlled sources only: PASS

A node script parsed every `url` in `run.json` and `passages.jsonl` with `new URL()`. All 48 passages in both files are on host `www.peopleforcongress.com`, which is the OFFICIAL_SITE host. No other host appears.

| URL | Passages |
|---|---|
| https://www.peopleforcongress.com/ | 15 |
| https://www.peopleforcongress.com/general-7 ("MY PLATFORM") | 28 |
| https://www.peopleforcongress.com/about-8 ("ENDORSE ROBERT", used as the about page) | 5 |

No redirect was involved. `ingest.log` and `ingest-report.md` list only these three pages, and there are no robots, bot-challenge or unreachable lines.

Note: the text of passage `463fcb03` mentions `http://pgpf.org` inside the candidate's own sentence ("According to http://pgpf.org , in 2025, the Social Security tax cap…"). This is the candidate citing a figure, not a source the run fetched. The passage URL is on the official host. Any claim built from it should be attributed to the campaign website ("The campaign website states…") and should not treat pgpf.org as a source.

### 2. Quotes verbatim: PASS

A node script took each of the 19 passages where `verdict.states_policy === true`, looked up the passage with the same `id` in `passages.jsonl`, and compared the two `text` fields with `Buffer.compare` on their UTF-8 bytes. It also checked that the `url` values are equal.

- Mismatches among the 19 policy passages: **0** (text and url).
- The same comparison over all 48 passages: **0** mismatches. Ids are unique (48 of 48), and none is missing from either file.

The 19 ids checked: fbc2a460, 867c9e0f, e279c2c5, 4c6749c3, 7da96735, aae55d13, 98ca5d20, 9b81c1a3, 60927668, 5f9b5117, 49e85e80, 1021e7c2, f4b16645, 7ca7a538, 463fcb03, 8023e9c8, bf8ae8df, 49ba4d4c, 27280e19.

### 3. No inferred motive: PASS

I read each of the 19 passages marked `states_policy: true`. Every one contains a commitment or stance by the candidate: "Robert will…", "Robert will NOT…", "Robert would like to…", "his goal here would be to propose legislation…", or a direct policy statement ("There needs to be a much better and clearer path to citizenship…"). None is only biography, only an attack on an opponent, only fundraising, or only event copy.

All 15 biography passages on the homepage (`75741f83` through `2e50febd`) and all 5 endorsement and fundraising passages on `/about-8` are marked `states_policy: false`.

Two borderline passages are worth the founder's attention. Neither is a violation:

- `fbc2a460` (commitment 0.95; tagged A7, B2, B4, KYV3): "Robert speaks with members of the American Postal Workers Union about his priorities, including protecting Social Security, Medicare for All, Vote…" This is an event caption, but it names the candidate's priorities, so it is not event copy only. It is the **only** passage behind A7 ("Vote by Mail") and KYV3 ("opposing data centers when communities don't want them"). Each of those rests on a single item in a list. Any claim built from it should say "the campaign website lists … among his priorities" and go no further.
- `e279c2c5` (commitment 0.88; no issue): "This will also prevent insider trading, which will stop lawmakers from having non-public, market-moving information before the general public. Members of…" This is the stated rationale for the stock-trading ban in `867c9e0f`, not a new commitment. It carries no taxonomy issue, so it files under no spine issue.

Several policy passages (`4c6749c3`, `98ca5d20`, `f4b16645`, `7ca7a538`, `e279c2c5`) also contain the campaign's own charged wording ("GENOCIDE", "horrible, ugly bill", "whoever is benefiting … needs to be held accountable"). This is the candidate's framing, and the passages are verbatim. Any claim must quote or attribute that wording to the campaign, never restate it in the brief's own voice.

### 4. Silence recorded, not filled: PASS

A passage counts toward an issue as a stated position only if it clears the gate (`states_policy`, commitment ≥ 0.85) **and** its issue score is ≥ 0.85. That is the rule `run-report.txt` publishes by. Every taxonomy issue with at least one passage over the threshold is listed below:

| Issue | Label | Stated-position passages (gate and issue ≥ 0.85) | Ids | Issue ≥ 0.85 but gate failed (not a stated position) | Coverage |
|---|---|---|---|---|---|
| A4 | Cost of living in Florida | **0** | — | 292ca1d7 | no_stated_position_found |
| A6 | Public school funding and teachers | **2** | 8023e9c8, bf8ae8df | — | stated |
| A7 | Elections administration and voting access | **1** | fbc2a460 | — | stated |
| B1 | Economy, inflation, and jobs | **1** | 8023e9c8 | 292ca1d7 | stated |
| B2 | Healthcare access and costs | **3** | fbc2a460, 4c6749c3, f4b16645 | — | stated |
| B3 | Immigration and border enforcement | **2** | 49e85e80, 1021e7c2 | — | stated |
| B4 | Social Security and Medicare | **3** | fbc2a460, 4c6749c3, 463fcb03 | — | stated |
| B8 | Climate and environment (national) | **0** | — | a4848c83 | no_stated_position_found |
| KYV2 | Energy and utilities | **0** | — | 292ca1d7 | no_stated_position_found |
| KYV3 | Growth, development and land conservation | **1** | fbc2a460 | — | stated |

Every other taxonomy issue has **0** passages over the threshold on any score: A1, A2, A3, A5, B5, B6, B7, KYV1, KYV4, KYV5, KYV6, KYV7, KYV8, KYV9 and KYV10. Each of those is `no_stated_position_found`.

The counts match `run-report.txt`, which prints A6 (2), B1 (1), B2 (3), B3 (2), B4 (3), KYV3 (1) and A7 (1). It prints nothing for A4, B8 or KYV2. `counts.with_issue` is 8, which matches the distinct gated passages above.

Schema observation (not a failure of this run's output): in `run.json`, `verdict.issues` is filled even when `states_policy` is false. `readVerdict` in `src/lib/policy-noul.ts` applies the issue threshold without regard to the gate. Two gate-failed passages carry issue tags:

- `292ca1d7`: commitment 0.18, `issues: [A4, B1, KYV2]`. This is an attack on the Trump administration plus cost statistics, with no commitment.
- `a4848c83`: commitment 0.51, `issues: [B8]`.

The printed report correctly leaves both out. But any downstream consumer that reads `run.json` and files by `issues` without also checking `states_policy` would put an attack passage under A4, B1 and KYV2. That would break rules 1 and 3. Consumers must filter on `states_policy === true` first.

### 5. Possible misses (information for the founder, not a fix)

These passages are marked `states_policy: false` but state a commitment on a taxonomy issue:

- `a4848c83` (commitment 0.51; B8 0.90, KYV2 0.82): "Please read below for Robert's policies on lowering utility costs, expanding clean energy investments, restoring Environmental Protection Agency (EPA) standards, and restoring…" (continues "…Federal Emergency Management Agency (FEMA) programs."). This names policy directions on KYV2, B8 and, through FEMA, possibly KYV4. However, it only points to "policies … below", and none of the 48 passages contains those policies. The platform text on utilities, clean energy, EPA and FEMA was not captured by the ingest. This is a coverage gap as much as a gate miss.
- `b7da95ca` (commitment 0.73; B4 0.74): "We must make sure we keep the Social Security conversation on the table, and Robert pledges to keep the discussion going. Our citizens…" This is an explicit pledge on B4, though a weak one (to keep a discussion going, not a policy). B4 already has 3 stated-position passages, so the issue's coverage does not change.

Out of taxonomy scope, listed for completeness only: `5f69fb07` (commitment 0.84) "…Robert will always speak up against this war and the senseless killing of the people of Palestine." This is a commitment, but on foreign policy, which has no taxonomy issue. Its sibling passages `aae55d13` and `98ca5d20` already cleared the gate with no issue. Other policy passages the taxonomy has no question for (stock-trading ban, AIPAC and Israel arms, school meals and food banks, women's health, LGBTQ+ protections) would be candidate-tier issues under the constitution. They are not spine gaps.

VERDICT: PASS
