# Profiler review: FL-DOE-89042 (Byron Donalds, FL-GOV-general)

- Official site: https://byrondonalds.com/
- Run: `run.json` status `complete`, provenance `jev:jev-1.13.0/tax-7/q-b2171346`, threshold 0.85
- Counts (run.json): 58 passages, 58 asked, 45 state a policy, 28 with an issue, 0 failed
- Spine: A1 Property insurance costs; A3 Property taxes; A2 Housing affordability; A4 Cost of living in Florida
- Reviewer: read-only. All checks were run with a node script over `run.json` and `passages.jsonl`, not by eye.

| # | Check | Result |
|---|-------|--------|
| 1 | Candidate-controlled sources only | PASS |
| 2 | Quotes verbatim (byte-identical to passages.jsonl) | PASS |
| 3 | No inferred motive (no bio / attack / fundraising / event copy marked as policy) | PASS (with borderline notes) |
| 4 | Silence recorded, not filled | PASS: A1 = 4, A3 = 1, A2 = 0 (no_stated_position_found), A4 = 2 |
| 5 | Possible misses (information only, not a fix) | 0 reported (1 related note on a gated-in passage) |

## 1. Candidate-controlled sources only: PASS

Every one of the 58 passage URLs in `run.json` has host `byrondonalds.com`, and so do all 32 citation URLs inside `run.json.areas`. No other host appears. `run.json.site` is `https://byrondonalds.com`. The 7 distinct URLs are the homepage (8 passages), `/issues/affordability` (10), `/issues/healthcare` (6), `/issues/economy` (5), `/issues/education` (19), `/issues/law-and-order` (5) and `/issues/space-and-tech` (5). The six `/issues/*` pages match `ingest.log`. `ingest.log` has no redirect, robots, Crawl-delay, bot-challenge, browser-fallback or unreachable lines. Its only other content is a Node `MODULE_TYPELESS_PACKAGE_JSON` warning.

## 2. Quotes verbatim: PASS

- `passages.jsonl` has 58 unique ids. `run.json` has 58 passages, and every id is present in both.
- All 45 passages with `states_policy: true` have `text` that is byte-identical (Buffer.equals over UTF-8) to the passage with the same id in `passages.jsonl`. `url` and `heading` match too. Mismatches: none.
- The same comparison over all 58 passages, and over all 32 citation copies in `run.json.areas`, also found no mismatches.
- Internal consistency: for every passage, `states_policy == (commitment >= 0.85)`, and for every passage that states a policy, `issues` equals exactly the set of scores >= 0.85. No inconsistencies. No spine issue appears in the `issues` list of any passage with `states_policy: false`.

## 3. No inferred motive: PASS

None of the 45 passages marked as stating a policy is only biography, an attack on an opponent, fundraising or event copy. The site's copy of those kinds was gated out: biography `29c7c58e` ("A conservative warrior for Florida's 19th Congressional District.", commitment 0.06) and `034a4667` ("Born and raised in Brooklyn, New York, Byron Donalds is the product of a single-parent household...", 0.04), and event copy `5f460e85` ("Host the Space Race Summit", 0.75). No fundraising copy and no copy naming an opponent appears in the corpus.

Borderline items. These passed the gate but are slogans or principles rather than a concrete commitment. None is biography, attack, fundraising or event copy, so none fails the check. Listed for the founder:

- `a6dd6069` (homepage) and `cff91837` (`/issues/affordability`, same sentence in quotation marks), both tagged A4: "Florida cannot become too expensive for working families and seniors on fixed incomes. The status quo has a cost. Progress" The commitment is the closing "it's time to bring down costs." These two are the only A4 citations, so A4's count of 2 is one statement shown twice.
- `17fb524d` (B1): "California passes heavy regulations. New York sends you the bill. Florida puts out the welcome mat. Bureaucratic delays shouldn't stop" It contrasts other states, not an opponent. The homepage copy of the same text (`3e06693f`, 0.82) was gated out, so the two copies were judged differently.
- `2d83e718` (no issue tag): "Transparency for parents means schools are held accountable so that each student is receiving a plan to express their God-given" It ends "No more education factories or status quo."
- `ef9ac76a` (no issue tag): "Families are co-authors, not bystanders. Annual plan reviews include parent conversations."

## 4. Silence recorded, not filled: PASS

This counts the passages with `states_policy: true` and the issue in `issues`, meaning a score of 0.85 or more.

| Spine issue | Passages clearing 0.85 | Passage ids (issue score) |
|---|---|---|
| A1 Property insurance costs | 4 | e76d6c8c (0.95), 1821943e (0.97), d4e685a7 (0.98), 3aafe4d7 (0.96) |
| A3 Property taxes | 1 | 4ee02003 (0.98) |
| A2 Housing affordability | 0 (no_stated_position_found) | none |
| A4 Cost of living in Florida | 2 | a6dd6069 (0.97), cff91837 (0.97), the same sentence on two pages |

`run.json.areas` has no A2 entry, which matches the count of 0. This review does not suggest any passage to stand in for A2.

## 5. Possible misses (information for the founder, not a fix)

The run marks 13 passages `states_policy: false`: `0c6e541c`, `3e06693f`, `43f49253`, `29c7c58e`, `034a4667`, `a27541d1`, `01e3897b`, `1911fef8`, `79ff5e43`, `a23109ad`, `d69a7bd2`, `1769d07b`, `5f460e85`. They are healthcare, economy, education and space teasers or plan details, two biography blocks and one event. None states a commitment on a spine issue. Their highest spine score is 0.06 (A4, `3e06693f`). Possible misses: none.

A related note on a passage that did pass the gate. `b9a05399` (`/issues/affordability`, section "Bring Down Your Insurance Bill:", commitment 0.95) passed the policy gate but got no issue tag, because its A1 score is 0.57 and its A4 score is 0.63. First 20 words: "Lower costs by trimming down state fees when reserves are full so those extra dollars stay in your wallet. Pursue" It ends "Pursue regulatory reforms that lower insurance premiums." It is counted in `states_policy` but not under A1 or A4.

Two further passages on the same page, `6820b405` (insurer Scorecard) and `882fad85` (insurer reporting and fines), under "Hold Insurance Companies Accountable—Put Consumers First:", passed the gate with no issue tag (top score B2 0.79 and 0.84, A1 0.22 and 0.20). Their text does not name the kind of insurance, so they are not listed as misses.

## Other observations (no effect on the verdict)

- `run.log`: "45 state a policy, 17 state a policy the taxonomy has no question for, 13 state no policy". The 17 are the passages that passed the gate with no issue at or above 0.85 (45 - 28).
- Several statements appear twice, once as a homepage teaser and once as the quoted lead of the issue page: `a6dd6069`/`cff91837` (A4), `55b7dc1c`/`7ada4c7b` (B3), `e9147a5c`/`c45a38db` (B1), and `3e06693f`/`17fb524d` (gated out on the homepage and in on `/issues/economy`). Citation counts in `run-report.txt` include both copies.
- There is no About or bio page among the fetched URLs. The homepage's biography copy (`29c7c58e`, `034a4667`) was correctly gated out.
- `dry-run.log` and `run.json` agree on 58 passages and 26 questions (`q_states_policy` plus 25 sub-issues).

VERDICT: PASS
