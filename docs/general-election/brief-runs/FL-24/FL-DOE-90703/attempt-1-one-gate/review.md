# Step 3 review: FL-DOE-90703 (Te Mayonna Brown), FL-24-general

Reviewer: Step 3, under the Profiler constitution. Read-only. Nothing was fetched from the web.

Inputs reviewed: `passages.jsonl` (27 lines), `run.json` (`kyv.policy-run/1`, status `complete`, `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85), `ingest.log`. For context only: `links.jsonl`, `run-report.txt`, `run.log`, `ingest-report.md`, `attempt-1-keywords/`.

SPINE: not yet decided for this race. Check 4 therefore reports every taxonomy issue (taxonomy v7, `src/lib/news-issues.ts`), and check 5 considers every taxonomy issue.

Threshold rule, from the code: a passage states a policy when `commitment >= 0.85` (`readVerdict` in `src/lib/policy-noul.ts`), and it is tagged with an issue when that issue's score is `>= 0.85` (`applyThreshold` in `src/lib/news-characterize.ts`).

## Summary

| # | Check | Result | Evidence (passage ids) |
|---|---|---|---|
| 1 | Candidate-controlled sources only | **PASS** | All 27 passages in run.json, and all 25 citations in `areas`, are on `tebrownforflorida.com`. No other host appears. |
| 2 | Quotes verbatim | **PASS** | All 17 `states_policy` passages match passages.jsonl byte for byte (text, url and heading), checked with a script. So do all 27, and all 25 `areas` citations. |
| 3 | No inferred motive | **PASS** | No passage marked as stating a policy is only biography, an attack, fundraising or event copy. Borderline: `c015eb57` (values copy, commitment exactly 0.85, no issue tag). |
| 4 | Silence recorded, not filled | **PASS** | B3 8, B1 6, A2 4, KYV9 2, A4 1, B2 1, B4 1, B7 1, KYV10 1. The other 16 issues have 0 and are `no_stated_position_found`. Every `issues` tag matches the scores and the threshold exactly. |
| 5 | Possible misses (information only) | Reported | None among the 10 passages marked as stating no policy. For information: issue tags below threshold on passages that do state a policy (A4 `44f0eaeb`, KYV6 `6ce50e9c`, A6 `e1b6b720`, KYV9 `93d60669`, KYV4 `0c802def`). |

## Evidence

### 1. Candidate-controlled sources only: PASS

I parsed the host from every `url` in run.json (`passages` and `areas`) and in passages.jsonl:

| Host | run.json passages | run.json areas citations | passages.jsonl |
|---|---|---|---|
| tebrownforflorida.com | 27 | 25 | 27 |

These are the pages behind those passages: `/` (7), `/the-people-first-agenda` (5), `/issues` (12) and `/meet-te-brown` (3). No other host, redirect or third-party URL appears.

Informational: `560e7ff7` (states no policy) gives a contact address on another domain, "info@tmbrownforcongress.com". That is text on the candidate's page, not a source URL. No passage was fetched from that domain.

Informational: `ingest.log` lists only the three linked pages (5 + 12 + 3 = 20 passages) and does not list the homepage, but reports 27 in total. passages.jsonl, run.json and `ingest-report.md` all show `/` = 7. This does not affect any check, but the log leaves the homepage's 7 passages unlisted.

### 2. Quotes verbatim: PASS

A node script (`scratchpad/check-90703.cjs`) compared each run.json passage to the passages.jsonl passage with the same `id`. It used `Buffer.equals` on the UTF-8 text and also compared url and heading. There are no duplicate ids in either file.

| id | bytes | sha256 (first 12) | result |
|---|---|---|---|
| 44f0eaeb | 236 | 27da504b27e0 | identical |
| 0c802def | 684 | 20791f52d464 | identical |
| 93d60669 | 364 | 3eb7265ca4db | identical |
| 6ce50e9c | 425 | bd47e97f785b | identical |
| e1b6b720 | 539 | fc074857772a | identical |
| 18911dd3 | 366 | af7ebb4fd590 | identical |
| 1acafefe | 41 | 5011e07cf7ee | identical |
| 143588d7 | 53 | bdcb5c475eaf | identical |
| 0c7e1b54 | 196 | bef43f2c55d8 | identical |
| 4a9ef6ee | 72 | 31a0ac90e0cb | identical |
| 993d6724 | 159 | acc9d4d1007e | identical |
| 518d18b1 | 229 | 958592858834 | identical |
| c015eb57 | 198 | b019c0e36626 | identical |
| 06592307 | 650 | f506ea5a3647 | identical |
| 7fdc81fa | 592 | 45921735a495 | identical |
| 6abe852a | 689 | b06838ae79e2 | identical |
| 4ef9bace | 678 | 27cc242ea31c | identical |

All 25 `areas` citations also match passages.jsonl byte for byte. Each citation's score equals that passage's score for the issue, and each cited passage is `states_policy: true` with that issue in its `issues`.

Informational, for whoever writes claims from these quotes: the People First Agenda list is split across two passages. `0c802def` ends with a dangling "6." and `93d60669` begins with item 6's title ("Safe & Strong Communities —"). A claim quoting either should not carry the stray "6." or lose item 6's number. `93d60669` also ends without a full stop ("...and demand measurable results").

### 3. No inferred motive: PASS

I read all 17 passages marked `states_policy: true`. Each one contains a commitment or a stated position by the candidate or campaign. Some open with biography, but none is only biography, an attack on an opponent, fundraising or event copy:

- `6abe852a` opens "As a former teacher..." but continues "She is a strong advocate for school choice... She is committed to fighting for stronger wage growth, affordable housing, lower costs for working families...".
- `4ef9bace` is on the About page but says "She will work every day to protect taxpayers, support small businesses, strengthen families...".
- `7fdc81fa` opens with history ("A Republican Congress did this in 1998...") but says "I will work to end the South Florida weapons pipeline to Port-Au-Prince, and back the effort to rebuild".
- `1acafefe` and `143588d7` are list fragments under the heading "PROTECT AMERICAN WORKERS & REFORM H-1B". They state positions only in the context of that heading and of `18911dd3`.

Borderline (does not fail the check):

- `c015eb57` (heading "Defend Our Traditional Values", commitment 0.85, exactly at the gate, no issue tag): "Faith, family, and freedom are the foundation of America. Religious liberty, parental rights, the Second Amendment, and the Constitution itself are under attack..." This is values copy. It names topics ("worth fighting for") but makes no specific commitment. It is not biography, an attack on a named opponent, fundraising or event copy, so it does not fail check 3. It carries no taxonomy tag. Any candidate-tier claim built from it should quote it and attribute it ("The campaign website states...") and should not turn it into a specific policy on guns or parental rights.

The passages that are only biography or event copy (`7a003d7f`, `47150ed2`, `3a8cf149`, `b7e52bb9`, `74182647`, `f2ff891e`, `6ee90ccc`, `560e7ff7`, `8a02b2df`) and the invitation `0ab92443` are all marked `states_policy: false`.

### 4. Silence recorded, not filled: PASS

For each taxonomy issue, this is the number of passages scoring `>= 0.85`. Every passage that clears an issue also clears the policy gate, so the two counts are the same.

| Issue | Label | Count | Passage ids (score) |
|---|---|---|---|
| B3 | Immigration and border enforcement | 8 | `993d6724` (0.99), `4a9ef6ee` (0.98), `518d18b1` (0.98), `06592307` (0.98), `7fdc81fa` (0.96), `18911dd3` (0.95), `143588d7` (0.95), `1acafefe` (0.89) |
| B1 | Economy, inflation, and jobs | 6 | `0c802def` (0.96), `6abe852a` (0.96), `18911dd3` (0.94), `4ef9bace` (0.94), `44f0eaeb` (0.93), `1acafefe` (0.90) |
| A2 | Housing affordability | 4 | `0c802def` (0.99), `6ce50e9c` (0.98), `44f0eaeb` (0.96), `6abe852a` (0.91) |
| KYV9 | School choice and vouchers | 2 | `e1b6b720` (0.98), `6abe852a` (0.98) |
| A4 | Cost of living in Florida | 1 | `0c802def` (0.90) |
| B2 | Healthcare access and costs | 1 | `0c802def` (0.98) |
| B4 | Social Security and Medicare | 1 | `0c802def` (0.98) |
| B7 | Crime policy, policing and courts | 1 | `93d60669` (0.96) |
| KYV10 | Career, vocational and higher education | 1 | `93d60669` (0.95) |
| A1 | Property insurance costs | 0 | `no_stated_position_found` |
| A3 | Property taxes | 0 | `no_stated_position_found` |
| A5 | Water quality and Everglades restoration | 0 | `no_stated_position_found` |
| A6 | Public school funding and teachers | 0 | `no_stated_position_found` |
| A7 | Elections administration and voting access | 0 | `no_stated_position_found` |
| B5 | Abortion policy | 0 | `no_stated_position_found` |
| B6 | Election integrity | 0 | `no_stated_position_found` |
| B8 | Climate and environment (national) | 0 | `no_stated_position_found` |
| KYV1 | Threats to democratic institutions | 0 | `no_stated_position_found` |
| KYV2 | Energy and utilities | 0 | `no_stated_position_found` |
| KYV3 | Growth, development and land conservation | 0 | `no_stated_position_found` |
| KYV4 | Storm resilience and flood protection | 0 | `no_stated_position_found` |
| KYV5 | Water supply and drinking water | 0 | `no_stated_position_found` |
| KYV6 | Renters and evictions | 0 | `no_stated_position_found` |
| KYV7 | Homelessness | 0 | `no_stated_position_found` |
| KYV8 | Condominium and HOA costs | 0 | `no_stated_position_found` |

I also recomputed every passage's `states_policy` from `commitment >= 0.85`, and its `issues` from its `scores` at `>= 0.85` in taxonomy order. All 27 matched run.json. `counts` (27 asked, 17 state a policy, 15 with an issue, 0 failed) also matches. The two passages that state a policy but carry no issue are `0c7e1b54` (veterans) and `c015eb57` (values). They are candidate-tier material, not spine coverage.

### 5. Possible misses (information only)

**Passages marked as stating no policy:** none plainly states a commitment on a taxonomy issue. I read all 10:

- `3a8cf149` (commitment 0.65), first 20 words: "She is a pro-MAGA, pro-Constitution conservative who isn’t afraid to stand up for what’s right." This is a self-label with no issue commitment. Its highest issue score is KYV1 0.11.
- `8a02b2df` (commitment 0.08; A2 0.49): "Te Mayonna Brown is the Republican nominee for Florida’s 24th Congressional District. A successful businesswoman, educator, and trailblazing real estate developer, she..." This is biography. "has transformed neighborhoods through affordable housing" describes her past work and is not a commitment.
- `0ab92443` (commitment 0.22): "Your concerns are not just messages—they’re the issues I intend to fight to address. Send me your concerns, ideas, and..." It names no issue.
- `7a003d7f`, `47150ed2`, `b7e52bb9`, `74182647`, `f2ff891e`, `6ee90ccc`, `560e7ff7` are biography, news and event placeholders, or a contact line.

**For the founder, outside check 5's strict scope:** these passages are already marked `states_policy: true` and cited under other issues. Each plainly addresses one more taxonomy issue, but the score for that issue fell below 0.85, so the issue is not tagged. This does not change check 4's counts.

| id | Issue (score) | First 20 words |
|---|---|---|
| `44f0eaeb` | A4 Cost of living (0.60) | "A bold agenda focused on lowering the cost of living, making housing and childcare more affordable, protecting seniors and veterans," |
| `6ce50e9c` | KYV6 Renters and evictions (0.71) | "Te Brown supports redirecting federal housing dollars away from lifelong rental subsidies and toward helping low-income families in our district buy" |
| `e1b6b720` | A6 Public school funding (0.80) | "Every child in Florida’s 24th District deserves a quality education, not a zip code assignment. Te Brown supports taking federal" (continues "...education dollars that currently prop up failing schools and putting that money directly in the hands of parents") |
| `93d60669` | KYV9 School choice (0.78) | "Safe & Strong Communities — Support law enforcement, address crime, and make communities safer. 7. Education & Opportunity — Expand" (continues "...educational choices") |
| `0c802def` | KYV4 Storm resilience and flood protection (0.71) | "1. Affordability & Homeownership — Lower the barriers to buying a home, build more affordable housing, and address the cost of" (item 4: "Infrastructure & Resilience — Invest in roads, bridges, water systems, drainage...") |

Weaker, for completeness: `0c7e1b54` B2 0.82 (VA care for veterans), `44f0eaeb` B2 0.75 ("protecting the healthcare system"), and `4ef9bace` B7 0.48 ("public safety").

VERDICT: PASS
