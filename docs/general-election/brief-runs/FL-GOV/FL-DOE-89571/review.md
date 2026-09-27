# Profiler review: FL-DOE-89571 (Frank J. Russo, FL-GOV-general)

- Official site: https://russo2026.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 199 passages, 199 asked, 78 state a policy, 46 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. Checks 1, 2 and 4 were run with a node script over `run.json` and `passages.jsonl`, not by eye. Checks 3 and 5 are a reading of every gated passage and of every ungated passage on the home, priorities, affordability and Florida 9.9 pages, plus any other ungated passage with a spine score of 0.3 or more or an affordability keyword.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | PASS (with borderline notes) |
| 4 | Silence recorded, not filled | PASS: A1 = 1, A3 = 2, A2 = 3, A4 = 1. No spine issue is 0. |
| 5 | Possible misses (information only, not a fix) | 1 clear, 5 borderline |

## 1. Candidate-controlled sources only: PASS

All 199 passage URLs in `run.json` have host `russo2026.com`. So do all 56 citation copies inside `run.json.areas`. No other host appears. `run.json.site` is `https://russo2026.com`. The 8 distinct URLs are:

| Passages | URL |
|---:|---|
| 26 | https://russo2026.com/ |
| 8 | https://russo2026.com/en/priorities |
| 13 | https://russo2026.com/en/priorities/affordability |
| 34 | https://russo2026.com/en/priorities/children-teachers-trades |
| 10 | https://russo2026.com/en/priorities/innovation |
| 42 | https://russo2026.com/en/priorities/immigration |
| 35 | https://russo2026.com/en/priorities/medical-freedom |
| 31 | https://russo2026.com/en/priorities/florida-9-9 |

`ingest.log` has no redirect, robots, Crawl-delay, bot-challenge, browser-fallback or unreachable lines. The per-page counts in `ingest.log` (no line for `/`, 19 for `/en/priorities`, 34 for `/florida-9-9`) differ from the file's counts above, as `ingest-report.md` already notes. The total of 199 agrees, and every URL is on the official host either way.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 199 lines and 199 unique ids. `run.json` has 199 passages. Every id is in both files, and neither file has an id the other lacks.
- All 78 passages with `states_policy: true` have `text` that is byte-identical (Buffer.compare over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 199 passages, and over all 56 citation copies in `run.json.areas`, found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)`, and `issues` equals exactly the set of scores >= 0.85. 17 passages with `states_policy: false` still carry issue tags (for example `c7dbaa30`, `35a92f9a`, `d43c20cf`, `2a2eec0c`, `7de8c496` and `70198501`). This is by design: `src/lib/policy-noul.ts` thresholds issues independently of the gate, and `groupByArea` skips passages that are not gated. None of those 17 appears in `run.json.areas` or in the counts below.

## 3. No inferred motive: PASS

None of the 78 passages marked as stating a policy is only biography, an attack on an opponent, fundraising or event copy. Each contains a stated position or commitment by the candidate. Copy of those kinds on the site was gated out: the running-mate line `89812076` (commitment 0.03), the biographies `3aa3dcc9` and `bfc50fec` (0.02 and 0.03), the video and sign-up copy `bf42481d`, `97c4c6cf`, `08baee00` and `938a486f` (0.02 to 0.07), and the party slogan `a9e92a78` (0.14). The site has no attacks on opponents.

Borderline items. These passed the gate and mix biography or rhetoric with a commitment, or are fragments. None is biography, attack, fundraising or event copy alone, so none fails the check. Listed for the founder:

- `b46de74b` (no issue tag, A1 0.72): "With more than 30 years in the insurance industry, Frank understands this system from the inside. His plan is focused on bringing greater accountability, competition and stability..." The first sentence is biography. The commitment is in the second.
- `82dd1152` (A1): "Property Insurance Reform - Put homeowners first with a more affordable, accountable and transparent insurance system - backed by Frank's more than 30 years of experience in the industry." A commitment with a biographical tail. It is the only A1 passage.
- `95ee46de` (A6, KYV10, B1): the teacher-pay commitment is followed by "He is also working to become a Florida substitute teacher because leadership begins by listening". This part is biographical.
- `48106439` (B3): "Frank believes in secure borders. He believes in the rule of law. And as Governor, his first responsibility will always be keeping Floridians safe. But immigration..." Includes family history ("His family came to this country...") alongside the stated principles.
- Short rhetorical lines with no concrete action: `624a66c2` ("If you are a violent criminal, a trafficker or you're here to hurt people, we need to deal with that. There should be no question about it."), `89bb0188`, `853c6a99`, `287f77fa`, `caa4b4cd`, `ecb0826f`, `5a87f521` ("It's that government should have to prove where the money went."). None carries a spine tag.

## 4. Silence recorded, not filled: PASS

This counts the passages with `states_policy: true` and the issue in `issues`, meaning a score of 0.85 or more. The counts match `run.json.areas` (`insurance` holds A1 and A3, `housing` holds A2, `economy` holds A4).

| Spine issue | Passages clearing 0.85 | Passage ids (issue score) |
|---|---|---|
| A1 Property insurance costs | 1 | 82dd1152 (0.96) |
| A3 Property taxes | 2 | 5c7bea51 (0.98), 4fef71e1 (0.98) |
| A2 Housing affordability | 3 | 3f4b7d60 (0.98), 4fcec1d4 (0.98), 5eb39cc5 (0.96) |
| A4 Cost of living in Florida | 1 | 88a2c540 (0.93) |

No spine issue is at 0, so no Position needs `no_stated_position_found`. Each counted passage names its issue in its own words: property insurance reform (`82dd1152`), property tax relief (`5c7bea51`, `4fef71e1`), building housing and first-time homeownership (`3f4b7d60`, `4fcec1d4`, `5eb39cc5`), and keeping Florida affordable through Florida 9.9 (`88a2c540`). No passage was counted for a spine issue it does not address.

## 5. Possible misses (information for the founder, not a fix)

These are passages the run marks `states_policy: false` that state a commitment on a spine issue. The first 20 words of each are quoted.

Clear miss:

| id | url path | commitment | spine scores | First 20 words |
|---|---|---|---|---|
| 35a92f9a | /en/priorities | 0.74 | A4 0.90, A2 0.81 | "Frank's affordability agenda takes on those pressures together - with practical plans to lower costs, protect homeowners, expand opportunity and invest" |

Borderline cases. Each states a stance on a spine issue but names no action. Each sits under a heading whose concrete commitment was gated in by a neighbouring passage:

| id | url path | commitment | spine scores | First 20 words | Neighbour that passed |
|---|---|---|---|---|---|
| 2a2eec0c | /en/priorities/affordability | 0.74 | A1 0.93 | "Florida homeowners should not have to wonder whether the next insurance renewal will make their home unaffordable." | b46de74b (no A1 tag) |
| 7de8c496 | /en/priorities/affordability | 0.81 | A3 0.96, A2 0.83 | "You shouldn't be taxed out of a home you've worked your entire life to own." | 4fef71e1 (A3) |
| 70198501 | /en/priorities/affordability | 0.79 | A2 0.97 | "Florida needs more housing that working people can actually afford." | 4fcec1d4 (A2) |
| d43c20cf | /en/priorities/affordability | 0.79 | A4 0.96, A2 0.80 | "Florida is growing. Businesses are coming here. People are moving here. But Frank believes there is a simple question we" (ends: "Frank's affordability agenda is about practical solutions, accountability and measurable results - not creating more government for the sake of creating government.") | 88a2c540 (A4) |
| cdf4a8b9 | / | 0.66 | A4 0.83 | "Independent leadership committed to making Florida affordable, accountable, and centered on the people who call it home." (a tagline) | none |

These are not misses. They state the problem, not a commitment, and were correctly gated out: `c7dbaa30` (A4 0.92, "Florida's success should be measured by whether the people who already live here can afford to stay here..."), `74920e95`, `9415da1d`, `acb56819`. The affordability "test" lines `e36d666b`, `e18a4e4c` and `f8f0ba40` are a decision rule with spine scores below 0.5.

Related note on passages that did pass the gate. Several gated passages concern a spine issue, but their score for it fell below 0.85, so they are counted in `states_policy` and not under that issue:

- `b46de74b` (A1 0.72): the insurance plan, "greater accountability, competition and stability". Only one passage (`82dd1152`) carries A1. The site's insurance section has no concrete mechanism beyond these two passages.
- `6cd63b8b` (A2 0.81, A4 0.68; tagged A6) and `f5d24b69` (A2 0.80, A4 0.71; no tag): Florida 9.9 revenue dedicated to housing among other priorities.
- `88a2c540` has A3 0.82. It mentions property tax as a burden but is tagged A4 only.

## Other observations (no effect on the verdict)

- `dry-run.log` reports 199 passages and 26 questions. That matches `run.json` (`question_ids` has 26 entries, and `counts.asked` is 199).
- Several home-page passages carry headings from priority pages ("Secure. Legal. Humane.", "Your Health. Your Choice.", "Build Florida's Next Economy"). The home page has summary cards for those pages. The text is verbatim, and the URL is the home page, which is candidate-controlled.
- There is no About or bio page among the fetched URLs. The two short biography lines on the home page (`3aa3dcc9`, `bfc50fec`) were correctly gated out.
- `run.log` reports "32 state a policy the taxonomy has no question for". These are gated passages with no issue tag, mostly medical freedom (`c8d86808`, `ea226285`, `867a7785` and others), women's entrepreneurship (`3629fa74`, `4a212836`) and the Florida 9.9 guardrails (`a7bb65b0`, `9e1ea186`, `8c6ddfdc`, `a00280e8`, `c1f6d106`). They are candidate-tier material, not spine gaps.

VERDICT: PASS
